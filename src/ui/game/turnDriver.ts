// The game screen's turns, as plain TypeScript (no Preact, no page). Every state change goes through apply(), which has
// the screen play its beat before handing control back; while a beat plays, the table is busy. Offline, actions run
// through the engine; online, they go to the room server and the states it sends back are played one at a time. It
// keeps what a tap leaves for later (the buy queue, Done or Undo tapped while a piece flies), and on a shared phone who
// holds the phone and each person's own day. useGameController.ts holds one; tests drive one with beats of their own.
import { RuleError, activePlayer, type Action, type Crate, type GameState } from '../../engine/game';
import type { RoomView } from '../../net/protocol';
import { BEAT, isFast, pause, resetHurry } from '../motion';
import type { OwnDay } from './dayWords';
import { computerStep, eveningAside, nextFromRoom, ownDaysAfter, stepKind, type StepKind } from './stepKind';
import { awaitsHandOver, keepTap, playLocal, undoPoint, waitsForPerson, type KeptTap, type UndoPoint } from './turn';

/** The room server, as the table uses it (net/client.ts OnlineClient). */
export interface Room {
  readonly seat: number | null;
  act(a: Action): boolean;
  undo(): boolean;
}

/** What the driver asks of the screen. The screen gives a new one each time it is drawn; a beat keeps the one it
 *  started with. */
export interface TableHooks {
  /** Plays the beat from `prev` to `next`. It calls `commit` once what the beat holds back is held, so the new state is
   *  drawn under it; it resolves when the beat has ended. */
  play(prev: GameState, next: GameState, kind: StepKind, commit: () => void): Promise<void>;
  /** The beat is over: what it held back is let go. */
  settle(): void;
  /** The game is at a new state (drawn, and saved by the screen's owner). */
  show(next: GameState): void;
  setBusy(busy: boolean): void;
  /** PLAN-123: the stall whose purchases the beat shows (null: none), and whether they are this phone's own. */
  setMover(p: number | null, own: boolean): void;
  /** Draws the table again (the room's queue and the computers look again then). */
  redraw(): void;
  /** A message at the foot of the screen; `error`: with the error sound. */
  say(msg: string, error?: boolean): void;
  /** A Free Fruit or Scout pick being made is dropped (`scout`: Scout's too). */
  dropPick(scout: boolean): void;
  /** The people at this phone (their seats), and the stall whose turn it is as the screen was drawn. */
  humans: number[];
  active: number;
  /** Runs `fn` once the current drawing is done (a timer of 0). */
  later(fn: () => void): void;
}

/** At most this many taps are kept while a piece is on its way. */
export const KEPT_TAPS = 3;

/** Before the screen first gives its own: nothing is drawn, and a beat ends at once. */
const IDLE: TableHooks = {
  play: async (_prev, _next, _kind, commit) => commit(), settle: () => {}, show: () => {}, setBusy: () => {}, setMover: () => {},
  redraw: () => {}, say: () => {}, dropPick: () => {}, humans: [], active: -1, later: (fn) => { fn(); },
};

export class TurnDriver {
  /** The game as it is now (it may be ahead of the screen's drawing for the length of a frame). */
  s: GameState;
  /** A beat is playing: a tap that would change the game now is kept, or not taken. */
  busy = false;
  /** Fruit tapped while the last purchase was still on its way (offline); bought in order as soon as the table is free. */
  kept: KeptTap[] = [];
  /** Done was tapped while a piece was still on its way: buying ends as soon as the table is free (PLAN-085). */
  endQueued = false;
  /** PLAN-123: Undo was tapped while a piece was still on its way: it is done as soon as the table is free. */
  undoQueued = false;
  /** Online: an action has been sent and its answer has not come back yet. */
  sending = false;
  /** Online: the states the room has sent that are still to be played. */
  readonly queue: GameState[] = [];
  /** Who the phone was handed to last (a shared phone; REP-133 A-01: kept for taps handled between drawings). */
  handed: number | null = null;
  /** S8 (PLAN-110), a shared phone: each person's own takings, kept from the rush until the phone is next passed to them. */
  ownDays: Record<number, OwnDay> = {};
  /** Where Undo goes back to (turn.ts): the turn's start, or just after the last favour card played on it (DEC-120). */
  point: UndoPoint | null;
  /** Online: the crate this screen sent as its stall opened (the room sends it back only once every stall is open). */
  sentCrate: { day: number; seat: number; crate: Crate } | null = null;
  private lastVersion: number;
  private undoSeen: number | null = null;

  /** What the screen does for the driver: given anew each time the screen is drawn (useGameController.ts). */
  hooks: TableHooks = IDLE;

  constructor(initial: GameState, readonly room?: Room, opts: { version?: number; point?: UndoPoint | null } = {}) {
    this.s = initial;
    this.lastVersion = opts.version ?? 0;
    this.point = opts.point ?? null;
  }

