// The card over the market each morning: standing, the night's spoilage and juice, the final day's word on leftovers,
// and today's event as the Exchange Gazette front page (DEC-066), with tomorrow's headline below. Phones get the
// compact front page plus the event's rule text.
import { useEffect, useState } from 'preact/hooks';
import { FRUIT, FRUITS } from '../../../engine/data';
import type { GameState } from '../../../engine/game';
import { closingNote, overnightLines, standing, type NightJuice } from '../../../engine/story';
import { EventIcon, Fruit } from '../../art';
import { ART_SIZE, CardArt, Gazette } from '../../cards';
import { eventArt } from '../../deckArt';
import { Icon } from '../../icons';
import { NextLorry } from '../../table';

const WIDE = '(min-width: 720px) and (min-height: 700px)';
/** The three-column desktop table (styles.css, the game screen grid): the only layout whose middle has room for
 *  the full front page. A tablet in portrait uses the phone layout, so it gets the brief too. */
const DESK = '(min-width: 900px) and (min-height: 560px)';

/** True on screens with room for the full Gazette front page (`query`: the table's own test). */
function useWide(query = WIDE): boolean {
  const [wide, setWide] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(query).matches);
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const m = matchMedia(query);
    const on = () => setWide(m.matches);
    m.addEventListener?.('change', on);
    return () => m.removeEventListener?.('change', on);
  }, [query]);
  return wide;
}

/**
 * `table`: the card sits in the middle of the game screen, between today's customers and your shelf. On a phone it
 * is a short brief (the event's picture, title and rule, tomorrow's news and lorry) so nothing has to scroll;
 * the full Gazette front page opens from the event chip in the top bar.
 */
export function MorningCard({ s, viewer, lost, juice, table }: { s: GameState; viewer: number; lost: number; juice?: NightJuice; table?: boolean }) {
  const wide = useWide();
  const desk = useWide(DESK);
  const rem = s.config.days - s.day + 1;
  const st = standing(s, viewer);
  // Overnight: fruit lost (red), then what the Juice Bar made (green); on the final day, what leftovers are worth.
  const night = overnightLines(lost, juice).map((l) => <div class={`mc-loss ${l.tone}`}>{l.text}</div>);
  const closing = closingNote(s, viewer)?.morning;
  if (table && !desk) {
    return (
      <div class={`morning-card mc-brief ${rem <= 3 ? 'finale' : ''}`}>
        <div class="mc-top">
          <div class="mc-day">{rem === 1 ? 'FINAL DAY' : `Day ${s.day}`}<small>{rem === 1 ? '' : ` · ${rem} days left`}</small></div>
          {s.day > 1 && <div class={`mc-standing r${st.rank}`}>{st.text}</div>}
        </div>
        {night}
        {closing && <div class="mc-loss">{closing}</div>}
        {s.event ? (
          <div class={`mc-event x-ev-${s.event.id}`}>
            {/* the Gazette's picture, as tall as the space allows (screens.css) */}
            <CardArt class="mc-pic" src={eventArt(s.event.id)} alt="" w={ART_SIZE.event[0]} h={ART_SIZE.event[1]} eager />
            <span class="mc-next-k">Today’s news</span>
            <b>{s.event.title}</b>
            <small>{s.event.text}</small>
          </div>
        ) : (
          <div class="sunny"><Icon name="sun" size={22} /> A calm day at the market</div>
        )}
        {s.event?.maxPrice && (
          <div class="minprices" aria-label={`Most a stall may charge today: ${FRUITS.map((f) => `${FRUIT[f].plural} $${s.event!.maxPrice![f]}`).join(', ')}`}>
            {FRUITS.map((f) => <span aria-hidden="true"><Fruit id={f} size={16} />≤${s.event!.maxPrice![f]}</span>)}
          </div>
        )}
        {s.event?.inspector && s.dayFines && s.dayFines.some((x) => x > 0) && (
          <p class="mc-fine">{s.players.map((pl, i) => (s.dayFines![i] ? `${i === viewer ? 'You were' : `${pl.name} was`} fined $${s.dayFines![i]}` : '')).filter(Boolean).join(' · ')}</p>
        )}
        {s.nextEvent && (
          <div class="mc-next">
            <EventIcon id={s.nextEvent.id} size={32} />
            <span><span class="mc-next-k">Tomorrow’s news</span><b>{s.nextEvent.title}</b></span>
          </div>
        )}
        <NextLorry s={s} cls="mc-lorry" />
      </div>
    );
  }
  return (
    <div class={`morning-card ${rem <= 3 ? 'finale' : ''}`}>
      <div class="mc-day">{rem === 1 ? 'FINAL DAY' : `Day ${s.day}`}<small>{rem === 1 ? '' : ` · ${rem} days left`}</small></div>
      {s.day > 1 && <div class={`mc-standing r${st.rank}`}>{st.text}</div>}
      {night}
      {closing && <div class="mc-loss">{closing}</div>}
      {s.event ? (
        <div class="mc-gazette">
          <Gazette event={s.event} compact={!wide} eager />
          {!wide && <p class="mc-text">{s.event.text}</p>}
          {s.event.maxPrice && <div class="minprices">{FRUITS.map((f) => <span><Fruit id={f} size={18} />up to ${s.event!.maxPrice![f]}</span>)}</div>}
          {s.event.inspector && s.dayFines && s.dayFines.some((x) => x > 0) && (
            <p class="mc-fine">{s.players.map((pl, i) => (s.dayFines![i] ? `${i === viewer ? 'You were' : `${pl.name} was`} fined $${s.dayFines![i]}` : '')).filter(Boolean).join(' · ')}</p>
          )}
        </div>
      ) : (
        <div class="sunny"><Icon name="sun" size={22} /> A calm day at the market</div>
      )}
      {s.nextEvent && (
        <div class="mc-next">
          <EventIcon id={s.nextEvent.id} size={44} />
          <span><span class="mc-next-k">Tomorrow’s news</span><b>{s.nextEvent.title}</b><small>{s.nextEvent.text.split('today').join('that day')}</small></span>
        </div>
      )}
      <NextLorry s={s} cls="mc-lorry" />
    </div>
  );
}
