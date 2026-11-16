// The rules guidebook for the table (PLAN-077, rules 18 to 20, PLAN-109; PLAN-111: the update pack for the earlier
// printing is retired, and the guidebook now describes the new table set in print/table).
//   npx vite-node scripts/print-update.ts [outdir]      (normally: print/table)
// Writes the rules guidebook, whole, at the current rules version.
// Names, numbers and prices come from the game data (src/engine/data.ts).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import {
  BASE_BUY, BASE_SHELF, BIG_TABLE, CHARACTER_TRAIT, CHARMER_DAILY_FAVOURS, CHARMER_START_FAVOURS, CUSTOMER_CARDS, EVENT_CARDS, FARMER_CARDS, FAVOUR_DECK,
  FAVOUR_HAND_LIMIT, FAVOURS, FRUIT, GENEROUS_BONUS, JUICE_TIP, MARKET_DAY_EVERY, MAX_STALLS, MAX_UPGRADES, MIN_STALLS,
  NEST_EGG_BONUS, ORDER_BOOK_BONUS, ORDER_CARDS, ORDER_LEAD, RIVALS, ROW_CAP, START_CASH, STREET_PRICE, TOP_UP, TRAITS, UPGRADES, deliveredGreen,
  orderQty, stageAt, stakeFor,
  type FruitId, type Stage,
} from '../src/engine/data';
import { RULES_VERSION } from '../src/net/protocol';
import { fruitSvgString } from '../src/ui/fruitIcons';
import { NO_ORDER_DAYS } from '../src/ui/rulesText';
import { GUESTS, ROOT, UPGRADE_COPIES } from './print-cards';

const OUT = resolve(process.argv[2] ?? join(ROOT, 'print', 'table'));
const FONT = (pkg: string, file: string) => pathToFileURL(join(ROOT, 'node_modules', '@fontsource', pkg, 'files', file)).href;

const INK = '#1f272a', PAPER = '#fffcf5', KRAFT = '#ddd4c6', YEL = '#fec400', SLATE = '#5a6266';
const LANE: Record<FruitId, string> = { blueberry: '#3558a2', watermelon: '#0e9a58', mango: '#fec400', apple: '#e73c35' };
const LANES: FruitId[] = ['blueberry', 'watermelon', 'mango', 'apple'];
const LETTER: Record<Stage, string> = { unripe: 'G', fresh: 'F', okay: 'O', notso: 'S' };
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
  <p><b>No Closing Day and no jam maker.</b> The last day is an ordinary day: customers pay their usual prices, with no extra $1. After its rush the market closes. Fruit left on your shelf at the end is worth nothing, ripe or green.</p>
  <p><b>One perk each in the app.</b> In the app's Daily market and Market League you have no shopkeeper card, so you choose a perk: you are offered only perks no rival holds. On the table nothing changes: no two stalls can be the same shopkeeper.</p>
  <h3>And in rules version 19</h3>
  <p><b>The evening, everyone at once.</b> Every stall decides its evening at the same time (favour cards, and an upgrade after a Market Day) and says "lights out" when it is done; nobody waits for the stall before it. Any number of stalls may play Priority, one card each: at nightfall the one earliest in today's buying order goes first tomorrow, and the other Priority cards go back to their owners' hands.</p>
  <p><b>Standing orders: a higher bid, a smaller stake.</b> Every standing-order card allows a highest bid $2 higher and asks a stake $2 lower (the table under "Standing orders" gives the numbers).</p>
  <h3>And in rules version 18</h3>
  <p><b>Out of cash.</b> At dawn, from Day 2, a stall with an empty shelf and less than $${TOP_UP} is topped up to $${TOP_UP} by the bank.</p>
  <p><b>Standing orders: a stake, not fines.</b> The winner puts down the card's stake. It comes back for a full delivery and is lost otherwise. Only the winner's crate fills the order; rivals are not involved.</p>
  <p><b>What a stall buys is seen while it buys.</b> After buying it goes behind the shutter with the rest of the shelf: you need not say what you bought, and nobody may ask.</p>
  <p><b>Favoured Trade is played after prices flip</b>, by a stall with a tied price, in the open.</p>
  <p><b>Days 1 and 2 have no mango customers</b>, and Mango Craze is never Day 2's event.</p>
  <p><b>Numbers.</b> A green mango costs $${FRUIT.mango.cost.unripe}. Upgrades cost ${Object.values(UPGRADES).map((u) => `${u.title} $${u.cost}`).join(', ')}. Nest Egg starts with $${START_CASH + NEST_EGG_BONUS}. One favour deck of ${FAVOUR_DECK.length} at every table size. The three Bargain blueberry customers pay $${BLUEBERRY_BARGAIN}.</p>
  <p><b>Rulings.</b> A guest joins a full row. The final tie after cash and fruit sold is a shared win. On Day 3 Priority goes ahead of Nest Egg. A Juice Bar's $${JUICE_TIP} is for customers and guests only. A Premium Display never raises a guest's price.</p>
