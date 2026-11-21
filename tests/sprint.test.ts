// PLAN-114: the Market Sprint. Its set-up (shared by the app and the server), the server's replay check and boards
// (the day's board, your place and the players around you, the weekly ranking), the one reason on the results, and the
// best of the day kept on the phone.
import { beforeEach, describe, expect, it } from 'vitest';
import { aiStep, planPrices, planStall } from '../src/engine/ai';
import { FRUITS } from '../src/engine/data';
import { dailyConfig, dailyTwist, isoWeek, SPRINT_DAYS, sprintConfig } from '../src/engine/daily';
import { applyAction, beginBuying, canBuy, finishReveal, newGame, type Action, type GameConfig, type GameState, type LineResult } from '../src/engine/game';
import { sprintReason } from '../src/engine/sprint';
import { ordinal, placeWords } from '../src/net/sprint';
import { AI_VERSION, PROTOCOL_VERSION, RULES_VERSION } from '../src/net/protocol';
import {
  addSprintEntry, addWeekScore, boardView, dailyBoardKey, NAME_TAKEN, SPRINT_TOP, sprintBoardKey, sprintWeekKey, utcDay, verifyDaily, weekView,
  type DailyEntry, type WeekEntry,
} from '../server/meta';
import { loadSprintBest, saveSprintBest } from '../src/ui/sprintStore';

const NOW = Date.UTC(2026, 10, 21, 12);
const DATE = utcDay(NOW);

/** Plays a game as a simple person (buys a little, sets out and prices like the computer) and records the moves. */
function play(cfg: GameConfig, perk = 1): { s: GameState; moves: Action[] } {
  let s = newGame(cfg);
  const me = s.players.findIndex((p) => p.kind === 'human');
  const moves: Action[] = [];
  const act = (a: Action) => { s = applyAction(s, me, a); moves.push(a); };
  for (let i = 0; i < 5000 && s.phase !== 'over'; i++) {
    if (s.phase === 'morning') {
      if (s.day === 1 && !s.players[me].trait) { act({ kind: 'trait', trait: s.players[me].traitOffer![perk % s.players[me].traitOffer!.length] }); continue; }
      s = beginBuying(s); continue;
    }
    if (s.phase === 'reveal') { s = finishReveal(s); continue; }
    const ai = aiStep(s);
    if (ai) { s = ai; continue; }
    if (s.phase === 'buy') {
      const pick = FRUITS.flatMap((f) => s.market[f].map((_, pos) => ({ f, pos }))).find(({ f, pos }) => !canBuy(s, me, f, pos));
      if (pick && s.players[me].boughtToday < 2) act({ kind: 'buy', fruit: pick.f, pos: pick.pos });
      else act({ kind: 'endBuy' });
    } else if (s.phase === 'stall') act({ kind: 'stall', stall: planStall(s, me) });
    else if (s.phase === 'bid') act({ kind: 'prices', posts: planPrices(s, me).posts });
    else if (s.phase === 'order') act({ kind: 'order', price: null });
    else if (s.phase === 'evening') act({ kind: 'endEvening' });
    else if (s.phase === 'tie') act({ kind: 'tie', play: true });
  }
  return { s, moves };
}

const OWNER = 'a'.repeat(64);
const sub = (actions: Action[], extra: Partial<{ date: string; name: string; rv: number; av: number }> = {}) =>
  ({ date: DATE, name: 'Tester', actions, rv: RULES_VERSION, av: AI_VERSION, ...extra });

