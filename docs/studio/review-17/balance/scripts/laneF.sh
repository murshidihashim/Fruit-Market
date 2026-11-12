#!/bin/bash
# Lane F: safety-net variants, exploit checks, Haggler AI check, v2 at 2 and 6 stalls, rules 16 rival pay (run from the repo root).
OUT=$1
A="npx vite-node scripts/lab/analyze.ts --"
npx vite-node scripts/lab/cash.ts -- --n 3 --games 160 --shockdays 2,5 --nets float3,float3loan,float5empty,float4 > $OUT/cash2-n3.md 2>&1
npx vite-node scripts/lab/sim.ts -- --n 3 --games 1500 --patch float3 --out $OUT/float3-n3.jsonl
$A --in $OUT/float3-n3.jsonl --sections 6,8 > $OUT/an-float3-n3.md 2>&1
npx vite-node scripts/lab/focal.ts -- --test drain --n 3 --games 500 > $OUT/drain-none-n3.md 2>&1
npx vite-node scripts/lab/focal.ts -- --test drain --n 3 --games 500 --patch float3 > $OUT/drain-float3-n3.md 2>&1
npx vite-node scripts/lab/sim.ts -- --n 3 --games 1500 --patch aiPlainHaggler --out $OUT/plainhaggler-n3.jsonl
$A --in $OUT/plainhaggler-n3.jsonl --sections 1 > $OUT/an-plainhaggler-n3.md 2>&1
npx vite-node scripts/lab/sim.ts -- --n 2 --games 2400 --patch tipShared2,nest15,aiPlainHaggler --out $OUT/v2-n2.jsonl
$A --in $OUT/v2-n2.jsonl --sections 1 > $OUT/an-v2-n2.md 2>&1
npx vite-node scripts/lab/sim.ts -- --n 3 --games 1200 --patch rivalCeiling --out $OUT/rivalceiling-n3.jsonl
$A --in $OUT/rivalceiling-n3.jsonl --sections 7 > $OUT/an-rivalceiling-n3.md 2>&1
npx vite-node scripts/lab/sim.ts -- --n 6 --games 800 --patch tipShared2,nest15,aiPlainHaggler --out $OUT/v2-n6.jsonl
$A --in $OUT/v2-n6.jsonl --sections 1 > $OUT/an-v2-n6.md 2>&1
echo LANE-F-DONE
