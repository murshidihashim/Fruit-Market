// The bar along the bottom: what's happening now, and the main button for this phase.
import type { Player } from '../../../engine/game';
import { Face } from '../../art';
import * as A from '../../anim';
import { fx } from '../../fx';
import { releaseStock } from '../../stockShown';
import type { GameController } from '../useGameController';

export function ActionBar({ c, pl, limit, picker, online }: { c: GameController; pl: Player | undefined; limit: number; picker: number; online: boolean }) {
  const { s, busy, night, activeHuman, votedMe, waitingFor, humansNotVoted, humansMissingBids, freeFruit, turnStart } = c;
  return (
    <footer class="actionbar">
      {busy && s.phase === 'reveal' && <button class="btn skip" onClick={(e) => { e.stopPropagation(); A.hurryUp(); releaseStock(); }}>Skip ⏩</button>}
      {busy && <div class="hint-bar">{night ? 'Night falls…' : s.phase === 'morning' || (s.phase === 'buy' && s.turn === 0 && !s.players.some((x) => x.boughtToday > 0)) ? 'The cart rolls in…' : s.phase === 'reveal' ? 'Selling… tap to speed up' : pl?.kind === 'human' ? 'Bought!' : `${pl?.name ?? ''} is shopping…`}</div>}
      {!busy && s.phase === 'morning' && (votedMe
        ? <div class="hint-bar waiting-dots">Waiting for {waitingFor(humansNotVoted)}</div>
        : picker >= 0 ? <div class="hint-bar">Pick a perk to start buying</div>
        : <button class="btn primary wide big" onClick={c.proceed}>Start buying</button>)}
      {!busy && s.phase === 'buy' && activeHuman && pl && (
        <>
          <button class="btn ghost" aria-label="Undo purchases" disabled={online ? pl.boughtToday === 0 : !turnStart.current || turnStart.current === s} onClick={c.undo}>↶</button>
          {freeFruit !== null && <div class="buy-hint"><b class="move">Pick a free fruit</b></div>}
          <button class="btn primary big" onClick={() => { fx.tap(); c.setFreeFruit(null); c.act({ kind: 'endBuy' }); }}>{pl.boughtToday ? 'Done buying' : 'Skip buying'} <small class="btn-sub">{Math.max(0, limit - pl.boughtToday)} more allowed</small></button>
        </>
      )}
      {!busy && s.phase === 'buy' && !activeHuman && <div class="hint-bar">{pl && <Face who={pl.avatar} size={22} />} {pl?.name} is shopping…</div>}
      {!busy && s.phase === 'order' && <div class={`hint-bar ${online ? 'waiting-dots' : ''}`}>{online ? `Bid in. Waiting for ${waitingFor(humansMissingBids) || 'the market'}` : 'Rivals are bidding for the order…'}</div>}
      {!busy && s.phase === 'stall' && <div class={`hint-bar ${online ? 'waiting-dots' : ''}`}>{online ? `Stall open. Waiting for ${waitingFor(humansMissingBids) || 'the market'}` : 'Rivals are opening their stalls…'}</div>}
      {!busy && s.phase === 'bid' && <div class={`hint-bar ${online ? 'waiting-dots' : ''}`}>{online ? `Prices locked. Waiting for ${waitingFor(humansMissingBids) || 'the market'}` : 'Rivals are setting secret prices…'}</div>}
      {!busy && s.phase === 'evening' && activeHuman && <button class="btn primary wide big" onClick={() => { fx.tap(); c.act({ kind: 'endEvening' }); }}>Lights out <small class="btn-sub">next day</small></button>}
      {!busy && s.phase === 'evening' && !activeHuman && <div class="hint-bar">{pl && <Face who={pl.avatar} size={22} />} {pl?.name} is closing up…</div>}
      {!busy && s.phase === 'reveal' && (votedMe
        ? <div class="hint-bar waiting-dots">Waiting for {waitingFor(humansNotVoted)}</div>
        : <button class="btn primary wide big" onClick={() => { c.setHandedTo(null); c.proceed(); }}>
            {s.day >= s.config.days ? 'See final results' : 'Close for the day'}
          </button>)}
    </footer>
  );
}
