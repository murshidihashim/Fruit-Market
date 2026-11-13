// The rush as a round table (DEC-109; before it, one card for each customer, DEC-086): pure helpers that turn the day's
// results into what the rush shows, customer after customer, where every stall's crate sits round the table, and how
// long each step takes. No drawing here; the table is panels/RushTable.tsx and the timing runs in animator.tsx.
// Everything shown comes from the day's results and the open crates, which are public once the bell has rung.
import { FAVOURS, FRUIT, FRUITS, TRAITS, lookOf, stageAt, type FavourId, type FruitId, type Stage } from '../../engine/data';
import { crateStock, eligible, servingCustomers, type Customer, type GameState, type LineResult, type Offer, type Stock } from '../../engine/game';
import { rushLine } from '../../engine/story';
import { LANES } from '../boardModel';
import { GUEST_EVENT } from '../deckArt';
import { BEAT, FEEL } from '../motion';

/** A customer at the table: they come to the middle, the crates' tags turn to the fruit they want (fruit by fruit), the
 *  sales are shown, the result is read, they leave. */
export type RushStage = 'in' | 'rows' | 'result' | 'out';

/** What the rush shows at a moment: the customer in the middle and the step they are at. */
export interface ShowState {
  /** The customer being served. */
  card: RushCard;
  n: number; of: number; stage: RushStage;
  /** The fruit whose price tags are up on the crates: an index into card.blocks. */
  at: number;
  /** Customers already served in this rush (their tickets in the row are dimmed and ticked). */
  served: number[];
}

/** One stall's offer of one fruit to the customer. */
export interface RushRow {
  /** Index into line.offers: the rules' own order (cheapest first, ties as the rules settle them, offers that did not qualify last). */
  i: number;
  player: number;
  me: boolean;
  price: number;
  /** How many pieces it offered, and the freshest of them (null: none qualified). */
  qty: number;
  freshest: Stage | null;
  /** Each piece it offered, in the order it would hand them over; for an offer that did not qualify, the pieces it had
   *  out. Null when that cannot be worked out. */
  pieces: Stage[] | null;
  /** The same pieces as places in the crate (the board's boxes, oldest first): the first `sold` of them leave it. */
  used: number[] | null;
  /** Did any of its pieces qualify for this customer at its price? */
  qualified: boolean;
  /** Its place in the line of offers that can sell (1: it sells first), or 0 when it cannot sell. */
  rank: number;
  sold: number;
  /** What it was paid: the price of each piece sold, and a Juice Bar's extra. */
  paid: number;
  /** What happened, said once the sale has been shown. */
  result: string;
}

/** One fruit the customer came for, with every stall's offer in price order. */
export interface RushBlock {
  line: LineResult;
  fruit: FruitId;
  want: number;
  /** "Wants 2 watermelons · cheapest first". */
  heading: string;
  rows: RushRow[];
  /** Pieces the customer got. */
  got: number;
  /** No stall offered the fruit: the line that says so. */
  none: string | null;
  /** How it went, in the words every stall at the table reads (story.ts rushLine). */
  story: string;
  /** Every stall's open crate of this fruit as this customer finds it, by stall: the places of its pieces (the board's
   *  boxes, oldest first), or null when that cannot be worked out. */
  crates: (number[] | null)[];
}

export interface RushCard {
  customerId: number;
  name: string;
  /** A walk-in or the day's regular, an event's special guest, or a standing order collected today. */
  kind: 'customer' | 'guest' | 'order';
  /** A standing order: the stall that holds it, the only one it buys from (null for every other customer). */
  holder: number | null;
  /** What the card prints: each fruit they came for today, with the price they pay for a fresh piece. */
  wants: { fruit: FruitId; qty: number; max: number }[];
  /** One block for each fruit, in the board's lane order. */
  blocks: RushBlock[];
  /** Money that comes with the customer and not with a fruit: a Sharp Ears or Tip Jar tip, a standing order's stake coming back. */
  extras: { player: number; amount: number }[];
  /** A favour card won for serving the whole order alone. `id`: which card, known to the stall that won it only. */
  favour: { player: number; id: FavourId | null } | null;
  /** What this stall earned from the customer: its sales, a Juice Bar's extra and any tip. */
  earned: number;
  /** The result line under the offers. */
  text: string;
  /** Every stall's open crate as this customer finds it, by stall: for each fruit it has out, the places of its pieces
   *  (the board's boxes, oldest first); null when that cannot be worked out. The round table draws each stall's whole
   *  crate in its seat, and a piece leaves it when a customer takes it (the owner, 2026-11-13). */
  stock: (Partial<Record<FruitId, number[]>> | null)[];
}

