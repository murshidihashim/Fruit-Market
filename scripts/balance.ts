// Balance report: plays many all-computer games and measures where the game is lopsided.
// Run: npx vite-node scripts/balance.ts [games-per-test]
// Prints JSON lines (one per test) followed by a readable summary.
import { aiStep, pickUpgrade } from '../src/engine/ai';
import { EVENT_CARDS, FRUITS, TRAITS, UPGRADES, type FruitId, type TraitId, type UpgradeId } from '../src/engine/data';

import {
  beginBuying, buyUpgrade, canUpgrade, count, endEvening, finishReveal, newGame, ranking,
  activePlayer, pickTrait, type GameState, type Level,
} from '../src/engine/game';

const G = Number(process.argv[2] ?? 400);
const UPS = Object.keys(UPGRADES) as UpgradeId[];
let ORDER_RULE: 'default' | 'rotate' | 'snake' = 'default';

interface Policy { upgrades?: 'ai' | 'none' | UpgradeId[]; ban?: UpgradeId }

interface Track {
  bought: Record<FruitId, number>; cost: Record<FruitId, number>;
  sold: Record<FruitId, number>; revenue: Record<FruitId, number>;
  dayIncome: number[][]; // [day][player]
  dayEvent: (string | null)[];
  cashByDay: number[][];
  firstBuyer: number[]; // days each player bought first
  priceWar: number; sales: number; capSales: number;
  demand: number; served: number;
  upgradeDay: Partial<Record<UpgradeId, number[]>>;
}

const zero = () => Object.fromEntries(FRUITS.map((f) => [f, 0])) as Record<FruitId, number>;

function play(levels: Level[], seed: number, days = 10, policy: Policy[] = [], opts: Partial<{ events: boolean; upgrades: boolean; traits: TraitId[] }> = {}) {
  let s: GameState = newGame({
    players: levels.map((l, i) => ({ name: `P${i}`, kind: (opts.traits ? 'human' : 'ai') as 'human' | 'ai', level: l, avatar: '' })),
    days, unripe: true, upgrades: opts.upgrades ?? true, events: opts.events ?? true, seed,
  });
  if (opts.traits) {
    // Hand out fixed traits, then let the computer play every seat.
    opts.traits.forEach((t, i) => { s.players[i].traitOffer = [t]; s = pickTrait(s, i, t); });
    s.players.forEach((pl) => { pl.kind = 'ai'; });
  }
  const t: Track = {
    bought: zero(), cost: zero(), sold: zero(), revenue: zero(), dayIncome: [], dayEvent: [], cashByDay: [],
    firstBuyer: levels.map(() => 0), priceWar: 0, sales: 0, capSales: 0, demand: 0, served: 0, upgradeDay: {},
  };
  for (let i = 0; i < 20000 && s.phase !== 'over'; i++) {
    if (s.phase === 'morning') {
      if (ORDER_RULE !== 'default' && s.day > 1) {
        s = JSON.parse(JSON.stringify(s));
        const ids = s.players.map((_, i) => i);
        // The old rule: first buyer simply rotates round the table.
        if (ORDER_RULE === 'rotate') s.order = ids.map((_, k) => (s.firstPlayer + k) % ids.length);
        if (ORDER_RULE === 'snake' && s.day % 2 === 0) s.order = [...s.order].reverse();
      }
      t.firstBuyer[s.order[0]]++; s = beginBuying(s); continue;
    }
    if (s.phase === 'reveal') {
      const r = s.results!;
      t.dayIncome.push(r.income.slice());
      t.dayEvent.push(s.event?.id ?? null);
      for (const l of r.lines) {
        t.demand += l.want;
        for (const o of l.offers) if (o.sold) {
          t.sold[l.fruit] += o.sold; t.revenue[l.fruit] += o.sold * o.price; t.sales += o.sold; t.served += o.sold;
          if (o.price <= 2) t.priceWar += o.sold;
          if (o.price >= l.max - 1) t.capSales += o.sold;
        }
      }
      s = finishReveal(s);
      t.cashByDay.push(s.players.map((p) => p.cash));
      continue;
    }
    const p = activePlayer(s);
    const pol = policy[p]?.upgrades ?? 'ai';
    const ban = policy[p]?.ban;
    if (s.phase === 'evening' && ban) {
      const next = aiStep(s)!;
      if (!(next.players[p].upgrades.length > s.players[p].upgrades.length)) { s = next; continue; }
      const pick = pickUpgrade(s, p, ban);
      s = pick ? buyUpgrade(s, p, pick) : endEvening(s, p);
      continue;
    }
    if (s.phase === 'evening' && pol !== 'ai') {
      const want = pol === 'none' ? [] : pol;
      const u = want.find((x) => !canUpgrade(s, p, x));
      if (u) { s = buyUpgrade(s, p, u); (t.upgradeDay[u] ??= []).push(s.day); continue; }
      // Let the AI play a Priority card, but never let it pick its own upgrades.
      const next = aiStep(s)!;
      const built = next.players[p].upgrades.length > s.players[p].upgrades.length;
      s = built ? endEvening(s, p) : next;
      continue;
    }
    if (s.phase === 'buy') {
      const before = s.players[p];
      const next = aiStep(s)!;
      const after = next.players[p];
      if (after.boughtToday > before.boughtToday) {
        for (const f of FRUITS) {
          const d = count(after.stock, f) - count(before.stock, f);
          if (d > 0) { t.bought[f] += d; t.cost[f] += before.cash - after.cash; }
        }
      }
      s = next;
      continue;
    }
    if (s.phase === 'evening') {
      const next = aiStep(s)!;
      for (const u of next.players[p].upgrades) if (!s.players[p].upgrades.includes(u)) (t.upgradeDay[u] ??= []).push(s.day);
      s = next;
      continue;
    }
    s = aiStep(s)!;
  }
  return { s, t };
}

