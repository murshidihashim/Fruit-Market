// Which step of the day is on the table (PLAN-085; PLAN-099). Stocking is drawn on the day's sheet (panels/DaySheet.tsx).
// From the moment this stall has opened, the round table takes over (game/tableNow.ts, panels/RushTable.tsx): waiting
// for the rivals to open, pricing on a sheet at the table's foot, sealed while the rivals price, the bell, the Favoured
// Trade question and the rush. The day's sheet comes back for the takings.
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
  /** The bell is ringing: how many rows have turned face up (null: it is not ringing). */
  bell: number | null;
  /** The bell has rung on this table today. */
  rung: boolean;
  /** A customer's card is up in the rush. */
  rush: boolean;
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
    // Every stall is open and this one prices next: its crate waits at the round table until the table is still.
    if (x.myTurn) return x.busy ? 'wait' : 'price';
    return 'sealed';
  }
  // From the flip on, every crate and every price is public.
  if (x.phase === 'tie') return x.bell !== null ? 'bell' : 'tie';
  if (x.phase === 'reveal') {
    if (x.done && !x.rush) return 'takings';
    if (x.bell !== null) return 'bell';
    // The takings show when the rush is truly done (PLAN-090): not as the last card leaves, while the last coins
    // are still counting. Until then the open rows stay: under a customer's card, after the last one, while a card
    // just played travels to its tag, and while a skipped rush is settled. Before the bell (a frame or two, or "No
    // sales today") the sealed prices stay.
    if (x.rush) return 'bell';
    return x.rung ? 'bell' : x.mine ? 'sealed' : null;
  }
  return null;
}

/** How many steps closer stocking may be drawn when it would otherwise need a scroll (daysheet.css, data-tight). */
export const TIGHTEST = 3;

export interface SheetFit {
  /** The step to draw the sheet at: 0 as the approved screens draw it, up to TIGHTEST. */
  tight: number;
  /** The sheet also lies over your shelf. */
  over: boolean;
  /** The sheet also lies over the rows above it, up to the customers' tickets (the stalls row among them). */
  up: boolean;
}

/**
 * How to draw the sheet so that everything on it is in view. `needs[t]` is how tall its parts are at step t, measured
 * until one fits the room (so the list may be short); `room` is the height it has in the middle of the table; `drop`
 * is how much more it would have if it also lay over your shelf (0 where it already does, on a short phone).
 * It is drawn closer a step at a time, and no closer than it needs. Only when the closest step is still too tall does
 * it take the room over your shelf, and then at the roomiest step that fits there. If nothing fits it scrolls, at the
 * closest step, with its main button in view.
 */
export function fitSheet(needs: number[], room: number, drop: number, rise = 0): SheetFit {
  const fits = (r: number) => needs.findIndex((n) => n <= r + 1);
  const inCell = fits(room);
  if (inCell >= 0) return { tight: inCell, over: false, up: false };
  const last = Math.max(0, needs.length - 1);
  if (drop <= 0 && rise <= 0) return { tight: last, over: false, up: false };
  const over = drop > 0 ? fits(room + drop) : -1;
  if (over >= 0) return { tight: over, over: true, up: false };
  // Last of all (PLAN-090: a six-box shelf on a narrow, tall phone) it also lies over the stalls row, as it does on
  // a short phone, at the roomiest step that fits there.
  if (rise <= 0) return { tight: last, over: true, up: false };
  const all = fits(room + drop + rise);
  return { tight: all >= 0 ? all : last, over: drop > 0, up: true };
}

/** The step the sheet draws itself: stocking. Under the takings, their own panel, it lies plain. Every step between
 *  them (waiting for the rivals, pricing, the bell, the Favoured Trade question) is played at the round table
 *  (PLAN-099; game/tableNow.ts, panels/RushTable.tsx). */
export const ownStep = (step: DayStep): boolean => step === 'stock';

/** Is the day's sheet itself on the table at this step? Stocking and the takings. */
export const onSheet = (step: DayStep | null): boolean => step === 'stock' || step === 'takings';
