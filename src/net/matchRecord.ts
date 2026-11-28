// Match records (PLAN-133, PLAN-134): one finished or abandoned game as plain data, for balancing. Shared by the app,
// the room server and the reader script. A record never holds a name, an account, a device ID, a room code or an IP:
// `cleanRecord` rebuilds every record field by field, and every string in it must come from the game's own words
// (fruit, events, customers, perks, upgrades) or be random hex. Stall names typed by players are never read.
//
// A record is a set-up, a "day sheet" for each day played (what every stall bought, put out and charged, and how each
// sale went), and how the game ended. A game played on one phone also carries its trail: each person's moves with the
// time each took. Part 2 (PLAN-134), only for a player who said yes: a random player number, the session and progress.
import {
  CHARACTER_TRAIT, CUSTOMER_CARDS, EVENT_CARDS, FARMER_CARDS, FRUITS, ORDER_CARDS, TRAITS, UPGRADES, FAVOURS,
  type FruitId,
} from '../engine/data';
import { ranking, type Action, type GameConfig, type GameState } from '../engine/game';
import { AI_VERSION, RULES_VERSION } from './protocol';

export const RECORD_VERSION = 1;
/** The largest record the server takes (a 14-day game at 6 stalls with its trail is about 60 KB). */
export const MAX_RECORD = 120_000;
export type RecordMode = 'solo' | 'pass' | 'daily' | 'sprint' | 'league' | 'online';
const MODES: RecordMode[] = ['solo', 'pass', 'daily', 'sprint', 'league', 'online'];

export interface SeatSetup { k: 'h' | 'c'; lv?: 'easy' | 'normal' | 'hard'; perk?: string }
export interface Setup {
  days: number; seed: number; opts: string[]; date?: string; league?: number; seats: SeatSetup[];
}
/** One sale line: a customer wanting a fruit, and each stall's offer for it. Offers: [seat, pieces out, price, sold]. */
export interface SaleLine { c: string; f: FruitId; want: number; max: number; o: [number, number, number, number][] }
export interface DaySheet {
  d: number; ev?: string; lorry?: string;
  /** Per seat: what it bought today, as [fruit, shelf space, pieces]. */
  buys: [FruitId, number, number][][];
  /** Per seat: the pieces in its crate by fruit and shelf space (null: no crate). */
  crate: (Partial<Record<FruitId, number[]>> | null)[];
  /** Per seat: its prices as [fruit, price] (null: none). */
  prices: ([FruitId, number][] | null)[];
  sales: SaleLine[];
  income: number[]; cash: number[]; spoiled: number[]; ups: string[][]; favs: number[];
  /** A standing order collected today: [holder, price, pieces short]. */
  order?: [number, number, number];
  /** A standing order bid for today: each seat's bid (-1: passed). */
  bids?: number[];
}
/** One move on the trail: [seat, the move, milliseconds since the last move (0 to 600000), take-backs before it]. */
export type TrailStep = [number, Action, number, number];
export interface RecordEnd { over: boolean; day: number; phase: string; cash: number[]; sold: number[]; rank?: number }
export interface Device { form: 'phone' | 'tablet' | 'desktop'; os: string; scr: string; app: string; slow?: number }
/** Part 2: sent only when the player said yes to linking their games. */
export interface PlayerTag { pid: string; sid: string; depth: number; inst: string; ab: string; lvl?: number; stage?: number; looks?: number }
export interface MatchRecord {
  v: number; id: string; rv: number; av: number; mode: RecordMode; cfg: Setup; days: DaySheet[];
  trail?: TrailStep[]; opens?: [number, string][]; end: RecordEnd; dev?: Device; who?: PlayerTag;
}

// ---------- the game's own words: the only strings a record may hold ----------

