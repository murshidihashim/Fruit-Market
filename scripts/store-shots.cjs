// Regenerates the Play Store screenshots (1080x1920) from the single-file build.
// Usage: npm run build:single && node scripts/store-shots.cjs dist-single/index.html store/screenshots
const { chromium } = require('playwright');
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
  await p.click('text=New game');
  await p.locator('.seg').nth(0).locator('button', { hasText: '2' }).click();
  await p.click('text=Open the shops');
  await p.waitForSelector('.trait-card');
  await p.waitForTimeout(1500);
  await shot('2-traits');
  const done = new Set();
  const once = (k) => (done.has(k) ? false : (done.add(k), true));
  for (let i = 0; i < 3000 && done.size < 5; i++) {
    try {
      if (await p.locator('.results').count()) break;
      if (await p.locator('.trait-card').count()) { await p.locator('.trait-card').nth(1).click(); continue; }
      if (await p.locator('text=Open the market').count()) { await p.click('text=Open the market'); continue; }
      if (await p.locator('text=/Done buying|Skip buying/').count()) {
        const t = p.locator('.mk-cell.pick');
        if (await p.locator('.my-stall .ms-cell.has').count() >= 2 && once('buy')) { await p.waitForTimeout(500); await shot('3-buying'); }
        if (await t.count() && (await p.locator('.my-stall .ms-cell.has').count()) < 4) { await t.first().click(); await p.waitForTimeout(500); continue; }
        await p.click('text=/Done buying|Skip buying/'); continue;
      }
      if (await p.locator('.pp-lock .btn').count()) {
        if ((await p.locator('.price-card').count()) >= 1 && once('price')) { await p.waitForTimeout(1500); await shot('4-pricing'); }
        await p.click('.pp-lock .btn'); await p.waitForTimeout(1800);
        if ((await p.locator('.auction').count()) && once('show')) await shot('5-showdown');
        continue;
      }
      if (await p.locator('text=Lights out').count()) {
        if (once('eve')) { await p.waitForTimeout(700); await shot('6-upgrades'); }
        await p.click('text=Lights out'); continue;
      }
      for (const t of ['Close for the day', 'See final results']) if (await p.locator(`text=${t}`).count()) { await p.click(`text=${t}`); break; }
      await p.waitForTimeout(120);
    } catch { await p.waitForTimeout(200); }
  }
  await p.goto('file://' + path.resolve(file));
  await p.waitForTimeout(300);
  await p.click('text=Trophies');
  await p.waitForTimeout(300);
  await shot('7-trophies');
  console.log('saved', [...done].join(', '));
  await b.close();
})();
