// Presentation-only storytelling: turns the rules engine's results into short explanations,
// reactions and highlights. Nothing here changes game state or re-implements pricing; every
// sentence is derived from the recorded offers (price, units, sold, freshness) and the rules
// the engine used to sort them (cheapest first; ties: Favoured Trade, then a Haggler, then fresher fruit,
// then today's buying order, which was set at dawn with the poorest shop first).

import { FRUIT, FRUITS, JAM_PRICE, JUICE_VALUE, RIVALS, lookOf, prefOf, type FruitId, type Pref, type Stage } from './data';
import {
  count, eligible, forSale, isLastCall, minPrice, nightOutlook, ranking, servingCustomers,
  type GameState, type LineResult, type NightOutlook, type Offer,
} from './game';

export type Tone = 'good' | 'bad' | 'neutral';

export interface LineStory {
  /** Worth a full showdown card (contested, or the viewer is involved). */
  showdown: boolean;
  tone: Tone;
  headline: string;
  /** A verified near-miss or "what if" line, when one is true. */
  detail?: string;
  /** Short tag per offer, same order as line.offers. */
  tags: string[];
}

const fruitWord = (f: FruitId, n: number) => (n === 1 ? FRUIT[f].name.toLowerCase() : FRUIT[f].plural.toLowerCase());
const nameOf = (s: GameState, p: number, viewer: number) => (p === viewer ? 'You' : s.players[p].name);
const possessive = (s: GameState, p: number, viewer: number) => (p === viewer ? 'your' : `${s.players[p].name}'s`);
const becomeJuice = (n: number) => `${n} ${n === 1 ? 'becomes' : 'become'} juice`;

