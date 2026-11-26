// PLAN-124, Home as "Shopfront and Board": the pieces of Home's Market tab and Stall tab (Home.tsx lays them out).
// - Your stall (YourStall), drawn with every look you wear (the awning in your colour with your roof and trim, your
//   shopkeeper in what they wear inside your signboard frame, your name and title on the signboard, your crate with your
//   prop and your price tag), with the stamp book and the Wardrobe as icon buttons. It heads the Stall tab.
// - One hero card for the chosen mode, framed like a stall (an awning on top): Custom match (the four ways to play a full
//   market, you against three rivals, your next goal), the Market League (the stage you are on, its picture and rivals,
//   your stars, the next trophy), the Daily market (today's first customer and the lorry, your place, today's twist) and
//   the Sprint (3 days, your best today, the week, its reason).
// - The mode tabs under it (a tablist: Custom, League, Daily, Sprint), each marking a waiting game with its day.
// - The one big Play button for the chosen mode, or Continue (with the mode, day and cash) and a smaller New game when
//   that mode's game is waiting (store.ts keeps one per mode).
// Nothing here is animated; the chosen tab is remembered in a small `fm.` key (never in the save envelope).
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { SPRINT_DAYS, dailyConfig, dailyTwist, sprintConfig } from '../engine/daily';
import { FRUIT, RIVALS, lookOf, type FruitId } from '../engine/data';
import { newGame, type GameConfig, type GameState } from '../engine/game';
import { fetchDaily, type BoardResult } from '../net/daily';
import { ownerHash, placeWords } from '../net/sprint';
import { stallOf, tagOf, titleOf } from '../net/looks';
import { Face } from './art';
import { CardArt, Gazette, TradingCard } from './cards';
import { CardZoom } from './cardZoom';
import { LEAGUE, picName, stageByNo, stageStars, starGoals } from './campaign';
import { FruitSvg } from './fruitIcons';
import { Icon, PropSprite, RoofBand } from './icons';
import { myAvatar, setupAvatar, worn } from './looks';
import { crateUrl } from './marketArt';
import { C } from './palette';
import { nextTrophy } from './leagueTrophy';
import { MODE_REASON, WAYS, leagueEcho } from './playMenu';
import { HOME_MODES, type HomeMode } from './modes';
import { leagueConfig, leagueStage, myStars } from './progress';
import { stageGoal, stageRivals } from './progressView';
import { waitingGame, type WaitingGame } from './paused';
import { FramedFace, PriceTag, myColour, shownAvatar, stallName } from './stampCard';
import { Stars, picSrc } from './StageMoment';
import { WEEK_NOTE, bestLine, useSprintBoards } from './Sprint';
import { loadSprintBest } from './sprintStore';
import { loadDaily, type SaveSlot } from './store';
import { currentStreak } from './streak';
import { firstCustomer, rivalsLine, shortDate } from './dailyCard';
import './home-cards.css';

const LORRY: FruitId[] = ['blueberry', 'watermelon', 'mango', 'apple'];

/** "Day 4 of 10 · $23": where a waiting game stands (your cash when one person plays). */
export const waitWords = (w: WaitingGame): string => `Day ${w.day} of ${w.days}${w.cash !== null ? ` · $${w.cash}` : ''}`;

/** PLAN-123: what Continue says about the waiting game: its mode (with the League stage), its day and your cash:
 *  "League stage 3 · Day 2 of 6 · $14". */
export const continueWords = (w: WaitingGame): string => `${w.mode} · ${waitWords(w)}`;

/** The two icon buttons on your stall (PLAN-121): the stamp book and the Wardrobe. */
export interface StallButtons {
  /** Stamps filled and the book's size, said with the stamp book's name ("Stamp book, 3 of 40 stamps"). */
  filled: number;
  size: number;
  onTrophies: () => void;
  onWardrobe: () => void;
}

export function PlayIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M7 4v16l13-8z" fill="currentColor" /></svg>;
}

/**
 * Your stall: the awning (your colour, roof and trim), your shopkeeper in your frame and wearing your hat and the rest,
 * the signboard with your stall's name and your title, the crate with your prop on the counter and your price tag.
 * `next` is the "Next …" line (the nearest look to unlock), drawn on the stall's foot. The stamp book and the Wardrobe
 * are icon buttons on its right.
 */
