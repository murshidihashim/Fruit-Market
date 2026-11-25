// The bar along the top (PLAN-127): three columns, so today's event stands in the middle of the screen whatever is
// beside it. On the left the menu and the day ("D2" in a pill, with a tick for each day of the game under it); in the
// middle today's event; on the right your rank and cash. The day's step is no longer drawn as a strip: it is said with
// the day to a screen reader ("Day 2 of 14, Buying"), and the table itself shows it.
// Rivals and their cash are in the stalls' row on the table (table.tsx RivalStall).
import { EventIcon } from '../../art';
import { shownCash, useCashShown } from '../../cashShown';
import type { GameState } from '../../../engine/game';
import { standing } from '../../../engine/story';

const PHASE = { morning: 'Morning', order: 'The standing order', buy: 'Buying', stall: 'Stocking', bid: 'The bell', tie: 'The bell', reveal: 'The rush', evening: 'Evening', over: 'Closed' } as const;
/** The day in five steps, as on the table board and in the rules. Evening and night come after the fifth. */
export const BEATS = ['Morning', 'Buying', 'Stocking', 'Bell', 'Rush'] as const;
const ORDINAL = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH'];

/** What is on the table when the game itself has already moved on (PLAN-090): the standing order's bids being turned
 *  over (the game is at buying by then), or the bell ringing before the first customer (the game is at the rush). */
export type OnTable = 'order' | 'bell';
const SHOWN: Record<OnTable, 'order' | 'bid'> = { order: 'order', bell: 'bid' };

/** The day's step as it is said: what is on the table, else where the game is; at night, "Night". */
export function stepSaid(phase: GameState['phase'], night: boolean, on?: OnTable): string {
  return night ? 'Night' : PHASE[on ? SHOWN[on] : phase];
}

/** The day pill's spoken name (PLAN-127): "Day 2 of 14, Buying"; near the end, how many days are left. */
export function dayName(day: number, days: number, step: string): string {
  const left = days - day + 1;
  return `Day ${day} of ${days}${left === 1 ? ', last day' : left <= 3 ? `, ${left} days left` : ''}, ${step}`;
}

export function TopBar({ s, viewer, onMenu, onEvent, night, on }: { s: GameState; viewer: number; onMenu: () => void; onEvent?: () => void;
  /** Night is falling: every step of the day is done. */
  night?: boolean;
  /** What is on the table, when the game has already moved on to its next step. */
  on?: OnTable }) {
  useCashShown();
  const days = s.config.days;
  const last = s.phase !== 'over' && s.day === days;
  // While the day's sales play out, rank and totals follow the cash drawn on the table, not the finished result.
  const shown = { ...s, players: s.players.map((pl, i) => ({ ...pl, cash: shownCash(i, pl.cash) })) };
  const st = standing(shown, viewer);
  const cash = shown.players[viewer].cash;
  return (
    <header class="topbar tk-top">
      <div class="tk-top-row">
        <div class="tk-lead">
          <button class="tk-menu" onClick={(e) => { e.stopPropagation(); onMenu(); }} aria-label="Menu">
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" /></svg>
          </button>
          <div class={`tk-day ${last ? 'last' : ''}`} role="img" aria-label={dayName(s.day, days, stepSaid(s.phase, !!night, on))}>
            <span class="tk-pill" aria-hidden="true">D{s.day}</span>
            {/* one tick for each day of the game: the days played and today filled, the days to come muted */}
            <span class="tk-ticks" aria-hidden="true">
              {Array.from({ length: days }, (_, i) => <i class={i < s.day ? 'on' : ''} />)}
            </span>
          </div>
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
    </header>
  );
}
