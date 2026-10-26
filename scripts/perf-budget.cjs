// Performance and usability budget for a phone-sized screen, with the CPU slowed 4x (a low-end phone).
// Plays a full solo game and checks:
//   - DOM size on the game screen        (fails above MAX_DOM)
//   - main-thread long tasks during play  (fails if any is longer than MAX_TASK_MS)
//   - the one-off task that opens the game screen (fails above MAX_ENTRY_MS)
//   - tap targets smaller than MIN_TAP px on the buy, price and evening screens
//     (reported; set STRICT_TAP=1 to fail on them)
// Usage: npm run build:single && node scripts/perf-budget.cjs dist-single/index.html
const { chromium } = require('playwright');
const path = require('path');

const MAX_DOM = Number(process.env.MAX_DOM ?? 800);
const MAX_TASK_MS = Number(process.env.MAX_TASK_MS ?? 200);
const MAX_ENTRY_MS = Number(process.env.MAX_ENTRY_MS ?? 350);
const MIN_TAP = Number(process.env.MIN_TAP ?? 40);

(async () => {
  const file = path.resolve(process.argv[2] ?? 'dist-single/index.html');
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  await p.addInitScript(() => {
    let seed = 777;
    Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
    localStorage.setItem('fm.settings', JSON.stringify({ sound: false, haptics: false, fast: true, analytics: false }));
    localStorage.setItem('fm.tutorial', JSON.stringify(['trait', 'morning', 'buy', 'bought', 'bid', 'reveal', 'evening', 'day2']));
    window.__long = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push([Math.round(e.duration), e.startTime]))).observe({ type: 'longtask', buffered: true });
  });
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.goto('file://' + file);
  await p.waitForSelector('text=New game');

  const small = async () => p.evaluate((min) => [...document.querySelectorAll('button:not([disabled]), [role=button], input, a')]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && Math.min(r.width, r.height) < min && e.type !== 'checkbox'; })
    .map((e) => `${String(e.className || e.tagName).split(' ')[0]} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`), MIN_TAP);
  const domCount = () => p.evaluate(() => document.querySelectorAll('*').length);

  await p.click('text=New game');
  await p.waitForTimeout(1500); // a player spends a moment choosing options on the setup screen
  await p.evaluate(() => { window.__entry = performance.now(); });
  await p.click('text=Open the shops');
  const taps = {};
  let maxDom = 0;
  for (let i = 0; i < 3000; i++) {
    try {
      if (await p.locator('.results').count()) break;
      maxDom = Math.max(maxDom, await domCount());
      if (await p.locator('.trait-card').count()) { await p.click('.trait-card'); continue; }
      if (await p.locator('text=Open the market').count()) { await p.click('text=Open the market'); continue; }
      if (await p.locator('text=/Done buying|Skip buying/').count()) {
        taps.buy ??= await small();
        const t = p.locator('.mk-cell.pick');
        if (await t.count() && Math.random() < 0.7) { await t.first().click(); continue; }
        await p.click('text=/Done buying|Skip buying/'); continue;
      }
      if (await p.locator('.pp-lock .btn').count()) { taps.price ??= await small(); await p.click('.pp-lock .btn'); continue; }
      if (await p.locator('text=Lights out').count()) { taps.evening ??= await small(); await p.click('text=Lights out'); continue; }
      for (const t of ['Close for the day', 'See final results']) if (await p.locator(`text=${t}`).count()) { await p.click(`text=${t}`); break; }
      await p.waitForTimeout(100);
    } catch { await p.waitForTimeout(150); }
  }
  const finished = (await p.locator('.results').count()) > 0;
  const { all, entry } = await p.evaluate(() => ({ all: window.__long, entry: window.__entry }));
  await b.close();

  // Tasks in the first 1.5 s after "Open the shops" belong to opening the game screen.
  const entryTasks = all.filter(([, t]) => t >= entry && t < entry + 1500).map(([d]) => d);
  const long = all.filter(([, t]) => t >= entry + 1500).map(([d]) => d);
  const longest = Math.max(0, ...long);
  const entryMs = Math.max(0, ...entryTasks);
  const tapCount = Object.values(taps).reduce((a, x) => a + x.length, 0);
  const report = {
    finished, errors,
    maxDomOnGameScreen: maxDom, domBudget: MAX_DOM,
    openGameScreenMs: entryMs, entryBudgetMs: MAX_ENTRY_MS,
    longTasks: long.length, longestTaskMs: longest, over200ms: long.filter((x) => x > 200).length, taskBudgetMs: MAX_TASK_MS,
    p95TaskMs: long.length ? [...long].sort((a, z) => a - z)[Math.floor(long.length * 0.95)] : 0,
    smallTapTargets: Object.fromEntries(Object.entries(taps).map(([k, v]) => [k, [...new Set(v)]])),
  };
  console.log(JSON.stringify(report, null, 1));
  const fails = [];
  if (!finished) fails.push('game did not finish');
  if (errors.length) fails.push('page errors');
  if (maxDom > MAX_DOM) fails.push(`DOM ${maxDom} > ${MAX_DOM}`);
  if (longest > MAX_TASK_MS) fails.push(`long task ${longest} ms > ${MAX_TASK_MS} ms`);
  if (entryMs > MAX_ENTRY_MS) fails.push(`opening the game screen took ${entryMs} ms > ${MAX_ENTRY_MS} ms`);
  if (process.env.STRICT_TAP && tapCount) fails.push(`${tapCount} tap targets under ${MIN_TAP}px`);
  console.log(fails.length ? `BUDGET FAILED: ${fails.join('; ')}` : 'BUDGET OK');
  process.exit(fails.length ? 1 : 0);
})();
