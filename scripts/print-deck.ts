// The tabletop print kit (PLAN-087; rules version 19): every deck of cards in the approved card design, each with its
// back, plus the player aid and the character reference. The cards are the app's own (scripts/print-cards.ts draws them
// with src/ui/cards.tsx from the game data), so the printed cards and the app always show the same names, numbers and art.
//   npx vite-node scripts/print-deck.ts [outdir]     (normally: print/kit)
// Writes one PDF per part plus Fruit_Market_Print_Kit.pdf with everything. Needs Playwright's Chromium.
// Pictures are the app's (public/art-ticket, drawn as lines and shapes, so they print sharp at any size); the fonts are
// put into the page, so nothing comes from the web. The stall sheets, counters and guidebook are scripts/print-update.ts;
// the two freshness trackers on test are scripts/print-trackers.ts.
import { h } from 'preact';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import {
  BARROW_BUY, BARROW_SHELF, BASE_BUY, BASE_SHELF, CUSTOMER_CARDS, EVENT_CARDS, FARMER_CARDS, FAVOUR_DECK, JAM_PRICE, LAST_CALL_BONUS,
  MARKET_DAY_EVERY, MAX_STALLS, ORDER_CARDS, PREF_INFO, RIVALS, TOP_UP, UPGRADES,
  type Stage,
} from '../src/engine/data';
import { RULES_VERSION } from '../src/net/protocol';
import { toStaticHtml } from '../src/ui/cards';
import { FruitSvg } from '../src/ui/fruitIcons';
import {
  CARD_H, CARD_W, GUESTS, PER_SHEET, ROOT, UPGRADE_COPIES, deckProblems, doc, factoryPages, kitCss, plural, printDecks, sheets,
  type Page, type PrintDeck,
} from './print-cards';
import { renderPdf } from './print-render';

const OUT = resolve(process.argv[2] ?? join(ROOT, 'print', 'kit'));

// ---------- the data, checked before anything is drawn ----------

const DECKS = printDecks();
const deck = (key: PrintDeck['key']): PrintDeck => DECKS.find((d) => d.key === key)!;
/** Each deck holds exactly what the game's data holds: no number is typed here. */
const SIZES: [PrintDeck['key'], number][] = [
  ['customers', CUSTOMER_CARDS.length], ['guests', GUESTS.length], ['events', EVENT_CARDS.length], ['lorries', FARMER_CARDS.length],
  ['shopkeepers', RIVALS.length], ['favours', FAVOUR_DECK.length], ['upgrades', Object.keys(UPGRADES).length * UPGRADE_COPIES], ['orders', ORDER_CARDS.length],
];
for (const [key, want] of SIZES) {
  const got = deck(key).cards.length;
  if (got !== want) throw new Error(`${key}: the game has ${want} cards, the kit drew ${got}`);
}
const problems = DECKS.flatMap(deckProblems);
if (problems.length) throw new Error(`The kit cannot be printed:\n${problems.join('\n')}`);

const MARKET_DAYS = [1, 2, 3, 4].map((k) => k * MARKET_DAY_EVERY);

