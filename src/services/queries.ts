import { query } from '../db';
import type { AuthUser } from '../middleware/auth';

/* ------------------------------ Utilisateurs ------------------------------ */

/** Colonnes publiques d'un utilisateur + compteurs calculés (jamais désynchronisés). */
export const USER_COLUMNS = `
  u.id, u.username, u.full_name, u.bio, u.avatar_url, u.country, u.city, u.theme, u.is_private,
  u.role, u.status, u.email_verified, u.last_login, u.created_at, u.updated_at,
  (SELECT count(*)::int FROM memories WHERE user_id = u.id AND status = 'published') AS memories_count,
  (SELECT count(*)::int FROM follows WHERE following_id = u.id) AS followers_count,
  (SELECT count(*)::int FROM follows WHERE follower_id = u.id) AS following_count,
  (SELECT count(*)::int FROM likes l JOIN memories m ON m.id = l.memory_id WHERE m.user_id = u.id) AS total_likes_received,
  (SELECT count(DISTINCT lower(country))::int FROM memories WHERE user_id = u.id AND status = 'published') AS countries_visited`;

export async function getUserById(id: number, includeEmail = false) {
  const rows = await query(`SELECT ${USER_COLUMNS}${includeEmail ? ', u.email' : ''} FROM users u WHERE u.id = $1`, [id]);
  return rows[0] ?? null;
}

/* -------------------------------- Souvenirs -------------------------------- */

/** SQL : `v` est bloqué par `col`, ou bloque `col` (dans un sens comme dans l'autre). */
export const blockedBetween = (v: string, col: string) =>
  `EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = ${v} AND b.blocked_id = ${col}) OR (b.blocker_id = ${col} AND b.blocked_id = ${v}))`;

/** SQL : `v` suit `col` (abonnement accepté). */
export const followsUser = (v: string, col: string) =>
  `EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ${v} AND f.following_id = ${col})`;

/**
 * Clause SQL de visibilité d'un souvenir. `v` = placeholder du viewer ($n) ou null.
 * - public + publié + compte non privé : tout le monde
 * - compte privé : même les souvenirs « publics » ne sont visibles que par les abonnés acceptés
 * - le propriétaire voit tout (sauf supprimé)
 * - "followers" : visible par les abonnés du propriétaire
 * - un utilisateur bloqué (ou qui a bloqué) ne voit rien
 */
export function visibleClause(v: string | null): string {
  if (!v) return `(m.status = 'published' AND m.visibility = 'public' AND u.status <> 'banned' AND u.is_private = FALSE)`;
  return `((m.user_id = ${v} AND m.status <> 'deleted')
    OR (m.status = 'published' AND u.status <> 'banned' AND NOT ${blockedBetween(v, 'm.user_id')}
        AND ((m.visibility = 'public' AND (u.is_private = FALSE OR ${followsUser(v, 'm.user_id')}))
          OR (m.visibility = 'followers' AND ${followsUser(v, 'm.user_id')}))))`;
}

export function memorySelect(v: string | null): string {
  return `SELECT m.id, m.user_id, m.title, m.description, m.country, m.city, m.latitude, m.longitude,
      m.location_name, m.travel_date, m.cover_image, m.views_count, m.visibility, m.status, m.is_featured,
      m.created_at, m.updated_at,
      u.username AS u_username, u.avatar_url AS u_avatar_url, u.full_name AS u_full_name,
      (SELECT count(*)::int FROM likes WHERE memory_id = m.id) AS likes_count,
      (SELECT count(*)::int FROM comments WHERE memory_id = m.id) AS comments_count,
      (m.visibility = 'public' AND m.status = 'published' AND NOT EXISTS (
        SELECT 1 FROM memories e WHERE e.user_id = m.user_id AND lower(e.country) = lower(m.country)
          AND e.status = 'published' AND e.visibility = 'public'
          AND (e.travel_date < m.travel_date OR (e.travel_date = m.travel_date AND e.id < m.id)))) AS first_in_country,
      ${v ? `EXISTS (SELECT 1 FROM likes WHERE memory_id = m.id AND user_id = ${v})` : 'FALSE'} AS is_liked,
      ${v ? `EXISTS (SELECT 1 FROM favorites WHERE memory_id = m.id AND user_id = ${v})` : 'FALSE'} AS is_favorited
    FROM memories m JOIN users u ON u.id = m.user_id`;
}

/** Ajoute user, photos et tags aux lignes brutes (2 requêtes pour toute la page, pas N+1). */
export async function hydrateMemories(rows: any[]) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [photos, tags] = await Promise.all([
    query(
      `SELECT id, memory_id, image_url, caption, sort_order, is_cover
       FROM memory_photos WHERE memory_id = ANY($1::int[]) ORDER BY sort_order, id`,
      [ids],
    ),
    query(
      `SELECT mt.memory_id, t.id, t.name, t.slug,
              (SELECT count(*)::int FROM memory_tags WHERE tag_id = t.id) AS usage_count
       FROM memory_tags mt JOIN tags t ON t.id = mt.tag_id WHERE mt.memory_id = ANY($1::int[])`,
      [ids],
    ),
  ]);
  return rows.map((r) => {
    const { u_username, u_avatar_url, u_full_name, ...rest } = r;
    return {
      ...rest,
      user: { username: u_username, avatar_url: u_avatar_url, full_name: u_full_name },
      photos: photos.filter((p) => p.memory_id === r.id),
      tags: tags.filter((t) => t.memory_id === r.id).map(({ memory_id: _m, ...t }) => t),
    };
  });
}

/** Récupère un souvenir visible par `viewer` (le staff voit tout sauf supprimé). */
export async function getVisibleMemory(id: number, viewer?: AuthUser, staffBypass = true) {
  const staff = staffBypass && !!viewer && (viewer.role === 'admin' || viewer.role === 'moderator');
  const params: unknown[] = [id];
  let v: string | null = null;
  if (viewer) {
    params.push(viewer.id);
    v = '$2';
  }
  const where = staff ? `m.status <> 'deleted'` : visibleClause(v);
  const rows = await query(`${memorySelect(v)} WHERE m.id = $1 AND (${where})`, params);
  if (!rows[0]) return null;
  return (await hydrateMemories(rows))[0];
}
