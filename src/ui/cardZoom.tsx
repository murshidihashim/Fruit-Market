// PLAN-116 (REP-133 B-08): a card drawn small (the Daily market's first customer on Home, your shopkeeper and the price
// practice's customer in the Quick match wait, the shopkeeper being chosen on the set-up screen) is too small to read:
// its words and price lines are under 12 px. A tap opens the whole card over the screen, as a customer's card opens
// in the game (cards.css .cd-pop); a tap anywhere, or Escape, closes it. The words beside each small card say what
// matters on it in readable text.
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { TrapBox } from './focusTrap';
import { fx } from './fx';

/** The whole card over the screen. `wide`: a shopkeeper's card, drawn larger than a customer's. */
export function CardPop({ title, wide, onClose, children }: { title: string; wide?: boolean; onClose: () => void; children: ComponentChildren }) {
  return (
    <TrapBox class={`cd-pop zoom-pop ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onEscape={onClose}
      onClick={(e) => { e.stopPropagation(); fx.tap(); onClose(); }}>
      <div class="cd-pop-in">
        {children}
        <small class="cd-pop-hint">Tap to close</small>
      </div>
    </TrapBox>
  );
}

/** A small card that opens whole on a tap (or Enter). `title` names the card for a screen reader. */
export function CardZoom({ title, class: cls = '', wide, children }: { title: string; class?: string; wide?: boolean; children: ComponentChildren }) {
  const [open, setOpen] = useState(false);
  const show = (e: Event) => { e.stopPropagation(); fx.tap(); setOpen(true); };
  return (
    <>
      <div class={`card-zoom ${cls}`} role="button" tabIndex={0} aria-haspopup="dialog" aria-label={`${title}: see the whole card`}
        onClick={show} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(e); } }}>
        {children}
      </div>
      {open && <CardPop title={title} wide={wide} onClose={() => setOpen(false)}>{children}</CardPop>}
    </>
  );
}
