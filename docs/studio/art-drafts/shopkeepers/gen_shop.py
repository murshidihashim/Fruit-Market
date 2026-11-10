# Stall scenes (600 x 450) for the two rules 11 shopkeepers, in the style of the owner's six (public/art/scenes):
# a sunburst with light dots, the shopkeeper's head and neck over a wooden counter, and their perk's object on the right.
# Pak Din: Shade Cloth (a striped cloth shading a crate of fruit). Farah: Sharp Ears (a hand cupped to her ear and a
# parrot saying "psst!"). The round badges (181 x 181) are crops of the head, as with the owner's six.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'events'))  # the shared drawing kit
import gen
from gen import INK, Y, Y2, CREAM, R, G, G2, WOOD, WHITE, obj, line, rays, apple, mango, crate, sparkle, defs

gen.W, gen.H = 600, 450
W, H = 600, 450
HERE = os.path.dirname(os.path.abspath(__file__))
CY = 372  # top of the counter

def counter():
    top = f'<rect x="-10" y="{CY}" width="{W+20}" height="{H-CY+10}" fill="#b97a45"/>'
    dots = f'<rect x="-10" y="{CY}" width="{W+20}" height="14" fill="url(#dots)" opacity=".85"/>'
    return top + dots + line(f'M-10 {CY}H{W+10}', 5)

def bg_dots():
    return f'<rect width="{W}" height="{H}" fill="url(#dotsL)" opacity=".22"/>'

def head(cx, skin, top=96, chin=304, half=86):
    d = (f'M{cx-half} 150Q{cx-half} {top} {cx} {top}Q{cx+half} {top} {cx+half} 150L{cx+half} 228'
         f'Q{cx+half-6} {chin} {cx} {chin+2}Q{cx-half+6} {chin} {cx-half} 228Z')
    return f'<path d="{d}" {{A}}/>'

def neck_collar(cx, skin, collar=WHITE):
    return (obj(f'<rect x="{cx-30}" y="270" width="60" height="{CY-268}" {{A}}/>', skin, shade=False)
            + obj(f'<path d="M{cx-58} {CY}L{cx-30} {CY-20}L{cx} {CY-4}L{cx+30} {CY-20}L{cx+58} {CY}Z" {{A}}/>', collar, shade=False, sw=4))

def cheeks(cx, y, r=20):
    return ''.join(f'<circle cx="{cx+dx}" cy="{y}" r="{r}" fill="#e2603f" opacity=".75"/>' for dx in (-54, 54))

def svg(name, *parts):
    bg, *fg = parts
    s = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{defs()}{bg}{bg_dots()}'
         f'<g filter="url(#rough)">{"".join(fg)}</g></svg>')
    open(os.path.join(HERE, name + '.svg'), 'w').write(s)

