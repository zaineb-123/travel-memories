import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, auth, createMemory, follow, query, register, setupDb, teardownDb, type TestUser } from './helpers';

let ana: TestUser, ben: TestUser, cleo: TestUser, dan: TestUser;

beforeAll(async () => {
  await setupDb();
  [ana, ben, cleo, dan] = [await register('ana'), await register('ben'), await register('cleo'), await register('dan')];
});
afterAll(teardownDb);

describe('Comptes privés et demandes d\'abonnement', () => {
  it('un abonnement à un compte public est immédiat', async () => {
    const res = await follow(ben, ana);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('following');
  });

  it('un compte privé reçoit une demande au lieu d\'un abonnement', async () => {
    const priv = await api().put('/api/users/me').set(auth(cleo.token)).send({ is_private: true });
    expect(priv.body.data.is_private).toBe(true);

    const res = await follow(ana, cleo);
    expect(res.body.data.status).toBe('requested');

    // Aucun droit tant que la demande n'est pas acceptée.
    const followers = await api().get('/api/users/cleo/followers').set(auth(ben.token));
    expect(followers.status).toBe(403);
    const profile = await api().get('/api/users/cleo').set(auth(ana.token));
    expect(profile.body.data.follow_status).toBe('requested');
    expect(profile.body.data.is_following).toBe(false);
  });

  it('cache même les souvenirs publics d\'un compte privé aux non-abonnés', async () => {
    const m = await createMemory(cleo, { title: 'Secret de Cléo à Lisbonne' });
    expect((await api().get(`/api/memories/${m.id}`)).status).toBe(404);
    expect((await api().get(`/api/memories/${m.id}`).set(auth(ana.token))).status).toBe(404);
    const list = await api().get('/api/memories').set(auth(ana.token));
    expect(list.body.data.memories.some((x: any) => x.id === m.id)).toBe(false);
    expect((await api().get(`/api/memories/${m.id}`).set(auth(cleo.token))).status).toBe(200);
  });

  it('notifie la propriétaire, qui voit la demande et l\'accepte', async () => {
    const notifs = await api().get('/api/notifications').set(auth(cleo.token));
    expect(notifs.body.data.some((n: any) => n.type === 'follow_request')).toBe(true);

    const list = await api().get('/api/follow-requests').set(auth(cleo.token));
    expect(list.body.count).toBe(1);
    expect(list.body.data[0].username).toBe('ana');

    // Un tiers ne peut pas accepter à sa place.
    expect((await api().post(`/api/follow-requests/${ana.id}/accept`).set(auth(ben.token))).status).toBe(404);

    const ok = await api().post(`/api/follow-requests/${ana.id}/accept`).set(auth(cleo.token));
    expect(ok.status).toBe(200);
    const profile = await api().get('/api/users/cleo').set(auth(ana.token));
    expect(profile.body.data.follow_status).toBe('following');
    const back = await api().get('/api/notifications').set(auth(ana.token));
    expect(back.body.data.some((n: any) => n.type === 'follow_accepted')).toBe(true);
  });

  it('montre alors les souvenirs de la compte privé à l\'abonnée', async () => {
    const list = await api().get('/api/memories').set(auth(ana.token));
    expect(list.body.data.memories.some((x: any) => x.title === 'Secret de Cléo à Lisbonne')).toBe(true);
    // Toujours invisible pour Ben, qui ne la suit pas.
    const benList = await api().get('/api/memories').set(auth(ben.token));
    expect(benList.body.data.memories.some((x: any) => x.title === 'Secret de Cléo à Lisbonne')).toBe(false);
  });

  it('permet de refuser ou d\'annuler une demande', async () => {
    await follow(dan, cleo);
    const refused = await api().delete(`/api/follow-requests/${dan.id}`).set(auth(cleo.token));
    expect(refused.status).toBe(200);
    expect((await api().get('/api/users/cleo').set(auth(dan.token))).body.data.follow_status).toBe('none');

    await follow(dan, cleo);
    await api().delete(`/api/users/${cleo.id}/follow`).set(auth(dan.token));
    expect((await api().get('/api/follow-requests').set(auth(cleo.token))).body.count).toBe(0);
  });

  it('accepte toutes les demandes quand le compte redevient public', async () => {
    await follow(dan, cleo);
    expect((await api().get('/api/follow-requests').set(auth(cleo.token))).body.count).toBe(1);
    await api().put('/api/users/me').set(auth(cleo.token)).send({ is_private: false });
    expect((await api().get('/api/follow-requests').set(auth(cleo.token))).body.count).toBe(0);
    expect((await api().get('/api/users/cleo').set(auth(dan.token))).body.data.follow_status).toBe('following');
  });

  it('refuse de suivre soi-même et protège les routes', async () => {
    expect((await follow(ana, ana)).status).toBe(400);
    expect((await api().get('/api/follow-requests')).status).toBe(401);
  });

  it('permet de retirer un abonné sans le bloquer', async () => {
    await follow(ben, cleo);
    const res = await api().delete(`/api/users/${ben.id}/follower`).set(auth(cleo.token));
    expect(res.status).toBe(200);
    expect((await api().get('/api/users/cleo').set(auth(ben.token))).body.data.follow_status).toBe('none');
  });
});

