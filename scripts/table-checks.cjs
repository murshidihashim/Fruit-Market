// Checks of the game table made in the browser while a game is played (PLAN-130, REP-140 A-01: they replace tests
// that read the source and the stylesheets as text). Used by smoke.cjs, which plays a whole game.
//   install(page)   before the page loads: watches every move the page makes (element.animate, CSS animations and
//                   transitions) and keeps what breaks the motion rules;
//   check(page, at) at a moment of the game: what the table must be then;
//   report(page)    after the game: every rule broken, or an empty list.
// The motion rules (docs/studio flow study; the game's motion rules): only position, size and fade are animated
// (transform by translate and scale, opacity, width and height), nothing is stepped, and moves end on the one clock.
// The table: what a sheet lies over is out of reach (inert); the round table and the day's sheet are each one element
// that stays while their contents change; the takings come on the day's sheet.

/** Runs in the page before the game loads. */
function watch() {
  const broken = (window.__tableBroken = []);
  const note = (what) => { if (broken.length < 40 && !broken.includes(what)) broken.push(what); };
  // The day's sheet and the round table move by position, size and fade only (PLAN-085, PLAN-099): a transform that
  // translates or scales (a tilt that stays the same all through is no move), top and left, width and height, opacity
  // (and a colour filling in, such as a customer's dot as a piece reaches them).
  const MOVES = '.sh-day, .rush-table';
  const MOVED = /^(transform|opacity|width|height|top|left|right|bottom|backgroundColor|color|borderColor|offset|easing|composite|computedOffset)$/;
  const TURNS = /rotate|skew|matrix|perspective/;
  // Nothing on the table steps: the sheets, the round table, the morning card and the takings, the countdown stamp,
  // the pieces and coins in the air, the results' stamps and places (motion.ts: one clock, smooth curves).
  const SMOOTH = '.sh-day, .rush-table, .morning-card, .sales-card, .phase-banner, .fx-layer, .sbk';
  const name = (el) => (el && el.className && String(el.className.baseVal ?? el.className).split(' ')[0]) || (el && el.tagName) || '?';
  const within = (el, sel) => !!(el && el.closest && el.closest(sel));
  /** One move: its keyframes and its curve, made by `el`. */
  const judge = (el, label, frames, easing) => {
    const smooth = within(el, SMOOTH), moves = within(el, MOVES);
    if (!smooth && !moves) return;
    const stepped = (e) => typeof e === 'string' && /steps\(/.test(e);
    if (smooth && (stepped(easing) || frames.some((f) => stepped(f.easing)))) note(`${label}: stepped`);
    if (!moves) return;
    for (const f of frames) for (const k of Object.keys(f)) if (!MOVED.test(k)) note(`${label} moves ${k}`);
    const turns = frames.map((f) => (typeof f.transform === 'string' ? (f.transform.match(/(rotate|skew|matrix|perspective)\w*\([^)]*\)/g) || []).join(' ') : ''));
    if (turns.some((t) => t !== turns[0]) || frames.some((f) => typeof f.transform === 'string' && TURNS.test(f.transform) && /skew|matrix|perspective/.test(f.transform))) note(`${label}: turns`);
  };
  const animate = Element.prototype.animate;
  Element.prototype.animate = function (frames, opts) {
    const list = Array.isArray(frames) ? frames : frames ? [frames] : [];
    judge(this, `animate(${name(this)})`, list, typeof opts === 'object' && opts ? opts.easing : undefined);
    return animate.call(this, frames, opts);
  };
  // CSS animations and transitions, read from the running animation's own keyframes.
  const seen = new WeakSet();
  const look = () => {
    for (const a of document.getAnimations()) {
      if (seen.has(a) || !(a.effect && a.effect.getKeyframes)) continue;
      seen.add(a);
      if (!(a instanceof CSSAnimation) && !(a instanceof CSSTransition)) continue;
      const el = a.effect.target;
      const label = a instanceof CSSTransition ? `transition(${name(el)}): ${a.transitionProperty}` : `animation(${name(el)}): ${a.animationName}`;
      judge(el, label, a.effect.getKeyframes(), a.effect.getTiming().easing);
    }
  };
  document.addEventListener('animationstart', look, true);
  document.addEventListener('transitionrun', look, true);
  // The round table is one element from the moment the stall opens to the last customer; the day's sheet one element
  // from stocking to the takings of the same day (sheet.ts slides a panel in only when it is replaced).
  let table = null, sheet = null, sheetDay = '';
  setInterval(() => {
    const t = document.querySelector('.rush-table:not(.leaving)');
    if (t && table && t !== table && table.isConnected) note('the round table was drawn again as a new element');
    if (t) table = t;
    const sh = document.querySelector('.sh-day');
    const day = (document.querySelector('.tk-top')?.textContent || '').match(/D(\d+)/)?.[1] || '';
    if (sh && sheet && sh !== sheet && sheet.isConnected && day === sheetDay) note('the day\'s sheet was drawn again as a new element');
    if (sh) { sheet = sh; sheetDay = day; }
  }, 50);
}

async function install(page) {
  await page.addInitScript(watch);
}

/** The moments smoke.cjs knows: 'stocking' (at rest), 'stocking-tip' (the first-game tip up over it), 'pricing',
 *  'takings'. Returns what is wrong at that moment. */
