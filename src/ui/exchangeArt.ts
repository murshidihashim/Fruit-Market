// The Great Fruit Exchange drawings (DEC-069, PLAN-053, direction D): status, perk, upgrade and favour icons, the
// lorry, stall roofs and trims, stall props and the worn regalia. Engraved like a banknote: navy line work, brass and
// note-green, hatched shading. Every drawing is built here as an SVG string once and cached as a data URI, so the page
// shows one <img> (or one background image) per drawing, not a tree of SVG nodes (the game screen has a DOM budget).
// At small sizes the hatching would turn to grey mush, so it becomes a darker tint instead and lines get bolder.
// Colours all come from palette.ts. This file draws only: nothing here changes a rule.
import { C } from './palette';

const INK = C.xInk;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Blend two #rrggbb colours: 0 is all `a`, 1 is all `b`. */
export function mix(a: string, b: string, t: number): string {
  const n = parseInt(a.slice(1), 16), m = parseInt(b.slice(1), 16);
  const f = (s: number) => Math.round(((n >> s) & 255) * (1 - t) + ((m >> s) & 255) * t);
  return '#' + [16, 8, 0].map((s) => f(s).toString(16).padStart(2, '0')).join('');
}

// ---------- drawing parts (glyphs on a 32 x 32 grid) ----------

type Attr = Record<string, string | number>;
interface Shape { t: 'path' | 'circle' | 'ellipse' | 'rect'; a: Attr; c: string; sw?: number; ns?: boolean; off?: number; x?: string }
interface Shade { shade: Shape }
type Part = Shape | Shade;
interface Opt { sw?: number; ns?: boolean; off?: number; x?: string }

const P = (d: string, c: string, o: Opt = {}): Shape => ({ t: 'path', a: { d }, c, ...o });
const Ci = (cx: number, cy: number, r: number, c: string, o: Opt = {}): Shape => ({ t: 'circle', a: { cx, cy, r }, c, ...o });
const El = (cx: number, cy: number, rx: number, ry: number, c: string, o: Opt = {}): Shape => ({ t: 'ellipse', a: { cx, cy, rx, ry }, c, ...o });
const Bx = (x: number, y: number, width: number, height: number, c: string, rx = 0, o: Opt = {}): Shape => ({ t: 'rect', a: { x, y, width, height, rx }, c, ...o });
const L = (d: string, o: Opt = {}) => P(d, 'line', o);
const LC = (d: string, col: string, o: Opt = {}) => P(d, 'line:' + col, o);
const S = (body: Shape): Shade => ({ shade: body });
const isShade = (p: Part): p is Shade => 'shade' in p;

function starD(cx: number, cy: number, R: number, r: number, n = 5): string {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n, q = i % 2 ? r : R;
    d += (i ? 'L' : 'M') + r2(cx + Math.cos(a) * q) + ' ' + r2(cy + Math.sin(a) * q);
  }
  return d + 'Z';
}
function crescent(cx: number, cy: number, R: number, ox: number, oy: number, r: number): string {
  const dx = ox - cx, dy = oy - cy, d = Math.hypot(dx, dy), a = (R * R - r * r + d * d) / (2 * d), h = Math.sqrt(R * R - a * a);
  const mx = cx + (a * dx) / d, my = cy + (a * dy) / d;
  const p1 = `${r2(mx + (h * dy) / d)},${r2(my - (h * dx) / d)}`, p2 = `${r2(mx - (h * dy) / d)},${r2(my + (h * dx) / d)}`;
  return `M${p1} A${R} ${R} 0 1 0 ${p2} A${r} ${r} 0 0 1 ${p1}Z`;
}
function flake(cx: number, cy: number, r: number): string {
  let d = '';
  for (let i = 0; i < 6; i++) {
    const t = (i * Math.PI) / 3 + Math.PI / 2, ux = Math.cos(t), uy = Math.sin(t);
    d += `M${cx} ${cy}L${r2(cx + ux * r)} ${r2(cy + uy * r)}`;
    const ax = cx + ux * r * 0.55, ay = cy + uy * r * 0.55;
    for (const k of [0.8, -0.8]) d += `M${r2(ax)} ${r2(ay)}L${r2(ax + Math.cos(t + k) * r * 0.36)} ${r2(ay + Math.sin(t + k) * r * 0.36)}`;
  }
  return d;
}
function rays(cx: number, cy: number, a: number, b: number, n = 8): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const t = (i * 2 * Math.PI) / n;
    d += `M${r2(cx + Math.cos(t) * a)} ${r2(cy + Math.sin(t) * a)}L${r2(cx + Math.cos(t) * b)} ${r2(cy + Math.sin(t) * b)}`;
  }
  return d;
}
const LEAF_D = 'M0 -4.4C2.3 -2 2.3 2 0 4.4 -2.3 2 -2.3 -2 0 -4.4Z';
const leaf = (x: number, y: number, rot: number, c = 'leaf', s = 1) => P(LEAF_D, c, { x: `transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"`, sw: 1.6, off: 1 });
const APPLE = 'M16 10.2C12 7.4 4.8 8.4 4.8 16.2 4.8 23.6 9.8 29 13.4 29 15 29 15.2 28.2 16 28.2S17 29 18.6 29C22.2 29 27.2 23.6 27.2 16.2 27.2 8.4 20 7.4 16 10.2Z';
const beads = (cx: number, cy: number, r: number, n: number, rad = 0.62) =>
  Array.from({ length: n }, (_, i) => { const a = (i * 2 * Math.PI) / n; return Ci(r2(cx + Math.cos(a) * r), r2(cy + Math.sin(a) * r), rad, 'ink'); });
const ticket = (c: string) => P('M3 8h26v5a3 3 0 0 1 0 6v5H3v-5a3 3 0 0 0 0-6Z', c);
const BELL_D = 'M9.6 21c1-1.2 1.2-3 1.2-5.2 0-2.8 1.6-4.6 3.6-4.6s3.6 1.8 3.6 4.6c0 2.2.2 4 1.2 5.2Z';

function scalesParts(fruit: boolean): Part[] {
  const pl = P('M1.6 17.5h7.8a3.9 3.9 0 0 1-7.8 0Z', 'gold'), pr = P('M22.6 17.5h7.8a3.9 3.9 0 0 1-7.8 0Z', 'gold'), base = P('M10.2 28.8h11.6l-1.9-3.6h-7.8Z', 'gold');
  return [L('M16 7v18.5', { sw: 2.6 }), L('M5.5 9.5h21'), L('M5.5 9.5 2.4 17.5M5.5 9.5l3.1 8M26.5 9.5l-3.1 8M26.5 9.5l3.1 8', { sw: 1.3 }),
    ...(fruit ? [Ci(5.5, 15.6, 2.7, 'red'), Ci(26.5, 15.6, 2.7, 'leaf')] : []), pl, pr, base, Ci(16, 6.5, 2.1, 'gold')];
}

