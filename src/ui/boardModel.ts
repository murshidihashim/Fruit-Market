// Pure helpers for the table: how the market board and the stall chips are laid out.
// Kept free of Preact so they can be unit-tested against the engine's rules.
import { FRUIT, FRUITS, stageAt, type FruitId, type Stage } from '../engine/data';
import { count, walkInsToday, type Customer, type GameState } from '../engine/game';

export interface Slot { pos: number; stage: Stage; n: number }

/** One market column, newest slot first (top) down to the not-so-fresh slot (bottom). */
export function marketColumn(s: GameState, f: FruitId): Slot[] {
  return s.market[f].map((n, pos) => ({ pos, stage: stageAt(f, pos), n })).reverse();
}

/** How long a fruit in this slot still has, in the words shown on its chip. */
export function lifeLabel(f: FruitId, pos: number): string {
  const ripe = FRUIT[f].ripe.length;
  if (pos >= ripe) return `ripens in ${pos - ripe + 1}`;
  if (pos === 0) return 'last day';
  return `${pos} night${pos === 1 ? '' : 's'}`;
}

/** A shop's stock as chips: one per filled slot, grouped by fruit, freshest first. */
export function stockChips(stock: Record<FruitId, number[]>): { f: FruitId; chips: Slot[] }[] {
  return FRUITS.map((f) => ({
    f,
    chips: stock[f].map((n, pos) => ({ pos, stage: stageAt(f, pos), n })).filter((c) => c.n > 0).reverse(),
  }));
}

// ---------- demand vs supply ----------

export interface Pulse { f: FruitId; demand: number; more: boolean; supply: number }
export type Mood = 'none' | 'open' | 'good' | 'war';

/** Fruit customers want today vs ripe fruit sitting in all shops. */
export function pulse(s: GameState): Pulse[] {
  const before = s.phase === 'morning' || s.phase === 'buy';
  const custs: Customer[] = [...s.secondMarket, ...s.firstMarket];
  if (before && s.forecast) custs.push(s.forecast);
  const extra = before ? s.event?.extra?.wants ?? [] : [];
  return FRUITS.map((f) => {
    let demand = 0;
    for (const c of custs) for (const w of c.wants) if (w.fruit === f) demand += Math.max(0, w.qty);
    for (const w of extra) if (w.fruit === f) demand += w.qty;
    const supply = s.players.reduce((a, p) => a + count(p.stock, f, true), 0);
    return { f, demand, more: before && walkInsToday(s) > 0, supply };
  });
}

/** none: nobody wants it; open: wanted and nobody has it; good: enough buyers; war: more stock than buyers. */
export function mood({ demand, supply }: Pulse): Mood {
  return demand === 0 ? 'none' : supply === 0 ? 'open' : supply <= demand ? 'good' : 'war';
}

export function wantText({ demand, more }: Pulse): string {
  return demand ? `${demand}${more ? '+' : ''}` : more ? '?' : '0';
}
