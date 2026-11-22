// Screens: home, new-game setup, how to play, settings/stats, and the game itself.
import { useEffect, useRef, useState } from 'preact/hooks';
import { App as CapApp } from '@capacitor/app';
import { newGame, type GameConfig, type GameState, type Level, type PlayerConfig } from '../engine/game';
import { openStage } from '../engine/ai';
import { dailyConfig, sprintConfig } from '../engine/daily';
import { CHARACTER_AVATARS, RIVALS } from '../engine/data';
import { CharacterPick } from './CharacterPick';
import { ContinueBody, PlayMenu, Popup, ReplaceBody, Shopfront } from './Home';
import { DailyIntro, type DailyKind } from './DailyIntro';
import { startOrAsk, waitingGame } from './paused';
import { LENGTHS, vsComputerConfig } from './playMenu';
import { asShopkeeper } from './playAs';
import { prewarmSprites } from './icons';
import { Game } from './Game';
import { Opening } from './Opening';
import { HowTo } from './HowTo';
import { AccountPanel } from './AccountPanel';
import { Wardrobe } from './Wardrobe';
import { myAvatar, worn } from './looks';
import { Online } from './Online';
import { CODE_LENGTH, normaliseCode } from '../net/protocol';
import { openMatch } from '../net/client';
import { fx, setMusic } from './fx';
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
  clearGame, consumeSaveNotice, loadGames, loadName, loadSettings, loadStats, nameOrDefault, saveGame, saveName,
  saveSettings, slotOf, todayKey, type SaveSlot, type Settings,
} from './store';

type Screen = 'home' | 'play' | 'game' | 'howto' | 'settings' | 'online' | 'quick' | 'trophies' | 'wardrobe' | 'league' | 'intro';
type PopupKind = 'new' | 'phone' | 'continue' | 'account';

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

interface Seat { kind: 'human' | 'ai'; level: Level; name: string; avatar?: string }
/** Rival stalls on the set-up screen: up to 5, so 6 stalls with you (rules 11). */
const MAX_RIVALS = 5;
const LEVEL_WORD: Record<Level, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };

// The market opening plays once, when the game is first opened. Automated browser tests skip it. Right after it, the
// game asks to go full screen (PLAN-062), unless it already is or the player said not to ask.
export function App() {
  const [opening, setOpening] = useState(() => !navigator.webdriver);
  const [ask, setAsk] = useState(false);
  return (
    <>
      <Main />
      {opening && <Opening onDone={() => { setOpening(false); setAsk(shouldAskFullscreen()); }} />}
      {ask && <FullscreenPrompt onClose={() => setAsk(false)} />}
    </>
  );
}

