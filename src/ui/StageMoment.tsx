// The Market League campaign's pieces on screen (PLAN-115): a stage's moment (its picture from the game's own card art
// and what its host shopkeeper says), its three mastery goals with their stars, and a row of stars. Words and pictures
// come from campaign.ts and the card art; nothing here is animated.
import { winners, type GameState } from '../engine/game';
import { Face } from './art';
import { LEAGUE, picName, stageHost, type Stage, type StagePic } from './campaign';
import { CardArt } from './cards';
import { customerArt, eventArt, shopScene } from './deckArt';
import { myStars } from './progress';

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

/** A stage's three mastery goals, each with its star. `have`: the ids held. `fresh`: the ids just earned. */
export function MasteryList({ stage, have, fresh = [] }: { stage: number; have: readonly string[]; fresh?: readonly string[] }) {
  const st = LEAGUE[stage];
  if (!st) return null;
  return (
    <ul class="jp-ms" aria-label="Stars for this stage">
      {st.mastery.map((m) => {
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
 * A league game's end on the results: whether the stage was cleared, then (on a campaign stage) its host's line after
 * the game (the "after" line when you won; when you did not, its line before the game and the stage's lesson) and the stage's stars, the ones
 * this game earned first marked New.
 */
export function StageEnd({ s, owner, cleared, fresh }: { s: GameState; owner: number; cleared: boolean; fresh: readonly string[] }) {
  const at = s.config.league;
  const st = at === undefined ? undefined : LEAGUE[at];
  if (at === undefined || !st) return null;
  const won = winners(s).includes(owner);
  const note = cleared ? (at + 1 >= LEAGUE.length ? 'You won the Market League.' : `${st.title} cleared. Next: ${LEAGUE[at + 1].title}`)
    : won ? `${st.title}: won again.` : `Market League: win to clear ${st.title}.`;
  return (
    <div class="jp-stage-end">
      <p class={`sbk-note ${cleared ? 'good' : ''}`}>{note}</p>
      {s.config.stage && (
        <>
          <StageMoment st={st} words={won ? st.after : st.before} />
          {!won && <p class="sbk-sub">{st.lesson}</p>}
          <span class="sbk-lab">Stars for this stage</span>
          <MasteryList stage={at} have={myStars()} fresh={fresh} />
        </>
      )}
    </div>
  );
}
