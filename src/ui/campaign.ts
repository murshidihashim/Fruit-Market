// The Market League as a solo campaign (PLAN-115): six short, authored stages. Each fixes its seed and says which of
// the game's own cards come on which day (game.ts StageSetup); the rules do not change. Each has one goal to clear it
// (win: a shared win counts, as before), three optional mastery goals read from the finished game's own record, and a
// short moment before and after with the real character, customer, order and event art. No screen code here.
import { EVENT_CARDS, ORDER_CARDS, RIVALS, lookOf, prefOf, type FruitId } from '../engine/data';
import type { GameState, Level, LineResult, StageSetup } from '../engine/game';

/** A picture from the game's own art: an event card, a customer card, a standing order's client or a shopkeeper. */
export type StagePic = { kind: 'event'; id: string } | { kind: 'customer'; id: string } | { kind: 'order'; id: string } | { kind: 'keeper'; id: string };

/** An optional mastery goal: one star. `id` is stored in the phone's sets ("stars") and never reused. */
export interface Mastery { id: string; text: string; met: (g: GameState, me: number) => boolean }

export interface Stage {
  title: string;
  /** Rivals by RIVALS index, with their computer level. */
  rivals: { idx: number; level: Level }[];
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
  /** What the rival who hosts the stage (the first rival) says before it, and after it is cleared. */
  before: string;
  after: string;
  mastery: Mastery[];
}

// ---------- reading the game's record ----------

const lines = (g: GameState, day?: (d: number, event?: string) => boolean): (LineResult & { day: number })[] =>
  (g.history ?? []).filter((d) => !day || day(d.day, d.event)).flatMap((d) => d.lines.map((l) => ({ ...l, day: d.day })));
const offerOf = (l: LineResult, p: number) => l.offers.find((o) => o.player === p);
const soldOn = (l: LineResult, p: number): number => offerOf(l, p)?.sold ?? 0;
/** Pieces of a fruit this stall sold to the row (customers, guests and orders) on the days chosen. */
const soldFruit = (g: GameState, me: number, f: FruitId, day?: (d: number, event?: string) => boolean): number =>
  lines(g, day).filter((l) => l.fruit === f).reduce((a, l) => a + soldOn(l, me), 0);
const onEvent = (id: string) => (_d: number, e?: string) => e === id;
/** This stall finished at least `by` dollars ahead of every other stall. */
const aheadBy = (g: GameState, me: number, by: number): boolean => g.players.every((p, i) => i === me || g.players[me].cash - p.cash >= by);
const noWaste = (g: GameState, me: number): boolean => (g.players[me]?.stats.spoiled ?? 1) === 0;
/** The price this stall won a standing order at, from the game's log; null when it did not win one. */
function orderWon(g: GameState, me: number, title: string): number | null {
  const head = `${g.players[me]?.name} won the standing order for ${title} at $`;
  const line = g.log.find((x) => x.startsWith(head));
  return line ? Number.parseInt(line.slice(head.length), 10) : null;
}

const RESORT = 'Beach Resort';
const RESORT_TITLE = ORDER_CARDS.find((o) => o.name === RESORT)?.title ?? RESORT;
const PREMIUM_DAY = 5;
/** The premium buyers of the last stage: customers whose card wants Fresh mangoes. */
const PREMIUM = ['Ravi', 'Lina', 'Anna'];

// ---------- the six stages ----------

