// PLAN-113: the price practice on the Quick match wait. A small puzzle on this phone only (nothing goes to the room):
// one real customer card, one line of it, and one rival stall's price. The answer follows the rush's own buying rule
// (RULES.md, "The bell" and "The rush"): a customer buys from the cheapest offer that is fresh enough for its price,
// and pays at most the card price for Fresh, $1 less for Okay and $2 less for Soft. Your pieces are always Fresh here,
// so the right price is the highest one that is still the cheapest fresh-enough offer. A tie is never the answer: who
// wins a tie depends on the pieces' age, the Haggler and the buying order, which the puzzle does not show.
import { CUSTOMER_CARDS, FRUIT, RIVALS, acceptsStage, lookOf, prefOf, type FruitId, type Pref, type Stage } from '../engine/data';
import { TIE_ORDER } from './rulesText';

export type Ripe = Exclude<Stage, 'unripe'>;
/** Dollars off the card price at each freshness (the same for every fruit: FRUIT[f].drop). */
export const STAGE_OFF: Record<Ripe, number> = { fresh: 0, okay: 1, notso: 2 };
export const STAGE_WORD: Record<Ripe, string> = { fresh: 'Fresh', okay: 'Okay', notso: 'Soft' };

/** What the rival stall shows in the puzzle. */
export type Kind = 'over' | 'undercut' | 'fresh';

export interface PracticeRound {
  /** The customer's key (its card); the name shown is lookOf(who).title. */
  who: string;
  fruit: FruitId;
  qty: number;
  /** The card price: the most the customer pays for a Fresh piece. */
  max: number;
  pref: Pref;
  rival: { name: string; avatar: string; price: number; stage: Ripe };
  kind: Kind;
  /** Three prices to choose from, lowest first. */
  options: number[];
  answer: number;
}

/** The most this customer pays for a piece at this freshness, or -1 if they will not take it at all. */
export function topPrice(pref: Pref, max: number, stage: Ripe): number {
  return acceptsStage(pref, stage) ? max - STAGE_OFF[stage] : -1;
}

/** Would the customer buy this offer at all (fresh enough, and at or under the top price for its freshness)? */
export function sells(pref: Pref, max: number, stage: Ripe, price: number): boolean {
  return price >= 1 && price <= topPrice(pref, max, stage);
}

/** The puzzle numbered `n` (any whole number: the wait shows 0, 1, 2 …). `mine` is your shopkeeper, who is never the
 *  rival. The same number always gives the same puzzle. */
export function practiceRound(n: number, mine = ''): PracticeRound {
  const k = Math.abs(Math.floor(n));
  // Customers whose line is worth $3 or more, so every price on the buttons is at least $1.
  const cards = CUSTOMER_CARDS.filter((c) => c.wants.some((w) => w.max >= 4));
  const card = cards[(k * 7 + 3) % cards.length];
  const lines = card.wants.filter((w) => w.max >= 4);
  const line = lines[k % lines.length];
  const rivals = RIVALS.filter((r) => r.avatar !== mine);
  const rv = rivals[(k * 3 + 1) % rivals.length];
  const pref = prefOf(card.name);
  const max = line.max;
  let kind: Kind = (['over', 'undercut', 'fresh'] as const)[k % 3];
  let stage: Ripe = 'fresh';
  let price = max + 1;
  if (kind === 'undercut') price = max - 1;
  if (kind === 'fresh') {
    // A piece the customer will not take at that price: an Okay piece for a Premium customer, a Soft one for an
    // Everyday customer, and for a Bargain customer (who takes anything) an Okay piece over its $1-lower top price.
    if (pref === 'premium') { stage = 'okay'; price = max - 2; }
    else if (pref === 'everyday') { stage = 'notso'; price = max - 3; }
    else { stage = 'okay'; price = max; }
    if (price < 1) { kind = 'over'; stage = 'fresh'; price = max + 1; }
  }
  const answer = sells(pref, max, stage, price) ? price - 1 : max;
  const options = kind === 'undercut' ? [answer - 1, answer, price] : [answer - 1, answer, answer + 1];
  return { who: card.name, fruit: line.fruit, qty: line.qty, max, pref, rival: { name: rv.name, avatar: rv.avatar, price, stage }, kind, options, answer };
}

const fruitWord = (f: FruitId, n: number) => (n === 1 ? FRUIT[f].name : FRUIT[f].plural).toLowerCase();

/** The question under the card: "Hadi Hammer wants 3 blueberries, up to $5. Saleh asks $6 for Fresh ones. Your price
 *  for Fresh?" */
export function practiceQuestion(r: PracticeRound): string {
  return `${lookOf(r.who).title} wants ${r.qty} ${fruitWord(r.fruit, r.qty)}, up to $${r.max}. `
    + `${r.rival.name} asks $${r.rival.price} for ${STAGE_WORD[r.rival.stage]} ones. Your price for Fresh?`;
}

/** Whether a price was the best one, and why, in a sentence or two. */
export function practiceVerdict(r: PracticeRound, price: number): { right: boolean; text: string } {
  const name = lookOf(r.who).title;
  const rv = r.rival;
  const rivalSells = sells(r.pref, r.max, rv.stage, rv.price);
  if (price > r.max) return { right: false, text: `$${price} is over ${name}'s top price of $${r.max}. No sale.` };
  if (rivalSells && price > rv.price) return { right: false, text: `${rv.name}'s $${rv.price} is cheaper, so ${name} buys there first.` };
  if (rivalSells && price === rv.price) {
    return { right: false, text: `A tie with ${rv.name}. Ties: ${TIE_ORDER}, so it may not sell.` };
  }
  if (price < r.answer) return { right: false, text: `$${price} sells, but $${r.answer} sells too and earns $${r.answer - price} more a piece.` };
  // price === r.answer
  if (r.kind === 'undercut') return { right: true, text: `Right. $${price} is just under ${rv.name}'s $${rv.price}, so you sell first.` };
  if (r.kind === 'over') return { right: true, text: `Right. ${rv.name} asks more than ${name} pays, so the top price of $${r.max} sells.` };
  return {
    right: true,
    text: acceptsStage(r.pref, rv.stage)
      ? `Right. An ${STAGE_WORD[rv.stage]} piece sells for $${topPrice(r.pref, r.max, rv.stage)} at most, so ${rv.name} cannot sell at $${rv.price}. $${r.max} sells.`
      : `Right. ${name} will not take ${STAGE_WORD[rv.stage]} fruit, so ${rv.name} cannot sell. $${r.max} sells.`,
  };
}
