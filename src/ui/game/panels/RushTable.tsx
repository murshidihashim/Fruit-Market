// The round table, from "Open my stall" to the end of the rush (flow A; PLAN-099, DEC-116; the rush itself: DEC-109,
// Rush-D). Today's customers stay in their row at the top. Under it a stage lies over the rest of the table, down to a
// line of words and the table's foot. Every stall's crate sits in a seat of its own round the middle, from the moment
// this stall opens until the last customer has been served: the table forms as the stall opens (the crates travel to
// their seats), the prices are set on a sheet that slides up from the foot, the bell rings in the middle and the crates
// open one by one clockwise from this stall's, a Favoured Trade question is asked in the middle, and then each customer
// in turn comes from their ticket to the middle; the same table, with no fade or swap.
// Before the bell a rival's crate is drawn only from what this stall may see (game/tableNow.ts): shut with its lid on
// while stalls open, then one face-down square for each piece it put out. In the rush a crate shows every piece it has
// out (a piece leaves when a customer takes it) and its price tag for the fruit being bought now; a sale is a piece
// travelling from the crate to the customer and the coins travelling back (animator.tsx reveal). The rush moves on by
// itself; a tap moves on sooner, and "Skip to the end" ends it.
// Nothing is drawn before its moment (rushShown.ts): a piece leaves its crate as it lifts off, a dot on the card fills
// as it lands, a crate says what became of its offer when that fruit's sale has been shown, and a favour card won
// appears when it has reached its stall: face up for the stall that won it, face down for every other. Styles:
// rushTable.css.
import type { ComponentChildren, Ref } from 'preact';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { FAVOURS, FRUIT, PREF_INFO, lookOf, prefOf, stageAt, type FavourId, type FruitId } from '../../../engine/data';
import { tiedPrices, validatePrices, type GameState } from '../../../engine/game';
import { Face } from '../../art';
import * as A from '../../anim';
import { ART_SIZE, CardArt, customerNumber, laneClass } from '../../cards';
import { customerArt, customerFocus, favourArt, favourFocus, guestArt, guestFocus, tileArt } from '../../deckArt';
import { FruitSvg } from '../../fruitIcons';
import { fx } from '../../fx';
import { shownAvatar } from '../../looks';
import { tagOf, type LookSet } from '../../../net/looks';
import { PriceBar, PriceSheetView, bellOpensOnStart, postsOf, startingPrices } from '../../panel';
import { favourShown, lineShown, paidShown, piecesLanded, piecesLifted, useRushCard } from '../../rushShown';
import { releaseStock } from '../../stockShown';
import { LANES } from '../../boardModel';
import { Awning } from '../../table';
import { STAGE_LETTER, STAGE_WORD } from '../../ticket';
import { dayStep } from '../daySheet';
import { tieStory } from '../tieStory';
import { cratesOpen, questionIn, tableForms, tagsSealed } from '../tableBeats';
import { cratesLeft, middleOf, seatOrder, tableLay, tableMin, type Place, type RushBlock, type RushCard, type RushStage, type ShowState, type TableLay } from '../rush';
import { MAX_SHOWN, SMALL_TAGS, crateFit, openTags, preTable, seatWords, tableStep, type PreTable, type SeatTag, type TableSeat } from '../tableNow';
import type { GameController } from '../useGameController';
import { dayNow } from './DaySheet';
import { TieBar, TieCard, TieWhy } from './PricingTable';

/** The stage's size before it has been measured (a test draws it without a page). */
const STAGE_GUESS: [number, number] = [390, 450];
const ORDINAL = ['', '1st', '2nd'];
/** A result sentence longer than this many letters is set a size smaller, so that it fits the line's five lines. */
const LONG_LINE = 160;

/** A favour card won in the rush, small: its face for the stall that won it, the deck's back for every other stall. */
export function FavourMark({ id }: { id: FavourId | null }) {
  return id
    ? <span class="rh-fav" role="img" aria-label={`Favour card: ${FAVOURS[id].title}`}><CardArt src={favourArt(id)} alt="" w={ART_SIZE.small[0]} h={ART_SIZE.small[1]} eager focus={favourFocus(id)} /></span>
    : <span class="rh-fav back" role="img" aria-label="Favour card, face down" style={{ backgroundImage: `url(${tileArt('favour')})` }} />;
}

/** The customer from their ticket in the row to the middle (and back): the shared slide (anim.ts), measured once each way. */
function useCardMove(el: { current: HTMLElement | null }, customerId: number, stage: RushStage | 'leave', key: string) {
  const ticket = () => A.boxOf(document.querySelector(`[data-a="c${customerId}"]`));
  useLayoutEffect(() => {
    // Once per customer: the move is measured when the card arrives.
    if (key) A.flipFrom(el.current, ticket(), { duration: A.BEAT.rush.cardIn, easing: A.EASE.sheet });
  }, [key]);
  useLayoutEffect(() => {
    if (stage === 'out') A.flipTo(el.current, ticket(), { duration: A.BEAT.rush.cardOut });
  }, [stage]);
}

