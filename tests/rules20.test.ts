// Rules 20 (PLAN-108, DEC-120), REP-122 C-01: one perk each in the Daily market and the Market League. There the person
// plays as themself (no shopkeeper card) and is dealt perks to choose from; before rules 20 the 3 came from all 8, so a
// rival's perk was often offered (45 of 51 Daily days checked) and two Nest Eggs could play, one doing nothing. Now
// only perks no rival holds are dealt, and no two stalls can ever hold the same perk.
import { beforeEach, describe, expect, it } from 'vitest';
import { dailyConfig, dailyTwist } from '../src/engine/daily';
import { CHARACTER_TRAIT, RIVALS, TRAIT_OFFER, TRAITS, type TraitId } from '../src/engine/data';
import { beginBuying, canPickTrait, newGame, pickTrait, type GameConfig, type GameState } from '../src/engine/game';
import { Rng } from '../src/engine/rng';
import { LEAGUE, leagueConfig } from '../src/ui/progress';
import { AI_VERSION, RULES_VERSION } from '../src/net/protocol';
import { consumeSaveNotice, loadGame, SAVE_VERSION } from '../src/ui/store';

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  consumeSaveNotice();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k),
  };
});

const ALL = Object.keys(TRAITS) as TraitId[];
const rivalsPerks = (s: GameState, me: number) => s.players.flatMap((pl, i) => (i !== me && pl.trait ? [pl.trait] : []));
/** Every perk at the table once the person has taken `t` (or, with none given, the first offered, as the first morning does). */
const held = (s: GameState, me: number, t?: TraitId) => (t ? pickTrait(s, me, t) : beginBuying(s)).players.map((pl) => pl.trait);
const distinct = (xs: (TraitId | null | undefined)[]) => new Set(xs.filter(Boolean)).size === xs.filter(Boolean).length;

