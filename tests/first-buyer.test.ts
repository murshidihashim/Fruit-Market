import { describe, expect, it, vi } from 'vitest';
import { h } from 'preact';
import { aiActFor } from '../src/engine/ai';
import { RIVALS } from '../src/engine/data';
import { activePlayer, applyAction, newGame, publicView, type GameState } from '../src/engine/game';
import { redact } from '../server/room';
import { toStaticHtml } from '../src/ui/cards';
import { Stalls } from '../src/ui/table';
import { firstBuyer, firstLine, seatNo } from '../src/ui/firstBuyer';
import { resetSeen, shownToken } from '../src/ui/firstShown';
import { slideFrames, spinFrames } from '../src/ui/game/dayBeats';

// The stalls' boxes redraw themselves when a held-back total changes (hooks); a still picture needs none of that.
vi.mock('../src/ui/cashShown', async (original) => ({ ...(await original<typeof import('../src/ui/cashShown')>()), useCashShown: () => undefined }));
vi.mock('../src/ui/stockShown', async (original) => ({ ...(await original<typeof import('../src/ui/stockShown')>()), useStockShown: () => undefined }));

// PLAN-104, the owner's requests: the badge on a stall's box is its seat round the table (not its place in the buying
// order, which the row already shows), and a First token sits on today's first buyer with the reason.

const game = (stalls: number, seed: number): GameState => newGame({
  players: RIVALS.slice(0, stalls).map((r, i) => ({ name: i ? r.name : 'Me', kind: i ? 'ai' as const : 'human' as const, avatar: r.avatar })),
  days: 8, unripe: true, upgrades: true, events: false, seed,
});
/** Plays on (computers for everyone) until the test's moment. */
function playTo(s: GameState, when: (s: GameState) => boolean): GameState {
  for (let i = 0; i < 20000 && !when(s); i++) {
    if (s.phase === 'morning') {
      const pick = s.players.findIndex((p) => p.traitOffer && !p.trait);
      s = pick >= 0 ? applyAction(s, pick, { kind: 'trait', trait: s.players[pick].traitOffer![0] }) : applyAction(s, 0, { kind: 'begin' });
    } else if (s.phase === 'reveal') s = applyAction(s, 0, { kind: 'finish' });
    else s = aiActFor(s, activePlayer(s))!;
  }
  if (!when(s)) throw new Error('the moment never came');
  return s;
}
/** The day's takings are in (the bell has rung): the last moment before the evening, which a stall with nothing to
 *  decide never sees. */
const evening = (s: GameState, day: number) => playTo(s, (x) => x.day === day && x.phase === 'reveal');
const dawn = (s: GameState, day: number) => playTo(s, (x) => x.day === day && x.phase === 'morning');
/** Stall `p` plays a Priority card this evening (the card is put in its hand at the bell; nobody else holds one). */
function priority(s: GameState, p: number): GameState {
  const x: GameState = structuredClone(s);
  x.players.forEach((pl, i) => { pl.favours = pl.favours.filter((f) => f !== 'priority'); if (i === p) pl.favours.push('priority'); });
  const eve = applyAction(x, 0, { kind: 'finish' });
  expect(eve.phase).toBe('evening');
  return applyAction(eve, p, { kind: 'favour', idx: eve.players[p].favours.indexOf('priority') });
}
/** Who rules 10 alone would put first: the least cash at dawn, a tie going to the first clockwise from the token. */
function leastCash(s: GameState): number {
  const n = s.players.length;
  const cash = s.dayStartCash!;
  const rota = Array.from({ length: n }, (_, i) => (s.firstPlayer + i) % n);
  return rota.find((i) => cash[i] === Math.min(...cash))!;
}
/** A stall that would not go first anyway, other than `not`. */
const notFirst = (s: GameState, not: number[] = []) => s.players.findIndex((_, i) => !not.includes(i) && i !== s.order[0]);

