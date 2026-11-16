// The table set (PLAN-111, approved by the owner 2026-11-16): the board in two A3 panels, the stall sheets, the counters
// and the shutters, for a print shop. Everything is a rectangle, so a guillotine cuts it.
//   npx vite-node scripts/print-table.ts [outdir]      (normally: print/table)
// Writes four PDFs:
//   the board: the Wholesale Market (four fruit lanes in the app's style, today's event and tomorrow's lorry beside
//     their decks, the day track) and the customers (today's and tomorrow's rows, the customer deck, the set-up guide);
//   six stall sheets: the crate band in front of the shelf band, two shutter lines, a write-on price box at the end of
//     each crate lane, the Fruit sold row;
//   six counters, four to an A4 sheet: the crate count above the cash track;
//   six shutters, one A3 sheet each, printed on one side and folded in half along its length (double thickness):
//     the half that faces the rivals carries the stall's pattern and name, the other half the day's steps.
// Names, numbers and prices come from the game data (src/engine/data.ts). The cards are in print/kit.
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import {
  BARROW_SHELF, BASE_BUY, BASE_SHELF, BIG_TABLE, CUSTOMER_CARDS, EVENT_CARDS, FRUIT, MARKET_DAY_EVERY, NO_MANGO_DAYS, ROW_CAP, START_CASH,
  stageAt, trackSlots, type FruitId, type Stage,
} from '../src/engine/data';
import { RULES_VERSION } from '../src/net/protocol';
import { fruitSvgString } from '../src/ui/fruitIcons';
import { ROOT } from './print-cards';
import { renderPdf } from './print-render';

const OUT = resolve(process.argv[2] ?? join(ROOT, 'print', 'table'));
const FONT = (pkg: string, file: string) => pathToFileURL(join(ROOT, 'node_modules', '@fontsource', pkg, 'files', file)).href;
const FONTS = ['500 10px Archivo', '600 10px Archivo', '800 10px Archivo', '400 10px Disp'];

const INK = '#1f272a', PAPER = '#fffcf5', KRAFT = '#ddd4c6', YEL = '#fec400', SLATE = '#5a6266', RED = '#c8322c';
const LANE: Record<FruitId, string> = { blueberry: '#3558a2', watermelon: '#0e9a58', mango: '#fec400', apple: '#e73c35' };
const TINT: Record<FruitId, string> = { blueberry: '#dfe3fa', watermelon: '#d6efe1', mango: '#fbecc4', apple: '#fbdcdd' };
const LANES: FruitId[] = ['blueberry', 'watermelon', 'mango', 'apple'];
const LETTER: Record<Stage, string> = { unripe: 'G', fresh: 'F', okay: 'O', notso: 'S' };
/** The six stalls, by their pattern (the same patterns as the earlier counters). */
export const STALLS = ['Stripes', 'Dots', 'Checks', 'Zigzag', 'Bars', 'Diamonds'] as const;
const DAYS = 14;
const GUEST_COUNT = EVENT_CARDS.filter((e) => e.extra).length;
const [SOFT_LESS, OKAY_LESS] = FRUIT.apple.drop;

const fruit = (f: FruitId, mm: number) => `<span class="fr" style="width:${mm}mm;height:${mm}mm">${fruitSvgString(f, 'fresh', 32)}</span>`;
/** A lane's boxes, oldest (Soft) first: the ripe stages, then the green ones. */
const boxes = (f: FruitId): Stage[] => [...FRUIT[f].ripe.map((_, pos) => stageAt(f, pos)), ...Array.from({ length: FRUIT[f].unripeSlots }, () => 'unripe' as Stage)];
const MAXBOX = Math.max(...LANES.map((f) => boxes(f).length));
const pat = (name: string) => `pat-${name.toLowerCase()}`;

