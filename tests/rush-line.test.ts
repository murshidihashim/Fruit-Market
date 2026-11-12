// PLAN-068: the rush pop-up's result line is the same for everyone at the table: it names stalls, never "you".
import { describe, expect, it } from 'vitest';
import { aiActFor, aiStep } from '../src/engine/ai';
import { RIVALS } from '../src/engine/data';
import { activePlayer, beginBuying, finishReveal, newGame, type LineResult } from '../src/engine/game';
import { nameIn, nameOwn, nameVerb, rushLine } from '../src/engine/story';

// PLAN-088: a solo game calls the player's stall "You" when no name is typed. A sentence built from a stall's name must
// read correctly for that name as for any other ("You win", never "You wins").
describe('a stall called "You"', () => {
  it('takes the verb and the words of "you"; any other name keeps its own', () => {
    expect(nameVerb('You', 'wins', 'win')).toBe('You win');
    expect(nameVerb('Rosa', 'wins', 'win')).toBe('Rosa wins');
    expect(nameVerb('You', 'gets', 'get', false)).toBe('you get');
    expect(nameIn('You')).toBe('you');
    expect(nameIn('Rosa')).toBe('Rosa');
    expect(nameOwn('You')).toBe('your');
    expect(nameOwn('You', true)).toBe('Your');
    expect(nameOwn('Rosa')).toBe("Rosa's");
  });

  it('every rush line and every log line reads correctly, in seeded games with the player\'s stall called "You"', () => {
    const seen = { win: 0, stake: 0, beatYou: 0, youSold: 0 };
    const wrong: string[] = [];
    const BAD = /\bYou (wins|gets|loses|is|has|was)\b|\bYou's\b|\bits \$|[a-z] You\b/;
    for (let seed = 1; seed <= 60; seed++) {
      const n = 2 + (seed % 5);
      let s = newGame({
        players: RIVALS.slice(0, n).map((x, i) => ({ name: i === 0 ? 'You' : x.name, kind: i === 0 ? 'human' as const : 'ai' as const, level: 'normal' as const, avatar: x.avatar })),
        days: 10, unripe: true, upgrades: true, events: true, seed,
      });
      while (s.phase !== 'over') {
        if (s.phase === 'morning') { s = beginBuying(s); continue; }
        if (s.phase !== 'reveal') { s = aiActFor(s, activePlayer(s))!; continue; }
        for (const l of s.results!.lines as LineResult[]) {
          const st = rushLine(s, l);
          const text = `${st.headline} ${st.detail ?? ''}`;
          if (BAD.test(text)) wrong.push(text);
          if (/You win: /.test(text)) seen.win++;
          if (/You (get|lose) the \$\d+ stake/.test(text)) seen.stake++;
          if (/ beat you by \$/.test(text)) seen.beatYou++;
          if (/^You sold \d+ at /.test(text)) seen.youSold++;
        }
        s = finishReveal(s);
      }
      wrong.push(...s.log.filter((x) => BAD.test(x)));
    }
    expect(wrong).toEqual([]);
    for (const [k, v] of Object.entries(seen)) expect(v, k).toBeGreaterThan(0);
  }, 120_000);
});

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
          if (/^(Every price was too high for|Nothing .+ would buy\.|Nobody had \w+ for)/.test(st.headline)) seen.none++;
        }
        s = finishReveal(s);
      }
    }
    for (const [k, v] of Object.entries(seen)) expect(v, k).toBeGreaterThan(0);
  }, 60_000);
});
