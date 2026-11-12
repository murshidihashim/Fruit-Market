// Core rules (rules version 18). Every action takes a state and returns a new state
// (the input is never changed), so the UI can keep history and the whole game can be saved as JSON.
//
// A day: morning (event, top-up for a stall out of cash, lorry, tomorrow's strip; on a Market Day every stall bids
// for the standing order) ->
// buying (poorest first) -> customers arrive ->
// open stalls (each shop puts fruit out for sale; quantities become public together) -> pricing
// (one secret price per fruit, revealed together at the bell) -> ties (rules 18: a stall with a tied price may play
// Favoured Trade, in the open) -> sales (queue order, cheapest stall
// first, leftover demand spills to the next stall) -> evening (specialities after Market Days,
// evening favours) -> night (fruit ages).

import {
  BARROW_BUY, BARROW_SHELF, BASE_BUY, BASE_SHELF, CHARMER_DAILY_FAVOURS, CHARMER_START_FAVOURS, CUSTOMER_CARDS, EVENT_CARDS, FARMER_CARDS,
  FAVOUR_HAND_LIMIT, FAVOURS, FRUIT, FRUITS, GENEROUS_BONUS, JAM_PRICE, JUICE_CAP, JUICE_TIP, JUICE_VALUE, LAST_CALL_BONUS,
  LOCAL_FAVOURITE_TIP, MARKET_DAY_EVERY, MAX_STALLS, MIN_STALLS, NEST_EGG_BONUS, PULSE_MAX, PULSE_MIN, START_CASH, STREET_PRICE,
  CHARACTER_TRAIT, TRAIT_OFFER, TRAITS, UPGRADES, BIG_TABLE, MAX_UPGRADES, ORDER_CARDS, ORDER_LEAD, ROW_CAP,
  GUEST_JOINS_FULL_ROW, NO_MANGO_DAYS, ORDER_BOOK_BONUS, SHARED_TIP, TOP_UP,
  acceptsStage, deliveryPos, favourDeckFor, freshPos, orderQty, prefOf, sharpEarsTip, stageAt, stakeFor, trackLength,
  type CustomerCard, type EventCard, type FarmerCard, type FavourId, type FruitId, type Pref, type Stalls, type TraitId, type UpgradeId, type Want,
} from './data';
import { Rng } from './rng';

export type Level = 'easy' | 'normal' | 'hard';
export type Stock = Record<FruitId, number[]>;

export interface PlayerConfig {
  name: string; kind: 'human' | 'ai'; level?: Level; avatar: string; quip?: string;
  /** What this player's shopkeeper and stall wear (slot to look id). Only for show; the rules never read it. */
  look?: Record<string, string>;
}

export interface GameConfig {
  players: PlayerConfig[];
  days: number;
  unripe: boolean;
  upgrades: boolean;
  events: boolean;
  seed: number;
  /** Market Days every 3rd day (+1 walk-in) and Last Call on the final day. On unless set to false. */
  marketDays?: boolean;
  /** Core market (prototype A): no traits and no favour cards (switch upgrades off as well). */
  core?: boolean;
  /** Beginner option: one street price per fruit instead of each customer's own top price. */
  street?: boolean;
  /** Advanced option: market pulse markers move prices after shortages and gluts. */
  pulse?: boolean;
  /** Date key (YYYY-MM-DD) when this is a daily challenge. */
  daily?: string;
  /** Market League stage, when this game is part of the league. */
  league?: number;
}

export interface Stats {
  sold: number; spoiled: number; earned: number; spent: number; bestSale: number; favours: number;
  /** Favour cards this shop has played (for achievements; never read by the rules). */
  played?: FavourId[];
  /**
   * Pieces this shop's Juice Bar turned into juice overnight (for the morning card, the results and achievements;
   * never read by the rules). Optional so that older saves still load: they simply start counting from 0.
   */
  juiced?: number;
}

export interface Player extends PlayerConfig {
  cash: number;
  stock: Stock;
  favours: FavourId[];
  upgrades: UpgradeId[];
  boughtToday: number;
  /** What this shop paid for fruit today (for the day's ledger). */
  spentToday: number;
  favouredTrade: boolean;
  /** Shade Cloth: the fruit this shop keeps from ageing tonight (null: none). Chosen in the evening; reset each morning. */
  shade?: FruitId | null;
  stats: Stats;
  /** Merchant trait, picked from `traitOffer` on the first morning. */
  trait?: TraitId | null;
  traitOffer?: TraitId[];
  /** Specialities this shop may build tonight (empty on nights without a draft). */
  upgradeOffer?: UpgradeId[];
  /**
   * Rules 18: the pieces this stall took from the market today, one count per shelf space (the shape of its shelf).
   * Public from the moment of purchase until the bell; cleared each morning. Its older stock stays secret.
   */
  boughtFruit?: Crate;
}

export interface Customer {
  id: number;
  name: string;
  wants: Want[];
  original: Want[];
  /** A walk-in: drawn a day early and shown face down (only the fruits on the back) until they arrive. */
  walkIn?: boolean;
  /** Players who have seen this face-down card: Gossip (every walk-in in tomorrow's queue) or Scout (one of today's). The card does not record which. */
  seenBy?: number[];
  /** Street-price option: this customer pays $2 more than the street price. */
  generous?: boolean;
  /** Freshness this customer accepts (Premium: Fresh only; Everyday: Fresh or Okay; Bargain: anything). Hidden while face down. */
  pref?: Pref;
  /** Rules 14: this card is a standing order collected today: who holds it, its bid, the card's ceiling, and
   *  (rules 18) the stake the holder put down when it won. */
  order?: { holder: number; price: number; stake: number; ceiling: number };
}

/** One secret price per fruit (the fruit a shop put out for sale). */
export interface Post { fruit: FruitId; price: number }
/** How many of each fruit a shop puts out for sale today (public once every shop has opened). */
export type Stall = Partial<Record<FruitId, number>>;
/**
 * Rules 12: the exact pieces a shop put in its crate, one count per track position (oldest first), in the same shape
 * as its shelf. Only these pieces can sell today. Public once every shop has opened, like the counts in `stalls`.
 */
export type Crate = Partial<Record<FruitId, number[]>>;

export interface Offer {
  player: number; qty: number; price: number; sold: number; freshness: number;
  /** Extra cash from a Juice Bar on older fruit (shown in the sale animation). */
  juice?: number;
  /** Had this fruit out for sale, but none fresh enough for this customer at its price. */
  tooOld?: boolean;
}
export interface LineResult { customerId: number; name: string; fruit: FruitId; want: number; max: number; offers: Offer[] }
export interface DayResult {
  lines: LineResult[];
  favours: { player: number; customer: string; favour: FavourId }[];
  happy: string[];
  leftAngry: string[];
  movedToWaiting: string[];
  income: number[];
  /** What each shop paid for fruit today. */
  spent: number[];
  /** Pasar Malam: what the night hawker paid each shop after the rush (pieces bought at the hawker price). */
  hawker?: { player: number; fruit: FruitId; price: number }[];
  /** Sharp Ears: the tip from a peeked walk-in, by shop (rules 18: at most one a day). */
  earful?: { player: number; customer: string; tip: number }[];
  /** Tip Jar (rules 18): tips from customers who left with their whole order, by shop ($2 served alone, $1 shared). */
  tipJar?: { player: number; customer: string; tip: number }[];
  /** Rules 14: how today's standing order was filled (only on its due day). */
  order?: OrderResult;
}

/** A standing order (rules 14): announced on a Market Day morning, won by the lowest secret bid, due two days later. */
export interface Standing {
  /** Index into ORDER_CARDS. */
  card: number;
  fruit: FruitId;
  qty: number;
  /** The highest bid allowed. */
  ceiling: number;
  /** Rules 18: the card's stake. A stall needs this much cash to bid (half with an Order Book); the winner puts it down. */
  stake: number;
  /** The day the order is collected. */
  due: number;
  /** Each stall's secret bid per piece: null until it has bid, 'pass' if it did not want the order. */
  /** null: still deciding. In a view for another stall, a rival's price is 'in' (rules 17: who is bidding is public, the amount is not). */
  bids: (number | 'pass' | 'in' | null)[];
  /** The stall that won the order (null until the bids are in). */
  holder: number | null;
  /** The winning bid: what the holder is paid per piece. */
  price: number | null;
  /** Rules 18: what the holder put down when it won, held on the card until the due day. */
  staked?: number;
}

export interface OrderResult {
  name: string; fruit: FruitId; qty: number; holder: number; price: number; ceiling: number;
  /** Pieces the holder delivered and what it was paid for each (its bid; $2 more with an Order Book). Rules 18: only
   *  the holder delivers, so this has at most one entry. */
  sales: { player: number; n: number; price: number }[];
  /** Pieces the holder did not deliver. */
  short: number;
  /** Rules 18: the stake that was held on the card ... */
  stake: number;
  /** ... and how much of it came back: all of it for a full delivery, nothing otherwise. */
  back: number;
}

export interface DayRecord {
  day: number; lines: LineResult[]; income: number[]; cash: number[];
  /** The event card of the day, if any (for achievements and recaps). */
  event?: string;
}

/** 'tie' (rules 18): prices and crates have flipped, and stalls holding Favoured Trade with a tied price decide, one
 *  at a time, whether to play it. The step exists only when some stall is eligible. */
export type Phase = 'morning' | 'order' | 'buy' | 'stall' | 'bid' | 'tie' | 'reveal' | 'evening' | 'over';

