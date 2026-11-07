import { Router } from 'express';
import { one, query } from '../db';
import { authenticate, optionalAuth } from '../middleware/auth';
import { visibleClause } from '../services/queries';
import { asyncHandler, HttpError, ok } from '../utils/http';

const router = Router();

const WORLD_COUNTRIES = 195;

const BADGES = [
  { id: 'first_trip', label: 'Premier voyage', test: (s: any) => s.total_memories >= 1 },
  { id: 'explorer_5', label: 'Explorateur (5 pays)', test: (s: any) => s.total_countries >= 5 },
  { id: 'adventurer_10', label: 'Aventurier (10 pays)', test: (s: any) => s.total_countries >= 10 },
  { id: 'globetrotter_25', label: 'Globe-trotter (25 pays)', test: (s: any) => s.total_countries >= 25 },
  { id: 'storyteller', label: 'Conteur (20 souvenirs)', test: (s: any) => s.total_memories >= 20 },
  { id: 'loved', label: 'Apprécié (100 likes reçus)', test: (s: any) => s.total_likes >= 100 },
];

/** Statistiques de voyageur : pays visités (avec les dates de tampon), % du monde, lieux, badges… */
router.get(
  '/travel/:username',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const user = await one<{ id: number; is_private: boolean }>(
      `SELECT id, is_private FROM users WHERE lower(username) = lower($1) AND status = 'active'`,
      [req.params.username],
    );
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');

    // Compte privé : le passeport n'est visible que par son propriétaire et ses abonnés.
    const viewer = req.user?.id ?? null;
    if (user.is_private && viewer !== user.id) {
      const follows = viewer
        ? await one(`SELECT 1 AS ok FROM follows WHERE follower_id = $1 AND following_id = $2`, [viewer, user.id])
        : null;
      if (!follows) throw new HttpError(403, 'Ce compte est privé');
    }

    const params: unknown[] = [user.id];
    if (viewer) params.push(viewer);
    const rows = await query<any>(
      `SELECT m.id, m.title, m.country, m.city, m.latitude, m.longitude, m.cover_image,
              to_char(m.travel_date, 'YYYY-MM-DD') AS travel_date
       FROM memories m JOIN users u ON u.id = m.user_id
       WHERE m.user_id = $1 AND m.status = 'published' AND ${visibleClause(viewer ? '$2' : null)}
       ORDER BY m.travel_date, m.id`,
      params,
    );

    // Un pays = tous les souvenirs qui portent ce nom (sans tenir compte de la casse) ; son tampon date du premier.
    const byCountry = new Map<string, { country: string; memories: number; dates: string[] }>();
    for (const r of rows) {
      const key = String(r.country).trim().toLowerCase();
      const entry = byCountry.get(key) ?? { country: r.country, memories: 0, dates: [] as string[] };
      entry.memories += 1;
      entry.dates.push(r.travel_date);
      byCountry.set(key, entry);
    }
    const countries = [...byCountry.values()]
      .map((c) => ({ ...c, first_date: c.dates[0], last_date: c.dates[c.dates.length - 1] }))
      .sort((a, b) => b.memories - a.memories || a.country.localeCompare(b.country));

    const ids = rows.map((r) => r.id);
    const [photos, likes] = ids.length
      ? await Promise.all([
          one<{ n: number }>(`SELECT count(*)::int AS n FROM memory_photos WHERE memory_id = ANY($1::int[])`, [ids]),
          one<{ n: number }>(`SELECT count(*)::int AS n FROM likes WHERE memory_id = ANY($1::int[])`, [ids]),
        ])
      : [{ n: 0 }, { n: 0 }];

    const places = rows
      .filter((r) => r.latitude != null && r.longitude != null && !(Number(r.latitude) === 0 && Number(r.longitude) === 0))
      .slice(-40)
      .reverse()
      .map((r) => ({
        id: r.id,
        title: r.title,
        city: r.city || null,
        country: r.country,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        cover_image: r.cover_image || '',
        travel_date: r.travel_date,
      }));

    const summary = {
      total_memories: rows.length,
      total_countries: countries.length,
      total_photos: photos?.n ?? 0,
      total_likes: likes?.n ?? 0,
      first_trip: rows[0]?.travel_date ?? null,
      last_trip: rows[rows.length - 1]?.travel_date ?? null,
    };
    return ok(res, {
      ...summary,
      world_percentage: Math.round((countries.length / WORLD_COUNTRIES) * 1000) / 10,
      countries,
      places,
      badges: BADGES.filter((b) => b.test(summary)).map(({ id, label }) => ({ id, label })),
    });
  }),
);

/** Fil d'actualité : tampons récents des personnes que je suis, et pays qu'elles ont visités. */
router.get(
  '/friends',
  authenticate,
  asyncHandler(async (req, res) => {
    const where = `m.status = 'published' AND ${visibleClause('$1')}
      AND m.user_id IN (SELECT following_id FROM follows WHERE follower_id = $1)`;
    const [stamps, countries] = await Promise.all([
      query(
        `SELECT u.username, u.full_name, u.avatar_url, min(m.country) AS country,
                to_char(min(m.travel_date), 'YYYY-MM-DD') AS date
         FROM memories m JOIN users u ON u.id = m.user_id
         WHERE ${where}
         GROUP BY u.id, lower(m.country)
         ORDER BY min(m.travel_date) DESC, u.username LIMIT 12`,
        [req.user!.id],
      ),
      query(
        `SELECT min(m.country) AS country, count(DISTINCT m.user_id)::int AS friends
         FROM memories m JOIN users u ON u.id = m.user_id
         WHERE ${where}
         GROUP BY lower(m.country) ORDER BY count(DISTINCT m.user_id) DESC, min(m.country)`,
        [req.user!.id],
      ),
    ]);
    return ok(res, { stamps, countries });
  }),
);

/** Inspiration : destinations et tags tendance (30 derniers jours). */
router.get(
  '/discover',
  asyncHandler(async (_req, res) => {
    const [destinations, tags] = await Promise.all([
      query(
        `WITH recent AS (
           SELECT lower(country) AS key, min(country) AS country, count(*)::int AS memories
           FROM memories
           WHERE status = 'published' AND visibility = 'public' AND created_at >= now() - interval '30 days'
           GROUP BY lower(country) ORDER BY count(*) DESC LIMIT 8
         )
         SELECT r.country, r.memories,
           COALESCE((SELECT m2.cover_image FROM memories m2
                     WHERE lower(m2.country) = r.key AND m2.cover_image <> ''
                       AND m2.status = 'published' AND m2.visibility = 'public'
                     ORDER BY m2.created_at DESC LIMIT 1), '') AS cover_image
         FROM recent r ORDER BY r.memories DESC, r.country`,
      ),
      query(
        `SELECT t.name, t.slug, count(*)::int AS uses
         FROM memory_tags mt JOIN tags t ON t.id = mt.tag_id JOIN memories m ON m.id = mt.memory_id
         WHERE m.status = 'published' AND m.visibility = 'public' AND m.created_at >= now() - interval '30 days'
         GROUP BY t.id ORDER BY count(*) DESC LIMIT 10`,
      ),
    ]);
    return ok(res, { trending_destinations: destinations, trending_tags: tags });
  }),
);

export default router;
