// Test prints of the two ways to track freshness on the table (PLAN-080, REP-103; rules version 18, PLAN-087). No rule
// changes: both trackers follow the fruit lives, costs and limits in the game data (src/engine/data.ts) and the ageing
// rules in RULES.md as they stand. Both stay test packs until the owner has tried them and chosen one (DEC-089).
//   npx vite-node scripts/print-trackers.ts [outdir]      (normally: print/tracker-test)
// Writes two PDFs:
//   1 Ruler: fruit stays in the column it was bought into and a loose ruler slides one column a night.
//   2 Tray:  fruit slides one box a night (as on the market mat) and the crate is a loose tray that comes out at the bell.
// Each starts with a how-to page. Pieces, shutters, price tags, counters and cards come from the existing printing.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { BARROW_SHELF, BASE_SHELF, FRUIT, JUICE_CAP, stageAt, type FruitId, type Stage } from '../src/engine/data';
import { RULES_VERSION } from '../src/net/protocol';
import { fruitSvgString } from '../src/ui/fruitIcons';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(process.argv[2] ?? join(ROOT, 'print', 'tracker-test'));
const FONT = (pkg: string, file: string) => pathToFileURL(join(ROOT, 'node_modules', '@fontsource', pkg, 'files', file)).href;

const INK = '#1f272a', PAPER = '#fffcf5', KRAFT = '#ddd4c6', YEL = '#fec400', SLATE = '#5a6266';
const LANE: Record<FruitId, string> = { blueberry: '#3558a2', watermelon: '#0e9a58', mango: '#fec400', apple: '#e73c35' };
const LANES: FruitId[] = ['blueberry', 'watermelon', 'mango', 'apple'];
const LETTER: Record<Stage, string> = { unripe: 'G', fresh: 'F', okay: 'O', notso: 'S' };
const WORD: Record<Stage, string> = { unripe: 'Green', fresh: 'Fresh', okay: 'Okay', notso: 'Soft' };
const TINT: Record<Stage, string> = { unripe: '#a9dcbd', fresh: '#ffffff', okay: '#fec400', notso: '#f2a7a2' };
/** A fruit's boxes, oldest on the left: its ripe stages, then any green ones (only the mango arrives green). */
const boxes = (f: FruitId): Stage[] => Array.from({ length: FRUIT[f].ripe.length + FRUIT[f].unripeSlots }, (_, pos) => stageAt(f, pos));
/** The longest life of any fruit, in nights: the width of the ruler and of a lane of boxes. */
const LONGEST = Math.max(...LANES.map((f) => boxes(f).length));
const fruit = (f: FruitId, mm: number) => `<span class="fr" style="width:${mm}mm;height:${mm}mm">${fruitSvgString(f, 'fresh', 32)}</span>`;
const lamp = (st: Stage) => `<i class="lamp" style="background:${TINT[st]}">${LETTER[st]}</i>`;
const foot = (what: string) => `<div class="foot">Fruit Market · freshness tracker test · rules version ${RULES_VERSION} (no rule changes) · ${what} · print at 100% (actual size)</div>`;
/** What Okay and Soft fruit sell for under the customer's price: the same for every fruit (data.ts FRUIT.drop, oldest first). */
const [SOFT_LESS, OKAY_LESS] = FRUIT.apple.drop;
const KEY = `<div class="key"><b class="lab">What a piece sells for</b>
  <span>${lamp('unripe')} Green: cannot be sold</span><span>${lamp('fresh')} Fresh: the customer's price</span><span>${lamp('okay')} Okay: $${OKAY_LESS} less</span><span>${lamp('notso')} Soft: $${SOFT_LESS} less</span></div>`;

