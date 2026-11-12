// The bar along the bottom: what's happening now, and the main button for this phase.
// While you buy, Undo and Done keep their places the whole time (PLAN-085): they are not taken away while a piece is
// on its way, and a tap on Done then is kept until the piece has landed.
import { count, type Player } from '../../../engine/game';
import { Face } from '../../art';
import * as A from '../../anim';
import { fx } from '../../fx';
import { releaseStock } from '../../stockShown';
import { shownBoughtCount } from '../../tableShown';
import type { GameController } from '../useGameController';

export function ActionBar({ c, pl, limit, picker, online }: { c: GameController; pl: Player | undefined; limit: number; picker: number; online: boolean }) {
  const { s, busy, night, active, activeHuman, votedMe, waitingFor, humansNotVoted, humansMissingBids, freeFruit, turnStart } = c;
  // Rules 18: a stall with no ripe fruit takes no stocking or pricing turn, so its player was never asked.
  const nothingRipe = !!s.players[c.viewer] && count(s.players[c.viewer].stock, undefined, true) === 0;
  const myBuy = s.phase === 'buy' && activeHuman && !!pl;
  const rivalBuy = s.phase === 'buy' && !activeHuman;
  // The lorry is unloading: buying has just started and nobody has bought yet.
  const unloading = busy && s.phase === 'buy' && s.turn === 0 && !s.players.some((x) => x.boughtToday > 0);
  // A beat that plays by itself says what it is. Not on your own buying turn: the buttons stay where they are.
  const beat = !busy || myBuy ? null
    : night ? 'Night falls…'
    : s.phase === 'morning' || unloading ? 'The cart rolls in…'
    : s.phase === 'reveal' ? 'Selling… tap to speed up'
    : null;
  const bought = pl ? shownBoughtCount(active, pl.boughtToday) : 0;
  return (
    <footer class="actionbar">
      {busy && s.phase === 'reveal' && <button class="btn skip" onClick={(e) => { e.stopPropagation(); A.hurryUp(); releaseStock(); }}>Skip ⏩</button>}
      {beat && <div class="hint-bar">{beat}</div>}
      {!busy && s.phase === 'morning' && (votedMe
        ? <div class="hint-bar waiting-dots">Waiting for {waitingFor(humansNotVoted)}</div>
        : picker >= 0 ? <div class="hint-bar">Pick a perk to start buying</div>
        : <button class="btn primary wide big" onClick={c.proceed}>Start buying</button>)}
      {myBuy && pl && (
        <>
          <button class="btn ghost" aria-label="Undo purchases" disabled={online ? pl.boughtToday === 0 : !turnStart.current || turnStart.current === s} onClick={c.undo}>↶</button>
          {/* A free fruit to pick is said on the Done button itself: a hint between the two buttons used to push Done
              along and make it narrower, and they keep their places the whole turn. */}
          <button class="btn primary big" onClick={() => { fx.tap(); c.endBuy(); }}>{bought ? 'Done buying' : 'Skip buying'} <small class="btn-sub">{freeFruit !== null ? 'pick a free fruit' : `${Math.max(0, limit - bought)} more allowed`}</small></button>
        </>
      )}
      {!beat && rivalBuy && <div class="hint-bar">{pl && <Face who={pl.avatar} size={22} />} {pl?.name} is shopping…</div>}
      {!beat && s.phase === 'order' && <div class={`hint-bar ${online ? 'waiting-dots' : ''}`}>{online ? `Bid in. Waiting for ${waitingFor(humansMissingBids) || 'the market'}` : 'Rivals are bidding for the order…'}</div>}
      {!beat && s.phase === 'stall' && <div class={`hint-bar ${online ? 'waiting-dots' : ''}`}>{online ? `${nothingRipe ? 'Nothing ripe to put out' : 'Stall open'}. Waiting for ${waitingFor(humansMissingBids) || 'the market'}` : 'Rivals are opening their stalls…'}</div>}
      {!beat && s.phase === 'bid' && <div class={`hint-bar ${online ? 'waiting-dots' : ''}`}>{online ? `Prices locked. Waiting for ${waitingFor(humansMissingBids) || 'the market'}` : 'Rivals are setting secret prices…'}</div>}
      {!beat && s.phase === 'tie' && <div class="hint-bar">{pl && <Face who={pl.avatar} size={22} />} {pl?.name} has a tied price and is deciding…</div>}
      {!busy && s.phase === 'evening' && activeHuman && <button class="btn primary wide big" onClick={() => { fx.tap(); c.act({ kind: 'endEvening' }); }}>Lights out <small class="btn-sub">next day</small></button>}
      {/* an evening beat of your own (an upgrade being built): the bar keeps its room */}
      {busy && !beat && s.phase === 'evening' && activeHuman && <div class="hint-bar" />}
      {!beat && s.phase === 'evening' && !activeHuman && <div class="hint-bar">{pl && <Face who={pl.avatar} size={22} />} {pl?.name} is closing up…</div>}
      {!busy && s.phase === 'reveal' && (votedMe
        ? <div class="hint-bar waiting-dots">Waiting for {waitingFor(humansNotVoted)}</div>
        : <button class="btn primary wide big" onClick={() => { c.setHandedTo(null); c.proceed(); }}>
            {s.day >= s.config.days ? 'See final results' : 'Close for the day'}
          </button>)}
    </footer>
  );
}
