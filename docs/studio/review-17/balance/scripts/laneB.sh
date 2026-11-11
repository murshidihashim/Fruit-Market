#!/bin/bash
# Lane B of the baseline batch (run from the repo root). Output folder is the first argument.
OUT=$1
npx vite-node scripts/lab/sim.ts -- --n 4 --games 2000 --level normal --out $OUT/base-n4-normal.jsonl
npx vite-node scripts/lab/sim.ts -- --n 6 --games 1300 --level normal --out $OUT/base-n6-normal.jsonl
npx vite-node scripts/lab/sim.ts -- --n 4 --games 1200 --level hard --out $OUT/base-n4-hard.jsonl
echo LANE-B-DONE
