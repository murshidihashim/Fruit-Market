# Event art in the house style of the owner's 13 event pictures (public/art/events):
# a wide two-tone sunburst, a faded skyline, big central objects with thick navy outlines,
# dotted halftone shading on the lower right, white shine marks, rosy-cheeked busts cropped at the
# bottom edge, cream price tags with a hole, and paper grain (added after rendering, in post.py).
import base64, math, os, random
W, H = 520, 391
HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = '/home/user/Fruit-Market/node_modules/@fontsource/'
def font64(p): return base64.b64encode(open(FONTS + p, 'rb').read()).decode()
RUBIK = font64('rubik/files/rubik-latin-800-normal.woff2')
SLAB = font64('alfa-slab-one/files/alfa-slab-one-latin-400-normal.woff2')

INK = '#263149'
Y, Y2, YL = '#e3a31e', '#ebb64a', '#f5d98a'
CREAM, CREAM2 = '#f3e7cb', '#e6d2a8'
R, R2 = '#d8462a', '#e06a4f'
O, O2 = '#e07920', '#e8964c'
B, B2, BD = '#7f9bcf', '#97afd8', '#3d5aa8'
G, G2, G3 = '#306a4b', '#88ad70', '#9cbf84'
WOOD, WOODL = '#b3763f', '#c98d55'
GREY = '#a5aaaa'
SKIN, CHEEK = '#f2c296', '#e06a4f'
WHITE = '#fbf4e4'
MANGO = '#f2a62a'
SW = 5  # outline width

_id = [0]
def uid(p='c'):
    _id[0] += 1
    return f'{p}{_id[0]}'

def defs():
    return f'''<defs>
<style>
@font-face {{ font-family: 'R8'; src: url(data:font/woff2;base64,{RUBIK}) format('woff2'); }}
@font-face {{ font-family: 'Slab'; src: url(data:font/woff2;base64,{SLAB}) format('woff2'); }}
</style>
<pattern id="dots" width="6.5" height="6.5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3.25" cy="3.25" r="1.55" fill="{INK}"/></pattern>
<pattern id="dotsL" width="6.5" height="6.5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="3.25" cy="3.25" r="1.5" fill="{WHITE}"/></pattern>
<linearGradient id="gBR" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#000"/><stop offset=".52" stop-color="#000"/><stop offset=".78" stop-color="#fff"/><stop offset="1" stop-color="#fff"/></linearGradient>
<linearGradient id="gR" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000"/><stop offset=".6" stop-color="#000"/><stop offset=".9" stop-color="#fff"/></linearGradient>
<mask id="mBR" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#gBR)"/></mask>
<mask id="mR" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#gR)"/></mask>
<filter id="rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="3"/></filter>
</defs>'''

def obj(geom, fill, shade=True, sw=SW, mask='mBR', op=.8):
    """geom is an SVG element string with {A} where the paint attributes go."""
    s = geom.format(A=f'fill="{fill}"')
    if shade: s += geom.format(A=f'fill="url(#dots)" mask="url(#{mask})" opacity="{op}"')
    if sw: s += geom.format(A=f'fill="none" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round"')
    return s

def line(d, w=SW, c=INK, extra=''):
    return f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" {extra}/>'

def shine(cx, cy, r, w=None):
    w = w or max(3, r * .17)
    a0, a1 = math.radians(200), math.radians(250)
    x0, y0 = cx + .62 * r * math.cos(a0), cy + .62 * r * math.sin(a0)
    x1, y1 = cx + .62 * r * math.cos(a1), cy + .62 * r * math.sin(a1)
    return line(f'M{x0:.1f} {y0:.1f}A{.62*r:.1f} {.62*r:.1f} 0 0 1 {x1:.1f} {y1:.1f}', w, WHITE)

def rays(base, ray, cx, cy, n=22):
    out = [f'<rect width="{W}" height="{H}" fill="{base}"/>']
    for i in range(n):
        if i % 2: continue
        a0 = 2 * math.pi * i / n; a1 = 2 * math.pi * (i + 1) / n
        L = 900
        out.append(f'<path d="M{cx} {cy}L{cx+L*math.cos(a0):.0f} {cy+L*math.sin(a0):.0f}L{cx+L*math.cos(a1):.0f} {cy+L*math.sin(a1):.0f}Z" fill="{ray}"/>')
    return ''.join(out)

def skyline(gy, color, op=.4, seed=1):
    rnd = random.Random(seed); x = -10; parts = []
    while x < W:
        w = rnd.choice([44, 52, 60, 70]); h = rnd.choice([70, 90, 110, 130, 150])
        if rnd.random() < .5:  # a house with a peaked roof
            parts.append(f'M{x} {gy}V{gy-h+22}L{x+w/2} {gy-h}L{x+w} {gy-h+22}V{gy}Z')
        else:
            parts.append(f'M{x} {gy}V{gy-h}H{x+w}V{gy}Z')
        x += w + rnd.choice([0, 2, 6])
    return f'<path d="{"".join(parts)}" fill="{color}" opacity="{op}"/>'

