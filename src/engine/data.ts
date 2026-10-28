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
//  watermelon - the steady middle: decent margin, loses value slowly
//  apple      - the keeper: keeps a week and barely loses value; never the best price, never a loss
//  mango      - arrives green for $3, ripens on your shelf, sells at a premium, then spoils fast
export const FRUIT: Record<FruitId, FruitDef> = {
  blueberry: {
    id: 'blueberry', name: 'Blueberry', plural: 'Blueberries', color: '#4f5bd5',
    theme: 'Cheap and popular, but mushy in 3 days. Sell fast!',
    ripe: ['notso', 'okay', 'fresh'], drop: [2, 1, 0], unripeSlots: 0,
    cost: { fresh: 2, okay: 1, notso: 1, unripe: 1 },
  },
  watermelon: {
    id: 'watermelon', name: 'Watermelon', plural: 'Watermelons', color: '#2e9e4f',
    theme: 'The steady seller. Loses value slowly over 5 days.',
    ripe: ['notso', 'okay', 'okay', 'fresh', 'fresh'], drop: [2, 1, 1, 0, 0], unripeSlots: 1,
    cost: { fresh: 3, okay: 2, notso: 1, unripe: 1 },
  },
  apple: {
    id: 'apple', name: 'Apple', plural: 'Apples', color: '#e0393e',
    theme: 'The keeper: lasts a week and hardly loses value. Never the best price, never a loss.',
    ripe: ['notso', 'okay', 'okay', 'okay', 'fresh', 'fresh', 'fresh'], drop: [2, 1, 1, 1, 0, 0, 0], unripeSlots: 0,
    cost: { fresh: 3, okay: 2, notso: 1, unripe: 1 },
  },
  mango: {
    id: 'mango', name: 'Mango', plural: 'Mangoes', color: '#f2b705',
    theme: 'Buy green for $3, let it ripen for 2 nights, sell at a premium. Spoils fast once ripe.',
    ripe: ['notso', 'okay', 'fresh', 'fresh'], drop: [2, 1, 0, 0], unripeSlots: 2,
    cost: { fresh: 4, okay: 2, notso: 1, unripe: 3 },
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

export interface FarmerCard { supply: Partial<Record<FruitId, number>>; unripe?: FruitId }

// 20 farmer cards, printed as they arrive with 3 shops: three fruits at 3-5 each; the fourth fruit comes as 1.
// With 2 shops, one less of each listed fruit (minimum 1); with 4 shops, one more of every fruit.
export const FARMER_CARDS: FarmerCard[] = [
  { supply: { apple: 5, watermelon: 5, blueberry: 4 } },
  { supply: { mango: 4, apple: 3, blueberry: 5 } },
  { supply: { mango: 5, watermelon: 4, apple: 3 }, unripe: 'mango' },
  { supply: { blueberry: 5, watermelon: 3, mango: 4 } },
  { supply: { apple: 4, mango: 4, watermelon: 4 }, unripe: 'mango' },
  { supply: { blueberry: 4, apple: 4, mango: 3 } },
  { supply: { watermelon: 5, blueberry: 3, apple: 4 }, unripe: 'watermelon' },
  { supply: { mango: 3, apple: 5, blueberry: 4 } },
  { supply: { watermelon: 4, mango: 5, blueberry: 3 }, unripe: 'mango' },
  { supply: { apple: 3, watermelon: 4, mango: 5 } },
  { supply: { blueberry: 5, mango: 5, apple: 3 }, unripe: 'mango' },
  { supply: { watermelon: 3, apple: 5, mango: 4 } },
  { supply: { blueberry: 4, watermelon: 5, mango: 3 }, unripe: 'watermelon' },
  { supply: { apple: 4, blueberry: 3, watermelon: 5 } },
  { supply: { mango: 4, blueberry: 4, apple: 4 }, unripe: 'mango' },
  { supply: { watermelon: 4, apple: 3, blueberry: 5 } },
  { supply: { mango: 5, apple: 4, watermelon: 3 }, unripe: 'mango' },
  { supply: { blueberry: 3, mango: 4, watermelon: 5 } },
  { supply: { apple: 5, blueberry: 5, mango: 3 }, unripe: 'mango' },
  { supply: { watermelon: 5, mango: 3, apple: 4 } },
];

export interface Want { fruit: FruitId; qty: number; max: number }
export interface CustomerCard { name: string; wants: Want[] }

// 36 customers. Max price is what they pay for a fresh fruit.
const RAW_CUSTOMERS: CustomerCard[] = [
  { name: 'John', wants: [{ fruit: 'apple', qty: 3, max: 10 }, { fruit: 'watermelon', qty: 2, max: 6 }] },
  { name: 'Robert', wants: [{ fruit: 'blueberry', qty: 3, max: 7 }, { fruit: 'mango', qty: 2, max: 5 }] },
  { name: 'Daniel', wants: [{ fruit: 'mango', qty: 1, max: 8 }, { fruit: 'apple', qty: 3, max: 9 }, { fruit: 'blueberry', qty: 2, max: 6 }] },
  { name: 'Rara Jenab', wants: [{ fruit: 'mango', qty: 4, max: 7 }, { fruit: 'blueberry', qty: 1, max: 7 }] },
  { name: 'Aisyah', wants: [{ fruit: 'watermelon', qty: 3, max: 8 }] },
  { name: 'Ravi', wants: [{ fruit: 'mango', qty: 3, max: 9 }, { fruit: 'apple', qty: 1, max: 8 }] },
  { name: 'Mei Ling', wants: [{ fruit: 'blueberry', qty: 4, max: 6 }, { fruit: 'watermelon', qty: 1, max: 7 }] },
  { name: 'Farid', wants: [{ fruit: 'apple', qty: 4, max: 8 }] },
  { name: 'Siti', wants: [{ fruit: 'mango', qty: 2, max: 8 }, { fruit: 'watermelon', qty: 2, max: 7 }] },
  { name: 'Kumar', wants: [{ fruit: 'watermelon', qty: 2, max: 9 }, { fruit: 'blueberry', qty: 2, max: 5 }] },
  { name: 'Grace', wants: [{ fruit: 'apple', qty: 2, max: 10 }, { fruit: 'mango', qty: 2, max: 6 }] },
  { name: 'Hafiz', wants: [{ fruit: 'blueberry', qty: 5, max: 6 }] },
  { name: 'Wei Jie', wants: [{ fruit: 'mango', qty: 2, max: 7 }, { fruit: 'apple', qty: 2, max: 7 }, { fruit: 'watermelon', qty: 1, max: 8 }] },
  { name: 'Nurul', wants: [{ fruit: 'watermelon', qty: 4, max: 7 }] },
  { name: 'Priya', wants: [{ fruit: 'apple', qty: 3, max: 9 }, { fruit: 'blueberry', qty: 1, max: 8 }] },
  { name: 'Ahmad', wants: [{ fruit: 'mango', qty: 5, max: 6 }] },
  { name: 'Sarah', wants: [{ fruit: 'blueberry', qty: 2, max: 8 }, { fruit: 'mango', qty: 2, max: 7 }] },
  { name: 'Tan', wants: [{ fruit: 'watermelon', qty: 2, max: 8 }, { fruit: 'apple', qty: 2, max: 9 }] },
  { name: 'Lina', wants: [{ fruit: 'apple', qty: 1, max: 11 }, { fruit: 'mango', qty: 3, max: 7 }] },
  { name: 'Zul', wants: [{ fruit: 'blueberry', qty: 3, max: 7 }, { fruit: 'watermelon', qty: 2, max: 6 }] },
  { name: 'Anna', wants: [{ fruit: 'mango', qty: 3, max: 8 }] },
  { name: 'Vijay', wants: [{ fruit: 'apple', qty: 2, max: 8 }, { fruit: 'blueberry', qty: 2, max: 7 }, { fruit: 'mango', qty: 1, max: 9 }] },
  { name: 'Hui Min', wants: [{ fruit: 'watermelon', qty: 3, max: 7 }, { fruit: 'mango', qty: 1, max: 8 }] },
  { name: 'Osman', wants: [{ fruit: 'apple', qty: 3, max: 8 }, { fruit: 'watermelon', qty: 1, max: 9 }] },
  { name: 'Jia Wen', wants: [{ fruit: 'apple', qty: 2, max: 9 }, { fruit: 'mango', qty: 2, max: 7 }] },
  { name: 'Rizal', wants: [{ fruit: 'blueberry', qty: 3, max: 6 }, { fruit: 'watermelon', qty: 2, max: 7 }] },
  { name: 'Devi', wants: [{ fruit: 'mango', qty: 4, max: 7 }] },
  { name: 'Marcus', wants: [{ fruit: 'apple', qty: 3, max: 8 }, { fruit: 'mango', qty: 1, max: 8 }, { fruit: 'blueberry', qty: 1, max: 7 }] },
  { name: 'Fatimah', wants: [{ fruit: 'watermelon', qty: 2, max: 8 }, { fruit: 'blueberry', qty: 2, max: 6 }] },
  { name: 'Ben', wants: [{ fruit: 'watermelon', qty: 3, max: 7 }] },
  { name: 'Yuki', wants: [{ fruit: 'mango', qty: 3, max: 6 }, { fruit: 'apple', qty: 2, max: 9 }] },
  { name: 'Hadi', wants: [{ fruit: 'blueberry', qty: 4, max: 7 }] },
  { name: 'Lakshmi', wants: [{ fruit: 'apple', qty: 2, max: 10 }, { fruit: 'watermelon', qty: 2, max: 8 }] },
  { name: 'Kenji', wants: [{ fruit: 'mango', qty: 2, max: 8 }, { fruit: 'blueberry', qty: 2, max: 6 }, { fruit: 'watermelon', qty: 1, max: 9 }] },
  { name: 'Mira', wants: [{ fruit: 'mango', qty: 3, max: 7 }, { fruit: 'apple', qty: 1, max: 8 }] },
  { name: 'Hock Seng', wants: [{ fruit: 'apple', qty: 3, max: 8 }, { fruit: 'watermelon', qty: 1, max: 9 }, { fruit: 'mango', qty: 1, max: 8 }] },
];

const PRICE_SHIFT: Record<FruitId, number> = { blueberry: -1, watermelon: 0, apple: -2, mango: 2 };
export const CUSTOMER_CARDS: CustomerCard[] = RAW_CUSTOMERS.map((c) => ({
  ...c,
  wants: c.wants.map((w) => ({ ...w, max: w.max + PRICE_SHIFT[w.fruit] })),
}));

export type EventId =
  | 'festival' | 'glut' | 'heatwave' | 'blight' | 'mangoCraze' | 'superfood' | 'goodHarvest'
  | 'badHarvest' | 'priceHike' | 'minPrice' | 'inspector' | 'strike' | 'hotel';

export interface EventCard {
  id: EventId;
  title: string;
  text: string;
  icon: string;
  /** Added to every customer's price today. */
  priceAll?: number;
  /** Added to customers' price for one fruit today. */
  price?: Partial<Record<FruitId, number>>;
  /** Added to every farmers-market price today. */
  cost?: number;
  /** Extra fruit of each kind in today's delivery, per 2 shops (rounded up). */
  supplyPerTwo?: number;
  /** Extra fruit of one kind in today's delivery, per shop. */
  supplyPerShop?: Partial<Record<FruitId, number>>;
  /** No fruit of this kind is delivered today. */
  noFruit?: FruitId;
  /** Multiplies today's delivery. */
  supplyMult?: number;
  noDelivery?: boolean;
  /** Change to the number of walk-in customers today. */
  walkIns?: number;
  /** A special customer who also comes today. */
  extra?: CustomerCard;
  /** Extra ageing tonight. */
  ageExtra?: number;
  /** Fine per Not-so fruit on a shop's shelf tonight. */
  inspector?: number;
  minPrice?: Record<FruitId, number>;
}

export const EVENT_CARDS: EventCard[] = [
  { id: 'festival', title: 'Festival', icon: '🎉', priceAll: 3, walkIns: 1, text: 'Customers pay $3 more per fruit, and an extra walk-in comes.' },
  { id: 'glut', title: 'Blueberry Glut', icon: '🫐', supplyPerShop: { blueberry: 1 }, price: { blueberry: -1 }, text: 'Farmers bring 1 extra blueberry per stall, and blueberry customers pay $1 less.' },
  { id: 'heatwave', title: 'Heatwave', icon: '🔥', price: { watermelon: 4 }, ageExtra: 1, text: 'Watermelons sell for $4 more, but all fruit ages an extra step tonight.' },
  { id: 'blight', title: 'Apple Blight', icon: '🍎', noFruit: 'apple', price: { apple: 1 }, text: 'No apples arrive today, and apple customers pay $1 more.' },
  { id: 'mangoCraze', title: 'Mango Craze', icon: '📱', price: { mango: 3 },
    extra: { name: 'Influencer', wants: [{ fruit: 'mango', qty: 3, max: 11 }] },
    text: 'A viral video! Mangoes sell for $3 more, and an influencer wants 3.' },
  { id: 'superfood', title: 'Superfood Trend', icon: '💪', price: { blueberry: 3 },
    extra: { name: 'Gym Club', wants: [{ fruit: 'blueberry', qty: 4, max: 8 }] },
    text: 'Blueberries sell for $3 more, and the gym club wants 4.' },
  { id: 'goodHarvest', title: 'Good Harvest', icon: '🌾', supplyPerTwo: 1, cost: -1, text: 'Farmers bring 1 extra of every fruit for every 2 stalls, and everything costs $1 less.' },
  { id: 'badHarvest', title: 'Bad Harvest', icon: '🐛', supplyMult: 0.5, priceAll: 2, text: 'Farmers bring half as much (rounded up). Scarce fruit sells for $2 more.' },
  { id: 'priceHike', title: 'Price Hike', icon: '📈', cost: 1, text: 'Every fruit at the Wholesale Market costs $1 more today.' },
  { id: 'minPrice', title: 'Minimum Price', icon: '⚖️', text: 'No stall may sell below these prices today.',
    minPrice: { watermelon: 5, apple: 5, mango: 6, blueberry: 4 } },
  { id: 'inspector', title: 'Health Inspector', icon: '🕵️', inspector: 2, text: 'Tonight every stall pays a $2 fine for each tired piece on its shelf. (Never the last day\'s event.)' },
  { id: 'strike', title: 'Lorry Breakdown', icon: '🚚', noDelivery: true, text: 'No farmer delivery today. Fruit already at the market stays.' },
  { id: 'hotel', title: 'Hotel Order', icon: '🏨',
    extra: { name: 'Hotel Chef', wants: [{ fruit: 'apple', qty: 3, max: 8 }, { fruit: 'watermelon', qty: 2, max: 8 }, { fruit: 'blueberry', qty: 2, max: 7 }] },
    text: 'A hotel chef places a big order today.' },
];

export type FavourId = 'gossip' | 'freeFruit' | 'priority' | 'goodRiddance' | 'favouredTrade' | 'fridge';

export interface FavourDef { id: FavourId; title: string; icon: string; text: string; when: 'buy' | 'bid' | 'evening' }

export const FAVOURS: Record<FavourId, FavourDef> = {
  gossip: { id: 'gossip', title: 'Gossip', icon: '👂', when: 'evening', text: 'Play in the evening: secretly see tomorrow\'s walk-ins: who they are, what they want, how many and their top price.' },
  freeFruit: { id: 'freeFruit', title: 'Free Fruit', icon: '🎁', when: 'buy', text: 'Take one fruit of your choice from the Wholesale Market for free.' },
  priority: { id: 'priority', title: 'Priority', icon: '⏩', when: 'evening', text: 'Play in the evening: you buy first tomorrow.' },
  goodRiddance: { id: 'goodRiddance', title: 'Good Riddance', icon: '♻️', when: 'buy', text: 'Sell all your ripe stock back to the Wholesale Market for $1 each.' },
  favouredTrade: { id: 'favouredTrade', title: 'Favoured Trade', icon: '🤝', when: 'bid', text: 'Play while pricing: you win every tied price today.' },
  fridge: { id: 'fridge', title: 'Fridge', icon: '🧊', when: 'buy', text: 'All your fruit becomes one step fresher.' },
};

export const FAVOUR_DECK: FavourId[] = [
  'gossip', 'gossip', 'freeFruit', 'freeFruit', 'priority', 'priority',
  'goodRiddance', 'goodRiddance', 'favouredTrade', 'favouredTrade', 'fridge', 'fridge',
];

export type UpgradeId = 'coldroom' | 'juicebar' | 'barrow' | 'premium';

export interface UpgradeDef { id: UpgradeId; title: string; icon: string; cost: number; text: string }

/**
 * Stall specialities (rules 4): one per plan, each changing what a shop does. They are offered on the evening
 * after each Market Day (days 3, 6, 9, 12), whether or not Market Days are switched on.
 */
export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  coldroom: { id: 'coldroom', title: 'Cold Room', icon: '❄️', cost: 4, text: 'Your fruit ages only every other night, and heatwaves can\'t touch it. Hold stock for a shortage.' },
  juicebar: { id: 'juicebar', title: 'Juice Bar', icon: '🧃', cost: 3, text: 'Each okay or tired fruit you sell earns $1 extra. Each night up to 3 pieces of fruit that would spoil become juice: $2 each.' },
  barrow: { id: 'barrow', title: 'Handcart', icon: '🛒', cost: 6, text: 'Buy up to 5 pieces of fruit a day and hold 12.' },
  premium: { id: 'premium', title: 'Premium Display', icon: '🪧', cost: 8, text: 'Your fresh fruit may be priced $1 above what customers normally pay.' },
};
export const UPGRADE_OFFER = 4;

export const BASE_SHELF = 8;
export const BARROW_SHELF = 12;
export const BASE_BUY = 4;
export const BARROW_BUY = 5;
/** Market Days (and the speciality draft) fall on every 3rd day: 3, 6, 9, 12. */
export const MARKET_DAY_EVERY = 3;
/** Street prices (beginner option): what every customer pays for a fresh fruit; generous customers pay $2 more. */
export const STREET_PRICE: Record<FruitId, number> = { blueberry: 5, watermelon: 7, apple: 6, mango: 9 };
export const GENEROUS_BONUS = 2;
/** Market pulse (advanced option): each fruit's price marker runs from -$1 to +$2. */
export const PULSE_MIN = -1;
export const PULSE_MAX = 2;
/** Last Call: on the final day customers pay $1 more, and the jam maker buys leftover ripe fruit for $1 each. */
export const LAST_CALL_BONUS = 1;
export const JAM_PRICE = 1;

export const NEST_EGG_BONUS = 5;
export const LOCAL_FAVOURITE_TIP = 4;
/** Juice Bar: extra dollars for each okay or not-so fruit sold. */
export const JUICE_TIP = 1;
export const START_CASH = 10;
export const FAVOUR_HAND_LIMIT = 3;

// ---------- merchant traits ----------
// Each shop picks one of three at the start, so every game opens differently.

export type TraitId = 'haggler' | 'basket' | 'bargain' | 'charmer' | 'favourite' | 'nestegg';

export interface TraitDef { id: TraitId; title: string; text: string }

export const TRAITS: Record<TraitId, TraitDef> = {
  haggler: { id: 'haggler', title: 'Haggler', text: 'You win tied prices, even against fresher fruit.' },
  basket: { id: 'basket', title: 'Big Basket', text: 'Buy 1 extra fruit every day.' },
  bargain: { id: 'bargain', title: 'Bargain Hunter', text: 'Your first fruit each day costs $1 less.' },
  charmer: { id: 'charmer', title: 'Charmer', text: 'Start with 3 favour cards, and hold up to 4.' },
  favourite: { id: 'favourite', title: 'Tip Jar', text: 'Customers you serve completely by yourself tip you $4.' },
  nestegg: { id: 'nestegg', title: 'Nest Egg', text: 'Start with $15 instead of $10.' },
};
export const TRAIT_OFFER = 3;

// ---------- characters ----------

export interface Look { icon: string; title: string; quirk: string }

/** Every customer is a character. Unknown names fall back to a generic shopper. */
export const CUSTOMER_LOOKS: Record<string, Look> = {
  John: { icon: '🧑', title: 'Rancher John', quirk: 'Pays with coins he panned from the river.' },
  Robert: { icon: '🧑', title: 'Librarian Robert', quirk: 'Reads the label on every blueberry.' },
  Daniel: { icon: '🧑', title: 'Chemist Daniel', quirk: 'Swears apples power his experiments.' },
  'Rara Jenab': { icon: '🧕', title: 'Rara Jenab', quirk: 'Cheers every mango she buys. "Ra-ra, Jenab!"' },
  Aisyah: { icon: '🧑', title: 'Scientist Aisyah', quirk: 'Needs watermelon for the lab snacks.' },
  Ravi: { icon: '🧑', title: 'Delivery Rider Ravi', quirk: 'Saves the day, one mango at a time.' },
  'Mei Ling': { icon: '🧑', title: 'Diver Mei Ling', quirk: 'Splashes anyone selling soggy fruit.' },
  Farid: { icon: '🧑', title: 'Courier Farid', quirk: 'You never see him arrive. Or pay.' },
  Siti: { icon: '🧑', title: 'Tailor Siti', quirk: 'Measures every watermelon with her tape.' },
  Kumar: { icon: '🧑', title: 'Magician Kumar', quirk: 'Pulls three wishes out of a hat. All of them are fruit.' },
  Grace: { icon: '🧑‍🎤', title: 'Rockstar Grace', quirk: 'Apples keep her voice sharp for the show.' },
  Hafiz: { icon: '🧑', title: 'Paleontologist Hafiz', quirk: 'Says "RAWR" and means five blueberries.' },
  'Wei Jie': { icon: '🕵️', title: 'Detective Wei Jie', quirk: 'Inspects every fruit with a magnifying glass.' },
  Nurul: { icon: '🧑', title: 'Florist Nurul', quirk: 'Sprinkles petals on every watermelon.' },
  Priya: { icon: '👩‍🔬', title: 'Dr Priya', quirk: 'Researching the perfect apple pie.' },
  Ahmad: { icon: '🧑‍✈️', title: 'Captain Ahmad', quirk: 'Buying mangoes for the whole crew.' },
  Sarah: { icon: '🧑', title: 'Photographer Sarah', quirk: 'Photographs every mango before she buys it.' },
  Tan: { icon: '👴', title: 'Grandpa Tan', quirk: 'Remembers when apples cost ten cents.' },
  Lina: { icon: '💃', title: 'Dancing Lina', quirk: 'Cha-chas all the way down the street.' },
  Zul: { icon: '🧑', title: 'Sleepy Zul', quirk: 'Wants fresh fruit. Has not had his coffee.' },
  Anna: { icon: '👩‍🎨', title: 'Anna the Artist', quirk: 'Paints every mango before she eats it.' },
  Vijay: { icon: '🧑', title: 'Engineer Vijay', quirk: 'Calculates the best fruit salad.' },
  'Hui Min': { icon: '🧑', title: 'Ranger Hui Min', quirk: 'Rangers are wild about watermelon.' },
  Osman: { icon: '👨‍🚒', title: 'Firefighter Osman', quirk: 'Cools down after every call with watermelon.' },
  'Jia Wen': { icon: '🧑', title: 'Sailor Jia Wen', quirk: 'Pays in coins from far ports. Reads the mango map twice.' },
  Rizal: { icon: '🎧', title: 'DJ Rizal', quirk: 'Drops the beat, then drops by for blueberries.' },
  Devi: { icon: '🧑‍🌾', title: 'Gardener Devi', quirk: 'Grows everything except mangoes. Buys them all.' },
  Marcus: { icon: '🧑', title: 'Fisherman Marcus', quirk: 'Sells fish at dawn, buys apples by noon.' },
  Fatimah: { icon: '🎓', title: 'Professor Fatimah', quirk: 'Lectures on the science of the perfect watermelon.' },
  Ben: { icon: '🛎️', title: 'Bellboy Ben', quirk: 'Rings a little bell for every watermelon he carries.' },
  Yuki: { icon: '🧑', title: 'Fencer Yuki', quirk: 'Slices a mango in one clean stroke.' },
  Hadi: { icon: '👷', title: 'Builder Hadi', quirk: 'Builds towers of blueberries on his lunch break.' },
  Lakshmi: { icon: '🥐', title: 'Baker Lakshmi', quirk: 'Her famous apple tart starts at your stall.' },
  Kenji: { icon: '🥋', title: 'Judoka Kenji', quirk: 'Flips a mango, catches it, pays for it.' },
  Mira: { icon: '🧑', title: 'Herbalist Mira', quirk: 'Brews a mango tonic. Do not ask what is in it.' },
  'Hock Seng': { icon: '🧓', title: 'Uncle Hock Seng', quirk: 'Has strong opinions about the price of apples.' },
  Influencer: { icon: '🤳', title: 'The Influencer', quirk: 'Will post your stall if the mangoes are perfect.' },
  'Gym Club': { icon: '🏋️', title: 'The Gym Club', quirk: 'Need. More. Antioxidants.' },
  'Hotel Chef': { icon: '👨‍🍳', title: 'The Hotel Chef', quirk: 'Running a five-star breakfast buffet.' },
};

export function lookOf(name: string): Look {
  return CUSTOMER_LOOKS[name] ?? { icon: '🧑', title: name, quirk: 'Just here for fruit.' };
}

/** Computer shopkeepers: a cast of animal traders, each with a victory line. */
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

/** Computer shopkeepers: a cast of animal traders. Their lines react to what actually happened;
 *  their buying and pricing come from the difficulty level, not from these personalities. */
// Character cards (rules 5). Each shopkeeper is a character any shop can pick, and carries one fixed perk
// (a merchant trait). A character can be taken by one shop only, so no two shops share a perk or an icon. The avatar keys are old identifiers (saves and rooms use them); they are never shown.
export const CHARACTER_TRAIT: Record<string, TraitId> = {
  '🦊': 'haggler', '🐻': 'basket', '🦝': 'bargain', '🐼': 'charmer', '🐷': 'favourite', '🐸': 'nestegg',
};

export const RIVALS: { name: string; avatar: string; quip: string; lines: RivalLines }[] = [
  { name: 'Rosa', avatar: '🦊', quip: 'Too easy!', lines: {
    undercut: ['Too easy!', 'A dollar cheaper. Sorry, not sorry!', 'Sharper than you again!'],
    fullPrice: ['Full price? Lovely.', 'They didn\'t even haggle!'],
    stung: ['Hmph. Lucky.', 'That one was mine!', 'Next time, darling.'],
    lost: ['Fine, keep your customer.', 'I meant to do that.'] } },
  { name: 'Benny', avatar: '🐻', quip: 'Big baskets, big deals!', lines: {
    undercut: ['Big baskets, big deals!', 'Cheaper AND bigger.', 'Fill the basket, friend!'],
    fullPrice: ['Top dollar! Ka-ching!', 'Full price, full basket!'],
    stung: ['Aiyo, my customer!', 'I want a recount.', 'You were quicker. Hmph.'],
    lost: ['Plenty more fruit where that came from.', 'Oof. Too pricey.'] } },
  { name: 'Chen', avatar: '🐼', quip: 'Smile and sell!', lines: {
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
  { name: 'Kiran', avatar: '🐷', quip: 'Thank you, thank you!', lines: {
    undercut: ['A kinder price for everyone!', 'Cheaper, with a smile.', 'Thank you, thank you!'],
    fullPrice: ['Thank you, full price!', 'So kind of them. Full price!'],
    stung: ['Oh! You were faster.', 'I wanted to serve them!', 'Next time, dear.'],
    lost: ['Kindness comes back around.', 'No worries. Another day.'] } },
];

/** The six playable characters, in table order. */
export const CHARACTER_AVATARS: string[] = RIVALS.map((r) => r.avatar);
