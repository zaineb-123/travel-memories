import bcrypt from 'bcryptjs';
import { config } from '../config';
import { closeDb, migrate, one, query } from '../db';

/** Données de démonstration. Usage : npm run seed  (ADMIN_EMAIL / ADMIN_PASSWORD configurables) */
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@travelmemories.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin12345';

const trips = [
  ['Coucher de soleil à Santorin', 'Les falaises blanches d’Oia baignées de lumière dorée, un moment suspendu.', 'Grèce', 'Oia', 36.4618, 25.3753, ['plage', 'coucher-de-soleil']],
  ['Perdu dans la médina de Fès', 'Un labyrinthe de ruelles, d’épices et de tanneries à ciel ouvert.', 'Maroc', 'Fès', 34.0331, -5.0003, ['culture', 'marché']],
  ['Cerisiers en fleurs à Kyoto', 'Hanami au bord de la rivière Kamo, thé matcha et pétales roses.', 'Japon', 'Kyoto', 35.0116, 135.7681, ['printemps', 'culture']],
  ['Randonnée au Machu Picchu', 'Quatre jours de Chemin de l’Inca pour atteindre la cité perdue.', 'Pérou', 'Cusco', -13.1631, -72.545, ['randonnée', 'montagne']],
  ['Sahara : nuit sous les étoiles', 'Dunes de Merzouga, feu de camp et un ciel immense.', 'Tunisie', 'Douz', 33.4565, 9.0214, ['désert', 'étoiles']],
] as const;

async function main() {
  await migrate();
  if (await one('SELECT 1 FROM users WHERE lower(email) = lower($1)', [ADMIN_EMAIL])) {
    console.log('Données déjà présentes, rien à faire.');
    return;
  }
  const hash = await bcrypt.hash(ADMIN_PASSWORD, config.BCRYPT_ROUNDS);
  const mk = async (username: string, name: string, role = 'user') =>
    (await one<{ id: number }>(
      `INSERT INTO users (username, email, password_hash, full_name, role, email_verified, country)
       VALUES ($1, $2, $3, $4, $5, TRUE, 'France') RETURNING id`,
      [username, `${username}@travelmemories.local`, hash, name, role],
    ))!.id;

  const adminId = await mk('admin', 'Administrateur', 'admin');
  await query('UPDATE users SET email = $1 WHERE id = $2', [ADMIN_EMAIL, adminId]);
  const users = [await mk('sarah', 'Sarah Johnson'), await mk('mike', 'Michael Chen'), await mk('emma', 'Emma Dubois')];

  for (const [i, [title, description, country, city, lat, lng, tags]] of trips.entries()) {
    const owner = users[i % users.length];
    const m = (await one<{ id: number }>(
      `INSERT INTO memories (user_id, title, description, country, city, latitude, longitude, travel_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7, current_date - ($8 * interval '40 days')) RETURNING id`,
      [owner, title, description, country, city, lat, lng, i + 1],
    ))!.id;
    for (const name of tags) {
      const t = (await one<{ id: number }>(
        'INSERT INTO tags (name, slug) VALUES ($1,$1) ON CONFLICT (slug) DO UPDATE SET name = tags.name RETURNING id', [name],
      ))!.id;
      await query('INSERT INTO memory_tags VALUES ($1,$2)', [m, t]);
    }
    for (const u of users.filter((x) => x !== owner)) await query('INSERT INTO likes (user_id, memory_id) VALUES ($1,$2)', [u, m]);
  }
  await query('INSERT INTO follows VALUES ($1,$2),($2,$1),($3,$1)', [users[0], users[1], users[2]]);
  console.log(`✔ Données de démo créées. Admin : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(closeDb);
