// Daily challenge leaderboard: submit a finished daily (the server replays it) and read the top scores.
import type { GameState } from '../engine/game';
import { serverBase } from './client';

export interface BoardEntry { name: string; cash: number; sold: number }
export interface BoardResult { rank?: number; top: BoardEntry[]; players?: number; error?: string }

export async function submitDaily(g: GameState): Promise<BoardResult> {
  if (!serverBase() || !g.config.daily) return { top: [], error: 'Leaderboard needs an internet connection' };
  const me = g.players.find((p) => p.kind === 'human')!;
  try {
    const res = await fetch(`${serverBase()}/api/daily`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date: g.config.daily, name: me.name, actions: g.moves ?? [] }),
    });
    const body = (await res.json()) as BoardResult & { error?: string };
    return res.ok ? body : { top: [], error: body.error ?? 'Could not submit' };
  } catch {
    return { top: [], error: 'Offline: score not submitted' };
  }
}

export async function fetchDaily(date: string): Promise<BoardResult> {
  if (!serverBase()) return { top: [], error: 'offline' };
  try {
    const res = await fetch(`${serverBase()}/api/daily?date=${date}`);
    return (await res.json()) as BoardResult;
  } catch {
    return { top: [], error: 'offline' };
  }
}

/** A spoiler-free result to paste in a chat: one square per day showing how that day went. */
export function shareText(g: GameState, rank?: number, players?: number): string {
  const me = g.players.findIndex((p) => p.kind === 'human');
  const days = (g.history ?? []).map((d) => d.income[me]);
  const top = Math.max(1, ...days);
  const squares = days.map((x) => (x === 0 ? '⬜' : x >= top * 0.66 ? '🟩' : x >= top * 0.33 ? '🟨' : '🟧')).join('');
  const place = rank ? ` · #${rank}${players ? ` of ${players}` : ''}` : '';
  return `🍎 Fruit Market daily ${g.config.daily}\n$${g.players[me].cash}${place}\n${squares}`;
}
