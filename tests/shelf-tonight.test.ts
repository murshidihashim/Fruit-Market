import { describe, expect, it, vi } from 'vitest';
import { h } from 'preact';
import { aiActFor } from '../src/engine/ai';
import { EVENT_CARDS, FRUITS, RIVALS, stageAt, type FruitId, type Stage } from '../src/engine/data';
import { activePlayer, applyAction, count, leavingTonight, newGame, nightOutlook, publicView, type GameState } from '../src/engine/game';
import { redact } from '../server/room';
import { toStaticHtml } from '../src/ui/cards';
import { MyStall, RivalDrop, RivalStall, Stalls } from '../src/ui/table';
import { shelfChips } from '../src/ui/tableModel';

// PLAN-085, the stalls row and your shelf, checked against the game itself. The shelf's chips ("okay tomorrow",
// "spoils tonight") are worked out on the screen's side (tableModel.shelfChips); the night is the engine's. These
// tests hold the two together: what the chips promise is what the engine forecasts (leavingTonight, nightOutlook) and
// what the night then does, on plain nights, in a Heatwave, in a Monsoon, under a Shade Cloth and with a Juice Bar.
// And a rival's box draws nothing of its shelf beyond today's buys.

// The stall boxes redraw when cash or fruit lands (hooks); here they are drawn once, as plain text, so the hooks are
// stood in for: a state holds its first value and nothing is scheduled.
vi.mock('preact/hooks', () => ({
  useState: (v: unknown) => [typeof v === 'function' ? (v as () => unknown)() : v, () => undefined],
  useEffect: () => undefined, useLayoutEffect: () => undefined,
  useRef: (v: unknown) => ({ current: v }), useMemo: (f: () => unknown) => f(), useCallback: (f: unknown) => f,
}));

const start = (stalls: number, seed: number): GameState => newGame({
  players: Array.from({ length: stalls }, (_, i) => ({ name: i ? RIVALS[i].name : 'Me', kind: i ? 'ai' as const : 'human' as const, level: 'normal' as const, avatar: RIVALS[i].avatar })),
  days: 10, unripe: true, upgrades: true, events: true, seed,
});

/** One step of a game with every stall played by the computer. */
function step(s: GameState): GameState {
  if (s.phase === 'morning') {
    const pick = s.players.findIndex((x) => x.traitOffer && !x.trait);
    return pick >= 0 ? applyAction(s, pick, { kind: 'trait', trait: s.players[pick].traitOffer![0] }) : applyAction(s, 0, { kind: 'begin' });
  }
  if (s.phase === 'reveal') return applyAction(s, 0, { kind: 'finish' });
  const next = aiActFor(s, activePlayer(s));
  if (!next) throw new Error(`no move in ${s.phase}`);
  return next;
}

/** A shelf counted by fruit and box letter: "apple fresh" -> 2. */
function byLetter(stock: Record<FruitId, number[]>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of FRUITS) stock[f].forEach((n, pos) => { if (n > 0) { const k = `${f} ${stageAt(f, pos)}`; out[k] = (out[k] ?? 0) + n; } });
  return out;
}

/** Is this box letter a ripe one (fresh, okay or soft)? */
const ripe = (st: Stage) => st !== 'unripe';

/**
 * What the chips of stall `p` promise, read from their words: the pieces that leave, by fruit; the juice and the
 * spoiled; and tomorrow's shelf, by fruit and box letter. A chip that says "ripe tomorrow" promises a ripe piece and
 * names no letter (two green pieces can ripen into different boxes on a Heatwave night), so those are counted apart.
 */
function promised(s: GameState, p: number) {
  const gone = Object.fromEntries(FRUITS.map((f) => [f, 0])) as Record<FruitId, number>;
  const letters: Record<string, number> = {};
  const ripens = Object.fromEntries(FRUITS.map((f) => [f, 0])) as Record<FruitId, number>;
  let juice = 0, spoil = 0, today = 0;
  for (const { f, chips } of shelfChips(s, p)) for (const c of chips) {
    today += c.n;
    if (c.gone) { gone[f] += c.n; if (c.words === 'juice tonight') juice += c.n; else spoil += c.n; }
    else if (c.words === 'ripe tomorrow') ripens[f] += c.n;
    else if (c.next) { const k = `${f} ${c.next}`; letters[k] = (letters[k] ?? 0) + c.n; }
  }
  return { gone, juice, spoil, letters, ripens, today };
}

