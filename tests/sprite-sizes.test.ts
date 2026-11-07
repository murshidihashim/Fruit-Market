import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const sources = walk('src/ui').filter((x) => /\.tsx$/.test(x)).map((f) => readFileSync(f, 'utf8'));

// docs/ART-STYLE.md section 4: pixel sprites use whole multiples of the art grid only. Since DEC-066 the fruit, the
// portraits and the event pictures are the deck art (vector fruit and illustrations), which scale cleanly; the pixel
// rule now covers the sprites that are still pixel art: icons, favour cards and coins.
const ALLOWED: Record<string, number[]> = { icon: [12, 24, 36] };
const KIND: Record<string, string> = { Icon: 'icon', FavourIcon: 'icon', Coin: 'icon' };

// Sizes the screens use today that are not on the list. PLAN-033 fixes them screen by screen and empties this list.
// A new off-list size is not allowed.
const TODAY: Record<string, number[]> = {
  icon: [11, 14, 16, 20, 22, 26, 28, 30, 32, 34, 40],
};

describe('sprite sizes (PLAN-027)', () => {
  const used: Record<string, Set<number>> = { icon: new Set() };
  for (const s of sources) {
    for (const m of s.matchAll(/<(Icon|FavourIcon|Coin)\b[^>]*?\bsize=\{(\d+)\}/g)) used[KIND[m[1]]].add(Number(m[2]));
  }

  it('no new off-list size appears', () => {
    const fresh: string[] = [];
    for (const k of Object.keys(used)) for (const n of used[k]) if (!ALLOWED[k].includes(n) && !TODAY[k].includes(n)) fresh.push(`${k} ${n}`);
    expect(fresh).toEqual([]);
  });

  it('the list of today\'s off-list sizes only shrinks', () => {
    const gone: string[] = [];
    for (const k of Object.keys(TODAY)) for (const n of TODAY[k]) if (!used[k].has(n)) gone.push(`${k} ${n}`);
    // When a size is fixed, remove it from TODAY above; this keeps the list honest.
    expect(gone).toEqual([]);
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
