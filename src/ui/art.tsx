// Shared art components in the shapes the screens use, drawn from the Great Fruit Exchange deck art (DEC-066):
// the owner's illustrations (deckArt.ts), the flat fruit (fruitIcons.tsx) and the card system (cards.tsx).
// Favour cards, coins and upgrade icons have no deck art yet and stay pixel icons (pixel.tsx).
import type { FruitId, Stage } from '../engine/data';
import { ART_SIZE } from './cards';
import { GUEST_EVENT, customerArt, eventArt, guestArt, shopBadge, shopScene } from './deckArt';
import { FruitSvg } from './fruitIcons';
import { Icon, WearPin } from './pixel';

export function Fruit({ id, size = 28, stage = 'fresh', x, y }: { id: FruitId; size?: number; stage?: Stage; x?: number; y?: number }) {
  return <FruitSvg id={id} size={size} stage={stage} x={x} y={y} />;
}

/** An event's Gazette picture as a rounded thumbnail (by its id). */
export function EventIcon({ id, size = 20 }: { id: string; size?: number }) {
  const src = eventArt(id);
  const [w, h] = ART_SIZE.event;
  return (
    <span class="xev" style={{ width: `${size}px`, height: `${size}px` }} aria-hidden="true">
      {src && <img src={src} width={w} height={h} alt="" decoding="async" loading="lazy" draggable={false} />}
    </span>
  );
}

/** Pixel art for a favour card (no deck art yet). */
export function FavourIcon({ id, size = 20 }: { id: string; size?: number }) {
  return <Icon name={`fv_${id}`} size={size} />;
}

/** Pixel coin (no deck art yet). */
export function Coin({ size = 16 }: { size?: number }) {
  return <Icon name="coin" size={size} />;
}

/** At this size and up a shopkeeper shows their stall scene instead of the round sign badge. */
const SCENE_FROM = 72;
/** Worn-look pins only show where there is room for them. */
const PINS_FROM = 26;
/** Where each guest stands in the event picture they borrow (guests have no portrait of their own yet). */
const GUEST_FOCUS: Record<string, string> = { Influencer: '0% 70%', 'Gym Club': '50% 45%', 'Hotel Chef': '100% 55%' };

type Pic = { kind: 'cust' | 'guest' | 'keeper' | 'scene' | 'none'; src: string | null; w: number; h: number; pos?: string };

/** Which picture a character key shows. Customers and guests by their hidden key, shopkeepers by avatar. */
export function facePic(who: string, size: number): Pic {
  const cust = customerArt(who);
  if (cust) return { kind: 'cust', src: cust, w: ART_SIZE.customer[0], h: ART_SIZE.customer[1] };
  if (GUEST_EVENT[who]) return { kind: 'guest', src: guestArt(who), w: ART_SIZE.event[0], h: ART_SIZE.event[1], pos: GUEST_FOCUS[who] };
  if (size >= SCENE_FROM) {
    const scene = shopScene(who);
    if (scene) return { kind: 'scene', src: scene, w: ART_SIZE.scene[0], h: ART_SIZE.scene[1] };
  }
  const badge = shopBadge(who);
  if (badge) return { kind: 'keeper', src: badge, w: ART_SIZE.badge[0], h: ART_SIZE.badge[1] };
  // Anyone without art (older player avatars, the generic walk-in): a plain silhouette, never someone else's face.
  return { kind: 'none', src: null, w: 0, h: 0 };
}

/**
 * A character portrait: a shopkeeper's avatar key or a customer's (hidden) key. `worn` is the list of looks the
 * shopkeeper has on (looks.ts); each shows as a small pin until illustrated wearables exist.
 * Never pass a face-down customer: use TradingCardBack (cards.tsx), which loads no portrait.
 */
export function Face({ who, size = 28, worn }: { who: string; size?: number; worn?: string[] }) {
  const pic = facePic(who, size);
  const pins = size >= PINS_FROM ? (worn ?? []) : [];
  const img = pic.src && (
    <img class="xf-img" src={pic.src} width={pic.w} height={pic.h} alt="" decoding="async" loading="lazy" draggable={false}
      style={pic.pos ? { objectPosition: pic.pos } : undefined} />
  );
  const box = { width: `${size}px`, height: `${size}px` };
  if (!pins.length) return <span class={`xf xf-${pic.kind}`} style={box}>{img}</span>;
  // With pins the portrait is clipped on an inner layer, so the pins can sit over its edge.
  return (
    <span class={`xf xf-${pic.kind} xf-pinned`} style={box}>
      <span class="xf-clip">{img}</span>
      <span class="xf-pins">{pins.map((id) => <span class="xf-pin" key={id}><WearPin id={id} size={Math.max(10, Math.round(size * 0.24))} /></span>)}</span>
    </span>
  );
}

/** The wordmark: the game's name, nothing else. */
export function Logo({ size = 120 }: { size?: number }) {
  return (
    <div class="x-logo" style={{ fontSize: `${Math.round(size / 5)}px` }}>
      <b class="x-title">Fruit Market</b>
    </div>
  );
}