const dates = (from: string, n: number) => Array.from({ length: n }, (_, i) => new Date(Date.parse(`${from}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10));

describe('C-01: the Daily market deals only perks no rival holds', () => {
  it('over four months of Daily markets, no rival\'s perk is offered and every stall\'s perk is its own', () => {
    let offered = 0;
    for (const date of dates('2026-11-01', 120)) {
      const s = newGame(dailyConfig(date, 'You'));
      const me = s.players[0];
      if (dailyTwist(date).patch.core) { expect(me.traitOffer).toEqual([]); continue; }
      const rivals = rivalsPerks(s, 0);
      expect(rivals.sort()).toEqual(['basket', 'charmer', 'haggler']);
      expect(me.traitOffer!.length).toBe(TRAIT_OFFER);
      for (const t of me.traitOffer!) {
        expect(rivals, `${date}: ${t}`).not.toContain(t);
        expect(distinct(held(s, 0, t))).toBe(true);
        offered++;
      }
      expect(distinct(held(s, 0))).toBe(true);
    }
    expect(offered).toBeGreaterThan(250);
  });
});

describe('C-01: the Market League deals only perks no rival holds', () => {
  it('at every stage, over many seeds', () => {
    for (let stage = 0; stage < LEAGUE.length; stage++) {
      for (let seed = 1; seed <= 150; seed++) {
        const s = newGame(leagueConfig(stage, 'You', '🧑‍🍳', seed));
        const rivals = rivalsPerks(s, 0);
        expect(rivals.length).toBe(LEAGUE[stage].rivals.length);
        // at least five perks are free at every stage, so the person always has three to choose from
        expect(s.players[0].traitOffer!.length).toBe(TRAIT_OFFER);
        for (const t of s.players[0].traitOffer!) {
          expect(rivals).not.toContain(t);
          expect(distinct(held(s, 0, t))).toBe(true);
        }
      }
    }
  });

  it('the Pasar Malam stage with Saleh never offers a second Nest Egg, so his perk always works', () => {
    const stage = LEAGUE.findIndex((x) => x.title === 'Pasar Malam');
    expect(LEAGUE[stage].rivals.map((r) => RIVALS[r.idx].name)).toEqual(['Saleh']);
    for (let seed = 1; seed <= 400; seed++) {
      const s = newGame(leagueConfig(stage, 'You', '🧑‍🍳', seed));
      expect(s.players[1].trait).toBe('nestegg');
      expect(s.players[0].traitOffer).not.toContain('nestegg');
      expect(canPickTrait(s, 0, 'nestegg')).not.toBeNull();
    }
  });
});

describe('C-01: no two stalls ever hold the same perk', () => {
  it('in any mix of shopkeepers, people with none and computers with none, at 2 to 6 stalls', () => {
    const avatars = [...RIVALS.map((r) => r.avatar), '🧑‍🍳', '', 'x'];
    for (let seed = 1; seed <= 600; seed++) {
      const r = new Rng(seed * 7919);
      const n = 2 + r.int(5);
      const players = Array.from({ length: n }, (_, i) => {
        // a hand-made set-up may even give two stalls the same shopkeeper
        const avatar = avatars[r.int(avatars.length)];
        return r.int(2) ? { name: `P${i}`, kind: 'human' as const, avatar } : { name: `P${i}`, kind: 'ai' as const, level: 'normal' as const, avatar };
      });
      const s = newGame({ players, days: 8, unripe: true, upgrades: true, events: true, seed });
      // every stall has a perk or perks to choose from, and nothing on offer is held or offered to another stall
      const offers = s.players.flatMap((pl) => pl.traitOffer ?? []);
      expect(new Set(offers).size, `seed ${seed}`).toBe(offers.length);
      s.players.forEach((pl, i) => {
        expect(pl.trait || pl.traitOffer?.length, `seed ${seed}`).toBeTruthy();
        for (const t of pl.traitOffer ?? []) expect(s.players.some((o, j) => j !== i && o.trait === t), `seed ${seed}`).toBe(false);
      });
      expect(distinct(held(s, 0)), `seed ${seed}`).toBe(true);
      expect(beginBuying(s).players.every((pl) => pl.trait)).toBe(true);
    }
  });

  it('when fewer than 3 perks are free, a stall is dealt what is free and every stall still gets one', () => {
    // Six stalls: two people with no shopkeeper and four shopkeepers, so four perks are free. The first person is dealt
    // three of them, and the second the one left.
    const cfg: GameConfig = {
      players: [
        { name: 'A', kind: 'human', avatar: '🧑‍🍳' }, { name: 'B', kind: 'human', avatar: '👩‍🍳' },
        ...RIVALS.slice(0, 4).map((x) => ({ name: x.name, kind: 'ai' as const, level: 'normal' as const, avatar: x.avatar })),
      ],
      days: 8, unripe: true, upgrades: true, events: true, seed: 3,
    };
    const s = newGame(cfg);
    const free = ALL.filter((t) => !RIVALS.slice(0, 4).some((x) => CHARACTER_TRAIT[x.avatar] === t));
    expect(free.length).toBe(4);
    expect(s.players[0].traitOffer!.length).toBe(3);
    expect(s.players[1].traitOffer!.length).toBe(1);
    expect([...s.players[0].traitOffer!, ...s.players[1].traitOffer!].sort()).toEqual([...free].sort());
    expect(distinct(beginBuying(s).players.map((pl) => pl.trait))).toBe(true);
  });

  it('a perk another stall holds cannot be picked, even if it were on offer', () => {
    const s = structuredClone(newGame(dailyConfig('2026-11-16', 'You')));
    s.players[0].traitOffer = ['haggler', ...s.players[0].traitOffer!];
    expect(canPickTrait(s, 0, 'haggler')).toBe('Another stall has that perk');
    expect(() => pickTrait(s, 0, 'haggler')).toThrow('Another stall has that perk');
    expect(canPickTrait(s, 0, s.players[0].traitOffer![1])).toBeNull();
  });

  it('a table of shopkeepers draws on the seed as before: its game is the same', () => {
    // Only stalls with no shopkeeper are dealt, and each deal still shuffles all eight perks, so a game of
    // shopkeepers (every solo, pass-and-play and online game) starts exactly as under rules 19.
    const a = newGame({ players: RIVALS.slice(0, 4).map((x) => ({ name: x.name, kind: 'ai' as const, level: 'normal' as const, avatar: x.avatar })), days: 10, unripe: true, upgrades: true, events: true, seed: 42 });
    expect(a.players.map((pl) => pl.traitOffer)).toEqual([[], [], [], []]);
    expect(a.players.map((pl) => pl.trait)).toEqual(RIVALS.slice(0, 4).map((x) => CHARACTER_TRAIT[x.avatar]));
  });
});

describe('rules 20 and saved games', () => {
  it('a game saved under rules 19 (1.24.0), on its last day with Closing Day ahead, is set aside with the notice', () => {
    const g = structuredClone(newGame({ players: [{ name: 'A', kind: 'human', avatar: '🦊' }, { name: 'B', kind: 'ai', level: 'normal', avatar: '🐸' }], days: 8, unripe: true, upgrades: true, events: true, seed: 5 }));
    g.day = 8;
    expect(RULES_VERSION).toBe(20);
    expect(AI_VERSION).toBe(8);
    mem.set('fm.save', JSON.stringify({ v: SAVE_VERSION, rules: 19, ai: 6, game: g }));
    expect(loadGame()).toBeNull();
    expect(consumeSaveNotice()).toBe('Your unfinished game used older rules and could not be continued.');
    expect(mem.has('fm.save')).toBe(false);
    // a rules 19 Daily market is set aside the same way
    mem.set('fm.save', JSON.stringify({ v: SAVE_VERSION, rules: 19, ai: 6, game: newGame(dailyConfig('2026-11-15', 'A')) }));
    expect(loadGame()).toBeNull();
    expect(consumeSaveNotice()).toBe('Your unfinished game used older rules and could not be continued.');
  });
});
