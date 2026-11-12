// What the table shows while a piece is on its way (PLAN-085; flow study, review-18, D1: numbers change when the thing
// lifts off or lands, not before). The game has already made each change: the lorry's load is in the lanes from dawn,
// a bought piece is on the shelf at the tap, the walk-ins are face up the moment the last stall has bought. Like the
// cash (cashShown.ts) and the rush (stockShown.ts, rushShown.ts), this holds what is drawn back at what it was and
// lets it go piece by piece: a box's number as a piece lifts out of it or a crate lands in it, a shelf's and a
// stall's "bought today" marks as the piece lands, a walk-in's face as its card turns. It only changes what is drawn,
// never the game, and it is let go as each beat ends.
import { useEffect, useState } from 'preact/hooks';
import type { FruitId } from '../engine/data';
import type { Stock } from '../engine/game';
import { FEEL, wait } from './motion';

/** How a held-back number differs from the real one, by "<fruit>:<box>". */
type Offsets = Map<string, number>;

interface Hold {
  market: Offsets;
  /** Each stall's shelf, and its marks for what it bought today (by fruit alone, under "<fruit>"). */
  shelf: Map<number, Offsets>;
  bought: Map<number, Offsets>;
  /** Walk-ins that are arriving: 'down' until the card's turn, 'out' while its back turns away, 'up' once its face shows. */
  cards: Map<number, 'down' | 'out' | 'up'>;
}

let held: Hold | null = null;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((l) => l());

const at = (f: FruitId, pos: number) => `${f}:${pos}`;
const bump = (m: Offsets, k: string, by: number) => { const n = (m.get(k) ?? 0) + by; if (n) m.set(k, n); else m.delete(k); };
const of = (m: Map<number, Offsets>, p: number): Offsets => { let o = m.get(p); if (!o) { o = new Map(); m.set(p, o); } return o; };
const hold = (): Hold => (held ??= { market: new Map(), shelf: new Map(), bought: new Map(), cards: new Map() });

/** Shows everything as it really is again (the end of a beat, leaving the table). */
export function releaseTable(): void {
  if (!held) return;
  held = null;
  changed();
}

/** Whether anything on the table is being held back now. */
export const tableHeld = (): boolean => held !== null;

// ---------- the lanes ----------

/** A box of the market is drawn with `by` more pieces than it really holds (fewer when negative), until let go. */
export function shiftMarket(f: FruitId, pos: number, by: number): void {
  if (!by) return;
  bump(hold().market, at(f, pos), by);
  changed();
}

/** A crate has landed: the box's number counts up by `n`, a piece at a time (in bigger steps for a large crate). */
export async function countMarket(f: FruitId, pos: number, n: number): Promise<void> {
  const mine = held;
  if (!mine || n <= 0) return;
  const steps = Math.min(n, Math.floor(FEEL.countMax / FEEL.countStep));
  let left = n;
  for (let i = 0; i < steps; i++) {
    if (held !== mine) return; // the real numbers are showing again
    const part = Math.ceil(left / (steps - i));
    left -= part;
    bump(mine.market, at(f, pos), part);
    changed();
    if (i < steps - 1) await wait(FEEL.countStep);
  }
}

/** The market to draw right now. The same lanes (not a copy) when nothing is held back. */
export function shownMarket(real: Stock): Stock {
  if (!held || !held.market.size) return real;
  const m = held.market;
  return Object.fromEntries((Object.keys(real) as FruitId[]).map((f) => [f, real[f].map((n, pos) => Math.max(0, n + (m.get(at(f, pos)) ?? 0)))])) as Stock;
}

// ---------- a shelf, and what a stall bought today ----------

/** A stall's shelf is drawn with `by` more pieces in a box than it holds (fewer when negative), until let go. */
export function shiftShelf(player: number, f: FruitId, pos: number, by: number): void {
  if (!by) return;
  bump(of(hold().shelf, player), at(f, pos), by);
  changed();
}

/** The shelf to draw for a stall right now. The same shelf (not a copy) when nothing of it is held back. */
export function shownShelf(player: number, real: Stock): Stock {
  const m = held?.shelf.get(player);
  if (!m || !m.size) return real;
  return Object.fromEntries((Object.keys(real) as FruitId[]).map((f) => [f, real[f].map((n, pos) => Math.max(0, n + (m.get(at(f, pos)) ?? 0)))])) as Stock;
}

/** A stall's "bought today" marks are drawn with `by` more pieces of a fruit than it bought (fewer when negative). */
export function shiftBought(player: number, f: FruitId, by: number): void {
  if (!by) return;
  bump(of(hold().bought, player), f, by);
  changed();
}

/** How many pieces of a fruit to draw among a stall's purchases right now (`real`: how many it has bought). */
export function shownBought(player: number, f: FruitId, real: number): number {
  return Math.max(0, real + (held?.bought.get(player)?.get(f) ?? 0));
}

/** How many pieces a stall has bought today as drawn (`real`: the game's count). */
export function shownBoughtCount(player: number, real: number): number {
  let by = 0;
  for (const n of held?.bought.get(player)?.values() ?? []) by += n;
  return Math.max(0, real + by);
}

// ---------- the customers arrive ----------

/** These walk-ins have arrived and are still drawn face down, each until its card is turned. */
export function holdCards(ids: number[]): void {
  if (!ids.length) return;
  const h = hold();
  for (const id of ids) h.cards.set(id, 'down');
  changed();
}

/** A walk-in's card turns: its back turns away ('out'), then its face shows ('up'). */
export function turnCard(id: number, to: 'out' | 'up'): void {
  if (!held || !held.cards.has(id)) return;
  held.cards.set(id, to);
  changed();
}

/** How an arriving walk-in is drawn right now (undefined: nothing is held back, so as it really is). */
export const cardShown = (id: number): 'down' | 'out' | 'up' | undefined => held?.cards.get(id);

/** Redraws the calling component whenever something held back on the table changes. */
export function useTableShown(): void {
  const [, set] = useState(0);
  useEffect(() => {
    const l = () => set((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
}
