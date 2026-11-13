// Saved games: versioned envelope, older saves, other rules and broken data.
import { beforeEach, describe, expect, it } from 'vitest';
import { aiStep } from '../src/engine/ai';
import { dailyConfig } from '../src/engine/daily';
import { activePlayer, newGame } from '../src/engine/game';
import { AI_VERSION, RULES_VERSION } from '../src/net/protocol';
import { consumeSaveNotice, loadGame, saveGame, SAVE_VERSION } from '../src/ui/store';

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  consumeSaveNotice();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k),
  };
});
const game = () => newGame({ players: [{ name: 'A', kind: 'human', avatar: 'a' }, { name: 'B', kind: 'ai', level: 'normal', avatar: 'b' }], days: 8, unripe: true, upgrades: true, events: true, seed: 5 });

describe('saved games', () => {
  it('round-trips through a versioned envelope', () => {
    const g = game();
    saveGame(g);
    const raw = JSON.parse(mem.get('fm.save')!);
    expect(raw).toMatchObject({ v: SAVE_VERSION, rules: RULES_VERSION, ai: AI_VERSION });
    expect(loadGame()).toEqual(g);
    expect(consumeSaveNotice()).toBeNull();
  });

  it('still resumes a bare save from before v1.2', () => {
    const g = game();
    mem.set('fm.save', JSON.stringify(g));
    expect(loadGame()).toEqual(g);
  });

  it('sets aside a game from other rules, with a notice', () => {
    mem.set('fm.save', JSON.stringify({ v: SAVE_VERSION, rules: RULES_VERSION + 1, game: game() }));
    expect(loadGame()).toBeNull();
    expect(consumeSaveNotice()).toMatch(/older rules/);
    expect(mem.has('fm.save')).toBe(false);
  });

  // Rules 19 changed the evening (everyone at once). A game saved under rules 18 is restarted with the notice; a save
  // that is read as the current rules but has no list of who is done for the evening still plays on.
  it('rules 19: an evening saved under rules 18 is set aside with the notice; an evening without the new list still plays on', () => {
    const g = structuredClone(game());
    g.phase = 'evening'; g.day = 2; g.order = [0, 1]; g.turn = 1; // rules 18: stall 0 has closed, stall 1 is deciding
    mem.set('fm.save', JSON.stringify({ v: SAVE_VERSION, rules: 18, ai: AI_VERSION, game: g }));
    expect(loadGame()).toBeNull();
    expect(consumeSaveNotice()).toBe('Your unfinished game used older rules and could not be continued.');
    expect(mem.has('fm.save')).toBe(false);
    // A bare save from before v1.2 is read as the current rules.
    mem.set('fm.save', JSON.stringify(g));
    let s = loadGame()!;
    expect(s.eveningDone).toBeUndefined();
    expect(activePlayer(s)).toBe(1);
    for (let i = 0; i < 10 && s.phase === 'evening'; i++) s = aiStep(s)!;
    expect(s.day).toBe(3);
    expect(s.phase).toBe('morning');
  });

  it('resumes an ordinary game saved before computer-player versions were recorded', () => {
    const g = game();
    mem.set('fm.save', JSON.stringify({ v: SAVE_VERSION, rules: RULES_VERSION, game: g }));
    expect(loadGame()).toEqual(g);
    expect(consumeSaveNotice()).toBeNull();
  });

  it('sets aside a daily challenge from older computer players, with a notice', () => {
    const daily = newGame(dailyConfig('2026-11-08', 'A'));
    mem.set('fm.save', JSON.stringify({ v: SAVE_VERSION, rules: RULES_VERSION, game: daily }));
    expect(loadGame()).toBeNull();
    expect(consumeSaveNotice()).toBe('Your unfinished Daily market game was from an older version and could not be continued.');
    expect(mem.has('fm.save')).toBe(false);
    mem.set('fm.save', JSON.stringify({ v: SAVE_VERSION, rules: RULES_VERSION, ai: AI_VERSION - 1, game: daily }));
    expect(loadGame()).toBeNull();
    expect(consumeSaveNotice()).toMatch(/Daily market game/);
    // Today's daily, saved by this version, resumes.
    saveGame(daily);
    expect(loadGame()).toEqual(daily);
    expect(consumeSaveNotice()).toBeNull();
  });

  it('drops unreadable data instead of crashing', () => {
    mem.set('fm.save', '{not json');
    expect(loadGame()).toBeNull();
    expect(consumeSaveNotice()).toMatch(/couldn't be read/);
    mem.set('fm.save', JSON.stringify({ hello: 1 }));
    expect(loadGame()).toBeNull();
  });

  it('clears the save when a game ends', () => {
    saveGame(game());
    saveGame(null);
    expect(mem.has('fm.save')).toBe(false);
  });
});
