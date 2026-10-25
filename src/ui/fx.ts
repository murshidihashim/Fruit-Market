// Tiny synthesized sound effects and haptics, so the app ships with no audio files.
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { loadSettings } from './store';

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

export const fx = {
  tap: () => tone(660, 0.06, 'triangle', 0.06),
  buy: () => { tone(520, 0.08, 'triangle'); tone(780, 0.1, 'triangle', 0.1, 0.06); buzz(ImpactStyle.Light); },
  coin: () => { tone(988, 0.08, 'square', 0.05); tone(1319, 0.18, 'square', 0.05, 0.07); },
  card: () => { tone(300, 0.12, 'sawtooth', 0.03); tone(450, 0.1, 'sine', 0.06, 0.05); },
  error: () => { tone(200, 0.15, 'square', 0.05); buzz(ImpactStyle.Medium); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.1, i * 0.12)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.08, i * 0.15)),
  night: () => { tone(330, 0.4, 'sine', 0.06); tone(247, 0.5, 'sine', 0.05, 0.2); },
};
