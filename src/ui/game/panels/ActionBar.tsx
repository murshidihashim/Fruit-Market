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
  // The bell and the rush (PLAN-091): the bar says nothing from the bell to the takings. While the bell rings its sheet
  // says what it is ("The bell · Every crate and every price is open"), and the approved Favoured-Trade screen draws no
  // words under it; a tap on the table ends it. Once a customer's card is up, the rush sheet has its own buttons and
  // lies over this bar. Skip stays on the page until the takings, unseen and out of reach: the performance script
  // times the rush by it (scripts/perf-budget.cjs); the rush card's own "Skip to the end" is the one a person taps.
  const selling = busy && s.phase === 'reveal' && !night;
  // A beat that plays by itself says what it is ('': a beat that has nothing to add here, and no other hint shows
  // then either). Not on your own buying turn: the buttons stay where they are.
  const beat = !busy || myBuy ? null
    // The night's own heading says it (the text audit, entry 391): the bar is empty, and no other hint shows then.
    : night ? ''
    : s.phase === 'morning' || unloading ? 'The lorry arrives…'
    // The bell rings before the rush, and at the flip before a Favoured Trade question; a card just played travels to
    // its tag under the open rows (PLAN-085).
    : s.phase === 'reveal' || s.phase === 'tie' ? ''
    : null;
  const quiet = beat === null;
  const bought = pl ? shownBoughtCount(active, pl.boughtToday) : 0;
  return (
    <footer class="actionbar">
      {selling && <button class="btn skip" style="visibility:hidden" aria-hidden="true" tabIndex={-1}
        onClick={(e) => { e.stopPropagation(); A.hurryUp(); releaseStock(); }}>Skip</button>}
      {!quiet && <div class="hint-bar">{beat}</div>}
      {!busy && s.phase === 'morning' && (votedMe
        ? <div class="hint-bar waiting-dots">Waiting for {waitingFor(humansNotVoted)}</div>
        : picker >= 0 ? <div class="hint-bar">Pick a perk to start buying</div>
        : <button class="btn primary wide big" onClick={c.proceed}>Start buying</button>)}
      {myBuy && pl && (
        <>
          <button class="btn ghost" aria-label="Undo purchases" disabled={online ? pl.boughtToday === 0 : !turnStart.current || turnStart.current === s} onClick={c.undo}>↶</button>
          {/* A free fruit to pick is said on the Done button itself: a hint between the two buttons used to push Done
              along and make it narrower, and they keep their places the whole turn. */}
          <button class="btn primary big" onClick={() => { fx.tap(); c.endBuy(); }}>{bought ? 'Done buying' : 'Skip buying'} <small class="btn-sub">{freeFruit !== null ? 'pick a free piece' : `${Math.max(0, limit - bought)} more allowed`}</small></button>
        </>
      )}
      {quiet && rivalBuy && <div class="hint-bar">{pl && <Face who={pl.avatar} size={22} />} {pl?.name} is buying…</div>}
      {quiet && s.phase === 'order' && <div class={`hint-bar ${online ? 'waiting-dots' : ''}`}>{online ? `Bid in. Waiting for ${waitingFor(humansMissingBids) || 'the others'}` : 'Rivals are bidding for the standing order…'}</div>}
      {quiet && s.phase === 'stall' && <div class={`hint-bar ${online ? 'waiting-dots' : ''}`}>{online ? `${nothingRipe ? 'Nothing ripe to sell' : 'Stall open'}. Waiting for ${waitingFor(humansMissingBids) || 'the others'}` : 'Rivals are filling their crates…'}</div>}
      {quiet && s.phase === 'bid' && <div class={`hint-bar ${online ? 'waiting-dots' : ''}`}>{online ? `Prices sealed. Waiting for ${waitingFor(humansMissingBids) || 'the others'}` : 'Rivals are setting secret prices…'}</div>}
      {quiet && s.phase === 'tie' && <div class="hint-bar">{pl && <Face who={pl.avatar} size={22} />} {pl?.name} has a tied price and is deciding…</div>}
      {!busy && s.phase === 'evening' && activeHuman && <button class="btn primary wide big" onClick={() => { fx.tap(); c.act({ kind: 'endEvening' }); }}>Lights out <small class="btn-sub">next day</small></button>}
      {/* an evening beat of your own (an upgrade being built): the bar keeps its room */}
      {busy && quiet && s.phase === 'evening' && activeHuman && <div class="hint-bar" />}
      {quiet && s.phase === 'evening' && !activeHuman && <div class="hint-bar">{pl && <Face who={pl.avatar} size={22} />} {pl?.name} is closing up…</div>}
      {!busy && s.phase === 'reveal' && (votedMe
        ? <div class="hint-bar waiting-dots">Waiting for {waitingFor(humansNotVoted)}</div>
        : <button class="btn primary wide big" onClick={() => { c.setHandedTo(null); c.proceed(); }}>
            {s.day >= s.config.days ? 'See results' : 'Close for the day'}
          </button>)}
    </footer>
  );
}
