import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../db';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logActivity } from '../services/activity';
import { USER_COLUMNS } from '../services/queries';
import { getSettings, settingsSchema, updateSettings } from '../services/settings';
import { config } from '../config';
import { deleteFile } from '../utils/files';
import { asyncHandler, escapeLike, getPage, HttpError, intParam, ok, paginationOf } from '../utils/http';

const router = Router();
router.use(authenticate, requireRole('admin', 'moderator'));

const adminOnly = requireRole('admin');
const pct = (cur: number, prev: number) => (prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 1000) / 10);

/* ---------------------------------- Stats --------------------------------- */

router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const s = (await one<Record<string, number>>(`
      SELECT
        (SELECT count(*)::int FROM users) AS total_users,
        (SELECT count(*)::int FROM memories WHERE status <> 'deleted') AS total_memories,
        (SELECT count(*)::int FROM likes) AS total_likes,
        (SELECT count(*)::int FROM comments) AS total_comments,
        (SELECT count(*)::int FROM follows) AS total_follows,
        (SELECT count(*)::int FROM users WHERE created_at >= date_trunc('day', now())) AS new_users_today,
        (SELECT count(*)::int FROM memories WHERE created_at >= date_trunc('day', now())) AS new_memories_today,
        (SELECT count(*)::int FROM users WHERE last_login >= now() - interval '30 days') AS active_users,
        (SELECT count(*)::int FROM users WHERE status = 'banned') AS banned_users,
        (SELECT count(*)::int FROM reports WHERE status = 'pending') AS pending_reports,
        (SELECT COALESCE(sum(size_bytes), 0)::bigint FROM memory_photos)::float8 AS storage_used,
        (SELECT count(*)::int FROM users WHERE created_at >= now() - interval '30 days') AS users_30,
        (SELECT count(*)::int FROM users WHERE created_at >= now() - interval '60 days' AND created_at < now() - interval '30 days') AS users_prev,
        (SELECT count(*)::int FROM memories WHERE created_at >= now() - interval '30 days') AS memories_30,
        (SELECT count(*)::int FROM memories WHERE created_at >= now() - interval '60 days' AND created_at < now() - interval '30 days') AS memories_prev,
        ((SELECT count(*) FROM likes WHERE created_at >= now() - interval '30 days')
          + (SELECT count(*) FROM comments WHERE created_at >= now() - interval '30 days'))::int AS eng_30,
        ((SELECT count(*) FROM likes WHERE created_at >= now() - interval '60 days' AND created_at < now() - interval '30 days')
          + (SELECT count(*) FROM comments WHERE created_at >= now() - interval '60 days' AND created_at < now() - interval '30 days'))::int AS eng_prev
    `))!;
    const { users_30, users_prev, memories_30, memories_prev, eng_30, eng_prev, ...base } = s;
    return ok(res, {
      ...base,
      storage_limit: config.STORAGE_LIMIT_BYTES,
      growth: { users: pct(users_30, users_prev), memories: pct(memories_30, memories_prev), engagement: pct(eng_30, eng_prev) },
    });
  }),
);

router.get(
  '/activities',
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPage(req, 20, 100);
    const logs = await query(
      `SELECT a.id, a.user_id, COALESCE(u.username, 'système') AS username, a.action, a.target_type, a.target_id, a.ip_address, a.created_at
       FROM activity_logs a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC, a.id DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    const total = (await one<{ n: number }>('SELECT count(*)::int AS n FROM activity_logs'))!.n;
    const pagination = paginationOf(page, limit, total);
    return ok(res, { logs, pagination }, { pagination });
  }),
);

/* ---------------------------------- Users --------------------------------- */

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPage(req, 20, 100);
    const params: unknown[] = [];
    const where: string[] = ['TRUE'];
    if (req.query.search) {
      params.push(`%${escapeLike(String(req.query.search))}%`);
      where.push(`(u.username ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.full_name ILIKE $${params.length})`);
    }
    if (['active', 'banned', 'inactive'].includes(String(req.query.status))) {
      params.push(req.query.status);
      where.push(`u.status = $${params.length}`);
    }
    const w = where.join(' AND ');
    const total = (await one<{ n: number }>(`SELECT count(*)::int AS n FROM users u WHERE ${w}`, params))!.n;
    const users = await query(
      `SELECT ${USER_COLUMNS}, u.email FROM users u WHERE ${w} ORDER BY u.created_at DESC, u.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );
    const pagination = paginationOf(page, limit, total);
    return ok(res, { users, pagination }, { pagination });
  }),
);

async function getAdminUser(id: number) {
  const u = await one(`SELECT ${USER_COLUMNS}, u.email, u.ban_reason FROM users u WHERE u.id = $1`, [id]);
  if (!u) throw new HttpError(404, 'Utilisateur introuvable');
  return u;
}

