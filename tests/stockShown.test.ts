import { describe, expect, it } from 'vitest';
import { FRUITS, type FruitId } from '../src/engine/data';
import type { DayResult, Stock } from '../src/engine/game';
import { holdStock, releaseStock, removed, sellStock, shelfAt, shownSold, shownStock, soldToday, stockHeld } from '../src/ui/stockShown';

const stock = (o: Partial<Record<FruitId, number[]>>): Stock => Object.fromEntries(FRUITS.map((f) => [f, o[f] ?? [0, 0, 0]])) as Stock;
const total = (s: Stock, f: FruitId) => s[f].reduce((a, b) => a + b, 0);

describe('shelf countdown at the rush (DEC-070)', () => {
  const before = [stock({ apple: [1, 2, 3], mango: [0, 2, 0] }), stock({ apple: [0, 0, 2] })];
  const after = [stock({ apple: [0, 1, 3], mango: [0, 0, 0] }), stock({ apple: [0, 0, 1] })];

  it('works out what the day took off each shelf, position by position', () => {
    expect(removed(before[0], after[0]).apple).toEqual([1, 1, 0]);
    expect(removed(before[0], after[0]).mango).toEqual([0, 2, 0]);
  });

  it('steps from the shelf before the rush to the real shelf, oldest pieces first', () => {
    const d = removed(before[0], after[0]);
    expect(shelfAt(after[0], d, {})).toEqual(before[0]);
    expect(shelfAt(after[0], d, { apple: 1 }).apple).toEqual([0, 2, 3]);
    expect(shelfAt(after[0], d, { apple: 2, mango: 2 })).toEqual(after[0]);
    // Never below the real shelf, even if asked to take more.
    expect(shelfAt(after[0], d, { apple: 9 })).toEqual({ ...after[0], mango: before[0].mango });
  });

  it('holds the shelves back, drops them as customers are served and ends on the real shelves', () => {
    holdStock(before, after);
    expect(stockHeld()).toBe(true);
    expect(shownStock(0, after[0])).toEqual(before[0]);
    expect(shownStock(1, after[1])).toEqual(before[1]);
    sellStock(0, 'mango', 2);
    expect(total(shownStock(0, after[0]), 'mango')).toBe(0);
    expect(total(shownStock(0, after[0]), 'apple')).toBe(6);
    // Two stalls served in the same moment (routine sales settle together) drop together.
    sellStock(0, 'apple', 2);
    sellStock(1, 'apple', 1);
    expect(shownStock(0, after[0])).toEqual(after[0]);
    expect(shownStock(1, after[1])).toEqual(after[1]);
    releaseStock();
    expect(stockHeld()).toBe(false);
    expect(shownStock(0, after[0])).toBe(after[0]);
  });

  it('jumps to the real shelves when released early (Skip)', () => {
    holdStock(before, after);
    sellStock(0, 'apple', 1);
    releaseStock();
    expect(shownStock(0, after[0])).toBe(after[0]);
    sellStock(0, 'apple', 1); // nothing held: ignored
    expect(shownStock(0, after[0])).toBe(after[0]);
  });

  it('counts the pieces still out from the day\'s results', () => {
    const r: DayResult = { favours: [], happy: [], leftAngry: [], movedToWaiting: [], income: [0, 0], spent: [0, 0], lines: [
      { customerId: 1, name: 'A', fruit: 'apple', want: 3, max: 6, offers: [{ player: 0, qty: 2, price: 4, sold: 2, freshness: 2 }, { player: 1, qty: 1, price: 5, sold: 1, freshness: 2 }] },
      { customerId: 2, name: 'B', fruit: 'mango', want: 2, max: 6, offers: [{ player: 0, qty: 2, price: 4, sold: 2, freshness: 1 }] },
    ] };
    expect(soldToday(r, 0, 'apple')).toBe(2);
    expect(soldToday(r, 1, 'apple')).toBe(1);
    expect(shownSold(r, 0, 'apple')).toBe(2); // nothing held: all of today's sales
    holdStock(before, after);
    expect(shownSold(r, 0, 'apple')).toBe(0);
    sellStock(0, 'apple', 2);
    expect(shownSold(r, 0, 'apple')).toBe(2);
    releaseStock();
  });
});