const BASE = `
@font-face { font-family: 'Archivo'; font-weight: 500; src: url('${FONT('archivo', 'archivo-latin-500-normal.woff2')}'); }
@font-face { font-family: 'Archivo'; font-weight: 600; src: url('${FONT('archivo', 'archivo-latin-600-normal.woff2')}'); }
@font-face { font-family: 'Archivo'; font-weight: 800; src: url('${FONT('archivo', 'archivo-latin-800-normal.woff2')}'); }
@font-face { font-family: 'Disp'; src: url('${FONT('archivo-black', 'archivo-black-latin-400-normal.woff2')}'); }
* { box-sizing: border-box; }
html, body { margin: 0; }
body { font: 500 9pt/1.25 'Archivo', sans-serif; color: ${INK}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { position: relative; background: ${PAPER}; overflow: hidden; page-break-after: always; }
.disp { font-family: 'Disp', sans-serif; font-weight: 400; letter-spacing: 0.01em; }
.lab { font-weight: 800; font-size: 6.5pt; letter-spacing: 0.12em; text-transform: uppercase; }
.fr { display: inline-block; vertical-align: middle; } .fr svg { width: 100%; height: 100%; display: block; }
.bar { display: flex; align-items: center; gap: 3mm; background: ${INK}; color: ${PAPER}; padding: 0 3mm; }
.bar .disp { font-size: 15pt; } .bar .y { color: ${YEL}; }
.sw { display: inline-block; width: 8mm; height: 8mm; box-shadow: 0 0 0 0.6mm ${PAPER}; background-color: ${PAPER}; flex: none; }
.pat-stripes { background-image: repeating-linear-gradient(90deg, ${INK} 0 1.6mm, ${PAPER} 0 3.2mm); }
.pat-bars { background-image: repeating-linear-gradient(0deg, ${INK} 0 1.6mm, ${PAPER} 0 3.2mm); }
.pat-dots { background-image: radial-gradient(circle, ${INK} 0 32%, transparent 34%); background-size: 3mm 3mm; }
.pat-checks { background-image: repeating-conic-gradient(${INK} 0 25%, ${PAPER} 0 50%); background-size: 4mm 4mm; }
.pat-diamonds { background-image: linear-gradient(45deg, ${INK} 25%, transparent 25% 75%, ${INK} 75%), linear-gradient(45deg, ${INK} 25%, transparent 25% 75%, ${INK} 75%); background-size: 3mm 3mm; background-position: 0 0, 1.5mm 1.5mm; }
.pat-zigzag { background-image: linear-gradient(135deg, ${INK} 25%, transparent 25%), linear-gradient(225deg, ${INK} 25%, transparent 25%), linear-gradient(315deg, ${INK} 25%, transparent 25%), linear-gradient(45deg, ${INK} 25%, transparent 25%); background-size: 3mm 3mm; background-position: -1.5mm 0, -1.5mm 0, 0 0, 0 0; }
.slot { border: 0.5mm dashed ${SLATE}; background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 1mm; color: ${SLATE}; }
.slot b { color: ${INK}; font-weight: 800; font-size: 7.5pt; letter-spacing: 0.08em; text-transform: uppercase; }
.slot small { font-size: 6.5pt; padding: 0 3mm; }
.card { width: 63mm; height: 88mm; flex: none; }
.foot { position: absolute; left: 0; right: 0; bottom: 2.5mm; text-align: center; font-weight: 800; font-size: 5.5pt; letter-spacing: 0.14em; text-transform: uppercase; color: ${SLATE}; }
.ltr { display: inline-grid; place-items: center; width: 5mm; height: 5mm; border-radius: 50%; background: ${INK}; color: ${PAPER}; font-weight: 800; font-size: 7pt; flex: none; }
.ltr.G { background: #3c7a3f; }
`;
const doc = (size: string, w: number, h: number, css: string, pages: string[]) => `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: ${size}; margin: 0; }
${BASE}
.page { width: ${w}mm; height: ${h}mm; }
${css}</style></head><body>${pages.map((p) => `<section class="page">${p}</section>`).join('')}</body></html>`;
const foot = (what: string) => `<div class="foot">Fruit Market · ${what} · rules version ${RULES_VERSION} · print at 100% (actual size)</div>`;