const fruitWord = (f: FruitId, n: number) => (n === 1 ? FRUIT[f].name : FRUIT[f].plural).toLowerCase();
const copy = (s: Stock): Stock => Object.fromEntries(FRUITS.map((f) => [f, [...s[f]]])) as Stock;

/**
 * The freshness of every piece each stall offered a customer, line by line (the same order as line.offers). The day's
 * results record how many pieces a stall offered and how fresh the freshest was. Which pieces they were follows from
 * the crates, open since the bell, and the rules' own order of selling, so the day's sales are played again on a copy
 * of the crates with the rules' own test of what a customer takes (`eligible`). An answer that does not agree with the
 * recorded offer is left out (null), and so is everything that stall offers later that day.
 */
export function offeredPieces(s: GameState): Map<LineResult, (Stage[] | null)[]> {
  const out = new Map<LineResult, (Stage[] | null)[]>();
  for (const [l, used] of replay(s).used) out.set(l, used.map((u) => u && u.map((pos) => stageAt(l.fruit, pos))));
  return out;
}

/** What the day's sales played again give: for each line, the places of the pieces each offer handed over (`used`) and
 *  every stall's crate of that fruit before the line (`before`); for each customer, every stall's whole crate before
 *  the customer (`start`). */
interface Replay {
  used: Map<LineResult, (number[] | null)[]>;
  before: Map<LineResult, (number[] | null)[]>;
  start: Map<number, (Partial<Record<FruitId, number[]>> | null)[]>;
  /** Every stall's crate after the last line. */
  end: (Stock | null)[];
}

/** The day's sales played again on a copy of the open crates (see offeredPieces). */
function replay(s: GameState): Replay {
  const out = new Map<LineResult, (number[] | null)[]>();
  const before = new Map<LineResult, (number[] | null)[]>();
  const start = new Map<number, (Partial<Record<FruitId, number[]>> | null)[]>();
  const r = s.results;
  if (!r || !s.crates) return { used: out, before, start, end: s.players.map(() => null) };
  // Only the open crates: a stall without one (it put nothing out) has an empty crate, never its shelf.
  const crates = s.players.map((pl, p) => (s.crates?.[p] ? copy(crateStock(s, p)) : Object.fromEntries(FRUITS.map((f) => [f, pl.stock[f].map(() => 0)])) as Stock));
  const customers = new Map(servingCustomers(s).map((c) => [c.id, c]));
  const lost = new Set<number>();
  const places = (crate: Stock, f: FruitId) => crate[f].flatMap((n, pos) => (pos < FRUIT[f].ripe.length ? Array.from({ length: n }, () => pos) : []));
  for (const l of r.lines) {
    const c = customers.get(l.customerId);
    const f = l.fruit;
    const ripe = FRUIT[f].ripe.length;
    // A customer's lines come together, so the crates before their first line are the crates as they find them.
    if (!start.has(l.customerId)) {
      start.set(l.customerId, crates.map((crate, p) => (lost.has(p) ? null
        : Object.fromEntries(FRUITS.map((g) => [g, places(crate, g)]).filter(([, at]) => at.length)) as Partial<Record<FruitId, number[]>>)));
    }
    before.set(l, crates.map((crate, p) => (lost.has(p) ? null : places(crate, f))));
    const used = l.offers.map((o): number[] | null => {
      const crate = crates[o.player]?.[f];
      if (!c || !crate || lost.has(o.player)) return null;
      // Nothing qualified: the ripe pieces it had out, oldest first.
      if (o.tooOld) return crate.flatMap((n, pos) => (pos < ripe ? Array.from({ length: n }, () => pos) : []));
      const most = Math.min(crate.reduce((a, b) => a + b, 0), l.want);
      let got: number[] = [];
      if (c.order) {
        // A standing order takes Fresh or Okay pieces from its holder's crate, freshest first.
        for (let pos = ripe - 1; pos >= 0 && got.length < most; pos--) {
          if (stageAt(f, pos) === 'notso') continue;
          for (let k = 0; k < crate[pos] && got.length < most; k++) got.push(pos);
        }
      } else got = eligible(s.players[o.player], crates[o.player], f, most, o.price, l.max, c.pref, !!c.original.find((w) => w.fruit === f)?.fixed);
      if (got.length !== o.qty || !got.length || Math.max(...got) !== o.freshness) { lost.add(o.player); return null; }
      return got;
    });
    out.set(l, used);
    l.offers.forEach((o, i) => { for (const pos of o.tooOld ? [] : used[i]?.slice(0, o.sold) ?? []) crates[o.player][f][pos]--; });
  }
  return { used: out, before, start, end: crates.map((crate, p) => (lost.has(p) ? null : crate)) };
}

