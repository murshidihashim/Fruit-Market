// Pure helpers for the table: how the market board and the stall chips are laid out.
// Kept free of Preact so they can be unit-tested against the engine's rules.
import {
  FARMER_CARDS, FRUIT, FRUITS, ORDER_BOOK_BONUS, ORDER_CARDS, PREF_INFO, acceptsStage, deliveredGreen, lookOf, slotLife, stageAt,
  type EventCard, type FarmerCard, type FruitId, type Stage, type Want,
} from '../engine/data';
import {
  bestCap, count, effectiveMax, eventSupply, isMarketDay, nightOutlook, orderDueToday, printedSupply, rowCustomers, rowStock, walkInsToday,
  type Customer, type GameState, type Standing, type Stock,
} from '../engine/game';

export interface Slot { pos: number; stage: Stage; n: number }

/** One market column, newest slot first (top) down to the not-so-fresh slot (bottom). */
export function marketColumn(s: GameState, f: FruitId): Slot[] {
  return s.market[f].map((n, pos) => ({ pos, stage: stageAt(f, pos), n })).reverse();
}

/**
 * The market column as the board should draw it: without the green slots of a fruit no lorry delivers green (since
 * rules 9 that is the watermelon, whose empty green slot otherwise shows a $1 price that can never be bought). The
 * slots stay in the engine (saves and online play keep their shape); a green cell that somehow holds fruit still shows.
 */
export function shownColumn(s: GameState, f: FruitId): Slot[] {
  return marketColumn(s, f).filter((c) => c.stage !== 'unripe' || deliveredGreen(f) || c.n > 0);
}

/** How long a fruit in this slot still has, in the words shown on its chip. */
export function lifeLabel(f: FruitId, pos: number): string {
  return slotLife(f, pos);
}

/** Fruit in the order of the table board's lanes: shortest life first (blueberry 3 days ... apple 6). Drawing order
 *  only: the engine's own order (FRUITS) is untouched. */
export const LANES: FruitId[] = ['blueberry', 'watermelon', 'mango', 'apple'];

/** A shop's stock as chips: one per filled slot, grouped by fruit, freshest first. */
export function stockChips(stock: Record<FruitId, number[]>): { f: FruitId; chips: Slot[] }[] {
  return FRUITS.map((f) => ({
    f,
    chips: stock[f].map((n, pos) => ({ pos, stage: stageAt(f, pos), n })).filter((c) => c.n > 0).reverse(),
  }));
}

// ---------- demand vs supply ----------

export interface Pulse { f: FruitId; demand: number; more: boolean; supply: number }
export type Mood = 'none' | 'open' | 'good' | 'war';

/**
 * Fruit customers want today vs ripe fruit sitting in all shops. `more`: a walk-in still face down may want more of
 * it. S7 (PLAN-110): read from the walk-ins' card backs, which are public and show the fruits each one wants, so a
 * fruit on no back (mangoes on Days 1 and 2) reads "0" and not "?".
 */
export function pulse(s: GameState): Pulse[] {
  const before = s.phase === 'morning' || s.phase === 'buy';
  const custs: Customer[] = [...s.secondMarket, ...s.firstMarket];
  if (before && s.forecast) custs.push(s.forecast);
  const extra = before ? s.event?.extra?.wants ?? [] : [];
  const backs = before && walkInsToday(s) > 0 ? s.queue : [];
  return FRUITS.map((f) => {
    let demand = 0;
    for (const c of custs) for (const w of c.wants) if (w.fruit === f) demand += Math.max(0, w.qty);
    for (const w of extra) if (w.fruit === f) demand += w.qty;
    const supply = s.players.reduce((a, p) => a + count(p.stock, f, true), 0);
    return { f, demand, more: backs.some((c) => c.wants.some((w) => w.fruit === f)), supply };
  });
}

/** none: nobody wants it; open: wanted and nobody has it; good: enough orders; war: more stock than orders. */
export function mood({ demand, supply }: Pulse): Mood {
  return demand === 0 ? 'none' : supply === 0 ? 'open' : supply <= demand ? 'good' : 'war';
}

/**
 * The demand legend's words for each colour. The bar counts every order for the fruit, whoever's fruit they would take,
 * so it speaks of orders, not buyers.
 */
export const MOOD_WORDS: Record<Exclude<Mood, 'none'>, string> = {
  good: 'enough orders: prices stay high', war: 'more fruit than orders: price war', open: 'nobody has any yet',
};

export function wantText({ demand, more }: Pulse): string {
  return demand ? `${demand}${more ? '+' : ''}` : more ? '?' : '0';
}

