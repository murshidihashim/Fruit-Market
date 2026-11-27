// The game controller's turns, run without a browser (REP-140 A-01): the turn driver (game/turnDriver.ts) with beats
// that end when the test says so, the steps it plays (game/stepKind.ts) and who is who at the table (game/seats.ts).
// The buy queue, Undo and Done while a piece is moving, the shared phone's hand-over, the online queue, and a whole
// computer game from Day 1 to the results played through the controller's logic.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { h } from 'preact';
import { aiActFor, planPrices, planStall } from '../src/engine/ai';
import { FRUITS, RIVALS, type FruitId } from '../src/engine/data';
import { activePlayer, applyAction, canBuy, newGame, type Action, type GameState } from '../src/engine/game';
import { DEFAULT_CONFIG, type PublicSeat, type RoomView } from '../src/net/protocol';
import * as A from '../src/ui/anim';
import { toStaticHtml } from '../src/ui/cards';
import { HandOver, handOverAsk } from '../src/ui/game/panels/HandOver';
import { drawnFor, handOverOf, humansOf, turnOf } from '../src/ui/game/seats';
import { computerStep, stepKind, type StepKind } from '../src/ui/game/stepKind';
import { KEPT_TAPS, TurnDriver, type Room, type TableHooks } from '../src/ui/game/turnDriver';
import { playLocal, traitPicker, waitsForPerson } from '../src/ui/game/turn';

afterEach(() => { vi.useRealTimers(); A.resetHurry(); });

const person = (name: string) => ({ name, kind: 'human' as const, avatar: RIVALS[0].avatar });
const computer = (i: number) => ({ name: RIVALS[i].name, kind: 'ai' as const, level: 'normal' as const, avatar: RIVALS[i].avatar });

/** A game: people first, then computers. */
const game = (people: string[], computers: number, seed: number, days = 6): GameState => newGame({
  players: [...people.map(person), ...Array.from({ length: computers }, (_, i) => computer(i + 1))], days, unripe: true, upgrades: true, events: true, seed,
});

/** What a person at the table decides, as the plain player of these tests: the first perk, no standing order, two
 *  pieces bought from the first boxes that can be bought, the computer's own crate and prices, keep a tied price. */
function decide(s: GameState, p: number): Action {
  if (s.phase === 'morning') {
    const picker = traitPicker(s, p, false);
    return picker >= 0 ? { kind: 'trait', trait: s.players[picker].traitOffer![0] } : { kind: 'begin' };
  }
  if (s.phase === 'order') return { kind: 'order', price: null };
  if (s.phase === 'buy') {
    const box = s.players[p].boughtToday < 2 ? legalBoxes(s, p)[0] : undefined;
    return box ? { kind: 'buy', fruit: box.f, pos: box.pos } : { kind: 'endBuy' };
  }
  if (s.phase === 'stall') return { kind: 'stall', stall: planStall(s, p) };
  if (s.phase === 'bid') return { kind: 'prices', posts: planPrices(s, p).posts };
  if (s.phase === 'tie') return { kind: 'tie', play: false };
  if (s.phase === 'reveal') return { kind: 'finish' };
  return { kind: 'endEvening' };
}

/** Every market box stall `p` may buy from now. */
function legalBoxes(s: GameState, p: number): { f: FruitId; pos: number }[] {
  return FRUITS.flatMap((f) => s.market[f].map((_, pos) => ({ f, pos }))).filter((x) => canBuy(s, p, x.f, x.pos) === null);
}

/** Who decides next offline: a person (the stall whose turn it is, or the first person on a morning), or null (a
 *  computer, or nobody). */
function personNow(s: GameState): number | null {
  if (s.phase === 'over') return null;
  if (s.phase === 'morning' || s.phase === 'reveal') return Math.max(0, traitPicker(s, 0, false));
  const a = activePlayer(s);
  return a >= 0 && s.players[a].kind === 'human' ? a : null;
}