/**
 * The table slides off when its part of the day is over (the takings come): it is drawn for a moment more as it last
 * was, where no tap reaches it, and a timer (not an animation event) takes it away. Returns what to draw, and whether
 * it is leaving.
 */
function useLeaving<T>(now: T | null): [T | null, boolean] {
  const last = useRef<T | null>(null);
  const [, redraw] = useState(0);
  if (now) last.current = now;
  const over = !now;
  useEffect(() => {
    if (!over || !last.current) return;
    const t = setTimeout(() => { last.current = null; redraw((n) => n + 1); }, A.moveMs(A.FEEL.sheetOut) + A.FRAME);
    return () => clearTimeout(t);
  }, [over]);
  return [now ?? last.current, over && !!last.current];
}

/** The stage's size on the screen, measured when it is drawn and whenever it changes (null until it has been). */
function useStageSize(el: { current: HTMLElement | null }, on: boolean): [number, number] | null {
  const [size, setSize] = useState<[number, number] | null>(null);
  useLayoutEffect(() => {
    const node = el.current;
    if (!on || !node) return undefined;
    const read = () => {
      const w = node.clientWidth, h = node.clientHeight;
      if (w > 0 && h > 0) setSize((was) => (was && was[0] === w && was[1] === h ? was : [w, h]));
    };
    read();
    const watch = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(read);
    watch?.observe(node);
    return () => watch?.disconnect();
  }, [on]);
  return size;
}

