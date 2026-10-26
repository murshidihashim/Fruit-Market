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
