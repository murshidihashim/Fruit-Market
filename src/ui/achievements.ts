// Trophies (PLAN-086; progression study, review-18, C5 and C6): cards in eight groups, each with up to three tiers
// (Bronze, Silver, Gold). `evaluate` looks at one finished game plus what the player has built up over time (sets such
// as "shopkeepers won with", plain counts such as "wins with Rosa") and says which tiers were just earned.
// It only reads the game; it never changes a rule.
//
// Every trophy of the earlier list (43 of them) is a tier here under the same code name, so what a player earned stays
// earned. A tier's code name is never reused or renamed.
import {
  CHARACTER_TRAIT, CUSTOMER_CARDS, EVENT_CARDS, FAVOURS, FRUIT, FRUITS, JUICE_VALUE, LEGACY_RIVAL_NAMES, ORDER_CARDS, RIVALS, TRAITS, UPGRADES,
  type FavourId, type FruitId, type TraitId, type UpgradeId,
} from '../engine/data';
import { count, winners, type GameState, type LineResult } from '../engine/game';
import { bestStreak } from './streak';

export type Tier = 'bronze' | 'silver' | 'gold';
export const TIERS: Tier[] = ['bronze', 'silver', 'gold'];
export const TIER_NAME: Record<Tier, string> = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };

export type GroupId = 'first' | 'keepers' | 'fruit' | 'book' | 'habits' | 'feats' | 'league' | 'milestones';
export const GROUPS: { id: GroupId; title: string }[] = [
  { id: 'first', title: 'First steps' },
  { id: 'keepers', title: 'Shopkeepers' },
  { id: 'fruit', title: 'Fruit and decks' },
  { id: 'book', title: 'The book' },
  { id: 'habits', title: 'Habits' },
  { id: 'feats', title: 'Skill feats' },
  { id: 'league', title: 'Market League and online' },
  { id: 'milestones', title: 'Milestones' },
];

export type Sets = Record<string, string[]>;
export type Counts = Record<string, number>;

/** Everything stored that trophies and stamps are worked out from. */
export interface Snapshot {
  have: ReadonlySet<string>;
  sets: Sets;
  counts: Counts;
  stats: { played: number; totalSold: number; wins?: number };
  /** Best cash for each Daily market date. */
  daily: Record<string, number>;
  /** Market League stages cleared. */
  league: number;
  /** The best Daily market streak, when the caller already knows it; otherwise it is worked out from `daily`. */
  streak?: number;
}

/** The picture on a trophy card: all are pictures the game already has. */
export type Pic =
  | { kind: 'keeper'; avatar: string } | { kind: 'fruit'; id: FruitId } | { kind: 'event'; id: string } | { kind: 'customer'; key: string }
  | { kind: 'upgrade'; id: UpgradeId } | { kind: 'favour'; id: FavourId } | { kind: 'coin' };

/** One tier of a card. `goal` is the number its card's count must reach (1 for a feat that is simply done or not). */
export interface Step { id: string; tier: Tier; goal: number; text: string; value?: (s: Snapshot) => number }
export interface Card {
  id: string; group: GroupId; title: string; pic: Pic; steps: Step[];
  /** The count the steps' goals are compared with (a step may count something of its own). */
  value: (s: Snapshot) => number;
  /** Words after "2 of 3" on the progress line. */
  unit: string;
  /** The count is an amount of money. */
  money?: boolean;
  /** A shopkeeper's card: the avatar a game "as" this shopkeeper is played with. */
  avatar?: string;
}

/** The three guests of the earliest list. The Wedding Caterer and the Bakery (rules 11) are guests too (ALL_GUESTS);
 *  they are stored among the customers, as they always were, and counted as guests. */
export const GUESTS = ['Influencer', 'Gym Club', 'Hotel Chef'];
export const ALL_GUESTS = EVENT_CARDS.flatMap((e) => (e.extra ? [e.extra.name] : []));
const CUSTOMER_NAMES = new Set(CUSTOMER_CARDS.map((c) => c.name));
const ORDER_NAMES = new Set(ORDER_CARDS.map((c) => c.name));
const EVENT_IDS = new Set<string>(EVENT_CARDS.map((e) => e.id));
const UPGRADE_IDS = Object.keys(UPGRADES);
/** "The first six" counts the six original shopkeepers (RIVALS order); Pak Din and Farah came with rules 11. */
const ROLL_CALL = 6;

