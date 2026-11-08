// Rule sentences the set-up screen and How to play show, built from the game data so they cannot drift from the
// rules again (the "Unripe fruit" switch said "$1 now" long after green fruit stopped costing $1: REP-089 3.7).
import { FRUIT, FRUITS, JAM_PRICE, LAST_CALL_BONUS, MARKET_DAY_EVERY, deliveredGreen } from '../engine/data';

const nights = (n: number) => `${n} night${n === 1 ? '' : 's'}`;
const list = (xs: (string | number)[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** Market Days in the longest game (14 days): 3, 6, 9 and 12, as the print kit lists them. */
export const MARKET_DAY_LIST = list([1, 2, 3, 4].map((k) => k * MARKET_DAY_EVERY));

/**
 * The "Unripe fruit" switch: which fruit some lorries bring green, what it costs at the market and when it can be
 * sold, e.g. "Some lorries bring mangoes green: from $4, ready to sell after 2 nights." ("from": a Price Hike day
 * adds $1.)
 */
export function unripeSetupText(): string {
  const parts = FRUITS.filter(deliveredGreen).map((f) =>
    `${FRUIT[f].plural.toLowerCase()} green: from $${FRUIT[f].cost.unripe}, ready to sell after ${nights(FRUIT[f].unripeSlots)}`);
  return parts.length ? `Some lorries bring ${parts.join('; ')}.` : 'No lorry brings green fruit at the moment.';
}

/** The "Market Days" switch, which also turns on Closing Day (the final day's bonus and the jam maker). */
export function marketDaysSetupText(): string {
  return `Days ${MARKET_DAY_LIST}: one more walk-in. Closing Day on the final day: +$${LAST_CALL_BONUS}, then the jam maker buys ripe leftovers at $${JAM_PRICE} each.`;
}
