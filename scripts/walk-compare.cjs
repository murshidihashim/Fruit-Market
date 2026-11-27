// PLAN-130 (REP-141): a random walk through the game on two builds with exactly the same choices (seeded clicks, Tab
// and Escape), comparing every element's computed style and box after each step. It finds screens a fixed set of
// screenshots never reaches. Serve each build (npm run build, then e.g. python3 -m http.server 8911 --directory dist)
// and run: node scripts/walk-compare.cjs <portBefore> <portAfter> <seedFrom> <seedTo> <outDir>  (STEPS=100 by default)
// It prints one line per seed, then the differences grouped. Margin-only lines with identical boxes, infinite
// animations and an early divergence at the Rush's end are timing, not style.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const [portA, portB, from, to, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const SIZES = [[390, 844], [360, 640], [320, 568], [1280, 800]];
const STEPS = Number(process.env.STEPS || 100);
const PROPS = ['display', 'visibility', 'opacity', 'color', 'background-color', 'background-image', 'border-top-width', 'border-top-color',
  'border-bottom-width', 'border-left-width', 'border-top-left-radius', 'font-size', 'font-weight', 'font-family', 'line-height',
  'letter-spacing', 'text-transform', 'padding-top', 'padding-left', 'padding-bottom', 'margin-top', 'margin-left', 'z-index',
  'box-shadow', 'transform', 'filter', 'outline-style', 'outline-color', 'outline-width', 'text-align', 'white-space', 'overflow-x',
  'overflow-y', 'position', 'cursor', 'text-decoration-line', 'justify-content', 'align-items', 'flex-direction', 'gap',
  'grid-template-columns', 'object-fit', 'clip-path', 'mix-blend-mode', 'text-overflow', 'pointer-events'];

function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

async function settle(page) {
  const t0 = Date.now();
  await page.evaluate(() => { window.__mut = Date.now(); if (!window.__obs) { window.__obs = new MutationObserver(() => { window.__mut = Date.now(); }); window.__obs.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true }); } });
  while (Date.now() - t0 < 7000) {
    const ok = await page.evaluate(() => {
      const busy = document.getAnimations().some((a) => a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity);
      return !busy && Date.now() - window.__mut > 450;
    }).catch(() => false);
    if (ok) return true;
    await page.waitForTimeout(120);
  }
  return false;
}

async function snap(page) {
  return page.evaluate((PROPS) => {
    const out = [];
    const all = document.querySelectorAll('#app *, body > *');
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.bottom < 0 || r.right < 0 || r.top > innerHeight * 3) continue;
      const cs = getComputedStyle(el);
      const p = {};
      for (const k of PROPS) p[k] = cs.getPropertyValue(k);
      p.box = [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)].join(',');
      let s = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '');
      let id = '';
      for (let e = el, i = 0; e && e !== document.body && i < 4; e = e.parentElement, i++) id = (e.tagName + ':' + [...(e.parentElement?.children || [])].indexOf(e)) + '/' + id;
      out.push({ s, id, t: (el.childElementCount === 0 ? (el.textContent || '').trim().slice(0, 30) : ''), p });
    }
    return out;
  }, PROPS);
}

async function candidates(page) {
  return page.evaluate(() => {
    const els = [...document.querySelectorAll('button, [role=button], a[href], input, select, summary, [tabindex="0"]')];
    const ok = els.filter((el) => {
      if (el.disabled || el.closest('[inert]')) return false;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.pointerEvents === 'none') return false;
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const hit = document.elementFromPoint(Math.min(Math.max(x, 0), innerWidth - 1), Math.min(Math.max(y, 0), innerHeight - 1));
      return hit && (hit === el || el.contains(hit));
    });
    window.__cands = ok;
    return ok.map((el) => el.tagName + '|' + (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40));
  });
}

async function walk(port, seed, fresh) {
  const [w, h] = SIZES[seed % SIZES.length];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: seed % 3 === 0 ? 'no-preference' : 'reduce', hasTouch: w < 1000 });
  await ctx.route(/^(?!http:\/\/127\.0\.0\.1).*/, (r) => r.abort());
  await ctx.addInitScript(({ seed, fresh }) => {
    let a = seed * 7919 + 13;
    Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    if (!fresh && !localStorage.getItem('__walk')) {
      localStorage.setItem('__walk', '1');
      localStorage.setItem('fm.settings', JSON.stringify({ sound: false, haptics: false, fast: true, music: false, analytics: false, reactions: true, still: false }));
    }
  }, { seed, fresh });
  const page = await ctx.newPage();
  page.on('popup', (p) => p.close().catch(() => {}));
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  const R = rng(seed);
  const steps = [];
  for (let i = 0; i < STEPS; i++) {
    const settled = await settle(page);
    const c = await candidates(page);
    const sn = await snap(page);
    const roll = R();
    let act;
    if (c.length === 0 || roll < 0.06) act = { k: 'key', key: 'Escape' };
    else if (roll < 0.2) act = { k: 'key', key: 'Tab' };
    else { const j = Math.floor(R() * c.length); act = { k: 'click', j, label: c[j] }; }
    steps.push({ i, settled, cands: c, snap: sn, act, url: page.url() });
    try {
      if (act.k === 'key') await page.keyboard.press(act.key);
      else await page.evaluate((j) => { const el = window.__cands[j]; el.scrollIntoView({ block: 'nearest' }); }, act.j).then(async () => {
        const box = await page.evaluateHandle((j) => window.__cands[j], act.j);
        await box.asElement().click({ timeout: 2000, force: false }).catch(() => box.asElement().click({ timeout: 1000, force: true }).catch(() => {}));
      });
    } catch (e) { steps[i].err = String(e).slice(0, 200); }
    if (page.isClosed()) break;
  }
  await browser.close();
  return { steps, errors, size: `${w}x${h}` };
}

