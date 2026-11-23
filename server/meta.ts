// Server features outside a single room: anonymous usage counters, the daily leaderboard and the Market Sprint's
// boards (scores are checked by replaying the game) and the quick-match queue.
// Pure logic, so it runs in tests without Cloudflare.
import { aiStep } from '../src/engine/ai';
import { applyAction, beginBuying, finishReveal, newGame, RuleError, type Action, type GameState } from '../src/engine/game';
import { dailyConfig, isoWeek, sprintConfig, SPRINT_WEEK_DAYS } from '../src/engine/daily';
import { AI_VERSION, QUICK_FILL_MS, quickStalls, RULES_VERSION, UPDATE_MSG, type QuickStalls } from '../src/net/protocol';
import { safeName, squash } from './names';

// ---------- usage counters ----------

export const EVENT_RE = /^[a-z0-9_]{1,32}(:[a-z0-9_.-]{1,24})?$/;
export const MAX_EVENTS = 60;
export const MAX_ERRORS = 5;
export const KEEP_DAYS = 90;

export interface Ingest { events: string[]; errors: string[] }

/** Keeps only well-formed event names and short error lines; drops everything else. */
export function cleanIngest(body: unknown): Ingest {
  const b = (body ?? {}) as { events?: unknown; errors?: unknown };
  const events = Array.isArray(b.events) ? b.events.filter((e): e is string => typeof e === 'string' && EVENT_RE.test(e)).slice(0, MAX_EVENTS) : [];
  const errors = Array.isArray(b.errors)
    // eslint-disable-next-line no-control-regex -- stripping control characters on purpose
    ? b.errors.filter((e): e is string => typeof e === 'string' && e.length > 0).slice(0, MAX_ERRORS).map((e) => e.replace(/[\u0000-\u001f]/g, ' ').slice(0, 200))
    : [];
  return { events, errors };
}

export function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

// ---------- daily leaderboard ----------

/** `owner` is a hash of the submitting device's secret key: it proves a name belongs to one device. */
export interface DailyEntry { name: string; cash: number; sold: number; at: number; owner?: string }
export interface PublicEntry { name: string; cash: number; sold: number }
/** `rv` is the rules version and `av` the computer-player version the game was played with (no `av`: 1, up to 1.8.0). */
export interface DailySubmit { date: string; name: string; actions: Action[]; rv?: number; av?: number; claim?: string }
export const MAX_ACTIONS = 400;
export const BOARD_SIZE = 100;
export const NAME_TAKEN = 'Someone else already uses that name on today\'s board. Change your name in Settings and try again.';

/** SHA-256 of the device's secret key, so the key itself is never stored. */
export async function ownerOf(claim: unknown): Promise<string> {
  if (typeof claim !== 'string' || !/^[0-9a-f]{32,64}$/.test(claim)) throw new RuleError(UPDATE_MSG);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(claim));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Names that look the same count as the same name ("Bob", "bob", "B0b"). */
const nameKey = (n: string) => squash(n) || n.toLowerCase();

/** The board as everyone may see it: no owner hashes. */
export function publicBoard(board: DailyEntry[]): PublicEntry[] {
  return board.map(({ name, cash, sold }) => ({ name, cash, sold }));
}

/**
 * One daily board per date, rules version and computer-player version, so scores played under old and new rules,
 * or against old and new computer players, never mix.
 */
export function dailyBoardKey(date: string): string {
  return `daily:${date}:r${RULES_VERSION}:a${AI_VERSION}`;
}

/** Daily keys a player could honestly be on right now (time zones run from UTC-12 to UTC+14). */
export function acceptableDates(now: number): string[] {
  return [-1, 0, 1].map((d) => utcDay(now + d * 86_400_000));
}

/**
 * Replays a daily challenge from the player's own moves and returns the result.
 * Computer turns are re-run on the server, so a score can't be made up.
 */
