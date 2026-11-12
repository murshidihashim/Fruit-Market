// Board animations: copies of pieces that travel between named spots on the table, and things that slide from where
// they were to where they are now. Spots are marked in the markup with data-a="..." (see table.tsx).
// The clock (every length, the one speed, the pauses, reduced motion) is motion.ts; its names are passed on from here.
import { render, type ComponentChild } from 'preact';
import { BEAT, EASE, FRAME, isReduced, moveMs, ms, speed, timer, wait } from './motion';

export * from './motion';

let layer: HTMLElement | null = null;
export function setLayer(el: HTMLElement | null) { layer = el; }

export function find(keys: string | string[]): HTMLElement | null {
  for (const key of Array.isArray(keys) ? keys : [keys]) {
    const el = document.querySelector(`[data-a="${key}"]`);
    // An anchor that is not laid out (display: none, e.g. an empty market slot set aside on a small phone) has no
    // position to fly from or to: try the next key instead.
    if (el && el.getClientRects().length > 0) return el as HTMLElement;
  }
  return null;
}

/** A spot on the table: its name (or names to try in turn), or the thing itself. */
export type Spot = string | string[] | Element;
const spot = (s: Spot): Element | null => (typeof s === 'string' || Array.isArray(s) ? find(s) : s);

interface Pt { x: number; y: number }
function point(el: HTMLElement, where: 'center' | 'top' = 'center'): Pt {
  const r = el.getBoundingClientRect();
  const L = layer!.getBoundingClientRect();
  return { x: r.left + r.width / 2 - L.left, y: (where === 'top' ? r.top : r.top + r.height / 2) - L.top };
}

/** A thing drawn on the layer. `centred`: it is a point with its picture centred on it (motion.css), so the picture
 *  never has to be measured and only the point's position and size are animated. */
function sprite(node: ComponentChild, cls = 'sprite', centred = false) {
  const el = document.createElement('div');
  el.className = cls;
  let into: HTMLElement = el;
  if (centred) {
    into = document.createElement('i');
    into.className = 'sprite-in';
    el.appendChild(into);
  }
  if (typeof node === 'string') into.textContent = node;
  else render(node, into);
  layer!.appendChild(el);
  return el;
}

/** A soft landing: the spot swells a little and settles back. Size only, no steps and no bounce. `size` is the
 *  spot's longer side in px: a small spot grows by a tenth, a big one by a few px at most. */
function settle(el: Element | null, size: number) {
  if (!el || isReduced()) return;
  const big = (1 + Math.min(0.1, 6 / Math.max(size, 1))).toFixed(3);
  el.animate(
    [{ transform: 'scale(1)', easing: 'cubic-bezier(.2, .7, .3, 1)' }, { transform: `scale(${big})`, offset: 0.4, easing: 'cubic-bezier(.4, 0, .2, 1)' }, { transform: 'scale(1)' }],
    { duration: ms(BEAT.piece.land) },
  );
}
/** The soft landing by itself, on a named spot (a customer's ticket as their card comes back to the row). */
export function pulse(keys: string | string[]) {
  const el = find(keys);
  const r = el?.getBoundingClientRect();
  if (el && r) settle(el, Math.max(r.width, r.height));
}

// ---------- the shared move ----------

/** At most this many copies travel at once. One more is not drawn: it still takes its time, and its calls are made. */
export const MAX_MOVING = 12;
/** From this many copies in the air, a new one is drawn without its shadow, which is the dear part to paint. */
export const PLAIN_FROM = 5;
let moving = 0;
/** How many copies are travelling now. */
export const inFlight = () => moving;

