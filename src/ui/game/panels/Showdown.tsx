// The rush, one card for each customer (DEC-086; the approved board: docs/studio/review-18/mockups, Rush). A sheet
// lies over the table from the customer row down to the main button. On it: today's customers as a row of small
// portraits, the customer being served as a card, and under the card, for each fruit they came for, every stall's
// offer in price order with what became of it. Then one line with what this stall earned, and two buttons: the next
// customer, and skip to the end. The rush moves on by itself; a tap anywhere moves on sooner.
// Nothing is drawn before its moment: an offer's result, a tick on the card and a favour card won appear when the
// animator (animator.tsx reveal) has shown that sale (rushShown.ts). Only the day's results and the open crates are
// shown, which are public once the bell has rung. Styles: rush.css.
import type { Ref } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { FAVOURS, type FavourId } from '../../../engine/data';
import type { GameState } from '../../../engine/game';
import * as A from '../../anim';
import { ART_SIZE, CardArt, laneClass } from '../../cards';
import { customerArt, customerFocus, favourArt, favourFocus, guestArt, guestFocus, tileArt } from '../../deckArt';
import { FruitSvg } from '../../fruitIcons';
import { shownAvatar } from '../../looks';
import { CustomerWide } from '../../phoneCards';
import { favourShown, lineShown, piecesLanded, useRushCard } from '../../rushShown';
import { releaseStock } from '../../stockShown';
import { STAGE_LETTER, STAGE_WORD, Swatch } from '../../ticket';
import { rowSaid, type RushCard, type RushRow, type RushStage } from '../rush';

export interface ShowState {
  /** The customer being served. */
  card: RushCard;
  n: number; of: number; stage: RushStage;
  /** Today's customers in the order they are served, for the row of portraits. */
  row: { id: number; name: string; guest: boolean }[];
  /** Customers already served in this rush (their portraits are dimmed). */
  served: number[];
}

/** At most this many freshness marks are drawn on a row; "+2" stands for the rest. */
const MAX_MARKS = 4;
/** A card with this much under it takes its smaller form on a middling screen (rush.css): each offer counts one and
 *  each fruit's heading two, so ten offers for two fruits, or eight for a guest's three. */
const MANY = 14;

/** A favour card won in the rush, small: its face for the stall that won it, the deck's back for every other stall. */
export function FavourMark({ id }: { id: FavourId | null }) {
  return id
    ? <span class="rh-fav" role="img" aria-label={`Favour card: ${FAVOURS[id].title}`}><CardArt src={favourArt(id)} alt="" w={ART_SIZE.small[0]} h={ART_SIZE.small[1]} eager focus={favourFocus(id)} /></span>
    : <span class="rh-fav back" role="img" aria-label="Favour card, face down" style={{ backgroundImage: `url(${tileArt('favour')})` }} />;
}

/** The freshness of the pieces a stall offered: a letter for each (greyed when none of them qualified). */
function Marks({ row }: { row: RushRow }) {
  const marks = row.pieces ?? (row.freshest ? [row.freshest] : []);
  const more = row.pieces ? marks.length - MAX_MARKS : row.qty - 1;
  return (
    <span class="rh-marks" role="img" aria-label={rowSaid(row, STAGE_WORD)}>
      {marks.slice(0, MAX_MARKS).map((st) => <i class={`rh-lamp ${row.qualified ? '' : 'off'}`}>{STAGE_LETTER[st]}</i>)}
      {more > 0 && <em>{row.pieces ? `+${more}` : `×${row.qty}`}</em>}
    </span>
  );
}

/** The card from its portrait in the row to its place (and back): the shared slide (anim.ts), measured once each way. */
function useCardMove(el: { current: HTMLElement | null }, customerId: number, stage: RushStage | 'leave', key: string) {
  const ticket = () => A.boxOf(document.querySelector(`[data-a="rq${customerId}"]`));
  useLayoutEffect(() => {
    // Once per customer: the move is measured when the card arrives.
    if (key) A.flipFrom(el.current, ticket(), { duration: A.BEAT.rush.cardIn, easing: A.EASE.sheet });
  }, [key]);
  useLayoutEffect(() => {
    if (stage === 'out') A.flipTo(el.current, ticket(), { duration: A.BEAT.rush.cardOut });
  }, [stage]);
}

/**
 * The sheet slides off when the rush is over: it is drawn for a moment more with its last customer, where no tap
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

export function Showdown({ s, a, shared }: {
  s: GameState; a: ShowState | null;
  /** Several people share this phone: a stall's row carries its name and not "You". */
  shared?: boolean;
}) {
  // The card redraws as each piece lands on it and as each sale is shown.
  useRushCard();
  const card = useRef<HTMLDivElement>(null);
  const [shown, leaving] = useLeaving(a);
  useCardMove(card, shown?.card.customerId ?? -1, leaving || !shown ? 'leave' : shown.stage, shown ? String(shown.card.customerId) : '');
  if (!shown) return null;
  return (
    <RushView s={s} a={shown} card={card} shared={shared} leaving={leaving}
      onNext={(e) => { e.stopPropagation(); A.speedStep(); }}
      // Skip hurries the whole rush and shows the final shelves at once (the same as Skip on the bar under the bell).
      onSkip={(e) => { e.stopPropagation(); A.hurryUp(); releaseStock(); }} />
  );
}