export function verifyDaily(sub: DailySubmit, now: number, owner: string, sprint = false): { entry: DailyEntry; state: GameState } {
  // Daily games are replayed with the server's rules and computer players, so they must have been played with the same
  // ones: the same moves against different computer players give a different game (or an illegal move).
  if (!sub || sub.rv !== RULES_VERSION || (sub.av ?? 1) !== AI_VERSION) throw new RuleError(UPDATE_MSG);
  if (typeof sub.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(sub.date)) throw new RuleError('Bad date');
  if (!acceptableDates(now).includes(sub.date)) throw new RuleError(sprint ? 'That day\'s Sprint is closed.' : 'That day of the Daily market is closed.');
  if (!Array.isArray(sub.actions) || sub.actions.length > MAX_ACTIONS) throw new RuleError('Something went wrong. Try again.');
  // A player who never chose a name plays as "You" on their own phone; on a shared board that would read as everyone's
  // own line, so the board gives them a neutral name instead (PLAN-114).
  const fallback = `Shopkeeper ${owner.slice(0, 4)}`;
  const name = typeof sub.name === 'string' && squash(sub.name) === 'you' ? fallback : safeName(sub.name, fallback);
  let s = newGame((sprint ? sprintConfig : dailyConfig)(sub.date, name));
  const me = s.players.findIndex((p) => p.kind === 'human');
  const moves = [...sub.actions];
  for (let guard = 0; guard < 5000 && s.phase !== 'over'; guard++) {
    if (s.phase === 'morning') {
      const next = moves[0];
      if (next?.kind === 'trait') { s = applyAction(s, me, moves.shift()!); continue; }
      s = beginBuying(s);
      continue;
    }
    if (s.phase === 'reveal') { s = finishReveal(s); continue; }
    const ai = aiStep(s);
    if (ai) { s = ai; continue; }
    const a = moves.shift();
    if (!a || typeof a !== 'object') throw new RuleError('The moves end before the game does');
    if (a.kind === 'begin' || a.kind === 'finish') continue;
    s = applyAction(s, me, a); // throws on an illegal move
  }
  if (s.phase !== 'over') throw new RuleError('The game did not finish');
  const pl = s.players[me];
  return { entry: { name, cash: pl.cash, sold: pl.stats.sold, at: now, owner }, state: s };
}

/**
 * Adds a verified score. A name belongs to the first device that used it today; each device keeps
 * one entry (its best score, under its latest name); the board keeps the top BOARD_SIZE.
 */
export function addEntry(board: DailyEntry[], e: DailyEntry, size = BOARD_SIZE): DailyEntry[] {
  const key = nameKey(e.name);
  const holder = board.find((x) => nameKey(x.name) === key);
  if (holder?.owner && holder.owner !== e.owner) throw new RuleError(NAME_TAKEN);
  const mine = board.filter((x) => (e.owner && x.owner === e.owner) || nameKey(x.name) === key);
  const others = board.filter((x) => !mine.includes(x));
  const best = [e, ...mine].reduce((a, b) => (b.cash > a.cash || (b.cash === a.cash && b.sold > a.sold) ? b : a));
  const entry = { ...best, name: e.name, owner: e.owner };
  return [...others, entry].sort(better).slice(0, size);
}

/** Board order: more cash, then more fruit sold (the Daily's own order), then the earlier score. */
const better = (a: DailyEntry, b: DailyEntry) => b.cash - a.cash || b.sold - a.sold || a.at - b.at;

/** Where a device stands on a daily board (1 is first; undefined when it has no score there). */
export function placeOf(board: DailyEntry[], owner: string | undefined): number | undefined {
  if (!owner) return undefined;
  const i = board.findIndex((x) => x.owner === owner);
  return i < 0 ? undefined : i + 1;
}

/** An owner hash as the app sends it to ask for its own place (never shown to anyone). */
export const OWNER_RE = /^[0-9a-f]{64}$/;

// ---------- the Market Sprint's boards (PLAN-114) ----------

/** A Sprint board keeps every device that played that day, up to this many (the lowest drop off past it). */
export const SPRINT_BOARD_SIZE = 5000;
/** Shown at the top of a Sprint board. */
export const SPRINT_TOP = 10;

/** One line of a board as the app shows it, with its place. `me` marks the asking device's own line. */
export interface PlacedEntry { place: number; name: string; cash: number; sold: number; me?: boolean; days?: number }
/** A board as the app sees it: the top ten, how many are on it, and the asking device's place with the lines just above
 *  and below it (its own line in the middle). */
export interface BoardView { top: PlacedEntry[]; players: number; rank?: number; around: PlacedEntry[] }

/**
 * One Sprint board per date, rules version and computer-player version, kept apart from the Daily market's boards
 * (their keys start "daily:").
 */
export function sprintBoardKey(date: string): string {
  return `sprint:${date}:r${RULES_VERSION}:a${AI_VERSION}`;
}

/** The weekly Sprint ranking for the ISO week a Sprint date falls in. */
export function sprintWeekKey(date: string): string {
  return `sprintweek:${isoWeek(date)}:r${RULES_VERSION}:a${AI_VERSION}`;
}

/** Adds a verified Sprint score: the Daily's rules (one entry per device, its best, a name per device), more room. */
export function addSprintEntry(board: DailyEntry[], e: DailyEntry): DailyEntry[] {
  return addEntry(board, e, SPRINT_BOARD_SIZE);
}

/** The view of a board for one device (`owner` may be unknown: then the top ten and the count only). */
export function boardView(board: { name: string; cash: number; sold: number; owner?: string; days?: number }[], owner?: string): BoardView {
  const line = (i: number): PlacedEntry => {
    const x = board[i];
    return { place: i + 1, name: x.name, cash: x.cash, sold: x.sold, ...(x.days !== undefined ? { days: x.days } : {}), ...(owner && x.owner === owner ? { me: true } : {}) };
  };
  const top = board.slice(0, SPRINT_TOP).map((_, i) => line(i));
  const at = owner ? board.findIndex((x) => x.owner === owner) : -1;
  if (at < 0) return { top, players: board.length, around: [] };
  const around = [at - 1, at, at + 1].filter((i) => i >= 0 && i < board.length).map(line);
  return { top, players: board.length, rank: at + 1, around };
}