// ---------- the board: two A3 landscape panels ----------
export function boardHtml(): string {
  const market = (d: number) => d % MARKET_DAY_EVERY === 0 && d < DAYS;
  const end: Record<number, string> = { 8: 'Quick ends', 10: 'Standard ends', 14: 'Long ends' };
  const lane = (f: FruitId) => `<div class="mlane"><div class="mh" style="background:${LANE[f]};${f === 'mango' ? `color:${INK}` : ''}"><span class="badge">${fruit(f, 6.5)}</span><span>${FRUIT[f].plural}<small>${FRUIT[f].ripe.length} days${FRUIT[f].unripeSlots ? ` + ${FRUIT[f].unripeSlots} green` : ''}</small></span></div>
${trackSlots(f).map((s) => `<div class="mb ${s.stage === 'unripe' ? 'g' : ''}"><span class="ltr ${LETTER[s.stage]}">${LETTER[s.stage]}</span><span class="cost">$${s.cost}</span><span class="life">${s.life}</span>${s.entry ? '<span class="in">▼ LORRY</span>' : ''}</div>`).join('')}
<div class="down">▼ each night every piece moves down one box ▼<br>out of S: thrown away</div></div>`;
  const slot = (title: string, sub: string, cls = '') => `<div class="slot card ${cls}"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
  const left = `<div class="bar top"><span class="disp">WHOLESALE MARKET</span><span class="lab y" style="flex:1">Buy from any box: pay its price, and put the piece in your shelf box with the same letter and place</span></div>
<div class="main"><div class="lanes">${LANES.map(lane).join('')}</div>
<div class="side">
  <div class="pair">${slot("Today's event", 'Face up until night. No event on Day 1', 'up')}${slot('Event deck', "Face down. From Day 2, flip the top card onto today's event each morning")}</div>
  <div class="pair">${slot("Tomorrow's lorry", 'Face up. Each morning unload this lorry into the ▼ LORRY boxes, then flip the next one on top of it', 'up')}${slot('Lorry deck', 'Face down. Shuffle the used lorries into a new deck when it runs out')}</div>
  <span class="lab">Day track · the day marker moves on each night</span>
  <div class="track">${Array.from({ length: DAYS }, (_, i) => i + 1).map((d) => `<span class="${market(d) ? 'md' : ''} ${end[d] ? 'end' : ''}"><b>${d}</b>${market(d) ? '<i>Market Day</i>' : ''}${end[d] ? `<i>${end[d]}</i>` : ''}</span>`).join('')}</div>
  <span class="note">The Seconds Lorry unloads into the freshest O box instead.</span>
</div></div>
${foot('board · left panel · the customers panel lies on its right · A3 landscape')}`;
  const walkIns = ROW_CAP - 1;
  const guide = [
    `<b>Set-up.</b> Shuffle the ${CUSTOMER_CARDS.length} customer cards face down on the deck space. Keep the ${GUEST_COUNT} guest cards aside: events bring them in.`,
    `<b>A day's crowd.</b> 1 regular face up, plus 1 walk-in face down for every stall after the first, up to ${walkIns}.`,
    `<b>Days 1${NO_MANGO_DAYS > 1 ? ` and ${NO_MANGO_DAYS}` : ''}.</b> No mango customers: a card showing a mango goes to the bottom of the deck; deal another.`,
    `<b>Each morning</b> deal tomorrow's row the same way. Deal nothing after the last day.`,
    `<b>At stocking</b> turn today's walk-ins face up.`,
    `<b>Row order, left to right:</b> a standing order due today, the regular, the walk-ins as drawn, then a guest. Never more than ${ROW_CAP} cards: a standing order takes the last walk-in's place. A guest joins the end even of a full row.`,
    `<b>${BIG_TABLE} stalls.</b> Each customer wants one more of the fruit marked "+1 at ${BIG_TABLE} stalls".`,
    `<b>After the rush</b> every customer leaves, served or not, onto the discard pile.`,
    `<b>At night</b> tomorrow's row moves up to become today's.`,
    `<b>Deck empty?</b> Shuffle the discard pile into a new deck.`,
  ];
  const right = `<div class="bar top"><span class="disp">THE CUSTOMERS</span></div>
<div class="rh"><span class="disp">TODAY</span></div>
<div class="row">${Array.from({ length: ROW_CAP }, () => slot('', '')).join('')}${slot('Guest', '', 'up')}</div>
<div class="rh"><span class="disp">TOMORROW</span></div>
<div class="row">${slot('Regular', 'Face up')}${Array.from({ length: walkIns }, (_, i) => slot(`Walk-in ${i + 1}`, 'Face down')).join('')}${slot('Customer deck', 'Face down')}</div>
<ol class="guide">${guide.map((g) => `<li>${g}</li>`).join('')}</ol>
${foot('board · right panel · lies on the right of the Wholesale Market · A3 landscape')}`;
  const css = `
.page { padding: 7mm 8mm 9mm; display: flex; flex-direction: column; gap: 3mm; }
.top { height: 11mm; flex: none; }
.main { flex: 1; display: flex; gap: 5mm; min-height: 0; }
.lanes { flex: 1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 2.6mm; align-items: start; }
.mlane { display: flex; flex-direction: column; gap: 1.6mm; }
.mh { height: 13mm; display: flex; align-items: center; gap: 1.6mm; padding: 0 2mm; color: #fff; font-weight: 800; font-size: 7.6pt; text-transform: uppercase; letter-spacing: 0.04em; line-height: 1.1; }
.mh .badge { width: 8.5mm; height: 8.5mm; border-radius: 50%; background: #fff; display: grid; place-items: center; flex: none; }
.mh small { display: block; font-size: 5.8pt; font-weight: 700; letter-spacing: 0.03em; }
.mb { height: 34mm; background: #fff; box-shadow: inset 0 0 0 0.6mm ${INK}; position: relative; padding: 2mm; }
.mb.g { background: repeating-linear-gradient(135deg, #fff 0 2mm, #e4efd9 2mm 4mm); }
.mb .cost { position: absolute; right: 2.2mm; top: 1.6mm; font-family: 'Disp'; font-size: 14pt; }
.mb .life { position: absolute; left: 2.2mm; bottom: 1.6mm; font-size: 6pt; font-weight: 700; color: ${SLATE}; text-transform: uppercase; letter-spacing: 0.05em; }
.mb .in { position: absolute; right: 2mm; bottom: 1.6mm; background: ${INK}; color: ${YEL}; font-size: 5.6pt; font-weight: 800; letter-spacing: 0.06em; padding: 0.6mm 1.2mm; }
.mb .ltr { width: 6.5mm; height: 6.5mm; font-size: 9pt; }
.side { width: 130mm; flex: none; display: flex; flex-direction: column; gap: 3mm; }
.pair { display: flex; gap: 4mm; }
.up { border-color: ${INK}; background: #fff8e0; }
.down { font-size: 6.2pt; font-weight: 700; color: ${SLATE}; text-align: center; letter-spacing: 0.03em; }
.track { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1.2mm; }
.track span { height: 13mm; background: #fff; box-shadow: inset 0 0 0 0.5mm ${INK}; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.3mm; }
.track b { font-family: 'Disp'; font-weight: 400; font-size: 12pt; line-height: 1; }
.track i { font-style: normal; font-size: 4.6pt; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; text-align: center; line-height: 1.1; }
.track .md { background: ${YEL}; }
.track .end { box-shadow: inset 0 0 0 0.5mm ${INK}, inset 0 -1.8mm 0 ${INK}; }
.note { font-size: 6.6pt; font-weight: 600; }
.row { display: flex; gap: 4mm; }
.rh .disp { font-size: 13pt; }
.guide { margin: 2mm 0 0; padding: 4mm 5mm 3mm 10mm; background: #fff; box-shadow: inset 0 0 0 0.5mm ${INK}; columns: 2; column-gap: 10mm; font-size: 9.5pt; line-height: 1.35; }
.guide li { break-inside: avoid; margin-bottom: 1.6mm; }
`;
  return doc('A3 landscape', 420, 297, css, [left, right]);
}

