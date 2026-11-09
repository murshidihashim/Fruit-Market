// Pure helpers for the table: how the market board and the stall chips are laid out.
// Kept free of Preact so they can be unit-tested against the engine's rules.
import { FRUIT, FRUITS, PREF_INFO, acceptsStage, deliveredGreen, lookOf, slotLife, stageAt, type FruitId, type Stage, type Want } from '../engine/data';
import {
  bestCap, capFor, count, crateStock, effectiveMax, eligible, forSale, isMarketDay, nightOutlook, printedSupply, servingCustomers, walkInsToday,
  type Customer, type GameState, type Stock,
} from '../engine/game';
import { hagglerWins } from '../engine/story';

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

/** Fruit customers want today vs ripe fruit sitting in all shops. */
export function pulse(s: GameState): Pulse[] {
  const before = s.phase === 'morning' || s.phase === 'buy';
  const custs: Customer[] = [...s.secondMarket, ...s.firstMarket];
  if (before && s.forecast) custs.push(s.forecast);
  const extra = before ? s.event?.extra?.wants ?? [] : [];
  return FRUITS.map((f) => {
    let demand = 0;
    for (const c of custs) for (const w of c.wants) if (w.fruit === f) demand += Math.max(0, w.qty);
    for (const w of extra) if (w.fruit === f) demand += w.qty;
    const supply = s.players.reduce((a, p) => a + count(p.stock, f, true), 0);
    return { f, demand, more: before && walkInsToday(s) > 0, supply };
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
  return FRUITS.map((f) => {
    const n = printedSupply(card, f, s.players.length);
    return { f, plenty: n > s.players.length, green: !!s.config.unripe && card.unripe === f, n };
  });
}

/** The name printed on tomorrow's lorry card. */
export function nextLorryName(s: GameState): string | null {
  return s.nextFarmer?.name ?? null;
}

/** Tomorrow is a Market Day: one more walk-in (the lorry still comes). */
export function marketDayTomorrow(s: GameState): boolean {
  return s.day < s.config.days && isMarketDay(s, s.day + 1);
}

/**
 * Fruit in a shop that really spoils tonight, by the night's own rules: none on a Cold Room's odd nights, one more
 * step in a Heatwave, and up to 3 pieces become juice instead with a Juice Bar (those are not counted here).
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
  return servingCustomers(s).flatMap((c) => c.wants.filter((w) => w.fruit === f && w.qty > 0).map((w) => ({ c, w, max: effectiveMax(s, w, c.generous) })));
}

/** Does shop `pl` hold any piece of this fruit this customer would take (Premium: fresh only; Everyday: not tired)? */
const takesAny = (stock: Stock, f: FruitId, x: BuyerLine) =>
  stock[f].some((n, pos) => n > 0 && acceptsStage(x.c.pref, stageAt(f, pos)));

/**
 * Pieces of this fruit wanted today by customers who would buy at least one of yours at some price (your freshness
 * suits them and their top price leaves something above $0): the Stocking panel's "N wanted".
 */
export function stallWanted(s: GameState, p: number, f: FruitId): number {
  const pl = s.players[p];
  return buyersFor(s, f).filter((x) => bestCap(pl.stock, f, x.max, pl, x.c.pref) > 0).reduce((a, x) => a + x.w.qty, 0);
}

/** The Stocking panel's demand words for one fruit: "3 wanted", "Nobody takes yours" or "Nobody wants these". */
export function stallWantText(s: GameState, p: number, f: FruitId): string {
  const n = stallWanted(s, p, f);
  if (n > 0) return `${n} wanted`;
  return buyersFor(s, f).length ? 'Nobody takes yours' : 'Nobody wants these';
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
  const stock = crateStock(s, p);
  const cap = bestCap(stock, f, x.max, pl, x.c.pref);
  if (!takesAny(stock, f, x) && x.c.pref && x.c.pref !== 'bargain') {
    const type = PREF_INFO[x.c.pref];
    return { cap, label: type.short.toLowerCase(), title: `${who} wants ${x.w.qty} but ${type.text.toLowerCase()}`, aria: `${who}: ${type.short.toLowerCase()}` };
  }
  return { cap, label: `≤$${cap}`, title: `${who} wants ${x.w.qty}, pays up to $${cap} for your freshest`, aria: `${who} up to $${cap}` };
}

// ---------- the demand board (PLAN-059): pieces wanted, and how many would still buy at each price ----------

/** One price step on the demand board: pieces wanted by customers who would pay at least this much. */
export interface DemandStep { price: number; buyers: number }
export interface DemandRow {
  f: FruitId;
  /** Pieces of this fruit wanted today (every order, whatever its freshness rule). */
  wanted: number;
  /** Pieces of this fruit out for sale today, every stall together. */
  out: number;
  /** True when the viewer has this fruit out: the steps are then for the viewer's own fruit (its freshness and perks). */
  mine: boolean;
  /** Up to three prices where the number of buyers changes, highest first. */
  steps: DemandStep[];
}

/** The most a buyer pays for this fruit: for the viewer's own pieces when it has some out, otherwise for fresh fruit. */
function payFor(s: GameState, p: number, f: FruitId, x: BuyerLine): number {
  return forSale(s, p, f) > 0 ? buyerCap(s, p, f, x).cap : x.max;
}

/** Pieces wanted by customers who would pay at least `price` for this fruit (for the viewer's own fruit when it has some out). */
export function buyersAt(s: GameState, p: number, f: FruitId, price: number): number {
  return buyersFor(s, f).filter((x) => payFor(s, p, f, x) >= price).reduce((a, x) => a + x.w.qty, 0);
}

/** One row per fruit that someone wants or someone has out, in fruit order. Public facts and the viewer's own shelf only. */
export function demandBoard(s: GameState, p: number): DemandRow[] {
  return FRUITS.flatMap((f) => {
    const lines = buyersFor(s, f);
    const wanted = lines.reduce((a, x) => a + x.w.qty, 0);
    const out = s.players.reduce((a, _pl, i) => a + forSale(s, i, f), 0);
    if (!wanted && !out) return [];
    const caps = [...new Set(lines.map((x) => payFor(s, p, f, x)).filter((c) => c > 0))].sort((a, b) => b - a);
    // Where the count changes; with more than three, the two highest and the lowest (where every buyer is in).
    const picks = caps.length > 3 ? [caps[0], caps[1], caps[caps.length - 1]] : caps;
    return [{ f, wanted, out, mine: forSale(s, p, f) > 0, steps: picks.map((price) => ({ price, buyers: buyersAt(s, p, f, price) })) }];
  });
}

/** The Price panel's whisper for one fruit at the price you are about to post. */
export interface PriceRead {
  cls: 'war' | 'safe' | 'ok';
  text: string;
  /** The same read in fewer words, for a phone's narrow price card (the price shows next to it). */
  short: string;
  /** The most of your pieces out that today's buyers would take at this price, even if you were the cheapest stall. */
  canSell: number;
  /** Pieces wanted by customers who would take at least one of yours at this price. */
  servable: number;
  /** Pieces wanted by customers who would take any ripe piece on your shelf at this price (your oldest one suits them). */
  firm: number;
}

/**
 * How many of shop `p`'s pieces out today's buyers of this fruit would take at `price` if no rival sold any, walking
 * the buyers in serving order over a copy of the shelf the way the engine sells (eligible: the customer's freshness
 * type, their top price for each piece's freshness, the crate).
 */
function sellable(s: GameState, p: number, f: FruitId, price: number, lines: BuyerLine[]): number {
  const pl = s.players[p];
  const own = crateStock(s, p);
  const shelf = { ...own, [f]: [...own[f]] };
  let left = forSale(s, p, f);
  let mine = 0;
  for (const x of lines) {
    if (left <= 0) break;
    const used = eligible(pl, shelf, f, Math.min(left, x.w.qty), price, x.max, x.c.pref);
    for (const k of used) shelf[f][k]--;
    left -= used.length;
    mine += used.length;
  }
  return mine;
}

/**
 * Pieces wanted by customers who would take every ripe piece on shop `p`'s shelf at `price`: its oldest ripe piece
 * suits them (a fresher piece has a top price at least as high, and a freshness type that takes an older piece takes a
 * fresher one). However the rivals price and sell, every such order a rival leaves open takes one of yours.
 */
function firmOrders(s: GameState, p: number, f: FruitId, price: number, lines: BuyerLine[]): number {
  const pl = s.players[p];
  const oldest = crateStock(s, p)[f].findIndex((n, pos) => n > 0 && pos < FRUIT[f].ripe.length);
  if (oldest < 0) return 0;
  return lines.filter((x) => capFor(pl, f, oldest, x.max) >= price && acceptsStage(x.c.pref, stageAt(f, oldest))).reduce((a, x) => a + x.w.qty, 0);
}

/**
 * The Price panel's "Psst…" read for the price you are about to post. It never counts buyers your fruit cannot serve.
 * When even as the cheapest stall some of your pieces would not sell, it names the real limit: "(freshness or price)"
 * when orders are left that will not take them, "Only 2 wanted" when there are simply fewer orders than pieces.
 * "Enough buyers for everyone" only when the pieces out at every stall fit inside the orders that would take any piece
 * of yours at this price, so all of yours sell whatever the rivals charge.
 */
export function priceRead(s: GameState, p: number, f: FruitId, price: number): PriceRead {
  const pl = s.players[p];
  const out = forSale(s, p, f);
  const lines = buyersFor(s, f);
  const canSell = sellable(s, p, f, price, lines);
  const servable = lines.filter((x) => price <= bestCap(crateStock(s, p), f, x.max, pl, x.c.pref)).reduce((a, x) => a + x.w.qty, 0);
  const firm = firmOrders(s, p, f, price, lines);
  const wanted = lines.reduce((a, x) => a + x.w.qty, 0);
  const rivals = s.players.reduce((a, _o, i) => (i === p ? a : a + forSale(s, i, f)), 0);
  const pieces = (n: number) => `${n} rival ${n === 1 ? 'piece' : 'pieces'}`;
  const read = (cls: PriceRead['cls'], text: string, short = text): PriceRead => ({ cls, text, short, canSell, servable, firm });
  if (!lines.length) return read('war', 'Nobody here wants these today', 'Nobody wants these today');
  if (canSell === 0) return read('war', `Nobody takes yours at $${price}`);
  if (canSell < Math.min(out, wanted)) {
    return read('war', `Only ${canSell} of your ${out} would sell at $${price} (freshness or price)`, `Only ${canSell} of ${out} would sell (freshness or price)`);
  }
  if (canSell < out) {
    // Every order would take one of yours: there are just fewer orders than pieces.
    return rivals === 0
      ? read('safe', `No rival has any out: only ${wanted} wanted`, `No rivals out: only ${wanted} wanted`)
      : read('war', `Only ${wanted} wanted for your ${out} and ${pieces(rivals)}`, `Only ${wanted} wanted for ${out + rivals} out`);
  }
  if (rivals === 0) return read('safe', `No rival has any out: ${servable} would take yours`, `No rivals out: ${servable} would take yours`);
  if (rivals + out <= firm) return read('ok', `Enough buyers for everyone (${rivals + out} out for ${firm})`, `Enough buyers: ${rivals + out} out for ${firm}`);
  return read('war', `${pieces(rivals)} out, ${servable} would take yours`);
}

/**
 * Rivals who would beat you at a tied price for this fruit today, from what is public before the bell: shopkeeper
 * perks are public, so a Haggler with this fruit out wins a tie against equally fresh fruit (rules 11) unless you play
 * Favoured Trade (or are the Haggler yourself). Favoured Trade is played secretly with a stall's prices and only shows at the bell, so a rival's
 * card is never used here. "Rosa is the Haggler, who wins ties" (the same words as the showdown), or null.
 */
export function tieHint(s: GameState, p: number, f: FruitId, favoured = false): string | null {
  const me = s.players[p];
  if (favoured || me.favouredTrade || me.trait === 'haggler') return null;
  const names = s.players.filter((o, i) => i !== p && o.trait === 'haggler' && forSale(s, i, f) > 0).map((o) => o.name);
  if (!names.length) return null;
  const hint = hagglerWins(names);
  return hint.charAt(0).toUpperCase() + hint.slice(1);
}
