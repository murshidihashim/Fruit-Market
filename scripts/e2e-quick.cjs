// Quick match: two strangers search at the same time and land in the same game.
// Usage: node scripts/e2e-quick.cjs <base-url> <screenshot-dir>
const { chromium } = require('playwright');
let base, out;
const pages = [];
(async () => {
  base = process.argv[2] ?? "http://127.0.0.1:8787"; out = process.argv[3] ?? ".";
  const b = await chromium.launch();
  const mk = async (name) => {
    const c = await b.newContext({ viewport: { width: 400, height: 820 } });
    const p = await c.newPage();
    await p.addInitScript((n) => { localStorage.setItem('fm.name', n); localStorage.setItem('fm.settings', JSON.stringify({ sound: false, haptics: false, fast: true, analytics: false })); }, name);
    pages.push([name, p]); await p.goto(base); await p.click('text=Quick match'); return p;
  };
  const A = await mk('Alice'); await A.click('text=Find an opponent');
  await A.waitForSelector('text=Looking for an opponent'); await A.screenshot({ path: `${out}/q1-waiting.png` });
  const B = await mk('Bob'); await B.click('text=Find an opponent');
  await Promise.all([A.waitForSelector('.market-stall', { timeout: 30000 }), B.waitForSelector('.market-stall', { timeout: 30000 })]);
  await A.waitForTimeout(800); await A.screenshot({ path: `${out}/q2-matched.png` });
  console.log('quick match: both in game', await A.locator('.rival-stall').innerText().then((t) => t.split('\n')[0]), '|', await B.locator('.rival-stall').innerText().then((t) => t.split('\n')[0]));
  await b.close();
})().catch(async (e) => {
  console.error('FAIL', e.message);
  // Leave evidence: what each player saw when it failed.
  for (const [name, p] of pages) {
    const text = await p.locator('body').innerText().catch(() => '(page closed)');
    console.error(`--- ${name} sees:`, text.replace(/\s+/g, ' ').slice(0, 300));
    await p.screenshot({ path: `${out}/q-fail-${name}.png` }).catch(() => {});
  }
  process.exit(1);
});
