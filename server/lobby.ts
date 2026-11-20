// PLAN-112: the list of public rooms still waiting for players. Pure logic, so it runs in tests without Cloudflare;
// worker.ts keeps it in one Durable Object (LobbyDO) for the whole game.
//
// - A public room tells the list when it opens, when its seats change, and when it starts, fills or closes
//   (server/room.ts `listing`). While it is listed it says so again every LIST_REFRESH_MS.
// - An entry not heard of for LIST_TTL_MS is dropped on its own, so a room that crashed cannot stay listed.
// - The list holds only what the room's own players already see: the code, the host's name (already checked by
//   server/names.ts), the seats taken and the game length. Nothing about anyone else, and nothing about a game.
import { MAX_SEATS, normaliseCode, CODE_LENGTH, NAME_MAX, type PublicRoom } from '../src/net/protocol';

/** What a room sends about itself. `openedAt`: when the room opened (server time). */
export interface Listing { code: string; host: string; taken: number; days: 8 | 10 | 14; openedAt: number }
/** One entry as the list keeps it: `seenAt` is when the room last said it is still waiting. */
export interface ListEntry extends Listing { seenAt: number }

/** How often a listed room says it is still waiting. */
export const LIST_REFRESH_MS = 60_000;
/** An entry not heard of for this long is dropped (two refreshes missed and a little more). */
export const LIST_TTL_MS = 150_000;
/** The most rooms the list keeps, and the most it shows. */
export const LIST_KEEP = 200;
export const LIST_SHOW = 20;

/** A room's message, checked: null when it is not a well-formed listing. */
export function cleanListing(raw: unknown): Listing | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const code = typeof r.code === 'string' ? normaliseCode(r.code) : '';
  const host = typeof r.host === 'string' ? r.host.slice(0, NAME_MAX) : '';
  const taken = Number(r.taken);
  const days = Number(r.days);
  const openedAt = Number(r.openedAt);
  if (code.length !== CODE_LENGTH || !host || !Number.isInteger(taken) || taken < 1 || taken > MAX_SEATS) return null;
  if (days !== 8 && days !== 10 && days !== 14) return null;
  if (!Number.isFinite(openedAt) || openedAt <= 0) return null;
  return { code, host, taken, days, openedAt };
}

/** The list after a room has said it is waiting (added, or brought up to date). A full room is taken off instead. */
export function listPut(list: readonly ListEntry[], e: Listing, now: number): ListEntry[] {
  const rest = fresh(list, now).filter((x) => x.code !== e.code);
  if (e.taken >= MAX_SEATS) return rest;
  return [...rest, { ...e, seenAt: now }].slice(-LIST_KEEP);
}

/** The list after a room has started, filled or closed. */
export function listDrop(list: readonly ListEntry[], code: string, now: number): ListEntry[] {
  return fresh(list, now).filter((x) => x.code !== code);
}

/** What the Public rooms list shows: rooms still heard of and not full, the longest waiting first. */
export function listShow(list: readonly ListEntry[], now: number): PublicRoom[] {
  return fresh(list, now)
    .filter((x) => x.taken < MAX_SEATS)
    .sort((a, b) => a.openedAt - b.openedAt)
    .slice(0, LIST_SHOW)
    .map((x) => ({ code: x.code, host: x.host, taken: x.taken, days: x.days, waited: Math.max(0, now - x.openedAt) }));
}

function fresh(list: readonly ListEntry[], now: number): ListEntry[] {
  return list.filter((x) => now - x.seenAt < LIST_TTL_MS);
}
