// Table animations: the morning delivery, buying, selling and nightfall.
// Each one returns when its animation has finished. They only draw; they never change the game.
// Every length is named in ../motion.ts (BEAT); pauses to read use A.hold, which reduced motion keeps.
import { FAVOURS, FRUIT, FRUITS, JUICE_VALUE, type FruitId } from '../../engine/data';
import { leavingTonight, nightOutlook, type GameState } from '../../engine/game';
import { Coin, Fruit } from '../art';
import * as A from '../anim';
import { laneClass } from '../cards';
import { holdCash, payCash, shownCash } from '../cashShown';
import { landPiece, releaseRush, serveLine, showFavour } from '../rushShown';
import { releaseStock, sellStock, stockHeld } from '../stockShown';
import { fx } from '../fx';
import { FavourMark, type ShowState } from './panels/Showdown';
import { built, firstInLine } from './dayBeats';
import { MAX_COINS, MAX_PIECES, blockStarts, rushCards, rushPace, type RushBlock, type RushCard } from './rush';

/** The lorry unloads today's delivery into the market: played as buying starts, after the morning's event card (PLAN-065). */
export async function delivery(g: GameState) {
  if (g.phase !== 'morning' && g.phase !== 'buy') return;
  const jobs: Promise<void>[] = [];
  // No lorry is drawn today, so nothing waits for one to pull up (PLAN-081): the fruit leaves for the lanes at once.
  let d = 0;
  for (const f of FRUITS) {
    const n = Math.min(g.delivery[f] ?? 0, 4);
    const unripe = g.deliveryUnripe === f;
    const pos = unripe ? g.market[f].length - 1 : FRUIT[f].ripe.length - 1;
    for (let i = 0; i < n; i++) {
      jobs.push(A.fly(['lorry', 'sky'], [`m-${f}-${pos}`, `mk-${f}`, 'truck'], <Fruit id={f} size={26} stage={unripe ? 'unripe' : 'fresh'} />, { delay: d, duration: A.BEAT.lorry.fly }));
      d += A.BEAT.lorry.gap;
    }
  }
  if (jobs.length) fx.card();
  await Promise.all(jobs);
}

export async function moves(prev: GameState, next: GameState) {
  const jobs: Promise<void>[] = [];
  let d = 0;
  for (const f of FRUITS) {
    for (let pos = 0; pos < next.market[f].length; pos++) {
      const diff = prev.market[f][pos] - next.market[f][pos];
      if (!diff) continue;
      // Whose shelf changed. A rival's shelf is secret (rules 15: online it is not even sent), but buying is done in the
      // open, so the piece still flies to the stall whose turn it was.
      let p = next.players.findIndex((pl, i) => pl.stock[f][pos] !== prev.players[i].stock[f][pos]);
      if (p < 0 && prev.phase === 'buy') p = prev.order[prev.turn] ?? -1;
      if (p < 0) continue;
      for (let k = 0; k < Math.min(Math.abs(diff), 5); k++) {
        const node = <Fruit id={f} size={30} stage={pos >= FRUIT[f].ripe.length ? 'unripe' : undefined} />;
        if (diff > 0) jobs.push(A.fly([`m-${f}-${pos}`, `mk-${f}`, `cart-${f}`], [`p${p}-${f}`, `p${p}`], node, { delay: d }));
        else jobs.push(A.fly([`p${p}-${f}`, `p${p}`], [`m-${f}-${pos}`, `mk-${f}`, `cart-${f}`], node, { delay: d }));
        d += A.BEAT.piece.gap;
      }
    }
  }
  next.players.forEach((pl, i) => {
    const before = prev.players[i];
    if (pl.favours.length < before.favours.length) {
      const played = before.favours.find((id, k) => pl.favours[k] !== id) ?? before.favours[before.favours.length - 1];
      const t = A.tag(`p${i}`, `${FAVOURS[played].title}!`, 'favour');
      fx.card();
      // A pause to read. In the evening the whole beat stays under a second (PLAN-084); with reduced motion, when
      // nothing else shows what happened, the label is held for the full pause.
      jobs.push((prev.phase === 'evening' && !A.isReduced() ? A.hold(A.BEAT.evening.label) : A.hold(A.BEAT.label.read)).then(() => t.remove()));
    }
    // An upgrade built (PLAN-084): its price travels to the market as coins and, for your own, the card travels from
    // its offer to your stall, where its mark lands on the shelf dock (dayBeats.tsx).
    if (pl.upgrades.length > before.upgrades.length) jobs.push(built(i, pl.upgrades[pl.upgrades.length - 1]));
    const gained = pl.cash - before.cash;
    if (gained > 0 && pl.favours.length < before.favours.length) A.floatText(`p${i}-cash`, `+$${gained}`);
  });
  // Priority played (PLAN-084): that stall's mark goes to the front of tomorrow's line.
  if (next.priorityNext !== null && prev.priorityNext === null) jobs.push(firstInLine(next, next.priorityNext));
  if (jobs.length && d > 0) fx.buy();
  await Promise.all(jobs);
}

