import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ACHIEVEMENTS } from '../src/ui/achievements';
import { LOOKS, SLOTS } from '../src/ui/looks';
import { REGALIA, wearUrl } from '../src/ui/exchangeArt';
import { cleanLook, lookAllowed, type Look } from '../src/net/looks';
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
  it('every look says its kind, where it shows and where it comes from: a real trophy tier, a level, or free', () => {
    const ids = LOOKS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of LOOKS) {
      const slot = SLOTS.find((s) => s.id === l.slot);
      expect(slot?.kind, l.id).toBe(l.kind);
      expect(l.shows, l.id).toEqual(slot?.shows);
      expect(l.shows.length, l.id).toBeGreaterThan(0);
      const from = l.from;
      if (from.kind === 'trophy') expect(ACHIEVEMENTS.some((a) => a.id === from.id), l.id).toBe(true);
      else if (from.kind === 'level') { expect(from.level, l.id).toBeGreaterThanOrEqual(1); expect(from.level, l.id).toBeLessThanOrEqual(30); }
      else expect(from.kind, l.id).toBe('free');
    }
    // the 31 looks of the live game each come from one trophy of their own, as before
    const first = LOOKS.filter((l) => (l.kind === 'wear' || l.kind === 'stall') && l.slot !== 'colour');
    expect(first.length).toBe(31);
    const by = first.map((l) => (l.from.kind === 'trophy' ? l.from.id : ''));
    expect(by.every(Boolean)).toBe(true);
    expect(new Set(by).size).toBe(by.length);
    // nothing comes from a pack: there is no shop
    expect(LOOKS.some((l) => l.from.kind === 'pack')).toBe(false);
  });

  it('adds the stamp book looks: 8 free colours, 6 frames, 20 titles, 4 price tags, a results stamp, 3 bells and 3 coin sounds', () => {
    const count = (slot: string) => LOOKS.filter((l) => l.slot === slot).length;
    expect(['colour', 'frame', 'title', 'tag', 'stamp', 'bell', 'coin'].map(count)).toEqual([8, 6, 20, 4, 1, 3, 3]);
    expect(LOOKS.filter((l) => l.slot === 'colour').every((l) => l.from.kind === 'free')).toBe(true);
    expect(LOOKS.filter((l) => l.slot === 'title' && l.from.kind === 'level').map((l) => l.title)).toEqual(
      ['Roadside Table trader', 'Five-Foot Way trader', 'Covered Stall trader', 'Corner Lot trader', 'Shophouse trader', 'Towkay trader']);
    // the titles rivals read as skill need a fair game
    expect(LOOKS.filter((l) => l.from.kind === 'trophy' && l.from.fair).map((l) => l.id).sort()).toEqual(['title_best_day', 'title_rich', 'title_sole', 'title_top_price']);
  });

  it('what a room is told: only looks that exist, in their slot, that others may see', () => {
    const all = { hat: 'gold_crown', title: 'title_rank2', frame: 'frame_painted', colour: 'col_teal', tag: 'tag_chalk', stamp: 'stamp_soldout' };
    expect(cleanLook(all)).toEqual(all);
    // a sound never leaves the phone; a look in the wrong slot or made up is dropped
    expect(cleanLook({ bell: 'bell_bicycle', coin: 'coin_jar', hat: 'title_rank2', title: 'nope', extra: 'gold_crown' })).toEqual({});
    expect(cleanLook('junk')).toEqual({});
  });

  it('a look from a pack is shown to a room only when the server holds a grant for it; today nothing is from a pack', () => {
    const paid: Look = { id: 'pack_awning', title: 'Supporter awning', kind: 'stall', slot: 'roof', from: { kind: 'pack', id: 'supporter' }, shows: ['table'] };
    expect(lookAllowed(paid, [])).toBe(false);
    expect(lookAllowed(paid, ['other_look'])).toBe(false);
    expect(lookAllowed(paid, ['pack_awning'])).toBe(true);
    // everything in the list today is earned or free, so no grant is ever needed
    for (const l of LOOKS) expect(lookAllowed(l, []), l.id).toBe(true);
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
    for (const [id, [slot, by]] of Object.entries(fresh)) expect(LOOKS.find((l) => l.id === id), id).toMatchObject({ kind: 'wear', slot, from: { kind: 'trophy', id: by } });
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
    // PLAN-086: the Market League's Gold tier now gives a title as well as the hat. With its two lower tiers the
    // trophies are worth 21 stamps (2 + 2 + 10 + 2 + 5): stall level 2, whose reward is the Chalk-slate price tag.
    store.set('fm.ach', JSON.stringify(['first_win', 'first_sale', 'league']));
    expect(looks.syncLooks().map((l) => l.id).sort()).toEqual(['gold_crown', 'tag_chalk', 'title_league']);
    // A player who earned achievements before the Exchange looks existed gets those looks too. Two more Silver tiers
    // make 31 stamps: stall level 3, whose reward is the Bicycle bell.
    store.set('fm.ach', JSON.stringify(['first_win', 'first_sale', 'league', 'full_house', 'beat_hard']));
    expect(looks.syncLooks().map((l) => l.id).sort()).toEqual(['bell_bicycle', 'hand_bell', 'member_badge']);
    // What everyone has from the start is owned without a word: the colours, the first tag, bell and coin sound, and
    // the first rank's title and frame.
    const own = JSON.parse(store.get('fm.looks')!) as string[];
    for (const id of ['col_terra', 'col_royal', 'tag_ticket', 'bell_brass', 'coin_till', 'frame_plain', 'title_rank1']) expect(own, id).toContain(id);
  });

  it('only lets a player wear what they own, one look per slot, and take it off again', async () => {
    const looks = await import('../src/ui/looks');
    store.set('fm.ach', JSON.stringify(['first_win', 'league']));
    looks.syncLooks();
    // PLAN-086: the first rank's title and plain frame are on from the start, until the player picks another.
    const sign = { title: 'title_rank1', frame: 'frame_plain' };
    expect(looks.toggleLook('monocle')).toEqual(sign); // not owned
    expect(looks.toggleLook('straw_boater')).toEqual({ ...sign, hat: 'straw_boater' });
    expect(looks.toggleLook('gold_crown')).toEqual({ ...sign, hat: 'gold_crown' }); // same slot: replaces
    expect(looks.wornParts()).toEqual(['gold_crown']);
    expect(looks.toggleLook('gold_crown')).toEqual(sign);
    expect(looks.wornParts()).toEqual([]);
    // a title earned with a trophy can be picked in its place, and taken off again
    expect(looks.toggleLook('title_league')).toEqual({ ...sign, title: 'title_league' });
    expect(looks.toggleLook('title_league')).toEqual(sign);
    // the stall colour is a look like the others, kept where it always was
    expect(looks.toggleLook('col_teal')).toEqual({ ...sign, colour: 'col_teal' });
    expect(store.get('fm.colour')).toBe('"teal"');
    expect(store.get('fm.worn')).toBe('{}');
    // a sound is put on like a look and never shown to others
    expect(looks.toggleLook('bell_brass')).toEqual({ ...sign, colour: 'col_teal' });
    expect(looks.wornSounds()).toEqual({ bell: 'bell_brass', coin: 'coin_till' });
  });

  it('ignores a worn look that is no longer owned or sits in the wrong slot', async () => {
    const looks = await import('../src/ui/looks');
    store.set('fm.looks', JSON.stringify(['straw_boater']));
    store.set('fm.worn', JSON.stringify({ hat: 'straw_boater', face: 'straw_boater', neck: 'scarf', roof: 'roof_stars' }));
    expect(looks.worn()).toEqual({ hat: 'straw_boater' });
  });
});
