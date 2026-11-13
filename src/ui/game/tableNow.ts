// The round table from "Open my stall" to the rush (flow A; PLAN-099, DEC-116). Once this stall has opened, every
// stall's crate sits in its seat round the table (panels/RushTable.tsx) and stays there through pricing, the bell, the
// Favoured Trade question and the rush. This works out what each seat shows before the bell and while it rings, from
// what this stall may see. Pure, so tests can check it: above all that nothing is drawn before its moment.
//  - A rival's crate is shut with its lid on while stalls are opening: only whether it has opened is known (rules 15).
//  - Once every stall is open, the lid is off and the crate shows one face-down square for each piece it put out:
//    the count is public ("3 out"), the fruit and the price are not.
//  - At the bell the crates open one by one, clockwise from this stall's: the squares turn into the pieces with their
//    freshness, and the price tags turn face up.
//  - This stall's own crate is face up from the start, with its price tags as they are being set, face down once the
//    bell has been rung.
// A rival's crate and prices are never read before the flip (online they are not even sent: server/room.ts redact),
// and the screen draws from the stall's own view of the game (engine publicView).
import { FAVOURS, FRUIT, stageAt, type FruitId } from '../../engine/data';
import { count, crateStock, forSale, outCount, postedPrice, tiedPrices, type Crate, type GameState } from '../../engine/game';
import { LANES } from '../boardModel';
import type { DayStep } from './daySheet';
import { tieWords } from './panels/PricingTable';
import { flipped } from './pricingTable';
import { seatOrder } from './rush';

/** The steps of the day that are played at the round table before the rush: waiting for the rivals to open, pricing
 *  (on a sheet at the foot of the table), sealed while the rivals price, the bell, and the Favoured Trade question. */
export type TableStep = 'wait' | 'price' | 'sealed' | 'bell' | 'tie';
const STEPS: readonly DayStep[] = ['wait', 'price', 'sealed', 'bell', 'tie'];
/** The day's step, when it is one of the round table's (null: stocking, the takings, or no step). */
export const tableStep = (step: DayStep | null): TableStep | null => (step && STEPS.includes(step) ? step as TableStep : null);

/** A price tag on a crate: its fruit, its price (null: face down, the price is not known to this screen or not shown),
 *  face up or not, matched by another stall, and stamped with Favoured Trade. */
export interface SeatTag { f: FruitId; price: number | null; up: boolean; tied: boolean; stamped: boolean }
/** A piece in a crate: its fruit and its place on the shelf it came from (which says how fresh it is). */
export interface SeatPiece { fruit: FruitId; pos: number }
/**
 * What one seat shows. `look`: `lid` (shut, nothing about the crate is known but whether it has opened), `squares`
 * (shut, one face-down square for each piece it put out), `open` (its pieces face up). `word`: the tab on the crate's
 * corner ("filling…", "ready", "3 out", "none out", "pricing…", "sealed"; empty for none).
 */
export interface TableSeat {
  player: number; me: boolean;
  look: 'lid' | 'squares' | 'open';
  squares: number;
  word: string;
  /** The word an open crate had while it was shut: it lifts off the corner as the crate opens. */
  was?: string;
  pieces: SeatPiece[];
  tags: SeatTag[];
}

export interface TableFacts {
  step: TableStep;
  /** Online: whether each stall has sent its crate or its prices for this step (the room says so; a computer stall
   *  is not counted until the step is over). Null offline, where the game itself says it. */
  sent: readonly boolean[] | null;
  /** This stall's crate as it opened it. Online the room keeps every crate back until every stall is open, so the
   *  screen remembers what it sent. */
  own: Crate | null;
  /** This stall's prices as they stand on its pricing sheet (only while it prices). */
  vals: Readonly<Record<string, number>> | null;
  /** How many seats have opened at the bell so far, clockwise from this stall's (null: every one). */
  open: number | null;
}

/** "3 out", "none out": how many pieces a stall put out, as the stalls' row says it. */
export const outWord = (n: number): string => (n ? `${n} out` : 'none out');

