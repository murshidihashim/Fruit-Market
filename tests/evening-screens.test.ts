// Rules 19 on the screens: the evening for everyone at once. In a solo game the computers' builds and favour cards
// arrive as one step as the evening opens (one beat, each label on its own stall) and the person decides straight
// away; online every person decides at the same time, a stall that is done says so on its box, and the bar says who
// the evening is still waiting for once you have said Lights out. When several Priority cards are played the screens
// say who buys first and whose card goes back.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { h } from 'preact';
import { computersEvening } from '../src/engine/ai';
import {
  activePlayer, buyUpgrade, emptyStock, endEvening, finishReveal, newGame, playFavour, publicView,
  type GameState, type PlayerConfig,
} from '../src/engine/game';
import { toStaticHtml } from '../src/ui/cards';
import { playedFavours } from '../src/ui/game/dayBeats';
import { eveningWaitLine, priorityBackLine, priorityNote, priorityWouldReturn } from '../src/ui/game/evening';
import { waitsForPerson } from '../src/ui/game/turn';
import { eveningAside } from '../src/ui/game/useGameController';
import { EveningPanel } from '../src/ui/panel';
import { rivalNote } from '../src/ui/table';
import { passEvening } from './stall-step';

const read = (f: string) => readFileSync(f, 'utf8');
const person = (name: string): PlayerConfig => ({ name, kind: 'human', avatar: '' });
const computer = (name: string): PlayerConfig => ({ name, kind: 'ai', level: 'hard', avatar: '' });

/** The evening of `day` as it opens, line-up `order`, every stall with $30, no perk, no card, an empty shelf. */
function opening(players: PlayerConfig[], day: number, order: number[], set: (s: GameState) => void = () => {}): GameState {
  const s = structuredClone(newGame({ players, days: 10, unripe: true, upgrades: true, events: false, seed: 9 }));
  s.players.forEach((pl) => { pl.stock = emptyStock(true); pl.trait = null; pl.traitOffer = []; pl.favours = []; pl.upgrades = []; pl.cash = 30; });
  s.day = day; s.phase = 'reveal'; s.results = null; s.event = null; s.nextEvent = null; s.standing = null;
  s.order = order; s.turn = 0; s.firstMarket = []; s.secondMarket = []; s.queue = []; s.priorityNext = null;
  set(s);
  return finishReveal(s);
}

describe('a solo evening: the computers first, together, then the person straight away', () => {
  const players = [person('You'), computer('Ali'), computer('Rosa'), computer('Ben')];
  const open = opening(players, 3, [1, 0, 2, 3], (s) => { s.players[1].favours = ['priority', 'gossip']; s.players[2].favours = ['priority']; s.queue = [{ id: 70, name: 'Walk-in', walkIn: true, wants: [{ fruit: 'apple', qty: 1, max: 6 }], original: [{ fruit: 'apple', qty: 1, max: 6 }] }]; });
  const shown = computersEvening(open, (p) => open.players[p].kind === 'ai')!;

  it('the computers\' choices are one step: several stalls build and play cards in it, and the person is next', () => {
    expect(open.phase).toBe('evening');
    expect(activePlayer(open)).toBe(1); // a computer is still to decide: the person's sheet is not up yet
    expect(shown.phase).toBe('evening');
    expect(shown.eveningDone).toEqual([false, true, true, true]);
    expect(activePlayer(shown)).toBe(0);
    const builders = [1, 2, 3].filter((p) => shown.players[p].upgrades.length > 0);
    expect(builders.length).toBeGreaterThan(1);
    // Ali (first in the line-up) played Priority and Gossip in that one step; Rosa kept her Priority card (Ali is earlier).
    expect(playedFavours(open, shown, 1)).toEqual(['priority', 'gossip']);
    expect(playedFavours(open, shown, 2)).toEqual([]);
    expect(shown.priorityNext).toBe(1);
  });

  it('the person can build and say Lights out at once, and the night follows', () => {
    const p = shown.players[0];
    expect(p.upgradeOffer!.length).toBeGreaterThan(0);
    let s = buyUpgrade(shown, 0, 'premium');
    s = endEvening(s, 0);
    expect(s.day).toBe(4);
  });

  it('the controller takes the computers\' evening without a pause and in one step; the night is a step of its own', () => {
    const src = read('src/ui/game/useGameController.ts');
    expect(src).toContain("const next = computersEvening(cur, (p) => cur.players[p].kind === 'ai') ?? aiStep(cur);");
    // The evening's branch comes before the pause that rivals take in the other steps.
    expect(src.indexOf("if (s.phase === 'evening') {\n      const cur = sRef.current;")).toBeLessThan(src.indexOf('void A.pause((A.isFast()'));
  });

  it('each stall has one label: a stall that built and played cards names its cards on the upgrade\'s label', () => {
    const anim = read('src/ui/game/animator.tsx');
    expect(anim).toContain('if (builtNow) jobs.push(built(i, pl.upgrades[pl.upgrades.length - 1], cards));');
    expect(anim).toContain('if (!builtNow) {');
    const beats = read('src/ui/game/dayBeats.tsx');
    expect(beats).toContain("const label = A.tag(`p${p}`, `${also ? `${also} · ` : ''}Built: ${d.title}`, 'upgrade');\n  fitTag(label, p);");
    // Labels over several stalls at once keep to their own stall's width (on two lines if need be).
    expect(anim).toContain('if (evening) fitTag(t, i);');
    expect(beats).toContain("el.style.maxWidth = `${Math.max(72, Math.floor(r.width))}px`;");
  });
});