/** Which shopkeeper (RIVALS index) a name means: the current name, or one used before DEC-064. -1 for anyone else. */
function rivalIndex(name: string): number {
  const i = RIVALS.findIndex((r) => r.name === name);
  return i >= 0 ? i : LEGACY_RIVAL_NAMES.indexOf(name);
}
/** The shopkeepers in a set, each counted once whichever of its names was saved. */
const rivalsIn = (names: string[] | undefined, upTo = RIVALS.length): number => new Set((names ?? []).map(rivalIndex).filter((i) => i >= 0 && i < upTo)).size;
const sizeOf = (s: Snapshot, key: string, known?: ReadonlySet<string> | readonly string[]): number => {
  const all = s.sets[key] ?? [];
  if (!known) return new Set(all).size;
  const ok = known instanceof Set ? known : new Set(known as readonly string[]);
  return new Set(all.filter((x) => ok.has(x))).size;
};
/** Customers served: the 36 regular customers only (guests and standing-order clients are stored in the same set). */
export const customersServed = (s: Snapshot): string[] => [...new Set((s.sets.customers ?? []).filter((n) => CUSTOMER_NAMES.has(n)))];
/** Guests sold to, of the five. */
export const guestsServed = (s: Snapshot): string[] => ALL_GUESTS.filter((n) => (s.sets.guests ?? []).includes(n) || (s.sets.customers ?? []).includes(n));
/** Event cards seen. */
export const eventsSeen = (s: Snapshot): string[] => [...new Set((s.sets.events ?? []).filter((e) => EVENT_IDS.has(e)))];
const n = (s: Snapshot, key: string): number => s.counts[key] ?? 0;
const done = (id: string) => (s: Snapshot): number => (s.have.has(id) ? 1 : 0);
const step = (id: string, tier: Tier, goal: number, text: string, value?: (s: Snapshot) => number): Step => (value ? { id, tier, goal, text, value } : { id, tier, goal, text });
/** A card with a single feat that is done or not. */
const feat = (id: string, group: GroupId, title: string, pic: Pic, tier: Tier, text: string): Card =>
  ({ id, group, title, pic, unit: '', value: done(id), steps: [step(id, tier, 1, text)] });

const traitOfAvatar = (avatar: string): TraitId => CHARACTER_TRAIT[avatar];

const KEEPER_CARDS: Card[] = RIVALS.map((r): Card => {
  const t = traitOfAvatar(r.avatar);
  return {
    id: `keeper_${t}`, group: 'keepers', title: r.name, pic: { kind: 'keeper', avatar: r.avatar }, unit: 'wins', avatar: r.avatar,
    value: (s) => Math.max(n(s, `win_${t}`), (s.sets.wonWith ?? []).includes(t) ? 1 : 0),
    steps: [step(`win_${t}_1`, 'bronze', 1, `Win a game with ${r.name}.`), step(`win_${t}_3`, 'silver', 3, `Win 3 games with ${r.name}.`), step(`win_${t}_6`, 'gold', 6, `Win 6 games with ${r.name}.`)],
  };
});

const FRUIT_CARDS: Card[] = FRUITS.map((f): Card => ({
  id: `fruit_${f}`, group: 'fruit', title: FRUIT[f].plural, pic: { kind: 'fruit', id: f }, unit: 'sold', value: (s) => n(s, `fruit_${f}`),
  steps: [30, 200, 1000].map((goal, i) => step(`fruit_${f}_${goal}`, TIERS[i], goal, `Sell ${goal.toLocaleString('en-US')} ${FRUIT[f].plural.toLowerCase()}.`)),
}));

