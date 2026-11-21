// PLAN-115: the Market League's first stage, Village Square, played to its goal in a phone-sized browser. Home's
// Market League tile opens the League screen; its Play button starts stage 1 (a fixed seed, so the same market every
// time). The player plays plainly: takes the first perk; buys ripe pieces of the fruit most wanted today, up to what is
// wanted; puts out every piece; keeps a Favoured Trade card; and asks $1 under Rosa: $2 under each fruit's best price. It must win, see "Village Square cleared" and the stage's
// stars on the results, and find stage 2 open on the League screen. Exits with a failure otherwise.
// Usage: node scripts/e2e-league.cjs <dist-single/index.html> <outdir>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const [file, out] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript(() => {
    localStorage.setItem('fm.settings', JSON.stringify({ sound: false, haptics: false, fast: true, tips: false }));
  });
  await page.goto('file://' + path.resolve(file));
  const shot = (n) => page.screenshot({ path: `${out}/league-${n}.png` });
  const has = async (t) => (await page.locator(t).count()) > 0;
  const fail = async (why) => { await shot('stuck'); console.error(`League stage FAILED: ${why}. Errors: ${errors.join(' | ')}`); await browser.close(); process.exit(1); };

  // Home's League tile opens the League screen
  const openLeague = async () => { await page.click('.jh-tiles button:has-text("League")'); await page.waitForSelector('.jp-league'); };
  await openLeague();
  if (!(await page.locator('.jp-lg-now h2').innerText()).includes('Village Square')) await fail('the League screen does not open on Village Square');
  await shot('01-screen');
  await page.click('.jp-go');

  const started = Date.now();
  let bought = {};
  for (let i = 0; i < 3000 && !(await has('.results')); i++) {
    try {
      if (await has('.trait-card')) { await page.locator('.trait-card').first().click(); continue; }
      if (await has('button:has-text("Start buying")')) { bought = {}; await page.click('button:has-text("Start buying")'); continue; }
      if (await has('button:has-text("Done buying"), button:has-text("Skip buying")')) {
        // A ripe piece of the fruit most wanted today that it has not bought enough of yet, the freshest box first.
        const pick = await page.evaluate((bought) => {
          let best = null;
          for (const lane of document.querySelectorAll('.tb-lane')) {
            const f = [...lane.classList].find((c) => !c.startsWith('t'));
            const wanted = Number.parseInt(lane.querySelector('.tb-lh')?.textContent ?? '0', 10) || 0;
            const left = wanted - (bought[f] ?? 0);
            const cells = [...lane.querySelectorAll('.mk-cell.pick')].filter((c) => !c.classList.contains('st-unripe'));
            const cell = cells.find((c) => c.classList.contains('st-fresh')) ?? cells.find((c) => c.classList.contains('st-okay'));
            if (cell && left > 0 && (!best || left > best.left)) best = { left, f, a: cell.getAttribute('data-a') };
          }
          return best;
        }, bought);
        if (pick) { bought[pick.f] = (bought[pick.f] ?? 0) + 1; await page.click(`[data-a="${pick.a}"]`); await page.waitForTimeout(500); continue; }
        await page.click('button:has-text("Done buying"), button:has-text("Skip buying")');
        continue;
      }
      if (await has('.fs-pop .fs-go:not([disabled])')) { await page.click('.fs-pop .fs-go'); continue; }
      if (await has('.bell-notice')) { await page.click('.bell-notice .btn'); continue; }
      if (await has('.coach .btn:not(.skip)')) { await page.click('.coach .btn:not(.skip)'); continue; }
      const add = page.locator('.stall-panel .mini-step button:last-child:not([disabled])');
      if (await add.count()) { await add.first().click(); continue; }
      if (await has('[data-a="tie-note"]') && await has('.pp-lock .btn.ghost')) { await page.click('.pp-lock .btn.ghost'); continue; }
      const lock = page.locator('.pp-lock .btn:not([disabled])');
      if (await lock.count()) {
        // Rosa asks $1 under the best price: ask $1 under her, $2 under the best price the sheet shows for each fruit.
        const rows = page.locator('.ps-row');
        for (let k = 0; k < await rows.count(); k++) {
          const row = rows.nth(k);
          const m = /best price \$(\d+)/.exec(await row.locator('.ps-info').innerText());
          if (!m) continue;
          const target = Number(m[1]) - 2;
          for (let c = 0; c < 20; c++) {
            const now = Number((await row.locator('.ds-tag-face').innerText()).replace('$', ''));
            const b = row.locator(`.ds-dial button:${now > target ? 'first' : 'last'}-child:not([disabled])`);
            if (now === target || !(await b.count())) break;
            await b.click();
          }
        }
        await lock.click();
        continue;
      }
      if (await has('button:has-text("Lights out")')) { await page.click('button:has-text("Lights out")'); continue; }
      for (const t of ['Close for the day', 'See results']) if (await has(`button:has-text("${t}")`)) { await page.click(`button:has-text("${t}")`); break; }
      await page.waitForTimeout(120);
    } catch {
      await page.waitForTimeout(200);
    }
  }
  if (!(await has('.results'))) await fail('the results screen was not reached');
  console.log(`stage played in ${Math.round((Date.now() - started) / 1000)} s`);
  await page.waitForTimeout(1200);
  const end = await page.locator('.jp-stage-end').innerText();
  await shot('02-results');
  if (!end.includes('Village Square cleared')) await fail(`the stage was not cleared: "${end.split('\n')[0]}"`);
  if (!(await has('.jp-stage-end .jp-ms li'))) await fail('the results do not show the stage\'s stars');
  console.log('results:', end.replace(/\s+/g, ' ').slice(0, 200));
  await page.click('.jp-acts button:has-text("Home")');
  await openLeague();
  const now = await page.locator('.jp-lg-now h2').innerText();
  await shot('03-next');
  if (!now.includes('Pasar Malam')) await fail(`the League screen opens on "${now}", not stage 2`);
  console.log('league: stage 2 open; errors:', errors);
  await browser.close();
  if (errors.length) { console.error('League stage FAILED: page errors'); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(1); });