describe('the Sprint set-up', () => {
  it('is three days, four stalls, the Daily rivals at their levels, no upgrades and no twist', () => {
    const c = sprintConfig(DATE, 'Me');
    const d = dailyConfig(DATE, 'Me');
    expect(c.days).toBe(SPRINT_DAYS);
    expect(SPRINT_DAYS).toBe(3);
    expect(c.players).toHaveLength(4);
    expect(c.players).toEqual(d.players);
    expect(c.players.slice(1).map((p) => p.level)).toEqual(['normal', 'hard', 'normal']);
    expect(c).toMatchObject({ upgrades: false, events: true, unripe: true, daily: DATE, sprint: true });
    expect(c.core).toBeUndefined();
    expect(c.street).toBeUndefined();
    // Every weekday's Sprint has the same set-up whatever the Daily's twist is; only the seed changes with the date.
    const week = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22'];
    expect(new Set(week.map((x) => dailyTwist(x).title)).size).toBe(7);
    for (const x of week) expect({ ...sprintConfig(x, 'Me'), seed: 0, daily: '' }).toEqual({ ...c, seed: 0, daily: '' });
  });

  it('has its own seed each day, never the Daily market\'s', () => {
    const seeds = new Set<number>();
    for (let i = 0; i < 60; i++) {
      const date = utcDay(NOW + i * 86_400_000);
      expect(sprintConfig(date, 'A').seed).not.toBe(dailyConfig(date, 'A').seed);
      expect(sprintConfig(date, 'A').seed).toBe(sprintConfig(date, 'B').seed); // the same for everyone
      seeds.add(sprintConfig(date, 'A').seed);
    }
    expect(seeds.size).toBe(60);
  });

  it('ends after three days with no standing order and no upgrade ever offered', () => {
    for (let i = 0; i < 40; i++) {
      let s = newGame(sprintConfig(utcDay(NOW + i * 86_400_000), 'Me'));
      s = { ...s, players: s.players.map((p) => ({ ...p, kind: 'ai' as const, level: p.level ?? 'normal' })) };
      for (let g = 0; g < 5000 && s.phase !== 'over'; g++) {
        expect(s.standing ?? null).toBeNull();
        expect(s.players.every((p) => !p.upgradeOffer?.length && p.upgrades.length === 0)).toBe(true);
        if (s.phase === 'morning') { s = beginBuying(s); continue; }
        if (s.phase === 'reveal') { s = finishReveal(s); continue; }
        const next = aiStep(s);
        if (!next) throw new Error(`stuck in ${s.phase}`);
        s = next;
      }
      expect(s.phase).toBe('over');
      expect(s.history).toHaveLength(3);
    }
  });

  it('is the same starting table for everyone: one perk offer, the same lorry and the same first customers', () => {
    const a = newGame(sprintConfig(DATE, 'Ann'));
    const b = newGame(sprintConfig(DATE, 'Bob'));
    expect(a.players[0].traitOffer).toEqual(b.players[0].traitOffer);
    expect(a.players[0].traitOffer!.length).toBeGreaterThan(1);
    expect(a.delivery).toEqual(b.delivery);
    expect(a.forecast).toEqual(b.forecast);
    expect(a.players.map((p) => p.cash)).toEqual(b.players.map((p) => p.cash));
  });

  it('the flag is never read by the rules: a game with or without it plays the same', () => {
    const c = sprintConfig(DATE, 'Me');
    const { sprint: _flag, ...plain } = c;
    const one = play(c);
    const two = play(plain);
    expect(two.moves).toEqual(one.moves);
    expect(two.s.players.map((p) => p.cash)).toEqual(one.s.players.map((p) => p.cash));
    expect(two.s.history).toEqual(one.s.history);
  });

  it('leaves the Daily market and the version numbers as they were', () => {
    expect(dailyConfig(DATE, 'Me').sprint).toBeUndefined();
    expect(RULES_VERSION).toBe(20);
    expect(PROTOCOL_VERSION).toBe(5);
    expect(AI_VERSION).toBe(7);
  });

  it('names ISO weeks (Monday to Sunday; week 1 holds the first Thursday)', () => {
    expect(isoWeek('2026-11-21')).toBe('2026-W47');
    expect(isoWeek('2026-11-16')).toBe('2026-W47');
    expect(isoWeek('2026-11-22')).toBe('2026-W47');
    expect(isoWeek('2026-11-23')).toBe('2026-W48');
    expect(isoWeek('2026-01-01')).toBe('2026-W01');
    expect(isoWeek('2027-01-01')).toBe('2026-W53');
    expect(isoWeek('2024-12-30')).toBe('2025-W01');
  });
});

describe('the server: replaying a Sprint', () => {
  it('replays a submitted Sprint and gets the same score', () => {
    const { s, moves } = play(sprintConfig(DATE, 'Tester'));
    expect(s.phase).toBe('over');
    expect(s.config.days).toBe(3);
    const { entry, state } = verifyDaily(sub(moves), NOW, OWNER, true);
    expect(state.config.sprint).toBe(true);
    expect(entry.cash).toBe(s.players[0].cash);
    expect(entry.sold).toBe(s.players[0].stats.sold);
  });

  it('a Sprint\'s moves are not a Daily market game', () => {
    const sprint = play(sprintConfig(DATE, 'Tester'));
    expect(() => verifyDaily(sub(sprint.moves), NOW, OWNER)).toThrow();
  });

  it('keeps the update rule, the closed dates and the name checks', () => {
    const { moves } = play(sprintConfig(DATE, 'Tester'));
    expect(() => verifyDaily(sub(moves, { rv: RULES_VERSION - 1 }), NOW, OWNER, true)).toThrow();
    expect(() => verifyDaily(sub(moves, { av: 6 }), NOW, OWNER, true)).toThrow();
    expect(() => verifyDaily(sub(moves, { date: '2020-01-01' }), NOW, OWNER, true)).toThrow('That day\'s Sprint is closed.');
    expect(() => verifyDaily(sub(moves.slice(0, 5)), NOW, OWNER, true)).toThrow();
    expect(verifyDaily(sub(moves, { name: 'Sh1tHead' }), NOW, OWNER, true).entry.name).toBe('Shopkeeper aaaa');
  });

  it('keeps a board for each day, apart from the Daily market\'s, and one ranking for each week', () => {
    expect(sprintBoardKey('2026-11-21')).toBe(`sprint:2026-11-21:r${RULES_VERSION}:a${AI_VERSION}`);
    expect(sprintBoardKey('2026-11-21')).not.toBe(dailyBoardKey('2026-11-21'));
    expect(sprintWeekKey('2026-11-16')).toBe(sprintWeekKey('2026-11-22'));
    expect(sprintWeekKey('2026-11-23')).not.toBe(sprintWeekKey('2026-11-22'));
  });
});