export const CARDS: Card[] = [
  // 1. First steps
  { id: 'first_sale', group: 'first', title: 'First Sale', pic: { kind: 'coin' }, unit: '', value: (s) => Math.max(done('first_sale')(s), s.stats.totalSold > 0 ? 1 : 0),
    steps: [step('first_sale', 'bronze', 1, 'Sell a piece of fruit.')] },
  { id: 'first_win', group: 'first', title: 'Open for Business', pic: { kind: 'event', id: 'festival' }, unit: '', value: (s) => Math.max(done('first_win')(s), (s.stats.wins ?? 0) > 0 ? 1 : 0),
    steps: [step('first_win', 'bronze', 1, 'Win a game.')] },
  { id: 'explorer', group: 'first', title: 'Every mode', pic: { kind: 'event', id: 'touristBus' }, unit: 'modes', value: (s) => sizeOf(s, 'modes', ['new', 'daily', 'league', 'online']),
    steps: [step('explorer', 'silver', 4, 'Finish a game in each mode: New game, Daily market, Market League and online.')] },

  // 2. Shopkeepers
  ...KEEPER_CARDS,
  { id: 'keepers', group: 'keepers', title: 'Different shopkeepers', pic: { kind: 'keeper', avatar: RIVALS[1].avatar }, unit: 'shopkeepers won with', value: (s) => sizeOf(s, 'wonWith', Object.keys(TRAITS)),
    steps: [step('shop_3', 'bronze', 3, 'Win with 3 different shopkeepers.'), step('shop_6', 'silver', 6, 'Win with 6 different shopkeepers.'), step('shop_8', 'gold', 8, 'Win with all 8 shopkeepers.')] },
  { id: 'rivals', group: 'keepers', title: 'Rivals beaten', pic: { kind: 'keeper', avatar: RIVALS[2].avatar }, unit: 'computer shopkeepers beaten', value: (s) => rivalsIn(s.sets.beaten),
    steps: [
      step('rivals_3', 'bronze', 3, 'Win a game against 3 different computer shopkeepers.'),
      step('rivals_all', 'silver', ROLL_CALL, `Win a game against each of these six: ${RIVALS.slice(0, ROLL_CALL - 1).map((r) => r.name).join(', ')} and ${RIVALS[ROLL_CALL - 1].name}.`, (s) => rivalsIn(s.sets.beaten, ROLL_CALL)),
      step('rivals_hard', 'gold', RIVALS.length, 'Win a game against all 8 shopkeepers, each as a Hard computer.', (s) => rivalsIn(s.sets.beatenHard)),
    ] },

  // 3. Fruit and decks (the lorries card comes later: the day's record does not keep the lorry's name)
  ...FRUIT_CARDS,
  feat('mango_mogul', 'fruit', 'Ten mangoes', { kind: 'event', id: 'mangoCraze' }, 'silver', 'Sell 10 mangoes in one game.'),
  { id: 'favours', group: 'fruit', title: 'Favour cards', pic: { kind: 'favour', id: 'gossip' }, unit: 'kinds played', value: (s) => sizeOf(s, 'favours', Object.keys(FAVOURS)),
    steps: [step('favours_3', 'bronze', 3, 'Play 3 different kinds of favour card.'), step('card_sharp', 'silver', Object.keys(FAVOURS).length, 'Play all 6 kinds of favour card.')] },
  { id: 'upgrades', group: 'fruit', title: 'Upgrades', pic: { kind: 'upgrade', id: 'barrow' }, unit: 'kinds built', value: (s) => sizeOf(s, 'built', UPGRADE_IDS),
    steps: [
      step('fully_fitted', 'bronze', 1, 'Build 2 upgrades in one game.', done('fully_fitted')),
      step('upgrades_5', 'silver', UPGRADE_IDS.length, 'Build each of the 5 upgrades.'),
      step('upgrades_won', 'gold', UPGRADE_IDS.length, 'Win with each of the 5 upgrades built.', (s) => sizeOf(s, 'wonBuilt', UPGRADE_IDS)),
    ] },
  { id: 'orders', group: 'fruit', title: 'Standing orders', pic: { kind: 'customer', key: ORDER_CARDS[0].name }, unit: 'delivered in full', value: (s) => n(s, 'orders'),
    steps: [
      step('worth_wait', 'bronze', 1, 'Deliver a standing order in full.'),
      step('orders_5', 'silver', 5, 'Deliver 5 standing orders in full.'),
      step('orders_8', 'gold', ORDER_CARDS.length, 'Deliver a standing order in full for all 8 clients.', (s) => sizeOf(s, 'clients', ORDER_NAMES)),
    ] },
  feat('juice_regular', 'fruit', 'Juice money', { kind: 'upgrade', id: 'juicebar' }, 'silver', 'Earn $20 from your Juice Bar in one game.'),
  feat('jam_session', 'fruit', 'Nothing for the jam maker', { kind: 'event', id: 'pasarMalam' }, 'bronze', 'Sell 20 or more pieces in a game and end it with no ripe fruit left.'),

  // 4. The book
  { id: 'customers', group: 'book', title: 'Customers served', pic: { kind: 'customer', key: 'Osman' }, unit: 'customers served', value: (s) => customersServed(s).length,
    steps: [step('town_12', 'bronze', 12, 'Serve 12 different customers.'), step('town_36', 'silver', CUSTOMER_CARDS.length, 'Serve all 36 customers.')] },
  { id: 'guests', group: 'book', title: 'Guests', pic: { kind: 'event', id: 'hotel' }, unit: 'guests sold to', value: (s) => guestsServed(s).length,
    steps: [step('red_carpet', 'bronze', 3, 'Sell to 3 different guests.'), step('guests_5', 'silver', ALL_GUESTS.length, 'Sell to all 5 guests.')] },
  { id: 'events', group: 'book', title: 'Events seen', pic: { kind: 'event', id: 'heatwave' }, unit: 'event cards seen', value: (s) => eventsSeen(s).length,
    steps: [step('events_10', 'bronze', 10, 'See 10 different event cards.'), step('event_all', 'silver', EVENT_CARDS.length, 'See all 20 event cards.')] },

  // 5. Habits
  { id: 'dailies', group: 'habits', title: 'Daily markets finished', pic: { kind: 'event', id: 'goodHarvest' }, unit: 'Daily markets finished', value: (s) => Object.keys(s.daily).length,
    steps: [step('daily_3', 'bronze', 3, 'Finish 3 Daily markets.'), step('daily_10', 'silver', 10, 'Finish 10 Daily markets.'), step('daily_30', 'gold', 30, 'Finish 30 Daily markets.')] },
  { id: 'streak', group: 'habits', title: 'Streak', pic: { kind: 'event', id: 'monsoon' }, unit: 'days in a row', value: (s) => s.streak ?? bestStreak(Object.keys(s.daily)),
    steps: [step('streak3', 'bronze', 3, 'Play the Daily market 3 days in a row.'), step('streak7', 'silver', 7, 'Play the Daily market 7 days in a row.'), step('streak30', 'gold', 30, 'Play the Daily market 30 days in a row.')] },
  feat('daily_top10', 'habits', 'Top Ten', { kind: 'event', id: 'priceControls' }, 'silver', 'Finish in the top 10 of a Daily market leaderboard.'),

  // 6. Skill feats, each in one game
  feat('no_waste', 'feats', 'Nothing Wasted', { kind: 'fruit', id: 'watermelon' }, 'silver', 'Win with no piece spoiled.'),
  { id: 'top_price', group: 'feats', title: 'Top price', pic: { kind: 'fruit', id: 'mango' }, unit: 'at the top price in one game', value: (s) => n(s, 'bestTop'),
    steps: [step('full_price', 'bronze', 5, 'Sell 5 pieces at a customer\'s top price in one game.'), step('full_price_10', 'silver', 10, 'Sell 10 pieces at a customer\'s top price in one game.'), step('full_price_15', 'gold', 15, 'Sell 15 pieces at a customer\'s top price in one game.')] },
  { id: 'dollar_under', group: 'feats', title: 'One dollar under', pic: { kind: 'event', id: 'priceHike' }, unit: 'sales won by exactly $1 in one game', value: (s) => n(s, 'bestUnder'),
    steps: [step('penny_under', 'bronze', 1, 'Win a sale by setting a price exactly $1 below the next stall.'), step('penny_5', 'silver', 5, 'Win 5 sales by exactly $1 in one game.'), step('penny_8', 'gold', 8, 'Win 8 sales by exactly $1 in one game.')] },
  feat('tie_breaker', 'feats', 'Tie Breaker', { kind: 'favour', id: 'favouredTrade' }, 'bronze', 'Win a sale when another stall set the same price.'),
  { id: 'big_sale', group: 'feats', title: 'Big sale', pic: { kind: 'event', id: 'mangoWindfall' }, unit: 'for one piece', money: true, value: (s) => n(s, 'bestSale'),
    steps: [step('sky_high', 'bronze', 12, 'Sell a piece of fruit for $12 or more.'), step('sale_15', 'silver', 15, 'Sell a piece of fruit for $15 or more.')] },
  { id: 'sole', group: 'feats', title: 'Sole Supplier', pic: { kind: 'fruit', id: 'apple' }, unit: 'customers served alone in one game', value: (s) => n(s, 'bestSole'),
    steps: [step('sole_1', 'bronze', 1, 'Serve a customer alone.'), step('sole_2', 'silver', 2, 'Serve 2 customers alone in one game.'), step('sole_five', 'gold', 3, 'Serve 3 customers alone in one game.')] },
  feat('full_house', 'feats', 'The whole row', { kind: 'event', id: 'kenduri' }, 'silver', 'Sell to every customer in a row of 4 or more, in one day.'),
  { id: 'best_day', group: 'feats', title: 'Best day', pic: { kind: 'event', id: 'superfood' }, unit: 'in one day', money: true, value: (s) => n(s, 'bestDay'),
    steps: [step('big_day', 'bronze', 40, 'Earn $40 or more in one day.'), step('day_55', 'silver', 55, 'Earn $55 or more in one day.'), step('day_70', 'gold', 70, 'Earn $70 or more in one day.')] },
  feat('festival_rush', 'feats', 'Festival Rush', { kind: 'event', id: 'festival' }, 'silver', 'Earn $40 or more on a Festival day.'),
  { id: 'final_cash', group: 'feats', title: 'Final cash', pic: { kind: 'coin' }, unit: 'at the end of a Quick or Standard game', money: true, value: (s) => n(s, 'bestCash'),
    steps: [step('cash_100', 'bronze', 100, 'Finish a Quick or Standard game with $100 or more.'), step('cash_130', 'silver', 130, 'Finish a Quick or Standard game with $130 or more.'), step('rich', 'gold', 160, 'Finish a Quick or Standard game with $160 or more.')] },
  feat('comeback', 'feats', 'Comeback Kid', { kind: 'event', id: 'badHarvest' }, 'silver', 'Win after being last on Day 5.'),
  feat('bare_stall', 'feats', 'Bare Stall', { kind: 'event', id: 'strike' }, 'silver', 'Win without building an upgrade.'),
  feat('beat_hard', 'feats', 'Hard win', { kind: 'event', id: 'inspector' }, 'silver', 'Win against a Hard computer.'),
  feat('hard_sweep', 'feats', 'Hard Sweep', { kind: 'event', id: 'blight' }, 'gold', 'Win a 4-stall game against 3 Hard computers.'),

  // 7. Market League and online
  { id: 'league', group: 'league', title: 'Market League', pic: { kind: 'event', id: 'bakeOff' }, unit: 'stages cleared', value: (s) => s.league,
    steps: [step('league_2', 'bronze', 2, 'Clear stage 2 of the Market League.'), step('league_4', 'silver', 4, 'Clear stage 4 of the Market League.'), step('league', 'gold', 6, 'Clear all six stages of the Market League.')] },
  { id: 'online_games', group: 'league', title: 'Online games', pic: { kind: 'event', id: 'durian' }, unit: 'online games finished', value: (s) => sizeOf(s, 'online'),
    steps: [step('online_1', 'bronze', 1, 'Finish an online game.'), step('online_10', 'silver', 10, 'Finish 10 online games.'), step('online_50', 'gold', 50, 'Finish 50 online games.')] },
  { id: 'online_wins', group: 'league', title: 'Online wins', pic: { kind: 'event', id: 'glut' }, unit: 'online wins', value: (s) => n(s, 'onlineWins'),
    steps: [step('online_win', 'bronze', 1, 'Win an online game.'), step('online_wins_5', 'silver', 5, 'Win 5 online games.'), step('online_wins_25', 'gold', 25, 'Win 25 online games.')] },

  // 8. Milestones
  { id: 'played', group: 'milestones', title: 'Games finished', pic: { kind: 'event', id: 'touristBus' }, unit: 'games finished', value: (s) => s.stats.played,
    steps: [step('played_10', 'bronze', 10, 'Finish 10 games.'), step('played_50', 'silver', 50, 'Finish 50 games.'), step('played_200', 'gold', 200, 'Finish 200 games.')] },
  { id: 'sold', group: 'milestones', title: 'Pieces sold', pic: { kind: 'fruit', id: 'blueberry' }, unit: 'pieces sold', value: (s) => s.stats.totalSold,
    steps: [step('sold_100', 'bronze', 100, 'Sell 100 pieces of fruit.'), step('sold_500', 'silver', 500, 'Sell 500 pieces of fruit.'), step('sold_2000', 'gold', 2000, 'Sell 2,000 pieces of fruit.')] },
];

