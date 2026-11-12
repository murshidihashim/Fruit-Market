// Rules version 18 (PLAN-079, REP-101). One section for each lettered item of the approved build:
//   A the top-up for a stall out of cash · B standing orders with a stake, rivals not involved · C shopkeepers
//   D upgrades · E fruit and decks · F no mango customers on days 1 and 2 · G today's purchases public until the bell
//   H rulings · I steps with nothing to decide · J versions · K Favoured Trade after prices flip.
import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import {
  aiActFor, autoplay, believe, pickUpgrade, planOrderBid, planPrices, recall, simulateSales, seller, upgradeWorth, wantsFavouredTrade,
  FAVOURED_TRADE_MARGIN,
} from '../src/engine/ai';
import {
  CUSTOMER_CARDS, EVENT_CARDS, FARMER_CARDS, FAVOUR_DECK, FAVOURS, FRUIT, FRUITS, GUEST_JOINS_FULL_ROW, LOCAL_FAVOURITE_TIP, NEST_EGG_BONUS,
  NO_MANGO_DAYS, ORDER_BOOK_BONUS, ORDER_CARDS, RIVALS, ROW_CAP, SHARED_TIP, START_CASH, TOP_UP, TRAITS, UPGRADES, favourDeckFor,
  sharpEarsTip, stakeFor, type FruitId,
} from '../src/engine/data';
import {
  activePlayer, applyAction, beginBuying, bidOrder, boughtStock, buy, buyCost, canBidOrder, canPlayFavour, decideTie, emptyStock,
  eveningChoice, finishReveal, marketCost, newGame, openStall, orderStake, places, playFavour, printedSupply, publicView, ranking,
  rowCount, rushIncome, servingCustomers, submitPrices, tiedPrices, tieEligible, winners,
  type Customer, type GameConfig, type GameState,
} from '../src/engine/game';
import * as engine from '../src/engine/game';
import { AI_VERSION, PROTOCOL_VERSION, RULES_VERSION, type ClientMsg, type RoomView, type ServerMsg } from '../src/net/protocol';
import { freshRoom, GRACE_MS, redact, Room, type Conn, type RoomIO } from '../server/room';
import { toStaticHtml } from '../src/ui/cards';
import { ripeLine, topUpLine } from '../src/ui/game/panels/MorningCard';
import { OrderRules, OrderStrip, stakeHint } from '../src/ui/game/panels/OrderPanel';
import { TiePanel, tieWords } from '../src/ui/game/panels/PricingTable';
import { finishWords } from '../src/ui/game/panels/Results';
import { extras } from '../src/ui/game/panels/SalesSummary';
import { boughtToday, boughtWords } from '../src/ui/table';
import { standing } from '../src/engine/story';
import { endBuying, passEvening, settleTies } from './stall-step';

const FRESH = (f: FruitId) => FRUIT[f].ripe.length - 1;
const OKAY = (f: FruitId) => FRUIT[f].ripe.indexOf('okay');
const SOFT = 0;
const GREEN_TOP = FRUIT.mango.ripe.length + FRUIT.mango.unripeSlots - 1;
const ev = (id: string) => EVENT_CARDS.find((e) => e.id === id)!;
const shelf = (f: FruitId, at: Record<number, number>) => { const t = emptyStock(true)[f]; for (const [i, n] of Object.entries(at)) t[Number(i)] = n; return t; };

/** People at every seat, no perks (an avatar that is not a character) unless `avatars` names some. */
const humans = (n: number, extra: Partial<GameConfig> = {}, avatars: string[] = []): GameConfig => ({
  players: Array.from({ length: n }, (_, i) => ({ name: `P${i}`, kind: 'human' as const, avatar: avatars[i] ?? '' })),
  days: 10, unripe: true, upgrades: true, events: false, seed: 3, ...extra,
});
const ais = (n: number, seed: number, level: 'easy' | 'normal' | 'hard' = 'normal', extra: Partial<GameConfig> = {}): GameConfig => ({
  players: Array.from({ length: n }, (_, i) => ({ name: `A${i}`, kind: 'ai' as const, level, avatar: '' })),
  days: 10, unripe: true, upgrades: true, events: true, seed, ...extra,
});
const avatarOf = (trait: string) => RIVALS.find((r) => TRAITS[engine.newGame(humans(2, {}, [r.avatar])).players[0].trait!].id === trait)!.avatar;

/** A fresh game with every perk, card and piece of fruit taken away, so a test sets only what it needs. */
function bare(n: number, extra: Partial<GameConfig> = {}): GameState {
  const s = structuredClone(newGame(humans(n, extra)));
  s.players.forEach((p) => { p.stock = emptyStock(true); p.trait = null; p.traitOffer = []; p.favours = []; p.upgrades = []; });
  return s;
}

/** The evening of `day` with nothing left to decide by default: night falls when the first stall closes. */
function evening(s: GameState, day: number): GameState {
  const g = structuredClone(s);
  g.day = day; g.phase = 'evening'; g.turn = 0; g.order = g.players.map((_, i) => i); g.event = null; g.results = null;
  return g;
}

const buyer = (id: number, f: FruitId, qty: number, max: number, pref: Customer['pref'] = 'everyday', more: Partial<Customer> = {}): Customer =>
  ({ id, name: `C${id}`, pref, wants: [{ fruit: f, qty, max }], original: [{ fruit: f, qty, max }], ...more });

/** `n` stalls at the stocking step of day `day` with this crowd, empty shelves, no perks, buying order 0, 1, 2... */
function stocking(n: number, crowd: Customer[], day = 2, extra: Partial<GameConfig> = {}): GameState {
  let s = endBuying(beginBuying(bare(n, extra)));
  s = structuredClone(s);
  s.day = day; s.event = null; s.standing = null;
  s.firstMarket = crowd; s.secondMarket = [];
  s.order = s.players.map((_, i) => i);
  return s;
}

/** Opens every stall with its whole ripe shelf (or `out[p]`) and posts `prices[p]` for every fruit it put out. */
function bell(s: GameState, prices: number[], out: (Partial<Record<FruitId, number>> | undefined)[] = []): GameState {
  let g = s;
  g.players.forEach((pl, p) => {
    const all = Object.fromEntries(FRUITS.map((f) => [f, pl.stock[f].slice(0, FRUIT[f].ripe.length).reduce((a, b) => a + b, 0)]).filter(([, k]) => (k as number) > 0));
    if (g.stalls[p] === null) g = openStall(g, p, out[p] ?? all);
  });
  g.players.forEach((_, p) => {
    if (g.phase === 'bid' && g.bids[p] === null) g = submitPrices(g, p, FRUITS.filter((f) => (g.stalls[p]?.[f] ?? 0) > 0).map((f) => ({ fruit: f, price: prices[p] })));
  });
  return g;
}

/** The morning of the first Market Day (day 3) in the bidding step: empty shelves, no perks, `cash` each. */
function marketDay(n: number, cash = 30): GameState {
  const s = bare(n);
  s.players.forEach((p) => { p.cash = cash; });
  const g = passEvening(evening(s, 2));
  expect(g.day).toBe(3);
  const b = beginBuying(g);
  expect(b.phase).toBe('order');
  return b;
}

/** The stocking step of the order's due day, each stall holding `stock[p]` of the order's fruit. */
function dueDay(g: GameState, stock: Record<number, number[]>): GameState {
  const s = structuredClone(g);
  const o = s.standing!;
  s.day = o.due; s.phase = 'buy'; s.turn = 0; s.event = null; s.forecast = null; s.queue = []; s.nextForecast = null; s.nextQueue = [];
  for (const [p, t] of Object.entries(stock)) s.players[Number(p)].stock[o.fruit] = [...t];
  return endBuying(s);
}

// ---------------------------------------------------------------------------------------------------------------------

describe('J. versions', () => {
  it('rules version 18, computer players version 6', () => {
    expect(RULES_VERSION).toBe(18);
    expect(AI_VERSION).toBe(6);
  });
});

describe('A. out of cash: the top-up', () => {
  it('at dawn a stall with an empty shelf and less than $5 is topped up to $5; it is recorded and logged', () => {
    const s = bare(4);
    [0, 2, 5, 0].forEach((c, i) => { s.players[i].cash = c; });
    s.players[1].stock.mango[GREEN_TOP] = 1; // a green piece is still a piece: no top-up
    s.players[3].stock.blueberry[SOFT] = 1; // spoils tonight, so the shelf is empty at dawn
    const g = passEvening(evening(s, 1));
    expect(g.day).toBe(2);
    expect(TOP_UP).toBe(5);
    expect(g.players.map((p) => p.cash)).toEqual([5, 2, 5, 5]);
    expect(g.dayTopUps).toEqual([5, 0, 0, 5]);
    expect(g.log.filter((l) => l.includes('topped up to $5'))).toHaveLength(2);
    // It is public: every seat is sent it.
    expect(redact(g, 1).dayTopUps).toEqual([5, 0, 0, 5]);
    // Cleared the next morning when nobody needs it.
    const next = passEvening(evening(g, 2));
    expect(next.dayTopUps).toEqual([0, 0, 0, 0]);
  });

  it('never on day 1, and only below $5', () => {
    const s = structuredClone(newGame(humans(2)));
    expect(s.dayTopUps).toEqual([0, 0]);
    const t = bare(2);
    t.players[0].cash = 4; t.players[1].cash = 5;
    expect(passEvening(evening(t, 4)).dayTopUps).toEqual([1, 0]);
  });

  it('comes after the event and any Health Inspector charge, and before the buying order, the bidding and the buying', () => {
    const s = bare(3);
    s.players[0].cash = 0; // empty shelf: topped up to $5
    s.players[1].cash = 6; s.players[1].stock.apple[1] = 2; // two Okay apples, Soft at dawn: the inspector takes $4
    s.players[2].cash = 20; s.players[2].stock.apple[FRESH('apple')] = 1;
    const e = evening(s, 4);
    e.config = { ...e.config, events: true };
    e.eventDeck = [EVENT_CARDS.findIndex((x) => x.id === 'inspector')];
    const g = passEvening(e);
    expect(g.event?.id).toBe('inspector');
    expect(g.dayFines).toEqual([0, 4, 0]);
    expect(g.dayTopUps).toEqual([5, 0, 0]);
    expect(g.players.map((p) => p.cash)).toEqual([5, 2, 20]);
    // The poorest stall buys first, counted after the top-up: the fined stall ($2), not the topped-up one ($5).
    expect(g.order[0]).toBe(1);
    expect(g.dayStartCash).toEqual([5, 2, 20]);
  });

  it('the morning card says who was topped up', () => {
    const s = bare(2);
    s.players[0].cash = 1;
    const g = passEvening(evening(s, 1));
    expect(topUpLine(publicView(g, 0), 0)).toBe('Your shelf was empty, so the market topped you up to $5 (+$4)');
    expect(topUpLine(publicView(g, 1), 1)).toBe('P0 had an empty shelf and was topped up to $5 (+$4)');
    // Nothing is said on a morning without a top-up.
    expect(topUpLine(newGame(humans(2)), 0)).toBeNull();
  });

  it('whole computer games never leave a stall with an empty shelf and under $5 at the start of buying', () => {
    for (const n of [3, 6]) for (let seed = 1; seed <= 6; seed++) {
      let s = newGame(ais(n, seed));
      while (s.phase !== 'over') {
        if (s.phase === 'morning' && s.day > 1) for (const pl of s.players) {
          const empty = FRUITS.every((f) => pl.stock[f].every((c) => c === 0));
          if (empty) expect(pl.cash, `${n} stalls, seed ${seed}, day ${s.day}`).toBeGreaterThanOrEqual(TOP_UP);
        }
        s = autoplay(s, 1);
      }
    }
  });
});

