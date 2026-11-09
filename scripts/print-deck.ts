// The tabletop print kit in the deck-art look (DEC-066), built from the game data and the app's own
// card system (src/ui/cards.tsx), so the printed cards and the app always show the same names, numbers and art.
//   npx vite-node scripts/print-deck.ts <outdir>     (normally: print/kit)
// Writes one PDF per part plus Fruit_Market_Print_Kit.pdf with everything. Needs Playwright's Chromium.
// Pictures come from print/art (300 ppi); fonts are inlined, so the HTML needs nothing from the web.
import { h } from 'preact';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, type Browser } from 'playwright';
import {
  BARROW_BUY, BARROW_SHELF, BASE_BUY, BASE_SHELF, CUSTOMER_CARDS, EVENT_CARDS, FARMER_CARDS, favourDeckFor,
  FAVOUR_HAND_LIMIT, FAVOURS, FRUIT, FRUITS, JAM_PRICE, LAST_CALL_BONUS, MARKET_DAY_EVERY, PREF_INFO, RIVALS,
  UPGRADES, lookOf,
  type CustomerCard, type EventCard, type FarmerCard, type FavourDef, type FruitId, type Stage, type UpgradeDef, type Want,
} from '../src/engine/data';
import { RULES_VERSION } from '../src/net/protocol';
import { Gazette, StallSign, TradingCard, TradingCardBack, toStaticHtml } from '../src/ui/cards';
import { ART_COMING, customerArt, eventArt, guestArt, shopBadge, shopScene } from '../src/ui/deckArt';
import { fruitSvgUrl } from '../src/ui/fruitIcons';
import { C } from '../src/ui/palette';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(process.argv[2] ?? join(ROOT, 'print', 'kit'));
const ART = join(ROOT, 'print', 'art');

// ---------- the data, checked before anything is drawn ----------

const GUESTS: { guest: CustomerCard; event: EventCard }[] = EVENT_CARDS.flatMap((e) => (e.extra ? [{ guest: e.extra, event: e }] : []));
const MARKET_DAYS = [1, 2, 3, 4].map((k) => k * MARKET_DAY_EVERY);
const expectCount = (what: string, got: number, want: number) => {
  if (got !== want) throw new Error(`${what}: expected ${want}, found ${got}. The print kit follows the rules ${RULES_VERSION} deck; check data.ts.`);
};
expectCount('customer cards', CUSTOMER_CARDS.length, 36);
expectCount('event cards', EVENT_CARDS.length, 20);
expectCount('shopkeepers', RIVALS.length, 8);
expectCount('guests', GUESTS.length, 5);
// Rules 11: print the 6-stall favour deck (3 of each, 18); a 2 to 4 stall table sets one of each aside.
const PRINT_FAVOURS = favourDeckFor(6);
expectCount('favour cards', PRINT_FAVOURS.length, 18);
expectCount('delivery cards', FARMER_CARDS.length, 20);
expectCount('upgrades', Object.keys(UPGRADES).length, 4);

/** print/art holds the same file names as public/art, at 300 ppi. */
const artFile = (url: string | null) => (url ? join(ART, url.slice(url.lastIndexOf('art/') + 4)) : '');
const missingArt = [
  ...CUSTOMER_CARDS.map((c) => artFile(customerArt(c.name))),
  // Rules 11 art gaps (ART_COMING) print "Art coming" until the owner's pictures exist.
  ...GUESTS.filter((g) => !ART_COMING.has(g.guest.name)).map((g) => artFile(guestArt(g.guest.name))),
  ...RIVALS.filter((r) => !ART_COMING.has(r.avatar)).flatMap((r) => [artFile(shopScene(r.avatar)), artFile(shopBadge(r.avatar))]),
  ...EVENT_CARDS.filter((e) => !ART_COMING.has(e.id)).map((e) => artFile(eventArt(e.id))),
].filter((f) => !f || !existsSync(f));
if (missingArt.length) throw new Error(`Missing print art:\n${missingArt.join('\n')}`);

// ---------- styles: the app's own design system, plus the print layouts ----------

const UI = join(ROOT, 'src', 'ui');
const read = (f: string) => readFileSync(f, 'utf8');
const inlineFonts = (css: string) => css.replace(/url\('([^']+\.woff2)'\)/g, (_m, rel: string) =>
  `url(data:font/woff2;base64,${readFileSync(resolve(UI, rel)).toString('base64')})`);

