import { describe, expect, it } from 'vitest';
import { autoplay } from '../src/engine/ai';
import { EVENT_CARDS, FAVOUR_DECK, FAVOURS, ORDER_CARDS, RIVALS, UPGRADES } from '../src/engine/data';
import { newGame, winners, type GameState, type Level, type LineResult } from '../src/engine/game';
import {
  ACHIEVEMENTS, ALL_GUESTS, CARDS, GROUPS, TIER_COUNT, customersServed, evaluate, gameFacts, guestsServed, progressOf, standing, tierById,
  type Context, type Counts, type Sets, type Snapshot,
} from '../src/ui/achievements';

// PLAN-086 (progression study, review-18, C5 and C6): trophies are cards with tiers. Every trophy of the earlier list
// is a tier under the same code name, and the seven that rules 18 put out of reach have a task that fits the rules.

const ctx = (over: Partial<Context> = {}): Context => ({ online: false, have: new Set(), sets: {}, stats: { played: 1, totalSold: 10 }, ...over });
const snap = (over: Partial<Snapshot> = {}): Snapshot => ({ have: new Set(), sets: {}, counts: {}, stats: { played: 0, totalSold: 0, wins: 0 }, daily: {}, league: 0, ...over });

function game(players = 2, seed = 3): GameState {
  return autoplay(newGame({
    players: Array.from({ length: players }, (_, i) => ({ name: i === 0 ? 'Me' : ['Rosa', 'Benny', 'Chen'][i - 1], kind: 'ai' as const, level: 'hard' as const, avatar: '' })),
    days: 8, unripe: true, upgrades: true, events: true, seed,
  }));
}

const line = (customerId: number, name: string, want: number, offers: { player: number; price: number; sold: number; qty?: number; tooOld?: boolean }[], max = 8, fruit: LineResult['fruit'] = 'apple'): LineResult => ({
  customerId, name, fruit, want, max,
  offers: offers.map((o) => ({ player: o.player, price: o.price, sold: o.sold, qty: o.qty ?? o.sold, freshness: 3, tooOld: o.tooOld })),
});
const day = (n: number, lines: LineResult[], event?: string, income = [0, 0]) => ({ day: n, lines, income, cash: [10, 10], event });

/** The 43 trophies of the live game (1.19.1), by code name. */
const OLD_IDS = ['first_win', 'first_sale', 'explorer', 'no_waste', 'jam_session', 'juice_regular', 'full_price', 'penny_under', 'sky_high', 'tie_breaker', 'sole_five',
  'red_carpet', 'town_12', 'town_36', 'worth_wait', 'full_house', 'bare_stall', 'fully_fitted', 'mango_mogul', 'beat_hard', 'hard_sweep', 'shop_3', 'shop_6', 'rivals_all',
  'big_day', 'festival_rush', 'event_all', 'card_sharp', 'comeback', 'streak3', 'streak7', 'streak30', 'daily_top10', 'online_win', 'online_10', 'league', 'rich',
  'sold_100', 'sold_500', 'sold_2000', 'played_10', 'played_50', 'played_200'];