/** Pays a stall on the table (cashShown.ts: its total counts up), and keeps the count so the rush can wait for it to end. */
type Pay = (player: number, amount: number) => void;

/** A thing on the rush sheet (panels/Showdown.tsx), or null when it is not on the screen. */
const onSheet = (sel: string): Element | null => document.querySelector(`.rush-sheet ${sel}`);
/** A stall's offer row on the customer's card, by its name on the table. */
const offerRow = (fruit: FruitId, player: number) => `ro-${fruit}-${player}`;

/**
 * Brings a fruit's offers into view when a customer's offers do not all fit under the card (a small phone, many
 * stalls): the list is moved, its blocks slide to their new places (the shared slide), and the sale starts once they
 * rest. Nothing happens when everything fits.
 */
async function showBlock(fruit: FruitId) {
  const list = onSheet('.rh-offers');
  const block = onSheet(`.rh-block.${laneClass(fruit)}`);
  if (!list || !block || list.scrollHeight <= list.clientHeight) return;
  const room = list.getBoundingClientRect();
  const at = block.getBoundingClientRect();
  // As far as needed to show the whole block, and never so far that its heading leaves the top.
  const by = at.bottom > room.bottom ? Math.min(at.top - room.top, at.bottom - room.bottom) : at.top < room.top ? at.top - room.top : 0;
  if (Math.abs(by) < 1) return;
  const blocks = [...list.children].filter((el): el is HTMLElement => el instanceof HTMLElement);
  const was = blocks.map((el) => A.boxOf(el));
  list.scrollTop += by;
  blocks.forEach((el, i) => A.flipFrom(el, was[i], { duration: A.FEEL.sheetIn }));
  await A.wait(A.FEEL.sheetIn);
  await A.frame();
}

/**
 * One fruit a customer came for, as travel (flow study D3): the pieces go from each selling stall's row to the
 * customer's card, cheapest stall first, and the coins come back from the card to that stall: to your cash in the top
 * bar, or to a rival's row. A dot on the card is filled as its piece lands; the stall's cash counts up and its shelf
 * drops as its first coin lands. When everything has landed the fruit's rows are marked (rushShown.ts).
 */
