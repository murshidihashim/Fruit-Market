// The Market League (PLAN-113): the stage you are on first, with your shopkeeper against its rivals and one Play
// button; under it the six stages with their real rivals, levels and lengths. Stages you cleared are ticked; the ones
// ahead are dashed. Which stage is played, its rivals and its length are the league's own (progress.ts LEAGUE): this
// screen only shows them.
import { Face } from './art';
import { fx } from './fx';
import { worn } from './looks';
import { LEAGUE, leagueConfig, leagueStage } from './progress';
import { stageGoal, stageLine, stageRivals } from './progressView';
import { BackArrow, FramedFace, shownAvatar } from './stampCard';
import { partsOf } from '../net/looks';

/** A cleared stage's mark. */
function Tick() {
  return <svg width="14" height="14" viewBox="0 0 14 14" role="img" aria-label="Cleared"><path d="M2 7.5 5.5 11 12 3.5" stroke="currentColor" stroke-width="2.6" fill="none" /></svg>;
}

export function LeagueScreen({ onBack, onPlay }: { onBack: () => void; onPlay: () => void }) {
  const at = leagueStage();
  const done = at >= LEAGUE.length;
  const now = Math.min(at, LEAGUE.length - 1);
  const st = LEAGUE[now];
  const rivals = stageRivals(st);
  // Your picture as the stage will show it: the league seats you without a shopkeeper of your own, and the table shows
  // your chosen one, or the first one free when a rival on this stage is that shopkeeper (looks.ts shownAvatar).
  const cfg = leagueConfig(now, '', '', 0);
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
            <span class="sbk-lab jp-yel">{done ? `All ${LEAGUE.length} stages cleared` : `Stage ${now + 1} of ${LEAGUE.length}`}</span>
            <h2 id="jp-lg-title">{st.title}</h2>
            <span>{done ? `Play the ${st.title} again any time` : stageGoal(st)}</span>
            <div class="jp-lg-vs">
              <span class="jp-round"><Face who={me} size={58} worn={partsOf(look)} /></span>
              <span class="jp-vs" aria-hidden="true">vs</span>
              <span class="jp-lg-rivals">{rivals.map((r) => <span class="jp-round" title={r.name}><Face who={r.avatar} size={rivals.length > 1 ? 44 : 58} /></span>)}</span>
            </div>
            <button type="button" class="jp-go" onClick={() => { fx.tap(); onPlay(); }}>{done ? `Replay stage ${now + 1}` : `Play stage ${now + 1}`}</button>
          </section>
          <ol class="jp-lg-list" aria-label="The stages">
            {LEAGUE.map((x, i) => {
              const state = i < at ? 'done' : i === now && !done ? 'now' : i === now ? 'done' : 'later';
              const rs = stageRivals(x);
              return (
                <li class={`jp-lg ${state}`} aria-current={i === now ? 'step' : undefined}>
                  <i class="jp-lg-n">{state === 'done' ? <Tick /> : i + 1}</i>
                  <span class="jp-lg-t"><b>{x.title}</b><small>{stageLine(x)} · {rs.map((r) => r.name).join(', ')}</small></span>
                  <span class="jp-lg-faces" aria-hidden="true">{rs.map((r) => <FramedFace who={r.avatar} size={26} />)}</span>
                </li>
              );
            })}
          </ol>
          <p class="sbk-sub jp-lg-foot">Win a stage to move up. A shared win counts. Lose, and you play the stage again.</p>
        </div>
      </main>
    </div>
  );
}
