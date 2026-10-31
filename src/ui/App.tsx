// Screens: home, new-game setup, how to play, settings/stats, and the game itself.
import { useEffect, useRef, useState } from 'preact/hooks';
import { App as CapApp } from '@capacitor/app';
import { newGame, ranking, type GameConfig, type GameState, type Level, type PlayerConfig } from '../engine/game';
import { dailyConfig } from '../engine/daily';
import { CHARACTER_AVATARS, FRUIT, FRUITS, RIVALS } from '../engine/data';
import { Fruit } from './art';
import { CharacterPick } from './CharacterPick';
import { Portrait, prewarmSprites } from './pixel';
import { Game } from './Game';
import { Opening } from './Opening';
import { HowTo } from './HowTo';
import { AccountPanel } from './AccountPanel';
import { Online } from './Online';
import { CODE_LENGTH, normaliseCode } from '../net/protocol';
import { fx, setMusic } from './fx';
import { FullScreenButton } from './FullScreenButton';
import { fullscreenSupported, iphoneNeedsHomeScreen } from './fullscreen';
import { resetTutorial } from './tutorial';
import { track } from '../net/telemetry';
import { fetchDaily, type BoardResult } from '../net/daily';
import { ACHIEVEMENTS, COLOURS, colourUnlocked, LEAGUE, leagueConfig, leagueStage, loadColour, loadSets, saveColour, THEMES, unlocked } from './progress';
import { progressOf } from './achievements';
import {
  consumeSaveNotice, dailyStreak, loadDaily, loadGame, loadName, loadSettings, loadStats, nameOrDefault, saveDaily, saveGame, saveName,
  saveSettings, saveStats, todayKey, type Settings,
} from './store';
import { C } from './palette';

type Screen = 'home' | 'setup' | 'game' | 'howto' | 'settings' | 'online' | 'quick' | 'trophies';

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

