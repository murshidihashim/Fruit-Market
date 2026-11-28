// The match record of a game played on this phone (PLAN-133): kept beside the saved game while it is played, sent to
// the server at the end of each day and when the game ends or is left. Nothing is kept or sent while "Share game data"
// is off in Settings. An online match is recorded by the room server, not here.
import type { Action, GameState } from '../engine/game';
import { kindOf } from '../ui/modes';
import { loadSettings } from '../ui/store';
import { serverBase } from './client';
import { daySheet, endOf, newRecord, type DaySheet, type MatchRecord, type RecordMode, type TrailStep } from './matchRecord';
import { deviceNote, playerTag, postJson, randomHex } from './player';

const MAX_GAP = 600_000;
interface Kept { id: string; days: DaySheet[]; trail: TrailStep[]; opens: [number, string][]; undo: number; at: number; slow: number }

const sharing = (): boolean => { try { return loadSettings().analytics !== false && serverBase() !== ''; } catch { return false; } };
const keyOf = (s: GameState): string => `fm.rec.${s.config.seed}-${s.config.daily ?? ''}-${s.config.league ?? ''}-${s.config.sprint ? 's' : ''}`;
const now = (): number => Date.now();

function load(s: GameState): Kept {
  try {
    const raw = localStorage.getItem(keyOf(s));
    if (raw) return JSON.parse(raw) as Kept;
  } catch { /* unreadable: start a new one */ }
  return { id: randomHex(), days: [], trail: [], opens: [], undo: 0, at: now(), slow: 0 };
}
function save(s: GameState, k: Kept | null) {
  try { if (k) localStorage.setItem(keyOf(s), JSON.stringify(k)); else localStorage.removeItem(keyOf(s)); } catch { /* storage full or blocked: this game goes unrecorded */ }
}

const modeOf = (s: GameState): RecordMode => { const k = kindOf(s.config); return k === 'computer' ? 'solo' : k === 'passPlay' ? 'pass' : k; };

function build(s: GameState, k: Kept, seat?: number): MatchRecord {
  const who = playerTag();
  return {
    ...newRecord(k.id, modeOf(s), s), days: k.days, trail: k.trail, opens: k.opens, end: endOf(s, seat),
    dev: deviceNote(Math.min(3, k.slow === 0 ? 0 : k.slow <= 5 ? 1 : k.slow <= 20 ? 2 : 3)), ...(who ? { who } : {}),
  };
}

/** The game the screen is showing, for the notes that arrive without one (a card opened, a long pause). */
let current: GameState | null = null;

/**
 * One move made on this phone, just applied. Counted on the trail with the time since the last one; a day's sheet is
 * added as its takings are closed, and the record is sent then and when the game is over.
 */
export function noteMove(before: GameState, who: number, a: Action, next: GameState) {
  current = next;
  if (!sharing()) return;
  const k = load(before);
  const t = now();
  if (a.kind !== 'begin' && a.kind !== 'finish') {
    k.trail.push([who, a, Math.max(0, Math.min(MAX_GAP, t - k.at)), Math.min(99, k.undo)]);
    k.undo = 0;
  }
  k.at = t;
  let send = false;
  if (a.kind === 'finish') {
    const sheet = daySheet(before);
    if (sheet && !k.days.some((d) => d.d === sheet.d)) { k.days.push(sheet); send = true; }
  }
  if (next.phase === 'over') {
    const me = next.players.findIndex((p) => p.kind === 'human');
    postJson('/api/m', build(next, k, me));
    save(next, null);
    return;
  }
  save(next, k);
  if (send) postJson('/api/m', build(next, k));
}

/** A take-back on the buying turn (Undo). */
export function noteUndo(s: GameState) {
  if (!sharing()) return;
  const k = load(s);
  k.undo++;
  save(s, k);
}

/** A rule page, card or tip opened during a game: its name only. */
export function noteOpen(name: string) {
  const s = current;
  if (!s || s.phase === 'over' || !sharing()) return;
  const clean = name.toLowerCase().replace(/[^a-z0-9_.-]+/g, '_').replace(/^_+/, '').slice(0, 32);
  if (!clean) return;
  const k = load(s);
  if (k.opens.length < 200) k.opens.push([s.day, clean]);
  save(s, k);
}

/** The game on screen (so notes know which record they belong to), and the clock restarted when it is reopened. */
export function noteShown(s: GameState | null) {
  current = s;
  if (!s || s.phase === 'over' || !sharing()) return;
  const k = load(s);
  k.at = now();
  save(s, k);
}

/** A long pause of the screen (over 200 ms) while a game is open. */
export function noteSlow() {
  const s = current;
  if (!s || s.phase === 'over' || !sharing()) return;
  const k = load(s);
  k.slow++;
  save(s, k);
}

/** The game was left before its end: the record goes as it stands, with the step and the leaver's rank. It stays on
 *  the phone, since the game can be picked up again. */
export function noteLeft(s: GameState) {
  if (s.phase === 'over' || !sharing()) return;
  const me = s.players.findIndex((p) => p.kind === 'human');
  postJson('/api/m', build(s, load(s), me));
}
