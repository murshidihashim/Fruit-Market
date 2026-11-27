// The day from stocking to the takings (PLAN-085; the round table between them, PLAN-099): which step is on the table,
// that nothing secret is drawn early or for the wrong person, the crates at the bell, the Favoured Trade question,
// and that the day's sheet and the round table are each one element that stays.
import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import { aiActFor } from '../src/engine/ai';
import { EVENT_CARDS, FRUIT, RIVALS, type FruitId } from '../src/engine/data';
import { activePlayer, applyAction, decideTie, emptyStock, newGame, publicView, tiedPrices, type GameState } from '../src/engine/game';
import { toStaticHtml } from '../src/ui/cards';
import { TIGHTEST, dayStep, fitSheet, onSheet, ownStep, type DayNow } from '../src/ui/game/daySheet';
import { BEAT } from '../src/ui/motion';
import { flipped, nth } from '../src/ui/game/pricingTable';
import { tieAnswer } from '../src/ui/game/animator';
import { TieCard } from '../src/ui/game/panels/PricingTable';
import { PreView } from '../src/ui/game/panels/RushTable';
import { preTable, tableSeats, tableStep, type TableFacts } from '../src/ui/game/tableNow';
import { tieStory } from '../src/ui/game/tieStory';
import { freshWarn, nightSteps, tonightWord } from '../src/ui/game/tonight';
import { shelfRowText, tieOrderLine } from '../src/ui/panel';

const FRESH = (f: FruitId) => FRUIT[f].ripe.length - 1;

const now = (x: Partial<DayNow>): DayNow => ({ phase: 'stall', busy: false, myTurn: false, opened: false, mine: true, bell: null, rung: false, rush: false, done: false, ...x });

describe('the day\'s sheet: which step it shows (daySheet.ts)', () => {
  it('stays from stocking to the takings: stocking, waiting, pricing, sealed, the bell, the takings', () => {
    expect(dayStep(now({ phase: 'stall', myTurn: true }))).toBe('stock');
    // your stall is open and the rivals are opening theirs: the sheet stays, with nothing to change
    expect(dayStep(now({ phase: 'stall', opened: true }))).toBe('wait');
    // every stall is open and you price next: the crate waits on the sheet while the table is busy, then the prices
    expect(dayStep(now({ phase: 'bid', myTurn: true, busy: true, opened: true }))).toBe('wait');
    expect(dayStep(now({ phase: 'bid', myTurn: true, opened: true }))).toBe('price');
    // you have rung the bell and the rivals are pricing: your tags lie face down, and the sheet stays
    for (const busy of [false, true]) expect(dayStep(now({ phase: 'bid', busy, opened: true }))).toBe('sealed');
    // the rush has begun, a frame or two before the bell: still the sealed prices, never the lanes
    expect(dayStep(now({ phase: 'reveal', busy: true }))).toBe('sealed');
    expect(dayStep(now({ phase: 'reveal', busy: true, bell: 0, rung: true }))).toBe('bell');
    expect(dayStep(now({ phase: 'reveal', busy: true, bell: 3, rung: true }))).toBe('bell');
    // under a customer's card the open rows stay; when the last card has gone, the takings
    expect(dayStep(now({ phase: 'reveal', busy: true, rung: true, rush: true }))).toBe('bell');
    // the last card has gone and the last coins are still counting: the open rows stay (PLAN-090)
    expect(dayStep(now({ phase: 'reveal', busy: true, rung: true }))).toBe('bell');
    // the rush is truly done: the takings
    expect(dayStep(now({ phase: 'reveal', rung: true, done: true }))).toBe('takings');
    expect(dayStep(now({ phase: 'reveal', rung: true, done: true, rush: true }))).toBe('bell');
    // a saved game opened on the takings
    expect(dayStep(now({ phase: 'reveal', done: true }))).toBe('takings');
    // no step outside these phases, and none before your own stocking turn
    for (const phase of ['morning', 'order', 'buy', 'evening', 'over'] as const) expect(dayStep(now({ phase }))).toBeNull();
    expect(dayStep(now({ phase: 'stall', myTurn: true, busy: true }))).toBeNull();
    expect(dayStep(now({ phase: 'stall' }))).toBeNull();
  });

  it('the takings never show before the rush has played, and "No sales today" keeps the sealed prices', () => {
    // the bell has rung and no card is up yet (a Favoured Trade card is travelling, or the rush was skipped)
    expect(dayStep(now({ phase: 'reveal', busy: true, rung: true }))).toBe('bell');
    expect(dayStep(now({ phase: 'reveal', busy: true }))).toBe('sealed');
  });

  it('Favoured Trade: the bell rings at the flip, the question follows, and the bell is not shown again', () => {
    expect(dayStep(now({ phase: 'tie', busy: true, bell: 0, rung: true }))).toBe('bell');
    expect(dayStep(now({ phase: 'tie', rung: true }))).toBe('tie');
    expect(dayStep(now({ phase: 'tie', busy: true, rung: true }))).toBe('tie');
    // after the answer the rush starts with the rows already open: no bell, no sealed prices
    expect(dayStep(now({ phase: 'reveal', busy: true, rung: true }))).toBe('bell');
    // the beats themselves: beat-player.test.ts 'at the flip the rows are shut together with the new state' and 'after a
    // Favoured Trade answer the rush starts with the bell already rung'; the rush's own script: bell-fit.test.ts 'a rush
    // after the flip does not ring the bell again'
  });

  it('a shared phone: nothing of a stall\'s crate or prices is drawn until the phone has been handed to its owner', () => {
    // the game has moved on to the next person and the hand-over screen has not been tapped yet
    for (const phase of ['stall', 'bid'] as const) {
      for (const myTurn of [true, false]) for (const busy of [true, false]) for (const opened of [true, false]) {
        expect(dayStep(now({ phase, myTurn, busy, opened, mine: false }))).toBeNull();
      }
    }
    expect(dayStep(now({ phase: 'reveal', busy: true, mine: false }))).toBeNull();
    // from the flip on everything on the sheet is public
    expect(dayStep(now({ phase: 'tie', mine: false, rung: true }))).toBe('tie');
    expect(dayStep(now({ phase: 'reveal', mine: false, bell: 2, rung: true }))).toBe('bell');
    // the sheet and the round table work that out from the person the phone was handed to, by one rule
    // (DaySheet.tsx dayNow, tableStepNow): table-panels.test.ts 'whose stall the day's sheet and the round table are
    // drawn for'
  });

  it('the day\'s sheet draws stocking and lies plain under the takings; every step between is the round table\'s (PLAN-099)', () => {
    const steps = ['stock', 'wait', 'price', 'sealed', 'bell', 'tie', 'takings'] as const;
    expect(steps.map(ownStep)).toEqual([true, false, false, false, false, false, false]);
    expect(steps.map(onSheet)).toEqual([true, false, false, false, false, false, true]);
    expect(steps.map(tableStep)).toEqual([null, 'wait', 'price', 'sealed', 'bell', 'tie', null]);
    expect(onSheet(null)).toBe(false);
    expect(tableStep(null)).toBeNull();
  });
});