/** The glyphs, by drawing name. The Exchange twists replace the plain objects (token for coin, trolley for cart, ...). */
const G: Record<string, () => Part[]> = {
  // status
  token() { const b = Ci(16, 16, 12.6, 'gold'); return [b, S(b), ...beads(16, 16, 10.7, 22, 0.6), Ci(16, 16, 8.6, 'line', { sw: 1.1 }), P('M11.6 20.6c.9-1.2 1.1-2.8 1.1-4.8 0-2.4 1.4-4 3.3-4s3.3 1.6 3.3 4c0 2 .2 3.6 1.1 4.8Z', 'gold', { sw: 1.3 }), Ci(16, 21.8, 1.1, 'ink'), L('M16 10.2v1.6', { sw: 1.3 })]; },
  tokenSmall() { const b = Ci(16, 16, 13, 'gold'); return [b, S(b), Ci(16, 16, 9.6, 'line', { sw: 1.6 }), P('M10.6 21.4c1-1.4 1.3-3.2 1.3-5.6 0-2.8 1.8-4.8 4.1-4.8s4.1 2 4.1 4.8c0 2.4.3 4.2 1.3 5.6Z', 'gold', { sw: 2 }), Ci(16, 23.2, 1.6, 'ink')]; },
  crate() { const b = Bx(4.5, 8, 23, 19, 'wood', 1.6); return [b, S(b), L('M4.5 17.5h23'), L('M9.2 8v19M22.8 8v19'), L('M9.2 8 22.8 17.5', { sw: 1.3 })]; },
  trolley() { const d = Bx(3.5, 18, 23, 4, 'wood', 1); return [L('M5.4 18V9.6H24.6V18', { sw: 3.4 }), LC('M5.4 18V9.6H24.6V18', 'gold', { sw: 1.5 }), Bx(7.4, 12, 8.4, 6, 'crate', 0.6, { sw: 1.4 }), Ci(20.4, 14.8, 3.1, 'red', { sw: 1.4 }), L('M26.5 20 29.8 6.6', { sw: 2.4 }), L('M27.8 6.4h3.6', { sw: 2 }), d, S(d), Ci(8.6, 25.6, 2.8, 'ink'), Ci(8.6, 25.6, 1.1, 'gold', { sw: 0.8 }), Ci(21.4, 25.6, 2.8, 'ink'), Ci(21.4, 25.6, 1.1, 'gold', { sw: 0.8 })]; },
  sun() { const b = Ci(16, 16, 7.4, 'gold'); return [L(rays(16, 16, 10.6, 14.3), { sw: 2.4 }), b, S(b)]; },
  moon() { const b = P(crescent(15, 17, 11.5, 21.5, 11, 9.5), 'moon'); return [b, S(b), P(starD(25, 6, 3.4, 1.2, 4), 'moon', { sw: 1.4 }), P(starD(28.3, 15, 2.2, 0.8, 4), 'moon', { sw: 1.2 })]; },
  starMedal() { const b = P(starD(16, 13.4, 12, 5.2), 'gold'); return [P('M10.6 18.4 7 29.6l3.2-1.4 1.8 3 2.8-10.6Z', 'red', { sw: 1.5 }), P('M21.4 18.4 25 29.6l-3.2-1.4-1.8 3-2.8-10.6Z', 'red', { sw: 1.5 }), b, S(b), Ci(16, 14.2, 3, 'line', { sw: 1.1 })]; },
  heart() { const b = P('M16 27.5C9 22.5 3.8 18 3.8 12 3.8 8.4 6.4 5.8 9.8 5.8 12.6 5.8 14.6 7.4 16 9.8 17.4 7.4 19.4 5.8 22.2 5.8 25.6 5.8 28.2 8.4 28.2 12 28.2 18 23 22.5 16 27.5Z', 'red'); return [b, S(b)]; },
  hourglass() {
    const g = 'M8.5 7.5h15c0 6.5-5.2 7-5.2 8.5s5.2 2 5.2 8.5h-15c0-6.5 5.2-7 5.2-8.5S8.5 14 8.5 7.5Z';
    const t = Bx(5.5, 3.5, 21, 4.2, 'wood', 1.6), u = Bx(5.5, 24.3, 21, 4.2, 'wood', 1.6);
    return [P(g, 'ice'), P('M11 10.6h10c-.9 2.6-4.2 3.5-5 5.4-.8-1.9-4.1-2.8-5-5.4Z', 'gold', { ns: true }), P('M10.1 24.4c.6-3.3 4.5-4 5.9-6.3 1.4 2.3 5.3 3 5.9 6.3Z', 'gold', { ns: true }), L('M16 16v4', { sw: 1.2 }), L(g), t, S(t), u, S(u)];
  },
  earTrumpet() { const h = P('M24.6 21.4 13.4 10.2C11.6 8.4 11 5.6 11.6 3.2 8.4 2.4 4.8 3.4 3 5.4S.6 10.8 1.8 13.6C4.2 13 7 13.6 8.8 15.4L20 26.6Z', 'gold'); return [h, S(h), El(7, 8.6, 3.4, 5.8, 'ink', { x: 'transform="rotate(-45 7 8.6)"' }), Ci(25.4, 25.4, 3.6, 'gold', { sw: 1.7 }), Ci(25.4, 25.4, 1.3, 'ink'), L('M16 13.6l-2.6 2.6M19 16.6l-2.6 2.6', { sw: 1 }), L('M3.6 21.2c2 1.2 3.2 3.4 3.4 5.8M8.4 20c1.2.8 2 2.2 2.1 3.8', { sw: 1.3 })]; },
  // Small sizes: a plain horn with a curled tube, so it never reads as a spanner.
  earSmall() { const h = P('M2.5 6 18 13v6L2.5 26c-1.8-6.4-1.8-13.6 0-20Z', 'gold'); return [h, S(h), El(3.4, 16, 1.7, 8.6, 'ink'), L('M18 16h4.4c3.4 0 5.6 2.2 5.6 5.6v2.6', { sw: 3.6 }), LC('M18 16h4.4c3.4 0 5.6 2.2 5.6 5.6v2.6', 'gold', { sw: 1.4 }), Ci(28, 26, 2.6, 'gold', { sw: 1.6 })]; },
  lantern() { const b = El(16, 16.2, 8.6, 8.2, 'red'); return [L('M16 1.8v3.8'), b, S(b), L('M16 8v16.4', { sw: 1.4 }), El(16, 16.2, 3.8, 8.2, 'line', { sw: 1.4 }), Bx(11.2, 5.4, 9.6, 3.2, 'wood', 1), Bx(12, 23.4, 8, 3, 'wood', 1), LC('M16 26.6v3.6', 'gold', { sw: 2.2 })]; },
  scales() { return scalesParts(false); },
  // perks
  stockTag() { const b = ticket('red'); return [b, S(b), L('M9.6 9v14', { sw: 1, x: 'stroke-dasharray="1.3 1.3"' }), Ci(15.4, 13.2, 1.5, 'line', { sw: 1.3 }), Ci(21.6, 18.6, 1.5, 'line', { sw: 1.3 }), L('M22.4 12 14.6 19.8', { sw: 1.5 })]; },
  tagSmall() { const b = ticket('red'); return [b, S(b), Ci(14.6, 13, 2, 'line', { sw: 1.8 }), Ci(21.4, 19, 2, 'line', { sw: 1.8 }), L('M22.6 11.4 13.4 20.6', { sw: 2 })]; },
  eggBond() { const c = Bx(2.5, 4.5, 27, 17, 'paper', 1), e = El(13, 20, 6.4, 8, 'cream'); return [c, Bx(4.6, 6.6, 22.8, 12.8, 'line:green', 0.6, { sw: 0.9 }), LC('M7.4 9.6q1.6-1.6 3.2 0t3.2 0 3.2 0 3.2 0 3.2 0', 'green', { sw: 0.8 }), Ci(25, 17.6, 2.8, 'red', { sw: 1.2 }), e, S(e), P('M6.6 25.4c1.6 3 4 4.4 6.4 4.4s4.8-1.4 6.4-4.4c-2 .8-4.2 1.2-6.4 1.2s-4.4-.4-6.4-1.2Z', 'wood', { sw: 1.3 })]; },
  eggSmall() { const c = Bx(3, 4, 26, 16, 'paper', 1), e = El(13.4, 19.4, 7.2, 8.8, 'cream'); return [c, Ci(24.4, 15.4, 3, 'red', { sw: 1.4 }), e, S(e), P('M5.6 25c1.8 3.4 4.6 5 7.8 5s6-1.6 7.8-5c-2.4.9-5 1.4-7.8 1.4S8 25.9 5.6 25Z', 'wood', { sw: 1.4 })]; },
  // upgrades
  handcart() { const b = P('M4.5 12.5h22l-2.6 9.5H7.1Z', 'wood'); return [Ci(10.8, 11.4, 3.4, 'red'), Ci(21.6, 11.2, 3.3, 'leaf'), Ci(16.2, 9.6, 3.7, 'gold'), b, S(b), L('M5.8 17.2h19.4', { sw: 1.4 }), L('M26.5 12.5 30.2 7.2', { sw: 2.6 }), Ci(10.5, 25.2, 3.7, 'cream'), Ci(10.5, 25.2, 1.1, 'ink'), Ci(21.5, 25.2, 3.7, 'cream'), Ci(21.5, 25.2, 1.1, 'ink')]; },
  vault() { const b = Ci(16, 16, 12.4, 'sky'); return [Bx(1.8, 9.4, 3.6, 4.4, 'gold', 0.6, { sw: 1.2 }), Bx(1.8, 18.2, 3.6, 4.4, 'gold', 0.6, { sw: 1.2 }), b, S(b), Ci(16, 16, 9.4, 'line', { sw: 1.1 }), L('M16 9.4v13.2M10.3 12.7l11.4 6.6M10.3 19.3l11.4-6.6', { sw: 1.6 }), Ci(16, 16, 2.4, 'gold', { sw: 1.2 }), L(flake(26.4, 5.4, 3.6), { sw: 1.1 })]; },
  tickerBoard() { const b = Bx(3, 5, 26, 17, 'gold', 1.6); return [Bx(7.6, 21, 2.6, 8, 'wood', 0.5), Bx(21.8, 21, 2.6, 8, 'wood', 0.5), b, S(b), Bx(5.8, 7.8, 20.4, 11.4, 'chalk', 0.6), LC('M8.2 16.6l4-3.6 3 2 5.4-4.8', 'cream', { sw: 1.5 }), P('M18.4 9.2h3.8V13Z', 'cream', { ns: true }), P(starD(16, 3.6, 2.8, 1.2), 'red', { sw: 1 })]; },
  juicer() { const g = 'M8.4 8.5h15.2l-2.2 19.8H10.6Z'; return [P(g, 'ice'), P('M9.3 14.2h13.4l-1.6 13.6H10.9Z', 'orange', { ns: true }), LC('M17.4 24 20.9 3.6h4.6', 'red', { sw: 2.4 }), L(g), Ci(24, 9.2, 4.6, 'orange'), L('M24 9.2V4.6M24 9.2l4 2.3M24 9.2l-4 2.3', { sw: 1 }), Ci(24, 9.2, 3.1, 'line', { sw: 1 })]; },
  // favours
  gazette() { const f = P('M4 8h20v20H4Z', 'paper'); return [P('M8 4.5h20.5v19H8Z', 'cream', { sw: 1.6 }), f, S(f), Bx(6, 10, 16, 3.6, 'ink'), L('M6.4 17h6.8M6.4 19.8h6.8M6.4 22.6h6.8M6.4 25.4h13.4', { sw: 1 }), Bx(15.2, 16.2, 6.6, 5.8, 'red', 0.4, { sw: 1.1 })]; },
  voucher() { const b = ticket('gold'); return [b, S(b), Bx(6, 10.5, 20, 11, 'line', 1, { sw: 0.9, x: 'stroke-dasharray="1.4 1.2"' }), P(APPLE, 'red', { x: 'transform="translate(7.8 8.4) scale(.42)"', sw: 3.4 }), Ci(21.6, 16, 3.8, 'line:red', { sw: 1.3 }), LC('M20 16.2l1.2 1.2 2.2-2.6', 'red', { sw: 1.1 })]; },
  bellTicket() { const b = ticket('paper'); return [b, S(b), P(BELL_D, 'gold', { x: 'transform="translate(-2.4 0)"', sw: 1.5 }), Ci(12, 22.2, 1.2, 'ink'), L('M12 9.8v1.4', { sw: 1.4 }), L('M20.6 13.2l2.4-1.6v9.6', { sw: 2 })]; },
  lens() { const l = Ci(13, 13, 9, 'ice'), h = P('M18.6 21.4 21.4 18.6 29 26.2a2 2 0 0 1-2.8 2.8Z', 'wood'); return [h, S(h), l, Ci(13, 13, 9, 'line', { sw: 2.6 })]; },
  contract() { const s = P('M7 5h17v19.4c0 1.8-1 2.6-2.6 2.6H7Z', 'paper'); return [s, S(s), Bx(5, 3, 21, 3.8, 'paper', 1.9, { sw: 1.6 }), L('M10 10h10M10 13h10M10 16h6.4', { sw: 1 }), L('M9.6 21c1.4-2 2.4 1 3.6-.8s1.6.8 2.6-.2', { sw: 1 }), P('M19 25.4l-1.6 5.4 2.2-1 1 1.8.9-4.8Z', 'red', { sw: 1.1 }), P('M25 25.4l1.6 5.4-2.2-1-1 1.8-.9-4.8Z', 'red', { sw: 1.1 }), P(starD(22, 22.4, 6.2, 5, 12), 'red', { sw: 1.3 }), Ci(22, 22.4, 3.2, 'line', { sw: 0.9 })]; },
  fridge() { const b = Bx(8, 2.5, 16, 27, 'cream', 3); return [b, S(b), L('M8 12h16'), L('M11.6 6.4v2.8M11.6 15v6', { sw: 2.6 }), Ci(19.4, 19.5, 1.7, 'red'), L(flake(27.4, 5.4, 2.8), { sw: 1.1 })]; },
  // stall props
  chalkTicker() { const f = Bx(4, 3.5, 24, 17.5, 'gold', 1.6); return [P('M8.4 19h3.4l-2.9 10.5H5.5Z', 'wood'), P('M20.2 19h3.4l2.9 10.5h-3.4Z', 'wood'), f, S(f), Bx(6.6, 6, 18.8, 12.4, 'chalk', 0.6), LC('M9 15.6l3.4-3 2.8 1.8 4.6-4.6', 'cream', { sw: 1.3 }), P('M17.6 8.6h3.4v3.4Z', 'cream', { ns: true }), LC('M9 8.4h3.4', 'gold', { sw: 1.1 })]; },
  scaleProp() { return scalesParts(true); },
  plant() { const p = P('M9 20.6h14l-1.8 8.6H10.8Z', 'terra'); return [L('M16 20V9.6M16 15c-2-2-4.4-3-6.8-3.4M16 13.6c2.2-2.4 4.6-3.6 7.4-3.6', { sw: 1.4 }), leaf(8.4, 11.6, -62, 'leaf', 1.3), leaf(23.8, 9.6, 64, 'leaf', 1.3), leaf(16, 6.6, 0, 'leaf', 1.4), leaf(11.6, 17, -80, 'melon', 1.05), leaf(20.6, 16.4, 80, 'melon', 1.05), p, S(p), Bx(7.4, 17.6, 17.2, 3.6, 'terra', 1.2)]; },
  crates() {
    const big = Bx(3, 18, 26, 11, 'wood', 1.2), sm = Bx(4, 9, 11.6, 9, 'crate', 1.2), m = El(22.4, 13.4, 6.4, 4.6, 'melon');
    return [m, S(m), L('M18.6 10.2c1 2 1 4.6 0 6.4M22.4 8.8v9.2M26.2 10.2c-1 2-1 4.6 0 6.4', { sw: 1 }), Ci(7.4, 6.8, 2.6, 'red'), Ci(12.2, 6.8, 2.6, 'red'), sm, S(sm), L('M4 13.5h11.6', { sw: 1.3 }), big, S(big), L('M3 23.5h26'), L('M7.2 18v11M24.8 18v11', { sw: 1.4 })];
  },
  cat() {
    const tail = 'M22.6 28c4.4.2 6.8-2.4 6.6-6-.1-2-1.2-3.6-2.6-4.6';
    const body = P('M9 29.2c-1.5-6 .4-11.2 4-13.2h6c3.6 2 5.5 7.2 4 13.2Z', 'orange'), head = Ci(16, 12, 6.8, 'orange');
    return [L(tail, { sw: 5.6 }), LC(tail, 'orange', { sw: 3 }), body, S(body), El(16, 23, 2.6, 4.2, 'cream', { ns: true }), P('M10.4 8.8 9.8 2.6l5.2 3.6Z', 'orange'), P('M21.6 8.8l.6-6.2-5.2 3.6Z', 'orange'), head, S(head), Ci(13.5, 11.8, 1.1, 'ink'), Ci(18.5, 11.8, 1.1, 'ink'), P('M14.9 14.4h2.2L16 15.6Z', 'ink'), L('M8.4 14.4h3.4M8.8 16.8l3-.9M23.6 14.4h-3.4M23.2 16.8l-3-.9', { sw: 0.9 }), L('M14 29v-3.2M18 29v-3.2', { sw: 1.2 }), L('M16 5.6v2.4M13.6 6.2l.4 1.8M18.4 6.2l-.4 1.8', { sw: 1.1 })];
  },
  goldApple() {
    const T = 'transform="translate(4.6 -0.2) scale(.72)"';
    const a = P(APPLE, 'gold', { x: T, sw: 2.8 }), pl = Bx(6, 25.4, 20, 4.4, 'wood', 1.2);
    return [L('M16 10.5C15.8 8 16.6 5.6 18.2 4', { x: T, sw: 3 }), P('M17.6 7.2C18.6 4.2 22.4 3 25.4 3.8 24.6 7 21 8.4 17.6 7.2Z', 'leaf', { x: T, sw: 2 }), a, S(a), Bx(8.4, 22.6, 15.2, 3.2, 'wood', 0.8), pl, S(pl), P(starD(26.6, 6.4, 3.2, 1, 4), 'gold', { sw: 1.2 }), P(starD(5.2, 9.6, 2.4, 0.8, 4), 'gold', { sw: 1.1 })];
  },
};

