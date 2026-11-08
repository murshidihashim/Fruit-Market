// The card over the market each morning: standing, overnight losses, and today's event as the Exchange Gazette
// front page (DEC-066), with tomorrow's headline below. Phones get the compact front page plus the event's rule text.
import { useEffect, useState } from 'preact/hooks';
import { FRUITS } from '../../../engine/data';
import type { GameState } from '../../../engine/game';
import { standing } from '../../../engine/story';
import { EventIcon, Fruit } from '../../art';
import { Gazette } from '../../cards';
import { Icon } from '../../pixel';
import { NextLorry } from '../../table';

const WIDE = '(min-width: 720px) and (min-height: 700px)';

/** True on screens with room for the full Gazette front page. */
function useWide(): boolean {
  const [wide, setWide] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(WIDE).matches);
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const m = matchMedia(WIDE);
    const on = () => setWide(m.matches);
    m.addEventListener?.('change', on);
    return () => m.removeEventListener?.('change', on);
  }, []);
  return wide;
}

export function MorningCard({ s, viewer, lost }: { s: GameState; viewer: number; lost: number }) {
  const wide = useWide();
  const rem = s.config.days - s.day + 1;
  const st = standing(s, viewer);
  const stock = FRUITS.reduce((a, f) => a + s.players[viewer].stock[f].reduce((x, y) => x + y, 0), 0);
  return (
    <div class={`morning-card ${rem <= 3 ? 'finale' : ''}`}>
      <div class="mc-day">{rem === 1 ? 'FINAL DAY' : `Day ${s.day}`}<small>{rem === 1 ? '' : ` · ${rem} days left`}</small></div>
      {s.day > 1 && <div class={`mc-standing r${st.rank}`}>{st.text}</div>}
      {lost > 0 && <div class="mc-loss">{lost} of your fruit spoiled overnight.</div>}
      {rem === 1 && stock > 0 && <div class="mc-loss">Anything unsold tonight is worth $0. Sell it all!</div>}
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