describe('B. standing orders: a stake instead of fines, and rivals are not involved', () => {
  it('the stake is the number on the card, halved (rounded down) with an Order Book', () => {
    expect(FRUITS.map((f) => ORDER_CARDS.find((c) => c.fruit === f)!.stake)).toEqual([6, 8, 7, 12]);
    expect(ORDER_CARDS.map((c) => stakeFor(c.stake, true))).toEqual([3, 3, 4, 4, 3, 3, 6, 6]);
    expect('orderRivalPay' in engine).toBe(false);
  });

  it('a stall may only bid with the stake in cash; passing is always allowed', () => {
    const s = marketDay(3, 30);
    const stake = s.standing!.stake;
    s.players[0].cash = stake - 1;
    s.players[1].cash = stake;
    expect(orderStake(s, 0)).toBe(stake);
    expect(canBidOrder(s, 0, 5)).toBe(`You need $${stake} in cash to put down the stake`);
    expect(() => bidOrder(s, 0, 5)).toThrow(/stake/);
    expect(canBidOrder(s, 0, null)).toBeNull();
    expect(canBidOrder(s, 1, 5)).toBeNull();
    // An Order Book halves what is needed.
    s.players[0].upgrades = ['orderbook'];
    expect(orderStake(s, 0)).toBe(Math.floor(stake / 2));
    expect(canBidOrder(s, 0, 5)).toBeNull();
    // The computer follows the same rule.
    const ai = structuredClone(s);
    ai.players[2].kind = 'ai'; ai.players[2].level = 'hard'; ai.players[2].cash = stake - 1;
    expect(planOrderBid(ai, 2)).toBeNull();
  });

  it('bidding is as in rules 17, and the winner pays the stake the moment it wins', () => {
    let s = marketDay(3, 30);
    const stake = s.standing!.stake;
    s = bidOrder(s, 0, 8);
    s = bidOrder(s, 0, 6); // may change its mind while another stall is still deciding
    expect(publicView(s, 1).standing!.bids).toEqual(['in', null, null]); // who is bidding is public, the price is not
    s = bidOrder(s, 1, 6);
    expect(s.players.map((p) => p.cash)).toEqual([30, 30, 30]); // nothing is paid while bids are open
    s = bidOrder(s, 2, null);
    expect(s.phase).toBe('buy');
    // A tie at $6: no Order Book, so the stall earlier in today's buying order wins.
    const winner = s.order.indexOf(0) < s.order.indexOf(1) ? 0 : 1;
    expect(s.standing).toMatchObject({ holder: winner, price: 6, staked: stake });
    expect(s.players[winner].cash).toBe(30 - stake);
    expect(s.players[1 - winner].cash).toBe(30);
    expect(s.log[s.log.length - 1]).toContain(`put down a $${stake} stake`);
    // The stake on the card is public.
    expect(redact(s, 2).standing).toMatchObject({ holder: winner, staked: stake });
  });

  it('an order nobody bids on is discarded; an Order Book wins a tied bid', () => {
    let none = marketDay(3);
    for (const p of [0, 1, 2]) none = bidOrder(none, p, null);
    expect(none.standing).toBeNull();
    let s = marketDay(3);
    const last = s.order[2];
    s.players[last].upgrades = ['orderbook'];
    for (const p of [0, 1, 2]) s = bidOrder(s, p, 6);
    expect(s.standing!.holder).toBe(last);
    expect(s.standing!.staked).toBe(Math.floor(s.standing!.stake / 2));
  });

  /** Stall 0 wins a 3-piece order at $5; on the due day it holds `mine` and stall 1 holds `rival` of the fruit. */
  function collect(mine: number[], rival: number[], setup: (s: GameState) => void = () => {}) {
    let s = marketDay(2, 30);
    setup(s);
    s = bidOrder(bidOrder(s, 0, 5), 1, null);
    const o = structuredClone(s.standing!);
    const f = o.fruit;
    s = dueDay(s, { 0: mine, 1: rival });
    s.firstMarket = s.firstMarket.filter((c) => c.order); // only the order: no other customer today
    const before = s.players.map((p) => p.cash);
    const total = (t: number[]) => t.slice(0, FRUIT[f].ripe.length).reduce((a, b) => a + b, 0);
    s = openStall(s, 0, total(mine) ? { [f]: total(mine) } : {});
    s = openStall(s, 1, total(rival) ? { [f]: total(rival) } : {});
    const row = [rowCount(s, 0, f), rowCount(s, 1, f)];
    for (const p of [0, 1]) if (s.phase === 'bid' && s.bids[p] === null) s = submitPrices(s, p, [{ fruit: f, price: 1 }]);
    expect(s.phase).toBe('reveal');
    return { s, o, f, row, gain: s.players.map((p, i) => p.cash - before[i]), res: s.results!.order! };
  }

  it('the order is served first from the holder\'s crate only, freshest first; a full delivery brings the stake back at once', () => {
    const f = ORDER_CARDS[structuredClone(marketDay(2)).standing!.card].fruit;
    // The holder has 2 Fresh, 1 Okay and 1 Soft piece; the rival has 3 Fresh ones.
    const { s, o, row, gain, res } = collect(shelf(f, { [FRESH(f)]: 2, [OKAY(f)]: 1, [SOFT]: 1 }), shelf(f, { [FRESH(f)]: 3 }));
    expect(o.qty).toBe(3);
    expect(row).toEqual([1, 3]); // the order takes the holder's 3 Fresh or Okay pieces; the rival's crate is untouched
    expect(res).toMatchObject({ holder: 0, price: 5, qty: 3, short: 0, stake: o.stake, back: o.stake });
    expect(res.sales).toEqual([{ player: 0, n: 3, price: 5 }]);
    expect(gain[0]).toBe(3 * 5 + o.stake);
    expect(gain[1]).toBe(0); // rivals are paid nothing
    expect(s.players[1].stock[f][FRESH(f)]).toBe(3); // and their fruit is never taken
    expect(s.players[0].stock[f][SOFT]).toBe(1); // a Soft piece is never taken either
    expect(s.results!.favours).toEqual([]); // no favour card
    expect(s.log[s.log.length - 1]).toContain(`got its $${o.stake} stake back`);
    // The line shows what was paid, not a rival's offer.
    expect(s.results!.lines[0].offers.map((x) => x.player)).toEqual([0]);
  });

  it('anything less than a full delivery loses the stake; there is no other fine and the unfilled part simply leaves', () => {
    const f = ORDER_CARDS[structuredClone(marketDay(2)).standing!.card].fruit;
    const short = collect(shelf(f, { [FRESH(f)]: 2 }), shelf(f, { [FRESH(f)]: 3 }));
    expect(short.res).toMatchObject({ short: 1, stake: short.o.stake, back: 0 });
    expect(short.gain).toEqual([2 * 5, 0]); // paid for two pieces, no fine, the stake stays lost
    expect(short.s.players[1].stock[f][FRESH(f)]).toBe(3);
    expect(short.s.log[short.s.log.length - 1]).toContain(`lost its $${short.o.stake} stake`);
    // A holder with nothing loses the stake and no more, even with no cash at all.
    const none = collect(shelf(f, {}), shelf(f, { [FRESH(f)]: 3 }), (g) => { g.players[0].cash = g.standing!.stake; });
    expect(none.res).toMatchObject({ short: 3, back: 0, sales: [] });
    expect(none.gain).toEqual([0, 0]);
    expect(none.s.players[0].cash).toBe(0);
    // The order is gone afterwards (the next Market Day's order may already be out).
    expect(finishReveal(none.s).standing?.due ?? 99).toBeGreaterThan(none.o.due);
  });

  it('an Order Book halves the stake and pays $2 more for each piece delivered', () => {
    const f = ORDER_CARDS[structuredClone(marketDay(2)).standing!.card].fruit;
    const { o, gain, res } = collect(shelf(f, { [FRESH(f)]: 3 }), shelf(f, {}), (g) => { g.players[0].upgrades = ['orderbook']; });
    expect(ORDER_BOOK_BONUS).toBe(2);
    expect(o.staked).toBe(Math.floor(o.stake / 2));
    expect(res.sales).toEqual([{ player: 0, n: 3, price: 5 + 2 }]);
    expect(gain[0]).toBe(3 * 7 + Math.floor(o.stake / 2));
  });

  it('pays no tips and no Juice Bar dollar, and no event or Closing Day changes what it pays', () => {
    const f = ORDER_CARDS[structuredClone(marketDay(2)).standing!.card].fruit;
    // Kiki (Tip Jar) with a Juice Bar delivers three Okay pieces on a Festival (customers pay $1 more).
    const { gain, s } = collect(shelf(f, { [OKAY(f)]: 3 }), shelf(f, {}), (g) => { g.players[0].trait = 'favourite'; g.players[0].upgrades = ['juicebar']; });
    expect(gain[0]).toBe(3 * 5 + s.results!.order!.stake);
    expect(s.results!.tipJar ?? []).toEqual([]);
    expect(s.results!.lines[0].offers[0].juice).toBeUndefined();
    expect(s.results!.lines[0].max).toBe(5);
  });

  it('the bidding panel and the strip speak of the stake, not of fines or rivals', () => {
    const s = marketDay(3, 30);
    const stake = s.standing!.stake;
    const panel = toStaticHtml(h(OrderRules, { s: publicView(s, 0), p: 0 }));
    expect(panel).toContain(`The winner puts down a stake of <b>$${stake}</b> now`);
    expect(panel).toContain('Rivals are not involved');
    expect(panel).not.toMatch(/fined|\$1 under/);
    expect(stakeHint(publicView(s, 0), 0)).toBeNull();
    // Without the stake in cash a stall can only pass.
    const poor = structuredClone(s);
    poor.players[0].cash = stake - 1;
    expect(stakeHint(publicView(poor, 0), 0)).toBe(`You need $${stake} in cash for the stake, so you can only pass.`);
    // With an Order Book the panel shows the halved stake and the extra pay.
    const book = structuredClone(s);
    book.players[0].upgrades = ['orderbook'];
    const bh = toStaticHtml(h(OrderRules, { s: publicView(book, 0), p: 0 }));
    expect(bh).toContain(`a stake of <b>$${Math.floor(stake / 2)}</b> now (halved by your Order Book)`);
    expect(bh).toContain('plus $2 a piece with your Order Book');
    let won = bidOrder(s, 0, 6);
    for (const p of [1, 2]) won = bidOrder(won, p, null);
    expect(toStaticHtml(h(OrderStrip, { s: publicView(won, 1), viewer: 1 }))).toContain(`stake $${stake} held`);
    expect(toStaticHtml(h(OrderStrip, { s: publicView(s, 1), viewer: 1 }))).toContain(`stake $${stake}`);
  });

  it('the holder\'s sales summary says what became of the stake', () => {
    const f = ORDER_CARDS[structuredClone(marketDay(2)).standing!.card].fruit;
    const full = collect(shelf(f, { [FRESH(f)]: 3 }), shelf(f, {}));
    expect(extras(full.s.results!, 0).join(' ')).toContain(`you delivered all 3 and got your $${full.o.stake} stake back`);
    expect(extras(full.s.results!, 1).join(' ')).not.toContain('Standing order');
    const short = collect(shelf(f, { [FRESH(f)]: 1 }), shelf(f, {}));
    expect(extras(short.s.results!, 0).join(' ')).toContain(`you delivered 1 of 3 and lost your $${short.o.stake} stake`);
  });

  it('computer stalls bid, buy for the order and mostly deliver it in full, at every table size', () => {
    let orders = 0, full = 0, held = 0, turned = 0;
    for (const n of [2, 3, 4, 6]) for (let seed = 1; seed <= 8; seed++) {
      let s = newGame(ais(n, seed));
      for (let i = 0; i < 8000 && s.phase !== 'over'; i++) {
        const before = s;
        s = autoplay(s, 1);
        if (before.phase === 'order' && s.phase !== 'order') {
          turned++;
          if (s.standing?.holder !== null && s.standing?.holder !== undefined) {
            held++;
            // The holder paid the stake it could afford, and no stall bid without the cash for it.
            expect(s.standing.staked).toBe(stakeFor(s.standing.stake, s.players[s.standing.holder].upgrades.includes('orderbook')));
          }
        }
        if (before.phase !== 'reveal' && s.phase === 'reveal' && s.results!.order) {
          orders++;
          const o = s.results!.order;
          expect(o.sales.every((x) => x.player === o.holder)).toBe(true);
          expect(o.back).toBe(o.short === 0 ? o.stake : 0);
          if (o.short === 0) full++;
        }
      }
      expect(s.phase, `${n} stalls, seed ${seed}`).toBe('over');
    }
    expect(turned).toBeGreaterThan(40);
    expect(held / turned).toBeGreaterThan(0.6);
    expect(full / orders).toBeGreaterThan(0.6);
  }, 120_000);
});