export interface GameState {
  config: GameConfig;
  rng: number;
  day: number;
  phase: Phase;
  players: Player[];
  market: Stock;
  farmerDeck: number[];
  customerDeck: number[];
  eventDeck: number[];
  favourDeck: FavourId[];
  event: EventCard | null;
  nextEvent: EventCard | null;
  delivery: Partial<Record<FruitId, number>>;
  deliveryUnripe: FruitId | null;
  /** Tomorrow's farmer card, drawn a day early and shown to everyone (null on the last day). */
  nextFarmer?: FarmerCard | null;
  /** The next expected customer (face up). */
  forecast: Customer | null;
  /** The next walk-ins, face down: before the crowd arrives these are today's; afterwards tomorrow's. */
  queue: Customer[];
  /** Rules 16: tomorrow's expected customer, drawn each morning so it shows while stalls buy (null otherwise). */
  nextForecast: Customer | null;
  /** Rules 16: tomorrow's walk-ins, face down, drawn each morning; they become `queue` when today's crowd arrives. */
  nextQueue: Customer[];
  firstMarket: Customer[];
  secondMarket: Customer[];
  firstPlayer: number;
  priorityNext: number | null;
  order: number[];
  turn: number;
  /** What each shop put out for sale today (null until it has opened its stall). */
  stalls: (Stall | null)[];
  /** Rules 12: which pieces each shop put in its crate (null until it has opened its stall). */
  crates?: (Crate | null)[];
  /** Rules 15: how many pieces each stall put out today, the one thing about a crate that is public before the bell.
   *  Only set on a view made for one stall (publicView), where the crates themselves are blank. */
  out?: (number | null)[];
  /** Each shop's secret prices (null until it has priced). */
  bids: (Post[] | null)[];
  /** Rules 18, the tie step: the stalls still to decide whether to play Favoured Trade, in today's buying order (the
   *  first is deciding now). In a view made for one stall only the stall deciding now is listed. */
  tieAsk?: number[];
  results: DayResult | null;
  /** Market pulse markers (advanced option). */
  pulse?: Record<FruitId, number>;
  /** Last Call: what the jam maker paid each shop for leftover fruit. */
  jam?: number[];
  /** One entry per finished day, for recaps. Presentation only. */
  history?: DayRecord[];
  /** Each shop's cash when the day began (for the day's net result). */
  dayStartCash?: number[];
  /** Health Inspector: what each shop was fined at the start of today (before buying). */
  dayFines?: number[];
  /** Rules 18, out of cash: what the market gave each stall at dawn today to bring it up to TOP_UP (0: nothing). */
  dayTopUps?: number[];
  /** Rules 18: pieces of a fruit the lorry brings green that arrived ripe today (Mango Windfall's extra mangoes). */
  deliveryRipe?: Partial<Record<FruitId, number>>;
  /** Rules 14: the standing order in play (null: none). */
  standing?: Standing | null;
  /** Rules 14: the standing-order deck (indexes into ORDER_CARDS). */
  orderDeck?: number[];
  /** The person's own moves in a daily challenge, so the server can replay the game to check the score. */
  moves?: Action[];
  log: string[];
  nextId: number;
}

export class RuleError extends Error {}

// ---------- helpers ----------

export function emptyStock(unripe: boolean): Stock {
  const s = {} as Stock;
  for (const f of FRUITS) s[f] = new Array(trackLength(f, unripe)).fill(0);
  return s;
}

export function count(stock: Stock, f?: FruitId, ripeOnly = false): number {
  const fruits = f ? [f] : FRUITS;
  let n = 0;
  for (const fr of fruits) {
    const ripeLen = FRUIT[fr].ripe.length;
    stock[fr].forEach((c, i) => { if (!ripeOnly || i < ripeLen) n += c; });
  }
  return n;
}

export function shelfSize(p: Player): number {
  return p.upgrades.includes('barrow') ? BARROW_SHELF : BASE_SHELF;
}

export function buyLimit(p: Player): number {
  return (p.upgrades.includes('barrow') ? BARROW_BUY : BASE_BUY) + (p.trait === 'basket' ? 1 : 0);
}

export function handLimit(p: Player): number {
  return FAVOUR_HAND_LIMIT + (p.trait === 'charmer' ? 1 : 0);
}

/** What this shop pays for one fruit at the market (a Bargain Hunter's first fruit each day is $1 off; rules 11: Big
 *  Basket's extra piece costs the normal price). Never below $1. A Ripening Room gives no discount (DEC-101). */
export function buyCost(s: GameState, p: number, f: FruitId, pos: number): number {
  const pl = s.players[p];
  const c = marketCost(s, f, pos);
  return pl?.trait === 'bargain' && pl.boughtToday === 0 ? Math.max(1, c - 1) : c;
}

/** The market's price for a piece today: the printed cost, plus the event's change for every fruit or (rules 18) for
 *  this fruit alone (Blueberry Glut). Never below $1. */
export function marketCost(s: GameState, f: FruitId, pos: number): number {
  const stage = stageAt(f, pos);
  return Math.max(1, FRUIT[f].cost[stage] + (s.event?.cost ?? 0) + (s.event?.costFruit?.[f] ?? 0));
}

export const marketDaysOn = (s: GameState): boolean => s.config.marketDays !== false;

/** Market Day: every 3rd day (never the last). Rules 14: it brings a standing order; the lorry still comes. */
export function isMarketDay(s: GameState, day = s.day): boolean {
  return marketDaysOn(s) && day % MARKET_DAY_EVERY === 0 && day < s.config.days;
}

/** Specialities are offered on the evening after each Market Day day (3, 6, 9, 12), whether or not Market Days are on. */
export function isDraftNight(s: GameState, day = s.day): boolean {
  return s.config.upgrades && day % MARKET_DAY_EVERY === 0 && day < s.config.days;
}

export const isLastCall = (s: GameState, day = s.day): boolean => marketDaysOn(s) && day === s.config.days;

/** Everything added to a customer's price for this fruit today: event, Last Call and (option) market pulse. */
export function priceMod(s: GameState, f: FruitId): number {
  const e = s.event;
  return (e?.priceAll ?? 0) + (e?.price?.[f] ?? 0) + (isLastCall(s) ? LAST_CALL_BONUS : 0) + (s.config.pulse ? s.pulse?.[f] ?? 0 : 0);
}

/** A customer's top price for a fresh fruit today. */
export function effectiveMax(s: GameState, w: Want, generous?: boolean): number {
  // An event customer's printed price is final: today's event modifiers are not added a second time (Last Call still applies).
  if (w.fixed) return Math.max(1, w.max + (isLastCall(s) ? LAST_CALL_BONUS : 0));
  const base = s.config.street ? STREET_PRICE[w.fruit] + (generous ? GENEROUS_BONUS : 0) : w.max;
  return Math.max(1, base + priceMod(s, w.fruit));
}

/** The lowest price a shop may post (there is no floor). */
export function minPrice(_s: GameState, _f: FruitId): number {
  return 1;
}

/** The highest price a shop may post today (Price Controls day), otherwise no limit beyond $30. */
export function maxPrice(s: GameState, f: FruitId): number {
  return s.event?.maxPrice ? s.event.maxPrice[f] : 30;
}

/** Most a customer pays for this fruit at this position on the track (unripe can't be sold). */
export function capAt(f: FruitId, pos: number, max: number): number {
  const d = FRUIT[f].drop;
  if (pos >= d.length) return -1;
  return max - d[pos];
}

/** As capAt, for this shop: a Premium Display lets fresh fruit go $1 higher. Rules 18: never for a guest, whose price
 *  is fixed (`fixed`). */
export function capFor(pl: Player, f: FruitId, pos: number, max: number, fixed = false): number {
  const c = capAt(f, pos, max);
  return c > 0 && !fixed && pl.upgrades.includes('premium') && stageAt(f, pos) === 'fresh' ? c + 1 : c;
}

/** Customers currently in the market, in the order they are served (waiting longest first). */
export function servingCustomers(s: GameState): Customer[] {
  return [...s.secondMarket, ...s.firstMarket];
}

/** Today's ordinary customers: everyone in the row except a standing order (which buys by its own rule). */
export function rowCustomers(s: GameState): Customer[] {
  return servingCustomers(s).filter((c) => !c.order);
}

export function activePlayer(s: GameState): number {
  if (s.phase === 'stall') return s.stalls.findIndex((x) => x === null);
  if (s.phase === 'bid') return s.bids.findIndex((b) => b === null);
  if (s.phase === 'tie') return s.tieAsk?.[0] ?? -1;
  // Rules 17: who is bidding is public, so computer stalls decide first and a person sees them before deciding.
  if (s.phase === 'order') {
    if (!s.standing) return -1;
    const open = (kind: 'ai' | 'human') => s.standing!.bids.findIndex((b, i) => b === null && s.players[i].kind === kind);
    const ai = open('ai');
    return ai >= 0 ? ai : open('human');
  }
  if (s.phase === 'buy' || s.phase === 'evening') return s.order[s.turn] ?? -1;
  return -1;
}

// ---------- pacing (no formulas: everything is printed or counted) ----------

/** 0 on the first day, 1 on the last. */
export function progress(s: GameState, day = s.day): number {
  return s.config.days <= 1 ? 1 : Math.min(1, (day - 1) / (s.config.days - 1));
}

/** Extra walk-ins for a change of `k`, scaled per 3 stalls: sign(k) x ceil(|k| x stalls / 3) (rules 11). */
export function scaledWalkIns(k: number, stalls: number): number {
  return k === 0 ? 0 : Math.sign(k) * Math.ceil((Math.abs(k) * stalls) / 3);
}

/** Walk-ins on a day: stalls - 1, so the crowd is one customer per stall with the regular. Rules 14: the row never
 *  holds more than ROW_CAP customers, and Market Days no longer add walk-ins. Walk-in events add or remove walk-ins
 *  per 3 stalls; never below none. */
export function walkInsOn(s: GameState, day: number, event: EventCard | null): number {
  const n = s.players.length;
  void day;
  return Math.max(0, Math.min(ROW_CAP - 1, Math.min(n, ROW_CAP) - 1 + scaledWalkIns(event?.walkIns ?? 0, n)));
}

/** Walk-ins arriving today (face down in the queue until the crowd comes). */
export function walkInsToday(s: GameState): number {
  return s.phase === 'morning' || s.phase === 'buy' ? s.queue.length : servingCustomers(s).filter((c) => c.walkIn).length;
}

/** Fruit the farmers bring for one fruit on a card: the number printed for this many stalls (2 to 6). */
export function printedSupply(card: FarmerCard, f: FruitId, shops: number): number {
  return card.table[Math.min(MAX_STALLS, Math.max(MIN_STALLS, shops)) as Stalls][f];
}

/** Extra fruit an event adds to today's delivery of one fruit (rules 11: per 2 stalls for one fruit, per 4 for all). */
export function eventSupply(e: EventCard | null | undefined, f: FruitId, shops: number): number {
  let n = 0;
  if (e?.supplyAll) n += e.supplyAll * Math.ceil(shops / 4);
  if (e?.supplyEach?.[f]) n += Math.ceil((e.supplyEach[f]! * shops) / 2);
  return n;
}

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

function withRng<T>(s: GameState, fn: (r: Rng) => T): T {
  const r = new Rng(s.rng);
  const out = fn(r);
  s.rng = r.state;
  return out;
}

function makeCustomer(s: GameState, card: CustomerCard, walkIn = false): Customer {
  // Rules 14: at a full table every customer wants one more of the first fruit on their card (never a guest).
  const wants = card.wants.map((w, i) => ({ ...w, qty: w.qty + (s.players.length >= BIG_TABLE && i === 0 && !w.fixed ? 1 : 0) }));
  const c: Customer = { id: s.nextId++, name: card.name, wants, original: clone(wants), pref: prefOf(card.name) };
  if (walkIn) { c.walkIn = true; c.seenBy = []; }
  // Street prices: customers whose card pays well are "generous".
  if (wants.some((w) => w.max >= STREET_PRICE[w.fruit] + GENEROUS_BONUS)) c.generous = true;
  return c;
}

