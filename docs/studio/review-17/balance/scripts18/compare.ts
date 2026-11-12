// Shopkeeper win rates against a fair share, before (rules 17 batches) and after (rules 18 batches), as one table.
// npx vite-node docs/studio/review-17/balance/scripts18/compare.ts -- --dir <folder with the .jsonl batches>
//   --pairs "2 stalls:base-n2-normal:f1-n2-normal,3 stalls:base-n3-normal:f1-n3-normal"
import { readFileSync } from 'node:fs';
import { TRAITS } from '../../../../../src/engine/data';
import { ALL_TRAITS, arg, avg, r1, sePct, type GameLog } from './harness';

const dir = arg('dir')!;
const pairs = (arg('pairs') ?? '').split(',').filter(Boolean).map((x) => { const [label, before, after] = x.split(':'); return { label, before, after }; });
const load = (name: string): GameLog[] => readFileSync(`${dir}/${name}.jsonl`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const sg = (x: number) => (x >= 0 ? '+' : '') + r1(x);

interface Cell { win: number; dev: number; se: number; seats: number; cash: number }
function perks(games: GameLog[]): Record<string, Cell> {
  const n = games[0].n, fair = 100 / n;
  const out: Record<string, Cell> = {};
  for (const t of ALL_TRAITS) {
    let seats = 0, w = 0;
    const rel: number[] = [];
    for (const g of games) {
      const p = g.traits.indexOf(t);
      if (p < 0) continue;
      seats++;
      // Rules 18: a shared win counts as a share of a win. Rules 17 batches have a single winner.
      const first = g.winners ?? [g.rank[0]];
      if (first.includes(p)) w += 1 / first.length;
      rel.push(g.cash[p] - avg(g.cash));
    }
    out[t] = { win: (100 * w) / seats, dev: (100 * w) / seats - fair, se: sePct(w / seats, seats), seats, cash: avg(rel) };
  }
  return out;
}

const data = pairs.map((x) => { const b = load(x.before), a = load(x.after); return { ...x, nb: b.length, na: a.length, fair: 100 / a[0].n, b: perks(b), a: perks(a) }; });
const row = (...c: (string | number)[]) => console.log(`| ${c.join(' | ')} |`);
row('Shopkeeper (perk)', ...data.flatMap((d) => [`${d.label}: before`, `${d.label}: after`]));
row('---', ...data.flatMap(() => ['---', '---']));
const bold = (x: number) => (Math.abs(x) > 4 ? `**${sg(x)}**` : sg(x));
for (const t of ALL_TRAITS) row(TRAITS[t].title, ...data.flatMap((d) => [`${r1(d.b[t].win)} (${bold(d.b[t].dev)})`, `${r1(d.a[t].win)} (${bold(d.a[t].dev)})`]));
const worst = (c: Record<string, Cell>) => Math.max(...ALL_TRAITS.map((t) => Math.abs(c[t].dev)));
const out4 = (c: Record<string, Cell>) => ALL_TRAITS.filter((t) => Math.abs(c[t].dev) > 4).length;
row('**Largest distance from fair**', ...data.flatMap((d) => [r1(worst(d.b)), `**${r1(worst(d.a))}**`]));
row('Shopkeepers more than 4 points out', ...data.flatMap((d) => [out4(d.b), out4(d.a)]));
row('Fair share', ...data.flatMap((d) => [r1(d.fair), r1(d.fair)]));
row('Games', ...data.flatMap((d) => [d.nb, d.na]));
row('Seats per shopkeeper (about)', ...data.flatMap((d) => [Math.round(avg(ALL_TRAITS.map((t) => d.b[t].seats))), Math.round(avg(ALL_TRAITS.map((t) => d.a[t].seats)))]));
row('Standard error of a win rate (about)', ...data.flatMap((d) => [r1(avg(ALL_TRAITS.map((t) => d.b[t].se))), r1(avg(ALL_TRAITS.map((t) => d.a[t].se)))]));
console.log('\nFinal cash of the shopkeeper\'s seat less the table average, after (rules 18):\n');
row('Shopkeeper (perk)', ...data.map((d) => d.label));
row('---', ...data.map(() => '---'));
for (const t of ALL_TRAITS) row(TRAITS[t].title, ...data.map((d) => sg(d.a[t].cash)));
