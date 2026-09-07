import { gameKey, type Snapshot } from './model.js';
import type { Config } from './config.js';

export function demoSnapshot(config: Config): Snapshot {
  const games = [
    { appid: 250900, name: 'The Binding of Isaac: Rebirth', minutes: 51240, recentMinutes: 1110 },
    { appid: 1145360, name: 'Hades', minutes: 7980, recentMinutes: 324 },
    { appid: 1245620, name: 'ELDEN RING', minutes: 14640, recentMinutes: 666 },
    { appid: 413150, name: 'Stardew Valley', minutes: 10380, recentMinutes: 492 },
    { appid: 367520, name: 'Hollow Knight', minutes: 5040, recentMinutes: 138 },
    { appid: 646570, name: 'Slay the Spire', minutes: 18360, recentMinutes: 258 },
    { appid: 620, name: 'Portal 2', minutes: 1980, recentMinutes: 0 },
    { appid: 105600, name: 'Terraria', minutes: 11100, recentMinutes: 0 },
  ];
  if (config.language === 'zh-CN') {
    const names: Record<number, string> = { 250900: '以撒的结合：重生', 1145360: '哈迪斯', 1245620: '艾尔登法环',
      413150: '星露谷物语', 367520: '空洞骑士', 646570: '杀戮尖塔', 620: '传送门 2', 105600: '泰拉瑞亚' };
    for (const game of games) game.name = names[game.appid] ?? game.name;
  }
  return {
    profile: { steamId: config.steam_id, name: 'Player One' },
    games, recent: games.filter(game => game.recentMinutes > 0),
    favorites: config.sections.favorites.games.map(favorite => games.find(game => game.appid === favorite.appid)
      ?? { appid: favorite.appid, key: String(gameKey(favorite)), image: favorite.image, name: favorite.name ?? `Game ${favorite.appid}`, minutes: null, recentMinutes: 0 }),
    fetchedAt: '2026-09-07T00:00:00.000Z', demo: true,
  };
}
