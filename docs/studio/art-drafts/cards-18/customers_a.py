"""Customer pictures 1 to 12 in the flat Market Ticket style: each person at their place of work or daily life.

John (Cowboy Jack), Robert (Bobby Books), Daniel (Dr Bubbles), Rara Jenab, Aisyah (Zara Zapp), Ravi (Ravi Rocket),
Mei Ling (Coral Mei), Farid (Postman Pip), Siti (Madam Siti), Kumar (Magic Kumar), Grace (Rockstar Grace),
Hafiz (Professor Pebble). Likeness (hat, hair, glasses, skin, clothes) follows public/art-ticket/customers/<slug>.webp.

Layers, back to front, as in example_customer.py: wall or sky with a quiet pattern and the pale disc behind the head;
two to four objects of the place; a soft floor or counter; the person; one thing in front that belongs to them.
Everyone is built from the same bust pieces below, so the set shares one construction.

Run from the repo root: python3 docs/studio/art-drafts/cards-18/customers_a.py
"""
import math

from kit import *

# ---------- small shape helpers (plain SVG only) ----------


def _a(op=None, tf=None):
    return (f' opacity="{op}"' if op is not None else '') + (f' transform="{tf}"' if tf else '')


def box(x, y, w, h, fill, rx=0, op=None, tf=None):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}"' + (f' rx="{rx}"' if rx else '') + f' fill="{fill}"{_a(op, tf)}/>'


def dot(cx, cy, r, fill, op=None):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"{_a(op)}/>'


def oval(cx, cy, rx, ry, fill, op=None, tf=None):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{fill}"{_a(op, tf)}/>'


def shape(d, fill, op=None, tf=None):
    return f'<path d="{d}" fill="{fill}"{_a(op, tf)}/>'


def line(d, colour, w, op=None, cap='round', tf=None):
    """A thin detail: a round-capped stroke."""
    return f'<path d="{d}" fill="none" stroke="{colour}" stroke-width="{w}" stroke-linecap="{cap}" stroke-linejoin="round"{_a(op, tf)}/>'


def ring(cx, cy, r, colour, w, op=None):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{colour}" stroke-width="{w}"{_a(op)}/>'


def group(body, tf):
    return f'<g transform="{tf}">{body}</g>'


def star(cx, cy, r_out, r_in, n, fill, rot=-90, op=None):
    pts = []
    for i in range(2 * n):
        r = r_out if i % 2 == 0 else r_in
        a = math.radians(rot + i * 180 / n)
        pts.append(f'{cx + r * math.cos(a):.1f} {cy + r * math.sin(a):.1f}')
    return shape('M' + 'L'.join(pts) + 'Z', fill, op)


def twinkle(x, y, r, fill, op=None):
    """A four-point sparkle."""
    return shape(f'M{x} {y - r}Q{x} {y} {x + r} {y}Q{x} {y} {x} {y + r}Q{x} {y} {x - r} {y}Q{x} {y} {x} {y - r}Z', fill, op)


def hlines(ys, colour, w=3, op=None, x0=0, x1=600):
    return line(''.join(f'M{x0} {y}H{x1}' for y in ys), colour, w, op, cap='butt')


def vlines(xs, colour, w=3, op=None, y0=0, y1=400):
    return line(''.join(f'M{x} {y0}V{y1}' for x in xs), colour, w, op, cap='butt')


def qpoint(p0, p1, p2, t):
    """A point on a quadratic curve (for bulbs along a sagging wire)."""
    return tuple(round((1 - t) ** 2 * a + 2 * (1 - t) * t * b + t * t * c, 1) for a, b, c in zip(p0, p1, p2))


# ---------- the scene base ----------


def wall(colour, tint=None):
    """The back wall or sky: a kit colour, or a light tint of it over paper."""
    if tint is None:
        return box(0, 0, 600, 400, colour)
    return box(0, 0, 600, 400, PAPER) + box(0, 0, 600, 400, colour, op=tint)


def disc(fill=PALE):
    return dot(300, 196, 172, fill)


def ground(y, fill, edge=SLATE, edge_op=.45):
    """A soft floor with a skirting line, never a dark bar."""
    return box(0, y, 600, 400 - y, fill) + box(0, y, 600, 6, edge, op=edge_op)


# ---------- the bust: one construction for everyone ----------

TORSO = 'M126 400v-66c0-36 30-60 66-60h216c36 0 66 24 66 60v66z'
TASH = 'M300 220c-10-12-36-12-48 0 4 15 32 19 48 6 16 13 44 9 48-6-12-12-38-12-48 0z'
HIJAB = 'M300 76c-64 0-104 48-104 112v56c0 46-14 86-34 120h276c-20-34-34-74-34-120v-56c0-64-40-112-104-112z'


def torso(fill):
    return shape(TORSO, fill)


def neck(tone):
    return box(274, 250, 52, 36, SKINS[tone][1])


def head(tone, r=82, cy=196):
    return dot(300, cy, r, SKINS[tone][0]) + dot(238, 216, 13, RED_L, .45) + dot(362, 216, 13, RED_L, .45)


def eyes(y=190, dx=30):
    return (dot(300 - dx, y, 9, INK) + dot(300 + dx, y, 9, INK)
            + dot(303 - dx, y - 3, 3, PAPER) + dot(303 + dx, y - 3, 3, PAPER))


def eyes_shut(y=194, dx=30):
    return line(f'M{300 - dx - 14} {y}q14-16 28 0M{300 + dx - 14} {y}q14-16 28 0', INK, 7)


def smile(y=224):
    return line(f'M281 {y}q19 15 38 0', INK, 7)


def grin(y=215):
    return shape(f'M273 {y}q27 8 54 0q-4 24-27 24t-27-24z', PAPER)


def specs(y=190, dx=30, r=22):
    return ring(300 - dx, y, r, INK, 6) + ring(300 + dx, y, r, INK, 6) + line(f'M{300 - dx + r} {y}h{2 * (dx - r)}', INK, 6)


def tash(fill=INK, dy=0):
    return shape(TASH, fill, tf=f'translate(0 {dy})' if dy else None)


def labcoat(pens=None):
    """White coat, grey lapels, black tie; pens in the chest pocket if given."""
    s = torso(PAPER) + shape('M228 274h144l-30 72h-84z', KRAFT) + shape('M286 286h28l27 62-41 48-41-48z', INK)
    if pens:
        s += line('M178 356h38', STONE, 5) + line('M188 354v-16', pens[0], 6) + line('M204 354v-13', pens[1], 6)
    return s


