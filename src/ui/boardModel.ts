// Pure helpers for the table: how the market board and the stall chips are laid out.
// Kept free of Preact so they can be unit-tested against the engine's rules.
import { FRUITS, PREF_INFO, acceptsStage, deliveredGreen, lookOf, slotLife, stageAt, type FruitId, type Stage, type Want } from '../engine/data';
import {
  bestCap, count, effectiveMax, eligible, forSale, isMarketDay, nightOutlook, printedSupply, servingCustomers, walkInsToday,
  type Customer, type GameState, type Player,
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

/** none: nobody wants it; open: wanted and nobody has it; good: enough buyers; war: more stock than buyers. */
export function mood({ demand, supply }: Pulse): Mood {
  return demand === 0 ? 'none' : supply === 0 ? 'open' : supply <= demand ? 'good' : 'war';
}

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
const takesAny = (pl: Player, f: FruitId, x: BuyerLine) =>
  pl.stock[f].some((n, pos) => n > 0 && acceptsStage(x.c.pref, stageAt(f, pos)));

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
  const cap = bestCap(pl.stock, f, x.max, pl, x.c.pref);
  if (!takesAny(pl, f, x) && x.c.pref && x.c.pref !== 'bargain') {
    const type = PREF_INFO[x.c.pref];
    return { cap, label: type.short.toLowerCase(), title: `${who} wants ${x.w.qty} but ${type.text.toLowerCase()}`, aria: `${who}: ${type.short.toLowerCase()}` };
  }
  return { cap, label: `≤$${cap}`, title: `${who} wants ${x.w.qty}, pays up to $${cap} for your freshest`, aria: `${who} up to $${cap}` };
}

/** The Price panel's whisper for one fruit at the price you are about to post. */
export interface PriceRead {
  cls: 'war' | 'safe' | 'ok';
  text: string;
  /** The most of your pieces out that today's buyers would take at this price, even if you were the cheapest stall. */
  canSell: number;
  /** Your pieces that would still sell at this price if every rival with this fruit out sold first wherever it could. */
  sure: number;
  /** Pieces wanted by customers who would take at least one of yours at this price. */
  servable: number;
}

/**
 * How many of shop `p`'s pieces out today's buyers of this fruit would take at `price`, walking the buyers in serving
 * order over copies of the shelves the way the engine sells (eligible: the customer's freshness type, their top price
 * for each piece's freshness, the crate). With `rivalsFirst`, every rival's crate is offered to each buyer before
 * yours, at any price its fruit qualifies for (rivals' shelves and crates are public; their prices are not used).
 */
function sellable(s: GameState, p: number, f: FruitId, price: number, lines: BuyerLine[], rivalsFirst: boolean): number {
  const shelves = s.players.map((pl) => ({ ...pl.stock, [f]: [...pl.stock[f]] }));
  const left = s.players.map((_, i) => (i === p || rivalsFirst ? forSale(s, i, f) : 0));
  const take = (i: number, x: BuyerLine, need: number, at: number) => {
    const used = eligible(s.players[i], shelves[i], f, Math.min(left[i], need), at, x.max, x.c.pref);
    for (const k of used) shelves[i][f][k]--;
    left[i] -= used.length;
    return used.length;
  };
  let mine = 0;
  for (const x of lines) {
    let need = x.w.qty;
    for (let i = 0; i < s.players.length; i++) if (i !== p && need > 0 && left[i] > 0) need -= take(i, x, need, 1);
    if (need > 0 && left[p] > 0) mine += take(p, x, need, price);
  }
  return mine;
}

/**
 * The Price panel's "Psst…" read for the price you are about to post. It never counts buyers your fruit cannot serve:
 * "Only 1 of your 2 would sell at $7 (freshness or price)" when even as the cheapest stall some of your pieces would
 * not sell, and "Enough buyers for everyone" only when the pieces out at every stall fit inside the orders that would
 * take yours and all of yours would sell even if every rival sold first.
 */
export function priceRead(s: GameState, p: number, f: FruitId, price: number): PriceRead {
  const pl = s.players[p];
  const out = forSale(s, p, f);
  const lines = buyersFor(s, f);
  const canSell = sellable(s, p, f, price, lines, false);
  const sure = sellable(s, p, f, price, lines, true);
  const servable = lines.filter((x) => price <= bestCap(pl.stock, f, x.max, pl, x.c.pref)).reduce((a, x) => a + x.w.qty, 0);
  const rivals = s.players.reduce((a, _o, i) => (i === p ? a : a + forSale(s, i, f)), 0);
  const pieces = (n: number) => `${n} rival ${n === 1 ? 'piece' : 'pieces'}`;
  const read = (cls: PriceRead['cls'], text: string): PriceRead => ({ cls, text, canSell, sure, servable });
  if (!lines.length) return read('war', 'Nobody here wants these today');
  if (canSell === 0) return read('war', `Nobody takes yours at $${price}`);
  if (canSell < out) return read('war', `Only ${canSell} of your ${out} would sell at $${price} (freshness or price)`);
  if (rivals === 0) return read('safe', `No rival has any out: ${servable} would take yours`);
  if (sure === out && rivals + out <= servable) return read('ok', `Enough buyers for everyone (${rivals + out} out for ${servable})`);
  return read('war', `${pieces(rivals)} out, ${servable} would take yours`);
}

/**
 * Rivals who would beat you at a tied price for this fruit today, from what is public before the bell: shopkeeper
 * perks are public, so a Haggler with this fruit out wins a tie against you unless you play Favoured Trade (or are the
 * Haggler yourself). Favoured Trade is played secretly with a stall's prices and only shows at the bell, so a rival's
 * card is never used here. "Rosa wins ties (Haggler)", or null.
 */
export function tieHint(s: GameState, p: number, f: FruitId, favoured = false): string | null {
  const me = s.players[p];
  if (favoured || me.favouredTrade || me.trait === 'haggler') return null;
  const names = s.players.filter((o, i) => i !== p && o.trait === 'haggler' && forSale(s, i, f) > 0).map((o) => o.name);
  if (!names.length) return null;
  return `${names.join(' and ')} ${names.length === 1 ? 'wins' : 'win'} ties (Haggler)`;
}
