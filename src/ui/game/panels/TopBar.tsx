// The bar along the top: day, phase, rank, cash, today's event and each rival's cash.
import { Coin, EventIcon, Face } from '../../art';
import { shownCash, useCashShown } from '../../cashShown';
import type { GameState } from '../../../engine/game';
import { standing } from '../../../engine/story';

const PHASE = { morning: 'Morning', buy: 'Buying', stall: 'Stocking', bid: 'The bell', reveal: 'The rush', evening: 'Evening', over: 'Closed' } as const;

export function TopBar({ s, viewer, onMenu, onEvent, onRival, offline = [] }: { s: GameState; viewer: number; onMenu: () => void; onEvent?: () => void; onRival?: (p: number) => void; offline?: number[] }) {
  useCashShown();
  const rem = s.config.days - s.day + 1;
  // While the day's sales play out, rank and totals follow the cash drawn on the table, not the finished result.
  const shown = { ...s, players: s.players.map((pl, i) => ({ ...pl, cash: shownCash(i, pl.cash) })) };
  const st = standing(shown, viewer);
  return (
    <header class="topbar">
      <div class="tb-row">
        <button class="icon-btn" onClick={(e) => { e.stopPropagation(); onMenu(); }} aria-label="Menu">☰</button>
        <div class="tb-day">
          <span class="day-label">Day {s.day}<small>/{s.config.days}</small></span>
          {s.phase !== 'over' && rem <= 3 ? <span class={`left ${rem === 1 ? 'last' : ''}`}>{rem === 1 ? 'FINAL DAY' : `${rem} DAYS LEFT`}</span> : <span class="phase">{PHASE[s.phase]}</span>}
        </div>
        {s.players.length > 1 && <span class={`rank r${st.rank}`} title={st.text} aria-label={`Rank ${st.rank} of ${st.of}. ${st.text}`}>#{st.rank}</span>}
        <div class="hud-cash" data-a={`p${viewer}-cash`} aria-label={`Cash $${shown.players[viewer].cash}`}><Coin size={20} /><b>{shown.players[viewer].cash}</b></div>
      </div>
      {s.phase !== 'over' && (
        <div class="tb-row sub">
          <button type="button" class="ev-chip" onClick={(e) => { e.stopPropagation(); onEvent?.(); }}>
            {s.event ? <><EventIcon id={s.event.id} size={16} /><span class="ev-title">{s.event.title}</span></> : <span class="ev-title">Calm day</span>}
            {s.nextEvent && <small>· next: <EventIcon id={s.nextEvent.id} size={14} /></small>}
          </button>
          <span class="spacer" />
          {shown.players.map((pl, i) => i === viewer ? null : (
            <button type="button" class={`rv-chip ${offline.includes(i) ? 'off' : ''}`} onClick={(e) => { e.stopPropagation(); onRival?.(i); }} aria-label={`${pl.name}: $${pl.cash}`}>
              <Face who={pl.avatar} size={20} /><b data-a={`p${i}-cash`}>${pl.cash}</b>
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
