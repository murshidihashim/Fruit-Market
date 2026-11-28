// Pop-ups over the table: today's event, the coach tip, a favour card, the demand bar help,
// a customer's order and the pause menu. (A rival's stall opens below their seat; see table.tsx.)
import { noteOpen } from '../../../net/recorder';
import { FAVOURS, ORDER_CARDS, lookOf } from '../../../engine/data';
import { canPlayFavour, effectiveMax, handLimit } from '../../../engine/game';
import { track } from '../../../net/telemetry';
import { FavourCard, OrderCard, TradingCard } from '../../cards';
import { GUEST_EVENT } from '../../deckArt';
import { markSeen, skipTutorial, type Tip } from '../../tutorial';
import { MorningCard } from './MorningCard';
import { priorityNote, priorityWouldReturn } from '../evening';
import { FullScreenButton } from '../../FullScreenButton';
import { TrapBox, useFocusTrap } from '../../focusTrap';
import { Wardrobe } from '../../Wardrobe';
import { HowTo } from '../../HowTo';
import { setBaseSpeed, setStill } from '../../motion';
import { FAST_PLAY, REDUCED_MOTION, phoneStill } from '../../settingWords';
import { useRef, useState } from 'preact/hooks';
import type { Customer, GameState } from '../../../engine/game';
import { usePopFrom } from '../popMotion';
import { loadSettings, saveSettings, type Settings } from '../../store';
import { Toggle } from '../../Toggle';
import type { GameController } from '../useGameController';

/** S3 (DEC-120): said on a favour card about to be played on a buying turn. */
export const UNDO_AFTER_CARD = 'Once played, it stays played. Undo then takes back only what you buy after it.';

/** The badge in the top bar that today's event card is drawn from and put back to. */
const EVENT_BADGE = '.tk-top .tk-event';
/** The parts of the sheet under the event card (dawn's money, the lorry, tomorrow, Close): they rise into place once
 *  the card has been drawn, and fade as it goes back. */
const UNDER_EVENT = ':scope > .morning-card > :not(.wc-flip), :scope > .btn';

/**
 * Today's event, opened from the badge in the top bar (PLAN-128, the owner: "drawing a card"). The card leaves the
 * badge face down, travels to the middle of the screen as it grows, and turns over there (FEEL.turn, cards.css); the
 * lorry, tomorrow and Close then rise into place under it (popMotion.ts). The table stays where it is, dimmed under a
 * translucent backdrop. A tap beside the cards, Close or Escape puts it back: it travels back to the badge and the
 * backdrop fades. A tap while it is being drawn ends the move at once. With reduced motion the card is simply there,
 * face up, and goes at once.
 */
