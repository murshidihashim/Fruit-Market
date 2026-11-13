// Computer shopkeepers. They only use public information: the market, the customers, the backs of face-down
// walk-ins, how many pieces each stall put out, and what they saw each stall buy. Rules 18: how much of that buying a
// computer recalls depends on its level (see `recall`): Hard everything it saw, Normal only today's purchases (which
// are on show until the bell), Easy none of it. A rival's crate is never read before the bell.
// A walk-in's front is used only when this shop has seen the card (Market Gossip or Scout).
// Each call to aiStep does one action, so the UI can animate them one at a time.

import { CUSTOMER_CARDS, FARMER_CARDS, FAVOURS, FRUIT, FRUITS, JAM_PRICE, JUICE_CAP, JUICE_TIP, JUICE_VALUE, ORDER_BOOK_BONUS, ORDER_LEAD, ROW_CAP, UPGRADES, acceptsStage, freshPos, orderQty, prefOf, stageAt, type FruitId, type UpgradeId } from './data';
import {
  activePlayer, beginBuying, bestCap, buy, maxPrice, printedSupply, buyCost, buyUpgrade, canBuy, canPlayFavour, canUpgrade,
  capAt, capFor, count, effectiveMax, rowCount, rowStock, endBuyTurn, endEvening, finishReveal, forSale, isLastCall, minPrice,
  openStall, playFavour, priceMod, rowCustomers, shelfSize, submitPrices, validatePrices, validateStall, buyLimit,
  bidOrder, isMarketDay, shelfPos, crateCounts, orderDueToday, outCount, publicView, boughtStock, emptyStock, orderStake,
  decideTie, rushIncome, eveningOpen,
  type Crate, type Customer, type GameState, type Level, type Post, type Stall, type Standing, type Stock,
} from './game';
import { Rng } from './rng';

/** Average order for a fruit when a customer card wants it (used for face-down walk-ins). */
const WANT_AVG: Record<FruitId, { qty: number; max: number }> = (() => {
  const out = {} as Record<FruitId, { qty: number; max: number }>;
  for (const f of FRUITS) {
    const ws = CUSTOMER_CARDS.flatMap((c) => c.wants).filter((w) => w.fruit === f);
    out[f] = {
      qty: ws.reduce((a, w) => a + w.qty, 0) / Math.max(1, ws.length),
      max: ws.reduce((a, w) => a + w.max, 0) / Math.max(1, ws.length),
    };
  }
  return out;
})();

/** Share of the 36 customer cards that accept fruit at each freshness (used for face-down walk-ins, whose type is secret). */
const ACCEPT: Record<string, number> = (() => {
  const o: Record<string, number> = { fresh: 1, okay: 1, notso: 1, unripe: 0 };
  for (const st of ['okay', 'notso'] as const) o[st] = CUSTOMER_CARDS.filter((c) => acceptsStage(prefOf(c.name), st)).length / CUSTOMER_CARDS.length;
  return o;
})();

/** Pieces of each fruit an average customer card wants (for guessing demand on a day nobody can see yet). */
const CARD_AVG: Record<FruitId, number> = Object.fromEntries(FRUITS.map((f) => [f, CUSTOMER_CARDS.flatMap((c) => c.wants).filter((w) => w.fruit === f).reduce((a, w) => a + w.qty, 0) / CUSTOMER_CARDS.length])) as Record<FruitId, number>;
/** Pieces of a fruit an average lorry brings to a table of this size. */
const lorryAvg = (f: FruitId, stalls: number): number => FARMER_CARDS.reduce((a, c) => a + printedSupply(c, f, stalls), 0) / FARMER_CARDS.length;

// ---------- standing orders (rules 14) ----------

/** Will a piece at this shelf position be Fresh or Okay after `nights` more nights? */
function usableAfter(f: FruitId, pos: number, nights: number): boolean {
  const to = pos - nights;
  return to >= 0 && to < FRUIT[f].ripe.length && stageAt(f, to) !== 'notso';
}

/** Pieces on this shop's shelf that the standing order would take on its due day. */
function orderStock(s: GameState, p: number, o: Standing): number {
  const nights = o.due - s.day;
  return s.players[p].stock[o.fruit].reduce((a, c, i) => a + (usableAfter(o.fruit, i, nights) ? c : 0), 0);
}

/** Where a lorry's delivery of this fruit lands at the market (green mangoes at the top of the track). */
const entryPos = (s: GameState, f: FruitId): number => (s.config.unripe && FARMER_CARDS[0].unripe === f ? s.market[f].length - 1 : freshPos(f));

/**
 * A computer shop's secret bid for the standing order (null: pass). It counts the pieces it could have ready on the
 * due day (its shelf, half of what is at the market, half of tomorrow's lorry and of an average lorry on the due day),
 * passes when that looks too thin, and otherwise bids a little over what customers usually pay. Rules 18: it must
 * have the stake in cash, and it weighs the stake (lost unless every piece is delivered) instead of a fine for each
 * missing piece. Exported for tests.
 */
