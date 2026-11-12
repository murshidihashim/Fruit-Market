// The known gaps on the day's sheets (PLAN-090): the strip of the day's steps, when the takings show, and the
// bottom bar's leftovers.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { h } from 'preact';
import { aiActFor } from '../src/engine/ai';
import { RIVALS } from '../src/engine/data';
import { activePlayer, applyAction, newGame, type GameState } from '../src/engine/game';
import { toStaticHtml } from '../src/ui/cards';
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
