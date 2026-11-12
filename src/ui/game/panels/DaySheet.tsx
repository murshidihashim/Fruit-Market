// One sheet from stocking to the day's takings (PLAN-085; flow study, review-18, D1 rule 2 and D3). The sheet is one
// element that stays in the middle of the table while its contents change: filling your crate, waiting for the
// rivals to open, your secret prices, your price tags sealed while the rivals price, the bell, the Favoured Trade
// question, and the day's takings. Because the element stays (sheet.ts slides a panel only when it is replaced), the
// market lanes never show between these steps. The rush card (Showdown.tsx) lies over it between the bell and the
// takings.
// What it shows is the viewer's own crate and prices, and what is public: a rival's crate and prices are read only
// after the flip (pricingTable.ts bellRows), and on a shared phone nothing of a stall's is drawn until the phone has
// been handed to its owner (daySheet.ts). Styles: daysheet.css.
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { stageAt, type FruitId } from '../../../engine/data';
import { crateCounts, type Crate, type GameState } from '../../../engine/game';
import * as A from '../../anim';
import { Fruit } from '../../art';
import { fx } from '../../fx';
import { PriceBar, PricePanelView, StallBar, StallPanelView, bellOpensOnStart, boxKey, startingCrate, startingPrices } from '../../panel';
import { TIGHTEST, dayStep, fitSheet, fullReach, ownStep, type DayNow, type DayStep } from '../daySheet';
import { nth } from '../pricingTable';
import { reachFrom, useReach } from '../reach';
import type { GameController } from '../useGameController';
import { CratesOpen, TieBar, TieCard } from './PricingTable';
import { SalesSummary } from './SalesSummary';

/** What the step rule needs, read from the game and its screen. `rung`: the bell has rung on this table today. */
export function dayNow(s: GameState, viewer: number, c: GameController, online: boolean, rung: boolean): DayNow {
  return {
    phase: s.phase, busy: c.busy, myTurn: c.myBidTurn,
    opened: online ? !c.myBidTurn : s.stalls[viewer] !== null,
    mine: s.players[viewer]?.kind === 'human' && (online || c.humans.length === 1 || c.handedTo === viewer),
    bell: c.bell, rung: rung || s.phase === 'tie', rush: !!c.show, done: c.revealDone,
  };
}

/** Is the day's sheet on the table now? (The game table asks; the sheet then works out its own step.) From the flip
 *  on it always is: every crate and every price is public then. */
export const daySheetOn = (s: GameState, viewer: number, c: GameController, online: boolean): boolean =>
  s.phase === 'tie' || s.phase === 'reveal' || dayStep(dayNow(s, viewer, c, online, false)) !== null;

/** A card turning over, by size and fade only: it grows from its middle line. */
const TURN: Keyframe[] = [{ transform: 'scaleY(0.05)', opacity: 0 }, { transform: 'none', opacity: 1 }];
/** The bell swinging: a short shake from side to side (position only). */
const SWING: Keyframe[] = [0, -4, 4, -3, 2, 0].map((x) => ({ transform: `translateX(${x}px)` }));

/**
 * Draws stocking or pricing so that everything on it is in view, by measuring: how tall the sheet's parts are at each
 * step closer (data-tight, daysheet.css) against the room the table's rows leave it (daySheet.ts fitSheet). The step
 * is written on the sheet itself; nothing is drawn again for it. It starts from the roomiest drawing every time, so
 * a sheet that gains room (the shelf dock grew smaller) is drawn roomier again.
 */
function fit(el: HTMLElement): void {
  delete el.dataset.tight;
  el.removeAttribute('data-over');
  el.removeAttribute('data-up');
  const room = el.clientHeight;
  const needs: number[] = [];
  for (let t = 0; t <= TIGHTEST; t++) {
    if (t) el.dataset.tight = String(t);
    needs.push(el.scrollHeight);
    if (needs[t] <= room + 1) break;
  }
  // On a short phone the sheet already lies over your shelf and the rows above it (daysheet.css): there is no more
  // room to take there.
  const lies = getComputedStyle(el);
  const more = (margin: string, name: string) => (margin === '0px' ? parseFloat(el.style.getPropertyValue(name)) || 0 : 0);
  const to = fitSheet(needs, room, more(lies.marginBottom, '--drop'), more(lies.marginTop, '--rise'));
  if (to.tight) el.dataset.tight = String(to.tight);
  else delete el.dataset.tight;
  if (to.over) el.setAttribute('data-over', '');
  if (to.up) el.setAttribute('data-up', '');
}