export function planOrderBid(s: GameState, p: number): number | null {
  const o = s.standing;
  if (!o) return null;
  const pl = s.players[p];
  const stake = orderStake(s, p);
  if (pl.cash < stake) return null;
  const f = o.fruit, lv = level(s, p), n = s.players.length, nights = o.due - s.day;
  let avail = orderStock(s, p, o);
  s.market[f].forEach((c, i) => { if (c && usableAfter(f, shelfPos(pl, f, i), nights)) avail += c / 2; });
  const entry = entryPos(s, f);
  if (s.nextFarmer && usableAfter(f, shelfPos(pl, f, entry), nights - 1)) avail += printedSupply(s.nextFarmer, f, n) / 2;
  if (usableAfter(f, shelfPos(pl, f, entry), 0)) avail += lorryAvg(f, n) / 2;
  const conf = Math.min(1, avail / o.qty);
  if (conf < (lv === 'hard' ? 0.8 : lv === 'normal' ? 0.65 : 0.5)) return null;
  const cost = FRUIT[f].cost[stageAt(f, entry)];
  // The stake is cash the stall cannot buy with until the due day. It keeps enough to buy what the order still needs;
  // a fruit that must be bought today to be ready (green mangoes) has to be paid for in full today.
  const need = Math.max(0, o.qty - orderStock(s, p, o));
  const today = !usableAfter(f, shelfPos(pl, f, entry), nights - 1);
  if (pl.cash - stake < need * cost * (today ? 1 : 0.5)) return null;
  // An Order Book pays more for each piece, so its owner can afford to bid a dollar lower.
  const bonus = pl.upgrades.includes('orderbook') ? ORDER_BOOK_BONUS : 0;
  const bid = Math.min(o.ceiling, Math.max(cost + 2, Math.round(WANT_AVG[f].max + (lv === 'hard' ? 0 : lv === 'normal' ? 1 : 2) + rand(s, p, 55) * 2) - (bonus ? 1 : 0)));
  // `conf` stands for the chance of delivering every piece: then each piece earns the bid and the stake comes back.
  // Otherwise the stake is lost.
  const ev = conf * o.qty * (bid + bonus - cost) - (1 - conf) * stake;
  return ev > 0 ? bid : null;
}

/**
 * Rules 18: how much a computer stall recalls of what its rivals bought. Hard: everything it saw (their whole
 * shelves, as before). Normal: only today's purchases, which stay on show until the bell. Easy: none of it. The
 * value is what `publicView` takes as `memory`. A seat a computer plays for a person plays as Normal.
 */
export function recall(s: GameState, p: number): boolean | 'today' {
  const lv = level(s, p);
  return lv === 'hard' ? true : lv === 'normal' ? 'today' : false;
}

/**
 * The game as computer stall `p` plans on it while buying and stocking: its rivals' shelves hold only what it recalls
 * (see `recall`), and no crate is read (stalls open one after another, but a crate stays shut until the bell). A
 * planning copy: never hand it to an action.
 */
function planView(s: GameState, p: number): GameState {
  const m = recall(s, p);
  const players = m === true ? s.players : s.players.map((pl, i) => (i === p ? pl : { ...pl, stock: m === 'today' ? boughtStock(pl) : emptyStock(s.config.unripe) }));
  return { ...s, players, crates: s.players.map(() => null) };
}

/** Knobs for the Hard computer, kept in one place so balance tests can try other values. */
export const HARD = { threshold: 0.3, keep: 0.1, eventAware: 1, undercut: 1 };

function ripeCount(stock: Stock, f: FruitId): number {
  return count(stock, f, true);
}

function rand(s: GameState, p: number, salt: number): number {
  // Deterministic per game state so replays and tests are stable, without touching game RNG.
  const r = new Rng((s.rng ^ (p * 7919) ^ (s.day * 104729) ^ (salt * 31)) >>> 0);
  r.float();
  return r.float();
}

function level(s: GameState, p: number): Level {
  return s.players[p].level ?? 'normal';
}

/** What this shop can know about a face-down walk-in's order for a fruit. */
function walkInWant(c: Customer, f: FruitId, p: number): { qty: number; max: number } | null {
  const w = c.wants.find((x) => x.fruit === f);
  if (!w) return null;
  if (c.seenBy?.includes(p)) return { qty: w.qty, max: w.max };
  return WANT_AVG[f];
}

/** Demand we expect to compete for today, and what customers pay on average. */
function outlook(s: GameState, p: number, f: FruitId, stage: 'fresh' | 'okay' | 'notso' | 'unripe' = 'fresh') {
  const known = [...rowCustomers(s), ...(s.phase === 'buy' && s.forecast ? [s.forecast] : [])];
  let qty = 0;
  let maxSum = 0;
  let maxN = 0;
  // Only customers who would buy fruit of this freshness count as demand for it.
  for (const c of known) for (const w of c.wants) if (w.fruit === f && w.qty > 0 && acceptsStage(c.pref, stage)) {
    qty += w.qty;
    maxSum += effectiveMax(s, w, c.generous) * w.qty;
    maxN += w.qty;
  }
  if (s.phase === 'buy') {
    for (const c of s.queue) {
      const w = walkInWant(c, f, p);
      if (!w) continue;
      // A face-down walk-in's type is secret: weight by the share of customers who accept this freshness
      // (unless this shop has seen the card).
      const k = c.seenBy?.includes(p) ? (acceptsStage(c.pref, stage) ? 1 : 0) : ACCEPT[stage];
      qty += w.qty * k;
      maxSum += effectiveMax(s, { fruit: f, qty: w.qty, max: w.max }, c.generous) * w.qty * k;
      maxN += w.qty * k;
    }
    const ex = s.event?.extra;
    for (const w of ex?.wants ?? []) if (w.fruit === f && acceptsStage(prefOf(ex!.name), stage)) {
      qty += w.qty;
      maxSum += effectiveMax(s, w) * w.qty;
      maxN += w.qty;
    }
  }
  return { qty, avgMax: maxN ? maxSum / maxN : WANT_AVG[f].max + priceMod(s, f) };
}

/** Will this fruit be scarce tomorrow? (The card shows few of it.) */
function scarceTomorrow(s: GameState, f: FruitId): boolean {
  if (s.day >= s.config.days) return false;
  // Tomorrow's event is never known in advance (rules 13). Scarce: the card brings no more than one piece per shop.
  return !!s.nextFarmer && printedSupply(s.nextFarmer, f, s.players.length) <= s.players.length;
}

