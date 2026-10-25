// The living market: a pixel-art harbour square drawn on a 200×112 logical grid.
// Atmosphere only — every number a player needs lives on the cards below it.
// data-a attributes are animation anchors (stalls, crates, customers, the cart).
import { FRUITS, lookOf, type FruitId } from '../engine/data';
import { count, servingCustomers, walkInsToday, type Customer, type GameState } from '../engine/game';
import { Fruit } from './art';
import { Portrait } from './pixel';

const W = 200;
const H = 112;
const GROUND = 58;

const C = {
  wall: '#efe4cf', wallShade: '#d6c6a6', roof: '#c8553d', roofD: '#963d2b', door: '#3e8f8c', doorD: '#2a6866',
  glass: '#26344f', olive: '#6b7a3a', oliveD: '#4c5729', ground: '#d6b483', stone: '#c49e6c', stoneL: '#e2c597',
  wood: '#a8683f', woodD: '#74452a', woodL: '#c98a55', cream: '#f6ead2', ink: '#2b2438',
};

const SKY: Record<string, string[]> = {
  morning: ['#f3c99a', '#f6d8ad', '#f8e4c0', '#faeccf'],
  day: ['#86c5c6', '#a2d3d1', '#bfe1da', '#d8ece2'],
  reveal: ['#e9a96f', '#f0bf85', '#f5d39e', '#f8e2b8'],
  evening: ['#4b3f6e', '#7a557a', '#b8707a', '#e09a7b'],
  final: ['#c75b4a', '#dc7f5b', '#eba574', '#f4c895'],
};

/** Stall awning colour for each seat. */
export const SEAT_COLOURS = ['#c8553d', '#3e8f8c', '#7d8c3a', '#3d4f86'];

const R = (x: number, y: number, w: number, h: number, fill: string, extra: Record<string, unknown> = {}) =>
  <rect x={x} y={y} width={w} height={h} fill={fill} {...extra} />;

function Buildings() {
  const bs = [
    { x: 0, w: 34, h: 30, door: true }, { x: 32, w: 28, h: 40 }, { x: 58, w: 42, h: 27, arch: true },
    { x: 98, w: 30, h: 37 }, { x: 126, w: 36, h: 29, door: true }, { x: 160, w: 40, h: 35 },
  ];
  return (
    <g>
      {bs.map((b) => {
        const top = GROUND - b.h;
        const cols = Math.max(1, Math.floor((b.w - 6) / 9));
        return (
          <g>
            {R(b.x, top, b.w, b.h, C.wall)}
            {R(b.x + b.w - 3, top, 3, b.h, C.wallShade)}
            {R(b.x - 1, top - 3, b.w + 2, 3, C.roof)}
            {R(b.x - 1, top - 1, b.w + 2, 1, C.roofD)}
            {Array.from({ length: Math.floor((b.w + 2) / 4) }, (_, i) => R(b.x + i * 4, top - 3, 1, 2, C.roofD))}
            {Array.from({ length: cols }, (_, i) => {
              const wx = b.x + 4 + i * 9;
              return (
                <g>
                  {R(wx, top + 6, 5, 6, C.glass)}
                  {R(wx - 1, top + 6, 1, 6, C.door)}
                  {R(wx + 5, top + 6, 1, 6, C.door)}
                  {b.h > 32 && R(wx, top + 17, 5, 6, C.glass)}
                  {b.h > 32 && R(wx - 1, top + 23, 7, 1, C.oliveD)}
                </g>
              );
            })}
            {b.door && R(b.x + b.w / 2 - 3, GROUND - 11, 6, 11, C.door)}
            {b.door && R(b.x + b.w / 2 - 3, GROUND - 11, 6, 1, C.doorD)}
            {b.arch && R(b.x + 14, GROUND - 13, 14, 13, C.doorD)}
            {b.arch && R(b.x + 16, GROUND - 15, 10, 2, C.doorD)}
          </g>
        );
      })}
      {/* olive trees in pots */}
      {[28, 120, 194].map((x) => (
        <g>
          {R(x - 3, GROUND - 6, 6, 6, C.roof)}
          {R(x - 1, GROUND - 13, 2, 7, C.woodD)}
          {R(x - 6, GROUND - 22, 12, 9, C.olive)}
          {R(x - 4, GROUND - 24, 8, 3, C.olive)}
          {R(x - 6, GROUND - 15, 12, 2, C.oliveD)}
        </g>
      ))}
    </g>
  );
}

