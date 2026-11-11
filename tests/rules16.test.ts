// Rules version 16 (PLAN-075): tomorrow's crowd (one regular face up, the walk-ins face down) is drawn each morning,
// so the Tomorrow strip shows while stalls buy. When today's crowd arrives, tomorrow's moves up unchanged.
import { describe, expect, it } from 'vitest';
import { aiStep } from '../src/engine/ai';
import { RIVALS } from '../src/engine/data';
import { beginBuying, finishReveal, newGame, walkInsOn, type GameState } from '../src/engine/game';
import { RULES_VERSION } from '../src/net/protocol';
import { redact } from '../server/room';

const game = (days = 8, seed = 5): GameState => newGame({
  players: RIVALS.slice(0, 4).map((r) => ({ name: r.name, kind: 'ai' as const, level: 'normal' as const, avatar: r.avatar })),
  days, unripe: true, upgrades: true, events: true, seed,
});

/** Computer turns until the phase is `phase` on `day` (or the game ends). */
function until(s: GameState, day: number, phase: GameState['phase']): GameState {
  for (let i = 0; i < 5000 && !(s.day === day && s.phase === phase) && s.phase !== 'over'; i++) {
    if (s.phase === 'morning') { s = beginBuying(s); continue; }
    if (s.phase === 'reveal') { s = finishReveal(s); continue; }
    const n = aiStep(s);
    if (!n) throw new Error(`stuck at day ${s.day} ${s.phase}`);
    s = n;
  }
  return s;
}

const ids = (s: GameState, next: boolean) => [next ? s.nextForecast : s.forecast, ...(next ? s.nextQueue : s.queue)].map((c) => c?.id);

describe('rules version 16: tomorrow\'s queue while buying', () => {
  it('is still in force (rules 16 or later)', () => {
    expect(RULES_VERSION).toBeGreaterThanOrEqual(16);
  });

  it('draws tomorrow\'s regular and walk-ins on the first morning, apart from today\'s crowd', () => {
    const s = game();
    expect(s.nextForecast).not.toBeNull();
    expect(s.nextForecast!.walkIn).toBeFalsy();
    expect(s.nextQueue).toHaveLength(walkInsOn(s, 2, null));
    expect(s.nextQueue.every((c) => c.walkIn)).toBe(true);
    const today = new Set(ids(s, false));
    for (const id of ids(s, true)) expect(today.has(id)).toBe(false);
  });

  it('every day: tomorrow\'s crowd is known while buying and is exactly the crowd waiting after buying ends', () => {
    let s = game();
    for (let day = 1; day < s.config.days; day++) {
      s = until(s, day, 'buy');
      expect(s.nextForecast, `day ${day}`).not.toBeNull();
      const drawn = ids(s, true);
      s = until(s, day, 'stall');
      expect(ids(s, false)).toEqual(drawn);
      expect(s.nextForecast).toBeNull();
      expect(s.nextQueue).toEqual([]);
    }
  });

  it('draws no crowd for the day after the last', () => {
    let s = game(8);
    s = until(s, 8, 'buy');
    expect(s.nextForecast).toBeNull();
    expect(s.nextQueue).toEqual([]);
    s = until(s, 8, 'stall');
    expect(s.forecast).toBeNull();
    expect(s.queue).toEqual([]);
  });

  it('online, tomorrow\'s walk-ins stay face down: only the fruit on the back reaches another phone', () => {
    const s = game();
    const v = redact(s, 0);
    expect(v.nextQueue).toHaveLength(s.nextQueue.length);
    v.nextQueue.forEach((c, i) => {
      expect(c.name).toBe('Walk-in');
      expect(c.wants.map((w) => w.fruit)).toEqual(s.nextQueue[i].wants.map((w) => w.fruit));
      expect(c.wants.every((w) => w.qty === 0 && w.max === 0)).toBe(true);
    });
    expect(v.nextForecast!.name).toBe(s.nextForecast!.name);
  });
});
