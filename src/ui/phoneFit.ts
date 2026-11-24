// A phone in "Desktop site" mode (Chrome's setting, and some in-app browsers) ignores the page's viewport and reports a
// computer-sized width, about 980 px, so the whole game is drawn small (the owner's screenshots, 2026-11-23 and 24).
// Zooming the page back up was tried and dropped: parts of the game measure the screen in ways a page zoom does not
// keep in step (the standing-order sheet's buttons fell off the screen). Instead Home says how to turn the mode off.

/** True for a touch screen held upright that is far taller than wide yet reports a computer-sized width. */
export function desktopModePhone(w: number, h: number, coarse: boolean): boolean {
  return coarse && w >= 600 && h >= w * 1.6;
}

/** The same check for this page now. */
export function inDesktopMode(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return desktopModePhone(window.innerWidth, window.innerHeight, coarse);
}

/** What Home says on such a phone. */
export const DESKTOP_MODE_NOTE = 'Your browser is showing the desktop site, so the game looks small. Open the browser menu and turn off Desktop site.';
