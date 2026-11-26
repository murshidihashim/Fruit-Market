// REP-140 A-01 (PLAN-130): checks of drawn screens in place of review-133-b.test.ts's reads of the source text.
// - REP-133 B-04: every pop-up keeps keyboard focus inside it (focusTrap.tsx), and Escape closes the ones that close.
//   The trap itself is tested in review-133-b.test.ts (nextFocus) and in a browser by scripts/e2e-public.cjs (the
//   reaction pop-up and the game menu).
// - The stamp book is called the stamp book: on your stall, on its own page and on the last League stage's results.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { h, type ComponentChildren } from 'preact';
import { aiStep, openStage, planPrices, planStall } from '../src/engine/ai';
import { FRUITS } from '../src/engine/data';
import { applyAction, beginBuying, canBuy, finishReveal, newGame, type Action, type GameConfig, type GameState } from '../src/engine/game';

const trap = vi.hoisted(() => ({ hooks: [] as { escape: boolean }[], boxes: [] as { label: string; escape: boolean }[] }));

vi.mock('preact/hooks', () => ({
  useState: (v: unknown) => [typeof v === 'function' ? (v as () => unknown)() : v, () => undefined],
  useEffect: () => undefined, useLayoutEffect: () => undefined,
  useRef: (v: unknown) => ({ current: v }), useMemo: (f: () => unknown) => f(), useCallback: (f: unknown) => f,
}));
// The focus trap is recorded instead of run (there is no page here): which pop-ups use it, and whether Escape closes them.
vi.mock('../src/ui/focusTrap', async (load) => {
  const real = await load<typeof import('../src/ui/focusTrap')>();
  const { h: make } = await import('preact');
  return {
    ...real,
    useFocusTrap: (_ref: unknown, onEscape?: () => void) => { trap.hooks.push({ escape: !!onEscape }); },
    TrapBox: ({ onEscape, children, ...props }: { onEscape?: () => void; children?: ComponentChildren; 'aria-label'?: string }) => {
      trap.boxes.push({ label: String(props['aria-label'] ?? ''), escape: !!onEscape });
      return make('div', props, children);
    },
  };
});

const { toStaticHtml } = await import('../src/ui/cards');
const { Popup } = await import('../src/ui/Home');
const { FirstTimePopup, MarketDayPopup } = await import('../src/ui/FirstTime');
const { FullCard, TrophyScreen } = await import('../src/ui/Trophies');
const { FullscreenPrompt } = await import('../src/ui/FullScreenButton');
const { CardPop } = await import('../src/ui/cardZoom');
const { YourStall } = await import('../src/ui/HomeCards');
const { Results } = await import('../src/ui/game/panels/Results');
const { LEAGUE } = await import('../src/ui/campaign');
const { leagueConfig } = await import('../src/ui/progress');

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  trap.hooks.length = 0;
  trap.boxes.length = 0;
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k),
  };
});
const noop = () => undefined;

describe('B-04: every pop-up keeps focus inside it', () => {
  it('Home\'s pop-ups (New game, the question before a game is replaced, the account): Escape closes them', () => {
    const html = toStaticHtml(h(Popup, { title: 'New game', onClose: noop, children: h('p', null, 'x') }));
    expect(html).toContain('role="dialog" aria-modal="true" aria-label="New game"');
    expect(trap.hooks).toEqual([{ escape: true }]);
  });

  it('the first-time pop-up (no Escape: Got it is its one way out) and the Market Day pop-up (Escape is Got it)', () => {
    toStaticHtml(h(FirstTimePopup, { onRules: noop, onDone: noop }));
    expect(trap.hooks).toEqual([{ escape: false }]);
    trap.hooks.length = 0;
    toStaticHtml(h(MarketDayPopup, { s: newGame(leagueConfig(0, 'You', '')), p: 0, offers: [], onDone: noop }));
    expect(trap.hooks).toEqual([{ escape: true }]);
  });

  it('a stamp book card, a card opened whole and the full-screen question', () => {
    toStaticHtml(h(FullCard, { page: { kind: 'event', id: 'goodHarvest' }, onClose: noop }));
    expect(trap.hooks).toEqual([{ escape: true }]);
    toStaticHtml(h(CardPop, { title: 'Rosa', onClose: noop, children: h('p', null, 'card') }));
    toStaticHtml(h(FullscreenPrompt, { onClose: noop }));
    expect(trap.boxes).toEqual([{ label: 'Rosa', escape: true }, { label: 'Play full screen?', escape: false }]);
  });
});

/** A finished game, the person's moves made simply (as tests/plan123-c-results.test.ts plays one). */
function play(cfg: GameConfig): GameState {
  let s = openStage(newGame(cfg));
  const act = (a: Action) => { s = applyAction(s, 0, a); };
  for (let i = 0; i < 5000 && s.phase !== 'over'; i++) {
    if (s.phase === 'morning') {
      if (s.day === 1 && !s.players[0].trait && s.players[0].traitOffer?.length) { act({ kind: 'trait', trait: s.players[0].traitOffer[0] }); continue; }
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

describe('the stamp book is called the stamp book', () => {
  it('on your stall: its button, named with its stamps for a screen reader', () => {
    const html = toStaticHtml(h(YourStall, { next: null, buttons: { filled: 3, size: 40, onTrophies: noop, onWardrobe: noop } }));
    expect(html).toContain('aria-label="Stamp book, 3 of 40 stamps"');
    expect(html).toContain('<span>Stamp book</span>');
  });

  it('on its own page', () => {
    expect(toStaticHtml(h(TrophyScreen, { onBack: noop }))).toContain('<h1>Stamp book</h1>');
  });

  it('on the results of the last League stage, once it is cleared', () => {
    const last = LEAGUE.length - 1;
    const done = play(leagueConfig(last, 'Tester', ''));
    expect(done.phase).toBe('over');
    // the finished stage as won by the person (the last stage's goal is a win)
    const top = Math.max(...done.players.map((p) => p.cash));
    const s: GameState = { ...done, players: done.players.map((p, i) => (i === 0 ? { ...p, cash: top + 1 } : p)) };
    mem.set('fm.ladder', JSON.stringify(last));
    const html = toStaticHtml(h(Results, { s, viewer: 0, onExit: noop, onRematch: noop }));
    expect(html).toContain('>Open your stamp book</button>');
  });
});
