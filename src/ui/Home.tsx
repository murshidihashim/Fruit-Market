// The home screen (PLAN-113, the player journey; before it the "Ticket Booth" of PLAN-074). Top to bottom: the four
// fruit lanes (the band the opening folds into), the title with your stall level, your illustrated stall with your
// shopkeeper and the next thing you can unlock, one Play button (Continue first when a game is waiting, with that
// game's table under it), the Daily market with its real first customer card and the lorry's fruit, your next two
// goals, and tiles for the Market League, the stamp book and the Wardrobe; How to play, Settings and the account on
// the kraft strip at the foot. Play opens the Play menu (PlayMenu, below): every way to start a game on one screen.
// The look is the game table's (Market Ticket): booth.css for the parts the opening animates, journey-home.css for the
// rest. The opening (Opening.tsx, "Lane Drop") plays on this screen: "hm-intro" on <html> animates the title and
// everything under the band (".hm-title", ".hm-rest") into place.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { dailyConfig, dailyTwist } from '../engine/daily';
import { FRUIT, RIVALS, lookOf, stageAt, type FruitId } from '../engine/data';
import { count, newGame, shelfSize, type GameState } from '../engine/game';
import { fetchDaily, type BoardResult } from '../net/daily';
import { ownerHash, placeWords } from '../net/sprint';
import { LOOKS, type Look } from '../net/looks';
import { CODE_LENGTH, normaliseCode } from '../net/protocol';
import { accountsAvailable, signedInAs } from './account';
import { Face } from './art';
import { Gazette, TradingCard } from './cards';
import { CardZoom } from './cardZoom';
import { shopScene } from './deckArt';
import { useFocusTrap } from './focusTrap';
import { FruitSvg } from './fruitIcons';
import { PropSprite, RoofBand } from './icons';
import { chosenColour, myAvatar, syncLooks, worn } from './looks';
import { LENGTHS, computerLine, leagueLine as leagueWords, phoneLine, quickLine, roomLine } from './playMenu';
import { leagueStage, myPlace, snapshot, syncTiers } from './progress';
import { BackArrow, FramedFace, TrophyPic, shownAvatar } from './stampCard';
import { goals, nextReward, type Goal } from './stamps';
import { SPRINT_TITLE, SprintRow, bestLine, useSprintBoards } from './Sprint';
import { loadSprintBest } from './sprintStore';
import { loadDaily, todayKey } from './store';
import { currentStreak } from './streak';
import { firstCustomer, rivalsLine, shortDate } from './dailyCard';
import { Awning, seatColour } from './table';
import './journey-home.css';

export interface ShopProps {
  /** "Daily market · Day 4/10" when a game is waiting to be continued (its mode, REP-133 A-13), else null. */
  resume: string | null;
  /** Your cash in the waiting game (one person at the table), else null. */
  cash: number | null;
  /** The game that is waiting, for its table under Continue (null when none is). */
  table: GameState | null;
  leagueLine: string;
  today: string;
  notice: string | null;
  onContinue: () => void;
  /** Opens the Play menu. */
  onPlay: () => void;
  onDaily: () => void;
  /** PLAN-114: starts today's Market Sprint. */
  onSprint: () => void;
  onLeague: () => void;
  onWardrobe: () => void;
  onAccount: () => void;
  onTrophies: () => void;
  onHowTo: () => void;
  onSettings: () => void;
  /** ON-08 (PLAN-110): an online match this phone left and can go back to: its room code (null when there is none). */
  room?: string | null;
  onRoom?: (code: string) => void;
}

/** The four fruit lanes, in the game's order and colours. The opening draws the same band (Opening.tsx). */
export const LANES: FruitId[] = ['blueberry', 'watermelon', 'mango', 'apple'];
export function LaneBand({ class: cls, style }: { class?: string; style?: string }) {
  return (
    <div class={`hm-lanes${cls ? ` ${cls}` : ''}`} style={style} aria-hidden="true">
      {LANES.map((f, i) => <span class={`hm-lane f-${f}`} style={`--i:${i}`}><i><FruitSvg id={f} size={28} alt="" /></i></span>)}
    </div>
  );
}

/** A tier's words as part of a line: "Sell a piece of fruit." becomes "sell a piece of fruit". */
const asPart = (text: string) => text.replace(/\.$/, '').replace(/^./, (c) => c.toLowerCase());

/** The look a goal unlocks, if it unlocks one. */
export const goalLook = (g: Goal): Look | undefined => LOOKS.find((l) => l.from.kind === 'trophy' && l.from.id === g.step.id);