describe('one element stays on the table (Game.tsx, DaySheet.tsx, RushTable.tsx)', () => {
  // The game table draws the day's sheet for stocking and the takings, and the round table between them. Which of them
  // is up at each step: table-layout.test.ts 'stocking draws the day's sheet; once the stall has opened the round table
  // takes over' and 'the takings lie on the day's sheet once the rush is truly over'. The day's sheet stays one element
  // through the day and the round table one element from the moment the stall opens to the last customer; the takings
  // come as their own panel over the day's sheet, which stays plain under them: checked in the browser as a whole game
  // is played (scripts/smoke.cjs with scripts/table-checks.cjs: "drawn again as a new element", "takings").

  it('the day\'s sheet and the round table move by position, size and fade only, on the table\'s clock, and wait for nothing', () => {
    // Every move the day's sheet and the round table make in a whole game (element.animate, CSS animations and
    // transitions) is read in the browser: position, size and fade only, never stepped (scripts/smoke.cjs with scripts/table-checks.cjs).
    // Their scripts hold no lengths of their own: motion.test.ts 'the table's scripts and panels hold no lengths of
    // their own' (DaySheet.tsx, tableBeats.ts and the controller's parts are among its files).
    expect([BEAT.stock.fly, BEAT.price.seal]).toEqual([260, 200]);
    // Read in the browser instead of in the stylesheet (PLAN-130): no CSS animation of its own, a fade at most
    // (scripts/layout-check.cjs at stocking); the sheet is drawn larger than its cell by a margin, over the rows above
    // and below it on a short phone (scripts/style-checks.cjs, "the day's sheet on a short phone"). The rows of the table
    // are laid out by their own sheets alone: css-layers.test.ts 'a part is styled in one sheet', and the grid as the
    // page draws it, scripts/layout-check.cjs at the buying turn. The order of the sheets: css-layers.test.ts.
  });
});

