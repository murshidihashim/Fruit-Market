// Achievements, grouped by theme. `evaluate` looks at one finished game plus what the player has built up
// over time (sets such as "shopkeepers won with") and says which achievements were just earned.
// It only reads the game; it never changes a rule.
import { CHARACTER_TRAIT, EVENT_CARDS, FAVOURS, RIVALS } from '../engine/data';
import { ranking, type GameState, type LineResult } from '../engine/game';

export type ThemeId = 'game' | 'timing' | 'nerve' | 'crates' | 'town' | 'stall' | 'cast' | 'events' | 'journey' | 'milestones';

export const THEMES: { id: ThemeId; title: string; blurb: string }[] = [
  { id: 'game', title: 'The game', blurb: 'First steps at the market.' },
  { id: 'timing', title: 'Timing and freshness', blurb: 'Fruit does not wait.' },
  { id: 'nerve', title: 'Nerve', blurb: 'The secret price.' },
  { id: 'crates', title: 'Reading the crates', blurb: 'Know what your rivals are holding.' },
  { id: 'town', title: 'The town', blurb: 'Customers and special guests.' },
  { id: 'stall', title: 'Your stall', blurb: 'Build it your way.' },
  { id: 'cast', title: 'Shopkeepers and rivals', blurb: 'Know the cast.' },
  { id: 'events', title: 'Events and favours', blurb: 'Whatever the day brings.' },
  { id: 'journey', title: 'The journey', blurb: 'Daily, League and online.' },
  { id: 'milestones', title: 'Milestones', blurb: 'The long haul.' },
];

export interface Achievement {
  id: string;
  title: string;
  text: string;
  theme: ThemeId;
  /** Shown as "x / goal" while the achievement is in progress. */
  goal?: { set?: string; count?: number; stat?: 'totalSold' | 'played'; target: number };
}

