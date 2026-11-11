"""Card pictures for the eight shopkeepers (shop-<id>.svg) and the eight standing-order clients (order-<slug>.svg).

Shopkeepers: one bust behind their own stall. Layers, back to front: the wall in the stall's colour with a quiet
pattern and the lighter disc behind the head; things on the wall; the scalloped awning; the person, drawn like their
picture in public/art-ticket/scenes; the counter in a soft tone (never a black strip); fruit crates and the one object
that hints at their perk.

Standing orders: the place itself (no person), with the fruit it wants shown with the game's fruit icons.

Run from the repo root: python3 docs/studio/art-drafts/cards-18/shops_orders.py
"""
import math

from kit import *


# ---------- small shape helpers ----------

def _a(o=None, t=None):
    return (f' opacity="{o}"' if o is not None else '') + (f' transform="{t}"' if t else '')


def R(x, y, w, h, f, rx=0, o=None, t=None):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}"' + (f' rx="{rx}"' if rx else '') + f' fill="{f}"{_a(o, t)}/>'


def C(x, y, r, f, o=None):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{f}"{_a(o)}/>'


def E(x, y, rx, ry, f, o=None, t=None):
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{f}"{_a(o, t)}/>'


def P(d, f, o=None, t=None):
    return f'<path d="{d}" fill="{f}"{_a(o, t)}/>'


def L(d, s, w=6, o=None, cap='round'):
    """A thin detail: a stroke with round caps and joins (cap='butt' for flat ends)."""
    return f'<path d="{d}" fill="none" stroke="{s}" stroke-width="{w}" stroke-linecap="{cap}" stroke-linejoin="round"{_a(o)}/>'


def ring(x, y, r, s, w=6, o=None):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="{s}" stroke-width="{w}"{_a(o)}/>'


def G(t, body):
    return f'<g transform="{t}">{body}</g>'


def n(v):
    return f'{v:.1f}'.rstrip('0').rstrip('.')


def star(cx, cy, ro, ri, points, f, turn=0.0):
    pts = []
    for i in range(2 * points):
        a = math.radians(turn + i * 180 / points - 90)
        r = ro if i % 2 == 0 else ri
        pts.append(f'{n(cx + r * math.cos(a))} {n(cy + r * math.sin(a))}')
    return P('M' + 'L'.join(pts) + 'Z', f)


def heart(cx, cy, s, f):
    """A heart about 2s wide, centred on (cx, cy)."""
    return P(f'M0 {n(.9 * s)}C{n(-1.5 * s)} {n(-.2 * s)} {n(-.9 * s)} {n(-1.3 * s)} 0 {n(-.45 * s)}C{n(.9 * s)} {n(-1.3 * s)} {n(1.5 * s)} {n(-.2 * s)} 0 {n(.9 * s)}Z', f, t=f'translate({cx} {cy})')


def discs(points, r, f, o=None):
    """Many small circles as one shape."""
    return P(''.join(f'M{n(x - r)} {n(y)}a{r} {r} 0 1 0 {2 * r} 0a{r} {r} 0 1 0 {-2 * r} 0z' for x, y in points), f, o)


def arc(cx, cy, r, a1, a2):
    """Path data for a circular arc, angles in degrees clockwise from 3 o'clock (screen coordinates)."""
    x1, y1 = cx + r * math.cos(math.radians(a1)), cy + r * math.sin(math.radians(a1))
    x2, y2 = cx + r * math.cos(math.radians(a2)), cy + r * math.sin(math.radians(a2))
    return f'M{n(x1)} {n(y1)}A{r} {r} 0 0 1 {n(x2)} {n(y2)}'


# Where each fruit icon's bottom edge sits in its box, so a fruit can be placed by the middle of its base.
_BASE = {'blueberry': .94, 'watermelon': .82, 'mango': .94, 'apple': .93}


def fat(fruit, cx, base, size, stage='fresh'):
    """The game's fruit icon standing on `base`, centred on cx."""
    return fr(fruit, n(cx - size / 2), n(base - size * _BASE[fruit]), size, stage)


# ---------- quiet wall patterns (each one shape) ----------

def pat_dots(f, o, r=5, dx=50, dy=44):
    pts = [(x + (dx / 2 if row % 2 else 0), 84 + row * dy) for row in range(7) for x in range(25, 600, dx)]
    return discs(pts, r, f, o)


def pat_siding(f, o, step=32):
    return L(''.join(f'M0 {y}h600' for y in range(76, 340, step)), f, 3, o, 'butt')


def pat_lattice(f, o, step=56):
    d = ''.join(f'M{x} 0l400 400M{x + 400} 0l-400 400' for x in range(-400, 600, step))
    return L(d, f, 3, o, 'butt')


def pat_checker(f, o, s=50):
    d = ''.join(f'M{x} {y}h{s}v{s}h{-s}z' for row, y in enumerate(range(40, 400, s)) for x in range(s * (row % 2), 600, 2 * s))
    return P(d, f, o)


def pat_hatch(f, o, step=40):
    return L(''.join(f'M{x} 0l-400 400' for x in range(0, 1000, step)), f, 3, o, 'butt')


def pat_bands(f, o, w=30, period=60):
    return P(''.join(f'M{x} 0h{w}v400h{-w}z' for x in range(0, 600, period)), f, o)


def pat_weave(f, o, s=36):
    d = ''
    for row, y in enumerate(range(70, 400, s)):
        for col, x in enumerate(range(0, 600, s)):
            d += f'M{x + 6} {y + s // 2}h{s - 12}' if (row + col) % 2 else f'M{x + s // 2} {y + 6}v{s - 12}'
    return L(d, f, 5, o)


def pat_corrugated(f, o, step=24):
    return L(''.join(f'M{x} 0v400' for x in range(12, 600, step)), f, 4, o, 'butt')


# ---------- the stall ----------

def awning(shade):
    """Nine scallops along the top edge, ink and paper in turn as on the shopkeepers' existing pictures, and their shade on the wall."""
    p, x0, drop, r = 68, -6, 30, 34
    sc = lambda i: f'M{x0 + i * p} -12h{p}v{drop + 12}a{r} {r} 0 0 1 {-p} 0z'
    dark = ''.join(sc(i) for i in range(0, 9, 2))
    light = ''.join(sc(i) for i in range(1, 9, 2))
    return P(dark + light, shade, .5, 'translate(0 9)') + P(dark, INK) + P(light, PAPER) + \
        L(''.join(f'M{x0 + i * p + 15} 34a{r - 15} {r - 15} 0 0 0 {p - 30} 0' for i in range(1, 9, 2)), PALE, 4)


def counter(top=PALE, front=KRAFT, seam=STONE, seam_o=.7, y=338):
    return R(0, y, 600, 400 - y, front) + R(0, y, 600, 24, top) + R(0, y + 24, 600, 4, seam, o=seam_o) + \
        L(f'M100 {y + 30}v40M300 {y + 30}v40M500 {y + 30}v40', seam, 3, seam_o, 'butt')


def shadow(x1, x2, y, f=STONE, o=.55):
    """The soft shade where a thing stands on the counter or the floor."""
    return R(x1 - 4, y - 4, x2 - x1 + 8, 8, f, rx=4, o=o)


