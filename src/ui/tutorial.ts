// The first-game coach: one short tip per new situation, shown once, never blocking the board. PLAN-113 adds the guided
// first sale (when it shows and what it sets up are decided here; FirstTime.tsx draws it).
import { aiActFor, planPrices } from '../engine/ai';
import { FAVOURS, FRUIT, PREF_INFO, acceptsStage, prefOf, stageAt, type FruitId, type Pref } from '../engine/data';
import {
  activePlayer, applyAction, canBuy, canPlayFavour, canUpgrade, capFor, effectiveMax, forSale, maxPrice, minPrice, rowCustomers,
  type Customer, type GameState, type Post,
} from '../engine/game';

const KEY = 'fm.tutorial';

export interface Tip { id: string; title: string; text: string }

// The wording follows the glossary (DEC-087) and rules 20. There is no tip for picking a perk: the picker's own card
// says the same sentence (ids already kept on a phone, 'trait' among them, are harmless).
export const TIPS: Tip[] = [
  { id: 'morning', title: 'Morning', text: 'Each morning starts with today’s news and the lorry. Today’s customers are at the top. Tap Start buying.' },
  { id: 'buy', title: 'Your turn to buy', text: 'Tap a fruit to buy, freshest at the top. Buy what the customers want. Fresher costs more, but customers pay more for it.' },
  { id: 'bought', title: 'On your shelf', text: 'It\'s on your shelf. Tap Done buying when you\'re finished.' },
  { id: 'stall', title: 'Fill your crate', text: 'Tap + beside a row to put that piece in your crate. Only pieces in your crate can sell today. Rivals see how many, not which fruit.' },
  { id: 'bid', title: 'Secret prices', text: 'Set a price for each fruit with − and +. You see how many pieces each rival has in their crate, not which fruit. Prices and crates open at the bell. The cheapest stall sells first.' },
  { id: 'reveal', title: 'The rush', text: 'Each customer bought from the cheapest stall with fruit fresh enough for their price. Ties go to Favoured Trade, then fresher fruit, then the Haggler, then whoever bought earlier today.' },
  // The words for a stall that is not known; tipFor says what this evening offers the stall deciding (eveningTip).
  { id: 'evening', title: 'Evening', text: 'If you can, play a favour card or build an upgrade. Then tap Lights out, and night falls.' },
  { id: 'day2', title: 'From Day 2', text: 'From now on the poorest stall buys first, then the others clockwise. Most cash after the last day wins.' },
];

function load(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]; } catch { return []; }
}

export function markSeen(id: string) {
  try { localStorage.setItem(KEY, JSON.stringify([...new Set([...load(), id])])); } catch { /* ignore */ }
}

/** Turn the coach off for good: every later tip stays hidden until the tutorial is replayed from Settings. */
export function skipTutorial() {
  // ('day2' is what a phone from before PLAN-113 keeps for this; 'off' also ends the tips after a guided first sale.)
  markSeen('day2');
  markSeen('off');
}

export function resetTutorial() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/**
 * The evening tip for stall `p` (REP-122 C-14, S16): only what this evening really offers it, and what tonight does to
 * fruit. Since rules 19 a stall gets an evening only when it has something to decide, so the first one may be for an
 * upgrade alone, or a favour card alone; a Heatwave night ages fruit 2 steps and a Monsoon Downpour night not at all
 * (game.ts shelfSteps).
 */
export function eveningTip(s: GameState, p: number): string {
  const pl = s.players[p];
  if (!pl) return TIPS.find((t) => t.id === 'evening')!.text;
  const favour = pl.favours.some((id, i) => FAVOURS[id].when === 'evening' && canPlayFavour(s, p, i) === null);
  const upgrade = (pl.upgradeOffer ?? []).some((u) => canUpgrade(s, p, u) === null);
  const what = favour && upgrade ? 'Play a favour card or build an upgrade now, or both.'
    : favour ? 'You can play a favour card now, or keep it.'
    : upgrade ? 'After a Market Day you can build 1 upgrade now.'
    : pl.trait === 'keeper' ? 'Name the fruit your Shade Cloth keeps from ageing tonight.'
    : 'Make your choices for tonight.';
  const steps = Math.max(0, 1 + (s.event?.ageExtra ?? 0));
  const night = steps === 0 ? 'No fruit ages tonight.' : steps === 1 ? 'Tonight all fruit ages one step.' : `Tonight all fruit ages ${steps} steps.`;
  return `${what} Then tap Lights out. ${night}`;
}

