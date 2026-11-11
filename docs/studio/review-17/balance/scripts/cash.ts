// Safety-net stress test: after the rush of a chosen day one seat is left with $0 and an empty shelf.
// Each candidate net is then played from the same seeds. Also runs the same seeds without the shock for reference.
// npx vite-node scripts/lab/cash.ts -- --n 3 --games 150 [--level normal] [--shockdays 2,5,8]
import { LAB } from '../../src/engine/data';
import type { Level } from '../../src/engine/game';
import { arg, avg, playGame, r1, r2, se, sePct } from './harness';
import { PATCHES } from './patches';

const n = Number(arg('n', '3')), G = Number(arg('games', '100')), days = Number(arg('days', '10')), seed0 = Number(arg('seed0', '1'));
const level = (arg('level', 'normal') ?? 'normal') as Level;
const shockDays = (arg('shockdays', '2,5,8') ?? '').split(',').map(Number);
const nets = (arg('nets', 'none,float3,float5,float3empty,credit2,secondsMarket,secondsSupply,oddJobs3') ?? '').split(',');
const LAB0 = JSON.parse(JSON.stringify(LAB));
const reset = () => { Object.assign(LAB, JSON.parse(JSON.stringify(LAB0))); };

console.log(`\n### Safety nets after a wipe-out: ${n} stalls, ${level} AI, ${days} days, ${G} games per cell. The seat has $0 and no fruit after the rush of the day shown.\n`);
console.log('| Wiped after day | Net | Dead days after (of days left) | Days to first income | Final cash | SE | Final rank (1 = winner) | Last place % | Wins % | Net handed over ($ or pieces) |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const sd of shockDays) {
  // Reference: no wipe-out.
  {
    const cash: number[] = [], rank: number[] = [];
    for (let g = 0; g < G; g++) { const seed = seed0 + g, seat = seed % n; const L = playGame({ n, seed, days, levels: Array(n).fill(level) }); cash.push(L.cash[seat]); rank.push(L.rank.indexOf(seat) + 1); }
    console.log(`| (no wipe-out) | none | | | ${r1(avg(cash))} | ${r1(se(cash))} | ${r2(avg(rank))} | ${r1((100 * rank.filter((x) => x === n).length) / G)} | ${r1((100 * rank.filter((x) => x === 1).length) / G)} | |`);
  }
  for (const net of nets) {
    reset();
    if (net !== 'none') PATCHES[net]();
    const cash: number[] = [], rank: number[] = [], dead: number[] = [], first: number[] = [];
    for (let g = 0; g < G; g++) {
      const seed = seed0 + g, seat = seed % n;
      const L = playGame({ n, seed, days, levels: Array(n).fill(level), shock: { day: sd, seat } });
      cash.push(L.cash[seat]); rank.push(L.rank.indexOf(seat) + 1);
      const rest = L.days.filter((d) => d.day > sd);
      dead.push(rest.filter((d) => d.bought[seat] === 0 && d.income[seat] === 0).length);
      const fi = rest.findIndex((d) => d.income[seat] > 0);
      first.push(fi < 0 ? rest.length + 1 : fi + 1);
    }
    console.log(`| ${sd} | ${net} | ${r2(avg(dead))} of ${days - sd} | ${r2(avg(first))} | ${r1(avg(cash))} | ${r1(se(cash))} | ${r2(avg(rank))} | ${r1((100 * rank.filter((x) => x === n).length) / G)} | ${r1((100 * rank.filter((x) => x === 1).length) / G)} (SE ${r1(sePct(rank.filter((x) => x === 1).length / G, G))}) | |`);
  }
}
reset();
