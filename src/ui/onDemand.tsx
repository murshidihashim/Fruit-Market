// REP-140 A-08: screens most players open rarely or once (How to play, the online screens, the Market League, the
// stamp book and the Wardrobe, Settings, the account) are loaded on demand, so the main script stays small. Each is
// fetched the first time it is needed, and all of them once the phone is idle after the game opens, so they are there
// before the player taps (and with no network later, as the game has no offline cache: what is fetched stays in memory).
// While one loads, the screen before it stays (`whenReady`); a screen drawn before its code is here shows nothing new,
// and after WAIT_MS a quiet line; if loading fails, a line and Try again.
import type { ComponentType, FunctionComponent } from 'preact';
import { useEffect, useState } from 'preact/hooks';

/** How long a screen may take before the player is told it is loading. */
export const WAIT_MS = 300;
export const LOADING = 'Loading';
export const NOT_LOADED = 'Could not load this page. Check your connection.';

export interface OnDemand<P> {
  /** The screen: drawn at once when its code is here; until then nothing new, then a quiet line. */
  Screen: FunctionComponent<P>;
  /** Fetches the code (once); resolves when it is here, rejects when it cannot be fetched (try again later). */
  load: () => Promise<void>;
  /** True once the code is here, so the screen draws at once. */
  ready: () => boolean;
  /** Runs `go` (which shows the screen) at once when the code is here; otherwise once it is, or after WAIT_MS,
   *  whichever is first: the screen then shows its loading line at once. The screen before stays until then. */
  open: (go: () => void) => void;
}

const every: (() => Promise<void>)[] = [];

/** A screen loaded on demand: `fetch` imports its module and gives the component. */
export function onDemand<P extends object>(fetch: () => Promise<ComponentType<P>>): OnDemand<P> {
  let got: ComponentType<P> | null = null;
  let pending: Promise<void> | null = null;
  /** The player has already waited WAIT_MS for it (open gave up waiting): the loading line shows at once. */
  let overdue = false;
  const load = () => (pending ??= fetch().then((c) => { got = c; }, (e: unknown) => { pending = null; throw e; }));
  const open = (go: () => void) => {
    if (got) { go(); return; }
    let done = false;
    const once = () => { if (!done) { done = true; go(); } };
    const t = setTimeout(() => { overdue = true; once(); }, WAIT_MS);
    load().then(() => { clearTimeout(t); once(); }, () => { clearTimeout(t); once(); });
  };
  function Screen(props: P) {
    const [C, setC] = useState<ComponentType<P> | null>(() => got);
    const [slow, setSlow] = useState(() => overdue);
    const [failed, setFailed] = useState(false);
    const [tries, setTries] = useState(0);
    useEffect(() => {
      if (C) return;
      let alive = true;
      const t = setTimeout(() => { if (alive) setSlow(true); }, WAIT_MS);
      load().then(() => { if (alive) setC(() => got); }, () => { if (alive) setFailed(true); });
      return () => { alive = false; clearTimeout(t); };
    }, [C, tries]);
    if (C) return <C {...props} />;
    if (failed) {
      return (
        <div class="page" role="alert">
          <p class="big-wait">{NOT_LOADED}</p>
          <button type="button" class="btn" onClick={() => { setFailed(false); setTries((n) => n + 1); }}>Try again</button>
        </div>
      );
    }
    return slow ? <div class="page"><p class="waiting-dots big-wait" role="status">{LOADING}</p></div> : null;
  }
  every.push(load);
  return { Screen, load, ready: () => got !== null, open };
}

/** Shows a screen: through `screen.open` when it is loaded on demand, otherwise at once. */
export function whenReady(screen: Pick<OnDemand<never>, 'open'> | undefined, go: () => void): void {
  if (screen) screen.open(go);
  else go();
}

/** Fetches every on-demand screen, one after another, when the phone is idle. Failures are left for the screen to
 *  report when it is opened. */
export function preloadWhenIdle(): void {
  const idle = (f: () => void) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(f, { timeout: 2000 }) : setTimeout(f, 500));
  idle(() => {
    // a screen that cannot be fetched now says so itself when it is opened (and fetches again then)
    void every.reduce<Promise<void>>((p, load) => p.then(() => load().catch(() => undefined)), Promise.resolve());
  });
}
