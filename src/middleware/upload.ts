import multer from 'multer';
import { config } from '../config';
import { HttpError } from '../utils/http';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// En mémoire : le contenu est vérifié (octets magiques) avant d'être écrit sur disque.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.MAX_FILE_SIZE, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) return cb(new HttpError(415, 'Format non accepté (JPEG, PNG, WebP, GIF)'));
    cb(null, true);
  },
});
