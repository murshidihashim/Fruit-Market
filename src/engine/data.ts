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
  /** Dollars off the customer's price at each ripe position (same order as `ripe`). */
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
    ripe: ['notso', 'okay', 'fresh'], drop: [4, 2, 0], unripeSlots: 0,
    cost: { fresh: 2, okay: 1, notso: 1, unripe: 1 },
  },
  watermelon: {
    id: 'watermelon', name: 'Watermelon', plural: 'Watermelons', color: '#2e9e4f',
    theme: 'The steady seller. Loses value slowly over 5 days.',
    ripe: ['notso', 'okay', 'okay', 'fresh', 'fresh'], drop: [3, 1, 1, 0, 0], unripeSlots: 1,
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
    ripe: ['notso', 'okay', 'fresh', 'fresh'], drop: [3, 1, 0, 0], unripeSlots: 2,
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
  { supply: { apple: 5, mango: 5, watermelon: 5 }, unripe: 'mango' },
  { supply: { blueberry: 5, apple: 5, mango: 4 } },
  { supply: { watermelon: 6, blueberry: 4, apple: 5 }, unripe: 'watermelon' },
  { supply: { mango: 4, apple: 6, blueberry: 5 } },
  { supply: { watermelon: 5, mango: 6, blueberry: 4 }, unripe: 'mango' },
  { supply: { apple: 4, watermelon: 5, mango: 6 } },
  { supply: { blueberry: 6, mango: 6, apple: 4 }, unripe: 'mango' },
  { supply: { watermelon: 4, apple: 6, mango: 5 } },
  { supply: { blueberry: 5, watermelon: 6, mango: 4 }, unripe: 'watermelon' },
  { supply: { apple: 5, blueberry: 4, watermelon: 6 } },
  { supply: { mango: 5, blueberry: 5, apple: 5 }, unripe: 'mango' },
  { supply: { watermelon: 5, apple: 4, blueberry: 6 } },
  { supply: { mango: 6, apple: 5, watermelon: 4 }, unripe: 'mango' },
  { supply: { blueberry: 4, mango: 5, watermelon: 6 } },
  { supply: { apple: 6, blueberry: 6, mango: 4 }, unripe: 'mango' },
  { supply: { watermelon: 6, mango: 4, apple: 5 } },
];

export interface Want { fruit: FruitId; qty: number; max: number }
export interface CustomerCard { name: string; wants: Want[] }

