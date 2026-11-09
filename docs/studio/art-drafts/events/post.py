import os, random
from PIL import Image, ImageFilter, ImageChops
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
ids = ['touristBus', 'monsoon', 'durian', 'kenduri', 'mangoWindfall', 'pasarMalam', 'bakeOff']
rng = np.random.default_rng(5)
out = []
for i in ids:
    im = Image.open(f'{HERE}/{i}.raw.png').convert('RGB').resize((520, 391), Image.LANCZOS).filter(ImageFilter.GaussianBlur(.35))
    a = np.asarray(im).astype(np.float32)
    a += rng.normal(0, 7, a.shape[:2])[..., None]                 # fine paper grain
    sp = rng.random(a.shape[:2])
    a[sp < .025] *= .82                                            # dark specks
    a[sp > .975] = a[sp > .975] * .7 + 255 * .3                    # light specks
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    im.save(f'{HERE}/{i}.webp', quality=86)
    out.append(im)
s = Image.new('RGB', (520 * 3, 391 * 3), 'white')
for k, im in enumerate(out): s.paste(im, ((k % 3) * 520, (k // 3) * 391))
ex = Image.open('/home/user/Fruit-Market/public/art/events/heatwave.webp').convert('RGB'); s.paste(ex, (520 * 1, 391 * 2))
ex = Image.open('/home/user/Fruit-Market/public/art/events/glut.webp').convert('RGB'); s.paste(ex, (520 * 2, 391 * 2))
s.resize((1040, 782)).save(f'{HERE}/sheet.png')
print('ok')
