// PLAN-125 (DEC-133), design B, "the deck": the one-page set-up for a game on this phone (Computer, Pass & Play) and the
// parts the online screens share with it (Online.tsx: the Quick Match set-up and wait, the Private Room, the pick screen).
// - The page: the four fruit lanes, a header (a square back button, the mode's name, a line under it), then the body.
// - The deck: the shopkeeper being chosen, selected, in the middle, the next and previous cards peeking at the sides.
//   Swipe it, use the ‹ › buttons or the arrow keys. The row between the arrows holds the name ("Mblabla · swipe to
//   choose"); a tap on the middle card opens it whole.
// - The table: each other stall as a small card made from the card parts (the label line, the rule, the name, the
//   picture, a coloured band), and the open stalls as dashed cards.
// - A segmented choice (the chosen part ink with yellow words) for the game length and Quick Match's table size, and one
//   big yellow button at the foot.
// The look is the Home's (PLAN-124): ink edges, paper, mustard actions, square corners. Styles: setup.css.
import { useMemo, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { RIVALS } from '../engine/data';
import type { GameConfig, Level, PlayerConfig } from '../engine/game';
import { Face } from './art';
import { CardArt, StallSign } from './cards';
import { CardPop } from './cardZoom';
import { shopFocus, shopScene } from './deckArt';
import { fx } from './fx';
import { LENGTHS, wayLine, wayName, type PlayWay } from './playMenu';
import { BackArrow, FramedFace } from './stampCard';
import { myAvatar } from './looks';
import { loadName, saveName } from './store';
import type { LookSet } from '../net/looks';
import './setup.css';

const N = RIVALS.length;
const keeperName = (avatar: string) => RIVALS.find((r) => r.avatar === avatar)?.name ?? 'Shopkeeper';
const cx = (...parts: (string | false | undefined | null)[]) => parts.filter(Boolean).join(' ');

/** The four fruit lanes across the top of the page, in the game's order and colours. */
function Lanes() {
  return <div class="sb-lanes" aria-hidden="true"><i class="ln-blueberry" /><i class="ln-watermelon" /><i class="ln-mango" /><i class="ln-apple" /></div>;
}

/** A design B page: the lanes, the header and the body. `foot` stays at the foot of the page (the big button). */
export function SbPage({ title, sub, onBack, backLabel = 'Back', right, foot, class: cls, children }: {
  title: string; sub?: string; onBack: () => void; backLabel?: string; right?: ComponentChildren; foot?: ComponentChildren; class?: string; children: ComponentChildren;
}) {
  return (
    <div class={cx('page', 'sb', cls)}>
      <Lanes />
      <header class="sb-hd">
        <button type="button" class="sb-back" aria-label={backLabel} onClick={onBack}><BackArrow /></button>
        <div class="sb-tt"><h1>{title}</h1>{sub && <small>{sub}</small>}</div>
        {right}
      </header>
      <main class="sb-main">
        {children}
        {foot && <div class="sb-foot">{foot}</div>}
      </main>
    </div>
  );
}

/** A small spaced label over a part of the page ("The table"). */
export const SbLabel = ({ children, right }: { children: ComponentChildren; right?: ComponentChildren }) => (
  <div class="sb-lb"><span>{children}</span>{right}</div>
);

/** A segmented choice: the chosen part is ink with yellow words. */
export function Seg<T extends string | number>({ label, items, value, onPick, disabled }: {
  label: string; items: { v: T; word: string; small?: string }[]; value: T; onPick: (v: T) => void; disabled?: boolean;
}) {
  return (
    <div class="sb-seg" role="group" aria-label={label}>
      {items.map((it) => (
        <button type="button" class={it.v === value ? 'on' : ''} aria-pressed={it.v === value} disabled={disabled}
          onClick={() => { if (it.v !== value) { fx.tap(); onPick(it.v); } }}>
          {it.word}{it.small && <small>{it.small}</small>}
        </button>
      ))}
    </div>
  );
}

/** The game length, as a segmented choice. */
export function LengthSeg({ days, onDays, disabled }: { days: number; onDays: (d: 8 | 10 | 14) => void; disabled?: boolean }) {
  return (
    <section class="sb-sec">
      <SbLabel>Game length</SbLabel>
      <Seg label="Game length" items={LENGTHS.map((l) => ({ v: l.days, word: l.word, small: `${l.days} days` }))} value={days as 8 | 10 | 14} onPick={onDays} disabled={disabled} />
    </section>
  );
}

/** The big yellow button at the foot of a page. */
export function SbGo({ onClick, disabled, class: cls, a, children }: { onClick: () => void; disabled?: boolean; class?: string; a?: string; children: ComponentChildren }) {
  return <button type="button" class={cx('sb-go', cls)} data-a={a} disabled={disabled} onClick={onClick}>{children}</button>;
}

/**
 * The deck of shopkeeper cards. `value` is the card in the middle. `taken` maps a shopkeeper to the name of the stall
 * that has it (its card says "Taken by …", and the arrows pass over it). `chosen` (the online pick screen, where looking
 * does not take): the card this player has, marked instead of the middle one. `fixed`: the choice is final, the deck
 * stays put. `name`: the row between the arrows; with `onName` the name can be typed there.
 */
export function Deck({ value, taken = {}, chosen, fixed, onPick, name, onName, nameLabel = 'Your name', who = 'your' }: {
  value: string; taken?: Record<string, string>; chosen?: string; fixed?: boolean; onPick: (avatar: string) => void;
  name: string; onName?: (n: string) => void; nameLabel?: string; who?: string;
}) {
  const at = Math.max(0, RIVALS.findIndex((r) => r.avatar === value));
  const [dx, setDx] = useState(0);
  const [drag, setDrag] = useState(false);
  const x0 = useRef(0);
  const moved = useRef(false);
  const [zoom, setZoom] = useState(false);
  const go = (d: number) => {
    if (fixed) return;
    let k = at;
    for (let n = 0; n < N; n++) { k = (k + d + N) % N; if (!taken[RIVALS[k].avatar]) break; }
    if (k !== at) { fx.tap(); onPick(RIVALS[k].avatar); }
  };
  const end = () => {
    if (!drag) return;
    setDrag(false); setDx(0);
    if (fixed) return;
    if (dx < -40) go(1); else if (dx > 40) go(-1);
  };
  const shown = RIVALS[at];
  return (
    <section class="sb-deckbox">
      <div class="sb-deck" role="group" tabIndex={0} aria-roledescription="deck" aria-label={`Choose ${who} shopkeeper`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
          else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
          else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fx.tap(); setZoom(true); }
        }}
        onPointerDown={(e) => { moved.current = false; if (fixed) return; x0.current = e.clientX; setDrag(true); setDx(0); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); }}
        onPointerMove={(e) => { if (!drag) return; const d = e.clientX - x0.current; if (Math.abs(d) > 8) moved.current = true; setDx(d); }}
        onPointerUp={end} onPointerCancel={end}
        onClick={() => { if (moved.current) return; fx.tap(); setZoom(true); }}>
        {RIVALS.map((r, k) => {
          let o = k - at;
          if (o > N / 2) o -= N;
          if (o < -N / 2) o += N;
          const near = Math.abs(o) <= 1;
          return (
            <div class={cx('sb-dcard', o === 0 && 'on', !near && 'far')} aria-hidden={o !== 0}
              style={{ transform: `translateX(calc(${o * 100}% + ${o * 10}px + ${dx}px)) scale(${o === 0 ? 1 : 0.86})`, zIndex: 10 - Math.abs(o), transition: drag ? 'none' : undefined }}>
              <StallSign avatar={r.avatar} selected={chosen === undefined ? o === 0 && !taken[r.avatar] : r.avatar === chosen} takenBy={taken[r.avatar]} eager={near} />
            </div>
          );
        })}
        <span class="sb-sr" aria-live="polite">{`${shown.name}${taken[shown.avatar] ? `, taken by ${taken[shown.avatar]}` : ''}`}</span>
      </div>
      <div class="sb-nav">
        {!fixed && <button type="button" class="sb-arrow" aria-label="Previous shopkeeper" onClick={() => go(-1)}>‹</button>}
        <div class="sb-nm">
          {onName
            ? <input class="sb-name" aria-label={nameLabel} value={name} maxLength={14} placeholder="Your name" autocomplete="off" spellcheck={false}
                style={{ width: `${Math.max(5, Math.min(14, (name || 'Your name').length + 1))}ch` }}
                onInput={(e) => onName((e.target as HTMLInputElement).value)} />
            : <b>{name}</b>}
          <span>{fixed ? ' · chosen' : ' · swipe to choose'}</span>
        </div>
        {!fixed && <button type="button" class="sb-arrow" aria-label="Next shopkeeper" onClick={() => go(1)}>›</button>}
      </div>
      {zoom && (
        <CardPop title={shown.name} wide onClose={() => setZoom(false)}>
          <StallSign avatar={shown.avatar} takenBy={taken[shown.avatar]} eager />
        </CardPop>
      )}
    </section>
  );
}

