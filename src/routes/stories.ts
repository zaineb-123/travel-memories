import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../db';
import { authenticate, isStaff, optionalAuth } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { validate } from '../middleware/validate';
import { logActivity } from '../services/activity';
import { blockedBetween, followsUser } from '../services/queries';
import { deleteFile, saveImage } from '../utils/files';
import { asyncHandler, HttpError, intParam, ok } from '../utils/http';

const router = Router();
const MAX_ACTIVE_STORIES = 20;

/* --------------------------------- Schéma -------------------------------- */

// Champs multipart : tout arrive en chaîne ; une chaîne vide = « non renseigné ».
const emptyToUndef = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : v);
const coord = (min: number, max: number) => z.preprocess((v) => (emptyToUndef(v) === undefined ? undefined : Number(emptyToUndef(v))), z.number().min(min).max(max).optional());

const createSchema = z
  .object({
    caption: z.preprocess(emptyToUndef, z.string().trim().max(200, 'Légende trop longue (max 200)').optional()),
    country: z.preprocess(emptyToUndef, z.string().trim().max(50).optional()),
    location_name: z.preprocess(emptyToUndef, z.string().trim().max(200).optional()),
    latitude: coord(-90, 90),
    longitude: coord(-180, 180),
    visibility: z.preprocess(emptyToUndef, z.enum(['public', 'followers']).default('followers')),
  })
  .refine((d) => (d.latitude === undefined) === (d.longitude === undefined), { message: 'Latitude et longitude vont ensemble' });

/* ------------------------------- Visibilité ------------------------------ */

/**
 * Story active et visible par `v` (placeholder du viewer, ou null pour un visiteur).
 * Mêmes règles que les souvenirs : compte privé = abonnés seulement, blocage = invisible.
 * `s` = table stories, `u` = auteur.
 */
function storyVisible(v: string | null): string {
  const active = `s.expires_at > now() AND u.status <> 'banned'`;
  if (!v) return `(${active} AND s.visibility = 'public' AND u.is_private = FALSE)`;
  return `(${active} AND (s.user_id = ${v} OR (NOT ${blockedBetween(v, 's.user_id')}
    AND ((s.visibility = 'public' AND (u.is_private = FALSE OR ${followsUser(v, 's.user_id')}))
      OR (s.visibility = 'followers' AND ${followsUser(v, 's.user_id')})))))`;
}

const SELECT = (v: string | null) => `
  SELECT s.id, s.user_id, s.image_url, s.caption, s.country, s.location_name, s.latitude, s.longitude,
         s.visibility, s.created_at, s.expires_at,
         u.username AS u_username, u.full_name AS u_full_name, u.avatar_url AS u_avatar_url,
         ${v ? `EXISTS (SELECT 1 FROM story_views sv WHERE sv.story_id = s.id AND sv.viewer_id = ${v})` : 'FALSE'} AS seen,
         ${v ? `CASE WHEN s.user_id = ${v} THEN (SELECT count(*)::int FROM story_views WHERE story_id = s.id) END` : 'NULL'} AS views_count
  FROM stories s JOIN users u ON u.id = s.user_id`;

const shape = ({ u_username, u_full_name, u_avatar_url, ...s }: any) => ({
  ...s,
  user: { id: s.user_id, username: u_username, full_name: u_full_name, avatar_url: u_avatar_url },
});

/** Supprime les stories expirées et leurs fichiers (appelé périodiquement par le serveur). */
export async function purgeExpiredStories(): Promise<number> {
  const gone = await query<{ file_name: string }>('DELETE FROM stories WHERE expires_at <= now() RETURNING file_name');
  await Promise.all(gone.map((g) => deleteFile(g.file_name)));
  return gone.length;
}

/* --------------------------------- Routes -------------------------------- */

