import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import { FRUIT, JAM_PRICE, RIVALS, lookOf, prefOf, type FruitId } from '../src/engine/data';
import { aiStep, autoplay } from '../src/engine/ai';
import { RULES10_CUSTOMERS } from './rules10-cards';
import {
  beginBuying, emptyStock, finishReveal, forSale, newGame, rowCount, openStall, submitPrices,
  type Customer, type GameState, type LineResult,
} from '../src/engine/game';
import { closingLeftovers, dayHighlights, explainLine, gameRecap, noSaleReason, rivalReaction } from '../src/engine/story';
import { toStaticHtml } from '../src/ui/cards';
import { RushView } from '../src/ui/game/panels/Showdown';
import { rushCards } from '../src/ui/game/rush';
import { endBuying, settleTies } from './stall-step';

// After-sale explanations (REP-089 3.3 and 3.6): the reason a stall could not sell, offers that did not qualify left out
// of every price contest, and "what if" advice that follows the engine's tie order and the size of your crate.
// Every scenario runs through the real engine with real customer cards; the explanation is then checked against the
// engine by re-running the bell at the price it suggests.

const ROSA = RIVALS[0]; // the Haggler (🦊)
const BENNY = RIVALS[1]; // Big Basket (🐻), no tie advantage
const FRESH = (f: FruitId) => FRUIT[f].ripe.length - 1;
const OKAY = (f: FruitId) => FRUIT[f].ripe.indexOf('okay');
const TIRED = 0;

function buyer(name: string, fruit: FruitId, id: number): Customer {
  // Written with the rules 10 cards (tests/rules10-cards.ts); the explanations do not depend on the card numbers.
  const w = { ...RULES10_CUSTOMERS.find((c) => c.name === name)!.wants.find((x) => x.fruit === fruit)! };
  return { id, name, wants: [w], original: [{ ...w }], pref: prefOf(name) };
}

/** Day 1, buying over, with these customers in the market (served in this order) and empty shelves. You have no perk. */
function market(...buyers: [string, FruitId][]): GameState {
  let s = beginBuying(newGame({
    players: [
      { name: 'You', kind: 'human', avatar: '🧑‍🍳' },
      { name: ROSA.name, kind: 'ai', level: 'normal', avatar: ROSA.avatar },
      { name: BENNY.name, kind: 'ai', level: 'normal', avatar: BENNY.avatar },
    ],
    days: 10, unripe: true, upgrades: true, events: false, seed: 7,
  }));
  s = endBuying(s);
  s = structuredClone(s);
  s.firstMarket = buyers.map(([name, f], i) => buyer(name, f, 900 + i));
  s.secondMarket = [];
  s.order = [0, 1, 2];
  s.players[0].trait = null;
  for (const pl of s.players) { pl.stock = emptyStock(true); pl.upgrades = []; pl.favours = []; }
  return s;
}

/** Every stall puts `out[p]` of one fruit out and prices it; `favoured` stalls have played Favoured Trade today.
 *  (Rules 18: the card is played in the tie step after the flip, by a stall with a tied price. These positions are
 *  made by hand, so the day's flag is simply set.) */
function bell(start: GameState, fruit: FruitId, out: number[], prices: number[], favoured: number[] = []): GameState {
  let s = structuredClone(start);
  for (const p of favoured) s.players[p].favouredTrade = true;
  out.forEach((n, p) => { s = openStall(s, p, n ? { [fruit]: n } : {}); });
  prices.forEach((price, p) => { if (s.bids[p] === null) s = submitPrices(s, p, [{ fruit, price }]); });
  expect(s.phase).toBe('reveal');
  return s;
}

const line = (s: GameState, i = 0) => s.results!.lines[i];
const offerOf = (l: LineResult, p: number) => l.offers.find((o) => o.player === p)!;

