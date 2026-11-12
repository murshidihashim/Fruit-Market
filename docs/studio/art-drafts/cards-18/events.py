"""The 21 event pictures of the rules 18 card set, in the flat Market Ticket style (plain SVG, 600 by 384).

Each picture keeps the idea and the main objects of the event's picture in public/art-ticket/events and is built in
the same layers, back to front: the event's own background colour with a quiet pattern or skyline; a big disc or
sunburst in a lighter or darker tone; the main objects, large; two or three small details; a soft ground (never an
ink bar). The main subject stays inside the central 2:1 band (y 42 to 342) and inside x 60 to 540, because cards crop
the picture.

How an effect is shown, the same way on every card:
- the fruit it touches is that fruit's own icon (kit.fr), never drawn by hand;
- a price that goes up or down is a paper tag with an arrow (two arrows for a $2 change), never a number;
- more or less fruit is a full or an empty lorry or crate; a guest's order is that many pieces of the fruit.
Price Controls is the one picture that carries real numbers: its coins count the limits in src/engine/data.ts.

Run from the repo root: python3 docs/studio/art-drafts/cards-18/events.py
Writes event-<id>.svg for each event beside this file (ids as in public/art-ticket/events) and sheet-events.png.
"""
import math

from kit import *

W, H = 600, 384
GROUND = 304  # where things stand; the central 2:1 band of the picture ends at y = 342


# ---------- small pieces ----------

def n(v):
    """A number for SVG: one decimal at most."""
    s = f'{v:.1f}'
    return s[:-2] if s.endswith('.0') else s


def _op(op):
    return '' if op is None else f' opacity="{op}"'


def rect(x, y, w, h, fill, rx=0, op=None):
    return f'<rect x="{n(x)}" y="{n(y)}" width="{n(w)}" height="{n(h)}"' + (f' rx="{n(rx)}"' if rx else '') + f' fill="{fill}"{_op(op)}/>'


def circ(cx, cy, r, fill, op=None):
    return f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(r)}" fill="{fill}"{_op(op)}/>'


def ell(cx, cy, rx, ry, fill, op=None):
    return f'<ellipse cx="{n(cx)}" cy="{n(cy)}" rx="{n(rx)}" ry="{n(ry)}" fill="{fill}"{_op(op)}/>'


def path(d, fill, op=None):
    return f'<path d="{d}" fill="{fill}"{_op(op)}/>'


def line(d, stroke, w=6, op=None):
    """A thin detail: a round-capped stroke."""
    return f'<path d="{d}" fill="none" stroke="{stroke}" stroke-width="{n(w)}" stroke-linecap="round" stroke-linejoin="round"{_op(op)}/>'


def ring(cx, cy, r, fill, w, op=None):
    """A flat ring w wide with its middle line at radius r: a filled band, not a stroke."""
    o, i = r + w / 2, r - w / 2
    return path(f'M{n(cx - o)} {n(cy)}a{n(o)} {n(o)} 0 1 0 {n(2 * o)} 0a{n(o)} {n(o)} 0 1 0 {n(-2 * o)} 0Z'
                f'M{n(cx - i)} {n(cy)}a{n(i)} {n(i)} 0 1 1 {n(2 * i)} 0a{n(i)} {n(i)} 0 1 1 {n(-2 * i)} 0Z', fill, op)


def rot(a, cx, cy, body):
    return f'<g transform="rotate({n(a)} {n(cx)} {n(cy)})">{body}</g>'


def move(x, y, body, k=1):
    return f'<g transform="translate({n(x)} {n(y)}) scale({k})">{body}</g>'


def fade(op, body):
    return f'<g opacity="{op}">{body}</g>'


def dp(cx, cy, r):
    """A circle as path data, so many dots can share one path."""
    return f'M{n(cx - r)} {n(cy)}a{n(r)} {n(r)} 0 1 0 {n(2 * r)} 0a{n(r)} {n(r)} 0 1 0 {n(-2 * r)} 0Z'


def dots(points, r, fill, op=None):
    return path(''.join(dp(x, y, r) for x, y in points), fill, op)


def back(fill):
    return rect(0, 0, W, H, fill)


def ground(fill, y=GROUND, edge=None, edge_op=.4):
    return rect(0, y, W, H - y, fill) + (rect(0, y, W, 6, edge, op=edge_op) if edge else '')


# ---------- the four fruits, placed by the middle of their base ----------

def apple(cx, base, w):
    s = w / .82
    return fr('apple', n(cx - .5 * s), n(base - .92 * s), s)


def mango(cx, base, w, stage='fresh'):
    s = w / .74
    return fr('mango', n(cx - .54 * s), n(base - .94 * s), s, stage)


def berry(cx, base, w):
    s = w / .8
    return fr('blueberry', n(cx - .5 * s), n(base - .94 * s), s)


def melon(cx, base, w):
    s = w / .9
    return fr('watermelon', n(cx - .5 * s), n(base - .82 * s), s)


# ---------- things that repeat ----------

def arrow(cx, cy, w, h, up=True, fill=INK):
    """A block arrow, w wide and h tall, centred on (cx, cy)."""
    hh, sw, d = min(h * .52, w * .62), w * .4, 1 if up else -1
    t, b, m = cy - d * h / 2, cy + d * h / 2, cy - d * (h / 2 - hh)
    return path(f'M{n(cx)} {n(t)}L{n(cx + w / 2)} {n(m)}H{n(cx + sw / 2)}V{n(b)}H{n(cx - sw / 2)}V{n(m)}H{n(cx - w / 2)}Z', fill)


def _tag_marks(kind, x0, x1, cy, h, ink):
    """What a tag shows: one or two arrows and two ink bars, or bars only ('bars')."""
    arrows = 0 if kind == 'bars' else 2 if kind.endswith('2') else 1
    aw, gap, bw = h * .36, h * .12, h * (.62 if kind == 'bars' else .4)
    total = arrows * aw + arrows * gap + bw
    x = (x0 + x1) / 2 - total / 2
    out = ''
    for _ in range(arrows):
        out += arrow(x + aw / 2, cy, aw, h * .58, kind.startswith('up'), ink)
        x += aw + gap
    return out + line(f'M{n(x + 3)} {n(cy - h * .13)}h{n(bw - 6)}M{n(x + 3)} {n(cy + h * .13)}h{n(bw * .6 - 6)}', ink, max(3, h * .1))


def tag(x, y, w, h, kind='up', hole=INK, fill=PAPER, ink=INK):
    """A price tag pointing left. kind: up | up2 | down | down2 | bars."""
    p = h * .42
    return (path(f'M{n(x + p)} {n(y)}H{n(x + w)}V{n(y + h)}H{n(x + p)}L{n(x)} {n(y + h / 2)}Z', fill)
            + circ(x + p * .95, y + h / 2, h * .09, hole)
            + _tag_marks(kind, x + p + h * .16, x + w - h * .14, y + h / 2, h, ink))


def hangtag(cx, top, w, h, kind='up', hole=INK, fill=PAPER, ink=INK, string=None, from_y=0):
    """A price tag hanging point-up from a string."""
    p = w * .42
    out = line(f'M{n(cx)} {n(from_y)}V{n(top + p * .8)}', string, 3) if string else ''
    out += path(f'M{n(cx)} {n(top)}L{n(cx + w / 2)} {n(top + p)}V{n(top + h)}H{n(cx - w / 2)}V{n(top + p)}Z', fill)
    out += circ(cx, top + p * .9, w * .08, hole)
    if kind == 'bars':
        return out + line(f'M{n(cx - w * .26)} {n(top + p + (h - p) * .34)}h{n(w * .52)}M{n(cx - w * .26)} {n(top + p + (h - p) * .66)}h{n(w * .3)}', ink, max(3, w * .09))
    arrows = 2 if kind.endswith('2') else 1
    aw = w * (.3 if arrows == 2 else .42)
    ay, ah = top + p + (h - p) * .42, (h - p) * .56
    for i in range(arrows):
        ax = cx + (i - (arrows - 1) / 2) * (aw + w * .1)
        out += arrow(ax, ay, aw, ah, kind.startswith('up'), ink)
    return out + line(f'M{n(cx - w * .26)} {n(top + h - h * .1)}h{n(w * .52)}', ink, max(3, w * .08))