/** Every stall's crate once the day's sales have all been made: what is left in it (null when that cannot be worked
 *  out). The round table shows the crates so between the last customer and the takings (PLAN-099). */
export function cratesLeft(s: GameState): (Stock | null)[] {
  return replay(s).end;
}

/** What a row says once its sale has been shown: "Sold 1", with the money for your own stall; otherwise why it did not sell. */
function rowResult(o: Offer, me: boolean, paid: number, tag: string): string {
  if (o.sold <= 0) return tag;
  return me ? `Sold ${o.sold} · +$${paid}` : `Sold ${o.sold}`;
}

function blockOf(s: GameState, c: Customer, l: LineResult, viewer: number, used: (number[] | null)[] | undefined, crates: (number[] | null)[] | undefined): RushBlock {
  const story = rushLine(s, l);
  let rank = 0;
  const rows = l.offers.map((o, i): RushRow => {
    const me = o.player === viewer;
    const paid = o.sold * o.price + (o.juice ?? 0);
    const u = used?.[i] ?? null;
    return {
      i, player: o.player, me, price: o.price, qty: o.qty, freshest: o.tooOld ? null : stageAt(l.fruit, o.freshness),
      pieces: u && u.map((pos) => stageAt(l.fruit, pos)), used: u, qualified: !o.tooOld, rank: o.tooOld ? 0 : ++rank,
      sold: o.sold, paid, result: rowResult(o, me, paid, story.tags[i] ?? ''),
    };
  });
  return {
    line: l, fruit: l.fruit, want: l.want, rows,
    heading: `Wants ${l.want} ${fruitWord(l.fruit, l.want)} · ${c.order ? 'fresh or okay' : 'cheapest first'}`,
    got: rows.reduce((a, x) => a + x.sold, 0),
    none: l.offers.length ? null : story.headline,
    story: [story.headline, story.detail].filter(Boolean).join(' '),
    crates: crates ?? s.players.map(() => null),
  };
}

/**
 * The cards of today's rush, in the order the customers are served: one for every customer in the row, also one that
 * no stall could serve. `viewer`: the stall this screen belongs to (its rows are marked, and the result line says what
 * it earned).
 */
export function rushCards(s: GameState, viewer: number): RushCard[] {
  const r = s.results;
  if (!r) return [];
  const played = replay(s);
  const favours = [...r.favours];
  return servingCustomers(s).flatMap((c): RushCard[] => {
    const lines = r.lines.filter((l) => l.customerId === c.id);
    if (!lines.length) return [];
    const blocks = [...lines].sort((a, b) => LANES.indexOf(a.fruit) - LANES.indexOf(b.fruit)).map((l) => blockOf(s, c, l, viewer, played.used.get(l), played.before.get(l)));
    const tips = [
      ...(r.earful ?? []).filter((x) => x.customer === c.name).map((x) => ({ ...x, trait: 'earful' as const })),
      ...(r.tipJar ?? []).filter((x) => x.customer === c.name).map((x) => ({ ...x, trait: 'favourite' as const })),
    ];
    const extras = tips.map((x) => ({ player: x.player, amount: x.tip }));
    if (c.order && r.order && r.order.name === c.name && r.order.back > 0) extras.push({ player: r.order.holder, amount: r.order.back });
    const at = favours.findIndex((x) => x.customer === c.name);
    const won = at >= 0 ? favours.splice(at, 1)[0] : null;
    const mine = tips.filter((x) => x.player === viewer);
    const sold = blocks.flatMap((b) => b.rows).filter((x) => x.me).reduce((a, x) => a + x.paid, 0);
    // The result line: how each fruit went (a fruit no stall offered says so in its own block), then this stall's tips
    // and the favour card it won. A customer no stall offered anything has only their own word to add.
    const told = [
      ...blocks.filter((b) => !b.none).map((b) => b.story),
      ...mine.map((x) => `${TRAITS[x.trait].title}: +$${x.tip}.`),
      ...(won && won.player === viewer ? [`Favour card: ${FAVOURS[won.favour].title}.`] : []),
    ];
    return [{
      customerId: c.id, name: c.name, kind: c.order ? 'order' : GUEST_EVENT[c.name] ? 'guest' : 'customer', holder: c.order ? c.order.holder : null,
      wants: blocks.map((b) => ({ fruit: b.fruit, qty: b.want, max: b.line.max })),
      blocks, extras,
      favour: won ? { player: won.player, id: won.player === viewer ? won.favour : null } : null,
      earned: sold + mine.reduce((a, x) => a + x.tip, 0),
      text: told.length ? told.join(' ') : `${lookOf(c.name).title} leaves with nothing.`,
      stock: played.start.get(c.id) ?? s.players.map(() => null),
    }];
  });
}