/** Rules 18: on the first NO_MANGO_DAYS days no customer wants a mango (every mango arrives green and needs two
 *  nights). Only when mangoes do arrive green: with unripe fruit switched off they can be sold on day 1. */
export function mangoFree(s: GameState, day: number): boolean {
  return s.config.unripe && day <= NO_MANGO_DAYS;
}

/** Draws the next customer card for `day`. Rules 18: for a mango-free day, a card that wants a mango goes to the
 *  bottom of the deck and another is drawn. */
function drawCustomer(s: GameState, walkIn = false, day = s.day): Customer {
  for (let skipped = 0; ; skipped++) {
    if (s.customerDeck.length === 0) {
      const inPlay = new Set([...s.firstMarket, ...s.secondMarket, ...s.queue, s.forecast, ...s.nextQueue, s.nextForecast].filter(Boolean).map((c) => c!.name));
      s.customerDeck = withRng(s, (r) => r.shuffle(CUSTOMER_CARDS.map((_, i) => i).filter((i) => !inPlay.has(CUSTOMER_CARDS[i].name))));
    }
    const i = s.customerDeck.shift()!;
    const card = CUSTOMER_CARDS[i];
    if (mangoFree(s, day) && skipped < CUSTOMER_CARDS.length && card.wants.some((w) => w.fruit === 'mango')) { s.customerDeck.push(i); continue; }
    return makeCustomer(s, card, walkIn);
  }
}

function drawFarmer(s: GameState): FarmerCard {
  if (s.farmerDeck.length === 0) s.farmerDeck = withRng(s, (r) => r.shuffle(FARMER_CARDS.map((_, i) => i)));
  return FARMER_CARDS[s.farmerDeck.shift()!];
}

/**
 * Rules 13: a walk-in event (Festival, Tourist Bus, Monsoon) changes the walk-ins already waiting face down on the
 * morning it is drawn: extra walk-ins join the end of the row face down; fewer means the last ones go back under the
 * customer deck.
 */
function eventWalkIns(s: GameState) {
  const k = scaledWalkIns(s.event?.walkIns ?? 0, s.players.length);
  for (let i = 0; i < k && s.queue.length < ROW_CAP - 1; i++) s.queue.push(drawCustomer(s, true, s.day));
  if (k < 0) {
    for (const c of s.queue.splice(Math.max(0, s.queue.length + k))) {
      const i = CUSTOMER_CARDS.findIndex((x) => x.name === c.name);
      if (i >= 0) s.customerDeck.push(i);
    }
  }
}

function drawEvent(s: GameState): EventCard {
  if (s.eventDeck.length === 0) s.eventDeck = withRng(s, (r) => r.shuffle(EVENT_CARDS.map((_, i) => i)));
  return EVENT_CARDS[s.eventDeck.shift()!];
}

/** Next favour card. When the deck runs out, the played cards are shuffled back in (cards still in hands stay there), as on a table. */
function drawFavour(s: GameState): FavourId | null {
  if (s.favourDeck.length === 0) {
    const pool = favourDeckFor(s.players.length);
    for (const held of s.players.flatMap((p) => p.favours)) {
      const k = pool.indexOf(held);
      if (k >= 0) pool.splice(k, 1);
    }
    s.favourDeck = withRng(s, (r) => r.shuffle(pool));
  }
  return s.favourDeck.shift() ?? null;
}

/** Ages one fruit's track (oldest slot first) by `steps` nights, in place. Returns the pieces that fell off the end. */
function ageTrack(t: number[], steps: number): number {
  let spoiled = 0;
  for (let k = 0; k < steps; k++) {
    spoiled += t[0];
    for (let i = 0; i < t.length - 1; i++) t[i] = t[i + 1];
    t[t.length - 1] = 0;
  }
  return spoiled;
}

function age(stock: Stock, steps: number): number {
  return FRUITS.reduce((a, f) => a + ageTrack(stock[f], steps), 0);
}

function applyTrait(s: GameState, p: number, t: TraitId) {
  const pl = s.players[p];
  pl.trait = t;
  if (t === 'nestegg') pl.cash = START_CASH + NEST_EGG_BONUS;
  if (t === 'charmer') for (let k = 0; k < CHARMER_START_FAVOURS; k++) { const f = drawFavour(s); if (f) pl.favours.push(f); }
  s.dayStartCash = s.players.map((x) => x.cash);
  s.log.push(`${pl.name} took the perk ${TRAITS[t].title}`);
}

// ---------- setup ----------

export function newGame(config: GameConfig): GameState {
  if (config.players.length < MIN_STALLS || config.players.length > MAX_STALLS) throw new RuleError(`A game needs ${MIN_STALLS} to ${MAX_STALLS} stalls`);
  const r = new Rng(config.seed || 1);
  const players: Player[] = config.players.map((pc) => ({
    ...pc,
    cash: START_CASH,
    stock: emptyStock(config.unripe),
    favours: [],
    upgrades: [],
    boughtToday: 0,
    spentToday: 0,
    favouredTrade: false,
    stats: { sold: 0, spoiled: 0, earned: 0, spent: 0, bestSale: 0, favours: 0 },
  }));
  const s: GameState = {
    config,
    rng: 0,
    day: 1,
    phase: 'morning',
    players,
    market: emptyStock(config.unripe),
    farmerDeck: r.shuffle(FARMER_CARDS.map((_, i) => i)),
    customerDeck: r.shuffle(CUSTOMER_CARDS.map((_, i) => i)),
    eventDeck: r.shuffle(EVENT_CARDS.map((_, i) => i)),
    favourDeck: r.shuffle(favourDeckFor(config.players.length)),
    event: null,
    nextEvent: null,
    delivery: {},
    deliveryUnripe: null,
    forecast: null,
    queue: [],
    nextForecast: null,
    nextQueue: [],
    firstMarket: [],
    secondMarket: [],
    firstPlayer: r.int(players.length),
    priorityNext: null,
    order: [],
    turn: 0,
    stalls: players.map(() => null),
    crates: players.map(() => null),
    bids: players.map(() => null),
    results: null,
    log: [],
    nextId: 1,
    history: [],
  };
  if (config.pulse) s.pulse = Object.fromEntries(FRUITS.map((f) => [f, 0])) as Record<FruitId, number>;
  const traitIds = Object.keys(TRAITS) as TraitId[];
  for (const pl of s.players) {
    // Rules 5: a character card fixes the perk. Any other avatar (tests, daily challenge) still draws 3 traits to choose from.
    const fixed = !config.core && CHARACTER_TRAIT[pl.avatar] !== undefined;
    pl.traitOffer = config.core || fixed ? [] : r.shuffle([...traitIds]).slice(0, TRAIT_OFFER);
    pl.trait = null;
  }
  s.rng = r.state;
  // Day 1's crowd: one expected customer (face up) and the walk-ins (face down).
  s.forecast = drawCustomer(s, false, 1);
  for (let i = 0; i < walkInsOn(s, 1, null); i++) s.queue.push(drawCustomer(s, true, 1));
  startDay(s);
  // A character's perk applies at once. Otherwise computer shops pick their trait straight away; people pick on the first morning.
  s.players.forEach((pl, i) => {
    const perk = config.core ? undefined : CHARACTER_TRAIT[pl.avatar];
    if (perk) applyTrait(s, i, perk);
    else if (pl.kind === 'ai' && pl.traitOffer?.length) applyTrait(s, i, pl.traitOffer[0]);
  });
  return s;
}

export function canPickTrait(s: GameState, p: number, t: TraitId): string | null {
  const pl = s.players[p];
  if (!pl || s.phase !== 'morning' || s.day !== 1) return 'Perks are picked on the first morning';
  if (pl.trait) return 'You already have a trait';
  if (!pl.traitOffer?.includes(t)) return 'That trait is not on offer';
  return null;
}

export function pickTrait(state: GameState, p: number, t: TraitId): GameState {
  const why = canPickTrait(state, p, t);
  if (why) throw new RuleError(why);
  const s = clone(state);
  applyTrait(s, p, t);
  return s;
}