/**
 * The picture of what a goal gives: the roof or trim on your awning, the hat (or other piece) on your shopkeeper, the
 * prop itself; otherwise the trophy card's picture.
 */
function GoalPic({ g, look }: { g: Goal; look?: Look }) {
  const me = worn();
  if (look?.slot === 'roof' || look?.slot === 'trim') return <span class="jh-gpic awn"><RoofBand cls="tb-awn" colour={chosenColour(me) ?? seatColour(0)} roof={look.slot === 'roof' ? look.id : me.roof} trim={look.slot === 'trim' ? look.id : undefined} /></span>;
  if (look?.kind === 'wear') return <span class="jh-gpic face"><Face who={myAvatar()} size={40} worn={[look.id]} /></span>;
  if (look?.slot === 'prop') return <span class="jh-gpic"><PropSprite id={look.id} size={36} cls="jh-prop" /></span>;
  return <span class="jh-gpic"><TrophyPic pic={g.card.pic} /></span>;
}

/**
 * Your stall: your shopkeeper at their stall under your awning (your colour and roof), and on it the next thing you
 * can unlock: the nearest goal that gives a look, else the next stall level's reward.
 */
function StallHero() {
  const avatar = myAvatar();
  const name = RIVALS.find((r) => r.avatar === avatar)?.name ?? 'Your shopkeeper';
  const snap = snapshot();
  const g = goals(snap).find((x) => goalLook(x));
  const look = g && goalLook(g);
  const next = nextReward(myPlace());
  const line = g && look ? `${look.title} · ${asPart(g.step.text)}`
    : next?.reward ? `Level ${next.level}: ${next.reward.text} · ${next.stamps} ${next.stamps === 1 ? 'stamp' : 'stamps'}` : null;
  const scene = shopScene(avatar);
  return (
    <div class="jh-stall">
      {scene ? <img class="jh-scene" src={scene} alt={`${name} at your stall`} decoding="async" draggable={false} /> : <Face who={avatar} size={120} />}
      <div class="jh-awn"><Awning p={0} look={worn()} /></div>
      {line && <span class="jh-next"><b>Next</b> {line}</span>}
    </div>
  );
}

/** PLAN-114: the card holds both Daily formats, each with its length: the Market Sprint's row first, then the Daily
 *  market under its own heading, with your best today and your place on each.
 *  The Daily market: what the first morning of today's Daily puts on the table, which is the same for everyone and
 *  public from the game's first screen: the customer who stands first in the row (no game has an event card on its
 *  first day; should one ever, it is shown instead), and the lorry's load. Then today's twist, your best today or how
 *  many have played, and one button. */
function DailyCard({ today, onDaily, onSprint }: { today: string; onDaily: () => void; onSprint: () => void }) {
  const first = useMemo(() => newGame(dailyConfig(today, 'You')), [today]);
  const [res, setRes] = useState<BoardResult | null>(null);
  useEffect(() => { let alive = true; void ownerHash().then((me) => fetchDaily(today, me)).then((r) => { if (alive) setRes(r); }); return () => { alive = false; }; }, [today]);
  const daily = loadDaily();
  const streak = currentStreak(Object.keys(daily), today);
  const e = first.event;
  // REP-133 A-02: the card and the sentence show the prices the game will use (a Fixed prices day's, not the card's).
  const who = firstCustomer(first);
  const best = res && !res.error && res.top.length ? res.top[0].cash : null;
  const firstWords = who ? who.words : e ? `Today's event: ${e.title}.` : '';
  return (
    <section class="jh-daily" data-page="today" aria-label="Daily market">
      <div class="jh-dh"><span>Daily market · {shortDate(today)}</span><small>{streak > 0 ? `${streak}-day streak` : 'same market for everyone'}</small></div>
      <SprintRow today={today} onSprint={onSprint} />
      <div class="jh-dsub"><b>Daily market · {first.config.days} days</b>{daily[today] !== undefined && <small>{bestLine(daily[today], res?.error ? null : placeWords(res ? { rank: res.rank, players: res.players ?? res.top.length } : undefined))}</small>}</div>
      <div class="jh-db">
        {/* PLAN-116 (REP-133 B-08): the small card opens whole on a tap; the sentence beside it says its prices */}
        <CardZoom class="jh-dcard" title={who ? lookOf(who.name).title : e ? e.title : 'Daily market'}>{who ? <TradingCard who={who.name} wants={who.wants} eager /> : e ? <Gazette event={e} eager /> : null}</CardZoom>
        <div class="jh-dr">
          <span class="jh-lb">Today's lorry brings</span>
          <div class="jh-lorry">{LANES.map((f) => <span class={`f-${f}`}><FruitSvg id={f} size={22} alt={FRUIT[f].plural} /><b>{first.delivery[f] ?? 0}</b></span>)}</div>
          <p class="jh-dt">{firstWords} {dailyTwist(today).text} {rivalsLine(first.config)}</p>
          {daily[today] === undefined && best !== null ? <p class="jh-ds"><b>{res?.players ?? res?.top.length}</b> played · best so far <b>${best}</b></p> : null}
          <button class="jh-dgo" onClick={onDaily}><PlayIcon />Play the Daily market</button>
        </div>
      </div>
    </section>
  );
}

