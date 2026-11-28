// PLAN-124, Home as "Shopfront and Board": the pieces of Home's Market tab and Stall tab (Home.tsx lays them out).
// - Your stall (YourStall), drawn with every look you wear (the awning in your colour with your roof and trim, your
//   shopkeeper in what they wear inside your signboard frame, your name and title on the signboard, your crate with your
//   prop and your price tag), with the stamp book and the Wardrobe as icon buttons. It heads the Stall tab.
// - One wide card for the chosen mode, framed like a stall (an awning on top). PLAN-132: its name with where you stand
//   beside it, then: Match (four tiles, the way ticked is what Play starts), the Market League (the stage's picture,
//   title, goal and stars; the next trophy), the Daily market and the Sprint (today's first customer and the lorry,
//   and one line of rules). A fact is on a card once; the host beside the card only chats (HomeHost.tsx).
// - The mode tabs above the host and the card (a tablist: Match, League, Daily, Sprint), each marking a waiting game
//   with its day. A sideways swipe on the card changes mode too.
// - The one big Play button for the chosen mode ("Play · Computer" for a Match), or Continue and a smaller New game
//   when that mode's game is waiting (store.ts keeps one per mode).
// The chosen tab and the chosen way are remembered in small `fm.` keys (never in the save envelope).
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { SPRINT_DAYS, SPRINT_WEEK_DAYS, dailyConfig, sprintConfig } from '../engine/daily';
import { FRUIT, RIVALS, lookOf, type FruitId } from '../engine/data';
import { newGame, type GameState } from '../engine/game';
import { fetchDaily, type BoardResult } from '../net/daily';
import { ownerHash, placeWords } from '../net/sprint';
import { stallOf, tagOf, titleOf } from '../net/looks';
import { ART_SIZE, CardArt, Gazette, TradingCard } from './cards';
import { customerArt, eventArt, eventFocus, guestArt } from './deckArt';
import { CardZoom } from './cardZoom';
import { LEAGUE, picName, stageByNo, stageStars, starGoals } from './campaign';
import { FruitSvg } from './fruitIcons';
import { Icon, PropSprite, RoofBand } from './icons';
import { myAvatar, worn } from './looks';
import { crateUrl } from './marketArt';
import { nextTrophy } from './leagueTrophy';
import { WAYS, wayName, type PlayWay } from './playMenu';
import { HOME_MODES, type HomeMode } from './modes';
import { leagueStage, myStars } from './progress';
import { stageGoal } from './progressView';
import { waitingGame, type WaitingGame } from './paused';
import { FramedFace, PriceTag, myColour, stallName } from './stampCard';
import { Stars, picSrc } from './StageMoment';
import { useSprintBoards } from './Sprint';
import { loadSprintBest } from './sprintStore';
import { loadDaily, type SaveSlot } from './store';
import { currentStreak } from './streak';
import { firstCustomer, shortDate } from './dailyCard';
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

/* ---------- the ways of a Match: the one chosen ---------- */

const WAY_KEY = 'fm.homeWay';
const isWay = (v: unknown): v is PlayWay => WAYS.some((w) => w.id === v);
/** PLAN-132: the way ticked for a player who has not chosen yet: the computer, the gentlest first game. */
export const FIRST_WAY: PlayWay = 'computer';
/** The way to play a Match the player chose last (kept across reloads in a small `fm.` key, never in a save). */
export function savedWay(): PlayWay {
  try {
    const v = localStorage.getItem(WAY_KEY);
    return isWay(v) ? v : FIRST_WAY;
  } catch {
    return FIRST_WAY; // no storage (a private window)
  }
}
export function saveWay(w: PlayWay) {
  try { localStorage.setItem(WAY_KEY, w); } catch { /* no storage: the choice lasts this visit only */ }
}

