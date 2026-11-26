// REP-140 B-15: the switches the Settings screen and the in-game menu share, in the same words on both.

/** PLAN-123: "Fast" speeds up every move on the table and the computers' turns (motion.ts setBaseSpeed). */
export const FAST_PLAY = { title: 'Fast play', text: 'Moves and computer turns go quicker.' };

/** Is reduced motion on in the phone's own settings? Then the game's switch shows on (the phone's setting wins). */
export const phoneStill = (): boolean => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** PLAN-123: the game's own Reduced motion switch, beside the phone's setting. */
export const REDUCED_MOTION = {
  title: 'Reduced motion',
  text: (phone: boolean): string => (phone ? 'On in your phone\'s settings: nothing slides across the table.' : 'Nothing slides across the table: each change shows at once.'),
};