/** A tier with its card, by code name. */
export interface TierRef { card: Card; step: Step; index: number }
const BY_STEP = new Map<string, TierRef>(CARDS.flatMap((card) => card.steps.map((s, index): [string, TierRef] => [s.id, { card, step: s, index }])));
export const tierById = (id: string): TierRef | undefined => BY_STEP.get(id);
export const TIER_COUNT = BY_STEP.size;

/** The count a step is measured by. A higher tier already held means the lower ones are reached too, whatever the
 *  stored count says (a trophy earned before its count was kept). */
export function stepValue(card: Card, st: Step, s: Snapshot): number {
  const mine = st.value ?? card.value;
  const shared = !st.value;
  // Steps that share the card's count: holding one means the count reached its goal at some point.
  const held = shared ? Math.max(0, ...card.steps.filter((x) => !x.value && s.have.has(x.id)).map((x) => x.goal)) : s.have.has(st.id) ? st.goal : 0;
  return Math.max(mine(s), held);
}
/** True when a step's goal is met by what is stored. */
export const stepMet = (card: Card, st: Step, s: Snapshot): boolean => s.have.has(st.id) || stepValue(card, st, s) >= st.goal;

/** Every tier that what is stored says is earned: the ones already held and the ones the counts have reached. */
export function standing(s: Snapshot): string[] {
  return CARDS.flatMap((card) => card.steps.filter((st) => stepMet(card, st, s)).map((st) => st.id));
}

