import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { purgeExpiredStories } from '../src/routes/stories';
import { PNG, api, auth, createMemory, follow, query, register, setupDb, teardownDb, type TestUser } from './helpers';

let ana: TestUser, ben: TestUser, cleo: TestUser, dan: TestUser;

const post = (u: TestUser, fields: Record<string, string> = {}, withImage = true) => {
  let r = api().post('/api/stories').set(auth(u.token));
  for (const [k, v] of Object.entries(fields)) r = r.field(k, v);
  return withImage ? r.attach('image', PNG, { filename: 's.png', contentType: 'image/png' }) : r;
};
const feed = (u: TestUser) => api().get('/api/stories').set(auth(u.token));

beforeAll(async () => {
  await setupDb();
  [ana, ben, cleo, dan] = [await register('ana'), await register('ben'), await register('cleo'), await register('dan')];
  await follow(ben, ana);
});
afterAll(teardownDb);

describe('Stories de voyage', () => {
  let followersStory: number, publicStory: number;

  it('exige une authentification, une photo et des coordonnées cohérentes', async () => {
    expect((await api().post('/api/stories')).status).toBe(401);
    expect((await post(ana, {}, false)).status).toBe(400);
    expect((await post(ana, { latitude: '36.4' })).status).toBe(422);
    expect((await post(ana, { latitude: '95', longitude: '10' })).status).toBe(422);
    expect((await post(ana, { caption: 'x'.repeat(201) })).status).toBe(422);
  });

  it('publie une story (abonnés par défaut) valable 24 h', async () => {
    const res = await post(ana, { caption: 'Médina de Fès', country: 'Maroc', latitude: '34.06', longitude: '-4.97', location_name: 'Fès' });
    expect(res.status).toBe(201);
    expect(res.body.data.visibility).toBe('followers');
    const hours = (new Date(res.body.data.expires_at).getTime() - Date.now()) / 3600e3;
    expect(hours).toBeGreaterThan(23);
    expect(hours).toBeLessThanOrEqual(24);
    followersStory = res.body.data.id;
    publicStory = (await post(ana, { visibility: 'public', latitude: '38.7', longitude: '-9.14' })).body.data.id;
  });

  it('montre les stories aux abonnés seulement, regroupées par auteur', async () => {
    const mine = (await feed(ana)).body.data;
    expect(mine[0].user.username).toBe('ana');
    expect(mine[0].stories).toHaveLength(2);

    const bens = (await feed(ben)).body.data;
    expect(bens).toHaveLength(1);
    expect(bens[0].has_unseen).toBe(true);

    expect((await feed(cleo)).body.data).toHaveLength(0);
    expect((await api().get('/api/stories/user/ana').set(auth(cleo.token))).body.data.map((s: any) => s.id)).toEqual([publicStory]);
    // Un visiteur anonyme ne voit que le public.
    expect((await api().get('/api/stories/user/ana')).body.data.map((s: any) => s.id)).toEqual([publicStory]);
  });

  it('enregistre les vues une seule fois et les réserve à l\'auteur', async () => {
    expect((await api().post(`/api/stories/${followersStory}/view`).set(auth(cleo.token))).status).toBe(404);
    expect((await api().post(`/api/stories/${followersStory}/view`).set(auth(ben.token))).status).toBe(200);
    await api().post(`/api/stories/${followersStory}/view`).set(auth(ben.token));
    await api().post(`/api/stories/${followersStory}/view`).set(auth(ana.token)); // l'auteur ne compte pas

    const viewers = await api().get(`/api/stories/${followersStory}/viewers`).set(auth(ana.token));
    expect(viewers.body.data.map((v: any) => v.username)).toEqual(['ben']);
    expect((await api().get(`/api/stories/${followersStory}/viewers`).set(auth(ben.token))).status).toBe(404);

    const bens = (await feed(ben)).body.data[0];
    expect(bens.stories.find((s: any) => s.id === followersStory).seen).toBe(true);
    expect(bens.has_unseen).toBe(true); // la seconde story n'est pas vue
    const own = (await feed(ana)).body.data[0].stories.find((s: any) => s.id === followersStory);
    expect(own.views_count).toBe(1);
  });

  it('expose les stories géolocalisées sur la carte selon la visibilité', async () => {
    expect((await api().get('/api/stories/map').set(auth(ben.token))).body.data).toHaveLength(2);
    expect((await api().get('/api/stories/map').set(auth(cleo.token))).body.data.map((s: any) => s.id)).toEqual([publicStory]);
    expect((await api().get('/api/stories/map')).body.data.map((s: any) => s.id)).toEqual([publicStory]);
  });

  it('cache tout pour un compte privé non suivi et en cas de blocage', async () => {
    await api().put('/api/users/me').set(auth(ana.token)).send({ is_private: true });
    expect((await api().get('/api/stories/user/ana').set(auth(cleo.token))).body.data).toHaveLength(0);
    expect((await api().get('/api/stories/map')).body.data).toHaveLength(0);
    await api().put('/api/users/me').set(auth(ana.token)).send({ is_private: false });

    await api().post(`/api/blocks/${ben.id}`).set(auth(ana.token));
    expect((await feed(ben)).body.data).toHaveLength(0);
    expect((await api().post(`/api/stories/${followersStory}/view`).set(auth(ben.token))).status).toBe(404);
    await api().delete(`/api/blocks/${ben.id}`).set(auth(ana.token));
  });

  it('n\'affiche plus une story expirée et la purge', async () => {
    const id = (await post(ana, { visibility: 'public' })).body.data.id;
    await query(`UPDATE stories SET expires_at = now() - interval '1 minute' WHERE id = $1`, [id]);
    expect((await api().get('/api/stories/user/ana').set(auth(cleo.token))).body.data.map((s: any) => s.id)).not.toContain(id);
    expect((await api().post(`/api/stories/${id}/view`).set(auth(ben.token))).status).toBe(404);
    expect(await purgeExpiredStories()).toBe(1);
    expect(await query('SELECT 1 FROM stories WHERE id = $1', [id])).toHaveLength(0);
  });

  it('limite le nombre de stories actives', async () => {
    await query(
      `INSERT INTO stories (user_id, image_url, file_name) SELECT $1, '/x.png', 'x.png' FROM generate_series(1, 18)`,
      [dan.id],
    );
    expect((await post(dan)).status).toBe(201); // 19e
    expect((await post(dan)).status).toBe(201); // 20e
    expect((await post(dan)).status).toBe(429);
  });

  it('supprime seulement ses propres stories', async () => {
    expect((await api().delete(`/api/stories/${followersStory}`).set(auth(ben.token))).status).toBe(403);
    expect((await api().delete(`/api/stories/${followersStory}`).set(auth(ana.token))).status).toBe(200);
    expect((await api().delete(`/api/stories/${followersStory}`).set(auth(ana.token))).status).toBe(404);
  });
});

