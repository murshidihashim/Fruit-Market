// Core rules (rules version 4, "tabletop edition"). Every action takes a state and returns a new state
// (the input is never changed), so the UI can keep history and the whole game can be saved as JSON.
//
// A day: morning (event, lorry, tomorrow's strip) -> buying (poorest first) -> customers arrive ->
// open stalls (each shop puts fruit out for sale; quantities become public together) -> pricing
// (one secret price per fruit, revealed together at the bell) -> sales (queue order, cheapest stall
// first, leftover demand spills to the next stall) -> evening (specialities after Market Days,
// evening favours) -> night (fruit ages).

import {
  BARROW_BUY, BARROW_SHELF, BASE_BUY, BASE_SHELF, CUSTOMER_CARDS, EVENT_CARDS, FARMER_CARDS,
  FAVOUR_DECK, FAVOUR_HAND_LIMIT, FAVOURS, FRUIT, FRUITS, GENEROUS_BONUS, JAM_PRICE, JUICE_TIP, LAST_CALL_BONUS,
  LOCAL_FAVOURITE_TIP, MARKET_DAY_EVERY, NEST_EGG_BONUS, PULSE_MAX, PULSE_MIN, START_CASH, STREET_PRICE,
  CHARACTER_TRAIT, TRAIT_OFFER, TRAITS, UPGRADE_OFFER, UPGRADES,
  freshPos, stageAt, trackLength,
  type CustomerCard, type EventCard, type FarmerCard, type FavourId, type FruitId, type TraitId, type UpgradeId, type Want,
} from './data';
import { Rng } from './rng';

export type Level = 'easy' | 'normal' | 'hard';
export type Stock = Record<FruitId, number[]>;

export interface PlayerConfig { name: string; kind: 'human' | 'ai'; level?: Level; avatar: string; quip?: string }

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

export interface Stats { sold: number; spoiled: number; earned: number; spent: number; bestSale: number; favours: number }

export interface Player extends PlayerConfig {
  cash: number;
  stock: Stock;
  favours: FavourId[];
  upgrades: UpgradeId[];
  boughtToday: number;
  /** What this shop paid for fruit today (for the day's ledger). */
  spentToday: number;
  favouredTrade: boolean;
  stats: Stats;
  /** Merchant trait, picked from `traitOffer` on the first morning. */
  trait?: TraitId | null;
  traitOffer?: TraitId[];
  /** Specialities this shop may build tonight (empty on nights without a draft). */
  upgradeOffer?: UpgradeId[];
}

export interface Customer {
  id: number;
  name: string;
  wants: Want[];
  original: Want[];
  /** A walk-in: drawn a day early and shown face down (only the fruits on the back) until they arrive. */
  walkIn?: boolean;
  /** Players who have seen this face-down card (Market Gossip). */
  seenBy?: number[];
  /** Street-price option: this customer pays $2 more than the street price. */
  generous?: boolean;
}

/** One secret price per fruit (the fruit a shop put out for sale). */
export interface Post { fruit: FruitId; price: number }
/** How many of each fruit a shop puts out for sale today (public once every shop has opened). */
export type Stall = Partial<Record<FruitId, number>>;

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
}

export interface DayRecord { day: number; lines: LineResult[]; income: number[]; cash: number[] }

export type Phase = 'morning' | 'buy' | 'stall' | 'bid' | 'reveal' | 'evening' | 'over';

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
  firstMarket: Customer[];
  secondMarket: Customer[];
  firstPlayer: number;
  priorityNext: number | null;
  order: number[];
  turn: number;
  /** What each shop put out for sale today (null until it has opened its stall). */
  stalls: (Stall | null)[];
  /** Each shop's secret prices (null until it has priced). */
  bids: (Post[] | null)[];
  results: DayResult | null;
  /** Market pulse markers (advanced option). */
  pulse?: Record<FruitId, number>;
  /** Last Call: what the jam maker paid each shop for leftover fruit. */
  jam?: number[];
  /** One entry per finished day, for recaps. Presentation only. */
  history?: DayRecord[];
  /** Each shop's cash when the day began (for the day's net result). */
  dayStartCash?: number[];
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

