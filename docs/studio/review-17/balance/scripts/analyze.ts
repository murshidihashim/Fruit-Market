// Reads a baseline batch (sim.ts JSON lines) and prints the measurement tables as markdown.
// npx vite-node scripts/lab/analyze.ts -- --in out/base-n3-normal.jsonl [--sections 1,2,4,5,6,7,8]
import { readFileSync } from 'node:fs';
import { EVENT_CARDS, FAVOURS, FRUIT, FRUITS, JUICE_VALUE, TRAITS, UPGRADES, type FavourId, type FruitId, type TraitId, type UpgradeId } from '../../src/engine/data';
import { ALL_TRAITS, arg, avg, median, r1, r2, sd, se, sePct, zeroF, type GameLog } from './harness';

const file = arg('in')!;
const want = new Set((arg('sections', '1,2,3,4,5,6,7,8') ?? '').split(','));
const games: GameLog[] = readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const G = games.length, n = games[0].n, D = games[0].ndays;
const fair = 100 / n;
const row = (...c: (string | number)[]) => console.log(`| ${c.join(' | ')} |`);
const head = (...c: string[]) => { row(...c); row(...c.map(() => '---')); };
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const sumF = (o: Record<FruitId, number>) => FRUITS.reduce((a, f) => a + o[f], 0);
console.log(`\n### ${file.split('/').pop()}: ${n} stalls, ${games[0].levels.join('/')} AI, ${D} days, ${G} games\n`);

// ---------- 1. shopkeepers ----------
if (want.has('1')) {
  console.log(`**Shopkeepers** (fair = ${r1(fair)}%)\n`);
  head('Perk', 'Seats', 'Win %', 'SE', 'vs fair', 'Avg cash', 'Cash vs table', 'SE', 'Sole serves/game', 'Favours earned', 'Pieces bought', 'Spoiled', 'Perk cash/game');
  for (const t of ALL_TRAITS) {
    let N = 0, w = 0;
    const cash: number[] = [], rel: number[] = [], sole: number[] = [], fav: number[] = [], bought: number[] = [], spoil: number[] = [], perk: number[] = [];
    for (const g of games) {
      const p = g.traits.indexOf(t);
      if (p < 0) continue;
      N++;
      if (g.rank[0] === p) w++;
      cash.push(g.cash[p]);
      rel.push(g.cash[p] - avg(g.cash));
      const ss = sum(g.days.map((d) => d.soleServes[p]));
      sole.push(ss);
      fav.push(g.days.reduce((a, d) => a + d.favEarned.filter((e) => e[0] === p).length, 0));
      bought.push(sum(g.days.map((d) => d.bought[p])));
      spoil.push(sum(g.days.map((d) => d.spoiledBy[p] ?? 0)));
      perk.push(t === 'favourite' ? 2 * ss : t === 'earful' ? sum(g.days.map((d) => d.tips[p])) : t === 'nestegg' ? 8 : NaN);
    }
    row(TRAITS[t].title, N, r1((100 * w) / N), r1(sePct(w / N, N)), (100 * w / N - fair >= 0 ? '+' : '') + r1((100 * w) / N - fair), r1(avg(cash)), (avg(rel) >= 0 ? '+' : '') + r1(avg(rel)), r1(se(rel)), r2(avg(sole)), r2(avg(fav)), r1(avg(bought)), r2(avg(spoil)), Number.isNaN(perk[0]) ? '' : r1(avg(perk)));
  }
  console.log('');
}