async function sellBlock(card: RushCard, b: RushBlock, viewer: number, pay: Pay) {
  const r = A.BEAT.rush;
  await showBlock(b.fruit);
  const jobs: Promise<void>[] = [];
  const cardRow = `.rh-card .wc-rw.${laneClass(b.fruit)}`;
  const tag = onSheet(`${cardRow} .wc-tag`) ?? 'rs-card';
  let sent = 0;
  for (const row of b.rows) {
    if (!row.sold) continue;
    const stall = onSheet(`[data-a="${offerRow(b.fruit, row.player)}"] .tk-swatch`) ?? offerRow(b.fruit, row.player);
    const pieces = Math.min(row.sold, MAX_PIECES);
    let last = 0;
    for (let k = 0; k < pieces; k++) {
      last = sent * r.pieceGap;
      // A big sale is drawn as four pieces: the last one fills the dots of the pieces not drawn as well.
      const lands = k === pieces - 1 ? 1 + row.sold - pieces : 1;
      jobs.push(A.fly(stall, onSheet(`${cardRow} .wc-dots i:nth-child(${sent + 1})`) ?? 'rs-card', <Fruit id={b.fruit} size={24} stage={row.pieces?.[k] ?? row.freshest ?? undefined} />, {
        delay: last, duration: A.FEEL.travel, path: 'low', swell: false, onLand: () => landPiece(card.customerId, b.fruit, lands),
      }));
      sent++;
    }
    // The coins leave the card as the stall's last piece lands on it.
    const cash = row.player === viewer ? `p${viewer}-cash` : stall;
    for (let k = 0; k < Math.min(row.sold, MAX_COINS); k++) {
      jobs.push(A.fly(tag, cash, <Coin size={k ? 20 : 24} />, {
        delay: last + A.FEEL.travel + k * r.coinGap, duration: A.FEEL.coin, path: 'low',
        // This customer's payment lands now, so the stall's total climbs here and not before, and the pieces leave its shelf.
        onLand: k ? undefined : () => { fx.coin(); pay(row.player, row.paid); sellStock(row.player, b.fruit, row.sold); },
      }));
    }
  }
  await Promise.all(jobs);
  serveLine(card.customerId, b.fruit);
}

/** Every fruit of one customer in turn: a fruit that sold starts a beat after the one before (rush.ts blockStarts). */
async function sell(card: RushCard, viewer: number, pay: Pay) {
  const starts = blockStarts(card);
  await Promise.all(card.blocks.map((b, k) => A.wait(starts[k]).then(() => sellBlock(card, b, viewer, pay))));
}

/**
 * What comes with the customer and not with a fruit, shown while the result is read: a tip or a standing order's stake
 * as a coin from the card to the stall, and a favour card won for serving the whole order alone, which slides from
 * the customer's picture to the stall that won it (face up to this stall, face down to a rival).
 */
async function gifts(card: RushCard, viewer: number, pay: Pay) {
  const from = onSheet('.rh-card .wc-custpic') ?? 'rs-card';
  // A stall's row on this card (the first fruit it sold), and a part of it: its mark, or the result at its end.
  const stallOf = (player: number, part: string) => {
    const b = card.blocks.find((x) => x.rows.some((row) => row.player === player && row.sold > 0)) ?? card.blocks.find((x) => x.rows.some((row) => row.player === player));
    return b ? onSheet(`[data-a="${offerRow(b.fruit, player)}"] ${part}`) ?? offerRow(b.fruit, player) : 'rs-card';
  };
  const jobs = card.extras.map((x) => A.fly(from, x.player === viewer ? `p${viewer}-cash` : stallOf(x.player, '.tk-swatch'), <Coin size={24} />, {
    duration: A.FEEL.coin, path: 'low', onLand: () => { fx.coin(); pay(x.player, x.amount); },
  }));
  const f = card.favour;
  if (f) {
    fx.card();
    // The card lands beside the row's result, where it then lies (panels/Showdown.tsx).
    jobs.push(A.fly(from, stallOf(f.player, '.rh-res'), <FavourMark id={f.id} />, { duration: A.BEAT.rush.favour, path: 'low', swell: false, onLand: () => showFavour(card.customerId, f.player) }));
  }
  await Promise.all(jobs);
}

/** A customer whose card is not played (Skip, reduced motion): every stall that sold is simply paid and the sale is shown.
 *  `favour`: the favour card won is shown as well (false: the caller shows it). */
function settle(card: RushCard, pay: Pay, favour = true) {
  for (const b of card.blocks) {
    for (const row of b.rows) {
      if (!row.sold) continue;
      pay(row.player, row.paid);
      sellStock(row.player, b.fruit, row.sold);
    }
    serveLine(card.customerId, b.fruit);
  }
  for (const x of card.extras) pay(x.player, x.amount);
  if (favour && card.favour) showFavour(card.customerId, card.favour.player);
}

