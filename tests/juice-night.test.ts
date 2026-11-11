import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import { aiStep, autoplay } from '../src/engine/ai';
import { EVENT_CARDS, JUICE_CAP, JUICE_VALUE, type FruitId, type UpgradeId } from '../src/engine/data';
import {
  activePlayer, applyAction, beginBuying, emptyStock, finishReveal, leavingTonight, newGame, nightOutlook,
  type GameState, type Level,
} from '../src/engine/game';
import { dayHighlights, heatwaveLine, overnightJuice, overnightLines, overnightLoss, tonightLine, tonightText } from '../src/engine/story';
import { evaluate, type Context } from '../src/ui/achievements';
import { spoilsTonight } from '../src/ui/boardModel';
import { toStaticHtml } from '../src/ui/cards';
import { SalesSummary } from '../src/ui/game/panels/SalesSummary';
import { EveningPanel } from '../src/ui/panel';

// Tonight's forecast (REP-089 3.4): the warnings follow the night's own rules. A Heatwave
// ages fruit one more step (rules 13 removed the Cold Room), and a Juice Bar turns up to 3 of the pieces leaving the shelf into $2
// of juice. The forecast comes from the same code as the night (nightOutlook / ageShop in game.ts), and the morning,
// the results and the "Juice Bar Regular" achievement count the juice money.

const HEATWAVE = EVENT_CARDS.find((e) => e.id === 'heatwave')!;
const TIRED = 0; // last day on the shelf
const OKAY_BLUEBERRY = 1; // tired tomorrow; leaves tonight in a Heatwave

/**
 * Day `day` at the sales card (reveal), 2 people, nobody bought or sold, no events. Your shelf (player 0) holds
 * `blueberries` (pieces per slot) and these upgrades; `heat` makes today a Heatwave.
 */
function salesCard(day: number, blueberries: number[], upgrades: UpgradeId[] = [], heat = false): GameState {
  let s = beginBuying(newGame({
    players: [{ name: 'You', kind: 'human', avatar: '🧑‍🍳' }, { name: 'Rosa', kind: 'human', avatar: '🦊' }],
    days: 10, unripe: true, upgrades: true, events: false, seed: 5,
  }));
  while (s.phase === 'buy') s = applyAction(s, activePlayer(s), { kind: 'endBuy' });
  while (s.phase === 'stall') s = applyAction(s, activePlayer(s), { kind: 'stall', stall: {} });
  while (s.phase === 'bid') s = applyAction(s, activePlayer(s), { kind: 'prices', posts: [] });
  expect(s.phase).toBe('reveal');
  s = structuredClone(s);
  s.day = day;
  s.event = heat ? HEATWAVE : null;
  for (const pl of s.players) { pl.stock = emptyStock(true); pl.upgrades = []; }
  blueberries.forEach((n, pos) => { s.players[0].stock.blueberry[pos] = n; });
  s.players[0].upgrades = upgrades;
  return s;
}

/** Plays the rest of the day and the night: every stall closes up for the evening without doing anything. */
function playNight(s: GameState): GameState {
  s = finishReveal(s);
  while (s.phase === 'evening') s = applyAction(s, activePlayer(s), { kind: 'endEvening' });
  return s;
}

/** The forecast, checked against what the night really does to your shelf. */
function forecastAndNight(s: GameState) {
  const o = nightOutlook(s, 0);
  const next = playNight(s);
  expect(next.day).toBe(s.day + 1);
  const [a, b] = [s.players[0], next.players[0]];
  expect({ spoil: b.stats.spoiled - a.stats.spoiled, juice: (b.stats.juiced ?? 0) - (a.stats.juiced ?? 0) }).toEqual(o);
  expect(b.cash - a.cash).toBe(o.juice * JUICE_VALUE);
  return { o, next };
}

