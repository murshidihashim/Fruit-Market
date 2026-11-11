// Focal-seat A/B tests: one seat (rotating with the seed) follows a rule, the others play as usual.
// Every variant uses the same seeds, so cash differences against the control are paired.
// npx vite-node docs/studio/review-17/balance/scripts18/focal.ts -- --test upgrades|favours|orders|drain|noperk --n 3 --games 700 [--days 10] [--patch a,b]
import { FAVOURS, UPGRADES, type FavourId, type UpgradeId } from '../../../../../src/engine/data';
import type { Level } from '../../../../../src/engine/game';
import { ALL_TRAITS, arg, avg, playGame, r1, r2, se, sePct, type GameLog, type Opts, type SeatPolicy } from './harness';
import { TRAITS, type TraitId } from '../../../../../src/engine/data';
import { Rng } from '../../../../../src/engine/rng';
import { applyVariant } from './patches';

const test = arg('test', 'upgrades')!;
const n = Number(arg('n', '3')), G = Number(arg('games', '300')), days = Number(arg('days', '10')), seed0 = Number(arg('seed0', '1'));
const level = (arg('level', 'normal') ?? 'normal') as Level;
const label = applyVariant();
const UPS = Object.keys(UPGRADES) as UpgradeId[];
const FAVS = Object.keys(FAVOURS) as FavourId[];

interface Variant { name: string; opts: (seat: number) => Partial<Opts>; extra?: (g: GameLog, seat: number) => Record<string, number> }
const pol = (seat: number, p: SeatPolicy): SeatPolicy[] => { const a: SeatPolicy[] = []; a[seat] = p; return a; };
let variants: Variant[] = [];
if (test === 'upgrades') {
  const built = (u: UpgradeId) => (g: GameLog, seat: number) => {
    const d = g.days.find((x) => x.upg.some(([p, x2]) => p === seat && x2 === u));
    return { built: d ? 1 : 0, day: d ? d.day : NaN };
  };
  variants = [
    { name: 'never builds', opts: (s) => ({ policy: pol(s, { upgrades: 'none' }) }) },
    ...UPS.map((u) => ({ name: `${UPGRADES[u].title} only ($${UPGRADES[u].cost})`, opts: (s: number) => ({ policy: pol(s, { upgrades: [u] }) }), extra: built(u) })),
    { name: 'computer chooses', opts: () => ({}) , extra: (g: GameLog, seat: number) => ({ built: g.upgrades[seat].length }) },
  ];
} else if (test === 'favours') {
  variants = [
    { name: 'no free card', opts: () => ({ scoutAll: true }) },
    ...FAVS.map((f) => ({ name: `free ${FAVOURS[f].title}`, opts: (s: number) => ({ scoutAll: true, gift: [{ seat: s, favour: f }] }),
      extra: (g: GameLog, seat: number) => ({ played: g.days.reduce((a, d) => a + d.favPlayed.filter(([p, c]) => p === seat && c === f).length, 0) }) })),
  ];
} else if (test === 'orders') {
  const ex = (g: GameLog, seat: number) => {
    const mine = g.orders.filter((o) => o.holder === seat);
    return { held: mine.length, stakeLost: mine.reduce((a, o) => a + (o.res ? o.res.stake - o.res.back : 0), 0), short: mine.reduce((a, o) => a + (o.res?.short ?? 0), 0), full: mine.filter((o) => o.res && o.res.short === 0).length };
  };
  variants = [
    { name: 'computer bids', opts: () => ({}), extra: ex },
    { name: 'always passes', opts: (s) => ({ policy: pol(s, { order: 'pass' }) }), extra: ex },
    { name: 'always bids the ceiling', opts: (s) => ({ policy: pol(s, { order: 'ceiling' }) }), extra: ex },
    { name: 'always bids 60% of the ceiling', opts: (s) => ({ policy: pol(s, { order: 0.6 }) }), extra: ex },
    { name: 'always bids half the ceiling', opts: (s) => ({ policy: pol(s, { order: 0.5 }) }), extra: ex },
    { name: 'always bids $1', opts: (s) => ({ policy: pol(s, { order: 1 }) }), extra: ex },
  ];
} else if (test === 'firstbuyer') {
  variants = [
    { name: 'usual rule (poorest buys first)', opts: () => ({}) },
    { name: 'always buys first', opts: (s) => ({ forceFirst: s }) },
    { name: 'always buys last', opts: (s) => ({ forceLast: s }) },
  ];
} else if (test === 'drain') {
  variants = [
    { name: 'computer chooses upgrades', opts: () => ({}) },
    { name: 'spends every dollar on upgrades as early as it can', opts: (s) => ({ policy: pol(s, { upgrades: ['barrow', 'ripening', 'juicebar', 'premium', 'orderbook'], upgradesAll: true }) }) },
  ];
}

