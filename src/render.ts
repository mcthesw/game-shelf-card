import { Resvg } from '@resvg/resvg-js';
import type { Config } from './config.js';
import type { CardGame, CardModel } from './model.js';
import type { Artwork } from './artwork.js';
import { escapeXml as esc, Typography } from './text.js';

const themes = {
  dark: { bg: '#111820', panel: '#1a2530', text: '#f0f4f7', muted: '#9babbc', line: '#2c3946', accent: '#9ce6c0', soft: '#233d35', image: '#253746' },
  light: { bg: '#f6f8fa', panel: '#ffffff', text: '#192c3c', muted: '#576c7e', line: '#dde4ea', accent: '#18784e', soft: '#e0f0e6', image: '#cbdde6' },
};
const translations = {
  en: { title: 'A life in games.', identity: 'MY STEAM', favorites: 'All-time favorites', personal: 'Handpicked, not ranked by hours',
    recent: 'Recently played', fortnight: 'Last two weeks', most: 'Most played', lifetime: 'Lifetime playtime',
    games: 'Games in library', total: 'Total playtime', twoWeeks: 'Past two weeks', hours: 'h',
    emptyFavorites: 'Your next favorite belongs here.', emptyRecent: 'A quiet fortnight. The next adventure can wait.',
    emptyMost: 'Every adventure starts with a first hour.', updated: 'Updated', source: 'Data from Steam', demo: 'SAMPLE DATA', picked: 'A personal favorite' },
  'zh-CN': { title: '我的游戏时光', identity: 'MY STEAM', favorites: '我的最爱', personal: '亲自挑选，无关时长',
    recent: '最近在玩', fortnight: '最近两周', most: '玩得最多', lifetime: '累计游玩时长',
    games: '游戏库', total: '累计游玩', twoWeeks: '近两周游玩', hours: '小时',
    emptyFavorites: '下一款最爱，留一个位置。', emptyRecent: '最近两周暂未游玩，下一场冒险可以慢慢来。',
    emptyMost: '每一段冒险，都从第一个小时开始。', updated: '更新于', source: '数据来自 Steam', demo: '示例数据', picked: '特别喜欢的一款' },
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
  const multiline = (value: string, x: number, y: number, size: number, width: number, lines: number, color = theme.text) =>
    typography.lines(value, size, width, lines).forEach((line, index) => text(line, x, y + index * (size + 7), size, color, width));
  const picture = (uri: string | undefined, x: number, y: number, w: number, h: number, seed: number, radius = 10) => {
    const id = `clip${clip++}`;
    defs.push(`<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}"/></clipPath>`);
    if (uri) parts.push(`<image href="${uri}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`);
    else {
      const hue = seed % 360;
      parts.push(`<g clip-path="url(#${id})"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="hsl(${hue},25%,25%)"/><circle cx="${x + w * .8}" cy="${y + h * .25}" r="${h * .7}" fill="hsl(${hue},32%,40%)"/><path d="M${x},${y + h} L${x + w * .42},${y + h * .2} L${x + w},${y + h}Z" fill="hsl(${(hue + 35) % 360},30%,32%)"/></g>`);
    }
  };
  const heading = (title: string, subtitle: string, y: number) => {
    text(title, 36, y + 25, 23);
    text(subtitle, 804, y + 24, 13, theme.muted, 310, 'end');
  };
  const empty = (message: string, y: number): number => {
    rect(36, y, 768, 76, theme.panel, 12, theme.line);
    text(message, 58, y + 45, 16, theme.muted, 724);
    return y + 100;
  };
  // Fixed layout width; PNG is rendered at 2x for crisp README display.
  rect(0, 0, 840, 170, theme.bg, 0);
  picture(artwork.avatar, 36, 34, 64, 64, 145, 20);
  if (!artwork.avatar) text(Array.from(typography.clean(model.name)).slice(0, 1).join('') || 'S', 68, 77, 28, '#fff', 46, 'middle');
  text(tr.identity, 118, 49, 11, theme.accent);
  text(model.name, 118, 86, 29, theme.text, model.demo ? 475 : 650);
  if (model.demo) {
    rect(668, 39, 136, 30, theme.soft, 15);
    text(tr.demo, 736, 59, 11, theme.accent, 118, 'middle');
  }
  text(tr.title, 36, 143, 29);
  let y = 171;
  if (config.sections.overview.enabled) {
    rect(36, y, 768, 88, theme.panel, 14, theme.line);
    const values = [number.format(model.gameCount), hours(model.totalMinutes), hours(model.recentMinutes)];
    [tr.games, tr.total, tr.twoWeeks].forEach((label, index) => {
      const x = 58 + index * 254;
      text(values[index]!, x, y + 38, 25, theme.text, 224);
      text(label, x, y + 65, 12, theme.muted, 224);
      if (index < 2) rect(x + 232, y + 21, 1, 46, theme.line, 0);
    });
    y += 114;
  }
  if (config.sections.favorites.enabled) {
    heading(tr.favorites, tr.personal, y);
    y += 47;
    if (!model.favorites.length) y = empty(tr.emptyFavorites, y);
    else {
      model.favorites.forEach((game, index) => {
        const x = 36 + (index % 3) * 262;
        const top = y + Math.floor(index / 3) * 278;
        rect(x, top, 244, 260, theme.panel, 14, theme.line);
        picture(artwork.games.get(game.appid), x + 8, top + 8, 228, 118, game.appid, 9);
        rect(x + 17, top + 18, 29, 27, '#111820', 8);
        text(String(index + 1).padStart(2, '0'), x + 31.5, top + 37, 11, '#fff', 24, 'middle');
        multiline(game.name, x + 16, top + 153, 17, 212, 2);
        multiline(game.note || tr.picked, x + 16, top + 208, 12, 212, 2, theme.muted);
      });
      y += Math.ceil(model.favorites.length / 3) * 278 + 5;
    }
  }
  if (config.sections.recent.enabled) {
    heading(tr.recent, tr.fortnight, y);
    y += 46;
    if (!model.recent.length) y = empty(tr.emptyRecent, y);
    else {
      const max = model.recent[0]!.recentMinutes;
      model.recent.forEach((game, index) => {
        const x = 36 + (index % 2) * 392;
        const top = y + Math.floor(index / 2) * 88;
        rect(x, top, 376, 76, theme.panel, 11, theme.line);
        picture(artwork.games.get(game.appid), x + 8, top + 8, 100, 60, game.appid, 7);
        text(game.name, x + 120, top + 26, 14, theme.text, 241);
        text(hours(game.recentMinutes), x + 120, top + 49, 12, theme.accent, 240);
        rect(x + 120, top + 60, 240, 3, theme.line, 1.5);
        rect(x + 120, top + 60, Math.max(3, game.recentMinutes / max * 240), 3, theme.accent, 1.5);
      });
      y += Math.ceil(model.recent.length / 2) * 88 + 14;
    }
  }
  if (config.sections.most_played.enabled) {
    heading(tr.most, tr.lifetime, y);
    y += 46;
    if (!model.mostPlayed.length) y = empty(tr.emptyMost, y);
    else {
      model.mostPlayed.forEach((game: CardGame, index: number) => {
        const top = y + index * 62;
        text(String(index + 1).padStart(2, '0'), 38, top + 30, 14, theme.muted, 25);
        picture(artwork.games.get(game.appid), 77, top, 92, 46, game.appid, 7);
        text(game.name, 188, top + 29, 15, theme.text, 445);
        text(hours(game.minutes ?? 0), 803, top + 29, 16, theme.accent, 155, 'end');
        if (index < model.mostPlayed.length - 1) rect(188, top + 49, 616, 1, theme.line, 0);
      });
      y += model.mostPlayed.length * 62 + 13;
    }
  }
  rect(36, y, 768, 1, theme.line, 0);
  text(tr.source, 36, y + 30, 12, theme.muted);
  const date = model.updatedAt.replace('T', ' ').slice(0, 16) + ' UTC';
  text(`${tr.updated} ${date}`, 804, y + 30, 11, theme.muted, 380, 'end');
  const height = y + 56;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="${height}" viewBox="0 0 840 ${height}" role="img"><title>${esc(model.name)} — Steam</title><desc>${esc(tr.title)}</desc><defs>${defs.join('')}</defs><rect width="840" height="${height}" rx="20" fill="${theme.bg}"/>${parts.join('')}</svg>`;
  const renderer = new Resvg(svg, { font: { fontFiles: [fontPath], loadSystemFonts: false }, fitTo: { mode: 'width', value: 1680 } });
  return { png: renderer.render().asPng(), svg, width: 840, height };
}