</div>

<h2>What is in the box</h2>
<p>The board (two panels: the Wholesale Market and the customers) · 6 stall sheets (crate, shelf, a price box on each crate lane and a Fruit sold row), 6 shutters and 6 counters (crate count and cash track) · 6 bid cards · 200 fruit pieces, 50 of each fruit · 12 cash markers, two per stall · 6 crate-count markers · 36 served-alone chips, six per stall · ${CUSTOMER_CARDS.length} customer cards and ${GUESTS.length} guest cards · ${EVENT_CARDS.length} event cards and ${FARMER_CARDS.length} lorry cards · ${FAVOUR_DECK.length} favour cards · ${Object.keys(UPGRADES).length * UPGRADE_COPIES} upgrade cards, ${UPGRADE_COPIES} of each · ${ORDER_CARDS.length} standing-order cards · ${RIVALS.length} shopkeeper cards · day marker, first-player token, Shade Cloth marker, six +$200 chips. You also need a dry-wipe pen or pencil for each stall.</p>
<p class="tiny">Where each part comes from: the cards and the player aid are in the print kit (print/kit); the board, stall sheets, counters, shutters, bid cards, tokens and this guidebook in the table set (print/table). The fruit pieces are bought (wooden cubes) or 3D printed (print/fruit-3d), and the pens are bought.</p>

<h2>The fruit</h2>
<p>Every fruit follows the same rule. A <b>Fresh</b> piece sells at the customer's top price. An <b>Okay</b> piece sells for $${OKAY_LESS} less. A <b>Soft</b> piece sells for $${SOFT_LESS} less. <b>Green</b> fruit cannot be sold until it ripens. A fruit's last two days are Okay, then Soft; every day before that is Fresh. Mangoes always arrive Green and spend ${FRUIT.mango.unripeSlots} nights ripening first.</p>
<p>Each lane is that fruit's life, box by box. On the board it runs from the newest box at the top down to Soft; on your stall sheet from the newest on the right to Soft on the left. Every night, every piece moves one box toward Soft. A piece that moves out of its Soft box is thrown away.</p>
<table class="lanes"><tr><th>Fruit</th><th>Lasts</th><th>Its boxes, oldest on the left, with the cost to buy from each</th></tr>${laneRows}</table>
<p class="tiny">S = Soft, O = Okay, F = Fresh, G = Green. Every mango arrives green; no other fruit does.</p>

<h2>Customers</h2>
<p>A customer card shows one or two fruits. For each one it shows how many they want (the circles) and the most they pay for a Fresh piece (the price tag). They pay $${OKAY_LESS} less for Okay and $${SOFT_LESS} less for Soft. The coloured bands at the top and bottom of the card name the customer's freshness type: purple <b>Premium</b> buys Fresh fruit only; teal <b>Everyday</b> buys Fresh or Okay; orange <b>Bargain</b> buys Fresh, Okay or Soft. The bottom band lights the freshness they take.</p>
<p>The back of the card shows only which fruits they want. A face-down customer keeps their amounts, prices and type secret.</p>
<p>Each day brings one <b>regular</b> (drawn face up, a day ahead) and some <b>walk-ins</b> (drawn face down, a day ahead). The crowd is one customer per stall, and never more than ${ROW_CAP}: the regular plus one walk-in for every stall after the first, up to ${ROW_CAP - 1}. With ${BIG_TABLE} stalls every customer wants one more of the fruit marked "+1 at ${BIG_TABLE} stalls" on their card. Nobody waits overnight: a customer who does not get everything leaves. <b>On Day 1 and Day 2 no customer wants a mango</b> (a mango needs two nights to ripen): when you deal those two rows, a card that shows a mango goes to the bottom of the deck and you deal another.</p>

