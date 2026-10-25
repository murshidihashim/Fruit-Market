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
  /** Ripe track, oldest first. Unripe slots are added after this. */
  ripe: Stage[];
  unripeSlots: number;
  cost: { fresh: number; okay: number; notso: number; unripe: number };
  /** Taken off the customer's max price when the fruit is not fresh. */
  penalty: { okay: number; notso: number };
}

export const FRUIT: Record<FruitId, FruitDef> = {
  blueberry: {
    id: 'blueberry', name: 'Blueberry', plural: 'Blueberries', color: '#4f5bd5',
    ripe: ['notso', 'okay', 'fresh'], unripeSlots: 0,
    cost: { fresh: 2, okay: 1, notso: 1, unripe: 1 }, penalty: { okay: 1, notso: 3 },
  },
  watermelon: {
    id: 'watermelon', name: 'Watermelon', plural: 'Watermelons', color: '#2e9e4f',
    ripe: ['notso', 'okay', 'okay', 'fresh', 'fresh'], unripeSlots: 1,
    cost: { fresh: 3, okay: 2, notso: 1, unripe: 1 }, penalty: { okay: 2, notso: 3 },
  },
  apple: {
    id: 'apple', name: 'Apple', plural: 'Apples', color: '#e0393e',
    ripe: ['notso', 'okay', 'okay', 'okay', 'fresh', 'fresh', 'fresh'], unripeSlots: 1,
    cost: { fresh: 4, okay: 2, notso: 1, unripe: 1 }, penalty: { okay: 2, notso: 4 },
  },
  mango: {
    id: 'mango', name: 'Mango', plural: 'Mangoes', color: '#f2b705',
    ripe: ['notso', 'notso', 'okay', 'okay', 'okay', 'fresh', 'fresh'], unripeSlots: 2,
    cost: { fresh: 3, okay: 2, notso: 1, unripe: 1 }, penalty: { okay: 2, notso: 3 },
  },
};

export function trackLength(f: FruitId, unripe: boolean): number {
  return FRUIT[f].ripe.length + (unripe ? FRUIT[f].unripeSlots : 0);
}

export function stageAt(f: FruitId, pos: number): Stage {
  const r = FRUIT[f].ripe;
  return pos < r.length ? r[pos] : 'unripe';
}

/** Position a fresh (ripe) delivery enters at. */
export function freshPos(f: FruitId): number {
  return FRUIT[f].ripe.length - 1;
}

export interface FarmerCard { supply: Partial<Record<FruitId, number>>; unripe?: FruitId }

// 20 farmer cards: three fruits each, 4-6 of each, like the prototype.
export const FARMER_CARDS: FarmerCard[] = [
  { supply: { apple: 6, watermelon: 6, blueberry: 5 } },
  { supply: { mango: 5, apple: 4, blueberry: 6 } },
  { supply: { mango: 6, watermelon: 5, apple: 4 }, unripe: 'mango' },
  { supply: { blueberry: 6, watermelon: 4, mango: 5 } },
  { supply: { apple: 5, mango: 5, watermelon: 5 }, unripe: 'apple' },
  { supply: { blueberry: 5, apple: 5, mango: 4 } },
  { supply: { watermelon: 6, blueberry: 4, apple: 5 }, unripe: 'watermelon' },
  { supply: { mango: 4, apple: 6, blueberry: 5 } },
  { supply: { watermelon: 5, mango: 6, blueberry: 4 }, unripe: 'mango' },
  { supply: { apple: 4, watermelon: 5, mango: 6 } },
  { supply: { blueberry: 6, mango: 6, apple: 4 }, unripe: 'apple' },
  { supply: { watermelon: 4, apple: 6, mango: 5 } },
  { supply: { blueberry: 5, watermelon: 6, mango: 4 }, unripe: 'watermelon' },
  { supply: { apple: 5, blueberry: 4, watermelon: 6 } },
  { supply: { mango: 5, blueberry: 5, apple: 5 }, unripe: 'mango' },
  { supply: { watermelon: 5, apple: 4, blueberry: 6 } },
  { supply: { mango: 6, apple: 5, watermelon: 4 }, unripe: 'apple' },
  { supply: { blueberry: 4, mango: 5, watermelon: 6 } },
  { supply: { apple: 6, blueberry: 6, mango: 4 }, unripe: 'mango' },
  { supply: { watermelon: 6, mango: 4, apple: 5 } },
];

export interface Want { fruit: FruitId; qty: number; max: number }
export interface CustomerCard { name: string; wants: Want[] }

// 24 customers. Max price is what they pay for a fresh fruit.
export const CUSTOMER_CARDS: CustomerCard[] = [
  { name: 'John', wants: [{ fruit: 'apple', qty: 3, max: 10 }, { fruit: 'watermelon', qty: 2, max: 6 }] },
  { name: 'Robert', wants: [{ fruit: 'blueberry', qty: 3, max: 7 }, { fruit: 'mango', qty: 2, max: 5 }] },
  { name: 'Daniel', wants: [{ fruit: 'mango', qty: 1, max: 8 }, { fruit: 'apple', qty: 3, max: 9 }, { fruit: 'blueberry', qty: 2, max: 6 }] },
  { name: 'Chris', wants: [{ fruit: 'mango', qty: 4, max: 7 }, { fruit: 'blueberry', qty: 1, max: 7 }] },
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
];

