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
import { RushView, type ShowState } from '../src/ui/game/panels/Showdown';
import { MAX_PIECES, blockSpan, blockStarts, offeredPieces, piecesMoving, rushCards, rushPace, rushTotal, type RushBlock, type RushCard, type RushStage } from '../src/ui/game/rush';
import { BEAT, FEEL } from '../src/ui/motion';
import { favourShown, holdRush, lineShown, releaseRush, rushHeld, serveLine, showFavour, shownFavours } from '../src/ui/rushShown';
import { holdStock, releaseStock, shownStock } from '../src/ui/stockShown';
import { LANES } from '../src/ui/boardModel';

// The rush, one card for each customer (DEC-086, PLAN-084): which cards a day gives, what each says, the pace, and
// that nothing is shown before its moment.

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

// ---------- the pace ----------

/** A card with these sales: one entry for each fruit, the pieces each stall sold. */
function cardOf(...fruits: number[][]): RushCard {
  const blocks = fruits.map((sold, k): RushBlock => ({
    line: { customerId: 1, name: 'Wei Jie', fruit: FRUITS[k], want: 4, max: 6, offers: [] }, fruit: FRUITS[k], want: 4, heading: '', none: null, story: '', got: sum(sold),
    rows: sold.map((n, i) => ({ i, player: i, me: i === 0, price: 4, qty: Math.max(n, 1), freshest: 'fresh', pieces: null, qualified: true, sold: n, paid: n * 4, result: '' })),
  }));
  return { customerId: 1, name: 'Wei Jie', kind: 'customer', wants: [], blocks, extras: [], favour: null, earned: 0, text: '' };
}

