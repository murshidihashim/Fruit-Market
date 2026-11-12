import { afterEach, describe, expect, it, vi } from 'vitest';
import { h } from 'preact';
import { FRUIT, FRUITS, RIVALS, freshPos } from '../src/engine/data';
import { activePlayer, applyAction, newGame, type GameState } from '../src/engine/game';
import { aiActFor } from '../src/engine/ai';
import * as A from '../src/ui/anim';
import { toStaticHtml } from '../src/ui/cards';
import { holdCash, shownCash } from '../src/ui/cashShown';
import { arriving, dealsOf, holdArrival, holdDeals, holdDelivery, moves, shareOut } from '../src/ui/game/animator';
import { NightShift } from '../src/ui/game/panels/NightShift';
import { shownStock } from '../src/ui/stockShown';
import { Market, Street, boughtToday } from '../src/ui/table';
import { deliveryBoxes, marketBefore, nightSteps, ticketLines } from '../src/ui/tableModel';
import { cardShown, countMarket, releaseTable, shownMarket, tableHeld, turnCard } from '../src/ui/tableShown';

// PLAN-085, the Wholesale Market and what moves on it: the lanes, the lorry's crates, buying as travel (numbers change
// as a piece lifts off or lands, not before), the walk-ins turning face up, and the night on the lanes.

