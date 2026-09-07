import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadConfig } from '../src/config.js';
import { demoSnapshot } from '../src/demo.js';
import { buildModel } from '../src/model.js';
import { bundledFont } from '../src/generate.js';
import { fetchArtwork } from '../src/artwork.js';
import { renderCard } from '../src/render.js';

const online = process.argv.includes('--online-art');
const destination = resolve('docs/previews');
await mkdir(destination, { recursive: true });
const config = await loadConfig('examples/demo.yml');
const model = buildModel(demoSnapshot(config), config);
const art = online ? await fetchArtwork(model, config, '.cache/artwork', console.warn) : { games: new Map<number, string>() };
const font = await bundledFont();
for (const theme of ['dark', 'light'] as const) {
  for (const language of ['en', 'zh-CN'] as const) {
    const settings = structuredClone(config);
    settings.theme = theme;
    settings.language = language;
    if (language === 'zh-CN') {
      settings.display_name = '玩家一号';
      settings.sections.favorites.games[0]!.note = '再来一局，每次都这么说。';
      settings.sections.favorites.games[1]!.note = '每一次逃离，都值得重新出发。';
      settings.sections.favorites.games[2]!.note = '喜欢在这个世界里迷路。';
    }
    const result = renderCard(buildModel(demoSnapshot(settings), settings), settings, art, font);
    await writeFile(resolve(destination, `${theme}-${language}.png`), result.png);
    console.log(`${theme}-${language}: ${result.width} × ${result.height}`);
  }
}
await writeFile(resolve(destination, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Steam Stats previews</title><style>body{margin:0;background:#0d1117;color:#d1d9e0;font:16px system-ui}main{max-width:880px;margin:40px auto;padding:0 16px}h1{font-size:24px}p{color:#a4b1c0}img{width:100%;height:auto;display:block;margin:16px 0 48px;border-radius:20px}a{color:#9ce6c0}</style><main><h1>Steam Stats</h1><p>Design previews · fictional statistics · ${online ? 'Steam cover art' : 'placeholder artwork'}</p>${['dark-en','light-en','dark-zh-CN','light-zh-CN'].map(name => `<h2>${name}</h2><img src="${name}.png" alt="${name} Steam profile card" width="840">`).join('')}</main></html>`);
