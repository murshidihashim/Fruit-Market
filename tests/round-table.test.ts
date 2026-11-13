// One table from "Open my stall" to the rush (flow A; PLAN-099, DEC-116): nothing is drawn before its moment (a rival's
// crate is a lid, then one face-down square for each piece, and only at the bell its pieces and prices), the crates
// open clockwise from this stall's, the Favoured Trade question is asked in the middle, the rush starts at the same
// table, the pricing sheet leaves every seat in view, and the hand-over hides the last person's crate.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { h } from 'preact';
import { aiActFor } from '../src/engine/ai';
import { RIVALS } from '../src/engine/data';
import { activePlayer, applyAction, forSale, newGame, outCount, publicView, type GameState } from '../src/engine/game';
import { redact } from '../server/room';
import { toStaticHtml } from '../src/ui/cards';
import { dayStep, type DayNow } from '../src/ui/game/daySheet';
import { PreView, RushView } from '../src/ui/game/panels/RushTable';
import { LOWEST_CRATE, TABLE, middleOf, rushCards, seatOrder, tableLay, tableMin, type Place } from '../src/ui/game/rush';
import { crateFit, preTable, tableSeats, type PreFacts, type TableFacts, type TableSeat, type TableStep } from '../src/ui/game/tableNow';
import { holdRush, releaseRush } from '../src/ui/rushShown';

const read = (f: string) => readFileSync(f, 'utf8');

/** A game of `n` stalls (seat 0 a person, played here by the computer) up to the first state `stop` accepts. */
function play(n: number, seed: number, stop: (s: GameState) => boolean): GameState {
  let s = newGame({
    players: Array.from({ length: n }, (_, i) => ({ name: i === 0 ? 'You' : RIVALS[i].name, kind: i === 0 ? 'human' as const : 'ai' as const, level: 'normal' as const, avatar: RIVALS[i].avatar })),
    days: 10, unripe: true, upgrades: true, events: true, seed,
  });
  for (let i = 0; i < 20000 && s.phase !== 'over'; i++) {
    if (stop(s)) return s;
    if (s.phase === 'morning') {
      const pick = s.players.findIndex((p) => p.traitOffer && !p.trait);
      s = pick >= 0 ? applyAction(s, pick, { kind: 'trait', trait: s.players[pick].traitOffer![0] }) : applyAction(s, 0, { kind: 'begin' });
      continue;
    }
    if (s.phase === 'reveal') { s = applyAction(s, 0, { kind: 'finish' }); continue; }
    s = aiActFor(s, activePlayer(s))!;
  }
  throw new Error('the game never got there');
}
const outOf = (s: GameState, p: number) => (['blueberry', 'watermelon', 'mango', 'apple'] as const).reduce((a, f) => a + forSale(s, p, f), 0);
/** Stocking on day 3: stall 0 and the next stall have opened, the others are still filling their crates. */
const stocking = play(4, 7, (s) => s.day === 3 && s.phase === 'stall' && s.stalls[0] !== null && s.stalls[1] !== null && s.stalls[2] === null);
/** Pricing on day 3: stall 0 has rung the bell, the next stall has sealed too, the others are still pricing. */
const pricing = play(4, 7, (s) => s.day === 3 && s.phase === 'bid' && s.bids[0] !== null && s.bids[1] !== null && s.bids[2] === null);
/** The bell on day 3: every price in and the rush worked out. */
const bell = play(4, 7, (s) => s.day === 3 && s.phase === 'reveal' && !!s.results?.lines.some((l) => l.offers.length));

const facts = (step: TableStep, more: Partial<TableFacts> = {}): TableFacts => ({ step, sent: null, own: null, vals: null, open: null, ...more });
const pre = (step: TableStep, more: Partial<PreFacts> = {}): PreFacts => ({ ...facts(step), asked: -1, mine: false, online: false, waiting: '', shared: false, answered: false, left: null, ...more });
const crates = (html: string) => html.split('<div class="rt-crate ').slice(1);
const rivalsOf = (seats: TableSeat[]) => seats.filter((x) => !x.me);

