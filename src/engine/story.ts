// Presentation-only storytelling: turns the rules engine's results into short explanations,
// reactions and highlights. Nothing here changes game state or re-implements pricing; every
// sentence is derived from the recorded offers (price, units, sold, freshness) and the rules
// the engine used to sort them (cheapest first; ties (rules 11): Favoured Trade, then fresher fruit, then a Haggler,
// then today's buying order, which was set at dawn with the poorest shop first).

import { FRUIT, JAM_PRICE, JUICE_VALUE, lookOf, prefOf, type FruitId, type Pref, type Stage } from './data';
import {
  count, eligible, isLastCall, places, rowCount, rowStock, minPrice, nightOutlook, ranking, servingCustomers,
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
const becomeJuice = (n: number) => `${n} ${n === 1 ? 'becomes' : 'become'} juice`;

// A stall's name in a sentence. A solo game calls the player's stall "You" when no name is typed, so a sentence built
// from a name must also read correctly for that one: "Rosa wins" but "You win", "Rosa's" but "your".
const isYou = (name: string) => name.trim().toLowerCase() === 'you';
/** The name as a subject with its verb: "Rosa wins", "You win" (`start` false inside a sentence: "you win"). */
export const nameVerb = (name: string, verb: string, you: string, start = true) => (isYou(name) ? `${start ? 'You' : 'you'} ${you}` : `${name} ${verb}`);
/** The name inside a sentence, after a verb or a preposition: "beat Rosa", "beat you". */
export const nameIn = (name: string) => (isYou(name) ? 'you' : name);
/** The owner of a thing: "Rosa's fruit", "your fruit" (`start`: "Your fruit"). */
export const nameOwn = (name: string, start = false) => (isYou(name) ? (start ? 'Your' : 'your') : `${name}'s`);
/** Several names: "Rosa and you", "You and Rosa". */
const namesAnd = (names: string[], start = true) => names.map((n, i) => (i === 0 && start ? n : nameIn(n))).join(' and ');

function hash(...xs: number[]): number {
  let h = 2166136261;
  for (const x of xs) { h ^= x & 0xffff; h = Math.imul(h, 16777619); h ^= x >>> 16; h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * The Haggler's tie rule in one wording for every screen (the showdown, the what-if and the Price panel's hint):
 * "Rosa is the Haggler, who wins equally fresh ties", or "you're the Haggler, ..." for the viewer.
 */
export function hagglerWins(names: string[], you = false): string {
  if (you) return "you're the Haggler, who wins equally fresh ties";
  return names.length === 1 ? `${nameVerb(names[0], 'is', 'are')} the Haggler, who wins equally fresh ties` : `${namesAnd(names)} are Hagglers, who win equally fresh ties`;
}


/** The rush pop-up's short form of tieReason (PLAN-067): "fresher fruit", "Haggler", "Favoured Trade", "bought earlier today". */
function tieShort(s: GameState, winner: Offer, loser: Offer): string {
  const w = s.players[winner.player];
  const l = s.players[loser.player];
  if (w.favouredTrade && !l.favouredTrade) return 'Favoured Trade';
  if (winner.freshness > loser.freshness) return 'fresher fruit';
  if (haggled(s, winner, loser)) return 'Haggler';
  return 'bought earlier today';
}

/** A Haggler wins ties when neither Favoured Trade nor fresher fruit decides them (rules 11: equally fresh fruit). */
function haggled(s: GameState, winner: Offer, loser: Offer): boolean {
  const w = s.players[winner.player];
  const l = s.players[loser.player];
  return w.trait === 'haggler' && l.trait !== 'haggler' && w.favouredTrade === l.favouredTrade && winner.freshness === loser.freshness;
}

/**
 * Was this offer in the price contest? A stall whose fruit did not qualify for the customer (over their top price,
 * a freshness they will not take, or too old for the price: the engine's `tooOld`) was never compared on price, so
 * no "beat", "undercut" or "tie" line may count it.
 */
export const inContest = (o: Offer): boolean => !o.tooOld;

const STAGE_WORD: Record<Exclude<Stage, 'unripe'>, string> = { fresh: 'Fresh', okay: 'Okay', notso: 'Soft' };

/** The freshness rule the engine used for this customer (Premium, Everyday, Bargain; none for a hand-made test customer). */
function prefFor(s: GameState, l: LineResult): Pref | undefined {
  const c = servingCustomers(s).find((x) => x.id === l.customerId && x.name === l.name);
  return c ? c.pref : prefOf(l.name);
}

/** Is this line a guest's fixed price? Rules 18: a Premium Display never raises it. */
function fixedFor(s: GameState, l: LineResult): boolean {
  const c = servingCustomers(s).find((x) => x.id === l.customerId && x.name === l.name);
  return !!c?.original.find((w) => w.fruit === l.fruit)?.fixed;
}

export type NoSaleKind = 'price' | 'freshOnly' | 'noTired' | 'age';
export interface NoSale { kind: NoSaleKind; tag: string; headline: string; detail: string }

/**
 * Why an offer that did not qualify (`tooOld`) could not sell, from the price, the customer's top and freshness rule,
 * and the stall's Premium Display only (the shelf at that moment is not recorded, and is not needed):
 * over the top price (no freshness could sell), a Premium customer (Fresh only), an Everyday customer at a price Okay
 * fruit could meet (so only Soft fruit was there), otherwise the fruit was too old for that price.
 */
export function noSaleReason(s: GameState, l: LineResult, o: Offer, viewer: number): NoSale {
  const cust = lookOf(l.name).title;
  const plural = FRUIT[l.fruit].plural.toLowerCase();
  const display = s.players[o.player].upgrades.includes('premium') && !fixedFor(s, l);
  const mine = o.player === viewer;
  const who = s.players[o.player]?.name ?? '';
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
    ? `${cust} buys Fresh only, up to $${top}${withDisplay}.`
    : `${cust} pays up to ${items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0]}${pref === 'everyday' ? '; never Soft' : ''}.`;
  if (o.price > top) {
    return { kind: 'price', tag: `over $${top}`, headline: `Price too high. ${cust} pays at most $${top}${display ? ` for Fresh, with ${mine ? 'your' : 'a'} Premium Display` : ''}.`, detail: pays };
  }
  if (pref === 'premium') {
    return { kind: 'freshOnly', tag: 'Fresh only', headline: `Fresh only. ${mine || isYou(who) ? 'Yours' : `${who}'s`} were not Fresh.`, detail: `${cust} is a Premium customer.` };
  }
  if (pref === 'everyday' && o.price <= l.max - 1) {
    return { kind: 'noTired', tag: "won't take Soft", headline: `${cust} will not take Soft ${plural}.`, detail: 'Everyday customers buy Fresh or Okay only.' };
  }
  const sells = caps.filter((x) => x.cap >= o.price).map((x) => STAGE_WORD[x.st]);
  const rest = caps.filter((x) => x.cap < o.price).map((x) => `${STAGE_WORD[x.st]} up to $${x.cap}`);
  const detail = `At $${o.price} ${sells.length === 1 ? `only ${sells[0]} sells` : `${sells.join(' or ')} sells`}${rest.length ? `; ${rest.join(', ')}` : ''}.`;
  return {
    kind: 'age', tag: `too old for $${o.price}`, detail,
    headline: `Too old for $${o.price}. ${mine ? 'Your' : nameOwn(who, true)} ${plural} could not sell at that price.`,
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
    return tie.freshness > o.freshness ? 'lost tie: fresher won' : haggled(s, tie, o) ? 'lost tie: Haggler' : 'lost tie: bought later';
  }
  return 'order filled first';
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
  /** Pasar Malam: the night hawker bought some of this fruit from the viewer after the rush, so the shelf now is not the
   *  shelf at the bell. */
  hawked: boolean;
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
    // A standing order's line is not part of the row: its pieces are already out of the crate count below (rowCount).
    if (x.fruit !== l.fruit || x.name === s.results?.order?.name) return;
    const m = x.offers.find((o) => o.player === viewer);
    soldToday += m?.sold ?? 0;
    if (k < i) {
      first = false;
      soldBefore += m?.sold ?? 0;
      before += m ? Math.max(0, x.want - m.sold) : x.want;
    }
  });
  const hawked = !!s.results?.hawker?.some((x) => x.player === viewer && x.fruit === l.fruit);
  return { first, crate: rowCount(s, viewer, l.fruit), soldToday, hawked, soldBefore, before };
}

/**
 * Who would have won if the viewer had matched `rival`'s price for this customer, in the engine's tie order (rules 11):
 * Favoured Trade, then fresher fruit, then a Haggler, then today's buying order. 'open' when the results cannot tell.
 * Favoured Trade needs only the players; the Haggler counts only once freshness is known to be equal. Freshness is judged only for the first customer of this fruit
 * today (every shelf of it was still as it stood at the bell): at a lower price a stall hands over its oldest
 * qualifying pieces first, so the freshness recorded at the viewer's own price is the best it could have been, and
 * if the viewer sold none of this fruit all day, the shelf now is the shelf then, so the engine's own eligible()
 * gives the exact pieces.
 */
export function tieAt(s: GameState, l: LineResult, mine: Offer, rival: Offer, viewer: number): TieCall {
  const me = s.players[viewer];
  const r = s.players[rival.player];
  if (me.favouredTrade !== r.favouredTrade) return { outcome: me.favouredTrade ? 'win' : 'lose', by: 'favouredTrade' };
  const ctx = lineContext(s, l, viewer);
  if (!ctx?.first || !inContest(rival)) return { outcome: 'open' };
  if (mine.freshness < rival.freshness) return { outcome: 'lose', by: 'fresher' };
  if (ctx.soldToday > 0 || ctx.hawked || s.phase !== 'reveal') return { outcome: 'open' };
  const used = eligible(me, rowStock(s, viewer), l.fruit, Math.min(ctx.crate, l.want), rival.price, l.max, prefFor(s, l), fixedFor(s, l));
  if (!used.length) return { outcome: 'open' };
  const fresh = Math.max(...used);
  if (fresh !== rival.freshness) return { outcome: fresh > rival.freshness ? 'win' : 'lose', by: 'fresher' };
  const mh = me.trait === 'haggler';
  if (mh !== (r.trait === 'haggler')) return { outcome: mh ? 'win' : 'lose', by: 'haggler' };
  return { outcome: s.order.indexOf(viewer) < s.order.indexOf(rival.player) ? 'win' : 'lose', by: 'order' };
}

const WIN_WHY: Record<TieBy, string> = {
  favouredTrade: 'Favoured Trade', haggler: 'Haggler', fresher: 'fresher fruit', order: 'you bought earlier today',
};
function loseWhy(s: GameState, p: number, by: TieBy): string {
  const who = s.players[p].name;
  return by === 'favouredTrade' ? `${nameVerb(who, 'has', 'have', false)} Favoured Trade`
    : by === 'haggler' ? `${nameVerb(who, 'is', 'are', false)} the Haggler`
      : by === 'fresher' ? `${nameOwn(who)} fruit was fresher` : `${nameIn(who)} bought earlier today`;
}

/** A count of the viewer's pieces: exact, or only the fewest there would surely have been. */
interface Pieces { n: number; exact: boolean }

/**
 * How many this customer would surely have bought from the viewer at `price` with no rival ahead of them: pieces that
 * qualify at `price` (a lower price lets older pieces qualify too), no more than they wanted or the crate had left.
 * The first customer of this fruit today saw every shelf as it stood at the bell; if the viewer then sold none of it
 * all day, the shelf now is that shelf, and the engine's own eligible() gives the exact count. Otherwise it is a
 * lower bound: the pieces of the bell's crate that qualify less those already sold to earlier customers (`soldBefore`:
 * they may be the very pieces that qualify, as when a Premium customer has taken the fresh ones), or the pieces that
 * were offered at the viewer's own (higher) price; either less what earlier customers of this fruit could also have
 * taken at the lower price (`before`); and the crate less everything earlier customers could have bought. (Customers take a shop's oldest qualifying pieces first, so a lower price for an
 * earlier customer can only leave this one fresher pieces; it costs this customer at most the extra pieces taken.)
 * Without today's results (a hand-made line), what was offered and wanted.
 */
function piecesAt(s: GameState, l: LineResult, mine: Offer, price: number, ctx: LineContext | null, viewer: number): Pieces {
  if (!ctx) return { n: Math.min(l.want, mine.qty), exact: false };
  const me = s.players[viewer];
  const bell = s.phase === 'reveal';
  const now = bell ? eligible(me, rowStock(s, viewer), l.fruit, ctx.crate, price, l.max, prefFor(s, l), fixedFor(s, l)).length : 0;
  if (bell && ctx.first && ctx.soldToday === 0 && !ctx.hawked) return { n: Math.min(l.want, now), exact: true };
  const n = Math.min(l.want, ctx.crate - ctx.soldBefore - ctx.before, Math.max(mine.qty, now - ctx.soldBefore) - ctx.before);
  return { n: Math.max(0, n), exact: false };
}

/** The engine's tie rank for a stall today before freshness (rules 11): only Favoured Trade comes ahead of it. */
const tieRank = (s: GameState, p: number) => Number(s.players[p].favouredTrade);

/**
 * For a customer after the first of this fruit: could a stall priced exactly `price` that was not in this line's price
 * contest have stood ahead of the viewer, had the viewer charged `price` all day? Earlier customers might then have
 * bought from the viewer instead, leaving that stall fruit for this customer, and only freshness or the buying order
 * (not known here) would settle the tie. A stall that Favoured Trade puts ahead of the viewer always
 * sold first, so it has no more fruit than it really had; one they put behind cannot stand ahead.
 */
function unsettledAt(s: GameState, l: LineResult, price: number, viewer: number): boolean {
  const here = new Set(l.offers.filter(inContest).map((o) => o.player));
  return (s.results?.lines ?? []).some((x) => x.fruit === l.fruit && x.offers.some((o) =>
    o.player !== viewer && o.price === price && !here.has(o.player) && tieRank(s, o.player) === tieRank(s, viewer)));
}

/** "You still sold all 3 at your price." The crate sold out anyway, so a lower price would only have moved a sale. */
function soldAllText(f: FruitId, crate: number): string {
  return crate === 1 ? `Your only ${fruitWord(f, 1)} sold anyway.` : `All ${crate} sold anyway.`;
}

/** Added when fewer of the viewer's pieces went unsold today than a what-if claims for this customer. */
const unsoldNote = (unsold: number, claimed: number) => (unsold < claimed ? ` Only ${unsold} went unsold anyway.` : '');

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
    return `Match $${lowest} and you win${why}: ${atTie.n} sold.${unsoldNote(unsold, atTie.n)}`;
  }

  const sure = under ? `$${under.price} would've sold ${under.n}.` : lowest - 1 < floor ? `$${floor} is the lowest price.` : '';
  let claimed = under?.n ?? 0;
  let tie = '';
  if (lose.length) {
    // The stalls that win the tie sell first, each up to what it offered this customer.
    const room = l.want - lose.reduce((a, x) => a + x.o.qty, 0);
    const why = loseWhy(s, lose[0].o.player, lose[0].by);
    const j = Math.min(Math.max(0, room), atTie.n);
    if (room <= 0) tie = `A $${lowest} tie loses too: ${why}.`;
    else if (!open && j > 0 && under && j < under.n && (atTie.exact || atTie.n >= room)) tie = `A $${lowest} tie sells just ${j}: ${why}.`;
    else if (!open && j > 0) {
      tie = `Match $${lowest}: ${j} sold${under && j === under.n ? ' too' : ''}, after ${namesAnd(lose.map((x) => s.players[x.o.player].name), false)}.`;
      claimed = Math.max(claimed, j);
    }
  } else if (open) {
    const hag = s.players[viewer].trait === 'haggler' || l.offers.some((o) => o.price === lowest && s.players[o.player].trait === 'haggler');
    tie = `Ties go to fresher fruit, then ${hag ? 'the Haggler, then ' : ''}whoever bought earlier today.`;
  }
  const text = [sure, tie].filter(Boolean).join(' ');
  return text ? `${text}${unsoldNote(unsold, claimed)}` : '';
}

