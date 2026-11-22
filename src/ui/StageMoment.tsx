// The Market League campaign's pieces on screen (PLAN-115): a stage's moment (its picture from the game's own card art
// and what its host shopkeeper says), its three goals with their stars (PLAN-118: the clear goal and two optional
// goals), and a row of stars. Words and pictures come from campaign.ts and the card art; nothing here is animated.
import type { GameState } from '../engine/game';
import { EASE, FEEL, held, isReduced, ms } from './motion';
import { Face } from './art';
import { LEAGUE, afterLine, isExpert, missedGoals, picName, stageByNo, stageCleared, stageHost, starGoals, starsEarned, type Stage, type StagePic } from './campaign';
import { CardArt } from './cards';
import { customerArt, eventArt, shopScene } from './deckArt';
import { myStars } from './progress';
import './league.css';

export const picSrc = (p: StagePic): string | null => (p.kind === 'event' ? eventArt(p.id) : p.kind === 'keeper' ? shopScene(p.id) : customerArt(p.id));

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

/** The results already shown, so a redraw never plays the stars' reveal again. */
const revealed = new WeakSet<Element>();
/**
 * PLAN-123: the stars a League game earned for the first time are revealed one after another once the result is shown
 * (size and fade only; they end by themselves). With reduced motion they are simply there. Called as the box's ref.
 */
function revealStars(box: HTMLElement | null): void {
  if (!box || revealed.has(box) || isReduced() || typeof box.animate !== 'function') return;
  revealed.add(box);
  const stars = [...box.querySelectorAll<HTMLElement>('.jp-st-new .jp-star, .jp-st-new .jp-ms-tag')];
  stars.forEach((el, i) => el.animate(
    [{ opacity: 0, transform: 'scale(0.4)' }, { opacity: 1, transform: 'scale(1.25)', offset: 0.7 }, { opacity: 1, transform: 'none' }],
    { duration: ms(FEEL.sheetIn), delay: held(400) + Math.floor(i / 2) * held(260), easing: EASE.sheet, fill: 'backwards' },
  ));
}

/** PLAN-123: one star's state on the results, in words: earned for the first time, met again, held from an earlier game, or missed. */
export type StarState = 'new' | 'again' | 'held' | 'missed';
export const STAR_WORD: Record<StarState, string> = { new: 'New', again: 'Met again', held: 'Earned before', missed: 'Missed' };
export function starState(id: string, have: readonly string[], fresh: readonly string[], met: readonly string[]): StarState {
  if (fresh.includes(id)) return 'new';
  if (met.includes(id)) return 'again';
  return have.includes(id) ? 'held' : 'missed';
}

/**
 * A stage's three goals, each with its star: the clear goal first. `have`: the ids held. `fresh`: the ids just earned.
 * PLAN-123: on the results (`met`, the stars this game met), each goal says what this game did about it, in words as
 * well as by its star: New, Met again, Earned before or Missed.
 */
export function MasteryList({ stage, have, fresh = [], met }: { stage: number; have: readonly string[]; fresh?: readonly string[]; met?: readonly string[] }) {
  const st = stageByNo(stage);
  if (!st) return null;
  return (
    <ul class="jp-ms" aria-label="Stars for this stage">
      {starGoals(st).map((m) => {
        const on = have.includes(m.id);
        const state = met ? starState(m.id, have, fresh, met) : null;
        return (
          <li class={`${on ? 'on' : ''}${state ? ` jp-st-${state}` : ''}`} data-star={m.id}>
            <Star on={on} />
            <span>{m.text}</span>
            {state
              ? <i class={`jp-ms-tag ${state}`}>{STAR_WORD[state]}</i>
              : <span class="jp-sr">{on ? (fresh.includes(m.id) ? ': earned this game' : ': earned') : ': not yet'}</span>}
            {!state && fresh.includes(m.id) && <i class="jp-ms-new" aria-hidden="true">New</i>}
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
 * the game and the stage's lesson) and the stage's stars, each saying what this game did about it.
 * PLAN-123: the next action sits right under the stars: Next stage (with its name) when the stage was cleared, Retry
 * otherwise; and the stars this game earned first are revealed one after another once the result is shown (at once
 * with reduced motion; a tap on the page hurries it).
 */
export function StageEnd({ s, owner, cleared, fresh, onMain, onRetry }: {
  s: GameState; owner: number; cleared: boolean; fresh: readonly string[];
  /** The results' main action: Next stage when cleared (the stamp book after the last stage), else Retry. */
  onMain?: () => void;
  /** Retry the same stage, offered beside Next stage when the stage was cleared. */
  onRetry?: () => void;
}) {
  const at = s.config.league;
  const st = stageByNo(at);
  if (at === undefined || !st) return null;
  const met = stageCleared(s, owner);
  const missed = met ? [] : missedGoals(s, owner).filter((m) => m.id === st.clear.id);
  const last = at + 1 >= LEAGUE.length;
  const expert = isExpert(at);
  const note = cleared ? (last ? `${st.title} cleared. Chapter 1 is yours.` : `${st.title} cleared. Next: ${LEAGUE[at + 1].title}`)
    // REP-135 RA-04: an expert stage never moves you up, so its first clear is the one whose clear star is new.
    : met && expert && fresh.includes(st.clear.id) ? `${st.title} cleared.`
    : met ? `${st.title}: cleared again.` : expert ? `${st.title}: not cleared yet.` : `Market League: clear ${st.title} to move up.`;
  const retryWord = expert ? 'Retry this expert stage' : `Retry stage ${at + 1}`;
  const main = cleared ? (last ? 'Open your stamp book' : `Next stage: ${LEAGUE[at + 1].title}`) : retryWord;
  return (
    <div class="jp-stage-end" ref={revealStars}>
      <p class={`sbk-note ${cleared || met ? 'good' : ''}`}>{note}</p>
      {missed.map((m) => <p class="jp-missed"><b>Missed</b>{` ${m.text}`}</p>)}
      {s.config.stage && (
        <>
          <StageMoment st={st} words={met ? afterLine(st, starsEarned(s, owner)) : st.before} />
          {!met && <p class="sbk-sub">{st.lesson}</p>}
          <span class="sbk-lab">Stars for this stage</span>
          <MasteryList stage={at} have={myStars()} fresh={fresh} met={starsEarned(s, owner)} />
        </>
      )}
      {onMain && (
        <div class="jp-stage-acts" data-a="stage-actions">
          <button type="button" class="sbk-btn jp-stage-go" data-a="stage-main" onClick={onMain}>{main}</button>
          {cleared && onRetry && <button type="button" class="sbk-btn gh" data-a="stage-retry" onClick={onRetry}>{retryWord}</button>}
        </div>
      )}
    </div>
  );
}
