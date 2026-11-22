// The Market League as a solo campaign (PLAN-115; PLAN-118, the pilot): Chapter 1, Village Square, twelve authored
// stages and two expert stages. Each fixes its seed and its set-up (game.ts StageSetup: which of the game's own cards
// come on which day, the stalls' cash and shelves, where the stage opens, its length, the rule parts in play, the
// rivals' habits); the rules do not change. Each stage has three stars: one for its clear goal and two optional goals,
// all read from the finished game's own record (history, log, offers). A stage has a short moment before and after
// with the real character, customer, order and event art. No screen code here.
import { EVENT_CARDS, ORDER_CARDS, RIVALS, lookOf, prefOf, type FruitId } from '../engine/data';
import { count, winners, type GameState, type Level, type LineResult, type StageSetup } from '../engine/game';

/** A picture from the game's own art: an event card, a customer card, a standing order's client or a shopkeeper. */
export type StagePic = { kind: 'event'; id: string } | { kind: 'customer'; id: string } | { kind: 'order'; id: string } | { kind: 'keeper'; id: string };

/** A goal: one star. `id` is stored in the phone's sets ("stars") and never reused. */
export interface Mastery {
  id: string; text: string; met: (g: GameState, me: number) => boolean;
  /** A clear goal that is a win (a shared win counts). */
  win?: boolean;
}

export interface Stage {
  title: string;
  /** Rivals by RIVALS index, with their computer level. */
  rivals: { idx: number; level: Level }[];
  /** The days the stage is played. A stage that opens later (setup.open.day) ends that many days after it opens. */
  days: number;
  /** The stage's fixed seed: the same lorries and customers every time it is played. */
  seed: number;
  /** Market Days (a standing order on day 3). Off unless the stage is about an order. */
  marketDays: boolean;
  setup: StageSetup;
  /** One line on what the stage teaches. */
  lesson: string;
  /** The picture of the stage's moment. */
  pic: StagePic;
  /** What the rival who hosts the stage (the first rival) says before it. */
  before: string;
  /**
   * What the host says after the stage is cleared, chosen by what the game shows you did (REP-133, A-03): the first
   * line whose stars this game all earned; the last line names no star, so it is always true.
   */
  after: AfterLine[];
  /** PLAN-118: the goal that clears the stage (its first star). */
  clear: Mastery;
  /** The two optional goals, one star each. */
  mastery: Mastery[];
  /** PLAN-118: the stars this stage had before the pilot and no longer has (see `heldStars`). */
  retired?: string[];
  /** An expert stage: a harder variant of main stage `of` (by index), open once this many stars are held. */
  expert?: { of: number; stars: number };
}

/** One of the host's lines after a clear: said only when this game earned every star in `stars` (none: always). */
export interface AfterLine { stars?: string[]; text: string }

// ---------- reading the game's record ----------

const lines = (g: GameState, day?: (d: number, event?: string) => boolean): (LineResult & { day: number })[] =>
  (g.history ?? []).filter((d) => !day || day(d.day, d.event)).flatMap((d) => d.lines.map((l) => ({ ...l, day: d.day })));
const offerOf = (l: LineResult, p: number) => l.offers.find((o) => o.player === p);
const soldOn = (l: LineResult, p: number): number => offerOf(l, p)?.sold ?? 0;
/** Pieces of a fruit this stall sold to the row (customers, guests and orders) on the days chosen. */
const soldFruit = (g: GameState, me: number, f: FruitId, day?: (d: number, event?: string) => boolean): number =>
  lines(g, day).filter((l) => l.fruit === f).reduce((a, l) => a + soldOn(l, me), 0);
/** Dollars this stall took for a fruit from customers and guests (not a standing order) on the days chosen. */
const takings = (g: GameState, me: number, f: FruitId, day?: (d: number, event?: string) => boolean): number =>
  lines(g, day).filter((l) => l.fruit === f && !isOrder(l.name)).reduce((a, l) => a + soldOn(l, me) * (offerOf(l, me)?.price ?? 0), 0);
