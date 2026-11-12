// One sheet from stocking to the day's takings (PLAN-085; flow study, review-18, D1 rule 2 and D3). The sheet is one
// element that stays in the middle of the table while its contents change: filling your crate, waiting for the
// rivals to open, your secret prices, and your price tags sealed while the rivals price. It then stays up, plain,
// under the bell, the Favoured Trade question and the day's takings, which are drawn by their own panels over it.
// Because the element stays (sheet.ts slides a panel only when it is replaced), the market lanes never show between
// these steps. The rush card (Showdown.tsx) lies over everything between the bell and the takings.
// What the sheet itself shows is the viewer's own shelf, crate and prices: nothing of a rival's is read here, and on
// a shared phone nothing of a stall's is drawn until the phone has been handed to its owner (daySheet.ts).
// Styles: daysheet.css.
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { stageAt, type FruitId } from '../../../engine/data';
import { crateCounts, type Crate, type GameState } from '../../../engine/game';
import * as A from '../../anim';
import { Fruit } from '../../art';
import { fx } from '../../fx';
import { PriceBar, PricePanelView, StallBar, StallPanelView, bellOpensOnStart, boxKey, startingCrate, startingPrices } from '../../panel';
import { dayStep, ownStep, type DayNow, type DayStep } from '../daySheet';
import { useReach } from '../reach';
import type { GameController } from '../useGameController';
import { CratesOpen, TiePanel } from './PricingTable';
import { SalesSummary } from './SalesSummary';

/** What the step rule needs, read from the game and its screen. `rung`: the bell has rung on this table today;
 *  `rushed`: a customer's card has been up on it today. */
export function dayNow(s: GameState, viewer: number, c: GameController, online: boolean, rung: boolean, rushed: boolean): DayNow {
  return {
    phase: s.phase, busy: c.busy, myTurn: c.myBidTurn,
    opened: online ? !c.myBidTurn : s.stalls[viewer] !== null,
    mine: s.players[viewer]?.kind === 'human' && (online || c.humans.length === 1 || c.handedTo === viewer),
    bell: c.bell, rung: rung || s.phase === 'tie', rush: !!c.show, rushed, done: c.revealDone,
  };
}

/** Is the day's sheet on the table now? (The game table asks; the sheet then works out its own step.) From the flip
 *  on it always is: every crate and every price is public then. */
export const daySheetOn = (s: GameState, viewer: number, c: GameController, online: boolean): boolean =>
  s.phase === 'tie' || s.phase === 'reveal' || dayStep(dayNow(s, viewer, c, online, false, false)) !== null;

/** A price tag turning over, by size and fade only: it grows from its middle line. */
const TURN: Keyframe[] = [{ transform: 'scaleY(0.05)', opacity: 0 }, { transform: 'none', opacity: 1 }];

const piece = (c: Crate, f: FruitId, pos: number) => c[f]?.[pos] ?? 0;
const withPiece = (c: Crate, f: FruitId, pos: number, n: number, len: number): Crate => {
  const t = [...(c[f] ?? new Array<number>(len).fill(0))];
  t[pos] = n;
  return { ...c, [f]: t };
};