export function explainLine(s: GameState, l: LineResult, viewer: number): LineStory {
  // Rules 14: a standing order buys by its own rule (the holder first, at its bid), so there is no what-if advice for it.
  if (s.results?.order && s.results.order.name === l.name) return rushLine(s, l);
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
      return { showdown, tone: 'neutral', headline: allPrice ? `Every price was too high for ${cust}.` : `Nothing ${cust} would buy.`, tags };
    }
    const losers = others.filter((o) => o.sold === 0 && inContest(o));
    const headline = losers.length
      ? `${s.players[top.player].name} beat ${namesAnd(losers.map((o) => s.players[o.player].name), false)} at $${top.price}.`
      : `${s.players[top.player].name} sold ${top.sold} at $${top.price}.`;
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
        ? `${s.players[cheaper[0].player].name} went cheaper. You sold ${n} of ${mine.qty}.`
        : `Sold ${n} of ${mine.qty}: ${cust} wanted ${l.want}.`;
    } else if (!rivals.length) {
      headline = mine.price >= l.max ? `No rival had any. ${n} sold at top price.` : `No rival had any. ${n} sold at $${mine.price}.`;
      if (mine.price < l.max) detail = `${cust} would've paid $${l.max}.`;
    } else {
      const lowestLoser = beaten.length ? Math.min(...beaten.map((o) => o.price)) : null;
      const loserAtLow = beaten.find((o) => o.price === lowestLoser);
      if (loserAtLow && lowestLoser! > mine.price) {
        const gap = lowestLoser! - mine.price;
        headline = `You beat ${s.players[loserAtLow.player].name} by $${gap}. ${n === 1 ? '1 sold.' : `All ${n} sold.`}`;
      } else if (loserAtLow && lowestLoser === mine.price) {
        headline = `Tie at $${mine.price}. You win: ${tieShort(s, mine, loserAtLow)}.`;
      } else {
        headline = `Sold ${n} at $${mine.price}.`;
      }
    }
    if (mine.sold === mine.qty && sold < l.want) {
      detail = `${l.want - sold} more wanted: you had none left at that price.`;
    } else if (mine.sold === mine.qty && mine.qty < l.want) {
      const rest = winners.filter((o) => o.player !== viewer);
      if (rest.length) detail = `Right price, too few pieces: ${namesAnd(rest.map((o) => s.players[o.player].name), false)} sold ${l.want - mine.qty} more.`;
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
    const headline = `${who} undercut you by $${gap}.`;
    // Counterfactual: under every winning price puts the viewer first in line; matching the cheapest winner is a
    // tie, settled in the engine's tie order (see undercutWhatIf). It works from the cheapest winner, so that stall
    // is named with its price when it is not the one above.
    const lowest = Math.min(...winners.map((o) => o.price));
    const low = lowest < best.price ? ` and ${winners.filter((o) => o.price === lowest).map((o) => s.players[o.player].name).join(' and ')} $${lowest}` : '';
    const whatIf = undercutWhatIf(s, l, mine, lowest, viewer);
    const detail = `You $${mine.price}, ${who} $${best.price}${low}.${whatIf ? ` ${whatIf}` : ''}`;
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
      if (n > 0) detail = `$${lower} would've won it.${unsoldNote(unsold, n)}`;
    }
    return { showdown, tone: 'bad', headline: `Tie at $${mine.price}. ${nameVerb(s.players[tie.player].name, 'wins', 'win')}: ${tieShort(s, tie, mine)}.`, detail, tags };
  }
  return { showdown, tone: 'bad', headline: 'The order was filled before your turn.', tags };
}

