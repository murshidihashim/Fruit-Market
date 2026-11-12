#!/usr/bin/env python3
"""Assembles BALANCE-FINDINGS.md from the written parts and the raw tables in out/."""
from pathlib import Path
lab = Path(__file__).parent
out = lab / 'out'
parts = [(lab / n).read_text() for n in ('part0.md', 'part1.md', 'part2.md', 'part3.md')]
appendix = ['\n---\n\n## Appendix: raw tables as the scripts printed them\n',
            'Every file below is also in `lab/out/`. Baselines first, then the tests, then the recommended set. In tables for patched runs, the cost column of "Upgrades the computer built" and the "Perk cash/game" column still show today\'s labels ($4 Juice Bar, $8 Nest Egg; Tip Jar counts only its $2 tips): the analysis script does not load the patch.\n']
order = [
    'an-n2-normal.md', 'an-n3-normal.md', 'an-n4-normal.md', 'an-n6-normal.md', 'an-n3-hard.md', 'an-n4-hard.md', 'an-n3-mix.md',
    'perks-n3.md', 'ties-n3.md', 'ties-n3-hard.md', 'an-plainhaggler-n3.md',
    'upgrades-n3-d10.md', 'upgrades-n3-d8.md', 'upgrades-n3-d14.md', 'upgrades-U1-n3.md', 'upgrades-U2-n3.md',
    'favours-n3.md',
    'events-n2.md', 'events-n3.md', 'events-n4.md', 'events-n6.md', 'events-EV1-n3.md', 'events-guest-n6.md',
    'cash-n3.md', 'cash2-n3.md', 'cash-n4.md', 'an-float3-n3.md', 'floatdays-n3.md', 'drain-none-n3.md', 'drain-float3-n3.md',
    'orders-n3.md', 'an-rivalceiling-n3.md',
    'memory-n3.md', 'firstbuyer-n3.md',
    'an-v1-n3.md', 'an-v2-n2.md', 'an-v2-n3.md', 'an-v2-n3-hard.md', 'an-v2-n4.md', 'an-v2-n6.md', 'an-mango4-n3.md', 'an-softeveryday-n3.md',
    'an-final-n2.md', 'an-final-n3.md', 'an-final-n3-hard.md', 'an-final-n4.md', 'an-final-n6.md', 'an-final-nomango-n3.md', 'an-final-ear2-n3.md', 'an-final-ear2-n2.md',
    'tests-summary.txt',
]
missing = []
for name in order:
    p = out / name
    if not p.exists():
        missing.append(name)
        continue
    body = p.read_text().strip()
    if name.endswith('.txt'):
        body = '```\n' + body + '\n```'
    appendix.append(f'\n#### `{name}`\n\n{body}\n')
(lab / 'BALANCE-FINDINGS.md').write_text('\n'.join(parts) + '\n'.join(appendix) + '\n')
print('written', (lab / 'BALANCE-FINDINGS.md').stat().st_size, 'bytes; missing:', missing)
