// Pricing at the bell (PLAN-059): the demand board, your crate as the price buttons, and "The Bell" notice.
import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import { emptyStock, newGame, submitPrices, type Customer, type GameState } from '../src/engine/game';
import { FRUIT, type FruitId } from '../src/engine/data';
import { buyersAt, demandBoard } from '../src/ui/boardModel';
import { BellNotice, PricePanelView, bellOpensOnStart, startingPrices } from '../src/ui/panel';
import { PricingTableView } from '../src/ui/game/panels/PricingTable';
import { toStaticHtml } from '../src/ui/cards';

const FRESH = (f: FruitId) => FRUIT[f].ripe.length - 1;
const OKAY = (f: FruitId) => FRUIT[f].ripe.lastIndexOf('okay');
const buyer = (id: number, f: FruitId, qty: number, max: number, pref: Customer['pref'] = 'everyday'): Customer =>
  ({ id, name: `C${id}`, pref, wants: [{ fruit: f, qty, max }], original: [{ fruit: f, qty, max }] });

/** The pricing screen as PricePanel first draws it. */
const panel = (s: GameState) => toStaticHtml(h(PricePanelView, {
  s, p: 0, vals: startingPrices(s, 0), sel: 'watermelon', favoured: false, notice: bellOpensOnStart(s),
  onPrice: () => undefined, onPick: () => undefined, onFavoured: () => undefined, onNotice: () => undefined, onSubmit: () => undefined,
}));

/** Three stalls at the bell on `day`: you have 2 fresh watermelons and 2 okay apples; Saleh 3 watermelons; Kiki sealed. */
function bell(day = 2): GameState {
  const g = newGame({ players: [
    { name: 'You', kind: 'human', avatar: '🦊' }, { name: 'Saleh', kind: 'ai', level: 'normal', avatar: '🐸' }, { name: 'Kiki', kind: 'ai', level: 'normal', avatar: '🐷' },
  ], days: 10, unripe: true, upgrades: true, events: false, seed: 4 });
  const s: GameState = structuredClone(g);
  s.day = day; s.phase = 'bid'; s.event = null;
  s.players.forEach((pl) => { pl.stock = emptyStock(true); pl.favours = []; });
  s.players[0].stock.watermelon[FRESH('watermelon')] = 2;
  s.players[0].stock.apple[OKAY('apple')] = 2;
  s.players[1].stock.watermelon[FRESH('watermelon')] = 3;
  s.players[2].stock.mango[FRESH('mango')] = 1;
  s.stalls = [{ watermelon: 2, apple: 2 }, { watermelon: 3 }, { mango: 1 }];
  s.bids = [null, null, [{ fruit: 'mango', price: 97 }]];
  // Watermelon: 1 up to $9, 2 more up to $8, 2 more up to $7. Apple (fresh tops): 1 at $10, 2 at $9; Premium won't take okay.
  s.firstMarket = [buyer(1, 'watermelon', 1, 9), buyer(2, 'watermelon', 2, 8), buyer(3, 'watermelon', 2, 7),
    buyer(4, 'apple', 1, 10), buyer(5, 'apple', 2, 9), buyer(6, 'apple', 3, 9, 'premium')];
  s.secondMarket = [];
  return s;
}

describe('the demand board', () => {
  it('counts pieces wanted and out, and buyers at each price where the count changes', () => {
    const rows = demandBoard(bell(), 0);
    const melon = rows.find((r) => r.f === 'watermelon')!;
    expect(melon).toMatchObject({ wanted: 5, out: 5, mine: true });
    expect(melon.steps).toEqual([{ price: 9, buyers: 1 }, { price: 8, buyers: 3 }, { price: 7, buyers: 5 }]);
    // Your okay apples: $1 under each top, and the Premium buyer never takes them.
    const apple = rows.find((r) => r.f === 'apple')!;
    expect(apple).toMatchObject({ wanted: 6, out: 2, mine: true });
    expect(apple.steps).toEqual([{ price: 9, buyers: 1 }, { price: 8, buyers: 3 }]);
    // A fruit you don't have reads the fresh tops; nobody wants mango, but Kiki has one out.
    expect(rows.find((r) => r.f === 'mango')).toMatchObject({ wanted: 0, out: 1, steps: [] });
    expect(rows.map((r) => r.f)).toEqual(['watermelon', 'apple', 'mango']);
  });

  it('every buyer count holds when the bell rings at that price as the only stall', () => {
    const s = bell();
    for (const price of [7, 8, 9, 10]) {
      const n = buyersAt(s, 0, 'watermelon', price);
      let g = structuredClone(s);
      g.stalls = [{ watermelon: 2 }, {}, {}];
      g.bids = [null, [], []];
      g = submitPrices(g, 0, [{ fruit: 'watermelon', price }]);
      const sold = g.results!.lines.reduce((a, l) => a + (l.offers.find((o) => o.player === 0)?.sold ?? 0), 0);
      expect(sold, `$${price}`).toBe(Math.min(2, n));
    }
  });
});

describe('your crate and the price bubble', () => {
  it('every crate is drawn; only your crate has price buttons, and a sealed price never shows', () => {
    const s = bell();
    const html = panel(s);
    expect(html.match(/class="crate[ "]/g)).toHaveLength(3);
    expect(html.match(/crate-slot pick/g)).toHaveLength(2);
    expect(html).toContain('Your crate');
    expect(html).not.toMatch(/\$97|>97</);
    expect(html).toContain('class="pbub"');
    const table = toStaticHtml(h(PricingTableView, { s, viewer: 0 }));
    expect(table).not.toContain('crate-slot pick');
    expect(table).toContain('prices sealed');
  });
});

describe('"The Bell" notice', () => {
  it('opens by itself on Day 1 only; later days keep it behind the i button', () => {
    const day1 = panel(bell(1));
    expect(day1).toContain('class="bell-notice"');
    const day2 = panel(bell(2));
    expect([1, 2, 3, 10].map((d) => bellOpensOnStart(bell(d)))).toEqual([true, false, false, false]);
    expect(day2).not.toContain('class="bell-notice"');
    expect(day2).toContain('aria-label="How the bell works"');
  });

  it("says the crier's five lines, in the engine's tie order", () => {
    const html = toStaticHtml(h(BellNotice, { onClose: () => undefined }));
    for (const line of ['THE BELL', 'Price every fruit you put out!', 'Prices stay secret until the bell.', 'Lowest price sells first!',
      'A tie? Favoured Trade, then freshest fruit, then the Haggler, then the early bird.', 'Fulfil all of a customer’s orders to earn a favour card.']) {
      expect(html).toContain(line);
    }
    expect(html.match(/class="bn-badge"/g)).toHaveLength(5);
  });
});