def hijab(colour, fold, fold_op, light, light_op, tone):
    """Headscarf with the face as an oval; returns scarf, folds and bare face (no features)."""
    return (shape(HIJAB, colour)
            + line('M236 298c24 22 104 22 128 0M210 338c44 28 136 28 180 0', fold, 6, fold_op)
            + line('M224 152c8-30 28-50 56-58', light, 8, light_op)
            + oval(300, 202, 66, 74, SKINS[tone][0])
            + dot(250, 226, 12, RED_L, .5) + dot(350, 226, 12, RED_L, .5))


# ---------- props used more than once ----------


def nugget(x, y, s=1.0):
    return group(shape('M-11 2L-6-9 5-11 11-2 7 8-5 9z', YEL) + shape('M-6-9L5-11 1-3-5 0z', YEL_L)
                 + shape('M11-2L7 8-5 9 1 2z', YEL_D), f'translate({x} {y}) scale({s})')


def books(x, base, specs_, gap=3):
    """Upright books on a shelf: (width, height, colour, band colour or None)."""
    out = ''
    for w, h, c, band in specs_:
        out += box(x, base - h, w, h, c)
        if band:
            out += box(x, base - h + 10, w, 6, band)
        x += w + gap
    return out


def flat_book(x, y, w, h, c, band):
    """A book lying down: cover, the page block at the right end, a band by the spine."""
    return box(x, y, w, h, c) + box(x + w - 14, y + 4, 14, h - 8, PAPER) + box(x + 12, y, 8, h, band)


def bulbs(p0, p1, p2, ts, r=8, colours=(YEL,)):
    out = ''
    for i, t in enumerate(ts):
        x, y = qpoint(p0, p1, p2, t)
        out += dot(x, y + 9, r + 6, YEL_L, .5) + dot(x, y + 9, r, colours[i % len(colours)])
    return out


def fist(x, y, tone, r=19):
    skin, shade = SKINS[tone]
    return dot(x, y, r, skin) + line(f'M{x - 8} {y + 4}h16M{x - 6} {y + 11}h12', shade, 4)


def tree(x, y, r=18, trunk=22):
    return line(f'M{x} {y}v-{trunk}', INK, 6) + dot(x, y - trunk - r + 6, r, GRN_D) + dot(x - r * .3, y - trunk - r, r * .42, GRN)


# ---------- 1. John: Cowboy Jack pans for gold up the river ----------


def john():
    t = 'tan'
    scene = (
        wall(YEL_L)
        + line('M34 44h78M62 64h42M454 36h94M488 56h50M170 22h46M388 20h38', PAPER, 8, .7)
        + disc()
        # the sun coming up behind the hills
        + burst(96, 156, 62, ORANGE) + dot(96, 156, 32, YEL)
        + shape('M0 262V198C36 152 104 140 150 180C178 204 192 238 216 262Z', GRN_L)
        + shape('M600 262V176C566 138 504 134 462 174C434 200 414 238 384 262Z', GRN_L)
        + shape('M0 262v-36c34-24 76-22 104 4 12 12 20 22 30 32z', GRN)
        + shape('M600 262v-46c-30-22-74-18-100 8-12 12-22 26-34 38z', GRN)
        + tree(528, 176, 17) + tree(562, 166, 21, 26) + tree(592, 190, 15)
        # the river
        + box(0, 262, 600, 68, BLU_L)
        + line('M24 282h56M96 300h36M20 314h30M508 280h64M474 300h40M548 314h36', BLU, 5, .55)
        + line('M58 292h22M522 292h18', PAPER, 4, .85)
        # the near bank and his pickaxe
        + ground(328, KRAFT, STONE, 1)
        + dot(40, 352, 7, STONE) + dot(566, 372, 9, STONE) + dot(24, 384, 5, STONE)
        + line('M580 338L530 214', INK, 9) + line('M495 228Q520 192 565 200', STONE, 10)
    )
    person = (
        torso(INK) + box(296, 340, 8, 60, SLATE)
        + shape('M238 274h124l-62 76z', RED) + shape('M300 274h62l-62 76z', RED_D)
        + neck(t) + head(t)
        + shape('M212 142C205 94 224 58 258 58c16 0 26 8 42 8s26-8 42-8c34 0 53 36 46 84z', INK)
        + box(212, 112, 176, 20, PAPER)
        + shape('M118 148Q300 110 482 148Q300 180 118 148Z', INK)
        + line('M232 100c2-18 12-28 26-30', SLATE, 7)
        + eyes() + tash()
    )
    front = (
        # a camp fire on the bank
        shape('M118 280c22 26 36 46 36 62a36 30 0 01-72 0c0-16 14-36 36-62z', ORANGE)
        + shape('M118 316c13 15 19 24 19 32a19 16 0 01-38 0c0-8 6-17 19-32z', YEL)
        + line('M76 374l84-22M76 352l84 22', INK, 10)
        + dot(94, 284, 4, ORANGE) + dot(144, 272, 3, ORANGE)
        # the gold pan on a rock
        + shape('M366 400c2-36 34-56 78-56s84 18 92 56z', STONE) + shape('M444 344c44 0 84 18 92 56h-40c-6-26-24-46-52-56z', SLATE, .3)
        + group(oval(0, 0, 70, 22, SLATE) + oval(0, -2, 58, 14, BLU_L) + line('M-44-2h20', PAPER, 4, .8)
                + nugget(-8, -3, .9) + nugget(16, -1, 1.1) + nugget(36, -5, .7), 'translate(444 322) rotate(-7)')
        + twinkle(492, 284, 15, PAPER) + twinkle(398, 292, 9, PAPER)
    )
    return svg(600, 400, scene + person + front)


# ---------- 2. Robert: Bobby Books runs the town library ----------


