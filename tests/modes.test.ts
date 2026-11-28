// REP-140 A-06: one source for the mode of a game and its names, for the shopkeeper key, and for cleaning a name.
// The words a player sees are the same as before; the telemetry and trophy values never change.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dailyConfig, sprintConfig } from '../src/engine/daily';
import { CHARACTER_AVATARS } from '../src/engine/data';
import { newGame, type GameConfig } from '../src/engine/game';
import { NAME_MAX } from '../src/net/protocol';
import { tidyName, typedName } from '../src/net/nameText';
import { cleanProfile } from '../src/net/profile';
import { tidy } from '../server/names';
import {
  CUSTOM_MATCH, HOME_MODES, WAYS, counterMode, gameLabel, kindName, kindOf, kindSentence, resultsLabel, slotOfKind, slotSentence, trophyMode, wayName,
  type GameKind,
} from '../src/ui/modes';
import { NORMAL_HEADING, vsComputerConfig } from '../src/ui/playMenu';
import { leagueConfig } from '../src/ui/progress';
import { slotOf } from '../src/ui/store';
import { modeOf } from '../src/ui/paused';
import { MODES } from '../src/ui/HomeCards';
import { introWords } from '../src/ui/DailyIntro';

const DATE = '2026-11-26';
const computer = vsComputerConfig('You', CHARACTER_AVATARS[0], 1, () => 0, 4);
const passPlay: GameConfig = { ...computer, players: computer.players.map((p, i) => (i === 1 ? { ...p, kind: 'human' as const } : p)) };
const CONFIGS: Record<GameKind, GameConfig> = {
  computer, passPlay, league: leagueConfig(2, 'You', ''), daily: dailyConfig(DATE, 'You'), sprint: sprintConfig(DATE, 'You'),
};
const KINDS = Object.keys(CONFIGS) as GameKind[];

describe('which mode a game is, from its set-up', () => {
  it('reads each set-up as its own mode', () => {
    for (const k of KINDS) expect(kindOf(CONFIGS[k]), k).toBe(k);
    // a set-up without its people is a game against the computer (a save whose people cannot be read)
    expect(kindOf({})).toBe('computer');
  });

  it('puts each mode in its own save slot, as before (PLAN-120)', () => {
    expect(KINDS.map((k) => slotOf(CONFIGS[k]))).toEqual(['play', 'play', 'league', 'daily', 'sprint']);
    for (const k of KINDS) expect(slotOfKind(k)).toBe(slotOf(CONFIGS[k]));
  });
});

describe('what each mode is called', () => {
  it('names the waiting game as Home always has', () => {
    expect(KINDS.map((k) => gameLabel(CONFIGS[k]))).toEqual(['Computer game', 'Pass & Play game', 'League stage 3', 'Daily market', 'Sprint']);
    expect(KINDS.map((k) => modeOf(newGame(CONFIGS[k])))).toEqual(KINDS.map((k) => gameLabel(CONFIGS[k])));
  });

  it('has a name and a form for inside a sentence', () => {
    expect(KINDS.map(kindName)).toEqual(['Computer game', 'Pass & Play game', 'Market League', 'Daily market', 'Sprint']);
    expect(KINDS.map(kindSentence)).toEqual(['computer game', 'Pass & Play game', 'League game', 'Daily market game', 'Sprint game']);
    expect(slotSentence('play')).toBe('game');
    expect(slotSentence('league')).toBe('League game');
  });

  it('gives Home its tabs, with the same names the rest of the game uses', () => {
    expect(MODES).toBe(HOME_MODES);
    expect(HOME_MODES.map((m) => [m.id, m.slot, m.tab, m.name])).toEqual([
      ['custom', 'play', 'Match', 'Match'], ['league', 'league', 'League', 'Market League'],
      ['daily', 'daily', 'Daily', 'Daily market'], ['sprint', 'sprint', 'Sprint', 'Sprint'],
    ]);
    expect(NORMAL_HEADING).toBe(CUSTOM_MATCH);
    expect(introWords('daily', DATE).title).toBe(kindName('daily'));
    expect(introWords('sprint', DATE).title).toBe(kindName('sprint'));
  });

  it('names the four ways to play a Custom match, and the two games on this phone after them', () => {
    expect(WAYS.map((w) => w.name)).toEqual(['Quick Match', 'Private Room', 'Computer', 'Pass & Play']);
    expect(kindName('computer')).toBe(`${wayName('computer')} game`);
    expect(kindName('passPlay')).toBe(`${wayName('phone')} game`);
  });

  it('gives the results their mode words', () => {
    expect(KINDS.map((k) => resultsLabel(CONFIGS[k], false))).toEqual([null, null, 'Market League, stage 3', 'Daily market', 'Sprint']);
    expect(resultsLabel(CONFIGS.computer, true)).toBe('Online');
  });
});