/** Tomorrow's farmer delivery: the amounts printed on the card (more than one per shop is shown in bold). */
export interface LorryLine { f: FruitId; plenty: boolean; green: boolean; n: number }
export function nextLorry(s: GameState): LorryLine[] | null {
  const card = s.nextFarmer;
  if (!card) return null;
  return LANES.map((f) => {
    const n = printedSupply(card, f, s.players.length);
    return { f, plenty: n > s.players.length, green: !!s.config.unripe && card.unripe === f, n };
  });
}

/** The name printed on tomorrow's lorry card. */
export function nextLorryName(s: GameState): string | null {
  return s.nextFarmer?.name ?? null;
}

/** What a lorry card unloads at a table of `stalls` stalls on a day with this event: the card's printed row, changed
 *  as the morning changes it (the same sums as the engine's morning, game.ts). */
export function lorryLoad(card: FarmerCard, e: EventCard | null | undefined, stalls: number): Record<FruitId, number> {
  const out = {} as Record<FruitId, number>;
  for (const f of FRUITS) {
    let n = printedSupply(card, f, stalls) + eventSupply(e, f, stalls);
    if (e?.noFruit === f) n = 0;
    if (e?.supplyMult) n = Math.ceil(n * e.supplyMult);
    out[f] = Math.max(0, n);
  }
  return out;
}

/** What today's lorry unloaded, for every fruit (0 for none). */
export function todaysLoad(s: GameState): Record<FruitId, number> {
  return Object.fromEntries(FRUITS.map((f) => [f, s.delivery?.[f] ?? 0])) as Record<FruitId, number>;
}

/**
 * Today's lorry card, for the morning's lorry card. The game keeps what was unloaded, not which card it was, so the
 * card is found from the load: the one card that unloads exactly this at this table on this event. Two cards print the
 * same row at 3 stalls and three at 5; then the cards still in the lorry deck and tomorrow's card are ruled out (only
 * while the deck has not been reshuffled, and never online, where the deck is not sent). Null when the card cannot be
 * told for certain, or no lorry came: the morning then shows today's load without a name.
 */
export function todaysLorry(s: GameState): FarmerCard | null {
  if (s.event?.noDelivery) return null;
  const stalls = s.players.length;
  const load = todaysLoad(s);
  const same = (card: FarmerCard) => {
    const x = lorryLoad(card, s.event, stalls);
    return FRUITS.every((f) => x[f] === load[f]) && (!s.config.unripe || !s.deliveryUnripe || card.unripe === s.deliveryUnripe);
  };
  let found = FARMER_CARDS.filter(same);
  if (found.length > 1) {
    // Cards drawn so far: one for each day up to today, and tomorrow's (none on the last day).
    const drawn = s.day + (s.nextFarmer ? 1 : 0);
    if (s.farmerDeck.length === FARMER_CARDS.length - drawn) {
      const left = new Set(s.farmerDeck.map((i) => FARMER_CARDS[i]?.name));
      found = found.filter((c) => !left.has(c.name) && c.name !== s.nextFarmer?.name);
    }
  }
  return found.length === 1 ? found[0] : null;
}

/** Tomorrow is a Market Day: a standing order may be turned over (the lorry still comes; since rules 14 no extra walk-in). */
export function marketDayTomorrow(s: GameState): boolean {
  return s.day < s.config.days && isMarketDay(s, s.day + 1);
}

/**
 * Fruit in a shop that really spoils tonight, by the night's own rules: none after a Monsoon, one more
 * step in a Heatwave, and up to JUICE_CAP (2) pieces become juice instead with a Juice Bar (those are not counted here).
 */
export function spoilsTonight(s: GameState, p: number): number {
  return nightOutlook(s, p).spoil;
}

/**
 * The badge on a walk-in whose front you have seen. Gossip and Scout both mark the card the same way and the card
 * does not record which one it was, so the words fit both.
 */
export const SEEN_WALK_IN = "You've seen this walk-in's card";

// ---------- the Stocking and Price panels: who would buy your fruit ----------

/** One order for a fruit: the customer, their want, and their top price for a fresh one today. */
export interface BuyerLine { c: Customer; w: Want; max: number }

/** Today's orders for this fruit, in serving order (waiting customers first), with each customer's top price. */
export function buyersFor(s: GameState, f: FruitId): BuyerLine[] {
  return rowCustomers(s).flatMap((c) => c.wants.filter((w) => w.fruit === f && w.qty > 0).map((w) => ({ c, w, max: effectiveMax(s, w, c.generous) })));
}

/** Does shop `pl` hold any piece of this fruit this customer would take (Premium: fresh only; Everyday: not soft)? */
const takesAny = (stock: Stock, f: FruitId, x: BuyerLine) =>
  stock[f].some((n, pos) => n > 0 && acceptsStage(x.c.pref, stageAt(f, pos)));