def crate(x, y, w, h, front=(), back=(), body=KRAFT, light=PALE, post=STONE):
    """A slatted crate with its top edge at y. front/back: (fruit, centre offset from x, size) for the two rows of fruit."""
    out = shadow(x, x + w, y + h) + ''.join(fat(f, x + cx, y - 14, s) for f, cx, s in back)
    out += ''.join(fat(f, x + cx, y + round(s * .15), s) for f, cx, s in front)
    out += R(x, y, w, h, body) + R(x, y, w, 6, light) + R(x, y, 12, h, post) + R(x + w - 12, y, 12, h, post)
    y1, y2 = y + round(h / 3), y + round(2 * h / 3)
    out += L(f'M{x + 12} {y1}h{w - 24}M{x + 12} {y2}h{w - 24}', INK, 5, cap='butt')
    out += R(x + w / 2 - 20, y + round(h / 6) - 3, 40, 10, INK, rx=5)
    return out


SHOULDERS = 'M126 400v-66c0-36 30-60 66-60h216c36 0 66 24 66 60v66z'
EYES = C(270, 190, 9, INK) + C(330, 190, 9, INK) + C(273, 187, 3, PAPER) + C(333, 187, 3, PAPER)
EYES_SMILING = L('M254 196q16-20 32 0M314 196q16-20 32 0', INK, 7)
GLASSES = ring(270, 190, 22, INK) + ring(330, 190, 22, INK) + L('M293 188q7-5 14 0', INK, 5)
SMILE = P('M271 232q29 7 58 0-6 18-29 18t-29-18z', PAPER)
MOUSTACHE = 'M300 238c-8-9-25-9-34 0 4 11 23 14 34 5 11 9 30 6 34-5-9-9-26-9-34 0z'
FRINGE = 'M219 190C232 150 268 140 300 140s68 10 81 50c-16-21-48-32-81-32s-65 11-81 32z'
LONG_HAIR = 'M206 300V200c0-42 34-70 94-70s94 28 94 70v100z'


def person(skin, top, back='', clothes='', hair='', face=''):
    """The bust: head of radius 82 on (300, 196), shoulders off the bottom edge. Pieces are layered in this order."""
    s, sh = SKINS[skin]
    return back + P(SHOULDERS, top) + clothes + R(274, 250, 52, 36, sh) + C(300, 196, 82, s) + \
        C(238, 216, 13, RED_L, .45) + C(362, 216, 13, RED_L, .45) + hair + face


def shelf(x, y, w, plank=KRAFT, under=STONE):
    return R(x, y, w, 10, plank) + R(x, y + 10, w, 4, under) + P(f'M{x + 14} {y + 14}h10v16zM{x + w - 14} {y + 14}h-10v16z', under)


def scene(wall, pattern, disc, shade, props, body, top=PALE, front=KRAFT, seam=STONE, seam_o=.7, things='', disc_o=None):
    return svg(600, 400, R(0, 0, 600, 400, wall) + pattern + C(300, 196, 172, disc, disc_o) + props + awning(shade) + body +
               counter(top, front, seam, seam_o) + things)


SHOPS = {}

# ---------- Rosa: the Haggler holds up a price tag (pink stall) ----------
skin = SKINS['tan'][0]
SHOPS['rosa'] = scene(
    PINK, pat_dots(PAPER, .22), PAPER, RED_D, disc_o=.3,
    props=
    # a hanging sign with ink bars
    L('M72 30v46M152 30v46', INK, 4) + R(52, 74, 120, 44, PAPER) + R(52, 74, 120, 8, RED) +
    L('M66 96h56M66 108h34', INK, 6) + C(150, 100, 9, YEL) +
    # a shelf with her flower in a pot and a jar
    shelf(436, 164, 124) + L('M484 122V96', GRN_D, 5) + E(470, 108, 15, 8, GRN, t='rotate(28 470 108)') +
    E(498, 108, 15, 8, GRN, t='rotate(-28 498 108)') + star(484, 88, 19, 9, 8, RED) + C(484, 88, 6, PAPER) +
    P('M462 126h44l-6 38h-32z', BLU) + R(458, 120, 52, 10, BLU_D, rx=3) +
    R(524, 130, 30, 34, PAPER, rx=5) + R(522, 124, 34, 9, YEL_D, rx=3) + L('M532 146h14', INK, 5),
    body=person(
        'tan', PAPER, back=P(LONG_HAIR, INK),
        clothes=L('M258 277q42 32 84 0', PALE, 6),
        hair=C(218, 230, 12, RED) + C(382, 230, 12, RED) + P(FRINGE, INK) + star(366, 124, 34, 15, 8, RED, 10) + C(366, 124, 10, PAPER),
        face=EYES + SMILE) +
    # her arm, the price tag and her hand
    R(122, 272, 44, 96, PAPER, rx=20, t='rotate(-3 144 300)') + R(124, 290, 40, 9, PALE, rx=4, t='rotate(-3 144 300)') +
    L('M167 304l-2 36', PALE, 5) +
    G('translate(0 8) rotate(-8 146 190)', P('M108 152l16-18h44l16 18v94h-76z', PAPER) + C(146, 150, 6, PINK) +
      L('M146 150c2-16-8-26-22-24', INK, 3) + L('M122 178h48M122 196h30', INK, 7) + C(162, 222, 10, RED) + L('M122 222h20', STONE, 6)) +
    C(147, 270, 22, skin) + E(163, 256, 9, 14, skin, t='rotate(28 163 256)'),
    things=crate(412, 284, 146, 68, front=[('blueberry', 28, 52), ('apple', 73, 58), ('mango', 120, 56)],
                 back=[('mango', 50, 48), ('blueberry', 98, 44)]))

# ---------- Uncle Benny: Big Basket (green stall) ----------
SHOPS['benny'] = scene(
    GRN, pat_siding(GRN_D, .55), GRN_L, GRN_D,
    props=
    # a hanging scale with a mango in the pan
    L('M110 30v54', INK, 4) + C(110, 120, 38, INK) + C(110, 120, 30, PAPER) +
    L('M110 96v7M134 120h-7M86 120h7M110 144v-7', INK, 3) + L('M110 120l13-15', RED, 5) + C(110, 120, 5, INK) +
    L('M110 158v12', INK, 4) + fat('mango', 110, 224, 46) + L('M110 170l-46 42M110 170l46 42', INK, 3) +
    P('M58 210h104a52 24 0 0 1-104 0z', STONE) + R(58, 207, 104, 6, PALE, rx=3) +
    # a lamp over the basket
    L('M500 30v50', INK, 4) + C(500, 106, 10, YEL) + P('M474 106l9-28h34l9 28z', INK),
    body=person(
        'light', INK, clothes=R(228, 292, 144, 110, PAPER),
        hair=P('M206 176C196 118 244 84 302 84c58 0 106 32 114 84q-104-20-210 8z', INK) + L('M218 165q94-20 190-5', PAPER, 8, cap='butt') +
        P('M352 150c30 2 56 6 68 12 16 8 28 18 34 30-34 6-72 2-98-12z', INK),
        face=EYES + P('M214 206c6 22 28 38 52 40 14 1 24-6 34-6s20 7 34 6c24-2 46-18 52-40 6 40-4 76-28 100-16 16-38 26-58 26s-42-10-58-26c-24-24-34-60-28-100z', INK) +
        C(300, 224, 19, RED) + C(294, 218, 5, RED_L) + P('M274 276q26 6 52 0-5 14-26 14t-26-14z', PAPER)),
    things=
    crate(42, 296, 138, 58, front=[('apple', 28, 50), ('watermelon', 69, 54), ('apple', 110, 50)]) +
    # the big basket, heaped with fruit
    shadow(408, 542, 360) + L('M404 292C404 136 546 136 546 292', YEL_D, 11) +
    fat('mango', 475, 226, 56) + fat('watermelon', 446, 262, 66) + fat('apple', 508, 266, 58) +
    fat('apple', 426, 304, 60) + fat('blueberry', 476, 304, 56) + fat('mango', 524, 304, 62) +
    P('M394 292h162l-14 60a10 10 0 0 1-10 8H418a10 10 0 0 1-10-8z', YEL_D) +
    L('M401 314h148M405 334h140', ORANGE, 4, .8, 'butt') + L('M435 300v56M475 300v56M515 300v56', ORANGE, 4, .5, 'butt') +
    R(386, 284, 178, 16, YEL, rx=8) + L('M398 290h154', YEL_L, 4))