/** The rush itself, without hooks (so tests can render it to a string). Whose stall this screen belongs to is in the
 *  card (rush.ts rushCards): its rows are marked, and the result line says what it earned. */
export function RushView({ s, a, card, shared, leaving, onNext: next, onSkip: skip }: {
  s: GameState; a: ShowState; card?: Ref<HTMLDivElement>; shared?: boolean; leaving?: boolean;
  onNext?: (e: MouseEvent) => void; onSkip?: (e: MouseEvent) => void;
}) {
  const c = a.card;
  const done = a.stage === 'result' || a.stage === 'out';
  const rows = c.blocks.reduce((n, b) => n + Math.max(1, b.rows.length), 0);
  const many = rows + 2 * c.blocks.length >= MANY;
  // The card's rows: a dot is filled as its piece lands, and the row is ticked once the fruit is bought in full.
  const lines = c.blocks.map((b) => {
    const shown = lineShown(c.customerId, b.fruit);
    const got = shown ? b.got : Math.min(b.got, piecesLanded(c.customerId, b.fruit));
    return { fruit: b.fruit, qty: b.want, max: b.line.max, got, done: shown && b.got >= b.want };
  });
  // The favour card lies on the row of the stall that won it, in the first block it sold in.
  const fav = c.favour && favourShown(c.customerId) ? c.favour : null;
  const favAt = fav ? c.blocks.find((b) => b.rows.some((r) => r.player === fav.player && r.sold > 0))?.fruit : undefined;
  const rem = s.config.days - s.day;
  return (
    <section class={`rush-sheet auction st-${a.stage} ${many ? 'many' : ''} ${leaving ? 'leaving' : ''}`} data-of={a.of} aria-label="The rush"
      aria-hidden={leaving ? 'true' : undefined} style={{ '--rows': rows, '--blocks': c.blocks.length }} onClick={next}>
      <div class="rh-strip">
        <b class="tk-label">Customer {a.n} of {a.of}</b>
        <span class="rh-queue" aria-hidden="true">
          {a.row.map((x) => (
            <i class={`rh-face ${x.id === c.customerId ? 'now' : a.served.includes(x.id) ? 'served' : ''}`} data-a={`rq${x.id}`}>
              <CardArt src={x.guest ? guestArt(x.name) : customerArt(x.name)} alt="" w={ART_SIZE.customer[0]} h={ART_SIZE.customer[1]} eager
                focus={x.guest ? guestFocus(x.name) : customerFocus(x.name)} />
            </i>
          ))}
        </span>
      </div>
      <div class="rh-body" key={c.customerId}>
        <div class="rh-card" ref={card} data-a="rs-card">
          <CustomerWide who={c.name} lines={lines} order={c.kind === 'order'} />
        </div>
        <div class="rh-offers">
          {c.blocks.map((b) => {
            const shown = lineShown(c.customerId, b.fruit);
            return (
              <div class={`rh-block ${laneClass(b.fruit)}`}>
                <div class="rh-fh"><FruitSvg id={b.fruit} size={18} alt="" />{b.heading}</div>
                {b.none && <div class="rh-of none">{b.none}</div>}
                {b.rows.map((r) => {
                  const pl = s.players[r.player];
                  return (
                    <div class={`rh-of ${r.me ? 'me' : ''} ${shown ? (r.sold ? 'sold' : 'miss') : ''}`} data-a={`ro-${b.fruit}-${r.player}`}>
                      <Swatch p={r.player} who={shownAvatar(s.players, r.player)} look={pl.look} size={26} />
                      <b class="rh-price">${r.price}</b>
                      <span class="rh-name">{r.me && !shared ? 'You' : pl.name}</span>
                      <Marks row={r} />
                      {fav && favAt === b.fruit && fav.player === r.player && <FavourMark id={fav.id} />}
                      {shown && <span class={`rh-res ${r.sold ? 'sold' : 'miss'}`}>{r.result}</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        {/* The line takes its room from the start, unseen (rush.css), so the offers above it do not move when it shows. */}
        <div class={`rh-why ${done ? 'show' : ''}`} role="status" aria-hidden={done ? undefined : 'true'}>
          <b class={c.earned > 0 ? '' : 'nil'}>{c.earned > 0 ? `+$${c.earned}` : '$0'}</b>
          <span>{c.text}</span>
        </div>
      </div>
      <div class="rh-foot">
        <button type="button" class="rh-skip" onClick={skip}>Skip to the end</button>
        {/* After the last customer comes the day's takings: the button carries that card's own title. */}
        <button type="button" class="rh-next" onClick={next}>{a.n < a.of ? 'Next customer' : rem === 0 ? 'Market closed' : `End of day ${s.day}`}</button>
      </div>
    </section>
  );
}
