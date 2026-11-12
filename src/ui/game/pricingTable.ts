// "Round the market table" (DEC-070, PLAN-054): what the pricing screen shows about every stall while prices are
// secret. Only public facts are read here: how many pieces each stall put out (rules 15: a rival's crate itself is
// blank on a stall's own view until the bell), your own crate and the freshness of its pieces, whether a stall has
// sealed its prices yet, and how many customers are being served today. A price is never read, so nothing here can show one before the bell (online, the server does not
// even send them: server/room.ts redact()).
import { FRUITS, stageAt, type FruitId, type Stage } from '../../engine/data';
import { crateStock, forSale, outCount, postedPrice, servingCustomers, tiedPrices, type GameState } from '../../engine/game';
import { LANES } from '../boardModel';

export interface TableFruit { f: FruitId; out: number; dots: Stage[] }
/** `out`: how many pieces the stall put out (null until it has opened). Since rules 15 that is all a rival's seat
 *  shows before the bell: on a stall's own view (publicView) a rival's `fruits` is empty. */
export interface TableSeat { player: number; me: boolean; sealed: boolean; out: number | null; fruits: TableFruit[] }
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
    out: outCount(s, p),
    fruits: FRUITS.filter((f) => forSale(s, p, f) > 0).map((f) => ({ f, out: forSale(s, p, f), dots: dotsFor(s, p, f) })),
  }));
  const onSale = seats.reduce((a, x) => a + (x.out ?? 0), 0);
  return { seats, onSale, orders: servingCustomers(s).length };
}

// ---------- the bell: every stall's row with its price tags (PLAN-085) ----------

/** Prices and crates are public: the flip has happened (the tie step and the rush). Before it nothing of a rival's is read. */
export const flipped = (s: GameState): boolean => s.phase === 'tie' || s.phase === 'reveal';

/** One price tag in a stall's row at the bell: the fruit, its price, how many pieces and how fresh, whether another
 *  stall asks the same price for the same fruit, and whether this stall has played Favoured Trade on it. */
export interface BellTag { f: FruitId; price: number; out: number; marks: Stage[]; more: number; tied: boolean; stamped: boolean }
/** A stall's row at the bell. `nth`: its place in today's buying line-up (1 bought first). */
export interface BellRow { player: number; me: boolean; nth: number; tags: BellTag[] }

/**
 * Every stall in today's line-up with what it put out and at what price. Nothing is returned before the flip: a
 * rival's crate and prices are secret until then, and this is the one place the bell's rows read them.
 */
export function bellRows(s: GameState, viewer: number): BellRow[] {
  if (!flipped(s)) return [];
  const order = s.order.length === s.players.length ? s.order : s.players.map((_, i) => i);
  return order.map((p, i) => {
    const ties = tiedPrices(s, p);
    const tags = LANES.filter((f) => forSale(s, p, f) > 0).flatMap((f): BellTag[] => {
      const price = postedPrice(s, p, f);
      if (price === null) return [];
      const marks = dotsFor(s, p, f);
      const tied = ties.some((t) => t.fruit === f);
      return [{ f, price, out: forSale(s, p, f), marks, more: Math.max(0, forSale(s, p, f) - marks.length), tied, stamped: tied && s.players[p].favouredTrade }];
    });
    return { player: p, me: p === viewer, nth: i + 1, tags };
  });
}

/** "1st", "2nd", "3rd", "4th": a place in today's line-up. */
export const nth = (n: number): string => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;
