// Stored progress written by the live game (1.19.1) and by this branch before the stamp book must load, with every
// trophy and look kept (PLAN-086). The strings below are what those versions write to the phone, key by key
// (src/ui/progress.ts and src/ui/store.ts have used these keys and shapes since they were first written).
import { beforeEach, describe, expect, it } from 'vitest';
import { autoplay } from '../src/engine/ai';
import { RIVALS } from '../src/engine/data';
import { newGame, winners, type GameState } from '../src/engine/game';
import { cleanProfile, emptyProfile, mergeProfiles } from '../src/net/profile';
import { finishGame, loadCounts, loadLooks, loadSets, loadWorn, myPlace, myStamps, snapshot, syncTiers, unlocked } from '../src/ui/progress';
import { syncLooks, worn, wornSounds } from '../src/ui/looks';
import { loadDaily, loadStats } from '../src/ui/store';
import { tierById } from '../src/ui/achievements';
import { tierStamps } from '../src/ui/stamps';

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k),
  };
});

/** A long-time player of the live game, as the phone holds them. Former shopkeeper names ("Benny") are from before
 *  DEC-064; the customers set holds two guests and a standing order's client, as that version stored them. */
const LIVE: Record<string, string> = {
  'fm.stats': '{"played":64,"wins":21,"bestCash":143,"totalSold":1490}',
  'fm.ach': '["first_sale","penny_under","tie_breaker","full_price","town_12","first_win","straw","no_waste","sky_high","big_day","sold_100","played_10","shop_3","red_carpet","sold_500","played_50","sole_five","rich","league","streak3","streak7","online_win","town_36","mango_mogul"]',
  'fm.prog': '{"modes":["new","daily","league","online"],"customers":["John","Robert","Daniel","Rara Jenab","Aisyah","Ravi","Mei Ling","Farid","Siti","Kumar","Grace","Hafiz","Wedding Caterer","Bakery","School Canteen"],"guests":["Influencer","Hotel Chef","Gym Club"],"events":["festival","glut","heatwave","blight","strike"],"favours":["gossip","freeFruit","fridge"],"online":["1722","90015","41"],"wonWith":["haggler","basket","charmer","nestegg"],"beaten":["Rosa","Benny","Chen","Saleh","Uncle Benny"]}',
  'fm.looks': '["roof_stripes","prop_scale","ticker_garland","trader_visor","roof_scallops","straw_boater","scarf","monocle","roof_stars","prop_crates","roof_checks","bow_tie","roof_fruit","prop_cat","pencil_slip","prop_golden_apple","gold_crown","trim_bunting","laurel","trim_tassels","fruit_basket_hat"]',
  'fm.worn': '{"hat":"gold_crown","neck":"scarf","roof":"roof_stars","prop":"prop_cat"}',
  'fm.colour': '"teal"',
  'fm.ladder': '6',
  'fm.daily': '{"2026-11-01":88,"2026-11-02":92,"2026-11-03":71,"2026-11-05":104,"2026-11-06":66,"2026-11-07":93,"2026-11-08":80,"2026-11-09":79}',
  'fm.name': 'Mia',
  'fm.avatar': '🐼',
};

const load = (stored: Record<string, string>) => { for (const [k, v] of Object.entries(stored)) mem.set(k, v); };

function finished(seed = 1): GameState {
  for (let s = seed; s < seed + 40; s++) {
    const g = autoplay(newGame({
      players: [{ name: 'Mia', kind: 'ai', level: 'hard', avatar: RIVALS[2].avatar }, { name: RIVALS[0].name, kind: 'ai', level: 'easy', avatar: RIVALS[0].avatar }],
      days: 8, unripe: true, upgrades: true, events: true, seed: s,
    }));
    if (winners(g).includes(0)) return g;
  }
  throw new Error('no win found');
}

