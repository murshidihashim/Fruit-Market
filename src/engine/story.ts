// Presentation-only storytelling: turns the rules engine's results into short explanations,
// reactions and highlights. Nothing here changes game state or re-implements pricing; every
// sentence is derived from the recorded offers (price, units, sold, freshness) and the rules
// the engine used to sort them (cheapest first, then fresher fruit, then Favoured Trade, then turn order).

import { FRUIT, FRUITS, RIVALS, lookOf, type FruitId } from './data';
import { minPrice, ranking, type GameState, type LineResult, type Offer } from './game';

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

function hash(...xs: number[]): number {
  let h = 2166136261;
  for (const x of xs) { h ^= x & 0xffff; h = Math.imul(h, 16777619); h ^= x >>> 16; h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Why the winner beat this offer on a tie, following the engine's tie-break order. */
function tieReason(s: GameState, winner: Offer, loser: Offer, viewer: number): string {
  if (winner.freshness > loser.freshness) return `${possessive(s, winner.player, viewer)} fruit was fresher`;
  if (s.players[winner.player].favouredTrade && !s.players[loser.player].favouredTrade) return `${nameOf(s, winner.player, viewer)} played Favoured Trade`;
  return `${nameOf(s, winner.player, viewer)} went earlier in turn order`;
}

function offerTag(s: GameState, l: LineResult, o: Offer, viewer: number): string {
  if (o.sold >= o.qty) return o.qty > 1 ? `SOLD ×${o.sold}` : 'SOLD';
  if (o.sold > 0) return `sold ${o.sold} of ${o.qty}`;
  const cheaper = l.offers.filter((w) => w.sold > 0 && w.price < o.price);
  if (cheaper.length) return `$${o.price - Math.max(...cheaper.map((w) => w.price))} too high`;
  const tie = l.offers.find((w) => w.sold > 0 && w.price === o.price);
  if (tie) return tie.freshness > o.freshness ? 'lost tie: fresher won' : 'lost tie';
  void viewer;
  return 'order already filled';
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
    if (!top) return { showdown, tone: 'neutral', headline: `${cust} found every price too high.`, tags };
    const losers = others.filter((o) => o.sold === 0);
    const headline = losers.length
      ? `${s.players[top.player].name} beat ${losers.map((o) => s.players[o.player].name).join(' and ')} at $${top.price}.`
      : `${s.players[top.player].name} sold ${top.sold} ${fruitWord(l.fruit, top.sold)} to ${cust} at $${top.price}.`;
    return { showdown, tone: 'neutral', headline, tags };
  }

  // The viewer made an offer.
  const rivals = others;
  if (mine.sold > 0) {
    const n = mine.sold;
    const beaten = rivals.filter((o) => o.sold === 0 || o.sold < o.qty);
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
  const cheaper = winners.filter((o) => o.price < mine.price);
  if (cheaper.length) {
    const best = cheaper.reduce((a, o) => (o.price > a.price ? o : a));
    const gap = mine.price - best.price;
    const who = s.players[best.player].name;
    const headline = gap === 1 ? `${who} undercut you by $1 and stole the sale!` : `${who} undercut you by $${gap}.`;
    // Verified counterfactual: one dollar under every winning price puts the viewer first in line,
    // so they would sell min(offered, wanted) — as long as the event's minimum price allows it.
    const lowest = Math.min(...winners.map((o) => o.price));
    const at = lowest - 1;
    const floor = Math.max(1, minPrice(s, l.fruit));
    const detail = at >= floor
      ? `You charged $${mine.price}, ${who} charged $${best.price}. At $${at} you'd have sold ${Math.min(mine.qty, l.want)}.`
      : `You charged $${mine.price}, ${who} charged $${best.price}. You couldn't go lower than $${floor}.`;
    return { showdown, tone: 'bad', headline, detail, tags };
  }
  const tie = winners.find((o) => o.price === mine.price);
  if (tie) {
    const floor = Math.max(1, minPrice(s, l.fruit));
    const detail = mine.price - 1 >= floor ? `$${mine.price - 1} would have won it.` : undefined;
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
    if (mine && o.sold > 0 && mine.sold === 0 && mine.price - o.price <= 2 && mine.price > o.price) return pick(o.player, lines.undercut);
    if (mine && o.sold === 0 && mine.sold > 0 && (o.price - mine.price <= 1)) return pick(o.player, lines.stung);
  }
  for (const o of l.offers) {
    const lines = linesOf(o.player);
    if (s.players[o.player].kind !== 'ai' || !lines) continue;
    if (o.sold > 0 && o.price >= l.max && l.offers.length > 1) return pick(o.player, lines.fullPrice);
    if (mine && o.sold === 0 && mine.sold > 0 && o.price - mine.price >= 2) return pick(o.player, lines.lost);
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
      for (const o of l.offers) if (o.player !== viewer && o.sold === 0) beat.set(o.player, (beat.get(o.player) ?? 0) + 1);
    } else {
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
  // Fruit that spoils tonight if the game goes on.
  if (s.day < s.config.days) {
    const rot = FRUITS.reduce((a, f) => a + s.players[viewer].stock[f][0], 0);
    if (rot >= 2) out.push({ icon: '🗑️', tone: 'bad', score: 20 + rot * 6, text: `${rot} of your fruit will spoil tonight.` });
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
        if (mine.sold > 0 && o.sold === 0) e.won++;
        if (mine.sold === 0 && o.sold > 0) {
          e.lost++;
          const gap = mine.price - o.price;
          const lost = Math.min(mine.qty, l.want) * o.price;
          if (gap >= 0 && (!miss || lost > miss.lost)) miss = { lost, day: d.day, who: s.players[o.player].name, gap };
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
  const unsold = FRUITS.reduce((a, f) => a + s.players[viewer].stock[f].reduce((x, y) => x + y, 0), 0);
  if (s.phase === 'over' && unsold > 0) worst.push({ score: unsold, text: `${unsold} fruit left unsold at closing (worth $0).` });
  return { best: best.slice(0, 3).map((x) => x.text), worst: worst.sort((a, b) => b.score - a.score).slice(0, 2).map((x) => x.text) };
}
