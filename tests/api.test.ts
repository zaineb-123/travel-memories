import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, migrate, query, setDb } from '../src/db';
import { createApp } from '../src/app';
import { clearSettingsCache } from '../src/services/settings';
import { uploadRoot } from '../src/utils/files';

const app = createApp();
const api = () => request(app);

// PNG 1x1 valide
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const pw = 'Password1';
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

async function register(username: string) {
  const res = await api().post('/api/auth/register').send({
    username, email: `${username}@test.com`, password: pw, full_name: `User ${username}`,
  });
  expect(res.status).toBe(201);
  return { token: res.body.data.token as string, id: res.body.data.user.id as number };
}

const memoryBody = (over: Record<string, unknown> = {}) => ({
  title: 'Coucher de soleil à Santorin',
  description: 'Une soirée inoubliable sur les falaises de Oia.',
  country: 'Grèce', city: 'Oia', travel_date: '2025-07-14',
  latitude: 36.46, longitude: 25.37, tags: ['plage', '#Soleil'], ...over,
});

let alice: { token: string; id: number };
let bob: { token: string; id: number };
let admin: { token: string; id: number };

beforeAll(async () => {
  const pg = new PGlite();
  setDb(pg as any);
  await migrate(pg as any);
  alice = await register('alice');
  bob = await register('bob');
  admin = await register('root');
  await query(`UPDATE users SET role = 'admin' WHERE id = $1`, [admin.id]);
});

afterAll(async () => {
  await closeDb();
  fs.rmSync(uploadRoot, { recursive: true, force: true });
});

describe('Auth', () => {
  it('refuse un mot de passe faible et un doublon', async () => {
    const weak = await api().post('/api/auth/register').send({ username: 'weak', email: 'w@t.com', password: 'abc', full_name: 'Weak' });
    expect(weak.status).toBe(422);
    const dup = await api().post('/api/auth/register').send({ username: 'ALICE', email: 'x@t.com', password: pw, full_name: 'Dup' });
    expect(dup.status).toBe(409);
  });

  it('connecte avec le bon mot de passe uniquement', async () => {
    const good = await api().post('/api/auth/login').send({ email: 'alice@test.com', password: pw });
    expect(good.status).toBe(200);
    expect(good.body.data.user.email).toBe('alice@test.com');
    expect(good.body.data.user).not.toHaveProperty('password_hash');
    const bad = await api().post('/api/auth/login').send({ email: 'alice@test.com', password: 'Wrong123' });
    expect(bad.status).toBe(401);
  });

  it('protège les routes et rejette un faux token', async () => {
    expect((await api().get('/api/users/me')).status).toBe(401);
    expect((await api().get('/api/users/me').set(auth('faux.token.ici'))).status).toBe(401);
    expect((await api().get('/api/users/me').set(auth(alice.token))).status).toBe(200);
  });

  it('ne révèle pas si un email existe (mot de passe oublié)', async () => {
    const a = await api().post('/api/auth/forgot-password').send({ email: 'alice@test.com' });
    const b = await api().post('/api/auth/forgot-password').send({ email: 'inconnu@test.com' });
    expect(a.status).toBe(200);
    expect(b.body.message).toBe(a.body.message);
  });
});

describe('Profil : pas de mass-assignment', () => {
  it("ignore role/status envoyés par l'utilisateur", async () => {
    const res = await api().put('/api/users/me').set(auth(bob.token)).send({ bio: 'Voyageur', role: 'admin', status: 'active' });
    expect(res.status).toBe(200);
    expect(res.body.data.bio).toBe('Voyageur');
    expect(res.body.data.role).toBe('user');
  });
});