/** The next tier of a card still to earn, or null when every tier is held. */
export function nextStep(card: Card, s: Snapshot): Step | null {
  return card.steps.find((st) => !stepMet(card, st, s)) ?? null;
}

// ---------- the earlier flat list (kept for the screens and tests that read one trophy at a time) ----------

export interface Achievement { id: string; title: string; text: string; tier: Tier; card: Card; goal?: { target: number } }
/** Every tier, in catalogue order. */
export const ACHIEVEMENTS: Achievement[] = CARDS.flatMap((card) => card.steps.map((st): Achievement => ({
  id: st.id, title: card.title, text: st.text, tier: st.tier, card, ...(st.goal > 1 ? { goal: { target: st.goal } } : {}),
})));

/** How far along a counted tier is, for "3 of 6" labels (never more than its goal). */
export function progressOf(a: Achievement, sets: Sets, stats: { played: number; totalSold: number }): number {
  const st = a.card.steps.find((x) => x.id === a.id);
  if (!st || !a.goal) return 0;
  return Math.min(stepValue(a.card, st, { have: new Set(), sets, counts: {}, stats, daily: {}, league: 0 }), a.goal.target);
}

// ---------- one finished game ----------

/** What one stall did in a finished game: everything a trophy can ask about. */
export interface Facts {
  won: boolean; days: number; cash: number; sold: number;
  /** Pieces sold at the customer's top price (a standing order's pieces are not counted). */
  top: number;
  /** Sales won by a price exactly $1 below the next stall. */
  under: number;
  tie: boolean;
  /** The dearest piece sold to a customer or a guest. */
  bestSale: number;
  /** Customers and guests whose whole order this stall filled alone. */
  sole: number;
  /** Sold to every customer in the row on some day, with four or more in it. */
  wholeRow: boolean;
  bestDay: number;
  festival: boolean;
  mangoes: number;
  juice: number;
  fruit: Record<FruitId, number>;
  /** Names sold to: the three first guests, and everyone else (customers, the other guests, order clients). */
  guests: string[];
  others: string[];
  /** Standing-order clients delivered in full. */
  clients: string[];
  events: string[];
  favours: string[];
  upgrades: UpgradeId[];
  trait: TraitId | null;
  /** Computer shopkeepers at the table (today's names), and those playing as Hard. */
  rivals: string[];
  hardRivals: string[];
  noWaste: boolean; jamNone: boolean; comeback: boolean; bareStall: boolean; beatHard: boolean; hardSweep: boolean;
  /** Normal or harder computers, a Daily market, or another person at the table: a skill title may be shown for it. */
  fair: boolean;
}

