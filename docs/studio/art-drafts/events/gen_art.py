# Event pictures for the seven rules 11 events, in the deck's style: thick navy ink, sunburst rays, a faint town
# skyline, halftone dot shading, paper grain and price tags. 520 x 391, like the owner's event art.
import math, os
W, H = 520, 391
INK = '#182844'
OUT = os.path.dirname(os.path.abspath(__file__))

def defs(extra=''):
    return f'''<defs>
<pattern id="dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.5" fill="{INK}" opacity=".35"/></pattern>
<pattern id="dotsL" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.6" fill="#fff" opacity=".55"/></pattern>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .1  0 0 0 0 .15  0 0 0 0 .27  0 0 0 .22 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
{extra}</defs>'''

def rays(cx, cy, a, b, n=18):
    out = [f'<rect width="{W}" height="{H}" fill="{a}"/>']
    for i in range(n):
        t0 = 2*math.pi*i/n; t1 = t0 + math.pi/n
        R = 900
        out.append(f'<path d="M{cx},{cy} L{cx+R*math.cos(t0):.1f},{cy+R*math.sin(t0):.1f} L{cx+R*math.cos(t1):.1f},{cy+R*math.sin(t1):.1f}Z" fill="{b}"/>')
    return ''.join(out)

def skyline(color, y=250, op=.28):
    xs = [0,40,70,120,150,210,240,300,330,380,420,470,520]
    hs = [80,120,60,140,90,110,70,130,85,150,95,120]
    s = ''
    for i in range(len(hs)):
        s += f'<rect x="{xs[i]}" y="{y-hs[i]}" width="{xs[i+1]-xs[i]+2}" height="{hs[i]+H}" fill="{color}" opacity="{op}"/>'
        for wy in range(y-hs[i]+14, y-6, 22):
            s += f'<rect x="{xs[i]+8}" y="{wy}" width="8" height="10" fill="{color}" opacity="{op}"/>'
    return s

def ground(color, y=300, dots=True):
    g = f'<rect x="-5" y="{y}" width="{W+10}" height="{H-y+5}" fill="{color}" stroke="{INK}" stroke-width="4"/>'
    if dots: g += f'<rect x="0" y="{y+2}" width="{W}" height="{H-y}" fill="url(#dots)" opacity=".6"/>'
    return g

def tag(x, y, text, w=None, fs=30):
    w = w or (len(text)*fs*0.62 + 40)
    h = fs + 22
    return (f'<g transform="translate({x},{y}) rotate(-6)"><path d="M0,{h/2} L18,0 H{w} V{h} H18 Z" fill="#fbf3df" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
            f'<circle cx="18" cy="{h/2}" r="4.5" fill="{INK}"/><rect x="{w-26}" y="2" width="24" height="{h-4}" fill="url(#dots)"/>'
            f'<text x="{24+(w-24)/2}" y="{h/2+fs*0.36}" text-anchor="middle" font-family="Rubik, Arial Black, sans-serif" font-weight="900" font-size="{fs}" fill="{INK}">{text}</text></g>')

def svg(body, extra_defs=''):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">{defs(extra_defs)}'
            f'<g stroke-linejoin="round" stroke-linecap="round">{body}</g>'
            f'<rect width="{W}" height="{H}" filter="url(#grain)" fill="#000"/></svg>')

S = f'stroke="{INK}" stroke-width="4"'

def face(cx, cy, r=26, skin='#e7b48c', hair=INK, hat=None):
    f = f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{skin}" {S}/>'
    f += f'<path d="M{cx-r},{cy-4} Q{cx-r+4},{cy-r-8} {cx},{cy-r-2} Q{cx+r-4},{cy-r-8} {cx+r},{cy-4} Q{cx+6},{cy-r+10} {cx-r},{cy-4}Z" fill="{hair}"/>'
    f += f'<circle cx="{cx-9}" cy="{cy+2}" r="3" fill="{INK}"/><circle cx="{cx+9}" cy="{cy+2}" r="3" fill="{INK}"/>'
    f += f'<path d="M{cx-8},{cy+12} Q{cx},{cy+18} {cx+8},{cy+12}" fill="none" {S}/>'
    f += f'<circle cx="{cx-15}" cy="{cy+10}" r="4" fill="#e0725a" opacity=".6"/><circle cx="{cx+15}" cy="{cy+10}" r="4" fill="#e0725a" opacity=".6"/>'
    if hat: f += hat
    return f

