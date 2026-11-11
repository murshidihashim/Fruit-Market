#!/bin/bash
# Lane I: the recommended set plus a flat $2 Sharp Ears tip, at 3 and 2 stalls (run from the repo root).
OUT=$1
A="npx vite-node scripts/lab/analyze.ts --"
SET="tipShared1,nest15,juice6,premium5,ripening4,book3,float3,windfallRipe,mangoCost4,ear2"
npx vite-node scripts/lab/sim.ts -- --n 3 --games 1600 --patch $SET,aiPlainHaggler --out $OUT/final-ear2-n3.jsonl
$A --in $OUT/final-ear2-n3.jsonl --sections 1 > $OUT/an-final-ear2-n3.md 2>&1
npx vite-node scripts/lab/sim.ts -- --n 2 --games 1600 --patch $SET,aiPlainHaggler --out $OUT/final-ear2-n2.jsonl
$A --in $OUT/final-ear2-n2.jsonl --sections 1 > $OUT/an-final-ear2-n2.md 2>&1
echo LANE-I-DONE
