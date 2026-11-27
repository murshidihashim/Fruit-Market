// PLAN-113: the words and set-ups behind the Play menu and the Quick match wait. Pure, so they can be unit tested.
// Nothing here changes a rule: the player counts and lengths are the game's own (MAX_SEATS, DEFAULT_CONFIG, LEAGUE).
import { MARKET_DAY_EVERY, ORDER_LEAD, RIVALS, lookOf, prefOf } from '../engine/data';
import type { GameConfig, PlayerConfig } from '../engine/game';
import { DEFAULT_CONFIG, MAX_SEATS, QUICK_FILL_MS, type RoomConfig } from '../net/protocol';
import { LEAGUE } from './progress';
import type { Stage } from './campaign';
import { CUSTOM_MATCH } from './modes';

/** The game lengths a new game offers (the Play menu's, the set-up screen's and the room's), shortest first everywhere
 *  (PLAN-116, REP-133 B-14: the Play menu put Standard first, the other two Quick). */
export const LENGTHS: { days: RoomConfig['days']; word: string }[] = [{ days: 8, word: 'Quick' }, { days: 10, word: 'Standard' }, { days: 14, word: 'Long' }];
export const lengthWord = (days: number): string => LENGTHS.find((l) => l.days === days)?.word ?? `${days} days`;

/** PLAN-125 (DEC-133): the four ways to play a Custom match, with their names and lines (modes.ts, REP-140 A-06). */
export { WAYS, wayLine, wayName, type PlayWay } from './modes';

/** PLAN-125: a Quick Match is for 2, 4 or 6 stalls (2 is the default). Strangers are looked for up to QUICK_FILL_MS, then
 *  Normal computers take the empty stalls (the room server decides; this is only what the screen says). It is played at
 *  the room's standard length. */
export type QuickStalls = 2 | 4 | 6;
export const QUICK_STALLS: QuickStalls = 2;
export const QUICK_SIZES: { stalls: QuickStalls; word: string; small: string }[] = [
  { stalls: 2, word: '2 stalls', small: '1 v 1' },
  { stalls: 4, word: '4 stalls', small: 'up to 4' },
  { stalls: 6, word: '6 stalls', small: 'up to 6' },
];
/** REP-140 B-12: the wait is the room server's own (QUICK_FILL_MS), not a typed number. */
export const QUICK_NOTE = `Up to ${Math.round(QUICK_FILL_MS / 1000)} seconds to find strangers; then Normal computers take the empty stalls.`;
/** The length a quick match is played at, beside its table size ("10 days"). */
export const DEFAULT_LENGTH_NOTE = `${DEFAULT_CONFIG.days} days`;
export const isQuickStalls = (n: unknown): n is QuickStalls => n === 2 || n === 4 || n === 6;

/** The Play page's line under each way: what it is, and its real player count. */
export const quickLine = (): string => `Strangers online · 2, 4 or ${MAX_SEATS} stalls · ${DEFAULT_CONFIG.days} days`;
export const roomLine = (): string => `Friends by link or code · 2 to ${MAX_SEATS} stalls`;
export const computerLine = (): string => `On this phone · Easy, Normal, Hard`;
export const phoneLine = (): string => `Take turns on this phone · 2 to ${MAX_SEATS} people`;

/**
 * PLAN-125: a quick room's size and when its computers fill the empty seats (server time), read from the room view. The
 * view's `quick` is `{ stalls, fillAt }` from a server that knows table sizes, and `true` from one that does not (a
 * quick match of 2 stalls, no fill time). Null for a room that is not a quick match.
 */
export function quickOf(q: unknown): { stalls: QuickStalls; fillAt?: number } | null {
  if (!q) return null;
  if (typeof q !== 'object') return { stalls: QUICK_STALLS };
  const stalls = 'stalls' in q && isQuickStalls(q.stalls) ? q.stalls : QUICK_STALLS;
  const fillAt = 'fillAt' in q && typeof q.fillAt === 'number' && Number.isFinite(q.fillAt) ? q.fillAt : undefined;
  return fillAt === undefined ? { stalls } : { stalls, fillAt };
}

/** The wait's line: "2 of 4 found · computers fill in 0:18"; without a fill time, "2 of 4 found". */
export function foundLine(found: number, stalls: number, msLeft?: number): string {
  const head = `${Math.min(found, stalls)} of ${stalls} found`;
  return msLeft === undefined ? head : `${head} · computers fill in ${clock(msLeft)}`;
}

/**
 * PLAN-119: each mode's one-line reason. The owner's words (REP-134, section 2). The Play menu groups the ways to play
 * a full market of your own under NORMAL_HEADING (PLAN-124: "Custom match", the name on Home). PLAN-120: the three modes moved to Home's cards, where each reason
 * heads its card (the Sprint's in its row), and the Daily intro shows the Daily market's or the Sprint's.
 */