def pak_din():
    cx, skin = 205, '#c98a5a'
    face = head(cx, skin)
    hair = ''.join(obj(f'<ellipse cx="{cx+k*84}" cy="{150}" rx="16" ry="26" {{A}}/>', '#efe6d4', shade=False, sw=4) for k in (-1, 1))
    ears = ''.join(obj(f'<ellipse cx="{cx+k*92}" cy="200" rx="18" ry="24" {{A}}/>', skin, shade=False, sw=4.5) for k in (-1, 1))
    songkok = (obj(f'<path d="M{cx-90} 140L{cx-84} 66Q{cx} 52 {cx+84} 66L{cx+90} 140Q{cx} 128 {cx-90} 140Z" {{A}}/>', '#1f2740', shade=False)
               + line(f'M{cx-86} 124Q{cx} 112 {cx+86} 124', 3, '#3a4668'))
    brows = ''.join(line(f'M{cx+k*58} 170Q{cx+k*40} 158 {cx+k*20} 168', 9, '#efe6d4') + line(f'M{cx+k*58} 170Q{cx+k*40} 158 {cx+k*20} 168', 2, INK) for k in (-1, 1))
    eyes = ''.join(line(f'M{cx+k*56} 196Q{cx+k*40} 182 {cx+k*24} 196', 6) for k in (-1, 1))  # calm, smiling eyes
    crinkles = ''.join(line(f'M{cx+k*64} 190L{cx+k*74} 186M{cx+k*64} 198L{cx+k*74} 200', 3) for k in (-1, 1))
    nose = f'<circle cx="{cx}" cy="220" r="15" fill="#a9643c"/>'
    mouth = f'<path d="M{cx-26} 256Q{cx} 282 {cx+26} 256Z" fill="{WHITE}" stroke="{INK}" stroke-width="4.5" stroke-linejoin="round"/>'
    tache = obj(f'<path d="M{cx-48} 254Q{cx-30} 230 {cx} 242Q{cx+30} 230 {cx+48} 254Q{cx+24} 248 {cx} 254Q{cx-24} 248 {cx-48} 254Z" {{A}}/>', '#efe6d4', shade=False, sw=4)
    goatee = obj(f'<path d="M{cx-16} 292Q{cx} 326 {cx+16} 292Q{cx} 300 {cx-16} 292Z" {{A}}/>', '#efe6d4', shade=False, sw=4)
    person = (neck_collar(cx, skin, G) + ears + obj(face, skin, mask='mR', op=.55) + hair + songkok + cheeks(cx, 236)
              + brows + eyes + crinkles + nose + tache + mouth + goatee)
    # Shade Cloth: a striped cloth on two poles keeps a crate of fruit in the shade
    poles = ''.join(obj(f'<rect x="{x}" y="138" width="14" height="{CY-138}" {{A}}/>', WOOD, shade=False, sw=4.5) for x in (368, 566))
    shadow = f'<path d="M372 {CY}L390 196H560L578 {CY}Z" fill="{INK}" opacity=".16"/>'
    goods = crate(386, 282, 180, 90) + apple(420, 270, 27) + mango(476, 266, 26) + apple(530, 272, 25)
    cloth = ''
    for i in range(6):
        x = 356 + i * 39
        cloth += obj(f'<path d="M{x} 126H{x+39}V172Q{x+19.5} 198 {x} 172Z" {{A}}/>', G if i % 2 == 0 else CREAM, shade=(i > 3), sw=4.5)
    cloth += line('M356 126H590', 5)
    cool = ''.join(line(f'M{x} 206q8 10 0 20', 4, '#9fd3e0') for x in (440, 500))
    svg('pakdin', rays('#3f8a7e', '#529f92', 230, 210), shadow, poles, goods, cloth, cool, person, counter(), sparkle(66, 70, 12), sparkle(300, 56, 10))

