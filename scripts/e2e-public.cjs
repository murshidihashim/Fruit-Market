// PLAN-112: a public room and preset reactions, with two independent browsers through the real server.
// A makes a public room; B finds it in the Public rooms list and joins it; both send a reaction and see the other's
// bubble, in the lobby and in the game. Every frame B receives is checked: a reaction carries only its seat and id,
// and nothing secret reaches a phone (the same checks as the online match).
// Usage: node scripts/e2e-public.cjs <base-url> <screenshot-dir>
const { chromium } = require('playwright');
const { saveDiagnostics } = require('./e2e-diagnostics.cjs');
const { pickShopkeeper } = require('./e2e-pick.cjs');
const players = [];
const [base = 'http://127.0.0.1:8787', out = '.'] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch();
  const mk = async (tag, name) => {
    const ctx = await browser.newContext({ viewport: { width: 400, height: 820 }, deviceScaleFactor: 1 });
    await ctx.addInitScript((n) => {
      localStorage.setItem('fm.settings', JSON.stringify({ sound: false, haptics: false, fast: true, analytics: false }));
      localStorage.setItem('fm.name', n);
      localStorage.setItem('fm.firstTimeDone', '1');
    }, name);
    const page = await ctx.newPage();
    const P = { page, frames: [], sent: [], errors: [], consoleLog: [], tag, ctx };
    page.on('pageerror', (e) => P.errors.push(`${tag}: ${e}`));
    page.on('console', (m) => P.consoleLog.push(`${m.type()}: ${m.text()}`));
    page.on('websocket', (ws) => {
      ws.on('framereceived', (f) => P.frames.push(typeof f.payload === 'string' ? f.payload : ''));
      ws.on('framesent', (f) => P.sent.push(typeof f.payload === 'string' ? f.payload : ''));
    });
    players.push(P);
    await page.goto(base);
    await page.click('[data-a="play"]');
    await page.click('[data-a="public"]');
    return P;
  };
  const shot = (P, n) => P.page.screenshot({ path: `${out}/${n}.png` });
  const react = async (P, choice) => {
    await P.page.click('[data-a="react"]');
    await P.page.click(`.rx-choice${choice}`);
  };

  // A makes a public room.
  const A = await mk('A', 'Aisha');
  // The Play menu's Public rooms opens with Public chosen (PLAN-113).
  await A.page.click('.room-kind button[aria-pressed="true"]:has-text("Public")');
  await A.page.click('button:has-text("Create room")');
  await A.page.waitForSelector('.public-note');
  const code = (await A.page.locator('.room-code').innerText()).replace(/\s/g, '');
  await shot(A, 'p1-public-lobby');

  // B finds it in the list and joins from there.
  const B = await mk('B', 'Ben');
  const row = B.page.locator(`.pr-row[data-code="${code}"]`);
  await row.waitFor({ timeout: 20000 });
  console.log('public list on B:', (await row.innerText()).replace(/\s+/g, ' '));
  await shot(B, 'p2-public-list');
  await row.locator('button:has-text("Join")').click();
  await B.page.waitForSelector('text=Ben (you)');
  await A.page.waitForSelector('.seat-row[data-seat="1"]');

  // Reactions in the lobby: each sees the other's bubble over their row.
  await react(A, ':has-text("Good luck")');
  await B.page.waitForSelector('.rx-bubble[aria-label="Aisha: Good luck"]', { timeout: 5000 });
  await shot(B, 'p3-lobby-bubble');
  await react(B, '[aria-label="Clap"]');
  await A.page.waitForSelector('.rx-bubble[aria-label="Ben: Clap"]', { timeout: 5000 });
  console.log('lobby reactions: both seen');

  // PLAN-116 (REP-133 B-04): keyboard focus stays inside a pop-up (here the reactions); Escape closes it.
  await A.page.waitForTimeout(2100);
  await A.page.click('[data-a="react"]');
  for (let i = 0; i < 16; i++) {
    await A.page.keyboard.press(i < 12 ? 'Tab' : 'Shift+Tab');
    if (!(await A.page.evaluate(() => !!document.activeElement?.closest('.popup')))) throw new Error(`focus left the reaction pop-up after ${i + 1} key presses`);
  }
  await A.page.keyboard.press('Escape');
  await A.page.waitForSelector('.rx-pick', { state: 'detached', timeout: 2000 });
  console.log('reaction pop-up keeps focus; Escape closes it');

  // Once started, the room leaves the list.
  await A.page.click(`button:has-text("I'm ready")`);
  await B.page.click(`button:has-text("I'm ready")`);
  await A.page.click('button:has-text("Start the game")');
  await Promise.all([pickShopkeeper(A), pickShopkeeper(B)]);
  await Promise.all([A.page.waitForSelector('.market-stall'), B.page.waitForSelector('.market-stall')]);
  const listed = await A.page.evaluate(async (b) => (await (await fetch(`${b}/api/public`)).json()).rooms.map((r) => r.code), base);
  if (listed.includes(code)) throw new Error('a started room is still in the public list');
  console.log('started room is off the list');

  // Reactions in the game, over the stalls.
  await A.page.waitForTimeout(2100); // one reaction every 2 s per seat
  await react(A, '[aria-label="Thumbs up"]');
  await B.page.waitForSelector('.rx-bubble[aria-label="Aisha: Thumbs up"]', { timeout: 5000 });
  await B.page.waitForTimeout(2100);
  await react(B, ':has-text("Well played")');
  await A.page.waitForSelector('.rx-bubble[aria-label="Ben: Well played"]', { timeout: 5000 });
  await shot(A, 'p4-game-bubble');
  console.log('game reactions: both seen');

  // PLAN-116 (REP-133 B-02, B-03): in the game the reaction button covers no box of the market and takes 44 px of taps;
  // (B-09) "Stay in the match" closes the menu at once.
  const rx = await A.page.evaluate(() => {
    const el = document.querySelector('[data-a="react"]');
    if (!el) return null;
    const b = el.getBoundingClientRect();
    const covers = [...document.querySelectorAll('.tb-box, .tb-lh')].filter((e) => { const r = e.getBoundingClientRect(); return r.left < b.right && b.left < r.right && r.top < b.bottom && b.top < r.bottom; }).length;
    const x = b.left + b.width / 2, y = b.top + b.height / 2;
    const on = (dx, dy) => { const t = document.elementFromPoint(x + dx, y + dy); return !!t && (t === el || el.contains(t)); };
    return { covers, wide: on(-22, 0) && on(21, 0), tall: on(0, -22) && on(0, 21) };
  });
  if (rx && (rx.covers || !rx.wide || !rx.tall)) throw new Error(`the reaction button in the game: ${JSON.stringify(rx)}`);
  await A.page.click('.tk-menu');
  await A.page.click('.game-menu button:has-text("Home")');
  await A.page.click('.game-menu button:has-text("Stay in the match")');
  await A.page.waitForSelector('.game-menu', { state: 'detached', timeout: 2000 });
  console.log(`game reaction button clear of the market (${rx ? 'checked' : 'not shown at this step'}); Stay in the match closes the menu`);

  // What travelled: a reaction message carries its id only, and comes back as {t, seat, r} only.
  const parse = (list) => list.map((f) => { try { return JSON.parse(f); } catch { return null; } }).filter(Boolean);
  let leaks = 0;
  for (const P of [A, B]) {
    for (const m of parse(P.sent).filter((m) => m.t === 'react')) if (Object.keys(m).sort().join() !== 'r,t') leaks++;
    for (const m of parse(P.frames)) {
      if (m.t === 'react' && Object.keys(m).sort().join() !== 'r,seat,t') leaks++;
      if (m.t !== 'room' || !m.game) continue;
      const g = m.game;
      if (g.rng !== 0 || g.customerDeck.length || g.eventDeck.length) leaks++;
      if (g.phase === 'bid' && g.bids.some((x) => x !== null)) leaks++;
      if (g.phase === 'stall' && g.stalls.some((x) => x !== null)) leaks++;
      if (JSON.stringify(m).includes('"pending"')) leaks++;
    }
  }
  const reacts = [A, B].map((P) => parse(P.frames).filter((m) => m.t === 'react').length);
  console.log('reaction frames received A/B:', reacts.join('/'), '| leaks:', leaks);
  const errors = [...A.errors, ...B.errors];
  console.log('page errors:', errors);
  if (leaks || errors.length) throw new Error(`leaks ${leaks}, page errors ${errors.length}`);
  await browser.close();
})().catch(async (e) => {
  console.error('FAIL', e.message);
  await saveDiagnostics(players, out, 'public');
  process.exit(1);
});
