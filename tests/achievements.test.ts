import { describe, expect, it } from 'vitest';
import { autoplay } from '../src/engine/ai';
import { newGame, type GameState, type LineResult } from '../src/engine/game';
import { ACHIEVEMENTS, evaluate, progressOf, THEMES, type Context } from '../src/ui/achievements';

const ctx = (over: Partial<Context> = {}): Context => ({ online: false, have: new Set(), sets: {}, stats: { played: 1, totalSold: 10 }, streak: 0, ...over });

function game(players = 2, seed = 3): GameState {
  return autoplay(newGame({
    players: Array.from({ length: players }, (_, i) => ({ name: i === 0 ? 'Me' : ['Rosa', 'Benny', 'Chen'][i - 1], kind: 'ai' as const, level: 'hard' as const, avatar: '' })),
    days: 8, unripe: true, upgrades: true, events: true, seed,
  }));
}

const line = (customerId: number, name: string, want: number, offers: { player: number; price: number; sold: number; qty?: number; tooOld?: boolean }[], max = 8): LineResult => ({
  customerId, name, fruit: 'apple', want, max,
  offers: offers.map((o) => ({ player: o.player, price: o.price, sold: o.sold, qty: o.qty ?? o.sold, freshness: 3, tooOld: o.tooOld })),
});
const day = (n: number, lines: LineResult[], event?: string, income = [0, 0]) => ({ day: n, lines, income, cash: [10, 10], event });

describe('achievement list', () => {
  it('has unique ids, known themes, and about forty entries', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(38);
    expect(ACHIEVEMENTS.length).toBeLessThanOrEqual(46);
    for (const a of ACHIEVEMENTS) expect(THEMES.some((t) => t.id === a.theme)).toBe(true);
    for (const t of THEMES) expect(ACHIEVEMENTS.some((a) => a.theme === t.id)).toBe(true);
  });

  it('only ever awards ids that exist', () => {
    const known = new Set(ACHIEVEMENTS.map((a) => a.id));
    for (let seed = 1; seed <= 12; seed++) {
      const g = game(2 + (seed % 3), seed);
      for (const id of evaluate(g, 0, ctx({ stats: { played: 300, totalSold: 5000 } })).got) expect(known.has(id)).toBe(true);
    }
  });

  it('does nothing for a game that is not finished', () => {
    const g = game();
    g.phase = 'buy';
    expect(evaluate(g, 0, ctx()).got).toEqual([]);
  });

  it('skips what is already earned', () => {
    const g = game();
    const first = evaluate(g, 0, ctx()).got;
    expect(first).toContain('first_sale');
    expect(evaluate(g, 0, ctx({ have: new Set(first) })).got).toEqual([]);
  });
});

