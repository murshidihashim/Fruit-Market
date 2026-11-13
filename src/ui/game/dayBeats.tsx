// The small beats of the morning, the standing-order bid and the evening (PLAN-084; flow study D3): coins at dawn for
// the $5 top-up and the inspector's fine, the bids turned over together with the winner's stake put on the order's
// card, a built upgrade travelling from its offer to the stall, and the Priority stall's mark going to the front of
// tomorrow's line. They only draw: the game has already made each change. What a beat is about to show is held back
// until it does (holdBack), so a number changes as its coin lifts off or lands and never before.
import { FAVOURS, ORDER_CARDS, UPGRADES, type FavourId, type UpgradeId } from '../../engine/data';
import type { GameState, Standing } from '../../engine/game';
import { Coin } from '../art';
import * as A from '../anim';
import { CardArt, ART_SIZE } from '../cards';
import { holdCash, payCash, takeCash } from '../cashShown';
import { upgradeArt, upgradeFocus } from '../deckArt';
import { fx } from '../fx';
import { Swatch } from '../ticket';

// ---------- coins ----------

/** At most this many coins travel for one payment (flow study D3). */
export const COINS = 5;

/** A sum shared out over the coins that carry it: $7 on five coins is 2, 2, 1, 1, 1. */
export function coinShares(amount: number, most = COINS): number[] {
  const n = Math.max(0, Math.min(Math.floor(amount), most));
  return Array.from({ length: n }, (_, k) => Math.floor(amount / n) + (k < amount % n ? 1 : 0));
}

/**
 * A payment as coins: they travel from one spot to another a little apart, each in FEEL.coin, flat along the table
 * (a stall's cash is in the top bar, so an arc would leave the screen). `onLift` and `onLand` are given each coin's
 * share, so a total can fall as its coins leave and climb as they arrive. With reduced motion, or when a spot is not
 * on the screen, nothing travels and every call is still made (the shared move's rule).
 */
export function coins(from: A.Spot, to: A.Spot, amount: number, o: { onLift?: (share: number) => void; onLand?: (share: number) => void; fade?: boolean } = {}): Promise<void> {
  return Promise.all(coinShares(amount).map((share, k) => A.fly(from, to, <Coin size={22} />, {
    duration: A.FEEL.coin, delay: k * A.BEAT.coins.gap, path: 'flat', fade: o.fade,
    onLift: () => o.onLift?.(share), onLand: () => o.onLand?.(share),
  }))).then(() => undefined);
}

// ---------- held back until its beat ----------

/** Marks on the page that keep a thing out of sight until its piece has landed (sheets.css reads them). */
const HOLD_MARK = 'fm-hold-mark';
const HOLD_FIRST = 'fm-hold-first';
const page = () => (typeof document === 'undefined' ? null : document.documentElement);
const keepBack = (cls: string, on: boolean) => page()?.classList.toggle(cls, on);

interface Armed { key: string; before: number[] }
/** The dawn that is about to be shown: the morning it belongs to and every stall's cash before it. */
let armed: Armed | null = null;
const morningKey = (s: GameState) => `${s.config.seed}:${s.day}`;

/** Every stall's cash as it was before dawn's fine and top-up (null when dawn changed nobody's cash). */
export function beforeDawn(s: GameState): number[] | null {
  const up = s.dayTopUps ?? [];
  const fine = s.dayFines ?? [];
  if (!s.players.some((_, i) => (up[i] ?? 0) > 0 || (fine[i] ?? 0) > 0)) return null;
  return s.players.map((pl, i) => pl.cash - (up[i] ?? 0) + (fine[i] ?? 0));
}

/**
 * The favour card stall `p` has just played, as the game says it aloud: everyone at a table sees which card is played
 * (only what Gossip or Scout shows stays secret), and the game writes it in its log ("Rosa played Gossip"). The hand
 * itself cannot tell: online a rival's cards reach this phone face down, as stand-ins (server/room.ts redact).
 * Null when no new log line names a card this stall played.
 */
export function playedFavour(prev: GameState, next: GameState, p: number): FavourId | null {
  return playedFavours(prev, next, p)[0] ?? null;
}

/** Every favour card stall `p` has played between two states, in the order the game said so. Rules 19: the computers'
 *  evening arrives as one step, in which a stall may play two cards (Priority and Gossip). */
export function playedFavours(prev: GameState, next: GameState, p: number): FavourId[] {
  const who = next.players[p]?.name;
  const ids = Object.keys(FAVOURS) as FavourId[];
  return next.log.slice(prev.log.length).map((l) => ids.find((id) => l === `${who} played ${FAVOURS[id].title}`)).filter((id): id is FavourId => !!id);
}

/** The upgrade the person has just asked to build, and where its offer lay on the screen (noted as Build is tapped). */
let offer: { p: number; u: UpgradeId; box: A.Box } | null = null;
export function noteOffer(p: number, u: UpgradeId, box: A.Box | null) { offer = box ? { p, u, box } : null; }