  /** This phone's seat online; null offline. */
  get seat(): number | null { return this.room ? this.room.seat : null; }
  /** Offline, on a shared phone: the turn has passed to someone the phone has not been handed to yet. */
  handOverPending(): boolean { return !this.room && awaitsHandOver(this.s, this.handed); }
  /** The Undo point as the screen draws `s` (it changes only with the turn, or as a favour card is played). */
  pointFor(s: GameState, humanTurn: boolean): UndoPoint | null {
    this.point = undoPoint(this.point, s, humanTurn);
    return this.point;
  }

  /** Plays the step to `next`, then lets the taps kept meanwhile act. */
  async apply(next: GameState): Promise<void> {
    const hooks = this.hooks;
    const prev = this.s;
    this.busy = true;
    hooks.setBusy(true);
    const kind = stepKind(prev, next, this.seat);
    // A tap's hurry lasts until the table waits for this player again (see settle below), so one tap carries through
    // every rival's turn (PLAN-081). The rush is the exception: it always starts at its own pace, with its own tap (next
    // customer) and Skip; and the flip before a Favoured Trade question rings the bell at its own pace (PLAN-085).
    if (kind.rush || kind.flip) resetHurry();
    hooks.setMover(kind.buyer >= 0 ? kind.buyer : null, kind.own);
    // S8: the takings on a shared phone show nobody's own day; each person's is kept for their next hand-over.
    this.ownDays = ownDaysAfter(this.ownDays, prev, next, hooks.humans, !this.room && hooks.humans.length > 1);
    try {
      await hooks.play(prev, next, kind, () => this.commit(next));
    } finally {
      hooks.settle();
      hooks.setMover(null, false);
      this.busy = false;
      hooks.setBusy(false);
      // The hurry ends where the player decides something again. Online it also lasts through the states still waiting
      // to be shown. It only ever changes how fast this screen draws: never the game, and nothing is sent.
      if (!this.queue.length && waitsForPerson(this.s, this.seat)) resetHurry();
      hooks.redraw();
      this.afterBeat();
    }
  }

  private commit(next: GameState) {
    this.s = next;
    this.hooks.show(next);
  }

  /** Taps made while the piece was on its way: Undo, else the next piece to buy, else Done (PLAN-085, PLAN-123). They
   *  are this person's own only while their buying turn goes on; otherwise they are dropped. */
  private afterBeat() {
    const cur = this.s;
    const me = activePlayer(cur);
    const mine = cur.phase === 'buy' && me >= 0 && cur.players[me].kind === 'human' && (!this.room || me === this.seat) && !this.handOverPending();
    const q = mine ? this.kept.shift() : undefined;
    if (!mine) { this.kept = []; this.endQueued = false; this.undoQueued = false; }
    else if (this.undoQueued) { this.undoQueued = false; this.kept = []; this.endQueued = false; this.hooks.later(() => this.undo()); }
    else if (q) this.hooks.later(() => this.attempt(() => playLocal(this.s, activePlayer(this.s), { kind: 'buy', fruit: q.f, pos: q.pos })));
    else if (this.endQueued) { this.endQueued = false; this.hooks.later(() => this.sendEndBuy()); }
  }

  /** Applies a move the engine works out now; a move the rules refuse is said, with the error sound. */
  attempt(fn: () => GameState): boolean {
    if (this.busy) return false;
    try {
      void this.apply(fn());
      return true;
    } catch (e) {
      if (e instanceof RuleError) {
        this.hooks.say(e.message, true);
        return false;
      }
      throw e;
    }
  }

  /** Every player decision goes through here: applied locally, or sent to the room server. `who` defaults to the stall
   *  whose turn it is (stocking and pricing: as the game has it now; otherwise as the screen was drawn). */
  act(a: Action, who?: number) {
    if (this.busy) return;
    if (this.room) {
      if (this.sending) return;
      if (!this.room.act(a)) return this.hooks.say('Reconnecting…');
      this.sending = true;
      // The room keeps every crate back until every stall has opened (rules 15), this one's too: the round table
      // draws this stall's crate from what it sent (PLAN-099).
      const seat = this.room.seat;
      if (a.kind === 'stall' && a.crate && seat !== null) this.sentCrate = { day: this.s.day, seat, crate: a.crate };
      return;
    }
    if (this.handOverPending()) return;
    const p = who ?? (a.kind === 'stall' || a.kind === 'prices' ? activePlayer(this.s) : this.hooks.active);
    this.attempt(() => playLocal(this.s, p, a));
  }

  /** A tap on a market box. While this phone's own piece is on its way the tap is kept for when it lands, if it will
   *  still be a purchase the rules allow then (turn.ts keepTap); any other tap while a beat plays is not taken. */
  pick(f: KeptTap['f'], pos: number) {
    if (this.handOverPending()) return;
    if (this.busy) {
      const cur = this.s;
      const me = activePlayer(cur);
      if (!this.room && cur.phase === 'buy' && !this.undoQueued && this.kept.length < KEPT_TAPS && keepTap(cur, me, this.kept, { f, pos })) this.kept.push({ f, pos });
      return;
    }
    this.act({ kind: 'buy', fruit: f, pos });
  }