# ---------- Ah Chen: the Charmer holds four favour cards, with a small gift (blue stall) ----------
skin = SKINS['light'][0]
cards = ''.join(G(f'rotate({a} 460 268)', R(438, 178, 38, 56, KRAFT, rx=5) + R(441, 178, 38, 56, PAPER, rx=5) + heart(460, 198, 8, RED) +
                  L('M452 218h16', STONE, 5)) for a in (-34, -10, 14, 38))
SHOPS['chen'] = scene(
    BLU, pat_lattice(BLU_D, .55), BLU_L, BLU_D,
    props=
    # a red lantern
    L('M104 30v44', INK, 4) + E(104, 120, 40, 42, RED) + L('M104 80v80M86 86q-16 34 0 68M122 86q16 34 0 68', RED_D, 4) +
    R(88, 72, 32, 9, YEL_D, rx=3) + R(88, 159, 32, 9, YEL_D, rx=3) + L('M104 170v24', YEL, 6) +
    # a shelf with a teapot and cups
    shelf(440, 140, 120) + L('M452 118l14-8', PAPER, 9) + ring(506, 118, 12, PAPER, 6) + E(482, 118, 26, 22, PAPER) +
    L('M458 118h48', BLU, 5, cap='butt') + R(472, 92, 20, 7, PAPER, rx=3) + C(482, 90, 5, RED) +
    R(530, 120, 20, 20, PAPER, rx=4) + L('M530 128h20', BLU, 4, cap='butt'),
    body=person(
        'light', RED, clothes=L('M258 277q42 32 84 0', RED_D, 7),
        hair=P('M219 192C230 150 266 136 300 136s70 14 81 56c-18-22-50-30-81-30s-63 8-81 30z', INK) + L('M322 98l30-4', INK, 5) +
        C(300, 106, 30, INK) + C(354, 100, 16, PAPER) + C(354, 100, 8, RED),
        face=EYES_SMILING + SMILE) +
    R(438, 272, 44, 96, RED, rx=20, t='rotate(3 460 300)') + R(440, 288, 40, 9, RED_D, rx=4, t='rotate(3 460 300)') +
    L('M437 304l2 36', RED_D, 5) + cards + C(460, 266, 22, skin) + E(444, 252, 9, 14, skin, t='rotate(-28 444 252)'),
    things=
    crate(42, 290, 140, 64, front=[('apple', 28, 52), ('mango', 71, 56), ('watermelon', 114, 54)], back=[('mango', 50, 46), ('apple', 94, 46)]) +
    # the gift
    shadow(160, 216, 356) + R(160, 310, 56, 46, YEL) + R(156, 302, 64, 14, YEL_D, rx=3) + R(183, 302, 10, 54, RED) +
    E(176, 296, 12, 8, RED, t='rotate(-24 176 296)') + E(200, 296, 12, 8, RED, t='rotate(24 200 296)') + C(188, 299, 6, RED_D))

# ---------- Saleh: Nest Egg, a cash tin and saved coins (yellow stall) ----------
beads = [(x, y) for x in (458, 478, 498, 518, 538) for y in (122, 136, 150)]
SHOPS['saleh'] = scene(
    YEL, pat_checker(YEL_L, .45), YEL_L, YEL_D,
    props=
    # a tear-off calendar
    C(102, 80, 4, INK) + R(64, 84, 76, 20, RED, rx=3) + R(64, 100, 76, 76, PAPER) + discs([(82, 93), (122, 93)], 4, PAPER) +
    L('M72 112h26', INK, 5) + P(''.join(f'M{x} {y}h9v9h-9z' for y in (124, 140, 156) for x in (71, 84, 97, 110, 123)), STONE) +
    R(97, 124, 9, 9, RED) +
    # an abacus
    C(496, 80, 4, INK) + R(436, 84, 120, 82, RED_D, rx=5) + R(444, 92, 104, 66, PALE) +
    L('M458 92v66M478 92v66M498 92v66M518 92v66M538 92v66', INK, 3, cap='butt') + R(444, 108, 104, 5, RED_D) +
    discs([(458, 100), (498, 100), (538, 100)], 7, RED) + discs([(478, 101), (518, 101)], 7, RED) + discs(beads, 7, BLU),
    body=person(
        'tan', PAPER,
        clothes=P('M274 277l-22 6 30 30 18-22zM326 277l22 6-30 30-18-22z', PALE) + P('M300 290l28 48h-56z', BLU) + R(290, 284, 20, 13, BLU_D, rx=4),
        hair=P('M228 160c0-30 30-48 72-48s72 18 72 48z', INK) + R(228, 153, 144, 11, PAPER) + R(228, 164, 144, 9, INK),
        face=EYES + GLASSES + P(MOUSTACHE, INK)),
    things=
    # the cash tin, open, with notes and coins inside
    shadow(66, 178, 356) + shadow(188, 228, 356) + P('M74 268h96l8 34H66z', BLU_D) + R(84, 276, 44, 30, GRN_L, rx=3, t='rotate(-10 106 290)') + R(104, 272, 44, 34, GRN, rx=3, t='rotate(8 126 290)') +
    L('M114 284h24', GRN_L, 5) + C(152, 292, 12, YEL) + C(152, 292, 7, YEL_D) +
    R(66, 300, 112, 56, BLU, rx=6) + R(66, 300, 112, 7, BLU_L, rx=3) + R(112, 314, 20, 24, YEL, rx=4) + C(122, 322, 4, INK) + R(120.5, 322, 3, 10, INK) +
    # a stack of coins
    R(188, 318, 40, 38, YEL_D, rx=5) + ''.join(R(188, y, 40, 7, YEL, rx=3.5) for y in (318, 328, 338, 348)) + E(208, 318, 20, 6, YEL_L) +
    crate(414, 286, 146, 68, front=[('blueberry', 28, 52), ('apple', 74, 58), ('watermelon', 120, 56)], back=[('apple', 52, 48), ('blueberry', 98, 44)]))