export type EventId =
  | 'minPrice' | 'goodHarvest' | 'badHarvest' | 'festive' | 'slow'
  | 'priceHike' | 'heatwave' | 'rainy' | 'craze' | 'strike';

export interface EventCard {
  id: EventId;
  title: string;
  text: string;
  icon: string;
  minPrice?: Record<FruitId, number>;
  fruit?: FruitId;
}

export const EVENT_CARDS: EventCard[] = [
  { id: 'minPrice', title: 'Minimum Price', icon: '⚖️', text: 'No shop may sell below these prices today.',
    minPrice: { watermelon: 5, apple: 6, mango: 4, blueberry: 5 } },
  { id: 'minPrice', title: 'Minimum Price', icon: '⚖️', text: 'No shop may sell below these prices today.',
    minPrice: { watermelon: 4, apple: 5, mango: 5, blueberry: 3 } },
  { id: 'goodHarvest', title: 'Good Harvest', icon: '🌾', text: 'The farmers bring 2 extra of every fruit.' },
  { id: 'badHarvest', title: 'Bad Harvest', icon: '🐛', text: 'The farmers bring 2 fewer of every fruit.' },
  { id: 'festive', title: 'Festive Season', icon: '🎉', text: 'Every customer pays up to $2 more today.' },
  { id: 'slow', title: 'Slow Season', icon: '😴', text: 'Every customer pays up to $2 less today.' },
  { id: 'priceHike', title: 'Price Hike', icon: '📈', text: 'Every fruit at the farmers market costs $1 more today.' },
  { id: 'heatwave', title: 'Heatwave', icon: '🔥', text: 'All fruit ages one extra step tonight.' },
  { id: 'rainy', title: 'Rainy Day', icon: '🌧️', text: 'No walk-in customer today. Only the expected customer comes.' },
  { id: 'craze', title: 'Mango Craze', icon: '📱', text: 'A video goes viral. Customers pay $3 more for mangoes today.', fruit: 'mango' },
  { id: 'craze', title: 'Blueberry Craze', icon: '📱', text: 'Superfood trend! Customers pay $3 more for blueberries today.', fruit: 'blueberry' },
  { id: 'strike', title: 'Lorry Breakdown', icon: '🚚', text: 'No farmer delivery today. Fruit already at the market stays.' },
];

export type FavourId = 'freeCash' | 'freeFruit' | 'priority' | 'goodRiddance' | 'favouredTrade' | 'fridge';

export interface FavourDef { id: FavourId; title: string; icon: string; text: string; when: 'buy' | 'bid' | 'evening' }

export const FAVOURS: Record<FavourId, FavourDef> = {
  freeCash: { id: 'freeCash', title: 'Free Cash', icon: '💵', when: 'buy', text: 'Gain $3.' },
  freeFruit: { id: 'freeFruit', title: 'Free Fruit', icon: '🎁', when: 'buy', text: 'Take one fruit of your choice from the farmers market for free.' },
  priority: { id: 'priority', title: 'Priority', icon: '⏩', when: 'evening', text: 'Play in the evening: you buy first tomorrow.' },
  goodRiddance: { id: 'goodRiddance', title: 'Good Riddance', icon: '♻️', when: 'buy', text: 'Sell all your ripe stock back to the farmers market for $1 each.' },
  favouredTrade: { id: 'favouredTrade', title: 'Favoured Trade', icon: '🤝', when: 'bid', text: 'You win every tied price today.' },
  fridge: { id: 'fridge', title: 'Fridge', icon: '🧊', when: 'buy', text: 'All your fruit becomes one step fresher.' },
};

export const FAVOUR_DECK: FavourId[] = [
  'freeCash', 'freeCash', 'freeFruit', 'freeFruit', 'priority', 'priority',
  'goodRiddance', 'goodRiddance', 'favouredTrade', 'favouredTrade', 'fridge', 'fridge',
];

export type UpgradeId = 'shelf' | 'cart' | 'coolroom' | 'signboard';

export interface UpgradeDef { id: UpgradeId; title: string; icon: string; cost: number; text: string }

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  shelf: { id: 'shelf', title: 'Bigger Shelf', icon: '🗄️', cost: 5, text: 'Hold 14 fruits instead of 8.' },
  cart: { id: 'cart', title: 'Handcart', icon: '🛒', cost: 6, text: 'Buy up to 5 fruits a day instead of 3.' },
  coolroom: { id: 'coolroom', title: 'Cool Room', icon: '❄️', cost: 9, text: 'Your fruit ages only every other night.' },
  signboard: { id: 'signboard', title: 'Signboard', icon: '🪧', cost: 8, text: 'Earn a $1 tip on every fruit you sell.' },
};

export const BASE_SHELF = 8;
export const BIG_SHELF = 14;
export const BASE_BUY = 3;
export const CART_BUY = 5;
export const START_CASH = 10;
export const FAVOUR_HAND_LIMIT = 3;
