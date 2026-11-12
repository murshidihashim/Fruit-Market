// The bell and the Favoured Trade question, finished (PLAN-085, item 4): nothing of a row is told before it has
// turned, the rows are shut from the first frame of the flip, reduced motion opens them in one step, your own ties
// are said in the game's words, and the card says when it would change nothing.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { h } from 'preact';
import { aiActFor } from '../src/engine/ai';
import { RIVALS } from '../src/engine/data';
import { activePlayer, beginBuying, decideTie, finishReveal, newGame, publicView, tiedPrices, type GameState } from '../src/engine/game';
import * as A from '../src/ui/anim';
import { toStaticHtml } from '../src/ui/cards';
import { bellRings } from '../src/ui/game/animator';
import { CratesOpen, TiePanel, tieWords } from '../src/ui/game/panels/PricingTable';
import { tieStory } from '../src/ui/game/tieStory';

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

describe('the open rows: nothing of a row before it has turned, and ties in the game\'s words', () => {
  it('whole computer games reach the tie step', () => {
    expect(asks.length).toBeGreaterThan(2);
  });

  it('a row that is still shut shows the backs of its tags and says nothing: no price, no fruit, no tie', () => {
    for (const s of asks.slice(0, 6)) {
      const n = s.players.length;
      for (let open = 0; open <= n; open++) {
        const html = toStaticHtml(h(CratesOpen, { s: publicView(s, 0), viewer: 0, open }));
        const rows = html.split('<div class="ds-stall ').slice(1);
        expect(rows).toHaveLength(n);
        rows.forEach((row, i) => {
          if (i < open) { expect(row).toMatch(/^(me)? up"/); return; }
          expect(row).toMatch(/^(me)? down"/);
          expect(row).toContain('still shut');
          expect(row).not.toMatch(/\$\d|tied|ds-lamp|ds-stamp|x-fruit/);
          expect(row.match(/class="ds-pz back"/g) ?? []).toHaveLength(row.match(/class="ds-pz/g)?.length ?? 0);
        });
      }
    }
  });

  it('an open row says its tied prices aloud in the game\'s words', () => {
    const s = asks[0];
    const asked = activePlayer(s);
    const html = toStaticHtml(h(CratesOpen, { s: publicView(s, asked), viewer: asked }));
    expect(tieWords(s, asked)).not.toBe('');
    expect(html).toContain(`; tied: ${tieWords(s, asked)}"`);
    // every stall that shares the price says so on its own row
    for (const r of tiedPrices(s, asked)[0].rivals) expect(html).toContain(`; tied: ${tieWords(s, r)}"`);
  });

  it('before the rush your own ties are said under the rows, once every row is open; not while a question is asked, and not on a shared phone', () => {
    const s = asks[0];
    const asked = activePlayer(s);
    const kept = publicView(rush(s, false), asked);
    const words = `Your prices are tied: ${tieWords(kept, asked)}.`;
    const n = kept.players.length;
    expect(toStaticHtml(h(CratesOpen, { s: kept, viewer: asked }))).toContain(`data-a="bell-ties">${words}</p>`);
    expect(toStaticHtml(h(CratesOpen, { s: kept, viewer: asked, open: n }))).toContain(words);
    // while the bell rings the line keeps its place and says nothing yet
    const ringing = toStaticHtml(h(CratesOpen, { s: kept, viewer: asked, open: n - 1 }));
    expect(ringing).toContain('class="ds-bell-note wait"');
    expect(ringing).not.toContain('Your prices are tied');
    // the question's card says who is tied; a shared phone has no "your"
    expect(toStaticHtml(h(CratesOpen, { s: publicView(s, asked), viewer: asked }))).not.toContain('ds-bell-note');
    expect(toStaticHtml(h(CratesOpen, { s: kept, viewer: asked, shared: true }))).not.toContain('ds-bell-note');
    // a stall with no tied price has nothing to read there
    const free = kept.players.findIndex((_, p) => tiedPrices(kept, p).length === 0);
    if (free >= 0) expect(toStaticHtml(h(CratesOpen, { s: publicView(rush(s, false), free), viewer: free }))).not.toContain('ds-bell-note');
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
    expect(read('src/ui/bell.css')).toContain('#app .tkt > .centre > .ds-tie-lock { flex-direction: row-reverse; }');
    // the scripts' own words
    const smoke = read('scripts/smoke.cjs');
    for (const sel of ['[data-a="tie-note"]', '.pp-lock .btn.ghost', '.pp-lock .btn.primary']) expect(smoke).toContain(sel);
  });
});

describe('the fit (bell.css)', () => {
  it('is read after the sheet\'s own stylesheet, moves nothing but a fade on the table\'s clock, and takes its colours from the palette', () => {
    const main = read('src/main.tsx');
    expect(main.indexOf("'./ui/bell.css'")).toBeGreaterThan(main.indexOf("'./ui/daysheet.css'"));
    const css = read('src/ui/bell.css').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).not.toMatch(/@keyframes|animation:|rotate|skew/);
    for (const t of css.match(/transition:[^;]+;/g) ?? []) expect(t).toBe('transition: opacity calc(var(--mk, 1) * var(--t-bell-lid)) ease;');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/);
    // closer rows for five and six stalls and on a short phone; the rows of the table are not laid out here
    expect(css).toContain('#app .tkt .ds-stalls.n5 .ds-stall, #app .tkt .ds-stalls.n6 .ds-stall {');
    expect(css).toContain('@media (max-height: 700px) {');
    expect(css).not.toMatch(/#app \.tkt > \.(street-wrap|seats|my-stall|actionbar|tk-top)\b|grid-template/);
  });
});
