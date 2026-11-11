// Screens: home, new-game setup, how to play, settings/stats, and the game itself.
import { useEffect, useRef, useState } from 'preact/hooks';
import { App as CapApp } from '@capacitor/app';
import { newGame, winners, type GameConfig, type GameState, type Level, type PlayerConfig } from '../engine/game';
import { dailyConfig, dailyTwist } from '../engine/daily';
import { CHARACTER_AVATARS, RIVALS } from '../engine/data';
import { CharacterPick } from './CharacterPick';
import { ContinueBody, FriendBody, Popup, Shopfront } from './Home';
import { prewarmSprites } from './icons';
import { Game } from './Game';
import { Opening } from './Opening';
import { HowTo } from './HowTo';
import { AccountPanel } from './AccountPanel';
import { Wardrobe } from './Wardrobe';
import { LOOKS, worn } from './looks';
import { Online } from './Online';
import { CODE_LENGTH, normaliseCode } from '../net/protocol';
import { fx, setMusic } from './fx';
import { FullScreenButton, FullscreenPrompt } from './FullScreenButton';
import { shouldAskFullscreen } from './fullscreen';
import { resetTutorial } from './tutorial';
import { track } from '../net/telemetry';
import { ACHIEVEMENTS, COLOURS, colourUnlocked, LEAGUE, leagueConfig, leagueStage, loadColour, loadLooks, loadSets, saveColour, THEMES, unlocked } from './progress';
import { progressOf } from './achievements';
import {
  consumeSaveNotice, dailyStreak, loadDaily, loadGame, loadName, loadSettings, loadStats, nameOrDefault, saveDaily, saveGame, saveName,
  saveSettings, saveStats, todayKey, type Settings,
} from './store';

type Screen = 'home' | 'game' | 'howto' | 'settings' | 'online' | 'quick' | 'trophies' | 'wardrobe';
type PopupKind = 'new' | 'continue' | 'friend' | 'account';

