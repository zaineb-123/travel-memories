import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config';
import { HttpError } from './http';

export const uploadRoot = path.resolve(config.UPLOAD_DIR);

/** Détecte le vrai format d'après les premiers octets (ne fait pas confiance au Content-Type client). */
export function sniffImage(buf: Buffer): 'jpg' | 'png' | 'webp' | 'gif' | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  if (buf.subarray(0, 4).toString('ascii') === 'GIF8') return 'gif';
  return null;
}

export async function saveImage(buf: Buffer, folder: 'avatars' | 'memories' | 'stories') {
  const ext = sniffImage(buf);
  if (!ext) throw new HttpError(415, "Le fichier n'est pas une image valide (JPEG, PNG, WebP ou GIF)");
  const name = `${randomUUID()}.${ext}`;
  const dir = path.join(uploadRoot, folder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buf);
  return {
    fileName: `${folder}/${name}`,
    url: `${config.PUBLIC_URL}/uploads/${folder}/${name}`,
    size: buf.length,
  };
}

/** Supprime un fichier uploadé (protégé contre la traversée de chemin). */
export async function deleteFile(fileName: string | null | undefined) {
  if (!fileName) return;
  const target = path.resolve(uploadRoot, fileName);
  if (!target.startsWith(uploadRoot + path.sep)) return;
  await fs.rm(target, { force: true });
}
