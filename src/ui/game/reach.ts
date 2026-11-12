// How far a sheet reaches over the table (PLAN-084). The table's rows keep their places all day: the customers, the
// rivals, the lanes, your shelf. A sheet lies in the middle cell, where every middle panel lies, and reaches over the
// rows above and below it as the approved screens show: the morning's news over the rivals, the standing-order bid
// over the customers, the rivals and your shelf, the evening over everything under the top bar.
//
// Nothing is moved and no row is resized: the sheet stays a child of the middle cell and is drawn larger than the cell
// by a negative margin (sheets.css), measured here from the rows themselves. The measure is written on the sheet's own
// element (--rise, --drop), so the picture of the sheet that slides off when it leaves (sheet.ts) keeps the same reach.
import { useEffect, useLayoutEffect, type MutableRef } from 'preact/hooks';

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

/**
 * Put `ref` on a sheet (a middle panel with the class `fm-sheet`). After every draw, and whenever a row changes its
 * size, the reach is measured and written on the sheet. `down`: the sheet also lies over your shelf. `on`: false for
 * a copy of the panel that is not on the table (the morning's news opened full screen).
 */
export function useReach(ref: MutableRef<HTMLElement | null>, up: ReachUp, down: boolean, on = true): void {
  const fit = () => {
    const el = on ? ref.current : null;
    const game = el?.closest('.game');
    const boxes = game ? measure(game) : null;
    if (!el || !boxes) return;
    const r = reachFrom(boxes, up, down);
    el.style.setProperty('--rise', `${r.rise}px`);
    el.style.setProperty('--drop', `${r.drop}px`);
  };
  // Before the sheet is first painted, and after every draw (a row may have changed with the game).
  useLayoutEffect(fit);
  useEffect(() => {
    const game = on ? ref.current?.closest('.game') : null;
    if (!game || typeof ResizeObserver === 'undefined') return;
    const watch = new ResizeObserver(fit);
    watch.observe(game);
    game.querySelectorAll(':scope > .street-wrap, :scope > .seats, :scope > .my-stall, :scope > .tk-top, :scope > .centre > .market-stall').forEach((el) => watch.observe(el));
    return () => watch.disconnect();
  }, []);
}
