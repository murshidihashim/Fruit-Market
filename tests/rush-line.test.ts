// PLAN-068: the rush pop-up's result line is the same for everyone at the table: it names stalls, never "you".
import { describe, expect, it } from 'vitest';
import { aiStep } from '../src/engine/ai';
import { RIVALS } from '../src/engine/data';
import { beginBuying, finishReveal, newGame, type LineResult } from '../src/engine/game';
import { rivalReaction, rushLine } from '../src/engine/story';

describe('rush result line (shared)', () => {
  it('names stalls and never says "you", in seeded computer games', () => {
    const seen = { beat: 0, tie: 0, sold: 0, split: 0, none: 0 };
    for (let seed = 1; seed <= 30; seed++) {
      const n = 2 + (seed % 3);
      let s = newGame({
        players: RIVALS.slice(0, n).map((x) => ({ name: x.name, kind: 'ai' as const, level: 'normal' as const, avatar: x.avatar })),
        days: 6, unripe: true, upgrades: true, events: true, seed,
      });
      while (s.phase !== 'over') {
        if (s.phase === 'morning') { s = beginBuying(s); continue; }
        if (s.phase !== 'reveal') { s = aiStep(s)!; continue; }
        for (const l of s.results!.lines as LineResult[]) {
          const st = rushLine(s, l);
          const text = `${st.headline} ${st.detail ?? ''} ${st.tags.join(' ')}`;
          expect(text, text).not.toMatch(/\b(you|your|yours)\b/i);
          expect(st.tone).toBe('neutral');
          if (/ beat /.test(st.headline)) seen.beat++;
          if (/^Tie at/.test(st.headline)) seen.tie++;
          if (/ sold \d+ at /.test(st.headline)) seen.sold++;
          if (/split the order/.test(st.headline)) seen.split++;
          if (/^(Too pricey|Nothing good enough|No \w+ for)/.test(st.headline)) seen.none++;
          // the rivals' quip does not depend on who is watching
          expect(rivalReaction(s, l, 0, new Set())).toEqual(rivalReaction(s, l, n - 1, new Set()));
        }
        s = finishReveal(s);
      }
    }
    for (const [k, v] of Object.entries(seen)) expect(v, k).toBeGreaterThan(0);
  }, 60_000);
});