def robert():
    t = 'light'
    scene = (
        wall(LEAF, .36) + vlines(range(20, 600, 40), PAPER, 3, .5) + disc()
        # the tall shelf
        + box(14, 22, 174, 304, INK)
        + books(26, 116, [(22, 70, RED, RED_D), (18, 60, PAPER, KRAFT), (26, 76, BLU, BLU_L), (16, 56, YEL, YEL_D),
                          (24, 72, GRN, GRN_L), (20, 62, ORANGE, None)])
        + books(26, 212, [(20, 64, BLU_L, BLU), (26, 76, RED, RED_L), (16, 58, PAPER, KRAFT), (22, 70, YEL, None)])
        + flat_book(122, 196, 54, 16, GRN, GRN_L) + flat_book(126, 182, 46, 14, RED_L, RED)
        + books(26, 316, [(24, 80, GRN_D, GRN_L), (18, 66, PAPER, KRAFT), (22, 74, RED_D, RED_L), (26, 82, BLU_D, BLU_L),
                          (18, 60, YEL, YEL_D), (22, 72, PINK, None)])
        + box(14, 116, 174, 8, INK) + box(14, 212, 174, 8, INK)
        # a clock, and a low shelf with a globe
        + dot(506, 92, 42, INK) + dot(506, 92, 33, PAPER)
        + line('M506 66v5M506 113v5M480 92h5M527 92h5', SLATE, 4) + line('M506 92V74M506 92l15 9', INK, 5) + dot(506, 92, 5, RED)
        + box(424, 214, 164, 112, INK)
        + books(434, 266, [(18, 38, RED, None), (14, 32, PAPER, KRAFT), (20, 40, GRN, None), (16, 34, YEL, None),
                           (18, 38, BLU_L, None), (14, 30, ORANGE, None), (20, 40, RED_L, None)])
        + books(434, 318, [(20, 40, BLU, None), (16, 34, PAPER, KRAFT), (18, 38, YEL_D, None), (22, 40, GRN_L, None),
                           (14, 32, RED, None), (18, 36, PAPER, None), (16, 40, BLU_D, None)])
        + box(456, 204, 44, 10, INK, 4) + box(474, 194, 8, 12, INK)
        + dot(478, 166, 31, BLU) + shape('M460 152c8-9 21-7 23 4 2 9-10 11-12 21-9 0-17-13-11-25z', GRN)
        + shape('M488 172c8-2 15 4 12 13-6 6-15 1-12-13z', GRN) + line('M458 150c5-8 12-12 20-13', PAPER, 5, .5)
        + flat_book(520, 198, 60, 16, RED, RED_L) + flat_book(526, 184, 50, 14, YEL, YEL_D)
        + ground(326, KRAFT, STONE, 1)
    )
    person = (
        dot(300, 98, 38, STONE) + line('M278 84c6-10 16-15 27-15', PALE, 6, .9)
        + torso(INK) + shape('M300 282l38 50h-76z', PAPER) + dot(300, 352, 5, STONE) + dot(300, 378, 5, STONE)
        + neck(t) + head(t)
        + shape('M219 181A82 82 0 01381 181Q300 122 219 181Z', STONE) + line('M236 164Q300 122 364 164', PALE, 6, .8)
        + specs() + eyes() + smile()
    )
    front = (
        # books to shelve, and the one she is reading
        flat_book(46, 372, 122, 28, GRN_D, GRN_L) + flat_book(38, 338, 132, 34, RED, RED_L)
        + flat_book(52, 314, 110, 24, BLU, BLU_L) + flat_book(44, 292, 104, 22, YEL, YEL_D)
        + shape('M370 400V314l80 14 80-14v86z', BLU)
        + shape('M378 400V310l72 13v77z', PAPER) + shape('M522 400V310l-72 13v77z', PAPER)
        + line('M450 326v74', STONE, 4, cap='butt')
        + line('M394 330l42 8M394 348l42 8M394 366l42 8M506 330l-42 8M506 348l-42 8M506 366l-42 8', STONE, 5)
        + shape('M444 316h12v34l-6-6-6 6z', RED)
    )
    return svg(600, 400, scene + person + front)


# ---------- 3. Daniel: Dr Bubbles teaches science at the school ----------


def daniel():
    t = 'deep'
    cells = ''
    for row, cols in enumerate([(0, 6), (0, 1, 5, 6), range(7), range(7)]):
        for c in cols:
            colour = RED_L if c < 2 else YEL_L if c < 5 else GRN_L if c == 5 else BLU_L
            cells += box(443 + 18 * c, 66 + 18 * row, 14, 14, colour)
    hexagon = 'M' + 'L'.join(f'{66 + 24 * math.cos(math.radians(a)):.1f} {96 + 24 * math.sin(math.radians(a)):.1f}' for a in range(-90, 270, 60)) + 'Z'
    scene = (
        wall(SLATE, .2) + hlines((54, 124, 194), PAPER, 3, .7) + vlines(range(40, 600, 70), PAPER, 3, .7, 0, 276) + disc()
        # the chalkboard
        + box(14, 26, 180, 166, INK) + box(24, 36, 160, 136, GRN_D)
        + line(hexagon, PAPER, 4, .9) + dot(66, 96, 9, PAPER, .9)
        + line('M100 96h30M120 86l12 10-12 10', PAPER, 4, .9) + line('M40 140h60M40 156h38', PAPER, 5, .85)
        + ''.join(f'<ellipse cx="146" cy="126" rx="28" ry="10" fill="none" stroke="{YEL}" stroke-width="3" transform="rotate({r} 146 126)"/>' for r in (0, 60, 120))
        + dot(146, 126, 6, YEL)
        + box(24, 172, 160, 10, KRAFT) + box(40, 166, 18, 6, PAPER) + box(64, 166, 14, 6, YEL) + box(138, 162, 32, 10, SLATE)
        # a chart of the elements: coloured squares, no letters
        + box(430, 40, 152, 106, PAPER) + line('M444 54h54', INK, 5) + cells
        # the bench, with a burner
        + box(0, 276, 600, 124, STONE) + box(0, 276, 600, 12, KRAFT) + box(0, 288, 600, 4, SLATE, op=.3)
        + shape('M80 206c13 16 17 27 17 35a17 15 0 01-34 0c0-8 4-19 17-35z', BLU_L) + shape('M80 228c6 8 8 12 8 16a8 7 0 01-16 0c0-4 2-8 8-16z', PAPER)
        + box(72, 244, 16, 24, SLATE) + box(67, 250, 26, 6, INK) + box(50, 264, 60, 12, INK, 4)
        + line('M110 271c22 0 16-11 40-11', ORANGE, 6)
    )
    person = (
        ''.join(dot(x, y, r, INK) for x, y, r in ((204, 180, 32), (214, 138, 32), (250, 106, 36), (300, 94, 38), (350, 106, 36), (386, 138, 32), (396, 180, 32)))
        + labcoat((RED, BLU)) + neck(t) + head(t)
        + line('M228 142H372', INK, 9, cap='butt')
        + dot(266, 142, 29, PAPER) + dot(334, 142, 29, PAPER) + dot(266, 142, 19, YEL) + dot(334, 142, 19, YEL)
        + line('M254 136c3-5 8-8 14-8M322 136c3-5 8-8 14-8', PAPER, 4, .8)
        + dot(270, 194, 16, PAPER) + dot(330, 194, 16, PAPER) + eyes(194) + smile(230)
    )
    front = (
        # his flask of fizzing yellow
        shape('M438 262h28v40l40 52c5 7 1 14-7 14h-94c-8 0-12-7-7-14l40-52z', BLU_L, .55)
        + shape('M417 330h70l19 24c5 7 1 14-7 14h-94c-8 0-12-7-7-14z', YEL) + line('M424 346h18', YEL_L, 5)
        + dot(452, 344, 4, PAPER, .8) + dot(470, 354, 3, PAPER, .8) + dot(476, 340, 3, PAPER, .8)
        + box(430, 254, 44, 9, INK, 4) + fist(452, 286, t, 17)
        + dot(462, 236, 6, BLU_L) + dot(446, 216, 8, BLU_L) + dot(466, 192, 10, BLU_L)
        + dot(460, 234, 2, PAPER) + dot(443, 213, 3, PAPER) + dot(462, 188, 4, PAPER)
    )
    return svg(600, 400, scene + person + front)


