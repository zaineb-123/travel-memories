import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../db';
import { authenticate, isStaff, optionalAuth } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { validate } from '../middleware/validate';
import { logActivity } from '../services/activity';
import { config } from '../config';
import { sendMessage } from '../services/messages';
import { syncMentions } from '../services/mentions';
import { notify } from '../services/notify';
import { getVisibleMemory, hydrateMemories, memorySelect, visibleClause } from '../services/queries';
import { getSettings } from '../services/settings';
import { deleteFile, saveImage } from '../utils/files';
import { asyncHandler, escapeLike, getPage, HttpError, intParam, ok, paginationOf, slugify } from '../utils/http';

const router = Router();

/* --------------------------------- Schémas -------------------------------- */

const isDate = (s: string) => !Number.isNaN(Date.parse(s)) && /^\d{4}-\d{2}-\d{2}/.test(s);

const memoryBase = z.object({
  title: z.string().trim().min(3, 'Titre trop court (min 3 caractères)').max(100, 'Titre trop long (max 100)'),
  description: z.string().trim().min(10, 'Description trop courte (min 10 caractères)').max(2000, 'Description trop longue (max 2000)'),
  country: z.string().trim().min(2, 'Pays requis').max(50),
  city: z.string().trim().max(50).nullable().optional(),
  travel_date: z.string().refine(isDate, 'Date de voyage invalide'),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  location_name: z.string().trim().max(200).nullable().optional(),
  visibility: z.enum(['public', 'private', 'followers']).default('public'),
  status: z.enum(['published', 'draft']).default('published'),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
});

const createSchema = memoryBase.refine((d) => (d.latitude == null) === (d.longitude == null), {
  message: 'Latitude et longitude vont ensemble',
});
const updateSchema = memoryBase.partial().refine((d) => Object.keys(d).length > 0, { message: 'Aucune donnée à modifier' });

const listSchema = z.object({
  search: z.string().trim().max(100).optional(),
  country: z.string().trim().max(50).optional(),
  tag: z.string().trim().max(40).optional(),
  username: z.string().trim().max(50).optional(),
  mine: z.enum(['true', 'false']).optional(),
  feed: z.enum(['following']).optional(),
  has_location: z.enum(['true', 'false']).optional(),
  sort: z.enum(['recent', 'popular', 'views']).default('recent'),
});

/* --------------------------------- Helpers -------------------------------- */

