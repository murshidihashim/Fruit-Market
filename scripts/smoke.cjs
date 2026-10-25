// Plays a full game in a phone-sized headless browser and saves screenshots.
// Usage: node scripts/smoke.cjs <dist-single/index.html> <outdir>
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [file, out] = process.argv.slice(2);
  const browser = await chromium.launch();
  const store = !!process.env.STORE;
  const page = await browser.newPage(store ? { viewport: { width: 432, height: 768 }, deviceScaleFactor: 2.5 } : { viewport: { width: 400, height: 860 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('file://' + path.resolve(file));
  const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
  await page.waitForTimeout(400);
  await shot('01-home');
  await page.click('text=How to play');
  await shot('02-howto');
  await page.click('text=Next →'); await shot('03-howto2');
  await page.click('text=Next →'); await page.click('text=Next →'); await shot('03-howto4');
  await page.click('.topbar .icon-btn');
  await page.click('text=New game');
  await shot('04-setup');
  await page.click('text=Open the shops');
  await page.waitForTimeout(500);
  await shot('05-morning');
  const seen = new Set();
  for (let i = 0; i < 600; i++) {
    if (await page.locator('.results').count()) break;
    const day = await page.locator('.topbar .day b').first().textContent().catch(() => '');
    const tag = (n) => { const k = `${n}`; if (!seen.has(k)) { seen.add(k); return true; } return false; };
    if (await page.locator('text=Open the market').count()) { await page.click('text=Open the market'); continue; }
    if (await page.locator('text=Done buying').count()) {
      const cells = page.locator('.market .cell.pick');
      const n = await cells.count();
      if (n) { await cells.nth(Math.floor(Math.random() * n)).click(); await page.waitForTimeout(80); }
      if ((!store || day === 'Day 3') && tag('buy')) await shot('06-buying');
      const left = await page.locator('.market .cell.pick').count();
      if (!left || Math.random() < 0.35) await page.click('text=Done buying');
      continue;
    }
    if (await page.locator('text=Lock in offers').count()) {
      const offering = await page.locator('.bid-line.on').count();
      if ((store ? offering >= 2 && tag('bid') : tag('bid' + day) && seen.size < 6)) await shot('07-bidding-' + day.replace(/\W/g, ''));
      const btn = page.locator('text=Lock in offers');
      if (await btn.isDisabled()) { console.log('bid disabled:', await page.locator('.error').textContent()); }
      await btn.click();
      continue;
    }
    if (await page.locator('.reveal').count() && await page.locator('text=Close shop for the day').count()) {
      await page.waitForTimeout(900);
      const won = await page.locator('.offer.won').count();
      if ((!store || won >= 3) && tag('reveal')) await shot('08-reveal');
      await page.click('text=Close shop for the day');
      continue;
    }
    if (await page.locator('text=See final results').count()) { await page.click('text=See final results'); continue; }
    if (await page.locator('text=Lights out').count()) {
      if ((!store || day === 'Day 4') && tag('evening')) await shot('09-evening');
      const up = page.locator('.upgrade:not([disabled])');
      if (await up.count() && Math.random() < 0.3) await up.first().click();
      await page.click('text=Lights out');
      continue;
    }
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1200);
  await shot('10-results');
  console.log('results visible:', await page.locator('.results').count());
  console.log('errors:', errors);
  await browser.close();
})();
