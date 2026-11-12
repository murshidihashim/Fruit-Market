import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { h } from 'preact';
import { FRUIT, JAM_PRICE, LAST_CALL_BONUS, type FruitId } from '../src/engine/data';
import { aiStep } from '../src/engine/ai';
import { beginBuying, count, finishReveal, newGame, type GameConfig, type GameState } from '../src/engine/game';
import { closingNote, dayLedger, jamDue, standing, withJamPaid } from '../src/engine/story';
import { toStaticHtml } from '../src/ui/cards';
import { SalesSummary } from '../src/ui/game/panels/SalesSummary';
import { MyStall } from '../src/ui/table';

// Closing Day (REP-089 3.1): the jam maker pays JAM_PRICE for each ripe leftover (RULES.md, approved in REP-032/033).
// The morning card, the shelf chip, the Stocking note and the final sales card must say what the night will pay.

const FRESH = (f: FruitId) => FRUIT[f].ripe.length - 1;
const GREEN = (f: FruitId) => FRUIT[f].ripe.length;

const cfg = (seed: number, players = 2, extra: Partial<GameConfig> = {}): GameConfig => ({
  players: Array.from({ length: players }, (_, i) => ({ name: `A${i}`, kind: 'ai' as const, level: 'normal' as const, avatar: 'a' })),
  days: 8, unripe: true, upgrades: true, events: false, seed, ...extra,
});

/** Play computer games forward until `stop` holds. */
function until(s: GameState, stop: (s: GameState) => boolean): GameState {
  for (let guard = 0; !stop(s) && guard < 5000; guard++) {
    if (s.phase === 'morning') s = beginBuying(s);
    else if (s.phase === 'reveal') s = finishReveal(s);
    else s = aiStep(s)!;
  }
  expect(stop(s)).toBe(true);
  return s;
}
const finalRush = (s: GameState) => s.day === s.config.days && s.phase === 'reveal';

/** The final day's rush is over; player 0's shelf is replaced by `ripe` fresh apples and `green` green mangoes. */
function closing(extra: Partial<GameConfig>, ripe: number, green = 0): GameState {
  const s = structuredClone(until(newGame(cfg(2, 2, extra)), finalRush));
  const st = s.players[0].stock;
  for (const f of Object.keys(st) as FruitId[]) st[f] = st[f].map(() => 0);
  st.apple[FRESH('apple')] = ripe;
  st.mango[GREEN('mango')] = green;
  return s;
}

describe('Closing Day words', () => {
  it('the shelf chip on your stall says what leftovers are worth tonight (MyStall)', () => {
    const shelf = (s: GameState) => toStaticHtml(h(MyStall, { s, p: 0 }));
    expect(shelf(closing({}, 2))).toContain(`>Leftovers = $${JAM_PRICE} each</span>`);
    expect(shelf(closing({}, 2))).not.toContain('Unsold = $0');
    expect(shelf(closing({}, 1, 3))).toContain(`>Ripe leftovers = $${JAM_PRICE} each</span>`);
    expect(shelf(closing({ marketDays: false }, 2))).toContain('>Unsold = $0</span>');
    expect(shelf(closing({}, 0))).not.toContain('zero-warn');
  });

  it('on Closing Day ripe leftovers are worth the jam price, everywhere it is said', () => {
    const n = closingNote(closing({}, 2), 0)!;
    expect(n.morning).toBe(`Closing Day: the jam maker pays $${JAM_PRICE} for each ripe piece you have left tonight.`);
    expect(n.chip).toBe(`Leftovers = $${JAM_PRICE} each`);
    expect(n.stocking).toBe(`Closing Day: ripe fruit left tonight goes to the jam maker at $${JAM_PRICE} each.`);
    expect(n.each).toBe(JAM_PRICE);
    for (const t of [n.morning, n.chip, n.stocking]) expect(t).not.toMatch(/\$0/);
  });

  it('with Closing Day switched off every leftover is worth $0, and the jam maker is never mentioned', () => {
    const n = closingNote(closing({ marketDays: false }, 2), 0)!;
    expect(n).toEqual({
      morning: 'Last day: anything unsold tonight is worth $0.', chip: 'Unsold = $0',
      stocking: 'Last day: anything unsold tonight is worth $0.', each: 0,
    });
  });

  it('green fruit is worth $0 even on Closing Day', () => {
    const n = closingNote(closing({}, 0, 3), 0)!;
    expect(n.chip).toBe('Unsold = $0');
    expect(n.morning).toBe('Green fruit left tonight is worth $0: the jam maker buys ripe fruit only.');
    expect(n.stocking).toMatch(/Green fruit left tonight is worth \$0/);
    expect(n.each).toBe(0);
    // ripe and green together: the chip names ripe fruit, since the jam maker pays nothing for the green ones
    const mixed = closing({}, 1, 3);
    expect(closingNote(mixed, 0)!.chip).toBe(`Ripe leftovers = $${JAM_PRICE} each`);
    expect(finishReveal(mixed).jam?.[0]).toBe(1 * JAM_PRICE);
  });

  it('an empty shelf shows no morning line or chip; nothing before the final day or after the game', () => {
    const empty = closingNote(closing({}, 0), 0)!;
    expect(empty.morning).toBeNull();
    expect(empty.chip).toBeNull();
    expect(empty.stocking).toMatch(/jam maker/);
    expect(closingNote(until(newGame(cfg(3)), (s) => s.day === 4), 0)).toBeNull();
    expect(closingNote(finishReveal(closing({}, 2)), 0)).toBeNull();
  });

  it('says what the night really pays, in seeded games with Closing Day on and off', () => {
    let paid = 0;
    for (const extra of [{}, { marketDays: false }] as Partial<GameConfig>[]) {
      for (let seed = 1; seed <= 12; seed++) {
        const s = until(newGame(cfg(seed, 2 + (seed % 3), { ...extra, events: true })), finalRush);
        const after = finishReveal(s);
        s.players.forEach((pl, p) => {
          const delta = after.players[p].cash - pl.cash;
          const note = closingNote(s, p)!;
          expect(delta).toBe(note.each * count(pl.stock, undefined, true));
          expect(jamDue(s, p)).toBe(delta);
          const ledger = dayLedger(s, p);
          expect(ledger.net).toBe(after.players[p].cash - s.dayStartCash![p]);
          expect(ledger.jam).toBe(delta);
          expect(standing(withJamPaid(s), p).text).toBe(standing(after, p).text);
          paid += delta;
        });
      }
    }
    expect(paid).toBeGreaterThan(0);
  });
});

