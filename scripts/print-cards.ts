// The printed cards of the tabletop game (PLAN-087, rules version 18): every deck, drawn with the app's own card
// components (src/ui/cards.tsx, the approved designs) at 63 x 88 mm, each card with its back, and the sheet and factory
// layouts that scripts/print-deck.ts (the whole kit) and scripts/print-update.ts (the update pack) both print.
// Every card, count, name and number comes from the game's data (src/engine/data.ts); nothing is typed again here.
// This file only builds HTML, without a browser, so tests/print-kit.test.ts can check the kit against the data.
import { h } from 'preact';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  CUSTOMER_CARDS, EVENT_CARDS, FARMER_CARDS, FAVOUR_DECK, FAVOURS, FRUIT, MAX_STALLS, MIN_STALLS, ORDER_CARDS, RIVALS, TRAITS, UPGRADES, lookOf,
  type CustomerCard, type EventCard, type FavourId, type UpgradeId,
} from '../src/engine/data';
import { RULES_VERSION } from '../src/net/protocol';
import { LANES } from '../src/ui/boardModel';
import { DeckBack, FavourCard, Gazette, LorryCard, OrderCard, StallSign, TradingCard, TradingCardBack, UpgradeCard, toStaticHtml } from '../src/ui/cards';
import { customerArt, eventArt, favourArt, guestArt, shopScene, tileArt, upgradeArt, type DeckId } from '../src/ui/deckArt';
import { FruitSvg } from '../src/ui/fruitIcons';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UI = join(ROOT, 'src', 'ui');
const ART = join(ROOT, 'public', 'art-ticket');

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const two = (n: number) => String(n).padStart(2, '0');
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// ---------- the cards ----------

export type DeckKey = 'customers' | 'guests' | 'events' | 'lorries' | 'shopkeepers' | 'favours' | 'upgrades' | 'orders';
/** The back a card has: the customer's own (the fruit it wants), a guest's, or its deck's pattern (DEC-096). */
export type BackKind = 'customer' | 'guest' | DeckId;

export interface PrintCard {
  /** What the card is, by its key in the game's data ('customer:John', 'favour:gossip'). Copies of one card share it. */
  id: string;
  /** Which copy this is, from 1. */
  copy: number;
  /** How the card is named in a page margin and in error messages. */
  label: string;
  front: string;
  back: string;
  backKind: BackKind;
  /** The picture on the front (the app's URL for it), or null for a card that has none by design (lorries, standing orders). */
  art: string | null;
}

export interface PrintDeck {
  key: DeckKey;
  /** The deck's name on a sheet. */
  title: string;
  /** The deck's part of a file name: Cards_<file>_A4.pdf, Factory_<file>_bleed.pdf. */
  file: string;
  /** One line for the contents page. */
  what: string;
  /** How many copies of each card the game needs. */
  copies: number;
  cards: PrintCard[];
}

/** The guests, each with the event that brings it. */
export const GUESTS: { guest: CustomerCard; event: EventCard }[] = EVENT_CARDS.flatMap((e) => (e.extra ? [{ guest: e.extra, event: e }] : []));

/** Tiles across and down a back: a tile is 72 units (cards.css) and the back is 246 by 346 inside its border. */
const TILES = Math.ceil(246 / 72) * Math.ceil(346 / 72);

/**
 * A deck's pattern back: the app's DeckBack. On screen the tile is a repeating background; a PDF stores a repeating
 * background about forty times larger than the same tiles laid out as pictures, so in print the same file is laid in a
 * grid from the same corner (.pk-tiles), which gives the same pattern.
 */
function deckBack(deck: DeckId): string {
  const html = toStaticHtml(h(DeckBack, { deck }));
  const tile = tileArt(deck);
  const asBackground = ` style="background-image:url(${tile})"`;
  if (!html.includes(asBackground)) throw new Error(`${deck} back: the tile is not where the print kit expects it`);
  const grid = `<div class="pk-tiles" aria-hidden="true">${`<img src="${tile}" alt="">`.repeat(TILES)}</div>`;
  return html.replace(asBackground, '').replace(/^<article[^>]*>/, (open) => `${open}${grid}`);
}

