import { one, query } from '../db';
import { notify } from './notify';
import { blockedBetween, visibleClause } from './queries';

const MAX_MENTIONS = 10;

/** Extrait les @username d'un texte (sans doublons, insensible à la casse, 10 maximum). */
export function extractMentions(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(/(?<![\w@])@([A-Za-z0-9_]{3,50})/g)) {
    found.add(m[1].toLowerCase());
    if (found.size >= MAX_MENTIONS) break;
  }
  return [...found];
}

interface SyncInput {
  text: string;
  author: { id: number; username: string };
  memory: { id: number; title: string };
  commentId?: number; // 0 / absent = texte du souvenir lui-même
}

/**
 * Aligne les mentions stockées sur le texte actuel et notifie uniquement les nouvelles.
 * Une personne n'est identifiée (et notifiée) que si elle peut réellement voir le souvenir :
 * un brouillon, un souvenir privé ou un blocage n'exposent donc jamais son existence.
 */
export async function syncMentions({ text, author, memory, commentId = 0 }: SyncInput) {
  const names = extractMentions(text);
  let eligible: number[] = [];

  if (names.length) {
    const candidates = await query<{ id: number }>(
      `SELECT u.id FROM users u
       WHERE lower(u.username) = ANY($1::text[]) AND u.status = 'active' AND u.id <> $2 AND NOT ${blockedBetween('$2', 'u.id')}`,
      [names, author.id],
    );
    for (const { id } of candidates) {
      const canSee = await one(
        `SELECT 1 FROM memories m JOIN users u ON u.id = m.user_id WHERE m.id = $1 AND ${visibleClause('$2')}`,
        [memory.id, id],
      );
      if (canSee) eligible.push(id);
    }
  }

  await query(
    'DELETE FROM mentions WHERE memory_id = $1 AND comment_id = $2 AND NOT (mentioned_id = ANY($3::int[]))',
    [memory.id, commentId, eligible],
  );
  for (const id of eligible) {
    const created = await query(
      'INSERT INTO mentions (memory_id, comment_id, mentioned_id, author_id) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING 1 AS ok',
      [memory.id, commentId, id, author.id],
    );
    if (created.length) {
      await notify({
        userId: id, fromUserId: author.id, type: 'mention', referenceId: memory.id,
        message: commentId
          ? `${author.username} vous a mentionné dans un commentaire`
          : `${author.username} vous a identifié dans « ${memory.title} »`,
      });
    }
  }
}