# ---------- Raj: Bargain Hunter, a marked-down tag (kraft stall) ----------
SHOPS['raj'] = scene(
    KRAFT, pat_hatch(PALE, .9), PALE, STONE, front=STONE, seam=SLATE, seam_o=.35,
    props=
    # a price board: prices going down
    L('M76 30v50M148 30v50', INK, 4) + R(50, 76, 124, 90, STONE, rx=5) + R(57, 83, 110, 76, SLATE) +
    L('M70 102h48M70 122h36M70 142h44', PAPER, 6) + L('M146 100v36', RED, 7) + P('M134 128h24l-12 18z', RED),
    body=person(
        'deep', PAPER,
        clothes=P('M274 277l-22 6 30 30 18-22zM326 277l22 6-30 30-18-22z', PALE) + L('M300 300v40', PALE, 5) + C(300, 322, 4, STONE),
        hair=P(FRINGE, INK),
        face=EYES + GLASSES + P(MOUSTACHE, INK)),
    things=
    crate(42, 296, 138, 58, front=[('apple', 28, 50), ('watermelon', 69, 54), ('apple', 110, 50)], body=GRN, light=GRN_L, post=GRN_D) +
    # the marked-down tag on its stake
    L('M486 300v-70', INK, 5) + burst(486, 184, 58, YEL) +
    G('rotate(-6 486 184)', R(450, 158, 72, 54, PAPER, rx=5) + L('M462 174h30', INK, 6) + L('M458 182l38-16', RED, 4) +
      L('M462 196h22', RED, 7) + L('M506 168v26', RED, 6) + P('M496 190h20l-10 14z', RED)) +
    crate(410, 288, 150, 66, front=[('mango', 30, 56), ('blueberry', 76, 52), ('mango', 122, 56)], body=RED, light=RED_L, post=RED_D))

# ---------- Kiki: Tip Jar (red stall) ----------
flags = ''
for i, t in enumerate((.05, .13, .21, .29, .71, .79, .87, .95)):
    x, y = 30 + 540 * t, 70 + 260 * t * (1 - t)
    slope = math.degrees(math.atan2(260 * (1 - 2 * t), 540))
    flags += P('M-15 0h30l-15 34z', YEL if i % 2 == 0 else PAPER, t=f'translate({n(x)} {n(y)}) rotate({n(slope)})')
coins = [(440, 338), (462, 342), (484, 338), (451, 322), (474, 324), (462, 306)]
SHOPS['kiran'] = scene(
    RED, pat_bands(RED_D, .3), RED_L, RED_D,
    props=L('M30 70Q300 200 570 70', INK, 3) + flags,
    body=person(
        'deep', PAPER, back=P(LONG_HAIR, INK),
        clothes=L('M258 277q42 32 84 0', PALE, 6),
        hair=C(218, 230, 12, YEL) + C(382, 230, 12, YEL) + P(FRINGE, INK),
        face=EYES + SMILE),
    things=
    crate(42, 290, 142, 64, front=[('blueberry', 28, 52), ('mango', 72, 56), ('watermelon', 116, 54)], back=[('mango', 50, 46), ('blueberry', 96, 42)]) +
    # the tip jar, a coin dropping in
    shadow(414, 498, 356) + L('M444 196v-12M456 190v-14M468 196v-12', PAPER, 4, .8) + C(456, 218, 14, YEL) + C(456, 218, 8, YEL_D) +
    R(426, 246, 60, 26, BLU_L, rx=6) + R(414, 262, 84, 94, BLU_L, rx=16) + R(420, 240, 72, 12, PAPER, rx=6) +
    discs(coins, 11, YEL) + discs(coins, 6, YEL_D) + C(456, 284, 15, PAPER) + heart(456, 285, 7, RED) + L('M426 280v50', PAPER, 5, .6) +
    # a counter bell
    shadow(504, 558, 356) + P('M509 350a22 22 0 0 1 44 0z', YEL) + L('M518 340a14 14 0 0 1 8-9', YEL_L, 4) + R(526, 320, 10, 10, YEL_D, rx=4) +
    R(503, 348, 56, 8, YEL_D, rx=4))

# ---------- Pak Din: Shade Cloth over his fruit (green stall) ----------
SHOPS['pakdin'] = scene(
    GRN, pat_weave(GRN_D, .5), GRN_L, GRN_D,
    props=burst(100, 122, 50, YEL) + C(100, 122, 27, YEL_L),
    body=person(
        'tan', PAPER,
        clothes=L('M258 277q42 32 84 0', PALE, 6) + L('M300 296v44', PALE, 5),
        hair=P('M300 78L159 176h282z', KRAFT) + P('M300 78l141 98H300z', STONE, .5) + P('M229 128h142l19 13H210z', INK),
        face=EYES_SMILING + P('M300 232c-10-12-38-12-50 0 4 16 34 20 50 6 16 14 46 10 50-6-12-12-40-12-50 0z', STONE)),
    things=
    # a potted plant in the sun
    E(94, 268, 15, 52, LEAF, t='rotate(-26 94 268)') + E(140, 266, 15, 54, LEAF, t='rotate(24 140 266)') + E(117, 252, 15, 58, LEAF) +
    L('M117 206v104M78 232l22 70M158 228l-24 74', GRN_D, 4) + shadow(92, 142, 356) + P('M86 322h62l-7 34H93z', ORANGE) + R(80, 314, 74, 12, RED_D, rx=4) +
    # the shade cloth on two bamboo poles, his fruit cool underneath
    R(412, 232, 132, 124, GRN_D) + L('M410 196v160M546 196v160', YEL_D, 8) + L('M406 250h8M406 304h8M542 250h8M542 304h8', ORANGE, 4) +
    crate(418, 298, 120, 58, front=[('apple', 24, 46), ('mango', 60, 48), ('blueberry', 96, 44)]) +
    P('M398 190q80 18 160 0v42q-20 13-40 0q-20 13-40 0q-20 13-40 0q-20 13-40 0z', BLU) +
    L('M398 196q80 18 160 0', BLU_L, 5) + discs([(418, 220), (458, 227), (498, 227), (538, 220)], 5, PAPER) +
    discs([(438, 224), (478, 228), (518, 224)], 3, YEL))

# ---------- Farah: Sharp Ears, a hand to her ear (blue stall) ----------
skin, shade = SKINS['deep']
SHOPS['farah'] = scene(
    BLU, pat_corrugated(BLU_D, .5), BLU_L, BLU_D,
    props=
    # a shelf with jars and a bottle
    shelf(44, 152, 126) + R(58, 108, 34, 44, PAPER, rx=6) + R(56, 101, 38, 9, RED, rx=3) + L('M67 128h16', INK, 5) +
    R(104, 116, 30, 36, PAPER, rx=6) + R(102, 109, 34, 9, YEL, rx=3) + L('M112 134h14', INK, 5) +
    R(146, 112, 16, 40, GRN, rx=5) + R(150, 98, 8, 16, GRN) +
    # a little bird on a perch, and what she hears
    L('M600 150H494', KRAFT, 7) + P('M546 128l26 14-22 6z', YEL_D) + E(528, 128, 23, 19, YEL) + E(534, 130, 12, 9, YEL_D) +
    C(511, 110, 13, YEL) + P('M500 106l-14 5 14 6z', ORANGE) + C(508, 107, 3, INK) + L('M522 146v6M534 146v6', ORANGE, 4) +
    L(arc(402, 204, 50, -50, -8) + arc(402, 204, 68, -50, -8) + arc(402, 204, 86, -50, -8), PAPER, 7, .9),
    body=
    # her arm and cupped hand, behind the ear
    P('M432 360l-56-108 36-14 64 122z', INK) + R(372, 240, 44, 12, PAPER, rx=5, t='rotate(-20 394 246)') +
    R(380, 168, 38, 74, skin, rx=18, t='rotate(12 399 205)') + L('M396 177l-3 18M408 179l-3 18', shade, 3) +
    person(
        'deep', INK,
        clothes=R(246, 306, 108, 96, PAPER) + L('M252 308l22-32M348 308l-22-32', PAPER, 9, cap='butt'),
        hair=L('M218 232a82 86 0 0 1 164 0', INK, 15, cap='butt') + C(218, 232, 12, YEL) + C(382, 232, 12, YEL),
        face=EYES + L('M276 238q24 22 48 0', INK, 8)),
    things=
    crate(42, 290, 142, 64, front=[('apple', 28, 54), ('mango', 72, 56), ('watermelon', 116, 54)], back=[('mango', 50, 46), ('apple', 96, 46)]) +
    # paper bags
    shadow(486, 558, 356) + P('M508 296h44l6 60h-56z', STONE) + P('M490 310h46l6 46h-58z', KRAFT) + L('M492 322h42', STONE, 3) + L('M513 310v12', STONE, 3))

