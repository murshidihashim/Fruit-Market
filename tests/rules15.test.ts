// Rules version 15, secret stalls (PLAN-073): a rival's shelf is never shown, a rival's crate is only a number of
// pieces until the bell, and neither a person's screen nor a computer stall's pricing reads what is behind a shutter.
import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import { autoplay, believe, planPrices } from '../src/engine/ai';
import { FRUIT, FRUITS, type FruitId } from '../src/engine/data';
import { emptyStock, forSale, newGame, oldestCrate, outCount, publicView, type Customer, type GameState } from '../src/engine/game';
import { RULES_VERSION } from '../src/net/protocol';
import { redact } from '../server/room';
import { toStaticHtml } from '../src/ui/cards';
import { CratesOpen } from '../src/ui/game/panels/PricingTable';
import { PricePanelView, startingPrices } from '../src/ui/panel';
import { rivalNote } from '../src/ui/table';

const FRESH = (f: FruitId) => FRUIT[f].ripe.length - 1;
const buyer = (id: number, f: FruitId, qty: number, max: number, pref: Customer['pref'] = 'everyday'): Customer =>
  ({ id, name: `C${id}`, pref, wants: [{ fruit: f, qty, max }], original: [{ fruit: f, qty, max }] });

/** Three stalls at the bell. You: 2 fresh apples out. Saleh holds 2 apples and 2 mangoes and puts out 2 pieces
 *  (`salehOut` says which). Kiki: 1 blueberry out, prices sealed. Customers want apples and mangoes. */
function bell(salehOut: Partial<Record<FruitId, number>>, kind: 'human' | 'ai' = 'human'): GameState {
  const g = newGame({ players: [
    { name: 'You', kind, level: 'normal', avatar: '🦊' }, { name: 'Saleh', kind: 'ai', level: 'normal', avatar: '🐸' }, { name: 'Kiki', kind: 'ai', level: 'normal', avatar: '🐷' },
  ], days: 10, unripe: true, upgrades: true, events: false, seed: 4 });
  const s: GameState = structuredClone(g);
  s.day = 2; s.phase = 'bid'; s.event = null; s.standing = null;
  s.players.forEach((pl) => { pl.stock = emptyStock(true); pl.favours = []; });
  s.players[0].stock.apple[FRESH('apple')] = 2;
  s.players[1].stock.apple[FRESH('apple')] = 2;
  s.players[1].stock.mango[FRESH('mango')] = 2;
  s.players[2].stock.blueberry[FRESH('blueberry')] = 1;
  s.stalls = [{ apple: 2 }, salehOut, { blueberry: 1 }];
  s.crates = s.stalls.map((st, i) => oldestCrate(s.players[i], st!));
  s.bids = [null, null, [{ fruit: 'blueberry', price: 97 }]];
  s.firstMarket = [buyer(1, 'apple', 2, 7), buyer(2, 'apple', 1, 6), buyer(3, 'mango', 2, 11)];
  s.secondMarket = [];
  return s;
}

describe('rules version 15', () => {
  it('is still in force (rules 16 only draws tomorrow\'s crowd earlier)', () => {
    expect(RULES_VERSION).toBeGreaterThanOrEqual(15);
  });
});

describe('what one stall may see (publicView)', () => {
  it('blanks every rival shelf, keeps your own, and shows a rival crate only as a count until the bell', () => {
    const s = bell({ apple: 2 });
    const v = publicView(s, 0);
    expect(v.players[0].stock).toEqual(s.players[0].stock);
    for (const i of [1, 2]) for (const f of FRUITS) expect(v.players[i].stock[f].every((n) => n === 0)).toBe(true);
    expect(v.stalls).toEqual([{ apple: 2 }, {}, {}]);
    expect(v.crates![1]).toEqual({});
    expect(v.out).toEqual([2, 2, 1]);
    expect([0, 1, 2].map((i) => outCount(v, i))).toEqual([2, 2, 1]);
    for (const f of FRUITS) expect(forSale(v, 1, f)).toBe(0);
    // The real game is untouched.
    expect(s.stalls[1]).toEqual({ apple: 2 });
    expect(s.out).toBeUndefined();
  });

  it('while stalls are opening, shows only whether a rival has opened', () => {
    const s = bell({ apple: 2 });
    s.phase = 'stall'; s.stalls[2] = null; s.crates![2] = null; s.bids = [null, null, null];
    const v = publicView(s, 0);
    expect(v.stalls).toEqual([{ apple: 2 }, {}, null]);
    expect(v.out).toEqual([null, null, null]);
  });

  it('opens every crate at the bell, but never a shelf', () => {
    const s = bell({ apple: 1, mango: 1 });
    s.phase = 'reveal';
    const v = publicView(s, 0);
    expect(v.stalls[1]).toEqual({ apple: 1, mango: 1 });
    expect(v.out).toBeUndefined();
    for (const f of FRUITS) expect(v.players[1].stock[f].every((n) => n === 0)).toBe(true);
  });

  it('with memory keeps the shelves a watchful stall would know, and still no crate', () => {
    const s = bell({ mango: 2 });
    const v = publicView(s, 0, true);
    expect(v.players[1].stock).toEqual(s.players[1].stock);
    expect(v.stalls[1]).toEqual({});
  });
});

