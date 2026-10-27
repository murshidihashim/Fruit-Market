// The bar along the top: day, phase, rank, cash, today's event and each rival's cash.
import { Coin, EventIcon, Face } from '../../art';
import type { GameState } from '../../../engine/game';
import { standing } from '../../../engine/story';

const PHASE = { morning: 'Morning', buy: 'Buying', stall: 'Open stalls', bid: 'The bell', reveal: 'Sales', evening: 'Evening', over: 'Closed' } as const;

export function TopBar({ s, viewer, onMenu, onEvent, onRival, offline = [] }: { s: GameState; viewer: number; onMenu: () => void; onEvent?: () => void; onRival?: (p: number) => void; offline?: number[] }) {
  const rem = s.config.days - s.day + 1;
  const st = standing(s, viewer);
  return (
    <header class="topbar">
      <div class="tb-row">
        <button class="icon-btn" onClick={(e) => { e.stopPropagation(); onMenu(); }} aria-label="Menu">☰</button>
        <div class="tb-day">
          <span class="day-label">Day {s.day}<small>/{s.config.days}</small></span>
          {s.phase !== 'over' && rem <= 3 ? <span class={`left ${rem === 1 ? 'last' : ''}`}>{rem === 1 ? 'FINAL DAY' : `${rem} DAYS LEFT`}</span> : <span class="phase">{PHASE[s.phase]}</span>}
        </div>
        {s.players.length > 1 && <span class={`rank r${st.rank}`} title={st.text}>#{st.rank}</span>}
        <div class="hud-cash" data-a={`p${viewer}-cash`} aria-label={`Cash $${s.players[viewer].cash}`}><Coin size={20} /><b>{s.players[viewer].cash}</b></div>
      </div>
      {s.phase !== 'over' && (
        <div class="tb-row sub">
          <button type="button" class="ev-chip" onClick={(e) => { e.stopPropagation(); onEvent?.(); }}>
            {s.event ? <><EventIcon id={s.event.id} size={16} />{s.event.title}</> : 'Calm day'}
            {s.nextEvent && <small>· next: <EventIcon id={s.nextEvent.id} size={14} /></small>}
          </button>
          <span class="spacer" />
          {s.players.map((pl, i) => i === viewer ? null : (
            <button type="button" class={`rv-chip ${offline.includes(i) ? 'off' : ''}`} onClick={(e) => { e.stopPropagation(); onRival?.(i); }} aria-label={`${pl.name}: $${pl.cash}`}>
              <Face who={pl.avatar} size={20} /><b data-a={`p${i}-cash`}>${pl.cash}</b>
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
