// Computer players' price planner (PLAN-051 package B, REP-089 items 1 and 6): on Closing Day an unsold ripe
// fruit is worth what the jam maker pays, and the planner's model of the rush follows the real tie order.
import { describe, expect, it } from 'vitest';
import { aiStep, planPrices, seller, simulateSales } from '../src/engine/ai';
import { CUSTOMER_CARDS, FRUIT, JAM_PRICE, prefOf, type FruitId } from '../src/engine/data';
import {
  beginBuying, emptyStock, endBuyTurn, finishReveal, newGame, openStall, submitPrices,
  type Customer, type GameConfig, type GameState,
} from '../src/engine/game';

const fresh = (f: FruitId) => FRUIT[f].ripe.length - 1;
const OKAY_APPLE = 2;

/** Two stalls at the stall step with an empty shelf and a known crowd, on day `day` of `days`. */
function market(crowd: Customer[], opts: { day?: number; days?: 8 | 10 | 14; extra?: Partial<GameConfig> } = {}): GameState {
  const days = opts.days ?? 10;
  const cfg: GameConfig = {
    players: [0, 1].map((i) => ({ name: `H${i}`, kind: 'human' as const, avatar: 'a' })),
    days, unripe: true, upgrades: true, events: false, seed: 11, ...opts.extra,
  };
  let s = beginBuying(newGame(cfg));
  s = endBuyTurn(s, s.order[0]);
  s = endBuyTurn(s, s.order[1]);
  s = structuredClone(s);
  s.day = opts.day ?? 1;
  s.firstMarket = crowd;
  s.secondMarket = [];
  s.order = [0, 1];
  for (const pl of s.players) {
    pl.trait = null;
    pl.favours = [];
    pl.stock = { blueberry: [0, 0, 0], watermelon: [0, 0, 0, 0, 0, 0], apple: [0, 0, 0, 0, 0, 0, 0], mango: [0, 0, 0, 0, 0, 0] };
  }
  return s;
}

const buyer = (id: number, name: string, qty: number, max: number, pref: Customer['pref'] = 'bargain'): Customer => ({
  id, name, pref, wants: [{ fruit: 'apple', qty, max }], original: [{ fruit: 'apple', qty, max }],
});

const apples = (s: GameState, p: number) => s.players[p].stock.apple.reduce((a, b) => a + b, 0);

/** Opens both stalls with all their apples and moves to pricing. */
function toPricing(s: GameState): GameState {
  let t = s;
  for (const p of [0, 1]) t = openStall(t, p, apples(t, p) ? { apple: apples(t, p) } : {});
  return t;
}

