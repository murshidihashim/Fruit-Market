// PLAN-114: the Market Sprint in a phone-sized browser against the local server. Starts today's Sprint from Home, plays
// it to the results, checks the Sprint box (best today, a place on the day's board, one reason, the weekly ranking),
// taps Try again and checks that the same Sprint starts at once (Day 1 of 3, the same lorry), plays it through again
// and checks that the device still has one line on the board. PLAN-119: first opens the Play menu and checks its
// "Normal game" group; on the results, checks the decisive moment and the weekly ranking's line ("Your best 5 days
// count."). PLAN-120: the Play menu holds the Normal game group only; Home has the three mode cards (Play, League,
// Daily market); the Sprint opens from the Daily card through the Daily intro, which explains it before Start.
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

  // PLAN-119: the Play menu gives each mode its job. PLAN-124: Home's Custom tab, then its Play.
  await page.click('[data-tab="custom"]');
  await page.click('[data-a="play"]');
  await page.waitForSelector('[data-a="normal-game"]');
  const group = page.locator('[data-a="normal-game"]');
  if (!/custom match/i.test(await group.locator('h2').innerText())) return fail('the Play menu has no "Custom match" heading');
  // PLAN-125 (DEC-133): the four ways; joining with a code, the Public rooms and the game length are on their pages.
  for (const a of ['quick', 'room', 'computer', 'phone']) {
    if ((await group.locator(`[data-a="${a}"]`).count()) !== 1) return fail(`"${a}" is not in the Custom match group`);
  }
  // PLAN-120: the League, the Daily market and the Sprint left the Play page for cards of their own on Home.
  const left = await page.locator('.jp-in [data-a="league"], .jp-in [data-a="daily"], .jp-in [data-a="sprint"]').count();
  if (left) return fail('the Play page still has the League, the Daily market or the Sprint');
  await shot('play-menu');
  console.log('Play menu: the Custom match group only');
  await page.click('.jp-bar .icon-btn');
  // PLAN-124: Home's four mode tabs, in order; the Sprint tab's card, then its Play, opens the Daily intro on the Sprint,
  // whose Start starts it.
  const tabs = await page.locator('[role="tablist"] [role="tab"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-tab')));
  if (tabs.join() !== 'custom,league,daily,sprint') return fail(`Home's mode tabs are ${tabs.join()}`);
  await page.click('[data-tab="sprint"]');
  await page.waitForSelector('[data-card="sprint"]');
  if ((await page.getAttribute('[data-tab="sprint"]', 'aria-selected')) !== 'true') return fail('the Sprint tab is not marked chosen');
  await page.click('[data-a="sprint"]');
  await page.waitForSelector('[data-a="intro-sprint"]');
  const intro = (await page.locator('[data-a="intro-sprint"]').innerText()).replace(/\s+/g, ' ');
  for (const t of ['3 days · 4 stalls', 'A few minutes. Beat your best.', 'Retry as often as you like.', 'The week counts your best 5 days.', 'Ranked by final cash, then by fruit sold.']) {
    if (!intro.toLowerCase().includes(t.toLowerCase())) return fail(`the Sprint intro does not say "${t}"`);
  }
  await shot('sprint-intro');
  console.log('Sprint intro: the goal, how it works, the ranking and retries');
  await page.click('[data-a="intro-start"]');
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
    // PLAN-123: the board's place is named apart from the table's ("Today's board 3rd of 12").
    if (!/Today's board \d+(st|nd|rd|th) of \d+/.test(place)) return fail(`no place on the board (${place})`);
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
    // PLAN-127: the top bar shows "D1"; its day pill's name is "Day 1 of 3, …"
    const again = await page.locator('.game .tk-top .tk-day').getAttribute('aria-label', { timeout: 10000 }).catch(() => '');
    if (!/^Day 1 of 3\b/.test(again ?? '')) return fail(`Try again did not start on Day 1 (${again})`);
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
