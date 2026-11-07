import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../db';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { USER_COLUMNS, blockedBetween, hydrateMemories, memorySelect, visibleClause } from '../services/queries';
import { acceptRequest, blockUser } from '../services/relations';
import { asyncHandler, escapeLike, getPage, HttpError, intParam, ok, paginationOf } from '../utils/http';

const router = Router();

/* ------------------------- Demandes d'abonnement ------------------------- */

// Demandes reçues (comptes privés).
router.get(
  '/follow-requests',
  authenticate,
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPage(req, 20);
    const rows = await query(
      `SELECT ${USER_COLUMNS}, fr.created_at AS requested_at FROM follow_requests fr JOIN users u ON u.id = fr.requester_id
       WHERE fr.target_id = $1 AND u.status <> 'banned' ORDER BY fr.created_at DESC LIMIT $2 OFFSET $3`,
      [req.user!.id, limit, offset],
    );
    const total = (await one<{ n: number }>('SELECT count(*)::int AS n FROM follow_requests WHERE target_id = $1', [req.user!.id]))!.n;
    return ok(res, rows, { pagination: paginationOf(page, limit, total), count: total });
  }),
);

// Demandes que j'ai envoyées et qui sont encore en attente.
router.get(
  '/follow-requests/sent',
  authenticate,
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT ${USER_COLUMNS}, fr.created_at AS requested_at FROM follow_requests fr JOIN users u ON u.id = fr.target_id
       WHERE fr.requester_id = $1 ORDER BY fr.created_at DESC LIMIT 100`,
      [req.user!.id],
    );
    return ok(res, rows);
  }),
);

router.post(
  '/follow-requests/:userId/accept',
  authenticate,
  asyncHandler(async (req, res) => {
    const accepted = await acceptRequest(intParam(req.params.userId, 'Demande'), req.user!.id, req.user!.username);
    if (!accepted) throw new HttpError(404, 'Demande introuvable');
    return ok(res, undefined, { message: 'Demande acceptée' });
  }),
);

router.delete(
  '/follow-requests/:userId',
  authenticate,
  asyncHandler(async (req, res) => {
    const removed = await query('DELETE FROM follow_requests WHERE requester_id = $1 AND target_id = $2 RETURNING 1 AS ok', [
      intParam(req.params.userId, 'Demande'), req.user!.id,
    ]);
    if (!removed.length) throw new HttpError(404, 'Demande introuvable');
    return ok(res, undefined, { message: 'Demande refusée' });
  }),
);

/* --------------------------------- Amis --------------------------------- */

// Amis = abonnement mutuel. Sert aussi à choisir un destinataire pour un message ou un partage.
router.get(
  '/friends',
  authenticate,
  validate(z.object({ q: z.string().trim().max(50).optional() }), 'query'),
  asyncHandler(async (req, res) => {
    const { q } = (req as any).validatedQuery as { q?: string };
    const { page, limit, offset } = getPage(req, 20);
    const params: unknown[] = [req.user!.id];
    let search = '';
    if (q) {
      params.push(`%${escapeLike(q)}%`);
      search = `AND (u.username ILIKE $${params.length} OR u.full_name ILIKE $${params.length})`;
    }
    const base = `FROM follows f1
      JOIN follows f2 ON f2.follower_id = f1.following_id AND f2.following_id = f1.follower_id
      JOIN users u ON u.id = f1.following_id
      WHERE f1.follower_id = $1 AND u.status = 'active' AND NOT ${blockedBetween('$1', 'u.id')} ${search}`;
    const total = (await one<{ n: number }>(`SELECT count(*)::int AS n ${base}`, params))!.n;
    const rows = await query(
      `SELECT ${USER_COLUMNS} ${base} ORDER BY u.username LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );
    return ok(res, rows, { pagination: paginationOf(page, limit, total) });
  }),
);

/* -------------------------------- Blocage -------------------------------- */

router.get(
  '/blocks',
  authenticate,
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT ${USER_COLUMNS}, b.created_at AS blocked_at FROM blocks b JOIN users u ON u.id = b.blocked_id
       WHERE b.blocker_id = $1 ORDER BY b.created_at DESC`,
      [req.user!.id],
    );
    return ok(res, rows);
  }),
);

router.post(
  '/blocks/:userId',
  authenticate,
  asyncHandler(async (req, res) => {
    const targetId = intParam(req.params.userId, 'Utilisateur');
    if (targetId === req.user!.id) throw new HttpError(400, 'Vous ne pouvez pas vous bloquer vous-même');
    if (!(await one('SELECT 1 FROM users WHERE id = $1', [targetId]))) throw new HttpError(404, 'Utilisateur introuvable');
    await blockUser(req.user!.id, targetId);
    return ok(res, undefined, { message: 'Utilisateur bloqué' });
  }),
);

router.delete(
  '/blocks/:userId',
  authenticate,
  asyncHandler(async (req, res) => {
    await query('DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2', [req.user!.id, intParam(req.params.userId, 'Utilisateur')]);
    return ok(res, undefined, { message: 'Utilisateur débloqué' });
  }),
);

/* ------------------------- Souvenirs où l'on est identifié --------------- */

router.get(
  '/users/:username/tagged',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const target = await one<{ id: number }>(`SELECT id FROM users WHERE lower(username) = lower($1) AND status <> 'banned'`, [req.params.username]);
    if (!target) throw new HttpError(404, 'Utilisateur introuvable');
    const { page, limit, offset } = getPage(req, 12, 50);
    const params: unknown[] = [target.id];
    let v: string | null = null;
    if (req.user) {
      params.push(req.user.id);
      v = '$2';
    }
    const where = `m.id IN (SELECT memory_id FROM mentions WHERE mentioned_id = $1 AND comment_id = 0) AND ${visibleClause(v)} AND m.status = 'published'`;
    const total = (await one<{ n: number }>(`SELECT count(*)::int AS n FROM memories m JOIN users u ON u.id = m.user_id WHERE ${where}`, params))!.n;
    const rows = await query(
      `${memorySelect(v)} WHERE ${where} ORDER BY m.created_at DESC, m.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );
    return ok(res, await hydrateMemories(rows), { pagination: paginationOf(page, limit, total) });
  }),
);

export default router;
