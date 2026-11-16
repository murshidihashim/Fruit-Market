import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type PublicSeat, type RoomView } from '../src/net/protocol';
import { rematchLine } from '../src/ui/game/rematch';
import { startLabel } from '../src/ui/Online';

// PLAN-107: what the lobby and the results say when someone is gone (ON-04, ON-05).
const seat = (i: number, name: string, extra: Partial<PublicSeat> = {}): PublicSeat =>
  ({ seat: i, name, avatar: '', ready: true, connected: true, host: i === 0, ...extra });
const room = (seats: PublicSeat[], extra: Partial<RoomView> = {}): RoomView => ({
  t: 'room', code: 'ABC234', status: 'lobby', you: 0, seats, config: { ...DEFAULT_CONFIG }, version: 1, game: null,
  submitted: [], votes: [], rematch: [], ...extra,
});

describe('the host\'s start button (ON-05)', () => {
  it('names who has closed the tab instead of asking everyone to be ready', () => {
    expect(startLabel(room([seat(0, 'Aisyah'), seat(1, 'Gus', { connected: false, offlineSince: 1, takeoverAt: 75_001 })]))).toBe('Waiting for Gus to come back');
    expect(startLabel(room([seat(0, 'Aisyah'), seat(1, 'Gus', { connected: false }), seat(2, 'Dee', { connected: false, ready: false })]))).toBe('Waiting for Gus and Dee to come back');
  });
  it('keeps its other words', () => {
    expect(startLabel(room([seat(0, 'Aisyah'), seat(1, 'Gus')]))).toBe('Start the game');
    expect(startLabel(room([seat(0, 'Aisyah'), seat(1, 'Gus', { ready: false })]))).toBe('Waiting for everyone to be ready…');
    expect(startLabel(room([seat(0, 'Aisyah')]))).toBe('Waiting for a player…');
  });
});

describe('the line over Rematch (ON-04)', () => {
  const three = (b: Partial<PublicSeat>, rematch: number[], you = 0) =>
    room([seat(0, 'Aisyah'), seat(1, 'Benny B', b), seat(2, 'Chandra')], { status: 'finished', rematch, you });

  it('says who has left, and that a computer plays for them in a rematch', () => {
    expect(rematchLine(three({ connected: false }, []), 0)).toBe('Benny B has left. A computer plays for them in a rematch.');
    // A seat the computer took over during the game has left too, and is never waited for (ON-10).
    expect(rematchLine(three({ connected: false, bot: true }, [0]), 0)).toBe('Benny B has left. Waiting for Chandra to accept…');
    expect(rematchLine(three({ connected: false }, [2]), 0)).toBe('Benny B has left. Chandra wants a rematch.');
  });

  it('waits only for the people still here', () => {
    expect(rematchLine(three({}, [0]), 0)).toBe('Waiting for Benny B and Chandra to accept…');
    expect(rematchLine(three({}, [0, 2]), 1)).toBe('Aisyah and Chandra want a rematch.');
    expect(rematchLine(three({}, []), 0)).toBeUndefined();
  });
});
