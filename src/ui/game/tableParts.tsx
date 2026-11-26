// Parts of the game table (Game.tsx) with one job each: the results screen, the customers' rows, the online strips,
// what a sheet lies over, the "First time?" pop-up and the reactions.
import type { ComponentChildren } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { nightOutlook, type GameState } from '../../engine/game';
import { heatwaveLine, tonightText } from '../../engine/story';
import type { OnlineClient } from '../../net/client';
import { FirstTimePopup, dismissFirstTime, firstTimeMoment, showFirstTime } from '../FirstTime';
import { fx } from '../fx';
import { HowTo } from '../HowTo';
import { ReactButton, ReactionBubbles, ReactPicker, useMutes } from '../Reactions';
import { Street, Tomorrow } from '../table';
import { OrderStrip } from './panels/OrderPanel';
import { Results } from './panels/Results';
import { rematchLine } from './rematch';
import { coverWatch } from './underSheet';
import type { GameController } from './useGameController';

/** The results, at the end of the game: Play again (online: the rematch), and a League stage's Retry and the Sprint. */
export function GameOver({ s, c, online, reactions, onReact, onExit, onRematch, onRetry, onPlayAs, onSprint }: {
  s: GameState; c: GameController; online?: OnlineClient; reactions: ComponentChildren; onReact: () => void; onExit: () => void; onRematch: () => void;
  onRetry?: () => void; onPlayAs?: (avatar: string) => void; onSprint?: () => void;
}) {
  const { viewer, meta } = c;
  return (
    <div class="game tkt sbk-over">
      <main class="scroll"><Results s={s} viewer={viewer} onExit={onExit} onPlayAs={onPlayAs} onRetry={online ? undefined : onRetry} onSprint={online ? undefined : onSprint}
        onRematch={online ? () => { fx.tap(); online.rematch(); } : onRematch}
        rematchNote={online && meta ? rematchLine(meta, viewer) : undefined}
        rematchSent={!!online && !!meta && meta.rematch.includes(viewer)} online={!!online}
        react={online && <ReactButton class="rx-over" onOpen={onReact} />} /></main>
      {reactions}
    </div>
  );
}

/** The customers' rows under the top bar: tomorrow's strip first (PLAN-127), then today's customers, then the standing
 *  order. In the rush the customer at the round table has left their ticket's place, which says so (rushTable.css). */
export function StreetRows({ s, c }: { s: GameState; c: GameController }) {
  const { viewer, show } = c;
  return (
    <section class="street-wrap" data-a="street" style={show ? `--rt-at:"Customer ${show.n} of ${show.of}"` : undefined}>
      {/* PLAN-128: at night tomorrow's cards walk from the strip into today's row, on the night's own clock */}
      <Tomorrow s={s} viewer={viewer} onTip={(x) => c.setTip(x)} night={c.night ? c.nightSlide : undefined} />
      <Street s={s} viewer={viewer} onTip={(x) => c.setTip(x)} onScout={c.scout !== null && c.activeHuman ? c.pickWalkIn : undefined}
        away={show?.card.customerId} served={show?.served} night={c.night ? c.nightSlide : undefined} />
      <OrderStrip s={s} viewer={viewer} />
    </section>
  );
}

/** Online: the connection, and each stall that has dropped out, left, or that a computer plays for now. */
export function NetStrips({ c }: { c: GameController }) {
  if (c.conn === 'open' && c.offline.length === 0) return null;
  return (
    <div class="net">
      {c.conn !== 'open' && <div class="net-strip bad">Reconnecting to the room…</div>}
      {c.conn === 'open' && c.offline.map((x) => (
        <div class="net-strip">
          {x.left ? `${x.name} left. A computer plays for them.`
            : x.bot ? `A computer is playing for ${x.name} until they come back.`
            : x.takeoverAt ? `${x.name} disconnected. A computer takes over in ${Math.max(0, Math.ceil((x.takeoverAt - c.nowTick) / 1000))}s.`
            : `${x.name} is offline.`}
        </div>
      ))}
    </div>
  );
}

