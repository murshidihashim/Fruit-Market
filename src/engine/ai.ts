// Computer shopkeepers. They only use public information: market, customers, everyone's shelves.
// Each call to aiStep does one action, so the UI can animate them one at a time.

import { CUSTOMER_CARDS, FAVOURS, FRUIT, FRUITS, UPGRADES, stageAt, type FruitId, type UpgradeId } from './data';
import {
  activePlayer, allocate, beginBuying, bestCap, buy, buyUpgrade, canBuy, canPlayFavour, canUpgrade,
  capFor, count, effectiveMax, endBuyTurn, endEvening, finishReveal, marketCost, minPrice, playFavour,
  servingCustomers, shelfSize, submitBids, validateBids, buyLimit,
  type Bid, type GameState, type Level, type Stock,
} from './game';
import { Rng } from './rng';

const DECK_AVG: Record<FruitId, { qty: number; max: number }> = (() => {
  const out = {} as Record<FruitId, { qty: number; max: number }>;
  for (const f of FRUITS) {
    const ws = CUSTOMER_CARDS.flatMap((c) => c.wants).filter((w) => w.fruit === f);
    out[f] = {
      qty: ws.reduce((a, w) => a + w.qty, 0) / CUSTOMER_CARDS.length,
      max: ws.reduce((a, w) => a + w.max, 0) / Math.max(1, ws.length),
    };
  }
  return out;
})();

function ripeCount(stock: Stock, f: FruitId): number {
  return count(stock, f, true);
}

function rand(s: GameState, p: number, salt: number): number {
  // Deterministic per game state so replays and tests are stable, without touching game RNG.
  const r = new Rng((s.rng ^ (p * 7919) ^ (s.day * 104729) ^ (salt * 31)) >>> 0);
  r.float();
  return r.float();
}

/** Demand we expect to compete for today, and what customers pay on average. */
function outlook(s: GameState, f: FruitId) {
  const known = [...servingCustomers(s), ...(s.phase === 'buy' && s.forecast ? [s.forecast] : [])];
  let qty = 0;
  let maxSum = 0;
  let maxN = 0;
  for (const c of known) for (const w of c.wants) if (w.fruit === f && w.qty > 0) {
    qty += w.qty;
    maxSum += effectiveMax(s, w) * w.qty;
    maxN += w.qty;
  }
  if (s.phase === 'buy' && s.event?.id !== 'rainy') {
    qty += DECK_AVG[f].qty;
    maxSum += DECK_AVG[f].max * DECK_AVG[f].qty;
    maxN += DECK_AVG[f].qty;
  }
  return { qty, avgMax: maxN ? maxSum / maxN : DECK_AVG[f].max };
}

function level(s: GameState, p: number): Level {
  return s.players[p].level ?? 'normal';
}

function fruitValue(s: GameState, p: number, f: FruitId, pos: number, extraMine: number): number {
  const pl = s.players[p];
  const stage = stageAt(f, pos);
  const daysLeft = s.config.days - s.day; // days after today
  const { qty, avgMax } = outlook(s, f);
  const others = s.players.reduce((a, o, i) => (i === p ? a : a + ripeCount(o.stock, f)), 0);
  const unboughtShare = s.phase === 'buy' ? (s.order.length - 1 - s.turn) * 1.2 : 0;
  const supply = others + unboughtShare + ripeCount(pl.stock, f) + extraMine + 1;
  const ratio = supply / Math.max(0.5, qty);
  if (stage === 'unripe') {
    const ripenIn = pos - (FRUIT[f].ripe.length - 1);
    if (ripenIn > daysLeft) return -99;
    return DECK_AVG[f].max * 0.55 - 2 - ripenIn * 0.3;
  }
  const cap = capFor(f, stage, avgMax);
  const price = ratio <= 1 ? cap - 0.5 : Math.max(1, cap - (ratio - 1) * 3.5);
  const pSell = Math.min(1, 1 / ratio);
  const laterDays = Math.min(pos, daysLeft);
  const later = laterDays > 0 ? 0.35 * Math.max(0, price - 1) * (1 - pSell) : 0;
  return price * pSell + later;
}

function pickPurchase(s: GameState, p: number): { f: FruitId; pos: number; score: number } | null {
  const lv = level(s, p);
  let best: { f: FruitId; pos: number; score: number } | null = null;
  for (const f of FRUITS) {
    for (let pos = 0; pos < s.market[f].length; pos++) {
      if (canBuy(s, p, f, pos)) continue;
      const cost = marketCost(s, f, pos);
      let score = fruitValue(s, p, f, pos, 0) - cost;
      if (lv === 'easy') score += (rand(s, p, f.length * 13 + pos) - 0.5) * 4;
      if (!best || score > best.score) best = { f, pos, score };
    }
  }
  const threshold = lv === 'hard' ? 0.8 : lv === 'normal' ? 0.8 : 0.3;
  return best && best.score >= threshold ? best : null;
}

