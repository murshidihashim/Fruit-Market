// What the table shows of the rush while it plays out (flow study, review-18, D1 rule 3: nothing before its moment).
// The game works out every sale at the bell, so the customers' tickets are already ticked and a favour card won in the
// rush is already in its stall's hand. Like the cash (cashShown.ts) and the shelves (stockShown.ts), this holds both
// back: a fruit on a ticket is ticked when that customer's sale has been shown, and a favour card won appears when
// it has reached its stall. It only changes what is drawn, never the game.
import { useEffect, useState } from 'preact/hooks';
import type { FruitId, Want } from '../engine/data';
import type { DayResult } from '../engine/game';

interface Hold {
  /** The fruit lines whose sale has been shown, as "<customer id>:<fruit>". */
  served: Set<string>;
  /** Pieces that have landed on a customer's card so far, under the same names. */
  landed: Map<string, number>;
  /** Favour cards won today that have not reached their stall yet, by stall. */
  hidden: number[];
  /** Customers whose favour card has reached its stall. */
  favoured: Set<number>;
}

let held: Hold | null = null;
/** The table: tickets and favour cards. The card in the middle: the pieces landing on it as well. */
const table = new Set<() => void>();
const card = new Set<() => void>();
const tell = (ls: Set<() => void>) => ls.forEach((l) => l());
const changed = () => { tell(table); tell(card); };

const name = (customerId: number, fruit: FruitId) => `${customerId}:${fruit}`;

/** Starts holding back today's tickets and the favour cards won today (`r`: the day's results, `stalls`: how many stalls). */
export function holdRush(r: DayResult, stalls: number): void {
  const hidden = Array.from({ length: stalls }, () => 0);
  for (const f of r.favours) if (hidden[f.player] !== undefined) hidden[f.player]++;
  held = { served: new Set(), landed: new Map(), hidden, favoured: new Set() };
  changed();
}

/** Shows the tickets and the favour cards as they really are again (the end of the rush, leaving the table). */
export function releaseRush(): void {
  if (!held) return;
  held = null;
  changed();
}

/** Whether the rush is being held back now. */
export const rushHeld = (): boolean => held !== null;

/** A piece of fruit has landed on a customer's card (`n` pieces at once when several are drawn as one). */
export function landPiece(customerId: number, fruit: FruitId, n = 1): void {
  if (!held || n <= 0) return;
  const k = name(customerId, fruit);
  held.landed.set(k, (held.landed.get(k) ?? 0) + n);
  tell(card);
}

/** How many pieces have landed on a customer's card so far (0 when nothing is held back: ask lineShown first). */
export const piecesLanded = (customerId: number, fruit: FruitId): number => held?.landed.get(name(customerId, fruit)) ?? 0;

/** A customer's sale of one fruit has been shown: its row on the ticket may be ticked. */
export function serveLine(customerId: number, fruit: FruitId): void {
  if (!held || held.served.has(name(customerId, fruit))) return;
  held.served.add(name(customerId, fruit));
  changed();
}

/** Has this customer's sale of this fruit been shown? Always, when nothing is held back. */
export const lineShown = (customerId: number, fruit: FruitId): boolean => !held || held.served.has(name(customerId, fruit));

/** Pieces of a fruit a customer bought today, from the day's results (public after the bell). */
export function boughtToday(r: DayResult | null | undefined, customerId: number, fruit: FruitId): number {
  let n = 0;
  for (const l of r?.lines ?? []) if (l.customerId === customerId && l.fruit === fruit) for (const o of l.offers) n += o.sold;
  return n;
}

/**
 * What a customer still wants, as drawn: for a fruit whose sale has not been shown yet, what they wanted when the bell
 * rang. The same list (not a copy) when nothing is held back.
 */
export function shownWants(r: DayResult | null | undefined, c: { id: number; wants: Want[] }): Want[] {
  if (!held) return c.wants;
  return c.wants.map((w) => (lineShown(c.id, w.fruit) ? w : { ...w, qty: w.qty + boughtToday(r, c.id, w.fruit) }));
}

/** The favour card a customer gave has reached the stall that won it. */
export function showFavour(customerId: number, player: number): void {
  if (!held || held.favoured.has(customerId)) return;
  held.favoured.add(customerId);
  if (held.hidden[player] > 0) held.hidden[player]--;
  changed();
}

/** Has the favour card this customer gave reached its stall? Always, when nothing is held back. */
export const favourShown = (customerId: number): boolean => !held || held.favoured.has(customerId);

/** The favour cards to draw for a stall right now: without the ones won today that have not reached it yet (they are
 *  the last in the hand). */
export function shownFavours<T>(player: number, favours: T[]): T[] {
  const n = held?.hidden[player] ?? 0;
  return n > 0 ? favours.slice(0, Math.max(0, favours.length - n)) : favours;
}

function useListener(ls: Set<() => void>): void {
  const [, set] = useState(0);
  useEffect(() => {
    const l = () => set((n) => n + 1);
    ls.add(l);
    return () => { ls.delete(l); };
  }, []);
}

/** Redraws the calling component whenever a ticket or a favour card changes (the game table). */
export function useRushShown(): void { useListener(table); }
/** Redraws the calling component at those changes and whenever a piece lands on the customer's card (the card itself). */
export function useRushCard(): void { useListener(card); }