function startDay(s: GameState) {
  s.phase = 'morning';
  s.event = null;
  // Rules 13: today's event is drawn this morning and never shown the day before. The Health Inspector is never the
  // last day's event.
  s.nextEvent = null;
  if (s.day > 1 && s.config.events) {
    s.event = drawEvent(s);
    if (s.day === s.config.days && s.event.inspector) s.event = drawEvent(s);
    // Rules 18: Mango Craze is never the event of a mango-free day (its guest could not be served): the card goes to
    // the bottom of the deck and another is turned over.
    if (mangoFree(s, s.day) && s.event.id === 'mangoCraze') {
      s.eventDeck.push(EVENT_CARDS.findIndex((e) => e.id === 'mangoCraze'));
      s.event = drawEvent(s);
    }
    eventWalkIns(s);
  }
  drawStanding(s);
  // Health Inspector: at the start of the day, before anyone buys or discards, every shop pays for each soft piece.
  s.dayFines = s.players.map(() => 0);
  if (s.event?.inspector) {
    s.players.forEach((pl, i) => {
      const paid = Math.min(pl.cash, notSoCount(pl.stock) * s.event!.inspector!);
      pl.cash -= paid;
      pl.stats.spent += paid;
      s.dayFines![i] = paid;
      if (paid) s.log.push(`${pl.name} paid the Health Inspector $${paid}`);
    });
  }
  // Rules 18, out of cash: after the event and any inspection, and before anyone bids or buys, a stall with an empty
  // shelf (no piece at all, green included) and less than TOP_UP is topped up to TOP_UP by the market. It is public.
  s.dayTopUps = s.players.map(() => 0);
  if (s.day > 1) {
    s.players.forEach((pl, i) => {
      if (pl.cash >= TOP_UP || count(pl.stock) > 0) return;
      s.dayTopUps![i] = TOP_UP - pl.cash;
      pl.cash = TOP_UP;
      s.log.push(`${pl.name} had an empty shelf and less than $${TOP_UP}: topped up to $${TOP_UP}`);
    });
  }
  s.delivery = {};
  s.deliveryUnripe = null;
  delete s.deliveryRipe;
  // Today's lorry was announced yesterday. The lorry comes every day, Market Days too (rules 5).
  const card = s.nextFarmer ?? drawFarmer(s);
  s.nextFarmer = s.day < s.config.days ? drawFarmer(s) : null;
  // Rules 16: tomorrow's crowd is drawn this morning (after today's walk-in event), so the Tomorrow strip shows while
  // stalls buy: one expected customer face up, the walk-ins face down. Tomorrow's event is not known yet (rules 13):
  // its walk-in change is made on the morning it is drawn.
  s.nextForecast = null;
  s.nextQueue = [];
  if (s.day < s.config.days) {
    s.nextForecast = drawCustomer(s, false, s.day + 1);
    for (let i = 0; i < walkInsOn(s, s.day + 1, null); i++) s.nextQueue.push(drawCustomer(s, true, s.day + 1));
  }
  if (card && !s.event?.noDelivery) {
    const e = s.event;
    const shops = s.players.length;
    const unripe = s.config.unripe && card.unripe ? card.unripe : null;
    s.deliveryUnripe = unripe;
    for (const f of FRUITS) {
      let n = printedSupply(card, f, shops) + eventSupply(e, f, shops);
      if (e?.noFruit === f) n = 0;
      if (e?.supplyMult) n = Math.ceil(n * e.supplyMult);
      if (n <= 0) continue;
      s.delivery[f] = n;
      // Green fruit enters the top of its track; the Seconds Lorry fills each fruit's freshest Okay space.
      const pos = f === unripe ? s.market[f].length - 1 : deliveryPos(card, f);
      // Rules 18: an event's extra pieces of a fruit that arrives green come ripe, in the Fresh space (Mango Windfall:
      // "1 extra ripe mango").
      const ripe = f === unripe && e?.supplyEach?.[f] ? Math.min(n, eventSupply({ ...e, supplyAll: 0 }, f, shops)) : 0;
      s.market[f][pos] += n - ripe;
      if (ripe) {
        s.market[f][freshPos(f)] += ripe;
        (s.deliveryRipe ??= {})[f] = ripe;
      }
    }
  }
  for (const p of s.players) {
    p.boughtToday = 0;
    p.spentToday = 0;
    p.favouredTrade = false;
    delete p.shade;
    delete p.boughtFruit;
    p.upgradeOffer = [];
  }
  s.dayStartCash = s.players.map((p) => p.cash);
  const n = s.players.length;
  // Rules 10: the poorest shop buys first, then the rest follow clockwise from it. Ties for poorest go to the first
  // of them round the table from the first-player token. Day 1 simply starts at the token.
  const rota = Array.from({ length: n }, (_, i) => (s.firstPlayer + i) % n);
  const start = s.day === 1 ? rota[0] : rota.reduce((best, i) => (s.players[i].cash < s.players[best].cash ? i : best), rota[0]);
  s.order = Array.from({ length: n }, (_, i) => (start + i) % n);
  // Nest Egg: first in line on day 3, the first Market Day. Rules 18: a Priority card played the evening before goes
  // ahead of it, so on day 3 the Priority stall buys first and Nest Egg second.
  const egg = s.players.findIndex((p) => p.trait === 'nestegg');
  if (egg >= 0 && s.day === 3) s.order = [egg, ...s.order.filter((i) => i !== egg)];
  if (s.priorityNext !== null) {
    s.order = [s.priorityNext, ...s.order.filter((i) => i !== s.priorityNext)];
    s.priorityNext = null;
  }
  s.turn = 0;
  s.stalls = s.players.map(() => null);
  s.crates = s.players.map(() => null);
  s.bids = s.players.map(() => null);
  s.results = null;
}

// ---------- morning ----------

export function beginBuying(state: GameState): GameState {
  if (state.phase !== 'morning') throw new RuleError('Not morning');
  const s = clone(state);
  s.players.forEach((pl, i) => { if (pl.traitOffer?.length && !pl.trait) applyTrait(s, i, pl.traitOffer[0]); });
  // Rules 14: a standing order announced this morning is bid for before anyone buys.
  s.phase = s.standing && s.standing.holder === null && s.standing.bids.some((b) => b === null) ? 'order' : 'buy';
  s.turn = 0;
  return s;
}

// ---------- standing orders (rules 14) ----------

/** On a Market Day morning a new standing order is announced, when its due day still falls inside the game. */
function drawStanding(s: GameState) {
  if (s.standing && s.standing.due < s.day) s.standing = null;
  if (s.config.core || !isMarketDay(s) || s.day + ORDER_LEAD > s.config.days || s.standing) return;
  if (!s.orderDeck || s.orderDeck.length === 0) s.orderDeck = withRng(s, (r) => r.shuffle(ORDER_CARDS.map((_, i) => i)));
  const card = s.orderDeck.shift()!;
  const c = ORDER_CARDS[card];
  s.standing = { card, fruit: c.fruit, qty: orderQty(s.players.length), ceiling: c.ceiling, stake: c.stake, due: s.day + ORDER_LEAD, bids: s.players.map(() => null), holder: null, price: null };
}

/** The standing order a stall must fill today, if it holds one that is due. */
export function orderDueToday(s: GameState): Standing | null {
  return s.standing && s.standing.holder !== null && s.standing.due === s.day ? s.standing : null;
}

export function canBidOrder(s: GameState, p: number, price: number | null): string | null {
  const o = s.standing;
  if (s.phase !== 'order' || !o) return 'No standing order to bid for';
  // Rules 17: a stall may change its bid, or pass after all, for as long as another stall is still deciding.
  if (o.bids[p] !== null && !o.bids.some((b, i) => i !== p && b === null)) return 'Bidding is closed';
  if (price === null) return null;
  if (!Number.isInteger(price) || price < 1) return 'Bids start at $1';
  if (price > o.ceiling) return `The most this order pays is $${o.ceiling} a piece`;
  // Rules 18: the winner puts the stake down at once, so a stall may only bid with that much cash. Passing is always allowed.
  const stake = orderStake(s, p);
  if (s.players[p].cash < stake) return `You need $${stake} in cash to put down the stake`;
  return null;
}

/** Rules 18: what stall `p` puts down if it wins the standing order: the card's stake, halved (rounded down) with an Order Book. */
export function orderStake(s: GameState, p: number): number {
  return s.standing ? stakeFor(s.standing.stake, s.players[p].upgrades.includes('orderbook')) : 0;
}

/** A stall's bid for the standing order: its price per piece (secret), or null to pass. The lowest bid wins. */
export function bidOrder(state: GameState, p: number, price: number | null): GameState {
  const why = canBidOrder(state, p, price);
  if (why) throw new RuleError(why);
  const s = clone(state);
  const o = s.standing!;
  o.bids[p] = price === null ? 'pass' : price;
  if (o.bids.every((b) => b !== null)) awardOrder(s);
  return s;
}

function awardOrder(s: GameState) {
  const o = s.standing!;
  const bidders = o.bids.map((b, p) => ({ b, p })).filter((x): x is { b: number; p: number } => typeof x.b === 'number');
  if (bidders.length === 0) {
    s.log.push(`Nobody wanted ${ORDER_CARDS[o.card].title}'s order`);
    s.standing = null;
  } else {
    // Lowest bid wins. Ties: an Order Book, then the earlier stall in today's buying order (the poorer one).
    const book = (p: number) => Number(s.players[p].upgrades.includes('orderbook'));
    bidders.sort((a, b) => a.b - b.b || book(b.p) - book(a.p) || s.order.indexOf(a.p) - s.order.indexOf(b.p));
    o.holder = bidders[0].p;
    o.price = bidders[0].b;
    // Rules 18: the winner pays its stake the moment it wins. It is held on the card until the due day.
    const hp = s.players[o.holder];
    o.staked = Math.min(hp.cash, orderStake(s, o.holder));
    hp.cash -= o.staked;
    s.log.push(`${hp.name} won ${ORDER_CARDS[o.card].title}'s order at $${o.price} a piece and put down a $${o.staked} stake`);
  }
  s.phase = 'buy';
  s.turn = 0;
}

/** Where a piece bought at market position `pos` goes on this shop's shelf: a Ripening Room puts green mangoes one night from ripe. */
export function shelfPos(pl: Player, f: FruitId, pos: number): number {
  const ripe = FRUIT[f].ripe.length;
  return pos > ripe && pl.upgrades.includes('ripening') ? ripe : pos;
}

// ---------- buying ----------

function requireActive(s: GameState, p: number, phase: Phase) {
  if (s.phase !== phase) throw new RuleError(`Not the ${phase} phase`);
  if (activePlayer(s) !== p) throw new RuleError('Not your turn');
}

export function canBuy(s: GameState, p: number, f: FruitId, pos: number): string | null {
  const pl = s.players[p];
  if (s.phase !== 'buy' || activePlayer(s) !== p) return 'Not your turn';
  if ((s.market[f][pos] ?? 0) <= 0) return 'None left';
  if (pl.boughtToday >= buyLimit(pl)) return `You can buy ${buyLimit(pl)} pieces of fruit a day`;
  if (count(pl.stock) >= shelfSize(pl)) return 'Your shelf is full';
  if (pl.cash < buyCost(s, p, f, pos)) return 'Not enough cash';
  return null;
}

export function buy(state: GameState, p: number, f: FruitId, pos: number): GameState {
  const why = canBuy(state, p, f, pos);
  if (why) throw new RuleError(why);
  const s = clone(state);
  const pl = s.players[p];
  const cost = buyCost(s, p, f, pos);
  s.market[f][pos]--;
  takeToShelf(pl, f, shelfPos(pl, f, pos));
  pl.cash -= cost;
  pl.stats.spent += cost;
  pl.spentToday += cost;
  pl.boughtToday++;
  return s;
}

/** Puts a piece taken from the market on a shop's shelf and notes it among today's purchases (rules 18: public until the bell). */
function takeToShelf(pl: Player, f: FruitId, at: number) {
  pl.stock[f][at]++;
  const t = ((pl.boughtFruit ??= {})[f] ??= new Array<number>(pl.stock[f].length).fill(0));
  t[at]++;
}

/** Rules 18: the pieces a stall took from the market today that are still on its shelf, in the shape of a shelf.
 *  This is what its rivals may know about its shelf from buying until the bell. */
export function boughtStock(pl: Player): Stock {
  const out = {} as Stock;
  for (const f of FRUITS) out[f] = pl.stock[f].map((n, i) => Math.min(n, pl.boughtFruit?.[f]?.[i] ?? 0));
  return out;
}

export function endBuyTurn(state: GameState, p: number): GameState {
  requireActive(state, p, 'buy');
  const s = clone(state);
  s.turn++;
  if (s.turn >= s.order.length) customersArrive(s);
  return s;
}