describe('why a stall could not sell (no-sale reason)', () => {
  const wei = lookOf('Wei Jie').title;

  it('blames the price, not age, when fresh fruit is over the customer\'s top', () => {
    const start = market(['Wei Jie', 'apple']);
    start.players[0].stock.apple[FRESH('apple')] = 2;
    const s = bell(start, 'apple', [2, 0, 0], [5, 0, 0]);
    const l = line(s);
    expect(l.max).toBe(4);
    expect(offerOf(l, 0).tooOld).toBe(true);
    const st = explainLine(s, l, 0);
    expect(st.headline).toBe(`Price too high. ${wei} pays at most $4.`);
    expect(st.headline).not.toContain('too old');
    expect(st.tags[0]).toBe('over top price $4');
    // The control: the same fresh apples at $4 sell.
    expect(offerOf(line(bell(start, 'apple', [2, 0, 0], [4, 0, 0])), 0).sold).toBe(2);
  });

  it('still says "too old" when the price is within the top but the fruit is not fresh enough, with the price ladder', () => {
    const start = market(['Wei Jie', 'apple']);
    start.players[0].stock.apple[OKAY('apple')] = 2;
    const s = bell(start, 'apple', [2, 0, 0], [4, 0, 0]);
    const st = explainLine(s, line(s), 0);
    expect(st.headline).toBe('Too old for $4. Your apples could not sell at that price.');
    expect(st.detail).toBe('At $4 only Fresh sells; Okay up to $3, Soft up to $2.');
    expect(st.tags[0]).toBe('too old for $4');
  });

  it('a Premium customer buys fresh only, whatever the price', () => {
    const start = market(['Ravi', 'apple']);
    start.players[0].stock.apple[OKAY('apple')] = 2;
    const s = bell(start, 'apple', [2, 0, 0], [1, 0, 0]);
    const st = explainLine(s, line(s), 0);
    expect(st.headline).toBe('Fresh only. Yours were not Fresh.');
    expect(st.headline + st.detail).not.toMatch(/too old|\$1 less/);
    expect(st.tags[0]).toBe('Fresh only');
  });

  it('an Everyday customer never takes soft fruit', () => {
    const start = market(['Tan', 'apple']);
    start.players[0].stock.apple[TIRED] = 2;
    const s = bell(start, 'apple', [2, 0, 0], [1, 0, 0]);
    const st = explainLine(s, line(s), 0);
    expect(st.headline).toBe(`${lookOf('Tan').title} will not take Soft apples.`);
    expect(st.tags[0]).toBe("won't take Soft");
  });

  it('a Premium Display stall\'s top is $1 higher for fresh fruit', () => {
    const start = market(['Tan', 'apple']);
    start.players[0].stock.apple[FRESH('apple')] = 2;
    start.players[0].upgrades = ['premium'];
    expect(offerOf(line(bell(start, 'apple', [2, 0, 0], [7, 0, 0])), 0).sold).toBe(2); // Tan's top is $6; the display sells at $7
    const s = bell(start, 'apple', [2, 0, 0], [8, 0, 0]);
    const st = explainLine(s, line(s), 0);
    expect(st.tags[0]).toBe('over top price $7');
    expect(st.headline).toContain('pays at most $7 for Fresh, with your Premium Display');
    expect(st.headline).not.toContain('too old');
  });

  it('names the reason on rivals\' tags too, and only says "every price too high" when price was the reason', () => {
    const start = market(['Ravi', 'apple']);
    start.players[1].stock.apple[OKAY('apple')] = 2;
    const s = bell(start, 'apple', [0, 2, 0], [0, 3, 0]);
    const st = explainLine(s, line(s), 0);
    expect(st.tags).toEqual(['Fresh only']);
    expect(st.headline).toBe(`Nothing ${lookOf('Ravi').title} would buy.`);
    expect(noSaleReason(s, line(s), offerOf(line(s), 1), 0).headline).toContain("Rosa's were not Fresh");
  });
});