# ---------- 4. Rara Jenab: hosting an open house this weekend ----------


def ketupat(x, y, s=17, c=GRN, c2=YEL):
    cy = y + 8 + s
    h = s / 2
    return (line(f'M{x} {y}v8', INK, 3)
            + shape(f'M{x} {cy - s}l{s} {s}-{s} {s}-{s}-{s}z', c)
            + line(f'M{x - h} {cy - h}l{s} {s}M{x + h} {cy - h}l-{s} {s}', c2, 4)
            + line(f'M{x} {cy + s}l-6 12M{x} {cy + s}l6 12', c, 4))


def pompom(x, y):
    return burst(x, y, 58, PAPER) + group(burst(x, y, 36, PALE), f'rotate(15 {x} {y})') + dot(x, y, 9, PAPER)


def rara():
    t = 'tan'
    left, mid, right = (0, 18), (300, 30), (600, 18)
    garland = line('M0 18Q150 66 300 30Q450 66 600 18', INK, 4)
    for i, tt in enumerate((.16, .42, .68)):
        x, y = qpoint(left, (150, 66), mid, tt)
        garland += ketupat(x, y, 16, GRN if i % 2 == 0 else YEL, YEL if i % 2 == 0 else GRN)
        x, y = qpoint(mid, (450, 66), right, 1 - tt)
        garland += ketupat(x, y, 16, GRN if i % 2 == 0 else YEL, YEL if i % 2 == 0 else GRN)
    flowers = ''.join(line(f'M{x} 236v-14', GRN_D, 5) + oval(x + 9, 230, 9, 5, LEAF) + dot(x, 216, 10, RED) + dot(x, 216, 4, YEL)
                      for x in (40, 76, 112, 148))
    scene = (
        wall(GRN_L, .5) + hlines(range(40, 326, 44), PAPER, 3, .55) + disc() + garland
        # the window of the kampung house, with a flower box
        + box(22, 84, 156, 148, INK) + box(32, 94, 136, 128, YEL_L)
        + shape('M32 94h46c0 52-18 92-46 128z', PAPER) + shape('M168 94h-46c0 52 18 92 46 128z', PAPER)
        + line('M100 94v128M32 152h136', INK, 6, cap='butt')
        + flowers + box(16, 232, 168, 24, KRAFT) + box(16, 232, 168, 6, STONE)
        # the open-house table: food under a woven cover, mangoes
        + box(432, 244, 168, 82, YEL) + box(432, 306, 168, 8, YEL_D) + box(424, 236, 176, 12, PAPER)
        + shape('M432 236a50 54 0 01100 0z', RED) + line('M440 216q42 12 84 0M452 196q30 9 60 0', YEL, 6) + dot(482, 180, 7, INK)
        + fr('mango', 534, 184, 56)
        + ground(326, KRAFT, STONE, 1) + vlines((70, 200, 400, 530), STONE, 3, .7, 332, 400)
    )
    person = (
        torso(INK)
        + hijab(PINK, RED, .3, PAPER, .45, t)
        + eyes_shut(196, 26) + grin(220)
    )
    front = pompom(126, 318) + pompom(474, 318)
    return svg(600, 400, scene + person + front)


# ---------- 5. Aisyah: Zara Zapp buys watermelon for the whole lab ----------


