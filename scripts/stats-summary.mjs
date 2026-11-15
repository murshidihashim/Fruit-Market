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
const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : 'n/a');
const w30 = last(30);
out.push('', '## Coming back (last 30 days, approximate)', '', '| | Share |', '|---|---:|');
out.push(`| Back the next day (day 1 ÷ day 0) | ${pct(total(w30, 'active:d1'), total(w30, 'active:d0'))} |`);
out.push(`| Back a week later (day 7 ÷ day 0) | ${pct(total(w30, 'active:d7'), total(w30, 'active:d0'))} |`);
out.push(`| First-game tips finished (last tip ÷ first tip) | ${pct(total(w30, 'tutorial:day2'), total(w30, 'tutorial:trait'))} |`);
out.push('', '## Where games stop (last 30 days)', '', '| Day of the game | Games that reached it | Games left on that day |', '|---|---:|---:|');
for (let n = 1; n <= 14; n++) {
  const reached = total(w30, `day_reached:${n}`), quit = total(w30, `quit_day:${n}`);
  if (reached || quit) out.push(`| Day ${n} | ${reached} | ${quit} |`);
}
out.push(`| Finished | ${total(w30, 'game_end')} | |`);
out.push('', '## Day by day (last 14 days)', '', '| Day | New players | Players that day | Games started | Games finished |', '|---|---:|---:|---:|---:|');
for (const d of last(14)) out.push(`| ${d} | ${sum(d, 'install_week')} | ${sum(d, 'active')} | ${sum(d, 'game_start')} | ${sum(d, 'game_end')} |`);
console.log(out.join('\n'));
