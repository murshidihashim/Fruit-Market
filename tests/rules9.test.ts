import { describe, expect, it } from 'vitest';
import {
  BARGAIN_CUSTOMERS, BARROW_BUY, BARROW_SHELF, BASE_BUY, BASE_SHELF, CUSTOMER_CARDS, EVENT_CARDS, FARMER_CARDS, PREMIUM_CUSTOMERS, START_CASH,
  acceptsStage, prefOf,
} from '../src/engine/data';
import { aiStep } from '../src/engine/ai';
import { beginBuying, buyLimit, effectiveMax, eligible, endEvening, finishReveal, maxPrice, newGame, validatePrices, type GameState } from '../src/engine/game';

const humans = (n: number) => ({ players: Array.from({ length: n }, (_, i) => ({ name: `P${i}`, kind: 'human' as const, avatar: '' })), days: 10, unripe: true, upgrades: true, events: true, seed: 11 });
const card = (name: string) => CUSTOMER_CARDS.find((c) => c.name === name)!;
const want = (name: string, fruit: string) => card(name).wants.find((w) => w.fruit === fruit);

/** Ends the evening for both shops of a two-shop game, which runs the night and starts the next day. */
const nextDay = (s: GameState): GameState => {
  s.phase = 'evening';
  s.turn = 0;
  s.order = [0, 1];
  return endEvening(endEvening(s, 0), 1);
};

describe('rules 9: cash, buying and shelf', () => {
  it('starts with $15, buys 6 a day, holds 8; Handcart buys 8 and holds 12', () => {
    expect([START_CASH, BASE_BUY, BASE_SHELF, BARROW_BUY, BARROW_SHELF]).toEqual([15, 6, 8, 8, 12]);
    const s = newGame(humans(2));
    expect(s.players.every((p) => p.cash === 15)).toBe(true);
    expect(buyLimit({ ...s.players[0], trait: null, upgrades: ['barrow'] })).toBe(8);
    expect(buyLimit({ ...s.players[0], trait: 'basket', upgrades: [] })).toBe(7);
  });
});

describe('rules 9: customer deck', () => {
  it('has the finalised quantities and prices', () => {
    expect(want('Robert', 'blueberry')!.qty).toBe(4);
    expect(want('Robert', 'mango')!.qty).toBe(1);
    expect(want('Hui Min', 'mango')).toBeUndefined();
    expect(want('Hock Seng', 'mango')).toBeUndefined();
    expect(want('Yuki', 'watermelon')).toMatchObject({ qty: 1, max: 7 });
    expect(want('Yuki', 'mango')!.qty).toBe(2);
    expect(want('Ravi', 'apple')!.qty).toBe(2);
    expect(want('Siti', 'watermelon')!.qty).toBe(3);
    expect(want('Kenji', 'watermelon')!.qty).toBe(2);
    // Apples $1 lower and mangoes $1 higher than the rules 8 deck (Daniel: apple 7 -> 6, mango 10 -> 11); blueberry unchanged.
    expect(want('Daniel', 'apple')!.max).toBe(6);
    expect(want('Daniel', 'mango')!.max).toBe(11);
    expect(want('Daniel', 'blueberry')!.max).toBe(5);
  });

  it('gives each regular a freshness type: 6 Premium, 6 Bargain, 24 Everyday', () => {
    const names = CUSTOMER_CARDS.map((c) => c.name);
    expect(names.filter((n) => prefOf(n) === 'premium').sort()).toEqual(['Ahmad', 'Anna', 'Devi', 'Lina', 'Ravi', 'Rara Jenab'].sort());
    expect(names.filter((n) => prefOf(n) === 'bargain').sort()).toEqual(['Kumar', 'Hafiz', 'Farid', 'Mei Ling', 'Grace', 'Wei Jie'].sort());
    expect(names.filter((n) => prefOf(n) === 'everyday')).toHaveLength(24);
    expect(PREMIUM_CUSTOMERS).toContain('Influencer');
    expect(BARGAIN_CUSTOMERS).toHaveLength(6);
  });

  it('Premium buys Fresh only, Everyday Fresh or Okay, Bargain any ripe fruit', () => {
    for (const [pref, okay, tired] of [['premium', false, false], ['everyday', true, false], ['bargain', true, true]] as const) {
      expect([acceptsStage(pref, 'fresh'), acceptsStage(pref, 'okay'), acceptsStage(pref, 'notso')]).toEqual([true, okay, tired]);
    }
    expect(acceptsStage('bargain', 'unripe')).toBe(false);
  });

  it('a shop only hands over fruit the customer accepts', () => {
    const s = newGame(humans(2));
    const pl = s.players[0];
    pl.stock.apple = [1, 1, 0, 0, 0, 0, 1]; // one tired, one okay, one fresh
    const take = (pref: 'premium' | 'everyday' | 'bargain') => eligible(pl, pl.stock, 'apple', 3, 1, 9, pref).length;
    expect([take('premium'), take('everyday'), take('bargain')]).toEqual([1, 2, 3]);
  });
});