function customersArrive(s: GameState) {
  // Today's crowd: the expected customer, the walk-ins (turned face up) and any event customer.
  const arriving: Customer[] = [];
  if (s.forecast) arriving.push(s.forecast);
  for (const c of s.queue) arriving.push(c);
  // Rules 14: the row never passes ROW_CAP. A standing order collected today takes the place of the last walk-in (who
  // goes back under the deck). Rules 18: the cap counts the regular and the walk-ins; a guest joins the end of the row
  // even when it is full (the row is then six that day).
  const due = orderDueToday(s);
  const extras = (s.event?.extra && !GUEST_JOINS_FULL_ROW ? 1 : 0) + (due ? 1 : 0);
  while (arriving.length + extras > ROW_CAP && arriving.some((c) => c.walkIn)) {
    const gone = arriving.pop()!;
    const i = CUSTOMER_CARDS.findIndex((x) => x.name === gone.name);
    if (i >= 0) s.customerDeck.push(i);
  }
  if (s.event?.extra) arriving.push(makeCustomer(s, s.event.extra));
  // The standing order stands at the front of the row and is served first.
  if (due) {
    const wants: Want[] = [{ fruit: due.fruit, qty: due.qty, max: due.price!, fixed: true }];
    arriving.unshift({ id: s.nextId++, name: ORDER_CARDS[due.card].name, wants, original: clone(wants), pref: 'everyday', order: { holder: due.holder!, price: due.price!, stake: due.staked ?? 0, ceiling: due.ceiling } });
  }
  s.firstMarket = arriving;
  // Tomorrow's queue, drawn this morning (rules 16), moves up: one expected customer face up, the walk-ins face down.
  s.forecast = s.nextForecast;
  s.queue = s.nextQueue;
  s.nextForecast = null;
  s.nextQueue = [];
  s.phase = 'stall';
  // Rules 18: a stall with no ripe fruit on its shelf has nothing to decide: it takes no stocking turn and is treated
  // as having put nothing out (so it takes no pricing turn either).
  const empty = s.players.map((pl) => count(pl.stock, undefined, true) === 0);
  s.stalls = empty.map((e) => (e ? {} : null));
  s.crates = empty.map((e) => (e ? {} : null));
  s.bids = s.players.map(() => null);
  if (s.stalls.every((x) => x !== null)) startPricing(s);
}

// ---------- favours ----------

export interface FavourArgs { fruit?: FruitId; pos?: number; /** Scout: the id of the face-down walk-in to look at. */ customer?: number }

export function canPlayFavour(s: GameState, p: number, idx: number): string | null {
  if (!s.players[p].favours[idx]) return 'No such card';
  if (activePlayer(s) !== p) return 'Not your turn';
  return favourBlock(s, p, idx);
}

/** Why this shop's card cannot be played in this phase, leaving aside whose turn it is (null: it can be played). */
function favourBlock(s: GameState, p: number, idx: number): string | null {
  const pl = s.players[p];
  const id = pl.favours[idx];
  if (!id) return 'No such card';
  const def = FAVOURS[id];
  // Rules 18: Favoured Trade is played in its own step after prices flip, by the stall being asked (decideTie). Its
  // card may be tapped then; at any other time it cannot be played.
  if (id === 'favouredTrade') return s.phase === 'tie' ? null : 'Favoured Trade is played after prices flip, when one of your prices is tied and you are asked';
  if (def.when !== s.phase) return `Play this during the ${def.when} phase`;
  if (id === 'priority' && s.day >= s.config.days) return 'There is no tomorrow';
  // Rules 18: only one Priority card can be played each evening. A second one is refused and stays in the hand.
  if (id === 'priority' && s.priorityNext !== null) return 'A Priority card has already been played this evening. Only one can be played each evening, so keep yours';
  if (id === 'gossip' && (s.queue.length === 0 || s.queue.every((c) => c.seenBy?.includes(p)))) return 'No walk-ins to hear about';
  if (id === 'scout' && s.queue.every((c) => c.seenBy?.includes(p))) return 'No walk-ins to look at';
  return null;
}

export function playFavour(state: GameState, p: number, idx: number, args: FavourArgs = {}): GameState {
  const why = canPlayFavour(state, p, idx);
  if (why) throw new RuleError(why);
  // Rules 18: playing Favoured Trade from the hand is the asked stall's "play it" in the tie step.
  if (state.players[p].favours[idx] === 'favouredTrade') return decideTie(state, p, true);
  const s = clone(state);
  const pl = s.players[p];
  const id = pl.favours[idx];
  switch (id) {
    case 'gossip':
      // Only this shop learns what tomorrow's walk-ins want; everyone sees the card was played.
      for (const c of s.queue) c.seenBy = [...new Set([...(c.seenBy ?? []), p])];
      break;
    case 'freeFruit': {
      const { fruit, pos } = args;
      if (!fruit || pos === undefined || (s.market[fruit][pos] ?? 0) <= 0) throw new RuleError('Pick a fruit at the market');
      if (count(pl.stock) >= shelfSize(pl)) throw new RuleError('Your shelf is full');
      s.market[fruit][pos]--;
      takeToShelf(pl, fruit, shelfPos(pl, fruit, pos));
      break;
    }
    case 'priority':
      s.priorityNext = p;
      break;
    case 'scout': {
      // Only this shop sees the front of one walk-in who arrives today; everyone sees the card was played.
      const c = s.queue.find((q) => q.id === args.customer && !q.seenBy?.includes(p));
      if (!c) throw new RuleError('Pick a walk-in to look at');
      c.seenBy = [...(c.seenBy ?? []), p];
      break;
    }
    case 'fridge':
      // Today's purchases move with the shelf, so what rivals saw bought still matches where the pieces are.
      for (const f of FRUITS) for (const t of [pl.stock[f], pl.boughtFruit?.[f]]) {
        if (!t) continue;
        const top = freshPos(f);
        for (let i = top - 1; i >= 0; i--) {
          t[i + 1] += t[i];
          t[i] = 0;
        }
      }
      break;
  }
  pl.favours.splice(idx, 1);
  pl.stats.played = [...new Set([...(pl.stats.played ?? []), id])];
  s.log.push(`${pl.name} played ${FAVOURS[id].title}`);
  return s;
}

// ---------- open stalls ----------

/** Checks what a shop puts out for sale. Returns an error message or null. */
export function validateStall(s: GameState, p: number, stall: Stall): string | null {
  const pl = s.players[p];
  for (const [f, n] of Object.entries(stall) as [FruitId, number][]) {
    if (!FRUITS.includes(f)) return 'Unknown fruit';
    if (!Number.isInteger(n) || n < 0) return 'Whole numbers only';
    if (n > count(pl.stock, f, true)) return `You only have ${count(pl.stock, f, true)} ripe ${FRUIT[f].plural.toLowerCase()}`;
  }
  return null;
}

/** The oldest pieces on a shelf for these counts: how computer shops fill their crates, and the default (rules 12). */
export function oldestCrate(pl: Player, stall: Stall): Crate {
  const out: Crate = {};
  for (const f of FRUITS) {
    let n = stall[f] ?? 0;
    if (n <= 0) continue;
    const t = new Array(pl.stock[f].length).fill(0);
    for (let i = 0; i < FRUIT[f].ripe.length && n > 0; i++) { const k = Math.min(n, pl.stock[f][i]); t[i] = k; n -= k; }
    out[f] = t;
  }
  return out;
}

/** How many of each fruit a crate holds. */
export function crateCounts(c: Crate): Stall {
  const out: Stall = {};
  for (const [f, t] of Object.entries(c) as [FruitId, number[]][]) { const n = t.reduce((a, b) => a + b, 0); if (n > 0) out[f] = n; }
  return out;
}

/** Checks a crate against the shop's shelf: whole numbers, never more than it holds in a space, and no green fruit. */
export function validateCrate(s: GameState, p: number, c: Crate): string | null {
  const pl = s.players[p];
  for (const [f, t] of Object.entries(c) as [FruitId, number[]][]) {
    if (!FRUITS.includes(f)) return 'Unknown fruit';
    if (!Array.isArray(t) || t.length !== pl.stock[f].length) return 'Bad crate';
    for (let i = 0; i < t.length; i++) {
      const n = t[i];
      if (!Number.isInteger(n) || n < 0) return 'Whole numbers only';
      if (n > pl.stock[f][i]) return `You don't have that many ${FRUIT[f].plural.toLowerCase()} there`;
      if (n > 0 && i >= FRUIT[f].ripe.length) return 'Green fruit can\'t be sold yet';
    }
  }
  return null;
}

/**
 * Opens a shop's stall. Rules 12: `crate` names the exact pieces (a person's choice on the shelf); without it the
 * crate takes the oldest pieces for the counts in `stall` (computer shops, older clients).
 */
export function openStall(state: GameState, p: number, stall: Stall, crate?: Crate): GameState {
  requireActive(state, p, 'stall');
  const bad = crate ? validateCrate(state, p, crate) : validateStall(state, p, stall);
  if (bad) throw new RuleError(bad);
  const c = crate ?? oldestCrate(state.players[p], stall);
  const counts = crateCounts(c);
  const err = validateStall(state, p, counts);
  if (err) throw new RuleError(err);
  const s = clone(state);
  s.stalls[p] = counts;
  (s.crates ??= s.players.map(() => null))[p] = Object.fromEntries(Object.entries(c).filter(([, t]) => t.some((n) => n > 0))) as Crate;
  if (s.stalls.every((x) => x !== null)) startPricing(s);
  return s;
}

/** The pieces in a shop's crate today as a full shelf shape (zeros elsewhere); before it has opened, its whole shelf. */
export function crateStock(s: GameState, p: number): Stock {
  const pl = s.players[p];
  const c = s.crates?.[p] ?? (s.stalls[p] ? oldestCrate(pl, s.stalls[p]!) : null);
  if (!c) return pl.stock;
  const out = {} as Stock;
  for (const f of FRUITS) out[f] = c[f] ? [...c[f]!] : new Array(pl.stock[f].length).fill(0);
  return out;
}

/**
 * Rules 14: a shop's crate as the row of customers finds it, after a standing order collected today has taken its
 * pieces. Rules 18: the order takes pieces from its holder's crate only (Fresh or Okay, freshest first), so only the
 * holder's crate changes; a rival's is left alone. Without an order due it is the crate.
 */
export function rowStock(s: GameState, p: number): Stock {
  const due = orderDueToday(s);
  const mine = crateStock(s, p);
  if (!due || due.holder !== p || !s.crates || s.crates[p] === null) return mine;
  const f = due.fruit;
  const out = { ...mine, [f]: [...mine[f]] } as Stock;
  let need = due.qty;
  for (let pos = FRUIT[f].ripe.length - 1; pos >= 0 && need > 0; pos--) {
    if (stageAt(f, pos) === 'notso') continue;
    const take = Math.min(need, out[f][pos]);
    out[f][pos] -= take;
    need -= take;
  }
  return out;
}

/** Pieces of a fruit a shop has left for the row of customers today (see rowStock). */
export function rowCount(s: GameState, p: number, f: FruitId): number {
  return rowStock(s, p)[f].reduce((a, b) => a + b, 0);
}

/**
 * Rules 15: how many pieces a stall put out today (null until it has opened). Stalls are secret: from the moment every
 * stall is open until the bell, this number is all a rival may know about a crate.
 */
