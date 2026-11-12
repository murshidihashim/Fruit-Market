#!/bin/bash
# Lane A of the baseline batch (run from the repo root). Output folder is the first argument.
OUT=$1
npx vite-node scripts/lab/sim.ts -- --n 3 --games 2800 --level normal --out $OUT/base-n3-normal.jsonl
npx vite-node scripts/lab/sim.ts -- --n 2 --games 3600 --level normal --out $OUT/base-n2-normal.jsonl
npx vite-node scripts/lab/sim.ts -- --n 3 --games 1600 --level hard --out $OUT/base-n3-hard.jsonl
echo LANE-A-DONE
