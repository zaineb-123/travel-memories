import fs from 'node:fs';
import { createApp } from './app';
import { config } from './config';
import { closeDb, migrate } from './db';
import { purgeExpiredStories } from './routes/stories';
import { uploadRoot } from './utils/files';

async function main() {
  fs.mkdirSync(uploadRoot, { recursive: true });
  if (config.AUTO_MIGRATE) await migrate();

  const server = createApp().listen(config.PORT, () => {
    console.log(`🌍 Travel Memories API → http://localhost:${config.PORT}/api  (${config.NODE_ENV})`);
  });

  // Nettoyage horaire des stories expirées (elles sont de toute façon invisibles dès l'expiration).
  const purge = setInterval(() => purgeExpiredStories().catch((e) => console.error('Purge des stories :', e)), 60 * 60 * 1000);
  purge.unref();

  const stop = async () => {
    clearInterval(purge);
    server.close(async () => {
      await closeDb();
      process.exit(0);
    });
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((err) => {
  console.error('Démarrage impossible :', err);
  process.exit(1);
});
