import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, auth, createMemory, follow, register, setupDb, teardownDb, type TestUser } from './helpers';

let lea: TestUser, omar: TestUser, nina: TestUser, zed: TestUser;
let conv: number;

const send = (u: TestUser, id: number, body: Record<string, unknown>) =>
  api().post(`/api/conversations/${id}/messages`).set(auth(u.token)).send(body);

beforeAll(async () => {
  await setupDb();
  [lea, omar, nina, zed] = [await register('lea'), await register('omar'), await register('nina'), await register('zed')];
});
afterAll(teardownDb);

describe('Messagerie privée', () => {
  it('exige une authentification', async () => {
    expect((await api().get('/api/conversations')).status).toBe(401);
    expect((await api().post('/api/conversations').send({ user_id: omar.id })).status).toBe(401);
  });

  it('ouvre une seule conversation par paire, quel que soit le sens', async () => {
    const a = await api().post('/api/conversations').set(auth(lea.token)).send({ user_id: omar.id });
    const b = await api().post('/api/conversations').set(auth(omar.token)).send({ user_id: lea.id });
    expect(a.status).toBe(201);
    expect(b.body.data.id).toBe(a.body.data.id);
    conv = a.body.data.id;
  });

  it('refuse de s\'écrire à soi-même ou à un inconnu', async () => {
    expect((await api().post('/api/conversations').set(auth(lea.token)).send({ user_id: lea.id })).status).toBe(400);
    expect((await api().post('/api/conversations').set(auth(lea.token)).send({ user_id: 99999 })).status).toBe(404);
  });

  it('envoie et valide les messages', async () => {
    expect((await send(lea, conv, {})).status).toBe(422);
    expect((await send(lea, conv, { body: '   ' })).status).toBe(422);
    expect((await send(lea, conv, { body: 'x'.repeat(2001) })).status).toBe(422);
    const res = await send(lea, conv, { body: 'Salut Omar ! Tu as aimé Lisbonne ?' });
    expect(res.status).toBe(201);
    expect(res.body.data.is_mine).toBe(true);
    await send(lea, conv, { body: 'Dis-moi quand tu veux.' });
  });

  it('cache la conversation vide, puis la montre avec le non-lu et une seule notification', async () => {
    const empty = await api().post('/api/conversations').set(auth(nina.token)).send({ user_id: zed.id });
    expect(empty.status).toBe(201);
    expect((await api().get('/api/conversations').set(auth(zed.token))).body.data).toHaveLength(0);

    const list = await api().get('/api/conversations').set(auth(omar.token));
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].user.username).toBe('lea');
    expect(list.body.data[0].unread_count).toBe(2);
    expect(list.body.data[0].last_message.preview).toBe('Dis-moi quand tu veux.');
    expect((await api().get('/api/conversations/unread/count').set(auth(omar.token))).body.data.count).toBe(2);

    const notifs = await api().get('/api/notifications').set(auth(omar.token));
    expect(notifs.body.data.filter((n: any) => n.type === 'message')).toHaveLength(1);
    // La notification ne contient jamais le texte du message.
    expect(JSON.stringify(notifs.body.data)).not.toContain('Lisbonne');
  });

  it('ne laisse lire une conversation qu\'à ses deux membres', async () => {
    expect((await api().get(`/api/conversations/${conv}/messages`).set(auth(nina.token))).status).toBe(404);
    expect((await send(nina, conv, { body: 'Je m\'incruste' })).status).toBe(404);
    expect((await api().put(`/api/conversations/${conv}/read`).set(auth(nina.token))).status).toBe(404);
  });

  it('lit les messages dans l\'ordre et marque comme lu', async () => {
    const res = await api().get(`/api/conversations/${conv}/messages`).set(auth(omar.token));
    expect(res.body.data.map((m: any) => m.body)).toEqual(['Salut Omar ! Tu as aimé Lisbonne ?', 'Dis-moi quand tu veux.']);
    expect(res.body.data[0].is_mine).toBe(false);

    const read = await api().put(`/api/conversations/${conv}/read`).set(auth(omar.token));
    expect(read.body.data.count).toBe(0);
    const notifs = await api().get('/api/notifications/unread/count').set(auth(omar.token));
    expect(notifs.body.data.count).toBe(0);
    // Côté Léa, ses messages sont désormais « lus ».
    const mine = await api().get(`/api/conversations/${conv}/messages`).set(auth(lea.token));
    expect(mine.body.data[0].read_at).not.toBeNull();
  });

  it('pagine par curseur', async () => {
    for (let i = 0; i < 4; i++) await send(omar, conv, { body: `Réponse ${i}` });
    const first = await api().get(`/api/conversations/${conv}/messages?limit=3`).set(auth(lea.token));
    expect(first.body.data).toHaveLength(3);
    expect(first.body.has_more).toBe(true);
    const older = await api().get(`/api/conversations/${conv}/messages?limit=3&before=${first.body.data[0].id}`).set(auth(lea.token));
    expect(older.body.data.every((m: any) => m.id < first.body.data[0].id)).toBe(true);
  });

  it('supprime uniquement ses propres messages', async () => {
    const msgs = (await api().get(`/api/conversations/${conv}/messages`).set(auth(lea.token))).body.data;
    const theirs = msgs.find((m: any) => !m.is_mine);
    const mine = msgs.find((m: any) => m.is_mine);
    expect((await api().delete(`/api/conversations/${conv}/messages/${theirs.id}`).set(auth(lea.token))).status).toBe(404);
    expect((await api().delete(`/api/conversations/${conv}/messages/${mine.id}`).set(auth(lea.token))).status).toBe(200);
    const after = (await api().get(`/api/conversations/${conv}/messages`).set(auth(omar.token))).body.data.find((m: any) => m.id === mine.id);
    expect(after.deleted).toBe(true);
    expect(after.body).toBeNull();
  });
});

