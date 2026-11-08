// Pure helpers for the table: how the market board and the stall chips are laid out.
// Kept free of Preact so they can be unit-tested against the engine's rules.
import { FRUITS, slotLife, stageAt, type FruitId, type Stage } from '../engine/data';
import { count, isMarketDay, nightOutlook, printedSupply, walkInsToday, type Customer, type GameState } from '../engine/game';

export interface Slot { pos: number; stage: Stage; n: number }

/** One market column, newest slot first (top) down to the not-so-fresh slot (bottom). */
export function marketColumn(s: GameState, f: FruitId): Slot[] {
  return s.market[f].map((n, pos) => ({ pos, stage: stageAt(f, pos), n })).reverse();
}

/** How long a fruit in this slot still has, in the words shown on its chip. */
export function lifeLabel(f: FruitId, pos: number): string {
  return slotLife(f, pos);
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

/** Tomorrow's farmer delivery: the amounts printed on the card (more than one per shop is shown in bold). */
export interface LorryLine { f: FruitId; plenty: boolean; green: boolean; n: number }
export function nextLorry(s: GameState): LorryLine[] | null {
  const card = s.nextFarmer;
  if (!card) return null;
  return FRUITS.map((f) => {
    const n = printedSupply(card, f, s.players.length);
    return { f, plenty: n > s.players.length, green: !!s.config.unripe && card.unripe === f, n };
  });
}

/** The name printed on tomorrow's lorry card. */
export function nextLorryName(s: GameState): string | null {
  return s.nextFarmer?.name ?? null;
}

/** Tomorrow is a Market Day: one more walk-in (the lorry still comes). */
export function marketDayTomorrow(s: GameState): boolean {
  return s.day < s.config.days && isMarketDay(s, s.day + 1);
}

/**
 * Fruit in a shop that really spoils tonight, by the night's own rules: none on a Cold Room's odd nights, one more
 * step in a Heatwave, and up to 3 pieces become juice instead with a Juice Bar (those are not counted here).
 */
export function spoilsTonight(s: GameState, p: number): number {
  return nightOutlook(s, p).spoil;
}
