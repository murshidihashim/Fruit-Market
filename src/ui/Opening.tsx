// The market opening (DEC-072), "Lorry arrives" with the "Unloading" button area. It plays on the home screen itself
// (the Market square, DEC-071), so it ends exactly on the home with nothing to swap: the lorry drives in and stops,
// fruit is tossed onto each stall, the awnings unroll one by one and the title sign swings down, while crates thrown
// off the lorry stack up on the cobbles and flip open, one by one, into the menu's signboards (New game first).
// This component only switches the animation on (the "sq-intro" class on <html>, square.css) and draws what is not
// part of the home: a cover while the pictures load, the flying crates, the lorry's shadow and "Tap to skip".
// Decoration only: tap anywhere to skip; it ends on its own after about 2.95 seconds.
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { crateUrl, type FruitKind } from './marketArt';

// Timing (DEC-048: about 2 to 3 seconds). The scene waits (briefly) for its pictures and fonts before it plays, so
// nothing pops in half way, then hands over with a short fade of this overlay (the home under it is already final).
const LENGTH_MS = 2950; // from the lorry setting off to the last signboard unpacked
const REDUCED_MS = 800; // reduced motion: the finished home, shown still under the overlay
const FADE_MS = 280; // the overlay's fade (CSS .op-leave), and the home's fade-in after a skip
const START_WAIT_MS = 1200; // longest wait for the pictures and fonts on a slow connection
const CLASSES = ['sq-intro', 'sq-hold', 'sq-skip'];

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Waits until the fonts have loaded and these pictures are decoded, or `ms` has passed, whichever is first.
 *  A picture that fails to load is shown as it is (its failure is not an error here, so it is ignored). */
function settled(pics: HTMLImageElement[], ms: number): Promise<void> {
  const fonts = document.fonts ? document.fonts.ready.then(() => undefined, () => undefined) : Promise.resolve();
  const decoded = pics.map((p) => (p.decode ? p.decode().catch(() => undefined) : Promise.resolve()));
  return Promise.race([Promise.all([fonts, ...decoded]).then(() => undefined), new Promise<void>((r) => setTimeout(r, ms))]);
}

/** The pictures the home screen draws (its SVG <image>s and any <img>), as images that can be waited on. */
function homePictures(home: Element): HTMLImageElement[] {
  const urls = new Set<string>();
  home.querySelectorAll('image').forEach((i) => { const h = i.getAttribute('href'); if (h) urls.add(h); });
  home.querySelectorAll('img').forEach((i) => { if (i.src) urls.add(i.src); });
  return [...urls].map((u) => { const im = new Image(); im.src = u; return im; });
}

interface Crate { x: number; y: number; w: number; url: string; lid: number; bottom: number; a: number; o: number; cx: number; cy: number; lx: number; lr: number }
interface Plan { crates: Crate[]; lorry: { x: number; y: number; w: number; sx: number }; stack: { x: number; y: number; w: number } }

const THROW = [0.3, 0.72, 0.9, 1.08]; // when each crate leaves the lorry, bottom of the stack first (the first while it still rolls in)
const OPEN = [1.72, 1.95, 2.15, 2.33]; // when each crate flips open, top of the stack first
const LOAD: FruitKind[] = ['berry', 'melon', 'mango', 'apple'];

