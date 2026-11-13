// The round table's own moves before the rush (flow A; PLAN-099), on the table's one clock (motion.ts). The table is
// drawn by panels/RushTable.tsx; these move what it has drawn, by position, size and fade only, and nothing waits for
// them: the beat itself is timed by the game's scripts (animator.tsx bellRings, tiePlayed). With reduced motion none of
// them moves anything: the end state is already drawn.
import * as A from '../anim';

/** A card turning over, by size and fade only: it grows from its middle line. */
const TURN: Keyframe[] = [{ transform: 'scaleY(0.05)', opacity: 0 }, { transform: 'none', opacity: 1 }];
/** The bell swinging: a short shake from side to side (position only). */
const SWING: Keyframe[] = [0, -4, 4, -3, 2, 0].map((x) => ({ transform: `translateX(${x}px)` }));

/**
 * The table forms as this stall opens: every crate travels from where it was to its seat (your crate from the stocking
 * sheet, `mine`; a rival's from its box in the stalls' row, which the table lies over). A crate with nowhere to come
 * from fades in with the table.
 */
export function tableForms(root: Element, viewer: number, mine: A.Box | null): void {
  if (A.isReduced()) return;
  for (const crate of root.querySelectorAll<HTMLElement>('.rt-crate')) {
    const p = Number(crate.dataset.a?.slice('rt-crate-'.length));
    const was = p === viewer ? mine : A.boxOf(document.querySelector(`.seats [data-a="p${p}"]`));
    if (was) A.flipFrom(crate, was, { duration: A.BEAT.table.form, easing: A.EASE.travel });
    else crate.animate([{ opacity: 0 }, { opacity: 1 }], { duration: A.ms(A.FEEL.sheetIn), easing: 'ease' });
  }
}

/** "Ring the bell": your price tags turn face down. */
export function tagsSealed(root: Element): void {
  if (A.isReduced()) return;
  root.querySelectorAll('.rt-crate.me .rt-tg.down').forEach((el) => el.animate(TURN, { duration: A.ms(A.BEAT.price.seal), easing: A.EASE.travel }));
}

/**
 * The bell: as it first shows it swings in the middle (`from` null); then seat by seat, clockwise from yours, a crate
 * opens: its word lifts off (rushTable.css), and its squares turn into its pieces and its price tags turn face up, a
 * lid's length later. Your own pieces are face up already: only your tags turn. `from`..`to`: the seats opening now.
 */
export function cratesOpen(root: Element, from: number | null, to: number): void {
  if (A.isReduced()) return;
  if (from === null) root.querySelector('.rt-bell-in')?.animate(SWING, { duration: A.ms(A.BEAT.bell.swing), easing: 'ease-in-out' });
  const crates = root.querySelectorAll('.rt-crate');
  for (let i = from ?? 0; i < to; i++) {
    const crate = crates[i];
    if (!crate) continue;
    const turning = crate.classList.contains('me') ? '.rt-tg' : '.rt-pc, .rt-tg, .rt-empty';
    crate.querySelectorAll(turning).forEach((el) => el.animate(TURN, { duration: A.ms(A.FEEL.turn), delay: A.moveMs(A.BEAT.bell.lid), fill: 'backwards', easing: A.EASE.travel }));
  }
}

/** The Favoured Trade question comes into the middle of the table. */
export function questionIn(root: Element): void {
  const q = root.querySelector('.rt-ask');
  if (q && !A.isReduced()) q.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: A.ms(A.FEEL.sheetIn), easing: A.EASE.sheet });
}
