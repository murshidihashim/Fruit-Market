// The daily challenge: everyone plays the same decks against the same rivals each day.
// Shared by the app and the server (which replays submitted games to check scores).
import { RIVALS } from './data';
import type { GameConfig } from './game';
import { seedFromString } from './rng';

export const DAILY_AVATAR = '🧑‍🍳';

export function dailyConfig(date: string, name: string, avatar = DAILY_AVATAR): GameConfig {
  return {
    players: [
      { name, kind: 'human', avatar },
      { ...RIVALS[0], kind: 'ai', level: 'normal' },
      { ...RIVALS[1], kind: 'ai', level: 'hard' },
      { ...RIVALS[2], kind: 'ai', level: 'normal' },
    ],
    days: 10, unripe: true, upgrades: true, events: true,
    seed: seedFromString(`fruit-market-daily-${date}`), daily: date,
  };
}