const game = (stalls = 4, humans = 1): GameState => newGame({
  players: RIVALS.slice(0, stalls).map((r, i) => ({ name: i ? r.name : 'Me', kind: i < humans ? 'human' as const : 'ai' as const, avatar: r.avatar })),
  days: 8, unripe: true, upgrades: true, events: true, seed: 11,
});
/** Plays on (computers for everyone) until the test's moment. */
function playTo(s: GameState, when: (s: GameState) => boolean): GameState {
  for (let i = 0; i < 20000 && !when(s); i++) {
    if (s.phase === 'morning') {
      const pick = s.players.findIndex((p) => p.traitOffer && !p.trait);
      s = pick >= 0 ? applyAction(s, pick, { kind: 'trait', trait: s.players[pick].traitOffer![0] }) : applyAction(s, 0, { kind: 'begin' });
    } else if (s.phase === 'reveal') s = applyAction(s, 0, { kind: 'finish' });
    else s = aiActFor(s, activePlayer(s))!;
  }
  if (!when(s)) throw new Error('the moment never came');
  return s;
}
function clock() {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  A.setBaseSpeed(false);
  A.resetHurry();
}
afterEach(async () => {
  if (vi.isFakeTimers()) await vi.runAllTimersAsync();
  releaseTable();
  holdCash(null);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the lanes (table.tsx Market)', () => {
  it('four lanes of 3, 4, 5 and 6 boxes in the board\'s order, each with how many are wanted', () => {
    const s = playTo(game(), (x) => x.phase === 'buy');
    const html = toStaticHtml(h(Market, { s, p: 0 }));
    const lanes = html.split('class="tk-lane tb-lane ').slice(1);
    expect(lanes.map((l) => l.split('"')[0])).toEqual(['blueberry', 'watermelon', 'mango', 'apple']);
    expect(lanes.map((l) => (l.match(/class="mk-cell /g) ?? []).length)).toEqual([3, 4, 5, 6]);
    for (const l of lanes) expect(l).toMatch(/>[0-9?]+\+? wanted</);
    // an empty box is still drawn, and is not a box to buy from
    expect(html).toMatch(/class="mk-cell tk-box tb-box st-\w+\s+"/);
  });

  it('until the crates land the lanes show the market as it stood before the lorry', () => {
    const morning = playTo(game(), (x) => x.phase === 'morning' && x.day === 2 && !x.event?.noDelivery);
    const crates = deliveryBoxes(morning);
    expect(crates.length).toBeGreaterThan(0);
    for (const f of FRUITS) expect(crates.filter((c) => c.f === f).reduce((a, c) => a + c.n, 0)).toBe(morning.delivery[f] ?? 0);
    const before = marketBefore(morning);
    for (const c of crates) expect(before[c.f][c.pos]).toBe(morning.market[c.f][c.pos] - c.n);
    // green fruit goes into the top (Green) box of its lane
    const green = crates.find((c) => c.f === morning.deliveryUnripe);
    if (green) expect(green).toMatchObject({ pos: morning.market[green.f].length - 1, stage: 'unripe' });
  });

  it('an event\'s ripe extra pieces go to the Fresh box, the green ones to the Green box (Mango Windfall)', () => {
    const s = playTo(game(), (x) => x.phase === 'morning' && x.day === 2);
    const windfall: GameState = { ...s, event: null, delivery: { mango: 3 }, deliveryUnripe: 'mango', deliveryRipe: { mango: 1 } };
    expect(deliveryBoxes(windfall)).toEqual([
      { f: 'mango', pos: s.market.mango.length - 1, n: 2, stage: 'unripe' },
      { f: 'mango', pos: freshPos('mango'), n: 1, stage: 'fresh' },
    ]);
    // a load that is not in the Fresh box went into the freshest Okay box (the Seconds Lorry, when the card is not known)
    const okay = FRUIT.apple.ripe.lastIndexOf('okay');
    const seconds: GameState = { ...s, event: null, delivery: { apple: 2 }, deliveryUnripe: null, deliveryRipe: undefined, farmerDeck: [],
      market: { ...s.market, apple: s.market.apple.map((_, pos) => (pos === okay ? 2 : 0)) } };
    expect(deliveryBoxes(seconds)).toEqual([{ f: 'apple', pos: okay, n: 2, stage: 'okay' }]);
    expect(deliveryBoxes({ ...s, event: { ...(s.event ?? { id: 'x', title: 'x', text: '' }), noDelivery: true } as GameState['event'] })).toEqual([]);
  });

  it('a crate\'s pieces are counted into the box as it lands, and the real lanes show again when the beat ends', async () => {
    clock();
    const s = playTo(game(), (x) => x.phase === 'buy' && x.day === 2 && deliveryBoxes(x).length > 0);
    expect(shownMarket(s.market)).toBe(s.market);
    holdDelivery(s);
    expect(shownMarket(s.market)).toEqual(marketBefore(s));
    const c = deliveryBoxes(s)[0];
    const counting = countMarket(c.f, c.pos, c.n);
    expect(shownMarket(s.market)[c.f][c.pos]).toBeLessThan(s.market[c.f][c.pos] + (c.n > 1 ? 0 : 1));
    await vi.runAllTimersAsync();
    await counting;
    expect(shownMarket(s.market)[c.f][c.pos]).toBe(s.market[c.f][c.pos]);
    releaseTable();
    expect(tableHeld()).toBe(false);
    expect(shownMarket(s.market)).toBe(s.market);
  });
});

describe('buying as travel: numbers change as the piece lifts off and lands', () => {
  /** A buying turn of a person's: before a purchase, and after it. */
  function purchase() {
    const prev = playTo(game(4, 4), (x) => x.phase === 'buy' && x.day === 2);
    const p = activePlayer(prev);
    const f = FRUITS.find((x) => prev.market[x].some((n, pos) => n > 0 && prev.players[p].cash >= FRUIT[x].cost[pos < FRUIT[x].ripe.length ? FRUIT[x].ripe[pos] : 'unripe']))!;
    const pos = prev.market[f].findIndex((n) => n > 0);
    return { prev, next: applyAction(prev, p, { kind: 'buy', fruit: f, pos }), p, f, pos };
  }

  it('before the piece lifts off the table is drawn as it was; once it has landed, as it is', async () => {
    clock();
    const { prev, next, p, f, pos } = purchase();
    expect(dealsOf(prev, next)).toEqual([{ f, pos, n: 1 }]);
    holdDeals(prev, next, p);
    // the new state is on the table, and nothing of the purchase shows yet
    expect(shownMarket(next.market)[f][pos]).toBe(prev.market[f][pos]);
    expect(shownStock(p, next.players[p].stock)[f][pos]).toBe(prev.players[p].stock[f][pos]);
    expect(boughtToday(next, p)).toEqual(boughtToday(prev, p));
    expect(shownCash(p, next.players[p].cash)).toBe(prev.players[p].cash);
    // the piece travels (no page here: it lifts off and lands at once, and its calls are still made)
    const done = moves(prev, next, p);
    await vi.runAllTimersAsync();
    await done;
    expect(shownMarket(next.market)[f][pos]).toBe(next.market[f][pos]);
    expect(shownStock(p, next.players[p].stock)[f][pos]).toBe(next.players[p].stock[f][pos]);
    expect(boughtToday(next, p).find((b) => b.f === f)?.n).toBe(1);
    expect(shownCash(p, next.players[p].cash)).toBe(next.players[p].cash);
  });

  it('a rival\'s shelf is never drawn: only the box, its "bought today" marks and its cash are held back', () => {
    const { prev, next, p, f, pos } = purchase();
    const other = (p + 1) % prev.players.length;
    holdDeals(prev, next, other);
    expect(shownStock(p, next.players[p].stock)).toBe(next.players[p].stock);
    expect(shownMarket(next.market)[f][pos]).toBe(prev.market[f][pos]);
    expect(boughtToday(next, p)).toEqual(boughtToday(prev, p));
  });

  it('pieces taken back travel the other way: the shelf drops as they lift, the box rises as they land', async () => {
    clock();
    const { prev, next, p, f, pos } = purchase();
    expect(dealsOf(next, prev)).toEqual([{ f, pos, n: -1 }]);
    holdDeals(next, prev, p);
    expect(shownMarket(prev.market)[f][pos]).toBe(next.market[f][pos]);
    expect(shownStock(p, prev.players[p].stock)[f][pos]).toBe(next.players[p].stock[f][pos]);
    const done = moves(next, prev, p);
    await vi.runAllTimersAsync();
    await done;
    expect(shownMarket(prev.market)[f][pos]).toBe(prev.market[f][pos]);
    expect(shownCash(p, prev.players[p].cash)).toBe(prev.players[p].cash);
  });

  it('what a stall paid is shared over its pieces in whole dollars that add up', () => {
    expect(shareOut(7, [2, 2, 3])).toEqual([2, 2, 3]);
    expect(shareOut(8, [3, 3, 3]).reduce((a, x) => a + x, 0)).toBe(8);
    expect(shareOut(0, [1, 1])).toEqual([0, 0]);
    expect(shareOut(5, [])).toEqual([]);
  });
});

describe('the customer row keeps its height, and the walk-ins turn face up one by one', () => {
  const last = () => {
    let s = playTo(game(4, 4), (x) => x.phase === 'buy' && x.day === 2 && x.turn === x.order.length - 1);
    return { prev: s, next: (s = applyAction(s, activePlayer(s), { kind: 'endBuy' })) };
  };

  it('the row is as tall as the day\'s tallest ticket before and after the walk-ins arrive', () => {
    const { prev, next } = last();
    const lines = (s: GameState) => Number(toStaticHtml(h(Street, { s, viewer: 0 })).match(/--lines:(\d+)/)?.[1]);
    expect(lines(prev)).toBeGreaterThanOrEqual(2);
    expect(lines(next)).toBe(lines(prev));
    expect(ticketLines([{ wants: [] }, null])).toBe(2);
    expect(ticketLines([{ wants: [{ fruit: 'apple', qty: 1, max: 1 }, { fruit: 'mango', qty: 1, max: 1 }, { fruit: 'blueberry', qty: 1, max: 1 }] }])).toBe(3);
  });

  it('an arriving walk-in stays face down until its card is turned; a card this player has seen is not turned', () => {
    const { prev, next } = last();
    const ids = arriving(prev, next, 0);
    expect(ids).toEqual(prev.queue.filter((c) => next.firstMarket.some((x) => x.id === c.id)).map((c) => c.id));
    expect(ids.length).toBeGreaterThan(0);
    const seen = { ...prev, queue: prev.queue.map((c, i) => (i === 0 ? { ...c, seenBy: [0] } : c)) };
    expect(arriving(seen, next, 0)).toEqual(ids.slice(1));
    expect(arriving(seen, next, 1)).toEqual(ids);
    expect(arriving(prev, prev, 0)).toEqual([]);
    holdArrival(ids);
    const row = () => toStaticHtml(h(Street, { s: next, viewer: 0 }));
    const faceDown = () => (row().match(/class="cust mystery/g) ?? []).length;
    expect(faceDown()).toBe(ids.length);
    turnCard(ids[0], 'out');
    expect(row()).toContain('tb-turn-out');
    expect(faceDown()).toBe(ids.length);
    turnCard(ids[0], 'up');
    expect(cardShown(ids[0])).toBe('up');
    expect(faceDown()).toBe(ids.length - 1);
    expect(row()).toContain('tb-turn-in');
    releaseTable();
    expect(faceDown()).toBe(0);
  });
});

describe('the night on the lanes (NightShift.tsx)', () => {
  it('draws the market\'s own lanes, and every piece slides one box: two in a Heatwave, none in a Monsoon', () => {
    const dusk = playTo(game(), (x) => x.phase === 'reveal' && x.day >= 2 && FRUITS.some((f) => x.market[f].some((n) => n > 0)));
    const panel = (s: GameState, slide: number | 'done' | null) => toStaticHtml(h(NightShift, { s, viewer: 0, slide }));
    const calm: GameState = { ...dusk, event: null };
    expect(nightSteps(calm)).toBe(1);
    expect((panel(calm, null).match(/class="mk-cell /g) ?? []).length).toBe(18);
    expect(panel(calm, null)).not.toContain('moved');
    expect(panel(calm, 500)).toContain('--steps:1');
    const heat = { ...calm, event: { id: 'heatwave', title: 'Heatwave', text: '', ageExtra: 1 } } as GameState;
    expect(nightSteps(heat)).toBe(2);
    expect(panel(heat, 500)).toContain('every piece slides down 2 boxes');
    const rain = { ...calm, event: { id: 'monsoon', title: 'Monsoon', text: '', ageExtra: -1 } } as GameState;
    expect(nightSteps(rain)).toBe(0);
    expect(panel(rain, 500)).not.toContain('moved');
    expect(panel(rain, 500)).toContain('No fruit ages tonight (Monsoon).');
  });
});

describe('table.css is loaded with the table, after the older table styles', () => {
  it('the market, the lorry, the card turn and the night follow the one speed', async () => {
    const { readFileSync } = await import('node:fs');
    const css = readFileSync('src/ui/table.css', 'utf8');
    for (const name of ['turn', 'travel', 'lorry', 'lorry-off', 'sky', 'dusk']) expect(css).toContain(`calc(var(--mk, 1) * var(--t-${name})`);
    // at night the customer row and the stalls stay on the table
    expect(css).toMatch(/\.is-night > \.street-wrap \{ display: block; \}/);
    expect(css).toMatch(/\.is-night > \.seats \{ display: flex; \}/);
    expect(readFileSync('src/ui/table.tsx', 'utf8')).toContain("import './table.css';");
    // only position, size and fade move: no keyframe here changes a colour or a layout property
    const frames = [...css.matchAll(/@keyframes [\w-]+ \{([^@]*?\})\s*\}/g)].map((m) => m[1]).join(' ');
    expect(frames).not.toMatch(/(width|height|margin|padding|top|left|background|color)\s*:/);
  });
});
