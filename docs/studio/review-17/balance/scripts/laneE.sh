#!/bin/bash
# Lane E: candidate perk set v2 and upgrade sets (run from the repo root).
OUT=$1
A="npx vite-node scripts/lab/analyze.ts --"
npx vite-node scripts/lab/sim.ts -- --n 3 --games 2000 --patch tipShared2,nest15,aiPlainHaggler --out $OUT/v2-n3.jsonl
$A --in $OUT/v2-n3.jsonl --sections 1 > $OUT/an-v2-n3.md 2>&1
npx vite-node scripts/lab/sim.ts -- --n 3 --games 1200 --level hard --patch tipShared2,nest15 --out $OUT/v2-n3-hard.jsonl
$A --in $OUT/v2-n3-hard.jsonl --sections 1 > $OUT/an-v2-n3-hard.md 2>&1
npx vite-node scripts/lab/focal.ts -- --test upgrades --n 3 --games 500 --patch juice6,premium5,ripening4,book3 > $OUT/upgrades-U1-n3.md 2>&1
npx vite-node scripts/lab/sim.ts -- --n 4 --games 1600 --patch tipShared2,nest15,aiPlainHaggler --out $OUT/v2-n4.jsonl
$A --in $OUT/v2-n4.jsonl --sections 1 > $OUT/an-v2-n4.md 2>&1
npx vite-node scripts/lab/focal.ts -- --test upgrades --n 3 --games 500 --patch juice6,premium5,ripening4,book3,ripeningOff1,bookBonus2 > $OUT/upgrades-U2-n3.md 2>&1
npx vite-node scripts/lab/events.ts -- --n 3 --games 200 --patch windfallRipe,glutCheap > $OUT/events-EV1-n3.md 2>&1
echo LANE-E-DONE
