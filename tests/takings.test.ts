import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { h } from 'preact';
import { autoplay } from '../src/engine/ai';
import { FAVOURS, FRUITS, RIVALS, lookOf, stageAt } from '../src/engine/data';
import { count, leavingTonight, newGame, nightOutlook, places, publicView, ranking, servingCustomers, type GameState } from '../src/engine/game';
import { dayLedger, jamDue, standing, tonightLine, withJamPaid } from '../src/engine/story';
import { LANES } from '../src/ui/boardModel';
import { toStaticHtml } from '../src/ui/cards';
import {
  TIGHTEST, TakingsView, closer, extras, rushOver, shelfTonight, stallRows, takingsRows, type Fitting, type TakingsRow,
} from '../src/ui/game/panels/SalesSummary';
import { tonightWord } from '../src/ui/game/tonight';

// The day's takings (PLAN-085; the approved Takings board): the ledger's lines, the list of stalls, the favour card
// won and what tonight does to the shelf all come from what the game worked out, and never from a rival's shelf.

const read = (f: string) => readFileSync(f, 'utf8');
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Every day of some games at the moment the takings are shown (the rush is over), and the morning that follows. */
function days(stalls: number, seeds: number[]): { s: GameState; next: GameState | null }[] {
  const out: { s: GameState; next: GameState | null }[] = [];
  for (const seed of seeds) {
    let s = newGame({
      players: [{ name: 'Mia', kind: 'ai', level: 'normal', avatar: RIVALS[0].avatar }, ...RIVALS.slice(1, stalls).map((r) => ({ name: r.name, kind: 'ai' as const, level: 'normal' as const, avatar: r.avatar }))],
      days: 10, unripe: true, upgrades: true, events: true, seed,
    });
    let open: { s: GameState; next: GameState | null } | null = null;
    for (let i = 0; i < 6000 && s.phase !== 'over'; i++) {
      if (s.phase === 'reveal' && s.results && (!open || open.s.day !== s.day)) { open = { s, next: null }; out.push(open); }
      if (s.phase === 'morning' && open && open.s.day === s.day - 1 && !open.next) open.next = s;
      s = autoplay(s, 1);
    }
  }
  return out;
}
const four = days(4, [1, 2, 3, 4, 5, 6, 7, 8]);
const six = days(6, [1, 2, 3, 4]);
const two = days(2, [1, 2]);
const all = [...four, ...six, ...two];
const seats = (s: GameState) => s.players.map((_, p) => p);
const view = (s: GameState, viewer = 0) => toStaticHtml(h(TakingsView, { s, viewer }));
const find = (ok: (s: GameState, p: number) => boolean): { s: GameState; p: number } => {
  for (const { s } of all) for (const p of seats(s)) if (ok(s, p)) return { s, p };
  throw new Error('no such day in these games');
};
const row = (rows: TakingsRow[], key: TakingsRow['key']) => rows.find((x) => x.key === key);

