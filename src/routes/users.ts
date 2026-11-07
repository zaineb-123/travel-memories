import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../db';
import { authenticate, optionalAuth } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { validate } from '../middleware/validate';
import { notify } from '../services/notify';
import { USER_COLUMNS, blockedBetween, getUserById, hydrateMemories, memorySelect, visibleClause } from '../services/queries';
import { acceptAllPending, areFriends, followStatus, hasBlocked, isBlockedEitherWay } from '../services/relations';
import { deleteFile, saveImage } from '../utils/files';
import { asyncHandler, escapeLike, getPage, HttpError, intParam, ok, paginationOf } from '../utils/http';

const router = Router();

const urlOrEmpty = z
  .string()
  .max(500)
  .refine((v) => v === '' || /^https?:\/\//i.test(v) || v.startsWith('/'), 'URL invalide');

const profileSchema = z.object({
  full_name: z.string().trim().min(2).max(100).optional(),
  bio: z.string().max(500).nullable().optional(),
  avatar_url: urlOrEmpty.optional(),
  country: z.string().max(50).nullable().optional(),
  city: z.string().max(50).nullable().optional(),
  theme: z.enum(['light', 'dark']).optional(),
  is_private: z.boolean().optional(),
});

/** Accepte un id numérique ou un username. */
async function resolveUserId(ref: string): Promise<number> {
  const row = /^\d+$/.test(ref)
    ? await one<{ id: number }>('SELECT id FROM users WHERE id = $1', [Number(ref)])
    : await one<{ id: number }>('SELECT id FROM users WHERE lower(username) = lower($1)', [ref]);
  if (!row) throw new HttpError(404, 'Utilisateur introuvable');
  return row.id;
}

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => ok(res, await getUserById(req.user!.id, true))),
);

router.put(
  '/me',
  authenticate,
  validate(profileSchema),
  asyncHandler(async (req, res) => {
    // Liste blanche de champs : impossible de modifier role/status/email par ce biais.
    const entries = Object.entries(req.body as Record<string, unknown>).filter(([, v]) => v !== undefined);
    if (entries.length) {
      const sets = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
      await query(`UPDATE users SET ${sets}, updated_at = now() WHERE id = $1`, [req.user!.id, ...entries.map(([, v]) => v)]);
    }
    // Un compte qui redevient public accepte automatiquement les demandes en attente.
    if ((req.body as { is_private?: boolean }).is_private === false) await acceptAllPending(req.user!.id, req.user!.username);
    return ok(res, await getUserById(req.user!.id, true), { message: 'Profil mis à jour' });
  }),
);

router.post(
  '/avatar',
  authenticate,
  upload.single('avatar'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Aucun fichier envoyé');
    const saved = await saveImage(req.file.buffer, 'avatars');
    const old = await one<{ avatar_url: string }>('SELECT avatar_url FROM users WHERE id = $1', [req.user!.id]);
    await query('UPDATE users SET avatar_url = $1, updated_at = now() WHERE id = $2', [saved.url, req.user!.id]);
    const oldName = old?.avatar_url.split('/uploads/')[1];
    if (oldName?.startsWith('avatars/')) await deleteFile(oldName);
    return ok(res, { avatar_url: saved.url });
  }),
);

router.get(
  '/search',
  optionalAuth,
  validate(z.object({ q: z.string().trim().min(1).max(50) }), 'query'),
  asyncHandler(async (req, res) => {
    const { q } = (req as any).validatedQuery;
    const params: unknown[] = [`%${escapeLike(q)}%`];
    let notBlocked = '';
    if (req.user) {
      params.push(req.user.id);
      notBlocked = `AND NOT ${blockedBetween('$2', 'u.id')}`;
    }
    const rows = await query(
      `SELECT ${USER_COLUMNS} FROM users u
       WHERE u.status = 'active' AND (u.username ILIKE $1 OR u.full_name ILIKE $1) ${notBlocked}
       ORDER BY u.username LIMIT 10`,
      params,
    );
    return ok(res, rows);
  }),
);

router.get(
  '/:username',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const target = await one<{ id: number; is_private: boolean }>(
      `SELECT id, is_private FROM users WHERE lower(username) = lower($1) AND status <> 'banned'`,
      [req.params.username],
    );
    if (!target) throw new HttpError(404, 'Utilisateur introuvable');
    // Si cette personne m'a bloqué, son profil n'existe plus pour moi.
    if (req.user && (await one('SELECT 1 FROM blocks WHERE blocker_id = $1 AND blocked_id = $2', [target.id, req.user.id]))) {
      throw new HttpError(404, 'Utilisateur introuvable');
    }

    const isSelf = req.user?.id === target.id;
    const user = await getUserById(target.id, isSelf || req.user?.role === 'admin');

    const params: unknown[] = [target.id];
    let v: string | null = null;
    if (req.user) {
      params.push(req.user.id);
      v = '$2';
    }
    // visibleClause masque déjà les souvenirs d'un compte privé aux non-abonnés et aux utilisateurs bloqués.
    const recent = await query(
      `${memorySelect(v)} WHERE m.user_id = $1 AND ${visibleClause(v)} ORDER BY m.created_at DESC, m.id DESC LIMIT 6`,
      params,
    );
    const status = await followStatus(req.user?.id, target.id);
    return ok(res, {
      user,
      recent_memories: await hydrateMemories(recent),
      is_following: status === 'following',
      follow_status: status,
      is_friend: req.user && !isSelf ? await areFriends(req.user.id, target.id) : false,
      is_blocked: req.user && !isSelf ? await hasBlocked(req.user.id, target.id) : false,
    });
  }),
);

