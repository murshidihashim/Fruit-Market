// Flat fruit icons in the deck-art style (DEC-066): navy outline, one flat fill, one shade, a leaf.
// One drawing feeds the app (FruitSvg, a single <img> so the game screen stays lean) and the print kit
// (fruitSvgString). Freshness is shown the same way everywhere: Okay is duller with one bruise, Soft is browner
// with spots, Unripe is green.
import { FRUIT, type FruitId, type Stage } from '../engine/data';
import { C } from './palette';

type Shape = ['path' | 'circle' | 'ellipse', Record<string, string | number>];

const INK = C.xInk;
const LINE = 1.8;

/** Blend two #rrggbb colours (t = 0 gives a, 1 gives b). */
function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const x = p(a);
  const y = p(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

const BASE: Record<FruitId, { body: string; shade: string }> = {
  apple: { body: C.xApple, shade: C.xAppleDark },
  mango: { body: C.xMango, shade: C.xMangoDark },
  blueberry: { body: C.xBerry, shade: C.xBerryDark },
  watermelon: { body: C.xMelon, shade: C.xMelonDark },
};

function colours(id: FruitId, stage: Stage) {
  const b = BASE[id];
  if (stage === 'unripe') return { body: C.xUnripe, shade: C.xUnripeDark, leaf: C.xLeaf };
  if (stage === 'okay') return { body: mix(b.body, C.xSlate, 0.16), shade: mix(b.shade, C.xSlate, 0.16), leaf: mix(C.xLeaf, C.xSlate, 0.2) };
  if (stage === 'notso') return { body: mix(b.body, C.xBruise, 0.42), shade: mix(b.shade, C.xBruise, 0.42), leaf: mix(C.xLeaf, C.xBruise, 0.55) };
  return { body: b.body, shade: b.shade, leaf: C.xLeaf };
}

const outline = { stroke: INK, 'stroke-width': LINE, 'stroke-linejoin': 'round' };
const shine = (cx: number, cy: number, rx: number, ry: number, rot = -25): Shape =>
  ['ellipse', { cx, cy, rx, ry, transform: `rotate(${rot} ${cx} ${cy})`, fill: C.xPaper, opacity: 0.6 }];

function shapes(id: FruitId, stage: Stage): Shape[] {
  const k = colours(id, stage);
  const out: Shape[] = [];
  if (id === 'apple') {
    out.push(
      ['path', { d: 'M16 10.5C15.8 8 16.6 5.6 18.2 4', fill: 'none', stroke: INK, 'stroke-width': 2.2, 'stroke-linecap': 'round' }],
      ['path', { d: 'M17.6 7.2C18.6 4.2 22.4 3 25.4 3.8 24.6 7 21 8.4 17.6 7.2Z', fill: k.leaf, ...outline, 'stroke-width': 1.4 }],
      ['path', { d: 'M16 10.2C12 7.4 4.8 8.4 4.8 16.2 4.8 23.6 9.8 29 13.4 29 15 29 15.2 28.2 16 28.2S17 29 18.6 29C22.2 29 27.2 23.6 27.2 16.2 27.2 8.4 20 7.4 16 10.2Z', fill: k.body, ...outline }],
      ['path', { d: 'M24.6 12.4C27 18.4 23.6 26.2 18.8 27.6 22.6 27.6 26.2 22.4 26.2 16.4 26.2 14.8 25.6 13.4 24.6 12.4Z', fill: k.shade }],
      shine(10.2, 14.6, 1.6, 2.8),
    );
  } else if (id === 'mango') {
    // A tilted oval: the shade is the oval itself, the lit part a smaller oval nudged up and left.
    const oval = (cx: number, cy: number, rx: number, ry: number) => ({ cx, cy, rx, ry, transform: `rotate(38 ${cx} ${cy})` });
    out.push(
      ['path', { d: 'M22.6 9.2 24 5.4', fill: 'none', stroke: INK, 'stroke-width': 2.2, 'stroke-linecap': 'round' }],
      ['path', { d: 'M23.4 6.6C20.8 3.4 16.4 3.2 14.2 4.8 16.4 7.6 20.4 8.2 23.4 6.6Z', fill: k.leaf, ...outline, 'stroke-width': 1.4 }],
      ['ellipse', { ...oval(16.2, 17.8, 9.4, 11.8), fill: k.shade }],
      ['ellipse', { ...oval(15.3, 16.8, 8.3, 10.7), fill: k.body }],
      ['ellipse', { ...oval(16.2, 17.8, 9.4, 11.8), fill: 'none', ...outline }],
      shine(12.4, 16, 1.5, 3, 38),
    );
  } else if (id === 'blueberry') {
    out.push(
      ['circle', { cx: 16, cy: 17.4, r: 11.2, fill: k.body, ...outline }],
      ['path', { d: 'M25.6 20.6C24 25.6 18.6 28.8 12.4 27.4 18.4 27 23.4 24.4 25.6 20.6Z', fill: k.shade }],
      ['path', { d: 'M12.4 9.2 13.6 5.8 15.2 7.8 16 4.6 16.8 7.8 18.4 5.8 19.6 9.2C17.2 10.2 14.8 10.2 12.4 9.2Z', fill: k.shade, ...outline, 'stroke-width': 1.3 }],
      shine(10.8, 14.2, 2.4, 1.6, -30),
    );
  } else {
    out.push(
      ['path', { d: 'M16 8.2C16 6.4 16.8 5.2 18.4 4.4', fill: 'none', stroke: INK, 'stroke-width': 2.2, 'stroke-linecap': 'round' }],
      ['ellipse', { cx: 16, cy: 18, rx: 12.6, ry: 10, fill: k.body, ...outline }],
      ['path', { d: 'M5.6 14.4C10 10.6 22 10.6 26.4 14.4M4.4 18.4C9.4 16.2 22.6 16.2 27.6 18.4M5.8 22.4C10.4 25 21.6 25 26.2 22.4', fill: 'none', stroke: k.shade, 'stroke-width': 2.4, 'stroke-linecap': 'round' }],
      shine(10.4, 12.6, 2.6, 1.3, -12),
    );
  }
  const spot = (cx: number, cy: number, r: number, c: string): Shape => ['ellipse', { cx, cy, rx: r, ry: r * 0.8, fill: c }];
  if (stage === 'okay') out.push(spot(21.4, 21.2, 2.1, mix(C.xBruise, k.body, 0.25)));
  if (stage === 'notso') {
    const dark = mix(C.xBruise, INK, 0.25);
    out.push(spot(20.8, 15.2, 2, dark), spot(12.6, 22.4, 1.6, dark), spot(21.6, 23.2, 1.2, dark));
  }
  return out;
}

const attrs = (a: Record<string, string | number>) => Object.entries(a).map(([k, v]) => ` ${k}="${v}"`).join('');

/** The fruit as SVG markup (for the print kit and anywhere a string is needed). */
export function fruitSvgString(id: FruitId, stage: Stage = 'fresh', size = 32): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}">`
    + shapes(id, stage).map(([t, a]) => `<${t}${attrs(a)}/>`).join('')
    + '</svg>';
}