/** Your next two goals: the trophy tiers nearest to done, with what each gives. */
function Goals() {
  const two = goals(snapshot()).slice(0, 2);
  if (!two.length) return null;
  return (
    <section class="jh-goals" aria-label="Your next goals">
      <span class="jh-h">Your next goals</span>
      {two.map((g) => {
        const look = goalLook(g);
        return (
          <div class="jh-goal">
            <GoalPic g={g} look={look} />
            <span class="jh-gt"><b>{g.step.text.replace(/\.$/, '')}</b><small>{look ? `${look.title} · +${g.stamps} stamps` : `+${g.stamps} stamps`}</small></span>
            <span class="jh-gp">{g.card.money ? `$${g.value}/$${g.goal}` : `${g.value}/${g.goal}`}</span>
          </div>
        );
      })}
    </section>
  );
}

/** Your table, when a game is waiting: the day, your shelf and cash when one person plays, every stall's cash (which
 *  the table shows to all), and today's event card by name. A shared phone shows no shelf: it is one person's secret. */
function TablePage({ g, cash }: { g: GameState; cash: number | null }) {
  const solo = cash !== null;
  const me = g.players.findIndex((p) => p.kind === 'human');
  const pl = g.players[me];
  const order = g.players.map((_, i) => i).sort((a, b) => g.players[b].cash - g.players[a].cash);
  const shelf = solo && pl ? LANES.flatMap((f) => pl.stock[f].flatMap((n, pos) => Array.from({ length: n }, () => ({ f, stage: stageAt(f, pos) })))) : [];
  const size = pl ? shelfSize(pl) : 8;
  return (
    <div class="hm-slot jh-table" data-page="table">
      <div class="hm-sh"><span>Your table · Day {g.day} of {g.config.days}</span>{solo && <b>You have ${cash}</b>}</div>
      <div class="hm-sb">
        <div class={`hm-wt ${solo ? '' : 'one'}`}>
          {solo && pl && (
            <div class="hm-cl">
              <span class="hm-lb">Your shelf · {count(pl.stock)} of {size}</span>
              <div class="hm-shf">
                {Array.from({ length: Math.max(size, shelf.length) }, (_, i) => (shelf[i]
                  ? <span class="hm-sl"><FruitSvg id={shelf[i].f} stage={shelf[i].stage} size={24} alt={shelf[i].f} /></span>
                  : <span class="hm-sl e" role="img" aria-label="Empty space" />))}
              </div>
            </div>
          )}
          <div class="hm-cl">
            <span class="hm-lb">The table</span>
            {order.map((i) => (
              <span class={`hm-rw ${solo && i === me ? 'me' : ''}`}>
                <FramedFace who={shownAvatar(g.players, i)} size={20} look={i === me ? worn() : g.players[i].look} />
                <span>{solo && i === me ? 'You' : g.players[i].name}</span><b>${g.players[i].cash}</b>
              </span>
            ))}
          </div>
        </div>
        <div class="hm-nb"><b>Today: {g.event ? g.event.title : 'Calm Day'}</b></div>
      </div>
    </div>
  );
}