export function outCount(s: GameState, p: number): number | null {
  const known = s.out?.[p];
  if (known !== undefined && known !== null) return known;
  const st = s.stalls[p];
  return st ? FRUITS.reduce((a, f) => a + (st[f] ?? 0), 0) : null;
}

/**
 * Rules 15, secret stalls: the game as stall `seat` may see it. A rival's shelf is never shown (blank here). A rival's
 * crate is blank from stocking until the bell: while stalls are opening only whether it has opened is known, and once
 * every stall is open, how many pieces it holds (`out`). At the bell every crate opens with the prices. Buying is done
 * in the open, so with `memory` the rivals' shelves are kept, as a stall that watched every purchase and sale would
 * know them; a crate is never kept. Rules 18: what a stall bought today is public until the bell (`boughtFruit` stays
 * on every player in this view); with `memory` 'today' a rival's shelf holds just those pieces, as a stall that
 * remembers nothing older would know it. Everything the screen shows a person, and every computer stall's pricing,
 * starts from this view, so nothing secret can leak into either.
 */
export function publicView(state: GameState, seat: number, memory: boolean | 'today' = false): GameState {
  const s = clone(state);
  const bid = s.phase === 'bid';
  const shut = s.phase === 'stall' || bid;
  if (shut) s.out = s.players.map((_, i) => (bid ? outCount(state, i) : null));
  else delete s.out;
  // Rules 17: while the standing order is bid for, everyone sees who is bidding and who passed, never a rival's price.
  if (s.phase === 'order' && s.standing) s.standing.bids = s.standing.bids.map((b, i) => (i !== seat && typeof b === 'number' ? 'in' : b));
  // Rules 18, the tie step: who is being asked is public (as at a table); who will be asked next is not.
  if (s.tieAsk) s.tieAsk = s.tieAsk.slice(0, 1);
  s.players.forEach((pl, i) => {
    if (i === seat) return;
    if (memory === 'today') pl.stock = boughtStock(pl);
    else if (!memory) for (const f of FRUITS) pl.stock[f] = pl.stock[f].map(() => 0);
    if (shut) {
      if (s.stalls[i]) s.stalls[i] = {};
      if (s.crates?.[i]) s.crates[i] = {};
    }
  });
  return s;
}

/** Fruit a shop has out for sale today. */
export function forSale(s: GameState, p: number, f: FruitId): number {
  return s.stalls[p]?.[f] ?? 0;
}

function startPricing(s: GameState) {
  s.phase = 'bid';
  // A shop with nothing out for sale has nothing to price.
  s.bids = s.players.map((_, p) => (FRUITS.some((f) => forSale(s, p, f) > 0) ? null : []));
  if (s.bids.every((b) => b !== null)) afterFlip(s);
}

// ---------- pricing ----------

/** Checks a shop's secret prices: one whole-dollar price for each fruit it put out. */
export function validatePrices(s: GameState, p: number, posts: Post[]): string | null {
  const seen = new Set<FruitId>();
  for (const b of posts) {
    if (!FRUITS.includes(b.fruit)) return 'Unknown fruit';
    if (seen.has(b.fruit)) return 'One price per fruit';
    seen.add(b.fruit);
    if (forSale(s, p, b.fruit) <= 0) return `You have no ${FRUIT[b.fruit].plural.toLowerCase()} out for sale`;
    if (!Number.isInteger(b.price)) return 'Whole numbers only';
    if (b.price < minPrice(s, b.fruit)) return 'Prices start at $1';
    if (b.price > maxPrice(s, b.fruit)) return `Price Controls: the most you can charge for ${FRUIT[b.fruit].plural.toLowerCase()} today is $${maxPrice(s, b.fruit)}`;
  }
  for (const f of FRUITS) if (forSale(s, p, f) > 0 && !seen.has(f)) return `Set a price for your ${FRUIT[f].plural.toLowerCase()}`;
  return null;
}

export function submitPrices(state: GameState, p: number, posts: Post[]): GameState {
  requireActive(state, p, 'bid');
  const s = clone(state);
  const err = validatePrices(s, p, posts);
  if (err) throw new RuleError(err);
  s.bids[p] = posts.map((b) => ({ fruit: b.fruit, price: b.price }));
  if (s.bids.every((b) => b !== null)) afterFlip(s);
  return s;
}

// ---------- ties (rules 18): Favoured Trade after the flip ----------

/** A price a stall posted that another stall also posted for the same fruit (both have that fruit out for sale). */
export interface TiedPrice { fruit: FruitId; price: number; rivals: number[] }

/** Stall `p`'s tied prices, once every price is in (empty before that). Prices and crates are public by then. */
export function tiedPrices(s: GameState, p: number): TiedPrice[] {
  if (s.bids.some((b) => b === null)) return [];
  const out: TiedPrice[] = [];
  for (const b of s.bids[p] ?? []) {
    const rivals = s.players.map((_, i) => i).filter((i) => i !== p && postedPrice(s, i, b.fruit) === b.price);
    if (rivals.length) out.push({ fruit: b.fruit, price: b.price, rivals });
  }
  return out;
}

/** May stall `p` play Favoured Trade in the tie step? It must hold the card and have a tied price. */
export function tieEligible(s: GameState, p: number): boolean {
  return s.players[p].favours.includes('favouredTrade') && tiedPrices(s, p).length > 0;
}

/**
 * Every price is in and the flip has happened: prices and crates are public. Rules 18: stalls that hold Favoured
 * Trade and have a tied price now decide, one at a time in today's buying order and in the open, whether to play it.
 * When no stall is eligible the step does not exist and the rush starts at once.
 */
function afterFlip(s: GameState) {
  const ask = s.order.filter((p) => tieEligible(s, p));
  if (ask.length === 0) { resolve(s); return; }
  s.phase = 'tie';
  s.tieAsk = ask;
}

/** The tie step: the stall being asked plays Favoured Trade (it wins every tied price today) or keeps the card. */
export function decideTie(state: GameState, p: number, play: boolean): GameState {
  requireActive(state, p, 'tie');
  const s = clone(state);
  const pl = s.players[p];
  if (play) {
    const idx = pl.favours.indexOf('favouredTrade');
    if (idx < 0) throw new RuleError('You have no Favoured Trade card');
    pl.favours.splice(idx, 1);
    pl.favouredTrade = true;
    pl.stats.played = [...new Set([...(pl.stats.played ?? []), 'favouredTrade' as FavourId])];
    s.log.push(`${pl.name} played ${FAVOURS.favouredTrade.title}`);
  }
  s.tieAsk = (s.tieAsk ?? []).slice(1);
  if (s.tieAsk.length === 0) {
    delete s.tieAsk;
    resolve(s);
  }
  return s;
}

/**
 * What each stall would take in today's rush as things stand: the posted prices, the crates and the Favoured Trade
 * cards played so far. For the tie step, when all of that is public (a computer stall weighs playing its card with
 * it). The game itself is not changed.
 */
export function rushIncome(state: GameState): number[] {
  const s = clone(state);
  resolve(s);
  return s.results!.income;
}

export function postedPrice(s: GameState, p: number, f: FruitId): number | null {
  return s.bids[p]?.find((b) => b.fruit === f)?.price ?? null;
}

/** Positions (oldest first) a shop would hand over for this customer at this price, up to `qty`. `fixed`: a guest's
 *  fixed price, which a Premium Display never raises (rules 18). */
export function eligible(pl: Player, stock: Stock, f: FruitId, qty: number, price: number, max: number, pref?: Pref, fixed = false): number[] {
  const out: number[] = [];
  const t = stock[f];
  const ripeLen = FRUIT[f].ripe.length;
  for (let i = 0; i < ripeLen && out.length < qty; i++) {
    if (capFor(pl, f, i, max, fixed) < price || !acceptsStage(pref, stageAt(f, i))) continue;
    for (let k = 0; k < t[i] && out.length < qty; k++) out.push(i);
  }
  return out;
}

/** Highest price this shop could ask a customer with this top price, with its current stock. */
export function bestCap(stock: Stock, f: FruitId, max: number, pl?: Player, pref?: Pref, fixed = false): number {
  const ripeLen = FRUIT[f].ripe.length;
  for (let i = ripeLen - 1; i >= 0; i--) if (stock[f][i] > 0 && acceptsStage(pref, stageAt(f, i))) return pl ? capFor(pl, f, i, max, fixed) : capAt(f, i, max);
  return 0;
}

