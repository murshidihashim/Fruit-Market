import { describe, expect, it } from 'vitest';
import { CUSTOMER_CARDS, FRUIT, FRUITS, RIVALS, lookOf, prefOf, type FruitId } from '../src/engine/data';
import { aiStep, planPrices } from '../src/engine/ai';
import { RULES10_CUSTOMERS } from './rules10-cards';
import {
  beginBuying, bestCap, emptyStock, endBuyTurn, finishReveal, forSale, maxPrice, newGame, openStall, submitPrices,
  type Customer, type GameState, type Post,
} from '../src/engine/game';
import { buyerCap, buyersFor, priceRead, stallWantText, stallWanted, tieHint } from '../src/ui/boardModel';

// The Price panel's "Psst…" read and the Stocking panel's demand (REP-089 3.2). Every case runs on the real engine
// with real customer cards; the read is then checked by ringing the bell.

const ROSA = RIVALS[0];
const BENNY = RIVALS[1];
const FRESH = (f: FruitId) => FRUIT[f].ripe.length - 1;
const OKAY = (f: FruitId) => FRUIT[f].ripe.indexOf('okay');
const TIRED = 0;

function buyer(name: string, fruit: FruitId, id: number): Customer {
  // Written with the rules 10 cards (tests/rules10-cards.ts); the reads do not depend on the card numbers.
  const w = { ...RULES10_CUSTOMERS.find((c) => c.name === name)!.wants.find((x) => x.fruit === fruit)! };
  return { id, name, wants: [w], original: [{ ...w }], pref: prefOf(name) };
}

/** Day 1, buying over, these customers in the market (served in this order), empty shelves. Rosa is the Haggler. */
function market(...buyers: [string, FruitId][]): GameState {
  let s = beginBuying(newGame({
    players: [
      { name: 'You', kind: 'human', avatar: '🧑‍🍳' },
      { name: ROSA.name, kind: 'ai', level: 'normal', avatar: ROSA.avatar },
      { name: BENNY.name, kind: 'ai', level: 'normal', avatar: BENNY.avatar },
    ],
    days: 10, unripe: true, upgrades: true, events: false, seed: 7,
  }));
  for (const p of [...s.order]) s = endBuyTurn(s, p);
  s = structuredClone(s);
  s.firstMarket = buyers.map(([name, f], i) => buyer(name, f, 900 + i));
  s.secondMarket = [];
  s.order = [0, 1, 2];
  s.players[0].trait = null;
  s.players[1].trait = 'haggler';
  s.players[2].trait = 'basket';
  for (const pl of s.players) { pl.stock = emptyStock(true); pl.upgrades = []; pl.favours = []; }
  return s;
}

/** Every stall puts `out[p]` of one fruit out: the pricing step. */
function crates(start: GameState, f: FruitId, out: number[]): GameState {
  let s = structuredClone(start);
  out.forEach((n, p) => { s = openStall(s, p, n ? { [f]: n } : {}); });
  expect(s.phase).toBe('bid');
  return s;
}

/** Ring the bell with these prices (stalls with nothing out are skipped) and count what you sold. */
function sells(s: GameState, f: FruitId, prices: number[]): number {
  let g = structuredClone(s);
  prices.forEach((price, p) => { if (g.bids[p] === null) g = submitPrices(g, p, [{ fruit: f, price }]); });
  return g.results!.lines.reduce((a, l) => a + (l.offers.find((o) => o.player === 0)?.sold ?? 0), 0);
}

/** The read as the panel showed it before REP-089: every order for the fruit counted. */
function oldRead(s: GameState, f: FruitId): string {
  const want = buyersFor(s, f).reduce((a, x) => a + x.w.qty, 0);
  const rivals = forSale(s, 1, f) + forSale(s, 2, f);
  return rivals + forSale(s, 0, f) <= want ? 'Enough buyers for everyone' : 'war';
}

