"""Customer scenes 25 to 36 in the flat Market Ticket style: Jia Wen, Rizal, Devi, Marcus, Fatimah, Ben, Yuki, Hadi,
Lakshmi, Kenji, Mira and Hock Seng. Each keeps the likeness of public/art-ticket/customers/<slug>.webp and adds the
place where the person works or spends the day.

Layers, back to front, as in example_customer.py: wall or sky with a quiet pattern and the pale disc; two to four
things of the place at the sides; a soft floor, table or counter; the person; one thing in front that is theirs.

Run from the repo root: python3 docs/studio/art-drafts/cards-18/customers_c.py
"""
import math

from kit import *

# ---------------------------------------------------------------- small shape helpers


def _a(op=None, tf=None):
    return (f' opacity="{op}"' if op is not None else '') + (f' transform="{tf}"' if tf else '')


def R(x, y, w, h, fill, rx=0, op=None, tf=None):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}"' + (f' rx="{rx}"' if rx else '') + f' fill="{fill}"{_a(op, tf)}/>'


def C(cx, cy, r, fill, op=None):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"{_a(op)}/>'


def E(cx, cy, rx, ry, fill, op=None, tf=None):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{fill}"{_a(op, tf)}/>'


def P(d, fill, op=None, tf=None):
    return f'<path d="{d}" fill="{fill}"{_a(op, tf)}/>'


def S(d, stroke, w, op=None, tf=None):
    """A round-capped line (the only kind of stroke used)."""
    return f'<path d="{d}" fill="none" stroke="{stroke}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"{_a(op, tf)}/>'


def G(body, tf):
    return f'<g transform="{tf}">{body}</g>'


def tint(colour, op, y=0, h=400):
    """A light tint of a kit colour: the colour at low opacity over paper."""
    return R(0, y, 600, h, PAPER) + R(0, y, 600, h, colour, op=op)


def vlines(xs, y0, y1, colour, w=3, op=None):
    return S(''.join(f'M{x} {y0}V{y1}' for x in xs), colour, w, op)


def hlines(ys, x0, x1, colour, w=3, op=None):
    return S(''.join(f'M{x0} {y}H{x1}' for y in ys), colour, w, op)


DISC = C(300, 196, 172, PALE)

# ---------------------------------------------------------------- the bust every person shares

BODY = 'M126 400v-66c0-36 30-60 66-60h216c36 0 66 24 66 60v66z'


def _edge(y):
    """x of the left edge of the shoulders at height y."""
    if y >= 334:
        return 126.0
    lo, hi = 0.0, 1.0
    for _ in range(40):
        t = (lo + hi) / 2
        yy = (1 - t) ** 3 * 334 + 3 * (1 - t) ** 2 * t * 298 + 3 * (1 - t) * t * t * 274 + t ** 3 * 274
        lo, hi = (t, hi) if yy > y else (lo, t)
    t = (lo + hi) / 2
    return (1 - t) ** 3 * 126 + 3 * (1 - t) ** 2 * t * 126 + 3 * (1 - t) * t * t * 156 + t ** 3 * 192


def band(y0, y1, fill):
    """A stripe across the top, cut to the curve of the shoulders."""
    ys = [y0 + (y1 - y0) * i / 6 for i in range(7)]
    left = [(_edge(y), y) for y in ys]
    pts = left + [(600 - x, y) for x, y in reversed(left)]
    return P('M' + ' '.join(f'{x:.1f} {y:.1f}' for x, y in pts) + 'z', fill)


def top(fill):
    return P(BODY, fill)


def sleeves(colour):
    """Two short lines that part the arms from the chest."""
    return S('M152 364v36M448 364v36', colour, 4)


def vneck(fill):
    return P('M246 274h108l-54 68z', fill)


def tie(fill, dark):
    return P('M300 284l36 46h-72z', fill) + P('M300 284l36 46h-36z', dark)


def head(skin, shade, cheeks=((238, 216), (362, 216))):
    return (R(274, 250, 52, 36, shade) + C(300, 196, 82, skin)
            + ''.join(C(x, y, 13, RED_L, op='.45') for x, y in cheeks))


def dots(x1=270, x2=330, y=190):
    return ''.join(C(x, y, 9, INK) + C(x + 3, y - 3, 3, PAPER) for x in (x1, x2))


def happy(x1=270, x2=330, y=190):
    return ''.join(S(f'M{x - 14} {y + 5}q14-17 28 0', INK, 6) for x in (x1, x2))


def grin(y=225, w=27):
    return P(f'M{300 - w} {y}q{w} 9 {2 * w} 0c-3 13-14 21-{w} 21s-{w - 3}-8-{w}-21z', PAPER)


def smile(y=228, w=23):
    return S(f'M{300 - w} {y}q{w} 17 {2 * w} 0', INK, 6)


