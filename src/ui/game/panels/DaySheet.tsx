// The day's sheet (PLAN-085; PLAN-099): stocking, and the day's takings. The sheet is one element in the middle of the
// table. While this stall fills its crate it draws stocking; once the stall has opened, the round table takes over
// (panels/RushTable.tsx: waiting for the rivals, pricing on a sheet at its foot, the bell, the Favoured Trade question
// and the rush), and the day's sheet comes back, plain, under the takings (their own panel), so the lanes do not show
// between the rush and the takings.
// What it shows is the viewer's own crate, and on a shared phone nothing of a stall's is drawn until the phone has been
// handed to its owner (daySheet.ts). Styles: daysheet.css.
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { FRUITS, stageAt, type FruitId } from '../../../engine/data';
import { crateCounts, type Crate, type GameState } from '../../../engine/game';
import * as A from '../../anim';
import { Fruit } from '../../art';
import { fx } from '../../fx';
import { StallBar, StallPanelView, autoCrate, boxKey, startingCrate } from '../../panel';
import { TIGHTEST, dayStep, fitSheet, onSheet, ownStep, type DayNow, type DayStep } from '../daySheet';
import { reachFrom, useReach } from '../reach';
import type { GameController } from '../useGameController';
import { SalesSummary } from './SalesSummary';

/** What the step rule needs, read from the game and its screen. */
export function dayNow(s: GameState, viewer: number, c: GameController, online: boolean): DayNow {
  return {
    phase: s.phase, busy: c.busy, myTurn: c.myBidTurn,
    opened: online ? !c.myBidTurn : s.stalls[viewer] !== null,
    mine: s.players[viewer]?.kind === 'human' && (online || c.humans.length === 1 || c.handedTo === viewer),
    bell: c.bell, rung: c.rung, rush: !!c.show, done: c.revealDone,
  };
}

/** Is the day's sheet on the table now? Stocking and the takings (the game table asks; the sheet works out its step). */
export const daySheetOn = (s: GameState, viewer: number, c: GameController, online: boolean): boolean =>
  onSheet(dayStep(dayNow(s, viewer, c, online)));

/**
 * Draws stocking so that everything on it is in view, by measuring: how tall the sheet's parts are at each step closer
 * (data-tight, daysheet.css) against the room the table's rows leave it (daySheet.ts fitSheet). The step is written on
 * the sheet itself; nothing is drawn again for it. It starts from the roomiest drawing every time, so a sheet that
 * gains room (the shelf dock grew smaller) is drawn roomier again.
 */
