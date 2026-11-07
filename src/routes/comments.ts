import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../db';
import { authenticate, isStaff, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { syncMentions } from '../services/mentions';
import { notify } from '../services/notify';
import { blockedBetween, getVisibleMemory } from '../services/queries';
import { getSettings } from '../services/settings';
import { asyncHandler, HttpError, intParam, ok } from '../utils/http';

const router = Router();

const content = z.string().trim().min(1, 'Commentaire vide').max(1000, 'Commentaire trop long (max 1000)');

const COMMENT_SELECT = (viewer: string | null) => `
  SELECT c.id, c.user_id, c.memory_id, c.parent_id, c.content, c.created_at, c.updated_at,
    u.username AS u_username, u.avatar_url AS u_avatar_url, u.full_name AS u_full_name,
    (SELECT count(*)::int FROM comment_likes WHERE comment_id = c.id) AS likes_count,
    ${viewer ? `EXISTS (SELECT 1 FROM comment_likes WHERE comment_id = c.id AND user_id = ${viewer})` : 'FALSE'} AS is_liked
  FROM comments c JOIN users u ON u.id = c.user_id`;

const shape = ({ u_username, u_avatar_url, u_full_name, ...c }: any) => ({
  ...c,
  user: { username: u_username, avatar_url: u_avatar_url, full_name: u_full_name },
});

router.get(
  '/memories/:id/comments',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const memoryId = intParam(req.params.id, 'Souvenir');
    if (!(await getVisibleMemory(memoryId, req.user, false))) throw new HttpError(404, 'Souvenir introuvable');

    const rows = (
      await query(
        `${COMMENT_SELECT(req.user ? '$2' : null)} WHERE c.memory_id = $1 AND u.status <> 'banned'
         ${req.user ? `AND NOT ${blockedBetween('$2', 'c.user_id')}` : ''} ORDER BY c.created_at ASC, c.id ASC`,
        req.user ? [memoryId, req.user.id] : [memoryId],
      )
    ).map(shape);

    // Arbre : chaque commentaire reçoit ses réponses.
    const byId = new Map<number, any>(rows.map((c) => [c.id, { ...c, replies: [] }]));
    const roots: any[] = [];
    for (const c of byId.values()) {
      const parent = c.parent_id ? byId.get(c.parent_id) : null;
      (parent ? parent.replies : roots).push(c);
    }
    return ok(res, roots.reverse());
  }),
);

router.post(
  '/memories/:id/comments',
  authenticate,
  validate(z.object({ content, parent_id: z.number().int().positive().optional() })),
  asyncHandler(async (req, res) => {
    if (!(await getSettings()).enable_comments) throw new HttpError(403, 'Les commentaires sont désactivés');
    const memoryId = intParam(req.params.id, 'Souvenir');
    const memory = await getVisibleMemory(memoryId, req.user, false);
    if (!memory) throw new HttpError(404, 'Souvenir introuvable');

    let parentOwner: number | null = null;
    if (req.body.parent_id) {
      const parent = await one<{ user_id: number }>('SELECT user_id FROM comments WHERE id = $1 AND memory_id = $2', [req.body.parent_id, memoryId]);
      if (!parent) throw new HttpError(404, 'Commentaire parent introuvable');
      parentOwner = parent.user_id;
    }

    const created = await one<{ id: number }>(
      'INSERT INTO comments (user_id, memory_id, parent_id, content) VALUES ($1,$2,$3,$4) RETURNING id',
      [req.user!.id, memoryId, req.body.parent_id ?? null, req.body.content],
    );
    await notify({
      userId: memory.user_id, fromUserId: req.user!.id, type: 'comment', referenceId: memoryId,
      message: `${req.user!.username} a commenté votre souvenir « ${memory.title} »`,
    });
    if (parentOwner && parentOwner !== memory.user_id) {
      await notify({
        userId: parentOwner, fromUserId: req.user!.id, type: 'comment', referenceId: memoryId,
        message: `${req.user!.username} a répondu à votre commentaire`,
      });
    }
    await syncMentions({ text: req.body.content, author: req.user!, memory: { id: memoryId, title: memory.title }, commentId: created!.id });
    const row = await one(`${COMMENT_SELECT('$2')} WHERE c.id = $1`, [created!.id, req.user!.id]);
    return ok(res, { ...shape(row), replies: [] }, {}, 201);
  }),
);

router.put(
  '/comments/:id',
  authenticate,
  validate(z.object({ content })),
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'Commentaire');
    const updated = await query(
      'UPDATE comments SET content = $1, updated_at = now() WHERE id = $2 AND user_id = $3 RETURNING id',
      [req.body.content, id, req.user!.id],
    );
    if (!updated.length) throw new HttpError(404, 'Commentaire introuvable ou non modifiable');
    const ctx = await one<{ memory_id: number; title: string }>('SELECT c.memory_id, m.title FROM comments c JOIN memories m ON m.id = c.memory_id WHERE c.id = $1', [id]);
    if (ctx) await syncMentions({ text: req.body.content, author: req.user!, memory: { id: ctx.memory_id, title: ctx.title }, commentId: id });
    return ok(res, shape(await one(`${COMMENT_SELECT('$2')} WHERE c.id = $1`, [id, req.user!.id])));
  }),
);

router.delete(
  '/comments/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'Commentaire');
    const c = await one<{ user_id: number; memory_owner: number }>(
      `SELECT c.user_id, m.user_id AS memory_owner FROM comments c JOIN memories m ON m.id = c.memory_id WHERE c.id = $1`,
      [id],
    );
    if (!c) throw new HttpError(404, 'Commentaire introuvable');
    // Auteur, propriétaire du souvenir ou modérateur.
    if (c.user_id !== req.user!.id && c.memory_owner !== req.user!.id && !isStaff(req.user)) {
      throw new HttpError(403, 'Action non autorisée');
    }
    await query('DELETE FROM comments WHERE id = $1', [id]);
    await query('DELETE FROM mentions WHERE comment_id = $1', [id]);
    return ok(res);
  }),
);

const commentLikes = async (id: number) =>
  (await one<{ n: number }>('SELECT count(*)::int AS n FROM comment_likes WHERE comment_id = $1', [id]))!.n;

router.post(
  '/comments/:id/like',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'Commentaire');
    if (!(await one('SELECT 1 FROM comments WHERE id = $1', [id]))) throw new HttpError(404, 'Commentaire introuvable');
    await query('INSERT INTO comment_likes (user_id, comment_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.user!.id, id]);
    return ok(res, { likes_count: await commentLikes(id) });
  }),
);

router.delete(
  '/comments/:id/like',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'Commentaire');
    await query('DELETE FROM comment_likes WHERE user_id = $1 AND comment_id = $2', [req.user!.id, id]);
    return ok(res, { likes_count: await commentLikes(id) });
  }),
);

export default router;