router.post(
  '/:id/follow',
  authenticate,
  asyncHandler(async (req, res) => {
    const targetId = intParam(req.params.id, 'Utilisateur');
    if (targetId === req.user!.id) throw new HttpError(400, 'Vous ne pouvez pas vous suivre vous-même');
    const target = await one<{ id: number; is_private: boolean }>("SELECT id, is_private FROM users WHERE id = $1 AND status <> 'banned'", [targetId]);
    if (!target) throw new HttpError(404, 'Utilisateur introuvable');
    if (await isBlockedEitherWay(req.user!.id, targetId)) throw new HttpError(403, 'Action impossible avec cet utilisateur');

    const current = await followStatus(req.user!.id, targetId);
    if (current === 'following') return ok(res, { status: 'following' }, { message: 'Vous suivez déjà cet utilisateur' });

    if (target.is_private) {
      const created = await query(
        'INSERT INTO follow_requests (requester_id, target_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING 1 AS ok',
        [req.user!.id, targetId],
      );
      if (created.length) {
        await notify({
          userId: targetId, fromUserId: req.user!.id, type: 'follow_request', referenceId: req.user!.id,
          message: `${req.user!.username} souhaite vous suivre`, dedupe: true,
        });
      }
      return ok(res, { status: 'requested' }, { message: "Demande d'abonnement envoyée" });
    }

    const inserted = await query(
      'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING 1 AS ok',
      [req.user!.id, targetId],
    );
    if (inserted.length) {
      await notify({
        userId: targetId, fromUserId: req.user!.id, type: 'follow', referenceId: req.user!.id,
        message: `${req.user!.username} a commencé à vous suivre`, dedupe: true,
      });
    }
    return ok(res, { status: 'following' }, { message: 'Vous suivez maintenant cet utilisateur' });
  }),
);

// Se désabonner OU annuler une demande en attente.
router.delete(
  '/:id/follow',
  authenticate,
  asyncHandler(async (req, res) => {
    const targetId = intParam(req.params.id, 'Utilisateur');
    await query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [req.user!.id, targetId]);
    await query('DELETE FROM follow_requests WHERE requester_id = $1 AND target_id = $2', [req.user!.id, targetId]);
    return ok(res, { status: 'none' }, { message: 'Vous ne suivez plus cet utilisateur' });
  }),
);

// Retirer un abonné (comme sur Instagram) : il ne me suit plus, sans être bloqué.
router.delete(
  '/:id/follower',
  authenticate,
  asyncHandler(async (req, res) => {
    await query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [intParam(req.params.id, 'Utilisateur'), req.user!.id]);
    return ok(res, undefined, { message: 'Abonné retiré' });
  }),
);

router.get(
  '/:id/is-following',
  authenticate,
  asyncHandler(async (req, res) => {
    const status = await followStatus(req.user!.id, intParam(req.params.id, 'Utilisateur'));
    return ok(res, { is_following: status === 'following', follow_status: status });
  }),
);

for (const kind of ['followers', 'following'] as const) {
  router.get(
    `/:ref/${kind}`,
    optionalAuth,
    asyncHandler(async (req, res) => {
      const id = await resolveUserId(req.params.ref);
      const owner = await one<{ is_private: boolean }>('SELECT is_private FROM users WHERE id = $1', [id]);
      // Les listes d'un compte privé ne sont visibles que par lui-même et ses abonnés.
      if (owner?.is_private && req.user?.id !== id && (await followStatus(req.user?.id, id)) !== 'following') {
        throw new HttpError(403, 'Ce compte est privé');
      }
      const { page, limit, offset } = getPage(req, 20);
      const [self, other] = kind === 'followers' ? ['following_id', 'follower_id'] : ['follower_id', 'following_id'];
      const params: unknown[] = [id];
      let notBlocked = '';
      if (req.user) {
        params.push(req.user.id);
        notBlocked = `AND NOT ${blockedBetween('$2', 'u.id')}`;
      }
      const rows = await query(
        `SELECT ${USER_COLUMNS} FROM follows f JOIN users u ON u.id = f.${other}
         WHERE f.${self} = $1 AND u.status <> 'banned' ${notBlocked}
         ORDER BY f.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset],
      );
      const total = (await one<{ n: number }>(`SELECT count(*)::int AS n FROM follows WHERE ${self} = $1`, [id]))!.n;
      return ok(res, rows, { pagination: paginationOf(page, limit, total) });
    }),
  );
}

export default router;
