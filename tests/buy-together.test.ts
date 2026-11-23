import { afterEach, describe, expect, it, vi } from 'vitest';
import { h } from 'preact';
import { FRUITS, RIVALS } from '../src/engine/data';
import { activePlayer, applyAction, canBuy, newGame, type GameState } from '../src/engine/game';
import { aiActFor } from '../src/engine/ai';
import type { FlyOpts } from '../src/ui/anim';
import { toStaticHtml } from '../src/ui/cards';
import { holdCash, shownCash } from '../src/ui/cashShown';
import { shownStock } from '../src/ui/stockShown';
import { Market, boughtToday, lorryDue, waitLine } from '../src/ui/table';
import { buyState, deliveryBoxes, marketBefore } from '../src/ui/tableModel';
import { releaseTable, shownMarket } from '../src/ui/tableShown';
import { keepTap } from '../src/ui/game/turn';

// PLAN-123, findings 1 and 2: the lanes are never drawn as sold out while the lorry has not landed, the market says
// whose turn it is while a rival's pieces travel, every number a purchase changes changes in the same frame, and a tap
// kept back while a piece travels is only kept when it will still be a purchase the rules allow.

// The pieces' travel, caught here: each move's options are kept so the test can lift and land a piece itself.
const flights: FlyOpts[] = [];
vi.mock('../src/ui/anim', async (orig) => {
  const real = await orig<typeof import('../src/ui/anim')>();
  return { ...real, fly: (_from: unknown, _to: unknown, _node: unknown, o: FlyOpts = {}) => { flights.push(o); return Promise.resolve(); } };
});
const { holdDeals, moves } = await import('../src/ui/game/animator');

const game = (stalls = 2, humans = 1): GameState => newGame({
  players: RIVALS.slice(0, stalls).map((r, i) => ({ name: i ? r.name : 'Me', kind: i < humans ? 'human' as const : 'ai' as const, avatar: r.avatar })),
  days: 6, unripe: true, upgrades: true, events: true, seed: 58,
});
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
afterEach(() => { flights.length = 0; releaseTable(); holdCash(null); });