// ---------- 2. fruit ----------
if (want.has('2')) {
  console.log('**Fruit roles** (per game, whole table)\n');
  const a = { del: zeroF(), bought: zeroF(), free: zeroF(), cost: zeroF(), row: zeroF(), rev: zeroF(), ord: zeroF(), revOrd: zeroF(), hawk: zeroF(), tip: zeroF(), spoil: zeroF(), left: zeroF(), jam: zeroF(), green: zeroF(), nights: zeroF(), wanted: zeroF(), shortDays: zeroF(), wantDays: zeroF(), unservedDays: zeroF() };
  const st = Object.fromEntries(FRUITS.map((f) => [f, [0, 0, 0]])) as Record<FruitId, number[]>;
  let juicedAll = 0, leftAll = 0;
  for (const g of games) {
    for (const d of g.days) {
      for (const f of FRUITS) {
        a.del[f] += d.delivery[f]; a.bought[f] += d.boughtF[f]; a.free[f] += d.freeF[f]; a.cost[f] += d.costF[f];
        a.row[f] += d.soldRow[f]; a.rev[f] += d.revRow[f]; a.ord[f] += d.soldOrder[f]; a.revOrd[f] += d.revOrder[f];
        a.hawk[f] += d.soldHawker[f]; a.tip[f] += d.juiceTip[f]; a.spoil[f] += d.spoiledF[f]; a.left[f] += d.leftF[f];
        a.nights[f] += d.shelfNight[f]; a.wanted[f] += d.wanted[f];
        d.soldStage[f].forEach((x, i) => { st[f][i] += x; });
        if (d.wanted[f] > 0) {
          a.wantDays[f]++;
          if (d.wanted[f] > d.offered[f] - d.soldOrder[f]) a.shortDays[f]++;
          if (d.soldRow[f] < d.wanted[f]) a.unservedDays[f]++;
        }
      }
      juicedAll += d.juiced; leftAll += sumF(d.leftF);
    }
    for (const f of FRUITS) { a.jam[f] += g.jamF[f]; a.green[f] += g.greenLeftF[f]; }
  }
  const juiceShare = leftAll ? juicedAll / leftAll : 0;
  const profit = (f: FruitId) => a.rev[f] + a.tip[f] + a.revOrd[f] + 3 * a.hawk[f] + JUICE_VALUE * juiceShare * a.left[f] + a.jam[f] - a.cost[f];
  const totalProfit = sum(FRUITS.map(profit));
  head('Fruit', 'Delivered', 'Bought', '% of lorry bought', 'Free (favour)', 'Sold to row', 'Sold to order', 'Hawker', 'Spoiled', 'Juiced', 'Jam (ripe left)', 'Green left', 'Avg cost', 'Avg row price', 'Profit / piece bought', 'Share of profit %');
  for (const f of FRUITS) {
    row(FRUIT[f].name, r1(a.del[f] / G), r1(a.bought[f] / G), r1((100 * a.bought[f]) / a.del[f]), r2(a.free[f] / G), r1(a.row[f] / G), r2(a.ord[f] / G), r2(a.hawk[f] / G),
      r2((a.left[f] * (1 - juiceShare)) / G), r2((a.left[f] * juiceShare) / G), r2(a.jam[f] / G), r2(a.green[f] / G), r2(a.cost[f] / a.bought[f]), r2(a.rev[f] / a.row[f]), r2(profit(f) / a.bought[f]), r1((100 * profit(f)) / totalProfit));
  }
  console.log('');
  head('Fruit', 'Sold Fresh %', 'Okay %', 'Soft %', 'Nights on shelf / piece', 'Loss rate % (spoiled+juiced / got)', 'Wanted / game', 'Row demand served %', 'Days wanted > put out %', 'Days some demand unserved %');
  for (const f of FRUITS) {
    const tot = sum(st[f]);
    row(FRUIT[f].name, r1((100 * st[f][0]) / tot), r1((100 * st[f][1]) / tot), r1((100 * st[f][2]) / tot), r2(a.nights[f] / (a.bought[f] + a.free[f])), r1((100 * a.left[f]) / (a.bought[f] + a.free[f])), r1(a.wanted[f] / G), r1((100 * a.row[f]) / a.wanted[f]), r1((100 * a.shortDays[f]) / a.wantDays[f]), r1((100 * a.unservedDays[f]) / a.wantDays[f]));
  }
  console.log('');
}

// ---------- 3. upgrades (purchase rates only; the A/B is in upgrades.ts) ----------
if (want.has('3')) {
  console.log('**Upgrades the computer built**\n');
  head('Upgrade', 'Cost', '% of stalls that built it', 'Avg day built', 'Win % of stalls with it', 'Win % without', 'Cash vs table with it');
  const UPS = Object.keys(UPGRADES) as UpgradeId[];
  for (const u of UPS) {
    let have = 0, wWith = 0, wWithout = 0;
    const dayB: number[] = [], rel: number[] = [];
    for (const g of games) {
      g.upgrades.forEach((ups, p) => {
        if (ups.includes(u)) { have++; if (g.rank[0] === p) wWith++; rel.push(g.cash[p] - avg(g.cash)); } else if (g.rank[0] === p) wWithout++;
      });
      for (const d of g.days) for (const [, x] of d.upg) if (x === u) dayB.push(d.day);
    }
    row(UPGRADES[u].title, `$${UPGRADES[u].cost}`, r1((100 * have) / (G * n)), r1(avg(dayB)), r1((100 * wWith) / Math.max(1, have)), r1((100 * wWithout) / Math.max(1, G * n - have)), r1(avg(rel)));
  }
  const cnt = [0, 0, 0];
  for (const g of games) for (const ups of g.upgrades) cnt[ups.length]++;
  console.log(`\nStalls ending with 0 / 1 / 2 upgrades: ${cnt.map((c) => r1((100 * c) / (G * n)) + '%').join(' / ')}\n`);
}