function buyPhaseFavour(s: GameState, p: number): GameState | null {
  const pl = s.players[p];
  for (let i = 0; i < pl.favours.length; i++) {
    const id = pl.favours[i];
    if (canPlayFavour(s, p, i)) continue;
    if (id === 'freeCash') return playFavour(s, p, i);
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

export function planBids(s: GameState, p: number): { bids: Bid[]; favoured: boolean } {
  const pl = s.players[p];
  const lv = level(s, p);
  const stock: Stock = JSON.parse(JSON.stringify(pl.stock));
  const lines = servingCustomers(s)
    .flatMap((c) => c.wants.filter((w) => w.qty > 0).map((w) => ({ c, w, max: effectiveMax(s, w) })))
    .sort((a, b) => b.max - a.max);
  const bids: Bid[] = [];
  let contested = false;
  const lastDay = s.day >= s.config.days;
  for (const { c, w, max } of lines) {
    const f = w.fruit;
    const myCap = bestCap(stock, f, max);
    if (myCap <= 0) continue;
    const rivals = s.players
      .map((o, i) => ({ i, cap: i === p ? 0 : bestCap(o.stock, f, max), n: i === p ? 0 : ripeCount(o.stock, f) }))
      .filter((r) => r.n > 0 && r.cap > 0);
    const rivalUnits = rivals.reduce((a, r) => a + r.n, 0);
    const rivalCap = rivals.reduce((a, r) => Math.max(a, r.cap), 0);
    const rotsTonight = stock[f][0] > 0;
    const floor = Math.max(minPrice(s, f), rotsTonight || lastDay ? 1 : lv === 'easy' ? 3 : 2);
    let price: number;
    if (rivals.length === 0) {
      price = myCap;
    } else if (lv === 'easy') {
      contested = true;
      price = Math.min(myCap, rivalCap - Math.round(rand(s, p, c.id * 5 + FRUITS.indexOf(f)) * 1.5));
    } else {
      contested = true;
      // Best response: try every price and assume rivals undercut their own cap by a few dollars.
      const fruitDemand = lines.filter((l) => l.w.fruit === f).reduce((a, l) => a + l.w.qty, 0);
      const share = w.qty / Math.max(1, fruitDemand);
      const keep = rotsTonight || lastDay ? 0 : 0.3 * myCap;
      const myQty = Math.min(w.qty, ripeCount(stock, f));
      const scenarios = [0, 1, 2, 3];
      // How far below their cap each rival tends to go, per scenario.
      const style = (r: { i: number }, k: number): number => {
        if (lv === 'normal') return [1, 1, 2, 2][k];
        const rl = s.players[r.i].kind === 'human' ? 'normal' : level(s, r.i);
        return rl === 'easy' ? [0, 1, 1, 1][k] : rl === 'normal' ? [1, 2, 2, 3][k] : [2, 2, 3, 3][k];
      };
      let bestEv = -1;
      price = myCap;
      for (let q = floor; q <= myCap; q++) {
        let ev = 0;
        for (const k of scenarios) {
          let below = 0;
          for (const r of rivals) {
            const rp = Math.max(1, r.cap - style(r, k));
            if (rp < q) below += r.n * share;
            else if (rp === q) below += r.n * share * 0.5;
          }
          const sold = Math.max(0, Math.min(myQty, w.qty - below));
          ev += q * sold + keep * (myQty - sold);
        }
        if (ev > bestEv + 1e-9) { bestEv = ev; price = q; }
      }
      if (lv === 'normal') price -= Math.round(rand(s, p, c.id * 7 + FRUITS.indexOf(f)) * 0.8);
      void rivalUnits;
    }
    price = Math.max(floor, Math.round(price));
    let qty = Math.min(w.qty, ripeCount(stock, f));
    let used: number[] | null = null;
    while (qty > 0 && !(used = allocate(stock, f, qty, price, max))) qty--;
    if (!used || qty <= 0) continue;
    for (const i of used) stock[f][i]--;
    bids.push({ customerId: c.id, fruit: f, qty, price });
  }
  // Safety net: drop offers until the set is valid.
  while (bids.length && validateBids(s, p, bids)) bids.pop();
  const favoured = contested && pl.favours.includes('favouredTrade') && !pl.favouredTrade;
  return { bids, favoured };
}

function pickUpgrade(s: GameState, p: number): UpgradeId | null {
  const pl = s.players[p];
  const lv = level(s, p);
  const left = s.config.days - s.day;
  if (lv === 'easy' && rand(s, p, 99) < 0.6) return null;
  const want: [UpgradeId, number][] = [
    ['cart', 4], ['signboard', 6], ['coolroom', 7], ['shelf', 5],
  ];
  for (const [u, minDays] of want) {
    if (left < minDays) continue;
    if (canUpgrade(s, p, u)) continue;
    if (u === 'shelf' && count(pl.stock) < shelfSize(pl) - 1) continue;
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
  if (s.phase === 'bid') {
    const { bids, favoured } = planBids(s, p);
    return submitBids(s, p, bids, favoured);
  }
  if (s.phase === 'evening') {
    const pi = pl.favours.indexOf('priority');
    if (pi >= 0 && !canPlayFavour(s, p, pi) && s.priorityNext === null) return playFavour(s, p, pi);
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
