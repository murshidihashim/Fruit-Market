// Rules 11, the compact rules (PLAN-057): every number here is copied from the owner's build spec
// ("Fruit Market: Compact Rules", 9 November 2026), so the game data is checked against the spec, not against itself.
import { describe, expect, it } from 'vitest';
import {
  BARROW_BUY, BARROW_SHELF, BASE_BUY, BASE_SHELF, CHARACTER_AVATARS, CHARACTER_TRAIT, CUSTOMER_CARDS, EVENT_CARDS, FARMER_CARDS, FRUIT,
  FRUITS, JUICE_CAP, LOCAL_FAVOURITE_TIP, NEST_EGG_BONUS, RIVALS, START_CASH, TRAITS, UPGRADES, favourDeckFor, lookOf, prefOf,
  type FruitId,
} from '../src/engine/data';
import { autoplay } from '../src/engine/ai';
import {
  applyAction, beginBuying, buyCost, emptyStock, endBuyTurn, newGame, openStall, printedSupply, shadePick, submitPrices,
  walkInsOn, type Customer, type GameConfig, type GameState,
} from '../src/engine/game';
import { RULES_VERSION } from '../src/net/protocol';

const F: FruitId[] = ['blueberry', 'watermelon', 'apple', 'mango'];
const humans = (n: number, extra: Partial<GameConfig> = {}): GameConfig => ({
  players: Array.from({ length: n }, (_, i) => ({ name: `P${i}`, kind: 'human' as const, avatar: '' })),
  days: 10, unripe: true, upgrades: true, events: true, seed: 5, ...extra,
});

describe('rules 11: core numbers (spec section 1)', () => {
  it('start cash $10, buy 4 (Handcart 5), shelf 6 (Handcart 8); rules version 11 or later (12: crate pieces)', () => {
    expect([START_CASH, BASE_BUY, BARROW_BUY, BASE_SHELF, BARROW_SHELF]).toEqual([10, 4, 5, 6, 8]);
    expect(RULES_VERSION).toBeGreaterThanOrEqual(11);
  });

  it('plays 2 to 6 stalls and refuses 1 or 7', () => {
    for (const n of [2, 3, 4, 5, 6]) expect(newGame(humans(n)).players).toHaveLength(n);
    expect(() => newGame(humans(1))).toThrow();
    expect(() => newGame(humans(7))).toThrow();
  });
});

