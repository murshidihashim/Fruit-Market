// The app: Home, the Play page and the set-ups, the online screens, the Market League, the Daily and Sprint intros, the
// Trophies, the Wardrobe, Settings and the game itself. Which screens there are and where Back goes are appNav.ts's.
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { App as CapApp } from '@capacitor/app';
import { newGame, type GameConfig, type GameState } from '../engine/game';
import { openStage } from '../engine/ai';
import { dailyConfig, sprintConfig } from '../engine/daily';
import { PlayMenu, Popup, ReplaceBody, Shopfront, StartOverBody, type HomeTab } from './Home';
import { DailyIntro, type DailyKind } from './DailyIntro';
import { startOrAsk, waitingGame } from './paused';
import { vsComputerConfig } from './playMenu';
import { counterMode } from './modes';
import { asShopkeeper } from './playAs';
import { prewarmSprites } from './icons';
import { Opening } from './Opening';
import { worn } from './looks';
import { CODE_LENGTH, normaliseCode } from '../net/protocol';
import { openMatch } from '../net/client';
import { fx } from './fx';
import { setStill } from './motion';
import { shouldAskFullscreen } from './fullscreen';
import { track } from '../net/telemetry';
import { noteLeft, noteShown } from '../net/recorder';
import { answerLink, linkAnswer, noteGameStarted, sessionHello } from '../net/player';
import { LEAGUE, finishGame, leagueConfig, leagueStage } from './progress';
import { LocalSetup } from './Setup';
import { Wardrobe } from './Wardrobe';
import { accountPanel, fullscreenPrompt, gameScreen, leagueScreen, onlineScreen, settingsScreen, trophyScreen } from './lazyScreens';
import { howTo } from './HowTo';
import { preloadWhenIdle, whenReady, type OnDemand } from './onDemand';
import { androidBack, browserBack, isAway, rematchOf, startOverTo, withGame, type BackStep, type NavState, type PopupKind, type Screen } from './appNav';
import { clearGame, consumeSaveNotice, loadGames, loadName, loadSettings, nameOrDefault, saveGame, slotOf, todayKey, type SaveSlot } from './store';

/**
 * The room in an invite link. PLAN-107 (ON-02): it is read once, as the app opens, and taken out of the address, so it
 * never comes back once used (Create a room used to show the old invite again). While a room is open the online screen
 * puts its code back in the address, so a reload returns to it.
 */
export function roomFromUrl(): string | undefined {
  try {
    const c = normaliseCode(new URLSearchParams(location.search).get('room') ?? '');
    dropRoomFromAddress();
    return c.length === CODE_LENGTH ? c : undefined;
  } catch {
    return undefined;
  }
}

/** Takes `?room=` out of the address, leaving anything else in it. */
export function dropRoomFromAddress() {
  try {
    const params = new URLSearchParams(location.search);
    if (!params.has('room')) return;
    params.delete('room');
    const rest = params.toString();
    history.replaceState(null, '', `${location.pathname}${rest ? `?${rest}` : ''}${location.hash}`);
  } catch { /* no address to change (a page without history): nothing to forget */ }
}

// The shopkeeper drawing used in the daily challenge and the league (the person there still picks a perk).
const HUMAN_AVATARS = ['🧑‍🍳', '👩‍🍳', '🦸', '🐵']; // emoji-ok: avatar keys, never shown
const newSeed = () => (Math.random() * 2 ** 31) >>> 0;
/** REP-140 A-08: the screens loaded on demand (lazyScreens.ts), by the screen that shows them. */
const ON_DEMAND: Partial<Record<Screen, Pick<OnDemand<never>, 'open'>>> = {
  game: gameScreen, online: onlineScreen, quick: onlineScreen, league: leagueScreen, trophies: trophyScreen, wardrobe: trophyScreen,
  settings: settingsScreen,
};
const myName = () => nameOrDefault(loadName());

// The market opening plays once, when the game is first opened. Automated browser tests skip it. Right after it, the
// game asks to go full screen (PLAN-062; PLAN-123: on Home, once the player is back from a game), unless it already
// is or the player said not to ask.
export function App() {
  // PLAN-123: the game's own Reduced motion setting is in force before anything moves (the opening included).
  useState(() => setStill(loadSettings().still));
  const [opening, setOpening] = useState(() => !navigator.webdriver);
  const [ask, setAsk] = useState(false);
  // PLAN-123: the question no longer comes as the game opens, over the menus the player is browsing (it covered the first
  // League-map opening). It waits until the player comes back to Home from a game, and is never asked over anything else.
  return (
    <>
      <Main askFullscreen={ask && !opening} onAsked={() => setAsk(false)} />
      {opening && <Opening onDone={() => { setOpening(false); setAsk(shouldAskFullscreen()); }} />}
    </>
  );
}

