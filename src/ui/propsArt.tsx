// Pixel-art props drawn in code: the Sunny Pickup lorry with a bunting roof, the market stall with a tiled roof and
// sign, and the tile band that tops a stall panel (DEC-052, PLAN-038). Every shape is painted on a small grid and
// gets a 1 px ink outline, like the sprites in pixel.tsx. Each sprite becomes one small SVG image (a data URI), so it
// costs one element on the page, not hundreds (the game screen has a DOM budget). A stall's roof takes the player's colour.
import { FRUIT } from '../engine/data';
import { C } from './palette';

type Cell = string | null;
interface Rect { x: number; y: number; w: number; c: string }

const INK = C.ink, PAPER = C.paper, TERRA = C.terracotta, TERRAD = C.c_93392a, TEAL = C.teal, GOLD = C.gold;
const WOOD = C.c_a86b45, WOODL = C.c_c9935f, CRATE = C.c_d9b48a, SKY = C.c_9ad0e6, SKIN = C.c_f0b48c;
const RED = C.c_d6453b, BLUE = C.c_5562c9, MANGO = C.c_f0b33a, GREY = C.c_b8c0c9, BACK = C.c_eadcbd;
const GREEN = FRUIT.watermelon.color;

/** Blend two #rrggbb colours: 0 is all `h`, 1 is all `t`. */
export function mix(h: string, t: string, a: number): string {
  const n = parseInt(h.slice(1), 16), m = parseInt(t.slice(1), 16);
  const f = (s: number) => Math.round(((n >> s) & 255) * (1 - a) + ((m >> s) & 255) * a);
  return '#' + [16, 8, 0].map((s) => f(s).toString(16).padStart(2, '0')).join('');
}
const GREEND = mix(GREEN, INK, 0.35);

/** The three roof tones a stall needs from its one colour. */
function roofTones(colour: string): Record<string, string> {
  return { 'var(--awn)': colour, 'var(--awn-l)': mix(colour, C.paper, 0.28), 'var(--awn-d)': mix(colour, C.ink, 0.28) };
}
const AWN = 'var(--awn)', AWN_L = 'var(--awn-l)', AWN_D = 'var(--awn-d)';

interface Pen {
  P: (x: number, y: number, c: Cell) => void;
  R: (x: number, y: number, w: number, h: number, c: string, shade?: boolean) => void;
  C: (cx: number, cy: number, r: number, c: string) => void;
  X: (y: number, x0: number, x1: number, c: string) => void;
  frame: number;
}

function paint(W: number, H: number, draw: (d: Pen) => void, frame = 0): Rect[] {
  const g: Cell[][] = Array.from({ length: H }, () => Array<Cell>(W).fill(null));
  const P = (x: number, y: number, c: Cell) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
  const R = (x: number, y: number, w: number, h: number, c: string, shade?: boolean) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) P(x + i, y + j, shade && j === 0 && h > 2 ? mix(c, PAPER, 0.28) : shade && j === h - 1 && h > 2 ? mix(c, INK, 0.2) : c);
  };
  const Cc = (cx: number, cy: number, r: number, c: string) => {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) P(cx + x, cy + y, c);
  };
  const X = (y: number, x0: number, x1: number, c: string) => { for (let x = x0; x <= x1; x++) P(x, y, c); };
  draw({ P, R, C: Cc, X, frame });
  const o = g.map((r) => r.slice());
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!g[y][x]) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = g[y + dy]?.[x + dx];
      if (c && c !== INK) { o[y][x] = INK; break; }
    }
  }
  const rects: Rect[] = [];
  o.forEach((row, y) => {
    let x = 0;
    while (x < W) {
      const c = row[x];
      if (!c) { x++; continue; }
      let n = 1;
      while (x + n < W && row[x + n] === c) n++;
      rects.push({ x, y, w: n, c });
      x += n;
    }
  });
  return rects;
}

