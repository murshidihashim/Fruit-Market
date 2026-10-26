import { describe, expect, it } from 'vitest';
import { aiStep } from '../src/engine/ai';
import { dailyConfig } from '../src/engine/daily';
import { activePlayer, beginBuying, newGame, type GameState } from '../src/engine/game';
import { playLocal, undoPoint } from '../src/ui/game/turn';

/** Lets the computer players move until it's the human's turn. */
function toHuman(s: GameState): GameState {
  for (let i = 0; i < 50 && s.players[activePlayer(s)]?.kind !== 'human'; i++) s = aiStep(s) ?? s;
  return s;
}

describe('daily move log', () => {
  it('logs the player\'s moves, but not begin/finish, only in daily games', () => {
    const daily = newGame(dailyConfig('2026-10-26', 'Me'));
    expect(playLocal(daily, 0, { kind: 'begin' }).moves).toBeUndefined();
    let s = toHuman(beginBuying(daily));
    const me = activePlayer(s);
    s = playLocal(s, me, { kind: 'endBuy' });
    expect(s.moves).toEqual([{ kind: 'endBuy' }]);

    const casual = toHuman(beginBuying(newGame({ ...dailyConfig('2026-10-26', 'Me'), daily: undefined })));
    expect(playLocal(casual, activePlayer(casual), { kind: 'endBuy' }).moves).toBeUndefined();
  });
});

describe('undo point', () => {
  const start = toHuman(beginBuying(newGame({ ...dailyConfig('2026-10-26', 'Me'), daily: undefined })));
  const me = activePlayer(start);

  it('is set at the start of a human buying turn and kept while that turn lasts', () => {
    expect(undoPoint(null, start, true)).toBe(start);
    const later = { ...start, players: start.players.map((p) => ({ ...p })) };
    expect(undoPoint(start, later, true)).toBe(start);
  });

  it('resets when the turn passes, the day changes, or it is not a human buying turn', () => {
    const next = playLocal(start, me, { kind: 'endBuy' });
    expect(undoPoint(start, next, activePlayer(next) === me)).not.toBe(start);
    expect(undoPoint(start, { ...start, day: start.day + 1 }, true)).not.toBe(start);
    expect(undoPoint(start, start, false)).toBeNull();
    expect(undoPoint(start, { ...start, phase: 'bid' }, true)).toBeNull();
  });
});
