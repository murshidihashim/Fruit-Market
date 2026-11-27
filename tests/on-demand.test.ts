// REP-140 A-08: a screen loaded on demand (onDemand.tsx). The screen before stays while its code loads, for up to
// WAIT_MS; then the screen opens with its loading line; once its code is here it opens at once, with no line. Its code
// is fetched once (and again only after a failure). The single-file build and the offline check are browser checks
// (scripts in the PLAN-130 report); this is the logic.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'preact';
import { toStaticHtml } from '../src/ui/cards';
import { LOADING, WAIT_MS, onDemand, whenReady } from '../src/ui/onDemand';

vi.mock('preact/hooks', () => ({
  useState: (v: unknown) => [typeof v === 'function' ? (v as () => unknown)() : v, () => undefined],
  useEffect: () => undefined, useLayoutEffect: () => undefined,
  useRef: (v: unknown) => ({ current: v }), useMemo: (f: () => unknown) => f(), useCallback: (f: unknown) => f,
}));

const Page = ({ who }: { who: string }) => h('p', null, `Hello ${who}`);
/** A fetch that resolves (or fails) when the test says. */
function slowFetch() {
  let done: (ok: boolean) => void = () => undefined;
  const calls = { n: 0 };
  const fetch = () => { calls.n++; return new Promise<typeof Page>((ok, no) => { done = (good) => (good ? ok(Page) : no(new Error('offline'))); }); };
  return { fetch, calls, finish: (good = true) => done(good) };
}

beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
afterEach(() => vi.useRealTimers());

describe('a screen loaded on demand', () => {
  it('opens at once, with no loading line, when its code is here', async () => {
    const f = slowFetch();
    const s = onDemand(f.fetch);
    const p = s.load();
    f.finish();
    await p;
    let opened = 0;
    s.open(() => { opened++; });
    expect(opened).toBe(1);
    expect(toStaticHtml(h(s.Screen, { who: 'Ana' }))).toBe('<p>Hello Ana</p>');
  });

  it('keeps the screen before while its code comes in time, then opens it, once', async () => {
    const f = slowFetch();
    const s = onDemand(f.fetch);
    let opened = 0;
    s.open(() => { opened++; });
    expect(opened).toBe(0);
    vi.advanceTimersByTime(WAIT_MS - 50);
    f.finish();
    await vi.waitFor(() => expect(opened).toBe(1));
    vi.advanceTimersByTime(1000);
    expect(opened).toBe(1);
    expect(s.ready()).toBe(true);
    expect(toStaticHtml(h(s.Screen, { who: 'Ana' }))).not.toContain(LOADING);
  });

  it('opens after WAIT_MS when its code is slow, with the loading line at once', () => {
    const f = slowFetch();
    const s = onDemand(f.fetch);
    let opened = 0;
    s.open(() => { opened++; });
    vi.advanceTimersByTime(WAIT_MS);
    expect(opened).toBe(1);
    expect(toStaticHtml(h(s.Screen, { who: 'Ana' }))).toContain(LOADING);
  });

  it('fetches its code once, and again only after a failure', async () => {
    const f = slowFetch();
    const s = onDemand(f.fetch);
    const a = s.load();
    const b = s.load();
    expect(a).toBe(b);
    expect(f.calls.n).toBe(1);
    f.finish(false);
    await expect(a).rejects.toThrow('offline');
    const c = s.load();
    expect(f.calls.n).toBe(2);
    f.finish();
    await c;
    expect(s.ready()).toBe(true);
  });

  it('a screen that is not loaded on demand opens at once', () => {
    let opened = 0;
    whenReady(undefined, () => { opened++; });
    expect(opened).toBe(1);
  });
});