for sid, markup in SHOPS.items():
    save('shop-' + sid, markup)


# ====================== the eight standing-order clients: the place, and the fruit it wants ======================

def cloud(x, y, s=1.0, o=.9):
    return P('M-52 18a18 18 0 0 1 8-34a26 26 0 0 1 48-8a20 20 0 0 1 34 14a14.5 14.5 0 0 1 4 28z', PAPER, o, f'translate({x} {y}) scale({s})')


def rrects(items, w, h, r, f, o=None):
    """Many rounded rectangles as one shape."""
    one = lambda x, y: (f'M{x + r} {y}h{w - 2 * r}a{r} {r} 0 0 1 {r} {r}v{h - 2 * r}a{r} {r} 0 0 1 {-r} {r}h{-(w - 2 * r)}'
                        f'a{r} {r} 0 0 1 {-r} {-r}v{-(h - 2 * r)}a{r} {r} 0 0 1 {r} {-r}z')
    return P(''.join(one(x, y) for x, y in items), f, o)


ORDERS = {}

# ---------- The Airline Caterer: mango for the in-flight meals ----------
ORDERS['airline-caterer'] = svg(600, 400,
    R(0, 0, 600, 400, BLU_L) + cloud(120, 48) + cloud(488, 40, .8) + cloud(312, 28, .55) +
    # the apron, with its painted line
    R(0, 256, 600, 144, STONE) + R(0, 256, 600, 6, SLATE, o=.35) + L('M0 388h600', YEL, 5, cap='butt') +
    # the aeroplane: fuselage, stripes, windows, cockpit, door, wheels
    L('M476 184v54M268 186v50', SLATE, 8, cap='butt') + discs([(476, 244), (256, 244), (282, 244)], 14, INK) + discs([(476, 244), (256, 244), (282, 244)], 5, STONE) +
    P('M-20 92H400C470 92 532 122 562 152c8 10 2 26-18 28L-20 190z', PAPER) + P('M-20 168h577c0 6-6 11-13 12L-20 190z', PALE) +
    L('M-20 150H557', BLU, 8, cap='butt') + L('M-20 162H561', RED, 4, cap='butt') +
    rrects([(x, 112) for x in range(22, 390, 30)], 14, 18, 5, BLU_D) + P('M456 108c30 4 58 18 78 36h-66z', INK) +
    R(404, 104, 30, 52, PALE, rx=7) + L('M411 132h6', SLATE, 4) +
    # the wing and an engine
    P('M150 172h190L170 246H56z', PALE) + P('M56 246h114l10-9H68z', STONE) +
    R(116, 208, 104, 42, PAPER, rx=21) + C(204, 229, 15, SLATE) + C(204, 229, 7, INK) + L('M132 221h44', PALE, 5) +
    # a crate of mangoes waiting on the apron
    crate(44, 312, 136, 64, front=[('mango', 26, 56), ('mango', 68, 58), ('mango', 110, 56)], back=[('mango', 47, 50), ('mango', 89, 50)], post=SLATE) +
    # the meal trolley, mangoes on its tray
    fat('mango', 246, 250, 84) + fat('mango', 354, 250, 84) + fat('mango', 300, 250, 96) +
    R(186, 242, 228, 16, BLU, rx=8) + L('M198 247h204', BLU_L, 4) +
    R(202, 258, 196, 150, PALE, rx=6) + R(378, 258, 20, 150, KRAFT) + L('M218 302h146M218 346h146', SLATE, 4, .6, 'butt') +
    rrects([(274, 274), (274, 318), (274, 362)], 34, 10, 5, SLATE) +
    # meal boxes on a dolly
    L('M556 338v-78', SLATE, 6) + R(440, 334, 122, 10, SLATE, rx=5) + discs([(460, 356), (542, 356)], 11, INK) + discs([(460, 356), (542, 356)], 4, STONE) +
    R(448, 298, 96, 36, BLU, rx=5) + R(448, 298, 96, 9, BLU_D, rx=4) + R(456, 264, 80, 34, BLU, rx=5) + R(456, 264, 80, 9, BLU_D, rx=4) +
    L('M484 320h24M484 286h24', PAPER, 5))

# ---------- The Beach Resort: cut watermelon by the pool ----------
ORDERS['beach-resort'] = svg(600, 400,
    R(0, 0, 600, 400, YEL_L) + burst(118, 58, 46, YEL) + C(118, 58, 25, PAPER, .6) +
    # the sea and the sand
    R(0, 140, 600, 70, BLU_L) + L('M206 180q10-9 20 0t20 0M352 190q10-9 20 0t20 0M430 164q10-9 20 0t20 0', PAPER, 4, .9) +
    R(0, 206, 600, 194, KRAFT) + P('M0 204' + 'q25 12 50 0t50 0' * 6 + 'v10H0z', PAPER, .9) +
    # a chalet on stilts with a thatched roof
    L('M58 258v28M150 258v28', RED_D, 7, cap='butt') + R(44, 170, 120, 84, PAPER) + R(38, 250, 132, 10, STONE, rx=3) +
    P('M22 176l82-66 82 66z', ORANGE) + L('M62 158l-12 14M104 126v46M146 158l12 14M83 142l-7 30M125 142l7 30', YEL_D, 4) +
    R(88, 202, 32, 48, BLU, rx=3) + C(113, 228, 3, YEL) + R(130, 196, 24, 24, BLU_L) + L('M142 196v24M130 208h24', PAPER, 3, cap='butt') +
    # a palm
    L('M540 304C532 252 536 204 552 162', YEL_D, 14) + L('M532 276l13-3M533 246l13-2M537 216l13 0M543 190l12 3', ORANGE, 3) +
    P('M552 162c-34-26-76-22-100 8 36-14 68-14 100-8z', GRN) + P('M552 162c-18-42-58-60-96-48 42 4 72 20 96 48z', GRN_D) +
    P('M552 162c2-46 26-76 60-82-28 20-46 46-60 82z', GRN) + P('M552 162c30-24 62-24 84-6-32-8-56-4-84 6z', GRN_D) +
    # the pool
    R(120, 240, 440, 84, PAPER, rx=42) + R(130, 250, 420, 64, BLU_L, rx=32) + R(150, 250, 380, 9, BLU, rx=4, o=.5) +
    L('M160 288q10-9 20 0t20 0M420 276q10-9 20 0t20 0M462 298q10-9 20 0t20 0', PAPER, 4, .9) +
    ring(186, 276, 14, RED, 9) + L(arc(186, 276, 14, -30, 30) + arc(186, 276, 14, 150, 210), PAPER, 9, cap='butt') +
    # two loungers
    R(56, 352, 120, 11, BLU, rx=5) + R(59, 306, 11, 56, BLU, rx=5, t='rotate(-22 64 352)') + L('M80 363v18M160 363v18', SLATE, 6) + R(80, 344, 84, 9, PAPER, rx=4) +
    R(424, 352, 120, 11, BLU, rx=5) + R(530, 306, 11, 56, BLU, rx=5, t='rotate(22 536 352)') + L('M440 363v18M520 363v18', SLATE, 6) + R(436, 344, 84, 9, PAPER, rx=4) +
    # the parasol, and the table with the cut watermelon
    L('M300 164v160', SLATE, 6) + P('M190 164a110 78 0 0 1 220 0z', RED) + P('M300 86c-16 20-26 48-28 78h56c-2-30-12-58-28-78z', PAPER) +
    P('M190 164c8-34 30-58 58-70-14 22-22 44-24 70z', PAPER) + P('M410 164c-8-34-30-58-58-70 14 22 22 44 24 70z', PAPER) + C(300, 84, 6, RED_D) +
    R(292, 330, 16, 52, STONE) + R(262, 378, 76, 10, STONE, rx=5) +
    fat('watermelon', 300, 302, 96) + fat('watermelon', 252, 324, 82) + fat('watermelon', 348, 324, 82) +
    R(200, 318, 200, 12, PAPER, rx=6) + R(206, 327, 188, 5, STONE, rx=2, o=.6))