/** What this shop pays for one fruit at the market (a Bargain Hunter's first fruit each day is $1 off). */
export function buyCost(s: GameState, p: number, f: FruitId, pos: number): number {
  const c = marketCost(s, f, pos);
  const pl = s.players[p];
  return pl?.trait === 'bargain' && pl.boughtToday === 0 ? Math.max(1, c - 1) : c;
}

export function marketCost(s: GameState, f: FruitId, pos: number): number {
  const stage = stageAt(f, pos);
  return Math.max(1, FRUIT[f].cost[stage] + (s.event?.cost ?? 0));
}

export const marketDaysOn = (s: GameState): boolean => s.config.marketDays !== false;

/** Market Day: every 3rd day (never the last). One more walk-in; the lorry still comes. */
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
  const base = s.config.street ? STREET_PRICE[w.fruit] + (generous ? GENEROUS_BONUS : 0) : w.max;
  return Math.max(1, base + priceMod(s, w.fruit));
}

export function minPrice(s: GameState, f: FruitId): number {
  return s.event?.minPrice ? s.event.minPrice[f] : 1;
}

/** Most a customer pays for this fruit at this position on the track (unripe can't be sold). */
export function capAt(f: FruitId, pos: number, max: number): number {
  const d = FRUIT[f].drop;
  if (pos >= d.length) return -1;
  return max - d[pos];
}

/** As capAt, for this shop: a Premium Display lets fresh fruit go $1 higher. */
export function capFor(pl: Player, f: FruitId, pos: number, max: number): number {
  const c = capAt(f, pos, max);
  return c > 0 && pl.upgrades.includes('premium') && stageAt(f, pos) === 'fresh' ? c + 1 : c;
}

/** Customers currently in the market, in the order they are served (waiting longest first). */
export function servingCustomers(s: GameState): Customer[] {
  return [...s.secondMarket, ...s.firstMarket];
}

export function activePlayer(s: GameState): number {
  if (s.phase === 'stall') return s.stalls.findIndex((x) => x === null);
  if (s.phase === 'bid') return s.bids.findIndex((b) => b === null);
  if (s.phase === 'buy' || s.phase === 'evening') return s.order[s.turn] ?? -1;
  return -1;
}

// ---------- pacing (no formulas: everything is printed or counted) ----------

/** 0 on the first day, 1 on the last. */
export function progress(s: GameState, day = s.day): number {
  return s.config.days <= 1 ? 1 : Math.min(1, (day - 1) / (s.config.days - 1));
}

/** Walk-ins on a day: players - 2 every day (rules 5: no extra walk-in in the second half); +1 on Market Days; plus that day's event. */
export function walkInsOn(s: GameState, day: number, event: EventCard | null): number {
  const base = Math.max(0, s.players.length - 2);
  return Math.max(0, base + (isMarketDay(s, day) ? 1 : 0) + (event?.walkIns ?? 0));
}

/** Walk-ins arriving today (face down in the queue until the crowd comes). */
export function walkInsToday(s: GameState): number {
  return s.phase === 'morning' || s.phase === 'buy' ? s.queue.length : servingCustomers(s).filter((c) => c.walkIn).length;
}

/** Fruit the farmers bring for one fruit on a card (printed for 3 shops; 2 shops one less, 4 shops one more). */
export function printedSupply(card: FarmerCard, f: FruitId, shops: number): number {
  const listed = card.supply[f];
  let n = listed ?? 1;
  if (shops === 2 && listed !== undefined) n = Math.max(1, n - 1);
  if (shops >= 4) n += 1;
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
  const wants = card.wants.map((w) => ({ ...w }));
  const c: Customer = { id: s.nextId++, name: card.name, wants, original: clone(wants) };
  if (walkIn) { c.walkIn = true; c.seenBy = []; }
  // Street prices: customers whose card pays well are "generous".
  if (wants.some((w) => w.max >= STREET_PRICE[w.fruit] + GENEROUS_BONUS)) c.generous = true;
  return c;
}