/** How long "No sales today" stays up, in ms at normal speed. */
export const NO_SALES_READ = A.BEAT.bell.noSales;
/** The bell's travel (flow study D3): the bell swings, then stall by stall a row lifts and its price tags turn face up. */
export const bellOpening = (stalls: number) => A.BEAT.bell.swing + Math.max(0, stalls - 1) * A.BEAT.bell.gap + A.BEAT.bell.lid + A.FEEL.turn;
/** The whole bell untouched, in ms at normal speed: the travel and the pause to read. About 2.6 s at four stalls. */
export const bellLength = (stalls: number) => bellOpening(stalls) + A.BEAT.bell.read;

/** The bell while it rings: how many rows have turned face up so far (0 while it swings); null when it is not ringing. */
export type BellShow = number | null;

/**
 * The bell (rules 15; PLAN-085): the bell swings and sounds, then stall by stall, in today's line-up, each row's
 * price tags turn face up (the sheet draws them: panels/PricingTable.tsx), then a pause to read. With reduced motion
 * nothing travels: every row is open at once and the reading pause is kept. A tap ends the bell where it stands:
 * every row is shown open and the pause is over.
 */
export async function bellRings(g: GameState, setBell?: (open: BellShow) => void) {
  const n = g.players.length;
  setBell?.(0);
  fx.card();
  await A.wait(A.BEAT.bell.swing);
  for (let k = 1; k <= n && !A.hurried(); k++) {
    setBell?.(k);
    if (k < n) await A.wait(A.BEAT.bell.gap);
  }
  setBell?.(n);
  if (A.hurried()) return;
  await A.wait(A.BEAT.bell.lid + A.FEEL.turn);
  if (A.hurried()) return;
  await A.hold(A.BEAT.bell.read);
}

// ---------- Favoured Trade (rules 18): the question under the open rows, and the card played ----------

/** Kept out of sight until the card has landed on the tag: the stamp of a Favoured Trade just played (daysheet.css). */
const HOLD_STAMP = 'fm-hold-stamp';
const holdStamp = (on: boolean) => { if (typeof document !== 'undefined') document.documentElement?.classList?.toggle(HOLD_STAMP, on); };

/** The stall that has just answered the Favoured Trade question, and whether it played the card (null: not such a step). */
export function tieAnswer(prev: GameState, next: GameState): { p: number; played: boolean } | null {
  const p = prev.phase === 'tie' ? prev.tieAsk?.[0] : undefined;
  if (p === undefined || next.day !== prev.day) return null;
  return { p, played: !prev.players[p].favouredTrade && !!next.players[p]?.favouredTrade };
}

/**
 * Before the answer is shown: when the card is played, the place it lies now is noted (the question's heading for
 * this stall, the stall's own row for a rival), and its stamp is held back until the card has landed on the tag.
 * Returns the place to travel from.
 */
export function tieFrom(a: { p: number; played: boolean }, viewer: number): A.Box | null {
  if (!a.played || typeof document === 'undefined') return null;
  holdStamp(true);
  return A.boxOf(a.p === viewer ? document.querySelector('[data-a="tie-kind"]') : document.querySelector(`[data-a="bell-p${a.p}"] .tk-swatch`));
}

/**
 * Favoured Trade played by stall `p`: the card slides from where it lay to the stall's tied price tag and stamps it
 * (the stamp shows as it lands), then a pause. The rush follows; the bell is not shown again. With reduced motion
 * nothing travels: the card's name is shown on the stall's row for a pause to read.
 */