describe('C. shopkeepers', () => {
  it('Tip Jar: $1 from a customer who leaves with their whole order if she sold them any of it, $2 if she served them alone', () => {
    expect(TRAITS.favourite.text).toBe('A customer who leaves with their whole order tips you $1 if you sold them any of it, $2 if you served them alone.');
    expect([SHARED_TIP, LOCAL_FAVOURITE_TIP]).toEqual([1, 2]);
    const run = (kiki: number, rival: number, want: number) => {
      const s = stocking(2, [buyer(1, 'apple', want, 8)]);
      s.players[0].trait = 'favourite';
      s.players[0].stock.apple[FRESH('apple')] = kiki;
      s.players[1].stock.apple[FRESH('apple')] = rival;
      const g = bell(s, [5, 6]);
      return { income: g.results!.income[0], tips: g.results!.tipJar ?? [] };
    };
    // Served alone and in full: $2, not $3.
    expect(run(3, 0, 3)).toEqual({ income: 3 * 5 + 2, tips: [{ player: 0, customer: 'C1', tip: 2 }] });
    // The whole order filled by two stalls: $1.
    expect(run(2, 1, 3)).toEqual({ income: 2 * 5 + 1, tips: [{ player: 0, customer: 'C1', tip: 1 }] });
    // The order is not filled: nothing, even though she was the only seller.
    expect(run(2, 0, 3)).toEqual({ income: 2 * 5, tips: [] });
    // A rival filled it all: nothing.
    const s = stocking(2, [buyer(1, 'apple', 2, 8)]);
    s.players[0].trait = 'favourite';
    s.players[0].stock.apple[FRESH('apple')] = 2;
    s.players[1].stock.apple[FRESH('apple')] = 2;
    expect(bell(s, [7, 5]).results!.tipJar ?? []).toEqual([]);
  });

  it('Nest Egg starts with $15', () => {
    expect(START_CASH + NEST_EGG_BONUS).toBe(15);
    const s = newGame(humans(2, {}, [avatarOf('nestegg')]));
    expect(s.players.map((p) => p.cash)).toEqual([15, 10]);
    expect(TRAITS.nestegg.text).toBe('Start with $15 instead of $10, and buy first on day 3.');
  });

  it('Sharp Ears: the tip is $2 at 3 to 6 stalls and $1 at 2, at most once a day', () => {
    expect([2, 3, 4, 5, 6].map(sharpEarsTip)).toEqual([1, 2, 2, 2, 2]);
    for (const n of [2, 3]) {
      const crowd = [buyer(1, 'apple', 1, 9, 'everyday', { walkIn: true, seenBy: [0] }), buyer(2, 'apple', 1, 9, 'everyday', { walkIn: true, seenBy: [0] }), buyer(3, 'apple', 1, 9)];
      const s = stocking(n, crowd);
      s.players[0].trait = 'earful';
      s.players[0].stock.apple[FRESH('apple')] = 3;
      const g = bell(s, [5]);
      expect(g.results!.earful).toEqual([{ player: 0, customer: 'C1', tip: sharpEarsTip(n) }]); // both peeked walk-ins bought, one tip
      expect(g.results!.income[0]).toBe(3 * 5 + sharpEarsTip(n));
    }
  });

  it('Sharp Ears peeks in the evening: at its start when one is held, or just before the night when none is', () => {
    const farah = avatarOf('earful');
    const seen = (g: GameState) => g.queue.filter((c) => c.seenBy?.includes(0)).length;
    // Day 1: no stall has anything to decide in the evening, so she peeks just before the night.
    let s = endBuying(beginBuying(newGame(humans(3, {}, [farah]))));
    expect(seen(s)).toBe(0); // not when buying ends (rules 17 peeked here)
    for (const p of [0, 1, 2]) s = openStall(s, p, {});
    expect(s.phase).toBe('reveal');
    expect(seen(s)).toBe(0);
    const morning = finishReveal(s);
    expect(morning.day).toBe(2);
    expect(seen(morning)).toBe(1);
    // An evening that is held (an upgrade on offer after a Market Day): she has peeked by the time it starts.
    const held = structuredClone(s);
    held.day = 3;
    held.players.forEach((p) => { p.cash = 30; });
    const e = finishReveal(held);
    expect(e.phase).toBe('evening');
    expect(seen(e)).toBe(1);
  });

  it('a Normal computer no longer prices as if it held the Haggler\'s tie-break', () => {
    const s = stocking(2, [buyer(1, 'apple', 3, 8, 'bargain')]);
    s.players.forEach((p) => { p.stock.apple[FRESH('apple')] = 3; });
    s.players[1].trait = 'haggler';
    let g = openStall(openStall(s, 0, { apple: 3 }), 1, { apple: 3 });
    const rosa = seller(g, 1, 'apple', 6, 3), rival = seller(g, 0, 'apple', 6, 3);
    expect(simulateSales(g, 'apple', rosa, [rival])).toBe(3); // the real tie order: the Haggler takes the order
    expect(simulateSales(g, 'apple', rosa, [rival], true)).toBe(0); // how a Normal computer now plans
    g = structuredClone(g);
    g.players[1].kind = 'ai'; g.players[1].level = 'normal';
    const withPerk = planPrices(g, 1).posts;
    g.players[1].trait = null;
    expect(planPrices(g, 1).posts).toEqual(withPerk);
  });
});

describe('D. upgrades', () => {
  it('cost $6, $6, $5, $4 and $3, with the new card texts', () => {
    expect([UPGRADES.juicebar.cost, UPGRADES.barrow.cost, UPGRADES.premium.cost, UPGRADES.ripening.cost, UPGRADES.orderbook.cost]).toEqual([6, 6, 5, 4, 3]);
    expect(UPGRADES.ripening.text).toBe('Your green mangoes ripen in one night instead of two.');
    expect(UPGRADES.orderbook.text).toBe('You win tied bids for standing orders, your stake is halved, and an order pays you $2 more for each piece you deliver.');
    expect(UPGRADES.juicebar.text).toContain('for each okay or soft fruit a customer buys from you');
    expect(UPGRADES.premium.text).toContain('A guest never pays more than its fixed price.');
  });

  it('Ripening Room: no discount on green mangoes (DEC-101); it still ripens them in one night', () => {
    const s = beginBuying(bare(2));
    const p = s.order[0];
    expect(buyCost(s, p, 'mango', GREEN_TOP)).toBe(4);
    s.players[p].upgrades = ['ripening'];
    expect(buyCost(s, p, 'mango', GREEN_TOP)).toBe(4);
    expect(buyCost(s, p, 'mango', FRESH('mango'))).toBe(6);
    expect(buyCost(s, p, 'apple', FRESH('apple'))).toBe(3);
    // A Bargain Hunter's first piece is still $1 off, and Durian Season still takes $1 off: $4 - 1 - 1 = $2.
    s.players[p].trait = 'bargain';
    expect(buyCost(s, p, 'mango', GREEN_TOP)).toBe(3);
    s.event = ev('durian');
    expect(buyCost(s, p, 'mango', GREEN_TOP)).toBe(2);
    s.players[p].boughtToday = 1;
    expect(buyCost(s, p, 'mango', GREEN_TOP)).toBe(3);
    // It still ripens in one night: the piece goes one night from ripe.
    s.event = null;
    s.market.mango[GREEN_TOP] = 1;
    s.players[p].cash = 10;
    const g = buy(s, p, 'mango', GREEN_TOP);
    expect(g.players[p].stock.mango[FRUIT.mango.ripe.length]).toBe(1);
    expect(g.players[p].cash).toBe(10 - 4); // its second piece today: full price, with no dollar off from the Ripening Room or the Bargain Hunter
  });

  it('the computer builds what is worth building: nothing near the end, and the Order Book when it holds an order', () => {
    for (const level of ['normal', 'hard'] as const) {
      const s = evening(bare(3), 3);
      s.config = { ...s.config, days: 10 };
      s.players.forEach((p) => { p.kind = 'ai'; p.level = level; p.cash = 40; p.upgradeOffer = ['juicebar', 'barrow', 'premium', 'ripening', 'orderbook']; });
      const pick = pickUpgrade(s, 0);
      expect(pick).not.toBeNull();
      expect(upgradeWorth(s, 0, pick!)).toBeGreaterThan(-1.5); // never one that loses it money (the lean is at most $1)
      // An order it holds and has yet to deliver makes the Order Book worth more: $2 a piece.
      const holder = structuredClone(s);
      holder.standing = { card: 0, fruit: 'blueberry', qty: 3, ceiling: 9, stake: 6, due: 5, bids: [6, 'pass', 'pass'], holder: 0, price: 6, staked: 6 };
      expect(upgradeWorth(holder, 0, 'orderbook')).toBeGreaterThan(upgradeWorth(s, 0, 'orderbook') + 4);
      expect(upgradeWorth(holder, 1, 'orderbook')).toBe(upgradeWorth(s, 1, 'orderbook'));
      // The last upgrade evening of a 10-day game (day 9): one day is left, nothing pays back.
      const late = evening(s, 9);
      late.players.forEach((p) => { p.upgradeOffer = ['juicebar', 'barrow', 'premium', 'ripening', 'orderbook']; });
      expect(pickUpgrade(late, 0)).toBeNull();
      // It keeps $6 to buy fruit with.
      const poor = structuredClone(s);
      poor.players[0].cash = 8;
      expect(pickUpgrade(poor, 0)).toBeNull();
    }
  });
});