// ---------- reactions ----------

/**
 * The rush pop-up's result line (PLAN-068): the same words for everyone at the table, naming the stalls, so every
 * player sees one story of each customer. A stall whose name is "You" (a solo game's default) takes the grammar of
 * "you": "You win", "beat you". Built from the line alone; card tags come from offerTag. The
 * personal what-if advice (explainLine's detail) is not shown here.
 */
export function rushLine(s: GameState, l: LineResult): LineStory {
  const NOBODY = -1;
  const tags = l.offers.map((o) => offerTag(s, l, o, NOBODY));
  // Rules 14: a standing order. Rules 18: only the holder delivers, at its bid (an Order Book adds $2 a piece). A full
  // delivery brings the stake back; otherwise the stake is lost and the rest of the order simply leaves.
  const ord = s.results?.order && s.results.order.name === l.name ? s.results.order : null;
  if (ord) {
    const who = s.players[ord.holder].name;
    const mine = ord.qty - ord.short;
    const pay = ord.sales[0]?.price ?? ord.price;
    return ord.short === 0
      ? { showdown: true, tone: 'neutral', headline: `${who} delivered all ${ord.qty} at $${pay}.`, detail: ord.stake ? `${nameVerb(who, 'gets', 'get')} the $${ord.stake} stake back.` : undefined, tags }
      : { showdown: true, tone: 'neutral', headline: `${who} delivered ${mine} of ${ord.qty}.`, detail: ord.stake ? `${nameVerb(who, 'loses', 'lose')} the $${ord.stake} stake.` : undefined, tags };
  }
  const cust = lookOf(l.name).title;
  const plural = FRUIT[l.fruit].plural.toLowerCase();
  const name = (o: Offer) => s.players[o.player].name;
  const winners = l.offers.filter((o) => o.sold > 0);
  const sold = winners.reduce((a, o) => a + o.sold, 0);
  const left = l.want - sold;
  const short = left > 0 && winners.length ? `${left} more wanted.` : undefined;
  if (!l.offers.length) return { showdown: false, tone: 'neutral', headline: `Nobody had ${plural} for ${cust}.`, tags };
  if (!winners.length) {
    const why = l.offers.map((o) => noSaleReason(s, l, o, NOBODY));
    const allPrice = why.every((x) => x.kind === 'price');
    return { showdown: true, tone: 'neutral', headline: allPrice ? `Every price was too high for ${cust}.` : `Nothing ${cust} would buy.`, detail: allPrice ? why[0].detail : undefined, tags };
  }
  if (winners.length > 1) {
    return { showdown: true, tone: 'neutral', headline: `${namesAnd(winners.map(name))} split the order: ${sold} sold.`, detail: short, tags };
  }
  const w = winners[0];
  const losers = l.offers.filter((o) => o !== w && inContest(o) && o.sold === 0);
  const tie = losers.find((o) => o.price === w.price);
  if (tie) return { showdown: true, tone: 'neutral', headline: `Tie at $${w.price}. ${nameVerb(name(w), 'wins', 'win')}: ${tieShort(s, w, tie)}.`, detail: short, tags };
  if (losers.length) {
    const next = losers.reduce((a, o) => (o.price < a.price ? o : a));
    return { showdown: true, tone: 'neutral', headline: `${name(w)} beat ${nameIn(name(next))} by $${next.price - w.price}. ${w.sold} sold.`, detail: short, tags };
  }
  const full = w.price >= l.max;
  return { showdown: true, tone: 'neutral', headline: full ? `${name(w)} sold ${w.sold} at full price.` : `${name(w)} sold ${w.sold} at $${w.price}.`, detail: short, tags };
}

