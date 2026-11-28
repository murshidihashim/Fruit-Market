// S2 (PLAN-107, REP-122): stocking and pricing on a standing order's due day. The order is served first, from its
// holder's crate (Fresh or Okay pieces, freshest first), so its pieces count as wanted, Auto load puts them in, the
// shelf rows say who they are for, the main button never says "Sell nothing today" while the order can be delivered,
// and the pricing words never say "nobody takes yours" of pieces the order takes. No rule changes: the rush is the
// engine's own.
import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import { FRUIT, ORDER_CARDS, type FruitId } from '../src/engine/data';
import {
  beginBuying, bidOrder, emptyStock, newGame, openStall, submitPrices, type Customer, type GameConfig, type GameState,
} from '../src/engine/game';
import { customersWanted, orderWanted, stallWantText } from '../src/ui/boardModel';
import { toStaticHtml } from '../src/ui/cards';
import { PriceSheetView, StallBar, autoCrate, orderPriceNote, shelfRowText, stakeAtRisk, startingCrate } from '../src/ui/panel';
import { endBuying, passEvening } from './stall-step';

const FRESH = (f: FruitId) => FRUIT[f].ripe.length - 1;
const OKAY = (f: FruitId) => FRUIT[f].ripe.indexOf('okay');
const SOFT = 0;
const shelf = (f: FruitId, at: Record<number, number>) => { const t = emptyStock(true)[f]; for (const [i, n] of Object.entries(at)) t[Number(i)] = n; return t; };
const humans = (n: number): GameConfig => ({
  players: Array.from({ length: n }, (_, i) => ({ name: `P${i}`, kind: 'human' as const, avatar: '' })),
  days: 10, unripe: true, upgrades: true, events: false, seed: 3,
});
const buyer = (id: number, f: FruitId, qty: number, max: number, pref: Customer['pref'] = 'everyday'): Customer =>
  ({ id, name: `C${id}`, pref, wants: [{ fruit: f, qty, max }], original: [{ fruit: f, qty, max }] });

/**
 * Stall 0 wins the first Market Day's standing order at $5 a piece; then the stocking step of its due day, with stall 0
 * holding `mine` of the order's fruit and stall 1 `rival`, and `crowd` the only customers besides the order.
 */
function dueDay(mine: Record<number, number>, rival: Record<number, number> = {}, crowd: (f: FruitId) => Customer[] = () => []) {
  const s0 = structuredClone(newGame(humans(2)));
  s0.players.forEach((p) => { p.stock = emptyStock(true); p.trait = null; p.traitOffer = []; p.favours = []; p.upgrades = []; p.cash = 30; });
  s0.day = 2; s0.phase = 'evening'; s0.turn = 0; s0.order = [0, 1]; s0.event = null; s0.results = null;
  let s = beginBuying(passEvening(s0));
  expect(s.phase).toBe('order');
  s = bidOrder(bidOrder(s, 0, 5), 1, null);
  const o = structuredClone(s.standing!);
  const f = o.fruit;
  s = structuredClone(s);
  s.day = o.due; s.phase = 'buy'; s.turn = 0; s.event = null; s.forecast = null; s.queue = []; s.nextForecast = null; s.nextQueue = [];
  s.players[0].stock[f] = shelf(f, mine);
  s.players[1].stock[f] = shelf(f, rival);
  s = endBuying(s);
  s.firstMarket = [...s.firstMarket.filter((c) => c.order), ...crowd(f)];
  s.secondMarket = [];
  return { s, o, f, title: ORDER_CARDS[o.card].title };
}

/** Opens both stalls (stall 0 with `crate`, stall 1 with its whole shelf of the fruit), prices at `price`, and rings the bell. */
function rush(s: GameState, f: FruitId, crate: ReturnType<typeof autoCrate>, price = 1) {
  const n = (t: number[] | undefined) => (t ?? []).reduce((a, b) => a + b, 0);
  let g = openStall(s, 0, n(crate[f]) ? { [f]: n(crate[f]) } : {}, crate);
  const r = g.players[1].stock[f].slice(0, FRUIT[f].ripe.length).reduce((a, b) => a + b, 0);
  g = openStall(g, 1, r ? { [f]: r } : {});
  for (const p of [0, 1]) if (g.phase === 'bid' && g.bids[p] === null) g = submitPrices(g, p, [{ fruit: f, price }]);
  expect(g.phase).toBe('reveal');
  return g;
}

