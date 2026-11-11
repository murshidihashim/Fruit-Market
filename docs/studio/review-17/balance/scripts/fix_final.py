#!/usr/bin/env python3
"""Last wording fixes before assembling the report."""
from pathlib import Path
lab = Path(__file__).parent

def edit(name, pairs):
    p = lab / name
    t = p.read_text()
    for old, new in pairs:
        assert old in t, f'{name}: {old[:70]!r}'
        t = t.replace(old, new)
    p.write_text(t)

edit('part1.md', [
    ('A person does not. Measured in 11.', 'A person does not. Measured in 10.3: it is worth about $10 a game.'),
])
edit('part3.md', [
    ('| **Measured: see the table below.** The shipped computer remembers everything; a person cannot. | None needed if the result below is small; otherwise let each stall keep one public "bought today" row of tokens until the bell. |',
     '| **Yes. Measured in 10.3:** a stall that remembers none of it wins 22.8% instead of 31.8% and ends $9.91 poorer. The shipped computer remembers everything; a person cannot. | In the app, a "what you saw them buy" note for each rival; on a table, allow pencil notes. (A rules fix would be to leave each day\'s purchases face up beside the stall until the bell.) |'),
    ('`recommended.diff` applies to `b5df35d` with `git apply`.', '`recommended.diff` applies to `b5df35d` with `git apply`; `recommended-no-mango.diff` is the same set without change 6.'),
])
p = lab / 'assemble.py'
t = p.read_text()
old = "'Every file below is also in `lab/out/`. Baselines first, then the tests, then the recommended set.\\n']"
new = "'Every file below is also in `lab/out/`. Baselines first, then the tests, then the recommended set. In tables for patched runs, the cost column of \"Upgrades the computer built\" and the \"Perk cash/game\" column still show today\\'s labels ($4 Juice Bar, $8 Nest Egg; Tip Jar counts only its $2 tips): the analysis script does not load the patch.\\n']"
assert old in t
p.write_text(t.replace(old, new))
print('ok')
