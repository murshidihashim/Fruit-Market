// The replayability update: poorest-first order, merchant traits, the evening upgrade draft.
import { describe, expect, it } from 'vitest';
import { aiStep } from '../src/engine/ai';
import { FRUIT, TRAITS, UPGRADES, freshPos, type TraitId, type UpgradeId } from '../src/engine/data';
import {
  applyAction, beginBuying, buyCost, canUpgrade, finishReveal, newGame, pickTrait,
  type GameConfig, type GameState,
} from '../src/engine/game';

const humans = (n: number, seed = 3): GameConfig => ({
  players: Array.from({ length: n }, (_, i) => ({ name: `H${i}`, kind: 'human' as const, avatar: 'a' })),
  days: 10, unripe: true, upgrades: true, events: false, seed,
});
const ais = (n: number, seed = 3): GameConfig => ({
  ...humans(n, seed), players: Array.from({ length: n }, (_, i) => ({ name: `A${i}`, kind: 'ai' as const, level: 'normal' as const, avatar: 'a' })),
});

/** Play computer turns until the game reaches `phase` on `day`. */
function runTo(s: GameState, day: number, phase: GameState['phase']): GameState {
  for (let i = 0; i < 5000 && !(s.day === day && s.phase === phase); i++) {
    if (s.phase === 'morning') s = beginBuying(s);
    else if (s.phase === 'reveal') s = finishReveal(s);
    else s = aiStep(s)!;
  }
  return s;
}

describe('merchant traits', () => {
  it('offers three different traits and lets each person pick one, once', () => {
    let s = newGame(humans(2));
    const offer = s.players[0].traitOffer!;
    expect(new Set(offer).size).toBe(3);
    expect(s.players[0].trait).toBeNull();
    const notOffered = (Object.keys(TRAITS) as TraitId[]).find((t) => !offer.includes(t))!;
    expect(() => pickTrait(s, 0, notOffered)).toThrow();
    s = applyAction(s, 0, { kind: 'trait', trait: offer[1] });
    expect(s.players[0].trait).toBe(offer[1]);
    expect(() => pickTrait(s, 0, offer[0])).toThrow();
  });

  it('computer shops pick straight away and nobody starts the day without a trait', () => {
    expect(newGame(ais(3)).players.every((p) => p.trait)).toBe(true);
    const s = beginBuying(newGame(humans(2)));
    expect(s.players.every((p) => p.trait)).toBe(true);
  });

  it('Nest Egg starts with $15 and Bargain Hunter gets $1 off the first fruit each day', () => {
    let s = newGame(humans(2));
    s.players[0].traitOffer = ['nestegg', 'bargain', 'haggler'];
    s.players[1].traitOffer = ['bargain', 'nestegg', 'haggler'];
    s = pickTrait(pickTrait(s, 0, 'nestegg'), 1, 'bargain');
    expect(s.players[0].cash).toBe(15);
    expect(buyCost(s, 1, 'apple', freshPos('apple'))).toBe(FRUIT.apple.cost.fresh - 1);
    expect(buyCost(s, 0, 'apple', freshPos('apple'))).toBe(FRUIT.apple.cost.fresh);
    s.players[1].boughtToday = 1;
    expect(buyCost(s, 1, 'apple', freshPos('apple'))).toBe(FRUIT.apple.cost.fresh);
  });
});

describe('turn order', () => {
  it('the poorest shop buys first from day 2 (unless someone played Priority)', () => {
    let checked = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const s = runTo(newGame(ais(3, seed)), 2, 'buy');
      if (s.log.some((l) => l.includes('Priority'))) continue;
      const start = s.dayStartCash!;
      expect(start[s.order[0]]).toBe(Math.min(...start));
      expect(start[s.order[2]]).toBe(Math.max(...start));
      checked++;
    }
    expect(checked).toBeGreaterThan(5);
  });
});

describe('upgrade draft', () => {
  it('offers 3 unbuilt upgrades each evening and only those can be built', () => {
    const s = runTo(newGame(ais(2, 7)), 1, 'evening');
    for (const pl of s.players) {
      expect(pl.upgradeOffer!.length).toBe(3);
      for (const u of pl.upgradeOffer!) expect(pl.upgrades).not.toContain(u);
    }
    const p = s.order[s.turn];
    const off = (Object.keys(UPGRADES) as UpgradeId[]).find((u) => !s.players[p].upgradeOffer!.includes(u) && !s.players[p].upgrades.includes(u))!;
    const rich = structuredClone(s);
    rich.players[p].cash = 99;
    expect(canUpgrade(rich, p, off)).toBe('Not on offer tonight');
    expect(canUpgrade(rich, p, rich.players[p].upgradeOffer![0])).toBeNull();
  });

  it('the Juice Press turns spoiling fruit into $2 each, up to 3 a night', () => {
    let s = runTo(newGame(ais(2, 9)), 1, 'evening');
    const p = s.order[s.turn];
    s = structuredClone(s);
    s.players[p].upgrades.push('juicer');
    s.players[p].stock.blueberry[0] = 5; // all of these spoil tonight
    const cash = s.players[p].cash;
    const spoiled = s.players[p].stats.spoiled;
    // Everyone closes up without building anything.
    while (s.phase === 'evening') s = applyAction(s, s.order[s.turn], { kind: 'endEvening' });
    expect(s.day).toBe(2);
    expect(s.players[p].cash).toBe(cash + 6);
    expect(s.players[p].stats.spoiled - spoiled).toBe(2);
  });
});
