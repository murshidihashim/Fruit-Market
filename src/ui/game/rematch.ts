// The line over Rematch on an online results screen, kept apart from Preact so it can be unit tested.
import type { RoomView } from '../../net/protocol';

/**
 * PLAN-107 (ON-04): who has left, and who the rematch is waiting for. The room starts a rematch once every person still
 * connected has asked for it (server/room.ts tryRematch); a seat whose person has gone (Home, the app closed, or left
 * during the game) is played by the computer, so it is named as gone and never waited for. Undefined: nothing to say.
 */
export function rematchLine(meta: RoomView, viewer: number): string | undefined {
  const list = (xs: number[]) => xs.map((i) => meta.seats[i].name).join(' and ');
  const people = meta.seats.map((_, i) => i);
  const left = people.filter((i) => !meta.seats[i].connected || meta.seats[i].bot);
  const here = people.filter((i) => !left.includes(i));
  const asked = here.filter((i) => meta.rematch.includes(i));
  const waiting = here.filter((i) => !meta.rematch.includes(i));
  const gone = left.length ? `${list(left)} ${left.length === 1 ? 'has' : 'have'} left.` : '';
  const votes = !meta.rematch.length ? (left.length ? 'A computer plays for them in a rematch.' : '')
    : meta.rematch.includes(viewer) ? (waiting.length ? `Waiting for ${list(waiting)} to accept…` : '')
    : asked.length ? `${list(asked)} ${asked.length === 1 ? 'wants' : 'want'} a rematch.` : '';
  return [gone, votes].filter(Boolean).join(' ') || undefined;
}