/** Does the shelf of the next morning hold what the chips promised? Returns what does not fit, or nothing. */
function broken(said: ReturnType<typeof promised>, after: Record<FruitId, number[]>): string[] {
  const real = byLetter(after);
  const out: string[] = [];
  for (const f of FRUITS) {
    let spare = 0;
    for (const st of ['fresh', 'okay', 'notso', 'unripe'] as Stage[]) {
      const k = `${f} ${st}`;
      const more = (real[k] ?? 0) - (said.letters[k] ?? 0);
      if (more < 0 || (!ripe(st) && more !== 0)) out.push(`${k}: said ${said.letters[k] ?? 0}, is ${real[k] ?? 0}`);
      if (ripe(st)) spare += more;
    }
    if (spare !== said.ripens[f]) out.push(`${f}: ${said.ripens[f]} said to ripen, ${spare} did`);
  }
  return out;
}

describe('your shelf: the chips say what the night does (tableModel.shelfChips against the engine)', () => {
  it('in whole games with 2, 4 and 6 stalls, every evening: the chips agree with the forecast and with the shelf the next morning', () => {
    const seen = { nights: 0, heatwave: 0, monsoon: 0, shade: 0, juice: 0, spoil: 0 };
    for (const stalls of [2, 4, 6]) for (const seed of [11, 12, 13, 14, 15, 16]) {
      let s = start(stalls, seed);
      // every other game, the person's stall has the Shade Cloth (set by hand; the night that follows is the engine's)
      if (seed % 2 === 0) s.players[0].trait = 'keeper';
      for (let i = 0; i < 20000 && s.phase !== 'over'; i++) {
        const next = step(s);
        // every chip is a piece on the shelf, at every moment of the day
        for (let p = 0; p < stalls; p++) expect(promised(s, p).today).toBe(count(s.players[p].stock));
        // the step that ends the day (the last stall's Lights out, or the day's end when no stall has an evening)
        if (next.day === s.day + 1) {
          seen.nights++;
          if (s.event?.id === 'heatwave') seen.heatwave++;
          if (s.event?.id === 'monsoon') seen.monsoon++;
          for (let p = 0; p < stalls; p++) {
            const said = promised(s, p);
            const at = `seed ${seed}, ${stalls} stalls, day ${s.day}, stall ${p}`;
            expect(said.gone, at).toEqual(leavingTonight(s, p));
            expect({ juice: said.juice, spoil: said.spoil }, at).toEqual({ juice: nightOutlook(s, p).juice, spoil: nightOutlook(s, p).spoil });
            // (a computer stall's Shade Cloth is picked afresh at night, so only its forecast is held to the chips)
            if (s.players[p].kind === 'human' || s.players[p].trait !== 'keeper') expect(broken(said, next.players[p].stock), at).toEqual([]);
            if (s.players[p].trait === 'keeper' && count(s.players[p].stock) > 0) seen.shade++;
            seen.juice += said.juice;
            seen.spoil += said.spoil;
          }
        }
        s = next;
      }
    }
    // the games played covered every kind of night the chips have words for
    expect(seen.nights).toBeGreaterThan(100);
    for (const k of ['heatwave', 'monsoon', 'shade', 'juice', 'spoil'] as const) expect(seen[k], k).toBeGreaterThan(0);
  });

  it('a Heatwave, a Monsoon, a Shade Cloth and a Juice Bar on one full shelf: the chips match the engine\'s forecast', () => {
    const base = start(4, 11);
    const full = (g: GameState) => { for (const f of FRUITS) g.players[0].stock[f] = g.players[0].stock[f].map((_, pos) => (pos % 2 ? 2 : 1)); return g; };
    const event = (id: string) => EVENT_CARDS.find((e) => e.id === id)!;
    const cases: [string, (g: GameState) => void][] = [
      ['a plain night', (g) => { g.event = null; }],
      ['a Heatwave', (g) => { g.event = event('heatwave'); }],
      ['a Monsoon', (g) => { g.event = event('monsoon'); }],
      ['a Shade Cloth on mango', (g) => { g.event = null; g.players[0].trait = 'keeper'; g.players[0].shade = 'mango'; }],
      ['a Shade Cloth not chosen yet, in a Heatwave', (g) => { g.event = event('heatwave'); g.players[0].trait = 'keeper'; g.players[0].shade = undefined; }],
      ['a Juice Bar in a Heatwave', (g) => { g.event = event('heatwave'); if (!g.players[0].upgrades.includes('juicebar')) g.players[0].upgrades.push('juicebar'); }],
    ];
    for (const [name, set] of cases) {
      const g = full(structuredClone(base));
      set(g);
      const said = promised(g, 0);
      expect(said.gone, name).toEqual(leavingTonight(g, 0));
      expect({ juice: said.juice, spoil: said.spoil }, name).toEqual({ juice: nightOutlook(g, 0).juice, spoil: nightOutlook(g, 0).spoil });
    }
  });

  it('on the final day no night follows: no chip says "tomorrow" or "tonight"', () => {
    const g = structuredClone(start(4, 11));
    g.day = g.config.days;
    g.players[0].stock.apple[0] = 2;
    const words = shelfChips(g, 0).flatMap((x) => x.chips.map((c) => c.words));
    expect(words).toEqual(['Soft']);
    expect(toStaticHtml(h(MyStall, { s: g, p: 0 }))).not.toMatch(/tomorrow|tonight</);
  });
});

