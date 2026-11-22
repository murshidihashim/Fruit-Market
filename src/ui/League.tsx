// The Market League (PLAN-113; PLAN-115, a solo campaign): the stage chosen first (the one you are on, or a cleared
// one to play again for its stars), with your shopkeeper against its rivals, the stage's moment (its picture and what
// its host says), its three stars and one Play button; under it the six stages with their rivals, lengths and stars.
// Stages you cleared are ticked and can be chosen; the ones ahead are dashed. Which stage is played, its rivals, its
// length and its goals are the league's own (campaign.ts): this screen only shows them.
import { useState } from 'preact/hooks';
import { Face } from './art';
import { STAR_COUNT, stageStars } from './campaign';
import { fx } from './fx';
import { worn } from './looks';
import { isReduced } from './motion';
import { LEAGUE, leagueConfig, leagueStage, myStars } from './progress';
import { stageGoal, stageLine, stageRivals } from './progressView';
import { BackArrow, FramedFace, shownAvatar } from './stampCard';
import { MasteryList, StageMoment, Stars } from './StageMoment';
import { partsOf } from '../net/looks';

/** A cleared stage's mark. */
function Tick() {
  return <svg width="14" height="14" viewBox="0 0 14 14" role="img" aria-label="Cleared"><path d="M2 7.5 5.5 11 12 3.5" stroke="currentColor" stroke-width="2.6" fill="none" /></svg>;
}

interface Props { onBack: () => void; onPlay: (stage: number) => void }

export function LeagueScreen(p: Props) {
  const [sel, setSel] = useState(() => Math.min(leagueStage(), LEAGUE.length - 1));
  // The chosen stage shows at the top: the page scrolls up to it (at once when motion is reduced).
  const pick = (i: number) => {
    setSel(i);
    document.getElementById('jp-lg-title')?.closest('section')?.scrollIntoView({ block: 'start', behavior: isReduced() ? 'auto' : 'smooth' });
  };
  return <LeagueView {...p} sel={sel} onPick={pick} />;
}

/** The screen itself, with the stage chosen (`sel`) given: it holds no state of its own. */
export function LeagueView({ onBack, onPlay, sel, onPick }: Props & { sel: number; onPick: (stage: number) => void }) {
  const at = leagueStage();
  const done = at >= LEAGUE.length;
  const now = Math.min(at, LEAGUE.length - 1);
  const st = LEAGUE[sel];
  const rivals = stageRivals(st);
  const stars = myStars();
  const cleared = sel < at;
  // Your picture as the stage will show it: the league seats you without a shopkeeper of your own, and the table shows
  // your chosen one, or the first one free when a rival on this stage is that shopkeeper (looks.ts shownAvatar).
  const cfg = leagueConfig(sel, '', '');
  const me = shownAvatar(cfg.players.map((p) => ({ avatar: p.avatar ?? '', kind: p.kind })), 0);
  const look = worn();
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
            <span class="sbk-lab jp-yel">{done && sel === now ? `All ${LEAGUE.length} stages cleared` : `Stage ${sel + 1} of ${LEAGUE.length}${cleared ? ' · cleared' : ''}`}</span>
            <h2 id="jp-lg-title">{st.title}</h2>
            <span>{stageGoal(st)}</span>
            <div class="jp-lg-vs">
              <span class="jp-round"><Face who={me} size={58} worn={partsOf(look)} /></span>
              <span class="jp-vs" aria-hidden="true">vs</span>
              <span class="jp-lg-rivals">{rivals.map((r) => <span class="jp-round" title={r.name}><Face who={r.avatar} size={rivals.length > 1 ? 44 : 58} /></span>)}</span>
            </div>
            <StageMoment st={st} words={st.before} />
            <p class="jp-lg-lesson">{st.lesson}</p>
            <MasteryList stage={sel} have={stars} />
            <button type="button" class="jp-go" onClick={() => { fx.tap(); onPlay(sel); }}>{cleared ? `Replay stage ${sel + 1}` : `Play stage ${sel + 1}`}</button>
          </section>
          <ol class="jp-lg-list" aria-label="The stages">
            {LEAGUE.map((x, i) => {
              const state = i < at ? 'done' : i === now && !done ? 'now' : i === now ? 'done' : 'later';
              const rs = stageRivals(x);
              const got = stageStars(i, stars).length;
              const body = (
                <>
                  <i class="jp-lg-n">{state === 'done' ? <Tick /> : i + 1}</i>
                  <span class="jp-lg-t"><b>{x.title}</b><small>{stageLine(x)}</small></span>
                  <span class="jp-lg-end">
                    <span class="jp-lg-faces" aria-hidden="true">{rs.map((r) => <FramedFace who={r.avatar} size={26} />)}</span>
                    <Stars got={got} total={x.mastery.length} size={13} />
                  </span>
                </>
              );
              return (
                <li class={i === sel ? `jp-lg ${state} sel` : `jp-lg ${state}`} aria-current={i === now ? 'step' : undefined}>
                  {state === 'later' ? body : (
                    <button type="button" class="jp-lg-pick" aria-pressed={i === sel} onClick={() => { fx.tap(); onPick(i); }}>{body}</button>
                  )}
                </li>
              );
            })}
          </ol>
          <p class="sbk-sub jp-lg-foot">{`Win a stage to move up. A shared win counts. Stars: ${stars.length} of ${STAR_COUNT}. Play a cleared stage again for the stars you missed.`}</p>
        </div>
      </main>
    </div>
  );
}