def ground(gy, color, shade=True):
    s = f'<rect x="-10" y="{gy}" width="{W+20}" height="{H-gy+10}" fill="{color}"/>'
    if shade: s += f'<rect x="-10" y="{gy}" width="{W+20}" height="{H-gy+10}" fill="url(#dots)" mask="url(#mR)" opacity=".5"/>'
    return s + line(f'M-10 {gy}H{W+10}')

# ---------- fruit ----------
def apple(cx, cy, r, col=R):
    d = (f'M{cx} {cy-.7*r}C{cx+.5*r} {cy-1.1*r} {cx+1.12*r} {cy-.6*r} {cx+r} {cy+.12*r}'
         f'C{cx+.95*r} {cy+.8*r} {cx+.42*r} {cy+1.05*r} {cx} {cy+.9*r}C{cx-.42*r} {cy+1.05*r} {cx-.95*r} {cy+.8*r} {cx-r} {cy+.12*r}'
         f'C{cx-1.12*r} {cy-.6*r} {cx-.5*r} {cy-1.1*r} {cx} {cy-.7*r}Z')
    leaf = f'<ellipse cx="{cx+.42*r}" cy="{cy-1.0*r}" rx="{.34*r}" ry="{.16*r}" transform="rotate(-25 {cx+.42*r} {cy-1.0*r})" {{A}}/>'
    return (obj(f'<path d="{d}" {{A}}/>', col) + line(f'M{cx} {cy-.68*r}L{cx+.08*r} {cy-1.12*r}', max(3, .16*r))
            + obj(leaf, G, shade=False, sw=max(2.5, .1*r)) + shine(cx, cy, r))

def mango(cx, cy, r, rot=-20):
    g = f'<ellipse cx="{cx}" cy="{cy}" rx="{1.12*r}" ry="{.86*r}" transform="rotate({rot} {cx} {cy})" {{A}}/>'
    blush = f'<ellipse cx="{cx+.35*r}" cy="{cy+.25*r}" rx="{.55*r}" ry="{.42*r}" transform="rotate({rot} {cx} {cy})" fill="{O}" opacity=".55"/>'
    lx, ly = cx - .55 * r, cy - .85 * r
    leaf = f'<ellipse cx="{lx}" cy="{ly}" rx="{.42*r}" ry="{.17*r}" transform="rotate(-35 {lx} {ly})" {{A}}/>'
    return (g.format(A=f'fill="{MANGO}"') + blush + g.format(A='fill="url(#dots)" mask="url(#mBR)" opacity=".7"')
            + g.format(A=f'fill="none" stroke="{INK}" stroke-width="{max(3.5, min(SW, .13*r))}"')
            + obj(leaf, G, shade=False, sw=max(2.5, .09*r)) + shine(cx, cy, r))

def watermelon(cx, cy, r):
    cid = uid()
    g = f'<ellipse cx="{cx}" cy="{cy}" rx="{1.25*r}" ry="{r}" {{A}}/>'
    stripes = ''.join(line(f'M{cx+k*r*.42:.1f} {cy-r}C{cx+k*r*.42+.18*r:.1f} {cy-.4*r} {cx+k*r*.42-.18*r:.1f} {cy+.3*r} {cx+k*r*.42:.1f} {cy+r}', .17 * r, '#24503a')
                      for k in (-2, -1, 0, 1, 2))
    return (f'<clipPath id="{cid}"><ellipse cx="{cx}" cy="{cy}" rx="{1.25*r}" ry="{r}"/></clipPath>' + g.format(A='fill="#3f8a55"')
            + f'<g clip-path="url(#{cid})">{stripes}</g>' + g.format(A='fill="url(#dots)" mask="url(#mBR)" opacity=".7"')
            + g.format(A=f'fill="none" stroke="{INK}" stroke-width="{SW}"') + shine(cx - .2 * r, cy, r))

def melon_slice(cx, cy, r):
    rind = f'<path d="M{cx-r} {cy}A{r} {r} 0 0 0 {cx+r} {cy}Z" {{A}}/>'
    flesh = f'<path d="M{cx-.84*r} {cy}A{.84*r} {.84*r} 0 0 0 {cx+.84*r} {cy}Z" fill="{R}"/>'
    seeds = ''.join(f'<ellipse cx="{cx+dx*r:.1f}" cy="{cy+dy*r:.1f}" rx="{.05*r:.1f}" ry="{.08*r:.1f}" fill="{INK}"/>' for dx, dy in [(-.4, .25), (0, .4), (.4, .25), (-.2, .55), (.2, .55)])
    return (rind.format(A='fill="#3f8a55"') + f'<path d="M{cx-.9*r} {cy}A{.9*r} {.9*r} 0 0 0 {cx+.9*r} {cy}Z" fill="{CREAM}"/>' + flesh + seeds
            + rind.format(A=f'fill="none" stroke="{INK}" stroke-width="{SW}" stroke-linejoin="round"'))

