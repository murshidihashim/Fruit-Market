// Lab harness for the balance study (rules 17). Plays all-computer games with detailed tracking.
// Everything here reads the engine; rule experiments are switched on through LAB in src/engine/data.ts
// or by patching the data tables at run time.
import { aiStep, planOrderBid } from '../../src/engine/ai';
import { CHARACTER_TRAIT, FRUIT, FRUITS, ORDER_CARDS, stageAt, type FavourId, type FruitId, type TraitId, type UpgradeId } from '../../src/engine/data';
import {
  activePlayer, beginBuying, bidOrder, buyUpgrade, canPlayFavour, canUpgrade, count, endEvening, finishReveal, newGame,
  playFavour, ranking, marketCost, type GameState, type Level, type OrderResult,
} from '../../src/engine/game';
import { Rng } from '../../src/engine/rng';

export const ALL_TRAITS: TraitId[] = ['haggler', 'basket', 'bargain', 'charmer', 'favourite', 'nestegg', 'keeper', 'earful'];
const AVATAR: Record<string, string> = Object.fromEntries(Object.entries(CHARACTER_TRAIT).map(([a, t]) => [t, a]));
const ORDER_NAMES = new Set(ORDER_CARDS.map((c) => c.name));
export const zeroF = () => Object.fromEntries(FRUITS.map((f) => [f, 0])) as Record<FruitId, number>;

export interface SeatPolicy {
  /** 'ai' (default), 'none', or a list: build the first affordable one on a draft night and nothing else. */
  upgrades?: 'ai' | 'none' | UpgradeId[];
  /** With a list: keep buying down the list (up to two) instead of stopping after one. */
  upgradesAll?: boolean;
  /** Standing-order bid: 'ai' (default), 'pass', 'ceiling', or a fixed number. */
  order?: 'ai' | 'pass' | 'ceiling' | number;
  /** Play Scout at the start of the buying turn (the stock computer never plays it). */
  scout?: boolean;
}
export interface Opts {
  n: number; seed: number; days?: number; levels?: Level[];
  /** 'random' (default): distinct random perks per game; or a fixed list by seat. */
  traits?: (TraitId | null)[] | 'random';
  events?: boolean; upgrades?: boolean; policy?: SeatPolicy[];
  gift?: { seat: number; favour: FavourId }[];
  scoutAll?: boolean;
  /** Force this EVENT_CARDS index on this day. */
  forceEvent?: { day: number; event: number };
  /** This seat always buys first (or always last), whatever its cash. */
  forceFirst?: number; forceLast?: number;
  /** After the rush of this day the seat is left with $0 and an empty shelf (stress test). */
  shock?: { day: number; seat: number };
}

export interface OrderLog {
  day: number; fruit: FruitId; qty: number; ceiling: number; fineEach: number;
  bids: (number | null)[]; holder: number | null; price: number | null;
  res?: OrderResult; holderCashAtBid?: number;
}
export interface DayLog {
  day: number; event: string; first: number;
  delivery: Record<FruitId, number>;
  dawnCash: number[]; dawnRipe: number[]; dawnGreen: number[]; inspector: number[];
  canAfford: boolean[]; // on its buying turn: could it pay for any piece at the market?
  bought: number[]; spentFruit: number[];
  boughtF: Record<FruitId, number>; costF: Record<FruitId, number>; freeF: Record<FruitId, number>;
  wanted: Record<FruitId, number>; offered: Record<FruitId, number>;
  soldRow: Record<FruitId, number>; revRow: Record<FruitId, number>;
  soldOrder: Record<FruitId, number>; revOrder: Record<FruitId, number>;
  soldHawker: Record<FruitId, number>; juiceTip: Record<FruitId, number>;
  soldStage: Record<FruitId, number[]>; // [fresh, okay, soft]
  income: number[]; orderFine: number[]; tips: number[]; soleServes: number[];
  upg: [number, UpgradeId][]; upgSpend: number[];
  spoiledF: Record<FruitId, number>; leftF: Record<FruitId, number>; juiced: number; shelfNight: Record<FruitId, number>; spoiledBy: number[];
  favEarned: [number, FavourId][]; favPlayed: [number, FavourId][]; reshuffle: number; deckEmptyAtEnd: boolean;
  endCash: number[];
}
export interface GameLog {
  n: number; seed: number; ndays: number; levels: Level[]; traits: (TraitId | null)[];
  days: DayLog[]; orders: OrderLog[];
  cash: number[]; rank: number[]; sold: number[]; upgrades: UpgradeId[][]; favLeft: FavourId[][]; favStart: FavourId[][];
  jamF: Record<FruitId, number>; greenLeftF: Record<FruitId, number>;
  /** Lab safety nets: what each stall was handed (dollars for a float or odd jobs, pieces for credit or the seconds box). */
  net?: number[];
}

