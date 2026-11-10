import { describe, expect, it } from 'vitest';
import { aiStep } from '../src/engine/ai';
import { RIVALS } from '../src/engine/data';
import { beginBuying, finishReveal, newGame, type GameState, type Level } from '../src/engine/game';
import { holdCash, payCash, shownCash } from '../src/ui/cashShown';

describe('cash shown while the day\'s sales play out', () => {
  it('shows the real totals until they are held, then adds each payment, then lets go', async () => {
    expect(shownCash(0, 12)).toBe(12);
    holdCash([5, 7]);
    expect(shownCash(0, 12)).toBe(5);
    expect(shownCash(1, 20)).toBe(7);
    await payCash(0, 3);
    expect(shownCash(0, 12)).toBe(8);
    expect(shownCash(1, 20)).toBe(7);
    holdCash(null);
    expect(shownCash(0, 12)).toBe(12);
  });

  it('stops adding once the real totals are showing again', async () => {
    holdCash([0]);
    const paying = payCash(0, 10);
    holdCash(null);
    await paying;
    expect(shownCash(0, 99)).toBe(99);
  });

  it('holds each stall at exactly what it had before the sales, so the payments add up to the real total', () => {
    const kiran = RIVALS.find((r) => r.name === 'Kiki')!.avatar; // Tip Jar: its tip is paid outside the sale lines
    const levels: Level[] = ['hard', 'normal', 'easy'];
    for (let seed = 1; seed <= 20; seed++) {
      let s: GameState = newGame({
        players: levels.map((level, i) => ({ name: `P${i}`, kind: 'ai' as const, level, avatar: i === 0 ? kiran : '' })),
        days: 10, unripe: true, upgrades: true, events: true, seed,
      });
      for (let guard = 0; s.phase !== 'over' && guard < 5000; guard++) {
        if (s.phase === 'morning') { s = beginBuying(s); continue; }
        if (s.phase === 'reveal') { s = finishReveal(s); continue; }
        const prev = s;
        const next = aiStep(s)!;
        if (next.phase === 'reveal') {
          // Rules 14: a standing-order fine is taken at the bell too, outside the sales.
          const fine = (i: number) => (next.results!.order?.holder === i ? next.results!.order.fine : 0);
          next.players.forEach((pl, i) => expect(pl.cash - next.results!.income[i] + fine(i)).toBe(prev.players[i].cash));
        }
        s = next;
      }
    }
  });
});
