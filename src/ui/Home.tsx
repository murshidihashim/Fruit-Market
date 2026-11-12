// The home screen, "Ticket Booth" (PLAN-074; DEC-097, boards "Home-A", "Home-B" and "Home-Waiting"): the black bar
// with the account and the Wardrobe (your shopkeeper's picture, dressed), a band of the four fruit lanes, the title,
// a row that is swiped sideways (today's market first, your next goals one swipe on, and your table first when a game
// is waiting), dots that can also be tapped, one black button, the Market League as a ticket, and Trophies, How to
// play and Settings on a kraft strip. The look is the game table's (Market Ticket, ticket.css); the styles are in
// booth.css. The opening (Opening.tsx, "Lane Drop") plays on this very screen: it puts "hm-intro" on <html>, which
// animates the title and everything under the band into place.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { dailyConfig } from '../engine/daily';
import { stageAt, type FruitId } from '../engine/data';
import { activePlayer, count, newGame, shelfSize, type GameState } from '../engine/game';
import { fetchDaily, type BoardResult } from '../net/daily';
import { LOOKS } from '../net/looks';
import { CODE_LENGTH, normaliseCode } from '../net/protocol';
import { accountsAvailable, signedInAs } from './account';
import { TIER_COUNT, standing } from './achievements';
import { CALM_ART, eventArt, eventFocus, focusCss } from './deckArt';
import { newsChips } from './eventChips';
import { FruitSvg } from './fruitIcons';
import { myAvatar, syncLooks, worn } from './looks';
import { snapshot, syncTiers } from './progress';
import { FramedFace, TrophyPic, shownAvatar } from './stampCard';
import { goals } from './stamps';
import { loadDaily } from './store';
import { currentStreak } from './streak';

