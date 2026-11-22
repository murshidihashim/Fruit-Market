// PLAN-118: scripted players for the Market League's stages, shared by the balance run (scripts/league-balance.ts)
// and the tests (tests/league-pilot.test.ts). A scripted player decides some things for itself (what to buy, its
// prices, its bid for a standing order) and leaves the rest to the Normal computer; every move is a real game action.
// Each stage the pilot adds has a naive player (what a player who ignores the stage's lesson does) and one who plays
// the lesson: on the stage's fixed seed the second clears it and the first does not.
import { aiActFor, openStage, planPrices } from '../src/engine/ai';
import { FRUIT, FRUITS, type FruitId } from '../src/engine/data';
import {
  activePlayer, beginBuying, bidOrder, buy, canBuy, capAt, endBuyTurn, eveningOpen, finishReveal, newGame, rowCustomers, submitPrices,
  type GameState,
} from '../src/engine/game';
import { leagueConfig } from '../src/ui/progress';

/** A stage game, brought to where the stage opens. */
export const start = (stage: number, seed?: number): GameState => openStage(newGame(leagueConfig(stage, 'You', '', seed)));

// ---------- scripted players ----------

/** What a scripted player decides for itself; anything it leaves out is played as a Normal computer would. */
export interface Script {
  /** The next piece to buy (null: done buying), or undefined to buy as the computer would. */
  buy?: (s: GameState) => { f: FruitId; pos: number } | null | undefined;
  /** Its price for a fruit, given the computer's own choice. */
  price?: (s: GameState, f: FruitId, ai: number) => number;
  /** Its bid for the standing order (null: pass), or undefined to bid as the computer would. */
  bid?: (s: GameState) => number | null | undefined;
}

export function run(state: GameState, sc: Script): GameState {
  let s = state;
  for (let i = 0; i < 5000 && s.phase !== 'over'; i++) {
    if (s.phase === 'morning') { s = beginBuying(s); continue; }
    if (s.phase === 'reveal') { s = finishReveal(s); continue; }
    const p = s.phase === 'evening' ? s.order.find((q) => eveningOpen(s, q)) ?? -1 : activePlayer(s);
    if (p < 0) throw new Error(`stuck in ${s.phase}`);
    if (p === 0 && s.phase === 'buy' && sc.buy) {
      const pick = sc.buy(s);
      if (pick === null) { s = endBuyTurn(s, 0); continue; }
      if (pick && !canBuy(s, 0, pick.f, pick.pos)) { s = buy(s, 0, pick.f, pick.pos); continue; }
    }
    if (p === 0 && s.phase === 'bid' && sc.price) {
      const posts = planPrices(s, 0).posts.map((x) => ({ fruit: x.fruit, price: Math.max(1, sc.price!(s, x.fruit, x.price)) }));
      s = submitPrices(s, 0, posts);
      continue;
    }
    if (p === 0 && s.phase === 'order' && sc.bid) {
      const b = sc.bid(s);
      if (b !== undefined) { s = bidOrder(s, 0, b); continue; }
    }
    const next = aiActFor(s, p);
    if (!next) throw new Error(`no move in ${s.phase}`);
    s = next;
  }
  return s;
}