# ---------- The Cider Press: pressing apples ----------
ORDERS['cider-press'] = svg(600, 400,
    R(0, 0, 600, 400, GRN) + C(300, 196, 180, GRN_L) +
    # orchard trees
    R(80, 196, 14, 140, RED_D) + discs([(86, 150)], 54, GRN_D) + discs([(134, 190), (44, 192)], 32, GRN_D) +
    fat('apple', 64, 152, 28) + fat('apple', 108, 134, 28) + fat('apple', 118, 190, 28) +
    R(506, 196, 14, 140, RED_D) + discs([(514, 150)], 54, GRN_D) + discs([(466, 190), (556, 192)], 32, GRN_D) +
    fat('apple', 492, 134, 28) + fat('apple', 536, 152, 28) + fat('apple', 482, 190, 28) +
    # the floor
    R(0, 330, 600, 70, KRAFT) + R(0, 330, 600, 5, STONE, o=.7) + L('M150 335v65M300 335v65M450 335v65', STONE, 3, .7, 'butt') +
    # the press: frame, screw and handle
    R(291, 62, 18, 92, SLATE) + L('M291 96l18 6M291 114l18 6M291 132l18 6', STONE, 3, cap='butt') +
    R(226, 54, 148, 12, INK, rx=6) + discs([(228, 60), (372, 60)], 10, INK) +
    R(196, 86, 20, 218, RED_D) + R(384, 86, 20, 218, RED_D) + R(182, 80, 236, 26, RED_D, rx=5) + R(182, 80, 236, 9, RED, rx=4) +
    # apples under the plate, in the slatted tub
    fat('apple', 262, 198, 48) + fat('apple', 338, 198, 48) + fat('apple', 300, 196, 52) + R(232, 148, 136, 14, SLATE, rx=4) +
    P('M228 182h144l-8 120H236z', YEL_D) + L('M258 184l2 116M286 184l1 116M314 184l-1 116M342 184l-2 116', ORANGE, 3, .7, 'butt') +
    L('M230 208h140M234 270h132', SLATE, 8, cap='butt') + L('M229 185h142', YEL, 5, cap='butt') +
    # the tray, the spout and the juice
    L('M426 316v32', YEL, 8, cap='butt') + R(190, 300, 220, 18, RED_D, rx=4) + P('M404 302h28v12h-28z', RED_D) + R(190, 300, 220, 6, RED, rx=3) +
    R(210, 318, 18, 46, RED_D) + R(372, 318, 18, 46, RED_D) + shadow(206, 394, 364) +
    shadow(404, 452, 388) + P('M402 346h50l-6 42h-38z', PALE) + E(427, 347, 24, 6, YEL) + L('M404 346c2-26 44-26 46 0', SLATE, 4) +
    # apples waiting, and bottled cider
    crate(40, 300, 140, 68, front=[('apple', 27, 56), ('apple', 70, 58), ('apple', 113, 56)], back=[('apple', 48, 50), ('apple', 92, 50)]) +
    ''.join(shadow(x - 14, x + 14, 372) + R(x - 14, 300, 28, 72, YEL, rx=6) + R(x - 6, 274, 12, 30, YEL) + R(x - 8, 268, 16, 8, RED, rx=2) +
            R(x - 14, 322, 28, 26, PAPER) + L(f'M{x - 7} 335h14', INK, 5) for x in (488, 528)))

# ---------- The Company Picnic: watermelon for the family day ----------
bunting = ''
for i, t in enumerate((.14, .32, .5, .68, .86)):
    for x0, x1 in ((140, 0), (460, 600)):
        x, y = x0 + (x1 - x0) * t, 150 + 96 * t * (1 - t)
        bunting += P('M-11 0h22l-11 26z', (RED, BLU, PAPER)[i % 3], t=f'translate({n(x)} {n(y)})')
ORDERS['company-picnic'] = svg(600, 400,
    R(0, 0, 600, 400, YEL) + C(300, 150, 150, YEL_L) +
    # hills and the lawn
    P('M0 236q150-66 300-18t300-30v212H0z', GRN) + P('M0 306q300-36 600 0v94H0z', LEAF) +
    # a tree
    R(58, 190, 16, 126, RED_D) + discs([(66, 150)], 50, GRN_D) + discs([(108, 186), (30, 190)], 32, GRN_D) +
    # the marquee: striped roof, a flag, poles and bunting
    L('M140 150Q70 198 0 150M460 150Q530 198 600 150', INK, 3) + bunting +
    L('M300 60v-24', INK, 4) + P('M300 34h28l-9 8 9 8h-28z', RED) +
    L('M156 168v152M444 168v152', SLATE, 7, cap='butt') +
    P('M150 152l150-92 150 92z', PAPER) + P('M300 60L210 152h60zM300 60l30 92h60z', BLU) +
    P('M140 150h320v14' + 'q-20 14-40 0' * 8 + 'z', BLU) + L('M140 153h320', BLU_D, 5, cap='butt') +
    # balloons
    L('M444 172C456 150 468 128 478 110M444 172C470 160 500 140 520 124M444 172C462 140 486 100 500 84', INK, 2) +
    E(478, 92, 17, 21, RED) + E(522, 106, 17, 21, BLU) + E(502, 64, 17, 21, PAPER) + L('M471 84q2-8 8-10M515 98q2-8 8-10', PAPER, 3, .7) +
    # the table with the cut watermelon
    R(176, 250, 248, 74, PAPER) + L('M176 306h248', RED, 8, cap='butt') + R(168, 244, 264, 10, PALE, rx=4) +
    fat('watermelon', 300, 240, 100) + fat('watermelon', 226, 250, 84) + fat('watermelon', 374, 250, 84) +
    # a blanket with a basket and one more slice
    P('M52 346h190l34 54H16z', RED) + L('M98 346l-18 54M146 346l-2 54M194 346l16 54M42 364h210M30 384h234', PAPER, 4, .85, 'butt') +
    L('M84 322c0-36 54-36 54 0', YEL_D, 7) + P('M72 322h78l-8 44H80z', YEL_D) + L('M76 336h70M79 352h64', ORANGE, 4, .8, 'butt') + R(66, 316, 90, 12, YEL, rx=6) +
    fat('watermelon', 200, 384, 64) +
    # a cool box and a ball
    R(452, 322, 92, 56, BLU, rx=6) + R(446, 310, 104, 18, PAPER, rx=6) + L('M474 310c0-20 46-20 46 0', SLATE, 5) + L('M464 350h68', BLU_L, 5) +
    C(404, 366, 22, PAPER) + P('M404 344a22 22 0 0 1 0 44c-13-12-13-32 0-44z', RED) + P('M404 344a22 22 0 0 0 0 44c13-12 13-32 0-44z', BLU, .9))

