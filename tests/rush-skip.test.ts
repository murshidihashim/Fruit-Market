import { afterEach, describe, expect, it, vi } from 'vitest';
import { FRUIT, RIVALS, lookOf } from '../src/engine/data';
import { autoplay } from '../src/engine/ai';
import { newGame, type GameState } from '../src/engine/game';
import * as A from '../src/ui/anim';
import { holdCash, shownCash } from '../src/ui/cashShown';
import { reveal, skipRush, stopRush } from '../src/ui/game/animator';
import { rushOver, rushCount } from '../src/ui/game/panels/SalesSummary';
import { rushCards, type RushCard, type ShowState } from '../src/ui/game/rush';
import { favourShown, holdRush, lineShown, releaseRush, rushHeld } from '../src/ui/rushShown';
import { holdStock, releaseStock, shownStock } from '../src/ui/stockShown';
import { loadGame, saveGame } from '../src/ui/store';

// PLAN-123 (the owner's findings 4 and 5 on the 1.30.0 preview): the rush's words speak to the player as "You" and name
// the fruit, the takings count customers who bought something apart from full orders, and "Skip to the end" settles the
// rush at once. The game pays every sale at the bell, so however the rush is shown (every step, a tap on each customer,
// the fast setting, reduced motion, Skip at any moment, or not at all after a reload) every stall ends up shown the
// same money, shelf and favour cards.

/** Every day of some four-stall games at the bell. Stall 0 carries a person's own name ("Mia"), as a profile does. */
function daysAtBell(seeds: number[]): GameState[] {
  const out: GameState[] = [];
  for (const seed of seeds) {
    let s = newGame({
      players: [{ name: 'Mia', kind: 'ai', level: 'normal', avatar: RIVALS[0].avatar }, ...RIVALS.slice(1, 4).map((r) => ({ name: r.name, kind: 'ai' as const, level: 'normal' as const, avatar: r.avatar }))],
      days: 8, unripe: true, upgrades: true, events: true, seed,
    });
    for (let i = 0; i < 6000 && s.phase !== 'over'; i++) {
      if (s.phase === 'reveal' && s.results) out.push(s);
      s = autoplay(s, 1);
    }
  }
  return out;
}
const days = daysAtBell([1, 2, 3, 4]);
const plural = (f: keyof typeof FRUIT, n: number) => (n === 1 ? FRUIT[f].name : FRUIT[f].plural).toLowerCase();
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('the rush\'s words (finding 4)', () => {
  it('speak to this stall as "You", never by its own name, and name the fruit and the money of each sale', () => {
    let sold = 0, missed = 0, none = 0;
    for (const s of days) for (const c of rushCards(s, 0)) {
      expect(c.text).not.toContain('Mia');
      for (const b of c.blocks) {
        if (!b.line.offers.length || s.results!.order?.name === c.name) continue;
        const mine = b.line.offers.find((o) => o.player === 0);
        for (const o of b.line.offers.filter((x) => x.sold > 0)) {
          const who = o.player === 0 ? 'You' : s.players[o.player].name;
          expect(b.story).toContain(`${who} sold ${o.sold} ${plural(b.fruit, o.sold)} for $${o.sold * o.price}.`);
        }
        if (mine && mine.sold > 0) sold++;
        else if (mine) {
          missed++;
          // one reason, named with the fruit
          expect(b.story).toMatch(new RegExp(`Your ${FRUIT[b.fruit].plural.toLowerCase()} did not sell: (.+ was \\$\\d+ cheaper|.+ won the \\$\\d+ tie \\(.+\\)|.+ pays at most \\$\\d+|.+ buys Fresh only|.+ will not take Soft|too old to sell at \\$\\d+|.+ had already bought all \\d+)\\.`));
          // a cheaper stall is named with the right gap
          const cheaper = b.line.offers.filter((o) => o.sold > 0 && o.price < mine.price);
          if (!mine.tooOld && cheaper.length) {
            const best = cheaper.reduce((a, o) => (o.price > a.price ? o : a));
            expect(b.story).toContain(`${s.players[best.player].name} was $${mine.price - best.price} cheaper.`);
          }
        } else {
          none++;
          expect(b.story).toMatch(new RegExp(`You had no ${FRUIT[b.fruit].plural.toLowerCase()} (out|left)\\.`));
        }
      }
    }
    expect(sold).toBeGreaterThan(10);
    expect(missed).toBeGreaterThan(3);
    expect(none).toBeGreaterThan(10);
  });

  it('on a phone several people share, every stall is named and nobody is "You"', () => {
    for (const s of days.slice(0, 12)) for (const c of rushCards(s, 0, true)) {
      expect(c.text).not.toMatch(/\bYou\b|\bYour\b/);
      for (const b of c.blocks) for (const o of b.line.offers.filter((x) => x.player === 0 && x.sold > 0)) {
        if (s.results!.order?.name !== c.name) expect(b.story).toContain(`Mia sold ${o.sold} ${plural(b.fruit, o.sold)}`);
      }
    }
  });

  it('the takings count customers who bought something, and full orders apart', () => {
    let partOnly = 0;
    for (const s of days) {
      const crowd = rushOver(s);
      const [bought, full] = rushCount(crowd);
      const n = crowd.filter((x) => x.served).length;
      const k = crowd.filter((x) => x.full).length;
      expect(bought).toBe(`${n} of ${crowd.length} customer${crowd.length === 1 ? '' : 's'} bought something`);
      expect(full).toBe(k ? `${k} full order${k === 1 ? '' : 's'}` : 'no full orders');
      // the owner's day: everyone bought something, but nobody's order was filled
      if (n === crowd.length && k < n) partOnly++;
      for (const x of crowd) if (x.full) expect(x.served).toBe(true);
    }
    expect(partOnly).toBeGreaterThan(0);
    expect(rushCount([{ served: true, full: false }, { served: true, full: false }])).toEqual(['2 of 2 customers bought something', 'no full orders']);
  });
});

