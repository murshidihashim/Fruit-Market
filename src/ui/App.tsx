// Screens: home, new-game setup, how to play, settings/stats, and the game itself.
import { useEffect, useState } from 'preact/hooks';
import { App as CapApp } from '@capacitor/app';
import { newGame, type GameConfig, type GameState } from '../engine/game';
import { openStage } from '../engine/ai';
import { dailyConfig, sprintConfig } from '../engine/daily';
import { PlayMenu, Popup, ReplaceBody, Shopfront, StartOverBody, type HomeTab } from './Home';
import { DailyIntro, type DailyKind } from './DailyIntro';
import { startOrAsk, waitingGame } from './paused';
import { vsComputerConfig } from './playMenu';
import { LocalSetup } from './Setup';
import { asShopkeeper } from './playAs';
import { prewarmSprites } from './icons';
import { Game } from './Game';
import { Opening } from './Opening';
import { AccountPanel } from './AccountPanel';
import { Wardrobe } from './Wardrobe';
import { worn } from './looks';
import { Online } from './Online';
import { CODE_LENGTH, normaliseCode } from '../net/protocol';
import { openMatch } from '../net/client';
import { fx, setMusic } from './fx';
import { setStill } from './motion';
import { FullScreenButton, FullscreenPrompt } from './FullScreenButton';
import { shouldAskFullscreen } from './fullscreen';
import { resetTutorial } from './tutorial';
import { track } from '../net/telemetry';
import { LEAGUE, finishGame, leagueConfig, leagueStage } from './progress';
import { TrophyScreen } from './Trophies';
import { LeagueScreen } from './League';
import { BackArrow } from './stampCard';
import { Toggle } from './Toggle';
import {
  clearGame, consumeSaveNotice, loadGames, loadName, loadSettings, loadStats, nameOrDefault, saveGame,
  saveSettings, slotOf, todayKey, type SaveSlot, type Settings,
} from './store';

// PLAN-125: 'setup' is the one-page set-up for Computer or Pass & Play (Setup.tsx); 'quick' the Quick Match set-up and
// wait, 'online' the Private Room (Online.tsx).
type Screen = 'home' | 'play' | 'game' | 'settings' | 'online' | 'quick' | 'setup' | 'trophies' | 'wardrobe' | 'league' | 'intro';
type PopupKind = 'newgame' | 'account';

/**
 * The room in an invite link. PLAN-107 (ON-02): it is read once, as the app opens, and taken out of the address, so it
 * never comes back once used (Create a room used to show the old invite again). While a room is open the online screen
 * puts its code back in the address, so a reload returns to it.
 */
function roomFromUrl(): string | undefined {
  try {
    const c = normaliseCode(new URLSearchParams(location.search).get('room') ?? '');
    dropRoomFromAddress();
    return c.length === CODE_LENGTH ? c : undefined;
  } catch {
    return undefined;
  }
}

