// Turns the live game's anonymous counters (/api/stats, docs/ANALYTICS.md) into a short Markdown summary for the owner.
//   node scripts/stats-summary.mjs stats.json   ->  Markdown on stdout
// Only totals are printed (no error lines): the summary lands in a public Actions page.
import { readFileSync } from 'node:fs';

const { since, counts = {} } = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const days = Object.keys(counts).sort();
const sum = (day, prefix) => Object.entries(counts[day] ?? {}).filter(([k]) => k === prefix || k.startsWith(prefix + ':')).reduce((a, [, n]) => a + n, 0);
const total = (list, prefix) => list.reduce((a, d) => a + sum(d, prefix), 0);
const last = (n) => days.slice(-n);

const rows = [
  ['New players (first start on a phone or browser)', 'install_week'],
  ['Player-days (each device counted once a day it plays)', 'active'],
  ['App opens', 'app_open'],
  ['Games started', 'game_start'],
  ['Games finished', 'game_end'],
  ['First game finished (once per device)', 'first_game_complete'],
];
const out = [];
out.push(`# Fruit Market players (live)`, '', `Counted since ${since ?? 'n/a'} (UTC days with data: ${days.length}). Anonymous totals; players who switched counting off are missing.`, '');
out.push('| | Last 7 days | Last 30 days | All kept (up to 90 days) |', '|---|---:|---:|---:|');
for (const [label, key] of rows) out.push(`| ${label} | ${total(last(7), key)} | ${total(last(30), key)} | ${total(days, key)} |`);
out.push('', '## Games started by type (all kept days)', '', '| Type | Games |', '|---|---:|');
const modes = {};
for (const d of days) for (const [k, n] of Object.entries(counts[d])) if (k.startsWith('game_start:')) modes[k.slice(11)] = (modes[k.slice(11)] ?? 0) + n;
for (const [m, n] of Object.entries(modes).sort((a, b) => b[1] - a[1])) out.push(`| ${m} | ${n} |`);
out.push('', '## Day by day (last 14 days)', '', '| Day | New players | Players that day | Games started | Games finished |', '|---|---:|---:|---:|---:|');
for (const d of last(14)) out.push(`| ${d} | ${sum(d, 'install_week')} | ${sum(d, 'active')} | ${sum(d, 'game_start')} | ${sum(d, 'game_end')} |`);
console.log(out.join('\n'));
