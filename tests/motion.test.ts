import { afterEach, describe, expect, it, vi } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import * as A from '../src/ui/anim';
import { NIGHT, NO_SALES_READ, bellLength, bellOpening } from '../src/ui/game/animator';
import { BEAT, CSS_MS, EASE, FEEL, FRAME, SPEED, type MotionRoot } from '../src/ui/motion';
import { SHEET, SHEET_IN, SHEET_OUT, sheetChange, sheetOn, type SheetGhost, type SheetPanel } from '../src/ui/sheet';

// PLAN-083, the shared motion blocks (flow study, review-18, F step 1): the lengths named in one place and one speed
// for scripts and stylesheets, the shared move with its lift-off and landing calls, the shared slide, and the sheet.

const read = (f: string) => readFileSync(f, 'utf8');
const sheets = readdirSync('src/ui').filter((f) => f.endsWith('.css')).map((f) => ({ f, css: read(`src/ui/${f}`) }));

/** A stand-in for the page, where the stylesheets read the speed and the lengths. */
function page() {
  const vars = new Map<string, string>();
  const root: MotionRoot = { style: { setProperty: (name, value) => { vars.set(name, value); } } };
  A.setMotionRoot(root);
  return vars;
}
/** Timers are faked; the player's motion setting is set per test. */
function clock(reducedMotion = false) {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: reducedMotion }));
  A.setBaseSpeed(false);
  A.resetHurry();
}
/** True once the promise has settled, checked without waiting for it. */
function settled(p: Promise<unknown>) {
  const state = { done: false };
  void p.then(() => { state.done = true; });
  return state;
}
afterEach(async () => {
  // let anything still in the air land, so one test's pieces are not counted in the next
  if (vi.isFakeTimers()) await vi.runAllTimersAsync();
  A.setLayer(null);
  A.setMotionRoot(null);
  A.setBaseSpeed(false);
  A.resetHurry();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the lengths are named in one place (motion.ts)', () => {
  it('the feel for new blocks is the flow study\'s: travel 320, coin 360, a card turn 280, a sheet 180 in and 120 out, a count 40 a step', () => {
    expect(FEEL).toMatchObject({ travel: 320, coin: 360, turn: 280, sheetIn: 180, sheetOut: 120, countStep: 40, countMax: 400 });
    expect(FEEL.read).toBeGreaterThanOrEqual(1000);
    expect(FEEL.read).toBeLessThanOrEqual(1200);
    expect(EASE.travel).toBe('cubic-bezier(.3, 0, .2, 1)');
    expect(EASE.sheet).toBe('cubic-bezier(.2, .8, .2, 1)');
  });

  it('the beats the game plays today keep their lengths', () => {
    expect(BEAT.piece).toEqual({ fly: 520, land: 300, gap: 90 });
    // the lorry (PLAN-085): it drives in, a crate for each fruit slides to its lane, it drives off; about 1.2 s
    expect(BEAT.lorry).toEqual({ drive: 300, crate: 360, gap: 120, off: 300 });
    expect(BEAT.lorry.drive + 3 * BEAT.lorry.gap + BEAT.lorry.crate).toBeLessThanOrEqual(1200);
    // a rival's whole buying turn is one beat of about a second (PLAN-085): the pause, then three pieces a little apart
    expect(BEAT.rival).toEqual({ pause: 380, pauseFast: 150, gap: 100 });
    expect(BEAT.rival.pause + 2 * BEAT.rival.gap + FEEL.travel).toBeLessThanOrEqual(1100);
    // the walk-ins turn face up one after another (PLAN-085)
    expect(BEAT.arrive).toEqual({ gap: 100 });
    // filling your crate: a piece slides between its shelf row and the crate in 260 ms (PLAN-085; flow study D3)
    expect(BEAT.stock.fly).toBe(260);
    expect([BEAT.label.read, BEAT.label.favourWon, BEAT.label.bonus, BEAT.label.float, BEAT.label.toast]).toEqual([1100, 800, 500, 1300, 2000]);
    // the bell (PLAN-085; flow study D3): it swings, each stall's row opens 180 ms after the one before, then 1.2 s to
    // read: about 2.6 s at four stalls; "No sales today" 1.1 s
    expect(BEAT.bell).toMatchObject({ swing: 300, gap: 180, lid: 220, read: 1200 });
    expect(BEAT.price.seal).toBe(200);
    expect(bellOpening(4)).toBe(300 + 3 * 180 + 220 + 280);
    expect(bellLength(4)).toBe(2540);
    expect(bellLength(6)).toBe(2900);
    expect(BEAT.tie).toEqual({ ask: 600, stamp: 180, pause: 600 });
    expect(NO_SALES_READ).toBe(1100);
    // the round table before the rush (PLAN-099): the crates travel to their seats as the table forms, as a piece
    // crosses the table, and glide when the pricing sheet comes or goes
    expect(BEAT.table).toEqual({ form: 320, glide: 240 });
    expect(BEAT.table.form).toBe(FEEL.travel);
    // the rush: the round table, at the flow study's pace (PLAN-084, PLAN-092: fruit by fruit, the tags turning to the next
    // fruit once a fruit's coins are back; rush.test.ts pins what a customer takes)
    expect(BEAT.rush).toEqual({ cardIn: 250, rows: 300, pieceGap: 80, coinGap: 60, fruit: 300, read: 1000, cardOut: 200, favour: 340 });
    // the night (PLAN-085): 2.5 s in all, the spoiled pieces tipping off as the slide ends
    expect(NIGHT).toMatchObject({ dusk: 400, slide: 900, settle: 80, read: 920, end: 200, spoil: 300, gap: 80, juiceCoin: 360 });
    expect(NIGHT.dusk + NIGHT.slide + NIGHT.settle + NIGHT.read + NIGHT.end).toBe(2500);
    expect(SPEED).toEqual({ fast: 0.55, hurry: 0.15, step: 0.15 });
  });

  it('every length is a whole number of ms above zero', () => {
    const all = [...Object.values(FEEL), ...Object.values(BEAT).flatMap((b) => Object.values(b)), ...Object.values(CSS_MS)];
    expect(all.length).toBeGreaterThan(50);
    for (const n of all) expect(Number.isInteger(n) && n > 0, String(n)).toBe(true);
  });

  it('the table\'s scripts and panels hold no lengths of their own', () => {
    const files = ['src/ui/anim.ts', 'src/ui/sheet.ts', 'src/ui/cashShown.ts', 'src/ui/panel.tsx', 'src/ui/Game.tsx', 'src/ui/game/animator.tsx', 'src/ui/game/rush.ts',
      'src/ui/game/useGameController.ts', 'src/ui/game/panels/NightShift.tsx', 'src/ui/game/panels/RushTable.tsx', 'src/ui/game/panels/ActionBar.tsx',
      // the round table before the rush (PLAN-099)
      'src/ui/game/tableBeats.ts', 'src/ui/game/tableNow.ts', 'src/ui/game/panels/DaySheet.tsx'];
    const bare = [/\b(?:wait|hold|held|pause|ms|moveMs|timer)\(\s*\d{2,}/, /\bduration:\s*\d{2,}/, /\bdelay:\s*\d{2,}/, /setTimeout\([^\n]*,\s*\d{2,}\s*\)/];
    const found = files.flatMap((f) => read(f).split('\n').map((l, i) => ({ at: `${f}:${i + 1}`, l })).filter((x) => !/^\s*(\/\/|\*|\/\*)/.test(x.l) && bare.some((re) => re.test(x.l))).map((x) => `${x.at}: ${x.l.trim()}`));
    expect(found).toEqual([]);
  });
});

describe('one speed for scripts and stylesheets', () => {
  it('the page carries every length the stylesheets use, and the speed', () => {
    clock();
    const vars = page();
    for (const [name, n] of Object.entries(CSS_MS)) expect(vars.get(`--t-${name}`)).toBe(`${n}ms`);
    expect(vars.get('--t-sheet-in')).toBe('180ms');
    expect(vars.get('--t-sheet-out')).toBe('120ms');
    expect(vars.get('--mk')).toBe('1');
  });

  it('"Fast rivals", a tap\'s hurry and a tap on a rush card all change the one number, for scripts and stylesheets at once', () => {
    clock();
    const vars = page();
    const same = () => expect(Number(vars.get('--mk'))).toBeCloseTo(A.speed(), 4);
    expect(A.speed()).toBe(1);
    A.setBaseSpeed(true);
    expect(A.speed()).toBe(0.55);
    expect(vars.get('--mk')).toBe('0.55');
    expect(A.isFast()).toBe(true);
    A.hurryUp();
    expect(A.speed()).toBeCloseTo(0.55 * 0.15, 6);
    same();
    A.resetHurry();
    expect(vars.get('--mk')).toBe('0.55');
    A.speedStep();
    expect(A.speed()).toBeCloseTo(0.55 * 0.15, 6);
    same();
    A.resetStep();
    A.setBaseSpeed(false);
    expect(vars.get('--mk')).toBe('1');
    A.hurryUp();
    expect(vars.get('--mk')).toBe('0.15');
    // a script's move and a script's reading pause take the same share of their length as the stylesheet's
    expect(A.moveMs(1000)).toBeCloseTo(150, 6);
    expect(A.held(1000)).toBeCloseTo(150, 6);
  });

  it('a pause while something moves follows the speed', async () => {
    clock();
    A.setBaseSpeed(true);
    const w = settled(A.wait(1000));
    await vi.advanceTimersByTimeAsync(549);
    expect(w.done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(w.done).toBe(true);
  });

  it('reduced motion: nothing travels (the speed for moves is 0, here and in the stylesheets) and every reading pause is kept', async () => {
    clock(true);
    const vars = page();
    expect(A.isReduced()).toBe(true);
    expect(vars.get('--mk')).toBe('0');
    expect(A.travel()).toBe(0);
    expect(A.moveMs(520)).toBe(0);
    expect(A.ms(520)).toBe(1);
    // a pause for a move is over at once ...
    const moved = settled(A.wait(5000));
    await vi.advanceTimersByTimeAsync(0);
    expect(moved.done).toBe(true);
    // ... a pause to read lasts its whole length ...
    expect(A.held(FEEL.read)).toBe(FEEL.read);
    const readIt = settled(A.hold(FEEL.read));
    await vi.advanceTimersByTimeAsync(FEEL.read - 1);
    expect(readIt.done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(readIt.done).toBe(true);
    // ... and so does the pause before a rival's turn
    const rival = settled(A.pause(BEAT.rival.pause));
    await vi.advanceTimersByTimeAsync(BEAT.rival.pause - 1);
    expect(rival.done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(rival.done).toBe(true);
    // the fast setting still shortens a reading pause, and a tap still ends one
    A.setBaseSpeed(true);
    expect(A.held(1000)).toBe(550);
    expect(vars.get('--mk')).toBe('0');
    const tapped = settled(A.hold(5000));
    A.hurryUp();
    await vi.advanceTimersByTimeAsync(0);
    expect(tapped.done).toBe(true);
  });

  it('the labels over a stall are pauses to read, so reduced motion keeps them (they used to shrink to a twentieth)', () => {
    const src = read('src/ui/game/animator.tsx');
    expect(src).toContain('A.hold(A.BEAT.label.read)');
    expect(src).toContain('A.hold(A.BEAT.label.favourWon)');
    expect(src).toContain('A.hold(A.BEAT.label.bonus)');
    expect(src).not.toMatch(/A\.wait\(A\.BEAT\.label/);
  });

  it('the stylesheets read the speed and the lengths under those names only', () => {
    const used = new Set<string>();
    for (const { css } of sheets) for (const m of css.matchAll(/var\(--t-([a-z-]+)/g)) used.add(m[1]);
    expect([...used].filter((name) => !(name in CSS_MS))).toEqual([]);
    for (const name of ['sheet-in', 'sheet-out', 'news-turn', 'rush-rows', 'sky', 'dusk', 'rise', 'rise-after', 'stamp']) expect(CSS_MS).toHaveProperty(name);
    // the two older names for the speed (the rush only, the night only) are gone
    const sources = [...sheets.map((s) => s.css), read('src/ui/game/panels/RushTable.tsx'), read('src/ui/game/panels/NightShift.tsx')].join('\n');
    expect(sources).not.toMatch(/--rs-k|--ns-k/);
    // the moves the stylesheets make on the table follow the one speed
    const motion = read('src/ui/motion.css');
    for (const sel of ['.tk-news-face']) {
      expect(motion).toMatch(new RegExp(`${sel.replace(/[.]/g, '\\.')}[^{]*\\{ (transition|animation)-duration: calc\\(var\\(--mk, 1\\) \\* var\\(--t-`));
    }
    // the rush has its own stylesheet (PLAN-084; the round table, PLAN-092): the tags turn up, and the stage comes and goes, at the one speed
    const rush = read('src/ui/rushTable.css');
    for (const name of ['rush-rows', 'sheet-in', 'sheet-out']) expect(rush).toContain(`calc(var(--mk, 1) * var(--t-${name}))`);
    expect(rush).not.toMatch(/(?:animation|transition)[^;{}]*\b\d+(?:\.\d+)?m?s\b/);
    const night = read('src/ui/ticket-ui.css');
    expect(night).toContain('animation: tk-dusk calc(var(--mk, 1) * var(--t-dusk))');
    expect(night).toContain('calc(var(--mk, 1) * var(--t-rise-after))');
    // motion.css comes after the table's other stylesheets, so its rules win
    const main = read('src/main.tsx');
    expect(main.indexOf("'./ui/motion.css'")).toBeGreaterThan(main.indexOf("'./ui/ticket-ui.css'"));
    expect(main.indexOf("'./ui/ticket-ui.css'")).toBeGreaterThan(main.indexOf("'./ui/ticket.css'"));
    expect(main.indexOf("'./ui/rushTable.css'")).toBeGreaterThan(main.indexOf("'./ui/motion.css'"));
  });
});

// ---------- the shared move ----------

interface FakeEl {
  key: string; className: string; textContent: string; isConnected: boolean; gone: boolean; kids: FakeEl[];
  moves: { frames: Keyframe[]; o: KeyframeAnimationOptions }[];
  getClientRects(): unknown[]; getBoundingClientRect(): { left: number; top: number; width: number; height: number };
  animate(frames: Keyframe[], o: KeyframeAnimationOptions): object; appendChild(c: FakeEl): FakeEl; remove(): void;
}
/** A table of named spots without a browser: enough of a page for the move to find, measure and draw on. `log`
 *  notes every measurement and every drawing in the order they happen. */
function table(spots: Record<string, [number, number, number, number]>) {
  const log: string[] = [];
  const el = (key: string, box: [number, number, number, number] = [0, 0, 0, 0]): FakeEl => {
    const e: FakeEl = {
      key, className: '', textContent: '', isConnected: true, gone: false, kids: [], moves: [],
      getClientRects: () => (box[2] > 0 ? [box] : []),
      getBoundingClientRect: () => { log.push(`measure ${key}`); return { left: box[0], top: box[1], width: box[2], height: box[3] }; },
      animate: (frames, o) => { e.moves.push({ frames, o }); return {}; },
      appendChild: (c) => { e.kids.push(c); return c; },
      remove: () => { e.gone = true; },
    };
    return e;
  };
  const named = new Map(Object.entries(spots).map(([k, box]) => [k, el(k, box)]));
  const drawn: FakeEl[] = [];
  const layer = el('layer', [0, 0, 390, 844]);
  layer.appendChild = (c) => { log.push('draw'); drawn.push(c); return c; };
  vi.stubGlobal('document', {
    querySelector: (sel: string) => named.get(/data-a="([^"]+)"/.exec(sel)?.[1] ?? '') ?? null,
    createElement: (tag: string) => el(tag),
  });
  A.setLayer(layer as unknown as HTMLElement);
  const inAir = () => drawn.filter((d) => !d.gone);
  return { log, drawn, inAir, spot: (k: string) => named.get(k)! };
}
const SPOTS: Record<string, [number, number, number, number]> = { box: [40, 400, 30, 30], shelf: [220, 730, 30, 30], cash: [330, 20, 40, 24], crate: [12, 340, 336, 40] };
/** The faked clock runs a 0 ms timer that was set while it was ticking one ms later. */
const TICK = 1;

describe('the shared move (anim.ts fly)', () => {
  it('calls on lift-off, then on landing, and resolves when the piece has landed', async () => {
    clock();
    const t = table(SPOTS);
    const calls: string[] = [];
    const done = settled(A.fly('box', 'shelf', 'x', { onLift: () => calls.push('lift'), onLand: () => calls.push('land') }));
    expect(calls).toEqual([]);
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toEqual(['lift']);
    expect(t.inAir().length).toBe(1);
    expect(A.inFlight()).toBe(1);
    await vi.advanceTimersByTimeAsync(BEAT.piece.fly + FRAME - 1);
    expect(calls).toEqual(['lift']);
    expect(done.done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toEqual(['lift', 'land']);
    expect(done.done).toBe(true);
    expect(t.inAir().length).toBe(0);
    expect(A.inFlight()).toBe(0);
  });

  it('a piece that waits its turn lifts off after the wait, not before', async () => {
    clock();
    table(SPOTS);
    const calls: string[] = [];
    void A.fly('box', 'shelf', 'x', { delay: 200, duration: 300, onLift: () => calls.push('lift'), onLand: () => calls.push('land') });
    await vi.advanceTimersByTimeAsync(199);
    expect(calls).toEqual([]);
    await vi.advanceTimersByTimeAsync(1 + TICK); // the wait ends; measuring is the next thing the page does
    expect(calls).toEqual(['lift']);
    await vi.advanceTimersByTimeAsync(300 + FRAME - 1);
    expect(calls).toEqual(['lift']);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toEqual(['lift', 'land']);
  });

  it('travels softly: the study\'s curve, position, size and fade only, and nothing stepped', async () => {
    clock();
    const t = table(SPOTS);
    void A.fly('box', 'shelf', 'x');
    await vi.advanceTimersByTimeAsync(0);
    const copy = t.drawn[0];
    expect(copy.className).toBe('sprite mv');
    expect(copy.kids[0].className).toBe('sprite-in');
    expect(copy.kids[0].textContent).toBe('x');
    const { frames, o } = copy.moves[0];
    expect(o).toMatchObject({ duration: BEAT.piece.fly, easing: 'cubic-bezier(.3, 0, .2, 1)', fill: 'forwards' });
    for (const f of frames) expect(Object.keys(f).sort()).toEqual(['offset', 'opacity', 'transform']);
    expect(JSON.stringify([frames, o])).not.toMatch(/steps\(/);
    // from the middle of the box to the middle of the shelf spot
    expect(frames[0].transform).toBe('translate(55.0px, 415.0px) scale(0.700)');
    expect(frames[frames.length - 1].transform).toBe('translate(235.0px, 745.0px) scale(0.800)');
    // the spot it lands on swells a little and settles, smoothly
    await vi.advanceTimersByTimeAsync(BEAT.piece.fly + FRAME);
    const swell = t.spot('shelf').moves[0];
    expect(swell.o.duration).toBe(BEAT.piece.land + 1);
    expect(swell.frames.map((f) => f.transform)).toEqual(['scale(1)', 'scale(1.100)', 'scale(1)']);
    expect(JSON.stringify(swell)).not.toMatch(/steps\(/);
    // a big spot swells by a few px, not by a tenth; and a caller can ask for no swell at all
    void A.fly('shelf', 'crate', 'x');
    void A.fly('box', 'cash', 'x', { swell: false });
    await vi.advanceTimersByTimeAsync(BEAT.piece.fly + FRAME);
    expect(t.spot('crate').moves[0].frames[1].transform).toBe('scale(1.018)');
    expect(t.spot('cash').moves).toEqual([]);
  });

  it('keeps the table\'s one speed: quicker on the fast setting, quicker still after a tap', async () => {
    clock();
    const t = table(SPOTS);
    A.setBaseSpeed(true);
    const fast = settled(A.fly('box', 'shelf', 'x'));
    await vi.advanceTimersByTimeAsync(0);
    expect(t.drawn[0].moves[0].o.duration).toBeCloseTo(BEAT.piece.fly * 0.55, 6);
    await vi.advanceTimersByTimeAsync(BEAT.piece.fly * 0.55 + FRAME);
    expect(fast.done).toBe(true);
    A.hurryUp();
    void A.fly('box', 'shelf', 'x', { duration: FEEL.travel });
    await vi.advanceTimersByTimeAsync(0);
    expect(t.drawn[1].moves[0].o.duration).toBeCloseTo(FEEL.travel * 0.55 * 0.15, 6);
  });

  it('at most 12 copies travel at once; one more is not drawn but still lifts off, takes its time and lands', async () => {
    clock();
    const t = table(SPOTS);
    expect(A.MAX_MOVING).toBe(12);
    let lifts = 0, lands = 0;
    const all = settled(Promise.all(Array.from({ length: 15 }, () => A.fly('box', 'shelf', 'x', { onLift: () => { lifts++; }, onLand: () => { lands++; } }))));
    await vi.advanceTimersByTimeAsync(0);
    expect(t.inAir().length).toBe(12);
    expect(A.inFlight()).toBe(12);
    expect(lifts).toBe(15);
    expect(lands).toBe(0);
    await vi.advanceTimersByTimeAsync(BEAT.piece.fly - 1);
    expect(lands).toBe(0);
    await vi.advanceTimersByTimeAsync(1 + FRAME);
    expect(lands).toBe(15);
    expect(all.done).toBe(true);
    expect(A.inFlight()).toBe(0);
    // and the table is free again
    void A.fly('box', 'shelf', 'x');
    await vi.advanceTimersByTimeAsync(0);
    expect(t.inAir().length).toBe(1);
  });

  it('when many move, the later copies are drawn without their shadow', async () => {
    clock();
    const t = table(SPOTS);
    for (let i = 0; i < 9; i++) void A.fly('box', 'shelf', 'x');
    await vi.advanceTimersByTimeAsync(0);
    expect(t.drawn.map((d) => d.className)).toEqual([...Array<string>(A.PLAIN_FROM).fill('sprite mv'), ...Array<string>(9 - A.PLAIN_FROM).fill('sprite mv plain')]);
    expect(read('src/ui/motion.css')).toContain('.fx-layer .sprite.plain { filter: none; }');
  });

  it('measures first, then moves: pieces that start together are all measured before any copy is drawn', async () => {
    clock();
    const t = table(SPOTS);
    for (const to of ['shelf', 'cash', 'shelf', 'cash']) void A.fly('box', to, 'x');
    await vi.advanceTimersByTimeAsync(0);
    const firstDraw = t.log.indexOf('draw');
    expect(t.log.filter((x) => x === 'draw').length).toBe(4);
    expect(t.log.slice(0, firstDraw).filter((x) => x.startsWith('measure')).length).toBe(9); // the layer once, and both ends of four flights
    expect(t.log.slice(firstDraw).filter((x) => x.startsWith('measure'))).toEqual([]);
    // nor is anything measured as they land
    t.log.length = 0;
    await vi.advanceTimersByTimeAsync(BEAT.piece.fly + FRAME);
    expect(t.log).toEqual([]);
  });

  it('reduced motion: nothing travels; both calls are made at once, so the state is simply shown', async () => {
    clock(true);
    const t = table(SPOTS);
    const calls: string[] = [];
    const done = A.fly('box', 'shelf', 'x', { delay: 400, onLift: () => calls.push('lift'), onLand: () => calls.push('land') });
    expect(calls).toEqual(['lift', 'land']);
    await done;
    expect(t.drawn.length).toBe(0);
    A.pulse('shelf');
    expect(t.spot('shelf').moves).toEqual([]);
  });

  it('a spot that is not on the screen, or no table at all: both calls are still made, and the move ends', async () => {
    clock();
    const t = table(SPOTS);
    const calls: string[] = [];
    await A.fly('box', 'nowhere', 'x', { onLift: () => calls.push('lift'), onLand: () => calls.push('land') });
    expect(calls).toEqual(['lift', 'land']);
    A.setLayer(null);
    await A.fly('box', 'shelf', 'x', { onLift: () => calls.push('lift'), onLand: () => calls.push('land') });
    expect(calls).toEqual(['lift', 'land', 'lift', 'land']);
    expect(t.drawn.length).toBe(0);
    // a spot that leaves the screen while its piece waits: the calls are made when its turn comes
    A.setLayer(t.spot('box') as unknown as HTMLElement); // any element will do as the layer here
    t.spot('shelf').isConnected = false;
    t.spot('shelf').getClientRects = () => [];
    const late = settled(A.fly('box', t.spot('shelf') as unknown as HTMLElement, 'x', { delay: 100, onLand: () => calls.push('late') }));
    await vi.advanceTimersByTimeAsync(100 + TICK);
    expect(late.done).toBe(true);
    expect(calls[calls.length - 1]).toBe('late');
  });
});

describe('the paths of the shared move (anim.ts flightFrames)', () => {
  const p0 = { x: 50, y: 400 }, p1 = { x: 250, y: 700 };
  const pts = (frames: Keyframe[]) => frames.map((f) => {
    const m = /translate\(([-\d.]+)px, ([-\d.]+)px\) scale\(([\d.]+)\)/.exec(String(f.transform))!;
    return { x: Number(m[1]), y: Number(m[2]), s: Number(m[3]), o: Number(f.opacity), at: Number(f.offset) };
  });
  /** The sharpest change of direction between two neighbouring pieces of the path, in degrees. */
  const sharpest = (q: { x: number; y: number }[]) => Math.max(...q.slice(2).map((c, i) => {
    const a = Math.atan2(q[i + 1].y - q[i].y, q[i + 1].x - q[i].x), b = Math.atan2(c.y - q[i + 1].y, c.x - q[i + 1].x);
    const d = Math.abs(b - a) * 180 / Math.PI;
    return d > 180 ? 360 - d : d;
  }));

  it('the arc: a curve that tops out above the higher spot, with no corner at the top', () => {
    const q = pts(A.flightFrames(p0, p1));
    expect(q[0]).toMatchObject({ x: 50, y: 400, at: 0 });
    expect(q[q.length - 1]).toMatchObject({ x: 250, y: 700, at: 1 });
    const rise = Math.min(120, 40 + Math.hypot(200, 300) * 0.25);
    const mid = q[(q.length - 1) / 2];
    expect(mid.at).toBe(0.5);
    expect(mid.x).toBeCloseTo(150, 0);
    // as high as the old flight went, and no higher; landing lower than it started, it is at its top before half way
    const top = Math.min(...q.map((f) => f.y));
    expect(top).toBeGreaterThanOrEqual(400 - rise);
    expect(top).toBeLessThan(400 - rise + 2);
    expect(q.findIndex((f) => f.y === top)).toBeLessThan((q.length - 1) / 2);
    // the other way (up to a higher spot) it tops out above that spot, after half way
    const back = pts(A.flightFrames(p1, p0));
    const topBack = Math.min(...back.map((f) => f.y));
    expect(topBack).toBeGreaterThanOrEqual(400 - rise);
    expect(topBack).toBeLessThan(400 - rise + 2);
    expect(back.findIndex((f) => f.y === topBack)).toBeGreaterThan((back.length - 1) / 2);
    // it grows as it rises and shrinks as it comes down
    expect(q[0].s).toBe(0.7);
    expect(mid.s).toBeCloseTo(1.3, 3);
    expect(q[q.length - 1].s).toBe(0.8);
    // the old flight was two straight lines with one corner at the top (over 100 degrees here); the curve turns a little at a time
    const old = sharpest([p0, { x: 150, y: 400 - rise }, p1]);
    expect(old).toBeGreaterThan(100);
    expect(sharpest(q)).toBeLessThan(old / 3);
    for (let i = 1; i < q.length; i++) expect(q[i].at).toBeGreaterThan(q[i - 1].at);
    expect(q.every((f) => f.o === 1)).toBe(true);
  });

  it('the low path rises less than the arc, and the flat path is a straight line along the table', () => {
    const top = (o: A.FlyOpts) => Math.min(...pts(A.flightFrames(p0, p1, o)).map((f) => f.y));
    expect(top({ path: 'low' })).toBeGreaterThan(top({}));
    expect(top({ path: 'low' })).toBeLessThan(400);
    const flat = pts(A.flightFrames(p0, p1, { path: 'flat' }));
    expect(flat).toEqual([{ x: 50, y: 400, s: 1, o: 1, at: 0 }, { x: 250, y: 700, s: 1, o: 1, at: 1 }]);
    // a chosen height and a chosen size at the end are kept
    expect(top({ arc: 10 })).toBeGreaterThanOrEqual(390);
    expect(top({ arc: 10 })).toBeLessThan(391);
    const small = pts(A.flightFrames(p0, p1, { endScale: 0.5 }));
    expect(small[small.length - 1].s).toBe(0.5);
  });

  it('a fade is over the last part of the way only', () => {
    const q = pts(A.flightFrames(p0, p1, { fade: true }));
    expect(q.filter((f) => f.at <= 0.75).every((f) => f.o === 1)).toBe(true);
    expect(q[q.length - 1].o).toBe(0);
    const flat = pts(A.flightFrames(p0, p1, { path: 'flat', fade: true }));
    expect(flat.map((f) => f.o)).toEqual([1, 1, 0]);
  });
});

describe('the shared slide (anim.ts boxOf, flipFrom, flipTo)', () => {
  const ticket = { left: 20, top: 100, width: 70, height: 140 };
  const card = { left: 12, top: 330, width: 366, height: 94 };
  const thing = (box: typeof card) => {
    const moves: { frames: Keyframe[]; o: KeyframeAnimationOptions }[] = [];
    return { moves, el: { getBoundingClientRect: () => box, animate: (frames: Keyframe[], o: KeyframeAnimationOptions) => { moves.push({ frames, o }); return {}; } } as unknown as HTMLElement };
  };

  it('works out the transform that draws a thing where it used to be', () => {
    const t = A.flipTransform(ticket, card);
    expect(t).toBe('translate(-140.0px, -207.0px) scale(0.1913, 1.4894)');
    // check it: scaled about the card's own middle and then moved, the card covers the ticket exactly
    const m = /translate\(([-\d.]+)px, ([-\d.]+)px\) scale\(([\d.]+), ([\d.]+)\)/.exec(t)!.slice(1).map(Number);
    const cx = card.left + card.width / 2 + m[0], cy = card.top + card.height / 2 + m[1];
    expect(cx - card.width * m[2] / 2).toBeCloseTo(ticket.left, 0);
    expect(cy - card.height * m[3] / 2).toBeCloseTo(ticket.top, 0);
    expect(A.flipTransform(card, card)).toBe('translate(0.0px, 0.0px) scale(1.0000, 1.0000)');
  });

  it('slides a thing in from where it was, and away to another place, at the table\'s speed', () => {
    clock();
    const a = thing(card);
    A.flipFrom(a.el, ticket, { duration: BEAT.rush.cardIn });
    expect(a.moves[0].frames).toEqual([{ transform: A.flipTransform(ticket, card) }, { transform: 'none' }]);
    expect(a.moves[0].o).toEqual({ duration: BEAT.rush.cardIn + 1, easing: EASE.travel, fill: 'backwards' });
    A.setBaseSpeed(true);
    A.flipTo(a.el, ticket, { duration: BEAT.rush.cardOut });
    expect(a.moves[1].frames).toEqual([{ transform: 'none' }, { transform: A.flipTransform(ticket, card) }]);
    expect(a.moves[1].o).toEqual({ duration: BEAT.rush.cardOut * 0.55 + 1, easing: EASE.leave, fill: 'forwards' });
  });

  it('does nothing when there is no old place, when the thing is not on the screen, or with reduced motion', () => {
    clock();
    const a = thing(card);
    A.flipFrom(a.el, null);
    A.flipFrom(null, ticket);
    A.flipFrom(thing({ left: 0, top: 0, width: 0, height: 0 }).el, ticket);
    expect(a.moves).toEqual([]);
    expect(A.boxOf(null)).toBeNull();
    expect(A.boxOf(a.el)).toEqual(card);
    clock(true);
    A.flipFrom(a.el, ticket);
    A.flipTo(a.el, ticket);
    expect(a.moves).toEqual([]);
  });

  it('the rush uses it for the customer coming to the round table and going back (it was written out once, in the rush only)', () => {
    const src = read('src/ui/game/panels/RushTable.tsx');
    expect(src).toContain('A.flipFrom(el.current, ticket()');
    expect(src).toContain('A.flipTo(el.current, ticket()');
    expect(src).not.toMatch(/\.animate\(/);
  });
});

describe('no stepped landings or pops', () => {
  it('the landing, the stamp, the old card pop and the results\' places are smooth', () => {
    expect(read('src/ui/anim.ts')).not.toMatch(/steps\(\d/);
    const css = read('src/ui/styles.css');
    const rule = (sel: string) => css.split('\n').find((l) => l.startsWith(sel))!;
    for (const sel of ['.morning-card, .sales-card, .auction {', '.phase-banner {']) {
      expect(rule(sel)).toMatch(/animation: /);
      expect(rule(sel)).not.toMatch(/steps\(/);
    }
    expect(rule('.phase-banner {')).toContain('animation: banner var(--t-stamp) ease-out forwards');
    // The results' places: the first results' ".pod" rule is gone with that screen (PLAN-091); the places of the
    // results today (stampbook.css, .sbk-pod) are not animated by the stylesheet at all, so nothing there can step.
    expect(css).not.toMatch(/^\.pod\b/m);
    const book = read('src/ui/stampbook.css');
    expect(book).not.toMatch(/steps\(/);
    expect(book).not.toMatch(/animation\s*:/);
  });

  it('with reduced motion the "LAST DAY" stamp is simply there (it used to stay invisible)', () => {
    expect(read('src/ui/motion.css')).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.phase-banner \{ opacity: 1; \}/);
  });
});

// ---------- the sheet ----------

type Panel = SheetPanel & { slides: { frames: Keyframe[]; o: KeyframeAnimationOptions }[] };
const panel = (className: string): Panel => {
  const slides: Panel['slides'] = [];
  const cls = className.split(' ');
  return { className, slides, animate: (frames, o) => { slides.push({ frames, o }); return {}; }, matches: (sel) => sel.split(',').some((s) => cls.includes(s.trim().slice(1))) };
};
/** A stand-in for the place where the picture of a panel that has left is kept. */
function pictures() {
  const g = {
    did: [] as string[], of: null as Panel | null,
    keep(p: Panel) { g.did.push(`keep ${p.className}`); g.of = p; return true; },
    leave(ms: number) { g.did.push(`leave ${ms}`); },
    stay() { g.did.push('stay'); return g.of; },
    clear() { g.did.push('clear'); g.of = null; },
  };
  return g as typeof g & SheetGhost<Panel>;
}

describe('the sheet: the middle panel slides onto the table and off again (sheet.ts)', () => {
  const morning = () => panel('morning-card tk-morning');
  const stall = () => panel('price-panel stall-panel mid-panel tk-panel');
  const price = () => panel('price-panel mid-panel tk-panel');

  it('a panel slides in over 180 ms on the study\'s curve, by position and fade only', () => {
    clock();
    const now = morning();
    expect(sheetChange(null, now, pictures())).toBe(0);
    expect(now.slides).toEqual([{ frames: SHEET_IN, o: { duration: 180, easing: 'cubic-bezier(.2, .8, .2, 1)' } }]);
    for (const f of [...SHEET_IN, ...SHEET_OUT]) expect(Object.keys(f).sort()).toEqual(['opacity', 'transform']);
    expect(SHEET_IN[1]).toEqual({ opacity: 1, transform: 'none' });
    expect(SHEET_OUT[0]).toEqual({ opacity: 1, transform: 'none' });
    expect(JSON.stringify([SHEET_IN, SHEET_OUT])).not.toMatch(/scale|rotate|steps/);
  });

  it('a panel that leaves with nothing in its place slides off over 120 ms, as a picture; a timer takes the picture away', () => {
    clock();
    const g = pictures();
    const was = morning();
    expect(sheetChange(was, null, g)).toBe(120 + FRAME);
    expect(g.did).toEqual(['keep morning-card tk-morning', 'leave 120']);
    expect(was.slides).toEqual([]);
  });

  it('one panel in another\'s place: the old picture lies still underneath while the new panel slides in', () => {
    clock();
    const g = pictures();
    const now = price();
    expect(sheetChange(stall(), now, g)).toBe(180 + FRAME);
    expect(g.did).toEqual(['keep price-panel stall-panel mid-panel tk-panel']);
    expect(now.slides.length).toBe(1);
  });

  it('a new panel a moment after the old one left: the old picture stops sliding off and stays under it (no flash of the lanes)', () => {
    clock();
    const g = pictures();
    sheetChange(stall(), null, g);
    const now = price();
    expect(sheetChange(null, now, g)).toBe(180 + FRAME);
    expect(g.did).toEqual(['keep price-panel stall-panel mid-panel tk-panel', 'leave 120', 'stay']);
    expect(now.slides.length).toBe(1);
  });

  it('the same panel back after a frame or two away (the table was busy) is simply there again: it does not slide in twice', () => {
    clock();
    const g = pictures();
    sheetChange(price(), null, g);
    const back = price();
    expect(sheetChange(null, back, g)).toBe(180 + FRAME);
    expect(back.slides).toEqual([]);
    // and the same when it is redrawn in one go
    const again = price();
    sheetChange(back, again, g);
    expect(again.slides).toEqual([]);
  });

  it('keeps the table\'s one speed', () => {
    clock();
    A.setBaseSpeed(true);
    const g = pictures();
    const now = morning();
    sheetChange(null, now, g);
    expect(now.slides[0].o.duration).toBeCloseTo(99, 6);
    expect(sheetChange(now, null, g)).toBeCloseTo(66 + FRAME, 6);
    expect(g.did[g.did.length - 1]).toMatch(/^leave 66/);
  });

  it('reduced motion: no travel. The panel is shown at once and taken away at once, and no picture is kept', () => {
    clock(true);
    const g = pictures();
    const now = morning();
    expect(sheetChange(null, now, g)).toBe(0);
    expect(sheetChange(now, null, g)).toBe(0);
    expect(sheetChange(stall(), price(), g)).toBe(0);
    expect(now.slides).toEqual([]);
    expect(g.did).toEqual(['clear', 'clear', 'clear']);
  });

  it('without a place for the picture (an old browser, or before it is ready) a panel still slides in and simply goes', () => {
    clock();
    const now = morning();
    expect(sheetChange(stall(), now, null)).toBe(0);
    expect(now.slides.length).toBe(1);
    expect(sheetChange(now, null, null)).toBe(0);
  });

  it('the night keeps its own beat (dusk falls): it does not slide in by this rule, and no picture of it is kept', () => {
    clock();
    const g = pictures();
    const night = panel('mid-panel night-shift tk-night');
    expect(sheetChange(null, night, g)).toBe(0);
    expect(night.slides).toEqual([]);
    // drawn afresh as the day changes, then gone at dawn: nothing is kept either time
    const next = panel('mid-panel night-shift tk-night');
    expect(sheetChange(night, next, g)).toBe(0);
    expect(sheetChange(next, null, g)).toBe(0);
    expect(next.slides).toEqual([]);
    expect(g.did.filter((x) => x !== 'clear' && x !== 'stay')).toEqual([]);
  });

  it('finds the middle panel among the children of .centre, whichever panel it is', () => {
    const child = (cls: string) => ({ matches: (sel: string) => sel.split(',').some((s) => cls.split(' ').includes(s.trim().slice(1))) });
    const market = child('market-stall tk-market'), host = child('tk-sheet'), lock = child('pp-lock');
    const centre = (...kids: object[]) => ({ children: kids }) as unknown as Element;
    expect(sheetOn(centre(market, host))).toBeNull();
    expect(sheetOn(null)).toBeNull();
    for (const cls of ['morning-card tk-morning', 'morning-card trait-pick', 'sales-card', 'mid-panel tk-bell', 'price-panel stall-panel mid-panel tk-panel', 'mid-panel mid-evening', 'mid-panel night-shift tk-night']) {
      const p = child(cls);
      expect(sheetOn(centre(market, host, p, lock))).toBe(p);
    }
    expect(SHEET).toBe('.mid-panel, .morning-card, .sales-card');
  });

  it('every middle panel the table draws carries one of the sheet\'s classes', () => {
    const roots = [
      ['src/ui/game/panels/MorningCard.tsx', /<div class=\{`morning-card /], ['src/ui/game/panels/TraitPick.tsx', /<div class="morning-card /],
      // PLAN-085: stocking, pricing, the bell, the Favoured Trade question and the takings are steps of one sheet
      ['src/ui/game/panels/DaySheet.tsx', /<div class=\{`mid-panel sh-day /],
      ['src/ui/game/panels/OrderPanel.tsx', /class="[^"]*\bmid-panel\b/], ['src/ui/game/panels/NightShift.tsx', /class="mid-panel night-shift/],
      // PLAN-084: the evening's sheet is drawn in panel.tsx with its own buttons (it was a wrapper in Game.tsx)
      ['src/ui/panel.tsx', /<div class="mid-panel mid-evening /],
    ] as const;
    for (const [f, re] of roots) expect(read(f), f).toMatch(re);
  });

  it('the table underneath is not touched: the picture\'s place lies in the panels\' own cell, takes no taps and has no size of its own', () => {
    const game = read('src/ui/Game.tsx');
    expect(game).toMatch(/<div class=\{`centre \$\{mid \? 'covered' : ''\}`\} ref=\{sheet\.centre\}>/);
    expect(game).toContain('<div class="tk-sheet" ref={sheet.host} aria-hidden="true" />');
    const css = read('src/ui/motion.css');
    const rule = css.slice(css.indexOf('#app .tkt > .centre > .tk-sheet, '), css.indexOf('}', css.indexOf('#app .tkt > .centre > .tk-sheet, ')));
    for (const part of ['all: unset', 'grid-area: mid', 'z-index: 3', 'pointer-events: none', 'min-height: 0']) expect(rule).toContain(part);
    expect(rule).not.toMatch(/(?<![-\w])(height|width|margin|padding):/);
    // the panels lie above it (ticket.css) and the picture is out of reach of the page
    expect(read('src/ui/ticket.css')).toContain('#app .tkt > .centre > .mid-panel, #app .tkt > .centre > .morning-card, #app .tkt > .centre > .sales-card { z-index: 4;');
    const sheet = read('src/ui/sheet.ts');
    expect(sheet).toContain("attachShadow({ mode: 'closed' })");
    expect(sheet).toContain("host.setAttribute('inert', '')");
    // nothing waits for a slide: no animation event or promise is listened to, here or in the move
    for (const f of ['src/ui/sheet.ts', 'src/ui/anim.ts']) expect(read(f)).not.toMatch(/\.finished|onfinish|animationend|transitionend/);
  });
});
