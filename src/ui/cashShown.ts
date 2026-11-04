// The cash drawn on the table while a day's sales play out. The game works out every sale at the bell, so the
// real totals are already final; this holds each total back at what it was before the rush and adds each
// customer's payment as the coins land. It only changes what is drawn, never the game.
import { useEffect, useState } from 'preact/hooks';
import { wait } from './anim';

let held: number[] | null = null;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((l) => l());

/** Starts showing `amounts` (one per stall) instead of the real totals. `null` shows the real totals again. */
export function holdCash(amounts: number[] | null): void {
  held = amounts ? [...amounts] : null;
  changed();
}

/** What to draw for a stall's cash right now. */
export const shownCash = (player: number, real: number): number => (held && held[player] !== undefined ? held[player] : real);

/** A customer has paid a stall: the total climbs a coin at a time (in a few bigger steps for a large sum). */
export async function payCash(player: number, amount: number): Promise<void> {
  const mine = held;
  if (!mine || amount <= 0) return;
  const steps = Math.min(amount, 10);
  let left = amount;
  for (let i = 0; i < steps; i++) {
    if (held !== mine) return; // the real totals are showing again
    const part = Math.ceil(left / (steps - i));
    left -= part;
    mine[player] += part;
    changed();
    if (i < steps - 1) await wait(40);
  }
}

/** Redraws the calling component whenever the shown totals change. */
export function useCashShown(): void {
  const [, set] = useState(0);
  useEffect(() => {
    const l = () => set((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
}