<h2>Set-up</h2>
<ol>
  <li><b>The board.</b> Lay the two panels side by side in the middle of the table: the Wholesale Market on the left, the customers on the right. Shuffle the ${EVENT_CARDS.length} event cards and the ${FARMER_CARDS.length} lorry cards and put each deck face down on its space. Put the day marker on 1. Agree the length: Quick is 8 days, Standard is 10, Long is 14.</li>
  <li><b>The supply.</b> Put all the fruit pieces in a pile within reach. The market starts empty.</li>
  <li><b>Each stall</b> takes a stall sheet, the shutter, the counter, cash markers, a crate-count marker and chips in the same pattern, a bid card and a pen. Lay the sheet with its crate band toward the middle of the table, stand the shutter on line 1 and lay the counter beside the sheet. Put the crate-count marker on 0. On your counter's cash track, put your Tens marker on ${START_CASH - (START_CASH % 10)} and your Ones marker on ${START_CASH % 10}: you start with $${START_CASH}.</li>
  <li><b>First player.</b> Give the first-player token to a stall at random.</li>
  <li><b>Shopkeepers.</b> Lay the ${RIVALS.length} shopkeeper cards face up. Starting with the player to the left of the token, each stall picks one. It gives you one perk for the whole game. Saleh moves his cash to $${START_CASH + NEST_EGG_BONUS}. Ah Chen draws ${CHARMER_START_FAVOURS} favour cards once the deck is ready.</li>
  <li><b>Favour cards and upgrades.</b> Use ${FAVOUR_COPIES} of each favour card (${FAVOUR_DECK.length} cards) at every table size. Shuffle them face down beside the board. Lay the upgrade cards face up in ${Object.keys(UPGRADES).length} piles. Shuffle the ${ORDER_CARDS.length} standing-order cards face down beside them.</li>
  <li><b>Customers.</b> Shuffle the ${CUSTOMER_CARDS.length} customer cards. Keep the ${GUESTS.length} guest cards to one side. Deal today's crowd in a row on the table: one regular face up, then one walk-in face down for every stall after the first, up to four. No mango customers on Day 1 or Day 2 (see Customers).</li>
</ol>

<h2>Money: the cash track</h2>
<p>Your cash is your Tens marker plus your Ones marker, on the cash track on your <b>counter</b>, in front of your shutter. With Tens on 10 and Ones on 4 you have $14. When you are paid or you pay, move the Ones marker, and carry to the Tens marker when you pass 9 or go below 0. If you pass $199, take a +$200 chip and start the Tens again from 0.</p>
<p><b>Cash is public.</b> Everyone can read everyone's cash at any time. Nobody hands money to anybody: each stall moves its own markers while the table watches.</p>
<p><b>Fruit sold.</b> Your stall sheet has a Fruit sold row, numbered from 1. Each time you sell a piece, to a customer, a guest, a standing order or the night hawker, cross off the next number. A piece a Juice Bar turns into juice is not sold. The count matters only if stalls tie on cash at the end.</p>

<h2>A day in five steps</h2>
<div class="beat"><b>1</b><div><h3>Morning</h3>
<ol>
  <li><b>Event.</b> From Day 2 onward, turn over the top event card onto "Today's event" and do what it says. Nobody knows an event before its own morning. There is no event on Day 1. If the event adds walk-ins, deal them face down at the end of today's row. If it removes walk-ins, the last ones in today's row go back under the customer deck. If it brings a guest, add that guest card to the end of the row. If Mango Craze turns up on Day 2, put it at the bottom of the deck and turn over another.</li>
  <li><b>Out of cash.</b> From Day 2: a stall with an empty shelf (no pieces at all, green ones included) and less than $${TOP_UP} is topped up to $${TOP_UP} by the bank. Do this after the event and any Health Inspector charge, before anyone bids or buys.</li>
  <li><b>The lorry.</b> The card on "Tomorrow's lorry" is now today's lorry (on Day 1, turn over the top card of the deck). Find the row for your number of stalls and take that many pieces of each fruit from the supply. Put them in that fruit's box marked "The lorry unloads here". Mangoes always arrive green and go in the far green box. The Seconds Lorry unloads its other fruit into each fruit's freshest Okay box. A Mango Windfall's extra mangoes are ripe: put them in the mango's Fresh box.</li>
  <li><b>Tomorrow.</b> Turn the next lorry card face up on top of today's on "Tomorrow's lorry". Then deal <b>tomorrow's row</b> below today's: one regular face up and the walk-ins face down. Tomorrow's own event may change that row tomorrow morning. Deal nothing for the day after the last day.</li>
  <li><b>On a Market Day.</b> Turn over a standing order and bid for it now, before anyone buys (see Standing orders).</li>