/** Three stalls after the flip: P0 and P1 both charge $6 for apples; P2 charges $4 for blueberries. */
function rung(): GameState {
  const g = newGame({ players: [0, 1, 2].map((i) => ({ name: `P${i}`, kind: i === 0 ? 'human' as const : 'ai' as const, level: 'normal' as const, avatar: RIVALS[i].avatar })), days: 8, unripe: true, upgrades: true, events: false, seed: 5 });
  const s: GameState = structuredClone(g);
  s.day = 2; s.event = null; s.phase = 'reveal';
  s.order = [2, 0, 1];
  s.players.forEach((pl) => { pl.stock = emptyStock(true); pl.favours = []; });
  s.players[0].stock.apple[FRESH('apple')] = 2;
  s.players[1].stock.apple[FRESH('apple')] = 1;
  s.players[1].stock.mango[FRESH('mango')] = 1;
  s.players[2].stock.blueberry[FRESH('blueberry')] = 1;
  s.stalls = [{ apple: 2 }, { apple: 1, mango: 1 }, { blueberry: 1 }];
  delete s.crates;
  s.bids = [[{ fruit: 'apple', price: 6 }], [{ fruit: 'apple', price: 6 }, { fruit: 'mango', price: 10 }], [{ fruit: 'blueberry', price: 4 }]];
  return s;
}

