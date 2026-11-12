// Rules 14 (PLAN-069): fruit lives of 3, 4, 5 and 6, green mangoes on every lorry, a row of at most five customers
// with nobody waiting overnight, standing orders won by the lowest secret bid, and five upgrades (two to a stall).
import { describe, expect, it } from 'vitest';
import { BIG_TABLE, CUSTOMER_CARDS, EVENT_CARDS, FARMER_CARDS, FRUIT, FRUITS, MAX_UPGRADES, ORDER_CARDS, ORDER_LEAD, ROW_CAP, UPGRADES, orderQty, stageAt } from '../src/engine/data';
import { autoplay, planOrderBid } from '../src/engine/ai';
import {
  applyAction, beginBuying, bidOrder, canBidOrder, canUpgrade, emptyStock, newGame, openStall, rowCount, rowCustomers, servingCustomers,
  shelfPos, submitPrices, type GameConfig, type GameState,
} from '../src/engine/game';
import { redact } from '../server/room';
import { RULES_VERSION } from '../src/net/protocol';
import { endBuying, passEvening } from './stall-step';

const humans = (n: number, extra: Partial<GameConfig> = {}): GameConfig => ({
  players: Array.from({ length: n }, (_, i) => ({ name: `P${i}`, kind: 'human' as const, avatar: '' })),
  days: 10, unripe: true, upgrades: true, events: false, seed: 3, ...extra,
});
const ais = (n: number, seed: number, extra: Partial<GameConfig> = {}): GameConfig => ({
  players: Array.from({ length: n }, (_, i) => ({ name: `P${i}`, kind: 'ai' as const, level: 'normal' as const, avatar: '' })),
  days: 10, unripe: true, upgrades: true, events: true, seed, ...extra,
});
/** A game on the morning of day 3 (the first Market Day), in the bidding step, with empty shelves and $30 each. */
function marketDay(n: number): GameState {
  const s = structuredClone(newGame(humans(n)));
  s.day = 2; s.phase = 'evening'; s.turn = 0; s.order = s.players.map((_, i) => i);
  s.players.forEach((p) => { p.stock = emptyStock(true); p.cash = 30; p.trait = null; p.traitOffer = []; });
  let g: GameState = s;
  g = passEvening(g);
  expect(g.day).toBe(3);
  return beginBuying(g);
}
/** Skips to the stocking step of the order's due day, giving each stall the pieces in `stock` (position → count). */
function dueDay(g: GameState, stock: Record<number, number[]>): GameState {
  let s = structuredClone(g);
  const o = s.standing!;
  s.day = o.due; s.phase = 'buy'; s.turn = 0; s.event = null; s.forecast = null; s.queue = [];
  for (const [p, t] of Object.entries(stock)) s.players[Number(p)].stock[o.fruit] = [...t];
  s = endBuying(s);
  return s;
}

describe('rules 14: fruit lives', () => {
  it('is rules version 14 or later', () => expect(RULES_VERSION).toBeGreaterThanOrEqual(14));

  it('fruits last 3, 4, 5 and 6 days: the last two are Okay then Soft, every day before is Fresh', () => {
    expect(FRUITS.map((f) => FRUIT[f].ripe.length + FRUIT[f].unripeSlots).sort()).toEqual([3, 4, 5, 6]);
    for (const f of FRUITS) {
      expect(FRUIT[f].ripe.slice(0, 2), f).toEqual(['notso', 'okay']);
      expect(FRUIT[f].ripe.slice(2).every((x) => x === 'fresh'), f).toBe(true);
      expect(FRUIT[f].drop.slice(0, 2), f).toEqual([2, 1]);
    }
    expect([FRUIT.blueberry.ripe.length, FRUIT.watermelon.ripe.length, FRUIT.mango.ripe.length + FRUIT.mango.unripeSlots, FRUIT.apple.ripe.length]).toEqual([3, 4, 5, 6]);
    expect(FRUITS.filter((f) => FRUIT[f].unripeSlots > 0)).toEqual(['mango']);
    expect(FRUIT.mango.cost).toMatchObject({ unripe: 4, fresh: 6, okay: 3, notso: 1 }); // rules 18: a green mango costs $4 (was $3)
  });

  it('every lorry brings its mangoes green: they land at the top of the track', () => {
    expect(FARMER_CARDS.every((c) => c.unripe === 'mango')).toBe(true);
    const s = beginBuying(newGame(humans(3)));
    const top = s.market.mango.length - 1;
    expect(stageAt('mango', top)).toBe('unripe');
    expect(s.market.mango.slice(0, top).every((n) => n === 0)).toBe(true);
    expect(s.market.mango[top]).toBe(s.delivery.mango ?? 0);
  });
});

