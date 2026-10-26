// Fruit tracks: one row of freshness positions per fruit, used by the stall sheet (panel.tsx).
import { FRUIT, stageAt, type FruitId, type Stage } from '../engine/data';
import type { Stock } from '../engine/game';
import { Fruit } from './art';

const STAGE_LABEL: Record<Stage, string> = { fresh: 'Fresh', okay: 'Okay', notso: 'Not so', unripe: 'Unripe' };

interface TrackProps {
  f: FruitId;
  stock: Stock;
  costs?: (pos: number) => number;
  onPick?: (pos: number) => void;
  canPick?: (pos: number) => boolean;
  compact?: boolean;
  flash?: string;
}

export function Track({ f, stock, costs, onPick, canPick, compact, flash }: TrackProps) {
  const cells = stock[f];
  return (
    <div class={`track ${compact ? 'compact' : ''}`}>
      <div class="track-label">
        <Fruit id={f} size={compact ? 20 : 26} />
        {!compact && <span>{FRUIT[f].name}</span>}
      </div>
      <div class="cells" style={{ gridTemplateColumns: `repeat(${cells.length}, 1fr)` }}>
        {cells.map((n, pos) => {
          const stage = stageAt(f, pos);
          const pickable = !!onPick && n > 0 && (!canPick || canPick(pos));
          return (
            <button
              type="button"
              class={`cell st-${stage} ${n ? 'has' : ''} ${pickable ? 'pick' : ''} ${flash === `${f}:${pos}` ? 'flash' : ''} ${pos === 0 && n ? 'rotting' : ''}`}
              disabled={!pickable}
              onClick={() => pickable && onPick!(pos)}
              aria-label={`${STAGE_LABEL[stage]} ${FRUIT[f].name}: ${n}`}
            >
              {n > 0 && (
                <span class="n">
                  {!compact && <Fruit id={f} size={16} stage={stage} />}
                  {n}
                </span>
              )}
              {costs && !compact && <span class="cost">${costs(pos)}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TrackLegend() {
  return (
    <div class="legend">
      <span><i class="st-notso" />Not so</span>
      <span><i class="st-okay" />Okay</span>
      <span><i class="st-fresh" />Fresh</span>
      <span><i class="st-unripe" />Unripe</span>
      <span class="legend-arrow">← ages each night</span>
    </div>
  );
}