def glasses(x1=270, x2=330, y=190, r=22):
    ring = ''.join(C(x, y, r, PAPER, op='.3') + f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="{INK}" stroke-width="5"/>' for x in (x1, x2))
    return ring + S(f'M{x1 + r + 2} {y - 2}H{x2 - r - 2}', INK, 5)


def moustache(dy=0):
    return P('M300 220c-10-12-36-12-48 0 4 15 32 19 48 6 16 13 44 9 48-6-12-12-38-12-48 0z', INK, tf=f'translate(0 {dy})')


def bandana(fill, dark, light):
    """A scarf tied over the head with the knot at the side (Jia Wen, Marcus)."""
    return (P('M216 180A86 86 0 01384 180Q300 138 216 180z', fill)
            + P('M216 180Q300 138 384 180Q300 124 216 180z', dark)
            + S('M244 152A72 72 0 01278 127', light, 8, op='.9')
            + C(393, 184, 15, fill) + C(407, 206, 12, fill) + S('M388 180l9 8', dark, 4))


def long_hair():
    return P('M206 170a20 20 0 0120-20h148a20 20 0 0120 20v132h-188z', INK)


def spikes():
    """Nine spikes of hair behind the top of the head (Yuki, Kenji)."""
    out = ''
    for deg in (-66, -51, -33, -16, 0, 16, 33, 51, 66):
        a = math.radians(deg)
        pts = [(300 + 128 * math.sin(a), 196 - 128 * math.cos(a))]
        for da in (9, -9):
            b = math.radians(deg + da)
            pts.append((300 + 74 * math.sin(b), 196 - 74 * math.cos(b)))
        out += 'M' + ' '.join(f'{x:.1f} {y:.1f}' for x, y in pts) + 'z'
    return P(out, INK)


def hijab(fill, dark, light, skin):
    """A long scarf over head and shoulders with an oval face (Fatimah, Mira)."""
    return (P('M300 80C240 80 200 120 200 196C200 250 186 310 176 368H424C414 310 400 250 400 196C400 120 360 80 300 80z', fill)
            + S('M232 134c10-22 28-34 48-40', light, 8, op='.8')
            + P('M238 262Q300 306 362 262Q300 326 238 262z', dark)
            + S('M206 300c-6 22-12 44-16 66M394 300c6 22 12 44 16 66', dark, 5)
            + E(300, 204, 66, 74, skin)
            + C(250, 226, 12, RED_L, op='.45') + C(350, 226, 12, RED_L, op='.45'))


def star(cx, cy, r_out, r_in, n, fill):
    pts = []
    for i in range(2 * n):
        r = r_out if i % 2 == 0 else r_in
        a = math.pi * i / n
        pts.append((cx + r * math.sin(a), cy - r * math.cos(a)))
    return P('M' + ' '.join(f'{x:.1f} {y:.1f}' for x, y in pts) + 'z', fill)


def leaf(x, y, rot, size, fill, rib=None):
    """A leaf with its stem end at (x, y), pointing along `rot` degrees."""
    body = P('M0 0C8-11 24-11 32 0 24 11 8 11 0 0z', fill) + (S('M4 0h22', rib, 2) if rib else '')
    return G(body, f'translate({x} {y}) rotate({rot}) scale({size / 32:.3f})')


def fish(x, y, s=1.0, rot=0, belly=BLU_L, back=BLU):
    """A fish about 110 long, head to the left, centred on (x, y)."""
    body = (P('M34 0L62-22 55 0 62 22z', back)
            + P('M-50 0C-30-25 20-25 40 0 20 25-30 25-50 0z', belly)
            + P('M-50 0C-30-25 20-25 40 0z', back)
            + P('M-8-18l14-12 10 14z', back)
            + S('M-18-4q7 8 0 16', PAPER, 3, op='.7')
            + C(-32, -6, 6, PAPER) + C(-33, -6, 3, INK))
    return G(body, f'translate({x} {y}) rotate({rot}) scale({s})')


def bottle(x, base, w, h, liquid, cap=INK):
    """A glass bottle standing on `base`, left edge at x."""
    n = round(w * 0.34)
    return (R(x + (w - n) / 2, base - h - 16, n, 20, PAPER) + R(x + (w - n) / 2 - 2, base - h - 22, n + 4, 9, cap, rx=3)
            + R(x, base - h, w, h, PAPER, rx=7) + R(x + 3, base - h + 12, w - 6, h - 15, liquid, rx=5)
            + S(f'M{x + 8} {base - h + 20}v{h - 34}', PAPER, 3, op='.6'))


ART = {}

# ---------------------------------------------------------------- 25 Jia Wen (Marina Wen): in port for one day
skin, shade = SKINS['light']
bolts = ''.join(C(round(92 + 52 * math.sin(math.radians(a)), 1), round(140 - 52 * math.cos(math.radians(a)), 1), 3, YEL) for a in range(0, 360, 45))
handles = ''.join(S(f'M528 258L{528 + 62 * math.sin(math.radians(a)):.1f} {258 - 62 * math.cos(math.radians(a)):.1f}', YEL_D, 7) for a in range(0, 360, 45))
ART['customer-jia-wen'] = f'''
{tint(GRN_L, '.42')}{hlines(range(44, 320, 47), 0, 600, PAPER, 3, '.65')}
{DISC}
<!-- the porthole: her ship is in port for the day -->
{C(92, 140, 59, YEL_D)}{C(92, 140, 46, PAPER)}{C(92, 140, 46, BLU_L, op='.45')}
{P('M46.7 148a46 46 0 0090.6 0z', BLU)}{S('M60 164q7-6 14 0t14 0M96 174q7-6 14 0', PAPER, 3, op='.75')}
{P('M108 144v-26l18 26z', PAPER)}{S('M100 147h30', RED, 5)}
{S('M66 116q6-7 12 0q6-7 12 0', INK, 3)}{S('M60 132l12-14', PAPER, 4, op='.7')}{bolts}
<!-- the chart on the wall, with the way to the mangoes -->
{R(444, 40, 136, 118, STONE)}{R(450, 46, 136, 118, KRAFT)}
{P('M450 46h62v28c-20 12-38 0-62 18z', BLU_L)}{P('M586 164h-56c4-24 26-36 56-32z', BLU_L)}
{vlines((495, 541), 46, 164, STONE, 3)}
{''.join(C(x, y, 4, RED) for x, y in ((468, 142), (482, 130), (498, 124), (514, 120), (528, 110)))}
{fr('mango', 534, 72, 38)}{star(562, 144, 12, 4, 4, PAPER)}
{C(458, 54, 4, RED)}{C(578, 54, 4, RED)}
<!-- the wheel -->
{handles}<circle cx="528" cy="258" r="44" fill="none" stroke="{YEL_D}" stroke-width="10"/>{C(528, 258, 14, YEL_D)}{C(528, 258, 5, INK)}
<!-- the deck -->
{R(0, 326, 600, 74, KRAFT)}{R(0, 326, 600, 6, STONE, op='.7')}{vlines((34, 494, 560), 338, 400, STONE, 3, '.6')}
<!-- Jia Wen: long black hair, yellow scarf with a side knot, white top with yellow stripes -->
{long_hair()}{top(PAPER)}{band(322, 338, YEL)}{band(354, 370, YEL)}{band(386, 400, YEL)}
{head(skin, shade)}
{P('M218 186Q300 148 382 186Q300 136 218 186z', INK)}
{bandana(YEL, YEL_D, YEL_L)}{dots()}{grin()}
<!-- her sea bag, packed for shore -->
{P('M96 268c0-20 12-28 28-28s28 8 28 28z', BLU)}
{R(78, 262, 92, 150, BLU, rx=22)}{R(146, 272, 24, 140, BLU_D, rx=12)}
{S('M96 260h56', PAPER, 6)}{S('M122 260c-10 10-16 20-15 32M126 260c8 9 12 18 11 28', PAPER, 4)}
{R(94, 312, 44, 30, PAPER, rx=3)}{S('M102 322h28M102 332h16', INK, 4)}'''

# ---------------------------------------------------------------- 26 Rizal (DJ Rizal): plays at weddings
skin, shade = SKINS['tan']
swags = ''.join(P(f'M{x} 0h120v22q-60 48-120 0z', PAPER) + S(f'M{x + 24} 26q36 20 72 0', KRAFT, 3) for x in range(0, 600, 120))
rosettes = ''.join(C(x, 26, 11, YEL) + C(x, 26, 4, PAPER) for x in range(0, 601, 120))


def _manggar(x, y, r):
    """A bunga manggar: the tinsel palm blossom carried at a Malay wedding. Pole top at (x, y)."""
    out = S(f'M{x} 330V{y}', PAPER, 6)
    for i, deg in enumerate(range(-84, 85, 21)):
        a = math.radians(deg)
        cx, cy = x + 0.55 * r * math.sin(a), y - 1.05 * r * math.cos(a) - 8
        ex, ey = x + r * math.sin(a), y - 0.55 * r * math.cos(a) + 0.42 * r * abs(math.sin(a))
        out += S(f'M{x} {y}Q{cx:.1f} {cy:.1f} {ex:.1f} {ey:.1f}', (YEL, PAPER, RED, BLU_L, GRN_L)[i % 5], 6)
    return out + C(x, y, 7, YEL_D)


def _deck(cx):
    return (C(cx, 368, 31, INK) + f'<circle cx="{cx}" cy="368" r="21" fill="none" stroke="{SLATE}" stroke-width="2"/>'
            + C(cx, 368, 11, PINK) + C(cx, 368, 3, PAPER))


ART['customer-rizal'] = f'''
{tint(PINK, '.3')}{vlines(range(30, 600, 60), 40, 326, PAPER, 3, '.6')}
{swags}{rosettes}
{DISC}
<!-- the dance floor -->
{R(0, 326, 600, 74, KRAFT)}{R(0, 326, 600, 6, STONE, op='.7')}
<!-- a speaker stack on the left -->
{R(22, 96, 112, 230, INK, rx=6)}{S('M26 222h104', SLATE, 3)}{C(120, 108, 4, YEL)}
{R(52, 112, 52, 20, SLATE, rx=6)}
{C(78, 176, 27, SLATE)}{C(78, 176, 18, INK)}{C(78, 176, 7, SLATE)}
{C(78, 272, 44, SLATE)}{C(78, 272, 32, INK)}{C(78, 272, 12, SLATE)}{S('M50 256a32 32 0 0116-22', PAPER, 4, op='.35')}
<!-- bunga manggar for the wedding on the right -->
{_manggar(572, 196, 50)}{_manggar(508, 130, 62)}
<!-- Rizal: headphones with pink cups, sunglasses, black top over pink -->
{top(INK)}{vneck(PINK)}{head(skin, shade)}
{P('M221 176Q300 112 379 176Q300 150 221 176z', INK)}
{S('M207 188A94 94 0 01393 188', INK, 11)}
{R(190, 168, 32, 70, PINK, rx=14)}{R(378, 168, 32, 70, PINK, rx=14)}
{S('M199 186v32M401 186v32', PAPER, 4, op='.5')}
{R(238, 172, 58, 37, INK, rx=11)}{R(304, 172, 58, 37, INK, rx=11)}{R(290, 180, 20, 9, INK)}
{S('M250 184l10-7M316 184l10-7', PAPER, 4, op='.55')}
{grin(228)}
<!-- his decks: two turntables and a mixer -->
{R(100, 326, 400, 80, STONE, rx=8)}{R(92, 318, 416, 14, PAPER, rx=7)}{R(100, 332, 400, 5, SLATE, op='.3')}
{_deck(178)}{_deck(422)}
{S('M222 344l-22 20', PAPER, 4)}{C(222, 344, 6, SLATE)}{S('M378 344l22 20', PAPER, 4)}{C(378, 344, 6, SLATE)}
{R(256, 340, 88, 66, INK, rx=6)}{C(276, 350, 4, GRN)}{C(300, 350, 4, YEL)}{C(324, 350, 4, PINK)}
{vlines((276, 300, 324), 364, 396, SLATE, 4)}{R(268, 380, 16, 8, PAPER, rx=2)}{R(292, 368, 16, 8, PAPER, rx=2)}{R(316, 386, 16, 8, PAPER, rx=2)}'''

# ---------------------------------------------------------------- 27 Devi (Devi Bloom): grows vegetables
skin, shade = SKINS['brown']
vine_leaves = ''.join(leaf(x, y, r, 24, LEAF if i % 2 else GRN_D) for i, (x, y, r) in enumerate(
    ((56, 300, -150), (82, 286, -40), (122, 298, -130), (144, 290, -30), (68, 252, -150), (104, 244, -40),
     (130, 242, -20), (80, 204, -150), (110, 198, -30), (88, 164, -150), (106, 158, -30))))


def _sprout(x, y):
    return leaf(x, y, -130, 24, GRN) + leaf(x, y, -50, 24, GRN) + leaf(x, y, -90, 28, LEAF)


ART['customer-devi'] = f'''
{tint(BLU_L, '.32')}
{R(34, 46, 100, 22, PAPER, rx=11)}{C(66, 44, 16, PAPER)}{C(96, 38, 21, PAPER)}
{R(170, 20, 70, 16, PAPER, rx=8)}{R(396, 30, 84, 18, PAPER, rx=9)}{C(424, 28, 13, PAPER)}{C(448, 24, 16, PAPER)}
{P('M0 250C70 198 150 206 214 244S380 184 470 216S560 222 600 200V330H0z', GRN_L)}
{DISC}
<!-- the bean poles on the left -->
{S('M36 330L98 122M160 330L98 122M98 330V112', YEL_D, 7)}{S('M88 132h20', INK, 5)}
{S('M48 300Q74 284 98 296T150 294M60 252Q82 238 98 246T138 244M72 204Q88 194 98 200T124 198M82 164Q92 156 98 160T114 158', GRN, 5)}
{vine_leaves}{S('M68 302v22M112 300v24M132 296v20M86 254v20M116 250v18M92 204v16', GRN_D, 5)}
<!-- the scarecrow on the right -->
{S('M526 330V170', YEL_D, 7)}{S('M474 202h104', YEL_D, 7)}
{S('M474 202l-10-8M474 202l-12 1M474 202l-9 9M578 202l10-8M578 202l12 1M578 202l9 9', YEL, 4)}
{S('M500 272v10M513 272v13M526 272v10M539 272v13M552 272v10', YEL, 4)}
{P('M492 190h68l18 22-12 13-10-9v48h-60v-48l-10 9-12-13z', RED_L)}
{R(504, 226, 14, 14, YEL, rx=2)}{R(534, 246, 13, 13, BLU_L, rx=2)}{S('M526 196v74', RED, 3, op='.5')}
{C(526, 168, 22, KRAFT)}{S('M515 162l6 6M521 162l-6 6M531 162l6 6M537 162l-6 6', INK, 3)}{S('M517 178h18', INK, 3)}
{P('M484 158L526 118L568 158z', YEL_D)}{S('M505 150l21-22 21 22', YEL, 3)}
<!-- the vegetable bed -->
{R(0, 326, 600, 74, KRAFT)}{R(0, 326, 600, 6, STONE, op='.6')}{hlines((360, 392), 0, 600, STONE, 3, '.5')}
{_sprout(24, 358)}{_sprout(66, 358)}{_sprout(44, 390)}{_sprout(88, 390)}
{_sprout(486, 390)}{_sprout(530, 390)}{_sprout(574, 390)}
<!-- her watering can -->
{S('M502 304c-26 0-26 36 0 36', BLU, 7)}{S('M556 332L586 298', BLU, 9)}{E(590, 294, 8, 12, BLU_D, tf='rotate(40 590 294)')}
{R(500, 294, 60, 56, BLU, rx=8)}{R(500, 294, 18, 56, BLU_D, rx=8)}{R(506, 286, 48, 12, BLU_D, rx=6)}{S('M546 308v28', BLU_L, 5)}
<!-- Devi: long black hair, a yellow flower, white top over yellow -->
{long_hair()}{top(PAPER)}{vneck(YEL)}{sleeves(KRAFT)}{head(skin, shade)}
{P('M221 182Q300 118 379 182Q300 150 221 182z', INK)}
{star(368, 126, 35, 17, 8, YEL)}{C(368, 126, 10, PAPER)}
{happy()}{smile()}
<!-- her basket: greens, carrots and the mango she came for -->
{leaf(150, 332, -112, 62, GRN, GRN_D)}{leaf(160, 332, -84, 66, LEAF, GRN)}{leaf(170, 334, -58, 54, GRN, GRN_D)}
{S('M190 304l-6-16M194 304v-18M198 304l6-16', GRN, 5)}{P('M183 334c-2-16 2-28 11-32 9 4 13 16 11 32z', ORANGE)}
{fr('mango', 204, 284, 52)}
{P('M112 332h140l-14 74h-112z', YEL_D)}{S('M120 354h124M124 374h116M128 394h108', YEL, 4)}
{R(104, 324, 156, 14, YEL, rx=7)}'''

# ---------------------------------------------------------------- 28 Marcus (Marcus Hook): sells fish at dawn
skin, shade = SKINS['brown']
awning = ''.join(P(f'M{x} 0h50v30a25 14 0 01-50 0z', BLU if i % 2 == 0 else BLU_L) for i, x in enumerate(range(0, 600, 50)))
ART['customer-marcus'] = f'''
{R(0, 0, 600, 400, PAPER)}
{hlines(range(64, 320, 42), 0, 600, BLU_L, 3, '.5')}{vlines(range(24, 600, 46), 44, 320, BLU_L, 3, '.5')}
{awning}{R(0, 0, 600, 8, BLU_D)}
{DISC}
<!-- the hanging scale, weighing an apple -->
{S('M96 44v36', INK, 4)}{C(96, 112, 34, INK)}{C(96, 112, 26, PAPER)}
{S('M96 92v5M116 112h-5M76 112h5', KRAFT, 3)}{S('M96 112l13-15', RED, 4)}{C(96, 112, 4, INK)}
{S('M96 146v20M96 166L56 210M96 166L136 210', INK, 3)}
{fr('apple', 73, 166, 46)}
{P('M50 212h92a46 20 0 01-92 0z', STONE)}{R(44, 206, 104, 9, SLATE, rx=4)}
<!-- fish on hooks -->
{S('M440 70h164', INK, 6)}{vlines((472, 524, 576), 70, 90, INK, 4)}
{fish(472, 140, 0.8, -90)}{fish(524, 140, 0.8, -90, STONE, SLATE)}{fish(576, 140, 0.8, -90)}
<!-- the stall table with ice -->
{R(0, 318, 600, 82, STONE)}{R(0, 318, 600, 7, PALE)}{hlines((358,), 0, 600, SLATE, 3, '.3')}
{P('M0 326c6-26 28-32 44-18 10-18 38-18 48 0 12-10 32-4 38 18z', BLU_L, op='.55')}
{P('M470 326c8-24 30-30 44-16 12-18 40-16 48 2 12-12 32-6 40 14z', BLU_L, op='.55')}
{S('M14 314q8-8 16 0M74 304q8-8 16 0M486 312q8-8 16 0M560 306q8-8 16 0', PAPER, 4)}
{fish(64, 292, 0.85, 4, STONE, SLATE)}
{S('M506 298a11 11 0 1118 5M538 290a11 11 0 1118 5M566 300a11 11 0 1118 5', PINK, 8)}
<!-- Marcus: blue scarf with a side knot, full black beard, white top with blue stripes -->
{top(PAPER)}{band(322, 338, BLU)}{band(354, 370, BLU)}{band(386, 400, BLU)}
{head(skin, shade, ((240, 208), (360, 208)))}
{P('M214 204C226 240 262 250 282 238Q292 230 300 238Q308 230 318 238C338 250 374 240 386 204C394 262 358 352 300 354C242 352 206 262 214 204z', INK)}
{grin(262, 23)}
{bandana(BLU, BLU_D, BLU_L)}{dots()}
<!-- the catch of the day -->
{fish(436, 352, 1.2, -14)}'''

# ---------------------------------------------------------------- 29 Fatimah (Professor Fatimah): marks papers at the kopitiam
skin, shade = SKINS['tan']
slats = ''.join(f'M36 {y}h43M97 {y}h43' for y in range(72, 180, 14))
sheet_marks = (S('M14 24h56M14 42h70M14 60h70M14 78h44', SLATE, 5)
               + S('M84 20l5 6 10-13M92 56l5 6 10-13', RED, 5)
               + f'<circle cx="88" cy="88" r="12" fill="none" stroke="{RED}" stroke-width="5"/>')


def _jar(x, lid, biscuit):
    """A glass biscuit jar standing on the shelf at y = 292."""
    return (R(x, 232, 46, 60, PAPER, rx=10, op='.85') + R(x + 5, 220, 36, 14, lid, rx=4)
            + ''.join(C(x + dx, y, 7, biscuit) for dx, y in ((14, 280), (30, 281), (22, 268), (34, 262), (13, 256)))
            + S(f'M{x + 8} 244v20', PAPER, 3))


plaques = ''.join(R(x, 60, 28, 76, RED_D, rx=3) + S(f'M{x + 14} 72v12M{x + 14} 94v8M{x + 14} 112v12', YEL_L, 5) for x in (462, 508, 554))
ART['customer-fatimah'] = f'''
{tint(BLU_L, '.36')}
{R(0, 208, 600, 132, KRAFT)}{vlines(range(20, 600, 40), 218, 340, STONE, 3, '.6')}{R(0, 204, 600, 8, PAPER)}
{DISC}
<!-- the ceiling fan -->
{S('M300 0v20', INK, 5)}{P('M292 24L206 18a8 8 0 000 16l86-2z', STONE)}{P('M308 24L394 18a8 8 0 010 16l-86-2z', STONE)}{C(300, 28, 11, INK)}
<!-- green shutters, and biscuit jars on the shelf -->
{R(22, 48, 132, 144, GRN_D)}{R(30, 56, 55, 130, GRN)}{R(91, 56, 55, 130, GRN)}{S(slats, GRN_D, 4)}{C(80, 124, 4, YEL)}{C(96, 124, 4, YEL)}
{_jar(20, RED, YEL_D)}{_jar(76, GRN, ORANGE)}{R(10, 292, 126, 10, YEL_D, rx=2)}
<!-- the drinks tablets and the price board -->
{S('M452 54h144', INK, 4)}{plaques}
{R(462, 150, 120, 50, PAPER)}{R(462, 150, 120, 10, RED)}
{S('M476 172h44M476 186h58', INK, 5)}{S('M552 172h16M552 186h16', RED, 5)}
<!-- Professor Fatimah: red hijab, round glasses, white top -->
{top(PAPER)}{hijab(RED, RED_D, RED_L, skin)}
{glasses(272, 328, 192)}{dots(272, 328, 192)}{grin(232, 24)}
<!-- the marble table: exam papers, a red pen and a glass of teh tarik -->
{R(0, 340, 600, 60, PALE)}{R(0, 340, 600, 6, PAPER)}{S('M30 372l34-10 26 8M404 366l30 10 34-6M560 384l28-8', STONE, 3, op='.5')}
{G(R(-12, -12, 112, 124, STONE) + R(-6, -6, 112, 124, KRAFT) + R(0, 0, 112, 124, PAPER) + sheet_marks, 'translate(100 296) rotate(-7)')}
{S('M180 396l58-30', RED, 9)}{S('M238 366l8-4', INK, 5)}
{S('M504 300c-8-10 8-16 0-26M528 300c-8-10 8-16 0-26', PAPER, 5, op='.85')}
{E(516, 390, 50, 7, STONE)}{E(516, 387, 50, 7, PAPER)}
{S('M543 340c22 0 22 30-2 30', PAPER, 7)}
{P('M486 320h60l-6 66h-48z', PAPER)}{P('M489 344h54l-4.5 40h-45z', ORANGE)}{S('M498 350v26', PAPER, 3, op='.6')}'''

# ---------------------------------------------------------------- 30 Ben (Benny Bell): bellboy at the hotel
skin, shade = SKINS['light']
keys = ''
for row, y in enumerate((84, 128)):
    for col, x in enumerate((474, 506, 538, 570)):
        keys += C(x, y, 3, YEL)
        if (row, col) != (1, 2):
            keys += R(x - 7, y + 4, 14, 20, (RED, BLU_L, PAPER, YEL)[(col + row) % 4], rx=4) + S(f'M{x} {y + 26}v8', YEL_L, 4)
checker = ''.join(R(x, 326 if i % 2 == 0 else 363, 50, 37, PALE, op='.5') for i, x in enumerate(range(0, 600, 50)))
ART['customer-ben'] = f'''
{R(0, 0, 600, 400, KRAFT)}{''.join(R(x, 16, 100, 200, PALE, rx=3, op='.55') for x in range(14, 600, 118))}
{R(0, 236, 600, 90, STONE, op='.55')}{R(0, 230, 600, 8, PAPER)}
{R(14, 254, 100, 58, KRAFT, rx=3)}{R(486, 254, 100, 58, KRAFT, rx=3)}
{DISC}
<!-- the marble floor -->
{R(0, 326, 600, 74, STONE)}{checker}{R(0, 326, 600, 6, SLATE, op='.4')}
<!-- the luggage trolley -->
{S('M36 328V118a54 54 0 01108 0V328', YEL_D, 8)}{C(90, 58, 8, YEL_D)}
{R(66, 166, 48, 38, ORANGE, rx=6)}{R(66, 180, 48, 8, PAPER)}{S('M80 166q10-13 20 0', INK, 4)}
{R(56, 204, 68, 44, GRN, rx=6)}{R(56, 220, 68, 10, GRN_D)}{R(84, 219, 12, 12, YEL, rx=2)}
{R(48, 248, 84, 50, BLU, rx=6)}{S('M70 250v46M110 250v46', BLU_D, 6)}{R(84, 268, 12, 10, YEL, rx=2)}
{R(26, 298, 128, 14, RED, rx=4)}{C(46, 328, 11, INK)}{C(46, 328, 4, STONE)}{C(134, 328, 11, INK)}{C(134, 328, 4, STONE)}
<!-- the key board and a palm -->
{R(450, 56, 140, 116, GRN_D, rx=3)}{R(450, 56, 140, 10, YEL_D, rx=3)}{keys}
{S('M534 280C528 244 508 226 486 228M534 280C532 240 520 210 502 200M534 280C534 236 536 208 544 194M534 280C540 244 558 220 578 216M534 280C546 254 568 244 590 250', GRN, 8)}
{P('M506 328l6-44h44l6 44z', RED_D)}{R(506, 278, 56, 10, RED, rx=3)}
<!-- Ben: black cap with the peak to one side, white jacket, blue tie -->
{top(PAPER)}{sleeves(KRAFT)}{tie(BLU, BLU_D)}
{C(282, 354, 6, YEL)}{C(318, 354, 6, YEL)}{C(282, 384, 6, YEL)}{C(318, 384, 6, YEL)}
{head(skin, shade)}
{P('M214 174C206 122 250 88 300 90C352 92 396 116 404 152L456 186Q428 176 390 172Q300 148 232 168L222 186z', INK)}
{S('M236 128a70 60 0 0146-34', SLATE, 8, op='.8')}
{dots()}{grin()}
<!-- the desk bell -->
{R(404, 346, 196, 54, KRAFT)}{R(396, 338, 204, 10, YEL_D, rx=3)}
{R(444, 328, 60, 10, INK, rx=4)}{P('M450 328a24 24 0 0148 0z', YEL)}{S('M458 318a16 16 0 0110-12', YEL_L, 4)}
{S('M474 304v-8', INK, 5)}{C(474, 294, 5, INK)}'''

# ---------------------------------------------------------------- 31 Yuki (Akira Swift): trains with the fencing club
skin, shade = SKINS['light']


def _foil(x, grip):
    return (S(f'M{x} 40V214', SLATE, 4) + C(x, 38, 4, INK)
            + P(f'M{x - 16} 216a16 15 0 0132 0z', STONE) + R(x - 16, 214, 32, 6, INK, rx=2)
            + S(f'M{x} 226v28', grip, 8) + C(x, 258, 5, INK))


mesh = ''
for dx in (-24, -8, 8, 24):
    hh = 46 * math.sqrt(1 - (dx / 38) ** 2)
    mesh += f'M{160 + dx} {340 - hh:.1f}V{340 + hh:.1f}'
for dy in (-30, -10, 10, 30):
    ww = 38 * math.sqrt(1 - (dy / 46) ** 2)
    mesh += f'M{160 - ww:.1f} {340 + dy}H{160 + ww:.1f}'
ART['customer-yuki'] = f'''
{tint(SLATE, '.2')}{R(0, 244, 600, 82, SLATE, op='.14')}{vlines(range(30, 600, 60), 0, 326, PAPER, 3, '.7')}
{DISC}
<!-- the rack of foils -->
{R(26, 84, 136, 14, YEL_D, rx=3)}{R(26, 168, 136, 14, YEL_D, rx=3)}
{_foil(52, RED)}{_foil(94, BLU)}{_foil(136, YEL)}
<!-- the scoring lights, and a bench with her kit bag -->
{R(462, 56, 116, 52, INK, rx=8)}{C(492, 82, 15, RED)}{C(548, 82, 15, GRN)}{C(487, 77, 4, PAPER, op='.7')}{C(543, 77, 4, PAPER, op='.7')}
{S('M520 108v20', INK, 4)}
{R(0, 326, 600, 74, KRAFT)}{R(0, 326, 600, 6, STONE, op='.7')}{hlines((352, 378), 0, 600, STONE, 3, '.5')}
{S('M464 280v48M584 280v48', SLATE, 7)}{R(446, 268, 158, 12, YEL_D, rx=2)}
{S('M516 216c0-24 58-24 58 0', BLU_D, 6)}{R(496, 214, 98, 54, BLU, rx=14)}{R(496, 236, 98, 8, PAPER)}
{R(458, 226, 22, 42, GRN, rx=6)}{R(463, 216, 12, 12, PAPER, rx=2)}
<!-- Yuki: spiky black hair, pink headband, black top over pink -->
{spikes()}{top(INK)}{sleeves(SLATE)}{vneck(PINK)}{head(skin, shade)}
{R(216, 146, 168, 22, PINK, rx=3)}{R(216, 162, 168, 6, RED, rx=3, op='.3')}{S('M226 152h60', PAPER, 4, op='.4')}
{dots()}{smile()}
<!-- her mask -->
{P('M114 372c16 16 76 16 92 0l8 34h-108z', PAPER)}{E(160, 340, 47, 55, PAPER)}{E(160, 340, 38, 46, SLATE)}
{S(mesh, STONE, 2.5, '.8')}{R(150, 280, 20, 10, INK, rx=3)}'''

# ---------------------------------------------------------------- 32 Hadi (Hadi Hammer): lunch break at the building site
skin, shade = SKINS['tan']
holes = ''.join(C(x, y, 4, STONE) for y in (156, 216, 276) for x in range(30, 600, 60))
ART['customer-hadi'] = f'''
{tint(BLU_L, '.3')}
{P('M0 122H170V98H440V106H600V330H0z', KRAFT)}{hlines((186, 246, 306), 0, 600, PALE, 3)}{holes}
{DISC}
<!-- the crane -->
{S('M556 106V10', YEL, 9)}{S('M546 40l20 22M566 40l-20 22M546 72l20 22M566 72l-20 22', YEL_D, 3)}
{S('M600 26H436', YEL, 7)}{S('M444 26l11 12 11-12 11 12 11-12 11 12 11-12 11 12 11-12 11 12', YEL_D, 3)}{S('M450 38h100', YEL_D, 3)}
{S('M466 38v34', INK, 3)}{R(459, 70, 14, 12, RED, rx=2)}
{R(538, 14, 36, 22, PAPER, rx=3)}{R(544, 19, 14, 10, BLU)}
<!-- a hard hat sign -->
{C(524, 188, 34, BLU)}{P('M506 194a18 17 0 0136 0z', PAPER)}{R(500, 192, 48, 7, PAPER, rx=3)}
<!-- scaffolding with a bucket -->
{R(20, 208, 142, 12, YEL_D, rx=2)}
{S('M36 330V24M146 330V24', SLATE, 7)}{S('M22 112h138M22 224h138', SLATE, 7)}{S('M36 224L146 112', SLATE, 5)}
{''.join(C(x, y, 6, INK) for x in (36, 146) for y in (112, 224))}
{S('M92 112v36', INK, 3)}{S('M78 152q14-14 28 0', INK, 3)}{P('M76 152h32l-4 28h-24z', BLU)}{R(74, 150, 36, 6, BLU_D, rx=3)}
<!-- the ground, a cone and bricks -->
{R(0, 326, 600, 74, STONE)}{R(0, 326, 600, 6, SLATE, op='.45')}
{P('M496 326l18-58h12l18 58z', ORANGE)}{P('M507.8 288H532.2L535.9 300H504.1z', PAPER)}{R(486, 322, 68, 10, ORANGE, rx=3)}
{R(562, 312, 44, 13, RED, rx=2)}{R(572, 296, 44, 13, RED_D, rx=2)}{R(562, 280, 44, 13, RED, rx=2)}
<!-- Hadi: yellow hard hat, black top, white bib -->
{top(INK)}{P('M242 304h116v96h-116z', PAPER)}{P('M242 304l10-30h14l-6 30z', PAPER)}{P('M358 304l-10-30h-14l6 30z', PAPER)}
{C(254, 314, 4, STONE)}{C(346, 314, 4, STONE)}{S('M272 344h56', KRAFT, 4)}
{head(skin, shade)}
{P('M210 160a90 86 0 01180 0z', YEL)}{S('M232 120a70 60 0 0150-42', YEL_L, 9, op='.9')}
{R(190, 148, 220, 22, YEL, rx=11)}{R(200, 164, 200, 6, YEL_D, rx=3)}
{C(300, 106, 18, PAPER)}{C(300, 106, 9, PALE)}
{dots()}{grin()}
<!-- his lunch in a tiffin carrier, and his hammer -->
{S('M122 302V398M202 302V398', SLATE, 5)}{S('M122 302C122 268 202 268 202 302', SLATE, 5)}{R(146, 271, 32, 10, YEL_D, rx=5)}
{P('M130 312q32-18 64 0z', PAPER)}
{''.join(R(126, y, 72, 27, PAPER, rx=5) + R(126, y, 72, 7, BLU_L, rx=3) + C(162, y + 17, 4, RED) for y in (312, 342, 372))}
{G(R(434, 300, 14, 112, YEL_D, rx=5) + R(414, 282, 54, 24, STONE, rx=4) + R(462, 279, 12, 30, SLATE, rx=3)
   + P('M416 284c-16 0-24 8-26 20l12 2c2-6 6-9 14-9z', STONE), 'rotate(14 441 350)')}'''

# ---------------------------------------------------------------- 33 Lakshmi (Baker Lakshmi): bakes before sunrise
skin, shade = SKINS['brown']
tiles = hlines(range(30, 330, 40), 0, 600, PAPER, 3, '.8') + \
    vlines(range(40, 600, 80), 30, 70, PAPER, 3, '.8') + vlines(range(80, 600, 80), 70, 110, PAPER, 3, '.8') + \
    vlines(range(40, 600, 80), 110, 150, PAPER, 3, '.8') + vlines(range(80, 600, 80), 150, 190, PAPER, 3, '.8') + \
    vlines(range(40, 600, 80), 190, 230, PAPER, 3, '.8') + vlines(range(80, 600, 80), 230, 270, PAPER, 3, '.8') + \
    vlines(range(40, 600, 80), 270, 310, PAPER, 3, '.8')


def _loaf(x, base, fill):
    return P(f'M{x} {base}a22 21 0 0144 0z', fill) + S(f'M{x + 13} {base - 12}l6 6M{x + 25} {base - 12}l6 6', YEL_L, 4)


hat = lambda fill, op=None: (R(244, 110, 112, 48, fill, op=op) + C(254, 96, 34, fill, op=op) + C(300, 78, 38, fill, op=op) + C(346, 96, 34, fill, op=op))
ART['customer-lakshmi'] = f'''
{tint(ORANGE, '.2')}{tiles}
{DISC}
<!-- the brick oven -->
{R(52, 0, 76, 104, RED_L)}{R(8, 104, 168, 236, RED_L)}
{hlines((132, 160, 188, 216, 244, 272), 8, 176, RED_D, 3, '.3')}{vlines((70, 110), 0, 98, RED_D, 3, '.3')}
{R(0, 98, 184, 14, STONE)}
{S('M36 300v-78a56 56 0 01112 0v78', RED_D, 12)}{P('M42 300v-78a50 50 0 01100 0v78z', INK)}
{P('M56 300c-8-32 10-42 14-64 8 18 16 22 22 8 8 20 26 28 22 56z', ORANGE)}{P('M72 300c-2-16 6-22 10-34 6 12 16 16 14 34z', YEL)}
{R(26, 298, 132, 12, STONE)}
<!-- the window before sunrise, and bread on the shelves -->
{R(446, 44, 140, 128, PAPER)}{R(454, 52, 124, 112, BLU_D)}{R(454, 138, 124, 26, ORANGE)}{R(454, 152, 124, 12, YEL)}
{C(540, 84, 16, PAPER)}{C(547, 79, 14, BLU_D)}{C(478, 74, 3, PAPER)}{C(500, 108, 2.5, PAPER)}{C(562, 122, 2.5, PAPER)}{C(484, 126, 2, PAPER)}
{S('M516 54v108M456 108h120', PAPER, 6)}{R(440, 170, 152, 10, STONE)}
{R(446, 240, 150, 10, STONE)}{_loaf(452, 240, YEL_D)}{_loaf(500, 240, ORANGE)}{_loaf(548, 240, YEL_D)}
{R(446, 306, 150, 10, STONE)}{R(452, 282, 88, 24, YEL_D, rx=12)}{S('M470 288l7 10M492 288l7 10M514 288l7 10', YEL_L, 4)}{_loaf(548, 306, ORANGE)}
<!-- Lakshmi: tall white baker's hat, green earrings, white jacket -->
{top(PAPER)}{S('M260 276l40 32 40-32', KRAFT, 5)}{C(282, 322, 6, STONE)}{C(318, 322, 6, STONE)}
{head(skin, shade)}
{C(221, 232, 12, GRN)}{C(379, 232, 12, GRN)}{C(218, 229, 4, GRN_L)}{C(376, 229, 4, GRN_L)}
{G(hat(STONE, '.7'), 'translate(5 4)')}{hat(PAPER)}
{R(244, 146, 112, 12, KRAFT)}{S('M280 118V96M320 118V96', KRAFT, 4)}{S('M262 82a26 24 0 0122-18', PALE, 6)}
{happy()}{grin()}
<!-- the worktop: an apple tart, apples and her rolling pin -->
{R(0, 340, 600, 60, KRAFT)}{R(0, 340, 600, 6, PALE)}
{fr('apple', 82, 320, 48)}
{P('M140 358q62-40 124 0z', YEL)}{S('M168 352l22-16M196 354l26-18M226 354l16-12M176 340l22 14M204 334l28 18M232 340l16 10', YEL_D, 4)}
{P('M142 362h120l-12 28h-96z', YEL_D)}{vlines((164, 184, 204, 224, 244), 368, 386, YEL, 3)}{R(132, 354, 140, 11, YEL_D, rx=5)}
{fr('apple', 276, 338, 40)}
{G(R(360, 367, 28, 10, YEL, rx=5) + R(494, 367, 28, 10, YEL, rx=5) + R(384, 358, 114, 28, YEL_D, rx=7) + S('M396 366h90', YEL_L, 4),
   'rotate(-8 441 372)')}'''

# ---------------------------------------------------------------- 34 Kenji (Kenji Kaze): teaches karate after school
skin, shade = SKINS['light']
belts = ''.join(R(x - 7, 60, 14, n, c, rx=3) + S(f'M{x - 3} {60 + n - 8}h6', PAPER, 2, op='.6')
                for x, c, n in ((46, YEL, 104), (74, ORANGE, 122), (102, GRN, 110), (130, BLU, 126), (158, INK, 114)))
ART['customer-kenji'] = f'''
{R(0, 0, 600, 400, PAPER)}
{vlines(range(40, 600, 65), 36, 250, KRAFT, 4)}{hlines((90, 144, 198), 0, 600, KRAFT, 4)}
{R(0, 0, 600, 34, STONE)}{R(0, 34, 600, 6, KRAFT)}
{R(0, 250, 600, 76, KRAFT)}{R(0, 250, 600, 6, STONE)}
{DISC}
<!-- the belts, and school bags left by the wall -->
{belts}{R(28, 56, 148, 12, YEL_D, rx=5)}
{S('M44 262q13-16 26 0', INK, 4)}{R(26, 258, 62, 70, RED, rx=16)}{R(36, 292, 42, 28, RED_D, rx=8)}{R(50, 300, 14, 5, PAPER, rx=2)}
{S('M112 272q12-14 24 0', INK, 4)}{R(96, 268, 56, 60, BLU, rx=14)}{R(105, 296, 38, 24, BLU_D, rx=7)}{R(117, 303, 14, 5, PAPER, rx=2)}
<!-- the punch bag and a kick shield -->
{S('M526 34v28', INK, 4)}{R(494, 64, 64, 158, RED, rx=24)}{R(504, 58, 44, 12, INK, rx=4)}
{R(494, 100, 64, 10, RED_D)}{R(494, 180, 64, 10, RED_D)}{S('M508 120v48', RED_L, 6, op='.8')}
{R(462, 246, 86, 82, BLU, rx=12)}{S('M482 264v46M528 264v46', BLU_D, 7)}{C(505, 287, 13, PAPER)}{C(505, 287, 6, RED)}
<!-- the mats -->
{tint(LEAF, '.38', 326, 74)}{R(0, 326, 600, 6, GRN, op='.5')}{vlines((70, 530), 334, 400, GRN, 4, '.5')}
<!-- Kenji: spiky black hair, white karate jacket over blue -->
{spikes()}{top(PAPER)}{sleeves(KRAFT)}{vneck(BLU)}{S('M244 276l60 70', KRAFT, 5)}{S('M356 276l-42 50', KRAFT, 5)}
{head(skin, shade)}{happy()}{grin()}
<!-- a board for breaking -->
{G(R(366, 306, 126, 84, STONE, rx=3) + R(372, 312, 126, 84, YEL_D, rx=3) + hlines((332, 354, 376), 384, 486, YEL, 3)
   + S('M436 312l-8 22 12 16-10 20 8 26', INK, 4), 'rotate(-8 435 354)')}'''

# ---------------------------------------------------------------- 35 Mira (Herbalist Mira): sells jamu and herbal tea
skin, shade = SKINS['brown']
bunch1 = ''.join(leaf(470, 90, r, 62, c) for r, c in ((132, GRN_D), (112, GRN), (90, LEAF), (68, GRN), (48, GRN_D)))
bunch3 = ''.join(leaf(574, 90, r, 58, c) for r, c in ((130, LEAF), (108, GRN_D), (90, GRN), (72, GRN_D), (50, LEAF)))
ART['customer-mira'] = f'''
{tint(LEAF, '.36')}{vlines(range(25, 600, 50), 0, 352, PAPER, 3, '.6')}
{DISC}
<!-- shelves of jamu -->
{R(12, 112, 160, 10, YEL_D)}{R(12, 198, 160, 10, YEL_D)}{R(12, 284, 160, 10, YEL_D)}
{bottle(24, 112, 34, 48, YEL)}{bottle(72, 112, 34, 56, ORANGE, RED)}{bottle(120, 112, 34, 48, LEAF)}
{bottle(24, 198, 34, 54, GRN, RED)}{bottle(72, 198, 34, 46, YEL)}{bottle(120, 198, 34, 54, ORANGE)}
{bottle(24, 284, 34, 46, ORANGE)}{bottle(72, 284, 34, 54, LEAF, RED)}{bottle(120, 284, 34, 46, YEL)}
<!-- herbs hung up to dry, and the carrying basket -->
{S('M438 62h166', INK, 5)}{vlines((470, 522, 574), 62, 84, INK, 3)}
{bunch1}{R(462, 82, 16, 10, RED, rx=3)}
{S('M514 92l-12 76M519 92l-4 84M525 92l4 84M530 92l12 76', LEAF, 6)}{S('M522 92v70', GRN, 6)}{R(512, 82, 20, 12, PAPER, rx=3)}
{bunch3}{R(566, 82, 16, 10, RED, rx=3)}
{''.join(R(x + 8, 212, 10, 22, PAPER) + R(x + 5, 206, 16, 9, INK, rx=3) + R(x, 230, 26, 44, c, rx=6) for x, c in ((478, YEL), (510, ORANGE), (542, GRN)))}
{P('M462 272h120l-10 84h-100z', YEL_D)}{S('M468 294h108M470 316h104M472 338h100', YEL, 4)}{R(454, 264, 136, 13, YEL, rx=6)}
<!-- Mira: pink hijab with a green leaf, black top -->
{top(INK)}{hijab(PINK, RED_L, PAPER, skin)}
{G(P('M-36 0C-18-23 18-23 36 0 18 23-18 23-36 0z', GRN) + S('M-26 0h52', GRN_D, 4), 'translate(396 112) rotate(-28)')}
{happy(272, 328, 192)}{smile(230)}
<!-- the stall counter: mortar and pestle, a glass of jamu, a mango -->
{R(0, 352, 600, 48, KRAFT)}{R(0, 352, 600, 6, PALE)}
{S('M154 330L134 286', SLATE, 14)}{leaf(170, 330, -70, 34, LEAF, GRN)}{leaf(184, 332, -40, 30, GRN, GRN_D)}{C(196, 326, 6, YEL)}
{P('M112 334h104l-16 56h-72z', STONE)}{P('M180 334h36l-16 56h-24z', SLATE, op='.35')}{R(104, 326, 120, 12, STONE, rx=6)}{R(104, 326, 120, 5, PALE, rx=2, op='.7')}
{P('M404 326h54l-7 62h-40z', PAPER)}{P('M407 344h48l-5 41h-38z', YEL)}{S('M416 350v26', PAPER, 3, op='.6')}
{fr('mango', 464, 334, 54)}'''

# ---------------------------------------------------------------- 36 Hock Seng (Uncle Hock Seng): opinions on the price of apples
skin, shade = SKINS['light']
diamonds = ''.join(P(f'M{x} 344l30 21-30 21-30-21z', PALE, op='.6') for x in range(20, 620, 80))
ART['customer-hock-seng'] = f'''
{R(0, 0, 600, 400, STONE)}{vlines(range(30, 600, 60), 0, 326, KRAFT, 3, '.7')}
{DISC}
<!-- the shophouse door -->
{R(16, 36, 116, 296, BLU_D)}{R(24, 44, 100, 288, BLU)}
{S(''.join(f'M38 {y}h72' for y in range(62, 190, 14)), BLU_D, 4)}{R(38, 208, 72, 104, BLU_D, rx=4, op='.55')}{C(112, 198, 6, YEL)}
<!-- the abacus on the wall -->
{C(522, 50, 4, INK)}{R(462, 56, 120, 86, YEL_D, rx=4)}{R(470, 64, 104, 70, KRAFT)}
{vlines((484, 503, 522, 541, 560), 64, 134, INK, 3)}{R(470, 86, 104, 6, YEL_D)}
{''.join(E(x, 76 if i % 2 else 80, 8, 5, RED_D) + ''.join(E(x, y, 8, 5, INK) for y in ((98, 108, 118) if i % 3 else (104, 114, 124))) for i, x in enumerate((484, 503, 522, 541, 560)))}
<!-- the five-foot way, and his flask of tea -->
{R(0, 326, 600, 74, KRAFT)}{diamonds}{R(0, 326, 600, 6, SLATE, op='.35')}
{S('M486 280v50M574 280v50', YEL_D, 7)}{R(472, 270, 116, 11, YEL_D, rx=3)}
{S('M522 216c16 0 16 34 0 34', RED_D, 6)}{R(488, 200, 36, 70, RED, rx=8)}{R(488, 222, 36, 10, PAPER)}{R(492, 188, 28, 16, PAPER, rx=5)}{C(506, 250, 5, PAPER)}
{S('M572 252c10 0 10 12 0 12', PAPER, 4)}{P('M540 248h34v14a8 8 0 01-8 8h-18a8 8 0 01-8-8z', PAPER)}
<!-- Uncle Hock Seng: bald with side tufts, round glasses, moustache, white shirt, red tie -->
{C(214, 204, 23, INK)}{C(386, 204, 23, INK)}
{top(PAPER)}{sleeves(KRAFT)}{S('M262 276l38 22 38-22', KRAFT, 5)}{tie(RED, RED_D)}
{head(skin, shade, ((236, 226), (364, 226)))}
{glasses()}{dots()}{moustache(12)}
<!-- today's paper: the price of apples is up again -->
{G(R(360, 296, 152, 104, STONE) + R(366, 302, 152, 104, PALE)
   + S('M380 320h66', INK, 9) + S('M380 340h52M380 354h60M380 368h44M380 382h56', SLATE, 5)
   + fr('apple', 462, 312, 44) + S('M456 388l16-14 12 8 20-20', RED, 6) + P('M494 356l18-4-4 18z', RED), 'rotate(-8 440 352)')}'''

NAMES = ['customer-jia-wen', 'customer-rizal', 'customer-devi', 'customer-marcus', 'customer-fatimah', 'customer-ben',
         'customer-yuki', 'customer-hadi', 'customer-lakshmi', 'customer-kenji', 'customer-mira', 'customer-hock-seng']
for name in NAMES:
    save(name, svg(600, 400, ART[name]))
if __name__ == '__main__':
    sheet(NAMES, 'sheet-customers-c.png')
    print(len(NAMES), 'pictures written')
