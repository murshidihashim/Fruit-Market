// Pure helpers for the table (PLAN-085): where the lorry puts its crates, what tonight does to each piece on a shelf,
// who is buying and who is waiting. Kept free of Preact so they can be unit-tested against the engine's rules.
import { FRUIT, JUICE_CAP, TRAITS, deliveryPos, freshPos, stageAt, type FruitId, type Stage } from '../engine/data';
import { shadePick, type Customer, type GameState, type Stock } from '../engine/game';
import { LANES, todaysLorry } from './boardModel';

// ---------- the lorry ----------

/** One crate the lorry unloads: `n` pieces of a fruit into one box of its lane. */
export interface CrateDrop { f: FruitId; pos: number; n: number; stage: Stage }

/**
 * Where today's lorry put its load, one crate for each box it filled, in lane order: the Green box for fruit that
 * arrives green, the freshest Okay box for the Seconds Lorry, the Fresh box otherwise and for an event's extra ripe
 * pieces (Mango Windfall). The game keeps what was unloaded, not the card, so the Seconds Lorry is known from the card
 * when it can be told (boardModel.todaysLorry) and from the lanes when it cannot: a load that is not in the Fresh box
 * went into the Okay box.
 */
export function deliveryBoxes(s: GameState): CrateDrop[] {
  if (s.event?.noDelivery) return [];
  const card = todaysLorry(s);
  const out: CrateDrop[] = [];
  for (const f of LANES) {
    const n = s.delivery?.[f] ?? 0;
    if (n <= 0) continue;
    const ripe = Math.min(n, s.deliveryRipe?.[f] ?? 0);
    const fresh = freshPos(f);
    const okay = FRUIT[f].ripe.lastIndexOf('okay');
    const pos = s.deliveryUnripe === f ? s.market[f].length - 1
      : card ? deliveryPos(card, f)
      : (s.market[f][fresh] ?? 0) >= n || okay < 0 ? fresh : okay;
    if (n - ripe > 0) out.push({ f, pos, n: n - ripe, stage: stageAt(f, pos) });
    if (ripe > 0) out.push({ f, pos: fresh, n: ripe, stage: stageAt(f, fresh) });
  }
  return out;
}

/** The market as it stood before today's lorry unloaded: what the lanes show until the crates land. */
export function marketBefore(s: GameState): Stock {
  const out = Object.fromEntries(LANES.map((f) => [f, [...s.market[f]]])) as Stock;
  for (const c of deliveryBoxes(s)) out[c.f][c.pos] = Math.max(0, (out[c.f][c.pos] ?? 0) - c.n);
  return out;
}

// ---------- your shelf: what tonight does to each piece ----------

/** Boxes every piece slides tonight: one; two in a Heatwave; none in a Monsoon. */
export const nightSteps = (s: GameState): number => Math.max(0, 1 + (s.event?.ageExtra ?? 0));

/** The fruit a stall's Shade Cloth keeps tonight (the game's own pick until the person has chosen), or null. */
export function shadeOf(s: GameState, p: number): FruitId | null {
  const pl = s.players[p];
  if (!pl || pl.trait !== 'keeper') return null;
  return pl.shade === undefined ? shadePick(s, p) : pl.shade ?? null;
}

/** Does a night follow today? Not after the final day. */
export const nightFollows = (s: GameState): boolean => s.phase !== 'over' && s.day < s.config.days;

const WORD: Record<Stage, string> = { unripe: 'green', fresh: 'Fresh', okay: 'Okay', notso: 'Soft' };

/** How a chip is tinted: plain, good news (ripe tomorrow, juice), a warning (spoils tonight). */
export type ChipTone = 'plain' | 'good' | 'warn';

/** Pieces of one fruit on a shelf that share a box letter and a fate tonight. */
export interface ShelfChip {
  f: FruitId; stage: Stage; n: number;
  /** The words on the chip: "Okay tomorrow", "ripe tomorrow", "spoils tonight", "stays Fresh". */
  words: string;
  /** The box letter the pieces carry tomorrow (null: they are gone, or no night follows). */
  next: Stage | null;
  /** The pieces leave the shelf tonight (spoiled or juiced). */
  gone: boolean;
  tone: ChipTone;
}

