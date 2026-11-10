const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 600, height: 450 }, deviceScaleFactor: 2 });
  for (const id of ['pakdin', 'farah']) { await p.goto('file://' + __dirname + '/' + id + '.svg'); await p.waitForTimeout(150); await p.screenshot({ path: __dirname + '/' + id + '.raw.png' }); }
  await b.close(); })();