/** The engine alone, with the same decisions: the game the controller must end up at. */
function playByEngine(start: GameState, stop: (s: GameState) => boolean = (s) => s.phase === 'over'): GameState[] {
  const seen = [start];
  let s = start;
  for (let i = 0; i < 5000 && !stop(s); i++) {
    const p = personNow(s);
    const next = p !== null ? playLocal(s, p, decide(s, p)) : computerStep(s);
    if (!next) throw new Error(`stuck in ${s.phase}`);
    s = next;
    seen.push(s);
  }
  return seen;
}

/** A beat that has been started: the step it shows, and how to end it. */
interface Beat { prev: GameState; next: GameState; kind: StepKind; end: () => void }

/** A turn driver with a screen of its own: beats end at once (or when `end()` is called, with `hold`), each new state
 *  is drawn (the Undo point worked out as the screen does), and what is said and dropped is noted. */
function table(initial: GameState, opts: { room?: Room; hold?: boolean } = {}) {
  const d = new TurnDriver(initial, opts.room);
  const beats: Beat[] = [];
  const shown: GameState[] = [];
  const said: string[] = [];
  const later: (() => void)[] = [];
  const draw = (s: GameState) => { d.pointFor(s, turnOf(s, d.seat, !!opts.room).activeHuman); };
  draw(initial);
  const hooks: TableHooks = {
    play: (prev, next, kind, commit) => new Promise<void>((end) => { commit(); beats.push({ prev, next, kind, end }); if (!opts.hold) end(); }),
    settle: () => {},
    show: (next) => { shown.push(next); draw(next); },
    setBusy: () => {},
    setMover: () => {},
    redraw: () => {},
    say: (msg) => { said.push(msg); },
    dropPick: () => {},
    humans: humansOf(initial.players),
    get active() { return activePlayer(d.s); },
    later: (fn) => { later.push(fn); },
  };
  d.hooks = hooks;
  /** Lets every finished beat hand back, and runs what it left for later, until nothing more happens. */
  const settle = async () => {
    for (let i = 0; i < 50; i++) {
      await Promise.resolve();
      await Promise.resolve();
      const fns = later.splice(0);
      if (!fns.length && !d.busy) return;
      for (const fn of fns) fn();
    }
  };
  /** Ends the beat now playing. */
  const land = async () => { beats[beats.length - 1].end(); await settle(); };
  return { d, beats, shown, said, settle, land };
}

/** The first three boxes stall 0 may buy from can be bought one after another. */
function threeInARow(s: GameState): boolean {
  const boxes = legalBoxes(s, 0).slice(0, 3);
  if (boxes.length < 3) return false;
  try {
    boxes.reduce((x, k) => applyAction(x, 0, { kind: 'buy', fruit: k.f, pos: k.pos }), s);
    return true;
  } catch {
    // the rules refuse one of them (cash or room): look further
    return false;
  }
}

/** A person's buying turn with room to buy several pieces (one person and two computers). */
function personBuying(seed = 3): GameState {
  for (let k = seed; k < seed + 40; k++) {
    const states = playByEngine(game(['Mia'], 2, k), (s) => s.phase === 'buy' && activePlayer(s) === 0 && s.players[0].boughtToday === 0);
    const s = states[states.length - 1];
    if (s.phase === 'buy' && threeInARow(s)) return s;
  }
  throw new Error('no buying turn found');
}

