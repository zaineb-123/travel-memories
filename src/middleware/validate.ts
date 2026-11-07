import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { HttpError } from '../utils/http';

/** Valide et nettoie req.body / req.query avec Zod (les champs inconnus sont retirés). */
export const validate =
  (schema: ZodTypeAny, source: 'body' | 'query' = 'body'): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.flatten().fieldErrors;
      const first = result.error.issues[0]?.message ?? 'Données invalides';
      return next(new HttpError(422, first, details));
    }
    if (source === 'body') req.body = result.data;
    else (req as any).validatedQuery = result.data;
    next();
  };