describe('rules 11: customer deck (spec section 2)', () => {
  // [title, freshness type, blueberry, watermelon, apple, mango] as "qty at $price", in card order.
  const SPEC: [string, string, string, string, string, string][] = [
    ['Cowboy Jack', 'everyday', '', '1@6', '2@8', ''],
    ['Bobby Books', 'everyday', '2@6', '', '', '1@8'],
    ['Dr Bubbles', 'everyday', '1@5', '', '2@7', '1@11'],
    ['Rara Jenab', 'premium', '1@6', '', '', '2@10'],
    ['Zara Zapp', 'everyday', '', '2@8', '', ''],
    ['Ravi Rocket', 'premium', '', '', '1@6', '1@12'],
    ['Coral Mei', 'bargain', '2@5', '1@7', '', ''],
    ['Postman Pip', 'bargain', '', '', '2@6', ''],
    ['Madam Siti', 'everyday', '', '2@7', '', '1@11'],
    ['Magic Kumar', 'bargain', '1@4', '1@9', '', ''],
    ['Rockstar Grace', 'bargain', '', '', '1@8', '1@9'],
    ['Professor Pebble', 'bargain', '3@5', '', '', ''],
    ['Inspector Wei', 'bargain', '', '1@8', '1@5', '1@10'],
    ['Miss Marigold', 'everyday', '', '2@7', '', ''],
    ['Dr Priya', 'everyday', '1@7', '', '2@7', ''],
    ['Captain Ahmad', 'premium', '', '', '', '3@9'],
    ['Lola Lens', 'everyday', '1@7', '', '', '1@10'],
    ['Grandpa Tan', 'everyday', '', '1@8', '1@7', ''],
    ['Miss Cha-Cha', 'premium', '', '', '1@9', '2@10'],
    ['Sleepy Zul', 'everyday', '2@6', '1@6', '', ''],
    ['Anna the Artist', 'premium', '', '', '', '2@11'],
    ['Otto Oddjob', 'everyday', '1@6', '', '1@6', '1@12'],
    ['Mina Moss', 'everyday', '', '2@7', '', ''],
    ['Firefighter Osman', 'everyday', '', '1@9', '2@6', ''],
    ['Marina Wen', 'everyday', '', '', '1@7', '1@10'],
    ['DJ Rizal', 'everyday', '2@5', '1@7', '', ''],
    ['Devi Bloom', 'premium', '', '', '', '2@10'],
    ['Marcus Hook', 'everyday', '1@6', '', '2@6', '1@11'],
    ['Professor Fatimah', 'everyday', '1@5', '1@8', '', ''],
    ['Benny Bell', 'everyday', '', '2@7', '', ''],
    ['Akira Swift', 'everyday', '', '1@7', '1@7', '1@9'],
    ['Hadi Hammer', 'everyday', '2@6', '', '', ''],
    ['Baker Lakshmi', 'everyday', '', '1@8', '1@8', ''],
    ['Kenji Kaze', 'everyday', '1@5', '1@9', '', '1@11'],
    ['Herbalist Mira', 'everyday', '', '', '1@6', '2@10'],
    ['Uncle Hock Seng', 'everyday', '', '1@9', '2@6', ''],
  ];

  it('matches the spec card by card', () => {
    expect(CUSTOMER_CARDS).toHaveLength(36);
    CUSTOMER_CARDS.forEach((c, i) => {
      const [title, pref, ...cells] = SPEC[i];
      const got = F.map((f) => { const w = c.wants.find((x) => x.fruit === f); return w ? `${w.qty}@${w.max}` : ''; });
      expect([lookOf(c.name).title, prefOf(c.name), ...got], title).toEqual([title, pref, ...cells]);
    });
  });

  it('totals 22 / 23 / 24 / 25 pieces (94), an average order of 2.61', () => {
    const per = F.map((f) => CUSTOMER_CARDS.reduce((a, c) => a + (c.wants.find((w) => w.fruit === f)?.qty ?? 0), 0));
    expect(per).toEqual([22, 23, 24, 25]);
    const sizes = CUSTOMER_CARDS.map((c) => c.wants.reduce((a, w) => a + w.qty, 0));
    expect([2, 3, 4].map((n) => sizes.filter((x) => x === n).length)).toEqual([16, 18, 2]);
  });
});

describe('rules 11: customers per day (spec section 3)', () => {
  const ev = (id: string) => EVENT_CARDS.find((e) => e.id === id)!;
  it('regular + walk-ins, Market Day / Festival, Tourist Bus and Monsoon follow the table', () => {
    // stalls: [walk-ins, market day extra, tourist bus extra, monsoon change]
    const TABLE: Record<number, [number, number, number, number]> = { 2: [1, 1, 2, -1], 3: [2, 1, 2, -1], 4: [3, 2, 3, -2], 5: [4, 2, 4, -2], 6: [5, 2, 4, -2] };
    for (const [n, [base, md, bus, rain]] of Object.entries(TABLE).map(([k, v]) => [Number(k), v] as const)) {
      const s = newGame(humans(n));
      expect(walkInsOn(s, 2, null), `${n} stalls`).toBe(base);
      expect(walkInsOn(s, 3, null), `${n} market day`).toBe(base + md);
      expect(walkInsOn(s, 2, ev('festival')), `${n} festival`).toBe(base + md);
      expect(walkInsOn(s, 2, ev('touristBus')), `${n} tourist bus`).toBe(base + bus);
      expect(walkInsOn(s, 2, ev('monsoon')), `${n} monsoon`).toBe(Math.max(0, base + rain));
    }
    expect(walkInsOn(newGame(humans(2)), 3, ev('monsoon'))).toBe(1); // Market Day +1 and Monsoon -1
  });
});

