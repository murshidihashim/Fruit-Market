// Night falls (PLAN-071, redrawn in PLAN-072): the Wholesale Market and your shelf as lanes, in the table board's
// order, freshest box at the top. Every piece slides down one box; pieces in the Soft box slide off and are thrown
// away. A Heatwave slides two boxes, a Monsoon none, and a Shade Cloth fruit stays where it is.
import { useEffect, useState } from 'preact/hooks';
import { FRUIT, stageAt, type FruitId, type Stage } from '../../../engine/data';
import { nightOutlook, shadePick, type GameState } from '../../../engine/game';
import { tonightText } from '../../../engine/story';
import { EventIcon, Fruit } from '../../art';
import { LANES, STAGE_LETTER } from '../../table';

const WORD: Record<Stage, string> = { notso: 'soft', okay: 'okay', fresh: 'fresh', unripe: 'green' };

function Lane({ f, track, steps, go, label }: { f: FruitId; track: number[]; steps: number; go: boolean; label: string }) {
  const boxes = track.map((n, pos) => ({ n, pos })).reverse();
  return (
    <div class={`ns-lane ${f}`} role="img" aria-label={`${label} ${FRUIT[f].plural.toLowerCase()}: ${track.map((n, pos) => (n ? `${n} ${WORD[stageAt(f, pos)]}` : '')).filter(Boolean).join(', ') || 'none'}`}>
      <span class="ns-head"><Fruit id={f} size={16} /></span>
      {boxes.map(({ n, pos }) => (
        <div class={`ns-box ns-${stageAt(f, pos)}`}>
          <i>{STAGE_LETTER[stageAt(f, pos)]}</i>
          {n > 0 && (
            <span class={`ns-piece ${go && steps > 0 ? 'moved' : ''} ${go && steps > 0 && pos - steps < 0 ? 'gone' : ''}`} style={`--steps:${Math.min(steps, pos + 1)}`}>
              <Fruit id={f} size={16} stage={stageAt(f, pos)} />{n > 1 && <b>{n}</b>}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/** Pieces that slide off the end tonight. */
const lost = (track: number[], steps: number) => track.reduce((a, n, pos) => a + (pos < steps ? n : 0), 0);

export function NightShift({ s, viewer }: { s: GameState; viewer: number }) {
  const [go, setGo] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => setGo(true), 420); return () => window.clearTimeout(t); }, []);
  const steps = Math.max(0, 1 + (s.event?.ageExtra ?? 0));
  const pl = s.players[viewer];
  // A Shade Cloth that has not chosen is shown with the fruit the game will pick for it.
  const shade = pl.trait === 'keeper' ? (pl.shade === undefined ? shadePick(s, viewer) : pl.shade) : null;
  const mine = (f: FruitId) => (shade === f ? 0 : steps);
  const sub = steps === 0 ? 'No fruit ages tonight.' : steps === 1 ? 'Every piece slides down one box.' : `Every piece slides down ${steps} boxes tonight.`;
  const spoiled = LANES.map((f) => ({ f, n: lost(pl.stock[f], mine(f)) })).filter((x) => x.n > 0);
  const tonight = tonightText(nightOutlook(s, viewer));
  return (
    <div class="mid-panel night-shift" data-a="night-shift">
      <div class="ns-top">
        <EventIcon id={s.event ? s.event.id : 'calm'} size={44} />
        <div><b class="ns-title">Night falls</b><span class="ns-sub">{sub}{s.event?.ageExtra ? ` ${s.event.title}.` : ''}</span></div>
      </div>
      <div class="ns-boards">
        <div class="ns-block">
          <span class="ns-k">Wholesale Market</span>
          <div class="ns-lanes">{LANES.map((f) => <Lane f={f} track={s.market[f]} steps={steps} go={go} label="Market" />)}</div>
        </div>
        <div class="ns-block">
          <span class="ns-k">Your shelf{shade ? ' · Shade Cloth' : ''}</span>
          <div class="ns-lanes">{LANES.map((f) => <Lane f={f} track={pl.stock[f]} steps={mine(f)} go={go} label="Your" />)}</div>
        </div>
      </div>
      <div class="ns-spoiled" role="note">
        <span>Thrown away tonight</span>
        {spoiled.length ? spoiled.map((x) => <b><Fruit id={x.f} size={15} stage="notso" />{x.n}</b>) : <b>nothing of yours</b>}
      </div>
      {tonight && <div class="ns-note">{tonight}</div>}
    </div>
  );
}
