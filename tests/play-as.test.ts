// The results' second button and the picture shown for a seat (PLAN-086).
import { beforeEach, describe, expect, it } from 'vitest';
import { dailyConfig } from '../src/engine/daily';
import { CHARACTER_TRAIT, RIVALS } from '../src/engine/data';
import { newGame, type GameConfig } from '../src/engine/game';
import { chosenColour, shownAvatar } from '../src/ui/looks';
import { asShopkeeper } from '../src/ui/playAs';
import { COLOURS, leagueConfig } from '../src/ui/progress';

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k),
  };
});

const table = (): GameConfig => ({
  players: [
    { name: 'Mia', kind: 'human', avatar: RIVALS[0].avatar },
    { name: RIVALS[6].name, kind: 'ai', level: 'normal', avatar: RIVALS[6].avatar, quip: RIVALS[6].quip },
    { name: RIVALS[2].name, kind: 'ai', level: 'hard', avatar: RIVALS[2].avatar, quip: RIVALS[2].quip },
  ],
  days: 10, unripe: true, upgrades: true, events: true, seed: 7,
});

describe('"Play as": the same table with the person as another shopkeeper', () => {
  it('a shopkeeper nobody at the table is: only the person changes', () => {
    const next = asShopkeeper(table(), RIVALS[4].avatar);
    expect(next.players[0]).toMatchObject({ name: 'Mia', kind: 'human', avatar: RIVALS[4].avatar });
    expect(next.players.slice(1)).toEqual(table().players.slice(1));
    expect([next.days, next.seed, next.players.length]).toEqual([10, 7, 3]);
  });

  it('a shopkeeper a computer stall is: the two swap, so every stall still has its own, and the level stays', () => {
    const next = asShopkeeper(table(), RIVALS[6].avatar);
    expect(next.players[0]).toMatchObject({ name: 'Mia', avatar: RIVALS[6].avatar });
    expect(next.players[1]).toMatchObject({ name: RIVALS[0].name, avatar: RIVALS[0].avatar, kind: 'ai', level: 'normal', quip: RIVALS[0].quip });
    expect(new Set(next.players.map((p) => p.avatar)).size).toBe(3);
    // the game it starts gives the person that shopkeeper's perk
    expect(newGame(next).players[0].trait).toBe(CHARACTER_TRAIT[RIVALS[6].avatar]);
  });

  it('changes nothing for the shopkeeper already played, one a friend at the table plays, or a name that is no shopkeeper', () => {
    const cfg = table();
    expect(asShopkeeper(cfg, RIVALS[0].avatar)).toBe(cfg);
    expect(asShopkeeper(cfg, 'nobody')).toBe(cfg);
    const friends: GameConfig = { ...cfg, players: [cfg.players[0], { name: 'Sam', kind: 'human', avatar: RIVALS[6].avatar }] };
    expect(asShopkeeper(friends, RIVALS[6].avatar)).toBe(friends);
  });
});

describe('the picture shown for a seat', () => {
  it('a shopkeeper is shown as they are; a computer is never changed', () => {
    const cfg = table();
    expect(cfg.players.map((_, i) => shownAvatar(cfg.players, i))).toEqual(cfg.players.map((p) => p.avatar));
  });

  it('in the Daily market and the Market League the person is shown as their own shopkeeper, for show only', () => {
    mem.set('fm.avatar', RIVALS[5].avatar);
    const daily = dailyConfig('2026-11-12', 'Mia');
    expect(shownAvatar(daily.players, 0)).toBe(RIVALS[5].avatar);
    // the game's own setting is untouched: the person still picks a perk from three
    expect(daily.players[0].avatar).not.toBe(RIVALS[5].avatar);
    expect(newGame(daily).players[0].traitOffer?.length).toBe(3);
    const league = leagueConfig(0, 'Mia', 'x', 1);
    expect(shownAvatar(league.players, 0)).toBe(RIVALS[5].avatar);
  });

  it('a rival at the table is that shopkeeper: the first free one is shown, never two alike', () => {
    mem.set('fm.avatar', RIVALS[0].avatar); // Rosa is the first rival of every Daily market
    const daily = dailyConfig('2026-11-12', 'Mia');
    const shown = shownAvatar(daily.players, 0);
    expect(daily.players.slice(1).map((p) => p.avatar)).not.toContain(shown);
    expect(RIVALS.map((r) => r.avatar)).toContain(shown);
  });

  it('the colour a player chose, or none', () => {
    expect(chosenColour({ colour: 'col_teal' })).toBe(COLOURS.find((c) => c.id === 'teal')!.hex);
    expect(chosenColour({ colour: 'gold_crown' })).toBeNull();
    expect(chosenColour(undefined)).toBeNull();
  });
});