// ---------- stall sheets: A4 landscape, one per stall ----------
export function stallHtml(): string {
  const BW = 24, BH = 15.5, TAG = 34;
  const lane = (f: FruitId, crate: boolean) => {
    const bs = boxes(f);
    const cells = Array.from({ length: MAXBOX }, (_, i) => {
      const st = bs[i];
      if (!st) return '<span class="cell none"></span>';
      if (st === 'unripe' && crate) return '<span class="cell no"><span class="ltr G">G</span><i>not in a crate</i></span>';
      return `<span class="cell ${st === 'unripe' ? 'g' : ''}" style="${crate && st !== 'unripe' ? `background:${TINT[f]}` : ''}"><span class="ltr">${LETTER[st]}</span></span>`;
    }).join('');
    const price = crate ? '<span class="price"><b>PRICE $</b><span class="wr"></span><i>write it with your pen</i></span>' : '';
    return `<div class="lane" style="--c:${LANE[f]}"><span class="lh">${fruit(f, 9)}<b>${FRUIT[f].name}</b></span><span class="cells">${cells}</span>${price}</div>`;
  };
  const sheet = (name: string) => `
<div class="bar top"><span class="disp">STALL</span><span class="sw ${pat(name)}"></span><span class="lab y" style="flex:1">${name}</span><span class="lab">▲ Rivals sit this side</span></div>
<div class="line"><span>LINE 1 · THE SHUTTER STANDS HERE UNTIL THE BELL</span><em>Stocking and writing prices: nobody sees past it</em></div>
<div class="band crate"><div class="bh"><span class="lab">Your crate · today's sale</span><span class="lab" style="color:${SLATE}">Slide a piece up from the shelf box below it (not green). Write a price for each fruit you sell.</span></div>
${LANES.map((f) => lane(f, true)).join('')}</div>
<div class="line"><span>LINE 2 · AT THE BELL THE SHUTTER STEPS BACK HERE</span><em>All together: your crate and prices show; your shelf stays hidden</em></div>
<div class="band shelf"><div class="bh"><span class="lab">Your shelf · always hidden · holds ${BASE_SHELF} (${BARROW_SHELF} with a Handcart)</span><span class="lab" style="color:${SLATE}">Bought fruit goes in the box with the same letter and place as at the market</span></div>
${LANES.map((f) => lane(f, false)).join('')}</div>
<div class="sold"><span class="lab">Fruit sold · cross off one for each piece you sell · only needed if stalls tie on cash at the end</span><div class="sg">${Array.from({ length: 80 }, (_, i) => `<span class="${(i + 1) % 10 === 0 ? 'ten' : ''}">${i + 1}</span>`).join('')}</div></div>
${foot(`stall sheet · ${name} · A4 landscape`)}`;
  const css = `
.page { padding: 6mm 8mm 9mm; }
.top { height: 9mm; }
.line { position: relative; height: 0; border-top: 0.8mm dashed ${RED}; margin: 3.2mm 0 2.6mm; }
.line span { position: absolute; left: 0; top: -2.4mm; background: ${PAPER}; color: ${RED}; padding-right: 2mm; font-weight: 800; font-size: 6.6pt; letter-spacing: 0.1em; }
.line em { position: absolute; right: 0; top: -2.4mm; background: ${PAPER}; color: ${SLATE}; padding-left: 2mm; font-style: normal; font-weight: 700; font-size: 6.3pt; letter-spacing: 0.06em; text-transform: uppercase; }
.band { padding: 1.4mm 2mm 1.6mm; }
.band.crate { background: #fff6d0; box-shadow: inset 0 0 0 0.5mm ${YEL}; }
.band.shelf { background: #eef0f3; box-shadow: inset 0 0 0 0.5mm ${SLATE}; }
.bh { display: flex; justify-content: space-between; margin-bottom: 0.8mm; }
.lane { display: flex; align-items: center; gap: 2mm; height: ${BH + 1.6}mm; border-left: 2.2mm solid var(--c); padding-left: 1.6mm; }
.lh { width: 19mm; display: flex; flex-direction: column; align-items: flex-start; gap: 0.4mm; } .lh b { font-weight: 800; font-size: 6.5pt; text-transform: uppercase; letter-spacing: 0.06em; }
.cells { display: flex; gap: 1.6mm; }
.cell { width: ${BW}mm; height: ${BH}mm; background: #fff; box-shadow: inset 0 0 0 0.45mm ${INK}; position: relative; padding: 1mm; }
.cell.g { background: repeating-linear-gradient(135deg, #fff 0 1.5mm, #e4efd9 1.5mm 3mm); }
.cell.no { background: repeating-linear-gradient(135deg, #fff 0 1.5mm, ${KRAFT} 1.5mm 3mm); box-shadow: inset 0 0 0 0.3mm ${SLATE}; opacity: 0.8; }
.cell.no i { position: absolute; left: 1mm; bottom: 0.8mm; font-size: 5pt; font-style: normal; font-weight: 700; color: ${SLATE}; }
.cell.none { box-shadow: none; background: transparent; }
.price { margin-left: auto; width: ${TAG}mm; height: ${BH}mm; box-shadow: inset 0 0 0 0.6mm ${INK}; background: #fff; display: flex; flex-direction: column; justify-content: center; padding: 0 2.5mm; gap: 1mm; }
.price b { font-family: 'Disp'; font-weight: 400; font-size: 11pt; }
.price .wr { border-bottom: 0.35mm solid ${SLATE}; height: 0; }
.price i { font-style: normal; font-weight: 600; font-size: 5.3pt; color: ${SLATE}; }
.sold { margin-top: 2mm; } .sg { display: grid; grid-template-columns: repeat(40, 1fr); margin-top: 0.8mm; }
.sg span { height: 5mm; display: grid; place-items: center; font-size: 5pt; font-weight: 600; background: #fff; box-shadow: inset 0 0 0 0.2mm ${INK}; } .sg span.ten { background: ${KRAFT}; }
`;
  return doc('A4 landscape', 297, 210, css, STALLS.map(sheet));
}

