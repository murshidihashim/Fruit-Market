# The Day 1 / no-event morning card picture ("Calm Day"), in the same style as the event art (gen.py).
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen
from gen import (INK, Y, YL, CREAM, R, G, G2, WOOD, WOODL, WHITE, GREY, obj, line, rays, skyline, ground, apple, mango,
                 watermelon, blueberry, crate, cloud, sparkle, svg)

def calm():
    gy = 318
    sun = (''.join(line(f'M{450+42*c:.0f} {70+42*s:.0f}L{450+58*c:.0f} {70+58*s:.0f}', 5, Y) for c, s in
                   [(1, 0), (.7, .7), (0, 1), (-.7, .7), (-1, 0), (-.7, -.7), (0, -1), (.7, -.7)])
           + obj('<circle cx="450" cy="70" r="32" {A}/>', Y, op=.45))
    posts = obj('<rect x="96" y="120" width="14" height="200" {A}/>', WOOD, shade=False, sw=4.5) + obj('<rect x="410" y="120" width="14" height="200" {A}/>', WOOD, shade=False, sw=4.5)
    awn = ''.join(obj(f'<path d="M{80+i*45} 104H{125+i*45}V140Q{102+i*45} 164 {80+i*45} 140Z" {{A}}/>', R if i % 2 == 0 else CREAM, shade=(i > 5), sw=4.5) for i in range(8))
    sign = (obj('<rect x="190" y="70" width="140" height="34" rx="5" {A}/>', INK, shade=False, sw=4)
            + f'<text x="260" y="95" text-anchor="middle" font-family="Slab" font-size="21" fill="{Y}" letter-spacing="1">OPEN</text>')
    counter = obj('<rect x="70" y="250" width="380" height="70" rx="6" {A}/>', WOODL) + line('M80 274H440M80 298H440', 3.2)
    goods = (crate(96, 214, 96, 40) + apple(120, 206, 17) + apple(160, 204, 18)
             + crate(204, 214, 112, 40) + watermelon(240, 200, 20) + watermelon(286, 202, 18)
             + crate(328, 214, 96, 40) + mango(352, 204, 16) + blueberry(392, 206, 9) + blueberry(408, 204, 8) + blueberry(400, 194, 8))
    # a cat asleep on the counter
    cat = (obj('<path d="M118 252Q112 226 140 222Q170 220 178 238Q182 252 170 254Z" {A}/>', '#e8964c', op=.5, sw=4)
           + obj('<path d="M164 230L170 214L178 230Z" {A}/>', '#e8964c', shade=False, sw=3.5)
           + obj('<path d="M150 228L154 212L162 228Z" {A}/>', '#e8964c', shade=False, sw=3.5)
           + line('M156 238q4 3 8 0M168 238q4 3 8 0', 3) + line('M118 250Q98 252 102 236', 6, INK) + line('M118 250Q98 252 102 236', 3, '#e8964c'))
    zz = (f'<text x="186" y="206" font-family="R8" font-size="20" fill="{INK}">z</text>'
          f'<text x="200" y="188" font-family="R8" font-size="15" fill="{INK}">z</text>')
    svg('calm', rays('#9bb2d6', '#aec2e2', 450, 70), skyline(gy, '#dbe4f2', .5, 21), ground(gy, G2),
        sun, cloud(110, 56, .9, WHITE), cloud(300, 40, .7, '#eef1f6'), posts, counter, goods, awn, sign, cat, zz, sparkle(40, 120, 10))

if __name__ == '__main__':
    calm(); print('ok')
