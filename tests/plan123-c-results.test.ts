// PLAN-123, part C, preview finding 6: the results as first drawn (each hook gives its first value, as in
// tests/home-cards.test.ts): the stamps header says the stamps are being added up, never "+0", until they have landed;
// a Sprint's box comes first with Try again, this run's place at the table apart from the board, and the perk used.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'preact';
import { aiStep, planPrices, planStall } from '../src/engine/ai';
import { FRUITS } from '../src/engine/data';
import { sprintConfig } from '../src/engine/daily';
import { applyAction, beginBuying, canBuy, finishReveal, newGame, type Action, type GameConfig, type GameState } from '../src/engine/game';
import { toStaticHtml } from '../src/ui/cards';
import { Results, STAMPS_PENDING } from '../src/ui/game/panels/Results';

vi.mock('preact/hooks', () => ({
  useState: (v: unknown) => [typeof v === 'function' ? (v as () => unknown)() : v, () => undefined],
  useEffect: () => undefined, useLayoutEffect: () => undefined,
  useRef: (v: unknown) => ({ current: v }), useMemo: (f: () => unknown) => f(), useCallback: (f: unknown) => f,
}));

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k),
  };
});

function play(cfg: GameConfig): GameState {
  let s = newGame(cfg);
  const act = (a: Action) => { s = applyAction(s, 0, a); };
  for (let i = 0; i < 5000 && s.phase !== 'over'; i++) {
    if (s.phase === 'morning') {
      if (s.day === 1 && !s.players[0].trait) { act({ kind: 'trait', trait: s.players[0].traitOffer![0] }); continue; }
      s = beginBuying(s); continue;
    }
    if (s.phase === 'reveal') { s = finishReveal(s); continue; }
    const ai = aiStep(s);
    if (ai) { s = ai; continue; }
    if (s.phase === 'buy') {
      const pick = FRUITS.flatMap((f) => s.market[f].map((_, pos) => ({ f, pos }))).find(({ f, pos }) => !canBuy(s, 0, f, pos));
      if (pick && s.players[0].boughtToday < 2) act({ kind: 'buy', fruit: pick.f, pos: pick.pos }); else act({ kind: 'endBuy' });
    } else if (s.phase === 'stall') act({ kind: 'stall', stall: planStall(s, 0) });
    else if (s.phase === 'bid') act({ kind: 'prices', posts: planPrices(s, 0).posts });
    else if (s.phase === 'order') act({ kind: 'order', price: null });
    else if (s.phase === 'evening') act({ kind: 'endEvening' });
    else if (s.phase === 'tie') act({ kind: 'tie', play: true });
  }
  return s;
}

describe('the results as they first show', () => {
  it('the stamps header says they are being added up, not +0; the Sprint box comes first with the table place, the board and the perk', () => {
    const s = play(sprintConfig('2026-11-22', 'Tester'));
    const html = toStaticHtml(h(Results, { s, viewer: 0, onExit: () => {}, onRematch: () => {} }));
    const total = /data-a="stamps-total"[^>]*>([^<]*)</.exec(html)?.[1];
    expect(total).toBe(STAMPS_PENDING);
    expect(html).not.toMatch(/data-a="stamps-total"[^>]*>\+0</);
    // the Sprint box is drawn before the podium
    expect(html.indexOf('data-a="sprint-result"')).toBeLessThan(html.indexOf('jp-pods'));
    expect(html).toMatch(/\d+(st|nd|rd|th) at this table/);
    expect(html).toContain('Checking the board');
    // Try again is the footer's main button (always in view), with its line
    expect(html).toContain('Try again: the same Sprint from the start.');
    expect(html).toContain('Your perk: ');
  });
});
