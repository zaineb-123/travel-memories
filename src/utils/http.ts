import type { NextFunction, Request, RequestHandler, Response } from 'express';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Transmet automatiquement les erreurs async au gestionnaire d'erreurs. */
export const asyncHandler =
  (fn: AsyncFn): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export function ok(res: Response, data?: unknown, extra: Record<string, unknown> = {}, status = 200) {
  return res.status(status).json({ success: true, ...(data !== undefined ? { data } : {}), ...extra });
}

export function getPage(req: Request, defaultLimit = 12, maxLimit = 50) {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(String(req.query.limit ?? defaultLimit), 10) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
}

export function paginationOf(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), hasMore: page * limit < total };
}

/** Convertit un paramètre de route en entier positif, sinon 404. */
export function intParam(value: string | undefined, label = 'Ressource'): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(404, `${label} introuvable`);
  return n;
}

/** Échappe les caractères spéciaux d'un motif ILIKE. */
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