/** A band colour on a small card: y yellow (a level, you), b blue (a person), k ink. */
export type Band = 'y' | 'b' | 'k';

/**
 * A stall at the table as a small card, made from the card parts: the label line ("Shopkeeper", "Seat 3"), the rule, the
 * name, the picture (the shopkeeper's stall, or a plain face before one is chosen) and a coloured band with a small word
 * and a big one ("Level · Normal", "Person · Aisyah"). With `onClick` the card is a button; `onRemove` adds a small ×.
 */
export function SeatCard({ top, title, avatar, face, look, band, small, big, label, onClick, pressed, selected, onRemove, removeLabel, class: cls, seat }: {
  top: string; title: string; avatar?: string; face?: string; look?: LookSet; band: Band; small: string; big: string; label?: string;
  onClick?: () => void; pressed?: boolean; selected?: boolean; onRemove?: () => void; removeLabel?: string; class?: string; seat?: number;
}) {
  const art = avatar ? shopScene(avatar) : null;
  const body = (
    <>
      <span class="sb-ctop">{top}</span>
      <i class="sb-crule" />
      <b class="sb-cttl">{title}</b>
      <span class="sb-cpic">
        {art && avatar ? <CardArt src={art} alt="" w={600} h={400} focus={shopFocus(avatar)} eager />
          : <span class="sb-cface"><PlainFace who={face ?? ''} look={look} /></span>}
      </span>
      <span class={`sb-cband b-${band}`}><small>{small}</small><b>{big}</b></span>
    </>
  );
  return (
    <div class={cx('sb-card', selected && 'on', cls)} data-seat={seat}>
      {onClick
        ? <button type="button" class="sb-cin" aria-label={label} aria-pressed={pressed} onClick={onClick}>{body}</button>
        : <div class="sb-cin" role={label ? 'img' : undefined} aria-label={label}>{body}</div>}
      {onRemove && <button type="button" class="sb-x" aria-label={removeLabel ?? `Remove ${title}`} onClick={(e) => { e.stopPropagation(); fx.tap(); onRemove(); }}>×</button>}
    </div>
  );
}

