// Performance and usability budget for a phone-sized screen, with the CPU slowed 4x (a low-end phone).
// Plays a full solo game and checks:
//   - DOM size on the game screen        (fails above MAX_DOM)
//   - main-thread long tasks during play  (fails if any is longer than MAX_TASK_MS)
//   - the one-off task that opens the game screen (fails above MAX_ENTRY_MS)
//   - tap targets smaller than MIN_TAP px on the buy, price and evening screens, by the area a tap reaches
//     (reported; set STRICT_TAP=1 to fail on them)
//   - smoothness: slow frames while the rush and the night play, the two beats with the most on the move
//     (a frame is slow when it took longer than SLOW_FRAME_MS; fails above MAX_SLOW_FRAMES in a hundred)
// Usage: npm run build:single && node scripts/perf-budget.cjs dist-single/index.html
const { chromium } = require('playwright');
const path = require('path');

const MAX_DOM = Number(process.env.MAX_DOM ?? 800);
const MAX_TASK_MS = Number(process.env.MAX_TASK_MS ?? 200);
const MAX_ENTRY_MS = Number(process.env.MAX_ENTRY_MS ?? 350);
const MIN_TAP = Number(process.env.MIN_TAP ?? 40);
// A frame should take 17 ms; one that takes over 50 ms (three frames' worth) is seen as a stutter.
const SLOW_FRAME_MS = Number(process.env.SLOW_FRAME_MS ?? 50);
// Slow frames allowed in every hundred drawn during the rush and the night. Measured when this check was added
// (PLAN-083, about 6,000 frames a game): 0.15 to 0.36 in a hundred, and 0.5 to 0.6 with the processor slowed six
// times instead of four. The limit is five times the worst of those runs: it is there to catch an animation that
// stutters all the way through, not one more slow frame.
const MAX_SLOW_FRAMES = Number(process.env.MAX_SLOW_FRAMES ?? 2);

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
    localStorage.setItem('fm.tutorial', JSON.stringify(['trait', 'morning', 'buy', 'bought', 'stall', 'bid', 'reveal', 'evening', 'day2']));
    window.__long = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push([Math.round(e.duration), e.startTime]))).observe({ type: 'longtask', buffered: true });
    // Smoothness: how long every frame took while the rush plays (from the bell to the takings: the round table says
    // it is playing with data-busy for exactly that long while the game is at the rush, PLAN-099) and while the night
    // plays. A frame is only counted when the one before it was in the same beat, so the time before a beat is not
    // charged to its first frame.
    window.__frames = { rush: [], night: [] };
    window.__beatDom = 0;
    window.__beat = () => {
      const g = document.querySelector('.game');
      if (!g) return null;
      if (g.classList.contains('is-night')) return 'night';
      return g.classList.contains('ph-reveal') && document.querySelector('.rush-table[data-busy]') ? 'rush' : null;
    };
    let last = 0, was = null;
    const frame = (t) => {
      const beat = window.__beat();
      if (beat && beat === was) window.__frames[beat].push(Math.round((t - last) * 10) / 10);
      if (beat) window.__beatDom = Math.max(window.__beatDom, document.getElementsByTagName('*').length);
      was = beat;
      last = t;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.goto('file://' + file);
  await p.waitForSelector('text=New game');

  // A control whose box is under MIN_TAP is listed with its box and its touch area: how far from its middle a tap still
  // lands on it (or on something inside it), found by asking the page what lies under each point. The touch area counts
  // an unseen area laid over the control (a ::before or ::after, PLAN-090 and PLAN-096) and leaves out any part that
  // something else covers. STRICT_TAP fails on touch areas under MIN_TAP. The page is given a moment between controls,
  // so the looking adds no long task of its own.
  const small = async () => p.evaluate(async (min) => {
    const out = [];
    const all = [...document.querySelectorAll('button:not([disabled]), [role=button], input, a')]
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && Math.min(r.width, r.height) < min && e.type !== 'checkbox'; });
    for (const e of all) {
      const r = e.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const on = (dx, dy) => { const t = document.elementFromPoint(x + dx, y + dy); return !!t && (t === e || e.contains(t)); };
      const reach = (dx, dy) => { let n = 0; while (n < min && on(dx * (n + 1), dy * (n + 1))) n++; return n; };
      const w = on(0, 0) ? reach(-1, 0) + reach(1, 0) + 1 : 0;
      const h = on(0, 0) ? reach(0, -1) + reach(0, 1) + 1 : 0;
      out.push({ name: `${String(e.className || e.tagName).split(' ')[0]} ${Math.round(r.width)}x${Math.round(r.height)} (touch ${w}x${h})`, under: Math.min(w, h) < min });
      await new Promise((ok) => setTimeout(ok, 0));
    }
    return out;
  }, MIN_TAP);
  const domCount = () => p.evaluate(() => document.querySelectorAll('*').length);

  await p.click('text=New game');
  await p.waitForTimeout(1500); // a player spends a moment choosing options on the setup screen
  await p.evaluate(() => { window.__entry = performance.now(); });
  await p.click('text=Start game');
  const taps = {};
  let maxDom = 0;
  for (let i = 0; i < 3000; i++) {
    try {
      if (await p.locator('.results').count()) break;
      // While the rush or the night plays there is nothing to press: the script keeps its hands off the page, so the
      // frames counted are the game's own and not this script's looking. The page notes its own size meanwhile.
      if (await p.evaluate(() => window.__beat())) { await p.waitForFunction(() => !window.__beat(), null, { polling: 200, timeout: 120000 }); continue; }
      maxDom = Math.max(maxDom, await domCount());
      if (await p.locator('.trait-card').count()) { await p.click('.trait-card'); continue; }
      if (await p.locator('text=Start buying').count()) { await p.click('text=Start buying'); continue; }
      if (await p.locator('text=/Done buying|Skip buying/').count()) {
        taps.buy ??= await small();
        const t = p.locator('.mk-cell.pick');
        if (await t.count() && Math.random() < 0.7) { await t.first().click(); continue; }
        await p.click('text=/Done buying|Skip buying/'); continue;
      }
      // "The Bell" pop-up opens by itself on Day 1 (PLAN-059): close it before pricing.
      if (await p.locator('.bell-notice').count()) { await p.click('.bell-notice .btn'); continue; }
      // Fill your stall starts empty (PLAN-061): add every piece you can before opening.
      if (await p.locator('.stall-panel .mini-step button:last-child:not([disabled])').count()) { await p.locator('.stall-panel .mini-step button:last-child:not([disabled])').first().click(); continue; }
      if (await p.locator('.pp-lock .btn:not([disabled])').count()) { taps.price ??= await small(); await p.click('.pp-lock .btn:not([disabled])'); continue; }
      if (await p.locator('text=Lights out').count()) { taps.evening ??= await small(); await p.click('text=Lights out'); continue; }
      for (const t of ['Close for the day', 'See results']) if (await p.locator(`text=${t}`).count()) { await p.click(`text=${t}`); break; }
      await p.waitForTimeout(100);
    } catch { await p.waitForTimeout(150); }
  }
  const finished = (await p.locator('.results').count()) > 0;
  const { all, entry, frames, beatDom } = await p.evaluate(() => ({ all: window.__long, entry: window.__entry, frames: window.__frames, beatDom: window.__beatDom }));
  await b.close();
  maxDom = Math.max(maxDom, beatDom);

  // Tasks in the first 1.5 s after "Start game" belong to opening the game screen.
  const entryTasks = all.filter(([, t]) => t >= entry && t < entry + 1500).map(([d]) => d);
  const long = all.filter(([, t]) => t >= entry + 1500).map(([d]) => d);
  const longest = Math.max(0, ...long);
  const entryMs = Math.max(0, ...entryTasks);
  const tapCount = Object.values(taps).reduce((a, x) => a + x.filter((t) => t.under).length, 0);
  const slow = (list) => list.filter((ms) => ms > SLOW_FRAME_MS).length;
  const drawn = frames.rush.length + frames.night.length;
  const slowFrames = slow(frames.rush) + slow(frames.night);
  const slowPer100 = drawn ? Math.round(slowFrames / drawn * 10000) / 100 : 0;
  const report = {
    finished, errors,
    maxDomOnGameScreen: maxDom, domBudget: MAX_DOM,
    openGameScreenMs: entryMs, entryBudgetMs: MAX_ENTRY_MS,
    longTasks: long.length, longestTaskMs: longest, over200ms: long.filter((x) => x > 200).length, taskBudgetMs: MAX_TASK_MS,
    p95TaskMs: long.length ? [...long].sort((a, z) => a - z)[Math.floor(long.length * 0.95)] : 0,
    slowFrames, slowFramesPer100: slowPer100, slowFrameMs: SLOW_FRAME_MS, slowFrameBudgetPer100: MAX_SLOW_FRAMES,
    rush: { frames: frames.rush.length, slow: slow(frames.rush), longestMs: Math.max(0, ...frames.rush) },
    night: { frames: frames.night.length, slow: slow(frames.night), longestMs: Math.max(0, ...frames.night) },
    smallTapTargets: Object.fromEntries(Object.entries(taps).map(([k, v]) => [k, [...new Set(v.filter((t) => t.under).map((t) => t.name))]])),
    smallBoxesWithTouchArea: Object.fromEntries(Object.entries(taps).map(([k, v]) => [k, [...new Set(v.filter((t) => !t.under).map((t) => t.name))]])),
  };
  console.log(JSON.stringify(report, null, 1));
  const fails = [];
  if (!finished) fails.push('game did not finish');
  if (errors.length) fails.push('page errors');
  if (maxDom > MAX_DOM) fails.push(`DOM ${maxDom} > ${MAX_DOM}`);
  if (longest > MAX_TASK_MS) fails.push(`long task ${longest} ms > ${MAX_TASK_MS} ms`);
  if (entryMs > MAX_ENTRY_MS) fails.push(`opening the game screen took ${entryMs} ms > ${MAX_ENTRY_MS} ms`);
  if (!frames.rush.length || !frames.night.length) fails.push('no frames were measured in the rush or in the night');
  if (slowPer100 > MAX_SLOW_FRAMES) fails.push(`${slowFrames} slow frames of ${drawn} in the rush and the night (${slowPer100} in a hundred > ${MAX_SLOW_FRAMES})`);
  if (process.env.STRICT_TAP && tapCount) fails.push(`${tapCount} tap targets under ${MIN_TAP}px`);
  console.log(fails.length ? `BUDGET FAILED: ${fails.join('; ')}` : 'BUDGET OK');
  process.exit(fails.length ? 1 : 0);
})();