const apple = (d: Pen, x: number, y: number) => { d.R(x, y + 1, 3, 2, RED); d.P(x + 1, y, RED); d.P(x + 2, y, GREEN); d.P(x, y + 1, mix(RED, PAPER, 0.4)); };
const melon = (d: Pen, x: number, y: number, s = 5) => {
  d.R(x, y, s, s, GREEN); d.R(x + 1, y, 1, s, GREEND); d.R(x + 3, y, 1, s, GREEND);
  d.P(x, y, null); d.P(x + s - 1, y, null); d.P(x, y + s - 1, null); d.P(x + s - 1, y + s - 1, null);
};
const mango = (d: Pen, x: number, y: number) => { d.R(x, y, 4, 3, MANGO); d.P(x, y, null); d.P(x + 3, y + 2, null); d.P(x + 1, y, mix(MANGO, PAPER, 0.45)); };
const berry = (d: Pen, x: number, y: number) => { d.R(x, y + 1, 2, 2, BLUE); d.R(x + 2, y + 1, 2, 2, BLUE); d.R(x + 1, y, 2, 2, BLUE); d.P(x + 1, y, mix(BLUE, PAPER, 0.4)); };
const crate = (d: Pen, x: number, y: number, w: number, h: number) => { d.R(x, y, w, h, CRATE, true); d.R(x, y + Math.floor(h / 2), w, 1, WOOD); };
const wheel = (d: Pen, cx: number, cy: number, r: number, hub: string) => {
  d.C(cx, cy, r, INK); d.P(cx, cy, hub);
  const spokes = d.frame === 0 ? [[-1, 0], [1, 0], [0, -1], [0, 1]] : [[-1, -1], [1, 1], [-1, 1], [1, -1]];
  for (const [dx, dy] of spokes) d.P(cx + dx, cy + dy, GREY);
};
const driver = (d: Pen, x: number, y: number, hat: string) => {
  d.R(x, y, 3, 3, SKIN); d.P(x, y + 1, INK); d.P(x + 2, y + 1, INK); d.R(x - 1, y - 1, 5, 1, hat); d.P(x + 1, y + 2, mix(SKIN, INK, 0.35));
};

// ---------- the lorry: Sunny Pickup with a bunting roof (54 x 31 art pixels) ----------
export const LORRY_W = 54, LORRY_H = 31;
function drawLorry(d: Pen) {
  // roof first, so the cargo and the cab sit over it
  d.R(27, 4, 26, 4, WOODL, true);
  for (const x of [33, 39, 45]) { d.P(x, 5, WOOD); d.P(x, 6, WOOD); }
  d.R(28, 8, 1, 7, WOOD); d.R(51, 8, 1, 7, WOOD); d.R(28, 8, 24, 1, WOOD);
  const flags = [TEAL, GOLD, TERRA];
  for (let i = 0; i < 8; i++) {
    const x = 29 + i * 3, c = flags[i % 3];
    d.R(x, 9, 3, 1, c);
    d.P(d.frame === 0 ? x + 1 : x + (i % 2 ? 0 : 2), 10, c); // the flags flutter between the two frames
  }
  // cargo
  [[29, 'a'], [35, 'm'], [41, 'w'], [47, 'b']].forEach(([x, t]) => {
    const px = x as number;
    crate(d, px, 15, 5, 4);
    if (t === 'a') { apple(d, px, 12); apple(d, px + 2, 12); }
    if (t === 'm') melon(d, px, 10, 5);
    if (t === 'w') { mango(d, px, 12); mango(d, px + 1, 10); }
    if (t === 'b') berry(d, px, 11);
  });
  d.R(28, 19, 24, 7, WOODL, true);
  for (let x = 32; x < 52; x += 4) d.R(x, 20, 1, 5, WOOD);
  // cab
  d.R(13, 12, 16, 13, TERRA, true); d.R(15, 14, 10, 6, SKY); d.P(15, 14, mix(SKY, PAPER, 0.6)); driver(d, 19, 16, GOLD);
  d.R(3, 18, 11, 7, TERRA, true); d.R(3, 19, 2, 2, GOLD); d.R(2, 24, 9, 2, PAPER); d.R(3, 22, 26, 1, PAPER);
  wheel(d, 10, 26, 4, GOLD); wheel(d, 43, 26, 4, GOLD);
}
export const LORRY_A = paint(LORRY_W, LORRY_H, drawLorry, 0);
export const LORRY_B = paint(LORRY_W, LORRY_H, drawLorry, 1);