/** The game table's round table: it decides for itself when it is on the table (game/daySheet.ts dayStep). */
export function RushTable({ s, a, viewer, shared, c, online, from }: {
  s: GameState; a: ShowState | null;
  /** The stall this screen belongs to: it sits in the first seat. */
  viewer: number;
  /** Several people share this phone: a stall's crate carries its name and not "You". */
  shared?: boolean;
  c: GameController;
  online?: boolean;
  /** Where this stall's crate lay on the stocking sheet as its stall opened (measured before that sheet left): the
   *  crate travels from there to its seat as the table forms. */
  from?: A.Box | null;
}) {
  // The table redraws as each piece leaves a crate and lands on the customer, and as each sale is shown.
  useRushCard();
  const card = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null);
  const sheetEl = useRef<HTMLDivElement>(null);
  const n = s.players.length;
  const step = tableStep(dayStep(dayNow(s, viewer, c, !!online)));
  // The rush has been played on this table today: from its last customer until the takings the crates stay open.
  const rushedOn = useRef(-1);
  if (a) rushedOn.current = s.day;
  const after = !a && step === 'bell' && s.phase === 'reveal' && rushedOn.current === s.day;

  // ---------- pricing: your prices, on the sheet at the table's foot ----------
  const [vals, setVals] = useState<Record<string, number>>(() => (s.phase === 'bid' ? startingPrices(s, viewer) : {}));
  // Prices are suggested once every stall is open (the planner then knows how many pieces each rival put out).
  useLayoutEffect(() => { if (s.phase === 'bid') setVals(startingPrices(s, viewer)); }, [s.phase, s.day, viewer]);
  const [notice, setNotice] = useState(() => bellOpensOnStart(s));
  const pricing = step === 'price';
  // The sheet slides away as the bell is rung, and is taken off the table once it has.
  const [sheetUp, setSheetUp] = useState(pricing);
  useEffect(() => {
    if (pricing) { setSheetUp(true); return undefined; }
    const t = setTimeout(() => setSheetUp(false), A.moveMs(A.FEEL.sheetOut) + A.FRAME);
    return () => clearTimeout(t);
  }, [pricing]);
  const posts = pricing ? postsOf(s, viewer, vals) : [];

  // ---------- the Favoured Trade question ----------
  const asked = step === 'tie' && !c.busy && c.active >= 0 ? c.active : -1;
  const tying = asked >= 0 && c.activeHuman && asked === viewer;
  // Once this stall has been asked, the line that says its prices are tied is not shown again today.
  const answered = useRef(-1);
  if (tying) answered.current = s.day;

  // ---------- what each seat shows ----------
  // After the last customer the crates show what is left in them (with Skip, the customers not shown are settled too).
  const left = useMemo(() => (after ? cratesLeft(s) : null), [after, s.results]);
  const pre: PreTable | null = !step || a ? null : preTable(s, viewer, {
    step, sent: online && c.meta ? c.meta.submitted : null, own: c.ownCrate(s, viewer),
    vals: pricing ? Object.fromEntries(posts.map((x) => [x.fruit, x.price])) : null, open: c.bell,
    asked, mine: tying, online: !!online, waiting: c.waitingFor(c.humansMissingBids), shared: !!shared, answered: answered.current === s.day, left,
  });
  const on = !!a || !!pre;
  const [drawn, leaving] = useLeaving<{ a: ShowState | null; pre: PreTable | null }>(on ? { a, pre } : null);
  // The question stays a moment as it goes, so it leaves the middle and does not just vanish.
  const [asking, askGoing] = useLeaving<{ asked: number; mine: boolean }>(asked >= 0 ? { asked, mine: tying } : null);
  const size = useStageSize(stage, !!drawn);

  // ---------- the room above the pricing sheet ----------
  const [room, setRoom] = useState<number | null>(null);
  const fruits = posts.length;
  // The sheet's height changes only with its rows, the Favoured Trade line and a price that cannot be sealed (its
  // error line): it is fitted again when one of those changes, or the stage does.
  const err = pricing && !!validatePrices(s, viewer, posts);
  const fav = !!s.players[viewer]?.favours.includes('favouredTrade');
  useLayoutEffect(() => {
    const el = sheetEl.current, st = stage.current;
    if (!pricing || !el || !st || !size) { setRoom(null); return undefined; }
    const [w, h] = size;
    const need = tableMin(n, w, h);
    // The sheet is drawn closer a step at a time until it leaves the table the room it needs; if even the closest
    // step does not, its rows scroll inside it and every button stays in view.
    const fit = () => {
      delete el.dataset.tight;
      el.style.removeProperty('max-height');
      let left = el.offsetTop - st.offsetTop;
      for (let t = 1; t <= 3 && left < need; t++) {
        el.dataset.tight = String(t);
        left = el.offsetTop - st.offsetTop;
      }
      if (left < need) {
        el.style.maxHeight = `${Math.max(0, (el.offsetParent as HTMLElement | null)?.clientHeight ?? 0) - st.offsetTop - need}px`;
        left = el.offsetTop - st.offsetTop;
      }
      setRoom(Math.max(0, Math.min(h, left - 4)));
    };
    fit();
    return undefined;
  }, [pricing, size?.[0], size?.[1], fruits, n, err, fav]);

  // ---------- motion (game/tableBeats.ts) ----------
  // The table forms: every crate travels from where it was to its seat.
  const formed = !!size && !!drawn;
  useLayoutEffect(() => {
    if (formed && root.current && drawn?.pre) tableForms(root.current, viewer, from ?? null);
  }, [formed]);
  // Ringing the bell: your price tags turn face down.
  const wasStep = useRef(step);
  useLayoutEffect(() => {
    const was = wasStep.current;
    wasStep.current = step;
    if (was === 'price' && step === 'sealed' && root.current) tagsSealed(root.current);
  }, [step]);
  // The bell: it comes into the middle and swings, then seat by seat, clockwise from yours, a crate opens
  // (animator.tsx bellRings counts the seats).
  const wasOpen = useRef<number | null>(null);
  useLayoutEffect(() => {
    const was = wasOpen.current;
    wasOpen.current = c.bell;
    if (c.bell === null || !root.current) return;
    cratesOpen(root.current, was, c.bell);
    // A crate opening has its own small sound; not as the bell first shows (with reduced motion every crate is open
    // then): that moment has the bell's own sound alone (PLAN-091).
    if (was !== null && c.bell > was) fx.tap();
  }, [c.bell]);
  // The question comes into the middle of the table.
  useLayoutEffect(() => {
    if (asked >= 0 && root.current) questionIn(root.current);
  }, [asked]);

  useCardMove(card, drawn?.a?.card.customerId ?? -1, leaving || !drawn?.a ? 'leave' : drawn.a.stage, drawn?.a ? String(drawn.a.card.customerId) : '');
  if (!drawn) return null;
  const [w, hFull] = size ?? STAGE_GUESS;
  const full = tableLay(n, w, hFull);
  const area = drawn.pre?.step === 'price' && room !== null && room < hFull ? room : null;
  const lay = area !== null ? tableLay(n, w, area, { form: full.close ? 'close' : 'round', free: true }) : full;
  const sheet = (pricing || sheetUp) && !leaving ? (
    <div class={`rt-sheet ${pricing ? '' : 'gone'}`} ref={sheetEl} inert={!pricing} aria-hidden={pricing ? undefined : 'true'}>
      <PriceSheetView s={s} p={viewer} vals={vals} notice={notice} onPrice={(f, price) => setVals((v) => ({ ...v, [f]: price }))} onNotice={setNotice} />
      <PriceBar s={s} p={viewer} vals={vals} sealed={!pricing} onSubmit={(ps) => { fx.card(); c.act({ kind: 'prices', posts: ps }); }} />
    </div>
  ) : null;
  return (
    <TableView s={s} viewer={viewer} shared={shared} lay={lay} size={[w, hFull]} area={area} measured={!!size} leaving={leaving} el={root} stage={stage} card={card}
      a={drawn.a} pre={drawn.pre} ask={asking ? { ...asking, leaving: askGoing } : null} sheet={sheet} busy={c.busy && s.phase === 'reveal'}
      foot={drawn.pre?.mine ? <TieBar onDecide={(play) => { fx.card(); c.act({ kind: 'tie', play }); }} /> : null}
      onNext={(e) => { e.stopPropagation(); A.speedStep(); }}
      // Skip hurries the whole rush and shows the final shelves at once.
      onSkip={(e) => { e.stopPropagation(); A.hurryUp(); releaseStock(); }} />
  );
}

