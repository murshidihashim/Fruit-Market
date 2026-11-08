import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ACHIEVEMENTS } from '../src/ui/achievements';
import { LOOKS, SLOTS } from '../src/ui/looks';
import { REGALIA, wearUrl } from '../src/ui/exchangeArt';
import { cleanLook } from '../src/net/looks';
import { h } from 'preact';
import { toStaticHtml } from '../src/ui/cards';
import { Face } from '../src/ui/art';
import { RIVALS } from '../src/engine/data';

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

  it('draws every worn look as Exchange regalia on the portrait (DEC-069), and nothing else', () => {
    const wear = LOOKS.filter((x) => x.kind === 'wear').map((l) => l.id);
    expect(Object.keys(REGALIA).sort()).toEqual([...wear].sort());
    for (const id of wear) {
      const url = wearUrl('rosa', [id]);
      expect(url, id).toMatch(/^data:image\/svg\+xml,/);
      expect(decodeURIComponent(url ?? ''), id).toContain('<g transform="translate(');
    }
    expect(wearUrl('rosa', [])).toBeNull();
    expect(wearUrl('rosa', ['not_a_look'])).toBeNull();
  });

  it('keeps the original look ids, so earned looks and saved outfits still load', () => {
    const old = ['straw_boater', 'fruit_basket_hat', 'party_hat', 'laurel', 'gold_crown', 'monocle', 'bow_tie', 'scarf', 'apron', 'sash', 'medal',
      'roof_stripes', 'roof_scallops', 'roof_checks', 'roof_stars', 'roof_fruit', 'trim_bunting', 'trim_lanterns', 'trim_tassels',
      'prop_blackboard', 'prop_scale', 'prop_plant', 'prop_crates', 'prop_cat', 'prop_golden_apple'];
    for (const id of old) expect(LOOKS.some((l) => l.id === id), id).toBe(true);
    // An outfit saved before the new looks existed still reads the same.
    expect(cleanLook({ hat: 'gold_crown', neck: 'scarf', badge: 'medal' })).toEqual({ hat: 'gold_crown', neck: 'scarf', badge: 'medal' });
  });

  it('adds six Exchange unlockables, each earned by an existing achievement (PLAN-053)', () => {
    const fresh: Record<string, [string, string]> = {
      trader_visor: ['hat', 'full_price'], pencil_slip: ['face', 'sole_five'], ticker_garland: ['neck', 'tie_breaker'],
      pocket_watch: ['badge', 'comeback'], member_badge: ['badge', 'beat_hard'], hand_bell: ['hand', 'full_house'],
    };
    for (const [id, [slot, by]] of Object.entries(fresh)) expect(LOOKS.find((l) => l.id === id), id).toMatchObject({ kind: 'wear', slot, by });
  });

  it('fits the regalia per shopkeeper and draws it over the portrait as one picture', () => {
    const a = wearUrl('rosa', ['gold_crown']);
    const b = wearUrl('raj', ['gold_crown']);
    expect(a).not.toEqual(b);
    const html = toStaticHtml(h(Face, { who: RIVALS[0].avatar, size: 30, worn: ['gold_crown', 'scarf'] }));
    expect(html.match(/<img/g)?.length).toBe(2); // the portrait and one regalia picture
    expect(html).toContain('xf-wear');
    // Too small to show regalia: the portrait alone.
    expect(toStaticHtml(h(Face, { who: RIVALS[0].avatar, size: 16, worn: ['gold_crown'] }))).not.toContain('xf-wear');
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
    // A player who earned achievements before the Exchange looks existed gets those looks too.
    store.set('fm.ach', JSON.stringify(['first_win', 'first_sale', 'league', 'full_house', 'beat_hard']));
    expect(looks.syncLooks().map((l) => l.id).sort()).toEqual(['hand_bell', 'member_badge']);
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