/** At most this many pieces of one sale travel to the card; the rest land with the last of them. */
export const MAX_PIECES = 4;
/** At most this many coins come back to a stall for one sale. */
export const MAX_COINS = 3;

/** How many pieces travel to the card for one fruit. */
export const piecesMoving = (b: RushBlock): number => b.rows.reduce((a, x) => a + Math.min(x.sold, MAX_PIECES), 0);

/** How long one fruit's sale takes to show, in ms at normal speed: the pieces from the crates to the customer, then the
 *  coins back. 0 when nothing sold. */
export function blockSpan(b: RushBlock): number {
  const n = piecesMoving(b);
  return n ? (n - 1) * BEAT.rush.pieceGap + FEEL.travel + FEEL.coin : 0;
}

/** When each fruit's sale starts, in ms after the first. The customer is served fruit by fruit, as the game does: once a
 *  fruit's coins are back, the crates' tags turn to the next fruit (`BEAT.rush.fruit`) and its sale starts. */
export function blockStarts(card: RushCard): number[] {
  let at = 0;
  return card.blocks.map((b, k) => {
    if (k > 0) at += BEAT.rush.fruit;
    const start = at;
    at += blockSpan(b);
    return start;
  });
}

/**
 * How long each step of one customer takes at normal speed, in ms (the fast setting, a tap and Skip scale these down):
 * the customer in from the row, the crates' tags turned to the first fruit, the sales shown fruit by fruit, the result
 * held to be read, the customer back to the row. About 2.4 s for a customer who buys one fruit, about 1 s more for a
 * second, and less for one nobody could serve. The numbers are named in ../motion.ts (BEAT.rush, FEEL).
 */
export function rushPace(card: RushCard): Record<'in' | 'rows' | 'sell' | 'read' | 'out', number> {
  const r = BEAT.rush;
  const starts = blockStarts(card);
  const k = card.blocks.length - 1;
  return { in: r.cardIn, rows: r.rows, sell: k < 0 ? 0 : starts[k] + blockSpan(card.blocks[k]), read: r.read, out: r.cardOut };
}

/** The whole of one customer's card at normal speed, in ms. */
export function rushTotal(card: RushCard): number {
  const p = rushPace(card);
  return p.in + p.rows + p.sell + p.read + p.out;
}

// ---------- the round table: where every crate sits (DEC-109) ----------

/** A box on the stage, in px from the stage's top left corner. */
export interface Place { left: number; top: number; width: number; height: number }

/** The table's sizes, in px. `round`: drawn in full, the crates round the customer (a tall phone). `close`: two columns
 *  of crates either side of the customer (a small phone). A crate's size, and the customer's card at its largest
 *  (three fruit lines); the card's width may shrink to fit between the columns. `wide`: the widest a crate of the close
 *  form is drawn while nothing stands in the middle (pricing, PLAN-099), so that a low crate still holds its pieces and
 *  its price tags. `low`: a crate lower than this draws its pieces and its tags side by side (rushTable.css). */
