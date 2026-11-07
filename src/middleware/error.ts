import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import { isTest } from '../config';
import { HttpError } from '../utils/http';

const TYPES: Record<number, string> = {
  400: 'bad_request', 401: 'unauthorized', 403: 'forbidden', 404: 'not_found',
  409: 'conflict', 413: 'payload_too_large', 415: 'unsupported_media_type',
  422: 'validation_error', 429: 'too_many_requests', 503: 'service_unavailable',
};

export const notFound: RequestHandler = (req, _res, next) =>
  next(new HttpError(404, `Route introuvable : ${req.method} ${req.path}`));

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let status = 500;
  let message = 'Erreur interne du serveur';
  let details: unknown;

  if (err instanceof HttpError) {
    status = err.status;
    message = err.message;
    details = err.details;
  } else if (err instanceof multer.MulterError) {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Fichier trop volumineux' : 'Envoi de fichier invalide';
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    message = 'JSON invalide';
  } else if (err?.code === '23505') {
    status = 409;
    message = 'Cette valeur existe déjà';
  } else if (!isTest) {
    console.error(err);
  }

  res.status(status).json({
    success: false,
    message,
    error: { code: status, type: TYPES[status] ?? 'error', message, ...(details ? { details } : {}) },
  });
};
