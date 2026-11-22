// PLAN-118: the Market League pilot. The new stage options (starting cash and shelves, where a stage opens, its length,
// the lorry of a day, the first-player token, rule parts switched off, rival habits, goals) apply only in a League
// stage and leave every other game exactly as it was; a stage that opens part-way is reached by real game actions and
// is a state a normal game can reach; each new stage is cleared by a sensible scripted player and not by a naive one;
// progress saved before the pilot keeps its stage and its stars; the mastery trophies hand over titles and items
// already drawn.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'preact';
import { aiActFor, autoplay, openStage } from '../src/engine/ai';
import { FRUITS, START_CASH } from '../src/engine/data';
import { dailyConfig, sprintConfig } from '../src/engine/daily';
import {
  activePlayer, beginBuying, buyLimit, count, finishReveal, newGame, shelfSize, validateStageSetup,
  type GameConfig, type GameState, type StageSetup,
} from '../src/engine/game';
import { ACHIEVEMENTS, evaluate, tierById } from '../src/ui/achievements';
import {
  ALL_STAGES, EXPERTS, LEAGUE, MASTERY_STAGES, STAR_IDS, expertOpen, heldStars, isExpert, masteryStars, missedGoals, stageCleared, starGoals, starsEarned,
} from '../src/ui/campaign';
import { toStaticHtml } from '../src/ui/cards';
import { LeagueView, nextTrophy, roadState } from '../src/ui/League';
import { earned } from '../src/ui/looks';
import { finishGame, leagueConfig, leagueStage, loadSets, myStars, saveLeagueStage, saveSets, snapshot } from '../src/ui/progress';
import { StageEnd } from '../src/ui/StageMoment';
import { TIER_STAMPS, tierStamps } from '../src/ui/stamps';
import { LOOKS, lookById } from '../src/net/looks';
import { SCRIPTS, run, start } from '../scripts/league-scripts';

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

const allAi = (c: GameConfig): GameConfig => ({ ...c, players: c.players.map((p) => ({ ...p, kind: 'ai' as const, level: p.level ?? 'normal' })) });
const plain = (s: GameState) => JSON.stringify({ ...s, config: null });
/** Every new stage option at once. */
const EVERY_OPTION: StageSetup = {
  events: { 2: 'pasarMalam' }, lorry: { 1: 'Mango Lorry', 2: 'Convoy' }, cash: [3, 20, 7], shelf: [{ blueberry: [2, 0, 0] }, {}, { apple: [0, 1, 0, 0, 0, 0] }],
  open: { day: 2, at: 'buy' }, first: 2, off: ['favours', 'perks', 'orders', 'upgrades'], overbuy: [{ seat: 1, fruit: 'watermelon', n: 3 }],
  bidLow: [{ seat: 2, price: 4 }], undercut: [1],
};
/** A stage played to the end by the computer for every seat, from where it opens. */
const played = (stage: number, seed?: number): GameState => autoplay(allAiState(start(stage, seed)));
const allAiState = (s: GameState): GameState => ({ ...s, players: s.players.map((p) => ({ ...p, kind: 'ai' as const, level: p.level ?? 'normal' })) });

describe('the new stage options change nothing outside the Market League', () => {
  const base = allAi({ ...leagueConfig(9, 'You', ''), league: undefined, stage: undefined, days: 6, marketDays: true, upgrades: true });
  it('a game with every option but no League stage plays exactly as without them (the online rooms never set one)', () => {
    for (const seed of [3, 77, 901]) {
      const a = autoplay(newGame({ ...base, seed }));
      const with_ = newGame({ ...base, seed, stage: EVERY_OPTION });
      expect(openStage(with_)).toBe(with_);
      expect(plain(autoplay(with_))).toBe(plain(a));
    }
  });
  it('the Daily market and the Market Sprint play exactly as without them, even with a League stage number', () => {
    const daily = allAi(dailyConfig('2026-11-21', 'You'));
    expect(plain(autoplay(openStage(newGame({ ...daily, league: 9, stage: EVERY_OPTION }))))).toBe(plain(autoplay(newGame(daily))));
    const sprint = allAi(sprintConfig('2026-11-21', 'You'));
    expect(plain(autoplay(openStage(newGame({ ...sprint, league: 9, stage: EVERY_OPTION }))))).toBe(plain(autoplay(newGame(sprint))));
  });
  it('each option alone is ignored outside the League', () => {
    for (const key of Object.keys(EVERY_OPTION) as (keyof StageSetup)[]) {
      const one = { [key]: EVERY_OPTION[key] } as StageSetup;
      expect(plain(autoplay(openStage(newGame({ ...base, seed: 41, stage: one })))), key).toBe(plain(autoplay(newGame({ ...base, seed: 41 }))));
    }
  });
  it('the first six stages play as they did: none of them uses a new option', () => {
    for (const st of LEAGUE.slice(0, 6)) {
      expect(Object.keys(st.setup).filter((k) => !['events', 'orders', 'crowd', 'undercut'].includes(k)), st.title).toEqual([]);
      expect(st.days).toBe(6);
    }
  });
});

