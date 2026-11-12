// Pop-ups over the table: today's event, the coach tip, a favour card, the demand bar help,
// a customer's order and the pause menu. (A rival's stall opens below their seat; see table.tsx.)
import { FAVOURS, ORDER_CARDS, lookOf } from '../../../engine/data';
import { canPlayFavour, effectiveMax } from '../../../engine/game';
import { track } from '../../../net/telemetry';
import { FavourCard, OrderCard, TradingCard } from '../../cards';
import { GUEST_EVENT } from '../../deckArt';
import { markSeen, skipTutorial, type Tip } from '../../tutorial';
import { MorningCard } from './MorningCard';
import { FullScreenButton } from '../../FullScreenButton';
import { Wardrobe } from '../../Wardrobe';
import { useState } from 'preact/hooks';
import type { GameController } from '../useGameController';

export function EventPop({ c, viewer }: { c: GameController; viewer: number }) {
  // Fills the screen like the morning card (PLAN-013); tap anywhere or the button to go back.
  return (
    <div class="full-sheet event-sheet" role="dialog" aria-label="Today and tomorrow" onClick={() => c.setEventInfo(false)}>
      <MorningCard s={c.s} viewer={viewer} lost={0} />
      <button type="button" class="btn primary big wide" onClick={() => c.setEventInfo(false)}>Back to the market</button>
    </div>
  );
}

export function Popovers({ c, coach, onExit, onWear }: { c: GameController; coach: Tip | null; onExit: () => void; onWear?: (look: Record<string, string>) => void }) {
  const [wardrobe, setWardrobe] = useState(false);
  const { s, active, cardInfo, setCardInfo, pulseInfo, setPulseInfo, tip, setTip, menu, setMenu } = c;
  return (
    <>
  {coach && (
    // While pricing, the tip sits at the top so it never covers the Seal button.
    <div class={`coach ${c.s.phase === 'bid' || c.s.phase === 'stall' ? 'top' : ''}`} role="note">
      <b>{coach.title}</b>
      <span>{coach.text}</span>
      <div class="coach-btns">
        <button class="btn small skip" onClick={(e) => { e.stopPropagation(); skipTutorial(); track('tutorial', 'skip'); c.setTipTick((n) => n + 1); }}>Skip tutorial</button>
        <button class="btn small" onClick={(e) => { e.stopPropagation(); markSeen(coach.id); track('tutorial', coach.id); c.setTipTick((n) => n + 1); }}>Got it</button>
      </div>
    </div>
  )}

  {/* A favour card you hold, opened from the dock or the evening: the whole card, then Play (when it can be played
      now) and Close. A tap beside the card closes it too. */}
  {cardInfo !== null && s.players[active]?.favours[cardInfo] && (() => {
    const id = s.players[active].favours[cardInfo];
    const why = canPlayFavour(s, active, cardInfo);
    return (
      <div class="cd-pop" role="dialog" aria-label={`Favour card: ${FAVOURS[id].title}`} onClick={(e) => { e.stopPropagation(); setCardInfo(null); }}>
        <div class="cd-pop-in" onClick={(e) => e.stopPropagation()}>
          <FavourCard id={id} eager />
          {why && <p class="cd-pop-why">{why}</p>}
          <div class="cd-pop-btns">
            {!why && <button type="button" class="btn primary" onClick={() => c.reallyPlay(cardInfo)}>Play</button>}
            <button type="button" class="btn ghost" onClick={() => setCardInfo(null)}>Close</button>
          </div>
        </div>
      </div>
    );
  })()}

  {pulseInfo && (
    <div class="tip-pop" onClick={() => setPulseInfo(false)}>
      <b>What customers want</b>
      <span>The number on each lane is the pieces today's customers still want{s.phase === 'buy' || s.phase === 'morning' ? ' (+ means walk-ins who are not here yet may want more)' : ''}.</span>
      <span>Stalls are secret: you cannot see what a rival holds, only how many pieces it puts out for sale.</span>
      <small>Tap to close.</small>
    </div>
  )}
  {/* A customer's own card, opened from their ticket (PLAN-083): the whole card with today's prices; a standing order
      collected today shows its order card. The card's legend is the key to the prices. Tap anywhere to close. */}
  {tip && (() => {
    const order = tip.order ? ORDER_CARDS.find((x) => x.name === tip.name) : undefined;
    const qty = (i: number) => (tip.wants[i].qty <= 0 ? tip.original?.[i]?.qty ?? 0 : tip.wants[i].qty);
    return (
      <div class="cd-pop" role="dialog" aria-label={lookOf(tip.name).title} onClick={(e) => { e.stopPropagation(); setTip(null); }}>
        <div class="cd-pop-in">
          {order && tip.order
            ? <OrderCard card={order} qty={tip.original?.[0]?.qty ?? tip.wants[0]?.qty ?? 0} due="Due today" bid={tip.order.price} stake={tip.order.stake} />
            : <TradingCard who={tip.name} guest={!!GUEST_EVENT[tip.name]} eager
                wants={tip.wants.map((w, i) => ({ fruit: w.fruit, qty: qty(i), max: effectiveMax(s, w, tip.generous), done: w.qty <= 0 }))} />}
          <small class="cd-pop-hint">Tap to close</small>
        </div>
      </div>
    );
  })()}


  {wardrobe && onWear && <div class="wd-overlay"><Wardrobe onBack={() => setWardrobe(false)} onChange={onWear} /></div>}
  {menu && (
    <div class="modal-bg" onClick={() => setMenu(false)}>
      <div class="modal center" onClick={(e) => e.stopPropagation()}>
        <h2>Paused</h2>
        <p class="muted">Your game is saved automatically.</p>
        <button class="btn primary wide" onClick={() => setMenu(false)}>Resume</button>
        <FullScreenButton />
        {onWear && <button class="btn wide" onClick={() => { setMenu(false); setWardrobe(true); }}>Wardrobe</button>}
        <button class="btn wide" onClick={onExit}>Quit to menu</button>
      </div>
    </div>
  )}
    </>
  );
}