</ol></div></div>
<div class="beat"><b>2</b><div><h3>Buying</h3>
<p>The poorest stall buys first, then the others follow clockwise from it. If stalls tie for poorest, the first of them clockwise from the first-player token goes first. On Day 1, start at the token. This is today's buying order; the evening and the last tie-break use it too.</p>
<p>On your turn, buy up to ${BASE_BUY} pieces. For each one, take a piece from any market box, pay the cost printed on that box, and put the piece in your shelf band, in that fruit's box with the same letter and place (the same distance from the Soft end). Your sheet holds ${BASE_SHELF} pieces in all. You may play Free Fruit, Scout or Fridge on your turn. A piece taken with Free Fruit does not count toward the ${BASE_BUY} you may buy. Buying is done in the open: everyone sees what you take while you buy. <b>After buying it goes behind your shutter</b> with the rest of your shelf, and nobody may ask what you bought.</p></div></div>
<div class="beat"><b>3</b><div><h3>Stocking</h3>
<ol>
  <li><b>The crowd arrives.</b> Turn today's walk-ins face up. The row is always in this order, left to right: a standing order collected today, the regular, the walk-ins in the order they were drawn, then a guest. The regular, the walk-ins and a standing order never make more than five cards: a standing order takes the place of the last walk-in. A guest joins the end of the row even when it is full.</li>
  <li><b>Fill your crate.</b> Behind your shutter, slide each piece you want to sell today straight up, from its shelf box into the crate box in front of it. Any freshness may go in; green fruit may not. Pieces left on the shelf cannot be sold today, and they still age tonight.</li>
  <li><b>Set your crate count.</b> Put your marker on the counter's crate count at the number of pieces in your crate, and say nothing else. Which fruit, and how fresh, stays secret until the bell.</li>
</ol>
<p>You may not ask what is behind a shutter, and nobody has to tell you.</p></div></div>
<div class="beat"><b>4</b><div><h3>The bell</h3>
<p>Behind your shutter, write one price with your pen in the price box of each fruit you have in your crate. One price covers every piece of that fruit. There is no lowest price. When everyone is ready, every stall lifts its shutter and stands it on line 2, all together: every crate and every price shows at once, and no piece is moved. Your shelf stays behind the shutter.</p>
<p><b>Favoured Trade.</b> Once the prices show, a stall that holds Favoured Trade and has a price tied with another stall's price for the same fruit may play it. Tied holders decide one at a time, in today's buying order, in the open: play it or keep it. It cannot be played before the flip.</p>
<p>Your price decides which of your pieces can sell to a customer. Take the customer's top price for today (the price on the card, plus or minus any event): priced <b>at the top price</b>, only a Fresh piece sells; <b>$1 under</b>, a Fresh or Okay piece sells; <b>$2 under, or less</b>, any piece sells; <b>over the top price</b>, nothing sells to that customer. The customer must also accept the freshness: a Premium customer never takes Okay or Soft fruit, however cheap.</p></div></div>
<div class="beat"><b>5</b><div><h3>The rush</h3>
<p>Serve the customers one at a time, left to right. The stall that bought last this morning is the crier: they read each customer aloud. For each fruit on the card:</p>
<ol>
  <li>The customer buys from the cheapest stall that has a piece they will take at that price.</li>
  <li>That stall hands over the oldest piece in its crate that is fresh enough for its price, puts it on one of the card's circles, adds its own price to its cash track, and crosses off the next number in its Fruit sold row.</li>
  <li>If the customer still wants more, they carry on with the same stall, and then spill to the next cheapest stall, until the circles are full or nobody else can sell.</li>