describe('Souvenirs', () => {
  let memoryId: number;

  it('crée un souvenir avec tags', async () => {
    const res = await api().post('/api/memories').set(auth(alice.token)).send(memoryBody());
    expect(res.status).toBe(201);
    memoryId = res.body.data.id;
    expect(res.body.data.tags.map((t: any) => t.slug).sort()).toEqual(['plage', 'soleil']);
    expect(res.body.data.user.username).toBe('alice');
  });

  it('valide les entrées', async () => {
    const res = await api().post('/api/memories').set(auth(alice.token)).send(memoryBody({ title: 'a', latitude: 200 }));
    expect(res.status).toBe(422);
  });

  it('liste avec pagination, recherche et filtres', async () => {
    const list = await api().get('/api/memories?limit=5');
    expect(list.body.data.memories).toHaveLength(1);
    expect(list.body.data.pagination).toMatchObject({ total: 1, hasMore: false });
    expect((await api().get('/api/memories?search=santorin')).body.data.memories).toHaveLength(1);
    expect((await api().get('/api/memories?search=paris')).body.data.memories).toHaveLength(0);
    expect((await api().get('/api/memories?tag=soleil')).body.data.memories).toHaveLength(1);
    expect((await api().get('/api/memories?country=grèce')).body.data.memories).toHaveLength(1);
  });

  it('résiste aux caractères spéciaux de recherche (LIKE / injection)', async () => {
    const res = await api().get("/api/memories?search=%25'; DROP TABLE memories;--");
    expect(res.status).toBe(200);
    expect(res.body.data.memories).toHaveLength(0);
    expect((await api().get('/api/memories')).body.data.memories).toHaveLength(1);
  });

  it('empêche un autre utilisateur de modifier ou supprimer', async () => {
    expect((await api().put(`/api/memories/${memoryId}`).set(auth(bob.token)).send({ title: 'Piraté !' })).status).toBe(403);
    expect((await api().delete(`/api/memories/${memoryId}`).set(auth(bob.token))).status).toBe(403);
    const ok = await api().put(`/api/memories/${memoryId}`).set(auth(alice.token)).send({ title: 'Santorin au crépuscule' });
    expect(ok.body.data.title).toBe('Santorin au crépuscule');
  });

  it('respecte la visibilité privée / abonnés', async () => {
    const priv = (await api().post('/api/memories').set(auth(alice.token)).send(memoryBody({ title: 'Journal privé', visibility: 'private' }))).body.data.id;
    const fol = (await api().post('/api/memories').set(auth(alice.token)).send(memoryBody({ title: 'Pour mes abonnés', visibility: 'followers' }))).body.data.id;

    expect((await api().get(`/api/memories/${priv}`)).status).toBe(404);
    expect((await api().get(`/api/memories/${priv}`).set(auth(bob.token))).status).toBe(404);
    expect((await api().get(`/api/memories/${priv}`).set(auth(alice.token))).status).toBe(200);

    expect((await api().get(`/api/memories/${fol}`).set(auth(bob.token))).status).toBe(404);
    await api().post(`/api/users/${alice.id}/follow`).set(auth(bob.token));
    expect((await api().get(`/api/memories/${fol}`).set(auth(bob.token))).status).toBe(200);
    expect((await api().get(`/api/memories/${fol}`)).status).toBe(404);
    await api().delete(`/api/users/${alice.id}/follow`).set(auth(bob.token));
  });

  it('compte les vues sauf pour le propriétaire', async () => {
    const before = (await api().get(`/api/memories/${memoryId}`).set(auth(alice.token))).body.data.views_count;
    const viewed = (await api().get(`/api/memories/${memoryId}`).set(auth(bob.token))).body.data.views_count;
    expect(viewed).toBe(before + 1);
  });

  it('gère likes et notifications (sans doublon)', async () => {
    const like = await api().post(`/api/memories/${memoryId}/like`).set(auth(bob.token));
    expect(like.body.data.likes_count).toBe(1);
    await api().post(`/api/memories/${memoryId}/like`).set(auth(bob.token));
    expect((await api().get(`/api/memories/${memoryId}`).set(auth(bob.token))).body.data).toMatchObject({ likes_count: 1, is_liked: true });

    const notifs = await api().get('/api/notifications').set(auth(alice.token));
    expect(notifs.body.data.filter((n: any) => n.type === 'like')).toHaveLength(1);
    expect(notifs.body.data[0].from_user.username).toBe('bob');

    const unlike = await api().delete(`/api/memories/${memoryId}/like`).set(auth(bob.token));
    expect(unlike.body.data.likes_count).toBe(0);
  });

  it('gère les commentaires et réponses (arbre)', async () => {
    const c = await api().post(`/api/memories/${memoryId}/comments`).set(auth(bob.token)).send({ content: 'Magnifique !' });
    expect(c.status).toBe(201);
    const reply = await api().post(`/api/memories/${memoryId}/comments`).set(auth(alice.token)).send({ content: 'Merci !', parent_id: c.body.data.id });
    expect(reply.status).toBe(201);

    const tree = (await api().get(`/api/memories/${memoryId}/comments`)).body.data;
    expect(tree).toHaveLength(1);
    expect(tree[0].replies).toHaveLength(1);
    expect((await api().get(`/api/memories/${memoryId}`)).body.data.comments_count).toBe(2);

    // seul l'auteur modifie ; l'auteur du souvenir peut supprimer
    expect((await api().put(`/api/comments/${c.body.data.id}`).set(auth(alice.token)).send({ content: 'x' })).status).toBe(404);
    expect((await api().delete(`/api/comments/${reply.body.data.id}`).set(auth(bob.token))).status).toBe(403);
  });

  it('upload une photo, vérifie son contenu réel et définit la couverture', async () => {
    const fake = await api().post(`/api/memories/${memoryId}/photos`).set(auth(alice.token))
      .attach('photo', Buffer.from('<?php echo 1; ?>'), { filename: 'evil.png', contentType: 'image/png' });
    expect(fake.status).toBe(415);

    const good = await api().post(`/api/memories/${memoryId}/photos`).set(auth(alice.token))
      .attach('photo', PNG, { filename: 'a.png', contentType: 'image/png' });
    expect(good.status).toBe(201);
    expect(good.body.data.is_cover).toBe(true);

    const m = (await api().get(`/api/memories/${memoryId}`)).body.data;
    expect(m.photos).toHaveLength(1);
    expect(m.cover_image).toBe(good.body.data.image_url);

    const file = good.body.data.image_url.replace('http://localhost:8000', '');
    expect((await api().get(file)).status).toBe(200);

    expect((await api().post(`/api/memories/${memoryId}/photos`).set(auth(bob.token)).attach('photo', PNG, { filename: 'a.png', contentType: 'image/png' })).status).toBe(403);
    expect((await api().delete(`/api/memories/${memoryId}/photos/${good.body.data.id}`).set(auth(alice.token))).status).toBe(200);
    expect((await api().get(file)).status).toBe(404);
  });

  it('favoris', async () => {
    await api().post(`/api/memories/${memoryId}/favorite`).set(auth(bob.token));
    expect((await api().get('/api/memories/favorites').set(auth(bob.token))).body.data.memories).toHaveLength(1);
  });
});

