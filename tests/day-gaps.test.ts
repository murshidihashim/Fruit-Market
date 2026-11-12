// The known gaps on the day's sheets (PLAN-090): the strip of the day's steps, when the takings show, and the
// bottom bar's leftovers.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { h } from 'preact';
import { aiActFor } from '../src/engine/ai';
import { RIVALS } from '../src/engine/data';
import { activePlayer, applyAction, newGame, type GameState } from '../src/engine/game';
import { toStaticHtml } from '../src/ui/cards';
import { fitSheet } from '../src/ui/game/daySheet';
import { CratesOpen } from '../src/ui/game/panels/PricingTable';
import { TakingsView } from '../src/ui/game/panels/SalesSummary';
import { stripStep } from '../src/ui/game/panels/TopBar';

const read = (f: string) => readFileSync(f, 'utf8');

describe('the strip of the day\'s steps follows what is on the table (TopBar.tsx)', () => {
  it('marks the bell while it rings before the rush, and the morning while the standing order\'s bids are turned over', () => {
    // where the game is, when nothing else is on the table
    expect((['morning', 'order', 'buy', 'stall', 'bid', 'tie', 'reveal'] as const).map((p) => stripStep(p, false).beat)).toEqual([0, 0, 1, 2, 3, 3, 4]);
    // the game is already at the rush and the bell is still ringing: "4 Bell", as on the approved screen
    expect(stripStep('reveal', false, 'bell')).toEqual({ beat: 3, said: 'The bell' });
    // the game is already at buying and the bids are being turned over
    expect(stripStep('buy', false, 'order')).toEqual({ beat: 0, said: 'The standing order' });
    // at night every step of the day is done
    expect(stripStep('reveal', true).beat).toBe(5);
    const game = read('src/ui/Game.tsx');
    expect(game).toContain("const onTable = c.orderShow ? 'order' as const : s.phase === 'reveal' && !c.revealDone && rushDay.current !== s.day ? 'bell' as const : undefined;");
    expect(game).toContain('if (show) rushDay.current = s.day;');
    expect(game).toContain('<TopBar s={s} viewer={viewer} night={c.night} on={onTable} ');
  });
});

/** A real game played by the computer to the first day's takings. */
function atTakings(): GameState {
  let s = newGame({ players: [0, 1, 2].map((i) => ({ name: i === 0 ? 'Mira' : RIVALS[i].name, kind: i === 0 ? 'human' as const : 'ai' as const, level: 'normal' as const, avatar: RIVALS[i].avatar })), days: 8, unripe: true, upgrades: true, events: true, seed: 7 });
  for (let i = 0; i < 4000 && s.phase !== 'reveal'; i++) {
    if (s.phase === 'morning') {
      const pick = s.players.findIndex((p) => p.traitOffer && !p.trait);
      s = pick >= 0 ? applyAction(s, pick, { kind: 'trait', trait: s.players[pick].traitOffer![0] }) : applyAction(s, 0, { kind: 'begin' });
      continue;
    }
    s = aiActFor(s, activePlayer(s))!;
  }
  return s;
}

describe('the takings (daySheet.ts, DaySheet.tsx, SalesSummary.tsx)', () => {
  it('are shown when the rush is truly done, not as the last card leaves', () => {
    const rule = read('src/ui/game/daySheet.ts');
    expect(rule).toContain("if (x.done && !x.rush) return 'takings';");
    expect(rule.match(/return 'takings'/g)).toHaveLength(1);
    expect(read('src/ui/game/panels/DaySheet.tsx')).toContain("{step === 'takings' && <SalesSummary s={s} viewer={viewer} shared={shared} />}");
  });

  it('say "You" on your own row on a phone that is not shared, and the stall\'s name on a shared one', () => {
    const s = atTakings();
    expect(s.phase).toBe('reveal');
    const own = toStaticHtml(h(TakingsView, { s, viewer: 0 }));
    expect(own).toContain('<span class="tg-name">You</span>');
    expect(own).not.toContain('<span class="tg-name">Mira</span>');
    const shared = toStaticHtml(h(TakingsView, { s, viewer: 0, shared: true }));
    expect(shared).toContain('<span class="tg-name">Mira</span>');
    expect(shared).not.toContain('<span class="tg-name">You</span>');
  });
});

describe('the bottom bar during the rush and the night (ActionBar.tsx)', () => {
  it('no Skip beside "Night falls…", and no selling hint once a customer\'s card is up or after the last one', () => {
    const bar = read('src/ui/game/panels/ActionBar.tsx');
    expect(bar).toContain("const selling = busy && s.phase === 'reveal' && !night;");
    expect(bar).toContain('const cards = selling && rushDay.current === s.day;');
    expect(bar).toContain("s.phase === 'reveal' ? (cards ? '' : 'Selling… tap to speed up')");
    // Skip stays on the page until the takings (the performance script times the rush by it), unseen and out of reach
    expect(bar).toContain("{selling && <button class=\"btn skip\" style={cards ? 'visibility:hidden' : undefined} aria-hidden={cards ? 'true' : undefined} tabIndex={cards ? -1 : undefined}");
    expect(read('scripts/perf-budget.cjs')).toContain("document.querySelector('.actionbar .skip')");
  });
});