  /** Done buying: at once, or as soon as the piece on its way has landed. */
  endBuy() {
    if (this.handOverPending()) return;
    this.hooks.dropPick(false);
    if (this.busy) { this.endQueued = true; return; }
    this.sendEndBuy();
  }

  /** Ends this person's buying turn (the table must be free). */
  sendEndBuy() {
    if (this.busy || this.handOverPending()) return;
    if (this.room) { if (!this.sending && this.room.act({ kind: 'endBuy' })) this.sending = true; return; }
    const cur = this.s;
    const me = activePlayer(cur);
    if (cur.phase === 'buy' && me >= 0 && cur.players[me].kind === 'human') this.attempt(() => playLocal(this.s, me, { kind: 'endBuy' }));
  }

  /** Undo: put back everything bought this turn. Offline the pieces travel back to their boxes (PLAN-085): the turn's
   *  first state (or the one just after the last favour card played, which stays played) is shown like any other step.
   *  PLAN-123: Undo while a piece is on its way drops the taps kept back and is done as soon as the piece has landed. */
  undo() {
    if (this.room) {
      if (this.busy || this.sending) return;
      if (!this.room.undo()) return this.hooks.say('Reconnecting…');
      this.sending = true;
      this.hooks.dropPick(false);
      return;
    }
    const t = this.point?.at;
    if (this.handOverPending()) return;
    this.kept = [];
    this.endQueued = false;
    if (this.busy) { this.undoQueued = true; return; }
    if (t && t !== this.s) void this.apply(t);
    this.hooks.dropPick(true);
  }

  /** The phone has been passed to `p`: their own day has been seen. */
  handTo(p: number) { delete this.ownDays[p]; this.handed = p; }
  /** S8: the person's own day not yet shown to them (null when there is none). */
  ownDay(p: number): OwnDay | null { return this.ownDays[p] ?? null; }

  /** Online: a view from the room. Its game is queued to be played, and a rival's Undo is said. */
  take(v: RoomView) {
    this.sending = false;
    // Tell the table when someone takes their purchases back (not on the first view, so a reconnect stays quiet).
    if (this.undoSeen === null) this.undoSeen = v.undone?.n ?? 0;
    else if (v.undone && v.undone.n > this.undoSeen) {
      this.undoSeen = v.undone.n;
      if (v.undone.seat !== this.seat) this.hooks.say(`${v.seats[v.undone.seat]?.name ?? 'A player'} took back their purchases`);
    }
    if (v.game && v.version > this.lastVersion && v.game.config.seed === this.s.config.seed) {
      this.lastVersion = v.version;
      this.queue.push(v.game);
      this.hooks.redraw();
    } else if (v.game && v.version === this.lastVersion && v.game.phase === 'order' && v.game.config.seed === this.s.config.seed) {
      // While a standing order is bid for, the room holds each person's choice until every stall has decided, so the
      // game has not moved on (the same version), but who is bidding and who has passed has changed, and this person's
      // own held bid is in the view (rules 17; PLAN-084: the marks used to stay on "deciding").
      this.queue.push(v.game);
      this.hooks.redraw();
    }
  }

  /**
   * Offline, the computer stalls act one step at a time, after any beat has ended: `s` is the game as the screen has
   * drawn it, `active` whose turn it is. Returns how to call off the pause before the step (the screen is drawn again).
   */
  computers(s: GameState, active: number): (() => void) | undefined {
    if (this.room || this.busy) return;
    if (s.phase === 'morning' || s.phase === 'reveal' || s.phase === 'over') return;
    if (active < 0 || s.players[active].kind !== 'ai') return;
    // Rules 19: the computers decide as the evening opens, all at once and without a pause.
    if (s.phase === 'evening') {
      const next = computerStep(this.s);
      if (next) void this.apply(next);
      return;
    }
    // The pause before each rival action. A tap on the table ends it at once and keeps the next ones short (PLAN-081).
    let live = true;
    // A rival asked about Favoured Trade answers a moment later, so its question can be read (PLAN-085).
    void pause((isFast() ? BEAT.rival.pauseFast : BEAT.rival.pause) + (s.phase === 'tie' ? BEAT.tie.ask : 0)).then(() => {
      if (!live || this.busy) return;
      const next = computerStep(this.s);
      if (next) void this.apply(next);
    });
    return () => { live = false; };
  }

  /** Online: plays the next state the room has sent, once the table is free. */
  drain() {
    if (!this.room || this.busy || !this.queue.length) return;
    const cur = this.s;
    const next = nextFromRoom(cur, this.queue)!;
    if (JSON.stringify(next) === JSON.stringify(cur)) { this.hooks.redraw(); return; }
    // Rules 19: while this person is still deciding in the evening, another stall's choice is not played as a beat: its
    // box and its cash simply change; the person sees the rest of the evening once they say Lights out.
    if (eveningAside(cur, next, this.room.seat)) {
      this.commit(next);
      this.hooks.redraw();
      return;
    }
    void this.apply(next);
  }
}
