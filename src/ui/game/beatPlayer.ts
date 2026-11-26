// The beat a new state of the game plays on the table (delivery, buying, the bell and the rush, a Favoured Trade
// answer, the night), in the order the table shows it. Called by the turn driver (turnDriver.ts) for each step; the
// animations themselves are in animator.tsx and dayBeats.tsx.
import { publicView, type GameState } from '../../engine/game';
import { overnightJuice, overnightLoss, type NightJuice } from '../../engine/story';
import * as A from '../anim';
import { holdCash } from '../cashShown';
import { holdStock } from '../stockShown';
import { holdRush } from '../rushShown';
import { holdBuyer } from '../tableShown';
import { arrive, arriving, bellRings, dealsOf, delivery, holdArrival, holdDeals, holdDelivery, moves, nightfall, reveal, tieAnswer, tieFrom, tiePlayed, type BellShow, type NightSlide } from './animator';
import { bidsTurned, firstToken, holdBack, holdFirstToken, rowAppears, type OrderShow } from './dayBeats';
import type { ShowState } from './rush';
import { cashBeforeRush, type StepKind } from './stepKind';

/** What a beat draws on the table as it plays (the game screen's state). */
export interface BeatScreen {
  /** The stall the table is drawn for. */
  viewer: number;
  /** Offline, two or more people at one phone. */
  shared: boolean;
  setNight(on: boolean): void;
  setNightSlide(slide: NightSlide): void;
  setLastNight(lost: number): void;
  setLastJuice(juice: NightJuice): void;
  setRevealDone(done: boolean): void;
  setOrderShow(show: OrderShow | null): void;
  setBell(open: BellShow): void;
  setShow(show: ShowState | null): void;
}

/**
 * The bell as the table shows it (rules 15; PLAN-085): how many rows have turned face up so far, null when it is not
 * ringing. It has its own sound (PLAN-086), the one this player has on, heard on this phone only: it sounds once, as
 * the bell starts to ring (the first time it shows anything), and is ready again once the bell is put away. The day it
 * rang is noted: from then until the takings the crates stay open.
 */
export class Bell {
  /** The bell is showing. */
  up = false;
  /** The day on which the bell last rang on this table. */
  rangOn = 0;
  constructor(private draw: (open: BellShow) => void, private day: () => number, private sound: () => void) {}
  readonly set = (open: BellShow) => {
    if (open !== null && !this.up) this.sound();
    if (open !== null) this.rangOn = this.day();
    this.up = open !== null;
    this.draw(open);
  };
}

/** What is held back for the beat and what it plays from: found before the new state is drawn. */
interface Held {
  turned: OrderShow | null;
  tied: { p: number; played: boolean } | null;
  cardFrom: A.Box | null;
  walkIns: number[];
}

/**
 * Holds back what the coming beat will show (PLAN-084, PLAN-085): every total before the rush's coins land, the shelves
 * and tickets until each customer is served, the standing order's bids until they are turned over, the lanes before
 * today's crates land, a box's number until its piece lifts off, the stall buying until its pieces have landed, and
 * the walk-ins face down until their cards are turned.
 */
