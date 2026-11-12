// The tabletop update pack (PLAN-077; rules version 18 and the new card design, PLAN-087): what someone who holds the
// earlier printing needs to play by the current rules, without printing the whole kit again.
//   npx vite-node scripts/print-update.ts [outdir]      (normally: print/update-<rules version>)
// Writes three PDFs:
//   the rules guidebook, whole, at the current rules version;
//   the boards update: a change sheet (what is in the pack, which decks are replaced, which cards to correct by hand,
//     the rule changes, patches for the board), six stall sheets and six counters with the cash track;
//   the replacement cards: the decks that changed throughout, whole, in the approved card design with their backs
//     (the same cards as the print kit, scripts/print-cards.ts).
// Names, numbers and prices come from the game data (src/engine/data.ts). The earlier printing itself (the rules 15
// cards and board) was made outside the repo; what changed since is listed in scripts/print-cards.ts.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import {
  BARROW_SHELF, BASE_BUY, BASE_SHELF, BIG_TABLE, CHARACTER_TRAIT, CHARMER_DAILY_FAVOURS, CHARMER_START_FAVOURS, CUSTOMER_CARDS, EVENT_CARDS, FARMER_CARDS, FAVOUR_DECK,
  FAVOUR_HAND_LIMIT, FAVOURS, FRUIT, GENEROUS_BONUS, JAM_PRICE, JUICE_TIP, LAST_CALL_BONUS, MARKET_DAY_EVERY, MAX_STALLS, MAX_UPGRADES, MIN_STALLS,
  NEST_EGG_BONUS, ORDER_BOOK_BONUS, ORDER_CARDS, ORDER_LEAD, RIVALS, ROW_CAP, START_CASH, STREET_PRICE, TOP_UP, TRAITS, UPGRADES, deliveredGreen,
  orderQty, stageAt, stakeFor,
  type FruitId, type Stage,
} from '../src/engine/data';
import { RULES_VERSION } from '../src/net/protocol';
import { fruitSvgString } from '../src/ui/fruitIcons';
import { GUESTS, PER_SHEET, ROOT, UPGRADE_COPIES, doc, handFixes, kitCss, plural, replacedDecks, sheets } from './print-cards';
import { renderPdf } from './print-render';

const OUT = resolve(process.argv[2] ?? join(ROOT, 'print', `update-${RULES_VERSION}`));
const FONT = (pkg: string, file: string) => pathToFileURL(join(ROOT, 'node_modules', '@fontsource', pkg, 'files', file)).href;

