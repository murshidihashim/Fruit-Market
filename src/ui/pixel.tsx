// Pixel-art sprites drawn from small text maps. Every sprite gets a 1px ink outline so the whole
// cast reads as one set. Each sprite is turned into a small SVG image once and cached, so the page
// shows one <img> per sprite instead of hundreds of DOM rectangles (much lighter on phones).
import type { FruitId, Stage } from '../engine/data';
import { C } from './palette';

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

// ---------- colour helpers ----------

function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${m(r1, r2)}${m(g1, g2)}${m(b1, b2)}`;
}

// ---------- fruit ----------

const FRUIT_MAPS: Record<FruitId, string[]> = {
  apple: [
    '......SLL...',
    '.....SLL....',
    '..RR.S.RR...',
    '.RRRRRRRRR..',
    'RHHRRRRRRRR.',
    'RHRRRRRRRRD.',
    'RRRRRRRRRRD.',
    'RRRRRRRRRRD.',
    '.RRRRRRRRD..',
    '.RRRRRRRRD..',
    '..RRDDRRD...',
    '...DD..D....',
  ],
  blueberry: [
    '....RRRR....',
    '...RHRRRD...',
    '...RRKKRD...',
    '...DRRRRD...',
    '..RRRDDRRRR.',
    '.RHRRRRHRRRD',
    '.RRKKRRRKKRD',
    '.RRRRRDRRRRD',
    '.DRRRRDDRRRD',
    '..DRRD..DRD.',
    '...DD....D..',
  ],
  watermelon: [
    'RRRRRRRRRRRR',
    'RRKRRHRRRKRR',
    'RRRRRKKRRRRR',
    'LRRKRRRRKRRL',
    'GLRRRRRRRRLG',
    '.GLRRRKRRLG.',
    '.GGLLRRLLGG.',
    '..GGLLLLGG..',
    '...GGGGGG...',
  ],
  mango: [
    '........SL..',
    '.......SLLL.',
    '...RRRRS....',
    '..RHRRRRR...',
    '.RHRRRRRRR..',
    '.RHRRRRRRRD.',
    '.RRRRRRRRDD.',
    '.RRRRRRRDDD.',
    '..RRRRRDDD..',
    '...RRDDDD...',
    '....DDD.....',
  ],
};

const FRUIT_PAL: Record<FruitId, Pal> = {
  apple: { R: C.c_d6453b, D: C.c_9c2b32, H: C.c_f2a08c, S: C.c_6b4226, L: C.c_6aa84f },
  blueberry: { R: C.c_5562c9, D: C.c_353d8f, H: C.c_a9b3f2, K: C.c_232a63 },
  watermelon: { R: C.c_e8505b, H: C.c_f59aa0, K: C.ink, L: C.c_d6efb4, G: C.c_3f8f4a },
  mango: { R: C.c_f0b33a, D: C.c_e0742c, H: C.c_fbe09a, S: C.c_6b4226, L: C.c_6aa84f },
};

const UNRIPE_PAL: Record<FruitId, Pal> = {
  apple: { R: C.c_8fbf5a, D: C.c_5f8f3a, H: C.c_cfe6a3, S: C.c_6b4226, L: C.c_4f8a3b },
  blueberry: { R: C.c_9aa7c9, D: C.c_6f7aa0, H: C.c_d3d9ec, K: C.c_4a5275 },
  watermelon: { R: C.c_f2c2b8, H: C.c_fbe3dc, K: C.c_c9b8a0, L: C.c_e6f2cf, G: C.c_6aa84f },
  mango: { R: C.c_9cc45a, D: C.c_6f9a3c, H: C.c_d5e8a6, S: C.c_6b4226, L: C.c_4f8a3b },
};

function stagePal(f: FruitId, stage: Stage): Pal {
  if (stage === 'unripe') return UNRIPE_PAL[f];
  const base = FRUIT_PAL[f];
  if (stage === 'fresh') return base;
  const t = stage === 'okay' ? 0.22 : 0.48;
  const out: Pal = {};
  for (const [k, v] of Object.entries(base)) out[k] = k === 'K' ? v : mix(v, C.c_8a6a3a, t);
  if (stage === 'notso') out.X = C.c_5b4022;
  return out;
}

/** Brown spots for Not-so fruit, laid over the base map. */
function spotted(rows: string[]): string[] {
  const spots: [number, number][] = [[3, 5], [7, 7], [5, 9]];
  return rows.map((r, y) => r.split('').map((c, x) => (c !== '.' && c !== 'K' && spots.some(([sx, sy]) => sx === x && sy === y) ? 'X' : c)).join(''));
}

export function PixelFruit({ id, size = 24, stage = 'fresh', x, y }: { id: FruitId; size?: number; stage?: Stage; x?: number; y?: number }) {
  const rows = stage === 'notso' ? spotted(FRUIT_MAPS[id]) : FRUIT_MAPS[id];
  return <Sprite id={`f-${id}-${stage}`} rows={rows} pal={stagePal(id, stage)} size={size} cls="fruit" title={id} x={x} y={y} />;
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
  ev_festival: {
    rows: ['K..........K', 'KRR......YYK', 'KRRR.GG.YYYK', 'KRR.GGG..YYK', 'K....GG....K', '.Y.....R..T.', '...T.......Y', '.R....Y..R..', '....T.....T.', '.Y...R.Y....'],
    pal: { K: C.c_3b3048, R: C.terracotta, Y: C.c_e8b04b, G: C.teal, T: C.c_7d8c3a },
  },
  ev_glut: {
    rows: ['..R.......R.', '..R..BB...R.', 'RRRRBWBB.RRR', '.RR.BBBB..R.', '...BBBBBB...', '..BWBBBWBB..', '.BBBBWBBBBB.', 'BBWBBBBBWBBB', 'KKKKKKKKKKKK'],
    pal: { R: C.terracotta, B: C.c_4f5bd5, W: C.c_8f98f0, K: C.c_3b3048 },
  },
  ev_heatwave: {
    rows: ['R..R..R..R..', '.R..R..R..R.', '....OOOO....', '...OYYYYO...', '..OYYWYYYO..', '..OYYYYYYO..', '...OYYYYO...', '....OOOO....', 'R..R..R..R..'],
    pal: { R: C.terracotta, O: C.c_f0a23a, Y: C.gold, W: C.c_fff2c2 },
  },
  ev_blight: {
    rows: ['.....B......', '.....BGG....', '..RRRBRRR...', '.RRDRRRRDR..', '.RRRRRDRRR..', '.RDRRRRRRR..', '.RRRRDRRDR..', '..RRRRRRR...', '...RR.RR....'],
    pal: { B: C.c_7a4a2e, G: C.c_6aa84f, R: C.c_b8833a, D: C.c_4a3a2a },
  },
  ev_mangoCraze: {
    rows: ['.Y......Y...', 'YWY..G...Y..', '.Y..GG......', '...OOOO.....', '..OYYYOO..Y.', '..OYWYYO.YWY', '..OYYYYO..Y.', '...OOOO.....', '............'],
    pal: { Y: C.gold, W: C.c_fff2c2, G: C.c_6aa84f, O: C.c_e0952a },
  },
  ev_superfood: {
    rows: ['.....GG.....', '....GGG..Y..', '..BBBGBB.YWY', '.BBWBBBBB.Y.', '.BWBBBBBB...', '.BBBBBBBB...', '..BBBBBB....', '...BBBB.....', '............'],
    pal: { G: C.c_6aa84f, B: C.c_4f5bd5, W: C.c_8f98f0, Y: C.gold },
  },
  ev_goodHarvest: {
    rows: ['..Y..Y..Y...', '.YYY.YYY.YY.', '..YY.YY.YY..', '...Y.YY.Y...', '....YYYY....', '.....GG.....', '....RRRR....', '.....GG.....', '....G..G....'],
    pal: { Y: C.c_e8b04b, G: C.c_7d8c3a, R: C.terracotta },
  },
  ev_badHarvest: {
    rows: ['.......KK...', '......GGGK..', '.GG..GGWGK..', 'GGGGGGGGG...', 'GDGGDGGDG...', '.K.K.K.K....', '.....B......', '....BBB.....', '...BB.BB....'],
    pal: { K: C.c_3b3048, G: C.c_6aa84f, W: C.c_ffffff, D: C.c_3f6b2a, B: C.c_7a4a2e },
  },
  ev_priceHike: {
    rows: ['.......RRRR.', '.........RR.', '........R.R.', '.......R..R.', '..R...R.....', '.R.R.R......', 'R...R.......', 'KKKKKKKKKKKK'],
    pal: { R: C.terracotta, K: C.c_3b3048 },
  },
  ev_minPrice: {
    rows: ['..YYYYYY....', '.YYYYYYYY...', 'YYWYKKYYYY..', 'YYYYKYYYYY..', 'YYYYKKYYYY..', '.YYYYYYYY...', '..YYYYYY....', 'KKKKKKKKKKK.', 'KKKKKKKKKKK.'],
    pal: { Y: C.c_e8b04b, W: C.c_fff2c2, K: C.c_3b3048 },
  },
  ev_inspector: {
    rows: ['..KKKK......', '.KLLLLK.....', 'KLWLLLLK....', 'KLLLLLLK....', 'KLLLLLLK....', '.KLLLLK.....', '..KKKKBB....', '......BBB...', '.......BBB..', '........BB..'],
    pal: { K: C.c_3b3048, L: C.c_8fcac6, W: C.c_ffffff, B: C.c_7a4a2e },
  },
  ev_strike: {
    rows: ['...G.G......', '..G.G.......', 'RRRRRRR.WWW.', 'RWWRRWR.WBWW', 'RRRRRRRRWWWW', 'RRRRRRRRWWWW', '.KK....KK...', '.KK.........'],
    pal: { G: C.c_a8a6bd, R: C.terracotta, W: C.c_f6ead2, B: C.teal, K: C.c_3b3048 },
  },
  ev_hotel: {
    rows: ['.....YY.....', '..TTTTTTTT..', '..TWTTWTWT..', '..TTTTTTTT..', '..TWTTWTWT..', '..TTTTTTTT..', '..TWTKKTWT..', '..TTTKKTTT..', 'KKKKKKKKKKKK'],
    pal: { Y: C.c_e8b04b, T: C.teal, W: C.c_f6ead2, K: C.c_3b3048 },
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

// ---------- portraits ----------
// Humans are built from a face plus layered parts; animals are hand-drawn.

const BASE_PAL: Pal = {
  K: INK, W: C.c_f4ecd8, E: C.ink, M: C.c_a8423f, C: C.c_f0a08c,
  H: C.c_5b3a24, T: C.c_c9a46a, B: C.c_7a4f2e, Y: C.gold, R: C.c_d6453b, P: C.c_7b5aa6,
  N: C.c_2f4a7a, G: C.c_4f9a52, L: C.c_9ad0e6, O: C.c_e8873a, A: C.c_9aa3ad, V: C.c_e889b4, Q: C.c_3fa39a,
};

function face(skin: string, shirt: string): string[] {
  const g: string[][] = Array.from({ length: 16 }, () => new Array(16).fill('.'));
  for (let y = 4; y <= 13; y++) for (let x = 2; x <= 13; x++) {
    const dx = (x - 7.5) / 5.2;
    const dy = (y - 9) / 5;
    if (dx * dx + dy * dy <= 1) g[y][x] = 's';
  }
  for (let x = 6; x <= 9; x++) g[14][x] = 's';
  for (let x = 2; x <= 13; x++) g[15][x] = 'u';
  for (let x = 4; x <= 11; x++) g[14][x] = x >= 6 && x <= 9 ? 's' : 'u';
  g[9][5] = 'E'; g[9][10] = 'E';
  g[11][7] = 'M'; g[11][8] = 'M';
  g[10][4] = 'C'; g[10][11] = 'C';
  void skin; void shirt;
  return g.map((r) => r.join(''));
}

const PARTS: Record<string, string[]> = {
  hairShort: ['', '', '', '.....HHHHHH.....', '....HHHHHHHH....', '...HHHHHHHHHH...', '...HH......HH...'],
  hairLong: ['', '', '', '.....HHHHHH.....', '....HHHHHHHH....', '...HHHHHHHHHH...', '..HHH......HHH..', '..HH........HH..', '..HH........HH..', '..HH........HH..', '..HH........HH..', '..HH........HH..', '...H........H...'],
  hairBun: ['', '.......HH.......', '......HHHH......', '.....HHHHHH.....', '....HHHHHHHH....', '...HHHHHHHHHH...', '...HH......HH...'],
  hairSpiky: ['', '....H..H..H.....', '....HH.HH.HH....', '...HHHHHHHHHH...', '...HHHHHHHHHH...', '...HHH....HHH...'],
  hairSlick: ['', '', '', '....HHHHHHHH....', '...HHHHHHHHHH...', '...HHHH..HHHH...', '...HH......HH...', '...H........H...'],
  hairSides: ['', '', '', '', '', '', '..WW........WW..', '..WW........WW..', '..W..........W..'],
  cowboy: ['', '', '.....TTTTTT.....', '....TTTTTTTT....', '....BBBBBBBB....', '.TTTTTTTTTTTTTT.'],
  wizard: ['.......PP.......', '......PPPP......', '.....PPYPPP.....', '....PPPPPPPP....', '...PPPPPPPPPP...', '.PPPPPPPPPPPPPP.'],
  crown: ['', '', '....Y..YY..Y....', '....YY.YY.YY....', '....YYYYYYYY....', '....YRYYYYRY....'],
  captain: ['', '', '....WWWWWWWW....', '...WWWWWWWWWW...', '...NNNNYYNNNN...', '..NNNNNNNNNNNN..'],
  chef: ['.....WW.WW......', '....WWWWWWWW....', '....WWWWWWWW....', '.....WWWWWW.....', '....WWWWWWWW....'],
  beret: ['', '', '......RR........', '....RRRRRRRR....', '...RRRRRRRRRR...', '....RRRRRRRR....'],
  detective: ['', '', '.....BBBBBB.....', '....BBBBBBBB....', '....KKKKKKKK....', '..BBBBBBBBBBBB..'],
  helmet: ['', '', '.....RRRRRR.....', '....RRRYYRRR....', '...RRRRRRRRRR...', '.RRRRRRRRRRRRRR.'],
  astro: ['', '', '....WWWWWWWW....', '...WWWWWWWWWW...', '..WW........WW..', '..W..........W..', '..W..........W..', '..W..........W..', '..W..........W..', '..W..........W..', '..W..........W..', '..W..........W..', '..WW........WW..', '...WWWWWWWWWW...'],
  turban: ['', '.....OOOOOO.....', '....OOOOOOOO....', '...OOOOROOOOO...', '...OOOOOOOOOO...', '...OO......OO...'],
  ninja: ['', '', '', '', '.....KKKKKK.....', '....KKKKKKKK....', '...KKKKKKKKKK...', '...KRRRRRRRRK...', '...KK......KK...', '...KK......KK...', '...KKKKKKKKKK...', '...KKKKKKKKKK...', '...KKKKKKKKKK...', '....KKKKKKKK....'],
  mask: ['', '', '', '', '', '', '', '', '...RRRRRRRRRR...', '...RR.RRRR.RR...'],
  dino: ['.....G..G..G....', '....GGGGGGGG....', '...GGGGGGGGGG...', '..GGWGWGWGWGGG..', '..GG........GG..', '..GG........GG..', '..GG........GG..', '..GG........GG..', '..GG........GG..', '..GG........GG..', '..GG........GG..', '..GG........GG..', '..GG........GG..', '..GGGGGGGGGGGG..'],
  wings: ['', '', '', '', '', '', '', 'LL............LL', 'LLL..........LLL', 'LLL..........LLL', '.LL..........LL.', '.LL..........LL.'],
  horn: ['.......Y........', '.......YY.......', '......YY........'],
  glasses: ['', '', '', '', '', '', '', '', '....BBB..BBB....', '....B.BBBB.B....', '....BBB..BBB....'],
  shades: ['', '', '', '', '', '', '', '', '....KKKKKKKK....', '....KKK..KKK....'],
  nose: ['', '', '', '', '', '', '', '', '', '', '.......RR.......'],
  beard: ['', '', '', '', '', '', '', '', '', '', '', '...HH......HH...', '...HHHHHHHHHH...', '....HHHHHHHH....', '.....HHHHHH.....'],
  longBeard: ['', '', '', '', '', '', '', '', '', '', '', '...WW......WW...', '...WWWWWWWWWW...', '....WWWWWWWW....', '....WWWWWWWW....', '.....WWWWWW.....'],
  mustache: ['', '', '', '', '', '', '', '', '', '', '.....HHHHHH.....'],
  ears: ['', '', '', '', '', '', '', '', '.ss..........ss.', '..s..........s..'],
  flower: ['', '', '', '', '..VYV...........', '...V............'],
  phone: ['', '', '', '', '', '', '', '', '', '', '............KKK.', '............KLK.', '............KLK.', '............KKK.'],
  headband: ['', '', '', '', '', '', '...RRRRRRRRRR...'],
  antenna: ['.......R........', '.......K........', '.......K........'],
  collar: ['', '', '', '', '', '', '', '', '', '', '', '', '', '..RR........RR..', '..RRR......RRR..', '..KKKKKKKKKKKKKK'],
  tudung: ['', '', '.....HHHHHH.....', '....HHHHHHHH....', '...HHHHHHHHHH...', '..HHH......HHH..', '..HHH......HHH..', '..HHH......HHH..', '..HHH......HHH..', '..HH........HH..', '..HH........HH..', '..HHH......HHH..', '..HHHH....HHHH..', '..HHHHHHHHHHHH..'],
  pompoms: ['', '', '', '', '', '', '', '', 'Y..............Y', 'YY............YY', 'RY............YR', 'YY............YY', '.Y............Y.'],
  tophat: ['', '.....KKKKKK.....', '.....KKKKKK.....', '.....RRRRRR.....', '...KKKKKKKKKK...'],
  bolt: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '.......YY.......'],
};

interface Human { skin: string; shirt: string; parts: string[]; pal?: Pal }

const SKIN = { a: C.c_f6d2b0, b: C.c_e3b088, c: C.c_c48a5f, d: C.c_8f5e3c, pale: C.c_ece6e2, green: C.c_9db57a, blue: C.c_7aa6dc, grey: C.c_b8c0c9 };

const HUMANS: Record<string, Human> = {
  John: { skin: SKIN.b, shirt: C.c_d6453b, parts: ['hairShort', 'cowboy'] },
  Robert: { skin: SKIN.pale, shirt: C.c_8a6a3a, parts: ['hairSlick', 'glasses'], pal: { H: C.c_5b3a24 } },
  Daniel: { skin: SKIN.a, shirt: C.c_f4ecd8, parts: ['hairSides', 'glasses'], pal: { H: C.c_f4ecd8 } },
  'Rara Jenab': { skin: SKIN.b, shirt: C.c_3fa39a, parts: ['tudung', 'pompoms'], pal: { H: C.c_7b5aa6 } },
  Aisyah: { skin: SKIN.c, shirt: C.c_f4ecd8, parts: ['hairLong', 'glasses'], pal: { H: C.c_3a2418 } },
  Ravi: { skin: SKIN.d, shirt: C.c_d6453b, parts: ['hairSpiky', 'helmet'], pal: { H: C.ink, R: C.gold } },
  'Mei Ling': { skin: SKIN.a, shirt: C.c_3fa39a, parts: ['hairLong', 'headband'], pal: { H: C.c_3a2418, R: C.c_3fa39a } },
  Farid: { skin: SKIN.c, shirt: C.ink, parts: ['hairShort', 'helmet'], pal: { H: C.ink, R: C.c_d6453b } },
  Siti: { skin: SKIN.b, shirt: C.c_e889b4, parts: ['hairLong', 'collar'], pal: { H: C.c_3a2418 } },
  Kumar: { skin: SKIN.d, shirt: C.c_7b5aa6, parts: ['tophat', 'mustache'], pal: { H: C.ink } },
  Grace: { skin: SKIN.a, shirt: C.ink, parts: ['hairSpiky', 'shades'], pal: { H: C.c_7b5aa6 } },
  Hafiz: { skin: SKIN.c, shirt: C.c_4f9a52, parts: ['hairShort', 'helmet', 'glasses'], pal: { H: C.c_3a2418, R: C.c_c9a46a } },
  'Wei Jie': { skin: SKIN.a, shirt: C.c_8a6a3a, parts: ['hairShort', 'detective', 'glasses'], pal: { H: C.ink } },
  Nurul: { skin: SKIN.b, shirt: C.c_9ad0e6, parts: ['hairBun', 'flower'], pal: { H: C.c_5b3a24 } },
  Priya: { skin: SKIN.c, shirt: C.c_f4ecd8, parts: ['hairBun', 'glasses'], pal: { H: C.ink } },
  Ahmad: { skin: SKIN.c, shirt: C.c_2f4a7a, parts: ['beard', 'captain'], pal: { H: C.c_3a2418 } },
  Sarah: { skin: SKIN.a, shirt: C.c_2f4a7a, parts: ['hairLong', 'phone'], pal: { H: C.c_5b3a24 } },
  Tan: { skin: SKIN.a, shirt: C.c_8a6a3a, parts: ['hairSides', 'glasses', 'mustache'], pal: { H: C.c_f4ecd8 } },
  Lina: { skin: SKIN.b, shirt: C.c_d6453b, parts: ['hairBun', 'flower'], pal: { H: C.ink } },
  Zul: { skin: SKIN.b, shirt: C.c_6b6f7a, parts: ['hairSpiky'], pal: { H: C.c_3a2418 } },
  Anna: { skin: SKIN.a, shirt: C.gold, parts: ['hairLong', 'beret'], pal: { H: C.c_c4723a } },
  Vijay: { skin: SKIN.d, shirt: C.c_6b6f7a, parts: ['hairShort', 'glasses'], pal: { H: C.ink } },
  'Hui Min': { skin: SKIN.a, shirt: C.c_4f9a52, parts: ['hairLong', 'cowboy'], pal: { H: C.c_3a2418, T: C.c_4f9a52 } },
  Osman: { skin: SKIN.d, shirt: C.c_d6453b, parts: ['mustache', 'helmet'], pal: { H: C.ink } },
  'Jia Wen': { skin: SKIN.a, shirt: C.c_2f4a7a, parts: ['hairLong', 'headband'], pal: { H: C.ink } },
  Rizal: { skin: SKIN.c, shirt: C.c_3fa39a, parts: ['hairShort', 'shades'], pal: { H: C.ink } },
  Devi: { skin: SKIN.d, shirt: C.c_4f9a52, parts: ['hairBun', 'flower'], pal: { H: C.ink } },
  Marcus: { skin: SKIN.b, shirt: C.c_2f4a7a, parts: ['hairShort', 'beard', 'cowboy'], pal: { H: C.c_5b3a24, T: C.gold } },
  Fatimah: { skin: SKIN.c, shirt: C.c_7b5aa6, parts: ['hairLong', 'glasses'], pal: { H: C.c_3a2418 } },
  Ben: { skin: SKIN.pale, shirt: C.c_a8423f, parts: ['hairShort', 'beret'], pal: { H: C.c_c4723a } },
  Yuki: { skin: SKIN.a, shirt: C.ink, parts: ['hairSides', 'headband'], pal: { H: C.ink } },
  Hadi: { skin: SKIN.b, shirt: C.c_e8873a, parts: ['helmet', 'mustache'], pal: { H: C.c_3a2418, R: C.gold } },
  Lakshmi: { skin: SKIN.d, shirt: C.c_f4ecd8, parts: ['hairBun', 'chef'], pal: { H: C.ink } },
  Kenji: { skin: SKIN.a, shirt: C.c_f4ecd8, parts: ['hairSpiky', 'headband'], pal: { H: C.ink } },
  Mira: { skin: SKIN.c, shirt: C.c_4f9a52, parts: ['hairLong', 'headband'], pal: { H: C.c_3a2418, R: C.c_4f9a52 } },
  'Hock Seng': { skin: SKIN.b, shirt: C.c_6b6f7a, parts: ['hairSides', 'glasses', 'beard'], pal: { H: C.c_f4ecd8 } },
  rosa: { skin: SKIN.a, shirt: C.c_d6453b, parts: ['hairBun', 'glasses'], pal: { H: C.c_e8873a } },
  benny: { skin: SKIN.c, shirt: C.c_8a6a3a, parts: ['hairShort', 'beard'], pal: { H: C.c_5b3a24 } },
  chen: { skin: SKIN.a, shirt: C.c_7b5aa6, parts: ['hairSlick', 'flower'], pal: { H: C.ink } },
  saleh: { skin: SKIN.c, shirt: C.c_2f4a7a, parts: ['hairSides', 'mustache'], pal: { H: C.c_f4ecd8 } },
  raj: { skin: SKIN.d, shirt: C.c_4f9a52, parts: ['hairSpiky', 'headband'], pal: { H: C.ink } },
  kiran: { skin: SKIN.b, shirt: C.gold, parts: ['hairLong'], pal: { H: C.c_3a2418 } },
  Influencer: { skin: SKIN.b, shirt: C.c_e889b4, parts: ['hairLong', 'shades', 'phone'], pal: { H: C.c_f2d77e } },
  'Gym Club': { skin: SKIN.c, shirt: C.c_2f4a7a, parts: ['hairShort', 'headband'], pal: { H: C.ink } },
  'Hotel Chef': { skin: SKIN.a, shirt: C.c_f4ecd8, parts: ['mustache', 'chef'], pal: { H: C.c_3a2418 } },
  // Player shopkeepers
  you: { skin: SKIN.b, shirt: C.c_d6453b, parts: ['hairShort', 'chef'] },
  you2: { skin: SKIN.c, shirt: C.c_4f9a52, parts: ['hairBun', 'headband'], pal: { H: C.ink } },
  you3: { skin: SKIN.a, shirt: C.c_2f4a7a, parts: ['hairSpiky', 'mask'], pal: { H: C.c_c4723a } },
  you4: { skin: SKIN.d, shirt: C.gold, parts: ['beret', 'hairLong'], pal: { H: C.ink } },
  shopper: { skin: SKIN.b, shirt: C.c_8a6a3a, parts: ['hairShort'] },
};

const ANIMALS: Record<string, { rows: string[]; pal: Pal }> = {
  fox: {
    rows: ['................', '..K..........K..', '..KO........OK..', '..KOO......OOK..', '..KOOOOOOOOOOK..', '..OOOOOOOOOOOO..', '.OOOOOOOOOOOOOO.', '.OOOEOOOOOOEOOO.', '.OOOOOOOOOOOOOO.', '..OWWWOOOOWWWO..', '..WWWWWKKWWWWW..', '...WWWWWWWWWW...', '....WWWWWWWW....', '.....WWWWWW.....', '...GGGGGGGGGG...', '..GGGGGGGGGGGG..'],
    pal: { O: C.c_e8873a, W: C.c_f4ecd8, K: C.ink, E: C.ink, G: C.c_4f9a52 },
  },
};

const AVATAR_KEY: Record<string, string> = {
  '🦊': 'rosa', '🐻': 'benny', '🐼': 'chen', '🐸': 'saleh', '🦝': 'raj', '🐷': 'kiran', // emoji-ok: avatar keys, never shown
  '🧑‍🍳': 'you', '👩‍🍳': 'you2', '🦸': 'you3', '🐵': 'you4', // emoji-ok: avatar keys, never shown
};

function humanRows(h: Human): string[] {
  const g = face(h.skin, h.shirt).map((r) => r.split(''));
  for (const name of h.parts) {
    const part = PARTS[name] ?? [];
    part.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (row[x] !== '.' && g[y]) g[y][x] = row[x];
    });
  }
  return g.map((r) => r.join(''));
}

/** A pixel portrait for a player avatar (emoji key) or a customer name. */
export function Portrait({ who, size = 32, x, y }: { who: string; size?: number; x?: number; y?: number }) {
  const key = AVATAR_KEY[who] ?? who;
  const animal = ANIMALS[key];
  if (animal) return <Sprite id={`a-${key}`} rows={animal.rows} pal={animal.pal} size={size} cls="portrait" title={key} x={x} y={y} />;
  const h = HUMANS[key] ?? HUMANS.shopper;
  const pal: Pal = { ...BASE_PAL, s: h.skin, u: h.shirt, ...(h.pal ?? {}) };
  return <Sprite id={`h-${key}`} rows={humanRows(h)} pal={pal} size={size} cls="portrait" title={key} x={x} y={y} />;
}

// ---------- warm-up ----------

/**
 * Builds and decodes the most common sprites ahead of time, a few per idle moment, so opening the
 * game screen doesn't stall on dozens of first-time images. Safe to call more than once.
 */
export function prewarmSprites() {
  if (typeof window === 'undefined') return;
  // Load every font weight the game screen uses now, so opening it doesn't trigger font loads and re-layout.
  for (const f of ['500 16px "Pixelify Sans"', '600 16px "Pixelify Sans"', '700 16px "Pixelify Sans"', '400 16px Fredoka', '600 16px Fredoka']) {
    void document.fonts?.load(f).catch(() => {});
  }
  const jobs: (() => string)[] = [];
  for (const f of Object.keys(FRUIT_MAPS) as FruitId[]) {
    for (const st of ['fresh', 'okay', 'notso', 'unripe'] as Stage[]) {
      jobs.push(() => compile(`f-${f}-${st}`, st === 'notso' ? spotted(FRUIT_MAPS[f]) : FRUIT_MAPS[f], stagePal(f, st), true).url);
    }
  }
  for (const [k, i] of Object.entries(ICONS)) jobs.push(() => compile(`i-${k}`, i.rows, i.pal, true).url);
  for (const [k, a] of Object.entries(ANIMALS)) jobs.push(() => compile(`a-${k}`, a.rows, a.pal, true).url);
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






/** Which portrait keys exist (the cast checks read this). */
export const portraitKeys = () => ({ humans: Object.keys(HUMANS), animals: Object.keys(ANIMALS), avatarKey: AVATAR_KEY });




