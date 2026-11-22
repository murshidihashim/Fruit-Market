// PLAN-115: the Market League as a solo campaign. The stage set-up (a fixed seed, which event comes on which day, a
// named standing order, named customers, a rival who undercuts) only chooses among the game's own cards, applies only
// in a Market League game, and leaves every other game exactly as it was. Stars come from the finished game's record.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'preact';
import { aiStep, autoplay, openStage, planPrices } from '../src/engine/ai';
import { CUSTOMER_CARDS, EVENT_CARDS, FARMER_CARDS, ORDER_CARDS, RIVALS } from '../src/engine/data';
import {
  beginBuying, finishReveal, minPrice, newGame, rowCustomers, winners, type GameConfig, type GameState, type Level, type StageSetup,
} from '../src/engine/game';
import { ALL_STAGES, STAR_COUNT, STAR_IDS, afterLine, starGoals, starsEarned, stageStars } from '../src/ui/campaign';
import { toStaticHtml } from '../src/ui/cards';
import { LEAGUE, finishGame, leagueConfig, leagueStage, loadSets, myStars, saveLeagueStage, snapshot } from '../src/ui/progress';
import { stampsOf } from '../src/ui/stamps';
import { MasteryList, StageEnd } from '../src/ui/StageMoment';

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

/** One step of a game where every seat is a computer. */
const step = (s: GameState): GameState => (s.phase === 'morning' ? beginBuying(s) : s.phase === 'reveal' ? finishReveal(s) : aiStep(s)!);
/** A stage played by the computer for the person too (at `level`), from where the stage opens. */
function played(stage: number, level: Level = 'normal', seed?: number): GameState {
  const s = openStage(newGame(leagueConfig(stage, 'You', '', seed)));
  s.players[0] = { ...s.players[0], kind: 'ai', level };
  return autoplay(s);
}
const allAi = (c: GameConfig): GameConfig => ({ ...c, players: c.players.map((p) => ({ ...p, kind: 'ai' as const, level: p.level ?? 'normal' })) });
const EVERYTHING: StageSetup = { events: { 2: 'glut', 3: 'heatwave' }, orders: { 3: 'Beach Resort' }, crowd: { 2: ['Ravi', 'Lina'] }, undercut: [1] };
const plain = (s: GameState) => JSON.stringify({ ...s, config: null });

describe('the stage set-up is ignored outside the Market League', () => {
  const base: GameConfig = allAi({ ...leagueConfig(2, 'You', ''), league: undefined, stage: undefined, seed: 77 });
  it('a game with no league plays exactly as without it', () => {
    for (const seed of [3, 77, 901]) {
      const a = autoplay(newGame({ ...base, seed }));
      const b = autoplay(newGame({ ...base, seed, stage: EVERYTHING }));
      expect(plain(b)).toBe(plain(a));
    }
  });
  it('a Daily market plays exactly as without it, even with a league stage number', () => {
    const daily = { ...base, daily: '2026-11-21' };
    expect(plain(autoplay(newGame({ ...daily, league: 2, stage: EVERYTHING })))).toBe(plain(autoplay(newGame(daily))));
  });
  it('an old league game (saved before the campaign, no set-up) plays as any game does', () => {
    const old = autoplay(newGame({ ...base, league: 0 }));
    expect(plain(old)).toBe(plain(autoplay(newGame(base))));
    expect(starsEarned(old, 0)).toEqual([]);
  });
});

