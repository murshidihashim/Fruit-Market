// Table animations: the lorry, buying, the customers' arrival, selling and nightfall.
// Each one returns when its animation has finished. They only draw; they never change the game.
// Every length is named in ../motion.ts (BEAT); pauses to read use A.hold, which reduced motion keeps.
import { FAVOURS, FRUITS, JUICE_VALUE, stageAt, type FruitId } from '../../engine/data';
import { leavingTonight, marketCost, nightOutlook, type GameState } from '../../engine/game';
import { Coin, Fruit } from '../art';
import * as A from '../anim';
import { laneClass } from '../cards';
import { holdCash, payCash, shownCash, takeCash } from '../cashShown';
import { landPiece, liftPiece, lineShown, payShown, releaseRush, serveLine, showFavour } from '../rushShown';
import { releaseStock, sellStock, stockHeld } from '../stockShown';
import { deliveryBoxes } from '../tableModel';
import { countMarket, holdCards, shiftBought, shiftMarket, shiftShelf, turnCard } from '../tableShown';
import { fx } from '../fx';
import { FavourMark } from './panels/RushTable';
import { built, firstInLine } from './dayBeats';
import { MAX_COINS, MAX_PIECES, rushCards, type RushBlock, type RushCard, type ShowState } from './rush';

// ---------- the lorry ----------

/** Buying is about to start: the lanes are held back at what they held before today's lorry (tableShown.ts), so a
 *  box's number counts up only as its crate lands. Called before the new state is drawn. */
export function holdDelivery(g: GameState) {
  for (const c of deliveryBoxes(g)) shiftMarket(c.f, c.pos, -c.n);
}

/**
 * The lorry unloads (PLAN-085; flow study D3), played as buying starts: it drives in beside the market's label
 * (table.tsx Lorry; the stylesheet moves it, over the same length), one crate for each fruit slides to that fruit's
 * entry box, a little apart, and the box's number counts up as its crate lands. About 1.2 s. A tap shows the full
 * lanes at once; with reduced motion nothing travels and the numbers are simply there.
 */
export async function delivery(g: GameState) {
  if (g.phase !== 'buy') return;
  const crates = deliveryBoxes(g);
  if (!crates.length) return;
  fx.card();
  await A.wait(A.BEAT.lorry.drive);
  await Promise.all(crates.map((c, i) => A.fly('lorry', [`m-${c.f}-${c.pos}`, `mk-${c.f}`, 'truck'], <span class="tb-crate"><Fruit id={c.f} size={16} stage={c.stage} /></span>, {
    delay: i * A.BEAT.lorry.gap, duration: A.BEAT.lorry.crate, path: 'low', swell: false,
  }).then(() => countMarket(c.f, c.pos, c.n))));
}

// ---------- buying ----------

/** Pieces that left a box of the market (n above 0) or came back to it (below 0) between two states. */
export interface Deal { f: FruitId; pos: number; n: number }
export function dealsOf(prev: GameState, next: GameState): Deal[] {
  const out: Deal[] = [];
  for (const f of FRUITS) for (let pos = 0; pos < next.market[f].length; pos++) {
    const n = (prev.market[f][pos] ?? 0) - next.market[f][pos];
    if (n) out.push({ f, pos, n });
  }
  return out;
}

/** At most this many copies travel for the pieces of one box; the last one carries the rest. */
const MAX_PER_BOX = 5;

/** Whose pieces move between two states of a buying turn: the stall whose turn it was (buying is done in the open). */
const buyerOf = (prev: GameState, next: GameState): number => (prev.phase === 'buy' && next.day === prev.day ? prev.order[prev.turn] ?? -1 : -1);

/**
 * A buying step is about to be shown (a purchase, a rival's whole turn, pieces taken back): the table is held back at
 * what it was (tableShown.ts, cashShown.ts), so that a box's number changes as a piece lifts out of it, and the shelf,
 * the stall's "bought today" marks and its cash as the piece lands. Called before the new state is drawn. `viewer`:
 * the stall this screen draws a shelf for (a rival's shelf is never drawn).
 */
export function holdDeals(prev: GameState, next: GameState, viewer: number) {
  const p = buyerOf(prev, next);
  const deals = p >= 0 ? dealsOf(prev, next) : [];
  if (!deals.length) return;
  for (const d of deals) {
    shiftMarket(d.f, d.pos, d.n);
    shiftBought(p, d.f, -d.n);
    if (p === viewer) shiftShelf(p, d.f, d.pos, -d.n);
  }
  holdCash(prev.players.map((pl) => pl.cash));
}

