"""Customer scenes 13 to 23 (Inspector Wei to Mina Moss), in the same construction as example_customer.py.

Each picture: a wall or sky with a quiet pattern and the pale disc behind the head; the person's place at the sides;
a soft floor or counter; the bust, drawn like the picture in public/art-ticket/customers; one thing in front that is theirs.

Likeness notes. The existing pictures draw hair as a dark arc on the forehead with skin above it; here the same hairline
is kept and the hair above it is filled in (bun, bob and long hair as before). People who smile with closed eyes
(Nurul, Tan, Lina) and Zul, who is asleep, keep their closed eyes; everyone else has the ink-dot eyes of the reference.

Run from the repo root: python3 docs/studio/art-drafts/cards-18/customers_b.py
Writes customer-<slug>.svg for the eleven people and the contact sheet sheet-customers-b.png.
"""
import math

from kit import *


# ---- small shape helpers -------------------------------------------------------------------------------------------

def _o(o):
    return f' opacity="{o}"' if o is not None else ''


def P(d, fill, o=None):
    """A filled path."""
    return f'<path d="{d}" fill="{fill}"{_o(o)}/>'


def L(d, col, w, o=None):
    """A round-capped stroke (thin details only)."""
    return f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"{_o(o)}/>'


def R(x, y, w, h, fill, rx=0, o=None):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}"' + (f' rx="{rx}"' if rx else '') + f' fill="{fill}"{_o(o)}/>'


def C(cx, cy, r, fill, o=None):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"{_o(o)}/>'


def E(cx, cy, rx, ry, fill, rot=0, o=None):
    t = f' transform="rotate({rot} {cx} {cy})"' if rot else ''
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{fill}"{t}{_o(o)}/>'


def ring(cx, cy, r, col, w):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{col}" stroke-width="{w}"/>'


def donut(cx, cy, ro, ri, fill):
    """A flat ring as one shape (for anything thicker than a thin stroke)."""
    return (f'<path fill-rule="evenodd" d="M{cx - ro} {cy}a{ro} {ro} 0 1 0 {2 * ro} 0a{ro} {ro} 0 1 0-{2 * ro} 0z'
            f'M{cx - ri} {cy}a{ri} {ri} 0 1 0 {2 * ri} 0a{ri} {ri} 0 1 0-{2 * ri} 0z" fill="{fill}"/>')


def dots(points, r, fill, o=None):
    """Many small discs as one shape (wall patterns)."""
    return P(''.join(f'M{x - r} {y}a{r} {r} 0 1 0 {2 * r} 0a{r} {r} 0 1 0-{2 * r} 0z' for x, y in points), fill, o)


def star(cx, cy, ro, ri, n, fill, rot=-90.0):
    """An n-point star (ri = ro gives a 2n-sided polygon)."""
    pts = []
    for i in range(2 * n):
        r = ro if i % 2 == 0 else ri
        a = math.radians(rot + i * 180 / n)
        pts.append(f'{cx + r * math.cos(a):.1f} {cy + r * math.sin(a):.1f}')
    return P('M' + 'L'.join(pts) + 'Z', fill)


def flower(cx, cy, r, petal, centre):
    """The hair flower from the existing pictures: an eight-point star with a round centre."""
    return star(cx, cy, r, r * .5, 8, petal, rot=-78) + C(cx, cy, round(r * .32, 1), centre)


def pom(cx, cy, r, a=ORANGE, b=YEL):
    """A marigold head."""
    return star(cx, cy, r, r * .82, 9, a) + C(cx, cy, round(r * .52, 1), b)


def floor(fill=STONE, edge=SLATE, y=326, o=.45):
    """The soft floor or counter with its skirting line (never a dark bar)."""
    return R(0, y, 600, 400 - y, fill) + R(0, y, 600, 6, edge, o=o)


def disc(fill=PALE):
    return C(300, 196, 172, fill)


# ---- the bust: one construction for everybody ------------------------------------------------------------------------

SHOULDERS = 'M126 400v-66c0-36 30-60 66-60h216c36 0 66 24 66 60v66z'
ARCH = 'C206 140 246 104 300 104C354 104 394 140 394 196'      # hair outline from (206,196) over the head to (394,196)


def bust(tone, cloth, back='', garment='', hair='', feat='', neck=True, cheeks=True):
    """back (behind the body) > shoulders > garment details > neck > head > hair or hat > face."""
    skin, shade = SKINS[tone]
    return (back + P(SHOULDERS, cloth) + garment + (R(274, 250, 52, 36, shade) if neck else '') + C(300, 196, 82, skin)
            + (C(238, 216, 13, RED_L, .45) + C(362, 216, 13, RED_L, .45) if cheeks else '') + hair + feat)


def vneck(col):
    return P('M238 274h124l-62 80z', col)


def bands(col, line=None):
    s = P('M126 344h348v18H126zM126 378h348v18H126z', col)
    if line:
        s += L('M128 350h344M128 384h344', line, 4)
    return s


def coat_and_tie():
    """The white coat of the existing pictures: grey shirt front and an ink tie."""
    return (P('M232 274h136l-68 86z', KRAFT) + P('M284 284h32l6 24h-44z', INK) + P('M278 310h44l22 50-44 46-44-46z', INK)
            + L('M282 309h36', SLATE, 4) + L('M170 400v-42M430 400v-42', KRAFT, 6))


def hair_long():
    return P(f'M206 400V196{ARCH}V400z', INK)


def hair_bob():
    return P(f'M206 240V196{ARCH}v44a8 8 0 0 1-8 8h-22V196H228v52h-14a8 8 0 0 1-8-8z', INK)


def fringe(shine=True):
    return (P('M212 190C212 136 250 104 300 104C350 104 388 136 388 190Q300 136 212 190Z', INK)
            + (L('M240 146q24-24 56-27', SLATE, 6) if shine else ''))


def hair_cap():
    return P('M218 186C218 134 254 108 300 108C346 108 382 134 382 186Q300 138 218 186Z', INK) + L('M244 148q22-20 50-23', SLATE, 6)


