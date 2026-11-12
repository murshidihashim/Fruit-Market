import { afterEach, describe, expect, it, vi } from 'vitest';
import { h } from 'preact';
import { FAVOURS, FRUIT, FRUITS, RIVALS, lookOf, stageAt, type FavourId } from '../src/engine/data';
import { autoplay } from '../src/engine/ai';
import { newGame, servingCustomers, type GameState } from '../src/engine/game';
import { rushLine } from '../src/engine/story';
import * as A from '../src/ui/anim';
import { toStaticHtml } from '../src/ui/cards';
import { holdCash, shownCash } from '../src/ui/cashShown';
import { favourArt } from '../src/ui/deckArt';
import { reveal, bellLength } from '../src/ui/game/animator';
import { RushView } from '../src/ui/game/panels/RushTable';
import {
  MAX_PIECES, TABLE, blockSpan, blockStarts, offeredPieces, piecesMoving, rushCards, rushPace, rushTotal, seatOrder, tableLay,
  type Place, type RushBlock, type RushCard, type RushStage, type ShowState,
} from '../src/ui/game/rush';
import { BEAT, FEEL } from '../src/ui/motion';
import { favourShown, holdRush, landPiece, liftPiece, lineShown, payShown, releaseRush, rushHeld, serveLine, showFavour, shownFavours } from '../src/ui/rushShown';
import { holdStock, releaseStock, shownStock } from '../src/ui/stockShown';
import { LANES } from '../src/ui/boardModel';

// The rush as a round table (DEC-109, PLAN-092; before it one card for each customer, DEC-086, PLAN-084): what each
// customer's turn gives, every stall's open crate as the customer finds it, where the crates sit, the pace, and that
// nothing is shown before its moment.

