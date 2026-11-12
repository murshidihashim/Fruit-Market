// The known gaps on the day's sheets (PLAN-090): the strip of the day's steps, when the takings show, and the
// bottom bar's leftovers.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
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
