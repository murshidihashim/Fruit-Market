// The day's money in words: the takings' ledger lines, the evening's one-line heading, what became of a standing
// order, and (S8, PLAN-110) each person's own day kept for their hand-over on a shared phone. Pure: no page, no
// Preact, so the game controller and the panels share them and tests read them directly.
import { ORDER_LEAD, TRAITS, type FavourId, type FruitId } from '../../engine/data';
import { isDraftNight, type GameState } from '../../engine/game';
import { dayLedger, tonightLine } from '../../engine/story';
import { LANES } from '../boardModel';

/** What became of the standing order this stall held today ("Standing order: you delivered 1 of 3 and lost your $6
 *  stake."), or null when it held none due today. */
export function orderLine(r: NonNullable<GameState['results']>, viewer: number): string | null {
  const o = r.order;
  if (!o || o.holder !== viewer) return null;
  return o.short === 0
    ? `Standing order: you delivered all ${o.qty}${o.stake ? ` and got your $${o.stake} stake back` : ''}.`
    : `Standing order: you delivered ${o.qty - o.short} of ${o.qty}${o.stake ? ` and lost your $${o.stake} stake` : ''}.`;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const pieces = (n: number) => `${n} piece${n === 1 ? '' : 's'}`;

/** One line of the day's ledger. */
export interface TakingsRow {
  key: 'sold' | 'order' | 'stake' | 'ears' | 'jar' | 'hawker' | 'topup' | 'bought' | 'staked' | 'fine' | 'other';
  label: string;
  /** Dollars in (above 0) or out (below 0). Null: a line with no money in it today (a stake that did not come back). */
  amount: number | null;
  /** The "sold" line: the pieces sold in the rush, a fruit for each, in the board's lane order. */
  fruits?: FruitId[];
}

/**
 * The viewer's day, a line for each kind of money the game worked out. The game keeps one sales total (story.ts
 * dayLedger), which holds the rush, a standing order's pay, tips and the night hawker; here each has its own line,
 * and "sold" is what is left of the total, so the lines always add up to the day's change in cash ("Up today").
 * Money in first, then money out. A day's change that no line explains stays under "Other", as before.
 */
export function takingsRows(s: GameState, viewer: number): TakingsRow[] {
  const r = s.results;
  if (!r) return [];
  const l = dayLedger(s, viewer);
  const mine = <T extends { player: number }>(xs: T[] | undefined) => (xs ?? []).filter((x) => x.player === viewer);
  // A standing order collected from this stall today: its pay is in the sales total, its stake is not.
  const o = r.order && r.order.holder === viewer ? r.order : null;
  const orderPay = o ? sum(mine(o.sales).map((x) => x.n * x.price)) : 0;
  const ears = mine(r.earful), jar = mine(r.tipJar), hawk = mine(r.hawker);
  const earTips = sum(ears.map((x) => x.tip)), jarTips = sum(jar.map((x) => x.tip)), hawkPay = sum(hawk.map((x) => x.price));
  // The pieces sold to customers and guests in the rush (the order's pieces are on its own line).
  const fruits = LANES.flatMap((f) => {
    const n = sum(r.lines.filter((x) => x.fruit === f && !(o && x.name === o.name)).map((x) => x.offers.find((y) => y.player === viewer)?.sold ?? 0));
    return Array.from({ length: n }, () => f);
  });
  // A stake this stall put down this morning for an order it won (held on the card until the order's day).
  const st = s.standing;
  const put = st && st.holder === viewer && st.due === s.day + ORDER_LEAD ? st.staked ?? 0 : 0;
  // What is left of "Other" once the stake that came back and the stake put down have their own lines.
  const rest = l.net === null ? 0 : l.other - (o?.back ?? 0) + put;
  const bought = s.players[viewer].boughtToday;

  const rows: TakingsRow[] = [{ key: 'sold', label: fruits.length ? `Sold ${pieces(fruits.length)}` : 'Nothing sold', amount: l.sales - orderPay - earTips - jarTips - hawkPay, fruits }];
  if (o) rows.push({ key: 'order', label: `Standing order · ${o.qty - o.short} of ${o.qty} delivered`, amount: orderPay });
  if (o && o.stake > 0) rows.push(o.back > 0 ? { key: 'stake', label: 'Stake back', amount: o.back } : { key: 'stake', label: `Stake of $${o.stake} lost`, amount: null });
  if (ears.length) rows.push({ key: 'ears', label: `${TRAITS.earful.title} tip`, amount: earTips });
  if (jar.length) rows.push({ key: 'jar', label: `${TRAITS.favourite.title} tip${jar.length === 1 ? '' : 's'}`, amount: jarTips });
  if (hawk.length) rows.push({ key: 'hawker', label: `Night hawker · ${pieces(hawk.length)}`, amount: hawkPay });
  // S6 (PLAN-110): dawn's money, so "Up today" matches the morning.
  if (l.topUp > 0) rows.push({ key: 'topup', label: 'Top-up from the Market', amount: l.topUp });
  if (l.bought > 0) rows.push({ key: 'bought', label: bought > 0 ? `Bought ${pieces(bought)} this morning` : 'Bought fruit this morning', amount: -l.bought });
  if (put > 0) rows.push({ key: 'staked', label: 'Stake on a standing order', amount: -put });
  if (l.fine > 0) rows.push({ key: 'fine', label: 'Health Inspector fine', amount: -l.fine });
  if (rest !== 0) rows.push({ key: 'other', label: 'Other', amount: rest });
  return rows;
}

/**
 * The evening's heading: the day's money in one line ("Sold $15 · bought $8 · up $7 today"), from the day's ledger.
 * S5 (PLAN-110): every other line of the takings that moved cash today is named too (a stake put down or back, dawn's
 * top-up or fine, an upgrade built tonight), so the numbers add up to the total.
 */
export function daySoldLine(s: GameState, p: number, today = true): string {
  const { sales, bought, fine, topUp, net } = dayLedger(s, p);
  const rows = takingsRows(s, p);
  const amount = (k: TakingsRow['key']) => rows.find((x) => x.key === k)?.amount ?? 0;
  const put = -amount('staked'), back = amount('stake'), other = amount('other');
  // In the evening, the only cash the ledger cannot name is an upgrade just built.
  const built = s.phase === 'evening' && isDraftNight(s) && other < 0;
  return [
    `Sold $${sales}`, `bought $${bought}`,
    ...(put > 0 ? [`stake $${put}`] : []),
    ...(back > 0 ? [`stake back $${back}`] : []),
    ...(topUp > 0 ? [`top-up $${topUp}`] : []),
    ...(fine > 0 ? [`fine $${fine}`] : []),
    ...(other !== 0 ? [built ? `upgrade $${-other}` : `other ${other < 0 ? '−' : '+'}$${Math.abs(other)}`] : []),
    ...(net === null ? [] : [`${net < 0 ? 'down' : 'up'} $${Math.abs(net)}${today ? ' today' : ''}`]),
  ].join(' · ');
}

/** S8 (PLAN-110): one person's own day on a shared phone, shown at their next hand-over. */
export interface OwnDay {
  day: number;
  /** The day's money ("Sold $12 · bought $9 · up $3"). */
  line: string;
  /** Favour cards won in the rush. */
  won: FavourId[];
  /** A standing order they held today and did not deliver in full: how many and the stake lost (null: none). */
  order: string | null;
  /** What the night does, or did, to their shelf. */
  night: string[];
}

/** Person `p`'s own day as the rush has just played it (`s` has the day's results), kept for their next hand-over.
 *  REP-133 A-07: a standing order this person missed today, and the stake it cost them, is said here too. */
export function ownDayAfterRush(s: GameState, p: number): OwnDay | null {
  const r = s.results;
  if (!r) return null;
  const night = tonightLine(s, p);
  const order = orderLine(r, p);
  return { day: s.day, line: daySoldLine(s, p, false), won: r.favours.filter((x) => x.player === p).map((x) => x.favour), order: r.order?.short ? order : null, night: night ? [night] : [] };
}
