// Static game data: fruits, cards, upgrades.
// Values are taken from the original paper prototype and tuned by simulation.

export type FruitId = 'blueberry' | 'watermelon' | 'apple' | 'mango';
export type Stage = 'notso' | 'okay' | 'fresh' | 'unripe';

export const FRUITS: FruitId[] = ['blueberry', 'watermelon', 'apple', 'mango'];

export interface FruitDef {
  id: FruitId;
  name: string;
  plural: string;
  color: string;
  /** One line on how this fruit behaves, shown in the rules. */
  theme: string;
  /** Ripe track, oldest first. Unripe slots are added after this. */
  ripe: Stage[];
  /** Dollars off the customer's price at each ripe position: okay -1, not so -2 for every fruit (rules 4). */
  drop: number[];
  unripeSlots: number;
  cost: { fresh: number; okay: number; notso: number; unripe: number };
}

// Each fruit plays differently:
//  blueberry  - cheap, big margin, but turns to mush in 3 days (high risk, high reward)
//  watermelon - the steady middle: one spare Fresh day
//  apple      - the keeper: four Fresh days; never the best price, never a loss
//  mango      - always arrives green for $4 (rules 18), ripens on your shelf in two nights, sells at a premium for one Fresh day
// Rules 14: lives of 3, 4, 5 and 6 boxes. Every fruit ends Okay then Soft; every day before that is Fresh.
export const FRUIT: Record<FruitId, FruitDef> = {
  blueberry: {
    id: 'blueberry', name: 'Blueberry', plural: 'Blueberries', color: '#4f5bd5',
    theme: 'Cheap. Lasts 3 days: Fresh, Okay, Soft.',
    ripe: ['notso', 'okay', 'fresh'], drop: [2, 1, 0], unripeSlots: 0,
    cost: { fresh: 2, okay: 1, notso: 1, unripe: 1 },
  },
  watermelon: {
    id: 'watermelon', name: 'Watermelon', plural: 'Watermelons', color: '#2e9e4f',
    theme: 'Lasts 4 days: 2 Fresh, then Okay, then Soft.',
    ripe: ['notso', 'okay', 'fresh', 'fresh'], drop: [2, 1, 0, 0], unripeSlots: 0,
    cost: { fresh: 3, okay: 2, notso: 1, unripe: 1 },
  },
  apple: {
    id: 'apple', name: 'Apple', plural: 'Apples', color: '#e0393e',
    theme: 'Lasts 6 days: 4 Fresh, then Okay, then Soft.',
    ripe: ['notso', 'okay', 'fresh', 'fresh', 'fresh', 'fresh'], drop: [2, 1, 0, 0, 0, 0], unripeSlots: 0,
    cost: { fresh: 3, okay: 2, notso: 1, unripe: 1 },
  },
  mango: {
    id: 'mango', name: 'Mango', plural: 'Mangoes', color: '#f2b705',
    theme: 'Arrives Green for $4. Ripens in 2 nights, then lasts 3 days: Fresh, Okay, Soft.',
    ripe: ['notso', 'okay', 'fresh'], drop: [2, 1, 0], unripeSlots: 2,
    cost: { fresh: 6, okay: 3, notso: 1, unripe: 4 },
  },
};

export function trackLength(f: FruitId, unripe: boolean): number {
  return FRUIT[f].ripe.length + (unripe ? FRUIT[f].unripeSlots : 0);
}

export function stageAt(f: FruitId, pos: number): Stage {
  const r = FRUIT[f].ripe;
  return pos < r.length ? r[pos] : 'unripe';
}

/** How long a fruit in a slot still has, in the words shown on the board. */
export function slotLife(f: FruitId, pos: number): string {
  const ripe = FRUIT[f].ripe.length;
  if (pos >= ripe) return `ripens in ${pos - ripe + 1}`;
  if (pos === 0) return 'last day';
  return `${pos} night${pos === 1 ? '' : 's'}`;
}

/** One slot of a fruit's track as the Wholesale Market board shows it. */
export interface TrackSlot { pos: number; stage: Stage; cost: number; life: string; entry: boolean }

/**
 * Every slot of a fruit's track, newest (top) to oldest (bottom): its freshness, what it costs at the market,
 * the words for how long it has left, and whether the lorry delivers into it. The screen and the printed mat
 * both read this, so they can never disagree (PLAN-030).
 */
export function trackSlots(f: FruitId): TrackSlot[] {
  const def = FRUIT[f];
  const n = def.ripe.length + def.unripeSlots;
  return Array.from({ length: n }, (_, k) => {
    const pos = n - 1 - k;
    const stage = stageAt(f, pos);
    return { pos, stage, cost: def.cost[stage], life: slotLife(f, pos), entry: pos === def.ripe.length - 1 || (def.unripeSlots > 0 && pos === n - 1) };
  });
}

/** Position a fresh (ripe) delivery enters at. */
export function freshPos(f: FruitId): number {
  return FRUIT[f].ripe.length - 1;
}

/** Table sizes the printed cards cover: 2 to 6 stalls (compact rules, rules 11). */
export type Stalls = 2 | 3 | 4 | 5 | 6;
export const MIN_STALLS = 2;
export const MAX_STALLS = 6;

/**
 * A lorry (farmer) card. `table` is what it delivers (blueberry / watermelon / apple / mango) with 2 to 6 stalls,
 * printed on the card. `unripe` marks a fruit that arrives green and ripens on the shelf in two nights. `okay` (the
 * Seconds Lorry) puts every fruit into its freshest Okay space instead of its Fresh one.
 */
export interface FarmerCard { name: string; table: Record<Stalls, Record<FruitId, number>>; unripe?: FruitId; okay?: boolean }

const lorry = (...rows: [string, string, string, string, string]): FarmerCard['table'] => {
  const row = (s: string): Record<FruitId, number> => {
    const [blueberry, watermelon, apple, mango] = s.split('/').map(Number);
    return { blueberry, watermelon, apple, mango };
  };
  return { 2: row(rows[0]), 3: row(rows[1]), 4: row(rows[2]), 5: row(rows[3]), 6: row(rows[4]) };
};

