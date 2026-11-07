// Pixel-art sprites drawn from small text maps (icons, favour cards and worn-look pins; the fruit and the cast
// now use the deck art, see fruitIcons.tsx and deckArt.ts). Every sprite gets a 1px ink outline so the whole
// cast reads as one set. Each sprite is turned into a small SVG image once and cached, so the page
// shows one <img> per sprite instead of hundreds of DOM rectangles (much lighter on phones).
import { FRUITS, RIVALS, type Stage } from '../engine/data';
import { shopBadge } from './deckArt';
import { fruitSvgUrl } from './fruitIcons';
import { C } from './palette';
import { WEAR_PARTS } from './wearArt';

type Pal = Record<string, string>;

const INK = C.ink;

// ---------- renderer ----------

interface Compiled { w: number; h: number; runs: [number, number, number, string][]; url: string }
const cache = new Map<string, Compiled>();

function compile(key: string, rows: string[], pal: Pal, outline = true) {
  const hit = cache.get(key);
  if (hit) return hit;
  const h0 = rows.length;
  const w0 = Math.max(...rows.map((r) => r.length));
  const pad = outline ? 1 : 0;
  const w = w0 + pad * 2;
  const h = h0 + pad * 2;
  const grid: (string | null)[][] = Array.from({ length: h }, () => new Array(w).fill(null));
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      const c = r[x];
      if (c !== '.' && c !== ' ' && pal[c]) grid[y + pad][x + pad] = pal[c];
    }
  });
  if (outline) {
    const filled = grid.map((r) => r.map((c) => c !== null));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (filled[y][x]) continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => filled[y + dy]?.[x + dx]);
      if (near) grid[y][x] = INK;
    }
  }
  const runs: [number, number, number, string][] = [];
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const c = grid[y][x];
      if (!c) { x++; continue; }
      let e = x + 1;
      while (e < w && grid[y][e] === c) e++;
      runs.push([x, y, e - x, c]);
      x = e;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges">`
    + runs.map(([rx, ry, l, c]) => `<rect x="${rx}" y="${ry}" width="${l}" height="1" fill="${c}"/>`).join('')
    + '</svg>';
  const out: Compiled = { w, h, runs, url: `data:image/svg+xml,${encodeURIComponent(svg)}` };
  cache.set(key, out);
  return out;
}

export function Sprite({ id, rows, pal, size, outline = true, cls = '', title, x, y }: {
  id: string; rows: string[]; pal: Pal; size: number; outline?: boolean; cls?: string; title?: string;
  /** Position when nested inside another SVG. */
  x?: number; y?: number;
}) {
  const { w, h, url } = compile(id, rows, pal, outline);
  const height = (size * h) / w;
  if (x !== undefined || y !== undefined) {
    return <image class={`px ${cls}`} href={url} x={x} y={y} width={size} height={height} aria-label={title} />;
  }
  return (
    <img class={`px ${cls}`} src={url} alt={title ?? ''} draggable={false} decoding="async"
      style={{ width: `${size}px`, height: `${height}px` }} />
  );
}

// ---------- icons ----------