/** Un modérateur ne peut pas agir sur un admin, ni personne sur soi-même. */
async function assertCanModerate(req: any, targetId: number) {
  if (targetId === req.user.id) throw new HttpError(400, 'Vous ne pouvez pas effectuer cette action sur votre propre compte');
  const target = await one<{ role: string }>('SELECT role FROM users WHERE id = $1', [targetId]);
  if (!target) throw new HttpError(404, 'Utilisateur introuvable');
  if (target.role === 'admin' && req.user.role !== 'admin') throw new HttpError(403, 'Action réservée aux administrateurs');
}

router.get('/users/:id', asyncHandler(async (req, res) => ok(res, await getAdminUser(intParam(req.params.id, 'Utilisateur')))));

router.patch(
  '/users/:id/role',
  adminOnly,
  validate(z.object({ role: z.enum(['user', 'moderator', 'admin']) })),
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'Utilisateur');
    await assertCanModerate(req, id);
    await query('UPDATE users SET role = $1, updated_at = now() WHERE id = $2', [req.body.role, id]);
    await logActivity(req, `set_role:${req.body.role}`, 'user', id);
    return ok(res, await getAdminUser(id));
  }),
);

router.patch(
  '/users/:id/status',
  validate(z.object({ status: z.enum(['active', 'inactive', 'banned']) })),
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'Utilisateur');
    await assertCanModerate(req, id);
    await query('UPDATE users SET status = $1, updated_at = now() WHERE id = $2', [req.body.status, id]);
    await logActivity(req, `set_status:${req.body.status}`, 'user', id);
    return ok(res, await getAdminUser(id));
  }),
);

router.post(
  '/users/:id/ban',
  validate(z.object({ reason: z.string().trim().min(3).max(500) })),
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'Utilisateur');
    await assertCanModerate(req, id);
    await query(`UPDATE users SET status = 'banned', ban_reason = $1, updated_at = now() WHERE id = $2`, [req.body.reason, id]);
    await logActivity(req, 'ban_user', 'user', id);
    return ok(res, undefined, { message: 'Utilisateur banni' });
  }),
);

router.post(
  '/users/:id/unban',
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'Utilisateur');
    await query(`UPDATE users SET status = 'active', ban_reason = NULL, updated_at = now() WHERE id = $1`, [id]);
    await logActivity(req, 'unban_user', 'user', id);
    return ok(res, undefined, { message: 'Utilisateur réactivé' });
  }),
);

router.delete(
  '/users/:id',
  adminOnly,
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'Utilisateur');
    await assertCanModerate(req, id);
    const files = await query<{ file_name: string }>(
      'SELECT p.file_name FROM memory_photos p JOIN memories m ON m.id = p.memory_id WHERE m.user_id = $1',
      [id],
    );
    await query('DELETE FROM users WHERE id = $1', [id]);
    await Promise.all(files.map((f) => deleteFile(f.file_name)));
    await logActivity(req, 'delete_user', 'user', id);
    return ok(res, undefined, { message: 'Utilisateur supprimé' });
  }),
);

/* -------------------------------- Souvenirs -------------------------------- */

const ADMIN_MEMORY = `
  SELECT m.id, m.title, m.description, m.user_id, u.username, u.full_name, u.avatar_url, m.country, COALESCE(m.city, '') AS city,
    (SELECT count(*)::int FROM likes WHERE memory_id = m.id) AS likes_count,
    (SELECT count(*)::int FROM comments WHERE memory_id = m.id) AS comments_count,
    m.views_count, m.visibility, m.status, m.created_at, m.cover_image, m.is_featured
  FROM memories m JOIN users u ON u.id = m.user_id`;

