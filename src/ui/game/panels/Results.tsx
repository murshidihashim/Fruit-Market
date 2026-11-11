// The final results screen: podium, recap, league progress and achievements.
import { useState } from 'preact/hooks';
import { JUICE_VALUE } from '../../../engine/data';
import { places, ranking, winners, type GameState } from '../../../engine/game';
import { gameRecap } from '../../../engine/story';
import { Coin, Face } from '../../art';
import { Icon } from '../../icons';
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

const RANKS = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH'];

/**
 * The words of the final count for one viewer. Rules 18: most cash wins, then most fruit sold; stalls still level
 * share the win and the place (there is no seat-number tie-break), so 1ST can be printed on more than one stall.
 */
export function finishWords(s: GameState, viewer: number): { win: boolean; shared: boolean; headline: string; margin: string; medals: string[]; mine: string } {
  const order = ranking(s);
  const first = winners(s);
  const place = places(s);
  const win = first.includes(viewer);
  const shared = first.length > 1;
  const champ = s.players[win ? viewer : order[0]];
  const gap = order.length > 1 ? champ.cash - s.players[order[1]].cash : 0;
  const others = first.filter((i) => i !== viewer).map((i) => s.players[i].name);
  const sharers = first.map((i) => s.players[i].name);
  return {
    win, shared,
    headline: shared ? (win ? `YOU SHARE THE WIN WITH ${others.join(' AND ').toUpperCase()}` : `${sharers.join(' AND ').toUpperCase()} SHARE THE WIN`) : win ? 'YOU WIN!' : `${champ.name.toUpperCase()} WINS!`,
    margin: shared ? 'Level on cash and on fruit sold.' : gap === 0 ? 'A dead heat, decided on fruit sold!' : gap <= 5 ? `By just $${gap}. What a finish!` : `By $${gap}.`,
    medals: place.map((k) => RANKS[k - 1]),
    mine: win ? (shared ? 'I shared the win' : 'I won') : `I came ${RANKS[place[viewer] - 1].toLowerCase()}`,
  };
}

export function Results({ s, viewer, onExit, onRematch, rematchNote, rematchSent, online }: { s: GameState; viewer: number; onExit: () => void; onRematch: () => void; rematchNote?: string; rematchSent?: boolean; online?: boolean }) {
  // Checked once when the results first show; both only report what's new.
  const [earned] = useState(() => checkAchievements(s, viewer, !!online));
  const [cleared] = useState(() => recordLeague(s, viewer));
  // New looks are handed out after both checks, so a League win or a milestone counts too.
  const [newLooks] = useState(() => syncLooks());
  const order = ranking(s);
  const place = places(s);
  const words = finishWords(s, viewer);
  const win = words.win;
  const champ = s.players[win ? viewer : order[0]];
  const recap = gameRecap(s, viewer);
  const share = async () => {
    const text = `Fruit Market: ${words.mine} with $${s.players[viewer].cash} after ${s.config.days} days.`;
    try {
      if (navigator.share) await navigator.share({ text, url: location.origin });
      else await navigator.clipboard.writeText(`${text} ${location.origin}`);
    } catch { /* cancelled or not allowed */ }
  };
  return (
    <section class="results">
      <div class="trophy"><Face who={champ.avatar} size={96} worn={partsOf(champ.look)} /><span class="crown"><Icon name="star" size={34} /></span></div>
      <h2>{words.headline}</h2>
      {order.length > 1 && <p class="margin">{words.margin}</p>}
      {s.config.daily && <DailyResult s={s} />}
      <div class="podium">
        {order.map((i) => {
          const pl = s.players[i];
          return (
            <div class={`pod ${i === viewer ? 'me' : ''}`}>
              <span class={`medal r${place[i]}`}>{words.medals[i]}</span>
              <span class="avatar sm"><Face who={pl.avatar} size={26} worn={partsOf(pl.look)} /></span>
              <b>{i === viewer ? 'You' : pl.name}</b>
              <span class="spacer" />
              <span class="chip cash"><Coin />{pl.cash}</span>
              <div class="pod-stats">Sold {pl.stats.sold} · spoiled {pl.stats.spoiled} · best sale ${pl.stats.bestSale}{pl.stats.juiced ? ` · juice +$${pl.stats.juiced * JUICE_VALUE}` : ''}{s.jam?.[i] ? ` · jam maker +$${s.jam[i]}` : ''}{pl.upgrades.map((u) => <Icon name={UP_ICON[u]} size={14} />)}</div>
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