export const LEAGUE: Stage[] = [
  {
    title: 'Village Square', rivals: [{ idx: 0, level: 'easy' }], days: 6, seed: 58, marketDays: false,
    setup: { events: {}, undercut: [1] },
    lesson: 'Rosa always asks $1 under the top price. Go $1 under her and the customer comes to you.',
    pic: { kind: 'keeper', id: RIVALS[0].avatar },
    before: 'I always ask a dollar under the top price. Every day.',
    after: 'A dollar under me. I should have seen that coming.',
    mastery: [
      { id: 'vs_under', text: 'Sell a fruit $1 under Rosa\'s price', met: (g, me) => lines(g).some((l) => soldOn(l, me) > 0 && offerOf(l, 1)?.price === (offerOf(l, me)?.price ?? 0) + 1) },
      { id: 'vs_top', text: 'Sell a piece at a customer\'s top price', met: (g, me) => lines(g).some((l) => soldOn(l, me) > 0 && offerOf(l, me)?.price === l.max) },
      { id: 'vs_ahead', text: 'Finish $10 ahead of Rosa', met: (g, me) => aheadBy(g, me, 10) },
    ],
  },
  {
    title: 'Pasar Malam', rivals: [{ idx: 3, level: 'normal' }], days: 6, seed: 27, marketDays: false,
    setup: { events: { 2: 'pasarMalam', 4: 'pasarMalam', 6: 'pasarMalam' } },
    lesson: 'On a Pasar Malam night the hawker pays $3 for 1 of each fruit left in your crate. Never sell for less.',
    pic: { kind: 'event', id: 'pasarMalam' },
    before: 'The night market is on days 2, 4 and 6. The hawker pays $3 for leftovers.',
    after: 'You kept your price above the hawker\'s. Well sold.',
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
      { id: 'pm_sold', text: 'Sell 14 pieces', met: (g, me) => (g.players[me]?.stats.sold ?? 0) >= 14 },
    ],
  },
  {
    title: 'The Hotel Order', rivals: [{ idx: 1, level: 'easy' }, { idx: 2, level: 'normal' }], days: 6, seed: 1, marketDays: true,
    setup: { events: {}, orders: { 3: RESORT } },
    lesson: 'On day 3 the Beach Resort orders watermelons for day 5. Bid low enough to win it, high enough to profit.',
    pic: { kind: 'order', id: RESORT },
    before: 'The Beach Resort wants watermelons on day 5. The lowest bid wins.',
    after: 'The resort paid on time. A good order is steady money.',
    mastery: [
      { id: 'ho_win', text: `Win the ${RESORT}'s order`, met: (g, me) => orderWon(g, me, RESORT_TITLE) !== null },
      { id: 'ho_full', text: 'Deliver every piece of the order', met: (g, me) => lines(g).some((l) => l.name === RESORT && soldOn(l, me) > 0 && soldOn(l, me) >= l.want) },
      { id: 'ho_bid', text: 'Win the order at $9 a piece or more', met: (g, me) => (orderWon(g, me, RESORT_TITLE) ?? 0) >= 9 },
    ],
  },
  {
    title: 'Heatwave', rivals: [{ idx: 4, level: 'normal' }, { idx: 5, level: 'easy' }], days: 6, seed: 37, marketDays: false,
    setup: { events: { 3: 'heatwave', 5: 'heatwave' } },
    lesson: 'A Heatwave pays $2 more for watermelons, and that night every fruit ages two steps. Sell, do not store.',
    pic: { kind: 'event', id: 'heatwave' },
    before: 'Heatwaves on days 3 and 5. Watermelons sell high, and fruit goes soft fast.',
    after: 'You sold in the heat and kept nothing to rot. Smart.',
    mastery: [
      { id: 'hw_melon', text: 'Sell 3 watermelons on Heatwave days', met: (g, me) => soldFruit(g, me, 'watermelon', onEvent('heatwave')) >= 3 },
      { id: 'hw_nine', text: 'Sell a watermelon for $9 or more', met: (g, me) => lines(g).some((l) => l.fruit === 'watermelon' && soldOn(l, me) > 0 && (offerOf(l, me)?.price ?? 0) >= 9) },
      { id: 'hw_waste', text: 'Let no fruit spoil', met: noWaste },
    ],
  },
  {
    title: 'Glut', rivals: [{ idx: 6, level: 'normal' }, { idx: 7, level: 'normal' }], days: 6, seed: 5, marketDays: false,
    setup: { events: { 2: 'glut', 4: 'glut' } },
    lesson: 'A Blueberry Glut brings more blueberries and lower prices. Buy them cheap, but sell them before they soften.',
    pic: { kind: 'event', id: 'glut' },
    before: 'Blueberry Gluts on days 2 and 4. Everyone will have blueberries.',
    after: 'When everyone has blueberries, the other fruit is where the money is.',
    mastery: [
      { id: 'gl_other', text: 'On Glut days, sell more of other fruit than blueberries', met: (g, me) => {
        const glut = onEvent('glut');
        const berries = soldFruit(g, me, 'blueberry', glut);
        const others = (['watermelon', 'apple', 'mango'] as FruitId[]).reduce((a, f) => a + soldFruit(g, me, f, glut), 0);
        return others > berries;
      } },
      { id: 'gl_berries', text: 'Sell 6 blueberries', met: (g, me) => soldFruit(g, me, 'blueberry') >= 6 },
      { id: 'gl_waste', text: 'Let no fruit spoil', met: noWaste },
    ],
  },
  {
    title: 'Premium Buyers', rivals: [{ idx: 1, level: 'normal' }, { idx: 2, level: 'normal' }], days: 6, seed: 73, marketDays: false,
    setup: { events: {}, crowd: { [PREMIUM_DAY]: PREMIUM } },
    lesson: `On day ${PREMIUM_DAY} premium buyers come for mangoes, Fresh only. Mangoes arrive green and need two nights.`,
    pic: { kind: 'customer', id: 'Ravi' },
    before: `${PREMIUM.slice(0, -1).join(', ')} and ${PREMIUM[PREMIUM.length - 1]} come on day ${PREMIUM_DAY}. They buy Fresh fruit only.`,
    after: 'Fresh mangoes on the right day. The premium buyers will be back.',
    mastery: [
      { id: 'pb_two', text: 'Sell to 2 premium buyers', met: (g, me) => new Set(lines(g).filter((l) => prefOf(l.name) === 'premium' && soldOn(l, me) > 0).map((l) => `${l.day}.${l.customerId}`)).size >= 2 },
      { id: 'pb_mango', text: 'Sell 3 mangoes to premium buyers', met: (g, me) => lines(g).filter((l) => l.fruit === 'mango' && prefOf(l.name) === 'premium').reduce((a, l) => a + soldOn(l, me), 0) >= 3 },
      { id: 'pb_ahead', text: 'Win by $10 or more', met: (g, me) => aheadBy(g, me, 10) },
    ],
  },
];

