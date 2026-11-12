import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { h, type FunctionComponent } from 'preact';
import {
  CHARACTER_TRAIT, CUSTOMER_CARDS, CUSTOMER_LOOKS, EVENT_CARDS, FARMER_CARDS, FAVOUR_DECK, FAVOUR_HAND_LIMIT, FAVOURS, FRUIT, FRUITS, ORDER_CARDS,
  PREF_INFO, RIVALS, TRAITS, UPGRADES, lookOf, orderQty, prefOf,
  type FavourId, type FruitId, type Stage, type Stalls, type UpgradeId,
} from '../src/engine/data';
import { Logo } from '../src/ui/art';
import { LANES } from '../src/ui/boardModel';
import {
  CardArt, DeckBack, EventBack, FavourCard, Gazette, LorryCard, OrderCard, StallSign, TradingCard, TradingCardBack, UPGRADE_FIGURE, UpgradeCard,
  customerNumber, toStaticHtml,
} from '../src/ui/cards';
import { capsWidth, fitTitle, titleLines } from '../src/ui/cardType';
import {
  ART_COMING, CALM_ART, GUEST_EVENT, customerArt, customerFocus, eventArt, eventFocus, favourArt, favourFocus, guestArt, guestFocus, shopBadge,
  shopFocus, shopScene, tileArt, upgradeArt, upgradeFocus, type DeckId, type Focus,
} from '../src/ui/deckArt';
import { cardChips, newsChips } from '../src/ui/eventChips';
import { FruitSvg, fruitSvgString, fruitSvgUrl } from '../src/ui/fruitIcons';
import { CustomerWide, EventTicket, FavourChip, FavourMini, LorryTicket, OrderTicket, UpgradeOffer } from '../src/ui/phoneCards';
import { Ticket, TicketBack, dotsNeed } from '../src/ui/ticket';

// The card system (PLAN-083, the rules 18 card set): the cards are drawn to the approved designs
// (docs/studio/review-18/mockups) from the game's data. The pictures are SVG files in public/art-ticket; the owner's
// earlier illustrations stay in public/art.
const file = (url: string | null) => (url ? `public/${url.slice(url.search(/art(-ticket)?\//))}` : '');
// The props are checked against the component's own (NoInfer), so a literal such as 'stripes' keeps its type.
const html = <P extends object>(c: FunctionComponent<P>, props: NoInfer<P>) => toStaticHtml(h(c, props));
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
/** What a player can see or hear on a card: its text, alt text and labels. */
const seen = (s: string) => [...s.matchAll(/>([^<]+)</g), ...s.matchAll(/(?:alt|aria-label)="([^"]*)"/g)].map((m) => m[1]).join(' | ');
const srcs = (s: string) => [...s.matchAll(/src="([^"]*)"/g)].map((m) => m[1]);
const GUESTS = EVENT_CARDS.flatMap((e) => (e.extra ? [e.extra] : []));
const STAGES: Stage[] = ['fresh', 'okay', 'notso', 'unripe'];
const FAV = Object.keys(FAVOURS) as FavourId[];
const UPS = Object.keys(UPGRADES) as UpgradeId[];
const DECKS: DeckId[] = ['lorry', 'event', 'favour', 'upgrade', 'shopkeeper', 'order'];
const two = (n: number) => String(n).padStart(2, '0');

