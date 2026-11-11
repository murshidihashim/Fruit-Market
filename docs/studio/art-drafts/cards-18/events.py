"""The 21 event pictures of the rules 18 card set, in the flat Market Ticket style (plain SVG, 600 by 384).

Every picture is built in the same layers, back to front: the event's own background colour with a quiet pattern or
skyline; a big disc or sunburst in a lighter or darker tone; the main objects, large; two or three small details; a
soft ground (never an ink bar). Fruit is always the game's own icon (kit.fr). A price that goes up or down is shown as
a paper tag with an arrow, never as a number.

Run from the repo root: python3 docs/studio/art-drafts/cards-18/events.py
Writes event-<id>.svg for each event beside this file and the contact sheet sheet-events.png.
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


def ring(cx, cy, r, stroke, w, op=None):
    return f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(r)}" fill="none" stroke="{stroke}" stroke-width="{n(w)}"{_op(op)}/>'


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
    return circ(cx, cy, r, YEL_D) + circ(cx, cy, r * .74, YEL) + line(f'M{n(cx - r * .42)} {n(cy - r * .1)}a{n(r * .44)} {n(r * .44)} 0 0 1 {n(r * .34)} {n(-r * .32)}', PAPER, max(2, r * .16), .8)


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
         + f'M{n(cx - 38 * k)} {n(cy)}H{n(cx + 46 * k)}V{n(cy + 34 * k)}H{n(cx - 38 * k)}Z')
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
    """A string of flags hanging in a curve; '' in cols leaves a gap."""
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2 + sag
    out = line(f'M{n(x0)} {n(y0)}Q{n(mx)} {n(my)} {n(x1)} {n(y1)}', string, 3)
    for i, c in enumerate(cols):
        if not c:
            continue
        t = (i + .5) / len(cols)
        x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * mx + t * t * x1
        y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * my + t * t * y1
        a = math.degrees(math.atan2(2 * (1 - t) * (my - y0) + 2 * t * (y1 - my), 2 * (1 - t) * (mx - x0) + 2 * t * (x1 - mx)))
        out += rot(a, x, y, path(f'M{n(x - size / 2)} {n(y - 1)}h{n(size)}l{n(-size / 2)} {n(size * 1.1)}Z', c))
    return out


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


def bust(cx, cy, r, tone, top, base, hair='short', hc=INK, bw=None, smile=True):
    """A person the game's way: a head, ink dot eyes, a body. hair: short | side | bun | long | tudung | cap | hat | bald."""
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
    o += path(dp(cx - fr_ * .36, fy + fr_ * .04, fr_ * .115) + dp(cx + fr_ * .36, fy + fr_ * .04, fr_ * .115), INK)
    if smile:
        o += line(f'M{n(cx - fr_ * .26)} {n(fy + fr_ * .4)}q{n(fr_ * .26)} {n(fr_ * .22)} {n(fr_ * .52)} 0', INK, max(3, fr_ * .1))
    return o


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
    + skyline(GROUND, RED_D, k=.62, shift=2, op=.55) + ground(RED_D)
    + line('M36 332h64M150 356h84M352 346h60M470 362h70M488 330h56', RED, 4, .7)
    # the thermometer, nearly at the top
    + rect(70, 58, 36, 164, PAPER, 18) + circ(88, 228, 30, PAPER) + rect(96, 70, 6, 132, KRAFT, 3, .7)
    + rect(82, 92, 12, 126, INK, 6) + circ(88, 228, 20, INK) + circ(81, 221, 5, PAPER, .8)
    + path('M116 84h18v6h-18ZM116 114h18v6h-18ZM116 144h18v6h-18ZM116 174h18v6h-18Z', PAPER)
    # heat rising
    + line('M176 196q16-17 0-34t0-34M222 176q16-17 0-34t0-34', PAPER, 7)
    # the slice everyone wants, and what it now costs
    + melon(244, 338, 190)
    + line('M378 286Q354 262 338 232', PAPER, 3) + tag(364, 264, 100, 44, 'up2', RED_D)
)
ART['heatwaveB'] = (
    back(RED) + circ(422, 140, 148, ORANGE)
    + sun(422, 140, 108, face=True) + circ(390, 152, 8, RED_L, .7) + circ(454, 152, 8, RED_L, .7)
    + skyline(GROUND, RED_D, k=.62, shift=2) + ground(ORANGE)
    + line('M36 332h64M150 356h84M352 346h60M470 362h70M488 330h56', YEL, 4, .7)
    + rect(70, 58, 36, 164, PAPER, 18) + circ(88, 228, 30, PAPER) + rect(96, 70, 6, 132, KRAFT, 3, .7)
    + rect(82, 92, 12, 126, INK, 6) + circ(88, 228, 20, INK) + circ(81, 221, 5, PAPER, .8)
    + path('M116 84h18v6h-18ZM116 114h18v6h-18ZM116 144h18v6h-18ZM116 174h18v6h-18Z', PAPER)
    + line('M176 196q16-17 0-34t0-34M222 176q16-17 0-34t0-34', PAPER, 7)
    + melon(244, 338, 190)
    + line('M378 286Q354 262 338 232', PAPER, 3) + tag(364, 264, 100, 44, 'up2', RED_D)
)

