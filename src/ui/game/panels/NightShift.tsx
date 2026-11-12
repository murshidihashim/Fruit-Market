// Night falls (PLAN-085): the Wholesale Market's own lanes, on ink, lying exactly over the day's lanes, so the table
// stays where it is. Every piece slides one box along its lane; a piece leaving the last box tips off and fades. A
// Heatwave slides two boxes, a Monsoon none. Your own shelf plays the night where it lies, under the market
// (table.tsx MyStall): a chip whose pieces spoil tips off, the others take tomorrow's letter, and your Shade Cloth
// fruit stays put. The customer row and the stalls stay above, dimmed (table.css).
import type { GameState } from '../../../engine/game';
import { MarketLanes, laneRows } from '../../table';
import { nightSteps } from '../../tableModel';
import type { NightSlide } from '../animator';

/** `slide` comes from the night's own script (animator.tsx nightfall), so the panel and the slide share one clock
 *  (PLAN-081): null while dusk falls, the slide's length in ms while the pieces move, 'done' when they have arrived
 *  (also after a tap, which ends the slide at once). The panel has no timer of its own; its dusk reads the table's one
 *  speed from the stylesheet (--mk, motion.ts). */
export function NightShift({ s, viewer, slide = null }: { s: GameState; viewer: number; slide?: NightSlide }) {
  const steps = nightSteps(s);
  const sub = steps === 0 ? `No fruit ages tonight${s.event ? ` (${s.event.title})` : ''}.`
    : steps === 1 ? 'Every piece slides down one box.' : `Every piece slides down. ${s.event?.title ?? 'Tonight'}: ${steps} boxes tonight.`;
  return (
    <div class="mid-panel night-shift tk-night tb-night" data-a="night-shift" style={{ '--rows': laneRows(s), ...(typeof slide === 'number' ? { '--ns-ms': `${Math.round(slide)}ms` } : {}) }}>
      <div class="tk-label-row tb-mk-head">
        <b class="tk-label">Night falls</b>
        <span class="tk-side">{sub}</span>
      </div>
      <MarketLanes s={s} p={viewer} market={s.market} night={{ steps, go: slide !== null, rest: slide === 'done' }} />
    </div>
  );
}