/** Every day of some games at the moment the bell has rung (the day's results are in), with `stalls` stalls. */
function daysAtBell(stalls: number, seeds: number[], events = true): GameState[] {
  const out: GameState[] = [];
  for (const seed of seeds) {
    let s = newGame({
      players: [{ name: 'Mia', kind: 'ai', level: 'normal', avatar: RIVALS[0].avatar }, ...RIVALS.slice(1, stalls).map((r) => ({ name: r.name, kind: 'ai' as const, level: 'normal' as const, avatar: r.avatar }))],
      days: 10, unripe: true, upgrades: true, events, seed,
    });
    for (let i = 0; i < 6000 && s.phase !== 'over'; i++) {
      if (s.phase === 'reveal' && s.results) out.push(s);
      s = autoplay(s, 1);
    }
  }
  return out;
}
const four = daysAtBell(4, [1, 2, 3, 4, 5, 6]);
const six = daysAtBell(6, [1, 2, 3]);
const all = [...four, ...six];
const find = (days: GameState[], ok: (s: GameState, cards: RushCard[]) => boolean): { s: GameState; cards: RushCard[] } => {
  for (const s of days) { const cards = rushCards(s, 0); if (ok(s, cards)) return { s, cards }; }
  throw new Error('no such day in these games');
};
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('one card for each customer', () => {
  it('every customer in the row has a card, in the order they are served, also one no stall could serve', () => {
    expect(all.length).toBeGreaterThan(80);
    let unserved = 0;
    for (const s of all) {
      const cards = rushCards(s, 0);
      expect(cards.map((c) => c.customerId)).toEqual(servingCustomers(s).map((c) => c.id));
      for (const c of cards) {
        // one block for each fruit they came for, in the board's lane order, each for its own line of the day's results
        expect(c.blocks.map((b) => b.line)).toEqual([...s.results!.lines.filter((l) => l.customerId === c.customerId)].sort((a, b) => LANES.indexOf(a.fruit) - LANES.indexOf(b.fruit)));
        expect(c.wants).toEqual(c.blocks.map((b) => ({ fruit: b.fruit, qty: b.want, max: b.line.max })));
        if (c.blocks.every((b) => !b.rows.length)) unserved++;
      }
    }
    expect(unserved).toBeGreaterThan(0);
  });

  it('a block lists every stall\'s offer in the rules\' own order: cheapest first, an offer that did not qualify last', () => {
    for (const s of all) for (const c of rushCards(s, 0)) for (const b of c.blocks) {
      expect(b.rows.map((r) => [r.player, r.price, r.sold])).toEqual(b.line.offers.map((o) => [o.player, o.price, o.sold]));
      const inPlay = b.rows.filter((r) => r.qualified).map((r) => r.price);
      if (c.kind !== 'order') expect(inPlay).toEqual([...inPlay].sort((x, y) => x - y));
      expect(b.rows.findIndex((r) => !r.qualified)).toSatisfy((i: number) => i < 0 || b.rows.slice(i).every((r) => !r.qualified));
      expect(b.got).toBe(sum(b.line.offers.map((o) => o.sold)));
    }
  });

  it('says what the customer wants and what became of each offer, with the money on this stall\'s own rows only', () => {
    const { s, cards } = find(four, (_s, cs) => cs.some((c) => c.kind === 'customer' && c.blocks.some((b) => b.rows.some((r) => r.me && r.sold > 0) && b.rows.some((r) => !r.me && r.sold > 0) && b.rows.some((r) => r.sold === 0))));
    const c = cards.find((x) => x.blocks.some((b) => b.rows.some((r) => r.me && r.sold > 0) && b.rows.some((r) => !r.me && r.sold > 0)))!;
    const b = c.blocks.find((x) => x.rows.some((r) => r.me && r.sold > 0) && x.rows.some((r) => !r.me && r.sold > 0))!;
    expect(b.heading).toBe(`Wants ${b.want} ${(b.want === 1 ? FRUIT[b.fruit].name : FRUIT[b.fruit].plural).toLowerCase()} · cheapest first`);
    const mine = b.rows.find((r) => r.me)!;
    expect(mine.result).toBe(`Sold ${mine.sold} · +$${mine.paid}`);
    const rival = b.rows.find((r) => !r.me && r.sold > 0)!;
    expect(rival.result).toBe(`Sold ${rival.sold}`);
    // an offer that sold nothing carries the rules' own reason, the same words for every stall at the table
    const tags = rushLine(s, b.line).tags;
    for (const r of b.rows.filter((x) => x.sold === 0)) expect(r.result).toBe(tags[r.i]);
    expect(c.text).toContain(rushLine(s, b.line).headline);
  });

  it('what a stall is paid on the cards adds up to its income of the day (the night hawker apart)', () => {
    for (const s of all) {
      const r = s.results!;
      const paid = s.players.map(() => 0);
      for (const c of rushCards(s, 0)) {
        for (const b of c.blocks) for (const row of b.rows) paid[row.player] += row.paid;
        for (const x of c.extras) paid[x.player] += x.amount;
      }
      const hawker = s.players.map((_, p) => sum((r.hawker ?? []).filter((x) => x.player === p).map((x) => x.price)));
      const stake = s.players.map((_, p) => (r.order && r.order.holder === p ? r.order.back : 0));
      expect(paid).toEqual(r.income.map((n, p) => n - hawker[p] + stake[p]));
    }
  });

  it('the result line says what this stall earned from the customer: its sales, a Juice Bar\'s extra and its tips', () => {
    for (const s of all) for (const viewer of [0, 1]) {
      const r = s.results!;
      for (const c of rushCards(s, viewer)) {
        const sales = sum(c.blocks.flatMap((b) => b.line.offers.filter((o) => o.player === viewer).map((o) => o.sold * o.price + (o.juice ?? 0))));
        const tips = sum([...(r.earful ?? []), ...(r.tipJar ?? [])].filter((x) => x.player === viewer && x.customer === c.name).map((x) => x.tip));
        expect(c.earned).toBe(sales + tips);
      }
    }
    // a customer no stall offered anything has only their own word to add
    const { cards } = find(all, (_s, cs) => cs.some((c) => c.blocks.every((b) => !b.rows.length)));
    const none = cards.find((c) => c.blocks.every((b) => !b.rows.length))!;
    expect(none.earned).toBe(0);
    expect(none.text).toBe(`${lookOf(none.name).title} leaves with nothing.`);
    for (const b of none.blocks) expect(b.none).toBe(`Nobody had ${FRUIT[b.fruit].plural.toLowerCase()} for ${lookOf(none.name).title}.`);
  });

  it('a standing order collected today and a special guest have cards of their own kind', () => {
    const order = find(all, (s) => !!s.results!.order);
    const o = order.cards.find((c) => c.kind === 'order')!;
    expect(order.cards[0]).toBe(o); // it stands first in the row and is served first
    expect(o.blocks[0].heading).toMatch(/^Wants \d+ [a-z]+ · fresh or okay$/);
    const r = order.s.results!.order!;
    expect(o.extras).toEqual(r.back > 0 ? [{ player: r.holder, amount: r.back }] : []);
    const guest = find(all, (_s, cs) => cs.some((c) => c.kind === 'guest'));
    expect(guest.cards.filter((c) => c.kind === 'guest')).toHaveLength(1);
    expect(guest.cards[guest.cards.length - 1].kind).toBe('guest'); // a guest joins the end of the row
  });

  it('a favour card won belongs to its customer\'s card; which card it is, is known to the stall that won it only', () => {
    let seen = 0;
    for (const s of all) for (const viewer of [0, 2]) {
      const cards = rushCards(s, viewer);
      const won = cards.filter((c) => c.favour);
      expect(won.map((c) => [c.favour!.player, c.name])).toEqual(s.results!.favours.map((f) => [f.player, f.customer]));
      for (const c of won) {
        const f = s.results!.favours.find((x) => x.customer === c.name)!;
        expect(c.favour!.id).toBe(f.player === viewer ? f.favour : null);
        // the stall that won it served the customer alone
        expect(new Set(c.blocks.flatMap((b) => b.rows.filter((r) => r.sold > 0).map((r) => r.player)))).toEqual(new Set([f.player]));
        if (f.player === viewer) expect(c.text).toContain(`Favour card: ${FAVOURS[f.favour].title}.`);
        else for (const id of Object.keys(FAVOURS) as FavourId[]) expect(c.text).not.toContain(FAVOURS[id].title);
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(10);
  });
});

describe('the freshness of the pieces a stall offered', () => {
  it('is worked out for every offer of every day, and agrees with what the day\'s results record', () => {
    let offers = 0;
    for (const s of all) {
      const pieces = offeredPieces(s);
      for (const l of s.results!.lines) {
        const got = pieces.get(l)!;
        expect(got).toHaveLength(l.offers.length);
        l.offers.forEach((o, i) => {
          expect(got[i], `${l.name} ${l.fruit} stall ${o.player}`).not.toBeNull();
          if (o.tooOld) return;
          expect(got[i]).toHaveLength(o.qty);
          // the freshest of them is the one the results name
          expect(got[i]).toContain(stageAt(l.fruit, o.freshness));
          offers++;
        });
      }
    }
    expect(offers).toBeGreaterThan(500);
  });

  it('gives no answer where it cannot (a save without crates), and never a wrong one', () => {
    const s = structuredClone(four.find((x) => x.results!.lines.some((l) => l.offers.length > 0))!);
    delete s.crates;
    expect(offeredPieces(s).size).toBe(0);
    for (const c of rushCards(s, 0)) for (const b of c.blocks) for (const r of b.rows) expect(r.pieces).toBeNull();
  });
});

describe('every stall\'s open crate, as each customer finds it', () => {
  it('holds every piece a stall offers the customer, and loses the pieces it sold to the customers before', () => {
    let checked = 0;
    for (const s of all) {
      const crates = new Map<string, number[] | null>();
      for (const c of rushCards(s, 0)) for (const b of c.blocks) {
        expect(b.crates).toHaveLength(s.players.length);
        b.crates.forEach((crate, p) => {
          if (!crate) return;
          // every place is one of the fruit's ripe boxes, oldest first
          expect(crate.every((pos) => pos >= 0 && pos < FRUIT[b.fruit].ripe.length)).toBe(true);
          expect(crate).toEqual([...crate].sort((x, y) => x - y));
          const row = b.rows.find((r) => r.player === p);
          // the pieces it offers are in the crate (an offer that cannot sell lists every piece it had out)
          if (row?.used) for (const pos of new Set(row.used)) expect(crate.filter((x) => x === pos).length).toBeGreaterThanOrEqual(row.used.filter((x) => x === pos).length);
          if (row && !row.qualified && row.used) expect(row.used.length).toBe(crate.length);
          const was = crates.get(`${p}:${b.fruit}`);
          if (was) {
            // a later customer finds the crate less the pieces sold since, never more
            expect(crate.length).toBeLessThanOrEqual(was.length);
          }
          crates.set(`${p}:${b.fruit}`, crate);
          checked++;
        });
      }
      // what is left after the last customer is the crate at the bell less everything sold (the night hawker apart)
      if (s.results!.hawker) continue;
      s.players.forEach((_, p) => {
        for (const f of FRUITS) {
          const last = [...rushCards(s, 0)].reverse().flatMap((c) => c.blocks).find((b) => b.fruit === f && b.crates[p]);
          if (!last) continue;
          const sold = last.rows.find((r) => r.player === p)?.sold ?? 0;
          const atBell = (s.crates?.[p]?.[f] ?? []).reduce((a, n) => a + n, 0);
          const soldToday = s.results!.lines.filter((l) => l.fruit === f).reduce((a, l) => a + (l.offers.find((o) => o.player === p)?.sold ?? 0), 0);
          const soldBefore = soldToday - sold;
          expect(last.crates[p]!.length).toBe(atBell - soldBefore);
        }
      });
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it('marks the offers that can sell in the order they sell: 1st, 2nd and so on', () => {
    for (const s of all) for (const c of rushCards(s, 0)) for (const b of c.blocks) {
      expect(b.rows.filter((r) => r.qualified).map((r) => r.rank)).toEqual(b.rows.filter((r) => r.qualified).map((_, i) => i + 1));
      for (const r of b.rows.filter((x) => !x.qualified)) expect(r.rank).toBe(0);
      // the first that can sell always sells
      const first = b.rows.find((r) => r.rank === 1);
      if (first && b.want > 0) expect(first.sold).toBeGreaterThan(0);
    }
  });

  it('a standing order names its holder, the only stall it buys from', () => {
    const order = find(all, (x) => !!x.results!.order);
    const o = order.cards.find((c) => c.kind === 'order')!;
    expect(o.holder).toBe(order.s.results!.order!.holder);
    for (const b of o.blocks) for (const r of b.rows) expect(r.player).toBe(o.holder);
    for (const c of order.cards.filter((x) => x.kind !== 'order')) expect(c.holder).toBeNull();
  });
});

describe('the round table: every crate in a seat of its own', () => {
  const sizes: [number, number][] = [[390, 450], [390, 420], [360, 300], [360, 270], [390, 330], [320, 240], [412, 520]];
  const inside = (p: Place, w: number, h: number) => p.left >= 0 && p.top >= 0 && p.left + p.width <= w && p.top + p.height <= h;
  const apart = (a: Place, b: Place) => a.left + a.width <= b.left || b.left + b.width <= a.left || a.top + a.height <= b.top || b.top + b.height <= a.top;

  it('2 to 6 stalls fit round the customer on a tall phone and a small one: on the stage, clear of the customer and of each other', () => {
    for (const [w, h] of sizes) for (let n = 2; n <= 6; n++) {
      const lay = tableLay(n, w, h);
      expect(lay.seats, `${n} at ${w}x${h}`).toHaveLength(n);
      for (const [i, a] of lay.seats.entries()) {
        expect(inside(a, w, h), `${n} at ${w}x${h}, seat ${i}`).toBe(true);
        expect(apart(a, lay.card), `${n} at ${w}x${h}, seat ${i} and the customer`).toBe(true);
        for (const b of lay.seats.slice(i + 1)) expect(apart(a, b), `${n} at ${w}x${h}`).toBe(true);
      }
      expect(inside(lay.card, w, h)).toBe(true);
      expect(lay.card.width).toBeGreaterThanOrEqual(TABLE.minCard);
    }
  });

  it('on a tall phone six stalls sit round the customer (two above, two at the sides, two below); on a small one in two columns', () => {
    const tall = tableLay(6, 390, 450);
    expect(tall.close).toBe(false);
    const mid = (p: Place) => [p.left + p.width / 2, p.top + p.height / 2];
    const [cx, cy] = mid(tall.card);
    const above = tall.seats.filter((p) => p.top + p.height <= tall.card.top);
    const below = tall.seats.filter((p) => p.top >= tall.card.top + tall.card.height);
    const sides = tall.seats.filter((p) => !above.includes(p) && !below.includes(p));
    expect([above.length, sides.length, below.length]).toEqual([2, 2, 2]);
    expect(sides.map((p) => Math.sign(mid(p)[0] - cx)).sort()).toEqual([-1, 1]);
    expect(Math.abs(mid(sides[0])[1] - cy)).toBeLessThan(2);
    const small = tableLay(6, 360, 270);
    expect(small.close).toBe(true);
    for (const p of small.seats) expect(p.left + p.width <= small.card.left || p.left >= small.card.left + small.card.width).toBe(true);
    // fewer stalls are spread evenly: two sit either side of the customer
    const two = tableLay(2, 390, 450);
    expect(two.seats.map((p) => Math.sign(mid(p)[0] - cx))).toEqual([-1, 1]);
  });

  it('this screen\'s stall sits first, the others in turn order after it, and nobody moves during the rush', () => {
    expect(seatOrder(4, 0)).toEqual([0, 1, 2, 3]);
    expect(seatOrder(4, 2)).toEqual([2, 3, 0, 1]);
    expect(seatOrder(6, 5)).toEqual([5, 0, 1, 2, 3, 4]);
  });
});

// ---------- the pace ----------

/** A card with these sales: one entry for each fruit, the pieces each stall sold. */
function cardOf(...fruits: number[][]): RushCard {
  const blocks = fruits.map((sold, k): RushBlock => ({
    line: { customerId: 1, name: 'Wei Jie', fruit: FRUITS[k], want: 4, max: 6, offers: [] }, fruit: FRUITS[k], want: 4, heading: '', none: null, story: '', got: sum(sold), crates: [],
    rows: sold.map((n, i) => ({ i, player: i, me: i === 0, price: 4, qty: Math.max(n, 1), freshest: 'fresh', pieces: null, used: null, qualified: true, rank: i + 1, sold: n, paid: n * 4, result: '' })),
  }));
  return { customerId: 1, name: 'Wei Jie', kind: 'customer', holder: null, wants: [], blocks, extras: [], favour: null, earned: 0, text: '' };
}

describe('rush pace', () => {
  it('about 2.4 s for a customer who buys one fruit, and about 1 s more for each further fruit, served one after the other', () => {
    const one = rushTotal(cardOf([1]));
    expect(one).toBe(BEAT.rush.cardIn + BEAT.rush.rows + FEEL.travel + FEEL.coin + BEAT.rush.read + BEAT.rush.cardOut);
    expect(one).toBeGreaterThanOrEqual(2300);
    expect(one).toBeLessThanOrEqual(2500);
    const two = rushTotal(cardOf([1], [1]));
    // the tags turn to the second fruit once the first fruit's coins are back, then its sale is shown
    expect(two - one).toBe(BEAT.rush.fruit + FEEL.travel + FEEL.coin);
    expect(two - one).toBeGreaterThanOrEqual(900);
    expect(two - one).toBeLessThanOrEqual(1100);
    expect(rushTotal(cardOf([1], [1], [1])) - two).toBe(two - one);
    // more pieces leave a little apart; at most four of one sale travel
    expect(rushTotal(cardOf([2])) - one).toBe(BEAT.rush.pieceGap);
    expect(rushTotal(cardOf([1, 1])) - one).toBe(BEAT.rush.pieceGap);
    expect(piecesMoving(cardOf([7]).blocks[0])).toBe(MAX_PIECES);
    expect(rushTotal(cardOf([7]))).toBe(rushTotal(cardOf([4])));
  });

  it('a result is read for about a second, and a customer no stall could serve takes less', () => {
    const p = rushPace(cardOf([1]));
    expect(p.read).toBeGreaterThanOrEqual(900);
    expect(p.read).toBeLessThanOrEqual(1200);
    expect(p).toEqual({ in: 250, rows: 300, sell: FEEL.travel + FEEL.coin, read: 1000, out: 200 });
    const none = cardOf([0, 0]);
    expect(blockSpan(none.blocks[0])).toBe(0);
    expect(rushPace(none).sell).toBe(0);
    expect(rushTotal(none)).toBe(1750);
    // a fruit nobody sold still has its turn (its tags are shown), and takes no time beyond it
    expect(blockStarts(cardOf([0], [1], [1]))).toEqual([0, BEAT.rush.fruit, 2 * BEAT.rush.fruit + FEEL.travel + FEEL.coin]);
    expect(rushTotal(cardOf([0], [1]))).toBe(rushTotal(cardOf([1])) + BEAT.rush.fruit);
  });

  it('four customers wanting five fruit between them take about 11 s untouched (10.4 s with the list of offers, 17 s before it)', () => {
    const typical = [cardOf([1]), cardOf([1], [2]), cardOf([2]), cardOf([1, 1])];
    const total = sum(typical.map(rushTotal));
    expect(total).toBeGreaterThanOrEqual(9500);
    expect(total).toBeLessThanOrEqual(11000);
    // real days: a four-customer rush with every customer served
    const days = four.map((s) => rushCards(s, 0)).filter((cs) => cs.length === 4 && cs.every((c) => c.blocks.some((b) => b.got > 0)));
    expect(days.length).toBeGreaterThan(3);
    for (const cs of days) {
      const t = sum(cs.map(rushTotal));
      expect(t).toBeGreaterThanOrEqual(9000);
      expect(t).toBeLessThanOrEqual(14000);
    }
  });

  it('a tap ends the wait at once; the next customer plays at the normal pace again', async () => {
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

// ---------- the round table as drawn ----------

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');

describe('the round table', () => {
  afterEach(() => releaseRush());
  // A four-stall day with a customer who wanted two fruits, one of which this stall sold.
  const { s, cards } = find(four, (_s, cs) => cs.length >= 3 && cs.some((c) => c.kind === 'customer' && c.blocks.length === 2 && c.blocks.every((b) => b.rows.length > 0) && c.earned > 0));
  const card = cards.find((c) => c.kind === 'customer' && c.blocks.length === 2 && c.blocks.every((b) => b.rows.length > 0) && c.earned > 0)!;
  const show = (stage: RushStage, at = 0, c = card, of = cards): ShowState => ({ card: c, n: of.indexOf(c) + 1, of: of.length, stage, at, served: [] });
  const html = (a: ShowState, shared = false, x = s) => toStaticHtml(h(RushView, { s: x, a, viewer: 0, shared }));
  const crate = (page: string, p: number) => page.split(`data-a="rt-crate-${p}"`)[1]?.split('data-a="rt-fav-')[0] ?? '';

  it('carries the customer in the middle, every stall\'s crate in its seat with its price for the fruit bought now, and the two buttons', () => {
    holdRush(s.results!, s.players.length);
    const b = card.blocks[0];
    const page = html(show('rows'));
    expect(page).toContain('class="rush-table st-rows');
    expect(page).toContain(`data-n="${cards.indexOf(card) + 1}" data-of="${cards.length}"`);
    expect(page).toContain(`<span>${esc(lookOf(card.name).title)}</span>`);
    expect(page.match(/class="rt-crate /g)).toHaveLength(s.players.length);
    for (const r of b.rows.filter((x) => !(card.holder !== null && x.player !== card.holder))) expect(crate(page, r.player)).toContain(`<b class="rt-tag">$${r.price}</b>`);
    // a crate without the fruit says so; the one that sells first is marked, and so is the next
    s.players.forEach((_, p) => { if (!b.rows.some((r) => r.player === p)) expect(crate(page, p)).toContain(`no ${FRUIT[b.fruit].plural.toLowerCase()}`); });
    expect(page.match(/class="rt-badge">1st</g)).toHaveLength(1);
    expect(page.match(/class="rt-badge">2nd</g)?.length ?? 0).toBe(b.rows.filter((r) => r.qualified).length > 1 ? 1 : 0);
    expect(page).toContain(b.heading);
    expect(page).toContain('>You</b>');
    expect(page).toContain('>Skip to the end</button>');
    expect(page).toContain('>Next customer</button>');
    // while the customer comes in, no tag is up yet
    expect(html(show('in'))).not.toContain('class="rt-tag"');
    // the tags turn to the second fruit, fruit by fruit
    const second = html(show('rows', 1));
    for (const r of card.blocks[1].rows.filter((x) => x.qualified)) expect(crate(second, r.player)).toContain(`<b class="rt-tag">$${r.price}</b>`);
  });

  it('shows nothing of a sale before its moment: no piece gone, no dot filled, no result, no money, no result line', () => {
    holdRush(s.results!, s.players.length);
    const [first, second] = card.blocks;
    const before = html(show('rows'));
    expect(before).not.toContain('rt-plus');
    expect(before).not.toContain('class="got"');
    expect(before).not.toMatch(/rt-w [^"]*done/);
    expect(before).not.toContain('Sold ');
    expect(before).toContain('<div class="rt-line " role="status">');
    // every crate still holds the pieces it had when the customer came
    for (const r of first.rows) if (r.used && first.crates[r.player]) expect(crate(before, r.player).match(/class="rt-pc"/g)?.length ?? 0).toBe(Math.min(first.crates[r.player]!.length, 4) - (first.crates[r.player]!.length > 4 ? 1 : 0));
    // pieces leave a crate as they lift off, and fill dots as they land
    const seller = first.rows.find((r) => r.sold > 0)!;
    liftPiece(card.customerId, first.fruit, seller.player);
    landPiece(card.customerId, first.fruit);
    const one = html(show('rows'));
    expect(one.match(/class="got"/g)).toHaveLength(1);
    expect(one).not.toContain('rt-plus');
    // the money as it lands
    payShown(card.customerId, first.fruit, seller.player);
    expect(crate(html(show('rows')), seller.player)).toContain(`<span class="rt-plus">+$${seller.paid}</span>`);
    // one fruit's sale has been shown: its crates say what became of each offer, the other fruit's do not yet
    serveLine(card.customerId, first.fruit);
    const half = html(show('rows'));
    for (const r of first.rows) expect(crate(half, r.player)).toContain(esc(r.sold > 0 ? `Sold ${r.sold}` : r.result));
    expect(half.match(/class="got"/g) ?? []).toHaveLength(first.got);
    expect(html(show('rows', 1))).not.toContain('Sold ');
    serveLine(card.customerId, second.fruit);
    const done = html(show('result', 1));
    expect(done).toContain('<div class="rt-line show" role="status">');
    expect(done).toContain(`<b class="">+$${card.earned}</b>`);
    expect(done).toContain(`<span>${esc(card.text)}</span>`);
  });

  it('a tie shows the game\'s own reason on the crate that lost it', () => {
    const tie = find(all, (_x, cs) => cs.some((c) => c.blocks.some((b) => b.rows.some((r) => r.result.startsWith('lost tie')))));
    const c = tie.cards.find((x) => x.blocks.some((b) => b.rows.some((r) => r.result.startsWith('lost tie'))))!;
    const k = c.blocks.findIndex((b) => b.rows.some((r) => r.result.startsWith('lost tie')));
    const r = c.blocks[k].rows.find((x) => x.result.startsWith('lost tie'))!;
    const page = toStaticHtml(h(RushView, { s: tie.s, a: { card: c, n: 1, of: 1, stage: 'rows', at: k, served: [] }, viewer: 0 }));
    expect(crate(page, r.player)).toContain(esc(r.result));
  });

  it('the last customer\'s button carries the title of the day\'s takings, which come next', () => {
    const last = cards[cards.length - 1];
    expect(html(show('result', 0, last))).toContain(`>End of day ${s.day}</button>`);
    expect(html(show('result', 0, last))).not.toContain('Next customer');
    const closing = { ...s, day: s.config.days };
    expect(html(show('result', 0, last), false, closing)).toContain('>Market closed</button>');
  });

  it('on a shared phone a stall\'s crate carries its name, not "You"', () => {
    expect(html(show('result'), true)).not.toContain('>You</b>');
    expect(html(show('result'), true)).toContain(`>${s.players[0].name}</b>`);
  });

  it('a standing order and a special guest are drawn as such; a standing order buys from its holder\'s crate only', () => {
    const order = find(all, (x) => !!x.results!.order);
    const o = order.cards[0];
    const oPage = toStaticHtml(h(RushView, { s: order.s, a: { card: o, n: 1, of: order.cards.length, stage: 'rows', at: 0, served: [] }, viewer: 0 }));
    expect(oPage).toContain('<b>Standing order</b>');
    order.s.players.forEach((_, p) => { if (p !== o.holder) expect(crate(oPage, p)).toContain('not their order'); else expect(crate(oPage, p)).not.toContain('not their order'); });
    const guest = find(all, (_x, cs) => cs.some((c) => c.kind === 'guest'));
    const g = guest.cards[guest.cards.length - 1];
    const gPage = toStaticHtml(h(RushView, { s: guest.s, a: { card: g, n: guest.cards.length, of: guest.cards.length, stage: 'result', at: 0, served: [] }, viewer: 0 }));
    expect(gPage).toContain('<b>Guest</b>');
  });

  it('a favour card won lies on its stall\'s crate once it has arrived: face up for this stall, face down for a rival', () => {
    const mine = find(all, (_x, cs) => cs.some((c) => c.favour?.player === 0));
    const c = mine.cards.find((x) => x.favour?.player === 0)!;
    const a: ShowState = { card: c, n: 1, of: 1, stage: 'result', at: 0, served: [] };
    holdRush(mine.s.results!, mine.s.players.length);
    expect(toStaticHtml(h(RushView, { s: mine.s, a, viewer: 0 }))).not.toContain('rh-fav');
    showFavour(c.customerId, 0);
    const page = toStaticHtml(h(RushView, { s: mine.s, a, viewer: 0 }));
    expect(page.match(/class="rh-fav"/g)).toHaveLength(1);
    expect(crate(page, 0)).toContain(`aria-label="Favour card: ${FAVOURS[c.favour!.id!].title}"`);
    expect(page).toContain(favourArt(c.favour!.id!));
    releaseRush();
    // a rival's: the deck's back, and nothing that says which card it is
    const theirs = find(all, (_x, cs) => cs.some((x) => x.favour && x.favour.player !== 0));
    const r = theirs.cards.find((x) => x.favour && x.favour.player !== 0)!;
    const back = toStaticHtml(h(RushView, { s: theirs.s, a: { card: r, n: 1, of: 1, stage: 'result', at: 0, served: [] }, viewer: 0 }));
    expect(crate(back, r.favour!.player)).toContain('class="rh-fav back" role="img" aria-label="A favour card, face down"');
    for (const id of Object.keys(FAVOURS) as FavourId[]) {
      expect(back).not.toContain(favourArt(id));
      expect(back).not.toContain(FAVOURS[id].title);
    }
  });
});

// ---------- the rush as it plays ----------

/** Animations run on timers and the browser's frame clock: both are faked. There is no page here, so nothing is found
 *  to fly from or to and a sale is shown the moment it starts; the steps and the reading pauses keep their lengths. */
function fakeClock(reducedMotion: boolean) {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: reducedMotion }));
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => setTimeout(cb, 0));
  vi.stubGlobal('document', { querySelector: () => null });
  A.setBaseSpeed(false);
  A.resetHurry();
}

/** The steps one customer goes through: in, the tags turned to each fruit in turn, the result, out. */
const stepsOf = (c: RushCard, n: number) => [`${n}in`, ...c.blocks.map((_b, k) => `${n}rows${k}`), `${n}result`, `${n}out`];
const said = (a: ShowState) => `${a.n}${a.stage}${a.stage === 'rows' ? a.at : ''}`;

describe('the rush as it plays (animator.tsx reveal)', () => {
  afterEach(() => { holdCash(null); releaseStock(); releaseRush(); A.setBaseSpeed(false); A.resetHurry(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  // A day with a favour card won, four or more customers, money for several stalls, and a customer with two fruits.
  const { s, cards } = find(four, (x, cs) => cs.length >= 4 && cs.some((c) => c.favour) && cs.filter((c) => c.blocks.some((b) => b.got > 0)).length >= 3 && !x.results!.hawker && cs.some((c) => c.blocks.length > 1));
  const before = (x: GameState) => x.players.map((pl, i) => pl.cash - x.results!.income[i] - (x.results!.order?.holder === i ? x.results!.order.back : 0));
  /** What the game screen does as the bell rings (useGameController.ts): every total, shelf, ticket and favour card is held back. */
  function hold(x: GameState) {
    holdCash(before(x));
    holdStock(x.players.map((pl) => pl.stock), x.players.map((pl) => pl.stock));
    holdRush(x.results!, x.players.length);
  }
  const shownOf = (c: RushCard) => c.blocks.map((b) => lineShown(c.customerId, b.fruit));
  const paidTo = (c: RushCard, p: number) => sum(c.blocks.flatMap((b) => b.rows.filter((r) => r.player === p).map((r) => r.paid))) + sum(c.extras.filter((x) => x.player === p).map((x) => x.amount));

  it('serves the customers one after another, fruit by fruit, and nothing of a customer shows before their own turn', async () => {
    fakeClock(false);
    hold(s);
    const seen: { at: number; a: ShowState | null }[] = [];
    const t0 = Date.now();
    let checked = 0;
    const done = reveal(s, 0, (a) => {
      seen.push({ at: Date.now() - t0, a });
      if (!a) return;
      const k = a.n - 1;
      // the customers still to come: no ticket ticked, no favour card shown
      for (const later of cards.slice(k + 1)) {
        expect(shownOf(later)).toEqual(later.blocks.map(() => false));
        if (later.favour) expect(favourShown(later.customerId)).toBe(false);
      }
      // this customer's own sale is not shown while they come in, and a fruit's not before its tags are up
      if (a.stage === 'in' || a.stage === 'rows') {
        expect(shownOf(a.card)).toEqual(a.card.blocks.map((_b, i) => a.stage === 'rows' && i < a.at));
        // every stall's cash is what it was before the rush, plus the customers already served and the fruit before this one
        s.players.forEach((pl, p) => expect(shownCash(p, pl.cash)).toBe(before(s)[p] + sum(cards.slice(0, k).map((c) => paidTo(c, p)))
          + sum(a.card.blocks.slice(0, a.stage === 'rows' ? a.at : 0).flatMap((b) => b.rows.filter((r) => r.player === p).map((r) => r.paid)))));
      }
      if (a.stage === 'result' || a.stage === 'out') expect(shownOf(a.card)).toEqual(a.card.blocks.map(() => true));
      checked++;
    });
    await vi.runAllTimersAsync();
    await done;
    expect(checked).toBe(sum(cards.map((c) => 3 + c.blocks.length)));
    // each customer: in, the tags for each fruit, the result, out; then the stage is taken away
    expect(seen.map((x) => (x.a ? said(x.a) : 'end'))).toEqual([...cards.flatMap((c, i) => stepsOf(c, i + 1)), 'end']);
    expect(seen[seen.length - 2].a!.served).toEqual(cards.map((c) => c.customerId));
    // the result of each is read for a second, and the whole turn takes its pace (less the travel, which has no page here)
    cards.forEach((c, i) => {
      const at = (st: string) => seen.find((x) => x.a && said(x.a) === `${i + 1}${st}`)!.at;
      expect(at('rows0') - at('in')).toBe(BEAT.rush.cardIn);
      if (c.blocks.length > 1) expect(at('rows1') - at('rows0')).toBe(BEAT.rush.rows);
      expect(at('out') - at('result')).toBeGreaterThanOrEqual(BEAT.rush.read);
      expect(at('out') - at('result')).toBeLessThan(BEAT.rush.read + 50);
    });
    expect(seen[0].at).toBe(bellLength(s.players.length));
    // afterwards everything shows as it is
    expect(rushHeld()).toBe(false);
    s.players.forEach((pl, p) => expect(shownCash(p, pl.cash)).toBe(pl.cash));
  });

  it('a favour card won is in its stall\'s hand only once its customer has been served', async () => {
    fakeClock(false);
    hold(s);
    const won = cards.find((c) => c.favour)!;
    const p = won.favour!.player;
    const hand = s.players[p].favours;
    expect(shownFavours(p, hand)).toEqual(hand.slice(0, hand.length - s.results!.favours.filter((f) => f.player === p).length));
    const done = reveal(s, 0, (a) => {
      if (!a) return;
      const here = a.n - 1 > cards.indexOf(won) || (a.card.customerId === won.customerId && a.stage === 'out');
      if (!here) expect(favourShown(won.customerId)).toBe(false);
      else expect(favourShown(won.customerId)).toBe(true);
    });
    await vi.runAllTimersAsync();
    await done;
    expect(shownFavours(p, hand)).toBe(hand);
  });

  it('with reduced motion nothing travels: each fruit\'s result and then the customer\'s are shown, each held about a second', async () => {
    fakeClock(true);
    hold(s);
    const seen: { at: number; a: ShowState | null }[] = [];
    const t0 = Date.now();
    const done = reveal(s, 0, (a) => {
      seen.push({ at: Date.now() - t0, a });
      if (a) for (const later of cards.slice(a.n)) expect(shownOf(later)).toEqual(later.blocks.map(() => false));
      // a fruit's tags show its result: the sale is settled before they are drawn
      if (a?.stage === 'rows') expect(shownOf(a.card).slice(0, a.at + 1)).toEqual(a.card.blocks.slice(0, a.at + 1).map(() => true));
    });
    await vi.runAllTimersAsync();
    await done;
    expect(seen.map((x) => (x.a ? said(x.a) : 'end'))).toEqual([...cards.flatMap((c, i) => [...c.blocks.slice(0, -1).map((_b, k) => `${i + 1}rows${k}`), `${i + 1}result`, `${i + 1}out`]), 'end']);
    cards.forEach((c, i) => {
      const at = (st: string) => seen.find((x) => x.a && said(x.a) === `${i + 1}${st}`)!.at;
      expect(at('out') - at('result')).toBeGreaterThanOrEqual(1000);
      expect(at('out') - at('result')).toBeLessThan(1050);
      if (c.blocks.length > 1) expect(at('result') - at('rows0')).toBeGreaterThanOrEqual(1000);
    });
    s.players.forEach((pl, p) => expect(shownCash(p, pl.cash)).toBe(pl.cash));
  });

  it('Skip settles every customer still to come without showing them; a tap on the table at the bell only ends the bell', async () => {
    // Skip (the button lets the shelves go as well): no customer is shown, everything is paid and shown
    fakeClock(false);
    hold(s);
    const shown: (ShowState | null)[] = [];
    let done = reveal(s, 0, (a) => shown.push(a));
    await vi.advanceTimersByTimeAsync(500);
    A.hurryUp();
    releaseStock();
    await vi.runAllTimersAsync();
    await done;
    expect(shown).toEqual([null]);
    s.players.forEach((pl, p) => expect(shownCash(p, pl.cash)).toBe(pl.cash));
    expect(shownStock(0, s.players[0].stock)).toBe(s.players[0].stock);
    // a tap on the table at the bell (the shelves are still held): the bell ends, the rush plays at its own pace
    fakeClock(false);
    hold(s);
    const stages: string[] = [];
    const t0 = Date.now();
    let first = -1, second = -1;
    done = reveal(s, 0, (a) => {
      if (!a) return;
      stages.push(said(a));
      if (a.n === 1 && a.stage === 'in') first = Date.now() - t0;
      if (a.n === 1 && a.stage === 'rows' && a.at === 0) second = Date.now() - t0;
    });
    await vi.advanceTimersByTimeAsync(500);
    A.hurryUp();
    await vi.runAllTimersAsync();
    await done;
    expect(first).toBe(500);
    expect(second - first).toBe(BEAT.rush.cardIn);
    expect(stages).toHaveLength(sum(cards.map((c) => 3 + c.blocks.length)));
  });

  it('after Skip a payment still being counted is not taken for money left over', async () => {
    // A day without a favour card, a standing order or the night hawker: every dollar is paid on a customer's turn.
    const plain = find(four, (x, cs) => !x.results!.favours.length && !x.results!.hawker && !x.results!.order && cs.length >= 3 && x.results!.income.filter((n) => n >= 4).length >= 2).s;
    fakeClock(false);
    hold(plain);
    const done = reveal(plain, 0, () => undefined);
    await vi.advanceTimersByTimeAsync(500);
    A.hurryUp();
    releaseStock();
    // While the stalls are paid no total ever shows more than the stall really has, and each ends on what it has.
    let counted = 0;
    for (let ms = 0; ms < 300; ms++) {
      await vi.advanceTimersByTimeAsync(1);
      plain.players.forEach((pl, p) => { expect(shownCash(p, pl.cash)).toBeLessThanOrEqual(pl.cash); if (shownCash(p, pl.cash) < pl.cash) counted++; });
    }
    expect(counted).toBeGreaterThan(0); // the totals did climb step by step
    await vi.runAllTimersAsync();
    await done;
    plain.players.forEach((pl, p) => expect(shownCash(p, pl.cash)).toBe(pl.cash));
  });

  it('a tap moves on at once, and the next customer plays at the normal pace', async () => {
    fakeClock(false);
    hold(s);
    const seen: { at: number; a: ShowState }[] = [];
    const t0 = Date.now();
    const done = reveal(s, 0, (a) => {
      if (!a) return;
      seen.push({ at: Date.now() - t0, a });
      // the tap: as the first customer's result comes up
      if (a.n === 1 && a.stage === 'result') setTimeout(() => A.speedStep(), 100);
    });
    await vi.runAllTimersAsync();
    await done;
    const at = (n: number, st: string) => seen.find((x) => x.a.n === n && x.a.stage === st)!.at;
    expect(at(1, 'out') - at(1, 'result')).toBeLessThan(150);
    expect(at(2, 'in') - at(1, 'out')).toBeLessThan(BEAT.rush.cardOut * 0.2 + 5);
    expect(at(2, 'rows') - at(2, 'in')).toBe(BEAT.rush.cardIn);
    expect(at(2, 'out') - at(2, 'result')).toBeGreaterThanOrEqual(BEAT.rush.read);
  });
});