// 20 unique lorry cards: five gluts, four pairs, six mixed, two light, two heavy and the Seconds Lorry. Shuffled at
// set-up; reshuffled when empty. Rules 14: loads average 8 / 11 / 15 / 19 / 24 pieces at 2 to 6 stalls. Rules 18: Short
// Load's 3-stall row carries one more watermelon, and Berries and Melons brings more apples at 5 and 6
// stalls. A name says what is on the lorry (DEC-087); the rules never look a card up by its name.
const RAW_LORRIES: Omit<FarmerCard, 'unripe'>[] = [
  { name: 'Blueberry Lorry', table: lorry('4/1/1/1', '6/2/1/1', '8/3/2/1', '10/3/3/2', '13/4/3/2') },
  { name: 'Watermelon Lorry', table: lorry('1/4/1/1', '2/6/2/1', '3/8/2/2', '3/10/3/2', '4/13/3/3') },
  { name: 'Apple Lorry', table: lorry('2/1/4/1', '2/2/5/1', '3/3/7/1', '4/3/9/2', '5/4/12/2') },
  { name: 'Highland Apples', table: lorry('1/1/5/0', '1/1/6/0', '1/1/9/0', '2/2/11/0', '2/2/14/0') },
  { name: 'Mango Lorry', table: lorry('2/2/1/5', '2/2/1/6', '3/3/1/9', '4/3/2/11', '5/5/2/14') },
  { name: 'Mango Growers', table: lorry('2/2/2/4', '3/3/2/5', '4/3/3/6', '4/4/4/8', '6/5/5/11') },
  { name: 'Mango Season', table: lorry('2/1/1/4', '2/2/2/6', '4/3/2/8', '5/3/3/10', '7/4/3/13') },
  { name: 'Berries and Melons', table: lorry('3/4/1/1', '4/5/1/1', '7/6/1/1', '8/8/2/2', '10/11/2/2') },
  { name: 'Melons and Mangoes', table: lorry('1/3/1/4', '1/4/1/5', '2/7/1/6', '2/7/2/8', '3/10/2/11') },
  { name: 'Berries and Apples', table: lorry('3/1/3/1', '4/2/4/1', '6/2/6/1', '8/3/7/2', '10/3/9/2') },
  { name: 'Apples and Mangoes', table: lorry('1/1/3/4', '1/2/3/5', '2/2/6/6', '2/3/6/8', '3/3/8/11') },
  { name: 'Mixed Basket', table: lorry('2/2/2/2', '3/3/2/2', '4/4/4/3', '5/5/4/5', '6/6/6/7') },
  { name: 'Even Load', table: lorry('3/2/2/2', '3/3/3/3', '5/4/3/4', '5/5/4/5', '8/7/5/6') },
  { name: 'Farmer\'s Choice', table: lorry('2/2/2/3', '3/3/3/3', '4/5/3/4', '5/5/4/5', '6/7/5/8') },
  { name: 'Kampung Lorry', table: lorry('3/3/0/3', '4/3/0/3', '5/5/0/5', '6/6/0/6', '9/8/0/8') },
  { name: 'Small Load', table: lorry('1/1/1/1', '2/2/2/1', '3/2/2/2', '3/3/3/2', '4/4/3/3') },
  { name: 'Short Load', table: lorry('2/1/1/1', '2/2/1/1', '3/2/1/1', '3/3/2/2', '5/3/2/2') },
  { name: 'Convoy', table: lorry('3/3/3/2', '5/4/4/4', '6/6/5/6', '8/7/7/7', '9/9/8/9') },
  { name: 'Overstock', table: lorry('3/3/3/1', '4/4/4/2', '5/6/6/3', '6/7/8/4', '8/10/10/4') },
  { name: 'Seconds Lorry', table: lorry('3/3/2/1', '3/3/3/2', '5/4/4/3', '5/6/5/4', '8/8/6/4'), okay: true },
];

/** Rules 14: every lorry brings its mangoes green (they ripen on the shelf in two nights). */
export const FARMER_CARDS: FarmerCard[] = RAW_LORRIES.map((c) => ({ ...c, unripe: 'mango' as FruitId }));

/** Where a lorry puts a ripe delivery of this fruit: its Fresh entry space, or its freshest Okay space (Seconds Lorry). */
export function deliveryPos(card: Pick<FarmerCard, 'okay'>, f: FruitId): number {
  return card.okay ? FRUIT[f].ripe.lastIndexOf('okay') : freshPos(f);
}

/**
 * Does any lorry deliver this fruit green? Since rules 9 only mangoes arrive green. The watermelon keeps its green
 * slot in the track (saves and online play depend on the track's shape), but nothing ever fills it, so the rules
 * screens leave it out.
 */
export function deliveredGreen(f: FruitId): boolean {
  return FARMER_CARDS.some((c) => c.unripe === f);
}

/** `fixed`: an event customer's printed price is final; the day's price modifiers are not added to it. */
export interface Want { fruit: FruitId; qty: number; max: number; fixed?: boolean }
export interface CustomerCard { name: string; wants: Want[] }

/** How fresh a customer insists on: Premium takes Fresh only, Everyday Fresh or Okay, Bargain anything the shop sells. */
export type Pref = 'premium' | 'everyday' | 'bargain';