/**
 * PLAN-123: the browser's Back button (and a phone's back gesture in the browser) moves inside the game, as Android's
 * back button does (appNav.ts browserBack). One history entry stands for "away from Home": it is added when a screen
 * other than Home opens and taken off again when Home comes back, so Back on Home leaves the game as before.
 */
export const backNav = { pushed: false, skip: false };
function pushAway() {
  if (backNav.pushed) return;
  try { history.pushState({ fm: 'away' }, ''); backNav.pushed = true; } catch { /* no history here: Back leaves the page */ }
}
function popAway() {
  if (!backNav.pushed) return;
  backNav.pushed = false;
  backNav.skip = true;
  try { history.back(); } catch { backNav.skip = false; }
}

/** The latest value of `v`, for a listener added once (it always calls what the last render gave it). */
function useLatest<T>(v: T) {
  const ref = useRef(v);
  useEffect(() => { ref.current = v; });
  return ref;
}

/**
 * PLAN-120: a saved game per mode (store.ts), and the mode of the game on screen. Starting a game fills its own mode's
 * slot only, so a game in one mode never replaces a game in another.
 */
function useSaves() {
  const [games, setGames] = useState<Partial<Record<SaveSlot, GameState>>>(() => loadGames());
  // What reading the saves had to say (a game set aside), shown once on Home: read after the games are.
  const [notice] = useState(() => consumeSaveNotice());
  const [active, setActive] = useState<SaveSlot | null>(null);
  // PLAN-114 and PLAN-115: games started in this visit, so that Try again on a fixed seed (a Sprint, or a League stage)
  // opens a fresh table.
  const [runs, setRuns] = useState(0);
  const game = active ? games[active] ?? null : null;
  const putGame = (slot: SaveSlot, g: GameState | null) => setGames((gs) => withGame(gs, slot, g));
  /** A new game in its mode's slot, saved and made the game on screen. */
  const begin = (cfg0: GameConfig) => {
    // The person holding the phone wears their looks in every offline game (the first human seat).
    const look = worn();
    const first = cfg0.players.findIndex((p) => p.kind === 'human');
    const cfg = first >= 0 && Object.keys(look).length ? { ...cfg0, players: cfg0.players.map((p, i) => (i === first ? { ...p, look } : p)) } : cfg0;
    track('game_start', counterMode(cfg));
    noteGameStarted();
    track('players', cfg.players.length);
    // PLAN-118: a League stage that opens part-way is brought there by real game actions (nothing else changes).
    const g = openStage(newGame(cfg));
    const slot = slotOf(cfg);
    setRuns((n) => n + 1);
    putGame(slot, g);
    setActive(slot);
    saveGame(g);
  };
  const onChange = (g: GameState) => {
    const slot = slotOf(g.config);
    putGame(slot, g);
    if (g.phase !== 'over') return saveGame(g);
    // The finished game is counted once by the results (progress.ts finishGame): games, wins, pieces sold, the Daily
    // market's date, trophies and stamps. Online games are counted there too. Only its own mode's slot is emptied.
    clearGame(slot);
  };
  /** Leaves a finished game: it is no longer kept for its card. */
  const dropFinished = () => { if (active && game?.phase === 'over') putGame(active, null); };
  return { games, game, notice, setActive, runs, putGame, begin, onChange, dropFinished };
}

/** The question before a waiting game is replaced (PLAN-081): which slot's game, the words, and what "Start anyway" starts. */
interface Swap { slot: SaveSlot; what: string; go: () => void }

/**
 * PLAN-107 (ON-02): how the online screen was opened: an invite link (read once, as the app opens), a code typed into
 * the friend menu, and PLAN-113 which online screen (a private room, or the public rooms).
 */