def blueberry(cx, cy, r):
    g = f'<circle cx="{cx}" cy="{cy}" r="{r}" {{A}}/>'
    star = ''.join(line(f'M{cx} {cy-.72*r}L{cx+.22*r*math.cos(a):.1f} {cy-.72*r+.22*r*math.sin(a):.1f}', max(2.5, .12*r)) for a in [i * math.pi * 2 / 5 - math.pi / 2 for i in range(5)])
    return obj(g, BD) + star + shine(cx, cy, r)

def durian(cx, cy, r):
    n = 26; pts = []
    for i in range(2 * n):
        a = math.pi * i / n
        k = 1.0 if i % 2 == 0 else 1.17
        pts.append(f'{cx + k*r*math.cos(a):.1f},{cy + k*1.12*r*math.sin(a):.1f}')
    g = f'<polygon points="{" ".join(pts)}" {{A}}/>'
    marks = ''
    for gx in range(-2, 3):
        for gy in range(-2, 3):
            x, y = cx + gx * .36 * r + (gy % 2) * .18 * r, cy + gy * .38 * r
            if (x - cx) ** 2 / r ** 2 + (y - cy) ** 2 / (1.1 * r) ** 2 < .62:
                marks += line(f'M{x-.08*r:.1f} {y+.06*r:.1f}L{x:.1f} {y-.08*r:.1f}L{x+.08*r:.1f} {y+.06*r:.1f}', 3.2)
    stem = obj(f'<rect x="{cx-.08*r}" y="{cy-1.42*r}" width="{.16*r}" height="{.32*r}" rx="3" {{A}}/>', WOOD, shade=False, sw=4)
    return stem + obj(g, '#b5b54a') + marks + shine(cx, cy, r * 1.05)

def crate(x, y, w, h, col=WOOD):
    g = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="4" {{A}}/>'
    planks = ''.join(line(f'M{x+6} {y+h*k/3:.1f}H{x+w-6}', 3.2) for k in (1, 2))
    return obj(g, col) + planks

def tag(x, y, text, fs=34, rot=-5):
    w = fs * .62 * len(text) + 46; h = fs * 1.45
    d = f'M{x} {y+h/2}L{x+18} {y}H{x+w}V{y+h}H{x+18}Z'
    hole = f'<circle cx="{x+20}" cy="{y+h/2}" r="4.5" fill="{INK}"/>'
    return (f'<g transform="rotate({rot} {x+w/2} {y+h/2})">' + obj(f'<path d="{d}" {{A}}/>', CREAM, mask='mR', op=.6, sw=4.5) + hole
            + f'<text x="{x+30+(w-30)/2:.1f}" y="{y+h*.71:.1f}" text-anchor="middle" font-family="R8" font-size="{fs}" fill="{INK}">{text}</text></g>')

def sign(x, y, w, h, text, bg=INK, fg=Y, fs=26):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="5" fill="{bg}" stroke="{INK}" stroke-width="4.5"/>'
            f'<text x="{x+w/2}" y="{y+h/2+fs*.36:.1f}" text-anchor="middle" font-family="Slab" font-size="{fs}" fill="{fg}" letter-spacing="1">{text}</text>')

def sparkle(x, y, s=12, col=CREAM):
    d = f'M{x} {y-s}Q{x+s*.18} {y-s*.18} {x+s} {y}Q{x+s*.18} {y+s*.18} {x} {y+s}Q{x-s*.18} {y+s*.18} {x-s} {y}Q{x-s*.18} {y-s*.18} {x} {y-s}Z'
    return f'<path d="{d}" fill="{col}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'

def cloud(x, y, s, col=WHITE):
    d = (f'M{x-60*s} {y+18*s}C{x-82*s} {y+18*s} {x-82*s} {y-14*s} {x-56*s} {y-12*s}C{x-54*s} {y-40*s} {x-14*s} {y-46*s} {x-2*s} {y-24*s}'
         f'C{x+10*s} {y-50*s} {x+56*s} {y-44*s} {x+54*s} {y-12*s}C{x+82*s} {y-14*s} {x+82*s} {y+18*s} {x+60*s} {y+18*s}Z')
    return obj(f'<path d="{d}" {{A}}/>', col, op=.45)

