import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ACHIEVEMENTS } from '../src/ui/achievements';
import { LOOKS, SLOTS } from '../src/ui/looks';
import { WEAR_PARTS } from '../src/ui/wearArt';

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
});

describe('look list', () => {
  it('ties every look to a real achievement and a real slot, once each', () => {
    const ids = LOOKS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    const by = LOOKS.map((l) => l.by);
    expect(new Set(by).size).toBe(by.length);
    for (const l of LOOKS) {
      expect(ACHIEVEMENTS.some((a) => a.id === l.by)).toBe(true);
      expect(SLOTS.find((s) => s.id === l.slot)?.kind).toBe(l.kind);
    }
  });

  it('has portrait art for every worn look, laid inside the 16 x 16 portrait', () => {
    for (const l of LOOKS.filter((x) => x.kind === 'wear')) {
      const rows = WEAR_PARTS[l.id];
      expect(rows, l.id).toBeTruthy();
      expect(rows.length).toBeLessThanOrEqual(16);
      for (const r of rows) expect(r.length).toBeLessThanOrEqual(16);
    }
  });
});

describe('owning and wearing', () => {
  it('hands out looks for achievements already earned, once', async () => {
    const looks = await import('../src/ui/looks');
    store.set('fm.ach', JSON.stringify(['first_win', 'first_sale']));
    expect(looks.syncLooks().map((l) => l.id).sort()).toEqual(['roof_stripes', 'straw_boater']);
    expect(looks.syncLooks()).toEqual([]);
    store.set('fm.ach', JSON.stringify(['first_win', 'first_sale', 'league']));
    expect(looks.syncLooks().map((l) => l.id)).toEqual(['gold_crown']);
  });

  it('only lets a player wear what they own, one look per slot, and take it off again', async () => {
    const looks = await import('../src/ui/looks');
    store.set('fm.ach', JSON.stringify(['first_win', 'league']));
    looks.syncLooks();
    expect(looks.toggleLook('monocle')).toEqual({}); // not owned
    expect(looks.toggleLook('straw_boater')).toEqual({ hat: 'straw_boater' });
    expect(looks.toggleLook('gold_crown')).toEqual({ hat: 'gold_crown' }); // same slot: replaces
    expect(looks.wornParts()).toEqual(['gold_crown']);
    expect(looks.toggleLook('gold_crown')).toEqual({});
    expect(looks.wornParts()).toEqual([]);
  });

  it('ignores a worn look that is no longer owned or sits in the wrong slot', async () => {
    const looks = await import('../src/ui/looks');
    store.set('fm.looks', JSON.stringify(['straw_boater']));
    store.set('fm.worn', JSON.stringify({ hat: 'straw_boater', face: 'straw_boater', neck: 'scarf', roof: 'roof_stars' }));
    expect(looks.worn()).toEqual({ hat: 'straw_boater' });
  });
});
