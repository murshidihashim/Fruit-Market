// Flat fruit icons in the deck-art style (DEC-066): navy outline, one flat fill, one shade, a leaf.
// One drawing feeds the app (FruitSvg, a single <img> so the game screen stays lean) and the print kit
// (fruitSvgString). Freshness is shown the same way everywhere: Okay is duller with one bruise, Soft is browner
// with spots, Unripe is green.
import { FRUIT, type FruitId, type Stage } from '../engine/data';
import { C } from './palette';

type Shape = ['path' | 'circle' | 'ellipse', Record<string, string | number>];

const INK = C.xInk;

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

/** Shapes are drawn in a 100-unit box (the same drawings as the print-and-play kit) and scaled into the 32-unit icon. */
const K = 0.32;
const p = (d: string, fill: string): Shape => ['path', { d, fill, transform: `scale(${K})` }];
const el = (cx: number, cy: number, rx: number, ry: number, fill: string): Shape => ['ellipse', { cx, cy, rx, ry, fill, transform: `scale(${K})` }];
/** A five-point star (the blueberry's crown). */
function star(cx: number, cy: number, r1: number, r2: number): string {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? r2 : r1;
    const a = (Math.PI * i) / 5 - Math.PI / 2;
    d += `${i ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  }
  return `${d}Z`;
}

/** Market Ticket fruit (PLAN-070): flat shapes, two tones, no outline. */
function shapes(id: FruitId, stage: Stage): Shape[] {
  const k = colours(id, stage);
  const out: Shape[] = [];
  if (id === 'apple') {
    out.push(
      p('M50 28C32 13 7 26 9 56C11 83 31 96 50 90C69 96 89 83 91 56C93 26 68 13 50 28Z', k.body),
      el(30, 48, 6, 13, C.xPaper),
      p('M47 8h7v22h-7Z', INK),
      p('M55 18C63 4 85 4 91 13C81 25 63 25 55 18Z', INK),
    );
  } else if (id === 'mango') {
    out.push(
      p('M20 46C13 70 32 94 58 94C84 94 96 68 88 43C80 19 55 10 38 18C28 23 22 33 20 46Z', k.body),
      p('M56 13C80 20 94 44 88 66C84 82 72 92 58 94C76 78 82 48 56 13Z', k.shade),
      el(33, 50, 6, 13, C.xPaper),
      p('M42 15C50 0 72 0 78 9C68 21 50 22 42 15Z', INK),
    );
  } else if (id === 'blueberry') {
    out.push(
      ['circle', { cx: 50, cy: 54, r: 40, fill: k.body, transform: `scale(${K})` }],
      el(34, 40, 9, 6.5, C.xPaper),
      p(star(53, 34, 14, 6.5), INK),
    );
  } else {
    out.push(
      p('M5 26H95A45 56 0 0 1 5 26Z', k.body),
      p('M13 26H87A37 47 0 0 1 13 26Z', C.xPaper),
      p('M20 26H80A30 40 0 0 1 20 26Z', stage === 'fresh' ? C.xFlesh : mix(C.xFlesh, C.xBruise, stage === 'okay' ? 0.2 : 0.5)),
      ...([[34, 38], [50, 48], [66, 38], [42, 56], [58, 58], [50, 33]] as const).map(([x, y]) => el(x, y, 2.8, 4.4, INK)),
    );
  }
  const dark = mix(C.xBruise, INK, 0.25);
  const spot = (cx: number, cy: number, r: number): Shape => el(cx, cy, r, r * 0.8, dark);
  if (stage === 'okay') out.push(spot(66, 68, 7));
  if (stage === 'notso') out.push(spot(64, 50, 7), spot(40, 72, 6), spot(68, 74, 5));
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
