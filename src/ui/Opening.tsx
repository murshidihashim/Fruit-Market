// The market opening (PLAN-029, DEC-047): a short scene played when the game is opened, drawn with the deck-art
// pieces (DEC-066): the Fruit Market masthead drops in, three Stall Signs go up, fruit lands on the counter
// and the bell rings. Decoration only: tap anywhere to skip; it ends on its own after about 2.6 seconds and fades to home.
import { useEffect, useRef, useState } from 'preact/hooks';
import { FRUITS, RIVALS } from '../engine/data';
import { Fruit } from './art';
import { StallSign } from './cards';
import { C } from './palette';

// Timing (DEC-048: about 2 to 3 seconds). The home screen is drawn underneath from the start, so its pictures and
// fonts load during the scene. The scene waits (briefly) for its own pictures and fonts before it plays, so nothing
// pops in half way, and hands over with a short cross-fade once the home screen's pictures and fonts are ready.
const LENGTH_MS = 2600; // the scene, from the masthead to the bell
const REDUCED_MS = 800; // reduced motion: the finished scene, shown still
const FADE_MS = 280; // the cross-fade into the home screen (CSS .op-leave)
const START_WAIT_MS = 1200; // longest wait for the scene's own pictures and fonts on a slow connection
const HOME_WAIT_MS = 1500; // longest extra wait for the home screen's pictures and fonts after the scene
const SIGNS = RIVALS.slice(0, 3).map((r) => r.avatar);

const fit = () => Math.min(window.innerWidth / 390, window.innerHeight / 560);
// The first fit is read when the code loads, while the page is still empty: reading the window size during the render
// would make the browser lay out the half-built page there and then (one long task instead of two short ones).
const FIRST_FIT = typeof window === 'undefined' ? 1 : fit();
const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Waits until the fonts have loaded and these pictures are decoded, or `ms` has passed, whichever is first.
 *  A picture that fails to load is shown as it is (its failure is not an error here, so it is ignored). */
function settled(pics: HTMLImageElement[], ms: number): Promise<void> {
  const fonts = document.fonts ? document.fonts.ready.then(() => undefined, () => undefined) : Promise.resolve();
  const decoded = pics.map((p) => (p.decode ? p.decode().catch(() => undefined) : Promise.resolve()));
  return Promise.race([Promise.all([fonts, ...decoded]).then(() => undefined), new Promise<void>((r) => setTimeout(r, ms))]);
}

/** The pictures on screen outside the opening (the home screen's stall sign and badge, or whatever screen is under it). */
function picturesUnder(opening: HTMLElement): HTMLImageElement[] {
  return [...document.images].filter((p) => {
    if (opening.contains(p)) return false;
    const r = p.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
  });
}

export function Opening({ onDone }: { onDone: () => void }) {
  const [scale, setScale] = useState(FIRST_FIT);
  // Waiting: sky only, the scene paused until its pictures and fonts are in. Out: the cross-fade to the home screen.
  const [playing, setPlaying] = useState(false);
  const [out, setOut] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const leaving = useRef(false);
  const ended = useRef(false);
  const done = useRef(onDone);
  done.current = onDone;
  const finish = () => { if (!ended.current) { ended.current = true; done.current(); } };
  const timers = useRef<number[]>([]);
  const later = (f: () => void, ms: number) => { timers.current.push(window.setTimeout(f, ms)); };
  // Hand over to the home screen: a short cross-fade, or straight away with reduced motion.
  const leave = () => {
    if (leaving.current) return;
    leaving.current = true;
    if (reducedMotion()) { finish(); return; }
    setOut(true);
    // Normally the fade's own end (onAnimationEnd below) finishes it; this is the fallback if no animation runs.
    later(finish, FADE_MS + 200);
  };
  useEffect(() => {
    const resize = () => setScale(fit());
    resize();
    window.addEventListener('resize', resize);
    let live = true;
    const el = root.current!;
    void settled([...el.querySelectorAll('img')], START_WAIT_MS).then(() => {
      if (!live || leaving.current) return;
      setPlaying(true);
      later(() => { void settled(picturesUnder(el), HOME_WAIT_MS).then(() => { if (live) leave(); }); }, reducedMotion() ? REDUCED_MS : LENGTH_MS);
    });
    return () => { live = false; window.removeEventListener('resize', resize); timers.current.forEach((t) => clearTimeout(t)); };
  }, []);
  return (
    <div ref={root} class={`op opx${playing ? '' : ' op-wait'}${out ? ' op-leave' : ''}`} onClick={leave} role="presentation"
      onAnimationEnd={(e) => { if (e.animationName === 'opx-out') finish(); }}>
      <div class="op-stage" style={{ transform: `scale(${scale})` }} aria-hidden="true">
        <div class="opx-sky" />
        <div class="opx-counter" />
        <div class="opx-mast">
          <b>Fruit Market</b>
          <span>Extra! · The market opens today</span>
        </div>
        {SIGNS.map((a, i) => <div class={`opx-sign opx-s${i}`}><StallSign avatar={a} compact eager /></div>)}
        {FRUITS.map((f, i) => <div class={`op-fl op-f${i}`}><Fruit id={f} size={30} /></div>)}
        <svg class="op-bell" viewBox="0 0 24 24" width="34" height="34">
          <path d="M12 3c-3.5 0-6 2.6-6 6v5l-2 3h16l-2-3V9c0-3.4-2.5-6-6-6Z" fill={C.xMustard} stroke={C.xInk} stroke-width="1.6" />
          <circle cx="12" cy="20" r="2" fill={C.xInk} />
        </svg>
        <div class="op-pill">The market is open!</div>
      </div>
      <span class="op-skip">Tap to skip</span>
    </div>
  );
}