export const TABLE = {
  round: { crate: [98, 96], card: [150, 216] },
  close: { crate: [104, 90], card: [140, 176], wide: 168 },
  /** From the stage's edge to a crate, and between a crate and the customer. */
  pad: 6, gap: 6,
  /** The narrowest the customer's card may be drawn between two columns of crates. */
  minCard: 116,
  low: 72,
} as const;

/** Each seat, clockwise from the top left, as a point on a square whose sides run from -1 to 1. `round`: spread evenly
 *  round the ring (for six: two above, two at the sides, two below). `close`: two columns either side. */
const SEATS: Record<'round' | 'close', Record<number, [number, number][]>> = {
  round: {
    1: [[0, -1]],
    2: [[-1, 0], [1, 0]],
    3: [[0, -1], [1, 0.58], [-1, 0.58]],
    4: [[-1, -1], [1, -1], [1, 1], [-1, 1]],
    5: [[0, -1], [1, -0.32], [0.73, 1], [-0.73, 1], [-1, -0.32]],
    6: [[-0.58, -1], [0.58, -1], [1, 0], [0.58, 1], [-0.58, 1], [-1, 0]],
  },
  close: {
    1: [[-1, 0]],
    2: [[-1, 0], [1, 0]],
    3: [[-1, -1], [1, 0], [-1, 1]],
    4: [[-1, -1], [1, -1], [1, 1], [-1, 1]],
    5: [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, 0]],
    6: [[-1, -1], [1, -1], [1, 0], [1, 1], [-1, 1], [-1, 0]],
  },
};

/** How the table is laid out on a stage of this size: each seat's crate (in seat order), the box the customer's card
 *  stands in (centred), whether it is the close form, and whether its crates are low (pieces and tags side by side).
 *  Seats stay where they are for the whole rush. */
export interface TableLay { close: boolean; low: boolean; seats: Place[]; card: Place; crate: { width: number; height: number } }

/** How a table is laid out besides its size (PLAN-099). `form`: keep this form (while the pricing sheet takes part of
 *  the stage, the table keeps the form the whole stage has, so the seats only glide when the sheet goes). `free`:
 *  nothing stands in the middle, so the close form's crates may take the middle's room as well. */
export interface LayOpts { form?: 'round' | 'close'; free?: boolean }

const overlap = (a: Place, b: Place, gap: number) =>
  a.left < b.left + b.width + gap && b.left < a.left + a.width + gap && a.top < b.top + b.height + gap && b.top < a.top + a.height + gap;

export function tableLay(n: number, w: number, h: number, o: LayOpts = {}): TableLay {
  const { pad, gap } = TABLE;
  const lay = (form: 'round' | 'close'): TableLay => {
    const k = Math.max(1, Math.min(6, n));
    const units = SEATS[form][k];
    const perColumn = form === 'close' ? Math.max(1, ...[-1, 1].map((x) => units.filter((u) => u[0] === x).length)) : 1;
    // Close: the crates shrink to fit three to a column on a short stage, and to leave the card its narrowest on a
    // narrow one; with nothing in the middle they may be as wide as half the stage (at most TABLE.close.wide).
    const cw = form !== 'close' ? TABLE.round.crate[0]
      : o.free ? Math.min(TABLE.close.wide, Math.floor((w - 2 * pad - gap) / 2))
      : Math.min(TABLE.close.crate[0], Math.floor((w - 2 * pad - 2 * gap - TABLE.minCard) / 2));
    const ch = form === 'close' ? Math.min(TABLE.close.crate[1], Math.floor((h - 2 * pad - (perColumn - 1) * gap) / perColumn)) : TABLE.round.crate[1];
    const cardW = form === 'close' ? Math.max(TABLE.minCard, Math.min(TABLE.close.card[0], w - 2 * pad - 2 * gap - 2 * cw)) : TABLE.round.card[0];
    const cardH = Math.min(TABLE[form].card[1], h - 2 * pad);
    const seats = units.slice(0, n).map(([x, y]): Place => ({
      left: Math.round(pad + (w - 2 * pad - cw) * (x + 1) / 2), top: Math.round(pad + (h - 2 * pad - ch) * (y + 1) / 2), width: cw, height: ch,
    }));
    return { close: form === 'close', low: ch < TABLE.low, seats, card: { left: Math.round((w - cardW) / 2), top: Math.round((h - cardH) / 2), width: cardW, height: cardH }, crate: { width: cw, height: ch } };
  };
  if (o.form === 'close') return lay('close');
  const round = lay('round');
  // With nothing in the middle, only the seats themselves must keep clear of each other.
  const fits = round.seats.every((a, i) => a.left >= 0 && a.top >= 0 && a.left + a.width <= w && a.top + a.height <= h
    && (o.free || !overlap(a, round.card, gap)) && round.seats.every((b, j) => j === i || !overlap(a, b, gap)));
  return fits && (o.free ? o.form === 'round' : true) ? round : lay('close');
}

