// Computer shopkeepers. They only use public information: market, customers, everyone's shelves,
// the backs of face-down walk-ins, and (rules 4) what each shop has put out for sale once stalls open.
// A walk-in's front is used only when this shop has seen the card (Market Gossip or Scout).
// Each call to aiStep does one action, so the UI can animate them one at a time.

import { CUSTOMER_CARDS, FAVOURS, FRUIT, FRUITS, JAM_PRICE, JUICE_TIP, MARKET_DAY_EVERY, UPGRADES, acceptsStage, prefOf, stageAt, type FruitId, type UpgradeId } from './data';
import {
  activePlayer, beginBuying, bestCap, buy, maxPrice, printedSupply, buyCost, buyUpgrade, canBuy, canPlayFavour, canUpgrade,
  capAt, capFor, count, effectiveMax, endBuyTurn, endEvening, finishReveal, forSale, isLastCall, minPrice,
  openStall, playFavour, priceMod, servingCustomers, shelfSize, submitPrices, validatePrices, validateStall, buyLimit,
  type Customer, type GameState, type Level, type Post, type Stall, type Stock,
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
  const known = [...servingCustomers(s), ...(s.phase === 'buy' && s.forecast ? [s.forecast] : [])];
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
  // Tomorrow's event can empty the lorry too.
  const ev = s.nextEvent;
  if (ev && (ev.noDelivery || ev.noFruit === f || ev.supplyMult)) return true;
  // Scarce: the card brings no more than one piece per shop.
  return !!s.nextFarmer && printedSupply(s.nextFarmer, f, s.players.length) <= s.players.length;
}

/** What one piece is worth to this shop; `cost` is what it would pay for it (0 for a free one). */
function fruitValue(s: GameState, p: number, f: FruitId, pos: number, extraMine: number, cost: number): number {
  const pl = s.players[p];
  const stage = stageAt(f, pos);
  const daysLeft = s.config.days - s.day; // days after today
  const { qty, avgMax } = outlook(s, p, f, stage);
  const others = s.players.reduce((a, o, i) => (i === p ? a : a + ripeCount(o.stock, f)), 0);
  const unboughtShare = s.phase === 'buy' ? (s.order.length - 1 - s.turn) * 1.2 : 0;
  const supply = others + unboughtShare + ripeCount(pl.stock, f) + extraMine + 1;
  const ratio = supply / Math.max(0.5, qty);
  if (stage === 'unripe') {
    const ripenIn = pos - (FRUIT[f].ripe.length - 1);
    if (ripenIn > daysLeft) return -99;
    return (WANT_AVG[f].max - 1) * 0.6 - 2 - ripenIn * 0.3;
  }
  const cap = capAt(f, pos, avgMax);
  const planner = level(s, p) !== 'easy';
  const juice = planner && pl.upgrades.includes('juicebar');
  const cold = planner && pl.upgrades.includes('coldroom');
  // Juice Bar: older fruit earns a tip when sold.
  const tip = juice && stage !== 'fresh' ? JUICE_TIP : 0;
  const price = (ratio <= 1 ? cap - 0.5 : Math.max(1, cap - (ratio - 1) * 3.5)) + tip;
  const pSell = Math.min(1, 1 / ratio);
  // A Cold Room makes fruit last about twice as long.
  const laterDays = Math.min(cold ? pos * 2 + 1 : pos, daysLeft);
  let later = laterDays > 0 ? (cold ? 0.55 : 0.35) * Math.max(0, price - 1) * (1 - pSell) : 0;
  // Juice Bar: fruit that doesn't sell still becomes juice ($2) when it spoils, if there is room in tonight's 3.
  if (juice && daysLeft > 0) {
    const spoilingSoon = FRUITS.reduce((a, x) => a + pl.stock[x][0], 0) + extraMine;
    if (spoilingSoon < 3) later = Math.max(later, 2 * (1 - pSell));
  }
  // A Hard shop reads tomorrow's event: fruit that sells for more tomorrow is worth keeping.
  if (level(s, p) === 'hard' && HARD.eventAware && laterDays > 0 && s.nextEvent) {
    const mod = (s.nextEvent.priceAll ?? 0) + (s.nextEvent.price?.[f] ?? 0);
    later += HARD.eventAware * mod * 0.5;
  }
  // Closing Day: ripe fruit that doesn't sell goes to the jam maker. Counted only for a piece that costs no more than
  // the jam maker pays (a free one, or one at the jam price), which can't lose money. The sale chance here is a hopeful guess:
  // counting the jam on dearer pieces made computers buy last-day fruit that mostly went for jam at a loss (PLAN-051
  // balance run). It also needs some expected buyer for this fruit at this freshness (`qty`: today's face-up customers
  // and, while buying, face-down walk-ins guessed from the fruit on their backs), so it never props up a piece that
  // nobody is expected to want.
  if (planner && daysLeft === 0 && isLastCall(s) && qty > 0 && cost <= JAM_PRICE) later = Math.max(later, JAM_PRICE * (1 - pSell));
  // Health Inspector tomorrow morning: fruit that turns tired overnight costs $2 before anyone can sell it.
  if (laterDays > 0 && s.nextEvent?.inspector && pos === 1) later -= s.nextEvent.inspector * (1 - pSell);
  // Fruit that will be scarce tomorrow (few on the next lorry) is worth keeping.
  if (laterDays > 0 && planner && scarceTomorrow(s, f)) {
    later += 0.5 * Math.max(0, price - 1) * (1 - pSell * 0.5);
  }
  return price * pSell + later;
}

