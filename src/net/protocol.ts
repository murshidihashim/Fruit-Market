// Messages between browsers and the room server. Shared by both sides.
import { CHARACTER_AVATARS } from '../engine/data';
import type { Action, GameState } from '../engine/game';

export { CHARACTER_AVATARS };

/** Bump whenever the game rules change, so phones on an older build can't join a room that plays by newer rules. */
export const RULES_VERSION = 5;
export const UPDATE_MSG = 'A new version of Fruit Market is out. Update the app (or refresh the page) to play online.';

export const MAX_SEATS = 4;
export const NAME_MAX = 14;

export interface RoomConfig { days: 8 | 10 | 14; ai: number; unripe: boolean; upgrades: boolean; events: boolean }
export const DEFAULT_CONFIG: RoomConfig = { days: 10, ai: 0, unripe: true, upgrades: true, events: true };

export type RoomStatus = 'lobby' | 'playing' | 'finished';

export interface PublicSeat {
  seat: number; name: string; avatar: string; ready: boolean; connected: boolean; host: boolean;
  /** Set while this player is disconnected during a match. */
  offlineSince?: number;
  /** When a computer takes over this seat if the player hasn't come back. */
  takeoverAt?: number;
  /** A computer is currently playing for this player. */
  bot?: boolean;
}

/** What one browser receives. `game` is that player's own filtered view. */
export interface RoomView {
  t: 'room';
  code: string;
  status: RoomStatus;
  you: number;
  seats: PublicSeat[];
  config: RoomConfig;
  version: number;
  game: GameState | null;
  /** Per player index: secret prices locked in this round (true for computer players once they've priced). */
  submitted: boolean[];
  /** Player indexes who pressed continue in the morning or after sales. */
  votes: number[];
  rematch: number[];
  /** A quick-match room with a stranger: no lobby settings, it starts when two are in. */
  quick?: boolean;
}

export type ClientMsg =
  | { t: 'hello'; token?: string; name: string; avatar: string; rv?: number }
  | { t: 'character'; avatar: string }
  | { t: 'ready'; ready: boolean }
  | { t: 'config'; config: RoomConfig }
  | { t: 'start' }
  | { t: 'leave' }
  | { t: 'act'; id: string; v: number; action: Action }
  | { t: 'continue'; v: number }
  | { t: 'rematch' }
  | { t: 'ping' };

export type ServerMsg =
  | RoomView
  | { t: 'welcome'; seat: number; token: string; code: string }
  | { t: 'error'; msg: string; id?: string; fatal?: boolean; update?: boolean }
  | { t: 'ack'; id: string }
  | { t: 'pong' };

export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

export function normaliseCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
}
