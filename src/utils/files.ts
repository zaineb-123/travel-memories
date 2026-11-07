import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config';
import { HttpError } from './http';

export const uploadRoot = path.resolve(config.UPLOAD_DIR);

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
});

function isCloudinaryConfigured() {
  return Boolean(
    config.CLOUDINARY_CLOUD_NAME &&
    config.CLOUDINARY_API_KEY &&
    config.CLOUDINARY_API_SECRET
  );
}

/** Détecte le vrai format d'après les premiers octets. */
export function sniffImage(buf: Buffer): 'jpg' | 'png' | 'webp' | 'gif' | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  if (buf.subarray(0, 4).toString('ascii') === 'GIF8') return 'gif';
  return null;
}

function uploadToCloudinary(buf: Buffer, folder: string, publicId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `travel-memories/${folder}`,
        public_id: publicId,
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Échec de l’upload Cloudinary'));
          return;
        }

        resolve(result.secure_url);
      }
    );

    stream.end(buf);
  });
}

export async function saveImage(
  buf: Buffer,
  folder: 'avatars' | 'memories' | 'stories'
) {
  const ext = sniffImage(buf);

  if (!ext) {
    throw new HttpError(
      415,
      "Le fichier n'est pas une image valide (JPEG, PNG, WebP ou GIF)"
    );
  }

  const name = `${randomUUID()}.${ext}`;

  // En production : Cloudinary
  if (config.NODE_ENV === 'production') {
    if (!isCloudinaryConfigured()) {
      throw new HttpError(500, 'Le stockage Cloudinary est mal configuré');
    }

    const url = await uploadToCloudinary(buf, folder, name.replace(`.${ext}`, ''));

    return {
      fileName: `cloudinary:travel-memories/${folder}/${name.replace(`.${ext}`, '')}`,
      url,
      size: buf.length,
    };
  }

  // En local et pendant les tests : stockage local
  const dir = path.join(uploadRoot, folder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buf);

  return {
    fileName: `${folder}/${name}`,
    url: `${config.PUBLIC_URL}/uploads/${folder}/${name}`,
    size: buf.length,
  };
}

/** Supprime une image de Cloudinary ou de l'ancien stockage local. */
export async function deleteFile(fileName: string | null | undefined) {
  if (!fileName) return;

  if (fileName.startsWith('cloudinary:')) {
    const publicId = fileName.slice('cloudinary:'.length);

    if (!isCloudinaryConfigured()) return;

    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
    });

    return;
  }

  // Compatibilité avec les anciennes images stockées localement.
  const target = path.resolve(uploadRoot, fileName);

  if (!target.startsWith(uploadRoot + path.sep)) return;

  await fs.rm(target, { force: true });
}