describe('S2: a standing order on its due day, as its holder stocks', () => {
  it('the worst case from the review: exactly the order\'s pieces, and no other customer wants the fruit', () => {
    const { s, o, f, title } = dueDay({ [FRESH(f0())]: 3 });
    expect(o.qty).toBe(3);
    expect(customersWanted(s, 0, f)).toBe(0);
    expect(orderWanted(s, 0, f)).toBe(3);
    expect((customersWanted(s, 0, f) + orderWanted(s, 0, f))).toBe(3);
    expect(stallWantText(s, 0, f)).toBe(`3 for ${title}`);
    expect(shelfRowText(s, 0, f, FRESH(f))).toBe(`3 for ${title}`);
    // Auto load puts the three in; the main button never offers to sell nothing while the order can be delivered.
    const crate = autoCrate(s, 0, startingCrate(s, 0));
    expect(crate[f]![FRESH(f)]).toBe(3);
    expect(stakeAtRisk(s, 0)).toBe(o.staked);
    const empty = toStaticHtml(h(StallBar, { total: 0, stake: stakeAtRisk(s, 0), onSubmit: () => undefined, onAuto: () => undefined }));
    expect(empty).not.toContain('Sell nothing today');
    expect(empty).toContain('Deliver nothing today');
    expect(empty).toContain(`$${o.staked} stake lost`);
    // Following the screen now delivers the order in full and brings the stake back.
    const g = rush(s, f, crate);
    expect(g.results!.order).toMatchObject({ holder: 0, qty: 3, short: 0, back: o.staked });
  });

  it('pricing says the order takes those pieces at its own price, never "nobody takes yours"', () => {
    const { s, o, f, title } = dueDay({ [FRESH(f0())]: 3 });
    const crate = autoCrate(s, 0, startingCrate(s, 0));
    let g = openStall(s, 0, { [f]: 3 }, crate);
    g = openStall(g, 1, {});
    expect(g.phase).toBe('bid');
    const html = toStaticHtml(h(PriceSheetView, { s: g, p: 0, vals: { [f]: 1 }, notice: false, onPrice: () => undefined, onNotice: () => undefined }));
    expect(html).toContain(`<span>3 for ${title}</span>`);
    expect(html).toContain(`${title} takes all 3 at $${o.price} each, whatever price you set.`);
    expect(html).not.toContain('nobody takes');
    expect(html).not.toContain('Nobody wants');
    // With more pieces out than the order takes, the price is said to be for the rest.
    expect(orderPriceNote(title, 3, 5, 7)).toBe(`${title} takes 3 at $7 each, whatever price you set. Your price is for the other 2.`);
  });

  it('with more pieces than the order: the order gets the freshest it takes, the customers the rest, and both are served', () => {
    // 2 Fresh, 2 Okay and 1 Soft; a customer who takes any ripe piece wants 2 more.
    const f = f0();
    const { s, o, title } = dueDay({ [FRESH(f)]: 2, [OKAY(f)]: 2, [SOFT]: 1 }, {}, (x) => [buyer(70, x, 2, 9, 'bargain')]);
    expect(customersWanted(s, 0, f)).toBe(2);
    expect((customersWanted(s, 0, f) + orderWanted(s, 0, f))).toBe(o.qty + 2);
    expect(shelfRowText(s, 0, f, FRESH(f))).toMatch(new RegExp(`^3 for ${title} · 2 wanted`));
    // The Soft row is not for the order, which takes Fresh or Okay only.
    expect(shelfRowText(s, 0, f, SOFT)).toMatch(/^2 wanted/);
    const crate = autoCrate(s, 0, startingCrate(s, 0));
    expect(crate[f]![FRESH(f)]).toBe(2);
    expect(crate[f]!.reduce((a, b) => a + b, 0)).toBe(5);
    const g = rush(s, f, crate, 3);
    expect(g.results!.order).toMatchObject({ short: 0 });
    const sold = g.results!.lines.filter((l) => l.name === 'C70').flatMap((l) => l.offers).filter((x) => x.player === 0).reduce((a, x) => a + x.sold, 0);
    expect(sold).toBe(2);
  });

  it('pieces already in the crate count for the order first, and Auto load only tops it up', () => {
    const f = f0();
    const { s } = dueDay({ [FRESH(f)]: 2, [OKAY(f)]: 2 });
    const mine = startingCrate(s, 0);
    mine[f]![OKAY(f)] = 1;
    const crate = autoCrate(s, 0, mine);
    expect(crate[f]![OKAY(f)]).toBe(1);
    expect(crate[f]![FRESH(f)]).toBe(2);
    expect(autoCrate(s, 0, crate)).toEqual(crate);
  });

  it('a shelf with only Soft pieces of the fruit has nothing for the order; a rival is never counted for it', () => {
    const f = f0();
    const { s } = dueDay({ [SOFT]: 3 }, { [FRESH(f)]: 3 });
    expect(orderWanted(s, 0, f)).toBe(0);
    expect(stakeAtRisk(s, 0)).toBeUndefined();
    expect(stallWantText(s, 0, f)).toBe('Nobody wants these');
    expect(orderWanted(s, 1, f)).toBe(0);
    expect((customersWanted(s, 1, f) + orderWanted(s, 1, f))).toBe(0);
    expect(stakeAtRisk(s, 1)).toBeUndefined();
  });
});

/** The fruit of the first Market Day's standing order in these games. */
function f0(): FruitId {
  const s0 = structuredClone(newGame(humans(2)));
  s0.players.forEach((p) => { p.cash = 30; p.stock = emptyStock(true); p.trait = null; p.traitOffer = []; p.favours = []; p.upgrades = []; });
  s0.day = 2; s0.phase = 'evening'; s0.turn = 0; s0.order = [0, 1]; s0.event = null; s0.results = null;
  return beginBuying(passEvening(s0)).standing!.fruit;
}
