import { afterEach, describe, expect, it, vi } from 'vitest';
import { inviteLink, inviteLinkFrom } from '../src/net/client';

// PLAN-107 (ON-06): the invite link must open the real game on a friend's phone, wherever the page that makes it lives.
const page = (href: string) => {
  const u = new URL(href);
  return { href, protocol: u.protocol, origin: u.origin, hostname: u.hostname, port: u.port, pathname: u.pathname, search: u.search };
};
const GAME = 'https://fruit-market.example.workers.dev';

afterEach(() => vi.unstubAllGlobals());

describe('invite links', () => {
  it('from the Android app (served from https://localhost) point at the game\'s web address', () => {
    // capacitor.config.ts sets no scheme or hostname, so the app's page is https://localhost/ (Capacitor's default);
    // the Android build sets VITE_SERVER_URL to the deployed game (.github/workflows/android.yml).
    expect(inviteLinkFrom('M8SSYE', page('https://localhost/'), GAME)).toBe(`${GAME}/?room=M8SSYE`);
    // Capacitor's older http scheme, or a page deeper in the app, is the same.
    expect(inviteLinkFrom('M8SSYE', page('http://localhost/index.html'), GAME)).toBe(`${GAME}/?room=M8SSYE`);
  });

  it('from the web game are the page itself, with or without the server address set', () => {
    expect(inviteLinkFrom('ABC234', page(`${GAME}/?room=OLDONE`), GAME)).toBe(`${GAME}/?room=ABC234`);
    expect(inviteLinkFrom('ABC234', page('https://example.org/fruit/'), 'https://example.org')).toBe('https://example.org/fruit/?room=ABC234');
    // A local room server: the page and the rooms are on the same address.
    expect(inviteLinkFrom('ABC234', page('http://127.0.0.1:8787/'), 'http://127.0.0.1:8787')).toBe('http://127.0.0.1:8787/?room=ABC234');
    // The web game on its own address, the server worked out from the page (no VITE_SERVER_URL in a web build).
    vi.stubGlobal('location', page(`${GAME}/`));
    expect(inviteLink('ABC234')).toBe(`${GAME}/?room=ABC234`);
  });

  it('from a page that is not on the web (the one-file preview) fall back to the server address', () => {
    expect(inviteLinkFrom('ABC234', page('file:///tmp/index.html'), '')).toBe('/?room=ABC234');
    expect(inviteLinkFrom('ABC234', null, GAME)).toBe(`${GAME}/?room=ABC234`);
  });
});