/**
 * Rules 18: a computer that does not recall what its rivals bought on earlier days still expects them to hold
 * something. These are the ripe pieces of each fruit an average stall carries into a day, and the green mangoes it
 * holds one night from ripe, measured in computer games at 2 to 6 stalls (scripts18/carried.ts in
 * docs/studio/review-17/balance). They stand in for the older stock a Normal or Easy computer cannot see; a Hard
 * computer recalls the real shelves and uses neither.
 */
export const UNSEEN_RIPE: Record<FruitId, number> = { blueberry: 0.2, watermelon: 0.2, apple: 0.2, mango: 1.2 };
export const UNSEEN_GREEN = 0.5;

/** What one piece is worth to this shop; `cost` is what it would pay for it (0 for a free one). `s` is the shop's
 *  planning view (planView): its rivals' shelves hold only what it recalls. */
function fruitValue(s: GameState, p: number, f: FruitId, pos: number, extraMine: number, cost: number): number {
  const pl = s.players[p];
  const stage = stageAt(f, pos);
  const daysLeft = s.config.days - s.day; // days after today
  const { qty, avgMax } = outlook(s, p, f, stage);
  // Rivals whose older stock this shop does not recall: it counts an average stall's carry-over for each.
  const unseen = recall(s, p) === true ? 0 : s.players.length - 1;
  const others = s.players.reduce((a, o, i) => (i === p ? a : a + ripeCount(o.stock, f)), 0) + unseen * UNSEEN_RIPE[f];
  const unboughtShare = s.phase === 'buy' ? (s.order.length - 1 - s.turn) * 1.2 : 0;
  const supply = others + unboughtShare + ripeCount(pl.stock, f) + extraMine + 1;
  const ratio = supply / Math.max(0.5, qty);
  if (stage === 'unripe') {
    const ripenIn = pos - (FRUIT[f].ripe.length - 1);
    if (ripenIn > daysLeft) return -99;
    // Rules 14: every mango arrives green, so a green piece is a bet on the day it ripens. Demand that day is a guess
    // (an average row); supply is the green fruit every shop already holds that ripens the same day, plus this piece.
    const row = Math.min(s.players.length, ROW_CAP);
    const demand = Math.max(0.5, row * CARD_AVG[f] * (s.players.length > ROW_CAP ? 1.3 : 1));
    // A piece that ripens tomorrow (a Ripening Room's) meets the green fruit rivals bought yesterday, which a shop
    // without full recall can only guess at. Green fruit bought today is on show, so two nights out needs no guess.
    const same = s.players.reduce((a, o) => a + o.stock[f].reduce((x, c, i) => x + (i - (FRUIT[f].ripe.length - 1) === ripenIn ? c : 0), 0), 0)
      + (ripenIn === 1 ? unseen * UNSEEN_GREEN : 0);
    const chance = Math.min(1, demand / (same + extraMine + 1));
    return (WANT_AVG[f].max - 1.5) * (0.35 + 0.5 * chance) - ripenIn * 0.3;
  }
  const cap = capAt(f, pos, avgMax);
  const planner = level(s, p) !== 'easy';
  const juice = planner && pl.upgrades.includes('juicebar');
  // Juice Bar: older fruit earns a tip when sold.
  const tip = juice && stage !== 'fresh' ? JUICE_TIP : 0;
  const price = (ratio <= 1 ? cap - 0.5 : Math.max(1, cap - (ratio - 1) * 3.5)) + tip;
  const pSell = Math.min(1, 1 / ratio);
  const laterDays = Math.min(pos, daysLeft);
  let later = laterDays > 0 ? 0.35 * Math.max(0, price - 1) * (1 - pSell) : 0;
  // Juice Bar: fruit that doesn't sell still becomes juice (JUICE_VALUE each) when it spoils, if tonight's JUICE_CAP has room.
  if (juice && daysLeft > 0) {
    const spoilingSoon = FRUITS.reduce((a, x) => a + pl.stock[x][0], 0) + extraMine;
    if (spoilingSoon < JUICE_CAP) later = Math.max(later, JUICE_VALUE * (1 - pSell));
  }
  // Closing Day: ripe fruit that doesn't sell goes to the jam maker. Counted only for a piece that costs no more than
  // the jam maker pays (a free one, or one at the jam price), which can't lose money. The sale chance here is a hopeful guess:
  // counting the jam on dearer pieces made computers buy last-day fruit that mostly went for jam at a loss (PLAN-051
  // balance run). It also needs some expected buyer for this fruit at this freshness (`qty`: today's face-up customers
  // and, while buying, face-down walk-ins guessed from the fruit on their backs), so it never props up a piece that
  // nobody is expected to want.
  if (planner && daysLeft === 0 && isLastCall(s) && qty > 0 && cost <= JAM_PRICE) later = Math.max(later, JAM_PRICE * (1 - pSell));
  // Fruit that will be scarce tomorrow (few on the next lorry) is worth keeping.
  if (laterDays > 0 && planner && scarceTomorrow(s, f)) {
    later += 0.5 * Math.max(0, price - 1) * (1 - pSell * 0.5);
  }
  return price * pSell + later;
}

