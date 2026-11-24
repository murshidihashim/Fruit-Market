// Owner, 2026-11-24: Pak Din players could not see their stock when using Shade Cloth (the evening sheet covers the
// shelf). Each fruit's button now says what the stall holds and what the night would do to it.
import { describe, expect, it } from 'vitest';
import { FRUIT } from '../src/engine/data';
import { newGame } from '../src/engine/game';
import { shadeHold } from '../src/ui/panel';

const game = () => newGame({ players: [{ name: 'You', kind: 'human', avatar: '🦊' }, { name: 'Rosa', kind: 'ai', level: 'normal', avatar: '🐻' }], days: 8, unripe: true, upgrades: false, events: false, seed: 3 });

describe('shadeHold', () => {
  it('an empty fruit says none', () => {
    const s = game();
    for (const f of Object.keys(s.players[0].stock) as (keyof typeof FRUIT)[]) s.players[0].stock[f] = s.players[0].stock[f].map(() => 0);
    expect(shadeHold(s, 0, 'apple')).toMatchObject({ count: 0, note: 'none' });
  });
  it('counts the pieces and names those that spoil tonight', () => {
    const s = game();
    const st = s.players[0].stock.apple.map(() => 0);
    st[0] = 2; // the oldest place: spoils tonight
    st[st.length > 2 ? 2 : 1] = 1;
    s.players[0].stock.apple = st;
    const h = shadeHold(s, 0, 'apple');
    expect(h.count).toBe(3);
    expect(h.spoil).toBe(2);
    expect(h.note).toBe('2 spoil');
    expect(h.said).toMatch(/3 held, 2 spoil tonight/);
  });
  it('with nothing spoiling, names the freshest word', () => {
    const s = game();
    const st = s.players[0].stock.apple.map(() => 0);
    st[FRUIT.apple.ripe.length - 1] = 2;
    s.players[0].stock.apple = st;
    const h = shadeHold(s, 0, 'apple');
    expect(h.spoil).toBe(0);
    expect(['Fresh', 'Okay', 'Soft']).toContain(h.note);
  });
});