function drawCustomer(s: GameState, walkIn = false): Customer {
  if (s.customerDeck.length === 0) {
    const inPlay = new Set([...s.firstMarket, ...s.secondMarket, ...s.queue, s.forecast].filter(Boolean).map((c) => c!.name));
    s.customerDeck = withRng(s, (r) => r.shuffle(CUSTOMER_CARDS.map((_, i) => i).filter((i) => !inPlay.has(CUSTOMER_CARDS[i].name))));
  }
  return makeCustomer(s, CUSTOMER_CARDS[s.customerDeck.shift()!], walkIn);
}

function drawFarmer(s: GameState): FarmerCard {
  if (s.farmerDeck.length === 0) s.farmerDeck = withRng(s, (r) => r.shuffle(FARMER_CARDS.map((_, i) => i)));
  return FARMER_CARDS[s.farmerDeck.shift()!];
}

function drawEvent(s: GameState): EventCard {
  if (s.eventDeck.length === 0) s.eventDeck = withRng(s, (r) => r.shuffle(EVENT_CARDS.map((_, i) => i)));
  return EVENT_CARDS[s.eventDeck.shift()!];
}

function drawFavour(s: GameState): FavourId {
  if (s.favourDeck.length === 0) s.favourDeck = withRng(s, (r) => r.shuffle([...FAVOUR_DECK]));
  return s.favourDeck.shift()!;
}

function ageFruit(stock: Stock, f: FruitId, steps: number): number {
  let spoiled = 0;
  const t = stock[f];
  for (let k = 0; k < steps; k++) {
    spoiled += t[0];
    for (let i = 0; i < t.length - 1; i++) t[i] = t[i + 1];
    t[t.length - 1] = 0;
  }
  return spoiled;
}

function age(stock: Stock, steps: number): number {
  return FRUITS.reduce((a, f) => a + ageFruit(stock, f, steps), 0);
}

function applyTrait(s: GameState, p: number, t: TraitId) {
  const pl = s.players[p];
  pl.trait = t;
  if (t === 'nestegg') pl.cash = START_CASH + NEST_EGG_BONUS;
  if (t === 'charmer') pl.favours.push(drawFavour(s), drawFavour(s), drawFavour(s));
  s.dayStartCash = s.players.map((x) => x.cash);
  s.log.push(`${pl.name} is a ${TRAITS[t].title}`);
}

// ---------- setup ----------

export function newGame(config: GameConfig): GameState {
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
    favourDeck: r.shuffle([...FAVOUR_DECK]),
    event: null,
    nextEvent: null,
    delivery: {},
    deliveryUnripe: null,
    forecast: null,
    queue: [],
    firstMarket: [],
    secondMarket: [],
    firstPlayer: r.int(players.length),
    priorityNext: null,
    order: [],
    turn: 0,
    stalls: players.map(() => null),
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
  s.forecast = drawCustomer(s);
  for (let i = 0; i < walkInsOn(s, 1, null); i++) s.queue.push(drawCustomer(s, true));
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
  if (!pl || s.phase !== 'morning' || s.day !== 1) return 'Traits are picked on the first morning';
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
  if (s.day > 1 && s.config.events) s.event = s.nextEvent ?? drawEvent(s);
  // Tomorrow's event is announced a day early. A night-only event is never the last day's event.
  s.nextEvent = null;
  if (s.config.events && s.day < s.config.days) {
    s.nextEvent = drawEvent(s);
    if (s.day + 1 === s.config.days && s.nextEvent.inspector) s.nextEvent = drawEvent(s);
  }
  s.delivery = {};
  s.deliveryUnripe = null;
  // Today's lorry was announced yesterday. The lorry comes every day, Market Days too (rules 5).
  const card = s.nextFarmer ?? drawFarmer(s);
  s.nextFarmer = s.day < s.config.days ? drawFarmer(s) : null;
  if (card && !s.event?.noDelivery) {
    const e = s.event;
    const shops = s.players.length;
    const unripe = s.config.unripe && card.unripe ? card.unripe : null;
    s.deliveryUnripe = unripe;
    for (const f of FRUITS) {
      let n = printedSupply(card, f, shops);
      if (e?.supplyPerTwo) n += e.supplyPerTwo * Math.ceil(shops / 2);
      if (e?.supplyPerShop?.[f]) n += e.supplyPerShop[f]! * shops;
      if (e?.noFruit === f) n = 0;
      if (e?.supplyMult) n = Math.ceil(n * e.supplyMult);
      if (n <= 0) continue;
      s.delivery[f] = n;
      const pos = f === unripe ? s.market[f].length - 1 : freshPos(f);
      s.market[f][pos] += n;
    }
  }
  for (const p of s.players) {
    p.boughtToday = 0;
    p.spentToday = 0;
    p.favouredTrade = false;
    p.upgradeOffer = [];
  }
  s.dayStartCash = s.players.map((p) => p.cash);
  const n = s.players.length;
  // The poorest shop buys first (ties go round the table), so leaders can't run away with it.
  const rota = Array.from({ length: n }, (_, i) => (s.firstPlayer + i) % n);
  s.order = s.day === 1 ? rota : [...rota].sort((a, b) => s.players[a].cash - s.players[b].cash || rota.indexOf(a) - rota.indexOf(b));
  if (s.priorityNext !== null) {
    s.order = [s.priorityNext, ...s.order.filter((i) => i !== s.priorityNext)];
    s.priorityNext = null;
  }
  s.turn = 0;
  s.stalls = s.players.map(() => null);
  s.bids = s.players.map(() => null);
  s.results = null;
}