// 36 customers. Max price is what they pay for a fresh fruit. Rules 14: one or two fruits a card, about 3.4 pieces,
// and a price spread by type: Bargain pays $1 or $2 under the usual price (blueberry $5, watermelon $7, apple $6,
// mango $11), Premium $1 or $2 over, Everyday within $1 of it. Rules 18: the three Bargain blueberry cards pay $4 (was $3).
const RAW_CUSTOMERS: CustomerCard[] = [
  { name: 'John', wants: [{ fruit: 'apple', qty: 2, max: 5 }, { fruit: 'watermelon', qty: 2, max: 6 }] },
  { name: 'Robert', wants: [{ fruit: 'blueberry', qty: 3, max: 5 }, { fruit: 'mango', qty: 1, max: 11 }] },
  { name: 'Daniel', wants: [{ fruit: 'apple', qty: 2, max: 7 }, { fruit: 'mango', qty: 1, max: 12 }] },
  { name: 'Rara Jenab', wants: [{ fruit: 'mango', qty: 2, max: 12 }, { fruit: 'blueberry', qty: 1, max: 6 }] },
  { name: 'Aisyah', wants: [{ fruit: 'watermelon', qty: 3, max: 7 }] },
  { name: 'Ravi', wants: [{ fruit: 'mango', qty: 2, max: 13 }, { fruit: 'apple', qty: 1, max: 8 }] },
  { name: 'Mei Ling', wants: [{ fruit: 'blueberry', qty: 2, max: 4 }, { fruit: 'watermelon', qty: 2, max: 5 }] },
  { name: 'Farid', wants: [{ fruit: 'apple', qty: 3, max: 5 }] },
  { name: 'Siti', wants: [{ fruit: 'watermelon', qty: 2, max: 6 }, { fruit: 'mango', qty: 1, max: 10 }] },
  { name: 'Kumar', wants: [{ fruit: 'watermelon', qty: 2, max: 5 }, { fruit: 'blueberry', qty: 2, max: 4 }] },
  { name: 'Grace', wants: [{ fruit: 'apple', qty: 2, max: 5 }, { fruit: 'mango', qty: 1, max: 10 }] },
  { name: 'Hafiz', wants: [{ fruit: 'blueberry', qty: 3, max: 4 }] },
  { name: 'Wei Jie', wants: [{ fruit: 'apple', qty: 2, max: 5 }, { fruit: 'watermelon', qty: 1, max: 6 }] },
  { name: 'Nurul', wants: [{ fruit: 'watermelon', qty: 3, max: 7 }] },
  { name: 'Priya', wants: [{ fruit: 'apple', qty: 2, max: 7 }, { fruit: 'blueberry', qty: 2, max: 6 }] },
  { name: 'Ahmad', wants: [{ fruit: 'mango', qty: 3, max: 12 }] },
  { name: 'Sarah', wants: [{ fruit: 'mango', qty: 2, max: 11 }, { fruit: 'blueberry', qty: 1, max: 5 }] },
  { name: 'Tan', wants: [{ fruit: 'apple', qty: 2, max: 5 }, { fruit: 'watermelon', qty: 1, max: 6 }] },
  { name: 'Lina', wants: [{ fruit: 'mango', qty: 2, max: 13 }, { fruit: 'apple', qty: 1, max: 8 }] },
  { name: 'Zul', wants: [{ fruit: 'blueberry', qty: 2, max: 5 }, { fruit: 'watermelon', qty: 2, max: 7 }] },
  { name: 'Anna', wants: [{ fruit: 'mango', qty: 3, max: 12 }] },
  { name: 'Vijay', wants: [{ fruit: 'blueberry', qty: 2, max: 6 }, { fruit: 'apple', qty: 2, max: 7 }] },
  { name: 'Hui Min', wants: [{ fruit: 'watermelon', qty: 3, max: 7 }] },
  { name: 'Osman', wants: [{ fruit: 'watermelon', qty: 2, max: 6 }, { fruit: 'apple', qty: 2, max: 5 }] },
  { name: 'Jia Wen', wants: [{ fruit: 'mango', qty: 2, max: 11 }, { fruit: 'apple', qty: 1, max: 6 }] },
  { name: 'Rizal', wants: [{ fruit: 'blueberry', qty: 3, max: 6 }, { fruit: 'watermelon', qty: 1, max: 8 }] },
  { name: 'Devi', wants: [{ fruit: 'mango', qty: 3, max: 13 }] },
  { name: 'Marcus', wants: [{ fruit: 'apple', qty: 3, max: 6 }, { fruit: 'blueberry', qty: 1, max: 5 }] },
  { name: 'Fatimah', wants: [{ fruit: 'watermelon', qty: 2, max: 6 }, { fruit: 'blueberry', qty: 2, max: 4 }] },
  { name: 'Ben', wants: [{ fruit: 'watermelon', qty: 3, max: 7 }] },
  { name: 'Yuki', wants: [{ fruit: 'mango', qty: 2, max: 12 }, { fruit: 'apple', qty: 1, max: 7 }] },
  { name: 'Hadi', wants: [{ fruit: 'blueberry', qty: 3, max: 5 }] },
  { name: 'Lakshmi', wants: [{ fruit: 'apple', qty: 3, max: 5 }, { fruit: 'watermelon', qty: 1, max: 6 }] },
  { name: 'Kenji', wants: [{ fruit: 'mango', qty: 2, max: 11 }, { fruit: 'blueberry', qty: 2, max: 5 }] },
  { name: 'Mira', wants: [{ fruit: 'mango', qty: 2, max: 12 }, { fruit: 'apple', qty: 1, max: 7 }] },
  { name: 'Hock Seng', wants: [{ fruit: 'apple', qty: 3, max: 6 }, { fruit: 'watermelon', qty: 1, max: 7 }] },
];

// Card prices are written on an older scale; this shifts them to today's prices. Rules 9: apples a further $1 lower and
// mangoes a further $1 higher than the rules 8 deck; blueberry and watermelon prices are unchanged. Rules 11: apples $1
// higher again (apple -3 -> -2).
const PRICE_SHIFT: Record<FruitId, number> = { blueberry: 0, watermelon: 0, apple: 0, mango: 0 };
export const CUSTOMER_CARDS: CustomerCard[] = RAW_CUSTOMERS.map((c) => ({
  ...c,
  wants: c.wants.map((w) => ({ ...w, max: w.max + PRICE_SHIFT[w.fruit] })),
}));

export const PREMIUM_CUSTOMERS = ['Rara Jenab', 'Ravi', 'Ahmad', 'Anna', 'Devi', 'Lina', 'Influencer'];
export const BARGAIN_CUSTOMERS = ['Kumar', 'Hafiz', 'Farid', 'Mei Ling', 'Grace', 'Wei Jie'];
/** A customer's freshness preference. Premium: six regulars and the Influencer; Bargain: six regulars; everyone else is Everyday. */
export function prefOf(name: string): Pref {
  return PREMIUM_CUSTOMERS.includes(name) ? 'premium' : BARGAIN_CUSTOMERS.includes(name) ? 'bargain' : 'everyday';
}
/** Would a customer with this preference buy fruit at this freshness? (An unripe fruit can never be sold.) */
export function acceptsStage(pref: Pref | undefined, stage: Stage): boolean {
  if (stage === 'unripe') return false;
  if (!pref || stage === 'fresh') return true;
  return stage === 'okay' ? pref !== 'premium' : pref === 'bargain';
}
export const PREF_INFO: Record<Pref, { title: string; short: string; text: string }> = {
  premium: { title: 'Premium', short: 'Fresh only', text: 'Buys Fresh fruit only.' },
  everyday: { title: 'Everyday', short: 'Fresh or Okay', text: 'Buys Fresh or Okay fruit.' },
  bargain: { title: 'Bargain', short: 'Fresh, Okay or Soft', text: 'Buys Fresh, Okay or Soft fruit.' },
};

