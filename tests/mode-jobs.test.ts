// PLAN-119: a clear job for each mode. The Play menu's words, the weekly Sprint ranking that counts each player's best 5
// days, the Sprint's decisive moment checked against the game's own history, and the Daily card's line about what
// today's Daily uses that you met in the Market League.
import { describe, expect, it } from 'vitest';
import { aiStep, planPrices, planStall } from '../src/engine/ai';
import { FRUITS, prefOf } from '../src/engine/data';
import { dailyConfig, SPRINT_WEEK_DAYS, sprintConfig } from '../src/engine/daily';
import { applyAction, beginBuying, canBuy, finishReveal, newGame, winners, type Action, type GameConfig, type GameState, type LineResult } from '../src/engine/game';
import { sprintReason } from '../src/engine/sprint';
import { addWeekScore, utcDay, weekTotals, weekView, type WeekEntry } from '../server/meta';
import { firstCustomer } from '../src/ui/dailyCard';
import { LEAGUE } from '../src/ui/campaign';
import { LEAGUE_TO_SPRINT, MODE_REASON, NORMAL_HEADING, hasStandingOrders, leagueEcho } from '../src/ui/playMenu';
import { MOMENT_LABEL, WEEK_NOTE } from '../src/ui/Sprint';

const NOW = Date.UTC(2026, 10, 21, 12);
const DATE = utcDay(NOW);
const dayKey = (i: number) => utcDay(Date.UTC(2026, 10, 16) + i * 86_400_000);

/** Plays a game as a simple person (buys a little, prices like the computer). Notes whether a standing order came. */
function play(cfg: GameConfig, perk = 1): { s: GameState; orders: boolean } {
  let s = newGame(cfg);
  const me = s.players.findIndex((p) => p.kind === 'human');
  let orders = false;
  const act = (a: Action) => { s = applyAction(s, me, a); };
  for (let i = 0; i < 6000 && s.phase !== 'over'; i++) {
    if (s.standing) orders = true;
    if (s.phase === 'morning') {
      if (s.day === 1 && !s.players[me].trait && s.players[me].traitOffer?.length) { act({ kind: 'trait', trait: s.players[me].traitOffer![perk % s.players[me].traitOffer!.length] }); continue; }
      s = beginBuying(s); continue;
    }
    if (s.phase === 'reveal') { s = finishReveal(s); continue; }
    const ai = aiStep(s);
    if (ai) { s = ai; continue; }
    if (s.phase === 'buy') {
      const pick = FRUITS.flatMap((f) => s.market[f].map((_, pos) => ({ f, pos }))).find(({ f, pos }) => !canBuy(s, me, f, pos));
      if (pick && s.players[me].boughtToday < 2) act({ kind: 'buy', fruit: pick.f, pos: pick.pos });
      else act({ kind: 'endBuy' });
    } else if (s.phase === 'stall') act({ kind: 'stall', stall: planStall(s, me) });
    else if (s.phase === 'bid') act({ kind: 'prices', posts: planPrices(s, me).posts });
    else if (s.phase === 'order') act({ kind: 'order', price: null });
    else if (s.phase === 'evening') act({ kind: 'endEvening' });
    else if (s.phase === 'tie') act({ kind: 'tie', play: true });
  }
  return { s, orders };
}

describe('the Play menu: a job for each mode', () => {
  it('says each mode\'s reason in the owner\'s words, plainly', () => {
    // PLAN-124: the owner's name for the normal game, as on Home's Custom match card and tab
    expect(NORMAL_HEADING).toBe('Custom match');
    expect(MODE_REASON).toEqual({
      league: 'What will the next market throw at you',
      daily: 'How you rank in today\'s full market',
      sprint: 'A few minutes. Beat your best.',
    });
    for (const t of [NORMAL_HEADING, ...Object.values(MODE_REASON), LEAGUE_TO_SPRINT, WEEK_NOTE, MOMENT_LABEL]) expect(t).not.toContain('!');
    expect(LEAGUE_TO_SPRINT).toBe('Try today\'s Sprint');
  });
});