const BASE_CSS = `
@font-face { font-family: 'Archivo'; font-weight: 500; src: url('${FONT('archivo', 'archivo-latin-500-normal.woff2')}') format('woff2'); }
@font-face { font-family: 'Archivo'; font-weight: 600; src: url('${FONT('archivo', 'archivo-latin-600-normal.woff2')}') format('woff2'); }
@font-face { font-family: 'Archivo'; font-weight: 800; src: url('${FONT('archivo', 'archivo-latin-800-normal.woff2')}') format('woff2'); }
@font-face { font-family: 'Archivo Black'; font-weight: 400; src: url('${FONT('archivo-black', 'archivo-black-latin-400-normal.woff2')}') format('woff2'); }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; padding: 0; }
body { font: 500 9.5pt/1.4 'Archivo', sans-serif; color: ${INK}; background: #fff; }
@page { size: A4 portrait; margin: 0; }
@page land { size: A4 landscape; margin: 0; }
.page { position: relative; width: 210mm; height: 297mm; padding: 10mm; page-break-after: always; overflow: hidden; }
.page.land { page: land; width: 297mm; height: 210mm; padding: 8mm 10mm; }
.disp { font-family: 'Archivo Black', sans-serif; font-weight: 400; text-transform: uppercase; }
.lab { font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; font-size: 7pt; }
.fr { display: inline-block; vertical-align: middle; } .fr svg { width: 100%; height: 100%; display: block; }
.lamp { display: inline-grid; place-items: center; width: 4.6mm; height: 4.6mm; box-shadow: inset 0 0 0 0.3mm ${INK}; color: ${INK}; font: 800 7pt/1 'Archivo', sans-serif; font-style: normal; vertical-align: middle; }
.foot { position: absolute; left: 8mm; right: 8mm; bottom: 3mm; font-weight: 800; font-size: 6pt; letter-spacing: 0.1em; text-transform: uppercase; color: ${SLATE}; text-align: center; }
.bar { display: flex; align-items: center; gap: 4mm; height: 9mm; background: ${INK}; color: ${PAPER}; padding: 0 3mm; }
.bar .disp { font-size: 15pt; line-height: 1; white-space: nowrap; } .bar .lab { margin-left: auto; color: ${YEL}; }
.key { margin-top: 2mm; height: 7mm; display: flex; align-items: center; gap: 5mm; padding: 0 3mm; background: ${KRAFT}; font-size: 8pt; font-weight: 600; white-space: nowrap; }
.band { height: 5mm; display: flex; align-items: center; justify-content: space-between; padding: 0 3mm; background: ${INK}; color: ${PAPER}; font-weight: 800; font-size: 6.5pt; letter-spacing: 0.08em; text-transform: uppercase; }
.band b { color: ${YEL}; }
.how h1 { font-size: 26pt; line-height: 0.95; margin: 3mm 0 2mm; }
.how h2 { font-size: 12pt; margin: 5mm 0 1.5mm; padding-bottom: 1mm; border-bottom: 0.8mm solid ${INK}; }
.how p, .how li { font-size: 10pt; margin: 0 0 1.4mm; } .how ol, .how ul { margin: 0; padding-left: 5.5mm; }
.how .lead { font-size: 11pt; font-weight: 600; }
.how .note { margin-top: 4mm; padding: 2.5mm 3mm; background: ${YEL}; font-size: 9.5pt; font-weight: 600; }
`;

// ---------- tracker 1: slide the ruler ----------

const COLS = 16;   // Long game: 14 days, plus one for a Heatwave night, plus a spare
const CW = 16.5;   // mm: a column, for a 15 mm fruit tile
const RH = 15.5;   // mm: a stall row
const MH = 31;     // mm: a market row (two tiles deep: a lorry can unload many of one fruit)
const RR = 6.5;    // mm: a row of the ruler
const RT = 3.5;    // mm: the ruler's top strip
const LW = 13;     // mm: the label column

const cells = () => Array.from({ length: COLS }, (_, k) => `<span class="c"><small>${k + 1}</small></span>`).join('');
const nums = () => `<div class="g nums"><span></span>${Array.from({ length: COLS }, (_, k) => `<span>${k + 1}</span>`).join('')}</div>`;
const track = (who: string) => `<div class="g track">
  <div class="tl"><span></span>${LANES.map((f) => `<i style="--c:${LANE[f]}">${fruit(f, 5)}</i>`).join('')}</div>
  <div class="tr"><span class="lab">${who} freshness ruler lies here · right edge on today's column · one column right each night</span></div>
</div>`;
const rows = (cls: string) => LANES.map((f) => `<div class="g row ${cls}" style="--c:${LANE[f]}"><span class="rl">${fruit(f, 8)}</span>${cells()}</div>`).join('');

