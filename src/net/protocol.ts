// Messages between browsers and the room server. Shared by both sides.
import { CHARACTER_AVATARS } from '../engine/data';
import type { Action, GameState } from '../engine/game';

export { CHARACTER_AVATARS };

/** Bump whenever the game rules change, so phones on an older build can't join a room that plays by newer rules. */
export const RULES_VERSION = 20;
/**
 * Bump whenever the computer players change (src/engine/ai.ts), even when the rules don't. Daily scores are verified by
 * replaying the game with the server's computer players (server/meta.ts verifyDaily), so a daily must be submitted and
 * replayed with the same version, and each version has its own daily board. Online rooms don't need it: their computer
 * players run only on the room server. 1 = up to 1.8.0; 2 = Closing Day jam value and the real tie order (PLAN-051);
 * 7 = rules 20 (PLAN-108): no jam value, so on the last day fruit left over is worth $0 to them; 8 = PLAN-117: the
 * Daily market's and the Sprint's three rivals all play at Normal (Uncle Benny was Hard). The computer players
 * themselves did not change, but the games the server replays did: a version bump gives the new set-up its own Daily
 * and Sprint boards (their keys carry this number), and a phone still on 7 is sent UPDATE_MSG when it sends a score.
 */
export const AI_VERSION = 8;
/** Bump whenever the messages between phones and the room server change, so old and new builds never share a room
 *  (3, PLAN-023: undo and rename; 4, PLAN-102: shopkeepers are chosen after the host starts a private room; 5, PLAN-112:
 *  public rooms, starting with computers after a wait, and preset reactions). */
export const PROTOCOL_VERSION = 5;
export const UPDATE_MSG = 'A new version of Fruit Market is out. Update the app (or refresh the page) to play online.';

export const MAX_SEATS = 6;
export const NAME_MAX = 14;

/**
 * PLAN-112: the preset reactions, 8 emoji and 4 short lines. Only the id travels between phones; each phone draws the
 * reaction from this list. No free text, no numbers and no fruit, so a reaction can never say what is in a crate or
 * what a price will be. The ids are fixed: the room server refuses any other.
 */
export const REACTIONS = [
  { id: 'smile', show: '😀', words: 'Smile' },
  { id: 'thumbs', show: '👍', words: 'Thumbs up' },
  { id: 'clap', show: '👏', words: 'Clap' },
  { id: 'wow', show: '😮', words: 'Surprised' },
  { id: 'phew', show: '😅', words: 'Phew' },
  { id: 'sob', show: '😭', words: 'Crying' },
  { id: 'fire', show: '🔥', words: 'On fire' },
  { id: 'thanks', show: '🙏', words: 'Thank you' },
  { id: 'luck', show: 'Good luck', words: 'Good luck' },
  { id: 'nice', show: 'Nice sale', words: 'Nice sale' },
  { id: 'oops', show: 'Oops', words: 'Oops' },
  { id: 'played', show: 'Well played', words: 'Well played' },
] as const;
export type ReactionId = (typeof REACTIONS)[number]['id'];
export function isReaction(x: unknown): x is ReactionId {
  return typeof x === 'string' && REACTIONS.some((r) => r.id === x);
}
/** One reaction every 2 s per seat; the room drops any sent sooner, quietly. */
export const REACT_GAP_MS = 2000;
/** PLAN-112: once a room has waited this long since it opened, its host may start with computers in the empty seats. */
export const COMPUTERS_AFTER_MS = 60_000;

/** PLAN-112: one public room still waiting for players, as the Public rooms list shows it. `waited`: ms since it opened. */
export interface PublicRoom { code: string; host: string; taken: number; days: 8 | 10 | 14; waited: number }

export interface RoomConfig { days: 8 | 10 | 14; ai: number; unripe: boolean; upgrades: boolean; events: boolean }
export const DEFAULT_CONFIG: RoomConfig = { days: 10, ai: 0, unripe: true, upgrades: true, events: true };

/** 'picking' (PLAN-102): a private room after the host starts, while everyone chooses a shopkeeper. */
export type RoomStatus = 'lobby' | 'picking' | 'playing' | 'finished';

export interface PublicSeat {
  /** `avatar`: the seat's shopkeeper; empty in a private room until it is chosen (PLAN-102). */
  seat: number; name: string; avatar: string; ready: boolean; connected: boolean; host: boolean;
  /** Set once this player has confirmed their shopkeeper in the choosing step. */
  confirmed?: boolean;
  /** What this player's shopkeeper and stall wear (see src/net/looks.ts). */
  look?: Record<string, string>;
  /** Set while this player is disconnected during a match. */
  offlineSince?: number;
  /** When a computer takes over this seat if the player hasn't come back. */
  takeoverAt?: number;
  /** A computer is currently playing for this player. */
  bot?: boolean;
  /** ON-09 (PLAN-110): this player left on purpose and cannot come back; a computer plays their seat for good. (Older
   *  rooms never send it; older apps read the seat as one a computer plays until its person comes back.) */
  left?: boolean;
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
  /** Set after someone takes back their purchases; n counts how many times, so every phone can tell it is new. */
  undone?: { seat: number; n: number };
  /** PLAN-112: a public room, listed for people looking for a game while it waits in the lobby. */
  public?: boolean;
  /** PLAN-112: how long the room had been open when this view was sent, in ms (the phone counts on from there). */
  waited?: number;
}

export type ClientMsg =
  | { t: 'hello'; token?: string; name: string; avatar: string; look?: Record<string, string>; rv?: number; pv?: number }
  | { t: 'look'; look: Record<string, string> }
  | { t: 'character'; avatar: string }
  | { t: 'confirm' }
  | { t: 'rename'; name: string }
  | { t: 'undo'; id: string; v: number }
  | { t: 'ready'; ready: boolean }
  | { t: 'config'; config: RoomConfig }
  | { t: 'start'; computers?: boolean }
  | { t: 'react'; r: ReactionId }
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
  | { t: 'react'; seat: number; r: ReactionId }
  | { t: 'pong' };

export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

export function normaliseCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
}
