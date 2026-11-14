// The Favoured Trade question (rules 18; PLAN-085, the approved Favoured-Trade screen; PLAN-099, flow A). After the
// bell every crate is open at the round table (panels/RushTable.tsx). A stall that holds Favoured Trade and has a tied
// price is then asked, in the middle of the table, whether to play it: a compact card says who is tied and what
// today's rush gives the stall without the card and with it; the line under the table says who sells first as things
// stand and why, and any other tied price; the stall's two buttons stand in the table's foot. A rival deciding reads
// who is tied and that the stall is deciding. Everything here is public after the flip (tieStory.ts).
import type { GameState } from '../../../engine/game';
import { tiedPrices } from '../../../engine/game';
import { FAVOURS, FRUIT } from '../../../engine/data';
import { ART_SIZE, CardArt } from '../../cards';
import { favourArt, favourFocus } from '../../deckArt';
import { listOf, tieStory } from '../tieStory';

/** The tied prices of the stall being asked, in words: "apples at $6 with Rosa". */
export function tieWords(s: GameState, asked: number): string {
  return tiedPrices(s, asked).map((t) => `${FRUIT[t.fruit].plural.toLowerCase()} at $${t.price} with ${listOf(t.rivals.map((i) => s.players[i].name))}`).join('; ');
}

/**
 * Rules 18, the tie step, as the card in the middle of the table: prices and crates have flipped, and a stall that
 * holds Favoured Trade and has a tied price decides, in the open, whether to play it. The stall being asked (`mine`)
 * reads who is tied and what today's rush gives it without the card and with it; its two buttons are TieBar, and why
 * it sells first or not (and any other tied price) is the table's line (TieWhy). Everyone else reads who is tied and
 * that the stall is deciding.
 */
export function TieCard({ s, viewer, asked, mine }: { s: GameState; viewer: number; asked: number; mine?: boolean }) {
  const pl = s.players[asked];
  const t = tieStory(s, asked, mine ? asked : viewer);
  const ties = tieWords(s, asked);
  return (
    <section class={`ds-tie ${mine ? 'mine' : 'theirs'}`} data-a="tie-card"
      aria-label={mine ? `A tied price: ${ties}. Play Favoured Trade or keep it` : `${pl.name} has a tied price and is deciding whether to play Favoured Trade`}>
      <header class="ds-tie-kind" data-a="tie-kind"><span>Favour · {mine ? 'your card' : `${pl.name}'s card`}</span><b>{FAVOURS.favouredTrade.title}</b></header>
      {/* the card's own picture, where the middle of the table has the room (rushTable.css) */}
      <div class="ds-tie-art" aria-hidden="true"><CardArt src={favourArt('favouredTrade')} alt="" w={ART_SIZE.small[0]} h={ART_SIZE.small[1]} eager focus={favourFocus('favouredTrade')} /></div>
      <div class="ds-tie-body">
        <b class="ds-tie-ttl">{t.title}</b>
        {t.without && <div class="ds-tie-line"><b class="ds-lab">Without it</b><span>{t.without}</span></div>}
        {t.with && <div class="ds-tie-line with"><b class="ds-lab">With it</b><span>{t.with}</span></div>}
        <p class="ds-tie-foot">{mine ? 'Once played, the card is gone. Rivals can see you\'re deciding.' : `${pl.name} is deciding…`}</p>
      </div>
    </section>
  );
}

/** Who sells first on the tied price as things stand, and what the card does, and any other tied price: the line under
 *  the table while the question is asked (tieStory.ts `why` and `also`). */
export function TieWhy({ s, viewer, asked, mine }: { s: GameState; viewer: number; asked: number; mine?: boolean }) {
  const t = tieStory(s, asked, mine ? asked : viewer);
  return <span class="rt-why" data-a="tie-note">{t.also ? `${t.why} ${t.also}` : t.why}</span>;
}

/** The asked stall's two buttons, in the table's foot. "Keep it" is drawn on the left and "Play it" on the right, as on
 *  the approved screen (rushTable.css turns the row round); in the page "Play it" comes first, as it always has, so the
 *  browser scripts that press the first button still play the card. */
export function TieBar({ onDecide }: { onDecide: (play: boolean) => void }) {
  return (
    <div class="pp-lock ds-tie-lock">
      <button type="button" class="btn primary wide big" onClick={(e) => { e.stopPropagation(); onDecide(true); }}>Play it</button>
      <button type="button" class="btn ghost wide big" onClick={(e) => { e.stopPropagation(); onDecide(false); }}>Keep it</button>
    </div>
  );
}

/** The tie step's words and buttons drawn whole (no hooks, so tests can draw them): the card, the line, and the asked
 *  stall's buttons. */
export function TiePanel({ s, viewer, asked, onDecide }: { s: GameState; viewer: number; asked: number; onDecide?: (play: boolean) => void }) {
  return (
    <>
      <TieCard s={s} viewer={viewer} asked={asked} mine={!!onDecide} />
      <TieWhy s={s} viewer={viewer} asked={asked} mine={!!onDecide} />
      {onDecide && <TieBar onDecide={onDecide} />}
    </>
  );
}
