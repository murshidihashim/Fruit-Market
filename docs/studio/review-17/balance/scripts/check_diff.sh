#!/bin/bash
# Checks recommended.diff: applies it to a clean copy of the engine (commit b5df35d) and compares 60 seeded games
# with the same rules played through the lab switches. Run from the lab worktree root; the lab folder is the argument.
LAB=$1
RUN=$LAB/cleanrun
mkdir -p $RUN/src/engine $RUN/src/net $RUN/scripts/lab
for f in ai.ts daily.ts rng.ts story.ts; do git show b5df35d:src/engine/$f > $RUN/src/engine/$f; done
cp $LAB/clean/b/src/engine/data.ts $LAB/clean/b/src/engine/game.ts $RUN/src/engine/
cp $LAB/clean/b/src/net/protocol.ts $RUN/src/net/
cp scripts/lab/fingerprint.ts $RUN/scripts/lab/
npx vite-node $RUN/scripts/lab/fingerprint.ts -- --n 3 --games 60 > $LAB/out/fingerprint-clean.txt 2>&1
npx vite-node scripts/lab/fingerprint.ts -- --n 3 --games 60 --patch $2 > $LAB/out/fingerprint-lab.txt 2>&1
tail -1 $LAB/out/fingerprint-clean.txt $LAB/out/fingerprint-lab.txt
cmp $LAB/out/fingerprint-clean.txt $LAB/out/fingerprint-lab.txt && echo "IDENTICAL: the diff plays the same games as the lab switches"