function ruler(): string {
  const row = (f: FruitId) => {
    const b = boxes(f);
    const spoiled = Array.from({ length: LONGEST - b.length }, () => '<span class="rc x">&times;</span>').join('');
    return `<div class="rrow" style="--c:${LANE[f]}">${spoiled}${b.map((st) => `<span class="rc" style="background:${TINT[st]}">${LETTER[st]}</span>`).join('')}</div>`;
  };
  return `<div class="ruler"><div class="rtop"><span>Freshness ruler · left of it: spoiled</span><b>Today</b></div>${LANES.map(row).join('')}</div>`;
}

const RULER_CSS = `
.g { display: grid; grid-template-columns: ${LW}mm repeat(${COLS}, ${CW}mm); }
.nums { height: 4.5mm; margin-top: 1.5mm; } .nums span { display: grid; place-items: center; font: 800 8pt/1 'Archivo', sans-serif; }
.track { height: ${RT + 4 * RR}mm; }
.tl { display: grid; grid-template-rows: ${RT}mm repeat(4, ${RR}mm); }
.tl i { display: grid; place-items: center; border-left: 3mm solid var(--c); background: #fff; box-shadow: inset 0 0 0 0.2mm ${INK}; }
.tr { grid-column: 2 / -1; display: grid; place-items: center; text-align: center; background-color: ${KRAFT};
  background-image: repeating-linear-gradient(90deg, transparent 0 ${CW - 0.3}mm, ${SLATE} ${CW - 0.3}mm ${CW}mm); }
.tr .lab { background: ${KRAFT}; padding: 0.6mm 2mm; color: ${INK}; }
.row { height: ${RH}mm; } .mrow { height: ${MH}mm; }
.rl { display: grid; place-items: center; border-left: 3mm solid var(--c); background: #fff; box-shadow: inset 0 0 0 0.2mm ${INK}; }
.c { position: relative; background: #fff; box-shadow: inset 0 0 0 0.2mm ${INK}; }
.c small { position: absolute; left: 0.9mm; top: 0.6mm; font: 800 5.5pt/1 'Archivo', sans-serif; color: ${SLATE}; }
.row.crate .c { background: color-mix(in srgb, var(--c) 16%, #fff); }
.costs { margin-top: 2mm; display: flex; justify-content: space-between; padding: 1.5mm 3mm; background: ${KRAFT}; font-size: 8pt; font-weight: 600; }
.costs b { font-weight: 800; }
.rulers { display: grid; grid-template-columns: repeat(2, ${LONGEST * CW}mm); gap: 7mm 12mm; justify-content: center; margin-top: 6mm; }
.ruler { width: ${LONGEST * CW}mm; height: ${RT + 4 * RR}mm; outline: 0.3mm dashed ${SLATE}; outline-offset: 1.2mm; background: #fff; box-shadow: inset 0 0 0 0.5mm ${INK}; }
.rtop { height: ${RT}mm; display: flex; align-items: center; justify-content: space-between; background: ${INK}; color: ${PAPER}; font-weight: 800; font-size: 5.5pt; letter-spacing: 0.08em; text-transform: uppercase; }
.rtop span { padding-left: 2mm; } .rtop b { width: ${CW}mm; height: 100%; display: grid; place-items: center; background: ${YEL}; color: ${INK}; }
.rrow { height: ${RR}mm; display: grid; grid-template-columns: repeat(${LONGEST}, ${CW}mm); }
.rc { display: grid; place-items: center; font: 800 11pt/1 'Archivo', sans-serif; box-shadow: inset 0 0 0 0.2mm ${INK}, inset 0 -1.1mm 0 var(--c); padding-bottom: 0.8mm; }
.rc.x { background: ${SLATE}; color: ${PAPER}; }
`;