export function DaySheet({ s, viewer, c, online }: { s: GameState; viewer: number; c: GameController; online: boolean }) {
  const pl = s.players[viewer];
  const root = useRef<HTMLDivElement>(null);
  // On a short phone the middle of the table is too low for stocking and pricing: there the sheet starts under the
  // customers' tickets and ends at the foot of your shelf (daysheet.css). The reach is measured from the rows
  // themselves and written on the sheet (reach.ts); on a taller phone the sheet keeps to the middle cell.
  useReach(root, 'row', true);
  const rung = useRef(false);
  if (c.bell || s.phase === 'tie') rung.current = true;
  const rushed = useRef(false);
  if (c.show) rushed.current = true;
  // (The game table draws the sheet only while it has a step; from the flip on a plain sheet is always safe to show.)
  const step: DayStep = dayStep(dayNow(s, viewer, c, online, rung.current, rushed.current)) ?? 'bell';
  const own = ownStep(step);

  // ---------- stocking: your crate, and the pieces on their way to it ----------
  const [crate, setCrate] = useState<Crate>(() => startingCrate(s, viewer));
  /** Pieces in the air on their way to the crate, by the box they came from: drawn in the crate when they land. */
  const [air, setAir] = useState<Record<string, number>>({});
  // Once the stall is open the game holds the crate (online only from pricing on: until then it is this screen's).
  const opened = s.phase !== 'stall' && s.crates?.[viewer] ? s.crates[viewer]! : crate;
  const landed: Crate = Object.fromEntries((Object.keys(opened) as FruitId[]).map((f) => [f, (opened[f] ?? []).map((n, pos) => Math.max(0, n - (air[boxKey(f, pos)] ?? 0)))]));
  const move = (f: FruitId, pos: number, d: number, row?: Element | null) => {
    const have = pl.stock[f][pos] ?? 0;
    const now = piece(crate, f, pos);
    const next = Math.max(0, Math.min(have, now + d));
    if (next === now) return;
    setCrate((cr) => withPiece(cr, f, pos, Math.max(0, Math.min(have, piece(cr, f, pos) + d)), pl.stock[f].length));
    const key = boxKey(f, pos);
    const node = <Fruit id={f} size={22} stage={stageAt(f, pos)} />;
    const shelf = row?.querySelector('.x-fruit') ?? row;
    const box = root.current?.querySelector('.ds-pcs');
    if (!shelf || !box) return;
    if (d > 0) {
      // The piece slides from its shelf row into your crate and is drawn there as it lands. Nothing waits for it.
      setAir((a) => ({ ...a, [key]: (a[key] ?? 0) + 1 }));
      void A.fly(shelf, box, node, { duration: A.BEAT.stock.fly, path: 'low', swell: false, onLand: () => setAir((a) => ({ ...a, [key]: Math.max(0, (a[key] ?? 0) - 1) })) });
    } else {
      // It leaves the crate at once and slides back to its row.
      const from = [...(root.current?.querySelectorAll(`.ds-pcx[data-box="${key}"]`) ?? [])].pop() ?? box;
      void A.fly(from, shelf, node, { duration: A.BEAT.stock.fly, path: 'low', swell: false });
    }
  };
  const total = Object.values(crateCounts(crate)).reduce((a, n) => a + (n ?? 0), 0);

  // ---------- pricing ----------
  const [vals, setVals] = useState<Record<string, number>>(() => startingPrices(s, viewer));
  // Prices are suggested once every stall is open (the planner then knows how many pieces each rival put out).
  useEffect(() => { if (s.phase === 'bid') setVals(startingPrices(s, viewer)); }, [s.phase]);
  const [notice, setNotice] = useState(() => bellOpensOnStart(s));

  // ---------- motion: nothing here is waited for ----------
  // On a short phone the sheet is larger while it shows stocking and pricing than while it lies plain under the bell:
  // it is measured where it lay just before the change (once, as the step changes) and slid from there to its place.
  const wasOwn = useRef(own);
  const before = useRef<A.Box | null>(null);
  if (wasOwn.current !== own) before.current = A.boxOf(root.current);
  useLayoutEffect(() => {
    if (wasOwn.current === own) return;
    wasOwn.current = own;
    A.flipFrom(root.current, before.current, { duration: A.FEEL.sheetIn, easing: A.EASE.sheet });
  }, [own]);
  // "Ring the bell": your price tags turn face down.
  const wasStep = useRef(step);
  useLayoutEffect(() => {
    const was = wasStep.current;
    wasStep.current = step;
    if (A.isReduced() || was !== 'price' || step !== 'sealed') return;
    root.current?.querySelectorAll('.ds-tag-back').forEach((el) => el.animate(TURN, { duration: A.ms(A.BEAT.price.seal), easing: A.EASE.travel }));
  }, [step]);

  // The Favoured Trade question, asked as it is today: once the table is still, of the stall whose turn it is.
  const asked = step === 'tie' && !c.busy && c.active >= 0 ? c.active : -1;
  const tying = asked >= 0 && c.activeHuman;
  const stocking = step === 'stock' || step === 'wait';
  const pricing = step === 'price' || step === 'sealed';
  return (
    <>
      <div class={`mid-panel sh-day ${own ? 'own' : 'rest'}`} data-step={step} data-a="day-sheet" ref={root}>
        {stocking && <StallPanelView s={s} p={viewer} crate={opened} landed={landed} waiting={step === 'wait'} onStep={move} />}
        {pricing && <PricePanelView s={s} p={viewer} vals={vals} notice={notice} sealed={step === 'sealed'} onPrice={(f, price) => setVals((v) => ({ ...v, [f]: price }))} onNotice={setNotice} />}
      </div>
      {step === 'stock' && <StallBar total={total} onSubmit={() => { fx.card(); c.act({ kind: 'stall', stall: crateCounts(crate), crate }); }} />}
      {step === 'price' && <PriceBar s={s} p={viewer} vals={vals} onSubmit={(posts) => { fx.card(); c.act({ kind: 'prices', posts }); }} />}
      {/* The bell, the Favoured Trade question and the takings are their own panels, mounted as they always were,
          over the sheet, which stays under them so the lanes do not show between them. */}
      {(step === 'bell' || (step === 'tie' && asked < 0)) && <CratesOpen s={s} viewer={viewer} />}
      {asked >= 0 && <TiePanel key={`tie-${s.day}-${asked}`} s={s} viewer={viewer} asked={asked} onDecide={tying ? (play) => { fx.card(); c.act({ kind: 'tie', play }); } : undefined} />}
      {step === 'takings' && <SalesSummary s={s} viewer={viewer} />}
    </>
  );
}