describe('finding 1: the lanes before the lorry has landed', () => {
  it('in the morning a box the lorry fills is drawn as coming, never as "0 left"', () => {
    const s = playTo(game(), (x) => x.phase === 'morning' && x.day === 1 && !x.players.some((p) => p.traitOffer && !p.trait));
    const crates = deliveryBoxes(s);
    expect(crates.length).toBeGreaterThan(0);
    const due = lorryDue(s, marketBefore(s))!;
    for (const c of crates) expect(due[c.f][c.pos]).toBe(c.n);
    const html = toStaticHtml(h(Market, { s, p: 0 }));
    for (const c of crates) {
      const box = html.split(`data-a="m-${c.f}-${c.pos}"`)[1].split('</button>')[0];
      expect(box).toMatch(/on today's lorry"/);
      expect(box).not.toMatch(/ 0 left"/);
      expect(box).toContain('tb-due');
    }
    expect(html).toContain('Lorry unloads as buying starts');
  });

  it('once the crates have landed nothing is drawn as coming', () => {
    const s = playTo(game(), (x) => x.phase === 'buy' && x.day === 1);
    expect(lorryDue(s, shownMarket(s.market))).toBeNull();
    expect(toStaticHtml(h(Market, { s, p: 0 }))).not.toContain('tb-due');
  });

  it('while a rival\'s pieces travel the market says it is their turn and when yours comes', () => {
    const s = playTo(game(3), (x) => x.phase === 'buy' && x.day === 1);
    const me = 0;
    const rival = s.order.find((p) => p !== me)!;
    const line = waitLine(s, me, rival);
    expect(line.startsWith(`${s.players[rival].name}'s turn · `)).toBe(true);
    expect(line).toMatch(/you buy next|you buy \d(st|nd|rd|th)|you have bought/);
    // drawn with the travelling stall, not the game's next stall
    const html = toStaticHtml(h(Market, { s, p: me, mover: rival }));
    expect(html).toContain(`${s.players[rival].name}'s turn`);
    // and the stalls' row draws the travelling stall as buying, not the game's next stall (tableShown.ts heldBuyer)
    const next = s.order[s.turn];
    expect(buyState(s, next)).toBe('now');
    if (next !== rival) expect(buyState(s, next, rival)).not.toBe('now');
    expect(buyState(s, rival, rival)).toBe('now');
  });
});

describe('a box that cannot be bought from says why', () => {
  it('the reason is said with the box (and shown on hover), only for a box that holds fruit', () => {
    const s = playTo(game(3), (x) => x.phase === 'buy' && x.day === 1 && x.order[x.turn] !== 0);
    const html = toStaticHtml(h(Market, { s, p: 0, why: (f, pos) => canBuy(s, 0, f, pos) }));
    const full = FRUITS.flatMap((f) => s.market[f].map((n, pos) => ({ f, pos, n }))).find((x) => x.n > 0)!;
    const box = html.split(`data-a="m-${full.f}-${full.pos}"`)[1].split('>')[0];
    expect(box).toContain('. Not your turn"');
    expect(html).toContain('title="Not your turn"');
    const empty = FRUITS.flatMap((f) => s.market[f].map((n, pos) => ({ f, pos, n }))).find((x) => x.n === 0)!;
    expect(html.split(`data-a="m-${empty.f}-${empty.pos}"`)[1].split('>')[0]).not.toContain('Not your turn');
  });
});

describe('finding 2: a purchase changes every number in the same frame', () => {
  function purchase() {
    const prev = playTo(game(2, 2), (x) => x.phase === 'buy' && x.day === 2);
    const p = activePlayer(prev);
    const f = FRUITS.find((x) => prev.market[x].some((_, pos) => !canBuy(prev, p, x, pos)))!;
    const pos = prev.market[f].findIndex((_, k) => !canBuy(prev, p, f, k));
    return { prev, next: applyAction(prev, p, { kind: 'buy', fruit: f, pos }), p, f, pos };
  }

  it('the box, the shelf, the purchases allowed and the cash all change as the piece lifts off, none as it lands', async () => {
    const { prev, next, p, f, pos } = purchase();
    holdDeals(prev, next, p);
    const now = () => ({
      box: shownMarket(next.market)[f][pos],
      shelf: shownStock(p, next.players[p].stock)[f][pos],
      bought: boughtToday(next, p).find((b) => b.f === f)?.n ?? 0,
      cash: shownCash(p, next.players[p].cash),
    });
    const before = now();
    expect(before).toEqual({ box: prev.market[f][pos], shelf: prev.players[p].stock[f][pos], bought: boughtToday(prev, p).find((b) => b.f === f)?.n ?? 0, cash: prev.players[p].cash });
    const done = moves(prev, next, p);
    expect(flights).toHaveLength(1);
    expect(flights[0].onLand).toBeUndefined();
    flights[0].onLift!();
    expect(now()).toEqual({ box: next.market[f][pos], shelf: next.players[p].stock[f][pos], bought: before.bought + 1, cash: next.players[p].cash });
    await done;
  });

  it('Undo: the pieces taken back change every number together too', () => {
    const { prev, next, p, f, pos } = purchase();
    holdDeals(next, prev, p);
    void moves(next, prev, p);
    expect(flights).toHaveLength(1);
    flights[0].onLift!();
    expect(shownMarket(prev.market)[f][pos]).toBe(prev.market[f][pos]);
    expect(shownStock(p, prev.players[p].stock)[f][pos]).toBe(prev.players[p].stock[f][pos]);
    expect(shownCash(p, prev.players[p].cash)).toBe(prev.players[p].cash);
  });
});

describe('finding 2: taps kept while a piece travels (turn.ts keepTap)', () => {
  it('a box tapped once more than it holds is not kept, so a quick double tap never fails or buys twice', () => {
    const s = playTo(game(2, 2), (x) => x.phase === 'buy' && x.day === 2);
    const p = activePlayer(s);
    // a box holding one piece the stall can buy
    const f = FRUITS.find((x) => s.market[x].some((n, k) => n === 1 && !canBuy(s, p, x, k)))!;
    const pos = s.market[f].findIndex((n, k) => n === 1 && !canBuy(s, p, f, k));
    const tap = { f, pos };
    expect(keepTap(s, p, [], tap)).toBe(true);
    expect(keepTap(s, p, [tap], tap)).toBe(false);
  });

  it('no tap is kept beyond the day\'s purchases, and none for a stall whose turn it is not', () => {
    let s = playTo(game(2, 2), (x) => x.phase === 'buy' && x.day === 2);
    const p = activePlayer(s);
    const other = (p + 1) % s.players.length;
    const f = FRUITS.find((x) => s.market[x].some((n) => n > 0))!;
    const pos = s.market[f].findIndex((n) => n > 0);
    expect(keepTap(s, other, [], { f, pos })).toBe(false);
    s = { ...s, players: s.players.map((pl, i) => (i === p ? { ...pl, boughtToday: 99 } : pl)) };
    expect(keepTap(s, p, [], { f, pos })).toBe(false);
  });
});