/** A sum shared out over parts by their weights, in whole dollars that add up to the sum. */
export function shareOut(sum: number, weights: number[]): number[] {
  const all = weights.reduce((a, w) => a + w, 0);
  let left = sum;
  let rest = all;
  return weights.map((w) => {
    const part = rest > 0 ? Math.round(left * w / rest) : 0;
    left -= part;
    rest -= w;
    return part;
  });
}

/**
 * What changed between two states, as travel (PLAN-085; flow study D3). Buying: each piece lifts out of its box and
 * travels in a low arc to that fruit's place on the buyer's stall (your shelf, or a rival's box); the box's number
 * drops as it lifts, and the shelf's, the "bought today" marks and the cash change as it lands. A rival's whole turn
 * arrives as one step and is one beat: its pieces leave a little apart. Pieces taken back travel the other way.
 */
export async function moves(prev: GameState, next: GameState, viewer = -1) {
  const jobs: Promise<void>[] = [];
  const counting: Promise<void>[] = [];
  const p = buyerOf(prev, next);
  const deals = p >= 0 ? dealsOf(prev, next) : [];
  const pieces = deals.flatMap((d) => {
    const k = Math.min(Math.abs(d.n), MAX_PER_BOX);
    return Array.from({ length: k }, (_, i) => ({ d, carries: i === k - 1 ? Math.abs(d.n) - (k - 1) : 1 }));
  });
  if (pieces.length) {
    // What the stall paid (or got back), shared over the pieces by what each box costs.
    const paid = prev.players[p].cash - next.players[p].cash;
    const shares = shareOut(Math.abs(paid), pieces.map((x) => x.carries * marketCost(prev, x.d.f, x.d.pos)));
    const gap = p === viewer ? A.BEAT.piece.gap : A.BEAT.rival.gap;
    pieces.forEach((x, i) => {
      const { f, pos } = x.d;
      const node = <Fruit id={f} size={26} stage={stageAt(f, pos)} />;
      const box = [`m-${f}-${pos}`, `mk-${f}`];
      const place = [`p${p}-${f}`, `p${p}`];
      const o = { delay: i * gap, duration: A.FEEL.travel, path: 'low' as const };
      if (x.d.n > 0) {
        jobs.push(A.fly(box, place, node, {
          ...o,
          onLift: () => shiftMarket(f, pos, -x.carries),
          onLand: () => {
            shiftBought(p, f, x.carries);
            if (p === viewer) shiftShelf(p, f, pos, x.carries);
            if (paid > 0 && shares[i]) { counting.push(takeCash(p, shares[i])); if (p === viewer) A.floatText(`p${p}-cash`, `−$${shares[i]}`); }
          },
        }));
      } else {
        jobs.push(A.fly(place, box, node, {
          ...o,
          onLift: () => { shiftBought(p, f, -x.carries); if (p === viewer) shiftShelf(p, f, pos, -x.carries); },
          onLand: () => { shiftMarket(f, pos, x.carries); if (paid < 0 && shares[i]) counting.push(payCash(p, shares[i])); },
        }));
      }
    });
    fx.buy();
  }
  next.players.forEach((pl, i) => {
    const before = prev.players[i];
    if (pl.favours.length < before.favours.length) {
      const played = before.favours.find((id, k) => pl.favours[k] !== id) ?? before.favours[before.favours.length - 1];
      const t = A.tag(`p${i}`, FAVOURS[played].title, 'favour');
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
  await Promise.all(jobs);
  // The cash is still counting down as the last piece lands: the beat ends when it has.
  await Promise.all(counting);
}

// ---------- the customers arrive ----------

/** The walk-ins that arrive face down on this screen as the last stall finishes buying (a card this player has
 *  already seen with Gossip or Scout is face up for them, and is not turned). */
export function arriving(prev: GameState, next: GameState, viewer: number): number[] {
  if (prev.phase !== 'buy' || next.phase === 'buy' || next.day !== prev.day) return [];
  const here = new Set(next.firstMarket.map((c) => c.id));
  return prev.queue.filter((c) => here.has(c.id) && !c.seenBy?.includes(viewer)).map((c) => c.id);
}

/** The customers are about to arrive: these walk-ins stay face down until their card is turned. Called before the
 *  new state is drawn. */
export function holdArrival(ids: number[]) {
  holdCards(ids);
  // Where each card lies in the row now (PLAN-090): a card that gets a new place when the standing order's card is
  // dealt to the front slides there, measured here before the row changes.
  rowWas = null;
  if (!ids.length) return;
  rowWas = new Map();
  for (const el of rowCards()) { const box = A.boxOf(el); if (box && el.dataset.c) rowWas.set(el.dataset.c, box); }
}

/** Where each customer's card lay in the row before the customers arrived, by the customer's id (data-c, table.tsx). */
let rowWas: Map<string, A.Box> | null = null;
const rowCards = (): HTMLElement[] => (typeof document === 'undefined' ? [] : [...document.querySelectorAll<HTMLElement>('.street > .cust[data-c]')]);

/**
 * The customers arrive (PLAN-085; flow study D3): the walk-in cards turn face up one after another, a little apart,
 * each in a card's turn (its back turns away, then its face shows; the stylesheet draws both halves at the same
 * speed). The standing order's card is dealt to the front of the row meanwhile. About 0.6 s; a tap hurries it; with
 * reduced motion the cards are simply face up.
 */
export async function arrive(ids: number[]) {
  const was = rowWas;
  rowWas = null;
  if (!ids.length) return;
  // A card whose place in the row has changed slides to it from where it lay (the shared slide: position only).
  if (was) {
    for (const el of rowCards()) {
      const from = el.dataset.c ? was.get(el.dataset.c) : undefined;
      const at = A.boxOf(el);
      if (from && at && Math.abs(from.left - at.left) >= 1) A.flipFrom(el, { ...at, left: from.left }, { duration: A.FEEL.travel });
    }
  }
  fx.card();
  const half = A.FEEL.turn / 2;
  await Promise.all(ids.map(async (id, i) => {
    await A.wait(i * A.BEAT.arrive.gap);
    turnCard(id, 'out');
    await A.wait(half);
    turnCard(id, 'up');
    await A.wait(half);
  }));
}

/** Pays a stall on the table (cashShown.ts: its total counts up), and keeps the count so the rush can wait for it to end. */
type Pay = (player: number, amount: number) => void;

/** A thing on the round table (panels/RushTable.tsx), or null when it is not on the screen. */
const onTable = (sel: string): Element | null => document.querySelector(`.rush-table ${sel}`);
/** A stall's crate on the round table, by its name on the table. */
const crateOf = (player: number) => `rt-crate-${player}`;

/**
 * One fruit a customer came for, as travel (DEC-109, the round table): the pieces go from each selling stall's crate
 * to the customer in the middle, the cheapest stall first, and the coins come back from the customer to that stall:
 * to your cash in the top bar, or to a rival's crate. A piece leaves its crate as it lifts off and a dot on the
 * customer fills as it lands; the stall's cash counts up, its shelf drops and its crate says what it was paid as its
 * first coin lands. When everything has landed the fruit's offers are marked (rushShown.ts).
 */
async function sellBlock(card: RushCard, b: RushBlock, viewer: number, pay: Pay) {
  const r = A.BEAT.rush;
  const jobs: Promise<void>[] = [];
  const want = `.rt-cust .rt-w.${laneClass(b.fruit)}`;
  const to = onTable(want) ?? 'rs-card';
  let sent = 0;
  for (const row of b.rows) {
    if (!row.sold) continue;
    const pieces = Math.min(row.sold, MAX_PIECES);
    let last = 0;
    for (let k = 0; k < pieces; k++) {
      last = sent * r.pieceGap;
      // A big sale is drawn as four pieces: the last one carries the pieces not drawn as well.
      const carries = k === pieces - 1 ? 1 + row.sold - pieces : 1;
      const pos = row.used?.[k];
      const from = [...(pos === undefined ? [] : [`rt-pc-${row.player}-${pos}`]), `rt-pcs-${row.player}`, crateOf(row.player)];
      jobs.push(A.fly(from, onTable(`${want} .rt-dots i:nth-child(${sent + 1})`) ?? to, <Fruit id={b.fruit} size={24} stage={row.pieces?.[k] ?? row.freshest ?? undefined} />, {
        delay: last, duration: A.FEEL.travel, path: 'low', swell: false,
        onLift: () => liftPiece(card.customerId, b.fruit, row.player, carries),
        onLand: () => landPiece(card.customerId, b.fruit, carries),
      }));
      sent++;
    }
    // The coins leave the customer as the stall's last piece lands.
    const cash = row.player === viewer ? `p${viewer}-cash` : crateOf(row.player);
    for (let k = 0; k < Math.min(row.sold, MAX_COINS); k++) {
      jobs.push(A.fly(to, cash, <Coin size={k ? 20 : 24} />, {
        delay: last + A.FEEL.travel + k * r.coinGap, duration: A.FEEL.coin, path: 'low',
        // This customer's payment lands now, so the stall's total climbs here and not before, and the pieces leave its shelf.
        onLand: k ? undefined : () => { fx.coin(); pay(row.player, row.paid); sellStock(row.player, b.fruit, row.sold); payShown(card.customerId, b.fruit, row.player); },
      }));
    }
  }
  await Promise.all(jobs);
  serveLine(card.customerId, b.fruit);
}

/**
 * What comes with the customer and not with a fruit, shown while the result is read: a tip or a standing order's stake
 * as a coin from the customer to the stall, and a favour card won for serving the whole order alone, which slides from
 * the customer's picture to the crate of the stall that won it (face up to this stall, face down to every other).
 */
async function gifts(card: RushCard, viewer: number, pay: Pay) {
  const from = onTable('.rt-cust .rt-pic') ?? 'rs-card';
  const jobs = card.extras.map((x) => A.fly(from, x.player === viewer ? `p${viewer}-cash` : crateOf(x.player), <Coin size={24} />, {
    duration: A.FEEL.coin, path: 'low', onLand: () => { fx.coin(); pay(x.player, x.amount); },
  }));
  const f = card.favour;
  if (f) {
    fx.card();
    // The card lands on the stall's crate, where it then lies (panels/RushTable.tsx).
    jobs.push(A.fly(from, [`rt-fav-${f.player}`, crateOf(f.player)], <FavourMark id={f.id} />, { duration: A.BEAT.rush.favour, path: 'low', swell: false, onLand: () => showFavour(card.customerId, f.player) }));
  }
  await Promise.all(jobs);
}

/** One fruit whose sale is not played (Skip, reduced motion): every stall that sold is simply paid and the sale is shown. */
function settleBlock(card: RushCard, b: RushBlock, pay: Pay) {
  for (const row of b.rows) {
    if (!row.sold) continue;
    pay(row.player, row.paid);
    sellStock(row.player, b.fruit, row.sold);
    payShown(card.customerId, b.fruit, row.player);
  }
  serveLine(card.customerId, b.fruit);
}

/** A customer whose sales are not played (Skip, reduced motion): every fruit not shown yet is settled, and what comes
 *  with the customer is paid. `favour`: the favour card won is shown as well (false: the caller shows it). */
function settle(card: RushCard, pay: Pay, favour = true) {
  for (const b of card.blocks) if (!lineShown(card.customerId, b.fruit)) settleBlock(card, b, pay);
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
  // Reduced motion: every row is open in one and the same frame (stepping through the rows without a pause still
  // drew them over a few frames), and the pause to read is kept.
  if (A.isReduced()) {
    setBell?.(n);
    fx.card();
    await A.hold(A.BEAT.bell.read);
    return;
  }
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
  // The round table (DEC-109): each customer in the order they are served comes from the row to the middle, every
  // stall's crate turns its price tag to the fruit they want, fruit by fruit, the sales travel, the result is read for
  // about a second and the customer goes back. A tap moves on to the next customer at once; Skip settles the rest
  // without showing them.
  const cards = rushCards(g, viewer);
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
    const base = { card, n: i + 1, of: cards.length, served: [...served] };
    const last = Math.max(0, card.blocks.length - 1);
    // With reduced motion nothing travels: each fruit's tags are shown with its result and held to be read, then the
    // customer with their result.
    const still = A.isReduced();
    if (still) {
      for (let k = 0; k < last; k++) {
        settleBlock(card, card.blocks[k], pay);
        setShow({ ...base, stage: 'rows', at: k });
        await A.hold(A.BEAT.rush.read);
      }
      settle(card, pay);
    } else {
      setShow({ ...base, stage: 'in', at: 0 });
      fx.card();
      await A.wait(A.BEAT.rush.cardIn);
      for (let k = 0; k <= last; k++) {
        setShow({ ...base, stage: 'rows', at: k });
        fx.tap();
        await A.wait(k ? A.BEAT.rush.fruit : A.BEAT.rush.rows);
        if (card.blocks[k]) await sellBlock(card, card.blocks[k], viewer, pay);
      }
    }
    setShow({ ...base, stage: 'result', at: last });
    await A.frame();
    await Promise.all([still ? null : gifts(card, viewer, pay), A.hold(A.BEAT.rush.read)]);
    served.push(card.customerId);
    setShow({ ...base, stage: 'out', at: last, served: [...served] });
    // The customer's way back to the row, and one frame more so that its last frame is drawn before they are taken away.
    await A.wait(A.BEAT.rush.cardOut);
    await A.frame();
  }
  setShow(null);
  releaseStock();
  // Favour cards won by customers whose cards were skipped: a label over the stall, as before.
  for (const card of late) {
    const t = A.tag(`p${card.favour!.player}`, '+1 favour card', 'favour');
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
 * The night's slide, set from here so the lanes, your shelf and their slide run on one clock (PLAN-081): null while
 * dusk falls, then the slide's length in ms while every piece moves one box older, then 'done' once the pieces rest
 * in their new boxes.
 */
export type NightSlide = number | 'done' | null;
/** The night's steps in ms at normal speed (PLAN-085, about 2.5 s in all): dusk falls over the table, every piece
 *  slides one box along its lane, a beat for the last piece to settle, a moment to read the lanes, then dawn. Named
 *  in motion.ts with the other lengths. */
export const NIGHT = A.BEAT.night;

export async function nightfall(g: GameState, setNight: (on: boolean) => void, setSlide: (s: NightSlide) => void = () => {}) {
  setSlide(null);
  setNight(true);
  fx.night();
  // Dusk falls: the customer row and the stalls stay where they are, dimmed, and the lanes turn to ink (table.css).
  // Then every piece slides one box along its lane, in the market (panels/NightShift) and on your shelf (table.tsx
  // MyStall): a piece leaving the last box tips off and fades as the slide ends. The slide is given its length from
  // here and this script waits that long (and a beat more), whatever the speed, so the slide always ends before dawn.
  // A tap ends the pause, and the pieces are then shown in their new boxes at once. With reduced motion nothing
  // slides (the stylesheet turns the move off) and the pause is kept, to read the lanes.
  await A.wait(NIGHT.dusk);
  setSlide(A.held(NIGHT.slide));
  await A.hold(NIGHT.slide + NIGHT.settle);
  setSlide('done');
  // On your own shelf (a rival's is never drawn) the pieces that leave are shown while the lanes are read: a Juice
  // Bar's pieces become coins that travel to the cash (one coin for each piece), and the rest tip off the shelf.
  // The engine's own forecast for each shelf, so the picture matches the night (Heatwave, Monsoon, Juice Bar).
  const jobs: Promise<void>[] = [];
  let d = 0;
  const juiced = g.players.map((_, p) => nightOutlook(g, p).juice);
  const shelves = g.players.map((_, p) => ({ leaving: leavingTonight(g, p), juice: juiced[p] }));
  for (const f of FRUITS) {
    shelves.forEach((sh, p) => {
      // The juice comes from the first pieces leaving, fruit by fruit (the rules only count how many).
      const j = Math.min(sh.juice, sh.leaving[f]);
      sh.juice -= j;
      for (let k = 0; k < j; k++) { jobs.push(A.fly([`p${p}-${f}`, `p${p}`], `p${p}-cash`, <Coin size={22} />, { delay: d, duration: NIGHT.juiceCoin, path: 'flat' })); d += NIGHT.gap; }
      // The rest spoil: their chips tip off the shelf as the slide ends (table.tsx MyStall; PLAN-090: the old wobbling
      // drop is gone, the shelf follows the night as the lanes do).
    });
  }
  await Promise.all([A.hold(NIGHT.read), ...jobs]);
  juiced.forEach((n, p) => { if (n) A.floatText(`p${p}-cash`, `+$${n * JUICE_VALUE} juice`); });
  if (juiced.some((n) => n > 0)) fx.coin();
  await A.wait(NIGHT.end);
}