const onEvent = (id: string) => (_d: number, e?: string) => e === id;
const onDay = (n: number) => (d: number) => d === n;
/** This stall finished at least `by` dollars ahead of every other stall. */
const aheadBy = (g: GameState, me: number, by: number): boolean => g.players.every((p, i) => i === me || g.players[me].cash - p.cash >= by);
const noWaste = (g: GameState, me: number): boolean => (g.players[me]?.stats.spoiled ?? 1) === 0;
/** First place (a shared first place counts, as it always has in the League). */
const won = (g: GameState, me: number): boolean => winners(g).includes(me);
const isOrder = (name: string): boolean => ORDER_CARDS.some((o) => o.name === name);
/** The price this stall won a standing order at, from the game's log; null when it did not win one. */
function orderWon(g: GameState, me: number, title: string): number | null {
  const head = `${g.players[me]?.name} won the standing order for ${title} at $`;
  const line = g.log.find((x) => x.startsWith(head));
  return line ? Number.parseInt(line.slice(head.length), 10) : null;
}
/** This stall delivered every piece of a standing order (by its client's name). */
const deliveredInFull = (g: GameState, me: number, name: string): boolean =>
  lines(g).some((l) => l.name === name && soldOn(l, me) > 0 && soldOn(l, me) >= l.want);

const RESORT = 'Beach Resort';
const RESORT_TITLE = ORDER_CARDS.find((o) => o.name === RESORT)?.title ?? RESORT;
const PIES = 'Pie Factory';
const PIES_TITLE = ORDER_CARDS.find((o) => o.name === PIES)?.title ?? PIES;
const PICNIC = 'Company Picnic';
const PREMIUM_DAY = 5;
/** The premium buyers of stage 6: customers whose card wants Fresh mangoes. */
const PREMIUM = ['Ravi', 'Lina', 'Anna'];
/** The premium buyers of stage 9, on its last day. */
const MANGO_BUYERS = ['Devi', 'Ahmad', 'Anna'];
const and = (xs: string[]): string => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const name = (key: string): string => lookOf(key).title;

/** The clear goal of every stage from before the pilot: win (a shared win counts). */
const winClear = (id: string): Mastery => ({ id, text: 'Win the stage. A shared win counts.', met: won, win: true });
/** Rule parts a short stage leaves out, so it is about its one lesson. */
const SHORT: StageSetup['off'] = ['favours', 'perks', 'upgrades'];

// ---------- Chapter 1, Village Square: stages 1 to 6 (PLAN-115, each now 1 clear star and 2 optional stars) ----------

const ROSA_UNDER: Mastery = { id: 'vs_under', text: 'Sell a fruit $1 under Rosa\'s price', met: (g, me) => lines(g).some((l) => soldOn(l, me) > 0 && offerOf(l, 1)?.price === (offerOf(l, me)?.price ?? 0) + 1) };

