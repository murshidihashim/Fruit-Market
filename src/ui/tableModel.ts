// Pure helpers for the table (PLAN-085): where the lorry puts its crates, how far the night slides every piece, how
// tall the customer row is. Kept free of Preact so they can be unit-tested against the engine's rules.
import { FRUIT, deliveryPos, freshPos, stageAt, type FruitId, type Stage } from '../engine/data';
import type { Customer, GameState, Stock } from '../engine/game';
import { LANES, todaysLorry } from './boardModel';

// ---------- the lorry ----------

/** One crate the lorry unloads: `n` pieces of a fruit into one box of its lane. */
export interface CrateDrop { f: FruitId; pos: number; n: number; stage: Stage }

/**
 * Where today's lorry put its load, one crate for each box it filled, in lane order: the Green box for fruit that
 * arrives green, the freshest Okay box for the Seconds Lorry, the Fresh box otherwise and for an event's extra ripe
 * pieces (Mango Windfall). The game keeps what was unloaded, not the card, so the Seconds Lorry is known from the card
 * when it can be told (boardModel.todaysLorry) and from the lanes when it cannot: a load that is not in the Fresh box
 * went into the Okay box.
 */
export function deliveryBoxes(s: GameState): CrateDrop[] {
  if (s.event?.noDelivery) return [];
  const card = todaysLorry(s);
  const out: CrateDrop[] = [];
  for (const f of LANES) {
    const n = s.delivery?.[f] ?? 0;
    if (n <= 0) continue;
    const ripe = Math.min(n, s.deliveryRipe?.[f] ?? 0);
    const fresh = freshPos(f);
    const okay = FRUIT[f].ripe.lastIndexOf('okay');
    const pos = s.deliveryUnripe === f ? s.market[f].length - 1
      : card ? deliveryPos(card, f)
      : (s.market[f][fresh] ?? 0) >= n || okay < 0 ? fresh : okay;
    if (n - ripe > 0) out.push({ f, pos, n: n - ripe, stage: stageAt(f, pos) });
    if (ripe > 0) out.push({ f, pos: fresh, n: ripe, stage: stageAt(f, fresh) });
  }
  return out;
}

/** The market as it stood before today's lorry unloaded: what the lanes show until the crates land. */
export function marketBefore(s: GameState): Stock {
  const out = Object.fromEntries(LANES.map((f) => [f, [...s.market[f]]])) as Stock;
  for (const c of deliveryBoxes(s)) out[c.f][c.pos] = Math.max(0, (out[c.f][c.pos] ?? 0) - c.n);
  return out;
}

// ---------- the night ----------

/** Boxes every piece slides tonight: one; two in a Heatwave; none in a Monsoon. */
export const nightSteps = (s: GameState): number => Math.max(0, 1 + (s.event?.ageExtra ?? 0));

// ---------- the customer row ----------

/** The most fruit rows on any of today's tickets (never under two), so the row keeps one height all day. */
export function ticketLines(cards: (Pick<Customer, 'wants'> | null | undefined)[]): number {
  return Math.max(2, ...cards.map((c) => c?.wants.length ?? 0));
}