# ---------- The Pie Factory: apple pies for the shops in town ----------
def pie(cx, base):
    return (L(f'M{cx - 12} {base - 46}q7-8 0-16t0-16M{cx + 12} {base - 46}q7-8 0-16t0-16', STONE, 4) +
            P(f'M{cx - 36} {base - 14}a36 26 0 0 1 72 0z', YEL_D) +
            L(f'M{cx - 18} {base - 30}l8 12M{cx} {base - 36}v18M{cx + 18} {base - 30}l-8 12', ORANGE, 4) +
            R(cx - 42, base - 19, 84, 10, YEL, rx=5) + P(f'M{cx - 38} {base - 9}h76l-9 9h-58z', STONE))


ORDERS['pie-factory'] = svg(600, 400,
    R(0, 0, 600, 400, KRAFT) + cloud(300, 52, .9, .7) + cloud(500, 36, .7, .7) +
    # the factory: chimneys, a saw-tooth roof, windows
    R(84, 44, 32, 90, RED_D) + R(78, 40, 44, 12, RED, rx=3) + R(136, 66, 26, 60, RED_D) + R(131, 62, 36, 10, RED, rx=3) +
    discs([(104, 22)], 16, PAPER, .95) + discs([(128, 10), (152, 46)], 11, PAPER, .95) +
    P(''.join(f'M{x} 152V104l104 48z' for x in range(40, 560, 104)), RED_D) + R(40, 150, 520, 172, PAPER) + R(40, 150, 520, 8, PALE) +
    rrects([(62, 178), (132, 178), (424, 178), (494, 178)], 46, 54, 6, BLU_L) + L('M85 178v54M155 178v54M447 178v54M517 178v54M62 205h46M132 205h46M424 205h46M494 205h46', PAPER, 3, cap='butt') +
    # the floor
    R(0, 322, 600, 78, STONE) + R(0, 322, 600, 5, SLATE, o=.35) +
    # the belt on its legs
    R(74, 312, 12, 54, SLATE) + R(294, 312, 12, 54, SLATE) + R(514, 312, 12, 54, SLATE) +
    R(36, 292, 528, 22, KRAFT, rx=11) + discs([(x, 303) for x in range(60, 560, 48)], 6, SLATE) +
    # apples go in, pies come out
    fat('apple', 84, 294, 58) + fat('apple', 140, 294, 58) + fat('apple', 196, 294, 58) + pie(430, 293) + pie(514, 293) +
    # the machine: hopper, pipe, dial and buttons
    fat('apple', 272, 118, 42) + P('M238 110h68l-12 38h-44z', STONE) + R(328, 118, 20, 32, STONE) + R(323, 112, 30, 9, SLATE, rx=4) +
    discs([(340, 92)], 13, PAPER, .95) + discs([(360, 74)], 9, PAPER, .95) +
    R(226, 146, 148, 150, GRN, rx=10) + R(350, 146, 24, 150, GRN_D, rx=10) + R(226, 146, 148, 8, GRN_L, rx=4) +
    C(274, 198, 26, PAPER) + L('M274 198l12-14', RED, 5) + C(274, 198, 5, INK) + L('M274 178v5M294 198h-5M254 198h5', INK, 3) +
    discs([(326, 186)], 8, RED) + discs([(326, 210)], 8, YEL) + L('M250 248h76M250 262h76M250 276h76', GRN_D, 5) +
    R(218, 250, 12, 44, INK, rx=4) + R(370, 250, 12, 44, INK, rx=4) +
    # boxed pies, ready to go
    shadow(444, 556, 388) + R(444, 348, 112, 40, PAPER, rx=3) + R(456, 328, 88, 22, PALE, rx=3) + L('M444 366h112', RED, 7, cap='butt') + R(494, 328, 10, 60, RED))

# ---------- The Royal Banquet: mango for the palace dinner ----------
def candle(x):
    return (R(x - 5, 204, 10, 50, PAPER) + E(x, 194, 6, 10, ORANGE) + E(x, 197, 3, 5, YEL) + R(x - 9, 252, 18, 6, YEL, rx=3) +
            R(x - 4, 258, 8, 20, YEL_D) + P(f'M{x - 14} 286l6-10h16l6 10z', YEL))


def cloche(x):
    return (R(x - 62, 280, 124, 8, STONE, rx=4) + P(f'M{x - 52} 282a52 46 0 0 1 104 0z', PALE) + P(f'M{x + 14} 282a66 60 0 0 0-18-44c30 2 54 20 56 44z', STONE) +
            L(f'M{x - 36} 268a40 36 0 0 1 20-24', PAPER, 5) + C(x, 233, 7, SLATE))


ORDERS['royal-banquet'] = svg(600, 400,
    R(0, 0, 600, 400, RED) + C(300, 184, 172, RED_L) +
    # the drapes, tied back
    P('M0 0h126c0 96-34 150-70 186-22 22-40 40-56 70z', RED_D) + P('M600 0H474c0 96 34 150 70 186 22 22 40 40 56 70z', RED_D) +
    L('M40 0c0 70-10 120-40 170M84 0c0 80-20 130-56 180M560 0c0 70 10 120 40 170M516 0c0 80 20 130 56 180', RED, 4, .6) +
    L('M22 204l40-22M578 204l-40-22', YEL, 9) + L('M62 184v26M538 184v26', YEL, 5) +
    # the chandelier
    L('M300 0v52', YEL_D, 5, cap='butt') + L('M232 84q68 40 136 0', YEL, 7) + L('M266 72q34 22 68 0', YEL, 6) + C(300, 60, 11, YEL) + C(300, 98, 7, YEL_D) +
    ''.join(R(x - 4, y, 8, 20, PAPER) + E(x, y - 7, 4, 7, ORANGE) for x, y in ((232, 62), (266, 50), (334, 50), (368, 62))) +
    # the table: white cloth, a runner with a crown
    R(0, 284, 600, 116, PAPER) + R(0, 284, 600, 9, PALE) + L('M0 380h600', YEL, 6, cap='butt') +
    R(236, 284, 128, 116, RED) + L('M247 284v116M353 284v116', YEL, 4, cap='butt') +
    P('M272 362l-7-36 19 15 16-27 16 27 19-15-7 36z', YEL) + R(272, 362, 56, 8, YEL_D, rx=3) + discs([(265, 326), (300, 314), (335, 326)], 5, YEL) +
    # covered dishes and candles
    cloche(110) + cloche(490) + candle(196) + candle(404) +
    # the golden stand, heaped with mangoes
    R(293, 176, 14, 104, YEL_D) + P('M258 288l12-12h60l12 12z', YEL) +
    fat('mango', 300, 190, 70) + E(300, 192, 60, 9, YEL_D) + R(240, 184, 120, 8, YEL, rx=4) +
    fat('mango', 300, 262, 66) + fat('mango', 238, 264, 64) + fat('mango', 362, 264, 64) +
    E(300, 268, 106, 11, YEL_D) + R(194, 258, 212, 9, YEL, rx=4))

