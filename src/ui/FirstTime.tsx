// PLAN-103: "First time? How to play", in the owner's own words, as one pop-up over the game. The first-game tips are
// off in online games, so when an online game starts (a private room or a quick match), a player who has never
// finished a game reads this on Day 1, before the morning's news is turned over. It only holds up this player's own
// morning card: the morning already waits for each person's Start buying. "Got it" hides it for good on this device;
// "All the rules" opens the full How to play and comes back here. Every number comes from the game data, so the words
// cannot drift from the rules. REP-122 C-02 (PLAN-109) added one condition to the owner's Market Days words: a standing
// order comes only if it can be delivered by the last day (none on Day 9 of a 10-day game).
import type { Ref } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { BASE_BUY, FAVOUR_HAND_LIMIT, FRUIT, FRUITS, MARKET_DAY_EVERY, lookOf, stageAt, type FruitId, type Stage } from '../engine/data';
import { effectiveMax, forSale, validatePrices, type GameState, type Post } from '../engine/game';
import { partsOf } from '../net/looks';
import { Face } from './art';
import { DeckBack, OKAY_LESS, SOFT_LESS, TradingCard } from './cards';
import { GUEST_EVENT } from './deckArt';
import { FruitSvg } from './fruitIcons';
import { BEATS } from './game/panels/TopBar';
import { crateUrl, type FruitKind } from './marketArt';
import { loadStats } from './store';
import { Awning, seats } from './table';
import { Lamp as TicketLamp, STAGE_LETTER } from './ticket';
import { useFocusTrap } from './focusTrap';
import { firstSalePosts, guideLine, piecesWord, startPrice, type Spotlight } from './tutorial';
import './firstTime.css';

/** Set once the player taps "Got it": the pop-up does not come back on this device. */
export const FIRST_TIME_KEY = 'fm.firstTimeDone';

/**
 * Has this phone's owner ever finished a game? The games-played count (store.ts `Stats.played`) goes up once for
 * every finished game, solo, pass-and-play or online, when its results first show (progress.ts finishGame). It is
 * kept whether or not anonymous counting is on (the `first_game_complete` counter is not: it is skipped when counting
 * is off), and an account brings it back on sign-in.
 */
export const hasFinishedGame = () => loadStats().played > 0;

const dismissed = () => { try { return localStorage.getItem(FIRST_TIME_KEY) === '1'; } catch { return false; } };

/** For a player who has never finished a game and has not tapped "Got it". */
export const showFirstTime = () => !hasFinishedGame() && !dismissed();

export function dismissFirstTime() {
  try { localStorage.setItem(FIRST_TIME_KEY, '1'); } catch { /* storage unavailable: hidden for the rest of this game only */ }
}

/**
 * The moment for the pop-up: an online game on the morning of Day 1, before this player has tapped Start buying.
 * Solo and pass-and-play games have the first-game tips (tutorial.ts) instead.
 */
export const firstTimeMoment = (s: GameState, online: boolean, voted: boolean) => online && s.day === 1 && s.phase === 'morning' && !voted;