export const GUESTS = ['Influencer', 'Gym Club', 'Hotel Chef'];
const TRAITS = ['haggler', 'basket', 'bargain', 'charmer', 'favourite', 'nestegg'];

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_win', theme: 'game', title: 'Open for Business', text: 'Win a game.' },
  { id: 'first_sale', theme: 'game', title: 'First Sale', text: 'Sell a piece of fruit.' },
  { id: 'explorer', theme: 'game', title: 'Market Explorer', text: 'Finish a game in each mode: New game, Daily, League and online.', goal: { set: 'modes', target: 4 } },

  { id: 'no_waste', theme: 'timing', title: 'Nothing Wasted', text: 'Win without a single fruit spoiling.' },
  { id: 'jam_session', theme: 'timing', title: 'Jam Session', text: 'Earn $10 or more from the jam maker on the last day.' },
  { id: 'juice_regular', theme: 'timing', title: 'Juice Bar Regular', text: 'Earn $20 from your Juice Bar in one game.' },

  { id: 'full_price', theme: 'nerve', title: 'Name Your Price', text: 'Sell 5 pieces of fruit at a customer\'s top price in one game.' },
  { id: 'penny_under', theme: 'nerve', title: 'Penny Under', text: 'Win a sale by pricing exactly $1 below the next stall.' },
  { id: 'sky_high', theme: 'nerve', title: 'Sky High', text: 'Sell a piece of fruit for $12 or more.' },
  { id: 'tie_breaker', theme: 'nerve', title: 'Tie Breaker', text: 'Win a sale when another stall posted the same price.' },

  { id: 'sole_five', theme: 'crates', title: 'Sole Supplier', text: 'Serve 5 whole orders on your own in one game.' },

  { id: 'red_carpet', theme: 'town', title: 'Red Carpet', text: 'Sell to all three special guests: the Influencer, the Gym Club and the Hotel Chef.', goal: { set: 'guests', target: 3 } },
  { id: 'town_12', theme: 'town', title: 'Familiar Faces', text: 'Serve 12 different customers.', goal: { set: 'customers', target: 12 } },
  { id: 'town_36', theme: 'town', title: 'The Whole Town', text: 'Serve all 36 customers.', goal: { set: 'customers', target: 36 } },
  { id: 'worth_wait', theme: 'town', title: 'Worth the Wait', text: 'Serve a customer who came back the next day.' },
  { id: 'full_house', theme: 'town', title: 'Full House', text: 'Sell to 6 different customers in one day.' },

  { id: 'bare_stall', theme: 'stall', title: 'Bare Stall', text: 'Win without building any upgrades.' },
  { id: 'fully_fitted', theme: 'stall', title: 'Fully Fitted', text: 'Build all four upgrades in one game.' },
  { id: 'mango_mogul', theme: 'stall', title: 'Mango Mogul', text: 'Sell 10 mangoes in one game.' },

  { id: 'beat_hard', theme: 'cast', title: 'Giant Slayer', text: 'Win against a Hard rival.' },
  { id: 'hard_sweep', theme: 'cast', title: 'Hard Sweep', text: 'Win a 4-player game against three Hard rivals.' },
  { id: 'shop_3', theme: 'cast', title: 'Quick Change', text: 'Win with 3 different shopkeepers.', goal: { set: 'wonWith', target: 3 } },
  { id: 'shop_6', theme: 'cast', title: 'Shopkeeper Master', text: 'Win with all 6 shopkeepers.', goal: { set: 'wonWith', target: 6 } },
  { id: 'rivals_all', theme: 'cast', title: 'Rival Roll Call', text: 'Beat each of the 6 named rivals: Rosa, Benny, Chen, Saleh, Raj and Kiran.', goal: { set: 'beaten', target: 6 } },

  { id: 'big_day', theme: 'events', title: 'Market Day', text: 'Earn $40 or more in one day.' },
  { id: 'festival_rush', theme: 'events', title: 'Festival Rush', text: 'Earn $40 or more on a Festival day.' },
  { id: 'event_all', theme: 'events', title: 'Event Collector', text: 'See all 13 event cards.', goal: { set: 'events', target: 13 } },
  { id: 'card_sharp', theme: 'events', title: 'Card Sharp', text: 'Play all 6 favour cards.', goal: { set: 'favours', target: 6 } },
  { id: 'comeback', theme: 'events', title: 'Comeback Kid', text: 'Win after being last on day 5.' },

  { id: 'streak3', theme: 'journey', title: 'Regular', text: 'Play the daily market 3 days in a row.' },
  { id: 'streak7', theme: 'journey', title: 'Week Runner', text: 'Play the daily market 7 days in a row.' },
  { id: 'streak30', theme: 'journey', title: 'Month of Markets', text: 'Play the daily market 30 days in a row.' },
  { id: 'daily_top10', theme: 'journey', title: 'Top Ten', text: 'Finish in the top 10 of a daily leaderboard.' },
  { id: 'online_win', theme: 'journey', title: 'Town Favourite', text: 'Win an online match.' },
  { id: 'online_10', theme: 'journey', title: 'Pen Pal', text: 'Finish 10 online matches.', goal: { set: 'online', target: 10 } },
  { id: 'league', theme: 'journey', title: 'League Champion', text: 'Win every stage of the Market League.' },

  { id: 'rich', theme: 'milestones', title: 'Fruit Tycoon', text: 'Finish a game with $200 or more.' },
  { id: 'sold_100', theme: 'milestones', title: 'Stall Starter', text: 'Sell 100 pieces of fruit in total.', goal: { stat: 'totalSold', target: 100 } },
  { id: 'sold_500', theme: 'milestones', title: 'Market Regular', text: 'Sell 500 pieces of fruit in total.', goal: { stat: 'totalSold', target: 500 } },
  { id: 'sold_2000', theme: 'milestones', title: 'Fruit Baron', text: 'Sell 2,000 pieces of fruit in total.', goal: { stat: 'totalSold', target: 2000 } },
  { id: 'played_10', theme: 'milestones', title: 'Getting Started', text: 'Finish 10 games.', goal: { stat: 'played', target: 10 } },
  { id: 'played_50', theme: 'milestones', title: 'Seasoned', text: 'Finish 50 games.', goal: { stat: 'played', target: 50 } },
  { id: 'played_200', theme: 'milestones', title: 'Veteran', text: 'Finish 200 games.', goal: { stat: 'played', target: 200 } },
];