const PRINT_CSS = `
@page { size: A4; margin: 0; }
@page factory { size: 85mm 110mm; margin: 0; }
html, body { margin: 0; padding: 0; background: white; }
body { color: var(--x-ink); font-family: var(--f-serif); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
/* --x-order-h: the customer cards' order box is taller in print, for the order circles (cards.css) */
.pg { position: relative; width: 210mm; height: 297mm; overflow: hidden; break-after: page; --card-w: 63mm; --x-order-h: 8.9em; }
.pg:last-child { break-after: auto; }
.pg-factory { page: factory; width: 85mm; height: 110mm; }

/* Print never shows the on-screen drop shadow (it would be cut off). */
.x-ss { box-shadow: none; }

/* ---- home sheets: 9 cards, cut lines ---- */
.pk-head, .pk-foot-note { position: absolute; left: 10.5mm; right: 10.5mm; display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; font: 500 2.5mm/1.2 var(--f-label); letter-spacing: 0.06em; color: var(--x-slate); }
.pk-head { top: 4.2mm; }
.pk-head b { font: 3.6mm/1 var(--f-display); letter-spacing: 0.02em; color: var(--x-ink); text-transform: uppercase; }
.pk-head .x-kicker { font-size: 2.5mm; margin-left: 2mm; }
.pk-foot-note { bottom: 4mm; }
.pk-grid { position: absolute; left: 10.5mm; top: 16.5mm; display: grid; grid-template-columns: repeat(3, 63mm); grid-auto-rows: 88mm; }
.pk-slot { width: 63mm; height: 88mm; background: var(--bleed, transparent); }
.pk-slot.is-empty { background: transparent; }
.pk-cuts, .pk-marks { position: absolute; left: 0; top: 0; pointer-events: none; }
.pk-cuts line { stroke: var(--x-slate); stroke-width: 0.22; stroke-dasharray: 1.6 1.1; }

/* ---- factory: 3 mm bleed and crop marks ---- */
.pk-bleed { position: absolute; left: 8mm; top: 8mm; width: 69mm; height: 94mm; background: var(--bleed); }
.pk-bleed > .x-card { position: absolute; left: 3mm; top: 3mm; }
.pk-factory-gz .x-gz { border-color: var(--x-paper); }
.pk-marks line { stroke: var(--x-ink); stroke-width: 0.2; }
.pk-slug { position: absolute; left: 12mm; right: 12mm; margin: 0; font: 500 1.9mm/1 var(--f-label); letter-spacing: 0.05em; color: var(--x-slate); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pk-slug.t { top: 3.2mm; }
.pk-slug.b { bottom: 3.2mm; }

/* ---- order circles on customer cards (RULES.md: one circle per unit wanted), the same size on every card ---- */
.pk-dots { display: flex; justify-content: center; gap: 0.3em; margin-top: 0.15em; }
.pk-dots i { width: 1.5em; height: 1.5em; border-radius: 50%; border: 0.16em solid var(--x-ink); background: var(--x-paper); }

/* ---- shared bits for the cards without pictures ---- */
.pk-kick { font: 600 1.05em/1 var(--f-label); letter-spacing: 0.24em; text-transform: uppercase; color: var(--x-red); }
.pk-foot { flex: none; font: 600 0.95em/1.25 var(--f-label); letter-spacing: 0.16em; text-transform: uppercase; text-align: center; color: var(--x-green); }
.pk-burst { position: relative; flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.2em; overflow: hidden; border: 0.25em solid var(--x-ink); background: repeating-conic-gradient(from 0deg at 50% 50%, var(--ray-a) 0deg 9deg, var(--ray-b) 9deg 18deg); }
.pk-banner { position: relative; z-index: 1; display: block; align-self: stretch; margin: 0 -0.9em; padding: 0.22em 0.6em 0.16em; text-align: center; background: var(--x-ink); color: var(--x-card); border-top: 0.19em solid var(--x-mustard); border-bottom: 0.15em solid var(--x-mustard); font: 2.2em/1.15 var(--f-display); letter-spacing: 0.02em; text-transform: uppercase; white-space: nowrap; transform: rotate(-5deg); }
.pk-banner.x-long { font-size: 1.7em; padding-top: 0.32em; padding-bottom: 0.26em; }
.pk-ticket { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 0.25em; padding: 0.7em 1.3em 0.8em; background: var(--x-card); border: 0.25em solid var(--x-ink); border-radius: 0.6em; box-shadow: 0 0 0 0.35em var(--x-mustard), 0 0 0 0.6em var(--x-ink); text-align: center; }
.pk-ticket small { font: 600 0.95em/1 var(--f-label); letter-spacing: 0.24em; text-transform: uppercase; color: var(--x-red); }
.pk-ticket b { font: 2em/1.02 var(--f-display); text-transform: uppercase; color: var(--x-ink); }
.pk-fruitrow { flex: none; display: flex; justify-content: center; align-items: center; gap: 0.5em; }
.pk-fruitrow img { width: 3.2em; height: 3.2em; }
.pk-fruitrow span { font: 1.6em/1 var(--f-display); color: var(--x-red); }

/* ---- Favour card ---- */
.pk-fav { background: var(--x-card); border: 0.3em solid var(--x-ink); padding: 1.05em 1.05em 0.85em; gap: 0.65em; --ray-a: var(--x-red); --ray-b: var(--x-red-d); }
.pk-fav-top { flex: none; display: flex; justify-content: space-between; align-items: center; }
.pk-fav-top em { font: 600 0.9em/1 var(--f-label); font-style: normal; letter-spacing: 0.14em; text-transform: uppercase; color: var(--x-slate); }
.pk-text { flex: none; padding: 0 0.2em; font: 1.28em/1.27 var(--f-serif); text-align: center; color: var(--x-ink); }

/* ---- Delivery (lorry) card ---- */
.pk-lorry { background: var(--x-card); border: 0.3em solid var(--x-ink); padding: 1.05em 1.05em 0.85em; gap: 0.7em; }
.pk-lorry-head { flex: none; display: flex; flex-direction: column; align-items: center; gap: 0.35em; padding: 0.65em 0.6em 0.75em; background: var(--x-green); border: 0.25em solid var(--x-ink); text-align: center; }
.pk-lorry-head small { font: 600 0.95em/1 var(--f-label); letter-spacing: 0.24em; text-transform: uppercase; color: var(--x-mustard); }
.pk-lorry-head strong { font: 2.05em/1.05 var(--f-display); text-transform: uppercase; color: var(--x-card); white-space: nowrap; }
.pk-lorry-head strong.x-long { font-size: 1.5em; padding-top: 0.15em; }
.pk-board { flex: 1 1 0; min-height: 0; display: grid; grid-template-columns: 5.2em repeat(4, minmax(0, 1fr)); grid-template-rows: auto repeat(5, 1fr); align-items: center; justify-items: center; padding: 0.5em 0.6em 0.3em; background: var(--x-chalk); border: 0.45em solid var(--x-wood-d); border-radius: 0.35em; box-shadow: inset 0 0 1.1em -0.3em var(--x-ink); color: var(--x-paper); font-family: var(--f-chalk); font-size: 0.84em; }
.pk-board > * { align-self: stretch; justify-self: stretch; display: flex; align-items: center; justify-content: center; }
.pk-board .r { border-top: 0.12em dashed var(--x-chalk-l); }
.pk-board .lab { justify-content: flex-start; font-size: 1.55em; font-weight: 700; line-height: 1; color: var(--x-mustard); }
.pk-board .n { font-size: 3em; font-weight: 700; line-height: 1; }
.pk-board .n.zero { opacity: 0.45; }
.pk-dot { width: 3.5em; height: 3.5em; margin: 0 auto 0.45em; border-radius: 50%; background: var(--x-card); border: 0.2em solid var(--x-ink); display: grid; place-items: center; }
.pk-dot img { width: 2.6em; height: 2.6em; }
.pk-note { flex: none; font: italic 1.12em/1.25 var(--f-serif); text-align: center; color: var(--x-ink); }
.pk-note b { font-style: normal; color: var(--x-green); }

/* ---- Upgrade card (a stall-sign board) ---- */
.pk-upg .x-ss-head { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.1em; padding: 0.55em 0.6em 0.45em; text-align: center; }
.pk-upg .x-ss-name { align-self: center; max-width: 100%; font-size: 3em; line-height: 1.05; }
.pk-upg .x-ss-name.x-long { font-size: 2.45em; }
.pk-upg .pk-burst { border-radius: 0.45em; }
.pk-seal { position: relative; z-index: 1; width: 9.4em; height: 9.4em; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--x-mustard); border: 0.3em solid var(--x-ink); box-shadow: 0 0 0 0.4em var(--x-card), 0 0 0 0.65em var(--x-ink); }
.pk-seal b { font: 3.7em/1 var(--f-display); color: var(--x-ink); }
.pk-seal small { margin-top: 0.15em; font: 600 0.95em/1 var(--f-label); letter-spacing: 0.2em; text-transform: uppercase; color: var(--x-ink); }
.pk-upg-coldroom { --ray-a: var(--x-sky); --ray-b: var(--x-sky-d); }
.pk-upg-juicebar { --ray-a: var(--x-mustard); --ray-b: var(--x-mustard-d); }
.pk-upg-barrow { --ray-a: var(--x-green); --ray-b: var(--x-chalk); }
.pk-upg-premium { --ray-a: var(--x-red); --ray-b: var(--x-red-d); }
.pk-upg .x-ss-chalk p { font-size: 1.42em; }

/* ---- Backs ---- */
.pk-back .x-tb-plate { display: flex; justify-content: center; align-items: center; gap: 0.6em; min-height: 5.4em; min-width: 9em; max-width: 19em; padding: 0.9em 1.4em; background: var(--x-card); border: 0.25em solid var(--x-mustard); border-radius: 999px; box-shadow: 0 0 0 0.35em var(--ray-b); font: 600 1.3em/1.2 var(--f-label); letter-spacing: 0.12em; text-transform: uppercase; text-align: center; color: var(--x-ink); }
.pk-back .x-tb-plate .x-fruit { width: 3.1em; height: 3.1em; }
.pk-back .x-tb-label { background: repeating-conic-gradient(from 0deg at 50% 50%, var(--ray-a) 0deg 7deg, var(--ray-b) 7deg 14deg); }
.pk-back .x-tb-kind { font-size: 1.5em; letter-spacing: 0.24em; }
.pk-back-guest { background: var(--x-mustard-d); border-color: var(--x-ink); --ray-a: var(--x-mustard); --ray-b: var(--x-mustard-d); }
.pk-back-guest .x-tb-label { border-color: var(--x-ink); }
.pk-back-guest .x-tb-kind { color: var(--x-ink); }
.pk-back-favour { background: var(--x-red-d); --ray-a: var(--x-red); --ray-b: var(--x-red-d); }
.pk-back-favour .x-tb-brand { background: var(--x-ink); }
.pk-back-favour .x-tb-kind, .pk-back-upgrade .x-tb-kind { color: var(--x-card); }
.pk-back-lorry { background: var(--x-chalk); --ray-a: var(--x-green); --ray-b: var(--x-chalk); }
.pk-back-upgrade { background: var(--x-wood-d); --ray-a: var(--x-wood); --ray-b: var(--x-wood-d); }
.pk-ssb .x-ss-head { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.6em 0.6em 0.5em; }
.pk-ssb .x-ss-tag { align-self: center; }
.pk-ssb .x-ss-name { align-self: center; font-size: 3.4em; }
.pk-ssb .pk-burst { border-radius: 0.45em; --ray-a: var(--x-mustard); --ray-b: var(--x-mustard-d); }
.pk-ssb .x-ss-chalk b { font-size: 2.2em; }
.pk-gzb .x-gz-head { margin-top: 0.5em; font-size: 3.1em; text-align: center; }
.pk-gzb .x-gz-sub { text-align: center; }
.pk-gzb-mid { flex: 1 1 0; display: grid; place-items: center; border-top: 0.12em solid var(--x-ink); border-bottom: 0.12em solid var(--x-ink); margin: 0.4em 0; background: repeating-conic-gradient(from 0deg at 50% 50%, var(--x-paper) 0deg 7deg, var(--x-card) 7deg 14deg); }
.pk-gzb .x-gz-seal { float: none; margin: 0; width: 4.6em; height: 4.6em; font-size: 2.4em; transform: rotate(-8deg); }
.pk-gzb-foot { flex: none; font: 600 0.95em/1.3 var(--f-label); letter-spacing: 0.16em; text-transform: uppercase; text-align: center; color: var(--x-ink); }

/* Event fronts and Stall Signs: the fixed picture, text and chalkboard sizes are in cards.css, shared with the app. */

/* ---- Special guests: the flag starts clear of the price tag drawn into the borrowed Mango Craze picture ---- */
.pk-guest-mangoCraze .x-tc-flag { left: 8em; }

/* ---- A4 pages: reference, player aid, cover ---- */
/* border-box keeps the padding inside the 210 x 297 mm page. Without it the page box was 234 x 319 mm, and Chromium
   shrank every page of a PDF that holds one to about 90%, the card sheets in Fruit_Market_Print_Kit.pdf included.
   The player aid and the cover were laid out at that size, so they keep it and are scaled to the page width (210/234),
   which is exactly how they printed before; the card sheets now print at 100% in every file. */
.pk-a4 { box-sizing: border-box; padding: 12mm 12mm 10mm; display: flex; flex-direction: column; gap: 4mm; font-size: 3.5mm; }
.pk-aid, .pk-cover { box-sizing: content-box; zoom: 0.8974; }
.pk-aid { gap: 3.6mm; }
.pk-sec { display: flex; align-items: baseline; gap: 3mm; padding-bottom: 1.5mm; border-bottom: 0.55mm solid var(--x-ink); white-space: nowrap; }
.pk-sec h2 { margin: 0; font: 5.7mm/1 var(--f-display); text-transform: uppercase; color: var(--x-ink); }
.pk-sec .x-kicker { font-size: 2.5mm; }
.pk-sec .pk-pageno { margin-left: auto; font: 500 2.35mm/1 var(--f-label); letter-spacing: 0.1em; color: var(--x-slate); }
.pk-row { display: flex; justify-content: center; gap: 4mm; align-items: flex-start; }
.pk-ref-shops { --card-w: 54mm; }
.pk-ref-guests { --card-w: 54mm; }
/* customers: 3 across and 4 down, each tile as tall as its row, so the twelve fill the page evenly */
.pk-ref-grid { flex: 1 1 0; min-height: 0; display: grid; grid-template-columns: repeat(3, var(--card-w)); grid-template-rows: repeat(4, minmax(0, 1fr)); gap: 4mm 8mm; justify-content: center; --card-w: 53mm; }
.pk-ref.x-card { height: auto; }
.pk-ref .x-tc-order { display: none; }
.pk-legend { margin: auto 0 0; padding: 2.2mm 3mm; border: 0.4mm solid var(--x-ink); display: flex; gap: 5mm; justify-content: center; flex-wrap: wrap; font: 500 2.6mm/1.3 var(--f-label); letter-spacing: 0.05em; }
.pk-legend b { font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; }
.pk-legend .p { color: var(--x-red); } .pk-legend .e { color: var(--x-green); } .pk-legend .g { color: var(--x-ink); }
.pk-interim { margin: 0; font: italic 3mm/1.3 var(--f-serif); color: var(--x-red); text-align: center; }

.pk-mast { text-align: center; }
.pk-mast h1 { margin: 0; padding-bottom: 1mm; border-bottom: 1.1mm double var(--x-ink); font: 13mm/1.05 var(--f-headline); color: var(--x-ink); }
.pk-mast .ed { display: flex; justify-content: space-between; padding: 1.3mm 0 1.2mm; border-bottom: 0.4mm solid var(--x-ink); font: 600 2.6mm/1.2 var(--f-label); letter-spacing: 0.16em; text-transform: uppercase; }
.pk-aid-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 4mm; }
.pk-aid-head strong { font: 10mm/0.95 var(--f-headline); text-transform: uppercase; color: var(--x-ink); }
.pk-aid-head em { font: italic 4mm/1.2 var(--f-serif); color: var(--x-red); }
.pk-beats { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 5mm; }
.pk-beat { position: relative; padding: 2.8mm 3.2mm 3mm 15mm; border: 0.45mm solid var(--x-ink); background: var(--x-card); }
.pk-beat .num { position: absolute; left: 2.8mm; top: 2.8mm; width: 9.5mm; height: 9.5mm; border-radius: 50%; display: grid; place-items: center; background: var(--x-mustard); border: 0.45mm solid var(--x-ink); font: 4.6mm/1 var(--f-display); color: var(--x-ink); }
.pk-beat h3 { margin: 0 0 1.2mm; font: 5mm/1.1 var(--f-display); text-transform: uppercase; color: var(--x-ink); }
.pk-beat p { margin: 0; font: 3.45mm/1.4 var(--f-serif); }
.pk-beat.night { background: var(--x-paper); }
.pk-crier { border: 0.6mm solid var(--x-ink); }
.pk-crier > header { display: flex; justify-content: space-between; align-items: baseline; padding: 2mm 3mm; background: var(--x-ink); color: var(--x-card); }
.pk-crier > header b { font: 5mm/1 var(--f-display); text-transform: uppercase; }
.pk-crier > header span { font: 600 2.6mm/1.2 var(--f-label); letter-spacing: 0.12em; text-transform: uppercase; color: var(--x-mustard); }
.pk-crier > p { margin: 0; padding: 2.4mm 3.2mm; font: 3.4mm/1.4 var(--f-serif); }
.pk-ladder { display: grid; grid-template-columns: 44mm 1fr auto; border-top: 0.4mm solid var(--x-ink); }
.pk-ladder > div { display: flex; align-items: center; gap: 1.5mm; padding: 2mm 3.2mm; border-bottom: 0.3mm solid var(--x-edge); }
.pk-ladder .lvl { font: 4mm/1 var(--f-display); color: var(--x-red); background: var(--x-card); white-space: nowrap; }
.pk-ladder .what { font: 3.4mm/1.3 var(--f-serif); }
.pk-ladder .what b { font: 600 3.6mm/1 var(--f-label); letter-spacing: 0.1em; text-transform: uppercase; }
.pk-ladder .ic img { width: 7mm; height: 7mm; }
.pk-ladder .ic { justify-content: flex-end; }
.pk-ladder .none { color: var(--x-slate); font: 600 2.8mm/1 var(--f-label); letter-spacing: 0.12em; text-transform: uppercase; }
.pk-boxes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; }
.pk-box { padding: 2.6mm 3mm; border: 0.45mm solid var(--x-ink); }
.pk-box h4 { margin: 0 0 1.2mm; font: 600 3.2mm/1.1 var(--f-label); letter-spacing: 0.16em; text-transform: uppercase; color: var(--x-red); }
.pk-box p { margin: 0; font: 3.25mm/1.4 var(--f-serif); }
.pk-small { margin: auto 0 0; font: 500 2.4mm/1.3 var(--f-label); letter-spacing: 0.06em; color: var(--x-slate); text-align: center; }

.pk-cover { justify-content: flex-start; gap: 5mm; }
.pk-cover h1 { margin: 0; font: 15mm/0.98 var(--f-display); text-transform: uppercase; color: var(--x-ink); }
.pk-cover .lede { margin: 0; font: 3.6mm/1.45 var(--f-serif); max-width: 165mm; }
.pk-toc { width: 100%; border-collapse: collapse; font: 3.2mm/1.3 var(--f-serif); }
.pk-toc th { padding: 1.4mm 2mm; text-align: left; font: 600 2.8mm/1.2 var(--f-label); letter-spacing: 0.14em; text-transform: uppercase; color: var(--x-card); background: var(--x-ink); }
.pk-toc td { padding: 1.4mm 2mm; border-bottom: 0.3mm solid var(--x-edge); vertical-align: top; }
.pk-toc td:first-child { font: 600 3.1mm/1.3 var(--f-label); letter-spacing: 0.06em; white-space: nowrap; }
.pk-toc td:last-child { white-space: nowrap; text-align: right; font-family: var(--f-label); }
.pk-cover .pk-boxes { grid-template-columns: 1fr 1fr; }
.pk-cover ul { margin: 0; padding-left: 4mm; font: 2.95mm/1.38 var(--f-serif); }
`;