def aisyah():
    t = 'tan'
    spikes = ''
    for i, a in enumerate(range(-160, -19, 14)):
        tip = 128 + 12 * math.cos(math.radians(a + 90))
        p = [(300 + r * math.cos(math.radians(b)), 196 + r * math.sin(math.radians(b))) for r, b in ((76, a - 6.5), (tip, a), (76, a + 6.5))]
        spikes += shape('M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in p) + 'Z', INK)
    scene = (
        wall(KRAFT) + hlines((66, 136, 206), PALE, 3) + vlines(range(50, 600, 100), PALE, 3, None, 0, 276) + disc()
        # the spark machine
        + box(74, 150, 32, 112, SLATE) + box(80, 150, 6, 112, PAPER, op=.3) + box(46, 258, 88, 18, INK, 4)
        + dot(90, 112, 46, STONE) + shape('M90 66a46 46 0 010 92 62 62 0 000-92z', SLATE, .35) + line('M62 96c4-10 12-16 22-18', PAPER, 6, .7)
        + line('M140 92l26-14-8 22 28-10', YEL, 7) + line('M136 132l24 6-10 14 22 4', YEL, 6)
        + line('M44 88l-18-10 6 18-18-4', YEL, 6)
        # the control panel
        + box(430, 54, 156, 184, INK, 8)
        + dot(476, 104, 30, PAPER) + line('M476 104l16-18', RED, 5) + dot(476, 104, 5, INK)
        + line('M454 104h5M493 104h5M476 82v5', SLATE, 4)
        + dot(546, 104, 22, PAPER) + line('M546 104l-12-10', RED, 5) + dot(546, 104, 4, INK)
        + dot(456, 158, 9, GRN) + dot(486, 158, 9, YEL) + dot(516, 158, 9, RED) + dot(546, 158, 9, GRN_L)
        + box(446, 184, 124, 38, SLATE, 6)
        + line('M464 212v-18M490 212v-10M516 212v-18M542 212v-10', PAPER, 7)
        # the bench
        + box(0, 276, 600, 124, BLU_L) + box(0, 276, 600, 6, BLU, op=.5)
    )
    person = (
        spikes + labcoat() + neck(t) + head(t)
        + line('M262 132c8-9 20-15 34-16', PAPER, 7, .45)
        + specs() + eyes() + grin()
    )
    front = (
        # a bulb that lights in her hand, and a slice of watermelon for the lab
        ''.join(line(f'M{170 + 40 * math.cos(math.radians(a)):.0f} {310 + 40 * math.sin(math.radians(a)):.0f}'
                     f'l{10 * math.cos(math.radians(a)):.0f} {10 * math.sin(math.radians(a)):.0f}', YEL, 6) for a in (-150, -118, -90, -62, -30))
        + fist(170, 374, t) + box(156, 338, 28, 18, SLATE, 4) + box(160, 354, 20, 10, INK, 3)
        + dot(170, 310, 30, YEL) + line('M154 300c3-8 9-12 16-13', PAPER, 5, .8)
        + fist(446, 374, t) + fr('watermelon', 388, 262, 116)
    )
    return svg(600, 400, scene + person + front)


# ---------- 6. Ravi: Ravi Rocket delivers parcels by motorbike ----------


def shutters(x, y):
    return (box(x, y, 58, 72, PAPER) + box(x + 5, y + 5, 22, 62, GRN) + box(x + 31, y + 5, 22, 62, GRN)
            + line(f'M{x + 9} {y + 20}h14M{x + 9} {y + 36}h14M{x + 9} {y + 52}h14M{x + 35} {y + 20}h14M{x + 35} {y + 36}h14M{x + 35} {y + 52}h14', GRN_D, 4))


def ravi():
    t = 'deep'
    scene = (
        wall(BLU_L, .42)
        + box(30, 20, 96, 16, PAPER, 8, .85) + box(456, 34, 104, 16, PAPER, 8, .85) + box(492, 54, 56, 12, PAPER, 6, .85)
        + disc(YEL_L)
        # a shophouse
        + box(0, 74, 184, 114, RED_L) + box(0, 58, 194, 18, RED_D) + shutters(18, 96) + shutters(104, 96)
        + box(0, 214, 184, 78, PALE) + box(22, 230, 54, 62, BLU_D) + dot(66, 262, 4, YEL)
        + box(94, 230, 74, 44, BLU_L) + line('M104 262l20-22', PAPER, 5, .7) + box(90, 274, 82, 6, STONE)
        + box(0, 186, 192, 26, YEL) + ''.join(box(x, 186, 24, 26, PAPER) for x in (24, 72, 120, 168))
        + ''.join(dot(12 + 24 * i, 212, 12, PAPER if i % 2 else YEL) for i in range(8))
        # the motorbike and its delivery box
        + dot(478, 258, 35, INK) + dot(478, 258, 19, STONE) + dot(478, 258, 7, INK)
        + shape('M448 220h152v30H472z', RED) + shape('M462 238h138v12H472z', RED_D)
        + box(506, 202, 94, 20, INK, 10) + box(428, 264, 78, 10, SLATE, 5) + dot(454, 230, 6, YEL)
        + box(436, 204, 78, 8, INK) + box(430, 132, 88, 74, BLU, 6) + box(430, 148, 88, 10, BLU_D) + box(462, 132, 24, 74, PAPER)
        + box(466, 170, 16, 10, YEL)
        # the road
        + box(0, 292, 600, 108, STONE) + box(0, 292, 600, 8, PALE)
        + line('M16 356h44M522 356h56', PAPER, 7, .9)
    )
    person = (
        dot(300, 194, 104, PAPER) + shape('M300 90a104 104 0 01104 104 104 104 0 01-24 66 122 122 0 00-80-170z', KRAFT, .7)
        + line('M300 92V72', PAPER, 7) + dot(300, 66, 11, BLU) + box(290, 92, 20, 30, BLU)
        + torso(PAPER) + shape('M242 274h116l-58 72z', BLU) + shape('M300 274h58l-58 72z', BLU_D)
        + line('M300 350v50', KRAFT, 5)
        + neck(t) + dot(300, 198, 85, PALE) + head(t, 78, 198)
        + eyes(192) + grin(217)
    )
    front = (
        # parcels ready to go
        box(50, 308, 138, 92, KRAFT) + box(160, 308, 28, 92, STONE) + box(106, 308, 22, 92, PAPER)
        + box(66, 268, 78, 40, GRN_L) + line('M105 268v40M66 288h78', PAPER, 5, cap='butt')
        + box(58, 330, 40, 26, YEL) + line('M66 339h24M66 348h14', INK, 4)
    )
    return svg(600, 400, scene + person + front)


# ---------- 7. Mei Ling: Coral Mei dives for a living ----------


def mei_ling():
    t = 'light'
    scene = (
        wall(PALE) + line('M40 60h80M70 80h40M440 44h100M476 64h50M196 26h44', PAPER, 8) + disc(PAPER)
        # an island and the dive boat on the sea
        + line('M84 214c4-18 2-34-6-48', SLATE, 7)
        + line('M78 166c-14-12-30-12-42-2M78 166c-6-18-20-26-34-26M78 166c8-18 24-24 38-20M78 166c16-6 32 0 40 12M78 166c-2-16 4-30 16-38', GRN_D, 8)
        + box(0, 236, 600, 94, BLU_L)
        + shape('M14 236c16-26 52-34 86-22 20 7 30 14 40 22z', GRN)
        + shape('M418 268l-14-30h170l-18 30z', PAPER) + shape('M410 252h160l-4 8H414z', RED)
        + box(470, 204, 64, 34, PAPER) + box(480, 212, 18, 14, BLU) + box(506, 212, 18, 14, BLU) + box(464, 198, 76, 8, INK)
        + line('M446 238v-56', INK, 6) + dot(446, 178, 6, YEL)
        + line('M28 262h44M112 280h32M20 300h30M150 304h26M388 290h40M520 296h50M462 310h32M560 268h30', PAPER, 5, .85)
        + line('M60 284h30M176 258h24M556 312h30M410 304h22', BLU, 5, .45)
        # the jetty, an air tank and a marker buoy
        + ground(326, KRAFT, STONE, 1) + vlines((64, 190, 420, 546), STONE, 3, .8, 332, 400)
        + box(66, 214, 48, 112, YEL, 22) + box(100, 232, 8, 80, YEL_D, 4) + line('M76 236v60', PAPER, 6, .6)
        + box(66, 252, 48, 8, INK) + box(66, 292, 48, 8, INK)
        + box(82, 198, 16, 18, SLATE) + box(74, 190, 32, 10, INK, 4)
        + dot(152, 264, 14, RED) + box(138, 260, 28, 8, PAPER) + line('M152 250v-8', INK, 4)
    )
    person = (
        shape('M198 204c0-58 44-100 102-100s102 42 102 100v100H198z', INK)
        + torso(PAPER) + box(126, 350, 348, 18, PINK) + box(126, 384, 348, 16, PINK)
        + neck(t) + head(t)
        + shape('M218 190A82 82 0 01382 190Q300 148 218 190Z', INK) + line('M246 146Q300 118 354 146', SLATE, 6)
        + star(366, 128, 38, 19, 8, PINK) + dot(366, 128, 11, PAPER)
        + eyes_shut() + smile(226)
    )
    front = (
        # her dive mask round her neck, a mooring post with rope
        line('M260 312c-8-10 0-22 16-30M340 312c8-10 0-22-16-30', INK, 6)
        + box(254, 298, 92, 44, INK, 16) + box(263, 306, 74, 28, BLU_L, 10) + shape('M290 342q10-16 20 0z', INK)
        + line('M274 318l12-6', PAPER, 5, .9)
        + box(468, 326, 44, 74, SLATE) + box(460, 314, 60, 16, INK, 6) + box(468, 326, 10, 74, PAPER, op=.18)
        + line('M468 350h44M468 362h44', PAPER, 7, cap='butt') + line('M512 356c30 6 40 26 88 30', PAPER, 7)
    )
    return svg(600, 400, scene + person + front)


# ---------- 8. Farid: Postman Pip eats an apple on his round ----------


def farid():
    t = 'light'
    dashes = ''.join(f'M{x} {y}h26' for row, y in enumerate(range(30, 320, 40)) for x in range(-20 + 36 * (row % 2), 600, 72))
    scene = (
        wall(RED_L, .45) + line(dashes, PAPER, 4, .6) + disc()
        # a front door with a letter in the slot
        + box(22, 58, 152, 268, INK) + box(32, 68, 132, 258, GRN)
        + box(44, 82, 48, 80, GRN_D) + box(104, 82, 48, 80, GRN_D) + box(44, 200, 48, 110, GRN_D) + box(104, 200, 48, 110, GRN_D)
        + box(84, 160, 34, 16, PAPER) + box(66, 172, 64, 14, YEL) + line('M74 179h48', INK, 4) + dot(150, 186, 7, YEL)
        # the red post box
        + box(472, 150, 94, 176, RED) + box(550, 150, 16, 176, RED_D) + shape('M466 150c0-34 24-52 54-52s54 18 54 52z', RED)
        + box(462, 142, 116, 14, RED_D, 7) + box(490, 172, 58, 12, INK, 6)
        + box(494, 200, 48, 42, PAPER) + line('M504 213h28M504 227h16', INK, 5)
        + box(466, 304, 106, 22, RED_D) + line('M486 170v122', RED_L, 6, .7) + line('M486 116c6-7 13-10 22-11', RED_L, 6, .7)
        + ground(326, STONE)
    )
    person = (
        torso(BLU) + shape('M248 274h104l-52 44z', BLU_D)
        + shape('M190 280l26-6 250 126h-46z', KRAFT)
        + neck(t) + head(t)
        + shape('M211 166C205 110 246 88 300 88C352 88 394 110 416 144C434 156 444 170 448 186C420 178 390 176 362 176L362 160C312 162 262 164 211 166Z', INK)
        + line('M238 130c8-16 24-28 46-32', SLATE, 7)
        + eyes() + smile()
    )
    front = (
        # the apple for his round, and the mail bag
        fist(170, 350, t) + fr('apple', 124, 262, 86)
        + group(box(-40, -27, 80, 54, PALE), 'translate(486 322) rotate(12)')
        + group(box(-42, -28, 84, 56, PAPER) + line('M-42-28l42 30 42-30', INK, 6), 'translate(444 318) rotate(-8)')
        + shape('M388 340h150v60H388z', KRAFT) + shape('M388 340h150v22c-44 20-106 20-150 0z', STONE)
        + box(454, 362, 18, 16, YEL, 3)
    )
    return svg(600, 400, scene + person + front)


# ---------- 9. Siti: Madam Siti runs the tailor shop by the market ----------


def bolt(x, y, w, c, end):
    """A roll of cloth lying on a shelf."""
    return box(x, y, w, 24, c, 12) + dot(x + w - 12, y + 12, 12, end) + dot(x + w - 12, y + 12, 4, PAPER)


def spool(x, y, c):
    return box(x, y, 28, 6, KRAFT) + box(x + 4, y + 6, 20, 22, c) + box(x, y + 28, 28, 6, KRAFT) + line(f'M{x + 8} {y + 12}h12M{x + 8} {y + 20}h12', PAPER, 3, .5)


def siti():
    t = 'tan'
    dots = ''.join(dot(x, y, 4, PAPER, .6) for row, y in enumerate(range(24, 320, 36)) for x in range(18 + 24 * (row % 2), 600, 48))
    ticks = ''.join(line(f'M{x - 6} {y}h12', INK, 3) for x, y in ((231, 300), (229, 322), (227, 344), (226, 366), (225, 388), (369, 300), (371, 322), (373, 344)))
    scene = (
        wall(PINK, .3) + dots + disc()
        # rolls of cloth on the shelf
        + box(14, 34, 170, 196, INK)
        + bolt(24, 44, 150, BLU, BLU_L) + bolt(24, 70, 136, YEL, YEL_D)
        + bolt(24, 108, 144, RED, RED_L) + bolt(24, 134, 150, GRN_L, GRN)
        + bolt(24, 172, 138, ORANGE, YEL_L) + bolt(24, 198, 150, BLU_L, BLU)
        + box(14, 96, 170, 8, INK) + box(14, 160, 170, 8, INK)
        # reels of thread and the dress form
        + box(430, 76, 156, 8, INK) + spool(440, 42, RED) + spool(476, 42, BLU) + spool(512, 42, YEL) + spool(548, 42, GRN)
        + line('M500 250v68', INK, 8) + line('M468 326l32-12 32 12', INK, 8)
        + box(488, 106, 24, 16, STONE)
        + shape('M462 122h76c6 10 8 22 4 34l-10 26c16 18 26 44 30 82H438c4-38 14-64 30-82l-10-26c-4-12-2-24 4-34z', YEL)
        + shape('M538 122c6 10 8 22 4 34l-10 26c16 18 26 44 30 82h-34c0-40-10-66-14-84 8-18 16-36 24-58z', YEL_D)
        + line('M468 182h64', PAPER, 7) + dot(476, 140, 4, RED) + dot(492, 152, 4, RED) + line('M452 250l20-12', PAPER, 4, .8)
        + ground(326, KRAFT, STONE, 1)
    )
    person = (
        torso(INK)
        + hijab(GRN, GRN_D, 1, GRN_L, .8, t)
        + specs(196, 27, 20) + eyes(196, 27) + smile(230)
        # her measuring tape
        + line('M244 258C230 296 226 350 224 400', YEL, 10, cap='butt') + line('M356 258c12 30 16 62 18 100', YEL, 10, cap='butt')
        + ticks + box(367, 356, 14, 8, STONE)
    )
    front = (
        # the sewing machine on her table
        box(0, 338, 186, 62, KRAFT) + box(0, 338, 186, 6, PALE)
        + shape('M0 330h84v8l-10 62H0z', BLU_L) + line('M22 346v54M50 346v54', BLU, 4, .5)
        + box(34, 324, 134, 14, STONE, 4)
        + box(42, 248, 124, 30, PAPER, 14) + box(42, 262, 34, 46, PAPER, 8) + box(128, 262, 38, 64, PAPER, 6)
        + box(128, 300, 38, 26, PALE) + line('M59 308v16', INK, 4) + box(50, 304, 18, 6, SLATE)
        + dot(168, 264, 17, INK) + dot(168, 264, 7, STONE)
        + dot(104, 263, 7, RED) + line('M56 262h26', KRAFT, 5)
        + box(92, 228, 18, 20, RED) + box(88, 244, 26, 5, KRAFT) + line('M101 228v-8', INK, 4)
    )
    return svg(600, 400, scene + person + front)


# ---------- 10. Kumar: Magic Kumar does magic shows at the pasar malam ----------


def card(rot, pip):
    return group(box(-27, -118, 54, 78, PAPER, 7) + pip, f'translate(150 404) rotate({rot})')


def kumar():
    t = 'deep'
    p0, p1, p2, p3, p4 = (0, 30), (150, 86), (300, 60), (450, 86), (600, 30)
    lights = (line('M0 30Q150 86 300 60Q450 86 600 30', INK, 4)
              + bulbs(p0, p1, p2, (.12, .32, .52, .72), 8, (YEL, PAPER)) + bulbs(p2, p3, p4, (.28, .48, .68, .88), 8, (PAPER, YEL)))
    stars_ = ''.join(dot(x, y, 2.5, PAPER, .8) for x, y in ((30, 96), (212, 108), (392, 112), (574, 84), (132, 110), (430, 74)))
    scallops = ''.join(dot(10 + 26 * i, 178, 13, RED if i % 2 == 0 else PAPER) for i in range(8))
    scene = (
        wall(BLU_L) + stars_ + disc() + lights
        # a fruit stall under a striped awning
        + line('M22 180V326M176 180V326', INK, 8, cap='butt')
        + scallops + shape('M0 122h172l22 56H0z', RED)
        + ''.join(shape(f'M{x} 122h22l{6 + x // 12} 56h-26z', PAPER) for x in (26, 78, 130))
        + dot(100, 206, 15, YEL_L, .5) + line('M100 180v14', INK, 4) + dot(100, 204, 9, YEL)
        + box(0, 262, 186, 64, KRAFT) + box(0, 256, 190, 10, PALE) + box(0, 292, 186, 6, STONE, op=.6)
        + fr('watermelon', 26, 216, 56) + fr('mango', 84, 212, 48) + fr('apple', 132, 212, 46)
        # the show board, and his table of tricks
        + line('M510 190V266', INK, 8, cap='butt')
        + box(436, 104, 150, 90, YEL) + box(446, 114, 130, 70, RED)
        + star(478, 149, 22, 9, 5, YEL) + line('M512 138h50M512 158h34', PAPER, 7)
        + ''.join(dot(x, 109, 3, PAPER) + dot(x, 189, 3, PAPER) for x in range(450, 580, 20))
        + box(452, 268, 148, 58, RED) + box(452, 310, 148, 6, YEL) + box(446, 260, 154, 12, RED_D)
        + star(492, 292, 10, 4, 5, YEL) + star(560, 292, 10, 4, 5, YEL)
        + ground(326, STONE)
    )
    person = (
        torso(INK) + shape('M300 286l30 46h-60z', BLU) + shape('M300 286l30 46h-30z', BLU_D) + dot(300, 354, 5, YEL) + dot(300, 380, 5, YEL)
        + neck(t) + head(t)
        + box(236, 52, 128, 92, INK) + box(236, 112, 128, 18, BLU)
        + shape('M184 144Q300 116 416 144Q300 170 184 144Z', INK)
        + line('M254 66v34', SLATE, 7)
        + eyes() + tash()
    )
    front = (
        # a fan of cards and the wand
        fist(154, 372, t) + card(-30, shape('M-8-108l9 14-9 14-9-14z', RED))
        + card(-6, dot(-8, -94, 9, INK))
        + card(18, shape('M-8-108l9 14-9 14-9-14z', RED) + shape('M8-66l9 14-9 14-9-14z', RED))
        + line('M464 334L482 252', INK, 10) + line('M480 261l2-9', PAPER, 10)
        + fist(460, 344, t)
        + burst(484, 232, 28, YEL) + twinkle(484, 232, 12, PAPER) + twinkle(526, 214, 9, PAPER) + twinkle(446, 212, 8, PAPER)
    )
    return svg(600, 400, scene + person + front)


# ---------- 11. Grace: Rockstar Grace has a show tonight ----------


def grace():
    t = 'deep'
    scene = (
        wall(STONE) + vlines(range(30, 600, 60), KRAFT, 3, .7, 0, 326) + disc()
        # stage lights
        + shape('M96 52L150 326H330z', YEL_L, .32) + shape('M504 52L450 326H270z', YEL_L, .32)
        + line('M84 0v26M516 0v26', INK, 7, cap='butt')
        + group(box(-26, -18, 52, 36, INK, 6) + oval(26, 0, 8, 16, YEL), 'translate(88 40) rotate(38)')
        + group(box(-26, -18, 52, 36, INK, 6) + oval(-26, 0, 8, 16, YEL), 'translate(512 40) rotate(-38)')
        # the curtain and her guitar
        + shape('M0 0h70c-4 60-26 110-26 170s22 104 30 156H0z', RED)
        + shape('M22 0h20c-2 64-20 112-20 172s14 100 20 154H26c-4-52-16-96-16-154S24 62 22 0z', RED_D)
        + line('M0 190c16 8 30 6 44-6', YEL, 7)
        + group(box(140, 126, 14, 122, INK) + shape('M134 100h26l-4 30h-18z', INK) + dot(132, 108, 4, STONE) + dot(162, 108, 4, STONE)
                + dot(134, 120, 4, STONE) + dot(160, 120, 4, STONE)
                + dot(147, 262, 26, YEL) + dot(147, 298, 34, YEL) + shape('M147 266c14 0 22 14 22 30s-10 26-22 26z', YEL_D, .6)
                + box(132, 280, 30, 8, INK) + box(132, 300, 30, 8, INK) + line('M143 132v170M151 132v170', PAPER, 3, .6, cap='butt'),
                'translate(-26 -8)')
        # the speakers
        + box(452, 128, 122, 96, INK, 6) + box(440, 220, 146, 106, INK, 6)
        + box(462, 138, 102, 14, SLATE) + ''.join(dot(x, 145, 4, PAPER) for x in (474, 492, 510, 528, 546))
        + dot(513, 188, 27, SLATE) + dot(513, 188, 11, STONE) + dot(513, 188, 4, INK)
        + dot(513, 273, 40, SLATE) + dot(513, 273, 17, STONE) + dot(513, 273, 6, INK)
        + ground(326, KRAFT, STONE, 1) + vlines((60, 190, 410, 540), STONE, 3, .8, 332, 400)
    )
    person = (
        ''.join(dot(x, y, r, INK) for x, y, r in ((198, 186, 38), (208, 144, 38), (242, 112, 42), (300, 100, 46), (358, 112, 42), (392, 144, 38), (402, 186, 38)))
        + torso(INK) + shape('M244 274h112l-56 70z', PINK)
        + shape('M222 274h22l56 70-10 14z', SLATE) + shape('M378 274h-22l-56 70 10 14z', SLATE)
        + neck(t) + head(t)
        + box(242, 176, 52, 32, INK, 10) + box(306, 176, 52, 32, INK, 10) + box(288, 184, 24, 8, INK)
        + line('M252 187l12-5M316 187l12-5', PAPER, 4, .55)
        + grin(218)
    )
    front = (
        # her microphone
        line('M452 400V342', STONE, 8, cap='butt') + box(440, 334, 24, 12, SLATE, 4)
        + group(box(-9, 0, 18, 46, SLATE, 6) + dot(0, -8, 19, STONE) + line('M-13-8h26M-9-18h18M-9 2h18', SLATE, 3) + box(-9, 14, 18, 6, YEL),
                'translate(436 300) rotate(-28)')
    )
    return svg(600, 400, scene + person + front)


# ---------- 12. Hafiz: Professor Pebble digs up old bones for the museum ----------


def bone(x, y, length, rot, thick=16):
    h = length / 2
    return group(box(-h, -thick / 2, length, thick, PAPER, thick / 2)
                 + ''.join(dot(sx * h, sy * thick * .55, thick * .68, PAPER) for sx in (-1, 1) for sy in (-1, 1))
                 + line(f'M{-h + 8} {thick / 2 - 3}h{length - 16}', KRAFT, 3), f'translate({x} {y}) rotate({rot})')


def hafiz():
    t = 'light'
    ribs = ''.join(line(f'M{x} {y}q-16 30-2 60', PAPER, 7) for x, y in ((46, 204), (70, 208), (94, 210), (118, 208)))
    spine = ''.join(dot(x, y, 8, PAPER) for x, y in ((26, 192), (44, 198), (62, 202), (80, 204), (98, 204), (116, 202), (132, 196)))
    scene = (
        wall(ORANGE, .24) + line('M210 30h60M236 48h32M420 60h44M40 40h70M70 58h36', PAPER, 8, .7) + disc()
        # the rock face, with old bones showing
        + shape('M0 70h52l16 30h46l22 36 26 12 22 178H0z', STONE)
        + shape('M52 70l16 30h46l22 36 26 12 4 30-34-14-24-38H62L40 70z', KRAFT, .7)
        + line('M0 262h150M0 300h170M0 150h60', KRAFT, 4, cap='butt')
        + spine + ribs
        + shape('M132 170c14-10 34-8 42 6 4 8 2 18-6 22l-28 6c-10-4-14-22-8-34z', PAPER) + dot(156, 182, 5, STONE)
        + line('M146 204l18-4', STONE, 3)
        # the shelter and the finds table
        + line('M424 178V326M572 170V326', INK, 8, cap='butt')
        + shape('M404 148l188-18 8 44-190 22z', BLU) + shape('M410 196l190-22v10l-188 22z', BLU_D)
        + box(438, 262, 124, 10, PALE) + line('M448 272v54M552 272v54', SLATE, 7, cap='butt')
        + shape('M506 262c-4-14 0-26 12-30h16c12 4 16 16 12 30z', ORANGE) + box(516, 226, 20, 8, RED_D, 3)
        + shape('M458 262c-2-10 2-18 10-20h10c8 2 12 10 10 20z', RED_D) + line('M460 250h28', ORANGE, 3, cap='butt')
        + ground(326, KRAFT, STONE, 1)
        + line('M0 346H126M474 346H600', RED, 3, cap='butt')
        + box(36, 334, 8, 22, INK) + box(104, 334, 8, 22, INK) + box(496, 334, 8, 22, INK) + box(566, 334, 8, 22, INK)
    )
    person = (
        dot(214, 204, 28, STONE) + dot(386, 204, 28, STONE)
        + torso(INK) + shape('M300 286l30 46h-60z', RED) + line('M184 350h38', SLATE, 5) + line('M196 348v-18', YEL, 6)
        + neck(t) + head(t)
        + line('M258 138c8-10 20-16 33-18', PAPER, 7, .55)
        + specs() + eyes() + tash(STONE, 9)
    )
    front = (
        # a trowel in the spoil heap, and the bone he has just dug up
        shape('M24 400c8-26 44-38 76-30 22 6 34 16 40 30z', STONE)
        + line('M84 352v-26', RED, 10) + shape('M70 350h28l-14 36z', SLATE)
        + fist(440, 356, t) + bone(470, 314, 108, -52)
    )
    return svg(600, 400, scene + person + front)


PICTURES = {
    'customer-john': john, 'customer-robert': robert, 'customer-daniel': daniel, 'customer-rara-jenab': rara,
    'customer-aisyah': aisyah, 'customer-ravi': ravi, 'customer-mei-ling': mei_ling, 'customer-farid': farid,
    'customer-siti': siti, 'customer-kumar': kumar, 'customer-grace': grace, 'customer-hafiz': hafiz,
}

for name, draw in PICTURES.items():
    save(name, draw())
sheet(list(PICTURES), 'sheet-customers-a.png')
print(len(PICTURES), 'pictures written')
