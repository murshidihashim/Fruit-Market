import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { h } from 'preact';
import { TradingCardBack, toStaticHtml } from '../src/ui/cards';
import { CUSTOMER_CARDS, FARMER_CARDS, FRUIT, lookOf, prefOf } from '../src/engine/data';
import { HowTo, PAGES, SALE_BUYER, TrySale, saleOrder } from '../src/ui/HowToBook';
import { HowTo as HowToOnDemand, howTo } from '../src/ui/HowTo';
import { Freshness, WhoBuys } from '../src/ui/howtoRules';
import { LANES } from '../src/ui/boardModel';
import { TIE_ORDER, TIE_ORDER_CARD } from '../src/ui/rulesText';
import { BellNotice, tieOrderLine } from '../src/ui/panel';
import { TIPS } from '../src/ui/tutorial';
import { practiceRound, practiceVerdict } from '../src/ui/practice';
import { dailyConfig } from '../src/engine/daily';
import { newGame } from '../src/engine/game';

// toStaticHtml draws hook-free trees: the hooks hold their first value here (as tests/home-cards.test.ts does).
vi.mock('preact/hooks', () => ({
  useState: (v: unknown) => [typeof v === 'function' ? (v as () => unknown)() : v, () => undefined],
  useEffect: () => undefined, useLayoutEffect: () => undefined,
  useRef: (v: unknown) => ({ current: v }), useMemo: (f: () => unknown) => f(), useCallback: (f: unknown) => f,
}));

// PLAN-129: the Rules page redesign. Seven pages in the owner's order, one screen each, and the Try a sale reveal worked
// out by the rule (cheapest first, only a freshness the customer buys, until the order is full), not typed in by hand.

describe('How to play pages', () => {
  it('has the seven pages, in the owner\'s order, each a tab of the drawn page', () => {
    const titles = ['How to play', 'Fruit & freshness', 'Lorry & event', 'Customer', 'Favour', 'Market Day', 'Try a sale'];
    expect(PAGES.map((p) => p.title)).toEqual(titles);
    const tabs = /class="ht-tabs"[^>]*>([\s\S]*?)<\/nav>/.exec(toStaticHtml(h(HowTo, { onDone: () => undefined, inTab: true })))?.[1] ?? '';
    expect([...tabs.matchAll(/>([^<>]+)<\/button>/g)].map((m) => m[1].replace(/&amp;/g, '&'))).toEqual(titles);
  });

  it('opens on How to play with the starting cash, "Most cash wins." and the day\'s four turns', () => {
    const html = toStaticHtml(h(HowTo, { onDone: () => undefined, inTab: true }));
    expect(html).toContain('1/7');
    expect(html).not.toContain('Play a day');
    expect(html).toContain('Every day, every stall');
    for (const t of ['Buy', 'Stock', 'Price', 'Rush']) expect(html).toContain(`<b>${t}</b>`);
    expect(html).toContain('Each stall starts with');
    expect(html).toContain('against rival stalls.');
    expect(html).toContain('$10');
    expect(html).toContain('Most cash wins.');
    expect(html).toContain('class="ht-tabs"');
  });

  it('the customer page names the favour card and draws the regular\'s own card face down', () => {
    const page = PAGES.find((p) => p.title === 'Customer')!;
    const html = toStaticHtml(h('div', null, page.body()));
    expect(html).toContain("Serve a customer's whole order by yourself to gain a Favour card.");
    // today's regular (Aisyah, 3 watermelons) is drawn face up, and her card face down shows only the fruit she wants
    expect(html).toContain(toStaticHtml(h(TradingCardBack, { fruits: ['watermelon'] })));
    // who buys what sits behind the (i) on the Customer page, not on Fruit & freshness
    expect(page.info?.label).toBe('Who buys what');
    expect(toStaticHtml(h('div', null, page.info!.card()))).toBe(toStaticHtml(h('div', null, h(WhoBuys, {}))));
    expect(PAGES.filter((p) => p.info).map((p) => p.title)).toEqual(['Customer']);
  });

  it('the market board is filled from a real lorry card at three stalls, and every fruit has a card to open', () => {
    const html = toStaticHtml(h(Freshness, {}));
    expect(html).toContain('There are 4 fruits in the game: blueberry, watermelon, mango and apple.');
    const card = FARMER_CARDS.find((c) => c.name === 'Mixed Basket')!;
    expect(html).toContain(`${card.name} · 3 stalls`);
    const lanes = html.split('class="ht-lane-v ln-').slice(1);
    expect(lanes.map((l) => l.slice(0, l.indexOf('"')))).toEqual(LANES);
    LANES.forEach((f, k) => {
      const n = card.table[3][f];
      expect(lanes[k], f).toContain(n > 1 ? `<b>×${n}</b>` : 'class="ht-tkn"');
      expect(lanes[k], f).toContain(`aria-label="${FRUIT[f].name}: see its card"`);
    });
  });

  it('is loaded on demand: the way in draws the same page once its code is here (REP-140 A-08)', async () => {
    await howTo.load();
    expect(howTo.ready()).toBe(true);
    const props = { onDone: () => undefined, inTab: true };
    expect(toStaticHtml(h(HowToOnDemand, props))).toBe(toStaticHtml(h(HowTo, props)));
  });
});

