// What an account keeps: the things a player collects and the records they set. Shared by the app
// and the server. Everything here only ever grows when two copies are merged, so signing in on a
// second phone never loses anything. It never holds a game in progress.

export const PROFILE_VERSION = 1;

export interface ProfileStats { played: number; wins: number; bestCash: number; totalSold: number }

export interface Profile {
  v: typeof PROFILE_VERSION;
  /** When this copy last changed (ms). The newer copy wins for single values such as the name. */
  at: number;
  name: string;
  /** The shopkeeper's picture key (see CHARACTER_AVATARS). */
  avatar: string;
  /** The chosen stall colour id. */
  colour: string;
  achievements: string[];
  /** Collectible looks owned (stall pieces and things worn by the shopkeeper). */
  looks: string[];
  /** What is on show: slot id to look id. */
  worn: Record<string, string>;
  /** How many Market League stages are cleared. */
  league: number;
  /** Best cash per daily date (YYYY-MM-DD). */
  daily: Record<string, number>;
  stats: ProfileStats;
  /** Sets that achievements count towards, such as shopkeepers won with or events seen. */
  progress: Record<string, string[]>;
}

const MAX_LIST = 300;
const MAX_DAILY = 400;
const MAX_SETS = 24;
const ID_RE = /^[A-Za-z0-9_.:-]{1,40}$/;
/**
 * A member of a progress set: an id, or a name the game shows, such as "Uncle Benny" or "Hock Seng" (PLAN-081: names
 * with a space used to be dropped at every sync, so some achievements could never complete for a signed-in player).
 * Words of the same characters as an id, with one space between words: none at either end, never two in a row, and no
 * other blank character. At most 40 characters, spaces included. Everything else (set names, achievement and look ids,
 * the colour, what is worn) stays an id.
 */
const MEMBER_RE = /^(?=.{1,40}$)[A-Za-z0-9_.:-]+(?: [A-Za-z0-9_.:-]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function emptyProfile(): Profile {
  return {
    v: PROFILE_VERSION, at: 0, name: '', avatar: '', colour: '', achievements: [], looks: [], worn: {}, league: 0, daily: {},
    stats: { played: 0, wins: 0, bestCash: 0, totalSold: 0 }, progress: {},
  };
}

const num = (x: unknown, max = 1e9): number => (typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.min(max, Math.floor(x))) : 0);
// eslint-disable-next-line no-control-regex -- stripping control characters on purpose
const text = (x: unknown, max: number): string => (typeof x === 'string' ? x.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, max) : '');
/** A list of distinct strings that pass the check, cut to the list limit. */
const list = (x: unknown, ok: RegExp): string[] => (Array.isArray(x) ? [...new Set(x.filter((e): e is string => typeof e === 'string' && ok.test(e)))].slice(0, MAX_LIST) : []);
const ids = (x: unknown): string[] => list(x, ID_RE);

/** Turns anything into a safe, well-formed profile: unknown fields are dropped and every value is limited. */
export function cleanProfile(raw: unknown): Profile {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out = emptyProfile();
  out.at = num(r.at, 4e12);
  out.name = text(r.name, 14);
  out.avatar = text(r.avatar, 8);
  out.colour = ID_RE.test(String(r.colour ?? '')) ? String(r.colour) : '';
  out.achievements = ids(r.achievements);
  out.looks = ids(r.looks);
  if (r.worn && typeof r.worn === 'object') {
    for (const [slot, look] of Object.entries(r.worn as Record<string, unknown>).slice(0, 16)) {
      if (ID_RE.test(slot) && typeof look === 'string' && ID_RE.test(look)) out.worn[slot] = look;
    }
  }
  out.league = num(r.league, 100);
  if (r.daily && typeof r.daily === 'object') {
    for (const [d, v] of Object.entries(r.daily as Record<string, unknown>).slice(0, MAX_DAILY)) if (DATE_RE.test(d)) out.daily[d] = num(v);
  }
  const s = (r.stats && typeof r.stats === 'object' ? r.stats : {}) as Record<string, unknown>;
  out.stats = { played: num(s.played), wins: num(s.wins), bestCash: num(s.bestCash), totalSold: num(s.totalSold) };
  if (r.progress && typeof r.progress === 'object') {
    // The set's name is an id; its members may be names (see MEMBER_RE).
    for (const [k, v] of Object.entries(r.progress as Record<string, unknown>).slice(0, MAX_SETS)) if (ID_RE.test(k)) out.progress[k] = list(v, MEMBER_RE);
  }
  return out;
}

const union = (a: string[], b: string[]): string[] => [...new Set([...a, ...b])].slice(0, MAX_LIST);

/**
 * Combines two copies of a profile. Collected things are joined, records keep the higher value,
 * and single choices (name, colour, what is worn) come from the copy that changed last.
 */
export function mergeProfiles(a: Profile, b: Profile): Profile {
  const [older, newer] = a.at <= b.at ? [a, b] : [b, a];
  const daily: Record<string, number> = { ...older.daily };
  for (const [d, v] of Object.entries(newer.daily)) daily[d] = Math.max(daily[d] ?? 0, v);
  const progress: Record<string, string[]> = {};
  for (const k of new Set([...Object.keys(a.progress), ...Object.keys(b.progress)])) progress[k] = union(a.progress[k] ?? [], b.progress[k] ?? []);
  const looks = union(a.looks, b.looks);
  const worn: Record<string, string> = {};
  // What is on show comes from the copy that changed last, so taking something off sticks.
  for (const [slot, look] of Object.entries(newer.at > 0 ? newer.worn : older.worn)) if (looks.includes(look)) worn[slot] = look;
  return {
    v: PROFILE_VERSION,
    at: Math.max(a.at, b.at),
    name: newer.name || older.name,
    avatar: newer.avatar || older.avatar,
    colour: newer.colour || older.colour,
    achievements: union(a.achievements, b.achievements),
    looks,
    worn,
    league: Math.max(a.league, b.league),
    daily: Object.fromEntries(Object.entries(daily).slice(-MAX_DAILY)),
    stats: {
      played: Math.max(a.stats.played, b.stats.played), wins: Math.max(a.stats.wins, b.stats.wins),
      bestCash: Math.max(a.stats.bestCash, b.stats.bestCash), totalSold: Math.max(a.stats.totalSold, b.stats.totalSold),
    },
    progress,
  };
}

/** True when the profile has nothing in it worth uploading. */
export function isBlank(p: Profile): boolean {
  return p.achievements.length === 0 && p.looks.length === 0 && p.league === 0 && Object.keys(p.daily).length === 0
    && p.stats.played === 0 && Object.values(p.progress).every((v) => v.length === 0);
}
