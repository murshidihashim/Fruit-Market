// Screens: home, new-game setup, how to play, settings/stats, and the game itself.
import { useEffect, useRef, useState } from 'preact/hooks';
import { App as CapApp } from '@capacitor/app';
import { newGame, ranking, type GameConfig, type GameState, type Level, type PlayerConfig } from '../engine/game';
import { dailyConfig } from '../engine/daily';
import { FRUIT, FRUITS, RIVALS } from '../engine/data';
import { Fruit, Logo } from './art';
import { prewarmSprites } from './pixel';
import { Game } from './Game';
import { HowTo } from './HowTo';
import { Online } from './Online';
import { CODE_LENGTH, normaliseCode } from '../net/protocol';
import { fx, setMusic } from './fx';
import { resetTutorial } from './tutorial';
import { track } from '../net/telemetry';
import { fetchDaily, type BoardResult } from '../net/daily';
import { ACHIEVEMENTS, COLOURS, colourUnlocked, LEAGUE, leagueConfig, leagueStage, loadColour, saveColour, unlocked } from './progress';
import {
  consumeSaveNotice, dailyStreak, loadDaily, loadGame, loadName, loadSettings, loadStats, saveDaily, saveGame, saveName,
  saveSettings, saveStats, todayKey, type Settings,
} from './store';

type Screen = 'home' | 'setup' | 'game' | 'howto' | 'settings' | 'online' | 'quick' | 'trophies';

function roomFromUrl(): string | undefined {
  try {
    const c = normaliseCode(new URLSearchParams(location.search).get('room') ?? '');
    return c.length === CODE_LENGTH ? c : undefined;
  } catch {
    return undefined;
  }
}

const AI_ROSTER = RIVALS;
const HUMAN_AVATARS = ['🧑‍🍳', '👩‍🍳', '🦸', '🐵'];

interface Seat { kind: 'human' | 'ai'; level: Level; name: string }

export function App() {
  const [invite] = useState(roomFromUrl);
  const [screen, setScreen] = useState<Screen>(invite ? 'online' : 'home');
  const [game, setGame] = useState<GameState | null>(() => loadGame());
  const [saveNotice] = useState(() => consumeSaveNotice());
  // Get the common sprites ready while the player is on the home screen.
  useEffect(() => prewarmSprites(), []);
  const [lastConfig, setLastConfig] = useState<GameConfig | null>(null);
  const recorded = useRef<string | null>(null);

  const go = (sc: Screen) => {
    fx.tap();
    setScreen(sc);
  };

  useEffect(() => {
    const sub = CapApp.addListener('backButton', () => {
      if (screen === 'home') CapApp.exitApp();
      else setScreen('home');
    });
    return () => { sub.then((h) => h.remove()); };
  }, [screen]);

  const start = (cfg: GameConfig) => {
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
    if (ranking(g)[0] === me) st.wins++;
    st.bestCash = Math.max(st.bestCash, g.players[me].cash);
    st.totalSold += g.players[me].stats.sold;
    saveStats(st);
    if (g.config.daily) {
      const d = loadDaily();
      d[g.config.daily] = Math.max(d[g.config.daily] ?? 0, g.players[me].cash);
      saveDaily(d);
    }
  };

  const startDaily = () => start(dailyConfig(todayKey(), loadName(), HUMAN_AVATARS[0]));

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
            start(leagueConfig(leagueStage(), loadName(), HUMAN_AVATARS[0], (Math.random() * 2 ** 31) >>> 0));
            return;
          }
          start({ ...cfg, seed: (Math.random() * 2 ** 31) >>> 0 });
        }}
      />
    );
  }
  if (screen === 'setup') return <Setup onBack={() => go('home')} onStart={start} />;
  if (screen === 'howto') return <HowTo onDone={() => go('home')} />;
  if (screen === 'settings') return <SettingsScreen onBack={() => go('home')} />;
  if (screen === 'online') return <Online initialCode={invite} onExit={() => go('home')} />;
  if (screen === 'quick') return <Online quick onExit={() => go('home')} />;
  if (screen === 'trophies') return <Trophies onBack={() => go('home')} />;

  const daily = loadDaily();
  const today = todayKey();
  const streak = dailyStreak(daily);
  const resumable = game && game.phase !== 'over';
  const league = leagueStage();
  return (
    <div class="home">
      <div class="awning" />
      <div class="home-inner">
        <div class="logo-wrap"><Logo size={130} /></div>
        <h1>Fruit Market</h1>
        <p class="tagline">Buy fresh. Sell fast. Undercut your rivals before it all goes bad!</p>
        <div class="fruit-parade">{FRUITS.map((f) => <Fruit id={f} size={36} />)}</div>
        {saveNotice && <p class="save-notice" role="status">{saveNotice}</p>}
        {resumable && (
          <button class="btn primary big wide" onClick={() => go('game')}>Continue · Day {game!.day}/{game!.config.days}</button>
        )}
        <button class={`btn ${resumable ? '' : 'primary'} big wide`} onClick={() => go('setup')}>New game</button>
        <button class="btn wide league-btn" onClick={() => start(leagueConfig(Math.min(league, LEAGUE.length - 1), loadName(), HUMAN_AVATARS[0], (Math.random() * 2 ** 31) >>> 0))}>
          <span>Market League</span>
          <small>{league >= LEAGUE.length ? 'Champion! Replay the Royal Market' : `Stage ${league + 1}/${LEAGUE.length}: ${LEAGUE[league].title}`}</small>
        </button>
        <div class="row2">
          <button class="btn online-btn" onClick={() => go('quick')}>Quick match</button>
          <button class="btn online-btn" onClick={() => go('online')}>Play a friend</button>
        </div>
        <button class="btn wide daily" onClick={startDaily}>
          <span>Daily challenge</span>
          <small>{daily[today] !== undefined ? `Today's best: $${daily[today]}` : 'Same market for everyone today'}{streak ? ` · ${streak}-day streak` : ''}</small>
        </button>
        <DailyPeek date={today} />
        <div class="row3">
          <button class="btn" onClick={() => go('howto')}>How to play</button>
          <button class="btn" onClick={() => go('trophies')}>Trophies</button>
          <button class="btn" onClick={() => go('settings')}>Settings</button>
        </div>
      </div>
    </div>
  );
}