// ---------- small helpers ----------

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const two = (n: number) => String(n).padStart(2, '0');
const list = (xs: (string | number)[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

// ---------- styles of the A4 pages: reference, player aid, cover ----------

const A4_CSS = `
/* border-box keeps the padding inside the 210 x 297 mm page, so every PDF prints the cards at 100%. */
.pk-a4 { box-sizing: border-box; padding: 12mm 12mm 10mm; display: flex; flex-direction: column; gap: 4mm; font: 500 3.1mm/1.4 var(--f-label); }
.pk-a4 :where(header, section, div, p, table, ul, li, h1, h2, h3, h4) { box-sizing: border-box; }
.pk-a4 > * { flex: none; }
.pk-sec { display: flex; align-items: baseline; gap: 3mm; padding-bottom: 1.5mm; border-bottom: 1mm solid var(--x-ink); white-space: nowrap; }
.pk-sec h2 { margin: 0; font: 400 5.4mm/1 var(--f-display); text-transform: uppercase; color: var(--x-ink); }
.pk-sec em { font: 800 2.3mm/1 var(--f-label); font-style: normal; letter-spacing: 0.14em; text-transform: uppercase; color: var(--x-red-d); }
.pk-sec .pk-pageno { margin-left: auto; font: 600 2.3mm/1 var(--f-label); letter-spacing: 0.08em; color: var(--x-slate); }
/* the reference pages show whole cards, smaller: four across */
.pk-a4 > .pk-ref-grid { flex: 1 1 0; min-height: 0; display: grid; grid-template-columns: repeat(4, var(--card-w)); gap: 5mm 2mm; justify-content: center; align-content: start; --card-w: 45mm; }
.pk-legend { margin: auto 0 0; padding: 2.2mm 3mm; border: 0.5mm solid var(--x-ink); display: flex; gap: 5mm; justify-content: center; flex-wrap: wrap; font: 500 2.6mm/1.3 var(--f-label); }
.pk-legend b { font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
.pk-note { margin: 0; font: 500 2.8mm/1.3 var(--f-label); color: var(--x-slate); text-align: center; }

.pk-mast h1 { margin: 0; padding-bottom: 1.5mm; border-bottom: 1.2mm solid var(--x-ink); font: 400 12mm/1 var(--f-display); text-transform: uppercase; color: var(--x-ink); }
.pk-mast .ed { display: flex; justify-content: space-between; padding: 1.6mm 0 0; font: 800 2.5mm/1.2 var(--f-label); letter-spacing: 0.14em; text-transform: uppercase; }
.pk-aid { gap: 3.4mm; }
.pk-aid-head strong { font: 400 7mm/1 var(--f-display); text-transform: uppercase; color: var(--x-ink); }
.pk-beats { display: grid; grid-template-columns: 1fr 1fr; gap: 2.6mm 4mm; }
.pk-beat { position: relative; padding: 2.4mm 3mm 2.6mm 14mm; border: 0.5mm solid var(--x-ink); background: var(--x-paper); }
.pk-beat .num { position: absolute; left: 2.6mm; top: 2.6mm; width: 9mm; height: 9mm; display: grid; place-items: center; background: var(--x-mustard); font: 400 4.6mm/1 var(--f-display); color: var(--x-ink); }
.pk-beat h3 { margin: 0 0 1mm; font: 400 4.2mm/1.1 var(--f-display); text-transform: uppercase; color: var(--x-ink); }
.pk-beat p { margin: 0; font: 500 2.95mm/1.38 var(--f-label); }
.pk-beat.night { background: var(--x-kraft); }
.pk-crier { border: 0.6mm solid var(--x-ink); }
.pk-crier > header { display: flex; justify-content: space-between; align-items: baseline; padding: 2mm 3mm; background: var(--x-ink); color: var(--x-paper); }
.pk-crier > header b { font: 400 4.4mm/1 var(--f-display); text-transform: uppercase; }
.pk-crier > header span { font: 800 2.4mm/1.2 var(--f-label); letter-spacing: 0.12em; text-transform: uppercase; color: var(--x-mustard); }
.pk-crier > p { margin: 0; padding: 2.2mm 3mm; font: 500 2.95mm/1.38 var(--f-label); }
.pk-ladder { display: grid; grid-template-columns: 44mm 1fr auto; border-top: 0.4mm solid var(--x-ink); }
.pk-ladder > div { display: flex; align-items: center; gap: 1.5mm; padding: 1.8mm 3mm; border-bottom: 0.3mm solid var(--x-edge); }
.pk-ladder .lvl { font: 400 3.6mm/1 var(--f-display); color: var(--x-red-d); white-space: nowrap; }
.pk-ladder .what { font: 500 3mm/1.3 var(--f-label); }
.pk-ladder .what b { font: 800 3mm/1 var(--f-label); letter-spacing: 0.06em; text-transform: uppercase; }
.pk-ladder .ic img { width: 7mm; height: 7mm; }
.pk-ladder .ic { justify-content: flex-end; }
.pk-ladder .none { color: var(--x-slate); font: 800 2.7mm/1 var(--f-label); letter-spacing: 0.08em; text-transform: uppercase; }
.pk-boxes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; }
.pk-box { padding: 2.4mm 2.8mm; border: 0.5mm solid var(--x-ink); }
.pk-box h4 { margin: 0 0 1.2mm; font: 800 2.7mm/1.1 var(--f-label); letter-spacing: 0.12em; text-transform: uppercase; color: var(--x-red-d); }
.pk-box p { margin: 0; font: 500 2.9mm/1.38 var(--f-label); }
.pk-small { margin: auto 0 0; font: 600 2.3mm/1.3 var(--f-label); letter-spacing: 0.04em; color: var(--x-slate); text-align: center; }

.pk-cover { gap: 5mm; }
.pk-cover h1 { margin: 0; font: 400 15mm/0.95 var(--f-display); text-transform: uppercase; color: var(--x-ink); }
.pk-cover .lede { margin: 0; font: 500 3.5mm/1.45 var(--f-label); max-width: 170mm; }
.pk-toc { width: 100%; border-collapse: collapse; font: 500 2.9mm/1.3 var(--f-label); }
.pk-toc th { padding: 1.4mm 2mm; text-align: left; font: 800 2.4mm/1.2 var(--f-label); letter-spacing: 0.12em; text-transform: uppercase; color: var(--x-paper); background: var(--x-ink); }
.pk-toc td { padding: 1.3mm 2mm; border-bottom: 0.3mm solid var(--x-edge); vertical-align: top; }
.pk-toc td:first-child { font-weight: 800; white-space: nowrap; }
.pk-toc td:last-child { white-space: nowrap; text-align: right; }
.pk-cover .pk-boxes { grid-template-columns: 1fr 1fr; }
.pk-cover ul { margin: 0; padding-left: 4mm; font: 500 2.9mm/1.4 var(--f-label); }
`;

const CSS = kitCss(A4_CSS);

// ---------- reference pages: every character, whole cards at a smaller size ----------

const secHead = (title: string, kicker: string, pageNo: string) =>
  `<header class="pk-sec"><h2>${esc(title)}</h2><em>${esc(kicker)}</em><span class="pk-pageno">${esc(pageNo)}</span></header>`;
const legend = `<p class="pk-legend">${(['premium', 'everyday', 'bargain'] as const).map((p) =>
  `<span><b>${PREF_INFO[p].title} customer:</b> ${esc(PREF_INFO[p].text)}</span>`).join('')}</p>`;

function referencePages(): Page[] {
  const PER_PAGE = 12;
  const customers = deck('customers').cards;
  const customerPages = Math.ceil(customers.length / PER_PAGE);
  const total = 2 + customerPages;
  const grid = (cards: string[]) => `<div class="pk-ref-grid">${cards.join('')}</div>`;
  const pages: Page[] = [
    { html: `<section class="pg pk-a4">${secHead('Shopkeepers', `The ${RIVALS.length} shopkeepers and their perks`, `Reference 1 of ${total}`)}${grid(deck('shopkeepers').cards.map((c) => c.front))}</section>` },
    {
      html: `<section class="pg pk-a4">${secHead('Guests', 'Each comes with its event', `Reference 2 of ${total}`)}${grid(deck('guests').cards.map((c) => c.front))}`
        + `<p class="pk-note">A guest’s picture is its event’s picture, which shows the guest.</p></section>`,
    },
  ];
  for (let p = 0; p < customerPages; p++) {
    const from = p * PER_PAGE;
    const tiles = customers.slice(from, from + PER_PAGE);
    pages.push({
      html: `<section class="pg pk-a4">${secHead('Customers', `Numbers ${two(from + 1)} to ${two(from + tiles.length)}`, `Reference ${p + 3} of ${total}`)}`
        + `${grid(tiles.map((c) => c.front))}${legend}</section>`,
    });
  }
  return pages;
}

// ---------- player aid ----------

const fruitImg = (stage: Stage, alt: string) => toStaticHtml(h(FruitSvg, { id: 'apple', stage, size: 32, alt }));

function playerAid(): Page {
  const beat = (n: string, title: string, text: string, cls = '') =>
    `<div class="pk-beat ${cls}"><b class="num">${n}</b><h3>${esc(title)}</h3><p>${text}</p></div>`;
  const ic = (stages: Stage[]) => stages.map((s) => fruitImg(s, `${s === 'notso' ? 'Soft' : s === 'okay' ? 'Okay' : 'Fresh'} apple`)).join('');
  const beats = [
    beat('1', 'Morning', `Turn over today’s <b>event</b> and apply it (walk-in events add or remove walk-ins now). From Day 2, a stall with an empty shelf and less than $${TOP_UP} is topped up to $${TOP_UP}. The lorry unloads today’s card at the freshest spot (Green fruit at the Green spot, the Seconds Lorry at Okay). Draw tomorrow’s lorry, tomorrow’s regular (face up) and tomorrow’s walk-ins (face down). On a Market Day, bid for the standing order.`),
    beat('2', 'Buying', `The <b>poorest stall buys first, then the others go clockwise</b> (ties: first clockwise from the token; Day 1 starts at the token; Priority jumps the queue). Buy up to <b>${BASE_BUY}</b> pieces (${BARROW_BUY} with a Handcart), paying the cost for each fruit’s freshness. Your shelf holds ${BASE_SHELF} (${BARROW_SHELF} with a Handcart).`),
    beat('3', 'Stocking', 'Today’s walk-ins turn face up. Secretly move the pieces you will sell into your <b>crate</b>. Then say how many pieces are in it, not which fruit. Only pieces in your crate can sell.'),
    beat('4', 'The bell', 'Secretly set <b>one price per fruit</b> in your crate. Then everyone shows prices and crates together. No lower limit. A stall with a tied price may then play Favoured Trade.'),
    beat('5', 'The rush', 'A standing order collected today goes first, then the row left to right. Each fruit goes to the <b>cheapest stall</b> with fruit fresh enough for its price; what is still wanted goes to the next stall. Serve a customer’s whole remaining order by yourself and <b>draw a favour card</b> (one a day at most).'),
    beat('+', 'Evening & night', `Play evening favours (Priority, Gossip). On the evening after each Market Day (days ${list(MARKET_DAYS)}) build <b>one</b> stall upgrade. At night all fruit ages one step; spoiled fruit is thrown away.`, 'night'),
  ];
  const ladder = [
    ['Above the top', '<span class="none">Nothing sells</span> <span>(a Premium Display may go $1 over for fresh fruit, never for a guest)</span>', ''],
    ['The top', '<b>Fresh only</b>', ic(['fresh'])],
    ['Top − 1', '<b>Fresh or Okay</b>', ic(['fresh', 'okay'])],
    ['Top − 2 or less', '<b>Any fruit</b> (Fresh, Okay or Soft)', ic(['fresh', 'okay', 'notso'])],
  ].map(([lvl, what, icons]) => `<div class="lvl">${esc(lvl)}</div><div class="what">${what}</div><div class="ic">${icons}</div>`).join('');
  return {
    html: `<section class="pg pk-a4 pk-aid">`
      + `<div class="pk-mast"><h1>Fruit Market</h1><div class="ed"><span>Player aid</span><span>Rules version ${RULES_VERSION}</span></div></div>`
      + `<div class="pk-aid-head"><strong>A day in five steps</strong></div>`
      + `<div class="pk-beats">${beats.join('')}</div>`
      + `<section class="pk-crier"><header><b>The crier’s price rule</b><span>Read each customer line aloud</span></header>`
      + `<p>The crier (the player who bought last that morning) pays the stalls from the bank. For each customer line, say the real <b>top price</b> for the day: the card price plus any event, Closing Day or Fixed-prices change. Then which fruit qualifies at each price:</p>`
      + `<div class="pk-ladder">${ladder}</div>`
      + `<p>The <b>cheapest</b> posted price sells first, and each stall hands over its <b>oldest piece that still qualifies</b>. On a tie, the stall whose freshest handed-over piece is younger sells first.</p></section>`
      + `<div class="pk-boxes">`
      + `<div class="pk-box"><h4>Freshness types</h4><p><b>Premium:</b> ${esc(PREF_INFO.premium.short)}. <b>Everyday:</b> ${esc(PREF_INFO.everyday.short)}. <b>Bargain:</b> ${esc(PREF_INFO.bargain.short)}. A stall cannot sell fruit a customer will not take.</p></div>`
      + `<div class="pk-box"><h4>Ties at the bell</h4><p>Favoured Trade, then fresher fruit (the younger handed-over piece), then the Haggler, then whoever bought earlier today.</p></div>`
      + `<div class="pk-box"><h4>Market rhythm</h4><p><b>Market Days</b> (days ${list(MARKET_DAYS)}, never the last): a standing order in the morning and an upgrade that evening. <b>Closing Day:</b> customers pay $${LAST_CALL_BONUS} more; then the jam maker buys leftover ripe fruit at $${JAM_PRICE} each. Guests’ prices are fixed: only Closing Day adds to them.</p></div>`
      + `</div><p class="pk-small">Full rules: RULES.md. Every number on this page comes from the game data.</p></section>`,
  };
}

// ---------- the kit ----------

interface Part { file: string; title: string; what: string; pages: Page[] }

const parts: Part[] = [
  { file: 'Player_Aid.pdf', title: 'Player aid', what: 'A day in five steps and the crier’s price rule (one A4 page per player)', pages: [playerAid()] },
  { file: 'Character_Reference.pdf', title: 'Character reference', what: `The ${RIVALS.length} shopkeepers, ${GUESTS.length} guests and ${CUSTOMER_CARDS.length} customers, as whole cards at a smaller size`, pages: referencePages() },
  ...DECKS.map((d): Part => ({ file: `Cards_${d.file}_A4.pdf`, title: `${d.title}: cards`, what: `${d.what}. ${plural(Math.ceil(d.cards.length / PER_SHEET), 'sheet', 'sheets')}, double-sided`, pages: sheets(d) })),
  ...DECKS.map((d): Part => ({ file: `Factory_${d.file}_bleed.pdf`, title: `${d.title}: for a card printer`, what: 'One card to a page, 3 mm bleed and crop marks', pages: factoryPages(d) })),
];

function coverPage(): Page {
  let at = 2;
  const rows = parts.map((p) => {
    const from = at;
    at += p.pages.length;
    return `<tr><td>${esc(p.title)}</td><td>${esc(p.what)}</td><td>${p.pages.length === 1 ? `p. ${from}` : `pp. ${from}–${at - 1}`}</td></tr>`;
  }).join('');
  const cards = DECKS.reduce((a, d) => a + d.cards.length, 0);
  const sheetCount = DECKS.reduce((a, d) => a + Math.ceil(d.cards.length / PER_SHEET), 0);
  return {
    html: `<section class="pg pk-a4 pk-cover"><h1>Fruit Market<br>Print Kit</h1>`
      + `<p class="lede">Every card of the tabletop game, in the same design as the app: ${cards} cards in ${DECKS.length} decks, each with its back, for up to ${MAX_STALLS} stalls. Names, numbers and prices come from the game data (rules version ${RULES_VERSION}), so the cards match the app.</p>`
      + `<table class="pk-toc"><thead><tr><th>Part</th><th>What it is</th><th>Pages</th></tr></thead><tbody>${rows}</tbody></table>`
      + `<div class="pk-boxes"><div class="pk-box"><h4>Printing at home</h4><ul><li>A4 card (250 to 300 gsm), 100% or “actual size”, background graphics on.</li><li>Double-sided, flip on the long edge: each fronts page is followed by its backs, mirrored to line up. The ${cards} cards take ${sheetCount} sheets.</li><li>Cut on the dashed lines. Cards are ${CARD_W} × ${CARD_H} mm (poker size).</li><li>Each dot on a customer card is one piece that customer wants.</li></ul></div>`
      + `<div class="pk-box"><h4>Not in this file</h4><ul><li>The rules guidebook, the stall sheets and the counters with the cash track: the update pack (print/update-${RULES_VERSION}).</li><li>The two freshness trackers on test: print/tracker-test.</li><li>The market board, shutters, fruit pieces, price tags and markers: from the earlier printing.</li><li>Factory files are RGB; the printer converts to CMYK.</li></ul></div></div></section>`,
  };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), 'fruit-print-'));
  const browser = await chromium.launch();
  try {
    for (const p of parts) await renderPdf(browser, tmp, OUT, p.file, doc(`Fruit Market: ${p.title}`, p.pages, CSS));
    await renderPdf(browser, tmp, OUT, 'Fruit_Market_Print_Kit.pdf', doc('Fruit Market: Print Kit', [coverPage(), ...parts.flatMap((p) => p.pages)], CSS));
  } finally {
    await browser.close();
    rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