describe("the planner's model of the rush follows the tie order", () => {
  // Both stalls post $6 for apples; one customer wants `want` apples. The planner's count for each stall must match
  // what the rush really does (the old model shared tied sales in proportion).
  const tie = (setup: (s: GameState) => void, want = 3, favoured: [boolean, boolean] = [false, false]) => {
    const s = market([buyer(900, 'Tester', want, 8)]);
    setup(s);
    const bid = toPricing(s);
    const model = [0, 1].map((p) => simulateSales(bid, 'apple', seller(bid, p, 'apple', 6, 3, favoured[p]), [seller(bid, 1 - p, 'apple', 6, 3, favoured[1 - p])]));
    let r = submitPrices(bid, 0, [{ fruit: 'apple', price: 6 }], favoured[0]);
    r = submitPrices(r, 1, [{ fruit: 'apple', price: 6 }], favoured[1]);
    const real = [0, 1].map((p) => r.results!.lines[0].offers.find((o) => o.player === p)!.sold);
    expect(model).toEqual(real);
    return real;
  };

  it('gives the whole order to the Haggler at a tie, even against fresher fruit', () => {
    expect(tie((s) => {
      s.players[0].stock.apple[fresh('apple')] = 3;
      s.players[1].stock.apple[OKAY_APPLE] = 3;
      s.players[1].trait = 'haggler';
    })).toEqual([0, 3]);
    // Demand beyond the winner's crate spills to the other stall.
    expect(tie((s) => {
      s.players[0].stock.apple[fresh('apple')] = 3;
      s.players[1].stock.apple[fresh('apple')] = 3;
      s.players[1].trait = 'haggler';
    }, 4)).toEqual([1, 3]);
  });

  it('Favoured Trade beats the Haggler', () => {
    expect(tie((s) => {
      s.players[0].stock.apple[OKAY_APPLE] = 3;
      s.players[0].favours = ['favouredTrade'];
      s.players[1].stock.apple[fresh('apple')] = 3;
      s.players[1].trait = 'haggler';
    }, 3, [true, false])).toEqual([3, 0]);
  });

  it('fresher fruit wins a tie without a Haggler; with the same freshness the earlier buyer wins', () => {
    expect(tie((s) => {
      s.players[0].stock.apple[OKAY_APPLE] = 3;
      s.players[1].stock.apple[fresh('apple')] = 3;
    })).toEqual([0, 3]);
    // Both fresh, but the younger piece wins (position 6 beats position 4).
    expect(tie((s) => {
      s.players[0].stock.apple[fresh('apple')] = 3;
      s.players[1].stock.apple[fresh('apple') - 2] = 3;
    })).toEqual([3, 0]);
    expect(tie((s) => {
      s.players.forEach((p) => { p.stock.apple[fresh('apple')] = 3; });
      s.order = [1, 0];
    })).toEqual([0, 3]);
  });

  it('hands over pieces from the whole shelf, up to the crate, like the rush', () => {
    // A Premium customer takes only fresh fruit: a crate of 2 from a shelf of 2 tired and 2 fresh still sells 2.
    const s = market([buyer(900, 'Tester', 3, 8, 'premium')]);
    s.players[0].stock.apple[0] = 2;
    s.players[0].stock.apple[fresh('apple')] = 2;
    let bid = openStall(s, 0, { apple: 2 });
    bid = openStall(bid, 1, {});
    expect(simulateSales(bid, 'apple', seller(bid, 0, 'apple', 6, 2), [])).toBe(2);
    const r = submitPrices(bid, 0, [{ fruit: 'apple', price: 6 }]);
    expect(r.results!.lines[0].offers[0].sold).toBe(2);
  });
});

describe('Closing Day: the planner counts what the jam maker pays', () => {
  // Final day: one stall has 4 fresh apples. One buyer pays up to $10 for 1 (card $9 + $1 Closing Day bonus), another
  // takes 3 at up to $3. Selling all 4 at $3 earns $12; $10 for one plus $3 from the jam maker for the other three
  // earns $13. Counting leftovers as $0 (the old planner) chose $3.
  const closing = () => {
    const s = market([buyer(900, 'Big Spender', 1, 9), buyer(901, 'Bargain Bob', 3, 2)], { day: 8, days: 8 });
    s.players[0].stock.apple[fresh('apple')] = 4;
    return toPricing(s);
  };

  it('a Hard computer asks $10, not $3', () => {
    const s = closing();
    s.players[0].level = 'hard';
    expect(planPrices(s, 0).posts).toEqual([{ fruit: 'apple', price: 10 }]);
  });

  it('the suggested price for a person (Normal planner) is higher too', () => {
    // A Normal planner takes $0 or $1 off its best price at random (the same every time for this state): here $1.
    // The old planner suggested $2.
    expect(planPrices(closing(), 0).posts).toEqual([{ fruit: 'apple', price: 9 }]);
  });

  it('the payoff it plans for is real: $10 plus the jam maker beats selling all four at $3', () => {
    const cash = (price: number) => {
      const s = closing();
      const end = finishReveal(submitPrices(s, 0, [{ fruit: 'apple', price }]));
      expect(end.phase).toBe('over');
      return end.players[0].cash - s.players[0].cash;
    };
    expect(cash(10)).toBe(10 + 3 * JAM_PRICE);
    expect(cash(3)).toBe(12);
  });
});

