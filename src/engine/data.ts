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
//  mango      - always arrives green for $3, ripens on your shelf in two nights, sells at a premium for one Fresh day
// Rules 14: lives of 3, 4, 5 and 6 boxes. Every fruit ends Okay then Soft; every day before that is Fresh.
export const FRUIT: Record<FruitId, FruitDef> = {
  blueberry: {
    id: 'blueberry', name: 'Blueberry', plural: 'Blueberries', color: '#4f5bd5',
    theme: 'Cheap and popular, but soft in 3 days. Sell fast!',
    ripe: ['notso', 'okay', 'fresh'], drop: [2, 1, 0], unripeSlots: 0,
    cost: { fresh: 2, okay: 1, notso: 1, unripe: 1 },
  },
  watermelon: {
    id: 'watermelon', name: 'Watermelon', plural: 'Watermelons', color: '#2e9e4f',
    theme: 'The steady seller. Two Fresh days, then Okay, then Soft.',
    ripe: ['notso', 'okay', 'fresh', 'fresh'], drop: [2, 1, 0, 0], unripeSlots: 0,
    cost: { fresh: 3, okay: 2, notso: 1, unripe: 1 },
  },
  apple: {
    id: 'apple', name: 'Apple', plural: 'Apples', color: '#e0393e',
    theme: 'The keeper: four Fresh days. Never the best price, never a loss.',
    ripe: ['notso', 'okay', 'fresh', 'fresh', 'fresh', 'fresh'], drop: [2, 1, 0, 0, 0, 0], unripeSlots: 0,
    cost: { fresh: 3, okay: 2, notso: 1, unripe: 1 },
  },
  mango: {
    id: 'mango', name: 'Mango', plural: 'Mangoes', color: '#f2b705',
    theme: 'Always arrives green for $3. Ripens in 2 nights, then one Fresh day at a premium.',
    ripe: ['notso', 'okay', 'fresh'], drop: [2, 1, 0], unripeSlots: 2,
    cost: { fresh: 6, okay: 3, notso: 1, unripe: 3 },
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
// set-up; reshuffled when empty. Rules 14: loads average 8 / 11 / 15 / 19 / 24 pieces at 2 to 6 stalls.
const RAW_LORRIES: Omit<FarmerCard, 'unripe'>[] = [
  { name: 'Blueberry Bonanza', table: lorry('4/1/1/1', '6/2/1/1', '8/3/2/1', '10/3/3/2', '13/4/3/2') },
  { name: 'Watermelon Wagon', table: lorry('1/4/1/1', '2/6/2/1', '3/8/2/2', '3/10/3/2', '4/13/3/3') },
  { name: 'Orchard Run', table: lorry('2/1/4/1', '2/2/5/1', '3/3/7/1', '4/3/9/2', '5/4/12/2') },
  { name: 'Highland Apples', table: lorry('1/1/5/0', '1/1/6/0', '1/1/9/0', '2/2/11/0', '2/2/14/0') },
  { name: 'Mango Rush', table: lorry('2/2/1/5', '2/2/1/6', '3/3/1/9', '4/3/2/11', '5/5/2/14') },
  { name: 'Mango Growers', table: lorry('2/2/2/4', '3/3/2/5', '4/3/3/6', '4/4/4/8', '6/5/5/11') },
  { name: 'Mango Season', table: lorry('2/1/1/4', '2/2/2/6', '4/3/2/8', '5/3/3/10', '7/4/3/13') },
  { name: 'Summer Run', table: lorry('3/4/1/1', '4/5/1/1', '7/6/1/1', '8/8/1/2', '10/11/1/2') },
  { name: 'Tropical Pair', table: lorry('1/3/1/4', '1/4/1/5', '2/7/1/6', '2/7/2/8', '3/10/2/11') },
  { name: 'Breakfast Run', table: lorry('3/1/3/1', '4/2/4/1', '6/2/6/1', '8/3/7/2', '10/3/9/2') },
  { name: 'Premium Picks', table: lorry('1/1/3/4', '1/2/3/5', '2/2/6/6', '2/3/6/8', '3/3/8/11') },
  { name: 'Mixed Basket', table: lorry('2/2/2/2', '3/3/2/2', '4/4/4/3', '5/5/4/5', '6/6/6/7') },
  { name: 'Balanced Cart', table: lorry('3/2/2/2', '3/3/3/3', '5/4/3/4', '5/5/4/5', '8/7/5/6') },
  { name: 'Farmer\'s Choice', table: lorry('2/2/2/3', '3/3/3/3', '4/5/3/4', '5/5/4/5', '6/7/5/8') },
  { name: 'Kampung Truck', table: lorry('3/3/0/3', '4/3/0/3', '5/5/0/5', '6/6/0/6', '9/8/0/8') },
  { name: 'Quiet Delivery', table: lorry('1/1/1/1', '2/2/2/1', '3/2/2/2', '3/3/3/2', '4/4/3/3') },
  { name: 'Short Load', table: lorry('2/1/1/1', '2/1/1/1', '3/2/1/1', '3/3/2/2', '5/3/2/2') },
  { name: 'Convoy', table: lorry('3/3/3/2', '5/4/4/4', '6/6/5/6', '8/7/7/7', '9/9/8/9') },
  { name: 'Wholesaler\'s Overstock', table: lorry('3/3/3/1', '4/4/4/2', '5/6/6/3', '6/7/8/4', '8/10/10/4') },
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
// mango $11), Premium $1 or $2 over, Everyday within $1 of it.
const RAW_CUSTOMERS: CustomerCard[] = [
  { name: 'John', wants: [{ fruit: 'apple', qty: 2, max: 5 }, { fruit: 'watermelon', qty: 2, max: 6 }] },
  { name: 'Robert', wants: [{ fruit: 'blueberry', qty: 3, max: 5 }, { fruit: 'mango', qty: 1, max: 11 }] },
  { name: 'Daniel', wants: [{ fruit: 'apple', qty: 2, max: 7 }, { fruit: 'mango', qty: 1, max: 12 }] },
  { name: 'Rara Jenab', wants: [{ fruit: 'mango', qty: 2, max: 12 }, { fruit: 'blueberry', qty: 1, max: 6 }] },
  { name: 'Aisyah', wants: [{ fruit: 'watermelon', qty: 3, max: 7 }] },
  { name: 'Ravi', wants: [{ fruit: 'mango', qty: 2, max: 13 }, { fruit: 'apple', qty: 1, max: 8 }] },
  { name: 'Mei Ling', wants: [{ fruit: 'blueberry', qty: 2, max: 3 }, { fruit: 'watermelon', qty: 2, max: 5 }] },
  { name: 'Farid', wants: [{ fruit: 'apple', qty: 3, max: 5 }] },
  { name: 'Siti', wants: [{ fruit: 'watermelon', qty: 2, max: 6 }, { fruit: 'mango', qty: 1, max: 10 }] },
  { name: 'Kumar', wants: [{ fruit: 'watermelon', qty: 2, max: 5 }, { fruit: 'blueberry', qty: 2, max: 3 }] },
  { name: 'Grace', wants: [{ fruit: 'apple', qty: 2, max: 5 }, { fruit: 'mango', qty: 1, max: 10 }] },
  { name: 'Hafiz', wants: [{ fruit: 'blueberry', qty: 3, max: 3 }] },
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
  bargain: { title: 'Bargain', short: 'Any freshness', text: 'Buys Fresh, Okay or Soft fruit.' },
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
  /** Extra fruit of every kind in today's delivery, per 4 stalls (rounded up). */
  supplyAll?: number;
  /** Extra ripe fruit of one kind in today's delivery, per 2 stalls (rounded up). */
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
  /** A short tagline shown before the rule text (owner's wording). */
  flavour?: string;
  /** Pasar Malam: after the rush a hawker buys 1 of each fruit left in each stall's crate at this price, any freshness. */
  hawker?: number;
}

export const EVENT_CARDS: EventCard[] = [
  { id: 'festival', title: 'Festival', icon: '🎉', priceAll: 1, walkIns: 1, flavour: 'Big crowds, bigger spending!', text: 'Customers pay $1 more per fruit. Add 1 walk-in (2 at 4–6 stalls), up to a row of five.' },
  { id: 'superfood', title: 'Superfood Trend', icon: '💪', price: { blueberry: 1 },
    extra: { name: 'Gym Club', wants: [{ fruit: 'blueberry', qty: 2, max: 8, fixed: true }] },
    flavour: 'Blueberries are the new superfood!', text: 'Blueberry customers pay $1 more each. Gym Club wants 2 Fresh/Okay blueberries at $8 each.' },
  { id: 'mangoCraze', title: 'Mango Craze', icon: '📱', price: { mango: 2 },
    extra: { name: 'Influencer', wants: [{ fruit: 'mango', qty: 1, max: 15, fixed: true }] },
    flavour: 'Mangoes go viral!', text: 'Mango customers pay $2 more each. An influencer wants 1 Fresh mango at $15.' },
  { id: 'hotel', title: 'Hotel Order', icon: '🏨',
    extra: { name: 'Hotel Chef', wants: [{ fruit: 'apple', qty: 1, max: 8, fixed: true }, { fruit: 'watermelon', qty: 1, max: 8, fixed: true }, { fruit: 'blueberry', qty: 1, max: 7, fixed: true }] },
    flavour: 'Room service is calling!', text: 'Hotel Chef wants 1 apple ($8), 1 watermelon ($8) and 1 blueberry ($7). Fresh/Okay only.' },
  { id: 'heatwave', title: 'Heatwave', icon: '🔥', price: { watermelon: 2 }, ageExtra: 1, flavour: 'Melting weather, sizzling sales!', text: 'Watermelon customers pay $2 more each. All fruit ages an extra step tonight.' },
  { id: 'blight', title: 'Apple Blight', icon: '🍎', noFruit: 'apple', price: { apple: 2 }, flavour: 'Bad news from the orchard!', text: 'No apples arrive. Apple customers pay $2 more each.' },
  { id: 'glut', title: 'Blueberry Glut', icon: '🫐', supplyEach: { blueberry: 1 }, price: { blueberry: -1 }, flavour: 'Blueberries everywhere!', text: 'Deliver 1 extra per 2 stalls, rounded up. Blueberry customers pay $1 less each.' },
  { id: 'goodHarvest', title: 'Good Harvest', icon: '🌾', supplyAll: 1, priceAll: -1, flavour: 'A bumper crop rolls in!', text: 'Deliver 1 extra of each fruit per 4 stalls, rounded up. Customers pay $1 less per fruit.' },
  { id: 'badHarvest', title: 'Bad Harvest', icon: '🐛', supplyMult: 0.5, priceAll: 1, flavour: 'Slim pickings on the farm!', text: 'Halve today’s delivery, rounded up. Customers pay $1 more per fruit.' },
  { id: 'priceHike', title: 'Price Hike', icon: '📈', cost: 1, flavour: 'Same fruit, bigger bill!', text: 'All Wholesale Market fruit costs $1 more today.' },
  { id: 'priceControls', title: 'Price Controls', icon: '⚖️', flavour: 'Keep those prices in check!', text: 'Stall prices cannot exceed the limits shown today.',
    maxPrice: { blueberry: 5, watermelon: 7, apple: 6, mango: 10 } },
  { id: 'inspector', title: 'Health Inspector', icon: '🕵️', inspector: 2, flavour: 'Surprise inspection!', text: 'Before buying, pay $2 per Soft fruit on your shelf, up to your cash. Never the final day.' },
  { id: 'strike', title: 'Lorry Breakdown', icon: '🚚', noDelivery: true, flavour: 'The fruit is stuck in traffic!', text: 'No delivery today. Existing market stock stays.' },
  { id: 'touristBus', title: 'Tourist Bus', icon: '🚌', walkIns: 2, flavour: 'Here come the hungry tourists!', text: 'Add 2 walk-ins at 2–3 stalls, 3 at 4 stalls, or 4 at 5–6 stalls, up to a row of five. Prices unchanged.' },
  { id: 'monsoon', title: 'Monsoon Downpour', icon: '🌧️', walkIns: -1, ageExtra: -1, flavour: 'Rain checks for everyone!', text: 'Remove 1 walk-in (2 at 4–6 stalls). No fruit ages tonight, including market stock.' },
  { id: 'durian', title: 'Durian Season', icon: '🌰', cost: -1, priceAll: -1, flavour: 'Durian steals the spotlight!', text: 'Wholesale fruit costs $1 less, minimum $1. Customers pay $1 less per fruit.' },
  { id: 'kenduri', title: 'Kenduri', icon: '💍',
    extra: { name: 'Wedding Caterer', wants: [{ fruit: 'watermelon', qty: 3, max: 8, fixed: true }] },
    flavour: 'There’s a wedding to feed!', text: 'After walk-ins, a caterer wants 3 Fresh/Okay watermelons at $8 each.' },
  { id: 'mangoWindfall', title: 'Mango Windfall', icon: '🥭', supplyEach: { mango: 1 }, price: { mango: -2 }, flavour: 'It’s raining mangoes!', text: 'Deliver 1 extra ripe mango per 2 stalls, rounded up. Mango customers pay $2 less each.' },
  { id: 'pasarMalam', title: 'Pasar Malam', icon: '🏮', hawker: 3, flavour: 'One last sale before closing!', text: 'After the rush, a hawker buys 1 of each fruit left in every stall’s crate at $3 each. Any freshness!' },
  { id: 'bakeOff', title: 'Bake-Off', icon: '🥧', price: { apple: 1 },
    extra: { name: 'Bakery', wants: [{ fruit: 'apple', qty: 2, max: 7, fixed: true }] },
    flavour: 'Ready, set, bake!', text: 'Apple customers pay $1 more each. The bakery wants 2 Fresh/Okay apples at $7 each.' },
];

export type FavourId = 'gossip' | 'freeFruit' | 'priority' | 'scout' | 'favouredTrade' | 'fridge';

export interface FavourDef { id: FavourId; title: string; icon: string; text: string; when: 'buy' | 'bid' | 'evening' }

export const FAVOURS: Record<FavourId, FavourDef> = {
  gossip: { id: 'gossip', title: 'Gossip', icon: '👂', when: 'evening', text: 'Play in the evening: secretly see tomorrow\'s walk-ins: who they are, what they want, how many and their top price.' },
  freeFruit: { id: 'freeFruit', title: 'Free Fruit', icon: '🎁', when: 'buy', text: 'Take one fruit of your choice from the Wholesale Market for free.' },
  priority: { id: 'priority', title: 'Priority', icon: '⏩', when: 'evening', text: 'Play in the evening: you buy first tomorrow.' },
  scout: { id: 'scout', title: 'Scout', icon: '🔍', when: 'buy', text: 'Play on your buying turn: look at the front of one walk-in who arrives today. Everyone sees you played it, but not what you saw.' },
  favouredTrade: { id: 'favouredTrade', title: 'Favoured Trade', icon: '🤝', when: 'bid', text: 'Play while pricing: you win every tied price today.' },
  fridge: { id: 'fridge', title: 'Fridge', icon: '🧊', when: 'buy', text: 'All your ripe fruit becomes one step fresher.' },
};

export const FAVOUR_DECK: FavourId[] = [
  'gossip', 'gossip', 'freeFruit', 'freeFruit', 'priority', 'priority',
  'scout', 'scout', 'favouredTrade', 'favouredTrade', 'fridge', 'fridge',
];

/** The favour deck for a table: 2 of each card (12) at 2 to 4 stalls, 3 of each (18) at 5 or 6. */
export function favourDeckFor(stalls: number): FavourId[] {
  const kinds = [...new Set(FAVOUR_DECK)];
  const copies = stalls >= 5 ? 3 : 2;
  return kinds.flatMap((k) => Array.from({ length: copies }, () => k));
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
/** The cheapest piece at the Wholesale Market (soft fruit), for the Juice Bar card's tip (REP-089 option C). */
const TIRED_COST = Math.min(...FRUITS.map((f) => FRUIT[f].cost.notso));

/**
 * Stall upgrades: each changes what a shop does. They are offered on the evening after each Market Day (days 3, 6,
 * 9, 12), whether or not Market Days are switched on. Rules 14: five upgrades at real prices, and a stall has room
 * for two.
 */
export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  juicebar: {
    id: 'juicebar', title: 'Juice Bar', icon: '🧃', cost: 4,
    // Four lines on the printed card, the most its fixed text box holds (scripts/print-deck.ts checks the fit). The tip
    // says "before the last day": no night follows the final day, so fruit bought then is never juiced.
    text: `+$${JUICE_TIP} for each okay or soft fruit you sell. Each night up to ${JUICE_CAP} pieces that would spoil become juice: $${JUICE_VALUE} each. Tip: before the last day, $${TIRED_COST} soft fruit makes $${JUICE_VALUE} of juice.`,
  },
  barrow: { id: 'barrow', title: 'Handcart', icon: '🛒', cost: 6, text: `Buy up to ${BARROW_BUY} pieces of fruit a day and hold ${BARROW_SHELF}.` },
  premium: { id: 'premium', title: 'Premium Display', icon: '🪧', cost: 6, text: 'Your fresh fruit may be priced $1 above what customers normally pay.' },
  ripening: { id: 'ripening', title: 'Ripening Room', icon: '🌡️', cost: 6, text: 'Your green mangoes ripen in one night instead of two.' },
  orderbook: { id: 'orderbook', title: 'Order Book', icon: '📒', cost: 5, text: 'You win tied bids for standing orders, and your standing-order fines are halved.' },
};
/** A stall has room for this many upgrades (rules 14). */
export const MAX_UPGRADES = 2;

// ---------- standing orders (rules 14) ----------
// A big public order turns up on each Market Day morning, due two days later. Every stall secretly names the price
// per piece it would do it for; the lowest wins the order. On the due day the order is served first: it takes the
// holder's pieces (paid at its own bid) and buys anything still missing from rivals at $1 under the holder's bid (rules 17). The holder
// is fined for every piece it did not supply itself.

export interface OrderCard { name: string; title: string; quirk: string; fruit: FruitId; /** The highest bid allowed. */ ceiling: number; /** The holder's fine per piece it did not supply. */ fine: number }

export const ORDER_CARDS: OrderCard[] = [
  { name: 'School Canteen', title: 'The School Canteen', quirk: 'Four hundred lunchboxes, each with blueberries.', fruit: 'blueberry', ceiling: 9, fine: 6 },
  { name: 'Smoothie Stand', title: 'The Smoothie Stand', quirk: 'The blender never stops.', fruit: 'blueberry', ceiling: 9, fine: 6 },
  { name: 'Beach Resort', title: 'The Beach Resort', quirk: 'Watermelon by the pool, every afternoon.', fruit: 'watermelon', ceiling: 12, fine: 8 },
  { name: 'Company Picnic', title: 'The Company Picnic', quirk: 'The boss promised watermelon.', fruit: 'watermelon', ceiling: 12, fine: 8 },
  { name: 'Pie Factory', title: 'The Pie Factory', quirk: 'A thousand pies by Friday.', fruit: 'apple', ceiling: 11, fine: 7 },
  { name: 'Cider Press', title: 'The Cider Press', quirk: 'Pressing day waits for no one.', fruit: 'apple', ceiling: 11, fine: 7 },
  { name: 'Airline Caterer', title: 'The Airline Caterer', quirk: 'First class wants ripe mango.', fruit: 'mango', ceiling: 18, fine: 12 },
  { name: 'Royal Banquet', title: 'The Royal Banquet', quirk: 'Only the ripest mango for the palace.', fruit: 'mango', ceiling: 18, fine: 12 },
];
/** A standing order is due this many days after it is announced. */
export const ORDER_LEAD = 2;
/** Pieces a standing order wants: 3 at 2 or 3 stalls, 4 at 4 stalls, 5 at 5 or 6. */
export function orderQty(stalls: number): number {
  return stalls <= 3 ? 3 : stalls === 4 ? 4 : 5;
}

/** The row never holds more than this many customers (rules 14). */
export const ROW_CAP = 5;
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

export const NEST_EGG_BONUS = 8;
export const LOCAL_FAVOURITE_TIP = 2;
export const START_CASH = 10;
/** Sharp Ears: a peeked walk-in tips this much when Farah sells them anything ($2 at 4 to 6 stalls). */
export function sharpEarsTip(stalls: number): number {
  return stalls >= 4 ? 2 : 1;
}
/** Charmer: favour cards this shop can earn in one day (everyone else: 1). */
export const CHARMER_DAILY_FAVOURS = 2;
export const FAVOUR_HAND_LIMIT = 3;

// ---------- merchant traits ----------
// Each shop picks one of three at the start, so every game opens differently.

export type TraitId = 'haggler' | 'basket' | 'bargain' | 'charmer' | 'favourite' | 'nestegg' | 'keeper' | 'earful';

export interface TraitDef { id: TraitId; title: string; text: string }

export const TRAITS: Record<TraitId, TraitDef> = {
  haggler: { id: 'haggler', title: 'Haggler', text: 'You win tied prices against equally fresh fruit.' },
  basket: { id: 'basket', title: 'Big Basket', text: 'Buy 1 extra fruit every day, at the normal price.' },
  bargain: { id: 'bargain', title: 'Bargain Hunter', text: 'Your first fruit each day costs $1 less (never below $1).' },
  charmer: { id: 'charmer', title: 'Charmer', text: 'Start with 4 favour cards, hold up to 4, and earn up to 2 favour cards a day.' },
  favourite: { id: 'favourite', title: 'Tip Jar', text: `Customers you serve completely by yourself tip you $${LOCAL_FAVOURITE_TIP}.` },
  nestegg: { id: 'nestegg', title: 'Nest Egg', text: `Start with $${START_CASH + NEST_EGG_BONUS} instead of $${START_CASH}, and buy first on day 3.` },
  keeper: { id: 'keeper', title: 'Shade Cloth', text: 'Each night, name one fruit: none of your pieces of that fruit age tonight.' },
  earful: { id: 'earful', title: 'Sharp Ears', text: 'Each evening, peek at one of tomorrow\'s walk-ins. A walk-in you have seen tips $1 if you sell to them ($2 at 4 to 6 stalls).' },
};
export const TRAIT_OFFER = 3;

// ---------- characters ----------

export interface Look { icon: string; title: string; quirk: string }

/** Every customer is a character. The key is the card's hidden code name (saves, rooms and art use it); `title` is the
 *  approved display name (DEC-064, DEC-065), the only name players read. Unknown names fall back to a generic shopper. */
export const CUSTOMER_LOOKS: Record<string, Look> = {
  John: { icon: '🧑', title: 'Cowboy Jack', quirk: 'Pays with coins he panned from the river.' },
  Robert: { icon: '🧑', title: 'Bobby Books', quirk: 'Reads the label on every blueberry.' },
  Daniel: { icon: '🧑', title: 'Dr Bubbles', quirk: 'Swears apples power his experiments.' },
  'Rara Jenab': { icon: '🧕', title: 'Rara Jenab', quirk: 'Cheers every mango she buys. "Ra-ra, Jenab!"' },
  Aisyah: { icon: '🧑', title: 'Zara Zapp', quirk: 'Needs watermelon for the lab snacks.' },
  Ravi: { icon: '🧑', title: 'Ravi Rocket', quirk: 'Saves the day, one mango at a time.' },
  'Mei Ling': { icon: '🧑', title: 'Coral Mei', quirk: 'Splashes anyone selling soggy fruit.' },
  Farid: { icon: '🧑', title: 'Postman Pip', quirk: 'You never see him arrive. Or pay.' },
  Siti: { icon: '🧑', title: 'Madam Siti', quirk: 'Measures every watermelon with her tape.' },
  Kumar: { icon: '🧑', title: 'Magic Kumar', quirk: 'Pulls three wishes out of a hat. All of them are fruit.' },
  Grace: { icon: '🧑‍🎤', title: 'Rockstar Grace', quirk: 'Apples keep her voice sharp for the show.' },
  Hafiz: { icon: '🧑', title: 'Professor Pebble', quirk: 'Says "RAWR" and means five blueberries.' },
  'Wei Jie': { icon: '🕵️', title: 'Inspector Wei', quirk: 'Inspects every fruit with a magnifying glass.' },
  Nurul: { icon: '🧑', title: 'Miss Marigold', quirk: 'Sprinkles petals on every watermelon.' },
  Priya: { icon: '👩‍🔬', title: 'Dr Priya', quirk: 'Researching the perfect apple pie.' },
  Ahmad: { icon: '🧑‍✈️', title: 'Captain Ahmad', quirk: 'Buying mangoes for the whole crew.' },
  Sarah: { icon: '🧑', title: 'Lola Lens', quirk: 'Photographs every mango before she buys it.' },
  Tan: { icon: '👴', title: 'Grandpa Tan', quirk: 'Remembers when apples cost ten cents.' },
  Lina: { icon: '💃', title: 'Miss Cha-Cha', quirk: 'Cha-chas all the way down the street.' },
  Zul: { icon: '🧑', title: 'Sleepy Zul', quirk: 'Wants fresh fruit. Has not had his coffee.' },
  Anna: { icon: '👩‍🎨', title: 'Anna the Artist', quirk: 'Paints every mango before she eats it.' },
  Vijay: { icon: '🧑', title: 'Otto Oddjob', quirk: 'Calculates the best fruit salad.' },
  'Hui Min': { icon: '🧑', title: 'Mina Moss', quirk: 'Rangers are wild about watermelon.' },
  Osman: { icon: '👨‍🚒', title: 'Firefighter Osman', quirk: 'Cools down after every call with watermelon.' },
  'Jia Wen': { icon: '🧑', title: 'Marina Wen', quirk: 'Pays in coins from far ports. Reads the mango map twice.' },
  Rizal: { icon: '🎧', title: 'DJ Rizal', quirk: 'Drops the beat, then drops by for blueberries.' },
  Devi: { icon: '🧑‍🌾', title: 'Devi Bloom', quirk: 'Grows everything except mangoes. Buys them all.' },
  Marcus: { icon: '🧑', title: 'Marcus Hook', quirk: 'Sells fish at dawn, buys apples by noon.' },
  Fatimah: { icon: '🎓', title: 'Professor Fatimah', quirk: 'Lectures on the science of the perfect watermelon.' },
  Ben: { icon: '🛎️', title: 'Benny Bell', quirk: 'Rings a little bell for every watermelon he carries.' },
  Yuki: { icon: '🧑', title: 'Akira Swift', quirk: 'Slices a mango in one clean stroke.' },
  Hadi: { icon: '👷', title: 'Hadi Hammer', quirk: 'Builds towers of blueberries on his lunch break.' },
  Lakshmi: { icon: '🥐', title: 'Baker Lakshmi', quirk: 'Her famous apple tart starts at your stall.' },
  Kenji: { icon: '🥋', title: 'Kenji Kaze', quirk: 'Flips a mango, catches it, pays for it.' },
  Mira: { icon: '🧑', title: 'Herbalist Mira', quirk: 'Brews a mango tonic. Do not ask what is in it.' },
  'Hock Seng': { icon: '🧓', title: 'Uncle Hock Seng', quirk: 'Has strong opinions about the price of apples.' },
  Influencer: { icon: '🤳', title: 'The Influencer', quirk: 'Will post your stall if the mangoes are perfect.' },
  'Gym Club': { icon: '🏋️', title: 'The Gym Club', quirk: 'Need. More. Antioxidants.' },
  'Hotel Chef': { icon: '👨‍🍳', title: 'The Hotel Chef', quirk: 'Running a five-star breakfast buffet.' },
  'Wedding Caterer': { icon: '💍', title: 'The Wedding Caterer', quirk: 'Feeding five hundred guests by sundown.' },
  Bakery: { icon: '🥧', title: 'The Bakery', quirk: 'Needs apples for the prize-winning pie.' },
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
  { name: 'Rosa', avatar: '🦊', quip: 'Too easy!', lines: {
    undercut: ['Too easy!', 'A dollar cheaper. Sorry, not sorry!', 'Sharper than you again!'],
    fullPrice: ['Full price? Lovely.', 'They didn\'t even haggle!'],
    stung: ['Hmph. Lucky.', 'That one was mine!', 'Next time, darling.'],
    lost: ['Fine, keep your customer.', 'I meant to do that.'] } },
  { name: 'Uncle Benny', avatar: '🐻', quip: 'Big baskets, big deals!', lines: {
    undercut: ['Big baskets, big deals!', 'Cheaper AND bigger.', 'Fill the basket, friend!'],
    fullPrice: ['Top dollar! Ka-ching!', 'Full price, full basket!'],
    stung: ['Aiyo, my customer!', 'I want a recount.', 'You were quicker. Hmph.'],
    lost: ['Plenty more fruit where that came from.', 'Oof. Too pricey.'] } },
  { name: 'Ah Chen', avatar: '🐼', quip: 'Smile and sell!', lines: {
    undercut: ['Smile and sell!', 'Charm AND a cheaper price.', 'Sorry, sweetheart!'],
    fullPrice: ['Full price, with a smile.', 'A fair price, gladly paid.'],
    stung: ['You charmed them first. Cheeky!', 'So close... breathe.', 'Well played, friend.'],
    lost: ['Charm is a long game.', 'I will win them tomorrow.'] } },
  { name: 'Saleh', avatar: '🐸', quip: 'Every sen counts!', lines: {
    undercut: ['Every sen counts!', 'Jimat, jimat! Mine is cheaper.', 'Sorry, my price wins.'],
    fullPrice: ['Full price? Terima kasih!', 'Rezeki! Full price today.'],
    stung: ['Aiyo, that one was mine!', 'Next time, my friend.', 'You were quick, I will say that.'],
    lost: ['Never mind, I saved for this.', 'Tomorrow is another day.'] } },
  { name: 'Raj', avatar: '🦝', quip: 'Found a bargain!', lines: {
    undercut: ['Found a bargain, sold a bargain!', 'Cheap and cheerful!', 'Lucky me!'],
    fullPrice: ['Full price. Lucky day!', 'Ka-ching, lucky Raj!'],
    stung: ['Unlucky! That was mine.', 'You got lucky there.', 'Next time, friend!'],
    lost: ['Luck will turn.', 'Not my day. Tomorrow!'] } },
  { name: 'Kiki', avatar: '🐷', quip: 'Thank you, thank you!', lines: {
    undercut: ['A kinder price for everyone!', 'Cheaper, with a smile.', 'Thank you, thank you!'],
    fullPrice: ['Thank you, full price!', 'So kind of them. Full price!'],
    stung: ['Oh! You were faster.', 'I wanted to serve them!', 'Next time, dear.'],
    lost: ['Kindness comes back around.', 'No worries. Another day.'] } },
  { name: 'Pak Din', avatar: '🐢', quip: 'Slow and steady!', lines: {
    undercut: ['Slow and steady wins!', 'A little cheaper, a lot fresher.', 'Patience pays, friend.'],
    fullPrice: ['Full price. Worth the wait!', 'Kept it fresh, sold it full.'],
    stung: ['Hmm. Too slow today.', 'You beat the old tortoise.', 'Next time, young one.'],
    lost: ['My fruit will keep.', 'There is always tomorrow.'] } },
  { name: 'Farah', avatar: '🦜', quip: 'I heard that!', lines: {
    undercut: ['I heard what they wanted!', 'Little bird told me. Cheaper!', 'Squawk! Mine!'],
    fullPrice: ['Full price! I knew it.', 'Heard it first, sold it first.'],
    stung: ['I should have listened closer.', 'Squawk! That was mine!', 'You heard it too?'],
    lost: ['I will hear the next one.', 'Fine, fine. Tomorrow!'] } },
];

/** The eight playable characters, in table order. */
export const CHARACTER_AVATARS: string[] = RIVALS.map((r) => r.avatar);

/** The shopkeepers' display names before DEC-064, in RIVALS order. Saved games and achievement progress may still hold them. */
export const LEGACY_RIVAL_NAMES: string[] = ['Rosa', 'Benny', 'Chen', 'Saleh', 'Raj', 'Kiran'];