// ---------- morning ----------

export function beginBuying(state: GameState): GameState {
  if (state.phase !== 'morning') throw new RuleError('Not morning');
  const s = clone(state);
  s.players.forEach((pl, i) => { if (pl.traitOffer?.length && !pl.trait) applyTrait(s, i, pl.traitOffer[0]); });
  s.phase = 'buy';
  s.turn = 0;
  return s;
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
  if (pl.boughtToday >= buyLimit(pl)) return `You can buy ${buyLimit(pl)} fruits a day`;
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
  pl.stock[f][pos]++;
  pl.cash -= cost;
  pl.stats.spent += cost;
  pl.spentToday += cost;
  pl.boughtToday++;
  return s;
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
  if (s.event?.extra) arriving.push(makeCustomer(s, s.event.extra));
  s.firstMarket = arriving;
  // Tomorrow's queue: one expected customer face up, the walk-ins face down.
  s.queue = [];
  s.forecast = null;
  if (s.day < s.config.days) {
    s.forecast = drawCustomer(s);
    for (let i = 0; i < walkInsOn(s, s.day + 1, s.nextEvent); i++) s.queue.push(drawCustomer(s, true));
  }
  s.phase = 'stall';
  s.stalls = s.players.map(() => null);
  s.bids = s.players.map(() => null);
}

// ---------- favours ----------

export interface FavourArgs { fruit?: FruitId; pos?: number }

export function canPlayFavour(s: GameState, p: number, idx: number): string | null {
  const pl = s.players[p];
  const id = pl.favours[idx];
  if (!id) return 'No such card';
  const def = FAVOURS[id];
  if (activePlayer(s) !== p) return 'Not your turn';
  if (def.when !== s.phase) return `Play this during the ${def.when === 'bid' ? 'pricing' : def.when} phase`;
  if (id === 'priority' && s.day >= s.config.days) return 'There is no tomorrow';
  if (id === 'favouredTrade' && pl.favouredTrade) return 'Already active';
  if (id === 'gossip' && (s.queue.length === 0 || s.queue.every((c) => c.seenBy?.includes(p)))) return 'No walk-ins to hear about';
  return null;
}