describe('rules 9: events', () => {
  const ev = (id: string) => EVENT_CARDS.find((e) => e.id === id)!;

  it('has 13 events with the finalised effects', () => {
    expect(EVENT_CARDS).toHaveLength(13);
    expect(ev('festival')).toMatchObject({ priceAll: 1, walkIns: 1 });
    expect(ev('heatwave')).toMatchObject({ price: { watermelon: 2 }, ageExtra: 1 });
    expect(ev('blight')).toMatchObject({ noFruit: 'apple', price: { apple: 2 } });
    expect(ev('mangoCraze').price).toEqual({ mango: 2 });
    expect(ev('mangoCraze').extra!.wants).toEqual([{ fruit: 'mango', qty: 2, max: 12, fixed: true }]);
    expect(ev('superfood').extra!.wants).toEqual([{ fruit: 'blueberry', qty: 3, max: 8, fixed: true }]);
    expect(ev('goodHarvest')).toMatchObject({ supplyPerTwo: 1, priceAll: -1 });
    expect(ev('badHarvest')).toMatchObject({ supplyMult: 0.5, priceAll: 1 });
    expect(ev('priceControls').maxPrice).toEqual({ blueberry: 5, watermelon: 7, apple: 6, mango: 8 });
    expect(ev('inspector').inspector).toBe(2);
    expect(ev('hotel').extra!.wants.map((w) => [w.fruit, w.qty, w.max])).toEqual([['apple', 2, 8], ['watermelon', 1, 8], ['blueberry', 1, 7]]);
    expect(prefOf('Influencer')).toBe('premium');
    expect(prefOf('Gym Club')).toBe('everyday');
    expect(prefOf('Hotel Chef')).toBe('everyday');
  });

  it('event customers keep their printed final price', () => {
    const s = newGame(humans(2));
    s.event = ev('mangoCraze');
    expect(effectiveMax(s, s.event.extra!.wants[0])).toBe(12);
    expect(effectiveMax(s, { fruit: 'mango', qty: 1, max: 9 })).toBe(11);
  });

  it("Price Controls refuses a price above the day's maximum", () => {
    const s = newGame(humans(2));
    s.event = ev('priceControls');
    s.players[0].stock.mango[3] = 1;
    s.stalls = [{ mango: 1 }, {}];
    expect(maxPrice(s, 'mango')).toBe(8);
    expect(validatePrices(s, 0, [{ fruit: 'mango', price: 9 }])).toMatch(/Price Controls/);
    expect(validatePrices(s, 0, [{ fruit: 'mango', price: 8 }])).toBeNull();
  });

  it('Health Inspector fines tired fruit at the start of the day, with no Cold Room immunity', () => {
    let s = newGame(humans(2));
    s.players[0].upgrades.push('coldroom');
    s.day = 2; // an even day: the Cold Room ages fruit tonight
    s.players[0].stock.apple[1] = 2; // becomes tired overnight
    s.players[1].stock.apple[1] = 1;
    s.nextEvent = ev('inspector');
    const before = s.players.map((p) => p.cash);
    s = nextDay(s);
    expect(s.event?.id).toBe('inspector');
    expect(s.phase).toBe('morning');
    expect(s.dayFines).toEqual([4, 2]);
    expect(s.players.map((p, i) => before[i] - p.cash)).toEqual([4, 2]);
  });
});

describe('rules 9: lorry cards', () => {
  it('Mango Season arrives green and is not for sale until it ripens', () => {
    let s = newGame(humans(2));
    s.nextFarmer = FARMER_CARDS.find((c) => c.name === 'Mango Season')!;
    s = nextDay(s);
    expect(s.deliveryUnripe).toBe('mango');
  });
});

describe('rules 9: computer shops follow the rules', () => {
  it('play whole games on every size without breaking a rule', () => {
    for (const n of [2, 3, 4]) for (const seed of [1, 2, 3]) {
      let s = newGame({ ...humans(n), seed, players: Array.from({ length: n }, (_, i) => ({ name: `C${i}`, kind: 'ai' as const, level: 'hard' as const, avatar: '' })) });
      for (let i = 0; i < 20000 && s.phase !== 'over'; i++) {
        if (s.phase === 'morning') s = beginBuying(s);
        else if (s.phase === 'reveal') s = finishReveal(s);
        else s = aiStep(s)!;
      }
      expect(s.phase).toBe('over');
    }
  });
});
