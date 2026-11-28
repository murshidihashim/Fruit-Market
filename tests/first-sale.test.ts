// The guided first sale (PLAN-113) was removed by the owner in 1.31.2, and its code in PLAN-130 (REP-140 A-04). A phone
// that had it keeps its mark with the tips (fm.tutorial): 'firstsale' (played to the bell) or 'firstsale-skip'. Those
// marks must still load, and keep doing what they did for the tips.
import { beforeEach, describe, expect, it } from 'vitest';
import { RIVALS } from '../src/engine/data';
import { beginBuying, newGame, type GameState } from '../src/engine/game';
import { FIRST_SALE_DONE, TIPS, markSeen, skipTutorial, tipFor } from '../src/ui/tutorial';

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k),
  };
});

/** A solo game: the person (seat 0) and computer rivals. */
const solo = (seed: number): GameState => newGame({
  players: RIVALS.slice(0, 4).map((r, i) => (i === 0 ? { name: 'Me', kind: 'human' as const, avatar: '🦊' } : { name: r.name, kind: 'ai' as const, avatar: r.avatar })),
  days: 8, unripe: true, upgrades: true, events: true, seed,
});
const buyTip = (s: GameState) => tipFor(s, { myBuyTurn: true, boughtToday: 0, pricing: false, picker: false, evening: false });
const day2 = () => ({ ...beginBuying(solo(6)), day: 2 });

describe('a phone that had the guided first sale', () => {
  it('keeps the mark it saved: the same word as before', () => {
    expect(FIRST_SALE_DONE).toBe('firstsale');
  });

  it('after a guided first sale played to the bell, the buying tip still comes on Day 2 (after the Day 2 tip)', () => {
    markSeen('firstsale');
    markSeen('day2');
    expect(buyTip(day2())?.id).toBe('buy');
    expect(TIPS.find((t) => t.id === 'buy')).toBeDefined();
  });

  it('Skip tutorial still ends every tip, and a phone that finished the tips before stays finished', () => {
    markSeen('firstsale');
    skipTutorial();
    expect(buyTip(day2())).toBeNull();
    mem.clear();
    markSeen('day2');
    expect(buyTip(day2())).toBeNull();
  });

  it('a skipped guided sale leaves the tips as they always were', () => {
    markSeen('firstsale-skip');
    markSeen('day2');
    expect(buyTip(day2())).toBeNull();
  });

  it('a mark list saved by an older phone, with both marks and the tips seen, loads without an error', () => {
    mem.set('fm.tutorial', JSON.stringify(['trait', 'morning', 'buy', 'bought', 'stall', 'bid', 'reveal', 'evening', 'day2', 'firstsale-skip', 'marketday']));
    expect(() => buyTip(day2())).not.toThrow();
    expect(buyTip(day2())).toBeNull();
    mem.set('fm.tutorial', JSON.stringify(['morning', 'firstsale', 'day2']));
    expect(buyTip(day2())?.id).toBe('buy');
  });
});