export type Sets = Record<string, string[]>;
export interface Context {
  online: boolean;
  have: Set<string>;
  sets: Sets;
  stats: { played: number; totalSold: number };
  streak: number;
}

const add = (sets: Sets, key: string, ...ids: string[]) => { sets[key] = [...new Set([...(sets[key] ?? []), ...ids])]; };

/** Lines of one customer on one day, grouped. */
function ordersByDay(g: GameState): { day: number; lines: LineResult[] }[][] {
  return (g.history ?? []).map((d) => {
    const byCustomer = new Map<number, LineResult[]>();
    for (const l of d.lines) byCustomer.set(l.customerId, [...(byCustomer.get(l.customerId) ?? []), l]);
    return [...byCustomer.values()].map((lines) => ({ day: d.day, lines }));
  });
}

/** Which achievements a finished game earns, and the sets after counting it. Does nothing for an unfinished game. */
export function evaluate(g: GameState, me: number, ctx: Context): { got: string[]; sets: Sets } {
  const sets: Sets = Object.fromEntries(Object.entries(ctx.sets).map(([k, v]) => [k, [...v]]));
  if (g.phase !== 'over' || me < 0) return { got: [], sets };
  const pl = g.players[me];
  const won = ranking(g)[0] === me;
  const hist = g.history ?? [];
  const mine = (l: LineResult) => l.offers.filter((o) => o.player === me && o.sold > 0);

  let fullPrice = 0, mangoes = 0, juice = 0, penny = false, sky = false, tie = false;
  for (const d of hist) for (const l of d.lines) {
    const [first, second] = l.offers;
    for (const o of mine(l)) {
      if (o.price >= l.max) fullPrice += o.sold;
      if (l.fruit === 'mango') mangoes += o.sold;
      if (o.price >= 12) sky = true;
      juice += o.juice ?? 0;
    }
    if (first?.player === me && first.sold > 0 && second && !second.tooOld) {
      if (second.price - first.price === 1) penny = true;
      if (second.price === first.price && second.qty > 0) tie = true;
    }
  }

  // Whole orders served alone, customers served in one day, customers who came back.
  let sole = 0, fullHouse = false, waited = false;
  const seenOn = new Map<number, Set<number>>();
  for (const d of hist) for (const l of d.lines) seenOn.set(l.customerId, new Set([...(seenOn.get(l.customerId) ?? []), d.day]));
  for (const day of ordersByDay(g)) {
    const served = new Set<number>();
    for (const { day: dayNo, lines } of day) {
      const sold = lines.map((l) => l.offers.reduce((a, o) => a + o.sold, 0));
      const want = lines.reduce((a, l) => a + l.want, 0);
      const myUnits = lines.reduce((a, l) => a + mine(l).reduce((x, o) => x + o.sold, 0), 0);
      if (myUnits > 0) {
        served.add(lines[0].customerId);
        if (seenOn.get(lines[0].customerId)?.has(dayNo - 1)) waited = true;
        if (myUnits === want && sold.reduce((a, b) => a + b, 0) === want) sole++;
      }
    }
    if (served.size >= 6) fullHouse = true;
  }

  // Sets that build up across games.
  add(sets, 'modes', ctx.online ? 'online' : g.config.daily ? 'daily' : g.config.league !== undefined ? 'league' : 'new');
  for (const d of hist) for (const l of d.lines) if (mine(l).length) add(sets, GUESTS.includes(l.name) ? 'guests' : 'customers', l.name);
  for (const d of hist) if (d.event) add(sets, 'events', d.event);
  if (pl.stats.played?.length) add(sets, 'favours', ...pl.stats.played);
  if (ctx.online) add(sets, 'online', String(g.config.seed));
  const trait = pl.trait ?? CHARACTER_TRAIT[pl.avatar];
  if (won && trait && !g.config.core) add(sets, 'wonWith', trait);
  if (won) add(sets, 'beaten', ...g.players.filter((p) => p.kind === 'ai' && RIVALS.some((r) => r.name === p.name)).map((p) => p.name));

  const d5 = hist[4]?.cash;
  const festival = hist.some((d) => d.event === 'festival' && d.income[me] >= 40);
  const size = (k: string) => (sets[k] ?? []).length;
  const checks: [string, boolean][] = [
    ['first_win', won],
    ['first_sale', pl.stats.sold > 0],
    ['explorer', size('modes') >= 4],
    ['no_waste', won && pl.stats.spoiled === 0],
    ['jam_session', (g.jam?.[me] ?? 0) >= 10],
    ['juice_regular', juice >= 20],
    ['full_price', fullPrice >= 5],
    ['penny_under', penny],
    ['sky_high', sky],
    ['tie_breaker', tie],
    ['sole_five', sole >= 5],
    ['red_carpet', GUESTS.every((n) => (sets.guests ?? []).includes(n))],
    ['town_12', size('customers') >= 12],
    ['town_36', size('customers') >= 36],
    ['worth_wait', waited],
    ['full_house', fullHouse],
    ['bare_stall', won && pl.upgrades.length === 0 && g.config.upgrades],
    ['fully_fitted', pl.upgrades.length >= 4],
    ['mango_mogul', mangoes >= 10],
    ['beat_hard', won && g.players.some((p) => p.kind === 'ai' && p.level === 'hard')],
    ['hard_sweep', won && g.players.length === 4 && g.players.every((p, i) => i === me || (p.kind === 'ai' && p.level === 'hard'))],
    ['shop_3', size('wonWith') >= 3],
    ['shop_6', size('wonWith') >= TRAITS.length],
    ['rivals_all', RIVALS.every((r) => (sets.beaten ?? []).includes(r.name))],
    ['big_day', hist.some((d) => d.income[me] >= 40)],
    ['festival_rush', festival],
    ['event_all', size('events') >= EVENT_CARDS.length],
    ['card_sharp', size('favours') >= Object.keys(FAVOURS).length],
    ['comeback', won && !!d5 && d5[me] === Math.min(...d5) && d5.some((c) => c !== d5[me])],
    ['streak3', !!g.config.daily && ctx.streak >= 3],
    ['streak7', !!g.config.daily && ctx.streak >= 7],
    ['streak30', !!g.config.daily && ctx.streak >= 30],
    ['online_win', ctx.online && won],
    ['online_10', size('online') >= 10],
    ['rich', pl.cash >= 200],
    ['sold_100', ctx.stats.totalSold >= 100],
    ['sold_500', ctx.stats.totalSold >= 500],
    ['sold_2000', ctx.stats.totalSold >= 2000],
    ['played_10', ctx.stats.played >= 10],
    ['played_50', ctx.stats.played >= 50],
    ['played_200', ctx.stats.played >= 200],
  ];
  return { got: checks.filter(([id, ok]) => ok && !ctx.have.has(id)).map(([id]) => id), sets };
}

/** How far along a goal-based achievement is, for "3 / 6" labels. */
export function progressOf(a: Achievement, sets: Sets, stats: { played: number; totalSold: number }): number {
  if (!a.goal) return 0;
  const n = a.goal.set ? (sets[a.goal.set] ?? []).length : a.goal.stat ? stats[a.goal.stat] : 0;
  return Math.min(n, a.goal.target);
}
