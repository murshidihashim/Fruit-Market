// The market opening, "Lane Drop" (opening 1, PLAN-074). It plays on the home screen itself (the Ticket Booth), so it
// ends exactly on the home with nothing to swap: the four fruit lanes drop down the screen one after another, a fruit
// pops into each, the lanes fold up into the band under the black bar, the title stamps in, and your stall and the
// buttons rise into place. This component only switches the home's part on (the "hm-intro" class on <html>,
// booth.css) and draws what is not part of the home: a cover while the pictures load, the falling lanes and
// "Tap to skip". Decoration only: tap anywhere to skip; it ends on its own after about 2.45 seconds.
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { LaneBand } from './Home';

// Timing (DEC-048: about 2 to 3 seconds). The scene waits (briefly) for its pictures and fonts before it plays, so
// nothing pops in half way, then hands over with a short fade of this overlay (the home under it is already final).
const LENGTH_MS = 2450; // from the first lane dropping to the buttons in place
const REDUCED_MS = 800; // reduced motion: the finished home, shown still under the overlay
const FADE_MS = 280; // the overlay's fade (CSS .op-leave), and the home's fade-in after a skip
const START_WAIT_MS = 1200; // longest wait for the pictures and fonts on a slow connection
const CLASSES = ['hm-intro', 'hm-hold', 'hm-skip'];

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Waits until the fonts have loaded and these pictures are decoded, or `ms` has passed, whichever is first.
 *  A picture that fails to load is shown as it is (its failure is not an error here, so it is ignored). */
function settled(pics: HTMLImageElement[], ms: number): Promise<void> {
  const fonts = document.fonts ? document.fonts.ready.then(() => undefined, () => undefined) : Promise.resolve();
  const decoded = pics.map((p) => (p.decode ? p.decode().catch(() => undefined) : Promise.resolve()));
  return Promise.race([Promise.all([fonts, ...decoded]).then(() => undefined), new Promise<void>((r) => setTimeout(r, ms))]);
}

/** The pictures the home screen shows, as images that can be waited on. */
function homePictures(home: Element): HTMLImageElement[] {
  const urls = new Set<string>();
  home.querySelectorAll('img').forEach((i) => { if (i.src) urls.add(i.src); });
  return [...urls].map((u) => { const im = new Image(); im.src = u; return im; });
}

/** Where the home's band sits inside the overlay: the lanes fold into exactly this box. */
interface Band { top: number; left: number; width: number; height: number; full: number }
function measureBand(home: Element, overlay: HTMLElement): Band | null {
  const band = home.querySelector('.hm-lanes');
  if (!band) return null;
  const o = overlay.getBoundingClientRect(), b = band.getBoundingClientRect();
  if (!b.width || !o.height) return null;
  const top = b.top - o.top;
  return { top, left: b.left - o.left, width: b.width, height: b.height, full: Math.max(b.height, o.height - top) };
}

export function Opening({ onDone }: { onDone: () => void }) {
  // Waiting: the cover, the home paused until its pictures and fonts are in. Out: the overlay's fade to the home.
  const [band, setBand] = useState<Band | null>(null);
  const [playing, setPlaying] = useState(false);
  const [out, setOut] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const leaving = useRef(false);
  const ended = useRef(false);
  const done = useRef(onDone);
  done.current = onDone;
  const timers = useRef<number[]>([]);
  const later = (f: () => void, ms: number) => { timers.current.push(window.setTimeout(f, ms)); };
  const html = () => document.documentElement.classList;
  const finish = () => {
    if (ended.current) return;
    ended.current = true;
    html().remove(...CLASSES);
    done.current();
  };
  // Hand over to the home screen. At the natural end the home is already in its final place and the lanes sit exactly
  // on the band, so only this overlay fades. A tap part way fades the home in while the overlay fades out.
  const leave = (skipped: boolean) => {
    if (leaving.current) return;
    leaving.current = true;
    if (reducedMotion()) { finish(); return; }
    if (skipped) { html().remove('hm-intro', 'hm-hold'); html().add('hm-skip'); }
    setOut(true);
    // Normally the fade's own end (onAnimationEnd below) finishes it; this is the fallback if no animation runs.
    later(finish, FADE_MS + 200);
  };
  useLayoutEffect(() => {
    const home = document.querySelector<HTMLElement>('.home.hm');
    // The opening belongs to the home screen; anywhere else (an invite link opens the room screen) there is none.
    if (!home || !root.current?.parentElement) { finish(); return; }
    const still = reducedMotion();
    if (!still) html().add('hm-intro', 'hm-hold');
    let live = true;
    void settled(homePictures(home), START_WAIT_MS).then(() => {
      if (!live || leaving.current) return;
      if (!still && root.current) setBand(measureBand(home, root.current));
      setPlaying(true);
    });
    return () => { live = false; timers.current.forEach((t) => clearTimeout(t)); html().remove(...CLASSES); };
  }, []);
  // Everything starts in the same frame: the home's animations (the hold lifts) and the lanes (just drawn).
  useLayoutEffect(() => {
    if (!playing) return;
    html().remove('hm-hold');
    later(() => leave(false), reducedMotion() ? REDUCED_MS : LENGTH_MS);
  }, [playing]);
  const geo = band && `--lt:${band.top}px;--ll:${band.left}px;--lw:${band.width}px;--lh:${band.height}px;--h0:${band.full}px;top:${band.top}px;left:${band.left}px;width:${band.width}px;height:${band.height}px`;
  return (
    <div ref={root} class={`op op-ld${playing ? '' : ' op-wait'}${out ? ' op-leave' : ''}`} onClick={() => leave(true)} role="presentation"
      onAnimationEnd={(e) => { if (e.target === e.currentTarget && e.animationName === 'opx-out') finish(); }}>
      <div class="op-cover" />
      {playing && geo && <LaneBand class="op-lanes" style={geo} />}
      <span class="op-skip">Tap to skip</span>
    </div>
  );
}
