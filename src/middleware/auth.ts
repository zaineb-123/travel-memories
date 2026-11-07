import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { one } from '../db';
import { asyncHandler, HttpError } from '../utils/http';

export type Role = 'user' | 'admin' | 'moderator';

export interface AuthUser {
  id: number;
  username: string;
  role: Role;
  status: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

async function resolveUser(req: Request): Promise<AuthUser | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(header.slice(7), config.JWT_SECRET) as jwt.JwtPayload;
    // Relu en base à chaque requête : un bannissement ou un changement de rôle est immédiat.
    return await one<AuthUser>('SELECT id, username, role, status FROM users WHERE id = $1', [Number(payload.sub)]);
  } catch {
    return null;
  }
}

export const authenticate = asyncHandler(async (req, _res, next) => {
  const user = await resolveUser(req);
  if (!user) throw new HttpError(401, 'Authentification requise');
  if (user.status === 'banned') throw new HttpError(403, 'Votre compte a été suspendu');
  req.user = user;
  next();
});

export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const user = await resolveUser(req);
  if (user && user.status !== 'banned') req.user = user;
  next();
});

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return next(new HttpError(403, 'Accès refusé'));
    next();
  };

export const isStaff = (u?: AuthUser) => !!u && (u.role === 'admin' || u.role === 'moderator');