function roomFromUrl(): string | undefined {
  try {
    const c = normaliseCode(new URLSearchParams(location.search).get('room') ?? '');
    return c.length === CODE_LENGTH ? c : undefined;
  } catch {
    return undefined;
  }
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
  const [invite] = useState(roomFromUrl);
  const [screen, setScreen] = useState<Screen>(invite ? 'online' : 'home');
  const [game, setGame] = useState<GameState | null>(() => loadGame());
  const [saveNotice] = useState(() => consumeSaveNotice());
  // Get the common sprites ready while the player is on the home screen.
  useEffect(() => prewarmSprites(), []);
  const [lastConfig, setLastConfig] = useState<GameConfig | null>(null);
  const recorded = useRef<string | null>(null);
  // The small menus in front of the home screen, a room code typed into the friend menu, and where the wardrobe was opened from.
  const [popup, setPopup] = useState<PopupKind | null>(null);
  const [joinCode, setJoinCode] = useState<string | undefined>();
  const [wardFrom, setWardFrom] = useState<Screen>('home');
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
      if (popup) setPopup(null);
      else if (screen === 'home') CapApp.exitApp();
      else setScreen('home');
    });
    return () => { sub.then((h) => h.remove()); };
  }, [screen, popup]);

  const start = (cfg0: GameConfig) => {
    // The person holding the phone wears their looks in every offline game (the first human seat).
    const look = worn();
    const first = cfg0.players.findIndex((p) => p.kind === 'human');
    const cfg = first >= 0 && Object.keys(look).length ? { ...cfg0, players: cfg0.players.map((p, i) => (i === first ? { ...p, look } : p)) } : cfg0;
    track('game_start', cfg.daily ? 'daily' : cfg.players.filter((p) => p.kind === 'human').length > 1 ? 'pass_and_play' : 'solo');
    track('players', cfg.players.length);
    const g = newGame(cfg);
    setLastConfig(cfg);
    recorded.current = null;
    setGame(g);
    saveGame(g);
    setScreen('game');
  };

  const onChange = (g: GameState) => {
    setGame(g);
    if (g.phase !== 'over') return saveGame(g);
    saveGame(null);
    const id = `${g.config.seed}:${g.config.daily ?? ''}`;
    if (recorded.current === id) return;
    recorded.current = id;
    const me = g.players.findIndex((p) => p.kind === 'human');
    const st = loadStats();
    st.played++;
    if (winners(g).includes(me)) st.wins++; // rules 18: a shared win is a win
    st.bestCash = Math.max(st.bestCash, g.players[me].cash);
    st.totalSold += g.players[me].stats.sold;
    saveStats(st);
    if (g.config.daily) {
      const d = loadDaily();
      d[g.config.daily] = Math.max(d[g.config.daily] ?? 0, g.players[me].cash);
      saveDaily(d);
    }
  };

  const startDaily = () => start(dailyConfig(todayKey(), nameOrDefault(loadName()), HUMAN_AVATARS[0]));

  if (screen === 'game' && game) {
    return (
      <Game
        key={`${game.config.seed}-${game.config.daily ?? ''}`}
        initial={game}
        onChange={onChange}
        onExit={() => { if (game.phase !== 'over') track('quit_day', game.day); setScreen('home'); if (game.phase === 'over') setGame(null); }}
        onRematch={() => {
          const cfg = lastConfig ?? game.config;
          if (cfg.daily) { setGame(null); setScreen('home'); return; }
          if (cfg.league !== undefined) {
            if (leagueStage() >= LEAGUE.length) { setGame(null); setScreen('trophies'); return; }
            start(leagueConfig(leagueStage(), nameOrDefault(loadName()), HUMAN_AVATARS[0], (Math.random() * 2 ** 31) >>> 0));
            return;
          }
          start({ ...cfg, seed: (Math.random() * 2 ** 31) >>> 0 });
        }}
      />
    );
  }
  if (screen === 'howto') return <HowTo onDone={() => go('home')} />;
  if (screen === 'settings') return <SettingsScreen onBack={() => go('home')} />;
  if (screen === 'online') return <Online initialCode={joinCode ?? invite} onExit={() => { setJoinCode(undefined); go('home'); }} />;
  if (screen === 'quick') return <Online quick onExit={() => go('home')} />;
  if (screen === 'trophies') return <Trophies onBack={() => go('home')} onWardrobe={() => { setWardFrom('trophies'); go('wardrobe'); }} />;
  if (screen === 'wardrobe') return <Wardrobe onBack={() => go(wardFrom)} />;

  const daily = loadDaily();
  const today = todayKey();
  const streak = dailyStreak(daily);
  const resumable = game && game.phase !== 'over';
  const league = leagueStage();
  const startLeague = () => start(leagueConfig(Math.min(league, LEAGUE.length - 1), nameOrDefault(loadName()), HUMAN_AVATARS[0], (Math.random() * 2 ** 31) >>> 0));
  const humans = game ? game.players.filter((pl) => pl.kind === 'human') : [];
  const close = () => setPopup(null);
  return (
    <>
      <Shopfront
        resume={resumable ? `Day ${game!.day}/${game!.config.days}` : null}
        cash={resumable && humans.length === 1 ? humans[0].cash : null}
        dailyLine={`${daily[today] !== undefined ? `Today's best: $${daily[today]}` : `Same market for everyone · ${dailyTwist(today).title}`}${streak ? ` · ${streak}-day streak` : ''}`}
        leagueLine={league >= LEAGUE.length ? 'Champion! Replay the Royal Market' : `Stage ${league + 1} of ${LEAGUE.length} · ${LEAGUE[league].title}`}
        today={today}
        notice={saveNotice}
        onContinue={() => open('continue')}
        onNew={() => open('new')}
        onFriend={() => open('friend')}
        onDaily={startDaily}
        onLeague={startLeague}
        onWardrobe={() => { setWardFrom('home'); go('wardrobe'); }}
        onAccount={() => open('account')}
        onTrophies={() => go('trophies')}
        onHowTo={() => go('howto')}
        onSettings={() => go('settings')}
      />
      {popup === 'new' && <Popup title="New game" onClose={close}><Setup onStart={(c) => { close(); start(c); }} /></Popup>}
      {popup === 'continue' && game && (
        <Popup title="Continue" onClose={close}>
          <ContinueBody day={game.day} days={game.config.days} stalls={game.players.length} cash={humans.length === 1 ? humans[0].cash : null}
            onResume={() => { close(); go('game'); }}
            onStartOver={() => { saveGame(null); setGame(null); open('new'); }} />
        </Popup>
      )}
      {popup === 'friend' && (
        <Popup title="Play a friend" onClose={close}>
          <FriendBody onCreate={() => { close(); go('online'); }} onJoin={(code) => { setJoinCode(code); close(); go('online'); }} onQuick={() => { close(); go('quick'); }} />
        </Popup>
      )}
      {popup === 'account' && <Popup title="Account" onClose={close}><AccountPanel onChange={() => refresh((n) => n + 1)} /></Popup>}
    </>
  );
}