describe('the stages', () => {
  it('only name cards, customers, orders and lorries the game already has; each has a clear star and two optional stars', () => {
    const events = new Set<string>(EVENT_CARDS.map((e) => e.id));
    for (const st of ALL_STAGES) {
      for (const id of Object.values(st.setup.events ?? {})) expect(events.has(id), id).toBe(true);
      for (const n of Object.values(st.setup.orders ?? {})) expect(ORDER_CARDS.some((o) => o.name === n), n).toBe(true);
      for (const ns of Object.values(st.setup.crowd ?? {})) for (const n of ns) expect(CUSTOMER_CARDS.some((c) => c.name === n), n).toBe(true);
      for (const n of Object.values(st.setup.lorry ?? {})) expect(FARMER_CARDS.some((c) => c.name === n), n).toBe(true);
      expect(st.mastery.length).toBe(2);
      expect(starGoals(st).length).toBe(3);
      for (const r of st.rivals) expect(RIVALS[r.idx]).toBeDefined();
    }
    expect(new Set(STAR_IDS).size).toBe(STAR_COUNT);
    // PLAN-118: twelve stages and two expert stages, three stars each
    expect(STAR_COUNT).toBe(42);
  });

  it('follow the approved order: undercut, Pasar Malam, the resort\'s order, Heatwave, Glut, premium buyers, then the pilot\'s six', () => {
    // REP-133 A-12: stage 3 is named after its Beach Resort order (it was "The Hotel Order").
    expect(LEAGUE.map((s) => s.title)).toEqual(['Village Square', 'Pasar Malam', 'The Resort Order', 'Heatwave', 'Glut', 'Premium Buyers',
      'Read the Rival', 'Sell Before It Spoils', 'Time the Mangoes', 'The Right Contract', 'Rescue the Stall', 'Village Finale']);
    expect(LEAGUE[0].setup.undercut).toEqual([1]);
    expect(Object.values(LEAGUE[1].setup.events!)).toContain('pasarMalam');
    expect(LEAGUE[2].setup.orders).toEqual({ 3: 'Beach Resort' });
    expect(Object.values(LEAGUE[3].setup.events!)).toContain('heatwave');
    expect(Object.values(LEAGUE[4].setup.events!)).toContain('glut');
    expect(Object.values(LEAGUE[5].setup.crowd!).flat().every((n) => ['Rara Jenab', 'Ravi', 'Ahmad', 'Anna', 'Devi', 'Lina'].includes(n))).toBe(true);
  });

  it('bring their event cards on their days and no other event', () => {
    for (let i = 0; i < LEAGUE.length; i++) {
      const g = played(i);
      expect(g.phase).toBe('over');
      for (const d of g.history!) expect(d.event, `stage ${i + 1} day ${d.day}`).toBe(LEAGUE[i].setup.events?.[d.day]);
    }
  });

  it('a stage is the same game every time (fixed seed)', () => {
    expect(plain(played(3))).toBe(plain(played(3)));
  });

  it('The Resort Order announces the Beach Resort\'s order on day 3, due on day 5', () => {
    let s = newGame(allAi(leagueConfig(2, 'You', '')));
    while (!(s.day === 3 && s.phase === 'morning')) s = step(s);
    expect(ORDER_CARDS[s.standing!.card].name).toBe('Beach Resort');
    expect(s.standing!.due).toBe(5);
  });

  it('Premium Buyers brings Ravi, Lina and Anna on day 5, and only on day 5', () => {
    let s = newGame(allAi(leagueConfig(5, 'You', '')));
    while (!(s.day === 5 && s.phase === 'morning')) s = step(s);
    expect([s.forecast?.name, ...s.queue.map((c) => c.name)]).toEqual(['Ravi', 'Lina', 'Anna']);
    expect(s.forecast?.walkIn).toBeFalsy();
    expect(s.queue.every((c) => c.walkIn)).toBe(true);
    const g = autoplay(s);
    expect(new Set(g.history![4].lines.map((l) => l.name))).toEqual(new Set(['Ravi', 'Lina', 'Anna']));
    // kept back for their day: none of them comes earlier
    for (const d of g.history!.slice(0, 4)) for (const l of d.lines) expect(['Ravi', 'Lina', 'Anna']).not.toContain(l.name);
  });

  it('Rosa undercuts: $1 under the best top price she can see, from what is public only', () => {
    let s = newGame(allAi(leagueConfig(0, 'You', '')));
    let checked = 0;
    while (s.phase !== 'over') {
      if (s.phase === 'bid' && s.bids[1] === null) {
        const posts = planPrices(s, 1).posts;
        for (const p of posts) {
          const tops = rowCustomers(s).flatMap((c) => c.wants.filter((w) => w.fruit === p.fruit && w.qty > 0).map((w) => w.max));
          // never above the best printed top price less $1 (an Okay piece's cap is lower still)
          expect(p.price).toBeLessThanOrEqual(Math.max(minPrice(s, p.fruit), Math.max(...tops) + 2 - 1));
          checked++;
        }
        // Rosa's prices do not change with anything secret: the person's crate, shelf and prices.
        const hidden: GameState = JSON.parse(JSON.stringify(s));
        hidden.bids[0] = hidden.bids[0] ? hidden.bids[0].map((b) => ({ ...b, price: 1 })) : null;
        for (const f of Object.keys(hidden.players[0].stock) as (keyof typeof hidden.players[0]['stock'])[]) hidden.players[0].stock[f] = hidden.players[0].stock[f].map(() => 0);
        expect(planPrices(hidden, 1).posts).toEqual(posts);
      }
      s = step(s);
    }
    expect(checked).toBeGreaterThan(3);
    // in the record, Rosa's sales are at $1 under the customer's top price
    const rosa = s.history!.flatMap((d) => d.lines).flatMap((l) => l.offers.filter((o) => o.player === 1 && o.sold > 0).map((o) => l.max - o.price));
    expect(rosa.length).toBeGreaterThan(0);
    expect(rosa.filter((d) => d === 1).length).toBeGreaterThanOrEqual(rosa.length / 2);
  });

  it('the same seat priced by an ordinary computer outside the league does not undercut', () => {
    const cfg = allAi(leagueConfig(0, 'You', ''));
    const a = autoplay(newGame(cfg));
    const b = autoplay(newGame({ ...cfg, stage: { ...cfg.stage, undercut: [] } }));
    expect(plain(a)).not.toBe(plain(b));
  });
});