describe('nightOutlook: tonight by the night\'s own rules', () => {
  it('a Juice Bar juices 2 last-day pieces (rules 11) and lets the rest spoil', () => {
    expect(JUICE_CAP).toBe(2);
    expect(forecastAndNight(salesCard(4, [2], ['juicebar'])).o).toEqual({ spoil: 0, juice: 2 });
    expect(forecastAndNight(salesCard(4, [5], ['juicebar'])).o).toEqual({ spoil: 3, juice: JUICE_CAP });
    expect(forecastAndNight(salesCard(4, [5])).o).toEqual({ spoil: 5, juice: 0 });
  });

  it('a Heatwave counts the okay pieces that leave a step early', () => {
    const shelf = [0, 3]; // 3 okay blueberries
    expect(shelf[OKAY_BLUEBERRY]).toBe(3);
    expect(forecastAndNight(salesCard(4, shelf, [], true)).o).toEqual({ spoil: 3, juice: 0 });
    expect(forecastAndNight(salesCard(4, shelf, ['juicebar'], true)).o).toEqual({ spoil: 1, juice: 2 });
    expect(forecastAndNight(salesCard(4, shelf)).o).toEqual({ spoil: 0, juice: 0 });
  });

  it('counts each fruit that leaves the shelf, and nothing on the final day (no night follows)', () => {
    const s = salesCard(4, [2, 1], [], true);
    s.players[0].stock.apple[TIRED] = 1;
    const leaving: Record<FruitId, number> = { blueberry: 3, watermelon: 0, apple: 1, mango: 0 };
    expect(leavingTonight(s, 0)).toEqual(leaving);
    expect(s.players[0].stock.blueberry.slice(0, 2)).toEqual([2, 1]); // the forecast never changes the shelf
    const last = salesCard(10, [3], ['juicebar']);
    expect(nightOutlook(last, 0)).toEqual({ spoil: 0, juice: 0 });
    expect(tonightLine(last, 0)).toBeNull();
  });

  it('agrees with every night of many seeded computer games (Heatwave, Juice Bar and its cap)', () => {
    const seen = { juice: 0, capped: 0, heat: 0, topUp: 0 };
    const levels: Level[] = ['normal', 'hard', 'normal', 'hard'];
    for (let seed = 1; seed <= 30; seed++) {
      let s = newGame({
        players: levels.slice(0, 3 + (seed % 2)).map((level, i) => ({ name: `A${i}`, kind: 'ai' as const, level, avatar: '' })),
        days: 10, unripe: true, upgrades: true, events: true, seed,
      });
      while (s.phase !== 'over') {
        const next = s.phase === 'morning' ? beginBuying(s) : s.phase === 'reveal' ? finishReveal(s) : aiStep(s)!;
        if (next.day !== s.day) {
          s.players.forEach((pl, p) => {
            const o = nightOutlook(s, p);
            const after = next.players[p];
            expect({ spoil: after.stats.spoiled - pl.stats.spoiled, juice: (after.stats.juiced ?? 0) - (pl.stats.juiced ?? 0) }).toEqual(o);
            // The only other overnight cash changes come at dawn: a Health Inspector's fine, then (rules 18) the
            // market's top-up for a stall with an empty shelf and less than $5.
            expect(after.cash - pl.cash).toBe(o.juice * JUICE_VALUE - (next.dayFines?.[p] ?? 0) + (next.dayTopUps?.[p] ?? 0));
            if (next.dayTopUps?.[p]) seen.topUp++;
            expect(overnightJuice(s, next, p)).toEqual({ pieces: o.juice, dollars: o.juice * JUICE_VALUE });
            expect(overnightLoss(s, next, p)).toBe(o.spoil);
            if (o.juice) seen.juice++;
            if (o.juice && o.spoil) seen.capped++;
            if (s.event?.ageExtra && Object.values(pl.stock).some((t) => t[1] > 0)) seen.heat++;
          });
        }
        s = next;
      }
    }
    // The sweep really covers each rule (counts from 30 seeds: about 70, 6, 44 and 4). A top-up is rare and need not
    // turn up in these seeds; tests/rules18.test.ts builds one by hand.
    for (const n of [seen.juice, seen.capped, seen.heat]) expect(n).toBeGreaterThan(0);
  }, 120_000);
});

