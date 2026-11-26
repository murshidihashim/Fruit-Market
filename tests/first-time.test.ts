// PLAN-103: "First time? How to play", one pop-up over Day 1 of an online game. It reads exactly as the owner wrote it, with every
// number taken from the game data; it shows only to a player who has never finished a game; "Got it" hides it for good.
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { h } from 'preact';
import { BASE_BUY, FAVOUR_HAND_LIMIT, FRUIT, FRUITS, MARKET_DAY_EVERY } from '../src/engine/data';
import { toStaticHtml } from '../src/ui/cards';
import { OKAY_LESS, SOFT_LESS } from '../src/ui/stageWords';
import { newGame } from '../src/engine/game';
import { FIRST_TIME_KEY, FirstTimeText, dismissFirstTime, firstTimeMoment, hasFinishedGame, nthWord, showFirstTime } from '../src/ui/FirstTime';
import { saveStats } from '../src/ui/store';

/** The owner's text (15 November), with the game's straight apostrophe for his curly ones, and the one condition
 *  REP-122 C-02 added to Market Days (PLAN-109): a standing order only if it can be delivered by the last day.
 *  PLAN-116 (REP-133 B-06): no exclamation marks (house style), and the first buyer worded as the game's own tip
 *  (tutorial.ts "From Day 2"): on Day 1 the First token is drawn, so "Poorest stall goes first" was not true then. */
const OWNER = `RUN YOUR STALL.
Buy fruit at the Wholesale Market and sell to customers. Finish with the most cash to win.

YOUR DAILY ROUTINE
1. Check the market.
Read today's news and see who's shopping.
2. Buy fruit.
From Day 2 the poorest stall buys first, then the others clockwise. Buy up to 4 pieces.
3. Stock your stall.
Choose what to sell. Rivals see how many pieces, but not which fruit.
4. Set secret prices.
Set one price per fruit. Reveal fruit and prices together at the bell.
5. The Rush.
Customers buy from the cheapest qualifying stall, then the next cheapest until their order is filled or no suitable fruit remains.
6. Repeat.

MARKET DAYS
Every third day, except the last:
Bid for a standing order, if it can be delivered by the last day. Lowest bid wins and pays a stake. Deliver the required fruit when due to reclaim it; fall short and lose it. Build an upgrade in the evening.

THREE THINGS TO REMEMBER
Watch your rivals. Purchases are public as they happen, but aren't shown again. Shelves stay hidden.

Fruit ages nightly: Fresh → Okay → Soft → gone. Mangoes arrive Green and ripen first. Customers pay $1 less for Okay and $2 less for Soft; some refuse older fruit.

Complete orders, earn favours. Serve a customer's whole order alone. Draw up to 1 per day; hold up to 3.`;

const BLOCK = new Set(['div', 'p', 'h3', 'h4', 'ol', 'ul', 'li', 'section', 'article']);
const VOID = new Set(['img', 'br', 'hr', 'input', 'image', 'path', 'circle', 'rect', 'use']);

/** The words a reader (or a screen reader) gets, one line per block; pictures marked aria-hidden are left out. */
function readText(html: string): string[] {
  let out = '';
  let hidden = 0;
  for (const m of html.matchAll(/<(\/?)([a-z0-9]+)([^>]*)>|([^<]+)/g)) {
    const [, close, tag, attrs, text] = m;
    if (text !== undefined) { if (!hidden) out += text; continue; }
    const selfClosing = VOID.has(tag) || attrs.endsWith('/');
    if (close) { if (hidden) hidden--; else if (BLOCK.has(tag)) out += '\n'; continue; }
    if (selfClosing) continue;
    if (hidden || attrs.includes('aria-hidden="true"')) { hidden++; continue; }
    if (BLOCK.has(tag)) out += '\n';
  }
  const unescaped = out.replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return unescaped.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k),
  };
});

describe('first-time pop-up: the words', () => {
  it("reads exactly as the owner's text", () => {
    const lines = OWNER.split('\n').map((l) => l.trim()).filter(Boolean);
    expect(readText(toStaticHtml(h(FirstTimeText, {})))).toEqual(lines);
  });

  it('takes its numbers from the game data (the text above pins today\'s values)', () => {
    expect(BASE_BUY).toBe(4);
    expect(MARKET_DAY_EVERY).toBe(3);
    expect(nthWord(MARKET_DAY_EVERY)).toBe('third');
    expect([OKAY_LESS, SOFT_LESS]).toEqual([1, 2]);
    // Every fruit takes the same off for Okay and Soft (rules 4), so one pair of numbers is true for all of them.
    for (const f of FRUITS) {
      expect(FRUIT[f].drop[FRUIT[f].ripe.indexOf('okay')]).toBe(OKAY_LESS);
      expect(FRUIT[f].drop[FRUIT[f].ripe.indexOf('notso')]).toBe(SOFT_LESS);
    }
    expect(FAVOUR_HAND_LIMIT).toBe(3);
    // The source builds these sentences from the constants, not from typed numbers.
    const src = readFileSync('src/ui/FirstTime.tsx', 'utf8');
    for (const k of ['${BASE_BUY}', '${nthWord(MARKET_DAY_EVERY)}', '${OKAY_LESS}', '${SOFT_LESS}', '${FAVOUR_HAND_LIMIT}']) expect(src).toContain(k);
  });
});

describe('first-time pop-up: who sees it', () => {
  it('shows to a player who has never finished a game', () => {
    expect(hasFinishedGame()).toBe(false);
    expect(showFirstTime()).toBe(true);
  });

  it('does not show once a game has been finished, with counting on or off', () => {
    saveStats({ played: 1, wins: 0, bestCash: 12, totalSold: 9 });
    expect(showFirstTime()).toBe(false);
    mem.set('fm.settings', JSON.stringify({ analytics: false }));
    expect(showFirstTime()).toBe(false);
  });

  it('"Got it" hides it for good on this device', () => {
    dismissFirstTime();
    expect(mem.get(FIRST_TIME_KEY)).toBe('1');
    expect(showFirstTime()).toBe(false);
    expect(showFirstTime()).toBe(false);
  });

  it('shows over an online game on Day 1, before the morning card, and only until Start buying', () => {
    const g = newGame({ players: [{ name: 'A', kind: 'human', avatar: 'a' }, { name: 'B', kind: 'human', avatar: 'b' }], days: 8, unripe: true, upgrades: true, events: true, seed: 5 });
    expect(g.day).toBe(1);
    expect(g.phase).toBe('morning');
    expect(firstTimeMoment(g, true, false)).toBe(true);
    // Solo and pass-and-play games have the first-game tips instead.
    expect(firstTimeMoment(g, false, false)).toBe(false);
    // Once this player has tapped Start buying (a resumed game), or on any later step or day: not shown.
    expect(firstTimeMoment(g, true, true)).toBe(false);
    expect(firstTimeMoment({ ...g, phase: 'buy' }, true, false)).toBe(false);
    expect(firstTimeMoment({ ...g, day: 2 }, true, false)).toBe(false);
  });

  it('is drawn by the game in place of the morning card, not in the lobby', () => {
    // The morning card (and its news) waits while it is up: table-layout.test.ts 'the night over everything; on the
    // first morning the perk or the morning card, and nothing while the "First time?" pop-up holds it up'. It comes up
    // in an online game on Day 1 and Got it lets the morning go on: scripts/e2e-online.cjs (".ft-pop", "Got it").
    expect(readFileSync('src/ui/Online.tsx', 'utf8')).not.toMatch(/FirstTime/);
  });
});
