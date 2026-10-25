// Pixel-art sprites drawn as crisp SVG rectangles from small text maps.
// Every sprite gets a 1px ink outline so the whole cast reads as one set.
import type { FruitId, Stage } from '../engine/data';

type Pal = Record<string, string>;

const INK = '#2b2438';

// ---------- renderer ----------

const cache = new Map<string, { w: number; h: number; runs: [number, number, number, string][] }>();

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
  const out = { w, h, runs };
  cache.set(key, out);
  return out;
}

export function Sprite({ id, rows, pal, size, outline = true, cls = '', title, x, y }: {
  id: string; rows: string[]; pal: Pal; size: number; outline?: boolean; cls?: string; title?: string;
  /** Position when nested inside another SVG (the market scene). */
  x?: number; y?: number;
}) {
  const { w, h, runs } = compile(id, rows, pal, outline);
  return (
    <svg class={`px ${cls}`} x={x} y={y} width={size} height={(size * h) / w} viewBox={`0 0 ${w} ${h}`} shape-rendering="crispEdges" aria-label={title} role={title ? 'img' : undefined}>
      {runs.map(([x, y, l, c]) => <rect x={x} y={y} width={l} height={1} fill={c} />)}
    </svg>
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
  apple: { R: '#d6453b', D: '#9c2b32', H: '#f2a08c', S: '#6b4226', L: '#6aa84f' },
  blueberry: { R: '#5562c9', D: '#353d8f', H: '#a9b3f2', K: '#232a63' },
  watermelon: { R: '#e8505b', H: '#f59aa0', K: '#2b2438', L: '#d6efb4', G: '#3f8f4a' },
  mango: { R: '#f0b33a', D: '#e0742c', H: '#fbe09a', S: '#6b4226', L: '#6aa84f' },
};

const UNRIPE_PAL: Record<FruitId, Pal> = {
  apple: { R: '#8fbf5a', D: '#5f8f3a', H: '#cfe6a3', S: '#6b4226', L: '#4f8a3b' },
  blueberry: { R: '#9aa7c9', D: '#6f7aa0', H: '#d3d9ec', K: '#4a5275' },
  watermelon: { R: '#f2c2b8', H: '#fbe3dc', K: '#c9b8a0', L: '#e6f2cf', G: '#6aa84f' },
  mango: { R: '#9cc45a', D: '#6f9a3c', H: '#d5e8a6', S: '#6b4226', L: '#4f8a3b' },
};

function stagePal(f: FruitId, stage: Stage): Pal {
  if (stage === 'unripe') return UNRIPE_PAL[f];
  const base = FRUIT_PAL[f];
  if (stage === 'fresh') return base;
  const t = stage === 'okay' ? 0.22 : 0.48;
  const out: Pal = {};
  for (const [k, v] of Object.entries(base)) out[k] = k === 'K' ? v : mix(v, '#8a6a3a', t);
  if (stage === 'notso') out.X = '#5b4022';
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
    pal: { B: '#7a4a2e', L: '#c98a55', R: '#d6453b', G: '#6aa84f', Y: '#f0b33a' },
  },
  handcart: {
    rows: ['..........KK', '.........K..', 'RRRRRRRRRK..', 'RWRWRWRWRK..', 'RRRRRRRRRK..', 'KKKKKKKKKK..', '.KK....KK...', '.KK....KK...'],
    pal: { R: '#c8553d', W: '#f6ead2', K: '#3b3048' },
  },
  coolroom: {
    rows: ['TTTTTTTTTTTT', 'TLLLLLLLLLLT', 'TL..W..W.LLT', 'TL.WWWWWW.LT', 'TL..WWWW..LT', 'TL.WWWWWW.LT', 'TL..W..W.LLT', 'TLLLLLLLLLLT', 'TTTTTTTTTTTT'],
    pal: { T: '#2c6b69', L: '#7cc4c0', W: '#f6ead2' },
  },
  signboard: {
    rows: ['YYYYYYYYYYYY', 'YCCCCCCCCCCY', 'YCRRCGGCRRCY', 'YCCCCCCCCCCY', 'YYYYYYYYYYYY', '.....BB.....', '.....BB.....', '....BBBB....'],
    pal: { Y: '#e8b04b', C: '#f6ead2', R: '#c8553d', G: '#3e8f8c', B: '#7a4a2e' },
  },
  lantern: {
    rows: ['.K.', 'KYK', 'YWY', 'KYK'],
    pal: { K: '#3b3048', Y: '#f2c14e', W: '#fff2c2' },
  },
  coin: {
    rows: ['..YYYY..', '.YWYYYY.', 'YWYDDYYO', 'YYYDYYYO', 'YYYDDYYO', 'YYYYDYYO', '.YYDDYO.', '..OOOO..'],
    pal: { Y: '#f2c14e', W: '#fff2c2', D: '#b8862b', O: '#c98f25' },
  },
  crate: {
    rows: ['BBBBBBBBBB', 'BLLLLLLLLB', 'BLDLLLLDLB', 'BBBBBBBBBB', 'BLLLLLLLLB', 'BLDLLLLDLB', 'BBBBBBBBBB'],
    pal: { B: '#8a5a3b', L: '#c99563', D: '#6b4226' },
  },
  cart: {
    rows: ['KK........', '.K........', '.KRRRRRRR.', '.KRWRWRWR.', '..RRRRRRR.', '..KKKKKKK.', '...K...K..'],
    pal: { K: '#4a4058', R: '#d6453b', W: '#f4ecd8' },
  },
  truck: {
    rows: ['..........WWWW..', 'RRRRRRRRR.WBBWW.', 'RWWRRWWRR.WBBWWW', 'RRRRRRRRRRWWWWWW', 'RRRRRRRRRRWWWWWW', '.KK....KK...KK..', '.KK....KK...KK..'],
    pal: { R: '#d6453b', W: '#f4ecd8', B: '#7fb3d5', K: '#2b2438' },
  },
  star: {
    rows: ['....Y....', '...YYY...', 'YYYYWYYYY', '.YYYYYYY.', '..YYYYY..', '.YYY.YYY.', '.YY...YY.'],
    pal: { Y: '#f2c14e', W: '#fff2c2' },
  },
  moon: {
    rows: ['..YYY..', '.YYW...', 'YYW....', 'YYW....', 'YYW....', '.YYW...', '..YYY..'],
    pal: { Y: '#f2d77e', W: '#fff2c2' },
  },
  sun: {
    rows: ['...Y...', '.Y.Y.Y.', '..OOO..', 'YOOWOOY', '..OOO..', '.Y.Y.Y.', '...Y...'],
    pal: { Y: '#f2c14e', O: '#f0a23a', W: '#fff2c2' },
  },
  heart: {
    rows: ['.RR.RR.', 'RWRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'],
    pal: { R: '#d6453b', W: '#f59aa0' },
  },
  juicer: {
    rows: ['..KKKKKK....', '..KMMMMK....', '...KMMK.....', '....KK......', '..GGGGGG....', '..GOOOOG....', '..GOOOOG.KK.', '..GOOOOGK..K', '..GGGGGG....'],
    pal: { K: '#3b3048', M: '#9aa0a6', G: '#f6ead2', O: '#f0a23a' },
  },
  bell: {
    rows: ['.....KK.....', '....YYYY....', '...YWYYYY...', '...YWYYYY...', '..YYYYYYYY..', '..YYYYYYYY..', '.YYYYYYYYYY.', 'DDDDDDDDDDDD', '.....DD.....'],
    pal: { Y: '#e8b04b', W: '#fff2c2', D: '#b07f27', K: '#3b3048' },
  },
  scales: {
    rows: ['.....K.....', '.KKKKKKKKK.', '.K...K...K.', 'KYK..K..KYK', 'YYY..K..YYY', '.....K.....', '...KKKKK...'],
    pal: { K: '#3b3048', Y: '#e8b04b' },
  },
  tag: {
    rows: ['..RRRRRR', '.RRRRRRR', 'RRWRRRRR', 'RRRRRRRR', '.RRRRRRR', '..RRRRRR'],
    pal: { R: '#c8553d', W: '#f6ead2' },
  },
  egg: {
    rows: ['..CCC..', '.CCCCC.', '.CWCCC.', 'CCWCCCC', 'CCCCCCC', 'CCCCCCD', '.CCCCD.', '..DDD..'],
    pal: { C: '#f6ead2', W: '#ffffff', D: '#d7c49e' },
  },
};


