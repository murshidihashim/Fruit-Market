"""Pictures and pattern tiles for the card backs in the Ticket style (design A): one upright picture for each deck
and one repeating tile for each deck. Run from the repo root: python3 docs/studio/art-drafts/cards-18/backs.py"""
from kit import *

W, H = 360, 500
BLU2, SLATE2, INK2 = '#4467b3', '#737b7f', '#39454a'


def back(name, body):
    save('back-' + name, svg(W, H, body))


# Lorry: the market lorry, loaded, under its striped cover.
stripes = ''.join(f'<path d="M{48 + 30 * k} 196h15v64h-15z" fill="{PAPER}"/>' for k in range(6))
slats = ''.join(f'<path d="M40 {y}h190" stroke="{STONE}" stroke-width="5"/>' for y in (292, 318, 344))
back('lorry', f'''
<rect width="{W}" height="{H}" fill="{GRN}"/><circle cx="180" cy="236" r="158" fill="{GRN_L}"/>
{burst(292, 96, 46, YEL)}<circle cx="292" cy="96" r="20" fill="{PAPER}"/>
<rect y="404" width="{W}" height="96" fill="{STONE}"/><path d="M14 452h56M104 452h56M194 452h56M284 452h56" stroke="{PAPER}" stroke-width="8"/>
<clipPath id="cover"><path d="M40 260c0-40 30-66 95-66s95 26 95 66z"/></clipPath>
<path d="M40 260c0-40 30-66 95-66s95 26 95 66z" fill="{YEL}"/><g clip-path="url(#cover)">{stripes}</g>
<path d="M40 260c0-40 30-66 95-66s95 26 95 66z" fill="none" stroke="{YEL_D}" stroke-width="5"/>
{fr('apple', 52, 222, 44)}{fr('blueberry', 96, 226, 40)}{fr('mango', 136, 222, 44)}{fr('watermelon', 176, 214, 52)}
<rect x="40" y="260" width="190" height="110" fill="{KRAFT}"/>{slats}<rect x="40" y="260" width="190" height="8" fill="{STONE}"/>
<path d="M230 236h54c22 0 40 22 44 58v76h-98z" fill="{RED}"/><path d="M244 250h36c14 0 26 14 30 36h-66z" fill="{PALE}"/>
<rect x="230" y="318" width="98" height="10" fill="{RED_D}"/><rect x="308" y="332" width="20" height="16" fill="{YEL}"/>
<rect x="24" y="368" width="312" height="14" fill="{SLATE}"/>
<circle cx="96" cy="388" r="32" fill="{INK}"/><circle cx="96" cy="388" r="13" fill="{STONE}"/><circle cx="276" cy="388" r="32" fill="{INK}"/><circle cx="276" cy="388" r="13" fill="{STONE}"/>''')

# Event: the market loudhailer, with the sunburst from the Heatwave card behind it.
back('event', f'''
<rect width="{W}" height="{H}" fill="{RED}"/><circle cx="180" cy="240" r="158" fill="{ORANGE}"/>{burst(180, 240, 132, YEL)}
<circle cx="180" cy="240" r="78" fill="{PAPER}"/>
<path d="M96 214l120-62v176l-120-62z" fill="{RED}"/><path d="M96 214l120-62v32l-120 46z" fill="{RED_L}" opacity=".6"/>
<rect x="74" y="210" width="26" height="60" rx="6" fill="{INK}"/><ellipse cx="216" cy="240" rx="18" ry="88" fill="{RED_D}"/><ellipse cx="216" cy="240" rx="8" ry="60" fill="{INK}"/>
<path d="M118 268v46a14 14 0 0028 0v-34" fill="none" stroke="{INK}" stroke-width="12" stroke-linecap="round"/>
<path d="M252 196c18 26 18 62 0 88M280 172c32 42 32 94 0 136" fill="none" stroke="{PAPER}" stroke-width="10" stroke-linecap="round"/>
<path d="M54 96l14 14-14 14-14-14zM306 384l14 14-14 14-14-14zM64 388l10 10-10 10-10-10z" fill="{YEL}"/>''')