</ol>
<p><b>Tied prices</b> are broken in this order: a stall that played Favoured Trade; then the stall whose piece is younger; then Rosa the Haggler; then whoever bought earlier this morning.</p>
<p><b>Serving alone.</b> The first stall to sell to a customer puts one of its chips on the card. If a second stall sells to the same customer, the chip comes off. When the whole order is filled and a chip is still there, that stall served the customer alone: it draws a favour card (one a day at most, ${CHARMER_DAILY_FAVOURS} for the Charmer, and never past a hand of ${FAVOUR_HAND_LIMIT}, ${FAVOUR_HAND_LIMIT + 1} for the Charmer).</p>
<p><b>After the last customer.</b> Every customer leaves, served or not. Stand your shutter back on line 1. Unsold crate pieces may stay in the crate or slide back to the shelf box behind them. Wipe your prices.</p></div></div>

<h3>Evening and night</h3>
<p><b>Evening.</b> All stalls at once: each stall may play evening favour cards (Priority, Gossip) and says "lights out" when it is done. Any number of stalls may play Priority, one card each; at nightfall the one earliest in today's buying order goes first tomorrow and the other Priority cards go back to their owners' hands. On the evening after a Market Day (days ${MARKET_DAYS}) each stall may also build <b>one upgrade</b> from the five piles: pay its cost and take the card. A stall has room for ${MAX_UPGRADES}. Pak Din lays the Shade Cloth marker on one fruit lane of his sheet. Farah looks at one of tomorrow's walk-ins.</p>
<p><b>Night.</b> On the board and on every stall sheet, every piece moves one box toward Soft (down on the board, left on your sheet). Pieces that slide out of a Soft box go back to the supply. Tomorrow's row moves up to become today's. Then pass the first-player token one seat clockwise and move the day marker on.</p>

<h2>Market Days and the end</h2>
<p><b>Market Days</b> are days ${MARKET_DAYS}, but never the last day. They bring a standing order in the morning (when it can be collected by the last day: none on ${NO_ORDER_DAYS}) and an upgrade that evening. The lorry still comes. <b>The last day</b> is an ordinary day. After its rush the market closes. Fruit left on your shelf is worth nothing. <b>The winner</b> is the stall with the most cash. Upgrades are worth nothing. If stalls tie, the one that sold more fruit wins: every piece sold to a customer, a guest, a standing order or the night hawker counts (see Fruit sold, under Money). If they are still tied, they share the win.</p>

<h2>Standing orders</h2>
<p>A standing order is one big public order. It is turned over on a Market Day morning and collected ${ORDER_LEAD} days later. It wants one fruit, Fresh or Okay: ${ORDER_SIZES}. Do not turn one over if its due day would be after the last day (none on ${NO_ORDER_DAYS}).</p>
<ol>
  <li><b>Bid, in the open.</b> Before anyone buys, each stall decides. To bid, write on your bid card the price per piece you would fill the order for (from $1 up to the price on the card) and lay it face down in front of your shutter. To pass, say "pass". Everyone can see who is bidding and who has passed; nobody sees a price. <b>You may change your mind</b> (change what you wrote, take your card back, or put it down after passing) for as long as any stall is still deciding. When the last stall decides, flip all bid cards together. The lowest bid wins. A tie goes to a stall with an Order Book, then to the stall that buys earlier today. If everyone passes, discard the card. You may only bid if you have the card's stake in cash (half, rounded down, with an Order Book); you may always pass.</li>
  <li><b>The stake.</b> The winner pays the stake at once and puts it on the card, with one of its chips.</li>
  <li><b>Get ready.</b> The winner has three buying turns (today, tomorrow and the due day) to have the pieces on its shelf.</li>
  <li><b>Collect.</b> On the due day the card stands at the front of the row and is served first, from the winner's crate only. It takes the winner's Fresh or Okay pieces of that fruit, freshest first, up to the number it wants, and pays the winner its bid for each ($${ORDER_BOOK_BONUS} more for each with an Order Book). Rivals' fruit is never taken and rivals are paid nothing. Anything the order did not get simply leaves.</li>
  <li><b>The stake comes back, or not.</b> If the winner delivered every piece, it takes its stake back at once. If not, the stake goes to the bank. There is no other fine.</li>
</ol>
<table><tr><th>Orders</th><th>Fruit</th><th>Highest bid allowed</th><th>Stake</th><th>Stake with an Order Book</th></tr>${orderRows}</table>
<p>A standing order draws no favour card and pays no tips (a Juice Bar adds nothing either), and no event changes what it pays. It is not used in the Basic game.</p>