// ---------- counters: four to an A4 landscape sheet ----------
export function counterHtml(): string {
  const counter = (name: string) => `
<div class="ctr">
  <div class="bar ch"><span class="disp">COUNTER</span><span class="sw ${pat(name)}"></span><span class="lab y" style="flex:1">${name}</span><span class="lab">Public</span></div>
  <div class="box"><span class="lab">Crate count · how many pieces you're selling today</span>
    <div class="grid count">${Array.from({ length: BARROW_SHELF + 1 }, (_, i) => `<span>${i}</span>`).join('')}</div></div>
  <div class="box">
    <span class="lab">Cash · tens marker, then ones marker</span>
    <div class="grid">${Array.from({ length: 20 }, (_, i) => `<span class="${i * 10 === Math.floor(START_CASH / 10) * 10 ? 'on' : ''}">${i * 10}</span>`).join('')}</div>
    <div class="grid">${Array.from({ length: 10 }, (_, i) => `<span class="${i === START_CASH % 10 ? 'on' : ''}">+${i}</span>`).join('')}</div>
    <span class="note">Yellow = where you start: $${START_CASH}. Past $199, take a +$200 chip.</span>
  </div>
</div>`;
  const pages: string[] = [];
  for (let i = 0; i < STALLS.length; i += 4) {
    const four = STALLS.slice(i, i + 4);
    pages.push(`${four.map(counter).join('')}${'<div></div>'.repeat(4 - four.length)}${foot('counters · cut on the dashed lines · A4 landscape')}`);
  }
  const css = `
.page { padding: 6mm 7mm 9mm; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 4mm; }
.ctr { border: 0.5mm dashed ${SLATE}; padding: 2.5mm 3mm; display: flex; flex-direction: column; gap: 2.4mm; }
.ch { height: 8mm; } .ch .disp { font-size: 12pt; }
.box { background: #fff; box-shadow: inset 0 0 0 0.6mm ${INK}; padding: 1.6mm 2mm; display: flex; flex-direction: column; gap: 1mm; }
.grid { display: grid; grid-template-columns: repeat(10, 1fr); } .grid span { height: 9mm; display: grid; place-items: center; box-shadow: inset 0 0 0 0.25mm ${INK}; background: #fff; font-weight: 800; font-size: 8pt; }
.count { grid-template-columns: repeat(${BARROW_SHELF + 1}, 1fr); } .count span { height: 10mm; font-size: 9pt; }
.on { background: ${YEL} !important; }
.note { font-size: 6pt; color: ${SLATE}; font-weight: 600; }
`;
  return doc('A4 landscape', 297, 210, css, pages);
}

