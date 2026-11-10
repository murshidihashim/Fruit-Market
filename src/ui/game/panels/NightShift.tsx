// The night, shown (PLAN-071): every piece at the Wholesale Market and on your shelf slides one box older, the way
// the pieces slide one box left on the table board and stall sheet. Pieces in the Soft box slide off and are thrown
// away. A Heatwave slides two boxes, a Monsoon none, and a Shade Cloth fruit stays where it is.
import { useEffect, useState } from 'preact/hooks';
import { FRUIT, stageAt, type FruitId, type Stage } from '../../../engine/data';
import { nightOutlook, shadePick, type GameState } from '../../../engine/game';
import { tonightText } from '../../../engine/story';
import { Fruit } from '../../art';

const LETTER: Record<Stage, string> = { notso: 'S', okay: 'O', fresh: 'F', unripe: 'G' };
const WORD: Record<Stage, string> = { notso: 'soft', okay: 'okay', fresh: 'fresh', unripe: 'green' };
/** Shortest life first (3, 4, 5, 6 days): the same lane order as the table board and stall sheet. */
const BY_LIFE: FruitId[] = ['blueberry', 'watermelon', 'mango', 'apple'];

function Track({ f, track, steps, go, label }: { f: FruitId; track: number[]; steps: number; go: boolean; label: string }) {
  return (
    <div class="ns-row" role="img" aria-label={`${label} ${FRUIT[f].plural.toLowerCase()}: ${track.map((n, pos) => (n ? `${n} ${WORD[stageAt(f, pos)]}` : '')).filter(Boolean).join(', ') || 'none'}`}>
      <span class="ns-fruit"><Fruit id={f} size={18} /></span>
      <div class="ns-track">
        {track.map((n, pos) => (
          <div class={`ns-box ns-${stageAt(f, pos)}`}>
            <i>{LETTER[stageAt(f, pos)]}</i>
            {n > 0 && (
              <span class={`ns-piece ${go && steps > 0 ? 'moved' : ''} ${go && steps > 0 && pos - steps < 0 ? 'gone' : ''}`} style={`--steps:${Math.min(steps, pos + 1)}`}>
                <Fruit id={f} size={17} stage={stageAt(f, pos)} />{n > 1 && <b>{n}</b>}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function NightShift({ s, viewer }: { s: GameState; viewer: number }) {
  const [go, setGo] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => setGo(true), 420); return () => window.clearTimeout(t); }, []);
  const steps = Math.max(0, 1 + (s.event?.ageExtra ?? 0));
  const pl = s.players[viewer];
  // A Shade Cloth that has not chosen is shown with the fruit the game will pick for it.
  const shade = pl.trait === 'keeper' ? (pl.shade === undefined ? shadePick(s, viewer) : pl.shade) : null;
  const title = steps === 0 ? 'Night: no fruit ages tonight' : steps === 1 ? 'Night: every piece slides one box older' : `Night: every piece slides ${steps} boxes older`;
  const tonight = tonightText(nightOutlook(s, viewer));
  return (
    <div class="mid-panel night-shift" data-a="night-shift">
      <b class="ns-title">{title}</b>
      <div class="ns-block">
        <span class="ns-k">Wholesale Market</span>
        {BY_LIFE.map((f) => <Track f={f} track={s.market[f]} steps={steps} go={go} label="Market" />)}
      </div>
      <div class="ns-block">
        <span class="ns-k">Your shelf{shade ? ` · ${FRUIT[shade].plural.toLowerCase()} under the Shade Cloth` : ''}</span>
        {BY_LIFE.map((f) => <Track f={f} track={pl.stock[f]} steps={shade === f ? 0 : steps} go={go} label="Your" />)}
      </div>
      {tonight && <div class="ns-note">{tonight}</div>}
    </div>
  );
}
