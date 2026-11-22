// PLAN-120: Home as the player's stall and three mode cards, the Play page without the League and the Daily, and the
// Daily intro's words from the day's own set-up.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'preact';
import { SPRINT_DAYS, SPRINT_WEEK_DAYS, dailyConfig, dailyTwist, sprintConfig } from '../src/engine/daily';
import { newGame, type GameState } from '../src/engine/game';
import { toStaticHtml } from '../src/ui/cards';
import { introWords } from '../src/ui/DailyIntro';
import { PlayMenu, Shopfront, type ShopProps } from '../src/ui/Home';
import { waitWords } from '../src/ui/HomeCards';
import { waitingGame } from '../src/ui/paused';
import { leagueConfig } from '../src/ui/progress';
import type { SaveSlot } from '../src/ui/store';

// The screens drawn once, as a string: each hook gives its first value (as in shelf-tonight.test.ts); nothing is fetched.
vi.mock('preact/hooks', () => ({
  useState: (v: unknown) => [typeof v === 'function' ? (v as () => unknown)() : v, () => undefined],
  useEffect: () => undefined, useLayoutEffect: () => undefined,
  useRef: (v: unknown) => ({ current: v }), useMemo: (f: () => unknown) => f(), useCallback: (f: unknown) => f,
}));

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k),
  };
});
const DATE = '2026-11-22';
const noop = () => undefined;
const at = (g: GameState, day: number, cash: number): GameState => ({ ...g, day, players: g.players.map((p, i) => ({ ...p, cash: cash - i })) });
const home = (games: Partial<Record<SaveSlot, GameState>>, extra: Partial<ShopProps> = {}) => toStaticHtml(h(Shopfront, {
  games, today: DATE, notice: null, onContinue: noop, onPlay: noop, onDaily: noop, onSprint: noop, onLeague: noop,
  onWardrobe: noop, onAccount: noop, onTrophies: noop, onHowTo: noop, onSettings: noop, ...extra,
}));

describe('the Daily intro says what the mode is, from the configs', () => {
  it('the Daily market: same market, its length and stalls, the rivals at Normal, today\'s twist, the ranking and retries', () => {
    const cfg = dailyConfig(DATE, 'You');
    const w = introWords('daily', DATE);
    expect(w.title).toBe('Daily market');
    expect(w.length).toBe(`${cfg.days} days · ${cfg.players.length} stalls`);
    expect(w.goal).toBe(`The same market for everyone today: the same customers, lorry and events. End ${cfg.days} days with the most cash.`);
    expect(w.how).toEqual([
      `${cfg.days} days, 4 stalls. Against Rosa, Uncle Benny and Ah Chen, all Normal.`,
      `Today's twist: ${dailyTwist(DATE).title}. ${dailyTwist(DATE).text}`,
    ]);
    expect(w.score).toEqual(['Ranked by final cash, then by fruit sold.', 'Your best today counts on today\'s board.']);
    expect(w.retry).toBe('Play it again today if you like. Only your best counts.');
    // a twist that changes the length changes the words
    const long = Array.from({ length: 7 }, (_, k) => `2026-11-${String(16 + k).padStart(2, '0')}`).find((d) => dailyTwist(d).title === 'Long game')!;
    expect(introWords('daily', long).length).toBe('14 days · 4 stalls');
  });

  it('the Sprint: 3 days, retry as often as you like, your best counts, the week counts your best 5 days', () => {
    const cfg = sprintConfig(DATE, 'You');
    const w = introWords('sprint', DATE);
    expect(cfg.days).toBe(SPRINT_DAYS);
    expect(w.title).toBe('Sprint');
    expect(w.length).toBe(`${SPRINT_DAYS} days · 4 stalls`);
    expect(w.how[0]).toBe(`${SPRINT_DAYS} days, 4 stalls. Against Rosa, Uncle Benny and Ah Chen, all Normal.`);
    expect(w.score).toContain(`The week counts your best ${SPRINT_WEEK_DAYS} days.`);
    expect(w.score).toContain('Your best today counts on today\'s board.');
    expect(w.retry).toBe('Retry as often as you like.');
  });

  it('is plain: no exclamation marks', () => {
    for (const k of ['daily', 'sprint'] as const) {
      const w = introWords(k, DATE);
      for (const t of [w.title, w.length, w.goal, ...w.how, ...w.score, w.retry]) expect(t).not.toContain('!');
    }
  });
});

