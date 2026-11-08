// The Market square (DEC-071): the home screen's street of stalls, and the pieces its opening animates (DEC-072).
// Drawn in the deck-art style (navy outlines, warm flat colours). Every piece is an SVG string built once and cached
// as a data URI, so the scene is a few dozen <image> layers rather than hundreds of shapes, and each layer (a stall's
// fruit, its awning, the lorry) can still move on its own in the opening. Colours all come from palette.ts.
// This file draws only: nothing here changes a rule.
import { C } from './palette';

const K = {
  ink: C.xInk, ink2: C.xInk2, paper: C.xPaper, red: C.xRed, mus: C.xMustard, musD: C.xMustardDark, grn: C.xGreen,
  wood: C.xWood, woodD: C.xWoodDark, woodL: C.xWoodLight, skyD: C.xSkyDark, back: C.xStallBack, cobble: C.xCobble,
  apple: C.xApple, mango: C.xMango, mangoD: C.xMangoDark, berry: C.xBerry, melon: C.xMelon, melonD: C.xMelonDark,
  leaf: C.xLeaf, ice: C.xIce, white: C.c_ffffff,
};

/** The six awning colours, one per shopkeeper (Rosa, Uncle Benny, Ah Chen, Saleh, Raj, Kiki). */
export const AWNINGS = [C.xRed, C.xGreen, C.xMustard, C.xSkyDark, C.xFig, C.xTeal];
/** Shopkeeper art keys in the same order (public/art/avatars). */
export const KEEPERS = ['rosa', 'benny', 'chen', 'saleh', 'raj', 'kiran'] as const;

export type FruitKind = 'apple' | 'mango' | 'berry' | 'melon';
const n = (v: number) => Math.round(v * 10) / 10;