describe('online: what the server sends', () => {
  it('never sends a rival shelf, in any phase of a whole game, nor a rival crate before the bell', () => {
    let s = newGame({ players: ['A', 'B', 'C'].map((name) => ({ name, kind: 'ai' as const, level: 'normal' as const, avatar: '🦊' })), days: 4, unripe: true, upgrades: true, events: true, seed: 9 });
    let bids = 0;
    for (let i = 0; i < 2000 && s.phase !== 'over'; i++) {
      const v = redact(s, 0);
      for (const r of [1, 2]) for (const f of FRUITS) expect(v.players[r].stock[f].every((n) => n === 0), `day ${s.day} ${s.phase}`).toBe(true);
      if (s.phase === 'bid') {
        bids++;
        for (const r of [1, 2]) {
          expect(v.stalls[r]).toEqual({});
          expect(v.crates?.[r] ?? {}).toEqual({});
          expect(v.out![r]).toBe(FRUITS.reduce((a, f) => a + forSale(s, r, f), 0));
        }
      }
      s = autoplay(s, 1);
    }
    expect(s.phase).toBe('over');
    expect(bids).toBeGreaterThan(0);
  });
});

describe('pricing without peeking (believe)', () => {
  it('a rival crate is guessed from its count: the same guess whatever it really holds', () => {
    const apples = believe(bell({ apple: 2 }), 0, false), mangoes = believe(bell({ mango: 2 }), 0, false);
    expect(apples.stalls[1]).toEqual(mangoes.stalls[1]);
    expect(FRUITS.reduce((a, f) => a + forSale(apples, 1, f), 0)).toBe(2);
    expect(FRUITS.reduce((a, f) => a + forSale(apples, 2, f), 0)).toBe(1);
  });

  it('the price suggested to a person does not change with what a rival really put out', () => {
    expect(startingPrices(bell({ apple: 2 }), 0)).toEqual(startingPrices(bell({ mango: 2 }), 0));
    expect(startingPrices(publicView(bell({ apple: 2 }), 0), 0)).toEqual(startingPrices(bell({ mango: 2 }), 0));
  });

  it('a computer stall prices the same whatever a rival really put out; a Hard one guesses only fruit that rival was seen to hold', () => {
    const a = bell({ apple: 2 }, 'ai'), m = bell({ mango: 2 }, 'ai');
    expect(planPrices(a, 0)).toEqual(planPrices(m, 0));
    // Rules 18: only a Hard computer recalls every purchase it saw (a Normal one only today's; see rules18.test.ts).
    for (const t of [a, m]) t.players[0].level = 'hard';
    expect(planPrices(a, 0)).toEqual(planPrices(m, 0));
    const b = believe(a, 0);
    // Saleh holds apples and mangoes only; Kiki only a blueberry.
    expect(forSale(b, 1, 'blueberry') + forSale(b, 1, 'watermelon')).toBe(0);
    expect(b.stalls[2]).toEqual({ blueberry: 1 });
  });

  it('does nothing outside pricing', () => {
    const s = bell({ apple: 2 });
    s.phase = 'reveal';
    expect(believe(s, 0)).toBe(s);
  });
});

describe('on screen', () => {
  const view = (s: GameState) => publicView(s, 0);

  it('the pricing screen says the same thing whatever a rival really put out', () => {
    const draw = (s: GameState) => toStaticHtml(h(PricePanelView, {
      s: view(s), p: 0, vals: startingPrices(view(s), 0), notice: false, onPrice: () => undefined, onNotice: () => undefined,
    }));
    expect(draw(bell({ apple: 2 }))).toBe(draw(bell({ mango: 2 })));
  });

  it('a rival box says how many pieces are out, never what is on the shelf; every crate shows once the bell has rung', () => {
    const s = bell({ apple: 1, mango: 1 });
    expect(rivalNote(view(s), 1, false)).toBe('2 out');
    expect(rivalNote(view({ ...s, phase: 'buy' }), 1, false)).toBe('');
    expect(rivalNote(view({ ...s, phase: 'morning' }), 1, false)).toBe('');
    const rung = { ...s, phase: 'reveal' as const, bids: [[{ fruit: 'apple' as const, price: 6 }], [{ fruit: 'apple' as const, price: 5 }, { fruit: 'mango' as const, price: 10 }], [{ fruit: 'blueberry' as const, price: 4 }]] };
    const table = toStaticHtml(h(CratesOpen, { s: view(rung), viewer: 0 }));
    expect(table).toContain('Every crate and every price is open');
    // before the flip the bell's rows hold nothing of anyone's, whatever the state carries (PLAN-085)
    const early = toStaticHtml(h(CratesOpen, { s: { ...rung, phase: 'bid' as const }, viewer: 0 }));
    expect(early).not.toMatch(/\$10|\$5|\$6|\$4|mango|apple|blueberr/i);
    // while the bell rings, a row that has not turned yet shows only the backs of its tags
    const ringing = toStaticHtml(h(CratesOpen, { s: view(rung), viewer: 0, open: 0 }));
    expect(ringing).not.toMatch(/\$10|\$5<|\$6<|\$4</);
    expect(ringing.match(/class="ds-pz back"/g)).toHaveLength(4);
    expect(table).toContain('Saleh: 1 mangoes at $10, 1 apples at $5'); // the printed board's lane order
    expect(table).toContain('Your crate: 2 apples at $6');
  });
});