// One plain line for each outcome (DEC-087). The audit would cut these altogether; the rush card (src/ui/game/rush.ts)
// still prints this answer in quotes for a customer no stall offered anything, so it must not be empty.
const HAPPY = ['Thanks.'];
const MEH = ['I wanted more.'];
const GONE = ['Nothing for me today.'];

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
  // Rules 18: stalls level on cash and fruit sold share a place (there is no seat-number tie-break).
  const rank = places(s)[viewer];
  const me = s.players[viewer].cash;
  const leader = order[0];
  if (rank === 1) {
    const second = order.find((i) => i !== viewer);
    const gap = second === undefined ? 0 : me - s.players[second].cash;
    return { rank, of: order.length, leader, gap, text: second === undefined ? 'Leading' : gap === 0 ? `Tied with ${s.players[second].name}` : `1st · $${gap} ahead of ${s.players[second].name}` };
  }
  const ahead = order[order.indexOf(viewer) - 1];
  const gap = s.players[ahead].cash - me;
  const ord = ['1st', '2nd', '3rd', '4th', '5th', '6th'][rank - 1];
  return { rank, of: order.length, leader, gap, text: `${ord} · $${gap} behind ${s.players[ahead].name}` };
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
 * The Evening panel's Heatwave warning, or null. A Heatwave ages fruit an extra step tonight on every shelf; no warning
 * on the final day, which no night follows. (`_p`: the shop; every shop is affected alike since rules 13 removed the
 * Cold Room.)
 */
