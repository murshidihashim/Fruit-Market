#!/bin/bash
# Lane D: perk values, safety nets, first candidate set, events at other table sizes (run from the repo root).
OUT=$1
A="npx vite-node scripts/lab/analyze.ts --"
npx vite-node scripts/lab/sim.ts -- --n 3 --games 2000 --patch hagglerFirst1,tipShared1,nest16 --out $OUT/v1-n3.jsonl
$A --in $OUT/v1-n3.jsonl --sections 1 > $OUT/an-v1-n3.md 2>&1
npx vite-node scripts/lab/cash.ts -- --n 3 --games 160 --shockdays 2,5,8 > $OUT/cash-n3.md 2>&1
npx vite-node scripts/lab/focal.ts -- --test perks --n 3 --games 400 > $OUT/perks-n3.md 2>&1
npx vite-node scripts/lab/events.ts -- --n 4 --games 200 > $OUT/events-n4.md 2>&1
npx vite-node scripts/lab/sim.ts -- --n 3 --games 1200 --mix easy,normal,normal --out $OUT/base-n3-mix.jsonl
$A --in $OUT/base-n3-mix.jsonl --sections 6 > $OUT/an-n3-mix.md 2>&1
npx vite-node scripts/lab/sim.ts -- --n 3 --games 1500 --patch mangoCost4 --out $OUT/mango4-n3.jsonl
$A --in $OUT/mango4-n3.jsonl --sections 1,2,6,8 > $OUT/an-mango4-n3.md 2>&1
npx vite-node scripts/lab/events.ts -- --n 2 --games 150 > $OUT/events-n2.md 2>&1
npx vite-node scripts/lab/events.ts -- --n 6 --games 80 > $OUT/events-n6.md 2>&1
npx vite-node scripts/lab/cash.ts -- --n 4 --games 100 --shockdays 5 --nets none,float3,credit2,oddJobs3 > $OUT/cash-n4.md 2>&1
echo LANE-D-DONE
