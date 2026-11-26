// REP-140 A-02, A-10 (PLAN-130): App.tsx's pure parts (appNav.ts): where each screen's Back goes, Android's back button
// and the browser's Back step by step, the place New game's "Start over" leads to, the results' main button for each
// mode, and the saved game of each mode (PLAN-120: a game in one mode never replaces a game in another).
import { describe, expect, it } from 'vitest';
import { CHARACTER_AVATARS } from '../src/engine/data';
import { dailyConfig, sprintConfig } from '../src/engine/daily';
import { newGame, type GameConfig, type GameState } from '../src/engine/game';
import { BACK_TO, androidBack, browserBack, isAway, rematchOf, startOverTo, withGame, type NavState, type Screen } from '../src/ui/appNav';
import { vsComputerConfig } from '../src/ui/playMenu';
import { leagueConfig } from '../src/ui/progress';
import { slotOf, type SaveSlot } from '../src/ui/store';

const DATE = '2026-11-26';
const at = (screen: Screen, more: Partial<NavState> = {}): NavState => ({ screen, homeTab: 'market', popup: null, swap: false, from: 'home', ...more });
const ALL: Screen[] = ['home', 'play', 'game', 'settings', 'online', 'quick', 'setup', 'trophies', 'wardrobe', 'league', 'intro'];

describe('where Back goes (the routing table)', () => {
  it('every screen has a way back: the online screens and the set-up to where they were opened from, the rest to Home', () => {
    expect(Object.keys(BACK_TO).sort()).toEqual([...ALL].sort());
    expect(ALL.filter((s) => BACK_TO[s] === 'from').sort()).toEqual(['online', 'quick', 'setup']);
  });

  it('Home with nothing open over it is the one place that is not "away" (it holds no history entry)', () => {
    expect(isAway(at('home'))).toBe(false);
    expect(isAway(at('home', { homeTab: 'rules' }))).toBe(true);
    expect(isAway(at('home', { popup: 'account' }))).toBe(true);
    expect(isAway(at('home', { swap: true }))).toBe(true);
    for (const s of ALL.filter((x) => x !== 'home')) expect(isAway(at(s)), s).toBe(true);
  });
});

describe('Android\'s back button', () => {
  it('closes the question first, then a pop-up, then Home\'s other tab, then leaves the app from Home', () => {
    expect(androidBack(at('home', { swap: true, popup: 'newgame' }))).toEqual({ kind: 'closeSwap' });
    expect(androidBack(at('home', { popup: 'newgame' }))).toEqual({ kind: 'closePopup' });
    expect(androidBack(at('home', { homeTab: 'stall' }))).toEqual({ kind: 'market' });
    expect(androidBack(at('home'))).toEqual({ kind: 'exitApp' });
  });

  it('leaves any other screen: the online screens and the set-up to where they came from, a game straight to Home', () => {
    expect(androidBack(at('quick', { from: 'play' }))).toEqual({ kind: 'screen', to: 'play' });
    expect(androidBack(at('setup', { from: 'home' }))).toEqual({ kind: 'screen', to: 'home' });
    expect(androidBack(at('online', { from: 'play' }))).toEqual({ kind: 'screen', to: 'play' });
    for (const s of ['game', 'settings', 'trophies', 'wardrobe', 'league', 'intro', 'play'] as Screen[]) expect(androidBack(at(s, { from: 'play' }))).toEqual({ kind: 'screen', to: 'home' });
  });
});

describe('the browser\'s Back (PLAN-123)', () => {
  it('moves inside the game as Android\'s button does, and leaves a game as its own Home button leaves it', () => {
    expect(browserBack(at('league', { swap: true }))).toEqual({ kind: 'closeSwap' });
    expect(browserBack(at('play', { popup: 'account' }))).toEqual({ kind: 'closePopup' });
    expect(browserBack(at('game'))).toEqual({ kind: 'leaveGame' });
    expect(browserBack(at('quick', { from: 'play' }))).toEqual({ kind: 'screen', to: 'play' });
    expect(browserBack(at('wardrobe'))).toEqual({ kind: 'screen', to: 'home' });
    expect(browserBack(at('home', { homeTab: 'rules' }))).toEqual({ kind: 'market' });
  });

  it('never leaves the page from Home (the page\'s own Back does that, with no entry of ours left)', () => {
    expect(browserBack(at('home'))).toEqual({ kind: 'none' });
  });
});

describe('Start over and the results\' main button', () => {
  it('Start over leads to the place that starts a game of that mode', () => {
    expect(startOverTo('daily')).toEqual({ intro: 'daily' });
    expect(startOverTo('sprint')).toEqual({ intro: 'sprint' });
    expect(startOverTo('league')).toEqual({ screen: 'league' });
    expect(startOverTo('play')).toEqual({ screen: 'play' });
  });

  it('plays the finished game\'s own mode again (REP-136 R120-01)', () => {
    const computer = vsComputerConfig('You', CHARACTER_AVATARS[0], 1, () => 0, 4);
    expect(rematchOf(sprintConfig(DATE, 'You'), false, 0, 12)).toEqual({ kind: 'sprint', date: DATE });
    expect(rematchOf(dailyConfig(DATE, 'You'), false, 0, 12)).toEqual({ kind: 'home' });
    expect(rematchOf(computer, false, 0, 12)).toEqual({ kind: 'again' });
    // a League stage: Next stage when cleared, the Trophies after the last one, else the same stage again
    expect(rematchOf(leagueConfig(2, 'You', ''), true, 3, 12)).toEqual({ kind: 'league', stage: 3 });
    expect(rematchOf(leagueConfig(11, 'You', ''), true, 12, 12)).toEqual({ kind: 'trophies' });
    expect(rematchOf(leagueConfig(2, 'You', ''), false, 2, 12)).toEqual({ kind: 'league', stage: 2 });
  });
});

describe('a saved game per mode (Continue and the saved slots)', () => {
  const computer = vsComputerConfig('You', CHARACTER_AVATARS[0], 1, () => 0, 4);
  const configs: [SaveSlot, GameConfig][] = [['play', computer], ['league', leagueConfig(0, 'You', '')], ['daily', dailyConfig(DATE, 'You')], ['sprint', sprintConfig(DATE, 'You')]];

  it('a new game goes in its own mode\'s slot and leaves the others as they were', () => {
    let games: Partial<Record<SaveSlot, GameState>> = {};
    for (const [slot, cfg] of configs) {
      const g = newGame(cfg);
      expect(slotOf(cfg)).toBe(slot);
      const before = games;
      games = withGame(games, slotOf(cfg), g);
      expect(before).not.toBe(games);
      expect(games[slot]).toBe(g);
    }
    expect(Object.keys(games).sort()).toEqual(['daily', 'league', 'play', 'sprint']);
    // Continue on one card is that mode's game; a finished game let go empties its slot only
    const after = withGame(games, 'daily', null);
    expect(Object.keys(after).sort()).toEqual(['league', 'play', 'sprint']);
    expect(after.play).toBe(games.play);
    expect(games.daily).toBeDefined();
  });
});
