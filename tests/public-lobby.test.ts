import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COMPUTERS_AFTER_MS, DEFAULT_CONFIG, isReaction, PROTOCOL_VERSION, REACTIONS, RULES_VERSION, AI_VERSION, type PublicSeat, type RoomView } from '../src/net/protocol';
import { computersOffer, waitedWords } from '../src/ui/Online';
import { isEmoji, isMuted, toggleMuted } from '../src/ui/Reactions';

// PLAN-112: what the online screens say and decide for public rooms, starting with computers and reactions.
const seat = (i: number, extra: Partial<PublicSeat> = {}): PublicSeat =>
  ({ seat: i, name: `P${i}`, avatar: '', ready: true, connected: true, host: i === 0, ...extra });
const room = (seats: PublicSeat[], extra: Partial<RoomView> = {}): RoomView => ({
  t: 'room', code: 'ABC234', status: 'lobby', you: 0, seats, config: { ...DEFAULT_CONFIG }, version: 1, game: null,
  submitted: [], votes: [], rematch: [], ...extra,
});

describe('versions (PLAN-112)', () => {
  it('the messages changed, the rules and the computer players did not', () => {
    expect(PROTOCOL_VERSION).toBe(5);
    expect(RULES_VERSION).toBe(20);
    // 8 since PLAN-117 (the Daily's rivals all at Normal); online rooms do not use it.
    expect(AI_VERSION).toBe(8);
  });
});

describe('the preset reactions', () => {
  it('are 8 emoji and 4 short lines, with fixed ids, and no numbers, fruit or exclamation marks', () => {
    expect(REACTIONS.map((r) => r.id)).toEqual(['smile', 'thumbs', 'clap', 'wow', 'phew', 'sob', 'fire', 'thanks', 'luck', 'nice', 'oops', 'played']);
    expect(REACTIONS.filter((r) => isEmoji(r.id)).map((r) => r.show)).toEqual(['😀', '👍', '👏', '😮', '😅', '😭', '🔥', '🙏']);
    expect(REACTIONS.filter((r) => !isEmoji(r.id)).map((r) => r.show)).toEqual(['Good luck', 'Nice sale', 'Oops', 'Well played']);
    for (const r of REACTIONS) expect(`${r.show} ${r.words}`).not.toMatch(/[0-9!$]|🍎|🍌|🍉|🫐|🥭|🍏/u);
    expect(new Set(REACTIONS.map((r) => r.id)).size).toBe(12);
  });
  it('only a listed id counts as a reaction', () => {
    expect(isReaction('smile')).toBe(true);
    for (const x of ['Smile', '😀', 'Good luck', '', null, 3, {}, ['smile']]) expect(isReaction(x)).toBe(false);
  });
});

describe('muting a player on this phone', () => {
  it('mutes and unmutes a seat by its seat and name, so a freed seat taken by someone else is not muted', () => {
    let list = toggleMuted([], 1, 'Benny');
    expect(isMuted(list, 1, 'Benny')).toBe(true);
    expect(isMuted(list, 1, 'Chandra')).toBe(false);
    expect(isMuted(list, 2, 'Benny')).toBe(false);
    list = toggleMuted(list, 1, 'Benny');
    expect(list).toEqual([]);
  });
});

describe('the host\'s offer to start with computers', () => {
  const t0 = 1_000_000;
  it('counts down for the first minute, then offers every empty seat to the computers', () => {
    const v = room([seat(0)]);
    expect(computersOffer(v, t0, t0)).toEqual({ ready: false, othersReady: true, label: 'In 60s you can start with computers in the empty seats.' });
    expect(computersOffer(v, t0, t0 + 59_500)?.label).toBe('In 1s you can start with computers in the empty seats.');
    expect(computersOffer(v, t0, t0 + COMPUTERS_AFTER_MS)).toEqual({ ready: true, othersReady: true, label: 'Start with 5 computers' });
    expect(computersOffer(room([seat(0), seat(1), seat(2), seat(3), seat(4)]), t0, t0 + COMPUTERS_AFTER_MS)?.label).toBe('Start with 1 computer');
  });
  it('waits for everyone else to be ready and here', () => {
    expect(computersOffer(room([seat(0), seat(1, { ready: false })]), t0, t0 + COMPUTERS_AFTER_MS)?.othersReady).toBe(false);
    expect(computersOffer(room([seat(0), seat(1, { connected: false })]), t0, t0 + COMPUTERS_AFTER_MS)?.othersReady).toBe(false);
    // The host's own tap counts as ready.
    expect(computersOffer(room([seat(0, { ready: false }), seat(1)]), t0, t0 + COMPUTERS_AFTER_MS)?.othersReady).toBe(true);
  });
  it('is not made to a guest, in a quick match, or when no seat is free', () => {
    expect(computersOffer(room([seat(0), seat(1)], { you: 1 }), t0, t0 + COMPUTERS_AFTER_MS)).toBeNull();
    expect(computersOffer(room([seat(0)], { quick: { stalls: 2 } }), t0, t0 + COMPUTERS_AFTER_MS)).toBeNull();
    expect(computersOffer(room([seat(0), seat(1)], { config: { ...DEFAULT_CONFIG, ai: 4 } }), t0, t0 + COMPUTERS_AFTER_MS)).toBeNull();
  });
});

describe('the Public rooms list', () => {
  it('says how long a room has waited, in whole minutes', () => {
    expect(waitedWords(0)).toBe('Just opened');
    expect(waitedWords(59_999)).toBe('Just opened');
    expect(waitedWords(60_000)).toBe('Waiting 1 min');
    expect(waitedWords(7 * 60_000 + 5000)).toBe('Waiting 7 min');
  });
});

describe('words on screen (DEC-087)', () => {
  it('the new labels have no exclamation marks', () => {
    for (const f of ['src/ui/Reactions.tsx', 'src/ui/Online.tsx']) {
      const strings = readFileSync(f, 'utf8').match(/'[^'\n]*'|`[^`\n]*`|>[^<>{}\n]+</g) ?? [];
      expect(strings.filter((x) => x.includes('!') && !x.includes('!=') && !/![a-z.(]/.test(x))).toEqual([]);
    }
  });
});