/** One device's week of Sprints: its latest name and its best score of each day. */
export interface WeekEntry { owner: string; name: string; best: Record<string, { cash: number; sold: number }>; at: number }

/** PLAN-119: how many of a device's Sprint days count toward its week (its best ones), so missing two days does not hurt. */
export { SPRINT_WEEK_DAYS };

/** A day's best, the better first: more cash, then more fruit sold (the boards' own order). */
const betterDay = (a: { cash: number; sold: number }, b: { cash: number; sold: number }) => b.cash - a.cash || b.sold - a.sold;

/**
 * A week entry with its totals, ranked: the sum of the device's best SPRINT_WEEK_DAYS Sprint days (each day's best
 * Sprint). `days` is still how many days of the week it has a Sprint. The stored entries are unchanged (PLAN-119): a
 * week stored before the cap is simply counted this way.
 */
export function weekTotals(week: WeekEntry[]): { name: string; cash: number; sold: number; days: number; owner: string; at: number }[] {
  return week.map((w) => {
    const days = Object.values(w.best);
    const counted = [...days].sort(betterDay).slice(0, SPRINT_WEEK_DAYS);
    return { name: w.name, owner: w.owner, at: w.at, days: days.length, cash: counted.reduce((a, d) => a + d.cash, 0), sold: counted.reduce((a, d) => a + d.sold, 0) };
  }).sort(better);
}

/**
 * Puts a device's best Sprint of a day into its week (only ever raising that day's score) under its latest name.
 * A week holds at most SPRINT_BOARD_SIZE devices: past that, the lowest week drops off.
 */
export function addWeekScore(week: WeekEntry[], owner: string, name: string, date: string, cash: number, sold: number, at: number): WeekEntry[] {
  const old = week.find((w) => w.owner === owner);
  const prev = old?.best[date];
  const keep = !prev || cash > prev.cash || (cash === prev.cash && sold > prev.sold) ? { cash, sold } : prev;
  const mine: WeekEntry = { owner, name, best: { ...(old?.best ?? {}), [date]: keep }, at: old && keep === prev ? old.at : at };
  const next = [...week.filter((w) => w.owner !== owner), mine];
  if (next.length <= SPRINT_BOARD_SIZE) return next;
  const kept = new Set(weekTotals(next).slice(0, SPRINT_BOARD_SIZE).map((t) => t.owner));
  return next.filter((w) => kept.has(w.owner));
}

/** The weekly ranking as the app sees it (each line's `days`: how many days of the week it has a Sprint). */
export function weekView(week: WeekEntry[], owner?: string): BoardView {
  return boardView(weekTotals(week), owner);
}

// ---------- quick match ----------

export interface QuickState { code: string | null; since: number }
/** PLAN-125: one waiting room per table size. */
export type QuickQueues = Record<QuickStalls, QuickState>;

/** PLAN-125: the queues as stored, from the stored per-size queues, or (from before) the one queue, which was for 2. */
export function loadQueues(saved: unknown, old: unknown): QuickQueues {
  const state = (x: unknown): QuickState => {
    const q = x as Partial<QuickState> | null | undefined;
    return q && typeof q === 'object' && typeof q.code === 'string' && typeof q.since === 'number' ? { code: q.code, since: q.since } : { code: null, since: 0 };
  };
  const s = saved && typeof saved === 'object' ? (saved as Record<string, unknown>) : null;
  return { 2: state(s ? s[2] : old), 4: state(s?.[4]), 6: state(s?.[6]) };
}

/** PLAN-125: the table size asked for in a quick-match request (a missing body or an unknown size means 2). */
export function quickSize(body: unknown): QuickStalls {
  return quickStalls(body && typeof body === 'object' ? (body as { stalls?: unknown }).stalls : undefined);
}

/**
 * Returns the room to join: the size's last quick room if it is still waiting and keeps a seat for this person, or a
 * new room (made by `create`) to wait in. `claim(code)` asks the room itself (it says no once it is full, has started,
 * is about to fill with computers, or everyone in it gave up), so nobody is sent to a room without a seat. A room older
 * than `maxAge` (its fill time) is not asked.
 */
export async function quickMatch(
  q: QuickState, now: number, create: () => Promise<string>, claim: (code: string) => Promise<boolean>, maxAge = QUICK_FILL_MS,
): Promise<{ code: string; host: boolean; q: QuickState }> {
  if (q.code && now - q.since < maxAge && (await claim(q.code))) return { code: q.code, host: false, q };
  const code = await create();
  return { code, host: true, q: { code, since: now } };
}