function Main() {
  const [invite, setInvite] = useState(roomFromUrl);
  const [screen, setScreen] = useState<Screen>(invite ? 'online' : 'home');
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
  const [lastConfig, setLastConfig] = useState<GameConfig | null>(null);
  // PLAN-114 and PLAN-115: games started in this visit, so that Try again on a fixed seed (a Sprint, or a League stage)
  // opens a fresh table.
  const [runs, setRuns] = useState(0);
  // The small menus in front of the home screen, a room code typed into the friend menu, and where the wardrobe was opened from.
  const [popup, setPopup] = useState<PopupKind | null>(null);
  // A game is waiting and something that would replace it was tapped: the question on screen, with what to start
  // if the player says "Start anyway" (PLAN-081).
  const [swap, setSwap] = useState<{ slot: SaveSlot; what: string; go: () => void } | null>(null);
  const [joinCode, setJoinCode] = useState<string | undefined>();
  // PLAN-113: the Play menu's game length (for a computer or one-phone game), and which online screen it opened.
  const [days, setDays] = useState(10);
  const [onlineMode, setOnlineMode] = useState<'room' | 'public'>('room');
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
      else if (screen === 'home') CapApp.exitApp();
      else if (screen === 'online' || screen === 'quick') setScreen(from);
      else setScreen('home');
    });
    return () => { sub.then((h) => h.remove()); };
  }, [screen, popup, swap, from]);

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
    setLastConfig(cfg);
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
          const cfg = lastConfig ?? game.config;
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
        onRetry={() => { const cfg = lastConfig ?? game.config; if (cfg.league !== undefined) start(leagueConfig(cfg.league, nameOrDefault(loadName()), HUMAN_AVATARS[0])); }}
        onPlayAs={(avatar) => start({ ...asShopkeeper(lastConfig ?? game.config, avatar), seed: (Math.random() * 2 ** 31) >>> 0 })}
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
  if (screen === 'howto') return <HowTo onDone={() => go('home')} />;
  if (screen === 'settings') return <SettingsScreen onBack={() => go('home')} />;
  // PLAN-113: the online screens go back to where they were opened from: the Play menu, or Home (an invite link, or
  // "Back to room").
  if (screen === 'online') return <Online initialCode={joinCode ?? invite} typed={!!joinCode} mode={onlineMode} onExit={() => go(from)} />;
  if (screen === 'quick') {
    return (
      <Online quick onExit={() => go(from)} onComputer={(avatar) => {
        const go2 = () => start(vsComputerConfig(nameOrDefault(loadName()), avatar, (Math.random() * 2 ** 31) >>> 0));
        if (waitingGame(games.play ?? null)) { setScreen('home'); setSwap({ slot: 'play', what: 'a game against the computer', go: go2 }); } else go2();
      }} />
    );
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
  // PLAN-113: Home and the Play menu share the pop-ups in front of them (the set-up, Continue, the question before a
  // waiting game is replaced, the account).
  const toOnline = (mode: 'room' | 'public', code?: string) => { setOnlineMode(mode); setJoinCode(code); setFrom('play'); go('online'); };
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
      days={days}
      onDays={(d) => { fx.tap(); setDays(d); }}
      onBack={() => go('home')}
      onQuick={() => { setFrom('play'); go('quick'); }}
      onRoom={() => toOnline('room')}
      onPublic={() => toOnline('public')}
      onJoin={(code) => toOnline('room', code)}
      onComputer={orAsk('play', 'a new game', () => open('new'))}
      onOnePhone={orAsk('play', 'a new game', () => open('phone'))}
    />
  ) : (
    <Shopfront
      games={games}
      today={today}
      notice={saveNotice}
      onContinue={(slot) => { setContSlot(slot); open('continue'); }}
      onPlay={() => go('play')}
      onDaily={() => openIntro('daily')}
      onSprint={() => openIntro('sprint')}
      onLeague={() => go('league')}
      onWardrobe={() => go('wardrobe')}
      onAccount={() => open('account')}
      onTrophies={() => go('trophies')}
      onHowTo={() => go('howto')}
      onSettings={() => go('settings')}
      room={openMatch()}
      onRoom={(code) => { setOnlineMode('room'); setJoinCode(code); setFrom('home'); go('online'); }}
    />
  );
  return (
    <>
      {body}
      {popup === 'new' && <Popup title="New game" onClose={close}><Setup days={days} onStart={(c) => { close(); start(c); }} /></Popup>}
      {popup === 'phone' && <Popup title="One phone" onClose={close}><Setup days={days} friend onStart={(c) => { close(); start(c); }} /></Popup>}
      {popup === 'continue' && continuing && (
        <Popup title="Continue" onClose={close}>
          <ContinueBody mode={continuing.mode} day={continuing.day} days={continuing.days} stalls={continuing.stalls} cash={continuing.cash}
            onResume={() => { close(); resume(contSlot); }}
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
    </>
  );
}

/** The set-up for a game on this phone. PLAN-113: `days` is the length chosen in the Play menu; `friend` (One phone)
 *  starts with a friend at stall 2 instead of computers. */
function Setup({ onStart, days: days0 = 10, friend }: { onStart: (c: GameConfig) => void; days?: number; friend?: boolean }) {
  const [name, setName] = useState(loadName());
  const nameRef = useRef<HTMLInputElement>(null);
  // A blank name field takes focus so the keyboard opens (best effort: some phones only allow it from a tap).
  useEffect(() => { if (!name) nameRef.current?.focus(); }, []);
  const [myChar, setMyChar] = useState<string>(myAvatar);
  const [seats, setSeats] = useState<Seat[]>([
    friend ? { kind: 'human', level: 'normal', name: 'Player 2' } : { kind: 'ai', level: 'easy', name: 'Player 2' },
    { kind: 'ai', level: 'normal', name: 'Player 3' },
    { kind: 'ai', level: 'normal', name: 'Player 4' },
    { kind: 'ai', level: 'normal', name: 'Player 5' },
    { kind: 'ai', level: 'normal', name: 'Player 6' },
  ]);
  const [rivals, setRivals] = useState(friend ? 1 : 3);
  const [days, setDays] = useState(days0);
  // The full game, always (owner, PLAN-063): event cards, stall upgrades, unripe fruit and Market Days on; the beginner
  // and expert playtest options (PLAN-015: basic game, fixed prices, price drift) off. The screen no longer shows them.
  const unripe = true, upgrades = true, events = true, marketDays = true;
  const core = false, street = false, pulseRule = false;

  const setSeat = (i: number, patch: Partial<Seat>) => setSeats((ss) => ss.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  // Seat tiles (option C, PLAN-058): one tile per rival stall; tapping a tile opens its editor underneath.
  const [open, setOpen] = useState<number | null>(null);
  const addSeat = () => { if (rivals < MAX_RIVALS) { setOpen(rivals); setRivals(rivals + 1); } };
  const removeSeat = (i: number) => {
    if (rivals <= 1) return;
    setSeats((ss) => [...ss.slice(0, i), ...ss.slice(i + 1), { kind: 'ai', level: 'normal', name: '' } as Seat]
      .map((x, k) => (!x.name || /^Player \d+$/.test(x.name) ? { ...x, name: `Player ${k + 2}` } : x)));
    setRivals(rivals - 1);
    setOpen(null);
  };

  // Character cards: you and each friend pick a different character; a friend who has not picked gets the first free one.
  const humanSeats = seats.slice(0, rivals).map((st, i) => ({ st, i })).filter(({ st }) => st.kind === 'human');
  const picks: Record<number, string> = {};
  const usedChars = new Set<string>([myChar]);
  for (const { st, i } of humanSeats) {
    const a = st.avatar && CHARACTER_AVATARS.includes(st.avatar) && !usedChars.has(st.avatar) ? st.avatar : CHARACTER_AVATARS.find((c) => !usedChars.has(c))!;
    picks[i] = a;
    usedChars.add(a);
  }
  const seatName = (i: number) => seats[i].name.trim() || `Player ${i + 2}`;
  // S8 (PLAN-110): with friends on this phone a blank name is "Player 1", as the friends' are "Player 2" and on (it was
  // "You", which read "Pass the phone to You"). Alone, the person is "You" as before.
  const myName = () => name.trim() || (humanSeats.length > 0 ? 'Player 1' : 'You');
  const takenForMe: Record<string, string> = Object.fromEntries(humanSeats.map(({ i }) => [picks[i], seatName(i)]));
  const takenFor = (i: number): Record<string, string> => ({
    [myChar]: myName(),
    ...Object.fromEntries(humanSeats.filter((h) => h.i !== i).map((h) => [picks[h.i], seatName(h.i)])),
  });

  const begin = () => {
    saveName(name.trim());
    // PLAN-113: the shopkeeper you play is the one Home shows at your stall (the same key the online screens keep).
    try { localStorage.setItem('fm.avatar', myChar); } catch { /* no storage: Home shows the first shopkeeper */ }
    // Computer shops take the characters the people did not pick.
    const pool = RIVALS.filter((r) => !usedChars.has(r.avatar)).sort(() => Math.random() - 0.5);
    const players: PlayerConfig[] = [
      { name: myName(), kind: 'human', avatar: myChar },
      ...seats.slice(0, rivals).map((st, i): PlayerConfig => {
        if (st.kind === 'human') return { name: seatName(i), kind: 'human', avatar: picks[i] };
        const r = pool.shift()!;
        return { name: r.name, kind: 'ai', level: st.level, avatar: r.avatar, quip: r.quip };
      }),
    ];
    onStart({ players, days, unripe, upgrades: upgrades && !core, events, marketDays, core, street, pulse: pulseRule, seed: (Math.random() * 2 ** 31) >>> 0 });
  };

  return (
    <div class="setup-body">
        <section class="panel">
          <h3 class="tight">Your name</h3>
          <input ref={nameRef} class="input tight" aria-label="Your name" value={name} maxLength={14} onInput={(e) => setName((e.target as HTMLInputElement).value)} placeholder="Your name" />
          <h3 class="tight next">Your shopkeeper</h3>
          <CharacterPick value={myChar} taken={takenForMe} seat={0} onPick={setMyChar} />
        </section>
        <section class="panel">
          <h3>Rival stalls</h3>
          <div class="seat-tiles">
            {seats.slice(0, rivals).map((st, i) => (
              <button type="button" class={`seat-tile ${st.kind === 'human' ? 'friend' : `lv-${st.level}`} ${open === i ? 'on' : ''}`} aria-expanded={open === i}
                aria-label={`Stall ${i + 2}: ${st.kind === 'human' ? `friend, ${seatName(i)}` : `computer, ${LEVEL_WORD[st.level]}`}. Change`} onClick={() => setOpen(open === i ? null : i)}>
                <span class="st-n">Stall {i + 2}</span>
                <b class="st-k">{st.kind === 'human' ? seatName(i) : LEVEL_WORD[st.level]}</b>
                <span class="st-l">{st.kind === 'human' ? 'Friend' : 'Computer'}</span>
              </button>
            ))}
            {rivals < MAX_RIVALS && <button type="button" class="seat-tile add" onClick={addSeat}><b class="st-k">+ Add</b></button>}
          </div>
          {open !== null && open < rivals && (() => {
            const i = open;
            const st = seats[i];
            return (
              <div class="seat-sheet">
                <div class="seat-sheet-head"><b>Stall {i + 2}</b><button type="button" class="seat-done" onClick={() => setOpen(null)}>Done</button></div>
                <div class="seg small">
                  {(['easy', 'normal', 'hard'] as Level[]).map((l) => <button class={st.kind === 'ai' && st.level === l ? 'on' : ''} onClick={() => setSeat(i, { kind: 'ai', level: l })}>{LEVEL_WORD[l]}</button>)}
                  <button class={st.kind === 'human' ? 'on' : ''} onClick={() => setSeat(i, { kind: 'human' })}>Friend</button>
                </div>
                {st.kind === 'human' && (
                  <>
                    <input class="input" aria-label={`Name for stall ${i + 2}`} value={st.name} maxLength={14} onInput={(e) => setSeat(i, { name: (e.target as HTMLInputElement).value })} />
                    <CharacterPick value={picks[i]} taken={takenFor(i)} seat={i + 1} onPick={(a) => setSeat(i, { avatar: a })} />
                  </>
                )}
                {rivals > 1 && <button type="button" class="seat-remove" onClick={() => removeSeat(i)}>Remove stall {i + 2}</button>}
              </div>
            );
          })()}
          <p class="small shop-total">{shopTotal(seats.slice(0, rivals))}</p>
          {seats.slice(0, rivals).some((s) => s.kind === 'human') && <p class="small muted">Friends take turns on this phone. Each player's secrets stay hidden between turns.</p>}
        </section>
        <section class="panel">
          <h3>Game length</h3>
          <div class="seg">
            {LENGTHS.map((l) => <button class={days === l.days ? 'on' : ''} onClick={() => setDays(l.days)}>{l.word}<small>{l.days} days</small></button>)}
          </div>
        </section>
        <div class="sticky-start"><button class="btn primary big wide" onClick={begin}>Start game</button></div>
    </div>
  );
}

/** "4 shops: you, 2 friends, 1 computer" for the new-game screen. */
function shopTotal(rivals: { kind: 'human' | 'ai' }[]): string {
  const friends = rivals.filter((s) => s.kind === 'human').length;
  const computers = rivals.length - friends;
  const part = (n: number, word: string) => (n ? `, ${n} ${word}${n > 1 ? 's' : ''}` : '');
  return `${rivals.length + 1} stalls: you${part(friends, 'friend')}${part(computers, 'computer')}`;
}

function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [st, setSt] = useState<Settings>(loadSettings());
  // S19 (PLAN-110): "Replay the tutorial next game" says that it worked.
  const [replay, setReplay] = useState(false);
  const stats = loadStats();
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
          <Toggle on={st.fast} set={(v) => upd({ fast: v })} title="Fast rivals" text="Computer stalls move faster." />
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