function useOnlineEntry() {
  const [invite, setInvite] = useState(roomFromUrl);
  const [joinCode, setJoinCode] = useState<string | undefined>();
  const [mode, setMode] = useState<'room' | 'public'>('room');
  /** An invite or a typed code is for one visit to the online screen: once it is left, the next visit starts afresh. */
  const forget = useCallback(() => {
    setInvite(undefined);
    setJoinCode(undefined);
    dropRoomFromAddress();
  }, []);
  return { invite, joinCode, mode, setJoinCode, setMode, forget };
}
type OnlineEntry = ReturnType<typeof useOnlineEntry>;

/** What is open: the screen, Home's tab, a pop-up or the question before a waiting game is replaced, and where the
 *  online screens and the set-up were opened from. */
function useNav(first: Screen) {
  const [screen, setScreen] = useState<Screen>(first);
  // PLAN-124: Home's tab (the bottom bar: Stall, Market, Rules). It stays while another screen is open over Home.
  const [homeTab, setHomeTab] = useState<HomeTab>('market');
  // The small menus in front of Home, and the question asked before a waiting game is replaced (PLAN-081).
  const [popup, setPopup] = useState<PopupKind | null>(null);
  const [swap, setSwap] = useState<Swap | null>(null);
  // PLAN-113: where the online screens and (PLAN-125) the set-up were opened from: the Play page, or Home.
  const [from, setFrom] = useState<Screen>('home');
  // PLAN-123: a game was opened in this visit (the fullscreen question waits for the way back to Home from one).
  const [played, setPlayed] = useState(false);
  useEffect(() => { if (screen === 'game') setPlayed(true); }, [screen]);
  const go = (sc: Screen) => { fx.tap(); show(sc); };
  /** REP-140 A-08: a screen loaded on demand opens once its code is here (onDemand.tsx whenReady). */
  const show = (sc: Screen) => whenReady(ON_DEMAND[sc], () => setScreen(sc));
  const open = (p: PopupKind) => { fx.tap(); setPopup(p); };
  const state: NavState = { screen, homeTab, popup, swap: !!swap, from };
  return { ...state, swapAsk: swap, played, setScreen, setHomeTab, setPopup, setSwap, setFrom, go, show, open };
}
type Nav = ReturnType<typeof useNav>;
type Saves = ReturnType<typeof useSaves>;

/**
 * Starting games and the ways into each screen, with each screen's own choices: the set-up page open (Computer or Pass &
 * Play) and the game length chosen last (PLAN-113, PLAN-125); which Daily format the intro explains and which mode's
 * game New game asks about (PLAN-120).
 */