/** The rush's round table without hooks (so tests can render it to a string). `size`: the stage's width and height. */
export function RushView({ s, a, viewer, size = STAGE_GUESS, card, stage, shared, leaving, onNext, onSkip }: {
  s: GameState; a: ShowState; viewer: number; size?: [number, number]; card?: Ref<HTMLElement>; stage?: Ref<HTMLDivElement>;
  shared?: boolean; leaving?: boolean; onNext?: (e: MouseEvent) => void; onSkip?: (e: MouseEvent) => void;
}) {
  return <TableView s={s} a={a} viewer={viewer} size={size} lay={tableLay(s.players.length, size[0], size[1])} measured card={card} stage={stage} shared={shared} leaving={leaving} onNext={onNext} onSkip={onSkip} />;
}

/** The table before the rush without hooks (so tests can render it to a string). */
export function PreView({ s, pre, viewer, size = STAGE_GUESS, shared, foot }: {
  s: GameState; pre: PreTable; viewer: number; size?: [number, number]; shared?: boolean; foot?: ComponentChildren;
}) {
  return <TableView s={s} pre={pre} viewer={viewer} size={size} lay={tableLay(s.players.length, size[0], size[1])} measured shared={shared} foot={foot} />;
}

/**
 * The round table drawn whole: the stage with the ring and every seat's crate, the middle (the bell, the Favoured
 * Trade question, the customer), the line of words and the foot. One element all through the day's middle, so that
 * nothing is swapped between the bell and the rush.
 */
