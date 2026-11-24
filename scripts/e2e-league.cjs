// PLAN-115: the Market League's first stage, Village Square, played to its goal in a phone-sized browser. Home's
// Market League card (PLAN-120; a tile before) opens the League screen; its Play button starts stage 1 (a fixed seed, so the same market every
// time). The player plays plainly: takes the first perk; buys ripe pieces of the fruit most wanted today, up to what is
// wanted; puts out every piece; keeps a Favoured Trade card; and asks $1 under Rosa: $2 under each fruit's best price. It must win, see "Village Square cleared" and the stage's
// stars on the results, and find stage 2 open on the League screen. Exits with a failure otherwise.
// PLAN-118: then a short stage, Read the Rival (stage 7, one day), on a phone whose saved stage is 7: it must open at
// buying with Rosa's three watermelons already bought and on show; the player buys apples and blueberries (not the
// watermelons), puts every piece out, asks the best price the sheet shows, and must reach the results with the stage
// cleared, its goals listed, and Retry offered beside Next stage. The League road must then show stage 8 next.
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

  // Home's League tab, then its Play, opens the League screen (PLAN-124)
  const openLeague = async () => { await page.click('[data-tab="league"]'); await page.click('[data-a="league"]'); await page.waitForSelector('.jp-league'); };
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
      // PLAN-123: a tip lying over the market is read and closed first, as a person would (it can cover the box the
      // player wants, and a click on the box then waited behind it)
      if (await has('.coach .btn:not(.skip)')) { await page.click('.coach .btn:not(.skip)'); continue; }
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

  // ---------- PLAN-118: a short stage from its starting step to its result ----------
  const short = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  short.on('pageerror', (e) => errors.push(String(e)));
  short.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await short.addInitScript(() => {
    localStorage.setItem('fm.settings', JSON.stringify({ sound: false, haptics: false, fast: true, tips: false }));
    // A phone that has played before: its saved stage is 7, and it has had the guided first sale.
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('fm.ladder', JSON.stringify(6));
      localStorage.setItem('fm.tutorial', JSON.stringify(['trait', 'morning', 'buy', 'bought', 'stall', 'bid', 'reveal', 'evening', 'day2', 'firstsale-skip', 'marketday']));
      sessionStorage.setItem('seeded', '1');
    }
  });
  await short.goto('file://' + path.resolve(file));
  const has2 = async (t) => (await short.locator(t).count()) > 0;
  const shot2 = (n) => short.screenshot({ path: `${out}/league-short-${n}.png` });
  const fail2 = async (why) => { await shot2('stuck'); console.error(`League short stage FAILED: ${why}. Errors: ${errors.join(' | ')}`); await browser.close(); process.exit(1); };
  await short.click('[data-tab="league"]'); await short.click('[data-a="league"]');
  await short.waitForSelector('.jp-league');
  if (!(await short.locator('.jp-lg-now h2').innerText()).includes('Read the Rival')) await fail2('the League screen does not open on Read the Rival');
  if (!(await has2('.lg-stop.now'))) await fail2('the road does not mark the next stage');
  await short.click('.jp-go');
  // It opens at buying, with Rosa's purchases made and on show.
  await short.waitForSelector('button:has-text("Done buying"), button:has-text("Skip buying")', { timeout: 20000 }).catch(() => {});
  if (!(await has2('button:has-text("Done buying"), button:has-text("Skip buying")'))) await fail2('the stage does not open at buying');
  await shot2('01-open');
  const t0 = Date.now();
  for (let i = 0; i < 2000 && !(await has2('.results')); i++) {
    try {
      if (await has2('button:has-text("Done buying"), button:has-text("Skip buying")')) {
        const pick = await short.evaluate(() => {
          for (const lane of document.querySelectorAll('.tb-lane')) {
            const f = [...lane.classList].find((c) => !c.startsWith('t'));
            if (f !== 'apple' && f !== 'blueberry') continue;
            const cell = [...lane.querySelectorAll('.mk-cell.pick')].find((c) => c.classList.contains('st-fresh'));
            if (cell) return cell.getAttribute('data-a');
          }
          return null;
        });
        if (pick) { await short.click(`[data-a="${pick}"]`); await short.waitForTimeout(400); continue; }
        await short.click('button:has-text("Done buying"), button:has-text("Skip buying")');
        continue;
      }
      if (await has2('.fs-pop .fs-go:not([disabled])')) { await short.click('.fs-pop .fs-go'); continue; }
      if (await has2('.bell-notice')) { await short.click('.bell-notice .btn'); continue; }
      if (await has2('.coach .btn:not(.skip)')) { await short.click('.coach .btn:not(.skip)'); continue; }
      const add = short.locator('.stall-panel .mini-step button:last-child:not([disabled])');
      if (await add.count()) { await add.first().click(); continue; }
      if (await has2('[data-a="tie-note"]') && await has2('.pp-lock .btn.ghost')) { await short.click('.pp-lock .btn.ghost'); continue; }
      const lock = short.locator('.pp-lock .btn:not([disabled])');
      if (await lock.count()) {
        const rows = short.locator('.ps-row');
        for (let k = 0; k < await rows.count(); k++) {
          const row = rows.nth(k);
          const m = /best price \$(\d+)/.exec(await row.locator('.ps-info').innerText());
          if (!m) continue;
          const target = Number(m[1]);
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
      for (const t of ['Close for the day', 'See results']) if (await has2(`button:has-text("${t}")`)) { await short.click(`button:has-text("${t}")`); break; }
      await short.waitForTimeout(120);
    } catch {
      await short.waitForTimeout(200);
    }
  }
  if (!(await has2('.results'))) await fail2('the results screen was not reached');
  console.log(`short stage played in ${Math.round((Date.now() - t0) / 1000)} s`);
  await short.waitForTimeout(1200);
  const end2 = await short.locator('.jp-stage-end').innerText();
  await shot2('02-results');
  if (!end2.includes('Read the Rival cleared')) await fail2(`the short stage was not cleared: "${end2.split('\n').slice(0, 3).join(' / ')}"`);
  if ((await short.locator('.jp-stage-end .jp-ms li').count()) !== 3) await fail2('the results do not list the stage\'s three goals');
  if (!(await has2('.jp-acts button[aria-label="Retry stage 7"]'))) await fail2('the results do not offer Retry');
  if ((await short.locator('.jp-main').innerText()).trim().toLowerCase() !== 'next stage') await fail2('Next stage is not the first button');
  console.log('short stage results:', end2.replace(/\s+/g, ' ').slice(0, 200));
  await short.click('.jp-acts button:has-text("Home")');
  await short.click('[data-tab="league"]'); await short.click('[data-a="league"]');
  await short.waitForSelector('.jp-league');
  if (!(await short.locator('.lg-stop.now').innerText()).includes('Sell Before It Spoils')) await fail2('the road does not show stage 8 next');
  await shot2('03-road');
  console.log('league short stage: cleared, stage 8 next; errors:', errors);
  await browser.close();
  if (errors.length) { console.error('League stage FAILED: page errors'); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(1); });
