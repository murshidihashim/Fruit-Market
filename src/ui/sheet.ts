// The sheet (flow study, review-18, D2): the panel in the middle of the table slides onto the table and off again.
// One rule for every middle panel (the morning's news, stocking, pricing, the bell, the takings, the evening, the bid):
// whichever panel is a child of .centre is "the sheet". It comes in over 180 ms and goes off over 120 ms, at the
// table's one speed; with reduced motion it is simply shown and taken away.
//
// The table underneath never moves: the panel lies over the lanes in the same grid cell, and only its position and
// fade are animated. Nothing waits for a slide. The game takes the old panel off the screen at once, as before; what
// slides off is a picture of it, kept for a moment where no tap, no script and no screen reader can reach it (a closed
// shadow tree, so nothing on the page can find a button in it). A timer, not an animation event, takes it away.
import { useEffect, useLayoutEffect, useRef, type MutableRef } from 'preact/hooks';
import { EASE, FEEL, FRAME, isReduced, moveMs } from './motion';

/** The middle panels: every one of them carries one of these classes (ticket.css lays them out together). */
export const SHEET = '.mid-panel, .morning-card, .sales-card';
/** Panels with a beat of their own (the night: dusk falls, and the panel is drawn afresh as the day changes). The
 *  sheet leaves them alone: they do not slide in by this rule and no picture of them is kept. */
const OWN_BEAT = '.tk-night';
/** The table's own class while the night is shown (Game.tsx): the rows above the middle are put away then. */
const NIGHT = /\bis-night\b/;

