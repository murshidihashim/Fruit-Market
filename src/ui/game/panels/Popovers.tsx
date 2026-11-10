// Pop-ups over the table: today's event, the coach tip, a favour card, the demand bar help,
// a customer's order and the pause menu. (A rival's stall opens below their seat; see table.tsx.)
import { FAVOURS, FRUIT, PREF_INFO, lookOf } from '../../../engine/data';
import { canPlayFavour, effectiveMax } from '../../../engine/game';
import { track } from '../../../net/telemetry';
import { FavourIcon } from '../../art';
import { Ticket } from '../../ticket';
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
      <b>What customers want</b>
      <span>The number on each lane is the pieces today's customers still want{s.phase === 'buy' || s.phase === 'morning' ? ' (+ means walk-ins who are not here yet may want more)' : ''}.</span>
      <span>Stalls are secret: you cannot see what a rival holds, only how many pieces it puts out for sale.</span>
      <small>Tap to close.</small>
    </div>
  )}
  {tip && (
    <div class="tip-pop tip-card-pop" role="dialog" aria-label={lookOf(tip.name).title} onClick={() => setTip(null)}>
      <Ticket who={tip.name} class="big" quirk lines={tip.wants.map((w) => ({ fruit: w.fruit, qty: w.qty, max: effectiveMax(s, w, tip.generous), done: w.qty <= 0 }))} />
      <div class="tip-notes">
        {tip.name === s.event?.extra?.name && <b class="tip-special">Special order</b>}
        {tip.pref && <small class="tip-pref"><b>{PREF_INFO[tip.pref].title}:</b> {PREF_INFO[tip.pref].text}</small>}
        <small>Each price is the most they pay for one fresh fruit. Older fruit sells for less: ${FRUIT.apple.drop[1]} less when okay, ${FRUIT.apple.drop[0]} less when soft (the letters on your shelf). Tap to close.</small>
      </div>
    </div>
  )}


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
