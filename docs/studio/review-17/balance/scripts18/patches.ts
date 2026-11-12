// Named variants for the rules 18 checks. Each one changes numbers in the engine's data tables at run time, so the
// same built engine can be measured with and without a "simulate first" item.
// Used as:  --patch name1,name2
// (Constants such as the Nest Egg's cash or the guest rule cannot be patched this way: those variants were run on a
// copy of the source tree with the constant edited; see RULES-18-RESULTS.md.)
import { EVENT_CARDS, FARMER_CARDS, ORDER_CARDS, UPGRADES, type FruitId, type Stalls } from '../../../../../src/engine/data';
import { UPGRADE_RATE } from '../../../../../src/engine/ai';
import { arg } from './harness';

const ev = (id: string) => EVENT_CARDS.find((e) => e.id === id)!;
const lorry = (name: string) => FARMER_CARDS.find((c) => c.name === name)!;
const stakes = (by: Record<FruitId, number>) => { for (const c of ORDER_CARDS) c.stake = by[c.fruit]; };
/** +1 apple in the 3- to 6-stall rows of the five lorries named in the brief (item E, simulate first). */
const APPLE_LORRIES = ['Blueberry Bonanza', 'Mango Rush', 'Tropical Pair', 'Short Load', 'Summer Run'];

export const PATCHES: Record<string, () => void> = {
  // ----- standing orders: the stake (the built rule is blueberry 6, watermelon 8, apple 7, mango 12) -----
  stakeHalf: () => stakes({ blueberry: 3, watermelon: 4, apple: 3, mango: 6 }),
  stakeLow: () => stakes({ blueberry: 4, watermelon: 6, apple: 5, mango: 9 }),
  stakeHigh: () => stakes({ blueberry: 9, watermelon: 12, apple: 10, mango: 18 }),
  mangoStake9: () => { for (const c of ORDER_CARDS) if (c.fruit === 'mango') c.stake = 9; },
  mangoStake8: () => { for (const c of ORDER_CARDS) if (c.fruit === 'mango') c.stake = 8; },
  // ----- fruit and decks -----
  apples: () => { for (const n of APPLE_LORRIES) for (const k of [3, 4, 5, 6] as Stalls[]) lorry(n).table[k].apple += 1; },
  // ----- events -----
  /** Blueberry Glut without the cheaper market price (the rules 17 card). */
  glutPlain: () => { delete ev('glut').costFruit; },
  // ----- upgrades (for what-if rows only) -----
  juice5: () => { UPGRADES.juicebar.cost = 5; },
  /** No computer chooses a Ripening Room, so a seat forced to build one is measured with no rival holding one (PLAN-082). */
  ripeNever: () => { for (const l of ['easy', 'normal', 'hard'] as const) UPGRADE_RATE[l].ripening = 0; },
  barrow5: () => { UPGRADES.barrow.cost = 5; },
};

/** Applies --patch names from the command line; returns a label. */
export function applyVariant(names = arg('patch')): string {
  for (const k of (names ?? '').split(',').filter(Boolean)) {
    if (!PATCHES[k]) throw new Error(`unknown patch ${k}`);
    PATCHES[k]();
  }
  return names || 'rules 18 as built';
}