describe('the catalogue', () => {
  it('has 48 cards and 109 tiers in eight groups, each code name once', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(CARDS.length).toBe(48);
    expect(ids.length).toBe(109);
    expect(TIER_COUNT).toBe(109);
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(CARDS.length);
    for (const c of CARDS) expect(GROUPS.some((g) => g.id === c.group), c.id).toBe(true);
    for (const g of GROUPS) expect(CARDS.some((c) => c.group === g.id), g.id).toBe(true);
    expect(GROUPS.map((g) => CARDS.filter((c) => c.group === g.id).length)).toEqual([3, 10, 10, 3, 3, 14, 3, 2]);
  });

  it('keeps every trophy of the live game under its code name, so what was earned stays earned', () => {
    expect(OLD_IDS.length).toBe(43);
    for (const id of OLD_IDS) expect(tierById(id), id).toBeDefined();
  });

  it('a card\'s tiers go up: Bronze before Silver before Gold, and a shared count never needs less for a higher tier', () => {
    const rank = { bronze: 0, silver: 1, gold: 2 };
    for (const c of CARDS) {
      for (let i = 1; i < c.steps.length; i++) {
        expect(rank[c.steps[i].tier], c.id).toBeGreaterThan(rank[c.steps[i - 1].tier]);
        if (!c.steps[i].value && !c.steps[i - 1].value) expect(c.steps[i].goal, c.id).toBeGreaterThan(c.steps[i - 1].goal);
      }
    }
  });

  it('says the right numbers: 36 customers, 5 guests, 20 events, 8 shopkeepers, 6 favours, 5 upgrades, 8 clients', () => {
    expect(tierById('town_36')!.step.goal).toBe(36);
    expect(ALL_GUESTS.length).toBe(5);
    expect(tierById('guests_5')!.step.goal).toBe(5);
    expect(tierById('event_all')!.step.goal).toBe(EVENT_CARDS.length);
    expect(tierById('event_all')!.step.text).toBe('See all 20 event cards.');
    expect(tierById('shop_8')!.step.goal).toBe(RIVALS.length);
    expect(tierById('card_sharp')!.step.goal).toBe(Object.keys(FAVOURS).length);
    expect(tierById('upgrades_5')!.step.goal).toBe(Object.keys(UPGRADES).length);
    expect(tierById('orders_8')!.step.goal).toBe(ORDER_CARDS.length);
    for (const a of ACHIEVEMENTS) expect(a.text, a.id).not.toMatch(/!/);
  });

  it('only ever awards code names that exist, and nothing for a game that is not finished', () => {
    const known = new Set(ACHIEVEMENTS.map((a) => a.id));
    for (let seed = 1; seed <= 8; seed++) {
      const g = game(2 + (seed % 3), seed);
      for (const id of evaluate(g, 0, ctx({ stats: { played: 300, totalSold: 5000 } })).got) expect(known.has(id)).toBe(true);
    }
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

describe('the trophies DEC-086 said to change (C6)', () => {
  it('Worth the Wait: a standing order delivered in full, and only in full', () => {
    const g = game();
    g.history = [day(3, [line(1, 'School Canteen', 4, [{ player: 0, price: 7, sold: 4 }], 7, 'blueberry')])];
    const r = evaluate(g, 0, ctx());
    expect(r.got).toContain('worth_wait');
    expect(r.counts.orders).toBe(1);
    expect(r.sets.clients).toEqual(['School Canteen']);
    g.history = [day(3, [line(1, 'School Canteen', 4, [{ player: 0, price: 7, sold: 3 }], 7, 'blueberry')])];
    expect(evaluate(g, 0, ctx()).got).not.toContain('worth_wait');
    // a customer who was in the row the day before earns nothing any more (nobody waits overnight since rules 14)
    g.history = [day(1, [line(1, 'John', 3, [{ player: 1, price: 5, sold: 1 }])]), day(2, [line(1, 'John', 2, [{ player: 0, price: 5, sold: 2 }])])];
    expect(evaluate(g, 0, ctx()).got).not.toContain('worth_wait');
  });

  it('Fully Fitted: two upgrades in one game (a stall has room for two)', () => {
    const g = game();
    g.players[0].upgrades = ['juicebar', 'barrow'];
    expect(evaluate(g, 0, ctx()).got).toContain('fully_fitted');
    g.players[0].upgrades = ['juicebar'];
    expect(evaluate(g, 0, ctx()).got).not.toContain('fully_fitted');
  });

  it('Full House: every customer in the row in one day, four or more; a standing order\'s client is not in the count', () => {
    const g = game();
    const four = [1, 2, 3, 4].map((i) => line(i, `C${i}`, 1, [{ player: 0, price: 5, sold: 1 }]));
    g.history = [day(1, four)];
    expect(evaluate(g, 0, ctx()).got).toContain('full_house');
    // three customers are not a whole row
    g.history = [day(1, four.slice(0, 3))];
    expect(evaluate(g, 0, ctx()).got).not.toContain('full_house');
    // one of four bought from a rival only
    g.history = [day(1, [...four.slice(0, 3), line(4, 'C4', 1, [{ player: 1, price: 5, sold: 1 }])])];
    expect(evaluate(g, 0, ctx()).got).not.toContain('full_house');
    // a rival's standing order in the row does not spoil it
    g.history = [day(1, [...four, line(9, 'Pie Factory', 4, [{ player: 1, price: 9, sold: 4 }], 9)])];
    expect(evaluate(g, 0, ctx()).got).toContain('full_house');
  });

  it('Jam Session: nothing left for the jam maker on the last day, with 20 or more sold', () => {
    const g = game();
    g.players[0].stats.sold = 24;
    g.jam = [0, 3];
    expect(evaluate(g, 0, ctx()).got).toContain('jam_session');
    g.jam = [2, 0];
    expect(evaluate(g, 0, ctx()).got).not.toContain('jam_session');
    g.jam = [0, 0];
    g.players[0].stats.sold = 19;
    expect(evaluate(g, 0, ctx()).got).not.toContain('jam_session');
  });

  it('Sole Supplier is the Gold tier at three customers served alone; one and two are Bronze and Silver', () => {
    const g = game();
    const alone = (id: number) => line(id, `C${id}`, 2, [{ player: 0, price: 5, sold: 2 }]);
    g.history = [day(1, [alone(1), alone(2), line(3, 'Grace', 2, [{ player: 0, price: 5, sold: 1 }, { player: 1, price: 6, sold: 1 }])]), day(2, [alone(4)])];
    const r = evaluate(g, 0, ctx());
    expect(r.got).toEqual(expect.arrayContaining(['sole_1', 'sole_2', 'sole_five']));
    expect(r.counts.bestSole).toBe(3);
    g.history = [day(1, [alone(1), alone(2)])];
    const two = evaluate(g, 0, ctx()).got;
    expect(two).toContain('sole_2');
    expect(two).not.toContain('sole_five');
    // a standing order delivered alone is not a customer served alone
    g.history = [day(1, [line(1, 'Cider Press', 3, [{ player: 0, price: 9, sold: 3 }], 9)])];
    expect(evaluate(g, 0, ctx()).got).not.toContain('sole_1');
  });

  it('Fruit Tycoon is the Gold tier of Final cash at $160, in a Quick or Standard game only', () => {
    const g = game();
    g.players[0].cash = 160;
    expect(evaluate(g, 0, ctx()).got).toEqual(expect.arrayContaining(['cash_100', 'cash_130', 'rich']));
    g.players[0].cash = 159;
    const under = evaluate(g, 0, ctx()).got;
    expect(under).toContain('cash_130');
    expect(under).not.toContain('rich');
    g.players[0].cash = 400;
    g.config.days = 14;
    const long = evaluate(g, 0, ctx());
    expect(long.got).not.toContain('cash_100');
    expect(long.counts.bestCash).toBeUndefined();
  });

  it('counts and words corrected: the customer book holds the 36 customers only, guests are five, events are 20', () => {
    const everyoneElse = [...ALL_GUESTS, ...ORDER_CARDS.map((c) => c.name)];
    const s = snap({ sets: { customers: [...everyoneElse, 'John', 'Ravi'], guests: ['Influencer'] } });
    expect(customersServed(s).sort()).toEqual(['John', 'Ravi']);
    // 15 names in the old set, but only two customers: The Whole Town is not earned early any more
    expect(standing(snap({ sets: { customers: [...everyoneElse, ...Array.from({ length: 30 }, (_, i) => `Nobody ${i}`)] } }))).not.toContain('town_36');
    expect(guestsServed(s).sort()).toEqual([...ALL_GUESTS].sort());
    expect(standing(s)).toEqual(expect.arrayContaining(['red_carpet', 'guests_5']));
    expect(standing(snap({ sets: { events: EVENT_CARDS.slice(0, 13).map((e) => e.id) } }))).not.toContain('event_all');
    expect(standing(snap({ sets: { events: EVENT_CARDS.map((e) => e.id) } }))).toContain('event_all');
  });

  it('a standing order\'s pieces are not top-price sales, a $12 sale or a win by $1', () => {
    const g = game();
    g.history = [day(1, [line(1, 'Royal Banquet', 5, [{ player: 0, price: 18, sold: 5 }], 18, 'mango')])];
    const f = gameFacts(g, 0);
    expect([f.top, f.bestSale, f.under, f.sole]).toEqual([0, 0, 0, 0]);
    expect(f.fruit.mango).toBe(5);
  });
});

describe('feats in one game', () => {
  it('rewards a price exactly $1 under, a tied price, and a $12 sale', () => {
    const g = game();
    g.history = [day(1, [
      line(1, 'John', 2, [{ player: 0, price: 5, sold: 2 }, { player: 1, price: 6, sold: 0 }]),
      line(2, 'Ravi', 2, [{ player: 0, price: 7, sold: 1 }, { player: 1, price: 7, sold: 1 }]),
      line(3, 'Grace', 1, [{ player: 0, price: 12, sold: 1 }], 14),
    ])];
    expect(evaluate(g, 0, ctx()).got).toEqual(expect.arrayContaining(['penny_under', 'tie_breaker', 'sky_high']));
  });

  it('does not reward a $2 gap, or a tied price that the other stall could not fill', () => {
    const g = game();
    g.history = [day(1, [
      line(1, 'John', 2, [{ player: 0, price: 5, sold: 2 }, { player: 1, price: 7, sold: 0 }]),
      line(2, 'Ravi', 2, [{ player: 0, price: 7, sold: 2 }, { player: 1, price: 7, sold: 0, qty: 0, tooOld: true }]),
    ])];
    const got = evaluate(g, 0, ctx()).got;
    expect(got).not.toContain('penny_under');
    expect(got).not.toContain('tie_breaker');
  });

  it('keeps the best of a game as a count, and a later weaker game takes nothing away', () => {
    const g = game();
    g.history = [day(1, Array.from({ length: 6 }, (_, i) => line(i, `C${i}`, 2, [{ player: 0, price: 8, sold: 2 }], 8)), 'festival', [58, 0])];
    const first = evaluate(g, 0, ctx());
    expect(first.counts).toMatchObject({ bestTop: 12, bestDay: 58, bestSale: 8 });
    expect(first.got).toEqual(expect.arrayContaining(['full_price', 'full_price_10', 'big_day', 'day_55', 'festival_rush']));
    g.history = [day(1, [line(1, 'C1', 2, [{ player: 0, price: 8, sold: 2 }], 8)], undefined, [16, 0])];
    const second = evaluate(g, 0, ctx({ have: new Set(first.got), counts: first.counts, sets: first.sets }));
    expect(second.counts).toMatchObject({ bestTop: 12, bestDay: 58 });
    expect(second.got).not.toContain('full_price_15');
  });

  it('a game counted before adds nothing to the counts a second time', () => {
    const g = game();
    const once = evaluate(g, 0, ctx());
    const again = evaluate(g, 0, ctx({ counts: once.counts, sets: once.sets, have: new Set(once.got), count: false }));
    expect(again.counts).toEqual(once.counts);
    expect(again.sets).toEqual(once.sets);
    expect(again.got).toEqual([]);
  });
});

describe('sets and counts that build up', () => {
  it('collects customers, guests, events and modes, and awards the set tiers', () => {
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

  it('counts a win for the shopkeeper played, the game\'s length and the pieces of each fruit', () => {
    let won: GameState | undefined;
    for (let seed = 1; seed <= 40 && !won; seed++) {
      const g = autoplay(newGame({
        players: [{ name: 'Me', kind: 'ai', level: 'hard', avatar: RIVALS[6].avatar }, { name: RIVALS[0].name, kind: 'ai', level: 'easy', avatar: RIVALS[0].avatar }],
        days: 8, unripe: true, upgrades: true, events: true, seed,
      }));
      if (winners(g).includes(0)) won = g;
    }
    expect(won).toBeDefined();
    const r = evaluate(won!, 0, ctx());
    expect(r.counts.win_keeper).toBe(1); // Pak Din's perk is Shade Cloth ("keeper")
    expect(r.counts.g8).toBe(1);
    expect(r.got).toEqual(expect.arrayContaining(['win_keeper_1', 'first_win']));
    expect(r.sets.wonWith).toEqual(['keeper']);
    const f = gameFacts(won!, 0);
    expect(r.counts.fruit_blueberry ?? 0).toBe(f.fruit.blueberry);
    // sold to customers, guests and order clients: never more than the stall's whole count (the night hawker buys too)
    expect(Object.values(f.fruit).reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(won!.players[0].stats.sold);
    // an online win is counted as one
    expect(evaluate(won!, 0, ctx({ online: true })).counts.onlineWins).toBe(1);
  });

  it('shows progress towards a goal', () => {
    const a = ACHIEVEMENTS.find((x) => x.id === 'shop_6')!;
    expect(progressOf(a, { wonWith: ['haggler', 'basket'] }, { played: 0, totalSold: 0 })).toBe(2);
    const m = ACHIEVEMENTS.find((x) => x.id === 'sold_500')!;
    expect(progressOf(m, {}, { played: 0, totalSold: 900 })).toBe(500);
  });
});

describe('a skill title needs a fair game (H5)', () => {
  const table = (level: Level, extra: Partial<GameState['config']> = {}, human = false) => {
    const g = autoplay(newGame({
      players: [{ name: 'Me', kind: 'ai', level: 'hard', avatar: RIVALS[0].avatar }, { name: RIVALS[1].name, kind: 'ai', level, avatar: RIVALS[1].avatar }],
      days: 8, unripe: true, upgrades: true, events: true, seed: 5, ...extra,
    }));
    if (human) g.players[1].kind = 'human';
    g.players[0].cash = 170;
    return g;
  };
  it('Easy computers: the tier and its stamps, but not the mark a title needs', () => {
    const r = evaluate(table('easy'), 0, ctx());
    expect(r.got).toContain('rich');
    expect(r.sets.fair ?? []).not.toContain('rich');
  });
  it('Normal or harder computers, a Daily market, or a table of people: the mark is kept', () => {
    expect(evaluate(table('normal'), 0, ctx()).sets.fair).toContain('rich');
    expect(evaluate(table('hard'), 0, ctx()).sets.fair).toContain('rich');
    expect(evaluate(table('easy', { daily: '2026-11-12' }), 0, ctx()).sets.fair).toContain('rich');
    expect(evaluate(table('easy', {}, true), 0, ctx()).sets.fair).toContain('rich');
  });
  it('a holder from before can still earn the mark by doing it again', () => {
    const r = evaluate(table('hard'), 0, ctx({ have: new Set(['rich']) }));
    expect(r.got).not.toContain('rich');
    expect(r.sets.fair).toContain('rich');
  });
});

// "Every trophy in the catalogue is either earnable under rules 18 or listed as not": whole games played by the
// computers through the real engine, counted as the app counts them, earn the tiers below; the rest are listed with
// the reason a computer run of this size cannot show them, and each of those is checked from stored numbers.
describe('earnable under rules 18', () => {
  /** Tiers a run of 30 whole computer games earns (seeds 1001 to 1030; the same run of 150 games earns 92 of 109). */
  const IN_30_GAMES = ['first_sale', 'first_win', 'win_basket_1', 'rivals_3', 'worth_wait', 'jam_session', 'no_waste', 'full_price', 'tie_breaker', 'big_day', 'day_55',
    'win_charmer_1', 'favours_3', 'fully_fitted', 'town_12', 'events_10', 'full_price_10', 'full_price_15', 'penny_under', 'sole_1', 'day_70', 'beat_hard', 'sky_high', 'sole_2',
    'festival_rush', 'fruit_watermelon_30', 'fruit_apple_30', 'red_carpet', 'event_all', 'penny_5', 'sold_100', 'fruit_blueberry_30', 'online_1', 'win_earful_1', 'shop_3',
    'fruit_mango_30', 'mango_mogul', 'full_house', 'cash_100', 'cash_130', 'rich', 'orders_5', 'town_36', 'guests_5', 'rivals_all', 'juice_regular', 'sole_five', 'online_win',
    'played_10', 'win_nestegg_1', 'hard_sweep', 'win_favourite_1', 'win_keeper_1', 'shop_6', 'comeback', 'win_haggler_1', 'win_charmer_3', 'penny_8', 'sold_500', 'win_bargain_1',
    'shop_8', 'win_earful_3', 'sale_15', 'fruit_watermelon_200', 'fruit_blueberry_200', 'fruit_apple_200', 'orders_8', 'win_keeper_3'];
  /** The rest: why 30 computer games do not show them. None is out of reach under rules 18. */
  const LATER: Record<string, string> = {
    explorer: 'needs a Daily market and a Market League game as well', card_sharp: 'computers do not play every kind of favour card; all six kinds are in the deck',
    bare_stall: 'a choice the computers rarely make (first seen in game 64 of the long run)',
    upgrades_5: 'a long count (game 94 of the long run)', upgrades_won: 'a long count (game 94 of the long run)',
    rivals_hard: 'a long count: a win against each of the eight as a Hard computer',
    daily_3: 'Daily market', daily_10: 'Daily market', daily_30: 'Daily market', streak3: 'Daily market', streak7: 'Daily market', streak30: 'Daily market',
    daily_top10: 'given by the Daily market leaderboard', league_2: 'Market League', league_4: 'Market League', league: 'Market League',
    online_10: 'a long count', online_50: 'a long count', online_wins_5: 'a long count', online_wins_25: 'a long count',
    played_50: 'a long count', played_200: 'a long count', sold_2000: 'a long count',
    fruit_blueberry_1000: 'a long count', fruit_watermelon_1000: 'a long count', fruit_apple_1000: 'a long count', fruit_mango_200: 'a long count', fruit_mango_1000: 'a long count',
    ...Object.fromEntries(['basket', 'charmer', 'earful', 'nestegg', 'favourite', 'keeper', 'haggler', 'bargain'].flatMap((t) => [3, 6].map((n) => [`win_${t}_${n}`, 'a long count: wins with one shopkeeper'])).filter(([id]) => !IN_30_GAMES.includes(id))),
  };

  it('every tier is in one list or the other', () => {
    const all = ACHIEVEMENTS.map((a) => a.id).sort();
    expect([...IN_30_GAMES, ...Object.keys(LATER)].sort()).toEqual(all);
    expect(new Set([...IN_30_GAMES, ...Object.keys(LATER)]).size).toBe(all.length);
  });

  it('thirty whole computer games earn 68 of the tiers, the seven changed trophies among them', () => {
    let sets: Sets = {}, counts: Counts = {};
    const have = new Set<string>();
    const stats = { played: 0, totalSold: 0, wins: 0 };
    for (let i = 1; i <= 30; i++) {
      const stalls = [4, 4, 2, 6, 3, 4][i % 6];
      const me = RIVALS[i % 8];
      const rivalLevel = (['easy', 'normal', 'hard'] as Level[])[i % 3];
      const g = autoplay(newGame({
        players: [{ name: 'Me', kind: 'ai', level: i % 3 === 0 ? 'normal' : 'hard', avatar: me.avatar },
          ...RIVALS.filter((r) => r !== me).slice(0, stalls - 1).map((r) => ({ name: r.name, kind: 'ai' as const, level: rivalLevel, avatar: r.avatar }))],
        days: [10, 8, 14, 10][i % 4], unripe: true, upgrades: true, events: true, marketDays: true, seed: 1000 + i,
      }));
      stats.played++;
      stats.totalSold += g.players[0].stats.sold;
      if (winners(g).includes(0)) stats.wins++;
      const r = evaluate(g, 0, { online: i % 5 === 0, have, sets, counts, stats, daily: {}, league: 0 });
      sets = r.sets;
      counts = r.counts;
      for (const id of r.got) have.add(id);
    }
    expect(IN_30_GAMES.filter((id) => !have.has(id))).toEqual([]);
    for (const id of ['worth_wait', 'fully_fitted', 'full_house', 'jam_session', 'sole_five', 'rich', 'event_all', 'town_36']) expect(have.has(id), id).toBe(true);
  }, 120_000);

  it('the rest are reached by stored numbers a player can build: one short is not enough, the number itself is', () => {
    const traits = ['haggler', 'basket', 'charmer', 'nestegg', 'bargain', 'favourite', 'keeper', 'earful'];
    const at = (k: number): Snapshot => snap({
      stats: { played: 200 - k, totalSold: 2000 - k, wins: 0 },
      league: 6 - k,
      daily: Object.fromEntries(Array.from({ length: 30 - k }, (_, i) => [`2026-09-${String(i + 1).padStart(2, '0')}`, 50])),
      counts: { ...Object.fromEntries(traits.map((t) => [`win_${t}`, 6 - k])), fruit_blueberry: 1000 - k, fruit_watermelon: 1000 - k, fruit_apple: 1000 - k, fruit_mango: 1000 - k, onlineWins: 25 - k },
      sets: {
        modes: ['new', 'daily', 'league', 'online'].slice(k), favours: FAVOUR_DECK.filter((f, i) => FAVOUR_DECK.indexOf(f) === i).slice(k),
        built: Object.keys(UPGRADES).slice(k), wonBuilt: Object.keys(UPGRADES).slice(k), beatenHard: RIVALS.map((r) => r.name).slice(k),
        online: Array.from({ length: 50 - k }, (_, i) => String(i)),
      },
    });
    const full = standing(at(0));
    const short = standing(at(1));
    for (const id of ['explorer', 'card_sharp', 'upgrades_5', 'upgrades_won', 'rivals_hard', 'daily_30', 'streak30', 'league', 'online_50', 'online_wins_25', 'played_200', 'sold_2000',
      'fruit_mango_1000', 'fruit_blueberry_1000', 'win_basket_6', 'win_earful_6']) {
      expect(full, id).toContain(id);
      expect(short, id).not.toContain(id);
    }
    // every kind of favour card is in the deck, so all six can be played
    expect(new Set(FAVOUR_DECK).size).toBe(Object.keys(FAVOURS).length);
    // the feats that are simply done or not are only ever given by a game or by the board
    for (const id of ['bare_stall', 'daily_top10']) expect(full, id).not.toContain(id);
  });
});
