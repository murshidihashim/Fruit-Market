// REP-142 measurement: how a game unfolds day by day under rules 20 (all-computer games, Hard level).
// Run: npx vite-node docs/studio/review-21/arc.ts [games]
// Prints one JSON object per table (stalls x days). Read-only: it plays the shipped engine and counts.
import { aiStep } from '../../../src/engine/ai';
import { beginBuying, buyLimit, count, finishReveal, newGame, ranking, shelfSize, type GameState } from '../../../src/engine/game';

const G = Number(process.argv[2] ?? 300);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const r1 = (x: number) => Math.round(x * 10) / 10;
const pct = (a: number, b: number) => (b ? Math.round((1000 * a) / b) / 10 : 0);

interface DayAcc {
  cashStart: number[]; cashAfterBuy: number[]; bought: number[]; atLimit: number; shelfFull: number; n: number;
  carried: number[]; held: number[]; crate: number[]; income: number[]; net: number[]; spoiled: number[];
  demand: number; served: number; lines: number; contested: number; idle10: number;
}
const acc = (): DayAcc => ({
  cashStart: [], cashAfterBuy: [], bought: [], atLimit: 0, shelfFull: 0, n: 0, carried: [], held: [], crate: [], income: [], net: [], spoiled: [],
  demand: 0, served: 0, lines: 0, contested: 0, idle10: 0,
});

function table(stalls: number, days: number) {
  const byDay: DayAcc[] = Array.from({ length: days }, acc);
  const leaderWins = new Array<number>(days).fill(0);
  const upgradesByDay = new Array<number>(days).fill(0);
  let leadChanges = 0, margin = 0, finalCash = 0, twoUp = 0, noUp = 0, favEarned = 0, favPlayed = 0, orders = 0, ordersTaken = 0, ordersFull = 0, spentUp = 0;
  const marginBig: number[] = [];
  for (let seed = 1; seed <= G; seed++) {
    let s: GameState = newGame({ players: Array.from({ length: stalls }, (_, i) => ({ name: `P${i}`, kind: 'ai' as const, level: 'hard' as const, avatar: '' })), days, unripe: true, upgrades: true, events: true, seed });
    let prevPhase = '';
    let spoiledBefore = s.players.map(() => 0);
    const leaders: number[] = [];
    let standingSeen = '';
    for (let i = 0; i < 20000 && s.phase !== 'over'; i++) {
      const d = byDay[s.day - 1];
      if (s.phase !== prevPhase) {
        if (s.phase === 'buy' && prevPhase !== 'buy') {
          // the day's buying opens: what was carried over the night, and what spoiled in it
          s.players.forEach((pl, p) => {
            d.carried.push(count(pl.stock));
            d.cashStart.push(pl.cash);
            d.spoiled.push(pl.stats.spoiled - spoiledBefore[p]);
          });
          spoiledBefore = s.players.map((pl) => pl.stats.spoiled);
          upgradesByDay[s.day - 1] += s.players.reduce((a, pl) => a + pl.upgrades.length, 0);
          if (s.standing && s.standing.due > s.day) {
            const key = `${s.standing.card}-${s.standing.due}`;
            if (key !== standingSeen) { standingSeen = key; orders++; if (s.standing.holder !== null) ordersTaken++; }
          }
        }
        if (prevPhase === 'buy' && s.phase !== 'buy') {
          s.players.forEach((pl) => {
            d.n++;
            d.bought.push(pl.boughtToday);
            d.cashAfterBuy.push(pl.cash);
            if (pl.boughtToday >= buyLimit(pl)) d.atLimit++;
            else if (count(pl.stock) >= shelfSize(pl)) d.shelfFull++;
            if (pl.cash >= 10) d.idle10++;
          });
        }
        if (s.phase === 'reveal' && s.results) {
          const res = s.results;
          s.players.forEach((pl, p) => {
            const out = Object.values(s.stalls[p] ?? {}).reduce((a: number, b) => a + (b ?? 0), 0);
            d.crate.push(out);
            d.income.push(res.income[p]);
          });
          for (const l of res.lines) {
            d.lines++; d.demand += l.want; d.served += l.offers.reduce((a, o) => a + o.sold, 0);
            if (l.offers.filter((o) => o.qty > 0 && !o.tooOld).length >= 2) d.contested++;
          }
          if (res.order) { if (res.order.short === 0) ordersFull++; }
        }
        prevPhase = s.phase;
      }
      if (s.phase === 'morning') s = beginBuying(s);
      else if (s.phase === 'reveal') {
        // what stays on the shelf, ripe, after the rush (held back or unsold)
        s.players.forEach((pl) => byDay[s.day - 1].held.push(count(pl.stock, undefined, true)));
        s = finishReveal(s);
      } else {
        const n = aiStep(s);
        if (!n) throw new Error(`stuck in ${s.phase}`);
        s = n;
      }
    }
    const hist = s.history ?? [];
    hist.forEach((h, k) => {
      const top = h.cash.indexOf(Math.max(...h.cash));
      leaders.push(top);
      (h.net ?? h.income).forEach((x) => byDay[k].net.push(x));
    });
    const win = ranking(s)[0];
    leaders.forEach((l, k) => { if (l === win) leaderWins[k]++; if (k > 0 && l !== leaders[k - 1]) leadChanges++; });
    const cash = s.players.map((p) => p.cash).sort((a, b) => b - a);
    margin += cash[0] - cash[1];
    marginBig.push(cash[0] - cash[1] >= 20 ? 1 : 0);
    finalCash += mean(cash);
    for (const pl of s.players) {
      if (pl.upgrades.length >= 2) twoUp++;
      if (pl.upgrades.length === 0) noUp++;
      favEarned += pl.stats.favours; favPlayed += pl.stats.played?.length ?? 0;
      spentUp += pl.upgrades.length;
    }
  }
  const per = G * stalls;
  console.log(JSON.stringify({
    table: `${stalls} stalls, ${days} days, Hard, ${G} games`,
    finalCash: r1(finalCash / G), winMargin: r1(margin / G), wonBy20: pct(mean(marginBig), 1), leadChangesPerGame: r1(leadChanges / G),
    upgradesPerStall: r1(spentUp / per), twoUpgrades: pct(twoUp, per), noUpgrade: pct(noUp, per),
    favoursEarnedPerStall: r1(favEarned / per), favoursPlayedPerStall: r1(favPlayed / per),
    standingOrders: r1(orders / G), taken: pct(ordersTaken, orders), deliveredFullOfTaken: pct(ordersFull, ordersTaken),
    days: byDay.map((d, k) => ({
      day: k + 1,
      cashStart: r1(mean(d.cashStart)), cashAfterBuy: r1(mean(d.cashAfterBuy)), idle10: pct(d.idle10, d.n),
      bought: r1(mean(d.bought)), atLimit: pct(d.atLimit, d.n), shelfFull: pct(d.shelfFull, d.n),
      carried: r1(mean(d.carried)), crate: r1(mean(d.crate)), keptRipe: r1(mean(d.held)), spoiled: r1(mean(d.spoiled)),
      income: r1(mean(d.income)), net: r1(mean(d.net)),
      served: pct(d.served, d.demand), contested: pct(d.contested, d.lines), leaderWins: pct(leaderWins[k], G), upgrades: r1(upgradesByDay[k] / per),
    })),
  }));
}

for (const [n, days] of [[3, 10], [4, 10], [3, 14], [2, 10]] as const) table(n, days);
