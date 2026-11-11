#!/bin/bash
# Applies recommended.diff to a clean export of commit b5df35d and runs the unit tests before and after, to list the
# tests that pin the old numbers. Run from the lab worktree root; the lab folder is the argument.
LAB=$1
FULL=$LAB/fullclean
mkdir -p $FULL
git archive b5df35d | tar -x -C $FULL
ln -sfn $PWD/node_modules $FULL/node_modules
(cd $FULL && npx vitest run 2>&1 | grep -E "FAIL|Test Files|Tests |✓|×" | sed 's/ [0-9]*ms$//' | sort -u) > $LAB/out/tests-before-diff.txt 2>&1
(cd $FULL && patch -p1 --quiet < $LAB/recommended.diff && npx vitest run 2>&1 | grep -E "FAIL|Test Files|Tests |✓|×" | sed 's/ [0-9]*ms$//' | sort -u) > $LAB/out/tests-after-diff.txt 2>&1
echo BEFORE; grep -E "Test Files|Tests " $LAB/out/tests-before-diff.txt
echo AFTER; grep -E "Test Files|Tests " $LAB/out/tests-after-diff.txt
echo "FAILING ONLY AFTER THE DIFF"; grep FAIL $LAB/out/tests-after-diff.txt | grep -v -x -F -f <(grep FAIL $LAB/out/tests-before-diff.txt) | cut -c 1-220
echo TESTS-DONE