describe('after a Favoured Trade answer (PricingTable.tsx, DaySheet.tsx)', () => {
  it('the stall that has just answered is not told again that its prices are tied', () => {
    // this stall asks what a rival asks for a fruit both put out: a tied price
    const g: GameState = structuredClone(atTakings());
    const rival = g.bids.findIndex((b, i) => i !== 0 && !!b && b.length > 0);
    const post = g.bids[rival]![0];
    g.stalls[0] = { ...g.stalls[0], [post.fruit]: 1 };
    g.bids[0] = [...(g.bids[0] ?? []).filter((b) => b.fruit !== post.fruit), { fruit: post.fruit, price: post.price }];
    const told = toStaticHtml(h(CratesOpen, { s: g, viewer: 0 }));
    expect(told).toContain('Your prices are tied: ');
    const quiet = toStaticHtml(h(CratesOpen, { s: g, viewer: 0, answered: true }));
    expect(quiet).not.toContain('Your prices are tied');
    expect(quiet).not.toContain('data-a="bell-ties"');
    const sheet = read('src/ui/game/panels/DaySheet.tsx');
    expect(sheet).toContain('if (tying) answered.current = true;');
    expect(sheet).toContain('answered={answered.current}');
  });
});

describe('the first-game tip for stocking and pricing covers no control (Game.tsx, DaySheet.tsx, daysheet.css)', () => {
  it('is not shown at the standing-order bid, and at stocking and pricing the sheet keeps room free for it', () => {
    // "Secret prices" is about pricing fruit: it used to come up at the standing-order bid, over the bid's stepper
    expect(read('src/ui/Game.tsx')).toContain("pricing: c.myBidTurn && s.phase !== 'order',");
    expect(read('src/ui/Game.tsx')).toContain('tip={!!coach} />');
    const sheet = read('src/ui/game/panels/DaySheet.tsx');
    expect(sheet).toContain("el.style.setProperty('--tip', note ? `${note.offsetHeight + 16}px` : '0px');");
    const css = read('src/ui/daysheet.css');
    expect(css).toContain('#app .tkt > .centre > .sh-day.own { padding-bottom: var(--tip, 0px); }');
  });
});

describe('the evening: an upgrade the stall cannot build (panel.tsx, sheets.css)', () => {
  it('can still be opened as its whole card, with the reason; it is never chosen', () => {
    const src = read('src/ui/panel.tsx');
    // a tap on it opens the card; choosing is for an offer that can be built
    expect(src).toContain("disabled={why ? !onOpen : !onPick}");
    expect(src).toContain("aria-disabled={why ? 'true' : undefined} onClick={why ? onOpen : onPick}");
    expect(src).toContain('pick={chosen} onPick={choose} onOpen={setOpen} />');
    expect(src).toContain('{canUpgrade(s, p, open) && <p class="cd-pop-why">{canUpgrade(s, p, open)}</p>}');
    // it is still drawn greyed, and on the smallest phone it still says why under its one line
    const css = read('src/ui/sheets.css');
    expect(css).toContain("#app .tkt .uo-pick:is(:disabled, [aria-disabled='true']) > :not(.uo-kind, .uo-ft) { opacity: 0.5; }");
    expect(css).toContain(".uo-pick:is(:disabled, [aria-disabled='true']) .uo-ft { display: block;");
  });
});

describe('the table under a sheet (Game.tsx)', () => {
  it('the market is out of reach of the keyboard and screen readers while a sheet lies over it, and back when it leaves', () => {
    const game = read('src/ui/Game.tsx');
    expect(game).toContain("sheet.centre.current?.querySelector(':scope > .market-stall')?.toggleAttribute('inert', covered.current);");
    expect(game).toContain('covered.current = !!mid;');
    // the hooks come before the hand-over and results screens return early
    expect(game.indexOf('const covered = useRef(false);')).toBeLessThan(game.indexOf('if (c.needHandoff)'));
  });
});

describe('a six-box shelf on a narrow, tall phone (daySheet.ts fitSheet)', () => {
  it('last of all the sheet also lies over the rows above it, and pricing then says the rivals\' pieces once', () => {
    // 360 by 780: the closest step is 332 tall in a cell of 264 with 48 more over your shelf: it takes the rows above too
    expect(fitSheet([420, 390, 360, 332], 264, 48, 158)).toEqual({ tight: 0, over: true, up: true });
    expect(fitSheet([520, 490, 460, 432], 264, 48, 158)).toEqual({ tight: 2, over: true, up: true });
    // over your shelf is still tried first, and nothing changes where the sheet already lies there (a short phone)
    expect(fitSheet([420, 390, 360, 300], 264, 48, 158)).toEqual({ tight: 3, over: true, up: false });
    expect(fitSheet([500, 470, 440, 420], 370, 0, 0)).toEqual({ tight: 3, over: false, up: false });
    const css = read('src/ui/daysheet.css');
    expect(css).toContain('#app .tkt > .centre > .sh-day.own[data-up] { z-index: 6; margin-top: calc(-2px - var(--rise, 0px)); }');
    expect(css).toContain('#app .tkt .sh-day[data-up] .ds-rivals { flex: none; display: flex; align-items: baseline; gap: 8px; }');
  });
});
