// One sheet from stocking to the day's takings (PLAN-085): which step it shows, that nothing secret is drawn early or
// for the wrong person, that the sheet is one element that stays, and what stocking and pricing say.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { EVENT_CARDS, FRUIT, RIVALS, type FruitId } from '../src/engine/data';
import { emptyStock, newGame, type GameState } from '../src/engine/game';
import { dayStep, ownStep, type DayNow } from '../src/ui/game/daySheet';
import { BEAT } from '../src/ui/motion';
import { nightSteps, tonightWord } from '../src/ui/game/tonight';
import { nth, shelfRowText, tieOrderText } from '../src/ui/panel';

const read = (f: string) => readFileSync(f, 'utf8');
const FRESH = (f: FruitId) => FRUIT[f].ripe.length - 1;

const now = (x: Partial<DayNow>): DayNow => ({ phase: 'stall', busy: false, myTurn: false, opened: false, mine: true, bell: false, rung: false, rush: false, rushed: false, done: false, ...x });

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
    expect(dayStep(now({ phase: 'reveal', busy: true, bell: true, rung: true }))).toBe('bell');
    // under a customer's card the open crates stay; when the last card has gone, the takings
    expect(dayStep(now({ phase: 'reveal', busy: true, rung: true, rush: true, rushed: true }))).toBe('bell');
    expect(dayStep(now({ phase: 'reveal', busy: true, rung: true, rushed: true }))).toBe('takings');
    expect(dayStep(now({ phase: 'reveal', rung: true, rushed: true, done: true }))).toBe('takings');
    // a saved game opened on the takings
    expect(dayStep(now({ phase: 'reveal', done: true }))).toBe('takings');
    // no step outside these phases, and none before your own stocking turn
    for (const phase of ['morning', 'order', 'buy', 'evening', 'over'] as const) expect(dayStep(now({ phase }))).toBeNull();
    expect(dayStep(now({ phase: 'stall', myTurn: true, busy: true }))).toBeNull();
    expect(dayStep(now({ phase: 'stall' }))).toBeNull();
  });

  it('the takings never show before the rush has played, and "No sales today" keeps the sealed prices', () => {
    // the bell has rung and no card is up yet (the rush was skipped and is being settled)
    expect(dayStep(now({ phase: 'reveal', busy: true, rung: true }))).toBe('bell');
    expect(dayStep(now({ phase: 'reveal', busy: true }))).toBe('sealed');
  });

  it('the Favoured Trade question keeps the sheet up too', () => {
    expect(dayStep(now({ phase: 'tie', rung: true }))).toBe('tie');
    expect(dayStep(now({ phase: 'tie', busy: true, rung: true }))).toBe('tie');
    expect(dayStep(now({ phase: 'tie', busy: true, bell: true, rung: true }))).toBe('bell');
    // after the answer the open crates stay until the bell and the rush
    expect(dayStep(now({ phase: 'reveal', busy: true, rung: true }))).toBe('bell');
  });

  it('a shared phone: nothing of a stall\'s crate or prices is drawn until the phone has been handed to its owner', () => {
    // the game has moved on to the next person and the hand-over screen has not been tapped yet
    for (const phase of ['stall', 'bid'] as const) {
      for (const myTurn of [true, false]) for (const busy of [true, false]) for (const opened of [true, false]) {
        expect(dayStep(now({ phase, myTurn, busy, opened, mine: false }))).toBeNull();
      }
    }
    expect(dayStep(now({ phase: 'reveal', busy: true, mine: false }))).toBeNull();
    // from the flip on everything on the table is public
    expect(dayStep(now({ phase: 'tie', mine: false, rung: true }))).toBe('tie');
    expect(dayStep(now({ phase: 'reveal', mine: false, bell: true, rung: true }))).toBe('bell');
    // the sheet works that out from the person the phone was handed to
    const sheet = read('src/ui/game/panels/DaySheet.tsx');
    expect(sheet).toContain("mine: s.players[viewer]?.kind === 'human' && (online || c.humans.length === 1 || c.handedTo === viewer),");
    // and it draws its own stall only: no rival's crate or price is read in it or in the views it draws
    expect(sheet).not.toMatch(/s\.bids|postedPrice|crateStock/);
    const views = read('src/ui/panel.tsx');
    const mine = views.slice(views.indexOf('// ---------- stocking'), views.indexOf('/** "The Bell" (PLAN-059)'));
    expect(mine).not.toMatch(/s\.bids|postedPrice|\.crates/);
  });

  it('the sheet draws stocking and pricing itself and lies plain under the other steps\' own panels', () => {
    expect((['stock', 'wait', 'price', 'sealed', 'bell', 'tie', 'takings'] as const).map(ownStep)).toEqual([true, true, true, true, false, false, false]);
  });
});

