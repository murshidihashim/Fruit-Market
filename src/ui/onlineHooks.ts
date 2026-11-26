// Hooks the online screens share (REP-140 A-02: moved out of Online.tsx unchanged).
import { useEffect, useState } from 'preact/hooks';
import type { OnlineClient } from '../net/client';

/** Redraws the screen whenever the room says something. */
export function useClient(client: OnlineClient | null) {
  const [, force] = useState(0);
  useEffect(() => {
    if (!client) return;
    const off = client.subscribe(() => force((n) => n + 1));
    // The client starts connecting before this effect runs (later still in a background tab), so the
    // room may already have answered: redraw once now, or the screen stays on "Connecting…".
    force((n) => n + 1);
    return off;
  }, [client]);
}

/** The time now, ticking once a second while `on` (a countdown is on screen). */
export function useNow(on: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [on]);
  return now;
}

/** PLAN-112: where a seat's card is on the room or pick screen, for its reaction's bubble. */
export const seatRow = (seat: number) => (typeof document === 'undefined' ? null : document.querySelector(`.seat-row[data-seat="${seat}"]`));