describe('E. fruit and decks', () => {
  it('a green mango costs $4 at the market', () => {
    expect(FRUIT.mango.cost).toEqual({ fresh: 6, okay: 3, notso: 1, unripe: 4 });
    expect(FRUIT.mango.theme).toContain('green for $4');
    const s = beginBuying(bare(2));
    expect(marketCost(s, 'mango', GREEN_TOP)).toBe(4);
  });

  it('the three Bargain blueberry customers pay $4', () => {
    for (const name of ['Mei Ling', 'Kumar', 'Hafiz']) {
      expect(CUSTOMER_CARDS.find((c) => c.name === name)!.wants.find((w) => w.fruit === 'blueberry')!.max, name).toBe(4);
    }
    expect(CUSTOMER_CARDS.flatMap((c) => c.wants).filter((w) => w.fruit === 'blueberry' && w.max < 4)).toEqual([]);
  });

  it('Short Load carries 2/2/1/1 at 3 stalls and Summer Run\'s apple is 1/1/1/2/2', () => {
    const row = (name: string, n: number) => FRUITS.map((f) => printedSupply(FARMER_CARDS.find((c) => c.name === name)!, f, n)).join('/');
    expect(row('Short Load', 3)).toBe('2/2/1/1');
    expect(row('Short Load', 2)).toBe('2/1/1/1');
    expect([2, 3, 4, 5, 6].map((n) => printedSupply(FARMER_CARDS.find((c) => c.name === 'Summer Run')!, 'apple', n))).toEqual([1, 1, 1, 2, 2]);
  });

  it('Mango Windfall: the extra mangoes arrive Fresh, as the card says; the lorry\'s own mangoes stay green', () => {
    for (const [n, extra] of [[2, 1], [3, 2], [5, 3]] as const) {
      const s = evening(bare(n), 3);
      s.config = { ...s.config, events: true };
      s.market = emptyStock(true);
      s.nextFarmer = FARMER_CARDS.find((c) => c.name === 'Mixed Basket')!;
      s.eventDeck = [EVENT_CARDS.findIndex((e) => e.id === 'mangoWindfall')];
      const g = passEvening(s);
      const own = printedSupply(s.nextFarmer, 'mango', n);
      expect(g.event?.id).toBe('mangoWindfall');
      expect(g.delivery.mango).toBe(own + extra);
      expect(g.market.mango[FRESH('mango')]).toBe(extra);
      expect(g.market.mango[GREEN_TOP]).toBe(own);
      expect(g.deliveryRipe).toEqual({ mango: extra });
      expect(marketCost(g, 'mango', FRESH('mango'))).toBe(6);
      // The morning card says so.
      expect(ripeLine(g)).toBe(`${extra} of the mangoes arrived ripe.`);
    }
    // Any other day delivers no ripe mango.
    expect(beginBuying(bare(3)).deliveryRipe).toBeUndefined();
    expect(ripeLine(beginBuying(bare(3)))).toBeNull();
  });
});

describe('F. days 1 and 2: no mango customers', () => {
  const wantsMango = (c: Customer | null) => !!c && c.wants.some((w) => w.fruit === 'mango');

  it('the rows for day 1 and day 2 hold no card that wants a mango; day 3 may', () => {
    expect(NO_MANGO_DAYS).toBe(2);
    let day3 = 0;
    for (const n of [2, 3, 4, 5, 6]) for (let seed = 1; seed <= 25; seed++) {
      const s = newGame(humans(n, { seed, events: true }));
      // Day 1's row and (drawn on day 1's morning) day 2's row.
      for (const c of [s.forecast, ...s.queue, s.nextForecast, ...s.nextQueue]) expect(wantsMango(c), `${n} stalls, seed ${seed}`).toBe(false);
      // No card is lost: the ones passed over went to the bottom of the deck.
      const out = [s.forecast, ...s.queue, s.nextForecast, ...s.nextQueue].filter(Boolean).length;
      expect(s.customerDeck.length + out).toBe(CUSTOMER_CARDS.length);
      expect(new Set(s.customerDeck).size).toBe(s.customerDeck.length);
      // Day 3's row is drawn on day 2's morning, with no such rule.
      let g = endBuying(beginBuying(s));
      for (let p = 0; p < n; p++) g = openStall(g, p, {});
      g = passEvening(finishReveal(g));
      expect(g.day).toBe(2);
      for (const c of [g.forecast, ...g.queue]) expect(wantsMango(c), `${n} stalls, seed ${seed}, day 2`).toBe(false);
      if ([g.nextForecast, ...g.nextQueue].some(wantsMango)) day3++;
    }
    expect(day3).toBeGreaterThan(60); // most day 3 rows do have a mango customer (15 of 36 cards want one)
  });

  it('walk-ins an event adds on day 2 want no mango either', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = evening(newGame(humans(3, { seed, events: true })), 1);
      s.eventDeck = [EVENT_CARDS.findIndex((e) => e.id === 'touristBus')];
      const g = passEvening(s);
      expect(g.event?.id).toBe('touristBus');
      expect(g.queue).toHaveLength(4);
      expect(g.queue.some(wantsMango)).toBe(false);
    }
  });

  it('Mango Craze cannot be day 2\'s event: it goes under the deck and another is turned over', () => {
    const craze = EVENT_CARDS.findIndex((e) => e.id === 'mangoCraze'), festival = EVENT_CARDS.findIndex((e) => e.id === 'festival');
    const s = evening(newGame(humans(3, { events: true })), 1);
    s.eventDeck = [craze, festival, 5];
    const g = passEvening(s);
    expect(g.day).toBe(2);
    expect(g.event?.id).toBe('festival');
    expect(g.eventDeck).toEqual([5, craze]);
    // From day 3 it is an ordinary event again.
    const later = evening(newGame(humans(3, { events: true })), 2);
    later.eventDeck = [craze, festival];
    expect(passEvening(later).event?.id).toBe('mangoCraze');
    // Whole seeded games: never on day 2.
    for (let seed = 1; seed <= 40; seed++) {
      let t = newGame(ais(3, seed));
      while (t.day < 2) t = autoplay(t, 1);
      expect(t.event?.id, `seed ${seed}`).not.toBe('mangoCraze');
    }
  });

  it('with unripe fruit switched off mangoes arrive ripe, so the rule does not apply', () => {
    let any = false;
    for (let seed = 1; seed <= 20 && !any; seed++) {
      const s = newGame(humans(4, { seed, unripe: false }));
      any = [s.forecast, ...s.queue, s.nextForecast, ...s.nextQueue].some(wantsMango);
    }
    expect(any).toBe(true);
  });
});

