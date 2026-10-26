// Achievements and the Market League (kept in the device's local storage).
import { beforeEach, describe, expect, it } from 'vitest';
import { autoplay } from '../src/engine/ai';
import { newGame, ranking } from '../src/engine/game';
import { checkAchievements, LEAGUE, leagueConfig, leagueStage, recordLeague, unlocked } from '../src/ui/progress';

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k),
  };
});

/** A finished league game for stage `stage`, with the "human" seat played by the computer. */
function finished(stage: number, seed: number) {
  const cfg = leagueConfig(stage, 'Me', 'a', seed);
  const g = newGame({ ...cfg, players: cfg.players.map((p) => ({ ...p, kind: 'ai' as const, level: p.level ?? 'hard' })) });
  return autoplay(g);
}

describe('progress', () => {
  it('clears a league stage only by winning the current stage', () => {
    expect(leagueStage()).toBe(0);
    let seed = 1;
    let g = finished(0, seed);
    while (ranking(g)[0] !== 0) g = finished(0, ++seed);
    expect(recordLeague(g, 0)).toBe(true);
    expect(leagueStage()).toBe(1);
    expect(recordLeague(g, 0)).toBe(false); // the same win doesn't count twice
    expect(LEAGUE.length).toBeGreaterThan(3);
  });

  it('unlocks achievements once', () => {
    let seed = 1;
    let g = finished(0, seed);
    while (ranking(g)[0] !== 0) g = finished(0, ++seed);
    const first = checkAchievements(g, 0);
    expect(first.map((a) => a.id)).toContain('first_win');
    expect(unlocked()).toContain('first_win');
    expect(checkAchievements(g, 0).map((a) => a.id)).not.toContain('first_win');
  });
});