def mango(cx, cy, s=1.0, ripe=True):
    c = '#f2b705' if ripe else '#9cc46a'
    return (f'<g transform="translate({cx},{cy}) scale({s})"><path d="M-22,4 C-24,-22 6,-30 20,-12 C30,2 22,26 2,28 C-14,29 -21,18 -22,4Z" fill="{c}" {S}/>'
            f'<path d="M-6,22 C8,22 18,10 18,-4 C22,10 16,24 2,27Z" fill="#d98b0f" opacity=".55"/>'
            f'<path d="M6,-26 C8,-34 16,-38 24,-36 C20,-28 14,-26 6,-26Z" fill="#4f8a3b" {S}/></g>')

def apple(cx, cy, s=1.0):
    return (f'<g transform="translate({cx},{cy}) scale({s})"><path d="M0,-14 C-10,-24 -30,-20 -28,2 C-26,22 -10,30 0,24 C10,30 26,22 28,2 C30,-20 10,-24 0,-14Z" fill="#d24a32" {S}/>'
            f'<path d="M14,-18 C20,8 14,22 2,25 C18,26 28,14 26,-4Z" fill="#9e2f1f" opacity=".6"/><path d="M0,-14 C0,-22 4,-28 8,-30" fill="none" {S}/>'
            f'<path d="M4,-22 C12,-32 22,-30 24,-26 C16,-20 10,-20 4,-22Z" fill="#4f8a3b" {S}/></g>')

def melon(cx, cy, s=1.0):
    return (f'<g transform="translate({cx},{cy}) scale({s})"><ellipse rx="40" ry="30" fill="#3f7f43" {S}/>'
            + ''.join(f'<path d="M{x},-29 C{x+8},-10 {x+8},10 {x},29" fill="none" stroke="#24552b" stroke-width="5"/>' for x in (-22,-6,10,24))
            + f'<ellipse rx="40" ry="30" fill="none" {S}/><ellipse cx="-14" cy="-14" rx="10" ry="5" fill="#f4ecd8" opacity=".5"/></g>')

# ---------- 1. Tourist Bus ----------
def tourist_bus():
    b = rays(260, 120, '#7cc3c9', '#93d0d4') + skyline('#2b6f7a', 250)
    b += ground('#c9b78f', 300)
    # road line
    b += f'<rect x="0" y="330" width="{W}" height="6" fill="#fbf3df" opacity=".8"/>'
    # bus body
    b += f'<rect x="70" y="140" width="330" height="150" rx="24" fill="#e0573a" {S}/>'
    b += f'<rect x="70" y="140" width="330" height="40" rx="20" fill="#f2b705" {S}/>'
    b += f'<text x="235" y="170" text-anchor="middle" font-family="Rubik, Arial Black, sans-serif" font-weight="900" font-size="24" fill="{INK}">CITY TOURS</text>'
    for i, x in enumerate((92, 160, 228, 296)):
        b += f'<rect x="{x}" y="192" width="58" height="52" rx="8" fill="#cfe9ef" {S}/>'
        b += face(x+29, 228, 15, ['#e7b48c','#c98d60','#f0c7a0','#a9714a'][i])
        if i % 2 == 0:
            b += f'<path d="M{x+12},{212} Q{x+29},{196} {x+46},{212} Z" fill="#f2b705" {S}/><rect x="{x+6}" y="210" width="46" height="5" rx="2" fill="#f2b705" {S}/>'
    # camera flash in a window
    b += f'<rect x="300" y="224" width="22" height="15" rx="3" fill="{INK}"/><circle cx="311" cy="231" r="4" fill="#fbf3df"/>'
    b += f'<path d="M334,214 l6,-14 l6,14 l14,6 l-14,6 l-6,14 l-6,-14 l-14,-6Z" fill="#fff6c0" {S}/>'
    # door and front
    b += f'<rect x="364" y="192" width="30" height="92" rx="6" fill="#cfe9ef" {S}/>'
    b += f'<rect x="70" y="250" width="330" height="40" fill="url(#dots)" opacity=".7"/>'
    for x in (130, 340):
        b += f'<circle cx="{x}" cy="292" r="26" fill="{INK}"/><circle cx="{x}" cy="292" r="11" fill="#c9c2b0" {S}/>'
    b += f'<circle cx="398" cy="262" r="8" fill="#fff6c0" {S}/>'
    # waving tourist outside with map
    b += face(455, 225, 24, '#f0c7a0', '#8a5a2b', f'<path d="M427,214 Q455,186 483,214Z" fill="#7cc3c9" {S}/><rect x="420" y="210" width="70" height="7" rx="3" fill="#7cc3c9" {S}/>')
    b += f'<path d="M425,300 Q430,256 455,252 Q480,256 486,300Z" fill="#f2b705" {S}/><rect x="433" y="262" width="44" height="30" fill="#fbf3df" {S}/><path d="M448,262 V292 M462,262 V292" stroke="{INK}" stroke-width="2"/>'
    pass  # no price tag (house style)
    #     b += tag(18, 26, '+4', fs=32)
    return svg(b)