describe('rules 11: lorry deck (spec section 4)', () => {
  const SPEC: [string, string[]][] = [
    ['Blueberry Bonanza', ['4/1/1/1', '7/2/2/1', '9/3/2/1', '11/3/3/2', '13/4/3/2']],
    ['Watermelon Wagon', ['1/4/1/1', '2/7/2/2', '3/9/2/2', '3/11/3/3', '4/13/3/3']],
    ['Orchard Run', ['2/1/4/1', '2/2/6/1', '3/3/8/1', '4/3/10/2', '5/4/12/2']],
    ['Highland Apples', ['1/1/5/0', '1/1/7/0', '1/1/10/0', '2/2/12/0', '2/2/14/0']],
    ['Mango Rush', ['2/2/1/5', '2/3/1/7', '3/3/1/10', '4/4/2/12', '5/5/2/14']],
    ['Mango Growers', ['2/2/2/4', '3/3/3/6', '4/3/3/7', '5/4/4/9', '6/5/5/11']],
    ['Mango Season', ['2/1/1/4', '3/2/2/7', '4/3/2/9', '6/3/3/11', '7/4/3/13']],
    ['Summer Run', ['3/4/1/1', '5/6/1/1', '7/7/1/1', '9/9/1/2', '10/11/1/2']],
    ['Tropical Pair', ['1/3/1/4', '1/5/1/6', '2/7/1/7', '2/8/2/9', '3/10/2/11']],
    ['Breakfast Run', ['3/1/3/1', '5/2/5/1', '7/2/6/1', '9/3/8/2', '10/3/9/2']],
    ['Premium Picks', ['1/1/3/4', '1/2/4/6', '2/2/6/7', '2/3/7/9', '3/3/8/11']],
    ['Mixed Basket', ['2/2/2/2', '3/3/3/3', '4/4/4/4', '5/5/5/6', '6/6/6/7']],
    ['Balanced Cart', ['3/2/2/2', '4/4/3/3', '5/5/3/4', '6/6/4/5', '8/7/5/6']],
    ["Farmer's Choice", ['2/2/2/3', '3/4/3/4', '4/5/3/5', '5/6/4/6', '6/7/5/8']],
    ['Kampung Truck', ['3/3/0/3', '4/4/0/4', '6/5/0/5', '7/7/0/6', '9/8/0/8']],
    ['Quiet Delivery', ['1/1/1/1', '2/2/2/2', '3/3/2/2', '3/3/3/3', '4/4/3/3']],
    ['Short Load', ['2/1/1/1', '2/2/1/1', '3/2/1/1', '4/3/2/2', '5/3/2/2']],
    ['Convoy', ['3/3/3/3', '5/5/4/5', '6/6/6/7', '8/8/7/8', '9/9/8/10']],
    ["Wholesaler's Overstock", ['3/3/3/1', '4/5/5/2', '5/7/7/3', '6/8/9/4', '8/10/10/4']],
    ['Seconds Lorry', ['3/3/2/1', '4/4/3/2', '5/5/4/3', '6/7/5/4', '8/8/6/4']],
  ];

  it('has the 20 unique cards with the printed yields for 2 to 6 stalls', () => {
    expect(FARMER_CARDS.map((c) => c.name)).toEqual(SPEC.map(([n]) => n));
    for (const [name, rows] of SPEC) {
      const c = FARMER_CARDS.find((x) => x.name === name)!;
      [2, 3, 4, 5, 6].forEach((n, i) => expect(F.map((f) => printedSupply(c, f, n)).join('/'), `${name} at ${n}`).toBe(rows[i]));
    }
    expect(FARMER_CARDS.filter((c) => c.unripe).map((c) => c.name)).toEqual(['Mango Growers', 'Mango Season']);
    expect(FARMER_CARDS.filter((c) => c.okay).map((c) => c.name)).toEqual(['Seconds Lorry']);
  });

  it('averages about 8.3 / 12.7 / 16.1 / 20.6 / 24.4 pieces a day', () => {
    const avg = (n: number) => FARMER_CARDS.reduce((a, c) => a + F.reduce((b, f) => b + printedSupply(c, f, n), 0), 0) / FARMER_CARDS.length;
    // The spec prints 8.35 and 16.15 rounded down.
    [8.3, 12.7, 16.1, 20.6, 24.4].forEach((want, i) => expect(Math.abs(avg(i + 2) - want)).toBeLessThanOrEqual(0.05 + 1e-9));
  });

  it('the Seconds Lorry fills each fruit\'s freshest Okay space, at Okay prices', () => {
    let s = newGame(humans(3, { events: false }));
    s = structuredClone(s);
    s.market = emptyStock(true);
    s.nextFarmer = FARMER_CARDS.find((c) => c.okay)!;
    s.phase = 'evening'; s.turn = 0; s.order = [0, 1, 2];
    for (const p of [0, 1, 2]) s = applyAction(s, p, { kind: 'endEvening' });
    const okayPos = (f: FruitId) => FRUIT[f].ripe.lastIndexOf('okay');
    expect(F.map((f) => s.market[f][okayPos(f)])).toEqual([4, 4, 3, 2]);
    expect(F.map((f) => s.market[f].reduce((a, b) => a + b, 0))).toEqual([4, 4, 3, 2]);
    s.players[s.order[0]].trait = null;
    expect(F.map((f) => buyCost(s, s.order[0], f, okayPos(f)))).toEqual([1, 2, 2, 2]); // Okay prices
    expect(F.map((f) => FRUIT[f].ripe[okayPos(f)])).toEqual(['okay', 'okay', 'okay', 'okay']);
  });
});