describe('the ledger', () => {
  it('its lines add up to the day\'s change in cash, for every stall on every day', () => {
    expect(all.length).toBeGreaterThan(120);
    const seen = new Set<string>();
    for (const { s } of all) for (const p of seats(s)) {
      const rows = takingsRows(s, p);
      const l = dayLedger(s, p);
      expect(l.net).not.toBeNull();
      expect(sum(rows.map((x) => x.amount ?? 0))).toBe(l.net);
      // money in first, then money out; "sold" always leads and is never negative
      expect(rows[0].key).toBe('sold');
      expect(rows[0].amount).toBeGreaterThanOrEqual(0);
      // each line once
      expect(new Set(rows.map((x) => x.key)).size).toBe(rows.length);
      for (const x of rows) seen.add(x.key);
    }
    // these games reach every line but a Sharp Ears tip and "Other" (the next test)
    expect([...seen].sort()).toEqual(['bought', 'hawker', 'jam', 'jar', 'order', 'sold', 'stake', 'staked']);
  });

  it('a Sharp Ears tip has its own line, and a change no line explains stays under "Other"', () => {
    const { s } = find((x, p) => p === 0 && x.day < x.config.days && x.results!.income[0] > 0 && !x.results!.earful?.length);
    const before = takingsRows(s, 0);
    const tipped = structuredClone(s);
    tipped.results!.earful = [{ player: 0, customer: tipped.results!.lines[0].name, tip: 2 }];
    tipped.results!.income[0] += 2;
    tipped.players[0].cash += 2;
    const rows = takingsRows(tipped, 0);
    expect(row(rows, 'ears')).toEqual({ key: 'ears', label: 'Sharp Ears tip', amount: 2 });
    expect(row(rows, 'sold')).toEqual(row(before, 'sold'));
    expect(sum(rows.map((x) => x.amount ?? 0))).toBe(dayLedger(tipped, 0).net);
    const odd = structuredClone(s);
    odd.players[0].cash -= 3;
    expect(row(takingsRows(odd, 0), 'other')).toEqual({ key: 'other', label: 'Other', amount: -3 });
    expect(row(before, 'other')).toBeUndefined();
  });

  it('"sold" counts the pieces sold in the rush, a fruit for each in lane order, and is what is left of the sales total', () => {
    for (const { s } of all) for (const p of seats(s)) {
      const r = s.results!;
      const sold = row(takingsRows(s, p), 'sold')!;
      const mine = r.lines.filter((l) => !(r.order && r.order.holder === p && l.name === r.order.name)).flatMap((l) => l.offers.filter((o) => o.player === p).map((o) => ({ f: l.fruit, o })));
      expect(sold.fruits).toEqual(LANES.flatMap((f) => Array.from({ length: sum(mine.filter((x) => x.f === f).map((x) => x.o.sold)) }, () => f)));
      expect(sold.label).toBe(sold.fruits!.length === 0 ? 'Nothing sold' : sold.fruits!.length === 1 ? 'Sold 1 piece' : `Sold ${sold.fruits!.length} pieces`);
      // with no order, tip or hawker it is the rush's own money: each piece at its price, and a Juice Bar's extra
      const others = (r.order?.holder === p ? 1 : 0) + (r.earful ?? []).filter((x) => x.player === p).length + (r.tipJar ?? []).filter((x) => x.player === p).length + (r.hawker ?? []).filter((x) => x.player === p).length;
      if (!others) expect(sold.amount).toBe(sum(mine.map((x) => x.o.sold * x.o.price + (x.o.juice ?? 0))));
    }
  });

  it('a standing order collected today has its pay and its stake on lines of their own', () => {
    const full = find((s, p) => s.results!.order?.holder === p && s.results!.order.short === 0 && s.results!.order.stake > 0);
    const o = full.s.results!.order!;
    const rows = takingsRows(full.s, full.p);
    expect(row(rows, 'order')).toEqual({ key: 'order', label: `Standing order · ${o.qty} of ${o.qty} delivered`, amount: sum(o.sales.map((x) => x.n * x.price)) });
    expect(row(rows, 'stake')).toEqual({ key: 'stake', label: 'Stake back', amount: o.stake });
    expect(row(rows, 'other')).toBeUndefined();
    // the sentence the game had for it says the same
    expect(extras(full.s.results!, full.p).join(' ')).toContain(`got your $${o.stake} stake back`);
    // nothing of it on another stall's card
    const rival = seats(full.s).find((p) => p !== full.p)!;
    expect(takingsRows(full.s, rival).some((x) => x.key === 'order' || x.key === 'stake')).toBe(false);

    const short = find((s, p) => s.results!.order?.holder === p && s.results!.order.short > 0 && s.results!.order.stake > 0);
    const so = short.s.results!.order!;
    const lost = row(takingsRows(short.s, short.p), 'stake')!;
    expect(lost).toEqual({ key: 'stake', label: `Stake of $${so.stake} lost`, amount: null });
    expect(row(takingsRows(short.s, short.p), 'order')!.label).toBe(`Standing order · ${so.qty - so.short} of ${so.qty} delivered`);
  });

  it('the stake put down for an order won this morning is a line on that day only', () => {
    const won = find((s, p) => !!row(takingsRows(s, p), 'staked'));
    const st = won.s.standing!;
    expect(st.holder).toBe(won.p);
    expect(row(takingsRows(won.s, won.p), 'staked')).toEqual({ key: 'staked', label: 'Stake on a standing order', amount: -(st.staked ?? 0) });
    // the next day the order is still held, and the stake is not counted again
    const later = all.find(({ s }) => s.config.seed === won.s.config.seed && s.players.length === won.s.players.length && s.day === won.s.day + 1)!;
    expect(later.s.standing?.holder).toBe(won.p);
    expect(row(takingsRows(later.s, won.p), 'staked')).toBeUndefined();
  });

  it('the jam maker\'s money is a line on the final day, counted in "Up today"', () => {
    const last = find((s, p) => s.day === s.config.days && jamDue(s, p) > 0);
    expect(row(takingsRows(last.s, last.p), 'jam')).toEqual({ key: 'jam', label: 'Jam maker tonight', amount: jamDue(last.s, last.p) });
    const html = view(last.s, last.p);
    expect(html).toContain(`Jam maker tonight <b class="good">+$${jamDue(last.s, last.p)}</b>`);
    expect(html).toContain('MARKET CLOSED');
    expect(html).not.toContain('to go');
    // no night follows the final day: nothing about the shelf
    expect(html).not.toContain('tg-shelf');
    expect(shelfTonight(last.s, last.p)).toEqual([]);
  });

  it('an older save without the day\'s starting cash shows its lines and no "Up today"', () => {
    const { s } = find((x, p) => p === 0 && x.results!.income[0] > 0 && x.day < x.config.days);
    const old = { ...s, dayStartCash: undefined };
    expect(takingsRows(old, 0).some((x) => x.key === 'other')).toBe(false);
    expect(view(old)).not.toMatch(/Up today|Down today|Even today/);
    // the list then shows each stall's sales for the day
    expect(view(old)).toContain(`<span class="tg-td">+$${s.results!.income[0]} today</span>`);
  });
});

