// PLAN-125 (DEC-133), design B, "the deck": the four ways to play, the one-page set-up for Computer and Pass & Play,
// Quick Match's set-up (table size), and the words of the room, the pick screen and the Quick Match wait.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'preact';
import { RIVALS } from '../src/engine/data';
import { toStaticHtml } from '../src/ui/cards';
import { LocalSetup, seatShopkeepers } from '../src/ui/Setup';
import { Online } from '../src/ui/Online';
import { RoomLength } from '../src/ui/OnlineRoom';
import { PlayMenu } from '../src/ui/Home';
import { pickState, seatBand } from '../src/ui/onlineWords';
import { LENGTHS, QUICK_NOTE, QUICK_SIZES, WAYS, foundLine, quickOf, vsComputerConfig } from '../src/ui/playMenu';
import { unripeSetupText } from '../src/ui/rulesText';
import type { PublicSeat } from '../src/net/protocol';

// The screens drawn once, as a string: each hook gives its first value; nothing is fetched.
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
const count = (html: string, re: RegExp) => [...html.matchAll(re)].length;

describe('the four ways (playMenu.ts WAYS)', () => {
  it('are Quick Match, Private Room, Computer and Pass & Play, with the mockup\'s lines and no "One phone"', () => {
    expect(WAYS.map((w) => w.name)).toEqual(['Quick Match', 'Private Room', 'Computer', 'Pass & Play']);
    expect(WAYS.map((w) => w.line)).toEqual(['Strangers online', 'Friends by link or code', 'On this phone', 'Take turns on this phone']);
    for (const w of WAYS) expect(`${w.name} ${w.line}`).not.toMatch(/one phone|!/i);
  });
});

describe('the one-page set-up (Setup.tsx LocalSetup)', () => {
  it('Computer: the header, the deck with the name row, three computers with a Level band, Add a computer, the length and Start game', () => {
    mem.set('fm.name', 'Mblabla');
    const html = toStaticHtml(h(LocalSetup, { mode: 'computer', onBack: noop, onStart: noop }));
    expect(html).toContain('<h1>Computer</h1><small>On this phone</small>');
    expect(html).toContain('aria-label="Choose your shopkeeper"');
    expect(html).toContain('aria-label="Previous shopkeeper"');
    expect(html).toContain('aria-label="Next shopkeeper"');
    expect(html).toMatch(/<input class="sb-name" aria-label="Your name" value="Mblabla"/);
    expect(html).toContain('· swipe to choose');
    // your card in the middle, selected; the next and previous cards drawn beside it
    expect(count(html, /class="sb-dcard on"/g)).toBe(1);
    expect(count(html, /class="sb-dcard"/g)).toBe(2);
    expect(html).toContain('The table · 4 stalls');
    expect(count(html, /<small>Level<\/small><b>(Easy|Normal|Hard)<\/b>/g)).toBe(3);
    expect(html).toContain('Add a computer');
    expect(count(html, /aria-label="Remove stall \d"/g)).toBe(3);
    expect(html).toContain('aria-label="Game length"');
    expect(html).toMatch(/<button type="button" class="sb-go" data-a="start">Start game<\/button>/);
    expect(html).not.toContain('popup');
  });

  it('Pass & Play: a person with a blue Person band, add a person or a computer, and no "One phone"', () => {
    const html = toStaticHtml(h(LocalSetup, { mode: 'phone', onBack: noop, onStart: noop }));
    expect(html).toContain('<h1>Pass &amp; Play</h1><small>Take turns on this phone</small>');
    expect(html).toContain('class="sb-cband b-b"><small>Person</small><b>Player 2</b>');
    expect(html).toContain('aria-label="Add a person at stall 3"');
    expect(html).toContain('aria-label="Add a computer at stall 3"');
    expect(html).not.toMatch(/one phone/i);
  });

  it('gives every person a different shopkeeper and the computers the ones left, in the order shown', () => {
    const order = RIVALS.map((r) => r.avatar).reverse();
    const me = RIVALS[0].avatar;
    const got = seatShopkeepers(me, [{ kind: 'human', avatar: me }, { kind: 'ai' }, { kind: 'human' }, { kind: 'ai' }], order);
    expect(new Set([me, ...got]).size).toBe(5);
    expect(got[0]).not.toBe(me);
    expect(got[1]).toBe(order.find((a) => a !== me && a !== got[0] && a !== got[2]));
  });
});