export function YourStall({ next, buttons }: { next: string | null; buttons: StallButtons }) {
  const look = worn();
  const avatar = myAvatar();
  const keeper = RIVALS.find((r) => r.avatar === avatar)?.name;
  const stall = stallOf(look);
  const title = titleOf(look);
  const w = 92, bh = Math.round(w * 0.36);
  const crate = crateUrl('melon', w, bh);
  const scale = w / crate.vw;
  return (
    <div class="jh-stall2" role="group" aria-label={`Your stall: ${keeper ?? 'your shopkeeper'}${title ? `, ${title}` : ''}`}>
      <RoofBand cls="tb-awn jh-awn2" colour={myColour(look)} roof={stall.roof} trim={stall.trim} scale={2} />
      <div class="jh-st-in">
        <span class="jh-keeper"><FramedFace who={avatar} size={72} look={look} portrait /></span>
        <div class="jh-st-side">
          <span class="jh-sign"><b>{stallName()}</b>{title ? <small>{title}</small> : keeper ? <small>{keeper}</small> : null}</span>
          <div class="jh-counter">
            <div class="jh-crate" style={{ width: `${w}px` }}>
              <div class="jh-crate-fruit" aria-hidden="true">{(['blueberry', 'watermelon', 'watermelon', 'mango', 'apple'] as FruitId[]).map((f) => <FruitSvg id={f} size={16} alt="" />)}</div>
              <span class="jh-crate-box" style={{ height: `${Math.round((bh + 2) * scale)}px` }}>
                <img src={crate.url} width={w} alt="" draggable={false} style={{ marginTop: `${-Math.round(crate.top * scale)}px` }} />
              </span>
            </div>
            {stall.prop && <PropSprite id={stall.prop} size={28} cls="jh-prop2" />}
            <span class="jh-tag2"><PriceTag fruit="watermelon" price={7} tag={tagOf(look)} tone="mine" /></span>
          </div>
        </div>
        <span class="jh-sbtns">
          <button class="jh-ib" data-a="stamp-book" aria-label={`Stamp book, ${buttons.filled} of ${buttons.size} stamps`} onClick={buttons.onTrophies}>
            <span class="jh-ibic"><Icon name="star" size={22} /></span><span>Stamp book</span>
          </button>
          <button class="jh-ib" data-a="wardrobe" onClick={buttons.onWardrobe}>
            <span class="jh-ibic jh-ibface"><FramedFace who={avatar} size={18} look={look} /></span><span>Wardrobe</span>
          </button>
        </span>
      </div>
      {next && <span class="jh-next2"><b>Next</b> {next}</span>}
    </div>
  );
}

/* ---------- the modes: the tabs, the remembered choice ---------- */

/** PLAN-124: the four modes of the Market tab, each with its save slot (Custom match is the "play" slot); their names
 *  are modes.ts's (REP-140 A-06). */
export const MODES = HOME_MODES;
export type { HomeMode };
const MODE_KEY = 'fm.homeMode';
const isMode = (v: unknown): v is HomeMode => MODES.some((m) => m.id === v);
/** The tab chosen in this visit (it outlives Home while another screen is open). */
let chosen: HomeMode | null = null;

/** The tab the player chose last (kept across reloads), or null before the first choice. */
export function savedMode(): HomeMode | null {
  try {
    const v = localStorage.getItem(MODE_KEY);
    return isMode(v) ? v : null;
  } catch {
    return null; // no storage (a private window): Home opens on Custom
  }
}
export function saveMode(m: HomeMode) {
  chosen = m;
  try { localStorage.setItem(MODE_KEY, m); } catch { /* no storage: the choice lasts this visit only */ }
}
/** For tests: forget the tab chosen in this visit. */
export function resetModeVisit() { chosen = null; }

/**
 * The tab Home opens on. In a visit, the tab last shown. On the first view of a visit: the remembered tab when its mode
 * has a game waiting or no mode has one; otherwise the first mode (in tab order) with a game waiting, so a waiting game
 * is in front of the player as the game opens.
 */
export function startMode(games: Partial<Record<SaveSlot, GameState>>): HomeMode {
  if (chosen) return chosen;
  const saved = savedMode();
  const waits = (m: HomeMode) => !!waitingGame(games[MODES.find((x) => x.id === m)!.slot] ?? null);
  const first = saved && waits(saved) ? saved : MODES.find((m) => waits(m.id))?.id ?? saved ?? 'custom';
  chosen = first;
  return first;
}

/**
 * PLAN-124: the mode tabs, a segmented row (a tablist): the chosen tab is ink with yellow words; a mode with a game
 * waiting says its day under its name. The arrow keys, Home and End move between the tabs and choose at once.
 */
