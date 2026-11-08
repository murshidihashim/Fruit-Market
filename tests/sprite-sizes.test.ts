import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const sources = walk('src/ui').filter((x) => /\.tsx$/.test(x)).map((f) => readFileSync(f, 'utf8'));

// Since DEC-069 the icons, favour cards and coins are the Great Fruit Exchange drawings (vector, exchangeArt.ts), not
// pixel sprites, so the whole-pixel grid rule no longer applies. They must still be drawn at a readable size: the
// smallest uses (trait badge, tie hint) are 11-12 px, where the simpler small drawings take over.
describe('icon sizes (DEC-069)', () => {
  it('icons are drawn between 11 and 48 px', () => {
    const bad: string[] = [];
    for (const s of sources) {
      for (const m of s.matchAll(/<(Icon|FavourIcon|Coin)\b[^>]*?\bsize=\{(\d+)\}/g)) {
        const n = Number(m[2]);
        if (n < 11 || n > 48) bad.push(`${m[1]} ${n}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('deck-art sizes (DEC-066)', () => {
  it('fruit, portraits and event pictures are drawn at a readable, whole-pixel size', () => {
    const bad: string[] = [];
    for (const s of sources) {
      for (const m of s.matchAll(/<(Fruit|Face|EventIcon)\b[^>]*?\bsize=\{(\d+)\}/g)) {
        const n = Number(m[2]);
        if (n < 14 || n > 128) bad.push(`${m[1]} ${n}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
