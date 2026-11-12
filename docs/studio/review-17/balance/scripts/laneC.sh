#!/bin/bash
# Lane C: paired event test and focal-seat tests at 3 stalls (run from the repo root). Output folder is the first argument.
OUT=$1
npx vite-node scripts/lab/events.ts -- --n 3 --games 300 > $OUT/events-n3.md 2>&1
npx vite-node scripts/lab/focal.ts -- --test upgrades --n 3 --games 700 --days 10 > $OUT/upgrades-n3-d10.md 2>&1
npx vite-node scripts/lab/focal.ts -- --test orders --n 3 --games 700 > $OUT/orders-n3.md 2>&1
npx vite-node scripts/lab/focal.ts -- --test favours --n 3 --games 700 > $OUT/favours-n3.md 2>&1
npx vite-node scripts/lab/focal.ts -- --test upgrades --n 3 --games 400 --days 8 > $OUT/upgrades-n3-d8.md 2>&1
npx vite-node scripts/lab/focal.ts -- --test upgrades --n 3 --games 400 --days 14 > $OUT/upgrades-n3-d14.md 2>&1
echo LANE-C-DONE