function TableView({ s, viewer, shared, lay, size, area, measured, leaving, el, stage, card, a, pre, ask, sheet, foot, busy, onNext: next, onSkip: skip }: {
  s: GameState; viewer: number; shared?: boolean; lay: TableLay; size: [number, number]; area?: number | null; measured: boolean; leaving?: boolean;
  /** The Favoured Trade question in the middle (when not given: the one `pre` asks), and whether it is going. */
  ask?: { asked: number; mine: boolean; leaving?: boolean } | null;
  el?: Ref<HTMLElement>; stage?: Ref<HTMLDivElement>; card?: Ref<HTMLElement>;
  a?: ShowState | null; pre?: PreTable | null; sheet?: ComponentChildren; foot?: ComponentChildren; busy?: boolean;
  onNext?: (e: MouseEvent) => void; onSkip?: (e: MouseEvent) => void;
}) {
  const [w, h] = size;
  const order = seatOrder(s.players.length, viewer);
  const rem = s.config.days - s.day;
  const c = a?.card;
  const done = !!a && (a.stage === 'result' || a.stage === 'out');
  const b: RushBlock | undefined = c?.blocks[Math.min(a!.at, c.blocks.length - 1)];
  // The first customer comes in as the bell's last moment goes: the open crates' tags fade and the bell leaves.
  const first = !!a && a.n === 1 && a.stage === 'in';
  const pricing = pre?.step === 'price';
  // While the pricing sheet is up the table is laid out in the room above it (`area`); otherwise on the whole stage.
  const room = area ?? h;
  const mid = middleOf(lay, w, room);
  const words = !a && pre ? lineOf(s, viewer, pre) : null;
  // A long reason for a tie (with another tied price after it) is set a size smaller, as a long result is.
  const longWhy = !a && !!pre && pre.step === 'tie' && pre.asked >= 0 && (() => { const t = tieStory(s, pre.asked, pre.mine ? pre.asked : viewer); return t.why.length + (t.also?.length ?? 0) > LONG_LINE; })();
  const cls = a ? `st-${a.stage}` : `pre at-${pre?.step}${pre?.after ? ' after' : ''}`;
  // The question in the middle: while it is asked, and for a moment after the answer, as it goes (`ask`).
  const q = ask !== undefined ? ask : pre && pre.asked >= 0 ? { asked: pre.asked, mine: pre.mine } : null;
  return (
    <section class={`rush-table ${cls} ${lay.close ? 'close' : 'round'} ${lay.low ? 'low' : ''} ${leaving ? 'leaving' : ''} ${pricing ? 'pricing' : ''}`} ref={el}
      data-n={a?.n} data-of={a?.of} data-step={a ? 'rush' : pre?.step} data-busy={busy ? '' : undefined}
      aria-label={a ? `The rush: customer ${a.n} of ${a.of}` : 'The table: every stall\'s crate'} aria-hidden={leaving ? 'true' : undefined} onClick={a ? next : undefined}>
      <i class="rt-bg" aria-hidden="true" />
      <div class="rt-stage" ref={stage} style={{ '--crate-w': `${lay.crate.width}px`, '--crate-h': `${lay.crate.height}px`, '--card-w': `${lay.card.width}px` }}>
        <Lines lay={lay} order={order} b={a && a.stage !== 'in' ? b : undefined} c={c} w={w} h={room} />
        {measured && order.map((p, i) => (
          <Crate key={`seat-${p}`} s={s} p={p} at={lay.seats[i]} me={p === viewer} shared={shared} low={lay.low} close={lay.close}
            seat={pre && !a ? pre.seats[i] : undefined} rush={a && c ? { c, b, stage: a.stage, first } : undefined} />
        ))}
        <div class="rt-mid">
          {(pre && !a && (pre.step === 'sealed' || pre.step === 'bell' || pre.step === 'tie') && !pre.after) || first
            ? <div key="bell" class={`rt-bell ${pre?.ringing ? 'on' : ''}`} aria-hidden="true"><i class="rt-bell-in"><BellIcon size={30} /></i></div> : null}
          {q && !a && (
            <div key="ask" class={`rt-ask ${q.leaving ? 'leaving' : ''}`} style={{ left: `${mid.left}px`, top: `${mid.top}px`, width: `${mid.width}px`, height: `${mid.height}px` }}
              aria-hidden={q.leaving ? 'true' : undefined}>
              <TieCard s={s} viewer={viewer} asked={q.asked} mine={q.mine} />
            </div>
          )}
          {a && c && <Customer key={c.customerId} c={c} at={a.at} stage={a.stage} el={card} />}
        </div>
      </div>
      {/* The line keeps its room from the start, so the table above it does not move when its words change. */}
      <div class={`rt-line${!a && !words ? ' empty' : ''} ${done ? 'show' : ''} ${(done && c && c.text.length > LONG_LINE) || longWhy ? 'long' : ''}`} role="status">
        {a && c ? (done
          ? <><b class={c.earned > 0 ? '' : 'nil'}>{c.earned > 0 ? `+$${c.earned}` : '$0'}</b><span>{c.text}</span></>
          : a.stage !== 'in' && b ? <span class="rt-now">{b.heading}</span> : null)
          : words}
      </div>
      <div class="rt-foot">
        {a ? (
          <>
            <button type="button" class="rt-skip" onClick={skip}>Skip to the end</button>
            {/* After the last customer comes the day's takings: the button carries that card's own title. */}
            <button type="button" class="rt-next" onClick={next}>{a.n < a.of ? 'Next customer' : rem === 0 ? 'Market closed' : `End of day ${s.day}`}</button>
          </>
        ) : foot ?? (pre?.hint ? <div key={pre.hint.text} class={`hint-bar rt-hint ${pre.hint.dots ? 'waiting-dots' : ''}`}>{pre.hint.text}</div> : <i class="rt-room" aria-hidden="true" />)}
      </div>
      {sheet}
    </section>
  );
}

/** The bell, as the table draws it. */
function BellIcon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2a5 5 0 0 0-5 5v4l-2 3h14l-2-3V7a5 5 0 0 0-5-5zm-2 14a2 2 0 0 0 4 0z" fill="currentColor" /></svg>;
}

/** The words under the table before the rush: the bell, your tied prices, or why a tied stall sells first. */
function lineOf(s: GameState, viewer: number, pre: PreTable) {
  if (pre.after) return null;
  if (pre.step === 'tie' && pre.asked >= 0) return <TieWhy key={`why-${pre.asked}`} s={s} viewer={viewer} asked={pre.asked} mine={pre.mine} />;
  if (pre.step !== 'bell' && pre.step !== 'tie') return null;
  return (
    <span class="rt-bellsay" key="bell">
      <b class="rt-bellhead"><BellIcon size={18} />The bell</b>
      {pre.tied ? <span data-a="bell-ties">Your prices are tied: {pre.tied}.</span> : <span>Every crate and every price is open.</span>}
    </span>
  );
}

/** The table's ring, and a line from the customer to each crate that can sell this fruit: solid to the one that
 *  sells first, dashed to the others. */
function Lines({ lay, order, b, c, w, h }: { lay: TableLay; order: number[]; b: RushBlock | undefined; c: RushCard | undefined; w: number; h: number }) {
  const r = Math.max(40, Math.min(w - lay.crate.width, h - lay.crate.height) / 2 - 4);
  const holder = c?.holder ?? undefined;
  return (
    <svg class="rt-lines" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <circle class="rt-ring" cx={w / 2} cy={h / 2} r={r} />
      {b && c && <g key={`${c.customerId}-${b.fruit}`} class="rt-to">
        {b.rows.filter((x) => x.rank > 0 && (holder === undefined || x.player === holder)).map((x) => {
          const seat = lay.seats[order.indexOf(x.player)];
          return seat ? <line class={x.rank === 1 ? 'first' : ''} x1={w / 2} y1={h / 2} x2={seat.left + seat.width / 2} y2={seat.top + seat.height / 2} /> : null;
        })}
      </g>}
    </svg>
  );
}

