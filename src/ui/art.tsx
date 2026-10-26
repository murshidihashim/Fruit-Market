// Shared art components. All drawing lives in pixel.tsx; these keep the names the screens use.
import type { FruitId, Stage } from '../engine/data';
import { Icon, PixelFruit, Portrait } from './pixel';

export function Fruit({ id, size = 28, stage = 'fresh', x, y }: { id: FruitId; size?: number; stage?: Stage; x?: number; y?: number }) {
  return <PixelFruit id={id} size={size} stage={stage} x={x} y={y} />;
}

/** Pixel art for an event card (by its id). */
export function EventIcon({ id, size = 20 }: { id: string; size?: number }) {
  return <Icon name={`ev_${id}`} size={size} />;
}

/** Pixel art for a favour card. */
export function FavourIcon({ id, size = 20 }: { id: string; size?: number }) {
  return <Icon name={`fv_${id}`} size={size} />;
}

export function Coin({ size = 16 }: { size?: number }) {
  return <Icon name="coin" size={size} />;
}

/** A character portrait: a player's avatar key or a customer's name. */
export function Face({ who, size = 28 }: { who: string; size?: number }) {
  return <Portrait who={who} size={size} />;
}

/** Title-screen logo: a pixel stall with fruit on the counter. */
export function Logo({ size = 120 }: { size?: number }) {
  return (
    <div class="logo" style={{ width: `${size}px` }}>
      <div class="logo-awning" />
      <div class="logo-counter">
        <Fruit id="apple" size={size * 0.24} />
        <Fruit id="mango" size={size * 0.24} />
        <Fruit id="blueberry" size={size * 0.24} />
      </div>
    </div>
  );
}
