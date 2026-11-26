// The next League trophy within reach, with where its stars come from: on the League screen and on Home's League card.
// Moved out of League.tsx (REP-140 A-08), so Home does not need the League screen's code.
import { CARDS, nextStep, stepValue } from './achievements';
import { LEAGUE, MASTERY_STAGES, stageByNo, starGoals } from './campaign';
import { leagueStage, myStars, snapshot } from './progress';

/** The next League trophy tier, with its progress and where its stars come from. */
export interface NextTrophy { title: string; got: number; goal: number; card: (typeof CARDS)[number]; where: string }

/** "stage 1, Village Square, and stage 7, Read the Rival": the stages a mastery trophy counts, by number and name. */
const stagesWords = (nos: readonly number[]): string => nos.map((n) => `stage ${n + 1}, ${LEAGUE[n]?.title ?? ''}`).join(', and ');

/** Where a League trophy's stars come from, in words (PLAN-123: the mastery trophies count two named stages only). */
export function trophyWhere(card: (typeof CARDS)[number]): string {
  const k = (Object.keys(MASTERY_STAGES) as (keyof typeof MASTERY_STAGES)[]).find((x) => card.id === `mastery_${x}`);
  return k ? `Counts the stars of ${stagesWords(MASTERY_STAGES[k])}.` : 'Counts every League star.';
}

/**
 * The next League trophy tier within reach, with its progress: of the League stars card and the three mastery cards
 * (all counted in stars), the tier still to earn. PLAN-123 (preview finding 8): a trophy the stage you are on can add
 * stars to comes first: the mastery trophy about this stage's skill, then the League stars trophy (every star counts);
 * a mastery trophy counts the stars of two named stages only, so "Contract Trader" no longer shows while you learn to
 * undercut Rosa. Then the one nearest to done. `at`: the stage you are on. Null when every tier is held.
 */
export function nextTrophy(at = leagueStage()): NextTrophy | null {
  const snap = snapshot();
  const have = myStars();
  const here = stageByNo(Math.min(at, LEAGUE.length - 1));
  const open = here ? starGoals(here).some((m) => !have.includes(m.id)) : false;
  const helps = (card: (typeof CARDS)[number]): number => {
    if (!open) return 0;
    const k = (Object.keys(MASTERY_STAGES) as (keyof typeof MASTERY_STAGES)[]).find((x) => card.id === `mastery_${x}`);
    return k ? (MASTERY_STAGES[k].includes(Math.min(at, LEAGUE.length - 1)) ? 2 : 0) : 1;
  };
  const cands = CARDS.filter((c) => c.group === 'league' && c.unit === 'stars').flatMap((card) => {
    const st = nextStep(card, snap);
    return st ? [{ card, title: card.title, got: Math.min(stepValue(card, st, snap), st.goal), goal: st.goal, where: trophyWhere(card), helps: helps(card) }] : [];
  });
  const best = cands.sort((a, b) => b.helps - a.helps || b.got / b.goal - a.got / a.goal || a.goal - b.goal)[0];
  return best ? { card: best.card, title: best.title, got: best.got, goal: best.goal, where: best.where } : null;
}
