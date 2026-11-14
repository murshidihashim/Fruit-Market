// What tonight does to one box of a stall's own shelf, in a few words (PLAN-085: the Stocking rows say "spoils
// tonight" and "ripe tomorrow"). Read from the night's own steps, as the night panel draws them. Pure.
import { stageAt, type FruitId, type Stage } from '../../engine/data';
import { nightOutlook, shadePick, type GameState } from '../../engine/game';

/** Boxes a piece of this fruit slides down on this stall's shelf tonight: none after the last day, and none for the
 *  Shade Cloth fruit; one more in a Heatwave, none in a Monsoon (the night's own rule, as the night panel draws it). */
export function nightSteps(s: GameState, p: number, f: FruitId): number {
  if (s.phase === 'over' || s.day >= s.config.days) return 0;
  const pl = s.players[p];
  const shade = pl.trait === 'keeper' ? (pl.shade === undefined ? shadePick(s, p) : pl.shade) : null;
  return shade === f ? 0 : Math.max(0, 1 + (s.event?.ageExtra ?? 0));
}

/** What tonight does to the pieces in one box of the shelf, in a few words. `bad`: they are lost. */
export function tonightWord(s: GameState, p: number, f: FruitId, pos: number): { text: string; bad: boolean } {
  const steps = nightSteps(s, p, f);
  const now = stageAt(f, pos);
  if (steps === 0) return { text: now === 'unripe' ? 'still green' : 'won\'t age tonight', bad: false };
  const to = pos - steps;
  if (to < 0) {
    // A Juice Bar turns up to its limit of leaving pieces into juice; only when none spoil is a box sure to be juice.
    const night = nightOutlook(s, p);
    return night.spoil === 0 && night.juice > 0 ? { text: 'juice tonight', bad: false } : { text: 'spoils tonight', bad: true };
  }
  const next = stageAt(f, to);
  if (now === 'unripe') return next === 'unripe' ? { text: 'still green tomorrow', bad: false } : { text: 'ripe tomorrow', bad: false };
  const word: Record<Stage, string> = { unripe: 'green', fresh: 'Fresh', okay: 'Okay', notso: 'Soft' };
  return { text: next === now ? `still ${word[now]} tomorrow` : `${word[next]} tomorrow`, bad: false };
}