/** Each way's flat picture: a bolt, a key, a monitor, two arrows, on its fruit colour (home-cards.css). */
const WAY_ICON: Record<PlayWay, ComponentChildren> = {
  quick: <path class="hh-fg" d="M16 3L6 16h7l-2 9 11-14h-7z" />,
  room: <><circle class="hh-ln" cx="10" cy="14" r="5.5" /><path class="hh-ln" d="M15 14h9M20 14v5M24 14v4" /></>,
  computer: <><rect class="hh-ln" x="5" y="6" width="18" height="12" /><path class="hh-ln" d="M14 18v4M9 23h10" /></>,
  phone: <path class="hh-ln" d="M5 10h15l-4-4M23 18H8l4 4" />,
};

/* ---------- the mode cards ---------- */

export interface HeroProps {
  today: string;
  /** The saved game of each mode (store.ts loadGames), or none. */
  games: Partial<Record<SaveSlot, GameState>>;
  /** PLAN-132: the way to play a Match that is ticked, and what a tap on a tile does (it only chooses). */
  way: PlayWay;
  onWay: (w: PlayWay) => void;
}

/** A Daily-style game's first morning, made once per day and kind (the card and the host's line both read it). */
const mornings = new Map<string, GameState>();
export function firstMorning(kind: 'daily' | 'sprint', today: string): GameState {
  const key = `${kind}:${today}`;
  let g = mornings.get(key);
  if (!g) {
    mornings.clear();
    g = newGame(kind === 'sprint' ? sprintConfig(today, 'You') : dailyConfig(today, 'You'));
    mornings.set(key, g);
  }
  return g;
}
/** The first customer's name as the cards show it ("Coral Mei"), or null when the day opens with an event. */
export function firstTitle(kind: 'daily' | 'sprint', today: string): string | null {
  const who = firstCustomer(firstMorning(kind, today));
  return who ? lookOf(who.name).title : null;
}

/** The card's frame: a stall's awning on top, then the mode's name with where you stand beside it (PLAN-132: the day
 *  and cash of a waiting game, the stage, or the date and today's result), then its body. */
function Frame({ mode, status, children }: { mode: HomeMode; status: ComponentChildren; children: ComponentChildren }) {
  return (
    <div class={`hh-card hh-card-${mode}`} data-card={mode}>
      <div class="hh-awn" aria-hidden="true" />
      <div class="hh-chd"><h2>{MODES.find((m) => m.id === mode)!.name}</h2>{status ? <small>{status}</small> : null}</div>
      <div class="hh-cb">{children}</div>
    </div>
  );
}

/** A mode's waiting game in words ("Day 4 of 10 · $23"), or null. */
const waitOf = (p: HeroProps, mode: HomeMode): string | null => {
  const w = waitingGame(p.games[MODES.find((m) => m.id === mode)!.slot] ?? null);
  return w ? waitWords(w) : null;
};

/** Match: the four ways to play a full market of your own as tiles; the one ticked is what Play starts. */
function CustomCard(p: HeroProps) {
  return (
    <Frame mode="custom" status={waitOf(p, 'custom')}>
      <div class="hh-ways" role="radiogroup" aria-label="How to play">
        {WAYS.map((w) => (
          <button class="hh-way" role="radio" aria-checked={w.id === p.way ? 'true' : 'false'} data-a={`way-${w.id}`} onClick={() => p.onWay(w.id)}>
            <svg class={`hh-wic hh-wic-${w.id}`} viewBox="0 0 28 28" aria-hidden="true"><rect class="hh-bg" width="28" height="28" />{WAY_ICON[w.id]}</svg>
            <b>{w.name}</b>
          </button>
        ))}
      </div>
    </Frame>
  );
}