function useRun(nav: Nav, saves: Saves, entry: OnlineEntry) {
  const [setup, setSetup] = useState<{ mode: 'computer' | 'phone'; days: number }>({ mode: 'computer', days: 10 });
  const [introKind, setIntroKind] = useState<DailyKind>('daily');
  const [contSlot, setContSlot] = useState<SaveSlot>('play');
  const { games } = saves;
  const start = (cfg: GameConfig) => { saves.begin(cfg); nav.show('game'); };
  const startDaily = () => start(dailyConfig(todayKey(), myName(), HUMAN_AVATARS[0]));
  // PLAN-114: the day's Market Sprint. Its results' Try again starts the same Sprint (the same date) at once.
  const startSprint = (date = todayKey()) => start(sprintConfig(date, myName(), HUMAN_AVATARS[0]));
  const startLeague = (stage: number) => start(leagueConfig(stage, myName(), HUMAN_AVATARS[0]));
  // Starting another game of a mode saves over that mode's waiting game, so the player is asked first (PLAN-081). PLAN-120:
  // only a game of the same mode is replaced; the other modes' games wait on their own cards.
  const orAsk = (slot: SaveSlot, what: string, yes: () => void) => () => startOrAsk(waitingGame(games[slot] ?? null), yes, (then) => { fx.tap(); nav.setSwap({ slot, what, go: then }); });
  const openIntro = (kind: DailyKind) => { track('mode_view', kind); setIntroKind(kind); nav.go('intro'); };
  const resume = (slot: SaveSlot) => { saves.setActive(slot); nav.go('game'); };
  const toOnline = (mode: 'room' | 'public', code: string | undefined, back: Screen) => { track('mode_view', mode === 'room' ? 'private' : 'public'); entry.setMode(mode); entry.setJoinCode(code); nav.setFrom(back); nav.go('online'); };
  const toQuick = (back: Screen) => { track('mode_view', 'quick'); nav.setFrom(back); nav.go('quick'); };
  // PLAN-125: Computer and Pass & Play open their set-up page (asking first when a game against the computer waits).
  const toSetup = (mode: 'computer' | 'phone', back: Screen) => orAsk('play', 'a new game', () => { track('mode_view', mode === 'phone' ? 'pass_and_play' : 'computer'); setSetup((s) => ({ ...s, mode })); nav.setFrom(back); nav.go('setup'); });
  /** Leaves the game for Home, where it waits in its slot (a finished game is let go). */
  const leaveGame = () => {
    const g = saves.game;
    if (g && g.phase !== 'over') { track('quit_day', g.day); track('quit_step', g.phase); noteLeft(g); }
    noteShown(null);
    nav.setScreen('home');
    saves.dropFinished();
  };
  /** The finished game's main button (appNav.ts rematchOf). */
  const rematch = (g: GameState) => {
    const cfg = g.config;
    const cleared = !cfg.daily && cfg.league !== undefined ? finishGame(g, 0)?.cleared ?? false : false;
    const next = rematchOf(cfg, cleared, leagueStage(), LEAGUE.length);
    if (next.kind === 'sprint') { track('sprint_retry'); startSprint(next.date); }
    else if (next.kind === 'home') { saves.dropFinished(); nav.setScreen('home'); }
    else if (next.kind === 'trophies') { saves.dropFinished(); nav.show('trophies'); }
    else if (next.kind === 'league') startLeague(next.stage);
    else start({ ...cfg, seed: newSeed() });
  };
  /** One step of Android's back button or the browser's Back (appNav.ts). */
  const back = (step: BackStep) => {
    if (step.kind === 'closeSwap') nav.setSwap(null);
    else if (step.kind === 'closePopup') nav.setPopup(null);
    else if (step.kind === 'market') nav.setHomeTab('market');
    else if (step.kind === 'exitApp') void CapApp.exitApp();
    else if (step.kind === 'leaveGame') leaveGame();
    else if (step.kind === 'screen') nav.setScreen(step.to);
  };
  return {
    setup, setSetup, introKind, setIntroKind, contSlot, setContSlot, start, startDaily, startSprint, startLeague, orAsk, openIntro, resume,
    toOnline, toQuick, toSetup, leaveGame, rematch, back,
  };
}
type Run = ReturnType<typeof useRun>;

function Main({ askFullscreen, onAsked }: { askFullscreen: boolean; onAsked: () => void }) {
  const entry = useOnlineEntry();
  const nav = useNav(entry.invite ? 'online' : 'home');
  const saves = useSaves();
  const run = useRun(nav, saves, entry);
  const { screen } = nav;
  const { forget } = entry;
  useEffect(() => { if (screen !== 'online') forget(); }, [screen, forget]);
  // Get the common sprites ready while the player is on the home screen.
  useEffect(() => prewarmSprites(), []);
  // REP-140 A-08: the screens loaded on demand are fetched once the phone is idle, so they are there before a tap.
  // The game first (a Continue may come at once); a screen that cannot be fetched now says so itself when opened.
  useEffect(() => { void gameScreen.load().catch(() => undefined); preloadWhenIdle(); }, []);
  useBackButtons(nav, run.back);
  const { game, games } = saves;
  const toHome = () => nav.go('home');

  switch (screen) {
    case 'game':
      if (!game) break;
      return (
        <gameScreen.Screen
          key={`${game.config.seed}-${game.config.daily ?? ''}-${saves.runs}`}
          initial={game}
          onChange={saves.onChange}
          onExit={run.leaveGame}
          onRematch={() => run.rematch(game)}
          onRetry={() => { if (game.config.league !== undefined) run.startLeague(game.config.league); }}
          onPlayAs={(avatar) => run.start({ ...asShopkeeper(game.config, avatar), seed: newSeed() })}
          // PLAN-119: a cleared League stage's results link to today's Sprint. PLAN-120: when a Sprint is waiting in its own
          // slot, the Sprint's intro opens instead (its Continue), so the link never replaces that game.
          onSprint={game.config.league !== undefined ? () => {
            track('sprint_from_league');
            saves.dropFinished();
            if (waitingGame(games.sprint ?? null)) { run.setIntroKind('sprint'); nav.show('intro'); } else run.startSprint();
          } : undefined}
        />
      );
    case 'settings': return <settingsScreen.Screen onBack={toHome} />;
    // PLAN-113: the online screens go back to where they were opened from: the Play menu, or Home (an invite link, or
    // "Back to room").
    case 'online': return <onlineScreen.Screen initialCode={entry.joinCode ?? entry.invite} typed={!!entry.joinCode} mode={entry.mode} onExit={() => nav.go(nav.from)} />;
    case 'quick':
      return (
        <onlineScreen.Screen quick onExit={() => nav.go(nav.from)} onComputer={(avatar, stalls) => {
          const yes = () => run.start(vsComputerConfig(myName(), avatar, newSeed(), undefined, stalls));
          if (waitingGame(games.play ?? null)) { nav.setScreen('home'); nav.setSwap({ slot: 'play', what: 'a game against the computer', go: yes }); } else yes();
        }} />
      );
    // PLAN-125: the one-page set-up for Computer or Pass & Play; its back arrow returns to where it was opened from.
    case 'setup':
      return (
        <LocalSetup key={run.setup.mode} mode={run.setup.mode} days={run.setup.days} onBack={() => nav.go(nav.from)}
          onStart={(c, d) => { run.setSetup((s) => ({ ...s, days: d })); run.start(c); }} />
      );
    case 'trophies': return <trophyScreen.Screen onBack={toHome} />;
    case 'wardrobe': return <Wardrobe onBack={toHome} />;
    default: break;
  }
  return <OverHome nav={nav} saves={saves} run={run} askFullscreen={askFullscreen} onAsked={onAsked} />;
}

