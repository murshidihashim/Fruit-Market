// The bell and the Favoured Trade question at the round table (PLAN-085, item 4; flow A, PLAN-099): nothing of a crate
// is told before it has opened, the crates are shut from the first frame of the flip, reduced motion opens them in
// one step, your own ties are said in the game's words, and the card says when it would change nothing.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { h } from 'preact';
import { aiActFor } from '../src/engine/ai';
import { RIVALS } from '../src/engine/data';
import { activePlayer, beginBuying, decideTie, finishReveal, newGame, outCount, publicView, tiedPrices, type GameState } from '../src/engine/game';
import * as A from '../src/ui/anim';
import { toStaticHtml } from '../src/ui/cards';
import { fx } from '../src/ui/fx';
import { bellRings, reveal } from '../src/ui/game/animator';
import { TiePanel, tieWords } from '../src/ui/game/panels/PricingTable';
import { PreView } from '../src/ui/game/panels/RushTable';
import { seatOrder } from '../src/ui/game/rush';
import { crateSound } from '../src/ui/game/tableBeats';
import { preTable, type PreFacts, type TableStep } from '../src/ui/game/tableNow';
import { tieStory } from '../src/ui/game/tieStory';

/** What the round table knows besides the game, as a stall with nothing else going on sees it. */
const facts = (step: TableStep, open: number | null, more: Partial<PreFacts> = {}): PreFacts => ({
  step, sent: null, own: null, vals: null, open, asked: -1, mine: false, online: false, waiting: '', shared: false, answered: false, left: null, ...more,
});
/** The round table drawn whole, before the rush. */
const table = (s: GameState, viewer: number, x: PreFacts) => toStaticHtml(h(PreView, { s, viewer, pre: preTable(s, viewer, x) }));
/** Each seat's crate in the drawing, clockwise from the viewer's. */
const crates = (html: string) => html.split('<div class="rt-crate ').slice(1).map((c) => c.split('<div class="rt-crate ')[0]);

const read = (f: string) => readFileSync(f, 'utf8');

/** Games of computer stalls: every tie step the first of them reach, as the stall is asked. */
const asks: GameState[] = [];
for (let seed = 1; seed <= 16; seed++) {
  let s = newGame({
    players: RIVALS.slice(0, 3 + (seed % 2)).map((r) => ({ name: r.name, kind: 'ai' as const, level: 'normal' as const, avatar: r.avatar })),
    days: 10, unripe: true, upgrades: true, events: true, marketDays: true, seed,
  });
  for (let i = 0; i < 6000 && s.phase !== 'over'; i++) {
    if (s.phase === 'tie') asks.push(s);
    if (s.phase === 'morning') s = beginBuying(s);
    else if (s.phase === 'reveal') s = finishReveal(s);
    else {
      const n = aiActFor(s, activePlayer(s));
      if (!n) throw new Error(`stuck in ${s.phase}`);
      s = n;
    }
  }
}
/** The same day with the rush worked out, the asked stall alone deciding. */
const rush = (s: GameState, play: boolean) => decideTie({ ...s, tieAsk: [activePlayer(s)] }, activePlayer(s), play);

