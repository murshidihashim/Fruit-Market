// Fitting a card's title (PLAN-083). The approved cards set a short title large on one line and a long one smaller on
// two ("Heatwave" at 31, "Favoured trade" at 25). A card is drawn without measuring the page (the print kit and the
// tests draw cards as plain text), so the fit is worked out from the widths of the display face's capitals.

/** Advance widths of Archivo Black's capitals, figures and marks, in thousandths of an em (read from the font). */
const WIDTH: Record<string, number> = {
  A: 778, B: 778, C: 778, D: 778, E: 722, F: 667, G: 833, H: 833, I: 389, J: 667, K: 833, L: 667, M: 944, N: 833, O: 833, P: 722, Q: 833,
  R: 778, S: 722, T: 722, U: 833, V: 778, W: 1000, X: 778, Y: 778, Z: 722,
  0: 667, 1: 667, 2: 667, 3: 667, 4: 667, 5: 667, 6: 667, 7: 667, 8: 667, 9: 667,
  ' ': 333, "'": 278, '’': 278, '-': 333, '.': 333, ',': 333, '!': 333, '&': 889, $: 667, '+': 660, '−': 660,
};
/** A letter the table does not list is taken to be as wide as the widest. */
const WIDEST = 1000;

/** The width of a title set in capitals, in em. An upper bound: kerning only draws letters closer. */
export function capsWidth(text: string): number {
  let w = 0;
  for (const ch of text.toUpperCase()) w += WIDTH[ch] ?? WIDEST;
  return w / 1000;
}

/** How many lines a title takes at this size in a box this wide, breaking at spaces and after hyphens (as a browser
 *  does). Infinity when one word alone is wider than the box. */
export function titleLines(text: string, size: number, box: number): number {
  // "Bake-Off" may break after its hyphen: the pieces are "Bake-" and "Off".
  const words = text.trim().split(/\s+/).flatMap((w) => w.replace(/-/g, '-\n').split('\n').filter(Boolean));
  const space = capsWidth(' ') * size;
  let lines = 1;
  let used = 0;
  for (let i = 0; i < words.length; i++) {
    const w = capsWidth(words[i]) * size;
    if (w > box) return Infinity;
    // A piece after a hyphen joins its word without a space.
    const gap = used === 0 ? 0 : words[i - 1].endsWith('-') ? 0 : space;
    if (used + gap + w > box) { lines++; used = w; } else used += gap + w;
  }
  return lines;
}

export interface TitleFit { size: number; lines: number }

/**
 * The size a title is set at in a box `box` wide (all in card units, 252 to the card's width): on one line as large as
 * fits, up to `big`, when that is at least `small`; otherwise at `small` on up to `maxLines` lines. A title that still
 * does not fit is set smaller, half a unit at a time.
 */
export function fitTitle(text: string, box: number, big: number, small: number, maxLines = 2): TitleFit {
  // 2% of the box is kept spare, so a rounding difference between this sum and the browser never adds a line.
  const room = box * 0.98;
  const one = Math.floor((room / capsWidth(text)) * 2) / 2;
  if (one >= small) return { size: Math.min(big, one), lines: 1 };
  let size = small;
  while (size > 8 && titleLines(text, size, room) > maxLines) size -= 0.5;
  return { size, lines: Math.min(maxLines, titleLines(text, size, room)) };
}