const NTH: Record<number, string> = { 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth' };
/** "third" for a Market Day every 3 days. */
export const nthWord = (n: number) => NTH[n] ?? `${n}th`;

/** The owner's six steps. `beat`: the name of that step on the bar along the top of the game. */
const STEPS: { lead: string; text?: string; beat?: string }[] = [
  { lead: '1. Check the market.', text: "Read today's news and see who's shopping.", beat: BEATS[0] },
  { lead: '2. Buy fruit.', text: `From Day 2 the poorest stall buys first, then the others clockwise. Buy up to ${BASE_BUY} pieces.`, beat: BEATS[1] },
  { lead: '3. Stock your stall.', text: 'Choose what to sell. Rivals see how many pieces, but not which fruit.', beat: BEATS[2] },
  { lead: '4. Set secret prices.', text: 'Set one price per fruit. Reveal fruit and prices together at the bell.', beat: BEATS[3] },
  { lead: '5. The Rush.', text: 'Customers buy from the cheapest qualifying stall, then the next cheapest until their order is filled or no suitable fruit remains.', beat: BEATS[4] },
  { lead: '6. Repeat.' },
];

function Lamp({ stage }: { stage: Stage }) {
  return <i class={`ft-lamp ft-lamp-${stage}`} aria-hidden="true">{STAGE_LETTER[stage]}</i>;
}

/** The owner's text with the game's pictures beside it (pictures are hidden from screen readers; the words carry it). */
export function FirstTimeText() {
  return (
    <div class="ft-text">
      <section class="ft-part ft-intro">
        <h4>RUN YOUR STALL.</h4>
        <p>Buy fruit at the Wholesale Market and sell to customers. Finish with the most cash to win.</p>
      </section>

      <section class="ft-part">
        <h4>YOUR DAILY ROUTINE</h4>
        <ol class="ft-steps">
          {STEPS.map((s, i) => (
            <li class={`ft-step-${i + 1}`}>
              <div class="ft-step-head"><b>{s.lead}</b>{s.beat && <span class="ft-beat" aria-hidden="true">{s.beat}</span>}</div>
              {s.text && <div>{s.text}</div>}
            </li>
          ))}
        </ol>
      </section>

      <section class="ft-part">
        <h4>MARKET DAYS</h4>
        <p class="ft-when">{`Every ${nthWord(MARKET_DAY_EVERY)} day, except the last:`}</p>
        <p>Bid for a standing order, if it can be delivered by the last day. Lowest bid wins and pays a stake. Deliver the required fruit when due to reclaim it; fall short and lose it. Build an upgrade in the evening.</p>
      </section>

      <section class="ft-part">
        <h4>THREE THINGS TO REMEMBER</h4>
        <p><b>Watch your rivals.</b> Purchases are public as they happen, but aren't shown again. Shelves stay hidden.</p>
        <p>
          <b>Fruit ages nightly:</b>{' '}
          <span class="ft-nw"><Lamp stage="fresh" />Fresh</span> → <span class="ft-nw"><Lamp stage="okay" />Okay</span> → <span class="ft-nw"><Lamp stage="notso" />Soft</span> → gone.
          {' '}Mangoes arrive <span class="ft-nw">Green<span class="ft-fruit" aria-hidden="true"><FruitSvg id="mango" stage="unripe" size={14} alt="" /></span></span> and ripen first.
          {` Customers pay $${OKAY_LESS} less for Okay and $${SOFT_LESS} less for Soft; some refuse older fruit.`}
        </p>
        <div class="ft-favours">
          <span class="ft-card" aria-hidden="true"><DeckBack deck="favour" /></span>
          <p><b>Complete orders, earn favours.</b>{` Serve a customer's whole order alone. Draw up to 1 per day; hold up to ${FAVOUR_HAND_LIMIT}.`}</p>
        </div>
      </section>
    </div>
  );
}

/** How many steps closer the pop-up may be drawn when it would otherwise need a scroll (firstTime.css, data-tight). */
export const FT_TIGHTEST = 3;

/** One pop-up over the table. A tap outside its box does nothing: it closes only with its buttons. */
export function FirstTimePopup({ onRules, onDone }: { onRules: () => void; onDone: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  // Drawn a step closer while the words do not fit; past the last step the words scroll inside the box.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    let step = 0;
    el.dataset.tight = '0';
    while (step < FT_TIGHTEST && el.scrollHeight > el.clientHeight + 1) { step += 1; el.dataset.tight = String(step); }
  }, []);
  // Keyboard focus stays inside the box while it is open (PLAN-116).
  useFocusTrap(box);
  return (
    <div class="ft-pop" role="dialog" aria-modal="true" aria-labelledby="ft-title" onClick={(e) => e.stopPropagation()}>
      <div class="ft-box" ref={box} tabIndex={-1}>
        <h3 id="ft-title">First time? How to play</h3>
        <FirstTimeText />
        <div class="ft-actions">
          <button type="button" class="btn" onClick={onRules}>All the rules</button>
          <button type="button" class="btn primary" onClick={onDone}>Got it</button>
        </div>
      </div>
    </div>
  );
}

// ---------- PLAN-113: the guided first sale ----------
// A first-time player's first solo game: while the game sets up their stall on Day 1, a strip in place of the action
// bar says what it is doing (FirstSaleStrip); at their pricing turn one decision is spotlighted over the table
// (FirstSale): one customer's card, every stall's crate as the table shows it (a rival's is only a number of pieces),
// their price, and Ring the bell. tutorial.ts decides when and what; these only draw it. Skip is on both.

const CRATE_KIND: Record<FruitId, FruitKind> = { blueberry: 'berry', watermelon: 'melon', mango: 'mango', apple: 'apple' };

