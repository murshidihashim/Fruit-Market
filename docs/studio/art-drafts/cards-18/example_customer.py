"""The reference customer scene: Firefighter Osman at the fire station. It sets the level of detail for every customer.

Layers, back to front: the wall with a quiet pattern and a pale disc behind the head; the place (door, sign, bell, hose
reel, ladder); the floor in a soft tone (never a black bar); the person, drawn like their picture in
public/art-ticket/customers; one or two things in front that belong to them.

Run from the repo root: python3 docs/studio/art-drafts/cards-18/example_customer.py
"""
from kit import *

skin, shade = SKINS['tan']
bricks = ''.join(f'<path d="M0 {y}h600" stroke="{PALE}" stroke-width="3"/>' for y in range(34, 320, 44)) + \
    ''.join(f'<path d="M{x} {y}v44" stroke="{PALE}" stroke-width="3"/>' for y in range(34, 300, 88) for x in (210, 330, 450, 570)) + \
    ''.join(f'<path d="M{x} {y}v44" stroke="{PALE}" stroke-width="3"/>' for y in range(78, 300, 88) for x in (270, 390, 510))

osman = svg(600, 400, f'''
<rect width="600" height="400" fill="{KRAFT}"/>{bricks}
<circle cx="300" cy="196" r="172" fill="{PALE}"/>
<!-- the station door, its sign and bell -->
<rect x="14" y="56" width="176" height="270" fill="{INK}"/>
<rect x="24" y="78" width="156" height="248" fill="{RED}"/>
<path d="M24 112h156M24 146h156M24 180h156M24 214h156M24 248h156M24 282h156" stroke="{RED_D}" stroke-width="7"/>
<path d="M24 94h156M24 128h156M24 162h156M24 196h156M24 230h156M24 264h156M24 298h156" stroke="{RED_L}" stroke-width="2" opacity=".7"/>
<rect x="84" y="300" width="36" height="12" fill="{INK}"/>
<rect x="34" y="14" width="136" height="34" fill="{YEL}"/><rect x="34" y="14" width="136" height="6" fill="{YEL_D}"/>
<path d="M50 30h60M50 40h36" stroke="{INK}" stroke-width="6" stroke-linecap="round"/><circle cx="148" cy="33" r="9" fill="{RED}"/>
<!-- a hose reel on the wall and a ladder -->
<circle cx="508" cy="118" r="52" fill="{RED}"/><circle cx="508" cy="118" r="38" fill="{RED_D}"/><circle cx="508" cy="118" r="26" fill="{RED}"/>
<circle cx="508" cy="118" r="12" fill="{INK}"/><circle cx="508" cy="118" r="4" fill="{YEL}"/>
<path d="M508 170v64c0 18 26 18 26 36v56" fill="none" stroke="{RED}" stroke-width="10" stroke-linecap="round"/>
<rect x="526" y="318" width="16" height="16" fill="{YEL}"/>
<path d="M430 20v306M476 20v306" stroke="{INK}" stroke-width="9"/>
<path d="M430 54h46M430 94h46M430 134h46M430 174h46M430 214h46M430 254h46M430 294h46" stroke="{INK}" stroke-width="7"/>
<!-- the floor: a soft tone with a skirting line, never a black bar -->
<rect y="326" width="600" height="74" fill="{STONE}"/><rect y="326" width="600" height="6" fill="{SLATE}" opacity=".45"/>
<!-- Osman: red helmet with a white badge, moustache, dark jacket with red bands -->
<path d="M126 400v-66c0-36 30-60 66-60h216c36 0 66 24 66 60v66z" fill="{INK}"/>
<path d="M126 344h348v18H126zM126 378h348v18H126z" fill="{RED}"/>
<path d="M126 350h348" stroke="{YEL}" stroke-width="4"/><path d="M126 384h348" stroke="{YEL}" stroke-width="4"/>
<path d="M258 274l42 46 42-46" fill="none" stroke="{SLATE}" stroke-width="8" stroke-linejoin="round"/>
<rect x="294" y="316" width="12" height="84" fill="{SLATE}"/>
<rect x="274" y="250" width="52" height="36" fill="{shade}"/>
<circle cx="300" cy="196" r="82" fill="{skin}"/>
<circle cx="238" cy="216" r="13" fill="{RED_L}" opacity=".45"/><circle cx="362" cy="216" r="13" fill="{RED_L}" opacity=".45"/>
<path d="M210 160a90 86 0 01180 0z" fill="{RED}"/>
<path d="M232 120a70 60 0 0150-42" fill="none" stroke="{RED_L}" stroke-width="9" stroke-linecap="round" opacity=".8"/>
<rect x="190" y="148" width="220" height="22" rx="11" fill="{RED}"/><rect x="200" y="164" width="200" height="6" rx="3" fill="{RED_D}"/>
<circle cx="300" cy="106" r="18" fill="{PAPER}"/><circle cx="300" cy="106" r="9" fill="{YEL}"/>
<circle cx="270" cy="190" r="9" fill="{INK}"/><circle cx="330" cy="190" r="9" fill="{INK}"/>
<circle cx="273" cy="187" r="3" fill="{PAPER}"/><circle cx="333" cy="187" r="3" fill="{PAPER}"/>
<path d="M300 220c-10-12-36-12-48 0 4 15 32 19 48 6 16 13 44 9 48-6-12-12-38-12-48 0z" fill="{INK}"/>''')

save('customer-osman', osman)
sheet(['customer-osman'], 'sheet-example.png', cols=1, w=600)
print('ok')
