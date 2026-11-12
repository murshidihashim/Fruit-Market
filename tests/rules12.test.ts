// Rules 12 (PLAN-060): you choose exactly which pieces go in your crate, and only those can sell, oldest of them first.
import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import { autoplay } from '../src/engine/ai';
import { FRUIT, RIVALS, type FruitId } from '../src/engine/data';
import {
  applyAction, beginBuying, crateCounts, crateStock, emptyStock, newGame, oldestCrate, openStall, submitPrices, validateCrate,
  type Customer, type GameState,
} from '../src/engine/game';
import { StallBar, StallPanelView, startingCrate } from '../src/ui/panel';
import { toStaticHtml } from '../src/ui/cards';
import { RULES_VERSION } from '../src/net/protocol';
import { endBuying } from './stall-step';

const FRESH = (f: FruitId) => FRUIT[f].ripe.length - 1;
const OKAY = (f: FruitId) => FRUIT[f].ripe.lastIndexOf('okay');
const buyer = (id: number, f: FruitId, qty: number, max: number, pref: Customer['pref']): Customer =>
  ({ id, name: `C${id}`, pref, wants: [{ fruit: f, qty, max }], original: [{ fruit: f, qty, max }] });

/** Two stalls at the stall step: you hold 2 tired and 2 fresh apples; the rival holds nothing. */
function stocking(crowd: Customer[]): GameState {
  let s = beginBuying(newGame({ players: [{ name: 'You', kind: 'human', avatar: 'a' }, { name: 'R', kind: 'human', avatar: 'b' }], days: 10, unripe: true, upgrades: true, events: false, seed: 3 }));
  s = endBuying(s);
  s = structuredClone(s);
  s.firstMarket = crowd; s.secondMarket = []; s.order = [0, 1];
  s.players.forEach((pl) => { pl.stock = emptyStock(true); pl.trait = null; pl.favours = []; });
  s.players[0].stock.apple[0] = 2;
  s.players[0].stock.apple[FRESH('apple')] = 2;
  return s;
}