describe('rush pace', () => {
  it('about 2.4 s for a customer who buys one fruit, and about 0.5 s more for each further fruit', () => {
    const one = rushTotal(cardOf([1]));
    expect(one).toBe(BEAT.rush.cardIn + BEAT.rush.rows + FEEL.travel + FEEL.coin + BEAT.rush.read + BEAT.rush.cardOut);
    expect(one).toBeGreaterThanOrEqual(2300);
    expect(one).toBeLessThanOrEqual(2500);
    const two = rushTotal(cardOf([1], [1]));
    expect(two - one).toBe(BEAT.rush.fruit);
    expect(two - one).toBeGreaterThanOrEqual(450);
    expect(two - one).toBeLessThanOrEqual(550);
    expect(rushTotal(cardOf([1], [1], [1])) - two).toBe(BEAT.rush.fruit);
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
    const none = cardOf([0, 0], []);
    expect(blockSpan(none.blocks[0])).toBe(0);
    expect(rushPace(none).sell).toBe(0);
    expect(rushTotal(none)).toBe(1750);
    // a fruit nobody sold does not hold up the next one
    expect(blockStarts(cardOf([0], [1], [1]))).toEqual([0, 0, BEAT.rush.fruit]);
    expect(rushTotal(cardOf([0], [1]))).toBe(rushTotal(cardOf([1])));
  });

  it('four customers wanting five fruit between them take about 10 s untouched (it was about 17 s)', () => {
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
      expect(t).toBeLessThanOrEqual(13000);
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

// ---------- the card as drawn ----------

describe('the rush card', () => {
  afterEach(() => releaseRush());
  // A four-stall day with a customer who wanted two fruits, one of which this stall sold.
  const { s, cards } = find(four, (_s, cs) => cs.length >= 3 && cs.some((c) => c.kind === 'customer' && c.blocks.length === 2 && c.blocks.every((b) => b.rows.length > 0) && c.earned > 0));
  const card = cards.find((c) => c.kind === 'customer' && c.blocks.length === 2 && c.blocks.every((b) => b.rows.length > 0) && c.earned > 0)!;
  const row = cards.map((c) => ({ id: c.customerId, name: c.name, guest: c.kind === 'guest' }));
  const show = (stage: RushStage, c = card, of = cards): ShowState => ({ card: c, n: of.indexOf(c) + 1, of: of.length, stage, row, served: [] });
  const html = (a: ShowState, shared = false) => toStaticHtml(h(RushView, { s, a, shared }));

  it('carries the customer\'s card, a block for each fruit with every stall\'s price, and the two buttons', () => {
    holdRush(s.results!, s.players.length);
    const page = html(show('rows'));
    expect(page).toContain('class="rush-sheet auction st-rows');
    expect(page).toContain(`Customer ${cards.indexOf(card) + 1} of ${cards.length}`);
    expect(page.match(/class="rh-face/g)).toHaveLength(cards.length);
    expect(page.match(/class="rh-face now/g)).toHaveLength(1);
    expect(page).toContain(`>${lookOf(card.name).title}</b>`);
    for (const b of card.blocks) {
      expect(page).toContain(b.heading);
      for (const r of b.rows) {
        expect(page).toContain(`data-a="ro-${b.fruit}-${r.player}"`);
        expect(page).toContain(`<b class="rh-price">$${r.price}</b>`);
      }
    }
    expect(page.match(/class="rh-of me /g)).toHaveLength(card.blocks.filter((b) => b.rows.some((r) => r.me)).length);
    expect(page).toContain('>You</span>');
    expect(page).toContain('>Skip to the end</button>');
    expect(page).toContain('>Next customer</button>');
  });

  it('shows nothing of a sale before its moment: no result on a row, no dot filled, no tick, no result line', () => {
    holdRush(s.results!, s.players.length);
    const before = html(show('rows'));
    expect(before).not.toContain('rh-res');
    expect(before).not.toContain('class="got"');
    expect(before).not.toMatch(/wc-rw [^"]* done/);
    expect(before).not.toContain('Sold ');
    // the result line is not shown yet (it keeps its room, unseen, so the offers do not move when it shows)
    expect(before).toContain('<div class="rh-why " role="status" aria-hidden="true">');
    expect(before).not.toContain('rh-why show');
    // one fruit's sale has been shown: its rows are marked, the other fruit's are not
    const [first, second] = card.blocks;
    serveLine(card.customerId, first.fruit);
    const half = html(show('rows'));
    expect(half.match(/class="rh-res/g)).toHaveLength(first.rows.length);
    for (const r of first.rows) expect(half).toContain(r.result.replace(/&/g, '&amp;').replace(/'/g, '&#39;'));
    expect(half.match(/class="got"/g) ?? []).toHaveLength(first.got);
    serveLine(card.customerId, second.fruit);
    const done = html(show('result'));
    expect(done.match(/class="rh-res/g)).toHaveLength(first.rows.length + second.rows.length);
    expect(done).toContain('<div class="rh-why show" role="status">');
    expect(done).toContain(`<b class="">+$${card.earned}</b>`);
    expect(done).toContain(`<span>${card.text.replace(/&/g, '&amp;').replace(/'/g, '&#39;')}</span>`);
  });

  it('the last customer\'s button carries the title of the day\'s takings, which come next', () => {
    const last = cards[cards.length - 1];
    expect(html(show('result', last))).toContain(`>End of day ${s.day}</button>`);
    expect(html(show('result', last))).not.toContain('Next customer');
    const closing = { ...s, day: s.config.days };
    expect(toStaticHtml(h(RushView, { s: closing, a: show('result', last) }))).toContain('>Market closed</button>');
  });

  it('on a shared phone a stall\'s row carries its name, not "You"', () => {
    expect(html(show('result'), true)).not.toContain('>You</span>');
    expect(html(show('result'), true)).toContain(`>${s.players[0].name}</span>`);
  });

  it('a standing order and a special guest are drawn with their own headings', () => {
    const order = find(all, (x) => !!x.results!.order);
    const o = order.cards[0];
    const oPage = toStaticHtml(h(RushView, { s: order.s, a: { card: o, n: 1, of: order.cards.length, stage: 'result', row: [], served: [] } }));
    expect(oPage).toContain('<span>Standing order</span><span>Due today</span>');
    const guest = find(all, (_x, cs) => cs.some((c) => c.kind === 'guest'));
    const g = guest.cards[guest.cards.length - 1];
    const gPage = toStaticHtml(h(RushView, { s: guest.s, a: { card: g, n: guest.cards.length, of: guest.cards.length, stage: 'result', row: [], served: [] } }));
    expect(gPage).toContain('<span>Guest</span>');
  });

  it('a favour card won lies on its stall\'s row once it has arrived: face up for this stall, face down for a rival', () => {
    const mine = find(all, (_x, cs) => cs.some((c) => c.favour?.player === 0));
    const c = mine.cards.find((x) => x.favour?.player === 0)!;
    const a: ShowState = { card: c, n: 1, of: 1, stage: 'result', row: [], served: [] };
    holdRush(mine.s.results!, mine.s.players.length);
    expect(toStaticHtml(h(RushView, { s: mine.s, a }))).not.toContain('rh-fav');
    showFavour(c.customerId, 0);
    const page = toStaticHtml(h(RushView, { s: mine.s, a }));
    expect(page.match(/class="rh-fav"/g)).toHaveLength(1);
    expect(page).toContain(`aria-label="Favour card: ${FAVOURS[c.favour!.id!].title}"`);
    expect(page).toContain(favourArt(c.favour!.id!));
    releaseRush();
    // a rival's: the deck's back, and nothing that says which card it is
    const theirs = find(all, (_x, cs) => cs.some((x) => x.favour && x.favour.player !== 0));
    const r = theirs.cards.find((x) => x.favour && x.favour.player !== 0)!;
    const back = toStaticHtml(h(RushView, { s: theirs.s, a: { card: r, n: 1, of: 1, stage: 'result', row: [], served: [] } }));
    expect(back).toContain('class="rh-fav back" role="img" aria-label="Favour card, face down"');
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

describe('the rush as it plays (animator.tsx reveal)', () => {
  afterEach(() => { holdCash(null); releaseStock(); releaseRush(); A.setBaseSpeed(false); A.resetHurry(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  // A day with a favour card won, four or more customers, and money for several stalls.
  const { s, cards } = find(four, (x, cs) => cs.length >= 4 && cs.some((c) => c.favour) && cs.filter((c) => c.blocks.some((b) => b.got > 0)).length >= 3 && !x.results!.hawker);
  const before = (x: GameState) => x.players.map((pl, i) => pl.cash - x.results!.income[i] - (x.results!.order?.holder === i ? x.results!.order.back : 0));
  /** What the game screen does as the bell rings (useGameController.ts): every total, shelf, ticket and favour card is held back. */
  function hold(x: GameState) {
    holdCash(before(x));
    holdStock(x.players.map((pl) => pl.stock), x.players.map((pl) => pl.stock));
    holdRush(x.results!, x.players.length);
  }
  const shownOf = (c: RushCard) => c.blocks.map((b) => lineShown(c.customerId, b.fruit));
  const paidTo = (c: RushCard, p: number) => sum(c.blocks.flatMap((b) => b.rows.filter((r) => r.player === p).map((r) => r.paid))) + sum(c.extras.filter((x) => x.player === p).map((x) => x.amount));

  it('serves the customers one after another, and nothing of a customer shows before their own card', async () => {
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
      // this customer's own sale is not shown while the card arrives and the offers turn up
      if (a.stage === 'in' || a.stage === 'rows') {
        expect(shownOf(a.card)).toEqual(a.card.blocks.map(() => false));
        // every stall's cash is what it was before the rush, plus the customers already served
        s.players.forEach((pl, p) => expect(shownCash(p, pl.cash)).toBe(before(s)[p] + sum(cards.slice(0, k).map((c) => paidTo(c, p)))));
      }
      if (a.stage === 'result' || a.stage === 'out') expect(shownOf(a.card)).toEqual(a.card.blocks.map(() => true));
      checked++;
    });
    await vi.runAllTimersAsync();
    await done;
    expect(checked).toBe(cards.length * 4);
    // each customer: the card in, the offers, the result, the card out; then the sheet is taken away
    expect(seen.map((x) => (x.a ? `${x.a.n}${x.a.stage}` : 'end'))).toEqual([...cards.flatMap((_c, i) => ['in', 'rows', 'result', 'out'].map((st) => `${i + 1}${st}`)), 'end']);
    expect(seen[seen.length - 2].a!.served).toEqual(cards.map((c) => c.customerId));
    // the result of each is read for a second, and the whole card takes its pace (less the travel, which has no page here)
    cards.forEach((_c, i) => {
      const at = (st: string) => seen.find((x) => x.a?.n === i + 1 && x.a.stage === st)!.at;
      expect(at('rows') - at('in')).toBe(BEAT.rush.cardIn);
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

  it('with reduced motion nothing travels: each customer\'s card is shown with its result and held about a second', async () => {
    fakeClock(true);
    hold(s);
    const seen: { at: number; a: ShowState | null }[] = [];
    const t0 = Date.now();
    const done = reveal(s, 0, (a) => {
      seen.push({ at: Date.now() - t0, a });
      if (a) for (const later of cards.slice(a.n)) expect(shownOf(later)).toEqual(later.blocks.map(() => false));
    });
    await vi.runAllTimersAsync();
    await done;
    expect(seen.map((x) => (x.a ? `${x.a.n}${x.a.stage}` : 'end'))).toEqual([...cards.flatMap((_c, i) => [`${i + 1}result`, `${i + 1}out`]), 'end']);
    cards.forEach((_c, i) => {
      const at = (st: string) => seen.find((x) => x.a?.n === i + 1 && x.a.stage === st)!.at;
      expect(at('out') - at('result')).toBeGreaterThanOrEqual(1000);
      expect(at('out') - at('result')).toBeLessThan(1050);
    });
    s.players.forEach((pl, p) => expect(shownCash(p, pl.cash)).toBe(pl.cash));
  });

  it('Skip settles every customer still to come without their cards; a tap on the table at the bell only ends the bell', async () => {
    // Skip (the button lets the shelves go as well): no card is shown, everything is paid and shown
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
      stages.push(`${a.n}${a.stage}`);
      if (a.n === 1 && a.stage === 'in') first = Date.now() - t0;
      if (a.n === 1 && a.stage === 'rows') second = Date.now() - t0;
    });
    await vi.advanceTimersByTimeAsync(500);
    A.hurryUp();
    await vi.runAllTimersAsync();
    await done;
    expect(first).toBe(500);
    expect(second - first).toBe(BEAT.rush.cardIn);
    expect(stages).toHaveLength(cards.length * 4);
  });

  it('after Skip a payment still being counted is not taken for money left over', async () => {
    // A day without a favour card, a standing order or the night hawker: every dollar is paid on a customer's card.
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

  it('a tap on a card moves on at once, and the next customer plays at the normal pace', async () => {
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