const FRUIT = new Set<string>(FRUITS);
const EVENTS = new Set<string>(EVENT_CARDS.map((e) => e.id));
const LORRIES = new Set<string>(FARMER_CARDS.map((c) => c.name));
const CUSTOMERS = new Set<string>([...CUSTOMER_CARDS.map((c) => c.name), ...EVENT_CARDS.flatMap((e) => (e.extra ? [e.extra.name] : [])), ...ORDER_CARDS.map((c) => c.name)]);
const PERKS = new Set<string>(Object.keys(TRAITS));
const UPS = new Set<string>(Object.keys(UPGRADES));
const FAVS = new Set<string>(Object.keys(FAVOURS));
const OPTS = new Set(['unripe', 'upgrades', 'events', 'marketDays', 'core', 'street', 'pulse']);
const PHASES = new Set(['morning', 'order', 'buy', 'stall', 'bid', 'tie', 'reveal', 'evening', 'over']);
const HEX = /^[0-9a-f]{16,32}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const OPEN = /^[a-z0-9][a-z0-9_.-]{0,31}$/;

const int = (x: unknown, lo: number, hi: number): number | null => (typeof x === 'number' && Number.isInteger(x) && x >= lo && x <= hi ? x : null);
const need = <T>(x: T | null | undefined): T => { if (x === null || x === undefined) throw new Error('bad record'); return x; };
const arr = (x: unknown, max: number): unknown[] => { if (!Array.isArray(x) || x.length > max) throw new Error('bad record'); return x; };
const word = (x: unknown, set: Set<string>): string => { if (typeof x !== 'string' || !set.has(x)) throw new Error('bad record'); return x; };
const fruit = (x: unknown): FruitId => word(x, FRUIT) as FruitId;
const ints = (x: unknown, n: number, lo: number, hi: number): number[] => arr(x, n).map((v) => need(int(v, lo, hi)));

// ---------- building ----------

const optsOf = (c: GameConfig): string[] => [...OPTS].filter((o) => (o === 'marketDays' ? c.marketDays !== false : !!(c as unknown as Record<string, unknown>)[o]));

/** The set-up as a record holds it: no names, no looks; a shopkeeper only as its perk. */
export function setupOf(s: GameState): Setup {
  const c = s.config;
  return {
    days: c.days, seed: c.seed, opts: optsOf(c), ...(c.daily ? { date: c.daily } : {}), ...(c.league !== undefined ? { league: c.league } : {}),
    seats: s.players.map((p) => ({
      k: p.kind === 'human' ? 'h' as const : 'c' as const,
      ...(p.kind === 'ai' && p.level ? { lv: p.level } : {}),
      ...(p.trait ?? CHARACTER_TRAIT[p.avatar] ? { perk: p.trait ?? CHARACTER_TRAIT[p.avatar] } : {}),
    })),
  };
}

/** The day as it stands when the rush has been worked out (phase `reveal`): every stall's purchases, crate and prices,
 *  every sale line, and each stall's cash. */
export function daySheet(s: GameState): DaySheet | null {
  const r = s.results;
  if (s.phase !== 'reveal' || !r) return null;
  const n = s.players.length;
  const seats = Array.from({ length: n }, (_, p) => p);
  const bids = s.standing && s.standing.due > s.day && s.standing.bids.some((b) => typeof b === 'number' || b === 'pass')
    ? s.standing.bids.map((b) => (typeof b === 'number' ? b : -1)) : undefined;
  return {
    d: s.day,
    ...(s.event ? { ev: s.event.id } : {}),
    buys: seats.map((p) => Object.entries(s.players[p].boughtFruit ?? {}).flatMap(([f, row]) => (row ?? []).map((k, pos) => [f as FruitId, pos, k] as [FruitId, number, number]).filter((x) => x[2] > 0))),
    crate: seats.map((p) => s.crates?.[p] ?? null),
    prices: seats.map((p) => s.bids[p]?.map((b) => [b.fruit, b.price] as [FruitId, number]) ?? null),
    sales: r.lines.map((l) => ({ c: l.name, f: l.fruit, want: l.want, max: l.max, o: l.offers.map((o) => [o.player, o.qty, o.price, o.sold] as [number, number, number, number]) })),
    income: r.income.slice(0, n), cash: s.players.map((p) => p.cash), spoiled: s.players.map((p) => p.stats.spoiled),
    ups: s.players.map((p) => [...p.upgrades]), favs: s.players.map((p) => p.stats.favours),
    ...(r.order ? { order: [r.order.holder, r.order.price, r.order.short] as [number, number, number] } : {}),
    ...(bids ? { bids } : {}),
  };
}