export type EventId =
  | 'festival' | 'glut' | 'heatwave' | 'blight' | 'mangoCraze' | 'superfood' | 'goodHarvest'
  | 'badHarvest' | 'priceHike' | 'priceControls' | 'inspector' | 'strike' | 'hotel'
  | 'touristBus' | 'monsoon' | 'durian' | 'kenduri' | 'mangoWindfall' | 'pasarMalam' | 'bakeOff';

export interface EventCard {
  id: EventId;
  title: string;
  text: string;
  icon: string;
  /** Added to every customer's price today. */
  priceAll?: number;
  /** Added to customers' price for one fruit today. */
  price?: Partial<Record<FruitId, number>>;
  /** Added to every farmers-market price today (never below $1). */
  cost?: number;
  /** Rules 18: added to the market price of one fruit today (never below $1). */
  costFruit?: Partial<Record<FruitId, number>>;
  /** Extra fruit of every kind in today's delivery, per 4 stalls (rounded up). */
  supplyAll?: number;
  /** Extra fruit of one kind in today's delivery, per 2 stalls (rounded up). Rules 18: these extra pieces arrive ripe
   *  (Fresh, or Okay on the Seconds Lorry) even when the lorry brings that fruit green (Mango Windfall). */
  supplyEach?: Partial<Record<FruitId, number>>;
  /** No fruit of this kind is delivered today. */
  noFruit?: FruitId;
  /** Multiplies today's delivery. */
  supplyMult?: number;
  noDelivery?: boolean;
  /** Change to the number of walk-in customers today, scaled per 3 stalls: sign(k) x ceil(|k| x stalls / 3). */
  walkIns?: number;
  /** A special customer who also comes today. */
  extra?: CustomerCard;
  /** Extra ageing tonight (negative: less; -1 means nothing ages tonight). */
  ageExtra?: number;
  /** Fine per Not-so fruit on a shop's shelf at the start of the day, before anyone buys or discards. */
  inspector?: number;
  /** No stall may post a price above this for each fruit today. */
  maxPrice?: Record<FruitId, number>;
  /** A tagline once shown before the rule text. No card has one since DEC-087 (the title says it). The field stays
   *  because a game saved earlier still carries its day's event with one. */
  flavour?: string;
  /** Pasar Malam: after the rush a hawker buys 1 of each fruit left in each stall's crate at this price, any freshness. */
  hawker?: number;
}

export const EVENT_CARDS: EventCard[] = [
  { id: 'festival', title: 'Festival', icon: '🎉', priceAll: 1, walkIns: 1, text: 'Every customer pays $1 more for each piece. Add 1 walk-in (2 at 4 to 6 stalls). The row still holds 5 customers at most.' },
  { id: 'superfood', title: 'Superfood Trend', icon: '💪', price: { blueberry: 1 },
    extra: { name: 'Gym Club', wants: [{ fruit: 'blueberry', qty: 2, max: 8, fixed: true }] },
    text: 'Customers pay $1 more for each blueberry. Guest: the Gym Club wants 2 blueberries, Fresh or Okay, top price $8.' },
  { id: 'mangoCraze', title: 'Mango Craze', icon: '📱', price: { mango: 2 },
    extra: { name: 'Influencer', wants: [{ fruit: 'mango', qty: 1, max: 15, fixed: true }] },
    text: 'Customers pay $2 more for each mango. Guest: the Influencer wants 1 Fresh mango, top price $15.' },
  { id: 'hotel', title: 'Hotel Order', icon: '🏨',
    extra: { name: 'Hotel Chef', wants: [{ fruit: 'apple', qty: 1, max: 8, fixed: true }, { fruit: 'watermelon', qty: 1, max: 8, fixed: true }, { fruit: 'blueberry', qty: 1, max: 7, fixed: true }] },
    text: 'Guest: the Hotel Chef wants 1 apple ($8), 1 watermelon ($8) and 1 blueberry ($7), Fresh or Okay.' },
  { id: 'heatwave', title: 'Heatwave', icon: '🔥', price: { watermelon: 2 }, ageExtra: 1, text: 'Customers pay $2 more for each watermelon. Tonight all fruit ages 2 steps.' },
  { id: 'blight', title: 'Apple Blight', icon: '🍎', noFruit: 'apple', price: { apple: 2 }, text: 'The lorry brings no apples. Customers pay $2 more for each apple.' },
  { id: 'glut', title: 'Blueberry Glut', icon: '🫐', supplyEach: { blueberry: 1 }, price: { blueberry: -1 }, costFruit: { blueberry: -1 }, text: 'The lorry brings 1 extra blueberry for every 2 stalls (round up). Blueberries cost $1 less at the Wholesale Market (never below $1). Customers pay $1 less for each blueberry.' },
  { id: 'goodHarvest', title: 'Good Harvest', icon: '🌾', supplyAll: 1, priceAll: -1, text: 'The lorry brings 1 extra of each fruit for every 4 stalls (round up). Every customer pays $1 less for each piece.' },
  { id: 'badHarvest', title: 'Bad Harvest', icon: '🐛', supplyMult: 0.5, priceAll: 1, text: 'The lorry brings half of each fruit (round up). Every customer pays $1 more for each piece.' },
  { id: 'priceHike', title: 'Price Hike', icon: '📈', cost: 1, text: 'Every piece at the Wholesale Market costs $1 more today.' },
  { id: 'priceControls', title: 'Price Controls', icon: '⚖️', text: 'Today no stall may set a price above the limit shown for each fruit.',
    maxPrice: { blueberry: 5, watermelon: 7, apple: 6, mango: 10 } },
  { id: 'inspector', title: 'Health Inspector', icon: '🕵️', inspector: 2, text: 'Before buying, pay $2 for each Soft piece on your shelf (never more than your cash). Never on the last day.' },
  { id: 'strike', title: 'Lorry Breakdown', icon: '🚚', noDelivery: true, text: 'No lorry today. Fruit already at the Wholesale Market stays.' },
  { id: 'touristBus', title: 'Tourist Bus', icon: '🚌', walkIns: 2, text: 'Add 2 walk-ins (3 at 4 stalls, 4 at 5 or 6 stalls). The row still holds 5 customers at most.' },
  { id: 'monsoon', title: 'Monsoon Downpour', icon: '🌧️', walkIns: -1, ageExtra: -1, text: 'Remove 1 walk-in (2 at 4 to 6 stalls). No fruit ages tonight, at the stalls or at the Wholesale Market.' },
  { id: 'durian', title: 'Durian Season', icon: '🌰', cost: -1, priceAll: -1, text: 'Every piece at the Wholesale Market costs $1 less (never below $1). Every customer pays $1 less for each piece.' },
  { id: 'kenduri', title: 'Kenduri', icon: '💍',
    extra: { name: 'Wedding Caterer', wants: [{ fruit: 'watermelon', qty: 3, max: 8, fixed: true }] },
    text: 'Guest: the Wedding Caterer wants 3 watermelons, Fresh or Okay, top price $8.' },
  // Rules 18: the extra mangoes really arrive ripe (Fresh; Okay on the Seconds Lorry), as the card has always said.
  { id: 'mangoWindfall', title: 'Mango Windfall', icon: '🥭', supplyEach: { mango: 1 }, price: { mango: -2 }, text: 'The lorry brings 1 extra ripe mango for every 2 stalls (round up). Customers pay $2 less for each mango.' },
  { id: 'pasarMalam', title: 'Pasar Malam', icon: '🏮', hawker: 3, text: 'After the rush, the night hawker buys 1 of each fruit left in every stall’s crate for $3 each, any freshness.' },
  { id: 'bakeOff', title: 'Bake-Off', icon: '🥧', price: { apple: 1 },
    extra: { name: 'Bakery', wants: [{ fruit: 'apple', qty: 2, max: 7, fixed: true }] },
    text: 'Customers pay $1 more for each apple. Guest: the Bakery wants 2 apples, Fresh or Okay, top price $7.' },
];

