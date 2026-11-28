// The known gaps on the day's sheets (PLAN-090): the day's step in the top bar (PLAN-127: said, no longer drawn as a
// strip), when the takings show, and the bottom bar's leftovers.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { h } from 'preact';
import { aiActFor } from '../src/engine/ai';
import { RIVALS } from '../src/engine/data';
import { activePlayer, applyAction, newGame, type GameState } from '../src/engine/game';
import { FavourCard, toStaticHtml } from '../src/ui/cards';
import { FavourMini } from '../src/ui/phoneCards';
import { fitSheet } from '../src/ui/game/daySheet';
import { covers } from '../src/ui/game/underSheet';
import { PreView } from '../src/ui/game/panels/RushTable';
import { preTable } from '../src/ui/game/tableNow';
import { TakingsView } from '../src/ui/game/panels/SalesSummary';
import { dayName, stepSaid } from '../src/ui/game/panels/TopBar';

const read = (f: string) => readFileSync(f, 'utf8');

describe('the day\'s step said with the day follows what is on the table (TopBar.tsx)', () => {
  // PLAN-127: the strip of the day's steps is gone; the top bar's day pill says the step with the day to a screen
  // reader, and it still follows what is on the table (PLAN-090).
  it('says the bell while it rings before the rush, and the standing order while its bids are turned over', () => {
    // where the game is, when nothing else is on the table
    expect((['morning', 'order', 'buy', 'stall', 'bid', 'tie', 'reveal', 'evening'] as const).map((p) => stepSaid(p, false)))
      .toEqual(['Morning', 'The standing order', 'Buying', 'Stocking', 'The bell', 'The bell', 'The rush', 'Evening']);
    // the game is already at the rush and the bell is still ringing
    expect(stepSaid('reveal', false, 'bell')).toBe('The bell');
    // the game is already at buying and the bids are being turned over
    expect(stepSaid('buy', false, 'order')).toBe('The standing order');
    // at night
    expect(stepSaid('reveal', true)).toBe('Night');
    // what the table has on it, said here: table-layout.test.ts 'the day's step said in the top bar follows what is on
    // the table'
  });

  it('the day pill\'s name: the day, the game\'s length, the last days, and the step', () => {
    expect(dayName(2, 14, 'Buying')).toBe('Day 2 of 14, Buying');
    expect(dayName(12, 14, 'Morning')).toBe('Day 12 of 14, 3 days left, Morning');
    expect(dayName(14, 14, 'The rush')).toBe('Day 14 of 14, last day, The rush');
    // a three-day Sprint and a one-day League stage
    expect(dayName(1, 3, 'Morning')).toBe('Day 1 of 3, 3 days left, Morning');
    expect(dayName(1, 1, 'Morning')).toBe('Day 1 of 1, last day, Morning');
  });
});

/** A real game played by the computer to the first day's takings. */
function atTakings(): GameState {
  let s = newGame({ players: [0, 1, 2].map((i) => ({ name: i === 0 ? 'Mira' : RIVALS[i].name, kind: i === 0 ? 'human' as const : 'ai' as const, level: 'normal' as const, avatar: RIVALS[i].avatar })), days: 8, unripe: true, upgrades: true, events: true, seed: 7 });
  for (let i = 0; i < 4000 && s.phase !== 'reveal'; i++) {
    if (s.phase === 'morning') {
      const pick = s.players.findIndex((p) => p.traitOffer && !p.trait);
      s = pick >= 0 ? applyAction(s, pick, { kind: 'trait', trait: s.players[pick].traitOffer![0] }) : applyAction(s, 0, { kind: 'begin' });
      continue;
    }
    s = aiActFor(s, activePlayer(s))!;
  }
  return s;
}

