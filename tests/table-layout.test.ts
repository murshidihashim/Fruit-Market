// What the game table lays out at each moment (game/tableLayout.ts layoutOf), what its bottom bar says (ActionBar), and
// who is who at the table (game/seats.ts), tested on real games without a browser (REP-140 A-01: these were checked by
// reading Game.tsx, ActionBar.tsx and the controller as text).
import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import { aiActFor } from '../src/engine/ai';
import { RIVALS } from '../src/engine/data';
import { activePlayer, applyAction, emptyStock, endEvening, finishReveal, newGame, publicView, type GameState, type PlayerConfig } from '../src/engine/game';
import type { RoomView } from '../src/net/protocol';
import { toStaticHtml } from '../src/ui/cards';
import { ActionBar } from '../src/ui/game/panels/ActionBar';
import { NightShift } from '../src/ui/game/panels/NightShift';
import { layoutOf, type LayoutFacts } from '../src/ui/game/tableLayout';
import { turnOf, waitsOf } from '../src/ui/game/seats';
import { DEFAULT_CONFIG } from '../src/net/protocol';
import { controller } from './table-controller';

const facts = (over: Partial<LayoutFacts> = {}): LayoutFacts => ({
  busy: false, myBidTurn: false, humans: [0], handedTo: null, bell: null, rung: false, show: null, revealDone: false,
  active: 0, activeHuman: false, viewer: 0, actor: 0, orderShow: null, night: false, rival: null, ...over,
});

/** A real game, one person and two computers, played by the computer until `stop`. */
function playTo(stop: (s: GameState) => boolean, seed = 7, marketDays = false): GameState {
  let s = newGame({ players: [0, 1, 2].map((i) => ({ name: i === 0 ? 'Mira' : RIVALS[i].name, kind: i === 0 ? 'human' as const : 'ai' as const, level: 'normal' as const, avatar: RIVALS[i].avatar })), days: 8, unripe: true, upgrades: true, events: true, marketDays, seed });
  for (let i = 0; i < 6000 && s.phase !== 'over'; i++) {
    if (stop(s)) return s;
    if (s.phase === 'morning') { s = applyAction(s, 0, { kind: 'begin' }); continue; }
    if (s.phase === 'reveal') { s = finishReveal(s); continue; }
    s = aiActFor(s, activePlayer(s))!;
  }
  throw new Error('never reached');
}

describe('the day\'s step said in the top bar follows what is on the table (tableLayout.ts onTable)', () => {
  const rush = playTo((s) => s.phase === 'reveal');

  it('the bell, while the game is already at the rush and no customer\'s card has been up today; nothing once one has', () => {
    expect(layoutOf(rush, facts({ busy: true }), false, false, -1).onTable).toBe('bell');
    // a customer's card has been up today (the rush has begun), or the rush is over
    expect(layoutOf(rush, facts({ busy: true }), false, false, rush.day).onTable).toBeUndefined();
    expect(layoutOf(rush, facts({ revealDone: true }), false, false, -1).onTable).toBeUndefined();
  });

  it('the standing order, while its bids are turned over (the game is at buying by then)', () => {
    const buy = playTo((s) => s.phase === 'buy');
    const shown = { order: { ...buy.standing!, holder: 0 }, stage: 'in' as const, text: '' };
    expect(layoutOf(buy, facts({ orderShow: shown, busy: true }), false, false, -1).onTable).toBe('order');
    expect(layoutOf(buy, facts({ busy: true }), false, false, -1).onTable).toBeUndefined();
  });
});