# ---------- Festival: a crowd under the bunting, fireworks, everyone pays more ----------
ART['festival'] = (
    back(RED) + circ(300, 214, 168, RED_D)
    + rays(92, 132, 12, 30, 10, YEL, 5) + circ(92, 132, 5, YEL) + rays(510, 126, 10, 26, 10, PAPER, 5, 18) + circ(510, 126, 4, PAPER)
    + dots([(40, 96), (170, 150), (236, 112), (372, 118), (438, 158), (566, 92), (300, 170)], 4, YEL)
    + dots([(130, 96), (204, 136), (402, 100), (470, 96), (560, 150), (30, 160)], 3.5, PAPER)
    + bunting(-14, 34, 614, 34, 76, [YEL, GRN, BLU, PAPER, YEL, '', GRN, BLU, PAPER, YEL, GRN], 34)
    + hangtag(300, 78, 54, 76, 'up', RED_D, string=PAPER, from_y=71)
    # the back row
    + bust(121, 192, 27, 'tan', GRN, H, 'short') + bust(240, 192, 27, 'deep', PAPER, H, 'bald')
    + bust(359, 192, 27, 'light', BLU, H, 'long') + bust(478, 192, 27, 'brown', YEL, H, 'cap', INK)
    # the front row
    + bust(62, 256, 35, 'light', INK, H, 'side') + bust(181, 256, 35, 'tan', PAPER, H, 'tudung', YEL)
    + bust(300, 256, 35, 'deep', YEL, H, 'short') + bust(419, 256, 35, 'light', INK, H, 'bun')
    + bust(538, 256, 35, 'brown', PAPER, H, 'short', SLATE)
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
    + circ(190, 172, 138, PAPER, .3) + fade(.5, burst(190, 172, 152, PAPER))
    + rect(0, GROUND, W, 80, RED_D, op=.3) + rect(0, GROUND, W, 5, PAPER, op=.35)
    + rect(180, 272, 20, 26, PALE) + rect(136, 292, 108, 12, PAPER, 6) + ell(190, 272, 104, 11, PAPER)
    + mango(190, 270, 150)
    + sparkle(86, 110, 12) + sparkle(296, 216, 8)
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
    + rect(290, 246, 262, 16, YEL, 8) + rect(302, 256, 238, 6, YEL_D, 3)
    + melon(428, 250, 112) + apple(336, 248, 84) + berry(512, 249, 68)
    + sparkle(388, 118, 11) + sparkle(520, 142, 8)
)

# ---------- Apple Blight: no apples today, so apples are dear ----------
ART['blight'] = (
    back(KRAFT) + circ(300, 182, 152, PALE)
    + path(f'M0 270C100 244 200 250 300 264C400 278 500 246 600 258V{GROUND}H0Z', STONE, .45)
    + ground(STONE, edge=SLATE, edge_op=.35)
    # a bare apple tree
    + path('M104 304C110 262 111 228 109 192L129 192C127 228 130 262 136 304Z', SLATE)
    + line('M118 198C112 162 92 144 68 126M120 192C124 152 142 126 168 106M112 170C104 152 100 130 104 102M128 164C146 152 166 148 186 152', SLATE, 8)
    + leaf(60, 122, .8, -30, STONE) + leaf(168, 104, .8, -50, STONE) + leaf(186, 152, .8, 20, LEAF)
    + leaf(150, 214, .8, 60, STONE) + leaf(62, 296, .8, 10, LEAF) + leaf(176, 300, .8, -8, STONE)
    # the apple that is not coming
    + apple(300, 262, 148) + line('M228 256L372 108', RED, 18) + ring(300, 182, 104, RED, 18)
    # an empty crate, a caterpillar, and the price
    + crate(432, 240, 112, 64, STONE, SLATE) + rect(442, 232, 92, 10, SLATE)
    + dots([(462, 226), (474, 222), (486, 226), (498, 222)], 7.5, LEAF) + circ(510, 224, 8.5, GRN) + circ(513, 222, 2.2, INK)
    + line('M468 186Q446 204 448 240', PAPER, 3) + tag(450, 160, 96, 44, 'up2', KRAFT)
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
    + rot(-24, 442, 180, berry(442, 206, 50)) + line('M424 150q16-12 30-6M470 196q10 10 8 24', PAPER, 4, .8)
    + rot(20, 118, 296, berry(118, 320, 50)) + berry(74, 306, 38) + rot(-30, 482, 296, berry(482, 320, 50)) + rot(40, 532, 292, berry(532, 310, 38))
)

