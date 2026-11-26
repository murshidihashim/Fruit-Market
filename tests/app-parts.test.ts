// REP-140 A-10 (PLAN-130): the parts of App.tsx and AccountPanel.tsx that can be checked without a browser. App.tsx's
// screens, the Back button's history and Opening.tsx's animation need a real page: the browser tests cover them. Where
// Back goes, the results' main button and the saved slots are appNav.ts's, tested in app-nav.test.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'preact';
import { toStaticHtml } from '../src/ui/cards';
import { AccountPanel } from '../src/ui/AccountPanel';
import { dropRoomFromAddress, roomFromUrl } from '../src/ui/App';

// toStaticHtml draws hook-free trees: the hooks hold their first value here (as tests/howto-pages.test.ts does).
vi.mock('preact/hooks', () => ({
  useState: (v: unknown) => [typeof v === 'function' ? (v as () => unknown)() : v, () => undefined],
  useEffect: () => undefined, useLayoutEffect: () => undefined,
  useRef: (v: unknown) => ({ current: v }), useMemo: (f: () => unknown) => f(), useCallback: (f: unknown) => f,
}));

const mem = new Map<string, string>();
/** The address bar: what `history.replaceState` was asked to show. */
let shown: string[] = [];
function page(search: string, hash = '', replace: (url: string) => void = (url) => { shown.push(url); }) {
  vi.stubGlobal('location', { protocol: 'https:', hostname: 'fruit.example', origin: 'https://fruit.example', port: '', pathname: '/play', search, hash });
  vi.stubGlobal('history', { replaceState: (_s: unknown, _t: string, url: string) => replace(url) });
}

beforeEach(() => {
  mem.clear();
  shown = [];
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k),
  });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('an invite link (App.tsx roomFromUrl, PLAN-107 ON-02)', () => {
  it('reads the room once and takes it out of the address, keeping anything else there', () => {
    page('?room=abc-234&lang=en', '#top');
    expect(roomFromUrl()).toBe('ABC234');
    expect(shown).toEqual(['/play?lang=en#top']);
  });

  it('a code of the wrong length is no room, and is still taken out of the address', () => {
    page('?room=ABC');
    expect(roomFromUrl()).toBeUndefined();
    expect(shown).toEqual(['/play']);
  });

  it('an address without a room is left alone', () => {
    page('?lang=en');
    expect(roomFromUrl()).toBeUndefined();
    dropRoomFromAddress();
    expect(shown).toEqual([]);
  });

  it('a page whose address cannot be changed still opens the room', () => {
    page('?room=ABC234', '', () => { throw new Error('SecurityError'); });
    expect(roomFromUrl()).toBe('ABC234');
  });
});

describe('the account section of Settings (AccountPanel.tsx)', () => {
  it('is not shown where there is no game server (the single-file preview)', () => {
    expect(toStaticHtml(h(AccountPanel, { onChange: () => undefined }))).toBe('');
  });

  it('as a guest: the ID and password fields, and Create account and Sign in, which wait for both fields', () => {
    page('');
    const html = toStaticHtml(h(AccountPanel, { onChange: () => undefined }));
    expect(html).toContain('there is no way to reset a forgotten password');
    expect(html).toContain('ID (letters, numbers, underscores)');
    expect(html).toContain('autocomplete="username"');
    expect(html).toContain('Password (8 or more characters)');
    expect(html).toMatch(/<button class="btn primary" disabled[^>]*>Create account<\/button>/);
    expect(html).toMatch(/<button class="btn" disabled[^>]*>Sign in<\/button>/);
    expect(html).not.toContain('Sign out');
  });

  it('signed in: says who, and offers to save, sign out, change the password and delete the account', () => {
    page('');
    mem.set('fm.acct', JSON.stringify({ id: 'grocer_1', token: 't' }));
    const html = toStaticHtml(h(AccountPanel, { onChange: () => undefined }));
    expect(html).toContain('Signed in as <b>grocer_1</b>.');
    for (const b of ['Save to my account now', 'Sign out', 'Change my password…', 'Delete my account…']) expect(html, b).toContain(`>${b}</button>`);
    expect(html).not.toContain('Create account');
    // nothing is asked for until the player chooses to change or delete
    expect(html).not.toContain('type="password"');
  });
});
