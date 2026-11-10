// The "Full screen" button and the "Play full screen?" question after the opening (PLAN-062).
// Where the browser can go full screen (Android, desktop, iPad, Mac Safari) it does so straight away. iPhone Safari
// cannot (Apple only allows it from the Home Screen), so there the button shows how to add the game to the Home Screen,
// which then opens with no browser bars.
import { useEffect, useState } from 'preact/hooks';
import { fx } from './fx';
import { fullscreenAvailable, fullscreenSupported, isFullscreen, onFullscreenChange, stopAskingFullscreen, toggleFullscreen } from './fullscreen';

/** Safari's Share symbol: a square with an arrow pointing up out of it. */
function ShareGlyph() {
  return (
    <svg class="share-glyph" width="18" height="20" viewBox="0 0 18 20" aria-hidden="true">
      <path d="M6 7H3v11h12V7h-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
      <path d="M9 13V1M5 5l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

/** How to play full screen on an iPhone: add the game to the Home Screen and open it from there. */
export function HomeScreenSteps() {
  return (
    <ol class="hs-steps">
      <li>Tap <b>Share</b> <ShareGlyph /> in Safari’s toolbar.</li>
      <li>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li>
      <li>Open <b>Fruit Market</b> from your Home Screen.</li>
    </ol>
  );
}

function StepsSheet({ onClose }: { onClose: () => void }) {
  return (
    <div class="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="modal center fs-ask" role="dialog" aria-modal="true" aria-label="Full screen on iPhone">
        <h3>Full screen on iPhone</h3>
        <HomeScreenSteps />
        <button type="button" class="btn primary wide" onClick={() => { fx.tap(); onClose(); }}>Got it</button>
      </div>
    </div>
  );
}

export function FullScreenButton({ cls = 'btn wide' }: { cls?: string }) {
  const [full, setFull] = useState(isFullscreen());
  const [steps, setSteps] = useState(false);
  useEffect(() => onFullscreenChange(() => setFull(isFullscreen())), []);
  if (!fullscreenAvailable()) return null;
  const tap = () => { fx.tap(); if (fullscreenSupported()) void toggleFullscreen(); else setSteps(true); };
  return (
    <>
      <button type="button" class={cls} onClick={tap}>{full ? 'Exit full screen' : 'Full screen'}</button>
      {steps && <StepsSheet onClose={() => setSteps(false)} />}
    </>
  );
}

/** Asked once each time the game opens, right after the opening animation (unless the player said not to). */
export function FullscreenPrompt({ onClose }: { onClose: () => void }) {
  const iphone = !fullscreenSupported();
  const [steps, setSteps] = useState(false);
  const go = () => {
    fx.tap();
    if (iphone) { setSteps(true); return; }
    void toggleFullscreen(); // the tap itself is what lets the browser go full screen
    onClose();
  };
  return (
    <div class="modal-bg fs-ask-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="modal center fs-ask" role="dialog" aria-modal="true" aria-label="Play full screen?">
        <h3>Play full screen?</h3>
        {steps && <HomeScreenSteps />}
        {steps
          ? <button type="button" class="btn primary wide" onClick={() => { fx.tap(); onClose(); }}>Got it</button>
          : <button type="button" class="btn primary wide" onClick={go}>Full screen</button>}
        {!steps && <button type="button" class="btn wide" onClick={() => { fx.tap(); onClose(); }}>Not now</button>}
        <button type="button" class="link-btn" onClick={() => { stopAskingFullscreen(); onClose(); }}>Don’t ask again</button>
      </div>
    </div>
  );
}