/** The Market League: the stage you are on (its picture, title, goal and stars) and the next trophy. */
function LeagueCard(p: HeroProps) {
  const at = leagueStage();
  const done = at >= LEAGUE.length;
  const sel = Math.min(at, LEAGUE.length - 1);
  const st = stageByNo(sel) ?? LEAGUE[0];
  const stars = myStars();
  const got = stageStars(sel, stars).length;
  const trophy = nextTrophy();
  return (
    <Frame mode="league" status={waitOf(p, 'league') ?? (done ? `All ${LEAGUE.length} stages cleared` : `Stage ${sel + 1} of ${LEAGUE.length}`)}>
      <div class="hh-duo">
        <div class="hh-col">
          <span class="hh-lb">{st.pic.kind === 'keeper' ? 'Your rival' : 'This stage'}</span>
          <div class="hh-pic"><CardArt class="hh-art" src={picSrc(st.pic)} alt={picName(st.pic)} w={300} h={170} eager /><span class="hh-pn">{picName(st.pic)}</span></div>
        </div>
        <div class="hh-col hh-mid">
          <b class="hh-big">{st.title}</b>
          <span class="hh-fact">{stageGoal(st)}</span>
          <Stars got={got} total={starGoals(st).length} size={18} />
        </div>
      </div>
      <span class="hh-rules">{trophy ? <><b>Next trophy:</b> {trophy.title} · {trophy.got} of {trophy.goal} stars</> : <><b>{stars.length} stars</b> in all</>}</span>
    </Frame>
  );
}

/** Today's Daily board as Home reads it (null while it loads). */
export function useDailyBoard(today: string): BoardResult | null {
  const [res, setRes] = useState<BoardResult | null>(null);
  useEffect(() => { let alive = true; void ownerHash().then((me) => fetchDaily(today, me)).then((r) => { if (alive) setRes(r); }); return () => { alive = false; }; }, [today]);
  return res;
}

/** The first morning of a Daily-style game: who opens it (a cropped picture that opens the whole card on a tap) beside
 *  the lorry in four large tiles. */
function FirstMorning({ first }: { first: GameState }) {
  const who = firstCustomer(first);
  const e = first.event;
  const title = who ? lookOf(who.name).title : e ? e.title : 'First customer';
  const [w, h] = who ? ART_SIZE.customer : ART_SIZE.event;
  const src = who ? customerArt(who.name) ?? guestArt(who.name) : e ? eventArt(e.id) : null;
  return (
    <div class="hh-duo">
      <div class="hh-col">
        <span class="hh-lb">{who ? 'First customer' : 'Today opens with'}</span>
        <CardZoom class="hh-pic jh-dcard" title={title}
          thumb={<><CardArt class="hh-art" src={src} alt="" w={w} h={h} eager focus={e && !who ? eventFocus(e.id) : undefined} /><span class="hh-pn">{title}</span></>}>
          {who ? <TradingCard who={who.name} wants={who.wants} eager /> : e ? <Gazette event={e} eager /> : null}
        </CardZoom>
      </div>
      <div class="hh-col">
        <span class="hh-lb">Today's lorry brings</span>
        <div class="hh-lorry">{LORRY.map((f) => <span class={`f-${f}`}><FruitSvg id={f} size={24} alt={FRUIT[f].plural} /><b>{first.delivery[f] ?? 0}</b></span>)}</div>
      </div>
    </div>
  );
}

/** "27 Nov · Not played", "27 Nov · $45 · 3rd of 20": the day and today's result as plain words beside the card's name
 *  (PLAN-132: it is a status, so it does not look like a button). */
export function dayStatus(today: string, cash: number | undefined, place: string | null, streak = 0): string {
  const result = cash === undefined ? 'Not played' : place ? `$${cash} · ${place}` : `$${cash}`;
  return [shortDate(today), streak > 0 ? `${streak}-day streak` : null, result].filter(Boolean).join(' · ');
}

/** The Daily market: today's first customer and lorry; the date, your streak and today's result beside its name. */
function DailyCard(p: HeroProps) {
  const first = firstMorning('daily', p.today);
  const cfg = first.config;
  const res = useDailyBoard(p.today);
  const daily = loadDaily();
  const streak = currentStreak(Object.keys(daily), p.today);
  const place = res?.error ? null : placeWords(res ? { rank: res.rank, players: res.players ?? res.top.length } : undefined);
  return (
    <Frame mode="daily" status={waitOf(p, 'daily') ?? dayStatus(p.today, daily[p.today], place, streak)}>
      <FirstMorning first={first} />
      <span class="hh-rules"><b>{cfg.days} days</b> · {cfg.players.length} stalls · the same market for everyone</span>
    </Frame>
  );
}

