import { Resvg } from '@resvg/resvg-js';
import type { Config } from './config.js';
import type { CardGame, CardModel } from './model.js';
import type { Artwork } from './artwork.js';
import { escapeXml as esc, Typography } from './text.js';

const themes = {
  dark: { text: '#f0f4f7', muted: '#9babbc', line: '#2c3946', accent: '#9ce6c0' },
  light: { text: '#192c3c', muted: '#576c7e', line: '#dde4ea', accent: '#18784e' },
};
const translations = {
  en: { title: 'A life in games.', identity: 'MY STEAM', favorites: 'All-time favorites', personal: 'Handpicked, not ranked by hours',
    recent: 'Recently played', fortnight: 'Last two weeks', most: 'Most played', lifetime: 'Lifetime playtime',
    games: 'Games in library', total: 'Total playtime', twoWeeks: 'Past two weeks', hours: 'h',
    emptyFavorites: 'Your next favorite belongs here.', emptyRecent: 'A quiet fortnight. The next adventure can wait.',
    emptyMost: 'Every adventure starts with a first hour.', demo: 'SAMPLE DATA', picked: 'A personal favorite' },
  'zh-CN': { title: '我的游戏时光', identity: 'MY STEAM', favorites: '我的最爱', personal: '亲自挑选，无关时长',
    recent: '最近在玩', fortnight: '最近两周', most: '玩得最多', lifetime: '累计游玩时长',
    games: '游戏库', total: '累计游玩', twoWeeks: '近两周游玩', hours: '小时',
    emptyFavorites: '下一款最爱，留一个位置。', emptyRecent: '最近两周暂未游玩，下一场冒险可以慢慢来。',
    emptyMost: '每一段冒险，都从第一个小时开始。', demo: '示例数据', picked: '特别喜欢的一款' },
};

export interface RenderResult { png: Buffer; svg: string; width: number; height: number }

export function renderCard(model: CardModel, config: Config, artwork: Artwork, fontPath: string): RenderResult {
  const theme = themes[config.theme];
  const tr = translations[config.language];
  const typography = new Typography(fontPath);
  const parts: string[] = [];
  const defs: string[] = [];
  const number = new Intl.NumberFormat(config.language, { maximumFractionDigits: 1 });
  const hours = (minutes: number) => `${number.format(minutes / 60)} ${tr.hours}`;
  let clip = 0;
  const rect = (x: number, y: number, w: number, h: number, fill: string, r = 12, stroke?: string) =>
    parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"${stroke ? ` stroke="${stroke}"` : ''}/>`);
  const text = (value: string, x: number, y: number, size = 16, fill = theme.text, width = 750, anchor = 'start') =>
    parts.push(`<text x="${x}" y="${y}" font-family="Noto Sans CJK SC" font-size="${size}" fill="${fill}" text-anchor="${anchor}">${esc(typography.fit(value, size, width))}</text>`);
  const picture = (uri: string | undefined, x: number, y: number, w: number, h: number, seed: number, radius = 10) => {
    const id = `clip${clip++}`;
    defs.push(`<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}"/></clipPath>`);
    if (uri) parts.push(`<image href="${uri}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`);
    else {
      const hue = seed % 360;
      parts.push(`<g clip-path="url(#${id})"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="hsl(${hue},25%,25%)"/><circle cx="${x + w * .8}" cy="${y + h * .25}" r="${h * .7}" fill="hsl(${hue},32%,40%)"/><path d="M${x},${y + h} L${x + w * .42},${y + h * .2} L${x + w},${y + h}Z" fill="hsl(${(hue + 35) % 360},30%,32%)"/></g>`);
    }
  };
  let y = 16;
  text('Steam', 16, y + 16, 15, theme.accent);
  if (model.demo) text(tr.demo, 464, y + 16, 10, theme.muted, 100, 'end');
  y += 28;
  if (config.sections.overview.enabled) {
    const values = [number.format(model.gameCount), hours(model.totalMinutes), hours(model.recentMinutes)];
    [tr.games, tr.total, tr.twoWeeks].forEach((label, index) => {
      const x = 16 + index * 151;
      text(values[index]!, x, y + 17, 17, theme.text, 142);
      text(label, x, y + 34, 10, theme.muted, 142);
    });
    y += 40;
  }
  const section = (title: string, detail: string) => {
    rect(16, y, 448, 1, theme.line, 0);
    text(title, 16, y + 21, 14, theme.accent, 245);
    text(detail, 464, y + 20, 10, theme.muted, 185, 'end');
    y += 30;
  };
  const empty = (message: string) => {
    text(message, 16, y + 17, 11, theme.muted, 448);
    y += 32;
  };
  const row = (game: CardGame, detail: string, trailing: string, height: number) => {
    picture(artwork.games.get(game.appid), 16, y + 1, 50, 28, game.appid, 4);
    text(game.name, 76, y + 13, 13, theme.text, 380);
    text(detail, 76, y + 28, 10, theme.muted, trailing ? 235 : 380);
    if (trailing) text(trailing, 464, y + 28, 10, theme.muted, 140, 'end');
    y += height;
  };
  if (config.sections.favorites.enabled) {
    section(tr.favorites, '');
    if (!model.favorites.length) empty(tr.emptyFavorites);
    model.favorites.forEach((game, index) => {
      const x = 16 + (index % 3) * 154;
      const top = y + Math.floor(index / 3) * 124;
      picture(artwork.games.get(game.appid), x, top, 140, 65, game.appid, 4);
      typography.lines(game.name, 12, 140, 2).forEach((line, lineIndex) => {
        text(line, x, top + 81 + lineIndex * 15, 12, theme.text, 140);
      });
      if (game.note) text(game.note, x, top + 113, 10, theme.muted, 140);
    });
    y += Math.ceil(model.favorites.length / 3) * 124;
    y += 6;
  }
  if (config.sections.recent.enabled) {
    section(tr.recent, tr.fortnight);
    if (!model.recent.length) empty(tr.emptyRecent);
    for (const game of model.recent) {
      row(game, hours(game.recentMinutes), `${tr.total} ${hours(game.minutes ?? 0)}`, 38);
    }
    y += 6;
  }
  if (config.sections.most_played.enabled) {
    section(tr.most, tr.lifetime);
    if (!model.mostPlayed.length) empty(tr.emptyMost);
    for (const game of model.mostPlayed) {
      picture(artwork.games.get(game.appid), 16, y, 32, 18, game.appid, 3);
      text(game.name, 58, y + 14, 12, theme.text, 298);
      text(hours(game.minutes ?? 0), 464, y + 14, 11, theme.muted, 100, 'end');
      y += 24;
    }
  }
  const height = y + 12;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="${height}" viewBox="0 0 480 ${height}" role="img"><title>${esc(model.name)} — Steam</title><defs>${defs.join('')}</defs>${parts.join('')}</svg>`;
  const renderer = new Resvg(svg, { font: { fontFiles: [fontPath], loadSystemFonts: false }, fitTo: { mode: 'width', value: 960 } });
  return { png: renderer.render().asPng(), svg, width: 480, height };
}
