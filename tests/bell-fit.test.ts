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
import { bellRings } from '../src/ui/game/animator';
import { TiePanel, tieWords } from '../src/ui/game/panels/PricingTable';
import { PreView } from '../src/ui/game/panels/RushTable';
import { seatOrder } from '../src/ui/game/rush';
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
    // at the usual pace the rows start shut and open one at a time
    fakeClock(false);
    const steps: (number | null)[] = [];
    const ring = bellRings(s, (open) => steps.push(open));
    expect(steps).toEqual([0]);
    await vi.runAllTimersAsync();
    await ring;
    expect([...new Set(steps)]).toEqual(Array.from({ length: s.players.length + 1 }, (_, i) => i));
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
    const ctrl = read('src/ui/game/useGameController.ts');
    expect(ctrl).toContain('if (open !== null && !bellUp.current) fx.bell();');
    // the bell's own sound is the one the player wears, the brass hand bell when none is chosen
    expect(read('src/ui/fx.ts')).toContain('bell: () => (BELLS[wornSounds().bell] ?? BELLS.bell_brass)(),');
    // a crate opening has its own small sound, but not as the bell first shows (reduced motion opens every crate then)
    expect(read('src/ui/game/panels/RushTable.tsx')).toContain('if (was !== null && c.bell > was) fx.tap();');
  });

  it('at the flip before a question the rows are shut together with the new state, so no open row is drawn before the bell', () => {
    const ctrl = read('src/ui/game/useGameController.ts');
    const shut = ctrl.indexOf('if (flip) setBell(A.isReduced() ? next.players.length : 0);');
    expect(shut).toBeGreaterThan(0);
    expect(shut).toBeLessThan(ctrl.indexOf('setS(next);'));
    expect(ctrl.indexOf('setS(next);')).toBeLessThan(ctrl.indexOf('await bellRings(next, setBell);'));
  });
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
        expect(story.why).toContain('Favoured Trade would not change what you take today.');
        expect(story.why).not.toContain('Play Favoured Trade and you sell first');
      } else {
        expect(play).toBeGreaterThan(keep);
        expect(story.why).toContain('Play Favoured Trade and you sell first, on every tied price today.');
      }
      expect(story.without).toContain(`You take $${keep} today.`);
      expect(story.with).toContain(`You take $${play} today.`);
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
    // in the round table's foot (PLAN-099)
    expect(read('src/ui/rushTable.css')).toContain('#app .tkt .rt-foot > .ds-tie-lock { all: unset; flex: 1 1 auto; display: flex; flex-direction: row-reverse;');
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

describe('the round table before the rush (rushTable.css; the bell\'s rows and bell.css are gone, PLAN-099)', () => {
  it('moves by position, size and fade only, on the table\'s clock, and takes its colours from the palette', () => {
    expect(read('src/main.tsx')).not.toContain('bell.css');
    const all = read('src/ui/rushTable.css');
    const css = all.slice(all.indexOf('Before the rush (PLAN-099, flow A)')).replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).not.toMatch(/rotate|skew|#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/);
    // every move at the one speed: a length read from the clock, times --mk
    for (const t of css.match(/(?:transition|animation):[^;]+;/g) ?? []) {
      if (/: none;$/.test(t)) continue;
      expect(t).toMatch(/calc\(var\(--mk, 1\) \* var\(--t-[a-z-]+\)\)/);
      expect(t).not.toMatch(/\b\d+(?:\.\d+)?m?s\b/);
    }
    // the only frames of its own: the pricing sheet coming up from the table's foot (position only)
    expect(css.match(/@keyframes [\w-]+ \{[^}]*\}/g)).toEqual(['@keyframes rt-sheet-in { from { transform: translateY(100%); }']);
    // reduced motion: every end state at once
    expect(css).toContain('@media (prefers-reduced-motion: reduce) {');
    // the rows of the table are not laid out here
    expect(css).not.toMatch(/#app \.tkt > \.(seats|my-stall|actionbar|tk-top)\b/);
    // the old rows, the old question layout and the bell's sheet are gone from the day's sheet
    expect(read('src/ui/daysheet.css')).not.toMatch(/ds-stall|ds-bell|ds-pz|ds-tie|sh-day\.full|ds-price|ds-brief|ds-rivals/);
  });
});
