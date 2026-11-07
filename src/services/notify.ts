import { query } from '../db';

interface NotifyInput {
  userId: number; // destinataire
  fromUserId: number;
  type: 'like' | 'comment' | 'follow' | 'follow_request' | 'follow_accepted' | 'message' | 'mention';
  referenceId: number;
  message: string;
  dedupe?: boolean;
  /** Ne crée rien s'une notification identique est déjà non lue (évite le spam des messages). */
  dedupeUnread?: boolean;
}

export async function notify({ userId, fromUserId, type, referenceId, message, dedupe = false, dedupeUnread = false }: NotifyInput) {
  if (userId === fromUserId) return; // jamais de notification à soi-même
  if (dedupe) {
    const exists = await query(
      'SELECT 1 FROM notifications WHERE user_id=$1 AND from_user_id=$2 AND type=$3 AND reference_id=$4 LIMIT 1',
      [userId, fromUserId, type, referenceId],
    );
    if (exists.length) return;
  }
  if (dedupeUnread) {
    const unread = await query(
      'SELECT 1 FROM notifications WHERE user_id=$1 AND from_user_id=$2 AND type=$3 AND reference_id=$4 AND is_read = FALSE LIMIT 1',
      [userId, fromUserId, type, referenceId],
    );
    if (unread.length) return;
  }
  await query(
    'INSERT INTO notifications (user_id, from_user_id, type, reference_id, message) VALUES ($1,$2,$3,$4,$5)',
    [userId, fromUserId, type, referenceId, message],
  );
}
