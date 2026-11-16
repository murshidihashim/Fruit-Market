"""3D-printable fruit pieces for the table set (PLAN-111): three styles for each of the four fruits, as STL files,
and a picture of each fruit's three styles.

    python3 -I scripts/fruit-3d.py <outdir>

Every piece sits in a stall-sheet box (24 x 15.5 mm) and a market box with room to spare. Sizes are in millimetres.
  A  token: the fruit's outline, 12-13 mm across and 5 mm thick, with a raised detail; flat underneath, so tokens stack.
  B  mini fruit: a small round fruit about 10-14 mm, flat underneath so it does not roll; does not stack.
  C  stacking cube: a 10 mm cube with the fruit raised 1 mm on two opposite sides; stacks like a plain cube.
Print each fruit in its own colour (blue, green, yellow, red); 50 of each. Pieces overlap where parts meet, which every
common slicer merges into one solid.
"""
import math
import struct
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)
COLOUR = {'blueberry': (53, 88, 162), 'watermelon': (14, 154, 88), 'mango': (240, 180, 0), 'apple': (231, 60, 53)}
N = 64


# ---------- mesh primitives (lists of triangles, each 3 points) ----------
def extrude(poly, z0, z1):
    """A prism from a 2D outline (counter-clockwise, star-shaped about its centroid) between heights z0 and z1."""
    poly = np.asarray(poly, float)
    c = poly.mean(axis=0)
    tris = []
    n = len(poly)
    for i in range(n):
        a, b = poly[i], poly[(i + 1) % n]
        A0, B0, A1, B1 = (*a, z0), (*b, z0), (*a, z1), (*b, z1)
        tris += [(A0, B0, B1), (A0, B1, A1)]
        tris += [((*c, z1), A1, B1), ((*c, z0), B0, A0)]
    return tris


def revolve(profile, segs=N):
    """A solid of revolution about the z axis from a profile [(r, z)] running bottom to top; flat ends where r > 0."""
    tris = []
    ang = [2 * math.pi * k / segs for k in range(segs)]
    ring = lambda r, z: [(r * math.cos(t), r * math.sin(t), z) for t in ang]
    rings = [ring(r, z) for r, z in profile]
    for (r0, z0), (r1, z1), R0, R1 in zip(profile, profile[1:], rings, rings[1:]):
        for k in range(segs):
            a, b, c, d = R0[k], R0[(k + 1) % segs], R1[k], R1[(k + 1) % segs]
            tris += [(a, b, d), (a, d, c)]
    if profile[0][0] > 0:
        z = profile[0][1]
        tris += [((0, 0, z), rings[0][(k + 1) % segs], rings[0][k]) for k in range(segs)]
    if profile[-1][0] > 0:
        z = profile[-1][1]
        tris += [((0, 0, z), rings[-1][k], rings[-1][(k + 1) % segs]) for k in range(segs)]
    return tris


def box(x0, y0, z0, x1, y1, z1):
    p = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    return extrude(p, z0, z1)


def move(tris, dx=0, dy=0, dz=0, sx=1, sy=1, sz=1, f=None):
    out = []
    for t in tris:
        q = []
        for x, y, z in t:
            x, y, z = x * sx, y * sy, z * sz
            if f:
                x, y, z = f(x, y, z)
            q.append((x + dx, y + dy, z + dz))
        out.append(tuple(q))
    return out


def side_relief(poly, depth, face_y, size):
    """The outline `poly` (drawn in x and up) raised `depth` mm out of the cube face y = face_y."""
    tris = extrude(poly, 0, depth)
    sign = -1 if face_y <= 0 else 1
    return move(tris, f=lambda x, y, z: (x, face_y + sign * z - (0.2 * sign), y + size / 2))


# ---------- outlines (mm, centred, counter-clockwise) ----------
def polar(fn, n=N):
    return [(fn(t) * math.cos(t), fn(t) * math.sin(t)) for t in (2 * math.pi * k / n for k in range(n))]