const piece = (c: Crate, f: FruitId, pos: number) => c[f]?.[pos] ?? 0;
const withPiece = (c: Crate, f: FruitId, pos: number, n: number, len: number): Crate => {
  const t = [...(c[f] ?? new Array<number>(len).fill(0))];
  t[pos] = n;
  return { ...c, [f]: t };
};

export function DaySheet({ s, viewer, c, online, tip }: { s: GameState; viewer: number; c: GameController; online: boolean;
  /** A first-game tip is up over the table. */
  tip?: boolean }) {
  const pl = s.players[viewer];
  const root = useRef<HTMLDivElement>(null);
  // On a short phone the middle of the table is too low for stocking and pricing: there the sheet starts under the
  // customers' tickets and ends at the foot of your shelf (daysheet.css). The reach is measured from the rows
  // themselves and written on the sheet (reach.ts); on a taller phone the sheet keeps to the middle cell.
  // Each time the rows have been measured (they are laid out, or one changed its size) the sheet is fitted again.
  const fitting = useRef(false);
  useReach(root, 'row', true, true, (el) => { if (fitting.current) fit(el); });
  // The bell's rows and the Favoured Trade question lie over the customers, the rivals and your shelf, under the
  // day's beats (the approved Favoured-Trade screen; bell.css). How far the top of the customer band is above the
  // middle is measured from the rows too, whenever one of them changes its size, and written on the sheet.
  useLayoutEffect(() => {
    const el = root.current;
    const game = el?.closest('.game');
    if (!el || !game || typeof ResizeObserver === 'undefined') return;
    const mid = game.querySelector(':scope > .centre > .market-stall');
    const street = game.querySelector(':scope > .street-wrap');
    if (!mid || !street) return;
    const reach = () => {
      const m = mid.getBoundingClientRect();
      if (!m.width || !street.getClientRects().length) return;
      el.style.setProperty('--rise-full', `${reachFrom({ mid: m, row: null, street: street.getBoundingClientRect(), beats: null, dock: null, notice: false }, 'street', false).rise}px`);
    };
    const watch = new ResizeObserver(reach);
    for (const x of [game, mid, street]) watch.observe(x);
    return () => watch.disconnect();
  }, []);
  const rung = useRef(false);
  if (c.bell !== null || s.phase === 'tie') rung.current = true;
  // (The game table draws the sheet only while it has a step; from the flip on the open rows are always safe to show.)
  const step: DayStep = dayStep(dayNow(s, viewer, c, online, rung.current)) ?? 'bell';
  // Stocking and pricing fit themselves to the middle of the table; the bell and the question are drawn on the sheet
  // over the rows around it; under the takings (their own panel) the sheet lies plain.
  const own = ownStep(step);
  const full = fullReach(step);
  const lies = own ? 'own' : full ? 'full' : 'rest';
  const shared = !online && c.humans.length > 1;

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

  // ---------- the room: every row, note and button in view before anything scrolls ----------
  fitting.current = own;
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    // The first-game tip for stocking and pricing lies at the sheet's foot: the sheet keeps that much room free
    // under its last line, so the tip covers no row and no stepper (PLAN-090), and is fitted with that room taken.
    const note = tip && own ? el.closest('.game')?.querySelector<HTMLElement>(':scope > .coach') : null;
    el.style.setProperty('--tip', note ? `${note.offsetHeight + 16}px` : '0px');
    if (own) fit(el);
    else { delete el.dataset.tight; el.removeAttribute('data-over'); el.removeAttribute('data-up'); }
  }, [step, tip]);

  // ---------- motion: nothing here is waited for ----------
  // The sheet's box changes with where it lies: it grows from the middle of the table over the rows above and below
  // it as the bell rings, and on a short phone it is larger for stocking and pricing than while it lies plain under
  // the takings. It is measured where it lay just before the change (once, as that changes) and slid from there.
  const wasLies = useRef(lies);
  const before = useRef<A.Box | null>(null);
  if (wasLies.current !== lies) before.current = A.boxOf(root.current);
  useLayoutEffect(() => {
    if (wasLies.current === lies) return;
    wasLies.current = lies;
    A.flipFrom(root.current, before.current, { duration: A.FEEL.sheetIn, easing: A.EASE.sheet });
  }, [lies]);
  // "Ring the bell": your price tags turn face down.
  const wasStep = useRef(step);
  useLayoutEffect(() => {
    const was = wasStep.current;
    wasStep.current = step;
    if (A.isReduced() || was !== 'price' || step !== 'sealed') return;
    root.current?.querySelectorAll('.ds-tag-back').forEach((el) => el.animate(TURN, { duration: A.ms(A.BEAT.price.seal), easing: A.EASE.travel }));
  }, [step]);
  // The bell: it swings, then each row's tags turn face up as the row opens (animator.tsx bellRings counts the rows).
  const wasOpen = useRef<number | null>(null);
  useLayoutEffect(() => {
    const was = wasOpen.current;
    wasOpen.current = c.bell;
    if (c.bell === null || A.isReduced() || !root.current) return;
    if (was === null) root.current.querySelector('.ds-bell-ico')?.animate(SWING, { duration: A.ms(A.BEAT.bell.swing), easing: 'ease-in-out' });
    const rows = root.current.querySelectorAll('.ds-stall');
    for (let i = was ?? 0; i < c.bell; i++) {
      rows[i]?.querySelectorAll('.ds-pz, .ds-none').forEach((el) => el.animate(TURN, { duration: A.ms(A.FEEL.turn), delay: A.moveMs(A.BEAT.bell.lid), fill: 'backwards', easing: A.EASE.travel }));
    }
    // A row turning has its own small sound; not as the bell first shows (with reduced motion every row is open then):
    // that moment has the bell's own sound alone (PLAN-091).
    if (was !== null && c.bell > was) fx.tap();
  }, [c.bell]);
  // The question comes onto the sheet under the open rows.
  const asked = step === 'tie' && !c.busy && c.active >= 0 ? c.active : -1;
  const tying = asked >= 0 && c.activeHuman && asked === viewer;
  // Once this stall has been asked, the line under the rows that says its prices are tied is not shown again today.
  const answered = useRef(false);
  if (tying) answered.current = true;
  useLayoutEffect(() => {
    const card = asked < 0 ? null : root.current?.querySelector('.ds-tie');
    if (!card || !root.current) return;
    // On a short phone with many stalls the rows scroll: the question is brought into view.
    root.current.scrollTop = root.current.scrollHeight;
    if (!A.isReduced()) card.animate([{ opacity: 0, transform: 'translateY(28px)' }, { opacity: 1, transform: 'none' }], { duration: A.ms(A.FEEL.sheetIn), easing: A.EASE.sheet });
  }, [asked]);

  const stocking = step === 'stock' || step === 'wait';
  const pricing = step === 'price' || step === 'sealed';
  return (
    <>
      <div class={`mid-panel sh-day ${lies}`} data-step={step} data-a="day-sheet" ref={root}>
        {stocking && <StallPanelView s={s} p={viewer} crate={opened} landed={landed} waiting={step === 'wait'} onStep={move} />}
        {pricing && <PricePanelView s={s} p={viewer} vals={vals} notice={notice} sealed={step === 'sealed'} onPrice={(f, price) => setVals((v) => ({ ...v, [f]: price }))} onNotice={setNotice} />}
        {/* The tie order and the Favoured Trade reminder as one line each: drawn only at the closest step, in place
            of their blocks (daysheet.css). */}
        {pricing && Object.keys(vals).length > 0 && (
          <div class="ds-brief">
            <span>Ties: fresher, then the Haggler, then earlier.{s.order.includes(viewer) ? ` You bought ${nth(s.order.indexOf(viewer) + 1)}.` : ''}</span>
            {pl.favours.includes('favouredTrade') && <span>You hold Favoured Trade: if you tie, you are asked.</span>}
          </div>
        )}
        {/* The bell's rows, and under them the Favoured Trade question, are drawn on the sheet itself (PLAN-085). */}
        {full && (
          <CratesOpen s={s} viewer={viewer} open={c.bell} shared={shared} answered={answered.current}>
            {asked >= 0 && <TieCard key={`tie-${asked}`} s={s} viewer={viewer} asked={asked} mine={tying} />}
          </CratesOpen>
        )}
      </div>
      {step === 'stock' && <StallBar total={total} onSubmit={() => { fx.card(); c.act({ kind: 'stall', stall: crateCounts(crate), crate }); }} />}
      {step === 'price' && <PriceBar s={s} p={viewer} vals={vals} onSubmit={(posts) => { fx.card(); c.act({ kind: 'prices', posts }); }} />}
      {tying && <TieBar onDecide={(play) => { fx.card(); c.act({ kind: 'tie', play }); }} />}
      {/* The takings are their own panel, mounted as they always were, over the sheet, which stays under them so the
          lanes do not show between the rush and the takings. */}
      {step === 'takings' && <SalesSummary s={s} viewer={viewer} shared={shared} />}
    </>
  );
}
