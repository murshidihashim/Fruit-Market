// The home screen. PLAN-124, "Shopfront and Board": three tabs in a bar at the foot (Stall, Market, Rules).
// - Market (Home itself): the four fruit lanes (the band the opening folds into), the title with your profile chip
//   (your framed face, name, level and rank; a gear for Settings; the rest opens the Stall tab), "Back to room" when an
//   online match is open, then one hero card for the chosen mode, the mode tabs (Custom, League, Daily, Sprint) and one
//   big Play button for that mode (Continue when its game is waiting). The pieces are in HomeCards.tsx.
// - Stall: your stall drawn with every look you wear, the stamp book and the Wardrobe, your next goals and the account.
// - Rules: How to play (HowTo.tsx) inside the tab.
// Custom match's Play opens the Play menu (PlayMenu, below): the four ways to start a normal game (PLAN-125).
// The look is the game table's (Market Ticket): booth.css for the parts the opening animates, journey-home.css and
// home-cards.css for the rest. The opening (Opening.tsx, "Lane Drop") plays on the Market tab: "hm-intro" on <html>
// animates the title and everything under the band into place (".hm-title", ".hm-rest").
import { useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { RIVALS, type FruitId } from '../engine/data';
import type { GameState } from '../engine/game';
import { LOOKS, type Look } from '../net/looks';
import { accountsAvailable, signedInAs } from './account';
import { Face } from './art';
import { useFocusTrap } from './focusTrap';
import { FruitSvg } from './fruitIcons';
import { fx } from './fx';
import { DESKTOP_MODE_NOTE, inDesktopMode } from './phoneFit';
import { HeroCard, ModeTabs, PlayButton, PlayIcon, YourStall, saveMode, startMode, type HomeMode } from './HomeCards';
import { HowTo } from './HowTo';
import { PropSprite, RoofBand } from './icons';
import { chosenColour, myAvatar, syncLooks, worn } from './looks';
import { NORMAL_HEADING, WAYS, computerLine, phoneLine, quickLine, roomLine, type PlayWay } from './playMenu';
import { myPlace, snapshot, syncTiers } from './progress';
import { BackArrow, FramedFace, TrophyPic } from './stampCard';
import { goals, nextReward, type Goal } from './stamps';
import { loadName, nameOrDefault, type SaveSlot } from './store';
import { seatColour } from './table';
import './journey-home.css';

/** PLAN-124: the three tabs of Home's bottom bar. */
export type HomeTab = 'stall' | 'market' | 'rules';

export interface ShopProps {
  /** PLAN-120: the saved game of each mode (store.ts), each shown on its own card. */
  games: Partial<Record<SaveSlot, GameState>>;
  today: string;
  notice: string | null;
  /** PLAN-124: the tab shown (App.tsx keeps it, so the browser's Back returns to Market). */
  tab: HomeTab;
  onTab: (t: HomeTab) => void;
  /** Continue: the Continue question for that mode's game. */
  onContinue: (slot: SaveSlot) => void;
  /** Opens the Play page (Custom match). */
  onPlay: () => void;
  /** PLAN-120: open the Daily intro for the Daily market, or for the Sprint. */
  onDaily: () => void;
  onSprint: () => void;
  onLeague: () => void;
  /** PLAN-124: the Custom match card's four ways, each straight to its own start. */
  onQuick: () => void;
  onPrivate: () => void;
  onComputer: () => void;
  onOnePhone: () => void;
  onWardrobe: () => void;
  onAccount: () => void;
  onTrophies: () => void;
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

/** The "Next …" line: the nearest goal that gives a look, else the next stall level's reward. PLAN-124: on the Custom
 *  match card ("Next: …") and on your stall. */
export function nextLine(): string | null {
  const g = goals(snapshot()).find((x) => goalLook(x));
  const look = g && goalLook(g);
  const next = nextReward(myPlace());
  return g && look ? `${look.title} · ${asPart(g.step.text)}`
    : next?.reward ? `Level ${next.level}: ${next.reward.text} · ${next.stamps} ${next.stamps === 1 ? 'stamp' : 'stamps'}` : null;
}

/** Your next goals: the trophy tiers nearest to done, with what each gives (nothing when no goal is left). PLAN-124: on
 *  the Stall tab, three of them. */
function GoalsCard() {
  const next = goals(snapshot()).slice(0, 3);
  if (!next.length) return null;
  return (
    <section class="jh-goals" aria-labelledby="jh-goals-h">
      <div class="jh-ch"><span id="jh-goals-h">Your next goals</span></div>
      {next.map((g) => {
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

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path fill="currentColor" fill-rule="evenodd" d="M10.3 1h3.4l.5 2.6c.6.2 1.2.5 1.7.9l2.5-.9 1.7 2.9-2 1.7a7 7 0 0 1 0 1.9l2 1.7-1.7 2.9-2.5-.9c-.5.4-1.1.7-1.7.9l-.5 2.6h-3.4l-.5-2.6a7 7 0 0 1-1.7-.9l-2.5.9-1.7-2.9 2-1.7a7 7 0 0 1 0-1.9l-2-1.7 1.7-2.9 2.5.9c.5-.4 1.1-.7 1.7-.9zM12 7.6a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8z" transform="translate(0 2)" />
    </svg>
  );
}

/** PLAN-124: your profile chip beside the title: your framed face, name, level and rank (a tap opens the Stall tab) and
 *  a gear for Settings. */
function ProfileChip({ onStall, onSettings }: { onStall: () => void; onSettings: () => void }) {
  const place = myPlace();
  const name = nameOrDefault(loadName());
  return (
    <div class="jh-prof">
      <button class="jh-pmain" data-a="profile" aria-label={`${name}, level ${place.level}, ${place.rank.name}. Open your stall`} onClick={onStall}>
        <span class="jh-pface"><FramedFace who={myAvatar()} size={32} look={worn()} /></span>
        <span class="jh-ptx"><b><span class="jh-pnm">{name}</span><span class="jh-plv">&nbsp;· Lvl {place.level}</span></b><small>{place.rank.name}</small></span>
      </button>
      <button class="jh-gear" data-a="settings" aria-label="Settings" onClick={onSettings}><GearIcon /></button>
    </div>
  );
}

/** The bottom bar's line icons: a stall (an awning over a counter), the market (a shopfront), the rules (an open book). */
const NAV_ICON: Record<HomeTab, ComponentChildren> = {
  stall: <path d="M3 9h18M4 9l1.5-5h13L20 9M6 9v11M18 9v11M4 20h16M9 15h6" />,
  market: <path d="M3 10l2-6h14l2 6M3 10c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3M5 13v7h14v-7M10 20v-5h4v5" />,
  rules: <path d="M12 6c-2-1.5-5-2-9-2v14c4 0 7 .5 9 2 2-1.5 5-2 9-2V4c-4 0-7 .5-9 2zM12 6v14" />,
};
const NAV: { id: HomeTab; label: string }[] = [{ id: 'stall', label: 'Stall' }, { id: 'market', label: 'Market' }, { id: 'rules', label: 'Rules' }];

/** PLAN-124: Home's bottom bar: Stall, Market and Rules, the tab shown shaded. */
export function HomeNav({ tab, onTab }: { tab: HomeTab; onTab: (t: HomeTab) => void }) {
  return (
    <nav class="jh-nav3" aria-label="Home">
      {NAV.map((n) => (
        <button class={tab === n.id ? 'on' : ''} data-nav={n.id} aria-current={tab === n.id ? 'page' : undefined} onClick={() => onTab(n.id)}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">{NAV_ICON[n.id]}</svg>
          <span>{n.label}</span>
        </button>
      ))}
    </nav>
  );
}

const MODE_GO: Record<HomeMode, (p: ShopProps) => () => void> = { custom: (p) => p.onPlay, league: (p) => p.onLeague, daily: (p) => p.onDaily, sprint: (p) => p.onSprint };

/** The Market tab: the title and your profile chip, the hero card, the mode tabs and the Play button. */
function MarketTab(p: ShopProps) {
  const [mode, setMode] = useState<HomeMode>(() => startMode(p.games));
  const pick = (m: HomeMode) => { if (m !== mode) fx.tap(); saveMode(m); setMode(m); };
  return (
    <div class="home hm jh jh-market">
      <div class="hm-in">
        <LaneBand />
        <div class="hm-title jh-top">
          <h1 class="hm-name">Fruit<br /> Market</h1>
          <ProfileChip onStall={() => p.onTab('stall')} onSettings={p.onSettings} />
        </div>
        {inDesktopMode() && <p class="save-notice jh-desk" role="status">{DESKTOP_MODE_NOTE}</p>}
        <div class="hm-rest">
          {p.notice && <p class="save-notice" role="status">{p.notice}</p>}
          {p.room && p.onRoom && (
            <button class="hm-tk hm-room jh-room" onClick={() => p.onRoom!(p.room!)}>
              <span class="hm-tk-ic"><PlayIcon /></span>
              <span class="hm-tk-txt"><small>Your online match</small><span>Back to room {p.room}</span></span>
            </button>
          )}
          <HeroCard mode={mode} today={p.today} games={p.games} next={nextLine()} onQuick={p.onQuick} onRoom={p.onPrivate} onComputer={p.onComputer} onOnePhone={p.onOnePhone} />
          <ModeTabs at={mode} games={p.games} onPick={pick} />
          <PlayButton mode={mode} games={p.games} onPlay={MODE_GO[mode](p)} onContinue={p.onContinue} />
        </div>
      </div>
    </div>
  );
}

/** The Stall tab: your stall with its looks, the stamp book and the Wardrobe, your next goals and the account. */
function StallTab(p: ShopProps) {
  const me = signedInAs();
  const place = myPlace();
  return (
    <div class="home hm jh jh-stalltab">
      <div class="hm-in">
        <LaneBand />
        <div class="hm-title jh-top">
          <h1 class="hm-name">Your<br /> stall</h1>
          <ProfileChip onStall={() => p.onTab('stall')} onSettings={p.onSettings} />
        </div>
        <div class="hm-rest">
          <YourStall next={nextLine()} buttons={{ filled: place.filled, size: place.size, onTrophies: p.onTrophies, onWardrobe: p.onWardrobe }} />
          <GoalsCard />
          {accountsAvailable() && <button class="jh-go2 jh-acct" data-a="account" onClick={p.onAccount}>{me ? `Hi, ${me}` : 'Account'}</button>}
        </div>
      </div>
    </div>
  );
}

export function Shopfront(p: ShopProps) {
  // What is stored is brought up to date as the game opens: the tiers a player from before the stamp book has already
  // reached, and the looks their trophies and stall level give. Nothing is ever taken away.
  useState(() => { syncTiers(); syncLooks(); });
  return (
    <div class={`jh-shell jh-on-${p.tab}`}>
      {p.tab === 'rules' ? <HowTo inTab onDone={() => p.onTab('market')} /> : p.tab === 'stall' ? <StallTab {...p} /> : <MarketTab {...p} />}
      <HomeNav tab={p.tab} onTab={p.onTab} />
    </div>
  );
}

export interface PlayMenuProps {
  onBack: () => void;
  onQuick: () => void;
  onRoom: () => void;
  onComputer: () => void;
  onOnePhone: () => void;
}

/**
 * PLAN-113: the Play page, every way to start a normal game on one screen: the "Custom match" group (PLAN-119; PLAN-124
 * renamed it from "Normal game"). PLAN-125 (DEC-133): the four ways, as on Home's Custom card: Quick Match (Public
 * rooms are on its page), Private Room (joining with a code is on its page), Computer and Pass & Play. Each says its real
 * player count; the game length is chosen on each way's own page. PLAN-120: the Market League, the Daily market and the
 * Sprint have cards of their own on Home.
 */
export function PlayMenu(p: PlayMenuProps) {
  const avatar = myAvatar();
  const rivals = RIVALS.filter((r) => r.avatar !== avatar).slice(0, 3);
  const go: Record<PlayWay, () => void> = { quick: p.onQuick, room: p.onRoom, computer: p.onComputer, phone: p.onOnePhone };
  const line: Record<PlayWay, string> = { quick: quickLine(), room: roomLine(), computer: computerLine(), phone: phoneLine() };
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
          {WAYS.map((w) => (
            <button class={`jp-tile wide jp-way jp-${w.id}`} data-a={w.id} onClick={go[w.id]}>
              <span class="jp-tt"><b>{w.name}</b><span>{line[w.id]}</span></span>
              {w.id === 'quick' && <span class="jp-vs" aria-hidden="true"><Face who={avatar} size={40} /><i>vs</i><span class="jp-q">?</span></span>}
              {w.id === 'computer' && <span class="jp-faces" aria-hidden="true">{rivals.map((r) => <Face who={r.avatar} size={26} />)}</span>}
            </button>
          ))}
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