router.get(
  '/memories',
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPage(req, 20, 100);
    const params: unknown[] = [];
    const where: string[] = ['TRUE'];
    if (req.query.search) {
      params.push(`%${escapeLike(String(req.query.search))}%`);
      where.push(`(m.title ILIKE $${params.length} OR u.username ILIKE $${params.length} OR m.country ILIKE $${params.length})`);
    }
    if (['published', 'draft', 'archived', 'reported', 'deleted'].includes(String(req.query.status))) {
      params.push(req.query.status);
      where.push(`m.status = $${params.length}`);
    }
    if (['public', 'private', 'followers'].includes(String(req.query.visibility))) {
      params.push(req.query.visibility);
      where.push(`m.visibility = $${params.length}`);
    }
    const w = where.join(' AND ');
    const total = (await one<{ n: number }>(`SELECT count(*)::int AS n FROM memories m JOIN users u ON u.id = m.user_id WHERE ${w}`, params))!.n;
    const memories = await query(`${ADMIN_MEMORY} WHERE ${w} ORDER BY m.created_at DESC, m.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]);
    const pagination = paginationOf(page, limit, total);
    return ok(res, { memories, pagination }, { pagination });
  }),
);

const getAdminMemory = async (id: number) => {
  const m = await one(`${ADMIN_MEMORY} WHERE m.id = $1`, [id]);
  if (!m) throw new HttpError(404, 'Souvenir introuvable');
  return m;
};

router.get('/memories/:id', asyncHandler(async (req, res) => ok(res, await getAdminMemory(intParam(req.params.id, 'Souvenir')))));

router.patch(
  '/memories/:id/status',
  validate(z.object({ status: z.enum(['published', 'draft', 'archived', 'reported', 'deleted']) })),
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'Souvenir');
    await getAdminMemory(id);
    await query('UPDATE memories SET status = $1, updated_at = now() WHERE id = $2', [req.body.status, id]);
    await logActivity(req, `memory_status:${req.body.status}`, 'memory', id);
    return ok(res, await getAdminMemory(id));
  }),
);

router.patch(
  '/memories/:id/feature',
  validate(z.object({ featured: z.boolean() })),
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'Souvenir');
    await getAdminMemory(id);
    await query('UPDATE memories SET is_featured = $1 WHERE id = $2', [req.body.featured, id]);
    await logActivity(req, req.body.featured ? 'feature_memory' : 'unfeature_memory', 'memory', id);
    return ok(res, await getAdminMemory(id));
  }),
);

router.delete(
  '/memories/:id',
  adminOnly,
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'Souvenir');
    await getAdminMemory(id);
    const files = await query<{ file_name: string }>('SELECT file_name FROM memory_photos WHERE memory_id = $1', [id]);
    await query('DELETE FROM memories WHERE id = $1', [id]);
    await Promise.all(files.map((f) => deleteFile(f.file_name)));
    await logActivity(req, 'delete_memory', 'memory', id);
    return ok(res, undefined, { message: 'Souvenir supprimé' });
  }),
);

/* -------------------------------- Signalements ------------------------------ */

router.get(
  '/reports',
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPage(req, 20, 100);
    const params: unknown[] = [];
    let where = 'TRUE';
    if (['pending', 'reviewed', 'resolved', 'dismissed'].includes(String(req.query.status))) {
      params.push(req.query.status);
      where = `r.status = $1`;
    }
    const reports = await query(
      `SELECT r.id, r.reporter_id, ru.username AS reporter_name, r.target_type, r.target_id,
              COALESCE(m.title, tu.username, left(c.content, 60), '(contenu supprimé)') AS target_title,
              r.reason, r.status, r.created_at
       FROM reports r
       JOIN users ru ON ru.id = r.reporter_id
       LEFT JOIN memories m ON r.target_type = 'memory'  AND m.id = r.target_id
       LEFT JOIN users   tu ON r.target_type = 'user'    AND tu.id = r.target_id
       LEFT JOIN comments c ON r.target_type = 'comment' AND c.id = r.target_id
       WHERE ${where} ORDER BY (r.status = 'pending') DESC, r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );
    const total = (await one<{ n: number }>(`SELECT count(*)::int AS n FROM reports r WHERE ${where}`, params))!.n;
    const pagination = paginationOf(page, limit, total);
    return ok(res, { reports, pagination }, { pagination });
  }),
);

router.patch(
  '/reports/:id',
  validate(z.object({
    status: z.enum(['pending', 'reviewed', 'resolved', 'dismissed']),
    action: z.enum(['delete_content', 'ban_user']).optional(),
  })),
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'Signalement');
    const report = await one<{ id: number; target_type: string; target_id: number }>('SELECT id, target_type, target_id FROM reports WHERE id = $1', [id]);
    if (!report) throw new HttpError(404, 'Signalement introuvable');

    const { action } = req.body;
    if (action === 'delete_content') {
      if (report.target_type === 'memory') await query(`UPDATE memories SET status = 'deleted' WHERE id = $1`, [report.target_id]);
      else if (report.target_type === 'comment') await query('DELETE FROM comments WHERE id = $1', [report.target_id]);
      else throw new HttpError(400, 'Un utilisateur ne se « supprime » pas ici : utilisez ban_user');
    } else if (action === 'ban_user') {
      const owner =
        report.target_type === 'user' ? report.target_id
        : report.target_type === 'memory' ? (await one<{ user_id: number }>('SELECT user_id FROM memories WHERE id = $1', [report.target_id]))?.user_id
        : (await one<{ user_id: number }>('SELECT user_id FROM comments WHERE id = $1', [report.target_id]))?.user_id;
      if (!owner) throw new HttpError(404, 'Contenu ciblé introuvable');
      await assertCanModerate(req, owner);
      await query(`UPDATE users SET status = 'banned', ban_reason = 'Signalement validé', updated_at = now() WHERE id = $1`, [owner]);
    }
    await query('UPDATE reports SET status = $1, action = $2 WHERE id = $3', [req.body.status, action ?? null, id]);
    await logActivity(req, `report:${req.body.status}${action ? `:${action}` : ''}`, 'report', id);
    return ok(res, await one('SELECT * FROM reports WHERE id = $1', [id]));
  }),
);

/* --------------------------------- Paramètres ------------------------------- */

router.get('/settings', adminOnly, asyncHandler(async (_req, res) => ok(res, await getSettings())));

router.put(
  '/settings',
  adminOnly,
  validate(settingsSchema.partial()),
  asyncHandler(async (req, res) => {
    const updated = await updateSettings(req.body);
    await logActivity(req, 'update_settings', 'settings', 0);
    return ok(res, updated, { message: 'Paramètres enregistrés' });
  }),
);

export default router;
