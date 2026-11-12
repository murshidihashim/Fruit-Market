#!/bin/bash
# Lane H: the recommended set at 3 stalls (Normal and Hard) and 2 stalls, the set without the mango change, soft fruit idea.
OUT=$1
A="npx vite-node scripts/lab/analyze.ts --"
SET="tipShared1,nest15,juice6,premium5,ripening4,book3,float3,windfallRipe,mangoCost4"
npx vite-node scripts/lab/sim.ts -- --n 3 --games 1600 --patch $SET,aiPlainHaggler --out $OUT/final-n3.jsonl
$A --in $OUT/final-n3.jsonl > $OUT/an-final-n3.md 2>&1
npx vite-node scripts/lab/sim.ts -- --n 3 --games 900 --level hard --patch $SET --out $OUT/final-n3-hard.jsonl
$A --in $OUT/final-n3-hard.jsonl --sections 1,8 > $OUT/an-final-n3-hard.md 2>&1
npx vite-node scripts/lab/sim.ts -- --n 2 --games 1600 --patch $SET,aiPlainHaggler --out $OUT/final-n2.jsonl
$A --in $OUT/final-n2.jsonl --sections 1,8 > $OUT/an-final-n2.md 2>&1
npx vite-node scripts/lab/sim.ts -- --n 3 --games 1600 --patch tipShared1,nest15,juice6,premium5,ripening4,book3,float3,windfallRipe,aiPlainHaggler --out $OUT/final-nomango-n3.jsonl
$A --in $OUT/final-nomango-n3.jsonl --sections 1,2,8 > $OUT/an-final-nomango-n3.md 2>&1
npx vite-node scripts/lab/sim.ts -- --n 3 --games 1000 --patch softEveryday --out $OUT/softeveryday-n3.jsonl
$A --in $OUT/softeveryday-n3.jsonl --sections 2,6,8 > $OUT/an-softeveryday-n3.md 2>&1
echo LANE-H-DONE
