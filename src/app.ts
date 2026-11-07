import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { config, isTest } from './config';
import { query } from './db';
import { errorHandler, notFound } from './middleware/error';
import admin from './routes/admin';
import auth from './routes/auth';
import comments from './routes/comments';
import memories from './routes/memories';
import messages from './routes/messages';
import misc from './routes/misc';
import notifications from './routes/notifications';
import social from './routes/social';
import stats from './routes/stats';
import stories from './routes/stories';
import users from './routes/users';
import { getSettings } from './services/settings';
import { uploadRoot } from './utils/files';
import { asyncHandler, HttpError } from './utils/http';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Les images doivent pouvoir être chargées depuis le frontend (autre origine).
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.CORS_ORIGIN.split(',').map((s) => s.trim()), credentials: true }));
  if (!isTest) app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '1mb' }));

  app.use('/uploads', express.static(uploadRoot, { maxAge: '7d', index: false, setHeaders: (r) => r.setHeader('X-Content-Type-Options', 'nosniff') }));

  const limiter = (windowMs: number, max: number) =>
    rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false, skip: () => isTest,
      message: { success: false, message: 'Trop de requêtes, réessayez plus tard' } });

  app.get('/health', asyncHandler(async (_req, res) => {
    await query('SELECT 1');
    res.json({ status: 'ok', uptime: process.uptime() });
  }));

  const api = express.Router();
  api.use(limiter(15 * 60 * 1000, 600));

  // Mode maintenance : tout est bloqué sauf la connexion et l'admin.
  api.use(asyncHandler(async (req, _res, next) => {
    if (req.path === '/auth/login' || req.path.startsWith('/admin')) return next();
    const s = await getSettings();
    if (s.maintenance_mode) throw new HttpError(503, s.maintenance_message);
    next();
  }));

  api.use('/auth', limiter(15 * 60 * 1000, 30), auth);
  api.use('/users', users);
  api.use('/', social);
  api.use('/memories', memories);
  api.use('/', comments);
  // Anti-spam : seules les écritures sont limitées (la liste est rafraîchie souvent).
  const writeLimiter = limiter(60 * 1000, 40);
  api.use('/conversations', (req, res, next) => (req.method === 'GET' ? next() : writeLimiter(req, res, next)), messages);
  api.use('/stories', (req, res, next) => (req.method === 'GET' ? next() : writeLimiter(req, res, next)), stories);
  api.use('/notifications', notifications);
  api.use('/stats', stats);
  api.use('/admin', admin);
  api.use('/', limiter(60 * 60 * 1000, 30), misc);

  app.use('/api', api);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