<h2>Guests</h2>
<p>Five events bring a guest card. The guest joins the end of today's row and is served like any other customer. A guest joins even when the row is full. A guest's price is fixed: the event's own price change is not added to it, and a Premium Display does not raise it.</p>
<table><tr><th>Guest</th><th>Event</th><th>Wants</th></tr>${guests}</table>

<h2>How many walk-ins</h2>
<table><tr><th>Stalls</th><th>Regular + walk-ins</th><th>Festival</th><th>Tourist Bus</th><th>Monsoon Downpour</th></tr>
<tr><td>2</td><td>1 + 1</td><td>+1</td><td>+2</td><td>−1</td></tr><tr><td>3</td><td>1 + 2</td><td>+1</td><td>+2</td><td>−1</td></tr>
<tr><td>4</td><td>1 + 3</td><td>+1 (row full)</td><td>+1 (row full)</td><td>−2</td></tr><tr><td>5</td><td>1 + 4</td><td>row full</td><td>row full</td><td>−2</td></tr>
<tr><td>6</td><td>1 + 4, each wanting 1 more</td><td>row full</td><td>row full</td><td>−2</td></tr></table>
<p class="tiny">Never more than four walk-ins, and never fewer than none. An event changes today's row only, on its own morning.</p>

<h2>Event cards (${EVENT_CARDS.length})</h2>
<table><tr><th>Event</th><th>What it does today</th></tr>${evRows}</table>
<p class="tiny">On the card, a price has a small badge beside it: a crate of fruit for a price at the Wholesale Market, a customer's face for what customers pay. A card has room for two boxes, so Blueberry Glut shows its two prices and leaves its extra blueberries to its words. A card that brings a guest only names it; the guest's own card says what it wants. "Customers pay $1 more" raises every customer's top price. A Heatwave night slides every piece two boxes. After a Monsoon Downpour nothing slides at all. The Health Inspector charges for the Soft pieces on your sheet before anyone buys: count them yourself, behind your shutter, and pay.</p>

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
  <li>A Juice Bar's $${JUICE_TIP} is for Okay or Soft pieces sold to customers and guests in the rush: not for a standing order or the night hawker.</li>
  <li>On Day 3 a stall that played Priority buys first and Nest Egg second.</li>
  <li>Pasar Malam: after the last customer, the night hawker buys 1 of each fruit still in each stall's crate for $${HAWKER}, oldest piece first, any freshness.</li>
  <li>The Health Inspector never comes on the last day. If that card is drawn then, draw another.</li>
  <li>Scout: turn one face-down walk-in up for yourself only, look, and turn it back. Say aloud that you played it.</li>
</ul>
<h3>Other ways to play</h3>
<table><tr><th>Option</th><th>What changes</th></tr>
<tr><td><b>Basic game</b></td><td>No shopkeepers, favour cards, upgrades or standing orders: just buying, stocking and the bell. Good for a first game.</td></tr>
<tr><td><b>Fixed prices (beginner)</b></td><td>Ignore the prices on the cards. Every customer pays the same top price for a Fresh piece: blueberry $${STREET_PRICE.blueberry}, watermelon $${STREET_PRICE.watermelon}, apple $${STREET_PRICE.apple}, mango $${STREET_PRICE.mango}. Generous customers pay $${GENEROUS_BONUS} more: numbers ${list(GENEROUS)}.</td></tr>
<tr><td><b>No Market Days</b></td><td>No standing orders. Upgrades are still built on the evenings after days ${MARKET_DAYS}.</td></tr></table>
<p class="oneline"><b>The day on one line.</b> Morning: event, top-up for a stall out of cash, lorry, tomorrow's lorry and tomorrow's customers, standing-order bids on a Market Day · Buying: poorest first, up to 4 · Stocking: fill the crate behind the shutter, set the crate count · The bell: write one price per fruit, step the shutters back together, Favoured Trade for a tied price · The rush: cheapest stall first, oldest fresh-enough piece, served-alone chips · Evening: everyone at once, favour cards, upgrades, lights out · Night: everything moves one box toward Soft.</p>
<p class="tiny">These tabletop rules are rules version ${RULES_VERSION}, the same rules the Fruit Market app plays by. The table pieces (the two-panel board, the crate band in front of the shelf, the price boxes, the crate count and cash track on the counter, the shutter's two lines and the bid card) are how those rules are run by hand.</p>
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
  } finally {
    await browser.close();
    rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
