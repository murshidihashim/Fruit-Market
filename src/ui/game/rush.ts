// The rush pop-up ("Round the table", DEC-068): pure helpers for where each stall's card sits around the customer,
// what the customer wants, and how long each step takes. No drawing here; the pop-up is panels/Showdown.tsx and the
// timing runs in animator.tsx. Everything shown comes from the day's results, which are public after the bell.
import { FRUIT, lookOf, stageAt, type Stage } from '../../engine/data';
import type { LineResult, Offer } from '../../engine/game';

export type RushStage = 'in' | 'deal' | 'flip' | 'result' | 'out';

/** One stall's card around the customer: which offer it shows and which of the four places it takes. */
export interface RushSeat {
  /** Index into line.offers (and the story's tags). */
  i: number;
  player: number;
  me: boolean;
  /** 0 top left, 1 top right, 2 bottom left, 3 bottom right (with one or two cards there is only one row). */
  slot: number;
}

/**
 * The stalls that offered this customer the fruit (an offer whose pieces were all too old still shows, with its
 * reason), placed around the card like seats at a table: your own card bottom left, nearest your shelf; the rivals
 * in turn order after you, top row first. Stalls with none of the fruit out get no card. At most four (four stalls).
 */
export function rushSeats(l: LineResult, viewer: number, players: number): RushSeat[] {
  const turn = (p: number) => (p - viewer + players) % players;
  const offers = l.offers.map((o, i) => ({ o, i })).sort((a, b) => turn(a.o.player) - turn(b.o.player));
  const mine = offers.find((x) => x.o.player === viewer);
  const rivals = offers.filter((x) => x.o.player !== viewer);
  const out: RushSeat[] = [];
  const put = (x: { o: Offer; i: number }, slot: number) => out.push({ i: x.i, player: x.o.player, me: x.o.player === viewer, slot });
  if (offers.length <= 2) {
    // One row: you on the left, the rival on the right.
    [...(mine ? [mine] : []), ...rivals].slice(0, 2).forEach((x, k) => put(x, k));
    return out;
  }
  const rivalSlots = mine ? [0, 1, 3] : [0, 1, 2, 3];
  rivals.slice(0, rivalSlots.length).forEach((x, k) => put(x, rivalSlots[k]));
  if (mine) put(mine, 2);
  return out.sort((a, b) => a.slot - b.slot);
}

/** The line under the customer's card, e.g. "wants 4 × Watermelon · up to $7 fresh". */
export function rushWant(l: LineResult): { qty: string; fruit: string; cap: string; label: string } {
  const fruit = l.want === 1 ? FRUIT[l.fruit].name : FRUIT[l.fruit].plural;
  return {
    qty: `wants ${l.want} ×`,
    fruit,
    cap: `up to $${l.max} fresh`,
    label: `${lookOf(l.name).title} wants ${l.want} ${fruit.toLowerCase()}, up to $${l.max} each when fresh`,
  };
}

/** What a stall's card says it offered: pieces and the freshest of them, or that none would do. */
export function rushOffer(o: Offer, fruit: LineResult['fruit']): { text: string; stage: Stage | null } {
  if (o.tooOld) return { text: 'none qualify', stage: null };
  return { text: `${o.qty} offered`, stage: stageAt(fruit, o.freshness) };
}

/**
 * How long each step of one customer takes at normal speed, in ms (the fast setting, a tap and Skip scale these down).
 * `down` is the moment every card lies face down before they all turn. About 2 s to read the result after the flip;
 * the whole customer about 3.3 s, close to the old showdown card (about 3.2 s with three stalls).
 */
export function rushPace(seats: number): Record<'in' | 'deal' | 'down' | 'flip' | 'hold' | 'out', number> {
  return { in: 280, deal: 90 + Math.max(0, 4 - seats) * 15, down: 180, flip: 380, hold: 1900, out: 260 };
}

/** The whole of one customer's pop-up at normal speed, in ms. */
export function rushTotal(seats: number): number {
  const p = rushPace(seats);
  return p.in + p.deal * seats + p.down + p.flip + p.hold + p.out;
}

/** Price boards on the seats while the pop-up runs: sealed until the cards flip, then open, then marked won or lost. */
export function rushBoard(stage: RushStage, o: Offer, tag: string): { open: boolean; res?: 'won' | 'lost'; tag?: string } {
  if (stage === 'in' || stage === 'deal') return { open: false };
  if (stage === 'flip') return { open: true };
  return { open: true, res: o.sold ? 'won' : 'lost', tag };
}
