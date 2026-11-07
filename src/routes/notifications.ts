import { Router } from 'express';
import { one, query } from '../db';
import { authenticate } from '../middleware/auth';
import { asyncHandler, getPage, intParam, ok, paginationOf } from '../utils/http';

const router = Router();
router.use(authenticate);

const SELECT = `
  SELECT n.id, n.user_id, n.from_user_id, n.type, n.reference_id, n.message, n.is_read, n.created_at,
         u.username AS f_username, u.avatar_url AS f_avatar_url, u.full_name AS f_full_name
  FROM notifications n JOIN users u ON u.id = n.from_user_id`;

const shape = ({ f_username, f_avatar_url, f_full_name, ...n }: any) => ({
  ...n,
  from_user: { username: f_username, avatar_url: f_avatar_url, full_name: f_full_name },
});

const unreadCount = async (userId: number) =>
  (await one<{ n: number }>('SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND is_read = FALSE', [userId]))!.n;

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPage(req, 20);
    const rows = await query(`${SELECT} WHERE n.user_id = $1 ORDER BY n.created_at DESC, n.id DESC LIMIT $2 OFFSET $3`, [req.user!.id, limit, offset]);
    const total = (await one<{ n: number }>('SELECT count(*)::int AS n FROM notifications WHERE user_id = $1', [req.user!.id]))!.n;
    return ok(res, rows.map(shape), { pagination: paginationOf(page, limit, total) });
  }),
);

router.get(
  '/unread',
  asyncHandler(async (req, res) => {
    const rows = await query(`${SELECT} WHERE n.user_id = $1 AND n.is_read = FALSE ORDER BY n.created_at DESC LIMIT 50`, [req.user!.id]);
    return ok(res, rows.map(shape), { count: await unreadCount(req.user!.id) });
  }),
);

router.get('/unread/count', asyncHandler(async (req, res) => ok(res, { count: await unreadCount(req.user!.id) })));

// Doit être déclaré avant "/:id/read".
router.put(
  '/read-all',
  asyncHandler(async (req, res) => {
    await query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE', [req.user!.id]);
    return ok(res);
  }),
);

router.put(
  '/:id/read',
  asyncHandler(async (req, res) => {
    await query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [intParam(req.params.id, 'Notification'), req.user!.id]);
    return ok(res);
  }),
);

export default router;