const FIRST_SIX: Stage[] = [
  {
    title: 'Village Square', rivals: [{ idx: 0, level: 'easy' }], days: 6, seed: 58, marketDays: false,
    setup: { events: {}, undercut: [1] },
    // REP-133 A-10: Rosa asks $1 under the most a customer will pay for her piece: with an Okay piece that is $2 under
    // the card (Okay fruit sells for $1 less), so the lesson does not say "the top price".
    lesson: 'Rosa always asks $1 under the most a customer will pay for her fruit. Go $1 under her and the customer comes to you.',
    pic: { kind: 'keeper', id: RIVALS[0].avatar },
    before: 'I always ask a dollar under the most my fruit can fetch. Every day.',
    after: [
      { stars: ['vs_under'], text: 'A dollar under me. I should have seen that coming.' },
      { text: 'You beat me this time. Well played.' },
    ],
    clear: winClear('vs_clear'),
    mastery: [
      ROSA_UNDER,
      { id: 'vs_ahead', text: 'Finish $10 ahead of Rosa', met: (g, me) => aheadBy(g, me, 10) },
    ],
    retired: ['vs_top'],
  },
  {
    title: 'Pasar Malam', rivals: [{ idx: 3, level: 'normal' }], days: 6, seed: 27, marketDays: false,
    setup: { events: { 2: 'pasarMalam', 4: 'pasarMalam', 6: 'pasarMalam' } },
    lesson: 'On a Pasar Malam night the hawker pays $3 for 1 of each fruit left in your crate. Never sell for less.',
    pic: { kind: 'event', id: 'pasarMalam' },
    before: 'The night market is on days 2, 4 and 6. The hawker pays $3 for leftovers.',
    after: [
      { stars: ['pm_floor'], text: 'You kept your price above the hawker\'s. Well sold.' },
      { text: 'You beat me at the night market this time. Well played.' },
    ],
    clear: winClear('pm_clear'),
    mastery: [
      { id: 'pm_floor', text: 'On Pasar Malam days, price nothing under $3', met: (g, me) => {
        const mine = lines(g, onEvent('pasarMalam')).map((l) => offerOf(l, me)).filter((o) => !!o);
        return mine.length > 0 && mine.every((o) => o.price >= 3);
      } },
      { id: 'pm_profit', text: 'Make money on every Pasar Malam day', met: (g, me) => {
        const h = g.history ?? [];
        const nights = h.filter((d) => d.event === 'pasarMalam');
        return nights.length > 0 && nights.every((d) => { const i = h.indexOf(d); return i > 0 && d.cash[me] > h[i - 1].cash[me]; });
      } },
    ],
    retired: ['pm_sold'],
  },
  {
    // REP-133 A-12: named after its order, the Beach Resort's (it was "The Hotel Order"). Progress is kept by number.
    title: 'The Resort Order', rivals: [{ idx: 1, level: 'easy' }, { idx: 2, level: 'normal' }], days: 6, seed: 1, marketDays: true,
    setup: { events: {}, orders: { 3: RESORT } },
    lesson: 'On day 3 the Beach Resort orders watermelons for day 5. Bid low enough to win it, high enough to profit.',
    pic: { kind: 'order', id: RESORT },
    before: 'The Beach Resort wants watermelons on day 5. The lowest bid wins.',
    after: [
      { stars: ['ho_full'], text: 'The resort paid on time. A good order is steady money.' },
      { text: 'You beat us both this time. Well played.' },
    ],
    clear: winClear('ho_clear'),
    mastery: [
      { id: 'ho_full', text: 'Deliver every piece of the order', met: (g, me) => deliveredInFull(g, me, RESORT) },
      // REP-133 A-05: $8, not $9: on the stage's set-up both rivals bid $9 and a tie goes to the poorer stall, so $9
      // could not be won. A goal change only.
      { id: 'ho_bid', text: 'Win the order at $8 a piece or more', met: (g, me) => (orderWon(g, me, RESORT_TITLE) ?? 0) >= 8 },
    ],
    retired: ['ho_win'],
  },
  {
    title: 'Heatwave', rivals: [{ idx: 4, level: 'normal' }, { idx: 5, level: 'easy' }], days: 6, seed: 37, marketDays: false,
    setup: { events: { 3: 'heatwave', 5: 'heatwave' } },
    lesson: 'A Heatwave pays $2 more for watermelons, and that night every fruit ages two steps. Sell, do not store.',
    pic: { kind: 'event', id: 'heatwave' },
    before: 'Heatwaves on days 3 and 5. Watermelons sell high, and fruit goes soft fast.',
    after: [
      { stars: ['hw_melon', 'hw_waste'], text: 'You sold in the heat and kept nothing to rot. Smart.' },
      { stars: ['hw_waste'], text: 'You kept nothing to rot in the heat. Smart.' },
      { text: 'You beat the heat this time. Well played.' },
    ],
    clear: winClear('hw_clear'),
    mastery: [
      { id: 'hw_melon', text: 'Sell 3 watermelons on Heatwave days', met: (g, me) => soldFruit(g, me, 'watermelon', onEvent('heatwave')) >= 3 },
      { id: 'hw_waste', text: 'Let no fruit spoil', met: noWaste },
    ],
    retired: ['hw_nine'],
  },
  {
    title: 'Glut', rivals: [{ idx: 6, level: 'normal' }, { idx: 7, level: 'normal' }], days: 6, seed: 5, marketDays: false,
    setup: { events: { 2: 'glut', 4: 'glut' } },
    lesson: 'A Blueberry Glut brings more blueberries and lower prices. Buy them cheap, but sell them before they soften.',
    pic: { kind: 'event', id: 'glut' },
    before: 'Blueberry Gluts on days 2 and 4. Everyone will have blueberries.',
    after: [
      { stars: ['gl_other'], text: 'When everyone has blueberries, the other fruit is where the money is.' },
      { text: 'You beat us both this time. Well played.' },
    ],
    clear: winClear('gl_clear'),
    mastery: [
      { id: 'gl_other', text: 'On Glut days, sell more of other fruit than blueberries', met: (g, me) => {
        const glut = onEvent('glut');
        const berries = soldFruit(g, me, 'blueberry', glut);
        const others = (['watermelon', 'apple', 'mango'] as FruitId[]).reduce((a, f) => a + soldFruit(g, me, f, glut), 0);
        return others > berries;
      } },
      { id: 'gl_waste', text: 'Let no fruit spoil', met: noWaste },
    ],
    retired: ['gl_berries'],
  },
  {
    title: 'Premium Buyers', rivals: [{ idx: 1, level: 'normal' }, { idx: 2, level: 'normal' }], days: 6, seed: 73, marketDays: false,
    setup: { events: {}, crowd: { [PREMIUM_DAY]: PREMIUM } },
    lesson: `On day ${PREMIUM_DAY} premium buyers come for mangoes, Fresh only. Mangoes arrive green and need two nights.`,
    pic: { kind: 'customer', id: 'Ravi' },
    // REP-133 A-04: the names on their cards ("Miss Cha-Cha", not "Lina").
    before: `${and(PREMIUM.map(name))} come on day ${PREMIUM_DAY}. They buy Fresh fruit only.`,
    after: [
      { stars: ['pb_mango'], text: 'Fresh mangoes on the right day. The premium buyers will be back.' },
      { text: 'You beat us both this time. The premium buyers will be back.' },
    ],
    clear: winClear('pb_clear'),
    mastery: [
      { id: 'pb_mango', text: 'Sell 3 mangoes to premium buyers', met: (g, me) => lines(g).filter((l) => l.fruit === 'mango' && prefOf(l.name) === 'premium').reduce((a, l) => a + soldOn(l, me), 0) >= 3 },
      { id: 'pb_two', text: 'Sell to 2 premium buyers', met: (g, me) => new Set(lines(g).filter((l) => prefOf(l.name) === 'premium' && soldOn(l, me) > 0).map((l) => `${l.day}.${l.customerId}`)).size >= 2 },
    ],
    retired: ['pb_ahead'],
  },
];