def bun_and_flower():
    return C(300, 100, 36, INK) + L('M278 88q8-12 22-14', SLATE, 6) + flower(368, 128, 32, PINK, PAPER)


def eyes():
    return C(270, 190, 9, INK) + C(330, 190, 9, INK) + C(273, 187, 3, PAPER) + C(333, 187, 3, PAPER)


def eyes_happy():
    return L('M256 197q14-17 28 0M316 197q14-17 28 0', INK, 7)


def eyes_asleep():
    return L('M255 190q15 13 30 0M315 190q15 13 30 0', INK, 7) + L('M255 190l-6-5M345 190l6-5', INK, 5)


def smile():
    return L('M277 236q23 19 46 0', INK, 7)


def grin(y=230):
    return P(f'M270 {y}q30 9 60 0q-3 25-30 25t-30-25z', PAPER)


def mouth_o():
    return E(300, 242, 9, 11, INK) + E(300, 247, 4, 4, RED_L)


def glasses():
    return (C(270, 190, 21, PAPER, .3) + C(330, 190, 21, PAPER, .3) + ring(270, 190, 21, INK, 6) + ring(330, 190, 21, INK, 6)
            + L('M293 188q7-5 14 0', INK, 6))


def tache(y=240, s=.66):
    return (f'<g transform="translate(300 {y}) scale({s}) translate(-300 -224)">'
            + P('M300 220c-10-12-36-12-48 0 4 15 32 19 48 6 16 13 44 9 48-6-12-12-38-12-48 0z', INK) + '</g>')


# ---- 13 Inspector Wei: the office, on a case ---------------------------------------------------------------------

def wei():
    wall = R(0, 0, 600, 400, KRAFT) + L(''.join(f'M{x} 0v326' for x in range(30, 600, 60)), PALE, 3)
    window = (R(14, 34, 142, 186, INK) + R(24, 44, 122, 166, BLU_D) + C(120, 160, 15, YEL_L)
              + P('M24 210v-30h22v-22h28v34h20v-16h26v-14h26v48z', BLU)
              + ''.join(R(x, y, 6, 7, YEL) for x, y in ((56, 168), (56, 188), (80, 196), (104, 186), (130, 176), (130, 192)))
              + ''.join(R(24, y, 122, 11, PAPER) for y in range(48, 130, 19))
              + L('M36 46v102', STONE, 3) + C(36, 152, 5, STONE) + R(6, 220, 158, 10, SLATE))
    cabinet = (R(22, 246, 128, 80, SLATE) + R(30, 254, 112, 30, STONE) + R(30, 290, 112, 30, STONE)
               + R(38, 262, 28, 14, PAPER, 2) + L('M43 269h14', INK, 3) + C(128, 269, 5, INK))
    board = (R(446, 34, 140, 152, SLATE) + R(454, 42, 124, 136, PAPER)
             + R(462, 52, 48, 48, BLU_L) + fr('apple', 468, 58, 36)
             + R(522, 50, 48, 40, YEL) + L('M531 64h30M531 78h18', INK, 5)
             + R(462, 116, 44, 50, KRAFT) + E(484, 135, 8, 11, INK) + E(484, 154, 6, 5, INK)
             + R(518, 106, 52, 56, YEL_L) + fr('watermelon', 523, 112, 42)
             + L('M486 54L546 52L544 108L484 118', RED, 3)
             + ''.join(C(x, y, 5, RED) for x, y in ((486, 54), (546, 52), (544, 108), (484, 118))))
    lamp = (P('M488 270L466 326H580L556 270z', YEL_L, .45)
            + L('M546 352V300L522 240', INK, 7) + C(546, 300, 7, SLATE) + E(546, 356, 34, 8, INK)
            + P('M486 270a36 36 0 0 1 72 0z', YEL) + R(484, 264, 76, 8, YEL_D, 4))
    glass = (C(100, 318, 36, PAPER, .4) + fr('apple', 68, 286, 64) + ring(100, 318, 38, INK, 9)
             + L('M82 302a24 24 0 0 0-6 14', PAPER, 5, .85) + P('M124 350l10-10 34 34a7 7 0 0 1-10 10z', INK) + L('M137 353l20 20', SLATE, 4))
    hat = (E(300, 150, 128, 21, INK) + P('M229 148v-16c0-24 22-38 44-38h54c22 0 44 14 44 38v16z', INK)
           + P('M231 120h138l3 22H228z', YEL) + P('M229 136h142l1 6H228z', YEL_D)
           + L('M246 112q8-10 26-11', SLATE, 6) + L('M190 152q22 9 54 11', SLATE, 4))
    man = bust('light', PAPER, garment=coat_and_tie(), hair=hat, feat=eyes() + tache(240))
    return svg(600, 400, wall + disc() + window + cabinet + board + lamp + floor() + man + glass)


# ---- 14 Miss Marigold (Nurul): the flower stall --------------------------------------------------------------------