/** The lowest a crate of the close form is drawn while the pricing sheet takes part of the stage (PLAN-099): its
 *  awning, its face and name with its tags beside them, and one line of pieces. */
export const LOWEST_CRATE = 46;

/**
 * The least height the table needs above the pricing sheet (PLAN-099), in the form the whole stage has (`h`): for the
 * round form, the lowest stage on which its seats still keep clear of each other; for the close form, a column of the
 * lowest crates. The pricing sheet is drawn closer, and then scrolls its rows, so as to leave the table this much.
 */
export function tableMin(n: number, w: number, h: number): number {
  const { pad, gap } = TABLE;
  const full = tableLay(n, w, h);
  if (full.close) {
    const k = Math.max(1, Math.ceil(Math.min(6, Math.max(1, n)) / 2));
    return Math.min(h, 2 * pad + k * LOWEST_CRATE + (k - 1) * gap);
  }
  for (let at = TABLE.round.crate[1] + 2 * pad; at < h; at += 4) if (!tableLay(n, w, at, { form: 'round', free: true }).close) return at;
  return h;
}

/**
 * The room in the middle of the table, between the seats (PLAN-099): where the bell rings and the Favoured Trade
 * question is asked. Two boxes are tried round the middle, one as wide as the seats level with it allow and then as
 * tall as the seats over and under it allow, the other the other way round; the larger is taken (a box narrower than
 * a card can be read in is not).
 */
export function middleOf(lay: TableLay, w: number, h: number): Place {
  const { pad, gap } = TABLE;
  const cx = w / 2, cy = h / 2;
  const across = (x0: number, x1: number, y0: number, y1: number) => {
    let left = x0, right = x1;
    for (const s of lay.seats) {
      if (s.top >= y1 || s.top + s.height <= y0) continue;
      if (s.left + s.width <= cx) left = Math.max(left, s.left + s.width + gap);
      else if (s.left >= cx) right = Math.min(right, s.left - gap);
      else { left = right = cx; }
    }
    return [left, right];
  };
  const down = (x0: number, x1: number, y0: number, y1: number) => {
    let top = y0, bottom = y1;
    for (const s of lay.seats) {
      if (s.left >= x1 || s.left + s.width <= x0) continue;
      if (s.top + s.height <= cy) top = Math.max(top, s.top + s.height + gap);
      else if (s.top >= cy) bottom = Math.min(bottom, s.top - gap);
      else { top = bottom = cy; }
    }
    return [top, bottom];
  };
  const box = (l: number, r: number, t: number, b: number): Place => ({ left: Math.round(l), top: Math.round(t), width: Math.max(0, Math.round(r - l)), height: Math.max(0, Math.round(b - t)) });
  // wide first: what is level with the middle, then over and under
  const [l1, r1] = across(pad, w - pad, cy - 1, cy + 1);
  const [t1, b1] = down(l1, r1, pad, h - pad);
  // tall first: what is over and under the middle, then beside it
  const [t2, b2] = down(cx - 1, cx + 1, pad, h - pad);
  const [l2, r2] = across(pad, w - pad, t2, b2);
  const a = box(l1, r1, t1, b1), b = box(l2, r2, t2, b2);
  const room = (x: Place) => (x.width >= TABLE.minCard - 16 ? x.width * x.height : 0);
  return room(b) > room(a) ? b : a;
}

/** The stalls in their seats: this screen's stall first, then the others in turn order after it (as they sit across
 *  the table on every other screen). */
export const seatOrder = (n: number, viewer: number): number[] => Array.from({ length: n }, (_, i) => ((viewer < 0 ? 0 : viewer) + i) % n);
