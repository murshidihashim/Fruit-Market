// The home screen: a shopfront with your shopkeeper and stall, the main buttons, and the small popup menus that open in front of it.
import { useEffect, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { FRUITS } from '../engine/data';
import { fetchDaily, type BoardResult } from '../net/daily';
import { CODE_LENGTH, normaliseCode } from '../net/protocol';
import { Face, Fruit } from './art';
import { accountsAvailable, signedInAs } from './account';
import { wornParts } from './looks';
import { loadColour } from './progress';
import { myAvatar } from './Wardrobe';
import { C } from './palette';

export interface ShopProps {
  /** "Day 4/10" when a game is waiting to be continued, else null. */
  resume: string | null;
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

export function Shopfront(p: ShopProps) {
  const me = signedInAs();
  const awning = loadColour() ?? C.terracotta;
  const left = FRUITS.slice(0, 2);
  const right = FRUITS.slice(2);
  return (
    <div class="home cosy front">
      <div class="front-top">
        <div class="front-stage">
          <div class="front-sun" aria-hidden="true" />
          <div class="front-title">
            <h1>Fruit Market</h1>
            <p>Where the whole world shops</p>
            <p class="hm-secret">…and every price is a secret</p>
          </div>
          {accountsAvailable() && <button class="front-account" onClick={p.onAccount}>{me ? `Hi, ${me}` : 'Create account'}</button>}
          <div class="front-stall" aria-hidden="true">
            <div class="front-awning" style={{ background: `repeating-linear-gradient(90deg, ${awning} 0 18px, var(--cream) 18px 36px)` }} />
            <i class="front-post l" /><i class="front-post r" />
            <div class="front-keeper"><Face who={myAvatar()} size={72} worn={wornParts()} /></div>
            <div class="front-fruit l">{left.map((f) => <Fruit id={f} size={30} />)}</div>
            <div class="front-fruit r">{right.map((f) => <Fruit id={f} size={30} />)}</div>
            <div class="front-counter" />
          </div>
          <button class="front-dress" onClick={p.onWardrobe}>Dress up</button>
        </div>
      </div>
      <div class="hm-actions">
        {p.notice && <p class="save-notice" role="status">{p.notice}</p>}
        <div class="front-grid">
          <button class="front-tile pri" onClick={p.onNew}><PlusIcon /><span>New game</span></button>
          <button class="front-tile tl" onClick={p.onFriend}><PeopleIcon /><span>Play a friend</span></button>
          <button class="front-tile" onClick={p.onDaily}><DailyIcon /><span>Daily market<small>{p.dailyLine}</small></span></button>
          <button class="front-tile" onClick={p.onLeague}><TrophyIcon /><span>Market League<small>{p.leagueLine}</small></span></button>
        </div>
        {p.resume && <button class="front-continue" onClick={p.onContinue}>Continue · {p.resume}</button>}
        <DailyPeek date={p.today} />
        <div class="front-foot">
          <button onClick={p.onTrophies}>Trophies</button>
          <button onClick={p.onHowTo}>How to play</button>
          <button onClick={p.onSettings}>Settings</button>
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

function PlusIcon() {
  return <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true"><rect x="13" y="5" width="6" height="22" rx="2" fill="currentColor" /><rect x="5" y="13" width="22" height="6" rx="2" fill="currentColor" /></svg>;
}

function PeopleIcon() {
  return <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true"><circle cx="11" cy="11" r="5" fill="currentColor" /><circle cx="22" cy="12" r="4" fill="currentColor" /><path d="M2 27 Q2 17 11 17 Q20 17 20 27 Z" fill="currentColor" /><path d="M20 27 Q20 20 24 20 Q30 20 30 27 Z" fill="currentColor" /></svg>;
}

function DailyIcon() {
  return <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true"><rect x="4" y="6" width="24" height="22" rx="5" fill={C.c_e7a73a} /><rect x="4" y="6" width="24" height="7" rx="3" fill={C.c_c65a3a} /><circle cx="16" cy="20" r="4" fill={C.c_fffaf0} /></svg>;
}

function TrophyIcon() {
  return <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true"><path d="M8 6 H24 V12 Q24 20 16 21 Q8 20 8 12 Z" fill={C.gold} /><rect x="13" y="21" width="6" height="5" fill={C.c_c98f1c} /><rect x="9" y="26" width="14" height="3" rx="1.5" fill={C.c_8e5b33} /></svg>;
}
