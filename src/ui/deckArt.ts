// The Great Fruit Exchange deck art (DEC-066). The owner's illustrations, extracted by scripts/deck-art.py into
// public/art, are plain files the browser loads when a picture is first shown (nothing is bundled into the code).
// Keys are the hidden code keys (data.ts); the names players see come from the game data, never from the art.
import { CUSTOMER_CARDS, EVENT_CARDS, RIVALS } from '../engine/data';

const BASE = `${import.meta.env.BASE_URL ?? './'}art/`;

/** Shopkeeper art files, in RIVALS order (Rosa, Uncle Benny, Ah Chen, Saleh, Raj, Kiki, Pak Din, Farah). Pak Din and
 *  Farah were drawn in the style of the owner's six (PLAN-061; sources in docs/studio/art-drafts/shopkeepers). */
const SHOP_FILES = ['rosa', 'benny', 'chen', 'saleh', 'raj', 'kiran', 'pakdin', 'farah'] as const;

/** Guests have no portrait of their own: they borrow their event's scene, which shows them. */
export const GUEST_EVENT: Record<string, string> = {
  Influencer: 'mangoCraze', 'Gym Club': 'superfood', 'Hotel Chef': 'hotel', 'Wedding Caterer': 'kenduri', Bakery: 'bakeOff',
};

/**
 * Characters or events with no picture yet (by key: event id, avatar or guest name). Their cards show "Art coming" or a
 * plain silhouette, never someone else's picture. Empty since PLAN-061 drew the last rules 11 gaps; kept for new cards.
 */
export const ART_COMING: ReadonlySet<string> = new Set<string>([]);
const slug = (key: string) => key.toLowerCase().replace(/ /g, '-');
const CUSTOMER_KEYS = new Set(CUSTOMER_CARDS.map((c) => c.name));
/** Events with a picture (the seven rules 11 events were drawn in PLAN-061; sources in docs/studio/art-drafts/events). */
const EVENT_IDS = new Set<string>(EVENT_CARDS.map((e) => e.id).filter((id) => !ART_COMING.has(id)));

/** A customer's "at work" trading-card picture, or null for anyone without one (guests, the walk-in). */
export function customerArt(key: string): string | null {
  return CUSTOMER_KEYS.has(key) ? `${BASE}customers/${slug(key)}.webp` : null;
}

/** A shopkeeper's art file key ('rosa', 'benny', ...) by avatar, or null for anyone else. */
export function shopFile(avatar: string): string | null {
  const i = RIVALS.findIndex((r) => r.avatar === avatar);
  return i >= 0 ? SHOP_FILES[i] ?? null : null;
}

/** A shopkeeper's "over the counter" stall-sign scene. */
export function shopScene(avatar: string): string | null {
  const f = shopFile(avatar);
  return f ? `${BASE}scenes/${f}.webp` : null;
}

/** A shopkeeper's round sign badge (best for small sizes). */
export function shopBadge(avatar: string): string | null {
  const f = shopFile(avatar);
  return f ? `${BASE}avatars/${f}.webp` : null;
}

/** An event's Gazette front-page scene. */
export function eventArt(id: string): string | null {
  return EVENT_IDS.has(id) ? `${BASE}events/${id}.webp` : null;
}

/** A guest's picture: its event's scene for now (see GUEST_EVENT). */
export function guestArt(name: string): string | null {
  const ev = GUEST_EVENT[name];
  return ev ? eventArt(ev) : null;
}

/** Any character's picture: a customer, a guest or a shopkeeper (by avatar key). Null when no art exists. */
export function characterArt(who: string): string | null {
  return customerArt(who) ?? guestArt(who) ?? shopBadge(who);
}