// ---------- fruit ----------
function apple(x: number, y: number, r: number): string {
  const s = Math.max(1.4, r * 0.17);
  return `<path d="M${n(x)} ${n(y - r * 0.8)}q${n(r * 0.1)} ${n(-r * 0.5)} ${n(r * 0.35)} ${n(-r * 0.6)}" stroke="${K.ink}" stroke-width="${n(s)}" fill="none" stroke-linecap="round"/>`
    + `<ellipse cx="${n(x + r * 0.5)}" cy="${n(y - r * 1.1)}" rx="${n(r * 0.38)}" ry="${n(r * 0.18)}" transform="rotate(-25 ${n(x + r * 0.5)} ${n(y - r * 1.1)})" fill="${K.leaf}" stroke="${K.ink}" stroke-width="${n(s * 0.7)}"/>`
    + `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${K.apple}" stroke="${K.ink}" stroke-width="${n(s)}"/>`
    + `<path d="M${n(x - r * 0.55)} ${n(y - r * 0.15)}q${n(r * 0.1)} ${n(-r * 0.4)} ${n(r * 0.4)} ${n(-r * 0.5)}" stroke="${K.white}" stroke-opacity=".65" stroke-width="${n(s * 0.8)}" fill="none" stroke-linecap="round"/>`;
}
function mango(x: number, y: number, r: number): string {
  const s = Math.max(1.4, r * 0.17);
  return `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(r * 1.15)}" ry="${n(r * 0.88)}" transform="rotate(-22 ${n(x)} ${n(y)})" fill="${K.mango}" stroke="${K.ink}" stroke-width="${n(s)}"/>`
    + `<path d="M${n(x + r * 0.2)} ${n(y + r * 0.1)}q${n(r * 0.5)} ${n(-r * 0.1)} ${n(r * 0.6)} ${n(r * 0.45)}" stroke="${K.mangoD}" stroke-width="${n(s * 0.8)}" fill="none" stroke-linecap="round"/>`
    + `<ellipse cx="${n(x + r * 0.7)}" cy="${n(y - r * 0.85)}" rx="${n(r * 0.35)}" ry="${n(r * 0.16)}" transform="rotate(30 ${n(x + r * 0.7)} ${n(y - r * 0.85)})" fill="${K.leaf}" stroke="${K.ink}" stroke-width="${n(s * 0.7)}"/>`;
}
function berry(x: number, y: number, r: number): string {
  const s = Math.max(1.2, r * 0.13), q = r * 0.58;
  return ([[-0.45, 0.22], [0.45, 0.22], [0, -0.35]] as const).map(([a, b]) => {
    const cx = x + a * r, cy = y + b * r;
    return `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(q)}" fill="${K.berry}" stroke="${K.ink}" stroke-width="${n(s)}"/>`
      + `<path d="M${n(cx - q * 0.3)} ${n(cy - q * 0.3)}l${n(q * 0.6)} ${n(q * 0.6)}m0 ${n(-q * 0.6)}l${n(-q * 0.6)} ${n(q * 0.6)}" stroke="${K.ice}" stroke-width="${n(s * 0.7)}" stroke-linecap="round"/>`;
  }).join('');
}
function melon(x: number, y: number, r: number): string {
  const s = Math.max(1.4, r * 0.15);
  return `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(r * 1.35)}" ry="${n(r)}" fill="${K.melon}" stroke="${K.ink}" stroke-width="${n(s)}"/>`
    + `<path d="M${n(x - r * 0.7)} ${n(y - r * 0.82)}q${n(-r * 0.25)} ${n(r * 0.82)} 0 ${n(r * 1.64)}M${n(x)} ${n(y - r)}v${n(r * 2)}M${n(x + r * 0.7)} ${n(y - r * 0.82)}q${n(r * 0.25)} ${n(r * 0.82)} 0 ${n(r * 1.64)}" stroke="${K.melonD}" stroke-width="${n(s * 1.1)}" fill="none"/>`
    + `<path d="M${n(x - r * 0.9)} ${n(y - r * 0.35)}q${n(r * 0.2)} ${n(-r * 0.4)} ${n(r * 0.55)} ${n(-r * 0.5)}" stroke="${K.white}" stroke-opacity=".5" stroke-width="${n(s)}" fill="none" stroke-linecap="round"/>`;
}
const FRUIT: Record<FruitKind, (x: number, y: number, r: number) => string> = { apple, mango, berry, melon };

/** A little heap of one fruit: a back row and a front row, centred in width `w`. */
function pile(x: number, y: number, w: number, f: FruitKind, r: number): string {
  const step = f === 'melon' ? r * 2.5 : r * 2.05, c = Math.max(1, Math.floor((w - r * 0.4) / step));
  const off = x + (w - (c - 1) * step) / 2;
  let o = '';
  for (let i = 0; i < c - 1; i++) o += FRUIT[f](off + step * (i + 0.5), y - r * 1.05, r);
  for (let i = 0; i < c; i++) o += FRUIT[f](off + step * i, y, r);
  return o;
}
/** A wooden crate with fruit heaped on top (the lorry's load and the opening's flying crates). */
export function crateSvg(x: number, y: number, w: number, h: number, f: FruitKind, r: number): string {
  return pile(x + 3, y + r * 0.2, w - 6, f, r)
    + `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${K.woodL}" stroke="${K.ink}" stroke-width="2.2"/>`
    + `<path d="M${x} ${n(y + h / 2)}h${w}" stroke="${K.woodD}" stroke-width="2"/>`
    + `<rect x="${x}" y="${y}" width="${n(w * 0.12)}" height="${h}" fill="${K.woodD}" stroke="${K.ink}" stroke-width="1.6"/>`
    + `<rect x="${n(x + w * 0.88)}" y="${y}" width="${n(w * 0.12)}" height="${h}" fill="${K.woodD}" stroke="${K.ink}" stroke-width="1.6"/>`;
}