def bust(cx, top, s, shirt, hat=None, hair=INK, mustache=False, glasses=False, mouth='smile', skin=SKIN, tudung=None, hand_nose=False):
    o = []
    body = f'<path d="M{cx-100*s} {H+10}C{cx-100*s} {top+160*s} {cx-66*s} {top+124*s} {cx} {top+122*s}C{cx+66*s} {top+124*s} {cx+100*s} {top+160*s} {cx+100*s} {H+10}Z" {{A}}/>'
    if tudung:  # headscarf: drawn behind the face and over the shoulders
        o.append(obj(body, shirt))
        o.append(obj(f'<path d="M{cx-60*s} {top+150*s}C{cx-70*s} {top+40*s} {cx-52*s} {top-8*s} {cx} {top-8*s}C{cx+52*s} {top-8*s} {cx+70*s} {top+40*s} {cx+60*s} {top+150*s}Q{cx} {top+175*s} {cx-60*s} {top+150*s}Z" {{A}}/>', tudung))
        o.append(obj(f'<ellipse cx="{cx}" cy="{top+62*s}" rx="{38*s}" ry="{44*s}" {{A}}/>', skin, shade=False))
        fy = top + 62 * s
    else:
        o.append(obj(body, shirt))
        o.append(obj(f'<rect x="{cx-15*s}" y="{top+88*s}" width="{30*s}" height="{38*s}" {{A}}/>', skin, shade=False))
        o.append(obj(f'<ellipse cx="{cx-46*s}" cy="{top+62*s}" rx="{9*s}" ry="{12*s}" {{A}}/>', skin, shade=False, sw=4))
        o.append(obj(f'<ellipse cx="{cx+46*s}" cy="{top+62*s}" rx="{9*s}" ry="{12*s}" {{A}}/>', skin, shade=False, sw=4))
        o.append(obj(f'<ellipse cx="{cx}" cy="{top+56*s}" rx="{46*s}" ry="{52*s}" {{A}}/>', skin, shade=False))
        if hat != 'chef' and hat != 'songkok' and hat != 'cap' and hat != 'sunhat':
            o.append(obj(f'<path d="M{cx-47*s} {top+52*s}C{cx-50*s} {top-2*s} {cx+50*s} {top-2*s} {cx+47*s} {top+52*s}C{cx+30*s} {top+26*s} {cx-14*s} {top+24*s} {cx-47*s} {top+52*s}Z" {{A}}/>', hair, shade=False, sw=4))
        fy = top + 56 * s
    # cheeks
    for dx in (-26, 26):
        o.append(f'<circle cx="{cx+dx*s}" cy="{fy+16*s}" r="{10*s}" fill="{CHEEK}" opacity=".8"/><circle cx="{cx+dx*s}" cy="{fy+16*s}" r="{10*s}" fill="url(#dots)" opacity=".35"/>')
    # eyes
    if glasses:
        for dx in (-17, 17): o.append(f'<circle cx="{cx+dx*s}" cy="{fy-4*s}" r="{12*s}" fill="{WHITE}" stroke="{INK}" stroke-width="4"/>')
        o.append(line(f'M{cx-5*s} {fy-4*s}H{cx+5*s}', 4))
    if hand_nose:  # eyes squeezed shut: > <
        for k in (-1, 1): o.append(line(f'M{cx+k*24*s} {fy-10*s}L{cx+k*12*s} {fy-4*s}L{cx+k*24*s} {fy+2*s}', 4))
    else:
        for dx in (-17, 17): o.append(f'<circle cx="{cx+dx*s}" cy="{fy-4*s}" r="{5.5*s}" fill="{INK}"/>')
    # mouth
    if mouth == 'smile':
        o.append(f'<path d="M{cx-17*s} {fy+20*s}Q{cx} {fy+40*s} {cx+17*s} {fy+20*s}Z" fill="{WHITE}" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>')
    elif mouth == 'yuck':
        o.append(line(f'M{cx-14*s} {fy+34*s}Q{cx-7*s} {fy+26*s} {cx} {fy+34*s}Q{cx+7*s} {fy+42*s} {cx+14*s} {fy+34*s}', 4))
    if mustache:
        o.append(f'<path d="M{cx-22*s} {fy+20*s}Q{cx-12*s} {fy+6*s} {cx} {fy+14*s}Q{cx+12*s} {fy+6*s} {cx+22*s} {fy+20*s}Q{cx+10*s} {fy+16*s} {cx} {fy+20*s}Q{cx-10*s} {fy+16*s} {cx-22*s} {fy+20*s}Z" fill="{INK}"/>')
    # hats
    if hat == 'chef':
        g = (f'<path d="M{cx-40*s} {top+18*s}C{cx-72*s} {top+10*s} {cx-66*s} {top-46*s} {cx-30*s} {top-38*s}C{cx-26*s} {top-72*s} {cx+26*s} {top-72*s} {cx+30*s} {top-38*s}'
             f'C{cx+66*s} {top-46*s} {cx+72*s} {top+10*s} {cx+40*s} {top+18*s}Z" {{A}}/>')
        o.append(obj(g, WHITE, op=.5))
        o.append(obj(f'<rect x="{cx-42*s}" y="{top+6*s}" width="{84*s}" height="{24*s}" rx="4" {{A}}/>', WHITE, shade=False))
    elif hat == 'songkok':
        o.append(obj(f'<path d="M{cx-40*s} {top+20*s}L{cx-36*s} {top-22*s}Q{cx} {top-30*s} {cx+36*s} {top-22*s}L{cx+40*s} {top+20*s}Q{cx} {top+12*s} {cx-40*s} {top+20*s}Z" {{A}}/>', '#1f2740', shade=False))
    elif hat == 'cap':
        o.append(obj(f'<path d="M{cx-46*s} {top+28*s}C{cx-48*s} {top-22*s} {cx+48*s} {top-22*s} {cx+46*s} {top+28*s}Z" {{A}}/>', R, op=.5))
        o.append(obj(f'<path d="M{cx-10*s} {top+28*s}H{cx+82*s}Q{cx+76*s} {top+40*s} {cx+30*s} {top+38*s}Z" {{A}}/>', R, shade=False, sw=4))
    elif hat == 'sunhat':
        o.append(obj(f'<ellipse cx="{cx}" cy="{top+20*s}" rx="{84*s}" ry="{16*s}" {{A}}/>', Y, op=.5))
        o.append(obj(f'<path d="M{cx-42*s} {top+20*s}C{cx-44*s} {top-34*s} {cx+44*s} {top-34*s} {cx+42*s} {top+20*s}Z" {{A}}/>', Y, op=.5))
        o.append(f'<path d="M{cx-42*s} {top+6*s}Q{cx} {top-2*s} {cx+42*s} {top+6*s}V{top+14*s}Q{cx} {top+6*s} {cx-42*s} {top+14*s}Z" fill="{R}" stroke="{INK}" stroke-width="3.5"/>')
    if hand_nose:  # an arm comes up from the outer side and pinches the nose shut
        sd = hand_nose  # -1: arm from the left, 1: from the right
        ax, ay = cx + sd * 62 * s, H + 10
        hx, hy = cx + sd * 13 * s, fy + 12 * s
        arm = f'M{ax} {ay}C{ax+sd*8*s} {fy+110*s} {hx+sd*40*s} {hy+40*s} {hx+sd*8*s} {hy+6*s}'
        o.append(line(arm, 30 * s + 9, INK) + line(arm, 30 * s, skin))
        o.append(obj(f'<path d="M{ax-15*s} {ay}C{ax-15*s} {fy+140*s} {ax+15*s} {fy+140*s} {ax+15*s} {ay}Z" {{A}}/>', shirt, op=.5, sw=4))  # sleeve
        o.append(obj(f'<rect x="{hx-17*s}" y="{hy-13*s}" width="{34*s}" height="{26*s}" rx="{12*s}" {{A}}/>', skin, shade=False, sw=4))
        for k in (-1, 1): o.append(line(f'M{hx-sd*2*s} {hy+k*5*s}H{hx-sd*11*s}', 3))
        o.append(line(f'M{hx-sd*17*s} {hy-6*s}Q{hx-sd*24*s} {hy} {hx-sd*17*s} {hy+6*s}', 3.5))  # the pinched nose tip
    return ''.join(o)

