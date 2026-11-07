import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { h, type FunctionComponent } from 'preact';
import {
  CHARACTER_TRAIT, CUSTOMER_CARDS, CUSTOMER_LOOKS, EVENT_CARDS, FRUITS, PREF_INFO, RIVALS, TRAITS, lookOf, prefOf,
  type EventCard, type FruitId, type Stage,
} from '../src/engine/data';
import { CardArt, Gazette, StallSign, TradingCard, TradingCardBack, customerNumber, toStaticHtml } from '../src/ui/cards';
import { customerArt, eventArt, guestArt, shopBadge, shopScene } from '../src/ui/deckArt';
import { FruitSvg, fruitSvgString, fruitSvgUrl } from '../src/ui/fruitIcons';
import { GAZETTE } from '../src/ui/gazette';

// The Great Fruit Exchange card system (DEC-066).
const file = (url: string | null) => (url ? `public/${url.slice(url.indexOf('art/'))}` : '');
const html = <P extends object>(c: FunctionComponent<P>, props: P) => toStaticHtml(h(c, props));
const elements = (s: string) => (s.match(/<[a-z]/g) ?? []).length;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const GUESTS = EVENT_CARDS.flatMap((e) => (e.extra ? [e.extra] : []));
const STAGES: Stage[] = ['fresh', 'okay', 'notso', 'unripe'];

describe('deck art files', () => {
  it('every customer, guest, shopkeeper and event has its picture in public/art', () => {
    const missing: string[] = [];
    for (const c of CUSTOMER_CARDS) if (!existsSync(file(customerArt(c.name)))) missing.push(`customer ${c.name}`);
    for (const g of GUESTS) if (!existsSync(file(guestArt(g.name)))) missing.push(`guest ${g.name}`);
    for (const r of RIVALS) {
      if (!existsSync(file(shopScene(r.avatar)))) missing.push(`scene ${r.name}`);
      if (!existsSync(file(shopBadge(r.avatar)))) missing.push(`badge ${r.name}`);
    }
    for (const e of EVENT_CARDS) if (!existsSync(file(eventArt(e.id)))) missing.push(`event ${e.id}`);
    expect(missing).toEqual([]);
  });

  it('missing art says so and never borrows a picture', () => {
    const s = html(CardArt, { src: null, alt: 'Somebody', w: 10, h: 10 });
    expect(s).toContain('Art coming');
    expect(s).not.toContain('<img');
  });

  it('pictures load lazily with a fixed size', () => {
    const s = html(CardArt, { src: 'x.webp', alt: 'A', w: 400, h: 383 });
    expect(s).toMatch(/<img [^>]*width="400" height="383"[^>]*decoding="async" loading="lazy"/);
  });
});

