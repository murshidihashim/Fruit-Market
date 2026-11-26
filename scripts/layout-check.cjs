// The game table's layout as the browser draws it (PLAN-130, A-05): the checks read the computed style and the boxes
// of the page, so they hold however the style sheets are written. scripts/smoke.cjs calls `checkLayout` at the moments
// below and fails when one does not hold.
//   'buy'   the phone grid: one column of areas, top to bottom; only the market's row takes the height the screen
//           gives or takes away; the stalls lie under the market and over your shelf; a wide screen keeps the same
//           single column; the action bar sits in the act area.
//   'bar'   the stocking and pricing buttons (.pp-lock) take the action bar's place.
//   'rush'  the round table lies over the table from the market down to the action bar.
//   'night' the customer row and the stalls stay on the table at night, dimmed; the pieces sliding down the lanes and
//           your shelf's chips move on one curve, the night's (tableModel.ts NIGHT_EASE), and so do tomorrow's cards
//           walking into the row while they walk.
//   'rush'  also: a crate's price tag is drawn through a filter (the reason each tag is keyed by its price, iOS).

const PHONE_AREAS = '"top" "net" "street" "mid" "rivals" "dock" "act"';

/** The rows of the game grid, in px, as drawn now. */
const rows = (page) => page.evaluate(() => getComputedStyle(document.querySelector('.game')).gridTemplateRows.split(' ').map(parseFloat));

async function checkLayout(page, moment) {
  const fails = [];
  const expect = (ok, what) => { if (!ok) fails.push(`${moment}: ${what}`); };
  const style = (sel, props) => page.evaluate(([sel, props]) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)]));
  }, [sel, props]);
  if (moment === 'buy') {
    const g = await style('.game', ['display', 'grid-template-areas']);
    expect(g && g.display === 'grid', `the game is a grid (${g && g.display})`);
    expect(g && g['grid-template-areas'] === PHONE_AREAS, `phone areas ${PHONE_AREAS} (got ${g && g['grid-template-areas']})`);
    const bar = await style('.game > .actionbar', ['grid-row-start', 'grid-column-start']);
    expect(bar && bar['grid-row-start'] === 'act' && bar['grid-column-start'] === 'act', `the action bar in the act area (${JSON.stringify(bar)})`);
    // the stalls lie under the market and over your shelf, in the page as on the screen
    const order = await page.evaluate(() => {
      const c = document.querySelector('.game > .centre'), s = document.querySelector('.game > .seats'), m = document.querySelector('.game > .my-stall');
      if (!c || !s || !m) return 'missing';
      const after = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      const top = (e) => e.getBoundingClientRect().top;
      return after(c, s) && after(s, m) && top(c) < top(s) && top(s) < top(m) ? 'ok' : 'wrong';
    });
    expect(order === 'ok', `the stalls between the market and your shelf (${order})`);
    // only the market's row is flexible: a taller screen gives all its extra height to that row
    const vp = page.viewportSize();
    const before = await rows(page);
    await page.setViewportSize({ width: vp.width, height: vp.height + 120 });
    await page.waitForTimeout(300);
    const after = await rows(page);
    const grew = after.map((v, i) => Math.round(v - before[i]));
    expect(before.length === 7 && grew[3] === 120 && grew.every((d, i) => i === 3 || d === 0), `only the market's row grows (${grew.join(' ')})`);
    // a wide screen keeps the phone's single column (the game is drawn at phone width in the middle)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(300);
    const wide = await style('.game', ['grid-template-areas']);
    expect(wide && wide['grid-template-areas'] === PHONE_AREAS, `wide screen areas (got ${wide && wide['grid-template-areas']})`);
    await page.setViewportSize(vp);
    await page.waitForTimeout(300);
  }
  if (moment === 'bar') {
    const lock = await style('.game > .centre > .pp-lock', ['grid-row-start', 'grid-column-start']);
    expect(lock && lock['grid-row-start'] === 'act' && lock['grid-column-start'] === 'act', `the stocking and pricing buttons in the act area (${JSON.stringify(lock)})`);
  }
  if (moment === 'rush') {
    const t = await style('.game > .rush-table', ['grid-row-start', 'grid-row-end']);
    expect(t && t['grid-row-start'] === 'mid' && t['grid-row-end'] === 'act', `the round table from the market to the action bar (${JSON.stringify(t)})`);
    const tag = await style('.rt-tg', ['filter']);
    expect(tag && /drop-shadow/.test(tag.filter), `a crate's price tag is drawn through a filter (${tag && tag.filter})`);
  }
  if (moment === 'night') {
    const row = await style('.game.is-night > .street-wrap', ['display', 'opacity']);
    const seats = await style('.game.is-night > .seats', ['display', 'opacity']);
    expect(row && row.display === 'block' && Number(row.opacity) < 1, `the customer row stays at night, dimmed (${JSON.stringify(row)})`);
    expect(seats && seats.display === 'flex' && Number(seats.opacity) < 1, `the stalls stay at night, dimmed (${JSON.stringify(seats)})`);
    const curves = await page.evaluate(() => {
      const first = (el) => (el ? getComputedStyle(el).transitionTimingFunction.replace(/\s+/g, ' ').match(/^[a-z-]+(\([^)]*\))?/)[0] : null);
      const walk = [...document.querySelectorAll('[data-walk]')].flatMap((e) => e.getAnimations()).map((a) => a.effect.getTiming().easing)[0] ?? null;
      return { piece: first(document.querySelector('.tb-pc.ns-piece')), chip: first(document.querySelector('.tb-dock.night .tb-chip')), walk };
    });
    const NIGHT_EASE = 'cubic-bezier(0.45, 0, 0.3, 1)';
    expect(curves.piece === NIGHT_EASE, `the lanes' pieces slide on the night's curve (${curves.piece})`);
    expect(curves.chip === null || curves.chip === NIGHT_EASE, `your shelf's chips slide on the night's curve (${curves.chip})`);
    expect(curves.walk === null || curves.walk === NIGHT_EASE, `tomorrow's cards walk on the night's curve (${curves.walk})`);
  }
  return fails;
}

module.exports = { checkLayout };