function pickPurchase(state: GameState, p: number): { f: FruitId; pos: number; score: number } | null {
  const s = planView(state, p);
  const lv = level(s, p);
  let best: { f: FruitId; pos: number; score: number } | null = null;
  for (const f of FRUITS) {
    for (let pos = 0; pos < s.market[f].length; pos++) {
      if (canBuy(s, p, f, pos)) continue;
      const cost = buyCost(s, p, f, pos);
      let score = fruitValue(s, p, f, shelfPos(s.players[p], f, pos), 0, cost) - cost;
      if (lv === 'easy') score += (rand(s, p, f.length * 13 + pos) - 0.5) * 6;
      const o = s.standing;
      if (o && o.holder === p && o.price !== null && o.fruit === f) {
        const nights = o.due - s.day;
        const at = shelfPos(s.players[p], f, pos);
        const need = o.qty - orderStock(s, p, o);
        // The holder buys what its order still needs (a piece that will be Fresh or Okay on the due day), freshest
        // first. Rules 18: the order pays its bid for the piece (and an Order Book's bonus), and the stake comes back
        // only when every piece is there.
        if (need > 0 && usableAfter(f, at, nights)) {
          const pay = o.price + (s.players[p].upgrades.includes('orderbook') ? ORDER_BOOK_BONUS : 0);
          score = Math.max(score, pay - cost, 0) + (o.staked ?? 0) / need + at * 0.2;
        }
      }
      if (!best || score > best.score) best = { f, pos, score };
    }
  }
  const threshold = lv === 'hard' ? HARD.threshold : lv === 'normal' ? 0.5 : 0.3;
  return best && best.score >= threshold ? best : null;
}

export function buyPhaseFavour(s: GameState, p: number): GameState | null {
  const pl = s.players[p];
  const view = planView(s, p);
  for (let i = 0; i < pl.favours.length; i++) {
    const id = pl.favours[i];
    if (canPlayFavour(s, p, i)) continue;
    if (id === 'freeFruit' && count(pl.stock) < shelfSize(pl)) {
      let best: { f: FruitId; pos: number; v: number } | null = null;
      for (const f of FRUITS) for (let pos = 0; pos < s.market[f].length; pos++) {
        if (!s.market[f][pos]) continue;
        const v = fruitValue(view, p, f, pos, 0, 0);
        if (!best || v > best.v) best = { f, pos, v };
      }
      if (best) return playFavour(s, p, i, { fruit: best.f, pos: best.pos });
    }
    if (id === 'fridge') {
      let stale = 0;
      for (const f of FRUITS) for (let pos = 0; pos < FRUIT[f].ripe.length; pos++) {
        if (stageAt(f, pos) !== 'fresh') stale += pl.stock[f][pos];
      }
      if (stale >= 3 || (s.day === s.config.days && stale >= 1)) return playFavour(s, p, i);
    }
  }
  return null;
}

/** Positions of ripe fruit, oldest first, limited to n units (what a shop hands over first). */
function units(stock: Stock, f: FruitId, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < FRUIT[f].ripe.length && out.length < n; i++) for (let k = 0; k < stock[f][i] && out.length < n; k++) out.push(i);
  return out;
}

/**
 * One stall in the planner's model of the rush: its price, the positions of the ripe fruit on its shelf (oldest first),
 * how many it put out (`left`), and whether it is known to win ties with Favoured Trade (`ft`).
 */
export interface Seller { player: number; price: number; pos: number[]; left: number; ft?: boolean }

/**
 * A stall for the planner's model (rules 12): the pieces in its crate, oldest first. Once crates are open they are
 * public; before that (planning what to put out) a crate of `n` takes the oldest `n` pieces, as a computer shop's does.
 */
export function seller(s: GameState, player: number, f: FruitId, price: number, n: number, ft = false): Seller {
  const pos = s.crates?.[player] ? units(rowStock(s, player), f, n) : units(s.players[player].stock, f, n);
  return { player, price, pos, left: pos.length, ft };
}

/** What a shop can sell from today: its crate once stalls are open, otherwise its whole shelf. */
const sellStock = (s: GameState, p: number): Stock => (s.crates?.[p] ? rowStock(s, p) : s.players[p].stock);

/**
 * Expected sales for one shop (`me`), by running the day's queue for one fruit the way the rush does: cheapest stall
 * first, leftover demand spilling to the next; each stall hands over its oldest fruit fresh enough for the customer,
 * from its whole shelf, up to the number in its crate. Ties follow the rules (rules 11): Favoured Trade, then the
 * fresher fruit handed over, then the Haggler, then today's buying order. Traits and the buying order are public; Favoured Trade
 * counts only where the planner knows it (`ft`), because rivals' favour cards are secret. With `plain` the Haggler's
 * tie-break is left out (rules 18: how a Normal computer plans, see bestPost). Exported for tests.
 */
export function simulateSales(s: GameState, f: FruitId, me: Seller, rivals: Seller[], plain = false): number {
  const lines = rowCustomers(s).flatMap((c) => c.wants.filter((w) => w.fruit === f && w.qty > 0).map((w) => ({ qty: w.qty, max: effectiveMax(s, w, c.generous), pref: c.pref, fixed: !!w.fixed })));
  const pools = [me, ...rivals].map((x) => ({ ...x, pos: [...x.pos] }));
  const haggler = (x: Seller) => (plain ? 0 : Number(s.players[x.player].trait === 'haggler'));
  const orderIdx = (x: Seller) => s.order.indexOf(x.player);
  let sold = 0;
  for (const l of lines) {
    // Each stall's offer: the pieces it would hand over (indexes into its shelf, oldest first) and the freshest of them.
    const offers: { x: Seller; used: number[]; fresh: number }[] = [];
    for (const x of pools) {
      const used: number[] = [];
      const pl = s.players[x.player];
      for (let k = 0; k < x.pos.length && used.length < Math.min(x.left, l.qty); k++) {
        const i = x.pos[k];
        if (capFor(pl, f, i, l.max, l.fixed) >= x.price && acceptsStage(l.pref, stageAt(f, i))) used.push(k);
      }
      if (used.length) offers.push({ x, used, fresh: x.pos[used[used.length - 1]] });
    }
    offers.sort((a, b) => a.x.price - b.x.price || Number(!!b.x.ft) - Number(!!a.x.ft) || b.fresh - a.fresh
      || haggler(b.x) - haggler(a.x) || orderIdx(a.x) - orderIdx(b.x));
    let need = l.qty;
    for (const o of offers) {
      if (need <= 0) break;
      const n = Math.min(need, o.used.length);
      for (let j = n - 1; j >= 0; j--) o.x.pos.splice(o.used[j], 1);
      o.x.left -= n;
      need -= n;
      if (o.x === pools[0]) sold += n;
    }
  }
  return sold;
}

