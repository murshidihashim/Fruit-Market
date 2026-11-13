// Rules 19, the evening for everyone at once: what the screens say about Priority cards played by several stalls.
// Every stall with something to decide decides at the same time; when more than one plays Priority, the stall earliest
// in today's line-up buys first tomorrow and every other Priority card played goes back to its owner's hand. Drawn from
// the game's own state (who played is public), so tests can read the sentences.
import type { GameState } from '../../engine/game';

/** Online, the bar once this person has said Lights out: who the evening is still waiting for (`names`, already joined;
 *  empty when nobody is left and the night is on its way). */
export function eveningWaitLine(names: string): string {
  return names ? `Lights out. Waiting for ${names}` : 'Lights out';
}

/** "Ali", "Ali and Rosa", "Ali, Rosa and Ben". */
function list(names: string[]): string {
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] ?? '';
}

/** The stalls that have played Priority this evening (a state from before rules 19 records only the one it allowed). */
function played(s: GameState): number[] {
  return s.priorityPlayed ?? (s.priorityNext !== null ? [s.priorityNext] : []);
}

/**
 * Under stall `p`'s favour cards in the evening: where Priority stands tonight, for a stall that holds a Priority card
 * or has played one (null: nothing to say). Who goes first tomorrow, whether `p`'s card would count, or that it will go
 * back to the hand.
 */
export function priorityNote(s: GameState, p: number): string | null {
  const first = s.priorityNext;
  const plays = played(s);
  if (s.phase !== 'evening' || first === null || !plays.length || !s.players[p] || !s.players[first]) return null;
  const name = s.players[first].name;
  if (plays.includes(p)) {
    if (first !== p) return `${name} is earlier in today's line-up and buys first tomorrow. Your Priority card goes back to your hand tonight.`;
    const others = plays.filter((q) => q !== p).map((q) => s.players[q].name);
    if (!others.length) return 'You buy first tomorrow.';
    return `You buy first tomorrow. ${list(others.map((n) => `${n}'s`))} Priority card${others.length > 1 ? 's go' : ' goes'} back: you are earlier in today's line-up.`;
  }
  if (!s.players[p].favours.includes('priority')) return null;
  return s.order.indexOf(first) < s.order.indexOf(p)
    ? `${name} has played Priority and is earlier in today's line-up. If you play yours, it goes back to your hand.`
    : `${name} has played Priority. You are earlier in today's line-up: play yours to buy first tomorrow.`;
}

/**
 * Whether a Priority card stall `p` plays now would only go back to its hand: a stall earlier in today's line-up has
 * played one already. The opened card says so beside its Play button.
 */
export function priorityWouldReturn(s: GameState, p: number): boolean {
  const first = s.priorityNext;
  return s.phase === 'evening' && first !== null && first !== p && s.order.indexOf(first) < s.order.indexOf(p);
}

/**
 * The morning after an evening in which several stalls played Priority: whose card went back, and who buys first (the
 * stall at the front of today's line). Null when no card went back.
 */
export function priorityBackLine(s: GameState, viewer: number): { text: string; tone: 'good' | 'warn' | '' } | null {
  const back = (s.priorityBack ?? []).filter((p) => !!s.players[p]);
  const first = s.order[0];
  if (s.phase !== 'morning' || !back.length || first === undefined || !s.players[first]) return null;
  const names = back.filter((p) => p !== viewer).map((p) => `${s.players[p].name}'s`);
  const cards = (n: number) => `Priority card${n > 1 ? 's' : ''} came back`;
  if (back.includes(viewer)) {
    const more = names.length ? `, and so did ${list(names)}` : '';
    return { text: `Your Priority card came back to your hand${more}: ${s.players[first].name} was earlier in yesterday's line-up and buys first.`, tone: 'warn' };
  }
  if (first === viewer) return { text: `You buy first. ${list(names)} ${cards(names.length)}: you were earlier in yesterday's line-up.`, tone: 'good' };
  return { text: `${s.players[first].name} buys first. ${list(names)} ${cards(names.length)}: ${s.players[first].name} was earlier in yesterday's line-up.`, tone: '' };
}
