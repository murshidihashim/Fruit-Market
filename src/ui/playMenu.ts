// PLAN-113: the words and set-ups behind the Play menu and the Quick match wait. Pure, so they can be unit tested.
// Nothing here changes a rule: the player counts and lengths are the game's own (MAX_SEATS, DEFAULT_CONFIG, LEAGUE).
import { MARKET_DAY_EVERY, ORDER_LEAD, RIVALS, lookOf, prefOf } from '../engine/data';
import type { GameConfig } from '../engine/game';
import { DEFAULT_CONFIG, MAX_SEATS, type RoomConfig } from '../net/protocol';
import { LEAGUE } from './progress';
import type { Stage } from './campaign';

/** The game lengths a new game offers (the Play menu's, the set-up screen's and the room's), shortest first everywhere
 *  (PLAN-116, REP-133 B-14: the Play menu put Standard first, the other two Quick). */
export const LENGTHS: { days: RoomConfig['days']; word: string }[] = [{ days: 8, word: 'Quick' }, { days: 10, word: 'Standard' }, { days: 14, word: 'Long' }];
export const lengthWord = (days: number): string => LENGTHS.find((l) => l.days === days)?.word ?? `${days} days`;

/** A quick match: always two stalls, at the room's standard length. */
export const QUICK_STALLS = 2;
export const quickLine = (): string => `A stranger online · ${QUICK_STALLS} stalls · ${DEFAULT_CONFIG.days} days`;
export const roomLine = (): string => `Invite 1 to ${MAX_SEATS - 1} friends by link or code · 2 to ${MAX_SEATS} stalls`;
export const computerLine = (): string => `2 to ${MAX_SEATS} stalls · Easy, Normal, Hard`;
export const phoneLine = (): string => `Pass and play · 2 to ${MAX_SEATS} people`;

/**
 * PLAN-119: each mode's one-line reason. The owner's words (REP-134, section 2). The Play menu groups the ways to play
 * a full market of your own under NORMAL_HEADING (PLAN-124: "Custom match", the name on Home). PLAN-120: the three modes moved to Home's cards, where each reason
 * heads its card (the Sprint's in its row), and the Daily intro shows the Daily market's or the Sprint's.
 */
export const NORMAL_HEADING = 'Custom match';
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

/** "Quick match is 2 stalls, 10 days. You play as Rosa." */
export function waitLine(days: number, avatar: string): string {
  const who = RIVALS.find((r) => r.avatar === avatar)?.name;
  return `Quick match is ${QUICK_STALLS} stalls, ${days} days.${who ? ` You play as ${who}.` : ''}`;
}

/**
 * "Play the computer now" from the Quick match wait: the same two stalls and length as the quick match, on this phone,
 * against one Normal computer that is not your shopkeeper, with the full game (as a new game always is). `pick`
 * chooses the rival among those left (random in the game, fixed in tests).
 */
export function vsComputerConfig(name: string, avatar: string, seed: number, pick: (n: number) => number = (n) => Math.floor(Math.random() * n)): GameConfig {
  const pool = RIVALS.filter((r) => r.avatar !== avatar);
  const r = pool[Math.max(0, Math.min(pool.length - 1, pick(pool.length)))];
  return {
    players: [{ name, kind: 'human', avatar }, { name: r.name, kind: 'ai', level: 'normal', avatar: r.avatar, quip: r.quip }],
    days: DEFAULT_CONFIG.days, unripe: true, upgrades: true, events: true, marketDays: true, core: false, street: false, pulse: false, seed,
  };
}
