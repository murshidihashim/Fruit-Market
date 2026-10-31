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

// ---------- looks for the stall: roof patterns, trim and props (see looks.ts) ----------
// Roof and trim are painted on tiles 8 art pixels wide that repeat along the top of the stall panel.
const ORANGE = C.c_e8873a, BOARD = mix(TEAL, INK, 0.6);

const DEFAULT_ROOF = (d: Pen) => {
  d.X(0, 0, 7, AWN_L); d.R(0, 1, 8, 5, AWN);
  for (const x of [0, 4]) { d.P(x, 3, AWN_D); d.P(x + 2, 4, AWN_D); d.P(x, 5, AWN_D); }
  d.X(6, 0, 7, AWN_D);
};
const ROOFS: Record<string, (d: Pen) => void> = {
  roof_stripes: (d) => { d.R(0, 1, 4, 5, AWN); d.R(4, 1, 4, 5, PAPER); d.X(0, 0, 3, AWN_L); d.X(0, 4, 7, mix(PAPER, INK, 0.1)); d.X(6, 0, 3, AWN_D); d.X(6, 4, 7, mix(PAPER, INK, 0.25)); },
  roof_scallops: (d) => { d.R(0, 0, 8, 5, AWN); d.X(0, 0, 7, AWN_L); d.R(0, 5, 3, 1, AWN); d.R(4, 5, 3, 1, AWN); d.P(1, 6, AWN_D); d.P(5, 6, AWN_D); d.X(4, 0, 7, AWN_D); },
  roof_checks: (d) => {
    d.X(0, 0, 7, AWN_L);
    for (let y = 1; y <= 5; y++) for (let x = 0; x < 8; x++) d.P(x, y, ((x >> 1) + (y >> 1)) % 2 ? PAPER : AWN);
    d.X(6, 0, 7, AWN_D);
  },
  roof_stars: (d) => { DEFAULT_ROOF(d); for (const [x, y] of [[3, 3], [2, 3], [4, 3], [3, 2], [3, 4]]) d.P(x, y, GOLD); },
  roof_fruit: (d) => {
    DEFAULT_ROOF(d);
    d.R(1, 2, 2, 2, RED); d.P(2, 1, GREEN); d.P(1, 2, mix(RED, PAPER, 0.4));
    d.R(5, 3, 2, 2, BLUE); d.P(5, 3, mix(BLUE, PAPER, 0.4));
  },
};
const TRIM_H = 7;
const TRIMS: Record<string, (d: Pen) => void> = {
  trim_bunting: (d) => {
    d.X(0, 0, 7, WOOD);
    d.X(1, 0, 3, TEAL); d.X(2, 1, 2, TEAL); d.P(1, 3, TEAL);
    d.X(1, 4, 7, GOLD); d.X(2, 5, 6, GOLD); d.X(3, 5, 6, GOLD);
  },
  trim_lanterns: (d) => {
    d.P(3, 0, WOOD); d.X(1, 2, 4, GOLD); d.R(1, 2, 5, 3, TERRA); d.P(3, 3, GOLD); d.P(2, 3, mix(TERRA, GOLD, 0.5)); d.P(4, 3, mix(TERRA, GOLD, 0.5));
    d.X(5, 2, 4, GOLD); d.P(3, 6, TERRA);
  },
  trim_tassels: (d) => {
    for (const [x, len] of [[1, 5], [3, 4], [5, 5], [7, 4]] as const) { d.R(x, 0, 1, len, AWN_D); d.P(x, len, GOLD); }
  },
};

