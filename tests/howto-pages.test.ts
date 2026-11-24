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

// PLAN-127: the Rules page redesign. Six pages, the tips beside their rules, and the Try a sale reveal worked out by
// the rule (cheapest first, only a freshness the customer buys, until the order is full), not typed in by hand.

describe('How to play pages', () => {
  it('has the seven pages, in order, with no page of tips', () => {
    const src = readFileSync('src/ui/HowTo.tsx', 'utf8');
    const titles = [...src.matchAll(/\{ part: '[^']*', title: '((?:[^'\\]|\\')+)'/g)].map((m) => m[1].replace(/\\'/g, "'"));
    expect(titles).toEqual(['How to play', "Today's customers", 'One market day', 'Fruit & freshness', 'Try a sale', 'Favours & closing', 'Market Days & the end']);
    expect(titles).not.toContain('Tips');
  });

  it('opens on How to play with the starting cash and "Most cash wins."', () => {
    const html = toStaticHtml(h(HowTo, { onDone: () => undefined, inTab: true }));
    expect(html).toContain('1/7');
    expect(html).toContain('Each stall starts with');
    expect(html).toContain('against rival stalls.');
    expect(html).not.toContain('1 to 5 rival');
    expect(html).toContain('$10');
    expect(html).toContain('Most cash wins.');
    expect(html).toContain('class="ht-tabs"');
  });

  it('each tip stands where its decision is made', () => {
    const src = readFileSync('src/ui/HowTo.tsx', 'utf8');
    const at = (s: string) => src.indexOf(s);
    // blueberry spoilage beside freshness, rival-buying memory beside Stocking, the top-up under Running out of cash
    expect(at('Blueberries are cheap but last only 3 days.')).toBeGreaterThan(at('function Freshness('));
    expect(at('Watch what rivals take while they buy.')).toBeGreaterThan(at('<b>Stocking</b>'));
    expect(at('is topped up to $${TOP_UP}')).toBeGreaterThan(at('title="Running out of cash"'));
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
