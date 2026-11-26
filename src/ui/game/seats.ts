// Who is who at the game table as it is drawn: the people at this phone, whose turn it is and whether this phone acts
// for it, the stall the table is drawn for, the shared phone's hand-over, and online who the room is still waiting
// for. Pure: the game controller (useGameController.ts) works these out at each drawing; tests read them directly.
import { activePlayer, eveningOpen, type GameState, type Player } from '../../engine/game';
import type { PublicSeat, RoomView } from '../../net/protocol';
import { awaitsHandOver } from './turn';

/** The seats of the people (not the computers) at the table. */
export const humansOf = (players: Player[]): number[] => players.map((p, i) => (p.kind === 'human' ? i : -1)).filter((i) => i >= 0);

/** Whose turn it is, and whether this phone acts now. */
export interface Turn {
  /** The stall whose turn it is (-1: nobody's). */
  active: number;
  /** A secret step (stocking, pricing, the standing order's bid): every stall decides it at once. */
  secret: boolean;
  /** A person at this phone decides now. */
  activeHuman: boolean;
  /** The stall this phone acts for now: its own seat online, the stall whose turn it is offline. */
  actor: number;
}

/** `seat`: this phone's seat online (null offline). */
export function turnOf(s: GameState, seat: number | null, online: boolean): Turn {
  const active = activePlayer(s);
  const secret = s.phase === 'stall' || s.phase === 'bid' || s.phase === 'order';
  // Rules 19: online, every person decides in the evening at the same time, until they say Lights out. (Offline the
  // phone is handed person by person: the evening's `active` is the next person still deciding.)
  const activeHuman = online
    ? (s.phase === 'evening' ? seat !== null && eveningOpen(s, seat) : active === seat && !secret)
    : active >= 0 && s.players[active].kind === 'human';
  return { active, secret, activeHuman, actor: online ? seat ?? -1 : active };
}

/**
 * Offline, the stall the table is drawn for: on a shared phone the table is drawn for the person who holds it, so the
 * next person's shelf is not drawn until the phone has been handed to them (PLAN-085: a beat may play between one
 * person's last tap and the hand-over). `last`: the stall it was drawn for until now.
 */
export function drawnFor(last: number, t: Turn, multi: boolean, handedTo: number | null, online: boolean): number {
  return !online && t.activeHuman && (!multi || handedTo === t.active) ? t.active : last;
}

/** A shared phone's hand-over. */
export interface HandOver {
  /** The hand-over screen is up: the turn is a person's the phone has not been handed to, and the table is free. */
  needHandoff: boolean;
  /** REP-133 A-01: from the moment the turn passes to someone not yet handed the phone (while the last beat still
   *  plays, before the hand-over screen comes up) until they tap it, no tap on the table acts. */
  handoffDue: boolean;
}

export function handOverOf(s: GameState, t: Turn, multi: boolean, handedTo: number | null, busy: boolean, online: boolean): HandOver {
  return {
    needHandoff: !online && multi && t.activeHuman && handedTo !== t.active && !busy,
    handoffDue: !online && awaitsHandOver(s, handedTo),
  };
}

/** Online: who the room is waiting for. Offline every list is empty and this phone bids on its own turn. */
export interface Waits {
  /** This phone's secret prices (or crate, or bid) are still to be sent. */
  myBidTurn: boolean;
  /** People whose secret choice is still missing. */
  humansMissingBids: number[];
  /** Rules 19: people the evening is still waiting for (a computer has always decided). */
  eveningWaits: number[];
  /** This phone has pressed continue, and who has not. */
  votedMe: boolean;
  humansNotVoted: number[];
  /** Seats that have dropped out or that a computer is playing. */
  offline: PublicSeat[];
}

export function waitsOf(s: GameState, meta: RoomView | null, humans: number[], viewer: number, t: Turn, online: boolean): Waits {
  const room = online ? meta : null;
  // People the match is waiting on (a seat a computer is playing never holds things up).
  const live = room ? humans.filter((i) => !room.seats[i]?.bot) : humans;
  return {
    myBidTurn: online ? t.secret && !!meta && !meta.submitted[viewer] : t.secret && t.activeHuman,
    humansMissingBids: room ? live.filter((i) => !room.submitted[i]) : [],
    eveningWaits: s.phase === 'evening' ? live.filter((i) => eveningOpen(s, i)) : [],
    votedMe: !!room && room.votes.includes(viewer),
    humansNotVoted: room ? live.filter((i) => !room.votes.includes(i)) : [],
    offline: room ? room.seats.filter((x) => !x.connected || x.bot) : [],
  };
}

/** The names of these stalls, as one line ("Raj and Farah"). */
export const namesOf = (s: GameState, idxs: number[]): string => idxs.map((i) => s.players[i]?.name).filter(Boolean).join(' and ');

/** The countdown to a computer taking over a dropped seat: whether one runs, and a key that changes with any seat's. */
export function takeoverClock(offline: PublicSeat[]): { counting: boolean; key: string } {
  return { counting: offline.some((x) => !!x.takeoverAt && !x.bot), key: offline.map((x) => `${x.seat}:${x.takeoverAt}:${x.bot}`).join() };
}
