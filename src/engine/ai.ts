// Computer shopkeepers. They only use public information: market, customers, everyone's shelves,
// the backs of face-down walk-ins, and (rules 4) what each shop has put out for sale once stalls open.
// A walk-in's front is used only when this shop has heard Market Gossip about it.
// Each call to aiStep does one action, so the UI can animate them one at a time.

import { CUSTOMER_CARDS, FAVOURS, FRUIT, FRUITS, JUICE_TIP, MARKET_DAY_EVERY, UPGRADES, stageAt, type FruitId, type UpgradeId } from './data';
import {
  activePlayer, beginBuying, bestCap, buy, buyCost, buyUpgrade, canBuy, canPlayFavour, canUpgrade,
  capAt, capFor, count, effectiveMax, endBuyTurn, endEvening, finishReveal, forSale, minPrice,
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
function outlook(s: GameState, p: number, f: FruitId) {
  const known = [...servingCustomers(s), ...(s.phase === 'buy' && s.forecast ? [s.forecast] : [])];
  let qty = 0;
  let maxSum = 0;
  let maxN = 0;
  for (const c of known) for (const w of c.wants) if (w.fruit === f && w.qty > 0) {
    qty += w.qty;
    maxSum += effectiveMax(s, w, c.generous) * w.qty;
    maxN += w.qty;
  }
  if (s.phase === 'buy') {
    for (const c of s.queue) {
      const w = walkInWant(c, f, p);
      if (!w) continue;
      qty += w.qty;
      maxSum += effectiveMax(s, { fruit: f, qty: w.qty, max: w.max }, c.generous) * w.qty;
      maxN += w.qty;
    }
    for (const w of s.event?.extra?.wants ?? []) if (w.fruit === f) {
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
  return !!s.nextFarmer && (s.nextFarmer.supply[f] ?? 0) <= 3;
}

function fruitValue(s: GameState, p: number, f: FruitId, pos: number, extraMine: number): number {
  const pl = s.players[p];
  const stage = stageAt(f, pos);
  const daysLeft = s.config.days - s.day; // days after today
  const { qty, avgMax } = outlook(s, p, f);
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
      let score = fruitValue(s, p, f, pos, 0) - cost;
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
        const v = fruitValue(s, p, f, pos, 0);
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
    if (id === 'goodRiddance') {
      let old = 0;
      for (const f of FRUITS) old += pl.stock[f][0];
      if (old >= 3) return playFavour(s, p, i);
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

interface Seller { player: number; price: number; pos: number[] }

/**
 * Expected sales for one shop at price q, by running the day's queue for one fruit: cheapest stall first,
 * leftover demand spilling to the next; each stall hands over its oldest fruit fresh enough for the customer.
 * On a tie at the same price the units are shared in proportion.
 */
function simulateSales(s: GameState, f: FruitId, me: Seller, rivals: Seller[]): number {
  const lines = servingCustomers(s).flatMap((c) => c.wants.filter((w) => w.fruit === f && w.qty > 0).map((w) => ({ qty: w.qty, max: effectiveMax(s, w, c.generous) })));
  const pools = [me, ...rivals].map((x) => ({ ...x, pos: [...x.pos] }));
  let sold = 0;
  for (const l of lines) {
    let need = l.qty;
    const prices = [...new Set(pools.map((x) => x.price))].sort((a, b) => a - b);
    for (const price of prices) {
      if (need <= 0) break;
      const at = pools.filter((x) => x.price === price);
      const elig = at.map((x) => x.pos.filter((i) => capFor(s.players[x.player], f, i, l.max) >= price));
      const total = elig.reduce((a, e) => a + e.length, 0);
      if (!total) continue;
      const take = Math.min(need, total);
      at.forEach((x, k) => {
        const share = (take * elig[k].length) / total;
        // Remove that many eligible units (oldest first) from the pool; fractional shares count toward the total.
        let n = Math.floor(share + 1e-9);
        for (const i of elig[k]) { if (n <= 0) break; x.pos.splice(x.pos.indexOf(i), 1); n--; }
        if (x === pools[0]) sold += share;
      });
      need -= take;
    }
  }
  return sold;
}

/** A rival's likely posted price: the best it could ask the richest customer for this fruit, less a few dollars. */
function rivalPrice(s: GameState, r: number, f: FruitId, k: number, lv: Level): number {
  const top = Math.max(0, ...servingCustomers(s).flatMap((c) => c.wants.filter((w) => w.fruit === f && w.qty > 0).map((w) => bestCap(s.players[r].stock, f, effectiveMax(s, w, c.generous), s.players[r]))));
  const rl = s.players[r].kind === 'human' ? 'normal' : level(s, r);
  const cut = lv === 'normal' ? [1, 1, 2, 2][k] : rl === 'easy' ? [0, 1, 1, 1][k] : rl === 'normal' ? [1, 2, 2, 3][k] : [2, 2, 3, 3][k];
  return Math.max(minPrice(s, f), top - cut);
}

/** Best posted price for one fruit and how many it expects to sell, given how many each shop can sell. */
function bestPost(s: GameState, p: number, f: FruitId, myUnits: number, rivalUnits: (i: number) => number, depth = 0): { price: number; sold: number } {
  const pl = s.players[p];
  const lv: Level = depth > 0 ? 'normal' : level(s, p);
  const mine = units(pl.stock, f, myUnits);
  const lines = servingCustomers(s).flatMap((c) => c.wants.filter((w) => w.fruit === f && w.qty > 0).map((w) => effectiveMax(s, w, c.generous)));
  if (!mine.length || !lines.length) return { price: minPrice(s, f), sold: 0 };
  const topCap = Math.max(...lines.map((m) => bestCap(pl.stock, f, m, pl)));
  const lastDay = s.day >= s.config.days;
  const rotsTonight = pl.stock[f][0] > 0;
  const floor = Math.max(minPrice(s, f), rotsTonight || lastDay ? 1 : lv === 'easy' ? 3 : 2);
  const rivals = s.players.map((_, i) => i).filter((i) => i !== p && rivalUnits(i) > 0);
  if (lv === 'easy') {
    // An Easy shop guesses: somewhere from its best price down to $3 less, without reading rivals.
    const price = Math.max(floor, topCap - Math.floor(rand(s, p, FRUITS.indexOf(f) * 17) * 4));
    return { price, sold: mine.length };
  }
  // Value of a fruit kept for tomorrow (none if it rots tonight or the game ends).
  let keep = lastDay ? 0 : (lv === 'hard' ? HARD.keep : 0.3) * topCap;
  if (keep > 0 && scarceTomorrow(s, f)) keep = Math.max(keep, 0.45 * topCap);
  const lastUnits = mine.filter((i) => i === 0).length; // these rot tonight
  // A Hard shop predicts each rival's own best response (one step deeper) and prices against that, give or take $1.
  const predicted = lv === 'hard' && depth === 0
    ? Object.fromEntries(rivals.map((r) => [r, bestPost(s, r, f, rivalUnits(r), (i) => (i === r ? 0 : i === p ? myUnits : rivalUnits(i)), 1).price]))
    : null;
  const priceOf = (r: number, k: number) => (predicted ? Math.max(minPrice(s, f), predicted[r] + [-1, 0, 0, 1][k]) : rivalPrice(s, r, f, k, lv));
  let best = { price: topCap, ev: -Infinity, sold: 0 };
  for (let q = floor; q <= topCap; q++) {
    let ev = 0;
    let soldSum = 0;
    for (const k of [0, 1, 2, 3]) {
      const rs: Seller[] = rivals.map((r) => ({ player: r, price: priceOf(r, k), pos: units(s.players[r].stock, f, rivalUnits(r)) }));
      const sold = simulateSales(s, f, { player: p, price: q, pos: mine }, rs);
      const unsold = Math.max(0, mine.length - sold);
      const keptValue = Math.max(0, unsold - lastUnits) * keep;
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
    posts.push({ fruit: f, price: Math.min(30, price) });
    if (s.players.some((_, i) => i !== p && forSale(s, i, f) > 0)) contested = true;
  }
  if (validatePrices(s, p, posts)) return { posts: posts.map((b) => ({ ...b, price: Math.max(minPrice(s, b.fruit), Math.min(30, b.price)) })), favoured: false };
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
    ['premium', 4, true],
    ['barrow', 4, true],
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