export function Shopfront(p: ShopProps) {
  const me = signedInAs();
  // What is stored is brought up to date as the game opens: the tiers a player from before the stamp book has already
  // reached, and the looks their trophies and stall level give. Nothing is ever taken away.
  useState(() => { syncTiers(); syncLooks(); });
  const place = myPlace();
  return (
    <div class="home hm jh">
      <div class="hm-in">
        <LaneBand />
        <div class="hm-title jh-top">
          <h1 class="hm-name">Fruit<br />Market</h1>
          <span class="jh-lvl" aria-label={`Level ${place.level}, ${place.rank.name}`}><b>Level {place.level}</b><small>{place.rank.name}</small></span>
        </div>
        <div class="hm-rest">
          {p.notice && <p class="save-notice" role="status">{p.notice}</p>}
          <StallHero />
          <div class="jh-play">
            {p.resume ? (
              <>
                <button class="jh-go" onClick={p.onContinue}><PlayIcon />Continue<span class="hm-vh"> · </span><small>{p.resume}</small></button>
                <button class="jh-go2" data-a="play" onClick={p.onPlay}>Play something else</button>
              </>
            ) : <button class="jh-go" data-a="play" onClick={p.onPlay}>Play</button>}
          </div>
          {p.table && <TablePage g={p.table} cash={p.cash} />}
          {p.room && p.onRoom && (
            <button class="hm-tk hm-room jh-room" onClick={() => p.onRoom!(p.room!)}>
              <span class="hm-tk-ic"><PlayIcon /></span>
              <span class="hm-tk-txt"><small>Your online match</small><span>Back to room {p.room}</span></span>
            </button>
          )}
          <DailyCard today={p.today} onDaily={p.onDaily} onSprint={p.onSprint} />
          <Goals />
          <nav class="jh-tiles" aria-label="Your progress">
            <button onClick={p.onLeague}><b>League</b><span>{p.leagueLine}</span></button>
            <button onClick={p.onTrophies}><b>Stamp book</b><span>{place.filled} of {place.size} stamps</span></button>
            <button onClick={p.onWardrobe}><b>Wardrobe</b><span class="jh-tface"><FramedFace who={myAvatar()} size={30} look={worn()} /></span></button>
          </nav>
          <nav class="hm-foot jh-foot">
            <button onClick={p.onHowTo}>How to play</button>
            <button onClick={p.onSettings}>Settings</button>
            {accountsAvailable() && <button class="jh-acct" onClick={p.onAccount}>{me ? `Hi, ${me}` : 'Account'}</button>}
          </nav>
        </div>
      </div>
    </div>
  );
}

export interface PlayMenuProps {
  /** The game length chosen for a game against computers or on one phone. */
  days: number;
  onDays: (days: number) => void;
  onBack: () => void;
  onQuick: () => void;
  onRoom: () => void;
  onPublic: () => void;
  onJoin: (code: string) => void;
  onComputer: () => void;
  onOnePhone: () => void;
  onDaily: () => void;
  /** PLAN-114: starts today's Market Sprint. */
  onSprint: () => void;
  onLeague: () => void;
}

/**
 * PLAN-113: the Play menu, every way to start a game on one screen: Quick match, a private room, joining with a code,
 * a game against computers, one phone passed round, the public rooms, the Daily market and the Market League. Each says
 * its real player count and length. The length chosen here is where the computer and one-phone set-up starts.
 */
export function PlayMenu(p: PlayMenuProps) {
  const avatar = myAvatar();
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState('');
  const clean = normaliseCode(code);
  const ok = clean.length === CODE_LENGTH;
  const stage = leagueStage();
  const rivals = RIVALS.filter((r) => r.avatar !== avatar).slice(0, 3);
  const today = todayKey();
  const daily = dailyConfig(today, 'You');
  // PLAN-114: both Daily formats, each with its length, your best today and your place on the Sprint's board.
  const sprint = useSprintBoards(today);
  const sprintBest = bestLine(loadSprintBest()[today]?.cash, placeWords(sprint?.day));
  const dailyBest = loadDaily()[today];
  return (
    <div class="page tk-page jp">
      <header class="topbar jp-bar">
        <button class="icon-btn" aria-label="Back" onClick={p.onBack}><BackArrow /></button>
        <div class="day"><b>Play</b></div>
        <span class="jp-me"><FramedFace who={avatar} size={34} look={worn()} /></span>
      </header>
      <main class="scroll jp-in">
        <button class="jp-tile big" data-a="quick" onClick={p.onQuick}>
          <span class="jp-tt"><b>Quick match</b><span>{quickLine()}</span></span>
          <span class="jp-vs" aria-hidden="true"><Face who={avatar} size={44} /><i>vs</i><span class="jp-q">?</span></span>
        </button>
        <div class="jp-two">
          <button class="jp-tile" data-a="room" onClick={p.onRoom}><b>Private room</b><span>{roomLine()}</span></button>
          <button class="jp-tile" data-a="join" aria-expanded={joining} onClick={() => setJoining(!joining)}><b>Join with a code</b><span>{CODE_LENGTH} letters from a friend</span></button>
        </div>
        {joining && (
          <div class="jp-join">
            <label for="join-code">Room code</label>
            <div class="join-row">
              <input id="join-code" class="input" value={code} maxLength={CODE_LENGTH} autocapitalize="characters" autocomplete="off" spellcheck={false}
                placeholder="ABC123" onInput={(e) => setCode((e.target as HTMLInputElement).value.toUpperCase())} />
              <button class="btn" disabled={!ok} onClick={() => p.onJoin(clean)}>Join</button>
            </div>
          </div>
        )}
        <div class="jp-two">
          <button class="jp-tile" data-a="computer" onClick={p.onComputer}>
            <b>Computer</b><span>{computerLine()}</span>
            <span class="jp-faces" aria-hidden="true">{rivals.map((r) => <Face who={r.avatar} size={26} />)}</span>
          </button>
          <button class="jp-tile" data-a="phone" onClick={p.onOnePhone}><b>One phone</b><span>{phoneLine()}</span></button>
        </div>
        <div class="jp-len" role="group" aria-label="Game length for a computer or one-phone game">
          <span class="jh-lb">Game length</span>
          {LENGTHS.map((l) => <button class={p.days === l.days ? 'on' : ''} aria-pressed={p.days === l.days} onClick={() => p.onDays(l.days)}>{l.word} <small>{l.days} days</small></button>)}
        </div>
        <button class="jp-tile wide" data-a="public" onClick={p.onPublic}><b>Public rooms</b><span>Join a room that is waiting for players, or open one</span></button>
        <button class="jp-tile wide dark" data-a="sprint" onClick={p.onSprint}><b>{SPRINT_TITLE}</b><span>{daily.players.length} stalls · same start for everyone today{sprintBest ? ` · ${sprintBest}` : ''}</span></button>
        <button class="jp-tile wide dark" data-a="daily" onClick={p.onDaily}><b>Daily market · {daily.days} days</b><span>{daily.players.length} stalls · same market for everyone today{dailyBest !== undefined ? ` · Best today $${dailyBest}` : ''}</span></button>
        <button class="jp-tile wide" data-a="league" onClick={p.onLeague}><b>Market League</b><span>{leagueWords(stage)}</span></button>
      </main>
    </div>
  );
}

