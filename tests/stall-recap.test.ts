import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import { autoplay } from '../src/engine/ai';
import { FRUIT, RIVALS, lookOf, stageAt, type Stage } from '../src/engine/data';
import { finishReveal, newGame, publicView, type GameState } from '../src/engine/game';
import { toStaticHtml } from '../src/ui/cards';
import { RecapView, TakingsView, saleSaid, stallSales } from '../src/ui/game/panels/SalesSummary';

// PLAN-128: a tap on a stall's row on the takings opens its sales for the day: each sale's fruit (with the freshness of
// each piece), customer and price. The lines come from the day's results, which the day's history keeps, and they add
// up to the stall's income for the day.

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Every day of some games at the moment the takings are shown (the rush is over). */
function days(stalls: number, seeds: number[]): GameState[] {
  const out: GameState[] = [];
  for (const seed of seeds) {
    let s = newGame({
      players: [{ name: 'Mia', kind: 'ai', level: 'normal', avatar: RIVALS[0].avatar }, ...RIVALS.slice(1, stalls).map((r) => ({ name: r.name, kind: 'ai' as const, level: 'normal' as const, avatar: r.avatar }))],
      days: 10, unripe: true, upgrades: true, events: true, seed,
    });
    for (let i = 0; i < 6000 && s.phase !== 'over'; i++) {
      if (s.phase === 'reveal' && s.results && out[out.length - 1] !== s) out.push(s);
      s = autoplay(s, 1);
    }
  }
  return out;
}
const all = [...days(4, [1, 2, 3, 4, 5, 6]), ...days(6, [1, 2, 3]), ...days(2, [1, 2])];
const seats = (s: GameState) => s.players.map((_, p) => p);

describe('a stall\'s sales for the day', () => {
  it('add up to the stall\'s income, for every stall on every day, as the day\'s history records it', () => {
    expect(all.length).toBeGreaterThan(80);
    for (const s of all) {
      // the day's record, once the rush has been shown
      const hist = finishReveal(s).history!;
      const record = hist[hist.length - 1];
      expect(record.day).toBe(s.day);
      for (const p of seats(s)) {
        const { sales, total } = stallSales(s, p);
        expect(total).toBe(s.results!.income[p]);
        expect(total).toBe(record.income[p]);
        expect(sum(sales.map((x) => x.paid))).toBe(total);
        // each piece sold to a customer is a line of the day's history
        const sold = sum(record.lines.flatMap((l) => l.offers.filter((o) => o.player === p).map((o) => o.sold)));
        expect(sum(sales.filter((x) => x.kind === 'sale' || x.kind === 'order').map((x) => x.n))).toBe(sold);
        for (const x of sales) {
          if (x.kind === 'tip') { expect(x.n).toBe(0); continue; }
          expect(x.n).toBeGreaterThan(0);
          expect(x.paid).toBe(x.n * x.price + x.juice);
        }
      }
    }
  });

  it('name each piece\'s freshness, freshest first, from the pieces that were in the stall\'s crate', () => {
    let known = 0, lines = 0;
    for (const s of all) for (const p of seats(s)) {
      for (const x of stallSales(s, p).sales.filter((y) => y.kind === 'sale' || y.kind === 'order')) {
        lines += 1;
        if (!x.pieces) continue;
        known += 1;
        expect(x.pieces.length).toBe(x.n);
        const order: Stage[] = FRUIT[x.fruit!].ripe.map((_, pos) => stageAt(x.fruit!, pos)).reverse();
        expect([...x.pieces].sort((a, b) => order.indexOf(a) - order.indexOf(b))).toEqual(x.pieces);
        // only pieces the crate held when the bell rang
        const crate = (s.crates?.[p]?.[x.fruit!] ?? []).flatMap((n, pos) => Array.from({ length: n }, () => stageAt(x.fruit!, pos)));
        for (const st of new Set(x.pieces)) expect(crate.filter((c) => c === st).length).toBeGreaterThanOrEqual(x.pieces.filter((c) => c === st).length);
      }
    }
    expect(lines).toBeGreaterThan(300);
    expect(known / lines).toBeGreaterThan(0.95);
  });

  it('are the same on every phone: what a player sees of a rival after the rush is all of it', () => {
    for (const s of all.slice(0, 30)) for (const p of seats(s)) for (const viewer of seats(s)) {
      expect(stallSales(publicView(s, viewer), p)).toEqual(stallSales(s, p));
    }
  });

  it('cover the day\'s other money too: the night hawker, tips and a Juice Bar\'s', () => {
    const kinds = new Set(all.flatMap((s) => seats(s).flatMap((p) => stallSales(s, p).sales.map((x) => (x.juice ? 'juice' : x.kind)))));
    for (const k of ['sale', 'order', 'tip', 'juice']) expect(kinds).toContain(k);
    // a Sharp Ears tip never names the walk-in the stall had seen
    for (const s of all) for (const p of seats(s)) for (const x of stallSales(s, p).sales) if (x.label?.startsWith('Sharp Ears')) expect(x.who).toBeNull();
  });
});

describe('the sales ticket', () => {
  it('lists each sale with its customer, fruit and price, and the total', () => {
    let drawn = 0;
    for (const s of all.slice(0, 20)) for (const p of seats(s)) {
      const { sales, total } = stallSales(s, p);
      const html = toStaticHtml(h(RecapView, { s, p, viewer: 0 }));
      expect(html).toContain(p === 0 ? 'Your sales' : `${s.players[p].name}'s sales`);
      expect(html).toContain(`$${total}</b>`);
      if (!sales.length) { expect(html).toContain('Sold nothing today'); continue; }
      expect(html).not.toContain('Sold nothing today');
      for (const x of sales) {
        drawn += 1;
        expect(html).toContain(`aria-label="${saleSaid(x)}"`);
        if (x.kind === 'sale' || x.kind === 'order') {
          expect(html).toContain(lookOf(x.who!).title);
          expect(html).toContain(`×${x.n} at $${x.price}`);
        }
      }
    }
    expect(drawn).toBeGreaterThan(50);
  });

  it('says a sale in words a screen reader reads', () => {
    expect(saleSaid({ kind: 'sale', who: 'Grandpa Tan', guest: false, fruit: 'apple', pieces: ['fresh', 'okay'], n: 2, price: 4, juice: 0, paid: 8 }))
      .toBe(`${lookOf('Grandpa Tan').title} bought 2 Fresh and Okay apples at $4 each: $8.`);
    expect(saleSaid({ kind: 'hawker', who: null, guest: false, fruit: 'mango', pieces: null, n: 1, price: 2, juice: 0, paid: 2 }))
      .toBe('The night hawker bought 1 mango at $2 each: $2.');
  });

  it('opens from every stall\'s row on the takings, a button with a name', () => {
    const s = all[3];
    const html = toStaticHtml(h(TakingsView, { s, viewer: 0 }));
    expect(html.match(/<button type="button" class="tg-stall [^"]*" data-stall="\d" aria-haspopup="dialog" aria-label="[^"]+See the sales"/g)?.length).toBe(s.players.length);
  });
});