describe('G. today\'s purchases are public until the bell', () => {
  /** Day 2, buying: stall 0 has bought a Fresh apple and a green mango today and holds an older Okay blueberry. */
  function bought(): GameState {
    let s = beginBuying(bare(3));
    s = structuredClone(s);
    s.order = [0, 1, 2]; s.turn = 0; s.day = 2;
    s.market = emptyStock(true);
    s.market.apple[FRESH('apple')] = 3; s.market.mango[GREEN_TOP] = 3; s.market.blueberry[FRESH('blueberry')] = 3;
    s.players[0].stock.blueberry[OKAY('blueberry')] = 1; // bought on an earlier day
    s = buy(s, 0, 'apple', FRESH('apple'));
    s = buy(s, 0, 'mango', GREEN_TOP);
    return s;
  }

  it('what a stall takes from the market is recorded, by fruit and box, and cleared each morning', () => {
    const s = bought();
    expect(s.players[0].boughtFruit).toEqual({ apple: shelf('apple', { [FRESH('apple')]: 1 }), mango: shelf('mango', { [GREEN_TOP]: 1 }) });
    expect(boughtStock(s.players[0]).blueberry).toEqual([0, 0, 0]); // older stock is not among today's purchases
    expect(s.players[1].boughtFruit).toBeUndefined();
    // A Free Fruit card's piece is taken from the market in the open too.
    const t = structuredClone(s);
    t.players[0].favours = ['freeFruit'];
    const free = playFavour(t, 0, 0, { fruit: 'blueberry', pos: FRESH('blueberry') });
    expect(free.players[0].boughtFruit!.blueberry).toEqual(shelf('blueberry', { [FRESH('blueberry')]: 1 }));
    // A Ripening Room's green mango is noted where it sits on the shelf: one night from ripe.
    const r = structuredClone(s);
    r.players[1].upgrades = ['ripening']; r.turn = 1;
    expect(buy(r, 1, 'mango', GREEN_TOP).players[1].boughtFruit).toEqual({ mango: shelf('mango', { [FRUIT.mango.ripe.length]: 1 }) });
    // The next morning nothing is left of it.
    const next = passEvening(evening(s, 2));
    expect(next.day).toBe(3);
    expect(next.players.every((p) => p.boughtFruit === undefined)).toBe(true);
  });

  it('every seat sees it from the purchase until the bell, while the rest of the shelf stays secret', () => {
    let s = bought();
    const blank = (g: GameState, p: number) => FRUITS.every((f) => g.players[p].stock[f].every((c) => c === 0));
    for (const seat of [1, 2]) for (const view of [publicView(s, seat), redact(s, seat)]) {
      expect(view.players[0].boughtFruit).toEqual(s.players[0].boughtFruit);
      expect(blank(view, 0)).toBe(true); // the shelf itself (with the older blueberry) is never sent
      expect(JSON.stringify(view.players[0])).not.toContain('"blueberry":[0,1,0]');
    }
    // Through stocking and pricing it is still there; the crate stays shut.
    while (s.phase === 'buy') s = engine.endBuyTurn(s, activePlayer(s));
    expect(s.phase).toBe('stall');
    s = openStall(s, 0, { apple: 1, blueberry: 1 });
    expect(s.phase).toBe('bid'); // stalls 1 and 2 have no ripe fruit: they were never asked
    const v = redact(s, 1);
    expect(v.players[0].boughtFruit).toEqual(s.players[0].boughtFruit);
    expect(v.stalls[0]).toEqual({});
    expect(v.crates?.[0] ?? {}).toEqual({});
    expect(v.out![0]).toBe(2);
    expect(blank(v, 0)).toBe(true);
  });

  it('computer players: Easy uses none of it, Normal today\'s purchases only, Hard everything it saw bought', () => {
    const s = bought();
    const as = (level: 'easy' | 'normal' | 'hard') => { const g = structuredClone(s); g.players[1].kind = 'ai'; g.players[1].level = level; return g; };
    expect([recall(as('easy'), 1), recall(as('normal'), 1), recall(as('hard'), 1)]).toEqual([false, 'today', true]);
    // At the bell stall 0 has put out 2 pieces (its apple and its older blueberry); stall 1 guesses what they are.
    const atBell = (level: 'easy' | 'normal' | 'hard', crowd: Customer[]) => {
      let g = as(level);
      g.players[1].stock.watermelon[FRESH('watermelon')] = 1;
      while (g.phase === 'buy') g = engine.endBuyTurn(g, activePlayer(g));
      g = structuredClone(g);
      g.firstMarket = crowd; g.secondMarket = [];
      g = openStall(g, 0, { apple: 1, blueberry: 1 });
      g = openStall(g, 1, { watermelon: 1 });
      expect(g.phase).toBe('bid');
      return believe(g, 1).stalls[0];
    };
    // Customers want blueberries most, then apples.
    const berries = [buyer(1, 'blueberry', 3, 5), buyer(2, 'apple', 1, 6)];
    // Hard recalls the whole shelf: an apple and the older blueberry.
    expect(atBell('hard', berries)).toEqual({ apple: 1, blueberry: 1 });
    // Normal knows of the apple bought today; the other piece is older stock it can only guess (the most wanted fruit).
    expect(atBell('normal', berries)).toEqual({ apple: 1, blueberry: 1 });
    // Easy knows nothing: both pieces are guessed as the most wanted fruit.
    expect(atBell('easy', berries)).toEqual({ blueberry: 2 });
    // With only watermelons wanted the difference shows: Hard still knows the shelf, Normal knows the apple and guesses
    // a watermelon for the older piece, and Easy guesses two watermelons.
    const melons = [buyer(1, 'watermelon', 4, 7)];
    expect(atBell('hard', melons)).toEqual({ apple: 1, blueberry: 1 });
    expect(atBell('normal', melons)).toEqual({ apple: 1, watermelon: 1 });
    expect(atBell('easy', melons)).toEqual({ watermelon: 2 });
  });

  it('on screen: each rival\'s box shows fruit marks with counts from buying until the bell, and the pop-up lists them', () => {
    let s = bought();
    // What the rival's box and its pop-up draw (table.tsx RivalStall and RivalDrop), from this stall's own view.
    expect(boughtToday(publicView(s, 1), 0)).toEqual([{ f: 'mango', n: 1, green: 1 }, { f: 'apple', n: 1, green: 0 }]);
    expect(boughtWords(boughtToday(publicView(s, 1), 0))).toBe('1 mango (green), 1 apple');
    expect(boughtToday(redact(s, 2), 0)).toEqual(boughtToday(publicView(s, 1), 0)); // online, every phone gets the same
    // A rival that bought nothing shows nothing.
    expect(boughtToday(publicView(s, 0), 1)).toEqual([]);
    // After the bell the marks are gone (the crates are open by then).
    while (s.phase === 'buy') s = engine.endBuyTurn(s, activePlayer(s));
    s = openStall(s, 0, { apple: 1 });
    expect(boughtToday(publicView(s, 1), 0)).toHaveLength(2); // still pricing
    s = submitPrices(s, 0, [{ fruit: 'apple', price: 5 }]);
    expect(s.phase).toBe('reveal');
    expect(boughtToday(publicView(s, 1), 0)).toEqual([]);
  });

  it('whole computer games: a rival\'s shelf, crate before the bell, prices and bid amounts never reach another seat', () => {
    for (const n of [3, 5]) for (let seed = 1; seed <= 3; seed++) {
      let s = newGame(ais(n, seed));
      let checked = 0;
      while (s.phase !== 'over') {
        for (let seat = 0; seat < n; seat++) {
          const v = redact(s, seat);
          for (let r = 0; r < n; r++) {
            if (r === seat) continue;
            expect(FRUITS.every((f) => v.players[r].stock[f].every((c) => c === 0)), `shelf of ${r} to ${seat}, ${s.phase}`).toBe(true);
            if (s.phase === 'stall' || s.phase === 'bid') {
              expect(v.stalls[r] === null || Object.keys(v.stalls[r]!).length === 0).toBe(true);
              expect(v.crates?.[r] ?? null).toSatisfy((c: unknown) => c === null || Object.keys(c as object).length === 0);
            }
            if (s.phase === 'bid') expect(v.bids[r]).toBeNull();
            if (s.phase === 'order' && s.standing) expect(typeof v.standing!.bids[r]).not.toBe('number');
            // Today's purchases are the same for everyone.
            expect(v.players[r].boughtFruit).toEqual(s.players[r].boughtFruit);
          }
          checked++;
        }
        s = autoplay(s, 1);
      }
      expect(checked).toBeGreaterThan(100);
    }
  }, 120_000);
});

describe('H. rulings', () => {
  it('Juice Bar: +$1 for an Okay or Soft piece sold to a customer or a guest, not to the night hawker', () => {
    const s = stocking(2, [buyer(1, 'apple', 1, 8, 'bargain')]);
    s.event = ev('pasarMalam');
    s.players[0].upgrades = ['juicebar'];
    s.players[0].stock.apple[OKAY('apple')] = 2;
    const g = bell(s, [4]);
    expect(g.results!.lines[0].offers[0]).toMatchObject({ sold: 1, juice: 1 });
    expect(g.results!.hawker).toEqual([{ player: 0, fruit: 'apple', price: 3 }]);
    expect(g.results!.income[0]).toBe(4 + 1 + 3); // the customer's piece earns the Juice Bar dollar, the hawker's does not
    // A guest counts as a customer.
    const guest = stocking(2, [{ ...ev('superfood').extra!, id: 9, original: ev('superfood').extra!.wants.map((w) => ({ ...w })), pref: 'everyday' }]);
    guest.players[0].upgrades = ['juicebar'];
    guest.players[0].stock.blueberry[OKAY('blueberry')] = 2;
    expect(bell(guest, [7]).results!.income[0]).toBe(2 * 7 + 2);
  });

  it('Premium Display never raises a guest\'s fixed price', () => {
    const gym = (): Customer => ({ ...ev('superfood').extra!, id: 9, original: ev('superfood').extra!.wants.map((w) => ({ ...w })), pref: 'everyday' });
    const run = (price: number, crowd: Customer[]) => {
      const s = stocking(2, crowd);
      s.players[0].upgrades = ['premium'];
      s.players[0].stock.blueberry[FRESH('blueberry')] = 2;
      return bell(s, [price]).results!.lines[0].offers[0];
    };
    expect(run(9, [gym()])).toMatchObject({ sold: 0, tooOld: true }); // $9 is over the Gym Club's fixed $8
    expect(run(8, [gym()])).toMatchObject({ sold: 2 });
    // An ordinary customer still pays the display's extra dollar.
    expect(run(9, [buyer(1, 'blueberry', 2, 8)])).toMatchObject({ sold: 2 });
    expect(run(10, [buyer(1, 'blueberry', 2, 8)])).toMatchObject({ sold: 0 });
  });

  it('on day 3 a played Priority card buys first and Nest Egg second', () => {
    const s = bare(4);
    s.players[2].trait = 'nestegg';
    [20, 10, 30, 30].forEach((c, i) => { s.players[i].cash = c; });
    const e = evening(s, 2);
    e.priorityNext = 0;
    const g = passEvening(e);
    expect(g.day).toBe(3);
    expect(g.order.slice(0, 2)).toEqual([0, 2]);
    expect(g.priorityNext).toBeNull();
    // Without a Priority card Nest Egg is first on day 3; on any other day it has no place of its own.
    expect(passEvening(evening(s, 2)).order[0]).toBe(2);
    expect(passEvening(evening(s, 3)).order[0]).toBe(1); // the poorest
  });

  it('only one Priority card can be played each evening: a second is refused and stays in the hand', () => {
    const s = evening(bare(3), 4);
    s.players[0].favours = ['priority'];
    s.players[1].favours = ['priority', 'gossip'];
    let g = playFavour(s, 0, 0);
    expect(g.priorityNext).toBe(0);
    g = applyAction(g, 0, { kind: 'endEvening' });
    expect(activePlayer(g)).toBe(1); // stall 1 still has Gossip to decide on
    expect(canPlayFavour(g, 1, 0)).toBe('A Priority card has already been played this evening. Only one can be played each evening, so keep yours');
    expect(() => playFavour(g, 1, 0)).toThrow(/Only one can be played each evening/);
    expect(g.players[1].favours).toEqual(['priority', 'gossip']);
    const next = passEvening(g);
    expect(next.order[0]).toBe(0);
    expect(next.players[1].favours).toEqual(['priority', 'gossip']);
    // The next evening the card can be played.
    const e2 = evening(next, next.day);
    e2.order = [1, 0, 2];
    expect(canPlayFavour(e2, 1, 0)).toBeNull();
  });

  it('the end of the game: most cash, then most fruit sold, and stalls still tied share the win', () => {
    const s = bare(4);
    s.phase = 'over';
    const set = (cash: number[], sold: number[]) => { const g = structuredClone(s); g.players.forEach((p, i) => { p.cash = cash[i]; p.stats.sold = sold[i]; }); return g; };
    // Most cash wins.
    expect(winners(set([50, 60, 40, 30], [9, 1, 9, 9]))).toEqual([1]);
    // A tie on cash goes to the stall that sold more fruit.
    const bySold = set([60, 60, 40, 30], [5, 7, 9, 9]);
    expect(winners(bySold)).toEqual([1]);
    expect(places(bySold)).toEqual([2, 1, 3, 4]);
    // Still tied: they share the win, whatever their seats (no seat-number tie-break).
    const shared = set([40, 60, 30, 60], [9, 7, 9, 7]);
    expect(winners(shared).sort()).toEqual([1, 3]);
    expect(places(shared)).toEqual([3, 1, 4, 1]);
    expect(ranking(shared).slice(0, 2).sort()).toEqual([1, 3]);
    // Everyone level: everyone shares.
    expect(winners(set([50, 50, 50, 50], [3, 3, 3, 3]))).toHaveLength(4);
    expect(places(set([50, 50, 50, 20], [3, 3, 3, 3]))).toEqual([1, 1, 1, 4]);
  });

  it('results and standings handle a shared win', () => {
    const s = bare(3);
    s.phase = 'over';
    [60, 60, 20].forEach((c, i) => { s.players[i].cash = c; s.players[i].stats.sold = 7; });
    expect(finishWords(s, 0)).toEqual({
      win: true, shared: true, headline: 'YOU SHARE THE WIN WITH P1', margin: 'Level on cash and on fruit sold.',
      medals: ['1ST', '1ST', '3RD'], mine: 'I shared the win',
    });
    expect(finishWords(s, 2)).toMatchObject({ win: false, headline: 'P0 AND P1 SHARE THE WIN', mine: 'I came 3rd' });
    expect(standing(s, 0)).toMatchObject({ rank: 1, text: 'Tied with P1' });
    expect(standing(s, 1)).toMatchObject({ rank: 1, text: 'Tied with P0' });
    expect(standing(s, 2)).toMatchObject({ rank: 3 });
    // A single winner reads as before.
    s.players[0].cash = 61;
    expect(finishWords(s, 0)).toMatchObject({ win: true, shared: false, headline: 'YOU WIN!', margin: 'By just $1. What a finish!', medals: ['1ST', '2ND', '3RD'], mine: 'I won' });
    expect(finishWords(s, 1)).toMatchObject({ win: false, headline: 'P0 WINS!', mine: 'I came 2nd' });
    // Level on cash, not on fruit sold: one winner, as before.
    s.players[0].cash = 60; s.players[0].stats.sold = 8;
    expect(finishWords(s, 1)).toMatchObject({ shared: false, headline: 'P0 WINS!', margin: 'A dead heat, decided on fruit sold!' });
    // Fifth and sixth place have a name too.
    const six = bare(6);
    six.phase = 'over';
    six.players.forEach((p, i) => { p.cash = 60 - i; });
    expect(finishWords(six, 5).medals).toEqual(['1ST', '2ND', '3RD', '4TH', '5TH', '6TH']);
    expect(finishWords(six, 5).mine).toBe('I came 6th');
    expect(standing(six, 5).text).toBe('6th · $1 behind P4');
  });

  it('one favour deck of 12 (two of each) at every table size', () => {
    expect(FAVOUR_DECK).toHaveLength(12);
    for (const n of [2, 3, 4, 5, 6]) {
      const deck = favourDeckFor(n);
      expect(deck).toHaveLength(12);
      for (const id of Object.keys(FAVOURS)) expect(deck.filter((x) => x === id)).toHaveLength(2);
      const s = newGame(humans(n));
      expect(s.favourDeck.length + s.players.flatMap((p) => p.favours).length).toBe(12);
    }
  });

  it('a guest joins the row even when it is full; a due standing order still takes the last walk-in\'s place', () => {
    expect(GUEST_JOINS_FULL_ROW).toBe(true);
    // Five stalls: the regular and four walk-ins fill the row; the Hotel Chef makes six.
    let s = structuredClone(beginBuying(newGame(humans(5))));
    s.event = ev('hotel');
    expect(s.queue).toHaveLength(4);
    s = endBuying(s);
    let row = servingCustomers(s);
    expect(row).toHaveLength(ROW_CAP + 1);
    expect(row.filter((c) => c.walkIn)).toHaveLength(4);
    expect(row[row.length - 1].name).toBe('Hotel Chef');
    // With a standing order due as well: the order stands in front and takes the last walk-in's place; the guest still joins.
    let g = marketDay(5, 30);
    g = bidOrder(g, 0, 5);
    for (const p of [1, 2, 3, 4]) g = bidOrder(g, p, null);
    const d = structuredClone(g);
    d.day = d.standing!.due; d.phase = 'buy'; d.turn = 0; d.event = ev('hotel');
    d.forecast = structuredClone(s.firstMarket.find((c) => !c.walkIn && c.name !== 'Hotel Chef')!);
    d.queue = structuredClone(s.firstMarket.filter((c) => c.walkIn));
    row = servingCustomers(endBuying(d));
    expect(row[0].order).toBeTruthy();
    expect(row.filter((c) => c.walkIn)).toHaveLength(3);
    expect(row[row.length - 1].name).toBe('Hotel Chef');
    expect(row).toHaveLength(ROW_CAP + 1);
  });

  it('Blueberry Glut also makes blueberries cost $1 less at the market that day, never below $1', () => {
    const s = beginBuying(bare(2));
    const cost = () => [FRESH('blueberry'), OKAY('blueberry'), SOFT].map((pos) => marketCost(s, 'blueberry', pos));
    expect(cost()).toEqual([2, 1, 1]);
    s.event = ev('glut');
    expect(cost()).toEqual([1, 1, 1]);
    expect(marketCost(s, 'apple', FRESH('apple'))).toBe(3); // only blueberries
    expect(ev('glut').text).toContain('Blueberries cost $1 less at the market (never below $1).');
    // A Price Hike day is unaffected by the new field.
    s.event = ev('priceHike');
    expect(cost()).toEqual([3, 2, 2]);
  });
});

