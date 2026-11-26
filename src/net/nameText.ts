// REP-140 A-06: how a player's name is cleaned, in one pure function shared by the room server and the leaderboard
// (server/names.ts tidy) and by the phone (the name boxes, store.ts fitName, and the account profile, profile.ts), so a
// name is cleaned the same way everywhere. The limit is protocol.ts NAME_MAX; the blocked and reserved names stay in
// server/names.ts.
import { NAME_MAX } from './protocol';

/** Control characters and markup dropped, NFKC (full-width letters become plain ones), every run of blanks one space. */
function plainName(raw: string): string {
  // eslint-disable-next-line no-control-regex -- stripping control characters on purpose
  return raw.normalize('NFKC').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ');
}

/** A name as the server keeps it: cleaned, trimmed and cut to NAME_MAX ('' for anything that is not text). */
export function tidyName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return plainName(raw).trim().slice(0, NAME_MAX);
}

/** A name as it is typed into a name box: cleaned and cut as the server will keep it, but its ends are kept while
 *  typing (a space between two words comes one key at a time). Ends are trimmed when the name is saved. */
export function typedName(raw: string): string {
  return plainName(raw).slice(0, NAME_MAX);
}
