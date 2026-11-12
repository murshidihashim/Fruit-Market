// The card pictures (PLAN-083, rules 18 card set): flat drawings in public/art-ticket, one SVG file each, which the
// browser loads as an image when a picture is first shown (nothing is bundled into the code or put into the page).
// Sources and their generators are in docs/studio/art-drafts/cards-18. The small square shopkeeper faces (avatars/)
// are the earlier webp files. Keys are the hidden code keys (data.ts); the names players see come from the game data,
// never from the art.
import { CUSTOMER_CARDS, EVENT_CARDS, ORDER_CARDS, RIVALS, type FavourId, type UpgradeId } from '../engine/data';

const BASE = `${import.meta.env.BASE_URL ?? './'}art-ticket/`;

/** Shopkeeper art files, in RIVALS order (Rosa, Uncle Benny, Ah Chen, Saleh, Raj, Kiki, Pak Din, Farah). */
const SHOP_FILES = ['rosa', 'benny', 'chen', 'saleh', 'raj', 'kiran', 'pakdin', 'farah'] as const;

/** Guests have no portrait of their own: they borrow their event's scene, which shows them. */
export const GUEST_EVENT: Record<string, string> = {
  Influencer: 'mangoCraze', 'Gym Club': 'superfood', 'Hotel Chef': 'hotel', 'Wedding Caterer': 'kenduri', Bakery: 'bakeOff',
};

/**
 * Characters or events with no picture yet (by key: event id, avatar or guest name). Their cards show "Art coming" or a
 * plain silhouette, never someone else's picture. Empty: every card of the rules 18 set is drawn; kept for new cards.
 */
export const ART_COMING: ReadonlySet<string> = new Set<string>([]);
const slug = (key: string) => key.toLowerCase().replace(/ /g, '-');
const CUSTOMER_KEYS = new Set(CUSTOMER_CARDS.map((c) => c.name));
// Standing orders (rules 14) stand in the row like customers, so they have a card picture too: their client's place.
const ORDER_KEYS = new Set(ORDER_CARDS.map((c) => c.name));
const EVENT_IDS = new Set<string>(EVENT_CARDS.map((e) => e.id).filter((id) => !ART_COMING.has(id)));

/** A customer's card picture, or a standing-order client's; null for anyone without one (guests, the walk-in). */
export function customerArt(key: string): string | null {
  return CUSTOMER_KEYS.has(key) ? `${BASE}customers/${slug(key)}.svg` : ORDER_KEYS.has(key) ? `${BASE}orders/${slug(key)}.svg` : null;
}

/** A shopkeeper's art file key ('rosa', 'benny', ...) by avatar, or null for anyone else. */
export function shopFile(avatar: string): string | null {
  const i = RIVALS.findIndex((r) => r.avatar === avatar);
  return i >= 0 ? SHOP_FILES[i] ?? null : null;
}

/** A shopkeeper at their stall (the shopkeeper card's picture). */
export function shopScene(avatar: string): string | null {
  const f = shopFile(avatar);
  return f ? `${BASE}scenes/${f}.svg` : null;
}

/** A shopkeeper's small square face (best for small sizes). */
export function shopBadge(avatar: string): string | null {
  const f = shopFile(avatar);
  return f ? `${BASE}avatars/${f}.webp` : null;
}

/** The picture on the morning's "Calm Day" card (a day with no event; not a card in the deck). */
export const CALM_ART = `${BASE}events/calm.svg`;

/** An event card's picture. */
export function eventArt(id: string): string | null {
  return EVENT_IDS.has(id) ? `${BASE}events/${id}.svg` : null;
}

/** A guest's picture: its event's scene (see GUEST_EVENT). */
export function guestArt(name: string): string | null {
  const ev = GUEST_EVENT[name];
  return ev ? eventArt(ev) : null;
}

const FAVOUR_FILES: Record<FavourId, string> = {
  gossip: 'gossip', freeFruit: 'free-fruit', priority: 'priority', scout: 'scout', favouredTrade: 'favoured-trade', fridge: 'fridge',
};
/** A favour card's picture. */
export function favourArt(id: FavourId): string {
  return `${BASE}favours/${FAVOUR_FILES[id]}.svg`;
}

const UPGRADE_FILES: Record<UpgradeId, string> = {
  juicebar: 'juice-bar', barrow: 'handcart', premium: 'premium-display', ripening: 'ripening-room', orderbook: 'order-book',
};
/** An upgrade card's picture. */
export function upgradeArt(id: UpgradeId): string {
  return `${BASE}upgrades/${UPGRADE_FILES[id]}.svg`;
}

