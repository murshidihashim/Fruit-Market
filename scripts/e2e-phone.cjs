// PLAN-116 (REP-133 A-01): one phone, two people. When one person's buying turn passes straight to the other person,
// a quick double tap on Done (and a tap on a piece of fruit right after it) must not act for the next person: their
// turn must still be waiting, with nothing bought, when the "Pass the phone" screen comes up, and it must start only
// when they tap it. Plays the first days plainly otherwise (the first perk, one ripe piece, every piece out, the
// suggested prices). Exits with a failure if a tap crossed the hand-over, or if no such hand-over was reached.
// Usage: node scripts/e2e-phone.cjs <dist-single/index.html> <outdir>
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
    // At the usual speed: the last purchase's beat is what leaves time for a tap to land before the hand-over.
    localStorage.setItem('fm.settings', JSON.stringify({ sound: false, haptics: false, fast: false, tips: false }));
  });
  await page.goto('file://' + path.resolve(file));
  const shot = (n) => page.screenshot({ path: `${out}/phone-${n}.png` });
  const has = async (t) => (await page.locator(t).count()) > 0;
  const game = () => page.evaluate(() => { const e = JSON.parse(localStorage.getItem('fm.save.play') || 'null'); return e && e.game; }); // PLAN-120: the Play slot
  const fail = async (why) => { await shot('stuck'); console.error(`One phone FAILED: ${why}. Errors: ${errors.join(' | ')}`); await browser.close(); process.exit(1); };

  await page.click('[data-tab="custom"]'); // PLAN-132: Home's Match tab, the Pass & Play tile, then Play
  await page.click('[data-a="way-phone"]');
  await page.click('[data-a="play"]');
  await page.click('button:has-text("Start game")');

  const DONE = 'button:has-text("Done buying"), button:has-text("Skip buying")';
  let crossings = 0;
  for (let i = 0; i < 2500 && crossings < 3; i++) {
    try {
      const s = await game();
      if (!s || s.phase === 'over') break;
      if (await has('.handoff')) { await page.waitForTimeout(600); await page.click('.handoff .btn'); continue; }
      if (await has('.trait-card')) { await page.locator('.trait-card').first().click(); continue; }
      if (await has('button:has-text("Start buying")')) { await page.click('button:has-text("Start buying")'); continue; }
      if (s.phase === 'buy' && await has(DONE)) {
        const me = s.order[s.turn];
        const next = s.order[s.turn + 1];
        const crossing = next !== undefined && s.players[next].kind === 'human' && s.players[me].kind === 'human';
        if (!crossing) {
          const c = page.locator('.mk-cell.pick:not(.st-unripe)');
          if (s.players[me].boughtToday === 0 && await c.count()) { await c.first().click(); await page.waitForTimeout(500); continue; }
          await page.click(DONE);
          continue;
        }
        // The turn passes from one person to the other: a piece bought, then Done tapped twice in quick succession and a
        // piece of fruit tapped straight after, all while the last piece is still on its way.
        const before = s.players[next].boughtToday;
        const c = page.locator('.mk-cell.pick:not(.st-unripe)');
        if (await c.count()) await c.first().click();
        const box = await page.locator(DONE).first().boundingBox();
        const cell = await page.locator('.mk-cell').first().boundingBox();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(120);
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(120);
        if (cell) await page.mouse.click(cell.x + cell.width / 2, cell.y + cell.height / 2);
        await page.waitForSelector('.handoff', { timeout: 8000 }).catch(() => {});
        const after = await game();
        if (after.phase !== 'buy' || after.order[after.turn] !== next) await fail(`${s.players[next].name}'s buying turn was skipped on day ${s.day} (phase ${after.phase}, turn of ${after.players[after.order[after.turn]]?.name})`);
        if (after.players[next].boughtToday !== before) await fail(`a piece was bought for ${s.players[next].name} before the hand-over on day ${s.day}`);
        if (!(await has('.handoff'))) await fail(`no "Pass the phone" after ${s.players[me].name}'s turn on day ${s.day}: ${s.players[next].name}'s turn is open without it`);
        await shot(`handover-d${s.day}`);
        console.log(`day ${s.day}: ${s.players[me].name} double-tapped Done and tapped the market; ${s.players[next].name}'s turn waits for the hand-over, nothing bought`);
        crossings++;
        await page.waitForTimeout(600);
        await page.click('.handoff .btn');
        await page.waitForSelector(DONE, { timeout: 4000 });
        const live = await game();
        if (live.order[live.turn] !== next || live.players[next].boughtToday !== before) await fail('the next person\'s turn did not start as it was');
        continue;
      }
      if (await has('.bell-notice')) { await page.click('.bell-notice .btn'); continue; }
      const add = page.locator('.stall-panel .mini-step button:last-child:not([disabled])');
      if (await add.count()) { await add.first().click(); continue; }
      if (await has('[data-a="tie-note"]') && await has('.pp-lock .btn.ghost')) { await page.click('.pp-lock .btn.ghost'); continue; }
      const lock = page.locator('.pp-lock .btn:not([disabled])');
      if (await lock.count()) { await lock.first().click(); continue; }
      const stall = page.locator('.sb-go:not([disabled]), button:has-text("Open stall"):not([disabled])');
      if (await stall.count()) { await stall.first().click(); continue; }
      // PLAN-128: the first Market Day evening opens with a pop-up over the evening sheet: read it, then Got it.
      if (await has('.md-pop')) { await page.click('.md-pop button:has-text("Got it")'); continue; }
      const ring = page.locator('button:has-text("Ring the bell"):not([disabled]), button:has-text("Seal"):not([disabled])');
      if (await ring.count()) { await ring.first().click(); continue; }
      const tie = page.locator('button:has-text("Keep"):not([disabled])');
      if (await tie.count()) { await tie.first().click(); continue; }
      if (await has('button:has-text("Lights out")')) { await page.click('button:has-text("Lights out")'); continue; }
      if (await has('button:has-text("Close for the day")')) { await page.click('button:has-text("Close for the day")'); continue; }
      const pass = page.locator('.ob-pass:not([disabled])');
      if (await pass.count()) { await pass.first().click(); continue; }
    } catch { /* the screen changed under the tap: look again */ }
    await page.waitForTimeout(150);
  }
  if (!crossings) await fail('no buying turn passed straight from one person to the other');
  console.log(`one phone: ${crossings} hand-overs checked; errors:`, errors);
  await browser.close();
  if (errors.length) { console.error('One phone FAILED: page errors'); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(1); });
