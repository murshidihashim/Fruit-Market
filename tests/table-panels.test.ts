// The game table's panels drawn without a browser (REP-140 A-01: these were checked by reading panel.tsx, DaySheet.tsx
// and RushTable.tsx as text): the evening's offers, its main button and an offer's opened card, the pricing sheet's
// Favoured Trade note, whose stall the day's sheet is drawn for, and the Favoured Trade question asked once a day.
import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import { aiActFor } from '../src/engine/ai';
import { RIVALS, UPGRADES, type UpgradeId } from '../src/engine/data';
import { activePlayer, applyAction, canUpgrade, finishReveal, newGame, publicView, type GameState } from '../src/engine/game';
import { toStaticHtml } from '../src/ui/cards';
import { dayStep } from '../src/ui/game/daySheet';
import { dayNow, type DayFacts } from '../src/ui/game/panels/DaySheet';
import { askedOn } from '../src/ui/game/tableNow';
import { EveningBar, EveningPanel, PriceSheetView, UpgradeOpen, offersTonight } from '../src/ui/panel';

/** A real game, one person and three computers, played by the computer until `stop`. */
function playTo(stop: (s: GameState) => boolean, seed = 1): GameState {
  let s = newGame({ players: [0, 1, 2, 3].map((i) => ({ name: i === 0 ? 'Mia' : RIVALS[i].name, kind: i === 0 ? 'human' as const : 'ai' as const, level: 'normal' as const, avatar: RIVALS[i].avatar })), days: 10, unripe: true, upgrades: true, events: true, marketDays: true, seed });
  for (let i = 0; i < 6000 && s.phase !== 'over'; i++) {
    if (stop(s)) return s;
    if (s.phase === 'morning') { s = applyAction(s, 0, { kind: 'begin' }); continue; }
    if (s.phase === 'reveal') { s = finishReveal(s); continue; }
    s = aiActFor(s, activePlayer(s))!;
  }
  throw new Error('never reached');
}

