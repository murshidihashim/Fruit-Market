import { describe, expect, it } from 'vitest';
import { FRUIT, RIVALS, lookOf } from '../src/engine/data';
import { autoplay } from '../src/engine/ai';
import { newGame, winners, type GameState } from '../src/engine/game';
import { decisiveMoment, noSalesLine, soldAny, startingCash } from '../src/ui/game/resultsWords';

// PLAN-123 (the owner's results notes for a Normal game): one moment that decided the game, backed by the sales the
// game kept, and an accurate recap for a person who made no sales.

function finished(seeds: number[], stalls = 3, days = 6): GameState[] {
  return seeds.map((seed) => {
    let s = newGame({
      players: [{ name: 'Mia', kind: 'ai', level: 'normal', avatar: RIVALS[0].avatar }, ...RIVALS.slice(1, stalls).map((r) => ({ name: r.name, kind: 'ai' as const, level: 'normal' as const, avatar: r.avatar }))],
      days, unripe: true, upgrades: true, events: true, seed,
    });
    for (let i = 0; i < 8000 && s.phase !== 'over'; i++) s = autoplay(s, 1);
    return s;
  });
}
const games = finished([1, 2, 3, 4, 5, 6, 7, 8]);
const top = (cash: number[]) => { const m = Math.max(...cash); const at = cash.flatMap((c, i) => (c === m ? [i] : [])); return at.length === 1 ? at[0] : -1; };

/** The same game as if stall 0 had sold nothing all game: its offers and sales taken out of every day kept. */
function soldNothing(s: GameState, cash: number): GameState {
  const history = (s.history ?? []).map((d) => ({ ...d, lines: d.lines.map((l) => ({ ...l, offers: l.offers.filter((o) => o.player !== 0) })) }));
  const players = s.players.map((pl, i) => (i === 0 ? { ...pl, cash, stats: { ...pl.stats, sold: 0 } } : pl));
  return { ...s, history, players };
}

describe('the deciding moment', () => {
  it('is the day the winner took the lead on cash and kept it, with the winner\'s biggest sale that day', () => {
    let named = 0;
    for (const s of games) {
      expect(s.phase).toBe('over');
      const m = decisiveMoment(s, 0);
      const h = s.history!;
      const w = winners(s);
      if (!m) { expect(w.length !== 1 || top(h[h.length - 1].cash) !== w[0]).toBe(true); continue; }
      named++;
      const k = h.findIndex((d) => d.day === m.day);
      // the winner leads on cash from that day to the end, and did not the day before
      for (const d of h.slice(k)) expect(top(d.cash)).toBe(w[0]);
      if (k > 0) expect(top(h[k - 1].cash)).not.toBe(w[0]);
      // the sale named is the winner's biggest that day, as the game kept it
      const sales = h[k].lines.flatMap((l) => l.offers.filter((o) => o.player === w[0] && o.sold > 0).map((o) => ({ l, o, total: o.sold * o.price })));
      if (sales.length) {
        const best = sales.reduce((a, x) => (x.total > a.total ? x : a));
        const word = (best.o.sold === 1 ? FRUIT[best.l.fruit].name : FRUIT[best.l.fruit].plural).toLowerCase();
        expect(m.text).toContain(`sold ${best.o.sold} ${word} to ${lookOf(best.l.name).title} for $${best.total}`);
      }
      expect(m.text.startsWith(`Day ${m.day}: ${w[0] === 0 ? 'You' : s.players[w[0]].name} `)).toBe(true);
      expect(m.text).not.toContain('!');
    }
    expect(named).toBeGreaterThan(3);
  });
});

describe('a game with no sales', () => {
  it('says so plainly, against the cash the game began with', () => {
    const s = games[0];
    const start = startingCash(s)![0];
    expect(start).toBe(10);
    expect(soldAny(s, 0)).toBe(true);
    expect(noSalesLine(s, 0)).toBeNull();
    expect(noSalesLine(soldNothing(s, start), 0)).toBe('You ended with your starting cash and made no sales.');
    expect(noSalesLine(soldNothing(s, start - 4), 0)).toBe(`You made no sales and ended with $${start - 4}, $4 less than you started with.`);
    expect(noSalesLine(soldNothing(s, start + 2), 0)).toBe(`You made no sales and ended with $${start + 2}, $2 more than you started with.`);
    // a record too old to know the starting cash
    const old = soldNothing(s, start);
    expect(noSalesLine({ ...old, history: old.history!.map((d) => ({ ...d, net: undefined })) }, 0)).toBe('You made no sales.');
  });
});
