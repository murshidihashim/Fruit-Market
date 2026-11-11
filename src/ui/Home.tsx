// The home screen, "Ticket Booth" (home A, PLAN-074): the black bar with the account and Dress up, a band of the four
// fruit lanes, the title, your stall (your shopkeeper's picture), one black button, the Daily market and the Market
// League as tickets, and Trophies, How to play and Settings on a kraft strip. The look is the game table's
// (Market Ticket, ticket.css); the styles are in booth.css. The opening (Opening.tsx, "Lane Drop") plays on this very
// screen: it puts "hm-intro" on <html>, which animates the title and everything under the band into place.
import { useEffect, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { RIVALS, type FruitId } from '../engine/data';
import { fetchDaily, type BoardResult } from '../net/daily';
import { CODE_LENGTH, normaliseCode } from '../net/protocol';
import { accountsAvailable, signedInAs } from './account';
import { shopScene } from './deckArt';
import { FruitSvg } from './fruitIcons';
import { myAvatar } from './Wardrobe';

export interface ShopProps {
  /** "Day 4/10" when a game is waiting to be continued, else null. */
  resume: string | null;
  /** Your cash in the waiting game (one person at the table), else null. */
  cash: number | null;
  dailyLine: string;
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

export function Shopfront(p: ShopProps) {
  const me = signedInAs();
  const avatar = myAvatar();
  const keeper = RIVALS.find((r) => r.avatar === avatar);
  const scene = shopScene(avatar);
  return (
    <div class="home hm">
      <div class="hm-in">
        <header class="hm-bar">
          {accountsAvailable() ? <button class="hm-acct" onClick={p.onAccount}><PersonIcon /><span>{me ? `Hi, ${me}` : 'Create account'}</span></button> : <span />}
          <button class="hm-dress" onClick={p.onWardrobe}><ShirtIcon /><span>Dress up</span></button>
        </header>
        <LaneBand />
        <div class="hm-title">
          <h1 class="hm-name">Fruit<br />Market</h1>
          <p>Where the whole world shops <span>…and every price is a secret</span></p>
        </div>
        <div class="hm-rest">
          {p.notice && <p class="save-notice" role="status">{p.notice}</p>}
          <div class="hm-stall">
            <div class="hm-stall-head"><span>Your stall{keeper ? ` · ${keeper.name}` : ''}</span>{p.resume && <b>{p.resume.replace('/', ' of ')}</b>}</div>
            <div class="hm-stall-pic">
              {scene && <img src={scene} alt="" decoding="async" draggable={false} />}
              {p.resume && p.cash !== null && <b class="hm-cash">${p.cash}</b>}
            </div>
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
            <button class="hm-tk" onClick={p.onDaily}>
              <span class="hm-tk-ic"><DailyIcon /></span>
              <span class="hm-tk-txt"><small class="red">Daily market</small><span>{p.dailyLine}</span></span>
              <span class="hm-tk-go">Play</span>
            </button>
            <button class="hm-tk" onClick={p.onLeague}>
              <span class="hm-tk-ic"><TrophyIcon /></span>
              <span class="hm-tk-txt"><small>Market League</small><span>{p.leagueLine}</span></span>
            </button>
          </div>
          <DailyPeek date={p.today} />
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

export function FriendBody({ onCreate, onJoin, onQuick }: { onCreate: () => void; onJoin: (code: string) => void; onQuick: () => void }) {
  const [code, setCode] = useState('');
  const clean = normaliseCode(code);
  const ok = clean.length === CODE_LENGTH;
  return (
    <>
      <button class="btn primary big wide popup-opt" onClick={onCreate}><b>Create a room</b><small>Share a link with 1 to 3 friends</small></button>
      <div class="acct-field">
        <label class="small" for="join-code">Join with a code</label>
        <div class="join-row">
          <input id="join-code" class="input" value={code} maxLength={CODE_LENGTH} autocapitalize="characters" autocomplete="off" spellcheck={false}
            onInput={(e) => setCode((e.target as HTMLInputElement).value.toUpperCase())} />
          <button class="btn" disabled={!ok} onClick={() => onJoin(clean)}>Join</button>
        </div>
      </div>
      <button class="btn wide popup-opt" onClick={onQuick}><b>Quick match</b><small>Meet a stranger, 2 players</small></button>
    </>
  );
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

// Line icons for the booth (stroke in the text colour).
const line = { fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } as const;
function PersonIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...line}><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6" /></svg>;
}

function ShirtIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...line}><path d="M8 3 3 7l3 3 2-1v12h8V9l2 1 3-3-5-4c-1 2-2.5 3-4 3S9 5 8 3Z" /></svg>;
}

function PlayIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M7 4v16l13-8z" fill="currentColor" /></svg>;
}

function DailyIcon() {
  return <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" {...line} stroke-width="2"><rect x="3" y="5" width="18" height="16" /><path d="M3 10h18M8 3v4M16 3v4" /><circle cx="12" cy="15.5" r="2" /></svg>;
}

function TrophyIcon() {
  return <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" {...line} stroke-width="2"><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 21h8" /></svg>;
}
