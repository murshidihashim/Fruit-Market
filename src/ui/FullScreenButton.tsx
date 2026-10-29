// The "Full screen" button, shown only where the browser can do it.
import { useEffect, useState } from 'preact/hooks';
import { fx } from './fx';
import { fullscreenSupported, isFullscreen, onFullscreenChange, toggleFullscreen } from './fullscreen';

export function FullScreenButton({ cls = 'btn wide' }: { cls?: string }) {
  const [full, setFull] = useState(isFullscreen());
  useEffect(() => onFullscreenChange(() => setFull(isFullscreen())), []);
  if (!fullscreenSupported()) return null;
  return (
    <button type="button" class={cls} onClick={() => { fx.tap(); void toggleFullscreen(); }}>
      {full ? 'Exit full screen' : 'Full screen'}
    </button>
  );
}