def nurul():
    wall = R(0, 0, 600, 400, GRN_L) + ''.join(R(x, 0, 40, 326, PAPER, o=.2) for x in range(20, 600, 80))
    awning = ''.join(P(f'M{x} 0h50v26a25 16 0 0 1-50 0z', PINK if i % 2 == 0 else PAPER) for i, x in enumerate(range(0, 600, 50)))

    def garland(x, n):
        s = L(f'M{x} 30v{n * 22 + 8}', GRN_D, 3)
        for i in range(n):
            s += pom(x, 52 + i * 22, 12, ORANGE if i % 2 == 0 else YEL, YEL if i % 2 == 0 else ORANGE)
        return s + P(f'M{x - 8} {44 + n * 22}h16l-8 20z', RED)

    garlands = garland(446, 7) + garland(484, 6) + garland(522, 5) + garland(560, 4)
    sign = L('M64 30v36M120 30v36', INK, 3) + R(44, 62, 96, 56, PAPER, 6) + flower(70, 90, 15, PINK, YEL) + L('M94 82h32M94 98h20', INK, 5)
    left = (L('M52 250V196M84 250V178M112 250V204', GRN_D, 5) + E(66, 226, 14, 7, LEAF, -30) + E(100, 222, 14, 7, LEAF, 30)
            + flower(52, 190, 22, RED, YEL) + flower(86, 170, 24, PINK, PAPER) + pom(114, 198, 18)
            + P('M30 244h88l-8 82H38z', PAPER) + P('M98 254h19l-7 72H92z', KRAFT) + R(30, 244, 88, 10, BLU)
            + L('M134 276V238M162 276V230', GRN_D, 5) + E(148, 254, 13, 7, LEAF, 30)
            + flower(134, 232, 19, PAPER, YEL) + flower(164, 222, 21, YEL, ORANGE)
            + P('M116 272h68l-7 54h-54z', BLU) + R(116, 272, 68, 9, BLU_D))
    right = (L('M500 262V226M536 262V212M566 262V230', GRN_D, 5) + E(518, 246, 14, 7, LEAF, 30) + E(552, 244, 14, 7, LEAF, -30)
             + flower(500, 222, 20, PAPER, YEL) + flower(538, 206, 22, RED, YEL) + flower(568, 226, 18, PINK, PAPER)
             + P('M478 258h100l-9 68h-82z', YEL) + R(478, 258, 100, 10, YEL_D))
    counter = floor(GRN, GRN_D, o=1)
    bouquet = (E(402, 302, 18, 8, LEAF, -35) + E(500, 298, 18, 8, LEAF, 35) + E(452, 256, 8, 16, LEAF)
               + E(451, 304, 9, 18, GRN) + flower(424, 292, 24, PINK, PAPER) + flower(479, 290, 23, RED, YEL) + pom(451, 274, 21)
               + P('M398 314l52 24 52-26-24 88h-56z', KRAFT) + P('M450 338l52-26-24 88h-32z', STONE)
               + L('M428 374h46', RED, 8) + C(451, 374, 7, RED_D))
    girl = bust('tan', PAPER, garment=vneck(PINK), hair=hair_cap() + bun_and_flower(), feat=eyes_happy() + smile())
    return svg(600, 400, wall + disc() + awning + garlands + sign + left + right + counter + girl + bouquet)


# ---- 15 Dr Priya: the test kitchen ----------------------------------------------------------------------------------

def priya():
    wall = R(0, 0, 600, 400, BLU_L) + L(''.join(f'M{x} 0v326' for x in range(40, 600, 52))
                                        + ''.join(f'M0 {y}h600' for y in range(14, 326, 52)), PAPER, 3, .3)
    chart = (R(30, 28, 132, 92, PAPER, 4) + C(74, 74, 30, YEL) + P('M74 74V44a30 30 0 0 1 28 40z', RED)
             + L('M120 54h30M120 72h30M120 90h18', INK, 5) + C(96, 28, 5, RED))
    shelf = (R(16, 214, 172, 10, SLATE) + L('M40 224v18M164 224v18', SLATE, 6)
             + P('M54 140h20v26l24 48H30l24-48z', PAPER, .85) + P('M43 188l-13 26h68l-13-26z', GRN) + R(50, 136, 28, 7, PAPER, 3)
             + R(108, 160, 42, 54, PAPER, 3, o=.85) + R(108, 184, 42, 30, RED) + L('M116 170h10M116 178h10', SLATE, 3)
             + R(160, 150, 12, 64, PAPER, 6, o=.85) + R(160, 180, 12, 34, YEL, 6))
    oven = (R(446, 172, 154, 154, SLATE) + R(446, 172, 154, 34, INK) + C(472, 189, 8, PAPER) + C(500, 189, 8, PAPER) + C(528, 189, 8, RED)
            + R(560, 182, 26, 14, GRN_L, 3)
            + R(462, 222, 122, 70, INK, 6) + R(470, 230, 106, 54, YEL_D, 3) + P('M488 276a35 22 0 0 1 70 0z', YEL) + R(482, 274, 82, 6, PAPER, 3)
            + R(462, 302, 122, 8, STONE, 4))
    scale = (P('M486 172l8-30h56l8 30z', PAPER) + C(522, 158, 10, BLU) + L('M522 158l5-6', PAPER, 3)
             + R(476, 134, 92, 8, STONE, 4) + fr('apple', 500, 88, 46))
    pie = (L('M70 304q-8-9 0-18t0-18M98 300q-8-9 0-18t0-18M126 304q-8-9 0-18t0-18', PAPER, 5, .85)
           + P('M40 342a58 32 0 0 1 116 0z', YEL) + L('M70 318l56 22M126 318l-56 22M98 312v28', YEL_D, 5)
           + R(30, 338, 136, 12, YEL_D, 6) + P('M40 350h116l-10 18H50z', RED) + P('M132 350h24l-10 18h-20z', RED_D))
    apples = fr('apple', 478, 326, 44) + fr('apple', 520, 334, 44)
    doc = bust('deep', PAPER, back=hair_long(),
               garment=coat_and_tie() + L('M184 372h42', KRAFT, 5) + R(192, 352, 8, 22, BLU, 4) + R(206, 356, 8, 18, RED, 4),
               hair=fringe(), feat=glasses() + eyes() + smile())
    return svg(600, 400, wall + disc() + chart + shelf + oven + scale + floor() + doc + pie + apples)


# ---- 16 Captain Ahmad: the jetty ------------------------------------------------------------------------------------