export function EventPop({ c, viewer, shared }: { c: GameController; viewer: number; shared?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const pop = usePopFrom(root, '.wc-flip', UNDER_EVENT, () => document.querySelector(EVENT_BADGE), () => c.setEventInfo(false));
  // Keyboard focus stays in the pop-up while it is open; Escape puts the card back.
  useFocusTrap(root, pop.close);
  // A tap while the card is on its way ends the move at once; once it is open, a tap beside the cards puts it back.
  const tap = (e: MouseEvent) => {
    e.stopPropagation();
    if (pop.step === 'draw') pop.hurry();
    else if (!(e.target as Element).closest?.('.wc-flip, .tk-unload, .mt-next, .dw, .mc-loss')) pop.close();
  };
  return (
    <div ref={root} tabIndex={-1} class={`full-sheet event-sheet ev-pop ${pop.step === 'draw' ? 'drawing' : ''}`} role="dialog" aria-modal="true"
      aria-label="Today and tomorrow" onClick={tap}>
      <MorningCard s={c.s} viewer={viewer} lost={0} shared={shared} />
      <button type="button" class="btn primary big wide" onClick={(e) => { e.stopPropagation(); pop.close(); }}>Close</button>
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

/** A favour card you hold, opened from the dock or the evening: the whole card, why it cannot be played now (or what
 *  playing it means), then Play (when it can be played now) and Close. It is the card of the stall this phone plays for
 *  now (`actor`: online its own seat, which in the evening need not be the stall whose turn it is). */
export function FavourPopView({ s, actor, idx, onPlay, onClose }: { s: GameState; actor: number; idx: number; onPlay: () => void; onClose: () => void }) {
  const id = s.players[actor].favours[idx];
  const why = canPlayFavour(s, actor, idx);
  return (
    <div class="cd-pop-in" onClick={(e) => e.stopPropagation()}>
      <FavourCard id={id} hold={handLimit(s.players[actor])} eager />
      {why && <p class="cd-pop-why">{why}</p>}
      {/* Rules 19: a Priority card played after one from a stall earlier in today's line-up goes back to the hand. */}
      {!why && id === 'priority' && priorityWouldReturn(s, actor) && <p class="cd-pop-why">{priorityNote(s, actor)}</p>}
      {/* S3 (DEC-120): Undo takes back purchases only, so a card played on a buying turn is said to stay played. */}
      {!why && s.phase === 'buy' && <p class="cd-pop-why">{UNDO_AFTER_CARD}</p>}
      <div class="cd-pop-btns">
        {!why && <button type="button" class="btn primary" onClick={onPlay}>Play</button>}
        <button type="button" class="btn ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

/** A customer's own card, opened from their ticket (PLAN-083): the whole card with today's prices; a standing order
 *  collected today shows its order card. The card's legend is the key to the prices. */
export function CustomerPopView({ s, tip }: { s: GameState; tip: Customer }) {
  const order = tip.order ? ORDER_CARDS.find((x) => x.name === tip.name) : undefined;
  const qty = (i: number) => (tip.wants[i].qty <= 0 ? tip.original?.[i]?.qty ?? 0 : tip.wants[i].qty);
  return (
    <div class="cd-pop-in">
      {order && tip.order
        ? <OrderCard card={order} qty={tip.original?.[0]?.qty ?? tip.wants[0]?.qty ?? 0} due="Due today" bid={tip.order.price} stake={tip.order.stake} />
        : <TradingCard who={tip.name} guest={!!GUEST_EVENT[tip.name]} eager
            wants={tip.wants.map((w, i) => ({ fruit: w.fruit, qty: qty(i), max: effectiveMax(s, w, tip.generous), done: w.qty <= 0 }))} />}
      <small class="cd-pop-hint">Tap to close</small>
    </div>
  );
}

/** `room`: online, the room's code (ON-08: the menu names it, and Home asks first, since the match goes on). */
export function Popovers({ c, coach, onExit, onWear, room }: { c: GameController; coach: Tip | null; onExit: () => void; onWear?: (look: Record<string, string>) => void; room?: string }) {
  const [wardrobe, setWardrobe] = useState(false);
  // ON-08: online, Home first asks whether to leave the match.
  const [leaving, setLeaving] = useState(false);
  // S19: the sound switch, as in Settings. REP-140 B-15: Fast play and Reduced motion too, the same settings as the
  // Settings screen, each taking effect at once; and How to play, which opens over the game and closes back to it.
  const [sound, setSound] = useState(() => loadSettings().sound);
  const [fast, setFast] = useState(() => loadSettings().fast);
  const [still, setStillOn] = useState(() => loadSettings().still);
  const [howto, setHowto] = useState(false);
  const phone = phoneStill();
  const setting = (patch: Partial<Settings>) => saveSettings({ ...loadSettings(), ...patch });
  const closeMenu = () => { setLeaving(false); c.setMenu(false); };
  const unsent = unsentChoice(c.s, c.myBidTurn);
  // `actor`: the stall this phone plays for now (online its own seat, which in the evening need not be `active`).
  const { s, actor, cardInfo, setCardInfo, pulseInfo, setPulseInfo, tip, setTip, menu, setMenu } = c;
  return (
    <>
  {coach && (
    // While pricing, the tip sits at the top so it never covers the Seal button.
    <div class={`coach ${c.s.phase === 'bid' || c.s.phase === 'stall' ? 'top' : ''}`} role="note" data-tip={coach.id}>
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
  {cardInfo !== null && s.players[actor]?.favours[cardInfo] && (
    // B-08 (PLAN-130): keyboard focus stays in the pop-up (Play and Close); Escape closes it.
    <TrapBox class="cd-pop" role="dialog" aria-modal="true" aria-label={`Favour card: ${FAVOURS[s.players[actor].favours[cardInfo]].title}`} onEscape={() => setCardInfo(null)} onClick={(e) => { e.stopPropagation(); setCardInfo(null); }}>
      <FavourPopView s={s} actor={actor} idx={cardInfo} onPlay={() => c.reallyPlay(cardInfo)} onClose={() => setCardInfo(null)} />
    </TrapBox>
  )}

  {pulseInfo && (
    // B-08 (PLAN-130): opened from a lane's head by the keyboard too; Escape, Enter or Space closes it, as a tap does.
    <TrapBox class="tip-pop" role="dialog" aria-modal="true" aria-label="What customers want" onEscape={() => setPulseInfo(false)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPulseInfo(false); } }} onClick={() => setPulseInfo(false)}>
      <b>What customers want</b>
      <span>Each lane shows how many fruits today’s customers potentially want. Use this to plan your purchases.</span>
      <small>Tap to close.</small>
    </TrapBox>
  )}
  {/* A customer's own card, opened from their ticket (PLAN-083): the whole card with today's prices; a standing order
      collected today shows its order card. The card's legend is the key to the prices. Tap anywhere to close. */}
  {tip && (
    // B-09 (PLAN-130): opened from the card's button by Enter or Space too. Focus moves onto the pop-up, Escape, Enter
    // or Space closes it (as a tap does), and focus goes back to the card.
    <TrapBox class="cd-pop" role="dialog" aria-modal="true" aria-label={lookOf(tip.name).title} onEscape={() => setTip(null)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTip(null); } }}
      onClick={(e) => { e.stopPropagation(); setTip(null); }}>
      <CustomerPopView s={s} tip={tip} />
    </TrapBox>
  )}


  {wardrobe && onWear && <div class="wd-overlay"><Wardrobe onBack={() => setWardrobe(false)} onChange={onWear} /></div>}
  {howto && <div class="wd-overlay ht-overlay" role="dialog" aria-modal="true" aria-label="How to play"><HowTo onDone={() => setHowto(false)} /></div>}
  {menu && (
    <div class="modal-bg" onClick={closeMenu}>
      {room && leaving ? (
        <TrapBox class="modal center game-menu" role="dialog" aria-modal="true" aria-label="Leave the match?" onEscape={closeMenu} onClick={(e) => e.stopPropagation()}>
          <h2>Leave the match?</h2>
          <p>The match goes on without you: a computer will play for you until you come back.</p>
          <p class="gm-room">To come back, open room {room} from Home.</p>
          {unsent && <p class="gm-warn">{unsent}</p>}
          <button class="btn primary wide" onClick={closeMenu}>Stay in the match</button>
          <button class="btn wide" onClick={onExit}>Leave</button>
        </TrapBox>
      ) : (
        <TrapBox class="modal center game-menu" role="dialog" aria-modal="true" aria-label="Menu" onEscape={closeMenu} onClick={(e) => e.stopPropagation()}>
          {/* ON-08: an online match never pauses, so online the menu says so and names the room. */}
          <h2>{room ? 'Menu' : 'Paused'}</h2>
          {room
            ? <p class="gm-room">Room {room}. The match goes on while this menu is open.</p>
            : <p class="muted">Your game is saved automatically.</p>}
          {unsent && <p class="gm-warn">{unsent}</p>}
          <button class="btn primary wide" onClick={closeMenu}>{room ? 'Back to the match' : 'Resume'}</button>
          <Toggle on={sound} set={(v) => { setting({ sound: v }); setSound(v); }} title="Sound" text="Coins, cards and cheers." />
          <Toggle on={fast} set={(v) => { setting({ fast: v }); setFast(v); setBaseSpeed(v); }} title={FAST_PLAY.title} text={FAST_PLAY.text} />
          <Toggle on={still || phone} set={(v) => { setting({ still: v }); setStillOn(v); setStill(v); }} title={REDUCED_MOTION.title} text={REDUCED_MOTION.text(phone)} />
          <button class="btn wide" data-a="menu-howto" onClick={() => { setMenu(false); noteOpen('how_to_play'); setHowto(true); }}>How to play</button>
          <FullScreenButton />
          {onWear && <button class="btn wide" onClick={() => { setMenu(false); setWardrobe(true); }}>Wardrobe</button>}
          <button class="btn wide" onClick={room ? () => setLeaving(true) : onExit}>Home</button>
        </TrapBox>
      )}
    </div>
  )}
    </>
  );
}