export function Icon({ name, size = 16 }: { name: keyof typeof ICONS; size?: number }) {
  const i = ICONS[name];
  return <Sprite id={`i-${name}`} rows={i.rows} pal={i.pal} size={size} cls="icon" />;
}

// ---------- portraits ----------
// Humans are built from a face plus layered parts; animals are hand-drawn.

const BASE_PAL: Pal = {
  K: INK, W: '#f4ecd8', E: '#2b2438', M: '#a8423f', C: '#f0a08c',
  H: '#5b3a24', T: '#c9a46a', B: '#7a4f2e', Y: '#f2c14e', R: '#d6453b', P: '#7b5aa6',
  N: '#2f4a7a', G: '#4f9a52', L: '#9ad0e6', O: '#e8873a', A: '#9aa3ad', V: '#e889b4', Q: '#3fa39a',
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
  glasses: ['', '', '', '', '', '', '', '', '....KKK..KKK....', '....K.KKKK.K....', '....KKK..KKK....'],
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
  bolt: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '.......YY.......'],
};

interface Human { skin: string; shirt: string; parts: string[]; pal?: Pal }

const SKIN = { a: '#f6d2b0', b: '#e3b088', c: '#c48a5f', d: '#8f5e3c', pale: '#ece6e2', green: '#9db57a', blue: '#7aa6dc', grey: '#b8c0c9' };