describe('rules 14: the row', () => {
  it('never holds more than five customers, at any table size, in whole computer games (rules 18: a guest may make it six)', () => {
    for (const n of [2, 4, 5, 6]) for (const seed of [1, 2, 3]) {
      let s = newGame(ais(n, seed));
      for (let i = 0; i < 6000 && s.phase !== 'over'; i++) {
        if (s.phase === 'stall') {
          // The cap counts the regular, the walk-ins and a standing order collected today; a guest joins the end.
          const guest = s.event?.extra?.name;
          expect(servingCustomers(s).filter((c) => c.name !== guest).length, `${n} stalls, seed ${seed}, day ${s.day}`).toBeLessThanOrEqual(ROW_CAP);
          expect(servingCustomers(s).length, `${n} stalls, seed ${seed}, day ${s.day}`).toBeLessThanOrEqual(ROW_CAP + 1);
        }
        s = autoplay(s, 1);
      }
      expect(s.phase).toBe('over');
    }
  });

  it('nobody waits overnight: an unserved customer leaves', () => {
    let s = beginBuying(newGame(humans(2)));
    s = endBuying(s);
    expect(servingCustomers(s).length).toBeGreaterThan(0);
    s = openStall(openStall(s, 0, {}), 1, {});
    expect(s.phase).toBe('reveal');
    expect(s.results!.movedToWaiting).toEqual([]);
    expect(s.results!.leftAngry.length).toBe(rowCustomers(s).length);
    s = applyAction(s, 0, { kind: 'finish' });
    expect(s.secondMarket).toEqual([]);
  });

  it(`at ${BIG_TABLE} stalls every customer wants one more of the first fruit on their card`, () => {
    const six = newGame(humans(6)), four = newGame(humans(4, { seed: 3 }));
    const card = (name: string) => CUSTOMER_CARDS.find((c) => c.name === name)!;
    expect(six.forecast!.wants.map((w) => w.qty)).toEqual(card(six.forecast!.name).wants.map((w, i) => w.qty + (i === 0 ? 1 : 0)));
    expect(four.forecast!.wants.map((w) => w.qty)).toEqual(card(four.forecast!.name).wants.map((w) => w.qty));
  });

  it('a guest joins the end of a full row, which is then six (rules 18; before, it took the last walk-in\'s place)', () => {
    let s = structuredClone(beginBuying(newGame(humans(5))));
    s.event = EVENT_CARDS.find((e) => e.id === 'hotel')!;
    expect(s.queue.length).toBe(4);
    s = endBuying(s);
    const row = servingCustomers(s);
    expect(row.length).toBe(ROW_CAP + 1);
    expect(row.filter((c) => c.walkIn)).toHaveLength(4);
    expect(row[row.length - 1].name).toBe('Hotel Chef');
  });
});