def svg(name, *parts, rough=True):
    bg, *fg = parts
    body = bg + (f'<g filter="url(#rough)">{"".join(fg)}</g>' if rough else ''.join(fg))
    s = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{defs()}{body}</svg>'
    open(os.path.join(HERE, name + '.svg'), 'w').write(s)

# ---------- the seven cards ----------
def stinks(x, y, flip=1):
    return ''.join(line(f'M{x+k*16*flip} {y}C{x+k*16*flip+14} {y-16} {x+k*16*flip-14} {y-34} {x+k*16*flip} {y-50}', 4.5, G) for k in (0, 1, 2))

def tourist_bus():
    gy = 318
    bus = obj(f'<path d="M24 290V138Q24 112 52 112H350Q394 112 404 150L414 220V290Q414 302 400 302H38Q24 302 24 290Z" {{A}}/>', R)
    band = f'<rect x="26" y="232" width="386" height="26" fill="{Y}"/>' + line('M26 232H412M26 258H412', 4)
    wins = ''
    for i, x in enumerate((44, 136, 228)):
        wins += obj(f'<rect x="{x}" y="132" width="80" height="78" rx="8" {{A}}/>', '#cfe0f2', shade=False, sw=4.5)
    heads = (bust(84, 150, .52, O, hat='sunhat') + bust(176, 148, .52, B, hair='#5b3a1e') + bust(268, 150, .52, G2, hat='cap'))
    cid = uid()
    heads = f'<clipPath id="{cid}"><rect x="44" y="132" width="80" height="78" rx="8"/><rect x="136" y="132" width="80" height="78" rx="8"/><rect x="228" y="132" width="80" height="78" rx="8"/></clipPath><g clip-path="url(#{cid})">{heads}</g>'
    wins += ''.join(line(f'M{x} 132V210', 0) for x in ())
    shield = obj('<path d="M322 132H356Q380 132 388 156L398 210H322Z" {A}/>', '#cfe0f2', shade=False, sw=4.5)
    plate = sign(90, 76, 220, 38, 'CITY TOURS', fs=24)
    wheels = ''.join(f'<circle cx="{x}" cy="302" r="34" fill="{INK}"/><circle cx="{x}" cy="302" r="14" fill="{GREY}" stroke="{INK}" stroke-width="3"/>' for x in (104, 330))
    light = f'<circle cx="406" cy="276" r="8" fill="{YL}" stroke="{INK}" stroke-width="3.5"/>'
    tourist = bust(468, 196, .82, '#5f8fd0', hat='sunhat', hair='#5b3a1e')
    cam = (obj('<rect x="436" y="318" width="64" height="44" rx="7" {A}/>', INK, shade=False, sw=4) + f'<circle cx="468" cy="340" r="14" fill="{B2}" stroke="{WHITE}" stroke-width="4"/>'
           + sparkle(500, 300, 13, WHITE))
    road = f'<rect x="-10" y="{gy+28}" width="{W+20}" height="60" fill="#8f969a"/>' + line(f'M-10 {gy+28}H{W+10}', 4) + ''.join(f'<rect x="{x}" y="{gy+50}" width="36" height="7" rx="3" fill="{WHITE}"/>' for x in range(10, 520, 80))
    svg('touristBus', rays(B, B2, 250, 120), skyline(gy, '#dde6f5', .45, 3), ground(gy, CREAM2), road,
        plate, bus, band, wins, heads, shield, light, wheels, tourist, cam, sparkle(40, 50, 11), sparkle(470, 70, 9))