describe('counters and trophies keep their values', () => {
  it('sends the same game_start mode as before', () => {
    // The values before REP-140 A-06: sprint, daily, then pass_and_play for two or more people, else solo.
    const before = (cfg: GameConfig) => (cfg.sprint ? 'sprint' : cfg.daily ? 'daily' : cfg.players.filter((p) => p.kind === 'human').length > 1 ? 'pass_and_play' : 'solo');
    for (const k of KINDS) expect(counterMode(CONFIGS[k]), k).toBe(before(CONFIGS[k]));
    expect(KINDS.map((k) => counterMode(CONFIGS[k]))).toEqual(['solo', 'pass_and_play', 'solo', 'daily', 'sprint']);
  });

  it('adds the same member to the trophies\' "modes" set as before', () => {
    const before = (cfg: GameConfig, online: boolean) => (online ? 'online' : cfg.daily ? 'daily' : cfg.league !== undefined ? 'league' : 'new');
    for (const k of KINDS) for (const online of [false, true]) expect(trophyMode(CONFIGS[k], online), `${k} ${online}`).toBe(before(CONFIGS[k], online));
  });
});

describe('one cleaning for a name, on the phone and on the server', () => {
  const names = ['Ana', '  Nurul   Aisyah  binti ', 'Ｆｕｌｌ ｗｉｄｔｈ ｎａｍｅ', 'ﬁﬁﬁﬁﬁﬁﬁﬁﬁﬁﬁﬁﬁﬁﬁﬁ', 'a\tb', '<b>x</b>', 'Zoë', 'a b', 'x'.repeat(30)];

  it('the server\'s tidy is the shared function', () => {
    expect(tidy).toBe(tidyName);
    expect(tidy(42)).toBe('');
  });

  it('the account profile keeps a name exactly as the room server would', () => {
    for (const n of names) expect(cleanProfile({ name: n }).name, n).toBe(tidy(n));
  });

  it('a name box holds the name as it will be kept, with its ends until it is saved', () => {
    for (const n of names) {
      const typed = typedName(n);
      expect(typed.length, n).toBeLessThanOrEqual(NAME_MAX);
      expect(tidy(typed), n).toBe(typed.trim());
    }
    expect(typedName('Ana ')).toBe('Ana ');
    expect(typedName('a<b>')).toBe('ab');
  });
});

describe('the shopkeeper key, read and written in one place', () => {
  const mem = new Map<string, string>();
  beforeEach(() => {
    mem.clear();
    vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('remembers the shopkeeper chosen, and shows the first one until then', async () => {
    const looks = await import('../src/ui/looks');
    expect(looks.storedAvatar()).toBe('');
    expect(looks.myAvatar()).toBe(CHARACTER_AVATARS[0]);
    looks.saveAvatar(CHARACTER_AVATARS[3]);
    expect(looks.myAvatar()).toBe(CHARACTER_AVATARS[3]);
    looks.saveAvatar('not a shopkeeper');
    expect(looks.storedAvatar()).toBe('not a shopkeeper');
    expect(looks.myAvatar()).toBe(CHARACTER_AVATARS[0]);
  });

  it('the account carries the same shopkeeper, and brings one back to this phone', async () => {
    const looks = await import('../src/ui/looks');
    const acct = await import('../src/ui/account');
    looks.saveAvatar(CHARACTER_AVATARS[2]);
    expect(acct.localProfile().avatar).toBe(CHARACTER_AVATARS[2]);
    acct.applyProfile({ ...acct.localProfile(), avatar: CHARACTER_AVATARS[5], colour: 'teal' });
    expect(looks.myAvatar()).toBe(CHARACTER_AVATARS[5]);
    expect(acct.localProfile().colour).toBe('teal');
  });

  it('works with storage blocked', async () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => undefined });
    const looks = await import('../src/ui/looks');
    expect(looks.storedAvatar()).toBe('');
    expect(looks.myAvatar()).toBe(CHARACTER_AVATARS[0]);
    expect(() => looks.saveAvatar(CHARACTER_AVATARS[1])).not.toThrow();
  });

  it('a seat kept in a room, and stats kept on this phone, are each read in one place', async () => {
    const client = await import('../src/net/client');
    const store = await import('../src/ui/store');
    expect(client.hasSeat('ABC123')).toBe(false);
    mem.set('fm.room.ABC123', 'token');
    expect(client.hasSeat('ABC123')).toBe(true);
    expect(store.hasStats()).toBe(false);
    store.saveStats({ played: 1, wins: 0, bestCash: 5, totalSold: 2 });
    expect(store.hasStats()).toBe(true);
  });
});
