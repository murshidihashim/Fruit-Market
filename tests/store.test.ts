// Saved games: versioned envelope, older saves, other rules and broken data. PLAN-120: one slot per mode; the single
// save of 1.28.0 and earlier ("fm.save") is moved to its mode's slot as it is read.
import { beforeEach, describe, expect, it } from 'vitest';
import { aiStep } from '../src/engine/ai';
import { dailyConfig, sprintConfig } from '../src/engine/daily';
import { activePlayer, newGame, type GameState } from '../src/engine/game';
import { AI_VERSION, RULES_VERSION } from '../src/net/protocol';
import { leagueConfig } from '../src/ui/progress';
import {
  anySave, clearGame, consumeSaveNotice, loadGame, loadGames, migrateOldSave, saveGame, slotKey, slotOf, SAVE_SLOTS, SAVE_VERSION,
} from '../src/ui/store';

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  consumeSaveNotice();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k),
  };
});
const game = () => newGame({ players: [{ name: 'A', kind: 'human', avatar: 'a' }, { name: 'B', kind: 'ai', level: 'normal', avatar: 'b' }], days: 8, unripe: true, upgrades: true, events: true, seed: 5 });
const phone = () => newGame({ players: [{ name: 'A', kind: 'human', avatar: 'a' }, { name: 'B', kind: 'human', avatar: 'b' }], days: 8, unripe: true, upgrades: true, events: true, seed: 6 });
const daily = () => newGame(dailyConfig('2026-11-22', 'A'));
const sprint = () => newGame(sprintConfig('2026-11-22', 'A'));
const league = () => newGame(leagueConfig(2, 'A', ''));
const envelope = (g: unknown, extra: Record<string, unknown> = {}) => JSON.stringify({ v: SAVE_VERSION, rules: RULES_VERSION, ai: AI_VERSION, game: g, ...extra });