def outline(fruit, s=1.0):
    if fruit == 'blueberry':
        return [(x * s, y * s) for x, y in polar(lambda t: 6)]
    if fruit == 'watermelon':  # a slice: flat rind edge on top
        pts = [(6.5 * math.cos(t), 2.2 + 6.5 * math.sin(t)) for t in np.linspace(math.pi, 2 * math.pi, N)]
        return [(x * s, y * s) for x, y in pts]
    if fruit == 'mango':  # a leaning kidney
        pts = [(6.4 * math.cos(t) + 0.9 * math.sin(t) ** 2, 4.7 * math.sin(t) + 0.8 * math.cos(2 * t)) for t in np.linspace(0, 2 * math.pi, N, endpoint=False)]
        return [(x * s, y * s) for x, y in pts]
    if fruit == 'apple':  # round with a dip at the top
        r = lambda t: 6.0 * (1 + 0.06 * math.cos(2 * t)) - 1.3 * math.exp(-((((t - math.pi / 2 + math.pi) % (2 * math.pi)) - math.pi) / 0.4) ** 2)
        return [(x * s, y * s) for x, y in polar(r)]
    raise ValueError(fruit)


def detail(fruit, z0, z1, s=1.0):
    """The raised detail on a token's top: the blueberry's crown, the watermelon's flesh, the mango's leaf, the apple's stem and leaf."""
    if fruit == 'blueberry':
        star = [((1.8 if k % 2 == 0 else 0.8) * math.cos(math.pi * k / 5 + math.pi / 2), (1.8 if k % 2 == 0 else 0.8) * math.sin(math.pi * k / 5 + math.pi / 2)) for k in range(10)]
        return extrude([(x * s, y * s) for x, y in star], z0, z1)
    if fruit == 'watermelon':
        flesh = [(5.2 * math.cos(t), 2.2 + 5.2 * math.sin(t)) for t in np.linspace(math.pi, 2 * math.pi, N)]
        return extrude([(x * s, y * s) for x, y in flesh], z0, z1)
    if fruit == 'mango':
        leaf = [(2.2 * math.cos(t) + 2.5, 0.9 * math.sin(t) + 4.6) for t in np.linspace(0, 2 * math.pi, 24, endpoint=False)]
        return extrude([(x * s, y * s) for x, y in leaf], z0 - 0.6, z1)
    if fruit == 'apple':
        stem = [(-0.4, 3.6), (0.4, 3.6), (0.6, 7.2), (-0.2, 7.2)]
        leaf = [(2.0 * math.cos(t) + 2.3, 0.9 * math.sin(t) + 6.4) for t in np.linspace(0, 2 * math.pi, 24, endpoint=False)]
        return extrude([(x * s, y * s) for x, y in stem], z0 - 0.6, z1) + extrude([(x * s, y * s) for x, y in leaf], z0 - 0.6, z1)
    raise ValueError(fruit)


# ---------- the three styles ----------
def token(fruit):
    base = extrude(outline(fruit), 0, 4.2)
    if fruit == 'apple':  # stem and leaf stand above the outline, so give them the full thickness
        return base + detail(fruit, 0.6, 5.0)
    if fruit == 'mango':
        return base + detail(fruit, 0.6, 4.2) + extrude(outline(fruit, 0.8), 4.2, 5.0)
    return base + detail(fruit, 4.2, 5.0)


def mini(fruit):
    if fruit == 'blueberry':
        prof = [(3.0, 0)] + [(5.0 * math.sin(a), 5.0 - 5.0 * math.cos(a)) for a in np.linspace(math.radians(37), math.radians(160), 18)] + [(1.6, 9.7)]
        body = revolve(prof)
        crown = []
        for k in range(5):
            t = 2 * math.pi * k / 5
            crown += move(revolve([(0.7, 0), (0.0, 1.4)], 12), dx=1.3 * math.cos(t), dy=1.3 * math.sin(t), dz=9.4)
        return body + crown
    if fruit == 'watermelon':  # a whole little melon lying on its side
        prof = [(2.5, 0)] + [(4.6 * math.sin(a), 4.6 - 4.6 * math.cos(a)) for a in np.linspace(math.radians(33), math.radians(180), 20)]
        return move(revolve(prof), sx=1.55)
    if fruit == 'mango':
        prof = [(2.6, 0)] + [(4.3 * math.sin(a), 4.3 - 4.3 * math.cos(a)) for a in np.linspace(math.radians(37), math.radians(180), 20)]
        return move(revolve(prof), f=lambda x, y, z: (x * 1.5 + 0.12 * z * z, y, z))
    if fruit == 'apple':
        prof = [(3.2, 0)] + [(5.4 * math.sin(a) * (1 + 0.05 * math.sin(a)), 5.4 - 5.4 * math.cos(a)) for a in np.linspace(math.radians(36), math.radians(165), 20)] + [(1.0, 9.6)]
        stem = move(revolve([(0.45, 0), (0.45, 2.6)], 12), dz=9.0)
        leaf = move(revolve([(0.0, -0.5), (1.0, 0), (0.0, 0.5)], 16), sx=2.0, dx=1.6, dz=10.6)
        return revolve(prof) + stem + leaf
    raise ValueError(fruit)