function pickPurchase(s: GameState, p: number): { f: FruitId; pos: number; score: number } | null {
  const lv = level(s, p);
  let best: { f: FruitId; pos: number; score: number } | null = null;
  for (const f of FRUITS) {
    for (let pos = 0; pos < s.market[f].length; pos++) {
      if (canBuy(s, p, f, pos)) continue;
      const cost = buyCost(s, p, f, pos);
      let score = fruitValue(s, p, f, pos, 0, cost) - cost;
      if (lv === 'easy') score += (rand(s, p, f.length * 13 + pos) - 0.5) * 6;
      if (!best || score > best.score) best = { f, pos, score };
    }
  }
  const threshold = lv === 'hard' ? HARD.threshold : lv === 'normal' ? 0.8 : 0.3;
  return best && best.score >= threshold ? best : null;
}

export function buyPhaseFavour(s: GameState, p: number): GameState | null {
  const pl = s.players[p];
  for (let i = 0; i < pl.favours.length; i++) {
    const id = pl.favours[i];
    if (canPlayFavour(s, p, i)) continue;
    if (id === 'freeFruit' && count(pl.stock) < shelfSize(pl)) {
      let best: { f: FruitId; pos: number; v: number } | null = null;
      for (const f of FRUITS) for (let pos = 0; pos < s.market[f].length; pos++) {
        if (!s.market[f][pos]) continue;
        const v = fruitValue(s, p, f, pos, 0, 0);
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

/** A stall for the planner's model: its whole ripe shelf, of which it sells at most `n` (its crate). */
export function seller(s: GameState, player: number, f: FruitId, price: number, n: number, ft = false): Seller {
  const pos = units(s.players[player].stock, f, Infinity);
  return { player, price, pos, left: Math.min(n, pos.length), ft };
}

/**
 * Expected sales for one shop (`me`), by running the day's queue for one fruit the way the rush does: cheapest stall
 * first, leftover demand spilling to the next; each stall hands over its oldest fruit fresh enough for the customer,
 * from its whole shelf, up to the number in its crate. Ties follow the rules: Favoured Trade, then the Haggler, then
 * the fresher fruit handed over, then today's buying order. Traits and the buying order are public; Favoured Trade
 * counts only where the planner knows it (`ft`), because rivals' favour cards are secret. Exported for tests.
 */
export function simulateSales(s: GameState, f: FruitId, me: Seller, rivals: Seller[]): number {
  const lines = servingCustomers(s).flatMap((c) => c.wants.filter((w) => w.fruit === f && w.qty > 0).map((w) => ({ qty: w.qty, max: effectiveMax(s, w, c.generous), pref: c.pref })));
  const pools = [me, ...rivals].map((x) => ({ ...x, pos: [...x.pos] }));
  const haggler = (x: Seller) => Number(s.players[x.player].trait === 'haggler');
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
        if (capFor(pl, f, i, l.max) >= x.price && acceptsStage(l.pref, stageAt(f, i))) used.push(k);
      }
      if (used.length) offers.push({ x, used, fresh: x.pos[used[used.length - 1]] });
    }
    offers.sort((a, b) => a.x.price - b.x.price || Number(!!b.x.ft) - Number(!!a.x.ft) || haggler(b.x) - haggler(a.x)
      || b.fresh - a.fresh || orderIdx(a.x) - orderIdx(b.x));
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
 * average ($1.60 below it against $1.85), so one of its four guesses here cuts nothing. Exported for tests.
 */
export function rivalPrice(s: GameState, p: number, r: number, f: FruitId, k: number, lv: Level): number {
  const top = Math.max(0, ...servingCustomers(s).flatMap((c) => c.wants.filter((w) => w.fruit === f && w.qty > 0).map((w) => bestCap(s.players[r].stock, f, effectiveMax(s, w, c.generous), s.players[r], c.pref))));
  const rl = s.players[r].kind === 'human' ? 'normal' : level(s, r);
  const haggler = s.players[r].trait === 'haggler' && s.players[p].trait !== 'haggler';
  const cut = lv === 'normal' ? (haggler ? [0, 1, 2, 2] : [1, 1, 2, 2])[k] : rl === 'easy' ? [0, 1, 1, 1][k] : rl === 'normal' ? [1, 2, 2, 3][k] : [2, 2, 3, 3][k];
  return Math.max(minPrice(s, f), top - cut);
}

/** Best posted price for one fruit and how many it expects to sell, given how many each shop can sell. */
function bestPost(s: GameState, p: number, f: FruitId, myUnits: number, rivalUnits: (i: number) => number, depth = 0): { price: number; sold: number } {
  const pl = s.players[p];
  const lv: Level = depth > 0 ? 'normal' : level(s, p);
  const mine = units(pl.stock, f, myUnits);
  const lines = servingCustomers(s).flatMap((c) => c.wants.filter((w) => w.fruit === f && w.qty > 0).map((w) => ({ m: effectiveMax(s, w, c.generous), pref: c.pref })));
  if (!mine.length || !lines.length) return { price: minPrice(s, f), sold: 0 };
  // Price Controls: never ask above the day's maximum.
  const topCap = Math.min(maxPrice(s, f), Math.max(...lines.map((l) => bestCap(pl.stock, f, l.m, pl, l.pref))));
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
  // A computer shop holding Favoured Trade plays it whenever a fruit is contested (planPrices), so it knows it wins ties.
  // A person decides for themselves, so their suggested price assumes they don't; a rival's cards are secret.
  const ft = depth === 0 && (pl.favouredTrade || (pl.kind === 'ai' && pl.favours.includes('favouredTrade')));
  // A Hard shop predicts each rival's own best response (one step deeper) and prices against that, give or take $1.
  const predicted = lv === 'hard' && depth === 0
    ? Object.fromEntries(rivals.map((r) => [r, bestPost(s, r, f, rivalUnits(r), (i) => (i === r ? 0 : i === p ? myUnits : rivalUnits(i)), 1).price]))
    : null;
  const priceOf = (r: number, k: number) => (predicted ? Math.max(minPrice(s, f), predicted[r] + [-1, 0, 0, 1][k]) : rivalPrice(s, p, r, f, k, lv));
  const myStall = seller(s, p, f, floor, mine.length, ft);
  const rivalStalls = rivals.map((r) => seller(s, r, f, floor, rivalUnits(r)));
  let best = { price: topCap, ev: -Infinity, sold: 0 };
  for (let q = floor; q <= topCap; q++) {
    let ev = 0;
    let soldSum = 0;
    for (const k of [0, 1, 2, 3]) {
      const rs = rivalStalls.map((x) => ({ ...x, price: priceOf(x.player, k) }));
      const sold = simulateSales(s, f, { ...myStall, price: q }, rs);
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

/** What this computer puts out for sale (before rivals' stalls are known: it assumes they may sell all ripe stock). */
export function planStall(s: GameState, p: number): Stall {
  const pl = s.players[p];
  const stall: Stall = {};
  const lastDay = s.day >= s.config.days;
  for (const f of FRUITS) {
    const have = ripeCount(pl.stock, f);
    if (!have) continue;
    let out = have;
    // Holding back makes sense only when the fruit will be scarce tomorrow and keeps another night.
    // A Cold Room skips ageing after odd days: unsold stock loses nothing, so put out only what should sell.
    const coldNight = pl.upgrades.includes('coldroom') && s.day % 2 === 1;
    if (!lastDay && level(s, p) !== 'easy' && (scarceTomorrow(s, f) || coldNight)) {
      const { sold } = bestPost(s, p, f, have, (i) => ripeCount(s.players[i].stock, f));
      out = Math.max(pl.stock[f][0], Math.min(have, Math.ceil(sold + 0.5)));
    }
    if (out > 0) stall[f] = out;
  }
  return validateStall(s, p, stall) ? {} : stall;
}

/** One secret price per fruit put out, knowing what every shop has put out for sale. */
export function planPrices(s: GameState, p: number): { posts: Post[]; favoured: boolean } {
  const pl = s.players[p];
  const posts: Post[] = [];
  let contested = false;
  for (const f of FRUITS) {
    const n = forSale(s, p, f);
    if (n <= 0) continue;
    const { price } = bestPost(s, p, f, n, (i) => forSale(s, i, f));
    posts.push({ fruit: f, price: Math.min(30, maxPrice(s, f), price) });
    if (s.players.some((_, i) => i !== p && forSale(s, i, f) > 0)) contested = true;
  }
  if (validatePrices(s, p, posts)) return { posts: posts.map((b) => ({ ...b, price: Math.max(minPrice(s, b.fruit), Math.min(30, maxPrice(s, b.fruit), b.price)) })), favoured: false };
  const favoured = contested && pl.favours.includes('favouredTrade') && !pl.favouredTrade;
  return { posts, favoured };
}

/** The speciality this computer shop would build now (`skip` leaves one out, for balance tests). */
export function pickUpgrade(s: GameState, p: number, skip?: UpgradeId): UpgradeId | null {
  const pl = s.players[p];
  const lv = level(s, p);
  const left = s.config.days - s.day;
  if (lv === 'easy' && rand(s, p, 99) < 0.6) return null;
  const atRisk = FRUITS.reduce((a, f) => a + pl.stock[f][0] + (pl.stock[f][1] ?? 0), 0);
  const oldAtMarket = FRUITS.reduce((a, f) => a + s.market[f].slice(0, 2).reduce((x, y) => x + y, 0), 0);
  const marketDaysLeft = Math.floor(s.config.days / MARKET_DAY_EVERY) - Math.floor(s.day / MARKET_DAY_EVERY);
  // [speciality, fewest days left worth it, extra condition]
  const want: [UpgradeId, number, boolean][] = [
    ['barrow', 4, true],
    ['premium', 4, true],
    ['coldroom', 3, true],
    ['juicebar', 2, atRisk >= 1],
  ];
  // Normal and Hard shops pick the speciality that suits them first: lots of old fruit about suits a Juice Bar,
  // Market Days still to come suit a Cold Room. A per-shop lean spreads the plans across the table.
  if (lv !== 'easy') {
    const lean = rand(s, p, 7);
    if ((atRisk >= 3 || oldAtMarket >= 4) && lean < 0.5) want.unshift(['juicebar', 2, true]);
    else if (marketDaysLeft >= 1 && lean >= 0.5) want.unshift(['coldroom', 3, true]);
  }
  for (const [u, minDays, ok] of want) {
    if (u === skip || left < minDays || !ok) continue;
    if (canUpgrade(s, p, u)) continue;
    if (pl.cash - UPGRADES[u].cost < 6) continue;
    return u;
  }
  return null;
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
 * to play for someone who has left the match. Only acts when it really is `p`'s turn.
 */
export function aiActFor(s: GameState, p: number): GameState | null {
  if (s.phase === 'morning' || s.phase === 'reveal' || s.phase === 'over') return null;
  if (activePlayer(s) !== p) return null;
  const pl = s.players[p];
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
    const { posts, favoured } = planPrices(s, p);
    return submitPrices(s, p, posts, favoured);
  }
  if (s.phase === 'evening') {
    const pi = pl.favours.indexOf('priority');
    if (pi >= 0 && !canPlayFavour(s, p, pi) && s.priorityNext === null) return playFavour(s, p, pi);
    const gi = pl.favours.indexOf('gossip');
    if (gi >= 0 && !canPlayFavour(s, p, gi) && level(s, p) !== 'easy') return playFavour(s, p, gi);
    const u = pickUpgrade(s, p);
    if (u) return buyUpgrade(s, p, u);
    return endEvening(s, p);
  }
  return null;
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