async function check(page, at) {
  const problems = await page.evaluate((at) => {
    const out = [];
    const market = document.querySelector('.game > .centre > .market-stall');
    const inert = !!market && market.hasAttribute('inert');
    const mid = document.querySelector('.game > .centre > .mid-panel, .game > .centre > .fm-sheet, .game > .centre > .morning-card');
    const tableUp = !!document.querySelector('.game.table-up');
    // What a sheet or the round table lies over is out of reach of the keyboard and of screen readers; the market is
    // free again once nothing lies over it.
    if ((mid || tableUp) && market && !inert) out.push(`${at}: the market is in reach under a sheet`);
    if (!mid && !tableUp && market && inert) out.push(`${at}: the market is out of reach with no sheet over it`);
    // where the picture of a sheet that has just left slides off (sheet.ts): it takes no taps and is not read out
    const pic = document.querySelector('.game > .centre > .tk-sheet');
    if (pic && (pic.getAttribute('aria-hidden') !== 'true' || !pic.hasAttribute('inert'))) out.push(`${at}: the sheet's picture can be reached`);
    if (at === 'stocking' || at === 'stocking-tip') {
      const sh = document.querySelector('.sh-day.own');
      // a row of the table the sheet covers all of is out of reach too; a row it does not touch is in reach
      // (measured at rest: smoke.cjs waits for the sheet to land)
      if (sh) {
        const b = sh.getBoundingClientRect();
        for (const row of document.querySelectorAll('.game > .street-wrap > *, .game > .seats, .game > .my-stall')) {
          const r = row.getBoundingClientRect();
          if (r.height <= 0) continue;
          const all = r.top >= b.top - 0.5 && r.bottom <= b.bottom + 0.5 && r.left >= b.left - 0.5 && r.right <= b.right + 0.5;
          const none = r.bottom <= b.top + 0.5 || r.top >= b.bottom - 0.5;
          if (all && !row.hasAttribute('inert')) out.push(`${at}: ${row.className.split(' ')[0]} is covered by the sheet and still in reach`);
          if (none && row.hasAttribute('inert')) out.push(`${at}: ${row.className.split(' ')[0]} is out of reach with no sheet over it`);
        }
        // the sheet is drawn closer a step at a time before anything scrolls: it scrolls only at the closest step
        if (sh.scrollHeight > sh.clientHeight + 1 && sh.dataset.tight !== '3') out.push(`stocking: the sheet scrolls at step ${sh.dataset.tight ?? 0}`);
      }
      // the first-game tip at the sheet's foot covers no row and no button of it (PLAN-090, PLAN-091)
      const tip = at === 'stocking-tip' && document.querySelector('.game > .coach');
      if (tip && sh) {
        const t = tip.getBoundingClientRect();
        const view = sh.getBoundingClientRect();
        for (const btn of document.querySelectorAll('.sh-day.own button, .game .pp-lock button')) {
          const r = btn.getBoundingClientRect();
          const shown = r.height > 0 && r.bottom > view.top && r.top < view.bottom;
          if (shown && r.bottom > t.top + 0.5 && r.top < t.bottom - 0.5 && r.right > t.left && r.left < t.right) out.push(`stocking: the tip covers "${(btn.getAttribute('aria-label') || btn.textContent || '').trim().slice(0, 30)}"`);
        }
      }
    }
    if (at === 'stocking') {
      const sh = document.querySelector('.sh-day.own');
      if (!sh) out.push('stocking: no day\'s sheet');
      // the sheet lies over the market: what is drawn at its middle is the sheet's own
      else {
        const b = sh.getBoundingClientRect();
        const top = document.elementFromPoint(b.left + b.width / 2, b.top + Math.min(b.height / 2, 60));
        if (!top || !sh.contains(top)) out.push(`stocking: the sheet does not lie over the table (${top ? top.className : 'nothing'} is on top)`);
      }
      if (!document.querySelector('.actionbar') && !document.querySelector('.pp-lock')) out.push('stocking: neither the bar nor the sheet\'s own buttons');
    }
    if (at === 'takings') {
      // the takings are their own panel over the day's sheet, which stays plain under them
      if (!document.querySelector('.sh-day.rest')) out.push('takings: the day\'s sheet is not under them');
      if (!document.querySelector('.sales-card')) out.push('takings: no takings');
      if (document.querySelector('.rush-table:not(.leaving)')) out.push('takings: the round table is still up');
    }
    if (at === 'pricing') {
      // the round table is up, its own foot in the bar's place
      if (!tableUp) out.push('pricing: the round table is not up');
      if (document.querySelector('.game > .actionbar')) out.push('pricing: the bottom bar is drawn under the round table');
      const sheet = document.querySelector('.rt-sheet');
      const foot = sheet && sheet.getBoundingClientRect();
      if (!sheet) out.push('pricing: no pricing sheet');
      else if (foot.bottom > innerHeight + 1) out.push(`pricing: the sheet runs ${Math.round(foot.bottom - innerHeight)}px off the screen`);
    }
    return out;
  }, at);
  return problems;
}

async function report(page) {
  return page.evaluate(() => window.__tableBroken || ['the checks were not installed']);
}

module.exports = { install, check, report };