/**
 * A guest's back. A guest is a customer, so it has the customer back's design (DEC-095), built from the same parts and
 * styles; but it is never dealt face down and never shuffled into the customer deck, so in place of "Walk-in" and the
 * line about stocking it names the event it comes with. tests/print-kit.test.ts holds it to the customer back's structure.
 */
function guestBack(guest: CustomerCard, event: EventCard): string {
  const wanted = LANES.filter((f) => guest.wants.some((w) => w.fruit === f));
  const said = `${lookOf(guest.name).title}, a guest of ${event.title}. Wants ${wanted.map((f) => FRUIT[f].name.toLowerCase()).join(', ')}`;
  return `<article class="cd cd-m cd-custback" role="img" aria-label="${esc(said)}">`
    + `<header class="cd-kind"><span>Guest</span><span><b>${esc(event.title)}</b></span></header>`
    + `<div class="cd-wants"><span class="cd-wants-h">Wants</span><div class="cd-sqs">`
    + LANES.map((f) => `<span class="cd-sq${wanted.includes(f) ? ' on' : ''}">${wanted.includes(f) ? toStaticHtml(h(FruitSvg, { id: f, size: 58, alt: '' })) : ''}</span>`).join('')
    + '</div></div><footer class="cd-foot">Comes with its event</footer></article>';
}

/** `n` copies of each card, kept together: gossip, gossip, free fruit, free fruit ... */
function copiesOf<T>(kinds: T[], n: (kind: T) => number, card: (kind: T, copy: number, of: number) => PrintCard): PrintCard[] {
  return kinds.flatMap((k) => Array.from({ length: n(k) }, (_, i) => card(k, i + 1, n(k))));
}
const ofN = (copy: number, of: number) => (of > 1 ? ` (${copy} of ${of})` : '');

function customerDeck(): PrintDeck {
  return {
    key: 'customers', title: 'Customers', file: 'Customers', copies: 1,
    what: `${CUSTOMER_CARDS.length} customer cards; each back shows the fruit that customer wants`,
    cards: CUSTOMER_CARDS.map((c, i) => ({
      id: `customer:${c.name}`, copy: 1, label: `Customer ${two(i + 1)} · ${lookOf(c.name).title}`,
      front: toStaticHtml(h(TradingCard, { who: c.name, wants: c.wants, eager: true })),
      back: toStaticHtml(h(TradingCardBack, { fruits: c.wants.map((w) => w.fruit) })),
      backKind: 'customer', art: customerArt(c.name),
    })),
  };
}

function guestDeck(): PrintDeck {
  return {
    key: 'guests', title: 'Guests', file: 'Guests', copies: 1,
    what: `${GUESTS.length} guest cards; each back names the event the guest comes with`,
    cards: GUESTS.map(({ guest, event }) => ({
      id: `guest:${guest.name}`, copy: 1, label: `Guest · ${lookOf(guest.name).title} (${event.title})`,
      front: toStaticHtml(h(TradingCard, { who: guest.name, wants: guest.wants, guest: true, eager: true })),
      back: guestBack(guest, event),
      backKind: 'guest', art: guestArt(guest.name),
    })),
  };
}

function eventDeck(): PrintDeck {
  return {
    key: 'events', title: 'Events', file: 'Events', copies: 1,
    what: `${EVENT_CARDS.length} event cards and their backs`,
    cards: EVENT_CARDS.map((e) => ({
      id: `event:${e.id}`, copy: 1, label: `Event · ${e.title}`,
      front: toStaticHtml(h(Gazette, { event: e, eager: true })), back: deckBack('event'), backKind: 'event', art: eventArt(e.id),
    })),
  };
}

