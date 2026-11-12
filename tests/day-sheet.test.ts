// One sheet from stocking to the day's takings (PLAN-085): which step it shows, that nothing secret is drawn early or
// for the wrong person, the bell's rows, the Favoured Trade question, and that the sheet is one element that stays.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { h } from 'preact';
import { aiActFor } from '../src/engine/ai';
import { EVENT_CARDS, FRUIT, RIVALS, type FruitId } from '../src/engine/data';
import { activePlayer, applyAction, decideTie, emptyStock, newGame, publicView, tiedPrices, type GameState } from '../src/engine/game';
import { toStaticHtml } from '../src/ui/cards';
import { TIGHTEST, dayStep, fitSheet, fullReach, ownStep, type DayNow } from '../src/ui/game/daySheet';
import { BEAT } from '../src/ui/motion';
import { bellRows, flipped, nth } from '../src/ui/game/pricingTable';
import { tieAnswer } from '../src/ui/game/animator';
import { CratesOpen, TieCard } from '../src/ui/game/panels/PricingTable';
import { tieStory } from '../src/ui/game/tieStory';
import { nightSteps, tonightWord } from '../src/ui/game/tonight';
import { shelfRowText, tieOrderText } from '../src/ui/panel';

const read = (f: string) => readFileSync(f, 'utf8');
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
    const ctrl = read('src/ui/game/useGameController.ts');
    expect(ctrl).toContain("const flip = next.day === prev.day && prev.phase === 'bid' && next.phase === 'tie';");
    expect(ctrl).toContain("await reveal(next, viewer, setShow, setBell, prev.phase === 'tie');");
    expect(read('src/ui/game/animator.tsx')).toContain('if (!rung) await bellRings(g, setBell);');
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
    // the sheet works that out from the person the phone was handed to
    const sheet = read('src/ui/game/panels/DaySheet.tsx');
    expect(sheet).toContain("mine: s.players[viewer]?.kind === 'human' && (online || c.humans.length === 1 || c.handedTo === viewer),");
  });

  it('stocking and pricing fit the middle of the table; the bell and the question are drawn on the sheet over the rows around it; under the takings it lies plain', () => {
    const steps = ['stock', 'wait', 'price', 'sealed', 'bell', 'tie', 'takings'] as const;
    expect(steps.map(ownStep)).toEqual([true, true, true, true, false, false, false]);
    expect(steps.map(fullReach)).toEqual([false, false, false, false, true, true, false]);
  });
});

