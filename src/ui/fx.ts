// Tiny synthesized sound effects and haptics, so the app ships with no audio files.
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { loadSettings } from './store';
import { wornSounds } from './looks';

let ctx: AudioContext | null = null;

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.12, delay = 0) {
  if (!loadSettings().sound) return;
  try {
    ctx ??= new AudioContext();
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {
    /* audio not available */
  }
}

function buzz(style: ImpactStyle) {
  if (!loadSettings().haptics) return;
  Haptics.impact({ style }).catch(() => {});
}

// The coin and bell sounds a player can earn (PLAN-086: stall levels 3, 4, 7 and 9). They are made here like every
// other sound, only on the player's own phone, and tell nobody anything: each plays at the same moment as the first.
const COINS: Record<string, () => void> = {
  coin_till: () => { tone(988, 0.08, 'square', 0.05); tone(1319, 0.18, 'square', 0.05, 0.07); },
  coin_jar: () => { tone(1568, 0.05, 'triangle', 0.07); tone(2093, 0.07, 'triangle', 0.06, 0.05); tone(1760, 0.12, 'sine', 0.05, 0.11); },
  coin_abacus: () => { tone(420, 0.04, 'square', 0.05); tone(520, 0.04, 'square', 0.05, 0.06); tone(620, 0.06, 'square', 0.05, 0.12); },
};
const BELLS: Record<string, () => void> = {
  bell_brass: () => { tone(880, 0.5, 'sine', 0.09); tone(1320, 0.35, 'sine', 0.05, 0.01); },
  bell_bicycle: () => { tone(2093, 0.12, 'triangle', 0.07); tone(2349, 0.1, 'triangle', 0.05, 0.02); tone(2093, 0.18, 'triangle', 0.07, 0.16); tone(2349, 0.14, 'triangle', 0.05, 0.18); },
  bell_counter: () => { tone(1760, 0.6, 'sine', 0.09); tone(3520, 0.25, 'sine', 0.03, 0.01); },
};
/** One of the earned sounds by its look id, to hear it in the Wardrobe. */
export function playSound(id: string) { (COINS[id] ?? BELLS[id])?.(); }

export const fx = {
  tap: () => tone(660, 0.06, 'triangle', 0.06),
  buy: () => { tone(520, 0.08, 'triangle'); tone(780, 0.1, 'triangle', 0.1, 0.06); buzz(ImpactStyle.Light); },
  coin: () => (COINS[wornSounds().coin] ?? COINS.coin_till)(),
  /** The bell that opens every crate (it had no sound of its own). */
  bell: () => (BELLS[wornSounds().bell] ?? BELLS.bell_brass)(),
  card: () => { tone(300, 0.12, 'sawtooth', 0.03); tone(450, 0.1, 'sine', 0.06, 0.05); },
  error: () => { tone(200, 0.15, 'square', 0.05); buzz(ImpactStyle.Medium); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.1, i * 0.12)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.08, i * 0.15)),
  night: () => { tone(330, 0.4, 'sine', 0.06); tone(247, 0.5, 'sine', 0.05, 0.2); },
};

// ---------- music ----------
// A short, gentle market tune made on the fly (pentatonic melody over a soft bass), so no audio files ship.

const MELODY = [0, 2, 4, 7, 4, 2, 9, 7, 4, 2, 0, 2, 4, 2, 0, -3];
const BASS = [0, 0, -5, -5, -3, -3, -5, -5];
let musicTimer: ReturnType<typeof setInterval> | null = null;
let step = 0;

function note(semi: number, base: number) {
  return base * Math.pow(2, semi / 12);
}

function playStep() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const play = (freq: number, dur: number, type: OscillatorType, gain: number) => {
    const o = ctx!.createOscillator();
    const g = ctx!.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx!.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  };
  const m = MELODY[step % MELODY.length];
  if (step % 4 !== 3) play(note(m, 523.25), 0.28, 'triangle', 0.025);
  if (step % 2 === 0) play(note(BASS[(step / 2) % BASS.length], 130.81), 0.5, 'sine', 0.03);
  step++;
}

/** Starts or stops the background tune. Browsers only allow audio after a tap, so call it from one. */
export function setMusic(on: boolean) {
  if (!on) {
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = null;
    return;
  }
  if (musicTimer) return;
  try {
    ctx ??= new AudioContext();
    void ctx.resume();
    musicTimer = setInterval(playStep, 300);
  } catch {
    /* audio not available */
  }
}

/** Called on taps: starts the music the first time it's allowed, if the player turned it on. */
export function wakeMusic() {
  if (loadSettings().music && !musicTimer) setMusic(true);
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') setMusic(false);
  });
  document.addEventListener('pointerdown', () => wakeMusic(), { passive: true });
}