function lorryDeck(): PrintDeck {
  return {
    key: 'lorries', title: 'Lorries', file: 'Lorries', copies: 1,
    what: `${FARMER_CARDS.length} lorry cards (all different), each with the pieces for ${MIN_STALLS} to ${MAX_STALLS} stalls, and their backs`,
    cards: FARMER_CARDS.map((c) => ({
      id: `lorry:${c.name}`, copy: 1, label: `Lorry · ${c.name}`,
      front: toStaticHtml(h(LorryCard, { card: c })), back: deckBack('lorry'), backKind: 'lorry', art: null,
    })),
  };
}

function shopkeeperDeck(): PrintDeck {
  return {
    key: 'shopkeepers', title: 'Shopkeepers', file: 'Shopkeepers', copies: 1,
    what: `${RIVALS.length} shopkeeper cards and their backs`,
    cards: RIVALS.map((r) => ({
      id: `shopkeeper:${r.avatar}`, copy: 1, label: `Shopkeeper · ${r.name}`,
      front: toStaticHtml(h(StallSign, { avatar: r.avatar, eager: true })), back: deckBack('shopkeeper'), backKind: 'shopkeeper', art: shopScene(r.avatar),
    })),
  };
}

function favourDeck(): PrintDeck {
  const kinds = [...new Set(FAVOUR_DECK)];
  const count = (id: FavourId) => FAVOUR_DECK.filter((x) => x === id).length;
  const copies = Math.max(...kinds.map(count));
  return {
    key: 'favours', title: 'Favours', file: 'Favours', copies,
    what: `${FAVOUR_DECK.length} favour cards (${copies} of each, at every table size) and their backs`,
    cards: copiesOf(kinds, count, (id, copy, of) => ({
      id: `favour:${id}`, copy, label: `Favour · ${FAVOURS[id].title}${ofN(copy, of)}`,
      front: toStaticHtml(h(FavourCard, { id, eager: true })), back: deckBack('favour'), backKind: 'favour', art: favourArt(id),
    })),
  };
}

/** Every stall may build each upgrade once, so the table needs one of each for every stall. */
export const UPGRADE_COPIES = MAX_STALLS;

function upgradeDeck(): PrintDeck {
  const kinds = Object.keys(UPGRADES) as UpgradeId[];
  return {
    key: 'upgrades', title: 'Upgrades', file: 'Upgrades', copies: UPGRADE_COPIES,
    what: `${kinds.length * UPGRADE_COPIES} upgrade cards (${kinds.length} kinds, ${UPGRADE_COPIES} of each: one for every stall) and their backs`,
    cards: copiesOf(kinds, () => UPGRADE_COPIES, (id, copy, of) => ({
      id: `upgrade:${id}`, copy, label: `Upgrade · ${UPGRADES[id].title}${ofN(copy, of)}`,
      front: toStaticHtml(h(UpgradeCard, { id, eager: true })), back: deckBack('upgrade'), backKind: 'upgrade', art: upgradeArt(id),
    })),
  };
}

function orderDeck(): PrintDeck {
  return {
    key: 'orders', title: 'Standing orders', file: 'Standing_Orders', copies: 1,
    what: `${ORDER_CARDS.length} standing-order cards and their backs`,
    cards: ORDER_CARDS.map((o) => ({
      id: `order:${o.name}`, copy: 1, label: `Standing order · ${o.title}`,
      front: toStaticHtml(h(OrderCard, { card: o })), back: deckBack('order'), backKind: 'order', art: null,
    })),
  };
}

/** Every deck of the printed game, in the order the kit prints them. Built afresh from the data on each call. */
export function printDecks(): PrintDeck[] {
  return [customerDeck(), guestDeck(), eventDeck(), lorryDeck(), shopkeeperDeck(), favourDeck(), upgradeDeck(), orderDeck()];
}
export function printDeck(key: DeckKey): PrintDeck {
  const d = printDecks().find((x) => x.key === key);
  if (!d) throw new Error(`no deck ${key}`);
  return d;
}

