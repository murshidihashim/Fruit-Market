// Server features outside a single room: anonymous usage counters, the daily leaderboard
// (scores are checked by replaying the game) and the quick-match queue.
// Pure logic, so it runs in tests without Cloudflare.
import { aiStep } from '../src/engine/ai';
import { applyAction, beginBuying, finishReveal, newGame, RuleError, type Action, type GameState } from '../src/engine/game';
import { dailyConfig } from '../src/engine/daily';
import { NAME_MAX } from '../src/net/protocol';

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
    ? b.errors.filter((e): e is string => typeof e === 'string' && e.length > 0).slice(0, MAX_ERRORS).map((e) => e.replace(/[\u0000-\u001f]/g, ' ').slice(0, 200))
    : [];
  return { events, errors };
}

export function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

// ---------- daily leaderboard ----------

export interface DailyEntry { name: string; cash: number; sold: number; at: number }
export interface DailySubmit { date: string; name: string; actions: Action[] }
export const MAX_ACTIONS = 400;
export const BOARD_SIZE = 100;

function cleanName(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, NAME_MAX) : '';
  return s || 'Anonymous';
}

/** Daily keys a player could honestly be on right now (time zones run from UTC-12 to UTC+14). */
export function acceptableDates(now: number): string[] {
  return [-1, 0, 1].map((d) => utcDay(now + d * 86_400_000));
}

/**
 * Replays a daily challenge from the player's own moves and returns the result.
 * Computer turns are re-run on the server, so a score can't be made up.
 */
export function verifyDaily(sub: DailySubmit, now: number): { entry: DailyEntry; state: GameState } {
  if (!sub || typeof sub.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(sub.date)) throw new RuleError('Bad date');
  if (!acceptableDates(now).includes(sub.date)) throw new RuleError('That daily challenge is closed');
  if (!Array.isArray(sub.actions) || sub.actions.length > MAX_ACTIONS) throw new RuleError('Bad moves');
  const name = cleanName(sub.name);
  let s = newGame(dailyConfig(sub.date, name));
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
  return { entry: { name, cash: pl.cash, sold: pl.stats.sold, at: now }, state: s };
}

/** Adds a verified score, keeping each name's best and the top BOARD_SIZE overall. */
export function addEntry(board: DailyEntry[], e: DailyEntry): DailyEntry[] {
  const others = board.filter((x) => x.name !== e.name);
  const old = board.find((x) => x.name === e.name);
  const best = old && (old.cash > e.cash || (old.cash === e.cash && old.sold >= e.sold)) ? old : e;
  return [...others, best].sort((a, b) => b.cash - a.cash || b.sold - a.sold || a.at - b.at).slice(0, BOARD_SIZE);
}

// ---------- quick match ----------

export const QUICK_WAIT_MS = 90_000;
export interface QuickState { code: string | null; since: number }

/** Returns the room to join: someone's waiting room, or a new one (made by `create`) to wait in. */
export async function quickMatch(q: QuickState, now: number, create: () => Promise<string>): Promise<{ code: string; host: boolean; q: QuickState }> {
  if (q.code && now - q.since < QUICK_WAIT_MS) return { code: q.code, host: false, q: { code: null, since: 0 } };
  const code = await create();
  return { code, host: true, q: { code, since: now } };
}