/** The pieces in a crate, in the board's lane order, the freshest first (as the rush draws a crate). */
export function piecesOf(crate: Crate | null | undefined): SeatPiece[] {
  if (!crate) return [];
  return LANES.flatMap((f) => {
    const track = crate[f] ?? [];
    const out: SeatPiece[] = [];
    for (let pos = track.length - 1; pos >= 0; pos--) for (let k = 0; k < (track[pos] ?? 0); k++) out.push({ fruit: f, pos });
    return out;
  });
}

/** The fruits a crate holds, in the board's lane order. */
const fruitsOf = (crate: Crate | null | undefined): FruitId[] => LANES.filter((f) => (crate?.[f] ?? []).some((n) => n > 0));

/** A stall's price tags once the prices have flipped: one for each fruit it put out, the tied ones marked. Nothing
 *  before the flip. */
export function openTags(s: GameState, p: number): SeatTag[] {
  if (!flipped(s)) return [];
  const ties = tiedPrices(s, p);
  return LANES.filter((f) => forSale(s, p, f) > 0).flatMap((f): SeatTag[] => {
    const price = postedPrice(s, p, f);
    if (price === null) return [];
    const tied = ties.some((t) => t.fruit === f);
    return [{ f, price, up: true, tied, stamped: tied && s.players[p].favouredTrade }];
  });
}

/**
 * Every seat round the table, clockwise from this stall's (rush.ts seatOrder), as this screen may draw it now. `s` is
 * the game as `viewer` may see it (engine publicView, or the room's view online).
 */
export function tableSeats(s: GameState, viewer: number, x: TableFacts): TableSeat[] {
  const order = seatOrder(s.players.length, viewer);
  const flip = flipped(s);
  return order.map((p, i): TableSeat => {
    const me = p === viewer;
    // At the bell the seats open clockwise from this stall's. Before it rings (a frame before the bell, or while the
    // rivals price) every crate is shut.
    const opened = flip && x.step !== 'sealed' && (x.open === null || i < x.open);
    const seat: TableSeat = { player: p, me, look: 'open', squares: 0, word: '', pieces: [], tags: [] };
    if (opened) {
      // Public now: the crate and its prices. A rival's word ("sealed") lifts off its corner as it opens. (A game from
      // before crates were kept piece by piece: the oldest pieces of what it put out, as the rules fill a crate.)
      seat.pieces = piecesOf(s.crates?.[p] ?? (s.stalls[p] ? crateStock(s, p) : null));
      seat.tags = openTags(s, p);
      if (!me) seat.was = (outCount(s, p) ?? 0) ? 'sealed' : outWord(0);
      return seat;
    }
    if (me) {
      // Your own crate, face up; your tags as you set them, face down once the bell has been rung.
      const own = (flip ? null : x.own) ?? s.crates?.[p] ?? (s.stalls[p] ? crateStock(s, p) : null);
      // A stall with nothing ripe opens with an empty crate (rules 18: it takes no stocking turn). Otherwise a crate
      // this screen does not know (online, back in a room while crates are kept back) is drawn shut.
      if (!own && count(s.players[p].stock, undefined, true) === 0) return seat;
      if (!own) return { ...seat, look: 'lid', word: s.phase === 'stall' ? 'ready' : '' };
      seat.pieces = piecesOf(own);
      const fruits = fruitsOf(own);
      if (x.step === 'price' && x.vals) seat.tags = fruits.map((f) => ({ f, price: x.vals?.[f] ?? null, up: true, tied: false, stamped: false }));
      else if (flip || x.step === 'sealed' || (s.bids[p] ?? null) !== null) seat.tags = fruits.map((f) => ({ f, price: null, up: false, tied: false, stamped: false }));
      return seat;
    }
    if (s.phase === 'stall') {
      // Stalls are opening: only whether this one has is known.
      const done = x.sent ? !!x.sent[p] : s.stalls[p] !== null;
      return { ...seat, look: 'lid', word: done ? 'ready' : 'filling…' };
    }
    // Every stall is open: how many pieces each put out is public, and nothing else.
    const n = outCount(s, p) ?? 0;
    const sealed = x.sent ? !!x.sent[p] : (s.bids[p] ?? null) !== null;
    const word = flip ? 'sealed' : !n ? outWord(0) : x.step === 'sealed' ? (sealed ? 'sealed' : 'pricing…') : outWord(n);
    return { ...seat, look: 'squares', squares: n, word };
  });
}

