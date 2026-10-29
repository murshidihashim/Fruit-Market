// Rules version 4 (PLAN-014 + PLAN-015, REP-031/032): printed supply and demand, the face-down queue,
// Market Days and Last Call, open stalls and posted prices, ties, specialities and Market Gossip.
import { describe, expect, it } from 'vitest';
import { autoplay } from '../src/engine/ai';
import { EVENT_CARDS, FARMER_CARDS, FAVOUR_DECK, FRUIT, STREET_PRICE, TRAITS, type FruitId } from '../src/engine/data';
import {
  applyAction, beginBuying, effectiveMax, endBuyTurn, finishReveal, isDraftNight, isMarketDay, newGame, openStall,
  playFavour, printedSupply, servingCustomers, submitPrices, walkInsOn,
  type GameConfig, type GameState,
} from '../src/engine/game';
import { RULES_VERSION } from '../src/net/protocol';
import { dailyBoardKey } from '../server/meta';

const humans = (n: number, seed = 5, extra: Partial<GameConfig> = {}): GameConfig => ({
  players: Array.from({ length: n }, (_, i) => ({ name: `H${i}`, kind: 'human' as const, avatar: 'a' })),
  days: 10, unripe: true, upgrades: true, events: false, seed, ...extra,
});
const ais = (n: number, seed = 5, extra: Partial<GameConfig> = {}): GameConfig => ({
  ...humans(n, seed, extra), players: Array.from({ length: n }, (_, i) => ({ name: `A${i}`, kind: 'ai' as const, level: 'hard' as const, avatar: 'a' })),
});

/** Two people at the stall phase on day 1 with a known crowd: one customer wanting 3 apples at $8. */
function duel(extra: Partial<GameConfig> = {}): GameState {
  let s = beginBuying(newGame(humans(2, 11, extra)));
  s = endBuyTurn(s, s.order[0]);
  s = endBuyTurn(s, s.order[1]);
  s = structuredClone(s);
  s.firstMarket = [{ id: 900, name: 'Tester', wants: [{ fruit: 'apple', qty: 3, max: 8 }], original: [{ fruit: 'apple', qty: 3, max: 8 }] }];
  s.secondMarket = [];
  for (const pl of s.players) { pl.trait = null; pl.stock = { blueberry: [0, 0, 0], watermelon: [0, 0, 0, 0, 0, 0], apple: [0, 0, 0, 0, 0, 0, 0], mango: [0, 0, 0, 0, 0, 0] }; }
  return s;
}
const fresh = (f: FruitId) => FRUIT[f].ripe.length - 1;

describe('printed supply and demand', () => {
  it('farmer cards are printed for 3 shops: 2 shops one less of each listed fruit, 4 shops one more of everything', () => {
    const card = FARMER_CARDS[0];
    const listed = Object.keys(card.supply)[0] as FruitId;
    const missing = (['blueberry', 'watermelon', 'apple', 'mango'] as FruitId[]).find((f) => card.supply[f] === undefined)!;
    expect(printedSupply(card, listed, 3)).toBe(card.supply[listed]);
    expect(printedSupply(card, listed, 2)).toBe(Math.max(1, card.supply[listed]! - 1));
    expect(printedSupply(card, listed, 4)).toBe(card.supply[listed]! + 1);
    expect(printedSupply(card, missing, 3)).toBe(1);
    expect(printedSupply(card, missing, 2)).toBe(1);
    expect(printedSupply(card, missing, 4)).toBe(2);
    for (const c of FARMER_CARDS) for (const n of Object.values(c.supply)) expect(n).toBeGreaterThanOrEqual(2);
  });

  it('walk-ins: players - 2 every day (rules 5), +1 on Market Days', () => {
    const s = newGame(humans(3));
    expect(walkInsOn(s, 1, null)).toBe(1);
    expect(walkInsOn(s, 3, null)).toBe(2); // Market Day
    expect(walkInsOn(s, 7, null)).toBe(1); // no extra walk-in in the second half
    expect(walkInsOn(s, 9, null)).toBe(2); // Market Day
    expect(walkInsOn(newGame(humans(2)), 1, null)).toBe(0);
    expect(walkInsOn(newGame(humans(4)), 10, null)).toBe(2);
  });

  it('customer orders are used as printed (no scaling)', () => {
    const s = newGame(humans(3));
    expect(s.forecast!.wants.map((w) => w.qty)).toEqual(s.forecast!.original.map((w) => w.qty));
  });

  it('every fruit loses $1 when okay and $2 when not so', () => {
    for (const f of ['blueberry', 'watermelon', 'apple', 'mango'] as FruitId[]) {
      FRUIT[f].ripe.forEach((st, i) => expect(FRUIT[f].drop[i]).toBe(st === 'fresh' ? 0 : st === 'okay' ? 1 : 2));
    }
  });
});

