// The final results screen: podium, recap, league progress and achievements.
import { useState } from 'preact/hooks';
import { ranking, type GameState } from '../../../engine/game';
import { gameRecap } from '../../../engine/story';
import { Coin, Face } from '../../art';
import { Icon } from '../../pixel';
import { UP_ICON } from '../../panel';
import { checkAchievements, LEAGUE, recordLeague } from '../../progress';
import { DailyResult } from './DailyResult';

export function Results({ s, viewer, onExit, onRematch, rematchNote, rematchSent, online }: { s: GameState; viewer: number; onExit: () => void; onRematch: () => void; rematchNote?: string; rematchSent?: boolean; online?: boolean }) {
  // Checked once when the results first show; both only report what's new.
  const [earned] = useState(() => checkAchievements(s, viewer, !!online));
  const [cleared] = useState(() => recordLeague(s, viewer));
  const order = ranking(s);
  const win = order[0] === viewer;
  const ranks = ['1ST', '2ND', '3RD', '4TH'];
  const champ = s.players[order[0]];
  const margin = order.length > 1 ? champ.cash - s.players[order[1]].cash : 0;
  const recap = gameRecap(s, viewer);
  return (
    <section class="results">
      <div class="trophy"><Face who={champ.avatar} size={96} /><span class="crown"><Icon name="star" size={34} /></span></div>
      <h2>{win ? 'YOU WIN!' : `${champ.name.toUpperCase()} WINS!`}</h2>
      {order.length > 1 && <p class="margin">{margin === 0 ? 'A dead heat, decided on fruit sold!' : margin <= 5 ? `By just $${margin}. What a finish!` : `By $${margin}.`}</p>}
      {s.config.daily && <DailyResult s={s} />}
      <div class="podium">
        {order.map((i, k) => {
          const pl = s.players[i];
          return (
            <div class={`pod ${i === viewer ? 'me' : ''}`}>
              <span class={`medal r${k + 1}`}>{ranks[k]}</span>
              <span class="avatar sm"><Face who={pl.avatar} size={26} /></span>
              <b>{i === viewer ? 'You' : pl.name}</b>
              <span class="spacer" />
              <span class="chip cash"><Coin />{pl.cash}</span>
              <div class="pod-stats">Sold {pl.stats.sold} · spoiled {pl.stats.spoiled} · best sale ${pl.stats.bestSale}{pl.upgrades.map((u) => <Icon name={UP_ICON[u]} size={14} />)}</div>
            </div>
          );
        })}
      </div>
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
      {rematchNote && <p class="rematch-note">{rematchNote}</p>}
      <button class="btn primary big wide" disabled={rematchSent} onClick={onRematch}>
        {s.config.league !== undefined ? (cleared ? (s.config.league + 1 >= LEAGUE.length ? 'See your trophies' : 'Next stage') : 'Try again') : s.config.daily ? 'Back to menu' : win ? 'Defend your title' : 'Rematch!'}
      </button>
      <button class="btn wide" onClick={onExit}>Main menu</button>
    </section>
  );
}