describe('rules 11: events (spec section 5)', () => {
  const ev = (id: string) => EVENT_CARDS.find((e) => e.id === id)!;

  it('has the 20 cards with the spec\'s engine fields', () => {
    expect(EVENT_CARDS.map((e) => e.title)).toEqual([
      'Festival', 'Superfood Trend', 'Mango Craze', 'Hotel Order', 'Heatwave', 'Apple Blight', 'Blueberry Glut', 'Good Harvest', 'Bad Harvest',
      'Price Hike', 'Price Controls', 'Health Inspector', 'Lorry Breakdown', 'Tourist Bus', 'Monsoon Downpour', 'Durian Season', 'Kenduri',
      'Mango Windfall', 'Pasar Malam', 'Bake-Off',
    ]);
    expect(ev('touristBus')).toMatchObject({ walkIns: 2 });
    expect(ev('monsoon')).toMatchObject({ walkIns: -1, ageExtra: -1 });
    expect(ev('durian')).toMatchObject({ cost: -1, priceAll: -1 });
    expect(ev('kenduri').extra!.wants).toEqual([{ fruit: 'watermelon', qty: 3, max: 8, fixed: true }]);
    expect(ev('mangoWindfall')).toMatchObject({ supplyEach: { mango: 1 }, price: { mango: -2 } });
    expect(ev('pasarMalam')).toMatchObject({ hawker: 3 });
    expect(ev('bakeOff')).toMatchObject({ price: { apple: 1 } });
    expect(ev('bakeOff').extra!.wants).toEqual([{ fruit: 'apple', qty: 2, max: 7, fixed: true }]);
    expect(ev('glut')).toMatchObject({ supplyEach: { blueberry: 1 } });
    expect(ev('goodHarvest')).toMatchObject({ supplyAll: 1, priceAll: -1 });
  });

  /** The morning delivery of one card on a day with this event, for `n` stalls. */
  function delivered(n: number, card: string, event: string): Record<FruitId, number> {
    let s = newGame(humans(n));
    s = structuredClone(s);
    s.market = emptyStock(true);
    s.nextFarmer = FARMER_CARDS.find((c) => c.name === card)!;
    s.eventDeck = [EVENT_CARDS.findIndex((e) => e.id === event)]; // rules 13: the event is drawn on its own morning
    s.phase = 'evening'; s.turn = 0; s.order = s.players.map((_, i) => i);
    for (let p = 0; p < n; p++) s = applyAction(s, p, { kind: 'endEvening' });
    return Object.fromEntries(F.map((f) => [f, s.delivery[f] ?? 0])) as Record<FruitId, number>;
  }

  it('Blueberry Glut adds 1 per 2 stalls, Good Harvest 1 of each per 4 stalls, Mango Windfall 1 ripe mango per 2 stalls', () => {
    expect([2, 3, 4, 5, 6].map((n) => delivered(n, 'Mixed Basket', 'glut').blueberry - printedSupply(FARMER_CARDS[11], 'blueberry', n))).toEqual([1, 2, 2, 3, 3]);
    expect([2, 3, 4, 5, 6].map((n) => delivered(n, 'Mixed Basket', 'goodHarvest').apple - printedSupply(FARMER_CARDS[11], 'apple', n))).toEqual([1, 1, 1, 2, 2]);
    expect([2, 3, 4, 5, 6].map((n) => delivered(n, 'Mixed Basket', 'mangoWindfall').mango - printedSupply(FARMER_CARDS[11], 'mango', n))).toEqual([1, 2, 2, 3, 3]);
  });

  it('Monsoon Downpour: nothing ages tonight, on shelves or at the market', () => {
    let s = newGame(humans(2));
    s = structuredClone(s);
    s.event = ev('monsoon');
    s.day = 4;
    s.market = emptyStock(true); s.market.blueberry[0] = 2;
    s.players[0].stock.blueberry = [1, 1, 1];
    s.players[1].stock.apple[0] = 1;
    s.phase = 'evening'; s.turn = 0; s.order = [0, 1];
    s = applyAction(applyAction(s, 0, { kind: 'endEvening' }), 1, { kind: 'endEvening' });
    expect(s.day).toBe(5);
    expect(s.players[0].stock.blueberry).toEqual([1, 1, 1]);
    expect(s.players[1].stock.apple[0]).toBe(1);
    expect(s.players.every((p) => p.stats.spoiled === 0)).toBe(true);
  });

  it('Pasar Malam: the hawker buys 1 of each crate fruit left after the rush, oldest first, at $3', () => {
    let s = beginBuying(newGame(humans(2, { events: false })));
    for (const p of [...s.order]) s = endBuyTurn(s, p);
    s = structuredClone(s);
    s.event = ev('pasarMalam');
    s.firstMarket = []; s.secondMarket = [];
    s.players.forEach((p) => { p.stock = emptyStock(true); p.trait = null; });
    s.players[0].stock.apple = [1, 0, 2, 0, 0, 0, 1]; // tired, okay x2, fresh
    s.players[0].stock.mango[3] = 2;
    s.players[1].stock.apple[6] = 3;
    const cash = s.players.map((p) => p.cash);
    s = openStall(s, 0, { apple: 4, mango: 1 });
    s = openStall(s, 1, {}); // nothing in the crate: the hawker buys nothing
    s = submitPrices(s, 0, [{ fruit: 'apple', price: 9 }, { fruit: 'mango', price: 9 }]);
    expect(s.results!.hawker).toEqual([{ player: 0, fruit: 'apple', price: 3 }, { player: 0, fruit: 'mango', price: 3 }]);
    expect(s.players[0].stock.apple).toEqual([0, 0, 2, 0, 0, 0, 1]); // the tired one went
    expect(s.players[0].cash - cash[0]).toBe(6);
    expect(s.players[1].cash).toBe(cash[1]);
  });
});

