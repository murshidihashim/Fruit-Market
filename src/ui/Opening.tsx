// The market opening (PLAN-029, DEC-047): a short flat-scenery scene played when the game is opened.
// Decoration only: tap anywhere to skip, and it ends on its own after about 2.5 seconds.
import { useEffect, useState } from 'preact/hooks';
import { FRUITS, RIVALS } from '../engine/data';
import { Fruit, Face } from './art';
import { C } from './palette';

const LENGTH_MS = 2600;
const STALLS = [
  { colour: C.terracotta, who: RIVALS[0].avatar },
  { colour: C.teal, who: RIVALS[1].avatar },
  { colour: C.gold, who: RIVALS[2].avatar },
];

export function Opening({ onDone }: { onDone: () => void }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 390, window.innerHeight / 560));
    fit();
    window.addEventListener('resize', fit);
    const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(onDone, reduced ? 800 : LENGTH_MS);
    return () => { window.removeEventListener('resize', fit); clearTimeout(t); };
  }, []);
  return (
    <div class="op" onClick={onDone} role="presentation">
      <div class="op-stage" style={{ transform: `scale(${scale})` }} aria-hidden="true">
        <svg class="op-sky" viewBox="0 0 390 300" preserveAspectRatio="none">
          <rect width="390" height="300" fill={C.street} />
          <circle class="op-sun" cx="310" cy="70" r="26" fill={C.gold} stroke={C.ink} stroke-width="3" />
          <path d="M-20 200 Q60 120 170 160 T420 150 V300 H-20Z" fill={C.c_9fcdbd} stroke={C.ink} stroke-width="3" />
          <path d="M60 300 Q170 190 270 230 T450 220 V300 H60Z" fill={C.teal} stroke={C.ink} stroke-width="3" />
        </svg>
        <div class="op-ground" />
        <div class="op-sign">Wholesale Market</div>
        {STALLS.map((s, i) => (
          <div class={`op-stall op-s${i}`}>
            <div class="op-awn" style={`--c:${s.colour}`} />
            <div class="op-cnt" />
            <div class="op-who"><Face who={s.who} size={34} /></div>
          </div>
        ))}
        <svg class="op-lorry" viewBox="0 0 150 58" width="170">
          <rect x="2" y="16" width="44" height="30" rx="6" fill={C.paper} stroke={C.ink} stroke-width="3" />
          <rect x="10" y="22" width="22" height="12" rx="3" fill={C.c_9ad0e6} stroke={C.ink} stroke-width="2" />
          <rect x="46" y="12" width="98" height="34" rx="4" fill={C.c_a86b45} stroke={C.ink} stroke-width="3" />
          <rect x="52" y="4" width="86" height="12" fill={C.terracotta} stroke={C.ink} stroke-width="2.5" />
          <circle cx="26" cy="48" r="8" fill={C.ink} />
          <circle cx="116" cy="48" r="8" fill={C.ink} />
        </svg>
        {FRUITS.map((f, i) => <div class={`op-fl op-f${i}`}><Fruit id={f} size={30} /></div>)}
        <svg class="op-bell" viewBox="0 0 24 24" width="34" height="34">
          <path d="M12 3c-3.5 0-6 2.6-6 6v5l-2 3h16l-2-3V9c0-3.4-2.5-6-6-6Z" fill={C.gold} stroke={C.ink} stroke-width="1.6" />
          <circle cx="12" cy="20" r="2" fill={C.ink} />
        </svg>
        <div class="op-pill">The market is open!</div>
      </div>
      <span class="op-skip">Tap to skip</span>
    </div>
  );
}
