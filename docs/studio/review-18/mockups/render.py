"""Draws a mock-up board to a PNG so it can be looked at without the design page.
Run from the repo root:  python3 docs/studio/review-18/mockups/render.py Design-A Rush
Pictures on the design page are addressed by an id; blobs.json maps each id to the file in this repo."""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
BLOBS = json.load(open(os.path.join(HERE, 'blobs.json')))
OUT = os.path.join(HERE, 'png')
os.makedirs(OUT, exist_ok=True)
for name in sys.argv[1:]:
    s = open(os.path.join(HERE, 'boards', name + '.dc.html')).read()
    missing = sorted(set(re.findall(r'/_blob/([0-9a-f]{32})', s)) - set(BLOBS))
    for k, v in BLOBS.items():
        s = s.replace('/_blob/' + k, 'file://' + os.path.join(ROOT, v))
    s = s.replace('<script src="./support.js"></script>', '')
    w, h = re.search(r'"width":(\d+),"height":(\d+)', s).groups()
    tmp = os.path.join(OUT, name + '.html')
    open(tmp, 'w').write(s)
    subprocess.run(['node', os.path.join(HERE, 'shot.cjs'), tmp, os.path.join(OUT, name + '.png'), w, h], check=True)
    os.remove(tmp)
    print(name, w, h, 'pictures without a file:', missing or 'none')
