// The bar along the top, one row: the menu, the day and phase, today's event and your cash (with your rank).
// Rivals and their cash are in the rivals strip on the table (table.tsx RivalStall).
import { Coin, EventIcon } from '../../art';
import { shownCash, useCashShown } from '../../cashShown';
import type { GameState } from '../../../engine/game';
import { standing } from '../../../engine/story';

const PHASE = { morning: 'Morning', order: 'The order', buy: 'Buying', stall: 'Stocking', bid: 'The bell', reveal: 'The rush', evening: 'Evening', over: 'Closed' } as const;

export function TopBar({ s, viewer, onMenu, onEvent }: { s: GameState; viewer: number; onMenu: () => void; onEvent?: () => void }) {
  useCashShown();
  const rem = s.config.days - s.day + 1;
  // While the day's sales play out, rank and totals follow the cash drawn on the table, not the finished result.
  const shown = { ...s, players: s.players.map((pl, i) => ({ ...pl, cash: shownCash(i, pl.cash) })) };
  const st = standing(shown, viewer);
  const cash = shown.players[viewer].cash;
  return (
    <header class="topbar">
      <div class="tb-row">
        <button class="icon-btn" onClick={(e) => { e.stopPropagation(); onMenu(); }} aria-label="Menu">☰</button>
        <div class="tb-day">
          <span class="day-label">Day {s.day}<small>/{s.config.days}</small></span>
          {/* The phase word always shows; in the last three days it turns red (the morning card counts the days left),
              and the last morning says FINAL DAY. */}
          {s.phase !== 'over' && rem <= 3
            ? <span class={`left ${rem === 1 ? 'last' : ''}`} title={rem === 1 ? 'Final day' : `${rem} days left`}>{rem === 1 && s.phase === 'morning' ? 'FINAL DAY' : PHASE[s.phase]}</span>
            : <span class="phase">{PHASE[s.phase]}</span>}
        </div>
        {s.phase !== 'over' ? (
          <button type="button" class="ev-chip" onClick={(e) => { e.stopPropagation(); onEvent?.(); }}
            aria-label={`Today: ${s.event ? s.event.title : 'a calm day'}. Tap for today's news and tomorrow's`}>
            <EventIcon id={s.event ? s.event.id : 'calm'} size={26} />
            <span class="ev-title">{s.event ? s.event.title : 'Calm Day'}</span>
          </button>
        ) : <span class="spacer" />}
        <div class="tb-me">
          {s.players.length > 1 && <span class={`rank r${st.rank}`} title={st.text} aria-label={`Rank ${st.rank} of ${st.of}. ${st.text}`}>#{st.rank}</span>}
          <div class="hud-cash" data-a={`p${viewer}-cash`} aria-label={`Cash $${cash}`}><Coin size={20} /><b>{cash}</b></div>
        </div>
      </div>
    </header>
  );
}