/** What the table shows before the rush (and after it, until the takings): the step, every seat, the bell, the
 *  Favoured Trade question and the words under the table and in its foot. */
export interface PreTable {
  step: TableStep;
  seats: TableSeat[];
  /** The bell is in the middle, ringing. */
  ringing: boolean;
  /** The stall asked about Favoured Trade (-1: none), and whether it is this screen's own. */
  asked: number;
  mine: boolean;
  /** The words in the foot while the table waits for the others. */
  hint: { text: string; dots: boolean } | null;
  /** Your own tied prices in words, said once every crate is open and no question is asked ('' for none). */
  tied: string;
  /** The rush is over: the crates as they are left, until the takings. */
  after: boolean;
}

export interface PreFacts extends TableFacts {
  /** The stall asked about Favoured Trade now (-1: none), and whether it is this screen's own and may answer. */
  asked: number;
  mine: boolean;
  online: boolean;
  /** Online: the people the step is waiting for, in words ("Raj and Kiki"; '' for nobody known). */
  waiting: string;
  /** Several people share this phone: nothing is "yours". */
  shared: boolean;
  /** This stall has been asked the Favoured Trade question today (its card said who is tied). */
  answered: boolean;
  /** The rush is over: every stall's crate as it is left (rush.ts cratesLeft), until the takings; null before. */
  left: (Crate | null)[] | null;
}

/** The table before the rush, as this screen may draw it (and after the rush, until the takings). */
export function preTable(s: GameState, viewer: number, x: PreFacts): PreTable {
  const step = x.step;
  const open = tableSeats(s, viewer, x);
  const after = !!x.left;
  const seats = x.left ? open.map((t): TableSeat => ({ ...t, look: 'open', word: '', tags: [], pieces: x.left?.[t.player] ? piecesOf(x.left[t.player]) : t.pieces })) : open;
  const told = x.open === null || x.open >= s.players.length;
  const waiting = x.waiting || 'the others';
  const nothingRipe = !!s.players[viewer] && count(s.players[viewer].stock, undefined, true) === 0;
  // The words in the foot while the table waits: the action bar's own words, which the table's foot takes over.
  const hint = step === 'wait' && s.phase === 'stall'
    ? (x.online ? { text: `${nothingRipe ? 'Nothing ripe to sell' : 'Stall open'}. Waiting for ${waiting}`, dots: true } : { text: 'Rivals are filling their crates…', dots: false })
    : step === 'sealed' && s.phase === 'bid'
      ? (x.online ? { text: `Prices sealed. Waiting for ${waiting}`, dots: true } : { text: 'Rivals are setting secret prices…', dots: false })
      : null;
  return {
    step, seats, ringing: x.open !== null, asked: x.asked, mine: x.mine, hint, after,
    // Your own ties, in the game's words, once every crate is open: not while a question is asked (its card says who
    // is tied), not again once you have been asked, and not on a shared phone, where "your" is nobody's.
    tied: !x.shared && told && !x.answered && s.phase === 'reveal' && step === 'bell' && !after ? tieWords(s, viewer) : '',
  };
}

