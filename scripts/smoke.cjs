// Plays a full game in a phone-sized headless browser and saves screenshots.
// Usage: node scripts/smoke.cjs <dist-single/index.html> <outdir> [rivals=3]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [file, out, rivals = '3'] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 400, height: 820 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript(() => localStorage.setItem('fm.settings', JSON.stringify({ sound: false, haptics: false, fast: true, tips: true })));
  await page.goto('file://' + path.resolve(file));
  const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
  await page.click('text=New game');
  await page.locator('.seg').nth(0).locator('button', { hasText: rivals }).click();
  await page.click('text=Open the shops');
  await page.waitForTimeout(250);
  await shot('01-delivery-anim');
  const seen = new Set();
  const once = (k) => (seen.has(k) ? false : (seen.add(k), true));
  for (let i = 0; i < 4000; i++) {
    try {
    if (await page.locator('.results').count()) break;
    const has = async (t) => (await page.locator(t).count()) > 0;
    if (await has('text=Open the market')) { if (once('morning')) await shot('02-morning'); if (await has('text=FINAL DAY') && once('finalday')) { await page.waitForTimeout(1300); await shot('02b-final-day'); } await page.click('text=Open the market'); continue; }
    if (await has('text=Done ➜')) {
      const cells = page.locator('.mk-cell.pick');
      const n = await cells.count();
      if (once('buyturn')) await shot('03-my-turn');
      if (n && Math.random() < 0.75) {
        await cells.nth(Math.floor(Math.random() * n)).click();
        if (once('flying')) { await page.waitForTimeout(220); await shot('04-buy-flying'); }
        await page.waitForTimeout(700);
        continue;
      }
      await page.click('text=Done ➜');
      continue;
    }
    const lock = page.locator('.tray-foot .btn');
    if (await has('.tray .bid, .tray-empty') && await lock.count()) {
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
    } catch (e) {
      // The board re-renders during animations; a click can miss. Try again.
      await page.waitForTimeout(200);
    }
  }
  await page.waitForTimeout(800);
  await shot('10-results');
  console.log('results visible:', await page.locator('.results').count(), 'errors:', errors);
  await browser.close();
})();