describe('the queue and Market Gossip', () => {
  it('tomorrow\'s walk-ins are drawn a day early, face down; Gossip lets only its player see them', () => {
    let s = newGame(ais(3, 4, { events: false }));
    s.players[1].kind = 'human';
    // Run to the evening of day 1 (or the next morning when no evening is needed).
    for (let i = 0; i < 500 && !(s.phase === 'evening' || (s.day === 2 && s.phase === 'morning')); i++) {
      if (s.phase === 'morning') s = beginBuying(s);
      else if (s.phase === 'reveal') s = finishReveal(s);
      else if (s.players[1].kind === 'human' && (s.phase === 'stall' || s.phase === 'bid' || s.phase === 'buy') && (s.phase === 'buy' ? s.order[s.turn] === 1 : (s.phase === 'stall' ? s.stalls[1] === null : s.bids[1] === null)) && (s.phase === 'buy' || s.stalls.findIndex((x) => x === null) === 1 || s.bids.findIndex((x) => x === null) === 1)) {
        s = s.phase === 'buy' ? endBuyTurn(s, 1) : s.phase === 'stall' ? openStall(s, 1, {}) : submitPrices(s, 1, []);
      } else s = autoplay(s, 1);
    }
    expect(s.queue.every((c) => c.walkIn)).toBe(true);
    expect(s.queue.length).toBe(walkInsOn(s, 2, s.nextEvent));
    if (s.phase === 'evening' && s.queue.length) {
      const t = structuredClone(s);
      t.players[1].favours = ['gossip'];
      t.turn = t.order.indexOf(1);
      const after = playFavour(t, 1, 0);
      expect(after.queue.every((c) => c.seenBy!.includes(1))).toBe(true);
      expect(after.queue.some((c) => c.seenBy!.includes(0))).toBe(false);
    }
  });

  it('Market Gossip replaces Free Cash in the favour deck', () => {
    expect(FAVOUR_DECK.filter((f) => f === 'gossip').length).toBe(2);
    expect(FAVOUR_DECK).not.toContain('freeCash' as never);
  });
});

describe('Market Days, Last Call and the draft', () => {
  it('Market Days fall on days 3, 6, 9 (never the last day): the lorry still comes (rules 5); specialities follow them', () => {
    const s = newGame(humans(3));
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((d) => isMarketDay(s, d))).toEqual([3, 6, 9]);
    expect([1, 2, 3, 6, 9, 10].filter((d) => isDraftNight(s, d))).toEqual([3, 6, 9]);
    const off = newGame(humans(3, 5, { marketDays: false }));
    expect(isMarketDay(off, 3)).toBe(false);
    expect(isDraftNight(off, 3)).toBe(true);
    let g = autoplay(newGame(ais(3, 8, { events: false })), 1);
    while (!(g.day === 3 && g.phase === 'morning')) g = autoplay(g, 1);
    expect(Object.keys(g.delivery).length).toBeGreaterThan(0);
  });

  it('Last Call: customers pay $1 more on the final day and the jam maker buys leftovers at $1', () => {
    let s = newGame(ais(2, 3, { days: 8, events: false }));
    s = autoplay(s);
    expect(s.phase).toBe('over');
    expect(s.jam).toHaveLength(2);
    const t = newGame(humans(2, 3, { days: 8 }));
    t.day = 8;
    expect(effectiveMax(t, { fruit: 'apple', qty: 1, max: 8 })).toBe(9);
    t.day = 7;
    expect(effectiveMax(t, { fruit: 'apple', qty: 1, max: 8 })).toBe(8);
  });

  it('a Health Inspector is never the final day\'s event', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = autoplay(newGame(ais(2, seed, { events: true, days: 8 })), 2000);
      expect(s.event?.inspector ?? 0).toBe(0);
    }
    expect(EVENT_CARDS.find((e) => e.id === 'glut')).toBeTruthy();
    expect(EVENT_CARDS.find((e) => e.id === 'blight')).toBeTruthy();
  });
});

