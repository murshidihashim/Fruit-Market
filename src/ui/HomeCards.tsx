// PLAN-120: Home's top half. Your stall, drawn with every look you wear (the awning in your colour with your roof and
// trim, your shopkeeper in what they wear inside your signboard frame, your name and title on the signboard, your crate
// with your prop and your price tag), then three mode cards in a row you swipe: Play (opens the Play page), the Market
// League (the stage you are on, its picture and rivals, your stars, the next trophy) and the Daily market (today's first
// customer and the lorry, your place, and the Sprint). Each card shows the game of its mode that is waiting (store.ts
// keeps one per mode) with its own Continue. Swiping is the browser's own scroll (CSS scroll-snap): nothing here is
// animated, and the arrows and dots move the row for people who do not swipe (at once when motion is reduced).
// PLAN-121, Home on one screen: the stall swipes with a card of your next goals (the same row, two dots), the stamp book
// and the Wardrobe are icon buttons on the stall, and the mode cards are compact (home-cards.css keeps the extra lines
// and bigger pictures for a phone with room to spare).
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { dailyConfig, dailyTwist } from '../engine/daily';
import { FRUIT, RIVALS, lookOf, type FruitId } from '../engine/data';
import { newGame, type GameState } from '../engine/game';
import { fetchDaily, type BoardResult } from '../net/daily';
import { ownerHash, placeWords } from '../net/sprint';
import { stallOf, tagOf, titleOf } from '../net/looks';
import { Face } from './art';
import { CardArt, Gazette, TradingCard } from './cards';
import { CardZoom } from './cardZoom';
import { LEAGUE, picName, stageByNo, stageStars, starGoals } from './campaign';
import { FruitSvg } from './fruitIcons';
import { Icon, PropSprite, RoofBand } from './icons';
import { myAvatar, worn } from './looks';
import { crateUrl } from './marketArt';
import { isReduced } from './motion';
import { nextTrophy } from './League';
import { MODE_REASON, leagueEcho } from './playMenu';
import { leagueStage, myStars } from './progress';
import { stageGoal, stageRivals } from './progressView';
import { waitingGame, type WaitingGame } from './paused';
import { FramedFace, PriceTag, myColour, shownAvatar, stallName } from './stampCard';
import { Stars, picSrc } from './StageMoment';
import { SPRINT_TITLE, bestLine, useSprintBoards } from './Sprint';
import { loadSprintBest } from './sprintStore';
import { loadDaily, type SaveSlot } from './store';
import { currentStreak } from './streak';
import { firstCustomer, rivalsLine, shortDate } from './dailyCard';
import './home-cards.css';

const LORRY: FruitId[] = ['blueberry', 'watermelon', 'mango', 'apple'];

/** "Day 4 of 10 · $23": where a waiting game stands (your cash when one person plays). */
export const waitWords = (w: WaitingGame): string => `Day ${w.day} of ${w.days}${w.cash !== null ? ` · $${w.cash}` : ''}`;

/** The two icon buttons on your stall (PLAN-121): the stamp book and the Wardrobe, each one tap from Home. */
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
 * Your stall, as big as Home has room for: the awning (your colour, roof and trim), your shopkeeper in your frame and
 * wearing your hat and the rest, the signboard with your stall's name and your title, the crate with your prop on the
 * counter and your price tag. `next` is the "Next …" line (the nearest look to unlock), drawn on the stall's foot.
 * PLAN-121: the stamp book and the Wardrobe are icon buttons on its right (they were tiles under the mode cards).
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

/** One card of a row that swipes: its id, its name (for a screen reader), what its dot says and what it draws. */
export interface SwipeCard { id: string; name: string; dot: string; draw: () => ComponentChildren }

/** The card each row showed last, so coming back from the League or the Daily intro shows the same card. */
const lastCard: Record<string, number> = {};

/**
 * A row of cards that swipes (PLAN-120 for the mode cards; PLAN-121 for your stall and your goals): one card per screen
 * width with the next one peeking. The row scrolls sideways and snaps to a card (the browser's own scroll); the dots
 * under it (and the arrows, with `arrows`) move it and say which card is in view. The arrow keys move it from the nav,
 * and moving focus into a card brings that card into view. With reduced motion the row moves at once.
 */
