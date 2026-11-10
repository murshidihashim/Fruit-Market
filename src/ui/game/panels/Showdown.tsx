// The rush pop-up, "Round the table" (DEC-068): one customer at a time comes to the middle of the table, each stall
// that offered them the fruit deals a card face down around them, the cards flip together, and the result tags,
// the fruit and the explanation follow. Only the day's results are shown, which are public once the bell has rung.
import type { Ref } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';
import type { GameState, LineResult } from '../../../engine/game';
import type { LineStory, Reaction } from '../../../engine/story';
import { partsOf } from '../../../net/looks';
import { Face, Fruit } from '../../art';
import * as A from '../../anim';
import { TradingCard } from '../../cards';
import { GUEST_EVENT } from '../../deckArt';
import { nameSize } from '../../table';
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
    const src = document.querySelector(`[data-a="c${customerId}"] .x-card`);
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

/** The pop-up itself, without hooks (so tests can render it to a string). */
export function RushView({ s, a, viewer, card, onNext: next }: {
  s: GameState; a: ShowState; viewer: number; card?: Ref<HTMLDivElement>; onNext?: (e: MouseEvent) => void;
}) {
  const l = a.line;
  const seats = rushSeats(l, viewer, s.players.length);
  const want = rushWant(l);
  const done = a.stage === 'result' || a.stage === 'out';
  const open = a.stage !== 'in' && a.stage !== 'deal';
  const key = rushKey(a);
  return (
    <>
      {/* A tap anywhere on the pop-up or the dimmed table moves on to the next customer; Skip hurries the whole rush. */}
      <div class={`rush-dim st-${a.stage}`} aria-hidden="true" onClick={next} />
      {/* .auction stays for the screenshot and layout scripts that look for the showdown. */}
      <div key={key} class={`auction rush st-${a.stage} n${seats.length} ${done ? `tone-${a.story.tone}` : ''}`} role="status" data-of={a.of}
        style={{ '--rs-k': A.speed() }}
        onClick={next}>
        <div class="rs-top"><span>Customer {a.n} of {a.of}</span><span>cheapest sells first</span></div>
        <div class="rs-table">
          <div class="rs-mid">
            <div class="rs-card" ref={card} data-a="rs-card">
              <TradingCard who={l.name} wants={[{ fruit: l.fruit, qty: l.want, max: l.max }]} compact guest={!!GUEST_EVENT[l.name]} eager class={nameSize(l.name)} />
            </div>
            <p class="rs-want" aria-label={want.label}>
              <span>{want.qty}</span> <Fruit id={l.fruit} size={18} /> <span class="rs-cap">· {want.cap}</span>
            </p>
          </div>
          {seats.map((seat, k) => {
            const o = l.offers[seat.i];
            const pl = s.players[o.player];
            const off = rushOffer(o, l.fruit);
            const res = done ? (o.sold ? 'won' : 'lost') : '';
            return (
              <div class={`rs-seat s${seat.slot} ${k < a.dealt || open ? 'dealt' : ''} ${open ? 'open' : ''} ${res} ${seat.me ? 'me' : ''}`}
                data-a={`rs-p${o.player}`} aria-label={open ? undefined : `${seat.me ? 'Your' : `${pl.name}'s`} card, face down`}>
                <div class="rs-flip">
                  <div class="rs-face">
                    {/* The face is only filled once the cards turn over. */}
                    {open && (
                      <>
                        <span class="rs-who"><Face who={pl.avatar} size={24} worn={partsOf(pl.look)} /><span class="rs-pname">{seat.me ? 'You' : pl.name}</span></span>
                        <b class="rs-price">${o.price}</b>
                        <span class="rs-off">{off.stage && <Fruit id={l.fruit} size={14} stage={off.stage} />}{off.text}</span>
                        {done && <span class="rs-tag">{a.story.tags[seat.i]}</span>}
                      </>
                    )}
                  </div>
                  <div class="rs-back" aria-hidden="true" />
                </div>
              </div>
            );
          })}
        </div>
        <div class={`rs-why au-why ${a.story.tone} ${done ? 'show' : ''}`}>
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
