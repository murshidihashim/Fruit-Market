// A wooden crate with fruit heaped on top, in the deck-art style (navy outlines, warm flat colours), for the Home
// shopfront and the stamp card. Once the Market square's art (DEC-071, DEC-072); Home no longer draws the street, so
// only its crate is left. Built once as an SVG string and cached as a data URI. Colours all come from palette.ts.
// This file draws only: nothing here changes a rule.
import { C } from './palette';

const K = {
  ink: C.xInk, woodD: C.xWoodDark, woodL: C.xWoodLight,
  apple: C.xApple, mango: C.xMango, mangoD: C.xMangoDark, berry: C.xBerry, melon: C.xMelon, melonD: C.xMelonDark,
  leaf: C.xLeaf, ice: C.xIce, white: C.c_ffffff,
};

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
/** A wooden crate with fruit heaped on top. */
function crateSvg(x: number, y: number, w: number, h: number, f: FruitKind, r: number): string {
  return pile(x + 3, y + r * 0.2, w - 6, f, r)
    + `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${K.woodL}" stroke="${K.ink}" stroke-width="2.2"/>`
    + `<path d="M${x} ${n(y + h / 2)}h${w}" stroke="${K.woodD}" stroke-width="2"/>`
    + `<rect x="${x}" y="${y}" width="${n(w * 0.12)}" height="${h}" fill="${K.woodD}" stroke="${K.ink}" stroke-width="1.6"/>`
    + `<rect x="${n(x + w * 0.88)}" y="${y}" width="${n(w * 0.12)}" height="${h}" fill="${K.woodD}" stroke="${K.ink}" stroke-width="1.6"/>`;
}

// ---------- data URIs ----------
const cache = new Map<string, string>();
const memo = (key: string, make: () => string) => { let v = cache.get(key); if (v === undefined) { v = make(); cache.set(key, v); } return v; };
const toUrl = (vb: Box, body: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" width="${vb.w}" height="${vb.h}">${body}</svg>`)}`;

/** A picture's view box. */
interface Box { x: number; y: number; w: number; h: number }
/** A crate `w` x `h` with fruit heaped on top, as a picture (the box is 0..w, `top`..`top + h`). */
export function crateUrl(f: FruitKind, w: number, h: number): { url: string; top: number; vw: number; vh: number } {
  const r = Math.max(6, Math.round(h * 0.16)), top = Math.ceil(r * 2.4);
  const vb = { x: -2, y: 0, w: w + 4, h: h + top + 2 };
  return { url: memo(`crate-${f}-${w}-${h}`, () => toUrl(vb, crateSvg(0, top, w, h, f, r))), top, vw: vb.w, vh: vb.h };
}