export async function tiePlayed(p: number, from: A.Box | null): Promise<void> {
  if (typeof document === 'undefined') { holdStamp(false); return; }
  const tag = document.querySelector(`[data-a^="bell-${p}-"].tie`);
  let spot: HTMLElement | null = null;
  if (from) {
    // The question has left the table by now: a place that is not drawn stands in for where the card lay.
    spot = document.createElement('i');
    spot.setAttribute('aria-hidden', 'true');
    spot.style.cssText = `position:fixed;left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px;visibility:hidden;pointer-events:none`;
    document.body.appendChild(spot);
  }
  fx.card();
  const label = A.isReduced() ? A.tag(`bell-p${p}`, FAVOURS.favouredTrade.title, 'favour') : null;
  try {
    await A.fly(spot ?? `bell-p${p}`, tag ?? `bell-p${p}`, <FavourMark id="favouredTrade" />, { duration: A.FEEL.travel, path: 'low', swell: false, onLand: () => holdStamp(false) });
    document.querySelectorAll(`[data-a^="bell-${p}-"].tie`).forEach((el) => A.pulse(el.getAttribute('data-a') ?? ''));
    await A.wait(A.BEAT.tie.stamp);
    await A.hold(A.isReduced() ? A.BEAT.label.read : A.BEAT.tie.pause);
  } finally {
    holdStamp(false);
    spot?.remove();
    label?.remove();
  }
}

/** `rung`: the bell has already rung today (the Favoured Trade step came between), so it is not shown again. */
export async function reveal(g: GameState, viewer: number, setShow: (a: ShowState | null) => void, setBell?: (open: BellShow) => void, rung = false) {
  const r = g.results!;
  if (!r.lines.some((l) => l.offers.length > 0)) {
    const t = A.tag('street', 'No sales today', 'big');
    // A pause to read, so it is kept with reduced motion (PLAN-081: it used to shrink to a twentieth of a second).
    await A.hold(NO_SALES_READ);
    t.remove();
    return;
  }
  // The bell (rules 15): every row opens with its prices, stall by stall, and stays long enough to read; then the
  // rush starts.
  if (!rung) await bellRings(g, setBell);
  setBell?.(null);
  // A tap on the table ends the bell and nothing more: the rush then starts at its own pace. Skip hurries the whole
  // rush; it also lets the shelves go, which tells the two apart.
  if (A.hurried() && stockHeld()) A.resetHurry();
  // One card for each customer (DEC-086), in the order they are served: the card comes from the row, every stall's
  // offer lies under it in price order, the sales travel, the result is read for about a second and the card goes
  // back. A tap moves on to the next customer at once; Skip settles the rest without their cards.
  const cards = rushCards(g, viewer);
  const row = cards.map((c) => ({ id: c.customerId, name: c.name, guest: c.kind === 'guest' }));
  const served: number[] = [];
  const late: RushCard[] = [];
  // Every payment's count, so that what is left over at the end is worked out once all of them have been counted.
  const counting: Promise<void>[] = [];
  const pay: Pay = (player, amount) => { counting.push(payCash(player, amount)); };
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    if (A.hurried()) {
      // Skip shows the final shelves at once (the cash still climbs as the stalls are paid).
      releaseStock();
      settle(card, pay, false);
      if (card.favour) late.push(card);
      continue;
    }
    A.resetStep();
    const base = { card, n: i + 1, of: cards.length, row, served: [...served] };
    const pace = rushPace(card);
    // With reduced motion nothing travels: the customer's card is shown with its result, and held to be read.
    const still = A.isReduced();
    if (still) settle(card, pay);
    else {
      setShow({ ...base, stage: 'in' });
      fx.card();
      await A.wait(pace.in);
      setShow({ ...base, stage: 'rows' });
      fx.tap();
      await A.wait(pace.rows);
      await sell(card, viewer, pay);
    }
    setShow({ ...base, stage: 'result' });
    await A.frame();
    await Promise.all([still ? null : gifts(card, viewer, pay), A.hold(pace.read)]);
    served.push(card.customerId);
    setShow({ ...base, stage: 'out', served: [...served] });
    // The card's way back to the row, and one frame more so that its last frame is drawn before the card is taken away.
    await A.wait(pace.out);
    await A.frame();
  }
  setShow(null);
  releaseStock();
  // Favour cards won by customers whose cards were skipped: a label over the stall, as before.
  for (const card of late) {
    const t = A.tag(`p${card.favour!.player}`, 'Favour card!', 'favour');
    fx.card();
    await A.hold(A.BEAT.label.favourWon);
    t.remove();
    showFavour(card.customerId, card.favour!.player);
  }
  // Money that was not paid customer by customer (Pasar Malam's night hawker) lands last, then the real totals show
  // again. Every customer's payment has been counted by then (after Skip or a tap the counts may still be running), so
  // nothing a customer paid is taken for it.
  await Promise.all(counting);
  let tipped = false;
  g.players.forEach((pl, p) => {
    const tip = pl.cash - shownCash(p, pl.cash);
    if (tip <= 0) return;
    tipped = true;
    A.floatText(`p${p}-cash`, `+$${tip} bonus`);
    void payCash(p, tip);
  });
  if (tipped) { fx.coin(); await A.hold(A.BEAT.label.bonus); }
  holdCash(null);
  releaseRush();
}

