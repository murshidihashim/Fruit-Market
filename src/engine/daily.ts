// The daily challenge: everyone plays the same decks against the same rivals each day.
// Shared by the app and the server (which replays submitted games to check scores).
import { GENEROUS_BONUS, RIVALS } from './data';
import type { GameConfig } from './game';
import { seedFromString } from './rng';

export const DAILY_AVATAR = '🧑‍🍳';

/** A small change to the rules that rotates through the week, the same for everyone (and for the server's replay). */
export interface Twist { title: string; text: string; patch: Partial<GameConfig> }
const TWISTS: Twist[] = [
  { title: 'The usual', text: 'The standard 10-day market.', patch: {} },
  { title: 'Quick game', text: 'Only 8 days.', patch: { days: 8 } },
  { title: 'No upgrades', text: 'No upgrades in this game.', patch: { upgrades: false } },
  // REP-122 C-16: each twist says the whole change. Fixed prices keeps the generous customers' bonus (effectiveMax), and
  // the Basic game has no standing orders either (drawStanding).
  { title: 'Fixed prices', text: `Every customer pays one fixed price for each fruit. Generous customers pay $${GENEROUS_BONUS} more.`, patch: { street: true } },
  { title: 'No events', text: 'No event cards today.', patch: { events: false } },
  { title: 'Long game', text: '14 days.', patch: { days: 14 } },
  { title: 'Basic game', text: 'No perks, favour cards, upgrades or standing orders.', patch: { core: true, upgrades: false } },
];
export function dailyTwist(date: string): Twist {
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  return TWISTS[((day % TWISTS.length) + TWISTS.length) % TWISTS.length];
}

export function dailyConfig(date: string, name: string, avatar = DAILY_AVATAR): GameConfig {
  return {
    players: [
      { name, kind: 'human', avatar },
      { ...RIVALS[0], kind: 'ai', level: 'normal' },
      { ...RIVALS[1], kind: 'ai', level: 'hard' },
      { ...RIVALS[2], kind: 'ai', level: 'normal' },
    ],
    days: 10, unripe: true, upgrades: true, events: true,
    seed: seedFromString(`fruit-market-daily-r13-${date}`), daily: date,
    ...dailyTwist(date).patch,
  };
}

// ---------- the Market Sprint (PLAN-114) ----------

/** The Sprint's length in days. */
export const SPRINT_DAYS = 3;

/**
 * The day's Market Sprint: a second Daily format beside the Daily market. Three days, four stalls, its own shared seed
 * (never the Daily market's), and the Daily's three computer rivals at their Daily levels. Everyone starts alike: no
 * upgrades, no weekly twist, and so no standing orders (they come on Market Days, which need upgrades on and a day 3
 * that is not the last). The person picks a perk from the same seeded offer as everyone else, as in the Daily market.
 */
export function sprintConfig(date: string, name: string, avatar = DAILY_AVATAR): GameConfig {
  const daily = dailyConfig(date, name, avatar);
  return {
    players: daily.players,
    days: SPRINT_DAYS, unripe: true, upgrades: false, events: true,
    seed: seedFromString(`fruit-market-sprint-r1-${date}`), daily: date, sprint: true,
  };
}

/** The ISO week a date belongs to, as "2026-W47" (weeks start on Monday; week 1 holds the year's first Thursday). */
export function isoWeek(date: string): string {
  const t = Date.parse(`${date}T00:00:00Z`);
  const dow = (new Date(t).getUTCDay() + 6) % 7; // Monday 0 … Sunday 6
  const thursday = new Date(t + (3 - dow) * 86_400_000);
  const year = thursday.getUTCFullYear();
  const week = 1 + Math.floor((thursday.getTime() - Date.UTC(year, 0, 1)) / (7 * 86_400_000));
  return `${year}-W${String(week).padStart(2, '0')}`;
}