/** The Sprint: today's 3-day market (its first customer and lorry); the date and your best today beside its name. */
function SprintCard(p: HeroProps) {
  const first = firstMorning('sprint', p.today);
  const boards = useSprintBoards(p.today);
  return (
    <Frame mode="sprint" status={waitOf(p, 'sprint') ?? dayStatus(p.today, loadSprintBest()[p.today]?.cash, placeWords(boards?.day))}>
      <FirstMorning first={first} />
      <span class="hh-rules"><b>{SPRINT_DAYS} days</b> · {first.config.players.length} stalls · best {SPRINT_WEEK_DAYS} days count</span>
    </Frame>
  );
}

/** How far a finger must travel sideways for a swipe, and how much more sideways than up or down. */
const SWIPE_PX = 44;

/**
 * The chosen mode's card (the tab panel the mode tabs control). PLAN-132: a sideways swipe on it moves to the next or
 * the previous mode (`onSwipe(1)` or `onSwipe(-1)`), and the card slides in from the side it came from (`from`).
 */
export function HeroCard(p: HeroProps & { mode: HomeMode; from?: 'l' | 'r' | ''; onSwipe?: (d: 1 | -1) => void }) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const down = (e: PointerEvent) => { start.current = { x: e.clientX, y: e.clientY }; swiped.current = false; };
  const up = (e: PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < 2 * Math.abs(dy)) return;
    swiped.current = true;
    p.onSwipe?.(dx < 0 ? 1 : -1);
  };
  // a swipe that began and ended on one tile is not a tap on it
  const click = (e: Event) => { if (swiped.current) { swiped.current = false; e.stopPropagation(); e.preventDefault(); } };
  const body = p.mode === 'league' ? <LeagueCard {...p} /> : p.mode === 'daily' ? <DailyCard {...p} /> : p.mode === 'sprint' ? <SprintCard {...p} /> : <CustomCard {...p} />;
  return (
    <section id="jh-hero" class={`jh-panel hh-panel${p.from ? ` hh-from-${p.from}` : ''}`} role="tabpanel" aria-labelledby={`jh-tab-${p.mode}`}
      onPointerDown={down} onPointerUp={up} onPointerCancel={() => { start.current = null; }} onClickCapture={click}>
      {body}
    </section>
  );
}

/**
 * The one big button for the chosen mode. Play opens the mode's own start: the League screen, the Daily intro, the
 * Sprint intro, and for a Match the page of the way that is ticked, which the button names ("Play · Computer",
 * PLAN-132). With a game of that mode waiting it is Continue (the card says the day and cash) and a smaller New game
 * beside it. Each keeps the mode's `data-a` hook. REP-140 B-20: Continue goes straight into the game; New game first
 * asks, as starting over ends the waiting game (`onNew`).
 */
export function PlayButton({ mode, games, way, onPlay, onContinue, onNew }: { mode: HomeMode; games: Partial<Record<SaveSlot, GameState>>; way: PlayWay; onPlay: () => void; onContinue: (slot: SaveSlot) => void; onNew: (slot: SaveSlot) => void }) {
  const m = MODES.find((x) => x.id === mode)!;
  const w = waitingGame(games[m.slot] ?? null);
  const hook = m.slot;
  if (!w) {
    const match = mode === 'custom';
    return (
      <div class="jh-go-row">
        <button class={`jh-go jh-play${match ? ' hh-long' : ''}`} data-a={hook} aria-label={match ? `Play, ${wayName(way)}` : `Play, ${m.name}`} onClick={onPlay}>
          {match ? `Play · ${wayName(way)}` : 'Play'}
        </button>
      </div>
    );
  }
  return (
    <div class="jh-go-row">
      <button class="jh-go jh-cont" data-a={`continue-${m.slot}`} aria-label={`Continue, ${continueWords(w)}`} onClick={() => onContinue(m.slot)}>
        <PlayIcon /><span><b>Continue</b></span>
      </button>
      <button class="jh-new" data-a={hook} aria-label={`New game, ${m.name}`} onClick={() => onNew(m.slot)}>New game</button>
    </div>
  );
}
