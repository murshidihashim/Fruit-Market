// Local persistence: settings, stats, saved game, daily challenge records.
import type { GameState } from '../engine/game';

export interface Settings { sound: boolean; haptics: boolean; fast: boolean; tips: boolean }
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

export const loadSettings = () => read<Settings>(K.settings, { sound: true, haptics: true, fast: false, tips: true });
export const saveSettings = (s: Settings) => write(K.settings, s);

export const loadStats = () => read<Stats>(K.stats, { played: 0, wins: 0, bestCash: 0, totalSold: 0 });
export const saveStats = (s: Stats) => write(K.stats, s);

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(K.save);
    return raw ? (JSON.parse(raw) as GameState) : null;
  } catch {
    return null;
  }
}
export const saveGame = (g: GameState | null) => write(K.save, g);

export const loadDaily = () => read<DailyRecord>(K.daily, {});
export const saveDaily = (d: DailyRecord) => write(K.daily, d);

export function loadName(): string {
  try {
    return localStorage.getItem(K.name) || 'You';
  } catch {
    return 'You';
  }
}
export function saveName(n: string) {
  try {
    localStorage.setItem(K.name, n);
  } catch {
    /* ignore */
  }
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Consecutive days (ending today or yesterday) with a daily challenge played. */
export function dailyStreak(rec: DailyRecord, today = new Date()): number {
  let n = 0;
  const d = new Date(today);
  if (rec[todayKey(d)] === undefined) d.setDate(d.getDate() - 1);
  while (rec[todayKey(d)] !== undefined) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
