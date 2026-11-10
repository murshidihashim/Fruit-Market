import os
from PIL import Image, ImageFilter
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(9)
def grain(im):
    a = np.asarray(im).astype(np.float32)
    a += rng.normal(0, 7, a.shape[:2])[..., None]
    sp = rng.random(a.shape[:2]); a[sp < .025] *= .82; a[sp > .975] = a[sp > .975] * .7 + 255 * .3
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
CROP = {'pakdin': (205, 196), 'farah': (215, 206)}  # head centre for the round badge
out = []
for i in ('pakdin', 'farah'):
    big = Image.open(f'{HERE}/{i}.raw.png').convert('RGB')
    scene = grain(big.resize((600, 450), Image.LANCZOS).filter(ImageFilter.GaussianBlur(.35)))
    scene.save(f'{HERE}/scene-{i}.webp', quality=86)
    cx, cy = CROP[i]; r = 140
    badge = grain(big.crop(((cx - r) * 2, (cy - r) * 2, (cx + r) * 2, (cy + r) * 2)).resize((181, 181), Image.LANCZOS))
    badge.save(f'{HERE}/badge-{i}.webp', quality=86)
    out += [scene, badge]
s = Image.new('RGB', (600 * 2 + 200, 450 * 2), 'white')
s.paste(out[0], (0, 0)); s.paste(out[1], (1210, 0)); s.paste(out[2], (0, 450)); s.paste(out[3], (1210, 450))
ex = Image.open('/home/user/Fruit-Market/public/art/scenes/kiran.webp').convert('RGB'); s.paste(ex, (600, 0))
ex = Image.open('/home/user/Fruit-Market/public/art/scenes/saleh.webp').convert('RGB'); s.paste(ex, (600, 450))
s.save(f'{HERE}/shop-sheet.png'); print('ok')
