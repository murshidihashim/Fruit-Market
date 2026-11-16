// Rule sentences the set-up screen and How to play show, built from the game data so they cannot drift from the
// rules again (the "Unripe fruit" switch said "$1 now" long after green fruit stopped costing $1: REP-089 3.7).
import { FRUIT, FRUITS, MARKET_DAY_EVERY, ORDER_LEAD, deliveredGreen } from '../engine/data';

const nights = (n: number) => `${n} night${n === 1 ? '' : 's'}`;
const list = (xs: (string | number)[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** Market Days in the longest game (14 days): 3, 6, 9 and 12, as the print kit lists them. */
export const MARKET_DAY_LIST = list([1, 2, 3, 4].map((k) => k * MARKET_DAY_EVERY));

/** The lengths a game can have: Quick, Standard and Long (the set-up screen, App.tsx and Online.tsx). */
export const GAME_LENGTHS = [8, 10, 14] as const;

/**
 * The Market Days of a game of `days` days that bring no standing order (REP-122 C-02). A Market Day is never the last
 * day, and a standing order is turned over only when its due day, ORDER_LEAD days later, is not after the last day
 * (game.ts isMarketDay and drawStanding): so Day 9 of a 10-day game has none, and the 8- and 14-day games miss none.
 */
export function marketDaysWithoutOrder(days: number): number[] {
  const out: number[] = [];
  for (let d = MARKET_DAY_EVERY; d < days; d += MARKET_DAY_EVERY) if (d + ORDER_LEAD > days) out.push(d);
  return out;
}

/** "Day 9 of a 10-day game": every Market Day, over the game lengths, that brings no standing order. */
export const NO_ORDER_DAYS = list(GAME_LENGTHS.flatMap((days) => marketDaysWithoutOrder(days).map((d) => `Day ${d} of a ${days}-day game`)));

/**
 * The "Unripe fruit" switch: which fruit some lorries bring green, what it costs at the market and when it can be
 * sold, e.g. "Every lorry brings mangoes green: from $3, ready to sell after 2 nights." (rules 14) ("from": a Price Hike day
 * adds $1.)
 */
export function unripeSetupText(): string {
  const parts = FRUITS.filter(deliveredGreen).map((f) =>
    `${FRUIT[f].plural.toLowerCase()} green: from $${FRUIT[f].cost.unripe}, ready to sell after ${nights(FRUIT[f].unripeSlots)}`);
  return parts.length ? `Every lorry brings ${parts.join('; ')}.` : 'No lorry brings green fruit at the moment.';
}

/** The "Market Days" switch. Rules 20: it turns Market Days on and off and nothing else (it no longer brings a
 *  Closing Day). Upgrades are offered after those days either way (isDraftNight). */
export function marketDaysSetupText(): string {
  return `Days ${MARKET_DAY_LIST}: a standing order to bid for. Switched off, there are no standing orders, and upgrades still come on those evenings.`;
}