export const NORMAL_HEADING = CUSTOM_MATCH;
export const MODE_REASON = {
  league: 'What will the next market throw at you',
  daily: 'How you rank in today\'s full market',
  sprint: 'A few minutes. Beat your best.',
} as const;

/** PLAN-119: the link from a cleared Market League stage's results to today's Sprint. */
export const LEAGUE_TO_SPRINT = 'Try today\'s Sprint';

/** Does a game with this set-up announce a standing order? The engine's own test (game.ts drawStanding): not in the
 *  Basic game, and on a Market Day before the last day whose order falls due inside the game. */
export function hasStandingOrders(cfg: GameConfig): boolean {
  if (cfg.core || cfg.marketDays === false) return false;
  for (let d = MARKET_DAY_EVERY; d < cfg.days; d += MARKET_DAY_EVERY) if (d + ORDER_LEAD <= cfg.days) return true;
  return false;
}

const premiumIn = (st: Stage): boolean => Object.values(st.setup.crowd ?? {}).some((names) => names.some((n) => prefOf(n) === 'premium'));
const ordersIn = (st: Stage): boolean => Object.keys(st.setup.orders ?? {}).length > 0;

/**
 * PLAN-119: the Daily card's line when today's Daily market uses something you met in the Market League, chosen only
 * from what the Daily already shows on its card: its set-up (the weekly twist decides whether standing orders come)
 * and its first customer. `cleared` is how many League stages you have cleared (progress.ts leagueStage); a stage
 * counts once cleared. Null when nothing matches. Nothing here changes the Daily's set-up or seed.
 */
export function leagueEcho(cfg: GameConfig, firstName: string | null, cleared: number): string | null {
  const done = LEAGUE.slice(0, Math.max(0, cleared));
  if (firstName && prefOf(firstName) === 'premium') {
    const st = done.find(premiumIn);
    if (st) return `Met in the League: ${lookOf(firstName).title} buys Fresh fruit only, as in ${st.title}.`;
  }
  if (hasStandingOrders(cfg)) {
    const st = done.find(ordersIn);
    if (st) return `Met in the League: a standing order to bid on, as in ${st.title}.`;
  }
  return null;
}

/** "Stage 1 of 6 · Village Square · 6 days vs Rosa", or the replay line once every stage is cleared. */
export function leagueLine(stage: number): string {
  if (stage >= LEAGUE.length) return `All ${LEAGUE.length} stages cleared · replay any stage for its stars`;
  const st = LEAGUE[stage];
  const names = st.rivals.map((r) => RIVALS[r.idx % RIVALS.length].name);
  const vs = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
  return `Stage ${stage + 1} of ${LEAGUE.length} · ${st.title} · ${st.days} ${st.days === 1 ? 'day' : 'days'} vs ${vs}`;
}

/** The wait's clock: "0:24", "1:05". */
export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** "Quick Match is 4 stalls, 10 days. You play as Rosa." */
export function waitLine(days: number, avatar: string, stalls: number = QUICK_STALLS): string {
  const who = RIVALS.find((r) => r.avatar === avatar)?.name;
  return `Quick Match is ${stalls} stalls, ${days} days.${who ? ` You play as ${who}.` : ''}`;
}

/**
 * "Play the computer now" from the Quick Match wait: the same stalls and length as the quick match, on this phone,
 * against Normal computers that are not your shopkeeper, with the full game (as a new game always is). `pick` chooses
 * each rival among those left (random in the game, fixed in tests). PLAN-125: `stalls` is the table size the wait was
 * for (2 by default).
 */
export function vsComputerConfig(name: string, avatar: string, seed: number, pick: (n: number) => number = (n) => Math.floor(Math.random() * n), stalls: number = QUICK_STALLS): GameConfig {
  const pool = RIVALS.filter((r) => r.avatar !== avatar);
  const rivals: PlayerConfig[] = [];
  for (let k = 1; k < Math.max(2, Math.min(MAX_SEATS, stalls)) && pool.length; k++) {
    const [r] = pool.splice(Math.max(0, Math.min(pool.length - 1, pick(pool.length))), 1);
    rivals.push({ name: r.name, kind: 'ai', level: 'normal', avatar: r.avatar, quip: r.quip });
  }
  return {
    players: [{ name, kind: 'human', avatar }, ...rivals],
    days: DEFAULT_CONFIG.days, unripe: true, upgrades: true, events: true, marketDays: true, core: false, street: false, pulse: false, seed,
  };
}