describe('the crates at the round table (tableNow.ts tableSeats, RushTable.tsx)', () => {
  const facts = (more: Partial<TableFacts> = {}): TableFacts => ({ step: 'bell', sent: null, own: null, vals: null, open: null, ...more });

  it('reads no rival\'s crate or price before the flip; after it, every crate with its pieces and price tags, clockwise from yours', () => {
    const s = rung();
    for (const phase of ['stall', 'bid', 'buy', 'morning'] as const) expect(flipped({ ...s, phase })).toBe(false);
    // a rival at pricing: a number of face-down pieces and nothing else, whatever the crate really holds
    const bid = { ...structuredClone(s), phase: 'bid' as const, bids: [null, null, null] };
    for (const seat of tableSeats(publicView(bid, 0), 0, facts({ step: 'price', vals: { apple: 7 } })).filter((x) => !x.me)) {
      expect(seat).toMatchObject({ look: 'squares', pieces: [], tags: [] });
    }
    // seats clockwise from yours (the rush's seat order), not in the line-up
    const seats = tableSeats(s, 0, facts());
    expect(seats.map((x) => [x.player, x.me, x.look])).toEqual([[0, true, 'open'], [1, false, 'open'], [2, false, 'open']]);
    expect(seats[0].tags).toEqual([{ f: 'apple', price: 6, up: true, tied: true, stamped: false }]);
    // the board's lane order: mango before apple
    expect(seats[1].tags.map((t) => [t.f, t.price, t.tied])).toEqual([['mango', 10, false], ['apple', 6, true]]);
    expect(seats[2].tags.map((t) => t.tied)).toEqual([false]);
    // a stall that has played Favoured Trade has its tied tag stamped
    const played = structuredClone(s);
    played.players[1].favouredTrade = true;
    expect(tableSeats(played, 0, facts())[1].tags.map((t) => t.stamped)).toEqual([false, true]);
    expect([1, 2, 3, 4, 11, 12, 13, 21].map(nth)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st']);
  });

  it('draws the crates open, or a crate that has not opened yet as its face-down squares', () => {
    const s = rung();
    const draw = (open: number | null, shared = false) => toStaticHtml(h(PreView, { s, viewer: 0, shared, pre: preTable(s, 0, { ...facts({ open }), asked: -1, mine: false, online: false, waiting: '', shared, answered: false, left: null }) }));
    const open = draw(null);
    expect(open).toContain('The bell');
    expect(open.match(/class="rt-crate /g)).toHaveLength(3);
    expect(open).toContain('aria-label="P1: 1 mango at $10, 1 apple at $6, tied"');
    expect(open.match(/class="rt-tg [^"]*\btie\b/g)).toHaveLength(2);
    // two crates have opened: the third shows one face-down square and no price
    const part = draw(2);
    expect(part.match(/class="rt-sq"/g)).toHaveLength(1);
    expect(part).not.toContain('$4');
    expect(part).toContain('aria-label="P2: 1 piece, face down, sealed"');
    // a shared phone names every stall
    expect(draw(null, true)).not.toContain('<b>You</b>');
    expect(open).toContain('<b>You</b>');
  });
});

/** A real game played by the computer until a stall is asked about Favoured Trade. */
function atTie(): GameState {
  for (let seed = 1; seed < 80; seed++) {
    let s = newGame({ players: [0, 1, 2, 3].map((i) => ({ name: i === 0 ? 'You' : RIVALS[i].name, kind: i === 0 ? 'human' as const : 'ai' as const, level: 'normal' as const, avatar: RIVALS[i].avatar })), days: 8, unripe: true, upgrades: true, events: true, seed });
    for (let i = 0; i < 6000 && s.phase !== 'over'; i++) {
      if (s.phase === 'tie') return s;
      if (s.phase === 'morning') {
        const pick = s.players.findIndex((p) => p.traitOffer && !p.trait);
        s = pick >= 0 ? applyAction(s, pick, { kind: 'trait', trait: s.players[pick].traitOffer![0] }) : applyAction(s, 0, { kind: 'begin' });
        continue;
      }
      if (s.phase === 'reveal') { s = applyAction(s, 0, { kind: 'finish' }); continue; }
      s = aiActFor(s, activePlayer(s))!;
    }
  }
  throw new Error('no game reached the Favoured Trade step');
}

describe('the Favoured Trade question, in words (tieStory.ts)', () => {
  const s = atTie();
  const asked = s.tieAsk![0];
  const t = tiedPrices(s, asked)[0];

  it('the asked stall reads who is tied and what the rush gives it without the card and with it, as the game itself would play it', () => {
    const view = publicView(s, asked);
    const story = tieStory(view, asked, asked);
    expect(story.title).toMatch(new RegExp(`^You(, .+)? and .+ (both|all) charge \\$${t.price} for ${FRUIT[t.fruit].plural.toLowerCase()}$`));
    // the two outcomes are the game's own, played on a copy with only this stall deciding
    const alone = { ...view, tieAsk: [asked] };
    // what the card does: it puts this stall first, or, when both outcomes give it the same takings, it says so
    const same = decideTie(alone, asked, false).results!.income[asked] === decideTie(alone, asked, true).results!.income[asked];
    expect(story.why).toContain(same ? 'Favoured Trade wouldn\'t change what you make today.' : 'Play Favoured Trade to sell first on every tied price today.');
    expect(story.why).not.toContain(same ? 'Play Favoured Trade to sell first' : 'wouldn\'t change');
    for (const [play, line] of [[false, story.without], [true, story.with]] as const) {
      const r = decideTie(alone, asked, play).results!;
      expect(line).toContain(`You make $${r.income[asked]} today.`);
      const sold = r.lines.filter((l) => l.fruit === t.fruit).reduce((a, l) => a + (l.offers.find((o) => o.player === asked)?.sold ?? 0), 0);
      expect(line).toContain(`You sell ${sold} of ${view.stalls[asked]![t.fruit]}.`);
    }
    // nothing is changed
    expect(view.phase).toBe('tie');
    expect(view.players[asked].favours).toContain('favouredTrade');
    const html = toStaticHtml(h(TieCard, { s: view, viewer: asked, asked, mine: true }));
    expect(html).toContain('Favour · your card');
    expect(html).toContain('Once played, the card is gone. Rivals can see you\'re deciding.');
  });

  it('everyone else reads who is tied and that the stall is deciding, never its outcomes', () => {
    const other = s.players.findIndex((_, i) => i !== asked);
    const story = tieStory(publicView(s, other), asked, other);
    expect(story.title.startsWith(s.players[asked].name)).toBe(true);
    expect(story.why).toContain('is deciding whether to play it');
    expect(story.without).toBeNull();
    expect(story.with).toBeNull();
    const html = toStaticHtml(h(TieCard, { s: publicView(s, other), viewer: other, asked }));
    expect(html).toContain(`Favour · ${s.players[asked].name}`);
    expect(html).not.toContain('Without it');
  });

  it('the answer is read from the game: who was asked, and whether the card was played (animator.tsx tieAnswer)', () => {
    expect(tieAnswer(s, decideTie(s, asked, true))).toEqual({ p: asked, played: true });
    expect(tieAnswer(s, decideTie(s, asked, false))).toEqual({ p: asked, played: false });
    expect(tieAnswer({ ...s, phase: 'bid' }, s)).toBeNull();
  });
});

describe('stocking and pricing say what the game knows (panel.tsx, tonight.ts)', () => {
  it('a shelf row says who wants the fruit, what an older piece loses, and what tonight does to it', () => {
    const s = rung();
    s.phase = 'stall';
    const soft = FRUIT.apple.ripe.indexOf('notso');
    const green = FRUIT.mango.ripe.length + FRUIT.mango.unripeSlots - 1;
    expect(nightSteps(s, 0, 'apple')).toBe(1);
    expect(tonightWord(s, 0, 'apple', soft)).toEqual({ text: 'spoils tonight', bad: true });
    expect(tonightWord(s, 0, 'apple', FRESH('apple')).bad).toBe(false);
    // PLAN-123: "spoils tonight" is a tag of its own beside the row's words (freshWarn), in the one set of freshness words
    expect(shelfRowText(s, 0, 'apple', soft)).toMatch(/Soft sells \$2 less$/);
    expect(freshWarn(s, 0, 'apple', soft)).toEqual({ text: 'Spoils tonight', bad: true });
    const edge = FRUIT.apple.ripe.indexOf('fresh');
    expect(freshWarn(s, 0, 'apple', edge)).toEqual({ text: 'Loses Premium tomorrow', bad: false });
    if (FRESH('apple') > edge) expect(freshWarn(s, 0, 'apple', FRESH('apple'))).toBeNull();
    expect(shelfRowText(s, 0, 'mango', FRUIT.mango.ripe.length)).toBe('Still Green · ripe tomorrow');
    if (green > FRUIT.mango.ripe.length) expect(shelfRowText(s, 0, 'mango', green)).toBe(`Still Green · ripe in ${green - FRUIT.mango.ripe.length + 1} nights`);
    // a Heatwave ages two boxes; no night follows the last day
    const heat = EVENT_CARDS.find((e) => (e.ageExtra ?? 0) > 0)!;
    expect(nightSteps({ ...s, event: heat }, 0, 'apple')).toBe(1 + heat.ageExtra!);
    expect(nightSteps({ ...s, day: s.config.days }, 0, 'apple')).toBe(0);
    expect(tonightWord({ ...s, day: s.config.days }, 0, 'apple', soft).text).toBe('won\'t age tonight');
  });

  it('pricing says how a tie falls and where you stand in today\'s line-up', () => {
    expect(tieOrderLine(rung(), 0)).toBe('Ties: fresher, then the Haggler, then earlier. You bought 2nd.');
  });
});

describe('stocking and pricing are drawn closer before anything scrolls (daySheet.ts fitSheet, DaySheet.tsx fit)', () => {
  it('a step at a time and no closer than it needs; over your shelf only when the closest step is still too tall', () => {
    expect(TIGHTEST).toBe(3);
    // it fits as the approved screen draws it
    expect(fitSheet([270], 277, 99)).toEqual({ tight: 0, over: false, up: false });
    // three fruits priced in a 277 px cell: two steps closer; four fruits: the closest step
    expect(fitSheet([355, 310, 277], 277, 99)).toEqual({ tight: 2, over: false, up: false });
    expect(fitSheet([421, 380, 330, 277], 277, 99)).toEqual({ tight: 3, over: false, up: false });
    // a six-row shelf is too tall even then: the sheet lies over your shelf too, at the roomiest step that fits there
    expect(fitSheet([406, 372, 340, 320], 277, 99)).toEqual({ tight: 1, over: true, up: false });
    expect(fitSheet([390, 360, 330, 300], 277, 120)).toEqual({ tight: 0, over: true, up: false });
    // a short phone, where the sheet already lies over your shelf: nothing more to take, so the closest step scrolls
    expect(fitSheet([500, 470, 440, 420], 370, 0)).toEqual({ tight: 3, over: false, up: false });
    // nothing fits anywhere: over your shelf at the closest step, and it scrolls with the main button in view
    expect(fitSheet([600, 560, 520, 500], 277, 99)).toEqual({ tight: 3, over: true, up: false });
    // a pixel of rounding is not a reason to draw closer
    expect(fitSheet([278], 277, 0)).toEqual({ tight: 0, over: false, up: false });
  });

  // The room is measured from the sheet itself, each time the rows are laid out and at each step of the day. In the
  // browser, as a game is played, stocking scrolls only at its closest step, and the pricing sheet at the round table's
  // foot stays on the screen (scripts/smoke.cjs with scripts/table-checks.cjs: "scrolls at step", "runs off the screen").
  // No fixed screen height decides how close the rows are drawn (only where the sheet lies, on a short phone), the
  // sheet lies over your shelf by its margin, and the pricing sheet (the round table's since PLAN-099) leaves out the
  // Favoured Trade note at its closest step: read in the browser (scripts/style-checks.cjs, PLAN-130). The pricing
  // sheet's one-line forms: tieOrderLine's test above, and table-panels.test.ts 'a stall holding Favoured Trade is told
  // it will be asked after the prices flip if it ties'.
});
