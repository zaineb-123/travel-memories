import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import request from 'supertest';
import { expect } from 'vitest';
import { createApp } from '../src/app';
import { closeDb, migrate, query, setDb } from '../src/db';
import { uploadRoot } from '../src/utils/files';

export const app = createApp();
export const api = () => request(app);

// PNG 1x1 valide
export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

export const pw = 'Password1';
export const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

export interface TestUser { token: string; id: number; username: string }

export async function register(username: string): Promise<TestUser> {
  const res = await api().post('/api/auth/register').send({
    username, email: `${username}@test.com`, password: pw, full_name: `User ${username}`,
  });
  expect(res.status).toBe(201);
  return { token: res.body.data.token, id: res.body.data.user.id, username };
}

export const memoryBody = (over: Record<string, unknown> = {}) => ({
  title: 'Coucher de soleil à Santorin',
  description: 'Une soirée inoubliable sur les falaises de Oia.',
  country: 'Grèce', city: 'Oia', travel_date: '2025-07-14',
  latitude: 36.46, longitude: 25.37, ...over,
});

export async function createMemory(user: TestUser, over: Record<string, unknown> = {}) {
  const res = await api().post('/api/memories').set(auth(user.token)).send(memoryBody(over));
  expect(res.status).toBe(201);
  return res.body.data as { id: number; title: string };
}

export async function setupDb() {
  const pg = new PGlite();
  setDb(pg as any);
  await migrate(pg as any);
}

export async function teardownDb() {
  await closeDb();
  fs.rmSync(uploadRoot, { recursive: true, force: true });
}

export const follow = (a: TestUser, b: TestUser) => api().post(`/api/users/${b.id}/follow`).set(auth(a.token));
export { query };
