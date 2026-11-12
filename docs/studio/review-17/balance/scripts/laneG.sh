#!/bin/bash
# Lane G: memory and first-buyer tests, the recommended set at 4 and 6 stalls, guests at a full row (run from the repo root).
OUT=$1
A="npx vite-node scripts/lab/analyze.ts --"
SET="tipShared1,nest15,juice6,premium5,ripening4,book3,float3,windfallRipe,mangoCost4"
npx vite-node scripts/lab/sim.ts -- --n 4 --games 1200 --patch $SET,aiPlainHaggler --out $OUT/final-n4.jsonl
$A --in $OUT/final-n4.jsonl --sections 1,2,6,8 > $OUT/an-final-n4.md 2>&1
npx vite-node scripts/lab/focal.ts -- --test memory --n 3 --games 500 > $OUT/memory-n3.md 2>&1
npx vite-node scripts/lab/focal.ts -- --test firstbuyer --n 3 --games 500 > $OUT/firstbuyer-n3.md 2>&1
npx vite-node scripts/lab/sim.ts -- --n 6 --games 500 --patch $SET,aiPlainHaggler --out $OUT/final-n6.jsonl
$A --in $OUT/final-n6.jsonl --sections 1,6,8 > $OUT/an-final-n6.md 2>&1
npx vite-node scripts/lab/events.ts -- --n 6 --games 50 --patch guestOverCap > $OUT/events-guest-n6.md 2>&1
echo LANE-G-DONE
