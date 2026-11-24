// A phone in Desktop site mode (980 px wide, held upright, touch) is recognised so Home can say how to fix it.
import { describe, expect, it } from 'vitest';
import { DESKTOP_MODE_NOTE, desktopModePhone } from '../src/ui/phoneFit';

describe('desktopModePhone', () => {
  it('the owner\'s phone in desktop mode (980 x 2117, touch) is recognised', () => {
    expect(desktopModePhone(980, 2117, true)).toBe(true);
  });
  it('an ordinary phone, a tablet and a computer are not', () => {
    expect(desktopModePhone(412, 915, true)).toBe(false);
    expect(desktopModePhone(820, 1180, true)).toBe(false);
    expect(desktopModePhone(768, 1024, true)).toBe(false);
    expect(desktopModePhone(1280, 800, false)).toBe(false);
    expect(desktopModePhone(1061, 1279, false)).toBe(false);
  });
  it('the note names the setting and has no exclamation mark', () => {
    expect(DESKTOP_MODE_NOTE).toMatch(/Desktop site/);
    expect(DESKTOP_MODE_NOTE).not.toMatch(/!/);
  });
});
