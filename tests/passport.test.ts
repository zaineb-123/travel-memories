import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, auth, createMemory, follow, register, setupDb, teardownDb, type TestUser } from './helpers';

let ana: TestUser, ben: TestUser, cleo: TestUser;
const day = (offset: number) => new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);

beforeAll(async () => {
  await setupDb();
  [ana, ben, cleo] = [await register('ana'), await register('ben'), await register('cleo')];
  await follow(ben, ana);
});
afterAll(teardownDb);

describe('Passeport : pays colorés et tampons', () => {
  it('date le tampon au premier souvenir du pays et signale le « nouveau pays »', async () => {
    const second = await createMemory(ana, { title: 'Retour en Grèce', country: 'Grèce', travel_date: '2024-08-02' });
    const first = await createMemory(ana, { title: 'Première fois en Grèce', country: 'grèce', travel_date: '2023-06-10' });
    const maroc = await createMemory(ana, { title: 'Fès', country: 'Maroc', travel_date: day(3) });

    const flag = async (id: number) => (await api().get(`/api/memories/${id}`).set(auth(ana.token))).body.data.first_in_country;
    expect(await flag(first.id)).toBe(true);
    expect(await flag(second.id)).toBe(false);
    expect(await flag(maroc.id)).toBe(true);

    const stats = (await api().get('/api/stats/travel/ana').set(auth(ana.token))).body.data;
    const grece = stats.countries.find((c: any) => c.country.toLowerCase() === 'grèce');
    expect(grece).toMatchObject({ memories: 2, first_date: '2023-06-10', last_date: '2024-08-02' });
    expect(grece.dates).toEqual(['2023-06-10', '2024-08-02']);
    expect(stats.total_countries).toBe(2);
    expect(stats.places.length).toBeGreaterThan(0);
  });

  it('compte les souvenirs privés pour le propriétaire seulement', async () => {
    await createMemory(ana, { title: 'Secret', country: 'Japon', visibility: 'private' });
    expect((await api().get('/api/stats/travel/ana').set(auth(ana.token))).body.data.total_countries).toBe(3);
    expect((await api().get('/api/stats/travel/ana').set(auth(ben.token))).body.data.total_countries).toBe(2);
  });

  it('ne montre les tampons d’un compte privé qu’à lui-même et à ses abonnés', async () => {
    await api().put('/api/users/me').set(auth(ana.token)).send({ is_private: true });
    expect((await api().get('/api/stats/travel/ana').set(auth(cleo.token))).status).toBe(403);
    expect((await api().get('/api/stats/travel/ana')).status).toBe(403);
    expect((await api().get('/api/stats/travel/ana').set(auth(ben.token))).status).toBe(200); // ben suit ana
    expect((await api().get('/api/stats/travel/ana').set(auth(ana.token))).status).toBe(200);
    await api().put('/api/users/me').set(auth(ana.token)).send({ is_private: false });
  });

  it('liste les tampons récents et les pays de mes amis', async () => {
    expect((await api().get('/api/stats/friends')).status).toBe(401);
    const res = await api().get('/api/stats/friends').set(auth(ben.token));
    expect(res.status).toBe(200);
    expect(res.body.data.stamps.map((s: any) => s.country)).toContain('Maroc');
    expect(res.body.data.stamps[0]).toMatchObject({ username: 'ana' });
    expect(res.body.data.countries.find((c: any) => c.country === 'Maroc').friends).toBe(1);
    // cleo ne suit personne
    expect((await api().get('/api/stats/friends').set(auth(cleo.token))).body.data.stamps).toEqual([]);
  });
});