// ---------- Chapter 1: stages 7 to 12 (PLAN-118) ----------

/** Stage 7's set-up, shared with its expert variant. */
const READ_SETUP: StageSetup = {
  events: {}, crowd: { 1: ['Osman', 'Marcus', 'Hadi'] }, lorry: { 1: 'Overstock' }, first: 1, open: { at: 'buy' }, off: SHORT,
  overbuy: [{ seat: 1, fruit: 'watermelon', n: 3 }],
};
/** Stage 10's set-up, shared with its expert variant. */
const CONTRACT_SETUP: StageSetup = {
  events: {}, orders: { 3: PIES }, open: { day: 3, at: 'order' }, off: SHORT, cash: [16, 16, 16], shelf: [{}, {}, {}],
};

const NEXT_SIX: Stage[] = [
  {
    title: 'Read the Rival', rivals: [{ idx: 0, level: 'normal' }, { idx: 6, level: 'easy' }], days: 1, seed: 11, marketDays: false,
    setup: READ_SETUP,
    lesson: 'Rosa buys first. Look at what she took before you buy: what she has too much of, she must sell cheap.',
    pic: { kind: 'customer', id: 'Osman' },
    before: `I have bought three watermelons. ${name('Osman')} wants two. You can see my crates.`,
    after: [
      { stars: ['rr_apple'], text: 'You left me the watermelons and took the apples. You read me well.' },
      { text: 'You left me with too many watermelons. Next time I will buy less.' },
    ],
    clear: { id: 'rr_clear', text: 'End the day $8 ahead of Rosa', met: (g, me) => g.players[me].cash - g.players[1].cash >= 8 },
    mastery: [
      { id: 'rr_apple', text: 'Take $10 or more for apples', met: (g, me) => takings(g, me, 'apple') >= 10 },
      { id: 'rr_sold', text: 'Sell every piece you buy', met: (g, me) => g.players[me].stats.sold > 0 && count(g.players[me].stock) === 0 },
    ],
  },
  {
    title: 'Sell Before It Spoils', rivals: [{ idx: 3, level: 'normal' }], days: 2, seed: 4, marketDays: false,
    setup: {
      events: {}, crowd: { 1: ['Hafiz', 'Rizal'], 2: ['Kumar', 'Tan'] }, off: SHORT,
      cash: [6], shelf: [{ blueberry: [2, 0, 0], watermelon: [0, 1, 0, 0] }],
    },
    lesson: 'Soft fruit sells only to bargain customers, and for $2 under their price. Sell it today, or it spoils tonight.',
    pic: { kind: 'customer', id: 'Hafiz' },
    before: `You start with 2 Soft blueberries and an Okay watermelon. ${name('Hafiz')} takes Soft fruit. Fresh buyers will not.`,
    after: [
      { stars: ['sp_cash'], text: 'Not a piece wasted, and a good day\'s takings too.' },
      { text: 'Every piece sold before it spoiled. Well done.' },
    ],
    clear: { id: 'sp_clear', text: 'Let nothing spoil, and end with an empty shelf', met: (g, me) => noWaste(g, me) && count(g.players[me].stock) === 0 },
    mastery: [
      { id: 'sp_soft', text: 'Sell both Soft blueberries on day 1', met: (g, me) => lines(g, onDay(1)).filter((l) => l.fruit === 'blueberry' && prefOf(l.name) === 'bargain').reduce((a, l) => a + soldOn(l, me), 0) >= 2 },
      { id: 'sp_cash', text: 'End with $16 or more', met: (g, me) => (g.players[me]?.cash ?? 0) >= 16 },
    ],
  },
  {
    title: 'Time the Mangoes', rivals: [{ idx: 1, level: 'normal' }, { idx: 5, level: 'normal' }], days: 3, seed: 9, marketDays: false,
    setup: { events: {}, crowd: { 3: MANGO_BUYERS }, lorry: { 1: 'Mango Lorry', 2: 'Mango Season' }, first: 0, cash: [12], off: SHORT },
    lesson: 'A green mango bought on day 1 is Fresh on day 3. Bought on day 2, it is still green when the buyers come.',
    pic: { kind: 'customer', id: 'Devi' },
    before: `${and(MANGO_BUYERS.map(name))} come on day 3 for Fresh mangoes. Mangoes arrive green.`,
    after: [
      { stars: ['tm_three'], text: 'Bought green, sold Fresh, on the right day. That is timing.' },
      { text: 'You beat us both this time. Well played.' },
    ],
    clear: winClear('tm_clear'),
    mastery: [
      { id: 'tm_three', text: 'Sell 3 mangoes on day 3', met: (g, me) => soldFruit(g, me, 'mango', onDay(3)) >= 3 },
      { id: 'tm_cash', text: 'End with $45 or more', met: (g, me) => (g.players[me]?.cash ?? 0) >= 45 },
    ],
  },
  {
    title: 'The Right Contract', rivals: [{ idx: 1, level: 'normal' }, { idx: 6, level: 'normal' }], days: 3, seed: 21, marketDays: true,
    setup: CONTRACT_SETUP,
    lesson: 'Bid under your rivals to win the order, but stay well above what the apples cost you.',
    pic: { kind: 'order', id: PIES },
    before: `It is day 3 and ${PIES_TITLE} wants apples on day 5. Bid now. The lowest bid wins.`,
    after: [
      { stars: ['rc_margin'], text: 'Won at a good price and delivered in full. That is a contract.' },
      { text: 'You delivered the order in full. Well played.' },
    ],
    clear: { id: 'rc_clear', text: 'Deliver the whole order at $6 a piece or more', met: (g, me) => (orderWon(g, me, PIES_TITLE) ?? 0) >= 6 && deliveredInFull(g, me, PIES) },
    mastery: [
      { id: 'rc_margin', text: 'Win the order at $7 a piece or more', met: (g, me) => (orderWon(g, me, PIES_TITLE) ?? 0) >= 7 },
      { id: 'rc_first', text: 'Finish first', met: won },
    ],
  },
  {
    title: 'Rescue the Stall', rivals: [{ idx: 4, level: 'normal' }, { idx: 7, level: 'normal' }], days: 4, seed: 15, marketDays: false,
    setup: {
      events: { 2: 'pasarMalam' }, off: SHORT, cash: [5, 16, 16],
      shelf: [{ apple: [0, 2, 0, 0, 0, 0], watermelon: [1, 1, 0, 0] }],
    },
    lesson: 'Old stock first: sell what is about to spoil, and let the hawker take what nobody buys. Then rebuild.',
    pic: { kind: 'event', id: 'pasarMalam' },
    before: 'You have $5 and fruit going soft. We have $16 each. The Pasar Malam is on day 2.',
    after: [
      { stars: ['rs_waste'], text: 'Nothing spoiled and you came back from $5. Well rescued.' },
      { text: 'From $5 to first place. Well played.' },
    ],
    clear: winClear('rs_clear'),
    mastery: [
      { id: 'rs_waste', text: 'Let no fruit spoil', met: noWaste },
      { id: 'rs_cash', text: 'End with $30 or more', met: (g, me) => (g.players[me]?.cash ?? 0) >= 30 },
    ],
  },
  {
    title: 'Village Finale', rivals: [{ idx: 0, level: 'normal' }, { idx: 3, level: 'normal' }, { idx: 2, level: 'easy' }], days: 6, seed: 25, marketDays: true,
    setup: { events: { 2: 'pasarMalam', 5: 'heatwave' }, orders: { 3: PICNIC }, crowd: { 5: ['Aisyah', 'Nurul'] }, undercut: [1], off: ['upgrades'] },
    lesson: 'Everything at once: Rosa undercuts, the hawker comes on day 2, and the picnic order wants watermelons on a hot day.',
    pic: { kind: 'order', id: PICNIC },
    before: 'Four stalls. The picnic wants watermelons on day 5, the day of the heat. So will the walk-ins.',
    after: [
      { stars: ['fn_order'], text: 'You filled the picnic order and still beat us. The square is yours.' },
      { text: 'You beat all three of us. The square is yours.' },
    ],
    clear: winClear('fn_clear'),
    mastery: [
      { id: 'fn_order', text: 'Deliver the picnic order in full', met: (g, me) => deliveredInFull(g, me, PICNIC) },
      { id: 'fn_heat', text: 'Sell 3 watermelons to customers on day 5', met: (g, me) => lines(g, onDay(5)).filter((l) => l.fruit === 'watermelon' && !isOrder(l.name)).reduce((a, l) => a + soldOn(l, me), 0) >= 3 },
    ],
  },
];