/** The six decks with a pattern back (DEC-096). The customer deck has its own back, which shows the fruit wanted. */
export type DeckId = 'lorry' | 'event' | 'favour' | 'upgrade' | 'shopkeeper' | 'order';
const TILE_FILES: Record<DeckId, string> = {
  lorry: 'lorry', event: 'event', favour: 'favour', upgrade: 'upgrade', shopkeeper: 'shopkeeper', order: 'standing-order',
};
/** A deck's back tile: its mark, repeated across the back in a darker tone of the deck's colour. */
export function tileArt(deck: DeckId): string {
  return `${BASE}tiles/${TILE_FILES[deck]}.svg`;
}

/** Any character's picture: a customer, a guest or a shopkeeper (by avatar key). Null when no art exists. */
export function characterArt(who: string): string | null {
  return customerArt(who) ?? guestArt(who) ?? shopBadge(who);
}

// ---------- focus points ----------
// Where the subject is in each picture, as percentages of its width and height. A frame narrower or flatter than the
// picture is cropped round this point (CSS object-position), so the face or the subject stays in view. Every customer
// and shopkeeper is drawn with the head in the middle of the picture; the height is set a little above the eyes so a
// flat frame keeps the hat. Checked in every frame a picture is used in (PLAN-083).

export type Focus = readonly [x: number, y: number];
const CUSTOMER_FOCUS: Focus = [50, 40];
/** Customers whose hat, hair or headscarf reaches higher than most: the flat frame is cut lower down instead. */
const CUSTOMER_FOCUS_Y: Record<string, number> = {};
/** A shopkeeper card keeps the awning and the face (as on the approved card). */
const SHOP_FOCUS: Focus = [50, 12];
const ORDER_FOCUS: Record<string, Focus> = {
  'airline-caterer': [44, 60], 'beach-resort': [50, 62], 'cider-press': [52, 52], 'company-picnic': [58, 52],
  'pie-factory': [46, 58], 'royal-banquet': [50, 60], 'school-canteen': [50, 52], 'smoothie-stand': [58, 55],
};
const EVENT_FOCUS: Record<string, Focus> = {
  calm: [56, 42], festival: [50, 62], superfood: [38, 42], mangoCraze: [50, 42], hotel: [48, 55], heatwave: [50, 30],
  blight: [50, 46], glut: [50, 52], goodHarvest: [46, 48], badHarvest: [52, 48], priceHike: [52, 45], priceControls: [50, 38],
  inspector: [48, 40], strike: [50, 55], touristBus: [50, 52], monsoon: [50, 42], durian: [42, 45], kenduri: [50, 48],
  mangoWindfall: [48, 48], pasarMalam: [55, 50], bakeOff: [55, 55],
};
/** Where each guest stands in the event picture it borrows. */
const GUEST_FOCUS: Record<string, Focus> = {
  Influencer: [74, 45], 'Gym Club': [36, 42], 'Hotel Chef': [30, 52], 'Wedding Caterer': [50, 50], Bakery: [68, 52],
};
const FAVOUR_FOCUS: Record<FavourId, Focus> = {
  gossip: [22, 50], freeFruit: [55, 48], priority: [15, 50], scout: [14, 48], favouredTrade: [26, 50], fridge: [50, 58],
};
const UPGRADE_FOCUS: Record<UpgradeId, Focus> = {
  juicebar: [50, 72], barrow: [48, 45], premium: [50, 42], ripening: [50, 55], orderbook: [55, 50],
};

/** A customer's or standing-order client's focus point. */
export function customerFocus(key: string): Focus {
  if (ORDER_KEYS.has(key)) return ORDER_FOCUS[slug(key)] ?? [50, 50];
  return [CUSTOMER_FOCUS[0], CUSTOMER_FOCUS_Y[key] ?? CUSTOMER_FOCUS[1]];
}
export const shopFocus = (_avatar: string): Focus => SHOP_FOCUS;
export const eventFocus = (id: string): Focus => EVENT_FOCUS[id] ?? [50, 50];
export const guestFocus = (name: string): Focus => GUEST_FOCUS[name] ?? [50, 50];
export const favourFocus = (id: FavourId): Focus => FAVOUR_FOCUS[id];
export const upgradeFocus = (id: UpgradeId): Focus => UPGRADE_FOCUS[id];
/** A focus point as a CSS object-position value. */
export const focusCss = (f: Focus): string => `${f[0]}% ${f[1]}%`;
