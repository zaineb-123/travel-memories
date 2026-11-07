import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../db';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler, HttpError, ok } from '../utils/http';

const router = Router();

router.post(
  '/contact',
  validate(z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().email().max(255),
    subject: z.string().trim().min(5).max(150),
    message: z.string().trim().min(10).max(3000),
  })),
  asyncHandler(async (req, res) => {
    const { name, email, subject, message } = req.body;
    await query('INSERT INTO contact_messages (name, email, subject, message) VALUES ($1,$2,$3,$4)', [name, email, subject, message]);
    return ok(res, undefined, { message: 'Message envoyé, merci !' }, 201);
  }),
);

router.post(
  '/reports',
  authenticate,
  validate(z.object({
    target_type: z.enum(['memory', 'user', 'comment']),
    target_id: z.number().int().positive(),
    reason: z.string().trim().min(5, 'Précisez la raison (min 5 caractères)').max(1000),
  })),
  asyncHandler(async (req, res) => {
    const { target_type, target_id, reason } = req.body;
    const table = { memory: 'memories', user: 'users', comment: 'comments' }[target_type as 'memory' | 'user' | 'comment'];
    if (!(await one(`SELECT 1 FROM ${table} WHERE id = $1`, [target_id]))) throw new HttpError(404, 'Contenu introuvable');
    if (target_type === 'user' && target_id === req.user!.id) throw new HttpError(400, 'Vous ne pouvez pas vous signaler vous-même');

    const dup = await one('SELECT 1 FROM reports WHERE reporter_id=$1 AND target_type=$2 AND target_id=$3 AND status=$4', [req.user!.id, target_type, target_id, 'pending']);
    if (dup) throw new HttpError(409, 'Vous avez déjà signalé ce contenu');

    await query('INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES ($1,$2,$3,$4)', [req.user!.id, target_type, target_id, reason]);
    return ok(res, undefined, { message: 'Signalement envoyé à la modération' }, 201);
  }),
);

export default router;