/** How the game stands as it ends or is left. `seat`: the person leaving, for their rank (1 is first). */
export function endOf(s: GameState, seat?: number): RecordEnd {
  return {
    over: s.phase === 'over', day: s.day, phase: s.phase, cash: s.players.map((p) => p.cash), sold: s.players.map((p) => p.stats.sold),
    ...(seat !== undefined && seat >= 0 ? { rank: ranking(s).indexOf(seat) + 1 } : {}),
  };
}

export function newRecord(id: string, mode: RecordMode, s: GameState): MatchRecord {
  return { v: RECORD_VERSION, id, rv: RULES_VERSION, av: AI_VERSION, mode, cfg: setupOf(s), days: [], end: endOf(s) };
}

// ---------- cleaning: the server's gate, and the proof that no name can get in ----------

function cleanAction(x: unknown): Action {
  const a = need(x as Record<string, unknown> | null);
  switch (a.kind) {
    case 'buy': return { kind: 'buy', fruit: fruit(a.fruit), pos: need(int(a.pos, 0, 12)) };
    case 'endBuy': case 'endEvening': return { kind: a.kind };
    case 'favour': {
      const g = (a.args ?? {}) as Record<string, unknown>;
      const args = { ...(g.fruit !== undefined ? { fruit: fruit(g.fruit) } : {}), ...(g.pos !== undefined ? { pos: need(int(g.pos, 0, 12)) } : {}), ...(g.customer !== undefined ? { customer: need(int(g.customer, -9, 9999)) } : {}) };
      return { kind: 'favour', idx: need(int(a.idx, 0, 8)), ...(Object.keys(args).length ? { args } : {}) };
    }
    case 'stall': {
      const stall: Partial<Record<FruitId, number>> = {};
      for (const [f, k] of Object.entries(need(a.stall as object | null)).slice(0, 4)) stall[fruit(f)] = need(int(k, 0, 12));
      const crate: Partial<Record<FruitId, number[]>> = {};
      if (a.crate !== undefined) for (const [f, row] of Object.entries(need(a.crate as object | null)).slice(0, 4)) crate[fruit(f)] = ints(row, 12, 0, 12);
      return { kind: 'stall', stall, ...(a.crate !== undefined ? { crate } : {}) };
    }
    case 'prices': return { kind: 'prices', posts: arr(a.posts, 4).map((p) => ({ fruit: fruit((p as Record<string, unknown>).fruit), price: need(int((p as Record<string, unknown>).price, 0, 99)) })) };
    case 'tie': return { kind: 'tie', play: a.play === true };
    case 'upgrade': return { kind: 'upgrade', upgrade: word(a.upgrade, UPS) as Extract<Action, { kind: 'upgrade' }>['upgrade'] };
    case 'trait': return { kind: 'trait', trait: word(a.trait, PERKS) as Extract<Action, { kind: 'trait' }>['trait'] };
    case 'shade': return { kind: 'shade', fruit: a.fruit === null ? null : fruit(a.fruit) };
    case 'order': return { kind: 'order', price: a.price === null ? null : need(int(a.price, 0, 99)) };
    default: throw new Error('bad record');
  }
}