def sparkle(cx, cy, r, fill=PAPER, op=None):
    """A four-point twinkle."""
    return path(f'M{n(cx)} {n(cy - r)}Q{n(cx)} {n(cy)} {n(cx + r)} {n(cy)}Q{n(cx)} {n(cy)} {n(cx)} {n(cy + r)}Q{n(cx)} {n(cy)} {n(cx - r)} {n(cy)}Q{n(cx)} {n(cy)} {n(cx)} {n(cy - r)}Z', fill, op)


def star(cx, cy, r, fill=YEL, turn=0):
    pts = []
    for i in range(10):
        a = math.radians(turn - 90 + i * 36)
        q = r if i % 2 == 0 else r * .45
        pts.append(f'{n(cx + q * math.cos(a))} {n(cy + q * math.sin(a))}')
    return path('M' + 'L'.join(pts) + 'Z', fill)


def heart(cx, cy, s, fill=RED, op=None):
    """A heart about 2s wide, centred on (cx, cy)."""
    return path(f'M{n(cx)} {n(cy + s * .9)}C{n(cx - s * 1.5)} {n(cy - s * .1)} {n(cx - s * .9)} {n(cy - s * 1.2)} {n(cx)} {n(cy - s * .35)}'
                f'C{n(cx + s * .9)} {n(cy - s * 1.2)} {n(cx + s * 1.5)} {n(cy - s * .1)} {n(cx)} {n(cy + s * .9)}Z', fill, op)


def rays(cx, cy, r0, r1, k, stroke, w=5, turn=0, op=None):
    """Short strokes in a ring: a firework, a flash, a shine."""
    d = ''
    for i in range(k):
        a = math.radians(turn + i * 360 / k)
        d += f'M{n(cx + r0 * math.cos(a))} {n(cy + r0 * math.sin(a))}L{n(cx + r1 * math.cos(a))} {n(cy + r1 * math.sin(a))}'
    return line(d, stroke, w, op)


def coin(cx, cy, r):
    return circ(cx, cy, r, YEL_D) + circ(cx, cy, r * .74, YEL) + line(f'M{n(cx - r * .42)} {n(cy - r * .1)}a{n(r * .44)} {n(r * .44)} 0 0 1 {n(r * .34)} {n(-r * .32)}', PAPER, max(3, r * .16), .8)


def coins(cx, base, k, w=44, h=10):
    """A stack of k coins seen from the side."""
    gaps = ''.join(f'M{n(cx - w / 2)} {n(base - i * h - 1.5)}h{n(w)}v3h{n(-w)}Z' for i in range(1, k))
    return (rect(cx - w / 2, base - k * h, w, k * h, YEL, 4) + (path(gaps, YEL_D) if gaps else '')
            + rect(cx - w / 2 + 5, base - k * h + 2.5, w * .42, 3, PAPER, 1.5, .7))


def crate(x, y, w, h, wood=KRAFT, dark=STONE):
    """A slatted fruit crate: two end posts and two gaps between the boards."""
    d = (f'M{n(x)} {n(y)}h10v{n(h)}h-10ZM{n(x + w - 10)} {n(y)}h10v{n(h)}h-10Z'
         f'M{n(x + 10)} {n(y + h / 3 - 2)}h{n(w - 20)}v4h{n(20 - w)}ZM{n(x + 10)} {n(y + 2 * h / 3 - 2)}h{n(w - 20)}v4h{n(20 - w)}Z')
    return rect(x, y, w, h, wood) + path(d, dark)


def cloud(cx, cy, k, fill, op=None):
    """A flat-bottomed cloud about 150k wide."""
    d = (dp(cx - 38 * k, cy + 4 * k, 30 * k) + dp(cx + 2 * k, cy - 14 * k, 40 * k) + dp(cx + 46 * k, cy + 8 * k, 26 * k)
         + f'M{n(cx - 38 * k)} {n(cy)}V{n(cy + 34 * k)}H{n(cx + 46 * k)}V{n(cy)}Z')
    return path(d, fill, op)


SKY = [(52, 46, 'g'), (40, 70, 'f'), (64, 54, 'p'), (46, 82, 'g'), (58, 60, 'f'), (44, 44, 'p'), (66, 74, 'g'),
       (50, 56, 'f'), (60, 88, 'p'), (42, 50, 'g'), (56, 66, 'f'), (48, 48, 'p'), (54, 72, 'g')]


def skyline(base, fill, k=1, shift=0, op=None):
    """A row of shophouse roofs along the horizon: a quiet town behind the scene."""
    d, x = '', -12
    for i in range(len(SKY)):
        w, h, roof = SKY[(i + shift) % len(SKY)]
        t = base - h * k
        top = {'f': f'H{n(x + w)}', 'g': f'L{n(x + w / 2)} {n(t - w * .28)}L{n(x + w)} {n(t)}',
               'p': f'H{n(x + w * .25)}V{n(t - 9)}H{n(x + w * .75)}V{n(t)}H{n(x + w)}'}[roof]
        d += f'M{n(x)} {n(base)}V{n(t)}{top}V{n(base)}Z'
        x += w
    return path(d, fill, op)


def bunting(x0, y0, x1, y1, sag, cols, size=30, string=PAPER):
    """A string of flags hanging in a curve; '' in cols leaves a gap. Flags of one colour share a path."""
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2 + sag
    by_colour = {}
    for i, c in enumerate(cols):
        if not c:
            continue
        t = (i + .5) / len(cols)
        x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * mx + t * t * x1
        y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * my + t * t * y1
        a = math.atan2(2 * (1 - t) * (my - y0) + 2 * t * (y1 - my), 2 * (1 - t) * (mx - x0) + 2 * t * (x1 - mx))
        ca, sa = math.cos(a), math.sin(a)
        pts = [(x + u * ca - v * sa, y + u * sa + v * ca) for u, v in ((-size / 2, -1), (size / 2, -1), (0, size * 1.1 - 1))]
        by_colour[c] = by_colour.get(c, '') + 'M' + 'L'.join(f'{n(px)} {n(py)}' for px, py in pts) + 'Z'
    return line(f'M{n(x0)} {n(y0)}Q{n(mx)} {n(my)} {n(x1)} {n(y1)}', string, 3) + ''.join(path(d, c) for c, d in by_colour.items())


def lorry(x, base, k=1, a=0, box=PAPER, rail=STONE):
    """The delivery lorry, about 296k wide and 186k tall, wheels on (x.., base), driving right."""
    body = (rect(4, -58, 284, 16, SLATE)
            + rect(0, -180, 184, 126, box) + rect(0, -70, 184, 16, PALE) + rect(-4, -186, 192, 12, rail)
            + line('M62 -164V-80M122 -164V-80', KRAFT, 4)
            + path('M190 -54V-142H238L286 -98V-54Z', YEL) + rect(190, -72, 96, 18, YEL_D)
            + path('M204 -130H234L264 -100H204Z', INK) + line('M212 -122l12 12', BLU_L, 4, .7)
            + rect(277, -90, 9, 14, PAPER, 3) + rect(272, -62, 26, 12, SLATE, 5)
            + circ(52, -26, 26, INK) + circ(52, -26, 10, PAPER) + circ(238, -26, 26, INK) + circ(238, -26, 10, PAPER))
    return f'<g transform="translate({n(x)} {n(base)}) rotate({n(a)}) scale({k})">{body}</g>'


def _face(cx, cy, r, hair):
    """Path data for a face: the two eye dots, and the smile."""
    fy, q = (cy + r * .08, r * .76) if hair == 'tudung' else (cy, r)
    return (dp(cx - q * .36, fy + q * .04, q * .115) + dp(cx + q * .36, fy + q * .04, q * .115),
            f'M{n(cx - q * .26)} {n(fy + q * .4)}q{n(q * .26)} {n(q * .22)} {n(q * .52)} 0')