/** Takes `?room=` out of the address, leaving anything else in it. */
function dropRoomFromAddress() {
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
 * back button does: it closes a pop-up, leaves a screen for Home (or the online screens for where they were opened
 * from) and leaves a game for Home, where the game waits in its own slot. One history entry stands for "away from
 * Home": it is added when a screen other than Home opens and taken off again when Home comes back, so Back on Home
 * leaves the game as before.
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

function Main({ askFullscreen, onAsked }: { askFullscreen: boolean; onAsked: () => void }) {
  const [invite, setInvite] = useState(roomFromUrl);
  const [screen, setScreen] = useState<Screen>(invite ? 'online' : 'home');
  // PLAN-124: Home's tab (the bottom bar: Stall, Market, Rules). It stays while another screen is open over Home.
  const [homeTab, setHomeTab] = useState<HomeTab>('market');
  // PLAN-120: a saved game per mode (store.ts), and the mode of the game on screen. Starting a game fills its own mode's
  // slot only, so a game in one mode never replaces a game in another.
  const [games, setGames] = useState<Partial<Record<SaveSlot, GameState>>>(() => loadGames());
  const [active, setActive] = useState<SaveSlot | null>(null);
  const game = active ? games[active] ?? null : null;
  const putGame = (slot: SaveSlot, g: GameState | null) => setGames((gs) => { const n = { ...gs }; if (g) n[slot] = g; else delete n[slot]; return n; });
  const [saveNotice] = useState(() => consumeSaveNotice());
  // PLAN-120: which Daily format the intro screen explains, and which mode's game the Continue question is about.
  const [introKind, setIntroKind] = useState<DailyKind>('daily');
  const [contSlot, setContSlot] = useState<SaveSlot>('play');
  // Get the common sprites ready while the player is on the home screen.
  useEffect(() => prewarmSprites(), []);
  // PLAN-114 and PLAN-115: games started in this visit, so that Try again on a fixed seed (a Sprint, or a League stage)
  // opens a fresh table.
  const [runs, setRuns] = useState(0);
  // The small menus in front of the home screen, a room code typed into the friend menu, and where the wardrobe was opened from.
  const [popup, setPopup] = useState<PopupKind | null>(null);
  // A game is waiting and something that would replace it was tapped: the question on screen, with what to start
  // if the player says "Start anyway" (PLAN-081).
  const [swap, setSwap] = useState<{ slot: SaveSlot; what: string; go: () => void } | null>(null);
  const [joinCode, setJoinCode] = useState<string | undefined>();
  // PLAN-113: the game length chosen last (PLAN-125: on the set-up page), and which online screen was opened. PLAN-125:
  // which set-up page is open, Computer or Pass & Play.
  const [days, setDays] = useState(10);
  const [onlineMode, setOnlineMode] = useState<'room' | 'public'>('room');
  const [setupMode, setSetupMode] = useState<'computer' | 'phone'>('computer');
  const [from, setFrom] = useState<Screen>('home');
  // PLAN-107 (ON-02): an invite, or a code typed into the friend menu, is for one visit to the online screen. However
  // the screen is left (its ←, Home from a game, Android's back button), the next visit starts from the online menu.
  useEffect(() => {
    if (screen === 'online') return;
    setInvite(undefined);
    setJoinCode(undefined);
    dropRoomFromAddress();
  }, [screen]);
  const [, refresh] = useState(0);

  const go = (sc: Screen) => {
    fx.tap();
    setScreen(sc);
  };
  const open = (p: PopupKind) => {
    fx.tap();
    setPopup(p);
  };

  useEffect(() => {
    const sub = CapApp.addListener('backButton', () => {
      if (swap) setSwap(null);
      else if (popup) setPopup(null);
      else if (screen === 'home' && homeTab !== 'market') setHomeTab('market');
      else if (screen === 'home') CapApp.exitApp();
      else if (screen === 'online' || screen === 'quick' || screen === 'setup') setScreen(from);
      else setScreen('home');
    });
    return () => { sub.then((h) => h.remove()); };
  }, [screen, popup, swap, from, homeTab]);

  // PLAN-123: the browser's Back (see backNav). A screen away from Home holds one history entry; Home gives it back.
  // PLAN-123: a game was opened in this visit (the fullscreen question waits for the way back to Home from one).
  const [played, setPlayed] = useState(false);
  useEffect(() => { if (screen === 'game') setPlayed(true); }, [screen]);
  // PLAN-124: the Stall and Rules tabs count as away from Home too, so Back from them returns to Market.
  const away = screen !== 'home' || homeTab !== 'market' || !!popup || !!swap;
  useEffect(() => {
    if (away) pushAway();
    else popAway();
  }, [screen, popup, swap, homeTab]);
  useEffect(() => {
    const onPop = () => {
      if (backNav.skip) { backNav.skip = false; return; }
      backNav.pushed = false;
      if (swap) setSwap(null);
      else if (popup) setPopup(null);
      else if (screen === 'online' || screen === 'quick' || screen === 'setup') setScreen(from);
      else if (screen === 'game') { if (game && game.phase !== 'over') track('quit_day', game.day); setScreen('home'); if (active && game?.phase === 'over') putGame(active, null); }
      else if (screen !== 'home') setScreen('home');
      else if (homeTab !== 'market') setHomeTab('market');
      // Still away from Home afterwards (a pop-up closed over a screen, or back to the Play page): the effect above
      // adds the entry again for the next Back.
    };
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, [screen, popup, swap, from, game, active, homeTab]);

  const start = (cfg0: GameConfig) => {
    // The person holding the phone wears their looks in every offline game (the first human seat).
    const look = worn();
    const first = cfg0.players.findIndex((p) => p.kind === 'human');
    const cfg = first >= 0 && Object.keys(look).length ? { ...cfg0, players: cfg0.players.map((p, i) => (i === first ? { ...p, look } : p)) } : cfg0;
    track('game_start', cfg.sprint ? 'sprint' : cfg.daily ? 'daily' : cfg.players.filter((p) => p.kind === 'human').length > 1 ? 'pass_and_play' : 'solo');
    track('players', cfg.players.length);
    // PLAN-118: a League stage that opens part-way is brought there by real game actions (nothing else changes).
    const g = openStage(newGame(cfg));
    const slot = slotOf(cfg);
    setRuns((n) => n + 1);
    putGame(slot, g);
    setActive(slot);
    saveGame(g);
    setScreen('game');
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

  const startDaily = () => start(dailyConfig(todayKey(), nameOrDefault(loadName()), HUMAN_AVATARS[0]));
  // PLAN-114: the day's Market Sprint. Its results' Try again starts the same Sprint (the same date) at once.
  const startSprint = (date = todayKey()) => start(sprintConfig(date, nameOrDefault(loadName()), HUMAN_AVATARS[0]));

  if (screen === 'game' && game) {
    return (
      <Game
        key={`${game.config.seed}-${game.config.daily ?? ''}-${runs}`}
        initial={game}
        onChange={onChange}
        onExit={() => { if (game.phase !== 'over') track('quit_day', game.day); setScreen('home'); dropFinished(); }}
        onRematch={() => {
          // REP-136 R120-01: the finished game's own set-up (with a slot per mode, the last game started in this visit
          // can be another mode's, and starting it would replace that mode's waiting game).
          const cfg = game.config;
          if (cfg.sprint && cfg.daily) { track('sprint_retry'); startSprint(cfg.daily); return; }
          if (cfg.daily) { dropFinished(); setScreen('home'); return; }
          if (cfg.league !== undefined) {
            // PLAN-115: "Next stage" after the stage was cleared; otherwise "Retry" plays the same stage.
            const cleared = finishGame(game, 0)?.cleared ?? false;
            if (cleared && leagueStage() >= LEAGUE.length) { dropFinished(); setScreen('trophies'); return; }
            start(leagueConfig(cleared ? leagueStage() : cfg.league, nameOrDefault(loadName()), HUMAN_AVATARS[0]));
            return;
          }
          start({ ...cfg, seed: (Math.random() * 2 ** 31) >>> 0 });
        }}
        onRetry={() => { const cfg = game.config; if (cfg.league !== undefined) start(leagueConfig(cfg.league, nameOrDefault(loadName()), HUMAN_AVATARS[0])); }}
        onPlayAs={(avatar) => start({ ...asShopkeeper(game.config, avatar), seed: (Math.random() * 2 ** 31) >>> 0 })}
        // PLAN-119: a cleared League stage's results link to today's Sprint. PLAN-120: when a Sprint is waiting in its own
        // slot, the Sprint's intro opens instead (its Continue), so the link never replaces that game.
        onSprint={game.config.league !== undefined ? () => {
          track('sprint_from_league');
          dropFinished();
          if (waitingGame(games.sprint ?? null)) { setIntroKind('sprint'); setScreen('intro'); } else startSprint();
        } : undefined}
      />
    );
  }
  if (screen === 'settings') return <SettingsScreen onBack={() => go('home')} />;
  // PLAN-113: the online screens go back to where they were opened from: the Play menu, or Home (an invite link, or
  // "Back to room").
  if (screen === 'online') return <Online initialCode={joinCode ?? invite} typed={!!joinCode} mode={onlineMode} onExit={() => go(from)} />;
  if (screen === 'quick') {
    return (
      <Online quick onExit={() => go(from)} onComputer={(avatar, stalls) => {
        const go2 = () => start(vsComputerConfig(nameOrDefault(loadName()), avatar, (Math.random() * 2 ** 31) >>> 0, undefined, stalls));
        if (waitingGame(games.play ?? null)) { setScreen('home'); setSwap({ slot: 'play', what: 'a game against the computer', go: go2 }); } else go2();
      }} />
    );
  }
  // PLAN-125: the one-page set-up for Computer or Pass & Play; its back arrow returns to where it was opened from.
  if (screen === 'setup') {
    return <LocalSetup key={setupMode} mode={setupMode} days={days} onBack={() => go(from)} onStart={(c, d) => { setDays(d); start(c); }} />;
  }
  if (screen === 'trophies') return <TrophyScreen onBack={() => go('home')} />;
  if (screen === 'wardrobe') return <Wardrobe onBack={() => go('home')} />;

  const today = todayKey();
  const league = leagueStage();
  // PLAN-115: the screen plays the stage you are on, or a cleared stage again for its stars.
  const startLeague = (stage = Math.min(league, LEAGUE.length - 1)) => start(leagueConfig(stage, nameOrDefault(loadName()), HUMAN_AVATARS[0]));
  const close = () => setPopup(null);
  // Starting another game of a mode saves over that mode's waiting game, so the player is asked first (PLAN-081). PLAN-120:
  // only a game of the same mode is replaced; the other modes' games wait on their own cards.
  const orAsk = (slot: SaveSlot, what: string, go: () => void) => () => startOrAsk(waitingGame(games[slot] ?? null), go, (yes) => { fx.tap(); setSwap({ slot, what, go: yes }); });
  const openIntro = (kind: DailyKind) => { setIntroKind(kind); go('intro'); };
  const resume = (slot: SaveSlot) => { setActive(slot); go('game'); };
  const continuing = waitingGame(games[contSlot] ?? null);
  const swapping = swap ? waitingGame(games[swap.slot] ?? null) : null;
  // PLAN-113: Home and the Play menu share the pop-ups in front of them (Continue, the question before a waiting game is
  // replaced, the account).
  const toOnline = (mode: 'room' | 'public', code?: string, back: Screen = 'play') => { setOnlineMode(mode); setJoinCode(code); setFrom(back); go('online'); };
  // PLAN-125: Computer and Pass & Play open their set-up page (asking first when a game against the computer waits).
  const toSetup = (mode: 'computer' | 'phone', back: Screen) => orAsk('play', 'a new game', () => { setSetupMode(mode); setFrom(back); go('setup'); });
  // PLAN-113: the Market League has a screen of its own (the stage you are on and the six stages); its Play button
  // starts the stage, asking first when a game is waiting. Its question is drawn over it, as over Home.
  const body = screen === 'league' ? <LeagueScreen onBack={() => go('home')} onPlay={(stage) => orAsk('league', 'a Market League game', () => startLeague(stage))()} /> : screen === 'intro' ? (
    <DailyIntro kind={introKind} today={today} waiting={games[introKind] ?? null}
      onBack={() => go('home')}
      onSwitch={(k) => { fx.tap(); setIntroKind(k); }}
      onContinue={() => resume(introKind)}
      onStart={introKind === 'sprint' ? orAsk('sprint', 'the Sprint', () => startSprint()) : orAsk('daily', 'the Daily market', startDaily)} />
  ) : screen === 'play' ? (
    <PlayMenu
      onBack={() => go('home')}
      onQuick={() => { setFrom('play'); go('quick'); }}
      onRoom={() => toOnline('room')}
      onComputer={toSetup('computer', 'play')}
      onOnePhone={toSetup('phone', 'play')}
    />
  ) : (
    <Shopfront
      games={games}
      today={today}
      notice={saveNotice}
      tab={homeTab}
      onTab={(t) => { if (t !== homeTab) fx.tap(); setHomeTab(t); }}
      onContinue={resume}
      onNewGame={(slot) => { setContSlot(slot); open('newgame'); }}
      onPlay={() => go('play')}
      // PLAN-124: the Custom match card's ways start as the Play page's do, and the online screens come back to Home.
      onQuick={() => { setFrom('home'); go('quick'); }}
      onPrivate={() => toOnline('room', undefined, 'home')}
      onComputer={toSetup('computer', 'home')}
      onOnePhone={toSetup('phone', 'home')}
      onDaily={() => openIntro('daily')}
      onSprint={() => openIntro('sprint')}
      onLeague={() => go('league')}
      onWardrobe={() => go('wardrobe')}
      onAccount={() => open('account')}
      onTrophies={() => go('trophies')}
      onSettings={() => go('settings')}
      room={openMatch()}
      onRoom={(code) => { setOnlineMode('room'); setJoinCode(code); setFrom('home'); go('online'); }}
    />
  );
  return (
    <>
      {body}
      {popup === 'newgame' && continuing && (
        <Popup title="New game" onClose={close}>
          <StartOverBody mode={continuing.mode} day={continuing.day} days={continuing.days} stalls={continuing.stalls} cash={continuing.cash}
            onKeep={() => { fx.tap(); close(); }}
            onStartOver={() => {
              // PLAN-120: only this mode's game ends; then the place that starts a game of this mode.
              clearGame(contSlot); putGame(contSlot, null); close();
              if (contSlot === 'daily' || contSlot === 'sprint') openIntro(contSlot);
              else go(contSlot === 'league' ? 'league' : 'play');
            }} />
        </Popup>
      )}
      {swap && swapping && (
        <Popup title="Game in progress" onClose={() => setSwap(null)}>
          <ReplaceBody mode={swapping.mode} day={swapping.day} days={swapping.days} stalls={swapping.stalls} cash={swapping.cash} what={swap.what}
            onKeep={() => { fx.tap(); setSwap(null); }}
            onStart={() => { const { go: yes } = swap; setSwap(null); yes(); }} />
        </Popup>
      )}
      {popup === 'account' && <Popup title="Account" onClose={close}><AccountPanel onChange={() => refresh((n) => n + 1)} /></Popup>}
      {askFullscreen && played && screen === 'home' && !popup && !swap && <FullscreenPrompt onClose={onAsked} />}
    </>
  );
}

function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [st, setSt] = useState<Settings>(loadSettings());
  // S19 (PLAN-110): "Replay the tutorial next game" says that it worked.
  const [replay, setReplay] = useState(false);
  const stats = loadStats();
  // The phone's own reduced-motion setting: then the game's switch shows on (the phone's setting wins).
  const phoneStill = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const upd = (p: Partial<Settings>) => {
    const n = { ...st, ...p };
    setSt(n);
    saveSettings(n);
  };
  // S17 (PLAN-110): in the square Market Ticket look, under the black bar Trophies has.
  return (
    <div class="page tk-page settings">
      <header class="topbar"><button class="icon-btn" aria-label="Back" onClick={onBack}><BackArrow /></button><div class="day"><b>Settings</b></div></header>
      <main class="scroll pad">
        <section class="panel">
          <Toggle on={st.sound} set={(v) => upd({ sound: v })} title="Sound" text="Coins, cards and cheers." />
          <Toggle on={st.haptics} set={(v) => upd({ haptics: v })} title="Vibration" text="A small buzz when you buy." />
          {/* PLAN-123: "Fast" speeds up every move on the table and the computers' turns (motion.ts setBaseSpeed), so it
              is named for what it does; Reduced motion is the game's own switch beside the phone's setting. */}
          <Toggle on={st.fast} set={(v) => upd({ fast: v })} title="Fast play" text="Moves and computer turns go quicker." />
          <Toggle on={st.still || phoneStill} set={(v) => { upd({ still: v }); setStill(v); }} title="Reduced motion"
            text={phoneStill ? 'On in your phone\'s settings: nothing slides across the table.' : 'Nothing slides across the table: each change shows at once.'} />
          <Toggle on={st.music} set={(v) => { upd({ music: v }); setMusic(v); }} title="Music" text="A gentle market tune." />
          <Toggle on={st.reactions} set={(v) => upd({ reactions: v })} title="Show reactions" text="Emoji and short lines other players send in online games." />
          <Toggle on={st.analytics} set={(v) => upd({ analytics: v })} title="Share anonymous stats" text="Helps fix crashes and balance the game. No names or IDs are sent." />
          <FullScreenButton />
          <button class="btn wide" disabled={replay} onClick={() => { resetTutorial(); fx.tap(); setReplay(true); }}>Replay the tutorial next game</button>
          {replay && <p class="tk-done" role="status">Done. The tips will show in your next game.</p>}
        </section>
        <section class="panel">
          <h3>Your stats</h3>
          <div class="stats">
            <div><b>{stats.played}</b><small>Games</small></div>
            <div><b>{stats.wins}</b><small>Wins</small></div>
            <div><b>${stats.bestCash}</b><small>Best</small></div>
            <div><b>{stats.totalSold}</b><small>Fruit sold</small></div>
          </div>
        </section>
        <section class="panel small">
          <h3>About</h3>
          <p>Fruit Market: a game designed by Murshidi bin Md Hashim.</p>
          <p class="muted">No ads. An account is optional and only keeps your trophies, looks and records. Your games stay on your phone. If you allow it, anonymous counts (like "a game was finished") are sent to help improve the game.</p>
          <p><a href="/privacy.html" target="_blank" rel="noopener">Privacy policy</a></p>
          <p class="muted">Version {__APP_VERSION__}</p>
        </section>
      </main>
    </div>
  );
}

declare const __APP_VERSION__: string;