export function heatwaveLine(s: GameState, _p: number): string | null {
  const extra = s.event?.ageExtra ?? 0;
  if (extra <= 0 || s.day >= s.config.days) return null;
  return `Heatwave: all fruit ages ${1 + extra} steps tonight.`;
}

/**
 * The morning card's overnight lines, in order: fruit lost, then what the Juice Bar made. One helper for both card
 * layouts (the phone brief and the full card), which each show the loss line today.
 */
export function overnightLines(lost: number, juice?: NightJuice): { text: string; tone: Tone }[] {
  const out: { text: string; tone: Tone }[] = [];
  if (lost > 0) out.push({ tone: 'bad', text: `${lost} of your pieces spoiled overnight.` });
  if (juice && juice.pieces > 0) out.push({ tone: 'good', text: `Your Juice Bar made $${juice.dollars} overnight.` });
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
        morning: `Closing Day: the jam maker pays $${JAM_PRICE} for each ripe piece you have left tonight.`,
        chip: `${all > ripe ? 'Ripe leftovers' : 'Leftovers'} = $${JAM_PRICE} each`, stocking, each: JAM_PRICE,
      };
    }
    if (all > 0) {
      return {
        morning: 'Green fruit left tonight is worth $0: the jam maker buys ripe fruit only.',
        chip: 'Unsold = $0', stocking: 'Closing Day: Green fruit left tonight is worth $0. The jam maker buys ripe fruit only.', each: 0,
      };
    }
    return { morning: null, chip: null, stocking, each: 0 };
  }
  return {
    morning: all > 0 ? 'Last day: anything unsold tonight is worth $0.' : null,
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