describe('rules 11: shopkeepers (spec section 6)', () => {
  it('eight characters with eight perks; every sixth player still picks from at least 3', () => {
    expect(RIVALS.map((r) => [r.name, TRAITS[CHARACTER_TRAIT[r.avatar]].title])).toEqual([
      ['Rosa', 'Haggler'], ['Uncle Benny', 'Big Basket'], ['Ah Chen', 'Charmer'], ['Saleh', 'Nest Egg'], ['Raj', 'Bargain Hunter'],
      ['Kiki', 'Tip Jar'], ['Pak Din', 'Shade Cloth'], ['Farah', 'Sharp Ears'],
    ]);
    expect(CHARACTER_AVATARS.length - 5).toBeGreaterThanOrEqual(3);
    expect([LOCAL_FAVOURITE_TIP, START_CASH + NEST_EGG_BONUS]).toEqual([2, 18]);
  });

  function rush(setup: (s: GameState) => void, customers: Customer[], crates: Partial<Record<FruitId, number>>[], prices: number[][]) {
    let s = beginBuying(newGame(humans(crates.length, { events: false })));
    for (const p of [...s.order]) s = endBuyTurn(s, p);
    s = structuredClone(s);
    s.firstMarket = customers; s.secondMarket = [];
    s.order = s.players.map((_, i) => i);
    s.players.forEach((p) => { p.stock = emptyStock(true); p.trait = null; p.favours = []; });
    setup(s);
    crates.forEach((c, p) => { s = openStall(s, p, c); });
    prices.forEach((ps, p) => { if (s.bids[p] === null) s = submitPrices(s, p, Object.keys(crates[p]).map((f, i) => ({ fruit: f as FruitId, price: ps[i] }))); });
    return s;
  }
  const cust = (id: number, wants: [FruitId, number, number][], walkIn = false, seenBy: number[] = []): Customer => {
    const w = wants.map(([fruit, qty, max]) => ({ fruit, qty, max }));
    return { id, name: `C${id}`, wants: w, original: w.map((x) => ({ ...x })), pref: 'bargain', ...(walkIn ? { walkIn, seenBy } : {}) };
  };

  it('Charmer earns up to 2 favour cards a day; everyone else 1', () => {
    const three = [cust(1, [['apple', 1, 9]]), cust(2, [['apple', 1, 9]]), cust(3, [['apple', 1, 9]])];
    for (const [trait, want] of [['charmer', 2], [null, 1]] as const) {
      const s = rush((g) => { g.players[0].trait = trait; g.players[0].stock.apple[6] = 3; }, structuredClone(three), [{ apple: 3 }, {}], [[5], []]);
      expect(s.results!.favours.filter((x) => x.player === 0), String(trait)).toHaveLength(want);
    }
  });

  it('Sharp Ears: a peeked walk-in tips $1 when Farah sells them anything ($2 at 4 to 6 stalls), once a day', () => {
    for (const [n, tip] of [[3, 1], [4, 2]] as const) {
      const crowd = [cust(1, [['apple', 1, 9], ['mango', 1, 12]], true, [0]), cust(2, [['apple', 1, 9]], true, []), cust(3, [['apple', 1, 9]])];
      const crates = Array.from({ length: n }, (_, i) => (i === 0 ? { apple: 3, mango: 1 } : {}));
      const s = rush((g) => { g.players[0].trait = 'earful'; g.players[0].stock.apple[6] = 3; g.players[0].stock.mango[3] = 1; }, crowd, crates, crates.map((_, i) => (i === 0 ? [5, 9] : [])));
      expect(s.results!.earful).toEqual([{ player: 0, customer: 'C1', tip }]);
      expect(s.results!.income[0]).toBe(5 * 3 + 9 + tip);
    }
  });

  it('Sharp Ears peeks at one of tomorrow\'s walk-ins when they are drawn', () => {
    let s = newGame({ ...humans(3), players: [{ name: 'Farah', kind: 'human', avatar: RIVALS[7].avatar }, ...humans(2).players] });
    expect(s.players[0].trait).toBe('earful');
    s = beginBuying(s);
    for (const p of [...s.order]) s = endBuyTurn(s, p);
    expect(s.queue.filter((c) => c.seenBy?.includes(0))).toHaveLength(1);
  });

  it('Haggler wins only ties of equally fresh fruit (after freshness, before the buying order)', () => {
    const one = () => [cust(1, [['apple', 2, 9]])];
    const fresh = rush((g) => { g.players[1].trait = 'haggler'; g.players[0].stock.apple[6] = 2; g.players[1].stock.apple[6] = 2; }, one(), [{ apple: 2 }, { apple: 2 }], [[6], [6]]);
    expect(fresh.results!.lines[0].offers.find((o) => o.sold)!.player).toBe(1);
    const older = rush((g) => { g.players[1].trait = 'haggler'; g.players[0].stock.apple[6] = 2; g.players[1].stock.apple[5] = 2; }, one(), [{ apple: 2 }, { apple: 2 }], [[6], [6]]);
    expect(older.results!.lines[0].offers.find((o) => o.sold)!.player).toBe(0);
    expect(older.results!.income[1]).toBe(0); // no first-sale dollar any more
  });

  it('Shade Cloth: the named fruit does not age tonight; a person can choose it in the evening', () => {
    let s = newGame({ ...humans(2), players: [{ name: 'Din', kind: 'human', avatar: RIVALS[6].avatar }, ...humans(1).players] });
    expect(s.players[0].trait).toBe('keeper');
    s = structuredClone(s);
    s.day = 4; s.event = null; s.nextEvent = null;
    s.players[0].stock.blueberry = [2, 0, 1];
    s.players[0].stock.apple[6] = 1;
    expect(shadePick(s, 0)).toBe('blueberry');
    s.phase = 'evening'; s.turn = 0; s.order = [0, 1];
    s = applyAction(s, 0, { kind: 'shade', fruit: 'apple' });
    s = applyAction(s, 0, { kind: 'endEvening' });
    s = applyAction(s, 1, { kind: 'endEvening' });
    expect(s.players[0].stock.apple[6]).toBe(1); // shaded: still at its place
    expect(s.players[0].stock.blueberry).toEqual([0, 1, 0]); // aged
    expect(s.players[0].stats.spoiled).toBe(2);
    expect(() => applyAction(s, 1, { kind: 'shade', fruit: 'apple' })).toThrow();
  });

  it('a computer Pak Din shades the fruit with the most to lose', () => {
    let s = newGame({ ...humans(2), players: [{ name: 'Din', kind: 'ai', level: 'hard', avatar: RIVALS[6].avatar }, ...humans(1).players] });
    s = structuredClone(s);
    s.day = 4;
    s.players[0].stock.mango = [0, 0, 3, 0, 0, 0]; // fresh mangoes about to turn okay
    s.players[0].stock.apple[6] = 1;
    expect(shadePick(s, 0)).toBe('mango');
  });
});

