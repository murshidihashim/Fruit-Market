// The card over the market each morning: standing, overnight losses, today's and tomorrow's events.
import { FRUITS } from '../../../engine/data';
import type { GameState } from '../../../engine/game';
import { standing } from '../../../engine/story';
import { EventIcon, Fruit } from '../../art';
import { Icon } from '../../pixel';

export function MorningCard({ s, viewer, lost }: { s: GameState; viewer: number; lost: number }) {
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
        <div class="event-card flip">
          <div class="ei"><EventIcon id={s.event.id} size={44} /></div>
          <b>{s.event.title}</b>
          <p>{s.event.text}</p>
          {s.event.minPrice && <div class="minprices">{FRUITS.map((f) => <span><Fruit id={f} size={18} />${s.event!.minPrice![f]}</span>)}</div>}
        </div>
      ) : (
        <div class="sunny"><Icon name="sun" size={22} /> A calm day at the market</div>
      )}
      {s.nextEvent && <div class="mc-next">Tomorrow: <b><EventIcon id={s.nextEvent.id} size={16} /> {s.nextEvent.title}</b><small>{s.nextEvent.text}</small></div>}
    </div>
  );
}
