// The words on Home's Daily card and on the Daily results, kept apart from the screens so they can be unit tested.
// Everything comes from the game itself: the first morning of today's Daily market (the same for everyone, and public
// from the game's first screen) and its set-up.
import { FRUIT, lookOf, type FruitId } from '../engine/data';
import { effectiveMax, type GameConfig, type GameState, type Level } from '../engine/game';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "22 Nov" from a date key ("2026-11-22"), as Home shows dates (REP-133, B-12). */
export function shortDate(key: string): string {
  const [, m, d] = key.split('-').map(Number);
  return m >= 1 && m <= 12 && d >= 1 ? `${d} ${MONTHS[m - 1]}` : key;
}

const pieces = (n: number, f: FruitId) => `${n} ${(n === 1 ? FRUIT[f].name : FRUIT[f].plural).toLowerCase()}`;

/** One line of the first customer's card, at the price the game will use. */
export interface FirstWant { fruit: FruitId; qty: number; max: number }

/**
 * The first morning's customer, with the prices the game will use (REP-133, A-02): on a Fixed prices day every customer
 * pays the fixed price for each fruit (and a generous one $2 more), not the price printed on the card. Null when the
 * first morning has an event card instead (no game has one yet) or no customer.
 */
export function firstCustomer(first: GameState): { name: string; wants: FirstWant[]; words: string } | null {
  const who = first.event ? null : first.forecast;
  if (!who) return null;
  const wants = who.wants.map((w) => ({ fruit: w.fruit, qty: w.qty, max: effectiveMax(first, w, who.generous) }));
  return { name: who.name, wants, words: `First customer: ${lookOf(who.name).title}, ${wants.map((w) => `${pieces(w.qty, w.fruit)} up to $${w.max}`).join(' and ')}.` };
}

const LEVEL_WORD: Record<Level, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };
const and = (xs: string[]): string => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/**
 * PLAN-117: who you play against and at what level, from the set-up itself: "Against Rosa, Uncle Benny and Ah Chen,
 * all Normal." (each rival with its own level when they differ).
 */
export function rivalsLine(cfg: GameConfig): string {
  const ais = cfg.players.filter((p) => p.kind === 'ai');
  if (!ais.length) return '';
  const levels = new Set(ais.map((p) => p.level ?? 'normal'));
  if (levels.size === 1) {
    const lv = LEVEL_WORD[[...levels][0]];
    return `Against ${and(ais.map((p) => p.name))}, ${ais.length === 1 ? lv : `all ${lv}`}.`;
  }
  return `Against ${and(ais.map((p) => `${p.name} (${LEVEL_WORD[p.level ?? 'normal']})`))}.`;
}

/** A line's name on a Daily board as your phone shows it: "You" on your own line (REP-133 B-13: the board keeps a
 *  neutral name, "Shopkeeper c0c7", for a player who never chose one), the board's name on everyone else's. */
export const boardName = (name: string, place: number, rank: number | undefined): string => (rank === place ? 'You' : name);