// ---------- for someone who holds the earlier printing ----------
// The earlier printing (the rules 15 cards, made outside this repository) carries the numbers of rules 17 (REP-100).
// What rules 18 changed on those cards is history, not game data, so each old value is written here once; every new
// value is read from the data. tests/print-kit.test.ts checks that each card named here is still in the game.

/** Decks the update pack replaces whole: every card changed, or the cards are held in secret and must share one back. */
export function replacedDecks(): { deck: PrintDeck; why: string }[] {
  const costs = Object.values(UPGRADES).map((u) => `${u.title} $${u.cost}`).join(', ');
  const perks = (['charmer', 'favourite', 'nestegg', 'earful'] as const).map((t) => TRAITS[t].title).join(', ');
  return [
    { deck: orderDeck(), why: 'Every card changed: the fine is now a stake.' },
    { deck: upgradeDeck(), why: `New costs and words: ${costs}.` },
    { deck: shopkeeperDeck(), why: `Four perks changed: ${perks}.` },
    { deck: favourDeck(), why: `${FAVOURS.favouredTrade.title} is now played after the prices flip. Favour cards are held in secret, so the whole deck needs one back. The deck is ${FAVOUR_DECK.length} cards at every table size.` },
  ];
}

export interface HandFix { deck: string; card: string; fix: string }

/** The cards of the earlier printing that need one number or one line changed by hand. */
export function handFixes(): HandFix[] {
  const customer = (key: string): HandFix => {
    const n = CUSTOMER_CARDS.findIndex((c) => c.name === key);
    const want = CUSTOMER_CARDS[n]?.wants.find((w) => w.fruit === 'blueberry');
    if (!want) throw new Error(`earlier printing: no blueberry customer ${key}`);
    return { deck: 'Customers', card: `No ${two(n + 1)} · ${lookOf(key).title}`, fix: `Blueberry price: $${want.max} (the card says $3).` };
  };
  const lorry = (name: string, printedAs: string, fix: (t: (typeof FARMER_CARDS)[number]['table']) => string): HandFix => {
    const card = FARMER_CARDS.find((c) => c.name === name);
    if (!card) throw new Error(`earlier printing: no lorry ${name}`);
    return { deck: 'Lorries', card: printedAs === name ? name : `${printedAs} (now called ${name})`, fix: fix(card.table) };
  };
  const glut = EVENT_CARDS.find((e) => e.id === 'glut');
  const off = glut?.costFruit?.blueberry;
  if (!glut || !off) throw new Error('earlier printing: Blueberry Glut no longer changes the market price');
  return [
    customer('Mei Ling'), customer('Kumar'), customer('Hafiz'),
    lorry('Berries and Melons', 'Summer Run', (t) => `Apples at 5 stalls: ${t[5].apple}. At 6 stalls: ${t[6].apple} (the card says 1 and 1).`),
    lorry('Short Load', 'Short Load', (t) => `Watermelons at 3 stalls: ${t[3].watermelon} (the card says 1).`),
    { deck: 'Events', card: glut.title, fix: `Add: blueberries cost $${-off} less at the Wholesale Market that day (never below $1).` },
  ];
}

// ---------- pictures ----------

/** The file behind one of the app's picture URLs (…/art-ticket/customers/john.svg is public/art-ticket/customers/john.svg). */
export function artFile(url: string): string {
  const at = url.lastIndexOf('art-ticket/');
  if (at < 0) throw new Error(`not a card picture: ${url}`);
  return join(ART, url.slice(at + 'art-ticket/'.length));
}

/** The back tile of a deck with a pattern back; nothing for the customer and guest backs, which have no picture. */
export const backArt = (kind: BackKind): string | null => (kind === 'customer' || kind === 'guest' ? null : tileArt(kind));

