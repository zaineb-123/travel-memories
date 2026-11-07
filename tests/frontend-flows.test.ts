import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PNG, api, auth, createMemory, follow, register, setupDb, teardownDb, type TestUser } from './helpers';

/** Reproduit les appels exacts du frontend : création avec photos, fil, profil, carte. */
describe('parcours du frontend', () => {
  let alice: TestUser;
  let bob: TestUser;

  beforeAll(async () => {
    await setupDb();
    alice = await register('alice_fe');
    bob = await register('bob_fe');
  });
  afterAll(teardownDb);

  it('crée un souvenir puis envoie plusieurs photos (photos[]) : la couverture apparaît dans le fil', async () => {
    const m = await createMemory(alice, { title: 'Djerba avec photos', tags: ['plage', 'djerba'] });
    const up = await api()
      .post(`/api/memories/${m.id}/photos/multiple`)
      .set(auth(alice.token))
      .attach('photos[]', PNG, { filename: 'a.png', contentType: 'image/png' })
      .attach('photos[]', PNG, { filename: 'b.png', contentType: 'image/png' });
    expect(up.status).toBe(201);
    expect(up.body.data.images_urls).toHaveLength(2);

    const feed = await api().get('/api/memories?page=1&limit=10').set(auth(bob.token));
    const item = feed.body.data.memories.find((x: any) => x.id === m.id);
    expect(item.cover_image).toMatch(/^http/);
    expect(item.photos).toHaveLength(2);
    expect(item.tags.map((t: any) => t.slug)).toContain('plage');
  });

  it('le profil affiche aussi les souvenirs privés et « abonnés » de son propriétaire (avec jeton), pas des autres', async () => {
    await createMemory(alice, { title: 'Souvenir prive', visibility: 'private' });
    await createMemory(alice, { title: 'Souvenir abonnes', visibility: 'followers' });

    const own = await api().get('/api/memories/user/alice_fe').set(auth(alice.token));
    const ownTitles = own.body.data.map((m: any) => m.title);
    expect(ownTitles).toEqual(expect.arrayContaining(['Souvenir prive', 'Souvenir abonnes', 'Djerba avec photos']));

    const guest = await api().get('/api/memories/user/alice_fe');
    const guestTitles = guest.body.data.map((m: any) => m.title);
    expect(guestTitles).toContain('Djerba avec photos');
    expect(guestTitles).not.toContain('Souvenir prive');
    expect(guestTitles).not.toContain('Souvenir abonnes');

    await follow(bob, alice);
    const asFollower = await api().get('/api/memories/user/alice_fe').set(auth(bob.token));
    const followerTitles = asFollower.body.data.map((m: any) => m.title);
    expect(followerTitles).toContain('Souvenir abonnes');
    expect(followerTitles).not.toContain('Souvenir prive');
  });

  it('la carte : un visiteur voit les souvenirs publics géolocalisés, un membre voit aussi les siens', async () => {
    await createMemory(bob, { title: 'Carte privee de bob', visibility: 'private' });
    const guest = await api().get('/api/memories?has_location=true&limit=50');
    expect(guest.body.data.memories.length).toBeGreaterThan(0);
    expect(guest.body.data.memories.every((m: any) => m.visibility === 'public')).toBe(true);

    const member = await api().get('/api/memories?has_location=true&limit=50').set(auth(bob.token));
    const mine = member.body.data.memories.filter((m: any) => m.user_id === bob.id);
    expect(mine.map((m: any) => m.title)).toContain('Carte privee de bob');
    expect(member.body.data.memories.some((m: any) => m.user_id !== bob.id)).toBe(true);
  });

  it("l'onglet Abonnements du fil ne montre que les personnes suivies", async () => {
    const res = await api().get('/api/memories?feed=following').set(auth(bob.token));
    expect(res.status).toBe(200);
    expect(res.body.data.memories.every((m: any) => m.user_id === alice.id)).toBe(true);
  });

  it('une erreur de validation renvoie un message exploitable par le frontend', async () => {
    const res = await api().post('/api/memories').set(auth(alice.token)).send({ title: 'ab' });
    expect(res.status).toBe(422);
    expect(typeof res.body.message).toBe('string');
  });
});