def ahmad():
    sky = (R(0, 0, 600, 400, BLU_L) + R(36, 52, 120, 22, PAPER, 11, o=.6) + R(84, 34, 76, 22, PAPER, 11, o=.6)
           + L('M418 58q9-10 18 0q9-10 18 0M196 30q7-8 14 0q7-8 14 0', PAPER, 5))
    sea = (R(0, 236, 600, 90, BLU) + L('M210 258h34M40 306h44M150 290h30M440 262h44M500 300h50M400 296h30', BLU_L, 4))
    boat = (C(120, 118, 13, PAPER, .7) + C(140, 96, 17, PAPER, .7) + C(170, 76, 21, PAPER, .7)
            + R(86, 150, 36, 50, YEL) + R(86, 150, 36, 13, INK) + L('M164 252V168', INK, 5) + C(164, 166, 6, RED)
            + R(44, 200, 104, 54, PAPER) + R(38, 194, 116, 10, INK)
            + C(70, 228, 10, BLU_D) + C(98, 228, 10, BLU_D) + C(126, 228, 10, BLU_D)
            + P('M0 250h200l-24 46H0z', RED) + R(0, 250, 198, 10, PAPER) + P('M0 284h182l-6 12H0z', RED_D)
            + L('M8 300h46M70 304h60M150 300h36', BLU_L, 4))
    light = (P('M456 244q20-34 58-36q46 2 86 36z', SLATE) + P('M508 214l8-116h28l8 116z', PAPER)
             + P('M514 128h32l1 22h-34zM511 172h38l2 22h-42z', RED) + R(504, 92, 52, 8, INK) + R(514, 66, 32, 26, YEL)
             + L('M530 66v26', INK, 4) + P('M508 68l22-22 22 22z', RED_D) + L('M462 250h40M540 252h44', BLU_L, 4))
    jetty = floor(STONE) + L(''.join(f'M{x} 336v64' for x in range(48, 600, 72)), SLATE, 3, .4)
    def band(cx, cy, deg):
        a = math.radians(deg)
        c, n = math.cos(a), math.sin(a)
        pts = [(cx + r * c - w * n, cy + r * n + w * c) for r, w in ((18, -6), (36, -8), (36, 8), (18, 6))]
        return P('M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in pts) + 'Z', PAPER)

    ringbuoy = (L('M566 332q16 12 34 8', YEL_D, 6) + R(554, 300, 24, 52, SLATE, 4) + R(547, 292, 38, 14, INK, 7)
                + donut(514, 330, 35, 19, RED) + ''.join(band(514, 330, d) for d in (45, 135, 225, 315)))
    crate = (fr('mango', 22, 268, 66) + fr('mango', 62, 260, 66) + fr('mango', 100, 270, 66)
             + R(26, 320, 126, 66, RED, 6) + R(38, 334, 102, 9, RED_D, 4) + R(38, 354, 102, 9, RED_D, 4))
    beard = P('M210 160V236C210 276 252 298 300 298C348 298 390 276 390 236V160H372C378 170 380 180 380 190C376 224 360 246 340 246'
              'C322 246 310 240 300 234C290 240 278 246 260 246C240 246 224 224 220 190C220 180 222 170 228 160Z', INK)
    cap = (P('M218 142c0-32 36-46 82-46s82 14 82 46z', PAPER) + P('M218 142c0-8 2-14 7-20c21 7 46 10 75 10s54-3 75-10c5 6 7 12 7 20z', KRAFT)
           + R(210, 138, 180, 24, INK, 3) + L('M222 146h156', SLATE, 3) + C(300, 116, 15, YEL) + C(300, 116, 7, YEL_D))
    man = bust('tan', INK, garment=bands(BLU, BLU_L), neck=False, cheeks=False,
               hair=beard + C(244, 214, 12, RED_L, .45) + C(356, 214, 12, RED_L, .45) + cap,
               feat=eyes() + P('M272 258q28 8 56 0q-3 22-28 22t-28-22z', PAPER))
    return svg(600, 400, sky + disc() + sea + boat + light + jetty + ringbuoy + man + crate)


# ---- 17 Lola Lens (Sarah): the photo studio ------------------------------------------------------------------------

def sarah():
    wall = R(0, 0, 600, 400, RED_L) + dots(
        [(x + (40 if row % 2 else 0), y) for row, y in enumerate(range(26, 320, 50)) for x in range(20, 600, 80)], 5, PAPER, .35)
    umbrella = (L('M102 326V178M102 292L66 326M102 292l36 34', INK, 7)
                + '<g transform="translate(-14 0) rotate(-35 100 150)">'
                + P('M30 150a70 70 0 0 1 140 0q-17.5-11-35 0q-17.5-11-35 0q-17.5-11-35 0q-17.5-11-35 0z', PAPER)
                + P('M100 80Q70 108 65 150q17.5-11 35 0z', PALE) + P('M100 80Q130 108 135 150q17.5-11 35 0A70 70 0 0 0 100 80z', PALE)
                + L('M100 80Q70 108 65 142M100 80V142M100 80Q130 108 135 142', KRAFT, 3) + L('M100 80v-10', INK, 5)
                + L('M100 146v22', INK, 6) + R(86, 166, 28, 22, INK, 4) + C(100, 160, 6, YEL) + '</g>')
    frames = (L('M465 34V14M551 56V14', INK, 3)
              + R(424, 34, 82, 104, INK) + R(432, 42, 66, 88, PAPER) + R(438, 48, 54, 60, BLU_L)
              + P('M453 84l-12 24h24z', PAPER) + C(453, 76, 9, SKINS['tan'][0]) + R(469, 84, 16, 24, INK) + C(477, 74, 9, SKINS['light'][0])
              + L('M446 119h38', KRAFT, 4)
              + R(516, 56, 70, 82, INK) + R(524, 64, 54, 66, PAPER) + fr('mango', 529, 72, 44))
    cake = (R(476, 300, 124, 26, PAPER) + P('M476 300h124v10l-12 8-12-8-12 8-12-8-12 8-12-8-12 8-12-8-12 8-12-8z', PINK)
            + R(498, 258, 84, 42, PAPER, 4) + R(512, 222, 56, 38, PAPER, 4) + R(526, 192, 28, 32, PAPER, 4)
            + L('M500 272q10 10 20 0t20 0 20 0 20 0M514 236q9 9 18 0t18 0 18 0', PINK, 5)
            + flower(540, 186, 13, RED, YEL))
    ground = floor(KRAFT, STONE, o=.8)
    camera = (L('M324 280C332 300 352 304 372 308M276 280C290 330 330 344 366 340', YEL, 6)
              + R(396, 294, 40, 18, STONE, 4) + R(360, 306, 112, 66, STONE, 8) + R(360, 322, 112, 34, SLATE)
              + R(370, 312, 18, 8, YEL, 2) + C(456, 315, 5, RED)
              + C(418, 340, 28, INK) + C(418, 340, 20, BLU_D) + C(418, 340, 12, BLU) + C(411, 333, 4, PAPER))
    girl = bust('light', INK, back=hair_bob(), garment=vneck(RED), hair=fringe(), feat=glasses() + eyes() + mouth_o())
    return svg(600, 400, wall + disc() + umbrella + frames + cake + ground + girl + camera)


# ---- 18 Grandpa Tan: the kopitiam -----------------------------------------------------------------------------------

def tan():
    wall = R(0, 0, 600, 400, PALE) + L(''.join(f'M0 {y}h600' for y in (40, 88, 136, 184)), KRAFT, 3, .6)
    dado = (R(0, 236, 600, 90, GRN_L) + R(0, 236, 600, 8, GRN)
            + L(''.join(f'M{x} 244v82' for x in range(22, 600, 46)) + 'M0 286h600', PAPER, 3, .45))
    cage = (L('M100 0V36', INK, 4) + C(100, 40, 7, RED) + P('M60 100a40 46 0 0 1 80 0v64H60z', PAPER, .6)
            + L('M72 146H128', RED_D, 5) + P('M88 132l-16 12h18z', YEL_D) + E(100, 130, 16, 12, YEL) + C(111, 116, 10, YEL)
            + P('M119 113l12 4-12 5z', ORANGE) + C(113, 114, 2.5, INK)
            + L('M60 100a40 46 0 0 1 80 0M60 100v62M80 61v101M100 54v108M120 61v101M140 100v62M60 132h80', INK, 3)
            + R(52, 160, 96, 12, RED, 6))
    chair = L('M50 318v-52a38 38 0 0 1 76 0v52M72 318v-44a16 16 0 0 1 32 0v44', RED_D, 8) + R(38, 312, 100, 12, RED_D, 6)
    chair_legs = L('M52 328v40M124 328v40', RED_D, 8)
    clock = (star(512, 96, 56, 56, 4, RED_D, rot=22.5) + C(512, 96, 39, PAPER)
             + ''.join(L(f'M{512 + 31 * math.cos(a):.1f} {96 + 31 * math.sin(a):.1f}L{512 + 35 * math.cos(a):.1f} {96 + 35 * math.sin(a):.1f}', INK, 3)
                       for a in (math.radians(k * 30) for k in range(12)))
             + L('M512 96V72M512 96l17 10', INK, 5) + C(512, 96, 4, RED)
             + R(490, 148, 44, 66, RED_D) + R(498, 156, 28, 50, KRAFT) + L('M512 158v26', YEL_D, 3) + C(512, 190, 8, YEL))
    ground = floor(STONE)
    table = (P('M398 356a112 26 0 0 0 224 0v12a112 26 0 0 1-224 0z', STONE) + E(510, 356, 112, 26, PALE)
             + L('M430 352q20 8 34 2M540 372q22-2 40-10', KRAFT, 3)
             + E(424, 354, 13, 5, YEL_D) + E(424, 350, 13, 5, YEL) + E(424, 346, 13, 5, YEL_D) + E(424, 342, 13, 5, YEL)
             + E(476, 352, 34, 8, PAPER) + L('M448 353q28 8 56 0', GRN, 3)
             + L('M498 322q16 2 12 14q-4 8-14 6', PAPER, 6) + P('M454 314h44v20a22 16 0 0 1-44 0z', PAPER) + R(454, 322, 44, 6, GRN)
             + E(476, 314, 22, 6, INK) + L('M468 302q-6-8 0-16t0-16M484 300q-6-8 0-16', PAPER, 4, .9)
             + fr('apple', 514, 312, 46))
    tufts = C(216, 208, 27, STONE) + C(384, 208, 27, STONE) + L('M200 198q6-10 16-12M400 198q-6-10-16-12', KRAFT, 5)
    man = bust('light', PAPER, back=tufts, garment=vneck(BLU) + C(300, 372, 4, KRAFT) + C(300, 390, 4, KRAFT)
               + L('M170 400v-42M430 400v-42', KRAFT, 6),
               feat=eyes_happy() + grin(228) + L('M286 262q14 6 28 0', SKINS['light'][1], 4))
    return svg(600, 400, wall + disc(PAPER) + dado + cage + chair + clock + ground + chair_legs + man + table)


# ---- 19 Miss Cha-Cha (Lina): the dance hall ------------------------------------------------------------------------

def lina():
    wall = R(0, 0, 600, 400, YEL_L) + ''.join(R(x, 0, 30, 326, PAPER, o=.25) for x in range(0, 600, 60))
    lights = (L('M0 22Q150 62 300 30T600 22', INK, 3)
              + ''.join(C(x, y, 8, c) for x, y, c in ((40, 38, RED), (100, 48, BLU), (160, 48, GRN), (216, 42, PINK), (384, 30, BLU),
                                                      (440, 22, RED), (500, 16, GRN), (556, 18, PINK))))
    mirror = (R(22, 62, 158, 232, RED_D) + R(32, 72, 138, 212, BLU_L) + P('M32 168L128 72h36L32 204z', PAPER, .45)
              + P('M96 284l74-74v36l-38 38z', PAPER, .45)
              + L('M44 238v22M160 238v22', INK, 6) + R(4, 230, 194, 11, KRAFT, 5) + L('M10 233H192', PAPER, 3, .6)
              + R(84, 230, 46, 64, PINK, 4) + L('M88 280h38', PAPER, 4))
    player = (R(462, 262, 124, 64, RED_D) + R(472, 274, 104, 20, RED) + C(524, 284, 4, YEL)
              + L('M556 228C566 194 552 156 526 128', BLU_D, 10)
              + R(476, 228, 96, 34, KRAFT) + R(476, 228, 96, 8, STONE) + E(522, 228, 40, 8, INK) + E(522, 227, 12, 3, RED)
              + E(500, 110, 52, 36, BLU, -32) + E(496, 114, 37, 24, BLU_D, -32) + C(504, 122, 7, INK)
              + L('M468 82a44 30 -32 0 1 30-14', BLU_L, 5)
              + E(430, 78, 8, 6, INK, -20) + L('M437 76V50l14 6', INK, 4) + E(568, 176, 8, 6, INK, -20) + L('M575 174v-26l12 6', INK, 4))
    ground = (floor(KRAFT, STONE, o=.8) + L('M0 356h600M0 382h600', STONE, 3, .7)
              + L('M80 332v24M260 332v24M520 332v24M170 356v26M350 356v26M440 356v26', STONE, 3, .7))

    def fan(cx, cy, r, a0, a1, n):
        s = ''
        for i in range(n):
            p = [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a))) for a in (a0 + (a1 - a0) * i / n, a0 + (a1 - a0) * (i + 1) / n)]
            s += P(f'M{cx} {cy}L{p[0][0]:.1f} {p[0][1]:.1f}A{r} {r} 0 0 1 {p[1][0]:.1f} {p[1][1]:.1f}Z', PINK if i % 2 == 0 else RED)
        for i in range(n + 1):
            a = math.radians(a0 + (a1 - a0) * i / n)
            s += L(f'M{cx} {cy}L{cx + r * .56 * math.cos(a):.1f} {cy + r * .56 * math.sin(a):.1f}', INK, 3)
        a, b = math.radians(a0), math.radians(a1)
        s += L(f'M{cx + r * .8 * math.cos(a):.1f} {cy + r * .8 * math.sin(a):.1f}A{r * .8:.1f} {r * .8:.1f} 0 0 1 {cx + r * .8 * math.cos(b):.1f} {cy + r * .8 * math.sin(b):.1f}', YEL, 5)
        return s + C(cx, cy, 8, INK) + C(cx, cy, 3, YEL)

    girl = bust('tan', INK, garment=vneck(PINK), hair=hair_cap() + bun_and_flower() + C(220, 236, 12, PINK) + C(380, 236, 12, PINK),
                feat=eyes_happy() + grin(228))
    return svg(600, 400, wall + disc() + lights + mirror + player + ground + girl + fan(444, 380, 88, 206, 334, 8))