# ---------- The School Canteen: fruit cups for Friday recess ----------
def fruit_cup(cx):
    return (fat('blueberry', cx - 13, 206, 34) + fat('blueberry', cx + 13, 206, 34) + fat('blueberry', cx, 192, 36) +
            P(f'M{cx - 28} 196h56l-8 44h-40z', PAPER) + L(f'M{cx - 25} 212h50', RED, 5, cap='butt'))


ORDERS['school-canteen'] = svg(600, 400,
    R(0, 0, 600, 400, YEL) +
    # the tiled lower wall and the floor
    R(0, 268, 600, 74, YEL_L) + L(''.join(f'M{x} 268v74' for x in range(30, 600, 60)) + 'M0 305h600', YEL, 3, cap='butt') +
    R(0, 340, 600, 60, STONE) + R(0, 340, 600, 5, SLATE, o=.35) +
    # the serving hatch, its shutter rolled up
    R(104, 62, 392, 206, BLU, rx=8) + R(116, 74, 368, 182, BLU_L) + R(116, 74, 368, 34, PALE) + L('M116 86h368M116 97h368', STONE, 3, cap='butt') +
    R(282, 104, 36, 9, SLATE, rx=4) +
    # inside: a shelf with bowls and a pot
    L('M116 162h368', PAPER, 6, .8, 'butt') + rrects([(138, 150), (142, 141), (146, 132)], 56, 9, 4, PAPER) +
    R(404, 132, 60, 28, STONE, rx=5) + R(398, 126, 72, 9, SLATE, rx=4) + C(434, 122, 5, SLATE) + L('M224 124v38M244 124v38', PAPER, 4, .8) + discs([(224, 126), (244, 126)], 7, PAPER) +
    # the counter: a tray of fruit cups
    R(92, 250, 416, 18, PAPER, rx=5) + R(104, 268, 392, 7, STONE, o=.6) + R(150, 238, 300, 14, RED, rx=7) +
    fruit_cup(192) + fruit_cup(264) + fruit_cup(336) + fruit_cup(408) +
    # the school bell and the clock
    C(62, 140, 24, RED) + C(62, 140, 10, RED_D) + C(62, 140, 4, YEL) + R(56, 164, 12, 14, RED_D, rx=3) +
    C(540, 140, 26, INK) + C(540, 140, 21, PAPER) + L('M540 140v-13M540 140l10 6', INK, 4) +
    # a table and benches
    L('M112 366v34M488 366v34', SLATE, 8, cap='butt') + R(70, 352, 460, 14, PALE, rx=7) + R(110, 384, 380, 11, KRAFT, rx=5))

# ---------- The Smoothie Stand: blueberry smoothies at the night market ----------
def smoothie(cx):
    return (L(f'M{cx + 2} 176l9-46', RED, 5) + P(f'M{cx - 20} 174h40l-6 54h-28z', BLU_L) + P(f'M{cx - 22} 174a22 17 0 0 1 44 0z', PAPER, .85) +
            R(cx - 24, 171, 48, 7, PAPER, rx=3) + L(f'M{cx - 12} 190v26', PAPER, 4, .6))


lights = [(30 + 540 * t / 10, 36 + 150 * (t / 10) * (1 - t / 10)) for t in range(1, 10)]
ORDERS['smoothie-stand'] = svg(600, 400,
    R(0, 0, 600, 400, PINK) + C(300, 214, 190, PAPER, .22) +
    # the night market: other stalls, a string of lights
    P('M-10 196l36-40h92l36 40z', RED_L) + R(14, 196, 116, 150, RED_L, o=.6) + P('M446 196l36-40h92l36 40z', RED_L) + R(470, 196, 116, 150, RED_L, o=.6) +
    L('M30 36Q300 110 570 36', INK, 3) + discs(lights, 14, PAPER, .35) + discs(lights, 8, YEL) +
    # the street
    R(0, 340, 600, 60, KRAFT) + R(0, 340, 600, 5, STONE, o=.7) +
    # the stand: striped canopy on poles
    L('M176 112v116M424 112v116', SLATE, 6, cap='butt') + P('M150 100l30-46h240l30 46z', BLU) +
    P('M222 54h52l-6 46h-64zM326 54h52l18 46h-64z', PAPER) + P('M150 98h300v10' + 'q-15 14-30 0' * 10 + 'z', BLU_D) +
    # the cart: counter, a blueberry on its front, wheels
    discs([(196, 350), (404, 350)], 26, INK) + discs([(196, 350), (404, 350)], 10, STONE) +
    R(152, 236, 296, 100, BLU, rx=6) + R(152, 236, 296, 10, BLU_D) + rrects([(166, 256), (398, 256)], 36, 64, 6, BLU_L) +
    C(300, 288, 40, PAPER) + fat('blueberry', 300, 316, 62) + R(140, 224, 320, 14, PAPER, rx=5) +
    # the blender, three smoothies and a bowl of blueberries
    R(184, 200, 52, 26, SLATE, rx=5) + C(210, 213, 6, YEL) + P('M182 124h56l-7 78h-42z', PAPER, .9) + P('M185 152h50l-5 50h-40z', BLU_L) +
    R(178, 116, 64, 10, INK, rx=4) + L('M238 138h12v38h-14', PAPER, 6) + discs([(200, 170), (218, 184), (204, 190)], 4, BLU) +
    smoothie(274) + smoothie(322) + smoothie(370) +
    fat('blueberry', 416, 210, 34) + fat('blueberry', 442, 210, 34) + fat('blueberry', 429, 196, 34) + P('M398 204h62a31 22 0 0 1-62 0z', PAPER) +
    # a board on the street
    P('M52 344l18-92h44l18 92z', KRAFT) + R(74, 262, 36, 54, SLATE, rx=3) + L('M82 276h20M82 290h14M82 304h18', PAPER, 4))

for slug, markup in ORDERS.items():
    save('order-' + slug, markup)

SHOP_NAMES = ['shop-' + s for s in ('rosa', 'benny', 'chen', 'saleh', 'raj', 'kiran', 'pakdin', 'farah')]
ORDER_NAMES = ['order-' + s for s in ('airline-caterer', 'beach-resort', 'cider-press', 'company-picnic', 'pie-factory', 'royal-banquet',
                                      'school-canteen', 'smoothie-stand')]
sheet(SHOP_NAMES, 'sheet-shops.png')
sheet(ORDER_NAMES, 'sheet-orders.png')
print('ok')