describe('the price read counts only buyers who take your freshness at your price', () => {
  it('okay mangoes, one Everyday buyer and one Premium buyer: only 1 of your 2 can sell (the playtest report)', () => {
    const start = market(['Robert', 'mango'], ['Ahmad', 'mango']);
    start.players[0].stock.mango[OKAY('mango')] = 2;
    start.players[1].stock.mango[FRESH('mango')] = 2;
    start.players[2].stock.mango[FRESH('mango')] = 1;
    expect(stallWantText(start, 0, 'mango')).toBe('1 wanted'); // was "6 wanted"
    expect(stallWanted(start, 0, 'mango')).toBe(1);
    const s = crates(start, 'mango', [2, 2, 1]);
    expect(oldRead(s, 'mango')).toBe('Enough buyers for everyone');
    const okayCap = bestCap(s.players[0].stock, 'mango', buyersFor(s, 'mango')[0].max, s.players[0], 'everyday');
    for (let price = 1; price <= okayCap; price++) {
      const r = priceRead(s, 0, 'mango', price);
      expect(r.text).toBe(`Only 1 of your 2 would sell at $${price} (freshness or price)`);
      expect(r.cls).toBe('war');
      expect(sells(s, 'mango', [price, 20, 20])).toBe(1); // even as the cheapest stall
    }
    expect(priceRead(s, 0, 'mango', okayCap + 1).text).toBe(`Nobody takes yours at $${okayCap + 1}`);
    expect(sells(s, 'mango', [okayCap + 1, 20, 20])).toBe(0);
  });

  it('okay mangoes priced over the okay top: nobody takes them, where the old read said "Enough buyers"', () => {
    const start = market(['Sarah', 'mango'], ['Jia Wen', 'mango']); // both Everyday
    start.players[0].stock.mango[OKAY('mango')] = 2;
    start.players[1].stock.mango[FRESH('mango')] = 2;
    const s = crates(start, 'mango', [2, 2, 0]);
    const max = buyersFor(s, 'mango')[0].max;
    expect(oldRead(s, 'mango')).toBe('Enough buyers for everyone');
    expect(priceRead(s, 0, 'mango', max).text).toBe(`Nobody takes yours at $${max}`);
    expect(sells(s, 'mango', [max, max - 1])).toBe(0);
    // At the okay top they would all sell, and they do.
    const r = priceRead(s, 0, 'mango', max - 1);
    expect(r.text).toBe('Enough buyers for everyone (4 out for 4)');
    expect(sells(s, 'mango', [max - 1, max - 2])).toBe(2);
  });

  it('one fresh and one okay mango, Premium buyers only: the okay one never sells, at any price', () => {
    const start = market(['Ahmad', 'mango'], ['Anna', 'mango'], ['Devi', 'mango']);
    start.players[0].stock.mango[FRESH('mango')] = 1;
    start.players[0].stock.mango[OKAY('mango')] = 1;
    start.players[1].stock.mango[FRESH('mango')] = 1;
    const s = crates(start, 'mango', [2, 1, 0]);
    expect(oldRead(s, 'mango')).toBe('Enough buyers for everyone');
    for (const price of [3, 5, 7]) {
      const r = priceRead(s, 0, 'mango', price);
      expect(r.text).not.toMatch(/Enough buyers/);
      expect(r.text).toBe(`Only 1 of your 2 would sell at $${price} (freshness or price)`);
      expect(sells(s, 'mango', [price, 20])).toBe(1);
    }
  });

  it('says "Enough buyers for everyone" when all your pieces sell even if a rival sells first', () => {
    const start = market(['Sarah', 'mango'], ['Jia Wen', 'mango']);
    start.players[0].stock.mango[FRESH('mango')] = 2;
    start.players[1].stock.mango[FRESH('mango')] = 1;
    const s = crates(start, 'mango', [2, 1, 0]);
    const r = priceRead(s, 0, 'mango', 6);
    expect(r).toMatchObject({ cls: 'ok', text: 'Enough buyers for everyone (3 out for 4)', canSell: 2, firm: 4 });
    expect(sells(s, 'mango', [6, 1])).toBe(2);
    expect(sells(s, 'mango', [6, 6])).toBe(2);
  });

  it('fewer orders than pieces is not blamed on freshness or price, and stays calm with no rival out', () => {
    const start = market(['Sarah', 'mango']); // wants 2
    start.players[0].stock.mango[FRESH('mango')] = 4;
    const alone = crates(start, 'mango', [4, 0, 0]);
    for (const price of [3, 6]) {
      expect(priceRead(alone, 0, 'mango', price)).toMatchObject({ cls: 'safe', text: 'No rival has any out: only 2 wanted', canSell: 2 });
      expect(sells(alone, 'mango', [price, 0, 0])).toBe(2);
    }
    start.players[1].stock.mango[FRESH('mango')] = 1;
    const rival = crates(start, 'mango', [4, 1, 0]);
    const r = priceRead(rival, 0, 'mango', 6);
    expect(r).toMatchObject({ cls: 'war', text: 'Only 2 wanted for your 4 and 1 rival piece' });
    expect(r.text).not.toMatch(/freshness or price/);
    // Freshness is still named when it is the limit: tired mangoes Sarah (Everyday) will not take.
    start.players[0].stock.mango[TIRED] = 1;
    start.players[0].stock.mango[FRESH('mango')] = 1;
    const tired = crates(start, 'mango', [2, 1, 0]);
    expect(priceRead(tired, 0, 'mango', 6).text).toBe('Only 1 of your 2 would sell at $6 (freshness or price)');
  });

  it('no "Enough buyers" when a rival at your price could take the only buyer for your older piece (review case)', () => {
    const start = market(['Nurul', 'watermelon'], ['Aisyah', 'watermelon'], ['Kumar', 'watermelon'], ['Hui Min', 'watermelon']);
    start.players[0].upgrades = ['premium'];
    start.players[0].stock.watermelon = [0, 1, 0, 1, 0, 0]; // 1 okay, 1 fresh
    start.players[1].stock.watermelon = [0, 0, 2, 0, 1, 0]; // Rosa: 2 okay, 1 fresh
    start.players[2].stock.watermelon = [0, 0, 1, 0, 0, 0]; // Benny: 1 okay
    start.players[1].trait = null;
    start.players[2].trait = null;
    const s = crates(start, 'watermelon', [2, 3, 1]);
    const r = priceRead(s, 0, 'watermelon', 8);
    expect(r.canSell).toBe(2);
    expect(r.text).not.toMatch(/Enough buyers/);
    expect(r.cls).toBe('war');
    // Only Kumar takes your okay watermelon at $8, and Rosa's fresher one wins that tie.
    expect(sells(s, 'watermelon', [8, 8, 8])).toBe(1);
    expect(sells(s, 'watermelon', [8, 8, 1])).toBe(1);
  });

  it('keeps the other reads: nobody wants the fruit, and no rival has any out', () => {
    const none = crates((() => { const s = market(['Sarah', 'mango']); s.players[0].stock.apple[FRESH('apple')] = 2; return s; })(), 'apple', [2, 0, 0]);
    expect(priceRead(none, 0, 'apple', 4)).toMatchObject({ cls: 'war', text: 'Nobody here wants these today' });
    const start = market(['Sarah', 'mango'], ['Ahmad', 'mango']);
    start.players[0].stock.mango[FRESH('mango')] = 2;
    const alone = crates(start, 'mango', [2, 0, 0]);
    expect(priceRead(alone, 0, 'mango', 6)).toMatchObject({ cls: 'safe', text: 'No rival has any out: 7 would take yours' });
  });

  it('agrees with the bell in seeded computer games: never more than it says, exactly that when you are the cheapest', () => {
    let checks = 0;
    let enough = 0;
    for (let seed = 1; seed <= 5; seed++) {
      const n = 2 + (seed % 3);
      let s = newGame({ players: Array.from({ length: n }, (_, i) => ({ name: `P${i}`, kind: 'ai' as const, level: 'normal' as const, avatar: 'x' })), days: 8, unripe: true, upgrades: true, events: true, seed });
      for (let guard = 0; s.phase !== 'over' && guard < 5000; guard++) {
        if (s.phase === 'bid' && s.bids.every((b) => b === null)) {
          const p = s.day % n;
          for (const f of FRUITS) {
            const out = forSale(s, p, f);
            if (!out) continue;
            for (let price = 1; price <= Math.min(12, maxPrice(s, f)); price++) {
              const r = priceRead(s, p, f, price);
              let g = s;
              const rival: number[] = [];
              for (let i = 0; i < n; i++) {
                if (g.bids[i] !== null) continue;
                let posts: Post[] = planPrices(g, i).posts;
                if (i === p) posts = posts.map((b) => (b.fruit === f ? { fruit: f, price } : b));
                else rival.push(...posts.filter((b) => b.fruit === f).map((b) => b.price));
                g = submitPrices(g, i, posts);
              }
              const sold = g.results!.lines.filter((l) => l.fruit === f).reduce((a, l) => a + (l.offers.find((o) => o.player === p)?.sold ?? 0), 0);
              checks++;
              expect(sold).toBeLessThanOrEqual(r.canSell);
              if (rival.every((q) => q > price)) expect(sold).toBe(r.canSell);
              if (r.text.startsWith('Enough buyers')) {
                enough++;
                expect(sold).toBe(out);
                // "Whatever the rivals charge": every rival at your price, then every rival at $1.
                for (const at of [price, 1]) {
                  let h = s;
                  for (let i = 0; i < n; i++) {
                    if (h.bids[i] !== null) continue;
                    h = submitPrices(h, i, planPrices(h, i).posts.map((b) => (b.fruit === f ? { fruit: f, price: i === p ? price : at } : b)));
                  }
                  expect(h.results!.lines.filter((l) => l.fruit === f).reduce((a, l) => a + (l.offers.find((o) => o.player === p)?.sold ?? 0), 0)).toBe(out);
                }
              }
            }
          }
        }
        if (s.phase === 'morning') s = beginBuying(s);
        else if (s.phase === 'reveal') s = finishReveal(s);
        else s = aiStep(s)!;
      }
    }
    expect(checks).toBeGreaterThan(500);
    expect(enough).toBeGreaterThan(20);
  });
});

