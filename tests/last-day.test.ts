import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { h } from 'preact';
import { CUSTOMER_CARDS, EVENT_CARDS, FRUIT, RIVALS, type FruitId } from '../src/engine/data';
import { aiStep } from '../src/engine/ai';
import {
  beginBuying, count, effectiveMax, finishReveal, newGame, places, publicView, ranking, servingCustomers,
  type GameConfig, type GameState,
} from '../src/engine/game';
import { closingNote, dayLedger, standing } from '../src/engine/story';
import { toStaticHtml } from '../src/ui/cards';
import { TakingsView, stallRows } from '../src/ui/game/panels/SalesSummary';
import { MyStall } from '../src/ui/table';

// Rules 20 (PLAN-108, DEC-120): "remove closing day completely from the game, there's no jam maker" (the owner,
// 2026-11-16). The last day is an ordinary day: no extra $1 on any price, and fruit left at the end is worth nothing.
// The morning card, the shelf chip and the Stocking note say so; the last day's takings are the final result (REP-122
// S1); RULES.md and How to play say the same. (Before rules 20 this file was closing-day.test.ts.)

const FRESH = (f: FruitId) => FRUIT[f].ripe.length - 1;
const GREEN = (f: FruitId) => FRUIT[f].ripe.length;

const cfg = (seed: number, players = 2, extra: Partial<GameConfig> = {}): GameConfig => ({
  players: Array.from({ length: players }, (_, i) => ({ name: `A${i}`, kind: 'ai' as const, level: 'normal' as const, avatar: 'a' })),
  days: 8, unripe: true, upgrades: true, events: false, seed, ...extra,
});
/** A table of shopkeepers (the way the app sets one up), seat 0 played by a computer for the test. */
const shopkeepers = (seed: number, players: number, extra: Partial<GameConfig> = {}): GameConfig => ({
  players: RIVALS.slice(0, players).map((r) => ({ name: r.name, kind: 'ai' as const, level: 'normal' as const, avatar: r.avatar })),
  days: 8, unripe: true, upgrades: true, events: true, seed, ...extra,
});

/** Play computer games forward until `stop` holds. */
function until(s: GameState, stop: (s: GameState) => boolean): GameState {
  for (let guard = 0; !stop(s) && guard < 6000; guard++) {
    if (s.phase === 'morning') s = beginBuying(s);
    else if (s.phase === 'reveal') s = finishReveal(s);
    else s = aiStep(s)!;
  }
  expect(stop(s)).toBe(true);
  return s;
}
const finalRush = (s: GameState) => s.day === s.config.days && s.phase === 'reveal';

/** The last day's rush is over; player 0's shelf is replaced by `ripe` fresh apples and `green` green mangoes. */
function lastDay(extra: Partial<GameConfig>, ripe: number, green = 0): GameState {
  const s = structuredClone(until(newGame(cfg(2, 2, extra)), finalRush));
  const st = s.players[0].stock;
  for (const f of Object.keys(st) as FruitId[]) st[f] = st[f].map(() => 0);
  st.apple[FRESH('apple')] = ripe;
  st.mango[GREEN('mango')] = green;
  return s;
}

const NOTE = 'Last day: anything unsold tonight is worth $0.';

describe('the last day\'s words', () => {
  it('the morning card, the shelf chip and the Stocking note all say leftovers are worth $0, ripe or green', () => {
    for (const extra of [{}, { marketDays: false }] as Partial<GameConfig>[]) {
      for (const [ripe, green] of [[2, 0], [0, 3], [1, 3]]) {
        expect(closingNote(lastDay(extra, ripe, green), 0)).toEqual({ morning: NOTE, chip: 'Unsold = $0', stocking: NOTE });
      }
    }
  });

  it('the shelf chip on your stall (MyStall)', () => {
    const shelf = (s: GameState) => toStaticHtml(h(MyStall, { s, p: 0 }));
    expect(shelf(lastDay({}, 2))).toContain('>Unsold = $0</span>');
    expect(shelf(lastDay({}, 1, 3))).toContain('>Unsold = $0</span>');
    expect(shelf(lastDay({}, 2))).not.toMatch(/Leftovers|jam/i);
    expect(shelf(lastDay({}, 0))).not.toContain('Unsold = $0');
  });

  it('an empty shelf shows no morning line or chip; nothing before the last day or after the game', () => {
    expect(closingNote(lastDay({}, 0), 0)).toEqual({ morning: null, chip: null, stocking: NOTE });
    expect(closingNote(until(newGame(cfg(3)), (s) => s.day === 4), 0)).toBeNull();
    expect(closingNote(finishReveal(lastDay({}, 2)), 0)).toBeNull();
  });
});