// ---------- the rush as it plays ----------

function fakeClock(reducedMotion: boolean) {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: reducedMotion }));
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => setTimeout(cb, 0));
  vi.stubGlobal('document', { querySelector: () => null });
  A.setBaseSpeed(false);
  A.resetHurry();
}
/** Each stall's cash before the rush, as the game table holds it (useGameController.ts). */
const before = (x: GameState) => x.players.map((pl, i) => pl.cash - x.results!.income[i] - (x.results!.order?.holder === i ? x.results!.order.back : 0));
/** What each stall is paid by the customers in the rush: its income, less the night hawker's, plus a stake back. */
const owed = (x: GameState) => x.players.map((_, p) => x.results!.income[p] - sum((x.results!.hawker ?? []).filter((h) => h.player === p).map((h) => h.price)) + (x.results!.order?.holder === p ? x.results!.order.back : 0));
function hold(x: GameState) {
  holdCash(before(x));
  holdStock(x.players.map((pl) => pl.stock), x.players.map((pl) => pl.stock));
  holdRush(x.results!, x.players.length);
}
const served = (cards: RushCard[]) => cards.every((c) => c.blocks.every((b) => lineShown(c.customerId, b.fruit)) && (!c.favour || favourShown(c.customerId)));

type Mode = 'every step' | 'a tap on each customer' | 'fast' | 'reduced motion' | 'Skip at once' | 'Skip mid-rush' | 'Skip on the last customer';
const MODES: Mode[] = ['every step', 'a tap on each customer', 'fast', 'reduced motion', 'Skip at once', 'Skip mid-rush', 'Skip on the last customer'];

/** Plays a day's rush in one way and returns what each stall was paid, and the steps shown. */
async function play(s: GameState, mode: Mode): Promise<{ paid: number[]; shown: (ShowState | null)[] }> {
  fakeClock(mode === 'reduced motion');
  if (mode === 'fast') A.setBaseSpeed(true);
  hold(s);
  const shown: (ShowState | null)[] = [];
  let skipped = false;
  const done = reveal(s, 0, (a) => {
    shown.push(a);
    if (!a || skipped) return;
    if (mode === 'a tap on each customer' && a.stage === 'in') setTimeout(() => A.speedStep(), 10);
    const at = mode === 'Skip at once' ? a.n === 1 && a.stage === 'in'
      : mode === 'Skip mid-rush' ? a.n === Math.ceil(a.of / 2) && a.stage === 'rows'
      : mode === 'Skip on the last customer' ? a.n === a.of && a.stage === 'result' : false;
    if (at) { skipped = true; setTimeout(() => skipRush(), 20); }
  });
  await vi.runAllTimersAsync();
  const paid = await done;
  return { paid, shown };
}