/**
 * A shelf as chips, in the board's lane order, the freshest first: for each fruit, its pieces grouped by box letter
 * and by what tonight does to them, by the night's own rules (one box older; two in a Heatwave; none in a Monsoon or
 * for the Shade Cloth fruit; a Juice Bar juices the first pieces that would spoil, fruit by fruit, as the night does).
 * On the final day no night follows and a chip says only how fresh its pieces are.
 */
export function shelfChips(s: GameState, p: number, stock: Stock = s.players[p].stock): { f: FruitId; chips: ShelfChip[] }[] {
  const pl = s.players[p];
  const night = nightFollows(s);
  const steps = nightSteps(s);
  const shade = shadeOf(s, p);
  const stepsOf = (f: FruitId) => (shade === f ? 0 : steps);
  const leaving = (f: FruitId) => stock[f].reduce((a, n, pos) => a + (pos < stepsOf(f) ? n : 0), 0);
  // The juice comes from the first pieces leaving, fruit by fruit in the game's own order (the night counts how many).
  let juice = night && pl.upgrades.includes('juicebar') ? Math.min(JUICE_CAP, (Object.keys(stock) as FruitId[]).reduce((a, f) => a + leaving(f), 0)) : 0;
  const juiced = {} as Record<FruitId, number>;
  for (const f of Object.keys(stock) as FruitId[]) { juiced[f] = Math.min(juice, night ? leaving(f) : 0); juice -= juiced[f]; }
  return LANES.map((f) => {
    const chips: ShelfChip[] = [];
    const add = (c: ShelfChip) => {
      const last = chips[chips.length - 1];
      // pieces share a chip only when they also carry the same letter tomorrow (two green pieces can ripen into
      // different boxes on a Heatwave night)
      if (last && last.stage === c.stage && last.words === c.words && last.next === c.next) last.n += c.n;
      else if (c.n > 0) chips.push(c);
    };
    let toJuice = juiced[f];
    for (let pos = stock[f].length - 1; pos >= 0; pos--) {
      const n = stock[f][pos];
      if (n <= 0) continue;
      const stage = stageAt(f, pos);
      if (!night) { add({ f, stage, n, words: WORD[stage], next: null, gone: false, tone: 'plain' }); continue; }
      const st = stepsOf(f);
      const to = pos - st;
      if (st === 0) add({ f, stage, n, words: `stays ${WORD[stage]}`, next: stage, gone: false, tone: 'plain' });
      else if (to < 0) {
        // the oldest pieces are juiced first; the list runs freshest first, so the juice is kept for the last boxes
        const below = stock[f].slice(0, pos).reduce((a, x) => a + x, 0);
        const j = Math.max(0, Math.min(n, toJuice - below));
        toJuice -= j;
        add({ f, stage, n: n - j, words: 'spoils tonight', next: null, gone: true, tone: 'warn' });
        add({ f, stage, n: j, words: 'juice tonight', next: null, gone: true, tone: 'good' });
      } else {
        const next = stageAt(f, to);
        const ripens = stage === 'unripe' && next !== 'unripe';
        add({ f, stage, n, words: ripens ? 'ripe tomorrow' : `${WORD[next]} tomorrow`, next, gone: false, tone: ripens ? 'good' : 'plain' });
      }
    }
    return { f, chips };
  });
}

/** The words beside "Your shelf": what the chips are about. Null on the final day (no night follows). */
export function tonightHead(s: GameState, p: number): string | null {
  if (!nightFollows(s)) return null;
  const shade = shadeOf(s, p);
  const event = s.event && (s.event.ageExtra ?? 0) !== 0 ? `After tonight's ${s.event.title}` : 'After tonight';
  return shade ? `${event} · ${TRAITS.keeper.title} on ${FRUIT[shade].plural.toLowerCase()}` : event;
}

// ---------- the stalls, in buying order ----------

/** Where a stall is in today's buying: it has bought, it is buying now, or it is waiting for its turn. */
export type BuyState = 'done' | 'now' | 'waiting';
export function buyState(s: GameState, p: number): BuyState {
  if (s.phase !== 'buy') return 'waiting';
  const at = s.order.indexOf(p);
  return at < s.turn ? 'done' : at === s.turn ? 'now' : 'waiting';
}

// ---------- the customer row ----------

/** The most fruit rows on any of today's tickets (never under two), so the row keeps one height all day. */
export function ticketLines(cards: (Pick<Customer, 'wants'> | null | undefined)[]): number {
  return Math.max(2, ...cards.map((c) => c?.wants.length ?? 0));
}