// ---------- shutters: one A3 sheet each, folded in half along its length ----------
export function shutterHtml(): string {
  const W = 420, HALF = 148.5, WING = 70;
  const steps = [
    ['1 Morning', "News, lorry, tomorrow's crowd. Market Day: bid for the standing order with your bid card."],
    ['2 Buying', `Poorest first. Up to ${BASE_BUY} pieces into your shelf, same letter and place.`],
    ['3 Stocking', 'Slide pieces up into your crate. Set your crate count. Write a price on each crate lane you sell.'],
    ['4 The bell', 'When everyone is ready, all step the shutter back to line 2 together.'],
    ['5 The rush', 'Cheapest first; your oldest piece that qualifies goes. Shutter back to line 1.'],
  ];
  const folds = `<div class="fold v" style="left:${WING}mm"></div><div class="fold v" style="left:${W - WING}mm"></div>`;
  const sheet = (name: string) => `
<div class="half inside">
  <div class="wing" style="background:${KRAFT}"></div>
  <div class="mid"><div class="steps">${steps.map(([t, s]) => `<div><b>${t}</b>${s}</div>`).join('')}</div>
    <p class="eve">Evening: favour cards, an upgrade after a Market Day, then "lights out". Night: every piece slides one box left.</p>
    <div class="keyrow"><span><span class="ltr G">G</span>Green: can't be sold yet</span><span><span class="ltr">F</span>Fresh: the customer's price</span><span><span class="ltr">O</span>Okay: $${OKAY_LESS} less</span><span><span class="ltr">S</span>Soft: $${SOFT_LESS} less</span></div>
    <div class="keyrow"><span><b>A customer's top price:</b></span><span>the top: Fresh only</span><span>top − 1: Fresh or Okay</span><span>top − 2 or less: any fruit</span><span>above the top: nothing</span></div>
  </div>
  <div class="wing" style="background:${KRAFT}"></div>
  ${folds}
</div>
<div class="fold h"><span>FOLD IN HALF HERE, PRINTED SIDE OUT · THEN FOLD THE TWO ENDS BACK ALONG THE DASHED LINES SO IT STANDS</span></div>
<div class="half outside">
  <div class="wing ${pat(name)}"></div>
  <div class="mid"><div class="awn"></div><div class="name"><span class="lab">Fruit Market</span><span class="disp">${name.toUpperCase()}</span></div><div class="bot ${pat(name)}"></div></div>
  <div class="wing ${pat(name)}"></div>
  ${folds}
</div>
${foot(`shutter · ${name} · A3 landscape, one side`)}`;
  const css = `
.page { display: flex; flex-direction: column; }
.half { position: relative; width: ${W}mm; height: ${HALF}mm; display: flex; }
.inside { transform: rotate(180deg); }
.wing { width: ${WING}mm; height: 100%; flex: none; background-size: 12mm 12mm; }
.mid { flex: 1; position: relative; }
.fold.v { position: absolute; top: 0; bottom: 0; width: 0; border-left: 0.5mm dashed ${SLATE}; }
.fold.h { position: relative; height: 0; border-top: 0.5mm dashed ${SLATE}; z-index: 2; }
.fold.h span { position: absolute; left: 50%; top: -2mm; transform: translateX(-50%); background: ${PAPER}; padding: 0 2mm; font-weight: 800; font-size: 5.5pt; letter-spacing: 0.12em; color: ${SLATE}; white-space: nowrap; }
.awn { height: 26mm; background-image: repeating-linear-gradient(90deg, ${RED} 0 14mm, ${PAPER} 0 28mm); border-bottom: 1mm solid ${INK}; }
.name { position: absolute; left: 0; right: 0; top: 40mm; text-align: center; }
.name .disp { font-size: 40pt; display: block; line-height: 1; } .name .lab { font-size: 9pt; }
.bot { position: absolute; left: 0; right: 0; bottom: 0; height: 22mm; }
.outside .wing.pat-stripes, .outside .bot.pat-stripes { background-image: repeating-linear-gradient(90deg, ${INK} 0 6mm, ${PAPER} 0 12mm); }
.outside .wing.pat-bars, .outside .bot.pat-bars { background-image: repeating-linear-gradient(0deg, ${INK} 0 6mm, ${PAPER} 0 12mm); }
.outside .wing.pat-dots, .outside .bot.pat-dots { background-size: 10mm 10mm; }
.outside .wing.pat-checks, .outside .bot.pat-checks { background-size: 14mm 14mm; }
.outside .wing.pat-diamonds, .outside .bot.pat-diamonds { background-size: 10mm 10mm; background-position: 0 0, 5mm 5mm; }
.outside .wing.pat-zigzag, .outside .bot.pat-zigzag { background-size: 10mm 10mm; background-position: -5mm 0, -5mm 0, 0 0, 0 0; }
.steps { padding: 8mm 8mm 0; display: grid; grid-template-columns: repeat(5, 1fr); gap: 3mm; }
.steps div { background: #fff; box-shadow: inset 0 0 0 0.5mm ${INK}; padding: 2.5mm; font-size: 7pt; font-weight: 600; }
.steps b { display: block; font-family: 'Disp'; font-weight: 400; font-size: 10pt; margin-bottom: 1mm; }
.eve { margin: 4mm 8mm 0; font-weight: 700; font-size: 7.5pt; }
.keyrow { margin: 4mm 8mm 0; display: flex; gap: 6mm; font-size: 8pt; font-weight: 600; flex-wrap: wrap; } .keyrow > span { display: inline-flex; align-items: center; gap: 1.5mm; } .keyrow .ltr { width: 6mm; height: 6mm; }
.foot { bottom: auto; top: ${HALF - 6}mm; color: transparent; }
`;
  return doc('A3 landscape', 420, 297, css, STALLS.map(sheet));
}

