// Checks the itch.io upload the way itch.io shows it (PLAN-037): the zip is opened, served from one
// address and embedded in an iframe on another (itch.io serves games from a separate domain), then a solo
// game is started and played to the first evening, or to the results with --full. Saves screenshots.
// Usage: node scripts/itch-smoke.cjs [release/itch/fruit-market-web.zip] [out-dir=e2e-output/itch] [--full]
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');
const zlib = require('zlib');

/** Reads a zip made by scripts/itch-build.mjs (or any plain deflate/store zip) into { name: Buffer }. */
function unzip(buf) {
  const end = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0) throw new Error('not a zip file');
  const count = buf.readUInt16LE(end + 10);
  let at = buf.readUInt32LE(end + 16);
  const files = {};
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(at + 10);
    const size = buf.readUInt32LE(at + 20);
    const nameLen = buf.readUInt16LE(at + 28);
    const extra = buf.readUInt16LE(at + 30);
    const comment = buf.readUInt16LE(at + 32);
    const local = buf.readUInt32LE(at + 42);
    const name = buf.toString('utf8', at + 46, at + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size);
    files[name] = method === 8 ? zlib.inflateRawSync(raw) : raw;
    at += 46 + nameLen + extra + comment;
  }
  return files;
}

const serve = (handler) => new Promise((ok) => { const s = http.createServer(handler).listen(0, '127.0.0.1', () => ok(s)); });

(async () => {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const full = process.argv.includes('--full');
  const [zipPath = 'release/itch/fruit-market-web.zip', out = 'e2e-output/itch'] = args;
  fs.mkdirSync(out, { recursive: true });
  const files = unzip(fs.readFileSync(zipPath));
  const problems = [];
  if (!files['index.html']) problems.push('index.html is not at the root of the zip');
  const types = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.js': 'text/javascript', '.css': 'text/css' };
  const requests = [];
  const game = await serve((req, res) => {
    const name = decodeURIComponent(req.url.split('?')[0].replace(/^\//, '')) || 'index.html';
    requests.push(name);
    if (!files[name]) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(name)] ?? 'application/octet-stream' });
    res.end(files[name]);
  });
  const gameUrl = `http://127.0.0.1:${game.address().port}/index.html`;
  // The embedding page lives on another origin, like itch.io's page around the game's iframe.
  const host = await serve((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><meta name="viewport" content="width=device-width"><body style="margin:0;background:#222">
      <iframe id="game" src="${gameUrl.replace('127.0.0.1', 'localhost')}" style="border:0;width:450px;height:800px" allow="fullscreen; autoplay"></iframe>`);
  });
  const hostUrl = `http://127.0.0.1:${host.address().port}/`;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 450, height: 800 }, deviceScaleFactor: 2 });
  const errors = [];
  const outside = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith('data:') && !u.includes('127.0.0.1') && !u.includes('localhost')) outside.push(u); });
  await page.goto(hostUrl);
  const f = page.frameLocator('#game');
  await f.locator('text=New game').waitFor({ timeout: 15000 });
  await page.screenshot({ path: `${out}/itch-1-home.png` });
  // Online buttons must say they are unavailable rather than hang (this copy has no server).
  await f.locator('text=Play a Friend').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/itch-2-play-a-friend.png` });
  const onlineText = (await f.locator('body').innerText()).replace(/\s+/g, ' ');
  // Back to the home screen.
  await page.goto(hostUrl);
  await f.locator('text=New game').click();
  await f.locator('text=Start game').click();
  const seen = new Set();
  const once = (k) => (seen.has(k) ? false : (seen.add(k), true));
  for (let i = 0; i < 4000; i++) {
    try {
      if (await f.locator('.results').count()) { await page.waitForTimeout(800); await page.screenshot({ path: `${out}/itch-5-results.png` }); break; }
      if (await f.locator('text=Got it').count()) { await f.locator('text=Got it').first().click(); continue; }
      if (await f.locator('text=Start buying').count()) { await f.locator('text=Start buying').click(); continue; }
      if (await f.locator('text=/Done buying|Skip buying/').count()) {
        const cells = f.locator('.mk-cell.pick');
        if ((await cells.count()) && !seen.has('bought2')) {
          await cells.first().click(); await page.waitForTimeout(600);
          if (!once('bought1')) seen.add('bought2');
          if (seen.has('bought2')) await page.screenshot({ path: `${out}/itch-3-buying.png` });
          continue;
        }
        await f.locator('text=/Done buying|Skip buying/').click(); seen.delete('bought1'); seen.delete('bought2'); continue;
      }
      if (await f.locator('.pp-lock .btn').count()) { await f.locator('.pp-lock .btn').click(); await page.waitForTimeout(400); continue; }
      if (await f.locator('text=Lights out').count()) {
        if (once('evening')) { await page.waitForTimeout(1500); await page.screenshot({ path: `${out}/itch-4-evening.png` }); if (!full) break; }
        await f.locator('text=Lights out').click(); continue;
      }
      for (const t of ['Close for the day', 'Final results']) if (await f.locator(`text=${t}`).count()) { await f.locator(`text=${t}`).click(); break; }
      await page.waitForTimeout(120);
    } catch { await page.waitForTimeout(200); }
  }
  if (!full) {
    // The save lives in the browser: opening the page again offers Continue.
    await page.goto(hostUrl);
    await f.locator('text=New game').waitFor({ timeout: 15000 });
    if (!(await f.locator('text=/Continue/').count())) problems.push('after reopening the page, Continue was not offered (save lost)');
    await page.screenshot({ path: `${out}/itch-6-reopened.png` });
  }
  await browser.close();
  game.close(); host.close();
  if (!seen.has('evening')) problems.push('the solo game did not reach the first evening');
  if (full && !fs.existsSync(`${out}/itch-5-results.png`)) problems.push('the solo game did not reach the results');
  if (errors.length) problems.push(`page errors: ${errors.join(' | ')}`);
  if (outside.length) problems.push(`requests outside the zip: ${[...new Set(outside)].join(', ')}`);
  console.log(`zip files: ${Object.keys(files).join(', ')}; requested: ${[...new Set(requests)].join(', ')}`);
  console.log(`"Play a Friend" offline shows: ${onlineText.slice(0, 200)}`);
  if (problems.length) { console.error(`ITCH SMOKE FAILED:\n  - ${problems.join('\n  - ')}`); process.exit(1); }
  console.log(`ITCH SMOKE OK: started a solo game inside a cross-origin iframe and played to the ${full ? 'results' : 'first evening'}; screenshots in ${out}`);
})();
