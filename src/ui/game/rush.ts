// The rush, one card for each customer (DEC-086): pure helpers that turn the day's results into the cards the rush
// shows, one after another, and say how long each one takes. No drawing here; the card is panels/Showdown.tsx and
// the timing runs in animator.tsx. Everything shown comes from the day's results and the open crates, which are public
// once the bell has rung.
import { FAVOURS, FRUIT, FRUITS, TRAITS, lookOf, stageAt, type FavourId, type FruitId, type Stage } from '../../engine/data';
import { crateStock, eligible, servingCustomers, type Customer, type GameState, type LineResult, type Offer, type Stock } from '../../engine/game';
import { rushLine } from '../../engine/story';
import { LANES } from '../boardModel';
import { GUEST_EVENT } from '../deckArt';
import { BEAT, FEEL } from '../motion';

/** A customer's card in the rush: it arrives, the stalls' offers turn up, the sales are shown, the result is read, it leaves. */
export type RushStage = 'in' | 'rows' | 'result' | 'out';

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
  /** Did any of its pieces qualify for this customer at its price? */
  qualified: boolean;
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
}

export interface RushCard {
  customerId: number;
  name: string;
  /** A walk-in or the day's regular, an event's special guest, or a standing order collected today. */
  kind: 'customer' | 'guest' | 'order';
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
  const r = s.results;
  if (!r || !s.crates) return out;
  const crates = s.players.map((_, p) => copy(crateStock(s, p)));
  const customers = new Map(servingCustomers(s).map((c) => [c.id, c]));
  const lost = new Set<number>();
  for (const l of r.lines) {
    const c = customers.get(l.customerId);
    const f = l.fruit;
    const ripe = FRUIT[f].ripe.length;
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
    out.set(l, used.map((u) => u && u.map((pos) => stageAt(f, pos))));
    l.offers.forEach((o, i) => { for (const pos of o.tooOld ? [] : used[i]?.slice(0, o.sold) ?? []) crates[o.player][f][pos]--; });
  }
  return out;
}

/** What a row says once its sale has been shown: "Sold 1", with the money for your own stall; otherwise why it did not sell. */
function rowResult(o: Offer, me: boolean, paid: number, tag: string): string {
  if (o.sold <= 0) return tag;
  return me ? `Sold ${o.sold} · +$${paid}` : `Sold ${o.sold}`;
}

function blockOf(s: GameState, c: Customer, l: LineResult, viewer: number, pieces: (Stage[] | null)[] | undefined): RushBlock {
  const story = rushLine(s, l);
  const rows = l.offers.map((o, i): RushRow => {
    const me = o.player === viewer;
    const paid = o.sold * o.price + (o.juice ?? 0);
    return {
      i, player: o.player, me, price: o.price, qty: o.qty, freshest: o.tooOld ? null : stageAt(l.fruit, o.freshness),
      pieces: pieces?.[i] ?? null, qualified: !o.tooOld, sold: o.sold, paid, result: rowResult(o, me, paid, story.tags[i] ?? ''),
    };
  });
  return {
    line: l, fruit: l.fruit, want: l.want, rows,
    heading: `Wants ${l.want} ${fruitWord(l.fruit, l.want)} · ${c.order ? 'Fresh or Okay' : 'cheapest first'}`,
    got: rows.reduce((a, x) => a + x.sold, 0),
    none: l.offers.length ? null : story.headline,
    story: [story.headline, story.detail].filter(Boolean).join(' '),
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
  const pieces = offeredPieces(s);
  const favours = [...r.favours];
  return servingCustomers(s).flatMap((c): RushCard[] => {
    const lines = r.lines.filter((l) => l.customerId === c.id);
    if (!lines.length) return [];
    const blocks = [...lines].sort((a, b) => LANES.indexOf(a.fruit) - LANES.indexOf(b.fruit)).map((l) => blockOf(s, c, l, viewer, pieces.get(l)));
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
      customerId: c.id, name: c.name, kind: c.order ? 'order' : GUEST_EVENT[c.name] ? 'guest' : 'customer',
      wants: blocks.map((b) => ({ fruit: b.fruit, qty: b.want, max: b.line.max })),
      blocks, extras,
      favour: won ? { player: won.player, id: won.player === viewer ? won.favour : null } : null,
      earned: sold + mine.reduce((a, x) => a + x.tip, 0),
      text: told.length ? told.join(' ') : `${lookOf(c.name).title} leaves with nothing.`,
    }];
  });
}

/** What a row's freshness marks say aloud: "2 offered: okay, fresh", or that none qualified. */
export function rowSaid(row: RushRow, word: Record<Stage, string>): string {
  if (!row.qualified) return 'none can sell';
  const marks = row.pieces ?? (row.freshest ? [row.freshest] : []);
  return `${row.qty} offered: ${[...new Set(marks)].map((st) => word[st]).join(', ')}`;
}

/** At most this many pieces of one sale travel to the card; the rest land with the last of them. */
export const MAX_PIECES = 4;
/** At most this many coins come back to a stall for one sale. */
export const MAX_COINS = 3;

/** How many pieces travel to the card for one fruit. */
export const piecesMoving = (b: RushBlock): number => b.rows.reduce((a, x) => a + Math.min(x.sold, MAX_PIECES), 0);

/** How long one fruit's sale takes to show, in ms at normal speed: the pieces to the card, then the coins back. 0 when nothing sold. */
export function blockSpan(b: RushBlock): number {
  const n = piecesMoving(b);
  return n ? (n - 1) * BEAT.rush.pieceGap + FEEL.travel + FEEL.coin : 0;
}

/** When each fruit's sale starts, in ms after the first: a fruit that sold starts `BEAT.rush.fruit` after the one before. */
export function blockStarts(card: RushCard): number[] {
  let at = 0;
  return card.blocks.map((b) => {
    const start = at;
    if (piecesMoving(b)) at += BEAT.rush.fruit;
    return start;
  });
}

/**
 * How long each step of one customer takes at normal speed, in ms (the fast setting, a tap and Skip scale these down):
 * the card in from the row, the offers turned up, the sales shown, the result held to be read, the card back to the
 * row. About 2.4 s for a customer who buys one fruit, 0.5 s more for a second, and less for one nobody could serve.
 * The numbers are named in ../motion.ts (BEAT.rush, FEEL) with every other length.
 */
export function rushPace(card: RushCard): Record<'in' | 'rows' | 'sell' | 'read' | 'out', number> {
  const r = BEAT.rush;
  const starts = blockStarts(card);
  return { in: r.cardIn, rows: r.rows, sell: Math.max(0, ...card.blocks.map((b, k) => (piecesMoving(b) ? starts[k] + blockSpan(b) : 0))), read: r.read, out: r.cardOut };
}

/** The whole of one customer's card at normal speed, in ms. */
export function rushTotal(card: RushCard): number {
  const p = rushPace(card);
  return p.in + p.rows + p.sell + p.read + p.out;
}
