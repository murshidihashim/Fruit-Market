// The Market League campaign's pieces on screen (PLAN-115): a stage's moment (its picture from the game's own card art
// and what its host shopkeeper says), its three goals with their stars (PLAN-118: the clear goal and two optional
// goals), and a row of stars. Words and pictures come from campaign.ts and the card art; nothing here is animated.
import type { GameState } from '../engine/game';
import { Face } from './art';
import { LEAGUE, afterLine, isExpert, missedGoals, picName, stageByNo, stageCleared, stageHost, starGoals, starsEarned, type Stage, type StagePic } from './campaign';
import { CardArt } from './cards';
import { customerArt, eventArt, shopScene } from './deckArt';
import { myStars } from './progress';
import './league.css';

const picSrc = (p: StagePic): string | null => (p.kind === 'event' ? eventArt(p.id) : p.kind === 'keeper' ? shopScene(p.id) : customerArt(p.id));

/** One star, filled when earned. */
export function Star({ on, size = 18 }: { on: boolean; size?: number }) {
  return (
    <svg class={`jp-star ${on ? 'on' : ''}`} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 1.8 12.5 7.1 18.3 7.8 14 11.8 15.2 17.6 10 14.7 4.8 17.6 6 11.8 1.7 7.8 7.5 7.1Z" stroke-width="1.8" stroke-linejoin="round" />
    </svg>
  );
}

/** A stage's stars in a row: "2 of 3 stars" for a screen reader. */
export function Stars({ got, total, size }: { got: number; total: number; size?: number }) {
  return (
    <span class="jp-stars" role="img" aria-label={`${got} of ${total} stars`}>
      {Array.from({ length: total }, (_, i) => <Star on={i < got} size={size} />)}
    </span>
  );
}

/** A stage's moment: its picture, and its host saying one line. */
export function StageMoment({ st, words }: { st: Stage; words: string }) {
  const host = stageHost(st);
  return (
    <figure class="jp-mo">
      <CardArt class="jp-mo-pic" src={picSrc(st.pic)} alt={picName(st.pic)} w={300} h={170} eager />
      <figcaption class="jp-mo-say">
        <span class="jp-round"><Face who={host.avatar} size={40} /></span>
        <span class="jp-mo-tx"><b>{host.name}</b><span>{words}</span></span>
      </figcaption>
    </figure>
  );
}

/** A stage's three goals, each with its star: the clear goal first. `have`: the ids held. `fresh`: the ids just earned. */
export function MasteryList({ stage, have, fresh = [] }: { stage: number; have: readonly string[]; fresh?: readonly string[] }) {
  const st = stageByNo(stage);
  if (!st) return null;
  return (
    <ul class="jp-ms" aria-label="Stars for this stage">
      {starGoals(st).map((m) => {
        const on = have.includes(m.id);
        return (
          <li class={on ? 'on' : ''}>
            <Star on={on} />
            <span>{m.text}</span>
            <span class="jp-sr">{on ? (fresh.includes(m.id) ? ': earned this game' : ': earned') : ': not yet'}</span>
            {fresh.includes(m.id) && <i class="jp-ms-new" aria-hidden="true">New</i>}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * A league game's end on the results: whether the stage was cleared (PLAN-118: when it was not, the exact goal that
 * was missed), then (on a campaign stage) its host's line after the game (when the stage was cleared, its after-game
 * line chosen by the stars this game earned, so it never claims what you did not do; when it was not, its line before
 * the game and the stage's lesson) and the stage's stars, the ones this game earned first marked New.
 */
export function StageEnd({ s, owner, cleared, fresh }: { s: GameState; owner: number; cleared: boolean; fresh: readonly string[] }) {
  const at = s.config.league;
  const st = stageByNo(at);
  if (at === undefined || !st) return null;
  const met = stageCleared(s, owner);
  const missed = met ? [] : missedGoals(s, owner).filter((m) => m.id === st.clear.id);
  const last = at + 1 >= LEAGUE.length;
  const note = cleared ? (last ? `${st.title} cleared. Chapter 1 is yours.` : `${st.title} cleared. Next: ${LEAGUE[at + 1].title}`)
    : met ? `${st.title}: cleared again.` : isExpert(at) ? `${st.title}: not cleared yet.` : `Market League: clear ${st.title} to move up.`;
  return (
    <div class="jp-stage-end">
      <p class={`sbk-note ${cleared || met ? 'good' : ''}`}>{note}</p>
      {missed.map((m) => <p class="jp-missed"><b>Missed</b>{` ${m.text}`}</p>)}
      {s.config.stage && (
        <>
          <StageMoment st={st} words={met ? afterLine(st, starsEarned(s, owner)) : st.before} />
          {!met && <p class="sbk-sub">{st.lesson}</p>}
          <span class="sbk-lab">Stars for this stage</span>
          <MasteryList stage={at} have={myStars()} fresh={fresh} />
        </>
      )}
    </div>
  );
}
