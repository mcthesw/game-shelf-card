import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { configSchema } from '../src/config.js';
import { createIgdb } from '../src/igdb.js';
import { externalFavorites } from '../src/favorites.js';
import { buildModel, gameKey } from '../src/model.js';
import { demoSnapshot } from '../src/demo.js';
import { fetchArtwork } from '../src/artwork.js';

const base = { steam_id: '76561198000000000' };
const entry = { id: 1, name: 'A game', cover: { image_id: 'co123' }, platforms: [{ name: 'Nintendo 64' }], first_release_date: 956793600 };
const json = (data: unknown) => new Response(JSON.stringify(data));

test('favorites validate exactly one source, manual fields, duplicate identities and overlapping numeric IDs', () => {
  for (const game of [{}, { appid: 1, igdb_id: 2 }, { id: 'manual', name: 'Missing image' }, { igdb_id: -1 }])
    assert.throws(() => configSchema.parse({ ...base, sections: { favorites: { games: [game] } } }));
  assert.throws(() => configSchema.parse({ ...base, sections: { favorites: { games: [{ igdb_id: 1 }, { igdb_id: 1 }] } } }));
  const config = configSchema.parse({ ...base, sections: { favorites: { games: [{ appid: 1 }, { igdb_id: 1 }, { id: 'manual', name: 'Manual', image: 'cover.png' }] } } });
  assert.deepEqual(config.sections.favorites.games.map(gameKey), [1, 'igdb:1', 'manual:manual']);
});

test('external resolution preserves order, manual overrides, absent playtime and disabled providers', async () => {
  const config = configSchema.parse({ ...base, sections: { favorites: { games: [{ igdb_id: 1, note: 'Favorite' }, { id: 'manual', name: 'Manual', image: 'cover.png' }, { appid: 250900 }] } } });
  let calls = 0;
  const external = await externalFavorites(config, async () => { calls++; return entry; });
  const snapshot = demoSnapshot(config);
  snapshot.favorites = [...snapshot.favorites.filter(game => game.appid !== undefined), ...external];
  const model = buildModel(snapshot, config);
  assert.equal(calls, 1);
  assert.deepEqual(model.favorites.map(gameKey), ['igdb:1', 'manual:manual', 250900]);
  assert.equal(model.favorites[0]!.minutes, null);
  assert.equal(model.favorites[0]!.note, 'Favorite');
  assert.match(model.favorites[0]!.image!, /images.igdb.com/);
  config.sections.favorites.enabled = false;
  assert.deepEqual(await externalFavorites(config, async () => { throw new Error('Must not query'); }), []);
});

test('IGDB authenticates via POST, escapes search, caches metadata without secrets and works from cache without credentials', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'igdb-test-'));
  const requests: { url: string; init?: RequestInit }[] = [];
  try {
    const api = createIgdb({ clientId: 'client', clientSecret: 'SECRET', cache: dir, fetcher: async (input, init) => {
      requests.push({ url: String(input), init });
      return String(input).includes('oauth2') ? json({ access_token: 'TOKEN', expires_in: 3600 }) : json([entry]);
    } });
    await api.search('Majora"; limit 500;');
    assert(!requests[0]!.url.includes('SECRET'));
    assert.equal(requests[0]!.init!.method, 'POST');
    assert.match(String(requests[1]!.init!.body), /search "Majora\\"; limit 500;";/);
    assert.equal((await api.get(1)).name, entry.name);
    assert.equal((await createIgdb({ cache: dir }).get(1)).name, entry.name);
    assert.equal(requests.length, 3);
    const text = await readFile(join(dir, (await readdir(dir))[0]!), 'utf8');
    assert(!text.includes('SECRET') && !text.includes('TOKEN'));
    await writeFile(join(dir, 'igdb-1.json'), JSON.stringify({ date: 0, game: entry }));
    assert.equal((await createIgdb({ cache: dir }).get(1)).id, 1);
    await assert.rejects(createIgdb({}).search('test'), /IGDB_CLIENT_ID/);
    await assert.rejects(api.search('bad\nquery'), /control/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('IGDB errors never echo authentication or upstream response bodies', async () => {
  const api = createIgdb({ clientId: 'client', clientSecret: 'SECRET', fetcher: async () => new Response('SECRET TOKEN', { status: 401 }) });
  await assert.rejects(api.search('game'), error => error instanceof Error && error.message === 'IGDB: HTTP 401.');
});

test('manual artwork uses config-relative files and rejects traversal and arbitrary network targets', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'manual-art-'));
  try {
    const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=', 'base64');
    await writeFile(join(dir, 'cover.png'), pixel);
    const config = configSchema.parse({ ...base, sections: { recent: { enabled: false }, favorites: { games: [{ id: 'manual', name: 'Manual', image: 'cover.png' }] } } });
    const model = buildModel(demoSnapshot(config), config);
    const art = await fetchArtwork(model, config, dir, () => {}, async () => { throw new Error('No network'); }, dir);
    assert(art.games.get('manual:manual')?.startsWith('data:image/png;'));
    for (const path of ['../outside.png', 'https://127.0.0.1/cover.png', 'http://example.com/a.png']) {
      model.favorites[0]!.image = path;
      await assert.rejects(fetchArtwork(model, config, dir, () => {}, undefined, dir));
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