function cleanDay(x: unknown, n: number): DaySheet {
  const d = need(x as Record<string, unknown> | null);
  const crate = (c: unknown) => {
    if (c === null) return null;
    const out: Partial<Record<FruitId, number[]>> = {};
    for (const [f, row] of Object.entries(need(c as object | null)).slice(0, 4)) out[fruit(f)] = ints(row, 12, 0, 12);
    return out;
  };
  return {
    d: need(int(d.d, 1, 14)),
    ...(d.ev !== undefined ? { ev: word(d.ev, EVENTS) } : {}),
    ...(d.lorry !== undefined ? { lorry: word(d.lorry, LORRIES) } : {}),
    buys: arr(d.buys, n).map((row) => arr(row, 40).map((b) => { const t = arr(b, 3); return [fruit(t[0]), need(int(t[1], 0, 12)), need(int(t[2], 1, 12))] as [FruitId, number, number]; })),
    crate: arr(d.crate, n).map(crate),
    prices: arr(d.prices, n).map((row) => (row === null ? null : arr(row, 4).map((b) => { const t = arr(b, 2); return [fruit(t[0]), need(int(t[1], 0, 99))] as [FruitId, number]; }))),
    sales: arr(d.sales, 40).map((l) => {
      const s = need(l as Record<string, unknown> | null);
      return { c: word(s.c, CUSTOMERS), f: fruit(s.f), want: need(int(s.want, 0, 20)), max: need(int(s.max, 0, 99)), o: arr(s.o, n).map((o) => { const t = ints(o, 4, 0, 99); if (t.length !== 4 || t[0] >= n) throw new Error('bad record'); return t as [number, number, number, number]; }) };
    }),
    income: ints(d.income, n, 0, 9999), cash: ints(d.cash, n, 0, 9999), spoiled: ints(d.spoiled, n, 0, 999),
    ups: arr(d.ups, n).map((row) => arr(row, 5).map((u) => word(u, UPS))), favs: ints(d.favs, n, 0, 99),
    ...(d.order !== undefined ? { order: ints(d.order, 3, 0, 99) as [number, number, number] } : {}),
    ...(d.bids !== undefined ? { bids: ints(d.bids, n, -1, 99) } : {}),
  };
}

function cleanWho(x: unknown): PlayerTag {
  const w = need(x as Record<string, unknown> | null);
  if (typeof w.pid !== 'string' || !HEX.test(w.pid) || typeof w.sid !== 'string' || !HEX.test(w.sid)) throw new Error('bad record');
  if (typeof w.inst !== 'string' || !(DATE.test(w.inst) || w.inst === 'legacy')) throw new Error('bad record');
  return {
    pid: w.pid, sid: w.sid, depth: need(int(w.depth, 0, 999)), inst: w.inst, ab: w.ab === 'b' ? 'b' : 'a',
    ...(int(w.lvl, 0, 999) !== null ? { lvl: w.lvl as number } : {}), ...(int(w.stage, 0, 999) !== null ? { stage: w.stage as number } : {}),
    ...(int(w.looks, 0, 999) !== null ? { looks: w.looks as number } : {}),
  };
}

export function cleanDevice(x: unknown): Device {
  const d = need(x as Record<string, unknown> | null);
  const form = d.form === 'tablet' || d.form === 'desktop' ? d.form : 'phone';
  const os = ['android', 'ios', 'windows', 'mac', 'linux'].includes(d.os as string) ? d.os as string : 'other';
  const scr = typeof d.scr === 'string' && /^\d{2,4}x\d{2,4}$/.test(d.scr) ? d.scr : '0x0';
  const app = typeof d.app === 'string' && /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(d.app) ? d.app : '0.0.0';
  return { form, os, scr, app, ...(int(d.slow, 0, 3) !== null ? { slow: d.slow as number } : {}) };
}

/**
 * Rebuilds a record from untrusted input, keeping only what a record may hold, or throws. Nothing is copied through:
 * each number is range-checked and each string is checked against the game's own word lists (or is random hex, a date,
 * or a short lower-case page name), so a name typed by a player cannot survive this, whatever a client sends.
 */
