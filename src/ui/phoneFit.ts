// A phone in "Desktop site" mode (Chrome's setting, and some in-app browsers) ignores the page's viewport and reports a
// computer-sized width, about 980 px. The game then drew its tablet and computer layout, shrunk to fit: tiny words and
// empty space above and below (the owner's screenshots, 2026-11-23 and 24). A touch screen held upright that is far
// taller than wide is a phone whatever width it reports, so the page is zoomed back to an ordinary phone width.
// Tablets (height under 1.6 times the width) and computers (no coarse pointer) are left alone.

/** The width a phone's page is laid out at. */
export const PHONE_WIDTH = 412;

/** The zoom that brings a phone in desktop mode back to PHONE_WIDTH; 1 when nothing needs fixing. */
export function phoneZoom(w: number, h: number, coarse: boolean): number {
  if (!coarse || w < 600 || h < w * 1.6) return 1;
  return Math.round((w / PHONE_WIDTH) * 100) / 100;
}

/** Applies phoneZoom to the page now and whenever the window changes size (turning the phone, for example). */
export function fitPhone(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const root = document.documentElement;
  const apply = () => {
    root.style.zoom = '';
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const z = phoneZoom(window.innerWidth, window.innerHeight, coarse);
    if (z !== 1) root.style.zoom = String(z);
  };
  apply();
  window.addEventListener('resize', apply);
}
