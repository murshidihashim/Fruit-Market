// Prints the day-by-day ledger of stalls that got stuck (cash < $3 and no fruit), to see what caused it.
// npx vite-node docs/studio/review-17/balance/scripts18/stuck.ts -- --in <batch>.jsonl [--show 6]
import { readFileSync } from 'node:fs';
import { arg, r1, type GameLog } from './harness';

const games: GameLog[] = readFileSync(arg('in')!, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const show = Number(arg('show', '6'));
let shown = 0;
const cause: Record<string, number> = {};
let total = 0;
for (const g of games) {
  for (let p = 0; p < g.n; p++) {
    const d0 = g.days.find((d) => d.day > 1 && d.dawnCash[p] < 3 && d.dawnRipe[p] === 0 && d.dawnGreen[p] === 0);
    if (!d0) continue;
    total++;
    // Walk back to the last day the stall had $8 or more at dawn, and add up what happened since.
    let k = d0.day - 1;
    while (k > 1 && g.days[k - 1].dawnCash[p] < 8) k--;
    const span = g.days.filter((d) => d.day >= k && d.day < d0.day);
    const fine = span.reduce((a, d) => a + d.orderFine[p], 0);
    const upg = span.reduce((a, d) => a + d.upgSpend[p], 0);
    const insp = span.reduce((a, d) => a + d.inspector[p], 0) + d0.inspector[p];
    const fruit = span.reduce((a, d) => a + d.spentFruit[p], 0);
    const inc = span.reduce((a, d) => a + d.income[p], 0);
    const spoiled = span.reduce((a, d) => a + (d.spoiledBy[p] ?? 0), 0);
    const fruitLoss = Math.max(0, fruit - inc);
    const m = Math.max(fine, upg, insp, fruitLoss);
    const key = m === 0 ? 'none found' : m === fine ? 'standing-order fine' : m === upg ? 'upgrade' : m === insp ? 'Health Inspector' : 'fruit bought that did not pay back';
    cause[key] = (cause[key] ?? 0) + 1;
    if (shown < show) {
      shown++;
      console.log(`\nseed ${g.seed} seat ${p} (${g.traits[p]}), stuck at dawn of day ${d0.day}; since day ${k}: fines $${fine}, upgrades $${upg}, inspector $${insp}, fruit $${fruit}, income $${inc}, spoiled ${spoiled}`);
      for (const d of g.days.filter((x) => x.day >= Math.max(1, k - 1) && x.day <= d0.day)) console.log(`  day ${d.day} ${d.event}: dawn $${d.dawnCash[p]} ripe ${d.dawnRipe[p]} green ${d.dawnGreen[p]} | bought ${d.bought[p]} for $${d.spentFruit[p]} | income $${d.income[p]} | order fine $${d.orderFine[p]} | upgrade $${d.upgSpend[p]} | inspector $${d.inspector[p]} | spoiled ${d.spoiledBy[p] ?? 0}`);
    }
  }
}
console.log(`\nStuck stalls: ${total} in ${games.length} games. Largest drain since the stall last had $8: ${Object.entries(cause).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${r1((100 * v) / total)}%`).join(', ')}`);
