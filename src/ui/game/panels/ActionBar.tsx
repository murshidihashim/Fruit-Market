// The bar along the bottom: what's happening now, and the main button for this phase.
import type { Player } from '../../../engine/game';
import { Face } from '../../art';
import * as A from '../../anim';
import { fx } from '../../fx';
import type { GameController } from '../useGameController';

export function ActionBar({ c, pl, limit, picker, online }: { c: GameController; pl: Player | undefined; limit: number; picker: number; online: boolean }) {
  const { s, busy, night, activeHuman, votedMe, waitingFor, humansNotVoted, humansMissingBids, freeFruit, turnStart } = c;
  return (
    <footer class="actionbar">
      {busy && s.phase === 'reveal' && <button class="btn skip" onClick={(e) => { e.stopPropagation(); A.hurryUp(); }}>Skip ⏩</button>}
      {busy && <div class="hint-bar">{night ? 'Night falls…' : s.phase === 'morning' ? 'The cart rolls in…' : s.phase === 'reveal' ? 'Selling… tap to speed up' : pl?.kind === 'human' ? 'Bought!' : `${pl?.name ?? ''} is shopping…`}</div>}
      {!busy && s.phase === 'morning' && (votedMe
        ? <div class="hint-bar waiting-dots">Waiting for {waitingFor(humansNotVoted)}</div>
        : picker >= 0 ? <div class="hint-bar">Pick a trait to open the market</div>
        : <button class="btn primary wide big" onClick={c.proceed}>Open the market</button>)}
      {!busy && s.phase === 'buy' && activeHuman && pl && (
        <>
          {!online && <button class="btn ghost" aria-label="Undo purchases" disabled={!turnStart.current || turnStart.current === s} onClick={c.undo}>↶</button>}
          <div class="buy-hint"><b class="move">{freeFruit !== null ? 'Pick a free fruit' : 'Your move'}</b><small>Tap a fruit in the market · {pl.boughtToday}/{limit} bought</small></div>
          <button class="btn primary big" onClick={() => { fx.tap(); c.setFreeFruit(null); c.act({ kind: 'endBuy' }); }}>{pl.boughtToday ? 'Done buying ➜' : 'Skip buying ➜'}</button>
        </>
      )}
      {!busy && s.phase === 'buy' && !activeHuman && <div class="hint-bar">{pl && <Face who={pl.avatar} size={22} />} {pl?.name} is shopping…</div>}
      {!busy && s.phase === 'bid' && <div class={`hint-bar ${online ? 'waiting-dots' : ''}`}>{online ? `Prices locked. Waiting for ${waitingFor(humansMissingBids) || 'the market'}` : 'Rivals are setting secret prices…'}</div>}
      {!busy && s.phase === 'evening' && activeHuman && <button class="btn primary wide big" onClick={() => { fx.tap(); c.act({ kind: 'endEvening' }); }}>Lights out · next day</button>}
      {!busy && s.phase === 'evening' && !activeHuman && <div class="hint-bar">{pl && <Face who={pl.avatar} size={22} />} {pl?.name} is closing up…</div>}
      {!busy && s.phase === 'reveal' && (votedMe
        ? <div class="hint-bar waiting-dots">Waiting for {waitingFor(humansNotVoted)}</div>
        : <button class="btn primary wide big" onClick={() => { c.setHandedTo(null); c.proceed(); }}>
            {s.day >= s.config.days ? 'See final results' : 'Close for the day'}
          </button>)}
    </footer>
  );
}