// ---------- the renderer ----------

/** Fill colours by drawing role. 'awn' is the player's colour. */
const FILL: Record<string, string> = {
  gold: C.xBrass, moon: C.xBrassLight, straw: C.xStraw, red: C.xSeal, green: C.xLedger, leaf: C.xLeaf, melon: C.xMelon,
  terra: C.terracotta, wood: C.xWood, crate: C.c_d9b48a, sky: C.xSky, ice: C.xIce, cream: C.xPaper, paper: C.xPaper,
  skin: C.xSkin, grey: C.c_9aa3ad, chalk: C.xChalk, teal: C.teal, orange: C.c_e8873a, berry: C.xBerry, pink: C.c_e889b4,
};

interface RenderOpt { sw: number; awn?: string; fine: boolean }
const HATCH = `<pattern id="dh" width="1.9" height="1.9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width=".72" height="1.9" fill="${INK}"/></pattern>`;

function el(p: Shape, fill: string, stroke?: string, w = 0, extra = ''): string {
  const a = Object.entries(p.a).map(([k, v]) => `${k}="${v}"`).join(' ');
  const st = stroke ? ` stroke="${stroke}" stroke-width="${r2(w)}" stroke-linejoin="round" stroke-linecap="round"` : '';
  return `<${p.t} ${a}${p.x ? ' ' + p.x : ''} fill="${fill}"${st}${extra ? ' ' + extra : ''}/>`;
}

