#!/usr/bin/env python3
"""One-off edits to the lab scripts: a first-buyer test and a float usage estimate. Run from the repo root."""
from pathlib import Path

def sub(t, old, new):
    assert old in t, old[:60]
    return t.replace(old, new, 1)

p = Path('scripts/lab/harness.ts'); t = p.read_text()
if 'forceFirst' not in t:
    t = sub(t, "  /** After the rush of this day the seat is left with $0 and an empty shelf (stress test). */",
            "  /** This seat always buys first (or always last), whatever its cash. */\n  forceFirst?: number; forceLast?: number;\n  /** After the rush of this day the seat is left with $0 and an empty shelf (stress test). */")
    t = sub(t, "    if (s.phase === 'morning') {\n      this.newDay();",
            "    if (s.phase === 'morning') {\n      if (o.forceFirst !== undefined || o.forceLast !== undefined) {\n        s = JSON.parse(JSON.stringify(s)) as GameState;\n        const k = (o.forceFirst ?? o.forceLast)!;\n        const others = s.order.filter((i) => i !== k);\n        s.order = o.forceFirst !== undefined ? [k, ...others] : [...others, k];\n        this.s = s;\n      }\n      this.newDay();")
    p.write_text(t)

p = Path('scripts/lab/focal.ts'); t = p.read_text()
if 'firstbuyer' not in t:
    t = sub(t, "} else if (test === 'drain') {",
            "} else if (test === 'firstbuyer') {\n  variants = [\n    { name: 'usual rule (poorest buys first)', opts: () => ({}) },\n    { name: 'always buys first', opts: (s) => ({ forceFirst: s }) },\n    { name: 'always buys last', opts: (s) => ({ forceLast: s }) },\n  ];\n} else if (test === 'drain') {")
    p.write_text(t)

p = Path('scripts/lab/analyze.ts'); t = p.read_text()
if 'float would hand out' not in t:
    t = sub(t, "  const nets = games.flatMap((g) => g.net ?? []);",
            "  {\n    let low = 0, shortfall = 0, sdN = 0;\n    for (const g of games) for (const d of g.days) if (d.day > 1) d.dawnCash.forEach((c) => { sdN++; if (c < 3) { low++; shortfall += 3 - c; } });\n    console.log(`Stall-days that start with under $3 in cash (whatever is on the shelf): ${r2((100 * low) / sdN)}%; a $3 float would hand out about $${r2((shortfall / sdN) * (D - 1))} per stall per game.`);\n  }\n  const nets = games.flatMap((g) => g.net ?? []);")
    p.write_text(t)
print('ok')