describe('Amis (abonnement mutuel)', () => {
  it('liste uniquement les abonnements réciproques', async () => {
    await follow(ana, ben);   // ben suit déjà ana (test précédent) → amis
    const friends = await api().get('/api/friends').set(auth(ana.token));
    expect(friends.body.data.map((u: any) => u.username)).toEqual(['ben']);
    // dan ne suit que cleo : pas d'ami
    expect((await api().get('/api/friends').set(auth(dan.token))).body.data).toHaveLength(0);
    const profile = await api().get('/api/users/ben').set(auth(ana.token));
    expect(profile.body.data.is_friend).toBe(true);
  });

  it('filtre la recherche d\'amis', async () => {
    const hit = await api().get('/api/friends?q=be').set(auth(ana.token));
    expect(hit.body.data).toHaveLength(1);
    const miss = await api().get('/api/friends?q=zzz').set(auth(ana.token));
    expect(miss.body.data).toHaveLength(0);
  });
});

describe('Blocage', () => {
  let m: { id: number };
  beforeAll(async () => {
    m = await createMemory(ana, { title: 'Randonnée aux Açores' });
  });

  it('coupe les abonnements dans les deux sens', async () => {
    expect((await api().get('/api/friends').set(auth(ana.token))).body.data).toHaveLength(1);
    const res = await api().post(`/api/blocks/${ben.id}`).set(auth(ana.token));
    expect(res.status).toBe(200);
    expect((await api().get('/api/friends').set(auth(ana.token))).body.data).toHaveLength(0);
    const rows = await query('SELECT 1 FROM follows WHERE (follower_id=$1 AND following_id=$2) OR (follower_id=$2 AND following_id=$1)', [ana.id, ben.id]);
    expect(rows).toHaveLength(0);
  });

  it('rend le bloqueur introuvable pour la personne bloquée', async () => {
    expect((await api().get('/api/users/ana').set(auth(ben.token))).status).toBe(404);
    expect((await api().get(`/api/memories/${m.id}`).set(auth(ben.token))).status).toBe(404);
    expect((await api().post(`/api/memories/${m.id}/like`).set(auth(ben.token))).status).toBe(404);
    expect((await api().post(`/api/memories/${m.id}/comments`).set(auth(ben.token)).send({ content: 'Coucou' })).status).toBe(404);
    const search = await api().get('/api/users/search?q=ana').set(auth(ben.token));
    expect(search.body.data).toHaveLength(0);
    expect((await follow(ben, ana)).status).toBe(403);
  });

  it('empêche aussi le bloqueur de suivre la personne bloquée, mais il voit toujours son profil', async () => {
    expect((await follow(ana, ben)).status).toBe(403);
    const profile = await api().get('/api/users/ben').set(auth(ana.token));
    expect(profile.status).toBe(200);
    expect(profile.body.data.is_blocked).toBe(true);
    expect((await api().get('/api/blocks').set(auth(ana.token))).body.data[0].username).toBe('ben');
  });

  it('refuse de se bloquer soi-même, et le blocage se lève', async () => {
    expect((await api().post(`/api/blocks/${ana.id}`).set(auth(ana.token))).status).toBe(400);
    await api().delete(`/api/blocks/${ben.id}`).set(auth(ana.token));
    expect((await api().get('/api/users/ana').set(auth(ben.token))).status).toBe(200);
    expect((await api().get(`/api/memories/${m.id}`).set(auth(ben.token))).status).toBe(200);
  });
});