describe('the final sales card counts the jam maker', () => {
  it('shows "Jam maker tonight" and puts it in the net', () => {
    const s = closing({}, 3);
    const l = dayLedger(s, 0);
    expect(l).toMatchObject({ jam: 3 * JAM_PRICE, jamTonight: true });
    const html = toStaticHtml(h(SalesSummary, { s, viewer: 0 }));
    expect(html).toContain('MARKET CLOSED');
    expect(html).toContain(`Jam maker tonight <b class="good">+$${3 * JAM_PRICE}</b>`);
    const net = finishReveal(s).players[0].cash - s.dayStartCash![0];
    expect(l.net).toBe(net);
    expect(html).toContain(`Net <b class="${net >= 0 ? 'good' : 'bad'}">${net >= 0 ? '+' : '−'}$${Math.abs(net)}</b>`);
  });

  it('shows no jam money with Closing Day off, and none on an ordinary day', () => {
    const off = closing({ marketDays: false }, 3);
    expect(dayLedger(off, 0)).toMatchObject({ jam: 0, jamTonight: false });
    expect(toStaticHtml(h(SalesSummary, { s: off, viewer: 0 }))).not.toContain('Jam maker');
    const day3 = until(newGame(cfg(4)), (s) => s.day === 3 && s.phase === 'reveal');
    expect(dayLedger(day3, 0)).toMatchObject({ jam: 0, jamTonight: false });
    expect(dayLedger(day3, 0).net).toBe(day3.players[0].cash - day3.dayStartCash![0]);
  });
});

describe('the rulebook, How to play and the brief agree with the jam maker', () => {
  const docs = ['RULES.md', 'src/ui/HowTo.tsx', 'docs/workflow/GAME-BRIEF.md'];
  // Leftover fruit called worthless: "fruit" (or shelf, leftovers) and "worth nothing / count for nothing / worth $0"
  // in the same clause.
  const WORTHLESS = /\b(fruit|leftovers?|shelf)\b[^.;:!?]*?\b(worth nothing|counts? for nothing|worth \$0)/i;
  // Allowed by name: fruit that spoils tonight really is worth $0 tomorrow (a Juice Bar aside).
  const SPOIL_LINE = 'Fruit that spoils tonight is worth $0 tomorrow';

  it('the check catches the old sentences', () => {
    for (const old of [
      'Fruit left on your shelf and upgrades you built are worth nothing at the end.',
      'Fruit on your shelf at the end is worth nothing.',
      'Upgrades and shelf fruit count for nothing.',
      'Win: the most cash after the last day (unsold fruit is worth $0).',
    ]) expect(old).toMatch(WORTHLESS);
  });

  it('no end-of-game sentence calls leftover fruit worthless', () => {
    const bad = docs.flatMap((f) => readFileSync(f, 'utf8').split(/\r?\n/).map((l, i) => ({ f, i: i + 1, l })))
      .filter((x) => WORTHLESS.test(x.l) && !x.l.includes(SPOIL_LINE)).map((x) => `${x.f}:${x.i}: ${x.l.trim().slice(0, 100)}`);
    expect(bad).toEqual([]);
    expect(readFileSync('src/ui/HowTo.tsx', 'utf8')).toContain(SPOIL_LINE);
  });

  it('RULES.md still states the Closing Day rule with the game\'s numbers', () => {
    const rules = readFileSync('RULES.md', 'utf8');
    expect(rules).toContain(`**Closing Day (final day):** customers pay $${LAST_CALL_BONUS} more. Afterwards the **jam maker** buys every stall's leftover ripe fruit for $${JAM_PRICE} each.`);
    expect(rules).toContain(`Fruit left on your shelf is worth only what the jam maker pays on Closing Day: $${JAM_PRICE} for each ripe piece, nothing for green fruit`);
  });

  it('How to play and the set-up screen take the Closing Day numbers from the game data', () => {
    for (const f of ['src/ui/HowTo.tsx', 'src/ui/App.tsx']) {
      expect(readFileSync(f, 'utf8')).not.toMatch(/pay \$1 more|for \$1 each|\+\$1, then/);
    }
  });
});
