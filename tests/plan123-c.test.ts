// PLAN-123, part C: the preview findings about the Sprint results, the Sprint's words and the League's trophy and stars,
// and the Home, settings and sound polish. Each test reads the game's own code and data.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aiStep, planPrices, planStall } from '../src/engine/ai';
import { FRUITS, TRAITS } from '../src/engine/data';
import { sprintConfig } from '../src/engine/daily';
import { applyAction, beginBuying, canBuy, finishReveal, newGame, type Action, type GameConfig, type GameState } from '../src/engine/game';
import { introWords, SPRINT_EVENTS_LINE, SPRINT_PERK_LINE } from '../src/ui/DailyIntro';
import { MODES, continueWords } from '../src/ui/HomeCards';
import { nextTrophy, opensWhen, starsFoot, trophyWhere } from '../src/ui/League';
import { EXPERTS, LEAGUE, STAR_COUNT } from '../src/ui/campaign';
import { isReduced, setStill } from '../src/ui/motion';
import { waitingGame } from '../src/ui/paused';
import { finishGame, saveLeagueStage, saveSets } from '../src/ui/progress';
import { boardWords, perkWords, runLine } from '../src/ui/Sprint';
import { STAR_WORD, starState } from '../src/ui/StageMoment';
import { loadSprintBest } from '../src/ui/sprintStore';
import { loadSettings, loadStats, saveSettings } from '../src/ui/store';
import { fx } from '../src/ui/fx';
import { leagueNext } from '../src/ui/game/panels/Results';

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
});
afterEach(() => { setStill(false); vi.unstubAllGlobals(); });

const DATE = '2026-11-22';

/** Plays a game as a simple person (as tests/sprint.test.ts): picks perk `perk`, buys a little, prices like the computer.
 *  `buy` false: buys nothing, so nothing is sold. */
function play(cfg: GameConfig, perk = 0, buy = true): GameState {
  let s = newGame(cfg);
  const me = s.players.findIndex((p) => p.kind === 'human');
  const act = (a: Action) => { s = applyAction(s, me, a); };
  for (let i = 0; i < 5000 && s.phase !== 'over'; i++) {
    if (s.phase === 'morning') {
      if (s.day === 1 && !s.players[me].trait) { act({ kind: 'trait', trait: s.players[me].traitOffer![perk % s.players[me].traitOffer!.length] }); continue; }
      s = beginBuying(s); continue;
    }
    if (s.phase === 'reveal') { s = finishReveal(s); continue; }
    const ai = aiStep(s);
    if (ai) { s = ai; continue; }
    if (s.phase === 'buy') {
      const pick = FRUITS.flatMap((f) => s.market[f].map((_, pos) => ({ f, pos }))).find(({ f, pos }) => !canBuy(s, me, f, pos));
      if (buy && pick && s.players[me].boughtToday < 2) act({ kind: 'buy', fruit: pick.f, pos: pick.pos });
      else act({ kind: 'endBuy' });
    } else if (s.phase === 'stall') act({ kind: 'stall', stall: planStall(s, me) });
    else if (s.phase === 'bid') act({ kind: 'prices', posts: planPrices(s, me).posts });
    else if (s.phase === 'order') act({ kind: 'order', price: null });
    else if (s.phase === 'evening') act({ kind: 'endEvening' });
    else if (s.phase === 'tie') act({ kind: 'tie', play: true });
  }
  return s;
}

