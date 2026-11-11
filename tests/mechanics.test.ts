// The replayability update: poorest-first order, merchant traits, the evening upgrade draft.
import { describe, expect, it } from 'vitest';
import { aiStep } from '../src/engine/ai';
import { FRUIT, JUICE_VALUE, TRAITS, UPGRADES, freshPos, type TraitId, type UpgradeId } from '../src/engine/data';
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

  it('Nest Egg starts with $15 (rules 18; everyone else $10) and Bargain Hunter gets $1 off the first fruit each day', () => {
    let s = newGame(humans(2));
    s.players[0].traitOffer = ['nestegg', 'bargain', 'haggler'];
    s.players[1].traitOffer = ['bargain', 'nestegg', 'haggler'];
    s = pickTrait(pickTrait(s, 0, 'nestegg'), 1, 'bargain');
    expect(s.players[0].cash).toBe(15);
    expect(s.players[1].cash).toBe(10);
    expect(buyCost(s, 1, 'apple', freshPos('apple'))).toBe(FRUIT.apple.cost.fresh - 1);
    expect(buyCost(s, 0, 'apple', freshPos('apple'))).toBe(FRUIT.apple.cost.fresh);
    s.players[1].boughtToday = 1;
    expect(buyCost(s, 1, 'apple', freshPos('apple'))).toBe(FRUIT.apple.cost.fresh);
  });
});

describe('turn order', () => {
  it('the poorest shop buys first from day 2, then the rest go clockwise (unless someone played Priority)', () => {
    let checked = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const s = runTo(newGame(ais(3, seed)), 2, 'buy');
      if (s.log.some((l) => l.includes('Priority'))) continue;
      const start = s.dayStartCash!;
      expect(start[s.order[0]]).toBe(Math.min(...start));
      // Rules 10: after the poorest, the others follow clockwise from it, whatever their cash.
      expect(s.order).toEqual([0, 1, 2].map((i) => (s.order[0] + i) % 3));
      checked++;
    }
    expect(checked).toBeGreaterThan(5);
  });
});

describe('specialities draft', () => {
  it('offers every unbuilt upgrade on the evening after a Market Day, and only then (rules 17: all five on offer)', () => {
    const s = runTo(newGame(ais(2, 7)), 3, 'evening');
    for (const pl of s.players) {
      expect(pl.upgradeOffer).toEqual((Object.keys(UPGRADES) as UpgradeId[]).filter((u) => !pl.upgrades.includes(u)));
    }
    const p = s.order[s.turn];
    const rich = structuredClone(s);
    rich.players[p].cash = 99;
    expect(canUpgrade(rich, p, rich.players[p].upgradeOffer![0])).toBeNull();
    const day2 = structuredClone(rich);
    day2.day = 2;
    expect(canUpgrade(day2, p, rich.players[p].upgradeOffer![0])).toBe('Upgrades are offered after Market Days');
  });

  it('the Juice Bar turns spoiling fruit into $2 each, up to 2 a night (rules 11)', () => {
    let s = runTo(newGame(ais(2, 9)), 3, 'evening');
    const p = s.order[s.turn];
    s = structuredClone(s);
    s.players[p].upgrades = ['juicebar'];
    s.players[p].trait = null; // no Shade Cloth keeping the blueberries back
    s.players[p].stock.blueberry[0] = 5; // all of these spoil tonight
    const cash = s.players[p].cash;
    const spoiled = s.players[p].stats.spoiled;
    // Everyone closes up without building anything.
    while (s.phase === 'evening') s = applyAction(s, s.order[s.turn], { kind: 'endEvening' });
    expect(s.day).toBe(4);
    expect(s.players[p].cash).toBe(cash + 4);
    expect(s.players[p].stats.spoiled - spoiled).toBe(3);
    expect(s.players[p].stats.juiced).toBe(2);
  });

  // REP-089 option C (DEC-067): the owner kept this as a skill trick and the card explains it. If the rule changes
  // (juice pays $1, or only fruit you had before today), this test and the card's tip must change with it.
  it('Juice Bar salvage: 2 tired blueberries bought for $1 and never put out make +$2 overnight, as the card says', () => {
    let s = beginBuying(newGame(humans(2)));
    s = structuredClone(s);
    s.day = 4; // an ordinary night follows
    const p = s.order[0];
    const pl = s.players[p];
    pl.upgrades = ['juicebar'];
    for (const f of Object.keys(pl.stock) as (keyof typeof pl.stock)[]) pl.stock[f] = pl.stock[f].map(() => 0);
    pl.cash = 20;
    s.market.blueberry[0] = 2; // tired: their last day
    expect(buyCost(s, p, 'blueberry', 0)).toBe(1);
    expect(UPGRADES.juicebar.text).toContain(`Tip: before the last day, $1 soft fruit makes $${JUICE_VALUE} of juice.`);
    for (let k = 0; k < 2; k++) s = applyAction(s, p, { kind: 'buy', fruit: 'blueberry', pos: 0 });
    while (s.phase === 'buy') s = applyAction(s, s.order[s.turn], { kind: 'endBuy' });
    while (s.phase === 'stall') s = applyAction(s, s.stalls.findIndex((x) => x === null), { kind: 'stall', stall: {} });
    while (s.phase === 'bid') s = applyAction(s, s.bids.findIndex((x) => x === null), { kind: 'prices', posts: [] });
    expect(s.results!.income[p]).toBe(0);
    s = finishReveal(s);
    while (s.phase === 'evening') s = applyAction(s, s.order[s.turn], { kind: 'endEvening' });
    expect(s.day).toBe(5);
    expect(s.players[p].cash).toBe(20 - 2 + 2 * JUICE_VALUE); // +$2, whatever the customers did
    expect(s.players[p].stats.juiced).toBe(2);
    expect(s.players[p].stats.spoiled).toBe(0);
  });

  it('…but not on the last day, which no night follows: the card\'s tip says "before the last day"', () => {
    let s = beginBuying(newGame(humans(2)));
    s = structuredClone(s);
    s.day = s.config.days;
    const p = s.order[0];
    const pl = s.players[p];
    pl.upgrades = ['juicebar'];
    for (const f of Object.keys(pl.stock) as (keyof typeof pl.stock)[]) pl.stock[f] = pl.stock[f].map(() => 0);
    pl.cash = 20;
    s.market.blueberry[0] = 3;
    for (let k = 0; k < 3; k++) s = applyAction(s, p, { kind: 'buy', fruit: 'blueberry', pos: 0 });
    while (s.phase === 'buy') s = applyAction(s, s.order[s.turn], { kind: 'endBuy' });
    while (s.phase === 'stall') s = applyAction(s, s.stalls.findIndex((x) => x === null), { kind: 'stall', stall: {} });
    while (s.phase === 'bid') s = applyAction(s, s.bids.findIndex((x) => x === null), { kind: 'prices', posts: [] });
    s = finishReveal(s);
    expect(s.phase).toBe('over');
    expect(s.players[p].stats.juiced ?? 0).toBe(0);
    // Only the jam maker's money, when Closing Day is on: less than the juice would have paid.
    const jam = s.jam?.[p] ?? 0;
    expect(s.players[p].cash).toBe(20 - 3 + jam);
    expect(jam).toBeLessThan(3 * JUICE_VALUE);
  });
});