/** The customer in the middle: number and name, picture, each fruit they want (a dot for each piece, filled as it
 *  lands) with their top price for it today, and the freshness they take. */
function Customer({ c, at, stage, el }: { c: RushCard; at: number; stage: RushStage; el?: Ref<HTMLElement> }) {
  const look = lookOf(c.name);
  const guest = c.kind === 'guest';
  const num = c.kind === 'customer' ? customerNumber(c.name) : undefined;
  const pref = prefOf(c.name);
  // A standing order takes Fresh or Okay pieces at its own price.
  const okay = c.kind === 'order' || pref !== 'premium';
  const soft = c.kind !== 'order' && pref === 'bargain';
  const [aw, ah] = ART_SIZE[guest ? 'event' : 'customer'];
  return (
    <article class={`rt-cust ${guest ? 'guest' : ''}`} ref={el} data-a="rs-card" data-c={c.customerId}>
      <header class="rt-hd">
        {num !== undefined ? <b>{String(num).padStart(2, '0')}</b> : c.kind !== 'customer' && <b>{c.kind === 'order' ? 'Standing order' : 'Guest'}</b>}
        <span>{look.title}</span>
      </header>
      <div class="rt-pic">
        <CardArt src={guest ? guestArt(c.name) : customerArt(c.name)} alt={look.title} w={aw} h={ah} eager focus={guest ? guestFocus(c.name) : customerFocus(c.name)} />
      </div>
      {c.blocks.map((b, k) => {
        const shown = lineShown(c.customerId, b.fruit);
        const got = shown ? b.got : Math.min(b.got, piecesLanded(c.customerId, b.fruit));
        const now = k === Math.min(at, c.blocks.length - 1) && stage === 'rows';
        return (
          <div class={`rt-w ${laneClass(b.fruit)} ${now ? 'now' : ''} ${shown && b.got >= b.want ? 'done' : ''}`}>
            <FruitSvg id={b.fruit} size={18} alt={FRUIT[b.fruit].name} />
            <span class={`rt-dots ${b.want > 4 ? 'many' : ''}`} role="img" aria-label={`${got} of ${b.want} ${(b.want === 1 ? FRUIT[b.fruit].name : FRUIT[b.fruit].plural).toLowerCase()}`}>
              {Array.from({ length: b.want }, (_, i) => <i class={i < got ? 'got' : undefined} />)}
            </span>
            <b class="rt-max" aria-label={`top price $${b.line.max}`}>≤ ${b.line.max}</b>
          </div>
        );
      })}
      <footer class="rt-ft" role="img" aria-label={c.kind === 'order' ? 'Takes Fresh or Okay fruit' : `${PREF_INFO[pref].title}: ${PREF_INFO[pref].text}`}>
        <i class="rt-lamp">F</i>
        <i class={`rt-lamp ${okay ? '' : 'off'}`}>O</i>
        <i class={`rt-lamp ${soft ? '' : 'off'}`}>S</i>
        <span>{c.kind === 'order' ? PREF_INFO.everyday.short : PREF_INFO[pref].short}</span>
      </footer>
    </article>
  );
}

/** A price tag on a crate, cut like the printed game's tag: the fruit and its price, face up; its back, face down. A
 *  tag another stall matches is marked; a tag Favoured Trade was played on is stamped. */
function Tag({ p, t, look }: { p: number; t: SeatTag; look?: LookSet }) {
  const word = FRUIT[t.f].plural.toLowerCase();
  // The stall's price-tag style from the Wardrobe (stampbook.css): only the tag's edge changes.
  return (
    <span class={`rt-tg tg-${tagOf(look)} ${t.up ? '' : 'down'} ${t.tied ? 'tie' : ''}`} data-a={`rt-tag-${p}-${t.f}`} role="img"
      aria-label={t.up && t.price !== null ? `${word} $${t.price}${t.tied ? ', tied' : ''}${t.stamped ? `, ${FAVOURS.favouredTrade.title} played` : ''}` : `${word}, price face down`}>
      <span class="rt-tgf"><FruitSvg id={t.f} size={11} alt="" />{t.up && t.price !== null ? <b>${t.price}</b> : <b class="rt-tgb" />}</span>
      {t.stamped && <i class="ds-stamp" aria-hidden="true">FT</i>}
    </span>
  );
}

