// The stamp book (PLAN-086, DEC-099; progression study, review-18, C1 to C4): stamps fill a card, a full card raises
// your stall level by one, thirty cards make the book, and every five levels is a rank. No screen code here.
//
// Nothing in this file is stored. The stamps, the level and the rank are worked out from what the phone already keeps
// (games finished, wins, Daily market dates, trophy tiers and a few plain counts), so two phones can never disagree and
// a player who had trophies before the stamp book opens it to find the stamps they are worth.
import { CARDS, TIER_NAME, nextStep, standing, stepValue, tierById, type Card, type Facts, type Snapshot, type Step, type Tier } from './achievements';

// ---------- what earns stamps (C2) ----------

/** A finished game pays 1 stamp for every 3 days played: Quick 2, Standard 3, Long 4. */
export const DAYS_A_STAMP = 3;
export const gameStamps = (days: number): number => Math.floor(days / DAYS_A_STAMP);
/** A win (a shared win counts) pays 1 more. */
export const WIN_STAMPS = 1;
/** The Daily market pays 2 more, the first time it is finished each day. */
export const DAILY_STAMPS = 2;
/** A trophy tier pays once. */
export const TIER_STAMPS: Record<Tier, number> = { bronze: 2, silver: 5, gold: 10 };
/** A game finished before lengths were counted is taken as a Standard game. */
export const OLD_GAME_DAYS = 10;

// ---------- ranks and cards (C3) ----------

export interface Rank { name: string; from: number; to: number; /** Stamps to fill one card. */ card: number }
export const RANKS: Rank[] = [
  { name: 'Roadside Table', from: 1, to: 5, card: 15 },
  { name: 'Five-Foot Way', from: 6, to: 10, card: 25 },
  { name: 'Covered Stall', from: 11, to: 15, card: 40 },
  { name: 'Corner Lot', from: 16, to: 20, card: 60 },
  { name: 'Shophouse', from: 21, to: 25, card: 80 },
  { name: 'Towkay', from: 26, to: 30, card: 100 },
];
export const MAX_LEVEL = 30;
export const rankIndex = (level: number): number => Math.min(RANKS.length - 1, Math.max(0, Math.floor((level - 1) / 5)));
export const rankOf = (level: number): Rank => RANKS[rankIndex(level)];
/** Stamps on the card of a level. */
export const cardSize = (level: number): number => rankOf(level).card;
/** Stamps needed to reach a level (level 1 needs none). */
export function stampsToReach(level: number): number {
  let total = 0;
  for (let l = 1; l < Math.min(level, MAX_LEVEL + 1); l++) total += cardSize(l);
  return total;
}
/** The whole book. */
export const BOOK_STAMPS = stampsToReach(MAX_LEVEL + 1);

export interface Place {
  level: number; rank: Rank; rankNo: number;
  /** The card being filled: how many stamps it holds and how many are on it. */
  size: number; filled: number;
  /** Stamps still needed for the next level (0 at level 30 with its card full). */
  toNext: number;
  /** All thirty cards are full. */
  full: boolean;
}

/** Where a number of stamps puts a stall. */
export function placeAt(stamps: number): Place {
  const total = Math.max(0, Math.floor(stamps));
  let level = 1;
  let left = total;
  while (level < MAX_LEVEL && left >= cardSize(level)) { left -= cardSize(level); level++; }
  const size = cardSize(level);
  const filled = Math.min(left, size);
  return { level, rank: rankOf(level), rankNo: rankIndex(level) + 1, size, filled, toNext: size - filled, full: total >= BOOK_STAMPS };
}

// ---------- rewards (C3) ----------

