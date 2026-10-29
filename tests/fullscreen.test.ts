// Full screen is a browser feature; where there is no browser (these tests) the button must stay hidden and nothing may throw.
import { describe, expect, it } from 'vitest';
import { fullscreenSupported, iphoneNeedsHomeScreen, isFullscreen, onFullscreenChange, toggleFullscreen } from '../src/ui/fullscreen';

describe('full screen', () => {
  it('reports no support and does nothing outside a browser', async () => {
    expect(fullscreenSupported()).toBe(false);
    expect(isFullscreen()).toBe(false);
    expect(iphoneNeedsHomeScreen()).toBe(false);
    await expect(toggleFullscreen()).resolves.toBeUndefined();
    expect(() => onFullscreenChange(() => {})()).not.toThrow();
  });
});
