// REP-140 A-03 (PLAN-130): the freshness words and the freshness price rule on screen are the engine's. Every number the
// screens say about Okay and Soft fruit is checked here against the engine's own capAt and acceptsStage, so a rule
// change fails this test instead of teaching players the old rule. The words on screen are pinned as they are.
import { describe, expect, it, vi } from 'vitest';
import { h } from 'preact';
import { CUSTOMER_CARDS, FRUIT, FRUITS, STAGE_WORD, acceptsStage, prefOf, stageAt, type Pref } from '../src/engine/data';
import { capAt } from '../src/engine/game';
import { QUICK_FILL_MS } from '../src/net/protocol';
import { PrefLegend, prefWords, toStaticHtml } from '../src/ui/cards';
import { SALE_SAYS, TrySale, saleOrder } from '../src/ui/HowTo';
import { QUICK_NOTE } from '../src/ui/playMenu';
import { topPrice } from '../src/ui/practice';
import { OKAY_LESS, SOFT_LESS, STAGE_WORD as SCREEN_WORD, stageLess, type Ripe } from '../src/ui/stageWords';
import { STAGE_WORD as TICKET_WORD } from '../src/ui/ticket';

// toStaticHtml draws hook-free trees: the hooks hold their first value here (as tests/howto-pages.test.ts does).
vi.mock('preact/hooks', () => ({
  useState: (v: unknown) => [typeof v === 'function' ? (v as () => unknown)() : v, () => undefined],
  useEffect: () => undefined, useLayoutEffect: () => undefined,
  useRef: (v: unknown) => ({ current: v }), useMemo: (f: () => unknown) => f(), useCallback: (f: unknown) => f,
}));

const RIPE: Ripe[] = ['fresh', 'okay', 'notso'];
const PREFS: Pref[] = ['premium', 'everyday', 'bargain'];
/** The engine's top price for a piece of fruit `f` at this freshness, on a card price of `max`. */
const engineCap = (f: (typeof FRUITS)[number], stage: Ripe, max: number) => capAt(f, FRUIT[f].ripe.indexOf(stage), max);

describe('the freshness words', () => {
  it('are defined once, in the engine, and every screen reads that one table (the words on screen are unchanged)', () => {
    expect(SCREEN_WORD).toBe(STAGE_WORD);
    expect(TICKET_WORD).toBe(STAGE_WORD);
    expect(STAGE_WORD).toEqual({ unripe: 'Green', fresh: 'Fresh', okay: 'Okay', notso: 'Soft' });
  });
});

describe('the freshness price rule', () => {
  it('is the engine\'s: every ripe box of every fruit pays the card price less stageLess', () => {
    for (const f of FRUITS) {
      FRUIT[f].ripe.forEach((_, pos) => {
        const st = stageAt(f, pos) as Ripe;
        expect(capAt(f, pos, 7), `${f} box ${pos}`).toBe(7 - stageLess(st, f));
      });
    }
  });

  it('is the same for every fruit, so the legends can say one number: Okay $1 less, Soft $2 less', () => {
    for (const f of FRUITS) {
      expect(stageLess('fresh', f), f).toBe(0);
      expect(stageLess('okay', f), f).toBe(OKAY_LESS);
      expect(stageLess('notso', f), f).toBe(SOFT_LESS);
    }
    expect([OKAY_LESS, SOFT_LESS]).toEqual([1, 2]);
  });
});

describe('the customer card legend (cards.tsx)', () => {
  it('lights the freshness the engine lets each type buy, and says the engine\'s numbers', () => {
    for (const pref of PREFS) {
      const html = toStaticHtml(h(PrefLegend, { pref }));
      const okay = acceptsStage(pref, 'okay');
      const soft = acceptsStage(pref, 'notso');
      expect((html.match(/cd-lamp off/g) ?? []).length, pref).toBe(Number(!okay) + Number(!soft));
      expect(html, pref).toContain(`−$${OKAY_LESS}`);
      expect(html, pref).toContain(`−$${SOFT_LESS}`);
    }
    expect(PREFS.map(prefWords)).toEqual([
      'Premium: Fresh only.',
      `Everyday: Fresh, or Okay for $${OKAY_LESS} less. No Soft.`,
      `Bargain: Fresh, Okay for $${OKAY_LESS} less, or Soft for $${SOFT_LESS} less.`,
    ]);
    expect(prefWords('bargain')).toBe('Bargain: Fresh, Okay for $1 less, or Soft for $2 less.');
  });
});

