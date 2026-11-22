// The home screen (PLAN-113, the player journey; before it the "Ticket Booth" of PLAN-074; PLAN-120, the stall and the
// mode cards). Top to bottom: the four fruit lanes (the band the opening folds into), the title with your stall level,
// "Back to room" when an online match is open, then (PLAN-121, all on one phone screen) your stall drawn with every look
// you wear, the next thing you can unlock and icon buttons for the stamp book and the Wardrobe, in a row that swipes to
// your next two goals; then three mode cards you swipe (HomeCards.tsx): Play (opens the Play menu), the Market League
// and the Daily market with the Sprint, each with its own waiting game; and How to play, Settings and the account on the
// kraft strip at the foot. Play opens the Play menu (PlayMenu, below): every way to start a normal game on one screen.
// The look is the game table's (Market Ticket): booth.css for the parts the opening animates, journey-home.css and
// home-cards.css for the rest. The opening (Opening.tsx, "Lane Drop") plays on this screen: "hm-intro" on <html>
// animates the title and everything under the band (".hm-title", ".hm-rest") into place.
import { useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { RIVALS, type FruitId } from '../engine/data';
import type { GameState } from '../engine/game';
import { LOOKS, type Look } from '../net/looks';
import { CODE_LENGTH, normaliseCode } from '../net/protocol';
import { accountsAvailable, signedInAs } from './account';
import { Face } from './art';
import { useFocusTrap } from './focusTrap';
import { FruitSvg } from './fruitIcons';
import { ModeCards, PlayIcon, StallRow } from './HomeCards';
import { PropSprite, RoofBand } from './icons';
import { chosenColour, myAvatar, syncLooks, worn } from './looks';
import { LENGTHS, NORMAL_HEADING, computerLine, phoneLine, quickLine, roomLine } from './playMenu';
import { myPlace, snapshot, syncTiers } from './progress';
import { BackArrow, FramedFace, TrophyPic } from './stampCard';
import { goals, nextReward, type Goal } from './stamps';
import type { SaveSlot } from './store';
import { seatColour } from './table';
import './journey-home.css';

export interface ShopProps {
  /** PLAN-120: the saved game of each mode (store.ts), each shown on its own card. */
  games: Partial<Record<SaveSlot, GameState>>;
  today: string;
  notice: string | null;
  /** Continue on a card: the Continue question for that mode's game. */
  onContinue: (slot: SaveSlot) => void;
  /** Opens the Play page. */
  onPlay: () => void;
  /** PLAN-120: open the Daily intro for the Daily market, or for the Sprint. */
  onDaily: () => void;
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

/** The "Next …" line on your stall: the nearest goal that gives a look, else the next stall level's reward. */
function nextLine(): string | null {
  const g = goals(snapshot()).find((x) => goalLook(x));
  const look = g && goalLook(g);
  const next = nextReward(myPlace());
  return g && look ? `${look.title} · ${asPart(g.step.text)}`
    : next?.reward ? `Level ${next.level}: ${next.reward.text} · ${next.stamps} ${next.stamps === 1 ? 'stamp' : 'stamps'}` : null;
}

/** Your next two goals: the trophy tiers nearest to done, with what each gives. PLAN-121: the inside of the card that
 *  swipes with your stall (null when no goal is left). */
function goalsCard(): ComponentChildren | null {
  const two = goals(snapshot()).slice(0, 2);
  if (!two.length) return null;
  return (
    <div class="jh-goals">
      <div class="jh-ch"><span>Your next goals</span></div>
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
          <h1 class="hm-name">Fruit<br /> Market</h1>
          <span class="jh-lvl" aria-label={`Level ${place.level}, ${place.rank.name}`}><b>Level {place.level}</b><small>{place.rank.name}</small></span>
        </div>
        <div class="hm-rest">
          {p.notice && <p class="save-notice" role="status">{p.notice}</p>}
          {p.room && p.onRoom && (
            <button class="hm-tk hm-room jh-room" onClick={() => p.onRoom!(p.room!)}>
              <span class="hm-tk-ic"><PlayIcon /></span>
              <span class="hm-tk-txt"><small>Your online match</small><span>Back to room {p.room}</span></span>
            </button>
          )}
          <StallRow next={nextLine()} goals={goalsCard()} buttons={{ filled: place.filled, size: place.size, onTrophies: p.onTrophies, onWardrobe: p.onWardrobe }} />
          <ModeCards today={p.today} games={p.games} onContinue={p.onContinue} onPlay={p.onPlay} onLeague={p.onLeague} onDaily={p.onDaily} onSprint={p.onSprint} />
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
}

/**
 * PLAN-113: the Play menu, every way to start a normal game on one screen: the "Normal game" group (PLAN-119; a full
 * market your way: Quick match, a private room, joining with a code, a game against computers, one phone passed round,
 * the public rooms, and the length for a computer or one-phone game). Each says its real player count and length.
 * PLAN-120: the Market League, the Daily market and the Sprint left this page for cards of their own on Home.
 */
export function PlayMenu(p: PlayMenuProps) {
  const avatar = myAvatar();
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState('');
  const clean = normaliseCode(code);
  const ok = clean.length === CODE_LENGTH;
  const rivals = RIVALS.filter((r) => r.avatar !== avatar).slice(0, 3);
  return (
    <div class="page tk-page jp">
      <header class="topbar jp-bar">
        <button class="icon-btn" aria-label="Back" onClick={p.onBack}><BackArrow /></button>
        <div class="day"><b>Play</b></div>
        <span class="jp-me"><FramedFace who={avatar} size={34} look={worn()} /></span>
      </header>
      <main class="scroll jp-in">
        <section class="jp-grp" data-a="normal-game" aria-labelledby="jp-normal">
          <h2 class="jp-gh" id="jp-normal">{NORMAL_HEADING}</h2>
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
        </section>
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