describe('Identifier un voyageur (@mentions)', () => {
  let eva: TestUser, finn: TestUser, gus: TestUser;
  const mentionsOf = async (u: TestUser) =>
    (await api().get('/api/notifications').set(auth(u.token))).body.data.filter((n: any) => n.type === 'mention');

  beforeAll(async () => {
    [eva, finn, gus] = [await register('eva'), await register('finn'), await register('gus_')];
  });

  it('notifie la personne identifiée dans un souvenir et la liste dans « identifié »', async () => {
    const m = await createMemory(eva, { title: 'Road trip avec @finn', description: 'Merci @finn et @finn, et @inconnu_xyz !' });
    const notifs = await mentionsOf(finn);
    expect(notifs).toHaveLength(1);
    expect(notifs[0].reference_id).toBe(m.id);

    const tagged = await api().get('/api/users/finn/tagged').set(auth(finn.token));
    expect(tagged.body.data.map((x: any) => x.id)).toEqual([m.id]);
  });

  it('ne notifie ni soi-même, ni un e-mail, ni un brouillon', async () => {
    await createMemory(eva, { title: 'Note de @eva', description: 'contact: gus@test.com' });
    expect(await mentionsOf(eva)).toHaveLength(0);
    expect(await mentionsOf(gus)).toHaveLength(0);

    const draft = await createMemory(eva, { title: 'Brouillon pour @gus_', status: 'draft' });
    expect(await mentionsOf(gus)).toHaveLength(0);
    // À la publication, l'identification part.
    expect((await api().put(`/api/memories/${draft.id}`).set(auth(eva.token)).send({ status: 'published' })).status).toBe(200);
    expect(await mentionsOf(gus)).toHaveLength(1);
  });

  it('ne notifie pas deux fois pour une modification, et retire l\'identification supprimée', async () => {
    const m = await createMemory(eva, { title: 'Plage', description: 'Avec @finn' });
    const before = (await mentionsOf(finn)).length;
    await api().put(`/api/memories/${m.id}`).set(auth(eva.token)).send({ description: 'Toujours avec @finn' });
    expect((await mentionsOf(finn)).length).toBe(before);
    await api().put(`/api/memories/${m.id}`).set(auth(eva.token)).send({ description: 'Seule finalement' });
    const tagged = (await api().get('/api/users/finn/tagged').set(auth(finn.token))).body.data.map((x: any) => x.id);
    expect(tagged).not.toContain(m.id);
  });

  it('respecte la visibilité : privé ou bloqué, personne n\'est identifié', async () => {
    const before = (await mentionsOf(gus)).length;
    await createMemory(eva, { title: 'Secret avec @gus_', visibility: 'private' });
    await api().post(`/api/blocks/${gus.id}`).set(auth(eva.token));
    await createMemory(eva, { title: 'Public mais bloqué @gus_' });
    expect((await mentionsOf(gus)).length).toBe(before);
    await api().delete(`/api/blocks/${gus.id}`).set(auth(eva.token));
  });

  it('notifie aussi depuis un commentaire', async () => {
    const m = await createMemory(finn, { title: 'Dunes' });
    const before = (await mentionsOf(gus)).length;
    const res = await api().post(`/api/memories/${m.id}/comments`).set(auth(finn.token)).send({ content: 'Tu dois venir, @gus_ !' });
    expect(res.status).toBe(201);
    expect((await mentionsOf(gus)).length).toBe(before + 1);
    expect((await api().delete(`/api/comments/${res.body.data.id}`).set(auth(finn.token))).status).toBe(200);
  });
});