describe('card picture files (PLAN-083)', () => {
  /** Every picture the game's data points at, with what it is for. */
  const used: [string, string | null][] = [
    ...CUSTOMER_CARDS.map((c): [string, string | null] => [`customer ${c.name}`, customerArt(c.name)]),
    ...GUESTS.map((g): [string, string | null] => [`guest ${g.name}`, guestArt(g.name)]),
    ...EVENT_CARDS.map((e): [string, string | null] => [`event ${e.id}`, eventArt(e.id)]),
    ['Calm Day', CALM_ART],
    ...RIVALS.flatMap((r): [string, string | null][] => [[`shopkeeper scene ${r.name}`, shopScene(r.avatar)], [`shopkeeper face ${r.name}`, shopBadge(r.avatar)]]),
    ...ORDER_CARDS.map((o): [string, string | null] => [`standing-order client ${o.name}`, customerArt(o.name)]),
    ...FAV.map((id): [string, string | null] => [`favour ${id}`, favourArt(id)]),
    ...UPS.map((id): [string, string | null] => [`upgrade ${id}`, upgradeArt(id)]),
    ...DECKS.map((d): [string, string | null] => [`back tile ${d}`, tileArt(d)]),
  ];

  it('every customer, guest, event, shopkeeper, standing-order client, favour, upgrade and deck back has a picture file on disk', () => {
    const missing = used.filter(([, url]) => !url || !existsSync(file(url))).map(([what]) => what);
    expect(missing).toEqual([]);
    // 36 customers, 5 guests, 20 events and Calm Day, 8 scenes and 8 faces, 8 clients, 6 favours, 5 upgrades, 6 tiles
    expect(used).toHaveLength(36 + 5 + 20 + 1 + 16 + 8 + 6 + 5 + 6);
    expect(file(customerArt('John'))).toBe('public/art-ticket/customers/john.svg');
    expect(file(customerArt('Pie Factory'))).toBe('public/art-ticket/orders/pie-factory.svg');
    expect([...ART_COMING]).toEqual([]); // every card of the set is drawn
  });

  it('each character and card has its own picture; a guest borrows its event\'s', () => {
    const own = used.filter(([what]) => !what.startsWith('guest ')).map(([, url]) => url);
    expect(new Set(own).size).toBe(own.length);
    for (const g of GUESTS) expect(guestArt(g.name), g.name).toBe(eventArt(GUEST_EVENT[g.name]));
  });

  it('the art folder holds no picture that nothing uses', () => {
    const dir = 'public/art-ticket';
    const onDisk = readdirSync(dir).flatMap((d) => readdirSync(join(dir, d)).map((f) => `${dir}/${d}/${f}`)).sort();
    expect(onDisk).toEqual([...new Set(used.map(([, url]) => file(url)))].sort());
  });

  it('the pictures are SVG files loaded as images; only the small shopkeeper faces are webp', () => {
    for (const [what, url] of used) expect(url, what).toMatch(what.startsWith('shopkeeper face') ? /avatars\/[a-z]+\.webp$/ : /\.svg$/);
  });

  it('the owner\'s earlier illustrations are kept in public/art', () => {
    for (const c of CUSTOMER_CARDS) expect(existsSync(file(customerArt(c.name)).replace('art-ticket/', 'art/').replace(/\.svg$/, '.webp')), c.name).toBe(true);
  });

  it('every picture has a focus point inside it', () => {
    const points: [string, Focus][] = [
      ...CUSTOMER_CARDS.map((c): [string, Focus] => [c.name, customerFocus(c.name)]),
      ...ORDER_CARDS.map((o): [string, Focus] => [o.name, customerFocus(o.name)]),
      ...GUESTS.map((g): [string, Focus] => [g.name, guestFocus(g.name)]),
      ...EVENT_CARDS.map((e): [string, Focus] => [e.id, eventFocus(e.id)]),
      ['calm', eventFocus('calm')],
      ...RIVALS.map((r): [string, Focus] => [r.name, shopFocus(r.avatar)]),
      ...FAV.map((id): [string, Focus] => [id, favourFocus(id)]),
      ...UPS.map((id): [string, Focus] => [id, upgradeFocus(id)]),
    ];
    for (const [what, [x, y]] of points) {
      expect(x, what).toBeGreaterThanOrEqual(0);
      expect(x, what).toBeLessThanOrEqual(100);
      expect(y, what).toBeGreaterThanOrEqual(0);
      expect(y, what).toBeLessThanOrEqual(100);
    }
    // A customer's head is drawn in the middle of the picture.
    for (const c of CUSTOMER_CARDS) expect(customerFocus(c.name)[0], c.name).toBe(50);
  });

  it('missing art says so and never borrows a picture', () => {
    const s = html(CardArt, { src: null, alt: 'Somebody', w: 10, h: 10 });
    expect(s).toContain('Art coming');
    expect(s).not.toContain('<img');
  });

  it('pictures load lazily with a fixed size, cropped round their focus point', () => {
    const s = html(CardArt, { src: 'x.svg', alt: 'A', w: 600, h: 400, focus: [50, 40] as const });
    expect(s).toMatch(/<img [^>]*width="600" height="400"[^>]*decoding="async" loading="lazy"/);
    expect(s).toContain('object-position:50% 40%');
  });
});

