import { describe, expect, it } from 'vitest';
import { FRUIT, RIVALS, lookOf, prefOf, type FruitId } from '../src/engine/data';
import { RULES10_CUSTOMERS } from './rules10-cards';
import { beginBuying, bestCap, emptyStock, newGame, type Customer, type GameState } from '../src/engine/game';
import { buyerCap, buyersFor, stallWantText } from '../src/ui/boardModel';
import { endBuying } from './stall-step';

// The Stocking panel's demand and the Price panel's buyer chips (REP-089 3.2). Every case runs on the real engine with
// real customer cards. (The Price panel's "Psst…" read, priceRead, and its tie hint, tieHint, left the screen with
// pricing from the crates, PLAN-059; PLAN-130 removed them and their tests, REP-140 A-04.)

const ROSA = RIVALS[0];
const BENNY = RIVALS[1];
const FRESH = (f: FruitId) => FRUIT[f].ripe.length - 1;
const OKAY = (f: FruitId) => FRUIT[f].ripe.indexOf('okay');
const TIRED = 0;

function buyer(name: string, fruit: FruitId, id: number): Customer {
  // Written with the rules 10 cards (tests/rules10-cards.ts); the reads do not depend on the card numbers.
  const w = { ...RULES10_CUSTOMERS.find((c) => c.name === name)!.wants.find((x) => x.fruit === fruit)! };
  return { id, name, wants: [w], original: [{ ...w }], pref: prefOf(name) };
}

/** Day 1, buying over, these customers in the market (served in this order), empty shelves. Rosa is the Haggler. */
function market(...buyers: [string, FruitId][]): GameState {
  let s = beginBuying(newGame({
    players: [
      { name: 'You', kind: 'human', avatar: '🧑‍🍳' },
      { name: ROSA.name, kind: 'ai', level: 'normal', avatar: ROSA.avatar },
      { name: BENNY.name, kind: 'ai', level: 'normal', avatar: BENNY.avatar },
    ],
    days: 10, unripe: true, upgrades: true, events: false, seed: 7,
  }));
  s = endBuying(s);
  s = structuredClone(s);
  s.firstMarket = buyers.map(([name, f], i) => buyer(name, f, 900 + i));
  s.secondMarket = [];
  s.order = [0, 1, 2];
  s.players[0].trait = null;
  s.players[1].trait = 'haggler';
  s.players[2].trait = 'basket';
  for (const pl of s.players) { pl.stock = emptyStock(true); pl.upgrades = []; pl.favours = []; }
  return s;
}

describe('the Stocking panel counts only orders your fruit can serve', () => {
  it('Premium buyers and okay fruit: "Nobody takes yours"; no orders: "Nobody wants these"', () => {
    const s = market(['Ahmad', 'mango'], ['Sarah', 'apple']);
    s.players[0].stock.mango[OKAY('mango')] = 3;
    s.players[0].stock.blueberry[FRESH('blueberry')] = 1;
    expect(stallWantText(s, 0, 'mango')).toBe('Nobody takes yours');
    expect(stallWantText(s, 0, 'blueberry')).toBe('Nobody wants these');
    s.players[0].stock.mango[FRESH('mango')] = 1;
    expect(stallWantText(s, 0, 'mango')).toBe(`${buyersFor(s, 'mango')[0].w.qty} wanted`);
  });
});

describe('buyer chips', () => {
  it('a Premium buyer your shelf cannot serve reads "fresh only", not "≤$0"', () => {
    const s = market(['Robert', 'mango'], ['Ahmad', 'mango']);
    s.players[0].stock.mango[OKAY('mango')] = 2;
    const [bobby, ahmad] = buyersFor(s, 'mango');
    const chip = buyerCap(s, 0, 'mango', ahmad);
    expect(chip.label).toBe('fresh only');
    expect(chip.title).toBe(`${lookOf('Ahmad').title} wants 5 but buys fresh fruit only.`);
    expect(chip.label).not.toMatch(/\$0/);
    const cap = bestCap(s.players[0].stock, 'mango', bobby.max, s.players[0], 'everyday');
    expect(buyerCap(s, 0, 'mango', bobby)).toMatchObject({ cap, label: `≤$${cap}`, aria: `${lookOf('Robert').title} up to $${cap}` });
  });

  it('an Everyday buyer and only tired fruit reads "fresh or okay"', () => {
    const s = market(['Sarah', 'mango']);
    s.players[0].stock.mango[TIRED] = 2;
    expect(buyerCap(s, 0, 'mango', buyersFor(s, 'mango')[0]).label).toBe('fresh or okay');
  });
});