def cube(fruit):
    size = 10.0
    body = box(-size / 2, -size / 2, 0, size / 2, size / 2, size)
    shape = outline(fruit, 0.62)
    return body + side_relief(shape, 1.0, -size / 2, size) + side_relief(shape, 1.0, size / 2, size)


STYLES = [('A', 'token', token), ('B', 'mini fruit', mini), ('C', 'stacking cube', cube)]


def bounds(tris):
    a = np.array([p for t in tris for p in t])
    return a.min(axis=0), a.max(axis=0)


def write_stl(path, tris):
    lo, _ = bounds(tris)
    with open(path, 'wb') as f:
        f.write(b'Fruit Market piece'.ljust(80, b' '))
        f.write(struct.pack('<I', len(tris)))
        for t in tris:
            p = np.array(t) - [0, 0, lo[2]]
            n = np.cross(p[1] - p[0], p[2] - p[0])
            n = n / (np.linalg.norm(n) or 1)
            f.write(struct.pack('<12fH', *n, *p[0], *p[1], *p[2], 0))


def render(tris, colour, size=360):
    """A flat-shaded picture from the front, above and to the right (painter's order)."""
    yaw, pitch = math.radians(-35), math.radians(28)
    Ry = np.array([[math.cos(yaw), -math.sin(yaw), 0], [math.sin(yaw), math.cos(yaw), 0], [0, 0, 1]])
    Rx = np.array([[1, 0, 0], [0, math.cos(pitch), -math.sin(pitch)], [0, math.sin(pitch), math.cos(pitch)]])
    P = np.array(tris) @ Ry.T @ Rx.T  # x right, y into the screen, z up
    lo, hi = P.reshape(-1, 3).min(axis=0), P.reshape(-1, 3).max(axis=0)
    scale = size * 0.72 / max(hi[0] - lo[0], hi[2] - lo[2])
    cx, cz = (hi[0] + lo[0]) / 2, (hi[2] + lo[2]) / 2
    img = Image.new('RGB', (size, size), (255, 252, 245))
    d = ImageDraw.Draw(img)
    light = np.array([-0.4, -0.8, 0.6]); light /= np.linalg.norm(light)
    order = np.argsort(-P[:, :, 1].mean(axis=1))
    for i in order:
        t = P[i]
        n = np.cross(t[1] - t[0], t[2] - t[0])
        if np.linalg.norm(n) == 0:
            continue
        n /= np.linalg.norm(n)
        if n[1] > 0:  # facing away
            continue
        k = 0.45 + 0.55 * abs(float(n @ light))
        c = tuple(int(min(255, v * k)) for v in colour)
        pts = [(size / 2 + (x - cx) * scale, size / 2 - (z - cz) * scale) for x, _, z in t]
        d.polygon(pts, fill=c, outline=c)
    return img


def label(img, text, sub):
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
        small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
    except OSError:
        font = small = ImageFont.load_default()
    d.text((14, 10), text, fill=(31, 39, 42), font=font)
    d.text((14, img.height - 28), sub, fill=(90, 98, 102), font=small)
    return img


for fruit in COLOUR:
    tiles = []
    for code, name, make in STYLES:
        tris = make(fruit)
        write_stl(OUT / f'{fruit}-{code}-{name.replace(" ", "-")}.stl', tris)
        lo, hi = bounds(tris)
        dims = ' x '.join(f'{v:.0f}' for v in (hi - lo))
        tiles.append(label(render(tris, COLOUR[fruit]), f'{code} · {name}', f'{dims} mm ({len(tris)} triangles)'))
    sheet = Image.new('RGB', (3 * 360 + 40, 360 + 60), (243, 236, 222))
    ImageDraw.Draw(sheet).text((14, 12), f'{fruit.upper()} · three styles', fill=(31, 39, 42), font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22) if Path('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf').exists() else None)
    for i, t in enumerate(tiles):
        sheet.paste(t, (10 + i * 370, 50))
    sheet.save(OUT / f'{fruit}-styles.png')
    print(fruit, 'ok')