describe('pricing against the Haggler (REP-089 item 6, before the bell)', () => {
  it("a person's suggested price doesn't tie Rosa when $1 less sells more", () => {
    // You have 2 fresh mangoes out, Rosa (the Haggler) 3. Sarah and Grace want 2 each. The old planner shared tied
    // sales, so it suggested Rosa's own $8: Rosa won the tie and you sold 1 for $8. At $7 you sell both for $14.
    const s = newGame({
      players: [{ name: 'You', kind: 'human', avatar: 'a' }, { name: 'Rosa', kind: 'ai', level: 'normal', avatar: '🦊' }],
      days: 10, unripe: true, upgrades: true, events: false, seed: 7,
    });
    expect(s.players[1].trait).toBe('haggler');
    s.day = 2; s.event = null; s.nextEvent = null; s.phase = 'bid'; s.order = [0, 1];
    s.players.forEach((p) => { p.stock = emptyStock(true); p.favours = []; });
    const want = (name: string) => {
      const w = CUSTOMER_CARDS.find((c) => c.name === name)!.wants.filter((x) => x.fruit === 'mango').map((x) => ({ ...x }));
      return { id: name.length, name, pref: prefOf(name), wants: w, original: w.map((x) => ({ ...x })) };
    };
    s.secondMarket = []; s.firstMarket = [want('Sarah'), want('Grace')];
    s.players[0].stock.mango[fresh('mango')] = 2;
    s.players[1].stock.mango[fresh('mango')] = 3;
    s.stalls = [{ mango: 2 }, { mango: 3 }]; s.bids = [null, null];
    const mine = planPrices(s, 0).posts[0].price;
    const rosa = planPrices(s, 1).posts[0].price;
    expect([mine, rosa]).toEqual([7, 8]);
    const r = submitPrices(submitPrices(s, 0, [{ fruit: 'mango', price: mine }]), 1, [{ fruit: 'mango', price: rosa }]);
    expect(r.results!.income[0]).toBe(14);
  });
});

describe('the planner uses only what it may know', () => {
  it("never reads a rival's favour cards or Favoured Trade", () => {
    const s = market([buyer(900, 'Tester', 3, 8)]);
    s.players[0].stock.apple[fresh('apple')] = 3;
    s.players[1].stock.apple[fresh('apple')] = 3;
    s.players[0].kind = 'ai';
    s.players[0].level = 'hard';
    const bid = toPricing(s);
    const plain = planPrices(bid, 0);
    const peek = structuredClone(bid);
    peek.players[1].favours = ['favouredTrade', 'favouredTrade'];
    peek.players[1].favouredTrade = true;
    expect(planPrices(peek, 0)).toEqual(plain);
  });

  it('a computer holding Favoured Trade plans to win ties and plays it; a person is not assumed to', () => {
    const s = market([buyer(900, 'Tester', 3, 8)]);
    s.players[0].stock.apple[fresh('apple')] = 3;
    s.players[1].stock.apple[fresh('apple')] = 3;
    s.players[1].trait = 'haggler';
    s.players[0].favours = ['favouredTrade'];
    const bid = toPricing(s);
    // The price panel pre-fills a person's prices from planPrices but leaves Favoured Trade off until they play it.
    const person = planPrices(bid, 0);
    const cpu = structuredClone(bid);
    cpu.players[0].kind = 'ai';
    const computer = planPrices(cpu, 0);
    expect(computer.favoured).toBe(true);
    expect(computer.posts[0].price).toBeGreaterThan(person.posts[0].price);
  });
});

describe('Closing Day buying', () => {
  it('computers do not buy fruit nobody wants just to sell it to the jam maker', () => {
    for (const level of ['normal', 'hard'] as const) {
      let s = newGame({
        players: [0, 1].map((i) => ({ name: `A${i}`, kind: 'ai' as const, level, avatar: 'a' })),
        days: 8, unripe: true, upgrades: true, events: false, seed: 4,
      });
      s = structuredClone(s);
      s.day = 8;
      s.forecast = null;
      s.queue = [];
      s.secondMarket = [];
      s.firstMarket = [];
      s.players.forEach((pl) => { pl.cash = 50; pl.upgrades = ['juicebar']; });
      s = beginBuying(s);
      for (let i = 0; i < 20 && s.phase === 'buy'; i++) s = aiStep(s)!;
      expect(s.phase).toBe('stall');
      expect(s.players.map((p) => p.boughtToday)).toEqual([0, 0]);
    }
  });
});
