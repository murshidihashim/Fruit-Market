import { describe, expect, it } from 'vitest';
import { aiStep } from '../src/engine/ai';
import { dailyConfig, dailyTwist } from '../src/engine/daily';
import { FRUIT, RIVALS, UPGRADES, type UpgradeId } from '../src/engine/data';
import { beginBuying, buyCost, buyUpgrade, canUpgrade, finishReveal, marketCost, newGame, walkInsOn, type GameState } from '../src/engine/game';

const base = (): GameState => newGame({ players: [{ name: 'A', kind: 'human', avatar: '' }, { name: 'B', kind: 'ai', level: 'easy', avatar: '' }], days: 10, unripe: true, upgrades: true, events: false, seed: 5 });

describe('rules version 7', () => {
  it('lets a stall build one upgrade after each Market Day, not several', () => {
    const s = base();
    s.day = 3; s.phase = 'evening'; s.order = [0, 1]; s.turn = 0;
    s.players[0].cash = 100;
    s.players[0].upgradeOffer = Object.keys(UPGRADES) as UpgradeId[];
    expect(canUpgrade(s, 0, 'barrow')).toBeNull();
    const after = buyUpgrade(s, 0, 'barrow');
    expect(after.players[0].upgrades).toEqual(['barrow']);
    expect(canUpgrade(after, 0, 'premium')).not.toBeNull();
  });

  it('charges a Big Basket the normal price for the extra piece (rules 11; rules 7 to 10 charged $2 more)', () => {
    const s = base();
    s.phase = 'buy';
    const pl = s.players[0];
    pl.trait = 'basket';
    const plain = marketCost(s, 'blueberry', 2);
    for (const bought of [3, 4]) {
      pl.boughtToday = bought;
      expect(buyCost(s, 0, 'blueberry', 2)).toBe(plain);
    }
    pl.upgrades.push('barrow');
    pl.boughtToday = 5;
    expect(buyCost(s, 0, 'blueberry', 2)).toBe(plain);
  });

  it('prices a mango at $5 fresh and $4 green', () => {
    expect(FRUIT.mango.cost.fresh).toBe(5);
    expect(FRUIT.mango.cost.unripe).toBe(4);
  });
});

describe('rules version 8', () => {
  const avatarOf = (name: string) => RIVALS.find((r) => r.name === name)!.avatar;
  const play = (seed: number, first: string, onState: (s: GameState) => void) => {
    let s = newGame({
      players: [{ name: 'P0', kind: 'ai', level: 'normal', avatar: avatarOf(first) }, { name: 'P1', kind: 'ai', level: 'hard', avatar: '' }, { name: 'P2', kind: 'ai', level: 'normal', avatar: '' }],
      days: 10, unripe: true, upgrades: true, events: true, seed,
    });
    for (let guard = 0; s.phase !== 'over' && guard < 5000; guard++) {
      onState(s);
      if (s.phase === 'morning') s = beginBuying(s);
      else if (s.phase === 'reveal') s = finishReveal(s);
      else s = aiStep(s)!;
    }
  };

  it('no longer pays a Haggler $1 more on the first sale of each day (rules 11)', () => {
    let checked = 0;
    for (let seed = 1; seed <= 12; seed++) {
      play(seed, 'Rosa', (s) => {
        if (s.phase !== 'reveal' || !s.results) return;
        const lines = s.results.lines.flatMap((l) => l.offers.filter((o) => o.player === 0));
        const sold = lines.reduce((a, o) => a + o.sold, 0);
        const lineCash = lines.reduce((a, o) => a + o.sold * o.price + (o.juice ?? 0), 0);
        const extras = [...(s.results.hawker ?? []), ...(s.results.earful ?? [])].filter((x) => x.player === 0).reduce((a, x) => a + ('price' in x ? x.price : x.tip), 0);
        expect(s.results.income[0]).toBe(lineCash + extras);
        if (sold > 0) checked++;
      });
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('lets the Nest Egg shopkeeper buy first on day 3', () => {
    for (let seed = 1; seed <= 6; seed++) {
      let seen = false;
      play(seed, 'Saleh', (s) => {
        if (s.day === 3 && s.phase === 'morning' && !seen) { seen = true; expect(s.order[0]).toBe(0); }
      });
      expect(seen).toBe(true);
    }
  });

  it('gives two stalls one walk-in a day', () => {
    expect(walkInsOn(base(), 2, null)).toBe(1);
  });

  it('rotates the daily twist through the week', () => {
    const titles = new Set(Array.from({ length: 7 }, (_, k) => dailyTwist(`2026-11-${String(k + 1).padStart(2, '0')}`).title));
    expect(titles.size).toBe(7);
    expect(dailyTwist('2026-11-05')).toEqual(dailyTwist('2026-11-05'));
    const quick = Array.from({ length: 7 }, (_, k) => `2026-11-${String(k + 1).padStart(2, '0')}`).find((d) => dailyTwist(d).title === 'Quick day')!;
    expect(dailyConfig(quick, 'Me').days).toBe(8);
  });
});
