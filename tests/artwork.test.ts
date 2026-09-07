import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { configSchema } from '../src/config.js';
import { buildModel } from '../src/model.js';
import { demoSnapshot } from '../src/demo.js';
import { fetchArtwork } from '../src/artwork.js';

const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=', 'base64');
const config = configSchema.parse({ steam_id: '76561198000000000', sections: {
  overview: { enabled: false }, recent: { enabled: false }, most_played: { enabled: false },
  favorites: { games: [{ appid: 250900 }] },
} });

test('artwork caches successful downloads, reuses stale files on failure, and degrades to placeholders', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'steam-art-test-'));
  const model = buildModel(demoSnapshot(config), config);
  try {
    let calls = 0;
    const warn: string[] = [];
    const good = async () => { calls++; return new Response(pixel, { headers: { 'content-type': 'image/png' } }); };
    const first = await fetchArtwork(model, config, directory, message => warn.push(message), good);
    const cached = await fetchArtwork(model, config, directory, message => warn.push(message), good);
    assert.equal(calls, 1);
    assert.equal(first.games.get(250900), cached.games.get(250900));
    const file = join(directory, (await readdir(directory))[0]!);
    const entry = JSON.parse(await readFile(file, 'utf8')); entry.date = 0;
    await writeFile(file, JSON.stringify(entry));
    const stale = await fetchArtwork(model, config, directory, message => warn.push(message), async () => new Response('', { status: 404 }));
    assert.equal(stale.games.get(250900), first.games.get(250900));
    assert(warn.some(message => message.includes('cached')));
    const noCache = await fetchArtwork(model, config, join(directory, 'empty'), message => warn.push(message), async () => new Response('<html>not an image</html>'));
    assert.equal(noCache.games.size, 0);
    assert(warn.some(message => message.includes('placeholder')));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