// 24 customers. Max price is what they pay for a fresh fruit.
const RAW_CUSTOMERS: CustomerCard[] = [
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

const PRICE_SHIFT: Record<FruitId, number> = { blueberry: 0, watermelon: 0, apple: -1, mango: 2 };
export const CUSTOMER_CARDS: CustomerCard[] = RAW_CUSTOMERS.map((c) => ({
  ...c,
  wants: c.wants.map((w) => ({ ...w, max: w.max + PRICE_SHIFT[w.fruit] })),
}));

export type EventId =
  | 'festival' | 'slow' | 'heatwave' | 'rainy' | 'mangoCraze' | 'superfood' | 'goodHarvest'
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
  /** Extra fruit of each kind in today's delivery. */
  supply?: number;
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
  { id: 'slow', title: 'Slow Season', icon: '😴', priceAll: -2, walkIns: -1, text: 'No walk-in today, and customers pay $2 less per fruit.' },
  { id: 'heatwave', title: 'Heatwave', icon: '🔥', price: { watermelon: 4 }, ageExtra: 1, text: 'Watermelons sell for $4 more, but all fruit ages an extra step tonight.' },
  { id: 'rainy', title: 'Rainy Day', icon: '🌧️', walkIns: -1, cost: -1, text: 'No walk-in today. Farmers sell everything $1 cheaper.' },
  { id: 'mangoCraze', title: 'Mango Craze', icon: '📱', price: { mango: 3 },
    extra: { name: 'Influencer', wants: [{ fruit: 'mango', qty: 3, max: 11 }] },
    text: 'A viral video! Mangoes sell for $3 more, and an influencer wants 3.' },
  { id: 'superfood', title: 'Superfood Trend', icon: '💪', price: { blueberry: 3 },
    extra: { name: 'Gym Club', wants: [{ fruit: 'blueberry', qty: 4, max: 8 }] },
    text: 'Blueberries sell for $3 more, and the gym club wants 4.' },
  { id: 'goodHarvest', title: 'Good Harvest', icon: '🌾', supply: 3, cost: -1, text: 'Farmers bring 3 extra of every fruit, and everything costs $1 less.' },
  { id: 'badHarvest', title: 'Bad Harvest', icon: '🐛', supplyMult: 0.5, priceAll: 2, text: 'Farmers bring half as much. Scarce fruit sells for $2 more.' },
  { id: 'priceHike', title: 'Price Hike', icon: '📈', cost: 1, text: 'Every fruit at the farmers market costs $1 more today.' },
  { id: 'minPrice', title: 'Minimum Price', icon: '⚖️', text: 'No shop may sell below these prices today.',
    minPrice: { watermelon: 5, apple: 5, mango: 6, blueberry: 4 } },
  { id: 'inspector', title: 'Health Inspector', icon: '🕵️', inspector: 2, text: 'Tonight every shop pays a $2 fine for each Not-so fruit on its shelf.' },
  { id: 'strike', title: 'Lorry Breakdown', icon: '🚚', noDelivery: true, text: 'No farmer delivery today. Fruit already at the market stays.' },
  { id: 'hotel', title: 'Hotel Order', icon: '🏨',
    extra: { name: 'Hotel Chef', wants: [{ fruit: 'apple', qty: 3, max: 8 }, { fruit: 'watermelon', qty: 2, max: 8 }, { fruit: 'blueberry', qty: 2, max: 7 }] },
    text: 'A hotel chef places a big order today.' },
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

export type UpgradeId = 'shelf' | 'cart' | 'coolroom' | 'signboard' | 'juicer' | 'bell';

export interface UpgradeDef { id: UpgradeId; title: string; icon: string; cost: number; text: string }

/** Every evening each shop is offered 3 of these it hasn't built yet (an upgrade draft). */
export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  cart: { id: 'cart', title: 'Handcart', icon: '🛒', cost: 6, text: 'Buy up to 5 fruits a day instead of 4. (The town doesn\'t grow with it.)' },
  signboard: { id: 'signboard', title: 'Signboard', icon: '🪧', cost: 8, text: 'Earn a $1 tip on every fruit you sell.' },
  coolroom: { id: 'coolroom', title: 'Cool Room', icon: '❄️', cost: 7, text: 'Your fruit ages only every other night, and heatwaves can\'t touch it.' },
  shelf: { id: 'shelf', title: 'Bigger Shelf', icon: '🗄️', cost: 3, text: 'Hold 14 fruits instead of 8.' },
  juicer: { id: 'juicer', title: 'Juice Press', icon: '🧃', cost: 4, text: 'Older fruit you sell (okay or not so) earns $1 extra as juice. Each night, up to 3 fruits that would spoil become juice: $2 each.' },
  bell: { id: 'bell', title: 'Shop Bell', icon: '🔔', cost: 4, text: 'Draw 2 favour cards now, and hold up to 4.' },
};
export const UPGRADE_OFFER = 3;

export const BASE_SHELF = 8;
export const BIG_SHELF = 14;
export const BASE_BUY = 4;

/**
 * Town size (REP-027). Customers want (demandStart + demandGrowth x progress) of 4 fruits per shop,
 * farmers bring (supplyStart + supplyGrowth x progress) of it; 4-player towns have 15% more customers.
 * Handcarts and Big Baskets don't change these numbers.
 */