describe('the new stage options in a League stage', () => {
  const cfg = (setup: StageSetup, days = 3): GameConfig => ({ ...allAi(leagueConfig(0, 'You', '')), stage: setup, days, seed: 12 });
  it('set each stall\'s cash and shelf, and the first-player token', () => {
    const s = newGame(cfg({ cash: [3, 20], shelf: [{ blueberry: [2, 0, 0], watermelon: [0, 1, 0, 0] }], first: 1 }));
    expect(s.players.map((p) => p.cash)).toEqual([3, 20]);
    expect(s.players[0].stock.blueberry).toEqual([2, 0, 0]);
    expect(s.players[0].stock.watermelon).toEqual([0, 1, 0, 0]);
    expect(count(s.players[1].stock)).toBe(0);
    expect(s.order[0]).toBe(1);
    expect(s.dayStartCash).toEqual([3, 20]);
  });
  it('refuse a set-up a stall could not hold', () => {
    const c = cfg({});
    expect(validateStageSetup({ ...c, stage: { shelf: [{ apple: [9, 0, 0, 0, 0, 0] }] } })).not.toBeNull();
    expect(validateStageSetup({ ...c, stage: { shelf: [{ apple: [1, 0] }] } })).not.toBeNull();
    expect(validateStageSetup({ ...c, stage: { cash: [-1] } })).not.toBeNull();
    expect(validateStageSetup({ ...c, stage: { first: 5 } })).not.toBeNull();
    expect(validateStageSetup({ ...c, stage: { open: { day: 9 } } })).not.toBeNull();
    expect(() => newGame({ ...c, stage: { cash: [-1] } })).toThrow();
    for (let i = 0; i < ALL_STAGES.length; i++) expect(validateStageSetup(leagueConfig(i, 'You', '')), ALL_STAGES[i].title).toBeNull();
  });
  it('switch rule parts off: no favour card, perk, standing order or upgrade', () => {
    const g = autoplay(newGame({ ...cfg({ off: ['favours', 'perks', 'orders', 'upgrades'] }, 6), marketDays: true, upgrades: true }));
    expect(g.players.every((p) => p.favours.length === 0 && p.stats.favours === 0 && !p.trait && p.upgrades.length === 0)).toBe(true);
    expect(g.log.some((l) => l.includes('standing order'))).toBe(false);
  });
  it('name the lorry of a day', () => {
    const s = newGame(cfg({ lorry: { 1: 'Mango Lorry', 2: 'Convoy' } }));
    expect(s.market.mango[4]).toBeGreaterThan(0);
    expect(s.nextFarmer?.name).toBe('Convoy');
  });
  it('rival habits: Rosa buys three watermelons first; Pak Din bids $5 for every order he can stake', () => {
    const s = start(6);
    expect(s.players[1].boughtFruit?.watermelon?.reduce((a, x) => a + x, 0)).toBe(3);
    let e = start(13);
    while (e.phase === 'order' && activePlayer(e) !== 0) e = aiActFor(e, activePlayer(e))!;
    expect(e.standing?.bids[2]).toBe(5);
  });
});