describe('the takings (daySheet.ts, DaySheet.tsx, SalesSummary.tsx)', () => {
  // They are shown when the rush is truly done, not as the last card leaves: day-sheet.test.ts 'stays from stocking to
  // the takings' (dayStep); drawn over the day's sheet in a game: scripts/smoke.cjs with scripts/table-checks.cjs ("takings").

  it('say "You" on your own row on a phone that is not shared, and the stall\'s name on a shared one', () => {
    const s = atTakings();
    expect(s.phase).toBe('reveal');
    const own = toStaticHtml(h(TakingsView, { s, viewer: 0 }));
    expect(own).toContain('<span class="tg-name">You</span>');
    expect(own).not.toContain('<span class="tg-name">Mira</span>');
    const shared = toStaticHtml(h(TakingsView, { s, viewer: 0, shared: true }));
    expect(shared).toContain('<span class="tg-name">Mira</span>');
    expect(shared).not.toContain('<span class="tg-name">You</span>');
  });
});

describe('the bottom bar during the rush and the night (ActionBar.tsx)', () => {
  it('no Skip at night, and nothing said from the bell to the takings (PLAN-091)', () => {
    // the bar itself: table-layout.test.ts 'the bottom bar during the rush and the night'; it is not drawn while the
    // round table is up (PLAN-099): table-layout.test.ts 'once the stall has opened the round table takes over'
    // The round table says when it is playing (data-busy), which the performance script times the rush by.
    const s = atTakings();
    const draw = (busy: boolean) => toStaticHtml(h(PreView, { s: { ...s, phase: 'bid' }, viewer: 0, pre: preTable({ ...s, phase: 'bid' }, 0, {
      step: 'sealed', sent: null, own: null, vals: null, open: null, asked: -1, mine: false, online: false, waiting: '', shared: false, answered: false, left: null,
    }), busy }));
    expect(draw(true)).toContain('data-busy=""');
    expect(draw(false)).not.toContain('data-busy');
    expect(read('scripts/perf-budget.cjs')).toContain("document.querySelector('.rush-table[data-busy]')");
  });
});

describe('after a Favoured Trade answer (tableNow.ts, RushTable.tsx)', () => {
  it('the stall that has just answered is not told again that its prices are tied', () => {
    // this stall asks what a rival asks for a fruit both put out: a tied price
    const g: GameState = structuredClone(atTakings());
    const rival = g.bids.findIndex((b, i) => i !== 0 && !!b && b.length > 0);
    const post = g.bids[rival]![0];
    g.stalls[0] = { ...g.stalls[0], [post.fruit]: 1 };
    g.bids[0] = [...(g.bids[0] ?? []).filter((b) => b.fruit !== post.fruit), { fruit: post.fruit, price: post.price }];
    const draw = (answered: boolean) => toStaticHtml(h(PreView, { s: g, viewer: 0, pre: preTable(g, 0, {
      step: 'bell', sent: null, own: null, vals: null, open: null, asked: -1, mine: false, online: false, waiting: '', shared: false, answered, left: null,
    }) }));
    expect(draw(false)).toContain('Your prices are tied: ');
    const quiet = draw(true);
    expect(quiet).not.toContain('Your prices are tied');
    expect(quiet).not.toContain('data-a="bell-ties"');
    // the round table keeps the day it was asked: table-panels.test.ts 'the Favoured Trade question is asked once a day'
  });
});

// The first-game tip for stocking and pricing covers no control. It is not shown at the standing-order bid:
// table-layout.test.ts 'the "Secret prices" tip is about pricing fruit'. At stocking the tip covers no row and no button
// of the sheet, which keeps room free for it (and on a small phone lies over the customers' tickets while it is up):
// checked in the browser as the first game is played (scripts/smoke.cjs with scripts/table-checks.cjs: "the tip covers").

// The evening: an upgrade the stall cannot build (panel.tsx) can still be opened as its whole card, with the reason;
// it is never chosen. A tap on it opens the card, with the reason; choosing is for an offer that can be built:
// table-panels.test.ts 'an offer the stall cannot build can still be opened' and 'its opened card says why'. It is still
// drawn greyed, and at the evening's closest step it still says why under its one line: read in the browser
// (scripts/style-checks.cjs, "the evening is drawn closer a step at a time", PLAN-130).