/** An open stall: a dashed card with a big mark ("?", "+", "Open") and a line under it. Its children are buttons. */
export function OpenCard({ top, big, small, onClick, label, children, class: cls }: {
  top: string; big: string; small: string; onClick?: () => void; label?: string; children?: ComponentChildren; class?: string;
}) {
  const body = <><span class="sb-ctop">{top}</span><i class="sb-crule" /><span class="sb-obig">{big}</span><small class="sb-osm">{small}</small></>;
  return (
    <div class={cx('sb-card', 'open', cls)}>
      {onClick ? <button type="button" class="sb-cin" aria-label={label} onClick={onClick}>{body}</button> : <div class="sb-cin">{body}{children}</div>}
    </div>
  );
}

/** The row of small cards: at least four columns, so the cards keep their size whatever the count. */
export function TableRow({ count, children, wrap }: { count: number; children: ComponentChildren; wrap?: boolean }) {
  return <div class={cx('sb-row', wrap && 'wrap')} style={{ '--n': wrap ? 3 : Math.max(4, count) }}>{children}</div>;
}

// ---------------------------------------------------------------------------------------------------------------------
// The set-up for a game on this phone: Computer and Pass & Play.

interface Seat { kind: 'human' | 'ai'; level: Level; name: string; avatar?: string }
/** Rival stalls: up to 5, so 6 stalls with you (rules 11). */
export const MAX_RIVALS = 5;
export const LEVEL_WORD: Record<Level, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };
const NEXT_LEVEL: Record<Level, Level> = { easy: 'normal', normal: 'hard', hard: 'easy' };

/**
 * The shopkeepers at the table: you and each person on this phone have a different one (a person who has not chosen
 * gets the first free one); the computers take shopkeepers from those left, in `order` (shuffled once per visit, so
 * the cards on screen are the shopkeepers the game is played with).
 */
