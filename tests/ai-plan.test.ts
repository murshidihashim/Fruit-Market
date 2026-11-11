// Computer players' price planner (PLAN-051 package B, REP-089 items 1 and 6): on Closing Day an unsold ripe
// fruit is worth what the jam maker pays, and the planner's model of the rush follows the real tie order.
import { describe, expect, it } from 'vitest';
import { aiStep, planPrices, rivalPrice, seller, simulateSales } from '../src/engine/ai';
import { CUSTOMER_CARDS, FARMER_CARDS, FRUIT, JAM_PRICE, prefOf, type FruitId } from '../src/engine/data';
import {
  beginBuying, emptyStock, endBuyTurn, finishReveal, newGame, openStall, submitPrices,
  type Customer, type GameConfig, type GameState,
} from '../src/engine/game';
import { endBuying, settleTies } from './stall-step';

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
  s = endBuying(s);
  s = structuredClone(s);
  s.day = opts.day ?? 1;
  s.firstMarket = crowd;
  s.secondMarket = [];
  s.order = [0, 1];
  for (const pl of s.players) {
    pl.trait = null;
    pl.favours = [];
    pl.stock = { blueberry: [0, 0, 0], watermelon: [0, 0, 0, 0], apple: [0, 0, 0, 0, 0, 0], mango: [0, 0, 0, 0, 0] };
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
    let r = submitPrices(bid, 0, [{ fruit: 'apple', price: 6 }]);
    r = submitPrices(r, 1, [{ fruit: 'apple', price: 6 }]);
    // Rules 18: Favoured Trade is played after the flip, by a stall that holds the card and has a tied price.
    r = settleTies(r, [0, 1].filter((p) => favoured[p]));
    const real = [0, 1].map((p) => r.results!.lines[0].offers.find((o) => o.player === p)!.sold);
    expect(model).toEqual(real);
    return real;
  };

  it('fresher fruit beats the Haggler at a tie (rules 11); with equal freshness the Haggler takes the whole order', () => {
    expect(tie((s) => {
      s.players[0].stock.apple[fresh('apple')] = 3;
      s.players[1].stock.apple[OKAY_APPLE] = 3;
      s.players[1].trait = 'haggler';
    })).toEqual([3, 0]);
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

  it('sells only the pieces in the crate, like the rush (rules 12)', () => {
    // A Premium customer takes only fresh fruit. From a shelf of 2 tired and 2 fresh apples, a crate of the 2 oldest
    // (a computer's crate) sells nothing; a crate of the 2 fresh ones sells both. The planner agrees with the rush.
    const s = market([buyer(900, 'Tester', 3, 8, 'premium')]);
    s.players[0].stock.apple[0] = 2;
    s.players[0].stock.apple[fresh('apple')] = 2;
    for (const [crate, want] of [[undefined, 0], [{ apple: [0, 0, 0, 0, 0, 2] }, 2]] as const) {
      let bid = openStall(s, 0, { apple: 2 }, crate ? { apple: [...crate.apple] } : undefined);
      bid = openStall(bid, 1, {});
      expect(simulateSales(bid, 'apple', seller(bid, 0, 'apple', 6, 2), [])).toBe(want);
      const r = submitPrices(bid, 0, [{ fruit: 'apple', price: 6 }]);
      expect(r.results!.lines[0].offers[0].sold).toBe(want);
    }
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

  it('counts tired fruit that would have rotted tonight at the jam price too', () => {
    // Three tired apples (they would rot tonight on any other day). One buyer pays up to $8 for 1 (card $7 + $1
    // Closing Day), so a tired apple can ask $6; another takes 2 at up to $4, where a tired apple can ask only $2.
    // $6 for one plus 2 x $1 from the jam maker beats selling all three at $2. Counting those leftovers at $0, as
    // fruit that rots tonight is counted on other days, chose $2.
    const s = market([buyer(900, 'Big Spender', 1, 7), buyer(901, 'Bargain Bob', 2, 3)], { day: 8, days: 8 });
    s.players[0].stock.apple[0] = 3;
    s.players[0].kind = 'ai';
    s.players[0].level = 'hard';
    const bid = toPricing(s);
    expect(planPrices(bid, 0).posts).toEqual([{ fruit: 'apple', price: 6 }]);
    const cash = (price: number) => {
      const end = finishReveal(submitPrices(bid, 0, [{ fruit: 'apple', price }]));
      return end.players[0].cash - bid.players[0].cash;
    };
    expect(cash(6)).toBe(6 + 2 * JAM_PRICE);
    expect(cash(2)).toBe(3 * 2);
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
    s.nextFarmer = FARMER_CARDS.find((c) => c.name === 'Mango Rush')!; // plenty of mangoes tomorrow
    s.players.forEach((p) => { p.stock = emptyStock(true); p.favours = []; });
    const want = (name: string) => {
      // Two mangoes each, as on the rules 10 cards (rules 11 halved these orders to 1).
      const w = CUSTOMER_CARDS.find((c) => c.name === name)!.wants.filter((x) => x.fruit === 'mango').map((x) => ({ ...x, qty: 2 }));
      return { id: name.length, name, pref: prefOf(name), wants: w, original: w.map((x) => ({ ...x })) };
    };
    s.secondMarket = []; s.firstMarket = [want('Sarah'), want('Grace')];
    s.players[0].stock.mango[fresh('mango')] = 2;
    s.players[1].stock.mango[fresh('mango')] = 3;
    s.stalls = [{ mango: 2 }, { mango: 3 }]; s.bids = [null, null];
    const mine = planPrices(s, 0).posts[0].price;
    const rosa = planPrices(s, 1).posts[0].price;
    expect(mine).toBeLessThan(rosa); // never Rosa's own price: she would win the tie
    const r = submitPrices(submitPrices(s, 0, [{ fruit: 'mango', price: mine }]), 1, [{ fruit: 'mango', price: rosa }]);
    expect(r.results!.income[0]).toBe(2 * mine);
  });

  it('a Normal planner expects a Haggler rival to keep its best price in one of its four guesses (not a Normal computer, rules 18)', () => {
    // The rival's best price for a fresh apple to a buyer paying up to $8 is $8. Against another rival the four
    // guesses cut $1, $1, $2, $2; a Haggler wins ties against a shop without the Haggler, so one guess cuts nothing.
    const s = market([buyer(900, 'Tester', 3, 8)]);
    s.players[0].stock.apple[fresh('apple')] = 3;
    s.players[1].stock.apple[fresh('apple')] = 3;
    const bid = toPricing(s);
    const guesses = (t: GameState) => [0, 1, 2, 3].map((k) => rivalPrice(t, 0, 1, 'apple', k, 'normal'));
    expect(guesses(bid)).toEqual([7, 7, 6, 6]);
    bid.players[1].trait = 'haggler';
    expect(guesses(bid)).toEqual([8, 7, 6, 6]);
    // Two Hagglers: the tie goes on to fresher fruit and buying order, so no special guess.
    bid.players[0].trait = 'haggler';
    expect(guesses(bid)).toEqual([7, 7, 6, 6]);
    // Rules 18: a Normal computer plans without the Haggler's tie-break (`plain`), so it guesses a Haggler like anyone.
    bid.players[0].trait = null;
    expect([0, 1, 2, 3].map((k) => rivalPrice(bid, 0, 1, 'apple', k, 'normal', true))).toEqual([7, 7, 6, 6]);
  });

  it('a Normal computer Haggler does not hold its price to win a tie it may not get (rules 18)', () => {
    // Three fresh apples each, one buyer for 3 at up to $8, Rosa is the Haggler. The planner's model with the
    // tie-break gives Rosa the whole order at a tied price; without it (how a Normal computer now plans) the earlier
    // buyer takes it, so Rosa has no reason to sit on the tie.
    const s = market([buyer(900, 'Tester', 3, 8)]);
    s.players[0].stock.apple[fresh('apple')] = 3;
    s.players[1].stock.apple[fresh('apple')] = 3;
    s.players[1].trait = 'haggler';
    const bid = toPricing(s);
    const rosa = seller(bid, 1, 'apple', 6, 3), rival = seller(bid, 0, 'apple', 6, 3);
    expect(simulateSales(bid, 'apple', rosa, [rival])).toBe(3);
    expect(simulateSales(bid, 'apple', rosa, [rival], true)).toBe(0);
    // So a Normal computer asks the same price with the Haggler perk as without it.
    const price = (trait: 'haggler' | null) => { const t = structuredClone(bid); t.players[1].kind = 'ai'; t.players[1].level = 'normal'; t.players[1].trait = trait; return planPrices(t, 1).posts[0].price; };
    expect(price('haggler')).toBe(price(null));
  });
});

describe('the planner uses only what it may know', () => {
  it("never reads a rival's favour cards or Favoured Trade", () => {
    // One fresh apple each and one buyer for 1 at up to $6. A planner that knew the rival holds Favoured Trade would
    // expect to lose the tie and ask $1 less ($3 instead of $4 at Normal, $2 instead of $3 at Hard).
    for (const level of ['normal', 'hard'] as const) {
      const s = market([buyer(900, 'Tester', 1, 6)]);
      s.players[0].stock.apple[fresh('apple')] = 1;
      s.players[1].stock.apple[fresh('apple')] = 1;
      s.players[0].kind = 'ai';
      s.players[0].level = level;
      const bid = toPricing(s);
      const plain = planPrices(bid, 0);
      expect(plain.posts).toHaveLength(1);
      const peek = structuredClone(bid);
      peek.players[1].favours = ['favouredTrade', 'favouredTrade'];
      peek.players[1].favouredTrade = true;
      expect(planPrices(peek, 0)).toEqual(plain);
    }
  });

  it('holding Favoured Trade changes nobody\'s planned prices: it is played after the flip (rules 18)', () => {
    // Before rules 18 a computer holding the card planned to win ties and played it with its prices. Now the card is
    // played only once a real tie is on the table, so neither a computer nor a person's hint counts on it.
    for (const kind of ['ai', 'human'] as const) {
      const s = market([buyer(900, 'Tester', 3, 8)]);
      s.players[0].stock.apple[fresh('apple')] = 3;
      s.players[1].stock.apple[fresh('apple')] = 3;
      s.players[1].trait = 'haggler';
      s.players[0].kind = kind;
      const bid = toPricing(s);
      const held = structuredClone(bid);
      held.players[0].favours = ['favouredTrade'];
      expect(planPrices(held, 0)).toEqual(planPrices(bid, 0));
    }
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
      // Rules 18: with no ripe fruit on any shelf nobody stocks or prices, so the day goes straight to the rush.
      expect(s.phase).toBe('reveal');
      expect(s.players.map((p) => p.boughtToday)).toEqual([0, 0]);
    }
  });

  /**
   * Final day, Closing Day on: a Normal computer with an empty shelf and $50 buys first (or last, after the rival has
   * passed). The market has only 3 pieces of `fruit` at position `pos`, the rival holds `rivalFresh` fresh ones (seen
   * bought today: rules 18, a Normal computer recalls only today's purchases), and `crowd` are today's customers.
   * Returns how many pieces the computer bought with its first move.
   */
  const lastDayBuy = (o: { fruit?: FruitId; pos: number; rivalFresh?: number; crowd: Customer[]; buysLast?: boolean; noJam?: boolean }) => {
    const fruit = o.fruit ?? 'apple';
    let s = newGame({
      players: [0, 1].map((i) => ({ name: `A${i}`, kind: 'ai' as const, level: 'normal' as const, avatar: 'a' })),
      days: 8, unripe: true, upgrades: true, events: false, seed: 4, ...(o.noJam ? { marketDays: false } : {}),
    });
    s = structuredClone(s);
    s.day = 8; s.forecast = null; s.queue = []; s.secondMarket = []; s.event = null; s.nextEvent = null;
    s.firstMarket = o.crowd;
    for (const f of Object.keys(s.market) as FruitId[]) s.market[f] = s.market[f].map(() => 0);
    s.market[fruit][o.pos] = 3;
    s.players.forEach((pl) => { pl.cash = 50; pl.upgrades = []; pl.favours = []; pl.trait = null; pl.traitOffer = []; pl.stock = emptyStock(true); });
    s.order = o.buysLast ? [1, 0] : [0, 1];
    s.players[1].stock[fruit][fresh(fruit)] = o.rivalFresh ?? 0;
    if (o.rivalFresh) s.players[1].boughtFruit = { [fruit]: s.players[1].stock[fruit].map((n, i) => (i === fresh(fruit) ? n : 0)) };
    let b = beginBuying(s);
    if (o.buysLast) b = endBuyTurn(b, 1);
    return aiStep(b)!.players[0].boughtToday;
  };

  it('a $1 piece someone may buy is worth at least the jam price if it doesn\'t sell', () => {
    // A tired apple costs $1. One buyer wants 1 apple; selling it is far from sure, but if it doesn't sell the jam maker
    // still pays $1, so it can't lose money. Without the jam floor the computer would not buy it. (Rules 18: a Normal
    // computer no longer sees the rival's shelf and allows for an average stall's carry-over, so the buyer here pays
    // $9, not $8, to keep the piece on the same side of the line.)
    expect(JAM_PRICE).toBe(1);
    expect(lastDayBuy({ pos: 0, crowd: [buyer(900, 'Tester', 1, 9)] })).toBe(1);
    // The same piece with Closing Day switched off (no jam maker) is not worth buying.
    expect(lastDayBuy({ pos: 0, crowd: [buyer(900, 'Tester', 1, 9)], noJam: true })).toBe(0);
  });

  it('a $2 piece gets no jam floor, though someone may buy it', () => {
    // An okay apple costs $2, more than the jam maker pays. Counting the jam maker's $1 for the chance it doesn't sell
    // would make it look worth buying; such last-day pieces mostly went for jam at a loss (PLAN-051 balance run).
    expect(lastDayBuy({ pos: 1, rivalFresh: 1, crowd: [buyer(900, 'Tester', 2, 6)] })).toBe(0);
  });

  it('a $1 piece nobody is expected to want gets no jam floor', () => {
    // Tired watermelons cost $1 and nobody wants watermelon today. Buying last (no one else left to buy), counting the
    // jam floor on top of the planner's hopeful guess at a sale would make one look worth buying.
    expect(lastDayBuy({ fruit: 'watermelon', pos: 0, crowd: [], buysLast: true })).toBe(0);
  });
});
