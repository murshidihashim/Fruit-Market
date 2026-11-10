// While prices are set (PLAN-064) the phone table swaps two rows: the rival stalls move up to the top and today's
// customers move down, next to your crates and the price bubbles. The grid swap itself is instant (styles.css,
// .gx.swap-rows), so this slides each row from where it was to where it lands ("FLIP": first, last, invert, play),
// and back again when pricing ends. On a wide screen the two sit in side columns and nothing moves.
import { useLayoutEffect, useRef } from 'preact/hooks';

const ROWS = ['.gx > .street-wrap', '.gx > .seats'];
const SLIDE_MS = 700;

export function useRowSwap(swapped: boolean): void {
  const last = useRef<Map<string, number>>(new Map());
  const was = useRef(swapped);
  // Runs after every render: remembers where each row sits, and when the swap has just changed, slides it there.
  useLayoutEffect(() => {
    const changed = was.current !== swapped;
    was.current = swapped;
    const still = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const sel of ROWS) {
      const el = document.querySelector<HTMLElement>(sel);
      if (!el) continue;
      const top = el.getBoundingClientRect().top;
      const before = last.current.get(sel);
      last.current.set(sel, top);
      if (!changed || still || before === undefined || Math.abs(before - top) < 2 || !el.animate) continue;
      el.animate([{ transform: `translateY(${before - top}px)` }, { transform: 'none' }], { duration: SLIDE_MS, easing: 'cubic-bezier(.45,0,.25,1)' });
    }
  });
}