# ---- 20 Sleepy Zul: asleep by day, after the night shift ---------------------------------------------------------------

def zul():
    wall = R(0, 0, 600, 400, GRN_L) + dots(
        [(x + (22 if row % 2 else 0), y) for row, y in enumerate(range(20, 330, 44)) for x in range(14, 600, 44)], 4, PAPER, .45)
    window = (R(22, 36, 164, 146, PAPER) + R(32, 46, 144, 126, BLU_L) + burst(138, 84, 30, YEL) + C(138, 84, 17, PAPER) + C(138, 84, 13, YEL)
              + L('M104 46v126M32 124h144', PAPER, 6) + R(14, 180, 180, 10, KRAFT)
              + P('M12 30h66c2 52-6 108-22 160H12z', BLU) + L('M34 40v142M56 40c2 50-2 98-10 142', BLU_D, 4)
              + P('M196 30h-30c-2 52 2 108 8 160h22z', BLU) + L('M182 40c-2 50 0 98 4 142', BLU_D, 4)
              + L('M6 30H202', INK, 7) + C(6, 30, 7, INK) + C(202, 30, 7, INK))
    stand = (R(30, 276, 124, 50, KRAFT) + R(22, 268, 140, 9, STONE) + R(42, 286, 100, 30, PALE) + C(92, 301, 5, RED_D))
    clock = (L('M78 262l-5 7M106 262l5 7', INK, 5) + C(75, 220, 10, RED_D) + C(109, 220, 10, RED_D) + L('M92 216v-6', INK, 5) + C(92, 208, 4, INK)
             + C(92, 242, 25, RED) + C(92, 242, 18, PAPER) + L('M92 242v-12M92 242l9 6', INK, 4) + C(92, 242, 3, RED)
             + L('M54 222l-9-6M50 240H38M130 222l9-6M134 240h12', INK, 4))
    vest = (C(512, 44, 5, INK) + L('M512 48v10M474 78L512 58L550 78', INK, 5)
            + P('M468 80l28-13 16 38 16-38 28 13v96h-88z', ORANGE) + R(468, 122, 88, 11, YEL_L) + R(468, 150, 88, 11, YEL_L)
            + L('M512 108v64', RED_D, 3))
    bed = (R(572, 222, 28, 104, RED_D, 8) + R(432, 308, 146, 18, RED_D) + R(432, 290, 146, 20, PAPER)
           + R(504, 264, 70, 28, PAPER, 13) + L('M518 286h42', KRAFT, 4)
           + P('M432 284h82q10 0 10 10v18h-92z', BLU) + L('M436 296h80M436 306h80', BLU_L, 4))
    ground = floor(KRAFT, STONE, o=.8)
    mug = (L('M412 288q-7-9 0-18t0-18M432 290q-7-9 0-18', STONE, 5)
           + L('M446 318q22 0 19 20q-3 14-19 12', RED, 9) + R(396, 300, 52, 58, RED, 8) + P('M436 300h4a8 8 0 0 1 8 8v42a8 8 0 0 1-8 8h-4z', RED_D)
           + E(422, 302, 24, 6, INK) + L('M407 318v24', PAPER, 4, .6))
    cap = (P('M218 168C218 132 254 112 300 112C316 112 330 110 340 104C340 110 344 114 352 114C400 118 432 152 436 206L412 208'
             'C410 190 402 176 388 166L382 168Z', YEL)
           + P('M352 114C400 118 432 152 436 206L424 207C420 160 394 128 352 114Z', YEL_D)
           + R(210, 158, 180, 24, PAPER, 12) + L('M222 176h156', KRAFT, 4) + C(424, 222, 21, PAPER) + L('M412 234q12 8 24 0', KRAFT, 5))
    man = bust('tan', PAPER, garment=bands(YEL), hair=cap, feat=eyes_asleep() + mouth_o())
    return svg(600, 400, wall + disc() + window + stand + clock + vest + bed + ground + man + mug)