export type FavourId = 'gossip' | 'freeFruit' | 'priority' | 'scout' | 'favouredTrade' | 'fridge';

/** `when`: the step a card is played in. 'tie' (rules 18) is Favoured Trade's own step, after prices flip. Every place
 *  that shows a card names that step beside `text`, so `text` says only what the card does. */
export interface FavourDef { id: FavourId; title: string; icon: string; text: string; when: 'buy' | 'tie' | 'evening' }

export const FAVOURS: Record<FavourId, FavourDef> = {
  gossip: { id: 'gossip', title: 'Gossip', icon: '👂', when: 'evening', text: 'Look at all of tomorrow\'s walk-ins. Only you see them.' },
  freeFruit: { id: 'freeFruit', title: 'Free Fruit', icon: '🎁', when: 'buy', text: 'Take 1 piece from the Wholesale Market for free.' },
  priority: { id: 'priority', title: 'Priority', icon: '⏩', when: 'evening', text: 'You buy first tomorrow. Only 1 Priority can be played each evening.' },
  scout: { id: 'scout', title: 'Scout', icon: '🔍', when: 'buy', text: 'Look at one of today\'s walk-ins. Everyone sees that you played it, not what you saw.' },
  // Rules 18: played after the flip, in the open, and only by a stall with a tied price (before, in secret with the prices).
  favouredTrade: { id: 'favouredTrade', title: 'Favoured Trade', icon: '🤝', when: 'tie', text: 'If one of your prices is tied, play this to win every tied price today.' },
  fridge: { id: 'fridge', title: 'Fridge', icon: '🧊', when: 'buy', text: 'Every ripe piece on your shelf becomes one step fresher. Green pieces do not change.' },
};

export const FAVOUR_DECK: FavourId[] = [
  'gossip', 'gossip', 'freeFruit', 'freeFruit', 'priority', 'priority',
  'scout', 'scout', 'favouredTrade', 'favouredTrade', 'fridge', 'fridge',
];

/** The favour deck for a table. Rules 18: one deck of 12 (2 of each card) at every table size; before, 5 and 6 stalls
 *  used 3 of each. The table size stays a parameter so callers need not change. */
export function favourDeckFor(_stalls: number): FavourId[] {
  return [...FAVOUR_DECK];
}

export type UpgradeId = 'juicebar' | 'barrow' | 'premium' | 'ripening' | 'orderbook';

export interface UpgradeDef { id: UpgradeId; title: string; icon: string; cost: number; text: string }

// Compact rules (rules 11): smaller daily buys and shelves.
export const BASE_SHELF = 8;
export const BARROW_SHELF = 10;
export const BASE_BUY = 4;
export const BARROW_BUY = 5;

/** Juice Bar: extra dollars for each okay or not-so fruit sold. */
export const JUICE_TIP = 1;
/** Juice Bar: each night at most this many pieces leaving the shelf become juice, ... */
export const JUICE_CAP = 2;
/** ... and each of them pays this much. */
export const JUICE_VALUE = 2;
/** Order Book (rules 18): a standing order pays its holder this much more for each piece it delivers. */
export const ORDER_BOOK_BONUS = 2;

/**
 * Stall upgrades: each changes what a shop does. They are offered on the evening after each Market Day (days 3, 6,
 * 9, 12), whether or not Market Days are switched on. Rules 14: five upgrades at real prices, and a stall has room
 * for two. Rules 18: costs of $6, $6, $5, $4 and $3; the Order Book also pays more for each piece delivered. The
 * Ripening Room's $1 off green mangoes was dropped before rules 18 shipped (DEC-101): it undid the dearer green mango.
 */