/** What stops a deck from printing: a front without its picture, a picture or a back tile that is not on disk, a card without a back. */
export function deckProblems(deck: PrintDeck): string[] {
  const out: string[] = [];
  const needsArt = deck.key !== 'lorries' && deck.key !== 'orders';
  for (const c of deck.cards) {
    if (needsArt && !c.art) out.push(`${c.label}: no picture`);
    if (c.art && !existsSync(artFile(c.art))) out.push(`${c.label}: picture file missing (${artFile(c.art)})`);
    if (c.art && !c.front.includes(c.art)) out.push(`${c.label}: the front does not show its picture`);
    if (c.front.includes('x-art-missing')) out.push(`${c.label}: the front shows "Art coming"`);
    if (!c.back) out.push(`${c.label}: no back`);
    const tile = backArt(c.backKind);
    if (tile && !existsSync(artFile(tile))) out.push(`${c.label}: back tile missing (${artFile(tile)})`);
    if (tile && !c.back.includes(tile)) out.push(`${c.label}: the back does not show its deck's tile`);
  }
  return out;
}

/** Point the app's picture URLs at the files on disk, and load every picture straight away. */
export const forPrint = (html: string): string => html
  .replace(/(src="|url\()([^"()]*?art-ticket\/[\w-]+\/[\w-]+\.(?:svg|webp))/g, (_m, pre: string, url: string) => `${pre}${pathToFileURL(artFile(url)).href}`)
  .replace(/loading="lazy"/g, 'loading="eager"');

// ---------- styles ----------

const read = (f: string) => readFileSync(f, 'utf8');
const inlineFonts = (css: string) => css.replace(/url\('([^']+\.woff2)'\)/g, (_m, rel: string) =>
  `url(data:font/woff2;base64,${readFileSync(resolve(UI, rel)).toString('base64')})`);

/** The card's own length unit on paper: a card is 252 units wide (cards.css), 63 mm in print. */
export const CARD_W = 63;
export const CARD_H = 88;

/** Pages, card sheets and factory pages. The cards themselves are styled by the app's cards.css. */
const SHEET_CSS = `
@page { size: A4; margin: 0; }
@page factory { size: 85mm 110mm; margin: 0; }
html, body { margin: 0; padding: 0; background: white; }
body { color: var(--x-ink); font-family: var(--f-label); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.pg { position: relative; width: 210mm; height: 297mm; overflow: hidden; break-after: page; --card-w: ${CARD_W}mm; }
.pg:last-child { break-after: auto; }
.pg-factory { page: factory; width: 85mm; height: 110mm; }

/* ---- home sheets: 9 cards edge to edge, cut lines ---- */
.pk-head, .pk-foot-note { position: absolute; left: 10.5mm; right: 10.5mm; display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; font: 600 2.4mm/1.2 var(--f-label); letter-spacing: 0.04em; color: var(--x-slate); white-space: nowrap; }
.pk-head { top: 4.6mm; }
.pk-head b { font: 400 3.6mm/1 var(--f-display); letter-spacing: 0; color: var(--x-ink); text-transform: uppercase; }
.pk-head em { margin-left: 2mm; font: 800 2.3mm/1 var(--f-label); font-style: normal; letter-spacing: 0.14em; text-transform: uppercase; color: var(--x-red-d); }
.pk-foot-note { bottom: 4.6mm; }
.pk-grid { position: absolute; left: 10.5mm; top: 16.5mm; display: grid; grid-template-columns: repeat(3, ${CARD_W}mm); grid-auto-rows: ${CARD_H}mm; }
.pk-slot { width: ${CARD_W}mm; height: ${CARD_H}mm; background: var(--x-ink); }
.pk-slot.is-empty { background: transparent; }
/* A card whose words need more room than the app's card allows lets its picture give way a little further (the app's
   smallest picture is 76 units). Only a card that would otherwise push its footer off the card is changed by this:
   scripts/print-deck.ts names each one when it runs. */
.pg .cd-pic { min-height: calc(var(--u) * 62); }
/* a pattern back's tiles, laid from the corner the app's repeating background starts at (see deckBack) */
.pk-tiles { position: absolute; inset: 0; overflow: hidden; display: grid; grid-template-columns: repeat(4, calc(var(--u) * 72)); grid-auto-rows: calc(var(--u) * 72); }
.pk-tiles img { display: block; width: 100%; height: 100%; }
.pk-cuts, .pk-marks { position: absolute; left: 0; top: 0; pointer-events: none; }
.pk-cuts line { stroke: var(--x-slate); stroke-width: 0.22; stroke-dasharray: 1.6 1.1; }

/* ---- factory: one card, 3 mm bleed in the card's own border colour, crop marks ---- */
.pk-bleed { position: absolute; left: 8mm; top: 8mm; width: 69mm; height: 94mm; background: var(--x-ink); }
.pk-bleed > * { position: absolute; left: 3mm; top: 3mm; }
.pk-marks line { stroke: var(--x-ink); stroke-width: 0.2; }
.pk-slug { position: absolute; left: 12mm; right: 12mm; margin: 0; font: 600 1.9mm/1 var(--f-label); letter-spacing: 0.04em; color: var(--x-slate); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pk-slug.t { top: 3.2mm; }
.pk-slug.b { bottom: 3.2mm; }
`;

