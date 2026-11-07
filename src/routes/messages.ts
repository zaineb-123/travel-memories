import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../db';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { MAX_BODY, assertCanMessage, getMyConversation, getOrCreateConversation, sendMessage, shapeMessages, unreadMessagesCount } from '../services/messages';
import { blockedBetween } from '../services/queries';
import { asyncHandler, getPage, HttpError, intParam, ok, paginationOf } from '../utils/http';

const router = Router();
router.use(authenticate);

const sendSchema = z
  .object({
    body: z.string().trim().min(1, 'Message vide').max(MAX_BODY, `Message trop long (max ${MAX_BODY})`).optional(),
    memory_id: z.number().int().positive().optional(),
  })
  .refine((d) => d.body || d.memory_id, { message: 'Écrivez un message ou partagez un souvenir' });

router.get('/unread/count', asyncHandler(async (req, res) => ok(res, { count: await unreadMessagesCount(req.user!.id) })));

// Liste des conversations : la plus récente en premier, avec le nombre de messages non lus.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const me = req.user!.id;
    const { page, limit, offset } = getPage(req, 20);
    const where = `(c.user_a = $1 OR c.user_b = $1) AND o.status <> 'banned' AND NOT ${blockedBetween('$1', 'o.id')}
      AND EXISTS (SELECT 1 FROM messages WHERE conversation_id = c.id)`;
    const join = `FROM conversations c JOIN users o ON o.id = CASE WHEN c.user_a = $1 THEN c.user_b ELSE c.user_a END`;
    const rows = await query(
      `SELECT c.id, c.last_message_at, o.id AS o_id, o.username AS o_username, o.full_name AS o_full_name, o.avatar_url AS o_avatar_url,
              lm.sender_id AS lm_sender, lm.body AS lm_body, lm.shared_memory AS lm_shared, lm.deleted_at AS lm_deleted, lm.created_at AS lm_created,
              (SELECT count(*)::int FROM messages WHERE conversation_id = c.id AND sender_id <> $1 AND read_at IS NULL AND deleted_at IS NULL) AS unread_count
       ${join}
       LEFT JOIN LATERAL (SELECT sender_id, body, shared_memory, deleted_at, created_at FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) lm ON TRUE
       WHERE ${where} ORDER BY c.last_message_at DESC, c.id DESC LIMIT $2 OFFSET $3`,
      [me, limit, offset],
    );
    const total = (await one<{ n: number }>(`SELECT count(*)::int AS n ${join} WHERE ${where}`, [me]))!.n;
    const data = rows.map((r) => ({
      id: r.id,
      user: { id: r.o_id, username: r.o_username, full_name: r.o_full_name, avatar_url: r.o_avatar_url },
      last_message: {
        sender_id: r.lm_sender,
        is_mine: r.lm_sender === me,
        preview: r.lm_deleted ? 'Message supprimé' : (r.lm_body ?? 'Souvenir partagé'),
        created_at: r.lm_created,
      },
      unread_count: r.unread_count,
      last_message_at: r.last_message_at,
    }));
    return ok(res, data, { pagination: paginationOf(page, limit, total) });
  }),
);

// Ouvre (ou crée) la conversation avec un utilisateur.
router.post(
  '/',
  validate(z.object({ user_id: z.number().int().positive() })),
  asyncHandler(async (req, res) => {
    await assertCanMessage(req.user!.id, req.body.user_id);
    const id = await getOrCreateConversation(req.user!.id, req.body.user_id);
    return ok(res, { id }, {}, 201);
  }),
);

router.get(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    const conv = await getMyConversation(intParam(req.params.id, 'Conversation'), req.user!.id);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '30'), 10) || 30));
    const before = parseInt(String(req.query.before ?? ''), 10);
    const params: unknown[] = [conv.id, limit + 1];
    let cursor = '';
    if (Number.isInteger(before) && before > 0) {
      params.push(before);
      cursor = 'AND id < $3';
    }
    const rows = await query(
      `SELECT id, conversation_id, sender_id, body, memory_id, shared_memory, created_at, read_at, deleted_at
       FROM messages WHERE conversation_id = $1 ${cursor} ORDER BY id DESC LIMIT $2`,
      params,
    );
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit).reverse(); // ordre chronologique pour l'affichage
    const other = await one('SELECT id, username, full_name, avatar_url FROM users WHERE id = $1', [conv.otherId]);
    return ok(res, await shapeMessages(page, req.user!.id), { has_more: hasMore, user: other });
  }),
);

router.post(
  '/:id/messages',
  validate(sendSchema),
  asyncHandler(async (req, res) => {
    const conv = await getMyConversation(intParam(req.params.id, 'Conversation'), req.user!.id);
    const { messageId } = await sendMessage({ sender: req.user!, recipientId: conv.otherId, body: req.body.body, memoryId: req.body.memory_id });
    const row = await one(
      'SELECT id, conversation_id, sender_id, body, memory_id, shared_memory, created_at, read_at, deleted_at FROM messages WHERE id = $1',
      [messageId],
    );
    return ok(res, (await shapeMessages([row], req.user!.id))[0], {}, 201);
  }),
);

router.put(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const conv = await getMyConversation(intParam(req.params.id, 'Conversation'), req.user!.id);
    await query('UPDATE messages SET read_at = now() WHERE conversation_id = $1 AND sender_id <> $2 AND read_at IS NULL', [conv.id, req.user!.id]);
    // La notification « nouveau message » de cette conversation n'a plus lieu d'être.
    await query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND type = 'message' AND reference_id = $2`, [req.user!.id, conv.id]);
    return ok(res, { count: await unreadMessagesCount(req.user!.id) });
  }),
);

// Seul l'auteur peut supprimer son message ; il reste visible comme « Message supprimé ».
router.delete(
  '/:id/messages/:messageId',
  asyncHandler(async (req, res) => {
    const conv = await getMyConversation(intParam(req.params.id, 'Conversation'), req.user!.id);
    const done = await query(
      'UPDATE messages SET deleted_at = now() WHERE id = $1 AND conversation_id = $2 AND sender_id = $3 AND deleted_at IS NULL RETURNING id',
      [intParam(req.params.messageId, 'Message'), conv.id, req.user!.id],
    );
    if (!done.length) throw new HttpError(404, 'Message introuvable ou non supprimable');
    return ok(res, undefined, { message: 'Message supprimé' });
  }),
);

export default router;