/** The twelve stages of Chapter 1, in order. A player's saved stage number is a place on this list. */
export const LEAGUE: Stage[] = [...FIRST_SIX, ...NEXT_SIX];

// ---------- expert stages: harder variants, open with stars ----------

export const EXPERTS: Stage[] = [
  {
    title: 'Rosa Reads Back', rivals: [{ idx: 0, level: 'hard' }, { idx: 6, level: 'easy' }], days: 1, seed: 11, marketDays: false,
    setup: { ...READ_SETUP, overbuy: [{ seat: 1, fruit: 'apple', n: 3 }], undercut: [1] },
    lesson: 'This time Rosa takes the apples and asks $1 under the most any customer pays. Read her crates again.',
    pic: { kind: 'keeper', id: RIVALS[0].avatar },
    before: 'I have learned. I bought the apples, and I undercut. What will you do now?',
    after: [
      { stars: ['xr_melon'], text: 'You took the watermelons and left me with apples. Again.' },
      { text: 'You read me again. Well played.' },
    ],
    clear: { id: 'xr_clear', text: 'End the day ahead of Rosa', met: (g, me) => aheadBy(g, me, 1) },
    mastery: [
      { id: 'xr_melon', text: 'Take $10 or more for watermelons', met: (g, me) => takings(g, me, 'watermelon') >= 10 },
      { id: 'xr_ahead', text: 'End the day $5 ahead of Rosa', met: (g, me) => aheadBy(g, me, 5) },
    ],
    expert: { of: 6, stars: 12 },
  },
  {
    title: 'The Eager Bidder', rivals: [{ idx: 1, level: 'normal' }, { idx: 6, level: 'normal' }], days: 3, seed: 21, marketDays: true,
    setup: { ...CONTRACT_SETUP, bidLow: [{ seat: 2, price: 5 }] },
    lesson: 'Pak Din bids $5 for every order. Under that, the apples cost more than the order pays. Let him have it.',
    pic: { kind: 'keeper', id: RIVALS[6].avatar },
    before: `I bid $5 a piece for every order. Always. ${PIES_TITLE} will be mine.`,
    after: [
      { stars: ['xb_ahead'], text: 'You let me have the order and sold to the walk-ins. Clever.' },
      { text: 'You beat me without my order. Well played.' },
    ],
    clear: winClear('xb_clear'),
    mastery: [
      { id: 'xb_apple', text: 'Take $12 or more for apples from customers', met: (g, me) => takings(g, me, 'apple') >= 12 },
      { id: 'xb_ahead', text: 'Finish $5 ahead of Pak Din', met: (g, me) => g.players[me].cash - (g.players[2]?.cash ?? 0) >= 5 },
    ],
    expert: { of: 9, stars: 24 },
  },
];

