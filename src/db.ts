import fs from 'node:fs';
import path from 'node:path';
import { Pool, types } from 'pg';
import { config } from './config';

// DATE (oid 1082) -> chaîne "YYYY-MM-DD" (évite les décalages de fuseau horaire)
types.setTypeParser(1082, (v) => v);

export interface DB {
  query(text: string, params?: unknown[]): Promise<{ rows: any[] }>;
  exec?(text: string): Promise<unknown>;
}

let client: DB | null = null;

/** Permet d'injecter une autre base (ex : PGlite pour les tests). */
export function setDb(c: DB) {
  client = c;
}

export function getDb(): DB {
  if (!client) {
    client = new Pool({ connectionString: config.DATABASE_URL, max: 10 }) as unknown as DB;
  }
  return client;
}

export async function query<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await getDb().query(text, params);
  return res.rows as T[];
}

export async function one<T = any>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Applique les fichiers migrations/*.sql dans l'ordre, une seule fois chacun. */
export async function migrate(db: DB = getDb()) {
  const run = async (sql: string) => (db.exec ? db.exec(sql) : db.query(sql));
  await run(`CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);

  // src/ en dev (tsx), dist/src/ une fois compilé : on remonte jusqu'à trouver migrations/.
  const dir = [path.resolve(__dirname, '..', 'migrations'), path.resolve(__dirname, '..', '..', 'migrations')].find((d) =>
    fs.existsSync(d),
  );
  if (!dir) throw new Error('Dossier migrations/ introuvable');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const done = new Set((await db.query('SELECT name FROM schema_migrations')).rows.map((r: any) => r.name));

  for (const file of files) {
    if (done.has(file)) continue;
    await run(fs.readFileSync(path.join(dir, file), 'utf8'));
    await db.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    console.log(`✔ migration appliquée : ${file}`);
  }
}

export async function closeDb() {
  const c = client as any;
  if (c?.end) await c.end();
  else if (c?.close) await c.close();
  client = null;
}