describe('the middle of the table and what is out of reach under it (tableLayout.ts)', () => {
  it('the night over everything; on the first morning the perk or the morning card, and nothing while the "First time?" pop-up holds it up', () => {
    const morning = newGame({ players: [{ name: 'Mira', kind: 'human', avatar: RIVALS[0].avatar }, { name: RIVALS[1].name, kind: 'ai', level: 'normal', avatar: RIVALS[1].avatar }], days: 8, unripe: true, upgrades: true, events: true, seed: 3 });
    expect(layoutOf(morning, facts({ night: true }), false, false, -1).middle).toBe('night');
    expect(layoutOf(morning, facts(), false, false, -1).middle).toBe('morning');
    expect(layoutOf(morning, facts(), true, true, -1).middle).toBeNull();
    const offer = structuredClone(morning);
    offer.players[0].traitOffer = ['haggler', 'basket'];
    offer.players[0].trait = null;
    expect(layoutOf(offer, facts(), false, false, -1)).toMatchObject({ middle: 'trait', picker: 0 });
    // the morning waits for the beat playing to end
    expect(layoutOf(morning, facts({ busy: true }), false, false, -1).middle).toBeNull();
  });

  it('stocking draws the day\'s sheet; once the stall has opened the round table takes over, the market is out of reach and the bar is not drawn', () => {
    const stall = playTo((s) => s.phase === 'stall' && activePlayer(s) === 0);
    const stocking = layoutOf(stall, facts({ myBidTurn: true, activeHuman: true }), false, false, -1);
    expect(stocking).toMatchObject({ middle: 'day', tableOn: false, covered: true, bar: false });
    const opened = applyAction(stall, 0, { kind: 'stall', stall: {} });
    const waiting = layoutOf(publicView(opened, 0), facts(), false, false, -1);
    expect(waiting).toMatchObject({ middle: null, tableOn: true, covered: true, bar: false });
  });

  it('the takings lie on the day\'s sheet once the rush is truly over; the market is free again in the evening', () => {
    const rush = playTo((s) => s.phase === 'reveal');
    expect(layoutOf(rush, facts({ revealDone: true, rung: true }), false, false, rush.day)).toMatchObject({ middle: 'day', tableOn: false, bar: true });
    const evening = finishReveal(rush);
    const t = layoutOf(evening, facts({ active: activePlayer(evening), actor: activePlayer(evening) }), false, false, rush.day);
    expect(t.covered).toBe(t.middle !== null);
  });

  it('the evening sheet is this stall\'s own: offline the person the phone was handed to, online this phone\'s seat', () => {
    const g = evening([person('Ana'), person('Bo'), person('Cy')]);
    for (const seat of [0, 1, 2]) {
      const t = layoutOf(g, facts({ actor: seat, viewer: seat, activeHuman: true, humans: [0, 1, 2] }), true, false, -1);
      expect(t.evP).toBe(seat);
      expect(t.middle).toBe(t.eveningChoices ? 'evening' : null);
    }
  });

  it('a shared phone: the morning, the rush and the night are watched together, so no one person\'s shelf is drawn', () => {
    const rush = playTo((s) => s.phase === 'reveal');
    expect(layoutOf(rush, facts({ humans: [0, 1] }), false, false, -1).together).toBe(true);
    expect(layoutOf(rush, facts({ humans: [0] }), false, false, -1).together).toBe(false);
    expect(layoutOf(rush, facts({ humans: [0, 1] }), true, false, -1).together).toBe(false);
  });
});

describe('the standing order\'s sheet (PLAN-084; tableLayout.ts)', () => {
  const bidding = playTo((s) => s.phase === 'order' && !!s.standing, 1, true);

  it('stays up from the first stall\'s bid until the bids are turned over, with its own buttons in the bar\'s place', () => {
    // this stall bids; online it may still change its mind while it waits for the others
    for (const online of [false, true]) {
      for (const myBidTurn of [true, false]) {
        const t = layoutOf(bidding, facts({ myBidTurn, activeHuman: myBidTurn }), online, false, -1);
        expect(t).toMatchObject({ middle: 'order', orderUp: true, bar: false });
        expect(t.ordering).toBe(myBidTurn);
      }
    }
    // the bids are turned over while the game is already at buying
    const buy = playTo((s) => s.phase === 'buy', 1, true);
    const shown = { order: bidding.standing!, stage: 'in' as const, text: '' };
    expect(layoutOf(buy, facts({ orderShow: shown, busy: true }), false, false, -1)).toMatchObject({ middle: 'order', orderUp: true, bar: false });
  });

  it('the "Secret prices" tip is about pricing fruit: it does not come up at the standing-order bid', () => {
    expect(layoutOf(bidding, facts({ myBidTurn: true, activeHuman: true }), false, false, -1).coach?.id).not.toBe('bid');
    const bid = playTo((s) => s.phase === 'bid' && activePlayer(s) === 0);
    expect(layoutOf(bid, facts({ myBidTurn: true, activeHuman: true }), false, false, -1).coach?.id).toBe('bid');
    // never online, and never while a beat plays
    expect(layoutOf(bid, facts({ myBidTurn: true, activeHuman: true }), true, false, -1).coach).toBeNull();
    expect(layoutOf(bid, facts({ myBidTurn: true, activeHuman: true, busy: true }), false, false, -1).coach).toBeNull();
  });
});