/** Draws parts in the engraved style. Fine: hatched shading; otherwise a darker tint (for small sizes). */
function render(parts: Part[], o: RenderOpt): string {
  const awn = o.awn ?? C.xRed;
  const col = (c: string) => (c === 'awn' ? awn : c === 'awnd' ? mix(awn, INK, 0.32) : FILL[c] ?? C.xPaper);
  let out = '';
  let n = 0;
  for (const p of parts) {
    if (isShade(p)) {
      const b = p.shade, id = `c${n++}`, lt = col(b.c), off = -(b.off ?? 2.2);
      const under = o.fine ? el(b, 'url(#dh)') : el(b, mix(lt, INK, 0.3));
      out += `<clipPath id="${id}">${el(b, INK)}</clipPath><g clip-path="url(#${id})">${under}<g transform="translate(${off} ${off})">${el(b, lt)}</g></g>`;
      if (!b.ns) out += el(b, 'none', INK, b.sw ?? o.sw);
      continue;
    }
    if (p.c === 'hi') continue;
    if (p.c === 'sh') { out += o.fine ? el(p, 'url(#dh)') : el(p, INK, undefined, 0, 'fill-opacity=".24"'); continue; }
    if (p.c === 'shadow') { out += el(p, INK, undefined, 0, 'fill-opacity=".18"'); continue; }
    if (p.c === 'ink') { out += el(p, INK); continue; }
    if (p.c.startsWith('line')) { const k = p.c.split(':')[1]; out += el(p, 'none', k ? col(k) : INK, (p.sw ?? o.sw)); continue; }
    out += el(p, col(p.c), p.ns ? undefined : INK, p.sw ?? o.sw);
  }
  return out;
}

const thicker = (parts: Part[], k: number): Part[] => parts.map((p) => (isShade(p) ? { shade: { ...p.shade, sw: p.shade.sw ? p.shade.sw * k : undefined } } : { ...p, sw: p.sw ? p.sw * k : undefined }));

function svgDoc(w: number, h: number, body: string, defs = '', vb = `0 0 ${w} ${h}`): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;
}
const toUrl = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;
const cache = new Map<string, string>();
const memo = (key: string, make: () => string) => { let v = cache.get(key); if (v === undefined) { v = make(); cache.set(key, v); } return v; };

// ---------- icons ----------

export type IconName = 'coin' | 'crate' | 'cart' | 'sun' | 'moon' | 'star' | 'heart' | 'hourglass' | 'ear' | 'lantern' | 'scales'
  | 'tag' | 'egg' | 'handcart' | 'coolroom' | 'signboard' | 'juicer'
  | 'fv_gossip' | 'fv_freeFruit' | 'fv_priority' | 'fv_scout' | 'fv_favouredTrade' | 'fv_fridge';

/** Which drawing each icon uses (the Exchange twists: token, trolley, medal star, ear trumpet, stock ticket, ...). */
export const ICON_GLYPH: Record<IconName, string> = {
  coin: 'token', crate: 'crate', cart: 'trolley', sun: 'sun', moon: 'moon', star: 'starMedal', heart: 'heart', hourglass: 'hourglass',
  ear: 'earTrumpet', lantern: 'lantern', scales: 'scales', tag: 'stockTag', egg: 'eggBond',
  handcart: 'handcart', coolroom: 'vault', signboard: 'tickerBoard', juicer: 'juicer',
  fv_gossip: 'gazette', fv_freeFruit: 'voucher', fv_priority: 'bellTicket', fv_scout: 'lens', fv_favouredTrade: 'contract', fv_fridge: 'fridge',
};
export const isIconName = (s: string): s is IconName => Object.prototype.hasOwnProperty.call(ICON_GLYPH, s);
export const ICON_NAMES: IconName[] = Object.keys(ICON_GLYPH).filter(isIconName);
/** Simpler drawings for the smallest sizes (11-16 px). */
const SMALL_GLYPH: Record<string, string> = { token: 'tokenSmall', earTrumpet: 'earSmall', stockTag: 'tagSmall', eggBond: 'eggSmall' };

