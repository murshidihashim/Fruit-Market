// Board animations: sprites that fly between named spots on the table.
// Spots are marked in the markup with data-a="..." (see table.tsx).
import { render, type VNode } from 'preact';

let layer: HTMLElement | null = null;
let hurry = 1;
let base = 1;
/** The rush pop-up's own speed-up: a tap makes the rest of the current customer quick (reset for the next one). */
let step = 1;
/** Waits still running, so a tap or Skip can end them at once. */
const waiting = new Set<() => void>();
const endWaits = () => { for (const done of [...waiting]) done(); };

export function setLayer(el: HTMLElement | null) { layer = el; }
export function setBaseSpeed(fast: boolean) { base = fast ? 0.55 : 1; }
/** Tap-to-skip: makes the rest of the current sequence very quick. */
export function hurryUp() { hurry = 0.15; endWaits(); }
export function resetHurry() { hurry = 1; step = 1; }
export const hurried = () => hurry < 1;
/** The fast setting is on. */
export const isFast = () => base < 1;
/** A tap on the rush pop-up: this customer finishes quickly, then the next one plays at the normal pace. */
export function speedStep() { step = 0.15; endWaits(); }
export function resetStep() { step = 1; }

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const k = () => (reduced() ? 0.05 : base * hurry * step);
/** The player asked for less motion: show results without flying anything. */
export const isReduced = reduced;
/** The current speed factor (1 normal, lower is quicker), for CSS transitions that should keep pace. */
export const speed = () => k();
/** A duration in ms at the current speed. */
export const ms = (n: number) => n * k() + 1;

function sleep(t: number) {
  return new Promise<void>((r) => {
    const done = () => { clearTimeout(id); waiting.delete(done); r(); };
    const id = setTimeout(done, t);
    waiting.add(done);
  });
}
export const wait = (n: number) => sleep(n * k());
/** A pause to read something: kept with reduced motion (nothing moves then, but the words still need time). */
export const hold = (n: number) => sleep(n * base * hurry * step);
export const frame = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

export function find(keys: string | string[]): HTMLElement | null {
  for (const key of Array.isArray(keys) ? keys : [keys]) {
    const el = document.querySelector(`[data-a="${key}"]`);
    // An anchor that is not laid out (display: none, e.g. an empty market slot set aside on a small phone) has no
    // position to fly from or to: try the next key instead.
    if (el && el.getClientRects().length > 0) return el as HTMLElement;
  }
  return null;
}

function point(el: HTMLElement, where: 'center' | 'top' = 'center') {
  const r = el.getBoundingClientRect();
  const L = layer!.getBoundingClientRect();
  return { x: r.left + r.width / 2 - L.left, y: (where === 'top' ? r.top : r.top + r.height / 2) - L.top };
}

function sprite(node: VNode | string, cls = 'sprite') {
  const el = document.createElement('div');
  el.className = cls;
  if (typeof node === 'string') el.textContent = node;
  else render(node, el);
  layer!.appendChild(el);
  return el;
}

export function pulse(keys: string | string[]) {
  const el = find(keys);
  // Squash and stretch, like something landing in a crate.
  el?.animate([{ transform: 'scale(1, 1)' }, { transform: 'scale(1.2, 0.82)' }, { transform: 'scale(0.92, 1.1)' }, { transform: 'scale(1, 1)' }], { duration: 300 * k() + 1, easing: 'steps(4)' });
}

interface FlyOpts { duration?: number; arc?: number; delay?: number; endScale?: number; fade?: boolean }

/** Fly a sprite from one spot to another along an arc. Resolves when it lands. */
export async function fly(from: string | string[] | HTMLElement, to: string | string[], node: VNode | string, o: FlyOpts = {}) {
  if (!layer) return;
  const a = from instanceof HTMLElement ? from : find(from);
  const b = find(to);
  if (!a || !b) return;
  if (o.delay) await wait(o.delay);
  const p0 = point(a);
  const p1 = point(b);
  const el = sprite(node);
  const arc = o.arc ?? Math.min(120, 40 + Math.hypot(p1.x - p0.x, p1.y - p0.y) * 0.25);
  const mid = { x: (p0.x + p1.x) / 2, y: Math.min(p0.y, p1.y) - arc };
  const dur = (o.duration ?? 520) * k() + 1;
  const anim = el.animate(
    [
      { transform: `translate(${p0.x}px, ${p0.y}px) translate(-50%, -50%) scale(0.7)`, opacity: 1 },
      { transform: `translate(${mid.x}px, ${mid.y}px) translate(-50%, -50%) scale(1.3)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${p1.x}px, ${p1.y}px) translate(-50%, -50%) scale(${o.endScale ?? 0.8})`, opacity: o.fade ? 0 : 1 },
    ],
    { duration: dur, easing: 'cubic-bezier(.45,.05,.4,1)', fill: 'forwards' },
  );
  await anim.finished.catch(() => {});
  el.remove();
  pulse(to);
}

/** Spoiled fruit: wobbles, turns brown, drops and fades. */
export async function drop(from: string | string[], node: VNode | string, delay = 0) {
  if (!layer) return;
  const a = find(from);
  if (!a) return;
  if (delay) await wait(delay);
  const p = point(a);
  const el = sprite(node, 'sprite rotten');
  const anim = el.animate(
    [
      { transform: `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) rotate(0)`, opacity: 1 },
      { transform: `translate(${p.x - 4}px, ${p.y}px) translate(-50%, -50%) rotate(-15deg)`, opacity: 1, offset: 0.2 },
      { transform: `translate(${p.x + 4}px, ${p.y}px) translate(-50%, -50%) rotate(15deg)`, opacity: 1, offset: 0.35 },
      { transform: `translate(${p.x}px, ${p.y + 70}px) translate(-50%, -50%) rotate(90deg) scale(.6)`, opacity: 0 },
    ],
    { duration: 900 * k() + 1, easing: 'ease-in', fill: 'forwards' },
  );
  await anim.finished.catch(() => {});
  el.remove();
}

/** A label that pops above a spot and stays until removed. */
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
  el.animate([{ transform: 'translate(-50%, -100%) scale(0)' }, { transform: 'translate(-50%, -100%) scale(1.2)' }, { transform: 'translate(-50%, -100%) scale(1)' }], { duration: 280 * k() + 1, fill: 'forwards' });
  return {
    el,
    remove() { el.remove(); },
    set(c: string) { el.classList.add(c); },
  };
}

/** "+$7" floating up and fading. */
export function floatText(at: string | string[], text: string, cls = '') {
  const a = layer && find(at);
  if (!a) return;
  const p = point(a, 'top');
  const el = sprite(text, `floattext ${cls}`);
  // Keep the number fully on screen, even next to the cash at the screen's edge.
  const half = el.offsetWidth / 2;
  p.x = Math.min(Math.max(p.x, half + 6), layer!.clientWidth - half - 6);
  p.y = Math.max(p.y, 50);
  el.animate(
    [
      { transform: `translate(${p.x}px, ${p.y}px) translate(-50%, 0)`, opacity: 0 },
      { transform: `translate(${p.x}px, ${p.y - 18}px) translate(-50%, 0)`, opacity: 1, offset: 0.2 },
      { transform: `translate(${p.x}px, ${p.y - 44}px) translate(-50%, 0)`, opacity: 0 },
    ],
    { duration: 1300 * Math.max(k(), 0.5), easing: 'ease-out', fill: 'forwards' },
  ).finished.then(() => el.remove(), () => el.remove());
}
