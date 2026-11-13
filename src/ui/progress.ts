// Long-term goals kept on this device: trophy tiers and what they are counted from, the Market League (a ladder of
// rivals), looks and the stall colour. The stamp book (stamps.ts) is worked out from these; it is never stored.
import { RIVALS } from '../engine/data';
import { winners, type GameConfig, type GameState, type Level } from '../engine/game';
import { lookById } from '../net/looks';
import { loadDaily, loadStats, saveDaily, saveStats } from './store';
import { ACHIEVEMENTS, evaluate, standing, tierById, type Achievement, type Counts, type Facts, type Sets, type Snapshot } from './achievements';
import { earnLines, placeAt, stampsOf, type EarnLine, type Place } from './stamps';
import { C } from './palette';
import { profileChanged } from './changed';

// ---------- trophies ----------

export { ACHIEVEMENTS, type Achievement } from './achievements';

const ACH_KEY = 'fm.ach';
const LADDER_KEY = 'fm.ladder';
const COLOUR_KEY = 'fm.colour';
const LOOKS_KEY = 'fm.looks';
const WORN_KEY = 'fm.worn';
const SETS_KEY = 'fm.prog';
/** Plain counts the stamp book is worked out from (PLAN-086): see `Profile.counts`. */
const COUNTS_KEY = 'fm.counts';
/** Looks the server has granted to this player's account. The phone only ever stores what the server sent. */
const GRANTED_KEY = 'fm.granted';
/** The last few finished games that were counted, so opening the same results again counts nothing twice. Stays on the phone. */
const COUNTED_KEY = 'fm.counted';

function readJson<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}
function writeJson(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ }
  profileChanged();
}
const strings = (x: unknown): string[] => (Array.isArray(x) ? x.filter((e): e is string => typeof e === 'string') : []);

/** The trophy tiers earned, by code name. Names this version does not know are kept as they are. */
export const unlocked = (): string[] => strings(readJson<unknown>(ACH_KEY, []));
export const saveUnlocked = (ids: string[]) => writeJson(ACH_KEY, [...new Set(ids)]);

/** Everything stored that trophies and stamps are worked out from. */
export function snapshot(): Snapshot {
  return { have: new Set(unlocked()), sets: loadSets(), counts: loadCounts(), stats: loadStats(), daily: loadDaily(), league: leagueStage() };
}

/**
 * Brings the stored list of tiers up to date with what is stored: a tier whose count is already reached, and the
 * lower tiers of a trophy earned before tiers existed. Returns the tiers that were added. Nothing is ever taken away.
 */
export function syncTiers(): string[] {
  const have = unlocked();
  const fresh = standing(snapshot()).filter((id) => !have.includes(id));
  if (fresh.length) saveUnlocked([...have, ...fresh]);
  return fresh;
}

/** A stall's stamps and level, from what is stored. */
export const myStamps = () => stampsOf(snapshot());
export const myPlace = (): Place => placeAt(myStamps().total);

/** What one finished game added, for the results. */
export interface GameSummary {
  /** The lines of "Stamps earned" (only the tiers when these results were opened before). */
  lines: EarnLine[];
  /** Stamps this game earned in all. */
  earned: number;
  before: Place;
  after: Place;
  /** The tiers this game earned. */
  tiers: Achievement[];
  facts: Facts;
  /** This game cleared the Market League stage the player was on. */
  cleared: boolean;
}

/** A finished game, told apart from every other: the same game opened twice gives the same words. */
function fingerprint(g: GameState, online: boolean): string {
  return [g.config.seed, g.config.daily ?? '', g.config.league ?? '', online ? 'o' : '', g.config.days, g.players.map((p) => `${p.cash}.${p.stats.sold}`).join('_')].join('|');
}
let last: { key: string; summary: GameSummary } | null = null;

/**
 * Counts a finished game, once: games, wins, best cash and pieces sold; the Daily market's date; the sets and counts
 * trophies read; the tiers it earned. `me` is the seat that belongs to this phone's owner. Online games count as games
 * (they used to add nothing). Returns what the game added, or null for a game that is not finished.
 */