# ---------- 2. Monsoon Downpour ----------
def monsoon():
    b = f'<rect width="{W}" height="{H}" fill="#6f87a3"/>' + rays(260, -40, '#6f87a3', '#7a92ad', 14) + skyline('#2c3e57', 260, .35)
    b += ground('#8aa0b4', 300)
    # puddles
    for cx, rx in ((120, 70), (390, 90)):
        b += f'<ellipse cx="{cx}" cy="335" rx="{rx}" ry="16" fill="#b9cfe0" {S}/><ellipse cx="{cx}" cy="335" rx="{rx*.5}" ry="7" fill="none" stroke="#fbf3df" stroke-width="3"/>'
    # stall with awning dripping
    b += f'<rect x="150" y="160" width="220" height="130" fill="#c48a4e" {S}/><rect x="150" y="160" width="220" height="130" fill="url(#dots)" opacity=".4"/>'
    for i in range(6):
        b += f'<path d="M{140+i*40},{150} h40 v28 q-20,16 -40,0Z" fill="{["#e0573a","#fbf3df"][i%2]}" {S}/>'
    b += f'<rect x="135" y="140" width="250" height="14" fill="#e0573a" {S}/>'
    b += f'<path d="M180,290 h160" {S}/><rect x="175" y="230" width="170" height="40" fill="#8a5a2b" {S}/>'
    b += apple(215, 222, .6) + melon(265, 222, .55) + mango(318, 222, .6)
    # clouds
    for cx, cy, r in ((120, 70, 44), (180, 52, 52), (250, 70, 46), (360, 60, 50), (430, 76, 40)):
        b += f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#4a5f7c" {S}/>'
    b += f'<rect x="80" y="70" width="390" height="40" fill="#4a5f7c"/><path d="M80,110 H470" {S}/>'
    # rain
    for i in range(60):
        x = (i*37) % 520; y = 118 + (i*53) % 200
        b += f'<path d="M{x},{y} l-8,22" stroke="#d8e8f5" stroke-width="3"/>'
    # umbrella shopper
    b += f'<path d="M405,200 Q450,150 495,200Z" fill="#f2b705" {S}/><path d="M450,200 V262 q0,10 -10,8" fill="none" {S}/>'
    b += face(450, 230, 18, '#c98d60')
    b += f'<path d="M428,300 Q432,252 450,250 Q468,252 472,300Z" fill="#3f7f43" {S}/>'
    pass  # no price tag (house style)
    #     b += tag(18, 26, '−1', fs=32)
    return svg(b)

