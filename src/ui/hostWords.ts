// PLAN-132: what Rosa, the host on Home's Market tab, says. Chat and tips only: the facts of a mode (its days, its
// stalls, what counts) are on its card, once. Pure, so it can be unit tested.
import type { HomeMode } from './modes';

/** What she speaks about: her welcome (until a mode is chosen or she is tapped), then the mode showing. */
export type HostKey = 'hello' | HomeMode;

/** What her lines are built from: the League stage in front of the player and the day's first customers. */
export interface HostFacts {
  /** The League stage to play ("Village Square"), or null once every stage is cleared. */
  stage: string | null;
  /** That stage's first rival ("Rosa", "Uncle Benny"). */
  rival: string | null;
  /** The Daily market's first customer today ("Coral Mei"), or null when the day opens with an event. */
  dailyFirst: string | null;
  /** The Sprint's first customer today. */
  sprintFirst: string | null;
}

export const HOST_NAME = 'Rosa';
export const HOST_HINT = `Tap ${HOST_NAME} for more`;

/** Her lines for a subject, in the order a tap walks through them (then round again). */
export function hostLines(key: HostKey, f: HostFacts): string[] {
  if (key === 'hello') return ['Welcome to my market! Pick a game. I\'ll keep the fruit fresh.'];
  if (key === 'custom') return ['Bring your friends. I like a crowd at the stalls.', 'New here? The computer makes a kind first rival.'];
  if (key === 'league') {
    const first = !f.stage ? 'Every stage cleared! Play one again for its stars.'
      : f.rival === HOST_NAME ? `Careful at ${f.stage}. That stall is mine!`
        : f.rival ? `Careful at ${f.stage}. ${f.rival} is waiting.` : `Careful at ${f.stage}.`;
    return [first, 'Every rival has a habit. Spot it and you\'ve won.'];
  }
  if (key === 'daily') return [f.dailyFirst ? `${f.dailyFirst} is first in line today.` : 'Today\'s market is ready when you are.', 'Everyone gets the same lorry today. No excuses!'];
  return [f.sprintFirst ? `${f.sprintFirst} is up early for the Sprint.` : 'The Sprint is ready when you are.', 'Quick hands, quick sales. Off you go!'];
}