# Favour: a sealed envelope, kept secret.
back('favour', f'''
<rect width="{W}" height="{H}" fill="{BLU}"/><circle cx="180" cy="240" r="158" fill="{BLU2}"/>
<path d="M70 150l14 14-14 14-14-14zM290 330l14 14-14 14-14-14zM296 132l10 10-10 10-10-10zM62 340l10 10-10 10-10-10z" fill="{YEL}"/>
<rect x="58" y="170" width="244" height="160" fill="{PAPER}"/>
<path d="M58 330l96-84M302 330l-96-84" stroke="{KRAFT}" stroke-width="6"/>
<path d="M58 170l122 96 122-96z" fill="{PALE}"/><path d="M58 170l122 96 122-96" fill="none" stroke="{KRAFT}" stroke-width="6" stroke-linejoin="round"/>
<rect x="58" y="170" width="244" height="160" fill="none" stroke="{BLU_D}" stroke-width="6"/>
{burst(180, 262, 46, YEL)}<circle cx="180" cy="262" r="20" fill="{RED}"/><circle cx="174" cy="256" r="5" fill="{RED_L}"/>''')

# Upgrade: tools for the stall: a toolbox, a hammer and a way up.
back('upgrade', f'''
<rect width="{W}" height="{H}" fill="{SLATE}"/><circle cx="180" cy="240" r="158" fill="{SLATE2}"/>
<path d="M254 300V168h-34l56-66 56 66h-34v132z" fill="{YEL}"/><path d="M276 102l56 66h-34v132h-22z" fill="{YEL_D}"/>
<path d="M64 210L196 132" stroke="{KRAFT}" stroke-width="20" stroke-linecap="round"/><path d="M64 210L112 182" stroke="{STONE}" stroke-width="20" stroke-linecap="round"/>
<path d="M176 100l52 30-22 38-52-30z" fill="{INK}"/><path d="M176 100l18 10-22 38-18-10z" fill="{INK2}"/>
<path d="M118 262v-16a22 22 0 0122-22h64a22 22 0 0122 22v16" fill="none" stroke="{INK}" stroke-width="12"/>
<rect x="60" y="258" width="224" height="104" fill="{RED}"/><rect x="60" y="258" width="224" height="34" fill="{RED_D}"/>
<rect x="152" y="280" width="40" height="26" fill="{YEL}"/><rect x="164" y="290" width="16" height="6" fill="{INK}"/>
<path d="M60 334h224" stroke="{RED_L}" stroke-width="4" opacity=".7"/>
<circle cx="84" cy="390" r="7" fill="{STONE}"/><circle cx="112" cy="398" r="7" fill="{STONE}"/><path d="M140 384l26 16" stroke="{STONE}" stroke-width="7" stroke-linecap="round"/>''')

# Shopkeeper: an empty stall, waiting for its keeper.
scal = ''.join(f'<circle cx="{70 + 44 * k}" cy="176" r="22" fill="{RED if k % 2 == 0 else PAPER}"/>' for k in range(6))
awn = ''.join(f'<rect x="{48 + 44 * k}" y="118" width="44" height="58" fill="{RED if k % 2 == 0 else PAPER}"/>' for k in range(6))
back('shopkeeper', f'''
<rect width="{W}" height="{H}" fill="{KRAFT}"/><circle cx="180" cy="250" r="158" fill="{PALE}"/>
<path d="M62 176v210M298 176v210" stroke="{SLATE}" stroke-width="12"/>
{awn}{scal}<rect x="48" y="108" width="264" height="12" fill="{RED_D}"/>
<rect x="150" y="204" width="60" height="34" fill="{YEL}"/><path d="M162 216h36M162 226h22" stroke="{INK}" stroke-width="5" stroke-linecap="round"/><path d="M180 198v6" stroke="{SLATE}" stroke-width="4"/>
{fr('watermelon', 76, 250, 56)}{fr('apple', 136, 262, 46)}{fr('mango', 182, 262, 46)}{fr('blueberry', 232, 266, 42)}
<rect x="70" y="300" width="100" height="40" fill="{PAPER}"/><path d="M70 314h100M70 328h100" stroke="{STONE}" stroke-width="4"/>
<rect x="190" y="300" width="100" height="40" fill="{PAPER}"/><path d="M190 314h100M190 328h100" stroke="{STONE}" stroke-width="4"/>
<rect x="40" y="340" width="280" height="64" fill="{YEL}"/><rect x="40" y="340" width="280" height="12" fill="{YEL_D}"/>
<path d="M40 404h280" stroke="{STONE}" stroke-width="8"/>''')

