// PLAN-116 (REP-133 B-04): keyboard focus stays inside a pop-up while it is open. Tab and Shift-Tab go round its own
// buttons and fields; focus moves onto the pop-up as it opens, so a screen reader reads its title (unless something
// in it has already taken focus, such as a code field), and goes back to what had it before when it closes. Only the
// pop-up opened last holds focus, so a pop-up opened over another one works as expected. Escape stays with each
// pop-up's own close.
import type { JSX, RefObject } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Where Tab (or Shift-Tab, `back`) goes from `at` among a pop-up's focusable items, in order: the next one, round
 * from the last to the first (and the other way); from outside the pop-up (`at` -1), its first or its last. Null when
 * the pop-up has nothing to focus (focus then stays on the pop-up itself).
 */
export function nextFocus(count: number, at: number, back: boolean): number | null {
  if (count <= 0) return null;
  if (at < 0 || at >= count) return back ? count - 1 : 0;
  return back ? (at - 1 + count) % count : (at + 1) % count;
}

/** The open pop-ups, the last opened last: only it keeps focus. */
const open: HTMLElement[] = [];

const shown = (el: HTMLElement) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
const items = (box: HTMLElement) => [...box.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.closest('[inert]') && shown(el));

/** Keeps keyboard focus inside `ref`'s element while the component is drawn (the element needs tabIndex={-1}).
 *  `onEscape`, when given, is what the Escape key does while this pop-up is the one on top. */
export function useFocusTrap(ref: RefObject<HTMLElement>, onEscape?: () => void) {
  const esc = useRef(onEscape);
  esc.current = onEscape;
  useEffect(() => {
    const box = ref.current;
    if (!box || typeof document === 'undefined') return;
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    open.push(box);
    if (!box.contains(document.activeElement)) box.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      if (open[open.length - 1] !== box) return;
      if (e.key === 'Escape' && esc.current) { e.preventDefault(); esc.current(); return; }
      if (e.key !== 'Tab') return;
      const list = items(box);
      const to = nextFocus(list.length, list.indexOf(document.activeElement as HTMLElement), e.shiftKey);
      e.preventDefault();
      (to === null ? box : list[to]).focus({ preventScroll: false });
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      const i = open.lastIndexOf(box);
      if (i >= 0) open.splice(i, 1);
      // Back to what had focus before, if it is still on the screen and nothing else has taken focus since.
      const now = document.activeElement;
      if (before && before.isConnected && (!now || now === document.body || box.contains(now))) before.focus({ preventScroll: true });
    };
  }, []);
}

/** A pop-up's box (a div) that keeps focus inside it while it is drawn. `onEscape`: the Escape key closes it. */
export function TrapBox({ onEscape, ...props }: Omit<JSX.HTMLAttributes<HTMLDivElement>, 'ref' | 'tabIndex'> & { onEscape?: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  useFocusTrap(box, onEscape);
  return <div {...props} tabIndex={-1} ref={box} />;
}