describe('the Play page keeps the Normal game group only', () => {
  it('has Quick match, Private room, Join, Computer, One phone, game length and Public rooms, and no League, Daily or Sprint', () => {
    const html = toStaticHtml(h(PlayMenu, { days: 10, onDays: noop, onBack: noop, onQuick: noop, onRoom: noop, onPublic: noop, onJoin: noop, onComputer: noop, onOnePhone: noop }));
    for (const a of ['normal-game', 'quick', 'room', 'join', 'computer', 'phone', 'public']) expect(html).toContain(`data-a="${a}"`);
    for (const a of ['league', 'daily', 'sprint']) expect(html).not.toContain(`data-a="${a}"`);
    expect(html).not.toContain('jp-mode');
  });
});

describe('Home: the stall and the three mode cards, each with its own waiting game', () => {
  it('draws the stall, then Play, Market League and Daily market cards with arrows and dots', () => {
    const html = home({});
    expect(html).toContain('jh-stall2');
    expect([...html.matchAll(/data-card="(\w+)"/g)].map((m) => m[1])).toEqual(['play', 'league', 'daily']);
    expect(html).toContain('aria-label="Previous card"');
    expect(html).toContain('aria-label="Next card"');
    expect((html.match(/<button class="jh-dot/g) ?? []).length).toBe(3);
    // nothing waits: Play, Open the League, Play the Daily market, Play the Sprint
    expect(html).not.toContain('data-a="continue-');
    for (const a of ['play', 'league', 'daily', 'sprint']) expect(html).toContain(`data-a="${a}"`);
    // the League tile left the tiles for its card
    expect(html).not.toMatch(/jh-tiles[^>]*>\s*<button[^>]*><b>League/);
  });

  it('each card shows its own mode\'s game: "Day 4 of 10 · $23"', () => {
    const play = at(newGame({ players: [{ name: 'A', kind: 'human', avatar: '🐸' }, { name: 'Rosa', kind: 'ai', level: 'easy', avatar: '🦊' }], days: 10, unripe: true, upgrades: true, events: true, seed: 3 }), 4, 23);
    const daily = at(newGame(dailyConfig(DATE, 'A')), 6, 31);
    expect(waitWords(waitingGame(play)!)).toBe('Day 4 of 10 · $23');
    const html = home({ play, daily });
    expect(html).toContain('data-a="continue-play"');
    expect(html).toContain('Day 4 of 10 · $23');
    expect(html).toContain('data-a="continue-daily"');
    expect(html).toContain(`Day 6 of ${daily.config.days} · $31`);
    // the League and the Sprint have none waiting: their own buttons stay
    expect(html).not.toContain('data-a="continue-league"');
    expect(html).not.toContain('data-a="continue-sprint"');
    expect(html).toContain('data-a="sprint"');
    // a League stage and a Sprint waiting too
    const all = home({ play, daily, league: at(newGame(leagueConfig(2, 'A', '')), 2, 14), sprint: at(newGame(sprintConfig(DATE, 'A')), 2, 12) });
    for (const s of ['play', 'league', 'daily', 'sprint']) expect(all).toContain(`data-a="continue-${s}"`);
    expect(all).toContain('Continue stage 3');
    expect(all).toContain('Day 2 of 3 · $12');
  });

  it('a shared phone\'s game shows no one\'s cash on the card', () => {
    const phone = at(newGame({ players: [{ name: 'A', kind: 'human', avatar: '🐸' }, { name: 'B', kind: 'human', avatar: '🦊' }], days: 8, unripe: true, upgrades: true, events: true, seed: 4 }), 3, 20);
    expect(waitWords(waitingGame(phone)!)).toBe('Day 3 of 8');
  });

  it('"Back to room" for an open online match stays above the cards', () => {
    const html = home({}, { room: 'ABC123', onRoom: noop });
    expect(html).toContain('Back to room ABC123');
    expect(html.indexOf('Back to room')).toBeLessThan(html.indexOf('jh-modes'));
  });
});
