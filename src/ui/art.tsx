// Hand-drawn style SVG fruit, so the game looks the same on every phone (no emoji fonts).
import type { FruitId, Stage } from '../engine/data';

const STAGE_FILTER: Record<Stage, string> = {
  fresh: 'none',
  okay: 'saturate(0.75) brightness(0.97)',
  notso: 'sepia(0.55) saturate(0.6) brightness(0.85)',
  unripe: 'hue-rotate(55deg) saturate(0.55) brightness(1.05)',
};

const UNRIPE: Record<FruitId, string> = {
  blueberry: 'saturate(0.4) brightness(1.2)',
  watermelon: 'saturate(0.45) brightness(1.15)',
  apple: 'hue-rotate(95deg) saturate(0.75) brightness(1.1)',
  mango: 'hue-rotate(50deg) saturate(0.8)',
};

export function Fruit({ id, size = 28, stage = 'fresh' }: { id: FruitId; size?: number; stage?: Stage }) {
  return (
    <svg class="fruit" width={size} height={size} viewBox="0 0 40 40" style={{ filter: stage === 'unripe' ? UNRIPE[id] : STAGE_FILTER[stage] }} aria-label={id}>
      {id === 'blueberry' && (
        <g>
          <circle cx="14" cy="24" r="9" fill="#3b46b8" />
          <circle cx="26" cy="25" r="9" fill="#4f5bd5" />
          <circle cx="20" cy="15" r="9" fill="#5a67e0" />
          <path d="M17 10 l3 3 l3 -3 l-1 4 h-4z" fill="#27307a" />
          <circle cx="17" cy="12" r="2.2" fill="#fff" opacity=".35" />
          <circle cx="11" cy="21" r="2" fill="#fff" opacity=".3" />
          <circle cx="23" cy="22" r="2" fill="#fff" opacity=".3" />
        </g>
      )}
      {id === 'watermelon' && (
        <g>
          <path d="M1 11 A19 19 0 0 0 39 11 Z" fill="#2e9e4f" />
          <path d="M4 11 A16 16 0 0 0 36 11 Z" fill="#c8f0b0" />
          <path d="M6.5 11 A13.5 13.5 0 0 0 33.5 11 Z" fill="#ef4f5a" />
          <ellipse cx="13" cy="16" rx="1.4" ry="2" fill="#2a1a1a" />
          <ellipse cx="20" cy="20" rx="1.4" ry="2" fill="#2a1a1a" />
          <ellipse cx="27" cy="16" rx="1.4" ry="2" fill="#2a1a1a" />
          <ellipse cx="20" cy="14" rx="1.2" ry="1.8" fill="#2a1a1a" />
        </g>
      )}
      {id === 'apple' && (
        <g>
          <path d="M20 12 C10 6 3 14 5 23 C7 32 13 37 20 34 C27 37 33 32 35 23 C37 14 30 6 20 12Z" fill="#e0393e" />
          <path d="M20 12 C19 8 19 6 21 3" stroke="#6b3d1e" stroke-width="2.4" fill="none" stroke-linecap="round" />
          <path d="M21 8 C25 3 31 4 32 6 C28 9 24 10 21 8Z" fill="#4caf50" />
          <ellipse cx="12" cy="19" rx="3" ry="4.5" fill="#fff" opacity=".3" />
        </g>
      )}
      {id === 'mango' && (
        <g>
          <path d="M8 26 C4 14 14 4 26 7 C36 10 38 24 30 31 C22 38 11 35 8 26Z" fill="#f2b705" />
          <path d="M20 31 C26 30 31 26 31 20 C33 27 28 33 20 31Z" fill="#e8762b" opacity=".75" />
          <path d="M25 7 C27 3 30 2 32 2" stroke="#6b3d1e" stroke-width="2" fill="none" stroke-linecap="round" />
          <path d="M28 4 C33 1 38 4 38 6 C34 8 30 7 28 4Z" fill="#4caf50" />
          <ellipse cx="15" cy="16" rx="3" ry="5" fill="#fff" opacity=".3" transform="rotate(30 15 16)" />
        </g>
      )}
      {stage === 'notso' && (
        <g fill="#6b4a1e" opacity=".55">
          <circle cx="13" cy="25" r="2" />
          <circle cx="25" cy="19" r="1.6" />
          <circle cx="22" cy="28" r="1.3" />
        </g>
      )}
    </svg>
  );
}

export function Coin({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" class="coin" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="#f6c343" stroke="#c8961b" stroke-width="1.5" />
      <text x="10" y="14" text-anchor="middle" font-size="11" font-weight="700" fill="#8a6210">$</text>
    </svg>
  );
}

export function Logo({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-label="Fruit Market">
      <rect x="10" y="44" width="100" height="62" rx="10" fill="#b5651d" />
      <rect x="16" y="50" width="88" height="50" rx="6" fill="#d98b3a" />
      <g>
        {[0, 1, 2, 3, 4].map((i) => (
          <path d={`M${10 + i * 20} 22 h20 v18 a10 10 0 0 1 -20 0z`} fill={i % 2 ? '#fff6e6' : '#e94f37'} />
        ))}
      </g>
      <rect x="6" y="14" width="108" height="10" rx="5" fill="#c73b25" />
      <g transform="translate(20 58) scale(.9)"><Fruit id="apple" size={40} /></g>
      <g transform="translate(46 60) scale(.9)"><Fruit id="mango" size={40} /></g>
      <g transform="translate(70 58) scale(.9)"><Fruit id="blueberry" size={40} /></g>
    </svg>
  );
}
