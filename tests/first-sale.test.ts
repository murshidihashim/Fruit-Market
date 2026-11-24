// PLAN-113: the guided first sale. A first-time player's first solo game opens with one decision on Day 1 (their price
// for one customer); until then the game sets up their stall with the computer's own moves, shown as a rival's are.
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { h } from 'preact';
import { toStaticHtml } from '../src/ui/cards';
import { FirstSaleView } from '../src/ui/FirstTime';
import { aiActFor, aiStep } from '../src/engine/ai';
import { RIVALS } from '../src/engine/data';
import { activePlayer, beginBuying, forSale, newGame, publicView, validatePrices, type GameState } from '../src/engine/game';
import {
  FIRST_SALE_DONE, FIRST_SALE_SKIPPED, GUIDED_FIRST_SALE, TIPS, endFirstSale, expectedBuy, firstSaleGame, firstSalePosts, firstSaleSeen, guideLine, guideSetsUp, guidedStep,
  markSeen, piecesWord, skipTutorial, soloSeat, spotlight, startPrice, tipFor,
} from '../src/ui/tutorial';

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k),
  };
});

/** A first solo game: the person (seat `me`) and computer rivals. */
const solo = (seed: number, stalls = 4, me = 0, avatar = '🦊'): GameState => newGame({
  players: RIVALS.slice(0, stalls).map((r, i) => (i === me ? { name: 'Me', kind: 'human' as const, avatar } : { name: r.name, kind: 'ai' as const, avatar: r.avatar })),
  days: 8, unripe: true, upgrades: true, events: true, seed,
});

/** Plays Day 1 as the game screen does while the guide is on: the guide's moves for the person, the computers' own,
 *  until the person's pricing turn (or past it). Every guided state is checked to be the computer's move for that seat. */
function toPricing(g: GameState): GameState {
  const me = soloSeat(g);
  let s = g;
  for (let i = 0; i < 500; i++) {
    if (s.phase === 'bid' && activePlayer(s) === me) return s;
    if (s.day !== 1 || s.phase === 'reveal' || s.phase === 'tie') return s;
    const guided = guidedStep(s, me);
    if (guided) {
      if (s.phase === 'morning') expect(guided).toEqual(beginBuying(s));
      else if (s.phase === 'buy' && s.players[me].boughtToday === 0 && stepsOf(s, me).players[me].boughtToday === 0) expect(guided).toEqual(expectedBuy(s, me));
      else expect(guided.players[me].stock).toEqual(stepsOf(s, me).players[me].stock);
      s = guided;
      continue;
    }
    const next = aiStep(s);
    if (!next) throw new Error(`stuck in ${s.phase}`);
    s = next;
  }
  throw new Error('no end');
}
/** The computer's moves for seat `me` for the rest of its turn (what guidedStep must have done). */
function stepsOf(s: GameState, me: number): GameState {
  let cur = aiActFor(s, me)!;
  while (s.phase === 'buy' && cur.phase === 'buy' && cur.turn === s.turn) {
    const more = aiActFor(cur, me);
    if (!more || more.phase !== 'buy') break;
    cur = more;
  }
  return cur;
}

describe('guided first sale: which games', () => {
  it('is off (owner, 2026-11-24): even a first-time player\'s solo game on Day 1 is played by hand', () => {
    const g = solo(3);
    expect(GUIDED_FIRST_SALE).toBe(false);
    expect(firstSaleGame(g, false, true)).toBe(false);
    expect(firstSaleGame({ ...g, phase: 'buy' }, false, true)).toBe(false);
    expect(firstSaleGame({ ...g, phase: 'bid' }, false, true)).toBe(false);
  });

  it('not online, not the Daily market, not pass-and-play, not after Day 1 or the bell, not for a player who has played', () => {
    const g = solo(3);
    expect(firstSaleGame(g, true, true)).toBe(false);
    expect(firstSaleGame({ ...g, config: { ...g.config, daily: '2026-11-21' } }, false, true)).toBe(false);
    const two = newGame({ players: [{ name: 'A', kind: 'human', avatar: 'a' }, { name: 'B', kind: 'human', avatar: 'b' }], days: 8, unripe: true, upgrades: true, events: true, seed: 5 });
    expect(firstSaleGame(two, false, true)).toBe(false);
    expect(firstSaleGame({ ...g, day: 2 }, false, true)).toBe(false);
    for (const phase of ['tie', 'reveal', 'evening', 'over'] as const) expect(firstSaleGame({ ...g, phase }, false, true)).toBe(false);
    expect(firstSaleGame(g, false, false)).toBe(false);
  });

  it('is played to the bell or skipped once, then never again on this phone', () => {
    expect(firstSaleSeen()).toBe(false);
    endFirstSale(false);
    expect(firstSaleSeen()).toBe(true);
    expect(JSON.parse(mem.get('fm.tutorial')!)).toContain(FIRST_SALE_DONE);
    mem.clear();
    endFirstSale(true);
    expect(firstSaleSeen()).toBe(true);
    expect(JSON.parse(mem.get('fm.tutorial')!)).toContain(FIRST_SALE_SKIPPED);
  });

  it('the controller asks once, as the game opens, and only for a player with no finished game', () => {
    const src = readFileSync('src/ui/game/useGameController.ts', 'utf8');
    expect(src).toContain('useState(() => firstSaleGame(initial, !!online, !hasFinishedGame() && !firstSaleSeen()))');
  });
});

