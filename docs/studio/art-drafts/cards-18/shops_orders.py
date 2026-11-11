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


def pat_planks(f, o):
    d = ''.join(f'M0 {y}h600' for y in range(92, 340, 46))
    d += ''.join(f'M{x} {y}v46' for y in range(92, 330, 92) for x in (150, 450))
    d += ''.join(f'M{x} {y}v46' for y in range(138, 330, 92) for x in (40, 560))
    return L(d, f, 3, o, 'butt')


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


def counter(top=PALE, front=KRAFT, seam=STONE, y=338):
    return R(0, y, 600, 400 - y, front) + R(0, y, 600, 24, top) + R(0, y + 24, 600, 4, seam, o=.7) + \
        L(f'M100 {y + 30}v40M300 {y + 30}v40M500 {y + 30}v40', seam, 3, .7, 'butt')


def crate(x, y, w, h, front=(), back=(), body=KRAFT, light=PALE, post=STONE):
    """A slatted crate with its top edge at y. front/back: (fruit, centre offset from x, size) for the two rows of fruit."""
    out = ''.join(fat(f, x + cx, y - 4, s) for f, cx, s in back)
    out += ''.join(fat(f, x + cx, y + round(s * .24), s) for f, cx, s in front)
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


def scene(wall, pattern, disc, shade, props, body, top=PALE, front=KRAFT, seam=STONE, things='', disc_o=None):
    return svg(600, 400, R(0, 0, 600, 400, wall) + pattern + C(300, 196, 172, disc, disc_o) + props + awning(shade) + body +
               counter(top, front, seam) + things)


SHOPS = {}

# ---------- Rosa: the Haggler holds up a price tag (pink stall) ----------
skin = SKINS['tan'][0]
SHOPS['rosa'] = scene(
    PINK, pat_dots(PAPER, .22), PAPER, RED_D, disc_o=.3,
    props=
    # a hanging sign with ink bars
    L('M72 30v52M152 30v52', INK, 4) + R(52, 80, 120, 46, PAPER) + R(52, 80, 120, 8, RED) +
    L('M66 104h56M66 116h34', INK, 6) + C(150, 108, 9, YEL) +
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
    R(122, 268, 44, 96, PAPER, rx=20, t='rotate(-3 144 300)') +
    G('rotate(-8 146 190)', P('M108 152l16-18h44l16 18v94h-76z', PAPER) + C(146, 150, 6, PINK) +
      L('M146 150c2-16-8-26-22-24', INK, 3) + L('M122 178h48M122 196h30', INK, 7) + C(162, 222, 10, RED) + L('M122 222h20', STONE, 6)) +
    C(146, 262, 22, skin) + E(162, 248, 9, 14, skin, t='rotate(28 162 248)'),
    things=crate(412, 284, 146, 68, front=[('blueberry', 28, 52), ('apple', 73, 58), ('mango', 120, 56)],
                 back=[('mango', 50, 48), ('blueberry', 98, 44)]))

# ---------- Uncle Benny: Big Basket (green stall) ----------
SHOPS['benny'] = scene(
    GRN, pat_planks(GRN_D, .6), GRN_L, GRN_D,
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
    L('M404 292C404 140 546 140 546 292', YEL_D, 11) +
    fat('mango', 475, 232, 56) + fat('watermelon', 446, 268, 66) + fat('apple', 508, 272, 58) +
    fat('apple', 426, 312, 60) + fat('blueberry', 476, 312, 56) + fat('mango', 524, 312, 62) +
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
    R(438, 270, 44, 96, RED, rx=20, t='rotate(3 460 300)') + cards + C(460, 266, 22, skin) + E(444, 252, 9, 14, skin, t='rotate(-28 444 252)'),
    things=
    crate(42, 290, 140, 64, front=[('apple', 28, 52), ('mango', 71, 56), ('watermelon', 114, 54)], back=[('mango', 50, 46), ('apple', 94, 46)]) +
    # the gift
    R(160, 310, 56, 46, YEL) + R(156, 302, 64, 14, YEL_D, rx=3) + R(183, 302, 10, 54, RED) +
    E(176, 296, 12, 8, RED, t='rotate(-24 176 296)') + E(200, 296, 12, 8, RED, t='rotate(24 200 296)') + C(188, 299, 6, RED_D))

