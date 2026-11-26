// REP-140 (PLAN-130) the online screens' words:
// B-12: Quick Match says what happens to an empty stall (a stranger or a computer), with the room server's own fill
//       time; its wait shows one clock.
// B-13: the Private Room's line about computers says what the host can do now ("+ Computer") and what the wait is for.
// B-19: a player's place is a "Stall" on every online screen (and in the Wardrobe and the reactions), never a "Seat".
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'preact';
import { DEFAULT_CONFIG, QUICK_FILL_MS, type PublicSeat, type RoomView } from '../src/net/protocol';
import { toStaticHtml } from '../src/ui/cards';
import { Online } from '../src/ui/Online';
import { QuickWait } from '../src/ui/OnlineWait';
import { computersOffer } from '../src/ui/onlineWords';
import { QUICK_NOTE } from '../src/ui/playMenu';

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
const noop = () => undefined;
const seat = (i: number, extra: Partial<PublicSeat> = {}): PublicSeat =>
  ({ seat: i, name: `P${i}`, avatar: '', ready: true, connected: true, host: i === 0, ...extra });
const room = (seats: PublicSeat[], extra: Partial<RoomView> = {}): RoomView => ({
  t: 'room', code: 'ABC234', status: 'lobby', you: 0, seats, config: { ...DEFAULT_CONFIG }, version: 1, game: null,
  submitted: [], votes: [], rematch: [], ...extra,
});
/** The on-screen words of a drawn screen (tags and attributes taken out). */
const words = (html: string) => html.replace(/<[^>]*>/g, ' ');

describe('B-12: Quick Match', () => {
  it('every empty stall on the set-up says a stranger or a computer, and the note gives the server\'s own wait', () => {
    mem.set('fm.quick.stalls', '6');
    const html = toStaticHtml(h(Online, { quick: true, onExit: noop }));
    expect([...html.matchAll(/Stranger or computer/g)].length).toBe(5);
    expect(html).not.toContain('A stranger');
    expect(QUICK_NOTE).toBe(`Up to ${QUICK_FILL_MS / 1000} seconds to find strangers; then Normal computers take the empty stalls.`);
    expect(html).toContain(QUICK_NOTE);
  });
  it('the wait shows one clock: the countdown to the computers when the room gives it, else the time waited', () => {
    const v = room([seat(0, { avatar: '🦊' }), seat(1, { avatar: '🐻', host: false })], { quick: { stalls: 4, fillAt: Date.now() + 18_000 } });
    const counted = toStaticHtml(h(QuickWait, { v, stalls: 4, onExit: noop, onCancel: noop }));
    expect(counted).toMatch(/2 of 4 found · computers fill in 0:1[78]/);
    expect(counted).not.toContain('sb-clock');
    const old = toStaticHtml(h(QuickWait, { v: { ...v, quick: { stalls: 4 } }, stalls: 4, onExit: noop, onCancel: noop }));
    expect(old).toContain('2 of 4 found<');
    expect(old).toContain('class="sb-clock"');
    expect(words(counted)).toContain('Stall 2');
    expect(words(counted)).not.toMatch(/\bSeat\b/);
  });
});

describe('B-13: the Private Room\'s computers line', () => {
  it('says "+ Computer" works now, and that the wait is for a computer at every empty stall', () => {
    const t0 = 1_000_000;
    const v = room([seat(0), seat(1)]);
    const before = computersOffer(v, t0, t0 + 18_000)!;
    expect(before.ready).toBe(false);
    expect(before.label).toBe('Add computers now with + Computer, or in 42s start with a computer at every empty stall.');
    expect(computersOffer(v, t0, t0 + 60_000)!.label).toBe('Start with 4 computers');
  });
});

describe('B-19: "Stall", never "Seat", on the online screens', () => {
  it('the Quick Match and Private Room set-ups number the stalls', () => {
    mem.set('fm.quick.stalls', '4');
    const quick = words(toStaticHtml(h(Online, { quick: true, onExit: noop })));
    expect(quick).toContain('Stall 2');
    const priv = words(toStaticHtml(h(Online, { onExit: noop })));
    expect(priv).toContain('Stall 2');
    for (const w of [quick, priv]) expect(w).not.toMatch(/\bSeat\b/);
  });
});