describe('rules 14: standing orders', () => {
  it('one is announced on a Market Day morning, due two days later, and bid for before buying', () => {
    const s = marketDay(4);
    expect(s.phase).toBe('order');
    const o = s.standing!;
    expect(o.due).toBe(3 + ORDER_LEAD);
    expect(o.qty).toBe(orderQty(4));
    expect([2, 3, 4, 5, 6].map(orderQty)).toEqual([3, 3, 4, 5, 5]);
    expect(ORDER_CARDS).toHaveLength(8);
    expect(FRUITS.map((f) => ORDER_CARDS.filter((c) => c.fruit === f).length)).toEqual([2, 2, 2, 2]);
    expect(newGame(humans(2)).standing ?? null).toBeNull(); // not on day 1
  });

  it('the lowest bid wins; a tie goes to the stall earlier in the buying order; passes and bad bids are refused or ignored', () => {
    let s = marketDay(4);
    const top = s.standing!.ceiling;
    expect(canBidOrder(s, 0, top + 1)).toMatch(/most this order pays/);
    expect(canBidOrder(s, 0, 0)).toMatch(/start at \$1/);
    s = bidOrder(s, 0, top);
    expect(canBidOrder(s, 0, 5)).toBeNull(); // rules 17: a bid may change while another stall is still deciding
    s = bidOrder(s, 1, 7);
    s = bidOrder(s, 2, 7);
    expect(s.phase).toBe('order');
    s = bidOrder(s, 3, null);
    expect(s.phase).toBe('buy');
    expect(s.standing).toMatchObject({ holder: s.order.indexOf(1) < s.order.indexOf(2) ? 1 : 2, price: 7, bids: [top, 7, 7, 'pass'] });
  });

  it('an Order Book wins a tied bid; if everyone passes the order is discarded', () => {
    let s = marketDay(3);
    const last = s.order[2];
    s.players[last].upgrades = ['orderbook'];
    for (const p of [0, 1, 2]) s = bidOrder(s, p, 6);
    expect(s.standing!.holder).toBe(last);
    let none = marketDay(3);
    for (const p of [0, 1, 2]) none = bidOrder(none, p, null);
    expect(none.standing).toBeNull();
    expect(none.phase).toBe('buy');
  });

  it('on the due day it is served first, from the holder\'s crate only: the holder is paid its bid, rivals are left alone, and a short delivery loses the stake (rules 18)', () => {
    let s = marketDay(4); // qty 4
    for (const p of [0, 1, 2, 3]) s = bidOrder(s, p, p === 1 ? 6 : null);
    const o = structuredClone(s.standing!);
    // The winner put its stake down the moment it won.
    expect(o.staked).toBe(o.stake);
    expect(s.players[1].cash).toBe(30 - o.stake);
    const f = o.fruit, fresh = FRUIT[f].ripe.length - 1;
    const shelf = (n: number, pos: number) => { const t = emptyStock(true)[f]; t[pos] = n; return t; };
    // The holder has 3 Okay pieces; stall 2 has 2 Fresh ones; stall 3 has a Soft one (the order never takes Soft fruit).
    s = dueDay(s, { 1: shelf(3, 1), 2: shelf(2, fresh), 3: shelf(1, 0) });
    expect(servingCustomers(s)[0].order).toMatchObject({ holder: 1, price: 6, stake: o.stake });
    expect(servingCustomers(s).length).toBeLessThanOrEqual(ROW_CAP);
    const cash = s.players.map((p) => p.cash);
    for (const p of [0, 1, 2, 3]) s = openStall(s, p, p === 0 ? {} : { [f]: p === 1 ? 3 : p === 2 ? 2 : 1 });
    expect(rowCount(s, 1, f)).toBe(0); // all three go to the order
    expect(rowCount(s, 2, f)).toBe(2); // rules 18: a rival's fruit is never taken
    expect(rowCount(s, 3, f)).toBe(1);
    for (const p of [1, 2, 3]) s = submitPrices(s, p, [{ fruit: f, price: 30 }]); // too dear for any customer
    const r = s.results!.order!;
    expect(r).toMatchObject({ holder: 1, price: 6, ceiling: o.ceiling, qty: 4, short: 1, stake: o.stake, back: 0 });
    expect(r.sales).toEqual([{ player: 1, n: 3, price: 6 }]);
    expect(s.players[1].cash).toBe(cash[1] + 3 * 6); // paid for three pieces; the stake is lost, and there is no other fine
    expect(s.players[2].cash).toBe(cash[2]);
    expect(s.players[3].cash).toBe(cash[3]);
    expect(s.results!.favours).toEqual([]); // a standing order draws no favour card
    // The collected order is gone afterwards (the next Market Day may already have announced a new one).
    expect(applyAction(s, 0, { kind: 'finish' }).standing?.due ?? 99).toBeGreaterThan(o.due);
  });

  it('a full delivery brings the stake back; an Order Book halves the stake and pays $2 more a piece (rules 18)', () => {
    const run = (book: boolean, pieces: number) => {
      let s = marketDay(2); // qty 3
      if (book) s.players[0].upgrades = ['orderbook'];
      for (const p of [0, 1]) s = bidOrder(s, p, p === 0 ? 5 : null);
      const o = structuredClone(s.standing!);
      const paid = 30 - s.players[0].cash;
      const shelf = emptyStock(true)[o.fruit];
      shelf[FRUIT[o.fruit].ripe.length - 1] = pieces;
      s = dueDay(s, pieces ? { 0: shelf } : {});
      const before = s.players[0].cash;
      s = openStall(openStall(s, 0, pieces ? { [o.fruit]: pieces } : {}), 1, {});
      if (s.phase === 'bid') s = submitPrices(s, 0, [{ fruit: o.fruit, price: 30 }]);
      return { stake: o.stake, paid, res: s.results!.order!, gain: s.players[0].cash - before };
    };
    const full = run(false, 3), short = run(false, 2), none = run(false, 0), book = run(true, 3);
    expect(full.paid).toBe(full.stake);
    expect(full.res).toMatchObject({ short: 0, stake: full.stake, back: full.stake });
    expect(full.gain).toBe(3 * 5 + full.stake);
    expect(short.res).toMatchObject({ short: 1, back: 0 });
    expect(short.gain).toBe(2 * 5); // paid for what it delivered; the stake stays lost
    expect(none.res).toMatchObject({ short: 3, back: 0, sales: [] });
    expect(none.gain).toBe(0);
    expect(book.paid).toBe(Math.floor(book.stake / 2));
    expect(book.res.sales).toEqual([{ player: 0, n: 3, price: 5 + 2 }]);
    expect(book.gain).toBe(3 * (5 + 2) + Math.floor(book.stake / 2));
  });

  it('bids stay secret from other players until every stall has bid', () => {
    let s = marketDay(3);
    s = bidOrder(s, 0, 4);
    expect(redact(s, 1).standing!.bids).toEqual([null, null, null]);
    for (const p of [1, 2]) s = bidOrder(s, p, 8);
    expect(redact(s, 1).standing!.bids).toEqual([4, 8, 8]);
  });

  it('computer stalls bid, buy for the order and usually deliver it; whole games finish at every table size', () => {
    let orders = 0, full = 0;
    for (const n of [2, 3, 4, 5, 6]) for (let seed = 1; seed <= 6; seed++) {
      let s = newGame(ais(n, seed));
      for (let i = 0; i < 6000 && s.phase !== 'over'; i++) {
        if (s.phase === 'order') expect(planOrderBid(s, s.standing!.bids.findIndex((b) => b === null)) ?? 1).toBeGreaterThanOrEqual(1);
        const before = s.phase;
        s = autoplay(s, 1);
        if (before !== 'reveal' && s.phase === 'reveal' && s.results!.order) { orders++; if (s.results!.order.short === 0) full++; }
      }
      expect(s.phase, `${n} stalls, seed ${seed}`).toBe('over');
    }
    expect(orders).toBeGreaterThan(20);
    expect(full / orders).toBeGreaterThan(0.4);
  });
});