export function cleanRecord(raw: unknown): MatchRecord {
  const r = need(raw as Record<string, unknown> | null);
  if (r.v !== RECORD_VERSION || typeof r.id !== 'string' || !HEX.test(r.id)) throw new Error('bad record');
  const rv = need(int(r.rv, 1, RULES_VERSION)), av = need(int(r.av, 1, AI_VERSION));
  const mode = word(r.mode, new Set(MODES)) as RecordMode;
  const c = need(r.cfg as Record<string, unknown> | null);
  const seats = arr(c.seats, 6).map((x): SeatSetup => {
    const s = need(x as Record<string, unknown> | null);
    return {
      k: s.k === 'h' ? 'h' as const : 'c' as const,
      ...(s.lv === 'easy' || s.lv === 'normal' || s.lv === 'hard' ? { lv: s.lv } : {}),
      ...(s.perk !== undefined ? { perk: word(s.perk, PERKS) } : {}),
    };
  });
  const n = seats.length;
  if (n < 2) throw new Error('bad record');
  const cfg: Setup = {
    days: need(int(c.days, 1, 14)), seed: need(int(c.seed, 0, 2 ** 53)), opts: arr(c.opts, 8).map((o) => word(o, OPTS)),
    ...(typeof c.date === 'string' && DATE.test(c.date) ? { date: c.date } : {}), ...(int(c.league, 0, 999) !== null ? { league: c.league as number } : {}), seats,
  };
  const e = need(r.end as Record<string, unknown> | null);
  const end: RecordEnd = {
    over: e.over === true, day: need(int(e.day, 1, 14)), phase: word(e.phase, PHASES), cash: ints(e.cash, n, 0, 9999), sold: ints(e.sold, n, 0, 999),
    ...(int(e.rank, 1, 6) !== null ? { rank: e.rank as number } : {}),
  };
  const days = arr(r.days, 14).map((d) => cleanDay(d, n));
  const trail = r.trail === undefined ? undefined : arr(r.trail, 1500).map((t) => { const s = arr(t, 4); return [need(int(s[0], 0, n - 1)), cleanAction(s[1]), need(int(s[2], 0, 600_000)), need(int(s[3], 0, 99))] as TrailStep; });
  const opens = r.opens === undefined ? undefined : arr(r.opens, 200).map((o) => { const t = arr(o, 2); if (typeof t[1] !== 'string' || !OPEN.test(t[1])) throw new Error('bad record'); return [need(int(t[0], 1, 14)), t[1]] as [number, string]; });
  return {
    v: RECORD_VERSION, id: r.id, rv, av, mode, cfg, days, ...(trail ? { trail } : {}), ...(opens ? { opens } : {}), end,
    ...(r.dev !== undefined ? { dev: cleanDevice(r.dev) } : {}), ...(r.who !== undefined ? { who: cleanWho(r.who) } : {}),
  };
}

/** Part 2: one app start by a player who said yes (PLAN-134). */
export interface SessionHello { pid: string; sid: string; inst: string; ab: string; dev: Device; lvl?: number; stage?: number; looks?: number }
export function cleanSession(raw: unknown): SessionHello {
  const r = need(raw as Record<string, unknown> | null);
  const { pid, sid, inst, ab, lvl, stage, looks } = cleanWho({ ...r, depth: 0 });
  return { pid, sid, inst, ab, dev: cleanDevice(r.dev), ...(lvl !== undefined ? { lvl } : {}), ...(stage !== undefined ? { stage } : {}), ...(looks !== undefined ? { looks } : {}) };
}

/** The game's own words a record may hold, for the tests. */
export const RECORD_WORDS = { FRUIT, EVENTS, LORRIES, CUSTOMERS, PERKS, UPS, FAVS };
