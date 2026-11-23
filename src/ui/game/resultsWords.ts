// The final results' words about the game as a whole (PLAN-123): the one moment that decided it, taken from the day's
// sales the game kept (DayRecord), and what to say when the person made no sales at all. Pure: tests read them
// without a page. Drawn by panels/Results.tsx.
import { FRUIT, lookOf, type FruitId } from '../../engine/data';
import { winners, type GameState } from '../../engine/game';

const pieces = (f: FruitId, n: number) => `${n} ${(n === 1 ? FRUIT[f].name : FRUIT[f].plural).toLowerCase()}`;

/** Each stall's cash as the game began (the first day's cash less that day's change), or null when the record is too
 *  old to say (records before 1.27.1 have no day's change). */
export function startingCash(s: GameState): number[] | null {
  const d = s.history?.[0];
  if (!d?.net) return null;
  return d.cash.map((c, p) => c - (d.net?.[p] ?? 0));
}

/** Did stall `p` sell anything in this game (to a customer, a guest or a standing order)? */
export const soldAny = (s: GameState, p: number): boolean =>
  (s.players[p]?.stats.sold ?? 0) > 0 || (s.history ?? []).some((d) => d.lines.some((l) => l.offers.some((o) => o.player === p && o.sold > 0)));

/**
 * The recap for a person who made no sales in the whole game (null when they made some): "You ended with your
 * starting cash and made no sales.", or with the money they ended on against what they began with.
 */
export function noSalesLine(s: GameState, p: number): string | null {
  if (!s.players[p] || soldAny(s, p)) return null;
  const start = startingCash(s)?.[p];
  const cash = s.players[p].cash;
  if (start === undefined) return 'You made no sales.';
  if (cash === start) return 'You ended with your starting cash and made no sales.';
  return cash < start
    ? `You made no sales and ended with $${cash}, $${start - cash} less than you started with.`
    : `You made no sales and ended with $${cash}, $${cash - start} more than you started with.`;
}

/** The one stall alone at the top of a day's cash (-1 when two or more share it). */
function leader(cash: number[]): number {
  const top = Math.max(...cash);
  const at = cash.flatMap((c, i) => (c === top ? [i] : []));
  return at.length === 1 ? at[0] : -1;
}

/**
 * The moment that decided the game: the day the winner took the lead on cash and kept it to the end, with the winner's
 * biggest sale that day ("Day 4: Rosa sold 3 mangoes to Mrs Tan for $15 and took the lead for good."). Every word comes
 * from the sales the game kept. Null when there is no single winner, the last day's lead was not on cash alone (fruit
 * sold settled it), or the game kept no days.
 */
export function decisiveMoment(s: GameState, owner: number): { day: number; text: string } | null {
  const h = s.history ?? [];
  const first = winners(s);
  if (s.players.length < 2 || first.length !== 1 || !h.length) return null;
  const w = first[0];
  let k = h.length - 1;
  if (leader(h[k].cash) !== w) return null;
  while (k > 0 && leader(h[k - 1].cash) === w) k--;
  const d = h[k];
  const who = w === owner ? 'You' : s.players[w].name;
  const how = h.length === 1 ? 'finished on top' : k === 0 ? 'led from then on' : k === h.length - 1 ? 'took the lead on the last day' : 'took the lead for good';
  let best: { fruit: FruitId; n: number; total: number; name: string } | null = null;
  for (const l of d.lines) {
    const o = l.offers.find((x) => x.player === w);
    if (!o || o.sold <= 0) continue;
    const total = o.sold * o.price;
    if (!best || total > best.total) best = { fruit: l.fruit, n: o.sold, total, name: l.name };
  }
  const text = best
    ? `Day ${d.day}: ${who} sold ${pieces(best.fruit, best.n)} to ${lookOf(best.name).title} for $${best.total} and ${how}.`
    : `Day ${d.day}: ${who} ${how}.`;
  return { day: d.day, text };
}