describe('Quick Match (Online.tsx, playMenu.ts)', () => {
  it('the set-up: the deck, "?" seats for the size, the table size choice and its line, Public rooms and Find a match', () => {
    mem.set('fm.quick.stalls', '4');
    const html = toStaticHtml(h(Online, { quick: true, onExit: noop }));
    expect(html).toContain('<h1>Quick Match</h1><small>Strangers online</small>');
    expect(html).toContain('aria-label="Choose your shopkeeper"');
    expect(count(html, /<span class="sb-obig">\?<\/span>/g)).toBe(3);
    expect(html).toContain('Stranger or computer');
    expect(QUICK_SIZES.map((q) => `${q.word} ${q.small}`)).toEqual(['2 stalls 1 v 1', '4 stalls up to 4', '6 stalls up to 6']);
    expect(html).toContain('class="on" aria-pressed>4 stalls<small>up to 4</small>');
    expect(html).toContain(QUICK_NOTE);
    expect(html).toContain('data-a="public"');
    expect(html).toContain('data-a="find"');
    expect(html).toContain('Find a match');
  });

  it('reads the table size and fill time from the room, and copes when they are missing', () => {
    expect(quickOf(undefined)).toBeNull();
    expect(quickOf(false)).toBeNull();
    expect(quickOf(true)).toEqual({ stalls: 2 });
    expect(quickOf({ stalls: 4 })).toEqual({ stalls: 4 });
    expect(quickOf({ stalls: 6, fillAt: 123 })).toEqual({ stalls: 6, fillAt: 123 });
    expect(quickOf({ stalls: 5, fillAt: 'soon' })).toEqual({ stalls: 2 });
    expect(foundLine(2, 4, 18_000)).toBe('2 of 4 found · computers fill in 0:18');
    expect(foundLine(1, 2)).toBe('1 of 2 found');
  });

  it('"Play the computer now" keeps the table size, with Normal computers that are not your shopkeeper', () => {
    const me = RIVALS[0].avatar;
    const cfg = vsComputerConfig('Mblabla', me, 1, () => 0, 4);
    expect(cfg.players).toHaveLength(4);
    expect(cfg.players.slice(1).every((p) => p.kind === 'ai' && p.level === 'normal' && p.avatar !== me)).toBe(true);
    expect(new Set(cfg.players.map((p) => p.avatar)).size).toBe(4);
    expect(vsComputerConfig('Mblabla', me, 1, () => 0).players).toHaveLength(2);
  });
});

describe('the Private Room page (Online.tsx)', () => {
  it('opens a room or joins one with its code, with no shopkeeper deck', () => {
    const html = toStaticHtml(h(Online, { onExit: noop }));
    expect(html).toContain('<h1>Private Room</h1><small>Friends by link or code</small>');
    expect(html).toContain('data-a="open-room"');
    expect(html).toContain('Open a room');
    expect(html).toContain('Join with a code');
    expect(html).toContain('id="join-code"');
    expect(html).not.toContain('sb-deck');
  });

  it('a seat\'s band in the room and on the pick screen', () => {
    const seat = (p: Partial<PublicSeat>): PublicSeat => ({ seat: 1, name: 'Aisyah', avatar: '', ready: false, connected: true, host: false, ...p });
    expect(seatBand(seat({}))).toBe('Joined');
    expect(seatBand(seat({ ready: true }))).toBe('Ready');
    expect(seatBand(seat({ connected: false }))).toBe('Away');
    expect(seatBand(seat({ left: true }))).toBe('Left');
    expect(pickState(seat({}))).toBe('Choosing');
    expect(pickState(seat({ confirmed: true }))).toBe('Confirmed');
    expect(pickState(seat({ connected: false }))).toBe('Away');
  });
});

describe('the game lengths (REP-122 C-02, REP-133 B-14)', () => {
  /** The choices of a drawn "Game length" segment, in order. */
  const lengths = (html: string) => {
    const seg = /aria-label="Game length">([\s\S]*?)<\/div>/.exec(html)?.[1] ?? '';
    return [...seg.matchAll(/>([A-Za-z]+)<small>(\d+) days<\/small>/g)].map((m) => `${m[1]} ${m[2]}`);
  };
  const LIST = LENGTHS.map((l) => `${l.word} ${l.days}`);

  it('the set-up page and the room offer the Play menu\'s list, shortest first; the Play page has none', () => {
    expect(LIST).toEqual(['Quick 8', 'Standard 10', 'Long 14']);
    for (const mode of ['computer', 'phone'] as const) expect(lengths(toStaticHtml(h(LocalSetup, { mode, onBack: noop, onStart: noop }))), mode).toEqual(LIST);
    expect(lengths(toStaticHtml(h(RoomLength, { days: 10, host: true, onDays: noop })))).toEqual(LIST);
    // a guest sees the host's choice in words
    expect(toStaticHtml(h(RoomLength, { days: 14, host: false, onDays: noop }))).toContain('Long · 14 days');
    expect(toStaticHtml(h(PlayMenu, { onBack: noop, onQuick: noop, onRoom: noop, onComputer: noop, onOnePhone: noop }))).not.toContain('Game length');
  });

  it('the set-up page has no rules switches (PLAN-063: the full game, always)', () => {
    const html = toStaticHtml(h(LocalSetup, { mode: 'computer', onBack: noop, onStart: noop }));
    expect(html).not.toContain(unripeSetupText());
    expect(html).not.toMatch(/\$1 now|Unripe fruit|Market Days|role="switch"/);
  });
});