describe('nerve and orders', () => {
  const base = () => game();

  it('rewards a price exactly $1 under, a tied price, and a $12 sale', () => {
    const g = base();
    g.history = [day(1, [
      line(1, 'John', 2, [{ player: 0, price: 5, sold: 2 }, { player: 1, price: 6, sold: 0 }]),
      line(2, 'Ravi', 2, [{ player: 0, price: 7, sold: 1 }, { player: 1, price: 7, sold: 1 }]),
      line(3, 'Grace', 1, [{ player: 0, price: 12, sold: 1 }], 14),
    ])];
    const got = evaluate(g, 0, ctx()).got;
    expect(got).toEqual(expect.arrayContaining(['penny_under', 'tie_breaker', 'sky_high']));
  });

  it('does not reward a $2 gap, or a tied price that the other stall could not fill', () => {
    const g = base();
    g.history = [day(1, [
      line(1, 'John', 2, [{ player: 0, price: 5, sold: 2 }, { player: 1, price: 7, sold: 0 }]),
      line(2, 'Ravi', 2, [{ player: 0, price: 7, sold: 2 }, { player: 1, price: 7, sold: 0, qty: 0, tooOld: true }]),
    ])];
    const got = evaluate(g, 0, ctx()).got;
    expect(got).not.toContain('penny_under');
    expect(got).not.toContain('tie_breaker');
  });

  it('counts whole orders served alone', () => {
    const g = base();
    g.history = [
      day(1, [line(1, 'John', 2, [{ player: 0, price: 5, sold: 2 }]), line(2, 'Ravi', 2, [{ player: 0, price: 5, sold: 2 }]), line(3, 'Grace', 2, [{ player: 0, price: 5, sold: 1 }, { player: 1, price: 6, sold: 1 }])]),
      day(2, [line(4, 'Siti', 1, [{ player: 0, price: 5, sold: 1 }]), line(5, 'Kumar', 3, [{ player: 0, price: 5, sold: 3 }]), line(6, 'Lina', 1, [{ player: 0, price: 5, sold: 1 }])]),
    ];
    expect(evaluate(g, 0, ctx()).got).toContain('sole_five');
    g.history = [day(1, [line(1, 'John', 2, [{ player: 0, price: 5, sold: 2 }]), line(3, 'Grace', 2, [{ player: 0, price: 5, sold: 1 }, { player: 1, price: 6, sold: 1 }])])];
    expect(evaluate(g, 0, ctx()).got).not.toContain('sole_five');
  });

  it('notices a customer who came back, and six customers in a day', () => {
    const g = base();
    g.history = [
      day(1, [line(1, 'John', 3, [{ player: 1, price: 5, sold: 1 }])]),
      day(2, [line(1, 'John', 2, [{ player: 0, price: 5, sold: 2 }]), ...[2, 3, 4, 5, 6].map((i) => line(i, `C${i}`, 1, [{ player: 0, price: 5, sold: 1 }]))]),
    ];
    const got = evaluate(g, 0, ctx()).got;
    expect(got).toContain('worth_wait');
    expect(got).toContain('full_house');
  });
});

describe('sets that build up', () => {
  it('collects customers, guests, events and modes, and awards the set achievements', () => {
    const g = game();
    g.history = [
      day(1, [line(1, 'Hotel Chef', 1, [{ player: 0, price: 5, sold: 1 }]), line(2, 'Influencer', 1, [{ player: 0, price: 5, sold: 1 }]), line(3, 'Gym Club', 1, [{ player: 0, price: 5, sold: 1 }]), line(4, 'John', 1, [{ player: 1, price: 5, sold: 1 }])], 'festival', [45, 0]),
    ];
    const r = evaluate(g, 0, ctx({ sets: { modes: ['daily', 'league', 'online'] } }));
    expect(r.sets.guests.sort()).toEqual(['Gym Club', 'Hotel Chef', 'Influencer']);
    expect(r.sets.customers ?? []).toEqual([]);
    expect(r.sets.events).toEqual(['festival']);
    expect(r.sets.modes).toContain('new');
    expect(r.got).toEqual(expect.arrayContaining(['red_carpet', 'festival_rush', 'big_day', 'explorer']));
  });

  it('counts milestones from the running totals', () => {
    const g = game();
    const got = evaluate(g, 0, ctx({ stats: { played: 55, totalSold: 620 } })).got;
    expect(got).toEqual(expect.arrayContaining(['sold_100', 'sold_500', 'played_10', 'played_50']));
    expect(got).not.toContain('sold_2000');
    expect(got).not.toContain('played_200');
  });

  it('shows progress towards a goal', () => {
    const a = ACHIEVEMENTS.find((x) => x.id === 'shop_6')!;
    expect(progressOf(a, { wonWith: ['haggler', 'basket'] }, { played: 0, totalSold: 0 })).toBe(2);
    const m = ACHIEVEMENTS.find((x) => x.id === 'sold_500')!;
    expect(progressOf(m, {}, { played: 0, totalSold: 900 })).toBe(500);
  });
});