const person = (name: string): PlayerConfig => ({ name, kind: 'human', avatar: '' });

/** The evening of day 3 as it opens, every stall with $30 and an empty shelf (rules 19: everyone decides at once). */
function evening(players: PlayerConfig[]): GameState {
  const s = structuredClone(newGame({ players, days: 10, unripe: true, upgrades: true, events: false, seed: 9 }));
  s.players.forEach((pl) => { pl.stock = emptyStock(true); pl.trait = null; pl.traitOffer = []; pl.favours = []; pl.upgrades = []; pl.cash = 30; });
  s.day = 3; s.phase = 'reveal'; s.results = null; s.event = null; s.nextEvent = null; s.standing = null;
  s.order = [0, 1, 2]; s.turn = 0; s.firstMarket = []; s.secondMarket = []; s.queue = []; s.priorityNext = null;
  return finishReveal(s);
}

describe('online, everyone decides the evening at once (seats.ts, ActionBar.tsx)', () => {
  const g = evening([person('Ana'), person('Bo'), person('Cy')]);
  const done1 = endEvening(g, 1);
  const meta: RoomView = { t: 'room', code: 'ABCDE', status: 'playing', you: 1, seats: [], config: DEFAULT_CONFIG, version: 9, game: done1, submitted: [false, false, false], votes: [], rematch: [] };

  it('a person decides until they say Lights out, whoever else is still deciding', () => {
    expect(turnOf(g, 1, true).activeHuman).toBe(true);
    expect(turnOf(done1, 1, true).activeHuman).toBe(false);
    expect(turnOf(done1, 2, true).activeHuman).toBe(true);
  });

  it('once you have said Lights out, the bar names who the evening is still waiting for', () => {
    const waits = waitsOf(done1, meta, [0, 1, 2], 1, turnOf(done1, 1, true), true);
    expect(waits.eveningWaits).toEqual([0, 2]);
    const c = controller(done1, { ...waits, viewer: 1, active: activePlayer(done1), actor: 1, activeHuman: false, humans: [0, 1, 2] });
    expect(toStaticHtml(h(ActionBar, { c, pl: done1.players[1], limit: 4, picker: -1, online: true })))
      .toContain('<div class="hint-bar waiting-dots">Lights out. Waiting for Ana and Cy</div>');
    // still deciding: the main button
    const mine = controller(g, { viewer: 1, actor: 1, activeHuman: true, humans: [0, 1, 2] });
    expect(toStaticHtml(h(ActionBar, { c: mine, pl: g.players[1], limit: 4, picker: -1, online: true }))).toContain('Lights out <small class="btn-sub">next day</small></button>');
  });

  it('offline the computers have decided as the evening opened: the bar only keeps its room', () => {
    const c = controller(done1, { viewer: 1, actor: 1, activeHuman: false, humans: [0, 1, 2] });
    expect(toStaticHtml(h(ActionBar, { c, pl: done1.players[1], limit: 4, picker: -1, online: false }))).toBe('<footer class="actionbar"><div class="hint-bar"></div></footer>');
  });
});

describe('the bottom bar during the rush and the night (ActionBar.tsx; PLAN-091)', () => {
  const rush = playTo((s) => s.phase === 'reveal');
  const bar = (s: GameState, over: Parameters<typeof controller>[1]) => toStaticHtml(h(ActionBar, { c: controller(s, over), pl: s.players[0], limit: 4, picker: -1, online: false }));

  it('at night the bar is empty: the night\'s own heading says "Night falls"', () => {
    expect(bar(rush, { busy: true, night: true })).toBe('<footer class="actionbar"><div class="hint-bar"></div></footer>');
    expect(toStaticHtml(h(NightShift, { s: rush, viewer: 0 }))).toContain('<b class="tk-label">Night falls</b>');
  });

  it('the bell before the rush and at the flip, and the rush itself: the bar has nothing to add, and no other hint shows', () => {
    for (const phase of ['reveal', 'tie'] as const) {
      const html = bar({ ...rush, phase }, { busy: true, activeHuman: false });
      expect(html).toBe('<footer class="actionbar"><div class="hint-bar"></div></footer>');
    }
    // once the rush is over: the main button, and no Skip of the bar's own
    const done = bar(rush, { activeHuman: false });
    expect(done).toContain('Close for the day');
    expect(done).not.toMatch(/btn skip|Selling…|Every price is open/);
  });
});
