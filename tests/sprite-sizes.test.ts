import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));

// docs/ART-STYLE.md section 4: whole multiples of the art grid only.
const ALLOWED: Record<string, number[]> = {
  fruit: [14, 28, 42, 56],
  portrait: [18, 36, 54, 72],
  icon: [12, 24, 36],
};
const KIND: Record<string, string> = { Fruit: 'fruit', PixelFruit: 'fruit', Face: 'portrait', Portrait: 'portrait', Icon: 'icon', EventIcon: 'icon', FavourIcon: 'icon', Coin: 'icon' };

// Sizes the screens use today that are not on the list. PLAN-033 fixes them screen by screen and empties this list.
// A new off-list size is not allowed.
const TODAY: Record<string, number[]> = {
  fruit: [16, 18, 20, 22, 26, 30, 40],
  portrait: [20, 22, 24, 26, 30, 32, 34, 44, 64, 96],
  icon: [11, 14, 16, 20, 22, 26, 28, 30, 32, 34, 40, 44],
};

describe('sprite sizes (PLAN-027)', () => {
  const used: Record<string, Set<number>> = { fruit: new Set(), portrait: new Set(), icon: new Set() };
  for (const f of walk('src/ui').filter((x) => /\.tsx$/.test(x))) {
    const s = readFileSync(f, 'utf8');
    for (const m of s.matchAll(/<(Fruit|PixelFruit|Face|Portrait|Icon|EventIcon|FavourIcon|Coin)\b[^>]*?\bsize=\{(\d+)\}/g)) used[KIND[m[1]]].add(Number(m[2]));
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