/** Every star's id, in stage order. */
export const STAR_IDS: string[] = LEAGUE.flatMap((st) => st.mastery.map((m) => m.id));
export const STAR_COUNT = STAR_IDS.length;

/**
 * The mastery goals a finished league game met, by id. Only a game played on a campaign stage (its set-up is the
 * stage's own) earns stars; a league game from before the campaign earns none.
 */
export function starsEarned(g: GameState, me: number): string[] {
  const at = g.config.league;
  if (g.phase !== 'over' || at === undefined || !g.config.stage || !g.players[me]) return [];
  const st = LEAGUE[at];
  return st ? st.mastery.filter((m) => m.met(g, me)).map((m) => m.id) : [];
}

/** Of the stars stored, the ones a stage holds. */
export const stageStars = (stage: number, have: readonly string[]): string[] => (LEAGUE[stage]?.mastery ?? []).map((m) => m.id).filter((id) => have.includes(id));

/** The words that name a stage's picture (for screen readers). */
export function picName(p: StagePic): string {
  if (p.kind === 'event') return EVENT_CARDS.find((e) => e.id === p.id)?.title ?? p.id;
  if (p.kind === 'order') return ORDER_CARDS.find((o) => o.name === p.id)?.title ?? p.id;
  if (p.kind === 'keeper') return RIVALS.find((r) => r.avatar === p.id)?.name ?? p.id;
  return lookOf(p.id).title;
}

/** The host of a stage: its first rival. */
export const stageHost = (st: Stage) => RIVALS[st.rivals[0].idx % RIVALS.length];
