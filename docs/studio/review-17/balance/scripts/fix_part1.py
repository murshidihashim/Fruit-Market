#!/usr/bin/env python3
"""Corrections to part1.md from the final tables."""
from pathlib import Path
p = Path(__file__).parent / 'part1.md'
t = p.read_text()
def sub(old, new):
    global t
    assert old in t, old[:70]
    t = t.replace(old, new, 1)

sub("| Share of cards gained that were played | 73% | 73% | 74% | 75% |", "| Share of cards gained that were played | 69% | 70% | 72% | 74% |")
sub("| (b) on credit | 0.11 / 0.13 | $30.0 / $9.1 | (4 stalls: 82%) / 99% |", "| (b) on credit | 0.11 / 0.13 | $30.5 / $9.1 | 94% / 99% |")
sub("| (c) seconds box, market / always | 3.29 / 1.67 and 1.94 / 1.16 | $6.7 / $1.5 and $13.1 / $4.0 | 98% / 99% |", "| (c) seconds box, from the market | 3.29 / 1.67 | $6.7 / $1.5 | 98% / 99% |\n| (c) seconds box, always a Soft piece | 1.94 / 1.16 | $13.1 / $4.0 | 98% / 99% |")
sub("| Juice Bar $4 | $1.51 | 2.6 | $1.35 / 3.0 days | $1.42 / 2.8 days |", "| Juice Bar $4 | $1.50 | 2.7 | $1.33 / 3.0 days | $1.41 / 2.8 days |")
p.write_text(t)
print('fixed')