function holdFor(prev: GameState, next: GameState, kind: StepKind, ui: BeatScreen): Held {
  const { rush, flip, toBuy, buyer } = kind;
  // The game has already paid every sale. Show each total as it was before the rush; the sales add up as the coins land.
  // A standing order's stake has come back too (rules 18): it shows only once the rush is over.
  if (rush && next.results) holdCash(cashBeforeRush(next));
  // The shelves likewise: each customer's pieces leave the shelf as they are served, at every speed and with
  // reduced motion too (PLAN-084: the final shelves used to show at the bell then). So do the customers' tickets
  // and a favour card won in the rush (rushShown.ts): a ticket is ticked and the card appears with its customer.
  if (rush && next.results) holdStock(prev.players.map((pl) => pl.stock), next.players.map((pl) => pl.stock));
  if (rush && next.results) holdRush(next.results, next.players.length);
  // The day's takings must not show before the rush has played: the card of an earlier day would otherwise be drawn
  // for a moment with today's results on it, ahead of the bell.
  if (rush) ui.setRevealDone(false);
  // Every total before dawn's fine and top-up, the winner's cash before a standing order's stake, an upgrade's price
  // and its mark. When the bids for a standing order are in, they stay on the table to be turned over.
  const turned = holdBack(prev, next);
  if (turned) ui.setOrderShow(turned);
  // A Favoured Trade answer (PLAN-085): where the card lies is noted before the question leaves the table.
  const tied = tieAnswer(prev, next);
  const cardFrom = tied ? tieFrom(tied, ui.viewer) : null;
  // The flip before a Favoured Trade question: the bell is set ringing together with the new state, so the rows are
  // drawn shut from their first frame. With reduced motion they are open at once, as the bell's script shows them.
  if (flip) ui.setBell(A.isReduced() ? next.players.length : 0);
  if (toBuy) holdDelivery(next);
  // PLAN-104: as buying starts and the stalls' row is seen for the day, the First token waits where it lay until its
  // beat (rowAppears is a case of toBuy).
  holdFirstToken(prev, next);
  holdDeals(prev, next, ui.viewer);
  // PLAN-123: the stall whose purchases this beat shows is drawn as buying until they have landed.
  if (buyer >= 0 && next.day === prev.day && (next.phase === 'buy' || dealsOf(prev, next).length > 0)) holdBuyer(buyer);
  const walkIns = arriving(prev, next, ui.viewer);
  holdArrival(walkIns);
  return { turned, tied, cardFrom, walkIns };
}

/** The beat after the new state is drawn. */
async function playAfter(prev: GameState, next: GameState, kind: StepKind, held: Held, ui: BeatScreen): Promise<void> {
  const { turned, tied, cardFrom, walkIns } = held;
  if (kind.newDay) {
    // The new day opens on the morning's event card; the lorry unloads only when buying starts (PLAN-065).
    ui.setNight(false);
  } else if (kind.toBuy) {
    // The bids turned over together, the winner shown and its stake put on the order's card (PLAN-084).
    if (turned) await bidsTurned(turned, ui.viewer, ui.setOrderShow);
    // PLAN-123 (finding 1): the lorry unloads at once, while the First token goes round the seats (who buys first, and
    // why: on Day 1 it is drawn at random, PLAN-104), so the lanes are full before anyone can buy.
    await Promise.all([delivery(next), rowAppears(prev, next) ? firstToken(next) : null]);
    await moves(prev, next, ui.viewer);
  } else if (kind.flip) {
    await bellRings(next, ui.setBell);
    ui.setBell(null);
  } else if (kind.rush) {
    ui.setRevealDone(false);
    // Nobody stocks or prices today: the walk-ins still turn face up before the bell.
    await arrive(walkIns);
    // A card just played slides to its price tag and stamps it; the bell is not shown a second time.
    if (tied?.played) await tiePlayed(tied.p, cardFrom);
    await reveal(next, ui.viewer, ui.setShow, ui.setBell, prev.phase === 'tie', ui.shared);
    ui.setBell(null);
    ui.setRevealDone(true);
  } else if (tied) {
    if (tied.played) await tiePlayed(tied.p, cardFrom);
  } else {
    await moves(prev, next, ui.viewer);
    // The last stall has bought: the walk-ins turn face up one after another (PLAN-085).
    await arrive(walkIns);
  }
}

/** Plays the step from `prev` to `next`; `commit` draws the new state, once what the beat holds back is held. */
export async function playBeat(prev: GameState, next: GameState, kind: StepKind, ui: BeatScreen, commit: () => void): Promise<void> {
  if (kind.newDay) {
    // The night is drawn from this stall's own view: what spoils behind a rival's shutter is not shown (rules 15).
    await nightfall(publicView(prev, ui.viewer), ui.setNight, ui.setNightSlide);
    // The new day's pieces are already in their new boxes: the panel shows them at rest for its last moment.
    ui.setNightSlide(null);
    ui.setLastNight(overnightLoss(prev, next, ui.viewer));
    ui.setLastJuice(overnightJuice(prev, next, ui.viewer));
  }
  const held = holdFor(prev, next, kind, ui);
  commit();
  await A.frame();
  await playAfter(prev, next, kind, held, ui);
}