# ---------- 3. Durian Season ----------
def durian():
    b = rays(260, 200, '#d9c95a', '#e6d873') + skyline('#5d6b2b', 250)
    b += ground('#a6863f', 300)
    # pedestal / throne
    b += f'<rect x="170" y="250" width="180" height="60" rx="6" fill="#8a5a2b" {S}/><rect x="190" y="235" width="140" height="20" rx="4" fill="#c48a4e" {S}/>'
    b += f'<rect x="170" y="250" width="180" height="60" fill="url(#dots)" opacity=".4"/>'
    # durian
    b += f'<ellipse cx="260" cy="180" rx="78" ry="66" fill="#8fb04a" {S}/>'
    for i in range(26):
        t = 2*math.pi*i/26; x = 260+78*math.cos(t); y = 180+66*math.sin(t)
        b += f'<path d="M{x-7*math.sin(t):.1f},{y+7*math.cos(t):.1f} L{x+14*math.cos(t):.1f},{y+14*math.sin(t):.1f} L{x+7*math.sin(t):.1f},{y-7*math.cos(t):.1f}Z" fill="#8fb04a" {S}/>'
    for gx, gy in ((228, 160), (262, 150), (296, 166), (240, 196), (280, 200), (258, 226)):
        b += f'<path d="M{gx-8},{gy+6} L{gx},{gy-8} L{gx+8},{gy+6}Z" fill="#6f8f33" {S}/>'
    b += f'<ellipse cx="260" cy="180" rx="78" ry="66" fill="url(#dots)" opacity=".5"/>'
    # crown
    b += f'<path d="M222,112 L230,80 L246,100 L260,72 L274,100 L290,80 L298,112Z" fill="#f2b705" {S}/><circle cx="260" cy="72" r="6" fill="#e0573a" {S}/>'
    # stink lines
    for x in (160, 360, 380, 140):
        b += f'<path d="M{x},230 q-14,-20 0,-40 q14,-20 0,-40" fill="none" stroke="#5d6b2b" stroke-width="5" opacity=".75"/>'
    # two shoppers holding noses
    for cx, skin, shirt in ((80, '#c98d60', '#e0573a'), (440, '#f0c7a0', '#2f6db0')):
        b += f'<path d="M{cx-40},330 Q{cx-36},260 {cx},256 Q{cx+36},260 {cx+40},330Z" fill="{shirt}" {S}/>'
        b += face(cx, 228, 28, skin)
        b += f'<path d="M{cx-6},236 q6,-6 12,0" fill="none" {S}/><circle cx="{cx+4}" cy="232" r="9" fill="{skin}" {S}/>'
    pass  # no price tag (house style)
    #     b += tag(18, 26, '−$1', fs=30)
    return svg(b)

# ---------- 4. Kenduri ----------
def kenduri():
    b = rays(260, 140, '#e8a0a8', '#f1b5bb') + skyline('#8a3f52', 240)
    b += ground('#c48a4e', 300)
    # garland bunting of flowers
    b += f'<path d="M0,40 Q130,110 260,50 Q390,110 520,40" fill="none" stroke="#3f7f43" stroke-width="5"/>'
    for i in range(12):
        x = 20 + i*44; y = 40 + 40*abs(math.sin(i*math.pi/6)) + 8
        b += f'<circle cx="{x}" cy="{y}" r="11" fill="{["#fbf3df","#f2b705","#e0573a"][i%3]}" {S}/><circle cx="{x}" cy="{y}" r="3.5" fill="{INK}"/>'
    # long table with cloth
    b += f'<rect x="30" y="230" width="460" height="22" fill="#fbf3df" {S}/><path d="M30,252 h460 v40 q-23,14 -46,0 q-23,14 -46,0 q-23,14 -46,0 q-23,14 -46,0 q-23,14 -46,0 q-23,14 -46,0 q-23,14 -46,0 q-23,14 -46,0 q-23,14 -46,0 q-23,14 -46,0Z" fill="#fbf3df" {S}/>'
    b += f'<rect x="30" y="252" width="460" height="40" fill="url(#dots)" opacity=".3"/>'
    # wedding cake
    b += f'<rect x="210" y="170" width="100" height="60" rx="6" fill="#fbf3df" {S}/><rect x="226" y="130" width="68" height="42" rx="6" fill="#fbf3df" {S}/><rect x="240" y="100" width="40" height="32" rx="5" fill="#fbf3df" {S}/>'
    b += f'<path d="M210,190 q12,10 25,0 q12,10 25,0 q12,10 25,0 q12,10 25,0" fill="none" stroke="#e8a0a8" stroke-width="4"/><circle cx="260" cy="92" r="9" fill="#e0573a" {S}/>'
    # watermelons and slices
    b += melon(100, 210, .8) + melon(410, 210, .8)
    b += f'<path d="M150,232 a30,30 0 0 1 60,0Z" fill="#e0573a" {S}/><path d="M154,232 a26,26 0 0 1 52,0" fill="none" stroke="#3f7f43" stroke-width="5"/>'
    b += f'<path d="M318,232 a30,30 0 0 1 60,0Z" fill="#e0573a" {S}/><path d="M322,232 a26,26 0 0 1 52,0" fill="none" stroke="#3f7f43" stroke-width="5"/>'
    for x in (170, 185, 338, 352): b += f'<circle cx="{x}" cy="222" r="2.5" fill="{INK}"/>'
    # caterer with a songkok
    b += f'<path d="M440,340 Q444,290 470,286 Q496,290 500,340Z" fill="#fbf3df" {S}/>'
    b += face(470, 258, 22, '#c98d60', INK, f'<rect x="452" y="226" width="36" height="16" rx="3" fill="{INK}"/>')
    pass  # no price tag (house style)
    #     b += tag(18, 26, '3 × $8', fs=26)
    return svg(b)

