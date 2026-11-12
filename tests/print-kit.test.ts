import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { h } from 'preact';
import {
  CHARACTER_TRAIT, CUSTOMER_CARDS, EVENT_CARDS, FARMER_CARDS, FAVOUR_DECK, FAVOURS, MAX_STALLS, MIN_STALLS, ORDER_CARDS, RIVALS, TRAITS, UPGRADES,
  lookOf,
  type FavourId, type Stalls, type UpgradeId,
} from '../src/engine/data';
import { RULES_VERSION } from '../src/net/protocol';
import { LANES } from '../src/ui/boardModel';
import { DeckBack, FavourCard, Gazette, LorryCard, OrderCard, StallSign, TradingCard, TradingCardBack, UpgradeCard, toStaticHtml } from '../src/ui/cards';
import { tileArt, type DeckId } from '../src/ui/deckArt';
import {
  GUESTS, PER_SHEET, UPGRADE_COPIES, artFile, backArt, deckProblems, doc, factoryPages, handFixes, kitCss, mirrored, printDecks, replacedDecks, sheets,
  type DeckKey, type PrintCard, type PrintDeck,
} from '../scripts/print-cards';

// The print kit (PLAN-087) is drawn from the game's data with the app's own cards. These tests fail when the kit and
// the data disagree: a deck of the wrong size, a card printed too often or not at all, a card without its picture, a
// card without its back or with another deck's back, a back that would not land behind its own front.