// The market opening plays once, when the game is first opened. Automated browser tests skip it.
export function App() {
  const [opening, setOpening] = useState(() => !navigator.webdriver);
  return (
    <>
      <Main />
      {opening && <Opening onDone={() => setOpening(false)} />}
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
  const startLeague = () => start(leagueConfig(Math.min(league, LEAGUE.length - 1), nameOrDefault(loadName()), HUMAN_AVATARS[0], (Math.random() * 2 ** 31) >>> 0));
  return (
    <div class="home cosy">
      <div class="harbour">
        <HomeScene />
        <div class="hm-sign-wrap">
          <div class="hm-fox" aria-hidden="true"><Portrait who="fox" size={64} /></div>
          <div class="hm-sign">
            <h1>Fruit Market</h1>
            <p>Where the whole world shops</p>
            <p class="hm-secret">…and every price is a secret</p>
          </div>
        </div>
        <div class="hm-fruit" aria-hidden="true">{FRUITS.map((f) => <Fruit id={f} size={40} />)}</div>
      </div>
      <div class="hm-actions">
        {saveNotice && <p class="save-notice" role="status">{saveNotice}</p>}
        {resumable && (
          <button class="hm-btn hm-primary" onClick={() => go('game')}>Continue · Day {game!.day}/{game!.config.days}</button>
        )}
        <button class={`hm-btn ${resumable ? 'hm-secondary' : 'hm-primary'}`} onClick={() => go('setup')}>New game</button>
        <div class="hm-grid2">
          <button class="hm-btn hm-teal" onClick={() => go('online')}><span>Play a friend</span><small>2 to 4 players online</small></button>
          <button class="hm-btn hm-teal" onClick={() => go('quick')}><span>Quick match</span><small>Meet a stranger</small></button>
        </div>
        <button class="hm-btn hm-card" onClick={startDaily}>
          <DailyIcon />
          <span class="hm-card-text">
            <span>Daily market</span>
            <small>{daily[today] !== undefined ? `Today's best: $${daily[today]}` : 'Same market for everyone today'}{streak ? ` · ${streak}-day streak` : ''}</small>
          </span>
        </button>
        <DailyPeek date={today} />
        <button class="hm-btn hm-card" onClick={startLeague}>
          <TrophyIcon />
          <span class="hm-card-text">
            <span>Market League</span>
            <small>{league >= LEAGUE.length ? 'Champion! Replay the Royal Market' : `Stage ${league + 1} of ${LEAGUE.length} · ${LEAGUE[league].title}`}</small>
          </span>
        </button>
        <div class="hm-grid3">
          <button class="hm-btn hm-small" onClick={() => go('howto')}>How to play</button>
          <button class="hm-btn hm-small" onClick={() => go('trophies')}>Trophies</button>
          <button class="hm-btn hm-small" onClick={() => go('settings')}>Settings</button>
        </div>
      </div>
    </div>
  );
}

/** The flat scene behind the home sign: sky, sun and two hills (decoration only). */
function HomeScene() {
  return (
    <svg class="hm-scene" viewBox="0 0 400 240" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect width="400" height="240" fill={C.street} />
      <circle cx="318" cy="62" r="24" fill={C.gold} stroke={C.ink} stroke-width="2.5" />
      <path d="M-20 214 Q60 150 160 178 T420 170 V260 H-20 Z" fill={C.c_9fcdbd} stroke={C.ink} stroke-width="2.5" />
      <path d="M60 240 Q160 176 260 204 T440 196 V280 H60 Z" fill={C.teal} stroke={C.ink} stroke-width="2.5" />
    </svg>
  );
}

function DailyIcon() {
  return <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true"><rect x="4" y="6" width="24" height="22" rx="5" fill={C.c_e7a73a} /><rect x="4" y="6" width="24" height="7" rx="3" fill={C.c_c65a3a} /><circle cx="16" cy="20" r="4" fill={C.c_fffaf0} /></svg>;
}

function TrophyIcon() {
  return <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true"><path d="M8 6 H24 V12 Q24 20 16 21 Q8 20 8 12 Z" fill={C.gold} /><rect x="13" y="21" width="6" height="5" fill={C.c_c98f1c} /><rect x="9" y="26" width="14" height="3" rx="1.5" fill={C.c_8e5b33} /></svg>;
}

function Setup({ onBack, onStart }: { onBack: () => void; onStart: (c: GameConfig) => void }) {
  const [name, setName] = useState(loadName());
  const nameRef = useRef<HTMLInputElement>(null);
  // A blank name field takes focus so the keyboard opens (best effort: some phones only allow it from a tap).
  useEffect(() => { if (!name) nameRef.current?.focus(); }, []);
  const [myChar, setMyChar] = useState<string>(CHARACTER_AVATARS[0]);
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
  // Playtest options (PLAN-015): compare versions of the rules at the table.
  const [marketDays, setMarketDays] = useState(true);
  const [core, setCore] = useState(false);
  const [street, setStreet] = useState(false);
  const [pulseRule, setPulseRule] = useState(false);

  const setSeat = (i: number, patch: Partial<Seat>) => setSeats((ss) => ss.map((x, k) => (k === i ? { ...x, ...patch } : x)));

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
    <div class="page">
      <header class="topbar"><button class="icon-btn" onClick={onBack}>←</button><div class="day"><b>New game</b></div><span /></header>
      <main class="scroll pad">
        <section class="panel">
          <h3>Your stall</h3>
          <input ref={nameRef} class="input" aria-label="Your name" value={name} maxLength={14} onInput={(e) => setName((e.target as HTMLInputElement).value)} placeholder="Your name" />
          <h3>Your shopkeeper</h3>
          <p class="small muted">One perk for the whole game. The computer stalls take the shopkeepers left over.</p>
          <CharacterPick value={myChar} taken={takenForMe} onPick={setMyChar} />
        </section>
        <section class="panel">
          <h3>Rival stalls</h3>
          <p class="small muted">Up to 4 stalls. Pick Friend to pass this phone around.</p>
          <div class="seg">{[1, 2, 3].map((n) => <button class={rivals === n ? 'on' : ''} onClick={() => setRivals(n)}>{n}</button>)}</div>
          {seats.slice(0, rivals).map((st, i) => (
            <div class="seat">
              <div class="seg small">
                <button class={st.kind === 'ai' ? 'on' : ''} onClick={() => setSeat(i, { kind: 'ai' })}>Computer</button>
                <button class={st.kind === 'human' ? 'on' : ''} onClick={() => setSeat(i, { kind: 'human' })}>Friend</button>
              </div>
              {st.kind === 'ai' ? (
                <div class="seg small">
                  {(['easy', 'normal', 'hard'] as Level[]).map((l) => <button class={st.level === l ? 'on' : ''} onClick={() => setSeat(i, { level: l })}>{l[0].toUpperCase() + l.slice(1)}</button>)}
                </div>
              ) : (
                <>
                  <input class="input" aria-label={`Name for stall ${i + 1}`} value={st.name} maxLength={14} onInput={(e) => setSeat(i, { name: (e.target as HTMLInputElement).value })} />
                  <CharacterPick value={picks[i]} taken={takenFor(i)} onPick={(a) => setSeat(i, { avatar: a })} />
                </>
              )}
            </div>
          ))}
          <p class="small shop-total">{shopTotal(seats.slice(0, rivals))}</p>
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
          <Toggle on={upgrades && !core} set={setUpgrades} title="Stall upgrades" text="After each Market Day, build one: Cold Room, Juice Bar, Handcart or Premium Display." />
          <Toggle on={unripe} set={setUnripe} title="Unripe fruit" text={`Some deliveries arrive unripe: $1 now, sell later. ${FRUIT.mango.name}es take longest.`} />
          <Toggle on={marketDays} set={setMarketDays} title="Market Days" text="Days 3, 6, 9 and 12: one more walk-in. Closing Day on the final day: +$1, then the jam maker buys leftovers." />
        </section>
        <section class="panel">
          <h3>Playtest options</h3>
          <Toggle on={core} set={setCore} title="Basic game" text="No shopkeeper perks, favour cards or upgrades. Just buying, stalls and the bell." />
          <Toggle on={street} set={setStreet} title="Fixed prices" text="Beginner prices: one top price per fruit; generous customers pay $2 more." />
          <Toggle on={pulseRule} set={setPulseRule} title="Price drift" text="Advanced: fruit that sells out gets dearer tomorrow, unsold fruit cheaper." />
        </section>
        <button class="btn primary big wide" onClick={begin}>Start game</button>
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

/** "4 shops: you, 2 friends, 1 computer" for the new-game screen. */
function shopTotal(rivals: { kind: 'human' | 'ai' }[]): string {
  const friends = rivals.filter((s) => s.kind === 'human').length;
  const computers = rivals.length - friends;
  const part = (n: number, word: string) => (n ? `, ${n} ${word}${n > 1 ? 's' : ''}` : '');
  return `${rivals.length + 1} stalls: you${part(friends, 'friend')}${part(computers, 'computer')}`;
}

function DailyPeek({ date }: { date: string }) {
  const [res, setRes] = useState<BoardResult | null>(null);
  useEffect(() => { let alive = true; void fetchDaily(date).then((r) => { if (alive) setRes(r); }); return () => { alive = false; }; }, [date]);
  if (!res || res.error || !res.top.length) return null;
  return (
    <div class="daily-peek" aria-label="Today's leaderboard">
      <small>Today's top stalls{res.players ? ` · ${res.players} played` : ''}</small>
      {res.top.slice(0, 3).map((e, i) => <span><b>{i + 1}.</b> {e.name} <b>${e.cash}</b></span>)}
    </div>
  );
}

function Trophies({ onBack }: { onBack: () => void }) {
  const have = unlocked();
  const sets = loadSets();
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
          {!fullscreenSupported() && iphoneNeedsHomeScreen() && <p class="muted small">For full screen on iPhone: tap Share, then Add to Home Screen, and open Fruit Market from there.</p>}
          <button class="btn wide" onClick={() => { resetTutorial(); fx.tap(); }}>Replay the tutorial next game</button>
        </section>
        <AccountPanel onChange={() => setSt(loadSettings())} />
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
          <p class="muted">Version {__APP_VERSION__}</p>
        </section>
      </main>
    </div>
  );
}

declare const __APP_VERSION__: string;