describe('offers that did not qualify are not in the price contest', () => {
  /** Inspector Wei (top $4): your fresh apples at `mine`, Rosa's at `rosa` (fresh unless `rosaPos` says otherwise). */
  function weiDay(mine: number | null, rosa: number, rosaPos = FRESH('apple')): GameState {
    const start = market(['Wei Jie', 'apple']);
    if (mine !== null) start.players[0].stock.apple[FRESH('apple')] = 2;
    start.players[1].stock.apple[rosaPos] = 2;
    return bell(start, 'apple', [mine === null ? 0 : 2, 2, 0], [mine ?? 0, rosa, 0]);
  }
  const quips = (pool: keyof typeof ROSA.lines) => ROSA.lines[pool];

  it('your over-the-top offer was not "undercut" or "edged out", today or in the recap', () => {
    const s = weiDay(5, 4);
    expect(offerOf(line(s), 0).tooOld).toBe(true);
    const st = explainLine(s, line(s), 0);
    expect(st.headline).not.toMatch(/undercut|Tie/);
    expect(dayHighlights(s, 0).map((x) => x.text).join(' ')).not.toMatch(/edged you out|undercut/);
    const r = rivalReaction(s, line(s), 0, new Set());
    expect(r === null || !quips('undercut').includes(r.text)).toBe(true);
    // Two such days in the history: no "$0 sale", no "undercut", no "took 2 customers".
    const t = finishReveal(s);
    t.history = [t.history![0], { ...t.history![0], day: 2 }];
    const recap = gameRecap(t, 0);
    expect(recap.worst.join(' ')).not.toMatch(/\$0 sale|undercut|took \d+ customers/);
  });

  it('a rival\'s offer that did not qualify was not "beaten", and there was no tie with it', () => {
    const over = weiDay(4, 5);
    expect(offerOf(line(over), 1).tooOld).toBe(true);
    expect(explainLine(over, line(over), 0).headline).toBe('Sold 2 at $4.');
    expect(dayHighlights(over, 0).map((x) => x.text).join(' ')).not.toContain('You beat');
    const r = rivalReaction(over, line(over), 0, new Set());
    expect(r === null || ![...quips('stung'), ...quips('lost')].includes(r.text)).toBe(true);
    const t = finishReveal(over);
    expect(gameRecap(t, 0).best.join(' ')).not.toContain('You beat');
    // Rosa's okay apples at $4 cannot sell to Wei at his top, so a Haggler on your side won no tie.
    const okay = (() => { const start = market(['Wei Jie', 'apple']); start.players[0].stock.apple[FRESH('apple')] = 2; start.players[0].trait = 'haggler'; start.players[1].trait = null; start.players[1].stock.apple[OKAY('apple')] = 2; return bell(start, 'apple', [2, 2, 0], [4, 4, 0]); })();
    expect(offerOf(line(okay), 1).tooOld).toBe(true);
    expect(explainLine(okay, line(okay), 0).headline).not.toMatch(/Tie|beat/);
  });

  it('when you were not in the line, a rival that did not qualify was not "beaten" either', () => {
    const start = market(['Wei Jie', 'apple']);
    start.players[1].stock.apple[FRESH('apple')] = 2;
    start.players[2].stock.apple[FRESH('apple')] = 2;
    const s = bell(start, 'apple', [0, 2, 2], [0, 5, 4]);
    expect(explainLine(s, line(s), 0).headline).toBe(`${BENNY.name} sold 2 at $4.`);
  });
});

