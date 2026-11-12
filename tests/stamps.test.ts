import { describe, expect, it } from 'vitest';
import { CUSTOMER_CARDS } from '../src/engine/data';
import { ACHIEVEMENTS, CARDS, tierById, type Facts, type Snapshot } from '../src/ui/achievements';
import {
  BOOK_STAMPS, DAILY_STAMPS, MAX_LEVEL, RANKS, REWARDS, TIER_STAMPS, WIN_STAMPS, cardSize, closeLines, earnLines, gameStamps, goals, nextReward, placeAt, progressWords,
  rankOf, rewardBuilt, stampsOf, stampsToReach, tierStamps,
} from '../src/ui/stamps';
import { bestStreak, currentStreak } from '../src/ui/streak';
import { LOOKS, RANK_LEVELS, lookById } from '../src/net/looks';

// PLAN-086, DEC-099 (progression study, review-18, C2 to C4 and E): stamps, the stall level, the six ranks, the
// rewards, and the streak that forgives one missed day.

const snap = (over: Partial<Snapshot> = {}): Snapshot => ({ have: new Set(), sets: {}, counts: {}, stats: { played: 0, totalSold: 0, wins: 0 }, daily: {}, league: 0, ...over });

describe('what earns stamps (C2)', () => {
  it('a finished game pays 1 for every 3 days: Quick 2, Standard 3, Long 4', () => {
    expect([8, 10, 14].map(gameStamps)).toEqual([2, 3, 4]);
  });
  it('a win pays 1 more, the Daily market 2 more, a tier 2, 5 or 10', () => {
    expect([WIN_STAMPS, DAILY_STAMPS]).toEqual([1, 2]);
    expect(TIER_STAMPS).toEqual({ bronze: 2, silver: 5, gold: 10 });
    expect(tierStamps('first_sale')).toBe(2);
    expect(tierStamps('no_waste')).toBe(5);
    expect(tierStamps('hard_sweep')).toBe(10);
    expect(tierStamps('not_a_trophy')).toBe(0);
  });
  it('the first version of the catalogue holds 579 stamps in its 109 tiers', () => {
    const by = { bronze: 0, silver: 0, gold: 0 };
    for (const a of ACHIEVEMENTS) by[a.tier]++;
    expect(by).toEqual({ bronze: 37, silver: 43, gold: 29 });
    expect(ACHIEVEMENTS.reduce((a, t) => a + tierStamps(t.id), 0)).toBe(579);
  });
  it('adds up a stall\'s stamps from what is stored: games by length, wins, Daily market dates, tiers', () => {
    const s = snap({
      stats: { played: 5, totalSold: 0, wins: 2 }, counts: { g8: 1, g10: 3, g14: 1 },
      daily: { '2026-11-10': 60, '2026-11-11': 71 }, have: new Set(['no_waste', 'hard_sweep', 'tie_breaker']),
    });
    // tiers: first_win is reached by the two wins as well (Bronze, 2)
    expect(stampsOf(s)).toEqual({ games: 2 + 9 + 4, wins: 2, daily: 4, tiers: 5 + 10 + 2 + 2, total: 15 + 2 + 4 + 19 });
  });
  it('a game finished before lengths were counted is taken as a Standard game', () => {
    expect(stampsOf(snap({ stats: { played: 12, totalSold: 0, wins: 0 }, counts: { g8: 2 } })).games).toBe(2 * 2 + 10 * 3);
    // never fewer than the counted ones, even if the total was lost on another phone
    expect(stampsOf(snap({ stats: { played: 1, totalSold: 0, wins: 0 }, counts: { g14: 3 } })).games).toBe(12);
  });
});