describe('the buy queue (turnDriver.ts pick)', () => {
  it('a tap while a piece is on its way is kept and bought as soon as it lands, in the order tapped', async () => {
    const start = personBuying();
    const t = table(start, { hold: true });
    const [a, b, c] = legalBoxes(start, 0);
    t.d.pick(a.f, a.pos);
    expect(t.d.busy).toBe(true);
    expect(t.beats).toHaveLength(1);
    // two quick taps while the first piece flies: kept, nothing bought yet
    t.d.pick(b.f, b.pos);
    t.d.pick(c.f, c.pos);
    expect(t.d.kept).toEqual([b, c]);
    expect(t.d.s.players[0].boughtToday).toBe(1);
    await t.land();
    expect(t.beats).toHaveLength(2);
    expect(t.d.s.players[0].boughtToday).toBe(2);
    await t.land();
    await t.land();
    expect(t.d.busy).toBe(false);
    expect(t.d.kept).toEqual([]);
    const bought = t.beats.map((x) => stepKind(x.prev, x.next, null));
    expect(bought.every((k) => k.own && k.buyer === 0)).toBe(true);
    expect(t.d.s).toEqual(playLocal(playLocal(playLocal(start, 0, { kind: 'buy', fruit: a.f, pos: a.pos }), 0, { kind: 'buy', fruit: b.f, pos: b.pos }), 0, { kind: 'buy', fruit: c.f, pos: c.pos }));
  });

  it('rapid taps: no more than three are kept, and never one the rules would refuse once the others are bought', async () => {
    const start = structuredClone(personBuying());
    const t = table(start, { hold: true });
    const boxes = legalBoxes(start, 0);
    t.d.pick(boxes[0].f, boxes[0].pos);
    for (let i = 0; i < 8; i++) t.d.pick(boxes[1 + (i % 3)].f, boxes[1 + (i % 3)].pos);
    expect(t.d.kept.length).toBeLessThanOrEqual(KEPT_TAPS);
    // every kept tap is still a purchase the rules allow after the ones before it
    let s = t.d.s;
    for (const k of t.d.kept) s = applyAction(s, 0, { kind: 'buy', fruit: k.f, pos: k.pos });
    for (let i = 0; i < 6 && t.d.busy; i++) await t.land();
    expect(t.d.s.players[0].boughtToday).toBe(1 + Math.min(KEPT_TAPS, t.beats.length - 1));
  });

  it('a box with one piece left, tapped twice while a piece flies, is bought once', async () => {
    const start = structuredClone(personBuying());
    const [a, b] = legalBoxes(start, 0);
    start.market[b.f][b.pos] = 1;
    const t = table(start, { hold: true });
    t.d.pick(a.f, a.pos);
    t.d.pick(b.f, b.pos);
    t.d.pick(b.f, b.pos);
    expect(t.d.kept).toEqual([b]);
  });

  it('a tap kept as the turn passes to a rival buys nothing for the rival: it is dropped as the beat ends', async () => {
    const s = personBuying();
    const t = table(s, { hold: true });
    // the person ends their turn; a tap that still reaches the market while that beat plays is not theirs to keep
    t.d.endBuy();
    const [a] = legalBoxes(s, 0);
    t.d.pick(a.f, a.pos);
    const after = t.d.s;
    await t.land();
    expect(t.d.kept).toEqual([]);
    expect(t.beats).toHaveLength(1);
    expect(t.d.s).toBe(after);
  });
});

describe('Done and Undo while a piece is moving', () => {
  it('Done tapped while the piece flies ends the turn as soon as it has landed', async () => {
    const start = personBuying();
    const t = table(start, { hold: true });
    const [a] = legalBoxes(start, 0);
    t.d.pick(a.f, a.pos);
    t.d.endBuy();
    expect(t.d.endQueued).toBe(true);
    expect(activePlayer(t.d.s)).toBe(0);
    await t.land();
    // the turn has ended: the next beat is the person's Done
    expect(t.beats).toHaveLength(2);
    expect(t.beats[1].prev.players[0].boughtToday).toBe(1);
    expect(activePlayer(t.d.s) === 0 && t.d.s.phase === 'buy').toBe(false);
  });

  it('Undo tapped while a piece flies drops the taps kept and puts back every purchase of the turn once it has landed', async () => {
    const start = personBuying();
    const t = table(start, { hold: true });
    const [a, b, c] = legalBoxes(start, 0);
    t.d.pick(a.f, a.pos);
    await t.land();
    t.d.pick(b.f, b.pos);
    t.d.pick(c.f, c.pos);
    expect(t.d.kept).toEqual([c]);
    t.d.undo();
    expect(t.d.kept).toEqual([]);
    expect(t.d.undoQueued).toBe(true);
    // a tap after Undo is not kept either
    t.d.pick(c.f, c.pos);
    expect(t.d.kept).toEqual([]);
    await t.land();
    // Undo plays as a step of its own: back to the turn's start, every piece in its box again
    expect(t.beats).toHaveLength(3);
    await t.land();
    expect(t.d.s).toBe(start);
    expect(t.d.s.players[0].boughtToday).toBe(0);
  });

  it('a tap\'s hurry lasts until the table waits for the person again', async () => {
    const start = personBuying();
    const t = table(start, { hold: true });
    const [a] = legalBoxes(start, 0);
    t.d.pick(a.f, a.pos);
    A.hurryUp();
    expect(A.hurried()).toBe(true);
    await t.land();
    // the person buys again: the hurry is over
    expect(waitsForPerson(t.d.s, null)).toBe(true);
    expect(A.hurried()).toBe(false);
  });
});