export function playFavour(state: GameState, p: number, idx: number, args: FavourArgs = {}): GameState {
  const why = canPlayFavour(state, p, idx);
  if (why) throw new RuleError(why);
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
      pl.stock[fruit][pos]++;
      break;
    }
    case 'priority':
      s.priorityNext = p;
      break;
    case 'goodRiddance':
      for (const f of FRUITS) {
        const ripeLen = FRUIT[f].ripe.length;
        for (let i = 0; i < ripeLen; i++) {
          const n = pl.stock[f][i];
          if (!n) continue;
          s.market[f][i] += n;
          pl.stock[f][i] = 0;
          pl.cash += n;
          pl.stats.earned += n;
        }
      }
      break;
    case 'favouredTrade':
      pl.favouredTrade = true;
      break;
    case 'fridge':
      for (const f of FRUITS) {
        const t = pl.stock[f];
        const top = freshPos(f);
        for (let i = top - 1; i >= 0; i--) {
          t[i + 1] += t[i];
          t[i] = 0;
        }
      }
      break;
  }
  pl.favours.splice(idx, 1);
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

export function openStall(state: GameState, p: number, stall: Stall): GameState {
  requireActive(state, p, 'stall');
  const err = validateStall(state, p, stall);
  if (err) throw new RuleError(err);
  const s = clone(state);
  s.stalls[p] = Object.fromEntries(Object.entries(stall).filter(([, n]) => n > 0)) as Stall;
  if (s.stalls.every((x) => x !== null)) startPricing(s);
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
  if (s.bids.every((b) => b !== null)) resolve(s);
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
    if (b.price < minPrice(s, b.fruit)) return `Minimum price for ${FRUIT[b.fruit].plural.toLowerCase()} is $${minPrice(s, b.fruit)}`;
    if (b.price > 30) return 'That price is too high';
  }
  for (const f of FRUITS) if (forSale(s, p, f) > 0 && !seen.has(f)) return `Set a price for your ${FRUIT[f].plural.toLowerCase()}`;
  return null;
}

export function submitPrices(state: GameState, p: number, posts: Post[], useFavouredTrade = false): GameState {
  requireActive(state, p, 'bid');
  let s = clone(state);
  if (useFavouredTrade) {
    const idx = s.players[p].favours.indexOf('favouredTrade');
    if (idx >= 0) s = playFavour(s, p, idx);
  }
  const err = validatePrices(s, p, posts);
  if (err) throw new RuleError(err);
  s.bids[p] = posts.map((b) => ({ fruit: b.fruit, price: b.price }));
  if (s.bids.every((b) => b !== null)) resolve(s);
  return s;
}

export function postedPrice(s: GameState, p: number, f: FruitId): number | null {
  return s.bids[p]?.find((b) => b.fruit === f)?.price ?? null;
}

/** Positions (oldest first) a shop would hand over for this customer at this price, up to `qty`. */
export function eligible(pl: Player, stock: Stock, f: FruitId, qty: number, price: number, max: number): number[] {
  const out: number[] = [];
  const t = stock[f];
  const ripeLen = FRUIT[f].ripe.length;
  for (let i = 0; i < ripeLen && out.length < qty; i++) {
    if (capFor(pl, f, i, max) < price) continue;
    for (let k = 0; k < t[i] && out.length < qty; k++) out.push(i);
  }
  return out;
}

/** Highest price this shop could ask a customer with this top price, with its current stock. */
export function bestCap(stock: Stock, f: FruitId, max: number, pl?: Player): number {
  const ripeLen = FRUIT[f].ripe.length;
  for (let i = ripeLen - 1; i >= 0; i--) if (stock[f][i] > 0) return pl ? capFor(pl, f, i, max) : capAt(f, i, max);
  return 0;
}