function pickTraits(n: number, seed: number): TraitId[] {
  const r = new Rng((seed * 2654435761 + 12345) >>> 0);
  r.float();
  return r.shuffle([...ALL_TRAITS]).slice(0, n);
}

const ripeN = (st: Record<FruitId, number[]>) => FRUITS.reduce((a, f) => a + st[f].slice(0, FRUIT[f].ripe.length).reduce((x, y) => x + y, 0), 0);
const stageIdx = (f: FruitId, pos: number) => { const st = stageAt(f, pos); return st === 'fresh' ? 0 : st === 'okay' ? 1 : 2; };

export class Run {
  s: GameState; log: GameLog; cur!: DayLog; curOrder: OrderLog | null = null;
  constructor(public o: Opts, from?: { s: GameState; log: GameLog }) {
    const days = o.days ?? 10;
    const levels = o.levels ?? Array(o.n).fill('normal');
    if (from) { this.s = JSON.parse(JSON.stringify(from.s)); this.log = JSON.parse(JSON.stringify(from.log)); this.cur = this.log.days[this.log.days.length - 1]; return; }
    const traits = o.traits === undefined || o.traits === 'random' ? pickTraits(o.n, o.seed) : o.traits;
    this.s = newGame({
      players: levels.map((l, i) => ({ name: `P${i}`, kind: (traits[i] ? 'ai' : 'human') as 'ai' | 'human', level: l, avatar: traits[i] ? AVATAR[traits[i]!] : '' })),
      days, unripe: true, upgrades: o.upgrades ?? true, events: o.events ?? true, seed: o.seed,
    });
    this.log = {
      n: o.n, seed: o.seed, ndays: days, levels, traits, days: [], orders: [], cash: [], rank: [], sold: [], upgrades: [], favLeft: [],
      favStart: this.s.players.map((p) => [...p.favours]), jamF: zeroF(), greenLeftF: zeroF(),
    };
    if (traits.some((x) => !x)) {
      // A seat with no perk: stop the first morning from dealing it one, then let the computer play it.
      this.s = JSON.parse(JSON.stringify(this.s));
      this.s.players.forEach((pl, i) => { if (!traits[i]) { pl.traitOffer = []; pl.kind = 'ai'; } });
    }
    if (o.gift) { this.s = JSON.parse(JSON.stringify(this.s)); for (const g of o.gift) this.s.players[g.seat].favours.push(g.favour); }
  }
  get over() { return this.s.phase === 'over'; }

