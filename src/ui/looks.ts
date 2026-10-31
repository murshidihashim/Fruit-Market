// Collectible looks: pieces that build on your stall (roof, trim, a prop on the counter) and things your
// shopkeeper wears (hat, face, neck, badge). They are only for show: nothing here changes a rule. Each look
// is unlocked by one achievement, and `syncLooks` hands out any that are owed (so it also works for
// players who earned achievements before looks existed).
import { ACHIEVEMENTS } from './achievements';
import { loadLooks, loadWorn, saveLooks, saveWorn, unlocked } from './progress';

export type LookKind = 'wear' | 'stall';
export type Slot = 'hat' | 'face' | 'neck' | 'badge' | 'roof' | 'trim' | 'prop';

export interface Look { id: string; title: string; kind: LookKind; slot: Slot; by: string }

export const SLOTS: { id: Slot; title: string; kind: LookKind }[] = [
  { id: 'hat', title: 'Hat', kind: 'wear' },
  { id: 'face', title: 'Face', kind: 'wear' },
  { id: 'neck', title: 'Neck and chest', kind: 'wear' },
  { id: 'badge', title: 'Badge', kind: 'wear' },
  { id: 'roof', title: 'Roof', kind: 'stall' },
  { id: 'trim', title: 'Trim', kind: 'stall' },
  { id: 'prop', title: 'On the counter', kind: 'stall' },
];

/** `by` is the achievement that unlocks the look. */
export const LOOKS: Look[] = [
  { id: 'straw_boater', title: 'Straw Boater', kind: 'wear', slot: 'hat', by: 'first_win' },
  { id: 'fruit_basket_hat', title: 'Fruit Basket Hat', kind: 'wear', slot: 'hat', by: 'mango_mogul' },
  { id: 'party_hat', title: 'Party Hat', kind: 'wear', slot: 'hat', by: 'festival_rush' },
  { id: 'laurel', title: 'Laurel Wreath', kind: 'wear', slot: 'hat', by: 'streak7' },
  { id: 'gold_crown', title: 'Gold Crown', kind: 'wear', slot: 'hat', by: 'league' },
  { id: 'monocle', title: 'Gold Monocle', kind: 'wear', slot: 'face', by: 'sky_high' },
  { id: 'bow_tie', title: 'Red Bow Tie', kind: 'wear', slot: 'neck', by: 'red_carpet' },
  { id: 'scarf', title: 'Striped Scarf', kind: 'wear', slot: 'neck', by: 'no_waste' },
  { id: 'apron', title: 'Market Apron', kind: 'wear', slot: 'neck', by: 'fully_fitted' },
  { id: 'sash', title: 'Champion Sash', kind: 'wear', slot: 'neck', by: 'rivals_all' },
  { id: 'medal', title: 'Gold Medal', kind: 'wear', slot: 'badge', by: 'played_200' },

  { id: 'roof_stripes', title: 'Striped Roof', kind: 'stall', slot: 'roof', by: 'first_sale' },
  { id: 'roof_scallops', title: 'Scalloped Roof', kind: 'stall', slot: 'roof', by: 'town_12' },
  { id: 'roof_checks', title: 'Checked Roof', kind: 'stall', slot: 'roof', by: 'played_10' },
  { id: 'roof_stars', title: 'Starry Roof', kind: 'stall', slot: 'roof', by: 'big_day' },
  { id: 'roof_fruit', title: 'Fruit-Print Roof', kind: 'stall', slot: 'roof', by: 'sold_500' },
  { id: 'trim_bunting', title: 'Bunting', kind: 'stall', slot: 'trim', by: 'streak3' },
  { id: 'trim_lanterns', title: 'Paper Lanterns', kind: 'stall', slot: 'trim', by: 'worth_wait' },
  { id: 'trim_tassels', title: 'Tassels', kind: 'stall', slot: 'trim', by: 'town_36' },
  { id: 'prop_blackboard', title: 'Chalk Board', kind: 'stall', slot: 'prop', by: 'jam_session' },
  { id: 'prop_scale', title: 'Brass Scales', kind: 'stall', slot: 'prop', by: 'penny_under' },
  { id: 'prop_plant', title: 'Plant Pot', kind: 'stall', slot: 'prop', by: 'bare_stall' },
  { id: 'prop_crates', title: 'Crate Stack', kind: 'stall', slot: 'prop', by: 'sold_100' },
  { id: 'prop_cat', title: 'Stall Cat', kind: 'stall', slot: 'prop', by: 'played_50' },
  { id: 'prop_golden_apple', title: 'Golden Apple', kind: 'stall', slot: 'prop', by: 'rich' },
];

export const lookById = (id: string): Look | undefined => LOOKS.find((l) => l.id === id);
export const achievementFor = (l: Look) => ACHIEVEMENTS.find((a) => a.id === l.by);

/** Gives the player every look their achievements have earned. Returns the ones that are new. */
export function syncLooks(): Look[] {
  const have = new Set(loadLooks());
  const earned = new Set(unlocked());
  const fresh = LOOKS.filter((l) => earned.has(l.by) && !have.has(l.id));
  if (fresh.length) saveLooks([...have, ...fresh.map((l) => l.id)]);
  return fresh;
}

export const ownsLook = (id: string): boolean => loadLooks().includes(id);

/** What is on show now: slot to look id, limited to looks the player owns. */
export function worn(): Record<string, string> {
  const own = new Set(loadLooks());
  return Object.fromEntries(Object.entries(loadWorn()).filter(([slot, id]) => own.has(id) && lookById(id)?.slot === slot));
}

/** Puts a look on (or takes it off when it is already on). */
export function toggleLook(id: string): Record<string, string> {
  const look = lookById(id);
  if (!look || !ownsLook(id)) return worn();
  const now = worn();
  if (now[look.slot] === id) delete now[look.slot];
  else now[look.slot] = id;
  saveWorn(now);
  return now;
}

/** Shopkeeper pieces on show, as names the portrait painter knows. */
export const wornParts = (w: Record<string, string> = worn()): string[] => LOOKS.filter((l) => l.kind === 'wear' && w[l.slot] === l.id).map((l) => l.id);
export const wornStall = (w: Record<string, string> = worn()): { roof?: string; trim?: string; prop?: string } => ({
  roof: w.roof, trim: w.trim, prop: w.prop,
});
