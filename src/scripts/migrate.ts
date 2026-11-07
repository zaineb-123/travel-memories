import { closeDb, migrate } from '../db';

migrate()
  .then(() => console.log('Migrations à jour.'))
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(closeDb);