describe('the server: the weekly Sprint ranking counts the best 5 days', () => {
  const week = (owner: string, name: string, cash: number[]): WeekEntry =>
    ({ owner, name, at: 1, best: Object.fromEntries(cash.map((c, i) => [dayKey(i), { cash: c, sold: c % 7 }])) });

  it('adds up each player\'s best 5 days, and says how many days they played', () => {
    expect(SPRINT_WEEK_DAYS).toBe(5);
    expect(WEEK_NOTE).toBe('Your best 5 days count.');
    const t = weekTotals([week('a', 'Ann', [10, 40, 20, 30, 50, 5, 60])]);
    expect(t[0]).toMatchObject({ name: 'Ann', days: 7, cash: 60 + 50 + 40 + 30 + 20 });
    expect(t[0].sold).toBe([60, 50, 40, 30, 20].reduce((a, c) => a + (c % 7), 0));
  });

  it('a player who misses two days is not behind for it', () => {
    // Seven days at $30 against five at $30: level, where the plain sum put the seven-day player $60 ahead.
    const v = weekView([week('a', 'Every day', [30, 30, 30, 30, 30, 30, 30]), week('b', 'Five days', [30, 30, 30, 30, 30])]);
    expect(v.top.map((x) => [x.cash, x.days])).toEqual([[150, 7], [150, 5]]);
    // A better day replaces the worst counted one; a worse sixth day changes nothing.
    const better = weekTotals([week('c', 'C', [30, 30, 30, 30, 30, 45])]);
    expect(better[0].cash).toBe(165);
    expect(weekTotals([week('d', 'D', [30, 30, 30, 30, 30, 10])])[0].cash).toBe(150);
  });

  it('ranks with the capped totals, ties broken by fruit sold then the earlier score', () => {
    const a: WeekEntry = { owner: 'a', name: 'A', at: 5, best: Object.fromEntries([0, 1, 2, 3, 4, 5].map((i) => [dayKey(i), { cash: 10, sold: 1 }])) };
    const b: WeekEntry = { owner: 'b', name: 'B', at: 9, best: Object.fromEntries([0, 1, 2, 3, 4].map((i) => [dayKey(i), { cash: 10, sold: 2 }])) };
    expect(weekTotals([a, b]).map((x) => x.name)).toEqual(['B', 'A']);
  });

  it('keeps the stored shape: a week stored before the cap still computes, and new scores still go in by day', () => {
    // As stored by 1.27.0: { owner, name, best: { date: { cash, sold } }, at }.
    const stored = JSON.parse(JSON.stringify([week('a', 'Ann', [12, 18, 7, 25, 30, 9, 14]), week('b', 'Bob', [40, 41])])) as WeekEntry[];
    expect(weekView(stored).top.map((x) => [x.name, x.cash, x.days])).toEqual([['Ann', 30 + 25 + 18 + 14 + 12, 7], ['Bob', 81, 2]]);
    let w = addWeekScore(stored, 'b', 'Bob', dayKey(2), 50, 3, 10);
    expect(Object.keys(w.find((x) => x.owner === 'b')!.best)).toHaveLength(3);
    w = addWeekScore(w, 'a', 'Ann', dayKey(2), 40, 3, 11); // a better retry of a day raises it
    expect(w.find((x) => x.owner === 'a')!.best[dayKey(2)]).toEqual({ cash: 40, sold: 3 });
    expect(weekTotals(w).find((x) => x.owner === 'a')!.cash).toBe(40 + 30 + 25 + 18 + 14);
    expect(JSON.stringify(weekView(w, 'a'))).not.toMatch(/"owner"/);
  });
});

/** A one-day history for the moment tests: lines with each stall's offer. */
function withHistory(lines: LineResult[], cash: number[]): GameState {
  const g = newGame(sprintConfig(DATE, 'Me'));
  return { ...g, phase: 'over', players: g.players.map((p, i) => ({ ...p, cash: cash[i], stock: { ...p.stock } })), history: [{ day: 2, lines, income: [0, 0, 0, 0], cash }] };
}
const offer = (player: number, price: number, sold: number, qty = 2) => ({ player, qty, price, sold, freshness: 2 });