describe('the takings as drawn', () => {
  it('the heading, the days to go and "Up today" or "Down today"', () => {
    for (const { s } of all) {
      const html = view(s);
      const net = dayLedger(s, 0).net!;
      const rem = s.config.days - s.day;
      expect(html).toContain(`Day ${s.day} · your takings`);
      expect(html).toContain(rem === 0 ? 'MARKET CLOSED' : rem === 1 ? '1 day to go' : `${rem} days to go`);
      expect(html).toContain(net > 0 ? `Up today <b class="good">+$${net}</b>` : net < 0 ? `Down today <b class="bad">−$${-net}</b>` : 'Even today <b class="flat">$0</b>');
      // plain words: no exclamation marks anywhere on the card
      expect(html.replace(/<[^>]*>/g, ' ')).not.toContain('!');
    }
    expect(all.some(({ s }) => dayLedger(s, 0).net! < 0)).toBe(true);
    // a day that changed nothing is "Even today"
    const even = find((s, p) => dayLedger(s, p).net === 0);
    expect(view(even.s, even.p)).toContain('Even today <b class="flat">$0</b>');
  });

  it('every stall once, first to last, with its day and its cash; this stall\'s row is marked', () => {
    for (const { s } of all) for (const p of [0, s.players.length - 1]) {
      const rows = stallRows(s, p);
      const after = withJamPaid(s);
      expect(rows.map((x) => x.p)).toEqual(ranking(after));
      expect(rows.map((x) => x.place)).toEqual(ranking(after).map((i) => places(after)[i]));
      for (const x of rows) {
        expect(x.cash).toBe(after.players[x.p].cash);
        expect(x.today).toBe(dayLedger(s, x.p).net);
        // a stall's cash is where it started the day plus what the day changed
        expect(x.cash).toBe(s.dayStartCash![x.p] + x.today!);
        expect(x.me).toBe(x.p === p);
      }
      // this stall's row says what "Up today" says, and its place is the place in the line under the list
      const me = rows.find((x) => x.me)!;
      expect(me.today).toBe(dayLedger(s, p).net);
      expect(me.place).toBe(standing(after, p).rank);
      const html = view(s, p);
      expect(html.match(/class="tg-stall /g)?.length).toBe(s.players.length);
      expect(html.match(/class="tg-stall me"/g)?.length).toBe(1);
      expect(html).toContain(`The stalls after day ${s.day}`);
      expect(html).toContain(standing(after, p).text.replace(/&/g, '&amp;'));
      // this stall's own row says "You" on a phone that is not shared (PLAN-090)
      const names = rows.map((x) => html.indexOf(`<span class="tg-name">${x.me ? 'You' : x.name}</span>`));
      expect(names.every((at) => at > 0)).toBe(true);
      expect([...names].sort((a, b) => a - b)).toEqual(names);
    }
  });

  it('the strip counts today\'s customers and the ones who bought something', () => {
    for (const { s } of all) {
      const crowd = rushOver(s);
      expect(crowd.map((x) => x.id)).toEqual(servingCustomers(s).map((c) => c.id));
      for (const x of crowd) expect(x.served).toBe(s.results!.lines.some((l) => l.customerId === x.id && l.offers.some((o) => o.sold > 0)));
      expect(view(s)).toContain(`<span>The rush is over</span> · <span>${crowd.filter((x) => x.served).length} of ${crowd.length} served</span>`);
    }
    expect(all.some(({ s }) => rushOver(s).some((x) => !x.served))).toBe(true);
  });

  it('a favour card won today is shown to the stall that won it, and to no other', () => {
    const { s, p } = find((x, q) => x.results!.favours.some((f) => f.player === q) && x.results!.favours.some((f) => f.player !== q));
    const mine = s.results!.favours.filter((f) => f.player === p);
    const html = view(s, p);
    expect(html.match(/Favour won/g)?.length).toBe(mine.length);
    for (const f of mine) expect(html).toContain(`<span>${FAVOURS[f.favour].title}. You alone filled ${lookOf(f.customer).title}'s whole order.</span>`);
    // a stall that won none sees none, whatever the others won
    const none = find((x, q) => x.results!.favours.length > 0 && !x.results!.favours.some((f) => f.player === q));
    expect(view(none.s, none.p)).not.toContain('Favour won');
  });

  it('nothing is drawn from a rival\'s shelf: the card is the same from what this stall may see', () => {
    let checked = 0;
    for (const { s } of all) {
      if (s.day === s.config.days) continue; // the final day counts jam money, which the table screen only knows for this stall
      for (const p of [0, 1]) {
        expect(view(publicView(s, p), p)).toBe(view(s, p));
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(200);
  });
});

describe('what tonight does to the shelf', () => {
  const byStage = (s: GameState, p: number) => {
    const out: Record<string, number> = {};
    for (const f of FRUITS) s.players[p].stock[f].forEach((n, pos) => { if (n) out[`${f}:${stageAt(f, pos)}`] = (out[`${f}:${stageAt(f, pos)}`] ?? 0) + n; });
    return out;
  };

  it('the chips hold every piece on the shelf, and the pieces that leave are the night\'s own count', () => {
    let leaving = 0, heat = 0, calm = 0;
    for (const { s } of all) for (const p of seats(s)) {
      const chips = shelfTonight(s, p);
      if (s.day === s.config.days) { expect(chips).toEqual([]); continue; }
      expect(sum(chips.map((c) => c.n))).toBe(count(s.players[p].stock));
      const gone = leavingTonight(s, p);
      for (const f of FRUITS) expect(sum(chips.filter((c) => c.fruit === f && c.next === null).map((c) => c.n)), `${f} day ${s.day}`).toBe(gone[f]);
      leaving += sum(Object.values(gone));
      if ((s.event?.ageExtra ?? 0) > 0) heat++;
      if ((s.event?.ageExtra ?? 0) < 0) calm++;
      // in lane order, and one chip for each fruit, freshness and outcome
      expect(chips.map((c) => LANES.indexOf(c.fruit))).toEqual([...chips.map((c) => LANES.indexOf(c.fruit))].sort((a, b) => a - b));
      expect(new Set(chips.map((c) => `${c.fruit}:${c.stage}:${c.next}`)).size).toBe(chips.length);
    }
    expect(leaving).toBeGreaterThan(20);
    // a Heatwave and a Monsoon are among these nights
    expect(heat).toBeGreaterThan(0);
    expect(calm).toBeGreaterThan(0);
  });

  it('the pieces that stay are as fresh next morning as the chips said (no Shade Cloth, and nothing built that evening)', () => {
    let checked = 0;
    for (const { s, next } of all) {
      if (!next) continue;
      for (const p of seats(s)) {
        // the takings come before the evening: a Shade Cloth's choice and a Ripening Room built then can still change the night
        if (s.players[p].trait === 'keeper' || next.players[p].upgrades.length !== s.players[p].upgrades.length) continue;
        const said: Record<string, number> = {};
        for (const c of shelfTonight(s, p)) if (c.next) said[`${c.fruit}:${c.next}`] = (said[`${c.fruit}:${c.next}`] ?? 0) + c.n;
        expect(byStage(next, p), `seat ${p} day ${s.day}`).toEqual(said);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(300);
  });

  it('a chip says what the stocking row of the same box says (tonight.ts), and only pieces that leave are marked lost', () => {
    const words = new Set<string>();
    for (const { s } of all) for (const p of seats(s)) {
      const chips = shelfTonight(s, p);
      for (const f of FRUITS) s.players[p].stock[f].forEach((n, pos) => {
        if (!n || s.day === s.config.days) return;
        const said = tonightWord(s, p, f, pos);
        const chip = chips.find((c) => c.fruit === f && c.stage === stageAt(f, pos) && c.text === said.text);
        expect(chip, `${f} box ${pos} day ${s.day}`).toBeDefined();
        expect(chip!.bad).toBe(said.bad);
        words.add(said.text);
      });
      for (const c of chips) if (c.bad) expect(c.next).toBeNull();
    }
    // these nights say all of these
    for (const w of ['ripe tomorrow', 'okay tomorrow', 'soft tomorrow', 'spoils tonight', 'still green tomorrow']) expect(words, w).toContain(w);
  });

  it('the card says it: the shelf\'s count, the chips and the night\'s own sentence', () => {
    const { s, p } = find((x, q) => x.day < x.config.days && nightOutlook(x, q).spoil > 0 && nightOutlook(x, q).juice === 0);
    const html = view(s, p);
    expect(html).toContain(`Your shelf · ${count(s.players[p].stock)} of `);
    expect(html).toContain(`<div class="sc-waste">${tonightLine(s, p)}</div>`);
    expect(html).toMatch(/class="tg-chip st-\w+ bad"/);
    expect(html).toMatch(/spoils? tonight<\/span>/);
    // an event that changes the night is named; an ordinary night is not
    const hot = find((x, q) => x.day < x.config.days && (x.event?.ageExtra ?? 0) > 0 && count(x.players[q].stock) > 0);
    expect(view(hot.s, hot.p)).toContain(`<span>After tonight's ${hot.s.event!.title}</span>`);
    const plain = find((x, q) => x.day < x.config.days && !x.event?.ageExtra && count(x.players[q].stock) > 0);
    expect(view(plain.s, plain.p)).toContain('<span>After tonight</span>');
    // an empty shelf has nothing to say
    const empty = find((x, q) => x.day < x.config.days && count(x.players[q].stock) === 0);
    expect(view(empty.s, empty.p)).not.toContain('tg-shelf');
  });
});

describe('fitting the sheet', () => {
  const sheet = (heights: number[], room: number): Fitting & { steps: number[] } => {
    const el = { dataset: {} as DOMStringMap, clientHeight: room, steps: [] as number[], get scrollHeight() { return heights[Number(this.dataset.tight ?? 0)]; } };
    return el;
  };

  it('is drawn closer a step at a time until it fits, and no further', () => {
    const roomy = sheet([480, 440, 400, 360, 330], 496);
    closer(roomy);
    expect(roomy.dataset.tight).toBeUndefined();
    const two = sheet([560, 520, 490, 450, 420], 496);
    closer(two);
    expect(two.dataset.tight).toBe('2');
    // looked at again (a row changed its size): it never goes back a step
    closer(two);
    expect(two.dataset.tight).toBe('2');
    const most = sheet([900, 860, 820, 780, 740], 496);
    closer(most);
    expect(most.dataset.tight).toBe(String(TIGHTEST)); // past the last step the sheet scrolls
  });

  it('the stylesheet has a rule for every step, and the sheet reaches by the table\'s own measure', () => {
    const css = read('src/ui/takings.css');
    expect(TIGHTEST).toBe(4);
    for (let step = 1; step <= TIGHTEST; step++) expect(css).toMatch(step === 1 ? /\.sales-card\[data-tight\] / : new RegExp(`\\[data-tight='${step}'\\]`));
    expect(css).toContain('#app .tkt > .centre > .sales-card {\n  z-index: 6; margin-top: calc(0px - var(--rise, 0px)); margin-bottom: calc(0px - var(--drop, 0px));');
    const src = read('src/ui/game/panels/SalesSummary.tsx');
    expect(src).toContain("useReach(root, 'street', true, true, closerOnceSeen)");
    // the stylesheet comes after the table's and the other sheets', so its rules win
    const main = read('src/main.tsx');
    expect(main.indexOf("import './ui/takings.css'")).toBeGreaterThan(main.indexOf("import './ui/sheets.css'"));
    expect(main.indexOf("import './ui/takings.css'")).toBeGreaterThan(main.indexOf("import './ui/ticket.css'"));
    // only position, size and fade move on the table, and this sheet adds no move of its own
    expect(css).not.toMatch(/animation|transition|@keyframes/);
  });
});