def farah():
    cx, skin = 215, '#d9a072'
    tudung_c = Y
    drape = obj(f'<path d="M{cx-118} {CY+4}C{cx-120} 300 {cx-110} 120 {cx} 82C{cx+110} 120 {cx+120} 300 {cx+118} {CY+4}Z" {{A}}/>', tudung_c, mask='mR', op=.55)
    face = obj(f'<ellipse cx="{cx}" cy="212" rx="70" ry="88" {{A}}/>', skin, shade=False)
    hem = line(f'M{cx-74} 190Q{cx} 104 {cx+74} 190', 5)  # the scarf's edge round the face
    brooch = obj(f'<circle cx="{cx}" cy="314" r="11" {{A}}/>', R, shade=False, sw=4)
    eyes = ''
    for k in (-1, 1):
        eyes += f'<circle cx="{cx+k*30}" cy="200" r="17" fill="{WHITE}" stroke="{INK}" stroke-width="4.5"/>'
        eyes += f'<circle cx="{cx+k*30+8}" cy="201" r="8" fill="{INK}"/>'  # both glance right, towards the parrot
    brows = line(f'M{cx-48} 172Q{cx-30} 164 {cx-14} 172', 5) + line(f'M{cx+12} 166Q{cx+30} 152 {cx+50} 162', 5)  # one raised
    nose = f'<circle cx="{cx+4}" cy="230" r="11" fill="#bc7a4e"/>'
    mouth = f'<path d="M{cx-12} 262Q{cx+8} 276 {cx+24} 256Q{cx+10} 266 {cx-12} 262Z" fill="{WHITE}" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
    blush = ''.join(f'<circle cx="{cx+dx}" cy="244" r="15" fill="#e2603f" opacity=".7"/>' for dx in (-44, 44))
    # a hand cupped behind her right ear, the arm rising from behind the counter
    arm = f'M{cx+150} {CY+6}C{cx+152} 320 {cx+120} 270 {cx+104} 226'
    hand = (line(arm, 40, INK) + line(arm, 31, '#3f8a7e')
            + obj(f'<path d="M{cx+80} 168Q{cx+112} 150 {cx+122} 186L{cx+124} 228Q{cx+104} 246 {cx+86} 230Q{cx+102} 200 {cx+80} 168Z" {{A}}/>', skin, shade=False, sw=4.5)
            + ''.join(line(f'M{cx+104} {y}L{cx+120} {y-2}', 3) for y in (182, 198, 214)))
    waves = ''.join(line(f'M{cx+142+k*14} {176-k*6}Q{cx+152+k*14} 196 {cx+142+k*14} {216+k*6}', 4, WHITE) for k in (0, 1))
    person = drape + face + hem + blush + eyes + brows + nose + mouth + brooch + hand + waves
    # the parrot on its perch, passing on what it heard
    perch = (obj(f'<rect x="478" y="250" width="12" height="{CY-250}" {{A}}/>', WOOD, shade=False, sw=4)
             + obj(f'<rect x="430" y="{CY-12}" width="108" height="14" rx="5" {{A}}/>', WOOD, shade=False, sw=4)
             + obj('<rect x="436" y="244" width="96" height="12" rx="6" {A}/>', WOOD, shade=False, sw=4))
    tail = obj('<path d="M470 236L452 316L470 306L478 322L486 238Z" {A}/>', '#3d6fb8', shade=False, sw=4)
    body = obj('<path d="M454 212Q450 150 494 146Q530 148 528 192Q526 238 486 246Q458 246 454 212Z" {A}/>', '#3f9a57', op=.5)
    wing = obj('<path d="M466 196Q468 236 498 238Q512 214 496 190Q480 180 466 196Z" {A}/>', '#2f7a44', shade=False, sw=4)
    chest = f'<path d="M506 196Q520 214 508 232" fill="none" stroke="{Y}" stroke-width="10" stroke-linecap="round"/>'
    face_p = obj('<circle cx="506" cy="170" r="14" {A}/>', WHITE, shade=False, sw=3.5) + f'<circle cx="508" cy="170" r="5" fill="{INK}"/>'
    beak = obj('<path d="M522 168Q544 166 540 186Q534 196 524 188Z" {A}/>', Y2, shade=False, sw=4)
    crest = obj('<path d="M488 150L478 124L496 142L500 118L506 146Z" {A}/>', R, shade=False, sw=3.5)
    feet = line('M480 246v-6M494 246v-6', 4, '#e08a4f')
    bubble = (obj('<path d="M452 64H572Q586 64 586 78V118Q586 132 572 132H540L528 150L522 132H452Q438 132 438 118V78Q438 64 452 64Z" {A}/>', WHITE, shade=False, sw=4.5)
              + '<text x="512" y="110" text-anchor="middle" font-family="R8" font-size="30" fill="#263149">psst!</text>')
    parrot = tail + body + wing + chest + face_p + beak + crest + feet
    svg('farah', rays('#7d66a6', '#8f7ab5', 230, 210), person, perch, parrot, bubble, counter(), sparkle(70, 72, 12), sparkle(380, 60, 9))

if __name__ == '__main__':
    pak_din(); farah(); print('ok')