# ---------- Saleh: Nest Egg, a cash tin and saved coins (yellow stall) ----------
beads = [(x, y) for x in (458, 478, 498, 518, 538) for y in (122, 136, 150)]
SHOPS['saleh'] = scene(
    YEL, pat_checker(YEL_L, .55), YEL_L, YEL_D,
    props=
    # a tear-off calendar
    C(102, 80, 4, INK) + R(64, 84, 76, 20, RED, rx=3) + R(64, 100, 76, 76, PAPER) + discs([(82, 93), (122, 93)], 4, PAPER) +
    R(82, 114, 40, 24, INK, rx=4) + L('M78 152h48M86 164h32', STONE, 5) +
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
    P('M74 268h96l8 34H66z', BLU_D) + R(84, 276, 44, 30, GRN_L, rx=3, t='rotate(-10 106 290)') + R(104, 272, 44, 34, GRN, rx=3, t='rotate(8 126 290)') +
    L('M114 284h24', GRN_L, 5) + C(152, 292, 12, YEL) + C(152, 292, 7, YEL_D) +
    R(66, 300, 112, 56, BLU, rx=6) + R(66, 300, 112, 7, BLU_L, rx=3) + R(112, 314, 20, 24, YEL, rx=4) + C(122, 322, 4, INK) + R(120.5, 322, 3, 10, INK) +
    # a stack of coins
    R(188, 318, 40, 38, YEL_D, rx=5) + ''.join(R(188, y, 40, 7, YEL, rx=3.5) for y in (318, 328, 338, 348)) + E(208, 318, 20, 6, YEL_L) +
    crate(414, 286, 146, 68, front=[('blueberry', 28, 52), ('apple', 74, 58), ('watermelon', 120, 56)], back=[('apple', 52, 48), ('blueberry', 98, 44)]))

# ---------- Raj: Bargain Hunter, a marked-down tag (kraft stall) ----------
SHOPS['raj'] = scene(
    KRAFT, pat_hatch(PALE, .9), PALE, STONE, top=PAPER, front=STONE, seam=SLATE,
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
    L('M444 196v-12M456 190v-14M468 196v-12', PAPER, 4, .8) + C(456, 218, 14, YEL) + C(456, 218, 8, YEL_D) +
    R(426, 246, 60, 26, BLU_L, rx=6) + R(414, 262, 84, 94, BLU_L, rx=16) + R(420, 240, 72, 12, PAPER, rx=6) +
    discs(coins, 11, YEL) + discs(coins, 6, YEL_D) + C(456, 284, 15, PAPER) + heart(456, 285, 7, RED) + L('M426 280v50', PAPER, 5, .6))

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
    L('M117 206v104M78 232l22 70M158 228l-24 74', GRN_D, 4) + P('M86 322h62l-7 34H93z', ORANGE) + R(80, 314, 74, 12, RED_D, rx=4) +
    # the shade cloth on two bamboo poles, his fruit cool underneath
    R(400, 232, 138, 124, GRN_D) + L('M398 196v160M540 196v160', YEL_D, 8) + L('M394 250h8M394 304h8M536 250h8M536 304h8', ORANGE, 4) +
    crate(406, 298, 126, 58, front=[('apple', 26, 48), ('mango', 63, 50), ('blueberry', 101, 46)]) +
    P('M384 190q85 18 170 0v42q-21 13-42.5 0q-21 13-42.5 0q-21 13-42.5 0q-21 13-42.5 0z', BLU) +
    L('M384 196q85 18 170 0', BLU_L, 5) + discs([(406, 220), (448, 227), (490, 227), (532, 220)], 5, PAPER) +
    discs([(427, 224), (469, 228), (511, 224)], 3, YEL))

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
    L(arc(396, 204, 46, -52, -8) + arc(396, 204, 64, -52, -8) + arc(396, 204, 82, -52, -8), PAPER, 7, .9),
    body=
    # her arm and cupped hand, behind the ear
    P('M430 360l-36-112 36-14 40 126z', INK) + R(388, 238, 44, 12, PAPER, rx=5, t='rotate(-18 410 244)') +
    R(388, 172, 38, 70, skin, rx=18, t='rotate(10 407 207)') + L('M402 180l-3 18M414 182l-3 18', shade, 3) +
    person(
        'deep', INK,
        clothes=R(246, 306, 108, 96, PAPER) + L('M252 308l22-32M348 308l-22-32', PAPER, 9, cap='butt'),
        hair=L('M218 232a82 86 0 0 1 164 0', INK, 15, cap='butt') + C(218, 232, 12, YEL) + C(382, 232, 12, YEL),
        face=EYES + L('M276 238q24 22 48 0', INK, 8)),
    things=
    crate(42, 290, 142, 64, front=[('apple', 28, 54), ('mango', 72, 56), ('watermelon', 116, 54)], back=[('mango', 50, 46), ('apple', 96, 46)]) +
    # paper bags
    P('M508 296h44l6 60h-56z', STONE) + P('M490 310h46l6 46h-58z', KRAFT) + L('M492 322h42', STONE, 3) + L('M513 310v12', STONE, 3))

for sid, markup in SHOPS.items():
    save('shop-' + sid, markup)

SHOP_NAMES = ['shop-' + s for s in ('rosa', 'benny', 'chen', 'saleh', 'raj', 'kiran', 'pakdin', 'farah')]
sheet(SHOP_NAMES, 'sheet-shops.png')
print('ok')
