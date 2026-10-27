// Rules version 3 (PLAN-012, REP-027): town size, apple and mango prices, traits, tomorrow's lorry.
import { describe, expect, it } from 'vitest';
import { FRUIT, LOCAL_FAVOURITE_TIP, MARKET, NEST_EGG_BONUS, START_CASH, TRAITS } from '../src/engine/data';
import { beginBuying, demandScale, newGame, type GameConfig, type GameState } from '../src/engine/game';
import { autoplay } from '../src/engine/ai';
import { explainLine } from '../src/engine/story';
import { RULES_VERSION } from '../src/net/protocol';
import { dailyBoardKey } from '../server/meta';

const cfg = (n: number, seed = 5, days = 10): GameConfig => ({
  players: Array.from({ length: n }, (_, i) => ({ name: `H${i}`, kind: 'human' as const, avatar: 'a' })),
  days, unripe: true, upgrades: true, events: false, seed,
});

describe('town size', () => {
  it('a Handcart or Big Basket does not grow the town', () => {
    const s = newGame(cfg(3));
    const before = demandScale(s);
    s.players[0].upgrades.push('cart');
    s.players[1].trait = 'basket';
    expect(demandScale(s)).toBe(before);
  });

  it('a 4-shop town has 15% more customers per shop than a 3-shop town', () => {
    const three = demandScale(newGame(cfg(3)));
    const four = demandScale(newGame(cfg(4)));
    expect(four / three).toBeCloseTo((4 / 3) * MARKET.fourPlayerDemand, 6);
  });

  it('uses the REP-027 market numbers', () => {
    expect(MARKET).toEqual({ demandStart: 0.6, demandGrowth: 0.45, supplyStart: 0.8, supplyGrowth: 0.2, fourPlayerDemand: 1.15 });
  });
});

describe('fruit and traits', () => {
  it('apples cost $3/$2/$1 and green mangoes $3', () => {
    expect(FRUIT.apple.cost).toEqual({ fresh: 3, okay: 2, notso: 1, unripe: 1 });
    expect(FRUIT.mango.cost.unripe).toBe(3);
    expect(FRUIT.mango.theme).toContain('$3');
  });

  it('trait numbers match their text', () => {
    expect(START_CASH + NEST_EGG_BONUS).toBe(15);
    expect(TRAITS.nestegg.text).toContain('$15');
    expect(LOCAL_FAVOURITE_TIP).toBe(4);
    expect(TRAITS.favourite.text).toContain('$4');
    expect(TRAITS.haggler.text).toContain('fresher');
  });

  it('explains a tie won by a poorer Haggler over fresher fruit', () => {
    const s = newGame(cfg(2));
    s.players[0].trait = 'haggler';
    s.players[0].cash = 5;
    s.players[1].cash = 20;
    const l = { customerId: 1, name: 'John', fruit: 'mango' as const, want: 2, max: 8, offers: [
      { player: 0, qty: 2, price: 6, sold: 2, freshness: 2 },
      { player: 1, qty: 2, price: 6, sold: 0, freshness: 3 },
    ] };
    expect(explainLine(s, l, 1).headline).toContain('haggled');
    expect(explainLine(s, l, 1).tags[1]).toBe('lost tie: haggled');
  });
});

describe("tomorrow's lorry", () => {
  it('is shown every day but the last, and is the card that arrives next morning', () => {
    let s: GameState = newGame({ ...cfg(2, 9), players: cfg(2).players.map((p) => ({ ...p, kind: 'ai' as const, level: 'normal' as const })) });
    let checked = 0;
    while (s.phase !== 'over') {
      if (s.phase === 'morning') s = beginBuying(s);
      const day = s.day;
      const promised = s.nextFarmer;
      if (day < s.config.days) expect(promised).toBeTruthy(); else expect(promised).toBeNull();
      s = autoplay(s, 1);
      if (s.day === day + 1 && promised) {
        // Fruits named on the card arrive in force (4 or more before scaling) unless an event interferes.
        for (const [f, n] of Object.entries(promised.supply)) if ((n ?? 0) > 2) expect(s.delivery[f as keyof typeof s.delivery] ?? 0).toBeGreaterThan(0);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(5);
  });
});

describe('rules version 3', () => {
  it('keeps daily boards for each rules version apart', () => {
    expect(RULES_VERSION).toBe(3);
    expect(dailyBoardKey('2026-11-01')).toBe('daily:2026-11-01:r3');
  });
});
