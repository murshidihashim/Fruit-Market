#!/usr/bin/env python3
"""Builds recommended.diff: the recommended set as plain engine/data changes on top of commit b5df35d (no lab switches).

Run from the lab worktree root:  python3 scripts/lab/make_recommended_diff.py <output folder> [--no-mango]
It writes <output folder>/clean/{a,b}/... and <output folder>/recommended.diff (apply with: git apply recommended.diff).
The diff changes numbers and rules only. It does not touch RULES.md, the tests that pin the old numbers, the screens
or the printed cards; those are listed in BALANCE-FINDINGS.md.
"""
import subprocess, sys
from pathlib import Path

out = Path(sys.argv[1])
MANGO = '--no-mango' not in sys.argv
BASE = 'b5df35d'
FILES = ['src/engine/data.ts', 'src/engine/game.ts', 'src/net/protocol.ts']

def sub(t, old, new, path):
    if old not in t:
        sys.exit(f'{path}: text not found: {old[:80]!r}')
    return t.replace(old, new, 1)

src = {}
for f in FILES:
    src[f] = subprocess.run(['git', 'show', f'{BASE}:{f}'], check=True, capture_output=True, text=True).stdout
new = dict(src)

# ---------- data.ts ----------
f = 'src/engine/data.ts'
t = new[f]
# 1. Upgrade costs: Juice Bar 4 -> 6, Premium Display 6 -> 5, Ripening Room 6 -> 4, Order Book 5 -> 3 (Handcart stays 6).
t = sub(t, "id: 'juicebar', title: 'Juice Bar', icon: '🧃', cost: 4,", "id: 'juicebar', title: 'Juice Bar', icon: '🧃', cost: 6,", f)
t = sub(t, "premium: { id: 'premium', title: 'Premium Display', icon: '🪧', cost: 6,", "premium: { id: 'premium', title: 'Premium Display', icon: '🪧', cost: 5,", f)
t = sub(t, "ripening: { id: 'ripening', title: 'Ripening Room', icon: '🌡️', cost: 6,", "ripening: { id: 'ripening', title: 'Ripening Room', icon: '🌡️', cost: 4,", f)
t = sub(t, "orderbook: { id: 'orderbook', title: 'Order Book', icon: '📒', cost: 5,", "orderbook: { id: 'orderbook', title: 'Order Book', icon: '📒', cost: 3,", f)
# 2. Nest Egg: start with $15 (was $18).
t = sub(t, "export const NEST_EGG_BONUS = 8;", "export const NEST_EGG_BONUS = 5;", f)
# 3. Tip Jar: also $1 from a customer who got their whole order from several stalls, this one among them.
t = sub(t, "export const LOCAL_FAVOURITE_TIP = 2;", "export const LOCAL_FAVOURITE_TIP = 2;\n/** Tip Jar (rules 18): the tip when the customer's whole order was filled by several stalls, this one among them. */\nexport const SHARED_TIP = 1;", f)
t = sub(t, "favourite: { id: 'favourite', title: 'Tip Jar', text: `Customers you serve completely by yourself tip you $${LOCAL_FAVOURITE_TIP}.` },",
        "favourite: { id: 'favourite', title: 'Tip Jar', text: `A customer who leaves with their whole order tips you $${SHARED_TIP} if you sold them any of it, $${LOCAL_FAVOURITE_TIP} if you served them alone.` },", f)
# 4. Market float (rules 18): no stall starts a day with less than this.
t = sub(t, "export const START_CASH = 10;", "export const START_CASH = 10;\n/** Market float (rules 18): at dawn, from day 2, a stall with less cash than this is topped up to it by the market. */\nexport const MARKET_FLOAT = 3;", f)
# 5. Mango: green for $4 (was $3).
if MANGO:
    t = sub(t, "theme: 'Always arrives green for $3. Ripens in 2 nights, then one Fresh day at a premium.',", "theme: 'Always arrives green for $4. Ripens in 2 nights, then one Fresh day at a premium.',", f)
    t = sub(t, "cost: { fresh: 6, okay: 3, notso: 1, unripe: 3 },", "cost: { fresh: 6, okay: 3, notso: 1, unripe: 4 },", f)
new[f] = t

# ---------- game.ts ----------
f = 'src/engine/game.ts'
t = new[f]
t = sub(t, "  LOCAL_FAVOURITE_TIP, MARKET_DAY_EVERY,", "  LOCAL_FAVOURITE_TIP, SHARED_TIP, MARKET_FLOAT, MARKET_DAY_EVERY,", f)
# 6. Mango Windfall: the card says "1 extra ripe mango"; the extra pieces now arrive ripe.
t = sub(t, "      const pos = f === unripe ? s.market[f].length - 1 : deliveryPos(card, f);\n      s.market[f][pos] += n;",
        "      const pos = f === unripe ? s.market[f].length - 1 : deliveryPos(card, f);\n"
        "      // Rules 18: an event's extra pieces of a fruit that arrives green come ripe (Mango Windfall: \"1 extra ripe mango\").\n"
        "      const ripeExtra = f === unripe && e?.supplyEach?.[f] ? Math.min(n, eventSupply({ ...e, supplyAll: 0 }, f, shops)) : 0;\n"
        "      s.market[f][pos] += n - ripeExtra;\n"
        "      if (ripeExtra) s.market[f][freshPos(f)] += ripeExtra;", f)
# 4. Market float: after the lorry and any inspection, before anyone buys.
t = sub(t, "    delete p.shade;\n    p.upgradeOffer = [];\n  }\n  s.dayStartCash = s.players.map((p) => p.cash);",
        "    delete p.shade;\n    p.upgradeOffer = [];\n"
        "    // Rules 18, market float: from day 2 no stall starts a day with less than MARKET_FLOAT (after any inspection fine).\n"
        "    if (s.day > 1 && p.cash < MARKET_FLOAT) p.cash = MARKET_FLOAT;\n"
        "  }\n  s.dayStartCash = s.players.map((p) => p.cash);", f)
# 3. Tip Jar: the shared tip.
t = sub(t, "    if (done) {\n      res.happy.push(c.name);\n      if (suppliers.size === 1 && unitsToCustomer > 0) {",
        "    if (done) {\n      res.happy.push(c.name);\n"
        "      // Tip Jar (rules 18): a customer whose whole order was filled by several stalls tips the Tip Jar stall SHARED_TIP.\n"
        "      if (suppliers.size > 1) for (const q of suppliers) {\n        const tj = s.players[q];\n        if (tj.trait !== 'favourite') continue;\n"
        "        tj.cash += SHARED_TIP;\n        tj.stats.earned += SHARED_TIP;\n        res.income[q] += SHARED_TIP;\n      }\n"
        "      if (suppliers.size === 1 && unitsToCustomer > 0) {", f)
new[f] = t

# ---------- protocol.ts ----------
f = 'src/net/protocol.ts'
new[f] = sub(new[f], "export const RULES_VERSION = 17;", "export const RULES_VERSION = 18;", f)

for side, files in (('a', src), ('b', new)):
    for f, text in files.items():
        p = out / 'clean' / side / f
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text)
diff = subprocess.run(['diff', '-ruN', 'a', 'b'], cwd=out / 'clean', capture_output=True, text=True).stdout
(out / 'recommended.diff').write_text(diff)
print(f'wrote {out / "recommended.diff"} ({len(diff.splitlines())} lines)')
