// Regenerates the Play Store screenshots (1080x1920) from the single-file build.
// Usage: npm run build:single && node scripts/store-shots.cjs dist-single/index.html store/screenshots
const { chromium } = require('playwright');

/** Sets the number of rival stalls on the set-up screen's seat tiles (PLAN-058): + Add, or open the last tile and remove it. */
async function setRivals(page, n) {
  const tiles = page.locator('.seat-tile:not(.add)');
  while (await tiles.count() < Number(n)) await page.click('.seat-tile.add');
  while (await tiles.count() > Number(n)) { await tiles.last().click(); await page.click('.seat-remove'); }
}
const path = require('path');

(async () => {
  const [file, out] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });
  await p.addInitScript(() => {
    // Same game every run (seeded random numbers), so screenshots can be compared between versions.
    let seed = 12345;
    Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
    localStorage.setItem('fm.settings', JSON.stringify({ sound: false, haptics: false, fast: true, analytics: false }));
    localStorage.setItem('fm.tutorial', JSON.stringify(['trait', 'morning', 'buy', 'bought', 'stall', 'bid', 'reveal', 'evening', 'day2']));
    localStorage.setItem('fm.name', 'You');
  });
  await p.goto('file://' + path.resolve(file));
  await p.waitForTimeout(400);
  const shot = (name) => p.screenshot({ path: `${out}/${name}.png` });
  await shot('1-home');
  await p.click('button:has-text("New game")');
  await setRivals(p, 2);
  await p.click('button:has-text("Start game")');
  // A merchant trait is picked only when the game offers one (the Daily market, the Market League); a new game goes
  // straight to the table.
  await p.waitForSelector('.trait-card, .market-stall');
  if (await p.locator('.trait-card').count()) { await p.waitForTimeout(1500); await shot('2-traits'); }
  const done = new Set();
  const once = (k) => (done.has(k) ? false : (done.add(k), true));
  for (let i = 0; i < 3000 && done.size < 5; i++) {
    try {
      if (await p.locator('.results').count()) break;
      if (await p.locator('.trait-card').count()) { await p.locator('.trait-card').nth(1).click(); continue; }
      if (await p.locator('button:has-text("Start buying")').count()) { await p.click('button:has-text("Start buying")'); continue; }
      if (await p.locator('button:has-text("Done buying"), button:has-text("Skip buying")').count()) {
        const t = p.locator('.mk-cell.pick');
        if (await p.locator('.my-stall .tb-chip').count() >= 2 && once('buy')) { await p.waitForTimeout(500); await shot('3-buying'); }
        if (await t.count() && (await p.locator('.my-stall .tb-chip').count()) < 4) { await t.first().click(); await p.waitForTimeout(500); continue; }
        await p.click('button:has-text("Done buying"), button:has-text("Skip buying")'); continue;
      }
      // "The Bell" pop-up opens by itself on Day 1 (PLAN-059): close it before pricing.
      if (await p.locator('.bell-notice').count()) { await p.click('.bell-notice .btn'); continue; }
      // Fill your stall starts empty (PLAN-061): add every piece you can before opening.
      if (await p.locator('.stall-panel .mini-step button:last-child:not([disabled])').count()) { await p.locator('.stall-panel .mini-step button:last-child:not([disabled])').first().click(); continue; }
      if (await p.locator('.pp-lock .btn:not([disabled])').count()) {
        if ((await p.locator('.ds-prow').count()) >= 1 && once('price')) { await p.waitForTimeout(1500); await shot('4-pricing'); }
        await p.click('.pp-lock .btn:not([disabled])'); await p.waitForTimeout(1800);
        if ((await p.locator('.auction').count()) && once('show')) await shot('5-showdown');
        continue;
      }
      if (await p.locator('button:has-text("Lights out")').count()) {
        if (once('eve')) { await p.waitForTimeout(700); await shot('6-upgrades'); }
        await p.click('button:has-text("Lights out")'); continue;
      }
      for (const t of ['Close for the day', 'See results']) if (await p.locator(`button:has-text("${t}")`).count()) { await p.click(`button:has-text("${t}")`); break; }
      await p.waitForTimeout(120);
    } catch { await p.waitForTimeout(200); }
  }
  await p.goto('file://' + path.resolve(file));
  await p.waitForTimeout(300);
  await p.click('button:has-text("Trophies")');
  await p.waitForTimeout(300);
  await shot('7-trophies');
  console.log('saved', [...done].join(', '));
  await b.close();
})();