/** What a level hands over. `looks`: the looks it gives (src/net/looks.ts); none yet means it comes with a later release. */
export interface Reward { level: number; text: string; looks: string[] }
export const REWARDS: Reward[] = [
  { level: 2, text: 'Chalk-slate price tag', looks: ['tag_chalk'] },
  { level: 3, text: 'Bicycle bell', looks: ['bell_bicycle'] },
  { level: 4, text: 'Coin-jar sound', looks: ['coin_jar'] },
  { level: 5, text: 'Star price card', looks: ['tag_star'] },
  { level: 6, text: 'Title and Painted-board frame', looks: ['title_rank2', 'frame_painted'] },
  { level: 7, text: 'Counter bell', looks: ['bell_counter'] },
  { level: 8, text: 'Hand-written price card', looks: ['tag_hand'] },
  { level: 9, text: 'Abacus coin sound', looks: ['coin_abacus'] },
  { level: 10, text: '"Sold out" stamp', looks: ['stamp_soldout'] },
  { level: 11, text: 'Title and Lantern-string frame', looks: ['title_rank3', 'frame_lantern'] },
  { level: 12, text: 'Lorry card back', looks: [] },
  { level: 13, text: 'Event card back', looks: [] },
  { level: 14, text: 'Favour card back', looks: [] },
  { level: 15, text: 'Lantern-light table', looks: [] },
  { level: 16, text: 'Title and Brass-plate frame', looks: ['title_rank4', 'frame_brass'] },
  { level: 17, text: 'Upgrade card back', looks: [] },
  { level: 18, text: 'Shopkeeper card back', looks: [] },
  { level: 19, text: 'Standing-order card back', looks: [] },
  { level: 20, text: 'Monsoon table', looks: [] },
  { level: 21, text: 'Title and Carved-wood frame', looks: ['title_rank5', 'frame_carved'] },
  { level: 22, text: 'School bell', looks: [] },
  { level: 23, text: 'Brass-clip price tag', looks: [] },
  { level: 24, text: 'Luggage-tag price tag', looks: [] },
  { level: 25, text: 'Festival table', looks: [] },
  { level: 26, text: 'Title and Gold-leaf frame', looks: ['title_rank6', 'frame_gold'] },
  { level: 27, text: 'Gong', looks: [] },
  { level: 28, text: 'Gold-foil card backs', looks: [] },
  { level: 29, text: 'Gold-edge stamp card', looks: [] },
  { level: 30, text: 'Gold-thread awning', looks: [] },
];
export const rewardAt = (level: number): Reward | undefined => REWARDS.find((r) => r.level === level);
/** A reward that is in the game now (the others are shown as "coming"). */
export const rewardBuilt = (r: Reward): boolean => r.looks.length > 0;

// ---------- the stamps a stall has ----------

export interface Stamps { total: number; games: number; wins: number; daily: number; tiers: number }

const GAME_KEY = /^g(\d{1,2})$/;
/** Stamps for a tier, by its code name (0 for a name that is not in the catalogue). */
export const tierStamps = (id: string): number => { const t = tierById(id); return t ? TIER_STAMPS[t.step.tier] : 0; };

/** Every stamp a stall has, from what is stored. */
export function stampsOf(s: Snapshot): Stamps {
  // Finished games by length (counts "g8", "g10", "g14"); games from before lengths were counted are Standard games.
  let counted = 0, games = 0;
  for (const [key, num] of Object.entries(s.counts)) {
    const m = GAME_KEY.exec(key);
    if (!m) continue;
    counted += num;
    games += num * gameStamps(Number(m[1]));
  }
  games += Math.max(0, s.stats.played - counted) * gameStamps(OLD_GAME_DAYS);
  const wins = (s.stats.wins ?? 0) * WIN_STAMPS;
  const daily = Object.keys(s.daily).length * DAILY_STAMPS;
  const tiers = standing(s).reduce((a, id) => a + tierStamps(id), 0);
  return { total: games + wins + daily + tiers, games, wins, daily, tiers };
}

/** A stall's level and card, from what is stored. */
export const placeOf = (s: Snapshot): Place => placeAt(stampsOf(s).total);

// ---------- the results: what one game earned ----------

/** One line of "Stamps earned": the stamps, the words, and the tier when the line is a trophy tier. */
export interface EarnLine { stamps: number; text: string; tier?: Tier; id?: string }

/**
 * The lines for one finished game. `firstDaily`: this was the first Daily market finished for its date.
 * A first game can earn many tiers: the best three are listed and the rest are one line ("and 8 more").
 */
export function earnLines(f: Facts, opts: { daily: boolean; firstDaily: boolean; tiers: string[] }): EarnLine[] {
  const lines: EarnLine[] = [{ stamps: gameStamps(f.days), text: `${f.days} days played` }];
  if (f.won) lines.push({ stamps: WIN_STAMPS, text: 'The win' });
  if (opts.daily && opts.firstDaily) lines.push({ stamps: DAILY_STAMPS, text: 'The Daily market' });
  const order: Tier[] = ['gold', 'silver', 'bronze'];
  const tiers = opts.tiers.map((id) => tierById(id)).filter((t): t is NonNullable<typeof t> => !!t)
    .sort((a, b) => order.indexOf(a.step.tier) - order.indexOf(b.step.tier));
  const shown = tiers.length > 4 ? tiers.slice(0, 3) : tiers;
  // "Silver · Rosa, 3 wins": the number is added where the card counts something short to say
  const detail = (t: (typeof tiers)[number]) => (t.step.goal > 1 && !t.step.value && t.card.unit && t.card.unit.length <= 6 ? `, ${t.step.goal.toLocaleString('en-US')} ${t.card.unit}` : '');
  for (const t of shown) lines.push({ stamps: TIER_STAMPS[t.step.tier], text: `${TIER_NAME[t.step.tier]} · ${t.card.title}${detail(t)}`, tier: t.step.tier, id: t.step.id });
  const rest = tiers.slice(shown.length);
  if (rest.length) lines.push({ stamps: rest.reduce((a, t) => a + TIER_STAMPS[t.step.tier], 0), text: `and ${rest.length} more trophy tiers` });
  return lines.filter((l) => l.stamps > 0);
}