describe('rules 12: the crate holds exact pieces', () => {
  it('is rules version 12 or later', () => expect(RULES_VERSION).toBeGreaterThanOrEqual(12));

  it('only the pieces in your crate sell: fresh pieces sell to a Premium buyer, tired ones never do', () => {
    const premium = [buyer(1, 'apple', 2, 9, 'premium')];
    const sold = (crate?: number[]) => {
      let s = openStall(stocking(premium), 0, { apple: 2 }, crate ? { apple: crate } : undefined);
      s = openStall(s, 1, {});
      s = submitPrices(s, 0, [{ fruit: 'apple', price: 6 }]);
      return { n: s.results!.lines[0].offers[0]?.sold ?? 0, left: s.players[0].stock.apple };
    };
    const fresh = [0, 0, 0, 0, 0, 2];
    expect(sold(fresh).n).toBe(2);
    expect(sold(fresh).left).toEqual([2, 0, 0, 0, 0, 0]); // the tired ones stay on the shelf
    expect(sold().n).toBe(0); // counts only: the oldest pieces go in, and Premium won't take them
  });

  it('the oldest pieces in the crate sell first, and the hawker takes the oldest left', () => {
    const bargain = [buyer(1, 'apple', 1, 9, 'bargain')];
    let s = openStall(stocking(bargain), 0, { apple: 3 }, { apple: [1, 0, 0, 0, 0, 2] });
    s = openStall(s, 1, {});
    s = submitPrices(s, 0, [{ fruit: 'apple', price: 3 }]);
    expect(s.players[0].stock.apple).toEqual([1, 0, 0, 0, 0, 2]); // the tired one went
  });

  it('a crate must match the shelf: never more than a space holds, no green fruit, whole numbers', () => {
    const s = stocking([]);
    expect(validateCrate(s, 0, { apple: [3, 0, 0, 0, 0, 0] })).toMatch(/don't have that many/);
    expect(validateCrate(s, 0, { apple: [1, 0, 0] })).toBe('Bad crate');
    expect(validateCrate(s, 0, { apple: [0.5, 0, 0, 0, 0, 0] })).toBe('Whole numbers only');
    s.players[0].stock.mango[FRUIT.mango.ripe.length] = 1;
    expect(validateCrate(s, 0, { mango: [0, 0, 0, 1, 0] })).toMatch(/Green fruit/);
    expect(() => openStall(s, 0, {}, { apple: [3, 0, 0, 0, 0, 0] })).toThrow();
  });

  it('counts only (computer shops, older apps) fill the crate with the oldest pieces', () => {
    const s = stocking([]);
    s.players[0].stock.apple[OKAY('apple')] = 1;
    expect(oldestCrate(s.players[0], { apple: 3 })).toEqual({ apple: [2, 1, 0, 0, 0, 0] });
    const opened = openStall(s, 0, { apple: 3 });
    expect(opened.crates![0]).toEqual({ apple: [2, 1, 0, 0, 0, 0] });
    expect(crateCounts(opened.crates![0]!)).toEqual({ apple: 3 });
    expect(crateStock(opened, 0).apple).toEqual([2, 1, 0, 0, 0, 0]);
  });

  it('the crate goes through the action for online play and replays', () => {
    const s = applyAction(stocking([]), 0, { kind: 'stall', stall: { apple: 2 }, crate: { apple: [0, 0, 0, 0, 0, 2] } });
    expect(s.crates![0]).toEqual({ apple: [0, 0, 0, 0, 0, 2] });
  });

  it('computer games of every size still finish with every rule kept', () => {
    for (const n of [2, 4, 6]) {
      const g = autoplay(newGame({ players: RIVALS.slice(0, n).map((r) => ({ name: r.name, kind: 'ai' as const, level: 'hard' as const, avatar: r.avatar })), days: 8, unripe: true, upgrades: true, events: true, seed: n }));
      expect(g.phase).toBe('over');
      for (const p of g.players) for (const f of Object.keys(p.stock) as FruitId[]) expect(p.stock[f].every((x) => x >= 0)).toBe(true);
    }
  });
});

describe('Fill your crate (rows since PLAN-072)', () => {
  it('draws a row for each box of your shelf that holds fruit, with − and + on the ripe ones and none on green fruit', () => {
    const s = stocking([buyer(1, 'apple', 2, 9, 'everyday')]);
    s.players[0].stock.mango[FRUIT.mango.ripe.length] = 1; // green
    const crate = { apple: [0, 0, 0, 0, 0, 0, 1] };
    // PLAN-085: the rows of the day's sheet, and the main button under them
    const html = toStaticHtml([h(StallPanelView, { s, p: 0, crate, onStep: () => undefined }), h(StallBar, { total: 1, onSubmit: () => undefined })]);
    expect(html).toContain('Fill your crate');
    expect(html).toContain('Your crate: 1 in it');
    expect(html).toContain('1 piece in crate');
    expect(html).not.toContain('Market Day');
    expect(html.match(/class="ds-srow /g)).toHaveLength(3); // the soft apple, the fresh apple and the green mango
    expect(html.match(/class="mini-step"/g)).toHaveLength(2); // the soft and the fresh apple boxes
    expect(html.match(/class="crate-piece/g)).toHaveLength(1);
    expect(html).toContain('Crate ready');
    expect(html).toMatch(/Mango, Green: 1 on your shelf"/);
    // green fruit is shown but is not for sale; an older piece says what it loses
    expect(html).toMatch(/class="ds-srow mango off /);
    expect(html).toContain('Still Green');
    expect(html).toContain('Soft sells $2 less');
    // a piece on its way to the crate is drawn there only when it lands
    const flying = toStaticHtml(h(StallPanelView, { s, p: 0, crate, landed: { apple: [0, 0, 0, 0, 0, 0, 0] }, onStep: () => undefined }));
    expect(flying).not.toContain('class="crate-piece');
    expect(flying).toContain('Your crate: 1 in it');
    // while the rivals open their stalls nothing can be changed
    const waiting = toStaticHtml(h(StallPanelView, { s, p: 0, crate, waiting: true, onStep: () => undefined }));
    expect(waiting).not.toContain('class="mini-step"');
    expect(toStaticHtml(h(StallBar, { total: 0, onSubmit: () => undefined }))).toContain('Sell nothing today');
  });

  it('starts with nothing out (PLAN-061): you add each piece yourself', () => {
    const s = stocking([buyer(1, 'apple', 2, 9, 'everyday')]);
    const c = startingCrate(s, 0);
    expect(Object.values(c).every((t) => t!.every((n) => n === 0))).toBe(true);
    expect(validateCrate(s, 0, c)).toBeNull();
  });
});