/** Two people at one phone and one computer, at the moment Ana's buying turn passes straight to Bo. */
function sharedPhone(): { s: GameState; ana: number; bo: number } {
  for (let seed = 1; seed < 80; seed++) {
    const states = playByEngine(game(['Ana', 'Bo'], 1, seed), (s) => {
      if (s.phase !== 'buy' || s.players[0].boughtToday > 0 || s.players[1].boughtToday > 0) return false;
      const me = s.order[s.turn], next = s.order[s.turn + 1];
      return s.players[me]?.kind === 'human' && s.players[next]?.kind === 'human' && legalBoxes(s, me).length > 2;
    });
    const s = states[states.length - 1];
    if (s.phase === 'buy') return { s, ana: s.order[s.turn], bo: s.order[s.turn + 1] };
  }
  throw new Error('no hand-over found');
}

describe('the shared phone\'s hand-over (pass-and-play)', () => {
  it('a double tap on Done and a tap on the market across the hand-over act for nobody; the next turn waits for the phone', async () => {
    const { s, ana, bo } = sharedPhone();
    const t = table(s, { hold: true });
    t.d.handTo(ana);
    const [a, b] = legalBoxes(s, ana);
    t.d.pick(a.f, a.pos);
    t.d.endBuy();
    t.d.endBuy();
    // (a tap on the market while Ana's own piece flies is still Ana's: it is bought before her Done)
    t.d.pick(b.f, b.pos);
    for (let i = 0; i < 4 && t.d.busy; i++) await t.land();
    expect(t.beats.map((x) => x.prev.players[ana].boughtToday)).toEqual([0, 1, 2]);
    // Ana's turn has ended; Bo's has not begun and holds nothing of Ana's taps
    expect(activePlayer(t.d.s)).toBe(bo);
    expect(t.d.s.players[bo].boughtToday).toBe(0);
    expect(t.d.handOverPending()).toBe(true);
    expect(t.d.kept).toEqual([]);
    expect(t.d.endQueued).toBe(false);
    const before = t.d.s;
    t.d.pick(b.f, b.pos);
    t.d.endBuy();
    t.d.undo();
    t.d.act({ kind: 'endBuy' });
    expect(t.d.s).toBe(before);
    expect(t.beats).toHaveLength(3);
    // Bo takes the phone: now Bo's taps act
    t.d.handTo(bo);
    t.d.pick(b.f, b.pos);
    await t.land();
    expect(t.d.s.players[bo].boughtToday).toBe(1);
  });

  it('the table stays drawn for the person holding the phone until it is handed on, and the hand-over screen comes once the table is free', () => {
    const { s, ana, bo } = sharedPhone();
    const next = playLocal(s, ana, { kind: 'endBuy' });
    const turn = turnOf(next, null, false);
    expect(turn.active).toBe(bo);
    // not handed yet: still drawn for Ana (Bo's shelf is not drawn); handed: for Bo
    expect(drawnFor(ana, turn, true, ana, false)).toBe(ana);
    expect(drawnFor(ana, turn, true, bo, false)).toBe(bo);
    // one person at a phone: the table follows the turn
    expect(drawnFor(ana, turn, false, null, false)).toBe(bo);
    expect(handOverOf(next, turn, true, ana, true, false)).toEqual({ needHandoff: false, handoffDue: true });
    expect(handOverOf(next, turn, true, ana, false, false)).toEqual({ needHandoff: true, handoffDue: true });
    expect(handOverOf(next, turn, true, bo, false, false)).toEqual({ needHandoff: false, handoffDue: false });
  });

  it('each person\'s own day waits for their hand-over, and the screen shows nobody else\'s', async () => {
    const { s } = sharedPhone();
    // play on to the rush, with every decision made through the controller
    const t = table(s);
    t.d.handTo(activePlayer(s));
    for (let i = 0; i < 400 && t.d.s.phase !== 'reveal'; i++) {
      const cur = t.d.s;
      const p = personNow(cur);
      if (p !== null) { t.d.handTo(p); t.d.act(decide(cur, p), p); } else { const n = computerStep(cur); if (n) void t.d.apply(n); }
      await t.settle();
    }
    const r = t.d.s;
    expect(r.phase).toBe('reveal');
    const [ana, bo] = [0, 1];
    const mine = t.d.ownDay(bo)!;
    expect(mine.day).toBe(r.day);
    const html = toStaticHtml(h(HandOver, { s: r, p: bo, mine, onTap: () => {} }));
    expect(html).toContain(`<h2>${r.players[bo].name}</h2>`);
    expect(html).toContain(`<b class="ho-lab">Your Day ${r.day}</b>`);
    expect(html).toContain(mine.line);
    // nothing of Ana's own day
    const hers = t.d.ownDay(ana)!;
    if (hers.line !== mine.line) expect(html).not.toContain(hers.line);
    expect(html).not.toContain(r.players[ana].name);
    // once handed, that day has been seen
    t.d.handTo(bo);
    expect(t.d.ownDay(bo)).toBeNull();
    expect(t.d.ownDay(ana)).not.toBeNull();
    expect(handOverAsk({ ...r, phase: 'buy' })).toBe('Your turn to buy fruit.');
    expect(handOverAsk({ ...r, phase: 'tie' })).toBe('One of your prices is tied. Play Favoured Trade, or keep it?');
    expect(handOverAsk(r)).toBeNull();
  });
});

