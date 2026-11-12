import { afterEach, describe, expect, it, vi } from 'vitest';
import { h } from 'preact';
import { aiActFor } from '../src/engine/ai';
import { RIVALS } from '../src/engine/data';
import { activePlayer, beginBuying, bidOrder, finishReveal, newGame, publicView, type GameState } from '../src/engine/game';
import * as A from '../src/ui/anim';
import { toStaticHtml } from '../src/ui/cards';
import { ReplaceBody } from '../src/ui/Home';
import { NIGHT, NO_SALES_READ, bellRead, nightfall, reveal, type NightSlide } from '../src/ui/game/animator';
import { NightShift } from '../src/ui/game/panels/NightShift';
import { bidWaitText } from '../src/ui/game/panels/OrderPanel';
import { waitsForPerson } from '../src/ui/game/turn';
import { startOrAsk, waitingGame } from '../src/ui/paused';
import { Street, Tomorrow, beforeArrival } from '../src/ui/table';

// PLAN-081, flow repairs: the reading pauses with reduced motion, a tap's hurry, the Market Day bid, the night on one
// clock, and the question before a paused game is replaced.

/** A four-stall game with a person in seat 0 (three computer stalls). */
const game = (seed: number, days = 10): GameState => newGame({
  players: [{ name: 'Mia', kind: 'human', avatar: RIVALS[0].avatar }, ...RIVALS.slice(1, 4).map((r) => ({ name: r.name, kind: 'ai' as const, level: 'normal' as const, avatar: r.avatar }))],
  days, unripe: true, upgrades: true, events: true, marketDays: true, seed,
});
/** One step, with the computer playing every seat (the person's too). */
function step(s: GameState): GameState {
  if (s.phase === 'morning') return beginBuying(s);
  if (s.phase === 'reveal') return finishReveal(s);
  const n = aiActFor(s, activePlayer(s));
  if (!n) throw new Error(`stuck in ${s.phase}`);
  return n;
}
/** Plays on until `stop` says so. */
function playTo(stop: (s: GameState) => boolean, seed = 1): GameState {
  let s = game(seed);
  for (let i = 0; i < 4000 && s.phase !== 'over'; i++) {
    if (stop(s)) return s;
    s = step(s);
  }
  throw new Error('never reached');
}
const count = (html: string, re: RegExp) => html.match(re)?.length ?? 0;

/** Animations run on timers and the browser's frame clock: both are faked, and motion is set per test. There is no
 *  page here, so nothing is found to fly from or to (the scripts then only wait, which is what these tests time). */
