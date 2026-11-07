// The final results screen: podium, recap, league progress and achievements.
import { useState } from 'preact/hooks';
import { ranking, type GameState } from '../../../engine/game';
import { gameRecap } from '../../../engine/story';
import { Coin, Face } from '../../art';
import { Icon } from '../../pixel';
import { UP_ICON } from '../../panel';
import { checkAchievements, LEAGUE, recordLeague } from '../../progress';
import { partsOf } from '../../../net/looks';
import { syncLooks } from '../../looks';
import { DailyResult } from './DailyResult';
import { SEAT_COLOURS } from '../../table';

/** Every stall's cash at the end of each day, so you can see where the game was won. */
function CashChart({ s, viewer }: { s: GameState; viewer: number }) {
  const h = s.history ?? [];
  if (h.length < 2) return null;
  const W = 300, H = 110, P = 8;
  const max = Math.max(1, ...h.flatMap((d) => d.cash));
  const x = (i: number) => P + ((W - 2 * P) * i) / (h.length - 1);
  const y = (v: number) => H - P - ((H - 2 * P) * v) / max;
  return (
    <div class="cash-chart">
      <div class="rc-h">Cash, day by day</div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Each stall's cash at the end of each day">
        {s.players.map((_, i) => <polyline fill="none" stroke-linejoin="round" stroke={SEAT_COLOURS[i % SEAT_COLOURS.length]} stroke-width={i === viewer ? 4 : 2.5} points={h.map((d, k) => `${x(k)},${y(d.cash[i])}`).join(' ')} />)}
      </svg>
      <div class="cc-key">{s.players.map((pl, i) => <span><i aria-hidden="true" style={{ background: SEAT_COLOURS[i % SEAT_COLOURS.length] }} />{i === viewer ? 'You' : pl.name}</span>)}</div>
    </div>
  );
}

export function Results({ s, viewer, onExit, onRematch, rematchNote, rematchSent, online }: { s: GameState; viewer: number; onExit: () => void; onRematch: () => void; rematchNote?: string; rematchSent?: boolean; online?: boolean }) {
  // Checked once when the results first show; both only report what's new.
  const [earned] = useState(() => checkAchievements(s, viewer, !!online));
  const [cleared] = useState(() => recordLeague(s, viewer));
  // New looks are handed out after both checks, so a League win or a milestone counts too.
  const [newLooks] = useState(() => syncLooks());
  const order = ranking(s);
  const win = order[0] === viewer;
  const ranks = ['1ST', '2ND', '3RD', '4TH'];
  const champ = s.players[order[0]];
  const margin = order.length > 1 ? champ.cash - s.players[order[1]].cash : 0;
  const recap = gameRecap(s, viewer);
  const share = async () => {
    const place = win ? 'I won' : `I came ${ranks[order.indexOf(viewer)].toLowerCase()}`;
    const text = `Fruit Market: ${place} with $${s.players[viewer].cash} after ${s.config.days} days.`;
    try {
      if (navigator.share) await navigator.share({ text, url: location.origin });
      else await navigator.clipboard.writeText(`${text} ${location.origin}`);
    } catch { /* cancelled or not allowed */ }
  };
  return (
    <section class="results">
      <div class="trophy"><Face who={champ.avatar} size={96} worn={partsOf(champ.look)} /><span class="crown"><Icon name="star" size={34} /></span></div>
      <h2>{win ? 'YOU WIN!' : `${champ.name.toUpperCase()} WINS!`}</h2>
      {order.length > 1 && <p class="margin">{margin === 0 ? 'A dead heat, decided on fruit sold!' : margin <= 5 ? `By just $${margin}. What a finish!` : `By $${margin}.`}</p>}
      {s.config.daily && <DailyResult s={s} />}
      <div class="podium">
        {order.map((i, k) => {
          const pl = s.players[i];
          return (
            <div class={`pod ${i === viewer ? 'me' : ''}`}>
              <span class={`medal r${k + 1}`}>{ranks[k]}</span>
              <span class="avatar sm"><Face who={pl.avatar} size={26} worn={partsOf(pl.look)} /></span>
              <b>{i === viewer ? 'You' : pl.name}</b>
              <span class="spacer" />
              <span class="chip cash"><Coin />{pl.cash}</span>
              <div class="pod-stats">Sold {pl.stats.sold} · spoiled {pl.stats.spoiled} · best sale ${pl.stats.bestSale}{s.jam?.[i] ? ` · jam maker +$${s.jam[i]}` : ''}{pl.upgrades.map((u) => <Icon name={UP_ICON[u]} size={14} />)}</div>
            </div>
          );
        })}
      </div>
      <CashChart s={s} viewer={viewer} />
      {(recap.best.length > 0 || recap.worst.length > 0) && (
        <div class="recap">
          {recap.best.length > 0 && <><div class="rc-h good">Your best moments</div>{recap.best.map((t) => <div class="rc-l">{t}</div>)}</>}
          {recap.worst.length > 0 && <><div class="rc-h bad">Next time, watch out for</div>{recap.worst.map((t) => <div class="rc-l">{t}</div>)}</>}
        </div>
      )}
      {s.config.league !== undefined && (
        <p class={`league-note ${cleared ? 'good' : ''}`}>
          {cleared ? (s.config.league + 1 >= LEAGUE.length ? 'You are the Market League champion!' : `${LEAGUE[s.config.league].title} cleared! Next: ${LEAGUE[s.config.league + 1].title}`) : `Market League: win to clear ${LEAGUE[s.config.league].title}.`}
        </p>
      )}
      {earned.length > 0 && (
        <div class="ach-new">
          <small>Achievement{earned.length > 1 ? 's' : ''} unlocked</small>
          {earned.map((a) => <div class="ach got"><b>{a.title}</b><small>{a.text}</small></div>)}
        </div>
      )}
      {newLooks.length > 0 && <p class="league-note good" role="status">New look{newLooks.length > 1 ? 's' : ''} unlocked: {newLooks.map((l) => l.title).join(', ')}. Find {newLooks.length > 1 ? 'them' : 'it'} in the Wardrobe (Trophies).</p>}
      {rematchNote && <p class="rematch-note">{rematchNote}</p>}
      <button class="btn primary big wide" disabled={rematchSent} onClick={onRematch}>
        {s.config.league !== undefined ? (cleared ? (s.config.league + 1 >= LEAGUE.length ? 'See your trophies' : 'Next stage') : 'Try again') : s.config.daily ? 'Back to menu' : win ? 'Defend your title' : 'Rematch!'}
      </button>
      <button class="btn wide" onClick={share}>Share result</button>
      <button class="btn wide" onClick={onExit}>Main menu</button>
    </section>
  );
}