export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  juicebar: {
    id: 'juicebar', title: 'Juice Bar', icon: '🧃', cost: 6,
    // Rules 18: the +$1 is for sales to customers and guests in the rush only (not a standing order, the night hawker
    // or the jam maker), which "a customer buys from you" says. The card's old tip ("before the last day, $1 soft
    // fruit makes $2 of juice") was advice, not a rule, and is gone (DEC-087).
    text: `+$${JUICE_TIP} for each Okay or Soft piece a customer buys from you. Each night up to ${JUICE_CAP} of your pieces that would spoil become juice: $${JUICE_VALUE} each.`,
  },
  barrow: { id: 'barrow', title: 'Handcart', icon: '🛒', cost: 6, text: `Buy up to ${BARROW_BUY} pieces a day. Your shelf holds ${BARROW_SHELF}.` },
  premium: { id: 'premium', title: 'Premium Display', icon: '🪧', cost: 5, text: 'You may price a Fresh piece $1 above a customer\'s top price. A guest never pays more than its fixed price.' },
  ripening: { id: 'ripening', title: 'Ripening Room', icon: '🌡️', cost: 4, text: 'Your Green mangoes ripen in 1 night instead of 2.' },
  orderbook: { id: 'orderbook', title: 'Order Book', icon: '📒', cost: 3, text: `You win tied bids for standing orders. Your stake is halved. A standing order pays you $${ORDER_BOOK_BONUS} more for each piece you deliver.` },
};
/** A stall has room for this many upgrades (rules 14). */
export const MAX_UPGRADES = 2;

// ---------- standing orders (rules 14) ----------
// A big public order turns up on each Market Day morning, due two days later. Every stall secretly names the price
// per piece it would do it for; the lowest wins the order. Rules 18: the winner pays the card's stake at once (it is
// held on the card). On the due day the order is served first, from the holder's crate only, and pays the bid for each
// piece. A holder that delivers every piece gets its stake back; otherwise the stake is lost. Rivals are not involved.

export interface OrderCard { name: string; title: string; quirk: string; fruit: FruitId; /** The highest bid allowed. */ ceiling: number; /** What the winner puts down when it wins (rules 18; before, the fine per missed piece). */ stake: number }

export const ORDER_CARDS: OrderCard[] = [
  { name: 'School Canteen', title: 'The School Canteen', quirk: 'Fruit cups for Friday recess.', fruit: 'blueberry', ceiling: 9, stake: 6 },
  { name: 'Smoothie Stand', title: 'The Smoothie Stand', quirk: 'Sells blueberry smoothies at the pasar malam.', fruit: 'blueberry', ceiling: 9, stake: 6 },
  { name: 'Beach Resort', title: 'The Beach Resort', quirk: 'Cut watermelon for the guests by the pool.', fruit: 'watermelon', ceiling: 12, stake: 8 },
  { name: 'Company Picnic', title: 'The Company Picnic', quirk: 'For the company family day.', fruit: 'watermelon', ceiling: 12, stake: 8 },
  { name: 'Pie Factory', title: 'The Pie Factory', quirk: 'Apple pies for the cafes in town.', fruit: 'apple', ceiling: 11, stake: 7 },
  { name: 'Cider Press', title: 'The Cider Press', quirk: 'Pressing apples this week.', fruit: 'apple', ceiling: 11, stake: 7 },
  { name: 'Airline Caterer', title: 'The Airline Caterer', quirk: 'Mango for the in-flight meals.', fruit: 'mango', ceiling: 18, stake: 12 },
  { name: 'Royal Banquet', title: 'The Royal Banquet', quirk: 'Mango for the palace dinner.', fruit: 'mango', ceiling: 18, stake: 12 },
];
/** What a stall puts down for a card: the card's stake, halved (rounded down) with an Order Book. */
export function stakeFor(stake: number, orderBook: boolean): number {
  return orderBook ? Math.floor(stake / 2) : stake;
}
/** A standing order is due this many days after it is announced. */
export const ORDER_LEAD = 2;
/** Pieces a standing order wants: 3 at 2 or 3 stalls, 4 at 4 stalls, 5 at 5 or 6. */
export function orderQty(stalls: number): number {
  return stalls <= 3 ? 3 : stalls === 4 ? 4 : 5;
}

/** The row never holds more than this many customers (rules 14). Rules 18: the cap counts the regular, the walk-ins
 *  and a standing order collected today; a guest joins the end of the row even when it is full. */
export const ROW_CAP = 5;
/** Rules 18: a guest joins a full row (the row is then six that day). */
export const GUEST_JOINS_FULL_ROW = true;
/** Rules 18: no customer who wants a mango comes on these first days (every mango arrives green and needs two nights). */
export const NO_MANGO_DAYS = 2;
/** At this many stalls every customer wants one more of the first fruit on their card (rules 14). */
export const BIG_TABLE = 6;

/** Market Days (and the upgrade draft) fall on every 3rd day: 3, 6, 9, 12. */
export const MARKET_DAY_EVERY = 3;
/** Street prices (beginner option): what every customer pays for a fresh fruit; generous customers pay $2 more. */
export const STREET_PRICE: Record<FruitId, number> = { blueberry: 5, watermelon: 7, apple: 6, mango: 11 };
export const GENEROUS_BONUS = 2;
/** Market pulse (advanced option): each fruit's price marker runs from -$1 to +$2. */
export const PULSE_MIN = -1;
export const PULSE_MAX = 2;
/** Last Call: on the final day customers pay $1 more, and the jam maker buys leftover ripe fruit for $1 each. */
export const LAST_CALL_BONUS = 1;
export const JAM_PRICE = 1;

/** Nest Egg: extra cash at the start (rules 18: $5, so $15 in all; it was $8). */
export const NEST_EGG_BONUS = 5;
/** Tip Jar: the tip from a customer whose whole order this stall filled alone ... */
export const LOCAL_FAVOURITE_TIP = 2;
/** ... and (rules 18) from a customer whose whole order was filled by several stalls, this one among them. */
export const SHARED_TIP = 1;
export const START_CASH = 10;
/** Out of cash (rules 18): at dawn, from day 2, a stall with an empty shelf and less cash than this is topped up to it. */
export const TOP_UP = 5;
/** Sharp Ears: a peeked walk-in tips this much when Farah sells them anything, at most once a day (rules 18: $2 at 3 to
 *  6 stalls, $1 at 2 stalls; before, $2 only at 4 to 6). */