const e = (name: string, cash: number, owner: string, at = 1, sold = 0): DailyEntry => ({ name, cash, sold, at, owner });

describe('the server: the day\'s board', () => {
  it('keeps one entry per device, the best counts, retries allowed', () => {
    let b = addSprintEntry([], e('Ann', 30, 'a'));
    b = addSprintEntry(b, e('Ann', 20, 'a', 2));
    b = addSprintEntry(b, e('Ann', 41, 'a', 3));
    expect(b).toHaveLength(1);
    expect(b[0].cash).toBe(41);
    expect(() => addSprintEntry(b, e('ann', 50, 'b'))).toThrow(NAME_TAKEN);
  });

  it('gives the top ten, your place out of everyone, and the players just above and below you', () => {
    let b: DailyEntry[] = [];
    const nm = (i: number) => `P${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + Math.floor(i / 26))}`;
    for (let i = 0; i < 48; i++) b = addSprintEntry(b, e(nm(i), 100 - i, `o${i}`, i));
    const v = boardView(b, 'o11');
    expect(v.top).toHaveLength(SPRINT_TOP);
    expect(v.top.map((x) => x.place)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(v.players).toBe(48);
    expect(v.rank).toBe(12);
    expect(placeWords(v)).toBe('12th of 48');
    expect(v.around.map((x) => [x.place, x.name, !!x.me])).toEqual([[11, nm(10), false], [12, nm(11), true], [13, nm(12), false]]);
    expect(JSON.stringify(v)).not.toContain('o11'); // owner hashes never leave the server
    expect(boardView(b, 'o0').around.map((x) => x.place)).toEqual([1, 2]);
    expect(boardView(b, 'o47').around.map((x) => x.place)).toEqual([47, 48]);
    expect(boardView(b, 'nobody').rank).toBeUndefined();
    expect(boardView(b, 'nobody').around).toEqual([]);
    expect(boardView(b)).toMatchObject({ players: 48, around: [] });
  });

  it('orders by cash, then fruit sold, then the earlier score', () => {
    let b = addSprintEntry([], e('A', 30, 'a', 5, 9));
    b = addSprintEntry(b, e('B', 30, 'b', 1, 10));
    b = addSprintEntry(b, e('C', 30, 'c', 2, 10));
    expect(b.map((x) => x.name)).toEqual(['B', 'C', 'A']);
  });
});

describe('the server: the weekly ranking', () => {
  it('adds each device\'s best Sprint of each day, by its latest name', () => {
    let w: WeekEntry[] = [];
    w = addWeekScore(w, 'a', 'Ann', '2026-11-16', 30, 5, 1);
    w = addWeekScore(w, 'a', 'Ann', '2026-11-16', 20, 5, 2); // a worse retry changes nothing
    w = addWeekScore(w, 'a', 'Annie', '2026-11-17', 25, 4, 3);
    w = addWeekScore(w, 'b', 'Bob', '2026-11-16', 50, 6, 4);
    w = addWeekScore(w, 'c', 'Cat', '2026-11-17', 10, 1, 5);
    const v = weekView(w, 'a');
    expect(v.top.map((x) => [x.name, x.cash, x.days])).toEqual([['Annie', 55, 2], ['Bob', 50, 1], ['Cat', 10, 1]]);
    expect(v.rank).toBe(1);
    expect(placeWords(v)).toBe('1st of 3');
    w = addWeekScore(w, 'b', 'Bob', '2026-11-16', 70, 6, 6); // a better retry raises that day
    expect(weekView(w).top.map((x) => [x.name, x.cash])).toEqual([['Bob', 70], ['Annie', 55], ['Cat', 10]]);
    expect(JSON.stringify(weekView(w, 'b'))).not.toMatch(/"owner"/);
  });
});

/** A one-day history for the reason tests: lines with each stall's offer. */
function withHistory(lines: LineResult[], cash: number[]): GameState {
  const g = newGame(sprintConfig(DATE, 'Me'));
  return { ...g, phase: 'over', players: g.players.map((p, i) => ({ ...p, cash: cash[i], stock: { ...p.stock } })), history: [{ day: 2, lines, income: [0, 0, 0, 0], cash }] };
}
const offer = (player: number, price: number, sold: number, qty = 2) => ({ player, qty, price, sold, freshness: 2 });

describe('the one reason on the Sprint results', () => {
  it('names the rival whose lower price sold first, from the game\'s own record', () => {
    const s = withHistory([{ customerId: 1, name: 'Zara', fruit: 'mango', want: 2, max: 7, offers: [offer(0, 6, 0), offer(2, 4, 2)] }], [20, 30, 40, 25]);
    const r = sprintReason(s, 0)!;
    expect(r.kind).toBe('undercut');
    expect(r.text).toMatch(new RegExp(`^Day 2: ${s.players[2].name}'s \\$4 sold first to .+; yours was \\$6\\.$`));
    expect(r.text).not.toContain('!');
  });

  it('a win names your best sale at the top price', () => {
    const s = withHistory([
      { customerId: 1, name: 'Zul', fruit: 'watermelon', want: 2, max: 7, offers: [offer(0, 7, 2), offer(1, 8, 0)] },
      { customerId: 2, name: 'Ida', fruit: 'apple', want: 3, max: 5, offers: [offer(0, 4, 3)] },
    ], [60, 30, 40, 25]);
    const r = sprintReason(s, 0)!;
    expect(r).toMatchObject({ kind: 'top', good: true });
    expect(r.text).toMatch(/^Day 2: you sold 2 watermelons to .+ at \$7, the top price\.$/);
  });

  it('otherwise names fruit left at the end, or your best sale', () => {
    const s = withHistory([{ customerId: 1, name: 'Ida', fruit: 'apple', want: 3, max: 5, offers: [offer(0, 4, 3)] }], [10, 30, 40, 25]);
    expect(sprintReason(s, 0)!.text).toMatch(/^Day 2: you sold 3 apples to .+ at \$4; the top price was \$5\.$/);
    const left = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, stock: { ...p.stock, apple: [2, 0, 0] } } : p)) };
    expect(sprintReason(left, 0)).toMatchObject({ kind: 'left', text: '2 fruit were left on your shelf at the end, worth $0.' });
  });

  it('always has something to say after a real Sprint', () => {
    for (let i = 0; i < 20; i++) {
      const { s } = play(sprintConfig(utcDay(NOW + i * 86_400_000), 'Me'), i);
      const r = sprintReason(s, 0);
      expect(r?.text.length).toBeGreaterThan(10);
    }
  });
});