describe('open stalls and posted prices', () => {
  it('stall quantities are committed together, then each shop posts one secret price per fruit', () => {
    let s = duel();
    s.players[0].stock.apple[fresh('apple')] = 3;
    s.players[1].stock.apple[fresh('apple')] = 3;
    expect(s.phase).toBe('stall');
    expect(() => openStall(s, 0, { apple: 4 })).toThrow();
    s = openStall(s, 0, { apple: 2 });
    expect(s.phase).toBe('stall');
    s = openStall(s, 1, { apple: 3 });
    expect(s.phase).toBe('bid');
    expect(() => submitPrices(s, 0, [])).toThrow(/Set a price/);
    s = submitPrices(s, 0, [{ fruit: 'apple', price: 5 }]);
    s = submitPrices(s, 1, [{ fruit: 'apple', price: 7 }]);
    const line = s.results!.lines[0];
    // The cheaper stall sells its 2, and the leftover demand spills over to the dearer stall.
    expect(line.offers.find((o) => o.player === 0)!.sold).toBe(2);
    expect(line.offers.find((o) => o.player === 1)!.sold).toBe(1);
  });

  it('ties: fresher fruit wins; with the same freshness the shop that bought earlier today wins (rules 5); a Haggler beats both', () => {
    const run = (setup: (s: GameState) => void) => {
      let s = duel();
      setup(s);
      s = openStall(s, 0, { apple: 3 });
      s = openStall(s, 1, { apple: 3 });
      s = submitPrices(s, 0, [{ fruit: 'apple', price: 6 }]);
      s = submitPrices(s, 1, [{ fruit: 'apple', price: 6 }]);
      return s.results!.lines[0].offers.find((o) => o.sold === 3)!.player;
    };
    expect(run((s) => { s.players[0].stock.apple[fresh('apple')] = 3; s.players[1].stock.apple[2] = 3; })).toBe(0);
    // Same freshness: the earlier buyer wins, whatever the cash is (cash changes during the rush, so it is not used).
    expect(run((s) => { s.players.forEach((p) => { p.stock.apple[fresh('apple')] = 3; }); s.order = [1, 0]; s.players[0].cash = 5; s.players[1].cash = 30; })).toBe(1);
    expect(run((s) => { s.players.forEach((p) => { p.stock.apple[fresh('apple')] = 3; }); s.order = [0, 1]; s.players[0].cash = 30; s.players[1].cash = 5; })).toBe(0);
    expect(run((s) => { s.players[0].stock.apple[2] = 3; s.players[1].stock.apple[fresh('apple')] = 3; s.players[0].trait = 'haggler'; })).toBe(0);
    expect(TRAITS.haggler.text).toContain('fresher');
  });

  it('a Premium Display lets fresh fruit go $1 over the limit; fruit too old for the price is reported', () => {
    let s = duel();
    s.players[0].stock.apple[fresh('apple')] = 3;
    s.players[0].upgrades.push('premium');
    s.players[1].stock.apple[1] = 3; // okay apples
    s = openStall(s, 0, { apple: 3 });
    s = openStall(s, 1, { apple: 3 });
    s = submitPrices(s, 0, [{ fruit: 'apple', price: 9 }]);
    s = submitPrices(s, 1, [{ fruit: 'apple', price: 8 }]);
    const line = s.results!.lines[0];
    expect(line.offers.find((o) => o.player === 0)!.sold).toBe(3);
    expect(line.offers.find((o) => o.player === 1)!.tooOld).toBe(true);
  });

  it('a shop with nothing out skips pricing', () => {
    let s = duel();
    s.players[1].stock.apple[fresh('apple')] = 3;
    s = openStall(s, 0, {});
    s = openStall(s, 1, { apple: 3 });
    expect(s.bids[0]).toEqual([]);
    s = applyAction(s, 1, { kind: 'prices', posts: [{ fruit: 'apple', price: 8 }], favoured: false });
    expect(s.phase).toBe('reveal');
  });
});

describe('options', () => {
  it('street prices: every customer pays the street price (+$2 when generous)', () => {
    const s = duel({ street: true });
    expect(effectiveMax(s, { fruit: 'apple', qty: 1, max: 11 })).toBe(STREET_PRICE.apple);
    expect(effectiveMax(s, { fruit: 'apple', qty: 1, max: 11 }, true)).toBe(STREET_PRICE.apple + 2);
  });

  it('core market: no traits and no favour cards', () => {
    const s = autoplay(newGame(ais(3, 6, { core: true, upgrades: false })));
    for (const p of s.players) { expect(p.trait ?? null).toBeNull(); expect(p.favours).toEqual([]); expect(p.upgrades).toEqual([]); }
  });

  it('market pulse: a shortage raises a fruit\'s marker', () => {
    let s = duel({ pulse: true });
    s.players[0].stock.apple[fresh('apple')] = 1;
    s = openStall(s, 0, { apple: 1 });
    s = openStall(s, 1, {});
    s = submitPrices(s, 0, [{ fruit: 'apple', price: 5 }]);
    expect(s.pulse!.apple).toBe(1);
    expect(servingCustomers(s)[0].wants[0].qty).toBe(2);
  });
});

describe('rules version 6', () => {
  it('keeps daily boards for each rules version apart', () => {
    expect(RULES_VERSION).toBe(6);
    expect(dailyBoardKey('2026-11-01')).toBe('daily:2026-11-01:r6');
  });
});