describe('the evening\'s offers (panel.tsx; PLAN-090)', () => {
  const draft = playTo((s) => s.phase === 'evening' && activePlayer(s) === 0 && (s.players[0].upgradeOffer?.length ?? 0) > 0 && s.players[0].cash >= 6);
  const poor = structuredClone(draft);
  poor.players[0].cash = 0;
  const offer = offersTonight(poor, 0)[0];
  const button = (html: string, u: UpgradeId) => html.match(new RegExp(`<button type="button" class="uo uo-pick[^"]*" data-up="${u}"[^>]*>`))![0];

  it('an offer the stall cannot build can still be opened as its whole card, with the reason; it is never chosen', () => {
    expect(canUpgrade(poor, 0, offer)).not.toBeNull();
    // a tap opens the card: the offer is a button that says it is not available, and is not switched off
    const open = button(toStaticHtml(h(EveningPanel, { s: publicView(poor, 0), p: 0, onCard: () => {}, onPick: () => {}, onOpen: () => {} })), offer);
    expect(open).toContain('aria-disabled="true"');
    expect(open).not.toMatch(/ disabled[ >]/);
    // with nothing to open it, it is switched off
    const shut = button(toStaticHtml(h(EveningPanel, { s: publicView(poor, 0), p: 0, onCard: () => {}, onPick: () => {} })), offer);
    expect(shut).toMatch(/ disabled[ >]/);
    // an offer the stall can build is chosen, never opened
    const rich = offersTonight(draft, 0).find((u) => canUpgrade(draft, 0, u) === null)!;
    const pick = button(toStaticHtml(h(EveningPanel, { s: publicView(draft, 0), p: 0, onCard: () => {}, onPick: () => {}, onOpen: () => {} })), rich);
    expect(pick).not.toContain('aria-disabled');
    expect(pick).not.toMatch(/ disabled[ >]/);
  });

  it('its opened card says why it cannot be built now, in the game\'s words; one that can be built says nothing more', () => {
    const why = canUpgrade(poor, 0, offer)!;
    expect(toStaticHtml(h(UpgradeOpen, { s: poor, p: 0, open: offer, onClose: () => {} }))).toContain(`<p class="cd-pop-why">${why}</p>`);
    const rich = offersTonight(draft, 0).find((u) => canUpgrade(draft, 0, u) === null)!;
    expect(toStaticHtml(h(UpgradeOpen, { s: draft, p: 0, open: rich, onClose: () => {} }))).not.toContain('cd-pop-why');
  });

  it('one main button: "Build <name> · $<cost>" beside "Lights out without building", or "Lights out"; only the main one is a .btn', () => {
    const chosen = offersTonight(draft, 0)[0];
    const two = toStaticHtml(h(EveningBar, { chosen, onBuild: () => {}, onDone: () => {} }));
    expect(two).toContain(`>Build ${UPGRADES[chosen].title} · $${UPGRADES[chosen].cost}</button>`);
    expect(two).toContain('<button type="button" class="ev-out">Lights out without building</button>');
    expect(two).toContain('data-two=""');
    expect(two.match(/class="btn /g)).toHaveLength(1);
    const one = toStaticHtml(h(EveningBar, { chosen: null, onBuild: () => {}, onDone: () => {} }));
    expect(one).toContain('>Lights out <small class="btn-sub">next day</small></button>');
    expect(one).not.toContain('data-two');
    expect(one.match(/class="btn /g)).toHaveLength(1);
  });
});

describe('the pricing sheet (panel.tsx PriceSheetView)', () => {
  it('a stall holding Favoured Trade is told it will be asked after the prices flip if it ties', () => {
    const bid = playTo((s) => s.phase === 'bid' && activePlayer(s) === 0);
    const draw = (s: GameState) => toStaticHtml(h(PriceSheetView, { s, p: 0, vals: {}, notice: false, onPrice: () => {}, onNotice: () => {} }));
    const held = structuredClone(bid);
    held.players[0].favours = ['favouredTrade'];
    expect(draw(held)).toContain('You hold Favoured Trade. If you tie, you\'ll be asked after the prices flip.');
    held.players[0].favours = [];
    expect(draw(held)).not.toContain('Favoured Trade');
  });
});

describe('whose stall the day\'s sheet and the round table are drawn for (DaySheet.tsx dayNow)', () => {
  const facts = (over: Partial<DayFacts> = {}): DayFacts => ({ busy: false, myBidTurn: true, humans: [0], handedTo: null, bell: null, rung: false, show: null, revealDone: false, ...over });
  const stall = playTo((s) => s.phase === 'stall' && activePlayer(s) === 0);

  it('the person the phone was handed to, on a shared phone; this phone\'s own seat online; the one person otherwise', () => {
    expect(dayNow(stall, 0, facts(), false).mine).toBe(true);
    expect(dayNow(stall, 0, facts({ humans: [0, 1] }), false).mine).toBe(false);
    expect(dayNow(stall, 0, facts({ humans: [0, 1], handedTo: 0 }), false).mine).toBe(true);
    expect(dayNow(stall, 0, facts({ humans: [0, 1] }), true).mine).toBe(true);
    // a computer's stall is never drawn as anyone's own
    expect(dayNow(stall, 1, facts(), false).mine).toBe(false);
    // so nothing of a stall's crate is drawn until the phone is handed to its owner
    expect(dayStep(dayNow(stall, 0, facts({ humans: [0, 1] }), false))).toBeNull();
    expect(dayStep(dayNow(stall, 0, facts({ humans: [0, 1], handedTo: 0 }), false))).toBe('stock');
  });

  it('online a stall has opened once its choice is sent; offline once the game has it', () => {
    expect(dayNow(stall, 0, facts({ myBidTurn: false }), true).opened).toBe(true);
    expect(dayNow(stall, 0, facts({ myBidTurn: false }), false).opened).toBe(false);
  });
});

describe('the Favoured Trade question is asked once a day (tableNow.ts askedOn)', () => {
  it('the day a stall was asked is kept until the next day it is asked', () => {
    expect(askedOn(-1, false, 3)).toBe(-1);
    expect(askedOn(-1, true, 3)).toBe(3);
    expect(askedOn(3, false, 3)).toBe(3);
    expect(askedOn(3, false, 4)).toBe(3);
    expect(askedOn(3, true, 5)).toBe(5);
  });
});