  private newDay() {
    const s = this.s, n = s.players.length;
    const z = () => new Array(n).fill(0);
    this.cur = {
      day: s.day, event: s.event?.id ?? 'none', first: s.order[0], delivery: { ...zeroF(), ...s.delivery },
      dawnCash: s.players.map((p) => p.cash), dawnRipe: s.players.map((p) => ripeN(p.stock)), dawnGreen: s.players.map((p) => count(p.stock) - ripeN(p.stock)),
      inspector: [...(s.dayFines ?? z())], canAfford: new Array(n).fill(true), bought: z(), spentFruit: z(),
      boughtF: zeroF(), costF: zeroF(), freeF: zeroF(), wanted: zeroF(), offered: zeroF(), soldRow: zeroF(), revRow: zeroF(),
      soldOrder: zeroF(), revOrder: zeroF(), soldHawker: zeroF(), juiceTip: zeroF(),
      soldStage: Object.fromEntries(FRUITS.map((f) => [f, [0, 0, 0]])) as Record<FruitId, number[]>,
      income: z(), orderFine: z(), tips: z(), soleServes: z(), upg: [], upgSpend: z(),
      spoiledF: zeroF(), leftF: zeroF(), juiced: 0, shelfNight: zeroF(), spoiledBy: z(), favEarned: [], favPlayed: [], reshuffle: 0, deckEmptyAtEnd: false, endCash: [],
    };
    this.log.days.push(this.cur);
  }

  /** Favour cards played in a step (before + earned - after). */
  private favDiff(before: GameState, after: GameState, earned: [number, FavourId][]) {
    before.players.forEach((bp, q) => {
      const ap = after.players[q];
      const got = earned.filter((e) => e[0] === q).map((e) => e[1]);
      if (ap.favours.length >= bp.favours.length + got.length) return;
      const pool = [...bp.favours, ...got];
      for (const c of ap.favours) { const k = pool.indexOf(c); if (k >= 0) pool.splice(k, 1); }
      for (const c of pool) this.cur.favPlayed.push([q, c]);
    });
  }

  private night(before: GameState, after: GameState) {
    before.players.forEach((bp, q) => {
      const ap = after.players[q];
      for (const f of FRUITS) {
        const b = count(bp.stock, f), a = count(ap.stock, f);
        this.cur.shelfNight[f] += b;
        this.cur.leftF[f] += b - a;
      }
      this.cur.juiced += (ap.stats.juiced ?? 0) - (bp.stats.juiced ?? 0);
      this.cur.spoiledBy[q] = ap.stats.spoiled - bp.stats.spoiled;
    });
    // Split the pieces that left the shelves into spoiled and juiced, in proportion.
    const left = FRUITS.reduce((a, f) => a + this.cur.leftF[f], 0);
    for (const f of FRUITS) this.cur.spoiledF[f] = left ? this.cur.leftF[f] * (1 - this.cur.juiced / left) : 0;
  }

  private sales(before: GameState, after: GameState) {
    const r = after.results!;
    const c = this.cur;
    after.players.forEach((ap, q) => {
      for (const f of FRUITS) for (let pos = 0; pos < FRUIT[f].ripe.length; pos++) {
        const d = before.players[q].stock[f][pos] - ap.stock[f][pos];
        if (d > 0) c.soldStage[f][stageIdx(f, pos)] += d;
      }
      for (const f of FRUITS) c.offered[f] += after.stalls[q]?.[f] ?? 0;
    });
    const byCust = new Map<number, { done: boolean; sup: Set<number> }>();
    for (const l of r.lines) {
      const isOrder = ORDER_NAMES.has(l.name);
      let sold = 0;
      for (const o of l.offers) if (o.sold) {
        sold += o.sold;
        if (isOrder) { c.soldOrder[l.fruit] += o.sold; c.revOrder[l.fruit] += o.sold * o.price; }
        else { c.soldRow[l.fruit] += o.sold; c.revRow[l.fruit] += o.sold * o.price; c.juiceTip[l.fruit] += o.juice ?? 0; }
      }
      if (isOrder) continue;
      c.wanted[l.fruit] += l.want;
      const e = byCust.get(l.customerId) ?? { done: true, sup: new Set<number>() };
      if (sold < l.want) e.done = false;
      for (const o of l.offers) if (o.sold) e.sup.add(o.player);
      byCust.set(l.customerId, e);
    }
    for (const e of byCust.values()) if (e.done && e.sup.size === 1) c.soleServes[[...e.sup][0]]++;
    for (const h of r.hawker ?? []) c.soldHawker[h.fruit]++;
    for (const t of r.earful ?? []) c.tips[t.player] += t.tip;
    c.income = [...r.income];
    if (r.order) {
      c.orderFine[r.order.holder] += r.order.fine;
      const ol = [...this.log.orders].reverse().find((x) => x.holder === r.order!.holder && x.res === undefined);
      if (ol) ol.res = r.order;
    }
    const earned = r.favours.map((x) => [x.player, x.favour] as [number, FavourId]);
    c.favEarned.push(...earned);
    if (after.favourDeck.length !== before.favourDeck.length - earned.length) c.reshuffle++;
    this.favDiff(before, after, earned);
  }

