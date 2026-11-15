// Who buys first today, and why (PLAN-104). The game decides the line-up at dawn (engine/game.ts startDay, rules 10):
// Day 1 starts at the first-player token, which a random draw put on a seat; from Day 2 the stall with the least cash
// goes first and the rest follow clockwise, a tie going to the first of the tied stalls clockwise from the token (it
// moves one seat clockwise every night); on Day 3 Nest Egg goes first; a Priority card played the evening before goes
// ahead of everything. The game keeps the line-up, not the reason, so the reason is worked out again here from what
// the game does keep, all of it public: each stall's cash at dawn (dayStartCash, counted after the inspector's fine
// and the market's top-up, as the game counts it), where the token is (firstPlayer) and who holds Nest Egg. Nothing
// here changes the game. It reads the same on every phone: a stall's view online carries the same line-up and cash.
import type { GameState } from '../engine/game';

/** A stall's seat round the table: 1 for the first seat, then clockwise (the game's line-up runs clockwise by seat). */
export const seatNo = (p: number): number => p + 1;

export type FirstWhy =
  /** Day 1: the token was put on a seat at random, and the first day starts there. */
  | { kind: 'random' }
  /** The least cash at dawn. */
  | { kind: 'cash'; cash: number }
  /** A tie for the least cash: the first of the tied stalls clockwise from the token's seat (`from`, a stall). */
  | { kind: 'tie'; cash: number; from: number }
  /** A Priority card played the evening before. `egg`: on Day 3 Nest Egg's stall, second behind it. */
  | { kind: 'priority'; egg: number | null }
  /** Nest Egg, first on Day 3. */
  | { kind: 'nestEgg' }
  /** A game saved before the cash at dawn was kept: who is first, and no reason. */
  | { kind: 'none' };

export interface FirstBuyer { p: number; why: FirstWhy }

/**
 * Today's first buyer and the reason. Null before the day has a line-up. One case cannot be told apart from what the
 * game keeps: a Priority card played by the stall that would have gone first anyway leaves the line-up as it was, and
 * then the reason given is the one that would have put it first (least cash, a tie or Nest Egg), which is also true.
 */
export function firstBuyer(s: GameState): FirstBuyer | null {
  const n = s.players.length;
  const p = s.order[0];
  if (p === undefined || !s.players[p]) return null;
  if (s.day === 1) return { p, why: { kind: 'random' } };
  const cash = s.dayStartCash;
  if (!cash || cash.length !== n) return { p, why: { kind: 'none' } };
  // Rules 10 as the game plays it: the seats clockwise from the token, the first of them with the least cash.
  const rota = Array.from({ length: n }, (_, i) => (s.firstPlayer + i) % n);
  const least = Math.min(...cash);
  const tied = rota.filter((i) => cash[i] === least);
  const egg = s.day === 3 ? s.players.findIndex((pl) => pl.trait === 'nestegg') : -1;
  const expected = egg >= 0 ? egg : tied[0];
  if (p !== expected) return { p, why: { kind: 'priority', egg: egg >= 0 && s.order[1] === egg ? egg : null } };
  if (egg >= 0) return { p, why: { kind: 'nestEgg' } };
  if (tied.length > 1) return { p, why: { kind: 'tie', cash: least, from: s.firstPlayer } };
  return { p, why: { kind: 'cash', cash: least } };
}

/** The reason in a few words, as the stalls' row shows it beside the first buyer's name. */
export function whyWords(why: FirstWhy): string {
  switch (why.kind) {
    case 'random': return 'picked at random';
    case 'cash': return `least cash $${why.cash}`;
    case 'tie': return `tied at $${why.cash}, first from seat ${seatNo(why.from)}`;
    case 'priority': return 'Priority card';
    case 'nestEgg': return 'Nest Egg, Day 3';
    case 'none': return '';
  }
}

/** The reason in a sentence, for a screen reader. */
function whySaid(why: FirstWhy): string {
  switch (why.kind) {
    case 'random': return 'picked at random on Day 1';
    case 'cash': return `the least cash at dawn, $${why.cash}`;
    case 'tie': return `tied for the least cash at $${why.cash}, and the first of the tied stalls clockwise from seat ${seatNo(why.from)}, where the first-player token is today`;
    case 'priority': return 'a Priority card played last evening';
    case 'nestEgg': return 'Nest Egg buys first on Day 3';
    case 'none': return '';
  }
}

/** The line under the stalls' row title: who buys first, why, and how the rest follow. */
export interface FirstLine {
  /** "Kiki buys first" */
  head: string;
  /** "least cash $2 · then clockwise" */
  tail: string;
  /** The two together, as the row shows them. */
  text: string;
  /** In whole sentences, for a screen reader. */
  aria: string;
}

export function firstLine(s: GameState, viewer: number): FirstLine | null {
  const f = firstBuyer(s);
  if (!f) return null;
  const me = f.p === viewer;
  const head = `${me ? 'You' : s.players[f.p].name} ${me ? 'buy' : 'buys'} first`;
  const name = (q: number) => (q === viewer ? 'you' : s.players[q]?.name ?? '');
  const egg = f.why.kind === 'priority' ? f.why.egg : null;
  // A stall moved to the front (Priority, Nest Egg) leaves the rest in their order: clockwise from the one with the least
  // cash, who is next. After a Priority card on Day 3 Nest Egg is next, and the rest follow it.
  const jumped = f.why.kind === 'priority' || f.why.kind === 'nestEgg';
  const second = s.order[1];
  const rest = egg !== null ? `${name(egg)} next, Nest Egg` : jumped && second !== undefined ? `then ${name(second)}, clockwise` : 'then clockwise';
  const tail = [whyWords(f.why), rest].filter(Boolean).join(' · ');
  const said = whySaid(f.why);
  const then = egg !== null ? `Then ${name(egg)}, with Nest Egg, then the others clockwise from the least cash.`
    : jumped && second !== undefined ? `Then ${name(second)}, and the others clockwise from there.` : 'The others follow clockwise round the seats.';
  return { head, tail, text: `${head} · ${tail}`, aria: `${head}${said ? `: ${said}` : ''}. ${then}` };
}