describe('online: everyone at once', () => {
  const g = opening([person('Ana'), person('Bo'), person('Cy')], 3, [0, 1, 2]);
  const done1 = endEvening(g, 1);

  it('a stall\'s box says whether it is still deciding or its lights are out', () => {
    expect(rivalNote(done1, 1, false)).toBe('closed');
    expect(rivalNote(done1, 2, true)).toBe('deciding…');
    const src = read('src/ui/table.tsx');
    expect(src).toContain("const active = s.phase === 'evening' ? eveningOpen(s, p) : s.phase === 'buy' && s.order[s.turn] === p;");
  });

  it('a person is waited for until they say Lights out, whoever else is deciding', () => {
    for (const seat of [0, 1, 2]) expect(waitsForPerson(g, seat)).toBe(true);
    expect(waitsForPerson(done1, 1)).toBe(false);
    expect(waitsForPerson(done1, 2)).toBe(true);
  });

  it('the bar names who the evening is still waiting for, only once you have said Lights out', () => {
    expect(eveningWaitLine('Ana and Cy')).toBe('Lights out. Waiting for Ana and Cy');
    expect(eveningWaitLine('')).toBe('Lights out');
    const bar = read('src/ui/game/panels/ActionBar.tsx');
    expect(bar).toContain("{quiet && s.phase === 'evening' && !activeHuman && (online");
    expect(bar).toContain('eveningWaitLine(waitingFor(eveningWaits))');
    const ctl = read('src/ui/game/useGameController.ts');
    expect(ctl).toContain("const eveningWaits = s.phase === 'evening' ? live.filter((i) => eveningOpen(s, i)) : [];");
    expect(ctl).toContain("(s.phase === 'evening' ? seat !== null && eveningOpen(s, seat) : active === seat && !secret)");
  });

  it('another stall\'s choice is drawn at once while you are still deciding; your own is played as a beat', () => {
    const bo = buyUpgrade(g, 1, 'barrow');
    expect(eveningAside(g, bo, 0)).toBe(true); // Bo built: Ana's sheet stays up
    expect(eveningAside(g, bo, 1)).toBe(false); // Bo's own build is Bo's beat
    expect(eveningAside(done1, endEvening(done1, 2), 0)).toBe(true);
    const anaDone = endEvening(g, 0);
    expect(eveningAside(g, anaDone, 0)).toBe(false); // Ana's own Lights out
    expect(eveningAside(anaDone, buyUpgrade(anaDone, 1, 'barrow'), 0)).toBe(false); // once done, Ana sees the others' beats
    expect(eveningAside(g, bo, null)).toBe(false); // offline
  });

  it('the evening sheet and the opened card act for this phone\'s own seat', () => {
    const game = read('src/ui/Game.tsx');
    expect(game).toContain('const evP = c.actor;');
    expect(game).toContain('<EveningSheet key={`ev-${s.day}-${evP}`} s={s} p={evP}');
    expect(read('src/ui/game/panels/Popovers.tsx')).toContain('const why = canPlayFavour(s, actor, cardInfo);');
  });
});