describe('progress stored by the live game loads', () => {
  it('reads every stored value as it was written', () => {
    load(LIVE);
    expect(loadStats()).toEqual({ played: 64, wins: 21, bestCash: 143, totalSold: 1490 });
    expect(unlocked()).toEqual(JSON.parse(LIVE['fm.ach']));
    expect(loadSets()).toEqual(JSON.parse(LIVE['fm.prog']));
    expect(loadLooks()).toEqual(JSON.parse(LIVE['fm.looks']));
    expect(loadWorn()).toEqual(JSON.parse(LIVE['fm.worn']));
    expect(Object.keys(loadDaily()).length).toBe(8);
    expect(loadCounts()).toEqual({});
    expect(snapshot().league).toBe(6);
  });

  it('keeps every trophy, a code name this version does not know included, and adds the tiers already reached', () => {
    load(LIVE);
    const before = unlocked();
    const added = syncTiers();
    const after = unlocked();
    for (const id of before) expect(after, id).toContain(id);
    expect(after).toContain('straw'); // unknown here: kept, and worth no stamps
    expect(tierById('straw')).toBeUndefined();
    // the lower tiers of trophies held, and tiers whose count was already reached
    expect(added).toEqual(expect.arrayContaining(['sole_1', 'sole_2', 'cash_100', 'cash_130', 'league_2', 'league_4', 'online_1', 'daily_3', 'guests_5', 'rivals_3',
      'win_haggler_1', 'win_basket_1', 'win_charmer_1', 'win_nestegg_1']));
    // the customer book is corrected: 12 customers served, not 15 names
    expect(added).not.toContain('town_36');
    expect(after).toContain('town_36'); // but what was earned stays earned
    // a second look changes nothing
    expect(syncTiers()).toEqual([]);
    expect(unlocked()).toEqual(after);
  });

  it('starts the player with the stamps their games, wins, Daily markets and trophies are worth', () => {
    load(LIVE);
    syncTiers();
    const st = myStamps();
    expect(st.games).toBe(64 * 3); // lengths were not counted then: taken as Standard games
    expect(st.wins).toBe(21);
    expect(st.daily).toBe(8 * 2);
    expect(st.tiers).toBe(unlocked().reduce((a, id) => a + tierStamps(id), 0));
    expect(st.tiers).toBeGreaterThan(100);
    expect(myPlace().level).toBeGreaterThanOrEqual(12);
  });

  it('keeps every look and what is on, and hands out what the level and the trophies now give', () => {
    load(LIVE);
    syncTiers();
    const had = loadLooks();
    const fresh = syncLooks().map((l) => l.id);
    for (const id of had) expect(loadLooks(), id).toContain(id);
    // what was on is still on; the rank reached shows by itself (its title and frame), until the player picks another
    const rank = myPlace().rankNo;
    expect(rank).toBeGreaterThanOrEqual(3);
    expect(worn()).toEqual({ hat: 'gold_crown', neck: 'scarf', roof: 'roof_stars', prop: 'prop_cat', colour: 'col_teal', title: `title_rank${rank}`, frame: ['', 'frame_plain', 'frame_painted', 'frame_lantern', 'frame_brass', 'frame_carved', 'frame_gold'][rank] });
    expect(fresh).toEqual(expect.arrayContaining(['title_league', 'title_rank2', 'frame_painted', 'tag_chalk', 'bell_bicycle', 'coin_jar', 'stamp_soldout']));
    // a skill title is not handed out for a trophy from before: nobody knows who the rivals were
    expect(fresh).not.toContain('title_rich');
    expect(fresh).not.toContain('title_sole');
    expect(wornSounds()).toEqual({ bell: 'bell_brass', coin: 'coin_till' });
    expect(syncLooks()).toEqual([]);
  });

  it('a game played after the update adds to it and takes nothing away', () => {
    load(LIVE);
    const before = { ach: unlocked(), looks: loadLooks(), sets: loadSets(), stats: loadStats() };
    const sum = finishGame(finished(), 0)!;
    expect(sum.earned).toBeGreaterThanOrEqual(3); // 2 for the 8 days, 1 for the win
    expect(sum.lines[0]).toEqual({ stamps: 2, text: '8 days played' });
    expect(sum.lines[1]).toEqual({ stamps: 1, text: 'The win' });
    expect(sum.lines.reduce((a, l) => a + l.stamps, 0)).toBe(sum.earned);
    for (const id of before.ach) expect(unlocked(), id).toContain(id);
    for (const [k, v] of Object.entries(before.sets)) for (const m of v) expect(loadSets()[k], `${k}: ${m}`).toContain(m);
    expect(loadStats().played).toBe(65);
    expect(loadStats().wins).toBe(22);
    expect(loadCounts()).toMatchObject({ g8: 1, win_charmer: 1 });
    // the win is the shopkeeper's second (one was known from the set), so no new Bronze for it
    expect(sum.tiers.map((t) => t.id)).not.toContain('win_charmer_1');
    expect(loadLooks()).toEqual(before.looks);
  });

  it('the same results opened twice count once', () => {
    load(LIVE);
    const g = finished();
    const first = finishGame(g, 0)!;
    expect(finishGame(g, 0)).toBe(first); // the same visit to the results: the same words
    // another game in between, then the first results are opened again (an online room re-joined after the app was shut)
    expect(finishGame(finished(60), 0)!.earned).toBeGreaterThan(0);
    const stats = loadStats();
    const counts = loadCounts();
    const tiers = unlocked();
    const again = finishGame(JSON.parse(JSON.stringify(g)) as GameState, 0)!;
    expect(again).not.toBe(first);
    expect(loadStats()).toEqual(stats);
    expect(loadCounts()).toEqual(counts);
    expect(unlocked()).toEqual(tiers);
    expect(again.earned).toBe(0);
    expect(again.lines).toEqual([]);
  });

  it('an online game counts as a game: games, wins, pieces sold, and an online win', () => {
    load(LIVE);
    const g = finished(50);
    const sum = finishGame(g, 0, true)!;
    expect(loadStats()).toMatchObject({ played: 65, wins: 22, totalSold: 1490 + g.players[0].stats.sold });
    expect(loadSets().online).toContain(String(g.config.seed));
    expect(loadCounts().onlineWins).toBe(1);
    expect(sum.lines.map((l) => l.text)).toEqual(expect.arrayContaining(['8 days played', 'The win']));
  });

  it('a new player has nothing, and loses nothing by it', () => {
    expect(syncTiers()).toEqual([]);
    expect(myStamps().total).toBe(0);
    expect(myPlace()).toMatchObject({ level: 1, filled: 0, size: 15 });
    expect(syncLooks()).toEqual([]);
    expect(worn()).toEqual({ title: 'title_rank1', frame: 'frame_plain' });
  });

  it('damaged entries fall back to empty and never stop the rest from loading', () => {
    load({ ...LIVE, 'fm.ach': '{"not":"a list"}', 'fm.prog': '["not","a","map"]', 'fm.worn': 'oops', 'fm.counts': '{"g10":"many","win_haggler":2.9,"x":-4}', 'fm.ladder': '"six"' });
    expect(unlocked()).toEqual([]);
    expect(loadSets()).toEqual({});
    expect(loadWorn()).toEqual({});
    expect(loadCounts()).toEqual({ win_haggler: 2 });
    expect(snapshot().league).toBe(0);
    expect(loadStats().played).toBe(64);
    expect(myStamps().games).toBe(64 * 3);
  });
});