describe('a stage that opens part-way', () => {
  const opening = ALL_STAGES.map((st, i) => ({ st, i })).filter(({ st }) => st.setup.open);
  it('is reached by real game actions and is a state a normal game can reach', () => {
    expect(opening.length).toBeGreaterThanOrEqual(3);
    for (const { st, i } of opening) {
      const s = start(i);
      const day = st.setup.open?.day ?? 1;
      expect(s.day, st.title).toBe(day);
      expect(s.config.days - day + 1, st.title).toBe(st.days);
      // the person is the one to decide now, at the step the stage opens at
      expect(['order', 'buy'], st.title).toContain(s.phase);
      expect(activePlayer(s), st.title).toBe(0);
      if (st.setup.open?.at === 'buy') expect(s.order.indexOf(0), st.title).toBe(s.turn);
      // stock, cash and the market are sound
      for (const p of s.players) {
        expect(p.cash).toBeGreaterThanOrEqual(0);
        expect(count(p.stock)).toBeLessThanOrEqual(shelfSize(p));
        expect(p.boughtToday).toBeLessThanOrEqual(buyLimit(p));
        for (const f of FRUITS) expect(p.stock[f].every((n) => Number.isInteger(n) && n >= 0)).toBe(true);
      }
      for (const f of FRUITS) expect(s.market[f].every((n) => n >= 0)).toBe(true);
      expect(s.stalls.every((x) => x === null) && s.bids.every((x) => x === null)).toBe(true);
      // the stage's record starts on its own first day
      expect(s.history ?? []).toEqual([]);
      const end = autoplay(allAiState(s));
      expect(end.phase).toBe('over');
      expect(end.history!.map((d) => d.day)).toEqual(Array.from({ length: st.days }, (_, k) => day + k));
    }
  });
  it('Read the Rival opens with Rosa\'s buying done and on show; The Right Contract opens at the bid', () => {
    const s = start(6);
    expect(s.phase).toBe('buy');
    expect(s.order).toEqual([1, 2, 0]);
    expect(s.players[1].boughtToday).toBeGreaterThan(0);
    expect(s.players[2].boughtToday).toBeGreaterThan(0);
    const c = start(9);
    expect([c.day, c.phase, c.standing?.fruit]).toEqual([3, 'order', 'apple']);
    expect(c.players.map((p) => p.cash)).toEqual([16, 16, 16]);
    expect(c.players.every((p) => count(p.stock) === 0)).toBe(true);
  });
  it('a game that does not open part-way is left as it is', () => {
    const s = newGame(leagueConfig(0, 'You', ''));
    expect(openStage(s)).toBe(s);
    expect(s.phase).toBe('morning');
  });
});

describe('the pilot\'s stages on their fixed seeds', () => {
  for (const [no, sc] of Object.entries(SCRIPTS)) {
    const i = Number(no);
    it(`${ALL_STAGES[i].title}: ${sc.lesson[0]} clears it; ${sc.naive[0]} does not`, () => {
      const good = run(start(i), sc.lesson[1]);
      const naive = run(start(i), sc.naive[1]);
      expect(stageCleared(good, 0)).toBe(true);
      expect(stageCleared(naive, 0)).toBe(false);
    });
  }
  it('every new stage and expert stage has a scripted check', () => {
    for (let i = 6; i < ALL_STAGES.length; i++) expect(SCRIPTS[i], ALL_STAGES[i].title).toBeDefined();
  });
  it('lengths: 1 to 2 days for puzzles, 3 to 4 for stock planning, 6 for the finale', () => {
    expect(LEAGUE.slice(6).map((st) => st.days)).toEqual([1, 2, 3, 3, 4, 6]);
    expect(LEAGUE[11].rivals.length).toBe(3);
  });
});

describe('goals and results', () => {
  it('stars come from the game\'s record, and the results name the exact goal missed', () => {
    const naive = run(start(6), SCRIPTS[6].naive[1]);
    naive.players[0].kind = 'human';
    expect(missedGoals(naive, 0)[0].id).toBe('rr_clear');
    const html = toStaticHtml(h(StageEnd, { s: naive, owner: 0, cleared: false, fresh: [] }));
    expect(html).toContain('Missed');
    expect(html).toContain(LEAGUE[6].clear.text);
    expect(html).not.toContain('!');
    const good = run(start(6), SCRIPTS[6].lesson[1]);
    expect(starsEarned(good, 0)).toContain('rr_clear');
    expect(toStaticHtml(h(StageEnd, { s: good, owner: 0, cleared: true, fresh: [] }))).toContain('Read the Rival cleared. Next: Sell Before It Spoils');
  });
  it('the host\'s lines after a clear only name stars that game earned', () => {
    for (const st of ALL_STAGES) {
      const ids = starGoals(st).map((m) => m.id);
      for (const line of st.after) for (const id of line.stars ?? []) expect(ids, st.title).toContain(id);
      expect(st.after[st.after.length - 1].stars).toBeUndefined();
      for (const w of [st.lesson, st.before, ...st.after.map((x) => x.text), ...starGoals(st).map((m) => m.text)]) expect(w).not.toContain('!');
    }
  });
  it('clearing moves the ladder on a main stage only, by its clear goal', () => {
    const g = run(start(6), SCRIPTS[6].lesson[1]);
    g.players[0].kind = 'human';
    saveLeagueStage(6);
    expect(finishGame(g, 0)?.cleared).toBe(true);
    expect(leagueStage()).toBe(7);
    const x = run(start(12), SCRIPTS[12].lesson[1]);
    x.players[0].kind = 'human';
    expect(isExpert(12)).toBe(true);
    const sum = finishGame(x, 0)!;
    expect(sum.cleared).toBe(false);
    expect(leagueStage()).toBe(7);
    expect(sum.stars).toContain('xr_clear');
  });
});

