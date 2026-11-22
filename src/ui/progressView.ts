// What the progress screens (PLAN-113: the results, the Market League, the stamp book and the Wardrobe) read from a
// finished game and from what the phone keeps. Words and choices only, no drawing: the screens draw them.
import { EVENT_CARDS, FRUIT, ORDER_CARDS, RIVALS, lookOf, type FruitId } from '../engine/data';
import type { GameState, Level } from '../engine/game';
import type { Look } from '../net/looks';
import type { CardLine } from './cards';
import { GUEST_EVENT } from './deckArt';
import { stageLength, type Stage } from './campaign';

/** The one sale that brought a player the most money in a game: a customer, one fruit, on one day. */
export interface BestSale {
  day: number;
  /** The day's event card title, when the day had one. */
  event?: string;
  /** The customer's key in the game data (the ticket draws it). */
  who: string;
  /** The customer's name as printed on the card. */
  name: string;
  kind: 'customer' | 'guest' | 'order';
  fruit: FruitId;
  sold: number;
  price: number;
  /** sold × price */
  total: number;
  /** The customer's whole card that day: every fruit they wanted, how many and the most they paid. */
  wants: CardLine[];
}

/**
 * The best sale of a game for one player, from the game's history (one record per day, one line per customer and
 * fruit): the most money from one line, the earlier day on a tie. Null when the player sold nothing.
 */
export function bestSale(s: GameState, viewer: number): BestSale | null {
  let best: BestSale | null = null;
  for (const d of s.history ?? []) {
    for (const l of d.lines) {
      const mine = l.offers.find((o) => o.player === viewer);
      if (!mine || mine.sold <= 0) continue;
      const total = mine.sold * mine.price;
      if (best && total <= best.total) continue;
      const card = d.lines.filter((x) => x.customerId === l.customerId);
      const order = ORDER_CARDS.find((o) => o.name === l.name);
      best = {
        day: d.day,
        event: d.event ? EVENT_CARDS.find((e) => e.id === d.event)?.title : undefined,
        who: l.name,
        name: order ? order.title : lookOf(l.name).title,
        kind: order ? 'order' : GUEST_EVENT[l.name] ? 'guest' : 'customer',
        fruit: l.fruit, sold: mine.sold, price: mine.price, total,
        wants: card.map((x) => ({ fruit: x.fruit, qty: x.want, max: x.max })),
      };
    }
  }
  return best;
}

/** "2 mangoes" */
export const pieces = (n: number, f: FruitId): string => `${n} ${(n === 1 ? FRUIT[f].name : FRUIT[f].plural).toLowerCase()}`;

/** The sentence under the best sale: "Miss Cha-Cha bought 2 mangoes from you at $9: +$18, your biggest sale." */
export const bestSaleWords = (b: BestSale): string => `${b.name} bought ${pieces(b.sold, b.fruit)} from you at $${b.price}: +$${b.total}, your biggest sale.`;

/** The heading over it: "Day 6 · Mango Windfall", or "Day 6" on a day without an event. */
export const bestSaleDay = (b: BestSale): string => (b.event ? `Day ${b.day} · ${b.event}` : `Day ${b.day}`);

/**
 * Of the looks a game handed out, the one the results show on your stall with "Wear it": something others see on the
 * stall first, then what the shopkeeper wears, then the signboard, then a sound.
 */
export function shownLook(fresh: Look[]): Look | undefined {
  const order = ['stall', 'wear', 'sign', 'sound'];
  return [...fresh].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))[0];
}

// ---------- the Market League ----------

const LEVEL_WORD: Record<Level, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };

/** The rival shopkeepers of a stage, from the game data. */
export const stageRivals = (st: Stage): { name: string; avatar: string; level: Level }[] =>
  st.rivals.map((r) => ({ name: RIVALS[r.idx % RIVALS.length].name, avatar: RIVALS[r.idx % RIVALS.length].avatar, level: r.level }));

const and = (xs: string[]): string => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/**
 * The stage's clear goal, as the League screen says it: "Beat Rosa over 6 days to move up" for a stage cleared by a
 * win (a shared win counts, as it does for the stage: campaign.ts stageCleared), otherwise the goal's own words with
 * the length: "1 day: end the day $8 ahead of Rosa".
 */
export function stageGoal(st: Stage): string {
  const n = stageLength(st);
  const days = `${n} ${n === 1 ? 'day' : 'days'}`;
  if (st.clear.win) return `Beat ${and(stageRivals(st).map((r) => r.name))} over ${days} to move up`;
  return `${days}: ${st.clear.text.charAt(0).toLowerCase()}${st.clear.text.slice(1)}`;
}

/**
 * "6 days · Rosa (Easy)", "6 days · Uncle Benny (Easy), Ah Chen (Normal)": the length, then each rival with its own
 * level (REP-133, A-08: the levels used to stand apart from the names, so "Normal and Easy · Uncle Benny, Ah Chen" read
 * as if Uncle Benny were Normal). PLAN-118: the days the stage is played ("1 day" for a puzzle).
 */
export function stageLine(st: Stage): string {
  const n = stageLength(st);
  return `${n} ${n === 1 ? 'day' : 'days'} · ${stageRivals(st).map((r) => `${r.name} (${LEVEL_WORD[r.level]})`).join(', ')}`;
}