/** How an icon is drawn at a size: 's' small (simpler drawing, bolder lines, tint), 'm' tint, 'l' hatched. */
export type Grade = 's' | 'm' | 'l';
export const gradeFor = (px: number): Grade => (px <= 16 ? 's' : px < 28 ? 'm' : 'l');

/** The drawing name an icon uses at a given size. */
export function glyphFor(name: IconName, px: number): string {
  const g = ICON_GLYPH[name];
  return gradeFor(px) === 's' ? SMALL_GLYPH[g] ?? g : g;
}

function glyphSvg(glyph: string, grade: Grade): string {
  const make = G[glyph];
  if (!make) return svgDoc(32, 32, '');
  const parts = grade === 's' ? thicker(make(), 1.2) : make();
  const fine = grade === 'l';
  return svgDoc(32, 32, render(parts, { sw: grade === 's' ? 2.3 : 1.8, fine }), fine ? HATCH : '');
}

/** An icon as a data-URI SVG for a display size in px. */
export function iconUrl(name: IconName, px: number): string {
  const grade = gradeFor(px);
  const glyph = glyphFor(name, px);
  return memo(`i-${glyph}-${grade}`, () => toUrl(glyphSvg(glyph, grade)));
}

// ---------- the lorry (64 x 36, two frames: the flags flutter and the wheels turn) ----------

export const LORRY_W = 64, LORRY_H = 36;
function lorryParts(frame: number): Part[] {
  const out: Part[] = [];
  out.push(El(33, 33.8, 28, 1.5, 'shadow'));
  out.push(Bx(31.6, 6.8, 30, 3.6, 'wood', 1.2), L('M33 10.4v11M60.4 10.4v11', { sw: 1.6 }), L('M32.6 11.4Q46.5 14.6 60.8 11.4', { sw: 0.9 }));
  const fl = ['teal', 'gold', 'red'];
  for (let i = 0; i < 7; i++) {
    const x = 33.6 + i * 3.8, y = 11.9 + Math.sin(((i + 0.5) / 7) * Math.PI) * 1.9, tip = frame ? (i % 2 ? -0.9 : 0.9) : 0;
    out.push(P(`M${r2(x)} ${r2(y)}h3l${r2(-1.5 + tip)} 3.8Z`, fl[i % 3], { sw: 0.9 }));
  }
  for (let i = 0; i < 4; i++) {
    const x = 32.6 + i * 7.2;
    if (i === 0) out.push(Ci(x + 1.8, 15.6, 1.8, 'red', { sw: 1 }), Ci(x + 4.6, 15.6, 1.8, 'red', { sw: 1 }));
    if (i === 1) out.push(El(x + 3.2, 15.2, 3, 2.2, 'melon', { sw: 1 }));
    if (i === 2) out.push(El(x + 3.2, 15.4, 2.8, 1.9, 'gold', { sw: 1 }));
    if (i === 3) out.push(Ci(x + 1.8, 16, 1.3, 'berry', { sw: 0.9 }), Ci(x + 4.4, 16, 1.3, 'berry', { sw: 0.9 }), Ci(x + 3.1, 14.4, 1.3, 'berry', { sw: 0.9 }));
    out.push(Bx(x, 17, 6.4, 4.6, 'crate', 0.6, { sw: 1.2 }));
  }
  const bed = Bx(30.6, 21.4, 31.4, 6.4, 'wood', 1);
  out.push(bed, S(bed), L('M38.4 21.4v6.4M46.2 21.4v6.4M54 21.4v6.4', { sw: 1.1 }));
  const cab = P('M13 28V13.4c0-1.4 1.1-2.5 2.5-2.5h12.6c1.4 0 2.5 1.1 2.5 2.5V28Z', 'red'), hood = P('M2.6 28v-6.6c0-1.6 1-2.6 2.6-2.9l7.8-1.2V28Z', 'red');
  out.push(hood, S(hood), cab, S(cab), Bx(16.4, 13.4, 11, 7.2, 'ice', 1.2, { sw: 1.4 }), Ci(21.4, 18.6, 2.6, 'skin', { sw: 1.2 }), P('M18.4 17.4c0-2.6 1.4-3.6 3-3.6s3 1 3 3.6Z', 'gold', { sw: 1.1 }), Bx(16.4, 13.4, 11, 7.2, 'line', 1.2, { sw: 1.4 }));
  out.push(Ci(4.6, 21.8, 1.4, 'gold', { sw: 1 }), L('M6.6 23.6h4.6M6.6 25.4h4.6', { sw: 0.9 }), Ci(22, 24.6, 1.8, 'gold', { sw: 1 }), Bx(1.6, 26.4, 12, 2.6, 'cream', 1, { sw: 1.2 }), Bx(12, 27, 50, 2.4, 'ink'));
  // a brass trim along the bonnet (the owner asked for no lettering on the lorry)
  out.push(Bx(2.6, 20.6, 10.4, 0.9, 'gold', 0, { ns: true }));
  for (const cx of [10, 50]) {
    out.push(Ci(cx, 29.2, 4.8, 'ink'), Ci(cx, 29.2, 2.1, 'gold', { sw: 0.9 }));
    out.push(LC(frame ? `M${cx - 1.5} 27.7l3 3M${cx + 1.5} 27.7l-3 3` : `M${cx} 27.1v4.2M${cx - 2.1} 29.2h4.2`, 'cream', { sw: 0.8 }));
  }
  return out;
}
/** One lorry frame (0 or 1) as a data-URI SVG. */
export function lorryUrl(frame: 0 | 1): string {
  return memo(`lorry-${frame}`, () => toUrl(svgDoc(LORRY_W, LORRY_H, render(lorryParts(frame), { sw: 1.5, fine: false }))));
}

// ---------- stall roofs and trims (tiles: roof 16 x 14, trims 24 / 16 / 8 wide x 12) ----------

const RBASE = () => [Bx(0, 0, 16, 2.6, 'wood', 0, { ns: true })];
const RLINES = (bottom = true) => [L('M-1 .4H17', { sw: 1.4 }), L('M-1 2.6H17', { sw: 1.2 }), ...(bottom ? [L('M-1 11.6H17', { sw: 1.4 })] : [])];
const SHADE = (y: number): Shape => ({ t: 'rect', a: { x: 0, y, width: 16, height: r2(11.6 - y) }, c: 'sh' });
const RIVETS = () => [Ci(4, 1.3, 0.7, 'gold', { sw: 0.35 }), Ci(12, 1.3, 0.7, 'gold', { sw: 0.35 })];