async function setTags(memoryId: number, names: string[]) {
  await query('DELETE FROM memory_tags WHERE memory_id = $1', [memoryId]);
  const seen = new Set<string>();
  for (const raw of names) {
    const name = raw.replace(/^#/, '').trim();
    const slug = slugify(name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const tag = await one<{ id: number }>(
      `INSERT INTO tags (name, slug) VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = tags.name RETURNING id`,
      [name, slug],
    );
    await query('INSERT INTO memory_tags (memory_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [memoryId, tag!.id]);
  }
}

/** Souvenir modifiable par son auteur ou un admin. */
async function getOwned(id: number, user: NonNullable<Express.Request['user']>) {
  const m = await one<{ id: number; user_id: number; title: string }>(
    `SELECT id, user_id, title FROM memories WHERE id = $1 AND status <> 'deleted'`,
    [id],
  );
  if (!m) throw new HttpError(404, 'Souvenir introuvable');
  if (m.user_id !== user.id && user.role !== 'admin') throw new HttpError(403, 'Ce souvenir ne vous appartient pas');
  return m;
}

async function listMemories(req: any, res: any, forced: { favorites?: boolean; username?: string } = {}) {
  const q = (req as any).validatedQuery as z.infer<typeof listSchema>;
  const { page, limit, offset } = getPage(req, 12, 50);
  const params: unknown[] = [];
  const push = (v: unknown) => (params.push(v), `$${params.length}`);

  const v = req.user ? push(req.user.id) : null;
  const where: string[] = [visibleClause(v)];

  if (q.search) {
    const p = push(`%${escapeLike(q.search)}%`);
    where.push(`(m.title ILIKE ${p} OR m.description ILIKE ${p} OR m.country ILIKE ${p} OR m.city ILIKE ${p}
      OR m.location_name ILIKE ${p}
      OR EXISTS (SELECT 1 FROM memory_tags mt JOIN tags t ON t.id = mt.tag_id WHERE mt.memory_id = m.id AND t.name ILIKE ${p}))`);
  }
  if (q.country) where.push(`lower(m.country) = lower(${push(q.country)})`);
  if (q.tag) where.push(`EXISTS (SELECT 1 FROM memory_tags mt JOIN tags t ON t.id = mt.tag_id WHERE mt.memory_id = m.id AND t.slug = ${push(slugify(q.tag))})`);
  const username = forced.username ?? q.username;
  if (username) where.push(`lower(u.username) = lower(${push(username)})`);
  if (q.has_location === 'true') where.push('m.latitude IS NOT NULL AND m.longitude IS NOT NULL');
  if (q.mine === 'true') {
    if (!req.user) throw new HttpError(401, 'Authentification requise');
    where.push(`m.user_id = ${v}`);
  }
  if (q.feed === 'following') {
    if (!req.user) throw new HttpError(401, 'Authentification requise');
    where.push(`m.user_id IN (SELECT following_id FROM follows WHERE follower_id = ${v})`);
  }
  if (forced.favorites) where.push(`EXISTS (SELECT 1 FROM favorites fv WHERE fv.memory_id = m.id AND fv.user_id = ${v})`);
  // Les brouillons n'apparaissent que dans "mes souvenirs".
  if (q.mine !== 'true') where.push(`m.status = 'published'`);

  const order = {
    recent: 'm.created_at DESC, m.id DESC',
    popular: 'likes_count DESC, m.created_at DESC',
    views: 'm.views_count DESC, m.created_at DESC',
  }[q.sort];

  const whereSql = where.join(' AND ');
  const total = (
    await one<{ n: number }>(`SELECT count(*)::int AS n FROM memories m JOIN users u ON u.id = m.user_id WHERE ${whereSql}`, params)
  )!.n;
  const rows = await query(
    `${memorySelect(v)} WHERE ${whereSql} ORDER BY ${order} LIMIT ${push(limit)} OFFSET ${push(offset)}`,
    params,
  );
  const memories = await hydrateMemories(rows);
  return { memories, pagination: paginationOf(page, limit, total) };
}

/* ---------------------------------- Routes -------------------------------- */

router.get(
  '/',
  optionalAuth,
  validate(listSchema, 'query'),
  asyncHandler(async (req, res) => ok(res, await listMemories(req, res))),
);

router.get(
  '/favorites',
  authenticate,
  validate(listSchema, 'query'),
  asyncHandler(async (req, res) => ok(res, await listMemories(req, res, { favorites: true }))),
);

// Le profil attend un tableau dans data et la pagination à la racine.
router.get(
  '/user/:username',
  optionalAuth,
  validate(listSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { memories, pagination } = await listMemories(req, res, { username: req.params.username });
    return ok(res, memories, { pagination });
  }),
);

router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'Souvenir');
    const memory = await getVisibleMemory(id, req.user);
    if (!memory) throw new HttpError(404, 'Souvenir introuvable');
    if (req.user?.id !== memory.user_id) {
      await query('UPDATE memories SET views_count = views_count + 1 WHERE id = $1', [id]);
      memory.views_count += 1;
    }
    return ok(res, memory);
  }),
);