/**
 * What a sheet lies over cannot be seen, so it is put out of reach of the keyboard and of screen readers too: the
 * Wholesale Market for as long as a sheet is up (PLAN-090), and each row of the table a sheet covers, measured on this
 * phone (PLAN-091; game/underSheet.ts). Returns where the table says whether the market is covered at this drawing.
 */
export function useUnderSheet(centreRef: { current: HTMLElement | null }) {
  const covered = useRef(false);
  const underSheet = useRef<ReturnType<typeof coverWatch> | null>(null);
  useLayoutEffect(() => {
    const centre = centreRef.current;
    const game = centre?.parentElement;
    if (centre && game) (underSheet.current ??= coverWatch()).update(game, centre, covered.current);
  });
  useEffect(() => () => underSheet.current?.stop(), []);
  return covered;
}

/** PLAN-103: a player who has never finished a game gets the owner's "First time? How to play" as one pop-up when an
 *  online game starts, before Day 1's news is turned over. It holds up only this player's own morning card (the morning
 *  waits for each person's Start buying anyway). Asked once, as the game opens. All the rules can be opened from it;
 *  closing them comes back to the pop-up. */
export function useFirstTime(s: GameState, online: boolean, votedMe: boolean) {
  const [firstTime, setFirstTime] = useState(() => online && showFirstTime());
  const [firstRules, setFirstRules] = useState(false);
  const up = firstTime && firstTimeMoment(s, online, votedMe);
  const popup = up && (firstRules
    ? <div class="ft-rules" onClick={(e) => e.stopPropagation()}><HowTo onDone={() => setFirstRules(false)} /></div>
    : <FirstTimePopup onRules={() => { fx.tap(); setFirstRules(true); }} onDone={() => { fx.tap(); dismissFirstTime(); setFirstTime(false); }} />);
  return { up, popup };
}

/** PLAN-112: preset reactions in an online game. The picker, who is muted on this phone, and the bubbles over the seats:
 *  a stall's crate at the round table while it is up, otherwise its box in the stalls' row, or your shelf. */
export function useReactions(online: OnlineClient | undefined, s: GameState, viewer: number) {
  const [reacting, setReacting] = useState(false);
  const mutes = useMutes(online?.code);
  const reactions = online && (
    <>
      <ReactionBubbles client={online} name={(p) => s.players[p]?.name ?? ''} anchor={(p) => seatOnScreen(p, viewer)} />
      {reacting && <ReactPicker client={online} onClose={() => setReacting(false)} />}
    </>
  );
  return { reactions, setReacting, mutes };
}

/** PLAN-112: where a seat is on this screen, for its reaction's bubble: its crate at the round table while that is up,
 *  otherwise its box in the stalls' row, or (your own) your shelf. Null when it is not on screen. */
function seatOnScreen(p: number, viewer: number): Element | null {
  if (typeof document === 'undefined') return null;
  const shown = (sel: string) => {
    const el = document.querySelector(sel);
    return el && el.getBoundingClientRect().width > 0 ? el : null;
  };
  return shown(`[data-a="rt-crate-${p}"]`) ?? (p === viewer ? shown('section.my-stall') ?? shown('[data-a="me-stall"]') : shown(`.rival-stall[data-a="p${p}"]`));
}

/** The evening's warning on the market (PLAN-076), as the evening panel words it: what spoils or turns to juice tonight. */
export function eveningNote(s: GameState, p: number): { text: string; good: boolean } | undefined {
  const night = nightOutlook(s, p);
  const text = [tonightText(night), heatwaveLine(s, p)].filter(Boolean).join(' ');
  return text ? { text, good: night.spoil === 0 && !heatwaveLine(s, p) } : undefined;
}