describe('the price practice (practice.ts)', () => {
  it('a customer\'s top price for each freshness is the engine\'s cap, or none for a freshness they will not take', () => {
    for (const c of CUSTOMER_CARDS) {
      for (const w of c.wants) {
        for (const st of RIPE) {
          const pref = prefOf(c.name);
          expect(topPrice(pref, w.max, st, w.fruit), `${c.name} ${w.fruit} ${st}`).toBe(acceptsStage(pref, st) ? engineCap(w.fruit, st, w.max) : -1);
        }
      }
    }
  });
});

describe('How to play, Try a sale (HowTo.tsx)', () => {
  // Bobby Books is the rules' example: card 'Robert', 3 blueberries up to $5 for a Fresh one.
  const bobby = CUSTOMER_CARDS.find((c) => c.name === 'Robert')!.wants.find((w) => w.fruit === 'blueberry')!;

  it('says what Bobby pays for each freshness by the engine\'s numbers (the words on screen are unchanged)', () => {
    const html = toStaticHtml(h(TrySale, {}));
    const okay = engineCap('blueberry', 'okay', bobby.max);
    expect(acceptsStage('everyday', 'notso')).toBe(false);
    expect(html).toContain(`Up to $${bobby.max} for a Fresh one, $${okay} for Okay. He won't take Soft.`);
    expect(html).toContain('Up to $5 for a Fresh one, $4 for Okay. He won\'t take Soft.');
  });

  it('the reveal\'s words match the sale saleOrder works out by the rule', () => {
    for (const pref of ['everyday', 'premium'] as const) {
      const steps = saleOrder(pref);
      const said = SALE_SAYS[pref];
      // "A sells 2 at $4", or "B is cheapest: it sells 1 at $3": each stall's run of pieces, in order
      const runs = [...said.matchAll(/(?:([A-C]) is cheapest: it|([A-C])) sells (\d) at \$(\d+)/g)].map((m) => [m[1] ?? m[2], Number(m[3]), Number(m[4])]);
      const order: [string, number, number][] = [];
      for (const p of steps) {
        const last = order[order.length - 1];
        if (last && last[0] === p.stall) last[1]++;
        else order.push([p.stall, 1, p.price]);
      }
      expect(runs, pref).toEqual(order);
      // "B's Okay blueberry is not taken": that stall sells nothing, and the customer does not take that freshness
      for (const m of said.matchAll(/([A-C])'s (Fresh|Okay|Soft) blueberry is not taken/g)) {
        const stage = (Object.keys(STAGE_WORD) as (keyof typeof STAGE_WORD)[]).find((k) => STAGE_WORD[k] === m[2])!;
        expect(steps.some((p) => p.stall === m[1]), pref).toBe(false);
        expect(acceptsStage(pref, stage), pref).toBe(false);
      }
      // "The order is full, so C sells nothing": the order is filled without that stall
      for (const m of said.matchAll(/The order is full, so ([A-C]) sells nothing/g)) {
        expect(steps).toHaveLength(bobby.qty);
        expect(steps.some((p) => p.stall === m[1]), pref).toBe(false);
      }
      // "Two stalls served him, so nobody draws a favour card"
      expect(new Set(steps.map((p) => p.stall)).size, pref).toBe(2);
    }
  });
});

describe('the Quick Match note (playMenu.ts)', () => {
  it('says the fill time the room server waits (QUICK_FILL_MS), in the same words', () => {
    expect(QUICK_NOTE).toBe(`Up to ${QUICK_FILL_MS / 1000} seconds to find strangers; empty seats get Normal computers.`);
    expect(QUICK_NOTE).toBe('Up to 30 seconds to find strangers; empty seats get Normal computers.');
  });
});
