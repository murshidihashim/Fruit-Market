// Pure turn rules used by the game screen, kept apart from Preact so they can be unit tested.
import type { FavourId } from '../../engine/data';
import { activePlayer, applyAction, eveningOpen, type Action, type GameState } from '../../engine/game';

/** Applies one local move. In a daily challenge the move is also logged, so the leaderboard can replay it. */
export function playLocal(before: GameState, who: number, a: Action): GameState {
  const next = applyAction(before, who, a);
  if (before.config.daily && a.kind !== 'begin' && a.kind !== 'finish') next.moves = [...(before.moves ?? []), a];
  return next;
}

/** Where Undo goes back to on a buying turn. */
export interface UndoPoint {
  /** The state Undo puts back. */
  at: GameState;
  /** S3 (DEC-120): the favour card played just before `at`. A favour card once played stays played (Scout, Fridge, Free
   *  Fruit), so Undo goes back to just after it, and what was bought before it stays too. */
  after?: FavourId;
}

/**
 * The point undo goes back to: where the current person's buying turn began, or just after the last favour card they
 * played on it. Kept while the same person is still buying on the same day; reset otherwise.
 */
export function undoPoint(start: UndoPoint | null, s: GameState, humanTurn: boolean): UndoPoint | null {
  if (s.phase !== 'buy' || !humanTurn) return null;
  const active = activePlayer(s);
  if (!start || activePlayer(start.at) !== active || start.at.phase !== 'buy' || start.at.day !== s.day) return { at: s };
  const card = playedSince(start.at, s, active);
  return card ? { at: s, after: card } : start;
}

/** The favour card stall `p` has played between two states of its buying turn (its hand only shrinks then), or null. */
function playedSince(was: GameState, now: GameState, p: number): FavourId | null {
  const left = [...(now.players[p]?.favours ?? [])];
  for (const id of was.players[p]?.favours ?? []) {
    const k = left.indexOf(id);
    if (k < 0) return id;
    left.splice(k, 1);
  }
  return null;
}

/**
 * Has stall `p` anything for Undo to take back? Offline the phone holds the point. Online the room holds it
 * (server/room.ts) and this phone knows it from what it has seen of the turn: the purchases made since the turn began,
 * or since the favour card it saw played (a phone that reopened mid-turn knows no card, and the room decides).
 */
export function canUndo(point: UndoPoint | null, s: GameState, p: number, online: boolean): boolean {
  if (s.phase !== 'buy' || !s.players[p]) return false;
  if (!online) return !!point && point.at !== s;
  const bought = s.players[p].boughtToday;
  return point?.after ? bought > point.at.players[p].boughtToday : bought > 0;
}

/**
 * Is the table waiting for the person at this screen? A hurry asked for with a tap lasts until then (PLAN-081), so one
 * tap carries through every rival's turn. The morning's news, the day's takings and the results each end on a button of
 * the person's own. `seat` is their seat online; offline (null) any person at the phone counts, since it is handed over.
 */
export function waitsForPerson(s: GameState, seat: number | null): boolean {
  if (s.phase === 'morning' || s.phase === 'reveal' || s.phase === 'over') return true;
  if (seat === null) {
    const a = activePlayer(s);
    return a >= 0 && s.players[a].kind === 'human';
  }
  // Online, secret steps are taken by everyone at once: the person is waited for until their own entry is in the game.
  if (s.phase === 'stall') return s.stalls[seat] === null;
  if (s.phase === 'bid') return s.bids[seat] === null;
  if (s.phase === 'order') return s.standing?.bids[seat] === null;
  // Rules 19: the evening likewise, until this person has said Lights out.
  if (s.phase === 'evening') return eveningOpen(s, seat);
  return activePlayer(s) === seat;
}
