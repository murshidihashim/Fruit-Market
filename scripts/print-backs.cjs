// Card backs for the Delivery, Favour and Event decks (63 x 88 mm). Plain HTML, no game code needed.
// Usage: node scripts/print-backs.cjs <outdir>   (writes Card_Backs.html and Card_Backs.pdf)
const fs = require('fs'); const path = require('path');
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const decks = [
  { name: 'Delivery', count: 20, band: '#9fcdbd', mark: 'lorry', sub: 'The farmer brings fruit' },
  { name: 'Favour', count: 12, band: '#f2c14e', mark: 'star', sub: 'A secret reward' },
  { name: 'Event', count: 13, band: '#c8553d', mark: 'bell', sub: 'What happens tomorrow' },
];
const mark = {
  lorry: '<svg viewBox="0 0 150 58" width="46mm"><rect x="2" y="16" width="44" height="30" rx="6" fill="#fffdf7" stroke="#2b2438" stroke-width="3"/><rect x="10" y="22" width="22" height="12" rx="3" fill="#9ad0e6" stroke="#2b2438" stroke-width="2"/><rect x="46" y="12" width="98" height="34" rx="4" fill="#a86b45" stroke="#2b2438" stroke-width="3"/><rect x="52" y="4" width="86" height="12" fill="#c8553d" stroke="#2b2438" stroke-width="2.5"/><circle cx="26" cy="48" r="8" fill="#2b2438"/><circle cx="116" cy="48" r="8" fill="#2b2438"/></svg>',
  star: '<svg viewBox="0 0 100 100" width="34mm"><path d="M50 8 L61 38 L93 39 L67 58 L77 90 L50 71 L23 90 L33 58 L7 39 L39 38Z" fill="#f2c14e" stroke="#2b2438" stroke-width="4" stroke-linejoin="round"/></svg>',
  bell: '<svg viewBox="0 0 24 24" width="34mm"><path d="M12 3c-3.5 0-6 2.6-6 6v5l-2 3h16l-2-3V9c0-3.4-2.5-6-6-6Z" fill="#f2c14e" stroke="#2b2438" stroke-width="1.2"/><circle cx="12" cy="20" r="2" fill="#2b2438"/></svg>',
};
const card = (d) => `<div class="card"><div class="in" style="--b:${d.band}"><div class="top">Fruit Market</div><div class="mk">${mark[d.mark]}</div><b>${d.name}</b><small>${d.sub}</small></div></div>`;
let pages = '';
for (const d of decks) {
  const n = Math.ceil(d.count / 9);
  for (let p = 0; p < n; p++) {
    const k = Math.min(9, d.count - p * 9);
    pages += `<section class="page"><p class="tip">${d.name} backs, page ${p + 1} of ${n} (${k} cards). Print on A4 card at 100%, background graphics on, then cut on the dashed lines.</p><div class="grid">${Array.from({ length: k }, () => card(d)).join('')}</div></section>`;
  }
}
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fruit Market: card backs</title><style>
:root{--ink:#2b2438;--paper:#fffdf7}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#cfc7b6;font-family:system-ui,'Segoe UI',sans-serif;color:var(--ink)}
.page{width:210mm;height:297mm;margin:10px auto;background:#fff;padding:4.5mm 10.5mm;page-break-after:always}.tip{font-size:3mm;color:#5a4a3e;margin:0 0 1mm;height:3.5mm}
.grid{display:grid;grid-template-columns:repeat(3,63mm);grid-auto-rows:88mm;justify-content:center}
.card{width:63mm;height:88mm;border:.25mm dashed #9a8a6a;padding:2.5mm;background:var(--paper)}
.in{height:100%;border:.8mm solid var(--ink);border-radius:3mm;background:var(--b);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2mm;text-align:center}
.top{font-weight:700;letter-spacing:.4mm;font-size:3.4mm;text-transform:uppercase}.in b{font-size:7mm}.in small{font-size:3.2mm}
@page{size:A4;margin:0}@media print{body{background:#fff}.page{margin:0}.tip{display:none}}
</style></head><body>${pages}</body></html>`;
fs.writeFileSync(path.join(out, 'Card_Backs.html'), html);
console.log('wrote', path.join(out, 'Card_Backs.html'));

(async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(out, 'Card_Backs.html'), { waitUntil: 'load' });
  await page.pdf({ path: path.resolve(out, 'Card_Backs.pdf'), preferCSSPageSize: true, printBackground: true });
  await browser.close();
  console.log('wrote', path.resolve(out, 'Card_Backs.pdf'));
})();