function Bunting({ lit }: { lit: boolean }) {
  const flags = ['#c8553d', '#e8b04b', '#3e8f8c', '#f6ead2'];
  return (
    <g class="bunting">
      {Array.from({ length: 50 }, (_, i) => R(i * 4, 13 + Math.round(Math.sin(i / 4) * 1.5), 4, 1, '#5b4a3a'))}
      {Array.from({ length: 16 }, (_, i) => {
        const x = 6 + i * 12;
        const y = 14 + Math.round(Math.sin(x / 16) * 1.5);
        const c = flags[i % flags.length];
        return lit && i % 2
          ? <g>{R(x, y, 3, 3, '#f2c14e')}{R(x + 1, y + 1, 1, 1, '#fff2c2')}</g>
          : <g>{R(x, y, 4, 2, c)}{R(x + 1, y + 2, 2, 2, c)}</g>;
      })}
    </g>
  );
}

function Cobbles() {
  const out = [];
  for (let row = 0, y = GROUND + 2; y < H; row++, y += 6) {
    for (let x = row % 2 ? -5 : 0; x < W; x += 10) {
      out.push(R(x + 1, y, 8, 4, C.stone));
      out.push(R(x + 1, y, 8, 1, C.stoneL));
    }
  }
  return <g>{R(0, GROUND, W, H - GROUND, C.ground)}{out}</g>;
}

function Cart({ s, rolling }: { s: GameState; rolling: boolean }) {
  return (
    <g class={rolling ? 'cart roll' : 'cart'} data-a="truck">
      {R(3, 98, 28, 3, C.woodD)}
      {R(2, 84, 30, 14, C.wood)}
      {R(2, 84, 30, 2, C.woodL)}
      {R(1, 96, 32, 2, C.woodD)}
      {FRUITS.map((f, i) => {
        const x = 3 + (i % 2) * 14;
        const y = 72 + Math.floor(i / 2) * 7;
        const has = s.market[f].some((n) => n > 0);
        return (
          <g data-a={`cart-${f}`}>
            {R(x, y + 6, 12, 6, C.woodD)}
            {R(x + 1, y + 7, 10, 4, C.woodL)}
            {has && <Fruit id={f} size={8} x={x + 2} y={y} />}
          </g>
        );
      })}
      {R(5, 100, 7, 7, C.ink)}{R(7, 102, 3, 3, C.woodL)}
      {R(22, 100, 7, 7, C.ink)}{R(24, 102, 3, 3, C.woodL)}
      {R(32, 90, 6, 2, C.woodD)}
    </g>
  );
}

interface StallProps { s: GameState; p: number; x: number; w: number; me: boolean; active: boolean; lit: boolean; onTap?: () => void }

function Stall({ s, p, x, w, me, active, lit, onTap }: StallProps) {
  const pl = s.players[p];
  const colour = SEAT_COLOURS[p % SEAT_COLOURS.length];
  const top = 44;
  const counter = 76;
  const stripes = Math.ceil(w / 4);
  const crate = Math.min(10, Math.floor((w - 4) / 4));
  const cx = x + w / 2;
  return (
    <g class={`stall ${active ? 'active' : ''}`} data-a={`p${p}`} onClick={onTap} style={{ cursor: onTap ? 'pointer' : 'default' }}>
      {R(x + 2, 92, w - 4, 3, 'rgba(43,36,56,0.25)')}
      {R(x + 1, top + 6, 2, 40, C.woodD)}
      {R(x + w - 3, top + 6, 2, 40, C.woodD)}
      <Portrait who={pl.avatar} size={22} x={cx - 11} y={56} />
      {Array.from({ length: stripes }, (_, i) => R(x + i * 4, top, Math.min(4, x + w - (x + i * 4)), 7, i % 2 ? C.cream : colour))}
      {Array.from({ length: stripes }, (_, i) => R(x + i * 4 + 1, top + 7, 2, 2, i % 2 ? C.cream : colour))}
      {R(x, top - 1, w, 1, C.ink)}
      {lit && <g>{R(x + 3, top + 10, 2, 3, '#f2c14e')}{R(x + w - 5, top + 10, 2, 3, '#f2c14e')}</g>}
      {R(x, counter, w, 15, C.wood)}
      {R(x, counter, w, 2, C.woodL)}
      {R(x, counter + 8, w, 1, C.woodD)}
      {FRUITS.map((f: FruitId, i) => {
        const n = count(pl.stock, f);
        const cxp = x + 2 + i * (crate + 0.5);
        return (
          <g data-a={`sc${p}-${f}`}>
            {R(cxp, counter - 4, crate - 1, 5, C.woodD)}
            {n > 0 && <Fruit id={f} size={crate - 1} x={cxp} y={counter - 9} />}
            {n > 2 && <Fruit id={f} size={crate - 2} x={cxp + 1} y={counter - 13} />}
          </g>
        );
      })}
      {me && <g>{R(cx - 9, top - 9, 18, 7, '#e8b04b')}{R(cx - 8, top - 8, 16, 5, C.cream)}<text x={cx} y={top - 4} text-anchor="middle" font-size="5" font-family="Pixelify Sans, monospace" font-weight="700" fill={C.ink}>YOU</text></g>}
      {active && <g class="turn-pip">{R(cx - 2, top - (me ? 15 : 7), 4, 2, '#e8b04b')}{R(cx - 1, top - (me ? 13 : 5), 2, 2, '#e8b04b')}</g>}
    </g>
  );
}