const pct = (a: number, b: number) => (b ? Math.round((1000 * a) / b) / 10 : 0);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const median = (xs: number[]) => { const y = [...xs].sort((a, b) => a - b); return y.length ? y[Math.floor(y.length / 2)] : 0; };
const out: Record<string, unknown> = {};
const log = (k: string, v: unknown) => { out[k] = v; console.log(JSON.stringify({ test: k, ...(v as object) })); };

if (!process.env.ONLY_EXP && !process.env.ONLY_TRAITS) {
// 1. Turn order: identical computer players. Does buying first more often win?
for (const n of [2, 3, 4]) {
  const wins = new Array(n).fill(0);
  const byFirsts: Record<number, [number, number]> = {};
  const margins: number[] = [];
  let midLeaderWins = 0, leadChanges = 0, ties = 0, comebacks = 0;
  for (let seed = 1; seed <= G; seed++) {
    const { s, t } = play(Array(n).fill('hard'), seed);
    const r = ranking(s);
    wins[r[0]]++;
    const cash = s.players.map((p) => p.cash).sort((a, b) => b - a);
    margins.push(cash[0] - cash[1]);
    if (cash[0] === cash[1]) ties++;
    t.firstBuyer.forEach((k, p) => { byFirsts[k] ??= [0, 0]; byFirsts[k][1]++; if (p === r[0]) byFirsts[k][0]++; });
    const leaders = t.cashByDay.map((c) => c.indexOf(Math.max(...c)));
    for (let d = 1; d < leaders.length; d++) if (leaders[d] !== leaders[d - 1]) leadChanges++;
    if (leaders[4] === r[0]) midLeaderWins++;
    // Comeback: winner was last on day 5.
    const d5 = t.cashByDay[4];
    if (d5 && d5.indexOf(Math.min(...d5)) === r[0]) comebacks++;
  }
  log(`order-${n}p`, {
    winBySeat: wins.map((w) => pct(w, G)),
    winRateByDaysBuyingFirst: Object.fromEntries(Object.entries(byFirsts).map(([k, [w, c]]) => [k, `${pct(w, c)}% of ${c}`])),
    fair: pct(1, n), medianMargin: median(margins), closeGames: pct(margins.filter((m) => m <= 3).length, G),
    blowouts: pct(margins.filter((m) => m >= 20).length, G), ties: pct(ties, G),
    day5LeaderWins: pct(midLeaderWins, G), leadChangesPerGame: +(leadChanges / G).toFixed(2), comebackFromLast: pct(comebacks, G),
  });
}

// 2. Skill: does the better computer win, and by how much?
for (const [a, b, n] of [['hard', 'normal', 2], ['hard', 'easy', 2], ['normal', 'easy', 2], ['hard', 'normal', 3], ['hard', 'easy', 4]] as [Level, Level, number][]) {
  let w = 0;
  const gap: number[] = [];
  for (let seed = 1; seed <= G; seed++) {
    const lv = [a, ...Array(n - 1).fill(b)] as Level[];
    // Rotate the strong player through seats so seat luck cancels out.
    const seat = seed % n;
    [lv[0], lv[seat]] = [lv[seat], lv[0]];
    const { s } = play(lv, seed);
    if (ranking(s)[0] === seat) w++;
    const others = s.players.filter((_, i) => i !== seat).map((p) => p.cash);
    gap.push(s.players[seat].cash - avg(others));
  }
  log(`skill-${a}-vs-${b}-${n}p`, { strongWins: pct(w, G), fair: pct(1, n), avgCashGap: +avg(gap).toFixed(1) });
}

// 3. Economy per fruit, pacing, events (4-player and 2-player mirrors).
for (const n of [2, 4]) {
  const agg = { bought: zero(), cost: zero(), sold: zero(), revenue: zero() };
  const incomeByDay: number[][] = Array.from({ length: 10 }, () => []);
  const ev: Record<string, number[]> = {};
  const evRel: Record<string, number[]> = {};
  const games: { inc: number[][]; evs: (string | null)[] }[] = [];
  const evSpread: Record<string, number[]> = {};
  let priceWar = 0, sales = 0, capSales = 0, demand = 0, served = 0, spoiled = 0, endStock = 0, finalCash: number[] = [];
  const upDay: Record<string, number[]> = {};
  let deadDays = 0;
  for (let seed = 1; seed <= G; seed++) {
    const { s, t } = play(Array(n).fill('hard'), seed);
    for (const f of FRUITS) for (const k of ['bought', 'cost', 'sold', 'revenue'] as const) agg[k][f] += t[k][f];
    games.push({ inc: t.dayIncome, evs: t.dayEvent });
    t.dayIncome.forEach((inc, d) => {
      const tot = inc.reduce((a, b) => a + b, 0);
      incomeByDay[d].push(tot / n);
      if (tot === 0) deadDays++;
      const k = t.dayEvent[d] ?? 'calm';
      (ev[k] ??= []).push(tot / n);
      (evSpread[k] ??= []).push(Math.max(...inc) - Math.min(...inc));
    });
    priceWar += t.priceWar; sales += t.sales; capSales += t.capSales; demand += t.demand; served += t.served;
    for (const p of s.players) { spoiled += p.stats.spoiled; endStock += count(p.stock); finalCash.push(p.cash); }
    for (const [u, ds] of Object.entries(t.upgradeDay)) (upDay[u] ??= []).push(...ds!);
  }
  const fruits = Object.fromEntries(FRUITS.map((f) => {
    const b = agg.bought[f], so = agg.sold[f];
    return [f, {
      boughtPerGame: +(b / G).toFixed(1), sellThrough: pct(so, b), avgCost: +(agg.cost[f] / Math.max(1, b)).toFixed(2),
      avgSale: +(agg.revenue[f] / Math.max(1, so)).toFixed(2),
      profitPerFruitBought: +((agg.revenue[f] - agg.cost[f]) / Math.max(1, b)).toFixed(2),
      profitPerGame: +((agg.revenue[f] - agg.cost[f]) / G / n).toFixed(1),
    }];
  }));
  const dayAvg = incomeByDay.map(avg);
  for (const g of games) g.inc.forEach((inc, d) => { if (d === 0) return; const k = g.evs[d] ?? 'calm'; (evRel[k] ??= []).push(inc.reduce((a, b) => a + b, 0) / n - dayAvg[d]); });
  log(`economy-${n}p`, {
    fruits,
    avgFinalCash: +avg(finalCash).toFixed(1), incomePerPlayerByDay: incomeByDay.map((x) => +avg(x).toFixed(1)),
    demandServed: pct(served, demand), priceWarSales: pct(priceWar, sales), salesNearCustomerMax: pct(capSales, sales),
    spoiledPerPlayer: +(spoiled / G / n).toFixed(1), unsoldAtEndPerPlayer: +(endStock / G / n).toFixed(1),
    deadDaysPerGame: +(deadDays / G).toFixed(2),
    upgradesBuiltPerGame: Object.fromEntries(Object.entries(upDay).map(([u, d]) => [u, { perPlayer: +(d.length / G / n).toFixed(2), avgDay: +avg(d).toFixed(1) }])),
    events: Object.fromEntries(Object.entries(ev).map(([k, xs]) => [k, {
      days: xs.length, incomeVsSameDayAvg: +avg(evRel[k] ?? []).toFixed(1),
      avgSpread: +avg(evSpread[k]).toFixed(1),
    }])),
  });
}

// 4. Upgrades: one player follows a fixed upgrade rule, rivals play normally (all 'hard', 3 players).
{
  const n = 3;
  const res: Record<string, unknown> = {};
  const rules: [string, Policy['upgrades']][] = [
    ['ai (control)', 'ai'], ['never', 'none'],
    ...UPS.map((u) => [`rush ${u}`, [u]] as [string, UpgradeId[]]),
    ['rush all', UPS],
  ];
  const bans: [string, UpgradeId][] = UPS.map((u) => [`ai but never ${u}`, u]);
  for (const [label, rule, ban] of [...rules.map(([l, r]) => [l, r, undefined] as const), ...bans.map(([l, u]) => [l, 'ai', u] as const)]) {
    let w = 0;
    const gap: number[] = [];
    for (let seed = 1; seed <= G; seed++) {
      const seat = seed % n;
      const pol: Policy[] = [];
      pol[seat] = { upgrades: rule as Policy['upgrades'], ban };
      const { s } = play(Array(n).fill('hard'), seed, 10, pol);
      if (ranking(s)[0] === seat) w++;
      gap.push(s.players[seat].cash - avg(s.players.filter((_, i) => i !== seat).map((p) => p.cash)));
    }
    res[label] = { winRate: pct(w, G), avgCashGap: +avg(gap).toFixed(1) };
  }
  log('upgrades-3p', { fair: pct(1, n), ...res });
}

// 5. Game length and toggles (3 players, mirror).
for (const [label, days, o] of [['8 days', 8, {}], ['10 days', 10, {}], ['14 days', 14, {}], ['no events', 10, { events: false }], ['no upgrades', 10, { upgrades: false }]] as [string, number, object][]) {
  const margins: number[] = [], cash: number[] = [];
  let leadChanges = 0;
  for (let seed = 1; seed <= G; seed++) {
    const { s, t } = play(['hard', 'hard', 'hard'], seed, days, [], o);
    const c = s.players.map((p) => p.cash).sort((a, b) => b - a);
    margins.push(c[0] - c[1]); cash.push(...c);
    const leaders = t.cashByDay.map((x) => x.indexOf(Math.max(...x)));
    for (let d = 1; d < leaders.length; d++) if (leaders[d] !== leaders[d - 1]) leadChanges++;
  }
  log(`length-${label}`, { avgCash: +avg(cash).toFixed(1), medianMargin: median(margins), closeGames: pct(margins.filter((m) => m <= 3).length, G), leadChangesPerGame: +(leadChanges / G).toFixed(2) });
}

}