export const MARKET = { demandStart: 0.6, demandGrowth: 0.45, supplyStart: 0.8, supplyGrowth: 0.2, fourPlayerDemand: 1.15 };
export const NEST_EGG_BONUS = 5;
export const LOCAL_FAVOURITE_TIP = 4;
/** Juice Press: extra dollars for each okay or not-so fruit sold. */
export const JUICE_TIP = 1;
export const CART_BUY = 5;
export const START_CASH = 10;
export const FAVOUR_HAND_LIMIT = 3;

// ---------- merchant traits ----------
// Each shop picks one of three at the start, so every game opens differently.

export type TraitId = 'haggler' | 'basket' | 'bargain' | 'charmer' | 'favourite' | 'nestegg';

export interface TraitDef { id: TraitId; title: string; text: string }

export const TRAITS: Record<TraitId, TraitDef> = {
  haggler: { id: 'haggler', title: 'Haggler', text: 'You win tied prices against richer shops, even if their fruit is fresher.' },
  basket: { id: 'basket', title: 'Big Basket', text: 'Buy 1 extra fruit every day.' },
  bargain: { id: 'bargain', title: 'Bargain Hunter', text: 'Your first fruit each day costs $1 less.' },
  charmer: { id: 'charmer', title: 'Charmer', text: 'Start with 3 favour cards, and hold up to 4.' },
  favourite: { id: 'favourite', title: 'Local Favourite', text: 'Customers you serve completely by yourself tip you $4.' },
  nestegg: { id: 'nestegg', title: 'Nest Egg', text: 'Start with $15 instead of $10.' },
};
export const TRAIT_OFFER = 3;

// ---------- characters ----------

export interface Look { icon: string; title: string; quirk: string }