function fakeClock(reducedMotion: boolean) {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: reducedMotion }));
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => setTimeout(cb, 0));
  vi.stubGlobal('document', { querySelector: () => null });
  A.setBaseSpeed(false);
  A.resetHurry();
}
afterEach(() => { A.setBaseSpeed(false); A.resetHurry(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('reduced motion keeps the reading pauses at the bell', () => {
  const atBell = playTo((s) => s.phase === 'reveal' && !!s.results && s.results.lines.some((l) => l.offers.length > 0));
  /** How long the open crates stay on the table, in ms. */
  async function bellShown(tapAt?: number): Promise<number> {
    let on = -1, off = -1;
    const done = reveal(atBell, 0, () => undefined, (open) => { if (open) on = Date.now(); else if (off < 0) off = Date.now(); });
    if (tapAt !== undefined) { await vi.advanceTimersByTimeAsync(tapAt); A.hurryUp(); }
    await vi.runAllTimersAsync();
    await done;
    return off - on;
  }

  it('the open crates stay as long with reduced motion as without (they used to flash by in a twentieth of the time)', async () => {
    const full = bellRead(atBell.players.length);
    expect(full).toBe(1500 + 350 * 4);
    fakeClock(false);
    expect(await bellShown()).toBe(full);
    fakeClock(true);
    expect(A.isReduced()).toBe(true);
    expect(await bellShown()).toBe(full);
  });

  it('"No sales today" stays its full time with reduced motion', async () => {
    const none = structuredClone(atBell);
    for (const l of none.results!.lines) l.offers = [];
    for (const reducedMotion of [false, true]) {
      fakeClock(reducedMotion);
      const t0 = Date.now();
      let bell = false;
      const done = reveal(none, 0, () => undefined, () => { bell = true; });
      await vi.advanceTimersByTimeAsync(NO_SALES_READ - 100);
      let over = false;
      void done.then(() => { over = true; });
      await vi.advanceTimersByTimeAsync(1);
      expect(over).toBe(false);
      await vi.runAllTimersAsync();
      await done;
      expect(Date.now() - t0).toBeGreaterThanOrEqual(NO_SALES_READ);
      expect(bell).toBe(false);
    }
  });

  it('a tap still ends the pause at once, and the fast setting still shortens it', async () => {
    fakeClock(true);
    expect(await bellShown(400)).toBe(400);
    fakeClock(true);
    A.setBaseSpeed(true);
    expect(await bellShown()).toBeLessThan(bellRead(atBell.players.length) * 0.6);
  });
});

describe('a tap hurries until the player\'s next decision', () => {
  it('the hurry lasts until it is reset, and a rival\'s pause ends at once on a tap', async () => {
    fakeClock(false);
    let ended = false;
    void A.pause(380).then(() => { ended = true; });
    await vi.advanceTimersByTimeAsync(100);
    expect(ended).toBe(false);
    A.hurryUp();
    await vi.advanceTimersByTimeAsync(0);
    expect(ended).toBe(true);
    // The next pauses are short for as long as the hurry lasts, however many follow ...
    for (let turn = 0; turn < 3; turn++) {
      expect(A.hurried()).toBe(true);
      let short = false;
      void A.pause(380).then(() => { short = true; });
      await vi.advanceTimersByTimeAsync(60);
      expect(short).toBe(true);
    }
    // ... and back to their full length once the table waits for the player again.
    A.resetHurry();
    let full = false;
    void A.pause(380).then(() => { full = true; });
    await vi.advanceTimersByTimeAsync(379);
    expect(full).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(full).toBe(true);
  });

  it('offline, the table waits for the person at the morning news, on their own turn, at the takings and at the end', () => {
    const seen = new Set<string>();
    let s = game(3);
    for (let i = 0; i < 4000 && s.phase !== 'over'; i++) {
      const a = activePlayer(s);
      const mine = a >= 0 && s.players[a].kind === 'human';
      const rival = a >= 0 && s.players[a].kind === 'ai';
      if (s.phase === 'morning' || s.phase === 'reveal') expect(waitsForPerson(s, null)).toBe(true);
      else {
        expect(waitsForPerson(s, null)).toBe(mine);
        // While a computer stall is playing, a hurry carries on.
        if (rival) expect(waitsForPerson(s, null)).toBe(false);
      }
      seen.add(`${s.phase}:${mine ? 'me' : rival ? 'rival' : '-'}`);
      s = step(s);
    }
    expect(waitsForPerson(s, null)).toBe(true); // the results
    for (const k of ['buy:me', 'buy:rival', 'stall:me', 'stall:rival', 'bid:me', 'bid:rival', 'order:rival', 'order:me', 'evening:rival']) expect(seen, k).toContain(k);
  });

  it('online, only the person\'s own seat counts, and a secret step waits until their own choice is in', () => {
    const buying = playTo((s) => s.phase === 'buy' && activePlayer(s) === 0, 3);
    expect(waitsForPerson(buying, 0)).toBe(true);
    expect(waitsForPerson(buying, 1)).toBe(false);
    // Pricing: every stall is waited for until its own prices are in.
    const pricing = playTo((s) => s.phase === 'bid' && activePlayer(s) === 0 && s.bids.filter((b) => b === null).length >= 2, 3);
    expect(waitsForPerson(pricing, 0)).toBe(true);
    const priced = step(pricing);
    expect(priced.phase).toBe('bid');
    expect(waitsForPerson(priced, 0)).toBe(false);
    expect(waitsForPerson(priced, activePlayer(priced))).toBe(true);
    const order = playTo((s) => s.phase === 'order', 3);
    expect(waitsForPerson(order, 0)).toBe(true);
    expect(waitsForPerson(bidOrder(bidOrder(order, 1, null), 0, null), 0)).toBe(false);
  });
});

describe('the Market Day bid keeps the table as it is in the morning', () => {
  // A Market Day morning with a new standing order, then the bid.
  const morning = playTo((s) => s.phase === 'morning' && !!s.standing && s.standing.holder === null && s.queue.length > 0);
  const bid = beginBuying(morning);

  it('is the bid step, and it counts as "before the customers arrive"', () => {
    expect(bid.phase).toBe('order');
    expect(['morning', 'order', 'buy'].map((phase) => beforeArrival({ ...bid, phase } as GameState))).toEqual([true, true, true]);
    expect(['stall', 'bid', 'tie', 'reveal', 'evening', 'over'].map((phase) => beforeArrival({ ...bid, phase } as GameState))).toEqual([false, false, false, false, false, false]);
  });

  it('the customer row is the same as in the morning (it used to empty)', () => {
    const row = (s: GameState) => toStaticHtml(h(Street, { s: publicView(s, 0), viewer: 0 }));
    const cards = count(row(morning), /class="cust /g);
    expect(cards).toBe(morning.secondMarket.length + morning.firstMarket.length + 1 + (morning.event?.extra ? 1 : 0) + morning.queue.length);
    expect(cards).toBeGreaterThanOrEqual(2);
    expect(row(bid)).toBe(row(morning));
    // and it is the same again while stalls buy
    expect(row({ ...bid, phase: 'buy' })).toBe(row(morning));
  });

  it('the strip under it holds tomorrow\'s crowd, not today\'s (it used to show today\'s under the label "Tomorrow")', () => {
    const strip = (s: GameState) => toStaticHtml(h(Tomorrow, { s: publicView(s, 0), viewer: 0 }));
    expect(strip(bid)).toBe(strip(morning));
    expect(strip(bid)).toContain('>Tomorrow<');
    expect(count(strip(bid), /class="tm-chip/g)).toBe((bid.nextForecast ? 1 : 0) + (bid.nextQueue?.length ?? 0));
    // today's regular is in the row, not in the strip
    expect(bid.forecast).toBeTruthy();
    expect(bid.nextForecast?.id).not.toBe(bid.forecast!.id);
  });

  it('says "Bid in" only once the player has bid or passed', () => {
    // Offline the computer stalls decide first: the panel is up before the person's own turn.
    expect(bidWaitText(null, false, false)).toBe('The other stalls bid first. Your turn is next');
    expect(bidWaitText(null, false, false)).not.toMatch(/Bid in|Waiting/);
    // After the player's own choice.
    expect(bidWaitText(7, true, true)).toBe('Your bid: $7. You can change it until the last stall decides');
    expect(bidWaitText('pass', true, true)).toBe('You passed. You can change it until the last stall decides');
    expect(bidWaitText('pass', true, false)).toBe('You passed. Waiting for the other stalls');
    // Online the room holds the choice until everyone has decided, so the game on the phone may not show it yet.
    expect(bidWaitText(null, true, true)).toBe('Bid in. You can change it until the last stall decides');
  });
});

describe('the night: the panel and its slide on one clock', () => {
  const dusk = playTo((s) => s.phase === 'reveal' && s.day >= 2 && !s.event?.ageExtra && Object.values(s.players[0].stock).flat().some((n) => n > 0));

  /** Runs the night and notes when each thing happens, in ms from the start. `tapAt`: a tap on the table then. */
  async function night(tapAt?: number) {
    const log: { at: number; what: string; slide?: NightSlide }[] = [];
    const t0 = Date.now();
    const done = nightfall(publicView(dusk, 0), (on) => log.push({ at: Date.now() - t0, what: on ? 'panel' : 'off' }), (slide) => log.push({ at: Date.now() - t0, what: 'slide', slide }));
    if (tapAt !== undefined) { await vi.advanceTimersByTimeAsync(tapAt); A.hurryUp(); }
    await vi.runAllTimersAsync();
    await done;
    const slides = log.filter((x) => x.what === 'slide');
    const start = slides.find((x) => typeof x.slide === 'number')!;
    const rest = slides.find((x) => x.slide === 'done')!;
    return { start: start.at, length: start.slide as number, rest: rest.at, end: Date.now() - t0, first: slides[0].slide };
  }

  it('at normal speed: dusk, a 1.5 s slide, then the panel goes, 3.7 s in all as before', async () => {
    fakeClock(false);
    const n = await night();
    expect(n.first).toBeNull();
    expect(n).toMatchObject({ start: NIGHT.dusk, length: NIGHT.slide });
    expect(n.rest).toBeGreaterThanOrEqual(n.start + n.length);
    expect(n.end).toBeGreaterThan(n.rest);
    expect(n.end).toBeGreaterThanOrEqual(3650);
    expect(n.end).toBeLessThanOrEqual(3750);
  });

  it('with "Fast rivals" on, the slide is shorter too and still ends before the panel goes (it used to be cut off)', async () => {
    fakeClock(false);
    A.setBaseSpeed(true);
    const n = await night();
    expect(n.length).toBeCloseTo(NIGHT.slide * 0.55, 5);
    expect(n.start + n.length).toBeLessThanOrEqual(n.rest);
    expect(n.rest).toBeLessThan(n.end);
    expect(n.end).toBeLessThan(2200);
  });

  it('a tap during the slide ends it at once: the pieces rest in their new boxes before the panel goes', async () => {
    fakeClock(false);
    const tap = NIGHT.dusk + 400;
    const n = await night(tap);
    expect(n.rest).toBe(tap);
    expect(n.end).toBeGreaterThan(n.rest);
    expect(n.end).toBeLessThan(tap + 400);
  });

  it('a tap before the slide plays a short slide, whole, before the panel goes', async () => {
    fakeClock(false);
    const n = await night(300);
    expect(n.start).toBe(300);
    expect(n.length).toBeCloseTo(NIGHT.slide * 0.15, 5);
    expect(n.start + n.length).toBeLessThanOrEqual(n.rest);
    expect(n.rest).toBeLessThan(n.end);
  });

  it('with reduced motion nothing slides, and the panel stays about as long, to be read', async () => {
    fakeClock(true);
    const n = await night();
    expect(n.end).toBeGreaterThanOrEqual(NIGHT.slide + NIGHT.read);
  });

  it('the panel has no clock of its own: it draws what the script says', () => {
    const view = publicView(dusk, 0);
    const panel = (slide: NightSlide) => toStaticHtml(h(NightShift, { s: view, viewer: 0, slide }));
    expect(panel(null)).not.toContain('moved');
    expect(panel(null)).not.toContain('--ns-ms');
    const sliding = panel(825);
    expect(sliding).toContain('moved');
    expect(sliding).toContain('--ns-ms:825ms');
    expect(sliding).not.toMatch(/ns-piece[^"]*\brest\b/);
    expect(panel('done')).toMatch(/ns-piece[^"]*\bmoved\b[^"]*\brest\b/);
  });
});

describe('a paused game is not replaced without asking', () => {
  const paused = playTo((s) => s.phase === 'buy' && s.day === 4);

  it('knows which game is waiting: the day, the length, the stalls and your cash', () => {
    expect(waitingGame(paused)).toEqual({ day: 4, days: 10, stalls: 4, cash: paused.players[0].cash });
    expect(waitingGame(null)).toBeNull();
    // A finished game is not waiting.
    expect(waitingGame({ ...paused, phase: 'over' })).toBeNull();
    // Friends sharing the phone: no single cash total to show.
    const shared = structuredClone(paused);
    shared.players[1].kind = 'human';
    expect(waitingGame(shared)?.cash).toBeNull();
  });

  it('asks first when a game is waiting, and starts at once when none is', () => {
    const started: string[] = [];
    const asked: (() => void)[] = [];
    startOrAsk(null, () => started.push('daily'), (go) => asked.push(go));
    expect(started).toEqual(['daily']);
    expect(asked.length).toBe(0);

    startOrAsk(waitingGame(paused), () => started.push('league'), (go) => asked.push(go));
    expect(started).toEqual(['daily']); // nothing started yet: the saved game is untouched
    expect(asked.length).toBe(1);
    asked[0](); // "Start anyway"
    expect(started).toEqual(['daily', 'league']);
  });

  it('the question names the waiting game and offers to keep it or start anyway', () => {
    const picked: string[] = [];
    const tree = h(ReplaceBody, { ...waitingGame(paused)!, what: 'the Daily market', onKeep: () => picked.push('keep'), onStart: () => picked.push('start') });
    const html = toStaticHtml(tree);
    expect(html).toContain('Day 4 of 10');
    expect(html).toContain('4 stalls');
    expect(html).toContain(`you have $${paused.players[0].cash}`);
    expect(html).toContain('Starting the Daily market ends this game.');
    expect(html).toMatch(/<button[^>]*>Keep my game<\/button>/);
    expect(html).toMatch(/<button[^>]*>Start anyway<\/button>/);
    // Keeping the game is the main button.
    expect(html.indexOf('Keep my game')).toBeLessThan(html.indexOf('Start anyway'));
    expect(html).toMatch(/class="btn primary big wide"[^>]*>Keep my game/);
  });
});