/** A seat's crate in words, for a screen reader: "Raj: 3 pieces, face down", "Your crate: 2 watermelons, 1 apple". */
export function seatWords(seat: TableSeat, name: string): string {
  if (seat.look === 'lid') return `${name}: crate shut${seat.word ? `, ${seat.word}` : ''}`;
  if (seat.look === 'squares') return `${name}: ${seat.squares ? `${seat.squares} ${seat.squares === 1 ? 'piece' : 'pieces'}, face down` : 'nothing out'}${seat.word && seat.squares ? `, ${seat.word}` : ''}`;
  if (!seat.pieces.length) return `${name}: empty crate`;
  const parts = LANES.flatMap((f) => {
    const n = seat.pieces.filter((x) => x.fruit === f).length;
    if (!n) return [];
    const tag = seat.tags.find((t) => t.f === f);
    const price = !tag ? '' : !tag.up || tag.price === null ? ', price face down'
      : ` at $${tag.price}${tag.tied ? ', tied' : ''}${tag.stamped ? `, ${FAVOURS.favouredTrade.title} played` : ''}`;
    return [`${n} ${(n === 1 ? FRUIT[f].name : FRUIT[f].plural).toLowerCase()}${price}`];
  });
  return `${name}: ${parts.join(', ')}`;
}

/** The freshness of the pieces of one fruit in a crate, freshest first (for a tag's letters). */
export const freshness = (pieces: SeatPiece[], f: FruitId) => pieces.filter((x) => x.fruit === f).map((x) => stageAt(f, x.pos));

/** At most this many pieces (or face-down squares) of a crate are drawn; "+3" in the last place stands for the rest. */
export const MAX_SHOWN = 10;
/** From this many price tags on one crate the tags are drawn small (rushTable.css). */
export const SMALL_TAGS = 3;

/**
 * How close a crate is drawn so that its pieces and its price tags fit its seat (rushTable.css data-fit): 0 as
 * drawn, 1 with smaller pieces (14 px) and small tags, 2 with smaller pieces still (12 px). Worked out from the
 * crate's size and what it holds, in px as the stylesheet draws them (a crate gliding to a new seat cannot be
 * measured while it moves). `low`: its pieces and tags stand side by side; `close`: the close form's thinner awning.
 */
export function crateFit(w: number, h: number, seat: Pick<TableSeat, 'look' | 'squares' | 'pieces' | 'tags'>, low: boolean, close: boolean): 0 | 1 | 2 {
  const cells = Math.min(MAX_SHOWN, seat.look === 'squares' ? seat.squares : seat.look === 'open' ? seat.pieces.length : 0);
  const chrome = 4 + (low || close ? 5 : 7) + (low || close ? 19 : 20);
  const tagW = (t: SeatTag, small: boolean) => {
    const digits = t.up && t.price !== null ? String(t.price).length + 1 : 2;
    // measured: "$3" 38 px and "$11" 46 px as drawn; small, about a sixth less
    return small ? 21 + digits * 6.4 : 22.5 + digits * 7.8;
  };
  const fits = (step: 0 | 1 | 2): boolean => {
    const cell = step === 0 ? 16 : step === 1 ? 14 : 12;
    const gap = step === 0 ? 2 : 1;
    const small = step > 0 || seat.tags.length >= SMALL_TAGS;
    const tagH = small ? 15 : 18;
    if (low) {
      // one line under the face and the name: the squares or pieces (as many as it takes; RushTable.tsx says how many
      // more), or, for a crate with tags, the tags (its pieces stand beside its name)
      const line = seat.tags.reduce((a, t) => a + tagW(t, small) + 3, 6);
      return line <= w - 4 && chrome + Math.max(cell, seat.tags.length ? tagH : 0) + 2 <= h;
    }
    const inner = w - 4;
    const perRow = Math.max(1, Math.floor((inner - 6 + gap) / (cell + gap)));
    const rows = Math.ceil(cells / perRow);
    const box = rows ? rows * cell + (rows - 1) * gap + 4 : 14;
    let tagRows = 0, used = Infinity;
    const between = 3;
    for (const t of seat.tags) {
      const tw = tagW(t, small);
      if (used + between + tw > inner - 5) { tagRows++; used = tw; } else used += between + tw;
    }
    const tags = tagRows ? tagRows * tagH + (tagRows - 1) * 3 + 4 : 0;
    return chrome + box + tags <= h;
  };
  return fits(0) ? 0 : fits(1) ? 1 : 2;
}
