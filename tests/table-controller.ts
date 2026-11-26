// Test helper (REP-140 A-01): a stand-in for the game controller (game/useGameController.ts), so the game table's
// panels without hooks of their own (ActionBar, the layout rules) can be drawn and asked in a test, without a browser.
// Every field the screens read is here, with a quiet default; a test sets what it needs.
import type { GameState } from '../src/engine/game';
import type { GameController } from '../src/ui/game/useGameController';

export function controller(s: GameState, over: Partial<GameController> = {}): GameController {
  const none = () => {};
  const c: GameController = {
    s, busy: false, toast: null, rival: null, setRival: none, menu: false, setMenu: none, eventInfo: false, setEventInfo: none,
    pulseInfo: false, setPulseInfo: none, freeFruit: null, setFreeFruit: none, scout: null, handedTo: null, setHandedTo: none,
    night: false, nightSlide: null, bell: null, orderShow: null, banner: null, revealDone: false, cardInfo: null, setCardInfo: none,
    tip: null, setTip: none, setTipTick: none, show: null, lastNight: 0, lastJuice: { pieces: 0, dollars: 0 }, point: null,
    meta: null, conn: 'open', layerRef: { current: null }, humans: [0], active: 0, actor: 0, activeHuman: false, viewer: 0,
    needHandoff: false, handoffDue: false, myBidTurn: false, humansMissingBids: [], eveningWaits: [], votedMe: false,
    humansNotVoted: [], offline: [], waitingFor: (idxs) => idxs.map((i) => s.players[i]?.name).filter(Boolean).join(' and '), nowTick: 0,
    say: none, act: none, proceed: none, pickMarket: none, playCard: none, reallyPlay: none, pickWalkIn: none, undo: none, endBuy: none,
    ownCrate: (st, p) => st.crates?.[p] ?? null, ownDay: () => null, handTo: none, hurry: none, mover: null, ownBeat: false, rung: false,
  };
  return { ...c, ...over };
}