describe('the Sprint\'s decisive moment', () => {
  it('names the moment that moved the most dollars, with the dollars', () => {
    // Not a win: a $12 sale lost to a lower price beats a $8 sale.
    const lost = withHistory([
      { customerId: 1, name: 'Zara', fruit: 'mango', want: 2, max: 7, offers: [offer(0, 6, 0), offer(2, 4, 2)] },
      { customerId: 2, name: 'Ida', fruit: 'apple', want: 2, max: 5, offers: [offer(0, 4, 2)] },
    ], [20, 30, 40, 25]);
    expect(sprintReason(lost, 0)).toMatchObject({ kind: 'undercut', cash: 12, good: false });
    expect(sprintReason(lost, 0)!.text).toMatch(/That cost you \$12\.$/);
    // A $15 sale beats the $12 lost sale.
    const sold = withHistory([
      { customerId: 1, name: 'Zara', fruit: 'mango', want: 2, max: 7, offers: [offer(0, 6, 0), offer(2, 4, 2)] },
      { customerId: 2, name: 'Zul', fruit: 'watermelon', want: 3, max: 6, offers: [offer(0, 5, 3, 3)] },
    ], [20, 30, 40, 25]);
    expect(sprintReason(sold, 0)).toMatchObject({ kind: 'sale', cash: 15, good: true });
    expect(sprintReason(sold, 0)!.text).toMatch(/^Day 2: you sold 3 watermelons to .+ at \$5; the top price was \$6\. That sale brought in \$15\.$/);
    // Level amounts name the lost sale, the one to learn from.
    const level = withHistory([
      { customerId: 1, name: 'Zara', fruit: 'mango', want: 2, max: 7, offers: [offer(0, 6, 0), offer(2, 4, 2)] },
      { customerId: 2, name: 'Zul', fruit: 'watermelon', want: 3, max: 6, offers: [offer(0, 4, 3, 3)] },
    ], [20, 30, 40, 25]);
    expect(sprintReason(level, 0)!.kind).toBe('undercut');
  });

  it('counts every lower price that sold, up to the pieces you offered, and names the rival who sold the most', () => {
    const s = withHistory([{ customerId: 1, name: 'Zara', fruit: 'mango', want: 3, max: 7, offers: [offer(0, 6, 0, 3), offer(1, 5, 1), offer(2, 4, 2)] }], [20, 30, 40, 25]);
    const r = sprintReason(s, 0)!;
    expect(r.cash).toBe(18);
    expect(r.text).toContain(`${s.players[2].name}'s $4`);
  });

  it('a win names its biggest sale, even when a bigger sale was lost', () => {
    const s = withHistory([
      { customerId: 1, name: 'Zara', fruit: 'mango', want: 3, max: 7, offers: [offer(0, 7, 0, 3), offer(2, 4, 3)] },
      { customerId: 2, name: 'Zul', fruit: 'watermelon', want: 2, max: 7, offers: [offer(0, 7, 2)] },
    ], [60, 30, 40, 25]);
    expect(sprintReason(s, 0)).toMatchObject({ kind: 'top', cash: 14 });
  });

  it('matches the game\'s own history in real Sprints', () => {
    for (let i = 0; i < 24; i++) {
      const { s } = play(sprintConfig(utcDay(NOW + i * 86_400_000), 'Me'), i);
      const r = sprintReason(s, 0)!;
      expect(r).not.toBeNull();
      const mine = (s.history ?? []).flatMap((d) => d.lines.map((l) => ({ day: d.day, l, o: l.offers.find((o) => o.player === 0) })));
      const sales = mine.filter((x) => x.o && x.o.sold > 0).map((x) => ({ day: x.day, rev: x.o!.sold * x.o!.price, price: x.o!.price }));
      const biggest = Math.max(0, ...sales.map((x) => x.rev));
      if (r.kind === 'top' || r.kind === 'sale') {
        expect(r.cash).toBe(biggest);
        // The named sale is in the record: that day, that price, those takings.
        const [, day, price] = /^Day (\d+): you sold \d+ .+ at \$(\d+)/.exec(r.text)!;
        expect(sales.some((x) => x.day === Number(day) && x.price === Number(price) && x.rev === r.cash)).toBe(true);
      } else if (r.kind === 'undercut') {
        expect(winners(s)).not.toContain(0);
        expect(r.cash).toBeGreaterThanOrEqual(biggest);
        const [, day, theirs, yours] = /^Day (\d+): .+'s \$(\d+) sold first to .+; yours was \$(\d+)\./.exec(r.text)!;
        const line = mine.find((x) => x.day === Number(day) && x.o && x.o.sold === 0 && x.o.price === Number(yours)
          && x.l.offers.some((o) => o.player !== 0 && o.sold > 0 && o.price === Number(theirs)));
        expect(line).toBeDefined();
      } else {
        expect(sales).toHaveLength(0);
      }
      expect(r.text).toContain(r.kind === 'left' ? '$0' : `$${r.cash}.`);
    }
  });
});

