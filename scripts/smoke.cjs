// Plays a full game in a phone-sized headless browser and saves screenshots. Exits with a failure when the game does
// not reach the results screen (PLAN-081: it used to print a line and pass).
// Usage: node scripts/smoke.cjs <dist-single/index.html> <outdir> [rivals=3] [saved-game.json]
// With a saved game (a file holding what the game kept under "fm.save" up to 1.28.0, or now in one mode's slot,
// "fm.save.<mode>") the script continues that game from the home screen instead of starting a new one, so a chosen
// moment (such as the Favoured Trade step) can be played through. It is put under the old key, which the game moves to
// its mode's slot as it opens (PLAN-120), and continued with its card's Continue.
const { chromium } = require('playwright');
const fs = require('fs');
const { checkLayout } = require('./layout-check.cjs');
const table = require('./table-checks.cjs');

/** Sets the number of rival stalls on the set-up page's table (PLAN-125: small cards): the open card adds a computer,
 *  the last card's × removes it. */
async function setRivals(page, n) {
  const tiles = page.locator('.sb-row .sb-card:not(.open)');
  while (await tiles.count() < Number(n)) await page.click('.sb-row .sb-card.open .sb-cin');
  while (await tiles.count() > Number(n)) await tiles.last().locator('.sb-x').click();
}
const path = require('path');
(async () => {
  const [file, out, rivals = '3', saveFile] = process.argv.slice(2);
  const save = saveFile ? fs.readFileSync(saveFile, 'utf8') : null;
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 400, height: 820 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  // PLAN-130: the table's rules, checked as the game is played (table-checks.cjs).
  await table.install(page);
  const broken = [];
  const looked = [];
  const look = async (at) => { looked.push(at); for (const x of await table.check(page, at)) if (!broken.includes(x)) broken.push(x); };
  await page.addInitScript((save) => {
    localStorage.setItem('fm.settings', JSON.stringify({ sound: false, haptics: false, fast: true, tips: true }));
    if (save && !localStorage.getItem('fm.smoke')) { localStorage.setItem('fm.smoke', '1'); localStorage.setItem('fm.save', save); }
  }, save);
  await page.goto('file://' + path.resolve(file));
  const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
  if (save) {
    // PLAN-124: the first view opens the tab of the mode whose game is waiting; its Play button is Continue. REP-140
    // B-20: Continue goes straight into the game.
    await page.click('[data-a^="continue-"]');
  } else {
    await page.click('[data-tab="custom"]'); await page.click('[data-a="play"]'); await page.click('[data-a="computer"]'); // PLAN-124: Home's Custom tab and Play, then Computer
    await setRivals(page, rivals);
    await page.click('button:has-text("Start game")');
    await page.waitForTimeout(250);
    await shot('01-delivery-anim');
  }
  // PLAN-130: the table's layout, from the computed style (scripts/layout-check.cjs)
  const layout = [];
  const seen = new Set();
  const once = (k) => (seen.has(k) ? false : (seen.add(k), true));
  let ties = 0;
  for (let i = 0; i < 4000; i++) {
    try {
    if (await page.locator('.results').count()) break;
    const has = async (t) => (await page.locator(t).count()) > 0;
    if (await has('.trait-card')) { if (once('trait')) await shot('01b-trait'); await page.click('.trait-card'); continue; }
    if (await has('button:has-text("Start buying")')) { if (once('morning')) await shot('02-morning'); if (await has('text=LAST DAY') && once('finalday')) { await page.waitForTimeout(1300); await shot('02b-final-day'); } await page.click('button:has-text("Start buying")'); continue; }
    if (await has('button:has-text("Done buying"), button:has-text("Skip buying")')) {
      const cells = page.locator('.mk-cell.pick');
      const n = await cells.count();
      if (once('buyturn')) { await shot('03-my-turn'); layout.push(...await checkLayout(page, 'buy')); }
      if (n && Math.random() < 0.75) {
        await cells.nth(Math.floor(Math.random() * n)).click();
        if (once('flying')) { await page.waitForTimeout(220); await shot('04-buy-flying'); }
        await page.waitForTimeout(700);
        continue;
      }
      await page.click('button:has-text("Done buying"), button:has-text("Skip buying")');
      continue;
    }
    // "The Bell" pop-up: it opens only from its i button since PLAN-064; close it if it is up.
    if (await page.locator('.bell-notice').count()) { await page.click('.bell-notice .btn'); continue; }
    // The first-game tips (tips are on in this test): read and close each one.
    if (await page.locator('.coach .btn:not(.skip)').count()) {
      if (await has('.stall-panel') && once('stocking-tip-check')) { await page.waitForTimeout(500); await look('stocking-tip'); }
      await page.click('.coach .btn:not(.skip)'); continue;
    }
    // Fill your stall starts empty (PLAN-061): add every piece you can before opening.
    if (await page.locator('.stall-panel .mini-step button:last-child:not([disabled])').count()) { if (once('stocking-check')) { await page.waitForTimeout(500); await look('stocking'); } await page.locator('.stall-panel .mini-step button:last-child:not([disabled])').first().click(); continue; }
    // The Favoured Trade step (rules 18): a stall that holds the card and has a tied price is asked after the flip,
    // with two buttons, "Play it" and "Keep it" (PLAN-081: the one-button step below used to stop here for good).
    // Play it the first time and keep it the next, so both answers are played.
    if (await has('[data-a="tie-note"]') && await has('.pp-lock .btn.ghost')) {
      if (once('tie')) await shot('05b-favoured-trade');
      await page.click(ties++ % 2 ? '.pp-lock .btn.ghost' : '.pp-lock .btn.primary');
      console.log('favoured trade step:', ties % 2 ? 'played' : 'kept');
      continue;
    }
    // PLAN-128: the first Market Day evening opens with a pop-up over the evening sheet: read it, then Got it.
    if (await has('.md-pop')) { if (once('market-day')) await shot('08b-market-day'); await page.click('.md-pop button:has-text("Got it")'); continue; }
    const lock = page.locator('.pp-lock .btn:not([disabled])');
    if (await lock.count()) {
      if (once('bid')) { await shot('05-pricing'); layout.push(...await checkLayout(page, 'bar')); }
      if (await has('.rt-sheet') && once('pricing-check')) await look('pricing');
      await lock.click();
      if (once('reveal-anim')) { await page.waitForTimeout(2900); await shot('06-reveal-anim'); if (await has('.game > .rush-table')) layout.push(...await checkLayout(page, 'rush')); else layout.push('rush: the round table was not up'); }
      continue;
    }
    if (await has('button:has-text("Lights out")')) {
      if (once('evening')) await shot('08-evening');
      await page.click('button:has-text("Lights out")');
      if (once('night')) { await page.waitForTimeout(700); await shot('09-night'); if (await has('.game.is-night')) layout.push(...await checkLayout(page, 'night')); else layout.push('night: the night was not up'); }
      continue;
    }
    for (const t of ['Close for the day', 'See results']) if (await has(`button:has-text("${t}")`)) { if (once('summary')) { await shot('07-summary'); await look('takings'); } if (await has('.hl') && once('summary-hl')) await shot('07b-summary-highlight'); await page.click(`button:has-text("${t}")`); break; }
    if (once('rivalturn') && await has('.rival-stall.active')) { await page.waitForTimeout(300); await shot('03b-rival-buying'); }
    await page.waitForTimeout(120);
    } catch {
      // The board re-renders during animations; a click can miss. Try again.
      await page.waitForTimeout(200);
    }
  }
  await page.waitForTimeout(800);
  const reached = await page.locator('.results').count();
  await shot(reached ? '10-results' : '10-stuck');
  console.log('results visible:', reached, 'errors:', errors);
  for (const x of await table.report(page)) if (!broken.includes(x)) broken.push(x);
  console.log('table checked at:', looked.join(', '));
  console.log('layout checks:', layout.length ? layout : 'all hold');
  // the stocking sheet, the pricing sheet and the takings are reached in every game
  for (const at of ['stocking', 'pricing', 'takings']) if (!looked.includes(at)) broken.push(`the table was not checked at ${at}`);
  // PLAN-130 (A-05): the table's layout, from the computed style (scripts/layout-check.cjs)
  broken.push(...layout);
  await browser.close();
  if (broken.length) {
    console.error(`Solo playthrough FAILED: the table broke its rules:\n  ${broken.join('\n  ')}`);
    process.exit(1);
  }
  if (!reached) {
    console.error(`Solo playthrough FAILED: the results screen was not reached. The last screen is in ${out}/10-stuck.png`);
    process.exit(1);
  }
})().catch((e) => { console.error(e); process.exit(1); });