const urls = new Map<string, string>();
/** The fruit as a data URL (cached), for <img> and CSS backgrounds. */
export function fruitSvgUrl(id: FruitId, stage: Stage = 'fresh'): string {
  const key = `${id}-${stage}`;
  let u = urls.get(key);
  if (!u) {
    u = `data:image/svg+xml,${encodeURIComponent(fruitSvgString(id, stage))}`;
    urls.set(key, u);
  }
  return u;
}

const STAGE_WORD: Record<Stage, string> = { fresh: 'Fresh', okay: 'Okay', notso: 'Soft', unripe: 'Unripe' };

/** A flat deck-art fruit. One element; CSS may resize it (it scales cleanly). `alt=""` when a label beside it already names the fruit. */
export function FruitSvg({ id, stage = 'fresh', size = 24, alt, class: cls, x, y }: {
  id: FruitId; stage?: Stage; size?: number; alt?: string; class?: string;
  /** Position when nested inside another SVG. */
  x?: number; y?: number;
}) {
  const label = alt ?? (stage === 'fresh' ? FRUIT[id].name : `${STAGE_WORD[stage]} ${FRUIT[id].name.toLowerCase()}`);
  const c = `x-fruit${cls ? ` ${cls}` : ''}`;
  if (x !== undefined || y !== undefined) {
    return <image class={c} href={fruitSvgUrl(id, stage)} x={x} y={y} width={size} height={size} aria-label={label || undefined} />;
  }
  return <img class={c} src={fruitSvgUrl(id, stage)} width={size} height={size} alt={label} decoding="async" draggable={false} />;
}