const HUMANS: Record<string, Human> = {
  John: { skin: SKIN.b, shirt: '#d6453b', parts: ['hairShort', 'cowboy'] },
  Robert: { skin: SKIN.pale, shirt: '#2b2438', parts: ['hairSlick', 'collar'], pal: { H: '#2b2438' } },
  Daniel: { skin: SKIN.a, shirt: '#7b5aa6', parts: ['longBeard', 'wizard'] },
  Chris: { skin: '#fff2e6', shirt: '#4f9a52', parts: ['hairSpiky', 'nose'], pal: { H: '#e8873a' } },
  Aisyah: { skin: SKIN.c, shirt: '#f4ecd8', parts: ['astro'] },
  Ravi: { skin: SKIN.d, shirt: '#d6453b', parts: ['hairSpiky', 'mask', 'bolt'], pal: { H: '#2b2438' } },
  'Mei Ling': { skin: SKIN.a, shirt: '#3fa39a', parts: ['hairLong', 'flower'], pal: { H: '#3fa39a' } },
  Farid: { skin: SKIN.c, shirt: '#2b2438', parts: ['ninja'] },
  Siti: { skin: SKIN.b, shirt: '#e889b4', parts: ['hairLong', 'crown'], pal: { H: '#3a2418' } },
  Kumar: { skin: SKIN.blue, shirt: '#7b5aa6', parts: ['turban', 'mustache'], pal: { H: '#2b2438' } },
  Grace: { skin: SKIN.a, shirt: '#2b2438', parts: ['hairSpiky', 'shades'], pal: { H: '#7b5aa6' } },
  Hafiz: { skin: SKIN.c, shirt: '#4f9a52', parts: ['dino'] },
  'Wei Jie': { skin: SKIN.a, shirt: '#8a6a3a', parts: ['hairShort', 'detective', 'glasses'], pal: { H: '#2b2438' } },
  Nurul: { skin: SKIN.b, shirt: '#9ad0e6', parts: ['wings', 'hairBun'], pal: { H: '#5b3a24' } },
  Priya: { skin: SKIN.c, shirt: '#f4ecd8', parts: ['hairBun', 'glasses'], pal: { H: '#2b2438' } },
  Ahmad: { skin: SKIN.c, shirt: '#2f4a7a', parts: ['beard', 'captain'], pal: { H: '#3a2418' } },
  Sarah: { skin: SKIN.a, shirt: '#e889b4', parts: ['hairLong', 'horn'], pal: { H: '#e889b4' } },
  Tan: { skin: SKIN.a, shirt: '#8a6a3a', parts: ['hairSides', 'glasses', 'mustache'], pal: { H: '#f4ecd8' } },
  Lina: { skin: SKIN.b, shirt: '#d6453b', parts: ['hairBun', 'flower'], pal: { H: '#2b2438' } },
  Zul: { skin: SKIN.green, shirt: '#6b6f7a', parts: ['hairSpiky'], pal: { H: '#3d4a2a', M: '#5b4022' } },
  Anna: { skin: SKIN.a, shirt: '#f2c14e', parts: ['hairLong', 'beret'], pal: { H: '#c4723a' } },
  Vijay: { skin: SKIN.grey, shirt: '#6b6f7a', parts: ['antenna'], pal: { E: '#3fa39a', M: '#2b2438', C: '#b8c0c9' } },
  'Hui Min': { skin: SKIN.a, shirt: '#4f9a52', parts: ['ears', 'hairLong'], pal: { H: '#f2d77e' } },
  Osman: { skin: SKIN.d, shirt: '#d6453b', parts: ['mustache', 'helmet'], pal: { H: '#2b2438' } },
  Influencer: { skin: SKIN.b, shirt: '#e889b4', parts: ['hairLong', 'shades', 'phone'], pal: { H: '#f2d77e' } },
  'Gym Club': { skin: SKIN.c, shirt: '#2f4a7a', parts: ['hairShort', 'headband'], pal: { H: '#2b2438' } },
  'Hotel Chef': { skin: SKIN.a, shirt: '#f4ecd8', parts: ['mustache', 'chef'], pal: { H: '#3a2418' } },
  // Player shopkeepers
  you: { skin: SKIN.b, shirt: '#d6453b', parts: ['hairShort', 'chef'] },
  you2: { skin: SKIN.c, shirt: '#4f9a52', parts: ['hairBun', 'headband'], pal: { H: '#2b2438' } },
  you3: { skin: SKIN.a, shirt: '#2f4a7a', parts: ['hairSpiky', 'mask'], pal: { H: '#c4723a' } },
  you4: { skin: SKIN.d, shirt: '#f2c14e', parts: ['beret', 'hairLong'], pal: { H: '#2b2438' } },
  shopper: { skin: SKIN.b, shirt: '#8a6a3a', parts: ['hairShort'] },
};