/**
 * A stall's crate in its seat, from the moment the table forms to the end of the rush.
 * Before the rush (`seat`, game/tableNow.ts): shut with its lid on, its face-down squares, or open with its pieces and
 * every price tag (your own crate is open from the start, your tags face up while you price and face down once the bell
 * is rung); its word on the corner ("filling…", "3 out", "sealed").
 * In the rush (`rush`): all the fruit it has out for sale, piece by piece with each piece's freshness letter, from the
 * first customer to the last; a piece leaves the crate when a customer takes it (the owner, 2026-11-13). While a fruit
 * is being bought, the crate's other fruit is greyed and its price tag for that fruit shows. A crate that cannot sell to
 * this customer says why from the start (over their price, a freshness they will not take, none of the fruit); the one
 * that sells first is marked "1st", the next "2nd". What became of an offer shows once that fruit's sale has been
 * shown, and the money as it lands.
 */
function Crate({ s, p, at, me, shared, low, close, seat, rush }: {
  s: GameState; p: number; at: Place; me: boolean; shared?: boolean; low?: boolean; close?: boolean;
  seat?: TableSeat;
  rush?: { c: RushCard; b: RushBlock | undefined; stage: RushStage; first: boolean };
}) {
  const pl = s.players[p];
  const name = me && !shared ? 'You' : pl.name;
  const style = { left: `${at.left}px`, top: `${at.top}px`, width: `${at.width}px`, height: `${at.height}px` };
  const head = (
    <>
      <Awning p={p} look={pl.look} thin />
      <div class="rt-who"><Face who={shownAvatar(s.players, p)} size={18} /><b>{name}</b></div>
    </>
  );
  if (seat) {
    // Drawn closer when its pieces and tags would not fit its seat (tableNow.ts crateFit). A low crate holds its pieces
    // in one line beside its tags: as many as that line takes, the last place saying how many more.
    const fit = crateFit(at.width, at.height, seat, !!low, !!close);
    const tagged = seat.tags.length > 0;
    // a low crate's one line: the whole width, or (with tags) what its face and name leave beside them
    const most = !low ? MAX_SHOWN : Math.max(1, Math.min(MAX_SHOWN, Math.floor((at.width - (tagged ? 55 : 10)) / (fit === 2 ? 13 : fit ? 15 : 18))));
    const shown = seat.look === 'squares' ? (seat.squares > most ? most - 1 : seat.squares) : 0;
    const pieces = seat.look === 'open' ? seat.pieces : [];
    const drawn = pieces.length > most ? pieces.slice(0, most - 1) : pieces;
    return (
      <div class={`rt-crate look-${seat.look} ${me ? 'me' : ''} ${low ? 'low' : ''} ${tagged ? 'tagged' : ''}`} data-a={`rt-crate-${p}`} data-fit={fit || undefined} style={style} role="group" aria-label={seatWords(seat, me && !shared ? 'Your crate' : pl.name)}>
        {head}
        <div class="rt-box" data-a={`rt-pcs-${p}`} aria-hidden="true">
          {Array.from({ length: shown }, () => <span class="rt-pc back"><span class="rt-sq" /></span>)}
          {seat.look === 'squares' && seat.squares > most && <em>+{seat.squares - most + 1}</em>}
          {drawn.map(({ fruit: g, pos }) => <span class="rt-pc" data-a={`rt-pc-${p}-${g}-${pos}`}><FruitSvg id={g} size={13} alt="" /><i>{STAGE_LETTER[stageAt(g, pos)]}</i></span>)}
          {pieces.length > most && <em>+{pieces.length - most + 1}</em>}
          {seat.look === 'open' && !pieces.length && <span class="rt-empty">Empty</span>}
          {!me && <i class={`rt-lid ${seat.look === 'lid' ? '' : 'off'}`} />}
        </div>
        <div key="all" class={`rt-tags ${seat.tags.length >= SMALL_TAGS ? 'small' : ''}`}>{seat.tags.map((t) => <Tag p={p} t={t} look={pl.look} />)}</div>
        {/* the word on the corner lifts off like a lid as the crate opens (rushTable.css) */}
        {(seat.word || seat.was) && <i class={`rt-word ${seat.word ? '' : 'off'} ${seat.word === 'filling…' || seat.word === 'pricing…' ? 'busy' : ''}`} aria-hidden="true">{seat.word || seat.was}</i>}
      </div>
    );
  }
  const { c, b, stage, first } = rush!;
  const f: FruitId | undefined = b?.fruit;
  const row = b?.rows.find((x) => x.player === p);
  const up = stage !== 'in' && !!b && !!f;
  const shown = !!b && lineShown(c.customerId, b.fruit);
  // A standing order buys from its holder's crate only: every other crate sits it out.
  const off = c.holder !== null && c.holder !== p;
  const kind = !up ? '' : off ? 'off' : !row ? 'none' : !row.qualified ? 'over' : row.rank === 1 && !shown ? 'first' : '';
  const pieces = crateNow(c, p);
  const tied = !!row && row.qualified && !!f && pl.favouredTrade && tiedPrices(s, p).some((t) => t.fruit === f);
  const say = !up ? ''
    : off ? 'not their order'
    : !row ? `no ${FRUIT[f!].plural.toLowerCase()}`
    : !row.qualified ? row.result
    : !shown ? ''
    : row.sold > 0 ? `Sold ${row.sold}` : row.result;
  const paid = up && !!row && row.sold > 0 && paidShown(c.customerId, b!.fruit, p);
  const fav = c.favour && c.favour.player === p && favourShown(c.customerId) ? c.favour : null;
  const drawn = pieces && pieces.length > MAX_SHOWN ? pieces.slice(0, MAX_SHOWN - 1) : pieces ?? [];
  return (
    <div class={`rt-crate ${kind} ${me ? 'me' : ''}`} data-a={`rt-crate-${p}`} style={style}
      role="group" aria-label={`${name}${say ? `: ${say}` : ''}`}>
      {head}
      <div class="rt-box" data-a={`rt-pcs-${p}`} role="img" aria-label={pieces ? crateWords(pieces) : 'Crate not known'}>
        {drawn.map(({ fruit: g, pos }) => (
          <span class={`rt-pc ${up && g !== f ? 'dim' : ''}`} data-a={`rt-pc-${p}-${g}-${pos}`}><FruitSvg id={g} size={13} alt="" /><i>{STAGE_LETTER[stageAt(g, pos)]}</i></span>
        ))}
        {pieces && pieces.length > MAX_SHOWN && <em>+{pieces.length - MAX_SHOWN + 1}</em>}
        {pieces && !pieces.length && <span class="rt-empty">Empty</span>}
      </div>
      {first ? (
        // The bell's tags fade as the first customer comes in; then the tag for each fruit they want shows in turn.
        <div key="all" class={`rt-tags fade ${openTags(s, p).length >= SMALL_TAGS ? 'small' : ''}`} aria-hidden="true">{openTags(s, p).map((t) => <Tag p={p} t={t} look={pl.look} />)}</div>
      ) : (
        <div class="rt-tagrow" key={up && f ? `${c.customerId}-${f}` : 'shut'}>
          {up && row && !off && (
            <span class="rt-tagw">
              <b class="rt-tag">${row.price}</b>
              {tied && <i class="ds-stamp" role="img" aria-label={`${FAVOURS.favouredTrade.title} played`}>FT</i>}
            </span>
          )}
          <span class="rt-say">{say}</span>
        </div>
      )}
      {paid ? <span class="rt-plus">+${row!.paid}</span>
        : up && row && row.rank > 0 && row.rank < ORDINAL.length && !off && <span class="rt-badge">{ORDINAL[row.rank]}</span>}
      {fav && <span class="rt-fav"><FavourMark id={fav.id} /></span>}
      <i class="rt-favspot" data-a={`rt-fav-${p}`} aria-hidden="true" />
    </div>
  );
}