function rulerHtml(): string {
  const cost = (f: FruitId) => {
    const c = FRUIT[f].cost;
    return `<span>${fruit(f, 5)} <b>${FRUIT[f].name}</b> ${FRUIT[f].unripeSlots ? `G $${c.unripe} · ` : ''}F $${c.fresh} · O $${c.okay} · S $${c.notso}</span>`;
  };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fruit Market tracker test 1: ruler</title><style>${BASE_CSS}${RULER_CSS}</style></head><body>
  <section class="page how">
    <span class="lab">Freshness tracker test · 1 of 2 · no rule changes</span>
    <h1 class="disp">Tracker 1<br>Slide the ruler</h1>
    <p class="lead">Fruit never moves to age. Each piece stays in the column it was bought into, and a ruler slides past it one column a night. The letter on the ruler above a piece is how fresh it is.</p>
    <h2 class="disp">Print and cut</h2>
    <ul>
      <li><b>Stall sheet</b> (page 2, A4 landscape): one for each stall.</li>
      <li><b>Market board</b> (page 3, A4 landscape): one. It takes the place of the fruit boxes on the market mat.</li>
      <li><b>Rulers</b> (page 4): cut out one for each stall and one for the market. Card is best.</li>
      <li>Keep your fruit pieces, shutters, price tags, counters (for cash and price tags) and all the cards.</li>
    </ul>
    <h2 class="disp">Set up</h2>
    <p>Lay each ruler on its track with its <b>right edge on column 1</b>. Stand your shutter on the first black line. On day 1 everything goes into column 1.</p>
    <h2 class="disp">A day</h2>
    <ol>
      <li><b>Morning.</b> Unload the lorry onto the market board in <b>today's column</b>: the column under the right edge of the market's ruler. Fruit that arrives older (the Seconds Lorry's Okay fruit, a ripe mango) goes in the column under the right-most letter it arrives as.</li>
      <li><b>Buy.</b> Take a piece from the market board. Put it in <b>the same column number</b> on your shelf, in that fruit's row. Fruit from earlier days is already there, further left. Do not touch it.</li>
      <li><b>Stock.</b> Behind your shutter, slide the pieces you want to sell <b>straight forward</b> from the shelf row to the crate row of the same fruit, in the same column. A piece under G cannot go in the crate. A piece left in the crate from yesterday may stay or slide back.</li>
      <li><b>Bell.</b> Flip your price tags. Move your shutter back to the second black line: your crate shows, your shelf stays hidden. To read a piece, look up its column to the ruler, in that fruit's row.</li>
      <li><b>Rush.</b> Sell as now. The oldest piece that is fresh enough goes first: that is the one furthest left.</li>
      <li><b>After the rush.</b> Shutter back to the first line. <b>Unsold pieces stay where they are.</b></li>
      <li><b>Night.</b> Every stall and the market slide the ruler <b>one column right</b>, together, where everyone can see. Then throw away any piece under &times; or left of the ruler (a Juice Bar juices up to ${JUICE_CAP} of them).</li>
    </ol>
    <h2 class="disp">Special nights and cards</h2>
    <ul>
      <li><b>Heatwave:</b> slide two columns. <b>Monsoon Downpour:</b> do not slide.</li>
      <li><b>Shade Cloth:</b> before the rulers slide, Pak Din moves his pieces of the named fruit as many columns right as the ruler will slide.</li>
      <li><b>Fridge:</b> move each of your ripe pieces one column right, but never past the right-most F of its fruit. Green pieces stay.</li>
      <li><b>Health Inspector:</b> count your pieces under S.</li>
    </ul>
    <p class="note">What to watch in the test: did anyone put fruit in the wrong column? Could rivals read your crate from across the table? Did every ruler slide, once?</p>
    ${foot('tracker 1, how to use · A4')}
  </section>
  <section class="page land">
    <header class="bar"><b class="disp">Stall · ruler tracker</b><span class="lab">The front of the table is at the top · one sheet for each stall</span></header>
    ${nums()}${track('Your')}
    <div class="band"><span><b>Shutter line 1.</b> The shutter stands here until the bell</span><span>Below: your crate, on sale today</span></div>
    ${rows('crate')}
    <div class="band"><span><b>Shutter line 2.</b> At the bell the shutter steps back to here</span><span>Below: your shelf, kept back and always hidden</span></div>
    ${rows('shelf')}
    ${KEY}
    ${foot('tracker 1, stall sheet · A4 landscape')}
  </section>
  <section class="page land">
    <header class="bar"><b class="disp">Wholesale market · ruler tracker</b><span class="lab">Fruit stays in the column it was unloaded into</span></header>
    ${nums()}${track('The market\'s')}
    <div class="band"><span><b>Today's lorry</b> unloads into the column under the ruler's right edge</span><span>Buy from any column: a piece keeps its column number</span></div>
    ${LANES.map((f) => `<div class="g mrow" style="--c:${LANE[f]}"><span class="rl">${fruit(f, 9)}</span>${cells()}</div>`).join('')}
    <div class="costs"><b class="lab">What a piece costs</b>${LANES.map(cost).join('')}</div>
    ${foot('tracker 1, market board · A4 landscape')}
  </section>
  <section class="page land">
    <header class="bar"><b class="disp">Freshness rulers</b><span class="lab">Cut out along the dashed lines · one for each stall and one for the market</span></header>
    <div class="rulers">${Array.from({ length: 8 }, ruler).join('')}</div>
    ${foot('tracker 1, rulers · A4 landscape')}
  </section>
  </body></html>`;
}

// ---------- tracker 2: slide the fruit, with a crate tray ----------

const BOX = 17;    // mm: a box for a 15 mm fruit tile
const CAP = 4;     // mm: the letter strip on top of a box, which a tile does not cover
const LBL = 24;    // mm: a lane's picture and name
const TAG = 30;    // mm: a price tag

/** One lane of boxes, newest on the right. On the tray green boxes are one hatched block: green fruit cannot be sold. */
function lane(f: FruitId, tray: boolean): string {
  const b = boxes(f);
  const empty = Array.from({ length: LONGEST - b.length }, () => '<span></span>').join('');
  const box = (st: Stage) => `<div class="bx"><span class="cap" style="background:${TINT[st]}"><b>${LETTER[st]}</b> ${WORD[st]}</span></div>`;
  const ripe = b.filter((st) => st !== 'unripe').map(box).join('');
  const green = FRUIT[f].unripeSlots === 0 ? '' : tray
    ? `<div class="no" style="grid-column: span ${FRUIT[f].unripeSlots}"><span class="lab">Green fruit<br>cannot be sold</span></div>`
    : b.filter((st) => st === 'unripe').map(box).join('');
  const side = tray
    ? '<div class="tag"><span class="lab">Price tag</span><small>Face down until the bell</small></div>'
    : `<div class="life"><span class="lab">${b.length} days${FRUIT[f].unripeSlots ? ' · arrives green' : ''}</span></div>`;
  return `<div class="lrow" style="--c:${LANE[f]}"><span class="ll">${fruit(f, 10)}<b class="disp">${FRUIT[f].name}</b></span><div class="bxs">${empty}${ripe}${green}</div>${side}</div>`;
}

const tray = () => `<div class="block tray"><div class="bhead"><b class="disp">Crate tray</b><span class="lab">On sale today · comes out at the bell · cut out along the outer line</span></div>${LANES.map((f) => lane(f, true)).join('')}</div>`;

const TRAY_CSS = `
.block { width: ${4 + LBL + LONGEST * BOX + (LONGEST - 1) * 2 + 4 + TAG}mm; padding: 2mm; margin: 0 auto; background: ${PAPER}; box-shadow: inset 0 0 0 0.8mm ${INK}; }
.block.tray { background: #efe9df; }
.bhead { height: 6mm; display: flex; align-items: center; justify-content: space-between; } .bhead .disp { font-size: 11pt; } .bhead .lab { font-size: 6pt; color: ${SLATE}; }
.lrow { display: flex; align-items: center; margin-top: 2mm; height: ${BOX + CAP}mm; }
.ll { width: ${LBL}mm; flex: none; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.8mm; border-left: 3mm solid var(--c); }
.ll .fr { flex: none; } .ll .disp { font-size: 6pt; line-height: 1; }
.bxs { display: grid; grid-template-columns: repeat(${LONGEST}, ${BOX}mm); gap: 2mm; }
.bx { height: ${BOX + CAP}mm; background: #fff; box-shadow: inset 0 0 0 0.5mm ${INK}; }
.cap { display: flex; align-items: center; justify-content: center; gap: 1mm; height: ${CAP}mm; box-shadow: inset 0 0 0 0.5mm ${INK}; font-weight: 800; font-size: 6pt; letter-spacing: 0.06em; text-transform: uppercase; }
.cap b { font-size: 8pt; }
.no { height: ${BOX + CAP}mm; display: grid; place-items: center; text-align: center; background: repeating-linear-gradient(135deg, #fff 0 1.5mm, ${KRAFT} 1.5mm 3mm); box-shadow: inset 0 0 0 0.3mm ${SLATE}; }
.no .lab { font-size: 5.5pt; color: ${SLATE}; background: #fff; padding: 0.5mm 1mm; }
.tag { width: ${TAG}mm; height: ${BOX}mm; margin-left: 4mm; align-self: flex-end; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 0.5mm dashed ${INK}; background: #fff; }
.tag small { font-size: 5.5pt; color: ${SLATE}; }
.life { width: ${TAG}mm; margin-left: 4mm; text-align: center; } .life .lab { color: ${SLATE}; }
.bay { position: relative; margin: 2mm auto; } .bay .block { background: none; box-shadow: none; outline: 0.5mm dashed ${INK}; outline-offset: -0.4mm; }
.bay .block > * { visibility: hidden; }
.bay .here { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; }
.bay .here .disp { font-size: 16pt; } .bay .here p { margin: 1mm 0 0; font-size: 9pt; }
.rule { margin: 2mm 0; font-size: 9pt; }
.trays { display: flex; flex-direction: column; gap: 7mm; margin-top: 5mm; }
.trays .block { outline: 0.3mm dashed ${SLATE}; outline-offset: 1.5mm; }
`;

function trayHtml(): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fruit Market tracker test 2: tray</title><style>${BASE_CSS}${TRAY_CSS}</style></head><body>
  <section class="page how">
    <span class="lab">Freshness tracker test · 2 of 2 · no rule changes</span>
    <h1 class="disp">Tracker 2<br>Slide the fruit, with a crate tray</h1>
    <p class="lead">Each piece sits in a box that says how fresh it is and slides one box left each night, as on the market mat. What is new: your crate is a loose tray. At the bell the whole tray comes out, so no piece is carried and every piece is already on its letter.</p>
    <h2 class="disp">Print and cut</h2>
    <ul>
      <li><b>Stall sheet</b> (page 2, A4): one for each stall.</li>
      <li><b>Crate trays</b> (page 3, two to a page; print it three times for six stalls): cut out one for each stall. Card is best.</li>
      <li>Keep the market mat, your fruit pieces, shutters, price tags, counters (for cash) and all the cards.</li>
    </ul>
    <h2 class="disp">Set up</h2>
    <p>Stand your shutter in front of your stall sheet. Lay your tray on the dashed bay, so that its boxes line up with the shelf boxes behind it.</p>
    <h2 class="disp">A day</h2>
    <ol>
      <li><b>Morning.</b> Unload the lorry onto the market mat, as now.</li>
      <li><b>Buy.</b> Put the piece in the shelf box with <b>the same letter and place</b> as the box it left on the market mat. New fruit lands in the right-hand box of its row. Fruit from earlier days is already further left.</li>
      <li><b>Stock.</b> Behind your shutter, slide the pieces you want to sell <b>straight forward</b> from a shelf box onto the tray box in line with it. Green fruit cannot go on the tray. A piece left on the tray from yesterday may stay or slide back.</li>
      <li><b>Pricing.</b> Lay each price tag face down on the tray, beside its fruit.</li>
      <li><b>Bell.</b> Flip your tags and slide <b>the whole tray</b> out in front of your shutter. Every piece is on its own letter.</li>
      <li><b>Rush.</b> Sell as now. The oldest piece that is fresh enough goes first: that is the one furthest left.</li>
      <li><b>After the rush.</b> Pull the tray back onto its bay. <b>Unsold pieces stay on the tray.</b> Wipe your tags.</li>
      <li><b>Night.</b> Every piece on your tray and your shelf, and on the market mat, slides <b>one box left</b>. A piece that leaves the S box is thrown away (a Juice Bar juices up to ${JUICE_CAP} of them).</li>
    </ol>
    <h2 class="disp">Special nights and cards</h2>
    <ul>
      <li><b>Heatwave:</b> two boxes left. <b>Monsoon Downpour:</b> nothing slides.</li>
      <li><b>Shade Cloth:</b> Pak Din's pieces of the named fruit do not slide tonight.</li>
      <li><b>Fridge:</b> move each of your ripe pieces one box right, but never past the right-most F of its fruit. Green pieces stay.</li>
      <li><b>Health Inspector:</b> count your pieces in S boxes.</li>
    </ul>
    <p class="note">What to watch in the test: did anyone miss a slide, or slide twice, behind the shutter? Did the tray stay in line with the shelf? Was the crate easy to read at the bell?</p>
    ${foot('tracker 2, how to use · A4')}
  </section>
  <section class="page">
    <header class="bar"><b class="disp">Stall · tray tracker</b><span class="lab">The front of the table is at the top · one sheet for each stall</span></header>
    <div class="band" style="margin-top:2mm"><span><b>Shutter.</b> It stands in front of this sheet all game</span><span>Counter and cash are in front of it</span></div>
    <div class="bay">${tray()}<div class="here"><div><b class="disp">Crate tray bay</b><p>Your tray lies here until the bell, and comes back here after the rush.</p></div></div></div>
    <div class="block"><div class="bhead"><b class="disp">Shelf</b><span class="lab">Kept back, always hidden · newest fruit on the right · ${BASE_SHELF} pieces in all, tray and shelf (${BARROW_SHELF} with a Handcart)</span></div>${LANES.map((f) => lane(f, false)).join('')}</div>
    ${KEY}
    <p class="rule"><b>Buy:</b> the shelf box with the same letter and place as on the market mat. <b>Stock:</b> straight forward onto the tray. <b>Bell:</b> the whole tray comes out. <b>After the rush:</b> the tray comes back; unsold pieces stay on it.</p>
    <p class="rule"><b>Night:</b> every piece on the tray and the shelf slides one box left. A piece that leaves the S box is thrown away. Heatwave: two boxes. Monsoon Downpour: none.</p>
    ${foot('tracker 2, stall sheet · A4')}
  </section>
  <section class="page">
    <header class="bar"><b class="disp">Crate trays</b><span class="lab">Cut out along the dashed lines · one for each stall</span></header>
    <div class="trays">${tray()}${tray()}</div>
    ${foot('tracker 2, crate trays · A4')}
  </section>
  </body></html>`;
}

// ---------- write the PDFs ----------

async function main() {
  mkdirSync(OUT, { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), 'fm-trackers-'));
  const browser = await chromium.launch();
  try {
    const jobs: [string, string][] = [
      ['Fruit-Market-Tracker-Test-1-Ruler.pdf', rulerHtml()],
      ['Fruit-Market-Tracker-Test-2-Tray.pdf', trayHtml()],
    ];
    for (const [file, html] of jobs) {
      const src = join(tmp, file.replace(/\.pdf$/, '.html'));
      writeFileSync(src, html);
      const page = await browser.newPage();
      await page.goto(pathToFileURL(src).href, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      // Nothing may spill off a page: a clipped box would print wrong without anyone noticing.
      const spills = await page.evaluate(() => [...document.querySelectorAll('.page')].flatMap((pg, i) => {
        const r = pg.getBoundingClientRect();
        return [...pg.querySelectorAll('*')].filter((el) => !el.closest('.foot')).some((el) => {
          const b = el.getBoundingClientRect();
          return b.width > 0 && (b.right > r.right + 0.5 || b.bottom > r.bottom + 0.5 || b.left < r.left - 0.5);
        }) ? [i + 1] : [];
      }));
      if (spills.length) throw new Error(`${file}: content spills off page ${spills.join(', ')}`);
      await page.pdf({ path: join(OUT, file), preferCSSPageSize: true, printBackground: true });
      console.log('wrote', file, `(${await page.evaluate(() => document.querySelectorAll('.page').length)} pages)`);
      await page.close();
    }
  } finally {
    await browser.close();
    rmSync(tmp, { recursive: true, force: true });
  }
}

void main();