/** Every customer is a character. Unknown names fall back to a generic shopper. */
export const CUSTOMER_LOOKS: Record<string, Look> = {
  John: { icon: '🤠', title: 'Cowboy John', quirk: 'Pays with coins he panned from the river.' },
  Robert: { icon: '🧛', title: 'Count Robert', quirk: 'Only shops after sunset. Hates garlic, loves blueberries.' },
  Daniel: { icon: '🧙', title: 'Daniel the Wizard', quirk: 'Swears apples power his spells.' },
  Chris: { icon: '🤡', title: 'Chris the Clown', quirk: 'Juggles every mango before he buys it.' },
  Aisyah: { icon: '👩‍🚀', title: 'Astronaut Aisyah', quirk: 'Needs watermelon for zero-gravity snacks.' },
  Ravi: { icon: '🦸', title: 'Super Ravi', quirk: 'Saves the day, one mango at a time.' },
  'Mei Ling': { icon: '🧜‍♀️', title: 'Mei Ling the Mermaid', quirk: 'Splashes anyone selling soggy fruit.' },
  Farid: { icon: '🥷', title: 'Ninja Farid', quirk: 'You never see him arrive. Or pay.' },
  Siti: { icon: '👸', title: 'Princess Siti', quirk: 'Expects the royal treatment, and royal fruit.' },
  Kumar: { icon: '🧞', title: 'Kumar the Genie', quirk: 'Grants three wishes. All of them are fruit.' },
  Grace: { icon: '🧑‍🎤', title: 'Rockstar Grace', quirk: 'Apples keep her voice sharp for the show.' },
  Hafiz: { icon: '🦖', title: 'Hafiz in a Dino Suit', quirk: '"RAWR" means five blueberries, please.' },
  'Wei Jie': { icon: '🕵️', title: 'Detective Wei Jie', quirk: 'Inspects every fruit with a magnifying glass.' },
  Nurul: { icon: '🧚', title: 'Fairy Nurul', quirk: 'Sprinkles glitter on every watermelon.' },
  Priya: { icon: '👩‍🔬', title: 'Dr Priya', quirk: 'Researching the perfect apple pie.' },
  Ahmad: { icon: '🧑‍✈️', title: 'Captain Ahmad', quirk: 'Buying mangoes for the whole crew.' },
  Sarah: { icon: '🦄', title: 'Sarah & Sparkles', quirk: 'Her unicorn eats all the blueberries.' },
  Tan: { icon: '👴', title: 'Grandpa Tan', quirk: 'Remembers when apples cost ten cents.' },
  Lina: { icon: '💃', title: 'Dancing Lina', quirk: 'Cha-chas all the way down the street.' },
  Zul: { icon: '🧟', title: 'Zombie Zul', quirk: 'Wants fresh fruit. Brains are so last year.' },
  Anna: { icon: '👩‍🎨', title: 'Anna the Artist', quirk: 'Paints every mango before she eats it.' },
  Vijay: { icon: '🤖', title: 'Robo-Vijay', quirk: 'Computes the optimal fruit salad.' },
  'Hui Min': { icon: '🧝', title: 'Hui Min the Elf', quirk: 'Elves are wild about watermelon.' },
  Osman: { icon: '👨‍🚒', title: 'Firefighter Osman', quirk: 'Cools down after every call with watermelon.' },
  Influencer: { icon: '🤳', title: 'The Influencer', quirk: 'Will post your shop if the mangoes are perfect.' },
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
export const RIVALS: { name: string; avatar: string; quip: string; lines: RivalLines }[] = [
  { name: 'Foxy Rosa', avatar: '🦊', quip: 'Too easy!', lines: {
    undercut: ['Too easy!', 'A dollar cheaper. Sorry, not sorry!', 'Outfoxed again!'],
    fullPrice: ['Full price? Lovely.', 'They didn\'t even haggle!'],
    stung: ['Hmph. Lucky.', 'That one was mine!', 'Next time, darling.'],
    lost: ['Fine, keep your customer.', 'I meant to do that.'] } },
  { name: 'Big Benny', avatar: '🐻', quip: 'Grrreat deal!', lines: {
    undercut: ['Grrreat deal for me!', 'Bear market, baby!', 'Cheaper AND cuddlier.'],
    fullPrice: ['Top dollar! Honey money!', 'Ka-ching, full price!'],
    stung: ['Grrr! By one dollar?!', 'I want a recount.', 'Paws off my customers!'],
    lost: ['Hibernating on that one.', 'Oof. Too pricey.'] } },
  { name: 'Patches', avatar: '🐼', quip: 'Bamboo-zled you!', lines: {
    undercut: ['Bamboo-zled you!', 'Calm and cheap wins.', 'Patience pays.'],
    fullPrice: ['Full price, very zen.', 'A fair price, gladly paid.'],
    stung: ['So close... breathe.', 'You were quicker today.', 'Hmm. Well played.'],
    lost: ['Nap time, I guess.', 'The market has spoken.'] } },
  { name: 'Uncle Toad', avatar: '🐸', quip: 'Ribbit! Ka-ching!', lines: {
    undercut: ['Ribbit! Ka-ching!', 'Hopped under your price!', 'Croak and cheap!'],
    fullPrice: ['Full price! Toad-ally!', 'Ribbit-ing profit!'],
    stung: ['Croak! One dollar!', 'You leapt first. Hmph.', 'My lily pad!'],
    lost: ['Back to the pond.', 'Meh. Ribbit.'] } },
  { name: 'Rocky', avatar: '🦝', quip: 'Mine now, hehe!', lines: {
    undercut: ['Mine now, hehe!', 'Swiped it!', 'Sneaky cheap!'],
    fullPrice: ['Full price, no questions.', 'Shiny coins!'],
    stung: ['Hey! I was gonna swipe that!', 'Rats. Er, raccoons.', 'You sneaky thing!'],
    lost: ['I\'ll rummage elsewhere.', 'Whatever, got snacks.'] } },
  { name: 'Pinky', avatar: '🐷', quip: 'Oink oink, money!', lines: {
    undercut: ['Oink oink, money!', 'Squeal of a deal!', 'Hog the market!'],
    fullPrice: ['Full price! Pig out!', 'Bacon the money!'],
    stung: ['Oink! So unfair!', 'By ONE dollar?', 'Pig-headed luck!'],
    lost: ['Back to the mud.', 'Snort. Too much.'] } },
];
