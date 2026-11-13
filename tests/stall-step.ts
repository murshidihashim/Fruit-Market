// Test helper (rules 18). A stall with no ripe fruit on its shelf takes no stocking or pricing turn, so a game whose
// shelves are all empty goes from buying straight to the rush. Tests that build a position by hand at the stocking
// step use this instead of ending each buying turn: it lends every empty shelf one ripe apple while buying ends, then
// takes the apples back, so every stall is still to open its stall and the test can set the shelves it needs.
import { FRUIT } from '../src/engine/data';
import { activePlayer, count, decideTie, endBuyTurn, endEvening, type GameState } from '../src/engine/game';

const LENT = FRUIT.apple.ripe.length - 1;

/** Ends every stall's buying turn and stops at the stocking step with every stall still to open. */
export function endBuying(state: GameState): GameState {
  let s = structuredClone(state);
  const lent = s.players.map((pl) => count(pl.stock, undefined, true) === 0);
  s.players.forEach((pl, i) => { if (lent[i]) pl.stock.apple[LENT] = 1; });
  while (s.phase === 'buy') s = endBuyTurn(s, activePlayer(s));
  s = structuredClone(s);
  s.players.forEach((pl, i) => { if (lent[i]) pl.stock.apple[LENT] = 0; });
  return s;
}

/**
 * Rules 18: a stall decides in the evening only when it has something to decide, so which stalls must close the evening
 * depends on the position. Rules 19: those stalls decide at the same time. This says Lights out for every stall still
 * deciding and returns the next morning (or the same state when the game is not in the evening). A position set to the
 * evening by hand (with no list of who is done) is read the rules 18 way: it starts with the stall at `turn`.
 */
export function passEvening(state: GameState): GameState {
  let s = state;
  const day = s.day;
  while (s.phase === 'evening' && s.day === day) s = endEvening(s, activePlayer(s));
  return s;
}

/** Rules 18: answers the tie step after the flip, if there is one. The stalls in `play` play Favoured Trade when they
 *  are asked; every other stall that is asked keeps its card. */
export function settleTies(state: GameState, play: number[] = []): GameState {
  let s = state;
  while (s.phase === 'tie') {
    const p = activePlayer(s);
    s = decideTie(s, p, play.includes(p));
  }
  return s;
}
