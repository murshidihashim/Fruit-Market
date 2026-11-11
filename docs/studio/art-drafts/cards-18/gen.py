"""Flat pictures in the Market Ticket style for the rules 18 card mock-ups: one customer scene, one event, six favours,
five upgrades. Every fruit in a picture is the game's own fruit icon (src/ui/fruitIcons, exported to fruit-shapes.json),
so a blueberry, watermelon, mango or apple looks the same wherever it appears. Writes plain SVG (shapes only: no styles,
scripts, fonts or embedded images) beside this file.

Run: python3 docs/studio/art-drafts/cards-18/gen.py
fruit-shapes.json holds the inner SVG of fruitSvgString(fruit, stage) from src/ui/fruitIcons for the four fruits,
fresh and unripe; export it again if the game's fruit icons change."""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = HERE
SHAPES = json.load(open(os.path.join(HERE, 'fruit-shapes.json')))

INK, PAPER, KRAFT, PALE = '#1f272a', '#fffcf5', '#ddd4c6', '#efe9df'
YEL, RED, REDD, GRN, BLU, BLU2 = '#fec400', '#e73c35', '#b62528', '#0e9a58', '#3558a2', '#4467b3'
SKIN, SKIN2 = '#e3ae8b', '#c19072'
BURST = 'M410 -18L431.2 20.8L469 -2.2L468 42L512.2 41L489.2 78.8L528 100L489.2 121.2L512.2 159L468 158L469 202.2L431.2 179.2L410 218L388.8 179.2L351 202.2L352 158L307.8 159L330.8 121.2L292 100L330.8 78.8L307.8 41L352 42L351 -2.2L388.8 20.8Z'


def fr(fruit, x, y, size, stage='fresh'):
    """The game's fruit icon, its 32 by 32 box placed with its top-left corner at (x, y) and scaled to `size`."""
    return f'<g transform="translate({x} {y}) scale({size / 32:.4f})">{SHAPES[fruit + ":" + stage]}</g>'