const ICONS: Record<string, { rows: string[]; pal: Pal }> = {
  // Upgrade illustrations (12px grid, light from the top left).
  shelf: {
    rows: ['BBBBBBBBBBBB', 'BLLLLLLLLLLB', 'BRRLGGLYYLLB', 'BBBBBBBBBBBB', 'BLLLLLLLLLLB', 'BLGGLRRLYYLB', 'BBBBBBBBBBBB', 'B..........B', 'B..........B'],
    pal: { B: C.c_7a4a2e, L: C.c_c98a55, R: C.c_d6453b, G: C.c_6aa84f, Y: C.c_f0b33a },
  },
  handcart: {
    rows: ['..........KK', '.........K..', 'RRRRRRRRRK..', 'RWRWRWRWRK..', 'RRRRRRRRRK..', 'KKKKKKKKKK..', '.KK....KK...', '.KK....KK...'],
    pal: { R: C.terracotta, W: C.c_f6ead2, K: C.c_3b3048 },
  },
  coolroom: {
    rows: ['TTTTTTTTTTTT', 'TLLLLLLLLLLT', 'TL..W..W.LLT', 'TL.WWWWWW.LT', 'TL..WWWW..LT', 'TL.WWWWWW.LT', 'TL..W..W.LLT', 'TLLLLLLLLLLT', 'TTTTTTTTTTTT'],
    pal: { T: C.c_2c6b69, L: C.c_7cc4c0, W: C.c_f6ead2 },
  },
  signboard: {
    rows: ['YYYYYYYYYYYY', 'YCCCCCCCCCCY', 'YCRRCGGCRRCY', 'YCCCCCCCCCCY', 'YYYYYYYYYYYY', '.....BB.....', '.....BB.....', '....BBBB....'],
    pal: { Y: C.c_e8b04b, C: C.c_f6ead2, R: C.terracotta, G: C.teal, B: C.c_7a4a2e },
  },
  lantern: {
    rows: ['.K.', 'KYK', 'YWY', 'KYK'],
    pal: { K: C.c_3b3048, Y: C.gold, W: C.c_fff2c2 },
  },
  hourglass: {
    rows: ['WWWWWWWWWWWW', '.WYYYYYYYYW.', '..WYYYYYYW..', '...WYYYYW...', '....WYYW....', '.....WW.....', '....WYYW....', '...WYYYYW...', '..WYYYYYYW..', 'WWWWWWWWWWWW'],
    pal: { W: C.c_b07f27, Y: C.c_f2d77e },
  },
  ear: {
    rows: ['...SSSS...', '..SPPPPS..', '.SPPSSPPS.', '.SPSPPSPS.', '.SPSPPSPS.', '.SPPSPPS..', '..SPPPS...', '...SPS....', '....S.....'],
    pal: { S: C.c_c9875a, P: C.c_f0b48c },
  },
  coin: {
    rows: ['..YYYY..', '.YWYYYY.', 'YWYDDYYO', 'YYYDYYYO', 'YYYDDYYO', 'YYYYDYYO', '.YYDDYO.', '..OOOO..'],
    pal: { Y: C.gold, W: C.c_fff2c2, D: C.c_b8862b, O: C.c_c98f25 },
  },
  crate: {
    rows: ['BBBBBBBBBB', 'BLLLLLLLLB', 'BLDLLLLDLB', 'BBBBBBBBBB', 'BLLLLLLLLB', 'BLDLLLLDLB', 'BBBBBBBBBB'],
    pal: { B: C.c_8a5a3b, L: C.c_c99563, D: C.c_6b4226 },
  },
  cart: {
    rows: ['KK........', '.K........', '.KRRRRRRR.', '.KRWRWRWR.', '..RRRRRRR.', '..KKKKKKK.', '...K...K..'],
    pal: { K: C.c_4a4058, R: C.c_d6453b, W: C.c_f4ecd8 },
  },
  truck: {
    rows: ['..........WWWW..', 'RRRRRRRRR.WBBWW.', 'RWWRRWWRR.WBBWWW', 'RRRRRRRRRRWWWWWW', 'RRRRRRRRRRWWWWWW', '.KK....KK...KK..', '.KK....KK...KK..'],
    pal: { R: C.c_d6453b, W: C.c_f4ecd8, B: C.c_7fb3d5, K: C.ink },
  },
  star: {
    rows: ['....Y....', '...YYY...', 'YYYYWYYYY', '.YYYYYYY.', '..YYYYY..', '.YYY.YYY.', '.YY...YY.'],
    pal: { Y: C.gold, W: C.c_fff2c2 },
  },
  moon: {
    rows: ['..YYY..', '.YYW...', 'YYW....', 'YYW....', 'YYW....', '.YYW...', '..YYY..'],
    pal: { Y: C.c_f2d77e, W: C.c_fff2c2 },
  },
  sun: {
    rows: ['...Y...', '.Y.Y.Y.', '..OOO..', 'YOOWOOY', '..OOO..', '.Y.Y.Y.', '...Y...'],
    pal: { Y: C.gold, O: C.c_f0a23a, W: C.c_fff2c2 },
  },
  heart: {
    rows: ['.RR.RR.', 'RWRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'],
    pal: { R: C.c_d6453b, W: C.c_f59aa0 },
  },
  fv_gossip: {
    rows: ['...SSSSS....', '..SPPPPPS...', '.SPSSSSPPS..', '.SPS...SPS..', '.SPS..SPPS..', '..SPSSPPS...', '...SPPPS..Y.', '...SPPS..YWY', '....SS....Y.'],
    pal: { S: C.c_c9875a, P: C.c_f0b48c, Y: C.c_e8b04b, W: C.c_fff2c2 },
  },
  fv_freeFruit: {
    rows: ['..R..R......', '...RR.......', 'RRRRYRRRRR..', 'RRRRYRRRRR..', '.CCCYCCCC...', '.CCCYCCCC...', '.CCCYCCCC...', '.CCCYCCCC...', '.CCCYCCCC...'],
    pal: { R: C.terracotta, Y: C.c_e8b04b, C: C.teal },
  },
  fv_priority: {
    rows: ['Y.....Y.....', 'YY....YY....', 'YYY...YYY...', 'YYYY..YYYY..', 'YYYYY.YYYYY.', 'YYYY..YYYY..', 'YYY...YYY...', 'YY....YY....', 'Y.....Y.....'],
    pal: { Y: C.c_e8b04b },
  },
  fv_scout: {
    rows: ['..KKKK......', '.KLLLLK.....', 'KLWWLLLK....', 'KLWLLLLK....', 'KLLLLLLK....', '.KLLLLKK....', '..KKKK.HH...', '.......HHH..', '........HH..'],
    pal: { K: C.c_3b3048, L: C.c_9ad0e6, W: C.c_fff2c2, H: C.c_a86b45 },
  },
  fv_favouredTrade: {
    rows: ['............', '.SS......BB.', 'SSSS....BBBB', 'SSSSSSBBBBBB', '.SSSSSSBBBB.', '..SSSSSBBB..', '....SSBB....', '............'],
    pal: { S: C.c_f0c09a, B: C.c_c98a55 },
  },
  fv_fridge: {
    rows: ['TTTTTTTTTT', 'TLLLLLLLLT', 'TLLLLLLLLT', 'TTTTTTTTTT', 'TLLW..WLLT', 'TLL.WW.LLT', 'TLL.WW.LLT', 'TLLW..WLLT', 'TLLLLLLLLT', 'TTTTTTTTTT'],
    pal: { T: C.c_2c6b69, L: C.c_8fcac6, W: C.c_ffffff },
  },
  juicer: {
    rows: ['..KKKKKK....', '..KMMMMK....', '...KMMK.....', '....KK......', '..GGGGGG....', '..GOOOOG....', '..GOOOOG.KK.', '..GOOOOGK..K', '..GGGGGG....'],
    pal: { K: C.c_3b3048, M: C.c_9aa0a6, G: C.c_f6ead2, O: C.c_f0a23a },
  },
  bell: {
    rows: ['.....KK.....', '....YYYY....', '...YWYYYY...', '...YWYYYY...', '..YYYYYYYY..', '..YYYYYYYY..', '.YYYYYYYYYY.', 'DDDDDDDDDDDD', '.....DD.....'],
    pal: { Y: C.c_e8b04b, W: C.c_fff2c2, D: C.c_b07f27, K: C.c_3b3048 },
  },
  scales: {
    rows: ['.....K.....', '.KKKKKKKKK.', '.K...K...K.', 'KYK..K..KYK', 'YYY..K..YYY', '.....K.....', '...KKKKK...'],
    pal: { K: C.c_3b3048, Y: C.c_e8b04b },
  },
  tag: {
    rows: ['..RRRRRR', '.RRRRRRR', 'RRWRRRRR', 'RRRRRRRR', '.RRRRRRR', '..RRRRRR'],
    pal: { R: C.terracotta, W: C.c_f6ead2 },
  },
  egg: {
    rows: ['..CCC..', '.CCCCC.', '.CWCCC.', 'CCWCCCC', 'CCCCCCC', 'CCCCCCD', '.CCCCD.', '..DDD..'],
    pal: { C: C.c_f6ead2, W: C.c_ffffff, D: C.c_d7c49e },
  },
};


