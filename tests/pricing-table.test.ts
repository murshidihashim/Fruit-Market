import { describe, expect, it } from 'vitest';
import { newGame, type GameState } from '../src/engine/game';
import { pricingTable } from '../src/ui/game/pricingTable';
import { FRUIT, stageAt } from '../src/engine/data';

function pricingState(): GameState {
  const g = newGame({ players: [
    { name: 'You', kind: 'human', avatar: '🦊' }, { name: 'Ah Chen', kind: 'ai', level: 'normal', avatar: '🐼' }, { name: 'Kiki', kind: 'ai', level: 'normal', avatar: '🐷' },
  ], days: 10, unripe: false, upgrades: true, events: false, seed: 5 });
  const s: GameState = JSON.parse(JSON.stringify(g));
  s.phase = 'bid';
  const ripe = (n: number) => n - 1;
  s.players.forEach((pl, i) => {
    pl.stock.apple = pl.stock.apple.map((_, pos) => (pos === ripe(FRUIT.apple.ripe.length) ? 2 : pos === ripe(FRUIT.apple.ripe.length) - 1 ? 1 : 0));
    pl.stock.mango = pl.stock.mango.map((_, pos) => (i === 2 && pos === ripe(FRUIT.mango.ripe.length) ? 3 : 0));
  });
  s.stalls = [{ apple: 2 }, { apple: 3 }, { apple: 1, mango: 2 }];
  // You are pricing; Kiki has sealed a (secret) price of $97.
  s.bids = [null, null, [{ fruit: 'apple', price: 97 }, { fruit: 'mango', price: 98 }]];
  return s;
}

describe('pricing: round the market table (DEC-070)', () => {
  it('shows every stall, rivals first and you last, with each crate and the freshness of the pieces in it (rules 12)', () => {
    const t = pricingTable(pricingState(), 0);
    expect(t.seats.map((x) => [x.player, x.me])).toEqual([[1, false], [2, false], [0, true]]);
    const top = FRUIT.apple.ripe.length - 1, mtop = FRUIT.mango.ripe.length - 1;
    expect(t.seats[1].fruits).toEqual([
      // A crate given only as counts holds the oldest pieces: Kiki's 1 apple is the okay one, 2 of her 3 mangoes.
      { f: 'apple', out: 1, dots: [stageAt('apple', top - 1)] },
      { f: 'mango', out: 2, dots: [stageAt('mango', mtop), stageAt('mango', mtop)] },
    ]);
    expect(t.onSale).toBe(8);
    expect(t.seats.map((x) => x.sealed)).toEqual([false, true, false]);
  });

  it('never reads or shows a sealed price before the bell', () => {
    const s = pricingState();
    const t = pricingTable(s, 0);
    expect(JSON.stringify(t)).not.toMatch(/price|97|98/);
    // Same table when the bids are hidden, as the online server sends them during pricing (server/room.ts redact).
    const redacted: GameState = { ...s, bids: s.bids.map(() => null) };
    expect(pricingTable(redacted, 0).seats.map((x) => x.fruits)).toEqual(t.seats.map((x) => x.fruits));
  });
});