export function sharpEarsTip(stalls: number): number {
  return stalls >= 3 ? 2 : 1;
}
/** Charmer: favour cards in hand when the game starts (4 until DEC-101, which found the Charmer above fair at every table). */
export const CHARMER_START_FAVOURS = 3;
/** Charmer: favour cards this shop can earn in one day (everyone else: 1). */
export const CHARMER_DAILY_FAVOURS = 2;
export const FAVOUR_HAND_LIMIT = 3;

// ---------- merchant traits ----------
// Each shop picks one of three at the start, so every game opens differently.

export type TraitId = 'haggler' | 'basket' | 'bargain' | 'charmer' | 'favourite' | 'nestegg' | 'keeper' | 'earful';

export interface TraitDef { id: TraitId; title: string; text: string }

export const TRAITS: Record<TraitId, TraitDef> = {
  haggler: { id: 'haggler', title: 'Haggler', text: 'You win a tied price when your piece is as fresh as the rival\'s.' },
  basket: { id: 'basket', title: 'Big Basket', text: 'Buy 1 extra piece each day.' },
  bargain: { id: 'bargain', title: 'Bargain Hunter', text: 'Your first piece each day costs $1 less (never below $1).' },
  charmer: { id: 'charmer', title: 'Charmer', text: `Start with ${CHARMER_START_FAVOURS} favour cards. Hold up to ${FAVOUR_HAND_LIMIT + 1}. Earn up to ${CHARMER_DAILY_FAVOURS} a day.` },
  favourite: { id: 'favourite', title: 'Tip Jar', text: `A customer who leaves with their whole order tips you $${SHARED_TIP} if you sold them any of it, or $${LOCAL_FAVOURITE_TIP} if you served them alone.` },
  nestegg: { id: 'nestegg', title: 'Nest Egg', text: `Start with $${START_CASH + NEST_EGG_BONUS} instead of $${START_CASH}. Buy first on Day 3.` },
  keeper: { id: 'keeper', title: 'Shade Cloth', text: 'Each night, name 1 fruit. Your pieces of that fruit do not age tonight.' },
  earful: { id: 'earful', title: 'Sharp Ears', text: `Each evening, look at one of tomorrow's walk-ins. Once a day, a walk-in you have seen tips you $${sharpEarsTip(3)} when you sell to them ($${sharpEarsTip(2)} at 2 stalls).` },
};
export const TRAIT_OFFER = 3;

// ---------- characters ----------

export interface Look { icon: string; title: string; quirk: string }

/** Every customer is a character. The key is the card's hidden code name (saves, rooms and art use it); `title` is the
 *  approved display name (DEC-064, DEC-065), the only name players read. Unknown names fall back to a generic shopper. */
export const CUSTOMER_LOOKS: Record<string, Look> = {
  John: { icon: '🧑', title: 'Cowboy Jack', quirk: 'Pans for gold up the river.' },
  Robert: { icon: '🧑', title: 'Bobby Books', quirk: 'Runs the town library.' },
  Daniel: { icon: '🧑', title: 'Dr Bubbles', quirk: 'Teaches science at the school.' },
  'Rara Jenab': { icon: '🧕', title: 'Rara Jenab', quirk: 'Hosting an open house this weekend.' },
  Aisyah: { icon: '🧑', title: 'Zara Zapp', quirk: 'Buys watermelon for the whole lab.' },
  Ravi: { icon: '🧑', title: 'Ravi Rocket', quirk: 'Delivers parcels by motorbike.' },
  'Mei Ling': { icon: '🧑', title: 'Coral Mei', quirk: 'Dives for a living. Not fussy about fruit.' },
  Farid: { icon: '🧑', title: 'Postman Pip', quirk: 'Eats an apple on his round.' },
  Siti: { icon: '🧑', title: 'Madam Siti', quirk: 'Sews clothes to order by the market.' },
  Kumar: { icon: '🧑', title: 'Magic Kumar', quirk: 'Does magic shows at the pasar malam.' },
  Grace: { icon: '🧑‍🎤', title: 'Rockstar Grace', quirk: 'Has a show tonight.' },
  Hafiz: { icon: '🧑', title: 'Professor Pebble', quirk: 'Digs up bones for the museum.' },
  'Wei Jie': { icon: '🕵️', title: 'Inspector Wei', quirk: 'On a case. Buys whatever is cheap.' },
  Nurul: { icon: '🧑', title: 'Miss Marigold', quirk: 'Sells flowers two stalls down.' },
  Priya: { icon: '👩‍🔬', title: 'Dr Priya', quirk: 'Testing an apple pie recipe.' },
  Ahmad: { icon: '🧑‍✈️', title: 'Captain Ahmad', quirk: 'Buying mangoes for the whole crew.' },
  Sarah: { icon: '🧑', title: 'Lola Lens', quirk: 'Takes the wedding photos in town.' },
  Tan: { icon: '👴', title: 'Grandpa Tan', quirk: 'Remembers when apples cost ten cents.' },
  Lina: { icon: '💃', title: 'Miss Cha-Cha', quirk: 'Teaches dance class on Tuesdays.' },
  Zul: { icon: '🧑', title: 'Sleepy Zul', quirk: 'Works the night shift.' },
  Anna: { icon: '👩‍🎨', title: 'Anna the Artist', quirk: 'Paints the stalls on market mornings.' },
  Vijay: { icon: '🧑', title: 'Otto Oddjob', quirk: 'Does odd jobs around the market.' },
  'Hui Min': { icon: '🧑', title: 'Mina Moss', quirk: 'Park ranger. Buys for the whole camp.' },
  Osman: { icon: '👨‍🚒', title: 'Firefighter Osman', quirk: 'Buys watermelon for the fire station.' },
  'Jia Wen': { icon: '🧑', title: 'Marina Wen', quirk: 'Her ship sails again tomorrow.' },
  Rizal: { icon: '🎧', title: 'DJ Rizal', quirk: 'Plays at weddings on weekends.' },
  Devi: { icon: '🧑‍🌾', title: 'Devi Bloom', quirk: 'Grows vegetables. Buys her mangoes here.' },
  Marcus: { icon: '🧑', title: 'Marcus Hook', quirk: 'Sells fish at dawn, buys apples by noon.' },
  Fatimah: { icon: '🎓', title: 'Professor Fatimah', quirk: 'Marks exam papers at the kopitiam.' },
  Ben: { icon: '🛎️', title: 'Benny Bell', quirk: 'Carries bags at the hotel up the road.' },
  Yuki: { icon: '🧑', title: 'Akira Swift', quirk: 'Trains with the fencing club.' },
  Hadi: { icon: '👷', title: 'Hadi Hammer', quirk: 'On lunch break from the building site.' },
  Lakshmi: { icon: '🥐', title: 'Baker Lakshmi', quirk: 'Bakes apple tarts before sunrise.' },
  Kenji: { icon: '🥋', title: 'Kenji Kaze', quirk: 'Teaches karate after school.' },
  Mira: { icon: '🧑', title: 'Herbalist Mira', quirk: 'Sells jamu and herbal tea.' },
  'Hock Seng': { icon: '🧓', title: 'Uncle Hock Seng', quirk: 'Has strong opinions about the price of apples.' },
  Influencer: { icon: '🤳', title: 'The Influencer', quirk: 'Filming a mango video today.' },
  'Gym Club': { icon: '🏋️', title: 'The Gym Club', quirk: 'Blueberries after training.' },
  'Hotel Chef': { icon: '👨‍🍳', title: 'The Hotel Chef', quirk: 'Buying for the hotel breakfast.' },
  'Wedding Caterer': { icon: '💍', title: 'The Wedding Caterer', quirk: 'Cooking for a kenduri tonight.' },
  Bakery: { icon: '🥧', title: 'The Bakery', quirk: 'Needs apples for the pies.' },
  // Standing orders (rules 14): on their due day they stand at the front of the row like a customer.
  ...Object.fromEntries(ORDER_CARDS.map((c) => [c.name, { icon: '📒', title: c.title, quirk: c.quirk }])),
};