// ---------- awning, buildings, bunting ----------
function awning(x: number, y: number, w: number, h: number, col: string, cnt: number): string {
  const sw = w / cnt, band = h * 0.72;
  let o = '';
  for (let i = 0; i < cnt; i++) {
    const c = i % 2 ? K.paper : col;
    o += `<rect x="${n(x + i * sw)}" y="${n(y)}" width="${n(sw + 0.3)}" height="${n(band)}" fill="${c}"/>`
      + `<path d="M${n(x + i * sw)} ${n(y + band)}a${n(sw / 2)} ${n(h - band)} 0 0 0 ${n(sw)} 0Z" fill="${c}" stroke="${K.ink}" stroke-width="2.2" stroke-linejoin="round"/>`;
  }
  return o + `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(band)}" fill="none" stroke="${K.ink}" stroke-width="2.6"/>`
    + `<path d="M${n(x)} ${n(y + 5)}h${n(w)}" stroke="${K.ink}" stroke-opacity=".35" stroke-width="2"/>`;
}
function buildings(x0: number, x1: number, base: number, seed: number): string {
  let o = '', x = x0, i = seed;
  const col = `fill="${K.musD}" fill-opacity=".45"`, win = `fill="${K.musD}" fill-opacity=".3"`;
  while (x < x1) {
    const bw = 34 + ((i * 37) % 30), bh = 50 + ((i * 53) % 70);
    const roof = i % 3 === 0 ? `l${bw / 2} -16 l${bw / 2} 16` : i % 3 === 1 ? `h${n(bw * 0.3)}v-10h${n(bw * 0.4)}v10h${n(bw * 0.3)}` : `h${bw}`;
    o += `<path d="M${x} ${base}V${base - bh}${roof}V${base}Z" ${col}/>`;
    for (let r = 0; r < Math.floor(bh / 22); r++) for (let c = 0; c < Math.floor(bw / 14); c++) o += `<rect x="${x + 6 + c * 14}" y="${base - bh + 8 + r * 22}" width="6" height="9" ${win}/>`;
    x += bw + 4;
    i++;
  }
  return o;
}