/** Lines of one customer on one day, grouped. */
function ordersByDay(g: GameState): LineResult[][][] {
  return (g.history ?? []).map((d) => {
    const byCustomer = new Map<number, LineResult[]>();
    for (const l of d.lines) byCustomer.set(l.customerId, [...(byCustomer.get(l.customerId) ?? []), l]);
    return [...byCustomer.values()];
  });
}

export function gameFacts(g: GameState, me: number): Facts {
  const pl = g.players[me];
  const won = winners(g).includes(me); // rules 18: a shared win is a win
  const hist = g.history ?? [];
  const mine = (l: LineResult) => l.offers.filter((o) => o.player === me && o.sold > 0);
  const isOrder = (l: LineResult) => ORDER_NAMES.has(l.name);

  let top = 0, under = 0, tie = false, bestSale = 0, mangoes = 0, juice = 0;
  const fruit = Object.fromEntries(FRUITS.map((f) => [f, 0])) as Record<FruitId, number>;
  const guests = new Set<string>(), others = new Set<string>(), clients = new Set<string>();
  for (const d of hist) for (const l of d.lines) {
    const sales = mine(l);
    for (const o of sales) {
      fruit[l.fruit] += o.sold;
      if (l.fruit === 'mango') mangoes += o.sold;
      juice += o.juice ?? 0; // the Juice Bar's tip on older fruit sold
      if (isOrder(l)) continue;
      if (o.price >= l.max) top += o.sold;
      bestSale = Math.max(bestSale, o.price);
    }
    if (sales.length) (GUESTS.includes(l.name) ? guests : others).add(l.name);
    if (isOrder(l)) {
      if (sales.reduce((a, o) => a + o.sold, 0) >= l.want && l.want > 0) clients.add(l.name);
      continue;
    }
    const [first, second] = l.offers;
    if (first?.player === me && first.sold > 0 && second && !second.tooOld) {
      if (second.price - first.price === 1) under++;
      if (second.price === first.price && second.qty > 0) tie = true;
    }
  }
  // ... plus the juice it made overnight from fruit that would have spoiled.
  juice += JUICE_VALUE * (pl.stats.juiced ?? 0);

  // Customers served alone, and a day on which every customer in the row bought from this stall.
  let sole = 0, wholeRow = false;
  for (const day of ordersByDay(g)) {
    const row = day.filter((lines) => !isOrder(lines[0]));
    let served = 0;
    for (const lines of row) {
      const want = lines.reduce((a, l) => a + l.want, 0);
      const all = lines.reduce((a, l) => a + l.offers.reduce((x, o) => x + o.sold, 0), 0);
      const myUnits = lines.reduce((a, l) => a + mine(l).reduce((x, o) => x + o.sold, 0), 0);
      if (myUnits > 0) served++;
      if (myUnits > 0 && myUnits === want && all === want) sole++;
    }
    if (row.length >= 4 && served === row.length) wholeRow = true;
  }

  const ais = g.players.filter((p, i) => i !== me && p.kind === 'ai');
  const named = (ps: typeof ais) => [...new Set(ps.filter((p) => rivalIndex(p.name) >= 0).map((p) => RIVALS[rivalIndex(p.name)].name))];
  const d5 = hist[4]?.cash;
  const trait = g.config.core ? null : pl.trait ?? CHARACTER_TRAIT[pl.avatar] ?? null;
  const people = g.players.some((p, i) => i !== me && p.kind === 'human');
  return {
    won, days: g.config.days, cash: pl.cash, sold: pl.stats.sold, top, under, tie, bestSale, sole, wholeRow,
    bestDay: Math.max(0, ...hist.map((d) => d.income[me] ?? 0)),
    festival: hist.some((d) => d.event === 'festival' && d.income[me] >= 40),
    mangoes, juice, fruit, guests: [...guests], others: [...others], clients: [...clients],
    events: [...new Set(hist.flatMap((d) => (d.event ? [d.event] : [])))],
    favours: [...(pl.stats.played ?? [])], upgrades: [...pl.upgrades], trait,
    rivals: named(ais), hardRivals: named(ais.filter((p) => p.level === 'hard')),
    noWaste: won && pl.stats.spoiled === 0,
    // Last Call pays for every ripe piece left; with no jam maker in the game, the shelf itself is counted.
    jamNone: (g.jam ? g.jam[me] ?? 0 : count(pl.stock, undefined, true)) === 0 && pl.stats.sold >= 20,
    comeback: won && !!d5 && d5[me] === Math.min(...d5) && d5.some((c) => c !== d5[me]),
    bareStall: won && pl.upgrades.length === 0 && g.config.upgrades,
    beatHard: won && ais.some((p) => p.level === 'hard'),
    hardSweep: won && g.players.length === 4 && g.players.every((p, i) => i === me || (p.kind === 'ai' && p.level === 'hard')),
    fair: g.players.length > 1 && (!!g.config.daily || people || ais.every((p) => (p.level ?? 'normal') !== 'easy')),
  };
}

