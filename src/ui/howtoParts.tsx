// How to play (HowTo.tsx): the small pieces its pages draw as the table draws them. Moved out of HowTo.tsx
// unchanged (REP-140 A-02, A-08).
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import type { FruitId, Stage } from '../engine/data';
import { Fruit } from './art';
import { CardPop } from './cardZoom';
import { fx } from './fx';
import { STAGE_LETTER } from './ticket';

// ---------- small pieces drawn as the table draws them ----------

/** A freshness letter in its disc, as on the market boxes and your shelf (G, F, O, S). */
export function Lamp({ stage }: { stage: Stage }) {
  return <span class="ht-lamp" aria-hidden="true">{STAGE_LETTER[stage]}</span>;
}

/** One piece of fruit with its freshness letter, as a market box or a shelf chip shows it. */
export function Piece({ f, stage, size = 22, cls = '' }: { f: FruitId; stage: Stage; size?: number; cls?: string }) {
  return <span class={`ht-pc ${cls}`}><Fruit id={f} size={size} stage={stage} /><Lamp stage={stage} /></span>;
}

/** A small "?" piece: a crate before the bell shows how many pieces, never which fruit. */
export function Hidden() {
  return <span class="ht-pc ht-hid" aria-hidden="true">?</span>;
}

/** A plain "more" row that opens in place (the price ties). */
export function More({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <details class="ht-more">
      <summary>{title}</summary>
      <div>{children}</div>
    </details>
  );
}

/** A card's picture, name and words, readable at phone size; a tap opens the whole card (cardZoom.tsx). */
export function Tile({ pic, title, text, card, cls = '' }: { pic: ComponentChildren; title: string; text: string; card: ComponentChildren; cls?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" class={`ht-tile ${cls}`} aria-haspopup="dialog" aria-label={`${title}: ${text} See the whole card`} onClick={() => { fx.tap(); setOpen(true); }}>
        <span class="ht-tile-pic" aria-hidden="true">{pic}</span>
        <b aria-hidden="true">{title}</b>
        <small aria-hidden="true">{text}</small>
      </button>
      {open && <CardPop title={title} onClose={() => setOpen(false)}>{card}</CardPop>}
    </>
  );
}
