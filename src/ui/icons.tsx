// The Great Fruit Exchange drawings as page elements (DEC-069): icons, the lorry, stall roofs and props, and the
// warm-up that builds and decodes them ahead of time. The drawings themselves live in exchangeArt.ts; each one is a
// single <img> (or one background image) so the game screen stays within its DOM budget.
import { FRUITS, RIVALS, type Stage } from '../engine/data';
import { shopBadge } from './deckArt';
import { bandTile, ICON_NAMES, iconUrl, lorryUrl, propUrl, type IconName } from './exchangeArt';
import { fruitSvgUrl } from './fruitIcons';

export type { IconName } from './exchangeArt';

/** An icon at a display size in px (small sizes use simpler, bolder drawings). */
export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return <img class="icon xi" src={iconUrl(name, size)} alt="" draggable={false} decoding="async" width={size} height={size} />;
}

/** The lorry. Two frames are stacked; the wheels and flags swap between them while it moves (see styles.css). */
export function LorrySprite() {
  return (
    <>
      <img class="a" alt="" src={lorryUrl(0)} />
      <img class="b" alt="" src={lorryUrl(1)} />
    </>
  );
}

/** The roof band for the top of a stall panel, in the player's colour (one repeating background image).
 *  `roof` and `trim` are look ids from looks.ts: a roof pattern, and decoration that hangs below it.
 *  `scale` is px per two drawing units: 2 gives the usual 14 px roof. */
export function RoofBand({ cls, colour, scale = 2, roof, trim }: { cls: string; colour: string; scale?: number; roof?: string; trim?: string }) {
  const t = bandTile(colour, roof, trim, scale >= 3);
  const k = scale / 2;
  const style: Record<string, string> = { backgroundImage: `url("${t.url}")`, backgroundSize: `${t.w * k}px ${t.h * k}px` };
  if (roof || trim) style.height = `${t.h * k}px`;
  return <div class={cls} aria-hidden="true" style={style} />;
}

/** A prop that sits on the stall counter (a look from looks.ts). */
export function PropSprite({ id, size = 32, cls = 'ms-prop' }: { id: string; size?: number; cls?: string }) {
  const url = propUrl(id, size);
  if (!url) return null;
  return <img class={cls} alt="" width={size} height={size} src={url} draggable={false} />;
}

/**
 * Builds and decodes the most common pictures ahead of time, a few per idle moment, so opening the
 * game screen doesn't stall on dozens of first-time images. Safe to call more than once.
 */
export function prewarmSprites() {
  if (typeof window === 'undefined') return;
  // Load the Rubik weights the game screen uses, so opening it doesn't trigger font loads and re-layout.
  // A font that fails to load only falls back to the next face in the stack, so the failure is ignored on purpose.
  for (const f of ['400 16px Rubik', 'italic 400 16px Rubik', '500 16px Rubik', '600 16px Rubik', '800 16px Rubik', '16px "Rubik Display"', '600 16px "Rubik Strong"', '800 16px "Rubik Strong"']) {
    void document.fonts?.load(f).catch(() => {});
  }
  const jobs: (() => string)[] = [];
  for (const f of FRUITS) for (const st of ['fresh', 'okay', 'notso', 'unripe'] as Stage[]) jobs.push(() => fruitSvgUrl(f, st));
  // Shopkeeper badges are public (every player sees every stall). Customer portraits are never fetched ahead:
  // a face-down card must not load its picture.
  for (const r of RIVALS) { const b = shopBadge(r.avatar); if (b) jobs.push(() => b); }
  // The icons at their usual small, middle and large sizes (each size band is its own drawing), and the lorry.
  for (const n of ICON_NAMES) for (const px of [14, 20, 32]) jobs.push(() => iconUrl(n, px));
  jobs.push(() => lorryUrl(0), () => lorryUrl(1));
  type Deadline = { timeRemaining: () => number };
  const ric = (window as { requestIdleCallback?: (f: (d: Deadline) => void) => void }).requestIdleCallback;
  const idle = (cb: (d: Deadline) => void) => (ric ? ric(cb) : setTimeout(() => cb({ timeRemaining: () => 4 }), 50));
  // One picture at a time, only while the browser says it has spare time.
  const run = (d: Deadline) => {
    while (jobs.length && d.timeRemaining() > 4) {
      const img = new Image();
      img.src = jobs.shift()!();
      // Decoding ahead is only a speed-up; a picture that fails to decode here is simply decoded when shown.
      void img.decode?.().catch(() => {});
    }
    if (jobs.length) idle(run);
  };
  idle(run);
}