if (test === 'perks') {
  // The focal seat holds no perk (first row), then each perk in turn; rivals hold random distinct perks from the other seven.
  let seedNow = 0;
  const rivals = (seat: number, mine: TraitId | null): (TraitId | null)[] => {
    const r = new Rng((seedNow * 2654435761 + 777) >>> 0); r.float();
    const rest = r.shuffle(ALL_TRAITS.filter((x) => x !== mine));
    // Keep the rivals the same whichever perk the focal seat holds, as far as possible.
    const out: (TraitId | null)[] = [];
    let k = 0;
    for (let i = 0; i < n; i++) out.push(i === seat ? mine : rest[k++]);
    return out;
  };
  const mk = (name: string, t: TraitId | null): Variant => ({ name, opts: (s) => ({ traits: rivals(s, t) }) });
  variants = [mk('no perk', null), ...ALL_TRAITS.map((t) => mk(TRAITS[t].title, t))];
  const base = variants.map((v) => v.opts);
  variants.forEach((v, i) => { v.opts = (s) => base[i](s); });
  // seedNow is set in the loop below through this hook.
  (globalThis as { __seed?: (x: number) => void }).__seed = (x: number) => { seedNow = x; };
}

console.log(`\n### ${test}: ${n} stalls, ${level} AI, ${days} days, ${G} games per row, focal seat rotates [${label}]\n`);
console.log('| Focal seat rule | Win % | SE | Cash | Cash vs average rival | Cash change vs first row (paired) | SE | Notes |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
let control: number[] = [];
// --rows 0,1 keeps only those rows of the test (the first kept row is the control).
const rows = arg('rows');
if (rows) variants = rows.split(',').map((k) => variants[Number(k)]);
for (const v of variants) {
  let w = 0;
  const cash: number[] = [], gap: number[] = [];
  const ex: Record<string, number[]> = {};
  for (let g = 0; g < G; g++) {
    const seed = seed0 + g, seat = seed % n;
    (globalThis as { __seed?: (x: number) => void }).__seed?.(seed);
    const log = playGame({ n, seed, days, levels: Array(n).fill(level), ...v.opts(seat) });
    // Rules 18: a shared win counts as a share of a win.
    if (log.winners.includes(seat)) w += 1 / log.winners.length;
    cash.push(log.cash[seat]);
    gap.push(log.cash[seat] - avg(log.cash.filter((_, i) => i !== seat)));
    if (v.extra) for (const [k, x] of Object.entries(v.extra(log, seat))) if (!Number.isNaN(x)) (ex[k] ??= []).push(x);
  }
  if (!control.length) control = cash;
  const diff = cash.map((c, i) => c - control[i]);
  const notes = Object.entries(ex).map(([k, xs]) => `${k} ${r2(avg(xs))}`).join(', ');
  console.log(`| ${v.name} | ${r1((100 * w) / G)} | ${r1(sePct(w / G, G))} | ${r1(avg(cash))} | ${r1(avg(gap))} | ${r2(avg(diff))} | ${r2(se(diff))} | ${notes} |`);
}