/**
 * A rival's likely posted price (for shop `p`): the best it could ask the richest customer for this fruit, less a few
 * dollars. A Haggler wins ties against a shop without the Haggler, so it has less reason to undercut: in Normal
 * computer games (PLAN-051) a Haggler posts a contested fruit about $0.25 nearer its best price than other shops do on
 * average ($1.60 below it against $1.85), so one of its four guesses here cuts nothing. With `plain` a Haggler is
 * guessed like any other shop (rules 18, see bestPost). Exported for tests.
 */
export function rivalPrice(s: GameState, p: number, r: number, f: FruitId, k: number, lv: Level, plain = false): number {
  const top = Math.max(0, ...rowCustomers(s).flatMap((c) => c.wants.filter((w) => w.fruit === f && w.qty > 0).map((w) => bestCap(sellStock(s, r), f, effectiveMax(s, w, c.generous), s.players[r], c.pref, w.fixed))));
  const rl = s.players[r].kind === 'human' ? 'normal' : level(s, r);
  const haggler = !plain && s.players[r].trait === 'haggler' && s.players[p].trait !== 'haggler';
  const cut = lv === 'normal' ? (haggler ? [0, 1, 2, 2] : [1, 1, 2, 2])[k] : rl === 'easy' ? [0, 1, 1, 1][k] : rl === 'normal' ? [1, 2, 2, 3][k] : [2, 2, 3, 3][k];
  return Math.max(minPrice(s, f), top - cut);
}

/** Best posted price for one fruit and how many it expects to sell, given how many each shop can sell. */
function bestPost(s: GameState, p: number, f: FruitId, myUnits: number, rivalUnits: (i: number) => number, depth = 0): { price: number; sold: number } {
  const pl = s.players[p];
  const lv: Level = depth > 0 ? 'normal' : level(s, p);
  // Rules 18: a Normal computer plans its prices without counting on the Haggler's tie-break, its own or a rival's.
  // Counting on it made a Normal Haggler hold its price and be undercut (REP-101: Rosa won 23% of 3-stall games where
  // 33% is fair). A Hard computer still counts on it, also when it predicts its rivals' answers one step deeper, and
  // so does the price suggested to a person (a rival Haggler's tie-break is public, and tying her loses the sale).
  const plain = depth === 0 && lv === 'normal' && pl.kind === 'ai';
  const mine = units(sellStock(s, p), f, myUnits);
  const lines = rowCustomers(s).flatMap((c) => c.wants.filter((w) => w.fruit === f && w.qty > 0).map((w) => ({ m: effectiveMax(s, w, c.generous), pref: c.pref, fixed: !!w.fixed })));
  if (!mine.length || !lines.length) return { price: minPrice(s, f), sold: 0 };
  // Price Controls: never ask above the day's maximum.
  const topCap = Math.min(maxPrice(s, f), Math.max(...lines.map((l) => bestCap(sellStock(s, p), f, l.m, pl, l.pref, l.fixed))));
  const lastDay = s.day >= s.config.days;
  const rotsTonight = pl.stock[f][0] > 0;
  const floor = Math.max(minPrice(s, f), rotsTonight || lastDay ? 1 : lv === 'easy' ? 3 : 2);
  const rivals = s.players.map((_, i) => i).filter((i) => i !== p && rivalUnits(i) > 0);
  if (lv === 'easy') {
    // An Easy shop guesses: somewhere from its best price down to $3 less, without reading rivals.
    const price = Math.max(floor, topCap - Math.floor(rand(s, p, FRUITS.indexOf(f) * 17) * 4));
    return { price, sold: mine.length };
  }
  // Value of a fruit that doesn't sell today: kept for tomorrow (none if it rots tonight), or on the final day what the
  // jam maker pays for it on Closing Day (every ripe piece, including the ones that would have rotted tonight).
  const jam = lastDay && isLastCall(s) ? JAM_PRICE : 0;
  let keep = lastDay ? jam : (lv === 'hard' ? HARD.keep : 0.3) * topCap;
  if (!lastDay && keep > 0 && scarceTomorrow(s, f)) keep = Math.max(keep, 0.45 * topCap);
  const lastUnits = mine.filter((i) => i === 0).length; // these rot tonight
  // Rules 18: Favoured Trade is played after the flip, so while pricing nobody has played it. A stall that holds the
  // card does not count on it here: it decides once it sees a real tie (wantsFavouredTrade). A rival's cards are secret.
  const ft = depth === 0 && pl.favouredTrade;
  // A Hard shop predicts each rival's own best response (one step deeper) and prices against that, give or take $1.
  const predicted = lv === 'hard' && depth === 0
    ? Object.fromEntries(rivals.map((r) => [r, bestPost(s, r, f, rivalUnits(r), (i) => (i === r ? 0 : i === p ? myUnits : rivalUnits(i)), 1).price]))
    : null;
  const priceOf = (r: number, k: number) => (predicted ? Math.max(minPrice(s, f), predicted[r] + [-1, 0, 0, 1][k]) : rivalPrice(s, p, r, f, k, lv, plain));
  const myStall = seller(s, p, f, floor, mine.length, ft);
  const rivalStalls = rivals.map((r) => seller(s, r, f, floor, rivalUnits(r)));
  let best = { price: topCap, ev: -Infinity, sold: 0 };
  for (let q = floor; q <= topCap; q++) {
    let ev = 0;
    let soldSum = 0;
    for (const k of [0, 1, 2, 3]) {
      const rs = rivalStalls.map((x) => ({ ...x, price: priceOf(x.player, k) }));
      const sold = simulateSales(s, f, { ...myStall, price: q }, rs, plain);
      const unsold = Math.max(0, mine.length - sold);
      const keptValue = lastDay ? unsold * jam : Math.max(0, unsold - lastUnits) * keep;
      ev += q * sold + keptValue;
      soldSum += sold;
    }
    if (ev > best.ev + 1e-9) best = { price: q, ev, sold: soldSum / 4 };
  }
  let price = best.price;
  if (lv === 'normal') price -= Math.round(rand(s, p, FRUITS.indexOf(f) * 7) * 0.8);
  return { price: Math.max(floor, price), sold: best.sold };
}

