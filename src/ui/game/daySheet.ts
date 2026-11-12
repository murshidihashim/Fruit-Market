// Which step the day's sheet shows (PLAN-085). One sheet stays on the table from stocking to the day's takings:
// stocking, waiting for the rivals to open, pricing, sealed while the rivals price, and then, kept up as a plain sheet
// under their own panels, the bell, the Favoured Trade question and the takings. The rush card (panels/Showdown.tsx)
// lies over it between the bell and the takings.
// Pure, so tests can check it: above all that nothing secret of one person is drawn for another.
import type { Phase } from '../../engine/game';

export type DayStep = 'stock' | 'wait' | 'price' | 'sealed' | 'bell' | 'tie' | 'takings';

export interface DayNow {
  phase: Phase;
  /** The table is playing something (a rival's turn has just been shown, the bell, the rush). */
  busy: boolean;
  /** This stall is being asked to stock or to price now. */
  myTurn: boolean;
  /** This stall has opened today (offline: in the game; online: its crate has been sent). */
  opened: boolean;
  /**
   * The person holding this screen may see this stall's crate and prices: the only person at the table, a person at
   * their own screen online, or the person a shared phone was last handed to. False between two people on a shared
   * phone: the game has moved on to the next person, and the hand-over screen has not been tapped yet.
   */
  mine: boolean;
  /** The bell is ringing. */
  bell: boolean;
  /** The bell has rung on this table today. */
  rung: boolean;
  /** A customer's card is up in the rush. */
  rush: boolean;
  /** A customer's card has been up on this table today. */
  rushed: boolean;
  /** The rush has been played and the takings may be read. */
  done: boolean;
}

/** The step the sheet shows now, or null when the sheet is not on the table. */
export function dayStep(x: DayNow): DayStep | null {
  if (x.phase === 'stall') {
    if (!x.mine) return null;
    if (x.myTurn) return x.busy ? null : 'stock';
    return x.opened ? 'wait' : null;
  }
  if (x.phase === 'bid') {
    if (!x.mine) return null;
    // Every stall is open and this one prices next: its crate waits on the sheet until the table is still.
    if (x.myTurn) return x.busy ? 'wait' : 'price';
    return 'sealed';
  }
  // From the flip on, every crate and every price is public.
  if (x.phase === 'tie') return x.bell ? 'bell' : 'tie';
  if (x.phase === 'reveal') {
    if (x.done && !x.rush) return 'takings';
    if (x.bell) return 'bell';
    // Under a customer's card the open crates stay; once the last card has gone, the takings (the last coins may
    // still be counting). The takings never show before the rush has played.
    if (x.rush) return 'bell';
    if (x.rushed) return 'takings';
    // Before the bell (a frame or two, or "No sales today") the sealed prices stay; after it, the open crates (the
    // rush was skipped and is being settled).
    return x.rung ? 'bell' : x.mine ? 'sealed' : null;
  }
  return null;
}

/** The steps the sheet draws itself: stocking and pricing. In the others it lies plain under that step's own panel. */
export const ownStep = (step: DayStep): boolean => step === 'stock' || step === 'wait' || step === 'price' || step === 'sealed';
