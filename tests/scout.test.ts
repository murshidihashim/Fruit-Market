// Rules version 6 (DEC-050): Scout replaces Good Riddance.
import { describe, expect, it } from 'vitest';
import { FAVOUR_DECK, FAVOURS } from '../src/engine/data';
import { activePlayer, beginBuying, canPlayFavour, newGame, playFavour, type GameConfig } from '../src/engine/game';

const cfg = (seed: number): GameConfig => ({
  players: Array.from({ length: 4 }, (_, i) => ({ name: `H${i}`, kind: 'human' as const, avatar: 'a' })),
  days: 10, unripe: true, upgrades: true, events: false, seed,
});

describe('Scout', () => {
  it('replaces Good Riddance: two Scouts in a deck of twelve, no Good Riddance left', () => {
    expect(FAVOUR_DECK.length).toBe(12);
    expect(FAVOUR_DECK.filter((f) => f === 'scout').length).toBe(2);
    expect(FAVOUR_DECK).not.toContain('goodRiddance' as never);
    expect(FAVOURS.scout.when).toBe('buy');
  });

  it('shows one walk-in who arrives today to the player who played it, and to nobody else', () => {
    const s = beginBuying(newGame(cfg(7)));
    expect(s.phase).toBe('buy');
    expect(s.queue.length).toBeGreaterThan(1);
    const p = activePlayer(s);
    const t = structuredClone(s);
    t.players[p].favours = ['scout'];
    const target = t.queue[0].id;
    expect(canPlayFavour(t, p, 0)).toBeNull();
    const after = playFavour(t, p, 0, { customer: target });
    expect(after.queue.find((c) => c.id === target)!.seenBy).toEqual([p]);
    expect(after.queue.filter((c) => c.id !== target).every((c) => !c.seenBy?.length)).toBe(true);
    expect(after.players[p].favours).toEqual([]);
  });

  it('needs a walk-in that has not been seen, and only works on your buying turn', () => {
    const s = beginBuying(newGame(cfg(9)));
    const p = activePlayer(s);
    const t = structuredClone(s);
    t.players[p].favours = ['scout'];
    expect(() => playFavour(t, p, 0)).toThrow();
    expect(() => playFavour(t, p, 0, { customer: -99 })).toThrow();
    for (const c of t.queue) c.seenBy = [p];
    expect(canPlayFavour(t, p, 0)).toBe('No walk-ins to look at');
    const m = structuredClone(s);
    m.players[p].favours = ['scout'];
    m.phase = 'stall';
    expect(canPlayFavour(m, p, 0)).not.toBeNull();
  });
});
