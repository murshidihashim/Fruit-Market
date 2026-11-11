// Rules version 17 (PLAN-077): a rival who fills a standing order's gap is paid $1 under the winner's bid; who is
// bidding is public (never the price) and a stall may change its mind while another is still deciding; every unbuilt
// upgrade is on offer after a Market Day.
import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import { aiStep, planOrderBid } from '../src/engine/ai';
import { RIVALS, UPGRADES, type UpgradeId } from '../src/engine/data';
import { activePlayer, beginBuying, bidOrder, canBidOrder, finishReveal, newGame, orderRivalPay, publicView, type GameState } from '../src/engine/game';
import { AI_VERSION, RULES_VERSION } from '../src/net/protocol';
import { redact } from '../server/room';
import { toStaticHtml } from '../src/ui/cards';
import { BidStatus } from '../src/ui/game/panels/OrderPanel';

/** A Market Day morning with the standing order open for bids. `humans`: how many of the seats are people. */
function bidding(n = 4, humans = n): GameState {
  const g = newGame({
    players: RIVALS.slice(0, n).map((r, i) => ({ name: r.name, kind: i < humans ? 'human' as const : 'ai' as const, level: 'normal' as const, avatar: r.avatar })),
    days: 10, unripe: true, upgrades: true, events: false, seed: 3,
  });
  const s: GameState = structuredClone(g);
  s.day = 3;
  s.phase = 'order';
  s.standing = { card: 0, fruit: 'blueberry', qty: 4, ceiling: 9, fine: 6, due: 5, bids: s.players.map(() => null), holder: null, price: null };
  return s;
}

describe('rules version 17', () => {
  it('is the version the app and the server speak, with new computer players', () => {
    expect(RULES_VERSION).toBe(17);
    expect(AI_VERSION).toBe(5);
  });

  it('a rival is paid $1 under the winning bid, never under $1', () => {
    expect(orderRivalPay(14)).toBe(13);
    expect(orderRivalPay(2)).toBe(1);
    expect(orderRivalPay(1)).toBe(1);
  });
});

describe('open bidding for a standing order', () => {
  it('a stall may change its bid, or pass after all, while another stall is still deciding', () => {
    let s = bidding(3);
    s = bidOrder(s, 0, 8);
    s = bidOrder(s, 0, 5); // changed its mind
    expect(s.standing!.bids).toEqual([5, null, null]);
    s = bidOrder(s, 1, 6);
    s = bidOrder(s, 0, null); // passes after all
    s = bidOrder(s, 1, 7);
    expect(s.phase).toBe('order');
    s = bidOrder(s, 2, null); // the last stall decides: bidding closes
    expect(s.phase).toBe('buy');
    expect(s.standing).toMatchObject({ holder: 1, price: 7, bids: ['pass', 7, 'pass'] });
    expect(canBidOrder(s, 0, 4)).toMatch(/No standing order to bid for/);
  });

  it('the last stall still deciding closes the bidding with its choice', () => {
    let s = bidding(2);
    s = bidOrder(s, 1, 6);
    expect(canBidOrder(s, 1, 5)).toBeNull();
    s = bidOrder(s, 0, 4);
    expect(s.standing).toMatchObject({ holder: 0, price: 4 });
  });

  it('what one stall sees: who is bidding and who passed, never a rival\'s price', () => {
    let s = bidding(4);
    s = bidOrder(s, 0, 8);
    s = bidOrder(s, 1, 3);
    s = bidOrder(s, 2, null);
    expect(publicView(s, 0).standing!.bids).toEqual([8, 'in', 'pass', null]);
    expect(publicView(s, 3).standing!.bids).toEqual(['in', 'in', 'pass', null]);
    expect(JSON.stringify(publicView(s, 3).standing)).not.toContain('8');
  });

  it('computer stalls decide before a person does, so the person sees them', () => {
    const s = bidding(3, 1); // seat 0 is the person
    // the first stalls to act are the computers, not the person in seat 0
    const order: number[] = [];
    let t = s;
    for (let k = 0; k < 2; k++) {
      const p = activePlayer(t);
      order.push(p);
      t = bidOrder(t, p, planOrderBid(t, p));
    }
    expect(order).toEqual([1, 2]);
    expect(t.phase).toBe('order'); // still waiting for the person
    expect(t.standing!.bids[0]).toBeNull();
  });

  it('online: the server sends each phone the statuses (a person\'s held choice, a computer\'s plan), its own bid, and no rival price', () => {
    const s = bidding(4, 3); // seats 0 to 2 are people, seat 3 a computer
    const pending = [{ bid: 6 }, null, { bid: null }, null];
    const robot = planOrderBid(s, 3) === null ? 'pass' : 'in';
    expect(redact(s, 0, pending).standing!.bids).toEqual([6, null, 'pass', robot]);
    expect(redact(s, 1, pending).standing!.bids).toEqual(['in', null, 'pass', robot]);
    expect(JSON.stringify(redact(s, 1, pending).standing!.bids)).not.toContain('6');
  });

  it('the bidding screen names each rival as bidding, passed or deciding, without a price', () => {
    let s = bidding(4);
    s = bidOrder(s, 1, 3);
    s = bidOrder(s, 2, null);
    const html = toStaticHtml(h(BidStatus, { s: publicView(s, 0), p: 0 }));
    expect(html).toContain('bidding');
    expect(html).toContain('passed');
    expect(html).toContain('deciding…');
    expect(html).not.toContain('$');
  });
});

describe('upgrades after a Market Day', () => {
  it('every upgrade a stall has not built is on offer (five to start with)', () => {
    expect(Object.keys(UPGRADES)).toHaveLength(5);
    const g = newGame({ players: RIVALS.slice(0, 3).map((r) => ({ name: r.name, kind: 'ai' as const, level: 'normal' as const, avatar: r.avatar })), days: 10, unripe: true, upgrades: true, events: false, seed: 9 });
    let s = g;
    s = playTo(s, 3, 'evening'); // the evening of the first Market Day
    for (const pl of s.players) expect(pl.upgradeOffer).toEqual((Object.keys(UPGRADES) as UpgradeId[]).filter((u) => !pl.upgrades.includes(u)));
  });
});

function playTo(s: GameState, day: number, phase: GameState['phase']): GameState {
  for (let i = 0; i < 5000 && !(s.day === day && s.phase === phase) && s.phase !== 'over'; i++) {
    if (s.phase === 'morning') { s = beginBuying(s); continue; }
    if (s.phase === 'reveal') { s = finishReveal(s); continue; }
    const n = aiStep(s);
    if (!n) throw new Error(`stuck at day ${s.day} ${s.phase}`);
    s = n;
  }
  return s;
}