export function lookOf(name: string): Look {
  return CUSTOMER_LOOKS[name] ?? { icon: '🧑', title: name, quirk: 'Just here for fruit.' };
}

/** What a shopkeeper says when a computer stall wins or loses a customer. */
export interface RivalLines {
  /** Won by undercutting the player by a dollar or two. */
  undercut: string[];
  /** Sold at the customer's full price. */
  fullPrice: string[];
  /** Beaten narrowly by the player (by $1 or on a tie). */
  stung: string[];
  /** Beaten clearly. */
  lost: string[];
}

// Character cards (rules 5). Each shopkeeper is a character any shop can pick, and carries one fixed perk
// (a merchant trait). A character can be taken by one shop only, so no two shops share a perk or an icon. The avatar keys are old identifiers (saves and rooms use them); they are never shown.
export const CHARACTER_TRAIT: Record<string, TraitId> = {
  '🦊': 'haggler', '🐻': 'basket', '🦝': 'bargain', '🐼': 'charmer', '🐷': 'favourite', '🐸': 'nestegg', '🐢': 'keeper', '🦜': 'earful',
};

/** The eight shopkeepers (rules 11 adds Pak Din and Farah), in table order, with their approved display names (DEC-064). Their lines react to what actually
 *  happened; their buying and pricing come from the difficulty level, not from these personalities. Older saves and
 *  progress may still hold a former name (see LEGACY_RIVAL_NAMES); anything that must recognise a shopkeeper uses the avatar. */
export const RIVALS: { name: string; avatar: string; quip: string; lines: RivalLines }[] = [
  { name: 'Rosa', avatar: '🦊', quip: 'Ask around. Mine is always a little cheaper.', lines: {
    undercut: ['Mine was cheaper.'],
    fullPrice: ['They didn\'t even haggle.'],
    stung: ['That one was mine.'],
    lost: ['Fine. I priced too high.'] } },
  { name: 'Uncle Benny', avatar: '🐻', quip: 'Thirty years at this stall.', lines: {
    undercut: ['Cheaper at my stall.'],
    fullPrice: ['Full price. No bargaining.'],
    stung: ['Aiyo, my customer.'],
    lost: ['Too pricey.'] } },
  { name: 'Ah Chen', avatar: '🐼', quip: 'My regulars know where to find me.', lines: {
    undercut: ['Cheaper today.'],
    fullPrice: ['A fair price.'],
    stung: ['So close.'],
    lost: ['Tomorrow, then.'] } },
  { name: 'Saleh', avatar: '🐸', quip: 'Every sen counts.', lines: {
    undercut: ['Jimat. Mine is cheaper.'],
    fullPrice: ['Rezeki. Full price today.'],
    stung: ['One dollar too dear.'],
    lost: ['Never mind. I saved for this.'] } },
  { name: 'Raj', avatar: '🦝', quip: 'First to the lorry every morning.', lines: {
    undercut: ['Bought cheap, sold cheap.'],
    fullPrice: ['Full price. Lucky day.'],
    stung: ['Unlucky. That was mine.'],
    lost: ['Not my day.'] } },
  { name: 'Kiki', avatar: '🐷', quip: 'Thank you, come again.', lines: {
    undercut: ['A little cheaper.'],
    fullPrice: ['Full price. Thank you.'],
    stung: ['I wanted to serve them.'],
    lost: ['Another day.'] } },
  { name: 'Pak Din', avatar: '🐢', quip: 'Shade keeps it fresh.', lines: {
    undercut: ['Patience pays.'],
    fullPrice: ['Kept it fresh. Full price.'],
    stung: ['Hmm. A dollar too high.'],
    lost: ['My fruit will keep.'] } },
  { name: 'Farah', avatar: '🦜', quip: 'I hear what people want.', lines: {
    undercut: ['I heard what they wanted.'],
    fullPrice: ['Full price. I knew it.'],
    stung: ['I should have listened closer.'],
    lost: ['I will hear the next one.'] } },
];

/** The eight playable characters, in table order. */
export const CHARACTER_AVATARS: string[] = RIVALS.map((r) => r.avatar);

/** The shopkeepers' display names before DEC-064, in RIVALS order. Saved games and achievement progress may still hold them. */
export const LEGACY_RIVAL_NAMES: string[] = ['Rosa', 'Benny', 'Chen', 'Saleh', 'Raj', 'Kiran'];