describe('nothing before its moment: a rival\'s crate before the bell', () => {
  it('while stalls are opening, a rival\'s crate is shut with its lid on and says only whether it has opened', () => {
    const v = publicView(stocking, 0);
    const seats = tableSeats(v, 0, facts('wait'));
    for (const seat of rivalsOf(seats)) {
      expect(seat).toMatchObject({ look: 'lid', squares: 0, pieces: [], tags: [] });
      expect(seat.word).toBe(stocking.stalls[seat.player] !== null ? 'ready' : 'filling…');
    }
    expect(seats.find((x) => x.player === 1)!.word).toBe('ready');
    expect(seats.find((x) => x.player === 2)!.word).toBe('filling…');
    // your own crate is face up, with no tags yet
    const me = seats.find((x) => x.me)!;
    expect(me.look).toBe('open');
    expect(me.pieces).toHaveLength(outOf(stocking, 0));
    expect(me.tags).toEqual([]);
    // drawn: no square, no fruit, no price on a rival's crate, and its word on its corner
    const drawn = crates(toStaticHtml(h(PreView, { s: v, viewer: 0, pre: preTable(v, 0, pre('wait')) })));
    for (const c of drawn.slice(1)) {
      expect(c).toMatch(/^look-lid /);
      expect(c).not.toMatch(/class="rt-sq|class="rt-pc|class="rt-tg|\$\d|x-fruit/);
      expect(c).toMatch(/class="rt-word [^"]*"[^>]*>(ready|filling…)<\/i>/);
    }
    // online the room sends no crate at all until every stall has opened (server/room.ts): whether a stall has opened
    // is the room's word, and this stall's crate is the one this screen sent
    const room = redact(stocking, 0);
    expect(room.stalls.every((x) => x === null)).toBe(true);
    const online = tableSeats(room, 0, facts('wait', { sent: [true, true, false, false], own: stocking.crates![0] }));
    expect(rivalsOf(online).map((x) => x.word)).toEqual(['ready', 'filling…', 'filling…']);
    expect(online[0].pieces).toHaveLength(outOf(stocking, 0));
  });

  it('once every stall is open, one face-down square for each piece it put out, the count right; never the fruit or the price', () => {
    const v = publicView(pricing, 0);
    for (const step of ['price', 'sealed'] as const) {
      for (const seat of rivalsOf(tableSeats(v, 0, facts(step, { vals: { apple: 5 } })))) {
        expect(seat.look).toBe('squares');
        expect(seat.squares).toBe(outOf(pricing, seat.player));
        expect(seat.squares).toBe(outCount(v, seat.player));
        expect(seat.pieces).toEqual([]);
        expect(seat.tags).toEqual([]);
      }
    }
    // before this stall rings the bell a rival says how many are out; after, whether it is still pricing or sealed
    const before = rivalsOf(tableSeats(v, 0, facts('price')));
    expect(before.map((x) => x.word)).toEqual(before.map((x) => (x.squares ? `${x.squares} out` : 'none out')));
    const after = rivalsOf(tableSeats(v, 0, facts('sealed')));
    expect(after.map((x) => x.word)).toEqual(after.map((x) => (!x.squares ? 'none out' : pricing.bids[x.player] !== null ? 'sealed' : 'pricing…')));
    // the squares drawn: as many as the pieces, and nothing else of the crate (nine and "+N" past ten)
    const html = toStaticHtml(h(PreView, { s: v, viewer: 0, pre: preTable(v, 0, pre('sealed')) }));
    crates(html).slice(1).forEach((c, i) => {
      const n = outOf(pricing, seatOrder(4, 0)[i + 1]);
      expect(c.match(/class="rt-sq"/g) ?? []).toHaveLength(n > 10 ? 9 : n);
      expect(c).not.toMatch(/rt-pc"|rt-tg|\$\d|x-fruit/);
    });
    // your own tags lie face down once you have rung: no price of yours is drawn
    expect(crates(html)[0]).not.toMatch(/\$\d/);
    // online the same from the room's view, whatever the state behind it holds
    const room = redact(pricing, 0);
    const online = tableSeats(room, 0, facts('sealed', { sent: [true, true, false, false] }));
    expect(rivalsOf(online).map((x) => [x.squares, x.word])).toEqual(rivalsOf(tableSeats(v, 0, facts('sealed'))).map((x) => [x.squares, x.word]));
  });

  it('the words in the table\'s foot while it waits: the action bar\'s own words', () => {
    expect(preTable(publicView(stocking, 0), 0, pre('wait')).hint).toEqual({ text: 'Rivals are filling their crates…', dots: false });
    expect(preTable(redact(stocking, 0), 0, pre('wait', { online: true, waiting: 'Raj' })).hint).toEqual({ text: 'Stall open. Waiting for Raj', dots: true });
    expect(preTable(publicView(pricing, 0), 0, pre('sealed')).hint).toEqual({ text: 'Rivals are setting secret prices…', dots: false });
    expect(preTable(redact(pricing, 0), 0, pre('sealed', { online: true })).hint).toEqual({ text: 'Prices sealed. Waiting for the others', dots: true });
    expect(preTable(publicView(pricing, 0), 0, pre('price')).hint).toBeNull();
  });
});

describe('the bell: the crates open one by one, clockwise from this stall\'s', () => {
  it('seat by seat in the rush\'s own seat order, starting with yours', () => {
    const v = publicView(bell, 2);
    const order = seatOrder(4, 2);
    expect(order).toEqual([2, 3, 0, 1]);
    for (let open = 0; open <= 4; open++) {
      const seats = tableSeats(v, 2, facts('bell', { open }));
      expect(seats.map((x) => x.player)).toEqual(order);
      seats.forEach((seat, i) => {
        if (i < open) expect(seat.look).toBe('open');
        else if (seat.me) expect(seat.tags.every((t) => !t.up && t.price === null)).toBe(true);
        else expect(seat).toMatchObject({ look: 'squares', squares: outOf(bell, seat.player), word: 'sealed', tags: [] });
      });
    }
    // before the bell rings (the frame before it, "No sales today") every crate is still shut
    expect(rivalsOf(tableSeats(v, 2, facts('sealed'))).every((x) => x.look === 'squares')).toBe(true);
  });

  it('the seats themselves run clockwise round the middle', () => {
    for (let n = 3; n <= 6; n++) {
      const h = 470;
      const lay = tableLay(n, 390, h);
      expect(lay.close, `${n} stalls`).toBe(false);
      const angle = (p: Place) => Math.atan2(p.top + p.height / 2 - h / 2, p.left + p.width / 2 - 195);
      const turn = lay.seats.map(angle).map((a, _i, all) => ((a - all[0]) + 4 * Math.PI) % (2 * Math.PI));
      expect(turn, `${n} stalls`).toEqual([...turn].sort((x, y) => x - y));
    }
  });
});

describe('the Favoured Trade question in the middle of the table', () => {
  const asking = play(4, 3, (s) => s.phase === 'tie');
  const asked = asking.tieAsk![0];

  it('the asked stall reads the card in the middle, the reason under the table, and answers in the foot', () => {
    const v = publicView(asking, asked);
    const html = toStaticHtml(h(PreView, { s: v, viewer: asked, pre: preTable(v, asked, pre('tie', { asked, mine: true })) }));
    const mid = html.slice(html.indexOf('<div class="rt-mid">'), html.indexOf('<div class="rt-line'));
    expect(mid).toContain('<div class="rt-ask"');
    expect(mid).toContain('data-a="tie-card"');
    expect(mid).toContain('Without it');
    expect(mid).not.toContain('class="rt-bell on"');
    expect(html.slice(html.indexOf('<div class="rt-line'))).toContain('data-a="tie-note"');
    // every crate is open while the question is asked
    expect(crates(html).every((c) => /^look-open /.test(c))).toBe(true);
  });

  it('a rival deciding: who is tied and that it is deciding, never its outcomes', () => {
    const other = (asked + 1) % asking.players.length;
    const v = publicView(asking, other);
    const html = toStaticHtml(h(PreView, { s: v, viewer: other, pre: preTable(v, other, pre('tie', { asked })) }));
    expect(html).toContain(`${asking.players[asked].name} is deciding…`);
    expect(html).not.toContain('Without it');
  });

  it('the question\'s room lies between the seats, wide enough to read, on every table', () => {
    for (const [w, h] of [[390, 380], [360, 268]]) {
      for (let n = 2; n <= 6; n++) {
        const lay = tableLay(n, w, h);
        const box = middleOf(lay, w, h);
        expect(box.width, `${n} stalls at ${w}`).toBeGreaterThanOrEqual(TABLE.minCard);
        expect(box.height).toBeGreaterThan(150);
        for (const s of lay.seats) {
          const apart = s.left >= box.left + box.width || box.left >= s.left + s.width || s.top >= box.top + box.height || box.top >= s.top + s.height;
          expect(apart, `${n} stalls at ${w}`).toBe(true);
        }
      }
    }
  });
});

describe('the rush starts at the same table', () => {
  it('the same seats, the same crates: the first customer comes in while the bell goes and the open tags fade', () => {
    const v = publicView(bell, 0);
    const size: [number, number] = [390, 380];
    const before = toStaticHtml(h(PreView, { s: v, viewer: 0, size, pre: preTable(v, 0, pre('bell')) }));
    const card = rushCards(v, 0)[0];
    // the rush holds back what has not been shown yet (rushShown.ts), as the game table does while it plays
    holdRush(v.results!, v.players.length);
    const first = toStaticHtml(h(RushView, { s: v, viewer: 0, size, a: { card, n: 1, of: 2, stage: 'in', at: 0, served: [] } }));
    releaseRush();
    const places = (html: string) => [...html.matchAll(/data-a="rt-crate-(\d)" (?:data-fit="\d" )?style="([^"]+)"/g)].map((m) => `${m[1]} ${m[2]}`);
    expect(places(first)).toEqual(places(before));
    expect(places(first)).toHaveLength(4);
    // the same pieces in each crate as the customer comes in
    const pieces = (html: string) => crates(html).map((c) => [...c.matchAll(/data-a="rt-pc-(\d-[a-z]+-\d+)"/g)].map((m) => m[1]).join());
    expect(pieces(first)).toEqual(pieces(before));
    // the bell is still drawn, going, and the bell's tags fade where the rush's tag for the fruit wanted will show
    expect(first).toContain('<div class="rt-bell " aria-hidden="true">');
    expect(first).toContain('class="rt-tags fade');
    // one element all through: the round table is drawn by one section, before the rush and in it
    const src = read('src/ui/game/panels/RushTable.tsx');
    expect(src.match(/<section /g)).toHaveLength(1);
    expect(src).toContain("const first = !!a && a.n === 1 && a.stage === 'in';");
  });

  it('after the last customer the crates stay, with what is left in them, until the takings', () => {
    const v = publicView(bell, 0);
    const p = preTable(v, 0, pre('bell', { left: v.players.map(() => ({})) }));
    expect(p.after).toBe(true);
    expect(p.seats.every((x) => x.look === 'open' && x.pieces.length === 0 && x.tags.length === 0)).toBe(true);
    expect(read('src/ui/game/panels/RushTable.tsx')).toContain("const after = !a && step === 'bell' && s.phase === 'reveal' && rushedOn.current === s.day;");
  });
});

describe('the pricing sheet leaves every seat in view', () => {
  it('the table keeps its form in the room above the sheet, every crate whole and clear of the others', () => {
    for (const [w, h] of [[390, 380], [360, 268], [360, 300]]) {
      for (let n = 2; n <= 6; n++) {
        const full = tableLay(n, w, h);
        const need = tableMin(n, w, h);
        expect(need).toBeLessThanOrEqual(h);
        const lay = tableLay(n, w, need, { form: full.close ? 'close' : 'round', free: true });
        expect(lay.close, `${n} stalls at ${w}x${h}`).toBe(full.close);
        for (const [i, a] of lay.seats.entries()) {
          expect(a.left >= 0 && a.top >= 0 && a.left + a.width <= w && a.top + a.height <= need, `${n} stalls at ${w}x${h}`).toBe(true);
          if (lay.close) expect(a.height).toBeGreaterThanOrEqual(LOWEST_CRATE);
          for (const b of lay.seats.slice(i + 1)) expect(a.left >= b.left + b.width || b.left >= a.left + a.width || a.top >= b.top + b.height || b.top >= a.top + a.height).toBe(true);
        }
      }
    }
    // six stalls on a 360 by 640 phone: three crates to a column, as wide as half the table while nothing stands in the middle
    const six = tableLay(6, 360, tableMin(6, 360, 268), { form: 'close', free: true });
    expect(six.crate).toEqual({ width: TABLE.close.wide, height: LOWEST_CRATE });
    expect(six.low).toBe(true);
  });

  it('a crate is drawn closer when its pieces and tags would not fit its seat', () => {
    const seat = (pieces: number, tags: number[]): Pick<TableSeat, 'look' | 'squares' | 'pieces' | 'tags'> => ({
      look: 'open', squares: 0, pieces: Array.from({ length: pieces }, () => ({ fruit: 'apple' as const, pos: 0 })),
      tags: tags.map((price, i) => ({ f: (['blueberry', 'watermelon', 'mango', 'apple'] as const)[i], price, up: true, tied: false, stamped: false })),
    });
    // a round crate, 98 by 96: five pieces and two tags as drawn; ten pieces and four tags closer
    expect(crateFit(98, 96, seat(5, [6, 5]), false, false)).toBe(0);
    expect(crateFit(98, 96, seat(10, [6, 12, 9, 7]), false, false)).toBeGreaterThan(0);
    // a low crate of the close form while pricing: your three tags in one line
    expect(crateFit(168, LOWEST_CRATE, seat(5, [9, 12, 8]), true, true)).toBeLessThan(2);
  });
});

describe('the hand-over hides the last person\'s crate', () => {
  const now = (x: Partial<DayNow>): DayNow => ({ phase: 'stall', busy: false, myTurn: false, opened: false, mine: true, bell: null, rung: false, rush: false, done: false, ...x });

  it('no table step is drawn for a stall the phone has not been handed to, and the hand-over screen draws no table at all', () => {
    for (const phase of ['stall', 'bid'] as const) {
      for (const myTurn of [true, false]) for (const busy of [true, false]) for (const opened of [true, false]) {
        expect(dayStep(now({ phase, myTurn, busy, opened, mine: false }))).toBeNull();
      }
    }
    const game = read('src/ui/Game.tsx');
    const handoff = game.slice(game.indexOf('if (c.needHandoff) {'), game.indexOf("if (s.phase === 'over') {"));
    expect(handoff).toContain('tableWas.current = false;');
    expect(handoff).not.toMatch(/RushTable|DaySheet|rt-crate/);
    expect(handoff).toContain('return (');
    // the table is drawn for the person who holds the phone: the next person's own crate only once they have taken it
    expect(read('src/ui/game/useGameController.ts')).toContain('if (!online && activeHuman && (!multi || handedTo === active)) lastViewer.current = active;');
  });
});