# ---- 21 Anna the Artist: painting the stalls on a market morning ----------------------------------------------------

def anna():
    sky = (R(0, 0, 600, 400, YEL_L) + R(40, 40, 110, 20, PAPER, 10, o=.6) + R(440, 22, 120, 20, PAPER, 10, o=.6)
           + R(210, 12, 80, 16, PAPER, 8, o=.6))
    # the stall she is painting: awning, posts, a counter of fruit
    n, x0, x1, w0, w1 = 5, 16, 2, 140 / 5, 166 / 5
    stripes = ''.join(P(f'M{x0 + i * w0:.1f} 96h{w0:.1f}L{x1 + (i + 1) * w1:.1f} 140h-{w1:.1f}z', RED if i % 2 == 0 else PAPER) for i in range(n))
    scallops = ''.join(P(f'M{x1 + i * w1:.1f} 140h{w1:.1f}a{w1 / 2:.1f} 14 0 0 1-{w1:.1f} 0z', RED if i % 2 == 0 else PAPER) for i in range(n))
    stall = (L('M18 326V104M154 326V104', SLATE, 8) + stripes + scallops + R(2, 136, 166, 6, RED_D, o=.5)
             + fr('mango', 8, 194, 50) + fr('apple', 48, 200, 44) + fr('mango', 84, 194, 50) + fr('apple', 124, 200, 44)
             + R(8, 246, 160, 80, KRAFT) + R(0, 240, 176, 10, STONE) + L('M12 272h152M12 298h152', STONE, 3)
             + R(34, 258, 58, 30, PAPER, 3) + L('M44 273h22', INK, 5) + C(80, 273, 5, RED))
    easel = (L('M454 326L486 44M562 326L530 44M508 60V30', YEL_D, 8)
             + R(446, 66, 124, 152, PAPER) + R(454, 74, 108, 136, BLU_L) + C(540, 96, 12, YEL)
             + ''.join(R(462 + i * 18, 112, 18, 20, RED if i % 2 == 0 else PAPER) for i in range(5))
             + L('M466 132v60M548 132v60', SLATE, 4) + fr('mango', 478, 132, 58)
             + R(454, 190, 108, 20, KRAFT) + R(438, 218, 140, 11, YEL_D, 3))
    ground = floor(STONE)
    palette = (P('M82 350c0-26 28-44 64-44s64 16 64 40c0 14-12 19-24 17s-22 4-22 14c0 12-14 18-28 18c-32 0-54-19-54-45z', KRAFT)
               + C(180, 336, 9, INK) + C(106, 344, 11, RED) + C(128, 324, 11, YEL) + C(156, 318, 10, BLU) + C(108, 370, 10, GRN)
               + C(136, 384, 9, PINK) + C(140, 352, 8, PAPER))
    brush = L('M452 396L472 322', YEL_D, 8) + L('M472 322l5-18', SLATE, 10) + L('M478 300l4-12', RED, 10)
    beret = (E(286, 128, 107, 42, GRN, -12) + L('M290 90l-4-14', GRN, 9)
             + L('M206 136q30-34 84-42', GRN_L, 7, .8) + L('M214 158Q280 184 356 140', GRN_D, 6))
    girl = bust('light', INK, back=hair_bob(), garment=bands(GRN, GRN_L), hair=fringe(False) + beret, feat=eyes() + smile())
    return svg(600, 400, sky + disc() + stall + easel + ground + girl + palette + brush)


