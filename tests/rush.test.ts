import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import { RIVALS, lookOf } from '../src/engine/data';
import { autoplay } from '../src/engine/ai';
import { newGame, type GameState, type LineResult, type Offer } from '../src/engine/game';
import { explainLine } from '../src/engine/story';
import * as A from '../src/ui/anim';
import { toStaticHtml } from '../src/ui/cards';
import { RushView, type ShowState } from '../src/ui/game/panels/Showdown';
import { rushBoard, rushOffer, rushPace, rushSeats, rushTotal, rushWant, type RushStage } from '../src/ui/game/rush';

// The rush pop-up, "Round the table" (DEC-068): where the stalls' cards sit, what they say, the pace, and that a
// card's face stays empty until the cards turn over.

const offer = (player: number, price: number, extra: Partial<Offer> = {}): Offer => ({ player, qty: 2, price, sold: 0, freshness: 3, ...extra });
const lineOf = (offers: Offer[]): LineResult => ({ customerId: 5, name: 'Wei Jie', fruit: 'apple', want: 3, max: 6, offers });

describe('rush seats', () => {
  it('reads like the rival row: rivals clockwise from the seat after you, then your card last, top row first', () => {
    const seats = rushSeats(lineOf([offer(2, 4), offer(0, 5), offer(3, 3), offer(1, 6)]), 0, 4);
    expect(seats.map((x) => [x.player, x.slot, x.me])).toEqual([[1, 0, false], [2, 1, false], [3, 2, false], [0, 3, true]]);
    // each seat points at its own offer (and tag)
    for (const x of seats) expect(lineOf([offer(2, 4), offer(0, 5), offer(3, 3), offer(1, 6)]).offers[x.i].player).toBe(x.player);
  });

  it('six stalls (rules 11): three rows, all five rivals in seat order, your card last', () => {
    const six = lineOf([0, 1, 2, 3, 4, 5].map((p) => offer(p, 4 + p)));
    const seats = rushSeats(six, 0, 6);
    expect(seats.map((x) => [x.player, x.slot])).toEqual([[1, 0], [2, 1], [3, 2], [4, 3], [5, 4], [0, 5]]);
    expect(rushSeats(lineOf([1, 2, 3, 4, 5].map((p) => offer(p, 4))), 0, 6).map((x) => x.slot)).toEqual([0, 1, 2, 3, 4]);
  });

  it('turn order wraps around the table for a viewer in another seat', () => {
    const seats = rushSeats(lineOf([offer(0, 4), offer(1, 5), offer(2, 3)]), 2, 3);
    expect(seats.map((x) => [x.player, x.slot])).toEqual([[0, 0], [1, 1], [2, 2]]);
    // the same order as that viewer's rival row (seats after player 1 are 2, then 0)
    expect(rushSeats(lineOf([offer(0, 4), offer(1, 5), offer(2, 3)]), 1, 3).map((x) => x.player)).toEqual([2, 0, 1]);
  });

  it('uses only as many seats as stalls that offered: one row for one or two', () => {
    expect(rushSeats(lineOf([offer(0, 4)]), 0, 4).map((x) => x.slot)).toEqual([0]);
    expect(rushSeats(lineOf([offer(3, 4), offer(0, 5)]), 0, 4).map((x) => [x.player, x.slot])).toEqual([[3, 0], [0, 1]]);
    expect(rushSeats(lineOf([offer(1, 4), offer(2, 5)]), 0, 4).map((x) => [x.player, x.slot])).toEqual([[1, 0], [2, 1]]);
    // three rivals and no offer from you: no bottom-left gap for you
    expect(rushSeats(lineOf([offer(1, 4), offer(2, 5), offer(3, 6)]), 0, 4).map((x) => x.slot)).toEqual([0, 1, 2]);
  });
});

