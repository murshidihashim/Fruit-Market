// Pricing at the bell (PLAN-059): your crate as the price buttons, and "The Bell" notice. (The demand board left the
// screen in PLAN-085; PLAN-130 removed it and its test, REP-140 A-04.)
import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import { emptyStock, newGame, type Customer, type GameState } from '../src/engine/game';
import { FRUIT, type FruitId } from '../src/engine/data';
import { BellNotice, PriceBar, PriceSheetView, startingPrices } from '../src/ui/panel';
import { toStaticHtml } from '../src/ui/cards';
import { PreView } from '../src/ui/game/panels/RushTable';
import { preTable } from '../src/ui/game/tableNow';

const FRESH = (f: FruitId) => FRUIT[f].ripe.length - 1;
const OKAY = (f: FruitId) => FRUIT[f].ripe.lastIndexOf('okay');
const buyer = (id: number, f: FruitId, qty: number, max: number, pref: Customer['pref'] = 'everyday'): Customer =>
  ({ id, name: `C${id}`, pref, wants: [{ fruit: f, qty, max }], original: [{ fruit: f, qty, max }] });

/** The pricing step as the round table's sheet first draws it (PLAN-099): the rows, and the main button under them. */
const panel = (s: GameState) => toStaticHtml([
  h(PriceSheetView, { s, p: 0, vals: startingPrices(s, 0), notice: false, onPrice: () => undefined, onNotice: () => undefined }),
  h(PriceBar, { s, p: 0, vals: startingPrices(s, 0), onSubmit: () => undefined }),
]);
/** The round table above the sheet, at a step before the bell. */
const round = (s: GameState, step: 'price' | 'sealed', vals: Record<string, number> | null) => toStaticHtml(h(PreView, { s, viewer: 0, pre: preTable(s, 0, {
  step, sent: null, own: null, vals, open: null, asked: -1, mine: false, online: false, waiting: '', shared: false, answered: false, left: null,
}) }));

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

describe('every crate is open, and your price rows', () => {
  it('each fruit you put out has its own price row; a rival is only a number of pieces, and a sealed price never shows', () => {
    const s = bell();
    const html = panel(s);
    // PLAN-099: the rivals' crates sit round the table above the sheet; the sheet holds your own rows and how a tie falls
    expect(html).toContain('Your secret prices');
    expect(html.match(/class="ps-row /g)).toHaveLength(2); // your watermelons and your apples
    expect(html.match(/class="ds-dial"/g)).toHaveLength(2);
    expect(html).toContain('2 out');
    expect(html).toContain('Ties: fresher, then the Haggler, then earlier.');
    expect(html).not.toMatch(/\$97|>97</);
    expect(html).toContain('Ring the bell');
    expect(html).toContain('seal 2 prices');
    // the table above it: how many pieces each rival put out, never which fruit; your tags as you set them
    const own = startingPrices(s, 0);
    const table = round(s, 'price', own);
    expect(table).toContain('Saleh: 3 pieces, face down, 3 out');
    expect(table).toContain('Kiki: 1 piece, face down, 1 out');
    expect(table).not.toMatch(/\$97|>97</);
    for (const [f, price] of Object.entries(own)) {
      expect(table).toContain(`data-a="rt-tag-0-${f}"`);
      expect(table).toContain(`<b>$${price}</b>`);
    }
    // once you have rung the bell your tags lie face down: no price of yours is drawn, and the sheet's button is gone
    const sealed = round(s, 'sealed', null);
    expect(sealed.match(/class="rt-tg [^"]*down/g)).toHaveLength(2);
    for (const price of Object.values(own)) expect(sealed).not.toContain(`$${price}<`);
    expect(sealed).not.toContain('Ring the bell');
    expect(toStaticHtml(h(PriceBar, { s, p: 0, vals: own, sealed: true, onSubmit: () => undefined }))).toMatch(/<button[^>]*disabled/);
  });
});

describe('"The Bell" notice', () => {
  it('stays behind the i button (PLAN-064: the round table opens the sheet with it closed), Day 1 included', () => {
    const day1 = panel(bell(1));
    expect(day1).not.toContain('class="bell-notice"');
    expect(day1).toContain('aria-label="How the bell works"');
    const day2 = panel(bell(2));
    expect(day2).not.toContain('class="bell-notice"');
    expect(day2).toContain('aria-label="How the bell works"');
    // the i button opens it
    const s = bell(1);
    expect(toStaticHtml(h(PriceSheetView, { s, p: 0, vals: startingPrices(s, 0), notice: true, onPrice: () => undefined, onNotice: () => undefined }))).toContain('class="bell-notice"');
  });

  it("says the crier's lines, in the engine's tie order", () => {
    const html = toStaticHtml(h(BellNotice, { onClose: () => undefined }));
    for (const line of ['THE BELL', 'Set one price for each fruit in your crate.', 'Prices stay secret until the bell.', 'Crates stay shut until the bell. You only see how many pieces are in each.', 'The lowest price sells first.',
      'Ties: Favoured Trade, then fresher, then the Haggler, then earlier.', 'Serve a customer’s whole order by yourself to earn a favour card.']) {
      expect(html).toContain(line);
    }
    expect(html.match(/class="bn-badge"/g)).toHaveLength(6);
  });
});
