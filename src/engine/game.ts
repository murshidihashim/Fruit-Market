// Core rules. Every action takes a state and returns a new state (the input is never changed),
// so the UI can keep history and the whole game can be saved as JSON.

import {
  BASE_BUY, BASE_SHELF, BIG_SHELF, CART_BUY, CUSTOMER_CARDS, EVENT_CARDS, FARMER_CARDS,
  FAVOUR_DECK, FAVOUR_HAND_LIMIT, FAVOURS, FRUIT, FRUITS, START_CASH, TRAIT_OFFER, TRAITS, UPGRADE_OFFER, UPGRADES,
  freshPos, stageAt, trackLength,
  type EventCard, type FarmerCard, type FavourId, type FruitId, type TraitId, type UpgradeId, type Want,
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
  favouredTrade: boolean;
  stats: Stats;
  /** Merchant trait, picked from `traitOffer` on the first morning. */
  trait?: TraitId | null;
  traitOffer?: TraitId[];
  /** Upgrades this shop may build tonight (an evening draft). Missing in older saves: anything goes. */
  upgradeOffer?: UpgradeId[];
}

export interface Customer { id: number; name: string; wants: Want[]; original: Want[] }

export interface Bid { customerId: number; fruit: FruitId; qty: number; price: number }

export interface Offer { player: number; qty: number; price: number; sold: number; freshness: number }
export interface LineResult { customerId: number; name: string; fruit: FruitId; want: number; max: number; offers: Offer[] }
export interface DayResult {
  lines: LineResult[];
  favours: { player: number; customer: string; favour: FavourId }[];
  happy: string[];
  leftAngry: string[];
  movedToWaiting: string[];
  income: number[];
}

export interface DayRecord { day: number; lines: LineResult[]; income: number[]; cash: number[] }

export type Phase = 'morning' | 'buy' | 'bid' | 'reveal' | 'evening' | 'over';

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
  forecast: Customer | null;
  firstMarket: Customer[];
  secondMarket: Customer[];
  firstPlayer: number;
  priorityNext: number | null;
  order: number[];
  turn: number;
  bids: (Bid[] | null)[];
  results: DayResult | null;
  /** One entry per finished day, for recaps. Presentation only; older saves may lack it. */
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
  return p.upgrades.includes('shelf') ? BIG_SHELF : BASE_SHELF;
}

export function buyLimit(p: Player): number {
  return (p.upgrades.includes('cart') ? CART_BUY : BASE_BUY) + (p.trait === 'basket' ? 1 : 0);
}

