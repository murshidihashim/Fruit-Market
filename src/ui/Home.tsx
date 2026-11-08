// The home screen (DEC-071): the Market square. A street of stalls under the sunburst, the title on a sign hanging
// from the bunting, the lorry parked on the road, and the menu painted on wooden signboards on the cobbles below.
// The opening (Opening.tsx, DEC-072) plays on this very screen: it only adds the "sq-intro" class that animates it in.
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { RIVALS } from '../engine/data';
import { fetchDaily, type BoardResult } from '../net/daily';
import { CODE_LENGTH, normaliseCode } from '../net/protocol';
import { accountsAvailable, signedInAs } from './account';
import { shopBadge, shopFile } from './deckArt';
import { lorryUrl, wearUrl } from './exchangeArt';
import { wornParts } from './looks';
import { KEEPERS, marketScene, type Layer, type Stall } from './marketArt';
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

/** Wide screens get the six-stall street and a single row of signboards (the same width as the desktop game). */
const WIDE = '(min-width: 900px)';
function useWide(): boolean {
  const mq = typeof matchMedia === 'undefined' ? null : matchMedia(WIDE);
  const [wide, setWide] = useState(() => !!mq?.matches);
  useEffect(() => {
    if (!mq) return;
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

export function Shopfront(p: ShopProps) {
  const me = signedInAs();
  const wide = useWide();
  return (
    <div class={`home cosy front sq${wide ? ' sq-wide' : ''}`}>
      <header class="sq-head">
        <div class="sq-hang">
          <div class="sq-tags">
            {accountsAvailable() && <button class="cover-account sq-tag" onClick={p.onAccount}>{me ? `Hi, ${me}` : 'Create account'}</button>}
            <button class="cover-dress sq-tag" onClick={p.onWardrobe}>Dress up</button>
          </div>
          <div class="sq-sign">
            <Bunting wide={wide} />
            <div class="sq-plank">
              <div class="sq-board">
                <h1 class="x-title">Fruit Market</h1>
                <p>Where the whole world shops</p>
                <p class="hm-secret">…and every price is a secret</p>
              </div>
            </div>
          </div>
        </div>
      </header>
      <MarketScene wide={wide} />
      <div class="sq-menu hm-actions">
        {p.notice && <p class="save-notice" role="status">{p.notice}</p>}
        <div class={`sq-grid${p.resume ? ' has-cont' : ''}`}>
          <button class="front-tile pri sq-b sq-new" onClick={p.onNew}><PlusIcon /><span>New game</span></button>
          <button class="front-tile tl sq-b sq-friend" onClick={p.onFriend}><PeopleIcon /><span>Play a friend</span></button>
          {p.resume && <button class="front-continue sq-b sq-cont" onClick={p.onContinue}><PlayIcon /><span>Continue<span class="sq-vh"> · </span><small>{p.resume}</small></span></button>}
          <button class="front-tile sq-b sq-daily" onClick={p.onDaily}><DailyIcon /><span>Daily market<small>{p.dailyLine}</small></span></button>
          <button class="front-tile sq-b sq-league" onClick={p.onLeague}><TrophyIcon /><span>Market League<small>{p.leagueLine}</small></span></button>
        </div>
        <DailyPeek date={p.today} />
        <div class="front-foot sq-foot">
          <button class="sq-b" onClick={p.onTrophies}>Trophies</button>
          <button class="sq-b" onClick={p.onHowTo}>How to play</button>
          <button class="sq-b" onClick={p.onSettings}>Settings</button>
        </div>
      </div>
    </div>
  );
}

/** The rail under the top tags, with two strings of bunting. Drawn past both edges for screens wider than the drawing. */
function Bunting({ wide }: { wide: boolean }) {
  const w = wide ? 1120 : 390, mid = w / 2;
  const cols = [[C.xRed, C.xPaper, C.xGreen], [C.xMustard, C.xPaper, C.xSkyDark]];
  const strings: [number, number, string[]][] = [];
  // Each string hangs between two hooks; extra strings run off both sides.
  for (let a = -w; a < w * 2; a += mid) strings.push([a + 4, a + mid - 4, cols[strings.length % 2]]);
  return (
    <svg class="sq-bunting" viewBox={`0 0 ${w} 34`} preserveAspectRatio="xMidYMin meet" aria-hidden="true">
      <rect x={-w} y="1" width={w * 3} height="13" fill={C.xWoodDark} stroke={C.xInk} stroke-width="3" />
      {strings.map(([x1, x2, c], s) => {
        const cnt = Math.round((x2 - x1) / 31), sag = 4;
        return (
          <g key={s}>
            <path d={`M${x1} 14Q${(x1 + x2) / 2} ${14 + sag * 2} ${x2} 14`} class="sq-rope" stroke={C.xInk} stroke-width="2" fill="none" />
            {Array.from({ length: cnt }, (_, i) => {
              const t = (i + 0.5) / cnt, px = x1 + (x2 - x1) * t, py = 14 + sag * 4 * t * (1 - t);
              return <path class="sq-pen" style={`--j:${i}`} d={`M${Math.round(px - 8)} ${Math.round(py)}h16l-8 15Z`} fill={c[i % 3]} stroke={C.xInk} stroke-width="1.8" stroke-linejoin="round" />;
            })}
          </g>
        );
      })}
    </svg>
  );
}

const pic = (l: Layer, cls?: string, style?: string) => <image class={cls} style={style} href={l.url} x={l.x} y={l.y} width={l.w} height={l.h} />;

/** The street: stalls (each shopkeeper at their own), the road and the lorry. Your shopkeeper wears your looks. */
function MarketScene({ wide }: { wide: boolean }) {
  const sc = marketScene(wide);
  const mine = shopFile(myAvatar());
  const parts = wornParts();
  const wear = mine && parts.length ? wearUrl(mine, parts) : null;
  const all = [...sc.backRow, ...sc.frontRow].sort((a, b) => a.back.x - b.back.x);
  const order = (s: Stall) => all.indexOf(s);
  const stall = (s: Stall, id: string) => {
    const f = s.face, k = f ? KEEPERS.indexOf(f.keeper as (typeof KEEPERS)[number]) : -1;
    const badge = k >= 0 ? shopBadge(RIVALS[k].avatar) : null;
    return (
      <g class="sq-st" style={`--i:${order(s)}`}>
        {pic(s.back)}
        {f && badge && (
          <>
            <clipPath id={id}><circle cx={f.cx} cy={f.cy} r={f.r} /></clipPath>
            <image href={badge} x={f.cx - f.r} y={f.cy - f.r} width={f.r * 2} height={f.r * 2} clip-path={`url(#${id})`} preserveAspectRatio="xMidYMid slice" />
            <circle cx={f.cx} cy={f.cy} r={f.r} fill="none" stroke={C.xInk} stroke-width="2" />
            {wear && f.keeper === mine && <image href={wear} x={f.cx - f.r * 1.2} y={f.cy - f.r * 1.2} width={f.r * 2.4} height={f.r * 2.6} />}
          </>
        )}
        {pic(s.fruit, 'sq-sf', `--fx:${s.toss.x}px;--fy:${s.toss.y}px`)}
        {pic(s.counter)}
        {pic(s.awning, 'sq-sa')}
      </g>
    );
  };
  // Fill the street's height where there is room, trimming a little off both sides rather than leaving a gap above
  // the stalls; never trim more than MAX_TRIM (the outer shopkeepers stay in view). Wider boxes show the drawing's
  // extensions past its edges instead.
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<[number, number] | null>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setSize([el.clientWidth, el.clientHeight]));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const v = sc.view, L = sc.lorry;
  const vw = size && size[1] > 0 ? Math.min(v.w, Math.max(v.w * (wide ? 0.9 : 0.85), (v.h * size[0]) / size[1])) : v.w;
  return (
    <div class="sq-scene" ref={box} aria-hidden="true">
      <svg class="sq-svg" viewBox={`${Math.round(v.x + (v.w - vw) / 2)} ${v.y} ${Math.round(vw)} ${v.h}`} preserveAspectRatio="xMidYMax meet">
        {pic(sc.backdrop)}
        {sc.backRow.map((s, i) => stall(s, `sq-b${wide ? 'w' : 'p'}${i}`))}
        {pic(sc.road)}
        {sc.frontRow.map((s, i) => stall(s, `sq-f${wide ? 'w' : 'p'}${i}`))}
        {sc.marks && pic(sc.marks, 'sq-marks')}
        <rect class="sq-bed" x={sc.bed.x} y={sc.bed.y} width={sc.bed.w} height={sc.bed.h} fill="none" />
        <g class="sq-lmove">
          <g class="sq-lrock">
            <image href={lorryUrl(0)} x={L.x} y={L.y} width={L.w} height={L.h} />
            <image class="sq-lb" href={lorryUrl(1)} x={L.x} y={L.y} width={L.w} height={L.h} opacity="0" />
          </g>
        </g>
      </svg>
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

// Engraved signboard icons: brass and navy, like the Exchange drawings.
const ink = { stroke: C.xInk, 'stroke-width': 1.8, 'stroke-linejoin': 'round' } as const;
function PlusIcon() {
  return <svg class="sq-ic" viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><circle cx="12" cy="12" r="10" fill={C.xMustard} {...ink} stroke-width="2" /><path d="M12 7v10M7 12h10" stroke={C.xInk} stroke-width="2.6" stroke-linecap="round" /></svg>;
}

function PeopleIcon() {
  return <svg class="sq-ic" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><circle cx="8.5" cy="8" r="3.6" fill={C.xMustard} {...ink} /><circle cx="16" cy="9" r="3.1" fill={C.xMustard} {...ink} /><path d="M2 21q0-7 6.5-7t6.5 7Z" fill={C.xMustard} {...ink} /><path d="M15 21q0-6 4-6t4 6Z" fill={C.xMustard} {...ink} /></svg>;
}

function PlayIcon() {
  return <svg class="sq-ic" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><circle cx="12" cy="12" r="10" fill={C.xPaper} {...ink} stroke-width="2" /><path d="M10 7.5l6 4.5-6 4.5Z" fill={C.xRed} {...ink} stroke-width="1.6" /></svg>;
}

function DailyIcon() {
  return <svg class="sq-ic" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2" fill={C.xPaper} {...ink} /><path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3H3Z" fill={C.xRed} {...ink} /><path d="M8 2v4M16 2v4" stroke={C.xInk} stroke-width="2" stroke-linecap="round" /><circle cx="12" cy="15" r="3" fill={C.xMustard} {...ink} stroke-width="1.6" /></svg>;
}

function TrophyIcon() {
  return <svg class="sq-ic" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M6 3h12v5q0 6-6 7-6-1-6-7Z" fill={C.xMustard} {...ink} /><path d="M6 5H3q0 5 4 6M18 5h3q0 5-4 6" stroke={C.xInk} stroke-width="1.6" fill="none" /><path d="M10 15h4v3h-4Z" fill={C.xMustardDark} {...ink} stroke-width="1.6" /><rect x="6.5" y="18" width="11" height="3.5" rx="1" fill={C.xWood} {...ink} stroke-width="1.6" /></svg>;
}
