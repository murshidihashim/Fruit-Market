import { describe, expect, it } from 'vitest';
import { FRUIT, FRUITS, stageAt, trackLength } from '../src/engine/data';
import { beginBuying, buy, count, newGame, type GameConfig, type GameState } from '../src/engine/game';
import { lifeLabel, marketColumn, mood, pulse, stockChips, wantText } from '../src/ui/boardModel';

function cfg(n: number, seed = 1): GameConfig {
  return {
    players: Array.from({ length: n }, (_, i) => ({ name: `P${i}`, kind: 'ai' as const, level: 'normal' as const, avatar: 'x' })),
    days: 10, unripe: true, upgrades: true, events: true, seed,
  };
}

function buying(seed: number): GameState {
  return beginBuying(newGame(cfg(3, seed)));
}

describe('market board', () => {
  it('shows every slot of every fruit, newest at the top, matching the engine tracks', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = buying(seed);
      for (const f of FRUITS) {
        const col = marketColumn(s, f);
        expect(col.length).toBe(s.market[f].length);
        expect(col.length).toBe(trackLength(f, true));
        // top-aligned: positions run from the newest slot down to 0 (not so fresh)
        expect(col.map((c) => c.pos)).toEqual(s.market[f].map((_, i) => i).reverse());
        for (const c of col) {
          expect(c.stage).toBe(stageAt(f, c.pos));
          expect(c.n).toBe(s.market[f][c.pos]);
        }
        expect(col[col.length - 1].stage).toBe('notso');
      }
    }
  });

  it('labels how long fruit lasts', () => {
    expect(lifeLabel('apple', 0)).toBe('last day');
    expect(lifeLabel('apple', 1)).toBe('1 night');
    expect(lifeLabel('apple', 5)).toBe('5 nights');
    const ripe = FRUIT.mango.ripe.length;
    expect(lifeLabel('mango', ripe)).toBe('ripens in 1');
    expect(lifeLabel('mango', ripe + 1)).toBe('ripens in 2');
  });

  it('turns a stall into chips with the same counts as the stock', () => {
    for (let seed = 1; seed <= 20; seed++) {
      let s = buying(seed);
      const p = s.order[s.turn];
      // buy whatever is first available, a few times
      for (let k = 0; k < 3; k++) {
        const f = FRUITS.find((x) => s.market[x].some((n) => n > 0));
        if (!f) break;
        const pos = s.market[f].findIndex((n) => n > 0);
        try { s = buy(s, p, f, pos); } catch { break; }
      }
      const groups = stockChips(s.players[p].stock);
      for (const g of groups) {
        expect(g.chips.reduce((a, c) => a + c.n, 0)).toBe(count(s.players[p].stock, g.f));
        for (const c of g.chips) expect(c.stage).toBe(stageAt(g.f, c.pos));
      }
    }
  });
});

describe('demand vs supply chips', () => {
  it('counts wants and ripe stock the same way as before the redesign', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = buying(seed);
      const custs = [...s.secondMarket, ...s.firstMarket, ...(s.forecast ? [s.forecast] : [])];
      const extra = s.event?.extra?.wants ?? [];
      for (const z of pulse(s)) {
        let want = 0;
        for (const c of custs) for (const w of c.wants) if (w.fruit === z.f) want += Math.max(0, w.qty);
        for (const w of extra) if (w.fruit === z.f) want += w.qty;
        expect(z.demand).toBe(want);
        expect(z.supply).toBe(s.players.reduce((a, pl) => a + count(pl.stock, z.f, true), 0));
      }
    }
  });

  it('picks the right colour and words', () => {
    const z = (demand: number, supply: number, more = false) => ({ f: 'apple' as const, demand, supply, more });
    expect(mood(z(0, 3))).toBe('none');
    expect(mood(z(2, 0))).toBe('open');
    expect(mood(z(2, 2))).toBe('good');
    expect(mood(z(2, 3))).toBe('war');
    expect(wantText(z(2, 0, true))).toBe('2+');
    expect(wantText(z(0, 0, true))).toBe('?');
    expect(wantText(z(0, 0))).toBe('0');
  });
});
