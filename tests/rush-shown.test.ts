import { afterEach, describe, expect, it } from 'vitest';
import { h } from 'preact';
import { FAVOURS, RIVALS } from '../src/engine/data';
import { autoplay } from '../src/engine/ai';
import { newGame, servingCustomers, type GameState } from '../src/engine/game';
import { toStaticHtml } from '../src/ui/cards';
import {
  boughtToday, favourShown, holdRush, landPiece, lineShown, piecesLanded, releaseRush, rushHeld, serveLine, showFavour, shownFavours, shownWants,
} from '../src/ui/rushShown';
import { MyStall, Street } from '../src/ui/table';

// PLAN-084, nothing before its moment: the game works out every sale at the bell, so the customers' tickets are already
// ticked and a favour card won is already in its stall's hand. The table holds both back until that customer's sale
// has been shown in the rush, like the cash and the shelves.

/** Every day of some four-stall games at the moment the bell has rung. */
function daysAtBell(): GameState[] {
  const out: GameState[] = [];
  for (const seed of [1, 2, 3, 4]) {
    let s = newGame({
      players: [{ name: 'Mia', kind: 'ai', level: 'normal', avatar: RIVALS[0].avatar }, ...RIVALS.slice(1, 4).map((r) => ({ name: r.name, kind: 'ai' as const, level: 'normal' as const, avatar: r.avatar }))],
      days: 10, unripe: true, upgrades: true, events: true, seed,
    });
    for (let i = 0; i < 6000 && s.phase !== 'over'; i++) {
      if (s.phase === 'reveal' && s.results) out.push(s);
      s = autoplay(s, 1);
    }
  }
  return out;
}
const days = daysAtBell();
const ticks = (html: string) => html.match(/tkc-rw [^"]*\bdone\b/g)?.length ?? 0;

afterEach(() => releaseRush());

describe('tickets held back in the rush (rushShown.ts)', () => {
  // A day on which two or more customers bought everything of some fruit.
  const s = days.find((x) => servingCustomers(x).filter((c) => c.wants.some((w) => w.qty <= 0)).length >= 2)!;
  const r = s.results!;
  const row = servingCustomers(s);

  it('shows the tickets as they are when nothing is held back', () => {
    expect(rushHeld()).toBe(false);
    for (const c of row) {
      expect(shownWants(r, c)).toBe(c.wants);
      for (const w of c.wants) expect(lineShown(c.id, w.fruit)).toBe(true);
    }
    expect(ticks(toStaticHtml(h(Street, { s, viewer: 0 })))).toBe(row.flatMap((c) => c.wants).filter((w) => w.qty <= 0).length);
  });

  it('at the bell every ticket reads as it did before the rush: nothing ticked, every piece still wanted', () => {
    holdRush(r, s.players.length);
    expect(rushHeld()).toBe(true);
    for (const c of row) {
      const shown = shownWants(r, c);
      // what they wanted when the bell rang: what is left now and what they bought today
      expect(shown.map((w) => w.qty)).toEqual(c.wants.map((w) => w.qty + boughtToday(r, c.id, w.fruit)));
      expect(shown.every((w) => w.qty > 0)).toBe(true);
      // the game's own customer is not changed
      expect(shown).not.toBe(c.wants);
    }
    const page = toStaticHtml(h(Street, { s, viewer: 0 }));
    expect(ticks(page)).toBe(0);
    expect(page).not.toContain('happy-mark');
  });

  it('a fruit is ticked when that customer\'s sale of it has been shown, and no other', () => {
    holdRush(r, s.players.length);
    let expected = 0;
    for (const c of row) {
      for (const w of c.wants) {
        serveLine(c.id, w.fruit);
        if (w.qty <= 0) expected++;
        expect(lineShown(c.id, w.fruit)).toBe(true);
        expect(ticks(toStaticHtml(h(Street, { s, viewer: 0 })))).toBe(expected);
      }
      // this customer's ticket now reads as it really is; the next one's still as at the bell
      expect(shownWants(r, c).map((w) => w.qty)).toEqual(c.wants.map((w) => w.qty));
    }
    expect(expected).toBeGreaterThan(1);
    releaseRush();
    expect(ticks(toStaticHtml(h(Street, { s, viewer: 0 })))).toBe(expected);
  });

  it('counts the pieces that have landed on a customer\'s card, fruit by fruit', () => {
    const c = row[0];
    const f = c.wants[0].fruit;
    expect(piecesLanded(c.id, f)).toBe(0);
    landPiece(c.id, f); // nothing held: ignored
    expect(piecesLanded(c.id, f)).toBe(0);
    holdRush(r, s.players.length);
    landPiece(c.id, f);
    landPiece(c.id, f, 2);
    expect(piecesLanded(c.id, f)).toBe(3);
    expect(piecesLanded(row[1].id, f)).toBe(0);
    expect(lineShown(c.id, f)).toBe(false);
  });
});

describe('a favour card won in the rush is held back until it has reached its stall', () => {
  // A day on which this stall won a favour card, and one on which a rival did.
  const mine = days.find((x) => x.results!.favours.some((f) => f.player === 0))!;
  const theirs = days.find((x) => x.results!.favours.some((f) => f.player !== 0))!;
  const chips = (html: string) => html.match(/class="favchip/g)?.length ?? 0;

  it('your shelf shows the cards you held at the bell; the one won appears when its customer has been served', () => {
    const hand = mine.players[0].favours;
    const won = mine.results!.favours.filter((f) => f.player === 0);
    expect(hand.slice(-won.length)).toEqual(won.map((f) => f.favour));
    expect(chips(toStaticHtml(h(MyStall, { s: mine, p: 0 })))).toBe(hand.length);
    holdRush(mine.results!, mine.players.length);
    expect(shownFavours(0, hand)).toEqual(hand.slice(0, hand.length - won.length));
    const held = toStaticHtml(h(MyStall, { s: mine, p: 0 }));
    expect(chips(held)).toBe(hand.length - won.length);
    // nothing of the card won is drawn yet (unless another copy was already in the hand)
    for (const f of won) if (!hand.slice(0, hand.length - won.length).includes(f.favour)) expect(held).not.toContain(FAVOURS[f.favour].title);
    const customer = servingCustomers(mine).find((c) => c.name === won[0].customer)!;
    expect(favourShown(customer.id)).toBe(false);
    showFavour(customer.id, 0);
    expect(favourShown(customer.id)).toBe(true);
    expect(chips(toStaticHtml(h(MyStall, { s: mine, p: 0 })))).toBe(hand.length - won.length + 1);
    showFavour(customer.id, 0); // the same card again: counted once
    expect(chips(toStaticHtml(h(MyStall, { s: mine, p: 0 })))).toBe(hand.length - won.length + 1);
    releaseRush();
    expect(shownFavours(0, hand)).toBe(hand);
  });

  it('a rival\'s count of favour cards (in its opened stall) rises then too, and no other stall\'s', () => {
    const f = theirs.results!.favours.find((x) => x.player !== 0)!;
    const hand = theirs.players[f.player].favours;
    const count = (p: number) => shownFavours(p, theirs.players[p].favours).length;
    const real = theirs.players.map((pl) => pl.favours.length);
    expect(theirs.players.map((_, p) => count(p))).toEqual(real);
    holdRush(theirs.results!, theirs.players.length);
    const won = theirs.players.map((_, p) => theirs.results!.favours.filter((x) => x.player === p).length);
    expect(theirs.players.map((_, p) => count(p))).toEqual(real.map((n, p) => n - won[p]));
    showFavour(servingCustomers(theirs).find((c) => c.name === f.customer)!.id, f.player);
    expect(theirs.players.map((_, p) => count(p))).toEqual(real.map((n, p) => n - won[p] + (p === f.player ? 1 : 0)));
    // the cards it already held are the ones shown: the card won is the last in the hand
    expect(shownFavours(f.player, hand)).toEqual(hand.slice(0, count(f.player)));
  });
});