describe('Priority played by several stalls: the screens say so', () => {
  // Line-up: Bo, Ana, Cy. Everyone holds Priority.
  const base = opening([person('Ana'), person('Bo'), person('Cy')], 4, [1, 0, 2], (s) => s.players.forEach((pl) => { pl.favours = ['priority']; }));

  it('before anyone plays it: nothing to add (the card says the rule)', () => {
    expect([0, 1, 2].map((p) => priorityNote(base, p))).toEqual([null, null, null]);
    expect([0, 1, 2].map((p) => priorityWouldReturn(base, p))).toEqual([false, false, false]);
  });

  it('after Ana plays: Ana buys first for now; Cy (later) is told a card would go back, Bo (earlier) that it would count', () => {
    const s = playFavour(base, 0, 0);
    expect(priorityNote(s, 0)).toBe('You buy first tomorrow.');
    expect(priorityNote(s, 2)).toBe('Ana has played Priority and is earlier in today\'s line-up. If you play yours, it goes back to your hand.');
    expect(priorityWouldReturn(s, 2)).toBe(true);
    expect(priorityNote(s, 1)).toBe('Ana has played Priority. You are earlier in today\'s line-up: play yours to buy first tomorrow.');
    expect(priorityWouldReturn(s, 1)).toBe(false);
  });

  it('after Bo and Cy play too: Bo buys first, Ana\'s and Cy\'s cards go back', () => {
    const s = playFavour(playFavour(playFavour(base, 0, 0), 2, 0), 1, 0);
    expect(priorityNote(s, 1)).toBe('You buy first tomorrow. Ana\'s and Cy\'s Priority cards go back: you are earlier in today\'s line-up.');
    expect(priorityNote(s, 0)).toBe('Bo is earlier in today\'s line-up and buys first tomorrow. Your Priority card goes back to your hand tonight.');
    expect(priorityNote(s, 2)).toBe('Bo is earlier in today\'s line-up and buys first tomorrow. Your Priority card goes back to your hand tonight.');
    // The evening sheet shows it under the stall's cards, even with no card left in the hand.
    const html = toStaticHtml(h(EveningPanel, { s: publicView(s, 0), p: 0, onCard: () => undefined }));
    expect(s.players[0].favours).toEqual([]);
    expect(html).toContain('Your favours');
    expect(html).toContain('Bo is earlier in today\'s line-up and buys first tomorrow.');
  });

  it('the next morning says whose card came back and who buys first, to each stall in its own words', () => {
    const night = passEvening(playFavour(playFavour(base, 0, 0), 1, 0));
    expect(night.phase).toBe('morning');
    expect(night.order[0]).toBe(1);
    expect(priorityBackLine(night, 0)).toEqual({ text: 'Your Priority card came back to your hand: Bo was earlier in yesterday\'s line-up and buys first.', tone: 'warn' });
    expect(priorityBackLine(night, 1)).toEqual({ text: 'You buy first. Ana\'s Priority card came back: you were earlier in yesterday\'s line-up.', tone: 'good' });
    expect(priorityBackLine(night, 2)).toEqual({ text: 'Bo buys first. Ana\'s Priority card came back: Bo was earlier in yesterday\'s line-up.', tone: '' });
    // A morning after a single Priority card (or none) says nothing of it.
    expect(priorityBackLine(passEvening(playFavour(base, 0, 0)), 0)).toBeNull();
    expect(read('src/ui/game/panels/MorningCard.tsx')).toContain('{first && <div class={`mc-loss tk-info ${first.tone}`}>{first.text}</div>}');
  });

  it('the opened Priority card says, beside Play, when it would only go back', () => {
    const pop = read('src/ui/game/panels/Popovers.tsx');
    expect(pop).toContain("{!why && id === 'priority' && priorityWouldReturn(s, actor) && <p class=\"cd-pop-why\">{priorityNote(s, actor)}</p>}");
  });
});