// ---------- bid cards and tokens: one A4 portrait sheet ----------
/** What each stall's pieces are, in its own pattern: the two cash markers, the crate-count marker and the served-alone chips. */
export const STALL_TOKENS = [['Tens', 1], ['Ones', 1], ['Crate', 1], ['Alone', 6]] as const;
/** The shared tokens. */
export const SHARED_TOKENS = [['Day', 1], ['First', 1], ['Shade Cloth', 1], ['+$200', 6]] as const;

/** The six patterns as vector SVG patterns: on many small tokens, CSS gradients would be printed as large pictures. */
const SVG_PATTERNS = `<svg width="0" height="0" style="position:absolute"><defs>
<pattern id="p-stripes" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="${PAPER}"/><rect width="1.5" height="3" fill="${INK}"/></pattern>
<pattern id="p-bars" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="${PAPER}"/><rect width="3" height="1.5" fill="${INK}"/></pattern>
<pattern id="p-dots" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="${PAPER}"/><circle cx="1.5" cy="1.5" r="0.95" fill="${INK}"/></pattern>
<pattern id="p-checks" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="${PAPER}"/><rect width="2" height="2" fill="${INK}"/><rect x="2" y="2" width="2" height="2" fill="${INK}"/></pattern>
<pattern id="p-diamonds" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="${PAPER}"/><path d="M1.5 0.3 L2.7 1.5 L1.5 2.7 L0.3 1.5Z" fill="${INK}"/></pattern>
<pattern id="p-zigzag" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="${PAPER}"/><path d="M0 2 L1.5 0.5 L3 2 L3 3 L1.5 1.5 L0 3Z" fill="${INK}"/></pattern>
</defs></svg>`;
const svgPat = (name: string) => `<svg class="sp" viewBox="0 0 30 30" preserveAspectRatio="xMidYMid slice"><rect width="30" height="30" fill="url(#p-${name.toLowerCase()})"/></svg>`;