describe('fruit icons', () => {
  it('draws every fruit at every freshness, each one different', () => {
    const drawn = new Set<string>();
    for (const f of FRUITS) for (const s of STAGES) {
      const svg = fruitSvgString(f, s, 40);
      expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 32 32" width="40" height="40">.*<\/svg>$/);
      expect(svg.match(/<(path|circle|ellipse)\b/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
      drawn.add(svg);
      const img = html(FruitSvg, { id: f, stage: s, size: 28 });
      expect(img).toContain(`src="${fruitSvgUrl(f, s)}"`);
      expect(img).toMatch(/^<img [^>]*width="28" height="28"[^>]*alt="[^"]+"/);
    }
    expect(drawn.size).toBe(FRUITS.length * STAGES.length);
  });
});

describe('customer cards (the Main board)', () => {
  it('a card shows the number, the type, the approved name, the picture, the quirk and a price tag for each fruit', () => {
    CUSTOMER_CARDS.forEach((c, i) => {
      const s = html(TradingCard, { who: c.name, wants: c.wants });
      const look = lookOf(c.name);
      expect(customerNumber(c.name)).toBe(i + 1);
      expect(s).toContain(`<b>${two(i + 1)}</b> · Customer`);
      expect(s).toContain(`<span>${PREF_INFO[prefOf(c.name)].title}</span>`);
      expect(s).toContain(`>${look.title}</strong>`);
      expect(s).toContain(esc(look.quirk));
      for (const w of c.wants) expect(s).toContain(`<b class="cd-tag">$${w.max}</b>`);
      expect(s).toContain(`src="${customerArt(c.name)}"`);
      expect(s).toContain(`alt="${look.title}"`);
    });
  });

  it('the fruit rows are in the board\'s lane order, with one dot for each piece', () => {
    for (const c of CUSTOMER_CARDS) {
      const s = html(TradingCard, { who: c.name, wants: c.wants });
      const rows = [...s.matchAll(/<li class="ln-([a-z]+)">.*?<\/li>/g)];
      const order = [...c.wants].sort((a, b) => LANES.indexOf(a.fruit) - LANES.indexOf(b.fruit));
      expect(rows.map((m) => m[1]), c.name).toEqual(order.map((w) => w.fruit));
      rows.forEach((m, k) => expect(m[0].match(/<i><\/i>/g) ?? [], c.name).toHaveLength(order[k].qty));
    }
    // Cowboy Jack's card lists the apple first; the card draws the watermelon first.
    expect(CUSTOMER_CARDS[0].wants.map((w) => w.fruit)).toEqual(['apple', 'watermelon']);
    expect([...html(TradingCard, { who: 'John', wants: CUSTOMER_CARDS[0].wants }).matchAll(/<li class="ln-([a-z]+)">/g)].map((m) => m[1])).toEqual(['watermelon', 'apple']);
  });

  it('one legend row: Fresh, Okay at $1 less, Soft at $2 less; a freshness the customer will not buy is greyed', () => {
    const legend = (who: string) => html(TradingCard, { who, wants: CUSTOMER_CARDS[0].wants }).match(/<div class="cd-leg".*?<\/div>/)![0];
    const premium = legend('Ravi');
    const everyday = legend('John');
    const bargain = legend('Kumar');
    for (const l of [premium, everyday, bargain]) {
      expect(l.match(/<span/g)).toHaveLength(3);
      expect(l).toContain(`−$${FRUIT.apple.drop[1]}`);
      expect(l).toContain(`−$${FRUIT.apple.drop[0]}`);
    }
    expect(premium.match(/cd-lamp off/g)).toHaveLength(2);
    expect(everyday.match(/cd-lamp off/g)).toHaveLength(1);
    expect(bargain).not.toContain('cd-lamp off');
    expect(everyday).toContain('Everyday: Buys Fresh or Okay fruit.');
  });

  it('a special guest is marked as one, has no number and uses its event\'s picture', () => {
    for (const g of GUESTS) {
      const s = html(TradingCard, { who: g.name, wants: g.wants, guest: true });
      expect(s).toContain('<span>Guest</span>');
      expect(s).not.toContain('· Customer');
      expect(s).toContain(`src="${guestArt(g.name)}"`);
      expect(s).toContain(`>${lookOf(g.name).title}</strong>`);
      expect(s.match(/<li class="ln-/g)).toHaveLength(g.wants.length);
    }
  });

  it('a face-down card shows only which fruit is wanted, in four fixed squares: no name, picture, type, number, amount or price', () => {
    const names = Object.entries(CUSTOMER_LOOKS).flatMap(([k, l]) => [k, l.title]);
    for (const c of CUSTOMER_CARDS) {
      const fruits: FruitId[] = c.wants.map((w) => w.fruit);
      const s = html(TradingCardBack, { fruits });
      for (const n of names) expect(seen(s)).not.toMatch(new RegExp(`\\b${n}\\b`));
      expect(seen(s)).not.toMatch(/\$|shopper|premium|everyday|bargain|fresh|okay|\d/i);
      expect(s).not.toMatch(/art-ticket|art\/|\.webp|\.svg"/);
      // Four squares, one per fruit in the lane order; the wanted ones hold that fruit's icon, the others nothing.
      const squares = [...s.matchAll(/<span class="cd-sq( on)?">(.*?)<\/span>/g)];
      expect(squares).toHaveLength(4);
      squares.forEach((m, k) => {
        const want = fruits.includes(LANES[k]);
        expect(!!m[1], `${c.name} ${LANES[k]}`).toBe(want);
        expect(m[2], `${c.name} ${LANES[k]}`).toBe(want ? html(FruitSvg, { id: LANES[k], size: 58, alt: '' }) : '');
      });
      expect(s).toContain('>Wants<');
      expect(s).toContain('Customer');
    }
    // The same back whatever the amounts and the order on the card.
    const back = (fruits: FruitId[]) => html(TradingCardBack, { fruits });
    expect(back(['apple', 'watermelon'])).toBe(back(['watermelon', 'apple', 'apple']));
  });
});

describe('design A cards: shopkeeper, event, lorry, favour, upgrade, standing order', () => {
  it('a shopkeeper\'s card shows the name, the picture, the perk and its rule from the game data', () => {
    RIVALS.forEach((r, i) => {
      const t = TRAITS[CHARACTER_TRAIT[r.avatar]];
      const s = html(StallSign, { avatar: r.avatar });
      expect(s).toContain('<span>Shopkeeper</span>');
      expect(s).toContain(`<b>No ${two(i + 1)}</b>`);
      expect(s).toContain(`>${esc(r.name)}</strong>`);
      expect(s).toContain(`<small>Perk</small><b>${t.title}</b>`);
      expect(s).toContain(esc(t.text));
      expect(s).toContain(`src="${shopScene(r.avatar)}"`);
      expect(s).toContain(`alt="${r.name}"`);
    });
  });

  it('marks the card chosen, a card another stall has taken, and the stall sheet\'s pattern when it is known', () => {
    const s = html(StallSign, { avatar: RIVALS[0].avatar, takenBy: 'Player 2', selected: false });
    expect(s).toContain('is-taken');
    expect(s).toContain('Taken by Player 2');
    expect(s).not.toContain('is-selected');
    const mine = html(StallSign, { avatar: RIVALS[0].avatar, selected: true, pattern: 'stripes' as const });
    expect(mine).toContain('is-selected');
    expect(mine).toContain('stripes<i class="cd-sw pat-stripes">');
    expect(mine).not.toContain('No 01');
  });

  it('every event card shows its number, title, picture, the event text and a number block for what it changes', () => {
    EVENT_CARDS.forEach((e, i) => {
      const s = html(Gazette, { event: e });
      expect(s).toContain('<span>Event</span>');
      expect(s).toContain(`<b>No ${two(i + 1)}</b>`);
      expect(s).toContain(`>${e.title}</strong>`);
      expect(s).toContain(`<p class="cd-txt">${esc(e.text)}</p>`);
      expect(s).toContain(`src="${eventArt(e.id)}"`);
      const chips = cardChips(e);
      expect(chips.length, e.id).toBeGreaterThan(0);
      expect(s.match(/class="cd-blk /g), e.id).toHaveLength(chips.length);
      for (const c of chips) expect(s).toContain(`<b>${c.big}</b><small>${c.small}</small>`);
    });
  });

  it('the number blocks quote only figures the event really has', () => {
    const numbers = (v: unknown, out = new Set<number>()): Set<number> => {
      if (typeof v === 'number') out.add(Math.abs(v));
      else if (v && typeof v === 'object') Object.values(v).forEach((x) => numbers(x, out));
      return out;
    };
    for (const e of EVENT_CARDS) {
      const have = numbers(e);
      for (const c of [...cardChips(e), ...newsChips(e)]) for (const m of c.big.matchAll(/\d+/g)) expect(have.has(Number(m[0])), `${e.id}: ${c.big}`).toBe(true);
      // A block about one fruit carries that fruit's icon and lane colour.
      for (const c of cardChips(e)) if (c.fruit) expect(html(Gazette, { event: e })).toContain(`cd-blk-f ln-${c.fruit}`);
    }
    // Price Controls prints each fruit's limit.
    const pc = EVENT_CARDS.find((e) => e.id === 'priceControls')!;
    expect(cardChips(pc).map((c) => [c.fruit, c.big])).toEqual(LANES.map((f) => [f, `$${pc.maxPrice![f]}`]));
  });

  it('a lorry card carries the pieces for every table size in the four lanes, and boxes the table\'s row', () => {
    for (const card of FARMER_CARDS) {
      const s = html(LorryCard, { card, stalls: 4 });
      expect(s).toContain('<span>Lorry</span><span>Pieces by stalls</span>');
      expect(s).toContain(`>${esc(card.name)}</strong>`);
      const cells = [...s.matchAll(/<span class="cd-ly-n ln-([a-z]+)([^"]*)">(\d+)<\/span>/g)];
      expect(cells).toHaveLength(5 * 4);
      cells.forEach((m, k) => {
        const n = (2 + Math.floor(k / 4)) as Stalls;
        const f = LANES[k % 4];
        expect(m[1]).toBe(f);
        expect(Number(m[3]), `${card.name} ${n} stalls ${f}`).toBe(card.table[n][f]);
        expect(m[2].includes(' on'), `${card.name} ${n}`).toBe(n === 4);
      });
      expect(s).toContain('<span class="cd-ly-l on">4</span>');
      expect(s).toContain('Mangoes arrive green');
      expect(s.includes('Other fruit arrives okay')).toBe(!!card.okay);
    }
    // A card that is not in a game boxes no row; a solo table uses the smallest row the card prints.
    expect(html(LorryCard, { card: FARMER_CARDS[0] })).not.toMatch(/cd-ly-[ln][^"]* on"/);
    expect(html(LorryCard, { card: FARMER_CARDS[0], stalls: 1 })).toContain('<span class="cd-ly-l on">2</span>');
  });

  it('a favour card shows its name, picture, when it is played, its text and the hand limit', () => {
    for (const id of FAV) {
      const d = FAVOURS[id];
      const s = html(FavourCard, { id });
      expect(s).toContain('<span>Favour</span><span>Keep secret</span>');
      expect(s).toContain(`>${d.title}</strong>`);
      expect(s).toContain(`<p class="cd-txt">${esc(d.text).replace(/'/g, '\'')}</p>`);
      expect(s).toContain(`src="${favourArt(id)}"`);
      expect(s).toContain({ evening: 'In the evening', buy: 'On your buying turn', tie: 'After the prices flip' }[d.when]);
      expect(s).toContain(`Hold up to ${FAVOUR_HAND_LIMIT}`);
    }
  });

  it('an upgrade card is labelled "Upgrade" and shows its name, picture, cost and text', () => {
    for (const id of UPS) {
      const d = UPGRADES[id];
      const s = html(UpgradeCard, { id });
      expect(s).toContain('<span>Upgrade</span><span>Build once</span>');
      expect(seen(s)).not.toMatch(/stall upgrade/i);
      expect(s).toContain(`>${d.title}</strong>`);
      expect(s).toContain(`<b>$${d.cost}</b><small>To build</small>`);
      expect(s).toContain(`<p class="cd-txt">${esc(d.text)}</p>`);
      expect(s).toContain(`src="${upgradeArt(id)}"`);
      expect(s).toContain('Room for two');
      // The figure in the black block is a number the card's own text states.
      const fig = UPGRADE_FIGURE[id].big.replace(/^\+/, '').replace(/ night$/, '');
      expect(d.text.replace('one night', '1 night'), id).toContain(fig);
    }
  });

  it('a standing order\'s card shows the client, the fruit and pieces, the highest bid and the stake', () => {
    for (const o of ORDER_CARDS) {
      const s = html(OrderCard, { card: o, qty: orderQty(4) });
      expect(s).toContain('<span>Standing order</span><span>Due in 2 days</span>');
      expect(s).toContain(`>${o.title}</strong>`);
      expect(s).toContain(esc(o.quirk));
      expect(s).toContain(`cd-want ln-${o.fruit}`);
      expect(s.match(/<span class="cd-dots"[^>]*>(.*?)<\/span>/)![1].match(/<i><\/i>/g)).toHaveLength(orderQty(4));
      expect(s).toContain(`<b>$${o.ceiling}</b><small>Highest bid, each</small>`);
      expect(s).toContain(`<b>$${o.stake}</b><small>Stake</small>`);
      expect(s).toContain('Deliver all 4 and the stake comes back');
      expect(s).not.toContain('<img class="x-art'); // design A's standing order has no picture; the bid's card shows the client
    }
    const won = html(OrderCard, { card: ORDER_CARDS[0], qty: 3, due: 'Due today', bid: 7, stake: 3 });
    expect(won).toContain('<span>Due today</span>');
    expect(won).toContain('<b>$7</b><small>Winning bid, each</small>');
    expect(won).toContain('<b>$3</b><small>Stake</small>');
    // The deck's own card says how many pieces each table size asks for.
    expect(html(OrderCard, { card: ORDER_CARDS[0] })).toContain('3 at 2–3 · 4 at 4 · 5 at 5–6 stalls');
  });

  it('the six pattern backs show the deck\'s tile, its name and how many cards it holds', () => {
    const count: Record<DeckId, string> = {
      lorry: `Deck of ${FARMER_CARDS.length}`, event: `Deck of ${EVENT_CARDS.length}`, favour: `Deck of ${FAVOUR_DECK.length}`,
      upgrade: `${UPS.length} kinds`, shopkeeper: `Deck of ${RIVALS.length}`, order: `Deck of ${ORDER_CARDS.length}`,
    };
    for (const d of DECKS) {
      const s = html(DeckBack, { deck: d });
      expect(s).toContain(`cd-bk cd-bk-${d}`);
      expect(s).toContain(`background-image:url(${tileArt(d)})`);
      expect(s).toContain('>Fruit Market<');
      expect(s).toContain(`>${count[d]}<`);
      expect(s).not.toContain('<img'); // a back shows no card's picture
    }
    const order: DeckId = 'order';
    const event: DeckId = 'event';
    expect(html(DeckBack, { deck: order })).toContain('>Standing order<');
    expect(html(EventBack, {})).toBe(html(DeckBack, { deck: event }));
  });
});

describe('titles fit their cards (cardType.ts)', () => {
  // Design A: 220 units wide, 31 on one line or 25 on two (a lorry: 21). The customer card: 228 wide, 26 or 21.
  const A: [string, string][] = [
    ...EVENT_CARDS.map((e): [string, string] => ['event', e.title]), ...RIVALS.map((r): [string, string] => ['shopkeeper', r.name]),
    ...FAV.map((id): [string, string] => ['favour', FAVOURS[id].title]), ...UPS.map((id): [string, string] => ['upgrade', UPGRADES[id].title]),
    ...ORDER_CARDS.map((o): [string, string] => ['order', o.title]),
  ];
  const NAMES = [...CUSTOMER_CARDS.map((c) => lookOf(c.name).title), ...GUESTS.map((g) => lookOf(g.name).title)];

  it('every title is set on one line as large as fits, or on two lines, never more', () => {
    for (const [kind, t] of A) {
      const f = fitTitle(t, 220, 31, 25);
      expect(f.lines, `${kind} ${t}`).toBeLessThanOrEqual(2);
      expect(f.size, `${kind} ${t}`).toBeGreaterThanOrEqual(f.lines === 1 ? 25 : 22);
      expect(f.size, `${kind} ${t}`).toBeLessThanOrEqual(31);
      expect(capsWidth(t) * f.size <= 220 || f.lines === 2, `${kind} ${t}`).toBe(true);
      expect(titleLines(t, f.size, 220), `${kind} ${t}`).toBe(f.lines);
    }
    for (const c of FARMER_CARDS) expect(titleLines(c.name, 21, 220), c.name).toBeLessThanOrEqual(2);
    for (const t of NAMES) {
      const f = fitTitle(t, 228, 26, 21);
      expect(f.lines, t).toBeLessThanOrEqual(2);
      expect(f.size, t).toBeGreaterThanOrEqual(21);
      expect(titleLines(t, f.size, 228), t).toBe(f.lines);
    }
  });

  it('short titles are large, long ones take two lines (the approved cards)', () => {
    expect(fitTitle('Heatwave', 220, 31, 25)).toEqual({ size: 31, lines: 1 });
    expect(fitTitle('Pak Din', 220, 31, 25)).toEqual({ size: 31, lines: 1 });
    expect(fitTitle('Juice Bar', 220, 31, 25)).toEqual({ size: 31, lines: 1 });
    expect(fitTitle('Favoured Trade', 220, 31, 25)).toEqual({ size: 25, lines: 2 });
    expect(fitTitle('The Pie Factory', 220, 31, 25)).toEqual({ size: 25, lines: 2 });
    expect(fitTitle('Firefighter Osman', 228, 26, 21)).toEqual({ size: 21, lines: 2 });
    expect(fitTitle('Professor Fatimah', 228, 26, 21).lines).toBe(2);
    expect(fitTitle('The Wedding Caterer', 228, 26, 21).lines).toBe(2);
    // A letter the width table does not know is counted as the widest, so the title can only come out smaller.
    expect(capsWidth('Ñ')).toBe(1);
  });
});

describe('the cards at phone size (phoneCards.tsx, ticket.tsx)', () => {
  it('a ticket in the row shows the number, the name, the picture, each fruit in lane order with today\'s price, and the legend', () => {
    CUSTOMER_CARDS.forEach((c, i) => {
      const s = html(Ticket, { who: c.name, lines: c.wants });
      expect(s).toContain(`<b>${two(i + 1)} </b>${lookOf(c.name).title}</header>`);
      expect(s).toContain(`src="${customerArt(c.name)}"`);
      const order = [...c.wants].sort((a, b) => LANES.indexOf(a.fruit) - LANES.indexOf(b.fruit));
      expect([...s.matchAll(/<div class="tkc-rw ln-([a-z]+)">/g)].map((m) => m[1]), c.name).toEqual(order.map((w) => w.fruit));
      for (const w of c.wants) expect(s).toContain(`<b>$${w.max}</b>`);
      expect(s.match(/class="tkc-lamp( off)?"/g)).toHaveLength(3);
      // Both ways of showing the amount are there; the stylesheet shows the dots when the ticket is wide enough.
      for (const w of order) expect(s).toContain(`${'<i></i>'.repeat(w.qty)}</span><em class="tkc-n">×${w.qty}</em>`);
    });
    for (const g of GUESTS) expect(html(Ticket, { who: g.name, lines: g.wants })).toContain(`<header class="tkc-hd">${lookOf(g.name).title}</header>`);
    // A standing order collected today stands in the row too: its client's picture, and a legend that is not a price key.
    for (const o of ORDER_CARDS) {
      const s = html(Ticket, { who: o.name, lines: [{ fruit: o.fruit, qty: 4, max: o.ceiling }], order: true });
      expect(s).toContain(`src="${customerArt(o.name)}"`);
      expect(s).toContain('aria-label="Takes Fresh or Okay fruit at its price"');
      expect(s).not.toContain('pays $');
    }
  });

  it('a ticket knows how wide it must be for its dots: more pieces and longer prices need more room', () => {
    const one = dotsNeed([{ qty: 1, max: 5 }]);
    const three = dotsNeed([{ qty: 3, max: 5 }]);
    const dear = dotsNeed([{ qty: 3, max: 13 }]);
    expect(one.roomy).toBeLessThan(three.roomy);
    expect(three.roomy).toBeLessThan(dear.roomy);
    expect(one.tight).toBeLessThan(one.roomy);
    // The approved screen: four tickets across a 390 px phone are 83.75 px inside their borders. Three dots and a
    // one-figure price fit; three dots and "$13" do not.
    expect(three.roomy).toBeLessThanOrEqual(83.75);
    expect(dear.roomy).toBeGreaterThan(83.75);
    expect(html(Ticket, { who: 'John', lines: CUSTOMER_CARDS[0].wants })).toMatch(/style="--nr:\d+;--nt:\d+"/);
  });

  it('a face-down ticket shows only which fruit is wanted, in four fixed squares', () => {
    for (const c of CUSTOMER_CARDS) {
      const fruits = c.wants.map((w) => w.fruit);
      const s = html(TicketBack, { fruits, label: 'Walk-in' });
      expect(seen(s)).not.toMatch(/\$|\d|premium|everyday|bargain/i);
      expect(seen(s)).not.toContain(lookOf(c.name).title);
      expect(s).not.toMatch(/art-ticket|\.svg"|\.webp/);
      const squares = [...s.matchAll(/<span class="(on)?">/g)];
      expect(squares).toHaveLength(4);
      squares.forEach((m, k) => expect(!!m[1], `${c.name} ${LANES[k]}`).toBe(fruits.includes(LANES[k])));
      expect(srcs(s)).toEqual(LANES.filter((f) => fruits.includes(f)).map((f) => fruitSvgUrl(f)));
    }
  });

  it('the morning\'s event card shows the picture, the title, what it changes and the text, and no tagline (DEC-087)', () => {
    EVENT_CARDS.forEach((e, i) => {
      const s = html(EventTicket, { card: e, n: i + 1, art: eventArt(e.id), focus: eventFocus(e.id), chips: newsChips(e) });
      expect(s).toContain(`<b>No ${two(i + 1)}</b>`);
      expect(s).toContain(`<b class="wc-ttl">${e.title}</b>`);
      expect(s).toContain(`<p class="wc-txt">${esc(e.text)}</p>`);
      expect(e.flavour, e.id).toBeUndefined();
      expect(s).not.toContain('wc-flavour');
      expect(s.match(/class="wc-chip"/g)).toHaveLength(newsChips(e).length);
      expect(s).toContain(`src="${eventArt(e.id)}"`);
      expect(s).toContain('Stays in force until night');
    });
    // A Calm Day is not a card of the deck: no number, no footer.
    const calm = html(EventTicket, { card: { id: 'calm', title: 'Calm Day', text: 'No event today.' }, art: CALM_ART, focus: eventFocus('calm'), chips: [] });
    expect(calm).not.toContain('No 0');
    expect(calm).not.toContain('Stays in force');
  });

  it('the morning\'s lorry card boxes the table\'s row, or a "Today" row when an event changed the load or the card is not known', () => {
    const card = FARMER_CARDS[0];
    const plain = html(LorryTicket, { card, stalls: 4, green: 'mango', ripeIn: 2 });
    expect(plain).toContain(`<b>Today</b> · ${card.name}`);
    expect(plain).toContain('<span class="wc-lt-l on">4 stalls</span>');
    expect(plain.match(/wc-lt-n [^"]* on"/g)).toHaveLength(4);
    expect(plain).not.toContain('>Today</span>');
    expect(plain).toContain('Mangoes arrive green · Ripe in 2 nights');
    const today = { blueberry: 9, watermelon: 4, mango: 2, apple: 0 };
    const changed = html(LorryTicket, { card, stalls: 4, today, green: 'mango', ripeIn: 2 });
    expect(changed).toContain('<span class="wc-lt-l mark">4 stalls</span>');
    expect(changed).toContain('<span class="wc-lt-l on">Today</span>');
    expect([...changed.matchAll(/wc-lt-n ln-([a-z]+) on[^"]*">(\d+)</g)].map((m) => [m[1], Number(m[2])])).toEqual(LANES.map((f) => [f, today[f]]));
    const unknown = html(LorryTicket, { card: null, stalls: 3, today, green: 'mango', ripeIn: 2 });
    expect(unknown).toContain('<b>Today</b></span>');
    expect(unknown).not.toContain('stalls</span>');
    expect(unknown.match(/wc-lt-n /g)).toHaveLength(4);
  });

  it('the bid\'s order card, the rush\'s customer card, the upgrade offers and the favour cards show the card\'s own data and picture', () => {
    const o = ORDER_CARDS[4];
    const order = html(OrderTicket, { card: o, qty: 4, due: 5, day: 3, ceiling: o.ceiling, stake: o.stake });
    expect(order).toContain('<b>Due in 2 days</b> · day 5');
    expect(order).toContain(`>${o.title}</b>`);
    expect(order).toContain(`src="${customerArt(o.name)}"`);
    expect(order).toContain('4 Apples · fresh or okay');
    expect(order).toContain(`<b>$${o.ceiling}</b><span>Highest bid, each</span>`);
    expect(order).toContain(`<b>$${o.stake}</b><span>Stake</span>`);

    const c = CUSTOMER_CARDS[23];
    const rush = html(CustomerWide, { who: c.name, lines: c.wants, now: 'apple' });
    expect(rush).toContain('<b>24</b> · Customer');
    expect(rush).toContain(`>${lookOf(c.name).title}</b>`);
    expect(rush).toContain('<div class="wc-rw ln-watermelon later">');
    expect(rush).toContain('<div class="wc-rw ln-apple">');
    expect(rush).toContain(`src="${customerArt(c.name)}"`);
    expect(html(CustomerWide, { who: o.name, order: true, lines: [{ fruit: o.fruit, qty: 4, max: 9 }] })).toContain('<span>Standing order</span><span>Due today</span>');

    for (const id of UPS) {
      const s = html(UpgradeOffer, { id, why: null, onBuild: () => undefined });
      expect(s).toContain('<span class="uo-kind">Upgrade</span>');
      expect(s).toContain(`>${UPGRADES[id].title}</b>`);
      expect(s).toContain(esc(UPGRADES[id].text));
      expect(s).toContain(`src="${upgradeArt(id)}"`);
      expect(s).toMatch(/<button type="button" class="uo-buy"[^>]*>Build \$\d+<\/button>/);
      expect(html(UpgradeOffer, { id, owned: true, onBuild: () => undefined })).not.toContain('<button');
      expect(html(UpgradeOffer, { id, why: 'Not enough cash', onBuild: () => undefined })).toContain('disabled');
    }
    for (const id of FAV) {
      const mini = html(FavourMini, { id, ready: true, onOpen: () => undefined });
      expect(mini).toMatch(/^<button type="button" class="fav ready"/);
      expect(mini).toContain(`src="${favourArt(id)}"`);
      expect(mini).toContain(`Play ${FAVOURS[id].title}`);
      expect(html(FavourMini, { id, onOpen: () => undefined })).not.toContain('fav-play');
      const chip = html(FavourChip, { id, onOpen: () => undefined });
      expect(chip).toMatch(/^<button type="button" class="favchip"/);
      expect(chip).toContain(`aria-label="Favour card: ${FAVOURS[id].title}"`);
      expect(chip).toContain(`src="${favourArt(id)}"`);
    }
  });
});

describe('the game is called Fruit Market', () => {
  it('no card, back or wordmark says "Exchange" or "Gazette" (the owner retired both names), and no card has an emoji', () => {
    const all = [
      html(Logo, { size: 120 }),
      ...CUSTOMER_CARDS.map((c) => html(TradingCard, { who: c.name, wants: c.wants })),
      ...GUESTS.map((g) => html(TradingCard, { who: g.name, wants: g.wants, guest: true })),
      html(TradingCardBack, { fruits: CUSTOMER_CARDS[0].wants.map((w) => w.fruit) }),
      ...RIVALS.map((r) => html(StallSign, { avatar: r.avatar })),
      ...EVENT_CARDS.map((e) => html(Gazette, { event: e })),
      ...FARMER_CARDS.map((c) => html(LorryCard, { card: c, stalls: 4 })),
      ...FAV.map((id) => html(FavourCard, { id })),
      ...UPS.map((id) => html(UpgradeCard, { id })),
      ...ORDER_CARDS.map((o) => html(OrderCard, { card: o, qty: 4 })),
      ...DECKS.map((d) => html(DeckBack, { deck: d })),
    ];
    for (const s of all) {
      expect(seen(s)).not.toMatch(/exchange|gazette/i);
      expect(seen(s)).not.toMatch(/\p{Extended_Pictographic}/u);
    }
    expect(html(Logo, { size: 120 })).toContain('>Fruit Market</b>');
  });
});
