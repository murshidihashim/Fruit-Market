// The bell and the Favoured Trade question (rules 15 and 18; PLAN-085, the approved Favoured-Trade screen). Both are
// steps of the one sheet that stays on the table from stocking to the day's takings (DaySheet.tsx).
// Before the bell a rival's crate is shut: only how many pieces it put out is known. At the bell every stall's row
// shows its price tags (CratesOpen), stall by stall in today's line-up. A stall that holds Favoured
// Trade and has a tied price is then asked, under the open rows, whether to play it (TieCard).
// Nothing here reads a rival's crate or price before the flip (pricingTable.ts bellRows returns nothing until then).
import type { ComponentChildren } from 'preact';
import type { GameState } from '../../../engine/game';
import { tiedPrices } from '../../../engine/game';
import { FAVOURS, FRUIT } from '../../../engine/data';
import { tagOf } from '../../../net/looks';
import { Fruit } from '../../art';
import { shownAvatar } from '../../looks';
import { STAGE_LETTER, STAGE_WORD, Swatch } from '../../ticket';
import { bellRows, nth, type BellRow } from '../pricingTable';
import { listOf, tieStory } from '../tieStory';

/** At most this many freshness letters stand on a price tag; "+2" stands for the rest. */
const MAX_TAG_MARKS = 3;

/** What a stall's row says aloud once it is open: "Saleh: 1 mangoes at $10, 1 apples at $5", and its tied prices in
 *  the game's words ("tied: apples at $5 with Rosa"). */
const rowSaid = (s: GameState, x: BellRow, shared?: boolean) => {
  const ties = tieWords(s, x.player);
  return `${x.me && !shared ? 'Your crate' : s.players[x.player].name}: ${x.tags.length ? x.tags.map((t) => `${t.out} ${FRUIT[t.f].plural.toLowerCase()} at $${t.price}`).join(', ') : 'empty crate'}${ties ? `; tied: ${ties}` : ''}`;
};

/**
 * The bell: every stall's row in today's line-up, with a price tag for each fruit it put out (the price and the
 * freshness of its pieces). A tag another stall matches is marked; a tag Favoured Trade was played on is stamped.
 * `open`: how many rows have turned face up so far while the bell rings (null: every row is open). A row that has
 * not turned yet shows the backs of its tags and nothing else. `shared`: several people share this phone, so a
 * stall's row carries its name and not "You".
 */
export function CratesOpen({ s, viewer, open = null, shared, answered, children }: {
  s: GameState; viewer: number; open?: number | null; shared?: boolean;
  /** This stall has just answered the Favoured Trade question: its card said who is tied, so it is not told again. */
  answered?: boolean; children?: ComponentChildren;
}) {
  const rows = bellRows(s, viewer);
  // Your own tied prices in the game's words, under the rows, when the rush is next (while a Favoured Trade question
  // is asked, its card says who is tied). It keeps its place while the bell rings and fades in once every row is
  // open: a tie is not told before the rival's row has turned. Not on a shared phone, where "your" is nobody's.
  const tied = !shared && !answered && s.phase === 'reveal' ? tieWords(s, viewer) : '';
  const told = open === null || open >= rows.length;
  return (
    <div class="ds-bell" role="status" aria-label="The bell: every crate is open">
      <div class="ds-bell-head">
        <i class="ds-bell-ico" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 20 20"><path d="M10 2a5 5 0 0 0-5 5v4l-2 3h14l-2-3V7a5 5 0 0 0-5-5zm-2 14a2 2 0 0 0 4 0z" fill="currentColor" /></svg></i>
        <b>The bell</b><span>Every crate and every price is open.</span>
      </div>
      <div class={`ds-stalls n${rows.length}`}>
        {rows.map((x, i) => {
          const pl = s.players[x.player];
          const up = open === null || i < open;
          return (
            <div key={`o${x.player}`} class={`ds-stall ${x.me ? 'me' : ''} ${up ? 'up' : 'down'}`} role="group" data-a={`bell-p${x.player}`}
              aria-label={up ? rowSaid(s, x, shared) : `${x.me && !shared ? 'Your crate' : pl.name}: still shut`}>
              <Swatch p={x.player} who={shownAvatar(s.players, x.player)} look={pl.look} size={30} />
              <span class="ds-nm"><b>{x.me && !shared ? 'You' : pl.name}</b><small>bought {nth(x.nth)}</small></span>
              <span class="ds-tags">
                {!x.tags.length && up && <span class="ds-none">empty crate</span>}
                {x.tags.map((t) => (up ? (
                  <span class={`ds-pz ${t.tied ? 'tie' : ''} ${t.stamped ? 'stamped' : ''} tg-${tagOf(pl.look)}`} data-a={`bell-${x.player}-${t.f}`}>
                    <Fruit id={t.f} size={18} /><b>${t.price}</b>
                    <span class="ds-marks" role="img" aria-label={`${t.out} in the crate: ${t.marks.map((st) => STAGE_WORD[st]).join(', ')}`}>
                      {t.marks.slice(0, MAX_TAG_MARKS).map((st) => <i class={`ds-lamp st-${st}`}>{STAGE_LETTER[st]}</i>)}
                      {t.out > MAX_TAG_MARKS && <em>+{t.out - MAX_TAG_MARKS}</em>}
                    </span>
                    {t.stamped && <i class="ds-stamp" role="img" aria-label={`${FAVOURS.favouredTrade.title} played`}>FT</i>}
                  </span>
                ) : <span class="ds-pz back" aria-hidden="true" />))}
              </span>
            </div>
          );
        })}
      </div>
      {children || (tied ? <p class={`ds-bell-note ${told ? '' : 'wait'}`} data-a="bell-ties" aria-hidden={told ? undefined : 'true'}>{told ? `Your prices are tied: ${tied}.` : ''}</p> : null)}
    </div>
  );
}