// ---------- 4. favours ----------
if (want.has('4')) {
  console.log('**Favours** (per game, whole table unless stated)\n');
  const ids = Object.keys(FAVOURS) as FavourId[];
  const earned: Record<string, number> = {}, played: Record<string, number> = {}, left: Record<string, number> = {}, start: Record<string, number> = {};
  let resh = 0, gamesResh = 0, emptyDays = 0, soleTotal = 0, earnedTotal = 0;
  const perStallEarned: number[] = [];
  for (const g of games) {
    let r = 0;
    const per = new Array(n).fill(0);
    for (const d of g.days) {
      for (const [p, c] of d.favEarned) { earned[c] = (earned[c] ?? 0) + 1; per[p]++; earnedTotal++; }
      for (const [, c] of d.favPlayed) played[c] = (played[c] ?? 0) + 1;
      r += d.reshuffle; if (d.deckEmptyAtEnd) emptyDays++;
      soleTotal += sum(d.soleServes);
    }
    resh += r; if (r > 0) gamesResh++;
    g.favLeft.forEach((h) => h.forEach((c) => { left[c] = (left[c] ?? 0) + 1; }));
    g.favStart.forEach((h) => h.forEach((c) => { start[c] = (start[c] ?? 0) + 1; }));
    perStallEarned.push(...per);
  }
  head('Card', 'Dealt at start (Charmer)', 'Earned', 'Played', 'Unplayed at end', '% of copies gained that were played');
  for (const c of ids) row(FAVOURS[c].title, r2((start[c] ?? 0) / G), r2((earned[c] ?? 0) / G), r2((played[c] ?? 0) / G), r2((left[c] ?? 0) / G), r1((100 * (played[c] ?? 0)) / Math.max(1, (earned[c] ?? 0) + (start[c] ?? 0))));
  console.log(`\nFavours earned per stall per game: ${r2(avg(perStallEarned))} (sd ${r2(sd(perStallEarned))}); sole serves per game (table): ${r2(soleTotal / G)}; of those that drew a card: ${r1((100 * earnedTotal) / soleTotal)}%.`);
  console.log(`Deck reshuffles per game: ${r2(resh / G)}; games with at least one reshuffle: ${r1((100 * gamesResh) / G)}%; days ending with an empty deck: ${r1((100 * emptyDays) / (G * D))}%.\n`);
}

// ---------- 5. events (in-sample, against the same day number) ----------
if (want.has('5')) {
  console.log('**Events in the batch** (difference from the average of the same day number; see events.ts for the paired test)\n');
  const base: Record<number, { inc: number[]; spoil: number[] }> = {};
  for (const g of games) for (const d of g.days) { (base[d.day] ??= { inc: [], spoil: [] }); base[d.day].inc.push(avg(d.income)); base[d.day].spoil.push(sumF(d.leftF) / n); }
  const ev: Record<string, { n: number; inc: number[]; spoil: number[]; fine: number[]; spread: number[] }> = {};
  for (const g of games) for (const d of g.days) {
    if (d.day === 1) continue;
    const e = (ev[d.event] ??= { n: 0, inc: [], spoil: [], fine: [], spread: [] });
    e.n++; e.inc.push(avg(d.income) - avg(base[d.day].inc));
    if (d.day < D) e.spoil.push(sumF(d.leftF) / n - avg(base[d.day].spoil));
    e.fine.push(avg(d.inspector)); e.spread.push(Math.max(...d.income) - Math.min(...d.income));
  }
  head('Event', 'Days', 'Income / stall vs same day', 'SE', 'Pieces lost that night / stall vs same day', 'Income spread (best - worst stall)');
  for (const c of EVENT_CARDS) { const e = ev[c.id]; if (e) row(c.title, e.n, r2(avg(e.inc)), r2(se(e.inc)), r2(avg(e.spoil)), r1(avg(e.spread))); }
  console.log('');
}

