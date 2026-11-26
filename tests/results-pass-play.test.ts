// REP-140 B-14: Pass & Play results name the players. Several people share the phone, so the count never says "You
// are 2nd" or "By $1 over you"; every other mode (a computer game, online, the Daily, the League) keeps "you".
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'preact';
import { autoplay } from '../src/engine/ai';
import { newGame, type GameState } from '../src/engine/game';
import { toStaticHtml } from '../src/ui/cards';
import { Results, finishWords, namedResults } from '../src/ui/game/panels/Results';
import { decisiveMoment } from '../src/ui/game/resultsWords';

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

/** A finished three-stall game: Ana and Bo at the phone (Pass & Play) or Ana alone against two computers. Bo wins by
 *  $3, Ana is 2nd. */
function finished(passAndPlay: boolean): GameState {
  const g = autoplay(newGame({
    players: [{ name: 'Ana', kind: 'ai', level: 'normal', avatar: '🦊' }, { name: 'Bo', kind: 'ai', level: 'normal', avatar: '🐻' }, { name: 'Cy', kind: 'ai', level: 'normal', avatar: '🐼' }],
    days: 8, unripe: true, upgrades: true, events: true, seed: 11,
  }));
  const s: GameState = structuredClone(g);
  s.players[0] = { ...s.players[0], kind: 'human', level: undefined, cash: 40 };
  s.players[1] = { ...s.players[1], kind: passAndPlay ? 'human' : 'ai', level: passAndPlay ? undefined : 'normal', cash: 43 };
  s.players[2] = { ...s.players[2], cash: 20 };
  // the last day's record ends on the same cash
  const h = s.history!;
  h[h.length - 1] = { ...h[h.length - 1], cash: s.players.map((p) => p.cash) };
  return s;
}
const text = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

describe('B-14: Pass & Play results name the players', () => {
  it('a game with two or more people at the phone is Pass & Play; online or alone it is not', () => {
    expect(namedResults(finished(true))).toBe(true);
    expect(namedResults(finished(false))).toBe(false);
    expect(namedResults(finished(true), true)).toBe(false);
  });
  it('the words of the count: names, no "you" or "I", in Pass & Play only', () => {
    const pp = finished(true);
    expect(finishWords(pp, 0, true)).toMatchObject({ win: false, headline: 'Bo wins', margin: 'By $3.', mine: 'Bo won' });
    expect(finishWords(pp, 1, true)).toMatchObject({ win: false, headline: 'Bo wins', mine: 'Bo won' });
    expect(finishWords(pp, 0)).toMatchObject({ headline: 'Bo wins', mine: 'I came 2nd' });
    expect(finishWords(pp, 1)).toMatchObject({ win: true, headline: 'You win', mine: 'I won' });
  });
  it('the results page: "Bo wins", "By $3 over Ana.", every place by name; a computer game keeps "You are 2nd" and "over you"', () => {
    const html = toStaticHtml(h(Results, { s: finished(true), viewer: 0, onExit: () => {}, onRematch: () => {} }));
    // the count: the headline, the margin and the places (the phone owner's own boxes below it, PLAN-091, are theirs)
    const count = text(html.slice(0, html.indexOf('</ol>')));
    expect(count).toContain('Bo wins');
    expect(count).toContain('By $3 over Ana.');
    expect(count).not.toMatch(/\b(You|you|I)\b/);
    for (const n of ['1ST: Bo, $43', '2ND: Ana', '3RD: Cy']) expect(count).toContain(n);
    // the cash chart's key names everyone too
    const chart = text(html.slice(html.indexOf('cash-chart'), html.indexOf('</svg>') + 200));
    expect(chart).not.toContain('You');
    const solo = text(toStaticHtml(h(Results, { s: finished(false), viewer: 0, onExit: () => {}, onRematch: () => {} })));
    expect(solo).toContain('Bo wins · You are 2nd');
    expect(solo).toContain('By $3 over you.');
  });
  it('the deciding moment names the winner, never "You", when nobody is the viewer', () => {
    const s = finished(true);
    const m = decisiveMoment(s, -1);
    expect(m?.text).toMatch(/^Day \d+: Bo /);
    expect(m?.text).not.toMatch(/\bYou\b/);
    expect(decisiveMoment(s, 1)?.text).toMatch(/^Day \d+: You /);
  });
});
