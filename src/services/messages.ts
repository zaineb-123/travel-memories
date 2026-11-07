import { one, query } from '../db';
import type { AuthUser } from '../middleware/auth';
import { HttpError } from '../utils/http';
import { notify } from './notify';
import { getVisibleMemory, memorySelect, visibleClause } from './queries';
import { isBlockedEitherWay } from './relations';

export const MAX_BODY = 2000;

const pair = (a: number, b: number) => (a < b ? [a, b] : [b, a]);

/**
 * Un message est possible entre deux personnes sauf blocage ; vers un compte privé,
 * il faut qu'un abonnement existe dans un sens ou dans l'autre.
 */
export async function assertCanMessage(senderId: number, recipientId: number) {
  if (senderId === recipientId) throw new HttpError(400, 'Vous ne pouvez pas vous écrire à vous-même');
  const to = await one<{ is_private: boolean }>("SELECT is_private FROM users WHERE id = $1 AND status = 'active'", [recipientId]);
  if (!to) throw new HttpError(404, 'Utilisateur introuvable');
  if (await isBlockedEitherWay(senderId, recipientId)) throw new HttpError(403, 'Action impossible avec cet utilisateur');
  if (to.is_private) {
    const linked = await one(
      `SELECT 1 FROM follows WHERE (follower_id = $1 AND following_id = $2) OR (follower_id = $2 AND following_id = $1) LIMIT 1`,
      [senderId, recipientId],
    );
    if (!linked) throw new HttpError(403, 'Ce compte est privé : abonnez-vous à lui pour lui écrire');
  }
}

export async function getOrCreateConversation(a: number, b: number): Promise<number> {
  const [x, y] = pair(a, b);
  const row = await one<{ id: number }>(
    `INSERT INTO conversations (user_a, user_b) VALUES ($1, $2)
     ON CONFLICT (user_a, user_b) DO UPDATE SET user_a = EXCLUDED.user_a RETURNING id`,
    [x, y],
  );
  return row!.id;
}

/** Conversation dont `userId` est membre, sinon 404 (on ne révèle pas l'existence des autres). */
export async function getMyConversation(conversationId: number, userId: number) {
  const c = await one<{ id: number; user_a: number; user_b: number }>(
    'SELECT id, user_a, user_b FROM conversations WHERE id = $1 AND (user_a = $2 OR user_b = $2)',
    [conversationId, userId],
  );
  if (!c) throw new HttpError(404, 'Conversation introuvable');
  const otherId = c.user_a === userId ? c.user_b : c.user_a;
  if (await isBlockedEitherWay(userId, otherId)) throw new HttpError(404, 'Conversation introuvable');
  return { id: c.id, otherId };
}

interface SendInput {
  sender: Pick<AuthUser, 'id' | 'username' | 'role'>;
  recipientId: number;
  body?: string;
  memoryId?: number;
}

export async function sendMessage({ sender, recipientId, body, memoryId }: SendInput) {
  await assertCanMessage(sender.id, recipientId);

  if (memoryId) {
    const memory = await getVisibleMemory(memoryId, sender as AuthUser, false);
    if (!memory || memory.status !== 'published') throw new HttpError(404, 'Souvenir introuvable');
    if (memory.visibility === 'private') throw new HttpError(403, 'Ce souvenir est privé et ne peut pas être partagé');
  }

  const conversationId = await getOrCreateConversation(sender.id, recipientId);
  const row = await one<{ id: number }>(
    `INSERT INTO messages (conversation_id, sender_id, body, memory_id, shared_memory) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [conversationId, sender.id, body ?? null, memoryId ?? null, !!memoryId],
  );
  await query('UPDATE conversations SET last_message_at = now() WHERE id = $1', [conversationId]);
  // Le contenu n'est jamais copié dans la notification.
  await notify({
    userId: recipientId, fromUserId: sender.id, type: 'message', referenceId: conversationId,
    message: `${sender.username} vous a envoyé un message`, dedupeUnread: true,
  });
  return { conversationId, messageId: row!.id };
}

/** Message tel que le voit `viewerId` ; un souvenir partagé n'est montré que s'il lui est accessible. */
export async function shapeMessages(rows: any[], viewerId: number) {
  const memoryIds = [...new Set(rows.filter((r) => r.memory_id && !r.deleted_at).map((r) => r.memory_id as number))];
  const visible = new Map<number, any>();
  if (memoryIds.length) {
    const found = await query(
      `${memorySelect('$1')} WHERE m.id = ANY($2::int[]) AND m.status = 'published' AND ${visibleClause('$1')}`,
      [viewerId, memoryIds],
    );
    for (const m of found) {
      visible.set(m.id, {
        id: m.id, title: m.title, country: m.country, city: m.city, cover_image: m.cover_image,
        user: { username: m.u_username, avatar_url: m.u_avatar_url },
      });
    }
  }
  return rows.map((r) => {
    const deleted = !!r.deleted_at;
    return {
      id: r.id,
      conversation_id: r.conversation_id,
      sender_id: r.sender_id,
      is_mine: r.sender_id === viewerId,
      body: deleted ? null : r.body,
      deleted,
      memory: deleted || !r.shared_memory ? null : (visible.get(r.memory_id) ?? { unavailable: true }),
      created_at: r.created_at,
      read_at: r.read_at,
    };
  });
}

export async function unreadMessagesCount(userId: number): Promise<number> {
  const row = await one<{ n: number }>(
    `SELECT count(*)::int AS n FROM messages m JOIN conversations c ON c.id = m.conversation_id
     WHERE (c.user_a = $1 OR c.user_b = $1) AND m.sender_id <> $1 AND m.read_at IS NULL AND m.deleted_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = $1 AND b.blocked_id = m.sender_id) OR (b.blocker_id = m.sender_id AND b.blocked_id = $1))`,
    [userId],
  );
  return row!.n;
}