function resolve(s: GameState) {
  const res: DayResult = {
    lines: [], favours: [], happy: [], leftAngry: [], movedToWaiting: [],
    income: s.players.map(() => 0), spent: s.players.map((p) => p.spentToday),
  };
  const left = s.players.map((_, p) => Object.fromEntries(FRUITS.map((f) => [f, forSale(s, p, f)])) as Record<FruitId, number>);
  const orderIdx = (p: number) => s.order.indexOf(p);
  const tieWin = (a: number, b: number) => Number(s.players[b].favouredTrade) - Number(s.players[a].favouredTrade)
    || Number(s.players[b].trait === 'haggler') - Number(s.players[a].trait === 'haggler');

  for (const c of servingCustomers(s)) {
    const suppliers = new Set<number>();
    let unitsToCustomer = 0;
    for (const w of c.wants) {
      if (w.qty <= 0) continue;
      const max = effectiveMax(s, w, c.generous);
      const offers: (Offer & { used: number[] })[] = [];
      s.players.forEach((pl, p) => {
        const price = postedPrice(s, p, w.fruit);
        if (price === null || left[p][w.fruit] <= 0) return;
        const used = eligible(pl, pl.stock, w.fruit, Math.min(left[p][w.fruit], w.qty), price, max);
        if (used.length === 0) {
          if (count(pl.stock, w.fruit, true) > 0) offers.push({ player: p, qty: 0, price, sold: 0, freshness: 0, tooOld: true, used });
          return;
        }
        offers.push({ player: p, qty: used.length, price, sold: 0, freshness: Math.max(...used), used });
      });
      // Cheapest first. Ties: Favoured Trade, then a Haggler, then fresher fruit, then today's buying order (rules 5:
      // cash changes while customers are paid, so it is no longer a tie-break; the order was set at dawn, poorest first).
      offers.sort((a, b) => Number(!!a.tooOld) - Number(!!b.tooOld) || a.price - b.price || tieWin(a.player, b.player)
        || b.freshness - a.freshness || orderIdx(a.player) - orderIdx(b.player));
      let need = w.qty;
      for (const o of offers) {
        if (need <= 0 || o.tooOld) continue;
        const n = Math.min(need, o.qty);
        o.sold = n;
        need -= n;
        const pl = s.players[o.player];
        const sold = o.used.slice(0, n);
        for (const i of sold) pl.stock[w.fruit][i]--;
        left[o.player][w.fruit] -= n;
        // Juice Bar: each older fruit sold (okay or not so) earns a juice tip as well.
        const juice = pl.upgrades.includes('juicebar') ? JUICE_TIP * sold.filter((i) => stageAt(w.fruit, i) !== 'fresh').length : 0;
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
    const done = c.wants.every((w) => w.qty <= 0);
    if (done) {
      res.happy.push(c.name);
      if (suppliers.size === 1 && unitsToCustomer > 0) {
        const p = [...suppliers][0];
        const pl = s.players[p];
        if (pl.trait === 'favourite') {
          pl.cash += LOCAL_FAVOURITE_TIP;
          pl.stats.earned += LOCAL_FAVOURITE_TIP;
          res.income[p] += LOCAL_FAVOURITE_TIP;
        }
        // At most one favour card per shop per day (none in the core market).
        if (!s.config.core && pl.favours.length < handLimit(pl) && !res.favours.some((x) => x.player === p)) {
          const fav = drawFavour(s);
          pl.favours.push(fav);
          pl.stats.favours++;
          res.favours.push({ player: p, customer: c.name, favour: fav });
        }
      }
    }
  }
  if (s.config.pulse) updatePulse(s);
  for (const c of s.secondMarket) if (c.wants.some((w) => w.qty > 0)) res.leftAngry.push(c.name);
  const waiting = s.firstMarket.filter((c) => c.wants.some((w) => w.qty > 0));
  res.movedToWaiting = waiting.map((c) => c.name);
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
    s.history = [...(s.history ?? []), { day: s.day, lines: s.results.lines, income: s.results.income, cash: s.players.map((p) => p.cash) }];
  }
  s.secondMarket = s.firstMarket.filter((c) => c.wants.some((w) => w.qty > 0));
  s.firstMarket = [];
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
  if (isDraftNight(s)) dealUpgrades(s);
  // Hold an evening whenever anyone has a favour card. Only the number of cards is public, so
  // checking for evening cards would tell rivals what someone is holding.
  const anyCard = s.players.some((p) => p.favours.length > 0);
  if (!isDraftNight(s) && !anyCard) return nightfall(s);
  return s;
}

// ---------- evening ----------

function dealUpgrades(s: GameState) {
  for (const pl of s.players) {
    const open = (Object.keys(UPGRADES) as UpgradeId[]).filter((u) => !pl.upgrades.includes(u));
    pl.upgradeOffer = withRng(s, (r) => r.shuffle(open)).slice(0, UPGRADE_OFFER);
  }
}

export function canUpgrade(s: GameState, p: number, u: UpgradeId): string | null {
  const pl = s.players[p];
  if (!s.config.upgrades) return 'Specialities are off';
  if (s.phase !== 'evening' || activePlayer(s) !== p) return 'Not your turn';
  if (!isDraftNight(s)) return 'Specialities are offered after Market Days';
  if (pl.upgrades.includes(u)) return 'Already built';
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
  s.log.push(`${pl.name} built a ${UPGRADES[u].title}`);
  return s;
}

export function endEvening(state: GameState, p: number): GameState {
  requireActive(state, p, 'evening');
  const s = clone(state);
  s.turn++;
  if (s.turn >= s.order.length) return nightfall(s);
  return s;
}

function nightfall(s: GameState): GameState {
  const heat = s.event?.ageExtra ?? 0;
  const fine = s.event?.inspector ?? 0;
  if (fine) {
    for (const pl of s.players) {
      const n = notSoCount(pl.stock);
      const paid = Math.min(pl.cash, n * fine);
      pl.cash -= paid;
      pl.stats.spent += paid;
      if (paid) s.log.push(`${pl.name} was fined $${paid}`);
    }
  }
  age(s.market, 1 + heat);
  for (const pl of s.players) ageShop(s, pl, heat);
  s.firstPlayer = (s.firstPlayer + 1) % s.players.length;
  s.day++;
  startDay(s);
  return s;
}

function ageShop(s: GameState, pl: Player, heat: number) {
  const room = pl.upgrades.includes('coldroom');
  const steps = (room && s.day % 2 === 1 ? 0 : 1) + (room ? 0 : heat);
  let spoiled = 0;
  for (const f of FRUITS) spoiled += ageFruit(pl.stock, f, steps);
  if (pl.upgrades.includes('juicebar') && spoiled > 0) {
    const juiced = Math.min(3, spoiled);
    pl.cash += 2 * juiced;
    pl.stats.earned += 2 * juiced;
    spoiled -= juiced;
    s.log.push(`${pl.name} juiced ${juiced} fruit`);
  }
  pl.stats.spoiled += spoiled;
}

export function notSoCount(stock: Stock): number {
  let n = 0;
  for (const f of FRUITS) FRUIT[f].ripe.forEach((st, i) => { if (st === 'notso') n += stock[f][i]; });
  return n;
}

// ---------- end ----------

export function ranking(s: GameState): number[] {
  return s.players
    .map((_, i) => i)
    .sort((a, b) => s.players[b].cash - s.players[a].cash || s.players[b].stats.sold - s.players[a].stats.sold);
}

// ---------- actions as data ----------
// One entry point for every player decision, so the same code drives solo play and the
// online server. Each action is validated by the rule functions above.

export type Action =
  | { kind: 'begin' }
  | { kind: 'buy'; fruit: FruitId; pos: number }
  | { kind: 'endBuy' }
  | { kind: 'favour'; idx: number; args?: FavourArgs }
  | { kind: 'stall'; stall: Stall }
  | { kind: 'prices'; posts: Post[]; favoured: boolean }
  | { kind: 'finish' }
  | { kind: 'upgrade'; upgrade: UpgradeId }
  | { kind: 'endEvening' }
  | { kind: 'trait'; trait: TraitId };

export function applyAction(s: GameState, p: number, a: Action): GameState {
  switch (a.kind) {
    case 'begin': return beginBuying(s);
    case 'buy': return buy(s, p, a.fruit, a.pos);
    case 'endBuy': return endBuyTurn(s, p);
    case 'favour': return playFavour(s, p, a.idx, a.args ?? {});
    case 'stall': return openStall(s, p, a.stall);
    case 'prices': return submitPrices(s, p, a.posts, a.favoured);
    case 'finish': return finishReveal(s);
    case 'upgrade': return buyUpgrade(s, p, a.upgrade);
    case 'endEvening': return endEvening(s, p);
    case 'trait': return pickTrait(s, p, a.trait);
  }
}
