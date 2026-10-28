// PLAN-006: the panda rival is renamed "Panda Lim" -> "Patches". Only the display name changes.
import { beforeEach, describe, expect, it } from 'vitest';
import { autoplay } from '../src/engine/ai';
import { dailyConfig } from '../src/engine/daily';
import { RIVALS } from '../src/engine/data';
import { newGame, type GameConfig, type LineResult } from '../src/engine/game';
import { rivalReaction } from '../src/engine/story';
import { loadGame, saveGame } from '../src/ui/store';
import { nameProblem } from '../server/names';

const panda = () => RIVALS.find((r) => r.avatar === '🐼')!;

describe('panda rival rename', () => {
  it('new games use the new name (N1)', () => {
    expect(panda().name).toBe('Chen');
    expect(RIVALS.some((r) => r.name === 'Panda Lim')).toBe(false);
    expect(dailyConfig('2026-10-27', 'Me').players.map((p) => p.name)).toContain('Chen');
  });

  describe('games saved before the rename (N2)', () => {
    const mem = new Map<string, string>();
    beforeEach(() => {
      mem.clear();
      (globalThis as { localStorage?: unknown }).localStorage = {
        getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k),
      };
    });
    const oldGame = () => newGame({
      players: [{ name: 'You', kind: 'human', avatar: '🧑‍🍳' }, { name: 'Panda Lim', kind: 'ai', level: 'normal', avatar: '🐼' }],
      days: 8, unripe: true, upgrades: true, events: true, seed: 11,
    });

    it('still load, with the old name', () => {
      const g = oldGame();
      saveGame(g);
      const back = loadGame()!;
      expect(back).toEqual(g);
      expect(back.players[1].name).toBe('Panda Lim');
    });

    it('still get the panda\'s lines', () => {
      const s = oldGame();
      const l: LineResult = { customerId: 1, name: 'John', fruit: 'mango', want: 2, max: 8, offers: [
        { player: 1, qty: 2, price: 5, sold: 2, freshness: 3 },
        { player: 0, qty: 2, price: 6, sold: 0, freshness: 3 },
      ] };
      const r = rivalReaction(s, l, 0, new Set());
      expect(r?.player).toBe(1);
      expect(panda().lines.undercut).toContain(r?.text);
    });
  });

  it('names don\'t change how a daily challenge plays out (N3)', () => {
    // The server re-plays daily scores with the new name, including moves recorded before the rename.
    const allAi = (c: GameConfig): GameConfig => ({ ...c, players: c.players.map((p) => ({ ...p, kind: 'ai', level: p.level ?? 'normal' })) });
    const now = allAi(dailyConfig('2026-10-27', 'Me'));
    const before = { ...now, players: now.players.map((p) => (p.name === 'Chen' ? { ...p, name: 'Panda Lim' } : p)) };
    expect(before.players.map((p) => p.name)).toContain('Panda Lim');
    const cash = (c: GameConfig) => autoplay(newGame(c)).players.map((p) => [p.cash, p.stats.sold]);
    expect(cash(before)).toEqual(cash(now));
  });

  it('both names are reserved for players (N4)', () => {
    expect(nameProblem('Patches')).toBe('reserved');
    expect(nameProblem('Panda Lim')).toBe('reserved');
    expect(nameProblem('panda lim')).toBe('reserved');
  });
});