const INK = '#1f272a', PAPER = '#fffcf5', KRAFT = '#ddd4c6', YEL = '#fec400', SLATE = '#5a6266';
const LANE: Record<FruitId, string> = { blueberry: '#3558a2', watermelon: '#0e9a58', mango: '#fec400', apple: '#e73c35' };
const LANES: FruitId[] = ['blueberry', 'watermelon', 'mango', 'apple'];
const LETTER: Record<Stage, string> = { unripe: 'G', fresh: 'F', okay: 'O', notso: 'S' };
const WORD: Record<Stage, string> = { unripe: 'Green', fresh: 'Fresh', okay: 'Okay', notso: 'Soft' };
const PATTERNS = ['stripes', 'dots', 'checks', 'zigzag', 'bars', 'diamonds'] as const;
/** Green boxes at the fresh end of a lane: a fruit a lorry brings green has as many as it needs nights to ripen (only the mango). */
const GREEN = Object.fromEntries(LANES.map((f) => [f, deliveredGreen(f) ? FRUIT[f].unripeSlots : 0])) as Record<FruitId, number>;
/** What Okay and Soft fruit sell for under the customer's price: the same for every fruit (data.ts FRUIT.drop, oldest first). */
const [SOFT_LESS, OKAY_LESS] = FRUIT.apple.drop;
const list = (xs: (string | number)[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
/** The Market Days of the longest game, as words: "3, 6, 9 and 12". */
const MARKET_DAYS = list([1, 2, 3, 4].map((k) => k * MARKET_DAY_EVERY));
/** "3 pieces at 2 or 3 stalls, 4 at 4 stalls, 5 at 5 or 6 stalls": what a standing order wants at each table size. */
const ORDER_SIZES = (() => {
  const by = new Map<number, number[]>();
  for (let n = MIN_STALLS; n <= MAX_STALLS; n++) by.set(orderQty(n), [...(by.get(orderQty(n)) ?? []), n]);
  return [...by].map(([q, ns], i) => `${q}${i === 0 ? ' pieces' : ''} at ${ns.join(' or ')} stalls`).join(', ');
})();
/** The customers who pay more under Fixed prices: any fruit on the card pays at least the bonus over its fixed price. */
const GENEROUS = CUSTOMER_CARDS.flatMap((c, i) => (c.wants.some((w) => w.max >= STREET_PRICE[w.fruit] + GENEROUS_BONUS) ? [i + 1] : []));
const HAWKER = EVENT_CARDS.find((e) => e.hawker)?.hawker;
const BLUEBERRY_BARGAIN = CUSTOMER_CARDS.find((c) => c.name === 'Hafiz')?.wants[0].max;
const FAVOUR_COPIES = FAVOUR_DECK.length / new Set(FAVOUR_DECK).size;
if (HAWKER === undefined || BLUEBERRY_BARGAIN === undefined) throw new Error('The guidebook needs the night hawker\'s price and the Bargain blueberry price from the game data');
/** The fonts of the boards (BASE_CSS). */
const BOARD_FONTS = ['500 10px Archivo', '600 10px Archivo', '800 10px Archivo', '400 10px "Archivo Black"'];
/** A lane's boxes, oldest on the left: the ripe stages, then any green boxes. */
const boxes = (f: FruitId): Stage[] => [...FRUIT[f].ripe.map((_, pos) => stageAt(f, pos)), ...Array.from({ length: GREEN[f] }, () => 'unripe' as Stage)];
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fruit = (f: FruitId, mm: number, stage: Stage = 'fresh') => `<span class="fr" style="width:${mm}mm;height:${mm}mm">${fruitSvgString(f, stage, 32)}</span>`;
const lamp = (st: Stage) => `<i class="lamp">${LETTER[st]}</i>`;

const BASE_CSS = `
@font-face { font-family: 'Archivo'; font-weight: 500; src: url('${FONT('archivo', 'archivo-latin-500-normal.woff2')}') format('woff2'); }
@font-face { font-family: 'Archivo'; font-weight: 600; src: url('${FONT('archivo', 'archivo-latin-600-normal.woff2')}') format('woff2'); }
@font-face { font-family: 'Archivo'; font-weight: 800; src: url('${FONT('archivo', 'archivo-latin-800-normal.woff2')}') format('woff2'); }
@font-face { font-family: 'Archivo'; font-weight: 400; font-style: italic; src: url('${FONT('archivo', 'archivo-latin-400-italic.woff2')}') format('woff2'); }
@font-face { font-family: 'Archivo Black'; font-weight: 400; src: url('${FONT('archivo-black', 'archivo-black-latin-400-normal.woff2')}') format('woff2'); }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; padding: 0; }
body { font: 500 9.5pt/1.4 'Archivo', sans-serif; color: ${INK}; background: #fff; }
.disp { font-family: 'Archivo Black', sans-serif; font-weight: 400; text-transform: uppercase; }
.lab { font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; font-size: 7pt; }
.fr { display: inline-block; vertical-align: middle; } .fr svg { width: 100%; height: 100%; display: block; }
.lamp { display: inline-grid; place-items: center; width: 4.4mm; height: 4.4mm; border-radius: 50%; background: ${INK}; color: ${PAPER}; font: 800 6.5pt/1 'Archivo', sans-serif; font-style: normal; vertical-align: middle; }
.foot { position: absolute; left: 8mm; right: 8mm; bottom: 4mm; font-weight: 800; font-size: 6pt; letter-spacing: 0.12em; text-transform: uppercase; color: ${SLATE}; text-align: center; }
.sw { display: inline-block; width: 12mm; height: 12mm; background-color: ${PAPER}; box-shadow: inset 0 0 0 0.5mm ${INK}; vertical-align: middle; }
.pat-stripes { background-image: repeating-linear-gradient(90deg, ${INK} 0 2mm, ${PAPER} 0 4mm); }
.pat-bars { background-image: repeating-linear-gradient(0deg, ${INK} 0 2mm, ${PAPER} 0 4mm); }
.pat-dots { background-image: radial-gradient(circle, ${INK} 0 32%, transparent 34%); background-size: 4mm 4mm; }
.pat-checks { background-image: repeating-conic-gradient(${INK} 0 25%, ${PAPER} 0 50%); background-size: 8mm 8mm; }
.pat-diamonds { background-image: linear-gradient(45deg, ${INK} 25%, transparent 25% 75%, ${INK} 75%), linear-gradient(45deg, ${INK} 25%, transparent 25% 75%, ${INK} 75%); background-size: 4mm 4mm; background-position: 0 0, 2mm 2mm; }
.pat-zigzag { background-image: linear-gradient(135deg, ${INK} 25%, transparent 25%), linear-gradient(225deg, ${INK} 25%, transparent 25%), linear-gradient(315deg, ${INK} 25%, transparent 25%), linear-gradient(45deg, ${INK} 25%, transparent 25%); background-size: 4mm 4mm; background-position: -2mm 0, -2mm 0, 0 0, 0 0; }
`;

// ---------- the boards update: change sheet, stall sheets, counters ----------

const BOX = 17; // mm: a 15 mm fruit tile with room to pick it up

function stallSheet(i: number): string {
  const pat = PATTERNS[i];
  const lane = (f: FruitId) => `
    <div class="lane" style="--c:${LANE[f]}">
      <div class="lane-head"><span>${fruit(f, 7)} <b class="disp">${esc(FRUIT[f].name)}</b></span><span class="lab">${FRUIT[f].ripe.length + GREEN[f]} days${GREEN[f] ? ' · arrives green' : ''}</span></div>
      <div class="lane-body">
        <div class="cols">${boxes(f).map((st) => `
          <div class="col">
            <span class="lab">${lamp(st)} ${WORD[st]}</span>
            ${st === 'unripe' ? '<div class="cell no"><span class="lab">Not ripe:<br>cannot sell</span></div>' : '<div class="cell crate"><span class="lab">Crate</span></div>'}
            <div class="cell shelf"><span class="lab">Shelf</span></div>
          </div>`).join('')}
        </div>
        <div class="tag"><span class="lab">Price tag</span><small>Behind the shutter until the bell</small></div>
      </div>
    </div>`;
  return `<section class="page stall">
    <header class="bar"><b class="disp">Stall</b><span class="lab">${pat}</span><i class="sw pat-${pat}"></i></header>
    <p class="rule"><b>Top row = your crate:</b> on sale today, secret until the bell. <b>Bottom row = your shelf:</b> kept back. ${BASE_SHELF} pieces in all (${BARROW_SHELF} with a Handcart).</p>
    ${LANES.map(lane).join('')}
    <div class="key">
      <span><b class="lab">What it sells for</b></span>
      <span>${lamp('fresh')} Fresh: the customer's price</span><span>${lamp('okay')} Okay: $${OKAY_LESS} less</span><span>${lamp('notso')} Soft: $${SOFT_LESS} less</span><span>${lamp('unripe')} Green: cannot be sold</span>
    </div>
    <p class="cashnote"><b class="lab">Your cash is not here.</b> Cash is public: the cash track is on your counter, in front of the shutter.</p>
    <div class="foot">Fruit Market · update pack · rules version ${RULES_VERSION} · stall sheet ${i + 1} of 6 · ${pat} · print at 100% (actual size) on A4</div>
  </section>`;
}

function counter(i: number): string {
  const pat = PATTERNS[i];
  const cell = (n: number, start: boolean) => `<span class="cc${start ? ' start' : ''}">${n}</span>`;
  const row = (f: FruitId) => `
    <div class="crow" style="--c:${LANE[f]}">
      <span class="cf">${fruit(f, 9)}</span>
      ${boxes(f).filter((st) => st !== 'unripe').map((st) => `<div class="cell"><span class="lab">${lamp(st)}</span></div>`).join('')}
      <div class="tag"><span class="lab">Price tag</span><small>Face up at the bell</small></div>
    </div>`;
  return `<div class="counter">
    <header class="bar"><b class="disp">Counter</b><span class="lab">${pat} · in front of your shutter</span><i class="sw pat-${pat}"></i></header>
    <div class="cbody">
      <div class="crates">
        <p class="rule"><b>Empty until the bell.</b> Then your crate comes out here, for everyone to see. Before the bell, say only how many pieces are in your crate.</p>
        ${LANES.map(row).join('')}
        <p class="steps"><b>At the bell:</b> flip your price tags onto their fruit here, then bring your crate pieces out, each into the box with the same letter and place. <b>After the rush:</b> unsold pieces go back behind the shutter; wipe your tags.</p>
      </div>
      <div class="cash">
        <div class="cash-head"><b class="disp">Cash</b><span class="lab">Public</span></div>
        <span class="lab">Tens marker</span>
        <div class="grid tens">${Array.from({ length: 20 }, (_, k) => cell(k * 10, k === Math.floor(START_CASH / 10))).join('')}</div>
        <span class="lab">+ Ones marker</span>
        <div class="grid ones">${Array.from({ length: 10 }, (_, k) => cell(k, k === START_CASH % 10)).join('')}</div>
        <small>Yellow = where you start: $${START_CASH}. Past $199, take a +$200 chip. Everyone may read your cash at any time. Move your own markers while the table watches.</small>
      </div>
    </div>
  </div>`;
}

const BOARDS_CSS = `
@page { size: A4 portrait; margin: 0; }
@page land { size: A4 landscape; margin: 0; }
.page { position: relative; width: 210mm; height: 297mm; padding: 8mm; page-break-after: always; overflow: hidden; }
.page.land { page: land; width: 297mm; height: 210mm; display: grid; place-items: center; }
.bar { display: flex; align-items: center; gap: 4mm; background: ${INK}; color: ${PAPER}; padding: 2mm 3mm; }
.bar .disp { font-size: 18pt; line-height: 1; } .bar .lab { flex: 1; color: ${YEL}; font-size: 8pt; } .bar .sw { width: 9mm; height: 9mm; box-shadow: 0 0 0 0.6mm ${PAPER}; }
.rule { margin: 2mm 0; font-size: 8.5pt; }
.stall .lane { margin-top: 3mm; border: 1.2mm solid var(--c); padding: 1.6mm 2mm 2mm; background: ${PAPER}; }
.lane-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2mm; } .lane-head .disp { font-size: 13pt; vertical-align: middle; }
.lane-body { display: flex; justify-content: space-between; align-items: flex-end; gap: 4mm; }
.cols { display: flex; gap: 2mm; }
.col { display: flex; flex-direction: column; align-items: center; gap: 1mm; }
.cell { width: ${BOX}mm; height: ${BOX}mm; display: grid; place-items: center; text-align: center; background: #fff; box-shadow: inset 0 0 0 0.5mm ${INK}; }
.cell .lab { font-size: 5.5pt; color: ${SLATE}; }
.cell.crate { background: color-mix(in srgb, var(--c) 22%, #fff); } .cell.no { background: repeating-linear-gradient(135deg, #fff 0 1.5mm, ${KRAFT} 1.5mm 3mm); box-shadow: inset 0 0 0 0.3mm ${SLATE}; }
.tag { width: 36mm; height: ${BOX}mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 0.5mm dashed ${INK}; background: #fff; }
.tag small { font-size: 5.5pt; color: ${SLATE}; }
.key { margin-top: 4mm; display: flex; flex-wrap: wrap; gap: 1.5mm 5mm; align-items: center; padding: 2mm 3mm; background: ${KRAFT}; font-size: 8pt; font-weight: 600; }
.cashnote { margin: 3mm 0 0; padding: 2mm 3mm; background: ${YEL}; font-size: 8.5pt; }
.counter { width: 250mm; height: 136mm; border: 0.5mm dashed ${SLATE}; padding: 3mm; display: flex; flex-direction: column; }
.cbody { flex: 1; display: flex; gap: 4mm; margin-top: 2mm; }
.crates { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2mm; }
.crow { display: flex; align-items: center; gap: 2mm; padding: 1.2mm 2mm; border-left: 3mm solid var(--c); background: ${PAPER}; }
.crow .cf { width: 10mm; } .crow .tag { margin-left: auto; width: 30mm; }
.crow .cell { background: color-mix(in srgb, var(--c) 22%, #fff); }
.steps { margin: auto 0 0; font-size: 7.5pt; line-height: 1.3; }
.cash { width: 70mm; flex: none; display: flex; flex-direction: column; gap: 1.2mm; padding: 2mm; background: ${PAPER}; box-shadow: inset 0 0 0 0.8mm ${INK}; }
.cash-head { display: flex; align-items: baseline; justify-content: space-between; } .cash-head .disp { font-size: 15pt; } .cash-head .lab { background: ${YEL}; padding: 0.6mm 1.6mm; }
.grid { display: grid; gap: 0; } .grid.tens { grid-template-columns: repeat(5, 13mm); } .grid.ones { grid-template-columns: repeat(5, 13mm); }
.cc { height: 13mm; display: grid; place-items: center; font: 800 9pt/1 'Archivo', sans-serif; box-shadow: inset 0 0 0 0.25mm ${INK}; background: #fff; }
.cc.start { background: ${YEL}; }
.cash small { font-size: 6.2pt; line-height: 1.3; color: ${INK}; }
.change h1 { font-size: 30pt; line-height: 0.95; margin: 4mm 0 1mm; } .change h2 { font-size: 13pt; margin: 6mm 0 1.5mm; padding-bottom: 1mm; border-bottom: 0.8mm solid ${INK}; }
.change p, .change li { font-size: 10pt; } .change ul, .change ol { margin: 1mm 0; padding-left: 5mm; } .change li { margin-bottom: 1mm; }
.patch { display: inline-block; vertical-align: top; width: 58mm; margin: 2mm 3mm 0 0; padding: 2mm 2.5mm; border: 0.4mm dashed ${INK}; font-size: 8pt; line-height: 1.3; background: ${PAPER}; }
.patch b.disp { display: block; font-size: 10pt; margin-bottom: 0.8mm; }
.fix { width: 100%; border-collapse: collapse; margin: 1mm 0 2mm; font-size: 9pt; }
.fix th { text-align: left; font-weight: 800; font-size: 7pt; letter-spacing: 0.08em; text-transform: uppercase; background: ${KRAFT}; padding: 1.2mm 2mm; }
.fix td { padding: 1.2mm 2mm; border-bottom: 0.25mm solid ${INK}; vertical-align: top; }
.fix td:nth-child(2) { white-space: nowrap; }
`;

const REPLACED = replacedDecks();
const sheetsOf = (cards: number) => Math.ceil(cards / PER_SHEET);
const CARDS_FILE = `Fruit-Market-Update-${RULES_VERSION}-2-Replacement-Cards.pdf`;

function changeSheet(): string {
  const cards = REPLACED.reduce((a, r) => a + r.deck.cards.length, 0);
  const paper = REPLACED.reduce((a, r) => a + sheetsOf(r.deck.cards.length), 0);
  const fixes = handFixes();
  const foot = (n: number) => `<div class="foot">Fruit Market · update pack · rules version ${RULES_VERSION} · start here · page ${n} of 2 · print at 100% (actual size) on A4</div>`;
  return `<section class="page change">
    <span class="lab">Print and play · update pack · rules version ${RULES_VERSION}</span>
    <h1 class="disp">Fruit Market<br>what changed</h1>
    <p>This pack brings the earlier printing (the rules 15 printing, with or without its rules 17 update pack) up to rules version ${RULES_VERSION}, the rules the app plays by. Print at 100% (actual size) on A4 card. Keep your board, shutters, fruit pieces, price tags and markers.</p>
    <h2 class="disp">In this pack</h2>
    <ul>
      <li><b>This sheet</b> (pages 1 and 2 of the boards file).</li>
      <li><b>Six stall sheets</b> (pages 3 to 8) and <b>six counters</b> (pages 9 to 14, one to a page, landscape; cut along the dashed line). Print them single-sided. Each counter carries that stall's <b>cash track</b>, so cash sits in front of the shutter where everyone can read it. If you printed these from the rules 17 pack, keep those: nothing on them changed.</li>
      <li><b>${cards} replacement cards</b> (the cards file: ${plural(paper, 'sheet', 'sheets')}, double-sided, flip on the long edge).</li>
      <li><b>The rules guidebook</b>, whole, at rules version ${RULES_VERSION}.</li>
    </ul>
    <h2 class="disp">Four decks are replaced whole</h2>
    <p>The new cards are in the new card design and have a new back. A deck must have one back, so put the whole old deck away. Do not mix new cards into an old deck.</p>
    <table class="fix"><tr><th>Deck</th><th>Print</th><th>Why</th></tr>${REPLACED.map((r) => `<tr><td><b>${esc(r.deck.title)}</b></td><td>${r.deck.cards.length} cards, ${plural(sheetsOf(r.deck.cards.length), 'sheet', 'sheets')}</td><td>${esc(r.why)}</td></tr>`).join('')}</table>
    <h2 class="disp">${fixes.length} cards to correct by hand</h2>
    <p>Write the change on the old card. Or print that whole deck from the print kit (print/kit) and put the old deck away.</p>
    <table class="fix"><tr><th>Deck</th><th>Card</th><th>Change</th></tr>${fixes.map((f) => `<tr><td>${esc(f.deck)}</td><td><b>${esc(f.card)}</b></td><td>${esc(f.fix)}</td></tr>`).join('')}</table>
    <p>Every other customer, guest, lorry and event card plays as printed. The new printing words some of them differently; the rules are the same.</p>
    ${foot(1)}
  </section>
  <section class="page change">
    <span class="lab">Print and play · update pack · rules version ${RULES_VERSION}</span>
    <h2 class="disp">The rule changes since the rules 15 printing</h2>
    <ol>
      <li><b>Tomorrow's customers come out in the morning.</b> When you turn over tomorrow's lorry, also deal tomorrow's row below today's: one regular face up and the walk-ins face down. Everyone buys knowing both days. (Before: tomorrow's row was dealt at Stocking.)</li>
      <li><b>Standing orders are bid for in the open.</b> To bid, write your price on a tag and lay it face down in front of your shutter. To pass, say "pass". Everyone can see who is bidding and who has passed, never the price. You may change your tag, take it back or put one down for as long as any stall is still deciding. When the last stall decides, flip all tags: the lowest bid wins.</li>
      <li><b>A stake, and rivals are not involved.</b> The winner puts down the card's stake when it wins. On the due day the order takes pieces from the winner's crate only. Deliver every piece and the stake comes back; deliver fewer and it is lost. There is no other fine, and a rival's fruit is never taken.</li>
      <li><b>Cash is public and lives on the counter.</b> Keep your Tens and Ones markers on your counter's cash track.</li>
      <li><b>No order that cannot be collected.</b> Do not turn over a standing order if its due day would be after the last day (in a Standard game, none on day 9).</li>
      <li><b>Out of cash.</b> At dawn, from Day 2, a stall with an empty shelf and less than $${TOP_UP} is topped up to $${TOP_UP} by the bank.</li>
      <li><b>${esc(FAVOURS.favouredTrade.title)} is played after the prices flip</b>, in the open, by a stall with a tied price.</li>
      <li><b>What a stall buys is seen only while it buys.</b> After buying it is hidden with the rest of the shelf.</li>
      <li><b>Days 1 and 2 have no mango customers</b>, and Mango Craze is never Day 2's event. A green mango costs $${FRUIT.mango.cost.unripe}.</li>
      <li><b>One favour deck of ${FAVOUR_DECK.length}</b> (${FAVOUR_COPIES} of each card) at every table size.</li>
    </ol>
    <p>All five upgrade piles are on offer after each Market Day. The guidebook lists every change and ruling of rules version ${RULES_VERSION} under "What is new".</p>
    <h2 class="disp">Notes for your board and shutters</h2>
    <p>The board and shutters still read as before. Cut these out and lay or tape them over the old words:</p>
    <div class="patch"><b class="disp">1 Morning</b>Today's event (from Day 2). Top up a stall that is out of cash. Unload the lorry. Turn over tomorrow's lorry and deal tomorrow's customers. Market Day: bid for the standing order.</div>
    <div class="patch"><b class="disp">3 Stocking</b>Turn today's walk-ins face up. Behind your shutter, move the pieces you will sell into your crate. Say how many, not which fruit.</div>
    <div class="patch"><b class="disp">Standing order</b>Bid in the open: a tag face down, or "pass". Change your mind until the last stall decides. The winner puts down the stake: back if it delivers every piece, lost if not.</div>
    <div class="patch"><b class="disp">Green mango: $${FRUIT.mango.cost.unripe}</b>Lay this over the price in both green boxes of the mango lane on the board. A green mango costs $${FRUIT.mango.cost.unripe} (the board says $3).</div>
    <div class="patch"><b class="disp">Green mango: $${FRUIT.mango.cost.unripe}</b>The second green box. A green mango costs $${FRUIT.mango.cost.unripe}.</div>
    ${foot(2)}
  </section>`;
}

function boardsHtml(): string {
  const counters = PATTERNS.map((pat, k) => `<section class="page land">${counter(k)}
    <div class="foot">Fruit Market · update pack · rules version ${RULES_VERSION} · counter ${k + 1} of 6 · ${pat} · cut along the dashed line · print at 100% (actual size) on A4 landscape</div></section>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fruit Market update pack: boards</title><style>${BASE_CSS}${BOARDS_CSS}</style></head><body>
    ${changeSheet()}${PATTERNS.map((_, i) => stallSheet(i)).join('')}${counters}</body></html>`;
}

// ---------- the replacement cards: the kit's own cards, for the decks that changed throughout ----------

const cardsHtml = (): string => doc('Fruit Market update pack: replacement cards', REPLACED.flatMap((r) => sheets(r.deck)), kitCss());

// ---------- the rules guidebook ----------

const GUIDE_CSS = `
@page { size: A4 portrait; margin: 16mm 16mm 18mm; }
body { font-size: 10pt; line-height: 1.45; }
h1 { font: 400 40pt/0.95 'Archivo Black', sans-serif; text-transform: uppercase; margin: 0; }
h2 { font: 400 17pt/1.05 'Archivo Black', sans-serif; text-transform: uppercase; margin: 7mm 0 2mm; padding: 1.6mm 3mm; background: ${INK}; color: ${PAPER}; break-after: avoid; }
h3 { font: 400 11.5pt/1.1 'Archivo Black', sans-serif; text-transform: uppercase; margin: 4.5mm 0 1.2mm; break-after: avoid; }
p { margin: 0 0 2mm; } ul, ol { margin: 0 0 2mm; padding-left: 5.5mm; } li { margin-bottom: 0.8mm; }
table { width: 100%; border-collapse: collapse; margin: 1mm 0 3mm; font-size: 8.8pt; break-inside: avoid; }
th { text-align: left; font-weight: 800; font-size: 7pt; letter-spacing: 0.08em; text-transform: uppercase; background: ${KRAFT}; padding: 1.4mm 2mm; }
td { padding: 1.3mm 2mm; border-bottom: 0.25mm solid ${INK}; vertical-align: top; }
.cover { height: 250mm; display: flex; flex-direction: column; justify-content: center; gap: 5mm; break-after: page; }
.cover .band { display: grid; grid-template-columns: repeat(4, 1fr); height: 26mm; }
.cover .band span { display: grid; place-items: center; } .cover .band .fr { background: ${PAPER}; padding: 1.5mm; }
.cover .q { font: 400 15pt/1.15 'Archivo Black', sans-serif; text-transform: uppercase; }
.new { background: ${YEL}; padding: 3mm 4mm; margin: 0 0 3mm; break-inside: avoid; } .new p:last-child { margin: 0; }
.beat { display: grid; grid-template-columns: 12mm 1fr; gap: 3mm; margin-top: 3mm; break-inside: avoid-page; }
.beat > b { font: 400 26pt/1 'Archivo Black', sans-serif; background: ${YEL}; display: grid; place-items: center; height: 12mm; }
.lanes td.bx { white-space: nowrap; } .bxs span { display: inline-block; min-width: 13mm; margin-right: 1mm; padding: 0.8mm 1.4mm; box-shadow: inset 0 0 0 0.3mm ${INK}; font-weight: 800; font-size: 8pt; }
.oneline { background: ${KRAFT}; padding: 3mm 4mm; font-size: 9pt; }
.tiny { font-size: 8pt; color: ${SLATE}; }
`;

function guideHtml(): string {
  const money = (n: number) => `$${n}`;
  const evRows = EVENT_CARDS.map((e) => `<tr><td><b>${esc(e.title)}</b></td><td>${esc(e.text)}${e.maxPrice ? ` Blueberry ${money(e.maxPrice.blueberry)}, watermelon ${money(e.maxPrice.watermelon)}, apple ${money(e.maxPrice.apple)}, mango ${money(e.maxPrice.mango)}.` : ''}</td></tr>`).join('');
  const guests = EVENT_CARDS.filter((e) => e.extra).map((e) => `<tr><td><b>The ${esc(e.extra!.name)}</b></td><td>${esc(e.title)}</td><td>${e.extra!.wants.map((w) => `${w.qty} ${(w.qty === 1 ? FRUIT[w.fruit].name : FRUIT[w.fruit].plural).toLowerCase()} at ${money(w.max)}`).join(', ')}</td></tr>`).join('');
  const WHEN: Record<string, string> = { evening: 'Evening', buy: 'Your buying turn', tie: 'After prices flip' };
  const favRows = Object.values(FAVOURS).map((f) => `<tr><td><b>${esc(f.title)}</b></td><td>${WHEN[f.when] ?? f.when}</td><td>${esc(f.text.replace(/^Play (in the evening|on your buying turn|while pricing): /, '').replace(/^./, (c) => c.toUpperCase()))}</td></tr>`).join('');
  const upRows = Object.values(UPGRADES).map((u) => `<tr><td><b>${esc(u.title)}</b></td><td>${money(u.cost)}</td><td>${esc(u.text)}</td></tr>`).join('');
  const shopRows = RIVALS.map((r) => { const t = TRAITS[CHARACTER_TRAIT[r.avatar]]; return `<tr><td><b>${esc(r.name)}</b></td><td>${esc(t.title)}</td><td>${esc(t.text)}</td></tr>`; }).join('');
  const orderRows = [...new Map(ORDER_CARDS.map((o) => [o.fruit, o])).values()].map((o) => `<tr><td>${ORDER_CARDS.filter((x) => x.fruit === o.fruit).map((x) => esc(x.title)).join(', ')}</td><td>${fruit(o.fruit, 5)} ${esc(FRUIT[o.fruit].name)}</td><td>${money(o.ceiling)}</td><td>${money(o.stake)}</td><td>${money(stakeFor(o.stake, true))}</td></tr>`).join('');
  const laneRows = LANES.map((f) => `<tr><td>${fruit(f, 6)} <b>${esc(FRUIT[f].name)}</b></td><td>${FRUIT[f].ripe.length + GREEN[f]} days</td><td class="bx bxs">${boxes(f).map((st) => `<span>${LETTER[st]} ${money(FRUIT[f].cost[st])}</span>`).join('')}</td></tr>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fruit Market rules guidebook</title><style>${BASE_CSS}${GUIDE_CSS}</style></head><body>
<div class="cover">
  <span class="lab">Rules guidebook · 2 to 6 stalls · 45 to 90 minutes</span>
  <div class="band">${LANES.map((f) => `<span style="background:${LANE[f]}">${fruit(f, 16)}</span>`).join('')}</div>
  <h1>Fruit<br>Market</h1>
  <p class="q">Set your price in secret. Sell before the fruit spoils.</p>
  <span class="lab">Game design by Murshidi bin Md Hashim · tabletop rules, rules version ${RULES_VERSION}</span>
</div>

<h2>The big idea</h2>
<p>Each player runs a small fruit stall. Each morning you buy fruit at the Wholesale Market. Each day you sell it to customers. Fruit ages every night, sells for less as it ages, and is then thrown away. The stall with the most cash at the end of the last day wins.</p>
<p>Three things pull against you every day:</p>
<ol>
  <li><b>The clock.</b> Every night all fruit ages one step. Older fruit sells for less, and then it spoils.</li>
  <li><b>The secret price.</b> You never see a rival's prices until the bell. Price too high and the customer walks past you. Price too low and you give money away.</li>
  <li><b>The shut crate.</b> Stalls are secret. Before prices are set you learn only how many pieces each rival has in its crate, not which fruit.</li>
</ol>
<div class="new">
  <h3>What is new in rules version ${RULES_VERSION}</h3>
  <p><b>Out of cash.</b> At dawn, from Day 2, a stall with an empty shelf and less than $${TOP_UP} is topped up to $${TOP_UP} by the bank.</p>
  <p><b>Standing orders: a stake, not fines.</b> The winner puts down the card's stake. It comes back for a full delivery and is lost otherwise. Only the winner's crate fills the order; rivals are not involved.</p>
  <p><b>What a stall buys is seen while it buys.</b> After buying it goes behind the shutter with the rest of the shelf: you need not say what you bought, and nobody may ask.</p>
  <p><b>Favoured Trade is played after prices flip</b>, by a stall with a tied price, in the open.</p>
  <p><b>Days 1 and 2 have no mango customers</b>, and Mango Craze is never Day 2's event.</p>
  <p><b>Numbers.</b> A green mango costs $${FRUIT.mango.cost.unripe}. Upgrades cost ${Object.values(UPGRADES).map((u) => `${u.title} $${u.cost}`).join(', ')}. Nest Egg starts with $${START_CASH + NEST_EGG_BONUS}. One favour deck of ${FAVOUR_DECK.length} at every table size. The three Bargain blueberry customers pay $${BLUEBERRY_BARGAIN}.</p>
  <p><b>Rulings.</b> A guest joins a full row. The final tie after cash and fruit sold is a shared win. Only one Priority card an evening; on Day 3 it goes ahead of Nest Egg. A Juice Bar's $${JUICE_TIP} is for customers and guests only. A Premium Display never raises a guest's price.</p>
</div>

<h2>What is in the box</h2>
<p>1 Wholesale Market board (three panels) · 6 stall sheets, 6 shutters and 6 counters (each counter carries a cash track) · 200 fruit pieces, 50 of each fruit · 24 price tags, four per stall · 12 cash markers, two per stall · 36 served-alone chips, six per stall · ${CUSTOMER_CARDS.length} customer cards and ${GUESTS.length} guest cards · ${EVENT_CARDS.length} event cards and ${FARMER_CARDS.length} lorry cards · ${FAVOUR_DECK.length} favour cards · ${Object.keys(UPGRADES).length * UPGRADE_COPIES} upgrade cards, ${UPGRADE_COPIES} of each · ${ORDER_CARDS.length} standing-order cards · ${RIVALS.length} shopkeeper cards · day marker, first-player token, Shade Cloth marker, six +$200 chips. You also need a dry-wipe pen or pencil for each stall.</p>

<h2>The fruit</h2>
<p>Every fruit follows the same rule. A <b>Fresh</b> piece sells at the customer's top price. An <b>Okay</b> piece sells for $${OKAY_LESS} less. A <b>Soft</b> piece sells for $${SOFT_LESS} less. <b>Green</b> fruit cannot be sold until it ripens. A fruit's last two days are Okay, then Soft; every day before that is Fresh. Mangoes always arrive Green and spend ${FRUIT.mango.unripeSlots} nights ripening first.</p>
<p>Each lane on the board, and on your stall sheet, is that fruit's life from right (newest) to left (oldest). Every night, every piece slides one box to the left. A piece that slides out of its Soft box is thrown away.</p>
<table class="lanes"><tr><th>Fruit</th><th>Lasts</th><th>Its boxes, oldest on the left, with the cost to buy from each</th></tr>${laneRows}</table>
<p class="tiny">S = Soft, O = Okay, F = Fresh, G = Green. Every mango arrives green; no other fruit does.</p>

<h2>Customers</h2>
<p>A customer card shows one or two fruits. For each one it shows how many they want (the circles) and the most they pay for a Fresh piece (the price tag). They pay $${OKAY_LESS} less for Okay and $${SOFT_LESS} less for Soft. The black band is the customer's freshness type: <b>Premium</b> buys Fresh fruit only; <b>Everyday</b> buys Fresh or Okay; <b>Bargain</b> buys Fresh, Okay or Soft.</p>
<p>The back of the card shows only which fruits they want. A face-down customer keeps their amounts, prices and type secret.</p>
<p>Each day brings one <b>regular</b> (drawn face up, a day ahead) and some <b>walk-ins</b> (drawn face down, a day ahead). The crowd is one customer per stall, and never more than ${ROW_CAP}: the regular plus one walk-in for every stall after the first, up to ${ROW_CAP - 1}. With ${BIG_TABLE} stalls every customer wants one more of the first fruit on their card. Nobody waits overnight: a customer who does not get everything leaves. <b>On Day 1 and Day 2 no customer wants a mango</b> (a mango needs two nights to ripen): when you deal those two rows, a card that shows a mango goes to the bottom of the deck and you deal another.</p>

<h2>Set-up</h2>
<ol>
  <li><b>The board.</b> Open it in the middle of the table. Shuffle the ${EVENT_CARDS.length} event cards and the ${FARMER_CARDS.length} lorry cards and put each deck face down on its space. Put the day marker on 1. Agree the length: Quick is 8 days, Standard is 10, Long is 14.</li>
  <li><b>The supply.</b> Put all the fruit pieces in a pile within reach. The market starts empty.</li>
  <li><b>Each stall</b> takes a stall sheet, the shutter, the counter, cash markers and chips in the same pattern, four price tags and a pen. Stand the shutter in front of your sheet and lay the counter in front of the shutter: the shutter stays up all game. On your counter's cash track, put your Tens marker on ${START_CASH - (START_CASH % 10)} and your Ones marker on ${START_CASH % 10}: you start with $${START_CASH}.</li>
  <li><b>First player.</b> Give the first-player token to a stall at random.</li>
  <li><b>Shopkeepers.</b> Lay the ${RIVALS.length} shopkeeper cards face up. Starting with the player to the left of the token, each stall picks one. It gives you one perk for the whole game. Saleh moves his cash to $${START_CASH + NEST_EGG_BONUS}. Ah Chen draws ${CHARMER_START_FAVOURS} favour cards once the deck is ready.</li>
  <li><b>Favour cards and upgrades.</b> Use ${FAVOUR_COPIES} of each favour card (${FAVOUR_DECK.length} cards) at every table size. Shuffle them face down beside the board. Lay the upgrade cards face up in ${Object.keys(UPGRADES).length} piles. Shuffle the ${ORDER_CARDS.length} standing-order cards face down beside them.</li>
  <li><b>Customers.</b> Shuffle the ${CUSTOMER_CARDS.length} customer cards. Keep the ${GUESTS.length} guest cards to one side. Deal today's crowd in a row on the table: one regular face up, then one walk-in face down for every stall after the first, up to four. No mango customers on Day 1 or Day 2 (see Customers).</li>
</ol>

<h2>Money: the cash track</h2>
<p>Your cash is your Tens marker plus your Ones marker, on the cash track on your <b>counter</b>, in front of your shutter. With Tens on 10 and Ones on 4 you have $14. When you are paid or you pay, move the Ones marker, and carry to the Tens marker when you pass 9 or go below 0. If you pass $199, take a +$200 chip and start the Tens again from 0.</p>
<p><b>Cash is public.</b> Everyone can read everyone's cash at any time. Nobody hands money to anybody: each stall moves its own markers while the table watches.</p>

<h2>A day in five steps</h2>
<div class="beat"><b>1</b><div><h3>Morning</h3>
<ol>
  <li><b>Event.</b> From Day 2 onward, turn over the top event card onto "Today's event" and do what it says. Nobody knows an event before its own morning. There is no event on Day 1. If the event adds walk-ins, deal them face down at the end of today's row. If it removes walk-ins, the last ones in today's row go back under the customer deck. If it brings a guest, add that guest card to the end of the row. If Mango Craze turns up on Day 2, put it at the bottom of the deck and turn over another.</li>
  <li><b>Out of cash.</b> From Day 2: a stall with an empty shelf (no pieces at all, green ones included) and less than $${TOP_UP} is topped up to $${TOP_UP} by the bank. Do this after the event and any Health Inspector charge, before anyone bids or buys.</li>
  <li><b>The lorry.</b> The card on "Tomorrow's lorry" is now today's lorry (on Day 1, turn over the top card of the deck). Find the row for your number of stalls and take that many pieces of each fruit from the supply. Put them in that fruit's box marked "The lorry unloads here". Mangoes always arrive green and go in the far green box. The Seconds Lorry unloads its other fruit into each fruit's freshest Okay box. A Mango Windfall's extra mangoes are ripe: put them in the mango's Fresh box.</li>
  <li><b>Tomorrow.</b> Discard today's lorry card and turn the next one face up onto "Tomorrow's lorry". Then deal <b>tomorrow's row</b> below today's: one regular face up and the walk-ins face down (use the "Daily" number on the board). Tomorrow's own event may change that row tomorrow morning. Deal nothing for the day after the last day.</li>
  <li><b>On a Market Day.</b> Turn over a standing order and bid for it now, before anyone buys (see Standing orders).</li>
</ol></div></div>
<div class="beat"><b>2</b><div><h3>Buying</h3>
<p>The poorest stall buys first, then the others follow clockwise from it. If stalls tie for poorest, the first of them clockwise from the first-player token goes first. On Day 1, start at the token. This is today's buying order; the evening and the last tie-break use it too.</p>
<p>On your turn, buy up to ${BASE_BUY} pieces. For each one, take a piece from any market box, pay the cost printed on that box, and put the piece on your shelf row, in the box with the same position in that fruit's lane (same letter, same distance from the Soft end). Your sheet holds ${BASE_SHELF} pieces in all. You may play Free Fruit, Scout or Fridge on your turn. Buying is done in the open. <b>What you bought today is public until the bell</b>: tell anyone who asks which pieces you took today. Older fruit on your shelf stays secret.</p></div></div>
<div class="beat"><b>3</b><div><h3>Stocking</h3>
<ol>
  <li><b>The crowd arrives.</b> Turn today's walk-ins face up. The row is always in this order, left to right: a standing order collected today, the regular, the walk-ins in the order they were drawn, then a guest. The regular, the walk-ins and a standing order never make more than five cards: a standing order takes the place of the last walk-in. A guest joins the end of the row even when it is full.</li>
  <li><b>Fill your crate.</b> Behind your shutter, slide each piece you want to sell today straight up, from the shelf row into the crate box above it. Any freshness may go in; green fruit may not. Pieces left on the shelf cannot be sold today, and they still get older tonight.</li>
  <li><b>Say how many.</b> When everyone is ready, each stall says how many pieces are in its crate, and nothing else. Which fruit, and how fresh, stays secret until the bell.</li>
</ol>
<p>You may not ask what is behind a shutter, and nobody has to tell you.</p></div></div>
<div class="beat"><b>4</b><div><h3>The bell</h3>
<p>Write one price on the tag of each fruit you have in your crate, and lay the tag face down. One price covers every piece of that fruit. There is no lowest price. When everyone is ready, flip all tags together and lay each one on its fruit on your counter. Then every crate comes out: move your crate pieces from behind the shutter onto your counter, each into the box with the same letter and place. Your shelf stays behind the shutter.</p>
<p><b>Favoured Trade.</b> Once the tags are flipped, a stall that holds Favoured Trade and has a price tied with another stall's price for the same fruit may play it. Tied holders decide one at a time, in today's buying order, in the open: play it or keep it. It cannot be played before the flip.</p>
<p>Your price decides which of your pieces can sell to a customer. Take the customer's top price for today (the price on the card, plus or minus any event, plus $${LAST_CALL_BONUS} on the last day): priced <b>at the top price</b>, only a Fresh piece sells; <b>$1 under</b>, a Fresh or Okay piece sells; <b>$2 under, or less</b>, any piece sells; <b>over the top price</b>, nothing sells to that customer. The customer must also accept the freshness: a Premium customer never takes Okay or Soft fruit, however cheap.</p></div></div>
<div class="beat"><b>5</b><div><h3>The rush</h3>
<p>Serve the customers one at a time, left to right. The stall that bought last this morning is the crier: they read each customer aloud. For each fruit on the card:</p>
<ol>
  <li>The customer buys from the cheapest stall that has a piece they will take at that price.</li>
  <li>That stall hands over the oldest piece on its counter that is fresh enough for its price, puts it on one of the card's circles, and adds its own price to its cash track.</li>
  <li>If the customer still wants more, they carry on with the same stall, and then spill to the next cheapest stall, until the circles are full or nobody else can sell.</li>
</ol>
<p><b>Tied prices</b> are broken in this order: a stall that played Favoured Trade; then the stall whose piece is younger; then Rosa the Haggler; then whoever bought earlier this morning.</p>
<p><b>Serving alone.</b> The first stall to sell to a customer puts one of its chips on the card. If a second stall sells to the same customer, the chip comes off. When the whole order is filled and a chip is still there, that stall served the customer alone: it draws a favour card (one a day at most, ${CHARMER_DAILY_FAVOURS} for the Charmer, and never past a hand of ${FAVOUR_HAND_LIMIT}, ${FAVOUR_HAND_LIMIT + 1} for the Charmer).</p>
<p><b>After the last customer.</b> Every customer leaves, served or not. Put any unsold counter pieces back behind the shutter, each in the same box of the shelf row, and wipe your tags.</p></div></div>

<h3>Evening and night</h3>
<p><b>Evening.</b> In buying order, each stall may play evening favour cards (Priority, Gossip). Only one Priority card may be played each evening: a second one stays in its owner's hand. On the evening after a Market Day (days ${MARKET_DAYS}) each stall may also build <b>one upgrade</b> from the five piles: pay its cost and take the card. A stall has room for ${MAX_UPGRADES}. Pak Din lays the Shade Cloth marker on one fruit lane of his sheet. Farah peeks at one of tomorrow's walk-ins.</p>
<p><b>Night.</b> On the board, and behind every shutter, every piece slides one box to the left. Pieces that slide out of a Soft box go back to the supply. Tomorrow's row moves up to become today's. Then pass the first-player token one seat clockwise and move the day marker on.</p>

<h2>Market Days, Closing Day and the end</h2>
<p><b>Market Days</b> are days ${MARKET_DAYS}, but never the last day. They bring a standing order in the morning and an upgrade that evening. The lorry still comes. <b>Closing Day</b> is the last day. Every customer pays $${LAST_CALL_BONUS} more. After the rush, the jam maker buys every ripe piece left on every stall for $${JAM_PRICE} each. Green fruit is worth nothing. <b>The winner</b> is the stall with the most cash. Upgrades are worth nothing. If stalls tie, the one that sold more fruit wins. If they are still tied, they share the win.</p>

<h2>Standing orders</h2>
<p>A standing order is one big public order. It is turned over on a Market Day morning and collected ${ORDER_LEAD} days later. It wants one fruit, Fresh or Okay: ${ORDER_SIZES}. Do not turn one over if its due day would be after the last day.</p>
<ol>
  <li><b>Bid, in the open.</b> Before anyone buys, each stall decides. To bid, write on a price tag the price per piece you would fill the order for (from $1 up to the price on the card) and lay it face down in front of your shutter. To pass, say "pass". Everyone can see who is bidding and who has passed; nobody sees a price. <b>You may change your mind</b> (swap your tag, take it back, or put one down after passing) for as long as any stall is still deciding. When the last stall decides, flip all tags together. The lowest bid wins. A tie goes to a stall with an Order Book, then to the stall that buys earlier today. If everyone passes, discard the card. You may only bid if you have the card's stake in cash (half, rounded down, with an Order Book); you may always pass.</li>
  <li><b>The stake.</b> The winner pays the stake at once and puts it on the card, with one of its chips.</li>
  <li><b>Get ready.</b> The winner has three buying turns (today, tomorrow and the due day) to have the pieces on its shelf.</li>
  <li><b>Collect.</b> On the due day the card stands at the front of the row and is served first, from the winner's crate only. It takes the winner's Fresh or Okay pieces of that fruit, freshest first, up to the number it wants, and pays the winner its bid for each ($${ORDER_BOOK_BONUS} more for each with an Order Book). Rivals' fruit is never taken and rivals are paid nothing. Anything the order did not get simply leaves.</li>
  <li><b>The stake comes back, or not.</b> If the winner delivered every piece, it takes its stake back at once. If not, the stake goes to the bank. There is no other fine.</li>
</ol>
<table><tr><th>Orders</th><th>Fruit</th><th>Highest bid allowed</th><th>Stake</th><th>Stake with an Order Book</th></tr>${orderRows}</table>
<p>A standing order draws no favour card and pays no tips (a Juice Bar adds nothing either), and no event or Closing Day changes what it pays. It is not used in the Basic game.</p>

<h2>Guests</h2>
<p>Five events bring a guest card. The guest joins the end of today's row and is served like any other customer. A guest joins even when the row is full. A guest's price is fixed: the event's own price change is not added to it, and a Premium Display does not raise it. Only Closing Day adds its $${LAST_CALL_BONUS}.</p>
<table><tr><th>Guest</th><th>Event</th><th>Wants</th></tr>${guests}</table>

<h2>How many walk-ins</h2>
<table><tr><th>Stalls</th><th>Regular + walk-ins</th><th>Festival</th><th>Tourist Bus</th><th>Monsoon Downpour</th></tr>
<tr><td>2</td><td>1 + 1</td><td>+1</td><td>+2</td><td>−1</td></tr><tr><td>3</td><td>1 + 2</td><td>+1</td><td>+2</td><td>−1</td></tr>
<tr><td>4</td><td>1 + 3</td><td>+1 (row full)</td><td>+1 (row full)</td><td>−2</td></tr><tr><td>5</td><td>1 + 4</td><td>row full</td><td>row full</td><td>−2</td></tr>
<tr><td>6</td><td>1 + 4, each wanting 1 more</td><td>row full</td><td>row full</td><td>−2</td></tr></table>
<p class="tiny">Never more than four walk-ins, and never fewer than none. An event changes today's row only, on its own morning.</p>

<h2>Event cards (${EVENT_CARDS.length})</h2>
<table><tr><th>Event</th><th>What it does today</th></tr>${evRows}</table>
<p class="tiny">"Customers pay $1 more" raises every customer's top price. A Heatwave night slides every piece two boxes. After a Monsoon Downpour nothing slides at all. The Health Inspector charges for the Soft pieces on your sheet before anyone buys: count them yourself, behind your shutter, and pay.</p>

<h2>Favour cards</h2>
<p>You earn a favour card by serving a customer's whole remaining order by yourself. Keep favour cards face down in front of you, so everyone can count them. Hold up to ${FAVOUR_HAND_LIMIT} (the Charmer ${FAVOUR_HAND_LIMIT + 1}). A played card goes to a discard pile; shuffle the pile into a new deck when the deck runs out.</p>
<table><tr><th>Favour</th><th>When</th><th>Effect</th></tr>${favRows}</table>

<h2>Stall upgrades</h2>
<p>All five are on offer on the evening after each Market Day. Build one that evening at most. You can build each upgrade once, and a stall has room for ${MAX_UPGRADES}.</p>
<table><tr><th>Upgrade</th><th>Cost</th><th>Effect</th></tr>${upRows}</table>

<h2>Shopkeepers</h2>
<p>No two stalls can be the same shopkeeper. Everyone can see your perk.</p>
<table><tr><th>Shopkeeper</th><th>Perk</th><th>Effect</th></tr>${shopRows}</table>

<h2>Small print</h2>
<h3>When a deck runs out</h3>
<p><b>Customers.</b> Shuffle every customer card that is not on the table into a new deck. <b>Favour cards.</b> Shuffle the discard pile into a new deck; cards in hands stay there. <b>Events and lorries.</b> Shuffle all 20 again. <b>Fruit pieces.</b> If a pile ever runs out, use any stand-in.</p>
<h3>Reminders people ask about</h3>
<ul>
  <li>The lorry comes every day, Market Days included, unless an event says otherwise.</li>
  <li>Only pieces in your crate can sell. Pieces on your shelf do not sell, and they still age tonight.</li>
  <li>You are paid your own price, not the customer's top price.</li>
  <li>You always hand over your oldest piece that is fresh enough for your price. You do not choose.</li>
  <li>A standing order takes pieces from its winner's crate only. Rivals are not involved.</li>
  <li>A Juice Bar's $${JUICE_TIP} is for Okay or Soft pieces sold to customers and guests in the rush: not for a standing order, the night hawker or the jam maker.</li>
  <li>On Day 3 a stall that played Priority buys first and Nest Egg second.</li>
  <li>Pasar Malam: after the last customer, the night hawker buys 1 of each fruit still in each stall's crate for $${HAWKER}, oldest piece first, any freshness.</li>
  <li>The Health Inspector never comes on the last day. If that card is drawn then, draw another.</li>
  <li>Scout: turn one face-down walk-in up for yourself only, look, and turn it back. Say aloud that you played it.</li>
</ul>
<h3>Other ways to play</h3>
<table><tr><th>Option</th><th>What changes</th></tr>
<tr><td><b>Basic game</b></td><td>No shopkeepers, favour cards, upgrades or standing orders: just buying, stocking and the bell. Good for a first game.</td></tr>
<tr><td><b>Fixed prices (beginner)</b></td><td>Ignore the prices on the cards. Every customer pays the same top price for a Fresh piece: blueberry $${STREET_PRICE.blueberry}, watermelon $${STREET_PRICE.watermelon}, apple $${STREET_PRICE.apple}, mango $${STREET_PRICE.mango}. Generous customers pay $${GENEROUS_BONUS} more: numbers ${list(GENEROUS)}.</td></tr>
<tr><td><b>No Market Days, or no Closing Day</b></td><td>Either can be switched off before you start.</td></tr></table>
<p class="oneline"><b>The day on one line.</b> Morning: event, top-up for a stall out of cash, lorry, tomorrow's lorry and tomorrow's customers, standing-order bids on a Market Day · Buying: poorest first, up to 4 · Stocking: fill the crate behind the shutter, say how many · The bell: one tag per fruit, flip together, crates out onto the counters, Favoured Trade for a tied price · The rush: cheapest stall first, oldest fresh-enough piece, served-alone chips · Evening: favours, upgrades · Night: everything slides one box left.</p>
<p class="tiny">These tabletop rules are rules version ${RULES_VERSION}, the same rules the Fruit Market app plays by. The table pieces (the three-panel board, the crate row above the shelf, the cash track on the counter, the shutter and price tags) are how those rules are run by hand.</p>
</body></html>`;
}

// ---------- write the PDFs ----------

async function main() {
  mkdirSync(OUT, { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), 'fm-update-'));
  const browser = await chromium.launch();
  try {
    // The guidebook is running text, so the browser breaks its pages and numbers them.
    const guide = `Fruit-Market-Rules-Guidebook-v${RULES_VERSION}.pdf`;
    const src = join(tmp, guide.replace(/\.pdf$/, '.html'));
    writeFileSync(src, guideHtml());
    const page = await browser.newPage();
    await page.goto(pathToFileURL(src).href, { waitUntil: 'load' });
    await page.evaluate(async (fonts) => { await Promise.all(fonts.map((f) => document.fonts.load(f))); await document.fonts.ready; }, BOARD_FONTS);
    const missing = await page.evaluate((fonts) => fonts.filter((f) => !document.fonts.check(f)), BOARD_FONTS);
    if (missing.length) throw new Error(`${guide}: fonts not loaded: ${missing.join(', ')}`);
    await page.pdf({
      path: join(OUT, guide), preferCSSPageSize: true, printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>',
      footerTemplate: `<div style="width:100%;font:8px sans-serif;letter-spacing:1px;text-align:center;color:#5a6266">FRUIT MARKET · RULES GUIDEBOOK · RULES VERSION ${RULES_VERSION} · <span class="pageNumber"></span></div>`,
    });
    await page.close();
    console.log('wrote', join(OUT, guide));
    // The boards and the cards are laid out page by page, and checked before they are written (print-render.ts).
    await renderPdf(browser, tmp, OUT, `Fruit-Market-Update-${RULES_VERSION}-1-Stall-Sheets-and-Counters.pdf`, boardsHtml(), BOARD_FONTS);
    await renderPdf(browser, tmp, OUT, CARDS_FILE, cardsHtml());
  } finally {
    await browser.close();
    rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
