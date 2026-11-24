// PLAN-128: a card opened over the table from the thing it belongs to, and put back there. Today's event card is drawn
// from the badge in the top bar (Popovers.tsx EventPop); a stall's sales open from its row on the takings
// (SalesSummary.tsx StallRecap). The card travels from that place to the middle of the screen as it grows (FEEL.travel),
// the parts under it rise into place once it has landed (the sheet's own move, sheet.ts SHEET_IN), and the backdrop
// fades in as it comes. Put back, it travels back the same way, more quickly, and the backdrop fades. Only position,
// size and fade are animated, on the table's one clock (motion.ts): quicker with Fast play or after a tap, and with
// reduced motion the card is simply there and goes at once. A tap while it is on its way ends the move.
import type { RefObject } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { boxOf, type Box } from '../anim';
import { EASE, FEEL, FRAME, isReduced, moveMs, ms, timer } from '../motion';
import { SHEET_IN, SHEET_OUT } from '../sheet';

/**
 * The transform that draws a card lying at `at` as if it lay at `from` (where it comes from, or goes back to). The card
 * keeps its shape: it is drawn as wide as the place it comes from, about its own middle, and never larger than itself.
 */
export function drawnFrom(from: Box, at: Box): string {
  const dx = from.left + from.width / 2 - (at.left + at.width / 2);
  const dy = from.top + from.height / 2 - (at.top + at.height / 2);
  const k = Math.min(1, Math.max(0.1, from.width / at.width));
  return `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${k.toFixed(4)})`;
}

/** How long a card takes to go back to its place: a little quicker than it came. */
export const BACK_SHARE = 0.75;
/** The gap between two parts under the card rising into place. */
export const UNDER_GAP = 60;

/** Where a card is: on its way out ('draw'), open ('shown'), going back ('back'). */
export type PopStep = 'draw' | 'shown' | 'back';

/**
 * The moves of one card opened over the table. `root`: the pop-up (its backdrop); `card`: the selector of the card in
 * it; `under`: the selector of the parts under the card that rise into place after it (relative to the pop-up, with
 * :scope), or null; `from`: the place it comes from and goes back to (looked up as it opens and as it closes, since
 * the table may have changed meanwhile); `gone`: called when it has gone back, to take the pop-up away.
 */
export function usePopFrom(root: RefObject<HTMLElement>, card: string, under: string | null, from: () => Element | null, gone: () => void) {
  const [step, setStep] = useState<PopStep>(() => (isReduced() ? 'shown' : 'draw'));
  const moving = useRef<Animation[]>([]);
  const stepNow = useRef(step);
  stepNow.current = step;
  useLayoutEffect(() => {
    const el = root.current;
    const c = el?.querySelector<HTMLElement>(card);
    const place = boxOf(from());
    const at = boxOf(c);
    if (!el || !c || !place || !at || isReduced()) { setStep('shown'); return; }
    const go = moveMs(FEEL.travel);
    const fade = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms(FEEL.sheetIn), easing: EASE.sheet });
    const draw = c.animate([{ transform: drawnFrom(place, at), opacity: 0.6 }, { transform: 'none', opacity: 1 }], { duration: ms(FEEL.travel), easing: EASE.travel, fill: 'backwards' });
    // Under the card, each part rises a moment after the one above it, once the card has landed.
    const rise = under ? [...el.querySelectorAll<HTMLElement>(under)].map((x, i) => x.animate(SHEET_IN, { duration: ms(FEEL.sheetIn), delay: go + moveMs(UNDER_GAP) * i, easing: EASE.sheet, fill: 'backwards' })) : [];
    moving.current = [fade, draw, ...rise];
    draw.finished.then(() => { if (stepNow.current === 'draw') setStep('shown'); }, () => { /* cancelled: the pop-up has gone */ });
    return () => { for (const a of moving.current) a.cancel(); };
  }, []);
  /** Ends every move under way: the card is open at once. */
  const hurry = () => {
    for (const a of moving.current) a.finish();
    if (stepNow.current === 'draw') setStep('shown');
  };
  /** Puts the card back: it travels back to its place and the pop-up goes. */
  const close = () => {
    if (stepNow.current === 'back') return;
    const el = root.current;
    const c = el?.querySelector<HTMLElement>(card);
    for (const a of moving.current) a.finish();
    const place = boxOf(from());
    const at = boxOf(c);
    if (!el || !c || !place || !at || isReduced()) { gone(); return; }
    setStep('back');
    const back = moveMs(FEEL.travel * BACK_SHARE);
    moving.current = [
      c.animate([{ transform: 'none', opacity: 1 }, { transform: drawnFrom(place, at), opacity: 0.4 }], { duration: back + 1, easing: EASE.leave, fill: 'forwards' }),
      ...(under ? [...el.querySelectorAll<HTMLElement>(under)].map((x) => x.animate(SHEET_OUT, { duration: ms(FEEL.sheetOut), easing: EASE.leave, fill: 'forwards' })) : []),
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: back + 1, easing: EASE.leave, fill: 'forwards' }),
    ];
    // One frame more than the move, so its last frame is drawn before the pop-up is taken away.
    void timer(back + FRAME).then(gone);
  };
  return { step, hurry, close };
}
