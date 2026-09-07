import { openSync, type Font } from 'fontkit';

export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!);
}

export class Typography {
  readonly font: Font;
  constructor(path: string) {
    const font = openSync(path);
    if (!('layout' in font)) throw new Error('Expected a single font file.');
    this.font = font;
  }
  clean(value: string): string {
    return Array.from(value.replace(/[\p{Cc}\p{Cf}]/gu, ' ').replace(/\s+/g, ' ').trim())
      .map(character => this.font.hasGlyphForCodePoint(character.codePointAt(0)!) ? character : '?').join('');
  }
  width(value: string, size: number): number {
    return this.font.layout(value).positions.reduce((sum, position) => sum + position.xAdvance, 0) / this.font.unitsPerEm * size;
  }
  fit(value: string, size: number, width: number): string {
    const text = this.clean(value);
    if (this.width(text, size) <= width) return text;
    const chars = Array.from(text);
    while (chars.length && this.width(chars.join('') + '…', size) > width) chars.pop();
    return chars.join('') + '…';
  }
  lines(value: string, size: number, width: number, limit: number): string[] {
    let rest = this.clean(value);
    const lines: string[] = [];
    while (rest && lines.length < limit) {
      if (lines.length === limit - 1) { lines.push(this.fit(rest, size, width)); break; }
      if (this.width(rest, size) <= width) { lines.push(rest); break; }
      const chars = Array.from(rest);
      let end = 1;
      while (end < chars.length && this.width(chars.slice(0, end + 1).join(''), size) <= width) end++;
      const candidate = chars.slice(0, end).join('');
      const space = candidate.lastIndexOf(' ');
      const split = space > candidate.length / 2 ? Array.from(candidate.slice(0, space)).length : end;
      lines.push(chars.slice(0, split).join('').trim());
      rest = chars.slice(split).join('').trim();
    }
    return lines;
  }
}
