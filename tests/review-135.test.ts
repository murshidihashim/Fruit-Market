// REP-135: fixes found by the review of 1.28.0 before publishing.
import { describe, expect, it } from 'vitest';
import { dailyConfig } from '../src/engine/daily';
import { newGame, type GameState } from '../src/engine/game';
import { openStage } from '../src/engine/ai';
import { sprintReason } from '../src/engine/sprint';
import { traitPicker } from '../src/ui/game/turn';
import { EXPERTS, LEAGUE, leagueConfig } from '../src/ui/progress';

describe('RA-01: an empty perk offer does not hold the first morning', () => {
  it('League stages with perks off go on to Start buying', () => {
    for (let i = 0; i < LEAGUE.length; i++) {
      const s = openStage(newGame(leagueConfig(i, 'You', '🦊')));
      if (s.phase !== 'morning' || s.day !== 1) continue;
      const me = s.players.findIndex((p) => p.kind === 'human');
      const picker = traitPicker(s, me, false);
      if (picker >= 0) expect(s.players[picker].traitOffer?.length ?? 0).toBeGreaterThan(0);
      else expect(s.players[me].traitOffer?.length ?? 0).toBe(0);
    }
  });
  it('stages 8, 9 and 11 (perks off, opening on the morning) have no picker', () => {
    for (const i of [7, 8, 10]) {
      const s = openStage(newGame(leagueConfig(i, 'You', '🦊')));
      expect(s.phase).toBe('morning');
      expect(traitPicker(s, 0, false)).toBe(-1);
    }
  });
  it('the Daily on a Basic game day has no picker; on other days the person picks', () => {
    // 2026-11-25 is a Basic game day (the weekly twist); 2026-11-22 is not.
    expect(traitPicker(newGame(dailyConfig('2026-11-25', 'You')), 0, false)).toBe(-1);
    expect(traitPicker(newGame(dailyConfig('2026-11-22', 'You')), 0, false)).toBe(0);
  });
  it('online: only your own seat, and only with a real offer', () => {
    const s = newGame(dailyConfig('2026-11-22', 'You'));
    expect(traitPicker(s, 0, true)).toBe(0);
    const t: GameState = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, traitOffer: [] } : p)) };
    expect(traitPicker(t, 0, true)).toBe(-1);
  });
});

describe('RA-02: Rosa Reads Back compares with Rosa only', () => {
  const xr = EXPERTS[0];
  const at = (cash: number[]) => ({ players: cash.map((c) => ({ cash: c })) }) as unknown as GameState;
  it('ahead of Rosa but behind Pak Din clears', () => {
    expect(xr.clear.met(at([17, 16, 22]), 0)).toBe(true);
  });
  it('$6 ahead of Rosa earns the $5 star even when Pak Din has more', () => {
    expect(xr.mastery.find((g) => g.text.includes('$5'))!.met(at([22, 16, 30]), 0)).toBe(true);
  });
  it('behind Rosa does not clear', () => {
    expect(xr.clear.met(at([15, 16, 10]), 0)).toBe(false);
  });
});

describe('RA-03: the decisive moment never claims a loss on fruit that sold anyway', () => {
  const line = (name: string, fruit: 'watermelon', max: number, offers: { player: number; qty: number; price: number; sold: number }[]) =>
    ({ name, fruit, max, offers: offers.map((o) => ({ ...o, freshness: 0 })) });
  const game = (lines: ReturnType<typeof line>[]): GameState => {
    const s = newGame(dailyConfig('2026-11-22', 'You'));
    s.players.forEach((p, i) => { p.cash = i === 1 ? 30 : 10; });
    s.history = [{ day: 2, lines, income: [0, 0, 0, 0], cash: s.players.map((p) => p.cash) }] as unknown as GameState['history'];
    return s;
  };
  it('undercut, but the same watermelons sold to the next customer: not a loss', () => {
    const s = game([
      line('John', 'watermelon', 7, [{ player: 0, qty: 3, price: 6, sold: 0 }, { player: 1, qty: 3, price: 5, sold: 3 }]),
      line('Aisyah', 'watermelon', 7, [{ player: 0, qty: 3, price: 6, sold: 3 }]),
    ]);
    const r = sprintReason(s, 0);
    expect(r?.kind).not.toBe('undercut');
  });
  it('undercut and the pieces stayed unsold: the loss is named', () => {
    const s = game([
      line('John', 'watermelon', 7, [{ player: 0, qty: 3, price: 6, sold: 0 }, { player: 1, qty: 3, price: 5, sold: 3 }]),
    ]);
    const r = sprintReason(s, 0);
    expect(r?.kind).toBe('undercut');
    expect(r?.cash).toBe(18);
  });
});
