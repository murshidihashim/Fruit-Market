// Local persistence: settings, stats, saved game, daily challenge records.
import type { FavourId } from '../engine/data';
import type { GameState } from '../engine/game';
import { AI_VERSION, RULES_VERSION } from '../net/protocol';
import { profileChanged } from './changed';

/** `reactions` (PLAN-112): show the preset reactions other players send in an online room (off: none are shown). */
export interface Settings { sound: boolean; haptics: boolean; fast: boolean; tips: boolean; music: boolean; analytics: boolean; reactions: boolean }
export interface Stats { played: number; wins: number; bestCash: number; totalSold: number }
export interface DailyRecord { [date: string]: number }

const K = { settings: 'fm.settings', stats: 'fm.stats', save: 'fm.save', daily: 'fm.daily', name: 'fm.name', undo: 'fm.undo' };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: play on without saving */
  }
}

/**
 * The settings on this phone. S11 (PLAN-110): the Freshness patterns switch is gone (the letters F, O, S and G already
 * tell the boxes apart); settings saved while it was there still load, and the old value is dropped. PLAN-112: settings
 * saved before "Show reactions" load with it on (each missing field takes its default).
 */
export function loadSettings(): Settings {
  const st: Settings & { patterns?: boolean } = read<Settings & { patterns?: boolean }>(K.settings, { sound: true, haptics: true, fast: false, tips: true, music: false, analytics: true, reactions: true });
  delete st.patterns;
  return st;
}
export const saveSettings = (s: Settings) => write(K.settings, s);

export const loadStats = () => read<Stats>(K.stats, { played: 0, wins: 0, bestCash: 0, totalSold: 0 });
export const saveStats = (s: Stats) => { write(K.stats, s); profileChanged(); };

/**
 * Bump when the saved-game format changes. Saves also record the rules version they were played under and the
 * computer-player version (`ai`, AI_VERSION; saves from 1.8.0 and earlier have none, which means version 1).
 */
export const SAVE_VERSION = 2;
interface SaveEnvelope { v: number; rules: number; ai?: number; game: GameState }

let saveNotice: string | null = null;

/** A message about a saved game that couldn't be resumed (shown once on the home screen). */
export function consumeSaveNotice(): string | null {
  const n = saveNotice;
  saveNotice = null;
  return n;
}

function looksLikeGame(g: unknown): g is GameState {
  const x = g as GameState | null;
  return !!x && typeof x === 'object' && Array.isArray(x.players) && typeof x.phase === 'string' && typeof x.day === 'number';
}

/**
 * The saved game, if it can be resumed. Saves from different rules are set aside (a game must
 * finish under the rules it started with), and unreadable saves are dropped instead of crashing.
 * An ordinary game from older computer players resumes and carries on with today's. A daily challenge
 * from older computer players is set aside: its score is checked by replaying the whole game with
 * today's computer players (server/meta.ts), so it could never be finished for the board.
 */
export function loadGame(): GameState | null {
  let raw: string | null = null;
  try { raw = localStorage.getItem(K.save); } catch { return null; }
  if (!raw) return null;
  let data: unknown;
  try { data = JSON.parse(raw); } catch { data = null; }
  const env = data as SaveEnvelope | null;
  if (env && typeof env === 'object' && 'game' in env && typeof env.v === 'number') {
    const game = looksLikeGame(env.game) ? env.game : null;
    const olderDaily = !!game?.config?.daily && (env.ai ?? 1) !== AI_VERSION;
    if (env.rules === RULES_VERSION && game && !olderDaily) return game;
    saveNotice = env.rules !== RULES_VERSION
      ? 'Your unfinished game used older rules and could not be continued.'
      : olderDaily
        ? 'Your unfinished Daily market game was from an older version and could not be continued.'
        : 'Your unfinished game couldn\'t be read, so it was cleared.';
    write(K.save, null);
    return null;
  }
  // Saves from before v1.2 were the bare game (rules version 2, the same rules as now).
  if (looksLikeGame(data)) return data;
  if (data !== null || raw) saveNotice = 'Your unfinished game couldn\'t be read, so it was cleared.';
  write(K.save, null);
  return null;
}

export const saveGame = (g: GameState | null) => write(K.save, g ? ({ v: SAVE_VERSION, rules: RULES_VERSION, ai: AI_VERSION, game: g } satisfies SaveEnvelope) : null);

/**
 * S18 (PLAN-110): where Undo goes back to on the buying turn in progress (game/turn.ts), kept beside the saved game and
 * not in it (the save's envelope is unchanged), so a person who leaves mid-turn (Home, or a reload) still has Undo when
 * they come back. It is read back only for the same game, day, turn and stall, at the rules it was saved under.
 */
interface UndoSave { rules: number; seed: number; daily: string; day: number; turn: number; seat: number; at: GameState; after?: FavourId }

export function saveUndo(point: { at: GameState; after?: FavourId } | null) {
  const at = point?.at;
  if (!at || at.phase !== 'buy') return write(K.undo, null);
  write(K.undo, { rules: RULES_VERSION, seed: at.config.seed, daily: at.config.daily ?? '', day: at.day, turn: at.turn, seat: at.order[at.turn], at, ...(point.after ? { after: point.after } : {}) } satisfies UndoSave);
}

/** The Undo point kept for this game's buying turn in progress, or null. */
export function loadUndo(g: GameState): { at: GameState; after?: FavourId } | null {
  if (g.phase !== 'buy') return null;
  let u: UndoSave | null = null;
  try { const raw = localStorage.getItem(K.undo); u = raw ? JSON.parse(raw) : null; } catch { return null; }
  if (!u || typeof u !== 'object' || !looksLikeGame(u.at)) return null;
  const same = u.rules === RULES_VERSION && u.seed === g.config.seed && u.daily === (g.config.daily ?? '') && u.day === g.day && u.turn === g.turn
    && u.seat === g.order[g.turn] && u.at.phase === 'buy' && u.at.day === g.day && u.at.turn === g.turn && u.at.order[u.at.turn] === u.seat;
  if (!same) return null;
  // Nothing bought since: the point is the game itself (Undo then has nothing to take back).
  const at = JSON.stringify(u.at) === JSON.stringify(g) ? g : u.at;
  return { at, ...(u.after ? { after: u.after } : {}) };
}

/** Forgets the games played and the Daily dates on this phone (PLAN-090: signing out). The stamp book works its
 *  stamps for games played and Daily markets out from them, so the next person on the phone must not keep them, as
 *  they do not keep the trophies. An account holds both and brings them back on sign-in. */
export function clearPlayed() { write(K.stats, null); write(K.daily, null); }
export const loadDaily = () => read<DailyRecord>(K.daily, {});
export const saveDaily = (d: DailyRecord) => { write(K.daily, d); profileChanged(); };

/** The saved name, or '' when there is none (the fields start blank). Older saves stored the fallbacks 'You' and 'Player' as if chosen, so those count as blank. */
export function loadName(): string {
  try {
    const n = localStorage.getItem(K.name) ?? '';
    return n === 'You' || n === 'Player' ? '' : n;
  } catch {
    return '';
  }
}
/** What the game uses when the name field was left blank. */
export const nameOrDefault = (n: string, fallback = 'You') => n.trim() || fallback;
export function saveName(n: string) {
  try {
    localStorage.setItem(K.name, n);
  } catch {
    /* ignore */
  }
  profileChanged();
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