/** A sheet comes onto the table from a little below its place, fading in; it leaves the same way, more quickly. */
export const SHEET_IN: Keyframe[] = [{ opacity: 0, transform: 'translateY(28px)' }, { opacity: 1, transform: 'none' }];
export const SHEET_OUT: Keyframe[] = [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(20px)' }];

/** What the rule needs of a panel (a page element; a stand-in in tests). */
export interface SheetPanel {
  className: string;
  animate(frames: Keyframe[], o: KeyframeAnimationOptions): unknown;
  matches(selector: string): boolean;
}
/** Where the picture of a panel that has left is kept, and slid off from. */
export interface SheetGhost<P> {
  /** Shows the panel that has just left as a picture, in place of any earlier one. False when it cannot be shown. */
  keep(panel: P): boolean;
  /** Slides the picture off the table over `ms`. */
  leave(ms: number): void;
  /** Stops a slide off, so the picture lies still again. Returns the panel pictured, or null when there is none. */
  stay(): P | null;
  /** Takes the picture away. */
  clear(): void;
}

/**
 * The rule, for one change of the middle panel: `was` has just left the screen (or null), `now` is on it (or null).
 * Returns how long to keep the old panel's picture, in ms (0: there is none). It touches the page only through its
 * arguments, so tests can run it.
 *  - a new panel slides in;
 *  - an old panel's picture slides off when nothing takes its place;
 *  - when one panel takes another's place (at once, or a moment later while the old picture is still sliding off),
 *    the old picture lies still underneath until the new one has arrived, so the lanes never flash between them;
 *  - the same panel coming back after a moment away (the table was busy for a frame or two) is simply there again.
 */
export function sheetChange<P extends SheetPanel>(was: P | null, now: P | null, ghost: SheetGhost<P> | null): number {
  if (isReduced()) { ghost?.clear(); return 0; }
  const into = moveMs(FEEL.sheetIn);
  const off = moveMs(FEEL.sheetOut);
  // The picture under the table: of the panel that has just left, or of one still sliding off from a moment ago.
  const mine = was && !was.matches(OWN_BEAT) ? was : null;
  if (was && !mine) ghost?.clear();
  const old = !ghost ? null : mine ? (ghost.keep(mine) ? mine : null) : was ? null : ghost.stay();
  if (!now) {
    if (!ghost || !old || !mine) { ghost?.clear(); return 0; }
    ghost.leave(off);
    // One frame more than the slide, so its last frame is drawn before the picture is taken away.
    return off + FRAME;
  }
  if (!(old && old.className === now.className) && !now.matches(OWN_BEAT)) now.animate(SHEET_IN, { duration: Math.max(1, into), easing: EASE.sheet });
  return old ? into + FRAME : 0;
}

/** The middle panel on the table now: the child of .centre that is one, if any. Reads no layout. */
export function sheetOn(centre: Element | null): HTMLElement | null {
  const kids = centre?.children;
  for (let i = 0; kids && i < kids.length; i++) if (kids[i].matches(SHEET)) return kids[i] as HTMLElement;
  return null;
}

/**
 * The holder of the picture: a closed shadow tree inside the sheet's own element (a child of .centre, in the same
 * grid cell as the panels). It carries a copy of the page's stylesheets and the same chain of parents (#app, the
 * table, .centre), so the panel that is moved into it looks exactly as it did; its animations are stopped. `look`
 * gives the table's classes as they were while the panel was up, and `scrolled` how far the panel had been scrolled.
 */
function holder(host: HTMLElement, look: () => string, scrolled: () => number): SheetGhost<HTMLElement> | null {
  // The shadow tree hangs on an element made here, not on the one the screen drew: a fresh one each time, so a
  // holder made twice for the same table (the code reloaded while a game is open, in development) starts clean.
  const frame = document.createElement('div');
  if (typeof frame.attachShadow !== 'function') return null;
  frame.className = 'tk-sheet-in';
  host.replaceChildren(frame);
  const root = frame.attachShadow({ mode: 'closed' });
  host.setAttribute('inert', '');
  const copies: Node[] = [];
  document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach((s) => copies.push(root.appendChild(s.cloneNode(true))));
  // A linked stylesheet is fetched again for the copy (from the browser's own store). Until every copy has its rules
  // no picture is shown: an unstyled panel must never flash on the table.
  const styled = () => copies.every((c) => !(c instanceof HTMLLinkElement) || !!c.sheet);
  const still = document.createElement('style');
  still.textContent = '* { animation: none !important; transition: none !important; }';
  root.appendChild(still);
  const wrap = (id: string, cls: string, into: Node) => {
    const el = document.createElement('div');
    if (id) el.id = id;
    el.className = cls;
    el.style.display = 'contents';
    into.appendChild(el);
    return el;
  };
  const table = wrap('', '', wrap('app', document.getElementById('app')?.className ?? '', root));
  const cell = wrap('', 'centre', table);
  let sliding: Animation | null = null;
  let held: HTMLElement | null = null;
  const stop = () => { sliding?.cancel(); sliding = null; };
  const clear = () => { stop(); held = null; cell.replaceChildren(); };
  return {
    keep(panel) {
      if (!styled()) { clear(); return false; }
      stop();
      held = panel;
      // A slide that was still playing on the panel (its own way in, a landing) is over: the picture is of it at rest.
      panel.getAnimations({ subtree: true }).forEach((a) => a.cancel());
      table.className = look();
      cell.replaceChildren(panel);
      const top = scrolled();
      if (top > 0) panel.scrollTop = top;
      return true;
    },
    leave(ms) { stop(); sliding = host.animate(SHEET_OUT, { duration: Math.max(1, ms), easing: EASE.leave, fill: 'forwards' }); },
    stay() { stop(); return held; },
    clear,
  };
}

interface Now { panel: HTMLElement | null; look: string; scroll: number; host: HTMLElement | null; ghost: SheetGhost<HTMLElement> | null; timer: number; warm: number }
/** The picture's holder is made a moment after the table opens, not in the same breath (it copies the stylesheets). */
const WARM_MS = 400;

/**
 * The game table's hook. Put `centre` on the .centre element and `host` on an empty <div class="tk-sheet"> inside it.
 * After every draw it looks at which panel is in the middle (no layout is read) and applies the rule above.
 */
export function useSheet(): { centre: MutableRef<HTMLDivElement | null>; host: MutableRef<HTMLDivElement | null> } {
  const centre = useRef<HTMLDivElement | null>(null);
  const host = useRef<HTMLDivElement | null>(null);
  const st = useRef<Now>({ panel: null, look: '', scroll: 0, host: null, ghost: null, timer: 0, warm: 0 });
  useLayoutEffect(() => {
    const s = st.current;
    const now = sheetOn(centre.current);
    if (host.current !== s.host) {
      // A new table (the first draw, or back from the hand-over screen): a new place for the picture. Until it is
      // ready a panel that leaves is simply gone, as it always was.
      const el = host.current;
      s.host = el;
      s.ghost = null;
      window.clearTimeout(s.warm);
      if (el) s.warm = window.setTimeout(() => { if (s.host === el && el.isConnected) s.ghost = holder(el, () => s.look, () => s.scroll); }, WARM_MS);
    }
    const look = centre.current?.parentElement?.className ?? '';
    if (now !== s.panel) {
      window.clearTimeout(s.timer);
      const was = s.panel && !s.panel.isConnected ? s.panel : null;
      // Into the night and out of it the table itself changes (the customer row and the rivals go and come back), so
      // the middle is not where it was: no picture of the old panel is kept across that.
      const moved = NIGHT.test(s.look) !== NIGHT.test(look);
      if (moved) s.ghost?.clear();
      const keep = sheetChange(was, now, moved ? null : s.ghost);
      if (keep > 0) s.timer = window.setTimeout(() => s.ghost?.clear(), keep);
      s.panel = now;
      s.scroll = 0;
    }
    // The table's classes while this panel is up: the picture is drawn under them when the panel leaves.
    s.look = look;
  });
  useEffect(() => {
    const s = st.current;
    // How far the panel has been scrolled, noted as it happens (a panel that has left can no longer be asked).
    const onScroll = (e: Event) => { if (e.target === s.panel && s.panel) s.scroll = s.panel.scrollTop; };
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true });
      window.clearTimeout(s.timer);
      window.clearTimeout(s.warm);
      s.ghost?.clear();
    };
  }, []);
  return { centre, host };
}
