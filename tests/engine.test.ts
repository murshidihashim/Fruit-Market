import { describe, expect, it } from 'vitest';
import { autoplay } from '../src/engine/ai';
import { newGame, buy, buyCost, buyLimit, beginBuying, endBuyTurn, submitBids, count, servingCustomers, type GameConfig, type GameState } from '../src/engine/game';
import { freshPos } from '../src/engine/data';

function cfg(n: number, seed = 1, extra: Partial<GameConfig> = {}): GameConfig {
  return {
    players: Array.from({ length: n }, (_, i) => ({ name: `P${i}`, kind: 'ai' as const, level: (['easy', 'normal', 'hard'] as const)[i % 3], avatar: 'x' })),
    days: 10, unripe: true, upgrades: true, events: true, seed, ...extra,
  };
}

function total(s: GameState) {
  return s.players.reduce((a, p) => a + p.cash, 0);
}

describe('engine', () => {
  it('plays many full games without errors', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const s = autoplay(newGame(cfg(2 + (seed % 3), seed)));
      expect(s.phase).toBe('over');
      for (const p of s.players) expect(p.cash).toBeGreaterThanOrEqual(0);
    }
  });

  it('is deterministic for a seed', () => {
    const a = autoplay(newGame(cfg(4, 42)));
    const b = autoplay(newGame(cfg(4, 42)));
    expect(a.players.map((p) => p.cash)).toEqual(b.players.map((p) => p.cash));
  });

  it('charges market cost and respects the buy limit', () => {
    let s = beginBuying(newGame({ ...cfg(2, 3), players: [{ name: 'A', kind: 'human', avatar: 'a' }, { name: 'B', kind: 'human', avatar: 'b' }] }));
    const p = s.order[0];
    s.players[p].cash = 99;
    s.market.apple[freshPos('apple')] = 5;
    s.market.apple[freshPos('apple')] = 9;
    const before = s.players[p].cash;
    const each = buyCost(s, p, 'apple', freshPos('apple'));
    const limit = buyLimit(s.players[p]);
    expect(limit).toBe(4);
    for (let i = 0; i < limit; i++) s = buy(s, p, 'apple', freshPos('apple'));
    expect(s.players[p].cash).toBe(before - each * limit);
    expect(count(s.players[p].stock)).toBe(limit);
    expect(() => buy(s, p, 'apple', freshPos('apple'))).toThrow();
  });

  it('cheapest offer wins and money is conserved through sales', () => {
    let s = beginBuying(newGame({ ...cfg(2, 9, { events: false }), players: [{ name: 'A', kind: 'human', avatar: 'a' }, { name: 'B', kind: 'human', avatar: 'b' }] }));
    // Give both players the same fruit directly.
    for (const pl of s.players) pl.stock.apple[freshPos('apple')] = 3;
    s = endBuyTurn(s, s.order[0]);
    s = endBuyTurn(s, s.order[1]);
    expect(s.phase).toBe('bid');
    const c = servingCustomers(s)[0];
    const want = c.wants[0];
    for (const pl of s.players) pl.stock[want.fruit][freshPos(want.fruit)] = 5;
    const cashBefore = total(s);
    s = submitBids(s, 0, [{ customerId: c.id, fruit: want.fruit, qty: want.qty, price: 3 }]);
    s = submitBids(s, 1, [{ customerId: c.id, fruit: want.fruit, qty: want.qty, price: 2 }]);
    const line = s.results!.lines.find((l) => l.customerId === c.id && l.fruit === want.fruit)!;
    expect(line.offers.find((o) => o.player === 1)!.sold).toBe(want.qty);
    expect(line.offers.find((o) => o.player === 0)!.sold).toBe(0);
    expect(total(s)).toBeGreaterThanOrEqual(cashBefore + want.qty * 2);
  });
});

describe('pacing', () => {
  it('customers want more as the game goes on', () => {
    let early = 0, late = 0;
    for (let seed = 1; seed <= 60; seed++) {
      let s = newGame(cfg(4, seed, { events: false }));
      while (s.phase !== 'over') {
        if (s.phase === 'bid' && s.day === 1) early += s.firstMarket.reduce((a, c) => a + c.original.reduce((b, w) => b + w.qty, 0), 0);
        if (s.phase === 'bid' && s.day === 10) late += s.firstMarket.reduce((a, c) => a + c.original.reduce((b, w) => b + w.qty, 0), 0);
        s = autoplay(s, 1);
        if (s.phase === 'morning') s = beginBuying(s);
      }
    }
    expect(late).toBeGreaterThan(early * 1.6);
  });
});