describe('finding 6: a Sprint\'s rewards are counted once', () => {
  it('opening the results again, or after a reload, never adds the run\'s games, stamps or best a second time', async () => {
    const s = play(sprintConfig(DATE, 'Tester'));
    expect(s.phase).toBe('over');
    const first = finishGame(s, 0)!;
    expect(first.earned).toBeGreaterThan(0);
    expect(first.lines.some((l) => /days played/.test(l.text))).toBe(true);
    const stats = loadStats();
    const best = loadSprintBest()[DATE];
    // the same visit draws the results again: the same words, nothing added
    expect(finishGame(s, 0)).toEqual(first);
    // a reload: the module starts afresh, the phone's storage is what it was
    vi.resetModules();
    const again = await import('../src/ui/progress');
    const second = again.finishGame(s, 0)!;
    expect(second.earned).toBe(0);
    expect(second.lines.filter((l) => /days played/.test(l.text))).toEqual([]);
    expect(loadStats()).toEqual(stats);
    expect(loadSprintBest()[DATE]).toEqual(best);
  });

  it('the board says each of its states: checking, a place, nobody yet, not on it, offline or an error, with a way to check again', () => {
    expect(boardWords(null)).toEqual({ text: 'Checking the board…', place: null, retry: false, busy: true });
    expect(boardWords({ day: { top: [], players: 12, rank: 3, around: [] } })).toMatchObject({ place: '3rd of 12', retry: false, busy: false });
    expect(boardWords({ day: { top: [], players: 0, around: [] } })).toMatchObject({ text: 'Nobody is on today\'s board yet.', retry: true });
    expect(boardWords({ day: { top: [{ place: 1, name: 'A', cash: 9, sold: 2 }], players: 1, around: [] } })).toMatchObject({ text: 'Not on today\'s board yet.', retry: true });
    expect(boardWords({ error: 'The leaderboard needs an internet connection.' })).toMatchObject({ text: 'The leaderboard needs an internet connection.', retry: true });
    expect(boardWords({ error: 'Your score could not be sent.' })).toMatchObject({ retry: true, place: null });
  });
});

describe('finding 7: the Sprint says what is the same for everyone', () => {
  it('the same market and the same perk offer, not "the same start"; "no twist" still has the regular event cards', () => {
    const w = introWords('sprint', DATE);
    const all = [w.goal, ...w.how].join(' ');
    expect(all).not.toMatch(/same start/i);
    expect(w.goal).toMatch(/same market/);
    expect(w.goal).toMatch(/same perks/);
    expect(w.how).toContain(SPRINT_PERK_LINE);
    expect(w.how).toContain(SPRINT_EVENTS_LINE);
    expect(SPRINT_EVENTS_LINE).toMatch(/event cards still come up/);
    // the code agrees: event cards are on in the Sprint, upgrades are off
    expect(sprintConfig(DATE, 'x').events).toBe(true);
    expect(sprintConfig(DATE, 'x').upgrades).toBe(false);
    expect(all).not.toContain('!');
  });

  it('the results name the perk the run was played with, in the perk\'s own words', () => {
    const s = play(sprintConfig(DATE, 'Tester'));
    const t = s.players[0].trait!;
    expect(perkWords(s, 0)).toBe(`Your perk: ${TRAITS[t].title}. ${TRAITS[t].text}`);
    expect(TRAITS.nestegg.text).toMatch(/\$15 instead of \$10/);
  });

  it('a run with no sale says so, with the cash it ended with', () => {
    const s = play(sprintConfig(DATE, 'Tester'), 0, false);
    expect(s.players[0].stats.sold).toBe(0);
    expect(runLine(s, 0)!.text).toMatch(new RegExp(`^You made no sales and ended with \\$${s.players[0].cash}\\.`));
  });
});

