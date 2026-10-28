import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { paletteCss, paletteValues } from '../scripts/palette.mjs';

const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const read = (f: string) => readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const HEX = /#[0-9a-fA-F]{3}\b|#[0-9a-fA-F]{6}\b/g;

describe('one palette (PLAN-027)', () => {
  const ts = read('src/ui/palette.ts');

  it('no colour literal outside palette.ts and the generated palette.css', () => {
    const files = walk('src/ui').filter((f) => /\.(ts|tsx|css)$/.test(f) && !/palette\.(ts|css)$/.test(f));
    const bad: string[] = [];
    for (const f of files) read(f).split('\n').forEach((l, i) => { if (!/^\s*(\/\/|\*|\/\*)/.test(l) && HEX.test(l)) bad.push(`${f}:${i + 1}: ${l.trim().slice(0, 80)}`); HEX.lastIndex = 0; });
    expect(bad).toEqual([]);
  });

  it('palette.css is generated from palette.ts', () => {
    expect(read('src/ui/palette.css')).toBe(paletteCss(ts));
  });

  it('every colour in the style guide is in the palette', () => {
    const guide = read('docs/ART-STYLE.md');
    const inPalette = new Set(paletteValues(ts));
    const missing = [...new Set((guide.match(/`#[0-9a-fA-F]{6}`/g) ?? []).map((h) => h.slice(1, -1).toLowerCase()))].filter((h) => !inPalette.has(h));
    expect(missing).toEqual([]);
  });
});