describe('fruit icons', () => {
  it('draws every fruit at every freshness, each one different', () => {
    const seen = new Set<string>();
    for (const f of FRUITS) for (const s of STAGES) {
      const svg = fruitSvgString(f, s, 40);
      expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 32 32" width="40" height="40">.*<\/svg>$/);
      expect(svg.match(/<(path|circle|ellipse)\b/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
      seen.add(svg);
      const img = html(FruitSvg, { id: f, stage: s, size: 28 });
      expect(img).toContain(`src="${fruitSvgUrl(f, s)}"`);
      expect(img).toMatch(/^<img [^>]*width="28" height="28"[^>]*alt="[^"]+"/);
    }
    expect(seen.size).toBe(FRUITS.length * STAGES.length);
  });
});

describe('customer cards', () => {
  it('a trading card shows the approved name, number, type, quirk, order and what it buys', () => {
    CUSTOMER_CARDS.forEach((c, i) => {
      const s = html(TradingCard, { who: c.name, wants: c.wants });
      const look = lookOf(c.name);
      const pref = prefOf(c.name);
      expect(customerNumber(c.name)).toBe(i + 1);
      expect(s).toContain(`>${look.title}</strong>`);
      expect(s).toContain(`>${String(i + 1).padStart(2, '0')}</b>`);
      expect(s).toContain(`>${PREF_INFO[pref].title} shopper<`);
      expect(s).toContain(esc(look.quirk));
      expect(s).toContain(`Buys: ${PREF_INFO[pref].short}`);
      for (const w of c.wants) expect(s).toContain(`>$${w.max}</b>`);
      expect(s).toContain(`src="${customerArt(c.name)}"`);
    });
  });

  it('a compact (table) card stays small: picture, name and order only', () => {
    for (const c of CUSTOMER_CARDS) {
      const s = html(TradingCard, { who: c.name, wants: c.wants, compact: true });
      expect(elements(s)).toBeLessThanOrEqual(20);
      expect(s).not.toContain(esc(lookOf(c.name).quirk));
    }
  });

  it('a special guest is marked as one and uses its event scene', () => {
    for (const g of GUESTS) {
      const s = html(TradingCard, { who: g.name, wants: g.wants, guest: true });
      expect(s).toContain('Special guest');
      expect(s).toContain(`src="${guestArt(g.name)}"`);
      expect(s).toContain(`>${lookOf(g.name).title}</strong>`);
    }
  });

  it('a face-down card shows only the fruit wanted, in order: no name, picture, type, number or price', () => {
    const names = Object.entries(CUSTOMER_LOOKS).flatMap(([k, l]) => [k, l.title]);
    for (const c of CUSTOMER_CARDS) {
      const fruits: FruitId[] = c.wants.map((w) => w.fruit);
      const s = html(TradingCardBack, { fruits });
      // What a player can see or hear: the text, alt text and labels.
      const seen = [...s.matchAll(/>([^<]+)</g), ...s.matchAll(/(?:alt|aria-label)="([^"]*)"/g)].map((m) => m[1]).join(' | ');
      for (const n of names) expect(seen).not.toMatch(new RegExp(`\\b${n}\\b`));
      expect(seen).not.toMatch(/\$|shopper|premium|everyday|bargain|fresh|okay|\d/i);
      expect(s).not.toMatch(/art\/|\.webp/);
      expect([...s.matchAll(/src="([^"]*)"/g)].map((m) => m[1])).toEqual(fruits.map((f) => fruitSvgUrl(f)));
      expect(s).toContain('Fruit Market');
      expect(s).toContain('Customer');
    }
  });
});

describe('shopkeeper stall signs', () => {
  it('shows the name, the perk and the quip from the game data', () => {
    for (const r of RIVALS) {
      const t = TRAITS[CHARACTER_TRAIT[r.avatar]];
      const s = html(StallSign, { avatar: r.avatar });
      expect(s).toContain(`>${esc(r.name)}’s</strong>`);
      expect(s).toContain(`Today’s special: ${t.title}`);
      expect(s).toContain(esc(t.text));
      expect(s).toContain(esc(r.quip));
      expect(s).toContain(`src="${shopScene(r.avatar)}"`);
      expect(s).toContain(`src="${shopBadge(r.avatar)}"`);
    }
  });

  it('marks a sign that another shop has taken', () => {
    const s = html(StallSign, { avatar: RIVALS[0].avatar, takenBy: 'Player 2', selected: false });
    expect(s).toContain('is-taken');
    expect(s).toContain('Taken by Player 2');
  });
});

describe('events: the Exchange Gazette', () => {
  const numbers = (e: EventCard): Set<number> => {
    const out = new Set<number>();
    const walk = (v: unknown) => {
      if (typeof v === 'number') out.add(Math.abs(v));
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(e);
    return out;
  };

  it('every event has a front page whose story is the event text', () => {
    EVENT_CARDS.forEach((e, i) => {
      const g = GAZETTE[e.id];
      expect(g, e.id).toBeDefined();
      const s = html(Gazette, { event: e });
      expect(s).toContain(`>${e.title}</strong>`);
      expect(s).toContain(esc(e.text));
      expect(s).toContain(esc(g.subhead));
      expect(s).toContain(esc(g.caption));
      expect(s).toContain(`No. ${String(i + 1).padStart(2, '0')}`);
      expect(s).toContain(`src="${eventArt(e.id)}"`);
    });
  });

  it('the boxed effects quote only prices the event really has', () => {
    for (const e of EVENT_CARDS) {
      const have = numbers(e);
      for (const line of GAZETTE[e.id].effects) {
        for (const m of line.matchAll(/\$(\d+)/g)) expect(have.has(Number(m[1])), `${e.id}: ${line}`).toBe(true);
      }
    }
  });
});
