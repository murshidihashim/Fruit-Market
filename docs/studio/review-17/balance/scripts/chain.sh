#!/bin/bash
# Waits for one lane to finish, then runs the next: chain.sh <out folder> <marker to wait for> <log to watch> <next lane script>
OUT=$1
until grep -q "$2" "$OUT/$3" 2>/dev/null; do sleep 5; done
bash "$4" "$OUT"