/** The stylesheet of a card document: the app's colours and card styles, the kit's fonts (inlined), the sheet layouts, then `extra`. */
export function kitCss(extra = ''): string {
  return [read(join(UI, 'palette.css')), read(join(UI, 'exchange.css')), inlineFonts(read(join(UI, 'print-fonts.css'))), read(join(UI, 'cards.css')), SHEET_CSS, extra].join('\n');
}

// ---------- pages ----------

export interface Page { html: string; factory?: boolean }

/** A whole HTML document of pages, ready for the browser. */
export const doc = (title: string, pages: Page[], css: string): string =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>${forPrint(pages.map((p) => p.html).join('\n'))}</body></html>`;

// Home sheets: A4, three cards across and three down, edge to edge, the grid centred on the page both ways so that a
// sheet turned over on its long edge puts each back behind its own front.
export const PER_SHEET = 9;
const ACROSS = 3;
const GX = (210 - ACROSS * CARD_W) / 2;
const GY = (297 - (PER_SHEET / ACROSS) * CARD_H) / 2;

function cutLines(rows: number): string {
  const yb = GY + rows * CARD_H;
  const v = Array.from({ length: ACROSS + 1 }, (_, c) => GX + c * CARD_W).map((x) => `<line x1="${x}" y1="${GY - 6}" x2="${x}" y2="${yb + 6}"/>`);
  const hz = Array.from({ length: rows + 1 }, (_, r) => GY + r * CARD_H).map((y) => `<line x1="${GX - 6}" y1="${y}" x2="${GX + ACROSS * CARD_W + 6}" y2="${y}"/>`);
  return `<svg class="pk-cuts" width="210mm" height="297mm" viewBox="0 0 210 297" aria-hidden="true">${v.join('')}${hz.join('')}</svg>`;
}

type Side = 'front' | 'back';
const slotId = (c: PrintCard) => `${c.id}#${c.copy}`;

function sheetPage(deck: string, side: Side, of: string, cells: (PrintCard | null)[], rows: number, foot: string): Page {
  const slots = cells.map((c) => (c ? `<div class="pk-slot" data-card="${esc(slotId(c))}" data-side="${side}">${c[side]}</div>` : '<div class="pk-slot is-empty"></div>')).join('');
  return {
    html: `<section class="pg pk-sheet"><header class="pk-head"><span><b>${esc(deck)}</b><em>${side === 'front' ? 'Fronts' : 'Backs'} · ${esc(of)}</em></span><span>Print at 100% (actual size) on A4 card · double-sided, flip on the long edge</span></header>`
      + `<div class="pk-grid">${slots}</div>${cutLines(rows)}<footer class="pk-foot-note"><span>${esc(foot)}</span><span>Fruit Market · rules version ${RULES_VERSION} · ${CARD_W} × ${CARD_H} mm</span></footer></section>`,
  };
}