/** What this computer puts out for sale (before rivals' stalls are known: it assumes they may sell all the ripe stock
 *  it recalls them holding; rules 18: it never reads the crate of a stall that opened before it). */
export function planStall(state: GameState, p: number): Stall {
  const s = planView(state, p);
  const pl = s.players[p];
  const stall: Stall = {};
  const lastDay = s.day >= s.config.days;
  for (const f of FRUITS) {
    const have = ripeCount(pl.stock, f);
    if (!have) continue;
    let out = have;
    // Holding back makes sense only when the fruit will be scarce tomorrow and keeps another night.
    if (!lastDay && level(s, p) !== 'easy' && scarceTomorrow(s, f)) {
      const { sold } = bestPost(s, p, f, have, (i) => ripeCount(s.players[i].stock, f));
      out = Math.max(pl.stock[f][0], Math.min(have, Math.ceil(sold + 0.5)));
    }
    // Rules 14: the holder of a standing order keeps back the pieces the order will take on its due day (crates take
    // the oldest pieces, so the freshest stay on the shelf).
    const o = s.standing;
    if (o && o.holder === p && o.fruit === f && o.due > s.day) out = Math.max(0, Math.min(out, have - Math.min(o.qty, orderStock(s, p, o))));
    // On the due day everything goes out: the order takes its pieces first.
    if (o && o.holder === p && o.fruit === f && o.due === s.day) out = have;
    if (out > 0) stall[f] = out;
  }
  return validateStall(s, p, stall) ? {} : stall;
}

/**
 * Rules 15, secret stalls: stall `p`'s working picture of the day once every stall is open. Each rival's crate is
 * rebuilt as a guess from what is public: how many pieces it put out, today's orders, and the pieces the stall is
 * known to hold. `memory` says how much is known (rules 18): true, the whole shelf it was seen to buy (a Hard
 * computer); 'today', only what it bought today, which is on show until the bell (a Normal computer); false, nothing
 * (an Easy computer, and the hints a person sees). The pieces are dealt one at a time, stalls in today's buying
 * order, each to the fruit with the most orders still unmet among the fruits the stall is known to hold; once those
 * run out the rest are older stock nobody recalls, guessed as Fresh pieces of the most wanted fruit (with full memory
 * there is no such stock). A stall collecting a standing order today is taken to deliver it first. The real crates
 * are never read, so a stall that puts out an unexpected fruit, or keeps one back, does fool the planner.
 */
export function believe(state: GameState, p: number, memory: boolean | 'today' = state.players[p].kind === 'ai' ? recall(state, p) : false): GameState {
  if (state.phase !== 'bid') return state;
  const s = publicView(state, p, memory);
  const pool = Object.fromEntries(FRUITS.map((f) => [f, rowCustomers(s).reduce((a, c) => a + c.wants.reduce((x, w) => x + (w.fruit === f ? Math.max(0, w.qty) : 0), 0), 0)])) as Record<FruitId, number>;
  const left = s.players.map((_, i) => (i === p ? 0 : outCount(s, i) ?? 0));
  const guess = s.players.map((pl) => Object.fromEntries(FRUITS.map((f) => [f, new Array<number>(pl.stock[f].length).fill(0)])) as Record<FruitId, number[]>);
  // The box of a piece the stall is known to hold: the oldest ripe box that still has one (as a computer stall's
  // crate takes them). -1: it is not known to hold another piece of that fruit.
  const known = (i: number, f: FruitId): number => (memory ? s.players[i].stock[f].findIndex((n, pos) => pos < FRUIT[f].ripe.length && n - guess[i][f][pos] > 0) : -1);
  // Places one piece of a fruit in a stall's guessed crate. False when the stall cannot be holding it (full memory) or has no piece left to place.
  const put = (i: number, f: FruitId): boolean => {
    const pos = known(i, f);
    if (left[i] <= 0 || (pos < 0 && memory === true)) return false;
    guess[i][f][pos < 0 ? FRUIT[f].ripe.length - 1 : pos]++;
    left[i]--;
    return true;
  };
  const due = orderDueToday(s);
  if (due && due.holder !== null && due.holder !== p) for (let k = 0; k < due.qty; k++) if (!put(due.holder, due.fruit)) break;
  for (let round = 0; round < 64 && left.some((n) => n > 0); round++) {
    for (const i of s.order) {
      if (left[i] <= 0) continue;
      const held = FRUITS.filter((x) => known(i, x) >= 0);
      const f = (held.length || memory === true ? held : [...FRUITS]).sort((a, b) => pool[b] - pool[a])[0];
      if (f === undefined) { left[i] = 0; continue; }
      put(i, f);
      pool[f]--;
    }
  }
  s.players.forEach((_, i) => {
    if (i === p || s.stalls[i] === null) return;
    const crate = Object.fromEntries(Object.entries(guess[i]).filter(([, t]) => t.some((n) => n > 0))) as Crate;
    s.stalls[i] = crateCounts(crate);
    (s.crates ??= s.players.map(() => null))[i] = crate;
  });
  return s;
}