describe('places in words', () => {
  it('says 1st, 2nd, 3rd, 11th, 12th, 21st, 112th', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 112].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '101st', '112th']);
    expect(placeWords(undefined)).toBeNull();
    expect(placeWords({ players: 4 })).toBeNull();
  });
});

describe('your best Sprint of the day on the phone', () => {
  const mem = new Map<string, string>();
  beforeEach(() => {
    mem.clear();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k),
    };
  });

  it('keeps the best of each day for two weeks', () => {
    expect(loadSprintBest()).toEqual({});
    saveSprintBest('2026-11-21', 30, 4);
    saveSprintBest('2026-11-21', 25, 9);
    saveSprintBest('2026-11-21', 30, 6);
    expect(loadSprintBest()['2026-11-21']).toEqual({ cash: 30, sold: 6 });
    for (let i = 1; i <= 20; i++) saveSprintBest(utcDay(Date.UTC(2026, 9, i)), i, 0);
    expect(Object.keys(loadSprintBest())).toHaveLength(14);
    expect(loadSprintBest()['2026-11-21']).toBeDefined();
  });

  it('reads past broken data', () => {
    mem.set('fm.sprint', '{not json');
    expect(loadSprintBest()).toEqual({});
    mem.set('fm.sprint', JSON.stringify({ '2026-11-21': { cash: 'x' }, bad: { cash: 1, sold: 1 }, '2026-11-20': { cash: 5, sold: 1 } }));
    expect(loadSprintBest()).toEqual({ '2026-11-20': { cash: 5, sold: 1 } });
  });
});
