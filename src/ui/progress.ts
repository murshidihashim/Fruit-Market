// Long-term goals kept on this device: achievements, the Market League (a ladder of rivals)
// and stall colours unlocked along the way.
import { RIVALS } from '../engine/data';
import { ranking, type GameConfig, type GameState, type Level } from '../engine/game';
import { dailyStreak, loadDaily, loadStats } from './store';
import { ACHIEVEMENTS, evaluate, type Achievement } from './achievements';
import { C } from './palette';
import { profileChanged } from './changed';

// ---------- achievements ----------

export { ACHIEVEMENTS, THEMES, type Achievement } from './achievements';

const ACH_KEY = 'fm.ach';
const LADDER_KEY = 'fm.ladder';
const COLOUR_KEY = 'fm.colour';
const LOOKS_KEY = 'fm.looks';
const WORN_KEY = 'fm.worn';
const SETS_KEY = 'fm.prog';

function readJson<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}
function writeJson(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ }
  profileChanged();
}

export const unlocked = (): string[] => readJson<string[]>(ACH_KEY, []);
export const saveUnlocked = (ids: string[]) => writeJson(ACH_KEY, ids);

/** Checks a finished game and returns achievements unlocked by it (and saves them, with the sets they count towards). */
export function checkAchievements(g: GameState, me: number, online = false): Achievement[] {
  if (g.phase !== 'over' || me < 0) return [];
  const have = unlocked();
  const { got, sets } = evaluate(g, me, { online, have: new Set(have), sets: loadSets(), stats: loadStats(), streak: dailyStreak(loadDaily()) });
  saveSets(sets);
  if (got.length) saveUnlocked([...have, ...got]);
  return ACHIEVEMENTS.filter((a) => got.includes(a.id));
}

export function unlockAchievement(id: string): Achievement | null {
  const have = unlocked();
  if (have.includes(id)) return null;
  writeJson(ACH_KEY, [...have, id]);
  return ACHIEVEMENTS.find((a) => a.id === id) ?? null;
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

export const leagueStage = (): number => readJson<number>(LADDER_KEY, 0);
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

/** Records a finished league game. Returns true if it cleared the stage the player was on. */
export function recordLeague(g: GameState, me: number): boolean {
  const stage = g.config.league;
  if (stage === undefined || stage !== leagueStage() || ranking(g)[0] !== me) return false;
  writeJson(LADDER_KEY, stage + 1);
  if (stage + 1 >= LEAGUE.length) unlockAchievement('league');
  return true;
}

// ---------- stall colours ----------

export interface Colour { id: string; name: string; hex: string }

export const COLOURS: Colour[] = [
  { id: 'terra', name: 'Terracotta', hex: C.terracotta },
  { id: 'teal', name: 'Harbour', hex: C.teal },
  { id: 'olive', name: 'Olive', hex: C.c_7d8c3a },
  { id: 'gold', name: 'Saffron', hex: C.c_d99a2b },
  { id: 'plum', name: 'Fig', hex: C.c_7b4a8c },
  { id: 'night', name: 'Midnight', hex: C.c_3d4f86 },
  { id: 'rose', name: 'Rose', hex: C.c_c9607a },
  { id: 'royal', name: 'Royal', hex: C.c_5b3fa8 },
];

/** Every stall colour is free for everyone. */
export const colourUnlocked = (_c: Colour) => true;
export const loadColour = (): string | null => {
  const id = readJson<string | null>(COLOUR_KEY, null);
  const c = COLOURS.find((x) => x.id === id);
  return c && colourUnlocked(c) ? c.hex : null;
};
export const saveColour = (id: string) => writeJson(COLOUR_KEY, id);

// ---------- things an account also keeps ----------

export const colourId = (): string => readJson<string | null>(COLOUR_KEY, null) ?? '';
export const loadLooks = (): string[] => readJson<string[]>(LOOKS_KEY, []);
export const saveLooks = (l: string[]) => writeJson(LOOKS_KEY, l);
export const loadWorn = (): Record<string, string> => readJson<Record<string, string>>(WORN_KEY, {});
export const saveWorn = (w: Record<string, string>) => writeJson(WORN_KEY, w);
/** Sets that achievements count towards (shopkeepers won with, events seen, customers served...). */
export const loadSets = (): Record<string, string[]> => readJson<Record<string, string[]>>(SETS_KEY, {});
export const saveSets = (s: Record<string, string[]>) => writeJson(SETS_KEY, s);

/** Forgets everything an account keeps on this device (used when signing out, so the next person starts fresh). */
export function clearProgress() {
  try { for (const k of [ACH_KEY, LADDER_KEY, COLOUR_KEY, LOOKS_KEY, WORN_KEY, SETS_KEY]) localStorage.removeItem(k); } catch { /* ignore */ }
}
