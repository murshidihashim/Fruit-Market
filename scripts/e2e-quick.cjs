// Quick match: two strangers search at the same time and land in the same game.
// Usage: node scripts/e2e-quick.cjs <base-url> <screenshot-dir>
const { chromium } = require('playwright');
const { saveDiagnostics } = require('./e2e-diagnostics.cjs');
let base, out;
const pages = [];
(async () => {
  base = process.argv[2] ?? "http://127.0.0.1:8787"; out = process.argv[3] ?? ".";
  const b = await chromium.launch();
  const mk = async (name) => {
    // Returns the player (page, frames, errors); the caller opens Quick Match.
    const c = await b.newContext({ viewport: { width: 400, height: 820 } });
    const p = await c.newPage();
    const P = { tag: name, page: p, frames: [], errors: [], consoleLog: [] };
    p.on('pageerror', (e) => P.errors.push(String(e)));
    p.on('console', (m) => P.consoleLog.push(`${m.type()}: ${m.text()}`));
    p.on('websocket', (ws) => ws.on('framereceived', (f) => P.frames.push(typeof f.payload === 'string' ? f.payload : '')));
    await p.addInitScript((n) => { localStorage.setItem('fm.name', n); localStorage.setItem('fm.settings', JSON.stringify({ sound: false, haptics: false, fast: true, analytics: false })); }, name);
    pages.push(P); await p.goto(base); await p.click('[data-tab="custom"]');
    // PLAN-132: Home's Match tab and its Quick Match tile; `look` presses Play, which opens the Quick Match page.
    await p.click('[data-a="way-quick"]');
    return P;
  };
  // PLAN-113: with a saved name, Quick match starts looking at once; PLAN-125's set-up page has "Find a match" first
  // (its table size starts at 2 stalls).
  const look = async (P) => {
    await P.page.click('[data-a="play"]');
    const find = P.page.getByRole('button', { name: /Find a match/i });
    await find.first().waitFor({ timeout: 5000 }).catch(() => {});
    if (await find.count().catch(() => 0)) await find.first().click();
  };
  const views = (P) => P.frames.map((f) => { try { return JSON.parse(f); } catch { return null; } }).filter((m) => m && m.t === 'room');
  const PA = await mk('Alice'); const A = PA.page; await look(PA);
  for (let i = 0; i < 100 && !views(PA).length; i++) await A.waitForTimeout(100);
  await A.waitForTimeout(500); await A.screenshot({ path: `${out}/q1-waiting.png` });
  const PB = await mk('Bob'); const B = PB.page; await look(PB);
  await Promise.all([A.waitForSelector('.market-stall', { timeout: 30000 }), B.waitForSelector('.market-stall', { timeout: 30000 })]);
  await A.waitForTimeout(800); await A.screenshot({ path: `${out}/q2-matched.png` });
  // The two strangers are in one game of two people (no computer filled in for either).
  const ga = views(PA).find((v) => v.game), gb = views(PB).find((v) => v.game);
  const who = ga.game.players.map((x) => `${x.name}:${x.kind}`).join(', ');
  if (ga.code !== gb.code || ga.game.players.length !== 2 || ga.game.players.some((x) => x.kind !== 'human')) throw new Error(`not matched together: ${ga.code} ${gb.code} ${who}`);
  console.log('quick match: both in game', ga.code, '|', who);
  await b.close();
})().catch(async (e) => {
  console.error('FAIL', e.message);
  await saveDiagnostics(pages, out, 'quick');
  process.exit(1);
});
