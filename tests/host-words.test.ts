// PLAN-132: what Rosa, Home's host, says. She chats; a mode's facts (its days, its stalls, what counts) stay on its card.
import { describe, expect, it } from 'vitest';
import { SPRINT_DAYS, SPRINT_WEEK_DAYS } from '../src/engine/daily';
import { HOST_HINT, hostLines, type HostFacts, type HostKey } from '../src/ui/hostWords';

const facts: HostFacts = { stage: 'Village Square', rival: 'Rosa', dailyFirst: 'Coral Mei', sprintFirst: 'Grandpa Tan' };
const KEYS: HostKey[] = ['hello', 'custom', 'league', 'daily', 'sprint'];

describe('the host\'s lines', () => {
  it('a welcome, then two lines for each mode', () => {
    expect(hostLines('hello', facts)).toHaveLength(1);
    for (const k of KEYS.slice(1)) expect(hostLines(k, facts), k).toHaveLength(2);
    expect(HOST_HINT).toBe('Tap Rosa for more');
  });
  it('names the League stage, and says the stall is hers only when she is its rival', () => {
    expect(hostLines('league', facts)[0]).toBe('Careful at Village Square. That stall is mine!');
    expect(hostLines('league', { ...facts, stage: 'Night Market', rival: 'Uncle Benny' })[0]).toBe('Careful at Night Market. Uncle Benny is waiting.');
    expect(hostLines('league', { ...facts, stage: null, rival: null })[0]).toBe('Every stage cleared! Play one again for its stars.');
  });
  it('names the day\'s first customer, and has a line for a day that opens with an event', () => {
    expect(hostLines('daily', facts)[0]).toBe('Coral Mei is first in line today.');
    expect(hostLines('sprint', facts)[0]).toBe('Grandpa Tan is up early for the Sprint.');
    expect(hostLines('daily', { ...facts, dailyFirst: null })[0]).toBe('Today\'s market is ready when you are.');
    expect(hostLines('sprint', { ...facts, sprintFirst: null })[0]).toBe('The Sprint is ready when you are.');
  });
  it('never repeats a card\'s facts: no day counts, stall counts or what counts in the week', () => {
    for (const k of KEYS) for (const l of hostLines(k, facts)) {
      expect(l, l).not.toMatch(new RegExp(`\\b(${SPRINT_DAYS}|${SPRINT_WEEK_DAYS}|\\d+) (days?|stalls?)\\b`, 'i'));
      expect(l.length, l).toBeLessThanOrEqual(64);
    }
  });
});
