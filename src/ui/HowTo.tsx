// How to play (PLAN-129): seven pages, one screen each. REP-140 A-08: the pages are loaded on demand (onDemand.tsx), so
// this is only the way in; the page itself is HowToBook.tsx. Its styles stay with the main script, in the same place
// among the others.
import { onDemand } from './onDemand';
import './howto.css';

export const howTo = onDemand(() => import('./HowToBook').then((m) => m.HowTo));

/** How to play: Home's Rules tab (`inTab`) and the game menu's How to play. */
export const HowTo = howTo.Screen;
