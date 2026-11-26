// The app's screens and where Back goes (App.tsx draws them). Pure, so it can be unit tested (REP-140 A-02, A-10).
import type { GameConfig } from '../engine/game';
import type { DailyKind } from './DailyIntro';
import type { HomeTab } from './Home';
import type { SaveSlot } from './store';

// PLAN-125: 'setup' is the one-page set-up for Computer or Pass & Play (Setup.tsx); 'quick' the Quick Match set-up and
// wait, 'online' the Private Room (Online.tsx).
export type Screen = 'home' | 'play' | 'game' | 'settings' | 'online' | 'quick' | 'setup' | 'trophies' | 'wardrobe' | 'league' | 'intro';
export type PopupKind = 'newgame' | 'account';

/**
 * Where each screen's Back goes. PLAN-113: the online screens and (PLAN-125) the set-up go back to where they were
 * opened from (the Play page, or Home); every other screen goes back to Home.
 */
export const BACK_TO: Record<Screen, 'from' | 'home'> = {
  home: 'home', play: 'home', league: 'home', intro: 'home', game: 'home', settings: 'home', trophies: 'home', wardrobe: 'home',
  online: 'from', quick: 'from', setup: 'from',
};

/** What is on screen, as far as Back is concerned. `swap`: the question before a waiting game is replaced is open. */
export interface NavState { screen: Screen; homeTab: HomeTab; popup: PopupKind | null; swap: boolean; from: Screen }

/** One step back: close the question or the pop-up, go to a screen or Home's Market tab, leave the game, or leave the app. */
export type BackStep =
  | { kind: 'closeSwap' } | { kind: 'closePopup' } | { kind: 'market' } | { kind: 'exitApp' } | { kind: 'leaveGame' }
  | { kind: 'screen'; to: Screen } | { kind: 'none' };

/** PLAN-123: away from Home (its Market tab, nothing open over it), the browser's Back has one history entry to use. */
export const isAway = (n: NavState): boolean => n.screen !== 'home' || n.homeTab !== 'market' || !!n.popup || n.swap;

const backTo = (n: NavState): Screen => (BACK_TO[n.screen] === 'from' ? n.from : 'home');

/**
 * Android's back button: closes the question or the pop-up, then Home's other tab, then leaves the app from Home; any
 * other screen goes back (a game straight to Home, where it waits in its slot).
 */
export function androidBack(n: NavState): BackStep {
  if (n.swap) return { kind: 'closeSwap' };
  if (n.popup) return { kind: 'closePopup' };
  if (n.screen === 'home') return n.homeTab !== 'market' ? { kind: 'market' } : { kind: 'exitApp' };
  return { kind: 'screen', to: backTo(n) };
}

/**
 * PLAN-123: the browser's Back (and a phone's back gesture in the browser) moves inside the game as Android's button
 * does, but never leaves the page from inside it: a game is left as its own Home button leaves it.
 */
export function browserBack(n: NavState): BackStep {
  if (n.swap) return { kind: 'closeSwap' };
  if (n.popup) return { kind: 'closePopup' };
  if (n.screen === 'game') return { kind: 'leaveGame' };
  if (n.screen !== 'home') return { kind: 'screen', to: backTo(n) };
  return n.homeTab !== 'market' ? { kind: 'market' } : { kind: 'none' };
}

/** After "Start over" on a waiting game (PLAN-120): the place that starts a game of that mode. */
export function startOverTo(slot: SaveSlot): { intro: DailyKind } | { screen: Screen } {
  if (slot === 'daily' || slot === 'sprint') return { intro: slot };
  return { screen: slot === 'league' ? 'league' : 'play' };
}

/**
 * The results' main button for a finished game (REP-136 R120-01: the finished game's own set-up, never the last game
 * started in this visit): the same Sprint again; Home after a Daily market; after a League stage, the next stage when
 * it was cleared (the Trophies when it was the last), else the same stage; otherwise the same set-up on a new seed.
 * `cleared` and `stageNow` (the stage the League is at) are read after the game is counted.
 */
export type Rematch =
  | { kind: 'sprint'; date: string } | { kind: 'home' } | { kind: 'trophies' } | { kind: 'league'; stage: number } | { kind: 'again' };
export function rematchOf(cfg: Pick<GameConfig, 'daily' | 'sprint' | 'league'>, cleared: boolean, stageNow: number, stages: number): Rematch {
  if (cfg.sprint && cfg.daily) return { kind: 'sprint', date: cfg.daily };
  if (cfg.daily) return { kind: 'home' };
  if (cfg.league !== undefined) {
    if (cleared && stageNow >= stages) return { kind: 'trophies' };
    return { kind: 'league', stage: cleared ? stageNow : cfg.league };
  }
  return { kind: 'again' };
}

/** The saved games with one slot's game put in, or taken out (null). */
export function withGame<G>(games: Partial<Record<SaveSlot, G>>, slot: SaveSlot, g: G | null): Partial<Record<SaveSlot, G>> {
  const n = { ...games };
  if (g) n[slot] = g;
  else delete n[slot];
  return n;
}