export function Icon({ name, size = 16 }: { name: keyof typeof ICONS; size?: number }) {
  const i = ICONS[name];
  return <Sprite id={`i-${name}`} rows={i.rows} pal={i.pal} size={size} cls="icon" />;
}

// ---------- worn looks ----------
// The illustrated portraits replaced the pixel faces (DEC-066). Illustrated wearables do not exist yet, so each worn
// look (DEC-057) shows as a small pixel pin on the portrait, drawn from its rows in wearArt.ts alone (an art gap).

const BASE_PAL: Pal = {
  K: INK, W: C.c_f4ecd8, E: C.ink, M: C.c_a8423f, C: C.c_f0a08c,
  H: C.c_5b3a24, T: C.c_c9a46a, B: C.c_7a4f2e, Y: C.gold, R: C.c_d6453b, P: C.c_7b5aa6,
  N: C.c_2f4a7a, G: C.c_4f9a52, L: C.c_9ad0e6, O: C.c_e8873a, A: C.c_9aa3ad, V: C.c_e889b4, Q: C.c_3fa39a,
};

/** A worn look as a pin: its pixel rows, cropped to the drawing. Null for an unknown look. */
export function WearPin({ id, size = 14 }: { id: string; size?: number }) {
  const rows = WEAR_PARTS[id];
  if (!rows) return null;
  const used = rows.map((r, y) => ({ r, y })).filter(({ r }) => /[^. ]/.test(r));
  if (!used.length) return null;
  const xs = used.flatMap(({ r }) => [...r].map((c, x) => (c !== '.' && c !== ' ' ? x : -1)).filter((x) => x >= 0));
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const crop = used.map(({ r }) => r.padEnd(x1 + 1, '.').slice(x0, x1 + 1));
  return <Sprite id={`w-${id}`} rows={crop} pal={BASE_PAL} size={size} cls="wear-pin" title="" />;
}