function Setup({ onStart }: { onStart: (c: GameConfig) => void }) {
  const [name, setName] = useState(loadName());
  const nameRef = useRef<HTMLInputElement>(null);
  // A blank name field takes focus so the keyboard opens (best effort: some phones only allow it from a tap).
  useEffect(() => { if (!name) nameRef.current?.focus(); }, []);
  const [myChar, setMyChar] = useState<string>(CHARACTER_AVATARS[0]);
  const [seats, setSeats] = useState<Seat[]>([
    { kind: 'ai', level: 'easy', name: 'Player 2' },
    { kind: 'ai', level: 'normal', name: 'Player 3' },
    { kind: 'ai', level: 'normal', name: 'Player 4' },
    { kind: 'ai', level: 'normal', name: 'Player 5' },
    { kind: 'ai', level: 'normal', name: 'Player 6' },
  ]);
  const [rivals, setRivals] = useState(3);
  const [days, setDays] = useState(10);
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
  const takenForMe: Record<string, string> = Object.fromEntries(humanSeats.map(({ i }) => [picks[i], seatName(i)]));
  const takenFor = (i: number): Record<string, string> => ({
    [myChar]: name.trim() || 'You',
    ...Object.fromEntries(humanSeats.filter((h) => h.i !== i).map((h) => [picks[h.i], seatName(h.i)])),
  });

  const begin = () => {
    saveName(name.trim());
    // Computer shops take the characters the people did not pick.
    const pool = RIVALS.filter((r) => !usedChars.has(r.avatar)).sort(() => Math.random() - 0.5);
    const players: PlayerConfig[] = [
      { name: name.trim() || 'You', kind: 'human', avatar: myChar },
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
          <CharacterPick value={myChar} taken={takenForMe} onPick={setMyChar} />
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
                    <CharacterPick value={picks[i]} taken={takenFor(i)} onPick={(a) => setSeat(i, { avatar: a })} />
                  </>
                )}
                {rivals > 1 && <button type="button" class="seat-remove" onClick={() => removeSeat(i)}>Remove stall {i + 2}</button>}
              </div>
            );
          })()}
          <p class="small shop-total">{shopTotal(seats.slice(0, rivals))}</p>
          {seats.slice(0, rivals).some((s) => s.kind === 'human') && <p class="small muted">Friends share this phone and take turns. Secret prices are hidden between turns.</p>}
        </section>
        <section class="panel">
          <h3>Game length</h3>
          <div class="seg">
            {[[8, 'Quick'], [10, 'Standard'], [14, 'Long']].map(([d, l]) => <button class={days === d ? 'on' : ''} onClick={() => setDays(d as number)}>{l}<small>{d} days</small></button>)}
          </div>
        </section>
        <div class="sticky-start"><button class="btn primary big wide" onClick={begin}>Start game</button></div>
    </div>
  );
}

function Toggle({ on, set, title, text }: { on: boolean; set: (v: boolean) => void; title: string; text: string }) {
  return (
    <label class="toggle">
      <span><b>{title}</b><small>{text}</small></span>
      <input type="checkbox" checked={on} onChange={(e) => set((e.target as HTMLInputElement).checked)} />
      <i />
    </label>
  );
}

/** "4 shops: you, 2 friends, 1 computer" for the new-game screen. */
function shopTotal(rivals: { kind: 'human' | 'ai' }[]): string {
  const friends = rivals.filter((s) => s.kind === 'human').length;
  const computers = rivals.length - friends;
  const part = (n: number, word: string) => (n ? `, ${n} ${word}${n > 1 ? 's' : ''}` : '');
  return `${rivals.length + 1} stalls: you${part(friends, 'friend')}${part(computers, 'computer')}`;
}

