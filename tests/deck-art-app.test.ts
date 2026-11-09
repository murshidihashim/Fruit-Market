import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import { CUSTOMER_CARDS, EVENT_CARDS, RIVALS, lookOf } from '../src/engine/data';
import { newGame, type GameState } from '../src/engine/game';
import { redact } from '../server/room';
import { EventIcon, Face } from '../src/ui/art';
import { toStaticHtml } from '../src/ui/cards';
import { ART_COMING, customerArt, eventArt, guestArt, shopBadge, shopScene } from '../src/ui/deckArt';
import { CustomerChar, Street } from '../src/ui/table';
import { CharacterPick } from '../src/ui/CharacterPick';

// The app shows the Great Fruit Exchange deck art (DEC-066) everywhere a character or event appears.
const GUESTS = EVENT_CARDS.flatMap((e) => (e.extra ? [e.extra.name] : []));
const srcOf = (html: string) => [...html.matchAll(/<img[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
const face = (who: string, size = 28, worn?: string[]) => toStaticHtml(h(Face, { who, size, worn }));
const ALL_TITLES = [...CUSTOMER_CARDS.map((c) => lookOf(c.name).title), ...GUESTS.map((g) => lookOf(g).title)];

describe('portraits (art.tsx Face)', () => {
  it('every shopkeeper shows their sign badge when small and their stall scene when large', () => {
    for (const r of RIVALS) {
      // Pak Din and Farah have no art yet (rules 11): a plain silhouette.
      const pic = (url: string | null) => (ART_COMING.has(r.avatar) ? [] : [url]);
      expect(srcOf(face(r.avatar, 26)), r.name).toEqual(pic(shopBadge(r.avatar)));
      expect(srcOf(face(r.avatar, 96)), r.name).toEqual(pic(shopScene(r.avatar)));
    }
  });

  it('every customer shows their own "at work" picture, and every guest the picture of their event', () => {
    for (const c of CUSTOMER_CARDS) expect(srcOf(face(c.name)), c.name).toEqual([customerArt(c.name)]);
    for (const g of GUESTS) expect(srcOf(face(g)), g).toEqual(ART_COMING.has(g) ? [] : [guestArt(g)]);
    const all = [...CUSTOMER_CARDS.map((c) => srcOf(face(c.name))[0]), ...RIVALS.filter((r) => !ART_COMING.has(r.avatar)).map((r) => srcOf(face(r.avatar))[0])];
    expect(new Set(all).size).toBe(all.length);
  });

  it('anyone without art gets a plain silhouette, never another character', () => {
    for (const who of ['shopper', 'Walk-in', 'x', '🧑‍🍳']) { // emoji-ok: an old player avatar key
      const html = face(who, 34);
      expect(html, who).not.toContain('<img');
      expect(html, who).toContain('xf-none');
    }
  });

  it('pictures have a fixed size and load lazily, without blocking', () => {
    const html = face(CUSTOMER_CARDS[0].name, 34);
    expect(html).toMatch(/width="\d+"/);
    expect(html).toMatch(/height="\d+"/);
    expect(html).toContain('decoding="async"');
    expect(html).toContain('loading="lazy"');
  });

  it('worn looks are drawn on the portrait as one regalia picture where there is room, never on tiny portraits', () => {
    expect(face(RIVALS[0].avatar, 34, ['straw_boater', 'bow_tie']).match(/class="xf-wear"/g)).toHaveLength(1);
    expect(face(RIVALS[0].avatar, 20, ['straw_boater'])).not.toContain('xf-wear');
  });
});

describe('choosing a shopkeeper (CharacterPick)', () => {
  it('shows the eight Stall Signs under their approved names, the taken one stamped and disabled', () => {
    const html = toStaticHtml(h(CharacterPick, { value: RIVALS[1].avatar, taken: { [RIVALS[4].avatar]: 'Ann' }, onPick: () => {} }));
    expect(html.match(/class="x-card x-ss/g)).toHaveLength(8);
    for (const r of RIVALS) expect(html, r.name).toContain(ART_COMING.has(r.avatar) ? `${r.name}’s` : shopScene(r.avatar)!);
    expect(html).toContain('Uncle Benny’s');
    expect(html).toContain('Taken by Ann');
    expect(html.match(/<button[^>]*disabled/g)).toHaveLength(1);
    expect(html.match(/is-selected/g)).toHaveLength(1);
    expect(html).toContain('Uncle Benny · Big Basket');
  });
});

describe('event thumbnails (art.tsx EventIcon)', () => {
  it('every event shows its Gazette picture', () => {
    for (const e of EVENT_CARDS) expect(srcOf(toStaticHtml(h(EventIcon, { id: e.id, size: 44 }))), e.id).toEqual(ART_COMING.has(e.id) ? [] : [eventArt(e.id)]);
  });
});

describe('hidden walk-ins on the table (table.tsx)', () => {
  const game = (): GameState => newGame({
    players: RIVALS.slice(0, 4).map((r, i) => ({ name: i ? r.name : 'Me', kind: i ? 'ai' as const : 'human' as const, avatar: r.avatar })),
    days: 8, unripe: true, upgrades: true, events: true, seed: 11,
  });

  it('a face-down walk-in shows only its back: the fruit wanted, no portrait, name, type or price', () => {
    const s = game();
    expect(s.queue.length).toBeGreaterThan(0);
    for (const c of s.queue) {
      const html = toStaticHtml(h(CustomerChar, { s, c, kind: 'mystery' }));
      expect(html).toContain('x-tb');
      expect(html).not.toContain('/art/');
      expect(html).not.toContain(lookOf(c.name).title);
      expect(html).not.toContain(c.name);
      expect(html).not.toContain('$');
      const fruit = [...new Set(c.wants.map((w) => w.fruit))];
      expect(html.match(/class="x-fruit"/g) ?? []).toHaveLength(fruit.length);
    }
  });

  it('the street hides walk-ins from a player who did not hear about them, also online', () => {
    const s = game();
    const titles = s.queue.map((c) => lookOf(c.name).title);
    for (const view of [s, redact(s, 0)]) {
      const html = toStaticHtml(h(Street, { s: view, viewer: 0 }));
      for (const c of s.queue) expect(html).not.toContain(customerArt(c.name)!);
      for (const t of titles) if (!ALL_TITLES.filter((x) => x !== t).some((x) => x.includes(t))) expect(html).not.toContain(`>${t}<`);
      expect(html.match(/x-tb /g) ?? []).toHaveLength(s.queue.length);
    }
  });

  it('a walk-in shows its front to the player who heard about it', () => {
    const s = game();
    const c = s.queue[0];
    c.seenBy = [0];
    const html = toStaticHtml(h(Street, { s: redact(s, 0), viewer: 0 }));
    expect(html).toContain(customerArt(c.name)!);
    const other = toStaticHtml(h(Street, { s: redact(s, 1), viewer: 1 }));
    expect(other).not.toContain(customerArt(c.name)!);
  });

  it('a face-up customer shows their Trading Card with today\'s price', () => {
    const s = game();
    const c = s.forecast!;
    const html = toStaticHtml(h(CustomerChar, { s, c, kind: 'today' }));
    expect(srcOf(html)).toContain(customerArt(c.name));
    expect(html).toContain(lookOf(c.name).title);
  });
});
