// Local persistence: settings, stats, saved games (one per mode, PLAN-120), daily challenge records.
import type { FavourId } from '../engine/data';
import type { GameConfig, GameState } from '../engine/game';
import { AI_VERSION, RULES_VERSION } from '../net/protocol';
import { profileChanged } from './changed';

/** `reactions` (PLAN-112): show the preset reactions other players send in an online room (off: none are shown).
 *  REP-140 B-15: the old `tips` field is gone (nothing read it; the coach is turned off with Skip tutorial and back on
 *  with Settings' Replay the tutorial). */
export interface Settings { sound: boolean; haptics: boolean; fast: boolean; music: boolean; analytics: boolean; reactions: boolean; still: boolean }
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
 * saved before "Show reactions" load with it on (each missing field takes its default). REP-140 B-15: so is the unused
 * `tips` field.
 */
export function loadSettings(): Settings {
  const st: Settings & { patterns?: boolean; tips?: boolean } = read<Settings & { patterns?: boolean; tips?: boolean }>(K.settings, { sound: true, haptics: true, fast: false, music: false, analytics: true, reactions: true, still: false });
  delete st.patterns;
  delete st.tips;
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

/**
 * PLAN-120: a saved game per mode, so a game in one mode never replaces a game in another. `play` holds a game against
 * computers or in Pass & Play; `league` a Market League stage; `daily` the Daily market; `sprint` the Market Sprint.
 * Online matches have no slot: their room keeps them ("Back to room"). Each slot holds the same envelope the single save
 * held (SaveEnvelope), under its own key.
 */
export type SaveSlot = 'play' | 'league' | 'daily' | 'sprint';
export const SAVE_SLOTS: readonly SaveSlot[] = ['play', 'league', 'daily', 'sprint'];
/** The key a slot is kept under. The single save of 1.28.0 and earlier was "fm.save" (K.save). */
export const slotKey = (slot: SaveSlot): string => `${K.save}.${slot}`;

/** The slot a game belongs to, from its set-up: a Sprint, a Daily market, a League stage, otherwise a Play game. */
export function slotOf(cfg: Pick<GameConfig, 'daily' | 'sprint' | 'league'>): SaveSlot {
  if (cfg.daily) return cfg.sprint ? 'sprint' : 'daily';
  if (cfg.league !== undefined) return 'league';
  return 'play';
}

/** How a notice names a slot's game: "Your unfinished Sprint game …" (REP-135 RA-13). */
const SLOT_WORDS: Record<SaveSlot, string> = { play: 'game', league: 'League game', daily: 'Daily market game', sprint: 'Sprint game' };

const notices: string[] = [];

/** A message about saved games that couldn't be resumed (shown once on the home screen), or null. */
export function consumeSaveNotice(): string | null {
  const n = notices.length ? notices.join(' ') : null;
  notices.length = 0;
  return n;
}

function looksLikeGame(g: unknown): g is GameState {
  const x = g as GameState | null;
  return !!x && typeof x === 'object' && Array.isArray(x.players) && typeof x.phase === 'string' && typeof x.day === 'number';
}

function readRaw(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writeRaw(key: string, raw: string) {
  try { localStorage.setItem(key, raw); } catch { /* storage unavailable: play on without saving */ }
}

/** The game inside saved text (an envelope, or a bare game from before v1.2), whatever its versions, or null. */
function gameIn(raw: string): GameState | null {
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return null; }
  const env = data as SaveEnvelope | null;
  const g = env && typeof env === 'object' && 'game' in env ? env.game : data;
  return looksLikeGame(g) && !!g.config && typeof g.config === 'object' ? g : null;
}

/**
 * PLAN-120: moves the single save of 1.28.0 and earlier into its mode's slot, exactly as it was saved (its versions are
 * checked when the slot is read, with the same notices). A Daily with the Sprint flag goes to the Sprint, a Daily alone
 * to the Daily, a League stage to the League, anything else to Play. A save whose game cannot be read is cleared with a
 * notice. A slot that already holds a game keeps it (that one was saved later, by this version). Safe to call again.
 */
export function migrateOldSave(): void {
  const raw = readRaw(K.save);
  if (raw === null) return;
  const game = gameIn(raw);
  if (game) {
    const key = slotKey(slotOf(game.config));
    if (readRaw(key) === null) writeRaw(key, raw);
  } else notices.push('Your unfinished game couldn\'t be read, so it was cleared.');
  write(K.save, null);
}

/**
 * A slot's saved game, if it can be resumed. Saves from different rules are set aside (a game must finish under the
 * rules it started with), and unreadable saves are dropped instead of crashing. An ordinary game from older computer
 * players resumes and carries on with today's. A Daily market or a Sprint from older computer players is set aside: its
 * score is checked by replaying the whole game with today's computer players (server/meta.ts), so it could never be
 * finished for the board. Each notice names the slot's mode. The old single save is moved to its slot first.
 */
export function loadGame(slot: SaveSlot): GameState | null {
  migrateOldSave();
  const raw = readRaw(slotKey(slot));
  if (!raw) return null;
  let data: unknown;
  try { data = JSON.parse(raw); } catch { data = null; }
  const env = data as SaveEnvelope | null;
  // REP-136 R120-03: a Play save names its kind, a computer game or a Pass & Play game (PLAN-125), from its own players.
  const inner = env && typeof env === 'object' && 'game' in env ? env.game : data;
  const humans = looksLikeGame(inner) && inner.config ? inner.config.players.filter((p) => p.kind === 'human').length : 0;
  const what = slot === 'play' && humans > 0 ? (humans > 1 ? 'Pass & Play game' : 'computer game') : SLOT_WORDS[slot];
  if (env && typeof env === 'object' && 'game' in env && typeof env.v === 'number') {
    const game = looksLikeGame(env.game) && env.game.config ? env.game : null;
    // A game that is not this slot's mode (never written so) cannot be read here.
    const here = !!game && slotOf(game.config) === slot;
    const olderDaily = here && !!game.config.daily && (env.ai ?? 1) !== AI_VERSION;
    if (env.rules === RULES_VERSION && here && !olderDaily) return game;
    notices.push(env.rules !== RULES_VERSION
      ? `Your unfinished ${what} used older rules and could not be continued.`
      : olderDaily
        ? `Your unfinished ${what} was from an older version and could not be continued.`
        : `Your unfinished ${what} couldn't be read, so it was cleared.`);
    write(slotKey(slot), null);
    return null;
  }
  // Saves from before v1.2 were the bare game, played under rules version 2. REP-140 C-05: the rules have changed many
  // times since, so such a game is set aside like any game saved under older rules.
  const bare = looksLikeGame(data) && !!data.config && slotOf(data.config) === slot;
  notices.push(bare ? `Your unfinished ${what} used older rules and could not be continued.` : `Your unfinished ${what} couldn't be read, so it was cleared.`);
  write(slotKey(slot), null);
  return null;
}

/** Every slot's saved game that can be resumed (a slot with none is left out). */
export function loadGames(): Partial<Record<SaveSlot, GameState>> {
  const out: Partial<Record<SaveSlot, GameState>> = {};
  for (const slot of SAVE_SLOTS) {
    const g = loadGame(slot);
    if (g) out[slot] = g;
  }
  return out;
}

/** Saves a game into its mode's slot; every other slot is left as it is. */
export const saveGame = (g: GameState) => write(slotKey(slotOf(g.config)), { v: SAVE_VERSION, rules: RULES_VERSION, ai: AI_VERSION, game: g } satisfies SaveEnvelope);
/** Empties one slot (its game ended, or the player started it over). */
export const clearGame = (slot: SaveSlot) => write(slotKey(slot), null);
/** Whether this phone holds a saved game, in a slot or in the old single save (telemetry's check for older players). */
export const anySave = (): boolean => readRaw(K.save) !== null || SAVE_SLOTS.some((s) => readRaw(slotKey(s)) !== null);

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