/**
 * A stall's crate at this moment of the rush: as this customer found it, less the pieces that have left for them so
 * far (all of a fruit's sold pieces once its sale has been shown), in the board's lane order and freshest first.
 * Null when the crate cannot be worked out.
 */
export function crateNow(c: RushCard, p: number): { fruit: FruitId; pos: number }[] | null {
  const stock = c.stock[p];
  if (!stock) return null;
  const out: { fruit: FruitId; pos: number }[] = [];
  for (const g of LANES) {
    const had = stock[g];
    if (!had?.length) continue;
    const r = c.blocks.find((x) => x.fruit === g)?.rows.find((x) => x.player === p);
    const n = !r ? 0 : lineShown(c.customerId, g) ? r.sold : Math.min(r.sold, piecesLifted(c.customerId, g, p));
    // The pieces it handed over, where they are known; otherwise its freshest (a standing order and a customer both
    // take the freshest they will accept, so this is right but for a rare tie of freshness).
    const left = (r?.used ? without(had, r.used.slice(0, n)) : [...had]).sort((x, y) => y - x);
    for (const pos of r?.used ? left : left.slice(n)) out.push({ fruit: g, pos });
  }
  return out;
}

/** "In the crate: 2 apples (Fresh, Okay), 1 mango (Fresh)". */
function crateWords(pieces: { fruit: FruitId; pos: number }[]): string {
  if (!pieces.length) return 'Empty crate';
  const parts = LANES.flatMap((g) => {
    const mine = pieces.filter((x) => x.fruit === g);
    if (!mine.length) return [];
    const kinds = [...new Set(mine.map((x) => STAGE_WORD[stageAt(g, x.pos)]))].join(', ');
    return [`${mine.length} ${(mine.length === 1 ? FRUIT[g].name : FRUIT[g].plural).toLowerCase()} (${kinds})`];
  });
  return `In the crate: ${parts.join(', ')}`;
}

/** A list of crate places with some pieces taken out (one for each entry in `gone`). */
function without(crate: number[], gone: number[]): number[] {
  const out = [...crate];
  for (const pos of gone) {
    const i = out.indexOf(pos);
    if (i >= 0) out.splice(i, 1);
  }
  return out;
}
