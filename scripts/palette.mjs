// Generates src/ui/palette.css from src/ui/palette.ts (PLAN-027).
//   node scripts/palette.mjs          write palette.css
//   node scripts/palette.mjs --check  fail if palette.css is out of date
import { readFileSync, writeFileSync } from 'node:fs';

export function paletteValues(tsText) {
  return [...tsText.matchAll(/^\s+\w+: '(#[0-9a-f]{6})',/gm)].map((m) => m[1]);
}
export function paletteCss(tsText) {
  const names = [...new Set(paletteValues(tsText))].sort();
  return `/* Generated from palette.ts by scripts/palette.mjs. Do not edit. */\n:root {\n${names.map((h) => `  --c-${h.slice(1)}: ${h};`).join('\n')}\n}\n`;
}

if (import.meta.url === new URL(process.argv[1], 'file:///').href || process.argv[1]?.endsWith('palette.mjs')) {
  const ts = readFileSync('src/ui/palette.ts', 'utf8');
  const css = paletteCss(ts);
  if (process.argv.includes('--check')) {
    const now = readFileSync('src/ui/palette.css', 'utf8').replace(/\r\n/g, '\n');
    if (now !== css) { console.error('palette.css is out of date: run npm run palette'); process.exit(1); }
    console.log('palette.css is up to date');
  } else {
    writeFileSync('src/ui/palette.css', css);
    console.log('wrote src/ui/palette.css');
  }
}
