// REP-140 C-01 and C-03: every League star can be earned, and a star is decided by seat, never by a name.
// C-01: a stage's starting Soft fruit must have a buyer on its first day (Soft fruit sells only to Bargain customers
// and spoils that night); Rescue the Stall's old Soft watermelon had none, so "Let no fruit spoil" could not be met.
// C-03: the standing-order stars read who won the order by seat, so a player named like a rival is never given the
// rival's order.
import { describe, expect, it } from 'vitest';
import { openStage } from '../src/engine/ai';
import { FRUITS, RIVALS, prefOf, stageAt } from '../src/engine/data';
import { newGame, rowCustomers, type GameState } from '../src/engine/game';
import { ALL_STAGES, starsEarned } from '../src/ui/campaign';
import { leagueConfig } from '../src/ui/progress';
import { SCRIPTS, run, start, type Script } from '../scripts/league-scripts';

const named = (stage: number, name: string): GameState => openStage(newGame(leagueConfig(stage, name, '')));
const RESCUE = ALL_STAGES.findIndex((st) => st.title === 'Rescue the Stall');
const CONTRACT = ALL_STAGES.findIndex((st) => st.title === 'The Right Contract');
const RESORT = ALL_STAGES.findIndex((st) => st.title === 'The Resort Order');

describe('C-01: a starting Soft piece can be sold before it spoils', () => {
  it('every stage that starts the player with Soft fruit has a Bargain customer for it on the first day', () => {
    let checked = 0;
    ALL_STAGES.forEach((st, i) => {
      const shelf = st.setup.shelf?.[0];
      if (!shelf) return;
      const s = start(i);
      const crowd = [...rowCustomers(s), ...(s.forecast ? [s.forecast] : []), ...s.queue];
      for (const f of FRUITS) {
        const soft = (shelf[f] ?? []).filter((n, pos) => n > 0 && stageAt(f, pos) === 'notso').length;
        if (!soft) continue;
        checked++;
        const buyer = crowd.some((c) => prefOf(c.name) === 'bargain' && c.wants.some((w) => w.fruit === f));
        expect(buyer, `${st.title}: a Bargain customer wants the Soft ${f} on day ${s.day}`).toBe(true);
      }
    });
    expect(checked).toBeGreaterThanOrEqual(2);
  });
  it('Rescue the Stall starts with a Soft apple, two Okay apples and an Okay watermelon, and $5', () => {
    const s = start(RESCUE);
    expect(s.players[0].cash).toBe(5);
    expect(s.players[0].stock.apple).toEqual([1, 2, 0, 0, 0, 0]);
    expect(s.players[0].stock.watermelon).toEqual([0, 1, 0, 0]);
    expect(s.players.slice(1).map((p) => p.cash)).toEqual([16, 16]);
  });
  it('Rescue the Stall: the player who sells the old stock first lets nothing spoil and earns all three stars', () => {
    const g = run(start(RESCUE), SCRIPTS[RESCUE].lesson[1]);
    expect(g.players[0].stats.spoiled).toBe(0);
    expect(starsEarned(g, 0)).toEqual(['rs_clear', 'rs_waste', 'rs_cash']);
    // the naive player still does not clear it
    expect(starsEarned(run(start(RESCUE), SCRIPTS[RESCUE].naive[1]), 0)).not.toContain('rs_clear');
  });
});

describe('C-03: the standing-order stars are decided by seat', () => {
  const pass: Script = { bid: () => null };
  const bid7: Script = { bid: () => 7 };
  it('a player named like the rival who won the order is not given its stars', () => {
    for (const [stage, ids] of [[CONTRACT, ['rc_clear', 'rc_margin']], [RESORT, ['ho_bid']]] as const) {
      const plain = run(start(stage), pass);
      const line = plain.log.find((l) => l.includes(' won the standing order for '));
      expect(line, ALL_STAGES[stage].title).toBeDefined();
      const winner = RIVALS.find((r) => line!.startsWith(`${r.name} won`))!.name;
      const g = run(named(stage, winner), pass);
      expect(g.log).toContain(line);
      expect(g.players[0].name).toBe(winner);
      for (const id of ids) expect(starsEarned(g, 0), `${ALL_STAGES[stage].title} as ${winner}`).not.toContain(id);
    }
  });
  it('a player named like a rival who wins the order themselves still earns its stars', () => {
    const rival = RIVALS[ALL_STAGES[CONTRACT].rivals[1].idx].name;
    for (const name of ['You', rival]) {
      const g = run(named(CONTRACT, name), bid7);
      expect(g.log.some((l) => l.startsWith(`${name} won the standing order`)), name).toBe(true);
      expect(starsEarned(g, 0), name).toContain('rc_margin');
      expect(starsEarned(g, 0), name).toContain('rc_clear');
    }
  });
});
