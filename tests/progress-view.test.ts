// PLAN-113, the progress screens: the best sale on the results, the look shown with "Wear it", the Market League's
// words, and what a game against computers really pays in stamps.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'preact';
import { autoplay } from '../src/engine/ai';
import { RIVALS } from '../src/engine/data';
import { newGame, type GameState } from '../src/engine/game';
import { LOOKS, lookById } from '../src/net/looks';
import { toStaticHtml } from '../src/ui/cards';
import { LeagueScreen } from '../src/ui/League';
import { LEAGUE, finishGame, saveLeagueStage } from '../src/ui/progress';
import { bestSale, bestSaleDay, bestSaleWords, pieces, shownLook, stageGoal, stageLine, stageRivals } from '../src/ui/progressView';
import { gameStamps } from '../src/ui/stamps';

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
});

/** A finished game against computers; seat 0 is then the person (the computer played it for them). */
function solo(seed: number, stalls = 4, days = 10): GameState {
  const players = Array.from({ length: stalls }, (_, i) => ({ name: i ? RIVALS[i].name : 'You', kind: 'ai' as const, level: 'normal' as const, avatar: RIVALS[i].avatar }));
  const s = autoplay(newGame({ players, days, unripe: true, upgrades: true, events: true, seed }));
  s.players[0].kind = 'human';
  return s;
}

describe('the best sale (from the game history)', () => {
  it('is the one line that brought the player the most money, with the customer\'s whole card that day', () => {
    for (const seed of [3, 11, 27]) {
      const s = solo(seed);
      const b = bestSale(s, 0)!;
      expect(b).not.toBeNull();
      // nothing in the history beats it
      let most = 0;
      for (const d of s.history ?? []) for (const l of d.lines) {
        const o = l.offers.find((x) => x.player === 0);
        if (o && o.sold > 0) most = Math.max(most, o.sold * o.price);
      }
      expect(b.total).toBe(most);
      expect(b.total).toBe(b.sold * b.price);
      // the card is that customer's, that day: every fruit they wanted, the one sold among them
      const day = s.history!.find((d) => d.day === b.day)!;
      const lines = day.lines.filter((l) => l.name === b.who);
      expect(b.wants.map((w) => w.fruit).sort()).toEqual(lines.map((l) => l.fruit).sort());
      expect(b.wants.some((w) => w.fruit === b.fruit)).toBe(true);
      expect(bestSaleWords(b)).toBe(`${b.name} bought ${pieces(b.sold, b.fruit)} from you at $${b.price}: +$${b.total}, your biggest sale.`);
      expect(bestSaleDay(b)).toMatch(new RegExp(`^Day ${b.day}( · .+)?$`));
      expect(bestSaleWords(b)).not.toContain('!');
    }
  });

  it('reads as the mock-up did, from the game\'s own names and numbers', () => {
    const b = { day: 6, event: 'Mango Windfall', who: 'x', name: 'Miss Cha-Cha', kind: 'customer' as const, fruit: 'mango' as const, sold: 2, price: 9, total: 18, wants: [] };
    expect(bestSaleWords(b)).toBe('Miss Cha-Cha bought 2 mangoes from you at $9: +$18, your biggest sale.');
    expect(bestSaleDay(b)).toBe('Day 6 · Mango Windfall');
    expect(bestSaleDay({ ...b, event: undefined })).toBe('Day 6');
    expect(pieces(1, 'blueberry')).toBe('1 blueberry');
  });

  it('is nothing for a player who sold nothing', () => {
    const s = solo(5);
    const none: GameState = { ...s, history: (s.history ?? []).map((d) => ({ ...d, lines: d.lines.map((l) => ({ ...l, offers: l.offers.filter((o) => o.player !== 0) })) })) };
    expect(bestSale(none, 0)).toBeNull();
  });
});

describe('the reward shown with "Wear it"', () => {
  it('prefers what others see on the stall, then what the shopkeeper wears, then the signboard, then a sound', () => {
    const pick = (...ids: string[]) => shownLook(ids.map((id) => lookById(id)!))?.id;
    expect(pick('bell_bicycle', 'title_rank2', 'straw_boater', 'roof_stripes')).toBe('roof_stripes');
    expect(pick('bell_bicycle', 'title_rank2', 'straw_boater')).toBe('straw_boater');
    expect(pick('bell_bicycle', 'tag_chalk')).toBe('tag_chalk');
    expect(pick()).toBeUndefined();
    expect(LOOKS.length).toBeGreaterThan(10);
  });
});

describe('a game against computers pays stamps', () => {
  it('a first 10-day game earns 3 stamps for its days, plus its win and tiers: never +0', () => {
    const s = solo(9);
    const sum = finishGame(s, 0)!;
    expect(sum.lines[0]).toEqual({ stamps: gameStamps(10), text: '10 days played' });
    expect(gameStamps(10)).toBe(3);
    expect(sum.earned).toBeGreaterThanOrEqual(3);
    expect(sum.earned).toBe(sum.lines.reduce((a, l) => a + l.stamps, 0));
  });
  it('a Quick game earns 2 and a Long one 4', () => {
    expect(finishGame(solo(9, 2, 8), 0)!.lines[0].stamps).toBe(2);
    expect(finishGame(solo(9, 2, 14), 0)!.lines[0].stamps).toBe(4);
  });
});

describe('the Market League screen', () => {
  it('says each stage\'s real rivals, levels and length', () => {
    expect(stageGoal(LEAGUE[0])).toBe(`Beat ${RIVALS[LEAGUE[0].rivals[0].idx].name} over 8 days to move up`);
    expect(stageLine(LEAGUE[0])).toBe('Easy · 8 days');
    expect(stageLine(LEAGUE[5])).toBe('Hard and Normal · 10 days');
    expect(stageGoal(LEAGUE[3])).toMatch(/^Beat \S+( \S+)? and \S+ over 10 days to move up$/);
    for (const st of LEAGUE) expect(stageRivals(st).map((r) => r.name)).toEqual(st.rivals.map((r) => RIVALS[r.idx % RIVALS.length].name));
  });

  it('opens on the stage the player is on, with its Play button, and lists all six', () => {
    saveLeagueStage(2);
    const html = toStaticHtml(h(LeagueScreen, { onBack: () => {}, onPlay: () => {} }));
    expect(html).toContain(`Stage 3 of ${LEAGUE.length}`);
    expect(html).toContain('Play stage 3');
    for (const st of LEAGUE) expect(html).toContain(st.title);
    expect((html.match(/class="jp-lg done"/g) ?? []).length).toBe(2);
    expect(html).not.toContain('!');
  });

  it('after the last stage, offers the Royal Market again', () => {
    saveLeagueStage(LEAGUE.length);
    const html = toStaticHtml(h(LeagueScreen, { onBack: () => {}, onPlay: () => {} }));
    expect(html).toContain(`All ${LEAGUE.length} stages cleared`);
    expect(html).toContain(`Replay stage ${LEAGUE.length}`);
  });
});