function Setup({ onBack, onStart }: { onBack: () => void; onStart: (c: GameConfig) => void }) {
  const [name, setName] = useState(loadName());
  const [seats, setSeats] = useState<Seat[]>([
    { kind: 'ai', level: 'easy', name: 'Player 2' },
    { kind: 'ai', level: 'normal', name: 'Player 3' },
    { kind: 'ai', level: 'normal', name: 'Player 4' },
  ]);
  const [rivals, setRivals] = useState(3);
  const [days, setDays] = useState(10);
  const [unripe, setUnripe] = useState(true);
  const [upgrades, setUpgrades] = useState(true);
  const [events, setEvents] = useState(true);

  const setSeat = (i: number, patch: Partial<Seat>) => setSeats((ss) => ss.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  const begin = () => {
    saveName(name.trim() || 'You');
    let ai = 0;
    let hu = 1;
    const players: PlayerConfig[] = [
      { name: name.trim() || 'You', kind: 'human', avatar: HUMAN_AVATARS[0] },
      ...seats.slice(0, rivals).map((st): PlayerConfig => st.kind === 'ai'
        ? { ...AI_ROSTER[(ai++ + Math.floor(Math.random() * 6)) % AI_ROSTER.length], kind: 'ai', level: st.level }
        : { name: st.name.trim() || `Player ${hu + 1}`, kind: 'human', avatar: HUMAN_AVATARS[hu++ % HUMAN_AVATARS.length] }),
    ];
    // Avoid duplicate computer names.
    const used = new Set<string>();
    for (const p of players) {
      if (p.kind !== 'ai') continue;
      let k = AI_ROSTER.findIndex((r) => r.name === p.name);
      while (used.has(AI_ROSTER[k].name)) k = (k + 1) % AI_ROSTER.length;
      used.add(AI_ROSTER[k].name);
      p.name = AI_ROSTER[k].name;
      p.avatar = AI_ROSTER[k].avatar;
      p.quip = AI_ROSTER[k].quip;
    }
    onStart({ players, days, unripe, upgrades, events, seed: (Math.random() * 2 ** 31) >>> 0 });
  };

  return (
    <div class="page">
      <header class="topbar"><button class="icon-btn" onClick={onBack}>←</button><div class="day"><b>New game</b></div><span /></header>
      <main class="scroll pad">
        <section class="panel">
          <h3>Your shop</h3>
          <input class="input" value={name} maxLength={14} onInput={(e) => setName((e.target as HTMLInputElement).value)} placeholder="Your name" />
        </section>
        <section class="panel">
          <h3>Rival shops</h3>
          <div class="seg">{[1, 2, 3].map((n) => <button class={rivals === n ? 'on' : ''} onClick={() => setRivals(n)}>{n}</button>)}</div>
          {seats.slice(0, rivals).map((st, i) => (
            <div class="seat">
              <div class="seg small">
                <button class={st.kind === 'ai' ? 'on' : ''} onClick={() => setSeat(i, { kind: 'ai' })}>🤖 Computer</button>
                <button class={st.kind === 'human' ? 'on' : ''} onClick={() => setSeat(i, { kind: 'human' })}>🙋 Friend</button>
              </div>
              {st.kind === 'ai' ? (
                <div class="seg small">
                  {(['easy', 'normal', 'hard'] as Level[]).map((l) => <button class={st.level === l ? 'on' : ''} onClick={() => setSeat(i, { level: l })}>{l[0].toUpperCase() + l.slice(1)}</button>)}
                </div>
              ) : (
                <input class="input" value={st.name} maxLength={14} onInput={(e) => setSeat(i, { name: (e.target as HTMLInputElement).value })} />
              )}
            </div>
          ))}
          {seats.slice(0, rivals).some((s) => s.kind === 'human') && <p class="small muted">Friends share this phone and take turns. Secret prices are hidden between turns.</p>}
        </section>
        <section class="panel">
          <h3>Game length</h3>
          <div class="seg">
            {[[8, 'Quick'], [10, 'Standard'], [14, 'Long']].map(([d, l]) => <button class={days === d ? 'on' : ''} onClick={() => setDays(d as number)}>{l}<small>{d} days</small></button>)}
          </div>
        </section>
        <section class="panel">
          <h3>Rules</h3>
          <Toggle on={events} set={setEvents} title="Event cards" text="Festivals, heatwaves, price hikes…" />
          <Toggle on={upgrades} set={setUpgrades} title="Shop upgrades" text="Each evening, build one of 3 upgrades on offer." />
          <Toggle on={unripe} set={setUnripe} title="Unripe fruit" text={`Some deliveries arrive unripe: $1 now, sell later. ${FRUIT.mango.name}es take longest.`} />
        </section>
        <button class="btn primary big wide" onClick={begin}>Open the shops</button>
      </main>
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

function DailyPeek({ date }: { date: string }) {
  const [res, setRes] = useState<BoardResult | null>(null);
  useEffect(() => { let alive = true; void fetchDaily(date).then((r) => { if (alive) setRes(r); }); return () => { alive = false; }; }, [date]);
  if (!res || res.error || !res.top.length) return null;
  return (
    <div class="daily-peek" aria-label="Today's leaderboard">
      <small>Today's top shops{res.players ? ` · ${res.players} played` : ''}</small>
      {res.top.slice(0, 3).map((e, i) => <span><b>{i + 1}.</b> {e.name} <b>${e.cash}</b></span>)}
    </div>
  );
}

function Trophies({ onBack }: { onBack: () => void }) {
  const have = unlocked();
  const [colour, setColour] = useState(loadColour());
  const league = leagueStage();
  return (
    <div class="page">
      <header class="topbar"><button class="icon-btn" onClick={onBack}>←</button><div class="day"><b>Trophies</b></div><span /></header>
      <main class="scroll pad">
        <section class="panel">
          <h3>Market League <span class="muted small">{Math.min(league, LEAGUE.length)}/{LEAGUE.length}</span></h3>
          <ol class="league-list">
            {LEAGUE.map((st, i) => <li class={i < league ? 'done' : i === league ? 'now' : ''}><span>{i + 1}. {st.title}</span><small>{st.rivals.length} rival{st.rivals.length > 1 ? 's' : ''} · {st.rivals.map((r) => r.level).join(', ')}</small></li>)}
          </ol>
        </section>
        <section class="panel">
          <h3>Achievements <span class="muted small">{have.length}/{ACHIEVEMENTS.length}</span></h3>
          <div class="ach-list">
            {ACHIEVEMENTS.map((a) => <div class={`ach ${have.includes(a.id) ? 'got' : ''}`}><b>{a.title}</b><small>{a.text}</small></div>)}
          </div>
        </section>
        <section class="panel">
          <h3>Stall colour</h3>
          <p class="small muted">Unlock colours with achievements. Your awning uses it in every game.</p>
          <div class="colour-pick">
            {COLOURS.map((c) => {
              const ok = colourUnlocked(c);
              return (
                <button type="button" class={colour === c.hex ? 'on' : ''} disabled={!ok} title={ok ? c.name : `Locked: ${ACHIEVEMENTS.find((a) => a.id === c.needs)?.title}`}
                  onClick={() => { saveColour(c.id); setColour(c.hex); fx.tap(); }}>
                  <i style={{ background: `repeating-linear-gradient(90deg, ${c.hex} 0 8px, var(--cream) 8px 16px)` }} />
                  <small>{ok ? c.name : 'Locked'}</small>
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
          <p class="muted">No ads and no accounts. Your games stay on your phone. If you allow it, anonymous counts (like "a game was finished") are sent to help improve the game.</p>
          <p class="muted">Version {__APP_VERSION__}</p>
        </section>
      </main>
    </div>
  );
}

declare const __APP_VERSION__: string;