/** Every stage by its number in a game's config (`config.league`): the twelve, then the experts. */
export const ALL_STAGES: Stage[] = [...LEAGUE, ...EXPERTS];
export const stageByNo = (n: number | undefined): Stage | undefined => (n === undefined ? undefined : ALL_STAGES[n]);
/** Is this stage number an expert stage? */
export const isExpert = (n: number): boolean => n >= LEAGUE.length && n < ALL_STAGES.length;

/** A stage's three stars: its clear, then its two optional goals. */
export const starGoals = (st: Stage): Mastery[] => [st.clear, ...st.mastery];
/** Every star's id, in stage order (experts last). */
export const STAR_IDS: string[] = ALL_STAGES.flatMap((st) => starGoals(st).map((m) => m.id));
export const STAR_COUNT = STAR_IDS.length;
/** The days a stage is played. */
export const stageLength = (st: Stage): number => st.days;
/** The game's last day: the stage's days counted from the day it opens. */
export const lastDay = (st: Stage): number => Math.max(1, st.setup.open?.day ?? 1) - 1 + st.days;

/**
 * The stars a finished league game met, by id. Only a game played on a campaign stage (its set-up is the stage's own)
 * earns stars; a league game from before the campaign earns none.
 */
export function starsEarned(g: GameState, me: number): string[] {
  const st = stageByNo(g.config.league);
  if (g.phase !== 'over' || !st || !g.config.stage || !g.players[me]) return [];
  return starGoals(st).filter((m) => m.met(g, me)).map((m) => m.id);
}

