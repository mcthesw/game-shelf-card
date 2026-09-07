import type { Config } from './config.js';
import { gameKey, type Game } from './model.js';
import { coverUrl, type IgdbEntry } from './igdb.js';

export async function externalFavorites(config: Config, lookup: (id: number) => Promise<IgdbEntry>): Promise<Game[]> {
  const result: Game[] = [];
  if (!config.sections.favorites.enabled) return result;
  for (const favorite of config.sections.favorites.games.slice(0, config.sections.favorites.limit)) {
    if (favorite.appid !== undefined) continue;
    const entry = favorite.igdb_id !== undefined ? await lookup(favorite.igdb_id) : undefined;
    result.push({ key: String(gameKey(favorite)), name: favorite.name ?? entry!.name,
      image: favorite.image ?? (entry && coverUrl(entry)), minutes: null, recentMinutes: 0 });
  }
  return result;
}
