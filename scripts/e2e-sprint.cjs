// PLAN-114: the Market Sprint in a phone-sized browser against the local server. Starts today's Sprint from Home, plays
// it to the results, checks the Sprint box (best today, a place on the day's board, one reason, the weekly ranking),
// taps Try again and checks that the same Sprint starts at once (Day 1 of 3, the same lorry), plays it through again
// and checks that the device still has one line on the board. PLAN-119: first opens the Play menu and checks its groups
// ("Normal game", then the League, the Daily market and the Sprint with their reasons); on the results, checks the
// decisive moment and the weekly ranking's line ("Your best 5 days count.").
// Usage: node scripts/e2e-sprint.cjs <base-url> <outdir>
//   PACE=human   plays with simple human-like pauses and the normal animation speed, and prints how long each Sprint
//                took (the run-time measure); by default it plays at test speed.
//   RUNS=1       plays one Sprint only (no Try again).
const { chromium } = require('playwright');
const fs = require('fs');

const human = process.env.PACE === 'human';
const runs = Number(process.env.RUNS ?? 2);
/** A pause a person would take: `ms` in human pace, a short beat otherwise. */
const think = (page, ms) => page.waitForTimeout(human ? ms : 60);

async function playSprint(page, shot, tag) {
  const seen = new Set();
  const once = (k) => (seen.has(k) ? false : (seen.add(k), true));
  const t0 = Date.now();
  const has = async (t) => (await page.locator(t).count()) > 0;
  for (let i = 0; i < 4000; i++) {
    try {
      if (await has('.results')) break;
      if (await has('.trait-card')) { await think(page, 4000); await page.locator('.trait-card').first().click(); continue; }
      if (await has('button:has-text("Start buying")')) { if (once('morning')) await shot(`${tag}-01-morning`); await think(page, 3000); await page.click('button:has-text("Start buying")'); continue; }
      if (await has('button:has-text("Done buying"), button:has-text("Skip buying")')) {
        const cells = page.locator('.mk-cell.pick');
        const n = await cells.count();
        if (n && Math.random() < 0.75) { await think(page, 1500); await cells.nth(Math.floor(Math.random() * n)).click(); await page.waitForTimeout(human ? 300 : 500); continue; }
        await think(page, 1000);
        await page.click('button:has-text("Done buying"), button:has-text("Skip buying")');
        continue;
      }
      if (await has('.bell-notice')) { await think(page, 2500); await page.click('.bell-notice .btn'); continue; }
      if (await has('.coach .btn:not(.skip)')) { await think(page, 2500); await page.click('.coach .btn:not(.skip)'); continue; }
      const add = page.locator('.stall-panel .mini-step button:last-child:not([disabled])');
      if (await add.count()) { await think(page, 700); await add.first().click(); continue; }
      if (await has('[data-a="tie-note"]') && await has('.pp-lock .btn.ghost')) { await think(page, 2500); await page.click('.pp-lock .btn.primary'); continue; }
      const lock = page.locator('.pp-lock .btn:not([disabled])');
      if (await lock.count()) { if (once('bid')) await shot(`${tag}-02-pricing`); await think(page, 6000); await lock.click(); continue; }
      if (await has('button:has-text("Lights out")')) { await think(page, 2000); await page.click('button:has-text("Lights out")'); continue; }
      let closed = false;
      for (const t of ['Close for the day', 'See results']) {
        if (await has(`button:has-text("${t}")`)) { await think(page, 4000); await page.click(`button:has-text("${t}")`); closed = true; break; }
      }
      if (!closed) await page.waitForTimeout(120);
    } catch {
      await page.waitForTimeout(200); // the board re-renders during animations; a click can miss
    }
  }
  return (Date.now() - t0) / 1000;
}

