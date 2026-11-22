// The Market League (PLAN-113; PLAN-115, a solo campaign; PLAN-118, the League road): the stage chosen first (the one
// you are on, or a cleared one to play again for its stars), with your shopkeeper against its rivals, the stage's moment
// (its picture and what its host says), its three stars (the clear goal and two optional goals) and one Play button;
// under it the next trophy within reach, then Chapter 1 drawn as a road of its twelve stages under the Roadside Table's
// awning (the first stall rank), each with its best stars, and the expert stages, which open with stars. Stages you
// cleared are ticked and can be chosen; the ones ahead are dashed. Which stage is played, its rivals, its length and
// its goals are the league's own (campaign.ts): this screen only shows them.
import { useState } from 'preact/hooks';
import { Face } from './art';
import { CARDS, nextStep, stepValue } from './achievements';
import { ALL_STAGES, EXPERTS, LEAGUE, STAR_COUNT, expertOpen, stageByNo, stageStars, starGoals, type Stage } from './campaign';
import { fx } from './fx';
import { worn } from './looks';
import { isReduced } from './motion';
import { leagueConfig, leagueStage, myStars, snapshot } from './progress';
import { stageGoal, stageLine, stageRivals } from './progressView';
import { RANKS } from './stamps';
import { Awning, BackArrow, FramedFace, TrophyPic, myColour, shownAvatar } from './stampCard';
import { MasteryList, StageMoment, Stars } from './StageMoment';
import { partsOf } from '../net/looks';
import './league.css';

/** A cleared stage's mark. */
function Tick() {
  return <svg width="14" height="14" viewBox="0 0 14 14" role="img" aria-label="Cleared"><path d="M2 7.5 5.5 11 12 3.5" stroke="currentColor" stroke-width="2.6" fill="none" /></svg>;
}
/** A closed expert stage's mark. */
function Lock() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" role="img" aria-label="Closed">
      <rect x="2.5" y="6.5" width="9" height="6" stroke="currentColor" stroke-width="1.8" fill="none" />
      <path d="M4.5 6.5V4.5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" stroke-width="1.8" fill="none" />
    </svg>
  );
}

interface Props { onBack: () => void; onPlay: (stage: number) => void }

/** The stage the screen opens on: the one you are on, or the last one when every stage is cleared. */
export const firstPick = (): number => Math.min(leagueStage(), LEAGUE.length - 1);

export function LeagueScreen(p: Props) {
  const [sel, setSel] = useState(firstPick);
  // The chosen stage shows at the top: the page scrolls up to it (at once when motion is reduced).
  const pick = (i: number) => {
    setSel(i);
    document.getElementById('jp-lg-title')?.closest('section')?.scrollIntoView({ block: 'start', behavior: isReduced() ? 'auto' : 'smooth' });
  };
  return <LeagueView {...p} sel={sel} onPick={pick} />;
}

/** Where a stage stands for this player: cleared, the one to play now, open (an expert stage), or not open yet. */
export type RoadState = 'done' | 'now' | 'open' | 'later';
export function roadState(i: number, at: number, stars: readonly string[]): RoadState {
  const st = ALL_STAGES[i];
  if (st.expert) return stars.includes(st.clear.id) ? 'done' : expertOpen(st, stars) ? 'open' : 'later';
  return i < at ? 'done' : i === at ? 'now' : 'later';
}

/**
 * The next League trophy tier within reach, with its progress: of the League stars card and the three mastery cards
 * (all counted in stars), the tier still to earn that is nearest to done. Null when every tier is held.
 */
export function nextTrophy(): { title: string; got: number; goal: number; card: (typeof CARDS)[number] } | null {
  const snap = snapshot();
  const cands = CARDS.filter((c) => c.group === 'league' && c.unit === 'stars').flatMap((card) => {
    const st = nextStep(card, snap);
    return st ? [{ card, title: card.title, got: Math.min(stepValue(card, st, snap), st.goal), goal: st.goal }] : [];
  });
  return cands.sort((a, b) => b.got / b.goal - a.got / a.goal || a.goal - b.goal)[0] ?? null;
}

/** "Opens at 12 stars · you have 9" */
const opensAt = (st: Stage, have: number): string => `Opens at ${st.expert?.stars ?? 0} stars · you have ${have}`;

