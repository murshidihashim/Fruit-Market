// The freshness words and the freshness price rule as the screens say them, both read from the engine's data (PLAN-123,
// REP-140 A-03), so a rule change cannot leave old words or numbers behind. A file of its own so the fruit pictures,
// the tickets and the panels can all read it without importing each other.
import { FRUIT, type FruitId, type Stage } from '../engine/data';

export { STAGE_WORD } from '../engine/data';

/** A freshness a piece can be sold at (Green fruit cannot be sold). */
export type Ripe = Exclude<Stage, 'unripe'>;

/** Dollars a customer takes off the card price for a piece of fruit `f` at this freshness: the engine's FRUIT[f].drop
 *  at that freshness's box (the engine's own capAt reads the same numbers). */
export function stageLess(stage: Ripe, f: FruitId): number {
  const d = FRUIT[f];
  return d.drop[d.ripe.indexOf(stage)];
}

/** What Okay and Soft fruit pay less than Fresh on the card legends and the rules pages. The same for every fruit
 *  (rules 4; tests/stage-words.test.ts checks it), so they are read from one. */
export const OKAY_LESS = stageLess('okay', 'apple');
export const SOFT_LESS = stageLess('notso', 'apple');