def svg(box, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{box}">{body}</svg>\n'


def favour(body):
    return svg('0 0 300 150', f'<rect width="300" height="150" fill="{BLU}"/><circle cx="150" cy="78" r="94" fill="{BLU2}"/>' + body)


def upgrade(body):
    return svg('0 0 300 150', f'<rect width="300" height="150" fill="{KRAFT}"/><circle cx="150" cy="78" r="92" fill="{PALE}"/>' + body)


ART = {}

# Firefighter Osman at the fire station: the shutter door and its bell on the left, a ladder on the right.
ART['customer-osman-scene'] = svg('0 0 600 400', f'''
<rect width="600" height="400" fill="{KRAFT}"/><circle cx="300" cy="200" r="175" fill="{PALE}"/>
<rect x="22" y="70" width="150" height="262" fill="{RED}"/>
<path d="M22 110h150M22 150h150M22 190h150M22 230h150M22 270h150M22 310h150" stroke="{REDD}" stroke-width="6"/>
<rect x="10" y="52" width="174" height="20" fill="{INK}"/>
<circle cx="97" cy="28" r="16" fill="{YEL}"/><circle cx="97" cy="28" r="5" fill="{INK}"/>
<path d="M452 30v302M532 30v302" stroke="{INK}" stroke-width="12"/>
<path d="M452 70h80M452 120h80M452 170h80M452 220h80M452 270h80" stroke="{INK}" stroke-width="9"/>
<rect y="332" width="600" height="68" fill="{INK}"/>
<path d="M130 400v-70c0-34 28-56 62-56h216c34 0 62 22 62 56v70z" fill="{INK}"/>
<path d="M130 340h340v17H130zM130 374h340v17H130z" fill="{RED}"/>
<rect x="275" y="250" width="50" height="34" fill="{SKIN2}"/><circle cx="300" cy="195" r="82" fill="{SKIN}"/>
<path d="M212 158a88 82 0 01176 0z" fill="{RED}"/><rect x="192" y="146" width="216" height="20" rx="10" fill="{RED}"/>
<circle cx="300" cy="104" r="16" fill="{PAPER}"/>
<circle cx="270" cy="184" r="9" fill="{INK}"/><circle cx="330" cy="184" r="9" fill="{INK}"/>
<path d="M300 216c-10-12-34-12-46 0 4 14 30 18 46 6 16 12 42 8 46-6-12-12-36-12-46 0z" fill="{INK}"/>''')

# Heatwave: the picture from the Market Ticket event card, framed so its ground strip sits on the bottom edge.
ART['event-heatwave'] = svg('0 -72 566 362', f'''
<rect y="-72" width="566" height="362" fill="{RED}"/>
<path d="M240 100a170 170 0 1 0 340 0a170 170 0 1 0-340 0Z" fill="#ee6525"/><path d="{BURST}" fill="{YEL}"/>
<path d="M340 100a70 70 0 1 0 140 0a70 70 0 1 0-140 0Z" fill="{PAPER}"/><path d="M352 100a58 58 0 1 0 116 0a58 58 0 1 0-116 0Z" fill="{YEL}"/>
<circle cx="390" cy="94" r="6.6" fill="{INK}"/><circle cx="430" cy="94" r="6.6" fill="{INK}"/>
<path d="M388 116q22 18 44 0" fill="none" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>
<rect y="232" width="566" height="58" fill="{INK}"/>
<rect x="52" y="26" width="34" height="160" rx="17" fill="{PAPER}"/><rect x="63" y="84" width="12" height="96" rx="6" fill="{INK}"/>
<circle cx="69" cy="194" r="28" fill="{PAPER}"/><circle cx="69" cy="194" r="18" fill="{INK}"/>
<path d="M96 58h16v6H96ZM96 88h16v6H96ZM96 118h16v6H96ZM96 148h16v6H96Z" fill="{PAPER}"/>
<path d="M150 150q14-15 0-30t0-30M196 136q14-15 0-30t0-30" fill="none" stroke="{PAPER}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
{fr('watermelon', 150, 148, 230)}''')

# Favoured Trade: two price tags with the same price; the favoured one has the sunburst behind it.
ART['favour-favoured-trade'] = favour(f'''
<g transform="translate(90 75) scale(.46) translate(-410 -100)"><path d="{BURST}" fill="{YEL}"/></g>
<path d="M66 49h62v52H66L46 75z" fill="{PAPER}"/><circle cx="67" cy="75" r="5" fill="{YEL}"/>
<path d="M82 62h34v8H82zM82 78h22v8H82z" fill="{INK}"/>
<path d="M196 49h62v52h-62l-20-26z" fill="{PAPER}"/><circle cx="197" cy="75" r="5" fill="{BLU2}"/>
<path d="M212 62h34v8h-34zM212 78h22v8h-22z" fill="{INK}"/>
<path d="M147 66h16v6h-16zM147 78h16v6h-16z" fill="{PAPER}"/>''')

# Gossip: a word in your ear, and an eye on a face-down ticket.
ART['favour-gossip'] = favour(f'''
<path d="M30 30h110a12 12 0 0112 12v44a12 12 0 01-12 12H86l-22 22V98H30a12 12 0 01-12-12V42a12 12 0 0112-12z" fill="{PAPER}"/>
<circle cx="58" cy="64" r="8" fill="{INK}"/><circle cx="86" cy="64" r="8" fill="{INK}"/><circle cx="114" cy="64" r="8" fill="{INK}"/>
<g transform="rotate(8 225 78)"><rect x="180" y="22" width="90" height="112" fill="{INK}"/><rect x="190" y="32" width="70" height="70" fill="{KRAFT}"/><rect x="190" y="110" width="70" height="14" fill="{YEL}"/></g>
<path d="M194 68c14-19 48-19 62 0-14 19-48 19-62 0z" fill="{PAPER}" stroke="{INK}" stroke-width="5"/>
<circle cx="225" cy="68" r="10" fill="{INK}"/>''')

# Scout: a magnifying glass on the first ticket in the row.
ART['favour-scout'] = favour(f'''
<rect x="150" y="38" width="56" height="78" fill="{INK}"/><rect x="158" y="46" width="40" height="46" fill="{KRAFT}"/>
<rect x="222" y="38" width="56" height="78" fill="{INK}"/><rect x="230" y="46" width="40" height="46" fill="{KRAFT}"/>
<rect x="64" y="26" width="66" height="96" fill="{PAPER}"/>
{fr('apple', 75, 44, 44)}
<circle cx="97" cy="68" r="40" fill="none" stroke="{YEL}" stroke-width="10"/>
<path d="M68 98L38 132" stroke="{YEL}" stroke-width="14" stroke-linecap="round"/>''')

# Priority: one stall steps to the front of the buying queue.
ART['favour-priority'] = favour(f'''
<g fill="{KRAFT}"><circle cx="160" cy="62" r="15"/><path d="M134 150v-44a26 26 0 0152 0v44z"/><circle cx="214" cy="62" r="15"/><path d="M188 150v-44a26 26 0 0152 0v44z"/><circle cx="268" cy="62" r="15"/><path d="M242 150v-44a26 26 0 0152 0v44z"/></g>
<circle cx="84" cy="52" r="19" fill="{SKIN}"/><path d="M50 150V98a34 34 0 0168 0v52z" fill="{YEL}"/>
<path d="M256 26C204 2 146 4 112 22" fill="none" stroke="{PAPER}" stroke-width="6" stroke-linecap="round"/>
<path d="M100 28l24-13-3 24z" fill="{PAPER}"/>''')

# Free Fruit: a hand holds out an apple.
ART['favour-free-fruit'] = favour(f'''
<rect y="104" width="120" height="46" fill="{PAPER}"/><rect x="112" y="100" width="14" height="50" fill="{KRAFT}"/>
<path d="M124 104h86a18 18 0 010 36h-86z" fill="{SKIN}"/>
{fr('apple', 132, 24, 80)}
<path d="M234 40l10-10M246 66h14M234 92l10 10" stroke="{YEL}" stroke-width="6" stroke-linecap="round"/>''')

# Fridge: fruit kept cold.
ART['favour-fridge'] = favour(f'''
<rect x="100" y="10" width="100" height="134" rx="8" fill="{PAPER}"/>
<path d="M100 58h100" stroke="{INK}" stroke-width="5"/>
<path d="M116 24v22M116 72v36" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>
<rect x="132" y="72" width="58" height="62" fill="{KRAFT}"/>
{fr('apple', 134, 102, 28)}{fr('mango', 160, 102, 28)}
<path d="M244 38v44M225 49l38 22M225 71l38-22" stroke="{PAPER}" stroke-width="6" stroke-linecap="round"/>
<path d="M56 72v30M43 79l26 16M43 95l26-16" stroke="{PAPER}" stroke-width="5" stroke-linecap="round"/>''')

# Juice Bar: a jug, a glass with a straw and a slice of watermelon.
ART['upgrade-juice-bar'] = upgrade(f'''
<path d="M120 60h60l-8 90h-44z" fill="{PAPER}"/><path d="M123 92h54l-5 58h-44z" fill="{YEL}"/>
<path d="M161 36l-11 108" stroke="{RED}" stroke-width="7" stroke-linecap="round"/>
{fr('watermelon', 192, 78, 78)}
<rect x="46" y="88" width="46" height="62" fill="{PAPER}"/><rect x="46" y="112" width="46" height="38" fill="{RED}"/>
<path d="M92 100h8a8 8 0 018 8v12a8 8 0 01-8 8h-8" fill="none" stroke="{PAPER}" stroke-width="7"/>
<rect x="42" y="80" width="54" height="10" fill="{RED}"/>''')

# Premium Display: fruit on a stepped stand under a light.
ART['upgrade-premium-display'] = upgrade(f'''
<path d="M150 0L100 150h100z" fill="{YEL}" opacity=".45"/>
<rect x="60" y="118" width="180" height="32" fill="{GRN}"/><rect x="90" y="88" width="120" height="30" fill="{GRN}"/><rect x="120" y="58" width="60" height="30" fill="{GRN}"/>
<path d="M60 118h180M90 88h120M120 58h60" stroke="{YEL}" stroke-width="4"/>
{fr('apple', 129, 16, 42)}{fr('blueberry', 90, 60, 30)}{fr('blueberry', 180, 60, 30)}{fr('mango', 59, 88, 32)}{fr('mango', 209, 88, 32)}''')

# Ripening Room: a green mango turns ripe under a warm lamp.
ART['upgrade-ripening-room'] = upgrade(f'''
<path d="M150 0v16" stroke="{INK}" stroke-width="6"/><path d="M118 40a32 26 0 0164 0z" fill="{INK}"/>
<path d="M124 40h52l24 44H100z" fill="{YEL}" opacity=".5"/>
<rect x="40" y="114" width="220" height="10" fill="{REDD}"/><path d="M52 124v26M248 124v26" stroke="{REDD}" stroke-width="10"/>
{fr('mango', 62, 60, 56, 'unripe')}{fr('mango', 182, 60, 56)}
<path d="M134 88h26M150 78l12 10-12 10" fill="none" stroke="{INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>''')

# Order Book: a ledger with orders ticked off, and a pen.
ART['upgrade-order-book'] = upgrade(f'''
<rect x="40" y="34" width="104" height="96" fill="{PAPER}"/><rect x="156" y="34" width="104" height="96" fill="{PAPER}"/>
<rect x="144" y="28" width="12" height="108" fill="{INK}"/>
<path d="M56 56h72M56 76h72M56 96h50M196 58h50M196 82h50M196 106h50" stroke="{KRAFT}" stroke-width="7"/>
<path d="M170 56l6 7 10-13M170 80l6 7 10-13" fill="none" stroke="{GRN}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="170" y="98" width="15" height="15" fill="none" stroke="{INK}" stroke-width="4"/>
<path d="M240 126l38-66" stroke="{RED}" stroke-width="10" stroke-linecap="round"/><path d="M240 126l-5 11 10-5z" fill="{INK}"/>''')

# Handcart: a hand truck stacked with two crates of fruit.
ART['upgrade-handcart'] = upgrade(f'''
<g transform="translate(0 12)">
{fr('apple', 114, 2, 28)}{fr('blueberry', 140, 0, 28)}{fr('mango', 166, 1, 28)}
<rect x="112" y="72" width="84" height="44" fill="{YEL}"/><rect x="112" y="28" width="84" height="44" fill="{PAPER}"/>
<path d="M112 42h84M112 58h84M112 86h84M112 102h84" stroke="{INK}" stroke-width="4"/>
<rect x="112" y="28" width="84" height="88" fill="none" stroke="{INK}" stroke-width="5"/><path d="M112 72h84" stroke="{INK}" stroke-width="5"/>
<path d="M98 14v106h112" fill="none" stroke="{INK}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M98 16c-16 0-26 6-30 16" fill="none" stroke="{INK}" stroke-width="9" stroke-linecap="round"/>
<circle cx="106" cy="122" r="16" fill="{INK}"/><circle cx="106" cy="122" r="6" fill="{YEL}"/></g>''')

for name, s in ART.items():
    open(os.path.join(OUT, name + '.svg'), 'w').write(' '.join(s.split()) + '\n')
print(len(ART), 'pictures written')