/** Where an element sits inside `app`, ignoring any transform an animation has put on it. */
function place(el: HTMLElement, app: HTMLElement): { x: number; y: number; w: number; h: number } {
  let x = 0, y = 0;
  for (let e: HTMLElement | null = el; e && e !== app; e = e.offsetParent as HTMLElement | null) { x += e.offsetLeft; y += e.offsetTop; }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

/** Where the crates fly from and land, and which signboards each one unpacks into, measured on the home's final
 *  layout (transforms ignored, so this works while the opening holds the home at its first frame). Sets each
 *  board's start (--dx, --dy, --s) and delay (--d). */
function planCrates(app: HTMLElement, home: HTMLElement): Plan | null {
  const svg = home.querySelector<SVGSVGElement>('.sq-svg'), bedEl = home.querySelector('.sq-bed'), lorryEl = home.querySelector('.sq-lrock image');
  const menuEl = home.querySelector<HTMLElement>('.sq-menu'), m = svg?.getScreenCTM();
  if (!svg || !bedEl || !lorryEl || !menuEl || !m) return null;
  const base = app.getBoundingClientRect();
  // Scene units to overlay px (the street's own view box; no animation moves the <svg> itself).
  const box = (el: Element) => {
    const a = (k: string) => Number(el.getAttribute(k) || 0);
    return { x: m.a * a('x') + m.e - base.left, y: m.d * a('y') + m.f - base.top, w: m.a * a('width'), h: m.d * a('height') };
  };
  const bed = box(bedEl), lorry = box(lorryEl), menu = place(menuEl, app), unit = m.a;
  // The signboards in rows, top to bottom.
  const boards = [...home.querySelectorAll<HTMLElement>('.sq-b')].map((el) => ({ el, r: place(el, app) })).filter((b) => b.r.w > 0);
  const rows: (typeof boards)[] = [];
  for (const b of [...boards].sort((p, q) => p.r.y - q.r.y)) {
    const row = rows.find((rw) => Math.abs(rw[0].r.y - b.r.y) < 10);
    if (row) row.push(b); else rows.push([b]);
  }
  if (!rows.length) return null;
  while (rows.length > 4) rows[3].push(...rows.splice(4, 1)[0]);
  rows.forEach((rw) => rw.sort((p, q) => p.r.x - q.r.x));
  const n = rows.length;
  let w = Math.round(Math.min(116, menu.w * 0.34)), h = Math.round(w * 0.43);
  if (n * h > menu.h - 24) { h = Math.max(24, Math.floor((menu.h - 24) / n)); w = Math.round(h / 0.43); }
  // the stack stands clear of "Tap to skip" when there is room
  const midX = menu.x + menu.w / 2, floor = menu.y + menu.h - (menu.h - n * h > 96 ? 56 : 14);
  const crates: Crate[] = [];
  for (let j = 0; j < n; j++) {
    const art = crateUrl(LOAD[j], w, h), k = w / (art.vw - 4); // k: px per crate-drawing unit (the drawing is w + 4 wide)
    const boxTop = floor - (j + 1) * h, cy = boxTop + h / 2;
    const fromX = bed.x + bed.w / 2 + (j === 0 ? 150 * unit : 0), fromY = bed.y + bed.h / 2;
    const rank = n - 1 - j; // the top crate opens first
    crates.push({
      x: Math.round(midX - (w + 4) / 2), y: Math.round(boxTop - art.top * k), w: w + 4, url: art.url, lid: Math.round(art.top * k - 8), bottom: Math.round(boxTop + h),
      a: THROW[j], o: OPEN[rank], cx: Math.round(fromX - midX), cy: Math.round(fromY - cy), lx: j % 2 ? 40 : -40, lr: j % 2 ? 50 : -50,
    });
    rows[rank].forEach((b, i) => {
      const s = b.el.style;
      s.setProperty('--d', `${(OPEN[rank] + 0.06 + i * 0.06).toFixed(2)}s`);
      s.setProperty('--dx', `${Math.round(midX - (b.r.x + b.r.w / 2))}px`);
      s.setProperty('--dy', `${Math.round(cy - (b.r.y + b.r.h / 2))}px`);
      s.setProperty('--s', Math.min(1, w / b.r.w).toFixed(2));
    });
  }
  return {
    crates,
    lorry: { x: lorry.x + lorry.w * 0.08, y: menu.y + 4, w: lorry.w * 0.84, sx: 430 * unit },
    stack: { x: midX - w * 0.7, y: floor - 6, w: w * 1.4 },
  };
}

function clearBoards(home: Element | null) {
  home?.querySelectorAll<HTMLElement>('.sq-b').forEach((b) => ['--d', '--dx', '--dy', '--s'].forEach((v) => b.style.removeProperty(v)));
}

export function Opening({ onDone }: { onDone: () => void }) {
  // Waiting: the cover, the scene paused until its pictures and fonts are in. Out: the overlay's fade to the home.
  const [playing, setPlaying] = useState(false);
  const [out, setOut] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
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
    clearBoards(document.querySelector('.home.sq'));
    done.current();
  };
  // Hand over to the home screen. At the natural end the home is already in its final place, so only this overlay
  // fades. A tap part way jumps the home to its end and fades it in while the overlay fades out (a short cross-fade).
  const leave = (skipped: boolean) => {
    if (leaving.current) return;
    leaving.current = true;
    if (reducedMotion()) { finish(); return; }
    if (skipped) { html().remove('sq-intro', 'sq-hold'); html().add('sq-skip'); }
    setOut(true);
    // Normally the fade's own end (onAnimationEnd below) finishes it; this is the fallback if no animation runs.
    later(finish, FADE_MS + 200);
  };
  useLayoutEffect(() => {
    const home = document.querySelector<HTMLElement>('.home.sq');
    // The opening belongs to the home screen; anywhere else (an invite link opens the room screen) there is none.
    if (!home || !root.current?.parentElement) { finish(); return; }
    const still = reducedMotion();
    if (!still) html().add('sq-intro', 'sq-hold');
    let live = true;
    void settled(homePictures(home), START_WAIT_MS).then(() => {
      if (!live || leaving.current) return;
      const app = root.current?.parentElement;
      if (!still && app) setPlan(planCrates(app, home));
      setPlaying(true);
    });
    return () => { live = false; timers.current.forEach((t) => clearTimeout(t)); html().remove(...CLASSES); clearBoards(home); };
  }, []);
  // Everything starts in the same frame: the home's animations (the hold lifts) and the crates (just drawn).
  useLayoutEffect(() => {
    if (!playing) return;
    html().remove('sq-hold');
    later(() => leave(false), reducedMotion() ? REDUCED_MS : LENGTH_MS);
  }, [playing]);
  return (
    <div ref={root} class={`op op-sq${playing ? '' : ' op-wait'}${out ? ' op-leave' : ''}`} onClick={() => leave(true)} role="presentation"
      onAnimationEnd={(e) => { if (e.target === e.currentTarget && e.animationName === 'opx-out') finish(); }}>
      <div class="op-cover" />
      {plan && (
        <div class="op-crates" aria-hidden="true">
          <i class="op-shadow lorry" style={`left:${plan.lorry.x}px;top:${plan.lorry.y}px;width:${plan.lorry.w}px;height:14px;--sx:${plan.lorry.sx}px`} />
          <i class="op-shadow stack" style={`left:${plan.stack.x}px;top:${plan.stack.y}px;width:${plan.stack.w}px;height:14px`} />
          {plan.crates.map((c) => (
            <>
              <div class="op-crate" style={`left:${c.x}px;top:${c.y}px;width:${c.w}px;--a:${c.a}s;--cx:${c.cx}px;--cy:${c.cy}px`}>
                <div class="op-open" style={`--o:${c.o}s`}><img src={c.url} alt="" draggable={false} /></div>
                <i class="op-lid" style={`top:${c.lid}px;--o:${c.o}s;--lx:${c.lx}px;--lr:${c.lr}deg`} />
              </div>
              <i class="op-dust" style={`left:${c.x + c.w * 0.15}px;top:${c.bottom - 8}px;width:${c.w * 0.7}px;--a:${(c.a + 0.4).toFixed(2)}s`} />
            </>
          ))}
        </div>
      )}
      <span class="op-skip">Tap to skip</span>
    </div>
  );
}