describe('what-if advice follows the tie order and your crate', () => {
  /** Lola Lens wants 2 mangoes. You put out 2 fresh at $8; the rival `p` puts out 2 at $7 at `pos` freshness. */
  function lola(p: 1 | 2, pos: number, setup: (s: GameState) => void = () => {}, favoured: number[] = []) {
    const start = market(['Sarah', 'mango']);
    start.players[0].stock.mango[FRESH('mango')] = 2;
    start.players[p].stock.mango[pos] = 2;
    setup(start);
    const out = [2, p === 1 ? 2 : 0, p === 2 ? 2 : 0];
    const at = (mine: number) => bell(start, 'mango', out, [mine, 7, 7], favoured);
    return { s: at(8), at };
  }

  it('names the Haggler when a tie would lose (Rosa $7, you $8, both fresh)', () => {
    const { s, at } = lola(1, FRESH('mango'));
    expect(lookOf(line(s).name).title).toBe('Lola Lens');
    const st = explainLine(s, line(s), 0);
    expect(st.headline).toBe('Rosa undercut you by $1.');
    expect(st.detail).toBe("You $8, Rosa $7. $6 would've sold 2. A $7 tie loses too: Rosa is the Haggler.");
    expect(offerOf(line(at(7)), 0).sold).toBe(0);
    expect(offerOf(line(at(6)), 0).sold).toBe(2);
  });

  it('names Favoured Trade when the rival played it', () => {
    const { s, at } = lola(2, FRESH('mango'), () => {}, [2]);
    expect(s.players[2].favouredTrade).toBe(true);
    expect(explainLine(s, line(s), 0).detail).toBe(`You $8, ${BENNY.name} $7. $6 would've sold 2. A $7 tie loses too: ${BENNY.name} has Favoured Trade.`);
    expect(offerOf(line(at(7)), 0).sold).toBe(0);
  });

  it('says matching would have won when your fruit was fresher', () => {
    const { s, at } = lola(2, OKAY('mango'));
    expect(explainLine(s, line(s), 0).detail).toBe(`You $8, ${BENNY.name} $7. Match $7 and you win (fresher fruit): 2 sold.`);
    expect(offerOf(line(at(7)), 0).sold).toBe(2);
  });

  it('says matching would have won when you are the Haggler', () => {
    const { s, at } = lola(2, FRESH('mango'), (x) => { x.players[0].trait = 'haggler'; x.players[1].trait = null; });
    expect(explainLine(s, line(s), 0).detail).toBe(`You $8, ${BENNY.name} $7. Match $7 and you win (Haggler): 2 sold.`);
    expect(offerOf(line(at(7)), 0).sold).toBe(2);
    // The same words when you win the tie itself.
    const won = at(7);
    expect(explainLine(won, line(won), 0).headline).toBe('Tie at $7. You win: Haggler.');
  });

  it('a tie the Haggler wins still sells what is left of the order (review case: John, 2 watermelons)', () => {
    const start = market(['John', 'watermelon']);
    start.players[0].stock.watermelon[FRESH('watermelon')] = 2;
    start.players[1].stock.watermelon[FRESH('watermelon')] = 1; // Rosa, the Haggler
    start.players[2].stock.watermelon[OKAY('watermelon')] = 1; // Benny: okay
    const at = (mine: number) => bell(start, 'watermelon', [2, 1, 1], [mine, 4, 4]);
    const s = at(5);
    expect(explainLine(s, line(s), 0).detail).toBe("You $5, Rosa $4. $3 would've sold 2. A $4 tie sells just 1: Rosa is the Haggler.");
    expect(offerOf(line(at(4)), 0).sold).toBe(1);
    expect(offerOf(line(at(3)), 0).sold).toBe(2);
    // When the Haggler's pieces fill the order, the tie really sells nothing.
    const full = (() => { const x = structuredClone(start); x.players[1].stock.watermelon[FRESH('watermelon')] = 2; return x; })();
    const f = bell(full, 'watermelon', [2, 2, 1], [5, 4, 4]);
    expect(explainLine(f, line(f), 0).detail).toBe("You $5, Rosa $4. $3 would've sold 2. A $4 tie loses too: Rosa is the Haggler.");
    expect(offerOf(line(bell(full, 'watermelon', [2, 2, 1], [4, 4, 4])), 0).sold).toBe(0);
  });

  it('counts the pieces that qualify at the lower price, not only those that did at yours (review case: Priya)', () => {
    const start = market(['Priya', 'apple']); // Everyday, wants 3
    start.players[0].stock.apple[FRESH('apple')] = 1;
    start.players[0].stock.apple[OKAY('apple')] = 2; // too old for Priya at $6, fine at $5
    start.players[2].stock.apple[FRESH('apple')] = 3;
    const at = (mine: number) => bell(start, 'apple', [3, 0, 3], [mine, 0, 5]);
    const s = at(6);
    expect(offerOf(line(s), 0).qty).toBe(1);
    expect(explainLine(s, line(s), 0).detail).toBe(`You $6, ${BENNY.name} $5. Match $5 and you win (you bought earlier today): 3 sold.`);
    expect(offerOf(line(at(5)), 0).sold).toBe(3);
  });

  it('gives a what-if for a later customer when your crate still had room (review case: Aisyah, then Kumar)', () => {
    const start = market(['Aisyah', 'watermelon'], ['Kumar', 'watermelon']);
    start.players[0].stock.watermelon[FRESH('watermelon')] = 5;
    start.players[1].stock.watermelon[FRESH('watermelon')] = 2;
    start.players[2].stock.watermelon[FRESH('watermelon')] = 3;
    start.players[1].trait = null;
    start.players[2].trait = null;
    const at = (mine: number) => bell(start, 'watermelon', [5, 2, 3], [mine, 5, 4]);
    const s = at(8);
    const [aisyah, kumar] = s.results!.lines.map((l) => explainLine(s, l, 0).detail);
    expect(aisyah).toBe(`You $8, ${BENNY.name} $4. Match $4 and you win (you bought earlier today): 3 sold.`);
    // Benny's $4 could tie you for Kumar too (he would have kept his melons), so the sure price is $3.
    expect(kumar).toBe("You $8, Rosa $5. $3 would've sold 2. Ties go to fresher fruit, then whoever bought earlier today.");
    expect(offerOf(line(at(3), 1), 0).sold).toBe(2);
    expect(offerOf(line(at(4), 0), 0).sold).toBe(3);
  });

  it('says when your crate nearly sold out anyway, instead of hiding how many this customer would have bought', () => {
    const start = market(['Aisyah', 'watermelon'], ['Kenji', 'watermelon']); // want 3, then 2
    start.players[0].stock.watermelon[FRESH('watermelon')] = 3;
    start.players[2].stock.watermelon[FRESH('watermelon')] = 3;
    const at = (mine: number) => bell(start, 'watermelon', [3, 0, 3], [mine, 0, 6]);
    const s = at(8);
    expect(offerOf(line(s, 1), 0).sold).toBe(2); // Kenji bought 2 of your 3 at $8
    expect(explainLine(s, line(s), 0).detail).toBe(
      `You $8, ${BENNY.name} $6. $5 would've sold 3. Ties go to fresher fruit, then whoever bought earlier today. Only 1 went unsold anyway.`,
    );
    expect(offerOf(line(at(5)), 0).sold).toBe(3);
  });

  it('does not count pieces an earlier customer already took (review 17: Premium buyer first, soft fruit left in the crate)', () => {
    // Your crate: 2 soft, 1 okay and 3 fresh mangoes at $6. Rara Jenab (Premium) takes the 3 fresh ones. Lola Lens
    // (Everyday, wants 2) will not take soft fruit, so only your okay mango is left for her, and Benny's $4 beats it.
    // At $3 she would have bought that one mango, not two: the three fresh ones had already gone.
    const start = market(['Rara Jenab', 'mango'], ['Sarah', 'mango']);
    start.players[0].stock.mango = [2, 1, 3, 0, 0];
    start.players[2].stock.mango[OKAY('mango')] = 2;
    const at = (mine: number) => bell(start, 'mango', [6, 0, 2], [mine, 0, 4]);
    const s = at(6);
    expect(offerOf(line(s, 0), 0).sold).toBe(3);
    expect(offerOf(line(s, 1), 0)).toMatchObject({ qty: 1, sold: 0 });
    expect(explainLine(s, line(s, 1), 0).detail).toContain("$3 would've sold 1.");
    expect(offerOf(line(at(3), 1), 0).sold).toBe(1);
  });

  it('names the cheapest winner, whose price the what-if uses, when it is not the stall that undercut you', () => {
    const start = market(['Grace', 'apple']); // wants 2
    start.players[0].stock.apple[FRESH('apple')] = 2;
    start.players[1].stock.apple[FRESH('apple')] = 1;
    start.players[2].stock.apple[FRESH('apple')] = 1;
    start.players[1].trait = null;
    const at = (mine: number) => bell(start, 'apple', [2, 1, 1], [mine, 4, 3]);
    const s = at(5);
    const st = explainLine(s, line(s), 0);
    expect(st.headline).toBe('Rosa undercut you by $1.');
    expect(st.detail).toBe(`You $5, Rosa $4 and ${BENNY.name} $3. Match $3 and you win (you bought earlier today): 2 sold.`);
    expect(offerOf(line(at(3)), 0).sold).toBe(2);
  });

  it('does not count the same fruit twice for two buyers of one fruit', () => {
    const start = market(['Sarah', 'mango'], ['Jia Wen', 'mango']);
    start.players[0].stock.mango[FRESH('mango')] = 2;
    start.players[2].stock.mango[FRESH('mango')] = 4;
    const s = bell(start, 'mango', [2, 0, 4], [9, 0, 6]);
    const details = s.results!.lines.map((l) => explainLine(s, l, 0).detail ?? '');
    const claimed = details.map((d) => Number(/(?:you'd have sold |would have sold |: )(\d+)(?: sold)?[.,]/.exec(d)?.[1] ?? 0));
    expect(claimed.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(forSale(s, 0, 'mango'));
    expect(details[0]).toContain('Match $6 and you win (you bought earlier today): 2 sold.');
    expect(details[1]).not.toMatch(/would've sold|Match /);
  });

  it('does not tell you to cut your price when your crate sold out anyway', () => {
    const start = market(['Daniel', 'mango'], ['Vijay', 'mango']);
    start.players[0].stock.mango[FRESH('mango')] = 1;
    start.players[2].stock.mango[FRESH('mango')] = 1;
    const s = bell(start, 'mango', [1, 0, 1], [10, 0, 7]);
    const d = explainLine(s, line(s, 0), 0).detail ?? '';
    expect(d).toContain('Your only mango sold anyway.');
    expect(d).not.toContain("would've sold");
  });

  it('names the Haggler when both stalls played Favoured Trade', () => {
    const start = market(['Sarah', 'mango']);
    start.players[0].stock.mango[FRESH('mango')] = 2;
    start.players[1].stock.mango[FRESH('mango')] = 2;
    const s = bell(start, 'mango', [2, 2, 0], [7, 7, 0], [0, 1]);
    expect(s.players[0].favouredTrade && s.players[1].favouredTrade).toBe(true);
    expect(offerOf(line(s), 1).sold).toBe(2);
    const st = explainLine(s, line(s), 0);
    expect(st.headline).toBe('Tie at $7. Rosa wins: Haggler.');
    expect(st.tags[line(s).offers.indexOf(offerOf(line(s), 0))]).toBe('lost tie: Haggler');
  });

  it('every claim holds when the bell is re-run at the suggested price (seeded computer games)', () => {
    const replay = (b: GameState, r: GameState, viewer: number, fruit: FruitId, price: number) => {
      let g = b;
      for (let p = 0; p < b.players.length; p++) {
        if (g.bids[p] !== null) continue;
        const posts = r.bids[p]!.map((x) => (p === viewer && x.fruit === fruit ? { ...x, price } : x));
        g = submitPrices(g, p, posts);
      }
      // Rules 18: Favoured Trade is played after the flip. The stalls that played it in the real game play it again
      // if they are asked; a card that stayed in a hand stays there.
      return settleTies(g, r.players.map((pl, i) => (pl.favouredTrade ? i : -1)).filter((i) => i >= 0));
    };
    // Each kind of claim, and how often the seeded games must make it for the check to mean something.
    const need: Record<string, number> = { at: 20, match: 20, lose: 20, only: 5, after: 5, tieWon: 20, soldAll: 20, allBut: 5 };
    const seen: Record<string, number> = Object.fromEntries(Object.keys(need).map((k) => [k, 0]));
    const wrong: string[] = [];
    const WHY = "(?: is the Haggler| has Favoured Trade|'s fruit was fresher| bought earlier today)";
    for (let seed = 1; seed <= 90; seed++) {
      const n = 2 + (seed % 3);
      let s = newGame({
        players: RIVALS.slice(0, n).map((x, i) => ({ name: x.name, kind: 'ai' as const, level: (['easy', 'normal', 'hard'] as const)[(seed + i) % 3], avatar: x.avatar })),
        days: 8, unripe: true, upgrades: true, events: seed % 2 === 0, seed,
      });
      let bidStart: GameState | null = null;
      while (s.phase !== 'over') {
        if (s.phase === 'morning') { s = beginBuying(s); continue; }
        if (s.phase === 'bid' && !bidStart) bidStart = s;
        if (s.phase !== 'reveal') { s = aiStep(s)!; continue; }
        for (let v = 0; v < n; v++) for (const l of s.results!.lines) {
          if (!l.offers.some((o) => o.player === v)) continue;
          const d = explainLine(s, l, v).detail ?? '';
          const claim = (kind: string, price: number, holds: (cf: LineResult) => boolean) => {
            seen[kind]++;
            const cf = replay(bidStart!, s, v, l.fruit, price).results!.lines.find((x) => x.customerId === l.customerId && x.fruit === l.fruit)!;
            if (!holds(cf)) wrong.push(`seed ${seed} day ${s.day} viewer ${v} ${l.name}: ${d}`);
          };
          const sold = (cf: LineResult) => cf.offers.find((o) => o.player === v)?.sold ?? 0;
          // Named stalls sell ahead of you at that price.
          const ahead = (names: string[]) => (cf: LineResult) => names.every((name) => {
            const i = cf.offers.findIndex((o) => s.players[o.player].name === name);
            return i >= 0 && i < cf.offers.findIndex((o) => o.player === v);
          });
          // Rules 14: a standing order's line is not part of the row (it buys by its own rule, before the customers).
          const ofFruit = s.results!.lines.filter((x) => x.fruit === l.fruit && x.name !== s.results!.order?.name);
          const total = ofFruit.reduce((a, x) => a + (x.offers.find((o) => o.player === v)?.sold ?? 0), 0);
          // The first customer of a fruit, when you sold none of it all day: the count is exact, not a lower bound.
          const exact = ofFruit[0] === l && total === 0;
          const atLeast = (n: number) => (cf: LineResult) => (exact ? sold(cf) === n : sold(cf) >= n);
          const at = /\$(\d+) would've sold (\d+)\./.exec(d);
          if (at) claim('at', Number(at[1]), atLeast(Number(at[2])));
          const match = /Match \$(\d+) and you win.*: (\d+) sold\./.exec(d);
          if (match) claim('match', Number(match[1]), atLeast(Number(match[2])));
          const lose = new RegExp(`A \\$(\\d+) tie loses too: (.+?)${WHY}`).exec(d);
          if (lose) claim('lose', Number(lose[1]), (cf) => ahead([lose[2]])(cf) && sold(cf) === 0);
          const only = new RegExp(`A \\$(\\d+) tie sells just (\\d+): (.+?)${WHY}`).exec(d);
          if (only) claim('only', Number(only[1]), (cf) => ahead([only[3]])(cf) && sold(cf) === Number(only[2]));
          const after = /Match \$(\d+): (\d+) sold(?: too)?, after (.+?)\./.exec(d);
          if (after) claim('after', Number(after[1]), (cf) => ahead(after[3].split(' and '))(cf) && sold(cf) >= Number(after[2]));
          const won = /^\$(\d+) would've won it\./.exec(d);
          if (won) claim('tieWon', Number(won[1]), (cf) => sold(cf) >= 1);
          const all = /(?:All (\d+)|Your only \w+) sold anyway\./.exec(d);
          if (all) {
            seen.soldAll++;
            if (total !== Number(all[1] ?? 1) || total !== rowCount(s, v, l.fruit)) wrong.push(`seed ${seed} day ${s.day} viewer ${v} ${l.name}: ${d}`);
          }
          const allBut = /Only (\d+) went unsold anyway\./.exec(d);
          if (allBut) {
            seen.allBut++;
            if (rowCount(s, v, l.fruit) - total !== Number(allBut[1])) wrong.push(`seed ${seed} day ${s.day} viewer ${v} ${l.name}: ${d}`);
          }
        }
        s = finishReveal(s);
        bidStart = null;
      }
    }
    expect(wrong).toEqual([]);
    for (const k of Object.keys(need)) expect(seen[k], k).toBeGreaterThan(need[k]);
  }, 120_000);
});

describe('Closing Day recap', () => {
  /** The final day's sales are done; your shelf is replaced by `ripe` okay apples and `green` unripe mangoes. */
  function closing(marketDays: boolean, ripe: number, green: number): GameState {
    let s = newGame({
      players: RIVALS.slice(0, 2).map((r) => ({ name: r.name, kind: 'ai' as const, level: 'normal' as const, avatar: r.avatar })),
      days: 3, unripe: true, upgrades: false, events: false, seed: 2, marketDays,
    });
    while (!(s.day === s.config.days && s.phase === 'reveal')) s = autoplay(s, 1);
    s = structuredClone(s);
    s.players[0].stock = emptyStock(true);
    s.players[0].stock.apple[OKAY('apple')] = ripe;
    s.players[0].stock.mango[FRUIT.mango.ripe.length] = green;
    return finishReveal(s);
  }

  it('says the jam maker paid for ripe leftovers; only green ones (or every one with Closing Day off) are worth $0', () => {
    const on = closing(true, 20, 1);
    expect(on.jam?.[0]).toBe(20 * JAM_PRICE);
    const paid = `20 ripe fruit left at closing: the jam maker paid $${20 * JAM_PRICE}.`;
    expect(gameRecap(on, 0).worst.join(' ')).not.toContain('unsold at closing');
    expect(gameRecap(on, 0).worst).toContain(paid);
    expect(closingLeftovers(on, 0)).toEqual([{ n: 20, text: paid }, { n: 1, text: '1 green fruit left at closing (worth $0).' }]);
    const off = closing(false, 20, 1);
    expect(off.jam).toBeUndefined();
    expect(closingLeftovers(off, 0)).toEqual([{ n: 21, text: '21 fruit left unsold at closing (worth $0).' }]);
  });
});

describe('Showdown card', () => {
  it('does not say "You offer 0" for fruit that did not qualify', () => {
    const start = market(['Wei Jie', 'apple']);
    start.players[0].stock.apple[FRESH('apple')] = 2;
    start.players[1].stock.apple[FRESH('apple')] = 2;
    const s = bell(start, 'apple', [2, 2, 0], [5, 4, 0]);
    const l = line(s);
    // The customer's card in the rush (PLAN-084: one card for each customer, built from the day's results).
    const card = rushCards(s, 0).find((c) => c.blocks.some((b) => b.line === l))!;
    const html = toStaticHtml(h(RushView, { s, a: { card, n: 1, of: 1, stage: 'result', row: [], served: [] } }));
    expect(html).toContain('none qualify');
    expect(html).not.toMatch(/offer 0/);
    expect(html).toContain('over top price $4');
    expect(html).toContain('2 offered');
  });
});
