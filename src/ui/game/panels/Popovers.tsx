// Pop-ups over the table: today's event, the coach tip, a favour card, the demand bar help,
// a customer's order and the pause menu. (A rival's stall opens below their seat; see table.tsx.)
import { FAVOURS, lookOf } from '../../../engine/data';
import { canPlayFavour, effectiveMax } from '../../../engine/game';
import { track } from '../../../net/telemetry';
import { Face, FavourIcon, Fruit } from '../../art';
import { markSeen, type Tip } from '../../tutorial';
import { MorningCard } from './MorningCard';
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

export function Popovers({ c, coach, onExit }: { c: GameController; coach: Tip | null; onExit: () => void }) {
  const { s, active, cardInfo, setCardInfo, pulseInfo, setPulseInfo, tip, setTip, menu, setMenu } = c;
  return (
    <>
  {coach && (
    // While pricing, the tip sits at the top so it never covers the Seal button.
    <div class={`coach ${c.s.phase === 'bid' || c.s.phase === 'stall' ? 'top' : ''}`} role="note">
      <b>{coach.title}</b>
      <span>{coach.text}</span>
      <button class="btn small" onClick={(e) => { e.stopPropagation(); markSeen(coach.id); track('tutorial', coach.id); c.setTipTick((n) => n + 1); }}>Got it</button>
    </div>
  )}

  {cardInfo !== null && s.players[active]?.favours[cardInfo] && (() => {
    const d = FAVOURS[s.players[active].favours[cardInfo]];
    const why = canPlayFavour(s, active, cardInfo);
    return (
      <div class="card-pop" onClick={(e) => e.stopPropagation()}>
        <span class="cp-icon"><FavourIcon id={d.id} size={32} /></span>
        <div class="cp-text"><b>{d.title}</b><small>{d.text}</small>{why && <small class="warn-text">{why}</small>}</div>
        <div class="cp-btns">
          {!why && <button class="btn primary" onClick={() => c.reallyPlay(cardInfo)}>Play</button>}
          <button class="btn ghost" onClick={() => setCardInfo(null)}>✕</button>
        </div>
      </div>
    );
  })()}

  {pulseInfo && (
    <div class="tip-pop" onClick={() => setPulseInfo(false)}>
      <b>Demand vs supply</b>
      <span><b>want</b> = fruit today's customers still want{s.phase === 'buy' || s.phase === 'morning' ? ' (+ = walk-ins not here yet)' : ''}.</span>
      <span><b>in shops</b> = ripe fruit all shops (you included) could sell.</span>
      <span class="pz-legend"><i class="good" /> enough buyers: prices stay high · <i class="war" /> more fruit than buyers: price war · <i class="open" /> nobody has any yet</span>
      <small>Tap to close.</small>
    </div>
  )}
  {tip && (
    <div class="tip-pop" onClick={() => setTip(null)}>
      <b class="tip-head"><Face who={tip.name} size={32} /> {lookOf(tip.name).title}{tip.name === s.event?.extra?.name ? ' (special order)' : ''}</b>
      <i class="quirk">“{lookOf(tip.name).quirk}”</i>
      {tip.wants.map((w) => (
        <div class="tip-line">
          <Fruit id={w.fruit} size={18} />
          <span>wants <b>{w.qty}</b> · pays up to <b>${effectiveMax(s, w)} for each</b> fresh one</span>
        </div>
      ))}
      <small>Older fruit sells for less: the −$ on your stall shows how much less. Tap to close.</small>
    </div>
  )}


  {menu && (
    <div class="modal-bg" onClick={() => setMenu(false)}>
      <div class="modal center" onClick={(e) => e.stopPropagation()}>
        <h2>Paused</h2>
        <p class="muted">Your game is saved automatically.</p>
        <button class="btn primary wide" onClick={() => setMenu(false)}>Resume</button>
        <button class="btn wide" onClick={onExit}>Quit to menu</button>
      </div>
    </div>
  )}
    </>
  );
}