/** The tied prices of the stall being asked, in words: "apples at $6 with Rosa". */
export function tieWords(s: GameState, asked: number): string {
  return tiedPrices(s, asked).map((t) => `${FRUIT[t.fruit].plural.toLowerCase()} at $${t.price} with ${listOf(t.rivals.map((i) => s.players[i].name))}`).join('; ');
}

/**
 * Rules 18, the tie step, as the card it is about: prices and crates have flipped, and a stall that holds Favoured
 * Trade and has a tied price decides, in the open, whether to play it. The stall being asked (`mine`) reads who is
 * tied, who sells first as things stand, and what today's rush gives it without the card and with it; its two
 * buttons are TieBar. Everyone else reads who is deciding.
 */
export function TieCard({ s, viewer, asked, mine }: { s: GameState; viewer: number; asked: number; mine?: boolean }) {
  const pl = s.players[asked];
  const t = tieStory(s, asked, mine ? asked : viewer);
  const ties = tieWords(s, asked);
  return (
    <section class={`ds-tie ${mine ? 'mine' : 'theirs'}`} data-a="tie-card"
      aria-label={mine ? `A tied price: ${ties}. Play Favoured Trade or keep it` : `${pl.name} has a tied price and is deciding whether to play Favoured Trade`}>
      <header class="ds-tie-kind" data-a="tie-kind"><span>Favour · {mine ? 'your card' : `${pl.name}'s card`}</span><b>{FAVOURS.favouredTrade.title}</b></header>
      <div class="ds-tie-body">
        <b class="ds-tie-ttl">{t.title}</b>
        <p class="ds-tie-txt" data-a="tie-note">{t.why}</p>
        {t.also && <p class="ds-tie-txt">{t.also}</p>}
        {t.without && <div class="ds-tie-line"><b class="ds-lab">Without it</b><span>{t.without}</span></div>}
        {t.with && <div class="ds-tie-line with"><b class="ds-lab">With it</b><span>{t.with}</span></div>}
        <p class="ds-tie-foot">{mine ? 'The card is discarded once you play it. Rivals can see that you are deciding.' : `${pl.name} is deciding.`}</p>
      </div>
    </section>
  );
}

/** The asked stall's two buttons, in the action bar's place: they close the card's frame. "Keep it" is drawn on the
 *  left and "Play it" on the right, as on the approved screen (bell.css turns the row round); in the page "Play it"
 *  comes first, as it always has, so the browser scripts that press the bar's first button still play the card. */
export function TieBar({ onDecide }: { onDecide: (play: boolean) => void }) {
  return (
    <div class="pp-lock ds-tie-lock">
      <button type="button" class="btn primary wide big" onClick={() => onDecide(true)}>Play it</button>
      <button type="button" class="btn ghost wide big" onClick={() => onDecide(false)}>Keep it</button>
    </div>
  );
}

/**
 * The tie step drawn whole (no hooks, so tests can draw it): the open rows, the question under them, and the asked
 * stall's buttons.
 */
export function TiePanel({ s, viewer, asked, onDecide }: { s: GameState; viewer: number; asked: number; onDecide?: (play: boolean) => void }) {
  return (
    <>
      <CratesOpen s={s} viewer={viewer}><TieCard s={s} viewer={viewer} asked={asked} mine={!!onDecide} /></CratesOpen>
      {onDecide && <TieBar onDecide={onDecide} />}
    </>
  );
}
