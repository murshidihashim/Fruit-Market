// REP-140 A-08: the screens App.tsx loads on demand (onDemand.tsx): those most players open rarely or once (the online
// screens, the Market League, the stamp book and the Wardrobe, its fourth page, Settings, the account panel and the
// full-screen question; How to play is HowTo.tsx's), and the game itself, which Home does not need, fetched first as the
// app opens. Each screen's styles stay with the main script, in the same place among the others, so nothing is drawn
// unstyled while it loads.
import { onDemand } from './onDemand';
import './journey-online.css';

export const gameScreen = onDemand(() => import('./Game').then((m) => m.Game));
export const onlineScreen = onDemand(() => import('./Online').then((m) => m.Online));
export const leagueScreen = onDemand(() => import('./League').then((m) => m.LeagueScreen));
export const trophyScreen = onDemand(() => import('./Trophies').then((m) => m.TrophyScreen));
export const settingsScreen = onDemand(() => import('./Settings').then((m) => m.SettingsScreen));
export const accountPanel = onDemand(() => import('./AccountPanel').then((m) => m.AccountPanel));
export const fullscreenPrompt = onDemand(() => import('./FullScreenButton').then((m) => m.FullscreenPrompt));
