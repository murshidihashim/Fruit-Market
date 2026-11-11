// When is the market float paid, and to whom? Reads a batch played with the float3 patch.
// npx vite-node scripts/lab/floatdays.ts -- --in out/float3-n3.jsonl
import { readFileSync } from 'node:fs';
import { arg, avg, r1, r2, type GameLog } from './harness';

const games: GameLog[] = readFileSync(arg('in')!, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const n = games[0].n, D = games[0].ndays;
const byDay = new Array(D + 1).fill(0), withFruit = new Array(D + 1).fill(0);
let total = 0, winnerGot = 0, lastGot = 0;
const perStall: number[] = [];
for (const g of games) {
  const got = new Array(n).fill(0);
  for (let d = 1; d < g.days.length; d++) {
    const prev = g.days[d - 1], cur = g.days[d];
    cur.dawnCash.forEach((c, p) => {
      const before = prev.endCash[p] - cur.inspector[p];
      if (c === 3 && before < 3) {
        const a = 3 - Math.max(0, before);
        byDay[cur.day] += a; total += a; got[p] += a;
        if (cur.dawnRipe[p] + cur.dawnGreen[p] > 0) withFruit[cur.day] += a;
      }
    });
  }
  perStall.push(...got);
  winnerGot += got[g.rank[0]]; lastGot += got[g.rank[n - 1]];
}
console.log(`\n### Market float $3 in ordinary games: ${n} stalls, ${games.length} games\n`);
console.log(`Paid out: $${r2(total / games.length)} per game, $${r2(total / games.length / n)} per stall. The winner received $${r2(winnerGot / games.length)} on average, the last-placed stall $${r2(lastGot / games.length)}. Stalls that received $6 or more: ${r1((100 * perStall.filter((x) => x >= 6).length) / perStall.length)}%.`);
console.log('\n| Day | Share of all float dollars | of which to a stall with fruit on its shelf |');
console.log('| --- | --- | --- |');
for (let d = 2; d <= D; d++) console.log(`| ${d} | ${r1((100 * byDay[d]) / total)}% | ${r1((100 * withFruit[d]) / Math.max(1, byDay[d]))}% |`);
void avg;