export function finishGame(g: GameState, me: number, online = false): GameSummary | null {
  if (g.phase !== 'over' || me < 0 || !g.players[me]) return null;
  const key = fingerprint(g, online);
  const seen = strings(readJson<unknown>(COUNTED_KEY, []));
  // The same visit to the results (the screen was drawn again): the same words.
  if (last?.key === key && seen.includes(key)) return last.summary;
  const fresh = !seen.includes(key);
  syncTiers();
  const beforeStamps = stampsOf(snapshot()).total;
  let firstDaily = false;
  let cleared = false;
  if (fresh) {
    const st = loadStats();
    st.played++;
    if (winners(g).includes(me)) st.wins++; // rules 18: a shared win is a win
    st.bestCash = Math.max(st.bestCash, g.players[me].cash);
    st.totalSold += g.players[me].stats.sold;
    saveStats(st);
    if (g.config.daily) {
      const d = loadDaily();
      firstDaily = d[g.config.daily] === undefined;
      d[g.config.daily] = Math.max(d[g.config.daily] ?? 0, g.players[me].cash);
      saveDaily(d);
    }
    cleared = advanceLeague(g, me);
    try { localStorage.setItem(COUNTED_KEY, JSON.stringify([...seen, key].slice(-12))); } catch { /* storage unavailable */ }
  }
  const have = unlocked();
  const r = evaluate(g, me, { ...snapshot(), online, count: fresh });
  if (!r.facts) return null;
  saveSets(r.sets);
  saveCounts(r.counts);
  if (r.got.length) saveUnlocked([...have, ...r.got]);
  const afterStamps = stampsOf(snapshot()).total;
  const summary: GameSummary = {
    lines: earnLines(r.facts, { daily: !!g.config.daily, firstDaily, tiers: r.got }).filter((l) => fresh || l.tier),
    earned: afterStamps - beforeStamps, before: placeAt(beforeStamps), after: placeAt(afterStamps),
    tiers: ACHIEVEMENTS.filter((a) => r.got.includes(a.id)), facts: r.facts, cleared,
  };
  last = { key, summary };
  return summary;
}

/** Checks a finished game and returns the tiers it earned (and saves them, with the sets and counts they read). */
export function checkAchievements(g: GameState, me: number, online = false): Achievement[] {
  return finishGame(g, me, online)?.tiers ?? [];
}

/** Gives a tier that no finished game can show (the Daily market's top ten, the Market League). Null when it is held. */
export function unlockAchievement(id: string): Achievement | null {
  const have = unlocked();
  if (have.includes(id)) return null;
  saveUnlocked([...have, id]);
  return tierById(id) ? ACHIEVEMENTS.find((a) => a.id === id) ?? null : null;
}

// ---------- Market League ----------

export interface Stage { title: string; rivals: { idx: number; level: Level }[]; days: 8 | 10 }

// Retuned for rules version 3 (PLAN-012): a Normal-strength player wins about 64, 64, 52, 41, 33 and 20%
// of games at each stage (computer stand-in, 300 games per stage), with no late cliff.
export const LEAGUE: Stage[] = [
  { title: 'Village Square', rivals: [{ idx: 0, level: 'easy' }], days: 8 },
  { title: 'Harbour Steps', rivals: [{ idx: 2, level: 'easy' }], days: 8 },
  { title: 'Old Town', rivals: [{ idx: 3, level: 'normal' }], days: 10 },
  { title: 'Spice Lane', rivals: [{ idx: 1, level: 'easy' }, { idx: 4, level: 'easy' }], days: 10 },
  { title: 'Grand Bazaar', rivals: [{ idx: 1, level: 'normal' }, { idx: 0, level: 'normal' }], days: 10 },
  { title: 'Royal Market', rivals: [{ idx: 2, level: 'hard' }, { idx: 3, level: 'normal' }, { idx: 4, level: 'normal' }], days: 10 },
];

export const leagueStage = (): number => { const n = readJson<unknown>(LADDER_KEY, 0); return typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0; };
export const saveLeagueStage = (n: number) => writeJson(LADDER_KEY, n);

export function leagueConfig(stage: number, name: string, avatar: string, seed: number): GameConfig {
  const st = LEAGUE[Math.min(stage, LEAGUE.length - 1)];
  return {
    players: [
      { name, kind: 'human', avatar },
      ...st.rivals.map((r) => ({ ...RIVALS[r.idx % RIVALS.length], kind: 'ai' as const, level: r.level })),
    ],
    days: st.days, unripe: true, upgrades: true, events: true, seed, league: stage,
  };
}