def monsoon():
    gy = 300
    rain = ''.join(line(f'M{x} {y}l-10 26', 3.2, '#3d5a9e', 'opacity=".75"') for x, y in
                   [(random.Random(i).randint(0, 540), random.Random(i * 7).randint(60, 300)) for i in range(70)])
    clouds = cloud(110, 70, 1.25, '#e8eaee') + cloud(390, 58, 1.35, WHITE) + cloud(250, 40, 1.0, '#c7ccd6')
    posts = obj('<rect x="62" y="150" width="14" height="160" {A}/>', WOOD, shade=False, sw=4) + obj('<rect x="444" y="150" width="14" height="160" {A}/>', WOOD, shade=False, sw=4)
    sc = ''
    for i in range(8):
        x = 46 + i * 54
        col = R if i % 2 == 0 else CREAM
        sc += obj(f'<path d="M{x} 128H{x+54}V160Q{x+27} 186 {x} 160Z" {{A}}/>', col, shade=(i > 4), sw=4.5)
    streams = ''.join(line(f'M{x} 178V{y}', 4.5, '#9fc0e0') + line(f'M{x} 178V{y}', 1.5, WHITE) for x, y in [(73, 300), (127, 290), (181, 300), (235, 294), (289, 300), (343, 292), (397, 300), (451, 296)])
    crates = (crate(110, 236, 140, 74) + apple(140, 226, 20) + apple(184, 222, 22) + apple(226, 228, 18)
              + crate(278, 236, 140, 74) + watermelon(326, 220, 26) + mango(384, 224, 18))
    puddles = ''.join(obj(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{rx*.22:.0f}" {{A}}/>', '#9fc0e0', shade=False, sw=4)
                      + line(f'M{x-rx*.5:.0f} {y}Q{x} {y-5} {x+rx*.5:.0f} {y}', 2.5, WHITE) for x, y, rx in [(90, 340, 60), (300, 352, 80), (460, 334, 46)])
    svg('monsoon', rays('#8d9fb8', '#9cadc4', 260, 40), skyline(gy, '#c3cfdf', .45, 5), rain, ground(gy, '#5f7086'), clouds,
        posts, crates, streams, sc, puddles)

def durian_card():
    gy = 318
    throne = (obj('<path d="M168 300V120Q168 64 260 56Q352 64 352 120V300Z" {A}/>', R)
              + obj('<path d="M188 300V132Q188 86 260 80Q332 86 332 132V300Z" {A}/>', '#b9371f', shade=False, sw=4)
              + ''.join(obj(f'<circle cx="{x}" cy="{y}" r="9" {{A}}/>', Y, shade=False, sw=3.5) for x, y in [(168, 120), (352, 120), (260, 50)]))
    seat = obj('<rect x="150" y="268" width="220" height="44" rx="10" {A}/>', Y)
    crown = obj('<path d="M222 104L230 66L248 88L260 58L272 88L290 66L298 104Z" {A}/>', Y, shade=False, sw=4.5) + ''.join(f'<circle cx="{x}" cy="{y}" r="5" fill="{R}" stroke="{INK}" stroke-width="2.5"/>' for x, y in [(230, 66), (260, 58), (290, 66)])
    left = bust(70, 196, .9, B, hair='#4a2e1a', mouth='yuck', hand_nose=-1)
    right = bust(452, 192, .9, O, tudung=G, mouth='yuck', hand_nose=1)
    svg('durian', rays(G2, G3, 260, 150), skyline(gy, '#d6e5c8', .45, 7), ground(gy, WOOD),
        throne, seat, durian(260, 190, 70), crown, stinks(140, 170), stinks(372, 170, -1),
        tag(18, 22, '−$1'), sparkle(400, 60, 12), sparkle(118, 82, 9), sparkle(440, 230, 10), sparkle(80, 250, 11))

def kenduri():
    gy = 250
    swag = ''
    for i in range(4):
        x0 = -10 + i * 140
        swag += line(f'M{x0} 30Q{x0+70} 96 {x0+140} 30', 5, G)
        for t in (.2, .5, .8):
            x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * (x0 + 70) + t * t * (x0 + 140)
            y = (1 - t) ** 2 * 30 + 2 * (1 - t) * t * 96 + t * t * 30
            swag += ''.join(f'<circle cx="{x+12*math.cos(a):.1f}" cy="{y+12*math.sin(a):.1f}" r="7" fill="{WHITE}" stroke="{INK}" stroke-width="3"/>' for a in [k * math.pi * 2 / 5 for k in range(5)]) + f'<circle cx="{x:.1f}" cy="{y:.1f}" r="6" fill="{Y}" stroke="{INK}" stroke-width="3"/>'
    cloth = obj(f'<path d="M-10 {gy}H530V318' + ''.join(f'Q{520-i*30-15} 340 {520-i*30-30} 318' for i in range(18)) + 'Z" {A}/>', WHITE, op=.4)
    legs = f'<rect x="-10" y="318" width="540" height="80" fill="{WOOD}"/>' + line('M-10 318H530', 4)
    cake = (obj('<rect x="250" y="190" width="150" height="62" rx="6" {A}/>', CREAM) + obj('<rect x="268" y="138" width="114" height="54" rx="6" {A}/>', CREAM)
            + obj('<rect x="290" y="96" width="70" height="44" rx="6" {A}/>', CREAM)
            + ''.join(line(f'M{a} {y}' + ''.join(f'Q{a+(k+.5)*w/6:.0f} {y+12} {a+(k+1)*w/6:.0f} {y}' for k in range(6)), 4, R) for a, w, y in [(250, 150, 204), (268, 114, 150), (290, 70, 106)])
            + obj('<path d="M325 96V74" {A}/>', R, shade=False, sw=4) + f'<circle cx="325" cy="70" r="9" fill="{R}" stroke="{INK}" stroke-width="3.5"/>')
    melons = watermelon(172, 222, 34) + melon_slice(452, 252, 44)
    caterer = bust(72, 150, .98, G, hat='songkok', mustache=True)
    svg('kenduri', rays(R2, '#e8846a', 300, 160), skyline(gy, '#f2a58c', .5, 9), legs, cloth, swag, cake, melons, caterer,
        tag(368, 290, '3 × $8', 28, -4), sparkle(470, 130, 11), sparkle(216, 120, 9))

def mango_windfall():
    gy = 318
    trunk = obj('<path d="M118 330Q128 250 120 180L150 176Q148 250 170 330Z" {A}/>', WOOD)
    branch = line('M140 210Q170 180 210 170', 14, INK) + line('M140 210Q170 180 210 170', 8, WOOD)
    leaves = obj('<path d="M30 150C10 110 40 60 84 66C96 26 160 18 186 52C226 36 270 72 252 112C284 132 262 190 222 186C206 214 150 214 132 196C96 216 40 200 30 150Z" {A}/>', G, op=.55)
    hang = mango(92, 140, 20, 70) + mango(170, 108, 20, 80) + mango(210, 160, 19, 70) + mango(126, 70, 17, 80)
    fall = ''
    for x, y, r in [(278, 120, 22), (318, 196, 24), (262, 236, 20)]:
        fall += line(f'M{x-6} {y-34}V{y-58}', 4.5, WHITE) + line(f'M{x+8} {y-30}V{y-48}', 4.5, WHITE) + mango(x, y, r, 30)
    basket = (obj('<path d="M330 248H496L478 334Q476 342 466 342H360Q350 342 348 334Z" {A}/>', WOODL)
              + ''.join(line(f'M{336+i*10} {262+i*20}H{490-i*4}', 3.2) for i in range(4)) + ''.join(line(f'M{356+k*28} 250L{362+k*24} 340', 3.2) for k in range(5)))
    heap = mango(362, 238, 22, -10) + mango(414, 230, 24, 20) + mango(466, 240, 22, -30) + mango(390, 214, 20, 60) + mango(442, 210, 20, -50)
    svg('mangoWindfall', rays(Y, Y2, 360, 110), skyline(gy, '#f6d58a', .5, 11), ground(gy, G2),
        trunk, branch, leaves, hang, fall, heap, basket, tag(370, 24, '−$2'), sparkle(260, 60, 10, WHITE))

def pasar_malam():
    gy = 322
    rnd = random.Random(4)
    stars = ''.join(f'<circle cx="{rnd.randint(0,520)}" cy="{rnd.randint(0,200)}" r="{rnd.choice([1.5,2,2.5])}" fill="{CREAM}" opacity=".85"/>' for _ in range(40))
    moon = f'<path d="M458 34A38 38 0 1 0 494 92A30 30 0 1 1 458 34Z" fill="{YL}" stroke="{INK}" stroke-width="4"/>'
    rope = line('M-10 74Q130 120 260 92Q390 64 530 104', 3.5, INK)
    lanterns = ''
    for x in (40, 130, 220, 310, 400, 490):
        y = 74 + (x / 520) * 30 + 20 * math.sin(x / 520 * math.pi * 2) * .4 + 18
        lanterns += (f'<circle cx="{x}" cy="{y+4:.0f}" r="34" fill="{Y}" opacity=".22"/>' + obj(f'<ellipse cx="{x}" cy="{y+4:.0f}" rx="20" ry="16" {{A}}/>', R, op=.5, sw=4)
                     + f'<rect x="{x-9}" y="{y-14:.0f}" width="18" height="6" fill="{Y}" stroke="{INK}" stroke-width="3"/><rect x="{x-9}" y="{y+18:.0f}" width="18" height="6" fill="{Y}" stroke="{INK}" stroke-width="3"/>')
    cart = (obj('<rect x="40" y="206" width="250" height="96" rx="8" {A}/>', Y)
            + sign(78, 236, 174, 36, 'PASAR MALAM', bg=R, fg=CREAM, fs=19)
            + obj('<rect x="48" y="150" width="10" height="58" {A}/>', WOOD, shade=False, sw=3.5) + obj('<rect x="272" y="150" width="10" height="58" {A}/>', WOOD, shade=False, sw=3.5))
    awn = ''.join(obj(f'<path d="M{30+i*45} 128H{75+i*45}V152Q{52+i*45} 172 {30+i*45} 152Z" {{A}}/>', G if i % 2 == 0 else CREAM, shade=False, sw=4) for i in range(6))
    goods = apple(92, 194, 16) + mango(138, 194, 16) + watermelon(196, 188, 22) + blueberry(246, 196, 11) + blueberry(262, 192, 10)
    wheels = ''.join(f'<circle cx="{x}" cy="306" r="22" fill="{INK}"/><circle cx="{x}" cy="306" r="8" fill="{GREY}"/>' for x in (86, 244))
    hawker = bust(420, 168, .95, '#5f8fd0', hat='cap')
    apron = obj('<path d="M374 300H466V400H374Z" {A}/>', WHITE, op=.4, sw=4)
    coins = ''.join(obj(f'<ellipse cx="{x}" cy="{y}" rx="22" ry="8" {{A}}/>', Y, shade=False, sw=3.5) for x, y in [(330, 352), (330, 342), (330, 332), (330, 322)])
    coins += obj('<circle cx="476" cy="292" r="18" {A}/>', Y, shade=False, sw=4) + f'<text x="476" y="300" text-anchor="middle" font-family="R8" font-size="20" fill="{INK}">$</text>'
    svg('pasarMalam', rays('#2c3a5e', '#35467a', 260, 160), stars, skyline(gy, '#1b2440', .7, 13), ground(gy, '#4a4f6e'), moon, rope, lanterns,
        awn, cart, goods, wheels, hawker, apron, coins, tag(16, 140, '$3', 34, -6))

def bake_off():
    gy = 300
    table = obj(f'<rect x="-10" y="{gy}" width="540" height="100" {{A}}/>', WHITE, op=.35)
    dish = obj('<ellipse cx="300" cy="286" rx="132" ry="34" {A}/>', '#cfd6dd')
    pie = obj('<path d="M184 276Q190 214 300 210Q410 214 416 276Q300 300 184 276Z" {A}/>', '#e0a050')
    lattice = ''.join(line(f'M{x} 216L{x+40} 290', 9, '#c98535') for x in (212, 252, 292, 332, 372)) + ''.join(line(f'M{x+40} 216L{x} 290', 9, '#c98535') for x in (212, 252, 292, 332, 372))
    cid = uid()
    lattice = f'<clipPath id="{cid}"><path d="M184 276Q190 214 300 210Q410 214 416 276Q300 300 184 276Z"/></clipPath><g clip-path="url(#{cid})">{lattice}</g>'
    pie_out = line('M184 276Q190 214 300 210Q410 214 416 276Q300 300 184 276Z')
    steam = ''.join(line(f'M{x} 190C{x-16} 166 {x+16} 150 {x} 124C{x-14} 104 {x+10} 92 {x} 76', 6, CREAM) for x in (256, 300, 344))
    ros = ''.join(f'<circle cx="{440+38*math.cos(a):.1f}" cy="{108+38*math.sin(a):.1f}" r="13" fill="{BD}" stroke="{INK}" stroke-width="3.5"/>' for a in [k * math.pi * 2 / 12 for k in range(12)])
    ros = (obj('<path d="M418 130L398 214L420 200L436 220L446 134Z" {A}/>', BD, shade=False, sw=4) + obj('<path d="M448 134L452 222L466 202L488 212L466 128Z" {A}/>', BD, shade=False, sw=4)
           + ros + obj('<circle cx="440" cy="108" r="32" {A}/>', Y, op=.4) + f'<text x="440" y="118" text-anchor="middle" font-family="R8" font-size="27" fill="{INK}">1st</text>')
    baker = bust(78, 150, .98, WHITE, hat='chef')
    apples = apple(150, 300, 24) + apple(470, 300, 26) + apple(498, 268, 20, G2)
    svg('bakeOff', rays(O, O2, 300, 140), skyline(gy, '#f2b880', .45, 15), table, dish, pie, lattice, pie_out, steam, ros, baker, apples,
        tag(196, 22, '+$1'), sparkle(380, 40, 10))

for f in (tourist_bus, monsoon, durian_card, kenduri, mango_windfall, pasar_malam, bake_off): f()
print('ok')