const PROPS: Record<string, (d: Pen) => void> = {
  prop_blackboard: (d) => {
    d.R(1, 2, 14, 10, WOOD); d.R(2, 3, 12, 8, BOARD); d.R(3, 12, 2, 3, WOOD); d.R(11, 12, 2, 3, WOOD);
    d.R(4, 5, 3, 2, PAPER); d.P(5, 4, PAPER); d.X(5, 9, 12, PAPER); d.X(7, 9, 11, PAPER); d.X(9, 4, 12, mix(PAPER, BOARD, 0.4));
  },
  prop_scale: (d) => {
    d.R(5, 13, 6, 2, GOLD, true); d.R(7, 4, 2, 9, GOLD); d.X(3, 2, 13, GOLD); d.P(7, 2, GOLD); d.P(8, 2, GOLD);
    d.R(0, 8, 5, 1, GOLD); d.R(11, 8, 5, 1, GOLD); d.P(1, 5, GREY); d.P(2, 6, GREY); d.P(3, 7, GREY); d.P(14, 5, GREY); d.P(13, 6, GREY); d.P(12, 7, GREY);
    d.P(2, 7, RED); d.P(13, 7, GREEN);
  },
  prop_plant: (d) => {
    d.R(4, 10, 8, 5, TERRA, true); d.R(3, 9, 10, 1, TERRAD);
    d.C(8, 5, 3, GREEN); d.R(7, 6, 2, 4, GREEND); d.P(4, 3, GREEN); d.P(12, 4, GREEN); d.P(8, 1, GREEN); d.P(8, 5, mix(GREEN, PAPER, 0.35));
  },
  prop_crates: (d) => {
    crate(d, 1, 10, 14, 5); crate(d, 1, 5, 6, 5); crate(d, 8, 5, 7, 5);
    apple(d, 2, 2); apple(d, 4, 2); melon(d, 9, 0, 5);
  },
  prop_cat: (d) => {
    d.R(4, 8, 8, 6, ORANGE, true); d.R(5, 3, 6, 5, ORANGE); d.P(5, 2, ORANGE); d.P(10, 2, ORANGE);
    d.P(6, 5, INK); d.P(9, 5, INK); d.P(7, 6, PAPER); d.P(8, 6, PAPER); d.R(12, 9, 2, 5, ORANGE); d.P(13, 8, mix(ORANGE, PAPER, 0.3));
    d.X(11, 5, 6, mix(ORANGE, INK, 0.25)); d.X(11, 9, 10, mix(ORANGE, INK, 0.25));
  },
  prop_golden_apple: (d) => {
    d.R(4, 13, 8, 2, WOODL, true); d.C(8, 8, 4, GOLD); d.P(6, 5, mix(GOLD, PAPER, 0.6)); d.P(5, 6, mix(GOLD, PAPER, 0.5)); d.R(11, 9, 1, 3, mix(GOLD, INK, 0.25));
    d.P(8, 3, WOOD); d.P(9, 2, GREEN); d.P(10, 2, GREEN); d.P(10, 3, GREEN);
  },
};
const PROP_SIZE = 16;
const TILE_W = 8;
const ROOF_H = 7;

/** The tiled roof band for the top of a stall panel, in the player's colour (one repeating background image).
 *  `roof` and `trim` are look ids from looks.ts: a roof pattern, and decoration that hangs below it. */
export function RoofBand({ cls, colour, scale = 2, roof, trim }: { cls: string; colour: string; scale?: number; roof?: string; trim?: string }) {
  const roofDraw = roof ? ROOFS[roof] : undefined;
  const trimDraw = trim ? TRIMS[trim] : undefined;
  if (!roofDraw && !trimDraw) {
    const url = memo(`band-${colour}`, () => toUrl(BAND, 4, BAND_H, false, roofTones(colour)));
    return <div class={cls} aria-hidden="true" style={{ backgroundImage: `url("${url}")`, backgroundSize: `${4 * scale}px ${BAND_H * scale}px` }} />;
  }
  const h = ROOF_H + (trimDraw ? TRIM_H : 0);
  const url = memo(`band-${colour}-${roof ?? ''}-${trim ?? ''}`, () => {
    const rects = [...paint(TILE_W, ROOF_H, roofDraw ?? DEFAULT_ROOF)];
    if (trimDraw) for (const r of paint(TILE_W, TRIM_H, trimDraw)) rects.push({ ...r, y: r.y + ROOF_H });
    return toUrl(rects, TILE_W, h, false, roofTones(colour));
  });
  return <div class={cls} aria-hidden="true" style={{ backgroundImage: `url("${url}")`, backgroundSize: `${TILE_W * scale}px ${h * scale}px`, height: `${h * scale}px` }} />;
}

/** A prop that sits on the stall counter (a look from looks.ts). */
export function PropSprite({ id, size = 32, cls = 'ms-prop' }: { id: string; size?: number; cls?: string }) {
  const draw = PROPS[id];
  if (!draw) return null;
  return <img class={cls} alt="" width={size} height={size} src={memo(`prop-${id}`, () => toUrl(paint(PROP_SIZE, PROP_SIZE, draw), PROP_SIZE, PROP_SIZE, false))} />;
}
