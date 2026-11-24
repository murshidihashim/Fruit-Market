// The owner's phone in desktop mode (980 px wide, portrait) is drawn at an ordinary phone width.
import { describe, expect, it } from 'vitest';
import { PHONE_WIDTH, phoneZoom } from '../src/ui/phoneFit';

describe('phoneZoom', () => {
  it('a phone in desktop mode (980 x 2117, touch) is zoomed back to a phone width', () => {
    const z = phoneZoom(980, 2117, true);
    expect(z).toBeGreaterThan(2);
    expect(Math.round(980 / z)).toBeLessThanOrEqual(PHONE_WIDTH + 2);
  });
  it('an ordinary phone, a tablet and a computer are left alone', () => {
    expect(phoneZoom(412, 915, true)).toBe(1);
    expect(phoneZoom(820, 1180, true)).toBe(1);
    expect(phoneZoom(768, 1024, true)).toBe(1);
    expect(phoneZoom(1280, 800, false)).toBe(1);
    expect(phoneZoom(1061, 1279, false)).toBe(1);
  });
});
