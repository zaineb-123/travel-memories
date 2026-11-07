import { one, query } from '../db';
import { notify } from './notify';

export type FollowStatus = 'self' | 'following' | 'requested' | 'none';

/** Vrai si l'un des deux utilisateurs a bloqué l'autre. */
export async function isBlockedEitherWay(a: number, b: number): Promise<boolean> {
  return !!(await one(
    'SELECT 1 FROM blocks WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1) LIMIT 1',
    [a, b],
  ));
}

/** Vrai si `viewer` a bloqué `target` (et non l'inverse). */
export async function hasBlocked(viewer: number, target: number): Promise<boolean> {
  return !!(await one('SELECT 1 FROM blocks WHERE blocker_id = $1 AND blocked_id = $2', [viewer, target]));
}

export async function followStatus(viewerId: number | undefined, targetId: number): Promise<FollowStatus> {
  if (!viewerId) return 'none';
  if (viewerId === targetId) return 'self';
  if (await one('SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2', [viewerId, targetId])) return 'following';
  if (await one('SELECT 1 FROM follow_requests WHERE requester_id = $1 AND target_id = $2', [viewerId, targetId])) return 'requested';
  return 'none';
}

/** Deux personnes sont « amis » lorsqu'elles se suivent mutuellement. */
export async function areFriends(a: number, b: number): Promise<boolean> {
  return !!(await one(
    `SELECT 1 FROM follows f1 JOIN follows f2 ON f2.follower_id = f1.following_id AND f2.following_id = f1.follower_id
     WHERE f1.follower_id = $1 AND f1.following_id = $2`,
    [a, b],
  ));
}

/** Transforme une demande d'abonnement en abonnement. Renvoie false si la demande n'existe plus. */
export async function acceptRequest(requesterId: number, targetId: number, targetUsername: string): Promise<boolean> {
  const removed = await query('DELETE FROM follow_requests WHERE requester_id = $1 AND target_id = $2 RETURNING 1 AS ok', [requesterId, targetId]);
  if (!removed.length) return false;
  await query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [requesterId, targetId]);
  await notify({
    userId: requesterId, fromUserId: targetId, type: 'follow_accepted', referenceId: targetId,
    message: `${targetUsername} a accepté votre demande d'abonnement`, dedupe: true,
  });
  return true;
}

/** Quand un compte redevient public, toutes les demandes en attente sont acceptées. */
export async function acceptAllPending(targetId: number, targetUsername: string) {
  const pending = await query<{ requester_id: number }>('SELECT requester_id FROM follow_requests WHERE target_id = $1', [targetId]);
  for (const { requester_id } of pending) await acceptRequest(requester_id, targetId, targetUsername);
}

/** Bloquer coupe tous les liens : abonnements et demandes dans les deux sens. */
export async function blockUser(blockerId: number, blockedId: number) {
  await query('INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [blockerId, blockedId]);
  await query(
    'DELETE FROM follows WHERE (follower_id = $1 AND following_id = $2) OR (follower_id = $2 AND following_id = $1)',
    [blockerId, blockedId],
  );
  await query(
    'DELETE FROM follow_requests WHERE (requester_id = $1 AND target_id = $2) OR (requester_id = $2 AND target_id = $1)',
    [blockerId, blockedId],
  );
}