// ---------- warm-up ----------

/**
 * Builds and decodes the most common sprites ahead of time, a few per idle moment, so opening the
 * game screen doesn't stall on dozens of first-time images. Safe to call more than once.
 */
export function prewarmSprites() {
  if (typeof window === 'undefined') return;
  // Load the deck-art faces the game screen uses now, so opening it doesn't trigger font loads and re-layout.
  // A font that fails to load only falls back to the next face in the stack, so the failure is ignored on purpose.
  for (const f of ['16px "Alfa Slab One"', '16px "Abril Fatface"', '400 16px "Libre Caslon Text"', '500 16px Oswald', '600 16px Oswald', '700 16px Oswald']) {
    void document.fonts?.load(f).catch(() => {});
  }
  const jobs: (() => string)[] = [];
  for (const f of FRUITS) for (const st of ['fresh', 'okay', 'notso', 'unripe'] as Stage[]) jobs.push(() => fruitSvgUrl(f, st));
  // Shopkeeper badges are public (every player sees every stall). Customer portraits are never fetched ahead:
  // a face-down card must not load its picture.
  for (const r of RIVALS) { const b = shopBadge(r.avatar); if (b) jobs.push(() => b); }
  for (const [k, i] of Object.entries(ICONS)) jobs.push(() => compile(`i-${k}`, i.rows, i.pal, true).url);
  type Deadline = { timeRemaining: () => number };
  const ric = (window as { requestIdleCallback?: (f: (d: Deadline) => void) => void }).requestIdleCallback;
  const idle = (cb: (d: Deadline) => void) => (ric ? ric(cb) : setTimeout(() => cb({ timeRemaining: () => 4 }), 50));
  // One sprite at a time, only while the browser says it has spare time.
  const run = (d: Deadline) => {
    while (jobs.length && d.timeRemaining() > 4) {
      const img = new Image();
      img.src = jobs.shift()!();
      void img.decode?.().catch(() => {});
    }
    if (jobs.length) idle(run);
  };
  idle(run);
}




