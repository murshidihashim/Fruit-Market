// The game that is waiting to be continued on this phone, and the question asked before another game replaces it
// (PLAN-081). Starting the Daily market, a Market League game or a new game saves over the waiting game, so the home
// screen asks first. Pure helpers, kept apart from the screens so they can be unit tested.
import type { GameState } from '../engine/game';

/** What the home screen says about the waiting game. */
export interface WaitingGame {
  /** Which kind of game is waiting (REP-133 A-13): "Daily market", "Sprint", "League stage 3", "Computer game" or
   *  "One phone game". */
  mode: string;
  day: number;
  /** The game's length in days. */
  days: number;
  stalls: number;
  /** Your cash when one person plays; null when friends share the phone. */
  cash: number | null;
}

/** The unfinished game that another game would replace, or null when nothing is waiting (no game, or it has ended). */
export function waitingGame(game: GameState | null): WaitingGame | null {
  if (!game || game.phase === 'over') return null;
  const humans = game.players.filter((pl) => pl.kind === 'human');
  return { mode: modeOf(game), day: game.day, days: game.config.days, stalls: game.players.length, cash: humans.length === 1 ? humans[0].cash : null };
}

/** The name of a game's mode, as the Play menu names it. */
export function modeOf(game: GameState): string {
  const c = game.config;
  if (c.sprint) return 'Sprint';
  if (c.daily) return 'Daily market';
  if (c.league !== undefined) return `League stage ${c.league + 1}`;
  return game.players.filter((pl) => pl.kind === 'human').length > 1 ? 'One phone game' : 'Computer game';
}

/**
 * Starts something that would replace the saved game: at once when no game is waiting, otherwise only after the
 * player has been asked (`ask` shows the question; its answer "Start anyway" then calls `go`).
 */
export function startOrAsk(waiting: WaitingGame | null, go: () => void, ask: (go: () => void) => void): void {
  if (waiting) ask(go);
  else go();
}
