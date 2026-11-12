// Pricing at the bell (PLAN-059): the demand board, your crate as the price buttons, and "The Bell" notice.
import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import { emptyStock, newGame, submitPrices, type Customer, type GameState } from '../src/engine/game';
import { FRUIT, type FruitId } from '../src/engine/data';
import { buyersAt, demandBoard } from '../src/ui/boardModel';
import { BellNotice, PriceBar, PricePanelView, bellOpensOnStart, startingPrices } from '../src/ui/panel';
import { toStaticHtml } from '../src/ui/cards';

const FRESH = (f: FruitId) => FRUIT[f].ripe.length - 1;
const OKAY = (f: FruitId) => FRUIT[f].ripe.lastIndexOf('okay');
const buyer = (id: number, f: FruitId, qty: number, max: number, pref: Customer['pref'] = 'everyday'): Customer =>
  ({ id, name: `C${id}`, pref, wants: [{ fruit: f, qty, max }], original: [{ fruit: f, qty, max }] });

/** The pricing step as the day's sheet first draws it (PLAN-085): the rows, and the main button under them. */
const panel = (s: GameState, sealed = false) => toStaticHtml([
  h(PricePanelView, { s, p: 0, vals: startingPrices(s, 0), notice: bellOpensOnStart(s), sealed, onPrice: () => undefined, onNotice: () => undefined }),
  h(PriceBar, { s, p: 0, vals: startingPrices(s, 0), onSubmit: () => undefined }),
]);

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

describe('every crate is open, and your price rows', () => {
  it('each fruit you put out has its own price row; a rival is only a number of pieces, and a sealed price never shows', () => {
    const s = bell();
    const html = panel(s);
    // PLAN-085: the rivals' crates are the rival boxes of the table now; the sheet holds your own rows, how a tie
    // falls, and (where it lies over the rival boxes, on a short phone) how many pieces each rival put out
    expect(html).toContain('Your secret prices');
    expect(html).toContain('Saleh 3 · Kiki 1 out'); // how many, never which fruit
    expect(html.match(/class="ds-prow /g)).toHaveLength(2); // your watermelons and your apples
    expect(html.match(/class="ds-dial"/g)).toHaveLength(2);
    expect(html).toContain('2 out');
    expect(html).toContain('The fresher piece sells first, then the Haggler, then whoever bought earlier.');
    expect(html).not.toMatch(/\$97|>97</);
    expect(html).toContain('Ring the bell');
    expect(html).toContain('seal 2 prices');
    // once you have rung the bell your tags lie face down: no price of yours is drawn, and nothing can be changed
    const own = startingPrices(s, 0);
    const sealed = toStaticHtml(h(PricePanelView, { s, p: 0, vals: own, notice: false, sealed: true, onPrice: () => undefined, onNotice: () => undefined }));
    expect(sealed.match(/class="ds-tag-back"/g)).toHaveLength(2);
    expect(sealed).not.toContain('ds-tag-face');
    for (const price of Object.values(own)) expect(sealed).not.toContain(`$${price}<`);
    expect(sealed.match(/<button[^>]*class="ds-st"[^>]*disabled/g)).toHaveLength(4);
  });
});

describe('"The Bell" notice', () => {
  it('never opens by itself (PLAN-064): it stays behind the i button, Day 1 included', () => {
    const day1 = panel(bell(1));
    expect(day1).not.toContain('class="bell-notice"');
    expect(day1).toContain('aria-label="How the bell works"');
    const day2 = panel(bell(2));
    expect([1, 2, 3, 10].map((d) => bellOpensOnStart(bell(d)))).toEqual([false, false, false, false]); // never by itself (PLAN-064)
    expect(day2).not.toContain('class="bell-notice"');
    expect(day2).toContain('aria-label="How the bell works"');
  });

  it("says the crier's lines, in the engine's tie order", () => {
    const html = toStaticHtml(h(BellNotice, { onClose: () => undefined }));
    for (const line of ['THE BELL', 'Set one price for each fruit in your crate.', 'Prices stay secret until the bell.', 'Crates stay shut until the bell: you only see how many pieces.', 'The lowest price sells first.',
      'Ties: Favoured Trade, then fresher fruit, then the Haggler, then whoever bought earlier today.', 'Serve a customer’s whole order by yourself to earn a favour card.']) {
      expect(html).toContain(line);
    }
    expect(html.match(/class="bn-badge"/g)).toHaveLength(6);
  });
});