afterEach(() => { A.setBaseSpeed(false); A.resetHurry(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('the open crates: nothing of a crate before it has opened, and ties in the game\'s words', () => {
  it('whole computer games reach the tie step', () => {
    expect(asks.length).toBeGreaterThan(2);
  });

  it('a crate still shut shows one face-down square for each piece and says nothing else: no price, no fruit, no tie', () => {
    for (const s of asks.slice(0, 6)) {
      const n = s.players.length;
      const v = publicView(s, 0);
      const order = seatOrder(n, 0);
      for (let open = 0; open <= n; open++) {
        const seats = crates(table(v, 0, facts('bell', open)));
        expect(seats).toHaveLength(n);
        seats.forEach((crate, i) => {
          const p = order[i];
          if (i < open) { expect(crate).toMatch(/^look-open /); return; }
          if (p === 0) {
            // your own crate: your pieces face up, your tags face down until it opens (first, at the bell's first step)
            expect(crate).toMatch(/^look-open me /);
            expect(crate).not.toMatch(/\$\d/);
            expect(crate.match(/class="rt-tg [^"]*down/g) ?? []).toHaveLength(crate.match(/class="rt-tg /g)?.length ?? 0);
            return;
          }
          expect(crate).toMatch(/^look-squares /);
          expect(crate).not.toMatch(/\$\d|tied|rt-tg|rt-pc"|ds-stamp|x-fruit|rt-empty/);
          const out = outCount(v, p) ?? 0;
          expect(crate.match(/class="rt-sq"/g) ?? []).toHaveLength(out > 10 ? 9 : out);
          expect(crate).toContain(out ? `${out} ${out === 1 ? 'piece' : 'pieces'}, face down` : 'nothing out');
        });
      }
    }
  });

  it('an open crate says its prices aloud, the tied ones marked', () => {
    const s = asks[0];
    const asked = activePlayer(s);
    const html = table(publicView(s, asked), asked, facts('tie', null));
    expect(tieWords(s, asked)).not.toBe('');
    for (const t of tiedPrices(s, asked)) {
      // every stall that shares the price marks it on its own crate, and says so
      for (const p of [asked, ...t.rivals]) {
        expect(html).toMatch(new RegExp(`class="rt-tg [^"]*\\btie\\b[^"]*" data-a="rt-tag-${p}-${t.fruit}"`));
        expect(html).toContain(`at $${t.price}`);
      }
    }
    expect(html).toContain(', tied');
  });

  it('before the rush your own ties are said under the table, once every crate is open; not while a question is asked, not once you have been asked, and not on a shared phone', () => {
    const s = asks[0];
    const asked = activePlayer(s);
    const kept = publicView(rush(s, false), asked);
    const words = `Your prices are tied: ${tieWords(kept, asked)}.`;
    const n = kept.players.length;
    expect(table(kept, asked, facts('bell', null))).toContain(`<span data-a="bell-ties">${words}</span>`);
    expect(table(kept, asked, facts('bell', n))).toContain(words);
    // while the bell rings the line says what the bell is, and nothing of a tie yet
    const ringing = table(kept, asked, facts('bell', n - 1));
    expect(ringing).toContain('Every crate and every price is open.');
    expect(ringing).not.toContain('Your prices are tied');
    // the question's card says who is tied; once asked it is not said again; a shared phone has no "your"
    expect(table(publicView(s, asked), asked, facts('tie', null))).not.toContain('bell-ties');
    expect(table(kept, asked, facts('bell', null, { answered: true }))).not.toContain('bell-ties');
    expect(table(kept, asked, facts('bell', null, { shared: true }))).not.toContain('bell-ties');
    // a stall with no tied price has nothing to read there
    const free = kept.players.findIndex((_, p) => tiedPrices(kept, p).length === 0);
    if (free >= 0) expect(table(publicView(rush(s, false), free), free, facts('bell', null))).not.toContain('bell-ties');
  });
});

describe('the bell\'s script and the flip', () => {
  function fakeClock(reducedMotion: boolean) {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({ matches: reducedMotion }));
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => setTimeout(cb, 0));
    vi.stubGlobal('document', { querySelector: () => null });
    A.setBaseSpeed(false);
    A.resetHurry();
  }

  it('with reduced motion every row is open in one step (never row by row), and the pause to read is kept', async () => {
    const s = asks[0];
    fakeClock(true);
    const seen: (number | null)[] = [];
    const t0 = Date.now();
    const done = bellRings(s, (open) => seen.push(open));
    expect(seen).toEqual([s.players.length]);
    await vi.runAllTimersAsync();
    await done;
    expect(seen).toEqual([s.players.length]);
    expect(Date.now() - t0).toBe(A.BEAT.bell.read);
    // at the usual pace the rows start shut while the bell swings, then all open together (PLAN-123: the prices are
    // revealed at the same moment, never seat by seat)
    fakeClock(false);
    const steps: (number | null)[] = [];
    const ring = bellRings(s, (open) => steps.push(open));
    expect(steps).toEqual([0]);
    await vi.runAllTimersAsync();
    await ring;
    expect([...new Set(steps)]).toEqual([0, s.players.length]);
  });

  it('makes one sound: the player\'s own bell, rung once by the game table as the bell first shows (PLAN-091)', async () => {
    const s = asks[0];
    for (const reduced of [true, false]) {
      fakeClock(reduced);
      // the bell's script makes no sound of its own (it used to add the card sound to the bell's)
      const sounds = (['card', 'tap', 'bell', 'coin'] as const).map((k) => vi.spyOn(fx, k).mockImplementation(() => undefined));
      // the game table's setBell, as useGameController.ts has it
      let up = false;
      const setBell = (open: number | null) => { if (open !== null && !up) fx.bell(); up = open !== null; };
      const ring = bellRings(s, setBell);
      await vi.runAllTimersAsync();
      await ring;
      expect(sounds.map((x) => x.mock.calls.length), reduced ? 'reduced motion' : 'usual pace').toEqual([0, 0, 1, 0]);
      sounds.forEach((x) => x.mockRestore());
    }
    // the game table's own setter: beat-player.test.ts 'rings once as the bell first shows anything'. The sound is the
    // bell the player wears: sounds.test.ts 'the rush and the bell sound as the player chose'.
    // A crate opening has its own small sound, but not as the bell first shows (reduced motion opens every crate then).
    expect([crateSound(null, 0), crateSound(null, 4), crateSound(0, 1), crateSound(2, 4), crateSound(3, 3), crateSound(3, null)]).toEqual([false, false, true, true, false, false]);
  });

  it('a rush after the flip does not ring the bell again; without the flip it rings first', async () => {
    const s = rush(asks[0], false);
    for (const rung of [true, false]) {
      fakeClock(true);
      const seen: (number | null)[] = [];
      const done = reveal(s, 0, () => {}, (open) => { seen.push(open); }, rung);
      await vi.runAllTimersAsync();
      await done;
      expect(seen.filter((x) => x !== null).length > 0, rung ? 'rung at the flip' : 'rung now').toBe(!rung);
    }
  });
  // At the flip before a question the rows are shut together with the new state: beat-player.test.ts 'at the flip the
  // rows are shut together with the new state, so no open row is drawn before the bell'.
});

describe('the question says when the card would change nothing', () => {
  it('the same takings either way: it says so; otherwise the card puts the stall first', () => {
    let same = 0;
    for (const s of asks) {
      const asked = activePlayer(s);
      const story = tieStory(publicView(s, asked), asked, asked);
      const [keep, play] = [rush(s, false), rush(s, true)].map((g) => g.results!.income[asked]);
      if (keep === play) {
        same++;
        expect(story.why).toContain('Favoured Trade wouldn\'t change what you make today.');
        expect(story.why).not.toContain('Play Favoured Trade to sell first');
      } else {
        expect(play).toBeGreaterThan(keep);
        expect(story.why).toContain('Play Favoured Trade to sell first on every tied price today.');
      }
      expect(story.without).toContain(`You make $${keep} today.`);
      expect(story.with).toContain(`You make $${play} today.`);
    }
    expect(same).toBeGreaterThan(0);
  });
});

describe('the two buttons', () => {
  it('"Play it" stays the first button of the bar in the page (the browser scripts press the first one) and is drawn on the right', () => {
    const s = asks[0];
    const asked = activePlayer(s);
    const html = toStaticHtml(h(TiePanel, { s: publicView(s, asked), viewer: asked, asked, onDecide: () => undefined }));
    expect(html).toMatch(/<div class="pp-lock ds-tie-lock"><button type="button" class="btn primary wide big">Play it<\/button><button type="button" class="btn ghost wide big">Keep it<\/button><\/div>/);
    expect(html).toContain('data-a="tie-note"');
    // in the round table's foot (PLAN-099), drawn the other way round: read in the browser (scripts/style-checks.cjs,
    // "the question at a tie lies in the round table's foot", PLAN-130)
    // the scripts' own words
    const smoke = read('scripts/smoke.cjs');
    for (const sel of ['[data-a="tie-note"]', '.pp-lock .btn.ghost', '.pp-lock .btn.primary']) expect(smoke).toContain(sel);
    // the layout sweep answers the question too, playing the card the first time and keeping it the next (PLAN-091)
    const sweep = read('scripts/qa-sweep.cjs');
    const ask = `if (await has('[data-a="tie-note"]') && await has('.pp-lock .btn.ghost')) {`;
    expect(sweep).toContain(ask);
    expect(sweep).toContain("await page.click(play ? '.pp-lock .btn.primary' : '.pp-lock .btn.ghost');");
    // before the one-button step, which cannot press either of the two
    expect(sweep.indexOf(ask)).toBeLessThan(sweep.indexOf("const lock = page.locator('.pp-lock .btn:not([disabled])');"));
  });
});

// The round table before the rush (the bell's rows and bell.css are gone, PLAN-099) moves by position, size and fade
// only, on the table's clock, and takes its colours from the palette. Read in the browser instead of in the
// stylesheets (PLAN-130):
//   by position, size and fade only, never turned or stepped, as a game is played: scripts/table-checks.cjs;
//   every rule of the round table takes its colours from the palette and times each move by a length read from the
//   clock, times --mk, and reduced motion shows every end state at once: scripts/style-checks.cjs (the page's own
//   rules, and "with reduced motion nothing moves"); hex colours anywhere: palette.test.ts;
//   the rows of the table are laid out by their own sheets alone: css-layers.test.ts 'a part is styled in one sheet';
//   the old rows and the bell's sheet are gone, and the day's sheet no longer asks the question at a tie:
//   scripts/style-checks.cjs (the page's own rules); bell.css is not loaded: css-layers.test.ts 'the table's sheets
//   load in one order'.
