// PLAN-114: your best Market Sprint of each day, kept on this phone (the last two weeks), for the Daily card and the
// results. The board on the server holds the same best; this copy shows it offline and before the board answers.
const KEY = 'fm.sprint';
const KEEP = 14;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface SprintBest { cash: number; sold: number }

/** Every stored day's best; anything unreadable is left out. */
export function loadSprintBest(): Record<string, SprintBest> {
  let raw: unknown = null;
  try { raw = JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return {}; }
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, SprintBest> = {};
  for (const [d, v] of Object.entries(raw as Record<string, unknown>)) {
    const b = v as Partial<SprintBest> | null;
    if (DATE_RE.test(d) && b && typeof b.cash === 'number' && typeof b.sold === 'number') out[d] = { cash: b.cash, sold: b.sold };
  }
  return out;
}

/** Keeps a finished Sprint when it beats that day's best (more cash, then more fruit sold). Returns the day's best. */
export function saveSprintBest(date: string, cash: number, sold: number): SprintBest {
  const all = loadSprintBest();
  const old = all[date];
  const best = !old || cash > old.cash || (cash === old.cash && sold > old.sold) ? { cash, sold } : old;
  all[date] = best;
  const kept = Object.fromEntries(Object.entries(all).sort(([a], [b]) => a.localeCompare(b)).slice(-KEEP));
  try { localStorage.setItem(KEY, JSON.stringify(kept)); } catch { /* storage unavailable: the board still has it */ }
  return best;
}
