// The small gaps on the phone (PLAN-096): the morning fits a 360x640 phone with six stalls, the event chip shows its
// whole name, the places to tap are 40 px, and the faint labels are dark enough to read.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { TIGHTEST, closer, type Fitting } from '../src/ui/game/panels/MorningCard';

const read = (f: string) => readFileSync(f, 'utf8');
/** The declarations of the first rule written for exactly this selector (at the start of a line), as a map; with
 *  `last`, of the last such rule (the one that wins when two set the same thing). */
function rule(css: string, selector: string, last = false): Record<string, string> {
  const lines = css.replace(/\/\*[\s\S]*?\*\//g, '').split('\n');
  const hits = lines.map((l, i) => (l.trim().startsWith(`${selector} {`) ? i : -1)).filter((i) => i >= 0);
  const at = hits.length ? hits[last ? hits.length - 1 : 0] : -1;
  expect(at, `no rule for ${selector}`).toBeGreaterThanOrEqual(0);
  const text = lines.slice(at).join('\n');
  const body = text.slice(text.indexOf('{') + 1, text.indexOf('}'));
  return Object.fromEntries(body.split(';').map((d) => d.trim()).filter(Boolean).map((d) => [d.slice(0, d.indexOf(':')).trim(), d.slice(d.indexOf(':') + 1).trim()]));
}
const px = (v: string | undefined) => Number(/^(-?[\d.]+)px$/.exec(v ?? '')?.[1] ?? NaN);

describe('the morning on a small phone with six stalls (MorningCard.tsx, sheets.css)', () => {
  /** A stand-in for the sheet: how tall its parts are at each step, and the room it has. */
  const sheet = (parts: number[], room: number): Fitting => {
    const dataset: DOMStringMap = {};
    return { dataset, clientHeight: room, get scrollHeight() { return Math.max(room, parts[Number(dataset.tight ?? 0)]); } };
  };
  /** Steps taken, and what is left to scroll after them. */
  const fit = (parts: number[], room: number) => { const el = sheet(parts, room); closer(el); return { step: Number(el.dataset.tight ?? 0), scroll: el.scrollHeight - el.clientHeight }; };

  it('has five steps; at the closest the busiest mornings of computer games at six stalls fit a 360x640 phone with no scroll', () => {
    expect(TIGHTEST).toBe(5);
    // The sheet's height at each step (0 to 5) and its room, measured in the browser at 360x640 with six stalls
    // (Chromium, the game's own fonts) on mornings from computer games, and on one made by hand. Before PLAN-096 the
    // sheet stopped at step 3 and scrolled by the difference.
    const measured: [string, number[], number, number][] = [
      // what it is, the heights at steps 0 to 5, the room, the step it needs
      ['Monsoon Downpour (two lines of title, two chips), a rival topped up, a Market Day', [463, 418, 406, 386, 337, 326], 326, 5],
      ['the last day: the jam maker\'s note, Mango Windfall and its ripe line', [449, 414, 402, 380, 326, 326], 326, 4],
      ['Price Controls (the event with a row of limits)', [439, 404, 392, 356, 326, 326], 326, 4],
      ['Health Inspector on a Market Day with a standing order, two stalls fined', [452, 411, 399, 381, 360, 360], 360, 4],
      ['by hand: Price Controls on a Market Day, you and a rival topped up', [503, 461, 449, 414, 362, 360], 360, 5],
    ];
    for (const [what, parts, room, step] of measured) {
      expect(parts[3] - room, what).toBeGreaterThan(0); // it scrolled at the old closest step
      expect(fit(parts, room), what).toEqual({ step, scroll: 0 });
    }
  });

  it('every step keeps the steps before it, and the event picture only shrinks: nothing is hidden past step 2', () => {
    const css = read('src/ui/sheets.css');
    const steps = (from: number) => `#app .tkt .sh-morning:is(${[2, 3, 4, 5].filter((k) => k >= from).map((k) => `[data-tight='${k}']`).join(', ')})`;
    // step 2's and step 3's rules carry the later steps too
    for (const part of ['.wc-flavour { display: none; }', '.wc-lt span { height: 16px; }', '.wc-ttl { font-size: 1.125rem; }']) expect(css).toContain(`${steps(2)} ${part}`);
    expect(css).toContain(`${steps(3)} .wc-evpic { width: 104px; height: 76px; }`);
    expect(css).toContain(`${steps(4)} .wc-evpic { width: 80px; height: 58px; }`);
    // step 5: the event's words flow round its picture (no row of the table is laid out here: sheets.css has no grids)
    expect(css).toContain("#app .tkt .sh-morning[data-tight='5'] .wc-event .wc-evpic { float: left; margin: 0 8px 4px 0; }");
    // only the tagline is ever put away (from step 2, as before); later steps hide nothing
    const hidden = (css.match(/[^\n]*sh-morning[^\n]*display: none[^\n]*/g) ?? []);
    expect(hidden).toEqual([`${steps(2)} .wc-flavour { display: none; }`]);
  });
});

describe('the event chip in the top bar shows its whole name (ticket.css)', () => {
  const css = read('src/ui/ticket.css');
  it('the picture gives way before the name is cut: a wrapping row from the right, the picture last, out of sight below', () => {
    const chip = rule(css, '#app .tkt .tk-event');
    expect(chip['flex-flow']).toBe('row-reverse wrap');
    expect(chip.overflow).toBe('hidden');
    expect(chip.height).toBe('40px');
    expect(rule(css, '#app .tkt .tk-event .xev').order).toBe('1');
    // the name is never narrower than its longest word, and stays in the middle with or without the picture
    expect(rule(css, '#app .tkt .tk-event > span:last-child')['min-width']).toBe('min-content');
    expect(rule(css, '#app .tkt .tk-event::before').height).toBe('30px');
  });
  it('the yellow stays 36 px tall and the place to tap is 40 px', () => {
    const chip = rule(css, '#app .tkt .tk-event');
    expect(chip['border-block']).toBe('2px solid transparent');
    expect(chip.background).toBe('var(--tk-yel) padding-box');
    expect(px(chip.height) - 2 * 2).toBe(36);
  });
});

describe('places to tap of at least 40 px (rushTable.css, booth.css)', () => {
  it('the pricing sheet\'s − and + at every step, without moving a row', () => {
    const css = read('src/ui/rushTable.css');
    const sel = "#app .tkt .rt-sheet:is([data-tight='2'], [data-tight='3'])";
    // the button's own height at each step, and how far its unseen area reaches above and below it
    const steps = [
      { h: px(rule(css, '#app .tkt .rt-sheet .ds-st')['min-height']), area: rule(css, '#app .tkt .rt-sheet .ds-st::before') },
      { h: px(rule(css, '#app .tkt .rt-sheet[data-tight] .ds-st')['min-height']), area: rule(css, '#app .tkt .rt-sheet .ds-st::before') },
      { h: px(rule(css, `${sel} .ds-st`)['min-height']), area: { ...rule(css, '#app .tkt .rt-sheet .ds-st::before'), ...rule(css, `${sel} .ds-st::before`) } },
    ];
    expect(steps.map((x) => x.h)).toEqual([40, 36, 34]);
    for (const { h, area } of steps) expect(h - px(area.top) - px(area.bottom)).toBeGreaterThanOrEqual(40);
    // the area reaches over the row's own 2 px edge, and at the closest steps over half the 2 px between two rows
    expect(css).toContain(`${sel} .ps-in, ${sel} .ps-rows { gap: 2px; }`);
    expect(px(rule(css, `${sel} .ds-st::before`).top)).toBe(-3);
    expect(rule(css, `${sel} .ps-rows`)).toEqual({ 'padding-block': '1px', 'margin-block': '-1px' });
    // across: 38 px on a narrow phone, and 2 px more on the outer side of each
    const narrow = css.slice(css.indexOf('@media (max-width: 379px)', css.indexOf('the sheet that slides up')));
    expect(px(rule(narrow, '#app .tkt .rt-sheet .ds-st').width)).toBe(38);
    expect(px(rule(css, '#app .tkt .rt-sheet .ds-dial > .ds-st:first-child::before').left)).toBe(-2);
    expect(px(rule(css, '#app .tkt .rt-sheet .ds-dial > .ds-st:last-child::before').right)).toBe(-2);
    // the "i" beside the heading
    const info = rule(css, '#app .tkt .rt-sheet .ps-head .pp-info::before');
    expect(18 - px(info.top) - px(info.bottom)).toBe(40);
    expect(18 - px(info.left) - px(info.right)).toBe(40);
  });

  it('Home\'s dots: 40 px tall; the first and the last 40 px across', () => {
    const css = read('src/ui/booth.css');
    const dot = rule(css, '.home.hm .hm-dots button');
    expect(dot.height).toBe('8px');
    const [top, side, bottom] = rule(css, '.home.hm .hm-dots button::after').inset.split(' ').map(px);
    expect(8 - top - bottom).toBe(40);
    expect(8 - side - px(rule(css, '.home.hm .hm-dots button:first-child::after').left)).toBe(40);
    expect(8 - side - px(rule(css, '.home.hm .hm-dots button:last-of-type::after').right)).toBe(40);
  });
});

describe('faint labels are dark enough to read (4.5:1 for small words, 3:1 for a mark)', () => {
  const files = ['exchange.css', 'cards.css', 'ticket.css', 'table.css', 'daysheet.css', 'rushTable.css', 'takings.css', 'styles.css', 'stampbook.css', 'booth.css'];
  const all = files.map((f) => read(`src/ui/${f}`)).join('\n');
  /** A colour as the style sheets write it (var(--tk-…), var(--x-…), var(--c-rrggbb)), as its hex. */
  const hex = (v: string): string => {
    const m = /var\((--[\w-]+)\)/.exec(v);
    if (!m) throw new Error(`not a colour token: ${v}`);
    const c = /^--c-([0-9a-f]{6})$/.exec(m[1]);
    if (c) return c[1];
    const def = new RegExp(`${m[1]}:\\s*([^;]+);`).exec(all);
    if (!def) throw new Error(`no ${m[1]}`);
    return hex(def[1]);
  };
  const lum = (h: string) => {
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a: string, b: string) => { const [x, y] = [lum(hex(a)), lum(hex(b))]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const paper = 'var(--tk-paper)', ink = 'var(--tk-ink)', kraft = 'var(--tk-kraft)', mustard = 'var(--tk-yel)';
  const css = (f: string, sel: string, last = false) => rule(read(`src/ui/${f}`), sel, last);

  it('the day\'s screens: freshness letters, prices, headings, chips and notes', () => {
    const pairs: [string, string, string][] = [
      ['an empty market box: its freshness letters', css('table.css', '#app .tkt .tb-box:not(.has) .tk-lamp').color, paper],
      ['an empty market box: its price', css('table.css', '#app .tkt .tb-box:not(.has) .price').color, paper],
      ['the rush: a freshness the customer will not take', css('rushTable.css', '#app .tkt .rt-lamp.off').color, paper],
      ['the rush: a sold-out crate\'s tags', css('rushTable.css', '#app .tkt .rt-crate.over .rt-tag').color, paper],
      ['the rush: what a stall was paid', paper, css('rushTable.css', '#app .tkt .rt-plus').background],
      ['the watermelon lane\'s heading', paper, css('table.css', '#app .tkt .tb-lane.watermelon .tb-lh').background],
      ['the apple lane\'s heading', paper, css('table.css', '#app .tkt .tb-lane.apple .tb-lh').background],
      ['the mango lane\'s heading', css('table.css', '#app .tkt .tb-lane.mango .tb-lh').color, css('table.css', '#app .tkt .tb-lane.mango .tb-lh').background],
      ['tomorrow\'s lorry', css('table.css', '#app .tkt .tomorrow .tm-lorry').color, kraft],
      ['an empty crate', css('daysheet.css', '#app .tkt .ds-none').color, kraft],
      ['the rest of tomorrow, in the evening', css('sheets.css', '#app .tkt .ev-rest').color, kraft],
      ['a − or + that cannot be pressed (pricing)', css('rushTable.css', '#app .tkt .rt-sheet .ds-st:disabled').color, css('rushTable.css', '#app .tkt .rt-sheet .ds-st:disabled').background],
      ['a − or + that cannot be pressed (stocking)', css('daysheet.css', '#app .tkt .sh-day .ds-st:disabled').color, css('daysheet.css', '#app .tkt .sh-day .ds-st:disabled').background],
      ['a good chip', paper, css('ticket.css', '#app .tkt .tk-chip.good').background],
      ['a warning chip', paper, css('ticket.css', '#app .tkt .tk-chip.warn').background],
      ['"Last day"', paper, css('ticket.css', '#app .tkt .tk-left.last').background],
      ['a standing order due today: "Order"', css('ticket.css', '#app .tkt .order-strip.due .os-k').color, mustard],
      ['a standing order due today: its stake', css('ticket.css', '#app .tkt .order-strip.due .os-fine').color, mustard],
      ['a raised price on a customer\'s ticket', css('cards.css', '.tkc-rw.up > b').color, paper],
      ['money made, in the takings', css('takings.css', '#app .tkt .tg-row > b.good').color, paper],
      ['money that floats up', css('styles.css', '.floattext', true).color, paper],
    ];
    for (const [what, fg, bg] of pairs) expect(ratio(fg, bg), what).toBeGreaterThanOrEqual(4.5);
    // the night keeps its own grey for an empty box, read on the dark table
    expect(ratio(css('table.css', '#app .tkt .tb-night .tb-box:not(.has) .tk-lamp').color, ink)).toBeGreaterThanOrEqual(4.5);
  });

  it('the stamp book\'s later ranks and Home\'s dots', () => {
    const later = css('stampbook.css', '.sbk .sbk-rk.later .sbk-n');
    expect(ratio(later.color, later.background)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(css('booth.css', '.home.hm .hm-dots button').background, 'var(--hm-paper)')).toBeGreaterThanOrEqual(3);
  });
});
