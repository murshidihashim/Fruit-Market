// Two independent browsers play a full online match through the real server.
// Usage: node scripts/e2e-online.cjs <base-url> <screenshot-dir>
const { chromium } = require('playwright');
const { saveDiagnostics } = require('./e2e-diagnostics.cjs');
const players = [];
const [base = 'http://127.0.0.1:8787', out = '.'] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch();
  const mk = async (tag) => {
    const ctx = await browser.newContext({ viewport: { width: 400, height: 820 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => localStorage.setItem('fm.settings', JSON.stringify({ sound: false, haptics: false, fast: true })));
    const page = await ctx.newPage();
    const frames = [];
    const errors = [];
    const consoleLog = [];
    page.on('pageerror', (e) => errors.push(`${tag}: ${e}`));
    page.on('console', (m) => consoleLog.push(`${m.type()}: ${m.text()}`));
    page.on('websocket', (ws) => ws.on('framereceived', (f) => frames.push(typeof f.payload === 'string' ? f.payload : '')));
    const P = { page, frames, errors, consoleLog, tag, ctx };
    players.push(P);
    return P;
  };
  const A = await mk('A');
  const B = await mk('B');
  const shot = (p, n) => p.page.screenshot({ path: `${out}/${n}.png` });

  await A.page.goto(base);
  await A.page.click('button:has-text("Play a friend")'); await A.page.click('button:has-text("Create a room")');
  await A.page.fill('#online-name', 'Murshidi');
  await A.page.click('button:has-text("Create room")');
  await A.page.waitForSelector('#invite-link');
  const link = await A.page.inputValue('#invite-link');
  await shot(A, '01-lobby-host');
  console.log('invite link', link);

  await B.page.goto(link);
  await B.page.fill('#online-name', 'London Friend');
  await B.page.click('button:has-text("Join the game")');
  await B.page.waitForSelector('text=London Friend (you)');
  await A.page.waitForSelector('text=London Friend');
  await A.page.click(`button:has-text("I'm ready")`);
  await B.page.click(`button:has-text("I'm ready")`);
  await shot(B, '02-lobby-guest');
  await A.page.waitForSelector('button:has-text("Start the match")');
  await A.page.click('button:has-text("Start the match")');
  await Promise.all([A.page.waitForSelector('.market-stall'), B.page.waitForSelector('.market-stall')]);
  console.log('match started on both devices');

  // Each device plays its own seat.
  const once = new Set();
  let refreshed = false;
  const step = async (P) => {
    const p = P.page;
    const has = async (sel) => (await p.locator(sel).count()) > 0;
    if (await has('.results')) return 'done';
    if (await has('.trait-card')) { await p.click('.trait-card'); return 'moved'; }
    if (await has('button:has-text("Start buying")')) { await p.click('button:has-text("Start buying")'); return 'moved'; }
    if (await has('button:has-text("Done buying"), button:has-text("Skip buying")')) {
      const c = p.locator('.mk-cell.pick');
      if ((await c.count()) && Math.random() < 0.6) { await c.first().click(); await p.waitForTimeout(250); return 'moved'; }
      await p.click('button:has-text("Done buying"), button:has-text("Skip buying")'); return 'moved';
    }
    // "The Bell" pop-up opens by itself on Day 1 (PLAN-059): close it before pricing.
    if (await p.locator('.bell-notice').count()) { await p.click('.bell-notice .btn'); return 'moved'; }
    // Fill your stall starts empty (PLAN-061): add every piece you can before opening.
    if (await p.locator('.stall-panel .mini-step button:last-child:not([disabled])').count()) { await p.locator('.stall-panel .mini-step button:last-child:not([disabled])').first().click(); return 'moved'; }
    if (await has('.pp-lock .btn:not([disabled])')) {
      if (!once.has(`tray-${P.tag}`)) { once.add(`tray-${P.tag}`); await shot(P, `03-pricing-${P.tag}`); }
      await p.click('.pp-lock .btn:not([disabled])'); return 'moved';
    }
    if (await has('button:has-text("Lights out")')) { await p.click('button:has-text("Lights out")'); return 'moved'; }
    for (const t of ['Close for the day', 'See results']) if (await has(`button:has-text("${t}")`)) { await p.click(`button:has-text("${t}")`); return 'moved'; }
    if (await has('.waiting-dots') && !once.has(`wait-${P.tag}`)) { once.add(`wait-${P.tag}`); await shot(P, `04-waiting-${P.tag}`); }
    return 'idle';
  };

  const deadline = Date.now() + (+process.env.E2E_MINUTES || 9) * 60 * 1000;
  let lastShot = Date.now();
  let done = 0;
  while (Date.now() < deadline) {
    const [ra, rb] = [await step(A).catch(() => 'err'), await step(B).catch(() => 'err')];
    if (ra === 'done' && rb === 'done') { done = 1; break; }
    // Mid-game refresh on device A: the match must come back.
    if (!refreshed && (await A.page.locator('.topbar .day-label').textContent().catch(() => '') || '').toUpperCase().includes('DAY 2')) {
      refreshed = true;
      await A.page.reload();
      await A.page.waitForSelector('.market-stall', { timeout: 20000 });
      console.log('A refreshed and is back at', await A.page.locator('.topbar .day-label').textContent());
      await shot(A, '05-after-refresh');
    }
    if (process.env.E2E_DEBUG && Date.now() - lastShot > 30000) { lastShot = Date.now(); await shot(A, `dbg-A-${lastShot}`); await shot(B, `dbg-B-${lastShot}`); }
    await A.page.waitForTimeout(150);
  }
  await shot(A, '06-results-A');
  await shot(B, '06-results-B');

  // Secrecy: every frame hides crates and prices until all shops commit, and face-down walk-ins.
  const views = (P) => P.frames.map((f) => { try { return JSON.parse(f); } catch { return null; } }).filter((m) => m && m.t === 'room' && m.game);
  let leaks = 0, bidFrames = 0;
  for (const P of [A, B]) for (const v of views(P)) {
    if (v.game.rng !== 0 || v.game.customerDeck.length || v.game.eventDeck.length) leaks++;
    if (v.game.phase === 'bid') { bidFrames++; if (v.game.bids.some((b) => b !== null)) leaks++; }
    if (v.game.phase === 'stall') { bidFrames++; if (v.game.stalls.some((x) => x !== null)) leaks++; }
    // Face-down walk-ins: only the fruit shows unless this seat heard the gossip.
    for (const c of v.game.queue ?? []) if (c.walkIn && !(c.seenBy ?? []).includes(v.you) && c.wants.some((w) => w.qty || w.max)) leaks++;
    if (JSON.stringify(v).includes('"pending"')) leaks++;
  }
  const lastA = views(A).at(-1), lastB = views(B).at(-1);
  const cashA = lastA.game.players.map((p) => p.cash), cashB = lastB.game.players.map((p) => p.cash);
  console.log('finished:', !!done, '| frames checked during pricing:', bidFrames, '| leaks:', leaks);
  console.log('final cash A view', cashA, 'B view', cashB, 'same:', JSON.stringify(cashA) === JSON.stringify(cashB), '| versions', lastA.version, lastB.version);

  // Rematch without a new invitation.
  if (done) {
    // The button, not the note: "… wants a rematch." holds the same word.
    await A.page.click('button:has-text("Rematch")');
    await B.page.waitForSelector('.rematch-note:has-text("wants a rematch")');
    await B.page.click('button:has-text("Rematch")');
    await Promise.all([A.page.waitForSelector('.market-stall'), B.page.waitForSelector('.market-stall')]);
    console.log('rematch started: A', await A.page.locator('.topbar .day-label').textContent(), 'B', await B.page.locator('.topbar .day-label').textContent());

    // B closes the app mid-match. A must see a countdown, then a computer takes B's seat and A can finish.
    if (!process.env.E2E_SKIP_ABANDON) {
      await B.ctx.close();
      await A.page.waitForSelector('text=/takes over in/', { timeout: 15000 });
      await shot(A, '07-takeover-countdown');
      const until = Date.now() + 5 * 60 * 1000;
      let finished = false, sawBot = false;
      while (Date.now() < until) {
        if (!sawBot && (await A.page.locator('text=/A computer is playing for/').count())) { sawBot = true; await shot(A, '08-computer-playing'); }
        if ((await step(A).catch(() => 'err')) === 'done') { finished = true; break; }
        await A.page.waitForTimeout(150);
      }
      console.log('abandoned match: computer took over:', sawBot, '| A finished alone:', finished);
    }
  }
  console.log('page errors:', [...A.errors, ...B.errors]);
  await browser.close();
})().catch(async (e) => {
  console.error('FAIL', e.message);
  await saveDiagnostics(players, out, 'online');
  process.exit(1);
});