const ROOF_PARTS: Record<string, () => Part[]> = {
  default: () => [...RBASE(), Bx(0, 2.6, 16, 9, 'awn', 0, { ns: true }), SHADE(9.4), ...RLINES()],
  roof_stripes: () => [...RBASE(), Bx(0, 2.6, 8, 9, 'awn', 0, { ns: true }), Bx(8, 2.6, 8, 9, 'paper', 0, { ns: true }), SHADE(9.4), L('M8 2.6v9M16 2.6v9', { sw: 1.1 }), ...RLINES()],
  roof_scallops: () => [...RBASE(), P('M0 2.6h16v6.8a4 4 0 0 1-8 0 4 4 0 0 1-8 0Z', 'awn', { ns: true }), P('M0 9.4a4 4 0 0 0 8 0 4 4 0 0 0 8 0v-1.6a4 4 0 0 1-8 0 4 4 0 0 1-8 0Z', 'sh'), L('M0 9.4a4 4 0 0 0 8 0 4 4 0 0 0 8 0', { sw: 1.4 }), LC('M4 3v9.4M12 3v9.4', 'awnd', { sw: 0.8 }), ...RLINES(false)],
  roof_checks: () => [...RBASE(), Bx(0, 2.6, 16, 9, 'awn', 0, { ns: true }), Bx(0, 2.6, 4, 4.5, 'paper', 0, { ns: true }), Bx(8, 2.6, 4, 4.5, 'paper', 0, { ns: true }), Bx(4, 7.1, 4, 4.5, 'paper', 0, { ns: true }), Bx(12, 7.1, 4, 4.5, 'paper', 0, { ns: true }), SHADE(10.2), ...RLINES()],
  roof_stars: () => [...RBASE(), Bx(0, 2.6, 16, 9, 'awn', 0, { ns: true }), SHADE(9.6), P(starD(8, 6.8, 3.6, 1.5), 'gold', { sw: 1 }), ...RLINES()],
  roof_fruit: () => [...RBASE(), Bx(0, 2.6, 16, 9, 'awn', 0, { ns: true }), SHADE(9.6), Ci(4.4, 7, 2.3, 'red', { sw: 1 }), LC('M4.6 4.8l.6-1.2', 'leaf', { sw: 1 }), Ci(11.6, 7, 2.3, 'berry', { sw: 1 }), ...RLINES()],
};
/** Trims hang under the roof: ticker-tape bunting, brass bells for lanterns, tassels in the roof's own colour. */
const TRIM_PARTS: Record<string, { w: number; parts: () => Part[] }> = {
  trim_bunting: { w: 24, parts: () => [L('M-1 1Q12 4.2 25 1', { sw: 1 }), P('M2 1.6h5l-2.5 6Z', 'paper', { sw: 1 }), L('M3.4 3.2h2.2M3.9 4.6h1.2', { sw: 0.55 }), P('M9.5 2.6h5l-2.5 6Z', 'gold', { sw: 1 }), P('M17 1.6h5l-2.5 6Z', 'paper', { sw: 1 }), L('M18.4 3.2h2.2M18.9 4.6h1.2', { sw: 0.55 })] },
  trim_lanterns: { w: 16, parts: () => [L('M8 0v2.4', { sw: 1 }), P('M4.4 9.6c.6-.8.8-2 .8-3.6 0-1.8 1.2-3 2.8-3s2.8 1.2 2.8 3c0 1.6.2 2.8.8 3.6Z', 'gold', { sw: 1 }), Bx(3.8, 9.2, 8.4, 1.2, 'gold', 0.6, { sw: 0.8 }), Ci(8, 11.2, 0.9, 'ink')] },
  trim_tassels: { w: 8, parts: () => [LC('M4 0v5.6', 'awnd', { sw: 1.4 }), Ci(4, 6.6, 1.5, 'gold', { sw: 0.8 }), P('M2.9 7.8h2.2l.7 3.6H2.2Z', 'gold', { sw: 0.8 })] },
};
export const ROOF_IDS = Object.keys(ROOF_PARTS).filter((k) => k !== 'default');
export const TRIM_IDS = Object.keys(TRIM_PARTS);
const ROOF_TILE_H = 14, ROOF_EDGE = 12, TRIM_TILE_H = 12;

/** A repeating band tile for the top of a stall: width and height in drawing units, plus its data URI. */
export function bandTile(colour: string, roof?: string, trim?: string, fine = false): { w: number; h: number; url: string } {
  const r = roof && ROOF_PARTS[roof] ? roof : 'default';
  const t = trim && TRIM_PARTS[trim] ? TRIM_PARTS[trim] : undefined;
  const w = t ? (t.w % 16 === 0 ? t.w : t.w === 8 ? 16 : 48) : 16;
  const h = t ? ROOF_EDGE + TRIM_TILE_H : ROOF_TILE_H;
  const url = memo(`band-${colour}-${r}-${trim ?? ''}-${fine ? 1 : 0}`, () => {
    const o = { sw: 1.2, awn: colour, fine };
    const roofTile = render(ROOF_PARTS[r](), o) + render(RIVETS(), { ...o, sw: 0.35 });
    let body = '';
    for (let x = 0; x < w; x += 16) body += `<g transform="translate(${x} 0)">${roofTile}</g>`;
    if (t) { const tile = render(t.parts(), o); for (let x = 0; x < w; x += t.w) body += `<g transform="translate(${x} ${ROOF_EDGE})">${tile}</g>`; }
    return toUrl(svgDoc(w, h, body, fine ? HATCH : ''));
  });
  return { w, h, url };
}

// ---------- stall props (32 x 32) ----------

const PROP_GLYPH: Record<string, string> = {
  prop_blackboard: 'chalkTicker', prop_scale: 'scaleProp', prop_plant: 'plant', prop_crates: 'crates', prop_cat: 'cat', prop_golden_apple: 'goldApple',
};
export const PROP_IDS = Object.keys(PROP_GLYPH);
/** A counter prop as a data-URI SVG, or null for an unknown prop. Hatched at 40 px and up. */
export function propUrl(id: string, px: number): string | null {
  const g = PROP_GLYPH[id];
  if (!g) return null;
  const grade: Grade = px >= 40 ? 'l' : 'm';
  return memo(`p-${g}-${grade}`, () => toUrl(glyphSvg(g, grade)));
}

// ---------- worn regalia, drawn on the portrait (160 x 160 units; the portrait circle is r 79 at 80, 80) ----------