describe('a rival\'s shelf stays secret (table.tsx RivalStall, RivalDrop, Stalls)', () => {
  /** A day at each beat, with old fruit on stall 1's shelf that it did not buy today. */
  function days(): GameState[] {
    const out: GameState[] = [];
    let s = start(4, 13);
    const seen = new Set<string>();
    for (let i = 0; i < 20000 && s.phase !== 'over' && s.day <= 4; i++) {
      const key = `${s.day}-${s.phase}`;
      if (s.day >= 2 && !seen.has(key) && count(s.players[1].stock) > 0) { seen.add(key); out.push(s); }
      s = step(s);
    }
    return out;
  }

  const box = (g: GameState) => toStaticHtml(h(RivalStall, { s: g, p: 1, onOpen: () => undefined })) + toStaticHtml(h(RivalDrop, { s: g, p: 1, onClose: () => undefined }));
  const row = (g: GameState) => toStaticHtml(h(Stalls, { s: g, viewer: 0, boards: {}, open: 1, onOpen: () => undefined, onClose: () => undefined, off: [] }));

  it('the box and the pop-up do not change with what the rival holds on its shelf, at any beat of the day', () => {
    const all = days();
    for (const phase of ['buy', 'stall', 'bid', 'reveal', 'evening']) expect(all.map((s) => s.phase)).toContain(phase);
    for (const s of all) {
      // the same moment with a different shelf behind stall 1 (today's buys, crate and prices are as they were)
      const other = structuredClone(s);
      for (const f of FRUITS) other.players[1].stock[f] = other.players[1].stock[f].map((_, pos) => (f === 'apple' && pos === 0 ? count(s.players[1].stock) + 3 : 0));
      expect(count(other.players[1].stock)).not.toBe(count(s.players[1].stock));
      expect(box(other), `${s.phase} day ${s.day}`).toBe(box(s));
      expect(row(other), `${s.phase} day ${s.day}`).toBe(row(s));
    }
  });

  it('the row drawn from the whole game is the row drawn from what one phone may know (the table\'s public view, and online)', () => {
    for (const s of days()) {
      expect(row(publicView(s, 0)), `${s.phase} day ${s.day}`).toBe(row(s));
      expect(row(redact(s, 0)), `${s.phase} day ${s.day}, online`).toBe(row(s));
    }
  });
});
