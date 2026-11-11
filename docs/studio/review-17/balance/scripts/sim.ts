// Baseline batch: plays G games at one table size and writes one JSON line per game.
// npx vite-node scripts/lab/sim.ts -- --n 3 --games 2000 --level normal --days 10 --seed0 1 --out file.jsonl
//   [--scout] [--noevents] [--noupgrades] [--mix easy,normal,normal] [--patch a,b] [--lab '{"float":3}']
import { appendFileSync, writeFileSync } from 'node:fs';
import { arg, playGame } from './harness';
import { applyVariant } from './patches';
import type { Level } from '../../src/engine/game';

const n = Number(arg('n', '3')), G = Number(arg('games', '200')), days = Number(arg('days', '10')), seed0 = Number(arg('seed0', '1'));
const level = (arg('level', 'normal') ?? 'normal') as Level;
const mix = arg('mix'); // e.g. "easy,normal,normal": levels by seat, rotated by seed
const out = arg('out')!;
const label = applyVariant();
writeFileSync(out, '');
const t0 = Date.now();
let buf = '';
for (let g = 0; g < G; g++) {
  const seed = seed0 + g;
  let levels: Level[] = Array(n).fill(level);
  if (mix) { const m = mix.split(',') as Level[]; levels = m.map((_, i) => m[(i + seed) % m.length]); }
  const log = playGame({ n, seed, days, levels, scoutAll: process.argv.includes('--scout'), events: !process.argv.includes('--noevents'), upgrades: !process.argv.includes('--noupgrades') });
  buf += JSON.stringify(log) + '\n';
  if (g % 50 === 49) { appendFileSync(out, buf); buf = ''; }
}
appendFileSync(out, buf);
console.log(`done n=${n} G=${G} level=${mix ?? level} days=${days} [${label}] in ${((Date.now() - t0) / 1000).toFixed(1)}s (${(G / ((Date.now() - t0) / 1000)).toFixed(1)} games/s) -> ${out}`);
