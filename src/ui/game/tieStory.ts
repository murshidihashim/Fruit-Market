// The Favoured Trade question in words (rules 18; PLAN-085, the approved Favoured-Trade screen). After the flip every
// crate and every price is public, so everything here is read from what the whole table can see: who asks the same
// price, who sells first as things stand and why (the game's own tie order: Favoured Trade, the fresher piece, the
// Haggler, whoever bought earlier), and what today's rush gives the asked stall without the card and with it. The two
// outcomes are worked out by the game itself (decideTie on a copy), never guessed here. Nothing is changed.
import { FRUIT, type FruitId } from '../../engine/data';
import { decideTie, tiedPrices, type DayResult, type GameState, type Offer } from '../../engine/game';

/** "Rosa", "Rosa and Raj", "Rosa, Raj and Kiki". */
export const listOf = (xs: string[]): string => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export interface TieStory {
  /** "You and Farah both ask $5 for blueberries". */
  title: string;
  /** Who sells first as things stand and why, and what the card does. */
  why: string;
  /** What the rush gives the asked stall without the card and with it (only for the stall being asked). */
  without: string | null;
  with: string | null;
  /** Its other tied prices, when it has more than one. */
  also: string | null;
}

/** Today's rush as the game would play it if the asked stall answered this way (null when it cannot be worked out here). */
function rushIf(s: GameState, asked: number, play: boolean): DayResult | null {
  if (s.phase !== 'tie' || s.tieAsk?.[0] !== asked || !s.players[asked].favours.includes('favouredTrade')) return null;
  // In a stall's own view only the stall being asked is listed, so the answer leads straight to the rush.
  return decideTie({ ...s, tieAsk: [asked] }, asked, play).results;
}

/** Pieces of a fruit a stall sells in these results, to every customer together. */
const soldOf = (r: DayResult, p: number, f: FruitId): number =>
  r.lines.filter((l) => l.fruit === f).reduce((a, l) => a + (l.offers.find((o) => o.player === p)?.sold ?? 0), 0);

/** Why `first` is served before `second` at the same price, in the game's tie order. */
function firstBy(s: GameState, first: Offer, second: Offer): 'card' | 'fresher' | 'haggler' | 'order' {
  const a = s.players[first.player], b = s.players[second.player];
  if (a.favouredTrade !== b.favouredTrade) return 'card';
  if (first.freshness !== second.freshness) return 'fresher';
  if ((a.trait === 'haggler') !== (b.trait === 'haggler')) return 'haggler';
  return 'order';
}

/**
 * The question for stall `asked`, as stall `viewer` reads it. For the stall being asked it says what happens without
 * the card and with it; everyone else reads who is tied and that the stall is deciding.
 */
export function tieStory(s: GameState, asked: number, viewer: number): TieStory {
  const ties = tiedPrices(s, asked);
  const mine = asked === viewer;
  const name = (p: number, start = false) => (p === viewer ? (start ? 'You' : 'you') : s.players[p].name);
  const fruitOf = (f: FruitId) => FRUIT[f].plural.toLowerCase();
  const said = (t: (typeof ties)[number]) => `${listOf([name(asked, true), ...t.rivals.map((p) => name(p))])} ${t.rivals.length > 1 ? 'all' : 'both'} ask $${t.price} for ${fruitOf(t.fruit)}`;
  const t = ties[0];
  if (!t) return { title: `${name(asked, true)} ${mine ? 'hold' : 'holds'} Favoured Trade`, why: '', without: null, with: null, also: null };
  const also = ties.length > 1 ? `Also tied: ${ties.slice(1).map((x) => `${fruitOf(x.fruit)} at $${x.price} with ${listOf(x.rivals.map((p) => name(p)))}`).join('; ')}.` : null;
  if (!mine) {
    return { title: said(t), why: `${s.players[asked].name} holds Favoured Trade and is deciding whether to play it. With the card ${s.players[asked].name} sells first on every tied price today.`, without: null, with: null, also };
  }
  const keep = rushIf(s, asked, false);
  const play = rushIf(s, asked, true);
  const card = 'Play Favoured Trade and you sell first, on every tied price today.';
  if (!keep || !play) return { title: said(t), why: card, without: null, with: null, also };
  // The first customer who chooses between the tied stalls shows who sells first as things stand.
  const line = keep.lines.find((l) => l.fruit === t.fruit && l.offers.some((o) => o.player === asked && !o.tooOld) && l.offers.some((o) => t.rivals.includes(o.player) && !o.tooOld));
  let why = `No customer chooses between these ${fruitOf(t.fruit)} today.`;
  if (line) {
    const at = (p: number) => line.offers.findIndex((o) => o.player === p);
    const rival = t.rivals.filter((p) => at(p) >= 0 && !line.offers[at(p)].tooOld).sort((a, b) => at(a) - at(b))[0];
    const me = line.offers[at(asked)], them = line.offers[at(rival)];
    const rn = s.players[rival].name;
    if (at(rival) < at(asked)) {
      const by = firstBy(s, them, me);
      why = by === 'card' ? `${rn} played Favoured Trade, so ${rn} sells first.`
        : by === 'fresher' ? `${rn}'s ${fruitOf(t.fruit)} are fresher, so ${rn} sells first.`
        : by === 'haggler' ? `${rn} is the Haggler, so ${rn} sells first.`
        : `${rn} bought earlier today, so ${rn} sells first.`;
    } else {
      const by = firstBy(s, me, them);
      why = by === 'fresher' ? `Your ${fruitOf(t.fruit)} are fresher, so you sell first already.`
        : by === 'haggler' ? 'You are the Haggler, so you sell first already.'
        : 'You bought earlier today, so you sell first already.';
    }
  }
  const out = (r: DayResult) => {
    const rival = t.rivals[0];
    const pieces = (p: number) => `${soldOf(r, p, t.fruit)} of ${s.stalls[p]?.[t.fruit] ?? 0}`;
    return `${cap(name(asked))} sell ${pieces(asked)}. ${s.players[rival].name} sells ${pieces(rival)}. You take $${r.income[asked]} today.`;
  };
  return { title: said(t), why: `${why} ${card}`, without: out(keep), with: out(play), also };
}