export function handLimit(p: Player): number {
  return FAVOUR_HAND_LIMIT + (p.trait === 'charmer' ? 1 : 0) + (p.upgrades.includes('bell') ? 1 : 0);
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

export function priceMod(s: GameState, f: FruitId): number {
  const e = s.event;
  if (!e) return 0;
  return (e.priceAll ?? 0) + (e.price?.[f] ?? 0);
}

export function effectiveMax(s: GameState, w: Want): number {
  return Math.max(1, w.max + priceMod(s, w.fruit));
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

/** Customers currently in the market, in the order they are served (waiting longest first). */
export function servingCustomers(s: GameState): Customer[] {
  return [...s.secondMarket, ...s.firstMarket];
}

export function activePlayer(s: GameState): number {
  if (s.phase === 'bid') return s.bids.findIndex((b) => b === null);
  if (s.phase === 'buy' || s.phase === 'evening') return s.order[s.turn] ?? -1;
  return -1;
}

// ---------- pacing ----------
// The town grows during the game: early days have few, small orders; later days bring more
// customers who buy more. Demand and supply both follow what the shops can actually buy
// (3 fruit each a day, 5 with a Handcart), so the market stays tight as shops upgrade.

/** 0 on the first day, 1 on the last. */
export function progress(s: GameState, day = s.day): number {
  return s.config.days <= 1 ? 1 : Math.min(1, (day - 1) / (s.config.days - 1));
}

function buyCapacity(s: GameState): number {
  return s.players.reduce((a, p) => a + buyLimit(p), 0);
}

function baseWalkIns(s: GameState, day = s.day): number {
  return progress(s, day) >= 0.5 ? 2 : 1;
}

/** Walk-in customers arriving today (after event changes). */
export function walkInsToday(s: GameState): number {
  return Math.max(0, baseWalkIns(s) + (s.event?.walkIns ?? 0));
}

const CARD_AVG_QTY = CUSTOMER_CARDS.reduce((a, c) => a + c.wants.reduce((b, w) => b + w.qty, 0), 0) / CUSTOMER_CARDS.length;
const FARMER_AVG_QTY = FARMER_CARDS.reduce((a, c) => a + Object.values(c.supply).reduce((b, n) => b + (n ?? 0), 0) + 2, 0) / FARMER_CARDS.length;

export function demandScale(s: GameState, day = s.day): number {
  const target = buyCapacity(s) * (0.4 + 0.45 * progress(s, day));
  return target / (CARD_AVG_QTY * (1 + baseWalkIns(s, day)));
}

function supplyScale(s: GameState): number {
  return (buyCapacity(s) * (1 + 0.5 * progress(s))) / FARMER_AVG_QTY;
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

function drawCustomer(s: GameState, day = s.day): Customer {
  if (s.customerDeck.length === 0) {
    const inPlay = new Set([...s.firstMarket, ...s.secondMarket, s.forecast].filter(Boolean).map((c) => c!.name));
    s.customerDeck = withRng(s, (r) => r.shuffle(CUSTOMER_CARDS.map((_, i) => i).filter((i) => !inPlay.has(CUSTOMER_CARDS[i].name))));
  }
  const card = CUSTOMER_CARDS[s.customerDeck.shift()!];
  const scale = demandScale(s, day);
  const wants = card.wants.map((w) => ({ ...w, qty: Math.max(1, Math.round(w.qty * scale)) }));
  return { id: s.nextId++, name: card.name, wants, original: clone(wants) };
}

function drawFarmer(s: GameState): FarmerCard {
  if (s.farmerDeck.length === 0) s.farmerDeck = withRng(s, (r) => r.shuffle(FARMER_CARDS.map((_, i) => i)));
  return FARMER_CARDS[s.farmerDeck.shift()!];
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
  if (t === 'nestegg') pl.cash = START_CASH + 6;
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
    firstMarket: [],
    secondMarket: [],
    firstPlayer: r.int(players.length),
    priorityNext: null,
    order: [],
    turn: 0,
    bids: players.map(() => null),
    results: null,
    log: [],
    nextId: 1,
    history: [],
  };
  const traitIds = Object.keys(TRAITS) as TraitId[];
  for (const pl of s.players) {
    pl.traitOffer = r.shuffle([...traitIds]).slice(0, TRAIT_OFFER);
    pl.trait = null;
  }
  s.rng = r.state;
  s.forecast = drawCustomer(s);
  startDay(s);
  // Computer shops pick their trait straight away; people pick on the first morning.
  s.players.forEach((pl, i) => {
    // Offers are already shuffled, so taking the first gives every rival a random trait.
    if (pl.kind === 'ai') applyTrait(s, i, pl.traitOffer![0]);
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
  if (s.day > 1 && s.config.events) {
    if (s.eventDeck.length === 0) s.eventDeck = withRng(s, (r) => r.shuffle(EVENT_CARDS.map((_, i) => i)));
    s.event = s.nextEvent ?? EVENT_CARDS[s.eventDeck.shift()!];
  }
  // Tomorrow's event is announced a day early so shops can plan for it.
  s.nextEvent = null;
  if (s.config.events && s.day < s.config.days) {
    if (s.eventDeck.length === 0) s.eventDeck = withRng(s, (r) => r.shuffle(EVENT_CARDS.map((_, i) => i)));
    s.nextEvent = EVENT_CARDS[s.eventDeck.shift()!];
  }
  s.delivery = {};
  s.deliveryUnripe = null;
  if (!s.event?.noDelivery) {
    const card = drawFarmer(s);
    const scale = supplyScale(s);
    const harvest = s.event?.supply ?? 0;
    const mult = s.event?.supplyMult ?? 1;
    const unripe = s.config.unripe && card.unripe ? card.unripe : null;
    s.deliveryUnripe = unripe;
    for (const f of FRUITS) {
      // Fruits not on the card still trickle in, so no fruit is ever completely missing.
      const base = card.supply[f] ?? 2;
      let n = base > 0 ? Math.max(1, Math.round(base * scale)) : 0;
      if (harvest) n = Math.max(0, n + harvest);
      n = Math.round(n * mult);
      if (n <= 0) continue;
      s.delivery[f] = n;
      const pos = f === unripe ? s.market[f].length - 1 : freshPos(f);
      s.market[f][pos] += n;
    }
  }
  for (const p of s.players) {
    p.boughtToday = 0;
    p.favouredTrade = false;
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
  s.bids = s.players.map(() => null);
  s.results = null;
}

// ---------- morning ----------

export function beginBuying(state: GameState): GameState {
  if (state.phase !== 'morning') throw new RuleError('Not morning');
  const s = clone(state);
  s.players.forEach((pl, i) => { if (pl.traitOffer && !pl.trait) applyTrait(s, i, pl.traitOffer[0]); });
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
  const arriving: Customer[] = [];
  if (s.forecast) arriving.push(s.forecast);
  for (let i = 0; i < walkInsToday(s); i++) arriving.push(drawCustomer(s));
  if (s.event?.extra) {
    const wants = s.event.extra.wants.map((w) => ({ ...w }));
    arriving.push({ id: s.nextId++, name: s.event.extra.name, wants, original: clone(wants) });
  }
  s.firstMarket = arriving;
  s.forecast = drawCustomer(s, s.day + 1);
  s.phase = 'bid';
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
  if (def.when !== s.phase) return `Play this during the ${def.when === 'bid' ? 'selling' : def.when} phase`;
  if (id === 'priority' && s.day >= s.config.days) return 'There is no tomorrow';
  if (id === 'favouredTrade' && pl.favouredTrade) return 'Already active';
  return null;
}

export function playFavour(state: GameState, p: number, idx: number, args: FavourArgs = {}): GameState {
  const why = canPlayFavour(state, p, idx);
  if (why) throw new RuleError(why);
  const s = clone(state);
  const pl = s.players[p];
  const id = pl.favours[idx];
  switch (id) {
    case 'freeCash':
      pl.cash += 3;
      pl.stats.earned += 3;
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

// ---------- selling ----------

/** Positions (oldest first) a bid would use, or null if the player can't cover it. */
export function allocate(stock: Stock, f: FruitId, qty: number, price: number, max: number): number[] | null {
  const out: number[] = [];
  const t = stock[f];
  const ripeLen = FRUIT[f].ripe.length;
  for (let i = 0; i < ripeLen && out.length < qty; i++) {
    if (capAt(f, i, max) < price) continue;
    for (let k = 0; k < t[i] && out.length < qty; k++) out.push(i);
  }
  return out.length === qty ? out : null;
}

/** Highest price a player could ask for this want with their current stock. */
export function bestCap(stock: Stock, f: FruitId, max: number): number {
  const ripeLen = FRUIT[f].ripe.length;
  for (let i = ripeLen - 1; i >= 0; i--) if (stock[f][i] > 0) return capAt(f, i, max);
  return 0;
}

function sortBids(s: GameState, bids: Bid[]): Bid[] {
  const order = servingCustomers(s).map((c) => c.id);
  return [...bids].sort((a, b) => order.indexOf(a.customerId) - order.indexOf(b.customerId) || FRUITS.indexOf(a.fruit) - FRUITS.indexOf(b.fruit));
}

/** Checks a full set of bids for one player. Returns an error message or null. */
export function validateBids(s: GameState, p: number, bids: Bid[]): string | null {
  const stock = clone(s.players[p].stock);
  const seen = new Set<string>();
  for (const b of sortBids(s, bids)) {
    if (b.qty <= 0) continue;
    const c = servingCustomers(s).find((x) => x.id === b.customerId);
    const w = c?.wants.find((x) => x.fruit === b.fruit);
    if (!c || !w || w.qty <= 0) return 'That customer does not want this';
    const key = `${b.customerId}:${b.fruit}`;
    if (seen.has(key)) return 'Duplicate offer';
    seen.add(key);
    if (b.qty > w.qty) return `${c.name} only wants ${w.qty}`;
    if (!Number.isInteger(b.price) || !Number.isInteger(b.qty)) return 'Whole numbers only';
    if (b.price < minPrice(s, b.fruit)) return `Minimum price for ${FRUIT[b.fruit].plural.toLowerCase()} is $${minPrice(s, b.fruit)}`;
    const used = allocate(stock, b.fruit, b.qty, b.price, effectiveMax(s, w));
    if (!used) return `Not enough ${FRUIT[b.fruit].plural.toLowerCase()} fresh enough for $${b.price}`;
    for (const i of used) stock[b.fruit][i]--;
  }
  return null;
}

export function submitBids(state: GameState, p: number, bids: Bid[], useFavouredTrade = false): GameState {
  requireActive(state, p, 'bid');
  let s = clone(state);
  if (useFavouredTrade) {
    const idx = s.players[p].favours.indexOf('favouredTrade');
    if (idx >= 0) s = playFavour(s, p, idx);
  }
  const err = validateBids(s, p, bids);
  if (err) throw new RuleError(err);
  s.bids[p] = bids.filter((b) => b.qty > 0);
  if (s.bids.every((b) => b !== null)) resolve(s);
  return s;
}

/** Does `a` beat `b` on a tie? A Favoured Trade card today, or a Haggler facing a richer shop. */
function tieEdge(a: Player, b: Player): boolean {
  return a.favouredTrade || (a.trait === 'haggler' && b.cash > a.cash);
}

function resolve(s: GameState) {
  const res: DayResult = { lines: [], favours: [], happy: [], leftAngry: [], movedToWaiting: [], income: s.players.map(() => 0) };
  // Units each player reserved, in serving order, so earlier wins don't eat later offers.
  const plans = s.players.map((_, p) => {
    const stock = clone(s.players[p].stock);
    const map = new Map<string, number[]>();
    for (const b of sortBids(s, s.bids[p] ?? [])) {
      const c = servingCustomers(s).find((x) => x.id === b.customerId)!;
      const w = c.wants.find((x) => x.fruit === b.fruit)!;
      const used = allocate(stock, b.fruit, b.qty, b.price, effectiveMax(s, w)) ?? [];
      for (const i of used) stock[b.fruit][i]--;
      map.set(`${b.customerId}:${b.fruit}`, used);
    }
    return map;
  });
  const orderIdx = (p: number) => s.order.indexOf(p);

  for (const c of servingCustomers(s)) {
    const suppliers = new Set<number>();
    let unitsToCustomer = 0;
    for (const w of c.wants) {
      if (w.qty <= 0) continue;
      const max = effectiveMax(s, w);
      const offers: Offer[] = [];
      s.players.forEach((pl, p) => {
        const b = (s.bids[p] ?? []).find((x) => x.customerId === c.id && x.fruit === w.fruit);
        if (!b) return;
        const used = plans[p].get(`${c.id}:${w.fruit}`) ?? [];
        if (used.length === 0) return;
        offers.push({ player: p, qty: used.length, price: b.price, sold: 0, freshness: Math.max(...used) });
      });
      offers.sort((a, b) =>
        a.price - b.price ||
        b.freshness - a.freshness ||
        Number(tieEdge(s.players[b.player], s.players[a.player])) - Number(tieEdge(s.players[a.player], s.players[b.player])) ||
        orderIdx(a.player) - orderIdx(b.player));
      let left = w.qty;
      for (const o of offers) {
        if (left <= 0) break;
        const n = Math.min(left, o.qty);
        o.sold = n;
        left -= n;
        const pl = s.players[o.player];
        const used = plans[o.player].get(`${c.id}:${w.fruit}`)!.slice(0, n);
        for (const i of used) pl.stock[w.fruit][i]--;
        const tip = pl.upgrades.includes('signboard') ? 1 : 0;
        const gain = n * (o.price + tip);
        pl.cash += gain;
        pl.stats.earned += gain;
        pl.stats.sold += n;
        pl.stats.bestSale = Math.max(pl.stats.bestSale, o.price + tip);
        res.income[o.player] += gain;
        suppliers.add(o.player);
        unitsToCustomer += n;
      }
      res.lines.push({ customerId: c.id, name: c.name, fruit: w.fruit, want: w.qty, max, offers });
      w.qty = left;
    }
    const done = c.wants.every((w) => w.qty <= 0);
    if (done) {
      res.happy.push(c.name);
      if (suppliers.size === 1 && unitsToCustomer > 0) {
        const p = [...suppliers][0];
        const pl = s.players[p];
        if (pl.trait === 'favourite') {
          pl.cash += 3;
          pl.stats.earned += 3;
          res.income[p] += 3;
        }
        // At most one favour card per shop per day.
        if (pl.favours.length < handLimit(pl) && !res.favours.some((x) => x.player === p)) {
          const fav = drawFavour(s);
          pl.favours.push(fav);
          pl.stats.favours++;
          res.favours.push({ player: p, customer: c.name, favour: fav });
        }
      }
    }
  }
  for (const c of s.secondMarket) if (c.wants.some((w) => w.qty > 0)) res.leftAngry.push(c.name);
  const waiting = s.firstMarket.filter((c) => c.wants.some((w) => w.qty > 0));
  res.movedToWaiting = waiting.map((c) => c.name);
  s.results = res;
  s.phase = 'reveal';
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
    s.phase = 'over';
    return s;
  }
  s.phase = 'evening';
  s.turn = 0;
  if (s.config.upgrades) dealUpgrades(s);
  if (!s.config.upgrades && !s.players.some((p) => p.favours.includes('priority'))) return nightfall(s);
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
  if (!s.config.upgrades) return 'Upgrades are off';
  if (s.phase !== 'evening' || activePlayer(s) !== p) return 'Not your turn';
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
  for (let k = 0; u === 'bell' && k < 2 && pl.favours.length < handLimit(pl); k++) pl.favours.push(drawFavour(s));
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
  const room = pl.upgrades.includes('coolroom');
  const steps = (room && s.day % 2 === 1 ? 0 : 1) + (room ? 0 : heat);
  let spoiled = 0;
  for (const f of FRUITS) spoiled += ageFruit(pl.stock, f, steps);
  if (pl.upgrades.includes('juicer') && spoiled > 0) {
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
  | { kind: 'bids'; bids: Bid[]; favoured: boolean }
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
    case 'bids': return submitBids(s, p, a.bids, a.favoured);
    case 'finish': return finishReveal(s);
    case 'upgrade': return buyUpgrade(s, p, a.upgrade);
    case 'endEvening': return endEvening(s, p);
    case 'trait': return pickTrait(s, p, a.trait);
  }
}
