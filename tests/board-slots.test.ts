import { describe, expect, it } from 'vitest';
import { FRUIT, FRUITS, freshPos, trackLength, trackSlots } from '../src/engine/data';
import { newGame } from '../src/engine/game';
import { marketColumn } from '../src/ui/boardModel';

// PLAN-030: the screen and the printed mat read the same slot data.
describe('the board slots', () => {
  it('each track has the right number of slots: 3, 6, 7 and 6', () => {
    expect(FRUITS.map((f) => trackSlots(f).length)).toEqual([3, 6, 7, 6]);
    for (const f of FRUITS) expect(trackSlots(f).length).toBe(trackLength(f, true));
  });

  it('slots run newest to oldest and take their cost from the cost table', () => {
    for (const f of FRUITS) {
      const slots = trackSlots(f);
      expect(slots.map((s) => s.pos)).toEqual(slots.map((_, i) => slots.length - 1 - i));
      for (const s of slots) expect(s.cost).toBe(FRUIT[f].cost[s.stage]);
      expect(slots[slots.length - 1].life).toBe('last day');
    }
  });

  it('the lorry delivers into the first ripe slot, and into the top green slot for fruit that arrives green', () => {
    for (const f of FRUITS) {
      const entries = trackSlots(f).filter((s) => s.entry);
      expect(entries.some((s) => s.pos === freshPos(f))).toBe(true);
      expect(entries.length).toBe(FRUIT[f].unripeSlots > 0 ? 2 : 1);
    }
  });

  it('the screen draws the same slots, in the same order, as the shared data', () => {
    const s = newGame({ players: [{ name: 'A', kind: 'human', avatar: 'x' }, { name: 'B', kind: 'human', avatar: 'y' }], days: 8, unripe: true, upgrades: true, events: true, seed: 3 });
    for (const f of FRUITS) {
      const drawn = marketColumn(s, f).map((c) => [c.pos, c.stage]);
      expect(drawn).toEqual(trackSlots(f).map((t) => [t.pos, t.stage]));
    }
  });
});
