import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseConfig, configSchema } from '../src/config.js';
import { demoSnapshot } from '../src/demo.js';
import { buildModel } from '../src/model.js';
import { parseLibrary, parseRecent, fetchSnapshot, storeGame } from '../src/steam.js';
import { allowedImageUrl } from '../src/artwork.js';
import type { Fetch } from '../src/http.js';

const base = 'steam_id: "76561198000000000"\n';
const game = { appid: 10, name: 'Example', playtime_forever: 120, playtime_2weeks: 60 };
const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });

test('minimal config supplies approved defaults', () => {
  const config = parseConfig(base);
  assert.deepEqual([config.sections.favorites.limit, config.sections.recent.limit, config.sections.most_played.limit], [3, 6, 3]);
  assert.equal(config.sections.most_played.enabled, false);
  assert.equal(config.sections.overview.enabled, false);
});

test('configuration rejects typos, duplicate keys, IDs as unsafe numbers, invalid counts, and duplicate favorites', () => {
  for (const extra of ['unknown: true', 'theme: dark\ntheme: light', 'sections:\n  recent:\n    limit: 0',
    'sections:\n  favorites:\n    games:\n      - appid: 10\n      - appid: 10',
    'sections:\n  favorites:\n    games:\n      - appid: -1', 'sections:\n  recent:\n    limit: 13']) {
    assert.throws(() => parseConfig(base + extra), /Invalid/);
  }
  assert.throws(() => parseConfig('steam_id: 76561198000000000'), /Invalid/);
  assert.throws(() => parseConfig(base + 'sections:\n  recent:\n    enabled: "false"'), /Invalid/);
});

test('favorites preserve chosen order and notes; exclusions affect only automatic lists', () => {
  const config = configSchema.parse({ steam_id: '76561198000000000', exclude_games: [250900],
    sections: { favorites: { games: [{ appid: 1245620, note: 'Chosen first' }, { appid: 250900 }] } } });
  const snapshot = demoSnapshot(config);
  const model = buildModel(snapshot, config);
  assert.deepEqual(model.favorites.map(game => game.appid), [1245620, 250900]);
  assert.equal(model.favorites[0]?.note, 'Chosen first');
  assert.equal(model.gameCount, 8);
  assert.equal(model.totalMinutes, 120720);
  assert.equal(model.recentMinutes, 2988);
  assert(!model.recent.some(game => game.appid === 250900));
  assert(!model.mostPlayed.some(game => game.appid === 250900));
  assert(model.recent.some(game => game.appid === 1245620));
  assert(model.mostPlayed.some(game => game.appid === 1245620));
});

test('private or malformed library never becomes an empty or partial successful card', () => {
  assert.throws(() => parseLibrary({ response: {} }), /unavailable/);
  assert.throws(() => parseLibrary({ response: { game_count: 1, games: [{ appid: 10, name: 'Hidden time' }] } }), /hidden/);
  assert.throws(() => parseLibrary({ response: { game_count: 2, games: [game] } }), /incomplete/);
  assert.throws(() => parseLibrary({ response: { game_count: 2, games: [game, game] } }), /incomplete/);
  assert.deepEqual(parseLibrary({ response: { game_count: 0 } }), []);
  assert.equal(parseLibrary({ response: { game_count: 1, games: [game] } })[0]?.minutes, 120);
});

test('recent distinguishes explicit zero from missing/private data', () => {
  assert.deepEqual(parseRecent({ response: { total_count: 0 } }), []);
  assert.throws(() => parseRecent({ response: {} }), /unavailable/);
  assert.throws(() => parseRecent({ response: { total_count: 1 } }), /incomplete/);
  assert.throws(() => parseRecent({ response: { total_count: 1, games: [{ ...game, playtime_2weeks: undefined }] } }), /unavailable/);
});

test('live adapter requests all recent games before exclusion and sends service arguments as JSON', async () => {
  const seen: URL[] = [];
  const config = parseConfig(base);
  const fetcher: Fetch = async input => {
    const url = new URL(String(input)); seen.push(url);
    if (url.pathname.includes('GetPlayerSummaries')) return json({ response: { players: [{ steamid: config.steam_id, personaname: 'Real profile' }] } });
    if (url.pathname.includes('GetOwnedGames')) return json({ response: { game_count: 1, games: [game] } });
    return json({ response: { total_count: 1, games: [game] } });
  };
  const snapshot = await fetchSnapshot(config, 'secret', fetcher);
  assert.equal(snapshot.demo, false);
  assert.equal(snapshot.profile.name, 'Real profile');
  const recent = seen.find(url => url.pathname.includes('GetRecentlyPlayedGames'))!;
  assert.equal(JSON.parse(recent.searchParams.get('input_json')!).count, 0);
  assert(seen.every(url => url.hostname === 'api.steampowered.com'));
});

test('disabled statistics do not require private library endpoints; unowned favorites can use a name override', async () => {
  const config = configSchema.parse({ steam_id: '76561198000000000', sections: {
    overview: { enabled: false }, recent: { enabled: false }, most_played: { enabled: false },
    favorites: { games: [{ appid: 10, name: 'Unavailable favorite' }] },
  } });
  let calls = 0;
  const snapshot = await fetchSnapshot(config, 'key', async () => {
    calls++;
    return json({ response: { players: [{ steamid: config.steam_id, personaname: 'Player' }] } });
  });
  assert.equal(calls, 1);
  assert.equal(snapshot.favorites[0]?.minutes, null);
});

test('store metadata handles unavailable favorites with an actionable error', async () => {
  await assert.rejects(storeGame(10, 'en', async () => json({ '10': { success: false } })), /name override/);
  const metadata = await storeGame(10, 'en', async () => json({ '10': { success: true, data: { steam_appid: 10, name: 'Game' } } }));
  assert.equal(metadata.minutes, null);
});

test('only explicit HTTPS Steam image hosts are accepted', () => {
  assert(allowedImageUrl('https://avatars.steamstatic.com/example.jpg'));
  for (const url of ['file:///etc/passwd', 'http://127.0.0.1/a', 'https://avatars.steamstatic.com.evil.test/x',
    'https://user:pass@avatars.steamstatic.com/x', 'https://avatars.steamstatic.com:8443/x']) {
    assert.equal(allowedImageUrl(url), undefined);
  }
});