describe('Comptes privés et blocage', () => {
  it('limite les messages vers un compte privé aux personnes liées par un abonnement', async () => {
    await api().put('/api/users/me').set(auth(zed.token)).send({ is_private: true });
    const refused = await api().post('/api/conversations').set(auth(nina.token)).send({ user_id: zed.id });
    expect(refused.status).toBe(403);
    await follow(zed, nina); // zed suit nina : lien dans un sens → autorisé
    expect((await api().post('/api/conversations').set(auth(nina.token)).send({ user_id: zed.id })).status).toBe(201);
  });

  it('bloque les messages et masque la conversation après un blocage', async () => {
    await api().post(`/api/blocks/${omar.id}`).set(auth(lea.token));
    expect((await send(lea, conv, { body: 'Encore là ?' })).status).toBe(404);
    expect((await send(omar, conv, { body: 'Hello ?' })).status).toBe(404);
    expect((await api().post('/api/conversations').set(auth(omar.token)).send({ user_id: lea.id })).status).toBe(403);
    expect((await api().get('/api/conversations').set(auth(lea.token))).body.data).toHaveLength(0);
    expect((await api().get('/api/conversations').set(auth(omar.token))).body.data).toHaveLength(0);
    await api().delete(`/api/blocks/${omar.id}`).set(auth(lea.token));
    expect((await send(lea, conv, { body: 'On se parle à nouveau' })).status).toBe(201);
  });
});

describe('Partage d\'un souvenir', () => {
  let m: { id: number }, priv: { id: number }, followersOnly: { id: number };
  beforeAll(async () => {
    m = await createMemory(lea, { title: 'Ruelles de Fès au matin' });
    priv = await createMemory(lea, { title: 'Journal intime à Fès', visibility: 'private' });
    followersOnly = await createMemory(lea, { title: 'Pour mes abonnés seulement', visibility: 'followers' });
  });

  it('partage un souvenir dans une conversation, avec un aperçu', async () => {
    const res = await send(lea, conv, { memory_id: m.id });
    expect(res.status).toBe(201);
    expect(res.body.data.memory.title).toBe('Ruelles de Fès au matin');
    const list = await api().get('/api/conversations').set(auth(omar.token));
    expect(list.body.data[0].last_message.preview).toBe('Souvenir partagé');
  });

  it('refuse de partager un souvenir privé ou inexistant', async () => {
    expect((await send(lea, conv, { memory_id: priv.id })).status).toBe(403);
    expect((await send(lea, conv, { memory_id: 99999 })).status).toBe(404);
    // Quelqu'un d'autre ne peut pas partager le souvenir privé de Léa.
    expect((await send(omar, conv, { memory_id: priv.id })).status).toBe(404);
  });

  it('ne donne pas accès à un souvenir « abonnés » en le partageant', async () => {
    expect((await send(lea, conv, { memory_id: followersOnly.id })).status).toBe(201);
    const msgs = (await api().get(`/api/conversations/${conv}/messages`).set(auth(omar.token))).body.data;
    expect(msgs[msgs.length - 1].memory).toEqual({ unavailable: true });
    // Dès qu'Omar suit Léa, l'aperçu apparaît.
    await follow(omar, lea);
    const after = (await api().get(`/api/conversations/${conv}/messages`).set(auth(omar.token))).body.data;
    expect(after[after.length - 1].memory.title).toBe('Pour mes abonnés seulement');
  });

  it('partage à plusieurs amis et signale les échecs sans tout bloquer', async () => {
    await api().post(`/api/blocks/${nina.id}`).set(auth(lea.token));
    const res = await api().post(`/api/memories/${m.id}/share`).set(auth(lea.token)).send({ user_ids: [omar.id, nina.id], body: 'Regarde !' });
    expect(res.status).toBe(200);
    expect(res.body.data.sent).toEqual([omar.id]);
    expect(res.body.data.failed.map((f: any) => f.user_id)).toEqual([nina.id]);
    expect(res.body.data.share_url).toContain(`/memory/${m.id}`);
    expect((await api().post(`/api/memories/${priv.id}/share`).set(auth(lea.token)).send({ user_ids: [omar.id] })).status).toBe(403);
    expect((await api().post(`/api/memories/${m.id}/share`).set(auth(lea.token)).send({ user_ids: [] })).status).toBe(422);
  });

  it('affiche « souvenir indisponible » si le souvenir est supprimé', async () => {
    await api().delete(`/api/memories/${m.id}`).set(auth(lea.token));
    const msgs = (await api().get(`/api/conversations/${conv}/messages`).set(auth(omar.token))).body.data;
    expect(msgs.filter((x: any) => x.memory && x.memory.unavailable).length).toBeGreaterThanOrEqual(1);
  });
});
