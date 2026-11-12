#!/usr/bin/env python3
"""Adds one more lab switch: a guest joins the row even when it is full (off by default). Run from the repo root."""
from pathlib import Path

def sub(t, old, new):
    assert old in t, old[:60]
    return t.replace(old, new, 1)

p = Path('src/engine/game.ts'); t = p.read_text()
if 'guestOverCap' not in t:
    t = sub(t, "  const extras = (s.event?.extra ? 1 : 0) + (due ? 1 : 0);", "  const extras = (s.event?.extra && !LAB.guestOverCap ? 1 : 0) + (due ? 1 : 0);")
    p.write_text(t)
p = Path('src/engine/data.ts'); t = p.read_text()
if 'guestOverCap' not in t:
    t = sub(t, "  aiPlainHaggler: boolean;", "  aiPlainHaggler: boolean;\n  /** A guest (Hotel Chef, Caterer...) joins the row even when it is full, instead of taking a walk-in's place. */\n  guestOverCap: boolean;")
    t = sub(t, "aiPlainHaggler: false,", "aiPlainHaggler: false, guestOverCap: false,")
    p.write_text(t)
p = Path('scripts/lab/patches.ts'); t = p.read_text()
if 'guestOverCap' not in t:
    t = sub(t, "  inspector1: () => { ev('inspector').inspector = 1; },", "  inspector1: () => { ev('inspector').inspector = 1; },\n  guestOverCap: () => { LAB.guestOverCap = true; },")
    p.write_text(t)
print('ok')