# ---------- 5. Mango Windfall ----------
def mango_windfall():
    b = rays(160, 300, '#f0b24a', '#f5c66a') + skyline('#8a5a2b', 260, .22)
    b += ground('#9cc46a', 300)
    # tree
    b += f'<path d="M150,300 C140,240 150,200 170,170 L200,170 C190,210 196,250 205,300Z" fill="#8a5a2b" {S}/>'
    for cx, cy, r in ((110, 120, 60), (180, 80, 70), (260, 120, 64), (170, 150, 56)):
        b += f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#4f8a3b" {S}/>'
    b += f'<circle cx="180" cy="110" r="70" fill="url(#dots)" opacity=".4"/>'
    for x, y in ((120, 110), (170, 70), (230, 100), (150, 150), (250, 150)):
        b += mango(x, y, .55)
    # wind lines
    for y in (60, 90, 130):
        b += f'<path d="M300,{y} q40,-10 80,0 q20,6 30,-6" fill="none" stroke="#fbf3df" stroke-width="5" opacity=".9"/>'
    # falling mangoes with motion marks
    for x, y, r in ((330, 170, 18), (380, 210, -12), (300, 240, 30)):
        b += f'<g transform="rotate({r} {x} {y})">{mango(x, y, .7)}</g><path d="M{x-6},{y-34} v-14 M{x+8},{y-32} v-10" stroke="{INK}" stroke-width="3"/>'
    # basket full of mangoes
    b += f'<path d="M340,300 L360,250 H480 L500,300Z" fill="#c48a4e" {S}/><path d="M352,268 H488 M346,284 H494" stroke="{INK}" stroke-width="3"/>'
    for x in (380, 410, 440, 468): b += mango(x, 244, .55)
    b += f'<path d="M340,300 L360,250 H480 L500,300Z" fill="url(#dots)" opacity=".35"/>'
    pass  # no price tag (house style)
    #     b += tag(330, 26, '−$2', fs=30)
    return svg(b)

# ---------- 6. Pasar Malam ----------
def pasar_malam():
    b = f'<rect width="{W}" height="{H}" fill="#2a2f5a"/>' + rays(260, 40, '#2a2f5a', '#323868', 16) + skyline('#141838', 250, .7)
    for i in range(30):
        x = (i*71) % 520; y = (i*37) % 150 + 8
        b += f'<circle cx="{x}" cy="{y}" r="{1.5 + (i%3)}" fill="#fbf3df" opacity=".8"/>'
    b += f'<circle cx="440" cy="60" r="30" fill="#f6e7a8" {S}/><circle cx="452" cy="52" r="26" fill="#2a2f5a"/>'
    b += ground('#5b4a6e', 300)
    # lantern string
    b += f'<path d="M0,70 Q260,150 520,70" fill="none" stroke="{INK}" stroke-width="4"/>'
    for i, x in enumerate(range(40, 520, 70)):
        y = 70 + 80*math.sin(math.pi*x/520)*0.95 + 6
        b += f'<line x1="{x}" y1="{y-10}" x2="{x}" y2="{y}" stroke="{INK}" stroke-width="3"/>'
        b += f'<circle cx="{x}" cy="{y+16}" r="26" fill="#f6e7a8" opacity=".25"/><ellipse cx="{x}" cy="{y+16}" rx="16" ry="18" fill="#e0573a" {S}/><path d="M{x-16},{y+16} h32" stroke="{INK}" stroke-width="2"/><rect x="{x-7}" y="{y-2}" width="14" height="5" fill="#f2b705" {S}/>'
    # hawker cart
    b += f'<rect x="150" y="200" width="230" height="90" rx="6" fill="#c48a4e" {S}/><rect x="150" y="200" width="230" height="90" fill="url(#dots)" opacity=".4"/>'
    b += f'<path d="M140,200 L170,160 H360 L390,200Z" fill="#e0573a" {S}/><path d="M170,160 v-30 M360,160 v-30" stroke="{INK}" stroke-width="4"/>'
    b += f'<rect x="168" y="130" width="194" height="20" fill="#f2b705" {S}/><text x="265" y="146" text-anchor="middle" font-family="Rubik, Arial Black, sans-serif" font-weight="900" font-size="15" fill="{INK}">PASAR MALAM</text>'
    b += f'<circle cx="185" cy="300" r="20" fill="{INK}"/><circle cx="345" cy="300" r="20" fill="{INK}"/><circle cx="185" cy="300" r="8" fill="#c9c2b0"/><circle cx="345" cy="300" r="8" fill="#c9c2b0"/>'
    # hanging lamp glow
    b += f'<circle cx="265" cy="182" r="40" fill="#f6e7a8" opacity=".25"/><circle cx="265" cy="182" r="10" fill="#fff6c0" {S}/>'
    b += apple(200, 214, .55) + melon(250, 216, .5) + mango(300, 214, .55)
    b += f'<circle cx="340" cy="218" r="9" fill="#4f5bd5" {S}/><circle cx="352" cy="214" r="9" fill="#4f5bd5" {S}/>'
    # hawker with coins
    b += f'<path d="M410,340 Q414,280 445,276 Q476,280 480,340Z" fill="#3f7f43" {S}/>'
    b += face(445, 248, 24, '#c98d60')
    for i in range(3): b += f'<circle cx="{404+i*10}" cy="{290-i*6}" r="10" fill="#f2b705" {S}/>'
    pass  # no price tag (house style)
    #     b += tag(18, 26, '$3', fs=32)
    return svg(b)

