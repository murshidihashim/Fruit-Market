"""Extract the owner's deck art (The Great Fruit Exchange) from the three Fruit-Market-Deck-Art PDFs.

DEC-066: events use Art 1 "The scene", shopkeepers use Art 2 "Over the counter", customers use Art 3 "At work".
Each illustration in the PDFs is a clean picture (no names or labels) plus a paper-grain layer; this script
joins the two layers and writes:
  public/art/...  small WebP files the app loads on demand
  print/art/...   full 300 ppi WebP files for the printed cards

Usage: python3 scripts/deck-art.py <Deck-Art-1.pdf> <Deck-Art-2.pdf> <Deck-Art-3.pdf>
Needs: pip install pymupdf pillow (a one-off tool; not part of the game build).
"""
import io
import os
import sys

import pymupdf as fitz
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, 'public', 'art')
PRINT = os.path.join(ROOT, 'print', 'art')

# Card order in the PDFs is the rules 9 order (src/engine/data.ts). Keys are the hidden code keys, never shown.
CUSTOMERS = ['John', 'Robert', 'Daniel', 'Rara Jenab', 'Aisyah', 'Ravi', 'Mei Ling', 'Farid', 'Siti', 'Kumar', 'Grace',
             'Hafiz', 'Wei Jie', 'Nurul', 'Priya', 'Ahmad', 'Sarah', 'Tan', 'Lina', 'Zul', 'Anna', 'Vijay', 'Hui Min',
             'Osman', 'Jia Wen', 'Rizal', 'Devi', 'Marcus', 'Fatimah', 'Ben', 'Yuki', 'Hadi', 'Lakshmi', 'Kenji', 'Mira',
             'Hock Seng']
EVENTS = ['festival', 'glut', 'heatwave', 'blight', 'mangoCraze', 'superfood', 'goodHarvest', 'badHarvest', 'priceHike',
          'priceControls', 'inspector', 'strike', 'hotel']
SHOPKEEPERS = ['rosa', 'benny', 'chen', 'saleh', 'raj', 'kiran']

# (app width, print width) in px; print keeps the PDF's native 300 ppi size.
SIZES = {'customers': (400, None), 'events': (520, None), 'scenes': (600, None), 'avatars': (181, None)}


def slug(key):
    return key.lower().replace(' ', '-')


def layer(doc, xref):
    pix = fitz.Pixmap(doc, xref)
    smask = doc.xref_get_key(xref, 'SMask')
    if smask[0] == 'xref':
        pix = fitz.Pixmap(pix, fitz.Pixmap(doc, int(smask[1].split()[0])))
    img = Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGBA')
    return img


def groups(doc, pno, width_range):
    """Pictures on one page, in reading order: each is the list of image layers drawn at the same place."""
    found = {}
    for info in doc[pno].get_image_info(xrefs=True):
        if info['xref'] == 0 or not (width_range[0] <= info['width'] <= width_range[1]):
            continue
        box = tuple(round(v) for v in info['bbox'])
        found.setdefault(box, [])
        if info['xref'] not in found[box]:
            found[box].append(info['xref'])
    # Rows first (cards in one row can start at slightly different heights), then left to right.
    rows = []
    for b in sorted(found, key=lambda b: b[1]):
        if rows and b[1] - rows[-1][0][1] < 60:
            rows[-1].append(b)
        else:
            rows.append([b])
    return [found[b] for row in rows for b in sorted(row, key=lambda b: b[0])]


def compose(doc, xrefs):
    base = layer(doc, xrefs[0])
    for x in xrefs[1:]:
        top = layer(doc, x)
        if top.size != base.size:
            top = top.resize(base.size)
        base.alpha_composite(top)
    return base


def save(img, kind, name):
    app_w, _ = SIZES[kind]
    os.makedirs(os.path.join(APP, kind), exist_ok=True)
    os.makedirs(os.path.join(PRINT, kind), exist_ok=True)
    img.save(os.path.join(PRINT, kind, name + '.webp'), 'WEBP', quality=94, method=6)
    small = img if img.width <= app_w else img.resize((app_w, round(img.height * app_w / img.width)), Image.LANCZOS)
    small.save(os.path.join(APP, kind, name + '.webp'), 'WEBP', quality=82, method=6)


def main(art1, art2, art3):
    d1, d2, d3 = fitz.open(art1), fitz.open(art2), fitz.open(art3)
    events = [g for p in range(1, 5) for g in groups(d1, p, (600, 760))]
    customers = [g for p in range(7, 11) for g in groups(d3, p, (500, 560))]
    scenes = [g for p in range(5, 7) for g in groups(d2, p, (780, 860))]
    avatars = [g for p in range(5, 7) for g in groups(d2, p, (170, 190))]
    for found, want, what in ((events, EVENTS, 'events'), (customers, CUSTOMERS, 'customers'),
                              (scenes, SHOPKEEPERS, 'shopkeeper scenes'), (avatars, SHOPKEEPERS, 'shopkeeper avatars')):
        if len(found) != len(want):
            sys.exit(f'Expected {len(want)} {what}, found {len(found)}. Check the PDFs are the Deck Art 1, 2 and 3 files.')
    for xrefs, key in zip(events, EVENTS):
        save(compose(d1, xrefs), 'events', key)
    for xrefs, key in zip(customers, CUSTOMERS):
        save(compose(d3, xrefs), 'customers', slug(key))
    for xrefs, key in zip(scenes, SHOPKEEPERS):
        save(compose(d2, xrefs), 'scenes', key)
    for xrefs, key in zip(avatars, SHOPKEEPERS):
        save(compose(d2, xrefs), 'avatars', key)
    print(f'Wrote {len(events)} events, {len(customers)} customers, {len(scenes)} shopkeeper scenes and avatars.')


if __name__ == '__main__':
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
