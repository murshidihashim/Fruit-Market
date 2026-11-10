# 300 ppi print copies of the new art (print/art), from the 2x renders, with the same paper grain.
import os
from PIL import Image, ImageFilter
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = '/home/user/Fruit-Market/print/art/'
rng = np.random.default_rng(11)
def grain(im):
    a = np.asarray(im).astype(np.float32)
    a += rng.normal(0, 7, a.shape[:2])[..., None]
    sp = rng.random(a.shape[:2]); a[sp < .025] *= .82; a[sp > .975] = a[sp > .975] * .7 + 255 * .3
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
for i in ['touristBus', 'monsoon', 'durian', 'kenduri', 'mangoWindfall', 'pasarMalam', 'bakeOff']:
    im = Image.open(f'{HERE}/{i}.raw.png').convert('RGB').resize((680, 511), Image.LANCZOS).filter(ImageFilter.GaussianBlur(.3))
    grain(im).save(f'{OUT}events/{i}.webp', quality=90)
for n in ['pakdin', 'farah']:
    im = Image.open(f'{HERE}/{n}.raw.png').convert('RGB').resize((821, 616), Image.LANCZOS).filter(ImageFilter.GaussianBlur(.3))
    grain(im).save(f'{OUT}scenes/{n}.webp', quality=90)
    Image.open(f'/home/user/Fruit-Market/public/art/avatars/{n}.webp').save(f'{OUT}avatars/{n}.webp', quality=90)
print('ok')
