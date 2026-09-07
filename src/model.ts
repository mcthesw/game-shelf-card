import type { Config } from './config.js';

export interface Game {
  appid: number;
  name: string;
  minutes: number | null;
  recentMinutes: number;
}

export interface Snapshot {
  profile: { steamId: string; name: string; avatarUrl?: string };
  games: Game[];
  recent: Game[];
  favorites: Game[];
  fetchedAt: string;
  demo: boolean;
}

export interface CardGame extends Game { note?: string }
export interface CardModel {
  name: string;
  steamId: string;
  avatarUrl?: string;
  gameCount: number;
  totalMinutes: number;
  recentMinutes: number;
  favorites: CardGame[];
  recent: CardGame[];
  mostPlayed: CardGame[];
  updatedAt: string;
  demo: boolean;
}

export function buildModel(snapshot: Snapshot, config: Config): CardModel {
  const excluded = new Set(config.exclude_games);
  const catalog = new Map([...snapshot.games, ...snapshot.favorites].map(game => [game.appid, game]));
  const favorites = config.sections.favorites.enabled
    ? config.sections.favorites.games.slice(0, config.sections.favorites.limit).map(favorite => {
      const game = catalog.get(favorite.appid);
      if (!game) throw new Error(`Favorite ${favorite.appid} was not resolved.`);
      return { ...game, name: favorite.name ?? game.name, note: favorite.note };
    }) : [];
  const recent = snapshot.recent.filter(game => !excluded.has(game.appid) && game.recentMinutes > 0)
    .sort((a, b) => b.recentMinutes - a.recentMinutes || a.appid - b.appid)
    .slice(0, config.sections.recent.limit);
  const mostPlayed = snapshot.games.filter(game => !excluded.has(game.appid) && (game.minutes ?? 0) > 0)
    .sort((a, b) => (b.minutes ?? 0) - (a.minutes ?? 0) || a.appid - b.appid)
    .slice(0, config.sections.most_played.limit);
  return {
    name: config.display_name ?? snapshot.profile.name,
    steamId: snapshot.profile.steamId,
    avatarUrl: snapshot.profile.avatarUrl,
    gameCount: snapshot.games.length,
    totalMinutes: snapshot.games.reduce((sum, game) => sum + (game.minutes ?? 0), 0),
    recentMinutes: snapshot.recent.reduce((sum, game) => sum + game.recentMinutes, 0),
    favorites, recent, mostPlayed,
    updatedAt: snapshot.fetchedAt, demo: snapshot.demo,
  };
}