/** The screen itself, with the stage chosen (`sel`) given: it holds no state of its own. */
export function LeagueView({ onBack, onPlay, sel, onPick }: Props & { sel: number; onPick: (stage: number) => void }) {
  const at = leagueStage();
  const done = at >= LEAGUE.length;
  const stars = myStars();
  const st = stageByNo(sel) ?? LEAGUE[0];
  const state = roadState(sel, at, stars);
  const rivals = stageRivals(st);
  const cleared = state === 'done';
  const expert = !!st.expert;
  // Your picture as the stage will show it: the league seats you without a shopkeeper of your own, and the table shows
  // your chosen one, or the first one free when a rival on this stage is that shopkeeper (looks.ts shownAvatar).
  const cfg = leagueConfig(sel, '', '');
  const me = shownAvatar(cfg.players.map((p) => ({ avatar: p.avatar ?? '', kind: p.kind })), 0);
  const look = worn();
  const trophy = nextTrophy();
  const label = expert ? `Expert stage${cleared ? ' · cleared' : ''}` : done && sel === LEAGUE.length - 1 ? `All ${LEAGUE.length} stages cleared` : `Stage ${sel + 1} of ${LEAGUE.length}${cleared ? ' · cleared' : ''}`;
  const playable = state !== 'later';
  const play = expert ? (cleared ? 'Replay this expert stage' : 'Play this expert stage') : cleared ? `Replay stage ${sel + 1}` : `Play stage ${sel + 1}`;
  return (
    <div class="sbk jp-page jp-league">
      <header class="jp-bar">
        <button class="jp-back" onClick={onBack} aria-label="Back"><BackArrow /></button>
        <h1>Market League</h1>
        <span class="jp-bar-end" />
      </header>
      <main class="sbk-scroll">
        <div class="sbk-in">
          <section class="jp-lg-now" aria-labelledby="jp-lg-title">
            <span class="sbk-lab jp-yel">{label}</span>
            <h2 id="jp-lg-title">{st.title}</h2>
            <span>{stageGoal(st)}</span>
            <div class="jp-lg-vs">
              <span class="jp-round"><Face who={me} size={58} worn={partsOf(look)} /></span>
              <span class="jp-vs" aria-hidden="true">vs</span>
              <span class="jp-lg-rivals">{rivals.map((r) => <span class="jp-round" title={r.name}><Face who={r.avatar} size={rivals.length > 1 ? 44 : 58} /></span>)}</span>
            </div>
            <span class="lg-rivals-line">{stageLine(st)}</span>
            <StageMoment st={st} words={st.before} />
            <p class="jp-lg-lesson">{st.lesson}</p>
            <MasteryList stage={sel} have={stars} />
            {playable
              ? <button type="button" class="jp-go" onClick={() => { fx.tap(); onPlay(sel); }}>{play}</button>
              : <p class="lg-closed">{opensAt(st, stars.length)}</p>}
          </section>

          {trophy && (
            <div class="lg-trophy">
              <span class="lg-trophy-pic" aria-hidden="true"><TrophyPic pic={trophy.card.pic} /></span>
              <span class="lg-trophy-tx">
                <span class="sbk-lab">Next trophy</span>
                <b>{`${trophy.title} · ${trophy.got} of ${trophy.goal} stars`}</b>
              </span>
            </div>
          )}

          <section class="lg-chapter" aria-labelledby="lg-ch1">
            <div class="lg-ch-head">
              <Awning colour={myColour(look)} />
              <div class="lg-ch-sign">
                <span class="sbk-lab">{`Chapter 1 · ${RANKS[0].name}`}</span>
                <h2 id="lg-ch1">Village Square</h2>
                <span class="sbk-sub">{`${stageStarsIn(LEAGUE, stars)} of ${LEAGUE.length * 3} stars`}</span>
              </div>
            </div>
            <ol class="lg-road" aria-label="The stages of Chapter 1">
              {LEAGUE.map((x, i) => <RoadStop st={x} n={i} state={roadState(i, at, stars)} sel={sel} stars={stars} onPick={onPick} />)}
            </ol>
          </section>

          <section class="lg-chapter lg-experts" aria-labelledby="lg-ex">
            <div class="lg-ch-sign">
              <span class="sbk-lab">Expert stages</span>
              <h2 id="lg-ex">Harder markets</h2>
              <span class="sbk-sub">Each opens with stars from Chapter 1.</span>
            </div>
            <ol class="lg-road lg-road-ex" aria-label="The expert stages">
              {EXPERTS.map((x, k) => <RoadStop st={x} n={LEAGUE.length + k} state={roadState(LEAGUE.length + k, at, stars)} sel={sel} stars={stars} onPick={onPick} />)}
            </ol>
          </section>
          <p class="sbk-sub jp-lg-foot">{`Clear a stage's goal to move up. Stars: ${stars.length} of ${STAR_COUNT}. Play a cleared stage again for the stars you missed.`}</p>
        </div>
      </main>
    </div>
  );
}

/** Stars held on a list of stages. */
const stageStarsIn = (list: Stage[], have: readonly string[]): number => list.reduce((a, st) => a + starGoals(st).filter((m) => have.includes(m.id)).length, 0);

/** One stop on the road: its marker (number, tick or lock), its title and line, and its best stars. */
function RoadStop({ st, n, state, sel, stars, onPick }: { st: Stage; n: number; state: RoadState; sel: number; stars: readonly string[]; onPick: (stage: number) => void }) {
  const got = stageStars(n, stars).length;
  const mark = state === 'done' ? <Tick /> : state === 'later' && st.expert ? <Lock /> : st.expert ? 'X' : n + 1;
  const sub = state === 'later' && st.expert ? opensAt(st, stars.length) : stageLine(st);
  const body = (
    <>
      <i class="lg-mark" aria-hidden={typeof mark !== 'object'}>{mark}</i>
      <span class="lg-stop-t"><b>{st.title}</b><small>{sub}</small></span>
      <span class="lg-stop-end">
        <span class="lg-faces" aria-hidden="true">{state === 'now' && <span class="lg-next">Next</span>}{stageRivals(st).map((r) => <FramedFace who={r.avatar} size={22} />)}</span>
        <Stars got={got} total={starGoals(st).length} size={13} />
      </span>
    </>
  );
  return (
    <li class={`lg-stop ${state}${n === sel ? ' sel' : ''}`} aria-current={state === 'now' ? 'step' : undefined}>
      {state === 'later' ? <span class="lg-stop-in">{body}</span> : (
        <button type="button" class="lg-stop-in" aria-pressed={n === sel} onClick={() => { fx.tap(); onPick(n); }}>{body}</button>
      )}
    </li>
  );
}