/** One secret price per fruit put out, knowing only how many pieces every other stall put out (rules 15) and what
 *  this stall recalls of the rivals' buying (`memory`, see believe). */
export function planPrices(state: GameState, p: number, memory?: boolean | 'today'): { posts: Post[] } {
  const s = believe(state, p, memory);
  const posts: Post[] = [];
  for (const f of FRUITS) {
    const n = forSale(s, p, f);
    if (n <= 0) continue;
    // A standing order collected today takes its pieces first: price only what it leaves for the row.
    const { price } = bestPost(s, p, f, rowCount(s, p, f) || n, (i) => rowCount(s, i, f));
    posts.push({ fruit: f, price: Math.min(30, maxPrice(s, f), price) });
  }
  if (validatePrices(s, p, posts)) return { posts: posts.map((b) => ({ ...b, price: Math.max(minPrice(s, b.fruit), Math.min(30, maxPrice(s, b.fruit), b.price)) })) };
  return { posts };
}

/** A computer stall plays Favoured Trade when it adds at least this much to its takings in today's rush. */
export const FAVOURED_TRADE_MARGIN = 2;

/**
 * Rules 18, the tie step: would this computer stall play Favoured Trade now? Prices and crates are public by now, so
 * it runs the rush both ways (with the cards played so far) and plays the card when that adds FAVOURED_TRADE_MARGIN
 * or more to today's takings. On the last day the card is worth nothing afterwards, so any gain will do. An Easy
 * computer simply plays it when it is asked. Exported for tests.
 */
export function wantsFavouredTrade(s: GameState, p: number): boolean {
  if (s.phase !== 'tie' || !s.players[p].favours.includes('favouredTrade')) return false;
  if (level(s, p) === 'easy') return true;
  const keep = rushIncome(s)[p];
  const play = rushIncome({ ...s, players: s.players.map((pl, i) => (i === p ? { ...pl, favouredTrade: true } : pl)) })[p];
  return play - keep >= (s.day >= s.config.days ? 1 : FAVOURED_TRADE_MARGIN);
}

/**
 * Rules 18: what an upgrade adds to a computer stall's cash for each day left when no rival has built the same one,
 * as measured in computer games with each upgrade forced and compared with never building (3 stalls, 10 days;
 * docs/studio/review-17/balance/RULES-18-RESULTS.md). The Order Book is not here: it pays by the order, not by the
 * day (see upgradeWorth). The Ripening Room was measured again after its discount was dropped (DEC-101, PLAN-082):
 * with no rival holding one it added $1.54 a game at Normal and $2.81 at Hard, which with its $4 cost over the seven
 * days left is 0.8 and 1.0 a day (it was 1.7 and 1.5 with the discount).
 */
export const UPGRADE_RATE: Record<Level, Record<Exclude<UpgradeId, 'orderbook'>, number>> = {
  easy: { juicebar: 1.35, premium: 1.3, barrow: 0.75, ripening: 0.8 },
  normal: { juicebar: 1.35, premium: 1.3, barrow: 0.75, ripening: 0.8 },
  hard: { juicebar: 1.3, premium: 1.0, barrow: 1.05, ripening: 1.0 },
};
/**
 * An upgrade is worth less the more rivals have built the same one: they then fight over the same cheap mangoes, the
 * same old fruit or the same top prices. Measured (while it still had its discount): a Ripening Room was worth $7.7 a
 * game where almost no rival had one and $2.7 where both did; a Premium Display $4.2 and $1.6. Each rival with the same upgrade divides the daily
 * rate by a further `1 + UPGRADE_CROWD`, which also keeps a table of computers from all building the same thing.
 */
export const UPGRADE_CROWD = 0.35;

/**
 * What building this upgrade tonight is worth to a computer stall over the rest of the game, less its cost. Before
 * rules 18 the choice followed a fixed lean and mostly built the Ripening Room and the Order Book, the two that lost
 * it money. Exported for tests.
 */
export function upgradeWorth(s: GameState, p: number, u: UpgradeId): number {
  const pl = s.players[p];
  const left = s.config.days - s.day;
  const cost = UPGRADES[u].cost;
  if (u === 'orderbook') {
    // An order it holds now pays the bonus on every piece it delivers; a later order is won about one time in the
    // number of stalls (a little more with the book, which wins ties), and its stake is half.
    const n = s.players.length;
    const o = s.standing;
    const held = o && o.holder === p && o.due > s.day ? o.qty * ORDER_BOOK_BONUS * 0.8 : 0;
    const later = Array.from({ length: left }, (_, k) => s.day + 1 + k).filter((d) => isMarketDay(s, d) && d + ORDER_LEAD <= s.config.days).length;
    return held + later * (1.3 / n) * (orderQty(n) * ORDER_BOOK_BONUS * 0.8 + 1) - cost;
  }
  if (u === 'ripening' && (!s.config.unripe || left < 2)) return -cost;
  let rate = UPGRADE_RATE[level(s, p)][u];
  if (u === 'juicebar') {
    // Old fruit about (on its shelf or cheap at the market) is what a Juice Bar lives on.
    const atRisk = FRUITS.reduce((a, f) => a + pl.stock[f][0] + (pl.stock[f][1] ?? 0), 0);
    const oldAtMarket = FRUITS.reduce((a, f) => a + s.market[f].slice(0, 2).reduce((x, y) => x + y, 0), 0);
    if (atRisk >= 3 || oldAtMarket >= 4) rate += 0.3;
  }
  if (u === 'ripening' && pl.stock.mango.slice(FRUIT.mango.ripe.length).some((c) => c > 0)) rate += 0.2;
  // Upgrades are public: count the rivals who already have this one.
  const same = s.players.filter((o, i) => i !== p && o.upgrades.includes(u)).length;
  return (rate / (1 + UPGRADE_CROWD * same)) * left - cost;
}

