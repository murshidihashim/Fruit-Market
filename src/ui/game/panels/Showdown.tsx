// The rush, "Round the table" (DEC-068): one customer at a time comes to the middle of the table, each stall that
// offered them the fruit gets a box with its price sealed, the boxes turn over together, and the result tags, the
// fruit and the explanation follow. Only the day's results are shown, which are public once the bell has rung.
import type { Ref } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';
import type { GameState, LineResult } from '../../../engine/game';
import type { LineStory, Reaction } from '../../../engine/story';
import { ORDER_CARDS } from '../../../engine/data';
import { Fruit } from '../../art';
import * as A from '../../anim';
import { CustomerWide } from '../../phoneCards';
import { Swatch } from '../../ticket';
import { rushOffer, rushSeats, rushWant, type RushStage } from '../rush';

export interface ShowState {
  line: LineResult; n: number; of: number; stage: RushStage;
  /** How many stalls' cards have been dealt so far. */
  dealt: number;
  story: LineStory; react: Reaction | null; cust: string;
  /** Customers already served in this rush (their cards get a tick back in the row). */
  served: number[];
}

/** Card from its place in the customer row to the middle (and back): a transform-only move, measured once. */
function useCardMove(el: { current: HTMLElement | null }, customerId: number, stage: RushStage, key: string) {
  const from = () => {
    const card = el.current;
    const src = document.querySelector(`[data-a="c${customerId}"] .tk-cust`);
    if (!card || !src || A.isReduced()) return null;
    const a = src.getBoundingClientRect();
    const b = card.getBoundingClientRect();
    if (!a.width || !b.width) return null;
    return `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / b.height})`;
  };
  useLayoutEffect(() => {
    // Once per customer: the move is measured when the card arrives.
    const t = from();
    if (t) el.current?.animate([{ transform: t }, { transform: 'none' }], { duration: A.ms(340), easing: 'cubic-bezier(.2,.8,.25,1.08)', fill: 'backwards' });
  }, [key]);
  useLayoutEffect(() => {
    if (stage !== 'out') return;
    const t = from();
    if (t) el.current?.animate([{ transform: 'none' }, { transform: t }], { duration: A.ms(300), easing: 'cubic-bezier(.5,0,.75,.2)', fill: 'forwards' });
  }, [stage]);
}

const rushKey = (a: ShowState) => `${a.line.customerId}-${a.line.fruit}-${a.n}`;

export function Showdown({ s, a, viewer }: { s: GameState; a: ShowState; viewer: number }) {
  const card = useRef<HTMLDivElement>(null);
  useCardMove(card, a.line.customerId, a.stage, rushKey(a));
  return <RushView s={s} a={a} viewer={viewer} card={card} onNext={(e) => { e.stopPropagation(); A.speedStep(); }} />;
}

/** The rush itself, without hooks (so tests can render it to a string). Drawn in the middle of the table (PLAN-072):
 *  the customer's card, a box per stall that offered the fruit being served (its price sealed until the boxes turn
 *  over together), then why it went the way it did. */
export function RushView({ s, a, viewer, card, onNext: next }: {
  s: GameState; a: ShowState; viewer: number; card?: Ref<HTMLDivElement>; onNext?: (e: MouseEvent) => void;
}) {
  const l = a.line;
  const seats = rushSeats(l, viewer, s.players.length);
  const want = rushWant(l);
  const done = a.stage === 'result' || a.stage === 'out';
  const open = a.stage !== 'in' && a.stage !== 'deal';
  const key = rushKey(a);
  // What this customer came for today: one line of the day's results for each fruit, with the price they pay for it.
  const mine = (s.results?.lines ?? []).filter((x) => x.customerId === l.customerId);
  const lines = (mine.length ? mine : [l]).map((x) => ({ fruit: x.fruit, qty: x.want, max: x.max }));
  // A standing order collected today stands in the row like a customer; its card says what it is.
  const order = ORDER_CARDS.some((c) => c.name === l.name);
  return (
    <>
      {/* A tap anywhere on the rush or the rest of the table moves on to the next customer; Skip hurries the whole rush. */}
      <div class={`rush-dim st-${a.stage}`} aria-hidden="true" onClick={next} />
      {/* .auction stays for the screenshot and layout scripts that look for the showdown. */}
      <div key={key} class={`auction rush tk-rush st-${a.stage} n${seats.length} ${done ? `tone-${a.story.tone}` : ''}`} role="status" data-of={a.of}
        style={{ '--rs-k': A.speed() }}
        onClick={next}>
        <div class="tk-label-row rs-top">
          <b class="tk-label">Customer {a.n} of {a.of}</b>
          <span class="tk-dots" aria-hidden="true">{Array.from({ length: a.of }, (_, i) => <i class={i < a.n ? 'on' : ''} />)}</span>
        </div>
        {/* The customer's card (PLAN-083): every fruit they came for today, the one being served now marked. */}
        <div class="rs-card" ref={card} data-a="rs-card" aria-label={want.label}>
          <CustomerWide who={l.name} lines={lines} now={l.fruit} order={order} />
        </div>
        <div class="tk-offers">
          {seats.map((seat, k) => {
            const o = l.offers[seat.i];
            const pl = s.players[o.player];
            const off = rushOffer(o, l.fruit);
            const res = done ? (o.sold ? 'won' : 'lost') : '';
            return (
              <div class={`rs-seat s${seat.slot} ${k < a.dealt || open ? 'dealt' : ''} ${open ? 'open' : ''} ${res} ${seat.me ? 'me' : ''}`}
                data-a={`rs-p${o.player}`} aria-label={open ? undefined : `${seat.me ? 'Your' : `${pl.name}'s`} price, sealed`}>
                <span class="rs-who"><Swatch p={o.player} who={pl.avatar} look={pl.look} size={22} /><span class="rs-pname">{seat.me ? 'You' : pl.name}</span></span>
                {/* The price is only drawn once the boxes turn over. */}
                {open ? (
                  <>
                    <b class="rs-price">${o.price}</b>
                    <span class="rs-off">{off.stage && <Fruit id={l.fruit} size={14} stage={off.stage} />}{off.text}</span>
                    {done && <span class="rs-tag">{a.story.tags[seat.i]}</span>}
                  </>
                ) : <span class="rs-back" aria-hidden="true">?</span>}
              </div>
            );
          })}
        </div>
        <div class={`rs-why au-why tk-why ${a.story.tone} ${done ? 'show' : ''}`}>
          {done && (
            <>
              <b>{a.story.headline}</b>
              {a.story.detail && <small>{a.story.detail}</small>}
              {a.cust && <span class="au-say">“{a.cust}”</span>}
            </>
          )}
        </div>
        <small class="rs-hint">Tap to move on</small>
      </div>
    </>
  );
}