/** A small menu in the middle of the screen, in front of the home screen. Focus stays inside it (focusTrap.tsx). */
export function Popup({ title, onClose, children }: { title: string; onClose: () => void; children: ComponentChildren }) {
  const box = useRef<HTMLDivElement>(null);
  // Escape closes it (only the pop-up on top, when one is opened over another).
  useFocusTrap(box, onClose);
  return (
    <div class="modal-bg popup-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="modal popup" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={box}>
        <div class="popup-hd"><h2>{title}</h2><button class="icon-btn" aria-label="Close" onClick={onClose}>×</button></div>
        {children}
      </div>
    </div>
  );
}

/** The waiting game in a pop-up: its mode first when known (REP-133 A-13, "Daily market"), then the day, the stalls and
 *  your cash. */
function WaitingInfo({ mode, day, days, stalls, cash }: { mode?: string; day: number; days: number; stalls: number; cash: number | null }) {
  const you = cash !== null ? ` · you have $${cash}` : '';
  return (
    <div class="popup-info">
      {mode
        ? <span><b>{mode}</b><small>Day {day} of {days} · {stalls} stalls{you}</small></span>
        : <span><b>Day {day} of {days}</b><small>{stalls} stalls{you}</small></span>}
    </div>
  );
}

export function ContinueBody({ mode, day, days, stalls, cash, onResume, onStartOver }: { mode?: string; day: number; days: number; stalls: number; cash: number | null; onResume: () => void; onStartOver: () => void }) {
  return (
    <>
      <WaitingInfo mode={mode} day={day} days={days} stalls={stalls} cash={cash} />
      <button class="btn primary big wide" onClick={onResume}>Resume</button>
      <button class="btn wide" onClick={onStartOver}>Start over</button>
      <p class="small muted">Starting over ends this game.</p>
    </>
  );
}

/**
 * Asked before another game replaces the one that is waiting (PLAN-081): the Daily market, a Market League game or a
 * new game. Says which game is waiting and what starting would do. Keeping the game is the main button.
 * `what` completes "Starting … ends this game", for example "the Daily market".
 */
export function ReplaceBody({ mode, day, days, stalls, cash, what, onKeep, onStart }: { mode?: string; day: number; days: number; stalls: number; cash: number | null; what: string; onKeep: () => void; onStart: () => void }) {
  return (
    <>
      <WaitingInfo mode={mode} day={day} days={days} stalls={stalls} cash={cash} />
      <p class="small">You have a game waiting. Starting {what} ends this game.</p>
      <button class="btn primary big wide" onClick={onKeep}>Keep my game</button>
      <button class="btn wide" onClick={onStart}>Start anyway</button>
    </>
  );
}

function PlayIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M7 4v16l13-8z" fill="currentColor" /></svg>;
}