/** The freshest ripe piece of a fruit at the market this stall can buy, or null. */
function freshest(s: GameState, f: FruitId): { f: FruitId; pos: number } | null {
  for (let pos = FRUIT[f].ripe.length - 1; pos >= 0; pos--) if (!canBuy(s, 0, f, pos)) return { f, pos };
  return null;
}
/** The newest green piece of a fruit at the market this stall can buy, or null. */
function greenest(s: GameState, f: FruitId): { f: FruitId; pos: number } | null {
  for (let pos = s.market[f].length - 1; pos >= FRUIT[f].ripe.length; pos--) if (!canBuy(s, 0, f, pos)) return { f, pos };
  return null;
}
/** Pieces of each fruit today's row wants, and its best top price. */
function wanted(s: GameState): Record<FruitId, { qty: number; max: number }> {
  const out = Object.fromEntries(FRUITS.map((f) => [f, { qty: 0, max: 0 }])) as Record<FruitId, { qty: number; max: number }>;
  for (const c of [...rowCustomers(s), ...(s.forecast ? [s.forecast] : []), ...s.queue]) for (const w of c.wants) { out[w.fruit].qty += w.qty; out[w.fruit].max = Math.max(out[w.fruit].max, w.max); }
  return out;
}
/** Buys the most-wanted fruit today, up to what is wanted: a player who looks at the row and nothing else. */
const buyWanted = (fruits?: FruitId[]) => (s: GameState) => {
  const w = wanted(s);
  const mine = s.players[0].boughtFruit ?? {};
  const order = FRUITS.filter((f) => !fruits || fruits.includes(f)).filter((f) => w[f].qty > (mine[f] ?? []).reduce((a, x) => a + x, 0)).sort((a, b) => w[b].qty - w[a].qty);
  for (const f of order) { const pick = freshest(s, f); if (pick) return pick; }
  return null;
};
/** A price at the best top price the row shows for the fruit (Fresh). */
const topPrice = (s: GameState, f: FruitId) => Math.max(1, ...rowCustomers(s).flatMap((c) => c.wants.filter((w) => w.fruit === f).map((w) => w.max)));
/** The most a bargain customer pays for a Soft piece of the fruit today. */
const softCap = (s: GameState, f: FruitId) => Math.max(1, ...rowCustomers(s).filter((c) => c.pref === 'bargain').flatMap((c) => c.wants.filter((w) => w.fruit === f).map((w) => capAt(f, 0, w.max))));

/** Each stage's naive and lesson players, by stage number (the ones the pilot adds). */
export const SCRIPTS: Record<number, { naive: [string, Script]; lesson: [string, Script] }> = {
  6: {
    naive: ['buys the watermelon Rosa left first, then what the row wants, at the top price', { buy: (s) => freshest(s, 'watermelon') ?? buyWanted()(s), price: (s, f) => topPrice(s, f) }],
    lesson: ['leaves Rosa the watermelons: buys apples, prices them at the top', { buy: buyWanted(['apple', 'blueberry']), price: (s, f) => topPrice(s, f) }],
  },
  7: {
    naive: ['asks the top price for everything', { buy: buyWanted(), price: (s, f) => topPrice(s, f) }],
    lesson: ['prices the Soft blueberries for the bargain buyer and buys no blueberries on day 1', { buy: (s) => buyWanted(s.day === 1 ? ['watermelon', 'apple'] : undefined)(s), price: (s, f, ai) => (s.day === 1 && f === 'blueberry' ? softCap(s, f) : ai) }],
  },
  8: {
    naive: ['buys for today\'s row on day 1, and the green mangoes on day 2', { buy: (s) => (s.day === 2 ? greenest(s, 'mango') ?? null : buyWanted(['blueberry', 'watermelon', 'apple'])(s)) }],
    lesson: ['buys 2 watermelons for day 1 and 2 green mangoes for day 3; fruit for the row on day 2', { buy: (s) => {
      if (s.day !== 1) return buyWanted(['blueberry', 'watermelon', 'apple'])(s);
      const got = (f: FruitId) => (s.players[0].boughtFruit?.[f] ?? []).reduce((a, x) => a + x, 0);
      return got('watermelon') < 2 ? freshest(s, 'watermelon') ?? greenest(s, 'mango') : got('mango') < 2 ? greenest(s, 'mango') : null;
    } }],
  },
  9: {
    naive: ['bids $5 to be sure to win', { bid: () => 5 }],
    lesson: ['bids $7, a dollar under the rivals\' usual bid', { bid: () => 7 }],
  },
  10: {
    naive: ['buys fresh fruit for the row and keeps its old stock for later', { buy: buyWanted(), price: (s, f) => topPrice(s, f) }],
    lesson: ['sells the old stock first at what it can fetch', {}],
  },
  11: {
    naive: ['passes on the picnic order', { bid: () => null }],
    lesson: ['plays the whole market as a careful computer would', {}],
  },
  12: {
    naive: ['buys apples, as in Read the Rival', { buy: buyWanted(['apple', 'blueberry']), price: (s, f) => topPrice(s, f) }],
    lesson: ['takes the watermelons Rosa left', { buy: buyWanted(['watermelon', 'blueberry']) }],
  },
  13: {
    naive: ['bids $4 to beat Pak Din', { bid: () => 4 }],
    lesson: ['lets Pak Din have the order', { bid: () => null }],
  },
};