void EVENT_CARDS;

// 7. Traits: one seat gets each trait, rivals get random other traits (3 players, mirror).
if (!process.env.ONLY_EXP) {
  const all = Object.keys(TRAITS) as TraitId[];
  const res: Record<string, unknown> = {};
  for (const t of all) {
    let w = 0;
    const gap: number[] = [];
    for (let seed = 1; seed <= G; seed++) {
      const seat = seed % 3;
      const rest = all.filter((x) => x !== t);
      const traits = [0, 1, 2].map((i) => (i === seat ? t : rest[(seed * 7 + i * 3) % rest.length]));
      const { s } = play(['hard', 'hard', 'hard'], seed, 10, [], { traits });
      if (ranking(s)[0] === seat) w++;
      gap.push(s.players[seat].cash - avg(s.players.filter((_, i) => i !== seat).map((p) => p.cash)));
    }
    res[t] = { winRate: pct(w, G), avgCashGap: +avg(gap).toFixed(1) };
  }
  log('traits-3p', { fair: 33.3, ...res });
}

// 6. Experiments: try candidate rule tweaks and compare against the current rules (3 players, mirror).
function measure(label: string) {
  const n = 3;
  const margins: number[] = [];
  let midLeader = 0, comeback = 0, w4 = 0, c4 = 0, w2 = 0, c2 = 0;
  const prof = zero(), bought = zero();
  for (let seed = 1; seed <= G; seed++) {
    const { s, t } = play(['hard', 'hard', 'hard'], seed);
    const r = ranking(s);
    const c = s.players.map((p) => p.cash).sort((a, b) => b - a);
    margins.push(c[0] - c[1]);
    const leaders = t.cashByDay.map((x) => x.indexOf(Math.max(...x)));
    if (leaders[4] === r[0]) midLeader++;
    const d5 = t.cashByDay[4];
    if (d5.indexOf(Math.min(...d5)) === r[0]) comeback++;
    t.firstBuyer.forEach((k, p) => { if (k >= 4) { c4++; if (p === r[0]) w4++; } if (k <= 2) { c2++; if (p === r[0]) w2++; } });
    for (const f of FRUITS) { prof[f] += t.revenue[f] - t.cost[f]; bought[f] += t.bought[f]; }
  }
  // Upgrade check: a player who never builds the Handcart.
  let wNo = 0;
  for (let seed = 1; seed <= G; seed++) {
    const seat = seed % n; const pol: Policy[] = []; pol[seat] = { ban: 'cart' };
    if (ranking(play(['hard', 'hard', 'hard'], seed, 10, pol).s)[0] === seat) wNo++;
  }
  log(`exp-${label}`, {
    medianMargin: median(margins), closeGames: pct(margins.filter((m) => m <= 3).length, G), blowouts: pct(margins.filter((m) => m >= 20).length, G),
    day5LeaderWins: pct(midLeader, G), comebackFromLast: pct(comeback, G),
    winIfBuyFirst4Plus: pct(w4, c4), winIfBuyFirst2OrLess: pct(w2, c2), winWithoutHandcart: pct(wNo, G),
    profitPerFruit: Object.fromEntries(FRUITS.map((f) => [f, +(prof[f] / Math.max(1, bought[f])).toFixed(2)])),
  });
}
const tweak = (label: string, apply: () => () => void) => { const undo = apply(); measure(label); undo(); };
if (!process.env.ONLY_TRAITS) measure(process.env.LABEL ?? 'current');
if (!process.env.ONLY_EXP) {
tweak('old order: first buyer rotates', () => { ORDER_RULE = 'rotate'; return () => { ORDER_RULE = 'default'; }; });
}
