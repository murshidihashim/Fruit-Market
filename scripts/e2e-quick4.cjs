// PLAN-125: Quick Match at a table of 4 stalls. Two strangers choose 4 stalls, are matched into one room, and after the
// wait two Normal computers take the empty seats; both people then play the first day. Every room message is checked
// for secrets (the leak counter must stay 0).
// Needs a server started with a short fill time (scripts/e2e.mjs passes QUICK_FILL_MS to wrangler dev).
// Usage: node scripts/e2e-quick4.cjs <base-url> <screenshot-dir>   (env FILL_MS: the server's fill time, default 12000)
const { chromium } = require('playwright');
const { saveDiagnostics } = require('./e2e-diagnostics.cjs');
const [base = 'http://127.0.0.1:8787', out = '.'] = process.argv.slice(2);
const FILL_MS = +(process.env.FILL_MS ?? 12000);
const pages = [];
const asked = {};

(async () => {
  const b = await chromium.launch();
  const mk = async (name) => {
    const c = await b.newContext({ viewport: { width: 400, height: 820 } });
    const p = await c.newPage();
    const P = { tag: name, page: p, frames: [], sent: [], errors: [], consoleLog: [] };
    p.on('pageerror', (e) => P.errors.push(String(e)));
    p.on('console', (m) => P.consoleLog.push(`${m.type()}: ${m.text()}`));
    p.on('websocket', (ws) => {
      ws.on('framereceived', (f) => P.frames.push(typeof f.payload === 'string' ? f.payload : ''));
      ws.on('framesent', (f) => P.sent.push(typeof f.payload === 'string' ? f.payload : ''));
    });
    // The table size goes to the server as { stalls: 4 }. Until the set-up page offers the choice, the request is
    // rewritten here; the body the app sent is kept, to show which way the size was chosen.
    await p.route('**/api/quick', (route) => {
      asked[name] = route.request().postData() ?? '(no body)';
      return route.continue({ postData: JSON.stringify({ stalls: 4 }), headers: { ...route.request().headers(), 'content-type': 'application/json' } });
    });
    await p.addInitScript((n) => { localStorage.setItem('fm.name', n); localStorage.setItem('fm.settings', JSON.stringify({ sound: false, haptics: false, fast: true, analytics: false })); }, name);
    pages.push(P);
    await p.goto(base);
    await p.click('[data-tab="custom"]');
    // PLAN-124/125: Home's Custom card leads to the modes, through Play where the build still has it.
    if (await p.locator('[data-a="play"]').count()) await p.click('[data-a="play"]');
    await p.click('[data-a="quick"]');
    // PLAN-125's set-up page: choose 4 stalls and look for a match (the earlier page starts looking at once).
    const four = p.getByRole('button', { name: /4 stalls/i });
    await four.first().waitFor({ timeout: 5000 }).catch(() => {});
    if (await four.count().catch(() => 0)) await four.first().click();
    const find = p.getByRole('button', { name: /Find a match/i });
    await find.first().waitFor({ timeout: 5000 }).catch(() => {});
    if (await find.count().catch(() => 0)) await find.first().click();
    return P;
  };
  const views = (P) => P.frames.map((f) => { try { return JSON.parse(f); } catch { return null; } }).filter((m) => m && m.t === 'room');

  const t0 = Date.now();
  // Both look at about the same time, as two strangers would within the wait.
  const [A, B] = await Promise.all([mk('Ann'), mk('Ben')]);
  // Both are in the same waiting room before it fills.
  const waitingTogether = async () => {
    for (let i = 0; i < 100; i++) {
      const v = views(B).at(-1);
      if (v && v.status === 'lobby' && v.seats.length === 2) return v;
      if (v && v.status !== 'lobby') return v;
      await B.page.waitForTimeout(100);
    }
    throw new Error('the two players were never seated together');
  };
  const wait = await waitingTogether();
  await A.page.screenshot({ path: `${out}/q4-1-waiting-A.png` });
  console.log('asked for:', JSON.stringify(asked), '| waiting view quick:', JSON.stringify(wait.quick), '| seats:', wait.seats.length, '| code', wait.code);
  if (!wait.quick || wait.quick.stalls !== 4) throw new Error(`the room is not a 4-stall quick room: ${JSON.stringify(wait.quick)}`);
  if (typeof wait.quick.fillAt !== 'number') throw new Error('the waiting view has no fill time');

  await Promise.all([A.page.waitForSelector('.market-stall', { timeout: FILL_MS + 30000 }), B.page.waitForSelector('.market-stall', { timeout: FILL_MS + 30000 })]);
  const started = Date.now() - t0;
  await A.page.waitForTimeout(800);
  await A.page.screenshot({ path: `${out}/q4-2-started-A.png` });
  const ga = views(A).filter((v) => v.game).at(0), gb = views(B).filter((v) => v.game).at(0);
  if (ga.code !== gb.code) throw new Error(`not in the same room: ${ga.code} and ${gb.code}`);
  const kinds = ga.game.players.map((p) => `${p.name}:${p.kind}${p.level ? `/${p.level}` : ''}`);
  console.log('started after', started, 'ms | room', ga.code, '| players', kinds.join(', '), '| A is seat', ga.you, 'B is seat', gb.you);
  if (ga.game.players.length !== 4) throw new Error(`expected 4 stalls, got ${ga.game.players.length}`);
  if (ga.game.players.filter((p) => p.kind === 'ai').length !== 2) throw new Error('expected two computers');
  if (!ga.game.players.filter((p) => p.kind === 'ai').every((p) => p.level === 'normal')) throw new Error('the computers are not Normal');
  if (new Set(ga.game.players.map((p) => p.avatar)).size !== 4) throw new Error('two stalls share a shopkeeper');

  // Both play the first day, each on its own phone.
  const step = async (P) => {
    const p = P.page;
    const has = async (sel) => (await p.locator(sel).count()) > 0;
    if (await has('.trait-card')) { await p.click('.trait-card'); return; }
    if (await has('.ft-pop')) { await p.click('.ft-pop button:has-text("Got it")'); return; }
    if (await has('button:has-text("Start buying")')) { await p.click('button:has-text("Start buying")'); return; }
    if (await has('button:has-text("Done buying"), button:has-text("Skip buying")')) {
      const c = p.locator('.mk-cell.pick');
      if ((await c.count()) && Math.random() < 0.6) { await c.first().click(); await p.waitForTimeout(250); return; }
      await p.click('button:has-text("Done buying"), button:has-text("Skip buying")'); return;
    }
    if (await has('.bell-notice')) { await p.click('.bell-notice .btn'); return; }
    if (await has('.stall-panel .mini-step button:last-child:not([disabled])')) { await p.locator('.stall-panel .mini-step button:last-child:not([disabled])').first().click(); return; }
    if (await has('.pp-lock .btn:not([disabled])')) { await p.click('.pp-lock .btn:not([disabled])'); return; }
    if (await has('button:has-text("Lights out")')) { await p.click('button:has-text("Lights out")'); return; }
    for (const t of ['Close for the day', 'See results']) if (await has(`button:has-text("${t}")`)) { await p.click(`button:has-text("${t}")`); return; }
  };
  const day = (P) => views(P).filter((v) => v.game).at(-1)?.game.day ?? 0;
  const deadline = Date.now() + 4 * 60 * 1000;
  while (Date.now() < deadline && (day(A) < 2 || day(B) < 2)) {
    await step(A).catch(() => {});
    await step(B).catch(() => {});
    await A.page.waitForTimeout(150);
  }
  await A.page.screenshot({ path: `${out}/q4-3-day2-A.png` });
  await B.page.screenshot({ path: `${out}/q4-3-day2-B.png` });
  const acts = (P) => P.sent.filter((s) => s.includes('"t":"act"')).length;
  console.log('day reached A/B:', day(A), day(B), '| actions sent A/B:', acts(A), acts(B));
  if (day(A) < 2 || day(B) < 2) throw new Error('the first day did not finish on both phones');
  if (!acts(A) || !acts(B)) throw new Error('a phone took no action on the first day');

  // Secrecy, as in e2e-online: no seed or decks, no crate or price before everyone commits, face-down walk-ins.
  let leaks = 0, frames = 0;
  for (const P of [A, B]) for (const v of views(P).filter((x) => x.game)) {
    frames++;
    const g = v.game;
    if (g.rng !== 0 || g.customerDeck.length || g.eventDeck.length || g.farmerDeck.length || g.favourDeck.length) leaks++;
    if (g.phase === 'bid' && g.bids.some((x) => x !== null)) leaks++;
    if (g.phase === 'stall' && g.stalls.some((x) => x !== null)) leaks++;
    for (const c of g.queue ?? []) if (c.walkIn && !(c.seenBy ?? []).includes(v.you) && c.wants.some((w) => w.qty || w.max)) leaks++;
    // A rival's favour cards are never named.
    g.players.forEach((pl, i) => { if (i !== v.you && pl.favours.some((f) => f !== 'priority')) leaks++; });
    if (JSON.stringify(v).includes('"pending"') || JSON.stringify(v).includes('"claims"')) leaks++;
  }
  const errors = pages.flatMap((P) => P.errors);
  console.log('room frames checked:', frames, '| leaks:', leaks, '| page errors:', errors.length);
  if (leaks || errors.length) throw new Error(`leaks ${leaks}, page errors ${errors.length}: ${errors.slice(0, 3).join(' | ')}`);
  console.log('quick match of 4: OK');
  await b.close();
})().catch(async (e) => {
  console.error('FAIL', e.message);
  await saveDiagnostics(pages, out, 'quick4');
  process.exit(1);
});