/** The skill tiers whose title needs a fair game (src/net/looks.ts `fair`), with the fact that earns each. */
const FAIR_FEATS: [string, (f: Facts) => boolean][] = [
  ['rich', (f) => f.days <= 10 && f.cash >= 160],
  ['sole_five', (f) => f.sole >= 3],
  ['full_price_15', (f) => f.top >= 15],
  ['day_70', (f) => f.bestDay >= 70],
];

/** What `evaluate` is told besides the game: the stored totals, with this game already in `stats` and `daily`. */
export interface Context {
  online: boolean;
  have: ReadonlySet<string>;
  sets: Sets;
  stats: Snapshot['stats'];
  counts?: Counts;
  daily?: Record<string, number>;
  league?: number;
  /** The best Daily market streak, when the caller knows it; otherwise worked out from `daily`. */
  streak?: number;
  /** False when this game was counted before (the results were opened again): tiers are still checked, and nothing is
   *  added to the plain counts a second time. */
  count?: boolean;
}

const add = (sets: Sets, key: string, ...ids: string[]) => { if (ids.length) sets[key] = [...new Set([...(sets[key] ?? []), ...ids])]; };

/**
 * Which tiers a finished game earns, and the sets and counts after counting it. Does nothing for an unfinished game.
 * `ctx.stats` and `ctx.daily` are the totals with this game already in them (the caller adds a game before it asks).
 */
