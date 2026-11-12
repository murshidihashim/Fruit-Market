// Local persistence: settings, stats, saved game, daily challenge records.
import type { GameState } from '../engine/game';
import { AI_VERSION, RULES_VERSION } from '../net/protocol';
import { profileChanged } from './changed';

export interface Settings { sound: boolean; haptics: boolean; fast: boolean; tips: boolean; music: boolean; analytics: boolean; patterns: boolean }
export interface Stats { played: number; wins: number; bestCash: number; totalSold: number }
export interface DailyRecord { [date: string]: number }

const K = { settings: 'fm.settings', stats: 'fm.stats', save: 'fm.save', daily: 'fm.daily', name: 'fm.name' };

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

export const loadSettings = () => read<Settings>(K.settings, { sound: true, haptics: true, fast: false, tips: true, music: false, analytics: true, patterns: false });
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