describe('the Daily card: what you met in the Market League', () => {
  const ordersStage = LEAGUE.findIndex((st) => Object.keys(st.setup.orders ?? {}).length > 0);
  const premiumStage = LEAGUE.findIndex((st) => Object.values(st.setup.crowd ?? {}).some((ns) => ns.some((n) => prefOf(n) === 'premium')));

  it('knows when a Daily has standing orders, as the engine plays it', () => {
    // One week: every twist once.
    for (let i = 0; i < 7; i++) {
      const cfg = dailyConfig(dayKey(i), 'Me');
      expect(play(cfg, i).orders).toBe(hasStandingOrders(cfg));
    }
    expect(hasStandingOrders(sprintConfig(DATE, 'Me'))).toBe(false);
  });

  it('says nothing until the stage is cleared, then names it; the Daily itself does not change', () => {
    expect(ordersStage).toBeGreaterThanOrEqual(0);
    const date = Array.from({ length: 14 }, (_, i) => dayKey(i)).find((d) => {
      const g = newGame(dailyConfig(d, 'You'));
      const who = firstCustomer(g);
      return hasStandingOrders(g.config) && (!who || prefOf(who.name) !== 'premium');
    })!;
    const before = JSON.stringify(dailyConfig(date, 'You'));
    const g = newGame(dailyConfig(date, 'You'));
    const who = firstCustomer(g)?.name ?? null;
    expect(leagueEcho(g.config, who, 0)).toBeNull();
    expect(leagueEcho(g.config, who, ordersStage)).toBeNull();
    const line = leagueEcho(g.config, who, ordersStage + 1)!;
    expect(line).toBe(`Met in the League: a standing order to bid on, as in ${LEAGUE[ordersStage].title}.`);
    expect(line).not.toContain('!');
    expect(JSON.stringify(dailyConfig(date, 'You'))).toBe(before);
    // The Basic game has no standing orders, so no line.
    expect(leagueEcho({ ...g.config, core: true }, who, LEAGUE.length)).toBeNull();
  });

  it('names a premium first customer once the premium stage is cleared', () => {
    expect(premiumStage).toBeGreaterThanOrEqual(0);
    const cfg = { ...dailyConfig(DATE, 'You'), core: true };
    const premium = ['Ravi', 'Lina', 'Anna'].find((n) => prefOf(n) === 'premium')!;
    expect(leagueEcho(cfg, premium, premiumStage)).toBeNull();
    expect(leagueEcho(cfg, premium, premiumStage + 1)).toMatch(new RegExp(`^Met in the League: .+ buys Fresh fruit only, as in ${LEAGUE[premiumStage].title}\\.$`));
    const everyday = ['Zara', 'Ida', 'Zul'].find((n) => prefOf(n) !== 'premium')!;
    expect(leagueEcho(cfg, everyday, LEAGUE.length)).toBeNull();
  });
});