/** Did this finished game meet its stage's clear goal? */
export function stageCleared(g: GameState, me: number): boolean {
  const st = stageByNo(g.config.league);
  if (g.phase !== 'over' || !st || !g.players[me]) return false;
  // A league game saved before the campaign (no set-up of its own) is cleared by a win, as it always was.
  return g.config.stage ? st.clear.met(g, me) : won(g, me);
}

/** The goals a finished stage game missed (the clear goal first). */
export function missedGoals(g: GameState, me: number): Mastery[] {
  const st = stageByNo(g.config.league);
  if (!st || !g.config.stage) return [];
  const got = starsEarned(g, me);
  return starGoals(st).filter((m) => !got.includes(m.id));
}

/**
 * PLAN-118: the stars a phone holds, from what it stores (`stored`, the set "stars") and the stage it is on
 * (`ladder`): each stored star the League still has; the clear star of every stage passed; and, for the six stages
 * from before the pilot, stars kept from goals that were retired. A stage there had three optional stars and now has a
 * clear star and two: each retired star held stands for one of the stage's optional stars not held, and a stage whose
 * three old stars were all held counts as cleared for its stars. So no stage shows fewer stars than before.
 */
export function heldStars(stored: readonly string[], ladder: number): string[] {
  const have = new Set(stored);
  const out = new Set(stored.filter((id) => STAR_IDS.includes(id)));
  LEAGUE.forEach((st, i) => {
    const old = [...st.mastery.map((m) => m.id), ...(st.retired ?? [])];
    if (i < ladder || (st.retired?.length && old.every((id) => have.has(id)))) out.add(st.clear.id);
    let carry = (st.retired ?? []).filter((id) => have.has(id)).length;
    for (const m of st.mastery) if (carry > 0 && !out.has(m.id)) { out.add(m.id); carry--; }
  });
  return STAR_IDS.filter((id) => out.has(id));
}

