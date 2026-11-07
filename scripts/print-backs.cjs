// Retired (PLAN-049): the card backs are now part of the full print kit, drawn by scripts/print-deck.ts in the
// Great Fruit Exchange look (each sheet of fronts is followed by its mirrored backs). This wrapper keeps the old
// command working for the QA sweep: node scripts/print-backs.cjs <outdir> builds the whole kit into <outdir>.
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const out = process.argv[2];
if (!out) {
  console.error('Usage: node scripts/print-backs.cjs <outdir>');
  process.exit(2);
}
const r = spawnSync('npx', ['vite-node', path.join(__dirname, 'print-deck.ts'), path.resolve(out)], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (r.error) console.error(r.error);
process.exit(r.status ?? 1);