/** The speciality this computer shop would build now (`skip` leaves one out, for balance tests). Rules 18: the one
 *  worth the most to it (see upgradeWorth), if that is worth more than it costs; a per-shop lean spreads the plans. */
export function pickUpgrade(s: GameState, p: number, skip?: UpgradeId): UpgradeId | null {
  const pl = s.players[p];
  const lv = level(s, p);
  if (lv === 'easy' && rand(s, p, 99) < 0.6) return null;
  let best: { u: UpgradeId; v: number } | null = null;
  (Object.keys(UPGRADES) as UpgradeId[]).forEach((u, k) => {
    if (u === skip || canUpgrade(s, p, u)) return;
    // Keep enough cash to buy fruit tomorrow.
    if (pl.cash - UPGRADES[u].cost < 6) return;
    const v = upgradeWorth(s, p, u) + (rand(s, p, 7 + k * 3) - 0.5) * (lv === 'easy' ? 6 : 2);
    if (v > 0.5 && (!best || v > best.v)) best = { u, v };
  });
  return (best as { u: UpgradeId; v: number } | null)?.u ?? null;
}

/** Performs one action for the AI whose turn it is. Returns null when it is not an AI's turn. */
export function aiStep(s: GameState): GameState | null {
  if (s.phase === 'morning' || s.phase === 'reveal' || s.phase === 'over') return null;
  const p = activePlayer(s);
  if (p < 0 || s.players[p].kind !== 'ai') return null;
  return aiActFor(s, p);
}

/**
 * One computer action for player `p` whatever kind of player they are. The online server uses it
 * to play for someone who has left the match. Only acts when it really is `p`'s turn (rules 19: in the evening, while
 * `p` has not said Lights out, whoever else is still deciding).
 */
export function aiActFor(s: GameState, p: number): GameState | null {
  if (s.phase === 'morning' || s.phase === 'reveal' || s.phase === 'over') return null;
  if (s.phase === 'evening' ? !eveningOpen(s, p) : activePlayer(s) !== p) return null;
  const pl = s.players[p];
  if (s.phase === 'order') return bidOrder(s, p, planOrderBid(s, p));
  if (s.phase === 'buy') {
    const fav = buyPhaseFavour(s, p);
    if (fav) return fav;
    if (pl.boughtToday < buyLimit(pl)) {
      const pick = pickPurchase(s, p);
      if (pick) return buy(s, p, pick.f, pick.pos);
    }
    return endBuyTurn(s, p);
  }
  if (s.phase === 'stall') return openStall(s, p, planStall(s, p));
  if (s.phase === 'bid') {
    return submitPrices(s, p, planPrices(s, p, recall(s, p)).posts);
  }
  // Rules 18: a computer stall answers the tie step at once. A seat it is only minding for a person keeps the card.
  if (s.phase === 'tie') return decideTie(s, p, pl.kind === 'ai' && wantsFavouredTrade(s, p));
  if (s.phase === 'evening') {
    // Rules 19: a Priority card played after one from a stall earlier in today's line-up would only come back, so a
    // computer keeps it then. (Computers decide first, in line-up order, so this is the rules 18 choice.)
    const pi = pl.favours.indexOf('priority');
    const ahead = s.priorityNext !== null && s.order.indexOf(s.priorityNext) < s.order.indexOf(p);
    if (pi >= 0 && !canPlayFavour(s, p, pi) && !ahead) return playFavour(s, p, pi);
    const gi = pl.favours.indexOf('gossip');
    if (gi >= 0 && !canPlayFavour(s, p, gi) && level(s, p) !== 'easy') return playFavour(s, p, gi);
    const u = pickUpgrade(s, p);
    if (u) return buyUpgrade(s, p, u);
    return endEvening(s, p);
  }
  return null;
}

/**
 * Rules 19: the computers' evening, all at once. Every stall `who` names that has not said Lights out decides now, one
 * after another in today's line-up (the order aiStep takes them in), and the evening is returned as it stands just
 * before night falls; null when there was nothing for them to do. The step that brings the night (the last computer's
 * Lights out, when every person is done) is left to the caller, so the computers' choices can be shown before it.
 * Offline `who` is the computer stalls; online also the seats a computer is minding for a person who left.
 */
export function computersEvening(s: GameState, who: (p: number) => boolean): GameState | null {
  if (s.phase !== 'evening') return null;
  let cur = s;
  let moved = false;
  for (const p of s.order) {
    for (let guard = 0; guard < 20 && who(p) && eveningOpen(cur, p); guard++) {
      const next = aiActFor(cur, p);
      if (!next || next.phase !== 'evening' || next.day !== cur.day) return moved ? cur : null;
      cur = next;
      moved = true;
    }
  }
  return moved ? cur : null;
}

/** Plays a whole game with only AIs (used by tests and balance simulations). */
export function autoplay(s: GameState, maxSteps = 5000): GameState {
  for (let i = 0; i < maxSteps && s.phase !== 'over'; i++) {
    if (s.phase === 'morning') s = beginBuying(s);
    else if (s.phase === 'reveal') s = finishReveal(s);
    else {
      const n = aiStep(s);
      if (!n) throw new Error(`Stuck in ${s.phase}`);
      s = n;
    }
  }
  return s;
}

export { FAVOURS };