describe('I. steps with nothing to decide', () => {
  it('a stall with no ripe fruit takes no stocking or pricing turn: it is treated as having put nothing out', () => {
    let s = beginBuying(bare(3));
    s = structuredClone(s);
    s.players[0].stock.apple[FRESH('apple')] = 2;
    s.players[1].stock.mango[GREEN_TOP] = 2; // green fruit cannot be put out
    while (s.phase === 'buy') s = engine.endBuyTurn(s, activePlayer(s));
    expect(s.phase).toBe('stall');
    expect(s.stalls).toEqual([null, {}, {}]);
    expect(s.crates).toEqual([null, {}, {}]);
    expect(activePlayer(s)).toBe(0);
    expect(() => openStall(s, 1, {})).toThrow(/Not your turn/);
    s = openStall(s, 0, { apple: 2 });
    expect(s.phase).toBe('bid');
    expect(s.bids).toEqual([null, [], []]);
    expect(activePlayer(s)).toBe(0);
    s = submitPrices(s, 0, [{ fruit: 'apple', price: 4 }]);
    expect(s.phase).toBe('reveal');
  });

  it('when no stall has ripe fruit the rush follows buying directly; buying still ends with each stall\'s own "done"', () => {
    let s = beginBuying(bare(2));
    expect(s.phase).toBe('buy');
    s = engine.endBuyTurn(s, s.order[0]);
    expect(s.phase).toBe('buy'); // the second stall still has to say it is done
    s = engine.endBuyTurn(s, s.order[1]);
    expect(s.phase).toBe('reveal');
    expect(s.stalls).toEqual([{}, {}]);
    expect(s.results!.income).toEqual([0, 0]);
  });

  it('a stall takes an evening turn only if it has a choice', () => {
    // The evening after a Market Day: an upgrade on offer that it can afford and has room for.
    const s = stocking(4, [], 3);
    [30, 2, 30, 30].forEach((c, i) => { s.players[i].cash = c; });
    s.players[2].upgrades = ['barrow', 'premium']; // no room
    let g = finishReveal(bell(s, []));
    expect(g.phase).toBe('evening');
    expect([0, 1, 2, 3].map((p) => eveningChoice(g, p))).toEqual([true, false, false, true]);
    expect(activePlayer(g)).toBe(0);
    g = applyAction(g, 0, { kind: 'endEvening' });
    expect(activePlayer(g)).toBe(3); // stalls 1 ($2) and 2 (no room) are passed over
    g = applyAction(g, 3, { kind: 'endEvening' });
    expect(g.day).toBe(4);
    expect(g.phase).toBe('morning');
  });

  it('an evening favour it can play gives a stall a turn; a card for another step does not', () => {
    const s = stocking(3, [], 4);
    s.players[0].favours = ['fridge', 'scout', 'freeFruit']; // none is an evening card
    s.players[1].favours = ['gossip'];
    s.players[2].favours = ['priority'];
    s.queue = [buyer(7, 'apple', 1, 6, 'everyday', { walkIn: true, seenBy: [] })];
    let g = finishReveal(bell(s, []));
    expect(g.phase).toBe('evening');
    expect([0, 1, 2].map((p) => eveningChoice(g, p))).toEqual([false, true, true]);
    expect(activePlayer(g)).toBe(1);
    g = playFavour(g, 1, 0);
    g = applyAction(g, 1, { kind: 'endEvening' });
    expect(activePlayer(g)).toBe(2);
    // Gossip with nothing left to hear about is no choice.
    const heard = structuredClone(s);
    heard.queue[0].seenBy = [1];
    heard.players[2].favours = [];
    expect(finishReveal(bell(heard, [])).day).toBe(5);
    // Priority on the last evening but one is a choice; with no tomorrow it is not.
    const last = stocking(3, [], 10);
    last.players[2].favours = ['priority'];
    expect(finishReveal(bell(last, [])).phase).toBe('over');
  });

  it('if no stall has a choice the evening is skipped; Shade Cloth\'s nightly choice is one for a person with fruit', () => {
    const s = stocking(3, [], 4);
    expect(finishReveal(bell(s, [])).day).toBe(5); // straight to the next morning
    const din = structuredClone(s);
    din.players[1].trait = 'keeper';
    expect(finishReveal(bell(din, [])).day).toBe(5); // an empty shelf: nothing to shade
    din.players[1].stock.apple[FRESH('apple')] = 1;
    din.stalls = din.stalls.map(() => null); din.crates = din.crates!.map(() => null);
    const e = finishReveal(bell(din, [30], [undefined, {}]));
    expect(e.phase).toBe('evening');
    expect(activePlayer(e)).toBe(1);
    // A computer Pak Din picks at nightfall, as before, and takes no turn for it.
    const cpu = structuredClone(din);
    cpu.players[1].kind = 'ai';
    expect(finishReveal(bell(cpu, [30], [undefined, {}])).day).toBe(5);
  });
});