describe('one element stays on the table (Game.tsx, DaySheet.tsx)', () => {
  it('the game table draws one sheet for all these steps, keyed by the day and the stall, so it is never replaced between them', () => {
    const game = read('src/ui/Game.tsx');
    expect(game).toContain('if (dayOn) return <DaySheet key={`day-${s.day}-${viewer}`} s={s} viewer={viewer} c={c} online={!!online} />;');
    for (const old of ['<StallPanel', '<PricePanel', '<CratesOpen', '<TiePanel', '<SalesSummary']) expect(game).not.toContain(old);
    const sheet = read('src/ui/game/panels/DaySheet.tsx');
    // one root element whose class does not change with the step (sheet.ts slides a panel in only when its class changes)
    expect(sheet.match(/<div class=\{`mid-panel sh-day /g)).toHaveLength(1);
    const root = sheet.indexOf('<div class={`mid-panel sh-day ');
    const end = sheet.indexOf('</div>\n      {step === \'stock\'', root);
    expect(end).toBeGreaterThan(root);
    // the bell's rows and the Favoured Trade question are drawn on the sheet itself, in its one element
    const rows = sheet.indexOf('<CratesOpen s={s} viewer={viewer} open={c.bell} shared={shared} answered={answered.current}>');
    expect(rows).toBeGreaterThan(root);
    expect(rows).toBeLessThan(end);
    expect(sheet.indexOf('<TieCard key={`tie-${asked}`}')).toBeGreaterThan(rows);
    expect(sheet.indexOf('<TieCard key={`tie-${asked}`}')).toBeLessThan(end);
    // the takings are their own panel, mounted after the sheet, which stays under them
    expect(sheet.indexOf("{step === 'takings' && <SalesSummary s={s} viewer={viewer} shared={shared} />}")).toBeGreaterThan(end);
  });

  it('the sheet moves by position, size and fade only, on the table\'s clock, and waits for nothing', () => {
    const sheet = read('src/ui/game/panels/DaySheet.tsx');
    expect(sheet).not.toMatch(/setTimeout|setInterval|onAnimationEnd|onTransitionEnd|\.finished/);
    expect(sheet).not.toMatch(/rotate|skew|steps\(/);
    expect(sheet).toContain("const TURN: Keyframe[] = [{ transform: 'scaleY(0.05)', opacity: 0 }, { transform: 'none', opacity: 1 }];");
    // its lengths are named on the table's clock (motion.ts): a piece's slide, and your tags turning face down
    expect(sheet).toContain('duration: A.BEAT.stock.fly');
    expect(sheet).toContain('duration: A.ms(A.BEAT.price.seal)');
    expect(sheet).not.toMatch(/duration: \d|_MS = \d/);
    expect([BEAT.stock.fly, BEAT.price.seal]).toEqual([260, 200]);
    for (const frames of sheet.match(/\{ (transform|opacity)[^}]*\}/g) ?? []) expect(frames).not.toMatch(/(?<!transform|opacity|translate\w*|scale\w*): /);
    const css = read('src/ui/daysheet.css').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).not.toMatch(/@keyframes|animation:/);
    for (const t of css.match(/transition:[^;]+;/g) ?? []) expect(t).toMatch(/^transition: (none|opacity calc\(var\(--mk, 1\) \* var\(--t-[\w-]+\)\) ease);$/);
    // the rows of the table are not laid out here: the sheet is drawn larger than its cell by a margin
    expect(css).not.toMatch(/#app \.tkt > \.(street-wrap|seats|my-stall|actionbar|tk-top)\b/);
    expect(css).not.toMatch(/grid-template/);
    expect(css).toContain('#app .tkt > .centre > .sh-day.own { z-index: 6; margin-top: calc(0px - var(--rise, 0px)); margin-bottom: calc(0px - var(--drop, 0px)); }');
    // the bell's rows and the question reach over the rows around the middle by the same kind of margin (bell.css)
    expect(read('src/ui/bell.css')).toContain('#app .tkt > .centre > .sh-day.full { z-index: 6; margin-top: calc(0px - var(--rise-full, 0px)); margin-bottom: calc(0px - var(--drop, 0px)); }');
    const main = read('src/main.tsx');
    expect(main.indexOf("'./ui/daysheet.css'")).toBeGreaterThan(main.indexOf("'./ui/rush.css'"));
  });
});

/** Three stalls after the flip: P0 and P1 both ask $6 for apples; P2 asks $4 for blueberries. */
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

describe('the bell: every stall\'s row in today\'s line-up (pricingTable.ts bellRows, PricingTable.tsx)', () => {
  it('reads nothing before the flip; after it, each stall\'s tags with its price, pieces and tied prices', () => {
    const s = rung();
    for (const phase of ['stall', 'bid', 'buy', 'morning'] as const) {
      expect(flipped({ ...s, phase })).toBe(false);
      expect(bellRows({ ...s, phase }, 0)).toEqual([]);
    }
    const rows = bellRows(s, 0);
    expect(rows.map((x) => [x.player, x.nth, x.me])).toEqual([[2, 1, false], [0, 2, true], [1, 3, false]]);
    expect(rows[1].tags).toEqual([{ f: 'apple', price: 6, out: 2, marks: ['fresh', 'fresh'], more: 0, tied: true, stamped: false }]);
    // the board's lane order: mango before apple
    expect(rows[2].tags.map((t) => [t.f, t.price, t.tied])).toEqual([['mango', 10, false], ['apple', 6, true]]);
    expect(rows[0].tags.map((t) => t.tied)).toEqual([false]);
    // a stall that has played Favoured Trade has its tied tag stamped
    const played = structuredClone(s);
    played.players[1].favouredTrade = true;
    expect(bellRows(played, 0)[2].tags.map((t) => t.stamped)).toEqual([false, true]);
    expect([1, 2, 3, 4, 11, 12, 13, 21].map(nth)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st']);
  });

  it('draws the rows open, or only the backs of the tags of a row that has not turned yet', () => {
    const s = rung();
    const open = toStaticHtml(h(CratesOpen, { s, viewer: 0 }));
    expect(open).toContain('The bell');
    expect(open.match(/class="ds-stall /g)).toHaveLength(3);
    expect(open).toContain('bought 1st');
    expect(open).toContain('P1: 1 mangoes at $10, 1 apples at $6');
    expect(open.match(/class="ds-pz tie /g)).toHaveLength(2);
    // two rows have turned: the third shows two backs and no price
    const part = toStaticHtml(h(CratesOpen, { s, viewer: 0, open: 2 }));
    expect(part.match(/class="ds-pz back"/g)).toHaveLength(2);
    expect(part).not.toContain('$10');
    expect(part).toContain('P1: still shut');
    // a shared phone names every stall
    expect(toStaticHtml(h(CratesOpen, { s, viewer: 0, shared: true }))).not.toContain('<b>You</b>');
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
    expect(story.title).toMatch(new RegExp(`^You(, .+)? and .+ (both|all) set \\$${t.price} for ${FRUIT[t.fruit].plural.toLowerCase()}$`));
    // the two outcomes are the game's own, played on a copy with only this stall deciding
    const alone = { ...view, tieAsk: [asked] };
    // what the card does: it puts this stall first, or, when both outcomes give it the same takings, it says so
    const same = decideTie(alone, asked, false).results!.income[asked] === decideTie(alone, asked, true).results!.income[asked];
    expect(story.why).toContain(same ? 'Favoured Trade would not change what you take today.' : 'Play Favoured Trade and you sell first, on every tied price today.');
    expect(story.why).not.toContain(same ? 'Play Favoured Trade and you sell first' : 'would not change');
    for (const [play, line] of [[false, story.without], [true, story.with]] as const) {
      const r = decideTie(alone, asked, play).results!;
      expect(line).toContain(`You take $${r.income[asked]} today.`);
      const sold = r.lines.filter((l) => l.fruit === t.fruit).reduce((a, l) => a + (l.offers.find((o) => o.player === asked)?.sold ?? 0), 0);
      expect(line).toContain(`You sell ${sold} of ${view.stalls[asked]![t.fruit]}.`);
    }
    // nothing is changed
    expect(view.phase).toBe('tie');
    expect(view.players[asked].favours).toContain('favouredTrade');
    const html = toStaticHtml(h(TieCard, { s: view, viewer: asked, asked, mine: true }));
    expect(html).toContain('Favour · your card');
    expect(html).toContain('The card is discarded once you play it. Rivals can see that you are deciding.');
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
    expect(shelfRowText(s, 0, 'apple', soft)).toMatch(/Soft sells \$2 less · spoils tonight$/);
    expect(shelfRowText(s, 0, 'mango', FRUIT.mango.ripe.length)).toBe('Still Green · ripe tomorrow');
    if (green > FRUIT.mango.ripe.length) expect(shelfRowText(s, 0, 'mango', green)).toBe(`Still Green · ripe in ${green - FRUIT.mango.ripe.length + 1} nights`);
    // a Heatwave ages two boxes; no night follows the last day
    const heat = EVENT_CARDS.find((e) => (e.ageExtra ?? 0) > 0)!;
    expect(nightSteps({ ...s, event: heat }, 0, 'apple')).toBe(1 + heat.ageExtra!);
    expect(nightSteps({ ...s, day: s.config.days }, 0, 'apple')).toBe(0);
    expect(tonightWord({ ...s, day: s.config.days }, 0, 'apple', soft).text).toBe('does not age tonight');
  });

  it('pricing says how a tie falls and where you stand in today\'s line-up', () => {
    expect(tieOrderText(rung(), 0)).toBe('The fresher piece sells first, then the Haggler, then whoever bought earlier. You bought 2nd today.');
  });
});

describe('stocking and pricing are drawn closer before anything scrolls (daySheet.ts fitSheet, DaySheet.tsx fit)', () => {
  it('a step at a time and no closer than it needs; over your shelf only when the closest step is still too tall', () => {
    expect(TIGHTEST).toBe(3);
    // it fits as the approved screen draws it
    expect(fitSheet([270], 277, 99)).toEqual({ tight: 0, over: false });
    // three fruits priced in a 277 px cell: two steps closer; four fruits: the closest step
    expect(fitSheet([355, 310, 277], 277, 99)).toEqual({ tight: 2, over: false });
    expect(fitSheet([421, 380, 330, 277], 277, 99)).toEqual({ tight: 3, over: false });
    // a six-row shelf is too tall even then: the sheet lies over your shelf too, at the roomiest step that fits there
    expect(fitSheet([406, 372, 340, 320], 277, 99)).toEqual({ tight: 1, over: true });
    expect(fitSheet([390, 360, 330, 300], 277, 120)).toEqual({ tight: 0, over: true });
    // a short phone, where the sheet already lies over your shelf: nothing more to take, so the closest step scrolls
    expect(fitSheet([500, 470, 440, 420], 370, 0)).toEqual({ tight: 3, over: false });
    // nothing fits anywhere: over your shelf at the closest step, and it scrolls with the main button in view
    expect(fitSheet([600, 560, 520, 500], 277, 99)).toEqual({ tight: 3, over: true });
    // a pixel of rounding is not a reason to draw closer
    expect(fitSheet([278], 277, 0)).toEqual({ tight: 0, over: false });
  });

  it('the room is measured from the sheet itself, each time the rows are laid out and at each step of the day', () => {
    const sheet = read('src/ui/game/panels/DaySheet.tsx');
    expect(sheet).toContain('const room = el.clientHeight;');
    expect(sheet).toContain('needs.push(el.scrollHeight);');
    expect(sheet).toContain('if (needs[t] <= room + 1) break;');
    expect(sheet).toContain("useReach(root, 'row', true, true, (el) => { if (fitting.current) fit(el); });");
    expect(sheet).not.toMatch(/innerHeight|innerWidth|matchMedia/);
    // the step is written on the sheet: nothing is drawn again for it
    expect(sheet).not.toMatch(/setTight|useState<number>/);
    const css = read('src/ui/daysheet.css').replace(/\/\*[\s\S]*?\*\//g, '');
    // no fixed screen height decides how close the rows are drawn (only where the sheet lies, on a short phone)
    expect(css.match(/max-height: \d+px/g)).toEqual(['max-height: 760px', 'max-height: 760px', 'max-height: 760px']);
    expect(css).toContain("#app .tkt .sh-day[data-tight='3'] .ds-price .ds-note, #app .tkt .sh-day[data-tight='3'] .ds-price .ds-fav { display: none; }");
    expect(css).toContain('#app .tkt .ds-brief { display: none; }');
    expect(css).toContain('#app .tkt > .centre > .sh-day.own[data-over] { z-index: 6; margin-bottom: calc(0px - var(--drop, 0px)); }');
    // the one-line forms say the same as the blocks they stand in for
    expect(sheet).toContain('Ties: fresher, then the Haggler, then earlier.');
    expect(sheet).toContain('You hold Favoured Trade: if you tie, you are asked.');
  });
});