/** Where a card's back sits on the backs page: the same row, mirrored left to right. */
export const mirrored = (i: number): number => Math.floor(i / ACROSS) * ACROSS + (ACROSS - 1 - (i % ACROSS));

/** A deck as home sheets: fronts in sheets of nine, each followed by its backs, mirrored so they line up when the sheet is turned over. */
export function sheets(deck: PrintDeck): Page[] {
  const pages: Page[] = [];
  const n = Math.ceil(deck.cards.length / PER_SHEET);
  for (let s = 0; s < n; s++) {
    const cards = deck.cards.slice(s * PER_SHEET, (s + 1) * PER_SHEET);
    const rows = Math.ceil(cards.length / ACROSS);
    const front: (PrintCard | null)[] = Array.from({ length: rows * ACROSS }, (_, i) => cards[i] ?? null);
    const back: (PrintCard | null)[] = Array.from({ length: rows * ACROSS }, (_, i) => cards[mirrored(i)] ?? null);
    const of = `sheet ${s + 1} of ${n} (${plural(cards.length, 'card', 'cards')})`;
    pages.push(sheetPage(deck.title, 'front', of, front, rows, 'Cut on the dashed lines. The backs are on the next page.'));
    pages.push(sheetPage(deck.title, 'back', of, back, rows, 'Backs, mirrored left to right to line up with the fronts on the page before.'));
  }
  return pages;
}

// Factory pages: one card to a page with 3 mm of bleed and crop marks.

function cropMarks(): string {
  const [l, r, t, b] = [11, 11 + CARD_W, 11, 11 + CARD_H];
  const m = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  const marks = [
    ...[l, r].flatMap((x) => [m(x, 0.5, x, 7.2), m(x, 102.8, x, 109.5)]),
    ...[t, b].flatMap((y) => [m(0.5, y, 7.2, y), m(77.8, y, 84.5, y)]),
  ];
  return `<svg class="pk-marks" width="85mm" height="110mm" viewBox="0 0 85 110" aria-hidden="true">${marks.join('')}</svg>`;
}

const factoryPage = (c: PrintCard, side: Side, slug: string): Page => ({
  factory: true,
  html: `<section class="pg pg-factory"><p class="pk-slug t">Rules version ${RULES_VERSION} · trim ${CARD_W} × ${CARD_H} mm · bleed 3 mm · RGB</p>`
    + `<div class="pk-bleed" data-card="${esc(slotId(c))}" data-side="${side}">${c[side]}</div>${cropMarks()}<p class="pk-slug b">${esc(slug)}</p></section>`,
});

/**
 * A deck for a card printer. Each different front once, with how many to print. A deck whose cards share one back has
 * that back once, at the end; a deck whose backs differ (customers, guests) goes front, back, front, back.
 */
export function factoryPages(deck: PrintDeck): Page[] {
  const firsts = deck.cards.filter((c) => c.copy === 1);
  const count = (c: PrintCard) => deck.cards.filter((x) => x.id === c.id).length;
  const slug = (c: PrintCard, side: string) => `${c.label.replace(/ \(1 of \d+\)$/, '')} · ${side}${count(c) > 1 ? ` · print ${count(c)}` : ''}`;
  const oneBack = new Set(deck.cards.map((c) => c.back)).size === 1;
  if (oneBack) return [...firsts.map((c) => factoryPage(c, 'front', slug(c, 'front'))), factoryPage(firsts[0], 'back', `${deck.title} · back (all ${deck.cards.length})`)];
  return firsts.flatMap((c) => [factoryPage(c, 'front', slug(c, 'front')), factoryPage(c, 'back', slug(c, 'back'))]);
}