/** A room on the other end of the line: it takes every action and Undo, and notes them. */
function room(seat: number) {
  const sent: string[] = [];
  return { seat, sent, act: (a: Action) => { sent.push(a.kind); return true; }, undo: () => { sent.push('undo'); return true; } };
}
const view = (g: GameState | null, version: number, more: Partial<RoomView> = {}): RoomView => ({
  t: 'room', code: 'ABCDE', status: 'playing', you: 0, seats: [], config: DEFAULT_CONFIG, version, game: g, submitted: [], votes: [], rematch: [], ...more,
});
const seat = (i: number, name: string): PublicSeat => ({ seat: i, name, avatar: RIVALS[i].avatar, ready: true, connected: true, host: i === 0 });

describe('online: the room\'s states, one at a time', () => {
  const start = personBuying(5);
  const states = playByEngine(start, (s) => s.phase === 'stall');

  it('newer states of this game are queued and played one beat at a time; an older or another game\'s state is not', async () => {
    const t = table(start, { room: room(0), hold: true });
    // two states of two different buying turns (a turn's own steps would be played together, below)
    const one = states.find((x) => x.turn !== start.turn)!;
    const two = states.find((x) => x.turn !== one.turn && x.turn !== start.turn)!;
    t.d.take(view(one, 1));
    t.d.take(view(one, 1));
    t.d.take(view({ ...two, config: { ...two.config, seed: 999 } }, 2));
    t.d.take(view(two, 2));
    expect(t.d.queue).toHaveLength(2);
    t.d.drain();
    expect(t.d.busy).toBe(true);
    t.d.drain();
    expect(t.beats).toHaveLength(1);
    await t.land();
    t.d.drain();
    expect(t.beats).toHaveLength(2);
  });

  it('a stall\'s buying turn already waiting in the queue is played as one beat', () => {
    const turn = states.filter((s) => s.phase === 'buy' && s.day === start.day && s.turn === start.turn);
    expect(turn.length).toBeGreaterThan(2);
    const t = table(start, { room: room(0), hold: true });
    turn.slice(1).forEach((s, i) => t.d.take(view(s, i + 1)));
    t.d.drain();
    expect(t.beats).toHaveLength(1);
    expect(t.beats[0].next).toBe(turn[turn.length - 1]);
  });

  it('while a standing order is bid for, the same version is shown again (who has bid has changed)', () => {
    const order = { ...start, phase: 'order' as const };
    const t = table(order, { room: room(0), hold: true });
    t.d.take(view(order, 3));
    t.d.take(view({ ...order, turn: 1 }, 3));
    t.d.take(view({ ...order, phase: 'buy' }, 3));
    expect(t.d.queue).toHaveLength(2);
  });

  it('an action is sent once; the next waits for the room\'s answer. A rival\'s Undo is said, not a reconnect\'s', () => {
    const line = room(0);
    const t = table(start, { room: line });
    t.d.act({ kind: 'endBuy' });
    t.d.act({ kind: 'endBuy' });
    t.d.undo();
    expect(line.sent).toEqual(['endBuy']);
    t.d.take(view(null, 0, { undone: { seat: 1, n: 2 } }));
    t.d.undo();
    expect(line.sent).toEqual(['endBuy', 'undo']);
    expect(t.said).toEqual([]);
    t.d.take(view(null, 0, { undone: { seat: 1, n: 3 }, seats: [seat(0, 'Ana'), seat(1, 'Bo')] }));
    expect(t.said).toEqual(['Bo took back their purchases']);
    t.d.take(view(null, 0, { undone: { seat: 0, n: 4 } }));
    expect(t.said).toEqual(['Bo took back their purchases']);
  });
});

