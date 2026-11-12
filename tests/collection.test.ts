import { beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'preact';
import { CUSTOMER_CARDS, EVENT_CARDS, lookOf } from '../src/engine/data';
import { Gazette, TradingCard, toStaticHtml } from '../src/ui/cards';
import { ALL_GUESTS } from '../src/ui/achievements';
import { saveSets, snapshot } from '../src/ui/progress';
import { CollectionTab, cardOf } from '../src/ui/Trophies';

// The collection (PLAN-091, item 1): a page that has been met opens its whole card, the same card the game opens from
// a customer's ticket (and the event deck's card); a shadow page stays a shadow.
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
});

describe('the collection', () => {
  it('a customer, a guest and an event open the game\'s own whole card, with the card\'s numbers, names and text', () => {
    const c = CUSTOMER_CARDS[4];
    const customer = cardOf({ kind: 'customer', who: c.name })!;
    expect(customer.title).toBe(lookOf(c.name).title);
    expect(toStaticHtml(customer.card)).toBe(toStaticHtml(h(TradingCard, { who: c.name, wants: c.wants, eager: true })));

    const withGuest = EVENT_CARDS.find((e) => e.extra)!;
    const guest = cardOf({ kind: 'guest', who: withGuest.extra!.name })!;
    expect(guest.title).toBe(lookOf(withGuest.extra!.name).title);
    expect(toStaticHtml(guest.card)).toBe(toStaticHtml(h(TradingCard, { who: withGuest.extra!.name, wants: withGuest.extra!.wants, guest: true, eager: true })));
    expect(toStaticHtml(guest.card)).toContain('cd-guest');

    const e = EVENT_CARDS[7];
    const event = cardOf({ kind: 'event', id: e.id })!;
    expect(event.title).toBe(e.title);
    expect(toStaticHtml(event.card)).toBe(toStaticHtml(h(Gazette, { event: e, eager: true })));
    expect(toStaticHtml(event.card)).toContain(e.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));

    expect(cardOf({ kind: 'customer', who: 'Nobody' })).toBeNull();
    expect(cardOf({ kind: 'event', id: 'nothing' })).toBeNull();
  });

  it('only a page that has been met is a button; a shadow shows no picture and no name', () => {
    const met = CUSTOMER_CARDS[0].name;
    const guest = ALL_GUESTS[0];
    const seen = EVENT_CARDS[0].id;
    saveSets({ customers: [met], guests: [guest], events: [seen] });
    const html = toStaticHtml(h(CollectionTab, { snap: snapshot(), setOpen: () => {} }));
    const buttons = html.match(/<button[^>]*class="sbk-th"[^>]*>/g) ?? [];
    expect(buttons.length).toBe(3);
    expect(buttons[0]).toContain(`aria-label="${lookOf(met).title}"`);
    expect(buttons[1]).toContain(`aria-label="${lookOf(guest).title}"`);
    expect(buttons[2]).toContain(`aria-label="${EVENT_CARDS[0].title}"`);
    for (const b of buttons) expect(b).toContain('aria-haspopup="dialog"');
    const shadows = html.match(/<span class="sbk-th no"[^>]*>\?<\/span>/g) ?? [];
    expect(shadows.length).toBe(CUSTOMER_CARDS.length + ALL_GUESTS.length + EVENT_CARDS.length - 3);
    // a shadow is not a button and names nobody
    for (const n of CUSTOMER_CARDS.slice(1).map((c) => lookOf(c.name).title)) expect(html).not.toContain(`>${n}<`);
  });
});
