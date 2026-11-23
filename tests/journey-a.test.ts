import { describe, expect, it } from 'vitest';
import { CUSTOMER_CARDS, RIVALS, acceptsStage, lookOf, prefOf } from '../src/engine/data';
import { DEFAULT_CONFIG, MAX_SEATS, type PublicSeat } from '../src/net/protocol';
import { practiceQuestion, practiceRound, practiceVerdict, sells, STAGE_OFF, type PracticeRound } from '../src/ui/practice';
import { clock, leagueLine, quickLine, vsComputerConfig, waitLine } from '../src/ui/playMenu';
import { seatChip } from '../src/ui/Online';
import { LEAGUE } from '../src/ui/progress';

// PLAN-113, part A: the price practice on the Quick match wait, the Play menu's words, and the private room's chips.

/** Who sells first, worked out from the rules on their own: the customer takes the cheapest offer that is fresh
 *  enough for its price; your piece is Fresh. 'tie' when both are fresh enough at the same price. */
function firstSeller(r: PracticeRound, mine: number): 'you' | 'rival' | 'tie' | 'nobody' {
  const youOk = mine >= 1 && mine <= r.max;
  const rv = r.rival;
  const rivalOk = acceptsStage(r.pref, rv.stage) && rv.price <= r.max - STAGE_OFF[rv.stage];
  if (!youOk) return rivalOk ? 'rival' : 'nobody';
  if (!rivalOk || mine < rv.price) return 'you';
  return mine === rv.price ? 'tie' : 'rival';
}

describe('the price practice (practice.ts)', () => {
  const rounds = Array.from({ length: 300 }, (_, n) => practiceRound(n, RIVALS[n % RIVALS.length].avatar));

  it('uses a real customer card and one of its lines, and never your own shopkeeper as the rival', () => {
    rounds.forEach((r, n) => {
      const card = CUSTOMER_CARDS.find((c) => c.name === r.who);
      expect(card).toBeTruthy();
      expect(card!.wants).toContainEqual({ fruit: r.fruit, qty: r.qty, max: r.max });
      expect(r.pref).toBe(prefOf(r.who));
      expect(r.rival.avatar).not.toBe(RIVALS[n % RIVALS.length].avatar);
    });
  });

  it('its answer is the highest price at which you are the cheapest fresh-enough offer', () => {
    for (const r of rounds) {
      expect(r.options).toContain(r.answer);
      expect([...r.options].sort((a, b) => a - b)).toEqual(r.options);
      expect(Math.min(...r.options)).toBeGreaterThanOrEqual(1);
      expect(firstSeller(r, r.answer)).toBe('you');
      for (let p = r.answer + 1; p <= r.max + 2; p++) expect(firstSeller(r, p), `${r.who} $${p}`).not.toBe('you');
    }
  });

  it('says why for every option, and only the answer is right', () => {
    for (const r of rounds) {
      for (const p of r.options) {
        const v = practiceVerdict(r, p);
        expect(v.right).toBe(p === r.answer);
        expect(v.text).not.toMatch(/!/);
      }
    }
  });

  it('covers all three cases: a rival over the top price, a rival to undercut, a rival whose fruit is not fresh enough', () => {
    expect(new Set(rounds.map((r) => r.kind))).toEqual(new Set(['over', 'undercut', 'fresh']));
    const fresh = rounds.filter((r) => r.kind === 'fresh');
    for (const r of fresh) expect(sells(r.pref, r.max, r.rival.stage, r.rival.price)).toBe(false);
  });

  it('asks in plain words with the game\'s names', () => {
    const r = practiceRound(0, '');
    expect(practiceQuestion(r).startsWith(`${lookOf(r.who).title} wants ${r.qty} `)).toBe(true);
    expect(practiceQuestion(r)).toContain(`${r.rival.name} asks $${r.rival.price}`);
    expect(practiceQuestion(r)).toMatch(/^.+ wants \d+ [a-z]+, up to \$\d+\. .+ asks \$\d+ for (Fresh|Okay|Soft) ones\. Your price for Fresh\?$/);
    expect(practiceRound(7, '')).toEqual(practiceRound(7, ''));
  });
});

describe('the Play menu and the wait (playMenu.ts)', () => {
  it('quick match is 2, 4 or 6 stalls at the room\'s standard length (PLAN-125)', () => {
    expect(quickLine()).toBe(`Strangers online · 2, 4 or 6 stalls · ${DEFAULT_CONFIG.days} days`);
    expect(waitLine(10, RIVALS[0].avatar)).toBe(`Quick Match is 2 stalls, 10 days. You play as ${RIVALS[0].name}.`);
    expect(waitLine(10, RIVALS[0].avatar, 4)).toBe(`Quick Match is 4 stalls, 10 days. You play as ${RIVALS[0].name}.`);
    expect(MAX_SEATS).toBe(6);
  });

  it('names the league stage with its real rivals and length', () => {
    expect(leagueLine(0)).toBe(`Stage 1 of ${LEAGUE.length} · ${LEAGUE[0].title} · ${LEAGUE[0].days} days vs ${RIVALS[LEAGUE[0].rivals[0].idx].name}`);
    expect(leagueLine(LEAGUE.length - 1)).toMatch(/ vs .+ and .+$/);
    expect(leagueLine(LEAGUE.length)).toMatch(/^All 12 stages cleared/);
  });

  it('the clock counts minutes and seconds', () => {
    expect(clock(0)).toBe('0:00');
    expect(clock(24_900)).toBe('0:24');
    expect(clock(65_000)).toBe('1:05');
  });

  it('"Play the computer now" is the quick match\'s two stalls and length against one Normal computer that is not you', () => {
    const cfg = vsComputerConfig('Mia', RIVALS[0].avatar, 7, () => 0);
    expect(cfg.players).toHaveLength(2);
    expect(cfg.players[0]).toMatchObject({ name: 'Mia', kind: 'human', avatar: RIVALS[0].avatar });
    expect(cfg.players[1]).toMatchObject({ kind: 'ai', level: 'normal', avatar: RIVALS[1].avatar });
    expect(cfg.days).toBe(DEFAULT_CONFIG.days);
    expect(cfg).toMatchObject({ unripe: true, upgrades: true, events: true, marketDays: true, core: false });
  });
});

describe('the private room\'s seat chips', () => {
  const seat = (extra: Partial<PublicSeat>): PublicSeat => ({ seat: 0, name: 'Aina', avatar: '', ready: false, connected: true, host: false, ...extra });
  it('say ready, host, away and left', () => {
    expect(seatChip(seat({ host: true, ready: true }))).toBe('Host · Ready');
    expect(seatChip(seat({ ready: true }))).toBe('Ready');
    expect(seatChip(seat({}))).toBe('Not ready');
    expect(seatChip(seat({ connected: false, ready: true }))).toBe('Away');
    expect(seatChip(seat({ left: true }))).toBe('Left');
  });
});