function resolve(s: GameState) {
  const res: DayResult = {
    lines: [], favours: [], happy: [], leftAngry: [], movedToWaiting: [],
    income: s.players.map(() => 0), spent: s.players.map((p) => p.spentToday),
  };
  // Rules 12: each shop sells only the pieces in its crate, oldest of those first.
  const crates = s.players.map((_, p) => crateStock(s, p));
  const left = s.players.map((_, p) => Object.fromEntries(FRUITS.map((f) => [f, crates[p][f].reduce((a, b) => a + b, 0)])) as Record<FruitId, number>);
  const orderIdx = (p: number) => s.order.indexOf(p);
  const favoured = (a: number, b: number) => Number(s.players[b].favouredTrade) - Number(s.players[a].favouredTrade);
  const haggler = (a: number, b: number) => Number(s.players[b].trait === 'haggler') - Number(s.players[a].trait === 'haggler');
  const earful = s.players.map((pl) => pl.trait === 'earful');
  /** Sharp Ears stalls that have had today's tip (rules 18: at most one a day). */
  const earTipped = new Set<number>();
  const dailyFavours = (p: number) => (s.players[p].trait === 'charmer' ? CHARMER_DAILY_FAVOURS : 1);

  for (const c of servingCustomers(s)) {
    const suppliers = new Set<number>();
    let unitsToCustomer = 0;
    for (const w of c.wants) {
      if (w.qty <= 0) continue;
      // Rules 18: a standing order pays its holder the bid for each piece, and $2 more with an Order Book. No event
      // and no Closing Day changes that.
      const orderPay = c.order ? c.order.price + (s.players[c.order.holder].upgrades.includes('orderbook') ? ORDER_BOOK_BONUS : 0) : 0;
      const max = c.order ? orderPay : effectiveMax(s, w, c.generous);
      const offers: (Offer & { used: number[] })[] = [];
      // Rules 14: a standing order takes Fresh or Okay pieces of its fruit, freshest first. Rules 18: from the holder's
      // crate only. Rivals' fruit is never taken and rivals are paid nothing; any unfilled part simply leaves.
      if (c.order) {
        const p = c.order.holder;
        const used: number[] = [];
        const most = Math.min(left[p][w.fruit], w.qty);
        for (let i = FRUIT[w.fruit].ripe.length - 1; i >= 0 && used.length < most; i--) {
          if (stageAt(w.fruit, i) === 'notso') continue;
          for (let k = 0; k < crates[p][w.fruit][i] && used.length < most; k++) used.push(i);
        }
        if (used.length > 0) offers.push({ player: p, qty: used.length, price: orderPay, sold: 0, freshness: Math.max(...used), used });
        else if (left[p][w.fruit] > 0) offers.push({ player: p, qty: 0, price: orderPay, sold: 0, freshness: 0, tooOld: true, used });
      } else s.players.forEach((pl, p) => {
        const price = postedPrice(s, p, w.fruit);
        if (price === null || left[p][w.fruit] <= 0) return;
        const used = eligible(pl, crates[p], w.fruit, Math.min(left[p][w.fruit], w.qty), price, max, c.pref, w.fixed);
        if (used.length === 0) {
          if (left[p][w.fruit] > 0) offers.push({ player: p, qty: 0, price, sold: 0, freshness: 0, tooOld: true, used });
          return;
        }
        offers.push({ player: p, qty: used.length, price, sold: 0, freshness: Math.max(...used), used });
      });
      // Cheapest first. Ties (rules 11): Favoured Trade, then fresher fruit, then a Haggler, then today's buying order
      // (the order was set at dawn, poorest first).
      if (!c.order) offers.sort((a, b) => Number(!!a.tooOld) - Number(!!b.tooOld) || a.price - b.price || favoured(a.player, b.player)
        || b.freshness - a.freshness || haggler(a.player, b.player) || orderIdx(a.player) - orderIdx(b.player));
      let need = w.qty;
      for (const o of offers) {
        if (need <= 0 || o.tooOld) continue;
        const n = Math.min(need, o.qty);
        o.sold = n;
        need -= n;
        const pl = s.players[o.player];
        const sold = o.used.slice(0, n);
        for (const i of sold) { pl.stock[w.fruit][i]--; crates[o.player][w.fruit][i]--; }
        left[o.player][w.fruit] -= n;
        // Juice Bar: each older fruit sold (okay or not so) earns a juice tip as well. Rules 18: only for sales to
        // customers and guests in the rush, so not for a standing order's pieces (nor the night hawker or the jam maker).
        const juice = !c.order && pl.upgrades.includes('juicebar') ? JUICE_TIP * sold.filter((i) => stageAt(w.fruit, i) !== 'fresh').length : 0;
        if (juice) o.juice = juice;
        const gain = n * o.price + juice;
        pl.cash += gain;
        pl.stats.earned += gain;
        pl.stats.sold += n;
        pl.stats.bestSale = Math.max(pl.stats.bestSale, o.price);
        res.income[o.player] += gain;
        suppliers.add(o.player);
        unitsToCustomer += n;
      }
      res.lines.push({ customerId: c.id, name: c.name, fruit: w.fruit, want: w.qty, max, offers: offers.map(({ used: _u, ...o }) => o) });
      w.qty = need;
    }
    if (c.order) {
      // Rules 18: a holder that delivered every piece gets its stake back at once; otherwise the stake is lost. There
      // is no other fine.
      const o = c.order, line = res.lines[res.lines.length - 1];
      const mine = line?.offers.find((x) => x.player === o.holder)?.sold ?? 0;
      const short = c.original[0].qty - mine;
      const hp = s.players[o.holder];
      const back = short === 0 ? o.stake : 0;
      hp.cash += back;
      if (!back) hp.stats.spent += o.stake;
      res.order = {
        name: c.name, fruit: c.original[0].fruit, qty: c.original[0].qty, holder: o.holder, price: o.price, ceiling: o.ceiling,
        sales: (line?.offers ?? []).filter((x) => x.sold > 0).map((x) => ({ player: x.player, n: x.sold, price: x.price })), short, stake: o.stake, back,
      };
      s.log.push(short === 0 ? `${hp.name} delivered the standing order in full and got the $${o.stake} stake back` : `${hp.name} delivered ${mine} of ${c.original[0].qty} for the standing order and lost the $${o.stake} stake`);
      continue;
    }
    // Sharp Ears: a walk-in this shop has peeked at tips it when the shop sells them anything. Rules 18: at most once a day.
    if (c.walkIn) {
      for (const p of suppliers) {
        if (!earful[p] || earTipped.has(p) || !c.seenBy?.includes(p)) continue;
        earTipped.add(p);
        const tip = sharpEarsTip(s.players.length);
        const pl = s.players[p];
        pl.cash += tip;
        pl.stats.earned += tip;
        res.income[p] += tip;
        (res.earful ??= []).push({ player: p, customer: c.name, tip });
      }
    }
    const done = c.wants.every((w) => w.qty <= 0);
    if (done) {
      res.happy.push(c.name);
      // Tip Jar (rules 18): a customer who leaves with their whole order tips the Tip Jar stall if it sold them any of
      // it: LOCAL_FAVOURITE_TIP when it served them alone, SHARED_TIP when other stalls helped.
      for (const q of suppliers) {
        const tj = s.players[q];
        if (tj.trait !== 'favourite') continue;
        const tip = suppliers.size === 1 ? LOCAL_FAVOURITE_TIP : SHARED_TIP;
        tj.cash += tip;
        tj.stats.earned += tip;
        res.income[q] += tip;
        (res.tipJar ??= []).push({ player: q, customer: c.name, tip });
      }
      if (suppliers.size === 1 && unitsToCustomer > 0) {
        const p = [...suppliers][0];
        const pl = s.players[p];
        // At most one favour card per shop per day, two for a Charmer (none in the core market).
        if (!s.config.core && pl.favours.length < handLimit(pl) && res.favours.filter((x) => x.player === p).length < dailyFavours(p)) {
          const fav = drawFavour(s);
          if (fav) {
            pl.favours.push(fav);
            pl.stats.favours++;
            res.favours.push({ player: p, customer: c.name, favour: fav });
          }
        }
      }
    }
  }
  // Pasar Malam: after the rush the night hawker buys 1 of each fruit left in each stall's crate (oldest first), any freshness.
  if (s.event?.hawker) {
    const price = s.event.hawker;
    s.players.forEach((pl, p) => {
      for (const f of FRUITS) {
        if (left[p][f] <= 0) continue;
        const i = crates[p][f].findIndex((c, k) => c > 0 && k < FRUIT[f].ripe.length);
        if (i < 0) continue;
        pl.stock[f][i]--;
        crates[p][f][i]--;
        left[p][f]--;
        pl.cash += price;
        pl.stats.earned += price;
        pl.stats.sold++;
        res.income[p] += price;
        (res.hawker ??= []).push({ player: p, fruit: f, price });
      }
    });
  }
  if (s.config.pulse) updatePulse(s);
  // Rules 14: nobody waits overnight. A customer who did not get everything leaves.
  for (const c of rowCustomers(s)) if (c.wants.some((w) => w.qty > 0)) res.leftAngry.push(c.name);
  res.movedToWaiting = [];
  s.results = res;
  s.phase = 'reveal';
}

/** Market pulse: a shortage pushes a fruit's marker up $1, a glut (players + 1 ripe left at the market) down $1, else back toward 0. */
function updatePulse(s: GameState) {
  const pz = (s.pulse ??= Object.fromEntries(FRUITS.map((f) => [f, 0])) as Record<FruitId, number>);
  for (const f of FRUITS) {
    const short = servingCustomers(s).some((c) => c.wants.some((w) => w.fruit === f && w.qty > 0));
    const leftAtMarket = s.market[f].slice(0, FRUIT[f].ripe.length).reduce((a, b) => a + b, 0);
    const m = pz[f] ?? 0;
    pz[f] = short ? Math.min(PULSE_MAX, m + 1) : leftAtMarket >= s.players.length + 1 ? Math.max(PULSE_MIN, m - 1) : m > 0 ? m - 1 : m < 0 ? m + 1 : 0;
  }
}

/** Customers still standing in the market after the reveal (used by the UI while showing results). */
export function finishReveal(state: GameState): GameState {
  if (state.phase !== 'reveal') throw new RuleError('Nothing to reveal');
  const s = clone(state);
  if (s.results) {
    s.history = [...(s.history ?? []), { day: s.day, lines: s.results.lines, income: s.results.income, cash: s.players.map((p) => p.cash), event: s.event?.id }];
  }
  s.secondMarket = [];
  s.firstMarket = [];
  if (s.standing && s.standing.due <= s.day) s.standing = null;
  if (s.day >= s.config.days) {
    // Last Call: the jam maker buys leftover ripe fruit.
    if (isLastCall(s)) {
      s.jam = s.players.map((pl) => {
        const n = count(pl.stock, undefined, true);
        pl.cash += n * JAM_PRICE;
        pl.stats.earned += n * JAM_PRICE;
        return n * JAM_PRICE;
      });
    }
    s.phase = 'over';
    return s;
  }
  s.phase = 'evening';
  s.turn = 0;
  // Sharp Ears (rules 18): in the evening (or just before the night when no evening is held) the stall secretly peeks
  // at one of tomorrow's walk-ins it has not seen: the first in the queue. Before, it peeked when buying ended.
  s.players.forEach((pl, p) => {
    if (pl.trait !== 'earful') return;
    const c = s.queue.find((q) => !q.seenBy?.includes(p));
    if (c) c.seenBy = [...(c.seenBy ?? []), p];
  });
  if (isDraftNight(s)) dealUpgrades(s);
  return settleEvening(s);
}

/**
 * Rules 18: does this stall have anything to decide this evening? An upgrade on offer that it can afford and has room
 * for, an evening favour card it can play (Priority, Gossip), or the Shade Cloth's choice of tonight's fruit (a person
 * names it in the evening; a computer shop picks at nightfall). A stall with no choice takes no evening turn.
 */
export function eveningChoice(s: GameState, p: number): boolean {
  const pl = s.players[p];
  if (s.phase !== 'evening' || !pl) return false;
  if (isDraftNight(s) && pl.upgrades.length < MAX_UPGRADES && (pl.upgradeOffer ?? []).some((u) => pl.cash >= UPGRADES[u].cost)) return true;
  if (pl.favours.some((id, i) => FAVOURS[id].when === 'evening' && favourBlock(s, p, i) === null)) return true;
  return pl.trait === 'keeper' && pl.kind === 'human' && shelfSteps(s, pl) > 0 && count(pl.stock) > 0;
}

/** Moves the evening on to the next stall (in line-up order) with something to decide. When no stall has, night falls. */
function settleEvening(s: GameState): GameState {
  while (s.turn < s.order.length && !eveningChoice(s, s.order[s.turn])) s.turn++;
  return s.turn >= s.order.length ? nightfall(s) : s;
}

// ---------- evening ----------

function dealUpgrades(s: GameState) {
  for (const pl of s.players) {
    // Rules 14: a stall has room for MAX_UPGRADES upgrades.
    const open = pl.upgrades.length >= MAX_UPGRADES ? [] : (Object.keys(UPGRADES) as UpgradeId[]).filter((u) => !pl.upgrades.includes(u));
    // Rules 17: every upgrade the stall has not built is on offer (as on the table, where all five piles are out).
    pl.upgradeOffer = open;
  }
}