// ---------- data URIs ----------
const cache = new Map<string, string>();
const memo = (key: string, make: () => string) => { let v = cache.get(key); if (v === undefined) { v = make(); cache.set(key, v); } return v; };
const toUrl = (vb: Box, body: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" width="${vb.w}" height="${vb.h}">${body}</svg>`)}`;

/** A box in scene units. */
export interface Box { x: number; y: number; w: number; h: number }
/** One picture placed in the scene. */
export interface Layer extends Box { url: string }
const layer = (key: string, b: Box, body: () => string): Layer => ({ ...b, url: memo(key, () => toUrl(b, body())) });

/** One stall, split into the parts the opening moves: the back and posts, the fruit, the counter and the awning. */
export interface Stall {
  key: string;
  /** The shopkeeper's portrait circle (scene units), or null for an empty stall. */
  face: { keeper: string; cx: number; cy: number; r: number } | null;
  back: Layer; fruit: Layer; counter: Layer; awning: Layer;
  /** From this stall's counter to the lorry bed (for the opening's fruit toss). */
  toss: { x: number; y: number };
}

function stall(x: number, y: number, w: number, h: number, col: string, keeper: string | null, fr: FruitKind[], bed: { x: number; y: number }): Stall {
  const ah = h * 0.3, ch = h * 0.28, key = `${x},${y},${w},${h}`;
  const s = Math.min(w * 0.5, (h - ah - ch) * 1.15), ix = x + w / 2 - s / 2, iy = y + h - ch - s * 0.92;
  const pad = 6;
  const back = layer(`b-${key}`, { x: x - pad, y: y + ah * 0.6 - pad, w: w + pad * 2, h: h - ah * 0.6 - ch + pad * 2 }, () =>
    `<rect x="${n(x + 5)}" y="${n(y + ah * 0.7)}" width="${n(w - 10)}" height="${n(h - ah * 0.7 - ch)}" fill="${K.back}" stroke="${K.ink}" stroke-width="2"/>`
    + `<rect x="${n(x + 2)}" y="${n(y + ah * 0.6)}" width="7" height="${n(h - ah * 0.6)}" fill="${K.wood}" stroke="${K.ink}" stroke-width="2"/>`
    + `<rect x="${n(x + w - 9)}" y="${n(y + ah * 0.6)}" width="7" height="${n(h - ah * 0.6)}" fill="${K.wood}" stroke="${K.ink}" stroke-width="2"/>`);
  const cw = (w - 8) / fr.length, rr = Math.max(3, Math.min(cw * 0.2, ch * 0.32));
  const fruitTop = y + h - ch - rr * 3.6;
  const fruit = layer(`f-${key}-${fr.join('')}`, { x: x - 2, y: n(fruitTop), w: w + 4, h: n(y + h - ch - fruitTop + rr * 1.4) }, () =>
    fr.map((f, k) => pile(x + 4 + k * cw, y + h - ch - rr * 0.25, cw, f, f === 'melon' ? rr * 0.85 : rr)).join(''));
  const counter = layer(`c-${key}`, { x: x - 5, y: y + h - ch - 2, w: w + 10, h: ch + 4 }, () =>
    `<rect x="${n(x - 3)}" y="${n(y + h - ch)}" width="${w + 6}" height="${n(ch)}" fill="${K.wood}" stroke="${K.ink}" stroke-width="2.4"/>`
    + `<path d="M${n(x - 3)} ${n(y + h - ch * 0.5)}h${w + 6}" stroke="${K.woodD}" stroke-width="2"/>`);
  const cnt = Math.max(4, Math.round(w / 16));
  const aw = layer(`a-${key}-${col}`, { x: x - 6, y: y - 2, w: w + 12, h: ah + 4 }, () => awning(x - 4, y, w + 8, ah, col, cnt));
  return {
    key, back, fruit, counter, awning: aw,
    face: keeper ? { keeper, cx: n(ix + s / 2), cy: n(iy + s / 2), r: n(s / 2) } : null,
    toss: { x: n(bed.x - (x + w / 2)), y: n(bed.y - (y + h - ch)) },
  };
}

/** A whole scene: its view box, the static backdrop, the stalls in drawing order (some in front of the road),
 *  where the lorry parks and the bunting along the rail. */
export interface Scene {
  view: Box;
  backdrop: Layer;
  road: Layer;
  backRow: Stall[];
  frontRow: Stall[];
  lorry: Box;
  /** The lorry bed, where crates are thrown from (scene units). */
  bed: Box;
  marks: Layer | null;
}

const LORRY_RATIO = 36 / 64;

/** Phone: four stalls along the back, two at the front corners, the lorry parked on the road between them.
 *  The ground, buildings and two extra stalls run past the edges for screens wider than the drawing. */
function phoneScene(): Scene {
  const lorry = { x: 100, y: 168, w: 189, h: n(189 * LORRY_RATIO) };
  const bed = { x: 196, y: 196, w: 84, h: 24 };
  const tossTo = { x: 238, y: 214 };
  const view = { x: 0, y: 0, w: 390, h: 300 };
  const back: Stall[] = [
    stall(-86, 48, 86, 104, AWNINGS[5], null, ['melon', 'apple'], tossTo),
    stall(8, 48, 86, 104, AWNINGS[0], 'rosa', ['apple', 'mango', 'berry', 'melon'], tossTo),
    stall(102, 48, 86, 104, AWNINGS[1], 'benny', ['apple', 'mango', 'berry', 'melon'], tossTo),
    stall(196, 48, 86, 104, AWNINGS[2], 'chen', ['apple', 'mango', 'berry', 'melon'], tossTo),
    stall(290, 48, 86, 104, AWNINGS[3], 'saleh', ['apple', 'mango', 'berry', 'melon'], tossTo),
    stall(384, 48, 86, 104, AWNINGS[4], null, ['berry', 'mango'], tossTo),
  ];
  const front: Stall[] = [
    stall(-34, 122, 128, 150, AWNINGS[4], 'raj', ['berry', 'apple'], tossTo),
    stall(296, 122, 128, 150, AWNINGS[5], 'kiran', ['mango', 'melon'], tossTo),
  ];
  const backdrop = layer('p-backdrop', { x: -420, y: 20, w: 1230, h: 132 }, () => buildings(-420, 810, 150, 1));
  const road = layer('p-road', { x: -420, y: 147, w: 1230, h: 156 }, () =>
    `<rect x="-422" y="150" width="1234" height="156" fill="${K.cobble}" stroke="${K.ink}" stroke-width="3"/>`
    + `<path d="M-420 214H810M-420 272H810" stroke="${K.ink}" stroke-width="2" stroke-opacity=".35"/>`
    + `<path d="M-420 243H810" stroke="${K.paper}" stroke-width="3" stroke-dasharray="14 12"/>`);
  const marks = layer('p-marks', { x: 294, y: 218, w: 30, h: 24 }, () =>
    `<path d="M300 222h18M306 230h14M298 238h20" stroke="${K.ink}" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>`);
  return { view, backdrop, road, backRow: back, frontRow: front, lorry, bed, marks };
}

/** Wide screens: all six stalls in a row along the back, the lorry parked on the road in front. */
function wideScene(): Scene {
  const view = { x: 0, y: 0, w: 1120, h: 330 };
  const lorry = { x: 452, y: 200, w: 216, h: n(216 * LORRY_RATIO) };
  const bed = { x: 556, y: 230, w: 96, h: 28 };
  const tossTo = { x: 604, y: 250 };
  const back = KEEPERS.map((k, i) => stall(26 + i * 180, 22, 168, 190, AWNINGS[i], k, ['apple', 'mango', 'berry', 'melon'], tossTo));
  back.unshift(stall(-160, 22, 168, 190, AWNINGS[5], null, ['melon', 'apple'], tossTo));
  back.push(stall(1106, 22, 168, 190, AWNINGS[0], null, ['berry', 'mango'], tossTo));
  const backdrop = layer('w-backdrop', { x: -400, y: 60, w: 1920, h: 152 }, () => buildings(-400, 1520, 210, 2));
  const road = layer('w-road', { x: -400, y: 205, w: 1920, h: 130 }, () =>
    `<rect x="-402" y="208" width="1924" height="130" fill="${K.cobble}" stroke="${K.ink}" stroke-width="3"/>`
    + `<path d="M-400 262H1520M-400 318H1520" stroke="${K.ink}" stroke-width="2" stroke-opacity=".35"/>`
    + `<path d="M-400 290H1520" stroke="${K.paper}" stroke-width="3" stroke-dasharray="16 14"/>`);
  return { view, backdrop, road, backRow: back, frontRow: [], lorry, bed, marks: null };
}

let phone: Scene | null = null, wide: Scene | null = null;
/** The scene for a narrow (phone) or wide layout, built on first use. */
export function marketScene(isWide: boolean): Scene {
  if (isWide) return (wide ??= wideScene());
  return (phone ??= phoneScene());
}

/** A crate for the opening's unloading, `w` x `h` with fruit heaped on top (the box is 0..w, `top`..`top + h`). */
export function crateUrl(f: FruitKind, w: number, h: number): { url: string; top: number; vw: number; vh: number } {
  const r = Math.max(6, Math.round(h * 0.16)), top = Math.ceil(r * 2.4);
  const vb = { x: -2, y: 0, w: w + 4, h: h + top + 2 };
  return { url: memo(`crate-${f}-${w}-${h}`, () => toUrl(vb, crateSvg(0, top, w, h, f, r))), top, vw: vb.w, vh: vb.h };
}