/** Of the stars held, the ones a stage holds (by its number). */
export const stageStars = (stage: number, have: readonly string[]): string[] => {
  const st = stageByNo(stage);
  return st ? starGoals(st).map((m) => m.id).filter((id) => have.includes(id)) : [];
};

/** Is an expert stage open, with these stars held? */
export const expertOpen = (st: Stage, have: readonly string[]): boolean => !!st.expert && have.length >= st.expert.stars;

// ---------- mastery trophies (PLAN-118) ----------

/** The stages each mastery trophy counts the stars of (by stage number). */
export const MASTERY_STAGES: Record<'contract' | 'night' | 'reader', number[]> = {
  contract: [2, 9],
  night: [1, 7],
  reader: [0, 6],
};
/** The star ids a mastery trophy counts. */
export const masteryStars = (k: keyof typeof MASTERY_STAGES): string[] => MASTERY_STAGES[k].flatMap((n) => starGoals(LEAGUE[n]).map((m) => m.id));

// ---------- words ----------

/** The words that name a stage's picture (for screen readers). */
export function picName(p: StagePic): string {
  if (p.kind === 'event') return EVENT_CARDS.find((e) => e.id === p.id)?.title ?? p.id;
  if (p.kind === 'order') return ORDER_CARDS.find((o) => o.name === p.id)?.title ?? p.id;
  if (p.kind === 'keeper') return RIVALS.find((r) => r.avatar === p.id)?.name ?? p.id;
  return lookOf(p.id).title;
}

/** What the host says after a clear: the first line whose stars the game earned (REP-133, A-03). */
export function afterLine(st: Stage, earned: readonly string[]): string {
  const line = st.after.find((x) => (x.stars ?? []).every((id) => earned.includes(id)));
  return (line ?? st.after[st.after.length - 1]).text;
}

/** The host of a stage: its first rival. */
export const stageHost = (st: Stage) => RIVALS[st.rivals[0].idx % RIVALS.length];
