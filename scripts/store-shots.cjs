// Regenerates the Play Store screenshots (1080x1920) from the single-file build.
// Usage: npm run store:shots   (= npm run build:single && node scripts/store-shots.cjs dist-single/index.html store/screenshots)
// PLAN-037: follows the current flow (shopkeeper picked on the set-up screen, no trait card in the game),
// switches the help bubbles off, and fails loudly if a screenshot is missing instead of hanging.
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
    localStorage.setItem('fm.settings', JSON.stringify({ sound: false, haptics: false, fast: true, tips: false, analytics: false }));
    // Every first-game coach tip marked as seen (ids from src/ui/tutorial.ts), so no bubble covers the board.
    localStorage.setItem('fm.tutorial', JSON.stringify(['trait', 'morning', 'buy', 'bought', 'stall', 'bid', 'reveal', 'evening', 'day2']));
    localStorage.setItem('fm.name', 'You');
  });
  await p.goto('file://' + path.resolve(file));
  await p.waitForTimeout(400);
  const shot = (name) => p.screenshot({ path: `${out}/${name}.png` });
  await shot('1-home');
  await p.click('text=New game');
  await p.locator('.seg').nth(0).locator('button', { hasText: '2' }).click();
  // The shopkeeper picker on the set-up screen (each character has one perk for the whole game).
  await p.locator('.char-card').nth(1).click();
  await p.locator('.char-pick').evaluate((el) => el.closest('.panel').scrollIntoView({ block: 'start' }));
  await p.waitForTimeout(300);
  await shot('2-characters');
  await p.click('text=Start game');
  const done = new Set();
  const once = (k) => (done.has(k) ? false : (done.add(k), true));
  for (let i = 0; i < 3000 && done.size < 6; i++) {
    try {
      if (await p.locator('.results').count()) break;
      if (await p.locator('text=Start buying').count()) { await p.click('text=Start buying'); continue; }
      if (await p.locator('text=/Done buying|Skip buying/').count()) {
        const t = p.locator('.mk-cell.pick');
        if (await p.locator('.my-stall .ms-cell.has').count() >= 2 && once('buy')) { await p.waitForTimeout(500); await shot('3-buying'); }
        if (await t.count() && (await p.locator('.my-stall .ms-cell.has').count()) < 4) { await t.first().click(); await p.waitForTimeout(500); continue; }
        await p.click('text=/Done buying|Skip buying/'); continue;
      }
      if (await p.locator('.pp-lock .btn').count()) {
        // The same button bar serves "Open my stall" (stocking) and "Seal my prices" (secret prices).
        const pricing = (await p.locator('.price-panel:not(.stall-panel) .price-card').count()) >= 1;
        if (pricing && once('price')) { await p.waitForTimeout(1500); await shot('4-pricing'); }
        await p.click('.pp-lock .btn'); await p.waitForTimeout(1800);
        if (pricing && (await p.locator('.auction').count()) && once('show')) await shot('5-showdown');
        continue;
      }
      if (await p.locator('text=Lights out').count()) {
        // The first evening as a fallback; replaced by the first evening that offers stall upgrades.
        if (once('eve')) { await p.waitForTimeout(700); await shot('6-upgrades'); }
        if ((await p.locator('.upgrade-grid').count()) && once('upgrades')) { await p.waitForTimeout(2500); await shot('6-upgrades'); }
        await p.click('text=Lights out'); continue;
      }
      for (const t of ['Close for the day', 'Final results', 'See final results']) if (await p.locator(`text=${t}`).count()) { await p.click(`text=${t}`); break; }
      await p.waitForTimeout(120);
    } catch { await p.waitForTimeout(200); }
  }
  await p.goto('file://' + path.resolve(file));
  await p.waitForTimeout(300);
  await p.click('text=Trophies');
  await p.waitForTimeout(1000); // let the cards finish fading in, so two runs give the same picture
  await shot('7-trophies');
  console.log('saved', [...done].join(', '));
  await b.close();
  const missing = ['buy', 'price', 'show', 'eve'].filter((k) => !done.has(k));
  if (missing.length) { console.error(`STORE SHOTS INCOMPLETE: no screenshot for ${missing.join(', ')}`); process.exit(1); }
})();