describe('guided first sale: the stall is set up with the computer\'s own moves', () => {
  it('starts buying, buys and stocks for the person, then stops at their pricing turn', () => {
    for (const seed of [1, 2, 3, 7, 11, 12345]) {
      for (const me of [0, 2]) {
        const s = toPricing(solo(seed, 4, me));
        expect(s.day).toBe(1);
        if (s.phase !== 'bid') continue;
        expect(activePlayer(s)).toBe(me);
        expect(s.stalls[me]).not.toBeNull();
        expect(guideSetsUp(s, me)).toBe(false);
        expect(guidedStep(s, me)).toBeNull();
      }
    }
  });

  // (Days found by search where a computer stall in the person's seat would buy nothing: about 1 in 300 first days.)
  it('when the computer would buy nothing, buys for today\'s customers, so there is a sale to price', () => {
    let fell = 0;
    for (const [seed, stalls] of [[165, 4], [293, 4], [17, 6], [49, 6]]) {
      const g = solo(seed, stalls, 0, 'x');
      let s = beginBuying(g);
      while (s.phase === 'buy' && activePlayer(s) !== 0) s = aiStep(s)!;
      if (stepsOf(s, 0).players[0].boughtToday > 0) continue;
      const next = guidedStep(s, 0)!;
      const bought = expectedBuy(s, 0);
      // (nothing any customer wants is at the market: the computer's choice stands, and there is nothing to price)
      if (!bought) { expect(next.players[0].boughtToday).toBe(0); continue; }
      fell++;
      expect(next).toEqual(bought);
      const got = Object.entries(next.players[0].boughtFruit ?? {}).filter(([, t]) => t.some((n) => n > 0)).map(([f]) => f);
      expect(got).toHaveLength(1);
      const wanted = [...(s.forecast?.wants ?? []), ...s.queue.flatMap((c) => c.wants)].map((w) => w.fruit);
      expect(wanted).toContain(got[0]);
      const p = toPricing(g);
      expect(p.phase).toBe('bid');
      expect(spotlight(publicView(p, 0), 0)).not.toBeNull();
    }
    expect(fell).toBe(4);

  });

  it('never moves for a rival', () => {
    let s = beginBuying(solo(4, 4, 1));
    for (let i = 0; i < 200 && s.phase === 'buy'; i++) {
      if (activePlayer(s) !== 1) {
        expect(guidedStep(s, 1)).toBeNull();
        s = aiStep(s)!;
      } else s = guidedStep(s, 1)!;
    }
    expect(s.phase).not.toBe('buy');
  });

  it('says what it is doing, plainly', () => {
    const g = solo(5);
    const lines = [guideLine(g, 0), guideLine(beginBuying(g), 0)];
    expect(lines[0]).toBe('Today your stall buys and fills its crate for you. Then you set one price.');
    for (const l of lines) expect(l).not.toMatch(/!/);
    expect(guideLine({ ...g, day: 2 }, 0)).toBeNull();
  });
});

