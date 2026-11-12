#!/usr/bin/env python3
"""Makes lab-engine.diff the first step of the reproduce section."""
from pathlib import Path
lab = Path(__file__).parent
p = lab / 'part3.md'
t = p.read_text()
old = """# 1. In a worktree at b5df35d, with the scripts from lab/scripts/ copied to scripts/lab/
npm ci
python3 scripts/lab/patch_engine.py        # adds the LAB switches (all off)
python3 scripts/lab/patch_lab2.py && python3 scripts/lab/patch_lab3.py   # later additions: see note below
OUT=/path/to/out"""
new = """# 1. In a worktree at b5df35d, with the scripts from lab/scripts/ copied to scripts/lab/
npm ci
git apply /path/to/lab/lab-engine.diff     # the LAB switches (all off: the engine plays exactly as before)
OUT=/path/to/out"""
assert old in t
t = t.replace(old, new)
old2 = "The lane scripts (`laneA.sh` to `laneH.sh`, `chain.sh`) are the exact batches that produced `lab/out/`. A few switches were added to the engine by hand-run Python snippets during the session (Ripening Room discount, plain-Haggler computer, loan float, ripe event extras, per-fruit event cost, no-memory seats). `lab/lab-engine.diff` is the complete lab engine against `b5df35d`, so `git apply lab/lab-engine.diff` replaces step 1's three Python patches."
new2 = "The lane scripts (`laneA.sh` to `laneI.sh`, `chain.sh`) are the exact batches that produced `lab/out/`. `lab/lab-engine.diff` is the complete lab engine against `b5df35d`. (`patch_engine.py`, `patch_lab2.py` and `patch_lab3.py` are how the switches were first added; a few more were added by hand during the session, so use the diff, not those three files.)"
assert old2 in t
t = t.replace(old2, new2)
p.write_text(t)
print('ok')
