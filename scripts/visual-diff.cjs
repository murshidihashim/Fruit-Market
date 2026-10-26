// Compares two folders of screenshots pixel by pixel (no image libraries: the browser does it).
// Usage: node scripts/visual-diff.cjs <before-dir> <after-dir> [max-diff-percent=1]
// Prints the share of pixels that differ per image; exits 1 if any image is over the limit.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const [before, after, maxArg = '1'] = process.argv.slice(2);
  const max = Number(maxArg);
  const files = fs.readdirSync(before).filter((f) => f.endsWith('.png') && fs.existsSync(path.join(after, f)));
  const b = await chromium.launch();
  const p = await b.newPage();
  let failed = false;
  for (const f of files) {
    const a = fs.readFileSync(path.join(before, f)).toString('base64');
    const c = fs.readFileSync(path.join(after, f)).toString('base64');
    const pct = await p.evaluate(async ([a, c]) => {
      const load = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = `data:image/png;base64,${src}`; });
      const [ia, ic] = await Promise.all([load(a), load(c)]);
      if (ia.width !== ic.width || ia.height !== ic.height) return 100;
      const px = (img) => { const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const x = cv.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, img.width, img.height).data; };
      const da = px(ia), dc = px(ic);
      let diff = 0;
      for (let i = 0; i < da.length; i += 4) {
        if (Math.abs(da[i] - dc[i]) + Math.abs(da[i + 1] - dc[i + 1]) + Math.abs(da[i + 2] - dc[i + 2]) > 48) diff++;
      }
      return (100 * diff) / (da.length / 4);
    }, [a, c]);
    const bad = pct > max;
    failed ||= bad;
    console.log(`${bad ? 'FAIL' : 'ok  '} ${f.padEnd(18)} ${pct.toFixed(2)}% pixels differ`);
  }
  await b.close();
  process.exit(failed ? 1 : 0);
})();