/** Home, and the screens Home's pop-ups are drawn over: the Play page, the Market League and the Daily and Sprint
 *  intros; then the pop-ups (New game's question, the question before a waiting game is replaced, the account) and the
 *  full-screen question. */
function OverHome({ nav, saves, run, askFullscreen, onAsked }: { nav: Nav; saves: Saves; run: Run; askFullscreen: boolean; onAsked: () => void }) {
  const [, refresh] = useState(0);
  const { games } = saves;
  const close = () => nav.setPopup(null);
  const continuing = waitingGame(games[run.contSlot] ?? null);
  const swap = nav.swapAsk;
  const swapping = swap ? waitingGame(games[swap.slot] ?? null) : null;
  return (
    <>
      <HomeBody nav={nav} saves={saves} run={run} />
      {nav.popup === 'newgame' && continuing && (
        <Popup title="New game" onClose={close}>
          <StartOverBody mode={continuing.mode} day={continuing.day} days={continuing.days} stalls={continuing.stalls} cash={continuing.cash}
            onKeep={() => { fx.tap(); close(); }}
            onStartOver={() => {
              // PLAN-120: only this mode's game ends; then the place that starts a game of this mode.
              clearGame(run.contSlot); saves.putGame(run.contSlot, null); close();
              const to = startOverTo(run.contSlot);
              if ('intro' in to) run.openIntro(to.intro); else nav.go(to.screen);
            }} />
        </Popup>
      )}
      {swap && swapping && (
        <Popup title="Game in progress" onClose={() => nav.setSwap(null)}>
          <ReplaceBody mode={swapping.mode} day={swapping.day} days={swapping.days} stalls={swapping.stalls} cash={swapping.cash} what={swap.what}
            onKeep={() => { fx.tap(); nav.setSwap(null); }}
            onStart={() => { const { go: yes } = swap; nav.setSwap(null); yes(); }} />
        </Popup>
      )}
      {nav.popup === 'account' && <Popup title="Account" onClose={close}><accountPanel.Screen onChange={() => refresh((n) => n + 1)} /></Popup>}
      {askFullscreen && nav.played && nav.screen === 'home' && !nav.popup && !swap && <fullscreenPrompt.Screen onClose={onAsked} />}
      {/* PLAN-133: asked once, after a first game, never over another question. Until a yes no player number exists. */}
      {!askFullscreen && nav.played && nav.screen === 'home' && !nav.popup && !swap && linkAnswer() === null && (
        <Popup title="Help improve the game?" onClose={() => { answerLink(false); refresh((n) => n + 1); }}>
          <LinkAsk onAnswer={(yes) => { fx.tap(); answerLink(yes); if (yes) sessionHello(); refresh((n) => n + 1); }} />
        </Popup>
      )}
    </>
  );
}

