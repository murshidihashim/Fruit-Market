// Layout and accessibility sweep: opens every main screen at phone, tablet and desktop sizes,
// takes screenshots and reports sideways overflow, small tap targets, low text contrast and buttons without a name.
// Usage: node scripts/qa-sweep.cjs <dist-single/index.html> <outdir>
// It only reads the game; it never changes a rule. The report is <outdir>/qa-report.json and qa-report.md.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SIZES = [
  ['phone-small', 360, 740], ['phone', 390, 844], ['phone-landscape', 844, 390],
  ['tablet', 768, 1024], ['tablet-landscape', 1024, 768], ['laptop', 1280, 800], ['desktop', 1600, 900],
];

// Runs inside the page.
function audit() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
  };
  const name = (el) => {
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    return el.tagName.toLowerCase() + (cls ? '.' + cls : '');
  };
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const bgOf = (el) => {
    let base = { r: 255, g: 255, b: 255 };
    const stack = [];
    for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); const c = parse(cs.backgroundColor); stack.push({ c, img: cs.backgroundImage !== 'none' }); }
    let hasImage = false;
    for (let i = stack.length - 1; i >= 0; i--) {
      const { c, img } = stack[i];
      if (img) hasImage = true;
      if (c && c.a > 0) base = { r: c.r * c.a + base.r * (1 - c.a), g: c.g * c.a + base.g * (1 - c.a), b: c.b * c.a + base.b * (1 - c.a) };
    }
    return { base, hasImage };
  };

  const out = { overflow: [], small: [], contrast: [], unnamed: [], pageOverflow: document.documentElement.scrollWidth > vw + 1 };

  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    // Anything poking out past the right edge that is not inside a scrolling strip.
    if (r.right > vw + 2 || r.left < -2) {
      let scrolls = false;
      for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') { scrolls = true; break; } }
      if (!scrolls) out.overflow.push(`${name(el)} ${Math.round(r.left)}..${Math.round(r.right)} of ${vw}`);
    }
  }

  for (const el of document.querySelectorAll('button, a, [role=button], input, select, summary')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    const label = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim();
    if (!label && !el.querySelector('img[alt]')) out.unnamed.push(`${name(el)} at ${Math.round(r.left)},${Math.round(r.top)}`);
    if (Math.min(r.width, r.height) < 40) out.small.push(`${name(el)} ${Math.round(r.width)}x${Math.round(r.height)} "${label.slice(0, 24)}"`);
  }

  const seen = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el)) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
    if (!own) continue;
    const cs = getComputedStyle(el);
    const fg = parse(cs.color);
    if (!fg) continue;
    const { base, hasImage } = bgOf(el);
    if (hasImage) continue; // gradients and pictures cannot be judged from colour alone
    const a = fg.a ?? 1;
    const f = { r: fg.r * a + base.r * (1 - a), g: fg.g * a + base.g * (1 - a), b: fg.b * a + base.b * (1 - a) };
    const l1 = lum(f), l2 = lum(base);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
    if (ratio < need) {
      const key = name(el) + own.slice(0, 20);
      if (!seen.has(key)) { seen.add(key); out.contrast.push(`${name(el)} ${ratio.toFixed(2)} (needs ${need}) "${own.slice(0, 30)}"`); }
    }
  }
  out.viewport = `${vw}x${vh}`;
  return out;
}

(async () => {
  const [file, outDir] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const report = [];
  const errors = [];
  for (const [label, w, h] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 800 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${label}: ${e}`));
    await page.addInitScript(() => localStorage.setItem('fm.settings', JSON.stringify({ sound: false, haptics: false, fast: true, tips: true })));
    await page.goto('file://' + path.resolve(file));
    const check = async (screen) => {
      await page.waitForTimeout(350);
      await page.screenshot({ path: `${outDir}/${label}-${screen}.png` });
      const res = await page.evaluate(audit);
      report.push({ size: label, screen, ...res });
    };
    const has = async (t) => (await page.locator(t).count()) > 0;
    try {
      await check('home');
      await page.click('text=How to play');
      await check('howto-1');
      for (let i = 2; i <= 9 && (await has('button.btn.primary:has-text("Next")')); i++) { await page.click('button.btn.primary:has-text("Next")'); await check(`howto-${i}`); }
      await page.click('.icon-btn');
      await page.click('text=Settings'); await check('settings');
      await page.click('.icon-btn');
      await page.click('text=Trophies'); await check('trophies');
      await page.click('.icon-btn').catch(() => {});
      await page.click('text=New game'); await check('setup');
      await page.click('text=Start game');
      const seen = new Set();
      const once = (k) => (seen.has(k) ? false : (seen.add(k), true));
      for (let i = 0; i < 700 && !(await has('.results')); i++) {
        try {
          if (await has('.trait-card')) { if (once('trait')) await check('shopkeeper'); await page.click('.trait-card'); continue; }
          if (await has('text=Start buying')) { if (once('morning')) await check('morning'); await page.click('text=Start buying'); continue; }
          if (await has('text=/Done buying|Skip buying/')) { if (once('buy')) await check('buying'); await page.click('text=/Done buying|Skip buying/'); continue; }
          const lock = page.locator('.pp-lock .btn');
          if (await lock.count()) { if (once('pricing')) await check('pricing'); await lock.click(); if (once('reveal')) { await page.waitForTimeout(2600); await check('reveal'); } continue; }
          if (await has('text=Lights out')) { if (once('evening')) await check('evening'); await page.click('text=Lights out'); continue; }
          for (const t of ['Close for the day', 'Final results']) if (await has(`text=${t}`)) { if (once('summary')) await check('summary'); await page.click(`text=${t}`); break; }
          await page.waitForTimeout(100);
        } catch { await page.waitForTimeout(150); }
      }
      await check('results');
    } catch (e) { errors.push(`${label}: sweep stopped: ${String(e).split('\n')[0]}`); }
    await ctx.close();
  }
  await browser.close();

  const lines = ['# QA sweep', ''];
  for (const key of ['overflow', 'unnamed', 'small', 'contrast']) {
    const bad = report.filter((r) => r[key].length);
    lines.push(`## ${key}: ${bad.length} screens affected`);
    for (const r of bad) lines.push(`- ${r.size} / ${r.screen}: ${r[key].slice(0, 6).join('; ')}${r[key].length > 6 ? ` (+${r[key].length - 6} more)` : ''}`);
    lines.push('');
  }
  const page = report.filter((r) => r.pageOverflow).map((r) => `${r.size}/${r.screen}`);
  lines.push(`## page scrolls sideways: ${page.length ? page.join(', ') : 'none'}`, '', `## script errors: ${errors.length ? '\n' + errors.map((e) => '- ' + e).join('\n') : 'none'}`);
  fs.writeFileSync(`${outDir}/qa-report.json`, JSON.stringify({ report, errors }, null, 1));
  fs.writeFileSync(`${outDir}/qa-report.md`, lines.join('\n'));
  console.log(lines.join('\n'));
})();