(async () => {
  const [base, out] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  // A name of its own (letters only), so this run never meets the name check of an earlier run's device on the board.
  const name = `Tester ${Array.from({ length: 6 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('')}`;
  await page.addInitScript(([fast, name]) => {
    if (!localStorage.getItem('fm.settings')) localStorage.setItem('fm.settings', JSON.stringify({ sound: false, haptics: false, fast, tips: false }));
    if (!localStorage.getItem('fm.name')) localStorage.setItem('fm.name', name);
  }, [!human, name]);
  await page.goto(base);
  const shot = (n) => page.screenshot({ path: `${out}/sprint-${n}.png` });
  const fail = async (msg) => { await shot('stuck'); console.error(`Sprint e2e FAILED: ${msg} (errors: ${JSON.stringify(errors)})`); await browser.close(); process.exit(1); };

  // PLAN-119: the Play menu gives each mode its job.
  await page.click('[data-a="play"]');
  await page.waitForSelector('[data-a="normal-game"]');
  const group = page.locator('[data-a="normal-game"]');
  if (!/normal game/i.test(await group.locator('h2').innerText())) return fail('the Play menu has no "Normal game" heading');
  for (const a of ['quick', 'room', 'join', 'computer', 'phone', 'public']) {
    if ((await group.locator(`[data-a="${a}"]`).count()) !== 1) return fail(`"${a}" is not in the Normal game group`);
  }
  if ((await group.locator('.jp-len button').count()) !== 3) return fail('the game length choice is not in the Normal game group');
  const modes = await page.locator('.jp-in > .jp-mode').evaluateAll((els) => els.map((e) => e.getAttribute('data-a')));
  if (modes.join() !== 'league,daily,sprint') return fail(`the modes after the group are ${modes.join()}`);
  const reasons = { league: 'What will the next market throw at you', daily: 'How you rank in today\'s full market', sprint: 'A few minutes. Beat your best.' };
  for (const [a, why] of Object.entries(reasons)) {
    const t = await page.locator(`.jp-in > [data-a="${a}"] .jp-why`).innerText();
    if (t.trim() !== why) return fail(`the ${a} tile's reason is "${t}"`);
  }
  await shot('play-menu');
  console.log(`Play menu: Normal game group, then ${modes.join(', ')}`);
  await page.click('.jp-bar .icon-btn');
  await page.waitForSelector('[data-a="sprint-row"]');
  await page.click('[data-a="sprint-row"] [data-a="sprint"]');
  // The same Sprint is the same seed: the same perks on offer on the first morning.
  const perks = async () => { await page.waitForSelector('.trait-card', { timeout: 15000 }).catch(() => {}); return (await page.locator('.trait-card').allInnerTexts()).join(' | '); };
  const offer1 = await perks();
  const times = [];
  for (let r = 1; r <= runs; r++) {
    const secs = await playSprint(page, shot, `run${r}`);
    times.push(secs);
    if (!(await page.locator('.results').count())) return fail(`run ${r}: the results screen was not reached`);
    await page.waitForSelector('[data-a="sprint-result"]', { timeout: 10000 }).catch(() => {});
    if (!(await page.locator('[data-a="sprint-result"]').count())) return fail('no Sprint box on the results');
    await page.waitForSelector('.sp-place b', { timeout: 20000 }).catch(() => {});
    const place = (await page.locator('.sp-place').innerText().catch(() => '')).replace(/\s+/g, ' ');
    const why = await page.locator('.sp-why').innerText().catch(() => '');
    const head = await page.locator('.jp-head small').innerText().catch(() => '');
    const main = await page.locator('.jp-main').innerText();
    const week = await page.locator('.sp-sec').nth(1).innerText().catch(() => '');
    const weekNote = await page.locator('[data-a="sprint-week-note"]').innerText().catch(() => '');
    const moment = await page.locator('[data-a="sprint-moment"]').innerText().catch(() => '');
    console.log(`run ${r}: ${secs.toFixed(0)} s · ${head} · ${place} · reason: ${why} · main button: ${main}`);
    if (!/Place \d+(st|nd|rd|th) of \d+/.test(place)) return fail(`no place on the board (${place})`);
    if (!why) return fail('no reason line');
    if (!/This week/i.test(week)) return fail('no weekly ranking');
    if (weekNote.trim() !== 'Your best 5 days count.') return fail(`the weekly ranking's line is "${weekNote}"`);
    if (!/Decisive moment/i.test(moment) || !/\$\d+/.test(why)) return fail(`no decisive moment with its dollars (${moment})`);
    if (!/Day 3 of 3 · Sprint/i.test(head)) return fail(`wrong header (${head})`);
    if (!/Try again/i.test(main)) return fail(`main button is "${main}"`);
    await page.locator('[data-a="sprint-result"]').scrollIntoViewIfNeeded();
    await shot(`run${r}-results`);
    if (r === runs) break;
    await page.click('.jp-main');
    await page.waitForSelector('.results', { state: 'detached', timeout: 10000 }).catch(() => {});
    if (await page.locator('.results').count()) return fail('Try again did not start a new Sprint');
    const again = await page.locator('.game, #app').first().innerText().catch(() => '');
    if (!/Day 1/i.test(again)) return fail('Try again did not start on Day 1');
    const offer2 = await perks();
    if (!offer1 || offer2 !== offer1) return fail(`Try again offered other perks (${offer1} / ${offer2})`);
    console.log('Try again: the same Sprint started at once');
  }
  if (runs > 1) {
    const day = page.locator('.sp-sec').first();
    const mine = await day.locator('li.me').count();
    if (mine !== 1) return fail(`this device has ${mine} lines on the day's board`);
  }
  console.log(`Sprint times (s): ${times.map((t) => t.toFixed(0)).join(', ')}; errors: ${JSON.stringify(errors)}`);
  await browser.close();
  if (errors.length) { console.error('Sprint e2e FAILED: page errors'); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(1); });
