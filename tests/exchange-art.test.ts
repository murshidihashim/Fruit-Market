import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import { bandTile, glyphFor, gradeFor, ICON_NAMES, iconUrl, lorryUrl, PROP_IDS, propUrl, ROOF_IDS, TRIM_IDS } from '../src/ui/exchangeArt';
import { Icon, PropSprite, RoofBand } from '../src/ui/icons';
import { toStaticHtml } from '../src/ui/cards';

const svgOf = (url: string | null) => decodeURIComponent((url ?? '').replace(/^data:image\/svg\+xml,/, ''));

describe('Great Fruit Exchange drawings (DEC-069)', () => {
  it('draws every icon at small, middle and large sizes as one SVG image', () => {
    for (const n of ICON_NAMES) for (const px of [12, 20, 32]) {
      const svg = svgOf(iconUrl(n, px));
      expect(svg, `${n} ${px}`).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 32 32"/);
      expect(svg.length, `${n} ${px}`).toBeGreaterThan(200);
    }
  });

  it('turns the hatching into a tint at small sizes and uses simpler small drawings', () => {
    expect(gradeFor(11)).toBe('s');
    expect(gradeFor(16)).toBe('s');
    expect(gradeFor(20)).toBe('m');
    expect(gradeFor(32)).toBe('l');
    expect(svgOf(iconUrl('star', 14))).not.toContain('url(#dh)');
    expect(svgOf(iconUrl('star', 32))).toContain('url(#dh)');
    // The ear trumpet read like a spanner at 14 px: the small size draws a plain horn instead.
    expect(glyphFor('ear', 14)).toBe('earSmall');
    expect(glyphFor('ear', 32)).toBe('earTrumpet');
    expect(glyphFor('coin', 12)).toBe('tokenSmall');
  });

  it('keeps the Exchange twists: token coin, trolley cart, medal star, stock ticket, bond egg', () => {
    expect([glyphFor('coin', 32), glyphFor('cart', 32), glyphFor('star', 32), glyphFor('tag', 32), glyphFor('egg', 32)])
      .toEqual(['token', 'trolley', 'starMedal', 'stockTag', 'eggBond']);
    expect([glyphFor('coolroom', 20), glyphFor('signboard', 20), glyphFor('fv_gossip', 20), glyphFor('fv_freeFruit', 20), glyphFor('fv_priority', 20), glyphFor('fv_favouredTrade', 20)])
      .toEqual(['vault', 'tickerBoard', 'gazette', 'voucher', 'bellTicket', 'contract']);
  });

  it('draws the lorry in two frames with no lettering on it', () => {
    const a = svgOf(lorryUrl(0)), b = svgOf(lorryUrl(1));
    expect(a).not.toEqual(b);
    expect(a).not.toContain('<text');
    expect(b).not.toContain('<text');
  });

  it('draws every roof, trim and prop, the roof in the player colour', () => {
    for (const r of ROOF_IDS) expect(svgOf(bandTile('#123456', r).url)).toContain('#123456');
    for (const t of TRIM_IDS) {
      const tile = bandTile('#123456', undefined, t);
      expect(tile.h).toBeGreaterThan(14);
      expect(tile.w % 16).toBe(0);
    }
    for (const p of PROP_IDS) expect(propUrl(p, 30)).toMatch(/^data:image\/svg\+xml,/);
    expect(propUrl('nope', 30)).toBeNull();
  });

  it('costs one element per icon, prop and band on the page', () => {
    expect(toStaticHtml(h(Icon, { name: 'coin', size: 16 }))).toMatch(/^<img [^>]*src="data:image\/svg\+xml/);
    expect(toStaticHtml(h(PropSprite, { id: 'prop_cat', size: 30 })).match(/</g)?.length).toBe(1);
    expect(toStaticHtml(h(RoofBand, { cls: 'x', colour: '#123456', roof: 'roof_stars', trim: 'trim_bunting' })).match(/<div/g)?.length).toBe(1);
  });
});
