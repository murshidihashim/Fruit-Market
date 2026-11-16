// Pop-ups over the table: today's event, the coach tip, a favour card, the demand bar help,
// a customer's order and the pause menu. (A rival's stall opens below their seat; see table.tsx.)
import { FAVOURS, ORDER_CARDS, lookOf } from '../../../engine/data';
import { canPlayFavour, effectiveMax } from '../../../engine/game';
import { track } from '../../../net/telemetry';
import { FavourCard, OrderCard, TradingCard } from '../../cards';
import { GUEST_EVENT } from '../../deckArt';
import { markSeen, skipTutorial, type Tip } from '../../tutorial';
import { MorningCard } from './MorningCard';
import { priorityNote, priorityWouldReturn } from '../evening';
import { FullScreenButton } from '../../FullScreenButton';
import { Wardrobe } from '../../Wardrobe';
import { useState } from 'preact/hooks';
import type { GameState } from '../../../engine/game';
import { loadSettings, saveSettings } from '../../store';
import { Toggle } from '../../Toggle';
import type { GameController } from '../useGameController';

/** S3 (DEC-120): said on a favour card about to be played on a buying turn. */
export const UNDO_AFTER_CARD = 'Once played, it stays played. Undo then takes back only what you buy after it.';

export function EventPop({ c, viewer, shared }: { c: GameController; viewer: number; shared?: boolean }) {
  // Fills the screen like the morning card (PLAN-013); tap anywhere or the button to go back.
  return (
    <div class="full-sheet event-sheet" role="dialog" aria-label="Today and tomorrow" onClick={() => c.setEventInfo(false)}>
      <MorningCard s={c.s} viewer={viewer} lost={0} shared={shared} />
      <button type="button" class="btn primary big wide" onClick={() => c.setEventInfo(false)}>Back</button>
    </div>
  );
}

/**
 * S18 (PLAN-110): what is lost if the person leaves now. A purchase is kept with the game (and Undo with it), but a crate
 * being filled, prices being set and a bid being chosen are kept only once they are sent. Null when nothing would be.
 */
export function unsentChoice(s: GameState, mine: boolean): string | null {
  if (!mine) return null;
  if (s.phase === 'stall') return 'Your crate is kept only once you open your stall.';
  if (s.phase === 'bid') return 'Your prices are kept only once you ring the bell.';
  if (s.phase === 'order') return 'Your bid is kept only once you bid or pass.';
  return null;
}

/** `room`: online, the room's code (ON-08: the menu names it, and Home asks first, since the match goes on). */
export function Popovers({ c, coach, onExit, onWear, room }: { c: GameController; coach: Tip | null; onExit: () => void; onWear?: (look: Record<string, string>) => void; room?: string }) {
  const [wardrobe, setWardrobe] = useState(false);
  // ON-08: online, Home first asks whether to leave the match.
  const [leaving, setLeaving] = useState(false);
  // S19: the sound switch, as in Settings.
  const [sound, setSound] = useState(() => loadSettings().sound);
  const closeMenu = () => { setLeaving(false); c.setMenu(false); };
  const unsent = unsentChoice(c.s, c.myBidTurn);
  // `actor`: the stall this phone plays for now (online its own seat, which in the evening need not be `active`).
  const { s, actor, cardInfo, setCardInfo, pulseInfo, setPulseInfo, tip, setTip, menu, setMenu } = c;
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
  {cardInfo !== null && s.players[actor]?.favours[cardInfo] && (() => {
    const id = s.players[actor].favours[cardInfo];
    const why = canPlayFavour(s, actor, cardInfo);
    return (
      <div class="cd-pop" role="dialog" aria-label={`Favour card: ${FAVOURS[id].title}`} onClick={(e) => { e.stopPropagation(); setCardInfo(null); }}>
        <div class="cd-pop-in" onClick={(e) => e.stopPropagation()}>
          <FavourCard id={id} eager />
          {why && <p class="cd-pop-why">{why}</p>}
          {/* Rules 19: a Priority card played after one from a stall earlier in today's line-up goes back to the hand. */}
          {!why && id === 'priority' && priorityWouldReturn(s, actor) && <p class="cd-pop-why">{priorityNote(s, actor)}</p>}
          {/* S3 (DEC-120): Undo takes back purchases only, so a card played on a buying turn is said to stay played. */}
          {!why && s.phase === 'buy' && <p class="cd-pop-why">{UNDO_AFTER_CARD}</p>}
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
      <span>Each lane shows how many fruits today’s customers potentially want. Use this to plan your purchases.</span>
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
    <div class="modal-bg" onClick={closeMenu}>
      {room && leaving ? (
        <div class="modal center game-menu" role="dialog" aria-label="Leave the match?" onClick={(e) => e.stopPropagation()}>
          <h2>Leave the match?</h2>
          <p>The match goes on without you: a computer will play for you until you come back.</p>
          <p class="gm-room">To come back, open room {room} from Home.</p>
          {unsent && <p class="gm-warn">{unsent}</p>}
          <button class="btn primary wide" onClick={() => setLeaving(false)}>Stay in the match</button>
          <button class="btn wide" onClick={onExit}>Leave</button>
        </div>
      ) : (
        <div class="modal center game-menu" role="dialog" aria-label="Menu" onClick={(e) => e.stopPropagation()}>
          {/* ON-08: an online match never pauses, so online the menu says so and names the room. */}
          <h2>{room ? 'Menu' : 'Paused'}</h2>
          {room
            ? <p class="gm-room">Room {room}. The match goes on while this menu is open.</p>
            : <p class="muted">Your game is saved automatically.</p>}
          {unsent && <p class="gm-warn">{unsent}</p>}
          <button class="btn primary wide" onClick={closeMenu}>{room ? 'Back to the match' : 'Resume'}</button>
          <Toggle on={sound} set={(v) => { const st = loadSettings(); saveSettings({ ...st, sound: v }); setSound(v); }} title="Sound" text="Coins, cards and cheers." />
          <FullScreenButton />
          {onWear && <button class="btn wide" onClick={() => { setMenu(false); setWardrobe(true); }}>Wardrobe</button>}
          <button class="btn wide" onClick={room ? () => setLeaving(true) : onExit}>Home</button>
        </div>
      )}
    </div>
  )}
    </>
  );
}
