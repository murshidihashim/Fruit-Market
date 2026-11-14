// Four people in one online room (PLAN-005; rules 11: rooms hold 6): the lobby counts seats correctly (computer shops
// included), shows open seats and "Room full" once two computers fill it, a fifth person is refused, and all six stalls reach the game.
// Usage: node scripts/e2e-four.cjs <base-url> <screenshot-dir>
const { chromium } = require('playwright');
const { saveDiagnostics } = require('./e2e-diagnostics.cjs');

const [base = 'http://127.0.0.1:8787', out = '.'] = process.argv.slice(2);
const players = [];
const expect = (ok, what) => { if (!ok) throw new Error(`expected ${what}`); };

(async () => {
  const browser = await chromium.launch();
  const join = async (name) => {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
    await ctx.addInitScript((n) => { localStorage.setItem('fm.name', n); localStorage.setItem('fm.settings', JSON.stringify({ sound: false, haptics: false, fast: true, analytics: false })); }, name);
    const page = await ctx.newPage();
    const P = { tag: name, page, frames: [], errors: [], consoleLog: [] };
    page.on('pageerror', (e) => P.errors.push(String(e)));
    page.on('websocket', (ws) => ws.on('framereceived', (f) => P.frames.push(typeof f.payload === 'string' ? f.payload : '')));
    players.push(P);
    return P;
  };
  const host = await join('Ann');
  const lobby = async () => ({
    heading: (await host.page.locator('h3:has-text("Players")').innerText()).trim(),
    open: await host.page.locator('.open-seat').count(),
    full: await host.page.locator('.room-full').count(),
  });
  const settle = () => host.page.waitForTimeout(400);

  await host.page.goto(base);
  await host.page.click('text=Play a friend'); await host.page.click('text=Create a room');
  await host.page.click('text=Create room');
  await host.page.waitForSelector('#invite-link');
  const link = await host.page.inputValue('#invite-link');
  let l = await lobby();
  expect(l.heading === 'Players 1 of 6' && l.open === 5 && !l.full, `1 of 6 with 5 open seats, got ${JSON.stringify(l)}`);
  expect(await host.page.locator('text=Invite friends (up to 5)').count() === 1, '"Invite friends (up to 5)"');
  await host.page.screenshot({ path: `${out}/four-1-lobby.png` });

  const others = [];
  for (const name of ['Ben', 'Cik', 'Dan']) {
    const P = await join(name);
    await P.page.goto(link);
    await P.page.click('text=Join the game');
    await host.page.waitForSelector(`text=${name}`);
    others.push(P);
    if (name === 'Ben') {
      // Computer shops take seats: 2 people + 1 computer = 3 of 4, one open seat.
      await settle();
      await host.page.click('button:text-is("+1 computer")');
      await settle();
      l = await lobby();
      expect(l.heading === 'Players 3 of 6' && l.open === 3, `3 of 6 with 3 open seats after +1 computer, got ${JSON.stringify(l)}`);
      expect(await host.page.locator('text=Invite friends (up to 4)').count() === 1, '"Invite friends (up to 4)" with one computer shop');
      await host.page.click('button:text-is("None")');
      await settle();
    }
  }
  await settle();
  await host.page.click('button:text-is("+2 computer")');
  await settle();
  l = await lobby();
  expect(l.heading === 'Players 6 of 6' && l.open === 0 && l.full === 1, `6 of 6, no open seats, "Room full", got ${JSON.stringify(l)}`);
  await host.page.screenshot({ path: `${out}/four-2-full.png`, fullPage: true });

  const fifth = await join('Eve');
  await fifth.page.goto(link);
  await fifth.page.click('text=Join the game');
  await fifth.page.waitForSelector('text=This room is full', { timeout: 10000 });

  for (const P of [host, ...others]) await P.page.click("text=I'm ready");
  await host.page.click('text=Start the game');
  await Promise.all([host, ...others].map((P) => P.page.waitForSelector('.market-stall', { timeout: 20000 })));
  const rivals = await host.page.locator('.rv-chip').count();
  expect(rivals === 5, `5 rivals in the game, got ${rivals}`);
  await host.page.screenshot({ path: `${out}/four-3-game.png` });
  console.log('four players + 2 computers: lobby counts OK (1→3 with a computer→6, Room full), 5th person refused, all 6 stalls in the game');
  await browser.close();
})().catch(async (e) => {
  console.error('FAIL', e.message.split('\n')[0]);
  await saveDiagnostics(players, out, 'four');
  process.exit(1);
});