describe('a whole computer game through the controller', () => {
  it('Day 1 to the results: the same game as the engine plays with the same decisions, every step shown in order', async () => {
    vi.useFakeTimers();
    const start = game(['Mia'], 3, 11, 8);
    const ref = playByEngine(start);
    const t = table(start);
    for (let i = 0; i < 5000 && t.d.s.phase !== 'over'; i++) {
      const cur = t.d.s;
      const p = personNow(cur);
      if (p !== null) {
        const a = decide(cur, p);
        if (a.kind === 'buy') t.d.pick(a.fruit, a.pos);
        else if (a.kind === 'endBuy') t.d.endBuy();
        else t.d.act(a, cur.phase === 'morning' && a.kind === 'trait' ? p : undefined);
      } else {
        // the computers: after their pause (none in the evening)
        t.d.computers(cur, activePlayer(cur));
        await vi.advanceTimersByTimeAsync(A.BEAT.rival.pause + A.BEAT.tie.ask);
      }
      await t.settle();
    }
    expect(t.d.s.phase).toBe('over');
    expect(t.d.s).toEqual(ref[ref.length - 1]);
    expect(t.shown).toEqual(ref.slice(1));
    expect(t.d.s.players.map((x) => x.cash)).toEqual(ref[ref.length - 1].players.map((x) => x.cash));
  });

  it('the computers decide the evening as it opens, without a pause; elsewhere they wait their pause', async () => {
    vi.useFakeTimers();
    const states = playByEngine(game(['Mia'], 3, 11, 8), (s) => s.phase === 'evening' && s.players[activePlayer(s)]?.kind === 'ai');
    const evening = states[states.length - 1];
    const t = table(evening);
    t.d.computers(evening, activePlayer(evening));
    await t.settle();
    expect(t.beats).toHaveLength(1);
    expect(t.beats[0].next).toEqual(computerStep(evening));
    const buying = playByEngine(game(['Mia'], 3, 11, 8), (s) => s.phase === 'buy' && s.players[activePlayer(s)]?.kind === 'ai');
    const b = buying[buying.length - 1];
    const u = table(b);
    u.d.computers(b, activePlayer(b));
    await u.settle();
    expect(u.beats).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(A.BEAT.rival.pause);
    await u.settle();
    expect(u.beats).toHaveLength(1);
    // a rival's whole buying turn is one beat
    expect(u.beats[0].next.turn === b.turn && u.beats[0].next.phase === 'buy' && u.beats[0].next.day === b.day).toBe(false);
    expect(aiActFor(b, activePlayer(b))).not.toBeNull();
  });
});
