import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config';
import { one, query } from '../db';
import { authenticate, signToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logActivity } from '../services/activity';
import { sendMail } from '../services/mailer';
import { getUserById } from '../services/queries';
import { getSettings } from '../services/settings';
import { asyncHandler, HttpError, ok } from '../utils/http';

const router = Router();

const password = z
  .string()
  .min(8, 'Mot de passe trop court (min 8 caractères)')
  .max(128)
  .regex(/[A-Z]/, 'Au moins une lettre majuscule requise')
  .regex(/[0-9]/, 'Au moins un chiffre requis');

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username trop court (min 3 caractères)')
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username : lettres, chiffres et underscore uniquement'),
  email: z.string().email('Email invalide').max(255).transform((e) => e.toLowerCase().trim()),
  password,
  full_name: z.string().trim().min(2, 'Nom trop court').max(100),
});

const loginSchema = z.object({
  email: z.string().email('Email invalide').transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1).max(128),
});

// Hash factice : on compare toujours, pour ne pas révéler par le temps de réponse si l'email existe.
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 4);

router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const settings = await getSettings();
    if (!settings.enable_registrations) throw new HttpError(403, 'Les inscriptions sont temporairement fermées');

    const { username, email, password: pwd, full_name } = req.body;
    const taken = await one(
      'SELECT username, email FROM users WHERE lower(username) = lower($1) OR lower(email) = $2',
      [username, email],
    );
    if (taken) {
      const field = taken.email === email ? 'Cet email' : "Ce nom d'utilisateur";
      throw new HttpError(409, `${field} est déjà utilisé`);
    }

    const hash = await bcrypt.hash(pwd, config.BCRYPT_ROUNDS);
    const created = await one<{ id: number }>(
      `INSERT INTO users (username, email, password_hash, full_name, last_login)
       VALUES ($1, $2, $3, $4, now()) RETURNING id`,
      [username, email, hash, full_name],
    );
    const user = await getUserById(created!.id, true);
    return ok(res, { user, token: signToken(created!.id) }, { message: 'Compte créé avec succès' }, 201);
  }),
);

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const row = await one<{ id: number; password_hash: string; status: string }>(
      'SELECT id, password_hash, status FROM users WHERE lower(email) = $1',
      [req.body.email],
    );
    const valid = await bcrypt.compare(req.body.password, row?.password_hash ?? DUMMY_HASH);
    if (!row || !valid) throw new HttpError(401, 'Email ou mot de passe incorrect');
    if (row.status === 'banned') throw new HttpError(403, 'Votre compte a été suspendu');

    await query('UPDATE users SET last_login = now() WHERE id = $1', [row.id]);
    const user = await getUserById(row.id, true);
    return ok(res, { user, token: signToken(row.id) }, { message: 'Connexion réussie' });
  }),
);

router.post(
  '/forgot-password',
  validate(z.object({ email: z.string().email().transform((e) => e.toLowerCase().trim()) })),
  asyncHandler(async (req, res) => {
    const user = await one<{ id: number; email: string }>('SELECT id, email FROM users WHERE lower(email) = $1', [req.body.email]);
    if (user) {
      const token = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      await query(
        `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '1 hour')`,
        [user.id, tokenHash],
      );
      await sendMail(
        user.email,
        'Réinitialisation de votre mot de passe',
        `Cliquez pour choisir un nouveau mot de passe (valable 1 heure) :\n${config.FRONTEND_URL}/reset-password?token=${token}`,
      );
    }
    // Réponse identique que l'email existe ou non (anti-énumération de comptes).
    return ok(res, undefined, { message: 'Si ce compte existe, un email de réinitialisation a été envoyé' });
  }),
);

router.post(
  '/reset-password',
  validate(z.object({ token: z.string().min(10).max(200), password })),
  asyncHandler(async (req, res) => {
    const tokenHash = createHash('sha256').update(req.body.token).digest('hex');
    const reset = await one<{ id: number; user_id: number }>(
      'SELECT id, user_id FROM password_resets WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()',
      [tokenHash],
    );
    if (!reset) throw new HttpError(400, 'Lien invalide ou expiré');

    const hash = await bcrypt.hash(req.body.password, config.BCRYPT_ROUNDS);
    await query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [hash, reset.user_id]);
    await query('UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [reset.user_id]);
    return ok(res, undefined, { message: 'Mot de passe mis à jour' });
  }),
);

router.post(
  '/change-password',
  authenticate,
  validate(z.object({ current_password: z.string().min(1).max(128), new_password: password })),
  asyncHandler(async (req, res) => {
    const row = await one<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [req.user!.id]);
    if (!(await bcrypt.compare(req.body.current_password, row!.password_hash))) {
      throw new HttpError(400, 'Mot de passe actuel incorrect');
    }
    const hash = await bcrypt.hash(req.body.new_password, config.BCRYPT_ROUNDS);
    await query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [hash, req.user!.id]);
    await logActivity(req, 'change_password', 'user', req.user!.id);
    return ok(res, undefined, { message: 'Mot de passe modifié' });
  }),
);

export default router;