/** The strip in place of the action bar while the guide sets up the person's stall. */
export function FirstSaleStrip({ s, me, onSkip }: { s: GameState; me: number; onSkip: () => void }) {
  const line = guideLine(s, me);
  if (!line) return null;
  return (
    <div class="fs-strip" role="status" onClick={(e) => e.stopPropagation()}>
      <div class="fs-strip-in">
        <b class="fs-kicker">Guided first sale</b>
        <span>{line}</span>
      </div>
      <button type="button" class="fs-skip" aria-label="Skip the guided first sale" onClick={onSkip}>Skip</button>
    </div>
  );
}

/** A stall's wooden crate (its box only) with what is in it on top: the person's own pieces, each with its freshness
 *  letter, or a rival's face-down squares. */
function FsCrate({ pieces, backs, w, size }: { pieces: { f: FruitId; st: Stage }[]; backs: number; w: number; size: number }) {
  const bh = Math.round(w * 0.36);
  const c = crateUrl(CRATE_KIND[pieces[0]?.f ?? 'watermelon'], w, bh);
  const scale = w / c.vw;
  const boxH = Math.round((bh + 2) * scale);
  return (
    <div class="fs-crate" style={{ width: `${w}px` }} aria-hidden="true">
      <div class="fs-crate-top">
        {pieces.map((x) => <span class="fs-pc"><FruitSvg id={x.f} stage={x.st} size={size} alt="" /><TicketLamp stage={x.st} size={11} /></span>)}
        {Array.from({ length: backs }, () => <i class="fs-back" style={{ width: `${size - 4}px`, height: `${size - 4}px` }} />)}
        {!pieces.length && !backs && <span class="fs-empty">empty</span>}
      </div>
      <span class="fs-crate-box" style={{ height: `${boxH}px` }}>
        <img src={c.url} width={w} alt="" style={{ marginTop: `${-Math.round(c.top * scale)}px` }} />
      </span>
    </div>
  );
}

/** One stall at the table: its awning, its shopkeeper, its crate and its price tag for the fruit in the spotlight
 *  (yours as you set it; a rival's face down once it has priced, never its number). */
function FsStall({ s, p, me, sp, price, small }: { s: GameState; p: number; me: number; sp: Spotlight; price: number; small: boolean }) {
  const pl = s.players[p];
  const mine = p === me;
  const crate = mine ? s.crates?.[me] ?? {} : {};
  const pieces = mine ? FRUITS.flatMap((f) => (crate[f] ?? []).flatMap((n, pos) => Array.from({ length: n }, () => ({ f, st: stageAt(f, pos) })))) : [];
  const out = mine ? pieces.length : s.out?.[p] ?? 0;
  const said = mine
    ? `Your crate: ${FRUITS.filter((f) => forSale(s, me, f) > 0).map((f) => piecesWord(forSale(s, me, f), f)).join(', ')}. Your price for ${FRUIT[sp.fruit].plural.toLowerCase()}: $${price}.`
    : out === 0 ? `${pl.name}: nothing out today.` : `${pl.name}: ${out} ${out === 1 ? 'piece' : 'pieces'} out, prices secret.`;
  return (
    <div class={`fs-stall ${mine ? 'me' : ''}`} role="group" aria-label={said}>
      <Awning p={p} look={pl.look} thin />
      <i class="fs-corner" aria-hidden="true">{mine ? 'Yours' : `${out} out`}</i>
      <div class="fs-who" aria-hidden="true">
        <span class="fs-face"><Face who={pl.avatar} size={small ? 22 : 28} worn={pl.look ? partsOf(pl.look) : undefined} /></span>
        <b>{pl.name}</b>
      </div>
      <FsCrate pieces={pieces} backs={mine ? 0 : out} w={small ? 70 : 86} size={small ? 16 : 20} />
      <div class="fs-tags" aria-hidden="true">
        {mine ? <span class="fs-tag mine"><span class="fs-tag-in"><FruitSvg id={sp.fruit} size={small ? 13 : 16} alt="" /><b>{`$${price}`}</b></span><i class="fs-tag-hole" /></span>
          : out === 0 ? null
          : s.bids[p] !== null ? <span class="fs-tag sealed"><span class="fs-tag-in"><i class="fs-tag-back" /></span><i class="fs-tag-hole" /></span>
          : <span class="fs-tag none">pricing</span>}
      </div>
    </div>
  );
}

/** The bell, as on the round table's button (drawn here, hidden from screen readers: the words say it). */
function BellMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true">
      <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 21h4" /><path d="M12 3v2" />
    </svg>
  );
}

/**
 * The guided first sale's one decision, over the table at the person's pricing turn. `s`: the person's own view of the
 * game (publicView). Ring the bell seals their price and the others' planned prices (`onRing`); Skip goes back to the
 * table, where the pricing sheet is, as on any day.
 */