  step() {
    let s = this.s;
    const o = this.o;
    if (s.phase === 'morning') {
      if (o.forceFirst !== undefined || o.forceLast !== undefined) {
        s = JSON.parse(JSON.stringify(s)) as GameState;
        const k = (o.forceFirst ?? o.forceLast)!;
        const others = s.order.filter((i) => i !== k);
        s.order = o.forceFirst !== undefined ? [k, ...others] : [...others, k];
        this.s = s;
      }
      this.newDay();
      this.s = beginBuying(s);
      if (this.s.phase === 'order' && this.s.standing) {
        const st = this.s.standing;
        this.curOrder = { day: s.day, fruit: st.fruit, qty: st.qty, ceiling: st.ceiling, fineEach: st.fine, bids: s.players.map(() => null), holder: null, price: null };
        this.log.orders.push(this.curOrder);
      }
      return;
    }
    if (s.phase === 'reveal') {
      const before = s;
      if (o.shock && o.shock.day === s.day) {
        s = JSON.parse(JSON.stringify(s)) as GameState;
        const pl = s.players[o.shock.seat];
        pl.cash = 0;
        for (const f of FRUITS) pl.stock[f] = pl.stock[f].map(() => 0);
      }
      if (o.forceEvent && o.forceEvent.day === s.day + 1) {
        s = JSON.parse(JSON.stringify(s)) as GameState;
        const idx = o.forceEvent.event;
        s.eventDeck = [idx, ...s.eventDeck.filter((i) => i !== idx)];
      }
      const after = finishReveal(s);
      this.cur.endCash = s.players.map((p) => p.cash);
      this.cur.deckEmptyAtEnd = s.favourDeck.length === 0;
      if (after.phase === 'over') this.finish(after);
      else if (after.day !== before.day) this.night(s, after);
      this.s = after;
      return;
    }
    const p = activePlayer(s);
    const pol = o.policy?.[p];
    const before = s;
    let after: GameState;
    if (s.phase === 'order') {
      const st = s.standing!;
      const rule = pol?.order ?? 'ai';
      const bid = rule === 'ai' ? planOrderBid(s, p) : rule === 'pass' ? null : rule === 'ceiling' ? st.ceiling : rule < 1 ? Math.max(1, Math.round(st.ceiling * rule)) : Math.min(st.ceiling, Math.max(1, rule));
      after = bidOrder(s, p, bid);
      if (this.curOrder) {
        this.curOrder.bids[p] = bid;
        if (after.phase !== 'order') {
          this.curOrder.holder = after.standing?.holder ?? null;
          this.curOrder.price = after.standing?.price ?? null;
          if (this.curOrder.holder !== null) this.curOrder.holderCashAtBid = s.players[this.curOrder.holder].cash;
          this.curOrder = null;
        }
      }
    } else if (s.phase === 'buy') {
      const pl = s.players[p];
      if (pl.boughtToday === 0 && this.cur.bought[p] === 0) {
        // Could this stall pay for anything at the market right now?
        let ok = false;
        const off = pl.trait === 'bargain' ? 1 : 0;
        for (const f of FRUITS) for (let pos = 0; pos < s.market[f].length; pos++) if (s.market[f][pos] > 0 && Math.max(1, marketCost(s, f, pos) - off) <= pl.cash) ok = true;
        this.cur.canAfford[p] = ok;
      }
      const si = (pol?.scout || o.scoutAll) ? pl.favours.indexOf('scout') : -1;
      const target = si >= 0 && !canPlayFavour(s, p, si) ? s.queue.find((q) => !q.seenBy?.includes(p)) : undefined;
      if (target) after = playFavour(s, p, si, { customer: target.id });
      else after = aiStep(s)!;
      const ap = after.players[p];
      for (const f of FRUITS) {
        const d = count(ap.stock, f) - count(pl.stock, f);
        if (d <= 0) continue;
        if (ap.boughtToday > pl.boughtToday) {
          const paid = ap.stats.spent - pl.stats.spent;
          this.cur.boughtF[f] += d; this.cur.costF[f] += paid; this.cur.bought[p] += d; this.cur.spentFruit[p] += paid;
        } else this.cur.freeF[f] += d;
      }
      this.favDiff(before, after, []);
    } else if (s.phase === 'evening') {
      const rule = pol?.upgrades ?? 'ai';
      if (rule === 'ai') after = aiStep(s)!;
      else {
        const want = rule === 'none' ? [] : rule;
        const built = !pol?.upgradesAll && want.some((u) => s.players[p].upgrades.includes(u));
        const u = built ? undefined : want.find((x) => !canUpgrade(s, p, x));
        if (u) after = buyUpgrade(s, p, u);
        else {
          const next = aiStep(s)!;
          after = next.players[p].upgrades.length > s.players[p].upgrades.length ? endEvening(s, p) : next;
        }
      }
      const ap = after.players[p];
      for (const u of ap.upgrades) if (!s.players[p].upgrades.includes(u)) { this.cur.upg.push([p, u]); this.cur.upgSpend[p] += ap.stats.spent - s.players[p].stats.spent; }
      if (after.day === before.day) this.favDiff(before, after, []);
      else this.night(before, after);
    } else {
      after = aiStep(s)!;
      if (after.phase === 'reveal') this.sales(before, after);
      else this.favDiff(before, after, []);
    }
    this.s = after;
  }

