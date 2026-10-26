// Reconnect stress test (PLAN-004): repeats the ways a player rejoins an online room and measures
// how long the game screen takes to come back each time.
//   reload: a player reloads the page mid-match
//   drop:   the network connection breaks (a local relay cuts every connection, like losing signal),
//           then the app must notice and rejoin by itself
//   quick:  two strangers press Quick match
// Usage: node scripts/e2e-reconnect.cjs <base-url> <out-dir>
// Env: RELOADS (default 40), DROPS (40), QUICKS (10), THROTTLE (CPU slowdown, default 1), LIMIT_MS (30000),
//      NO_RELAY=1 to talk to <base-url> directly (needed for https targets such as the preview; skips drops)
// Prints one line per cycle, then a summary; exits 1 if any cycle failed. Failures save diagnostics.
const net = require('node:net');
const { chromium } = require('playwright');
const { saveDiagnostics } = require('./e2e-diagnostics.cjs');

const [server = 'http://127.0.0.1:8787', out = '.'] = process.argv.slice(2);
let base = server; // pages use the relay below, so the test can cut their connections
const NO_RELAY = !!process.env.NO_RELAY;
const N = { reload: +(process.env.RELOADS ?? 40), drop: NO_RELAY ? 0 : +(process.env.DROPS ?? 40), quick: +(process.env.QUICKS ?? 10) };
const THROTTLE = +(process.env.THROTTLE ?? 1);
const LIMIT = +(process.env.LIMIT_MS ?? 30000);
const PER_ROOM = 10; // fresh match every few cycles, so early-game and mid-game moments both get covered
const QUICK_GAP = 13000; // quick match is limited to 10 requests a minute per address

const results = [];
let browser;

async function player(name) {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 820 } });
  await ctx.addInitScript((n) => {
    localStorage.setItem('fm.name', n);
    localStorage.setItem('fm.settings', JSON.stringify({ sound: false, haptics: false, fast: true, analytics: false }));
  }, name);
  const page = await ctx.newPage();
  const P = { tag: name, ctx, page, frames: [], errors: [], consoleLog: [] };
  page.on('pageerror', (e) => P.errors.push(String(e)));
  page.on('console', (m) => P.consoleLog.push(`${m.type()}: ${m.text()}`));
  page.on('websocket', (ws) => ws.on('framereceived', (f) => P.frames.push(typeof f.payload === 'string' ? f.payload : '')));
  if (THROTTLE > 1) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
  }
  return P;
}

async function newMatch() {
  const A = await player('Ann'), B = await player('Ben');
  await A.page.goto(base);
  await A.page.click('text=Play a friend');
  await A.page.click('text=Create room');
  await A.page.waitForSelector('#invite-link');
  const link = await A.page.inputValue('#invite-link');
  await B.page.goto(link);
  await B.page.click('text=Join the game');
  await A.page.waitForSelector('text=Ben');
  await A.page.click("text=I'm ready");
  await B.page.click("text=I'm ready");
  await A.page.click('text=Start the match');
  await Promise.all([A.page.waitForSelector('.market-stall'), B.page.waitForSelector('.market-stall')]);
  return [A, B];
}

/** Back = game screen visible and no "Reconnecting" strip. */
async function waitBack(P) {
  const t0 = Date.now();
  while (Date.now() - t0 < LIMIT) {
    const ok = (await P.page.locator('.market-stall, .results').count().catch(() => 0)) > 0
      && (await P.page.locator('.net-strip.bad').count().catch(() => 1)) === 0;
    if (ok) return Date.now() - t0;
    await P.page.waitForTimeout(50).catch(() => {});
  }
  return null;
}

async function record(type, n, players, ms) {
  const ok = ms !== null;
  results.push({ type, ms: ms ?? LIMIT, ok });
  console.log(`${type} #${n}: ${ok ? `${ms} ms` : `FAILED (not back within ${LIMIT} ms)`}`);
  if (!ok) await saveDiagnostics(players, out, `reconnect-${type}-${n}`);
  return ok;
}

async function closeAll(players) { for (const P of players) await P.ctx.close().catch(() => {}); }

async function reloads() {
  let room = null;
  for (let i = 1; i <= N.reload; i++) {
    if (!room || (i - 1) % PER_ROOM === 0) { if (room) await closeAll(room); room = await newMatch(); }
    const P = room[i % 2];
    // Vary the moment: sometimes mid-animation, sometimes idle.
    await P.page.waitForTimeout(Math.floor(Math.random() * 1500));
    await P.page.reload();
    if (!(await record('reload', i, room, await waitBack(P)))) { await closeAll(room); room = null; }
  }
  if (room) await closeAll(room);
}

