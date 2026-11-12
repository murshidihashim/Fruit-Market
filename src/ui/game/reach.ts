// How far a sheet reaches over the table (PLAN-084). The table's rows keep their places all day: the customers, the
// rivals, the lanes, your shelf. A sheet lies in the middle cell, where every middle panel lies, and reaches over the
// rows above and below it as the approved screens show: the morning's news over the rivals, the standing-order bid
// over the customers, the rivals and your shelf, the evening over everything under the top bar.
//
// Nothing is moved and no row is resized: the sheet stays a child of the middle cell and is drawn larger than the cell
// by a negative margin (sheets.css), measured here from the rows themselves. The measure is written on the sheet's own
// element (--rise, --drop), so the picture of the sheet that slides off when it leaves (sheet.ts) keeps the same reach.
import { useLayoutEffect, useRef, type MutableRef } from 'preact/hooks';
import { FEEL, FRAME, moveMs } from '../motion';

/** Where a sheet's top edge lies: under the customers' tickets ('row', over tomorrow's strip, the order strip and the
 *  rivals), at the top of the customer band ('street'), or over the day's five beats too ('beats'). */
export type ReachUp = 'row' | 'street' | 'beats';

/** The kraft band's own padding under the tickets, in px (ticket.css, the street's padding): it stays in view. */
const BAND_PAD = 6;

export interface Reach { rise: number; drop: number }

/** The boxes the measure needs (page elements; plain numbers in tests). `top` and `bottom` are screen positions in px. */
export interface ReachBoxes {
  /** The middle cell (the Wholesale Market fills it). */
  mid: { top: number; bottom: number };
  /** The row of customer tickets, the whole customer band, the day's beats, your shelf: null when not on the screen. */
  row: { bottom: number } | null;
  street: { top: number } | null;
  beats: { top: number } | null;
  dock: { bottom: number } | null;
  /** A notice lies between the top bar and the customers (online: someone is reconnecting). It must stay in view. */
  notice: boolean;
}

/**
 * The rule: how far above the middle cell the sheet starts and how far below it ends, in px (never negative).
 * A sheet that would reach over the beats stops at the customer band while a notice is up, so the notice stays in view.
 */
export function reachFrom(b: ReachBoxes, up: ReachUp, down: boolean): Reach {
  const top = up === 'row' ? (b.row ? b.row.bottom + BAND_PAD : null)
    : up === 'beats' && !b.notice && b.beats ? b.beats.top
    : b.street ? b.street.top : null;
  return {
    rise: Math.max(0, Math.round(b.mid.top - (top ?? b.mid.top))),
    drop: Math.max(0, Math.round((down && b.dock ? b.dock.bottom : b.mid.bottom) - b.mid.bottom)),
  };
}

function measure(game: Element): ReachBoxes | null {
  // The lanes fill the middle cell and are never moved or animated, so their box is the cell's.
  const mid = game.querySelector(':scope > .centre > .market-stall')?.getBoundingClientRect();
  if (!mid || mid.width === 0) return null;
  const box = (sel: string) => {
    const el = game.querySelector(sel);
    return el && el.getClientRects().length ? el.getBoundingClientRect() : null;
  };
  return {
    mid, row: box(':scope > .street-wrap > .street'), street: box(':scope > .street-wrap'), beats: box(':scope > .tk-top .tk-beats'),
    dock: box(':scope > .my-stall'), notice: !!box(':scope > .net'),
  };
}

/** The reach last measured for each kind of sheet. */
const known = new Map<string, Reach>();

/** The rows a sheet's reach is measured from. When any of them changes its size the middle cell does too. */
const ROWS = ':scope > .street-wrap, :scope > .seats, :scope > .my-stall, :scope > .tk-top, :scope > .centre > .market-stall';

/**
 * Put `ref` on a sheet (a middle panel with the class `fm-sheet`). The reach is measured and written on the sheet
 * before the sheet is first painted, and again whenever a row changes its size. `down`: the sheet also lies over your
 * shelf. `on`: false for a copy of the panel that is not on the table (the morning's news opened full screen).
 * `fitted` is called each time the reach has been written (the morning draws itself closer there).
 *
 * The page itself says when the rows have been laid out (a ResizeObserver, whose first word comes in the same frame
 * the sheet appears in, before it is painted). The rows are never measured in the middle of a draw: that makes the
 * browser lay the whole table out there and then, and on a slow phone it made the morning one long pause.
 */
export function useReach(ref: MutableRef<HTMLElement | null>, up: ReachUp, down: boolean, on = true, fitted?: (el: HTMLElement) => void): void {
  const then = useRef(fitted);
  then.current = fitted;
  useLayoutEffect(() => {
    const el = on ? ref.current : null;
    const game = el?.closest('.game');
    if (!el || !game) return;
    const write = (r: Reach) => {
      el.style.setProperty('--rise', `${r.rise}px`);
      el.style.setProperty('--drop', `${r.drop}px`);
    };
    // The rows keep their places all game, so a sheet starts with the reach the last sheet of its kind had: it is
    // then laid out once, not twice. The measure that follows in the same frame puts it right if the table changed
    // (another game, a turned phone). Nothing is asked of the page here: even the window's size would be a layout.
    const kind = `${up}:${down}`;
    const was = known.get(kind);
    if (was) write(was);
    const fit = () => {
      const boxes = measure(game);
      if (!boxes) return;
      const r = reachFrom(boxes, up, down);
      write(r);
      known.set(kind, r);
      then.current?.(el);
    };
    const watch = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit);
    if (!watch) fit();
    else {
      watch.observe(game);
      game.querySelectorAll(ROWS).forEach((row) => watch.observe(row));
    }
    // As the sheet leaves: its picture slides off above the rows it lay over (see liftOff).
    return () => { watch?.disconnect(); liftOff(game); };
  }, []);
}

const lifting = new WeakMap<Element, number>();
/**
 * A sheet has left the table. The picture of it that slides off (sheet.ts) lies in the place kept for such pictures,
 * which is under the rivals and your shelf: for the length of the slide that place is marked (sheets.css raises it),
 * so the rows the sheet lay over come back into view as it fades and do not cut across it.
 */
function liftOff(game: Element): void {
  const host = game.querySelector(':scope > .centre > .tk-sheet');
  if (!host) return;
  window.clearTimeout(lifting.get(host));
  host.setAttribute('data-over', '');
  lifting.set(host, window.setTimeout(() => host.removeAttribute('data-over'), moveMs(FEEL.sheetOut) + 2 * FRAME));
}