# ---------- 7. Bake-Off ----------
def bake_off():
    b = rays(260, 180, '#e98c4f', '#f1a46c') + skyline('#8a3f2a', 240)
    b += ground('#c48a4e', 290)
    # table
    b += f'<rect x="60" y="250" width="400" height="20" fill="#fbf3df" {S}/>'
    # pie
    b += f'<ellipse cx="260" cy="235" rx="110" ry="30" fill="#c99448" {S}/><path d="M150,235 q110,-80 220,0" fill="#e2b56a" {S}/>'
    for i in range(5):
        b += f'<path d="M{170+i*40},{214-6*(2-abs(2-i))} l18,10" stroke="{INK}" stroke-width="4"/>'
    b += f'<ellipse cx="260" cy="235" rx="110" ry="30" fill="url(#dots)" opacity=".35"/>'
    # steam
    for x in (215, 260, 305):
        b += f'<path d="M{x},175 q-14,-20 0,-40 q14,-20 0,-40" fill="none" stroke="#fbf3df" stroke-width="6"/>'
    # rosette ribbon
    b += f'<path d="M402,140 l-14,62 l20,-12 l16,18 l6,-66Z" fill="#2f6db0" {S}/>'
    for i in range(12):
        t = 2*math.pi*i/12
        b += f'<circle cx="{420+30*math.cos(t):.1f}" cy="{110+30*math.sin(t):.1f}" r="12" fill="#f2b705" {S}/>'
    b += f'<circle cx="420" cy="110" r="26" fill="#fbf3df" {S}/><text x="420" y="119" text-anchor="middle" font-family="Rubik, Arial Black, sans-serif" font-weight="900" font-size="24" fill="{INK}">1st</text>'
    # apples
    b += apple(100, 228, .9) + apple(420, 228, .9) + apple(140, 238, .7)
    # baker
    b += face(80, 120, 26, '#f0c7a0', '#8a5a2b', f'<path d="M50,104 Q50,64 80,70 Q110,64 110,104Z" fill="#fbf3df" {S}/><rect x="52" y="98" width="56" height="12" rx="4" fill="#fbf3df" {S}/>')
    b += f'<path d="M40,250 Q44,160 80,154 Q116,160 120,250Z" fill="#fbf3df" {S}/>'
    pass  # no price tag (house style)
    #     b += tag(140, 26, '2 × $7', fs=26)
    return svg(b)

ART = {'touristBus': tourist_bus, 'monsoon': monsoon, 'durian': durian, 'kenduri': kenduri, 'mangoWindfall': mango_windfall, 'pasarMalam': pasar_malam, 'bakeOff': bake_off}
for k, fn in ART.items():
    open(os.path.join(OUT, f'{k}.svg'), 'w').write(fn())
print('ok', len(ART))