describe('progress from before the pilot', () => {
  const OLD: Record<number, string[]> = {
    0: ['vs_under', 'vs_top', 'vs_ahead'], 1: ['pm_floor', 'pm_profit', 'pm_sold'], 2: ['ho_win', 'ho_full', 'ho_bid'],
    3: ['hw_melon', 'hw_nine', 'hw_waste'], 4: ['gl_other', 'gl_berries', 'gl_waste'], 5: ['pb_two', 'pb_mango', 'pb_ahead'],
  };
  it('the six old stages keep their numbers and the old star ids they still have', () => {
    for (const [i, ids] of Object.entries(OLD)) {
      const st = LEAGUE[Number(i)];
      expect([...st.mastery.map((m) => m.id), ...(st.retired ?? [])].sort()).toEqual([...ids].sort());
    }
  });
  it('no stage shows fewer stars than before, for every set of old stars and every saved stage', () => {
    for (let ladder = 0; ladder <= 6; ladder++) {
      for (const [i, ids] of Object.entries(OLD)) {
        for (let mask = 0; mask < 8; mask++) {
          const old = ids.filter((_, k) => mask & (1 << k));
          const now = heldStars(old, ladder).filter((id) => starGoals(LEAGUE[Number(i)]).some((m) => m.id === id));
          expect(now.length, `stage ${Number(i) + 1}, ladder ${ladder}, ${old.join(' ')}`).toBeGreaterThanOrEqual(old.length);
          if (Number(i) < ladder) expect(now).toContain(LEAGUE[Number(i)].clear.id);
        }
      }
    }
  });
  it('an old phone loads as it was: the same stage open, its stars and more, nothing lost', () => {
    store.set('fm.ladder', JSON.stringify(6));
    store.set('fm.prog', JSON.stringify({ stars: ['vs_under', 'vs_top', 'pm_sold', 'ho_win', 'ho_full', 'hw_nine'], customers: ['Ravi'] }));
    expect(leagueStage()).toBe(6);
    expect(LEAGUE[leagueStage()].title).toBe('Read the Rival');
    const mine = myStars();
    expect(mine.length).toBeGreaterThanOrEqual(6);
    for (const id of ['vs_under', 'ho_full']) expect(mine).toContain(id);
    for (const st of LEAGUE.slice(0, 6)) expect(mine).toContain(st.clear.id);
    // what was stored stays stored
    expect(loadSets().stars).toEqual(['vs_under', 'vs_top', 'pm_sold', 'ho_win', 'ho_full', 'hw_nine']);
    expect(loadSets().customers).toEqual(['Ravi']);
  });
});

describe('the League road and expert stages', () => {
  it('draws the twelve stages and the expert stages, the next one marked, and the next trophy with its progress', () => {
    saveLeagueStage(3);
    saveSets({ stars: ['vs_under', 'ho_full'] });
    const html = toStaticHtml(h(LeagueView, { onBack: () => {}, onPlay: () => {}, sel: 3, onPick: () => {} }));
    for (const st of ALL_STAGES) expect(html).toContain(st.title);
    expect(html).toContain('Chapter 1 · Roadside Table');
    expect(html).toContain('Next trophy');
    expect(html).toMatch(/· \d+ of \d+ stars/);
    expect(html).toContain('Opens at 12 stars');
    expect(html).not.toContain('!');
    const t = nextTrophy()!;
    expect(t.got).toBeLessThan(t.goal);
  });
  it('expert stages open with stars and are off the ladder', () => {
    for (const x of EXPERTS) {
      expect(x.expert!.stars).toBeGreaterThan(0);
      expect(expertOpen(x, STAR_IDS.slice(0, x.expert!.stars - 1))).toBe(false);
      expect(expertOpen(x, STAR_IDS.slice(0, x.expert!.stars))).toBe(true);
    }
    expect(roadState(12, 12, [])).toBe('later');
    expect(roadState(12, 12, STAR_IDS.slice(0, 12))).toBe('open');
    expect(roadState(5, 6, [])).toBe('done');
    expect(roadState(6, 6, [])).toBe('now');
  });
});