  private finish(s: GameState) {
    const L = this.log;
    L.cash = s.players.map((p) => p.cash);
    L.rank = ranking(s);
    L.sold = s.players.map((p) => p.stats.sold);
    L.upgrades = s.players.map((p) => [...p.upgrades]);
    L.favLeft = s.players.map((p) => [...p.favours]);
    L.net = s.players.map((p) => p.netGot ?? 0);
    for (const p of s.players) for (const f of FRUITS) {
      const ripe = p.stock[f].slice(0, FRUIT[f].ripe.length).reduce((a, b) => a + b, 0);
      L.jamF[f] += s.jam ? ripe : 0;
      L.greenLeftF[f] += count(p.stock, f) - ripe;
    }
  }

  runUntil(stop: (s: GameState) => boolean = () => false, maxSteps = 40000) {
    for (let i = 0; i < maxSteps && !this.over && !stop(this.s); i++) this.step();
    return this;
  }
}

export function playGame(o: Opts): GameLog {
  return new Run(o).runUntil().log;
}

// ---------- small statistics helpers ----------
export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const sd = (xs: number[]) => { const m = avg(xs); return xs.length > 1 ? Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1)) : 0; };
export const se = (xs: number[]) => (xs.length ? sd(xs) / Math.sqrt(xs.length) : 0);
/** Standard error of a share p out of n, in percentage points. */
export const sePct = (p: number, n: number) => (n ? 100 * Math.sqrt((p * (1 - p)) / n) : 0);
export const r1 = (x: number) => Math.round(x * 10) / 10;
export const r2 = (x: number) => Math.round(x * 100) / 100;
export const median = (xs: number[]) => { const y = [...xs].sort((a, b) => a - b); return y.length ? y[Math.floor(y.length / 2)] : 0; };
export function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
}