export function FirstSale({ s, me, sp, onRing, onSkip }: { s: GameState; me: number; sp: Spotlight; onRing: (posts: Post[]) => void; onSkip: () => void }) {
  const [price, setPrice] = useState(() => startPrice(sp));
  const box = useRef<HTMLDivElement>(null);
  // The decision is what a screen reader reads first, as it would see it on screen.
  useLayoutEffect(() => { box.current?.focus(); }, []);
  const small = typeof window !== 'undefined' && window.innerHeight < 700;
  return <FirstSaleView s={s} me={me} sp={sp} price={price} small={small} box={box} onPrice={setPrice} onRing={onRing} onSkip={onSkip} />;
}

/** The guided first sale drawn for a price (without hooks, so tests can render it to a string). */
export function FirstSaleView({ s, me, sp, price, small, box, onPrice, onRing, onSkip }: {
  s: GameState; me: number; sp: Spotlight; price: number; small: boolean; box?: Ref<HTMLDivElement>;
  onPrice: (price: number) => void; onRing: (posts: Post[]) => void; onSkip: () => void;
}) {
  const c = sp.customer;
  const name = lookOf(c.name).title;
  const plural = FRUIT[sp.fruit].plural.toLowerCase();
  const posts = firstSalePosts(sp, price);
  const error = validatePrices(s, me, posts);
  const order = [me, ...seats(s.players.length, me).map((x) => x.p)];
  const sub = price > sp.cap ? `${name} pays at most $${sp.cap} for yours` : `You spent $${sp.spent} on ${sp.bought} ${sp.bought === 1 ? 'piece' : 'pieces'} today`;
  const others = sp.others.map((b) => `${piecesWord(forSale(s, me, b.fruit), b.fruit)} at $${b.price}`);
  return (
    <div class={`fs-pop ${small ? 'small' : ''}`} role="dialog" aria-modal="true" aria-labelledby="fs-title" onClick={(e) => e.stopPropagation()}>
      <div class="fs-bar">
        <b class="fs-kicker">Guided first sale</b>
        <button type="button" class="fs-skip" aria-label="Skip the guided first sale" onClick={onSkip}>Skip</button>
      </div>
      <div class="fs-body" ref={box} tabIndex={-1}>
        <h2 id="fs-title">{`${name} wants ${piecesWord(sp.qty, sp.fruit)}. Price yours.`}</h2>
        <div class="fs-top">
          <div class="fs-card">
            <TradingCard who={c.name} guest={!!GUEST_EVENT[c.name]} eager
              wants={c.wants.map((w) => ({ fruit: w.fruit, qty: w.qty, max: effectiveMax(s, w, c.generous) }))} />
          </div>
          <ul class="fs-says">
            <li><b>{sp.qty}</b>{` ${sp.qty === 1 ? FRUIT[sp.fruit].name.toLowerCase() : plural}`}</li>
            <li>Pays up to <b>{`$${sp.top}`}</b> each</li>
            <li>{`Takes ${sp.takes}`}</li>
            <li class="fs-dim">{`Buys from the cheapest stall first. ${sp.rivals === 0 ? 'No rival has fruit out.' : `${sp.rivals} ${sp.rivals === 1 ? 'rival prices' : 'rivals price'} too.`}`}</li>
          </ul>
        </div>
        <div class={`fs-stalls n${order.length}`}>
          {order.map((p) => <FsStall s={s} p={p} me={me} sp={sp} price={price} small={small} />)}
        </div>
        {others.length > 0 && <p class="fs-others">{`Also in your crate, priced for you: ${others.join(', ')}.`}</p>}
      </div>
      <div class="fs-foot">
        <div class="fs-price" role="group" aria-label={`Your price for ${plural}`}>
          <button type="button" class="fs-step" aria-label={`Lower your price for ${plural}`} disabled={price <= sp.lo} onClick={() => onPrice(Math.max(sp.lo, price - 1))}>−</button>
          <div class="fs-mid">
            <b aria-live="polite">{`$${price}`}</b>
            <span class={price > sp.cap ? 'warn' : ''}>{sub}</span>
          </div>
          <button type="button" class="fs-step" aria-label={`Raise your price for ${plural}`} disabled={price >= sp.hi} onClick={() => onPrice(Math.min(sp.hi, price + 1))}>+</button>
        </div>
        {error && <p class="fs-error">{error}</p>}
        <button type="button" class="fs-go" disabled={!!error} onClick={() => onRing(posts)}><BellMark />Ring the bell</button>
      </div>
    </div>
  );
}
