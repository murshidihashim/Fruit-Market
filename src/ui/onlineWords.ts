// The online screens' words that depend on the room (Online.tsx and the room, wait and pick screens). Pure, so they
// can be unit tested (REP-140 A-02: moved out of Online.tsx unchanged).
import { COMPUTERS_AFTER_MS, MAX_SEATS, type PublicSeat, type RoomView } from '../net/protocol';

/** PLAN-102: in a private room, shopkeepers are chosen once everyone is in. */
export const PICK_LATER = 'Everyone chooses a shopkeeper when the host starts.';
/** PLAN-112: what making a public room means, said before it is made. */
export const PUBLIC_WORDS = 'Your room and your name show in Public rooms until the game starts. Anyone can join.';

/** PLAN-112: "Waiting 3 min" for a public room in the list. */
export function waitedWords(ms: number): string {
  const min = Math.floor(ms / 60_000);
  return min < 1 ? 'Just opened' : `Waiting ${min} min`;
}

/** The host's start button in a private lobby. PLAN-107 (ON-05): never "everyone to be ready" while a seat is
 *  disconnected: it names who the room is waiting for. */
export function startLabel(v: RoomView): string {
  const away = v.seats.filter((x) => !x.connected);
  if (v.seats.length >= 2 && !away.length && v.seats.every((x) => x.ready)) return 'Start the game';
  if (v.seats.length < 2) return 'Waiting for a player…';
  return away.length ? `Waiting for ${away.map((x) => x.name).join(' and ')} to come back` : 'Waiting for everyone to be ready…';
}

/** PLAN-116 (REP-133 B-05): the invite box's line counts the stalls still free (people and computers both take one). */
export function inviteLine(free: number): string {
  if (free <= 0) return 'All stalls taken';
  return free === 1 ? 'Invite 1 more friend' : `Invite up to ${free} friends`;
}

/** PLAN-113: a seat's state in the private lobby (the words a screen reader hears for its card). */
export function seatChip(x: PublicSeat): string {
  if (x.left) return 'Left';
  if (!x.connected) return 'Away';
  const r = x.ready ? 'Ready' : 'Not ready';
  return x.host ? `Host · ${r}` : r;
}

/** PLAN-125: the big word on a person's card in the room ("Friend · Joined", "You · Ready"). */
export function seatBand(x: PublicSeat): string {
  if (x.left) return 'Left';
  if (!x.connected) return 'Away';
  return x.ready ? 'Ready' : 'Joined';
}

/**
 * PLAN-112: the host's offer to start with computers in the empty seats, once the room has waited COMPUTERS_AFTER_MS
 * since it opened (`openedAt`, on this phone's clock). Null when there is no offer to make: not the host, a quick
 * match, or no seat free. Before the wait is over, the words say how long is left.
 */
export function computersOffer(v: RoomView, openedAt: number, now: number): { ready: boolean; othersReady: boolean; label: string } | null {
  const me = v.seats[v.you];
  const free = MAX_SEATS - v.seats.length - v.config.ai;
  if (!me?.host || v.quick || v.status !== 'lobby' || free <= 0) return null;
  const left = Math.ceil((openedAt + COMPUTERS_AFTER_MS - now) / 1000);
  const n = MAX_SEATS - v.seats.length;
  const othersReady = v.seats.every((x) => x.seat === v.you || (x.ready && x.connected));
  // REP-140 B-13: "+ Computer" puts a computer at an empty stall at any time; the wait is only for starting at once with
  // a computer at every empty stall (the room server's rule, even for a host alone).
  if (left > 0) return { ready: false, othersReady, label: `Add computers now with + Computer, or in ${left}s start with a computer at every empty stall.` };
  return { ready: true, othersReady, label: `Start with ${n} computer${n === 1 ? '' : 's'}` };
}

/** ON-07 (PLAN-110): the choosing step's line for a person who dropped out before confirming. */
export function pickAwayLine(x: PublicSeat, now: number): string {
  if (x.left) return `${x.name} left. A computer chooses for them.`;
  if (x.bot || x.takeoverAt === undefined) return `${x.name} disconnected. A computer chooses for them.`;
  return `${x.name} disconnected. A computer chooses for them in ${Math.max(0, Math.ceil((x.takeoverAt - now) / 1000))}s.`;
}

/** PLAN-125: a seat's state on the pick screen. */
export function pickState(x: PublicSeat): string {
  return x.left ? 'Left' : x.confirmed ? 'Confirmed' : x.connected ? 'Choosing' : 'Away';
}
