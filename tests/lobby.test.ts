import { describe, expect, it } from 'vitest';
import { cleanListing, LIST_REFRESH_MS, LIST_SHOW, LIST_TTL_MS, listDrop, listPut, listShow, type ListEntry, type Listing } from '../server/lobby';

// PLAN-112: the list of public rooms still waiting for players (server/lobby.ts, kept by LobbyDO in server/worker.ts).
const room = (code: string, extra: Partial<Listing> = {}): Listing => ({ code, host: `Host ${code}`, taken: 1, days: 10, openedAt: 1000, ...extra });
const T = 1_000_000;

describe('the public rooms list', () => {
  it('adds a room that opens, and shows its host, seats, game length and how long it has waited', () => {
    const list = listPut([], room('ABCDEF', { openedAt: T - 90_000 }), T);
    expect(listShow(list, T)).toEqual([{ code: 'ABCDEF', host: 'Host ABCDEF', taken: 1, days: 10, waited: 90_000 }]);
  });

  it('brings a room up to date when its seats change, without listing it twice', () => {
    let list = listPut([], room('ABCDEF'), T);
    list = listPut(list, room('ABCDEF', { taken: 3, days: 14 }), T + 1000);
    expect(listShow(list, T + 1000)).toMatchObject([{ code: 'ABCDEF', taken: 3, days: 14 }]);
    expect(list.length).toBe(1);
  });

  it('drops a room that starts or closes, and never lists a full one', () => {
    let list = listPut([], room('ABCDEF'), T);
    list = listPut(list, room('GHJKMN'), T);
    list = listDrop(list, 'ABCDEF', T);
    expect(listShow(list, T).map((x) => x.code)).toEqual(['GHJKMN']);
    list = listPut(list, room('GHJKMN', { taken: 6 }), T);
    expect(listShow(list, T)).toEqual([]);
    // Even a full entry that got in somehow is never shown.
    const odd: ListEntry[] = [{ ...room('PQRSTU', { taken: 6 }), seenAt: T }];
    expect(listShow(odd, T)).toEqual([]);
  });

  it('drops a room it has not heard from for a while, so a crashed room cannot stay listed', () => {
    let list = listPut([], room('ABCDEF'), T);
    list = listPut(list, room('GHJKMN'), T);
    // Both are shown until the expiry; then only the one that kept saying it is still waiting.
    list = listPut(list, room('ABCDEF'), T + LIST_REFRESH_MS);
    list = listPut(list, room('ABCDEF'), T + 2 * LIST_REFRESH_MS);
    expect(listShow(list, T + LIST_TTL_MS - 1).map((x) => x.code).sort()).toEqual(['ABCDEF', 'GHJKMN']);
    expect(listShow(list, T + LIST_TTL_MS).map((x) => x.code)).toEqual(['ABCDEF']);
    // and the quiet one is forgotten, not kept for ever
    list = listPut(list, room('ABCDEF'), T + 3 * LIST_REFRESH_MS);
    expect(list.map((x) => x.code)).toEqual(['ABCDEF']);
    // A refresh is more often than the expiry, with room for one missed.
    expect(LIST_TTL_MS).toBeGreaterThan(2 * LIST_REFRESH_MS);
  });

  it('shows the longest-waiting rooms first, at most a screenful', () => {
    let list: ListEntry[] = [];
    for (let i = 0; i < 30; i++) list = listPut(list, room(`ROOM${String.fromCharCode(65 + i % 26)}${String.fromCharCode(65 + Math.floor(i / 26))}`, { openedAt: T - i * 1000 }), T);
    const shown = listShow(list, T);
    expect(shown.length).toBe(LIST_SHOW);
    expect(shown[0].waited).toBe(29_000);
    expect(shown.map((x) => x.waited)).toEqual([...shown.map((x) => x.waited)].sort((a, b) => b - a));
  });

  it('keeps only well-formed listings, and only the fields it shows', () => {
    expect(cleanListing(room('abc-def'))).toEqual({ ...room('ABCDEF'), host: 'Host abc-def' });
    expect(cleanListing({ ...room('ABCDEF'), host: 'A very long name indeed', secret: 'x' })).toEqual({ ...room('ABCDEF'), host: 'A very long na' });
    for (const bad of [null, 'ABCDEF', 7, {}, room('ABC'), room('ABCDEF', { host: '' }), room('ABCDEF', { taken: 0 }), room('ABCDEF', { taken: 7 }),
      room('ABCDEF', { taken: 1.5 }), room('ABCDEF', { days: 9 as 10 }), room('ABCDEF', { openedAt: Number.NaN }), { ...room('ABCDEF'), code: 5 }]) {
      expect(cleanListing(bad)).toBeNull();
    }
  });
});