export function evaluate(g: GameState, me: number, ctx: Context): { got: string[]; sets: Sets; counts: Counts; facts: Facts | null } {
  const sets: Sets = Object.fromEntries(Object.entries(ctx.sets).map(([k, v]) => [k, [...v]]));
  const counts: Counts = { ...(ctx.counts ?? {}) };
  if (g.phase !== 'over' || me < 0 || !g.players[me]) return { got: [], sets, counts, facts: null };
  const f = gameFacts(g, me);

  // Sets that build up across games (joined, so counting a game twice changes nothing).
  add(sets, 'modes', ctx.online ? 'online' : g.config.daily ? 'daily' : g.config.league !== undefined ? 'league' : 'new');
  add(sets, 'guests', ...f.guests);
  add(sets, 'customers', ...f.others);
  add(sets, 'clients', ...f.clients);
  add(sets, 'events', ...f.events);
  add(sets, 'favours', ...f.favours);
  add(sets, 'built', ...f.upgrades);
  if (ctx.online) add(sets, 'online', String(g.config.seed));
  if (f.won && f.trait) add(sets, 'wonWith', f.trait);
  if (f.won) { add(sets, 'beaten', ...f.rivals); add(sets, 'beatenHard', ...f.hardRivals); add(sets, 'wonBuilt', ...f.upgrades); }
  if (f.fair) add(sets, 'fair', ...FAIR_FEATS.filter(([, ok]) => ok(f)).map(([id]) => id));

  // Plain counts: a game adds to them once.
  if (ctx.count !== false) {
    const bump = (key: string, by = 1) => { if (by > 0) counts[key] = (counts[key] ?? 0) + by; };
    const best = (key: string, v: number) => { if (v > (counts[key] ?? 0)) counts[key] = v; };
    bump(`g${f.days}`);
    if (f.won && f.trait) bump(`win_${f.trait}`);
    if (f.won && ctx.online) bump('onlineWins');
    for (const fr of FRUITS) bump(`fruit_${fr}`, f.fruit[fr]);
    bump('orders', f.clients.length);
    best('bestTop', f.top);
    best('bestUnder', f.under);
    best('bestSole', f.sole);
    best('bestSale', f.bestSale);
    best('bestDay', f.bestDay);
    if (f.days <= 10) best('bestCash', f.cash);
  }

  // Feats that are simply done in this game.
  const feats: Record<string, boolean> = {
    first_win: f.won, first_sale: f.sold > 0, mango_mogul: f.mangoes >= 10, juice_regular: f.juice >= 20, jam_session: f.jamNone,
    fully_fitted: f.upgrades.length >= 2, no_waste: f.noWaste, tie_breaker: f.tie, full_house: f.wholeRow, festival_rush: f.festival,
    comeback: f.comeback, bare_stall: f.bareStall, beat_hard: f.beatHard, hard_sweep: f.hardSweep, online_win: ctx.online && f.won,
    // counted tiers this game reaches by itself, also when the game was counted before
    worth_wait: f.clients.length > 0, full_price: f.top >= 5, full_price_10: f.top >= 10, full_price_15: f.top >= 15,
    penny_under: f.under >= 1, penny_5: f.under >= 5, penny_8: f.under >= 8, sky_high: f.bestSale >= 12, sale_15: f.bestSale >= 15,
    sole_1: f.sole >= 1, sole_2: f.sole >= 2, sole_five: f.sole >= 3, big_day: f.bestDay >= 40, day_55: f.bestDay >= 55, day_70: f.bestDay >= 70,
    cash_100: f.days <= 10 && f.cash >= 100, cash_130: f.days <= 10 && f.cash >= 130, rich: f.days <= 10 && f.cash >= 160,
  };
  const done = new Set([...ctx.have, ...Object.keys(feats).filter((id) => feats[id])]);
  const after: Snapshot = { have: done, sets, counts, stats: ctx.stats, daily: ctx.daily ?? {}, league: ctx.league ?? 0, streak: ctx.streak };
  const got = standing(after).filter((id) => !ctx.have.has(id));
  return { got, sets, counts, facts: f };
}
