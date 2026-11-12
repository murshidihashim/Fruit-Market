// Pure turn rules used by the game screen, kept apart from Preact so they can be unit tested.
import { activePlayer, applyAction, type Action, type GameState } from '../../engine/game';

/** Applies one local move. In a daily challenge the move is also logged, so the leaderboard can replay it. */
export function playLocal(before: GameState, who: number, a: Action): GameState {
  const next = applyAction(before, who, a);
  if (before.config.daily && a.kind !== 'begin' && a.kind !== 'finish') next.moves = [...(before.moves ?? []), a];
  return next;
}

/**
 * The state undo goes back to: where the current person's buying turn began.
 * Kept while the same person is still buying on the same day; reset otherwise.
 */
export function undoPoint(start: GameState | null, s: GameState, humanTurn: boolean): GameState | null {
  if (s.phase !== 'buy' || !humanTurn) return null;
  const active = activePlayer(s);
  if (start && activePlayer(start) === active && start.phase === 'buy' && start.day === s.day) return start;
  return s;
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
  return activePlayer(s) === seat;
}