/** The screen under Home's pop-ups. */
function HomeBody({ nav, saves, run }: { nav: Nav; saves: Saves; run: Run }) {
  const { games } = saves;
  const today = todayKey();
  const toHome = () => nav.go('home');
  if (nav.screen === 'league') {
    // PLAN-113: the Market League has a screen of its own (the stage you are on and every stage); its Play button
    // starts the stage, asking first when a game is waiting. PLAN-115: a cleared stage can be played again for its stars.
    return <leagueScreen.Screen onBack={toHome} onPlay={(stage) => run.orAsk('league', 'a Market League game', () => run.startLeague(stage))()} />;
  }
  if (nav.screen === 'intro') {
    const kind = run.introKind;
    return (
      <DailyIntro kind={kind} today={today} waiting={games[kind] ?? null}
        onBack={toHome}
        onSwitch={(k) => { fx.tap(); run.setIntroKind(k); }}
        onContinue={() => run.resume(kind)}
        onStart={kind === 'sprint' ? run.orAsk('sprint', 'the Sprint', () => run.startSprint()) : run.orAsk('daily', 'the Daily market', run.startDaily)} />
    );
  }
  if (nav.screen === 'play') {
    return <PlayMenu onBack={toHome} onQuick={() => run.toQuick('play')} onRoom={() => run.toOnline('room', undefined, 'play')} onComputer={run.toSetup('computer', 'play')} onOnePhone={run.toSetup('phone', 'play')} />;
  }
  return (
    <Shopfront
      games={games}
      today={today}
      notice={saves.notice}
      tab={nav.homeTab}
      onTab={(t) => { if (t !== nav.homeTab) fx.tap(); whenReady(t === 'rules' ? howTo : undefined, () => nav.setHomeTab(t)); }}
      onContinue={run.resume}
      onNewGame={(slot) => { run.setContSlot(slot); nav.open('newgame'); }}
      onPlay={() => nav.go('play')}
      // PLAN-124: the Custom match card's ways start as the Play page's do, and the online screens come back to Home.
      onQuick={() => run.toQuick('home')}
      onPrivate={() => run.toOnline('room', undefined, 'home')}
      onComputer={run.toSetup('computer', 'home')}
      onOnePhone={run.toSetup('phone', 'home')}
      onDaily={() => run.openIntro('daily')}
      onSprint={() => run.openIntro('sprint')}
      onLeague={() => { track('mode_view', 'league'); nav.go('league'); }}
      onWardrobe={() => nav.go('wardrobe')}
      onAccount={() => { fx.tap(); whenReady(accountPanel, () => nav.setPopup('account')); }}
      onTrophies={() => nav.go('trophies')}
      onSettings={() => nav.go('settings')}
      room={openMatch()}
      onRoom={(code) => run.toOnline('room', code, 'home')}
    />
  );
}

/**
 * Android's back button and (PLAN-123) the browser's Back, each a step of appNav.ts. Away from Home a screen holds one
 * history entry; Home gives it back. After a Back that leaves the player still away from Home (a pop-up closed over a
 * screen, or back to the Play page), the entry is added again for the next Back.
 */
function useBackButtons(nav: NavState, apply: (step: BackStep) => void) {
  const latest = useLatest({ nav: { screen: nav.screen, homeTab: nav.homeTab, popup: nav.popup, swap: nav.swap, from: nav.from }, apply });
  useEffect(() => {
    const sub = CapApp.addListener('backButton', () => latest.current.apply(androidBack(latest.current.nav)));
    return () => { void sub.then((h) => h.remove()); };
  }, [latest]);
  const away = isAway(nav);
  const { screen, popup, swap, homeTab } = nav;
  useEffect(() => {
    if (away) pushAway();
    else popAway();
  }, [away, screen, popup, swap, homeTab]);
  useEffect(() => {
    const onPop = () => {
      if (backNav.skip) { backNav.skip = false; return; }
      backNav.pushed = false;
      latest.current.apply(browserBack(latest.current.nav));
    };
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, [latest]);
}

/** PLAN-133: the one question about linking games. The words say what is sent and what is not; No is as easy as Yes. */
function LinkAsk({ onAnswer }: { onAnswer: (yes: boolean) => void }) {
  return (
    <div class="link-ask">
      <p>May the game give this phone a <b>random player number</b>, so your games can be counted together? It shows how players improve and what keeps the game fun.</p>
      <p class="muted">No name, account or phone ID is sent. You can switch it off, or have your data deleted, in Settings.</p>
      <div class="row2">
        <button class="btn" onClick={() => onAnswer(false)}>No thanks</button>
        <button class="btn primary" onClick={() => onAnswer(true)}>Yes, share</button>
      </div>
    </div>
  );
}
