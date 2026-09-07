import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configSchema } from '../src/config.js';
import { buildModel } from '../src/model.js';
import { demoSnapshot } from '../src/demo.js';
import { bundledFont, generate } from '../src/generate.js';
import { renderCard } from '../src/render.js';
import { atomicWrite } from '../src/output.js';
import { Typography } from '../src/text.js';

test('renders bilingual, escaped, bounded text into a standalone high-resolution PNG', async () => {
  const config = configSchema.parse({ steam_id: '76561198000000000', language: 'zh-CN',
    display_name: '<script>alert("hi")</script> 中文玩家',
    sections: { favorites: { games: [{ appid: 250900, note: '长文本'.repeat(50), name: '名称'.repeat(50) }] } } });
  const font = await bundledFont();
  const result = renderCard(buildModel(demoSnapshot(config), config), config, { games: new Map() }, font);
  assert.equal(result.png.readUInt32BE(16), 1680);
  assert.equal(result.png.readUInt32BE(20), result.height * 2);
  assert(!result.svg.includes('<script>'));
  assert(!result.svg.includes('foreignObject'));
  assert(result.svg.includes('我的最爱'));
  assert(result.svg.includes('示例数据'));
  const typography = new Typography(font);
  const fitted = typography.lines('很长的名称和英文 A very long game title '.repeat(10), 17, 212, 2);
  assert(fitted.length <= 2);
  assert(fitted.every(line => typography.width(line, 17) <= 212));
});

test('empty and disabled sections produce valid, shorter cards', async () => {
  const config = configSchema.parse({ steam_id: '76561198000000000', sections: { most_played: { enabled: false } } });
  const snapshot = demoSnapshot(config);
  snapshot.games = []; snapshot.recent = [];
  const result = renderCard(buildModel(snapshot, config), config, { games: new Map() }, await bundledFont());
  assert(result.svg.includes('A quiet fortnight'));
  assert(!result.svg.includes('Most played'));
  assert(result.height < 800);
});

test('repeat generation is byte-stable and upstream failure preserves old output without temp debris', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'steam-card-test-'));
  try {
    const config = join(directory, 'config.yml');
    const output = join(directory, 'card.png');
    await writeFile(config, 'steam_id: "76561198000000000"');
    const options = { configPath: config, outputPath: output, demo: true };
    const first = await generate(options);
    const before = await readFile(output);
    assert(first.changed);
    assert.equal((await generate(options)).changed, false);
    await assert.rejects(generate({ ...options, demo: false }, {
      loadSnapshot: async () => { throw new Error('Steam unavailable'); },
    }), /Steam unavailable/);
    assert.deepEqual(await readFile(output), before);
    await writeFile(config, 'steam_id: invalid');
    await assert.rejects(generate(options), /Invalid configuration/);
    assert.deepEqual(await readFile(output), before);
    assert(!(await readdir(directory)).some(file => file.endsWith('.tmp')));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('atomic publication replaces contents and skips exact matches', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'steam-write-test-'));
  try {
    const output = join(directory, 'card.png');
    assert.equal(await atomicWrite(output, Buffer.from('first')), true);
    assert.equal(await atomicWrite(output, Buffer.from('first')), false);
    assert.equal(await atomicWrite(output, Buffer.from('second')), true);
    assert.equal((await readFile(output)).toString(), 'second');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