// ---------- 6. running out of cash ----------
if (want.has('6')) {
  console.log('**Running out of cash** (stall-days from day 2)\n');
  const byLevel: Record<string, { sd: number; broke3: number; broke2: number; broke0: number; cant: number; dead: number; deadLate: number; lastDead: number; lastN: number; stuck: number; deadPoor: number; deadStock: number }> = {};
  let gamesBroke = 0, gamesDead = 0;
  const firstBroke: { g: GameLog; p: number; d0: number }[] = [];
  for (const g of games) {
    let anyB = false, anyD = false;
    const seen = new Set<number>();
    g.days.forEach((d) => {
      d.dawnCash.forEach((c, p) => {
        const L = (byLevel[g.levels[p]] ??= { sd: 0, broke3: 0, broke2: 0, broke0: 0, cant: 0, dead: 0, deadLate: 0, lastDead: 0, lastN: 0, stuck: 0, deadPoor: 0, deadStock: 0 });
        if (d.day === 1) return;
        L.sd++;
        const noRipe = d.dawnRipe[p] === 0;
        if (c < 3 && noRipe) L.broke3++;
        if (c < 3 && noRipe && d.dawnGreen[p] === 0) { L.stuck++; anyB = true; if (!seen.has(p)) { seen.add(p); firstBroke.push({ g, p, d0: d.day }); } }
        if (c < 2 && noRipe) L.broke2++;
        if (c === 0 && noRipe) L.broke0++;
        if (!d.canAfford[p] && noRipe) L.cant++;
        const dead = d.bought[p] === 0 && d.income[p] === 0;
        if (dead) { L.dead++; anyD = true; if (c < 3) L.deadPoor++; if (d.dawnRipe[p] > 0) L.deadStock++; }
        if (d.day === D) { L.lastN++; if (dead) L.lastDead++; }
      });
    });
    if (anyB) gamesBroke++;
    if (anyD) gamesDead++;
  }
  head('AI level', 'Stall-days', 'Dawn cash < $3, nothing ripe %', 'Cash < $3 and no fruit at all (stuck) %', 'Cash $0, nothing ripe %', 'Cannot pay for any piece, nothing ripe %', 'Dead days % (no purchase, $0 income)', 'of which dawn cash < $3 %', 'of which had ripe fruit %', 'Dead on the last day %');
  for (const [lv, L] of Object.entries(byLevel)) row(lv, L.sd, r2((100 * L.broke3) / L.sd), r2((100 * L.stuck) / L.sd), r2((100 * L.broke0) / L.sd), r2((100 * L.cant) / L.sd), r2((100 * L.dead) / L.sd), r1((100 * L.deadPoor) / Math.max(1, L.dead)), r1((100 * L.deadStock) / Math.max(1, L.dead)), r2((100 * L.lastDead) / Math.max(1, L.lastN)));
  console.log(`\nGames with at least one stuck dawn (cash < $3 and no fruit at all): ${r1((100 * gamesBroke) / G)}%; with at least one dead day: ${r1((100 * gamesDead) / G)}%.`);
  {
    let low = 0, shortfall = 0, sdN = 0;
    for (const g of games) for (const d of g.days) if (d.day > 1) d.dawnCash.forEach((c) => { sdN++; if (c < 3) { low++; shortfall += 3 - c; } });
    console.log(`Stall-days that start with under $3 in cash (whatever is on the shelf): ${r2((100 * low) / sdN)}%; a $3 float would hand out about $${r2((shortfall / sdN) * (D - 1))} per stall per game.`);
  }
  const nets = games.flatMap((g) => g.net ?? []);
  if (nets.some((x) => x > 0)) console.log(`\nSafety net handed out: ${r2(avg(nets))} per stall per game (dollars, or pieces for credit and the seconds box); ${r1((100 * nets.filter((x) => x > 0).length) / nets.length)}% of stalls got something; most to one stall ${Math.max(...nets)}.`);
  // What happened to stalls after their first broke dawn, and what caused it.
  const cause: Record<string, number> = {};
  const rankAfter: number[] = [], cashAfter: number[] = [], zeroRest: number[] = [], incRest: number[] = [], d0s: number[] = [];
  for (const { g, p, d0 } of firstBroke) {
    rankAfter.push(g.rank.indexOf(p) + 1); cashAfter.push(g.cash[p]); d0s.push(d0);
    const rest = g.days.filter((d) => d.day >= d0);
    const inc = sum(rest.map((d) => d.income[p]));
    incRest.push(inc / rest.length); zeroRest.push(inc === 0 ? 1 : 0);
    const prev = g.days.filter((d) => d.day >= d0 - 2 && d.day < d0);
    const today = g.days[d0 - 1];
    const fine = sum(prev.map((d) => d.orderFine[p]));
    const upg = sum(prev.map((d) => d.upgSpend[p]));
    const insp = sum(prev.map((d) => d.inspector[p])) + today.inspector[p];
    const fruit = Math.max(0, sum(prev.map((d) => d.spentFruit[p] - d.income[p])));
    const green = today.dawnGreen[p] * 3;
    const m = Math.max(fine, upg, insp, fruit, green);
    const k = m === 0 ? 'other' : m === fine ? 'standing-order fine' : m === upg ? 'upgrade bought' : m === insp ? 'Health Inspector' : m === green ? 'cash tied up in green mangoes' : 'fruit that did not sell';
    cause[k] = (cause[k] ?? 0) + 1;
  }
  if (firstBroke.length) {
    console.log(`\nStalls with a stuck dawn: ${firstBroke.length} (${r2(firstBroke.length / G)} per game). First broke on day ${r1(avg(d0s))} on average. Afterwards: average final rank ${r2(avg(rankAfter))} of ${n} (last place ${r1((100 * rankAfter.filter((r) => r === n).length) / rankAfter.length)}%), final cash $${r1(avg(cashAfter))} (table average $${r1(avg(games.flatMap((g) => g.cash)))}), income per remaining day $${r1(avg(incRest))}, never earned again ${r1(100 * avg(zeroRest))}%.`);
    console.log(`Largest outflow in the two days before: ${Object.entries(cause).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${r1((100 * v) / firstBroke.length)}%`).join(', ')}.\n`);
  } else console.log('');
}

// ---------- 7. standing orders ----------
if (want.has('7')) {
  console.log('**Standing orders**\n');
  const os = games.flatMap((g) => g.orders.map((o) => ({ g, o })));
  const by: Record<string, { n: number; passed: number; bids: number; bidders: number; price: number[]; ratio: number[]; full: number; short: number[]; fine: number[]; rivalN: number[]; rivalPay: number[]; holderNet: number[]; held: number }> = {};
  const keys = [...FRUITS, 'all'] as string[];
  for (const k of keys) by[k] = { n: 0, passed: 0, bids: 0, bidders: 0, price: [], ratio: [], full: 0, short: [], fine: [], rivalN: [], rivalPay: [], holderNet: [], held: 0 };
  const COST: Record<FruitId, number> = { blueberry: 2, watermelon: 3, apple: 3, mango: 3 };
  const winVsOthers: number[] = [];
  for (const { g, o } of os) for (const k of [o.fruit, 'all']) {
    const b = by[k];
    b.n++;
    const nb = o.bids.filter((x) => x !== null).length;
    b.bidders += nb;
    if (o.holder === null) { b.passed++; continue; }
    b.held++;
    b.price.push(o.price!); b.ratio.push(o.price! / o.ceiling);
    if (!o.res) continue;
    const mine = o.res.sales.find((x) => x.player === o.holder)?.n ?? 0;
    const riv = o.res.sales.filter((x) => x.player !== o.holder);
    if (o.res.short === 0) b.full++;
    b.short.push(o.res.short); b.fine.push(o.res.fine);
    b.rivalN.push(sum(riv.map((x) => x.n))); for (const x of riv) for (let i = 0; i < x.n; i++) b.rivalPay.push(x.price);
    b.holderNet.push(mine * (o.price! - COST[o.fruit]) - o.res.fine);
    if (k === 'all') {
      const d0 = g.days[o.day - 1], d2 = g.days[o.day + 1];
      if (d0 && d2) { const gain = d2.endCash.map((c, p) => c - d0.dawnCash[p]); winVsOthers.push(gain[o.holder] - avg(gain.filter((_, p) => p !== o.holder))); }
    }
  }
  head('Order fruit', 'Orders turned over', 'Nobody bid %', 'Bidders / order', 'Winning bid', 'Bid / ceiling %', 'Holder delivered all %', 'Pieces short', 'Fine paid / held order', 'Rival pieces / held order', 'Rival pay / piece', 'Holder margin (bid - cost, less fine)');
  for (const k of keys) {
    const b = by[k];
    row(k === 'all' ? 'All' : FRUIT[k as FruitId].name, r2(b.n / G), r1((100 * b.passed) / Math.max(1, b.n)), r2(b.bidders / Math.max(1, b.n)), r2(avg(b.price)), r1(100 * avg(b.ratio)), r1((100 * b.full) / Math.max(1, b.held)), r2(avg(b.short)), r2(avg(b.fine)), r2(avg(b.rivalN)), r2(avg(b.rivalPay)), r2(avg(b.holderNet)));
  }
  console.log(`\nHolder's cash gain over the three days of the order, less the average rival's: $${r2(avg(winVsOthers))} (SE ${r2(se(winVsOthers))}, ${winVsOthers.length} orders). Holders are self-selected (they bid lowest), so read this with the forced-bid test in orders.ts.\n`);
}

// ---------- 8. game shape ----------
if (want.has('8')) {
  console.log('**Game shape**\n');
  let d5 = 0, lc = 0, come = 0, close = 0, blow = 0;
  const margins: number[] = [], spread: number[] = [], sdg: number[] = [], win: number[] = [], last: number[] = [];
  const firstBuys: Record<number, [number, number]> = {};
  const fbWin: number[] = [], fbAll: number[] = [];
  const seatWins = new Array(n).fill(0);
  const mid = Math.ceil(D / 2);
  for (const g of games) {
    const c = [...g.cash].sort((a, b) => b - a);
    margins.push(c[0] - c[1]); spread.push(c[0] - c[n - 1]); sdg.push(sd(g.cash)); win.push(c[0]); last.push(c[n - 1]);
    if (c[0] - c[1] <= 3) close++;
    if (c[0] - c[1] >= 20) blow++;
    seatWins[g.rank[0]]++;
    const leaders = g.days.map((d) => d.endCash.indexOf(Math.max(...d.endCash)));
    for (let d = 1; d < leaders.length; d++) if (leaders[d] !== leaders[d - 1]) lc++;
    if (leaders[mid - 1] === g.rank[0]) d5++;
    const m = g.days[mid - 1].endCash;
    if (m.indexOf(Math.min(...m)) === g.rank[0]) come++;
    const fb = new Array(n).fill(0);
    for (const d of g.days) fb[d.first]++;
    fb.forEach((k, p) => { (firstBuys[k] ??= [0, 0])[1]++; if (p === g.rank[0]) firstBuys[k][0]++; fbAll.push(k); if (p === g.rank[0]) fbWin.push(k); });
  }
  head('Measure', 'Value');
  row(`Leader after day ${mid} wins`, `${r1((100 * d5) / G)}% (SE ${r1(sePct(d5 / G, G))})`);
  row(`Last after day ${mid} wins (comeback)`, `${r1((100 * come) / G)}% (SE ${r1(sePct(come / G, G))})`);
  row('Lead changes per game', r2(lc / G));
  row('Average final cash', `$${r1(avg(games.flatMap((g) => g.cash)))}`);
  row('Winner / last place cash', `$${r1(avg(win))} / $${r1(avg(last))}`);
  row('Median margin 1st - 2nd', `$${median(margins)}`);
  row('Close games (margin <= $3)', `${r1((100 * close) / G)}%`);
  row('Blowouts (margin >= $20)', `${r1((100 * blow) / G)}%`);
  row('Spread of final cash in a game (sd)', `$${r1(avg(sdg))}`);
  row('Win % by seat (seat 0 first)', seatWins.map((w) => r1((100 * w) / G)).join(' / '));
  row('Days bought first: winners vs everyone', `${r2(avg(fbWin))} vs ${r2(avg(fbAll))}`);
  row('Win % by days bought first', Object.entries(firstBuys).filter(([, v]) => v[1] >= 30).map(([k, [w, c]]) => `${k}d: ${r1((100 * w) / c)}% (${c})`).join(', '));
  console.log('');
}