describe('Try a sale', () => {
  // REP-140 C-06: the example customer's own card wants exactly what the example says, and RULES.md tells the same one.
  it('the example is true to the card: Hadi Hammer, an Everyday customer, wants 3 blueberries at up to $5 and nothing else', () => {
    const card = CUSTOMER_CARDS.find((c) => c.name === SALE_BUYER.who)!;
    expect(card.wants).toEqual([{ fruit: SALE_BUYER.fruit, qty: SALE_BUYER.qty, max: SALE_BUYER.max }]);
    expect(prefOf(card.name)).toBe('everyday');
    expect(SALE_BUYER.name).toBe(lookOf(card.name).title);
    const rules = readFileSync('RULES.md', 'utf8');
    const example = rules.slice(rules.indexOf('### One customer, start to finish'), rules.indexOf('## Goal'));
    expect(example).toContain(`${SALE_BUYER.name} wants **3 blueberries** and pays up to **$5** for a Fresh one`);
    expect(example).toContain(`${SALE_BUYER.name} buys from the **cheapest stall** first.`);
    expect(example).toContain('he is an Everyday customer');
    expect(example).not.toContain('Bobby Books');
  });

  it('Hadi Hammer (Fresh or Okay): one Okay from B at $3, then two Fresh from A at $4; C sells nothing', () => {
    expect(saleOrder('everyday')).toEqual([
      { stall: 'B', k: 0, price: 3, stage: 'okay' },
      { stall: 'A', k: 0, price: 4, stage: 'fresh' },
      { stall: 'A', k: 1, price: 4, stage: 'fresh' },
    ]);
  });

  it('Fresh only: B\'s Okay piece is skipped, A sells 2 at $4, then C 1 at $5', () => {
    expect(saleOrder('premium').map((p) => [p.stall, p.price])).toEqual([['A', 4], ['A', 4], ['C', 5]]);
  });
});

// REP-133 B-17 (moved here from review-133-b.test.ts, which read the source text; REP-140 A-01): one tie wording.
describe('the tie wording', () => {
  it('Try a sale words the tie rule as the pricing panel does', () => {
    expect(toStaticHtml(h(TrySale, {}))).toContain(`Otherwise ties go: ${TIE_ORDER} in today's buying.`);
  });

  it('the old wordings are gone from what the screens say: How to play, the tips, the price practice and the bell card', () => {
    const said = [
      ...PAGES.map((p) => toStaticHtml(h('div', null, p.body(), p.info?.card()))),
      ...TIPS.map((t) => t.text),
      ...Array.from({ length: 60 }, (_, n) => { const r = practiceRound(n); return r.options.map((o) => practiceVerdict(r, o).text).join(' '); }),
      toStaticHtml(h(BellNotice, { onClose: () => undefined })),
      tieOrderLine(newGame(dailyConfig('2026-11-22', 'You')), 9),
    ].join('\n');
    expect(said).toContain(TIE_ORDER_CARD);
    expect(said).not.toContain('whoever bought');
    expect(said).not.toContain('fresher fruit, then');
  });
});