describe('K. Favoured Trade after prices flip', () => {
  /** Two or three stalls with 2 Fresh apples each and one customer for 2 at up to $8; stalls in `hold` hold the card. */
  function tied(n: number, hold: number[], prices: number[], setup: (s: GameState) => void = () => {}): GameState {
    const s = stocking(n, [buyer(1, 'apple', 2, 8)]);
    s.players.forEach((p) => { p.stock.apple[FRESH('apple')] = 2; });
    for (const p of hold) s.players[p].favours = ['favouredTrade'];
    setup(s);
    return bell(s, prices);
  }
  const soldTo = (g: GameState) => g.results!.lines[0].offers.filter((o) => o.sold > 0).map((o) => [o.player, o.sold]);

  it('the card says so, and it cannot be played before the flip', () => {
    expect(FAVOURS.favouredTrade).toMatchObject({ when: 'tie', text: 'After prices flip: if one of your prices is tied, play this to win every tied price today.' });
    let s = stocking(2, [buyer(1, 'apple', 2, 8)]);
    s.players.forEach((p) => { p.stock.apple[FRESH('apple')] = 2; });
    s.players[0].favours = ['favouredTrade'];
    const why = 'Favoured Trade is played after prices flip, when one of your prices is tied and you are asked';
    expect(canPlayFavour(s, 0, 0)).toBe(why); // stocking
    s = openStall(openStall(s, 0, { apple: 2 }), 1, { apple: 2 });
    expect(s.phase).toBe('bid');
    expect(canPlayFavour(s, 0, 0)).toBe(why); // pricing: no longer played with the prices
    expect(() => playFavour(s, 0, 0)).toThrow(why);
    expect(() => applyAction(s, 0, { kind: 'favour', idx: 0 })).toThrow(why);
    expect(() => decideTie(s, 0, true)).toThrow(/Not the tie phase/);
    s = submitPrices(s, 0, [{ fruit: 'apple', price: 6 }]);
    expect(s.players[0].favouredTrade).toBe(false);
    expect(s.players[0].favours).toEqual(['favouredTrade']);
  });

  it('the step does not exist when no stall is eligible: no holder, no tie, or the tie is for a fruit the holder did not put out', () => {
    // A tie, but nobody holds the card.
    expect(tied(2, [], [6, 6]).phase).toBe('reveal');
    // A holder, but its price is not tied.
    const g = tied(2, [0], [6, 7]);
    expect(g.phase).toBe('reveal');
    expect(g.players[0].favours).toContain('favouredTrade');
    // The same price for different fruits is not a tie.
    const s = stocking(2, [buyer(1, 'apple', 2, 8)]);
    s.players[0].stock.apple[FRESH('apple')] = 1;
    s.players[1].stock.blueberry[FRESH('blueberry')] = 1;
    s.players[0].favours = ['favouredTrade'];
    expect(bell(s, [4, 4]).phase).toBe('reveal');
    // A stall that put nothing out has no price to tie.
    expect(tiedPrices(tied(2, [0], [6, 6], (x) => { x.players[1].stock.apple = shelf('apple', {}); }), 0)).toEqual([]);
  });

  it('one eligible holder is asked, plays it and wins the tie ahead of fresher fruit, the Haggler and the buying order', () => {
    // Stall 2 holds the card; stall 0 buys first, stall 1 is the Haggler with fresher fruit.
    const s = tied(3, [2], [6, 6, 6], (x) => {
      x.players[1].trait = 'haggler';
      x.players[2].stock.apple = shelf('apple', { [FRESH('apple') - 2]: 2 }); // older Fresh apples
    });
    expect(s.phase).toBe('tie');
    expect(s.tieAsk).toEqual([2]);
    expect(activePlayer(s)).toBe(2);
    expect(tieEligible(s, 2)).toBe(true);
    expect(tieEligible(s, 0)).toBe(false);
    expect(tiedPrices(s, 2)).toEqual([{ fruit: 'apple', price: 6, rivals: [0, 1] }]);
    expect(s.results).toBeNull(); // nobody has been served yet
    expect(() => decideTie(s, 0, true)).toThrow(/Not your turn/);
    const g = decideTie(s, 2, true);
    expect(g.phase).toBe('reveal');
    expect(g.tieAsk).toBeUndefined();
    expect(g.players[2].favouredTrade).toBe(true);
    expect(g.players[2].favours).not.toContain('favouredTrade'); // spent (serving the customer alone drew it a new card)
    expect(g.players[2].stats.played).toEqual(['favouredTrade']);
    expect(g.log).toContain('P2 played Favoured Trade');
    expect(soldTo(g)).toEqual([[2, 2]]);
    // The same through the action the screen sends, and by tapping the card itself while being asked.
    expect(soldTo(applyAction(s, 2, { kind: 'tie', play: true }))).toEqual([[2, 2]]);
    expect(canPlayFavour(s, 2, 0)).toBeNull();
    expect(canPlayFavour(s, 0, 0)).toBe('No such card');
    expect(soldTo(playFavour(s, 2, 0))).toEqual([[2, 2]]);
  });

  it('a holder that declines keeps the card and the tie is decided as usual', () => {
    const s = tied(3, [2], [6, 6, 6], (x) => { x.players[1].trait = 'haggler'; });
    const g = decideTie(s, 2, false);
    expect(g.phase).toBe('reveal');
    expect(g.players[2].favours).toEqual(['favouredTrade']);
    expect(g.players[2].favouredTrade).toBe(false);
    expect(soldTo(g)).toEqual([[1, 2]]); // equally fresh fruit: the Haggler
  });

  it('two holders in the same tie decide one at a time in today\'s buying order, in the open; both cards are spent', () => {
    const s = tied(3, [0, 2], [6, 6, 6], (x) => { x.order = [2, 1, 0]; x.players[1].trait = 'haggler'; });
    expect(s.tieAsk).toEqual([2, 0]); // buying order, not seat order
    expect(activePlayer(s)).toBe(2);
    const first = decideTie(s, 2, true);
    expect(first.phase).toBe('tie');
    expect(activePlayer(first)).toBe(0);
    // The later stall sees what the earlier one chose.
    expect(publicView(first, 0).players[2].favouredTrade).toBe(true);
    expect(redact(first, 0).players[2].favouredTrade).toBe(true);
    const both = decideTie(first, 0, true);
    expect(both.phase).toBe('reveal');
    expect(both.players.map((p) => p.favours.filter((c) => c === 'favouredTrade').length)).toEqual([0, 0, 0]);
    expect(both.players.map((p) => p.favouredTrade)).toEqual([true, false, true]);
    // Both played it: the rest of the tie order decides between them (equally fresh, no Haggler among them: the earlier buyer).
    expect(soldTo(both)).toEqual([[2, 2]]);
    // If only the later stall plays it, it wins.
    expect(soldTo(decideTie(decideTie(s, 2, false), 0, true))).toEqual([[0, 2]]);
    // If neither does, the Haggler does.
    expect(soldTo(settleTies(s))).toEqual([[1, 2]]);
  });

  it('computers: play it when it adds $2 or more to today\'s rush, keep it otherwise; Easy plays when asked; a minded seat keeps it', () => {
    expect(FAVOURED_TRADE_MARGIN).toBe(2);
    // The tie loses the whole order ($12): playing wins it.
    const big = tied(2, [1], [6, 6]);
    expect(big.phase).toBe('tie');
    expect(rushIncome(big)).toEqual([12, 0]);
    expect(rushIncome(big)).toEqual([12, 0]); // looking does not change the game
    expect(big.results).toBeNull();
    const cpu = (g: GameState, level: 'easy' | 'normal' | 'hard') => { const t = structuredClone(g); t.players[1].kind = 'ai'; t.players[1].level = level; return t; };
    for (const level of ['easy', 'normal', 'hard'] as const) expect(wantsFavouredTrade(cpu(big, level), 1)).toBe(true);
    expect(aiActFor(cpu(big, 'normal'), 1)!.players[1].favouredTrade).toBe(true);
    // The tie costs it $1: the customer wants 3, the rival has 2 and it has 2 at $1, so it sells 1 after losing the tie and 2 after winning it.
    const small = (() => {
      const s = stocking(2, [buyer(1, 'apple', 3, 8)]);
      s.players.forEach((p) => { p.stock.apple[FRESH('apple')] = 2; });
      s.players[1].favours = ['favouredTrade'];
      return bell(s, [1, 1]);
    })();
    expect(small.phase).toBe('tie');
    expect(wantsFavouredTrade(cpu(small, 'normal'), 1)).toBe(false);
    expect(wantsFavouredTrade(cpu(small, 'hard'), 1)).toBe(false);
    expect(wantsFavouredTrade(cpu(small, 'easy'), 1)).toBe(true);
    const kept = aiActFor(cpu(small, 'hard'), 1)!;
    expect(kept.phase).toBe('reveal');
    expect(kept.players[1].favours).toEqual(['favouredTrade']);
    // On the last day the card is worth nothing afterwards: any gain will do.
    const lastDay = structuredClone(small);
    lastDay.day = lastDay.config.days;
    expect(wantsFavouredTrade(cpu(lastDay, 'hard'), 1)).toBe(true);
    // A seat a computer is only minding for a person keeps the card ("away counts as keep it").
    const minded = aiActFor(big, 1)!;
    expect(minded.phase).toBe('reveal');
    expect(minded.players[1].favours).toEqual(['favouredTrade']);
    expect(minded.players[1].favouredTrade).toBe(false);
  });

  it('online redaction during the step: who is being asked, never who is next or what anyone holds', () => {
    const s = tied(3, [0, 2], [6, 6, 6], (x) => { x.players[1].favours = ['gossip', 'priority']; });
    s.players[1].stock.blueberry[OKAY('blueberry')] = 1; // a piece stall 1 kept back on its shelf
    expect(s.tieAsk).toEqual([0, 2]);
    for (const seat of [0, 1, 2]) {
      const v = redact(s, seat);
      expect(v.phase).toBe('tie');
      expect(v.tieAsk).toEqual([0]); // the stall deciding now; not that stall 2 holds the card as well
      // The flip has happened: every price and every crate is public.
      expect(v.bids.map((b) => b?.[0]?.price)).toEqual([6, 6, 6]);
      expect(v.stalls).toEqual([{ apple: 2 }, { apple: 2 }, { apple: 2 }]);
      expect(v.out).toBeUndefined();
      for (let r = 0; r < 3; r++) {
        if (r === seat) continue;
        // A rival's cards are only counted, and its shelf (the blueberry it kept back) is still secret.
        expect(new Set(v.players[r].favours)).toEqual(new Set(['priority']));
        expect(v.players[r].favours).toHaveLength(s.players[r].favours.length);
        expect(FRUITS.every((f) => v.players[r].stock[f].every((c) => c === 0))).toBe(true);
      }
      if (seat !== 1) expect(JSON.stringify(v)).not.toContain('"gossip"'); // stall 1's own cards are its own business
      expect(v.rng).toBe(0);
    }
    // The stall being asked is named to everyone (the table has the same tell).
    expect(redact(s, 1).tieAsk).toEqual([0]);
  });

  it('on screen: the asked stall gets a prompt naming the rival, fruit and price with two buttons; the others see who is deciding', () => {
    const s = tied(3, [2], [6, 6, 6]);
    expect(tieWords(s, 2)).toBe('apples at $6 with P0 and P1');
    const mine = toStaticHtml(h(TiePanel, { s: publicView(s, 2), viewer: 2, asked: 2, onDecide: () => undefined }));
    expect(mine).toContain('Your prices are tied: apples at $6 with P0 and P1.');
    expect(mine).toContain('Play it');
    expect(mine).toContain('Keep it');
    const theirs = toStaticHtml(h(TiePanel, { s: publicView(s, 0), viewer: 0, asked: 2 }));
    expect(theirs).toContain('P2 is deciding');
    expect(theirs).toContain('P2 has a tied price (apples at $6 with P0 and P1) and may play Favoured Trade to win it.');
    expect(theirs).not.toContain('Play it');
  });

  it('whole computer games reach the step, and every card played there was held by a stall with a tied price', () => {
    let steps = 0, plays = 0;
    for (let seed = 1; seed <= 12; seed++) {
      let s = newGame(ais(3 + (seed % 2), seed));
      while (s.phase !== 'over') {
        if (s.phase === 'tie') {
          const p = activePlayer(s);
          expect(tieEligible(s, p)).toBe(true);
          steps++;
          const next = autoplay(s, 1);
          if (next.players[p].favouredTrade) {
            plays++;
            expect(next.players[p].stats.played).toContain('favouredTrade');
            // The card left its hand (if the rush followed at once it may have drawn a new card for serving alone).
            if (next.phase === 'tie') expect(next.players[p].favours.length).toBe(s.players[p].favours.length - 1);
          } else expect(next.players[p].favours).toEqual(s.players[p].favours.length ? expect.arrayContaining(['favouredTrade']) : []);
          s = next;
        } else {
          // Outside the step nobody's flag is ever set before the rush.
          if (s.phase === 'bid' || s.phase === 'stall' || s.phase === 'buy') expect(s.players.some((p) => p.favouredTrade)).toBe(false);
          s = autoplay(s, 1);
        }
      }
    }
    expect(steps).toBeGreaterThan(3);
    expect(plays).toBeGreaterThan(0);
  }, 120_000);
});