/** The tip for this moment, if the player hasn't seen it yet. */
export function tipFor(s: GameState, ctx: { myBuyTurn: boolean; boughtToday: number; pricing: boolean; picker: boolean; evening: boolean }): Tip | null {
  const seen = load();
  if (seen.includes('off')) return null;
  // After a guided first sale (PLAN-113) the tips for the steps it did on Day 1 (buying, the shelf, the crate, prices)
  // are still to come, each at its moment from Day 2 on; otherwise the Day 2 tip is the last one.
  if (seen.includes('day2') && !seen.includes(FIRST_SALE_DONE)) return null;
  const pick = (id: string) => (seen.includes(id) ? null : TIPS.find((t) => t.id === id)!);
  if (ctx.picker) return null;
  if (s.phase === 'morning' && s.day === 1) return pick('morning');
  if (s.phase === 'buy' && ctx.myBuyTurn) return ctx.boughtToday > 0 ? pick('bought') : pick('buy');
  if (ctx.pricing) return s.phase === 'stall' ? pick('stall') : pick('bid');
  if (s.phase === 'reveal' && s.day === 1) return pick('reveal');
  if (ctx.evening) {
    // The coach is offline only, where the evening's active stall is the person deciding now (Game.tsx).
    const tip = pick('evening');
    return tip && { ...tip, text: eveningTip(s, activePlayer(s)) };
  }
  if (s.day >= 2 && s.phase === 'morning') return pick('day2');
  return null;
}

// ---------- PLAN-113: the guided first sale ----------
// A first-time player's first solo game opens with one decision on Day 1: their price for one customer, on the day's
// real table, then the bell. Until then the game sets up their stall as a computer stall would: the morning's Start
// buying, then the computer's own buying and stocking choices for that seat (aiActFor, the same moves the room server
// makes for a person who has left), each shown on the table as a rival's turn is. The rest of the game plays as normal.

/** Marks kept with the tips (fm.tutorial): the guided first sale was played to the bell, or skipped. Either way it does
 *  not show again on this phone. */
export const FIRST_SALE_DONE = 'firstsale';
export const FIRST_SALE_SKIPPED = 'firstsale-skip';

/** Has this phone had the guided first sale (played or skipped)? */
export function firstSaleSeen(): boolean {
  const seen = load();
  return seen.includes(FIRST_SALE_DONE) || seen.includes(FIRST_SALE_SKIPPED);
}

/** The guided first sale is over: played to the bell (`skipped` false), or skipped. */
export function endFirstSale(skipped: boolean) {
  markSeen(skipped ? FIRST_SALE_SKIPPED : FIRST_SALE_DONE);
}

/**
 * Is this a game for the guided first sale? A solo game (one person, the rest computers) on this phone: not online, and
 * not the Daily market (its moves are replayed for the leaderboard, so the person plays it alone), still on Day 1
 * before the bell. `firstTime`: the player has never finished a game and has not had the guided first sale.
 */
export function firstSaleGame(s: GameState, online: boolean, firstTime: boolean): boolean {
  if (online || !firstTime || s.config.daily) return false;
  if (s.players.filter((p) => p.kind === 'human').length !== 1) return false;
  return s.day === 1 && (s.phase === 'morning' || s.phase === 'buy' || s.phase === 'stall' || s.phase === 'bid');
}

/** The person's seat in a solo game. */
export const soloSeat = (s: GameState) => s.players.findIndex((p) => p.kind === 'human');

/** The guide is setting up the person's stall: Day 1, from the morning until their crate is open. */
export function guideSetsUp(s: GameState, me: number): boolean {
  if (s.day !== 1 || me < 0) return false;
  return s.phase === 'morning' || s.phase === 'buy' || (s.phase === 'stall' && s.stalls[me] === null);
}

/**
 * The guide's next move for the person's stall, or null when there is none to make now. The morning: Start buying (the
 * game gives a stall that has not picked a perk the first one it was offered, as it always does then). Buying: the
 * whole turn as one beat, as a rival's turn is shown, with the computer's choices for that seat. Stocking: the
 * computer's crate.
 */
export function guidedStep(s: GameState, me: number): GameState | null {
  if (!guideSetsUp(s, me)) return null;
  if (s.phase === 'morning') return applyAction(s, me, { kind: 'begin' });
  if (activePlayer(s) !== me) return null;
  let next = aiActFor(s, me);
  while (next && s.phase === 'buy' && next.phase === 'buy' && next.day === s.day && next.turn === s.turn) {
    const more = aiActFor(next, me);
    if (!more || more.phase !== 'buy' || more.day !== s.day) break;
    next = more;
  }
  // A computer stall sometimes buys nothing on a quiet first day (a small table, prices close to the customers'). The
  // guided sale needs fruit to price, so then the stall buys for today's expected customer instead (see expectedBuy).
  if (s.phase === 'buy' && s.players[me].boughtToday === 0 && next && next.players[me].boughtToday === 0) return expectedBuy(s, me) ?? next;
  return next;
}

/** Pieces bought for a face-down walk-in, whose numbers are hidden (only the fruit on the back of the card shows). */
const WALK_IN_PIECES = 2;

/**
 * Buying for today's customers when the computer's own choice was nothing: the fruit of the expected customer (face up
 * since the morning), up to the number they want and only a freshness they take, or else a fruit on the back of a
 * face-down walk-in (WALK_IN_PIECES, Fresh: every customer takes Fresh). Freshest first; one fruit; plain buy moves,
 * and the turn then goes on as a computer stall's would. Uses only what the person can see. Null when none can be bought.
 */
