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
    + skyline(GROUND, RED_D, k=.62, shift=2) + ground(RED_D)
    + line('M36 332h64M150 356h84M352 346h60M470 362h70M488 330h56', RED, 4, .7)
    # the thermometer, nearly at the top
    + rect(76, 58, 36, 164, PAPER, 18) + circ(94, 228, 30, PAPER) + rect(102, 70, 6, 132, KRAFT, 3, .7)
    + rect(88, 92, 12, 126, INK, 6) + circ(94, 228, 20, INK) + circ(87, 221, 5, PAPER, .8)
    + path('M122 84h18v6h-18ZM122 114h18v6h-18ZM122 144h18v6h-18ZM122 174h18v6h-18Z', PAPER)
    # heat rising
    + line('M178 196q16-17 0-34t0-34M224 176q16-17 0-34t0-34', PAPER, 7)
    # the slice everyone wants, and what it now costs
    + melon(240, 338, 190)
    + line('M374 286Q350 262 334 232', PAPER, 3) + tag(360, 264, 100, 44, 'up2', RED_D)
)

# ---------- Festival: a crowd under the bunting, fireworks, everyone pays more ----------
ART['festival'] = (
    back(RED) + circ(300, 214, 168, RED_D)
    + rays(92, 132, 12, 30, 10, YEL, 5) + circ(92, 132, 5, YEL) + rays(510, 126, 10, 26, 10, PAPER, 5, 18) + circ(510, 126, 4, PAPER)
    + dots([(40, 96), (170, 150), (236, 112), (372, 118), (438, 158), (566, 92), (300, 170)], 4, YEL)
    + dots([(130, 96), (204, 136), (402, 100), (470, 96), (560, 150), (30, 160)], 3.5, PAPER)
    + bunting(-14, 22, 614, 22, 84, [YEL, GRN, BLU, PAPER, YEL, '', GRN, BLU, PAPER, YEL, GRN], 34)
    + hangtag(300, 70, 54, 78, 'up', RED_D, string=PAPER, from_y=63)
    # the back row
    + bust(121, 190, 27, 'tan', GRN, 340, 'short') + bust(240, 190, 27, 'deep', PAPER, 340, 'bald')
    + bust(359, 190, 27, 'light', BLU, 340, 'long') + bust(478, 190, 27, 'brown', YEL, 340, 'cap', INK)
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
    + berry(424, 322, 44) + berry(470, 322, 44)
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
    + star(316, 226, 13) + heart(352, 232, 8, PAPER) + star(540, 92, 11) + heart(548, 150, 7, PAPER)
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
    + circ(300, 172, 152, BLU_L)
    + rect(0, 318, W, 66, BLU_D)
    # a wall lamp and the key rack
    + rect(84, 40, 8, 26, KRAFT) + path('M62 66h52l12 36H50Z', YEL) + circ(88, 102, 38, YEL_L, .3)
    + rect(440, 44, 104, 10, KRAFT, 5)
    + line('M462 54v22M492 54v22M522 54v22', PAPER, 3)
    + rect(453, 74, 18, 28, RED, 5) + rect(483, 74, 18, 28, YEL, 5) + rect(513, 74, 18, 28, PAPER, 5)
    # the table
    + rect(60, 262, 480, 18, PAPER) + rect(70, 280, 460, 104, PALE) + line('M150 296v88M300 296v88M450 296v88', KRAFT, 4)
    # the cloche
    + rect(90, 246, 232, 16, YEL, 8) + rect(102, 256, 208, 6, YEL_D, 3)
    + path('M110 246A96 94 0 0 1 302 246Z', PAPER) + path('M302 246A96 94 0 0 0 256 166A130 130 0 0 1 262 246Z', KRAFT)
    + line('M138 218a72 68 0 0 1 40-50', BLU_L, 7, .8)
    + rect(199, 146, 14, 10, KRAFT) + circ(206, 140, 14, PAPER)
    # the order
    + rect(336, 246, 200, 16, YEL, 8) + rect(348, 256, 176, 6, YEL_D, 3)
    + melon(448, 250, 88) + apple(376, 248, 66) + berry(512, 249, 50)
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
    + line('M474 200Q486 216 480 240', PAPER, 3) + tag(452, 160, 96, 44, 'up2', KRAFT)
)

if __name__ == '__main__':
    names = []
    for key, body in ART.items():
        save('event-' + key, svg(W, H, body))
        names.append('event-' + key)
    sheet(names, 'sheet-events.png', cols=4, w=300, ratio=1.5625)
    print(len(names), 'event pictures written')
