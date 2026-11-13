// The rush as a round table (DEC-109; the approved board: docs/studio/review-18/mockups, Rush-D). Today's customers
// stay in their row at the top. Under it a stage lies over the rest of the table, down to a result line and two
// buttons. Each customer in turn comes from their ticket to the middle of the stage as their card; every stall's open
// crate sits round them in a seat of its own for the whole rush. A crate shows the stall's awning, face and name, every
// piece it has out for sale (a piece leaves when a customer takes it), and its price tag for the fruit being bought now. A sale is a piece travelling from the crate
// to the customer and the coins travelling back (animator.tsx reveal). The rush moves on by itself; a tap moves on
// sooner, and "Skip to the end" ends it.
// Nothing is drawn before its moment (rushShown.ts): a piece leaves its crate as it lifts off, a dot on the card fills
// as it lands, a crate says what became of its offer when that fruit's sale has been shown, and a favour card won
// appears when it has reached its stall: face up for the stall that won it, face down for every other. Only the day's
// results and the open crates are drawn, which are public once the bell has rung. Styles: rushTable.css.
import type { Ref } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { FAVOURS, FRUIT, PREF_INFO, lookOf, prefOf, stageAt, type FavourId, type FruitId } from '../../../engine/data';
import { tiedPrices, type GameState } from '../../../engine/game';
import { Face } from '../../art';
import * as A from '../../anim';
import { ART_SIZE, CardArt, customerNumber, laneClass } from '../../cards';
import { customerArt, customerFocus, favourArt, favourFocus, guestArt, guestFocus, tileArt } from '../../deckArt';
import { FruitSvg } from '../../fruitIcons';
import { shownAvatar } from '../../looks';
import { favourShown, lineShown, paidShown, piecesLanded, piecesLifted, useRushCard } from '../../rushShown';
import { releaseStock } from '../../stockShown';
import { LANES } from '../../boardModel';
import { Awning } from '../../table';
import { STAGE_LETTER, STAGE_WORD } from '../../ticket';
import { seatOrder, tableLay, type Place, type RushBlock, type RushCard, type RushStage, type ShowState, type TableLay } from '../rush';

/** At most this many of a crate's pieces are drawn (five to a row, two rows, on a crate of the usual width); "+3" in the
 *  last place stands for the rest. */
const MAX_SHOWN = 10;
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
 * The stage slides off when the rush is over: it is drawn for a moment more with its last customer, where no tap
 * reaches it, and a timer (not an animation event) takes it away. Returns what to draw, and whether it is leaving.
 */
function useLeaving(a: ShowState | null): [ShowState | null, boolean] {
  const last = useRef<ShowState | null>(null);
  const [, redraw] = useState(0);
  if (a) last.current = a;
  const over = !a;
  useEffect(() => {
    if (!over || !last.current) return;
    const t = setTimeout(() => { last.current = null; redraw((n) => n + 1); }, A.moveMs(A.FEEL.sheetOut) + A.FRAME);
    return () => clearTimeout(t);
  }, [over]);
  return [a ?? last.current, over && !!last.current];
}

/** The stage's size on the screen, measured when it is drawn and whenever it changes. */
function useStageSize(el: { current: HTMLElement | null }, on: boolean): [number, number] {
  const [size, setSize] = useState<[number, number]>(STAGE_GUESS);
  useLayoutEffect(() => {
    const node = el.current;
    if (!on || !node) return undefined;
    const read = () => {
      const w = node.clientWidth, h = node.clientHeight;
      if (w > 0 && h > 0) setSize((was) => (was[0] === w && was[1] === h ? was : [w, h]));
    };
    read();
    const watch = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(read);
    watch?.observe(node);
    return () => watch?.disconnect();
  }, [on]);
  return size;
}

export function RushTable({ s, a, viewer, shared }: {
  s: GameState; a: ShowState | null;
  /** The stall this screen belongs to: it sits in the first seat. */
  viewer: number;
  /** Several people share this phone: a stall's crate carries its name and not "You". */
  shared?: boolean;
}) {
  // The table redraws as each piece leaves a crate and lands on the customer, and as each sale is shown.
  useRushCard();
  const card = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [shown, leaving] = useLeaving(a);
  const size = useStageSize(stage, !!shown);
  useCardMove(card, shown?.card.customerId ?? -1, leaving || !shown ? 'leave' : shown.stage, shown ? String(shown.card.customerId) : '');
  if (!shown) return null;
  return (
    <RushView s={s} a={shown} viewer={viewer} size={size} card={card} stage={stage} shared={shared} leaving={leaving}
      onNext={(e) => { e.stopPropagation(); A.speedStep(); }}
      // Skip hurries the whole rush and shows the final shelves at once (the same as Skip on the bar under the bell).
      onSkip={(e) => { e.stopPropagation(); A.hurryUp(); releaseStock(); }} />
  );
}