export function canUpgrade(s: GameState, p: number, u: UpgradeId): string | null {
  const pl = s.players[p];
  if (!s.config.upgrades) return 'Upgrades are off';
  if (s.phase !== 'evening' || activePlayer(s) !== p) return 'Not your turn';
  if (!isDraftNight(s)) return 'Upgrades are offered after Market Days';
  if (pl.upgrades.includes(u)) return 'Already built';
  if (pl.upgrades.length >= MAX_UPGRADES) return `Your stall has room for ${MAX_UPGRADES} upgrades`;
  if (pl.upgradeOffer && !pl.upgradeOffer.includes(u)) return 'Not on offer tonight';
  if (pl.cash < UPGRADES[u].cost) return 'Not enough cash';
  return null;
}

export function buyUpgrade(state: GameState, p: number, u: UpgradeId): GameState {
  const why = canUpgrade(state, p, u);
  if (why) throw new RuleError(why);
  const s = clone(state);
  const pl = s.players[p];
  pl.cash -= UPGRADES[u].cost;
  pl.stats.spent += UPGRADES[u].cost;
  pl.upgrades.push(u);
  // Ripening Room: green mangoes already on the shelf move up to one night from ripe.
  if (u === 'ripening') for (const f of FRUITS) {
    const t = pl.stock[f], ripe = FRUIT[f].ripe.length;
    for (let i = ripe + 1; i < t.length; i++) { t[ripe] += t[i]; t[i] = 0; }
  }
  pl.upgradeOffer = []; // one upgrade after each Market Day
  s.log.push(`${pl.name} built a ${UPGRADES[u].title}`);
  return s;
}

export function canShade(s: GameState, p: number, f: FruitId | null): string | null {
  const pl = s.players[p];
  if (!pl || pl.trait !== 'keeper') return 'Only the Shade Cloth can do that';
  if (s.phase !== 'evening' || activePlayer(s) !== p) return 'Not your turn';
  if (f !== null && !FRUITS.includes(f)) return 'Unknown fruit';
  return null;
}

/** Shade Cloth: name the fruit that does not age on this shop's shelf tonight (null: none). */
export function setShade(state: GameState, p: number, f: FruitId | null): GameState {
  const why = canShade(state, p, f);
  if (why) throw new RuleError(why);
  const s = clone(state);
  s.players[p].shade = f;
  return s;
}

/**
 * The Shade Cloth's best fruit tonight: the one whose pieces lose the most value if they age (a step toward soft, or
 * spoiling), less what ageing would gain by ripening green fruit. Null when nothing would lose value. Computer shops
 * use it, and it is the suggestion for a person.
 */
export function shadePick(s: GameState, p: number): FruitId | null {
  const pl = s.players[p];
  const steps = shelfSteps(s, pl);
  if (steps <= 0) return null;
  let best: FruitId | null = null;
  let bestLoss = 0;
  for (const f of FRUITS) {
    const def = FRUIT[f];
    let loss = 0;
    pl.stock[f].forEach((c, i) => {
      if (!c) return;
      const to = i - steps;
      if (i >= def.ripe.length) loss -= to < def.ripe.length ? c : 0; // green fruit that would ripen tonight
      else if (to < 0) loss += c * (def.cost.fresh + 1); // spoils
      else loss += c * (def.drop[to] - def.drop[i]);
    });
    if (loss > bestLoss) { bestLoss = loss; best = f; }
  }
  return best;
}

export function endEvening(state: GameState, p: number): GameState {
  requireActive(state, p, 'evening');
  const s = clone(state);
  s.turn++;
  return settleEvening(s);
}

function nightfall(s: GameState): GameState {
  const heat = s.event?.ageExtra ?? 0;
  age(s.market, Math.max(0, 1 + heat));
  // Shade Cloth: a computer shop (or a person who did not choose) shades the fruit with the most to lose.
  s.players.forEach((pl, p) => { if (pl.trait === 'keeper' && (pl.kind === 'ai' || pl.shade === undefined)) pl.shade = shadePick(s, p); });
  for (const pl of s.players) ageShop(s, pl);
  s.firstPlayer = (s.firstPlayer + 1) % s.players.length;
  s.day++;
  startDay(s);
  return s;
}

// The night on one shop's shelf. ageShop (the rules) and nightOutlook / leavingTonight (the forecast the screens show)
// share shelfSteps, ageTrack and splitNight, so the forecast cannot drift from what the night really does.

/** What tonight does to a shop's shelf: pieces that spoil, and pieces its Juice Bar turns into juice instead. */
export interface NightOutlook { spoil: number; juice: number }

/** Nights a shop's fruit ages tonight: one; a Heatwave adds one; a Monsoon (ageExtra -1) stops all ageing. */
function shelfSteps(s: GameState, _pl: Player): number {
  return Math.max(0, 1 + (s.event?.ageExtra ?? 0));
}

/** Ages one shop's shelf by tonight's steps, in place; Shade Cloth pieces sit out. Returns the pieces that left, by fruit. */
function ageShelf(s: GameState, pl: Player, stock: Stock): Record<FruitId, number> {
  const steps = shelfSteps(s, pl);
  const out = {} as Record<FruitId, number>;
  for (const f of FRUITS) out[f] = pl.trait === 'keeper' && pl.shade === f ? 0 : ageTrack(stock[f], steps);
  return out;
}

/** Of the pieces leaving a shelf tonight, a Juice Bar juices up to JUICE_CAP; the rest spoil. */
function splitNight(pl: Player, leaving: number): NightOutlook {
  const juice = pl.upgrades.includes('juicebar') ? Math.min(JUICE_CAP, leaving) : 0;
  return { spoil: leaving - juice, juice };
}

function ageShop(s: GameState, pl: Player) {
  const left = ageShelf(s, pl, pl.stock);
  const { spoil, juice } = splitNight(pl, FRUITS.reduce((a, f) => a + left[f], 0));
  if (juice > 0) {
    pl.cash += JUICE_VALUE * juice;
    pl.stats.earned += JUICE_VALUE * juice;
    pl.stats.juiced = (pl.stats.juiced ?? 0) + juice;
    s.log.push(`${pl.name} juiced ${juice} fruit`);
  }
  pl.stats.spoiled += spoil;
}

/**
 * Ripe pieces of each fruit that leave shop `p`'s shelf tonight (spoiled or juiced), by the night's own steps. Nothing
 * when no night follows (the final day). Read in the evening it includes a Juice Bar built tonight; read at
 * the sales card of a draft night, an upgrade built afterwards can still change it.
 */
export function leavingTonight(s: GameState, p: number): Record<FruitId, number> {
  const pl = s.players[p];
  if (s.phase === 'over' || s.day >= s.config.days) return Object.fromEntries(FRUITS.map((f) => [f, 0])) as Record<FruitId, number>;
  // A Shade Cloth that has not chosen yet is forecast with its suggested fruit.
  const view = pl.trait === 'keeper' && pl.shade === undefined ? { ...pl, shade: shadePick(s, p) } : pl;
  return ageShelf(s, view, clone(pl.stock));
}

/** Tonight's forecast for shop `p`: how many pieces will spoil and how many its Juice Bar will juice (JUICE_VALUE each). */
export function nightOutlook(s: GameState, p: number): NightOutlook {
  const leaving = leavingTonight(s, p);
  return splitNight(s.players[p], FRUITS.reduce((a, f) => a + leaving[f], 0));
}

export function notSoCount(stock: Stock): number {
  let n = 0;
  for (const f of FRUITS) FRUIT[f].ripe.forEach((st, i) => { if (st === 'notso') n += stock[f][i]; });
  return n;
}

// ---------- end ----------

/** The stalls from first to last: most cash, then most fruit sold. Stalls level on both keep their seat order here,
 *  but they are not ranked against each other: see `winners` and `places`. */
export function ranking(s: GameState): number[] {
  return s.players
    .map((_, i) => i)
    .sort((a, b) => s.players[b].cash - s.players[a].cash || s.players[b].stats.sold - s.players[a].stats.sold);
}

/** Are two stalls level at the end: the same cash and the same number of fruit sold? */
function level(s: GameState, a: number, b: number): boolean {
  return s.players[a].cash === s.players[b].cash && s.players[a].stats.sold === s.players[b].stats.sold;
}

/** Rules 18: the stalls that win. Most cash wins; a tie goes to the stall that sold more fruit; stalls still tied
 *  share the win (there is no seat-number tie-break). */
export function winners(s: GameState): number[] {
  const order = ranking(s);
  return order.filter((i) => level(s, i, order[0]));
}

/** Each stall's finishing place by seat (1 is first). Stalls level on cash and fruit sold share a place, and the next
 *  place is skipped (1, 1, 3). */
export function places(s: GameState): number[] {
  const order = ranking(s);
  const out = new Array<number>(s.players.length).fill(0);
  order.forEach((i, k) => { out[i] = k > 0 && level(s, i, order[k - 1]) ? out[order[k - 1]] : k + 1; });
  return out;
}

// ---------- actions as data ----------
// One entry point for every player decision, so the same code drives solo play and the
// online server. Each action is validated by the rule functions above.

export type Action =
  | { kind: 'begin' }
  | { kind: 'buy'; fruit: FruitId; pos: number }
  | { kind: 'endBuy' }
  | { kind: 'favour'; idx: number; args?: FavourArgs }
  | { kind: 'stall'; stall: Stall; crate?: Crate }
  | { kind: 'prices'; posts: Post[] }
  | { kind: 'tie'; play: boolean }
  | { kind: 'finish' }
  | { kind: 'upgrade'; upgrade: UpgradeId }
  | { kind: 'endEvening' }
  | { kind: 'trait'; trait: TraitId }
  | { kind: 'shade'; fruit: FruitId | null }
  | { kind: 'order'; price: number | null };

export function applyAction(s: GameState, p: number, a: Action): GameState {
  switch (a.kind) {
    case 'begin': return beginBuying(s);
    case 'buy': return buy(s, p, a.fruit, a.pos);
    case 'endBuy': return endBuyTurn(s, p);
    case 'favour': return playFavour(s, p, a.idx, a.args ?? {});
    case 'stall': return openStall(s, p, a.stall, a.crate);
    case 'prices': return submitPrices(s, p, a.posts);
    case 'tie': return decideTie(s, p, a.play);
    case 'finish': return finishReveal(s);
    case 'upgrade': return buyUpgrade(s, p, a.upgrade);
    case 'endEvening': return endEvening(s, p);
    case 'trait': return pickTrait(s, p, a.trait);
    case 'shade': return setShade(s, p, a.fruit);
    case 'order': return bidOrder(s, p, a.price);
  }
}
