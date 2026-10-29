// Full-screen play: the browser's Fullscreen API where it exists (Android Chrome, desktop browsers, iPad).
// iPhone Safari has no full-screen mode for web pages; there the way is "Add to Home Screen".
type FsDoc = Document & { webkitFullscreenEnabled?: boolean; webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

const doc = (): FsDoc | null => (typeof document === 'undefined' ? null : (document as FsDoc));

export function fullscreenSupported(): boolean {
  const d = doc();
  return !!d && !!(d.fullscreenEnabled || d.webkitFullscreenEnabled);
}

export function isFullscreen(): boolean {
  const d = doc();
  return !!d && !!(d.fullscreenElement || d.webkitFullscreenElement);
}

/** Enter or leave full screen. Must be called from a tap. Never throws: a refusal just leaves the page as it is. */
export async function toggleFullscreen(): Promise<void> {
  const d = doc();
  if (!d) return;
  try {
    if (isFullscreen()) {
      if (d.exitFullscreen) await d.exitFullscreen();
      else await d.webkitExitFullscreen?.();
    } else {
      const el = d.documentElement as FsEl;
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else await el.webkitRequestFullscreen?.();
    }
  } catch { /* the browser said no (for example, not triggered by a tap) */ }
}

/** Calls `cb` whenever full screen starts or ends (also when the player leaves it with the back gesture). */
export function onFullscreenChange(cb: () => void): () => void {
  const d = doc();
  if (!d) return () => {};
  d.addEventListener('fullscreenchange', cb);
  d.addEventListener('webkitfullscreenchange', cb);
  return () => { d.removeEventListener('fullscreenchange', cb); d.removeEventListener('webkitfullscreenchange', cb); };
}

/** True on an iPhone or iPod in a normal browser tab, where only "Add to Home Screen" gives full screen. */
export function iphoneNeedsHomeScreen(): boolean {
  if (typeof navigator === 'undefined') return false;
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return /iPhone|iPod/.test(navigator.userAgent) && !standalone;
}
