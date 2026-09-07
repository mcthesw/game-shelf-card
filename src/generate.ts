import { fileURLToPath } from 'node:url';
import { resolve, extname } from 'node:path';
import { access } from 'node:fs/promises';
import { loadConfig, type Config } from './config.js';
import { buildModel, type Snapshot } from './model.js';
import { fetchSnapshot } from './steam.js';
import { fetchArtwork, type Warn } from './artwork.js';
import { renderCard } from './render.js';
import { atomicWrite } from './output.js';
import { demoSnapshot } from './demo.js';

export async function bundledFont(): Promise<string> {
  // src/ in development; dist/src/ after tsc.
  for (const relative of ['../assets/fonts/NotoSansCJKsc-Regular.otf', '../../assets/fonts/NotoSansCJKsc-Regular.otf']) {
    const path = fileURLToPath(new URL(relative, import.meta.url));
    try { await access(path); return path; } catch { /* Try compiled location. */ }
  }
  throw new Error('Bundled Noto font is missing. Restore assets/fonts from the repository.');
}

export interface GenerateOptions {
  configPath: string;
  outputPath: string;
  cachePath?: string;
  apiKey?: string;
  demo?: boolean;
  onlineArt?: boolean;
  noArt?: boolean;
  warn?: Warn;
}
export interface GenerateDependencies {
  loadSnapshot?: (config: Config, key: string) => Promise<Snapshot>;
}

export async function generate(options: GenerateOptions, dependencies: GenerateDependencies = {}) {
  const output = resolve(options.outputPath);
  if (extname(output).toLowerCase() !== '.png') throw new Error('Output must be a .png file.');
  const config = await loadConfig(options.configPath);
  const font = await bundledFont();
  const snapshot = options.demo ? demoSnapshot(config)
    : await (dependencies.loadSnapshot ?? fetchSnapshot)(config, options.apiKey ?? '');
  const model = buildModel(snapshot, config);
  const warn = options.warn ?? (() => {});
  const art = options.noArt || (options.demo && !options.onlineArt)
    ? { games: new Map<number, string>() }
    : await fetchArtwork(model, config, resolve(options.cachePath ?? '.cache/artwork'), warn);
  const rendered = renderCard(model, config, art, font);
  const changed = await atomicWrite(output, rendered.png);
  return { output, changed, width: rendered.width, height: rendered.height, demo: model.demo };
}
