// Takes a picture of one mock-up board. Used by render.py.
const { chromium } = require('playwright');
(async () => {
  const [src, out, w, h] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 1 });
  await p.goto('file://' + src, { waitUntil: 'networkidle' }).catch(() => p.goto('file://' + src));
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: out, fullPage: true });
  await b.close();
})();