describe('six ranks, thirty cards (C3)', () => {
  it('the ranks, their levels and the stamps on a card', () => {
    expect(RANKS.map((r) => [r.name, r.from, r.to, r.card])).toEqual([
      ['Roadside Table', 1, 5, 15], ['Five-Foot Way', 6, 10, 25], ['Covered Stall', 11, 15, 40], ['Corner Lot', 16, 20, 60], ['Shophouse', 21, 25, 80], ['Towkay', 26, 30, 100],
    ]);
    expect(MAX_LEVEL).toBe(30);
    expect(BOOK_STAMPS).toBe(1600);
    for (let l = 1; l <= 30; l++) expect(cardSize(l)).toBe(rankOf(l).card);
    expect([1, 6, 11, 16, 21, 26, 30].map(stampsToReach)).toEqual([0, 75, 200, 400, 700, 1100, 1500]);
  });

  it('a full card raises the level by one; the level never passes 30', () => {
    expect(placeAt(0)).toMatchObject({ level: 1, size: 15, filled: 0, toNext: 15, full: false });
    expect(placeAt(14)).toMatchObject({ level: 1, filled: 14, toNext: 1 });
    expect(placeAt(15)).toMatchObject({ level: 2, filled: 0, toNext: 15 });
    expect(placeAt(75)).toMatchObject({ level: 6, rankNo: 2, size: 25, filled: 0 });
    expect(placeAt(146)).toMatchObject({ level: 8, size: 25, filled: 21, toNext: 4 });
    expect(placeAt(146).rank.name).toBe('Five-Foot Way');
    expect(placeAt(1499)).toMatchObject({ level: 29, toNext: 1 });
    expect(placeAt(1500)).toMatchObject({ level: 30, size: 100, filled: 0, full: false });
    expect(placeAt(1599)).toMatchObject({ level: 30, filled: 99, toNext: 1, full: false });
    expect(placeAt(1600)).toMatchObject({ level: 30, filled: 100, toNext: 0, full: true });
    expect(placeAt(5000)).toMatchObject({ level: 30, filled: 100, full: true });
    expect(placeAt(-3).level).toBe(1);
  });

  it('the study\'s sample histories land on the levels it gives (C4)', () => {
    // stamps for the average and the strong stand-in, and the level the table shows
    const table: [number, number][] = [[29, 2], [58, 4], [100, 7], [155, 9], [185, 10], [230, 11], [315, 13], [365, 15], [510, 17], [565, 18], [800, 22], [915, 23], [1560, 30]];
    for (const [stamps, level] of table) expect(placeAt(stamps).level, `${stamps} stamps`).toBe(level);
    expect(placeAt(1660).full).toBe(true);
  });

  it('a sample history counted from stored numbers: ten Standard games, three wins, four Daily markets, six tiers', () => {
    const s = snap({
      stats: { played: 10, totalSold: 240, wins: 3 }, counts: { g10: 10, fruit_apple: 60 },
      daily: { '2026-11-01': 1, '2026-11-02': 1, '2026-11-03': 1, '2026-11-05': 1 },
      have: new Set(['tie_breaker', 'penny_under', 'full_price', 'no_waste']),
    });
    // 30 for the games, 3 for the wins, 8 for the Daily markets; tiers: the four held (2 + 2 + 2 + 5), first sale, first
    // win, 10 games, 100 sold, 30 apples, 3 Daily markets and 3 days running (2 each)
    const st = stampsOf(s);
    expect(st).toMatchObject({ games: 30, wins: 3, daily: 8, tiers: 11 + 7 * 2 });
    expect(placeAt(st.total)).toMatchObject({ level: 5, filled: 6, size: 15 });
  });
});

describe('rewards (C3)', () => {
  it('one reward for each level from 2 to 30, in order', () => {
    expect(REWARDS.map((r) => r.level)).toEqual(Array.from({ length: 29 }, (_, i) => i + 2));
    expect(REWARDS.slice(0, 9).map((r) => r.text)).toEqual(['Chalk-slate price tag', 'Bicycle bell', 'Coin-jar sound', 'Star price card', 'Title and Painted-board frame',
      'Counter bell', 'Hand-written price card', 'Abacus coin sound', '"Sold out" stamp']);
  });
  it('levels 2 to 10 and every rank hand over looks that exist; the others are still to come', () => {
    const built = REWARDS.filter(rewardBuilt).map((r) => r.level);
    expect(built).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 16, 21, 26]);
    for (const r of REWARDS) for (const id of r.looks) expect(lookById(id)?.from, id).toEqual({ kind: 'level', level: r.level });
    // and every look that comes from a level above 1 is some level's reward
    const fromLevels = LOOKS.filter((l) => l.from.kind === 'level' && l.from.level > 1).map((l) => l.id).sort();
    expect(REWARDS.flatMap((r) => r.looks).sort()).toEqual(fromLevels);
    expect([...RANK_LEVELS]).toEqual(RANKS.map((r) => r.from));
  });
  it('the next reward: the stamps still needed and what the level hands over', () => {
    expect(nextReward(placeAt(146))).toMatchObject({ stamps: 4, level: 9, reward: { text: 'Abacus coin sound' } });
    expect(nextReward(placeAt(1550))).toMatchObject({ stamps: 50, level: 31 });
    expect(nextReward(placeAt(1600))).toBeNull();
  });
});