def bust(cx, cy, r, tone, top, base, hair='short', hc=INK, bw=None, face=True):
    """A person the game's way: a head, ink dot eyes, a smile, a body.
    hair: short | side | bun | long | tudung | cap | hat | bald (hc is its colour)."""
    skin, shade = SKINS[tone]
    bw = bw or r * 1.42
    sy = cy + r * .96
    rr = min(bw * .6, base - sy)
    o = path(f'M{n(cx - bw)} {n(base)}V{n(sy + rr)}a{n(rr)} {n(rr)} 0 0 1 {n(rr)} {n(-rr)}H{n(cx + bw - rr)}a{n(rr)} {n(rr)} 0 0 1 {n(rr)} {n(rr)}V{n(base)}Z', top)
    o += rect(cx - r * .3, cy + r * .55, r * .6, r * .62, shade)
    fy, fr_ = cy, r
    if hair == 'long':
        o += path(f'M{n(cx - r * 1.1)} {n(sy + r * .3)}V{n(cy)}a{n(r * 1.1)} {n(r * 1.1)} 0 0 1 {n(r * 2.2)} 0V{n(sy + r * .3)}Z', hc)
    if hair == 'tudung':
        o += path(f'M{n(cx - r * 1.45)} {n(sy + r * .8)}C{n(cx - r * 1.2)} {n(cy + r * .4)} {n(cx - r * 1.3)} {n(cy - r * 1.2)} {n(cx)} {n(cy - r * 1.2)}'
                  f'C{n(cx + r * 1.3)} {n(cy - r * 1.2)} {n(cx + r * 1.2)} {n(cy + r * .4)} {n(cx + r * 1.45)} {n(sy + r * .8)}Z', hc)
        fy, fr_ = cy + r * .08, r * .76
    o += circ(cx, fy, fr_, skin)
    cap_d = f'M{n(cx - r)} {n(cy - r * .08)}A{n(r)} {n(r)} 0 0 1 {n(cx + r)} {n(cy - r * .08)}'
    if hair in ('short', 'bun', 'long'):
        o += path(cap_d + f'C{n(cx + r * .55)} {n(cy - r * .62)} {n(cx - r * .55)} {n(cy - r * .62)} {n(cx - r)} {n(cy - r * .08)}Z', hc)
    if hair == 'side':
        o += path(cap_d + f'C{n(cx + r * .8)} {n(cy - r * .8)} {n(cx - r * .1)} {n(cy - r * .3)} {n(cx - r)} {n(cy - r * .08)}Z', hc)
    if hair == 'bun':
        o += circ(cx, cy - r * 1.12, r * .36, hc)
    if hair == 'cap':
        o += path(f'M{n(cx - r * 1.03)} {n(cy - r * .3)}A{n(r * 1.03)} {n(r * 1.03)} 0 0 1 {n(cx + r * 1.03)} {n(cy - r * .3)}Z', hc)
        o += rect(cx - r * .2, cy - r * .46, r * 1.7, r * .24, hc, r * .12)
    if hair == 'hat':
        o += path(f'M{n(cx - r * .82)} {n(cy - r * .5)}A{n(r * .82)} {n(r * .74)} 0 0 1 {n(cx + r * .82)} {n(cy - r * .5)}Z', hc)
        o += rect(cx - r * 1.5, cy - r * .62, r * 3, r * .26, hc, r * .13)
    if face:
        eyes, smile = _face(cx, cy, r, hair)
        o += path(eyes, INK) + line(smile, INK, max(3, fr_ * .1))
    return o


def crowd(*people, w=3.5):
    """Several busts (each a tuple of bust() arguments, back to front), then all their eyes and smiles as two shapes.
    Only for people whose faces nobody else overlaps."""
    faces = [_face(p[0], p[1], p[2], p[6] if len(p) > 6 else 'short') for p in people]
    return (''.join(bust(*p, face=False) for p in people)
            + path(''.join(e for e, _ in faces), INK) + line(''.join(m for _, m in faces), INK, w))


def leaf(x, y, k, a, fill):
    return rot(a, x, y, path(f'M{n(x)} {n(y)}c{n(8 * k)} {n(-10 * k)} {n(22 * k)} {n(-10 * k)} {n(28 * k)} 0c{n(-6 * k)} {n(10 * k)} {n(-20 * k)} {n(10 * k)} {n(-28 * k)} 0Z', fill))


def sun(cx, cy, r, face=False):
    """The Heatwave sun: a 12-point burst, a paper ring and a yellow middle."""
    o = burst(cx, cy, r) + circ(cx, cy, r * .595, PAPER) + circ(cx, cy, r * .49, YEL)
    if face:
        o += circ(cx - r * .17, cy - r * .05, r * .056, INK) + circ(cx + r * .17, cy - r * .05, r * .056, INK)
        o += line(f'M{n(cx - r * .19)} {n(cy + r * .13)}q{n(r * .19)} {n(r * .16)} {n(r * .38)} 0', INK, r * .052)
    return o


ART = {}

# ---------- Heatwave: the owner's picture (sun, thermometer, heat lines, a watermelon slice) on a soft ground ----------
ART['heatwave'] = (
    back(RED) + circ(422, 140, 148, ORANGE)
    + sun(422, 140, 108, face=True) + circ(390, 152, 8, RED_L, .7) + circ(454, 152, 8, RED_L, .7)
    + skyline(GROUND, RED_D, k=.62, shift=2, op=.7) + ground(ORANGE)
    + line('M36 332h64M150 356h84M352 346h60M470 362h70M488 330h56', YEL, 4, .7)
    # the thermometer, nearly at the top
    + rect(82, 58, 36, 164, PAPER, 18) + circ(100, 228, 30, PAPER) + rect(108, 70, 6, 132, KRAFT, 3, .7)
    + rect(94, 92, 12, 126, INK, 6) + circ(100, 228, 20, INK) + circ(93, 221, 5, PAPER, .8)
    + path('M128 84h18v6h-18ZM128 114h18v6h-18ZM128 144h18v6h-18ZM128 174h18v6h-18Z', PAPER)
    # heat rising
    + line('M190 198q16-17 0-34t0-34M236 178q16-17 0-34t0-34', PAPER, 7)
    # the slice everyone wants, and what it now costs
    + melon(250, 338, 186)
    + line('M382 286Q358 262 342 234', PAPER, 3) + tag(368, 264, 100, 44, 'up2', RED_D)
)

# ---------- Festival: a crowd under the bunting, fireworks, everyone pays more ----------
ART['festival'] = (
    back(RED) + circ(300, 214, 168, RED_D)
    + rays(92, 132, 12, 30, 10, YEL, 5) + circ(92, 132, 5, YEL) + rays(510, 126, 10, 26, 10, PAPER, 5, 18) + circ(510, 126, 4, PAPER)
    + dots([(40, 96), (170, 150), (236, 112), (372, 118), (438, 158), (566, 92), (300, 170)], 4, YEL)
    + dots([(130, 96), (204, 136), (402, 100), (470, 96), (560, 150), (30, 160)], 3.5, PAPER)
    + bunting(-14, 34, 614, 34, 76, [YEL, GRN, BLU, PAPER, YEL, '', GRN, BLU, PAPER, YEL, GRN], 34)
    + hangtag(300, 78, 54, 76, 'up', RED_D, string=PAPER, from_y=71)
    # the back row, then the front row
    + crowd((121, 192, 27, 'tan', GRN, H, 'short'), (240, 192, 27, 'deep', PAPER, H, 'bald'),
            (359, 192, 27, 'light', BLU, H, 'long'), (478, 192, 27, 'brown', YEL, H, 'cap', INK),
            (62, 256, 35, 'light', INK, H, 'side'), (181, 256, 35, 'tan', PAPER, H, 'tudung', YEL),
            (300, 256, 35, 'deep', YEL, H, 'short'), (419, 256, 35, 'light', INK, H, 'bun'),
            (538, 256, 35, 'brown', PAPER, H, 'short', SLATE))
)

