// What a new state of the game is to the table, worked out from the state before it and the state after it, and the
// other plain turn rules of the game screen: which beat plays, whose purchases it shows, the totals held back over the
// rush, a computer stall's next step, the room's next state online, and the morning's countdown stamp. Pure: no page
// and no Preact (the controller, useGameController.ts and turnDriver.ts, acts on them; tests read them directly).
import { aiStep, computersEvening } from '../../engine/ai';
import { eveningOpen, type GameState } from '../../engine/game';
import { overnightJuice, overnightLines, overnightLoss } from '../../engine/story';
import { ownDayAfterRush, type OwnDay } from './dayWords';

/** One step of the game as the table plays it. */
export interface StepKind {
  /** The bell and the rush follow (rules 18: when no stall has ripe fruit, the rush follows buying directly). */
  rush: boolean;
  /** The prices flip before a Favoured Trade question (rules 18; PLAN-085): the bell rings here, and not again. */
  flip: boolean;
  /** Buying starts: the lorry unloads (the morning's news, or the standing order's bids, are done). */
  toBuy: boolean;
  /** Night has fallen: a new day. */
  newDay: boolean;
  /** PLAN-123: the stall whose purchases this beat shows (-1: none). */
  buyer: number;
  /** The beat is this phone's own purchase or Undo, so a tap on the market is kept for when it ends. */
  own: boolean;
}

/** What the step from `prev` to `next` is. `seat` is this phone's seat online (null offline). */
export function stepKind(prev: GameState, next: GameState, seat: number | null): StepKind {
  const same = next.day === prev.day;
  const rush = same && (prev.phase === 'bid' || prev.phase === 'tie' || prev.phase === 'stall' || prev.phase === 'buy') && next.phase === 'reveal';
  const flip = same && prev.phase === 'bid' && next.phase === 'tie';
  const toBuy = same && (prev.phase === 'morning' || prev.phase === 'order') && next.phase === 'buy';
  const buyer = prev.phase === 'buy' && same ? prev.order[prev.turn] ?? -1 : -1;
  const own = buyer >= 0 && next.phase === 'buy' && next.order[next.turn] === buyer && prev.players[buyer]?.kind === 'human'
    && (seat === null || buyer === seat);
  return { rush, flip, toBuy, newDay: !same, buyer, own };
}

/** Every stall's cash as it was before the rush: the game has already paid every sale (and given a standing order's
 *  stake back, rules 18), and the totals add up as the coins land. Null when the step has no rush results. */
export function cashBeforeRush(next: GameState): number[] | null {
  const r = next.results;
  if (!r) return null;
  return next.players.map((pl, i) => pl.cash - r.income[i] - (r.order?.holder === i ? r.order.back : 0));
}

/**
 * S8 (PLAN-110), a shared phone: each person's own day, kept from the rush until the phone is next passed to them.
 * After the rush every person's day is kept (the takings on a shared phone show nobody's own); at night a person who
 * has not yet seen their day hears what the night did to their shelf with it. `shared`: offline, two or more people.
 */
export function ownDaysAfter(days: Record<number, OwnDay>, prev: GameState, next: GameState, humans: number[], shared: boolean): Record<number, OwnDay> {
  const kind = stepKind(prev, next, null);
  const out = { ...days };
  if (kind.newDay) {
    for (const p of humans) {
      const d = out[p];
      if (d && d.day === prev.day) out[p] = { ...d, night: overnightLines(overnightLoss(prev, next, p), overnightJuice(prev, next, p)).map((l) => l.text) };
    }
  }
  if (kind.rush && next.results && shared) {
    for (const p of humans) {
      const d = ownDayAfterRush(next, p);
      if (d) out[p] = d;
    }
  }
  return out;
}

/**
 * The computer stalls' next step offline. Rules 19: in the evening they decide as it opens, all at once (their builds
 * and favour cards are one beat); when a computer is the last stall to close, its Lights out is a step of its own. A
 * rival's whole buying turn is one beat (PLAN-085, DEC-098): its steps are taken together, up to and with the one that
 * ends its turn, as long as the table stays in buying (the step that brings the customers is its own). Null: no
 * computer acts now.
 */
export function computerStep(cur: GameState): GameState | null {
  if (cur.phase === 'evening') return computersEvening(cur, (p) => cur.players[p].kind === 'ai') ?? aiStep(cur);
  let next = aiStep(cur);
  while (next && cur.phase === 'buy' && next.phase === 'buy' && next.day === cur.day && next.turn === cur.turn) {
    const more = aiStep(next);
    if (!more || more.phase !== 'buy' || more.day !== cur.day) break;
    next = more;
  }
  return next;
}

/**
 * Online: the next state to show from the room's queue (taken off the front of `queue`). A stall's buying turn is one
 * beat where it can be (PLAN-085, DEC-098): the steps of that turn already waiting are shown together. Only what has
 * arrived is gathered, so nothing waits for a step still to come.
 */
export function nextFromRoom(cur: GameState, queue: GameState[]): GameState | undefined {
  let next = queue.shift();
  while (next && cur.phase === 'buy' && next.phase === 'buy' && next.day === cur.day && next.turn === cur.turn && queue.length
    && queue[0].phase === 'buy' && queue[0].day === cur.day) next = queue.shift()!;
  return next;
}

/**
 * Rules 19, online: a state that only changes other stalls while this person is still deciding in the evening (the
 * same evening, and their own stall as it was). It is drawn at once, not played as a beat: the evening sheet lies over
 * the table, and taking it away for a rival's label would lose the person's place.
 */
export function eveningAside(prev: GameState, next: GameState, seat: number | null): boolean {
  if (seat === null || prev.phase !== 'evening' || next.phase !== 'evening' || prev.day !== next.day) return false;
  if (!eveningOpen(prev, seat) || !eveningOpen(next, seat)) return false;
  return JSON.stringify(prev.players[seat]) === JSON.stringify(next.players[seat]);
}

/**
 * The morning's countdown stamp ('' for none). The table shows where the day is (PLAN-127: the strip of the day's
 * steps is gone); the stamp is kept for the countdown alone. PLAN-114: not on the first morning of a three-day game
 * (the Market Sprint): all three days are left, not the last.
 */
export function countdownStamp(s: GameState): string {
  if (s.phase !== 'morning') return '';
  const rem = s.config.days - s.day + 1;
  return rem === 1 ? 'LAST DAY' : rem === 3 && s.day > 1 ? 'LAST 3 DAYS' : '';
}

/** The day on which the bell last rang on this table, kept as each state is drawn: a Favoured Trade question always
 *  follows the bell (a saved game opened at the question has rung it too). */
export const bellDay = (rang: number, s: GameState): number => (s.phase === 'tie' ? s.day : rang);