// ---------- what is next, and what is close ----------

/** "4 stamps to level 9" and what that level hands over. Null when the book is full. */
export function nextReward(p: Place): { stamps: number; level: number; reward?: Reward } | null {
  if (p.level >= MAX_LEVEL) return p.full ? null : { stamps: p.toNext, level: MAX_LEVEL + 1 };
  return { stamps: p.toNext, level: p.level + 1, reward: rewardAt(p.level + 1) };
}

/** A card with its next tier and how far along it is. */
export interface Goal { card: Card; step: Step; value: number; goal: number; /** 0 to 1 */ share: number; stamps: number }

/** Every card with a tier still to earn, nearest to done first. */
export function goals(s: Snapshot): Goal[] {
  const out: Goal[] = [];
  CARDS.forEach((card) => {
    const st = nextStep(card, s);
    if (!st) return;
    const value = Math.min(stepValue(card, st, s), st.goal);
    out.push({ card, step: st, value, goal: st.goal, share: st.goal > 0 ? value / st.goal : 0, stamps: TIER_STAMPS[st.tier] });
  });
  // Nearest first; among equals the one that pays more, then catalogue order (the sort is stable).
  return out.sort((a, b) => b.share - a.share || b.stamps - a.stamps);
}

/** "2 of 3 wins", "$52 of $70 in one day": how far along a counted tier is. */
export function progressWords(g: Pick<Goal, 'card' | 'value' | 'goal'>): string {
  const num = (v: number) => (g.card.money ? `$${v}` : v.toLocaleString('en-US'));
  return `${num(g.value)} of ${num(g.goal)}${g.card.unit ? ` ${g.card.unit}` : ''}`;
}

/** One "close" line on the results: what is nearly done, and what one more step gives. */
export interface CloseLine { title: string; sub: string; /** The shopkeeper to play as, when the line is about one. */ avatar?: string; name?: string }

const more = (g: Goal): string => {
  const left = g.goal - g.value;
  const what = g.card.money ? `$${left} more` : left === 1 ? 'One more' : `${left} more`;
  return `${what} for ${TIER_NAME[g.step.tier]}, +${g.stamps} stamps`;
};

/**
 * At most two "close" lines for the results, by what is nearest to done: the nearest card that is not a shopkeeper's,
 * then the nearest shopkeeper's card (the second button plays as that shopkeeper). `names`: display names for the
 * customers still to meet. `after`: the avatar just played, so a shopkeeper nobody has won with yet is the next one
 * round the table and not always the first.
 */
export function closeLines(s: Snapshot, names: (key: string) => string, missing: string[], after?: string): CloseLine[] {
  const all = goals(s);
  const lines: CloseLine[] = [];
  const other = all.find((g) => !g.card.avatar && g.goal > 1 && g.value > 0);
  if (other) {
    lines.push(other.card.id === 'customers' && missing.length > 0 && missing.length <= 3
      ? { title: `Customer book ${other.value} of ${other.goal}`, sub: `Not met: ${missing.map(names).join(', ')}` }
      : { title: `${other.card.title} · ${progressWords(other)}`, sub: more(other) });
  }
  const keepers = all.filter((g) => g.card.avatar);
  if (keepers.length) {
    const started = keepers.find((g) => g.value > 0);
    // Nobody part way: the next shopkeeper round the table after the one just played.
    const order = CARDS.filter((c) => c.avatar).map((c) => c.avatar);
    const from = after ? order.indexOf(after) : -1;
    const fresh = [...keepers].sort((a, b) => ((order.indexOf(a.card.avatar) - from - 1 + order.length) % order.length) - ((order.indexOf(b.card.avatar) - from - 1 + order.length) % order.length))[0];
    const k = started ?? fresh;
    lines.push({ title: `${k.card.title} · ${k.value} of ${k.goal} wins`, sub: more(k), avatar: k.card.avatar, name: k.card.title });
  }
  return lines.slice(0, 2);
}
