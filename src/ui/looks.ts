// Looks on this phone (the list itself is src/net/looks.ts): pieces for your stall, things your shopkeeper wears,
// your signboard's frame and title, your price tag and results stamp, and the bell and coin sounds. They are only for
// show: nothing here changes a rule. A look is owned when it has been earned (a trophy tier, a stall level, or free)
// or granted by the server; `syncLooks` hands out any that are owed, so it also works for players who earned trophies
// before a look existed.
import { CHARACTER_AVATARS } from '../engine/data';
import { tierById } from './achievements';
import { colourId, loadGranted, loadLooks, loadWorn, saveColour, saveLooks, saveWorn, snapshot } from './progress';
import { placeOf } from './stamps';
import { LOOKS, lookById, partsOf, slotIsPublic, stallOf, type Look, type LookSet, type Slot } from '../net/looks';
import type { Snapshot } from './achievements';

export { LOOKS, SLOTS, lookById, type Look, type LookKind, type Slot } from '../net/looks';

/** The shopkeeper this phone's player last chose (the first one until they choose). */
export const myAvatar = (): string => {
  try { const a = localStorage.getItem('fm.avatar'); return a && CHARACTER_AVATARS.includes(a) ? a : CHARACTER_AVATARS[0]; } catch { return CHARACTER_AVATARS[0]; }
};

/** The trophy tier that earns a look, if it comes from one. */
export const achievementFor = (l: Look) => (l.from.kind === 'trophy' ? tierById(l.from.id) : undefined);

/** True when what is stored says a look has been earned. A pack look is never earned: only the server grants it. */
export function earned(l: Look, s: Snapshot, level = placeOf(s).level): boolean {
  if (l.from.kind === 'free') return true;
  if (l.from.kind === 'level') return level >= l.from.level;
  if (l.from.kind === 'trophy') return s.have.has(l.from.id) && (!l.from.fair || (s.sets.fair ?? []).includes(l.from.id));
  return false;
}

/** Gives the player every look they have earned. Returns the ones that are new and worth saying so. */
export function syncLooks(): Look[] {
  const have = new Set(loadLooks());
  const s = snapshot();
  const level = placeOf(s).level;
  const fresh = LOOKS.filter((l) => !have.has(l.id) && earned(l, s, level));
  if (fresh.length) saveLooks([...have, ...fresh.map((l) => l.id)]);
  // What everyone has from the start (the free looks, the first rank's title and frame) is not news.
  return fresh.filter((l) => l.from.kind === 'trophy' || (l.from.kind === 'level' && l.from.level > 1));
}

/** What a player may put on: what they earned, plus what the server granted. */
export const ownsLook = (id: string): boolean => loadLooks().includes(id) || loadGranted().includes(id);

/** Everything that is on, sounds included: slot to look id, limited to looks the player owns. The stall colour is
 *  kept on its own (it always was) and joins the others here. */
function wornAll(): LookSet {
  const own = new Set([...loadLooks(), ...loadGranted()]);
  const out: LookSet = Object.fromEntries(Object.entries(loadWorn()).filter(([slot, id]) => own.has(id) && lookById(id)?.slot === slot));
  const col = lookById(`col_${colourId()}`);
  if (col) out.colour = col.id;
  // The title and the frame of the highest rank reached are on until the player picks another: a rank shows by itself.
  for (const slot of ['title', 'frame'] as const) {
    if (out[slot]) continue;
    const best = LOOKS.filter((l) => l.slot === slot && l.from.kind === 'level' && own.has(l.id))
      .sort((a, b) => (b.from.kind === 'level' ? b.from.level : 0) - (a.from.kind === 'level' ? a.from.level : 0))[0];
    if (best) out[slot] = best.id;
  }
  return out;
}

/** What is on show to others now: slot to look id. This is what a room is told; a sound never leaves the phone. */
export function worn(): LookSet {
  return Object.fromEntries(Object.entries(wornAll()).filter(([slot]) => slotIsPublic(slot)));
}

/** What is on in one slot, or undefined. */
export const wornIn = (slot: Slot): string | undefined => wornAll()[slot];

/** The sounds this phone makes: the bell and the coins (the first of each when none was chosen). */
export function wornSounds(): { bell: string; coin: string } {
  const w = wornAll();
  return { bell: w.bell ?? 'bell_brass', coin: w.coin ?? 'coin_till' };
}

/** Puts a look on (or takes it off when it is already on). Returns what is on show to others. */
export function toggleLook(id: string): LookSet {
  const look = lookById(id);
  if (!look || !ownsLook(id)) return worn();
  if (look.slot === 'colour') {
    saveColour(colourId() === id.slice(4) ? '' : id.slice(4));
    return worn();
  }
  // What was picked is what is stored (never the colour, kept on its own, nor a rank's title or frame that is only
  // on because nothing else was picked).
  const own = new Set([...loadLooks(), ...loadGranted()]);
  const now = Object.fromEntries(Object.entries(loadWorn()).filter(([slot, x]) => slot !== 'colour' && own.has(x) && lookById(x)?.slot === slot));
  if (now[look.slot] === id) delete now[look.slot];
  else now[look.slot] = id;
  saveWorn(now);
  return worn();
}

/** Shopkeeper pieces on show, as names the portrait painter knows. */
export const wornParts = (w: LookSet = worn()): string[] => partsOf(w);
export const wornStall = (w: LookSet = worn()): { roof?: string; trim?: string; prop?: string } => stallOf(w);