describe('the results lines (E)', () => {
  const facts = (over: Partial<Facts>): Facts => ({ days: 10, won: false } as Facts & typeof over);
  it('the days, the win, the Daily market once a day, and each tier', () => {
    const lines = earnLines({ ...facts({}), days: 10, won: true }, { daily: false, firstDaily: false, tiers: ['win_haggler_3'] });
    expect(lines).toEqual([
      { stamps: 3, text: '10 days played' }, { stamps: 1, text: 'The win' }, { stamps: 5, text: 'Silver · Rosa, 3 wins', tier: 'silver', id: 'win_haggler_3' },
    ]);
    expect(lines.reduce((a, l) => a + l.stamps, 0)).toBe(9);
    const daily = earnLines({ ...facts({}), days: 8, won: false }, { daily: true, firstDaily: true, tiers: [] });
    expect(daily).toEqual([{ stamps: 2, text: '8 days played' }, { stamps: 2, text: 'The Daily market' }]);
    // the second finish of the same day pays for the game only
    expect(earnLines({ ...facts({}), days: 8, won: false }, { daily: true, firstDaily: false, tiers: [] })).toEqual([{ stamps: 2, text: '8 days played' }]);
  });
  it('a first game that earns many tiers shows the best three and one line for the rest, and still adds up', () => {
    const tiers = ['first_sale', 'tie_breaker', 'penny_under', 'full_price', 'town_12', 'no_waste', 'hard_sweep', 'sole_1'];
    const lines = earnLines({ ...facts({}), days: 10, won: true }, { daily: false, firstDaily: false, tiers });
    expect(lines.map((l) => l.text)).toEqual(['10 days played', 'The win', 'Gold · Hard Sweep', 'Silver · Nothing Wasted', 'Bronze · First Sale', 'and 5 more trophy tiers']);
    expect(lines.reduce((a, l) => a + l.stamps, 0)).toBe(3 + 1 + tiers.reduce((a, id) => a + tierStamps(id), 0));
  });
  it('the three shown are of three different cards: a card\'s top tier stands for the ones under it', () => {
    const tiers = ['full_price', 'full_price_10', 'full_price_15', 'no_waste', 'first_sale', 'sole_1', 'sole_2'];
    const lines = earnLines({ ...facts({}), days: 10, won: false }, { daily: false, firstDaily: false, tiers });
    expect(lines.map((l) => l.text)).toEqual(['10 days played', 'Gold · Top price', 'Silver · Nothing Wasted', 'Silver · Sole Supplier', 'and 4 more trophy tiers']);
    expect(lines.reduce((a, l) => a + l.stamps, 0)).toBe(3 + tiers.reduce((a, id) => a + tierStamps(id), 0));
  });
});

describe('what is close', () => {
  it('lists every card with a tier still to earn, nearest first', () => {
    const s = snap({ stats: { played: 9, totalSold: 40, wins: 0 }, counts: { win_keeper: 2 }, have: new Set(['win_keeper_1']) });
    const all = goals(s);
    expect(all.length).toBe(CARDS.length - 1); // First Sale is done: pieces have been sold
    expect(all[0]).toMatchObject({ step: { id: 'played_10' }, value: 9, goal: 10 });
    expect(progressWords(all[0])).toBe('9 of 10 games finished');
    const pakDin = all.find((g) => g.card.id === 'keeper_keeper')!;
    expect(pakDin).toMatchObject({ step: { id: 'win_keeper_3' }, value: 2, goal: 3, stamps: 5 });
    // a new player's goals are the first steps: Bronze tiers in catalogue order, not the hardest feats
    expect(goals(snap()).slice(0, 3).map((g) => g.step.id)).toEqual(['first_sale', 'first_win', 'win_haggler_1']);
    // a card with every tier held is not a goal
    const done = snap({ have: new Set(['tie_breaker']) });
    expect(goals(done).some((g) => g.card.id === 'tie_breaker')).toBe(false);
  });
  it('two lines for the results: the nearest card, and the nearest shopkeeper to play as', () => {
    const served = ['John', 'Robert', 'Daniel'];
    const s = snap({ stats: { played: 3, totalSold: 40, wins: 2 }, counts: { win_keeper: 2 }, sets: { customers: served, wonWith: ['keeper'] }, have: new Set(['win_keeper_1']) });
    const lines = closeLines(s, (k) => `the ${k}`, [], '🦊');
    expect(lines.length).toBe(2);
    expect(lines[1]).toEqual({ title: 'Pak Din · 2 of 3 wins', sub: 'One more for Silver, +5 stamps', avatar: '🐢', name: 'Pak Din' });
    // the customer book names who is still to meet when three or fewer are left
    const nearly = snap({ sets: { customers: CUSTOMER_CARDS.slice(0, 34).map((c) => c.name) }, have: new Set(['town_12']) });
    expect(tierById('town_36')!.step.goal).toBe(CUSTOMER_CARDS.length);
    expect(closeLines(nearly, (k) => k.toUpperCase(), ['Mira', 'Hock Seng'])[0]).toEqual({ title: 'Customer book 34 of 36', sub: 'Not met: MIRA, HOCK SENG' });
  });
  it('with no shopkeeper part way, the second line is the next one round the table after the one just played', () => {
    const lines = closeLines(snap(), (k) => k, [], '🦊');
    expect(lines[lines.length - 1]).toMatchObject({ name: 'Uncle Benny', title: 'Uncle Benny · 0 of 1 wins' });
    expect(closeLines(snap(), (k) => k, [], '🦜').pop()).toMatchObject({ name: 'Rosa' });
  });
  it('the second line is never about the shopkeeper just played: that button would only be "Play again"', () => {
    const s = snap({ counts: { win_keeper: 2 }, sets: { wonWith: ['keeper'] }, have: new Set(['win_keeper_1']) });
    expect(closeLines(s, (k) => k, [], '🦊').pop()).toMatchObject({ name: 'Pak Din' });
    // Pak Din was just played: the next shopkeeper round the table, who has no win yet
    expect(closeLines(s, (k) => k, [], '🐢').pop()).toMatchObject({ name: 'Farah', title: 'Farah · 0 of 1 wins' });
  });
});