describe('who buys first, and why (firstBuyer.ts)', () => {
  it('Day 1: the stall the token was put on at random, picked at random, then clockwise', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const s = playTo(game(4, seed), (x) => x.phase === 'buy');
      expect(s.order[0]).toBe(s.firstPlayer);
      expect(firstBuyer(s)).toEqual({ p: s.firstPlayer, why: { kind: 'random' } });
    }
    const s = playTo(game(4, 2), (x) => x.phase === 'buy');
    const name = s.firstPlayer === 0 ? 'You buy first' : `${s.players[s.firstPlayer].name} buys first`;
    expect(firstLine(s, 0)?.text).toBe(`${name} · picked at random · then clockwise`);
  });

  it('a later day: the least cash at dawn, with that cash, then clockwise', () => {
    let checked = 0;
    for (const seed of [3, 7, 11, 19]) {
      for (const day of [2, 4, 5]) {
        const s = dawn(game(4, seed), day);
        const cash = s.dayStartCash!;
        if (cash.filter((c) => c === Math.min(...cash)).length > 1) continue;
        // a computer stall may have played a Priority card last evening: then that is the reason
        if (s.order[0] !== leastCash(s)) {
          expect(s.log).toContain(`${s.players[s.order[0]].name} played Priority`);
          expect(firstBuyer(s)?.why.kind).toBe('priority');
          continue;
        }
        expect(firstBuyer(s)).toEqual({ p: s.order[0], why: { kind: 'cash', cash: Math.min(...cash) } });
        expect(firstLine(s, 0)?.tail).toBe(`least cash $${Math.min(...cash)} · then clockwise`);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(5);
  });

  it('a tie for the least cash: the first of the tied stalls clockwise from the token, which the line names by seat', () => {
    const eve = evening(game(4, 7), 1);
    // two stalls end the day with the same, smallest sum (over the top-up: they keep it at dawn)
    const x: GameState = structuredClone(eve);
    x.players.forEach((pl, i) => { pl.cash = i === 1 || i === 3 ? 8 : 20; pl.favours = pl.favours.filter((f) => f !== 'priority'); });
    const s = dawn(x, 2);
    expect(s.dayStartCash).toEqual([20, 8, 20, 8]);
    // of seats 2 and 4, the one met first going clockwise from the token's seat
    const rota = [0, 1, 2, 3].map((k) => (s.firstPlayer + k) % 4);
    const first = rota.indexOf(1) < rota.indexOf(3) ? 1 : 3;
    expect(s.order[0]).toBe(first);
    expect(firstBuyer(s)).toEqual({ p: first, why: { kind: 'tie', cash: 8, from: s.firstPlayer } });
    expect(firstLine(s, 0)?.tail).toBe(`tied at $8, first from seat ${s.firstPlayer + 1} · then clockwise`);
  });

  it('a Priority card played the evening before: Priority card, then the least cash and on clockwise', () => {
    const eve = evening(game(4, 11), 1);
    const p = [1, 2, 3, 0].find((q) => leastCash(dawn(eve, 2)) !== q)!;
    const s = dawn(priority(eve, p), 2);
    expect(s.order[0]).toBe(p);
    expect(firstBuyer(s)).toEqual({ p, why: { kind: 'priority', egg: null } });
    const second = s.order[1];
    expect(second).toBe(leastCash(s));
    expect(firstLine(s, 0)?.tail).toBe(`Priority card · then ${second === 0 ? 'you' : s.players[second].name}, clockwise`);
  });

  it('Nest Egg on Day 3; with a Priority card the evening before, Priority first and Nest Egg next', () => {
    const start = game(4, 19);
    const egg = 2;
    start.players[egg].trait = 'nestegg';
    const eve = evening(start, 2);
    const s = dawn(eve, 3);
    expect(s.order[0]).toBe(egg);
    expect(firstBuyer(s)).toEqual({ p: egg, why: { kind: 'nestEgg' } });
    expect(firstLine(s, 0)?.text).toBe(`${s.players[egg].name} buys first · Nest Egg, Day 3 · then ${s.order[1] === 0 ? 'you' : s.players[s.order[1]].name}, clockwise`);

    const p = notFirst(s, [egg]);
    const t = dawn(priority(eve, p), 3);
    expect(t.order.slice(0, 2)).toEqual([p, egg]);
    expect(firstBuyer(t)).toEqual({ p, why: { kind: 'priority', egg } });
    expect(firstLine(t, 0)?.tail).toBe(`Priority card · ${s.players[egg].name} next, Nest Egg`);
    // not on Day 2: Nest Egg is only for Day 3
    const d2 = dawn(start, 2);
    expect(firstBuyer(d2)?.why.kind).not.toBe('nestEgg');
  });

  it('reads the same on every phone: the reason comes from public facts, kept in each stall\'s view online', () => {
    const eve = evening(game(5, 3), 1);
    const s = dawn(priority(eve, notFirst(dawn(eve, 2))), 2);
    for (let v = 0; v < 5; v++) expect(firstBuyer(redact(s, v))).toEqual(firstBuyer(s));
  });
});

