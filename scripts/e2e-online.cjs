// Two independent browsers play a full online match through the real server.
// Usage: node scripts/e2e-online.cjs <base-url> <screenshot-dir>
const { chromium } = require('playwright');
(async () => {
  const [base = 'http://127.0.0.1:8787', out = '.'] = process.argv.slice(2);
  const browser = await chromium.launch();
  const mk = async (tag) => {
    const ctx = await browser.newContext({ viewport: { width: 400, height: 820 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => localStorage.setItem('fm.settings', JSON.stringify({ sound: false, haptics: false, fast: true })));
    const page = await ctx.newPage();
    const frames = [];
    const errors = [];
    page.on('pageerror', (e) => errors.push(`${tag}: ${e}`));
    page.on('websocket', (ws) => ws.on('framereceived', (f) => frames.push(typeof f.payload === 'string' ? f.payload : '')));
    return { page, frames, errors, tag };
  };
  const A = await mk('A');
  const B = await mk('B');
  const shot = (p, n) => p.page.screenshot({ path: `${out}/${n}.png` });

  await A.page.goto(base);
  await A.page.click('text=Play online with a friend');
  await A.page.fill('#online-name', 'Murshidi');
  await A.page.click('text=Create room');
  await A.page.waitForSelector('#invite-link');
  const link = await A.page.inputValue('#invite-link');
  await shot(A, '01-lobby-host');
  console.log('invite link', link);

  await B.page.goto(link);
  await B.page.fill('#online-name', 'London Friend');
  await B.page.click('text=Join the game');
  await B.page.waitForSelector('text=London Friend (you)');
  await A.page.waitForSelector('text=London Friend');
  await A.page.click("text=I'm ready");
  await B.page.click("text=I'm ready");
  await shot(B, '02-lobby-guest');
  await A.page.waitForSelector('text=Start the match');
  await A.page.click('text=Start the match');
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
    if (await has('text=Open the market')) { await p.click('text=Open the market'); return 'moved'; }
    if (await has('text=/Done buying|Skip buying/')) {
      const c = p.locator('.mk-cell.pick');
      if ((await c.count()) && Math.random() < 0.6) { await c.first().click(); await p.waitForTimeout(250); return 'moved'; }
      await p.click('text=/Done buying|Skip buying/'); return 'moved';
    }
    if (await has('.pp-lock .btn')) {
      if (!once.has(`tray-${P.tag}`)) { once.add(`tray-${P.tag}`); await shot(P, `03-pricing-${P.tag}`); }
      await p.click('.pp-lock .btn'); return 'moved';
    }
    if (await has('text=Lights out')) { await p.click('text=Lights out'); return 'moved'; }
    for (const t of ['Close for the day', 'See final results']) if (await has(`text=${t}`)) { await p.click(`text=${t}`); return 'moved'; }
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

  // Secrecy: every frame B received while prices were being set hides all prices.
  const views = (P) => P.frames.map((f) => { try { return JSON.parse(f); } catch { return null; } }).filter((m) => m && m.t === 'room' && m.game);
  let leaks = 0, bidFrames = 0;
  for (const P of [A, B]) for (const v of views(P)) {
    if (v.game.rng !== 0 || v.game.customerDeck.length || v.game.eventDeck.length) leaks++;
    if (v.game.phase === 'bid') { bidFrames++; if (v.game.bids.some((b) => b !== null)) leaks++; }
    if (JSON.stringify(v).includes('"pending"')) leaks++;
  }
  const lastA = views(A).at(-1), lastB = views(B).at(-1);
  const cashA = lastA.game.players.map((p) => p.cash), cashB = lastB.game.players.map((p) => p.cash);
  console.log('finished:', !!done, '| frames checked during pricing:', bidFrames, '| leaks:', leaks);
  console.log('final cash A view', cashA, 'B view', cashB, 'same:', JSON.stringify(cashA) === JSON.stringify(cashB), '| versions', lastA.version, lastB.version);

  // Rematch without a new invitation.
  if (done) {
    await A.page.click('text=/Rematch!|Defend your title/');
    await B.page.waitForSelector('text=wants a rematch');
    await B.page.click('text=/Rematch!|Defend your title/');
    await Promise.all([A.page.waitForSelector('.market-stall'), B.page.waitForSelector('.market-stall')]);
    console.log('rematch started: A', await A.page.locator('.topbar .day-label').textContent(), 'B', await B.page.locator('.topbar .day-label').textContent());
  }
  console.log('page errors:', [...A.errors, ...B.errors]);
  await browser.close();
})();