export function expectedBuy(s: GameState, me: number): GameState | null {
  if (s.phase !== 'buy' || activePlayer(s) !== me) return null;
  const wants: { fruit: FruitId; qty: number; pref: Pref }[] = [
    ...(s.forecast ? s.forecast.wants.map((w) => ({ fruit: w.fruit, qty: w.qty, pref: s.forecast!.pref ?? prefOf(s.forecast!.name) })) : []),
    ...s.queue.flatMap((c) => c.wants.map((w) => ({ fruit: w.fruit, qty: WALK_IN_PIECES, pref: 'premium' as Pref }))),
  ];
  for (const w of wants) {
    let cur = s;
    for (let k = 0; k < w.qty; k++) {
      let pos = FRUIT[w.fruit].ripe.length - 1;
      while (pos >= 0 && (!acceptsStage(w.pref, stageAt(w.fruit, pos)) || canBuy(cur, me, w.fruit, pos))) pos--;
      if (pos < 0) break;
      cur = applyAction(cur, me, { kind: 'buy', fruit: w.fruit, pos });
    }
    if (cur !== s) return cur;
  }
  return null;
}

/** The one decision: the customer in the spotlight, the fruit of theirs that is in the person's crate, and what the
 *  table says about it. */
export interface Spotlight {
  customer: Customer;
  fruit: FruitId;
  /** How many pieces of it they want. */
  qty: number;
  /** Their top price today (for a Fresh piece). */
  top: number;
  /** The most they pay for the person's own pieces (less for Okay and Soft). */
  cap: number;
  /** The freshness they take, in the board's words ("Fresh, Okay or Soft"). */
  takes: string;
  /** Rival stalls with something in their crate. */
  rivals: number;
  /** The person's other fruit in the crate, priced as a computer stall would price them. */
  others: Post[];
  /** What the person paid at the market today, and for how many pieces. */
  spent: number;
  bought: number;
  /** The lowest and highest price allowed. */
  lo: number;
  hi: number;
}

/**
 * The decision for the person's pricing turn, from their own view of the table (publicView: a rival's crate is only a
 * number of pieces): the first customer in the row, in the order they are served, who wants a fruit in the person's
 * crate and would pay something for the pieces in it. Null when there is none: the game then goes on as normal.
 */
export function spotlight(view: GameState, me: number): Spotlight | null {
  if (view.phase !== 'bid' || view.day !== 1 || view.bids[me] !== null) return null;
  const pl = view.players[me];
  const crate = view.crates?.[me];
  if (!pl || !crate) return null;
  for (const c of rowCustomers(view)) {
    for (const w of c.wants) {
      if (w.qty <= 0 || forSale(view, me, w.fruit) <= 0) continue;
      const top = effectiveMax(view, w, c.generous);
      const pref = c.pref ?? prefOf(c.name);
      const caps = (crate[w.fruit] ?? []).flatMap((n, pos) => (n > 0 && acceptsStage(pref, stageAt(w.fruit, pos)) ? [capFor(pl, w.fruit, pos, top, w.fixed)] : []));
      const cap = Math.max(0, ...caps);
      if (cap <= 0) continue;
      const planned = planPrices(view, me, false).posts;
      return {
        customer: c, fruit: w.fruit, qty: w.qty, top, cap, takes: PREF_INFO[pref].short,
        rivals: view.players.filter((_, i) => i !== me && (view.out?.[i] ?? 0) > 0).length,
        others: planned.filter((b) => b.fruit !== w.fruit && forSale(view, me, b.fruit) > 0),
        spent: pl.spentToday, bought: pl.boughtToday,
        lo: minPrice(view, w.fruit), hi: Math.min(30, maxPrice(view, w.fruit)),
      };
    }
  }
  return null;
}

/** The price the stepper starts at: the most this customer pays for the person's pieces, within the allowed range. */
export const startPrice = (sp: Spotlight) => Math.max(sp.lo, Math.min(sp.hi, sp.cap));

/** The prices the bell seals: the person's own price for the fruit in the spotlight, and the others as planned. */
export function firstSalePosts(sp: Spotlight, price: number): Post[] {
  return [{ fruit: sp.fruit, price }, ...sp.others];
}

/** What the guide is doing now, for the strip in place of the action bar (null: nothing to say). */
export function guideLine(s: GameState, me: number): string | null {
  if (!guideSetsUp(s, me)) return null;
  if (s.phase === 'morning') return 'Today your stall buys and fills its crate for you. Then you set one price.';
  if (s.phase === 'buy') return activePlayer(s) === me ? 'Buying fruit for your stall.' : 'The stalls buy in turn. Yours buys for you today.';
  return 'Filling your crate for you.';
}

/** "2 watermelons", "1 mango". */
export const piecesWord = (n: number, f: FruitId) => `${n} ${(n === 1 ? FRUIT[f].name : FRUIT[f].plural).toLowerCase()}`;