describe('clearing a stage', () => {
  // PLAN-118: the pilot's new stages are checked by scripted players instead (tests/league-pilot.test.ts).
  it('on its own seed: a careful player (the Normal computer) clears each of the first six stages, a careless one (Easy) does not', () => {
    for (let i = 0; i < 6; i++) {
      expect(winners(played(i, 'normal')).includes(0), `stage ${i + 1}, Normal`).toBe(true);
      expect(winners(played(i, 'easy')).includes(0), `stage ${i + 1}, Easy`).toBe(false);
    }
  });
});

describe('stars', () => {
  it('come only from a campaign stage, and are the stage\'s own', () => {
    for (let i = 0; i < LEAGUE.length; i++) {
      const g = played(i, 'hard');
      const got = starsEarned(g, 0);
      for (const id of got) expect(starGoals(LEAGUE[i]).map((m) => m.id)).toContain(id);
    }
    const g = played(0);
    expect(starsEarned({ ...g, config: { ...g.config, stage: undefined } }, 0)).toEqual([]);
    expect(starsEarned({ ...g, config: { ...g.config, league: undefined } }, 0)).toEqual([]);
    expect(starsEarned({ ...g, phase: 'evening' }, 0)).toEqual([]);
  });

  it('read the game\'s record: a sale $1 under Rosa, a sale at the top price, $10 ahead', () => {
    const g = played(0);
    const line = { customerId: 1, name: 'Ravi', fruit: 'apple' as const, want: 1, max: 8, offers: [{ player: 0, qty: 1, price: 6, sold: 1, freshness: 0 }, { player: 1, qty: 1, price: 7, sold: 0, freshness: 0 }] };
    const top = { ...line, customerId: 2, offers: [{ player: 0, qty: 1, price: 8, sold: 1, freshness: 0 }] };
    const made = (lines: typeof line[], cash: number[]): GameState => ({ ...g, history: [{ day: 1, lines, income: [0, 0], cash }], players: g.players.map((p, i) => ({ ...p, cash: cash[i] })) });
    // PLAN-118: the stage keeps "$1 under Rosa" and "$10 ahead"; "the top price" was retired
    const vs = LEAGUE[0].mastery;
    expect(vs.map((m) => m.met(made([line], [20, 15]), 0))).toEqual([true, false]);
    expect(vs.map((m) => m.met(made([top], [30, 20]), 0))).toEqual([false, true]);
  });

  it('are kept on the phone and counted by the League stars trophy; a normal game adds none', () => {
    const before = stampsOf(snapshot()).total;
    const normal = autoplay(newGame(allAi({ ...leagueConfig(0, 'You', ''), league: undefined, stage: undefined, seed: 5 })));
    normal.players[0].kind = 'human';
    finishGame(normal, 0);
    expect(loadSets().stars).toBeUndefined();
    expect(stampsOf(snapshot()).total).toBeGreaterThan(before);
    const g = played(0, 'normal');
    g.players[0].kind = 'human';
    const sum = finishGame(g, 0)!;
    expect(sum.stars.length).toBeGreaterThan(0);
    expect(myStars()).toEqual(sum.stars);
    expect(stageStars(0, myStars())).toEqual(sum.stars);
    expect(stageStars(1, myStars())).toEqual([]);
  });

  it('a phone with no stars stored (an old save) has none, and its saved stage still opens the same stage', () => {
    expect(myStars()).toEqual([]);
    // PLAN-118: "vs_top" was retired; the star it was is kept as one of the stage's optional stars
    store.set('fm.prog', JSON.stringify({ stars: ['vs_top', 'not_a_star', 3] }));
    expect(myStars()).toEqual(['vs_under']);
    saveLeagueStage(3);
    expect(leagueStage()).toBe(3);
    expect(leagueConfig(leagueStage(), 'You', '').league).toBe(3);
    expect(LEAGUE[leagueStage()].title).toBe('Heatwave');
    // and the three stages passed bring their clear stars
    expect(myStars()).toEqual(['vs_clear', 'vs_under', 'pm_clear', 'ho_clear']);
  });
});

describe('on screen', () => {
  it('the stars list says each goal and which are earned, without an exclamation mark', () => {
    const html = toStaticHtml(h(MasteryList, { stage: 2, have: ['ho_full'], fresh: ['ho_full'] }));
    for (const m of starGoals(LEAGUE[2])) expect(html).toContain(m.text);
    expect(html).toContain('earned this game');
    expect(html).not.toContain('!');
  });
  it('the results show the stage\'s moment and stars after a stage game', () => {
    const g = played(0, 'normal');
    const html = toStaticHtml(h(StageEnd, { s: g, owner: 0, cleared: true, fresh: [] }));
    expect(html).toContain('Village Square cleared. Next: Pasar Malam');
    expect(html).toContain(afterLine(LEAGUE[0], starsEarned(g, 0)));
    expect(html).toContain('Stars for this stage');
  });
});