function fit(el: HTMLElement): void {
  delete el.dataset.tight;
  el.removeAttribute('data-over');
  el.removeAttribute('data-up');
  el.removeAttribute('data-top');
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
  // A first-game tip lies at the sheet's foot (--tip). On a small phone with a full shelf even the closest step does
  // not leave it that room: then, while the tip is up, the sheet also lies over the customers' tickets, which hold no
  // control (and each row of the sheet says what its fruit's customers want), at the roomiest step that fits there
  // (PLAN-091). Once the tip is closed the sheet is fitted again without it.
  if (!(parseFloat(el.style.getPropertyValue('--tip')) > 0) || el.scrollHeight <= el.clientHeight + 1) return;
  el.setAttribute('data-top', '');
  for (let t = 0; t <= TIGHTEST; t++) {
    if (t) el.dataset.tight = String(t);
    else delete el.dataset.tight;
    if (el.scrollHeight <= el.clientHeight) break;
  }
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
  // On a short phone the middle of the table is too low for stocking: there the sheet starts under the customers'
  // tickets and ends at the foot of your shelf (daysheet.css). The reach is measured from the rows themselves and
  // written on the sheet (reach.ts); on a taller phone the sheet keeps to the middle cell. Each time the rows have
  // been measured (they are laid out, or one changed its size) the sheet is fitted again.
  const fitting = useRef(false);
  useReach(root, 'row', true, true, (el) => { if (fitting.current) fit(el); });
  // While a first-game tip is up on a small phone, stocking may lie over the customers' tickets (fit, data-top): how
  // far the top of the customer band is above the middle is measured from the rows too, whenever one of them changes
  // its size, and written on the sheet.
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
      const rise = `${reachFrom({ mid: m, row: null, street: street.getBoundingClientRect(), beats: null, dock: null, notice: false }, 'street', false).rise}px`;
      if (el.style.getPropertyValue('--rise-full') === rise) return;
      el.style.setProperty('--rise-full', rise);
      if (fitting.current && el.hasAttribute('data-top')) fit(el);
    };
    const watch = new ResizeObserver(reach);
    for (const x of [game, mid, street]) watch.observe(x);
    return () => watch.disconnect();
  }, []);
  // The sheet only draws itself while this stall stocks; under the takings it lies plain.
  const step: DayStep = dayStep(dayNow(s, viewer, c, online)) ?? 'takings';
  const own = ownStep(step);
  const lies = own ? 'own' : 'rest';
  const shared = !online && c.humans.length > 1;

  // ---------- stocking: your crate, and the pieces on their way to it ----------
  const [crate, setCrate] = useState<Crate>(() => startingCrate(s, viewer));
  /** Pieces in the air on their way to the crate, by the box they came from: drawn in the crate when they land. */
  const [air, setAir] = useState<Record<string, number>>({});
  const landed: Crate = Object.fromEntries((Object.keys(crate) as FruitId[]).map((f) => [f, (crate[f] ?? []).map((n, pos) => Math.max(0, n - (air[boxKey(f, pos)] ?? 0)))]));
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
  // "Auto load" (the owner, 2026-11-13): every piece it adds slides from its shelf row into the crate, a moment apart.
  const loads = FRUITS.flatMap((f) => (autoCrate(s, viewer, crate)[f] ?? []).map((n, pos) => ({ f, pos, n: n - piece(crate, f, pos) }))).filter((x) => x.n > 0);
  const autoLoad = () => {
    if (!loads.length) return;
    fx.tap();
    setCrate(autoCrate(s, viewer, crate));
    const box = root.current?.querySelector('.ds-pcs');
    let i = 0;
    for (const { f, pos, n } of loads) {
      const key = boxKey(f, pos);
      const row = root.current?.querySelector(`.ds-srow[data-box="${key}"]`);
      const shelf = row?.querySelector('.x-fruit') ?? row;
      if (!shelf || !box) continue;
      setAir((a) => ({ ...a, [key]: (a[key] ?? 0) + n }));
      for (let k = 0; k < n; k++) {
        void A.fly(shelf, box, <Fruit id={f} size={22} stage={stageAt(f, pos)} />, {
          delay: i++ * A.BEAT.stock.gap, duration: A.BEAT.stock.fly, path: 'low', swell: false,
          onLand: () => setAir((a) => ({ ...a, [key]: Math.max(0, (a[key] ?? 0) - 1) })),
        });
      }
    }
  };

  // ---------- the room: every row, note and button in view before anything scrolls ----------
  fitting.current = own;
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    // The first-game tip for stocking lies at the sheet's foot: the sheet keeps that much room free under its last
    // line, so the tip covers no row and no stepper (PLAN-090), and is fitted with that room taken.
    const note = tip && own ? el.closest('.game')?.querySelector<HTMLElement>(':scope > .coach') : null;
    el.style.setProperty('--tip', note ? `${note.offsetHeight + 16}px` : '0px');
    // Where the sheet lay over the customers' tickets for the tip, it slides back to its place as the tip is closed.
    const was = el.hasAttribute('data-top') ? A.boxOf(el) : null;
    if (own) fit(el);
    else { delete el.dataset.tight; el.removeAttribute('data-over'); el.removeAttribute('data-up'); el.removeAttribute('data-top'); }
    if (was && !el.hasAttribute('data-top')) A.flipFrom(el, was, { duration: A.FEEL.sheetIn, easing: A.EASE.sheet });
  }, [step, tip]);

  return (
    <>
      <div class={`mid-panel sh-day ${lies}`} data-step={step} data-a="day-sheet" ref={root}>
        {own && <StallPanelView s={s} p={viewer} crate={crate} landed={landed} onStep={move} />}
      </div>
      {own && <StallBar total={total} onAuto={loads.length ? autoLoad : null} onSubmit={() => { fx.card(); c.act({ kind: 'stall', stall: crateCounts(crate), crate }); }} />}
      {/* The takings are their own panel, mounted over the sheet, which stays under them so the lanes do not show
          between the rush and the takings. */}
      {step === 'takings' && <SalesSummary s={s} viewer={viewer} shared={shared} />}
    </>
  );
}