describe('mastery trophies', () => {
  it('three cards with three tiers each, counted in the stars of their stages', () => {
    for (const k of Object.keys(MASTERY_STAGES) as (keyof typeof MASTERY_STAGES)[]) {
      const ids = masteryStars(k);
      expect(ids.length).toBe(6);
      const tiers = [2, 4, 6].map((n) => tierById(`${k}_${n}`)!);
      expect(tiers.map((t) => t.step.tier)).toEqual(['bronze', 'silver', 'gold']);
      expect(tiers.map((t) => tierStamps(t.step.id))).toEqual([TIER_STAMPS.bronze, TIER_STAMPS.silver, TIER_STAMPS.gold]);
    }
    expect(ACHIEVEMENTS.filter((a) => /^(contract|night|reader)_/.test(a.id)).map((a) => a.title)).toEqual(
      ['Contract Trader', 'Contract Trader', 'Contract Trader', 'Night Market Regular', 'Night Market Regular', 'Night Market Regular', 'Market Reader', 'Market Reader', 'Market Reader']);
  });
  it('give a title (Gold) and an existing Wardrobe item that is already drawn (Bronze)', () => {
    const snap = (have: string[]) => ({ ...snapshot(), have: new Set(have) });
    for (const [k, title, item] of [['contract', 'Contract Trader', 'pencil_slip'], ['night', 'Night Market Regular', 'trim_lanterns'], ['reader', 'Market Reader', 'monocle']]) {
      const t = LOOKS.find((l) => l.slot === 'title' && l.from.kind === 'trophy' && l.from.id === `${k}_6`)!;
      expect(t.title).toBe(title);
      const look = lookById(item)!;
      expect(look.also).toEqual([`${k}_2`]);
      expect(earned(look, snap([`${k}_2`]))).toBe(true);
      expect(earned(look, snap([]))).toBe(false);
      expect(earned(t, snap([`${k}_6`]))).toBe(true);
    }
  });
  it('are earned by League stars, and a normal game adds no star and no tier of them', () => {
    const g = autoplay(newGame(allAi({ ...leagueConfig(0, 'You', ''), league: undefined, stage: undefined, seed: 5 })));
    const r = evaluate(g, 0, { online: false, have: new Set(), sets: {}, stats: { played: 1, totalSold: 0 } });
    expect(r.sets.stars).toBeUndefined();
    expect(r.got.filter((id) => /^(contract|night|reader)_/.test(id))).toEqual([]);
    const full = evaluate(g, 0, { online: false, have: new Set(), sets: { stars: masteryStars('reader') }, stats: { played: 1, totalSold: 0 }, league: 0 });
    expect(full.got).toEqual(expect.arrayContaining(['reader_2', 'reader_4', 'reader_6']));
  });
  it('the stamps of an ordinary game do not change (only League stars reach the new tiers)', () => {
    const g = autoplay(newGame(allAi({ ...leagueConfig(0, 'You', ''), league: undefined, stage: undefined, seed: 9 })));
    g.players[0].kind = 'human';
    const sum = finishGame(g, 0)!;
    expect(sum.tiers.some((t) => /^(contract|night|reader)_/.test(t.id))).toBe(false);
    expect(sum.stars).toEqual([]);
    expect(START_CASH).toBe(10);
  });
});

describe('starting a stage in the app', () => {
  it('a stage game is the same every time, from where it opens', () => {
    expect(plain(played(8))).toBe(plain(played(8)));
    const s = start(7);
    expect(s.players[0].stock.blueberry).toEqual([2, 0, 0]);
    expect(s.players[0].cash).toBe(6);
    expect(beginBuying(s).phase).toBe('buy');
    expect(() => finishReveal(s)).toThrow();
  });
});