/** Moves the player up a stage after a league game they won on the stage they were on. */
function advanceLeague(g: GameState, me: number): boolean {
  const stage = g.config.league;
  if (stage === undefined || stage !== leagueStage() || !winners(g).includes(me)) return false;
  writeJson(LADDER_KEY, stage + 1);
  return true;
}

/** Records a finished league game. Returns true if it cleared the stage the player was on. `finishGame` does this as
 *  part of counting a game; the Market League's tiers (stage 2, stage 4, all six) are read from the stage saved. */
export function recordLeague(g: GameState, me: number): boolean {
  const ok = advanceLeague(g, me);
  if (ok) syncTiers();
  return ok;
}

// ---------- stall colours ----------

export interface Colour { id: string; name: string; hex: string }

/** The eight stall colours. Their names are in the one look list (src/net/looks.ts: "col_" and the id). */
const colour = (id: string, hex: string): Colour => ({ id, name: lookById(`col_${id}`)?.title ?? id, hex });
export const COLOURS: Colour[] = [
  colour('terra', C.terracotta), colour('teal', C.teal), colour('olive', C.c_7d8c3a), colour('gold', C.c_d99a2b),
  colour('plum', C.c_7b4a8c), colour('night', C.c_3d4f86), colour('rose', C.c_c9607a), colour('royal', C.c_5b3fa8),
];
/** A stall colour's hex by its id, or null. */
export const colourHex = (id: string | undefined): string | null => COLOURS.find((x) => x.id === id)?.hex ?? null;

/** Every stall colour is free for everyone. */
export const colourUnlocked = (_c: Colour) => true;
export const loadColour = (): string | null => {
  const id = readJson<string | null>(COLOUR_KEY, null);
  const c = COLOURS.find((x) => x.id === id);
  return c && colourUnlocked(c) ? c.hex : null;
};
export const saveColour = (id: string) => writeJson(COLOUR_KEY, id);

// ---------- things an account also keeps ----------

export const colourId = (): string => { const id = readJson<unknown>(COLOUR_KEY, null); return typeof id === 'string' ? id : ''; };
export const loadLooks = (): string[] => strings(readJson<unknown>(LOOKS_KEY, []));
export const saveLooks = (l: string[]) => writeJson(LOOKS_KEY, l);
export function loadWorn(): Record<string, string> {
  const raw = readJson<unknown>(WORN_KEY, {});
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === 'string'));
}
export const saveWorn = (w: Record<string, string>) => writeJson(WORN_KEY, w);
/** Sets that trophies count towards (shopkeepers won with, events seen, customers served...). Anything that is not a
 *  list of words is left out, so one damaged entry cannot stop the rest from loading. */
export function loadSets(): Sets {
  const raw = readJson<unknown>(SETS_KEY, {});
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, strings(v)]));
}
export const saveSets = (s: Sets) => writeJson(SETS_KEY, s);
/** Plain counts the stamp book is worked out from. A phone that never ran this version has none: everything is 0. */
export function loadCounts(): Counts {
  const raw = readJson<unknown>(COUNTS_KEY, {});
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>)
    .filter((e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1]) && e[1] > 0).map(([k, v]) => [k, Math.floor(v)]));
}
export const saveCounts = (c: Counts) => writeJson(COUNTS_KEY, c);
/** Looks granted by the server (none exist today). Only `saveGranted` writes it, with what the server sent. */
export const loadGranted = (): string[] => strings(readJson<unknown>(GRANTED_KEY, []));
export function saveGranted(ids: unknown) {
  try { localStorage.setItem(GRANTED_KEY, JSON.stringify(strings(ids))); } catch { /* storage unavailable */ }
}

/** Forgets everything an account keeps on this device (used when signing out, so the next person starts fresh). */
export function clearProgress() {
  try { for (const k of [ACH_KEY, LADDER_KEY, COLOUR_KEY, LOOKS_KEY, WORN_KEY, SETS_KEY, COUNTS_KEY, GRANTED_KEY]) localStorage.removeItem(k); } catch { /* ignore */ }
}