const CSS = [
  read(join(UI, 'exchange.css')),
  // The app is all Rubik (DEC-068); the printed cards keep the deck-art fonts, which override exchange.css's roles.
  inlineFonts(read(join(UI, 'print-fonts.css'))),
  read(join(UI, 'palette.css')),
  read(join(UI, 'cards.css')),
  PRINT_CSS,
].join('\n');

// ---------- small helpers ----------

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const two = (n: number) => String(n).padStart(2, '0');
const fruitImg = (id: FruitId, stage: Stage = 'fresh', alt = '') =>
  `<img class="x-fruit" src="${fruitSvgUrl(id, stage)}" width="32" height="32" alt="${esc(alt)}">`;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const list = (xs: (string | number)[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** A rendered card and the colour that fills its bleed (and any rounded corners). */
interface Cell { html: string; bleed: string; label: string }
interface Page { html: string; factory?: boolean }

/** Customer and guest cards for print: the app's Trading Card plus one order circle per unit wanted (RULES.md).
 *  `cls` adds print-only classes (a guest's pk-guest-<event id>, see PRINT_CSS). */
function tradingCard(who: string, wants: Want[], guest = false, cls?: string): string {
  const html = toStaticHtml(h(TradingCard, { who, wants, guest, eager: true, class: cls }));
  let i = 0;
  const out = html.replace(/<\/li>/g, () => {
    const w = wants[i++];
    return `<span class="pk-dots" aria-hidden="true">${'<i></i>'.repeat(w ? w.qty : 0)}</span></li>`;
  });
  if (i !== wants.length) throw new Error(`order circles: ${who} has ${wants.length} wants but ${i} order lines`);
  return out;
}

const INK = 'var(--x-ink)';
const PAPER = 'var(--x-paper)';

// ---------- the cards ----------

const customerFront = (c: CustomerCard, i: number): Cell => ({
  html: tradingCard(c.name, c.wants), bleed: INK, label: `Customer ${two(i + 1)} · ${lookOf(c.name).title}`,
});
const customerBack = (c: CustomerCard, i: number): Cell => ({
  html: toStaticHtml(h(TradingCardBack, { fruits: c.wants.map((w) => w.fruit) })), bleed: INK, label: `Customer ${two(i + 1)} · ${lookOf(c.name).title}`,
});

const guestFront = ({ guest, event }: (typeof GUESTS)[number]): Cell => ({
  html: tradingCard(guest.name, guest.wants, true, `pk-guest-${event.id}`), bleed: INK, label: `${lookOf(guest.name).title} · guest of ${event.title}`,
});
const backShell = (cls: string, kind: string, plate: string) => `<article class="x-card x-tb pk-back ${cls}" role="img" aria-label="${esc(kind)} card back"><div class="x-tb-label"><b class="x-tb-brand">Fruit Market</b><span class="x-tb-kind">${esc(kind)}</span><div class="x-tb-plate">${plate}</div></div></article>`;
const guestBack: Cell = { html: backShell('pk-back-guest', 'Special guest', 'Comes with<br>its event'), bleed: 'var(--x-mustard-d)', label: 'Special guests' };

const shopFront = (r: (typeof RIVALS)[number]): Cell => ({
  html: toStaticHtml(h(StallSign, { avatar: r.avatar, eager: true })), bleed: INK, label: `Shopkeeper · ${r.name}`,
});
const shopBack: Cell = {
  html: `<article class="x-card x-ss pk-ssb"><header class="x-ss-head"><strong class="x-ss-name">Fruit Market</strong><small class="x-ss-tag">Fresh fruit · Fair prices</small></header>`
    + `<div class="pk-burst"><span class="pk-ticket"><small>The</small><b>Shopkeeper</b></span></div>`
    + `<div class="x-ss-chalk"><b>Pick one</b><p>No two stalls can be the same shopkeeper.</p></div></article>`,
  bleed: INK, label: 'Shopkeepers',
};

const eventFront = (e: EventCard): Cell => ({
  html: toStaticHtml(h(Gazette, { event: e, eager: true })), bleed: PAPER, label: `Event · ${e.title}`,
});
const eventBack: Cell = {
  html: `<article class="x-card x-gz pk-gzb"><header class="x-gz-mast">Fruit Market</header><div class="x-gz-ed"><span>Morning edition · One cent</span><span>Event card</span></div>`
    + `<strong class="x-gz-head">Tomorrow’s news</strong><p class="x-gz-sub">Read all about it, a day early</p>`
    + `<div class="pk-gzb-mid"><b class="x-gz-seal">Extra!</b></div>`
    + `<p class="pk-gzb-foot">Event · one each morning from Day 2</p></article>`,
  bleed: PAPER, label: 'Events',
};

const WHEN: Record<FavourDef['when'], { small: string; big: string }> = {
  evening: { small: 'Play in the', big: 'Evening' },
  buy: { small: 'Play on your', big: 'Buying<br>turn' },
  bid: { small: 'Play while', big: 'Pricing' },
};
function favourFront(f: FavourDef, copy: number): Cell {
  const w = WHEN[f.when];
  const fruit = f.id === 'freeFruit'
    ? `<div class="pk-fruitrow">${FRUITS.map((id) => fruitImg(id, 'fresh', FRUIT[id].name)).join('')}</div>`
    : f.id === 'fridge'
      ? `<div class="pk-fruitrow">${fruitImg('apple', 'notso', 'Tired apple')}<span>›</span>${fruitImg('apple', 'okay', 'Okay apple')}<span>›</span>${fruitImg('apple', 'fresh', 'Fresh apple')}</div>`
      : '';
  return {
    html: `<article class="x-card pk-fav"><div class="pk-fav-top"><span class="pk-kick">Favour</span><em>A secret reward</em></div>`
      + `<div class="pk-burst"><span class="pk-ticket"><small>${w.small}</small><b>${w.big}</b></span><strong class="pk-banner${f.title.length > 10 ? ' x-long' : ''}">${esc(f.title)}</strong></div>`
      + `${fruit}<p class="pk-text">${esc(f.text)}</p><p class="pk-foot">Hold up to ${FAVOUR_HAND_LIMIT} · then discard</p></article>`,
    bleed: INK, label: `Favour · ${f.title} (${copy} of 3)`,
  };
}
const favourBack: Cell = { html: backShell('pk-back-favour', 'Favour', 'A secret<br>reward'), bleed: 'var(--x-red-d)', label: 'Favours' };

function lorryFront(c: FarmerCard): Cell {
  const head = FRUITS.map((id) => {
    const green = c.unripe === id;
    return `<div><span class="pk-dot">${fruitImg(id, green ? 'unripe' : 'fresh', green ? `${FRUIT[id].name}, green` : FRUIT[id].name)}</span></div>`;
  }).join('');
  const rows = ([2, 3, 4, 5, 6] as const).map((n) => `<div class="lab r">${n} stalls</div>${FRUITS.map((id) => {
    const v = c.table[n][id];
    return `<div class="n r${v ? '' : ' zero'}">${v || '–'}</div>`;
  }).join('')}`).join('');
  const note = c.unripe
    ? `<b>${FRUIT[c.unripe].plural} arrive green:</b> they ripen on the shelf in ${FRUIT[c.unripe].unripeSlots} nights.`
    : c.okay ? 'Everything arrives <b>Okay</b>: into each fruit’s freshest Okay space, at Okay prices.'
      : 'Everything on this lorry arrives <b>ripe and fresh</b>.';
  return {
    html: `<article class="x-card pk-lorry"><header class="pk-lorry-head"><small>Delivery · The farmer’s lorry</small><strong${c.name.length > 13 ? ' class="x-long"' : ''}>${esc(c.name)}</strong></header>`
      + `<div class="pk-board"><div></div>${head}${rows}</div><p class="pk-note">${note}</p><p class="pk-foot">Use the row for your number of stalls</p></article>`,
    bleed: INK, label: `Delivery · ${c.name}`,
  };
}
const lorryBack: Cell = { html: backShell('pk-back-lorry', 'Delivery', FRUITS.map((id) => fruitImg(id)).join('')), bleed: 'var(--x-chalk)', label: 'Deliveries' };

const upgradeFront = (u: UpgradeDef): Cell => ({
  html: `<article class="x-card x-ss pk-upg pk-upg-${u.id}"><header class="x-ss-head"><span class="pk-kick">Stall upgrade</span><strong class="x-ss-name${u.title.length > 10 ? ' x-long' : ''}">${esc(u.title)}</strong></header>`
    + `<div class="pk-burst"><span class="pk-seal"><b>$${u.cost}</b><small>to build</small></span></div>`
    + `<div class="x-ss-chalk"><p>${esc(u.text)}</p><i>Build one, the evening after a Market Day</i></div></article>`,
  bleed: INK, label: `Upgrade · ${u.title}`,
});
const upgradeBack: Cell = { html: backShell('pk-back-upgrade', 'Stall upgrade', `Days ${list(MARKET_DAYS)}`), bleed: 'var(--x-wood-d)', label: 'Upgrades' };

// ---------- home sheets (A4, 9 cards, fronts then mirrored backs) ----------

const GX = 10.5;
const GY = 16.5;
const CW = 63;
const CH = 88;

function cutLines(rows: number): string {
  const yb = GY + rows * CH;
  const v = [0, 1, 2, 3].map((c) => GX + c * CW).map((x) => `<line x1="${x}" y1="${GY - 6}" x2="${x}" y2="${yb + 6}"/>`);
  const hz = Array.from({ length: rows + 1 }, (_, r) => GY + r * CH).map((y) => `<line x1="${GX - 6}" y1="${y}" x2="${GX + 3 * CW + 6}" y2="${y}"/>`);
  return `<svg class="pk-cuts" width="210mm" height="297mm" viewBox="0 0 210 297" aria-hidden="true">${v.join('')}${hz.join('')}</svg>`;
}

function sheetPage(deck: string, side: string, cells: (Cell | null)[], rows: number, foot: string): Page {
  const slots = cells.map((c) => (c ? `<div class="pk-slot" style="--bleed:${c.bleed}">${c.html}</div>` : '<div class="pk-slot is-empty"></div>')).join('');
  return {
    html: `<section class="pg pk-sheet"><header class="pk-head"><span><b>${esc(deck)}</b><span class="x-kicker">${esc(side)}</span></span><span>Print at 100% (actual size) on A4 card · double-sided, flip on the long edge</span></header>`
      + `<div class="pk-grid">${slots}</div>${cutLines(rows)}<footer class="pk-foot-note"><span>${esc(foot)}</span><span>Fruit Market · rules ${RULES_VERSION} · 63 × 88 mm</span></footer></section>`,
  };
}

/** Fronts in sheets of 9, each followed by its backs, mirrored left to right so they line up when printed double-sided. */
function sheets(deck: string, fronts: Cell[], backs: Cell[], note = ''): Page[] {
  const pages: Page[] = [];
  const n = Math.ceil(fronts.length / 9);
  for (let s = 0; s < n; s++) {
    const f = fronts.slice(s * 9, s * 9 + 9);
    const b = backs.slice(s * 9, s * 9 + 9);
    const rows = Math.ceil(f.length / 3);
    const front: (Cell | null)[] = Array.from({ length: rows * 3 }, (_, i) => f[i] ?? null);
    const back: (Cell | null)[] = Array.from({ length: rows * 3 }, (_, i) => b[Math.floor(i / 3) * 3 + (2 - (i % 3))] ?? null);
    const of = `sheet ${s + 1} of ${n} (${plural(f.length, 'card', 'cards')})`;
    pages.push(sheetPage(deck, `Fronts · ${of}`, front, rows, note || 'Cut on the dashed lines. The backs are on the next page.'));
    pages.push(sheetPage(deck, `Backs · ${of}`, back, rows, 'Backs, mirrored left to right to line up with the fronts on the page before.'));
  }
  return pages;
}

// ---------- factory pages (one card, 3 mm bleed, crop marks) ----------

function cropMarks(): string {
  const [l, r, t, b] = [11, 74, 11, 99];
  const m = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  const marks = [
    ...[l, r].flatMap((x) => [m(x, 0.5, x, 7.2), m(x, 102.8, x, 109.5)]),
    ...[t, b].flatMap((y) => [m(0.5, y, 7.2, y), m(77.8, y, 84.5, y)]),
  ];
  return `<svg class="pk-marks" width="85mm" height="110mm" viewBox="0 0 85 110" aria-hidden="true">${marks.join('')}</svg>`;
}
const factoryPage = (c: Cell, side: string, cls = ''): Page => ({
  factory: true,
  html: `<section class="pg pg-factory ${cls}"><p class="pk-slug t">Fruit Market · trim 63 × 88 mm · bleed 3 mm · RGB</p>`
    + `<div class="pk-bleed" style="--bleed:${c.bleed}">${c.html}</div>${cropMarks()}<p class="pk-slug b">${esc(`${c.label} · ${side}`)}</p></section>`,
});

// ---------- reference sheet (rulebook visuals) ----------

const secHead = (title: string, kicker: string, pageNo: string) =>
  `<header class="pk-sec"><h2>${esc(title)}</h2><span class="x-kicker">${esc(kicker)}</span><span class="pk-pageno">${esc(pageNo)}</span></header>`;
const legend = `<p class="pk-legend">${(['premium', 'everyday', 'bargain'] as const).map((p) =>
  `<span class="${p[0]}"><b>${PREF_INFO[p].title} shopper:</b> ${esc(PREF_INFO[p].text)}</span>`).join('')}</p>`;

function referencePages(): Page[] {
  const shops = RIVALS.map((r) => toStaticHtml(h(StallSign, { avatar: r.avatar, eager: true })));
  const guests = GUESTS.map(({ guest, event }) => tradingCard(guest.name, guest.wants, true, `pk-guest-${event.id}`));
  const rowsOf3 = (xs: string[], cls: string) => Array.from({ length: Math.ceil(xs.length / 3) }, (_, k) => `<div class="pk-row ${cls}">${xs.slice(k * 3, k * 3 + 3).join('')}</div>`).join('');
  const first = `<section class="pg pk-a4">${secHead('Shopkeepers · The Stall Sign', 'Who’s who · Art 2 “Over the counter”', 'Reference 1 of 5')}`
    + `${rowsOf3(shops, 'pk-ref-shops')}</section>`;
  const second = `<section class="pg pk-a4">${secHead('Special guests', 'Each comes with its event', 'Reference 2 of 5')}`
    + `${rowsOf3(guests, 'pk-ref-guests')}`
    + `<p class="pk-interim">Interim pictures: each guest borrows its event’s scene until the guest’s own portrait is drawn (the Wedding Caterer and the Bakery have none yet).</p></section>`;
  const pages: Page[] = [{ html: first }, { html: second }];
  for (let p = 0; p < 3; p++) {
    const tiles = CUSTOMER_CARDS.slice(p * 12, p * 12 + 12).map((c) =>
      toStaticHtml(h(TradingCard, { who: c.name, wants: c.wants, eager: true, class: 'pk-ref' })));
    pages.push({
      html: `<section class="pg pk-a4">${secHead('Customers · The Trading Card', `Who’s who · numbers ${two(p * 12 + 1)} to ${two(p * 12 + 12)}`, `Reference ${p + 3} of 5`)}`
        + `<div class="pk-ref-grid">${tiles.join('')}</div>${legend}</section>`,
    });
  }
  return pages;
}

// ---------- player aid ----------

function playerAid(): Page {
  const beat = (n: string, title: string, text: string, cls = '') =>
    `<div class="pk-beat ${cls}"><b class="num">${n}</b><h3>${esc(title)}</h3><p>${text}</p></div>`;
  const ic = (stages: Stage[]) => stages.map((s) => fruitImg('apple', s, `${s === 'notso' ? 'Tired' : s === 'okay' ? 'Okay' : 'Fresh'} apple`)).join('');
  const beats = [
    beat('1', 'Morning', 'Apply today’s <b>event</b>. The lorry unloads today’s card at the freshest spot (green fruit at the unripe spot, the Seconds Lorry at Okay), every day. Draw tomorrow’s card and event.'),
    beat('2', 'Buying', `The <b>poorest stall buys first, then the others go clockwise</b> (ties: first clockwise from the token; Day 1 starts at the token; Priority jumps the queue). Buy up to <b>${BASE_BUY}</b> pieces (${BARROW_BUY} with a Handcart), paying the cost for each fruit’s freshness. Your shelf holds ${BASE_SHELF} (${BARROW_SHELF} with a Handcart).`),
    beat('3', 'Stocking', 'Customers arrive: waiting, the regular, then the walk-ins (face up now). Secretly move the fruit you will sell into your <b>crate</b>; then show all crates. Only crate fruit sells.'),
    beat('4', 'The bell', 'Secretly set <b>one price per fruit</b> you put out, then everyone reveals together. No lower limit.'),
    beat('5', 'The rush', 'Waiting customers first, then new ones. Each fruit goes to the <b>cheapest stall</b> with fruit fresh enough for its price; leftover demand spills to the next stall. Serve a customer’s whole remaining order by yourself and <b>draw a favour card</b> (one a day at most).'),
    beat('+', 'Evening & night', `Play evening favours (Priority, Gossip). On the evening after each Market Day (days ${list(MARKET_DAYS)}) build <b>one</b> stall upgrade. At night all fruit ages one step; spoiled fruit is thrown away.`, 'night'),
  ];
  const ladder = [
    ['Above the top', '<span class="none">Nothing sells</span> <span>(a Premium Display may go $1 over for fresh fruit)</span>', ''],
    ['The top', '<b>Fresh only</b>', ic(['fresh'])],
    ['Top − 1', '<b>Fresh or okay</b>', ic(['fresh', 'okay'])],
    ['Top − 2 or less', '<b>Any fruit</b> (fresh, okay or tired)', ic(['fresh', 'okay', 'notso'])],
  ].map(([lvl, what, icons]) => `<div class="lvl">${esc(lvl)}</div><div class="what">${what}</div><div class="ic">${icons}</div>`).join('');
  return {
    html: `<section class="pg pk-a4 pk-aid">`
      + `<div class="pk-mast"><h1>Fruit Market</h1><div class="ed"><span>Player aid · Morning edition</span><span>Rules version ${RULES_VERSION}</span></div></div>`
      + `<div class="pk-aid-head"><strong>A day in five beats</strong><em>Buy it, show it, price it, sell it, before it spoils.</em></div>`
      + `<div class="pk-beats">${beats.join('')}</div>`
      + `<section class="pk-crier"><header><b>The crier’s price rule</b><span>Read each customer line aloud</span></header>`
      + `<p>The crier (the player who bought last that morning) pays the stalls from the bank. For each customer line, say the real <b>top price</b> for the day: the card price plus any event, Closing Day or Fixed-prices change. Then which fruit qualifies at each price:</p>`
      + `<div class="pk-ladder">${ladder}</div>`
      + `<p>The <b>cheapest</b> posted price sells first, and each stall hands over its <b>oldest piece that still qualifies</b>. On a tie, the stall whose freshest handed-over piece is younger sells first.</p></section>`
      + `<div class="pk-boxes">`
      + `<div class="pk-box"><h4>Freshness types</h4><p><b>Premium:</b> ${esc(PREF_INFO.premium.short)}. <b>Everyday:</b> ${esc(PREF_INFO.everyday.short)}. <b>Bargain:</b> ${esc(PREF_INFO.bargain.short)}. A stall cannot sell fruit a customer will not take.</p></div>`
      + `<div class="pk-box"><h4>Ties at the bell</h4><p>Favoured Trade, then fresher fruit (the younger handed-over piece), then the Haggler, then whoever bought earlier today.</p></div>`
      + `<div class="pk-box"><h4>Market rhythm</h4><p><b>Market Days</b> (days ${list(MARKET_DAYS)}, never the last): 1 more walk-in per 3 stalls. <b>Closing Day:</b> customers pay $${LAST_CALL_BONUS} more; then the jam maker buys leftover ripe fruit at $${JAM_PRICE} each. Guests’ prices are fixed: only Closing Day adds to them.</p></div>`
      + `</div><p class="pk-small">Full rules: RULES.md. Every number on this page comes from the game data.</p></section>`,
  };
}

// ---------- the kit ----------

interface Part { file: string; title: string; what: string; pages: Page[] }

const customerFronts = CUSTOMER_CARDS.map(customerFront);
const customerBacks = CUSTOMER_CARDS.map(customerBack);
const favourCells = PRINT_FAVOURS.map((id, i) => favourFront(FAVOURS[id], PRINT_FAVOURS.slice(0, i + 1).filter((x) => x === id).length));
const lorryCells = FARMER_CARDS.map((c) => lorryFront(c));
const upgradeCells = Object.values(UPGRADES).map(upgradeFront);
const shopCells = RIVALS.map(shopFront);
const eventCells = EVENT_CARDS.map(eventFront);
const same = (c: Cell, n: number) => Array.from({ length: n }, () => c);

const parts: Part[] = [
  { file: 'Player_Aid.pdf', title: 'Player aid', what: 'A day in five beats and the crier’s price rule (one A4 page per player)', pages: [playerAid()] },
  { file: 'Character_Reference.pdf', title: 'Character reference', what: `The ${RIVALS.length} shopkeepers, ${GUESTS.length} special guests and ${CUSTOMER_CARDS.length} customers, for the rulebook`, pages: referencePages() },
  { file: 'Cards_Customers_A4.pdf', title: 'Customer cards', what: `${CUSTOMER_CARDS.length} Trading Cards; each back shows that customer’s fruit`, pages: sheets('Customers', customerFronts, customerBacks) },
  { file: 'Cards_Guests_A4.pdf', title: 'Special guest cards', what: `${GUESTS.length} guests (pictures are interim) and their backs`, pages: sheets('Special guests', GUESTS.map(guestFront), same(guestBack, GUESTS.length), 'Interim pictures: each guest borrows its event’s scene. Cut on the dashed lines.') },
  { file: 'Cards_Shopkeepers_A4.pdf', title: 'Shopkeeper cards', what: `${RIVALS.length} Stall Signs and their backs`, pages: sheets('Shopkeepers', shopCells, same(shopBack, RIVALS.length)) },
  { file: 'Cards_Events_A4.pdf', title: 'Event cards', what: `${EVENT_CARDS.length} newspaper front pages and their backs`, pages: sheets('Events', eventCells, same(eventBack, EVENT_CARDS.length)) },
  { file: 'Cards_Favours_A4.pdf', title: 'Favour cards', what: `${PRINT_FAVOURS.length} cards (3 of each; use 2 of each at 2 to 4 stalls) and their backs`, pages: sheets('Favours', favourCells, same(favourBack, PRINT_FAVOURS.length)) },
  { file: 'Cards_Deliveries_A4.pdf', title: 'Delivery cards', what: `${FARMER_CARDS.length} lorry cards (all different) and their backs`, pages: sheets('Deliveries', lorryCells, same(lorryBack, FARMER_CARDS.length)) },
  { file: 'Cards_Upgrades_A4.pdf', title: 'Upgrade cards', what: `${upgradeCells.length} stall upgrades and their backs`, pages: sheets('Stall upgrades', upgradeCells, same(upgradeBack, upgradeCells.length)) },
  { file: 'Factory_Customers_bleed.pdf', title: 'Factory: customers', what: 'One card per page, front then back, 3 mm bleed and crop marks', pages: CUSTOMER_CARDS.flatMap((_, i) => [factoryPage(customerFronts[i], 'front'), factoryPage(customerBacks[i], 'back')]) },
  { file: 'Factory_Shopkeepers_bleed.pdf', title: 'Factory: shopkeepers', what: 'Eight fronts, then the one shared back', pages: [...shopCells.map((c) => factoryPage(c, 'front')), factoryPage(shopBack, 'back (all eight)')] },
  { file: 'Factory_Events_bleed.pdf', title: 'Factory: events', what: 'Twenty fronts, then the one shared back', pages: [...eventCells.map((c) => factoryPage(c, 'front', 'pk-factory-gz')), factoryPage(eventBack, 'back (all twenty)', 'pk-factory-gz')] },
];

function coverPage(): Page {
  let at = 2;
  const rows = parts.map((p) => {
    const from = at;
    at += p.pages.length;
    return `<tr><td>${esc(p.title)}</td><td>${esc(p.what)}</td><td>${p.pages.length === 1 ? `p. ${from}` : `pp. ${from}–${at - 1}`}</td></tr>`;
  }).join('');
  return {
    html: `<section class="pg pk-a4 pk-cover"><h1>Fruit Market<br>Print Kit</h1>`
      + `<p class="lede">Every card for the tabletop game in the owner’s deck art: customers as Trading Cards, shopkeepers as Stall Signs and events as newspaper front pages. Names, numbers and prices come straight from the game data (rules version ${RULES_VERSION}), so the cards always match the app.</p>`
      + `<table class="pk-toc"><thead><tr><th>Part</th><th>What it is</th><th>Pages</th></tr></thead><tbody>${rows}</tbody></table>`
      + `<div class="pk-boxes"><div class="pk-box"><h4>Printing at home</h4><ul><li>A4 card (250 to 300 gsm), 100% or “actual size”, background graphics on.</li><li>Double-sided, flip on the long edge: each fronts page is followed by its backs, mirrored to line up.</li><li>Cut on the dashed lines. Cards are 63 × 88 mm (poker size).</li><li>The circles on a customer card hold the fruit pieces sold to that customer.</li></ul></div>`
      + `<div class="pk-box"><h4>Still to come</h4><ul><li>Guest portraits: the three guests borrow their event’s scene for now.</li><li>The customer card back is a new design in the deck-art style; the owner’s PDFs have no back.</li><li>Not restyled yet: the mat, stall sheet and screen, tokens and paper money from the earlier kit.</li><li>Factory files are RGB; the printer converts to CMYK.</li></ul></div></div></section>`,
  };
}

const doc = (title: string, pages: Page[]) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body>${pages.map((p) => p.html).join('\n')}</body></html>`;

const ART_DIRS = ['customers', 'events', 'scenes', 'avatars'];

/**
 * The print art as JPEG (quality 87, same pixel size), flattened onto the card paper the pictures sit on anyway.
 * A PDF keeps a JPEG as it is, but stores a WebP losslessly, which made the kit about four times bigger.
 */
async function jpegArt(browser: Browser, dir: string) {
  const page = await browser.newPage();
  for (const d of ART_DIRS) {
    mkdirSync(join(dir, d), { recursive: true });
    for (const f of readdirSync(join(ART, d)).filter((x) => x.endsWith('.webp'))) {
      const webp = `data:image/webp;base64,${readFileSync(join(ART, d, f)).toString('base64')}`;
      const jpeg = await page.evaluate(async ({ src, paper }) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const g = c.getContext('2d');
        if (!g) throw new Error('no canvas');
        g.fillStyle = paper;
        g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0);
        return c.toDataURL('image/jpeg', 0.87);
      }, { src: webp, paper: C.xPaper });
      writeFileSync(join(dir, d, f.replace(/\.webp$/, '.jpg')), Buffer.from(jpeg.slice(jpeg.indexOf(',') + 1), 'base64'));
    }
  }
  await page.close();
}

/** Swap the app's /art/ URLs for the print pictures and load every picture straight away. */
const forPrint = (html: string, art: string) => html
  .replace(/src="[^"]*?art\/(customers|events|scenes|avatars)\/([\w-]+)\.webp"/g, (_m, d: string, f: string) => `src="${pathToFileURL(join(art, d, `${f}.jpg`)).href}"`)
  .replace(/loading="lazy"/g, 'loading="eager"');

async function render(browser: Browser, tmp: string, title: string, pages: Page[], file: string) {
  const htmlFile = join(tmp, file.replace(/\.pdf$/, '.html'));
  writeFileSync(htmlFile, forPrint(doc(title, pages), join(tmp, 'art')));
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? Promise.resolve() : i.decode())));
  });
  const broken = await page.evaluate(() => [...document.images].filter((i) => !i.naturalWidth).map((i) => i.src.slice(0, 120)));
  if (broken.length) throw new Error(`${file}: ${broken.length} pictures did not load, e.g. ${broken[0]}`);
  // Layout check: nothing may spill off a page or a card, and no one-line label may be cut short.
  const problems = await page.evaluate(() => {
    const out: string[] = [];
    const name = (el: Element) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} "${(el.textContent ?? '').trim().slice(0, 40)}"`;
    const over = (el: Element, w: boolean) => (w ? el.scrollWidth > el.clientWidth + 1 : el.scrollHeight > el.clientHeight + 1);
    // The cards' fixed text boxes (cards.css) count too: their words must fit the box, never run out of it.
    document.querySelectorAll('.pg, .x-card, .pk-board, .x-ss-chalk, .pk-burst, .x-tc-quirk, .x-tc-order, .x-gz-top, .x-gz-body').forEach((el) => {
      if (over(el, false)) out.push(`too tall by ${el.scrollHeight - el.clientHeight}px: ${name(el)}`);
    });
    document.querySelectorAll('.pg *').forEach((el) => {
      const s = getComputedStyle(el);
      if (s.whiteSpace === 'nowrap' && s.overflow === 'hidden' && el.textContent?.trim() && over(el, true)) out.push(`cut short: ${name(el)}`);
    });
    return out;
  });
  if (problems.length) throw new Error(`${file}: layout problems\n${[...new Set(problems)].join('\n')}`);
  await page.pdf({ path: join(OUT, file), preferCSSPageSize: true, printBackground: true });
  await page.close();
  const mb = statSync(join(OUT, file)).size / 1e6;
  console.log(`wrote ${join(OUT, file)} (${pages.length} pages, ${mb.toFixed(1)} MB)`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), 'fruit-print-'));
  const browser = await chromium.launch();
  try {
    await jpegArt(browser, join(tmp, 'art'));
    for (const p of parts) await render(browser, tmp, `Fruit Market: ${p.title}`, p.pages, p.file);
    await render(browser, tmp, 'Fruit Market: Print Kit', [coverPage(), ...parts.flatMap((p) => p.pages)], 'Fruit_Market_Print_Kit.pdf');
  } finally {
    await browser.close();
    rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