function Trophies({ onBack, onWardrobe }: { onBack: () => void; onWardrobe: () => void }) {
  const have = unlocked();
  const sets = loadSets();
  const [colour, setColour] = useState(loadColour());
  const league = leagueStage();
  return (
    <div class="page">
      <header class="topbar"><button class="icon-btn" onClick={onBack}>←</button><div class="day"><b>Trophies</b></div><span /></header>
      <main class="scroll pad">
        <button class="btn primary wide" onClick={onWardrobe}>Wardrobe: {loadLooks().length}/{LOOKS.length} looks</button>
        <section class="panel">
          <h3>Market League <span class="muted small">{Math.min(league, LEAGUE.length)}/{LEAGUE.length}</span></h3>
          <ol class="league-list">
            {LEAGUE.map((st, i) => <li class={i < league ? 'done' : i === league ? 'now' : ''}><span>{i + 1}. {st.title}</span><small>{st.rivals.length} rival{st.rivals.length > 1 ? 's' : ''} · {st.rivals.map((r) => r.level).join(', ')}</small></li>)}
          </ol>
        </section>
        <section class="panel">
          <h3>Achievements <span class="muted small">{have.length}/{ACHIEVEMENTS.length}</span></h3>
          {THEMES.map((t) => {
            const list = ACHIEVEMENTS.filter((a) => a.theme === t.id);
            return (
              <div class="ach-theme">
                <h4>{t.title} <span class="muted small">{list.filter((a) => have.includes(a.id)).length}/{list.length}</span></h4>
                <div class="ach-list">
                  {list.map((a) => (
                    <div class={`ach ${have.includes(a.id) ? 'got' : ''}`}>
                      <b>{a.title}</b><small>{a.text}</small>
                      {a.goal && !have.includes(a.id) && <small class="ach-prog">{progressOf(a, sets, loadStats())} / {a.goal.target}</small>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
        <section class="panel">
          <h3>Stall colour</h3>
          <p class="small muted">Pick any colour. Your awning uses it in every game.</p>
          <div class="colour-pick">
            {COLOURS.map((c) => {
              const ok = colourUnlocked(c);
              return (
                <button type="button" class={colour === c.hex ? 'on' : ''} disabled={!ok} title={c.name}
                  onClick={() => { saveColour(c.id); setColour(c.hex); fx.tap(); }}>
                  <i style={{ background: `repeating-linear-gradient(90deg, ${c.hex} 0 8px, var(--cream) 8px 16px)` }} />
                  <small>{c.name}</small>
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [st, setSt] = useState<Settings>(loadSettings());
  const stats = loadStats();
  const upd = (p: Partial<Settings>) => {
    const n = { ...st, ...p };
    setSt(n);
    saveSettings(n);
  };
  return (
    <div class="page">
      <header class="topbar"><button class="icon-btn" onClick={onBack}>←</button><div class="day"><b>Settings</b></div><span /></header>
      <main class="scroll pad">
        <section class="panel">
          <Toggle on={st.sound} set={(v) => upd({ sound: v })} title="Sound" text="Coins, cards and cheers." />
          <Toggle on={st.haptics} set={(v) => upd({ haptics: v })} title="Vibration" text="A small buzz when you buy." />
          <Toggle on={st.fast} set={(v) => upd({ fast: v })} title="Fast rivals" text="Computer players move quicker." />
          <Toggle on={st.music} set={(v) => { upd({ music: v }); setMusic(v); }} title="Music" text="A gentle market tune." />
          <Toggle on={st.patterns} set={(v) => upd({ patterns: v })} title="Freshness patterns" text="Stripes and dots as well as colours, for colour-blind players." />
          <Toggle on={st.analytics} set={(v) => upd({ analytics: v })} title="Share anonymous stats" text="Helps fix crashes and balance the game. No names or IDs are sent." />
          <FullScreenButton />
          <button class="btn wide" onClick={() => { resetTutorial(); fx.tap(); }}>Replay the tutorial next game</button>
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
