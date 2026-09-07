import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CardModel } from './model.js';
import type { Config } from './config.js';
import { mapConcurrent, requestBytes, type Fetch } from './http.js';

export interface Artwork { games: Map<number, string>; avatar?: string }
export type Warn = (message: string) => void;

function imageData(bytes: Buffer): string | undefined {
  const mime = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ? 'image/png' : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'image/jpeg' : undefined;
  if (!mime || bytes.length > 4 * 1024 * 1024) return undefined;
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

export function allowedImageUrl(value: string): URL | undefined {
  try {
    const url = new URL(value);
    const hosts = ['cdn.akamai.steamstatic.com', 'cdn.cloudflare.steamstatic.com',
      'shared.akamai.steamstatic.com', 'shared.cloudflare.steamstatic.com',
      'avatars.steamstatic.com', 'avatars.akamai.steamstatic.com',
      'avatars.cloudflare.steamstatic.com', 'steamcdn-a.akamaihd.net',
      'cdn.steamstatic.com'];
    return url.protocol === 'https:' && !url.username && !url.password && !url.port
      && hosts.includes(url.hostname) ? url : undefined;
  } catch { return undefined; }
}

async function loadImage(url: URL, cache: string, fetcher: Fetch | undefined, warn: Warn): Promise<string | undefined> {
  const path = join(cache, `${createHash('sha256').update(url.href).digest('hex')}.json`);
  let cached: { date: number; data: string } | undefined;
  try {
    const file = await readFile(path, 'utf8');
    if (file.length < 6 * 1024 * 1024) {
      const parsed = JSON.parse(file) as { date: number; data: string };
      if (Number.isFinite(parsed.date) && typeof parsed.data === 'string'
        && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(parsed.data)) cached = parsed;
    }
  } catch { /* Cache is optional. */ }
  if (cached && Date.now() - cached.date < 7 * 86400_000) return cached.data;
  try {
    const { bytes } = await requestBytes(url, 'Steam artwork', fetcher, undefined, 4 * 1024 * 1024);
    const data = imageData(bytes);
    if (!data) throw new Error('Unsupported image format.');
    try {
      await mkdir(cache, { recursive: true });
      await writeFile(path, JSON.stringify({ date: Date.now(), data }));
    } catch { warn('Artwork cache could not be written; continuing without cache.'); }
    return data;
  } catch {
    warn(cached ? 'Artwork unavailable; using a cached image.' : 'Artwork unavailable; using a styled placeholder.');
    return cached?.data;
  }
}

export async function fetchArtwork(model: CardModel, config: Config, cache: string, warn: Warn, fetcher?: Fetch): Promise<Artwork> {
  const ids = [...new Set([
    ...(config.sections.favorites.enabled ? model.favorites : []),
    ...(config.sections.recent.enabled ? model.recent : []),
    ...(config.sections.most_played.enabled ? model.mostPlayed : []),
  ].map(game => game.appid))];
  const images = await mapConcurrent(ids, 4, async appid => {
    const url = new URL(`https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`);
    return [appid, await loadImage(url, cache, fetcher, warn)] as const;
  });
  const avatarUrl = model.avatarUrl && allowedImageUrl(model.avatarUrl);
  const avatar = avatarUrl ? await loadImage(avatarUrl, cache, fetcher, warn) : undefined;
  return { games: new Map(images.filter((entry): entry is readonly [number, string] => entry[1] !== undefined)), avatar };
}