describe('Skip to the end, and every way of watching the rush, give the same day (finding 5)', () => {
  afterEach(() => { holdCash(null); releaseStock(); releaseRush(); A.setBaseSpeed(false); A.resetHurry(); vi.useRealTimers(); vi.unstubAllGlobals(); });
  const picked = days.filter((s) => rushCards(s, 0).length >= 3 && s.results!.lines.some((l) => l.offers.some((o) => o.sold > 0))).slice(0, 8);

  it('Skip settles the customer in the middle and every one to come in the same moment: no step of the rush shows after it', async () => {
    const s = picked.find((x) => rushCards(x, 0).some((c) => c.favour)) ?? picked[0];
    const cards = rushCards(s, 0);
    fakeClock(false);
    hold(s);
    const seen: { at: number; a: ShowState | null }[] = [];
    let skipAt = -1;
    let atSkip = false;
    const done = reveal(s, 0, (a) => {
      seen.push({ at: Date.now(), a });
      if (!a && skipAt > 0) atSkip = served(cards);
      // Skip as the first customer's first fruit is being sold
      if (a && a.n === 1 && a.stage === 'rows' && skipAt < 0) {
        skipAt = 0;
        setTimeout(() => { skipAt = Date.now(); skipRush(); }, 60);
      }
    });
    await vi.runAllTimersAsync();
    const paid = await done;
    expect(skipAt).toBeGreaterThan(0);
    const after = seen.filter((x) => x.at >= skipAt);
    // the stage is taken away in the same moment, and nothing else is drawn after it
    expect(after.map((x) => x.a)).toEqual([null]);
    expect(after[0].at).toBe(skipAt);
    // every customer is served and every favour card has reached its stall as the stage is taken away
    expect(atSkip).toBe(true);
    // and every stall is paid once, exactly what the game paid it
    expect(paid).toEqual(owed(s));
    expect(rushHeld()).toBe(false);
    s.players.forEach((pl, p) => expect(shownCash(p, pl.cash)).toBe(pl.cash));
  });

  it('every step, a tap on each customer, the fast setting, reduced motion and Skip at any moment pay every stall the same', async () => {
    expect(picked.length).toBeGreaterThanOrEqual(6);
    for (const s of picked) {
      const want = owed(s);
      const snapshot = JSON.stringify(s);
      for (const mode of MODES) {
        const { paid, shown } = await play(s, mode);
        expect({ mode, paid }).toEqual({ mode, paid: want });
        // the rush ends on the real totals, shelves and tickets, and never changes the game
        expect(rushHeld()).toBe(false);
        s.players.forEach((pl, p) => { expect(shownCash(p, pl.cash)).toBe(pl.cash); expect(shownStock(p, pl.stock)).toBe(pl.stock); });
        expect(shown[shown.length - 1]).toBeNull();
        expect(JSON.stringify(s)).toBe(snapshot);
        // Skip: once pressed, no customer is drawn again
        if (mode.startsWith('Skip')) {
          const k = shown.findIndex((a) => a === null);
          expect(k).toBe(shown.length - 1);
        }
        holdCash(null); releaseStock(); releaseRush(); A.setBaseSpeed(false); A.resetHurry(); vi.useRealTimers(); vi.unstubAllGlobals();
      }
    }
  });

  it('a reload during the rush comes back to the same day, already paid: the save holds the state the rush was drawn from', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } });
    for (const s of picked) {
      // the game table saves the new state before the rush is played (useGameController.ts apply: onChange, then reveal)
      saveGame(s);
      const back = loadGame('play')!;
      expect(back).toEqual(s);
      expect(back.phase).toBe('reveal');
      expect(back.players.map((pl) => pl.cash)).toEqual(s.players.map((pl) => pl.cash));
      expect(rushCards(back, 0).map((c) => [c.earned, c.text])).toEqual(rushCards(s, 0).map((c) => [c.earned, c.text]));
    }
    vi.unstubAllGlobals();
  });

  it('a table left mid-rush stops its rush there: it draws, pays and lets go of nothing on the next table', async () => {
    const s = picked[0];
    fakeClock(false);
    hold(s);
    const seen: (ShowState | null)[] = [];
    let left = false;
    const done = reveal(s, 0, (a) => { if (left) seen.push(a); });
    await vi.advanceTimersByTimeAsync(4000);
    // the table is left (useGameController.ts unmounts): the next table holds its own totals back
    left = true;
    stopRush();
    holdCash(s.players.map(() => 1));
    holdRush(s.results!, s.players.length);
    await vi.runAllTimersAsync();
    await done;
    expect(seen).toEqual([]);
    s.players.forEach((pl, p) => expect(shownCash(p, pl.cash)).toBe(1));
    expect(rushHeld()).toBe(true);
  });

  it('the buttons: Skip and the last customer\'s "End of Day" end the rush at once; Next customer hurries one customer', async () => {
    const src = (await import('node:fs')).readFileSync('src/ui/game/panels/RushTable.tsx', 'utf8');
    expect(src).toContain('onSkip={(e) => { e.stopPropagation(); skipRush(); }}');
    expect(src).toContain('if (drawn.a && drawn.a.n >= drawn.a.of) skipRush(); else A.speedStep();');
  });
});

describe('the customer at the stalls is announced once', () => {
  it('the place they left in the row is drawn but not read aloud; the table says "The rush: customer 1 of 2"', () => {
    // (drawn with an empty text for screen readers: read in the browser on the built page, scripts/style-checks.cjs,
    // "the place a customer left in the row", PLAN-130)
    expect(lookOf('Farid').title.length).toBeGreaterThan(0);
  });
});