export interface FlyOpts {
  /** The length in ms at normal speed (a piece's flight when not given). */
  duration?: number;
  /** The way there: an arc (lifted off the table, the default), a low arc, or flat along the table. */
  path?: 'arc' | 'low' | 'flat';
  /** The height of the arc in px, when the usual one for the path will not do. */
  arc?: number;
  /** Wait this long (ms at normal speed) before lifting off. */
  delay?: number;
  endScale?: number;
  /** Fade away over the last part of the way. */
  fade?: boolean;
  /** False: the spot does not swell as the piece lands (a big spot that is redrawn at once, such as your crate). */
  swell?: boolean;
  /** Called as the piece lifts off: the moment a number at the place it leaves should change. */
  onLift?: () => void;
  /** Called as the piece lands: the moment a number at the place it reaches should change. Always called, once, after
   *  onLift: also when nothing can be drawn (no such spot, reduced motion, too many copies in the air). */
  onLand?: () => void;
}

/**
 * The keyframes of one flight between two points: position, size and fade only. The arc is a curve that tops out
 * above the higher of the two spots, cut into short straight pieces, so there is no corner at the top (the old flight
 * had one) and nothing is stepped. Pure, so tests can check it.
 */
export function flightFrames(p0: Pt, p1: Pt, o: Pick<FlyOpts, 'path' | 'arc' | 'endScale' | 'fade'> = {}): Keyframe[] {
  const lift = o.path === 'flat' ? 0 : o.path === 'low' ? 0.35 : 1;
  const at = (x: number, y: number, s: number, opacity: number, offset: number): Keyframe =>
    ({ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${s.toFixed(3)})`, opacity, offset });
  const s0 = 1 - 0.3 * lift;
  const s1 = o.endScale ?? 1 - 0.2 * lift;
  if (lift === 0 && !o.arc) return [at(p0.x, p0.y, s0, 1, 0), ...(o.fade ? [at(p0.x + (p1.x - p0.x) * 0.75, p0.y + (p1.y - p0.y) * 0.75, s0 + (s1 - s0) * 0.75, 1, 0.75)] : []), at(p1.x, p1.y, s1, o.fade ? 0 : 1, 1)];
  const far = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  const rise = o.arc ?? (lift === 1 ? Math.min(120, 40 + far * 0.25) : Math.min(36, 10 + far * 0.08));
  // The curve's control point, placed so that the top of the flight is `rise` above the higher spot (as high as the
  // old flight's corner was). A piece that lands lower than it started reaches its top early and falls the longer way.
  const cx = (p0.x + p1.x) / 2;
  const up = p0.y - (Math.min(p0.y, p1.y) - rise);
  const cy = p0.y - up - Math.sqrt(Math.max(0, up * (up + p1.y - p0.y)));
  const top = 1 + 0.3 * lift;
  const N = 16;
  return Array.from({ length: N + 1 }, (_, i) => {
    const t = i / N;
    const u = 1 - t;
    // The piece grows as it rises and shrinks as it comes down: a curve through its size at the start, the top and the end.
    const s = s0 * 2 * (t - 0.5) * (t - 1) - top * 4 * t * (t - 1) + s1 * 2 * t * (t - 0.5);
    return at(u * u * p0.x + 2 * u * t * cx + t * t * p1.x, u * u * p0.y + 2 * u * t * cy + t * t * p1.y, s, o.fade && t > 0.75 ? (1 - t) * 4 : 1, t);
  });
}

// Measure first, then move. Flights that start at the same moment are all measured before any copy is drawn, so the
// page is not laid out again between one piece and the next.
interface Measured { p0: Pt; p1: Pt; target: Element; size: number }
interface Due { from: Spot; to: Spot; a: Element; b: Element; done: (at: Measured | null) => void }
const due: Due[] = [];
function measureDue() {
  if (!due.length) return;
  const jobs = due.splice(0);
  const L = layer?.getBoundingClientRect();
  const again = (el: Element, s: Spot) => (el.isConnected ? el : typeof s === 'string' || Array.isArray(s) ? find(s) : null);
  const mid = (r: DOMRect): Pt => ({ x: r.left + r.width / 2 - L!.left, y: r.top + r.height / 2 - L!.top });
  const found = jobs.map((j): Measured | null => {
    // The screen may have been redrawn while this piece waited its turn: look its spots up again if they are gone.
    const a = L ? again(j.a, j.from) : null;
    const b = L ? again(j.b, j.to) : null;
    if (!a || !b) return null;
    const rb = b.getBoundingClientRect();
    return { p0: mid(a.getBoundingClientRect()), p1: mid(rb), target: b, size: Math.max(rb.width, rb.height) };
  });
  jobs.forEach((j, i) => j.done(found[i]));
}
const measured = (from: Spot, to: Spot, a: Element, b: Element) => new Promise<Measured | null>((done) => {
  due.push({ from, to, a, b, done });
  // Each piece asks; the first answer measures every piece waiting by then, and the later ones find nothing left to do.
  setTimeout(measureDue, 0);
});

/**
 * The shared move: a copy of a piece travels from one spot to another and lands softly. Resolves when it has landed.
 * It always ends by itself, on the clock and not on an animation event, and `onLift` and `onLand` are always called,
 * so a number can change as the piece leaves and as it arrives. A piece already in the air is not hurried by a tap.
 */
export async function fly(from: Spot, to: Spot, node: ComponentChild, o: FlyOpts = {}) {
  let lifted = false;
  const lift = () => { if (!lifted) { lifted = true; o.onLift?.(); } };
  try {
    // Nowhere to draw, or nothing travels (reduced motion), or no such spot: the change is simply shown.
    if (!layer || isReduced()) return;
    const a = spot(from);
    const b = spot(to);
    if (!a || !b) return;
    if (o.delay) await wait(o.delay);
    const at = await measured(from, to, a, b);
    lift();
    if (!at || !layer) return;
    const length = Math.max(1, moveMs(o.duration ?? BEAT.piece.fly));
    if (moving >= MAX_MOVING) { await timer(length); return; }
    moving++;
    let el: HTMLElement | null = null;
    try {
      el = sprite(node, moving > PLAIN_FROM ? 'sprite mv plain' : 'sprite mv', true);
      el.animate(flightFrames(at.p0, at.p1, o), { duration: length, easing: EASE.travel, fill: 'forwards' });
      await timer(length + FRAME);
    } finally {
      el?.remove();
      moving--;
    }
    // The spot found at lift-off swells as the piece lands (it is not looked up again: no measuring between moves).
    if (o.swell !== false && at.target.isConnected) settle(at.target, at.size);
  } finally {
    lift();
    o.onLand?.();
  }
}

/** Spoiled fruit: wobbles, turns brown, drops and fades. Not drawn with reduced motion. */
export async function drop(from: string | string[], node: ComponentChild, delay = 0) {
  if (!layer || isReduced()) return;
  const a = find(from);
  if (!a) return;
  if (delay) await wait(delay);
  if (!layer) return;
  const length = Math.max(1, moveMs(BEAT.night.spoil));
  if (moving >= MAX_MOVING) { await timer(length); return; }
  moving++;
  let el: HTMLElement | null = null;
  try {
    const p = point(a);
    el = sprite(node, moving > PLAIN_FROM ? 'sprite rotten plain' : 'sprite rotten');
    el.animate(
      [
        { transform: `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) rotate(0)`, opacity: 1 },
        { transform: `translate(${p.x - 4}px, ${p.y}px) translate(-50%, -50%) rotate(-15deg)`, opacity: 1, offset: 0.2 },
        { transform: `translate(${p.x + 4}px, ${p.y}px) translate(-50%, -50%) rotate(15deg)`, opacity: 1, offset: 0.35 },
        { transform: `translate(${p.x}px, ${p.y + 70}px) translate(-50%, -50%) rotate(90deg) scale(.6)`, opacity: 0 },
      ],
      { duration: length, easing: 'ease-in', fill: 'forwards' },
    );
    await timer(length + FRAME);
  } finally {
    el?.remove();
    moving--;
  }
}

/** A label that appears above a spot and stays until removed. */
export function tag(at: string | string[], text: string, cls = '') {
  const a = layer && find(at);
  if (!a) return { el: null as HTMLElement | null, remove() {}, set(_c: string) {} };
  const p = point(a, 'top');
  const el = sprite(text, `ptag ${cls}`);
  // Keep the label fully on screen, even above a stall at the edge.
  const half = el.offsetWidth / 2;
  const width = layer!.clientWidth;
  el.style.left = `${Math.min(Math.max(p.x, half + 6), width - half - 6)}px`;
  el.style.top = `${Math.max(14 + el.offsetHeight, p.y)}px`;
  // It grows into place and fades in (no overshoot); with reduced motion it is simply there.
  if (!isReduced()) el.animate([{ transform: 'translate(-50%, -100%) scale(0.6)', opacity: 0 }, { transform: 'translate(-50%, -100%) scale(1)', opacity: 1 }], { duration: ms(BEAT.label.pop), easing: EASE.sheet });
  return {
    el,
    remove() { el.remove(); },
    set(c: string) { el.classList.add(c); },
  };
}

/** "+$7" floating up and fading. With reduced motion it stays where it is for as long, to be read. */
export function floatText(at: string | string[], text: string, cls = '') {
  const a = layer && find(at);
  if (!a) return;
  const p = point(a, 'top');
  const el = sprite(text, `floattext ${cls}`);
  // Keep the number fully on screen, even next to the cash at the screen's edge.
  const half = el.offsetWidth / 2;
  p.x = Math.min(Math.max(p.x, half + 6), layer!.clientWidth - half - 6);
  p.y = Math.max(p.y, 50);
  const length = BEAT.label.float * Math.max(speed(), 0.5);
  const up = (dy: number) => `translate(${p.x}px, ${p.y - dy}px) translate(-50%, 0)`;
  if (isReduced()) el.style.transform = up(18);
  else el.animate([{ transform: up(0), opacity: 0 }, { transform: up(18), opacity: 1, offset: 0.2 }, { transform: up(44), opacity: 0 }], { duration: length, easing: 'ease-out', fill: 'forwards' });
  setTimeout(() => el.remove(), length);
}

// ---------- the shared slide (FLIP) ----------
// A thing that is on the table before and after a change is measured in both places and slid between them. Measure
// the old place with boxOf() before the screen changes; after it has changed, flipFrom() slides the thing in from
// there. Only its position and size are animated. Nothing waits for the slide: the caller's clock times the beat.

export interface Box { left: number; top: number; width: number; height: number }
/** Where a thing lies on the screen now (null when it is not laid out). */
export function boxOf(el: Element | null | undefined): Box | null {
  const r = el?.getBoundingClientRect();
  return r && r.width > 0 && r.height > 0 ? { left: r.left, top: r.top, width: r.width, height: r.height } : null;
}

/** The transform that draws a thing lying at `at` as if it lay at `other` (it turns about its own middle). */
export function flipTransform(other: Box, at: Box): string {
  const dx = other.left + other.width / 2 - (at.left + at.width / 2);
  const dy = other.top + other.height / 2 - (at.top + at.height / 2);
  return `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${(other.width / at.width).toFixed(4)}, ${(other.height / at.height).toFixed(4)})`;
}

interface FlipOpts { duration?: number; easing?: string }
function flip(el: HTMLElement | null | undefined, other: Box | null, back: boolean, o: FlipOpts) {
  const at = el && other && !isReduced() ? boxOf(el) : null;
  if (!el || !other || !at) return;
  const there = flipTransform(other, at);
  el.animate(back ? [{ transform: 'none' }, { transform: there }] : [{ transform: there }, { transform: 'none' }],
    { duration: ms(o.duration ?? BEAT.piece.fly), easing: o.easing ?? (back ? EASE.leave : EASE.travel), fill: back ? 'forwards' : 'backwards' });
}
/** Slides a thing from where it was (`from`, measured before the change) to where it is now. */
export function flipFrom(el: HTMLElement | null | undefined, from: Box | null, o: FlipOpts = {}) { flip(el, from, false, o); }
/** Slides a thing away to another place (`to`), where it stays until it is taken off the screen. */
export function flipTo(el: HTMLElement | null | undefined, to: Box | null, o: FlipOpts = {}) { flip(el, to, true, o); }