function compare(a, b) {
  const diffs = [];
  for (let i = 0; i < Math.min(a.steps.length, b.steps.length); i++) {
    const A = a.steps[i], B = b.steps[i];
    if (JSON.stringify(A.cands) !== JSON.stringify(B.cands)) {
      diffs.push({ i, kind: 'candidates', a: A.cands.length, b: B.cands.length, onlyA: A.cands.filter((x) => !B.cands.includes(x)).slice(0, 8), onlyB: B.cands.filter((x) => !A.cands.includes(x)).slice(0, 8) });
      return { diffs, diverged: i };
    }
    const sigA = A.snap.map((e) => e.id + e.s).join('\n'), sigB = B.snap.map((e) => e.id + e.s).join('\n');
    if (sigA !== sigB) { diffs.push({ i, kind: 'dom', a: A.snap.length, b: B.snap.length }); continue; }
    for (let n = 0; n < A.snap.length; n++) {
      const e = A.snap[n], f = B.snap[n];
      const norm = (v) => String(v).replace(/127\.0\.0\.1:\d+/g, 'HOST');
      const props = Object.keys(e.p).filter((k) => norm(e.p[k]) !== norm(f.p[k]));
      if (props.length) diffs.push({ i, kind: 'style', el: e.s.slice(0, 90), text: e.t, props: props.map((k) => `${k}: ${String(e.p[k]).slice(0, 60)} -> ${String(f.p[k]).slice(0, 60)}`) });
    }
  }
  return { diffs, diverged: null };
}


function group(...dirs) {
  const groups = new Map();
  let seeds = 0, diverged = 0;
  for (const dir of dirs) {
    for (const f of fs.readdirSync(dir).filter((x) => /^seed-\d+\.json$/.test(x))) {
      const j = JSON.parse(fs.readFileSync(path.join(dir, f)));
      seeds++;
      if (!/diverged=null/.test(j.line)) diverged++;
      const seed = f.match(/\d+/)[0];
      const size = j.line.split(' ')[2];
      for (const d of j.diffs) {
        if (d.kind !== 'style') continue;
        const props = d.props.filter((p) => !p.startsWith('box:'));
        if (!props.length) continue; // position-only: follows from a style change elsewhere
        const key = d.el.replace(/\.(on|off|sel|active|open|lit|done|is-\w+)\b/g, '') + ' :: ' + props.map((p) => p.split(':')[0]).sort().join(',');
        const g = groups.get(key) || { n: 0, where: [], example: null };
        g.n++;
        if (g.where.length < 4) g.where.push(`seed ${seed} (${size}) step ${d.i}`);
        if (!g.example) g.example = { text: d.text, props };
        groups.set(key, g);
      }
    }
  }
  console.log(`seeds ${seeds}, diverged early ${diverged}, groups ${groups.size}`);
  for (const [k, g] of [...groups].sort((a, b) => b[1].n - a[1].n)) {
    console.log(`\n[${g.n}] ${k}\n  text: ${g.example.text}\n  ${g.example.props.join('\n  ')}\n  at: ${g.where.join('; ')}`);
  }
}

(async () => {
  const summary = [];
  for (let seed = +from; seed <= +to; seed++) {
    const fresh = seed % 2 === 0;
    const a = await walk(portA, seed, fresh);
    const b = await walk(portB, seed, fresh);
    const r = compare(a, b);
    const styleDiffs = r.diffs.filter((d) => d.kind === 'style');
    const line = `seed ${seed} ${a.size} fresh=${fresh} steps=${a.steps.length} diverged=${r.diverged} styleDiffSteps=${new Set(styleDiffs.map((d) => d.i)).size} domDiffSteps=${r.diffs.filter((d) => d.kind === 'dom').length} errorsA=${a.errors.length} errorsB=${b.errors.length}`;
    console.log(line);
    summary.push(line);
    fs.writeFileSync(path.join(out, `seed-${seed}.json`), JSON.stringify({ line, diffs: r.diffs, errorsA: a.errors, errorsB: b.errors, actsA: a.steps.map((s) => s.act), actsB: b.steps.map((s) => s.act) }, null, 1));
  }
  fs.writeFileSync(path.join(out, 'summary.txt'), summary.join('\n') + '\n');
  group(out);
})();