/**
 * The night panel's slide, set from here so the panel and its slide run on one clock (PLAN-081): null while dusk falls,
 * then the slide's length in ms while every piece moves one box older, then 'done' once the pieces rest in their new boxes.
 */
export type NightSlide = number | 'done' | null;
/** The night's steps in ms at normal speed: dusk falls and the panel rises, every piece slides (slow enough to watch,
 *  PLAN-076), a beat for the last piece to settle, then a moment to read the panel. 3.3 s in all before any spoiled
 *  piece drops, as before. Named in motion.ts with the other lengths. */
export const NIGHT = A.BEAT.night;

export async function nightfall(g: GameState, setNight: (on: boolean) => void, setSlide: (s: NightSlide) => void = () => {}) {
  setSlide(null);
  setNight(true);
  fx.night();
  // The night panel (NightShift) slides every piece one box older before the spoiled ones drop (PLAN-071). The slide
  // is given its length from here and this script waits that long (and a beat more), whatever the speed, so the slide
  // always ends before the panel goes. A tap ends the pause, and the pieces are then shown in their new boxes at once.
  // With reduced motion nothing slides (the stylesheet turns the move off) and the pause is kept, to read the panel.
  await A.wait(NIGHT.dusk);
  setSlide(A.held(NIGHT.slide));
  await A.hold(NIGHT.slide + NIGHT.settle);
  setSlide('done');
  await A.hold(NIGHT.read);
  const heat = g.event?.ageExtra ?? 0;
  const jobs: Promise<void>[] = [];
  let d = 0;
  const spoil = (anchor: string[], f: FruitId, n: number) => {
    for (let k = 0; k < Math.min(n, 3); k++) { jobs.push(A.drop(anchor, <Fruit id={f} size={26} stage="notso" />, d)); d += NIGHT.gap; }
  };
  // A Juice Bar's pieces fly to the cash as coins instead of rotting (one sprite each, like the drop they replace).
  const juice = (p: number, f: FruitId, n: number) => {
    for (let k = 0; k < n; k++) { jobs.push(A.fly([`p${p}-${f}`, `p${p}`], `p${p}-cash`, <Coin size={22} />, { delay: d, duration: NIGHT.juiceCoin })); d += NIGHT.gap; }
  };
  // The engine's own forecast for each shelf, so the picture matches the night (Cold Room, Heatwave, Juice Bar).
  const juiced = g.players.map((_, p) => nightOutlook(g, p).juice);
  const shelves = g.players.map((_, p) => ({ leaving: leavingTonight(g, p), juice: juiced[p] }));
  for (const f of FRUITS) {
    spoil([`cart-${f}`], f, g.market[f][0] + (heat ? g.market[f][1] : 0));
    shelves.forEach((sh, p) => {
      // The juice comes from the first pieces leaving, fruit by fruit (the rules only count how many).
      const j = Math.min(sh.juice, sh.leaving[f]);
      sh.juice -= j;
      juice(p, f, j);
      spoil([`p${p}-${f}`], f, sh.leaving[f] - j);
    });
  }
  await Promise.all(jobs);
  juiced.forEach((n, p) => { if (n) A.floatText(`p${p}-cash`, `+$${n * JUICE_VALUE} juice`); });
  if (juiced.some((n) => n > 0)) fx.coin();
  await A.wait(NIGHT.end);
}
