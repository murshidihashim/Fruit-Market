// Builds searchable PDFs: one per report, plus the cumulative register (pending approvals and current
// decisions first, then every report in order). Uses pandoc (set PANDOC to override its path) and the
// project's Playwright browser. All PDFs are rendered to temporary files first and only replace the
// old ones if every export succeeded, so a failure keeps the last good set.
// Usage: npm run records (which regenerates DECISIONS.md first), or node docs/workflow/export-pdf.cjs
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const dir = __dirname;
const out = path.join(dir, 'pdf');
const css = `body{font:11pt/1.45 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f;max-width:none;margin:0}
h1{font-size:19pt;border-bottom:2px solid #c0392b;padding-bottom:4px}h2{font-size:14pt;margin-top:22px;color:#7a2318}h3{font-size:12pt}
table{border-collapse:collapse;width:100%;margin:8px 0;font-size:9.5pt}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left;vertical-align:top}
th{background:#f3eee8}code{font-size:9pt;background:#f4f4f4;padding:0 3px}hr{border:0;border-top:1px dashed #aaa;margin:24px 0}.pb{page-break-before:always}`;

const html = (md) => execFileSync(process.env.PANDOC || 'pandoc', ['-f', 'gfm', '-t', 'html'], { input: md }).toString();
const page = (body, title) => `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>${body}</body></html>`;

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const reports = fs.readdirSync(path.join(dir, 'reports')).filter((f) => f.endsWith('.md')).sort();
  const browser = await chromium.launch();
  const pdf = async (name, doc) => {
    const tmp = path.join(out, `.${name}.tmp`);
    const p = await browser.newPage();
    await p.setContent(doc, { waitUntil: 'load' });
    await p.pdf({ path: tmp, format: 'A4', margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
      displayHeaderFooter: true, headerTemplate: '<span></span>',
      footerTemplate: `<div style="font-size:8px;width:100%;text-align:center;color:#888">${name} · page <span class="pageNumber"></span>/<span class="totalPages"></span></div>` });
    await p.close();
    if (fs.statSync(tmp).size < 1000) throw new Error(`${name}: PDF looks empty`);
    done.push([tmp, path.join(out, `${name}.pdf`)]);
  };
  const done = [];
  try {
    const bodies = [];
    for (const f of reports) {
      const id = f.replace(/\.md$/, '');
      const md = fs.readFileSync(path.join(dir, 'reports', f), 'utf8');
      if (!md.startsWith(`# ${id} `)) throw new Error(`${f}: title must start with "# ${id}"`);
      const body = html(md);
      bodies.push(body);
      await pdf(id, page(body, id));
    }
    const register = html(fs.readFileSync(path.join(dir, 'DECISIONS.md'), 'utf8'));
    const missing = reports.map((f) => f.replace(/\.md$/, '')).filter((id) => !register.includes(id));
    if (missing.length) throw new Error(`register does not mention ${missing.join(', ')}`);
    await pdf('DECISIONS-cumulative', page(register + bodies.map((b) => `<div class="pb">${b}</div>`).join(''), 'Decision register'));
    for (const [tmp, final] of done) { fs.renameSync(tmp, final); console.log('wrote', path.relative(dir, final)); }
  } catch (e) {
    for (const [tmp] of done) fs.rmSync(tmp, { force: true });
    console.error(`PDF EXPORT BLOCKED: ${e.message.split('\n')[0]}. Sources are unchanged; the last good PDFs were kept. Fix: install pandoc or set PANDOC to its path, then run npm run records.`);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