async function drops() {
  let room = null;
  for (let i = 1; i <= N.drop; i++) {
    if (!room || (i - 1) % PER_ROOM === 0) { if (room) await closeAll(room); room = await newMatch(); }
    const P = room[i % 2];
    await P.page.waitForTimeout(Math.floor(Math.random() * 1500));
    const t0 = Date.now();
    relay.cut();
    // The cycle only counts once the app has noticed the drop ("Reconnecting" strip shown).
    const noticed = await P.page.waitForSelector('.net-strip.bad', { timeout: 10000 }).then(() => true, () => false);
    const back = noticed ? await waitBack(P) : null;
    if (!noticed) console.log(`drop #${i}: the app never showed that the connection dropped`);
    if (!(await record('drop', i, room, back === null ? null : Date.now() - t0))) { await closeAll(room); room = null; }
  }
  if (room) await closeAll(room);
}

async function quicks() {
  for (let i = 1; i <= N.quick; i++) {
    const started = Date.now();
    const A = await player('Quinn'), B = await player('Robin');
    await A.page.goto(base); await A.page.click('text=Quick match'); await A.page.click('text=Find an opponent');
    await A.page.waitForSelector('text=Looking for an opponent');
    await B.page.goto(base); await B.page.click('text=Quick match');
    const t0 = Date.now();
    await B.page.click('text=Find an opponent');
    const [a, b] = await Promise.all([waitBack(A), waitBack(B)]);
    await record('quick', i, [A, B], a === null || b === null ? null : Date.now() - t0);
    await closeAll([A, B]);
    const wait = QUICK_GAP - (Date.now() - started);
    if (i < N.quick && wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
}

/** A pass-through between the browsers and the local server that can drop every connection at once. */
function startRelay(target) {
  const { hostname, port } = new URL(target);
  const live = new Set();
  const srv = net.createServer((c) => {
    const up = net.connect(+port, hostname);
    live.add(c); live.add(up);
    const done = () => { live.delete(c); live.delete(up); c.destroy(); up.destroy(); };
    c.on('error', done); up.on('error', done); c.on('close', done); up.on('close', done);
    c.pipe(up); up.pipe(c);
  });
  return new Promise((resolve) => srv.listen(0, '127.0.0.1', () => resolve({
    url: `http://127.0.0.1:${srv.address().port}`,
    cut: () => { for (const s of live) s.destroy(); live.clear(); },
    close: () => srv.close(),
  })));
}
let relay;

function summary() {
  const lines = [];
  for (const type of ['reload', 'drop', 'quick']) {
    const r = results.filter((x) => x.type === type);
    if (!r.length) continue;
    const ms = r.filter((x) => x.ok).map((x) => x.ms).sort((a, b) => a - b);
    const pct = (p) => (ms.length ? ms[Math.min(ms.length - 1, Math.floor(p * ms.length))] : '-');
    lines.push(`${type}: ${r.length} cycles, ${r.filter((x) => !x.ok).length} failed, median ${pct(0.5)} ms, p95 ${pct(0.95)} ms, max ${ms.at(-1) ?? '-'} ms`);
  }
  return lines;
}

(async () => {
  if (!NO_RELAY) { relay = await startRelay(server); base = relay.url; }
  browser = await chromium.launch();
  console.log(`Reconnect stress: ${N.reload} reloads, ${N.drop} drops, ${N.quick} quick matches, CPU slowdown ${THROTTLE}x, limit ${LIMIT} ms`);
  for (const [name, fn] of [['reload', reloads], ['drop', drops], ['quick', quicks]]) {
    if (!N[name]) continue;
    try { await fn(); } catch (e) { results.push({ type: name, ms: LIMIT, ok: false }); console.log(`${name}: setup FAILED: ${e.message.split('\n')[0]}`); }
  }
  await browser.close();
  relay?.close();
  const failed = results.filter((x) => !x.ok).length;
  console.log(['', ...summary(), failed ? `RECONNECT FAILED: ${failed} of ${results.length} cycles` : `RECONNECT OK: ${results.length} cycles`].join('\n'));
  process.exit(failed ? 1 : 0);
})();
