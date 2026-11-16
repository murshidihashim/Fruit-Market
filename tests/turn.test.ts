import { describe, expect, it } from 'vitest';
import { aiStep } from '../src/engine/ai';
import { dailyConfig } from '../src/engine/daily';
import { FRUITS } from '../src/engine/data';
import { activePlayer, beginBuying, canBuy, newGame, type GameState } from '../src/engine/game';
import { canUndo, playLocal, undoPoint, type UndoPoint } from '../src/ui/game/turn';

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
  const point: UndoPoint = { at: start };

  it('is set at the start of a human buying turn and kept while that turn lasts', () => {
    expect(undoPoint(null, start, true)).toEqual({ at: start });
    expect(undoPoint(null, start, true)!.at).toBe(start);
    const later = { ...start, players: start.players.map((p) => ({ ...p })) };
    expect(undoPoint(point, later, true)).toBe(point);
  });

  it('resets when the turn passes, the day changes, or it is not a human buying turn', () => {
    const next = playLocal(start, me, { kind: 'endBuy' });
    expect(undoPoint(point, next, activePlayer(next) === me)?.at).not.toBe(start);
    expect(undoPoint(point, { ...start, day: start.day + 1 }, true)?.at).not.toBe(start);
    expect(undoPoint(point, start, false)).toBeNull();
    expect(undoPoint(point, { ...start, phase: 'bid' }, true)).toBeNull();
  });
});

// S3 (DEC-120, PLAN-107): Undo takes back purchases only. A favour card once played stays played, and so does what it
// showed; the undo point moves to just after it, so what was bought before it stays too.
describe('undo after a favour card', () => {
  /** A buying turn holding Scout, Fridge and Free Fruit, with a face-down walk-in and an Okay piece on the shelf. */
  function turnWithCards(): GameState {
    const s = structuredClone(toHuman(beginBuying(newGame({ ...dailyConfig('2026-10-26', 'Me'), daily: undefined }))));
    const me = activePlayer(s);
    s.players[me].favours = ['scout', 'fridge', 'freeFruit'];
    s.players[me].cash = 30;
    s.players[me].stock.apple[0] += 1;
    s.queue.push({ id: 900, name: 'Walk-in', walkIn: true, pref: 'everyday', wants: [{ fruit: 'apple', qty: 2, max: 7 }], original: [{ fruit: 'apple', qty: 2, max: 7 }] });
    return s;
  }
  const buyAny = (s: GameState, p: number): GameState => {
    for (const f of FRUITS) for (let pos = 0; pos < s.market[f].length; pos++) if (!canBuy(s, p, f, pos)) return playLocal(s, p, { kind: 'buy', fruit: f, pos });
    throw new Error('nothing to buy');
  };
  /** Plays the moves in order, keeping the undo point as the screen does, and returns the last state and the point. */
  const run = (s: GameState, moves: ((s: GameState) => GameState)[]) => {
    let pt = undoPoint(null, s, true);
    for (const m of moves) { s = m(s); pt = undoPoint(pt, s, true); }
    return { s, pt };
  };

  it('Scout: Undo goes back to just after the card, so the walk-in stays seen and the piece bought first stays', () => {
    const s0 = turnWithCards();
    const me = activePlayer(s0);
    const scout = (s: GameState) => playLocal(s, me, { kind: 'favour', idx: 0, args: { customer: 900 } });
    const { s, pt } = run(s0, [(x) => buyAny(x, me), scout]);
    expect(pt!.after).toBe('scout');
    expect(pt!.at).toBe(s);
    expect(canUndo(pt, s, me, false)).toBe(false); // nothing bought since the card
    expect(canUndo(pt, s, me, true)).toBe(false);
    const more = buyAny(s, me);
    const pt2 = undoPoint(pt, more, true);
    expect(pt2).toBe(pt);
    expect(canUndo(pt2, more, me, false)).toBe(true);
    expect(canUndo(pt2, more, me, true)).toBe(true);
    // What Undo puts back: the card played, the walk-in seen, the first piece bought.
    const back = pt2!.at;
    expect(back.players[me].favours).toEqual(['fridge', 'freeFruit']);
    expect(back.queue.find((q) => q.id === 900)!.seenBy).toContain(me);
    expect(back.players[me].boughtToday).toBe(1);
    expect(back.log.slice(-1)[0]).toMatch(/played Scout$/);
  });

  it('Fridge and Free Fruit stay played too; before any card, Undo goes back to the start of the turn', () => {
    const s0 = turnWithCards();
    const me = activePlayer(s0);
    const before = run(s0, [(x) => buyAny(x, me)]);
    expect(before.pt!.at).toBe(s0);
    expect(before.pt!.after).toBeUndefined();
    expect(canUndo(before.pt, before.s, me, false)).toBe(true);
    const f = FRUITS.find((x) => s0.market[x].some((n) => n > 0))!;
    const pos = s0.market[f].findIndex((n) => n > 0);
    const fridge = (s: GameState) => playLocal(s, me, { kind: 'favour', idx: 1 });
    const free = (s: GameState) => playLocal(s, me, { kind: 'favour', idx: 1, args: { fruit: f, pos } });
    const { s, pt } = run(s0, [fridge, free]);
    expect(pt!.after).toBe('freeFruit');
    expect(pt!.at.players[me].favours).toEqual(['scout']);
    expect(pt!.at.players[me].stock).toEqual(s.players[me].stock);
    expect(canUndo(pt, s, me, false)).toBe(false);
  });

  it('online, a phone that reopened in the middle of a turn leaves the take-back to the room', () => {
    const s0 = turnWithCards();
    const me = activePlayer(s0);
    const mid = buyAny(s0, me);
    expect(canUndo(undoPoint(null, mid, true), mid, me, true)).toBe(true);
    expect(canUndo(undoPoint(null, mid, true), mid, me, false)).toBe(false);
  });
});