describe('guided first sale: the one decision', () => {
  it('a customer in the row who wants a fruit in your crate and pays for it; the prices seal as the game asks', () => {
    let found = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12345]) {
      const s = toPricing(solo(seed));
      if (s.phase !== 'bid') continue;
      const view = publicView(s, 0);
      const sp = spotlight(view, 0);
      if (!sp) continue;
      found++;
      expect(sp.customer.wants.some((w) => w.fruit === sp.fruit && w.qty === sp.qty)).toBe(true);
      expect(forSale(view, 0, sp.fruit)).toBeGreaterThan(0);
      expect(sp.cap).toBeGreaterThan(0);
      expect(sp.cap).toBeLessThanOrEqual(sp.top + 1);
      expect(startPrice(sp)).toBe(Math.min(sp.hi, sp.cap));
      // every fruit in the crate gets a price: the person's own for the spotlight, the computer's plan for the rest
      for (const price of [sp.lo, startPrice(sp), sp.hi]) expect(validatePrices(s, 0, firstSalePosts(sp, price))).toBeNull();
      expect(sp.spent).toBe(s.players[0].spentToday);
      expect(sp.rivals).toBe([1, 2, 3].filter((p) => (view.out?.[p] ?? 0) > 0).length);
    }
    expect(found).toBeGreaterThan(6);
  });

  it('reads only what the person may see: a rival\'s crate and prices change nothing', () => {
    const s = toPricing(solo(12345));
    expect(s.phase).toBe('bid');
    const a = spotlight(publicView(s, 0), 0);
    const other: GameState = { ...s, crates: s.crates?.map((c, i) => (i === 0 ? c : { apple: [9, 9, 9], blueberry: [9, 9, 9] })), bids: s.bids.map((b, i) => (i === 0 ? b : [{ fruit: 'apple', price: 1 }])) };
    expect(spotlight(publicView(other, 0), 0)).toEqual(a);
  });

  it('is not asked once the person has priced, nor on another day', () => {
    const s = toPricing(solo(12345));
    const sp = spotlight(publicView(s, 0), 0)!;
    const bids = s.bids.map((b, i) => (i === 0 ? firstSalePosts(sp, 3) : b));
    expect(spotlight(publicView({ ...s, bids }, 0), 0)).toBeNull();
    expect(spotlight(publicView({ ...s, day: 2 }, 0), 0)).toBeNull();
  });

  it('words a number of pieces', () => {
    expect(piecesWord(2, 'watermelon')).toBe('2 watermelons');
    expect(piecesWord(1, 'mango')).toBe('1 mango');
  });
});

describe('guided first sale: the screen', () => {
  const html = (s: GameState, price: number) => {
    const view = publicView(s, 0);
    const sp = spotlight(view, 0)!;
    return toStaticHtml(h(FirstSaleView, { s: view, me: 0, sp, price, small: false, onPrice: () => {}, onRing: () => {}, onSkip: () => {} }));
  };

  it('asks one price, in plain words, with Skip and Ring the bell', () => {
    const s = toPricing(solo(12345));
    const sp = spotlight(publicView(s, 0), 0)!;
    const out = html(s, startPrice(sp));
    expect(out).toContain('Price yours.');
    expect(out).toContain('>Skip<');
    expect(out).toContain('Ring the bell');
    expect(out).toContain(`Pays up to <b>$${sp.top}</b> each`);
    expect(out).toContain(`Takes ${sp.takes}`);
    expect(out).toContain('aria-modal="true"');
    expect(out.replace(/<[^>]+>/g, ' ')).not.toMatch(/!/);
    // above what the customer pays for yours, the screen says so
    expect(html(s, sp.cap + 1)).toContain(`pays at most $${sp.cap} for yours`);
  });

  it('never shows a rival\'s price, crate or shelf', () => {
    const s = toPricing(solo(12345));
    // every rival priced at a number shown nowhere else
    const other: GameState = { ...s, bids: s.bids.map((b, i) => (i === 0 ? b : [{ fruit: 'mango', price: 29 }])) };
    const out = html(other, 3);
    expect(out).not.toContain('$29');
    expect(out).not.toMatch(/>\s*29\s*</);
    expect((out.match(/class="fs-tag sealed"/g) ?? []).length).toBe([1, 2, 3].filter((p) => (publicView(other, 0).out?.[p] ?? 0) > 0).length);
  });
});

describe('guided first sale and the tips', () => {
  const buyTip = (s: GameState) => tipFor(s, { myBuyTurn: true, boughtToday: 0, pricing: false, picker: false, evening: false });

  it('after a guided first sale, the buying tip still comes on Day 2 (after the Day 2 tip)', () => {
    const day2 = { ...beginBuying(solo(6)), day: 2 };
    endFirstSale(false);
    markSeen('day2');
    expect(buyTip(day2)?.id).toBe('buy');
    expect(TIPS.find((t) => t.id === 'buy')).toBeDefined();
  });

  it('Skip tutorial still ends every tip, and a phone that finished the tips before stays finished', () => {
    const day2 = { ...beginBuying(solo(6)), day: 2 };
    endFirstSale(false);
    skipTutorial();
    expect(buyTip(day2)).toBeNull();
    mem.clear();
    markSeen('day2');
    expect(buyTip(day2)).toBeNull();
  });

  it('a skipped guided sale leaves the tips as they always were', () => {
    const day2 = { ...beginBuying(solo(6)), day: 2 };
    endFirstSale(true);
    markSeen('day2');
    expect(buyTip(day2)).toBeNull();
  });
});