describe('the last day is an ordinary day', () => {
  it('its prices equal an ordinary day\'s: every customer card, every guest, and Fixed prices', () => {
    for (const street of [false, true]) {
      const s = structuredClone(newGame(cfg(5, 3, { days: 10, street })));
      s.event = null;
      const guests = EVENT_CARDS.flatMap((e) => (e.extra ? e.extra.wants.map((w) => ({ ...w, fixed: true })) : []));
      const wants = [...CUSTOMER_CARDS.flatMap((c) => c.wants.map((w) => ({ w, generous: false }))), ...guests.map((w) => ({ w, generous: false }))];
      expect(guests.length).toBeGreaterThan(0);
      for (const { w, generous } of [...wants, ...CUSTOMER_CARDS.flatMap((c) => c.wants.map((w) => ({ w, generous: true })))]) {
        const at = (day: number) => { s.day = day; return effectiveMax(s, w, generous); };
        const ordinary = at(9);
        expect(at(10), `${w.fruit} $${w.max}${w.fixed ? ' (guest)' : ''}`).toBe(ordinary);
        expect(at(1)).toBe(ordinary);
      }
    }
  });

  it('in seeded games the rush charges the last day the same top prices as the day before would', () => {
    let lines = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const s = until(newGame(shopkeepers(seed, 2 + (seed % 4))), finalRush);
      const before = { ...s, day: s.day - 1 };
      for (const c of servingCustomers(s)) {
        if (c.order) continue; // a standing order pays its bid
        for (const w of c.original) {
          const l = s.results!.lines.find((x) => x.customerId === c.id && x.fruit === w.fruit);
          if (!l) continue;
          expect(l.max).toBe(effectiveMax(before, w, c.generous));
          lines++;
        }
      }
    }
    expect(lines).toBeGreaterThan(10);
  });

  it('no money is paid for fruit left over, with Market Days on or off', () => {
    let left = 0;
    for (const extra of [{}, { marketDays: false }] as Partial<GameConfig>[]) {
      for (let seed = 1; seed <= 12; seed++) {
        const s = until(newGame(cfg(seed, 2 + (seed % 3), { ...extra, events: true })), finalRush);
        const end = finishReveal(s);
        expect(end.phase).toBe('over');
        s.players.forEach((pl, p) => {
          expect(end.players[p].cash).toBe(pl.cash);
          expect(end.players[p].stats.earned).toBe(pl.stats.earned);
          expect(dayLedger(s, p).net).toBe(end.players[p].cash - s.dayStartCash![p]);
          left += count(pl.stock, undefined, true);
        });
      }
    }
    // The games had ripe fruit left over, so the checks above were not empty.
    expect(left).toBeGreaterThan(0);
  });
});

describe('the last day\'s takings are the final result (REP-122 S1)', () => {
  it('the list of stalls, the cash and the line under it equal the results, from what the viewer may see', () => {
    let checked = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const players = 2 + (seed % 5);
      const s = until(newGame({ ...shopkeepers(seed, players), days: seed % 2 ? 8 : 10 }), finalRush);
      const end = finishReveal(s);
      for (let v = 0; v < players; v++) {
        // the table screen draws the takings from the viewer's own view, where rivals' shelves are empty
        const view = publicView(s, v);
        const rows = stallRows(view, v);
        expect(rows.map((x) => x.p)).toEqual(ranking(end));
        expect(rows.map((x) => x.place)).toEqual(ranking(end).map((i) => places(end)[i]));
        for (const x of rows) expect(x.cash).toBe(end.players[x.p].cash);
        expect(standing(view, v).text).toBe(standing(end, v).text);
        const html = toStaticHtml(h(TakingsView, { s: view, viewer: v }));
        expect(html).toContain('MARKET CLOSED');
        expect(html).not.toMatch(/[Jj]am maker/);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(30);
  });
});

describe('the rules, How to play and the screens say it', () => {
  const read = (f: string) => readFileSync(f, 'utf8');
  const OLD = /Closing Day|[Jj]am maker|Last [Cc]all|last call/;

  it('RULES.md: the goal sentence, and Closing Day only in the history', () => {
    const rules = read('RULES.md');
    expect(rules).toContain('Fruit left on your shelf at the end is worth nothing.');
    // Every section that states the current rules is free of the old words; only the version history (and the line
    // at the top that names rules 20's change) may mention them.
    const HISTORY = /^(Rules version \d+|Balance notes|Open bidding|Tomorrow's queue)/;
    const sections = rules.split(/\n(?=## )/);
    const bad = sections.filter((x) => !HISTORY.test(x.replace(/^## /, '')))
      .flatMap((x) => x.split('\n').filter((l) => OLD.test(l) && !l.startsWith('*Game design by')).map((l) => l.slice(0, 90)));
    expect(bad).toEqual([]);
    expect(rules).toMatch(/## Rules version 20\n/);
  });

  it('How to play, the tips, the first-time popup and the rules text never mention Closing Day or the jam maker', () => {
    for (const f of ['src/ui/HowTo.tsx', 'src/ui/tutorial.ts', 'src/ui/FirstTime.tsx', 'src/ui/rulesText.ts', 'src/ui/Home.tsx']) {
      // (a code comment may say what rules 20 removed)
      expect(read(f).split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n'), f).not.toMatch(OLD);
    }
    expect(read('src/ui/HowTo.tsx')).toContain('The last day is an ordinary day.');
  });

  it('no text the game shows mentions them (comments aside)', () => {
    const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
    const files = ['src/engine/story.ts', 'src/engine/data.ts', ...walk('src/ui').filter((f) => /\.(ts|tsx)$/.test(f))];
    const bad = files.flatMap((f) => read(f).split(/\r?\n/).map((l, i) => ({ f, i: i + 1, l })))
      .filter((x) => !/^\s*(\/\/|\*|\/\*)/.test(x.l) && OLD.test(x.l)).map((x) => `${x.f}:${x.i}: ${x.l.trim().slice(0, 90)}`);
    expect(bad).toEqual([]);
  });
});