/** The round table itself, without hooks (so tests can render it to a string). `size`: the stage's width and height. */
export function RushView({ s, a, viewer, size = STAGE_GUESS, card, stage, shared, leaving, onNext: next, onSkip: skip }: {
  s: GameState; a: ShowState; viewer: number; size?: [number, number]; card?: Ref<HTMLElement>; stage?: Ref<HTMLDivElement>;
  shared?: boolean; leaving?: boolean; onNext?: (e: MouseEvent) => void; onSkip?: (e: MouseEvent) => void;
}) {
  const c = a.card;
  const done = a.stage === 'result' || a.stage === 'out';
  const b: RushBlock | undefined = c.blocks[Math.min(a.at, c.blocks.length - 1)];
  const [w, h] = size;
  const order = seatOrder(s.players.length, viewer);
  const lay = tableLay(order.length, w, h);
  const rem = s.config.days - s.day;
  return (
    <section class={`rush-table st-${a.stage} ${lay.close ? 'close' : 'round'} ${leaving ? 'leaving' : ''}`} data-n={a.n} data-of={a.of}
      aria-label={`The rush: customer ${a.n} of ${a.of}`} aria-hidden={leaving ? 'true' : undefined} onClick={next}>
      <div class="rt-stage" ref={stage} style={{ '--crate-w': `${lay.crate.width}px`, '--crate-h': `${lay.crate.height}px`, '--card-w': `${lay.card.width}px` }}>
        <Lines lay={lay} order={order} b={b} c={c} w={w} h={h} />
        {order.map((p, i) => <Crate key={`seat-${p}`} s={s} p={p} c={c} b={b} at={lay.seats[i]} me={p === viewer} shared={shared} stage={a.stage} />)}
        <div class="rt-mid">
          <Customer key={c.customerId} c={c} at={a.at} stage={a.stage} el={card} />
        </div>
      </div>
      {/* The line keeps its room from the start, so the table above it does not move when its words change. */}
      <div class={`rt-line ${done ? 'show' : ''} ${done && c.text.length > LONG_LINE ? 'long' : ''}`} role="status">
        {done
          ? <><b class={c.earned > 0 ? '' : 'nil'}>{c.earned > 0 ? `+$${c.earned}` : '$0'}</b><span>{c.text}</span></>
          : a.stage !== 'in' && b ? <span class="rt-now">{b.heading}</span> : null}
      </div>
      <div class="rt-foot">
        <button type="button" class="rt-skip" onClick={skip}>Skip to the end</button>
        {/* After the last customer comes the day's takings: the button carries that card's own title. */}
        <button type="button" class="rt-next" onClick={next}>{a.n < a.of ? 'Next customer' : rem === 0 ? 'Market closed' : `End of day ${s.day}`}</button>
      </div>
    </section>
  );
}

/** The table's ring, and a line from the customer to each crate that can sell this fruit: solid to the one that
 *  sells first, dashed to the others. */
function Lines({ lay, order, b, c, w, h }: { lay: TableLay; order: number[]; b: RushBlock | undefined; c: RushCard; w: number; h: number }) {
  const r = Math.max(40, Math.min(w - lay.crate.width, h - lay.crate.height) / 2 - 4);
  const holder = c.holder ?? undefined;
  return (
    <svg class="rt-lines" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <circle class="rt-ring" cx={w / 2} cy={h / 2} r={r} />
      {b && <g key={`${c.customerId}-${b.fruit}`} class="rt-to">
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

/**
 * A stall's open crate in its seat: all the fruit it has out for sale, piece by piece with each piece's freshness
 * letter, from the first customer to the last; a piece leaves the crate when a customer takes it (the owner,
 * 2026-11-13). While a fruit is being bought, the crate's other fruit is greyed and its price tag for that fruit shows.
 * A crate that cannot sell to this customer says why from the start (over their price, a freshness they will not take,
 * none of the fruit); the one that sells first is marked "1st", the next "2nd". What became of an offer shows once
 * that fruit's sale has been shown, and the money as it lands.
 */
function Crate({ s, p, c, b, at, me, shared, stage }: {
  s: GameState; p: number; c: RushCard; b: RushBlock | undefined; at: Place; me: boolean; shared?: boolean; stage: RushStage;
}) {
  const pl = s.players[p];
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
  const name = me && !shared ? 'You' : pl.name;
  const drawn = pieces && pieces.length > MAX_SHOWN ? pieces.slice(0, MAX_SHOWN - 1) : pieces ?? [];
  return (
    <div class={`rt-crate ${kind} ${me ? 'me' : ''}`} data-a={`rt-crate-${p}`} style={{ left: `${at.left}px`, top: `${at.top}px`, width: `${at.width}px`, height: `${at.height}px` }}
      role="group" aria-label={`${name}${say ? `: ${say}` : ''}`}>
      <Awning p={p} look={pl.look} thin />
      <div class="rt-who"><Face who={shownAvatar(s.players, p)} size={18} /><b>{name}</b></div>
      <div class="rt-box" data-a={`rt-pcs-${p}`} role="img" aria-label={pieces ? crateWords(pieces) : 'Crate not known'}>
        {drawn.map(({ fruit: g, pos }) => (
          <span class={`rt-pc ${up && g !== f ? 'dim' : ''}`} data-a={`rt-pc-${p}-${g}-${pos}`}><FruitSvg id={g} size={13} alt="" /><i>{STAGE_LETTER[stageAt(g, pos)]}</i></span>
        ))}
        {pieces && pieces.length > MAX_SHOWN && <em>+{pieces.length - MAX_SHOWN + 1}</em>}
        {pieces && !pieces.length && <span class="rt-empty">Empty</span>}
      </div>
      <div class="rt-tagrow" key={up && f ? `${c.customerId}-${f}` : 'shut'}>
        {up && row && !off && (
          <span class="rt-tagw">
            <b class="rt-tag">${row.price}</b>
            {tied && <i class="ds-stamp" role="img" aria-label={`${FAVOURS.favouredTrade.title} played`}>FT</i>}
          </span>
        )}
        <span class="rt-say">{say}</span>
      </div>
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