describe('the table under a sheet (Game.tsx, game/underSheet.ts)', () => {
  // The market is out of reach of the keyboard and screen readers while a sheet lies over it, and back when it leaves.
  // When the market is covered (a sheet or the round table): table-layout.test.ts 'stocking draws the day's sheet; once
  // the stall has opened the round table takes over, the market is out of reach'; the market itself in a game:
  // scripts/smoke.cjs with scripts/table-checks.cjs ("the market is in reach under a sheet", "out of reach with no sheet over it").

  it('each row of the table a sheet covers all of is out of reach too, measured where things come to rest (PLAN-091)', () => {
    // a row covered to the pixel; one the sheet covers in part can still be seen and tapped
    const sheet = { top: 170, bottom: 578, left: 0, right: 360 };
    expect(covers(sheet, { top: 170, bottom: 204, left: 0, right: 360 })).toBe(true);
    expect(covers(sheet, { top: 530, bottom: 578.5, left: 0, right: 360 })).toBe(true);
    expect(covers(sheet, { top: 72, bottom: 170, left: 0, right: 360 })).toBe(false);
    expect(covers(sheet, { top: 560, bottom: 620, left: 0, right: 360 })).toBe(false);
    expect(covers({ ...sheet, left: 8, right: 352 }, { top: 300, bottom: 340, left: 0, right: 360 })).toBe(false);
    // The rows in a game (the street's strips, the stalls' row, your shelf): one the sheet covers all of is out of
    // reach, one it does not touch is in reach, measured at rest (scripts/smoke.cjs with scripts/table-checks.cjs).
  });
});

describe('a six-box shelf on a narrow, tall phone (daySheet.ts fitSheet)', () => {
  it('last of all the sheet also lies over the rows above it (pricing is the round table\'s since PLAN-099, where every rival crate shows its pieces)', () => {
    // 360 by 780: the closest step is 332 tall in a cell of 264 with 48 more over your shelf: it takes the rows above too
    expect(fitSheet([420, 390, 360, 332], 264, 48, 158)).toEqual({ tight: 0, over: true, up: true });
    expect(fitSheet([520, 490, 460, 432], 264, 48, 158)).toEqual({ tight: 2, over: true, up: true });
    // over your shelf is still tried first, and nothing changes where the sheet already lies there (a short phone)
    expect(fitSheet([420, 390, 360, 300], 264, 48, 158)).toEqual({ tight: 3, over: true, up: false });
    expect(fitSheet([500, 470, 440, 420], 370, 0, 0)).toEqual({ tight: 3, over: false, up: false });
    // how the sheet then lies over the rows above it, and that no rule styles the old rows any more: read in the browser
    // (scripts/style-checks.cjs, "the day's sheet also lies over the rows above it" and the page's own rules, PLAN-130)
  });
});

describe('the evening\'s favour cards (phoneCards.tsx; the approved Evening board)', () => {
  it('say "Play in the evening" on their band, as the board does; the printed card still says "In the evening" under "When to play"', () => {
    const mini = toStaticHtml(h(FavourMini, { id: 'gossip', onOpen: () => undefined }));
    expect(mini).toContain('<span class="fav-when">Play in the evening</span>');
    expect(mini).toContain('aria-label="Favour card: Gossip. Play in the evening. ');
    // the other cards keep their words, which the board shows for Favoured Trade
    expect(toStaticHtml(h(FavourMini, { id: 'favouredTrade', onOpen: () => undefined }))).toContain('<span class="fav-when">After the prices flip</span>');
    expect(toStaticHtml(h(FavourMini, { id: 'freeFruit', onOpen: () => undefined }))).toContain('<span class="fav-when">On your buying turn</span>');
    const printed = toStaticHtml(h(FavourCard, { id: 'gossip' }));
    expect(printed).toContain('<small>When to play</small><b>In the evening</b>');
    expect(printed).not.toContain('Play in the evening');
  });
});