export interface ShopProps {
  /** "Day 4/10" when a game is waiting to be continued, else null. */
  resume: string | null;
  /** Your cash in the waiting game (one person at the table), else null. */
  cash: number | null;
  /** The game that is waiting, for its page in the row (null when none is). */
  table: GameState | null;
  leagueLine: string;
  today: string;
  notice: string | null;
  onContinue: () => void;
  onNew: () => void;
  onFriend: () => void;
  onDaily: () => void;
  onLeague: () => void;
  onWardrobe: () => void;
  onAccount: () => void;
  onTrophies: () => void;
  onHowTo: () => void;
  onSettings: () => void;
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "11 Nov" from a date key. */
const shortDate = (key: string): string => { const [, m, d] = key.split('-').map(Number); return `${d} ${MONTHS[(m || 1) - 1]}`; };

/** Today's market (the first page): today's event and its effect, what the lorry brings, how many have played and the
 *  best so far, and one button to play. The event and the lorry are the first morning of today's Daily market, which is
 *  the same for everyone and public from its first screen. */
function TodayPage({ today, onDaily }: { today: string; onDaily: () => void }) {
  const first = useMemo(() => newGame(dailyConfig(today, 'You')), [today]);
  const [res, setRes] = useState<BoardResult | null>(null);
  useEffect(() => { let alive = true; void fetchDaily(today).then((r) => { if (alive) setRes(r); }); return () => { alive = false; }; }, [today]);
  const daily = loadDaily();
  const streak = currentStreak(Object.keys(daily), today);
  const e = first.event;
  const chip = newsChips(e)[0];
  const src = e ? eventArt(e.id) : CALM_ART;
  const best = res && !res.error && res.top.length ? res.top[0].cash : null;
  return (
    <div class="hm-slot" data-page="today">
      <div class="hm-sh"><span>Today's market · {shortDate(today)}</span>{streak > 0 && <b>{streak}-day streak</b>}</div>
      <div class="hm-sb">
        <div class="hm-t1">
          <div class="hm-ev">
            {src && <img src={src} alt="" decoding="async" draggable={false} style={{ objectPosition: focusCss(eventFocus(e ? e.id : 'calm')) }} />}
            <span class="hm-evn">{e ? e.title : 'Calm Day'}</span>
            <span class="hm-chip">{chip ? `${chip.big} ${chip.small.toLowerCase()}` : 'No event today'}</span>
          </div>
          <div class="hm-tr">
            <span class="hm-lb">Today's lorry brings</span>
            <div class="hm-ln4">{LANES.map((f) => <span class={`hm-ln f-${f}`}><i><FruitSvg id={f} size={16} alt={f} /></i>{first.delivery[f] ?? 0}</span>)}</div>
            <span class="hm-lb">Same market for all</span>
            <span class="hm-st">
              {daily[today] !== undefined ? <>Your best today <b>${daily[today]}</b></> : best !== null ? <><b>{res?.players ?? res?.top.length}</b> played · best so far <b>${best}</b></> : 'First try counts on the board'}
            </span>
          </div>
        </div>
        <button class="hm-act" onClick={onDaily}><PlayIcon />Play today's market</button>
      </div>
    </div>
  );
}

/** Your next goals (one swipe on): the three trophy tiers nearest to done, with progress and what each gives. */
function GoalsPage() {
  const snap = snapshot();
  const three = goals(snap).slice(0, 3);
  const held = standing(snap).length;
  return (
    <div class="hm-slot" data-page="goals">
      <div class="hm-sh"><span>Your next goals</span><b>{held} of {TIER_COUNT} tiers</b></div>
      <div class="hm-sb hm-goals">
        {three.map((g) => {
          const look = LOOKS.find((l) => l.from.kind === 'trophy' && l.from.id === g.step.id);
          return (
            <div class="hm-gl">
              <span class="hm-sw"><TrophyPic pic={g.card.pic} /></span>
              <span class="hm-gt"><b>{g.step.text.replace(/\.$/, '')}</b><span>{look ? `Unlocks ${look.title} · +${g.stamps} stamps` : `+${g.stamps} stamps`}</span></span>
              <span class="hm-pg">{g.card.money ? `$${g.value}/$${g.goal}` : `${g.value}/${g.goal}`}<span class="hm-pb"><i style={{ width: `${Math.round(g.share * 100)}%` }} /></span></span>
            </div>
          );
        })}
        {three.length === 0 && <p class="hm-st">Every trophy tier is earned.</p>}
      </div>
    </div>
  );
}

const PHASE_WORDS: Record<string, string> = {
  morning: 'The morning news is in.', order: 'A standing order is up for bids.', stall: 'Time to fill your crate.', bid: 'Time to set your prices.',
  tie: 'A tied price to settle.', reveal: 'The rush is on.', evening: 'It is evening.',
};

/** Your table (first when a game is waiting): the day, your shelf and cash when one person plays, every stall's cash
 *  (which the table shows to all), and where the game stopped. A shared phone shows no shelf: it is one person's secret. */
function TablePage({ g, cash }: { g: GameState; cash: number | null }) {
  const solo = cash !== null;
  const me = g.players.findIndex((p) => p.kind === 'human');
  const pl = g.players[me];
  const order = g.players.map((_, i) => i).sort((a, b) => g.players[b].cash - g.players[a].cash);
  const pieces = solo && pl ? LANES.flatMap((f) => pl.stock[f].flatMap((n, pos) => Array.from({ length: n }, () => ({ f, stage: stageAt(f, pos) })))) : [];
  const size = pl ? shelfSize(pl) : 8;
  const turn = activePlayer(g);
  const place = g.order.indexOf(me) + 1;
  const where = g.phase === 'buy'
    ? `${place > 0 ? `You buy ${['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][place - 1] ?? ''}. ` : ''}${turn === me ? 'It is your turn to buy.' : ''}`
    : PHASE_WORDS[g.phase] ?? '';
  return (
    <div class="hm-slot" data-page="table">
      <div class="hm-sh"><span>Your table · day {g.day} of {g.config.days}</span>{solo && <b>You have ${cash}</b>}</div>
      <div class="hm-sb">
        <div class={`hm-wt ${solo ? '' : 'one'}`}>
          {solo && pl && (
            <div class="hm-cl">
              <span class="hm-lb">Your shelf · {count(pl.stock)} of {size}</span>
              <div class="hm-shf">
                {Array.from({ length: Math.max(size, pieces.length) }, (_, i) => (pieces[i]
                  ? <span class="hm-sl"><FruitSvg id={pieces[i].f} stage={pieces[i].stage} size={24} alt={pieces[i].f} /></span>
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
        <div class="hm-nb"><b>Today: {g.event ? g.event.title : 'Calm Day'}.</b> {where}</div>
      </div>
    </div>
  );
}

export function Shopfront(p: ShopProps) {
  const me = signedInAs();
  // What is stored is brought up to date as the game opens: the tiers a player from before the stamp book has already
  // reached, and the looks their trophies and stall level give. Nothing is ever taken away.
  useState(() => { syncTiers(); syncLooks(); });
  const pages = [...(p.table ? ['table'] : []), 'today', 'goals'];
  const names: Record<string, string> = { table: 'Your table', today: 'Today\'s market', goals: 'Your next goals' };
  const [page, setPage] = useState(0);
  const car = useRef<HTMLDivElement>(null);
  // The row is swiped with a finger (it scrolls sideways and stops on a page); the dots follow, and a tap on a dot
  // moves the row. Reduced motion: the row jumps.
  const onScroll = () => {
    const el = car.current;
    if (!el || !el.firstElementChild) return;
    const w = (el.firstElementChild as HTMLElement).offsetWidth + 8;
    setPage(Math.max(0, Math.min(pages.length - 1, Math.round(el.scrollLeft / w))));
  };
  const goTo = (i: number) => {
    const el = car.current;
    const slot = el?.children[i] as HTMLElement | undefined;
    if (!el || !slot) return;
    const still = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: slot.offsetLeft - el.offsetLeft - 16, behavior: still ? 'auto' : 'smooth' });
    setPage(i);
  };
  const hint = page === 0 ? (pages[1] === 'today' ? 'Swipe for today' : 'Swipe for your goals') : page === pages.length - 1 ? `Swipe back for ${pages[0] === 'table' ? 'your table' : 'today'}` : 'Swipe for your goals';
  return (
    <div class="home hm">
      <div class="hm-in">
        <header class="hm-bar">
          {accountsAvailable() ? <button class="hm-acct" onClick={p.onAccount}><PersonIcon /><span>{me ? `Hi, ${me}` : 'Create account'}</span></button> : <span />}
          <button class="hm-dress" onClick={p.onWardrobe}><FramedFace who={myAvatar()} size={32} look={worn()} /><span>Wardrobe</span></button>
        </header>
        <LaneBand />
        <div class="hm-title">
          <h1 class="hm-name">Fruit<br />Market</h1>
          <p>Run a fruit stall. <span>Every price is a secret.</span></p>
        </div>
        <div class="hm-rest">
          {p.notice && <p class="save-notice" role="status">{p.notice}</p>}
          <div class="hm-car" ref={car} onScroll={onScroll}>
            {p.table && <TablePage g={p.table} cash={p.cash} />}
            <TodayPage today={p.today} onDaily={p.onDaily} />
            <GoalsPage />
          </div>
          <div class="hm-dots">
            {pages.map((id, i) => <button type="button" class={i === page ? 'on' : ''} aria-label={names[id]} aria-current={i === page ? 'true' : undefined} onClick={() => goTo(i)} />)}
            <span>{hint}</span>
          </div>
          <div class="hm-play">
            {p.resume ? (
              <>
                <button class="hm-go" onClick={p.onContinue}><PlayIcon />Continue<span class="hm-vh"> · </span><small>{p.resume}</small></button>
                <div class="hm-two">
                  <button class="hm-b" onClick={p.onNew}>New game</button>
                  <button class="hm-b" onClick={p.onFriend}>Play a friend</button>
                </div>
              </>
            ) : (
              <>
                <button class="hm-go" onClick={p.onNew}>New game</button>
                <button class="hm-b" onClick={p.onFriend}>Play a friend</button>
              </>
            )}
          </div>
          <div class="hm-tickets">
            <button class="hm-tk" onClick={p.onLeague}>
              <span class="hm-tk-ic"><TrophyIcon /></span>
              <span class="hm-tk-txt"><small>Market League</small><span>{p.leagueLine}</span></span>
            </button>
          </div>
          <nav class="hm-foot">
            <button onClick={p.onTrophies}>Trophies</button>
            <button onClick={p.onHowTo}>How to play</button>
            <button onClick={p.onSettings}>Settings</button>
          </nav>
        </div>
      </div>
    </div>
  );
}

/** A small menu in the middle of the screen, in front of the home screen. */
export function Popup({ title, onClose, children }: { title: string; onClose: () => void; children: ComponentChildren }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  return (
    <div class="modal-bg popup-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="modal popup" role="dialog" aria-modal="true" aria-label={title}>
        <div class="popup-hd"><h2>{title}</h2><button class="icon-btn" aria-label="Close" onClick={onClose}>×</button></div>
        {children}
      </div>
    </div>
  );
}

export function ContinueBody({ day, days, stalls, cash, onResume, onStartOver }: { day: number; days: number; stalls: number; cash: number | null; onResume: () => void; onStartOver: () => void }) {
  return (
    <>
      <div class="popup-info">
        <span><b>Day {day} of {days}</b><small>{stalls} stalls{cash !== null ? ` · you have $${cash}` : ''}</small></span>
      </div>
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
export function ReplaceBody({ day, days, stalls, cash, what, onKeep, onStart }: { day: number; days: number; stalls: number; cash: number | null; what: string; onKeep: () => void; onStart: () => void }) {
  return (
    <>
      <div class="popup-info">
        <span><b>Day {day} of {days}</b><small>{stalls} stalls{cash !== null ? ` · you have $${cash}` : ''}</small></span>
      </div>
      <p class="small">You have a game waiting. Starting {what} ends this game.</p>
      <button class="btn primary big wide" onClick={onKeep}>Keep my game</button>
      <button class="btn wide" onClick={onStart}>Start anyway</button>
    </>
  );
}

export function FriendBody({ onCreate, onJoin, onQuick }: { onCreate: () => void; onJoin: (code: string) => void; onQuick: () => void }) {
  const [code, setCode] = useState('');
  const clean = normaliseCode(code);
  const ok = clean.length === CODE_LENGTH;
  return (
    <>
      <button class="btn primary big wide popup-opt" onClick={onCreate}><b>Create a room</b><small>Share a link with 1 to 5 friends</small></button>
      <div class="acct-field">
        <label class="small" for="join-code">Join with a code</label>
        <div class="join-row">
          <input id="join-code" class="input" value={code} maxLength={CODE_LENGTH} autocapitalize="characters" autocomplete="off" spellcheck={false}
            onInput={(e) => setCode((e.target as HTMLInputElement).value.toUpperCase())} />
          <button class="btn" disabled={!ok} onClick={() => onJoin(clean)}>Join</button>
        </div>
      </div>
      <button class="btn wide popup-opt" onClick={onQuick}><b>Quick match</b><small>Play a stranger, 2 players</small></button>
    </>
  );
}

// Line icons for the booth (stroke in the text colour).
const line = { fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } as const;
function PersonIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...line}><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6" /></svg>;
}

function PlayIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M7 4v16l13-8z" fill="currentColor" /></svg>;
}

function TrophyIcon() {
  return <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" {...line} stroke-width="2"><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 21h8" /></svg>;
}
