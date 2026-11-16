# Review of 1.24.0 · bugs and design clashes, start to finish

The owner asked on 2026-11-16: "ok now go through the game end to end to find any potential bugs and design clashes".
Three reviewers each took one area and reported only. They changed nothing in the game. They built their own copy of
commit b0f7108 (1.24.0, rules 19, protocol 4) and played it on this machine. The live site was never used.

| File | Area | Findings |
|---|---|---|
| `review-solo.md` | Solo and pass-and-play, start to finish (9 whole games, scenarios, menus, 3 phone sizes) | 20 (S1 to S20) |
| `review-online.md` | Online rooms, quick match, choosing, leaving and coming back, rematch, secrets (local room server) | 15 (ON-01 to ON-15) |
| `review-consistency.md` | Rules, app text, print kit and guidebook, colours and badges | 21 (C-01 to C-21) |

The combined report for the owner, most serious first and grouped for approval, is `docs/workflow/reports/REP-122.md`.

The reviews name screenshots and scripts by their place in the reviewers' working folder, which is not kept.
The pictures behind the main findings are copied into `pictures/`:

| Picture | Finding |
|---|---|
| `01-closing-day-takings-vs-results.png` | S1 |
| `02-order-day-nobody-wants-these.png` | S2 |
| `03-scout-then-undo.png` | S3 |
| `08-pass-and-play-shared-screens.png` | S8 |
| `09-full-shelf.png` | S9 |
| `10-tick-and-fine.png` | S10 (left), S6 (right) |
| `online-t1-02-unknown-code-20s.png` | ON-03 |
| `online-t2-08-waiting-for-dropped-C.png` | ON-07 |
| `online-t2-21-menu-online-360.png` | ON-08 |
| `online-t2-31-rematch-waiting-for-B-who-left.png` | ON-04 |
| `online-t3-01-guest-closed-tab-host-stuck.png` | ON-05 |
| `online-t3-02-create-after-invite-shows-old-room.png` | ON-02 |
| `online-t7-02-strip-until-they-come-back.png` | ON-09 |
| `online-t7-03-rematch-note-lists-computer-seat.png` | ON-10 |
| `consistency-ev-player-aid-crier.png` | C-03 |
| `consistency-ev-guidebook-black-band.png`, `consistency-ev-print-customer-colour-bands.png` | C-04 |
| `consistency-print-events-glut-heatwave.png` | C-05, C-06, C-17, C-21 |
| `consistency-ev-first-token-on-yellow-box.png`, `consistency-ev-first-seat-rank-numbers.png` | C-07 |
| `consistency-ev-teal-face-badge-vs-everyday.png` | C-08 |
| `consistency-ev-royal-awning-vs-premium.png`, `consistency-ev-premium-ticket.png` | C-12 |
| `consistency-buy-me-first-6-320x568-4000.png` | S12, S13 |
