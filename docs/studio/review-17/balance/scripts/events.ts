// Paired event test: play a game to the evening before a random day, then replay that one day (and its night)
// once per event card and once with no event ("calm"), from the same position. Differences are against calm.
// npx vite-node scripts/lab/events.ts -- --n 3 --games 250 [--patch a,b]
import { EVENT_CARDS, FRUIT, FRUITS, type EventCard, type FruitId } from '../../src/engine/data';
import { arg, avg, r1, r2, Run, se, zeroF } from './harness';
import { applyVariant } from './patches';

const n = Number(arg('n', '3')), G = Number(arg('games', '100')), days = Number(arg('days', '10')), seed0 = Number(arg('seed0', '1'));
const label = applyVariant();
EVENT_CARDS.push({ id: 'calm', title: 'Calm day (no event)', text: '', icon: '' } as unknown as EventCard);
const CALM = EVENT_CARDS.length - 1;

interface Acc { n: number; del: Record<FruitId, number>; want: Record<FruitId, number>; sold: Record<FruitId, number>; rev: Record<FruitId, number>; bought: Record<FruitId, number>; cost: Record<FruitId, number>;
  dInc: number[]; dSpend: number[]; dNet: number[]; dSpoil: number[]; swing: number[]; maxSwing: number[]; fine: number[]; fined: number; stalls: number; maxFine: number; dWinnerGap: number[] }
const acc: Acc[] = EVENT_CARDS.map(() => ({ n: 0, del: zeroF(), want: zeroF(), sold: zeroF(), rev: zeroF(), bought: zeroF(), cost: zeroF(), dInc: [], dSpend: [], dNet: [], dSpoil: [], swing: [], maxSwing: [], fine: [], fined: 0, stalls: 0, maxFine: 0, dWinnerGap: [] }));

for (let g = 0; g < G; g++) {
  const seed = seed0 + g;
  const d = 2 + (seed % (days - 1));
  const pre = new Run({ n, seed, days });
  pre.s = { ...pre.s, eventDeck: pre.s.eventDeck.filter((i) => i !== CALM) };
  pre.runUntil((s) => s.phase === 'reveal' && s.day === d - 1);
  const snap = { s: pre.s, log: pre.log };
  const day = (e: number) => {
    const b = new Run({ n, seed, days, forceEvent: { day: d, event: e } }, snap);
    b.runUntil((s) => s.day > d && s.phase === 'morning');
    const L = b.log.days[d - 1];
    const net = L.income.map((x, p) => x - L.spentFruit[p] - L.inspector[p] - L.orderFine[p]);
    return { L, net, spoil: d < days ? FRUITS.reduce((a, f) => a + L.leftF[f], 0) / n : NaN };
  };
  const calm = day(CALM);
  for (let e = 0; e < EVENT_CARDS.length; e++) {
    if (EVENT_CARDS[e].inspector && d === days) continue;
    const x = e === CALM ? calm : day(e);
    const a = acc[e];
    a.n++;
    for (const f of FRUITS) { a.del[f] += x.L.delivery[f]; a.want[f] += x.L.wanted[f]; a.sold[f] += x.L.soldRow[f]; a.rev[f] += x.L.revRow[f]; a.bought[f] += x.L.boughtF[f]; a.cost[f] += x.L.costF[f]; }
    a.dInc.push(avg(x.L.income) - avg(calm.L.income));
    a.dSpend.push(avg(x.L.spentFruit) - avg(calm.L.spentFruit));
    const dn = x.net.map((v, p) => v - calm.net[p]);
    a.dNet.push(avg(dn));
    if (!Number.isNaN(x.spoil)) a.dSpoil.push(x.spoil - calm.spoil);
    const m = avg(dn);
    a.swing.push(avg(dn.map((v) => Math.abs(v - m))));
    a.maxSwing.push(Math.max(...dn) - Math.min(...dn));
    // Does the day widen or narrow the gap between the richest and poorest stall (by cash at dawn)?
    const dawn = x.L.dawnCash.map((c, p) => c + x.L.inspector[p]);
    const rich = dawn.indexOf(Math.max(...dawn)), poor = dawn.indexOf(Math.min(...dawn));
    a.dWinnerGap.push(dn[rich] - dn[poor]);
    for (const fv of x.L.inspector) { a.fine.push(fv); a.stalls++; if (fv > 0) a.fined++; a.maxFine = Math.max(a.maxFine, fv); }
  }
}

const c = acc[CALM];
const per = (a: Acc, k: 'del' | 'want' | 'sold' | 'bought', f: FruitId) => a[k][f] / a.n;
const price = (a: Acc, f: FruitId) => (a.sold[f] ? a.rev[f] / a.sold[f] : NaN);
const sg = (x: number) => (x >= 0 ? '+' : '') + r2(x);
const F = FRUITS.map((f) => FRUIT[f].name[0]).join('/');
console.log(`\n### Events, paired against a calm day: ${n} stalls, normal AI, ${G} positions per event (random day 2 to ${days}) [${label}]\n`);
console.log(`Calm day: delivered ${FRUITS.map((f) => r1(per(c, 'del', f))).join(' / ')}, wanted ${FRUITS.map((f) => r1(per(c, 'want', f))).join(' / ')}, bought ${FRUITS.map((f) => r1(per(c, 'bought', f))).join(' / ')}, sold ${FRUITS.map((f) => r1(per(c, 'sold', f))).join(' / ')}, average price ${FRUITS.map((f) => r2(price(c, f))).join(' / ')} (${F}).\n`);
console.log(`| Event | Delivered ${F} | Wanted ${F} | Bought ${F} | Sold ${F} | Price ${F} | Income / stall | Fruit spend / stall | Net / stall | SE | Lost that night / stall | Uneven hit (avg abs) | Best vs worst stall | Rich minus poor |`);
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
EVENT_CARDS.forEach((card, e) => {
  if (e === CALM) return;
  const a = acc[e];
  const d4 = (k: 'del' | 'want' | 'sold' | 'bought') => FRUITS.map((f) => sg(per(a, k, f) - per(c, k, f))).join(' / ');
  console.log(`| ${card.title} | ${d4('del')} | ${d4('want')} | ${d4('bought')} | ${d4('sold')} | ${FRUITS.map((f) => sg(price(a, f) - price(c, f))).join(' / ')} | ${sg(avg(a.dInc))} | ${sg(avg(a.dSpend))} | ${sg(avg(a.dNet))} | ${r2(se(a.dNet))} | ${sg(avg(a.dSpoil))} | ${r2(avg(a.swing))} | ${r1(avg(a.maxSwing))} | ${sg(avg(a.dWinnerGap))} |`);
});
const ins = acc[EVENT_CARDS.findIndex((x) => x.inspector)];
console.log(`\nHealth Inspector: average fine $${r2(avg(ins.fine))} per stall, ${r1((100 * ins.fined) / ins.stalls)}% of stalls fined, average fine when fined $${r2(avg(ins.fine.filter((x) => x > 0)))}, largest $${ins.maxFine}.`);