/**
 * Pieces of this fruit wanted today by customers who would buy at least one of yours at some price (your freshness
 * suits them and their top price leaves something above $0). A standing order is not a customer here (rowCustomers).
 */
export function customersWanted(s: GameState, p: number, f: FruitId): number {
  const pl = s.players[p];
  return buyersFor(s, f).filter((x) => bestCap(pl.stock, f, x.max, pl, x.c.pref, x.w.fixed) > 0).reduce((a, x) => a + x.w.qty, 0);
}

// ---------- S2 (PLAN-107): the standing order on its due day ----------

/** The standing order stall `p` holds that is collected today, or null. */
export function orderDueFor(s: GameState, p: number): Standing | null {
  const o = orderDueToday(s);
  return o && o.holder === p ? o : null;
}

/** Rules 14: does a standing order take a piece at this place on the track? Fresh or Okay only (not Soft, not Green). */
export const orderTakesPos = (f: FruitId, pos: number): boolean => pos < FRUIT[f].ripe.length && stageAt(f, pos) !== 'notso';

/** The name the order goes by on screen: "The Beach Resort". */
export const orderTitle = (o: Standing): string => ORDER_CARDS[o.card].title;

/** What the holder is paid for each piece it delivers: its bid, and $2 more with an Order Book. */
export const orderPay = (s: GameState, p: number, o: Standing): number =>
  (o.price ?? 0) + (s.players[p].upgrades.includes('orderbook') ? ORDER_BOOK_BONUS : 0);

/** Pieces of this fruit the standing order due today wants from stall `p`: all it asks for, when `p` holds it and its
 *  shelf has a piece the order takes (as a customer's want counts when it would take one of yours); otherwise 0. */
export function orderWanted(s: GameState, p: number, f: FruitId): number {
  const o = orderDueFor(s, p);
  if (!o || o.fruit !== f) return 0;
  return s.players[p].stock[f].some((n, pos) => n > 0 && orderTakesPos(f, pos)) ? o.qty : 0;
}

/**
 * Pieces of this fruit wanted today from stall `p`: by customers who would buy at least one of yours, and (S2) on its
 * due day by the standing order `p` holds. What "Auto load" fills the crate up to.
 */
export function stallWanted(s: GameState, p: number, f: FruitId): number {
  return customersWanted(s, p, f) + orderWanted(s, p, f);
}

/**
 * The Stocking panel's demand words for one fruit: "3 wanted", "Nobody takes yours" or "Nobody wants these". S2: on
 * the order's due day its holder reads "3 for The Beach Resort" first, on the rows the order takes from (`pos`; every
 * row when not given), and "Nobody …" is never said of fruit the order wants.
 */
export function stallWantText(s: GameState, p: number, f: FruitId, pos?: number): string {
  const n = customersWanted(s, p, f);
  const o = orderDueFor(s, p);
  const order = o && orderWanted(s, p, f) > 0 ? o : null;
  const parts = [
    ...(order && (pos === undefined || orderTakesPos(f, pos)) ? [`${order.qty} for ${orderTitle(order)}`] : []),
    ...(n > 0 ? [`${n} wanted`] : order ? [] : [buyersFor(s, f).length ? 'Nobody takes yours' : 'Nobody wants these']),
  ];
  return parts.join(' · ') || (buyersFor(s, f).length ? 'Nobody else takes yours' : 'Nobody else wants these');
}

/** A buyer chip on the Price panel: the most this customer pays for your freshest piece they would take. */
export interface BuyerCap { cap: number; label: string; title: string; aria: string }

/**
 * The buyer chip for one order. With fruit they would take, "≤$7" (the most they pay for your freshest such piece).
 * When your shelf has nothing their freshness type takes, the type instead of a misleading "≤$0": "fresh only" for a
 * Premium customer, "fresh or okay" for an Everyday one.
 */
export function buyerCap(s: GameState, p: number, f: FruitId, x: BuyerLine): BuyerCap {
  const pl = s.players[p];
  const who = lookOf(x.c.name).title;
  // Rules 12: once your crate is set, only its pieces can sell; before that, your whole shelf.
  const stock = rowStock(s, p);
  const cap = bestCap(stock, f, x.max, pl, x.c.pref, x.w.fixed);
  if (!takesAny(stock, f, x) && x.c.pref && x.c.pref !== 'bargain') {
    const type = PREF_INFO[x.c.pref];
    return { cap, label: type.short.toLowerCase(), title: `${who} wants ${x.w.qty} but ${type.text.toLowerCase()}`, aria: `${who}: ${type.short.toLowerCase()}` };
  }
  return { cap, label: `≤$${cap}`, title: `${who} wants ${x.w.qty}, pays up to $${cap} for your freshest`, aria: `${who} up to $${cap}` };
}