describe('saved games', () => {
  it('round-trips through a versioned envelope in its mode\'s slot', () => {
    const g = game();
    saveGame(g);
    const raw = JSON.parse(mem.get('fm.save.play')!);
    expect(raw).toMatchObject({ v: SAVE_VERSION, rules: RULES_VERSION, ai: AI_VERSION });
    expect(loadGame('play')).toEqual(g);
    expect(consumeSaveNotice()).toBeNull();
  });

  it('still resumes a bare save from before v1.2', () => {
    const g = game();
    mem.set('fm.save', JSON.stringify(g));
    expect(loadGame('play')).toEqual(g);
  });

  it('sets aside a game from other rules, with a notice', () => {
    mem.set('fm.save', JSON.stringify({ v: SAVE_VERSION, rules: RULES_VERSION + 1, game: game() }));
    expect(loadGame('play')).toBeNull();
    expect(consumeSaveNotice()).toMatch(/older rules/);
    expect(mem.has('fm.save')).toBe(false);
    expect(mem.has('fm.save.play')).toBe(false);
  });

  // Rules 19 changed the evening (everyone at once). A game saved under rules 18 is restarted with the notice; a save
  // that is read as the current rules but has no list of who is done for the evening still plays on.
  it('rules 19: an evening saved under rules 18 is set aside with the notice; an evening without the new list still plays on', () => {
    const g = structuredClone(game());
    g.phase = 'evening'; g.day = 2; g.order = [0, 1]; g.turn = 1; // rules 18: stall 0 has closed, stall 1 is deciding
    mem.set('fm.save', JSON.stringify({ v: SAVE_VERSION, rules: 18, ai: AI_VERSION, game: g }));
    expect(loadGame('play')).toBeNull();
    expect(consumeSaveNotice()).toBe('Your unfinished computer game used older rules and could not be continued.');
    expect(mem.has('fm.save')).toBe(false);
    // A bare save from before v1.2 is read as the current rules.
    mem.set('fm.save', JSON.stringify(g));
    let s = loadGame('play')!;
    expect(s.eveningDone).toBeUndefined();
    expect(activePlayer(s)).toBe(1);
    for (let i = 0; i < 10 && s.phase === 'evening'; i++) s = aiStep(s)!;
    expect(s.day).toBe(3);
    expect(s.phase).toBe('morning');
  });

  it('resumes an ordinary game saved before computer-player versions were recorded', () => {
    const g = game();
    mem.set('fm.save', JSON.stringify({ v: SAVE_VERSION, rules: RULES_VERSION, game: g }));
    expect(loadGame('play')).toEqual(g);
    expect(consumeSaveNotice()).toBeNull();
  });

  it('sets aside a daily challenge from older computer players, with a notice', () => {
    const d = daily();
    mem.set('fm.save', JSON.stringify({ v: SAVE_VERSION, rules: RULES_VERSION, game: d }));
    expect(loadGame('daily')).toBeNull();
    expect(consumeSaveNotice()).toBe('Your unfinished Daily market game was from an older version and could not be continued.');
    expect(mem.has('fm.save')).toBe(false);
    mem.set('fm.save', JSON.stringify({ v: SAVE_VERSION, rules: RULES_VERSION, ai: AI_VERSION - 1, game: d }));
    expect(loadGame('daily')).toBeNull();
    expect(consumeSaveNotice()).toMatch(/Daily market game/);
    // Today's daily, saved by this version, resumes.
    saveGame(d);
    expect(loadGame('daily')).toEqual(d);
    expect(consumeSaveNotice()).toBeNull();
  });

  it('drops unreadable data instead of crashing', () => {
    mem.set('fm.save', '{not json');
    expect(loadGame('play')).toBeNull();
    expect(consumeSaveNotice()).toMatch(/couldn't be read/);
    expect(mem.has('fm.save')).toBe(false);
    mem.set('fm.save', JSON.stringify({ hello: 1 }));
    expect(loadGame('play')).toBeNull();
    mem.set('fm.save.daily', '{not json');
    expect(loadGame('daily')).toBeNull();
    expect(consumeSaveNotice()).toMatch(/Daily market game couldn't be read/);
    expect(mem.has('fm.save.daily')).toBe(false);
  });

  it('clears a slot when its game ends', () => {
    saveGame(game());
    clearGame('play');
    expect(mem.has('fm.save.play')).toBe(false);
  });
});

describe('PLAN-120: a saved game per mode', () => {
  it('names a slot for each mode, from the set-up', () => {
    expect(SAVE_SLOTS).toEqual(['play', 'league', 'daily', 'sprint']);
    expect(slotOf(game().config)).toBe('play');
    expect(slotOf(phone().config)).toBe('play');
    expect(slotOf(league().config)).toBe('league');
    expect(slotOf(daily().config)).toBe('daily');
    expect(slotOf(sprint().config)).toBe('sprint');
    expect(SAVE_SLOTS.map(slotKey)).toEqual(['fm.save.play', 'fm.save.league', 'fm.save.daily', 'fm.save.sprint']);
  });

  it('starting a game in one mode never replaces another mode\'s game', () => {
    const g = { play: game(), league: league(), daily: daily(), sprint: sprint() };
    for (const x of Object.values(g)) saveGame(x);
    expect(loadGames()).toEqual(g);
    // a new game in the same mode replaces only that mode's game
    const p2 = phone();
    saveGame(p2);
    expect(loadGames()).toEqual({ ...g, play: p2 });
    // ending one mode's game leaves the others waiting
    clearGame('daily');
    expect(Object.keys(loadGames()).sort()).toEqual(['league', 'play', 'sprint']);
    expect(consumeSaveNotice()).toBeNull();
  });

  it('moves the old single save to its mode\'s slot, in every old shape, and it still loads', () => {
    const cases: [string, GameState, string][] = [
      ['a computer game', game(), 'play'],
      ['a one-phone game', phone(), 'play'],
      ['a League stage', league(), 'league'],
      ['a Daily market', daily(), 'daily'],
      ['a Sprint (daily with sprint)', sprint(), 'sprint'],
    ];
    for (const [, g, slot] of cases) {
      mem.clear();
      mem.set('fm.save', envelope(g));
      migrateOldSave();
      expect(mem.has('fm.save')).toBe(false);
      expect(mem.get(`fm.save.${slot}`)).toBe(envelope(g));
      expect(loadGames()).toEqual({ [slot]: g });
    }
    // an envelope without the computer-player version (1.8.0 and earlier), and a bare game from before v1.2
    mem.clear();
    mem.set('fm.save', JSON.stringify({ v: SAVE_VERSION, rules: RULES_VERSION, game: league() }));
    expect(loadGame('league')).toEqual(league());
    mem.clear();
    mem.set('fm.save', JSON.stringify(league()));
    expect(loadGame('league')).toEqual(league());
    expect(consumeSaveNotice()).toBeNull();
  });

  it('keeps a slot\'s newer game when an old save of the same mode is still there', () => {
    const newer = structuredClone(game());
    newer.day = 5;
    saveGame(newer);
    mem.set('fm.save', envelope(game()));
    expect(loadGame('play')).toEqual(newer);
    expect(mem.has('fm.save')).toBe(false);
  });

  it('the old-version notice names the mode, the Sprint included (REP-135 RA-13)', () => {
    mem.set('fm.save', envelope(sprint(), { ai: AI_VERSION - 1 }));
    expect(loadGames()).toEqual({});
    expect(consumeSaveNotice()).toBe('Your unfinished Sprint game was from an older version and could not be continued.');
    mem.set('fm.save.daily', envelope(daily(), { ai: AI_VERSION - 1 }));
    mem.set('fm.save.league', envelope(league(), { rules: RULES_VERSION - 1 }));
    expect(loadGames()).toEqual({});
    expect(consumeSaveNotice()).toBe('Your unfinished League game used older rules and could not be continued. Your unfinished Daily market game was from an older version and could not be continued.');
    // A League stage and a Play game from older computer players resume (only the Daily formats are replayed by the server).
    mem.set('fm.save.league', envelope(league(), { ai: AI_VERSION - 1 }));
    mem.set('fm.save.play', envelope(game(), { ai: AI_VERSION - 1 }));
    expect(Object.keys(loadGames()).sort()).toEqual(['league', 'play']);
    expect(consumeSaveNotice()).toBeNull();
  });

  it('a game found in another mode\'s slot is not resumed there', () => {
    mem.set('fm.save.daily', envelope(game()));
    expect(loadGame('daily')).toBeNull();
    expect(consumeSaveNotice()).toMatch(/Daily market game couldn't be read/);
  });

  it('tells telemetry about any saved game, old or new', () => {
    expect(anySave()).toBe(false);
    mem.set('fm.save', envelope(game()));
    expect(anySave()).toBe(true);
    migrateOldSave();
    expect(anySave()).toBe(true);
    clearGame('play');
    expect(anySave()).toBe(false);
  });
});

describe('REP-136 R120-03: a Play save names its kind', () => {
  it('a one phone game is named as such', async () => {
    const { newGame } = await import('../src/engine/game');
    const { loadGame, consumeSaveNotice } = await import('../src/ui/store');
    const g = newGame({ players: [{ name: 'A', kind: 'human', avatar: '🦊' }, { name: 'B', kind: 'human', avatar: '🐻' }], days: 8, unripe: true, upgrades: true, events: true, seed: 3 });
    localStorage.setItem('fm.save.play', JSON.stringify({ v: 2, rules: 1, game: g }));
    expect(loadGame('play')).toBeNull();
    expect(consumeSaveNotice()).toBe('Your unfinished one phone game used older rules and could not be continued.');
  });
});
