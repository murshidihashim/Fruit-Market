"""Shared pieces for the card pictures of the rules 18 card set (flat Market Ticket style).

Every picture is plain SVG: filled shapes and a few round-capped strokes. No text, fonts, gradients, filters, styles,
scripts or embedded images, so it prints sharp at any size and loads anywhere.

    from kit import *          # palette, fr(), svg(), save(), sheet()
    save('customer-osman', svg(600, 400, '...shapes...'))
    sheet(['customer-osman'], 'sheet-example.png')     # a contact sheet to look at

Fruit: always fr('apple', x, y, size) and so on, the game's own icons (fruit-shapes.json, exported from
src/ui/fruitIcons). Never draw a fruit by hand.
"""
import json
import os
import subprocess
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SHAPES = json.load(open(os.path.join(HERE, 'fruit-shapes.json')))

# The game's colours. Each lane colour has a darker and a lighter tone for shade and light; use nothing else.
INK, SLATE, STONE, KRAFT, PALE, PAPER = '#1f272a', '#5a6266', '#bdb4a6', '#ddd4c6', '#efe9df', '#fffcf5'
YEL, YEL_D, YEL_L = '#fec400', '#e0a800', '#ffdc66'
RED, RED_D, RED_L = '#e73c35', '#b62528', '#f2918c'
GRN, GRN_D, GRN_L = '#0e9a58', '#0b7a45', '#7cc9a0'
BLU, BLU_D, BLU_L = '#3558a2', '#27447f', '#7f9ad6'
ORANGE, PINK, LEAF = '#ee6525', '#ef7b86', '#8cc152'
SKINS = {'light': ('#f6d2b8', '#e2b698'), 'tan': ('#e3ae8b', '#c19072'), 'brown': ('#c98f66', '#a8754f'), 'deep': ('#9a6844', '#7d5236')}
# The 12-point sunburst from the Heatwave card, centred on (410, 100), outer radius 118.
BURST = 'M410 -18L431.2 20.8L469 -2.2L468 42L512.2 41L489.2 78.8L528 100L489.2 121.2L512.2 159L468 158L469 202.2L431.2 179.2L410 218L388.8 179.2L351 202.2L352 158L307.8 159L330.8 121.2L292 100L330.8 78.8L307.8 41L352 42L351 -2.2L388.8 20.8Z'


def fr(fruit, x, y, size, stage='fresh'):
    """The game's fruit icon: its 32 by 32 box with the top-left corner at (x, y), scaled to `size`.
    fruit: blueberry | watermelon | mango | apple. stage: fresh | unripe (a green mango)."""
    return f'<g transform="translate({x} {y}) scale({size / 32:.4f})">{SHAPES[fruit + ":" + stage]}</g>'


def burst(cx, cy, r, fill=YEL):
    """The sunburst, centred on (cx, cy) with outer radius r."""
    return f'<g transform="translate({cx} {cy}) scale({r / 118:.4f}) translate(-410 -100)"><path d="{BURST}" fill="{fill}"/></g>'


def svg(w, h, body, y0=0):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 {y0} {w} {h}">{body}</svg>\n'


def save(name, markup):
    """Write HERE/<name>.svg on one line. Refuses anything that is not plain shapes."""
    for bad in ('<style', '<image', '<text', 'foreignObject', '<filter', 'Gradient', '<script', 'font-'):
        assert bad not in markup, f'{name}: {bad} is not allowed in a card picture'
    open(os.path.join(HERE, name + '.svg'), 'w').write(' '.join(markup.split()) + '\n')


def sheet(names, out_png, cols=4, w=300, ratio=1.5):
    """Render a contact sheet of HERE/<name>.svg files to HERE/<out_png> (Playwright; run from the repo root)."""
    h = round(w / ratio)
    figs = ''.join(
        f'<figure style="margin:0"><img src="file://{HERE}/{n}.svg" style="width:{w}px;height:{h}px;object-fit:cover;display:block;border:2px solid {INK}">'
        f'<figcaption style="font:12px sans-serif">{n}</figcaption></figure>' for n in names)
    rows = -(-len(names) // cols)
    with tempfile.TemporaryDirectory() as tmp:
        page = os.path.join(tmp, 'sheet.html')
        open(page, 'w').write(f'<body style="margin:12px;display:grid;grid-template-columns:repeat({cols},{w + 4}px);gap:12px;background:#fff">{figs}</body>')
        js = os.path.join(tmp, 'shot.cjs')
        open(js, 'w').write(
            "const { chromium } = require('playwright');(async () => { const b = await chromium.launch();"
            f"const p = await b.newPage({{ viewport: {{ width: {cols * (w + 16) + 24}, height: {rows * (h + 34) + 24} }}, deviceScaleFactor: 2 }});"
            f"await p.goto('file://{page}'); await p.screenshot({{ path: '{os.path.join(HERE, out_png)}', fullPage: true }}); await b.close(); }})();")
        subprocess.run(['node', js], check=True, cwd=os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(HERE)))))