export function tokensHtml(): string {
  const bid = (name: string) => `<div class="bid"><div class="bh">${svgPat(name)}</div><div class="bb"><span class="lab">${name} · bid card</span>
<b class="disp">BID $</b><span class="wr"></span><small>per piece, for today's standing order</small>
<p>Write your price, lay the card face down in front of your shutter. Change it while any stall is still deciding. When the last stall decides, flip all bid cards together: the lowest bid wins.</p></div></div>`;
  const tok = (name: string, label: string, cls = '') => `<span class="tk ${cls}"><i>${svgPat(name)}</i><b>${label}</b></span>`;
  const stallRows = STALLS.map((name) => `<div class="tr"><span class="tn">${name}</span>${STALL_TOKENS.flatMap(([label, n]) => Array.from({ length: n }, () => tok(name, label))).join('')}</div>`).join('');
  const shared = SHARED_TOKENS.flatMap(([label, n]) => Array.from({ length: n }, () => `<span class="tk shared ${label === 'First' ? 'first' : ''}"><b>${label}</b></span>`)).join('');
  const body = `${SVG_PATTERNS}<div class="bids">${STALLS.map(bid).join('')}</div>
<div class="toks"><span class="lab">Tokens · cut on the lines · each stall's pieces carry its pattern</span>${stallRows}<div class="tr"><span class="tn">Shared</span>${shared}</div></div>
${foot('bid cards and tokens · A4 portrait')}`;
  const css = `
.page { padding: 5mm 6.5mm 8mm; display: flex; flex-direction: column; gap: 3mm; }
.bids { display: grid; grid-template-columns: repeat(3, 63mm); grid-auto-rows: 88mm; gap: 0; justify-content: center; }
.bid { border: 0.3mm dashed ${SLATE}; background: #fff; display: flex; flex-direction: column; }
.bid .bh { height: 14mm; border-bottom: 0.6mm solid ${INK}; }
.bid .bb { padding: 3mm 4mm; display: flex; flex-direction: column; gap: 1.5mm; }
.bid .disp { font-size: 26pt; margin-top: 3mm; } .bid .wr { border-bottom: 0.4mm solid ${SLATE}; height: 9mm; }
.bid small { font-size: 6.5pt; color: ${SLATE}; font-weight: 700; } .bid p { margin: 2mm 0 0; font-size: 6.6pt; line-height: 1.3; }
.toks { display: flex; flex-direction: column; align-items: center; gap: 0; }
.toks > .lab { margin-bottom: 1.5mm; }
.tr { display: flex; align-items: center; }
.tn { width: 16mm; font-weight: 800; font-size: 6pt; text-transform: uppercase; letter-spacing: 0.06em; }
.tk { width: 13.5mm; height: 13.5mm; box-shadow: inset 0 0 0 0.25mm ${SLATE}; background: #fff; display: flex; flex-direction: column; align-items: stretch; }
.tk i { flex: 1; margin: 1.2mm 1.2mm 0; display: block; position: relative; }
.sp { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.bid .bh { position: relative; }
.tk b { text-align: center; font-weight: 800; font-size: 5.6pt; letter-spacing: 0.04em; text-transform: uppercase; padding: 0.6mm 0 1mm; }
.tk.shared { justify-content: center; background: ${YEL}; } .tk.shared b { font-size: 6pt; }
.tk.first { background: ${RED}; color: ${PAPER}; }
`;
  return doc('A4 portrait', 210, 297, css, [body]);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), 'fm-table-'));
  const browser = await chromium.launch();
  try {
    await renderPdf(browser, tmp, OUT, 'Fruit-Market-Board-2xA3.pdf', boardHtml(), FONTS);
    await renderPdf(browser, tmp, OUT, 'Fruit-Market-Stall-Sheets-6xA4.pdf', stallHtml(), FONTS);
    await renderPdf(browser, tmp, OUT, 'Fruit-Market-Counters-2xA4.pdf', counterHtml(), FONTS);
    await renderPdf(browser, tmp, OUT, 'Fruit-Market-Shutters-6xA3.pdf', shutterHtml(), FONTS);
    await renderPdf(browser, tmp, OUT, 'Fruit-Market-Bid-Cards-and-Tokens-A4.pdf', tokensHtml(), FONTS);
  } finally {
    await browser.close();
    rmSync(tmp, { recursive: true, force: true });
  }
}

// Tests import the page builders (tests/print-table.test.ts); only a run from the command line writes the PDFs.
if (!process.env.VITEST) {
  main().catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
}
