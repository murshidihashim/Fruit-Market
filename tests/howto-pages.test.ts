import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { h } from 'preact';
import { toStaticHtml } from '../src/ui/cards';
import { HowTo, saleOrder } from '../src/ui/HowTo';

// toStaticHtml draws hook-free trees: the hooks hold their first value here (as tests/home-cards.test.ts does).
vi.mock('preact/hooks', () => ({
  useState: (v: unknown) => [typeof v === 'function' ? (v as () => unknown)() : v, () => undefined],
  useEffect: () => undefined, useLayoutEffect: () => undefined,
  useRef: (v: unknown) => ({ current: v }), useMemo: (f: () => unknown) => f(), useCallback: (f: unknown) => f,
}));

// PLAN-127: the Rules page redesign. Eight pages in the owner's order, one screen each, and the Try a sale reveal worked
// out by the rule (cheapest first, only a freshness the customer buys, until the order is full), not typed in by hand.

describe('How to play pages', () => {
  it('has the eight pages, in the owner\'s order', () => {
    const src = readFileSync('src/ui/HowTo.tsx', 'utf8');
    const titles = [...src.matchAll(/\{ title: '((?:[^'\\]|\\')+)'/g)].map((m) => m[1].replace(/\\'/g, "'"));
    expect(titles).toEqual(['How to play', 'Fruit & freshness', 'Customer', 'Favour', 'Lorry', 'Event', 'Market Day', 'Try a sale']);
  });

  it('opens on How to play with the starting cash, "Most cash wins." and the day\'s four turns', () => {
    const html = toStaticHtml(h(HowTo, { onDone: () => undefined, inTab: true }));
    expect(html).toContain('1/8');
    expect(html).toContain('Every day, every stall');
    for (const t of ['Buy', 'Stock', 'Price', 'Rush']) expect(html).toContain(`<b>${t}</b>`);
    expect(html).toContain('Each stall starts with');
    expect(html).toContain('against rival stalls.');
    expect(html).toContain('$10');
    expect(html).toContain('Most cash wins.');
    expect(html).toContain('class="ht-tabs"');
  });

  it('the customer page names the favour card and draws the regular\'s own card face down', () => {
    const src = readFileSync('src/ui/HowTo.tsx', 'utf8');
    expect(src).toContain("Serve a customer's whole order by yourself to gain a Favour card.");
    expect(src).toContain('<TradingCardBack fruits={fruitsOf(TODAY_REG)} />');
  });
});

describe('Try a sale', () => {
  it('Bobby Books (Fresh or Okay): one Okay from B at $3, then two Fresh from A at $4; C sells nothing', () => {
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
