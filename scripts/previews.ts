import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { loadConfig } from '../src/config.js';
import { demoSnapshot } from '../src/demo.js';
import { buildModel } from '../src/model.js';
import { bundledFont } from '../src/generate.js';
import { fetchArtwork } from '../src/artwork.js';
import { renderCard } from '../src/render.js';

const online = process.argv.includes('--online-art');
const configPath = process.argv.includes('--config') ? process.argv[process.argv.indexOf('--config') + 1]! : 'examples/demo.yml';
const destination = resolve(process.argv.includes('--output-dir') ? process.argv[process.argv.indexOf('--output-dir') + 1]! : 'docs/previews');
await mkdir(destination, { recursive: true });
const config = await loadConfig(configPath);
const model = buildModel(demoSnapshot(config), config);
const art = online ? await fetchArtwork(model, config, '.cache/artwork', console.warn, undefined, dirname(resolve(configPath))) : { games: new Map<number, string>() };
const font = await bundledFont();
for (const theme of ['dark', 'light'] as const) {
  for (const language of ['en', 'zh-CN'] as const) {
    const settings = structuredClone(config);
    settings.theme = theme;
    settings.language = language;
    if (language === 'zh-CN' && configPath === 'examples/demo.yml') {
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
await writeFile(resolve(destination, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Steam Stats</title><style>:root{color-scheme:light dark}body{margin:0;background:light-dark(#fff,#0d1117);color:light-dark(#1f2328,#e6edf3);font:14px system-ui}main{max-width:480px;margin:24px auto;padding:0 16px}img{width:100%;display:block}h1{font-size:18px}h2{font-size:14px;font-weight:400}</style><main><h1>Steam Stats</h1>${['en','zh-CN'].map(lang => `<h2>${lang}</h2><picture><source media="(prefers-color-scheme: dark)" srcset="dark-${lang}.png"><img src="light-${lang}.png" alt="Steam sample card" width="480"></picture>`).join('')}</main></html>`);