describe('tonight in words', () => {
  it('says how many spoil and how many become juice, with the money', () => {
    expect(tonightText({ spoil: 0, juice: 0 })).toBeNull();
    expect(tonightText({ spoil: 3, juice: 0 })).toBe('3 fruit spoil tonight');
    expect(tonightText({ spoil: 1, juice: 0 })).toBe('1 fruit spoils tonight');
    expect(tonightText({ spoil: 0, juice: 3 })).toBe('3 fruit become juice tonight (+$6)');
    expect(tonightText({ spoil: 0, juice: 1 })).toBe('1 fruit becomes juice tonight (+$2)');
    expect(tonightText({ spoil: 2, juice: 3 })).toBe('2 spoil tonight, 3 become juice (+$6)');
    expect(tonightLine(salesCard(4, [5], ['juicebar']), 0)).toBe('3 spoil tonight, 2 become juice (+$4)');
  });

  it('the Evening panel\'s Heatwave warning, on every stall (rules 13: no Cold Room)', () => {
    expect(HEATWAVE.ageExtra).toBe(1);
    for (const day of [4, 5]) {
      const hot = salesCard(day, [0, 3], [], true);
      expect(heatwaveLine(hot, 0)).toBe('Heatwave: everything ages twice tonight.');
      // The night agrees: the okay blueberries leave a step early.
      expect(forecastAndNight(hot).o.spoil).toBe(3);
    }
    expect(heatwaveLine(salesCard(4, [0, 3]), 0)).toBeNull(); // no Heatwave today
    expect(heatwaveLine(salesCard(10, [0, 3], [], true), 0)).toBeNull(); // the final day: no night follows
  });

  it('day highlight: no spoil warning for juice; Heatwave counted', () => {
    const texts = (s: GameState) => dayHighlights(s, 0).map((x) => x.text);
    expect(texts(salesCard(4, [2], ['juicebar'])).join(' ')).not.toMatch(/spoil/);
    expect(texts(salesCard(4, [5], ['juicebar']))).toContain('3 of your fruit will spoil tonight; 2 become juice (+$4).');
    expect(texts(salesCard(4, [0, 3], [], true))).toContain('3 of your fruit will spoil tonight.');
    expect(texts(salesCard(4, [3]))).toContain('3 of your fruit will spoil tonight.');
  });

  it('the sales card shows juice as juice, and the spoil count after the Juice Bar\'s share', () => {
    const juice = salesCard(4, [2], ['juicebar']);
    expect(spoilsTonight(juice, 0)).toBe(0);
    const html = toStaticHtml(h(SalesSummary, { s: juice, viewer: 0 }));
    expect(html).toContain('2 fruit become juice tonight (+$4)');
    expect(html).not.toMatch(/spoil/);
    expect(html).toContain('class="sc-juice">2 fruit become juice tonight (+$4)');
    const both = toStaticHtml(h(SalesSummary, { s: salesCard(4, [5], ['juicebar']), viewer: 0 }));
    expect(both).toContain('class="sc-waste">3 spoil tonight, 2 become juice (+$4)');
    expect(spoilsTonight(salesCard(4, [0, 3], [], true), 0)).toBe(3);
  });

  it('the Evening panel forecasts the real night: juice money, and the Heatwave warning', () => {
    // the panel shows after the sales card, before the night, on the same shelf (no evening comes on most nights)
    const evening = (s: GameState) => toStaticHtml(h(EveningPanel, { s: { ...s, phase: 'evening' }, p: 0, onUpgrade: () => undefined, onCard: () => undefined }));
    // juice money alone is good news (a green card); spoiling fruit keeps the warning
    expect(evening(salesCard(4, [2], ['juicebar']))).toContain('class="info-card good"><div>2 fruit become juice tonight (+$4)</div>');
    const hot = evening(salesCard(4, [0, 3], [], true));
    expect(hot).toContain('class="info-card warn"><div>3 fruit spoil tonight</div>');
    expect(hot).toContain('Heatwave: everything ages twice tonight.');
    // the old forecast counted only the last-day slot and warned every stall about the Heatwave
  });

  it('the morning card says what the Juice Bar made overnight', () => {
    const s = salesCard(4, [5], ['juicebar']);
    const next = playNight(s);
    const juice = overnightJuice(s, next, 0);
    expect(juice).toEqual({ pieces: 2, dollars: 4 });
    expect(next.players[0].cash - s.players[0].cash).toBe(juice.dollars);
    expect(overnightLines(overnightLoss(s, next, 0), juice)).toEqual([
      { tone: 'bad', text: '3 of your fruit spoiled overnight.' },
      { tone: 'good', text: 'Your Juice Bar made $4 from 2 fruit overnight.' },
    ]);
    const only = salesCard(4, [2], ['juicebar']);
    const after = playNight(only);
    expect(overnightLoss(only, after, 0)).toBe(0);
    expect(overnightLines(0, overnightJuice(only, after, 0)).map((x) => x.text)).toEqual(['Your Juice Bar made $4 from 2 fruit overnight.']);
    expect(overnightLines(0)).toEqual([]);
  });
});

describe('Juice Bar Regular counts the juice money', () => {
  const ctx: Context = { online: false, have: new Set(), sets: {}, stats: { played: 1, totalSold: 10 }, streak: 0 };
  /** A finished game in which you earned no sale tips at all. */
  function finished(): GameState {
    const g = autoplay(newGame({
      players: [0, 1].map((i) => ({ name: `A${i}`, kind: 'ai' as const, level: 'normal' as const, avatar: '' })),
      days: 8, unripe: true, upgrades: true, events: true, seed: 4,
    }));
    for (const d of g.history ?? []) for (const l of d.lines) for (const o of l.offers) delete o.juice;
    return g;
  }

  it('awards it for $20 of overnight juice with nothing sold, and not for $18', () => {
    const g = finished();
    g.players[0].stats.juiced = 10;
    expect(evaluate(g, 0, ctx).got).toContain('juice_regular');
    g.players[0].stats.juiced = 9;
    expect(evaluate(g, 0, ctx).got).not.toContain('juice_regular');
    delete g.players[0].stats.juiced; // a game saved before the counter existed
    expect(evaluate(g, 0, ctx).got).not.toContain('juice_regular');
  });
});