# ---------- Superfood Trend: the blueberry is the champion of the gym ----------
ART['superfood'] = (
    back(PINK)
    + dots([(x + (30 if (y // 50) % 2 else 0), y) for y in range(26, 300, 50) for x in range(24, 600, 60)], 4, PAPER, .22)
    + circ(214, 170, 140, PAPER, .3) + burst(214, 170, 130)
    + rect(0, GROUND, W, 80, RED_D, op=.3) + rect(0, GROUND, W, 5, PAPER, op=.35)
    # the winner's block
    + rect(118, 270, 192, 34, PALE) + rect(118, 262, 192, 10, PAPER) + star(214, 287, 11, YEL)
    + berry(214, 264, 170)
    + line('M72 268a13 15 0 0 1 26 0', SLATE, 8) + circ(85, 284, 20, SLATE) + line('M74 280a12 12 0 0 1 8-8', PAPER, 4, .6)
    + sparkle(96, 92, 13) + sparkle(336, 96, 9) + sparkle(330, 222, 7)
    # the dumbbell
    + rect(396, 252, 100, 14, SLATE, 7)
    + rect(350, 236, 22, 56, PAPER, 8) + rect(372, 216, 28, 88, PAPER, 9) + rect(492, 216, 28, 88, PAPER, 9) + rect(520, 236, 22, 56, PAPER, 8)
    + path('M372 284h28v11a9 9 0 0 1-9 9h-10a9 9 0 0 1-9-9ZM492 284h28v11a9 9 0 0 1-9 9h-10a9 9 0 0 1-9-9Z', KRAFT)
    + berry(425, 320, 40) + berry(467, 320, 40)
    + hangtag(446, 64, 56, 84, 'up', PINK, string=PAPER)
)

# ---------- Mango Craze: a mango on show and a phone full of likes ----------
ART['mangoCraze'] = (
    back(PINK)
    + ''.join(heart(x, y, 6, PAPER, .22) for x, y in [(40, 60), (128, 34), (250, 40), (540, 250), (70, 200), (560, 60), (36, 290), (300, 268)])
    + circ(190, 170, 132, PAPER, .3) + fade(.5, burst(190, 170, 130, PAPER))
    + rect(0, GROUND, W, 80, RED_D, op=.3) + rect(0, GROUND, W, 5, PAPER, op=.35)
    + rect(180, 272, 20, 26, PALE) + rect(136, 292, 108, 12, PAPER, 6) + ell(190, 272, 104, 11, PAPER)
    + mango(190, 270, 150)
    + sparkle(86, 110, 12) + sparkle(292, 92, 8)
    + hangtag(330, 44, 56, 84, 'up2', PINK, string=PAPER)
    # likes fly out of the phone
    + rect(288, 146, 66, 40, PAPER, 12) + path('M340 180l22 12-10-20Z', PAPER) + heart(308, 166, 8) + line('M324 166h16', INK, 5)
    + star(312, 222, 13) + heart(344, 250, 8, PAPER) + star(540, 92, 11) + heart(548, 150, 7, PAPER)
    # the phone in a hand
    + rot(8, 440, 200,
          path('M402 384V330h92v54Z', YEL) + rect(398, 318, 100, 16, PAPER, 6)
          + rect(392, 236, 122, 96, SKINS['tan'][0], 26)
          + rect(378, 66, 124, 228, INK, 18) + rect(388, 84, 104, 174, PAPER, 5) + circ(440, 276, 8, SLATE)
          + rect(388, 84, 104, 108, BLU_L, 5) + mango(441, 184, 62)
          + heart(404, 212, 7) + line('M420 212h54M398 232h76M398 246h46', INK, 5)
          + rect(492, 204, 24, 20, SKINS['tan'][0], 10) + rect(492, 230, 24, 20, SKINS['tan'][0], 10) + rect(492, 256, 24, 20, SKINS['tan'][0], 10)
          + rect(364, 232, 26, 62, SKINS['tan'][0], 13))
)

# ---------- Hotel Order: room service wants an apple, a watermelon and a blueberry ----------
ART['hotel'] = (
    back(BLU)
    + path(''.join(f'M{x} 0h40v{GROUND + 14}h-40Z' for x in range(20, 600, 80)), BLU_D, .3)
    + circ(416, 170, 150, BLU_L)
    + rect(0, 318, W, 66, BLU_D)
    # the key rack on the wall
    + rect(64, 46, 112, 10, KRAFT, 5) + line('M88 56v20M120 56v20M152 56v20', PAPER, 3)
    + rect(79, 74, 18, 28, RED, 5) + rect(111, 74, 18, 28, YEL, 5) + rect(143, 74, 18, 28, PAPER, 5)
    # the trolley with its cloth
    + rect(96, 330, 12, 54, KRAFT) + rect(492, 330, 12, 54, KRAFT)
    + path('M70 278H530V330q-23 14-46 0t-46 0-46 0-46 0-46 0-46 0-46 0-46 0-46 0-46 0Z', PALE)
    + line('M162 296v24M300 296v24M438 296v24', KRAFT, 4) + rect(60, 262, 480, 18, PAPER)
    # the cloche
    + rect(66, 246, 212, 16, YEL, 8) + rect(78, 256, 188, 6, YEL_D, 3)
    + path('M86 246A86 84 0 0 1 258 246Z', PAPER) + path('M258 246A86 84 0 0 0 216 174A118 118 0 0 1 222 246Z', KRAFT)
    + line('M112 220a62 60 0 0 1 36-44', BLU_L, 7, .8)
    + rect(165, 156, 14, 10, KRAFT) + circ(172, 150, 14, PAPER)
    # the order: an apple, a watermelon, a blueberry
    + rect(288, 246, 254, 16, YEL, 8) + rect(300, 256, 230, 6, YEL_D, 3)
    + melon(424, 250, 110) + apple(334, 248, 84) + berry(504, 249, 66)
    + sparkle(388, 118, 11) + sparkle(520, 142, 8) + sparkle(84, 168, 9)
)

# ---------- Apple Blight: no apples today, so apples are dear ----------
ART['blight'] = (
    back(KRAFT) + circ(300, 182, 152, PALE)
    + path(f'M0 270C100 244 200 250 300 264C400 278 500 246 600 258V{GROUND}H0Z', STONE, .45)
    + ground(STONE, edge=SLATE, edge_op=.35)
    # a bare apple tree
    + path('M104 304C110 262 111 228 109 192L129 192C127 228 130 262 136 304Z', SLATE)
    + line('M118 198C112 162 92 144 68 126M120 192C124 152 142 126 168 106M112 170C104 152 100 130 104 102M128 164C142 152 156 148 170 150', SLATE, 8)
    + leaf(60, 122, .8, -30, STONE) + leaf(168, 104, .8, -50, STONE) + leaf(168, 152, .7, 96, LEAF)
    + leaf(150, 214, .8, 60, STONE) + leaf(62, 296, .8, 10, LEAF) + leaf(176, 300, .8, -8, STONE)
    # the apple that is not coming
    + apple(300, 262, 148) + rot(-45.8, 300, 182, rect(196, 173, 208, 18, RED)) + ring(300, 182, 104, RED, 18)
    # an empty crate, a caterpillar, and the price
    + crate(424, 240, 112, 64, STONE, SLATE) + rect(434, 232, 92, 10, SLATE)
    + dots([(456, 226), (468, 222), (480, 226), (492, 222)], 7.5, LEAF) + circ(504, 224, 8.5, GRN) + circ(507, 222, 2.2, INK)
    + line('M460 186Q438 204 440 240', PAPER, 3) + tag(442, 160, 96, 44, 'up2', KRAFT)
)

# ---------- Blueberry Glut: far too many blueberries, so they are cheap ----------
ART['glut'] = (
    back(YEL)
    # more crates waiting at the back
    + fade(.5, crate(22, 196, 112, 56, YEL_D, YEL) + crate(36, 140, 92, 56, YEL_D, YEL)
           + crate(468, 188, 112, 58, YEL_D, YEL) + crate(480, 130, 92, 58, YEL_D, YEL) + crate(498, 76, 70, 54, YEL_D, YEL))
    + circ(300, 172, 152, YEL_L) + ground(YEL_D)
    # the heap
    + ''.join(berry(x, 252, 54) for x in (192, 246, 300, 354, 408))
    + ''.join(berry(x, 210, 54) for x in (219, 273, 327, 381))
    + ''.join(berry(x, 168, 54) for x in (246, 300, 354))
    + berry(273, 126, 54) + berry(327, 126, 54)
    + crate(166, 234, 268, 70, KRAFT, STONE)
    + tag(244, 247, 112, 44, 'down', KRAFT)
    # the ones that rolled away
    + rot(-24, 442, 180, berry(442, 206, 50)) + line('M424 152q16-12 30-6', PAPER, 4, .8)
    + rot(20, 124, 296, berry(124, 320, 50)) + berry(82, 306, 38) + rot(-30, 478, 296, berry(478, 320, 50)) + rot(40, 524, 292, berry(524, 310, 38))
)

# ---------- Good Harvest: the lorry is piled high, so fruit is cheap ----------
HILLS = 'M0 240C90 204 190 216 290 238C390 260 500 216 600 234V304H0Z'
ART['goodHarvest'] = (
    back(GRN) + circ(110, 104, 90, GRN_L) + sun(110, 104, 60)
    + path(HILLS, GRN_D) + line('M16 262q60-22 130-12M40 284q50-14 96-8M330 268q90-8 150-30M476 282q56-14 110-18', GRN, 4, .7)
    + ground(LEAF, edge=GRN_L, edge_op=.6)
    # the load
    + melon(232, 110, 54) + apple(276, 106, 42) + mango(318, 106, 38)
    + apple(196, 136, 44) + mango(240, 136, 40) + berry(284, 136, 42) + melon(322, 138, 50)
    + lorry(170, 306, .9)
    # a full crate and the price
    + apple(478, 262, 38) + berry(512, 262, 34) + crate(452, 258, 86, 46, KRAFT, STONE)
    + line('M468 190Q446 214 456 258', PAPER, 3) + tag(456, 166, 84, 40, 'down', GRN_D)
)

# ---------- Bad Harvest: half a load, so fruit is dear ----------
ART['badHarvest'] = (
    back(KRAFT) + circ(110, 104, 90, PALE) + cloud(100, 96, 1.0, STONE) + cloud(48, 150, .5, PAPER)
    + path(HILLS, STONE, .6) + ground(STONE, edge=SLATE, edge_op=.35)
    + line('M40 346l22 10 16-8M312 352l20-10 22 8M540 344l-20 12', SLATE, 3, .5)
    # what is left of the crop: bare stalks and a caterpillar
    + line('M58 304C58 262 52 240 34 228M100 304C100 258 108 236 132 224M140 304C140 284 146 272 160 266', SLATE, 7)
    + leaf(36, 229, 1.2, 150, STONE) + leaf(56, 268, 1.0, 200, STONE) + leaf(130, 225, 1.2, 28, STONE) + leaf(102, 262, 1.0, -30, LEAF)
    + leaf(158, 267, 1.0, 30, STONE)
    + dots([(96, 222), (107, 216), (118, 219)], 7, LEAF) + circ(129, 214, 8, GRN) + circ(132, 212, 2.2, INK)
    # one lonely apple on the lorry
    + apple(262, 134, 50)
    + lorry(170, 306, .9)
    # empty crates and the price
    + crate(460, 216, 70, 42, PAPER, STONE) + crate(452, 258, 86, 46, PAPER, STONE)
    + line('M470 176Q452 192 464 216', PAPER, 3) + tag(456, 152, 84, 40, 'up', KRAFT)
)

# ---------- Price Hike: the wholesale bill goes up ----------
ART['priceHike'] = (
    back(RED)
    + path('M0 304V268H100V226H200V184H300V142H400V100H500V58H600V304Z', RED_D, .35)
    + circ(430, 162, 138, RED_D) + ground(RED_D)
    # the price tag, hanging over the wholesale crate
    + line('M112 130Q98 60 122 0', PAPER, 3)
    + rot(-6, 170, 130, path('M112 84H268V176H112L74 130Z', PAPER) + circ(110, 130, 8, RED)
          + coin(160, 130, 24) + line('M202 116h44M202 144h28', INK, 8))
    + rect(92, 200, 164, 46, STONE) + rect(92, 220, 164, 4, KRAFT)
    + apple(116, 248, 48) + mango(158, 248, 42) + melon(200, 250, 54) + berry(240, 248, 40)
    + crate(84, 244, 180, 60, KRAFT, STONE)
    # up it goes
    + coins(330, 304, 2) + coins(380, 304, 4) + coins(430, 304, 6) + coins(480, 304, 3)
    + arrow(430, 150, 132, 180, True, YEL) + path('M430 60L496 141.8H456.4V240H430Z', YEL_D)
    + sparkle(520, 84, 11) + sparkle(338, 100, 8)
)

# ---------- Price Controls: the notice board shows the most each fruit may cost ----------
LIMITS = {'blueberry': 5, 'watermelon': 7, 'apple': 6, 'mango': 10}  # maxPrice of priceControls in src/engine/data.ts


def _limit(cx, fruit):
    """A red lid over one coin for each dollar of the fruit's price limit, five to a row."""
    pts = [(cx - 34 + 17 * (i % 5), 208 + 19 * (i // 5)) for i in range(LIMITS[fruit])]
    return rect(cx - 42, 186, 84, 8, RED, 4) + dots(pts, 7.5, YEL_D) + dots(pts, 5, YEL)


ART['priceControls'] = (
    back(BLU) + circ(300, 136, 136, BLU_L) + skyline(GROUND, BLU_D, k=.7, shift=5, op=.6) + ground(BLU_L)
    + rect(126, 268, 16, 40, KRAFT) + rect(458, 268, 16, 40, KRAFT) + rect(136, 278, 6, 30, STONE) + rect(468, 278, 6, 30, STONE)
    + rect(74, 70, 452, 208, PAPER, 8) + rect(74, 262, 452, 16, PALE)
    + path('M74 108V78a8 8 0 0 1 8-8H518a8 8 0 0 1 8 8V108Z', RED) + line('M98 89h130M246 89h64', PAPER, 7)
    + line('M187 122V256M300 122V256M413 122V256', KRAFT, 3)
    + berry(130.5, 174, 50) + melon(243.5, 173, 68) + apple(356.5, 174, 50) + mango(469.5, 174, 44)
    + _limit(130.5, 'blueberry') + _limit(243.5, 'watermelon') + _limit(356.5, 'apple') + _limit(469.5, 'mango')
    # the official seal
    + path('M484 96l-6 26 11-8 7 10 4-28ZM508 96l6 26-11-8-7 10-4-28Z', BLU_D)
    + burst(496, 88, 26) + circ(496, 88, 13, YEL_D) + circ(496, 88, 8, PAPER)
)

# ---------- Health Inspector: a close look at the fruit, and a fine ----------
_SK, _SH = SKINS['tan']
ART['inspector'] = (
    back(GRN)
    + line(''.join(f'M{x} 0V250' for x in range(60, 600, 60)) + ''.join(f'M0 {y}H600' for y in range(70, 260, 60)), GRN_D, 3, .35)
    + circ(205, 168, 134, GRN_L) + rect(0, 320, W, 64, GRN_D)
    # the stall
    + rect(40, 262, 312, 122, KRAFT) + path(''.join(f'M{x} 272h4v112h-4Z' for x in range(100, 340, 62)), STONE)
    + rect(28, 250, 336, 14, PAPER) + rect(28, 262, 336, 4, STONE)
    + circ(205, 182, 86, PAPER, .3) + apple(205, 252, 124)
    + line('M318 92q12-14 26-6M92 96q-12-12-26-4', INK, 3, .5)
    + ell(314, 98, 7, 5, INK) + ell(309, 91, 6, 3.5, PAPER, .9) + ell(96, 102, 7, 5, INK) + ell(101, 95, 6, 3.5, PAPER, .9)
    # the inspector
    + path('M384 384V264a56 56 0 0 1 56-56h24a56 56 0 0 1 56 56V384Z', BLU_D)
    + path('M398 246L336 292L354 318L424 280Z', BLU_D)
    + rect(438, 186, 28, 30, _SH) + path('M428 208l24 30 24-30Z', PAPER)
    + circ(452, 150, 48, _SK)
    + path('M402 120C402 86 424 74 452 74C480 74 502 86 502 120Z', BLU_D) + rect(400, 112, 104, 12, INK, 3)
    + path('M406 124h92q12 6 14 18H392q2-12 14-18Z', INK) + circ(452, 95, 9, YEL)
    + circ(435, 158, 5.5, INK) + circ(469, 158, 5.5, INK) + line('M438 178h28', INK, 5)
    # the magnifying glass
    + rot(44, 268, 246, rect(268, 235, 92, 22, INK, 11)) + ring(205, 182, 92, INK, 16)
    + line('M150 152a64 64 0 0 1 36-32', PAPER, 7, .85) + circ(342, 314, 16, _SK)
    # the clipboard: two ticks, one cross, and what it costs
    + move(-10, 0, rot(5, 500, 296,
          rect(456, 236, 92, 122, KRAFT, 6) + rect(464, 250, 76, 100, PAPER, 3) + rect(484, 228, 36, 16, SLATE, 5)
          + line('M474 268l5 6 9-12M474 290l5 6 9-12', GRN, 4.5) + line('M475 307l12 12M487 307l-12 12', RED, 4.5)
          + line('M498 268h32M498 290h32M498 313h20', INK, 5) + coin(482, 337, 8) + coin(502, 337, 8))
          + circ(458, 322, 15, _SK))
)

# ---------- Lorry Breakdown: no delivery today ----------
ART['strike'] = (
    back(KRAFT) + circ(246, 176, 140, STONE, .6) + skyline(GROUND, STONE, k=.6, shift=8, op=.7)
    + ground(STONE, edge=SLATE, edge_op=.35) + path('M30 344h70v8h-70ZM180 344h70v8h-70ZM330 344h70v8h-70ZM480 344h70v8h-70Z', PALE)
    # smoke from the engine
    + circ(388, 196, 15, SLATE, .5) + circ(404, 156, 24, SLATE, .42) + circ(390, 106, 33, SLATE, .34)
    + lorry(108, 304, .92, a=2.2) + rect(294, 304, 68, 14, STONE) + rect(0, 304, W, 6, SLATE, op=.35) + ell(328, 304, 30, 6, INK)
    + rect(104, 232, 12, 12, ORANGE, 3)
    # the warning triangle and a cone
    + line('M440 304h64', SLATE, 7) + path('M472 190L536 300H408Z', RED) + path('M472 228L504 282H440Z', PAPER)
    + path('M66 304l11-46h10l11 46Z', ORANGE) + path('M72 280h20l3 12h-26Z', PAPER) + rect(58, 300, 48, 8, ORANGE, 4)
    # a spanner and a wheel nut on the road
    + rot(-16, 300, 334, line('M270 334h60', SLATE, 9) + circ(334, 334, 11, SLATE) + rect(334, 329, 14, 10, STONE))
    + circ(388, 330, 7, SLATE) + circ(388, 330, 3, STONE)
)

# ---------- Tourist Bus: a coach full of extra customers ----------
ART['touristBus'] = (
    back(YEL) + circ(300, 136, 138, YEL_L) + skyline(GROUND, YEL_D, k=.8, shift=4, op=.7)
    + ground(YEL_D) + path('M20 346h70v8h-70ZM170 346h70v8h-70ZM320 346h70v8h-70ZM470 346h70v8h-70Z', PAPER, .8)
    # luggage on the roof, and the tour sign
    + rect(120, 88, 54, 24, RED, 6) + rect(180, 78, 40, 34, GRN, 6) + rect(226, 92, 46, 20, PAPER, 6) + line('M104 108h186', INK, 5)
    + rect(404, 84, 104, 26, PAPER, 6) + rect(404, 104, 104, 6, KRAFT, 3) + line('M420 95h44M476 95h16', INK, 5)
    # the coach
    + rect(60, 108, 480, 168, BLU, 28) + path('M60 236H540v12a28 28 0 0 1-28 28H88a28 28 0 0 1-28-28Z', BLU_D)
    + rect(60, 212, 480, 12, PAPER) + rect(60, 224, 480, 5, RED)
    + rect(84, 128, 82, 70, PAPER, 9) + rect(176, 128, 82, 70, PAPER, 9) + rect(268, 128, 82, 70, PAPER, 9) + rect(360, 128, 82, 70, PAPER, 9)
    + path('M456 128h52a22 22 0 0 1 22 22v48h-74Z', BLU_L) + line('M474 142l-8 22M490 142l-12 34', PAPER, 4, .7)
    + rect(526, 236, 14, 16, YEL_L, 4) + rect(524, 262, 26, 12, SLATE, 6)
    + path('M116 276a40 40 0 0 1 80 0ZM392 276a40 40 0 0 1 80 0Z', INK)
    + circ(156, 276, 30, SLATE) + circ(156, 276, 12, PAPER) + circ(432, 276, 30, SLATE) + circ(432, 276, 12, PAPER)
    # the tourists
    + crowd((125, 162, 20, 'light', GRN, 198, 'hat', RED, 28), (217, 162, 20, 'deep', YEL, 198, 'short', INK, 28),
            (309, 162, 20, 'tan', RED, 198, 'tudung', PINK, 28), (401, 162, 20, 'brown', ORANGE, 198, 'cap', GRN, 28), w=3)
    + path('M108 160h34v5a4 4 0 0 1-4 4h-7a4 4 0 0 1-4-4h-4a4 4 0 0 1-4 4h-7a4 4 0 0 1-4-4Z', INK)
    + rect(226, 172, 30, 20, INK, 4) + circ(241, 182, 6.5, BLU_L) + rect(230, 167, 9, 6, INK, 2)
    + rays(262, 150, 8, 18, 8, YEL, 4, 22)
)

# ---------- Monsoon Downpour: nobody about, and the fruit keeps cool and fresh ----------
def _rain():
    d = ''
    for row, y in enumerate(range(118, 300, 44)):
        for x in range(22 + (22 if row % 2 else 0), 620, 44):
            if not (150 < x < 462 and y > 120):
                d += f'M{x} {y}l-7 20'
    return line(d, BLU_L, 5, .9)


def _umbrella(cx, top, half, rim, k=7):
    """A market umbrella: a dome with a scalloped rim and alternate paper panels."""
    w = 2 * half / k
    edge = ''.join(f'q{n(-w / 2)} {n(-14)} {n(-w)} 0' for _ in range(k))
    out = path(f'M{n(cx - half)} {n(rim)}Q{n(cx - half * .86)} {n(top)} {n(cx)} {n(top)}Q{n(cx + half * .86)} {n(top)} {n(cx + half)} {n(rim)}{edge}Z', RED)
    for i in range(1, k, 2):
        x0 = cx - half + i * w
        out += path(f'M{n(cx)} {n(top + 2)}L{n(x0)} {n(rim)}q{n(w / 2)} {n(-14)} {n(w)} 0Z', PAPER)
    return out + circ(cx, top - 2, 7, YEL)


ART['monsoon'] = (
    back(BLU) + circ(300, 178, 152, BLU_D)
    + cloud(326, 62, 1.0, BLU_L) + cloud(150, 72, 1.3, PAPER) + cloud(468, 78, 1.15, PAPER)
    + path('M514 112l-30 46h20l-18 42 50-58h-22l16-30Z', YEL)
    + _rain() + ground(BLU_D)
    # puddles and a paper boat
    + ell(104, 336, 70, 11, BLU_L) + ell(500, 344, 76, 12, BLU_L)
    + line('M70 336h36M486 348h44', PAPER, 3, .7) + line('M52 300l-8-10M64 300l6-10M556 300l-8-10M568 300l6-10', BLU_L, 4)
    + path('M472 336h52l-12 13h-28Z', PAPER) + path('M496 308v24h-20Z', PAPER) + path('M500 314v18h14Z', PALE)
    # the stall under its umbrella
    + rect(295, 190, 10, 60, SLATE)
    + melon(260, 252, 84) + apple(326, 250, 50) + mango(366, 250, 38) + crate(210, 248, 180, 56, KRAFT, STONE)
    + _umbrella(300, 108, 164, 198)
    + sparkle(412, 232, 11) + sparkle(190, 228, 8)
)

# ---------- Durian Season: everyone wants durian, so other fruit is cheap ----------
def _spiky(cx, cy, rx, ry, k, depth, a0=0, a1=360):
    pts = []
    for i in range(2 * k + 1):
        a = math.radians(a0 + (a1 - a0) * i / (2 * k) - 90)
        q = 1 if i % 2 == 0 else 1 - depth
        pts.append(f'{n(cx + rx * q * math.cos(a))} {n(cy + ry * q * math.sin(a))}')
    return 'M' + 'L'.join(pts) + 'Z'


def _thorns(points, s, fill):
    return path(''.join(f'M{n(x - s * .55)} {n(y + s * .5)}L{n(x)} {n(y - s * .5)}L{n(x + s * .55)} {n(y + s * .5)}Z' for x, y in points), fill)


ART['durian'] = (
    back(YEL) + circ(214, 176, 146, YEL_L) + ground(YEL_D)
    # a woven mat
    + path('M84 294H516L550 338H50Z', KRAFT) + path('M79 300H521l5 6H74ZM60 325H540l5 6H55Z', STONE, .8)
    + path(''.join(f'M{x} 316l9-5 9 5-9 5Z' for x in range(92, 500, 36)), STONE, .8)
    # the smell
    + line('M72 200q14-15 0-30t0-30M352 154q14-15 0-30t0-30', GRN_D, 6, .55)
    # the king of fruit
    + line('M214 80V54', GRN_D, 10) + leaf(216, 60, 1.2, -24, GRN_D)
    + path(_spiky(214, 186, 102, 110, 20, .15), GRN) + path(_spiky(214, 186, 102, 110, 10, .15, 0, 180), GRN_D)
    + path('M214 78A58 108 0 0 1 214 294Z', GRN)
    + _thorns([(152, 136), (188, 120), (138, 178), (174, 166), (210, 154), (152, 218), (188, 206), (174, 250), (210, 242), (224, 198)], 22, LEAF)
    + _thorns([(250, 130), (268, 172), (252, 216), (280, 210), (246, 256), (284, 150)], 22, GRN)
    # one cut open
    + path(_spiky(436, 244, 92, 66, 9, .16, 90, 270), GRN) + ell(436, 244, 84, 22, PALE)
    + ell(408, 234, 34, 22, YEL_L) + ell(464, 232, 36, 23, YEL_L)
    + ell(398, 228, 9, 5, PAPER, .9) + ell(454, 225, 9, 5, PAPER, .9)
    # the price
    + line('M388 108Q300 40 220 56', YEL_D, 3) + tag(372, 74, 150, 66, 'down', YEL)
)

# ---------- Kenduri: a wedding feast needs three watermelons ----------
def _manggar(x, top, base):
    """Bunga manggar: the tinsel palm-blossom pole that stands at a kenduri."""
    ends = [(-58, 62), (-44, 22), (-22, -4), (22, -4), (44, 22), (58, 62)]
    a = ''.join(f'M{x} {top + 20}Q{n(x + dx * .55)} {top - 44} {x + dx} {top + dy}' for dx, dy in ends[::2])
    b = ''.join(f'M{x} {top + 20}Q{n(x + dx * .55)} {top - 44} {x + dx} {top + dy}' for dx, dy in ends[1::2])
    return (line(f'M{x} {top + 20}V{base}', PAPER, 5) + line(a, YEL, 5) + line(b, PAPER, 5)
            + dots([(x + dx, top + dy) for dx, dy in ends], 5, BLU) + circ(x, top + 18, 7, YEL))


ART['kenduri'] = (
    back(PINK) + circ(300, 178, 138, PAPER, .3)
    + rect(0, GROUND, W, 80, RED_D, op=.3) + rect(0, GROUND, W, 5, PAPER, op=.35)
    # the tent's edge and the bunting
    + rect(0, 0, W, 30, PAPER)
    + path(''.join(f'M{x} 28h50v10a25 25 0 0 1-50 0Z' for x in range(0, 600, 100)), PAPER)
    + path(''.join(f'M{x} 28h50v10a25 25 0 0 1-50 0Z' for x in range(50, 600, 100)), YEL)
    + bunting(-12, 70, 612, 70, 56, [RED, YEL, GRN, BLU, PAPER, RED, YEL, GRN, BLU, PAPER, RED], 30)
    + _manggar(66, 136, 318) + _manggar(534, 136, 318)
    # the table and the three slices
    + path('M88 252H512V322' + 'q-17.7 12-35.3 0' * 12 + 'Z', PALE)
    + path(''.join(f'M{n(x)} 279l8 8-8 8-8-8Z' for x in [105.7 + 35.33 * i for i in range(12)]), YEL)
    + rect(78, 236, 444, 18, PAPER)
    + ell(166, 238, 66, 9, YEL) + ell(300, 238, 66, 9, YEL) + ell(434, 238, 66, 9, YEL)
    + melon(166, 238, 110) + melon(300, 238, 110) + melon(434, 238, 110)
    + sparkle(232, 150, 10) + sparkle(368, 150, 10)
)

# ---------- Mango Windfall: it is raining ripe mangoes, so they are cheap ----------
ART['mangoWindfall'] = (
    back(GRN) + circ(410, 176, 142, GRN_L)
    + path('M0 262C120 236 220 250 330 266C440 282 520 250 600 258V304H0Z', GRN_D)
    + ground(LEAF, edge=GRN_L, edge_op=.6)
    # the tree
    + path('M152 304C160 262 162 232 158 196L190 196C188 232 192 262 200 304Z', SLATE) + path('M176 196h14c-2 36 2 66 10 108h-14c-8-42-12-72-10-108Z', INK, .35)
    + move(0, 10, path(dp(172, 120, 86) + dp(98, 150, 50) + dp(246, 150, 52) + dp(132, 84, 50) + dp(216, 82, 48), GRN_D)
           + leaf(84, 120, 1.1, -20, LEAF) + leaf(150, 62, 1.1, 10, LEAF) + leaf(226, 60, 1.0, 30, LEAF) + leaf(250, 112, 1.0, -30, LEAF) + leaf(120, 196, 1.0, 10, LEAF)
           + mango(112, 168, 36) + mango(168, 126, 36) + mango(232, 172, 36) + mango(196, 212, 34))
    # falling
    + line('M306 96v26M322 104v18M352 168v24M368 176v16M300 226v18', PAPER, 4, .7)
    + rot(18, 312, 150, mango(312, 172, 40)) + rot(-16, 358, 218, mango(358, 240, 40)) + rot(30, 304, 268, mango(304, 288, 36))
    # the basket
    + mango(416, 246, 46) + mango(454, 244, 46) + mango(492, 246, 46) + mango(436, 216, 44) + mango(474, 216, 44)
    + path('M378 240H530L514 304H394Z', KRAFT) + path('M392 262h124v4h-124ZM398 284h112v4h-112Z', STONE) + rect(372, 234, 164, 12, STONE, 6)
    + rot(-4, 452, 276, tag(404, 256, 100, 40, 'down2', KRAFT))
    + mango(560, 318, 38) + sparkle(540, 120, 10)
)

# ---------- Pasar Malam: the night hawker buys one of each fruit that is left ----------
def _crescent(cx, cy, r, ox, oy, r2, fill):
    d = math.hypot(ox, oy)
    a = (r * r - r2 * r2 + d * d) / (2 * d)
    h = math.sqrt(r * r - a * a)
    px, py = cx + a * ox / d, cy + a * oy / d
    x1, y1, x2, y2 = px - h * oy / d, py + h * ox / d, px + h * oy / d, py - h * ox / d
    return path(f'M{n(x1)} {n(y1)}A{n(r)} {n(r)} 0 1 1 {n(x2)} {n(y2)}A{n(r2)} {n(r2)} 0 1 0 {n(x1)} {n(y1)}Z', fill)


def _lanterns(*at):
    """Paper lanterns hanging at (x, y of the top of the body): four shapes for the lot."""
    def box(x, y, w, h, r):
        return f'M{n(x + r)} {n(y)}h{n(w - 2 * r)}a{r} {r} 0 0 1 {r} {r}v{n(h - 2 * r)}a{r} {r} 0 0 1 {-r} {r}h{n(2 * r - w)}a{r} {r} 0 0 1 {-r} {-r}v{n(2 * r - h)}a{r} {r} 0 0 1 {r} {-r}Z'
    return (line(''.join(f'M{x} {y - 8}v8M{x} {y + 36}v14' for x, y in at), YEL, 3)
            + path(''.join(box(x - 16, y, 32, 36, 13) for x, y in at), RED)
            + path(''.join(box(x - 3, y, 6, 36, 2) for x, y in at), YEL)
            + path(''.join(box(x - 9, y - 3, 18, 6, 2) + box(x - 9, y + 33, 18, 6, 2) for x, y in at), YEL_D))


_HK = SKINS['tan'][0]
ART['pasarMalam'] = (
    back(INK) + circ(256, 190, 172, BLU_D)
    + dots([(36, 110), (60, 180), (452, 44), (560, 156), (576, 64), (30, 240), (470, 156), (552, 238), (430, 104)], 2.6, PAPER, .8)
    + _crescent(510, 104, 36, 14, -10, 31, YEL) + sparkle(456, 76, 9) + sparkle(562, 110, 7)
    + ground(BLU_D, edge=BLU, edge_op=.6)
    # lanterns on a string
    + line('M-10 36Q300 92 610 36', KRAFT, 3) + _lanterns((70, 57), (170, 67), (270, 72), (370, 71))
    # the hawker, paying
    + bust(486, 210, 34, 'tan', GRN, H, 'cap', RED) + path('M462 260l-36-14 6-14 40 12Z', GRN) + circ(430, 240, 12, _HK)
    + path('M462 274h48v110h-48Z', PAPER) + line('M468 274l-6-22M504 274l6-22', PAPER, 4)
    # the stall, with one of each fruit
    + rect(100, 142, 8, 100, KRAFT) + rect(404, 142, 8, 100, KRAFT)
    + rect(92, 132, 328, 12, RED_D)
    + path(''.join(f'M{x} 144h41v14a20.5 20.5 0 0 1-41 0Z' for x in range(92, 420, 82)), RED)
    + path(''.join(f'M{x} 144h41v14a20.5 20.5 0 0 1-41 0Z' for x in range(133, 420, 82)), PAPER)
    + apple(136, 238, 54) + mango(196, 238, 46) + berry(254, 238, 50) + melon(324, 240, 80)
    + coins(396, 236, 3, 38, 9)
    + rect(84, 250, 344, 54, KRAFT) + path(''.join(f'M{x} 256h4v48h-4Z' for x in range(140, 420, 58)), STONE)
    + rect(76, 236, 360, 16, YEL) + rect(76, 248, 360, 4, YEL_D)
)

# ---------- Bake-Off: the bakery wants apples for its prize pie ----------
ART['bakeOff'] = (
    back(KRAFT)
    + line(''.join(f'M{x} 0V268' for x in range(50, 600, 50)) + ''.join(f'M0 {y}H600' for y in range(18, 268, 50)), PALE, 3)
    + circ(410, 160, 138, PALE)
    # a shelf with the baker's hat
    + rect(60, 104, 156, 10, STONE, 5)
    + path(dp(92, 62, 17) + dp(114, 54, 20) + dp(136, 62, 17) + 'M92 62v28h44v-28Z', PAPER) + rect(90, 86, 48, 18, PALE)
    + rect(162, 72, 34, 32, BLU_L, 6) + rect(160, 64, 38, 10, BLU, 4) + rect(168, 82, 22, 12, PAPER, 2)
    # the cloth
    + rect(0, 268, W, 116, PAPER)
    + path(''.join(f'M{x} {y}h30v29h-30Z' for j, y in enumerate(range(268, 384, 29)) for x in range(30 if j % 2 else 0, 600, 60)), RED_L, .6)
    + rect(0, 268, W, 5, RED_L)
    # the two apples the bakery wants
    + apple(136, 274, 112) + apple(236, 278, 88)
    # the pie, hot from the oven, with its rosette
    + line('M372 112q12-13 0-26t0-26M410 104q12-13 0-26t0-26M448 112q12-13 0-26t0-26', STONE, 6)
    + rect(302, 256, 216, 12, PAPER, 6)
    + path('M290 200H530L506 258H314Z', RED) + path('M290 200H530l-6 14H296Z', RED_D)
    + path('M298 198C298 152 352 134 410 134C468 134 522 152 522 198Z', YEL)
    + dots([(x, 198) for x in range(302, 520, 18)], 10, YEL) + dots([(x, 204) for x in range(311, 512, 18)], 4, YEL_D)
    + line('M326 174C336 156 360 148 384 144', YEL_L, 7) + line('M372 160l8 18M410 154v20M448 160l-8 18', INK, 6)
    + path('M398 240l-10 48 14-9 8 13 6-50ZM422 240l10 48-14-9-8 13-6-50Z', BLU_D)
    + burst(410, 232, 30, BLU) + circ(410, 232, 16, PAPER) + star(410, 232, 9, YEL)
    # a rolling pin and the price
    + rot(-7, 200, 334, rect(84, 327, 232, 14, STONE, 7) + rect(118, 320, 164, 28, KRAFT, 14) + rect(130, 340, 140, 5, STONE, 2.5))
    + rot(14, 470, 330, line('M408 330h44', STONE, 9) + line('M452 330c20-22 62-22 78 0c-16 22-58 22-78 0ZM452 330c26-9 56-9 78 0M452 330c26 9 56 9 78 0', SLATE, 4))
    + hangtag(248, 46, 52, 76, 'up', KRAFT, string=PAPER)
)

# ---------- Calm Day: nothing happens; a sunny morning at the stall ----------
ART['calm'] = (
    back(BLU) + circ(424, 168, 134, BLU_L) + sun(424, 168, 86) + cloud(140, 120, .62, PAPER, .9)
    # the awning
    + rect(0, 0, W, 42, RED) + rect(0, 36, W, 6, RED_D)
    + path(''.join(f'M{x} 42h60v8a30 30 0 0 1-60 0Z' for x in range(0, 600, 120)), RED)
    + path(''.join(f'M{x} 42h60v8a30 30 0 0 1-60 0Z' for x in range(60, 600, 120)), PAPER)
    + hangtag(270, 98, 50, 66, 'bars', BLU, string=PAPER, from_y=78)
    # the counter
    + rect(0, 300, W, 84, KRAFT) + path(''.join(f'M{x} 312h4v72h-4Z' for x in range(74, 600, 150)), STONE) + rect(0, 300, W, 12, PALE)
    # a crate of fruit, and the rest on the counter
    + mango(104, 224, 54, 'unripe') + mango(214, 224, 54) + apple(159, 224, 66) + crate(64, 214, 190, 86, PAPER, STONE)
    + melon(306, 302, 90) + berry(384, 302, 54)
    # the stall cat, asleep
    + line('M524 292q18-2 18-20', ORANGE, 10)
    + path('M424 300a56 42 0 0 1 112 0Z', ORANGE) + line('M482 262v14M502 264v14M518 272v12', RED_D, 4, .5)
    + path('M420 262l2-24 18 12ZM452 250l18-12 2 24Z', ORANGE) + circ(446, 276, 25, ORANGE)
    + line('M433 276q5 5 10 0M449 276q5 5 10 0', INK, 3) + path('M443 284h6l-3 4Z', PINK)
)

if __name__ == '__main__':
    order = ['calm', 'festival', 'superfood', 'mangoCraze', 'hotel', 'heatwave', 'blight', 'glut', 'goodHarvest', 'badHarvest',
             'priceHike', 'priceControls', 'inspector', 'strike', 'touristBus', 'monsoon', 'durian', 'kenduri', 'mangoWindfall',
             'pasarMalam', 'bakeOff']
    assert sorted(order) == sorted(ART), 'every event once'
    names = ['event-' + key for key in order]
    for key in order:
        save('event-' + key, svg(W, H, ART[key]))
    print(len(names), 'event pictures written')
    sheet(names, 'sheet-events.png', cols=4, w=300, ratio=1.5625)
