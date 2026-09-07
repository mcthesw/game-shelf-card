import { z } from 'zod';
import type { Config } from './config.js';
import type { Game, Snapshot } from './model.js';
import { mapConcurrent, requestJson, type Fetch } from './http.js';

const minutes = z.number().int().nonnegative();
const gameSchema = z.object({
  appid: z.number().int().positive(), name: z.string().min(1),
  playtime_forever: minutes,
  playtime_2weeks: minutes.optional(),
});
const ownedSchema = z.object({ response: z.object({
  game_count: z.number().int().nonnegative(), games: z.array(gameSchema).optional(),
}) });
const recentSchema = z.object({ response: z.object({
  total_count: z.number().int().nonnegative(), games: z.array(gameSchema.extend({ playtime_2weeks: minutes })).optional(),
}) });
const profileSchema = z.object({ response: z.object({ players: z.array(z.object({
  steamid: z.string(), personaname: z.string().min(1), avatarfull: z.string().optional(),
})) }) });

function toGame(game: z.infer<typeof gameSchema>): Game {
  return { appid: game.appid, name: game.name, minutes: game.playtime_forever, recentMinutes: game.playtime_2weeks ?? 0 };
}

export function parseLibrary(data: unknown): Game[] {
  const parsed = ownedSchema.safeParse(data);
  if (!parsed.success) throw new Error('Steam game library is unavailable or playtime is hidden. Make Game details public and disable private total playtime.');
  const { game_count: count, games = [] } = parsed.data.response;
  if (games.length !== count || new Set(games.map(game => game.appid)).size !== count) {
    throw new Error('Steam returned an incomplete game library. Previous card has been kept.');
  }
  return games.map(toGame);
}

export function parseRecent(data: unknown): Game[] {
  const parsed = recentSchema.safeParse(data);
  if (!parsed.success) throw new Error('Steam recent activity is unavailable. Check Game details visibility and try again.');
  const { total_count: count, games = [] } = parsed.data.response;
  if (count !== games.length || new Set(games.map(game => game.appid)).size !== count) {
    throw new Error('Steam returned incomplete recent activity. Previous card has been kept.');
  }
  return games.map(toGame);
}

export function steamUrl(method: string, key: string, parameters: Record<string, unknown>, service = true): URL {
  const url = new URL(`https://api.steampowered.com/${method}/`);
  url.searchParams.set('key', key);
  if (service) url.searchParams.set('input_json', JSON.stringify(parameters));
  else for (const [name, value] of Object.entries(parameters)) url.searchParams.set(name, String(value));
  return url;
}

export async function storeGame(appid: number, language: Config['language'], fetcher?: Fetch): Promise<Game> {
  const url = new URL('https://store.steampowered.com/api/appdetails');
  url.searchParams.set('appids', String(appid));
  url.searchParams.set('l', language === 'zh-CN' ? 'schinese' : 'english');
  const data = await requestJson(url, `Steam Store app ${appid}`, fetcher);
  const parsed = z.record(z.string(), z.object({ success: z.boolean(), data: z.object({
    name: z.string().min(1), steam_appid: z.number().int(),
  }).optional() })).safeParse(data);
  const entry = parsed.success ? parsed.data[String(appid)] : undefined;
  if (!entry?.success || entry.data?.steam_appid !== appid) {
    throw new Error(`Favorite ${appid} is unavailable from Steam Store. Set its optional name override.`);
  }
  return { appid, name: entry.data.name, minutes: null, recentMinutes: 0 };
}

export async function fetchSnapshot(config: Config, key: string, fetcher?: Fetch): Promise<Snapshot> {
  const needsSteam = config.sections.overview.enabled || config.sections.recent.enabled || config.sections.most_played.enabled
    || (config.sections.favorites.enabled && config.sections.favorites.games.slice(0, config.sections.favorites.limit).some(game => game.appid !== undefined));
  if (!needsSteam) return { profile: { steamId: config.steam_id, name: config.display_name ?? 'Games' },
    games: [], recent: [], favorites: [], fetchedAt: new Date().toISOString(), demo: false };
  if (!key.trim()) throw new Error('Set STEAM_API_KEY in the environment or GitHub Secrets.');
  const needsLibrary = config.sections.overview.enabled || config.sections.most_played.enabled;
  const needsRecent = config.sections.overview.enabled || config.sections.recent.enabled;
  const [profileData, libraryData, recentData] = await Promise.all([
    requestJson(steamUrl('ISteamUser/GetPlayerSummaries/v2', key, { steamids: config.steam_id }, false), 'Steam profile', fetcher),
    needsLibrary ? requestJson(steamUrl('IPlayerService/GetOwnedGames/v1', key, {
      steamid: config.steam_id, include_appinfo: true, include_played_free_games: true,
    }), 'Steam library', fetcher) : undefined,
    needsRecent ? requestJson(steamUrl('IPlayerService/GetRecentlyPlayedGames/v1', key, {
      steamid: config.steam_id, count: 0,
    }), 'Steam recent activity', fetcher) : undefined,
  ]);
  const profileResult = profileSchema.safeParse(profileData);
  const profile = profileResult.success
    ? profileResult.data.response.players.find(player => player.steamid === config.steam_id) : undefined;
  if (!profile) throw new Error('Steam profile not found. Check the configured SteamID64.');
  const games = libraryData === undefined ? [] : parseLibrary(libraryData);
  const recent = recentData === undefined ? [] : parseRecent(recentData);
  const catalog = new Map([...recent, ...games].map(game => [game.appid, game]));
  const requested = config.sections.favorites.enabled
    ? config.sections.favorites.games.slice(0, config.sections.favorites.limit).filter(favorite => favorite.appid !== undefined) : [];
  const favorites = await mapConcurrent(requested, 3, async favorite => {
    const known = catalog.get(favorite.appid);
    if (known) return known;
    if (favorite.name) return { appid: favorite.appid, name: favorite.name, minutes: null, recentMinutes: 0 };
    return storeGame(favorite.appid!, config.language, fetcher);
  });
  return {
    profile: { steamId: profile.steamid, name: profile.personaname, avatarUrl: profile.avatarfull },
    games, recent, favorites, fetchedAt: new Date().toISOString(), demo: false,
  };
}