const DECKS = printDecks();
const deck = (key: DeckKey): PrintDeck => DECKS.find((d) => d.key === key)!;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const shows = (html: string, text: string) => html.includes(esc(text));
const count = <T>(xs: T[]) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<T, number>());
const FAV = [...new Set(FAVOUR_DECK)];
const UPS = Object.keys(UPGRADES) as UpgradeId[];
const SIZES = Array.from({ length: MAX_STALLS - MIN_STALLS + 1 }, (_, i) => (MIN_STALLS + i) as Stalls);
/** The slots of a sheet page in reading order: the card in each, or null for an empty slot. */
const slots = (page: string) => [...page.matchAll(/<div class="pk-slot(?: is-empty)?"(?: data-card="([^"]*)" data-side="(front|back)")?>/g)].map((m) => (m[1] ? { card: m[1], side: m[2] } : null));
/** A card's parts without its words and pictures: its tags and classes, in order. */
const skeleton = (html: string) => [...html.matchAll(/<(\w+)(?: class="([^"]*)")?/g)].filter((m) => m[1] !== 'img').map((m) => `${m[1]}.${m[2] ?? ''}`).join(' ');

describe('print kit: the decks are the game\'s (PLAN-087)', () => {
  it('prints eight decks, each the size the data gives', () => {
    expect(DECKS.map((d) => [d.key, d.cards.length])).toEqual([
      ['customers', CUSTOMER_CARDS.length], ['guests', EVENT_CARDS.filter((e) => e.extra).length], ['events', EVENT_CARDS.length],
      ['lorries', FARMER_CARDS.length], ['shopkeepers', RIVALS.length], ['favours', FAVOUR_DECK.length],
      ['upgrades', UPS.length * MAX_STALLS], ['orders', ORDER_CARDS.length],
    ]);
    // The numbers the rules give (RULES.md, Cards and Components for 6 stalls), so a change to the data is noticed here.
    expect(DECKS.map((d) => d.cards.length)).toEqual([36, 5, 20, 20, 8, 12, 30, 8]);
  });

  it('prints every card of the data once, or as often as the rules say', () => {
    const ids = (key: DeckKey) => count(deck(key).cards.map((c) => c.id));
    expect(ids('customers')).toEqual(count(CUSTOMER_CARDS.map((c) => `customer:${c.name}`)));
    expect(ids('guests')).toEqual(count(GUESTS.map((g) => `guest:${g.guest.name}`)));
    expect(ids('events')).toEqual(count(EVENT_CARDS.map((e) => `event:${e.id}`)));
    expect(ids('lorries')).toEqual(count(FARMER_CARDS.map((c) => `lorry:${c.name}`)));
    expect(ids('shopkeepers')).toEqual(count(RIVALS.map((r) => `shopkeeper:${r.avatar}`)));
    // The favour deck is the game's own, card for card (2 of each).
    expect(ids('favours')).toEqual(count(FAVOUR_DECK.map((id) => `favour:${id}`)));
    // Every stall may build each upgrade once: one of each for every stall.
    expect(UPGRADE_COPIES).toBe(MAX_STALLS);
    expect(ids('upgrades')).toEqual(new Map(UPS.map((id) => [`upgrade:${id}`, MAX_STALLS])));
    expect(ids('orders')).toEqual(count(ORDER_CARDS.map((o) => `order:${o.name}`)));
    // Copies are numbered from 1, and no card of the data is in two decks.
    for (const d of DECKS) for (const [id, n] of count(d.cards.map((c) => c.id))) {
      expect(d.cards.filter((c) => c.id === id).map((c) => c.copy), id).toEqual(Array.from({ length: n }, (_, i) => i + 1));
    }
    const all = DECKS.flatMap((d) => [...new Set(d.cards.map((c) => c.id))]);
    expect(new Set(all).size).toBe(all.length);
  });

  it('draws every front with the app\'s own card, from the data', () => {
    CUSTOMER_CARDS.forEach((c, i) => {
      const card = deck('customers').cards[i];
      expect(card.front, c.name).toBe(toStaticHtml(h(TradingCard, { who: c.name, wants: c.wants, eager: true })));
      expect(shows(card.front, lookOf(c.name).title), c.name).toBe(true);
      for (const w of c.wants) expect(card.front, `${c.name} ${w.fruit}`).toContain(`>$${w.max}<`);
    });
    GUESTS.forEach(({ guest }, i) => {
      expect(deck('guests').cards[i].front).toBe(toStaticHtml(h(TradingCard, { who: guest.name, wants: guest.wants, guest: true, eager: true })));
      for (const w of guest.wants) expect(deck('guests').cards[i].front, guest.name).toContain(`>$${w.max}<`);
    });
    EVENT_CARDS.forEach((e, i) => {
      const card = deck('events').cards[i];
      expect(card.front).toBe(toStaticHtml(h(Gazette, { event: e, eager: true })));
      expect(shows(card.front, e.title) && shows(card.front, e.text), e.id).toBe(true);
    });
    FARMER_CARDS.forEach((c, i) => {
      const card = deck('lorries').cards[i];
      expect(card.front).toBe(toStaticHtml(h(LorryCard, { card: c })));
      expect(shows(card.front, c.name), c.name).toBe(true);
      // every table size, in the board's lane order, and no row boxed (the card is not in a game)
      const numbers = [...card.front.matchAll(/class="cd-ly-n[^"]*">(\d+)</g)].map((m) => Number(m[1]));
      expect(numbers, c.name).toEqual(SIZES.flatMap((n) => LANES.map((f) => c.table[n][f])));
      expect(card.front).not.toMatch(/cd-ly-[ln][^"]* on"/);
    });
    RIVALS.forEach((r, i) => {
      const card = deck('shopkeepers').cards[i];
      const trait = TRAITS[CHARACTER_TRAIT[r.avatar]];
      expect(card.front).toBe(toStaticHtml(h(StallSign, { avatar: r.avatar, eager: true })));
      expect(shows(card.front, r.name) && shows(card.front, trait.title) && shows(card.front, trait.text), r.name).toBe(true);
    });
    for (const c of deck('favours').cards) {
      const id = c.id.slice('favour:'.length) as FavourId;
      expect(c.front).toBe(toStaticHtml(h(FavourCard, { id, eager: true })));
      expect(shows(c.front, FAVOURS[id].title) && shows(c.front, FAVOURS[id].text), id).toBe(true);
    }
    for (const c of deck('upgrades').cards) {
      const id = c.id.slice('upgrade:'.length) as UpgradeId;
      expect(c.front).toBe(toStaticHtml(h(UpgradeCard, { id, eager: true })));
      expect(shows(c.front, UPGRADES[id].title) && shows(c.front, UPGRADES[id].text) && c.front.includes(`>$${UPGRADES[id].cost}<`), id).toBe(true);
    }
    ORDER_CARDS.forEach((o, i) => {
      const card = deck('orders').cards[i];
      expect(card.front).toBe(toStaticHtml(h(OrderCard, { card: o })));
      expect(shows(card.front, o.title) && card.front.includes(`>$${o.ceiling}<`) && card.front.includes(`>$${o.stake}<`), o.name).toBe(true);
    });
  });
});

describe('print kit: pictures and backs', () => {
  it('has no card without its picture, and every picture and back tile is a file on disk', () => {
    expect(DECKS.flatMap(deckProblems)).toEqual([]);
    for (const d of DECKS) for (const c of d.cards) {
      // Lorries and standing orders have no picture by design (the approved cards show lanes and numbers).
      if (d.key === 'lorries' || d.key === 'orders') expect(c.art, c.label).toBeNull();
      else expect(c.art && existsSync(artFile(c.art)) && c.front.includes(c.art), c.label).toBe(true);
      expect(c.front, c.label).not.toContain('Art coming');
    }
  });

  it('notices a card with no picture, a missing file or no back', () => {
    const good = deck('events').cards[0];
    const bad = (over: Partial<PrintCard>): PrintDeck => ({ ...deck('events'), cards: [{ ...good, ...over }] });
    expect(deckProblems(bad({}))).toEqual([]);
    expect(deckProblems(bad({ art: null }))[0]).toMatch(/no picture/);
    expect(deckProblems(bad({ art: good.art!.replace('festival', 'no-such-event') })).join(' ')).toMatch(/picture file missing/);
    expect(deckProblems(bad({ front: good.front.replace(good.art!, '') }))[0]).toMatch(/does not show its picture/);
    expect(deckProblems(bad({ back: '' })).join(' ')).toMatch(/no back/);
    expect(deckProblems(bad({ back: deck('lorries').cards[0].back }))[0]).toMatch(/does not show its deck's tile/);
  });

  it('gives every customer its own back: the fruit it wants in fixed squares, and nothing else', () => {
    CUSTOMER_CARDS.forEach((c, i) => {
      const card = deck('customers').cards[i];
      expect(card.backKind).toBe('customer');
      expect(card.back, c.name).toBe(toStaticHtml(h(TradingCardBack, { fruits: c.wants.map((w) => w.fruit) })));
      expect(card.back.match(/class="cd-sq on"/g)?.length, c.name).toBe(new Set(c.wants.map((w) => w.fruit)).size);
      // the back gives away no name, number or price
      expect(shows(card.back, lookOf(c.name).title), c.name).toBe(false);
      expect(card.back, c.name).not.toMatch(/\$\d/);
    });
  });

  it('gives a guest the customer back\'s design, named for its event and not as a walk-in', () => {
    GUESTS.forEach(({ guest, event }, i) => {
      const card = deck('guests').cards[i];
      const fruits = guest.wants.map((w) => w.fruit);
      expect(card.backKind).toBe('guest');
      expect(skeleton(card.back), guest.name).toBe(skeleton(toStaticHtml(h(TradingCardBack, { fruits }))));
      expect(card.back.match(/class="cd-sq on"/g)?.length, guest.name).toBe(new Set(fruits).size);
      expect(shows(card.back, event.title), guest.name).toBe(true);
      expect(card.back).not.toContain('Walk-in');
      expect(card.back).not.toMatch(/\$\d/);
    });
  });

  it('gives the other six decks their own pattern back (DEC-096): the app\'s back, with the deck\'s tile', () => {
    const KIND: Partial<Record<DeckKey, DeckId>> = { events: 'event', lorries: 'lorry', shopkeepers: 'shopkeeper', favours: 'favour', upgrades: 'upgrade', orders: 'order' };
    for (const d of DECKS) {
      const kind = KIND[d.key];
      if (!kind) { expect(['customers', 'guests']).toContain(d.key); continue; }
      const app = toStaticHtml(h(DeckBack, { deck: kind }));
      for (const c of d.cards) {
        expect(c.backKind, c.label).toBe(kind);
        expect(c.back, c.label).toBe(d.cards[0].back); // one back for the whole deck
      }
      const back = d.cards[0].back;
      expect(backArt(kind)).toBe(tileArt(kind));
      expect(back).toContain(`cd-bk-${kind}`);
      // The same card as the app's, with the tile laid as pictures in place of a repeating background.
      expect(back.replace(/<div class="pk-tiles".*?<\/div>/, '')).toBe(app.replace(/ style="background-image:[^"]*"/, ''));
      expect(app).toContain(`background-image:url(${tileArt(kind)})`);
      const tiles = [...back.matchAll(/<img src="([^"]*)" alt="">/g)].map((m) => m[1]);
      expect(tiles.length).toBe(20);
      expect(new Set(tiles)).toEqual(new Set([tileArt(kind)]));
    }
    // The deck size on each back is the data's.
    expect(deck('favours').cards[0].back).toContain(`Deck of ${FAVOUR_DECK.length}`);
    expect(deck('lorries').cards[0].back).toContain(`Deck of ${FARMER_CARDS.length}`);
    expect(deck('orders').cards[0].back).toContain(`Deck of ${ORDER_CARDS.length}`);
  });
});

describe('print kit: sheets and factory pages', () => {
  it('lays nine cards to a sheet, every card once, and each back behind its own front when the sheet is turned over', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8].map(mirrored)).toEqual([2, 1, 0, 5, 4, 3, 8, 7, 6]);
    for (const d of DECKS) {
      const pages = sheets(d);
      expect(pages.length, d.key).toBe(2 * Math.ceil(d.cards.length / PER_SHEET));
      const printed: string[] = [];
      for (let p = 0; p < pages.length; p += 2) {
        const front = slots(pages[p].html);
        const back = slots(pages[p + 1].html);
        expect(front.length % 3, d.key).toBe(0);
        expect(back.length, d.key).toBe(front.length);
        front.forEach((s, i) => {
          const behind = back[mirrored(i)];
          expect(behind?.card ?? null, `${d.key} sheet ${p / 2 + 1} slot ${i}`).toBe(s?.card ?? null);
          if (s) { expect(s.side).toBe('front'); expect(behind?.side).toBe('back'); printed.push(s.card); }
        });
        for (const page of [pages[p], pages[p + 1]]) expect(page.html).toContain(`rules version ${RULES_VERSION}`);
      }
      expect(printed, d.key).toEqual(d.cards.map((c) => `${c.id}#${c.copy}`));
    }
  });

  it('gives a card printer each different front once, with how many to print, and the backs', () => {
    const n = (key: DeckKey) => factoryPages(deck(key)).length;
    // customers and guests: front, back, front, back; the other decks: the fronts, then their one back
    expect([n('customers'), n('guests')]).toEqual([2 * CUSTOMER_CARDS.length, 2 * GUESTS.length]);
    expect([n('events'), n('lorries'), n('shopkeepers'), n('favours'), n('upgrades'), n('orders')])
      .toEqual([EVENT_CARDS.length + 1, FARMER_CARDS.length + 1, RIVALS.length + 1, FAV.length + 1, UPS.length + 1, ORDER_CARDS.length + 1]);
    expect(factoryPages(deck('upgrades'))[0].html).toContain(`print ${MAX_STALLS}`);
    expect(factoryPages(deck('favours'))[0].html).toContain('print 2');
    for (const d of DECKS) for (const p of factoryPages(d)) expect(p.html).toContain(`Rules version ${RULES_VERSION}`);
  });

  it('builds a page that needs nothing from the web: pictures from disk, fonts inside', () => {
    const html = doc('test', [...sheets(deck('events')), ...sheets(deck('customers'))], kitCss());
    const pictures = [...html.matchAll(/src="([^"]*)"/g)].map((m) => m[1]).filter((s) => !s.startsWith('data:'));
    expect(pictures.length).toBeGreaterThan(EVENT_CARDS.length + CUSTOMER_CARDS.length);
    for (const src of pictures) {
      expect(src).toMatch(/^file:\/\//);
      expect(existsSync(new URL(src)), src).toBe(true);
    }
    expect(html).not.toMatch(/url\('[^']*node_modules/);
    expect(html).toContain('font/woff2;base64,');
    expect(html).not.toContain('loading="lazy"');
  });
});

describe('print kit: for someone who holds the earlier printing (the update pack)', () => {
  it('replaces four decks whole, with the kit\'s own cards', () => {
    const replaced = replacedDecks();
    expect(replaced.map((r) => r.deck.key)).toEqual(['orders', 'upgrades', 'shopkeepers', 'favours']);
    for (const r of replaced) expect(r.deck.cards, r.deck.key).toEqual(deck(r.deck.key).cards);
    for (const u of Object.values(UPGRADES)) expect(replaced[1].why).toContain(`${u.title} $${u.cost}`);
    for (const t of ['charmer', 'favourite', 'nestegg', 'earful'] as const) expect(replaced[2].why).toContain(TRAITS[t].title);
    expect(replaced[3].why).toContain(`${FAVOUR_DECK.length} cards`);
  });

  it('lists the six cards to correct by hand, each still in the game, with the data\'s numbers', () => {
    const fixes = handFixes();
    expect(fixes.map((f) => f.deck)).toEqual(['Customers', 'Customers', 'Customers', 'Lorries', 'Lorries', 'Events']);
    (['Mei Ling', 'Kumar', 'Hafiz'] as const).forEach((key, i) => {
      const n = CUSTOMER_CARDS.findIndex((c) => c.name === key);
      const max = CUSTOMER_CARDS[n].wants.find((w) => w.fruit === 'blueberry')!.max;
      expect(fixes[i].card).toBe(`No ${String(n + 1).padStart(2, '0')} · ${lookOf(key).title}`);
      expect(fixes[i].fix).toContain(`$${max} `);
    });
    const table = (name: string) => FARMER_CARDS.find((c) => c.name === name)!.table;
    expect(fixes[3].card).toContain('Summer Run');
    expect(fixes[3].fix).toContain(`5 stalls: ${table('Berries and Melons')[5].apple}. At 6 stalls: ${table('Berries and Melons')[6].apple} `);
    expect(fixes[4].fix).toContain(`3 stalls: ${table('Short Load')[3].watermelon} `);
    const glut = EVENT_CARDS.find((e) => e.id === 'glut')!;
    expect(fixes[5].card).toBe(glut.title);
    expect(fixes[5].fix).toContain(`$${-glut.costFruit!.blueberry!} less`);
  });
});
