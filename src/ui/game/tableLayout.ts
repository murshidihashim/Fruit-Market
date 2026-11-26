// What the game table lays out at each drawing (Game.tsx): which sheet lies in the middle of the table, whether the
// round table is up, what is out of reach under them, the bottom bar, the price boards on the seats and the first-game
// tip. Worked out from the game as this stall may see it and the controller's state; pure, so tests read it directly.
import { buyLimit, eveningChoice, type GameState } from '../../engine/game';
import { seats, type Board } from '../table';
import { tipFor, type Tip } from '../tutorial';
import { dayStep } from './daySheet';
import { dayNow, type DayFacts } from './panels/DaySheet';
import { tableStep } from './tableNow';
import { traitPicker } from './turn';
import type { GameController } from './useGameController';
import { onSheet } from './daySheet';

/** The sheet in the middle of the table (null: the Wholesale Market shows). */
export type Middle = 'night' | 'trait' | 'morning' | 'order' | 'day' | 'evening' | null;

/** What the layout reads from the controller. */
export type LayoutFacts = DayFacts & Pick<GameController, 'active' | 'activeHuman' | 'viewer' | 'actor' | 'orderShow' | 'night' | 'rival'>;

export interface Layout {
  /** On the first morning, who picks a perk (-1: nobody). */
  picker: number;
  /** The first-game tip of the moment (null: none). */
  coach: Tip | null;
  /** Rivals sit across the table in one row, in turn order after you. */
  rivals: number[];
  /** The rival whose stall is opened under its seat (null: none). */
  openRival: number | null;
  /** The lorry drives in once the morning's news has been read (Start buying), then unloads (PLAN-065). */
  lorryHere: boolean;
  /** Price boards on the seats: sealed while pricing (only whether a shop has finished is public). */
  boards: Record<number, Board>;
  /** How many pieces the stall whose turn it is may buy today. */
  limit: number;
  /** The standing order's sheet is up (PLAN-084), and the stall it is drawn for, and whether that stall bids now. */
  orderUp: boolean;
  orderSeat: number;
  ordering: boolean;
  /** Rules 18: after the flip a stall holding Favoured Trade with a tied price decides, in the open, whether to play it. */
  tying: boolean;
  /** The round table lies over the table (flow A, PLAN-099): from the moment this stall opens to the last customer. */
  tableOn: boolean;
  /** The day's step said with the day in the top bar follows what is on the table (PLAN-090, PLAN-127). */
  onTable: 'order' | 'bell' | undefined;
  /** The stall the evening sheet acts for, whether it has a choice to make, and whether its sheet is up. */
  evP: number;
  eveningChoices: boolean;
  evSheet: boolean;
  middle: Middle;
  /** The market is out of reach under a sheet or the round table. */
  covered: boolean;
  /** S8 (PLAN-110): a step everybody at a shared phone watches together: no one person's shelf is drawn. */
  together: boolean;
  /** The bottom bar is drawn (a sheet's own buttons, or the round table's foot, take its place otherwise). */
  bar: boolean;
}

/** `rushDay`: the day on which a customer's card was last up in the rush (until then the bell is on the table);
 *  `firstUp`: the "First time?" pop-up holds up this player's morning (PLAN-103). */
export function layoutOf(s: GameState, c: LayoutFacts, online: boolean, firstUp: boolean, rushDay: number): Layout {
  const { busy, active, activeHuman, viewer } = c;
  const pl = s.players[active];
  const picker = traitPicker(s, viewer, online);
  const coach = online || busy ? null : tipFor(s, {
    // (not at the standing-order bid: the "Secret prices" tip is about pricing fruit, and lay over the bid's stepper)
    myBuyTurn: s.phase === 'buy' && activeHuman && !busy, boughtToday: pl?.boughtToday ?? 0, pricing: c.myBidTurn && s.phase !== 'order',
    picker: picker >= 0, evening: s.phase === 'evening' && activeHuman,
  });
  const rivals = seats(s.players.length, viewer).map((x) => x.p);
  const boards: Record<number, Board> = {};
  if (s.phase === 'bid') rivals.forEach((p) => { boards[p] = { state: s.bids[p] === null ? 'thinking' : 'sealed', ai: s.players[p].kind === 'ai' }; });
  if (s.phase === 'stall') rivals.forEach((p) => { boards[p] = { state: s.stalls[p] === null ? 'thinking' : 'sealed', ai: s.players[p].kind === 'ai' }; });
  const pricing = s.phase === 'bid' && c.myBidTurn && !busy;
  const stalling = s.phase === 'stall' && c.myBidTurn && !busy;
  // Rules 14: on a Market Day morning every stall bids in secret for the standing order. One sheet stays on the table
  // from the first stall's bid until the bids have been turned over (PLAN-084): while the computer stalls decide first,
  // while this stall bids, while it waits for the others (online it may still change its mind), and while the winner is
  // shown and its stake is put on the order's card (c.orderShow; the game has moved on to buying by then).
  const orderUp = !!c.orderShow || (s.phase === 'order' && !!s.standing && s.players[viewer]?.kind === 'human');
  const tying = s.phase === 'tie' && activeHuman && !busy;
  // The day's sheet (PLAN-085): while this stall fills its crate, and for the takings. On a shared phone it is drawn
  // only for the person the phone was handed to (game/daySheet.ts). Between them the round table lies over the table.
  const step = dayStep(dayNow(s, viewer, c, online));
  const tableOn = !!c.show || tableStep(step) !== null;
  // Rules 19: every stall decides at the same time, so online the sheet is this phone's own seat (offline, the person
  // the phone has been handed to).
  const evP = c.actor;
  const eveningChoices = s.phase === 'evening' && evP >= 0 && eveningChoice(s, evP);
  // The evening (PLAN-076): the sheet covers the market only when there is something to decide.
  const evSheet = s.phase === 'evening' && activeHuman && !busy && eveningChoices;
  const middle: Middle = c.night ? 'night'
    : s.phase === 'morning' && firstUp ? null
    : s.phase === 'morning' && !busy ? (picker >= 0 ? 'trait' : 'morning')
    : orderUp ? 'order'
    : onSheet(step) ? 'day'
    : evSheet ? 'evening'
    : null;
  return {
    picker, coach, rivals, openRival: c.rival !== null && c.rival !== viewer ? c.rival : null,
    lorryHere: s.phase === 'buy' && !s.event?.noDelivery, boards, limit: pl ? buyLimit(pl) : 4,
    orderUp, orderSeat: c.myBidTurn ? (online ? viewer : active) : viewer, ordering: s.phase === 'order' && c.myBidTurn, tying, tableOn,
    // the standing order while its bids are turned over (the game is at buying by then), and the bell until the first
    // customer's card is up (the game is at the rush)
    onTable: c.orderShow ? 'order' : s.phase === 'reveal' && !c.revealDone && rushDay !== s.day ? 'bell' : undefined,
    evP, eveningChoices, evSheet, middle,
    covered: middle !== null || tableOn,
    together: !online && c.humans.length > 1 && (s.phase === 'morning' || s.phase === 'reveal' || !!c.night),
    bar: !pricing && !stalling && !orderUp && !tying && !evSheet && !tableOn,
  };
}