describe('rush texts', () => {
  it('says what the customer wants with display names', () => {
    const w = rushWant(lineOf([]));
    expect([w.qty, w.fruit, w.cap]).toEqual(['wants 3 ×', 'Apples', 'up to $6 fresh']);
    expect(w.label).toBe(`${lookOf('Wei Jie').title} wants 3 apples, up to $6 each when fresh`);
    expect(lookOf('Wei Jie').title).not.toBe('Wei Jie');
    expect(rushWant({ ...lineOf([]), want: 1 }).fruit).toBe('Apple');
  });

  it('a stall card shows the pieces offered and their freshness, or that none qualify', () => {
    expect(rushOffer(offer(0, 4, { qty: 2, freshness: 5 }), 'apple')).toEqual({ text: '2 offered', stage: 'fresh' });
    expect(rushOffer(offer(0, 4, { qty: 1, freshness: 1 }), 'apple')).toEqual({ text: '1 offered', stage: 'okay' });
    expect(rushOffer(offer(0, 4, { qty: 0, tooOld: true }), 'apple')).toEqual({ text: 'none qualify', stage: null });
  });

  it('price boards stay sealed until the flip, then show won or lost with the tag', () => {
    const won = offer(0, 4, { sold: 2 });
    const stages: RushStage[] = ['in', 'deal', 'flip', 'result', 'out'];
    expect(stages.map((st) => rushBoard(st, won, 'SOLD ×2'))).toEqual([
      { open: false }, { open: false }, { open: true }, { open: true, res: 'won', tag: 'SOLD ×2' }, { open: true, res: 'won', tag: 'SOLD ×2' },
    ]);
    expect(rushBoard('result', offer(1, 6), '$2 too high')).toEqual({ open: true, res: 'lost', tag: '$2 too high' });
  });
});

describe('rush pace', () => {
  it('about 2 s to read after the flip, and no longer per customer than the old showdown card', () => {
    for (const n of [1, 2, 3, 4]) {
      const p = rushPace(n);
      expect(p.flip + p.hold).toBeGreaterThanOrEqual(2000);
      expect(p.flip + p.hold).toBeLessThanOrEqual(2500);
      expect(rushTotal(n)).toBeLessThanOrEqual(3500);
    }
  });

  it('a tap on the pop-up ends the wait at once; the next customer plays at the normal pace again', async () => {
    A.resetHurry();
    const t0 = Date.now();
    const w = A.wait(5000);
    A.speedStep();
    await w;
    expect(Date.now() - t0).toBeLessThan(500);
    expect(A.speed()).toBeLessThan(1);
    A.resetStep();
    expect(A.speed()).toBe(1);
    expect(A.hurried()).toBe(false);
    A.hurryUp();
    expect(A.hurried()).toBe(true);
    A.resetHurry();
  });
});

describe('rush pop-up render', () => {
  // A real four-stall day at the bell, with a customer that two or more stalls offered to.
  const game = (): { s: GameState; l: LineResult } => {
    for (let seed = 1; seed < 60; seed++) {
      let s = newGame({
        players: [{ name: 'You', kind: 'ai', level: 'normal', avatar: '🧑‍🍳' }, ...RIVALS.slice(0, 3).map((r) => ({ name: r.name, kind: 'ai' as const, level: 'normal' as const, avatar: r.avatar }))],
        days: 10, unripe: true, upgrades: true, events: false, seed,
      });
      for (let i = 0; i < 400 && s.phase !== 'reveal'; i++) s = autoplay(s, 1);
      const l = s.results?.lines.find((x) => x.offers.length >= 2 && x.offers.some((o) => o.player === 0));
      if (l) return { s, l };
    }
    throw new Error('no contested line found');
  };
  const { s, l } = game();
  const show = (stage: RushStage): ShowState => ({ line: l, n: 1, of: 3, stage, dealt: stage === 'in' ? 0 : l.offers.length, story: explainLine(s, l, 0), react: null, cust: '', served: [] });

  it('face down: one card back per stall that offered, and nothing on the faces', () => {
    const html = toStaticHtml(h(RushView, { s, a: show('deal'), viewer: 0 }));
    expect(html.match(/class="rs-back"/g)?.length).toBe(l.offers.length);
    expect(html).not.toContain('rs-price');
    expect(html).not.toContain('offered');
    expect(html).toContain('Customer 1 of 3');
    expect(html).toContain('auction rush');
  });

  it('after the flip: prices, your mustard seat, the tags and the explanation', () => {
    const html = toStaticHtml(h(RushView, { s, a: show('result'), viewer: 0 }));
    const story = explainLine(s, l, 0);
    for (const o of l.offers) expect(html).toContain(`$${o.price}`);
    for (const t of story.tags) expect(html).toContain(t.replace(/&/g, '&amp;'));
    expect(html.match(/rs-seat s\d [^"]*\bme\b/g)?.length).toBe(1);
    expect(html).toContain('You');
    expect(html).toContain(story.headline.replace(/&/g, '&amp;').replace(/'/g, '&#39;').slice(0, 12));
  });
});
