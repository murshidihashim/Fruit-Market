// The First token on the stalls' row (PLAN-104): where it is drawn, and whether it has landed on today's first buyer.
// Its moment is the start of buying, when the row is first seen on a new day (the morning sheet, or the standing
// order's, leaves the table): the token spins round the seats on Day 1 and lands on the first buyer, and on a later
// day slides from yesterday's first buyer to today's (game/dayBeats.tsx firstToken). Until it has landed nothing gives
// away where it is going: not the token, not the row's "buying" mark, not the bottom bar. Each phone plays a day's beat
// once: it remembers the last day it showed, and with it where the token lay, for the next day's slide. It only
// changes what is drawn, never the game.
import { useEffect, useState } from 'preact/hooks';
import type { GameState } from '../engine/game';

/** How the token is drawn now: on stall `at` (null: not on the row), and whether it has landed there. */
export interface TokenShown { at: number | null; landed: boolean }

/** The last morning this phone has shown, and who was first then. */
interface Seen { game: string; day: number; p: number }

const STORE = 'fm.firstToken';
/** A game told apart from another by its seed and its stalls (the same on every phone in a room). */
export const gameKey = (s: GameState): string => `${s.config.seed}:${s.players.map((pl) => pl.name).join('|')}`;

let seen: Seen | null | undefined;
function readSeen(): Seen | null {
  if (seen !== undefined) return seen;
  seen = null;
  try {
    const raw = localStorage.getItem(STORE);
    const x = raw ? (JSON.parse(raw) as Partial<Seen>) : null;
    if (x && typeof x.game === 'string' && typeof x.day === 'number' && typeof x.p === 'number') seen = { game: x.game, day: x.day, p: x.p };
  } catch {
    /* storage unavailable: the phone remembers for as long as the page is open */
  }
  return seen;
}

/** This phone has shown today's first buyer (once a day's beat has played, or the row was drawn at rest). */
export function noteSeen(s: GameState): void {
  const p = s.order[0];
  if (p === undefined) return;
  const game = gameKey(s);
  const was = readSeen();
  if (was && was.game === game && was.day === s.day && was.p === p) return;
  seen = { game, day: s.day, p };
  try { localStorage.setItem(STORE, JSON.stringify(seen)); } catch { /* storage unavailable: kept in memory only */ }
}

/** Has this phone already shown this day's first buyer? */
export function seenToday(s: GameState): boolean {
  const x = readSeen();
  return !!x && x.game === gameKey(s) && x.day === s.day;
}

/** Where the token lay yesterday on this phone (null: not known, such as a game opened on another phone). */
export function yesterday(s: GameState): number | null {
  const x = readSeen();
  return x && x.game === gameKey(s) && x.day === s.day - 1 && !!s.players[x.p] ? x.p : null;
}

/** The morning, and the bid for a standing order: a sheet lies over the row, and buying (the token's moment) is to come. */
export const beforeBuying = (s: GameState): boolean => s.phase === 'morning' || s.phase === 'order';

/** Before a day's beat: the token lies where this phone last showed it (yesterday's first buyer), or nowhere. */
export const beforeBeat = (s: GameState): TokenShown => ({ at: yesterday(s), landed: false });

let held: TokenShown | null = null;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((l) => l());

/** Draws the token as `t` until released (null), whatever the state says. */
export function holdToken(t: TokenShown | null): void {
  held = t;
  changed();
}
export const releaseToken = () => { if (held) holdToken(null); };
/** A beat is holding the token (its day is not shown yet). */
export const tokenHeld = (): boolean => held !== null;
/** The token is on its way and has not landed: the bottom bar waits with who is buying and your buying buttons. */
export const tokenOnItsWay = (): boolean => held !== null && !held.landed;

/**
 * How to draw the token for state `s`. While a beat holds it, as the beat says. Before buying on a day this phone has
 * not yet shown, as it lay before (a sheet covers the row; the beat plays as buying starts). Otherwise landed on
 * today's first buyer.
 */
export function shownToken(s: GameState): TokenShown {
  if (held) return held;
  if (beforeBuying(s) && !seenToday(s)) return beforeBeat(s);
  return { at: s.order[0] ?? null, landed: true };
}

/** Redraws the calling component whenever the token's hold changes. */
export function useTokenShown(): void {
  const [, set] = useState(0);
  useEffect(() => {
    const l = () => set((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
}

/** Tests: forget what this phone has seen. */
export function resetSeen(): void { seen = undefined; held = null; }