describe('rules 11: upgrades and favours (spec section 7)', () => {
  it('costs halved: Juice Bar $2 (juices up to 2), Handcart $3, Premium Display $4 (rules 13 removed the Cold Room)', () => {
    expect(Object.keys(UPGRADES).sort()).toEqual(['barrow', 'juicebar', 'premium']);
    expect([UPGRADES.juicebar.cost, UPGRADES.barrow.cost, UPGRADES.premium.cost]).toEqual([2, 3, 4]);
    expect(JUICE_CAP).toBe(2);
    expect(UPGRADES.barrow.text).toBe('Buy up to 5 pieces of fruit a day and hold 8.');
  });

  it('favour deck: 12 cards (2 of each) at 2 to 4 stalls, 18 (3 of each) at 5 and 6', () => {
    expect([2, 3, 4, 5, 6].map((n) => favourDeckFor(n).length)).toEqual([12, 12, 12, 18, 18]);
    for (const n of [5, 6]) {
      const s = newGame(humans(n));
      const held = s.players.flatMap((p) => p.favours).length;
      expect(s.favourDeck.length + held).toBe(18);
    }
  });
});

describe('rules 11: whole games at every table size', () => {
  it('computer games of 5 and 6 stalls finish with every rule kept', () => {
    for (const n of [5, 6]) for (const seed of [1, 2]) {
      const g = autoplay(newGame({
        players: RIVALS.slice(0, n).map((r) => ({ name: r.name, kind: 'ai' as const, level: 'hard' as const, avatar: r.avatar })),
        days: 10, unripe: true, upgrades: true, events: true, seed,
      }));
      expect(g.phase).toBe('over');
      for (const p of g.players) {
        expect(p.cash).toBeGreaterThanOrEqual(0);
        for (const f of FRUITS) expect(p.stock[f].every((x) => x >= 0)).toBe(true);
      }
    }
  });

  it('a whole game moves about half the fruit of rules 10 (spec: about 30 pieces sold per stall over 10 days)', () => {
    const sold: number[] = [];
    for (let seed = 1; seed <= 6; seed++) {
      const g = autoplay(newGame({
        players: RIVALS.slice(0, 4).map((r) => ({ name: r.name, kind: 'ai' as const, level: 'hard' as const, avatar: r.avatar })),
        days: 10, unripe: true, upgrades: true, events: true, seed,
      }));
      sold.push(...g.players.map((p) => p.stats.sold));
    }
    const avg = sold.reduce((a, b) => a + b, 0) / sold.length;
    expect(avg).toBeGreaterThan(20);
    expect(avg).toBeLessThan(40);
  });
});