router.post(
  '/',
  authenticate,
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const d = req.body;
    const row = await one<{ id: number }>(
      `INSERT INTO memories (user_id, title, description, country, city, latitude, longitude, location_name,
                             travel_date, visibility, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [req.user!.id, d.title, d.description, d.country, d.city ?? null, d.latitude ?? null, d.longitude ?? null,
       d.location_name ?? null, d.travel_date, d.visibility, d.status],
    );
    if (d.tags?.length) await setTags(row!.id, d.tags);
    // Les brouillons ne mentionnent personne : les identifications partent à la publication.
    if (d.status === 'published') await syncMentions({ text: `${d.title}\n${d.description}`, author: req.user!, memory: { id: row!.id, title: d.title } });
    const memory = await getVisibleMemory(row!.id, req.user);
    return ok(res, memory, { message: 'Souvenir créé avec succès' }, 201);
  }),
);

router.put(
  '/:id',
  authenticate,
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'Souvenir');
    await getOwned(id, req.user!);
    const { tags, ...fields } = req.body as Record<string, unknown> & { tags?: string[] };
    const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
    if (entries.length) {
      // Les clés proviennent du schéma Zod (liste blanche), jamais directement du client.
      const sets = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
      await query(`UPDATE memories SET ${sets}, updated_at = now() WHERE id = $1`, [id, ...entries.map(([, v]) => v)]);
    }
    if (tags) await setTags(id, tags);
    if (req.user!.role === 'admin') await logActivity(req, 'update_memory', 'memory', id);
    const updated = await getVisibleMemory(id, req.user);
    if (updated) {
      // Brouillon : on retire les identifications ; publié : on les resynchronise (visibilité comprise).
      await syncMentions({
        text: updated.status === 'published' ? `${updated.title}\n${updated.description}` : '',
        author: { id: updated.user_id, username: updated.user.username },
        memory: { id, title: updated.title },
      });
    }
    return ok(res, updated, { message: 'Souvenir mis à jour' });
  }),
);

router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'Souvenir');
    await getOwned(id, req.user!);
    const files = await query<{ file_name: string }>('SELECT file_name FROM memory_photos WHERE memory_id = $1', [id]);
    await query('DELETE FROM memories WHERE id = $1', [id]);
    await Promise.all(files.map((f) => deleteFile(f.file_name)));
    if (isStaff(req.user)) await logActivity(req, 'delete_memory', 'memory', id);
    return ok(res, undefined, { message: 'Souvenir supprimé' });
  }),
);

/* ------------------------------ Likes / favoris ----------------------------- */

const likeCount = async (id: number) =>
  (await one<{ n: number }>('SELECT count(*)::int AS n FROM likes WHERE memory_id = $1', [id]))!.n;

router.post(
  '/:id/like',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'Souvenir');
    const memory = await getVisibleMemory(id, req.user, false);
    if (!memory) throw new HttpError(404, 'Souvenir introuvable');
    const inserted = await query('INSERT INTO likes (user_id, memory_id) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING 1 AS ok', [req.user!.id, id]);
    if (inserted.length) {
      await notify({
        userId: memory.user_id, fromUserId: req.user!.id, type: 'like', referenceId: id,
        message: `${req.user!.username} a aimé votre souvenir « ${memory.title} »`, dedupe: true,
      });
    }
    return ok(res, { likes_count: await likeCount(id) });
  }),
);

router.delete(
  '/:id/like',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'Souvenir');
    await query('DELETE FROM likes WHERE user_id = $1 AND memory_id = $2', [req.user!.id, id]);
    return ok(res, { likes_count: await likeCount(id) });
  }),
);

router.post(
  '/:id/favorite',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'Souvenir');
    if (!(await getVisibleMemory(id, req.user, false))) throw new HttpError(404, 'Souvenir introuvable');
    await query('INSERT INTO favorites (user_id, memory_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.user!.id, id]);
    return ok(res);
  }),
);

router.delete(
  '/:id/favorite',
  authenticate,
  asyncHandler(async (req, res) => {
    await query('DELETE FROM favorites WHERE user_id = $1 AND memory_id = $2', [req.user!.id, intParam(req.params.id, 'Souvenir')]);
    return ok(res);
  }),
);


/* --------------------------------- Partage -------------------------------- */

// Envoie le souvenir à un ou plusieurs amis par message privé. Le lien reste copiable côté client.
router.post(
  '/:id/share',
  authenticate,
  validate(z.object({
    user_ids: z.array(z.number().int().positive()).min(1, 'Choisissez au moins un destinataire').max(10, 'Maximum 10 destinataires'),
    body: z.string().trim().min(1).max(500).optional(),
  })),
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'Souvenir');
    const sent: number[] = [];
    const failed: { user_id: number; reason: string }[] = [];
    for (const userId of [...new Set<number>(req.body.user_ids)]) {
      try {
        await sendMessage({ sender: req.user!, recipientId: userId, memoryId: id, body: req.body.body });
        sent.push(userId);
      } catch (e) {
        if (!(e instanceof HttpError)) throw e;
        // Un souvenir introuvable ou privé échoue pour tout le monde : on le signale tout de suite.
        if (e.status === 404 && /Souvenir/.test(e.message)) throw e;
        if (e.status === 403 && /privé et ne peut pas/.test(e.message)) throw e;
        failed.push({ user_id: userId, reason: e.message });
      }
    }
    return ok(res, { sent, failed, share_url: `${config.FRONTEND_URL}/memory/${id}` });
  }),
);

/* ---------------------------------- Photos --------------------------------- */

async function addPhotos(memoryId: number, files: Express.Multer.File[]) {
  const settings = await getSettings();
  const current = (await one<{ n: number }>('SELECT count(*)::int AS n FROM memory_photos WHERE memory_id = $1', [memoryId]))!.n;
  if (current + files.length > settings.max_photos_per_memory) {
    throw new HttpError(422, `Maximum ${settings.max_photos_per_memory} photos par souvenir`);
  }
  const added: any[] = [];
  for (const [i, file] of files.entries()) {
    const saved = await saveImage(file.buffer, 'memories');
    const isCover = current + i === 0;
    const photo = await one(
      `INSERT INTO memory_photos (memory_id, image_url, file_name, size_bytes, sort_order, is_cover)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, memory_id, image_url, caption, sort_order, is_cover`,
      [memoryId, saved.url, saved.fileName, saved.size, current + i, isCover],
    );
    if (isCover) await query('UPDATE memories SET cover_image = $1, updated_at = now() WHERE id = $2', [saved.url, memoryId]);
    added.push(photo);
  }
  return added;
}

router.post(
  '/:id/photos',
  authenticate,
  upload.single('photo'),
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'Souvenir');
    await getOwned(id, req.user!);
    if (!req.file) throw new HttpError(400, 'Aucune photo envoyée');
    const [photo] = await addPhotos(id, [req.file]);
    return ok(res, { ...photo, image_url: photo.image_url }, {}, 201);
  }),
);

router.post(
  '/:id/photos/multiple',
  authenticate,
  upload.array('photos[]', 10),
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'Souvenir');
    await getOwned(id, req.user!);
    const files = (req.files as Express.Multer.File[]) ?? [];
    if (!files.length) throw new HttpError(400, 'Aucune photo envoyée');
    const photos = await addPhotos(id, files);
    return ok(res, { images_urls: photos.map((p) => p.image_url), photos }, {}, 201);
  }),
);

router.delete(
  '/:id/photos/:photoId',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = intParam(req.params.id, 'Souvenir');
    await getOwned(id, req.user!);
    const photo = await one<{ id: number; file_name: string; is_cover: boolean }>(
      'DELETE FROM memory_photos WHERE id = $1 AND memory_id = $2 RETURNING id, file_name, is_cover',
      [intParam(req.params.photoId, 'Photo'), id],
    );
    if (!photo) throw new HttpError(404, 'Photo introuvable');
    await deleteFile(photo.file_name);
    if (photo.is_cover) {
      const next = await one<{ id: number; image_url: string }>(
        'SELECT id, image_url FROM memory_photos WHERE memory_id = $1 ORDER BY sort_order, id LIMIT 1',
        [id],
      );
      await query('UPDATE memories SET cover_image = $1 WHERE id = $2', [next?.image_url ?? '', id]);
      if (next) await query('UPDATE memory_photos SET is_cover = TRUE WHERE id = $1', [next.id]);
    }
    return ok(res);
  }),
);

export default router;