const W = {
  Y: C.xMustard, Yd: C.xMustardDark, Yl: C.xBrassBright, R: C.xRed, Rd: C.xRedDark, G: C.xGreen, Gl: C.xLeaf, Wh: C.xPaper, Wd: C.xPaperShade,
  N: C.xInk2, H: C.xHat, Hl: C.xHatLight, O: C.c_e8873a, B: C.xBerry, I: C.xIce, NG: C.xNote, NGd: C.xNoteDark, white: C.c_ffffff,
};
const pth = (d: string, f: string, sw = 4, ex = '') => `<path d="${d}" fill="${f}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"${ex}/>`;
const cir = (cx: number, cy: number, r: number, f: string, sw = 4, ex = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}" stroke="${INK}" stroke-width="${sw}"${ex}/>`;
const eli = (cx: number, cy: number, rx: number, ry: number, f: string, sw = 4, ex = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}" stroke="${INK}" stroke-width="${sw}"${ex}/>`;
const ln = (d: string, sw = 3, c: string = INK, ex = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${ex}/>`;
const tape = (d: string, w = 7) => ln(d, w + 3.5) + ln(d, w, W.Wh) + ln(d, w * 0.55, INK, ' stroke-dasharray="1.2 4.2" opacity=".75"');
const leafE = (x: number, y: number, a: number, f: string, s = 1) => `<ellipse cx="0" cy="0" rx="${8 * s}" ry="${3.8 * s}" fill="${f}" stroke="${INK}" stroke-width="2.6" transform="translate(${x} ${y}) rotate(${a})"/>`;
function laurelSide(f: string, mirror: boolean): string {
  const pts = [[-6, -13, -8], [-17, -13, -22], [-28, -10, -36], [-38, -4, -50], [-46, 5, -64], [-51, 15, -78], [-53, 25, -90]];
  let s = ln('M-2 -11C-26 -14 -48 -2 -54 28', 3.4);
  pts.forEach(([x, y, a], i) => {
    const o = i % 2 ? 4 : -4;
    s += leafE(r2(x + o * Math.sin((a * Math.PI) / 180)), r2(y - o * Math.cos((a * Math.PI) / 180)), a + (i % 2 ? 18 : -18), f);
  });
  return mirror ? `<g transform="scale(-1 1)">${s}</g>` : s;
}

/** Where a piece sits: on the head (hat brim), the forehead (visor), the eye, the ear, or the chin and neck. */
type Spot = 'hat' | 'laurel' | 'visor' | 'eye' | 'ear' | 'neck';

/** The regalia for each look id (the ids stay as they were, so earned looks and saves keep working). */
export const REGALIA: Record<string, { spot: Spot; draw: () => string }> = {
  // Trader's bowler with a press ticket in the band
  straw_boater: { spot: 'hat', draw: () => pth('M-56 -2Q-50 9 -30 7H30Q50 9 56 -2Q40 -9 0 -9Q-40 -9 -56 -2Z', W.H) + pth('M-33 -4C-36 -46 36 -46 33 -4Z', W.H) + pth('M-33.5 -14C-20 -10 20 -10 33.5 -14L33 -4C20 0 -20 0 -33 -4Z', W.Y, 3.4) + `<g transform="rotate(12 20 -20)">${pth('M14 -30h13v17h-13Z', W.Wh, 2.6) + ln('M17 -25h7M17 -21h7M17 -17h4', 1.6)}</g>` + ln('M-22 -28C-16 -35 -6 -38 3 -38', 3.4, W.Hl) },
  // Porter's pillbox cap with gold braid and a fruit cockade
  fruit_basket_hat: { spot: 'hat', draw: () => pth('M-34 0V-28Q-34 -34 -28 -34H28Q34 -34 34 -28V0Z', W.R) + eli(0, -34, 34, 6, C.xCapTop, 3.4) + pth('M-34 -12H34V-4H-34Z', W.Y, 3) + ln('M-34 -8H34', 1.4, W.Yd, ' stroke-dasharray="3 3"') + cir(0, -21, 7.5, W.Y, 3) + cir(0, -21, 3, W.R, 1.8) + pth('M-30 0Q0 11 30 0Q0 5 -30 0Z', INK, 2) + cir(29, -31, 7, W.O, 3) + cir(35, -24, 6, W.R, 3) + leafE(32, -40, -50, W.Gl, 0.8) },
  // A hat folded from the Gazette's front page
  party_hat: { spot: 'hat', draw: () => pth('M-50 2L0 -50L50 2Z', W.Wh) + ln('M-24 -18H24M-15 -27H15M-7 -36H7', 2.6, C.xNewsGrey) + pth('M-20 -14H20V-6H-20Z', W.R, 2.4) + pth('M-54 0H54V12H-54Z', W.Wd, 3.4) + `<text x="0" y="9.6" text-anchor="middle" font-family="Rubik,Arial,sans-serif" font-weight="800" font-size="10" fill="${W.R}" letter-spacing="1">GAZETTE</text>` },
  // Brass laurel woven with ticker tape
  laurel: { spot: 'laurel', draw: () => tape('M-56 26C-52 -6 -22 -18 0 -16C22 -18 52 -6 56 26', 6) + laurelSide(W.Y, false) + laurelSide(W.Y, true) + cir(0, -14, 5, W.R, 2.6) },
  // Chairman's top hat with a crown-point gold band
  gold_crown: { spot: 'hat', draw: () => pth('M-50 0Q-50 8 -36 8H36Q50 8 50 0Q30 -6 0 -6Q-30 -6 -50 0Z', W.H) + pth('M-29 -3L-31 -60H31L29 -3Z', W.H) + eli(0, -60, 31, 5, W.Hl, 3.4) + pth('M-30.5 -12H30.5V-22L21 -29L11 -22L0 -31L-11 -22L-21 -29L-30.5 -22Z', W.Y, 3.4) + cir(0, -18, 2.6, W.R, 1.8) + ln('M-21 -52V-34', 3.4, W.Hl) },
  // A brass loupe on a beaded chain, with a lot ticket
  monocle: { spot: 'eye', draw: () => `<circle r="15" fill="${W.I}" fill-opacity=".3"/>` + cir(0, 0, 16, 'none', 12) + `<circle r="16" fill="none" stroke="${W.Y}" stroke-width="7.5"/><circle r="16" fill="none" stroke="${W.Yd}" stroke-width="1.4" stroke-dasharray="1.6 2.4"/>` + ln('M14 10C20 20 22 30 24 40', 4.4) + ln('M14 10C20 20 22 30 24 40', 2.2, W.Y, ' stroke-dasharray="2 2"') + `<g transform="rotate(-10 24 48)">${pth('M17 40h15v14h-15Z', W.Wh, 2.6) + ln('M20 45h9M20 49h6', 1.6)}</g>` + ln('M-9 -6Q-7 -10 -2 -11', 2.4, W.white) },
  // A bow tie folded from a green banknote, gold knot
  bow_tie: { spot: 'neck', draw: () => pth('M0 0L-30 -14Q-34 0 -30 14Z', W.NG) + pth('M0 0L30 -14Q34 0 30 14Z', W.NG) + ln('M-4 -2L-25 -10Q-28 0 -25 10L-4 2M4 -2L25 -10Q28 0 25 10L4 2', 1.4, W.Wh) + ln('M-24 -2q2.5-3 5 0t5 0 5 0M9 -2q2.5-3 5 0t5 0 5 0M-24 3q2.5-3 5 0t5 0 5 0M9 3q2.5-3 5 0t5 0 5 0', 1.1, W.NGd) + pth('M-6 -9H6V9H-6Z', W.Y, 3.4) + ln('M-2 -4h4M-2 0h4M-2 4h4', 1.2, W.Yd) },
  // A long loop of ticker tape
  scarf: { spot: 'neck', draw: () => tape('M20 2C26 14 22 28 30 44', 9) + tape('M-44 -4Q0 16 44 -4', 10) + tape('M-40 6Q0 26 40 6', 8) },
  // Floor trader's green waistcoat with brass buttons
  apron: { spot: 'neck', draw: () => pth('M-16 -6L0 16L16 -6Z', W.Wh, 3.4) + pth('M-16 -6L-48 2L-48 46H0V16Z', W.G) + pth('M16 -6L48 2L48 46H0V16Z', W.G) + cir(-4, 26, 2.8, W.Y, 1.8) + cir(-4, 37, 2.8, W.Y, 1.8) + pth('M-40 22h16v4h-16Z', W.Y, 2) + pth('M24 18l14-2v12l-14 2Z', W.Wh, 2.4) + ln('M27 21.5l8-1M27 25l6-.8', 1.3) },
  // Certificate-ribbon sash with a wax seal
  sash: { spot: 'neck', draw: () => pth('M-64 -12Q-8 22 62 10L62 30Q-10 42 -66 8Z', W.Wh) + ln('M-64 -7Q-8 27 62 14.5', 1.3, W.G) + ln('M-65 3Q-10 37 62 25.5', 1.3, W.G) + ln('M-30 8Q0 30 50 20', 1.1, W.NGd, ' stroke-dasharray="3 2"') + `<path d="${starD(-42, 8, 13, 10.5, 14)}" fill="${W.R}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` + cir(-42, 8, 6.5, C.xWax, 2) + ln('M-45 8h6M-42 5v6', 1.6, C.xWaxLight) },
  // Brass Exchange medal with the bell, on a navy-and-red ribbon
  medal: { spot: 'neck', draw: () => '<g transform="scale(1.35)">' + pth('M-12 -6L-1 14L6 12L-4 -6Z', W.N, 3) + ln('M-8 -6L1 13', 1.8, W.R) + pth('M12 -6L1 14L-6 12L4 -6Z', W.N, 3) + ln('M8 -6L-1 13', 1.8, W.R) + `<g transform="translate(0 24)">${cir(0, 0, 13, W.Y) + Array.from({ length: 18 }, (_, i) => { const a = (i * Math.PI) / 9; return `<circle cx="${r2(Math.cos(a) * 10.6)}" cy="${r2(Math.sin(a) * 10.6)}" r="1.1" fill="${W.Yd}"/>`; }).join('') + pth('M-5 4c1-1.4 1.2-3 1.2-5.2 0-2.6 1.6-4.4 3.8-4.4s3.8 1.8 3.8 4.4c0 2.2.2 3.8 1.2 5.2Z', W.Yl, 2) + `<circle cy="5.6" r="1.4" fill="${INK}"/>`}</g>` + '</g>' },

  // New Exchange unlockables (PLAN-053)
  trader_visor: { spot: 'visor', draw: () => pth('M-46 2Q0 -8 46 2L46 9Q0 -1 -46 9Z', W.G, 3.4) + `<path d="M-40 7Q0 -3 40 7Q30 25 0 26Q-30 25 -40 7Z" fill="${C.xVisor}" fill-opacity=".72" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>` + ln('M-34 12Q0 4 34 12', 1.6, C.xVisorLight) + ln('M-46 5.5Q0 -4.5 46 5.5', 1.4, W.Y) },
  pocket_watch: { spot: 'neck', draw: () => ln('M-14 -4C-10 14 10 20 26 16', 4.6) + ln('M-14 -4C-10 14 10 20 26 16', 2.4, W.Y, ' stroke-dasharray="2.4 1.6"') + cir(30, 24, 3, W.Y, 2.4) + `<g transform="translate(32 36)">${cir(0, 0, 13, W.Y) + cir(0, 0, 9.4, W.Wh, 2) + ln('M0 0V-6M0 0L4 2', 1.8) + cir(0, -15, 2.6, W.Y, 1.8)}</g>` },
  hand_bell: { spot: 'neck', draw: () => `<g transform="translate(10 -6) translate(-46 0) scale(1.3) translate(46 0)"><g transform="rotate(-18 -46 -6)">${pth('M-49 -34h6v14h-6Z', C.xWoodDark, 3) + pth('M-60 8c2-3 3-7 3-14 0-8 5-13 11-13s11 5 11 13c0 7 1 11 3 14Z', W.Y) + pth('M-62 8h32v5h-32Z', W.Yd, 3) + cir(-46, 16, 3.4, W.Yd, 2.4) + ln('M-52 -6c0-4 2-7 4-8', 2.4, W.Yl)}</g>` + ln('M-70 -24l-6-4M-72 -12h-7M-26 -28l5-5', 2.6) + '</g>' },
  ticker_garland: { spot: 'neck', draw: () => tape('M-52 -8Q0 30 52 -8', 8) + pth('M-30 8l6 10l4-10Z', W.R, 2.4) + pth('M-6 15l5 10l5-10Z', W.Y, 2.4) + pth('M20 11l5 10l4-10Z', W.G, 2.4) },
  member_badge: { spot: 'neck', draw: () => '<g transform="scale(1.3)">' + pth('M18 4h8l-2 10h-4Z', W.R, 2.6) + `<g transform="translate(26 24)">${eli(0, 0, 14, 11, W.Y) + eli(0, 0, 10, 7.4, 'none', 1.6) + `<text x="0" y="3.2" text-anchor="middle" font-family="Rubik,Arial,sans-serif" font-weight="800" font-size="9" fill="${INK}">7</text>`}</g></g>` },
  pencil_slip: { spot: 'ear', draw: () => `<g transform="rotate(-38)">${pth('M-4 -6h9v-38h-9Z', W.Y, 3) + pth('M-4 -44h9v-6c0-2-2-3-4.5-3s-4.5 1-4.5 3Z', C.c_e889b4, 3) + pth('M-4 -6l4.5 9 4.5-9Z', W.Wd, 2.6)}</g>` + `<g transform="rotate(14 8 -20)">${pth('M6 -36h14v20h-14Z', W.Wh, 2.6) + ln('M9 -31h8M9 -27h8M9 -23h5', 1.4)}</g>` },
};