describe('one element stays on the table (Game.tsx, DaySheet.tsx)', () => {
  it('the game table draws one sheet for all these steps, keyed by the day and the stall, so it is never replaced between them', () => {
    const game = read('src/ui/Game.tsx');
    expect(game).toContain('if (dayOn) return <DaySheet key={`day-${s.day}-${viewer}`} s={s} viewer={viewer} c={c} online={!!online} />;');
    for (const old of ['<StallPanel', '<PricePanel', '<CratesOpen', '<TiePanel', '<SalesSummary']) expect(game).not.toContain(old);
    const sheet = read('src/ui/game/panels/DaySheet.tsx');
    // one root element, drawn first among the middle panels (sheet.ts slides a panel only when the first one changes)
    expect(sheet.match(/<div class=\{`mid-panel sh-day /g)).toHaveLength(1);
    const root = sheet.indexOf('<div class={`mid-panel sh-day ');
    // the bell, the question and the takings are their own panels, mounted over it with the props they always had
    for (const panel of ['<CratesOpen s={s} viewer={viewer} />', '<TiePanel key={`tie-${s.day}-${asked}`} s={s} viewer={viewer} asked={asked} onDecide={', '<SalesSummary s={s} viewer={viewer} />']) {
      expect(sheet.indexOf(panel), panel).toBeGreaterThan(root);
    }
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
    const css = read('src/ui/daysheet.css').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).not.toMatch(/@keyframes|animation:|transition:/);
    // the rows of the table are not laid out here: the sheet is drawn larger than its cell by a margin, on a short phone
    expect(css).not.toMatch(/#app \.tkt > \.(street-wrap|seats|my-stall|actionbar|tk-top)\b/);
    expect(css).not.toMatch(/grid-template/);
    expect(css).toContain('#app .tkt > .centre > .sh-day.own { z-index: 6; margin-top: calc(0px - var(--rise, 0px)); margin-bottom: calc(0px - var(--drop, 0px)); }');
    const main = read('src/main.tsx');
    expect(main.indexOf("'./ui/daysheet.css'")).toBeGreaterThan(main.indexOf("'./ui/rush.css'"));
  });
});

/** Three stalls at stocking: this stall holds two fresh apples. */
function stocking(): GameState {
  const g = newGame({ players: [0, 1, 2].map((i) => ({ name: `P${i}`, kind: i === 0 ? 'human' as const : 'ai' as const, level: 'normal' as const, avatar: RIVALS[i].avatar })), days: 8, unripe: true, upgrades: true, events: false, seed: 5 });
  const s: GameState = structuredClone(g);
  s.day = 2; s.event = null; s.phase = 'stall';
  s.order = [2, 0, 1];
  s.players.forEach((pl) => { pl.stock = emptyStock(true); pl.favours = []; });
  s.players[0].stock.apple[FRESH('apple')] = 2;
  s.stalls = [null, null, null];
  return s;
}

describe('stocking and pricing say what the game knows (panel.tsx, tonight.ts)', () => {
  it('a shelf row says who wants the fruit, what an older piece loses, and what tonight does to it', () => {
    const s = stocking();
    const soft = FRUIT.apple.ripe.indexOf('notso');
    const green = FRUIT.mango.ripe.length + FRUIT.mango.unripeSlots - 1;
    expect(nightSteps(s, 0, 'apple')).toBe(1);
    expect(tonightWord(s, 0, 'apple', soft)).toEqual({ text: 'spoils tonight', bad: true });
    expect(tonightWord(s, 0, 'apple', FRESH('apple')).bad).toBe(false);
    expect(shelfRowText(s, 0, 'apple', soft)).toMatch(/soft sells \$2 less · spoils tonight$/);
    expect(shelfRowText(s, 0, 'mango', FRUIT.mango.ripe.length)).toBe('Still green · ripe tomorrow');
    if (green > FRUIT.mango.ripe.length) expect(shelfRowText(s, 0, 'mango', green)).toBe(`Still green · ripe in ${green - FRUIT.mango.ripe.length + 1} nights`);
    // a Heatwave ages one box more; no night follows the last day
    const heat = EVENT_CARDS.find((e) => (e.ageExtra ?? 0) > 0)!;
    expect(nightSteps({ ...s, event: heat }, 0, 'apple')).toBe(1 + heat.ageExtra!);
    expect(nightSteps({ ...s, day: s.config.days }, 0, 'apple')).toBe(0);
    expect(tonightWord({ ...s, day: s.config.days }, 0, 'apple', soft).text).toBe('does not age tonight');
  });

  it('pricing says how a tie falls and where you stand in today\'s line-up', () => {
    expect(tieOrderText(stocking(), 0)).toBe('The fresher piece sells first, then the Haggler, then whoever bought earlier. You bought 2nd today.');
    expect([1, 2, 3, 4, 11, 12, 13, 21].map(nth)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st']);
  });
});
