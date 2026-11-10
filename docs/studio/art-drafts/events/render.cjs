const { chromium } = require('playwright');
const ids = process.argv[2] ? process.argv.slice(2) : ['touristBus', 'monsoon', 'durian', 'kenduri', 'mangoWindfall', 'pasarMalam', 'bakeOff'];
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 520, height: 391 }, deviceScaleFactor: 2 });
  for (const id of ids) { await p.goto('file://' + __dirname + '/' + id + '.svg'); await p.waitForTimeout(150); await p.screenshot({ path: __dirname + '/' + id + '.raw.png' }); }
  await b.close(); })();