describe('the Stocking panel counts only orders your fruit can serve', () => {
  it('Premium buyers and okay fruit: "Nobody takes yours"; no orders: "Nobody wants these"', () => {
    const s = market(['Ahmad', 'mango'], ['Sarah', 'apple']);
    s.players[0].stock.mango[OKAY('mango')] = 3;
    s.players[0].stock.blueberry[FRESH('blueberry')] = 1;
    expect(stallWantText(s, 0, 'mango')).toBe('Nobody takes yours');
    expect(stallWantText(s, 0, 'blueberry')).toBe('Nobody wants these');
    s.players[0].stock.mango[FRESH('mango')] = 1;
    expect(stallWantText(s, 0, 'mango')).toBe(`${buyersFor(s, 'mango')[0].w.qty} wanted`);
  });
});

describe('buyer chips', () => {
  it('a Premium buyer your shelf cannot serve reads "fresh only", not "≤$0"', () => {
    const s = market(['Robert', 'mango'], ['Ahmad', 'mango']);
    s.players[0].stock.mango[OKAY('mango')] = 2;
    const [bobby, ahmad] = buyersFor(s, 'mango');
    const chip = buyerCap(s, 0, 'mango', ahmad);
    expect(chip.label).toBe('fresh only');
    expect(chip.title).toBe(`${lookOf('Ahmad').title} wants 5 but buys fresh fruit only.`);
    expect(chip.label).not.toMatch(/\$0/);
    const cap = bestCap(s.players[0].stock, 'mango', bobby.max, s.players[0], 'everyday');
    expect(buyerCap(s, 0, 'mango', bobby)).toMatchObject({ cap, label: `≤$${cap}`, aria: `${lookOf('Robert').title} up to $${cap}` });
  });

  it('an Everyday buyer and only tired fruit reads "fresh or okay"', () => {
    const s = market(['Sarah', 'mango']);
    s.players[0].stock.mango[TIRED] = 2;
    expect(buyerCap(s, 0, 'mango', buyersFor(s, 'mango')[0]).label).toBe('fresh or okay');
  });
});

