import { describe, expect, it } from 'vitest';
import { FRUIT, UPGRADES, type UpgradeId } from '../src/engine/data';
import { buyCost, buyUpgrade, canUpgrade, marketCost, newGame, type GameState } from '../src/engine/game';

const base = (): GameState => newGame({ players: [{ name: 'A', kind: 'human', avatar: '' }, { name: 'B', kind: 'ai', level: 'easy', avatar: '' }], days: 10, unripe: true, upgrades: true, events: false, seed: 5 });

describe('rules version 7', () => {
  it('lets a stall build one upgrade after each Market Day, not several', () => {
    const s = base();
    s.day = 3; s.phase = 'evening'; s.order = [0, 1]; s.turn = 0;
    s.players[0].cash = 100;
    s.players[0].upgradeOffer = Object.keys(UPGRADES) as UpgradeId[];
    expect(canUpgrade(s, 0, 'barrow')).toBeNull();
    const after = buyUpgrade(s, 0, 'barrow');
    expect(after.players[0].upgrades).toEqual(['barrow']);
    expect(canUpgrade(after, 0, 'premium')).not.toBeNull();
  });

  it('charges a Big Basket $1 more for the extra piece only', () => {
    const s = base();
    s.phase = 'buy';
    const pl = s.players[0];
    pl.trait = 'basket';
    const plain = marketCost(s, 'blueberry', 2);
    pl.boughtToday = 3;
    expect(buyCost(s, 0, 'blueberry', 2)).toBe(plain);
    pl.boughtToday = 4;
    expect(buyCost(s, 0, 'blueberry', 2)).toBe(plain + 1);
    pl.upgrades.push('barrow'); // a Handcart moves the usual limit to 5
    expect(buyCost(s, 0, 'blueberry', 2)).toBe(plain);
    pl.boughtToday = 5;
    expect(buyCost(s, 0, 'blueberry', 2)).toBe(plain + 1);
  });

  it('prices a mango at $5 fresh and $4 green', () => {
    expect(FRUIT.mango.cost.fresh).toBe(5);
    expect(FRUIT.mango.cost.unripe).toBe(4);
  });
});