# ---------- Good Harvest: the lorry is piled high, so fruit is cheap ----------
HILLS = 'M0 240C90 204 190 216 290 238C390 260 500 216 600 234V304H0Z'
ART['goodHarvest'] = (
    back(GRN) + circ(110, 104, 90, GRN_L) + sun(110, 104, 60)
    + path(HILLS, GRN_D) + line('M20 262q60-22 130-12M330 268q90-8 150-30M500 268q50-10 90-14', GRN, 4, .7)
    + rect(520, 196, 8, 30, GRN) + circ(524, 186, 22, LEAF) + rect(568, 204, 7, 26, GRN) + circ(571, 196, 17, LEAF)
    + ground(LEAF, edge=GRN_L, edge_op=.6)
    # the load
    + melon(232, 102, 54) + apple(276, 98, 42) + mango(318, 98, 38)
    + apple(196, 134, 44) + mango(240, 134, 40) + berry(284, 134, 42) + melon(322, 136, 50)
    + lorry(170, 306, .9)
    # a full crate and the price
    + apple(478, 262, 38) + berry(512, 262, 34) + crate(452, 258, 86, 46, KRAFT, STONE)
    + line('M470 216Q452 232 458 258', PAPER, 3) + tag(456, 192, 84, 40, 'down', GRN_D)
)

# ---------- Bad Harvest: half a load, so fruit is dear ----------
ART['badHarvest'] = (
    back(KRAFT) + circ(110, 104, 90, PALE) + cloud(104, 100, .9, STONE) + cloud(158, 138, .5, PAPER)
    + circ(316, 190, 128, STONE, .55)
    + path(HILLS, STONE, .6) + ground(STONE, edge=SLATE, edge_op=.35)
    + line('M40 346l22 10 16-8M312 352l20-10 22 8M540 344l-20 12', SLATE, 3, .5)
    # what is left of the crop
    + line('M70 304C70 280 66 262 54 250M100 304C100 276 104 258 118 246M134 304C134 286 130 276 122 270', SLATE, 6)
    + leaf(54, 250, .7, 150, STONE) + leaf(118, 246, .7, 20, STONE) + leaf(122, 270, .6, 160, LEAF)
    + dots([(92, 240), (102, 235), (112, 238)], 6, LEAF) + circ(121, 240, 7, GRN) + circ(124, 238, 2, INK)
    # one lonely apple on the lorry
    + apple(262, 134, 50)
    + lorry(170, 306, .9)
    # empty crates and the price
    + rot(-14, 500, 250, crate(462, 214, 76, 40, PAPER, STONE)) + crate(452, 258, 86, 46, PAPER, STONE)
    + line('M470 176Q452 192 462 216', PAPER, 3) + tag(456, 152, 84, 40, 'up', KRAFT)
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
    + apple(116, 248, 48) + mango(158, 248, 42) + melon(200, 250, 54) + berry(240, 248, 40)
    + crate(84, 244, 180, 60, KRAFT, STONE)
    # up it goes
    + coins(330, 304, 2) + coins(380, 304, 4) + coins(430, 304, 6) + coins(480, 304, 3)
    + arrow(430, 150, 132, 180, True, YEL) + path('M430 60L496 141.8H456.4V240H430Z', YEL_D)
    + sparkle(520, 84, 11) + sparkle(338, 100, 8)
)