function hash(...xs: number[]): number {
  let h = 2166136261;
  for (const x of xs) { h ^= x & 0xffff; h = Math.imul(h, 16777619); h ^= x >>> 16; h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * The Haggler's tie rule in one wording for every screen (the showdown, the what-if and the Price panel's hint):
 * "Rosa is the Haggler, who wins ties", or "you're the Haggler, who wins ties" for the viewer.
 */
export function hagglerWins(names: string[], you = false): string {
  if (you) return "you're the Haggler, who wins ties";
  return names.length === 1 ? `${names[0]} is the Haggler, who wins ties` : `${names.join(' and ')} are Hagglers, who win ties`;
}

/** Why the winner beat this offer on a tie, following the engine's tie-break order. */
function tieReason(s: GameState, winner: Offer, loser: Offer, viewer: number): string {
  const w = s.players[winner.player];
  const l = s.players[loser.player];
  if (w.favouredTrade && !l.favouredTrade) return `${nameOf(s, winner.player, viewer)} played Favoured Trade`;
  if (haggled(s, winner, loser)) return hagglerWins([w.name], winner.player === viewer);
  if (winner.freshness > loser.freshness) return `${possessive(s, winner.player, viewer)} fruit was fresher`;
  return `${nameOf(s, winner.player, viewer)} bought earlier today`;
}

/** A Haggler wins ties when Favoured Trade does not decide them (neither side played it, or both did). */
function haggled(s: GameState, winner: Offer, loser: Offer): boolean {
  const w = s.players[winner.player];
  const l = s.players[loser.player];
  return w.trait === 'haggler' && l.trait !== 'haggler' && w.favouredTrade === l.favouredTrade;
}

/**
 * Was this offer in the price contest? A stall whose fruit did not qualify for the customer (over their top price,
 * a freshness they will not take, or too old for the price: the engine's `tooOld`) was never compared on price, so
 * no "beat", "undercut" or "tie" line may count it.
 */
export const inContest = (o: Offer): boolean => !o.tooOld;

const STAGE_WORD: Record<Exclude<Stage, 'unripe'>, string> = { fresh: 'fresh', okay: 'okay', notso: 'tired' };

/** The freshness rule the engine used for this customer (Premium, Everyday, Bargain; none for a hand-made test customer). */
function prefFor(s: GameState, l: LineResult): Pref | undefined {
  const c = servingCustomers(s).find((x) => x.id === l.customerId && x.name === l.name);
  return c ? c.pref : prefOf(l.name);
}

export type NoSaleKind = 'price' | 'freshOnly' | 'noTired' | 'age';
export interface NoSale { kind: NoSaleKind; tag: string; headline: string; detail: string }

/**
 * Why an offer that did not qualify (`tooOld`) could not sell, from the price, the customer's top and freshness rule,
 * and the stall's Premium Display only (the shelf at that moment is not recorded, and is not needed):
 * over the top (no freshness could sell), a Premium customer (fresh only), an Everyday customer at a price okay fruit
 * could meet (so only tired fruit was there), otherwise the fruit was too old for that price.
 */
export function noSaleReason(s: GameState, l: LineResult, o: Offer, viewer: number): NoSale {
  const cust = lookOf(l.name).title;
  const plural = FRUIT[l.fruit].plural.toLowerCase();
  const display = s.players[o.player].upgrades.includes('premium');
  const mine = o.player === viewer;
  const theirs = mine ? 'yours' : `${s.players[o.player].name}'s`;
  const pref = prefFor(s, l);
  // What this customer pays at most for each freshness (a Premium Display adds $1 for fresh fruit).
  const caps = (['fresh', 'okay', 'notso'] as const)
    .filter((st) => FRUIT[l.fruit].ripe.includes(st) && (st === 'fresh' || pref === undefined || pref === 'bargain' || (st === 'okay' && pref === 'everyday')))
    .map((st) => ({ st, cap: l.max - FRUIT[l.fruit].drop[FRUIT[l.fruit].ripe.indexOf(st)] + (st === 'fresh' && display ? 1 : 0) }))
    .filter((x) => x.cap >= 1);
  const top = caps.find((x) => x.st === 'fresh')?.cap ?? l.max;
  const withDisplay = display ? ` with ${mine ? 'your' : 'a'} Premium Display` : '';
  const items = caps.map((x) => `$${x.cap} for ${STAGE_WORD[x.st]}${x.st === 'fresh' ? withDisplay : ''}`);
  const pays = pref === 'premium'
    ? `${cust} buys fresh fruit only, up to $${top}${withDisplay}.`
    : `${cust} pays up to ${items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0]}${pref === 'everyday' ? ', and never buys tired fruit' : ''}.`;
  if (o.price > top) {
    const even = display ? `even fresh, with ${mine ? 'your' : 'a'} Premium Display` : 'even fresh';
    return { kind: 'price', tag: `over $${top} top`, headline: `$${o.price} is more than ${cust} pays for ${plural}: $${top} at most, ${even}.`, detail: pays };
  }
  if (pref === 'premium') {
    return { kind: 'freshOnly', tag: 'fresh only', headline: `${cust} buys fresh ${plural} only, and ${theirs} weren't fresh.`, detail: 'Premium customers buy fresh fruit only, whatever the price.' };
  }
  if (pref === 'everyday' && o.price <= l.max - 1) {
    return { kind: 'noTired', tag: "won't take tired", headline: `${cust} won't buy tired ${plural} at any price.`, detail: 'Everyday customers buy fresh or okay fruit only.' };
  }
  const sells = caps.filter((x) => x.cap >= o.price).map((x) => STAGE_WORD[x.st]);
  const rest = caps.filter((x) => x.cap < o.price).map((x) => `${STAGE_WORD[x.st]} up to $${x.cap}`);
  const detail = `At $${o.price} ${sells.length === 1 ? `only ${sells[0]} sells` : `${sells.join(' or ')} sells`}${rest.length ? `; ${rest.join(', ')}` : ''}.`;
  return {
    kind: 'age', tag: `too old for $${o.price}`, detail,
    headline: `${mine ? 'Your' : `${s.players[o.player].name}'s`} ${plural} were too old for ${cust} at $${o.price}.`,
  };
}

function offerTag(s: GameState, l: LineResult, o: Offer, viewer: number): string {
  if (o.tooOld) return noSaleReason(s, l, o, viewer).tag;
  if (o.sold >= o.qty) return o.qty > 1 ? `SOLD ×${o.sold}` : 'SOLD';
  if (o.sold > 0) return `sold ${o.sold} of ${o.qty}`;
  const cheaper = l.offers.filter((w) => w.sold > 0 && w.price < o.price);
  if (cheaper.length) return `$${o.price - Math.max(...cheaper.map((w) => w.price))} too high`;
  const tie = l.offers.find((w) => w.sold > 0 && w.price === o.price);
  if (tie) {
    if (s.players[tie.player].favouredTrade && !s.players[o.player].favouredTrade) return 'lost tie: Favoured Trade';
    return haggled(s, tie, o) ? 'lost tie: Haggler' : tie.freshness > o.freshness ? 'lost tie: fresher won' : 'lost tie';
  }
  return 'order already filled';
}

// ---------- what if you had priced lower ----------

export type TieOutcome = 'win' | 'lose' | 'open';
export type TieBy = 'favouredTrade' | 'haggler' | 'fresher' | 'order';
export interface TieCall { outcome: TieOutcome; by?: TieBy }

/** Where a line sits in today's results, and the viewer's crate of that fruit. Null for a line that is not today's. */
interface LineContext {
  /** No customer before this one asked for this fruit today, so every shelf of it was as it stood at the bell. */
  first: boolean;
  /** What the viewer put out of this fruit, and sold of it today (to anyone). */
  crate: number;
  soldToday: number;
  /** What the viewer sold of this fruit to the customers before this one. */
  soldBefore: number;
  /** The most that earlier customers of this fruit could still have bought from the viewer at a lower price. */
  before: number;
}

function lineContext(s: GameState, l: LineResult, viewer: number): LineContext | null {
  const lines = s.results?.lines;
  if (!lines) return null;
  let i = lines.indexOf(l);
  if (i < 0) i = lines.findIndex((x) => x.customerId === l.customerId && x.fruit === l.fruit);
  if (i < 0) return null;
  let soldToday = 0, soldBefore = 0, before = 0, first = true;
  lines.forEach((x, k) => {
    if (x.fruit !== l.fruit) return;
    const m = x.offers.find((o) => o.player === viewer);
    soldToday += m?.sold ?? 0;
    if (k < i) {
      first = false;
      soldBefore += m?.sold ?? 0;
      before += m ? Math.max(0, x.want - m.sold) : x.want;
    }
  });
  return { first, crate: forSale(s, viewer, l.fruit), soldToday, soldBefore, before };
}

/**
 * Who would have won if the viewer had matched `rival`'s price for this customer, in the engine's tie order:
 * Favoured Trade, then a Haggler, then fresher fruit, then today's buying order. 'open' when the results cannot tell.
 * Favoured Trade and Haggler need only the players. Freshness is judged only for the first customer of this fruit
 * today (every shelf of it was still as it stood at the bell): at a lower price a stall hands over its oldest
 * qualifying pieces first, so the freshness recorded at the viewer's own price is the best it could have been, and
 * if the viewer sold none of this fruit all day, the shelf now is the shelf then, so the engine's own eligible()
 * gives the exact pieces.
 */
export function tieAt(s: GameState, l: LineResult, mine: Offer, rival: Offer, viewer: number): TieCall {
  const me = s.players[viewer];
  const r = s.players[rival.player];
  if (me.favouredTrade !== r.favouredTrade) return { outcome: me.favouredTrade ? 'win' : 'lose', by: 'favouredTrade' };
  const mh = me.trait === 'haggler';
  if (mh !== (r.trait === 'haggler')) return { outcome: mh ? 'win' : 'lose', by: 'haggler' };
  const ctx = lineContext(s, l, viewer);
  if (!ctx?.first || !inContest(rival)) return { outcome: 'open' };
  if (mine.freshness < rival.freshness) return { outcome: 'lose', by: 'fresher' };
  if (ctx.soldToday > 0 || s.phase !== 'reveal') return { outcome: 'open' };
  const used = eligible(me, me.stock, l.fruit, Math.min(ctx.crate, l.want), rival.price, l.max, prefFor(s, l));
  if (!used.length) return { outcome: 'open' };
  const fresh = Math.max(...used);
  if (fresh !== rival.freshness) return { outcome: fresh > rival.freshness ? 'win' : 'lose', by: 'fresher' };
  return { outcome: s.order.indexOf(viewer) < s.order.indexOf(rival.player) ? 'win' : 'lose', by: 'order' };
}

const WIN_WHY: Record<TieBy, string> = {
  favouredTrade: 'your Favoured Trade wins ties', haggler: hagglerWins([], true), fresher: 'your fruit was fresher', order: 'you bought earlier today',
};
function loseWhy(s: GameState, p: number, by: TieBy): string {
  const who = s.players[p].name;
  return by === 'favouredTrade' ? `${who} played Favoured Trade, which wins ties`
    : by === 'haggler' ? hagglerWins([who])
      : by === 'fresher' ? `${who}'s fruit was fresher` : `${who} bought earlier today`;
}

/** A count of the viewer's pieces: exact, or only the fewest there would surely have been. */
interface Pieces { n: number; exact: boolean }

/**
 * How many this customer would surely have bought from the viewer at `price` with no rival ahead of them: pieces that
 * qualify at `price` (a lower price lets older pieces qualify too), no more than they wanted or the crate had left.
 * The first customer of this fruit today saw every shelf as it stood at the bell; if the viewer then sold none of it
 * all day, the shelf now is that shelf, and the engine's own eligible() gives the exact count. Otherwise it is a
 * lower bound: the pieces that qualify now, or that were offered at the viewer's own (higher) price, less what earlier
 * customers of this fruit could also have taken at the lower price (`before`); and the crate less everything earlier
 * customers could have bought. (Customers take a shop's oldest qualifying pieces first, so a lower price for an
 * earlier customer can only leave this one fresher pieces; it costs this customer at most the extra pieces taken.)
 * Without today's results (a hand-made line), what was offered and wanted.
 */
function piecesAt(s: GameState, l: LineResult, mine: Offer, price: number, ctx: LineContext | null, viewer: number): Pieces {
  if (!ctx) return { n: Math.min(l.want, mine.qty), exact: false };
  const me = s.players[viewer];
  const bell = s.phase === 'reveal';
  const now = bell ? eligible(me, me.stock, l.fruit, ctx.crate, price, l.max, prefFor(s, l)).length : 0;
  if (bell && ctx.first && ctx.soldToday === 0) return { n: Math.min(l.want, now), exact: true };
  const n = Math.min(l.want, ctx.crate - ctx.soldBefore - ctx.before, Math.max(mine.qty, now) - ctx.before);
  return { n: Math.max(0, n), exact: false };
}

/** The engine's tie rank for a stall today, before freshness and buying order: Favoured Trade first, then a Haggler. */
const tieRank = (s: GameState, p: number) => 2 * Number(s.players[p].favouredTrade) + Number(s.players[p].trait === 'haggler');

/**
 * For a customer after the first of this fruit: could a stall priced exactly `price` that was not in this line's price
 * contest have stood ahead of the viewer, had the viewer charged `price` all day? Earlier customers might then have
 * bought from the viewer instead, leaving that stall fruit for this customer, and only freshness or the buying order
 * (not known here) would settle the tie. A stall that Favoured Trade or the Haggler puts ahead of the viewer always
 * sold first, so it has no more fruit than it really had; one they put behind cannot stand ahead.
 */
function unsettledAt(s: GameState, l: LineResult, price: number, viewer: number): boolean {
  const here = new Set(l.offers.filter(inContest).map((o) => o.player));
  return (s.results?.lines ?? []).some((x) => x.fruit === l.fruit && x.offers.some((o) =>
    o.player !== viewer && o.price === price && !here.has(o.player) && tieRank(s, o.player) === tieRank(s, viewer)));
}

/** "You still sold all 3 at your price." The crate sold out anyway, so a lower price would only have moved a sale. */
function soldAllText(f: FruitId, crate: number): string {
  return crate === 1 ? `You still sold your only ${fruitWord(f, 1)} at your price.` : `You still sold all ${crate} at your price.`;
}

/** Added when fewer of the viewer's pieces went unsold today than a what-if claims for this customer. */
const unsoldNote = (unsold: number, claimed: number) => (unsold < claimed ? ` You still sold all but ${unsold} at your price.` : '');

/**
 * The "what if" after an undercut, in the engine's own order. Below the cheapest winner the viewer is first in line
 * (on a later customer, the highest such price no unsettled stall could tie). Matching the cheapest winner is a tie:
 * the stalls that win it sell first, and the viewer gets what they leave of the order. Counts come from piecesAt.
 */
function undercutWhatIf(s: GameState, l: LineResult, mine: Offer, lowest: number, viewer: number): string {
  const ctx = lineContext(s, l, viewer);
  const unsold = ctx ? ctx.crate - ctx.soldToday : Infinity;
  if (ctx && ctx.crate > 0 && unsold <= 0) return soldAllText(l.fruit, ctx.crate);
  const later = !!ctx && !ctx.first;
  const floor = Math.max(1, minPrice(s, l.fruit));
  let below = lowest - 1;
  while (below >= floor && later && unsettledAt(s, l, below, viewer)) below--;
  const under = below >= floor ? { price: below, ...piecesAt(s, l, mine, below, ctx, viewer) } : null;
  const atTie = piecesAt(s, l, mine, lowest, ctx, viewer);
  if ((under ?? atTie).n === 0) return '';

  const calls = l.offers.filter((o) => o.player !== viewer && inContest(o) && o.price === lowest).map((o) => ({ o, c: tieAt(s, l, mine, o, viewer) }));
  const lose = calls.flatMap((x) => (x.c.outcome === 'lose' && x.c.by ? [{ o: x.o, by: x.c.by }] : []));
  const open = calls.some((x) => x.c.outcome === 'open') || (later && unsettledAt(s, l, lowest, viewer));
  const wins = calls.filter((x) => x.c.outcome === 'win');
  if (!open && !lose.length && atTie.n > 0) {
    const by = wins[0]?.c.by;
    const why = by && wins.every((x) => x.c.by === by) ? ` (${WIN_WHY[by]})` : '';
    return `Matching $${lowest} would have won the tie${why}: ${atTie.n} sold.${unsoldNote(unsold, atTie.n)}`;
  }

  const sure = under ? `At $${under.price} you'd have sold ${under.n}.` : lowest - 1 < floor ? `You couldn't go lower than $${floor}.` : '';
  let claimed = under?.n ?? 0;
  let tie = '';
  if (lose.length) {
    // The stalls that win the tie sell first, each up to what it offered this customer.
    const room = l.want - lose.reduce((a, x) => a + x.o.qty, 0);
    const why = loseWhy(s, lose[0].o.player, lose[0].by);
    const j = Math.min(Math.max(0, room), atTie.n);
    if (room <= 0) tie = `A tie at $${lowest} still loses: ${why}.`;
    else if (!open && j > 0 && under && j < under.n && (atTie.exact || atTie.n >= room)) tie = `A tie at $${lowest} sells only ${j}: ${why}.`;
    else if (!open && j > 0) {
      tie = `Matching $${lowest} would have sold ${j}${under && j === under.n ? ' too' : ''}, after ${lose.map((x) => s.players[x.o.player].name).join(' and ')}.`;
      claimed = Math.max(claimed, j);
    }
  } else if (open) {
    tie = `A tie at $${lowest} goes to the fresher fruit, then to whoever bought earlier today.`;
  }
  const text = [sure, tie].filter(Boolean).join(' ');
  return text ? `${text}${unsoldNote(unsold, claimed)}` : '';
}

export function explainLine(s: GameState, l: LineResult, viewer: number): LineStory {
  const tags = l.offers.map((o) => offerTag(s, l, o, viewer));
  const mine = l.offers.find((o) => o.player === viewer);
  const others = l.offers.filter((o) => o.player !== viewer);
  const winners = l.offers.filter((o) => o.sold > 0);
  const sold = winners.reduce((a, o) => a + o.sold, 0);
  const cust = lookOf(l.name).title;
  const showdown = l.offers.length >= 2 || !!mine;

  if (!l.offers.length) return { showdown: false, tone: 'neutral', headline: `Nobody had ${FRUIT[l.fruit].plural.toLowerCase()} for ${cust}.`, tags };

  if (!mine) {
    const top = winners[0];
    if (!top) {
      // Nothing sold, so no offer qualified: say "too high" only when price was the reason for every one.
      const allPrice = l.offers.every((o) => noSaleReason(s, l, o, viewer).kind === 'price');
      return { showdown, tone: 'neutral', headline: allPrice ? `${cust} found every price too high.` : `No stall had ${FRUIT[l.fruit].plural.toLowerCase()} that ${cust} would take at its price.`, tags };
    }
    const losers = others.filter((o) => o.sold === 0 && inContest(o));
    const headline = losers.length
      ? `${s.players[top.player].name} beat ${losers.map((o) => s.players[o.player].name).join(' and ')} at $${top.price}.`
      : `${s.players[top.player].name} sold ${top.sold} ${fruitWord(l.fruit, top.sold)} to ${cust} at $${top.price}.`;
    return { showdown, tone: 'neutral', headline, tags };
  }

  // The viewer made an offer.
  const rivals = others;
  if (mine.sold > 0) {
    const n = mine.sold;
    const beaten = rivals.filter((o) => inContest(o) && (o.sold === 0 || o.sold < o.qty));
    let headline: string;
    let detail: string | undefined;
    if (mine.sold < mine.qty) {
      const cheaper = winners.filter((o) => o.player !== viewer && o.price < mine.price);
      headline = cheaper.length
        ? `${s.players[cheaper[0].player].name} went cheaper first; you sold ${n} of ${mine.qty}.`
        : `You sold ${n} of ${mine.qty}. ${cust} only wanted ${l.want}.`;
    } else if (!rivals.length) {
      headline = mine.price >= l.max ? `No rivals! ${n} ${fruitWord(l.fruit, n)} sold at full price.` : `No rivals: ${n} ${fruitWord(l.fruit, n)} sold at $${mine.price}.`;
      if (mine.price < l.max) detail = `${cust} would have paid up to $${l.max} each.`;
    } else {
      const lowestLoser = beaten.length ? Math.min(...beaten.map((o) => o.price)) : null;
      const loserAtLow = beaten.find((o) => o.price === lowestLoser);
      if (loserAtLow && lowestLoser! > mine.price) {
        const gap = lowestLoser! - mine.price;
        headline = `You beat ${s.players[loserAtLow.player].name}'s price by $${gap}. ${n === 1 ? 'Sold!' : `All ${n} sold!`}`;
      } else if (loserAtLow && lowestLoser === mine.price) {
        headline = `Tie at $${mine.price}, and you won it: ${tieReason(s, mine, loserAtLow, viewer)}.`;
      } else {
        headline = `You sold ${n} ${fruitWord(l.fruit, n)} at $${mine.price}.`;
      }
    }
    if (mine.sold === mine.qty && sold < l.want) {
      detail = `${l.want - sold} more wanted. You offered all you could at that price.`;
    } else if (mine.sold === mine.qty && mine.qty < l.want) {
      const rest = winners.filter((o) => o.player !== viewer);
      if (rest.length) detail = `Right price, not enough stock: ${rest.map((o) => s.players[o.player].name).join(' and ')} sold the other ${l.want - mine.qty}.`;
    }
    return { showdown, tone: 'good', headline, detail, tags };
  }

  // The viewer sold nothing.
  if (mine.tooOld) {
    const why = noSaleReason(s, l, mine, viewer);
    return { showdown, tone: 'bad', tags, headline: why.headline, detail: why.detail };
  }
  const cheaper = winners.filter((o) => o.price < mine.price);
  if (cheaper.length) {
    const best = cheaper.reduce((a, o) => (o.price > a.price ? o : a));
    const gap = mine.price - best.price;
    const who = s.players[best.player].name;
    const headline = gap === 1 ? `${who} undercut you by $1 and stole the sale!` : `${who} undercut you by $${gap}.`;
    // Counterfactual: under every winning price puts the viewer first in line; matching the cheapest winner is a
    // tie, settled in the engine's tie order (see undercutWhatIf). It works from the cheapest winner, so that stall
    // is named with its price when it is not the one above.
    const lowest = Math.min(...winners.map((o) => o.price));
    const low = lowest < best.price ? ` and ${winners.filter((o) => o.price === lowest).map((o) => s.players[o.player].name).join(' and ')} $${lowest}` : '';
    const whatIf = undercutWhatIf(s, l, mine, lowest, viewer);
    const detail = `You charged $${mine.price}, ${who} charged $${best.price}${low}.${whatIf ? ` ${whatIf}` : ''}`;
    return { showdown, tone: 'bad', headline, detail, tags };
  }
  const tie = winners.find((o) => o.price === mine.price);
  if (tie) {
    const floor = Math.max(1, minPrice(s, l.fruit));
    const ctx = lineContext(s, l, viewer);
    const unsold = ctx ? ctx.crate - ctx.soldToday : Infinity;
    const lower = mine.price - 1;
    let detail: string | undefined;
    if (ctx && ctx.crate > 0 && unsold <= 0) detail = soldAllText(l.fruit, ctx.crate);
    else if (lower >= floor && !(ctx && !ctx.first && unsettledAt(s, l, lower, viewer))) {
      const n = piecesAt(s, l, mine, lower, ctx, viewer).n;
      if (n > 0) detail = `$${lower} would have won it.${unsoldNote(unsold, n)}`;
    }
    return { showdown, tone: 'bad', headline: `Tie at $${mine.price}, but ${tieReason(s, tie, mine, viewer)}.`, detail, tags };
  }
  return { showdown, tone: 'bad', headline: `${cust}'s order was filled before your offer.`, tags };
}

// ---------- reactions ----------

export interface Reaction { player: number; text: string }

/** At most one rival reaction per line, based only on what happened. */
export function rivalReaction(s: GameState, l: LineResult, viewer: number, used: Set<string>): Reaction | null {
  const mine = l.offers.find((o) => o.player === viewer);
  const pick = (p: number, pool: string[]) => {
    if (!pool.length) return null;
    const start = hash(s.day, l.customerId, p) % pool.length;
    for (let i = 0; i < pool.length; i++) {
      const text = pool[(start + i) % pool.length];
      if (!used.has(text)) { used.add(text); return { player: p, text }; }
    }
    return null;
  };
  const linesOf = (p: number) => RIVALS.find((r) => r.avatar === s.players[p].avatar)?.lines;
  for (const o of l.offers) {
    const pl = s.players[o.player];
    const lines = linesOf(o.player);
    if (pl.kind !== 'ai' || !lines || o.player === viewer) continue;
    // Only offers that were in the price contest can undercut or be beaten.
    if (mine && inContest(mine) && o.sold > 0 && mine.sold === 0 && mine.price - o.price <= 2 && mine.price > o.price) return pick(o.player, lines.undercut);
    if (mine && inContest(o) && o.sold === 0 && mine.sold > 0 && (o.price - mine.price <= 1)) return pick(o.player, lines.stung);
  }
  for (const o of l.offers) {
    const lines = linesOf(o.player);
    if (s.players[o.player].kind !== 'ai' || !lines) continue;
    if (o.sold > 0 && o.price >= l.max && l.offers.length > 1) return pick(o.player, lines.fullPrice);
    if (mine && inContest(o) && o.sold === 0 && mine.sold > 0 && o.price - mine.price >= 2) return pick(o.player, lines.lost);
  }
  return null;
}

const HAPPY = ['Perfect, thanks!', 'Yum!', 'Just what I needed!', 'Lovely!', 'A bargain!'];
const MEH = ['Hmph, not enough.', 'I wanted more…', 'Is that all?'];
const GONE = ["I'm off. Never again!", 'Waste of a trip!', 'Goodbye, then!'];

export function customerReaction(s: GameState, customerId: number, name: string): string {
  const r = s.results;
  if (!r) return '';
  const h = hash(s.day, customerId);
  if (r.happy.includes(name)) return HAPPY[h % HAPPY.length];
  if (r.leftAngry.includes(name)) return GONE[h % GONE.length];
  return MEH[h % MEH.length];
}

// ---------- standing ----------

export interface Standing { rank: number; of: number; text: string; leader: number; gap: number }

export function standing(s: GameState, viewer: number): Standing {
  const order = ranking(s);
  const rank = order.indexOf(viewer) + 1;
  const me = s.players[viewer].cash;
  const leader = order[0];
  if (rank === 1) {
    const second = order[1];
    const gap = second === undefined ? 0 : me - s.players[second].cash;
    return { rank, of: order.length, leader, gap, text: second === undefined ? 'Leading' : gap === 0 ? `Tied with ${s.players[second].name}` : `1st · $${gap} ahead of ${s.players[second].name}` };
  }
  const ahead = order[rank - 2];
  const gap = s.players[ahead].cash - me;
  const ord = ['1st', '2nd', '3rd', '4th'][rank - 1];
  return { rank, of: order.length, leader, gap, text: `${ord} · $${gap} behind ${s.players[ahead].name}` };
}

// ---------- daily highlights ----------

export interface Highlight { icon: string; text: string; tone: Tone; score: number }

/** One or two notable, true moments from today's results, chosen by fixed scores. */
export function dayHighlights(s: GameState, viewer: number): Highlight[] {
  const r = s.results;
  if (!r) return [];
  const out: Highlight[] = [];
  const mineIncome = r.income[viewer];
  // Head-to-head wins and losses against each rival.
  const beat = new Map<number, number>();
  const lostTo = new Map<number, { n: number; close: number }>();
  let bestLine: { l: LineResult; rev: number } | null = null;
  for (const l of r.lines) {
    const mine = l.offers.find((o) => o.player === viewer);
    if (!mine) continue;
    if (mine.sold > 0) {
      const rev = mine.sold * mine.price;
      if (!bestLine || rev > bestLine.rev) bestLine = { l, rev };
      for (const o of l.offers) if (o.player !== viewer && o.sold === 0 && inContest(o)) beat.set(o.player, (beat.get(o.player) ?? 0) + 1);
    } else if (inContest(mine)) {
      for (const o of l.offers) if (o.player !== viewer && o.sold > 0) {
        const e = lostTo.get(o.player) ?? { n: 0, close: 0 };
        e.n++;
        if (mine.price - o.price <= 1) e.close++;
        lostTo.set(o.player, e);
      }
    }
  }
  for (const [p, n] of beat) {
    out.push({ icon: '⚔️', tone: 'good', score: 50 + n * 10, text: n === 1 ? `You beat ${s.players[p].name} to a customer!` : `You beat ${s.players[p].name} ${n} times today!` });
  }
  for (const [p, e] of lostTo) {
    if (e.close) out.push({ icon: '😤', tone: 'bad', score: 45 + e.close * 10, text: e.close === 1 ? `${s.players[p].name} edged you out by $1 or less.` : `${s.players[p].name} edged you out ${e.close} times by $1 or less.` });
    else out.push({ icon: '📉', tone: 'bad', score: 30 + e.n * 5, text: `${s.players[p].name} undercut you ${e.n === 1 ? 'once' : `${e.n} times`}.` });
  }
  if (bestLine && mineIncome > 0 && bestLine.rev >= mineIncome * 0.6 && bestLine.rev >= 10) {
    out.push({ icon: '⭐', tone: 'good', score: 40 + bestLine.rev, text: `${lookOf(bestLine.l.name).title} saved your day with $${bestLine.rev}.` });
  }
  // Premium mango sales (mangoes are the ripen-and-wait fruit).
  const mango = r.lines.filter((l) => l.fruit === 'mango').flatMap((l) => l.offers.filter((o) => o.player === viewer && o.sold > 0 && o.price >= 9));
  if (mango.length) out.push({ icon: '🥭', tone: 'good', score: 42, text: `Your mangoes sold at a premium ($${Math.max(...mango.map((o) => o.price))} each).` });
  // Market dominance: one shop sold at least 70% (min 3) of a fruit today.
  for (const f of FRUITS) {
    const by = new Map<number, number>();
    for (const l of r.lines) if (l.fruit === f) for (const o of l.offers) if (o.sold) by.set(o.player, (by.get(o.player) ?? 0) + o.sold);
    const total = [...by.values()].reduce((a, b) => a + b, 0);
    for (const [p, n] of by) if (total >= 3 && n / total >= 0.7) {
      out.push({ icon: '👑', tone: p === viewer ? 'good' : 'neutral', score: 25 + n * 3, text: `${p === viewer ? 'You' : s.players[p].name} dominated the ${FRUIT[f].name.toLowerCase()} market (${n} sold).` });
    }
  }
  // Fruit that spoils tonight if the game goes on, by the night's own rules (Cold Room, Heatwave, Juice Bar).
  const night = nightOutlook(s, viewer);
  if (night.spoil >= 2) {
    const juice = night.juice ? `; ${becomeJuice(night.juice)} (+$${night.juice * JUICE_VALUE})` : '';
    out.push({ icon: '🗑️', tone: 'bad', score: 20 + night.spoil * 6, text: `${night.spoil} of your fruit will spoil tonight${juice}.` });
  }
  if (mineIncome === 0 && !r.lines.some((l) => l.offers.some((o) => o.player === viewer))) {
    out.push({ icon: '😶', tone: 'neutral', score: 15, text: 'A quiet day: you made no offers.' });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, 2);
}

// ---------- overnight ----------

/** Fruit the viewer lost overnight, from the engine's own spoilage counter. */
export function overnightLoss(prev: GameState, next: GameState, viewer: number): number {
  return Math.max(0, next.players[viewer].stats.spoiled - prev.players[viewer].stats.spoiled);
}

/** What the viewer's Juice Bar made overnight. */
export interface NightJuice { pieces: number; dollars: number }

/** Pieces the viewer's Juice Bar juiced overnight and the dollars it paid, from the engine's own juice counter. */
export function overnightJuice(prev: GameState, next: GameState, viewer: number): NightJuice {
  const pieces = Math.max(0, (next.players[viewer].stats.juiced ?? 0) - (prev.players[viewer].stats.juiced ?? 0));
  return { pieces, dollars: pieces * JUICE_VALUE };
}

/**
 * Tonight's forecast in words, or null when nothing leaves the shelf: "3 fruit spoil tonight",
 * "3 fruit become juice tonight (+$6)" or "2 spoil tonight, 3 become juice (+$6)".
 */
export function tonightText(o: NightOutlook): string | null {
  const cash = `(+$${o.juice * JUICE_VALUE})`;
  const spoils = o.spoil === 1 ? 'spoils' : 'spoil';
  if (o.spoil > 0 && o.juice > 0) return `${o.spoil} ${spoils} tonight, ${becomeJuice(o.juice)} ${cash}`;
  if (o.juice > 0) return `${o.juice} fruit ${o.juice === 1 ? 'becomes' : 'become'} juice tonight ${cash}`;
  if (o.spoil > 0) return `${o.spoil} fruit ${spoils} tonight`;
  return null;
}

/** Tonight's forecast for shop `p` in words (the sales card and the Evening panel), or null when nothing leaves the shelf. */
export function tonightLine(s: GameState, p: number): string | null {
  return tonightText(nightOutlook(s, p));
}

/**
 * The Evening panel's Heatwave warning for shop `p`, or null. A Heatwave ages fruit an extra step tonight, but a Cold
 * Room keeps it out (shelfSteps in game.ts), so a Cold Room stall gets no warning; nor does the final day, which no
 * night follows.
 */
export function heatwaveLine(s: GameState, p: number): string | null {
  const extra = s.event?.ageExtra ?? 0;
  if (extra <= 0 || s.players[p].upgrades.includes('coldroom') || s.day >= s.config.days) return null;
  return `Heatwave: everything ages ${extra === 1 ? 'twice' : `${1 + extra} times`} tonight.`;
}

/**
 * The morning card's overnight lines, in order: fruit lost, then what the Juice Bar made. One helper for both card
 * layouts (the phone brief and the full card), which each show the loss line today.
 */
export function overnightLines(lost: number, juice?: NightJuice): { text: string; tone: Tone }[] {
  const out: { text: string; tone: Tone }[] = [];
  if (lost > 0) out.push({ tone: 'bad', text: `${lost} of your fruit spoiled overnight.` });
  if (juice && juice.pieces > 0) out.push({ tone: 'good', text: `Your Juice Bar made $${juice.dollars} from ${juice.pieces} fruit overnight.` });
  return out;
}

// ---------- end of game ----------

export interface Recap { best: string[]; worst: string[] }

/** Strongest and weakest moments of the whole game, from the day history. */
export function gameRecap(s: GameState, viewer: number): Recap {
  const hist = s.history ?? [];
  const best: { score: number; text: string }[] = [];
  const worst: { score: number; text: string }[] = [];
  let bestDay: { day: number; v: number } | null = null;
  let biggest: { rev: number; day: number; name: string; fruit: FruitId; n: number } | null = null;
  let miss: { lost: number; day: number; who: string; gap: number } | null = null;
  const h2h = new Map<number, { won: number; lost: number }>();
  for (const d of hist) {
    const v = d.income[viewer];
    if (!bestDay || v > bestDay.v) bestDay = { day: d.day, v };
    for (const l of d.lines) {
      const mine = l.offers.find((o) => o.player === viewer);
      if (!mine) continue;
      if (mine.sold > 0) {
        const rev = mine.sold * mine.price;
        if (!biggest || rev > biggest.rev) biggest = { rev, day: d.day, name: l.name, fruit: l.fruit, n: mine.sold };
      }
      for (const o of l.offers) {
        if (o.player === viewer) continue;
        const e = h2h.get(o.player) ?? { won: 0, lost: 0 };
        if (mine.sold > 0 && o.sold === 0 && inContest(o)) e.won++;
        if (mine.sold === 0 && o.sold > 0 && inContest(mine)) {
          e.lost++;
          const gap = mine.price - o.price;
          const lost = Math.min(mine.qty, l.want) * o.price;
          if (gap >= 0 && lost > 0 && (!miss || lost > miss.lost)) miss = { lost, day: d.day, who: s.players[o.player].name, gap };
        }
        h2h.set(o.player, e);
      }
    }
  }
  if (bestDay && bestDay.v > 0) best.push({ score: bestDay.v, text: `Best day: Day ${bestDay.day}, +$${bestDay.v}.` });
  if (biggest) best.push({ score: biggest.rev, text: `Biggest sale: ${biggest.n} ${fruitWord(biggest.fruit, biggest.n)} to ${lookOf(biggest.name).title} for $${biggest.rev} (Day ${biggest.day}).` });
  const rivalry = [...h2h.entries()].sort((a, b) => b[1].won - a[1].won)[0];
  if (rivalry && rivalry[1].won > 0) best.push({ score: rivalry[1].won, text: `You beat ${s.players[rivalry[0]].name} to ${rivalry[1].won} customer${rivalry[1].won > 1 ? 's' : ''}.` });
  if (miss) worst.push({ score: miss.lost, text: miss.gap === 0 ? `Day ${miss.day}: lost a $${miss.lost} sale to ${miss.who} on a tie.` : `Day ${miss.day}: ${miss.who} undercut you by $${miss.gap} on a $${miss.lost} sale.` });
  const nemesis = [...h2h.entries()].sort((a, b) => b[1].lost - a[1].lost)[0];
  if (nemesis && nemesis[1].lost >= 2) worst.push({ score: nemesis[1].lost, text: `${s.players[nemesis[0]].name} took ${nemesis[1].lost} customers from you.` });
  const spoiled = s.players[viewer].stats.spoiled;
  if (spoiled > 0) worst.push({ score: spoiled, text: `${spoiled} fruit spoiled on your shelf.` });
  for (const x of closingLeftovers(s, viewer)) worst.push({ score: x.n, text: x.text });
  return { best: best.slice(0, 3).map((x) => x.text), worst: worst.sort((a, b) => b.score - a.score).slice(0, 2).map((x) => x.text) };
}

/**
 * The viewer's fruit still on the shelf when the game ended. On Closing Day the jam maker has already paid for the
 * ripe pieces (they stay on the shelf), so only fruit he did not buy is "worth $0": green fruit, or every piece when
 * Closing Day is switched off.
 */
export function closingLeftovers(s: GameState, viewer: number): { n: number; text: string }[] {
  if (s.phase !== 'over') return [];
  const stock = s.players[viewer].stock;
  const all = count(stock);
  const ripe = count(stock, undefined, true);
  const jam = s.jam?.[viewer] ?? 0;
  const out: { n: number; text: string }[] = [];
  if (jam > 0) out.push({ n: ripe, text: `${ripe} ripe fruit left at closing: the jam maker paid $${jam}.` });
  const unpaid = s.jam ? all - ripe : all;
  if (unpaid > 0) out.push({ n: unpaid, text: s.jam ? `${unpaid} green fruit left at closing (worth $0).` : `${unpaid} fruit left unsold at closing (worth $0).` });
  return out;
}

// ---------- Closing Day ----------

/** The final day's word on leftover fruit, for each place that shows it. Null: show nothing there. */
export interface ClosingNote {
  /** The morning card (only with fruit on the shelf). */
  morning: string | null;
  /** The short chip on your shelf (only with fruit on the shelf). */
  chip: string | null;
  /** The Stocking panel's note. */
  stocking: string;
  /** What the jam maker pays tonight for each piece now on this shelf that he buys: JAM_PRICE, or 0 (nothing paid). */
  each: number;
}

/**
 * What the viewer's leftovers are worth tonight, in one place so the morning card, the shelf chip and the Stocking
 * panel cannot disagree with the night (finishReveal): on Closing Day the jam maker pays JAM_PRICE for each ripe
 * piece left and nothing for green fruit; with Closing Day switched off every leftover is worth $0. Null before the
 * final day and once the game is over.
 */
export function closingNote(s: GameState, viewer: number): ClosingNote | null {
  if (s.day !== s.config.days || s.phase === 'over') return null;
  const stock = s.players[viewer].stock;
  const all = count(stock);
  const ripe = count(stock, undefined, true);
  if (isLastCall(s)) {
    const stocking = `Closing Day: ripe fruit left tonight goes to the jam maker at $${JAM_PRICE} each.`;
    if (ripe > 0) {
      // With green fruit on the shelf too, the chip names ripe fruit: the jam maker pays nothing for green.
      return {
        morning: `Ripe fruit left tonight goes to the jam maker for $${JAM_PRICE} each. Sell what you can!`,
        chip: `${all > ripe ? 'Ripe leftovers' : 'Leftovers'} = $${JAM_PRICE} each`, stocking, each: JAM_PRICE,
      };
    }
    if (all > 0) {
      return {
        morning: 'Green fruit left tonight is worth $0: the jam maker buys ripe fruit only.',
        chip: 'Unsold = $0', stocking: 'Closing Day: green fruit left tonight is worth $0. The jam maker buys ripe fruit only.', each: 0,
      };
    }
    return { morning: null, chip: null, stocking, each: 0 };
  }
  return {
    morning: all > 0 ? 'Anything unsold tonight is worth $0. Sell it all!' : null,
    chip: all > 0 ? 'Unsold = $0' : null,
    stocking: 'Last day: anything unsold tonight is worth $0.',
    each: 0,
  };
}

/**
 * Jam money shop `p` is still owed: on Closing Day, after the rush and before the market closes (when the final sales
 * card is drawn), the jam maker will pay JAM_PRICE for each ripe piece left. 0 at any other time.
 */
export function jamDue(s: GameState, p: number): number {
  if (s.phase !== 'reveal' || !isLastCall(s) || s.jam) return 0;
  return count(s.players[p].stock, undefined, true) * JAM_PRICE;
}

/** The day's money on the sales card. */
export interface DayLedger {
  /** Takings at the bell (Juice Bar tips and the Haggler's first-sale dollar included). */
  sales: number;
  /** What the viewer paid for fruit today. */
  bought: number;
  /** The jam maker's money: already paid, or still to come tonight (`jamTonight`). */
  jam: number;
  jamTonight: boolean;
  /** Anything else that changed the viewer's cash since the day began. */
  other: number;
  /** The day's cash change, jam money included; null when the day's starting cash is unknown (an older save). */
  net: number | null;
}

/**
 * The viewer's day in money: sales, fruit bought, the jam maker and anything else. On Closing Day the final sales
 * card is drawn before the jam maker pays, so his money is counted here as "tonight" and included in the net.
 */
export function dayLedger(s: GameState, viewer: number): DayLedger {
  const r = s.results;
  const sales = r?.income[viewer] ?? 0;
  const bought = r?.spent?.[viewer] ?? 0;
  const paid = s.jam?.[viewer] ?? 0;
  const due = jamDue(s, viewer);
  const start = s.dayStartCash?.[viewer];
  const change = start === undefined ? null : s.players[viewer].cash - start;
  return {
    sales, bought, jam: paid + due, jamTonight: due > 0,
    other: change === null ? 0 : change - sales + bought - paid,
    net: change === null ? null : change + due,
  };
}

/**
 * The game as it will stand once the jam maker has paid (the same state when nothing is due), for the standing line
 * on the final sales card. Presentation only: never hand the result back to the engine.
 */
export function withJamPaid(s: GameState): GameState {
  const due = s.players.map((_, p) => jamDue(s, p));
  if (due.every((d) => d === 0)) return s;
  return { ...s, players: s.players.map((pl, p) => ({ ...pl, cash: pl.cash + due[p] })) };
}