function CustomerSprite({ s, c, x, kind, onTap }: { s: GameState; c?: Customer | null; x: number; kind: 'here' | 'coming' | 'mystery'; onTap?: (c: Customer) => void }) {
  const y = 93;
  if (kind === 'mystery' || !c) {
    return <g class="cust-sprite mystery" opacity="0.55"><Portrait who="shopper" size={16} x={x} y={y} />{R(x + 5, y - 7, 6, 6, C.cream)}<text x={x + 8} y={y - 2.5} text-anchor="middle" font-size="5" font-family="Pixelify Sans, monospace" fill={C.ink}>?</text></g>;
  }
  const want = c.wants.find((w) => w.qty > 0);
  const done = c.wants.every((w) => w.qty <= 0);
  const special = c.name === s.event?.extra?.name;
  return (
    <g class={`cust-sprite ${kind}`} data-a={c.id > 0 ? `c${c.id}` : undefined} onClick={() => onTap?.(c)} style={{ cursor: 'pointer' }} opacity={kind === 'coming' ? 0.6 : 1}>
      {c.wants.map((w) => <rect data-a={c.id > 0 ? `c${c.id}-${w.fruit}` : undefined} x={x + 4} y={y - 8} width={8} height={8} fill="none" />)}
      <Portrait who={c.name} size={16} x={x} y={y} />
      {want && <g>{R(x + 3, y - 9, 10, 9, C.cream)}{R(x + 7, y, 2, 1, C.cream)}<Fruit id={want.fruit} size={8} x={x + 4} y={y - 8.5} /></g>}
      {done && <g>{R(x + 5, y - 7, 2, 2, '#c8553d')}{R(x + 8, y - 7, 2, 2, '#c8553d')}{R(x + 5, y - 6, 5, 2, '#c8553d')}{R(x + 6, y - 4, 3, 1, '#c8553d')}</g>}
      {special && R(x + 13, y - 2, 3, 3, '#e8b04b')}
      <title>{lookOf(c.name).title}</title>
    </g>
  );
}

export function MarketScene({ s, viewer, order, activeP, onStall, onCustomer, rolling }: {
  s: GameState; viewer: number; order: number[]; activeP: number;
  onStall: (p: number) => void; onCustomer: (c: Customer) => void; rolling: boolean;
}) {
  const lastDay = s.day === s.config.days;
  const sky = lastDay && s.phase !== 'evening' ? SKY.final
    : s.phase === 'morning' ? SKY.morning : s.phase === 'evening' ? SKY.evening : s.phase === 'reveal' ? SKY.reveal : SKY.day;
  const lit = s.phase === 'evening';
  const n = order.length;
  const left = 40;
  const room = W - left - 2;
  const gap = 4;
  const sw = Math.min(46, Math.floor((room - gap * (n - 1)) / n));
  const start = left + Math.floor((room - (sw * n + gap * (n - 1))) / 2);
  const before = s.phase === 'morning' || s.phase === 'buy';
  const people: { c?: Customer | null; kind: 'here' | 'coming' | 'mystery' }[] = before
    ? [{ c: s.forecast, kind: 'here' as const }, ...Array.from({ length: walkInsToday(s) }, () => ({ kind: 'mystery' as const }))]
    : servingCustomers(s).map((c) => ({ c, kind: 'here' as const }));
  if (!before && s.forecast && s.phase !== 'over') people.push({ c: s.forecast, kind: 'coming' });
  const step = Math.min(24, Math.floor((W - 46) / Math.max(1, people.length)));
  return (
    <svg class="scene" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" shape-rendering="crispEdges" role="img" aria-label="The market square">
      {sky.map((c, i) => R(0, i * 11, W, 11, c))}
      <rect data-a="sky" x={10} y={0} width={12} height={4} fill="none" />
      {R(0, 44, W, GROUND - 44, sky[3])}
      {s.phase === 'evening' ? <g>{R(170, 6, 6, 6, '#f6e7b0')}{R(172, 6, 4, 4, sky[0])}</g> : <g class="sun">{R(14, 5, 8, 8, '#fbe39a')}{R(15, 4, 6, 10, '#fbe39a')}</g>}
      <Buildings />
      <Bunting lit={lit} />
      <Cobbles />
      <Cart s={s} rolling={rolling} />
      {order.map((p, i) => (
        <Stall s={s} p={p} x={start + i * (sw + gap)} w={sw} me={p === viewer} active={p === activeP} lit={lit} onTap={() => onStall(p)} />
      ))}
      <g data-a="street">
        {people.map((x, i) => <CustomerSprite s={s} c={x.c} x={44 + i * step} kind={x.kind} onTap={onCustomer} />)}
      </g>
    </svg>
  );
}
