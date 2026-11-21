// PLAN-114: the Market Sprint's boards. A finished Sprint is sent to the server, which replays it; the answer is the
// day's board (top ten, your place out of everyone, the players just above and below you) and this week's ranking
// (each player's best Sprint of each day, added up).
import type { GameState } from '../engine/game';
import { serverBase } from './client';
import { deviceClaim } from './daily';
import { AI_VERSION, RULES_VERSION } from './protocol';

/** One line of a board, with its place; `me` marks your own line; `days` (the week only): days with a Sprint. */
export interface PlacedEntry { place: number; name: string; cash: number; sold: number; me?: boolean; days?: number }
export interface BoardView { top: PlacedEntry[]; players: number; rank?: number; around: PlacedEntry[] }
export interface SprintBoards { day?: BoardView; week?: BoardView; weekOf?: string; error?: string }

const OFFLINE = 'The leaderboard needs an internet connection.';

/**
 * The hash of this device's secret key: the server keeps the same hash with each score, so this finds your own place
 * without sending the key itself. Undefined where the browser cannot hash (an insecure page).
 */
export async function ownerHash(): Promise<string | undefined> {
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(deviceClaim()));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return undefined;
  }
}

export async function submitSprint(g: GameState): Promise<SprintBoards> {
  if (!serverBase() || !g.config.sprint || !g.config.daily) return { error: OFFLINE };
  const me = g.players.find((p) => p.kind === 'human')!;
  try {
    const res = await fetch(`${serverBase()}/api/sprint`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date: g.config.daily, name: me.name, actions: g.moves ?? [], rv: RULES_VERSION, av: AI_VERSION, claim: deviceClaim() }),
    });
    const body = (await res.json()) as SprintBoards;
    return res.ok ? body : { error: body.error ?? 'Your score could not be sent.' };
  } catch {
    return { error: 'Offline. Your score was not sent.' };
  }
}

/** The day's Sprint board and the week's ranking, with your own place in each when you have one. */
export async function fetchSprint(date: string): Promise<SprintBoards> {
  if (!serverBase()) return { error: OFFLINE };
  try {
    const me = await ownerHash();
    const res = await fetch(`${serverBase()}/api/sprint?date=${date}${me ? `&me=${me}` : ''}`);
    return (await res.json()) as SprintBoards;
  } catch {
    return { error: OFFLINE };
  }
}

/** "1st", "2nd", "3rd", "4th", "11th", "12th", "21st". */
export function ordinal(n: number): string {
  const t = n % 100;
  const suffix = t >= 11 && t <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/** "12th of 48", or null without a place. */
export function placeWords(v: { rank?: number; players: number } | undefined): string | null {
  return v?.rank ? `${ordinal(v.rank)} of ${v.players}` : null;
}