# ---- 22 Otto Oddjob (Vijay): the store room behind the market -------------------------------------------------------

def vijay():
    wall = R(0, 0, 600, 400, KRAFT) + dots([(x, y) for y in range(22, 320, 40) for x in range(20, 600, 40)], 3.5, PALE)
    tools = (L('M60 62v-14M120 62v-14M160 62v-14M88 234v-12', INK, 4)
             + R(55, 94, 11, 106, YEL_D, 5) + R(34, 70, 60, 26, SLATE, 5) + R(84, 62, 14, 42, SLATE, 4)
             + R(115, 94, 11, 98, SLATE, 5) + C(120, 82, 18, SLATE) + P('M112 60h16v22h-16z', KRAFT) + C(120, 196, 10, SLATE) + C(120, 196, 4, KRAFT)
             + L('M160 122v70', SLATE, 6) + R(149, 66, 22, 58, RED, 9) + L('M160 76v36', RED_D, 3)
             + P('M54 238l80 14v14H54z', PAPER) + P('M54 266' + 'l4 7 4-7' * 10 + 'z', PAPER) + L('M66 248l56 10', STONE, 3)
             + R(16, 230, 46, 48, RED, 10) + R(29, 244, 20, 20, KRAFT, 7))
    shelves = (R(440, 122, 160, 9, SLATE) + L('M458 131v16M582 131v16', SLATE, 6)
               + R(450, 72, 48, 50, RED) + R(450, 86, 48, 20, PAPER) + L('M458 96h20', INK, 5) + R(446, 66, 56, 8, STONE, 3)
               + R(510, 82, 40, 40, BLU) + R(510, 94, 40, 16, PAPER) + L('M517 102h16', INK, 5) + R(506, 76, 48, 8, STONE, 3)
               + R(562, 78, 38, 44, GRN) + R(562, 92, 38, 16, PAPER) + R(558, 72, 46, 8, STONE, 3)
               + R(440, 226, 160, 9, SLATE) + L('M458 235v16M582 235v16', SLATE, 6)
               + ring(490, 196, 24, ORANGE, 9) + ring(490, 196, 10, ORANGE, 7) + L('M514 200q12 6 10 20', ORANGE, 7) + R(518, 214, 12, 12, INK, 2)
               + R(544, 178, 40, 48, PAPER, 5, o=.8) + R(550, 204, 28, 18, SLATE, 3) + R(540, 170, 48, 10, RED, 4))
    roller = (C(566, 248, 4, INK) + R(561, 250, 10, 34, RED, 5) + L('M566 284v14h-24', SLATE, 5) + R(486, 288, 56, 20, BLU, 9)
              + L('M496 294h36', BLU_L, 4))
    ground = floor(STONE)
    box = (L('M472 330v-12h56v12', INK, 8) + R(434, 328, 132, 62, RED, 6) + R(434, 348, 132, 7, RED_D) + R(492, 340, 18, 20, YEL, 3)
           + R(446, 364, 30, 6, RED_L, 3, o=.7))
    tin = (L('M56 330q28-40 56 0', SLATE, 4) + P('M48 328h72l-4 56H52z', BLU) + P('M106 328h14l-4 56h-12z', BLU_D) + R(42, 322, 84, 9, STONE, 4)
           + R(49, 344, 70, 20, PAPER) + L('M60 354h30', INK, 5)
           + L('M24 312h56', YEL_D, 9) + R(78, 304, 12, 16, SLATE, 2) + R(90, 302, 24, 20, INK, 3))
    cap = (P('M214 170C208 122 248 88 304 88C352 88 388 108 404 136C420 152 434 166 440 178C444 186 438 192 428 192'
             'C418 192 408 190 400 184C388 174 378 164 364 158C316 150 262 156 214 170Z', INK)
           + L('M238 128q22-24 58-27', SLATE, 6) + L('M398 132q-20 6-32 24', SLATE, 4))
    man = bust('deep', PAPER, garment=L('M262 279q38 26 76 0', KRAFT, 8) + L('M170 400v-42M430 400v-42', KRAFT, 6)
               + L('M188 352v26h40v-26', KRAFT, 5) + L('M200 370v-30', YEL, 7) + L('M200 340v-5', INK, 6),
               hair=cap, feat=glasses() + eyes() + tache(242))
    return svg(600, 400, wall + disc() + tools + shelves + roller + ground + man + box + tin)


