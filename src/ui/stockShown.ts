// The shelves drawn on the table while a day's sales play out (DEC-070). The game works out every sale at the bell, so
// the real shelves are already final; like the cash (cashShown.ts), this holds each shelf back at what it was before
// the rush and takes each customer's pieces off as that customer is served. It only changes what is drawn, never the
// game. Skip, the fast setting and reduced motion show the real (final) shelves straight away.
import { useEffect, useState } from 'preact/hooks';
import { FRUITS, type FruitId } from '../engine/data';
import type { DayResult, Stock } from '../engine/game';
import { shownShelf } from './tableShown';

type Sold = Record<FruitId, number>;
interface Hold { final: Stock[]; delta: Stock[]; sold: Sold[] }

let held: Hold | null = null;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((l) => l());

const none = (): Sold => Object.fromEntries(FRUITS.map((f) => [f, 0])) as Sold;

/**
 * A shelf part-way through the rush: the final shelf plus the pieces not yet sold. Sales take the oldest pieces first
 * (as the rules do), so `sold` pieces of each fruit come off the oldest end of what the day removed (`delta`).
 */
export function shelfAt(final: Stock, delta: Stock, sold: Partial<Sold>): Stock {
  const out = {} as Stock;
  for (const f of FRUITS) {
    let gone = sold[f] ?? 0;
    out[f] = final[f].map((n, pos) => {
      const d = delta[f][pos] ?? 0;
      const take = Math.min(d, gone);
      gone -= take;
      return n + d - take;
    });
  }
  return out;
}

/** What the day removed from a shelf, position by position (never negative). */
export function removed(before: Stock, after: Stock): Stock {
  const out = {} as Stock;
  for (const f of FRUITS) out[f] = after[f].map((n, pos) => Math.max(0, (before[f]?.[pos] ?? 0) - n));
  return out;
}

/** Pieces of a fruit a stall sold today, from the day's results (public after the bell). */
export function soldToday(r: DayResult | null | undefined, player: number, f: FruitId): number {
  if (!r) return 0;
  let n = 0;
  for (const l of r.lines) if (l.fruit === f) for (const o of l.offers) if (o.player === player) n += o.sold;
  return n;
}

/** Starts drawing each stall's shelf as it was before the rush (`before`), while the real shelves are `after`. */
export function holdStock(before: Stock[], after: Stock[]): void {
  held = { final: after, delta: after.map((a, p) => removed(before[p], a)), sold: after.map(none) };
  changed();
}

/** Shows the real shelves again (the end of the rush, Skip). */
export function releaseStock(): void {
  if (!held) return;
  held = null;
  changed();
}

/** A customer has been served: `n` pieces of `f` come off `player`'s shelf. */
export function sellStock(player: number, f: FruitId, n: number): void {
  if (!held || n <= 0 || !held.sold[player]) return;
  held.sold[player][f] += n;
  changed();
}

/** Whether the shelves are being held back now. */
export const stockHeld = (): boolean => held !== null;

/** The shelf to draw for a stall right now. While a bought piece is on its way it is not on the shelf yet (PLAN-085,
 *  tableShown.ts): the shelf's number rises as the piece lands. */
export function shownStock(player: number, real: Stock): Stock {
  if (!held || !held.final[player]) return shownShelf(player, real);
  return shownShelf(player, shelfAt(held.final[player], held.delta[player], held.sold[player]));
}

/** Pieces of a fruit a stall has sold so far as drawn (all of today's sales when nothing is held back). */
export function shownSold(r: DayResult | null | undefined, player: number, f: FruitId): number {
  const all = soldToday(r, player, f);
  if (!held || !held.sold[player]) return all;
  return Math.min(all, held.sold[player][f]);
}

/** Redraws the calling component whenever the shown shelves change. */
export function useStockShown(): void {
  const [, set] = useState(0);
  useEffect(() => {
    const l = () => set((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
}