function SwipeRow({ name, label, cards, cls, arrows, start }: {
  name: string; label: string; cards: SwipeCard[]; cls: { box: string; row: string; card: string; nav: string }; arrows?: boolean; start?: number;
}) {
  const row = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(start ?? lastCard[name] ?? 0);
  const kids = () => Array.from(row.current?.children ?? []) as HTMLElement[];
  // A card's place in the row (the row is the cards' offset parent; the first card starts after the row's gutter).
  const left = (el: HTMLElement) => el.offsetLeft - (kids()[0]?.offsetLeft ?? 0);
  // The card in view: the one whose left edge is nearest the row's; the last when the row is scrolled to its end.
  const measure = () => {
    const el = row.current;
    if (!el) return;
    const ks = kids();
    const end = el.scrollLeft >= el.scrollWidth - el.clientWidth - 2;
    let best = 0;
    ks.forEach((k, i) => { if (Math.abs(left(k) - el.scrollLeft) < Math.abs(left(ks[best]) - el.scrollLeft)) best = i; });
    const i = end && el.scrollLeft > 0 ? ks.length - 1 : best;
    lastCard[name] = i;
    setAt(i);
  };
  const show = (i: number, smooth = true) => {
    const el = row.current;
    const k = kids()[i];
    if (!el || !k) return;
    el.scrollTo({ left: left(k), behavior: smooth && !isReduced() ? 'smooth' : 'auto' });
    lastCard[name] = i;
    setAt(i);
  };
  useEffect(() => { if (at) show(at, false); }, []);
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    el.addEventListener('scroll', on, { passive: true });
    return () => { el.removeEventListener('scroll', on); cancelAnimationFrame(raf); };
  }, []);
  const n = cards.length;
  const key = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' && at < n - 1) { e.preventDefault(); show(at + 1); }
    if (e.key === 'ArrowLeft' && at > 0) { e.preventDefault(); show(at - 1); }
  };
  return (
    <section class={cls.box} aria-roledescription="carousel" aria-label={label}>
      <div class={cls.row} ref={row}>
        {cards.map((c, i) => (
          <article class={`${cls.card} ${cls.card}-${c.id}`} data-card={c.id} role="group" aria-roledescription="card" aria-label={`${c.name}, ${i + 1} of ${n}`}
            onFocusIn={() => { if (i !== at) show(i); }}>
            {c.draw()}
          </article>
        ))}
      </div>
      <div class={cls.nav} onKeyDown={key}>
        {arrows && (
          <button class="jh-arr" aria-label="Previous card" disabled={at === 0} onClick={() => show(at - 1)}>
            <svg width="18" height="16" viewBox="0 0 18 16" aria-hidden="true"><path d="M8 1 1 8l7 7M1 8h17" stroke="currentColor" stroke-width="2.5" fill="none" /></svg>
          </button>
        )}
        <div class="jh-dots" role="group" aria-label="Cards">
          {cards.map((c, i) => (
            <button class={`jh-dot ${i === at ? 'on' : ''}`} aria-label={c.dot} aria-current={i === at ? 'true' : undefined} onClick={() => show(i)}><i /></button>
          ))}
        </div>
        {arrows && (
          <button class="jh-arr" aria-label="Next card" disabled={at === n - 1} onClick={() => show(at + 1)}>
            <svg width="18" height="16" viewBox="0 0 18 16" aria-hidden="true"><path d="M10 1l7 7-7 7M17 8H0" stroke="currentColor" stroke-width="2.5" fill="none" /></svg>
          </button>
        )}
      </div>
    </section>
  );
}

/**
 * PLAN-121: the top of Home, your stall and your next goals in one row that swipes, with two dots under it. `goals` is
 * the goals card's inside (Home.tsx), or null when no goal is left: then the stall stands alone.
 */
export function StallRow({ next, buttons, goals }: { next: string | null; buttons: StallButtons; goals: ComponentChildren | null }) {
  if (!goals) return <section class="jh-stallrow solo" aria-label="Your stall"><YourStall next={next} buttons={buttons} /></section>;
  return (
    <SwipeRow name="stall" label="Your stall and your goals" cls={{ box: 'jh-stallrow', row: 'jh-srow', card: 'jh-scard', nav: 'jh-snav' }}
      cards={[{ id: 'stall', name: 'Your stall', dot: 'Show your stall', draw: () => <YourStall next={next} buttons={buttons} /> }, { id: 'goals', name: 'Your next goals', dot: 'Show your next goals', draw: () => goals }]} />
  );
}

