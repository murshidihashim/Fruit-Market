import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';

// PLAN-130 (A-05): each part's styles in one place, and no "later file wins" layering. The style sheets were folded
// so that a rule wins by its own selector where it sits, not by an "#app" in front of it or by being in a later file.
// This test keeps it so (it reads the sheets as text on purpose: it is about how they are written):
//   - "#app" in front of a selector may not come back (the count of each sheet can only go down);
//   - a part (a class a rule styles) is styled in one sheet, apart from the ones listed in SPLIT, which may lose
//     a sheet but not gain one;
//   - the table's sheets load in one order, where the order still decides between two rules.
// A rule for a part inside another component (.rt-sheet .ds-st) belongs with that component and is not counted.

/** Every style rule: its selectors and the sheet it is in (keyframes and font faces left out). */
function rules(file: string): { selectors: string[] }[] {
  const src = readFileSync(`src/ui/${file}`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const out: { selectors: string[] }[] = [];
  const walk = (s: string) => {
    let i = 0;
    while (i < s.length) {
      const open = s.indexOf('{', i);
      if (open < 0) break;
      const prelude = s.slice(i, open).replace(/^[\s;}]*/, '').trim();
      let depth = 1, j = open + 1;
      while (j < s.length && depth) { if (s[j] === '{') depth++; else if (s[j] === '}') depth--; j++; }
      if (prelude.startsWith('@')) { if (/^@(media|supports|container)\b/.test(prelude)) walk(s.slice(open + 1, j - 1)); }
      else if (prelude) out.push({ selectors: splitList(prelude) });
      i = j;
    }
  };
  walk(src);
  return out;
}
function splitList(sel: string): string[] {
  const out: string[] = []; let depth = 0, cur = '';
  for (const c of sel) {
    if (c === '(' || c === '[') depth++;
    if (c === ')' || c === ']') depth--;
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
/** The compounds of a selector, left to right (the parts between combinators, outside brackets). */
function compounds(sel: string): string[] {
  const out: string[] = []; let depth = 0, cur = '';
  for (const c of sel) {
    if (c === '(' || c === '[') depth++;
    if (c === ')' || c === ']') depth--;
    if (depth === 0 && /[\s>+~]/.test(c)) { if (cur) out.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur) out.push(cur);
  return out;
}
/** The classes of a compound, outside :not() and the like. */
const classes = (compound: string) => [...compound.replace(/\([^)]*\)/g, '').matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
const hasApp = (sel: string) => compounds(sel).some((c) => c === '#app') && compounds(sel).length > 1;
const stripApp = (sel: string) => sel.replace(/(^|\s)#app(\s+|\s*>\s*)/, '$1').trim();

const FILES = readdirSync('src/ui').filter((f) => f.endsWith('.css') && f !== 'palette.css' && f !== 'print-fonts.css').sort();
const ALL = FILES.flatMap((f) => rules(f).flatMap((r) => r.selectors.map((s) => ({ file: f, sel: s }))));

// A state class (on, open, is-night...) is almost never the first class of a compound; it says nothing about the part.
const first = new Map<string, number>(), later = new Map<string, number>();
for (const { sel } of ALL) for (const c of compounds(stripApp(sel))) classes(c).forEach((x, i) => { const m = i ? later : first; m.set(x, (m.get(x) ?? 0) + 1); });
const STATE = new Set([...later.keys()].filter((x) => (first.get(x) ?? 0) <= (later.get(x) ?? 0) / 4));
// The roots of whole screens: every rule of a screen names them.
const ROOTS = new Set(['tkt', 'gx', 'game', 'home', 'hm', 'jh', 'page', 'tk-page', 'sbk', 'jp', 'jo', 'sb', 'howto']);
/** The part a selector styles: the first class of its last compound that is not a state, else the nearest to its left. */
function part(sel: string): string {
  const cs = compounds(stripApp(sel));
  for (let i = cs.length - 1; i >= 0; i--) { const k = classes(cs[i]).find((x) => !STATE.has(x)); if (k) return k; }
  for (let i = cs.length - 1; i >= 0; i--) { const k = classes(cs[i])[0]; if (k) return k; }
  return '';
}

// "#app" still in front: rules the folding could not free without a risk to a screen the captures never showed, the
// rules kept exactly as they were because some of their declarations show only on such screens (pop-ups away from the
// table, the account panel, How to play's cards...), and the app's own looks of a printed card in cards.css and
// exchange.css (the print sheets read those two files alone, so there "#app" marks what only the app draws).
const APP_LEFT: Record<string, number> = {
  'cards.css': 54, 'daysheet.css': 75, 'home-cards.css': 3, 'howto.css': 11, 'journey-home.css': 20,
  'journey-online.css': 9, 'motion.css': 3, 'progress.css': 2, 'reactions.css': 1, 'rushTable.css': 224,
  'screens.css': 1, 'setup.css': 3, 'sheets.css': 184, 'stalls.css': 22, 'styles.css': 116, 'table.css': 235,
  'takings.css': 117, 'ticket-ui.css': 30, 'ticket.css': 150,
};

// Parts styled in more than one sheet, kept so: each is styled where it was, beside a rule it must stay after or before.
const SPLIT: Record<string, string> = {
  'actionbar': 'styles.css table.css ticket.css', 'bn-card': 'styles.css ticket-ui.css ticket.css',
  'bn-rules': 'styles.css ticket-ui.css', 'btn': 'cards.css styles.css table.css ticket-ui.css ticket.css',
  'cd': 'cards.css howto.css', 'cd-pop': 'cards.css stampbook.css', 'cd-tag': 'cards.css howto.css',
  'chip': 'styles.css ticket.css', 'coach': 'styles.css ticket.css', 'cust-marks': 'screens.css styles.css ticket.css',
  'day': 'journey-home.css journey-online.css', 'event-sheet': 'cards.css styles.css ticket-ui.css ticket.css',
  'ft-box': 'firstTime.css screens.css', 'game': 'styles.css table.css ticket-ui.css ticket.css',
  'handoff': 'styles.css ticket-ui.css', 'hm-rest': 'booth.css home-cards.css', 'home': 'booth.css styles.css',
  'icon-btn': 'styles.css ticket-ui.css', 'info-card': 'sheets.css styles.css', 'jp-two': 'journey-home.css progress.css',
  'jp-vs': 'journey-home.css progress.css', 'market-stall': 'styles.css ticket.css', 'mc-loss': 'sheets.css styles.css',
  'mini-step': 'styles.css ticket.css', 'minprices': 'styles.css ticket.css', 'modal': 'styles.css ticket-ui.css ticket.css',
  'morning-card': 'styles.css ticket.css', 'muted': 'styles.css ticket-ui.css', 'my-stall': 'styles.css table.css ticket.css',
  'next-lorry': 'styles.css ticket.css', 'on': 'cards.css journey-online.css', 'op-skip': 'booth.css styles.css',
  'order-strip': 'sheets.css styles.css ticket.css', 'owned-row': 'sheets.css styles.css',
  'page': 'journey-online.css setup.css styles.css', 'pp-info': 'styles.css ticket.css',
  'pp-lock': 'styles.css table.css ticket.css', 'pr-join': 'setup.css styles.css', 'pr-who': 'setup.css styles.css',
  'rd-close': 'styles.css ticket.css', 'rd-head': 'styles.css ticket.css', 'rush-dim': 'styles.css ticket.css',
  'sales-card': 'styles.css takings.css ticket.css', 'sbk-face': 'home-cards.css stampbook.css',
  'sc-waste': 'styles.css ticket.css', 'seat-row': 'styles.css ticket-ui.css', 'seats': 'styles.css table.css ticket.css',
  'slide': 'howto.css styles.css', 'stats': 'styles.css ticket-ui.css',
  'street': 'screens.css styles.css table.css ticket.css', 'street-wrap': 'screens.css styles.css table.css ticket.css',
  'tb-awn': 'stalls.css table.css', 'tb-chip': 'stalls.css table.css', 'tb-chip-to': 'stalls.css table.css',
  'tb-chips': 'stalls.css table.css', 'tip-pop': 'styles.css ticket.css', 'tk-lamp': 'table.css ticket.css',
  'tk-unload': 'sheets.css ticket.css', 'tkc': 'cards.css howto.css', 'tkt': 'table.css ticket.css',
  'toggle': 'styles.css ticket-ui.css', 'tomorrow': 'styles.css table.css ticket.css', 'trait-card': 'styles.css ticket.css',
  'wc-body': 'cards.css sheets.css', 'wc-chip': 'cards.css sheets.css', 'wc-flavour': 'cards.css sheets.css',
  'wc-foot': 'cards.css sheets.css', 'wc-kind': 'cards.css sheets.css', 'wc-lt': 'cards.css sheets.css',
  'wc-main': 'cards.css sheets.css', 'wc-stat': 'cards.css sheets.css', 'wc-stats': 'cards.css sheets.css',
  'wc-ttl': 'cards.css sheets.css', 'wc-ttl-o': 'cards.css sheets.css',
  'x-fruit': 'cards.css home-cards.css journey-home.css screens.css', 'xf': 'screens.css sheets.css',
};

describe('each part\'s styles in one place (PLAN-130, A-05)', () => {
  it('no new "#app" in front of a selector: a rule wins by its own selector', () => {
    const count: Record<string, number> = {};
    for (const { file, sel } of ALL) if (hasApp(sel)) count[file] = (count[file] ?? 0) + 1;
    for (const [f, n] of Object.entries(count)) expect(n, `${f}: ${n} selectors with #app in front (at most ${APP_LEFT[f] ?? 0})`).toBeLessThanOrEqual(APP_LEFT[f] ?? 0);
  });

  it('a part is styled in one sheet, apart from the ones listed', () => {
    const outer = (sel: string, k: string) => compounds(stripApp(sel)).slice(0, -1).flatMap(classes).filter((c) => !STATE.has(c) && !ROOTS.has(c) && c !== k);
    const home = new Map<string, Set<string>>(); // part -> sheets with a rule for it outside any other component
    for (const { file, sel } of ALL) { const k = part(sel); if (!k || outer(sel, k).length) continue; if (!home.has(k)) home.set(k, new Set()); home.get(k)!.add(file); }
    const where = new Map<string, Set<string>>();
    for (const { file, sel } of ALL) {
      const k = part(sel);
      if (!k) continue;
      // a rule for a part inside a component styled in this sheet belongs with that component
      if (outer(sel, k).some((c) => home.get(c)?.has(file))) continue;
      if (!where.has(k)) where.set(k, new Set());
      where.get(k)!.add(file);
    }
    const split = [...where].filter(([, f]) => f.size > 1).map(([k, f]) => [k, [...f].sort().join(' ')]);
    const extra = split.filter(([k, f]) => !SPLIT[k] || !f.split(' ').every((x) => SPLIT[k].split(' ').includes(x)));
    expect(extra, 'a part styled in a new sheet: put its rule with the part\'s other rules').toEqual([]);
  });

  it('the table\'s sheets load in one order (main.tsx)', () => {
    // Where two rules of these sheets reach one element with the same weight, the later sheet wins: about 1,100 pairs
    // of declarations can (most of them the takings' and the pop-ups' own rules after ticket.css's resets), so the
    // order is pinned here as one list, in place of the checks of one pair each that the tests used to make. What the
    // order decides is also read in the browser: scripts/style-checks.cjs (a pop-up's main button on the table) and
    // scripts/layout-check.cjs (the takings over the rows). bell.css is gone (PLAN-099).
    const main = readFileSync('src/main.tsx', 'utf8');
    expect([...main.matchAll(/^import '\.\/ui\/([\w-]+\.css)';$/gm)].map((m) => m[1])).toEqual([
      'styles.css', 'ticket.css', 'ticket-ui.css', 'stalls.css', 'sheets.css', 'motion.css', 'rushTable.css', 'daysheet.css', 'takings.css', 'reactions.css',
    ]);
  });
});
