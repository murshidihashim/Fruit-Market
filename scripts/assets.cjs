// Renders the app icon, adaptive icon layers, splash screens and Play Store graphics.
// Usage: node scripts/assets.cjs   (run from the project root)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const FRUIT = {
  blueberry: `<circle cx="14" cy="24" r="9" fill="#3b46b8"/><circle cx="26" cy="25" r="9" fill="#4f5bd5"/><circle cx="20" cy="15" r="9" fill="#5a67e0"/><path d="M17 10 l3 3 l3 -3 l-1 4 h-4z" fill="#27307a"/><circle cx="17" cy="12" r="2.2" fill="#fff" opacity=".35"/><circle cx="11" cy="21" r="2" fill="#fff" opacity=".3"/><circle cx="23" cy="22" r="2" fill="#fff" opacity=".3"/>`,
  watermelon: `<path d="M1 11 A19 19 0 0 0 39 11 Z" fill="#2e9e4f"/><path d="M4 11 A16 16 0 0 0 36 11 Z" fill="#c8f0b0"/><path d="M6.5 11 A13.5 13.5 0 0 0 33.5 11 Z" fill="#ef4f5a"/><ellipse cx="13" cy="16" rx="1.4" ry="2" fill="#2a1a1a"/><ellipse cx="20" cy="20" rx="1.4" ry="2" fill="#2a1a1a"/><ellipse cx="27" cy="16" rx="1.4" ry="2" fill="#2a1a1a"/>`,
  apple: `<path d="M20 12 C10 6 3 14 5 23 C7 32 13 37 20 34 C27 37 33 32 35 23 C37 14 30 6 20 12Z" fill="#e0393e"/><path d="M20 12 C19 8 19 6 21 3" stroke="#6b3d1e" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M21 8 C25 3 31 4 32 6 C28 9 24 10 21 8Z" fill="#4caf50"/><ellipse cx="12" cy="19" rx="3" ry="4.5" fill="#fff" opacity=".3"/>`,
  mango: `<path d="M8 26 C4 14 14 4 26 7 C36 10 38 24 30 31 C22 38 11 35 8 26Z" fill="#f2b705"/><path d="M20 31 C26 30 31 26 31 20 C33 27 28 33 20 31Z" fill="#e8762b" opacity=".75"/><path d="M25 7 C27 3 30 2 32 2" stroke="#6b3d1e" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M28 4 C33 1 38 4 38 6 C34 8 30 7 28 4Z" fill="#4caf50"/><ellipse cx="15" cy="16" rx="3" ry="5" fill="#fff" opacity=".3" transform="rotate(30 15 16)"/>`,
};
const fruit = (id, x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">${FRUIT[id]}</g>`;

// Fruit pile, drawn on a 108x108 canvas, kept inside the 66px adaptive-icon safe zone.
const pile = (dx = 0, dy = 0, k = 1) => `<g transform="translate(${dx} ${dy}) scale(${k})">
  <ellipse cx="54" cy="80" rx="30" ry="5" fill="#000" opacity=".12"/>
  ${fruit('blueberry', 52, 50, 0.85)}
  ${fruit('mango', 22, 44, 0.95)}
  ${fruit('apple', 36, 36, 1.05)}
</g>`;

function awning(w, h, n) {
  const sw = w / n;
  let s = `<rect width="${w}" height="${h * 0.16}" fill="#c73b25"/>`;
  for (let i = 0; i < n; i++) {
    const x = i * sw;
    s += `<path d="M${x} ${h * 0.14} h${sw} v${h * 0.2} a${sw / 2} ${sw / 2} 0 0 1 ${-sw} 0z" fill="${i % 2 ? '#fff6e6' : '#e94f37'}"/>`;
  }
  return s;
}

const iconFull = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108"><rect width="108" height="108" fill="#fff6e6"/>${awning(108, 108, 6)}<rect x="0" y="86" width="108" height="22" fill="#b5651d"/><rect x="0" y="86" width="108" height="4" fill="#d98b3a"/>${pile(4, 8, 0.93)}</svg>`;
const iconBg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108"><rect width="108" height="108" fill="#fff6e6"/>${awning(108, 108, 6)}<rect x="0" y="84" width="108" height="24" fill="#b5651d"/><rect x="0" y="84" width="108" height="4" fill="#d98b3a"/></svg>`;
const iconFg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">${pile(6, 10, 0.89)}</svg>`;

const splash = (w, h) => {
  const k = Math.min(w, h) / 108 * 0.55;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#fff6e6"/><g transform="translate(${w / 2 - 54 * k} ${h / 2 - 60 * k}) scale(${k})">${pile()}</g></svg>`;
};

const feature = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 500">
  <rect width="1024" height="500" fill="#fff6e6"/>${awning(1024, 500, 14)}
  <rect y="400" width="1024" height="100" fill="#b5651d"/><rect y="400" width="1024" height="14" fill="#d98b3a"/>
  ${fruit('watermelon', 700, 318, 2.6)}${fruit('blueberry', 900, 296, 2.5)}
  ${fruit('mango', 742, 262, 3.2)}${fruit('apple', 818, 214, 4.2)}
  <text x="70" y="290" font-family="Fredoka, sans-serif" font-weight="600" font-size="104" fill="#c73b25">Fruit Market</text>
  <text x="74" y="350" font-family="Fredoka, sans-serif" font-size="34" fill="#8a7560">Buy fresh. Sell fast. Beat your rivals!</text>
</svg>`;

const RES = 'android/app/src/main/res';
const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const font = fs.readFileSync(require.resolve('@fontsource/fredoka/files/fredoka-latin-600-normal.woff2')).toString('base64');
  async function render(svg, w, h, out, transparent = false) {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(`<style>@font-face{font-family:Fredoka;font-weight:600;src:url(data:font/woff2;base64,${font})}@font-face{font-family:Fredoka;font-weight:400;src:url(data:font/woff2;base64,${font})}html,body{margin:0;background:transparent}svg{display:block;width:${w}px;height:${h}px}</style>${svg}`);
    await page.evaluate(() => document.fonts.ready);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await page.screenshot({ path: out, omitBackground: transparent });
  }
  for (const [d, k] of Object.entries(DENS)) {
    await render(iconFull, 48 * k, 48 * k, `${RES}/mipmap-${d}/ic_launcher.png`);
    await render(iconFull.replace('<rect width="108" height="108" fill="#fff6e6"/>', '<clipPath id="c"><circle cx="54" cy="54" r="54"/></clipPath><g clip-path="url(#c)"><rect width="108" height="108" fill="#fff6e6"/>').replace('</svg>', '</g></svg>'), 48 * k, 48 * k, `${RES}/mipmap-${d}/ic_launcher_round.png`, true);
    await render(iconFg, 108 * k, 108 * k, `${RES}/mipmap-${d}/ic_launcher_foreground.png`, true);
    await render(iconBg, 108 * k, 108 * k, `${RES}/mipmap-${d}/ic_launcher_background.png`);
  }
  const splashes = { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] };
  for (const [d, [w, h]] of Object.entries(splashes)) {
    await render(splash(w, h), w, h, `${RES}/drawable-port-${d}/splash.png`);
    await render(splash(h, w), h, w, `${RES}/drawable-land-${d}/splash.png`);
  }
  await render(splash(480, 320), 480, 320, `${RES}/drawable/splash.png`);
  await render(iconFull, 512, 512, 'store/icon-512.png');
  await render(feature, 1024, 500, 'store/feature-graphic-1024x500.png');
  await render(iconFull, 512, 512, 'public/icon-512.png');
  await browser.close();
  console.log('assets done');
})();
