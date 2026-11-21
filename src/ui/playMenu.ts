// PLAN-113: the words and set-ups behind the Play menu and the Quick match wait. Pure, so they can be unit tested.
// Nothing here changes a rule: the player counts and lengths are the game's own (MAX_SEATS, DEFAULT_CONFIG, LEAGUE).
import { RIVALS } from '../engine/data';
import type { GameConfig } from '../engine/game';
import { DEFAULT_CONFIG, MAX_SEATS } from '../net/protocol';
import { LEAGUE } from './progress';

/** The game lengths a new game offers (the set-up screen's and the room's). */
export const LENGTHS: { days: number; word: string }[] = [{ days: 10, word: 'Standard' }, { days: 8, word: 'Quick' }, { days: 14, word: 'Long' }];
export const lengthWord = (days: number): string => LENGTHS.find((l) => l.days === days)?.word ?? `${days} days`;

/** A quick match: always two stalls, at the room's standard length. */
export const QUICK_STALLS = 2;
export const quickLine = (): string => `A stranger online · ${QUICK_STALLS} stalls · ${DEFAULT_CONFIG.days} days`;
export const roomLine = (): string => `Invite 1 to ${MAX_SEATS - 1} friends by link or code · 2 to ${MAX_SEATS} stalls`;
export const computerLine = (): string => `2 to ${MAX_SEATS} stalls · Easy, Normal, Hard`;
export const phoneLine = (): string => `Pass and play · 2 to ${MAX_SEATS} people`;

/** "Stage 1 of 6 · Village Square · 8 days vs Rosa", or the replay line once every stage is cleared. */
export function leagueLine(stage: number): string {
  if (stage >= LEAGUE.length) return `All ${LEAGUE.length} stages cleared · replay the ${LEAGUE[LEAGUE.length - 1].title}`;
  const st = LEAGUE[stage];
  const names = st.rivals.map((r) => RIVALS[r.idx % RIVALS.length].name);
  const vs = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
  return `Stage ${stage + 1} of ${LEAGUE.length} · ${st.title} · ${st.days} days vs ${vs}`;
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