export function ModeTabs({ at, games, onPick }: { at: HomeMode; games: Partial<Record<SaveSlot, GameState>>; onPick: (m: HomeMode) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const key = (e: KeyboardEvent) => {
    const i = MODES.findIndex((m) => m.id === at);
    const to = e.key === 'ArrowRight' ? (i + 1) % MODES.length : e.key === 'ArrowLeft' ? (i + MODES.length - 1) % MODES.length
      : e.key === 'Home' ? 0 : e.key === 'End' ? MODES.length - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    onPick(MODES[to].id);
    (box.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[to])?.focus();
  };
  return (
    <div class="jh-tabs" role="tablist" aria-label="Game modes" ref={box} onKeyDown={key}>
      {MODES.map((m) => {
        const w = waitingGame(games[m.slot] ?? null);
        const on = m.id === at;
        return (
          <button role="tab" id={`jh-tab-${m.id}`} class={`jh-tab ${on ? 'on' : ''} ${w ? 'wait' : ''}`} data-tab={m.id}
            aria-selected={on ? 'true' : 'false'} aria-controls="jh-hero" tabIndex={on ? 0 : -1} aria-label={w ? `${m.tab}, ${w.mode} waiting on day ${w.day}` : undefined}
            onClick={() => onPick(m.id)}>
            <b>{m.tab}</b>{w && <small>Day {w.day}</small>}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- the hero cards ---------- */

export interface HeroProps {
  today: string;
  /** The saved game of each mode (store.ts loadGames), or none. */
  games: Partial<Record<SaveSlot, GameState>>;
  /** The "Next: …" line (Home.tsx nextLine): the nearest look to unlock, or the next level's reward. */
  next: string | null;
  /** The four ways to play a Custom match, each straight to its own start (as the Play page's buttons). */
  onQuick: () => void;
  onRoom: () => void;
  onComputer: () => void;
  onOnePhone: () => void;
}

/** The card's frame: a stall's awning on top, then the mode's name and its short line. */
function Frame({ mode, sub, children }: { mode: HomeMode; sub: ComponentChildren; children: ComponentChildren }) {
  return (
    <div class={`jh-hero jh-hero-${mode}`} data-card={mode}>
      <RoofBand cls="tb-awn jh-hawn" colour={C.xMelon} scale={2} />
      <div class="jh-hhd"><h2>{MODES.find((m) => m.id === mode)!.name}</h2><small>{sub}</small></div>
      <div class="jh-hb">{children}</div>
    </div>
  );
}

/** The waiting game's table in one row: every stall's face and cash (the table shows them to all). */
function TableRow({ g }: { g: GameState }) {
  const me = g.players.findIndex((p) => p.kind === 'human');
  const solo = g.players.filter((p) => p.kind === 'human').length === 1;
  const order = g.players.map((_, i) => i).sort((a, b) => g.players[b].cash - g.players[a].cash);
  return (
    <div class="jh-trow" aria-label="The table">
      {order.map((i) => (
        <span class={`jh-tr ${solo && i === me ? 'me' : ''}`}>
          <FramedFace who={shownAvatar(g.players, i)} size={22} look={i === me ? worn() : g.players[i].look} />
          <b>${g.players[i].cash}</b>
        </span>
      ))}
    </div>
  );
}

/** The "Next: …" strip at the foot of a card. */
const NextStrip = ({ next }: { next: string | null }) => (next ? <span class="jh-next3"><b>Next:</b> {next}</span> : null);

/** Custom match: the four ways to play a full market of your own, you against three rivals (or the waiting game's
 *  table), and your next goal. */
function CustomCard(p: HeroProps) {
  const g = p.games.play;
  const w = waitingGame(g ?? null);
  const avatar = myAvatar();
  const rivals = RIVALS.filter((r) => r.avatar !== avatar).slice(0, 3);
  return (
    <Frame mode="custom" sub="your market, your way">
      <div class="jh-ways2">
        {/* PLAN-125 (DEC-133): the four ways, with the names and lines of the approved mockup B */}
        {WAYS.map((w) => (
          <button class="jh-way" data-a={`way-${w.id}`} onClick={{ quick: p.onQuick, room: p.onRoom, computer: p.onComputer, phone: p.onOnePhone }[w.id]}>
            <b>{w.name}</b><span>{w.line}</span>
          </button>
        ))}
      </div>
      {w && g ? (
        <div class="jh-hwait"><span class="jh-lb">Your game · {w.mode}</span><TableRow g={g} /></div>
      ) : (
        <span class="jh-vs" aria-hidden="true">
          <span class="jh-me"><FramedFace who={avatar} size={44} look={worn()} /></span><i>vs</i>
          {rivals.map((r) => <span class="jh-round"><Face who={r.avatar} size={36} /></span>)}
        </span>
      )}
      <NextStrip next={p.next} />
    </Frame>
  );
}

/** The Market League: the stage you are on, its picture with you against its rivals, its title and goal, your stars and
 *  the next trophy. */
function LeagueCard() {
  const at = leagueStage();
  const done = at >= LEAGUE.length;
  const sel = Math.min(at, LEAGUE.length - 1);
  const st = stageByNo(sel) ?? LEAGUE[0];
  const stars = myStars();
  const got = stageStars(sel, stars).length;
  const trophy = nextTrophy();
  return (
    <Frame mode="league" sub={done ? `All ${LEAGUE.length} stages cleared` : `Stage ${sel + 1} of ${LEAGUE.length}`}>
      <span class="jh-why">{MODE_REASON.league}</span>
      <div class="jh-lgpic">
        <CardArt class="jh-lgart" src={picSrc(st.pic)} alt={picName(st.pic)} w={300} h={170} eager />
        <span class="jh-lgvs" aria-hidden="true">
          <FramedFace who={setupAvatar(leagueConfig(sel, '', ''))} size={28} look={worn()} /><i>vs</i>
          {stageRivals(st).map((r) => <span class="jh-round"><Face who={r.avatar} size={24} /></span>)}
        </span>
      </div>
      <b class="jh-lgt">{st.title}</b>
      <span class="jh-lgg">{stageGoal(st)}</span>
      <span class="jh-lgs"><Stars got={got} total={starGoals(st).length} size={16} /><small>{stars.length} stars in all</small></span>
      {trophy && <span class="jh-lgtr"><b>Next trophy</b> {trophy.title} · {trophy.got} of {trophy.goal} stars</span>}
    </Frame>
  );
}

/** Today's Daily board as Home reads it (null while it loads). */
export function useDailyBoard(today: string): BoardResult | null {
  const [res, setRes] = useState<BoardResult | null>(null);
  useEffect(() => { let alive = true; void ownerHash().then((me) => fetchDaily(today, me)).then((r) => { if (alive) setRes(r); }); return () => { alive = false; }; }, [today]);
  return res;
}

/** The first morning of a Daily-style game: its first customer as a small card that opens whole on a tap, and the lorry. */
function FirstMorning({ cfg, children }: { cfg: GameConfig; children: ComponentChildren }) {
  // The card's set-up is made once a day by its card (DailyCard, SprintCard), so the first morning is too.
  const first = useMemo(() => newGame(cfg), [cfg]);
  const who = firstCustomer(first);
  const e = first.event;
  return (
    <div class="jh-db">
      <CardZoom class="jh-dcard" title={who ? lookOf(who.name).title : e ? e.title : 'First customer'}>{who ? <TradingCard who={who.name} wants={who.wants} eager /> : e ? <Gazette event={e} eager /> : null}</CardZoom>
      <div class="jh-dr">
        <span class="jh-lb">Today's lorry brings</span>
        <div class="jh-lorry">{LORRY.map((f) => <span class={`f-${f}`}><FruitSvg id={f} size={18} alt={FRUIT[f].plural} /><b>{first.delivery[f] ?? 0}</b></span>)}</div>
        {children}
      </div>
    </div>
  );
}

/** You against the day's rivals (the computer stalls of a Daily-style game). */
function DayRivals({ cfg }: { cfg: GameConfig }) {
  return (
    <span class="jh-vs jh-dvs" role="img" aria-label={rivalsLine(cfg)}>
      <span class="jh-me"><FramedFace who={setupAvatar(cfg)} size={44} look={worn()} /></span><i>vs</i>
      {cfg.players.filter((pl) => pl.kind === 'ai').map((pl) => <span class="jh-round"><Face who={pl.avatar ?? ''} size={36} /></span>)}
    </span>
  );
}

/** The Daily market: today's first customer and the lorry, today's twist, your best and place (and a League echo). */
function DailyCard(p: HeroProps) {
  const cfg = useMemo(() => dailyConfig(p.today, 'You'), [p.today]);
  const first = useMemo(() => newGame(cfg), [cfg]);
  const res = useDailyBoard(p.today);
  const daily = loadDaily();
  const streak = currentStreak(Object.keys(daily), p.today);
  const who = firstCustomer(first);
  const mine = bestLine(daily[p.today], res?.error ? null : placeWords(res ? { rank: res.rank, players: res.players ?? res.top.length } : undefined));
  // PLAN-119: what today's Daily uses that you met in the Market League (its twist's standing orders, its first customer).
  const echo = leagueEcho(first.config, who?.name ?? null, leagueStage());
  return (
    <Frame mode="daily" sub={`${shortDate(p.today)}${streak > 0 ? ` · ${streak}-day streak` : ''}`}>
      <span class="jh-why">{MODE_REASON.daily}</span>
      <FirstMorning cfg={cfg}>
        <span class="jh-dtw"><b>{dailyTwist(p.today).title}</b> · {cfg.days} days · {cfg.players.length} stalls</span>
        <span class="jh-dme">{mine ?? (res && !res.error && res.top.length ? `${res.players ?? res.top.length} played · best so far $${res.top[0].cash}` : 'Not played today')}</span>
      </FirstMorning>
      <DayRivals cfg={cfg} />
      {echo && <span class="jh-decho" data-a="daily-echo">{echo}</span>}
    </Frame>
  );
}

/** The Sprint: today's 3-day market (its first customer and lorry), your best today and place, the week, its reason. */
function SprintCard(p: HeroProps) {
  const cfg = useMemo(() => sprintConfig(p.today, 'You'), [p.today]);
  const boards = useSprintBoards(p.today);
  const mine = bestLine(loadSprintBest()[p.today]?.cash, placeWords(boards?.day));
  const week = placeWords(boards?.week);
  return (
    <Frame mode="sprint" sub={`${SPRINT_DAYS} days · ${shortDate(p.today)}`}>
      <span class="jh-why jh-spwhy">{MODE_REASON.sprint}</span>
      <FirstMorning cfg={cfg}>
        <span class="jh-dtw"><b>{SPRINT_DAYS} days</b> · {cfg.players.length} stalls · retry as often as you like</span>
        <span class="jh-dme">{mine ?? (boards?.day?.players ? `${boards.day.players} played · best so far $${boards.day.top[0]?.cash ?? 0}` : 'Not played today')}</span>
      </FirstMorning>
      <DayRivals cfg={cfg} />
      <span class="jh-decho" data-a="sprint-week">{week ? `This week: ${week}. ${WEEK_NOTE}` : WEEK_NOTE}</span>
    </Frame>
  );
}

/** The chosen mode's card (the tab panel the mode tabs control). */
export function HeroCard(p: HeroProps & { mode: HomeMode }) {
  const body = p.mode === 'league' ? <LeagueCard /> : p.mode === 'daily' ? <DailyCard {...p} /> : p.mode === 'sprint' ? <SprintCard {...p} /> : <CustomCard {...p} />;
  return <section id="jh-hero" class="jh-panel" role="tabpanel" aria-labelledby={`jh-tab-${p.mode}`}>{body}</section>;
}

/**
 * PLAN-124: the one big button for the chosen mode. Play opens the mode's own start (the Play page, the League screen,
 * the Daily intro or the Sprint intro); with a game of that mode waiting it is Continue, with the mode, day and cash
 * under it, and a smaller New game beside it. Each keeps the mode's `data-a` hook. REP-140 B-20: Continue goes straight
 * into the game; New game first asks, as starting over ends the waiting game (`onNew`), then goes where Play would.
 */
export function PlayButton({ mode, games, onPlay, onContinue, onNew }: { mode: HomeMode; games: Partial<Record<SaveSlot, GameState>>; onPlay: () => void; onContinue: (slot: SaveSlot) => void; onNew: (slot: SaveSlot) => void }) {
  const m = MODES.find((x) => x.id === mode)!;
  const w = waitingGame(games[m.slot] ?? null);
  const hook = m.slot;
  if (!w) return <div class="jh-go-row"><button class="jh-go jh-play" data-a={hook} aria-label={`Play, ${m.name}`} onClick={onPlay}>Play</button></div>;
  return (
    <div class="jh-go-row">
      <button class="jh-go jh-cont" data-a={`continue-${m.slot}`} onClick={() => onContinue(m.slot)}>
        <PlayIcon /><span><b>Continue</b><small>{continueWords(w)}</small></span>
      </button>
      <button class="jh-new" data-a={hook} aria-label={`New game, ${m.name}`} onClick={() => onNew(m.slot)}>New game</button>
    </div>
  );
}
