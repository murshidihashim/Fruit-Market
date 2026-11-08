// Shared art components in the shapes the screens use, drawn from the Great Fruit Exchange deck art (DEC-066):
// the owner's illustrations (deckArt.ts), the flat fruit (fruitIcons.tsx) and the card system (cards.tsx).
// Favour cards, coins, upgrade icons and worn looks are the Great Fruit Exchange drawings (exchangeArt.ts, DEC-069).
import type { FruitId, Stage } from '../engine/data';
import { ART_SIZE } from './cards';
import { GUEST_EVENT, customerArt, eventArt, guestArt, shopBadge, shopFile, shopScene } from './deckArt';
import { isIconName, wearUrl } from './exchangeArt';
import { FruitSvg } from './fruitIcons';
import { Icon } from './icons';

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

/** A favour card's Exchange icon (Gazette, voucher, first-bell ticket, ...). */
export function FavourIcon({ id, size = 20 }: { id: string; size?: number }) {
  const name = `fv_${id}`;
  return isIconName(name) ? <Icon name={name} size={size} /> : null;
}

/** The Exchange token (money). */
export function Coin({ size = 16 }: { size?: number }) {
  return <Icon name="coin" size={size} />;
}

/** At this size and up a shopkeeper shows their stall scene instead of the round sign badge. */
const SCENE_FROM = 72;
/** Worn regalia only show where there is room for them. */
const WEAR_FROM = 22;
/** Where each guest stands in the event picture they borrow (guests have no portrait of their own yet). */
const GUEST_FOCUS: Record<string, string> = { Influencer: '0% 70%', 'Gym Club': '50% 45%', 'Hotel Chef': '100% 55%' };

type Pic = { kind: 'cust' | 'guest' | 'keeper' | 'scene' | 'none'; src: string | null; w: number; h: number; pos?: string };

/** Which picture a character key shows. Customers and guests by their hidden key, shopkeepers by avatar.
 *  `dressed`: the shopkeeper wears regalia, which is fitted to the round badge, so the badge shows at every size. */
export function facePic(who: string, size: number, dressed = false): Pic {
  const cust = customerArt(who);
  if (cust) return { kind: 'cust', src: cust, w: ART_SIZE.customer[0], h: ART_SIZE.customer[1] };
  if (GUEST_EVENT[who]) return { kind: 'guest', src: guestArt(who), w: ART_SIZE.event[0], h: ART_SIZE.event[1], pos: GUEST_FOCUS[who] };
  if (size >= SCENE_FROM && !dressed) {
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
 * shopkeeper has on (looks.ts); they are drawn on the portrait as Exchange regalia, one picture over the badge
 * that may reach a little past the circle (a hat above it, a neck piece below the chin).
 * Never pass a face-down customer: use TradingCardBack (cards.tsx), which loads no portrait.
 */
export function Face({ who, size = 28, worn }: { who: string; size?: number; worn?: string[] }) {
  const key = shopFile(who);
  const wear = key && size >= WEAR_FROM && worn?.length ? wearUrl(key, worn) : null;
  const pic = facePic(who, size, !!wear);
  const img = pic.src && (
    <img class="xf-img" src={pic.src} width={pic.w} height={pic.h} alt="" decoding="async" loading="lazy" draggable={false}
      style={pic.pos ? { objectPosition: pic.pos } : undefined} />
  );
  const box = { width: `${size}px`, height: `${size}px` };
  if (!wear) return <span class={`xf xf-${pic.kind}`} style={box}>{img}</span>;
  // With regalia the portrait is clipped on an inner layer, so the regalia can reach past its edge.
  return (
    <span class={`xf xf-${pic.kind} xf-worn`} style={box}>
      <span class="xf-clip">{img}</span>
      <img class="xf-wear" src={wear} alt="" draggable={false} />
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