const ANIMALS: Record<string, { rows: string[]; pal: Pal }> = {
  fox: {
    rows: ['................', '..K..........K..', '..KO........OK..', '..KOO......OOK..', '..KOOOOOOOOOOK..', '..OOOOOOOOOOOO..', '.OOOOOOOOOOOOOO.', '.OOOEOOOOOOEOOO.', '.OOOOOOOOOOOOOO.', '..OWWWOOOOWWWO..', '..WWWWWKKWWWWW..', '...WWWWWWWWWW...', '....WWWWWWWW....', '.....WWWWWW.....', '...GGGGGGGGGG...', '..GGGGGGGGGGGG..'],
    pal: { O: '#e8873a', W: '#f4ecd8', K: '#2b2438', E: '#2b2438', G: '#4f9a52' },
  },
  bear: {
    rows: ['................', '..BBB......BBB..', '..BLB......BLB..', '..BBBBBBBBBBBB..', '..BBBBBBBBBBBB..', '.BBBBBBBBBBBBBB.', '.BBBEBBBBBBEBBB.', '.BBBBBBBBBBBBBB.', '.BBBBLLLLLLBBBB.', '.BBBLLLKKLLLBBB.', '..BBLLLLLLLLBB..', '..BBBLLMMLLBBB..', '...BBBBBBBBBB...', '....BBBBBBBB....', '..RRRRRRRRRRRR..', '.RRRRRRRRRRRRRR.'],
    pal: { B: '#8a5a3b', L: '#d9b48a', K: '#2b2438', E: '#2b2438', M: '#a8423f', R: '#d6453b' },
  },
  panda: {
    rows: ['................', '..KKK......KKK..', '..KKK......KKK..', '..KKWWWWWWWWKK..', '...WWWWWWWWWW...', '..WWWWWWWWWWWW..', '..WKKKWWWWKKKW..', '..WKWKWWWWKWKW..', '..WKKKWWWWKKKW..', '..WWWWWKKWWWWW..', '..WWWWWWWWWWWW..', '...WWWWMMWWWW...', '....WWWWWWWW....', '...QQQQQQQQQQ...', '..QQQQQQQQQQQQ..', '..QQQQQQQQQQQQ..'],
    pal: { W: '#f4ecd8', K: '#2b2438', M: '#a8423f', Q: '#3fa39a' },
  },
  toad: {
    rows: ['................', '...TTTTTTTTT....', '..TTTTTTTTTTT...', '..GGG....GGG....', '.GWWKG..GWWKG...', '.GWWWG..GWWWG...', '.GGGGGGGGGGGG...', 'GGGGGGGGGGGGGG..', 'GGGDGGGGGGDGGG..', 'GGGGGGGGGGGGGG..', 'GKKKKKKKKKKKKG..', 'GGGGGGGGGGGGGG..', '.GYYYYYYYYYYG...', '..YYYYYYYYYY....', '.PPPPPPPPPPPP...', 'PPPPPPPPPPPPPP..'],
    pal: { G: '#6aa84f', D: '#3f7a34', Y: '#e6d58a', W: '#f4ecd8', K: '#2b2438', T: '#8a5a3b', P: '#7b5aa6' },
  },
  raccoon: {
    rows: ['................', '..AA........AA..', '..AKA......AKA..', '..AAAAAAAAAAAA..', '..AAAAAAAAAAAA..', '.AAAAAAAAAAAAAA.', '.AKKKKAAAAKKKKA.', '.AKWKKAAAAKKWKA.', '.AKKKKAWWAKKKKA.', '..AAAWWWWWWAAA..', '..AWWWWKKWWWWA..', '...WWWWWWWWWW...', '....WWWWWWWW....', '.....AAAAAA.....', '...NNNNNNNNNN...', '..NNNNNNNNNNNN..'],
    pal: { A: '#8f949c', K: '#2b2438', W: '#f4ecd8', N: '#2f4a7a' },
  },
  pig: {
    rows: ['................', '..PP........PP..', '..PDP......PDP..', '..PPPPPPPPPPPP..', '..PPPPPPPPPPPP..', '.PPPPPPPPPPPPPP.', '.PPPEPPPPPPEPPP.', '.PPPPPPPPPPPPPP.', '.PPPPDDDDDDPPPP.', '.PPPPDKDDKDPPPP.', '.PPPPDDDDDDPPPP.', '..PPPPPPPPPPPP..', '...PPPPPPPPPP...', '....PPPPPPPP....', '...YYYYYYYYYY...', '..YYYYYYYYYYYY..'],
    pal: { P: '#eba3b0', D: '#d47d8f', K: '#2b2438', E: '#2b2438', Y: '#f2c14e' },
  },
};

const AVATAR_KEY: Record<string, string> = {
  '🦊': 'fox', '🐻': 'bear', '🐼': 'panda', '🐸': 'toad', '🦝': 'raccoon', '🐷': 'pig',
  '🧑‍🍳': 'you', '👩‍🍳': 'you2', '🦸': 'you3', '🐵': 'you4',
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