describe('finding 8: the League\'s next trophy, star totals and closed stages', () => {
  it('on stage 1 the next trophy is one stage 1 adds stars to (not Contract Trader), and it names its stages', () => {
    saveLeagueStage(0);
    const t = nextTrophy()!;
    expect(t.title).not.toBe('Contract Trader');
    expect(t.title).toBe('Market Reader');
    expect(t.where).toBe('Counts the stars of stage 1, Village Square, and stage 7, Read the Rival.');
  });
  it('on stage 3 (The Resort Order) Contract Trader is the one, and says the stages that count', () => {
    saveLeagueStage(2);
    saveSets({ stars: ['vs_clear', 'vs_under', 'vs_ahead', 'pm_clear'] });
    const t = nextTrophy()!;
    expect(t.title).toBe('Contract Trader');
    expect(t.where).toMatch(/stage 3, The Resort Order, and stage 10, The Right Contract/);
  });
  it('the League stars trophy counts every star', () => {
    saveLeagueStage(3);
    const t = nextTrophy()!;
    expect(t.title).toBe('League stars');
    expect(trophyWhere(t.card)).toBe('Counts every League star.');
  });
  it('the foot names both parts of the total, and the parts add up to it', () => {
    expect(LEAGUE.length * 3 + EXPERTS.length * 3).toBe(STAR_COUNT);
    expect(starsFoot(['vs_clear'])).toContain(`Stars: 1 of ${STAR_COUNT} in all, ${LEAGUE.length * 3} in Chapter 1 and ${EXPERTS.length * 3} on the expert stages.`);
  });
  it('a stage not open yet says what opens it', () => {
    expect(opensWhen(4, [])).toBe('Opens when you clear stage 4, Heatwave');
    expect(opensWhen(LEAGUE.length, [])).toMatch(/^Opens at \d+ stars · you have 0$/);
  });
  it('each star on the results says what this game did about it', () => {
    expect(starState('a', ['a'], ['a'], ['a'])).toBe('new');
    expect(starState('a', ['a'], [], ['a'])).toBe('again');
    expect(starState('a', ['a'], [], [])).toBe('held');
    expect(starState('a', [], [], [])).toBe('missed');
    expect(Object.values(STAR_WORD)).toEqual(['New', 'Met again', 'Earned before', 'Missed']);
  });
});

describe('League results: the next action says what it asks of you', () => {
  it('cleared: the next stage by name and its clear goal; not cleared: the goal that clears this stage', () => {
    expect(leagueNext(0, true)).toBe(`Next stage: ${LEAGUE[1].title}. To clear it: ${LEAGUE[1].clear.text.replace(/\.$/, '')}.`);
    expect(leagueNext(0, false)).toBe('To clear this stage: Win the stage. A shared win counts.');
    expect(leagueNext(LEAGUE.length - 1, true)).toBe('Chapter 1 is cleared. Your stamp book has the rewards.');
  });
});

describe('Home: every mode one tap from the first view, and Continue names the game', () => {
  it('four mode tabs, each with its own save slot (PLAN-124: the tabs replace the four chips; tests/home-cards.test.ts draws them)', () => {
    expect(MODES.map((m) => [m.tab, m.slot])).toEqual([['Match', 'play'], ['League', 'league'], ['Daily', 'daily'], ['Sprint', 'sprint']]);
  });
  it('Continue says the mode (with the League stage), the day and the cash', () => {
    const w = waitingGame({ ...newGame(sprintConfig(DATE, 'You')), day: 2 })!;
    expect(continueWords(w)).toBe(`Sprint · Day 2 of 3 · $${w.cash}`);
  });
});

describe('settings: Reduced motion and sound', () => {
  it('the game\'s own Reduced motion switch makes the clock show the end state at once, and is kept', () => {
    expect(isReduced()).toBe(false);
    setStill(true);
    expect(isReduced()).toBe(true);
    saveSettings({ ...loadSettings(), still: true });
    expect(loadSettings().still).toBe(true);
  });
  it('sound off stays off after a reload (the setting is read from storage each time)', () => {
    saveSettings({ ...loadSettings(), sound: false });
    expect(JSON.parse(store.get('fm.settings')!).sound).toBe(false);
    expect(loadSettings().sound).toBe(false);
  });
  it('each sound cue is its own: no two cues make the same notes', () => {
    const heard: number[] = [];
    class Speaker {
      currentTime = 0; destination = {};
      createOscillator() { return { type: 'sine', frequency: { setValueAtTime: (f: number) => { heard.push(f); } }, connect: <T>(g: T) => g, start() {}, stop() {} }; }
      createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: <T>(d: T) => d }; }
      resume() { return Promise.resolve(); }
    }
    vi.stubGlobal('AudioContext', Speaker);
    const notes: Record<string, string> = {};
    for (const k of Object.keys(fx) as (keyof typeof fx)[]) {
      heard.length = 0;
      fx[k]();
      notes[k] = heard.join(',');
    }
    const seen = Object.values(notes);
    expect(seen.every((n) => n.length > 0)).toBe(true);
    expect(new Set(seen).size).toBe(seen.length);
  });
});