/** Fitting points on each shopkeeper's portrait (160 x 160): hat brim (x, y, width), eye (x, y, radius), chin (x, y, scale), ear (x, y). */
interface Anchor { hat: [number, number, number]; eye: [number, number, number]; neck: [number, number, number]; ear: [number, number] }
const ANCHORS: Record<string, Anchor> = {
  rosa: { hat: [84, 64, 106], eye: [98, 118, 11], neck: [85, 151, 1], ear: [127, 114] },
  benny: { hat: [80, 68, 112], eye: [100, 111, 9], neck: [82, 155, 1.05], ear: [140, 116] },
  chen: { hat: [82, 66, 98], eye: [98, 107, 10], neck: [82, 153, 0.95], ear: [128, 114] },
  saleh: { hat: [82, 58, 94], eye: [96, 108, 11], neck: [82, 157, 0.9], ear: [124, 108] },
  raj: { hat: [82, 50, 112], eye: [98, 112, 12], neck: [82, 156, 1], ear: [138, 114] },
  kiran: { hat: [80, 64, 100], eye: [96, 108, 11], neck: [80, 151, 1], ear: [124, 114] },
};
function place(spot: Spot, a: Anchor, inner: string): string {
  if (spot === 'hat') return `<g transform="translate(${a.hat[0]} ${a.hat[1]}) scale(${r2(a.hat[2] / 100)})">${inner}</g>`;
  if (spot === 'laurel') return `<g transform="translate(${a.hat[0]} ${a.hat[1] + 10}) scale(${r2(a.hat[2] / 100)})">${inner}</g>`;
  if (spot === 'visor') return `<g transform="translate(${a.hat[0]} ${a.hat[1] + 5}) scale(${r2(a.hat[2] / 100)})">${inner}</g>`;
  if (spot === 'eye') return `<g transform="translate(${a.eye[0]} ${a.eye[1]}) scale(${r2(a.eye[2] / 12)})">${inner}</g>`;
  if (spot === 'ear') return `<g transform="translate(${a.ear[0]} ${a.ear[1]})">${inner}</g>`;
  return `<g transform="translate(${a.neck[0]} ${a.neck[1]}) scale(${a.neck[2]})">${inner}</g>`;
}
/** Drawing order: neck pieces first, headwear last (over everything). */
const SPOT_ORDER: Spot[] = ['neck', 'ear', 'eye', 'visor', 'laurel', 'hat'];

/** The overlay box around the portrait, in portrait units: x, y, width, height (the portrait is 0 0 160 160). */
export const WEAR_BOX = [-16, -16, 192, 208] as const;

/** All the given looks drawn for one shopkeeper (their art file key, e.g. 'rosa'), as one data-URI SVG. Null if none. */
export function wearUrl(shopKey: string | null, ids: string[]): string | null {
  const known = ids.filter((id) => REGALIA[id]);
  if (!known.length) return null;
  const key = shopKey && ANCHORS[shopKey] ? shopKey : 'rosa';
  const sorted = [...known].sort((x, y) => SPOT_ORDER.indexOf(REGALIA[x].spot) - SPOT_ORDER.indexOf(REGALIA[y].spot));
  return memo(`w-${key}-${sorted.join('+')}`, () => {
    const body = sorted.map((id) => place(REGALIA[id].spot, ANCHORS[key], REGALIA[id].draw())).join('');
    const [x, y, w, h] = WEAR_BOX;
    return toUrl(svgDoc(w, h, body, '', `${x} ${y} ${w} ${h}`));
  });
}