# ---- 23 Mina Moss (Hui Min): the park camp -------------------------------------------------------------------------

def hui_min():
    sky = (R(0, 0, 600, 400, PALE) + R(40, 46, 110, 20, PAPER, 10) + R(86, 30, 70, 20, PAPER, 10) + R(446, 40, 120, 20, PAPER, 10))
    peaks = (P('M-20 250L74 120l44 52 34-32 96 110z', KRAFT) + P('M74 120l-22 30 22-8 16 14 6-10z', PAPER)
             + P('M372 250l90-116 40 44 36-36 82 108z', KRAFT) + P('M462 134l-22 28 22-8 14 12 6-10z', PAPER))
    hills = P('M0 250q70-34 150-14t150 18 150-22 150 6v100H0z', LEAF)

    def pine(x, base, h, w):
        s = R(x - 5, base - 20, 10, 26, RED_D)
        for i, k in enumerate((1, .8, .6)):
            y = base - 20 - i * h * .26
            s += P(f'M{x - w * k / 2:.1f} {y:.1f}L{x} {y - h * .44:.1f}L{x + w * k / 2:.1f} {y:.1f}z', GRN_D if i % 2 == 0 else GRN)
        return s

    trees = pine(40, 322, 230, 84) + pine(156, 312, 150, 60) + pine(566, 322, 240, 88) + pine(446, 310, 130, 56)
    tent = (P('M22 326L100 232l80 94z', RED) + P('M100 232l80 94h-44z', RED_D) + P('M100 262l-24 64h48z', INK)
            + L('M100 232v-12', INK, 4))
    sign = (L('M510 326V118', RED_D, 9) + P('M452 132h98l18 17-18 17h-98z', YEL) + L('M466 149h58', INK, 6)
            + P('M566 184h-98l-18 17 18 17h98z', YEL) + L('M486 201h56', INK, 6) + C(510, 118, 6, RED_D))
    ground = (floor(GRN_L, GRN, o=.5) + L('M98 380l6-12 6 12M4 392l6-12 6 12M580 362l6-12 6 12', GRN, 4))
    fire = ('<g transform="translate(-30 4)">' + L('M52 356l68-16M52 338l68 18', RED_D, 10)
            + P('M86 346c-24-8-24-34-8-50c0 12 6 16 12 10c6-14 2-26-4-36c26 12 40 38 26 62c-5 9-14 14-26 14z', ORANGE)
            + P('M88 346c-12-4-13-18-5-27c1 7 5 8 8 4c4-7 3-12 1-17c12 8 17 22 10 32c-3 5-8 8-14 8z', YEL) + '</g>')
    crate = (fr('watermelon', 430, 284, 76) + fr('watermelon', 494, 284, 76)
             + R(428, 338, 144, 62, KRAFT, 4) + L('M428 358h144M428 380h144', STONE, 4) + L('M446 340v60M554 340v60', STONE, 6))
    leaf = (P('M356 128C366 100 400 86 434 92C426 122 392 138 356 128Z', GRN) + L('M362 126q34-10 66-32', GRN_D, 4))
    badge = P('M192 316h26v14c0 11-6 17-13 20c-7-3-13-9-13-20z', YEL) + C(205, 329, 5, GRN)
    girl = bust('light', INK, back=hair_long(), garment=vneck(PINK) + badge, hair=fringe() + leaf, feat=eyes() + smile())
    return svg(600, 400, sky + disc(PAPER) + peaks + hills + trees + tent + sign + ground + girl + fire + crate)


PICTURES = [('wei-jie', wei), ('nurul', nurul), ('priya', priya), ('ahmad', ahmad), ('sarah', sarah), ('tan', tan), ('lina', lina),
            ('zul', zul), ('anna', anna), ('vijay', vijay), ('hui-min', hui_min)]

if __name__ == '__main__':
    names = []
    for slug, draw in PICTURES:
        save('customer-' + slug, draw())
        names.append('customer-' + slug)
    sheet(names, 'sheet-customers-b.png')
    print('ok', len(names))
