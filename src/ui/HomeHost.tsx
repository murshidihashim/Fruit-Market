// PLAN-132: the host of Home's Market tab. Rosa stands, full body, on the mode card's awning and chats in a bubble
// beside her; faint bunting and crates fill the paper behind her. She is the same in every mode; only her words follow
// the card showing (hostWords.ts). A tap on her or on her bubble gives her next line.
// Her drawing (host/rosa.svg) is the shopkeeper card's own face, hair, forearm and price tag (public/art-ticket/scenes/
// rosa.svg) with a body drawn for Home; its parts carry classes (r-head, r-eyes, r-arm, ...) and home-cards.css moves them.
import { useEffect, useRef, useState } from 'preact/hooks';
import { fx } from './fx';
import { HOST_HINT, HOST_NAME, hostLines, type HostFacts, type HostKey } from './hostWords';
import type { HomeMode } from './modes';
import rosa from './host/rosa.svg?raw';

/** The bunting under the tabs: a sagging string and twelve flags. */
function Bunting() {
  const sag = (i: number) => 3 + Math.round(50 * Math.sin((Math.PI * ((i * 29 + 17) % 118)) / 118)) / 10;
  return (
    <svg class="hh-bunt" viewBox="0 0 354 28" preserveAspectRatio="none" aria-hidden="true">
      <path class="hh-line" d="M0 2Q59 12 118 3T236 3T354 2" />
      {Array.from({ length: 12 }, (_, i) => <path class={i % 2 ? 'hh-flag' : 'hh-flag hh-flag2'} d={`M${6 + i * 29} ${sag(i)}h22l-11 17z`} />)}
    </svg>
  );
}

/** Three empty crates and a little fruit, in outline. */
function Crates() {
  const crate = (x: number, y: number, w: number, h: number) => (
    <>
      <rect x={x} y={y} width={w} height={h} />
      <path d={`M${x} ${Math.round(y + h / 3)}h${w}M${x} ${Math.round(y + (2 * h) / 3)}h${w}M${x + 8} ${y}v${h}M${x + w - 8} ${y}v${h}`} />
    </>
  );
  return (
    <svg class="hh-crates" viewBox="0 0 170 62" aria-hidden="true">
      {crate(4, 30, 70, 30)}{crate(82, 30, 70, 30)}{crate(44, 2, 70, 26)}
      <circle cx="24" cy="22" r="8" /><circle cx="130" cy="22" r="8" /><circle cx="146" cy="24" r="6" />
    </svg>
  );
}

export function Host({ mode, facts }: { mode: HomeMode; facts: HostFacts }) {
  // `beat` counts her lines in this visit: 0 is the welcome she walks in with; each later one makes her hop and talk.
  const [said, setSaid] = useState<{ key: HostKey; n: number; beat: number }>({ key: 'hello', n: 0, beat: 0 });
  const box = useRef<HTMLDivElement>(null);
  const shown = useRef(mode);
  useEffect(() => {
    if (shown.current === mode) return;
    shown.current = mode;
    setSaid((s) => ({ key: mode, n: 0, beat: s.beat + 1 }));
  }, [mode]);
  useEffect(() => {
    const el = box.current;
    if (!el || !said.beat) return;
    // the hop, the moving mouth and the bubble's pop play again for each line
    el.classList.remove('hh-beat');
    void el.offsetWidth;
    el.classList.add('hh-beat');
  }, [said.beat]);
  const lines = hostLines(said.key, facts);
  const more = () => {
    fx.tap();
    setSaid((s) => (s.key === 'hello' ? { key: mode, n: 0, beat: s.beat + 1 } : { key: s.key, n: s.n + 1, beat: s.beat + 1 }));
  };
  return (
    <div class="hh-hero" ref={box}>
      <Bunting />
      <Crates />
      <button class="hh-say" data-a="host-say" onClick={more}>
        <span aria-live="polite">{lines[said.n % lines.length]}</span>
        <i>{HOST_HINT}</i>
      </button>
      {/* her drawing is the game's own file (host/rosa.svg), set in as it is so its parts can move */}
      <button class="hh-host" data-a="host" aria-label={`${HOST_NAME}, the shopkeeper. Tap for another line`} onClick={more} dangerouslySetInnerHTML={{ __html: rosa }} />
    </div>
  );
}