router.post(
  '/',
  authenticate,
  upload.single('image'),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Ajoutez une photo à votre story');
    const active = (await one<{ n: number }>('SELECT count(*)::int AS n FROM stories WHERE user_id = $1 AND expires_at > now()', [req.user!.id]))!.n;
    if (active >= MAX_ACTIVE_STORIES) throw new HttpError(429, `Maximum ${MAX_ACTIVE_STORIES} stories actives à la fois`);

    const d = req.body;
    const saved = await saveImage(req.file.buffer, 'stories');
    const row = await one<{ id: number }>(
      `INSERT INTO stories (user_id, image_url, file_name, caption, country, location_name, latitude, longitude, visibility)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [req.user!.id, saved.url, saved.fileName, d.caption ?? null, d.country ?? null, d.location_name ?? null,
       d.latitude ?? null, d.longitude ?? null, d.visibility],
    );
    return ok(res, shape(await one(`${SELECT('$2')} WHERE s.id = $1`, [row!.id, req.user!.id])), { message: 'Story publiée pour 24 h' }, 201);
  }),
);

// Fil de stories : les miennes puis celles des personnes que je suis, regroupées par auteur.
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const me = req.user!.id;
    const rows = (
      await query(
        `${SELECT('$1')} WHERE ${storyVisible('$1')} AND (s.user_id = $1 OR ${followsUser('$1', 's.user_id')})
         ORDER BY s.created_at ASC, s.id ASC`,
        [me],
      )
    ).map(shape);

    const groups = new Map<number, { user: any; stories: any[]; has_unseen: boolean; latest: number }>();
    for (const s of rows) {
      const g = groups.get(s.user_id) ?? { user: s.user, stories: [], has_unseen: false, latest: 0 };
      g.stories.push(s);
      g.has_unseen ||= !s.seen && s.user_id !== me;
      g.latest = Math.max(g.latest, new Date(s.created_at).getTime());
      groups.set(s.user_id, g);
    }
    const ordered = [...groups.values()].sort((a, b) => {
      if (a.user.id === me) return -1;
      if (b.user.id === me) return 1;
      if (a.has_unseen !== b.has_unseen) return a.has_unseen ? -1 : 1;
      return b.latest - a.latest;
    });
    return ok(res, ordered.map(({ latest: _l, ...g }) => g));
  }),
);

// Stories géolocalisées, pour les afficher sur la carte.
router.get(
  '/map',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const v = req.user ? '$1' : null;
    const rows = await query(
      `${SELECT(v)} WHERE ${storyVisible(v)} AND s.latitude IS NOT NULL ORDER BY s.created_at DESC LIMIT 200`,
      req.user ? [req.user.id] : [],
    );
    return ok(res, rows.map(shape));
  }),
);

router.get(
  '/user/:username',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const owner = await one<{ id: number }>(`SELECT id FROM users WHERE lower(username) = lower($1) AND status <> 'banned'`, [req.params.username]);
    if (!owner) throw new HttpError(404, 'Utilisateur introuvable');
    const v = req.user ? '$2' : null;
    const rows = await query(
      `${SELECT(v)} WHERE s.user_id = $1 AND ${storyVisible(v)} ORDER BY s.created_at ASC, s.id ASC`,
      req.user ? [owner.id, req.user.id] : [owner.id],
    );
    return ok(res, rows.map(shape));
  }),
);

router.post(
  '/:id/view',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'Story');
    const story = await one<{ user_id: number }>(`SELECT s.user_id FROM stories s JOIN users u ON u.id = s.user_id WHERE s.id = $1 AND ${storyVisible('$2')}`, [id, req.user!.id]);
    if (!story) throw new HttpError(404, 'Story introuvable ou expirée');
    if (story.user_id !== req.user!.id) {
      await query('INSERT INTO story_views (story_id, viewer_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [id, req.user!.id]);
    }
    return ok(res);
  }),
);

// Qui a vu ma story : réservé à son auteur.
router.get(
  '/:id/viewers',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'Story');
    const own = await one('SELECT 1 FROM stories WHERE id = $1 AND user_id = $2', [id, req.user!.id]);
    if (!own) throw new HttpError(404, 'Story introuvable');
    const rows = await query(
      `SELECT u.id, u.username, u.full_name, u.avatar_url, sv.viewed_at FROM story_views sv JOIN users u ON u.id = sv.viewer_id
       WHERE sv.story_id = $1 ORDER BY sv.viewed_at DESC LIMIT 200`,
      [id],
    );
    return ok(res, rows);
  }),
);

router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'Story');
    const story = await one<{ user_id: number; file_name: string }>('SELECT user_id, file_name FROM stories WHERE id = $1', [id]);
    if (!story) throw new HttpError(404, 'Story introuvable');
    if (story.user_id !== req.user!.id && !isStaff(req.user)) throw new HttpError(403, 'Cette story ne vous appartient pas');
    await query('DELETE FROM stories WHERE id = $1', [id]);
    await deleteFile(story.file_name);
    if (story.user_id !== req.user!.id) await logActivity(req, 'delete_story', 'story', id);
    return ok(res, undefined, { message: 'Story supprimée' });
  }),
);

export default router;
