import { describe, expect, it } from 'vitest';
import { autoplay } from '../src/engine/ai';
import { newGame, buy, beginBuying, endBuyTurn, submitBids, count, servingCustomers, type GameConfig, type GameState } from '../src/engine/game';
import { FRUITS, freshPos } from '../src/engine/data';

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
    const f = FRUITS.find((x) => s.market[x][freshPos(x)] > 0)!;
    const before = s.players[p].cash;
    for (let i = 0; i < 3; i++) s = buy(s, p, f, freshPos(f));
    expect(s.players[p].cash).toBeLessThan(before);
    expect(count(s.players[p].stock)).toBe(3);
    expect(() => buy(s, p, f, freshPos(f))).toThrow();
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
