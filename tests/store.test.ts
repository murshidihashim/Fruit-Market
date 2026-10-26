// Saved games: versioned envelope, older saves, other rules and broken data.
import { beforeEach, describe, expect, it } from 'vitest';
import { newGame } from '../src/engine/game';
import { RULES_VERSION } from '../src/net/protocol';
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
    expect(raw).toMatchObject({ v: SAVE_VERSION, rules: RULES_VERSION });
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
    expect(consumeSaveNotice()).toMatch(/older version/);
    expect(mem.has('fm.save')).toBe(false);
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