# ---------- Price Controls: the notice board shows the most each fruit may cost ----------
def _limit(cx, coins_):
    pts = [(cx - 34 + 17 * (i % 5), 198 + 19 * (i // 5)) for i in range(coins_)]
    return rect(cx - 42, 176, 84, 8, RED, 4) + dots(pts, 7.5, YEL_D) + dots(pts, 5, YEL)


ART['priceControls'] = (
    back(BLU) + circ(300, 166, 152, BLU_L) + skyline(GROUND, BLU_D, k=.8, shift=5) + ground(BLU_D)
    + rect(126, 258, 16, 50, KRAFT) + rect(458, 258, 16, 50, KRAFT) + rect(136, 268, 6, 40, STONE) + rect(468, 268, 6, 40, STONE)
    + rect(74, 60, 452, 208, PAPER, 8) + rect(74, 252, 452, 16, PALE)
    + path('M74 98V68a8 8 0 0 1 8-8H518a8 8 0 0 1 8 8V98Z', RED) + line('M98 79h130M246 79h64', PAPER, 7)
    + line('M187 112V246M300 112V246M413 112V246', KRAFT, 3)
    + berry(130.5, 164, 50) + melon(243.5, 163, 68) + apple(356.5, 164, 50) + mango(469.5, 164, 44)
    + _limit(130.5, 5) + _limit(243.5, 7) + _limit(356.5, 6) + _limit(469.5, 10)
    # the official seal
    + path('M468 92l-8 40 14-10 10 12 6-40ZM500 92l8 40-14-10-10 12-6-40Z', BLU_D)
    + burst(484, 82, 30) + circ(484, 82, 15, YEL_D) + circ(484, 82, 9, PAPER)
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
    + apple(205, 252, 124)
    + line('M286 120q10-12 22-6M110 112q-10-10-22-4', INK, 3, .5)
    + ell(280, 124, 6, 4.5, INK) + ell(276, 118, 5, 3, PAPER, .9) + ell(104, 116, 6, 4.5, INK) + ell(108, 110, 5, 3, PAPER, .9)
    # the inspector
    + path('M384 384V264a56 56 0 0 1 56-56h24a56 56 0 0 1 56 56V384Z', BLU_D)
    + path('M398 246L336 292L354 318L424 280Z', BLU_D)
    + rect(438, 186, 28, 30, _SH) + path('M428 208l24 30 24-30Z', PAPER) + path('M446 234h12l5 44-11 12-11-12Z', RED)
    + circ(452, 150, 48, _SK)
    + path('M398 126C398 86 420 72 452 72C484 72 506 86 506 126Z', BLU_D) + path('M398 112h108v16l10 14H388l10-14Z', INK) + circ(452, 94, 9, YEL)
    + circ(435, 158, 5.5, INK) + circ(469, 158, 5.5, INK) + line('M438 178h28', INK, 5)
    # the magnifying glass
    + circ(205, 182, 86, PAPER, .28) + rot(44, 268, 246, rect(268, 235, 92, 22, INK, 11)) + ring(205, 182, 92, INK, 16)
    + line('M150 152a64 64 0 0 1 36-32', PAPER, 7, .85) + circ(342, 314, 16, _SK)
    # the clipboard: two ticks, one cross, and what it costs
    + rot(5, 500, 296,
          rect(456, 236, 92, 122, KRAFT, 6) + rect(464, 250, 76, 100, PAPER, 3) + rect(484, 228, 36, 16, SLATE, 5)
          + line('M474 268l5 6 9-12M474 290l5 6 9-12', GRN, 4.5) + line('M475 307l12 12M487 307l-12 12', RED, 4.5)
          + line('M498 268h32M498 290h32M498 313h20', INK, 5) + coin(482, 337, 8) + coin(502, 337, 8))
    + circ(458, 322, 15, _SK)
)

# ---------- Lorry Breakdown: no delivery today ----------
ART['strike'] = (
    back(KRAFT) + circ(246, 176, 140, STONE, .6) + skyline(GROUND, STONE, k=.6, shift=8, op=.7)
    + ground(STONE, edge=SLATE, edge_op=.35) + path('M30 344h70v8h-70ZM180 344h70v8h-70ZM330 344h70v8h-70ZM480 344h70v8h-70Z', PALE)
    # smoke from the engine
    + circ(388, 196, 15, SLATE, .5) + circ(404, 156, 24, SLATE, .42) + circ(390, 106, 33, SLATE, .34)
    + lorry(108, 304, .92, a=2.2) + ell(328, 306, 31, 9, INK)
    # the warning triangle and a cone
    + line('M440 304h64', SLATE, 7) + path('M472 190L536 300H408Z', RED) + path('M472 228L504 282H440Z', PAPER)
    + path('M60 304l11-46h10l11 46Z', ORANGE) + path('M66 280h20l3 12h-26Z', PAPER) + rect(52, 300, 48, 8, ORANGE, 4)
    # a spanner and a wheel nut on the road
    + rot(-16, 300, 334, line('M270 334h60', SLATE, 9) + circ(334, 334, 11, SLATE) + rect(334, 329, 14, 10, STONE))
    + circ(388, 330, 7, SLATE) + circ(388, 330, 3, STONE)
)

if __name__ == '__main__':
    names = []
    for key, body in ART.items():
        save('event-' + key, svg(W, H, body))
        names.append('event-' + key)
    sheet(names, 'sheet-events.png', cols=4, w=300, ratio=1.5625)
    print(len(names), 'event pictures written')
