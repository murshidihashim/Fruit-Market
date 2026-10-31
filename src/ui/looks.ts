// Collectible looks: pieces that build on your stall (roof, trim, a prop on the counter) and things your
// shopkeeper wears (hat, face, neck, badge). They are only for show: nothing here changes a rule. Each look
// is unlocked by one achievement, and `syncLooks` hands out any that are owed (so it also works for
// players who earned achievements before looks existed).
import { ACHIEVEMENTS } from './achievements';
import { loadLooks, loadWorn, saveLooks, saveWorn, unlocked } from './progress';
import { LOOKS, lookById, partsOf, stallOf, type Look, type LookSet } from '../net/looks';

export { LOOKS, SLOTS, lookById, type Look, type LookKind, type Slot } from '../net/looks';

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
export const wornParts = (w: LookSet = worn()): string[] => partsOf(w);
export const wornStall = (w: LookSet = worn()): { roof?: string; trim?: string; prop?: string } => stallOf(w);