describe('rules 14: upgrades', () => {
  it('five upgrades, and a stall has room for two', () => {
    expect(Object.keys(UPGRADES).sort()).toEqual(['barrow', 'juicebar', 'orderbook', 'premium', 'ripening']);
    expect(MAX_UPGRADES).toBe(2);
    const s = structuredClone(newGame(humans(2)));
    s.day = 3; s.phase = 'evening'; s.turn = 0; s.order = [0, 1];
    s.players[0].cash = 50; s.players[0].upgrades = ['barrow', 'juicebar']; s.players[0].upgradeOffer = ['premium'];
    expect(canUpgrade(s, 0, 'premium')).toMatch(/room for 2/);
    s.players[0].upgrades = ['barrow'];
    expect(canUpgrade(s, 0, 'premium')).toBeNull();
  });

  it('Ripening Room: green mangoes sit one night from ripe, those bought later and those already on the shelf', () => {
    const ripe = FRUIT.mango.ripe.length, top = ripe + FRUIT.mango.unripeSlots - 1;
    const pl = structuredClone(newGame(humans(2)).players[0]);
    expect(shelfPos(pl, 'mango', top)).toBe(top);
    pl.upgrades = ['ripening'];
    expect(shelfPos(pl, 'mango', top)).toBe(ripe);
    expect(shelfPos(pl, 'mango', ripe - 1)).toBe(ripe - 1); // ripe fruit is not moved
    expect(shelfPos(pl, 'apple', 3)).toBe(3);
    const s = structuredClone(newGame(humans(2)));
    s.day = 3; s.phase = 'evening'; s.turn = 0; s.order = [0, 1];
    s.players[0].cash = 50; s.players[0].upgradeOffer = ['ripening']; s.players[0].stock.mango[top] = 2;
    const g = applyAction(s, 0, { kind: 'upgrade', upgrade: 'ripening' });
    expect(g.players[0].stock.mango[top]).toBe(0);
    expect(g.players[0].stock.mango[ripe]).toBe(2);
  });
});