// ---------------------------------------------------------------------------------------------------------------------
// The room server (online play).

class Client implements Conn {
  seat: number | null = null;
  inbox: string[] = [];
  constructor(public id: string, private hs: Harness) {}
  send(msg: ServerMsg) { this.inbox.push(JSON.stringify(msg)); }
  close() { this.hs.drop(this); }
  get view(): RoomView | null {
    for (let i = this.inbox.length - 1; i >= 0; i--) { const m = JSON.parse(this.inbox[i]); if (m.t === 'room') return m; }
    return null;
  }
  get errors(): string[] { return this.inbox.map((r) => JSON.parse(r)).filter((m) => m.t === 'error').map((m) => m.msg); }
  async say(msg: ClientMsg) { await this.hs.room.message(this, JSON.stringify(msg)); }
}
class Harness implements RoomIO {
  list: Client[] = [];
  t = 1_000_000;
  n = 0;
  room = new Room(freshRoom('RULE18', this.t), this);
  conns() { return this.list; }
  setSeat(c: Conn, seat: number | null) { c.seat = seat; }
  persist() {}
  now() { return this.t; }
  randomHex(b: number) { return Array.from({ length: b }, (_, i) => ((i * 37 + this.n++) % 256).toString(16).padStart(2, '0')).join(''); }
  randomInt(n: number) { return (this.n++ * 7919) % n; }
  setAlarm() {}
  destroy() {}
  connect(id: string) { const c = new Client(id, this); this.list.push(c); return c; }
  drop(c: Client) { this.list = this.list.filter((x) => x !== c); void this.room.closed(c); }
}
let ids = 0;
const nid = () => `r18-${ids++}`;

/** A two-person room in a match, with the game replaced by `game` (a position made by hand). */
async function roomAt(game: (g: GameState) => GameState) {
  const hs = new Harness();
  const a = hs.connect('A'), b = hs.connect('B');
  await a.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, name: 'Ana', avatar: '🧑‍🍳' });
  await b.say({ t: 'hello', rv: RULES_VERSION, pv: PROTOCOL_VERSION, name: 'Ben', avatar: '👩‍🍳' });
  await a.say({ t: 'config', config: { days: 10, ai: 0, unripe: true, upgrades: true, events: false } });
  await a.say({ t: 'ready', ready: true });
  await b.say({ t: 'ready', ready: true });
  await a.say({ t: 'start' });
  expect(hs.room.d.status).toBe('playing');
  hs.room.d.game = game(hs.room.d.game!);
  hs.room.d.pending = hs.room.d.game.players.map(() => null);
  hs.room.d.version++;
  hs.room.broadcast();
  return { hs, a, b };
}

describe('online (the room server)', () => {
  it('I. nobody waits for a stall with no ripe fruit: it is not asked to stock or to price', async () => {
    const { hs, a, b } = await roomAt((g) => {
      let s = structuredClone(g);
      s.players.forEach((p) => { p.stock = emptyStock(true); p.trait = null; p.favours = []; });
      s = beginBuying(s);
      s.players[0].stock.apple[FRESH('apple')] = 2; // only Ana has ripe fruit
      while (s.phase === 'buy') s = engine.endBuyTurn(s, activePlayer(s));
      return s;
    });
    expect(hs.room.d.game!.phase).toBe('stall');
    expect(a.view!.submitted).toEqual([false, true]); // Ben is not being waited for
    await b.say({ t: 'act', id: nid(), v: b.view!.version, action: { kind: 'stall', stall: {} } });
    expect(b.errors.slice(-1)[0]).toBe('You have no ripe fruit to put out today');
    await a.say({ t: 'act', id: nid(), v: a.view!.version, action: { kind: 'stall', stall: { apple: 2 } } });
    expect(hs.room.d.game!.phase).toBe('bid'); // the stocking step ended with Ana's crate alone
    expect(a.view!.submitted).toEqual([false, true]);
    await a.say({ t: 'act', id: nid(), v: a.view!.version, action: { kind: 'prices', posts: [{ fruit: 'apple', price: 4 }] } });
    expect(hs.room.d.game!.phase).toBe('reveal');
  });

  /** Both people have 2 Fresh apples out at $6 for one customer; Ana (seat 0) holds Favoured Trade and Ben buys first. */
  const tieRoom = () => roomAt((g) => {
    let s = structuredClone(g);
    s.players.forEach((p) => { p.stock = emptyStock(true); p.trait = null; p.favours = []; p.stock.apple[FRESH('apple')] = 2; });
    s.players[0].favours = ['favouredTrade'];
    s = beginBuying(s);
    while (s.phase === 'buy') s = engine.endBuyTurn(s, activePlayer(s));
    s = structuredClone(s);
    s.firstMarket = [buyer(1, 'apple', 2, 8)]; s.secondMarket = []; s.order = [1, 0];
    s = openStall(openStall(s, 0, { apple: 2 }), 1, { apple: 2 });
    return s;
  });

  it('K. the server asks the tied holder after the flip; its answer is an ordinary action', async () => {
    const { hs, a, b } = await tieRoom();
    expect(hs.room.d.game!.phase).toBe('bid');
    // Favoured Trade can no longer ride along with the prices.
    await a.say({ t: 'act', id: nid(), v: a.view!.version, action: { kind: 'favour', idx: 0 } });
    expect(a.errors.slice(-1)[0]).toContain('played after prices flip');
    await a.say({ t: 'act', id: nid(), v: a.view!.version, action: { kind: 'prices', posts: [{ fruit: 'apple', price: 6 }] } });
    await b.say({ t: 'act', id: nid(), v: b.view!.version, action: { kind: 'prices', posts: [{ fruit: 'apple', price: 6 }] } });
    expect(hs.room.d.game!.phase).toBe('tie');
    // Both phones see who is being asked, the open crates and prices; Ben does not see Ana's card.
    for (const c of [a, b]) {
      expect(c.view!.game!.phase).toBe('tie');
      expect(c.view!.game!.tieAsk).toEqual([0]);
      expect(c.view!.game!.bids.map((x) => x?.[0]?.price)).toEqual([6, 6]);
    }
    expect(b.view!.game!.players[0].favours).toEqual(['priority']); // a stand-in: only the number of cards is public
    expect(JSON.stringify(b.view!.game)).not.toContain('favouredTrade":true');
    // Ben cannot answer for her.
    await b.say({ t: 'act', id: nid(), v: b.view!.version, action: { kind: 'tie', play: true } });
    expect(b.errors.slice(-1)[0]).toBe('Not your turn');
    await a.say({ t: 'act', id: nid(), v: a.view!.version, action: { kind: 'tie', play: true } });
    const g = hs.room.d.game!;
    expect(g.phase).toBe('reveal');
    expect(g.results!.lines[0].offers.find((o) => o.sold)!.player).toBe(0); // she wins the tie Ben's earlier buying turn would have taken
    expect(g.players[0].favours).not.toContain('favouredTrade');
    expect(b.view!.game!.players[0].favouredTrade).toBe(true);
  });

  it('K. a seat that is away counts as "keep it": the computer minding it does not play the card', async () => {
    const { hs, a, b } = await tieRoom();
    await a.say({ t: 'act', id: nid(), v: a.view!.version, action: { kind: 'prices', posts: [{ fruit: 'apple', price: 6 }] } });
    await b.say({ t: 'act', id: nid(), v: b.view!.version, action: { kind: 'prices', posts: [{ fruit: 'apple', price: 6 }] } });
    expect(hs.room.d.game!.phase).toBe('tie');
    a.close(); // Ana drops out while she is being asked
    hs.t += GRACE_MS + 1;
    await hs.room.alarm();
    const g = hs.room.d.game!;
    expect(g.phase).toBe('reveal');
    expect(g.players[0].favours).toEqual(['favouredTrade']); // kept
    expect(g.players[0].favouredTrade).toBe(false);
    expect(g.results!.lines[0].offers.find((o) => o.sold)!.player).toBe(1); // Ben bought first, so he wins the tie
  });

  it('K. computer seats answer at once', async () => {
    const { hs, a, b } = await roomAt((g) => {
      // Ana and Ben plus a computer in a hand-made three-stall game: the computer holds the card and has the tie.
      let s = structuredClone(newGame({
        players: [...g.players.map((p) => ({ name: p.name, kind: 'human' as const, avatar: '' })), { name: 'Robo', kind: 'ai' as const, level: 'normal' as const, avatar: '' }],
        days: 10, unripe: true, upgrades: true, events: false, seed: 5,
      }));
      s.players.forEach((p) => { p.stock = emptyStock(true); p.trait = null; p.traitOffer = []; p.favours = []; });
      s.players[0].stock.apple[FRESH('apple')] = 2;
      s.players[2].stock.apple[FRESH('apple')] = 2;
      s.players[2].favours = ['favouredTrade'];
      s = beginBuying(s);
      while (s.phase === 'buy') s = engine.endBuyTurn(s, activePlayer(s));
      s = structuredClone(s);
      s.firstMarket = [buyer(1, 'apple', 2, 8)]; s.secondMarket = []; s.order = [0, 1, 2];
      s = openStall(s, 0, { apple: 2 });
      s = openStall(s, 2, { apple: 2 });
      // The computer has priced; Ana prices last, at the same price.
      const robo = planPrices(s, 2).posts[0].price;
      s = structuredClone(s);
      s.bids[2] = [{ fruit: 'apple', price: robo }];
      return s;
    });
    const robo = hs.room.d.game!.bids[2]![0].price;
    expect(hs.room.d.game!.phase).toBe('bid');
    expect(a.view!.submitted).toEqual([false, true, false]);
    await a.say({ t: 'act', id: nid(), v: a.view!.version, action: { kind: 'prices', posts: [{ fruit: 'apple', price: robo }] } });
    const g = hs.room.d.game!;
    expect(g.phase).toBe('reveal'); // the tie step came and went without waiting for anyone
    expect(g.players[2].favouredTrade).toBe(true);
    expect(g.results!.lines[0].offers.find((o) => o.sold)!.player).toBe(2);
    expect(b.view!.game!.phase).toBe('reveal');
  });
});
