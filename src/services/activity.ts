import type { Request } from 'express';
import { query } from '../db';

/** Journal d'audit des actions sensibles (visible dans l'admin). */
export async function logActivity(req: Request, action: string, targetType: string, targetId = 0) {
  await query(
    'INSERT INTO activity_logs (user_id, action, target_type, target_id, ip_address) VALUES ($1, $2, $3, $4, $5)',
    [req.user?.id ?? null, action, targetType, targetId, req.ip ?? ''],
  );
}
