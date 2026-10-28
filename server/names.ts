// Player-name policy for anything other people can see (online rooms, the daily leaderboard).
// Names are cleaned, then checked against a small blocklist and a list of reserved names.
// The lists are deliberately short; extend them as reports come in.
import { RIVALS } from '../src/engine/data';
import { NAME_MAX } from '../src/net/protocol';

/** Fragments that are never innocent, so they're blocked anywhere in a name ("xXshitXx"). */
const BLOCKED_ANYWHERE = ['fuck', 'shit', 'cunt', 'nigg', 'whore', 'slut', 'porn', 'bitch', 'asshole', 'retard', 'hitler', 'killyourself', 'motherf'];
/** Words blocked only on their own, because they hide inside innocent names (grape, peacock, Nazir). */
const BLOCKED_WORDS = ['dick', 'cock', 'rape', 'nazi', 'fag', 'pussy', 'bastard', 'kys', 'sex', 'penis', 'anal'];

/** Former rival names, still shown in games saved before a rename (PLAN-006). */
const FORMER_RIVALS = ['Panda Lim', 'Foxy Rosa', 'Big Benny', 'Patches', 'Uncle Toad', 'Rocky', 'Pinky'];

/** Names that would impersonate the game or its computer rivals. */
const RESERVED = ['admin', 'moderator', 'mod', 'official', 'fruitmarket', 'system', ...RIVALS.map((r) => r.name), ...FORMER_RIVALS];

const LOOKALIKE: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i', '|': 'i' };

/** Letters only, lower case, with common look-alike characters folded ("Sh1t" -> "shit"). */
export function squash(name: string): string {
  return name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[0-9@$!|]/g, (c) => LOOKALIKE[c] ?? c)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // accents
    .replace(/[^a-z]/g, '');
}

/** Strips control characters and markup, trims, and limits the length. */
export function tidy(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  // eslint-disable-next-line no-control-regex -- stripping control characters on purpose
  return raw.normalize('NFKC').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

/** Why a name isn't allowed, or null if it's fine. */
export function nameProblem(name: string): string | null {
  const s = squash(name);
  if (!s) return null;
  if (BLOCKED_ANYWHERE.some((b) => s.includes(b))) return 'blocked';
  const words = name.split(/[\s._-]+/).map(squash).filter(Boolean);
  if (words.some((w) => BLOCKED_WORDS.includes(w))) return 'blocked';
  // Compare with and without look-alike folding, so "admin!" and "4dmin" both count as "admin".
  const plain = name.normalize('NFKC').toLowerCase().replace(/[^a-z]/g, '');
  if (RESERVED.some((r) => squash(r) === s || squash(r) === plain)) return 'reserved';
  return null;
}

/** A name safe to show to others, or `fallback` when the typed one is empty or not allowed. */
export function safeName(raw: unknown, fallback: string): string {
  const n = tidy(raw);
  return n && !nameProblem(n) ? n : fallback;
}
