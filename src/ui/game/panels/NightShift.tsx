// Night falls (PLAN-071, drawn as the design's lanes in PLAN-072): the Wholesale Market and your shelf as lanes, in
// the printed board's order, the freshest box at the top. Every piece slides down one box; pieces in the Soft box
// slide off and are thrown away. A Heatwave slides two boxes, a Monsoon none, and a Shade Cloth fruit stays put.
import { FRUIT, stageAt, type FruitId } from '../../../engine/data';
import { nightOutlook, shadePick, type GameState } from '../../../engine/game';
import { dayLedger, tonightText } from '../../../engine/story';
import { Fruit } from '../../art';
import { LANES } from '../../boardModel';
import { Lamp, STAGE_WORD } from '../../ticket';
import type { NightSlide } from '../animator';

function Lane({ f, track, steps, go, rest, label }: { f: FruitId; track: number[]; steps: number; go: boolean; rest: boolean; label: string }) {
  const boxes = track.map((n, pos) => ({ n, pos })).reverse();
  return (
    <div class={`tk-lane ${f}`} role="img" aria-label={`${label} ${FRUIT[f].plural.toLowerCase()}: ${track.map((n, pos) => (n ? `${n} ${STAGE_WORD[stageAt(f, pos)]}` : '')).filter(Boolean).join(', ') || 'none'}`}>
      <span class="tk-lane-head"><Fruit id={f} size={18} /></span>
      {boxes.map(({ n, pos }) => (
        <div class={`tk-box st-${stageAt(f, pos)} ${n ? 'has' : ''}`}>
          <Lamp stage={stageAt(f, pos)} size={14} />
          {n > 0 && (
            <span class={`ns-piece ${go && steps > 0 ? 'moved' : ''} ${go && steps > 0 && pos - steps < 0 ? 'gone' : ''} ${rest ? 'rest' : ''}`} style={`--steps:${Math.min(steps, pos + 1)}`}>
              <Fruit id={f} size={18} stage={stageAt(f, pos)} /><b>{n}</b>
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/** Pieces that slide off the end tonight. */
const lost = (track: number[], steps: number) => track.reduce((a, n, pos) => a + (pos < steps ? n : 0), 0);

/** `slide` comes from the night's own script (animator.tsx nightfall), so the panel and the slide share one clock
 *  (PLAN-081): null while dusk falls, the slide's length in ms while the pieces move, 'done' when they have arrived
 *  (also after a tap, which ends the slide at once). The panel has no timer of its own; its dusk reads the table's one
 *  speed from the stylesheet (--mk, motion.ts). */
export function NightShift({ s, viewer, slide = null }: { s: GameState; viewer: number; slide?: NightSlide }) {
  const go = slide !== null;
  const rest = slide === 'done';
  const steps = Math.max(0, 1 + (s.event?.ageExtra ?? 0));
  const pl = s.players[viewer];
  // A Shade Cloth that has not chosen is shown with the fruit the game will pick for it.
  const shade = pl.trait === 'keeper' ? (pl.shade === undefined ? shadePick(s, viewer) : pl.shade) : null;
  const mine = (f: FruitId) => (shade === f ? 0 : steps);
  const sub = steps === 0 ? `No fruit ages tonight${s.event ? ` (${s.event.title})` : ''}.`
    : steps === 1 ? 'Every piece slides down one box.' : `Every piece slides down. ${s.event?.title ?? 'Tonight'}: ${steps} boxes tonight.`;
  const spoiled = LANES.map((f) => ({ f, n: lost(pl.stock[f], mine(f)) }));
  const tonight = tonightText(nightOutlook(s, viewer));
  const { sales, bought } = dayLedger(s, viewer);
  return (
    <div class="mid-panel night-shift tk-night" data-a="night-shift" style={typeof slide === 'number' ? `--ns-ms:${Math.round(slide)}ms` : undefined}>
      <div class="tk-night-head"><b>Night falls</b><span>{sub}</span></div>
      <div class="tk-night-boards">
        <div class="tk-night-block">
          <span class="tk-label">Wholesale market</span>
          <div class="tk-lanes">{LANES.map((f) => <Lane f={f} track={s.market[f]} steps={steps} go={go} rest={rest} label="Market" />)}</div>
        </div>
        <div class="tk-night-block">
          <span class="tk-label">Your shelf{shade ? ' · Shade Cloth' : ''}</span>
          <div class="tk-lanes">{LANES.map((f) => <Lane f={f} track={pl.stock[f]} steps={mine(f)} go={go} rest={rest} label="Your" />)}</div>
        </div>
      </div>
      <div class="tk-spoiled" role="note" aria-label={`Spoiled on your shelf tonight: ${spoiled.map((x) => `${x.n} ${FRUIT[x.f].plural.toLowerCase()}`).join(', ')}`}>
        <span>Spoiled tonight</span>
        <span class="tk-spoiled-n">{spoiled.map((x) => <b class={x.n ? '' : 'none'}><Fruit id={x.f} size={18} stage="notso" />{x.n}</b>)}</span>
      </div>
      <div class="tk-dayend">
        <span class="tk-label">End of day {s.day}</span>
        <div class="tk-dayend-row"><span>Sales <b>+${sales}</b></span><span>Bought <b>−${bought}</b></span>{tonight && <small>{tonight}</small>}</div>
      </div>
    </div>
  );
}
