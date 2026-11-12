// The rows of the table under a sheet (PLAN-090, PLAN-091). What a sheet lies over cannot be seen or tapped, so it is
// put out of reach of the keyboard and of screen readers too: the Wholesale Market whenever a sheet is in the middle
// of the table, and the customers' tickets, tomorrow's strip, the standing order's strip, the stalls row and your
// shelf when a sheet's box covers them. Which rows that is depends on the phone (on a 360 by 640 phone the sheet
// covers more) and on the step, so it is measured each time, from where things are laid out: a sheet sliding in or
// off is measured where it comes to rest. A row a sheet covers only in part can still be seen and tapped, so it is
// left as it is. Nothing a person can see or tap changes.

/** A box on the page. */
export interface Box { top: number; bottom: number; left: number; right: number }

/** Where an element is laid out on the page, leaving out any move it is making (offsets ignore transforms). */
export function laidOut(el: HTMLElement): Box {
  let top = 0, left = 0;
  for (let e: HTMLElement | null = el; e; e = e.offsetParent instanceof HTMLElement ? e.offsetParent : null) {
    top += e.offsetTop;
    left += e.offsetLeft;
  }
  return { top, left, bottom: top + el.offsetHeight, right: left + el.offsetWidth };
}

/** Does `over` cover all of `row` (to the pixel)? */
export const covers = (over: Box, row: Box): boolean =>
  over.top <= row.top + 1 && over.bottom >= row.bottom - 1 && over.left <= row.left + 1 && over.right >= row.right - 1;

/** The table's rows, outside the middle: the street's strips one by one, the stalls row and your shelf. */
const ROWS = ':scope > .street-wrap > *, :scope > .seats, :scope > .my-stall';
/** What lies in the middle of the table besides a sheet: the market itself, the picture of a panel sliding off, and
 *  a step's own buttons in the bottom bar's place. */
const NOT_A_SHEET = '.market-stall, .tk-sheet, .pp-lock';

/**
 * Marks the rows a sheet covers as inert, and lets the others go. `sheet`: a sheet is in the middle of the table (the
 * market under it is inert then). The rush's own sheet, over the table from the customers down, counts too.
 */
export function markCovered(game: HTMLElement, centre: HTMLElement, sheet: boolean): void {
  centre.querySelector(':scope > .market-stall')?.toggleAttribute('inert', sheet);
  const sheets = [
    ...(sheet ? [...centre.children].filter((el): el is HTMLElement => el instanceof HTMLElement && !el.matches(NOT_A_SHEET)) : []),
    ...game.querySelectorAll<HTMLElement>(':scope > .rush-sheet:not(.leaving)'),
  ].filter((el) => el.offsetHeight > 0).map(laidOut);
  for (const row of game.querySelectorAll<HTMLElement>(ROWS)) {
    const b = laidOut(row);
    row.toggleAttribute('inert', b.bottom > b.top && sheets.some((s) => covers(s, b)));
  }
}

/**
 * Keeps the marks right for one game table: `update` marks the rows after each drawing, and the marks are measured
 * again whenever a sheet or a row changes its size between drawings (a sheet fits itself to the room the rows leave
 * it, game/reach.ts, after it is drawn). A drawing that changed none of what lies in the middle (the same elements,
 * a sheet up or not, the rush's sheet coming or leaving) measures nothing: the table draws often while things move,
 * and a size that changes is seen by the watch. `stop` when the table goes.
 */
export function coverWatch(): { update: (game: HTMLElement, centre: HTMLElement, sheet: boolean) => void; stop: () => void } {
  let at: { game: HTMLElement; centre: HTMLElement; sheet: boolean } | null = null;
  let was: unknown[] = [];
  const watched = new Set<Element>();
  const mark = () => { if (at) markCovered(at.game, at.centre, at.sheet); };
  const watch = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(mark);
  return {
    update(game, centre, sheet) {
      const rush = game.querySelector(':scope > .rush-sheet');
      const now: unknown[] = [game, centre, sheet, rush, rush?.classList.contains('leaving'), ...centre.children];
      if (watch && now.length === was.length && now.every((x, i) => x === was[i])) return;
      was = now;
      at = { game, centre, sheet };
      mark();
      if (!watch) return;
      for (const el of watched) if (!el.isConnected) { watch.unobserve(el); watched.delete(el); }
      for (const el of [...centre.children, ...game.querySelectorAll(`:scope > .rush-sheet, ${ROWS}`)]) {
        if (watched.has(el)) continue;
        watched.add(el);
        watch.observe(el);
      }
    },
    stop() { watch?.disconnect(); watched.clear(); at = null; },
  };
}