// ---------- the stall: tiled roof and sign (44 x 38 art pixels) ----------
export const STALL_W = 44, STALL_H = 38;
function drawStall(d: Pen) {
  // roof: tiles in the player's colour, and a sign board with an apple
  d.R(1, 5, 42, 5, AWN);
  d.X(5, 1, 42, AWN_L);
  for (let x = 3; x <= 40; x += 4) { d.P(x, 6, AWN_D); d.P(x + 2, 7, AWN_D); d.P(x, 8, AWN_D); }
  d.X(9, 1, 42, AWN_D);
  d.R(14, 1, 16, 4, PAPER); d.X(2, 16, 21, TERRAD); d.X(3, 16, 21, TERRAD); d.R(24, 1, 4, 3, RED); d.P(25, 0, null); d.P(26, 1, GREEN);
  // posts, back wall, counter, crates
  d.R(3, 10, 2, 25, WOOD); d.R(39, 10, 2, 25, WOOD);
  d.R(5, 11, 34, 17, BACK); d.R(5, 11, 34, 1, mix(BACK, INK, 0.15));
  d.R(2, 27, 40, 9, WOODL, true); d.X(27, 1, 42, CRATE);
  for (let x = 7; x < 40; x += 6) d.R(x, 29, 1, 6, WOOD);
  crate(d, 4, 23, 9, 4); apple(d, 5, 20); apple(d, 8, 20); apple(d, 10, 19);
  crate(d, 31, 23, 9, 4); melon(d, 32, 18, 5); mango(d, 37, 21);
  d.R(15, 35, 14, 2, PAPER);
}
export const STALL = paint(STALL_W, STALL_H, drawStall);
/** Where the shopkeeper's portrait sits on the stall, in art pixels (it is 16 x 16). */
export const STALL_FACE = { x: 14, y: 11 };

// ---------- the tile band on top of a stall panel (4 x 7 art pixels, repeated) ----------
const BAND_H = 7;
const BAND = paint(4, BAND_H, (d) => {
  d.X(0, 0, 3, AWN_L);
  d.R(0, 1, 4, 5, AWN);
  d.P(0, 3, AWN_D); d.P(2, 4, AWN_D); d.P(0, 5, AWN_D);
  d.X(6, 0, 3, AWN_D);
});

/** One sprite as a data-URI SVG. `tones` swaps the roof placeholders for a player's colours. */
function toUrl(rects: Rect[], w: number, h: number, shadow: boolean, tones?: Record<string, string>): string {
  const body = rects.map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="1" fill="${tones?.[r.c] ?? r.c}"/>`).join('');
  const sh = shadow ? `<rect x="3" y="${h}" width="${w - 6}" height="1" fill="rgba(43,36,56,0.22)"/>` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h + (shadow ? 1 : 0)}" shape-rendering="crispEdges">${body}${sh}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
const cache = new Map<string, string>();
const memo = (key: string, make: () => string) => { let v = cache.get(key); if (!v) { v = make(); cache.set(key, v); } return v; };

/** The lorry. Two frames are stacked; the wheels and flags swap between them while it moves (see styles.css). */
export function LorrySprite() {
  return (
    <>
      <img class="a" alt="" src={memo('lorry-a', () => toUrl(LORRY_A, LORRY_W, LORRY_H, true))} />
      <img class="b" alt="" src={memo('lorry-b', () => toUrl(LORRY_B, LORRY_W, LORRY_H, true))} />
    </>
  );
}

/** A market stall with its roof in the player's colour. Put the shopkeeper's portrait over STALL_FACE. */
export function StallSprite({ colour, scale = 2 }: { colour: string; scale?: number }) {
  return (
    <img class="stall-art" alt="" width={STALL_W * scale} height={STALL_H * scale} src={memo(`stall-${colour}`, () => toUrl(STALL, STALL_W, STALL_H, false, roofTones(colour)))} />
  );
}

/** The tiled roof band for the top of a stall panel, in the player's colour (one repeating background image). */
export function RoofBand({ cls, colour, scale = 2 }: { cls: string; colour: string; scale?: number }) {
  const url = memo(`band-${colour}`, () => toUrl(BAND, 4, BAND_H, false, roofTones(colour)));
  return <div class={cls} aria-hidden="true" style={{ backgroundImage: `url("${url}")`, backgroundSize: `${4 * scale}px ${BAND_H * scale}px` }} />;
}