describe('Social & profils', () => {
  it('suit / ne suit plus, sans auto-follow', async () => {
    expect((await api().post(`/api/users/${bob.id}/follow`).set(auth(bob.token))).status).toBe(400);
    await api().post(`/api/users/${alice.id}/follow`).set(auth(bob.token));
    expect((await api().get(`/api/users/${alice.id}/is-following`).set(auth(bob.token))).body.data.is_following).toBe(true);
    const profile = await api().get('/api/users/alice').set(auth(bob.token));
    expect(profile.body.data.user.followers_count).toBe(1);
    expect(profile.body.data.user).not.toHaveProperty('email');
    expect(profile.body.data.is_following).toBe(true);
    expect((await api().get('/api/users/alice/followers')).body.data).toHaveLength(1);
  });

  it('expose des statistiques de voyageur', async () => {
    const res = await api().get('/api/stats/travel/alice');
    expect(res.body.data.total_countries).toBe(1);
    expect(res.body.data.badges.map((b: any) => b.id)).toContain('first_trip');
  });
});

describe('Modération & administration', () => {
  it('interdit /admin aux simples utilisateurs', async () => {
    expect((await api().get('/api/admin/stats').set(auth(alice.token))).status).toBe(403);
    expect((await api().get('/api/admin/stats')).status).toBe(401);
  });

  it('expose les statistiques et listes admin', async () => {
    const stats = await api().get('/api/admin/stats').set(auth(admin.token));
    expect(stats.status).toBe(200);
    expect(stats.body.data.total_users).toBe(3);
    expect(stats.body.data).toHaveProperty('growth.users');
    const users = await api().get('/api/admin/users?search=ali').set(auth(admin.token));
    expect(users.body.data.users).toHaveLength(1);
    expect(users.body.pagination.total).toBe(1);
  });

  it('signalement → action de modération → bannissement immédiat', async () => {
    const mem = (await api().post('/api/memories').set(auth(bob.token)).send(memoryBody({ title: 'Contenu abusif' }))).body.data.id;
    expect((await api().post('/api/reports').set(auth(alice.token)).send({ target_type: 'memory', target_id: mem, reason: 'Spam' })).status).toBe(422);
    const rep = await api().post('/api/reports').set(auth(alice.token)).send({ target_type: 'memory', target_id: mem, reason: 'Contenu inapproprié' });
    expect(rep.status).toBe(201);
    expect((await api().post('/api/reports').set(auth(alice.token)).send({ target_type: 'memory', target_id: mem, reason: 'Contenu inapproprié' })).status).toBe(409);

    const list = await api().get('/api/admin/reports?status=pending').set(auth(admin.token));
    expect(list.body.data.reports[0]).toMatchObject({ reporter_name: 'alice', target_title: 'Contenu abusif' });

    const act = await api().patch(`/api/admin/reports/${list.body.data.reports[0].id}`).set(auth(admin.token)).send({ status: 'resolved', action: 'ban_user' });
    expect(act.status).toBe(200);

    // le token de bob est toujours cryptographiquement valide, mais il est banni
    expect((await api().get('/api/users/me').set(auth(bob.token))).status).toBe(403);
    expect((await api().post('/api/auth/login').send({ email: 'bob@test.com', password: pw })).status).toBe(403);
    expect((await api().get(`/api/memories/${mem}`)).status).toBe(404);

    await api().post(`/api/admin/users/${bob.id}/unban`).set(auth(admin.token));
    expect((await api().get('/api/users/me').set(auth(bob.token))).status).toBe(200);
  });

  it("empêche l'admin de se rétrograder / bannir", async () => {
    expect((await api().patch(`/api/admin/users/${admin.id}/role`).set(auth(admin.token)).send({ role: 'user' })).status).toBe(400);
  });

  it('journalise les actions', async () => {
    const logs = await api().get('/api/admin/activities').set(auth(admin.token));
    expect(logs.body.data.logs.length).toBeGreaterThan(0);
    expect(logs.body.data.logs[0]).toHaveProperty('username');
  });

  it('applique les paramètres : inscriptions fermées puis maintenance', async () => {
    await api().put('/api/admin/settings').set(auth(admin.token)).send({ enable_registrations: false });
    const closed = await api().post('/api/auth/register').send({ username: 'late', email: 'late@t.com', password: pw, full_name: 'Late' });
    expect(closed.status).toBe(403);

    await api().put('/api/admin/settings').set(auth(admin.token)).send({ enable_registrations: true, maintenance_mode: true });
    expect((await api().get('/api/memories')).status).toBe(503);
    expect((await api().get('/api/admin/settings').set(auth(admin.token))).body.data.maintenance_mode).toBe(true);
    await api().put('/api/admin/settings').set(auth(admin.token)).send({ maintenance_mode: false });
    clearSettingsCache();
    expect((await api().get('/api/memories')).status).toBe(200);
  });
});

describe('Découverte', () => {
  it('renvoie destinations et tags tendance', async () => {
    const res = await api().get('/api/stats/discover');
    expect(res.status).toBe(200);
    expect(res.body.data.trending_destinations[0].country).toBe('Grèce');
    expect(res.body.data.trending_tags.length).toBeGreaterThan(0);
  });
});

describe('Divers', () => {
  it('reçoit un message de contact', async () => {
    const res = await api().post('/api/contact').send({ name: 'Zed', email: 'z@z.com', subject: 'Bonjour', message: 'Un message assez long.' });
    expect(res.status).toBe(201);
  });

  it('renvoie des erreurs JSON cohérentes', async () => {
    const res = await api().get('/api/nimportequoi');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, error: { code: 404, type: 'not_found' } });
    expect((await api().get('/api/memories/abc')).status).toBe(404);
  });

  it('supprime un souvenir avec cascade', async () => {
    const id = (await api().get('/api/memories?username=alice')).body.data.memories[0].id;
    expect((await api().delete(`/api/memories/${id}`).set(auth(alice.token))).status).toBe(200);
    const orphan = await query('SELECT count(*)::int AS n FROM comments WHERE memory_id = $1', [id]);
    expect(orphan[0].n).toBe(0);
  });
});