/** A card's Continue: the waiting game's day and cash, opening the Continue question (Resume or Start over). */
function ContinueButton({ slot, w, label, onContinue }: { slot: SaveSlot; w: WaitingGame; label?: string; onContinue: (slot: SaveSlot) => void }) {
  return (
    <button class="jh-cgo" data-a={`continue-${slot}`} onClick={() => onContinue(slot)}>
      <PlayIcon /><span><b>{label ?? 'Continue'}</b><small>{waitWords(w)}</small></span>
    </button>
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

export interface ModeCardProps {
  today: string;
  /** The saved game of each mode (store.ts loadGames), or none. */
  games: Partial<Record<SaveSlot, GameState>>;
  onContinue: (slot: SaveSlot) => void;
  /** Opens the Play page. */
  onPlay: () => void;
  onLeague: () => void;
  /** Open the Daily intro screen for the Daily market, or for the Sprint. */
  onDaily: () => void;
  onSprint: () => void;
}

/** 1. Play: the ways to play a full market, and the big Play button (Continue first when a Play game is waiting). */
function PlayCard(p: ModeCardProps) {
  const g = p.games.play;
  const w = waitingGame(g ?? null);
  const avatar = myAvatar();
  const rivals = RIVALS.filter((r) => r.avatar !== avatar).slice(0, 3);
  return (
    <>
      <div class="jh-ch"><span>Play</span><small>your market, your way</small></div>
      <div class="jh-cb">
        {/* PLAN-121: with a game waiting, the ways to play show only on a phone with room to spare (".jh-x"); they are one
            tap away on the Play page (Play something else). */}
        <ul class={`jh-ways ${w && g ? 'jh-x' : ''}`}>
          <li><b>Quick match</b><span>A stranger online</span></li>
          <li><b>Private room</b><span>Friends, by link or code</span></li>
          <li><b>Computer</b><span>Easy, Normal or Hard</span></li>
          <li><b>One phone</b><span>Pass and play</span></li>
        </ul>
        {w && g ? (
          <div class="jh-wait">
            <span class="jh-lb">Your game · {w.mode}</span>
            <TableRow g={g} />
            <ContinueButton slot="play" w={w} onContinue={p.onContinue} />
            <button class="jh-go2 jh-c2" data-a="play" onClick={p.onPlay}>Play something else</button>
          </div>
        ) : (
          <>
            <span class="jh-vs" aria-hidden="true"><FramedFace who={avatar} size={36} look={worn()} /><i>vs</i>{rivals.map((r) => <Face who={r.avatar} size={28} />)}</span>
            <button class="jh-go jh-cplay" data-a="play" onClick={p.onPlay}>Play</button>
          </>
        )}
      </div>
    </>
  );
}

/** 2. The Market League: the stage you are on, its picture, you against its rivals, its stars, the next trophy. */
function LeagueCard(p: ModeCardProps) {
  const at = leagueStage();
  const done = at >= LEAGUE.length;
  const sel = Math.min(at, LEAGUE.length - 1);
  const st = stageByNo(sel) ?? LEAGUE[0];
  const stars = myStars();
  const got = stageStars(sel, stars).length;
  const trophy = nextTrophy();
  const g = p.games.league;
  const w = waitingGame(g ?? null);
  return (
    <>
      <div class="jh-ch"><span>Market League</span><small>{done ? `All ${LEAGUE.length} stages cleared` : `Stage ${sel + 1} of ${LEAGUE.length}`}</small></div>
      <div class="jh-cb">
        <span class="jh-why">{MODE_REASON.league}</span>
        <div class={`jh-lgpic ${w ? 'jh-lgw' : ''}`}>
          <CardArt class="jh-lgart" src={picSrc(st.pic)} alt={picName(st.pic)} w={300} h={170} eager />
          <span class="jh-lgvs" aria-hidden="true">
            <FramedFace who={myAvatar()} size={28} look={worn()} /><i>vs</i>
            {stageRivals(st).map((r) => <span class="jh-round"><Face who={r.avatar} size={24} /></span>)}
          </span>
        </div>
        <b class="jh-lgt">{st.title}</b>
        {!w && <span class="jh-lgg">{stageGoal(st)}</span>}
        <span class={`jh-lgs ${w ? 'jh-x' : ''}`}><Stars got={got} total={starGoals(st).length} size={16} /><small>{stars.length} stars in all</small></span>
        {trophy && !w && <span class="jh-lgtr jh-x"><b>Next trophy</b> {trophy.title} · {trophy.got} of {trophy.goal} stars</span>}
        {w && g ? (
          <div class="jh-wait">
            <ContinueButton slot="league" w={w} label={`Continue ${w.mode.replace(/^League /, '')}`} onContinue={p.onContinue} />
            <button class="jh-go2 jh-c2" data-a="league" onClick={p.onLeague}>Open the League</button>
          </div>
        ) : <button class="jh-dgo jh-cmain" data-a="league" onClick={p.onLeague}><PlayIcon />Open the League</button>}
      </div>
    </>
  );
}

/** Today's Daily board as Home reads it (null while it loads). */
export function useDailyBoard(today: string): BoardResult | null {
  const [res, setRes] = useState<BoardResult | null>(null);
  useEffect(() => { let alive = true; void ownerHash().then((me) => fetchDaily(today, me)).then((r) => { if (alive) setRes(r); }); return () => { alive = false; }; }, [today]);
  return res;
}

/** 3. The Daily market: the first morning (the customer first in the row, the lorry), your best and place, then the
 *  Sprint's row. Each button opens the Daily intro (or, with a game of that mode waiting, Continue). */
function DailyModeCard(p: ModeCardProps) {
  const first = useMemo(() => newGame(dailyConfig(p.today, 'You')), [p.today]);
  const res = useDailyBoard(p.today);
  const sprint = useSprintBoards(p.today);
  const daily = loadDaily();
  const streak = currentStreak(Object.keys(daily), p.today);
  const e = first.event;
  const who = firstCustomer(first);
  const mine = bestLine(daily[p.today], res?.error ? null : placeWords(res ? { rank: res.rank, players: res.players ?? res.top.length } : undefined));
  const sprintMine = bestLine(loadSprintBest()[p.today]?.cash, placeWords(sprint?.day));
  const wd = waitingGame(p.games.daily ?? null);
  const ws = waitingGame(p.games.sprint ?? null);
  // PLAN-119: what today's Daily uses that you met in the Market League (its twist's standing orders, its first customer).
  const echo = leagueEcho(first.config, who?.name ?? null, leagueStage());
  return (
    <>
      <div class="jh-ch"><span>Daily market · {shortDate(p.today)}</span>{streak > 0 && <small>{streak}-day streak</small>}</div>
      <div class="jh-cb">
        <span class="jh-why">{MODE_REASON.daily}</span>
        <div class="jh-db">
          <CardZoom class="jh-dcard" title={who ? lookOf(who.name).title : e ? e.title : 'Daily market'}>{who ? <TradingCard who={who.name} wants={who.wants} eager /> : e ? <Gazette event={e} eager /> : null}</CardZoom>
          <div class="jh-dr">
            <span class="jh-lb">Today's lorry brings</span>
            <div class="jh-lorry">{LORRY.map((f) => <span class={`f-${f}`}><FruitSvg id={f} size={18} alt={FRUIT[f].plural} /><b>{first.delivery[f] ?? 0}</b></span>)}</div>
            <span class="jh-dtw"><b>{dailyTwist(p.today).title}</b> · {first.config.days} days · {first.config.players.length} stalls</span>
            <span class="jh-vs jh-dvs jh-x" role="img" aria-label={rivalsLine(first.config)}>{first.config.players.filter((pl) => pl.kind === 'ai').map((pl) => <Face who={pl.avatar ?? ''} size={28} />)}</span>
            {echo && <span class="jh-decho jh-x" data-a="daily-echo">{echo}</span>}
            <span class="jh-dme">{mine ?? (res && !res.error && res.top.length ? `${res.players ?? res.top.length} played · best so far $${res.top[0].cash}` : 'Not played today')}</span>
          </div>
        </div>
        {wd ? <ContinueButton slot="daily" w={wd} label="Continue" onContinue={p.onContinue} />
          : <button class="jh-dgo jh-cmain" data-a="daily" onClick={p.onDaily}><PlayIcon />Play the Daily market</button>}
        <div class="jh-sp2" data-a="sprint-row">
          <span class="jh-sp2-tx"><b>{SPRINT_TITLE}</b><small>{sprintMine ?? (sprint?.day?.players ? `${sprint.day.players} played · best so far $${sprint.day.top[0]?.cash ?? 0}` : MODE_REASON.sprint)}</small></span>
          {ws ? <ContinueButton slot="sprint" w={ws} onContinue={p.onContinue} />
            : <button class="jh-dgo jh-sp2-go" data-a="sprint" onClick={p.onSprint}><PlayIcon />Play the Sprint</button>}
        </div>
      </div>
    </>
  );
}

const CARDS: { id: 'play' | 'league' | 'daily'; name: string; draw: (p: ModeCardProps) => ComponentChildren }[] = [
  { id: 'play', name: 'Play', draw: (p) => <PlayCard {...p} /> },
  { id: 'league', name: 'Market League', draw: (p) => <LeagueCard {...p} /> },
  { id: 'daily', name: 'Daily market', draw: (p) => <DailyModeCard {...p} /> },
];

/**
 * The three mode cards in a row (SwipeRow): one card per screen width with the next one peeking, with the arrows and
 * the dots under it.
 */
export function ModeCards(p: ModeCardProps & { start?: number }) {
  return (
    <SwipeRow name="modes" label="Ways to play" start={p.start} arrows cls={{ box: 'jh-modes', row: 'jh-row', card: 'jh-card', nav: 'jh-nav' }}
      cards={CARDS.map((c) => ({ id: c.id, name: c.name, dot: `Show the ${c.name} card`, draw: () => c.draw(p) }))} />
  );
}