/** The standing order's bids on the table once they are in: face down ('in'), turned over ('up'), the stake on the card ('paid'). */
export interface OrderShow { order: Standing; stage: 'in' | 'up' | 'paid'; /** Who won, in the game's own words. */ text: string }

/**
 * The bids are in (the game has left the bidding step): the order as it now stands, to be shown turned over. When
 * nobody bid the order is gone from the game, so it is shown as it was, with every stall passed. The sentence is the
 * one the game writes in its log.
 */
export function bidsIn(prev: GameState, next: GameState): OrderShow | null {
  const was = prev.standing;
  if (prev.phase !== 'order' || next.phase === 'order' || next.day !== prev.day || !was) return null;
  const title = ORDER_CARDS[was.card].title;
  const now = next.standing && next.standing.card === was.card && next.standing.holder !== null ? next.standing : null;
  // The sentence is the game's own (its newest log line about this order), so the sheet and the log never disagree.
  const text = [...next.log].reverse().find((l) => l.includes(title)) ?? '';
  if (!now) return { order: { ...was, bids: was.bids.map(() => 'pass' as const) }, stage: 'in', text };
  return { order: now, stage: 'in', text };
}

/**
 * Called as the game moves from one state to the next, before the new state is drawn: what the coming beat will show
 * is held back at what it was. A new day: every total as it was before dawn (the morning sheet lets the coins go).
 * The bids are in: the winner's cash before its stake (returned: the bids to show, face down). An upgrade built:
 * the cash before its price, and for the person's own build the new mark on the shelf. Priority played: the mark at
 * the front of tomorrow's line.
 */
export function holdBack(prev: GameState, next: GameState): OrderShow | null {
  keepBack(HOLD_MARK, false);
  keepBack(HOLD_FIRST, false);
  const mine = offer;
  offer = null;
  armed = null;
  if (next.day !== prev.day) {
    const before = next.phase === 'morning' ? beforeDawn(next) : null;
    if (before) { armed = { key: morningKey(next), before }; holdCash(before); }
    return null;
  }
  const cash = () => holdCash(prev.players.map((pl) => pl.cash));
  const show = bidsIn(prev, next);
  if (show) { if ((show.order.staked ?? 0) > 0) cash(); return show; }
  // The evening, as it opens (rules 19: online the computers' choices arrive with it) or as a stall decides.
  if (next.phase !== 'evening' || (prev.phase !== 'evening' && prev.phase !== 'reveal')) return null;
  const built = next.players.some((pl, i) => pl.upgrades.length > prev.players[i].upgrades.length);
  if (built) cash();
  if (mine && next.players[mine.p]?.upgrades.includes(mine.u) && !prev.players[mine.p].upgrades.includes(mine.u)) { offer = mine; keepBack(HOLD_MARK, true); }
  if (firstMoved(prev, next)) keepBack(HOLD_FIRST, true);
  return null;
}

/** Rules 19: a Priority card played has changed who would buy first tomorrow (a later card from a stall earlier in
 *  today's line-up takes the front of the line; any other later card changes nothing there). */
export function firstMoved(prev: GameState, next: GameState): boolean {
  return next.priorityNext !== null && next.priorityNext !== prev.priorityNext && next.day === prev.day;
}

// ---------- the morning: coins at dawn ----------

/**
 * The morning sheet asks once, as it comes onto the table: the totals to show until dawn's coins have travelled
 * (null: nothing to show, or this is not the morning that was held back, such as a saved game opened on a morning).
 */
export function takeDawn(s: GameState): number[] | null {
  const mine = armed && s.phase === 'morning' && armed.key === morningKey(s) ? armed.before : null;
  armed = null;
  return mine;
}

/**
 * Dawn's coins, once the morning's news has been turned over: the inspector's fine leaves each fined stall, then the
 * market's top-up reaches each topped-up stall, and each total changes as its coins lift off or land. This stall's
 * coins travel between its cash and its line on the morning sheet. A rival's cash lies under the sheet, so its total
 * simply changes. `live`: false once the sheet has left; nothing more is started then.
 */
export async function dawnCoins(s: GameState, viewer: number, live: () => boolean): Promise<void> {
  const fines = s.dayFines ?? [];
  const ups = s.dayTopUps ?? [];
  await A.wait(A.BEAT.morning.newsTurn + A.BEAT.dawn.after);
  if (!live()) return;
  let rang = false;
  const ring = () => { if (!rang) { rang = true; fx.coin(); } };
  await Promise.all(s.players.map((_, i) => {
    if (!(fines[i] > 0)) return null;
    if (i !== viewer) return takeCash(i, fines[i]);
    return coins(`p${i}-cash`, `dawn-fine-${i}`, fines[i], { fade: true, onLift: (share) => { ring(); void takeCash(i, share); } });
  }));
  if (!live()) return;
  rang = false;
  await Promise.all(s.players.map((_, i) => {
    if (!(ups[i] > 0)) return null;
    if (i !== viewer) return payCash(i, ups[i]);
    return coins(`dawn-up-${i}`, `p${i}-cash`, ups[i], { onLand: (share) => { ring(); void payCash(i, share); } });
  }));
}