# Standing order: the order sheet on its board, stamped.
lines = ''.join(f'<path d="M150 {y}h110" stroke="{KRAFT}" stroke-width="10" stroke-linecap="round"/>' for y in (196, 246, 296))
back('standing-order', f'''
<rect width="{W}" height="{H}" fill="{INK}"/><circle cx="180" cy="250" r="158" fill="{INK2}"/>{burst(180, 250, 150, YEL)}
<rect x="74" y="120" width="212" height="280" fill="{STONE}"/><rect x="88" y="140" width="184" height="246" fill="{PAPER}"/>
<rect x="136" y="100" width="88" height="40" rx="6" fill="{SLATE}"/><circle cx="180" cy="112" r="8" fill="{INK}"/>
{fr('apple', 100, 178, 36)}{fr('mango', 100, 228, 36)}{fr('blueberry', 100, 278, 36)}{lines}
<path d="M238 190l8 9 14-18M238 240l8 9 14-18" fill="none" stroke="{GRN}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="222" cy="342" r="30" fill="none" stroke="{RED}" stroke-width="7"/><path d="M206 342h32M214 330h16M214 354h16" stroke="{RED}" stroke-width="6" stroke-linecap="round"/>''')

# Pattern tiles, 96 by 96, two motifs staggered, in the darker tone of the deck colour; the card colour shows through.
ICON = {
    'lorry': '<path d="M2 11h27v22H2zM31 17h9l6 8v8H31z"/><circle cx="11" cy="35" r="6"/><circle cx="37" cy="35" r="6"/>',
    'event': '<g transform="translate(24 24) scale(.19) translate(-410 -100)"><path d="' + BURST + '"/></g>',
    'favour': '<path d="M5 17h15v9H5zM28 17h15v9H28zM8 28h12v16H8zM28 28h12v16H28zM24 16c-7-11-17-6-12 0zM24 16c7-11 17-6 12 0z"/>',
    'upgrade': '<path d="M24 3l17 19H31v22H17V22H7z"/>',
    'shopkeeper': '<path d="M3 7h42v11a5.25 5.25 0 01-10.5 0 5.25 5.25 0 01-10.5 0 5.25 5.25 0 01-10.5 0 5.25 5.25 0 01-10.5 0zM7 29h34v15H7z"/>',
    'standing-order': '<path d="M9 8h30v37H9zM17 3h14v9H17z"/>',
}
TONE = {'lorry': GRN_D, 'event': RED_D, 'favour': BLU_D, 'upgrade': INK2, 'shopkeeper': STONE, 'standing-order': INK2}
for kind, shape in ICON.items():
    g = f'<g fill="{TONE[kind]}"><g transform="translate(6 6) scale(.75)">{shape}</g><g transform="translate(54 54) scale(.75)">{shape}</g></g>'
    save('tile-' + kind, svg(96, 96, g))

names = ['back-' + k for k in ICON]
sheet(names, 'sheet-backs.png', cols=6, w=200, ratio=W / H)
print('ok')