describe('the streak forgives one missed day, and only one (E)', () => {
  const days = (...d: number[]) => d.map((n) => `2026-11-${String(n).padStart(2, '0')}`);
  it('counts days played in a row', () => {
    expect(bestStreak(days(1, 2, 3))).toBe(3);
    expect(bestStreak([])).toBe(0);
    expect(bestStreak(['junk', '2026-11-01'])).toBe(1);
    expect(currentStreak(days(1, 2, 3), '2026-11-03')).toBe(3);
    expect(currentStreak(days(1, 2, 3), '2026-11-04')).toBe(3);
  });
  it('one missed day is forgiven: the streak goes on, and the missed day adds nothing', () => {
    expect(bestStreak(days(1, 2, 4, 5))).toBe(4);
    expect(currentStreak(days(1, 2, 4, 5), '2026-11-05')).toBe(4);
  });
  it('a second miss before five more played days ends it', () => {
    // 1 2 . 4 5 . 7: the second gap is not forgiven
    expect(bestStreak(days(1, 2, 4, 5, 7))).toBe(4);
    expect(currentStreak(days(1, 2, 4, 5, 7), '2026-11-07')).toBe(1);
  });
  it('after five played days since the forgiven miss, one more miss is forgiven', () => {
    // 1 2 . 4 5 6 7 8 . 10: five played days (4 to 8) since the miss, so the gap at 9 is forgiven
    expect(bestStreak(days(1, 2, 4, 5, 6, 7, 8, 10))).toBe(8);
    // only four played days (4 to 7) since the miss: the gap at 8 ends it
    expect(bestStreak(days(1, 2, 4, 5, 6, 7, 9))).toBe(6);
  });
  it('two missed days in a row always end it', () => {
    expect(bestStreak(days(1, 2, 3, 6, 7))).toBe(3);
    expect(currentStreak(days(1, 2, 3, 6, 7), '2026-11-07')).toBe(2);
  });
  it('today\'s streak is alive the day after, and two days after while the pass is in hand; never after that', () => {
    expect(currentStreak(days(1, 2, 3), '2026-11-05')).toBe(3); // yesterday was missed; playing today would carry it on
    expect(currentStreak(days(1, 2, 3), '2026-11-06')).toBe(0);
    expect(currentStreak(days(1, 2, 4), '2026-11-06')).toBe(0); // the pass was used on the 3rd
    expect(currentStreak(days(1, 2, 4), '2026-11-05')).toBe(3);
  });
  it('the best streak is kept: a break never lowers it, and the streak tiers read it', () => {
    const dates = [...days(1, 2, 3, 4, 5, 6, 7), ...days(20, 21)];
    expect(bestStreak(dates)).toBe(7);
    expect(currentStreak(dates, '2026-11-21')).toBe(2);
    const s = snap({ daily: Object.fromEntries(dates.map((d) => [d, 50])) });
    expect(stampsOf(s).tiers).toBe(tierStamps('streak3') + tierStamps('streak7') + tierStamps('daily_3'));
  });
  it('works across a month and a year end', () => {
    expect(bestStreak(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-03'])).toBe(4);
  });
});