describe('the account keeps the new counts and loses nothing to an older app', () => {
  it('two phones keep the higher count; a profile from the live game has none and takes none away', () => {
    const a = cleanProfile({ ...emptyProfile(), at: 100, counts: { g10: 4, win_haggler: 2, bestDay: 61 } });
    const b = cleanProfile({ ...emptyProfile(), at: 200, counts: { g10: 6, win_haggler: 1, fruit_apple: 30 } });
    expect(mergeProfiles(a, b).counts).toEqual({ g10: 6, win_haggler: 2, bestDay: 61, fruit_apple: 30 });
    // what the live game sends: no counts at all
    const live = cleanProfile({ at: 300, name: 'Mia', achievements: ['first_win'], stats: { played: 9, wins: 2, bestCash: 80, totalSold: 100 }, progress: { beaten: ['Rosa'] } });
    expect(live.counts).toEqual({});
    expect(mergeProfiles(a, live).counts).toEqual(a.counts);
    expect(mergeProfiles(live, a).counts).toEqual(a.counts);
  });
  it('cleans the counts it is given', () => {
    const p = cleanProfile({ counts: { g10: 3.7, 'bad key': 4, win_haggler: -2, bestDay: 'lots', fruit_apple: 1e12 } });
    expect(p.counts).toEqual({ g10: 3, fruit_apple: 1e9 });
    expect(Object.keys(cleanProfile({ counts: Object.fromEntries(Array.from({ length: 80 }, (_, i) => [`c${i}`, 1])) }).counts).length).toBe(48);
  });
});
