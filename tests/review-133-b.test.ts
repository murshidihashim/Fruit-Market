// PLAN-116, part B (REP-133): the screens, online and polish fixes that have logic or words behind them.
import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import { readFileSync } from 'node:fs';
import { CARDS } from '../src/ui/achievements';
import { toStaticHtml } from '../src/ui/cards';
import { nextFocus } from '../src/ui/focusTrap';
import { inviteLine } from '../src/ui/Online';
import { BellNotice, tieOrderLine } from '../src/ui/panel';
import { LENGTHS, lengthWord } from '../src/ui/playMenu';
import { practiceRound, practiceVerdict } from '../src/ui/practice';
import { TIE_ORDER, TIE_ORDER_CARD } from '../src/ui/rulesText';
import { TIPS } from '../src/ui/tutorial';
import { dailyConfig } from '../src/engine/daily';
import { newGame } from '../src/engine/game';
import { MAX_SEATS } from '../src/net/protocol';

describe('B-04: Tab and Shift-Tab go round a pop-up', () => {
  it('goes to the next item, and from the last back to the first', () => {
    expect(nextFocus(3, 0, false)).toBe(1);
    expect(nextFocus(3, 2, false)).toBe(0);
  });
  it('goes back with Shift, and from the first to the last', () => {
    expect(nextFocus(3, 1, true)).toBe(0);
    expect(nextFocus(3, 0, true)).toBe(2);
  });
  it('from outside the pop-up (or the pop-up itself) goes to its first item, or with Shift its last', () => {
    expect(nextFocus(4, -1, false)).toBe(0);
    expect(nextFocus(4, -1, true)).toBe(3);
  });
  it('with nothing to focus, stays on the pop-up', () => {
    expect(nextFocus(0, -1, false)).toBeNull();
  });
  it('every pop-up keeps focus: Popup, the game menu, the full-screen question, the first-time pop-up, a whole card', () => {
    const src = (f: string) => readFileSync(f, 'utf8');
    expect(src('src/ui/Home.tsx')).toMatch(/export function Popup[\s\S]{0,300}useFocusTrap\(box, onClose\)/);
    expect(src('src/ui/game/panels/Popovers.tsx').match(/<TrapBox class="modal center game-menu"/g)).toHaveLength(2);
    expect(src('src/ui/FullScreenButton.tsx').match(/<TrapBox class="modal center fs-ask"/g)).toHaveLength(2);
    expect(src('src/ui/FirstTime.tsx')).toContain('useFocusTrap(box)');
    expect(src('src/ui/Trophies.tsx')).toContain('useFocusTrap(ref, onClose)');
    expect(src('src/ui/cardZoom.tsx')).toContain('<TrapBox');
  });
});

describe('B-05: the invite line counts the stalls still free', () => {
  it('names one more friend when one stall is free, and up to N otherwise', () => {
    expect(inviteLine(MAX_SEATS - 1)).toBe('Invite up to 5 friends');
    expect(inviteLine(3)).toBe('Invite up to 3 friends');
    expect(inviteLine(1)).toBe('Invite 1 more friend');
    expect(inviteLine(0)).toBe('All stalls taken');
  });
});

describe('B-14: game lengths in one order everywhere', () => {
  it('is Quick, Standard, Long', () => {
    expect(LENGTHS.map((l) => `${l.word} ${l.days}`)).toEqual(['Quick 8', 'Standard 10', 'Long 14']);
    expect([8, 10, 14].map(lengthWord)).toEqual(['Quick', 'Standard', 'Long']);
  });
  it('the set-up screen and the room draw the same list', () => {
    // PLAN-125: the set-up pages and the room draw one segment (Setup.tsx LengthSeg); the Play page has no length.
    expect(readFileSync('src/ui/Online.tsx', 'utf8')).toContain('<LengthSeg ');
    for (const f of ['src/ui/Setup.tsx', 'src/ui/Online.tsx', 'src/ui/App.tsx', 'src/ui/Home.tsx']) {
      const src = readFileSync(f, 'utf8');
      if (f === 'src/ui/Setup.tsx') expect(src).toContain('LENGTHS.map(');
      expect(src).not.toMatch(/\[\[8, 'Quick'\]|\[\[10, 'Standard'\]/);
    }
  });
});

describe('B-17: one set of words', () => {
  it('the tie rule reads as the pricing panel words it, with Favoured Trade first where the card is in play', () => {
    expect(TIE_ORDER).toBe('fresher, then the Haggler, then earlier');
    expect(TIE_ORDER_CARD).toBe('Favoured Trade, then fresher, then the Haggler, then earlier');
    const g = newGame(dailyConfig('2026-11-22', 'You'));
    expect(tieOrderLine(g, 9)).toBe(`Ties: ${TIE_ORDER}.`);
    expect(toStaticHtml(h(BellNotice, { onClose: () => undefined }))).toContain(`Ties: ${TIE_ORDER_CARD}.`);
    expect(TIPS.find((t) => t.id === 'reveal')?.text).toContain(`Ties: ${TIE_ORDER_CARD} in today's buying.`);
    expect(readFileSync('src/ui/HowTo.tsx', 'utf8')).toContain("Otherwise ties go: {TIE_ORDER} in today's buying.");
    // the price practice: a tie (no favour cards there)
    for (let n = 0; n < 60; n++) {
      const r = practiceRound(n);
      const said = practiceVerdict(r, r.rival.price).text;
      if (said.startsWith('A tie')) { expect(said).toBe(`A tie with ${r.rival.name}. Ties: ${TIE_ORDER}, so it may not sell.`); return; }
    }
    throw new Error('no tie among the first 60 practice rounds');
  });

  it('the old wordings are gone from the screens', () => {
    for (const f of ['src/ui/panel.tsx', 'src/ui/tutorial.ts', 'src/ui/HowTo.tsx', 'src/ui/practice.ts']) {
      const src = readFileSync(f, 'utf8');
      expect(src).not.toContain('whoever bought');
      expect(src).not.toContain('fresher fruit, then');
    }
  });

  it('"Every mode" names today\'s modes', () => {
    const card = CARDS.find((c) => c.id === 'explorer')!;
    expect(card.steps[0].text).toBe('Finish a game in each mode: against the computer or in Pass & Play, the Daily market or Sprint, the Market League, and online.');
    expect(card.steps[0].text).not.toContain('New game');
  });

  it('the stamp book is called the stamp book', () => {
    // PLAN-121: an icon button on your stall (HomeCards.tsx), named with its stamps for a screen reader
    const stall = readFileSync('src/ui/HomeCards.tsx', 'utf8');
    expect(stall).toContain('aria-label={`Stamp book, ${buttons.filled} of ${buttons.size} stamps`}');
    expect(stall).toContain('<span>Stamp book</span>');
    expect(readFileSync('src/ui/game/panels/Results.tsx', 'utf8')).toContain("'Open your stamp book'");
    expect(readFileSync('src/ui/Trophies.tsx', 'utf8')).toContain("?? 'Stamp book'");
  });
});