describe('the badge on a stall\'s box is its seat (table.tsx Stalls)', () => {
  const row = (s: GameState, viewer: number) => toStaticHtml(h(Stalls, { s, viewer, boards: {}, open: null, onOpen: () => undefined, onClose: () => undefined, off: [] }));
  const badges = (html: string) => [...html.matchAll(/<i class="tb-ord[^"]*"[^>]*>(\d+)<\/i>/g)].map((m) => Number(m[1]));

  for (const stalls of [3, 4, 6]) {
    it(`${stalls} stalls: in the morning, at the bid for an order and while buying, every phone shows each box's seat, the boxes in buying order`, () => {
      resetSeen();
      const seen: string[] = [];
      let s = game(stalls, 23);
      for (let day = 1; day <= 4; day++) {
        s = dawn(s, day);
        for (const at of [s, playTo(s, (x) => x.phase === 'buy' || x.phase === 'order'), playTo(s, (x) => x.phase === 'buy' && x.turn > 0)]) {
          seen.push(at.phase);
          for (let v = 0; v < stalls; v++) {
            const view = redact(at, v);
            const html = row(view, v);
            expect(badges(html)).toEqual(at.order.map(seatNo));
            // the screen reader hears the seat, never a place in the line
            expect(html).not.toContain('in the buying order,');
            for (const p of at.order) expect(html).toContain(`seat ${p + 1}`);
            expect(html).toContain(at.order[0] === v ? 'seat ' + (v + 1) + ', you buy first' : 'buys first');
          }
          expect(badges(row(publicView(at, 0), 0))).toEqual(at.order.map((p) => p + 1));
        }
      }
      expect(seen).toContain('morning');
      expect(seen).toContain('buy');
    });
  }

  it('the token sits on the first box once the day is on show, and not on a morning this phone has not shown yet', () => {
    resetSeen();
    const morning = dawn(game(4, 23), 2);
    expect(shownToken(morning)).toEqual({ at: null, why: false });
    expect(row(morning, 0)).not.toContain('data-a="first-token"');
    expect(row(morning, 0)).toContain('tb-why off');
    // the standing order's sheet lies over the row too: still not its moment
    expect(shownToken({ ...morning, phase: 'order' })).toEqual({ at: null, why: false });
    const buy = playTo(morning, (x) => x.phase === 'buy');
    expect(shownToken(buy)).toEqual({ at: buy.order[0], why: true });
    expect(row(buy, 0)).toContain('<i class="tb-first" data-a="first-token" style="--k:0" aria-hidden="true">First</i>');
    expect(row(buy, 0)).toContain('tb-why go');
    // after buying the row holds your rivals in seat order: no token and no line
    const later = playTo(buy, (x) => x.phase === 'stall');
    expect(row(later, 0)).not.toContain('first-token');
    expect(row(later, 0)).toContain('<p class="tb-why off" aria-hidden="true"></p>');
    expect(row(later, 0)).not.toContain('buys first');
  });
});

describe('the token\'s moves (game/dayBeats.tsx)', () => {
  it('Day 1: round the boxes at least twice, never backwards across the row, slowing down, and stopping on the first', () => {
    for (const lefts of [[0, 60, 120, 180], [0, 50, 100, 150, 200, 250], [0, 120]]) {
      const f = spinFrames(lefts);
      const offs = f.map((k) => k.offset as number);
      for (let i = 1; i < offs.length; i++) expect(offs[i]).toBeGreaterThanOrEqual(offs[i - 1]);
      expect(offs[offs.length - 1]).toBe(1);
      expect(f[f.length - 1]).toMatchObject({ transform: 'translateX(0.0px)', opacity: 1 });
      // each move between two frames is one box to the right, or the way round (faded out) back to the first
      for (let i = 1; i < f.length; i++) {
        const dx = (k: Keyframe) => Number(/translateX\((-?[\d.]+)px\)/.exec(String(k.transform))![1]);
        const step = dx(f[i]) - dx(f[i - 1]);
        if (step < 0) expect(f[i - 1].opacity === 0 || f[i].opacity === 0).toBe(true);
      }
      // only position and fade
      for (const k of f) expect(Object.keys(k).sort()).toEqual(['offset', 'opacity', 'transform']);
      // hops slow down: the last hop takes longer than the first
      // (the last hop is the way round: its last three frames; the first hop ends at the third frame)
      expect(1 - offs[offs.length - 4]).toBeGreaterThan(offs[2]);
    }
  });
  it('a later morning: one slide from yesterday\'s box to the first; nothing when it was already first', () => {
    expect(slideFrames([0, 60, 120, 180], 2)).toEqual([{ transform: 'translateX(120.0px)' }, { transform: 'none' }]);
    expect(slideFrames([0, 60, 120, 180], 0)).toBeNull();
    expect(slideFrames([0, 60], 5)).toBeNull();
  });
});
