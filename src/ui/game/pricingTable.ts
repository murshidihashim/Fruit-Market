// "Round the market table" (DEC-070, PLAN-054): what the pricing screen shows about every stall while prices are
// secret. Only public facts are read here: each stall's for-sale crate (public once every shop has opened), the
// freshness of the pieces on its shelf, whether it has sealed its prices yet, and how many customers are being
// served today. A price is never read, so nothing here can show one before the bell (online, the server does not
// even send them: server/room.ts redact()).
import { FRUITS, stageAt, type FruitId, type Stage } from '../../engine/data';
import { crateStock, forSale, servingCustomers, type GameState } from '../../engine/game';

export interface TableFruit { f: FruitId; out: number; dots: Stage[] }
export interface TableSeat { player: number; me: boolean; sealed: boolean; fruits: TableFruit[] }
export interface PricingTable { seats: TableSeat[]; onSale: number; orders: number }

/** At most this many freshness dots per fruit; more pieces show as a count only. */
export const MAX_DOTS = 5;

/** The freshness of the pieces of one fruit in a stall's crate, freshest first. */
function dotsFor(s: GameState, p: number, f: FruitId): Stage[] {
  const out: Stage[] = [];
  // Rules 12: the pieces in its crate (public once every stall has opened).
  const track = crateStock(s, p)[f];
  for (let pos = track.length - 1; pos >= 0; pos--) for (let k = 0; k < track[pos]; k++) out.push(stageAt(f, pos));
  return out.slice(0, MAX_DOTS);
}

/** Every stall round the table: the rivals in turn order after you, then you (nearest your price cards). */
export function pricingTable(s: GameState, viewer: number): PricingTable {
  const n = s.players.length;
  const order = [...Array.from({ length: n - 1 }, (_, i) => (viewer + 1 + i) % n), viewer];
  const seats = order.map((p) => ({
    player: p,
    me: p === viewer,
    // Only whether a shop has finished pricing is public; the bids themselves are not read.
    sealed: s.bids[p] !== null && s.bids[p] !== undefined,
    fruits: FRUITS.filter((f) => forSale(s, p, f) > 0).map((f) => ({ f, out: forSale(s, p, f), dots: dotsFor(s, p, f) })),
  }));
  const onSale = seats.reduce((a, x) => a + x.fruits.reduce((b, y) => b + y.out, 0), 0);
  return { seats, onSale, orders: servingCustomers(s).length };
}