describe('tie hint', () => {
  function duel(): GameState {
    const start = market(['Sarah', 'mango']);
    start.players[0].stock.mango[FRESH('mango')] = 2;
    start.players[1].stock.mango[FRESH('mango')] = 2;
    start.players[2].stock.mango[FRESH('mango')] = 2;
    return crates(start, 'mango', [2, 2, 2]);
  }

  it('names the Haggler, who really does win a tie against you', () => {
    const s = duel();
    expect(tieHint(s, 0, 'mango')).toBe(`${ROSA.name} is the Haggler, who wins equally fresh ties`);
    expect(sells(s, 'mango', [7, 7, 20])).toBe(0); // the tie goes to Rosa
  });

  it('says nothing when you play Favoured Trade, are the Haggler, or the Haggler has none out', () => {
    const s = duel();
    expect(tieHint(s, 0, 'mango', true)).toBeNull();
    const me = structuredClone(s);
    me.players[0].trait = 'haggler';
    me.players[1].trait = null;
    expect(tieHint(me, 0, 'mango')).toBeNull();
    const start = market(['Sarah', 'mango']);
    start.players[0].stock.mango[FRESH('mango')] = 2;
    start.players[2].stock.mango[FRESH('mango')] = 2;
    expect(tieHint(crates(start, 'mango', [2, 0, 2]), 0, 'mango')).toBeNull();
  });

  it('never uses a rival\'s Favoured Trade, which is played secretly with their prices', () => {
    const s = duel();
    s.players[2].favouredTrade = true;
    expect(tieHint(s, 0, 'mango')).toBe(`${ROSA.name} is the Haggler, who wins equally fresh ties`);
  });
});
