// Plays a full game in a phone-sized headless browser and saves screenshots. Exits with a failure when the game does
// not reach the results screen (PLAN-081: it used to print a line and pass).
// Usage: node scripts/smoke.cjs <dist-single/index.html> <outdir> [rivals=3] [saved-game.json]
// With a saved game (a file holding what the game keeps under "fm.save") the script continues that game from the home
// screen instead of starting a new one, so a chosen moment (such as the Favoured Trade step) can be played through.
const { chromium } = require('playwright');
const fs = require('fs');

/** Sets the number of rival stalls on the set-up screen's seat tiles (PLAN-058): + Add, or open the last tile and remove it. */
async function setRivals(page, n) {
  const tiles = page.locator('.seat-tile:not(.add)');
  while (await tiles.count() < Number(n)) await page.click('.seat-tile.add');
  while (await tiles.count() > Number(n)) { await tiles.last().click(); await page.click('.seat-remove'); }
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
  await page.addInitScript((save) => {
    localStorage.setItem('fm.settings', JSON.stringify({ sound: false, haptics: false, fast: true, tips: true }));
    if (save && !localStorage.getItem('fm.smoke')) { localStorage.setItem('fm.smoke', '1'); localStorage.setItem('fm.save', save); }
  }, save);
  await page.goto('file://' + path.resolve(file));
  const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
  if (save) {
    await page.click('text=Continue');
    await page.click('text=Resume');
  } else {
    await page.click('text=New game');
    await setRivals(page, rivals);
    await page.click('text=Start game');
    await page.waitForTimeout(250);
    await shot('01-delivery-anim');
  }
  const seen = new Set();
  const once = (k) => (seen.has(k) ? false : (seen.add(k), true));
  let ties = 0;
  for (let i = 0; i < 4000; i++) {
    try {
    if (await page.locator('.results').count()) break;
    const has = async (t) => (await page.locator(t).count()) > 0;
    if (await has('.trait-card')) { if (once('trait')) await shot('01b-trait'); await page.click('.trait-card'); continue; }
    if (await has('text=Start buying')) { if (once('morning')) await shot('02-morning'); if (await has('text=FINAL DAY') && once('finalday')) { await page.waitForTimeout(1300); await shot('02b-final-day'); } await page.click('text=Start buying'); continue; }
    if (await has('text=/Done buying|Skip buying/')) {
      const cells = page.locator('.mk-cell.pick');
      const n = await cells.count();
      if (once('buyturn')) await shot('03-my-turn');
      if (n && Math.random() < 0.75) {
        await cells.nth(Math.floor(Math.random() * n)).click();
        if (once('flying')) { await page.waitForTimeout(220); await shot('04-buy-flying'); }
        await page.waitForTimeout(700);
        continue;
      }
      await page.click('text=/Done buying|Skip buying/');
      continue;
    }
    // "The Bell" pop-up opens by itself on Day 1 (PLAN-059): close it before pricing.
    if (await page.locator('.bell-notice').count()) { await page.click('.bell-notice .btn'); continue; }
    // The first-game tips (tips are on in this test): read and close each one.
    if (await page.locator('.coach .btn:not(.skip)').count()) { await page.click('.coach .btn:not(.skip)'); continue; }
    // Fill your stall starts empty (PLAN-061): add every piece you can before opening.
    if (await page.locator('.stall-panel .mini-step button:last-child:not([disabled])').count()) { await page.locator('.stall-panel .mini-step button:last-child:not([disabled])').first().click(); continue; }
    // The Favoured Trade step (rules 18): a stall that holds the card and has a tied price is asked after the flip,
    // with two buttons, "Play it" and "Keep it" (PLAN-081: the one-button step below used to stop here for good).
    // Play it the first time and keep it the next, so both answers are played.
    if (await has('[data-a="tie-note"]') && await has('.pp-lock .btn.ghost')) {
      if (once('tie')) await shot('05b-favoured-trade');
      await page.click(ties++ % 2 ? '.pp-lock .btn.ghost' : '.pp-lock .btn.primary');
      console.log('favoured trade step:', ties % 2 ? 'played' : 'kept');
      continue;
    }
    const lock = page.locator('.pp-lock .btn:not([disabled])');
    if (await lock.count()) {
      if (once('bid')) await shot('05-pricing');
      await lock.click();
      if (once('reveal-anim')) { await page.waitForTimeout(2900); await shot('06-reveal-anim'); }
      continue;
    }
    if (await has('text=Lights out')) {
      if (once('evening')) await shot('08-evening');
      await page.click('text=Lights out');
      if (once('night')) { await page.waitForTimeout(700); await shot('09-night'); }
      continue;
    }
    for (const t of ['Close for the day', 'Final results']) if (await has(`text=${t}`)) { if (once('summary')) await shot('07-summary'); if (await has('.hl') && once('summary-hl')) await shot('07b-summary-highlight'); await page.click(`text=${t}`); break; }
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
  await browser.close();
  if (!reached) {
    console.error(`Solo playthrough FAILED: the results screen was not reached. The last screen is in ${out}/10-stuck.png`);
    process.exit(1);
  }
})().catch((e) => { console.error(e); process.exit(1); });
