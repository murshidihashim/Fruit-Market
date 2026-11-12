// The bar along the top: the menu, the day, today's event and your rank and cash, then the day's five beats
// (Morning, Buying, Stocking, Bell, Rush) as on the printed board (PLAN-072).
// Rivals and their cash are in the rivals strip on the table (table.tsx RivalStall).
import { EventIcon } from '../../art';
import { shownCash, useCashShown } from '../../cashShown';
import type { GameState } from '../../../engine/game';
import { standing } from '../../../engine/story';

const PHASE = { morning: 'Morning', order: 'The order', buy: 'Buying', stall: 'Stocking', bid: 'The bell', tie: 'The bell', reveal: 'The rush', evening: 'Evening', over: 'Closed' } as const;
/** The day in five beats, as on the table board. Evening and night come after the fifth. */
const BEATS = ['Morning', 'Buying', 'Stocking', 'Bell', 'Rush'] as const;
const BEAT_OF: Record<string, number> = { morning: 0, order: 0, buy: 1, stall: 2, bid: 3, tie: 3, reveal: 4, evening: 5, over: 5 };
const ORDINAL = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH'];

export function TopBar({ s, viewer, onMenu, onEvent, night }: { s: GameState; viewer: number; onMenu: () => void; onEvent?: () => void;
  /** Night is falling: every beat of the day is done. */
  night?: boolean }) {
  useCashShown();
  const rem = s.config.days - s.day + 1;
  // While the day's sales play out, rank and totals follow the cash drawn on the table, not the finished result.
  const shown = { ...s, players: s.players.map((pl, i) => ({ ...pl, cash: shownCash(i, pl.cash) })) };
  const st = standing(shown, viewer);
  const cash = shown.players[viewer].cash;
  const beat = night ? 5 : BEAT_OF[s.phase];
  return (
    <header class="topbar tk-top">
      <div class="tk-top-row">
        <button class="tk-menu" onClick={(e) => { e.stopPropagation(); onMenu(); }} aria-label="Menu">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" /></svg>
        </button>
        <div class="tk-day">
          <span class="day-label">Day {s.day}<small> / {s.config.days}</small></span>
          {s.phase !== 'over' && rem <= 3 && <span class={`tk-left ${rem === 1 ? 'last' : ''}`}>{rem === 1 ? 'Final day' : `${rem} days left`}</span>}
        </div>
        {s.phase !== 'over' ? (
          <button type="button" class="tk-event" onClick={(e) => { e.stopPropagation(); onEvent?.(); }}
            aria-label={`Today: ${s.event ? s.event.title : 'a calm day'}. Tap for today's news and tomorrow's`}>
            <EventIcon id={s.event ? s.event.id : 'calm'} size={24} />
            <span>{s.event ? s.event.title : 'Calm Day'}</span>
          </button>
        ) : <span class="spacer" />}
        <div class="tk-me">
          {s.players.length > 1 && <span class={`tk-rank r${st.rank}`} title={st.text} aria-label={`Rank ${st.rank} of ${st.of}. ${st.text}`}>{ORDINAL[st.rank - 1] ?? `#${st.rank}`}</span>}
          <div class="tk-cash" data-a={`p${viewer}-cash`} aria-label={`Cash $${cash}`}>${cash}</div>
        </div>
      </div>
      {s.phase !== 'over' && (
        <ol class="tk-beats" aria-label={`Today's beats. Now: ${PHASE[s.phase]}`}>
          {BEATS.map((b, i) => <li class={i === beat ? 'now' : i < beat ? 'done' : ''} aria-current={i === beat ? 'step' : undefined}>{i + 1} {b}</li>)}
        </ol>
      )}
    </header>
  );
}