// ---------- the standing order: the bids turned over ----------

/**
 * The bids are in. They lie face down for a breath, are turned over together, and the winner is shown; then the
 * winner's stake travels from its cash onto the order's card and its total falls as the coins leave. Your own cash is
 * in the top bar; a rival's lies under the sheet, so its coins leave from its place among the bidders. Every pause to
 * read is kept with reduced motion. `set(null)` takes the sheet off the table at the end.
 */
export async function bidsTurned(show: OrderShow, viewer: number, set: (s: OrderShow | null) => void): Promise<void> {
  const o = show.order;
  try {
    await A.wait(A.BEAT.order.down);
    set({ ...show, stage: 'up' });
    fx.card();
    await A.wait(A.FEEL.turn);
    await A.hold(A.BEAT.order.read);
    const staked = o.staked ?? 0;
    if (o.holder !== null && staked > 0) {
      const p = o.holder;
      let rang = false;
      await coins(p === viewer ? `p${p}-cash` : [`ob-p${p}`, `p${p}-cash`], 'order-stake', staked, {
        onLift: (share) => { if (!rang) { rang = true; fx.coin(); } void takeCash(p, share); },
      });
      set({ ...show, stage: 'paid' });
    }
    await A.hold(A.BEAT.order.after);
  } finally {
    set(null);
  }
}

// ---------- the evening: an upgrade built, Priority played ----------

/** A spot that is not drawn: a place on the screen for a piece to leave from, after the thing that lay there has gone. */
function ghostSpot(box: A.Box): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const el = document.createElement('i');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = `position:fixed;left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px;visibility:hidden;pointer-events:none`;
  document.body.appendChild(el);
  return el;
}

/**
 * An upgrade has been built by stall `p`. Its price leaves the stall's cash as coins that travel to the market, the
 * total falling as they lift. The person's own build is also seen arriving: the card travels from where its offer lay
 * to the stall, and its mark shows on the shelf dock as it lands. The label over the stall stays until the pieces
 * have landed and a moment more; with reduced motion nothing travels and the label is held for a pause to read.
 */
export async function built(p: number, u: UpgradeId, also = ''): Promise<void> {
  const d = UPGRADES[u];
  const from = offer && offer.p === p && offer.u === u ? ghostSpot(offer.box) : null;
  offer = null;
  // `also`: the favour cards the stall played in the same step (rules 19: a computer's whole evening is one step), named
  // on the same label, so each stall has one label.
  const label = A.tag(`p${p}`, `${also ? `${also} · ` : ''}Built: ${d.title}`, 'upgrade');
  let rang = false;
  const jobs: Promise<void>[] = [
    coins(`p${p}-cash`, 'truck', d.cost, { fade: true, onLift: (share) => { if (!rang) { rang = true; fx.coin(); } void takeCash(p, share); } }),
  ];
  try {
    if (from) {
      const mark = document.querySelector(`[data-a="p${p}"] .tk-dock-marks > span:last-child`);
      jobs.push(A.fly(from, mark ?? `p${p}`, (
        <span class="fm-upcard"><CardArt class="fm-upcard-pic" src={upgradeArt(u)} alt="" w={ART_SIZE.small[0]} h={ART_SIZE.small[1]} eager focus={upgradeFocus(u)} /><b>{d.title}</b></span>
      ), { duration: A.FEEL.travel, path: 'low', endScale: 0.35, onLand: () => keepBack(HOLD_MARK, false) }));
    }
    await Promise.all(jobs);
    await A.hold(A.isReduced() ? A.BEAT.label.read : A.BEAT.evening.seen);
  } finally {
    keepBack(HOLD_MARK, false);
    from?.remove();
    label.remove();
  }
}

/**
 * Priority has been played by stall `p`: its mark (the stall's pattern and face) travels from the stall to the front
 * of tomorrow's line, in the Tomorrow strip, where it stays for the evening.
 */
export async function firstInLine(s: GameState, p: number): Promise<void> {
  const pl = s.players[p];
  try {
    const from = typeof document === 'undefined' ? null : document.querySelector(`[data-a="p${p}"] .tk-swatch`);
    await A.fly(from ?? `p${p}`, 'tm-first', <Swatch p={p} who={pl.avatar} look={pl.look} size={26} />, { duration: A.FEEL.travel, path: 'flat', onLand: () => keepBack(HOLD_FIRST, false) });
  } finally {
    keepBack(HOLD_FIRST, false);
  }
}