export function seatShopkeepers(mine: string, seats: { kind: 'human' | 'ai'; avatar?: string }[], order: string[]): string[] {
  const used = new Set<string>([mine]);
  const out: string[] = seats.map(() => '');
  seats.forEach((st, i) => {
    if (st.kind !== 'human') return;
    const a = st.avatar && RIVALS.some((r) => r.avatar === st.avatar) && !used.has(st.avatar) ? st.avatar : RIVALS.find((r) => !used.has(r.avatar))?.avatar ?? '';
    out[i] = a;
    used.add(a);
  });
  const pool = order.filter((a) => !used.has(a));
  seats.forEach((st, i) => { if (st.kind === 'ai') out[i] = pool.shift() ?? ''; });
  return out;
}

/** "4 stalls" for the table's label. */
export const stallsWord = (n: number) => `${n} stalls`;

/**
 * PLAN-125: the set-up for a game on this phone, on one page. `mode` 'computer' starts with three computers; 'phone'
 * (Pass & Play) with a second person. `days` is the length chosen last.
 */
export function LocalSetup({ mode, days: days0 = 10, onBack, onStart }: { mode: Extract<PlayWay, 'computer' | 'phone'>; days?: number; onBack: () => void; onStart: (c: GameConfig, days: number) => void }) {
  const phone = mode === 'phone';
  const [name, setName] = useState(loadName());
  const [myChar, setMyChar] = useState<string>(myAvatar);
  const [seats, setSeats] = useState<Seat[]>(() => phone
    ? [{ kind: 'human', level: 'normal', name: 'Player 2' }]
    : [{ kind: 'ai', level: 'easy', name: '' }, { kind: 'ai', level: 'normal', name: '' }, { kind: 'ai', level: 'normal', name: '' }]);
  const [days, setDays] = useState(days0);
  // Whose shopkeeper and name the deck shows: you (null), or a person's seat on this phone.
  const [active, setActive] = useState<number | null>(null);
  const order = useMemo(() => RIVALS.map((r) => r.avatar).sort(() => Math.random() - 0.5), []);
  const keepers = seatShopkeepers(myChar, seats, order);
  const people = seats.filter((s) => s.kind === 'human').length;
  const seatName = (i: number) => seats[i].name.trim() || `Player ${i + 2}`;
  // S8 (PLAN-110): with people on this phone a blank name is "Player 1", as theirs are "Player 2" and on. Alone, "You".
  const myName = () => name.trim() || (people > 0 ? 'Player 1' : 'You');
  const setSeat = (i: number, patch: Partial<Seat>) => setSeats((ss) => ss.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const renumber = (ss: Seat[]) => ss.map((x, k) => (x.kind === 'human' && (!x.name || /^Player \d+$/.test(x.name)) ? { ...x, name: `Player ${k + 2}` } : x));
  const add = (kind: 'human' | 'ai') => {
    if (seats.length >= MAX_RIVALS) return;
    fx.tap();
    setSeats((ss) => renumber([...ss, { kind, level: 'normal', name: '' }]));
  };
  const remove = (i: number) => {
    if (seats.length <= 1) return;
    setSeats((ss) => renumber(ss.filter((_, k) => k !== i)));
    setActive((a) => (a === null || a === i ? null : a > i ? a - 1 : a));
  };

  // The deck shows the shopkeeper of whoever is chosen; the cards the other people have are taken.
  const editing = active !== null && seats[active]?.kind === 'human' ? active : null;
  const deckValue = editing === null ? myChar : keepers[editing];
  const taken: Record<string, string> = {};
  if (editing !== null) taken[myChar] = myName();
  seats.forEach((st, i) => { if (st.kind === 'human' && i !== editing) taken[keepers[i]] = seatName(i); });

  const begin = () => {
    saveName(name.trim());
    // PLAN-113: the shopkeeper you play is the one Home shows at your stall (the same key the online screens keep).
    try { localStorage.setItem('fm.avatar', myChar); } catch { /* no storage: Home shows the first shopkeeper */ }
    const players: PlayerConfig[] = [
      { name: myName(), kind: 'human', avatar: myChar },
      ...seats.map((st, i): PlayerConfig => {
        if (st.kind === 'human') return { name: seatName(i), kind: 'human', avatar: keepers[i] };
        const r = RIVALS.find((x) => x.avatar === keepers[i]) ?? RIVALS[0];
        return { name: r.name, kind: 'ai', level: st.level, avatar: r.avatar, quip: r.quip };
      }),
    ];
    // The full game, always (owner, PLAN-063): event cards, stall upgrades, unripe fruit and Market Days on; the
    // beginner and expert playtest options (PLAN-015: basic game, fixed prices, price drift) off.
    onStart({ players, days, unripe: true, upgrades: true, events: true, marketDays: true, core: false, street: false, pulse: false, seed: (Math.random() * 2 ** 31) >>> 0 }, days);
  };

  const open = seats.length < MAX_RIVALS;
  const stall = seats.length + 2;
  return (
    <SbPage title={wayName(mode)} sub={wayLine(mode)} onBack={onBack} class={`sb-local sb-${mode}`}
      foot={<SbGo a="start" onClick={() => { fx.card(); begin(); }}>Start game</SbGo>}>
      <Deck value={deckValue} taken={taken} who={editing === null ? 'your' : `${seatName(editing)}'s`}
        onPick={(a) => (editing === null ? setMyChar(a) : setSeat(editing, { avatar: a }))}
        name={editing === null ? name : seats[editing].name} nameLabel={editing === null ? 'Your name' : `Name for stall ${editing + 2}`}
        onName={(v) => (editing === null ? setName(v) : setSeat(editing, { name: v }))} />
      <section class="sb-sec">
        <SbLabel right={editing !== null ? <button type="button" class="sb-link" onClick={() => { fx.tap(); setActive(null); }}>Back to you</button> : undefined}>
          {`The table · ${stallsWord(seats.length + 1)}`}
        </SbLabel>
        <TableRow count={seats.length + (open ? 1 : 0)}>
          {seats.map((st, i) => (st.kind === 'ai'
            ? <SeatCard top={`Stall ${i + 2}`} title={keeperName(keepers[i])} avatar={keepers[i]} band={phone ? 'k' : 'y'} small={phone ? 'Computer' : 'Level'} big={LEVEL_WORD[st.level]}
                label={`Stall ${i + 2}: computer, ${keeperName(keepers[i])}, ${LEVEL_WORD[st.level]}. Tap for another level`}
                onClick={() => { fx.tap(); setSeat(i, { level: NEXT_LEVEL[st.level] }); }}
                onRemove={seats.length > 1 ? () => remove(i) : undefined} removeLabel={`Remove stall ${i + 2}`} />
            : <SeatCard top={`Stall ${i + 2}`} title={keeperName(keepers[i])} avatar={keepers[i]} band="b" small="Person" big={seatName(i)} selected={editing === i} pressed={editing === i}
                label={`Stall ${i + 2}: ${seatName(i)}, ${keeperName(keepers[i])}. Choose their name and shopkeeper`}
                onClick={() => { fx.tap(); setActive(editing === i ? null : i); }}
                onRemove={seats.length > 1 ? () => remove(i) : undefined} removeLabel={`Remove stall ${i + 2}`} />))}
          {open && (phone
            ? (
              <OpenCard top={`Stall ${stall}`} big="+" small="Person or computer">
                <span class="sb-two">
                  <button type="button" class="sb-add" aria-label={`Add a person at stall ${stall}`} onClick={() => add('human')}>Person</button>
                  <button type="button" class="sb-add" aria-label={`Add a computer at stall ${stall}`} onClick={() => add('ai')}>Computer</button>
                </span>
              </OpenCard>
            )
            : <OpenCard top={`Stall ${stall}`} big="+" small="Add a computer" label={`Add a computer at stall ${stall}`} onClick={() => add('ai')} />)}
        </TableRow>
        {phone && <p class="sb-note">{people ? 'Tap a person to choose their name and shopkeeper. Secrets stay hidden between turns.' : 'Add a person to pass the phone round.'}</p>}
      </section>
      <LengthSeg days={days} onDays={setDays} />
    </SbPage>
  );
}

/** A shopkeeper's name by avatar key (the deck's and the cards' words). */
export { keeperName };
/** The face picture on a small card before a shopkeeper is chosen (the online room), or a computer's badge. */
function PlainFace({ who, look }: { who: string; look?: LookSet }) {
  return who === 'computer' ? <Face who="computer" size={34} /> : <FramedFace who={who} size={34} look={look} />;
}
