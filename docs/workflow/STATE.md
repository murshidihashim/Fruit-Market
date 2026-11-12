# Current state · Fruit Market

Updated 2026-11-12 08:37 (Asia/Kuala_Lumpur), session checkpoint. Sections from 2026-10-29 below are history; the release records (`records/releases.json`) are the source for what is live.

## Latest (2026-11-11 23:39): REP-101 decided; rules version 18 build in progress (PLAN-079, DEC-086, DEC-087)
- **Owner decisions:** one release for everything; $5 top-up for an empty-shelf stall under $5; the balance set item by item; staked standing orders (simulate first); today's buys shown until the bell; no mango customers on days 1 and 2; seven rulings; plain voice with a Malaysian market feel; Stocking skipped with nothing ripe, evenings only with a choice, a faster rush; trophies fitted to the rules.
- **Decided since (2026-11-12 00:03, DEC-088, REP-102):** Favoured Trade is played after the prices flip (option B); added to the rules 18 build.
- **Decided since (2026-11-12 00:32, DEC-089, REP-103, PLAN-080):** no rule change, unsold fruit is kept; both freshness trackers printed as test packs in `print/tracker-test` (`scripts/print-trackers.ts`) and sent to the owner.
- **Open with the owner:** tracker 1 (ruler) or 2 (tray), after a table test.
- **Screens and cards (2026-11-12 00:44, REP-104):** mock-ups of the one card design and seven phone screens sent for approval (https://claude.ai/artifact/TM2aRxtEpQsqxAo1cAK8Cx; files in the session scratchpad, not in the repo). Awaiting: the card, what stays on screen, the rush. Not drawn yet: stocking, night, results, trophies, settings, How to play, small phone, six stalls.
- **Card changes, round 1 (2026-11-12 01:16, DEC-090):** applied to the mock-ups; picture drafts in `docs/studio/art-drafts/cards-18` (Osman's scene, 6 favours, 5 upgrades). Open: is the picture style right, and should the other 35 customer scenes be drawn the same way; tracker 1 or 2 (the owner's "1" is read as about the cards, to be confirmed).
- **Card changes, round 2 (2026-11-12 01:27, DEC-091):** original coloured-column lorry card restored; "Upgrade" label; Favoured Trade and Heatwave pictures redrawn. Source for the original cards: https://claude.ai/artifact/9sbaZqKG6TqxhxJsgKnntY (boards `C-...`). Open: lorry column order (mango before apple, as drawn, or the first printing's apple before mango); black strip or thin-line card headings.
- **Card changes, round 3 (2026-11-12 01:38, DEC-092):** cleaner lorry card (numbers on the fruit lanes, the game's row boxed); no black strips in favour and upgrade pictures; card backs board added. Boards are now rendered and checked before sending.
- **Card changes, round 4 (2026-11-12 01:44, DEC-093):** every fruit in a card picture is the game's fruit icon; all favour and upgrade pictures on their own board; generator `docs/studio/art-drafts/cards-18/gen.py`.
- **Round 5 (2026-11-12 02:09, DEC-094):** picture style approved; the full picture set (36 customers, 8 shopkeepers, 8 order clients, 21 events) is being drawn by five helpers into `docs/studio/art-drafts/cards-18` (`kit.py`, reference `example_customer.py`; each helper has its own generator file and contact sheet; review, then commit). Three card BACK designs on the mock-up page (A Ticket, B Stall, C Crate label; the owner's corrected request) with matching fronts: the owner chooses one. Buying screen: market as board lanes of 3, 4, 5, 6 boxes. Open also: REP-105's three balance choices; tracker 1 or 2.
- **Round 6 (2026-11-12 02:23, DEC-095):** design A (Ticket) chosen for all cards except the customer front and back, which keep the earlier version. Open: back suggestion 1 (stub), 2 (picture) or 3 (pattern) for the six other decks (`backs.py` draws the pictures and tiles).
- **Round 7 (2026-11-12 02:31, DEC-096):** pattern backs chosen for now. Owner asked for: the flow from start to finish with smooth, board-like animation on the way to publishing live; an achievement and cosmetics progression (monetising later); a strong single-player mode. Three studies running into `docs/studio/review-18`; write REP-106 (proposal, decisions) when they return. Picture helpers (5) still drawing; review their sheets, then commit.
- **Round 8 (2026-11-12 03:00, DEC-097):** every card picture is drawn and on the mock-up page (36 customers, 21 events, 8 shopkeepers, 8 order clients, 6 favours, 5 upgrades; `docs/studio/art-drafts/cards-18`). Home screen: the stall picture goes; a swipe row shows today's market first and your next goals second (mock-ups at the top of the page). Flow and motion study in (`docs/studio/review-18/FLOW-AND-MOTION.md`); all three studies in; REP-106 written. Open with the owner: Pasar Malam's dark sky; whether a waiting game's table page comes first.
- **Proposal approved (2026-11-12 06:59, REP-106, DEC-098 to DEC-100):** three releases; the stamp book; the Market Month. PLAN-081 (flow repairs and two defects) implemented and merged (`f50c9d5`): verify PASS, browser tests PASS by the helper; on small phones the bid panel needs a scroll until package 3. PLAN-082 (Charmer 3 favour cards, Ripening Room without the discount) implemented (`9c0d11b`, REP-107): verify PASS; balance target FAIL narrowly (Nest Egg +4.3 at 6 stalls; Bargain Hunter +5.6 / +4.8 at Hard); **awaiting the owner:** accept for release A or tune. **Next package: 2** (shared motion blocks and the cards in design A), not yet opened. Release A's packages after it: 2 shared motion blocks and the cards; 3 the screens one beat at a time, the rush first; 4 the text (DEC-087); 5 trophies, stamp book, Trophies, Wardrobe, Results, Home (DEC-097, DEC-099); 6 print kit and release preparation. Balance choices settled (2026-11-12 07:15, DEC-101): Charmer 3 favour cards; Ripening Room discount dropped; mango orders left. For later packages: `scripts/qa-sweep.cjs` lacks the Favoured Trade step; online bid marks and the "Change bid" button (read from code); "No sales today" over the day strip; Skip shown at night. Later: tracker 1 or 2; Pasar Malam's sky; table page first on Home.
- **Rules 18 build (2026-11-12 01:51, PLAN-079, REP-105):** merged into `ccr-d8bcd65d-gblqqb` (merge `5f20a14`). `npm run verify` PASS (518 tests); browser tests PASS (0 leaks, reconnect 5 of 5); balance target FAIL, narrowly (Charmer above fair). Open with the owner: Charmer 3 favour cards; Ripening Room discount; mango standing orders. Not looked at in a browser by a person; not played by people; not published.
- **Packages:** PLAN-079 (rules 18) implemented. Next: text (DEC-087), screens and one card design (mock-ups in review, DEC-090 to DEC-093), trophies, the whole print kit from the repo. One release at the end.
- **Checkpoint:** branch `ccr-d8bcd65d-gblqqb`; rules 17 and the update pack unpublished; live is 1.19.1 with the defects listed in REP-101.

## Earlier (2026-11-11 22:46): review under rules 17 done; proposal (PLAN-078, REP-101)
- **Owner request:** simulate and playtest, find balance changes, exact deck and rule analysis, thoughtful screens with cards matching print, text audit, then regenerate the print kit; "prompt me for any required decision".
- **Done (documents only):** four studies in `docs/studio/review-17` and the proposal REP-101: five packages (A fix now, B rules 18, C text, D screens and one card design, E print kit) and ten decisions.
- **Live defects found (1.19.1):** first-game tip collapses Stocking and Pricing; Daily and League replace a saved game; "undefined" at 6 stalls; Mango Windfall green; stale How to play line; cropped portraits.
- **Checkpoint:** branch `ccr-d8bcd65d-gblqqb` (rules 17 and the update pack unpublished). Next: the owner's answers to D1 to D10, three at a time.
- **Parked:** the pricing screen's standing-order wording (now part of package D).

## Earlier (2026-11-11 21:26): rules version 17 and the tabletop update pack built, not published (PLAN-077)
- **Owner approval (to build):** the five-item request and three answers (DEC-085, REP-100). Publishing not requested.
- **Built (app):** rivals fill a standing order at $1 under the winning bid; bidding shows who is bidding, passed or deciding, and can be changed until the last stall decides; all five upgrades on offer. RULES_VERSION 17, computer players 5.
- **Built (table):** `print/update-17` from `scripts/print-update.ts`: guidebook at rules 17, six stall sheets (no cash track), six counters with the cash track, eight standing-order cards, a change sheet. Tomorrow's customers dealt in the morning.
- **Audit:** printed numbers match the app; differences found and their status are in REP-100.
- **Checks:** `npm run verify` PASS (451 tests); screenshots PASS; browser tests PASS (0 leaks, reconnect 5/5); balance target FAIL (Tip Jar 30.0, Bargain Hunter 41.3 against 33.3; not tuned); printed size test NOT RUN.
- **Checkpoint:** branch `ccr-d8bcd65d-gblqqb`, not merged. Next: owner prints a test page; chooses preview or live.
- **Parked:** the pricing screen's standing-order wording and $3 price limit; Sharp Ears timing.

## Earlier (2026-11-11 20:59): 1.19.1 live, owner fixes (PLAN-076)
- **Owner approval (to build):** the fix list after 1.19.0 (REP-099). Publishing not requested.
- **Built:** pop-ups (full screen, Paused, Continue, Play a friend), New game and The Bell in the Market Ticket look; today's news centred; slower night (1.5 s slide) after a dusk over the market, centred; no "Crates covered" sign; the market in view in the evening until Lights out; customer ticket price key; fixed: the last Lights out tap skipped the night.
- **Checks:** `npm run verify` PASS (442 tests); screenshots PASS; browser tests PASS (0 leaks, reconnect 5/5); owner phone check NOT RUN.
- **Owner approval (publish):** "push to live". Release 1.19.1 prepared.
- **Live:** 1.19.1 (commit `35bda0a`, tag `v1.19.1`, Deploy LIVE game run 38, live smoke test PASS).
- **Next:** owner plays 1.19.1; then the parked pricing-screen issue (standing order wording, $3 price limit).
- **Parked:** the pricing screen's standing-order wording and $3 price limit (owner will revisit).

## Earlier (2026-11-11 12:28): 1.19.0 live, rules version 16 (PLAN-075)
- **Owner approval:** "tomorrow's customer queue should also be visible during the buying phase"; chose "Draw it earlier" and "Same as the evening strip"; "push it live ASAP" (DEC-084, REP-098).
- **In 1.19.0:** tomorrow's regular (face up) and walk-ins (face down) drawn each morning, shown in the Tomorrow strip while buying. RULES_VERSION 16.
- **Checks:** `npm run verify` PASS (442 tests); rules 16 tests PASS; browser tests PASS (CI run 42957462676, after the deploy); balance target FAIL, unchanged from rules 15; owner phone check NOT RUN.
- **Live:** 1.19.0 (commit `c837073`, tag `v1.19.0`, Deploy LIVE game run 37, live smoke test PASS).
- **Next:** owner plays 1.19.0; consider letting computer players use tomorrow's crowd; balance tuning.
- **Gaps:** computer players ignore tomorrow's crowd when buying; printed kit not updated.

## Earlier (2026-11-11 11:46): 1.18.0 live, home A and the Lane Drop opening (PLAN-074)
- **Owner approval:** "ok go with A, and opening 1, but use the fruit icons currently used in game, push it to live" (DEC-083, REP-097).
- **In 1.18.0 (no rules change):** the home screen redrawn as home A, Ticket Booth, in the Market Ticket look, with a small band of the four fruit lanes (the game's fruit icons); the opening is now Lane Drop (about 2.45 s, tap to skip). The Market square home and the lorry opening are gone.
- **Checks:** `npm run verify` PASS (437 tests); browser tests PASS (0 leaks, reconnect 5/5); screenshots at three sizes PASS; owner phone check NOT RUN.
- **Live:** 1.18.0 (commit `95d553a`, tag `v1.18.0`, CI run 42952039497 PASS, Deploy LIVE game run 36, live smoke test PASS).
- **Next:** owner plays 1.18.0 on a phone; balance tuning still open (REP-096).
- **Gaps:** worn looks no longer show on the home.

## Earlier (2026-11-11 02:22): 1.17.0 live (PLAN-069 to PLAN-073)
- **Owner approval:** "push this live".
- **In 1.17.0:** rules version 15: fruit lives 3-4-5-6 with green mangoes, a row of five, standing orders won by bidding (rules 14), and secret stalls (a rival's shelf is never shown; a crate is a piece count until the bell; every crate opens at the bell). The game table redrawn to the Market Ticket design; the night shown.
- **Checks:** `npm run verify` PASS (437 tests); browser tests PASS (0 leaks, reconnect 5/5); balance target FAIL (not tuned, REP-096); owner phone check NOT RUN before publishing.
- **Live:** 1.17.0 (commit `e322183`, tag `v1.17.0`, Deploy LIVE game run 35, live smoke test PASS).
- **Next:** owner plays 1.17.0 on a phone; then balance tuning (Local Favourite weak, Bargain Hunter and Shade Cloth strong; Premium Display and Order Book weak first buys); the repo's own print kit is still rules 13.

## Earlier (2026-11-10 23:14): rules version 14 and the Market Ticket look on the PREVIEW copy, not published
- **Owner approval (to build):** "produce this rule change together with the design change for the app version"; "design the digital per your earlier design but with the new artsyle included"; night panel requested. No approval yet to merge to main or publish.
- **Built (PLAN-069, PLAN-070, PLAN-071; DEC-079, DEC-080; REP-094):** fruit lives 3-4-5-6 with green mangoes, a row of five with no waiting, standing orders won by the lowest secret bid, five upgrades (two per stall), Soft wording; Market Ticket colours, type, flat fruit and pictures; a night panel showing stock slide one box older.
- **Checkpoint:** owner said "push to preview"; pull request 2 merged to `main` (commit `c19efec`); CI run 42839658349 PASS (checks and preview jobs). Live game is still 1.16.0 (rules 13).
- **Checks:** `npm run verify` PASS (424 tests, 1 skipped with a reason); browser tests PASS (E2E OK, 0 leaks, reconnect 5/5). Balance target FAIL (shopkeepers 26.3% to 41.0% against 33.3%; not tuned). Owner phone check NOT RUN.
- **Gaps:** computer players do not sabotage orders; no-sale days up; card frames, crates and lorry recoloured only; worn looks not refitted; repo print kit still rules 13 (the rules 14 kit PDFs were made outside the repo).
- **Next:** owner plays the preview copy on a phone. Publishing needs its own approval and a prepared release (version bump).

## Earlier (2026-11-10): 1.16.0 live (PLAN-065 to PLAN-068)
- **Owner approval:** "yes publish".
- **In 1.16.0 (no rules change):** card layout C (bigger customer cards on phones); flow A from stall to pricing; one shared, punchy rush line for everyone; event card before the lorry; no queue gap in the rush; no quick-price boxes.
- **Checks:** `npm run verify` PASS (409 tests); browser tests PASS (0 leaks, reconnect 5/5).
- **Live:** 1.16.0 (commit `f845c7c`, tag `v1.16.0`, Deploy LIVE game run 34, live smoke test PASS).
- **Next:** owner plays 1.16.0.

## Earlier (2026-11-10): 1.15.1 live (PLAN-063, PLAN-064)
- **Owner approval:** "and then push everything live".
- **In 1.15.0 (no rules change):** swipe shopkeeper picker (design A) with the tagline under the card; New game without the Rules sections (previous defaults always on); shopkeeper cards show the name alone, without "Fresh fruit · Fair prices".
- **Checks:** `npm run verify` PASS (408 tests); browser tests PASS (0 leaks, reconnect 5/5).
- **Live:** 1.15.0 (commit `a7b7924`, tag `v1.15.0`, Deploy LIVE game run 32, live smoke test PASS).
- **Live:** 1.15.1 (commit `8c30e62`, tag `v1.15.1`, Deploy LIVE game run 33, live smoke test PASS): rivals and customers swap rows while pricing; The Bell no longer pops up; first-game tips fixed.
- **Next:** owner plays 1.15.1.

## Earlier (2026-11-10): 1.14.1 live (PLAN-062)
- **Owner approval:** "push it live".
- **In 1.14.1 (no rules change):** Fill your stall starts empty, shows the whole shelf full scale and says stall; first-game tip moved off the shelf; Calm Day card on Day 1 ("Day 1! Let's make some money!"); shorter event card back; "Play full screen?" after the opening, with Add to Home Screen steps on iPhone.
- **Checks:** `npm run verify` PASS (408 tests); browser tests PASS (solo game to results, 0 leaks, reconnect 5/5).
- **Live:** 1.14.1 (commit `228cf8a`, tag `v1.14.1`, Deploy LIVE game run 31, live smoke test PASS).
- **Next:** owner picks one of 5 swipe shopkeeper-picker mockups (A carousel, B full-width stall, C deck, D market street, E badge dial); the New game screen then loses its Rules sections (current defaults kept).

## Earlier (2026-11-10): 1.14.0 live (rules 13, event cards, new art)
- **Owner approval:** "ok approve all we discussed here and push it to live" (PLAN-061, DEC-078, REP-092, REP-093).
- **In 1.14.0:** events turned over each morning (never forecast); Cold Room removed; full-picture morning card drawn face down from the print kit's event back, waiting for its picture, then turned in 1 s; owner's event wording with taglines; Tomorrow's lorry on two rows; price reveal in the rival row's order; art for the seven newest events, Pak Din, Farah and the two guests (no "Art coming" cards left); print kit regenerated.
- **Checks:** `npm run verify` PASS (408 tests); browser tests PASS (E2E OK, 0 leaks in 100 pricing frames, reconnect 5/5); balance PASS (every shopkeeper within 4.5 points).
- **Live:** 1.14.0 (commit `4310313`, tag `v1.14.0`, Deploy LIVE game run 30, live smoke test PASS on rules version 13).
- **Next:** owner plays 1.14.0; watch whether surprise Inspector and Heatwave days feel fair (DEC-078 review trigger).

## Earlier (2026-11-09): 1.13.0 live, crates of chosen fruit (rules 12) and the new pricing
- **Live:** 1.13.0 (commit `ebc35f7`, tag `v1.13.0`, Deploy LIVE game run 29, live smoke test PASS on the re-run).
- **Built (PLAN-059, PLAN-060; DEC-076, DEC-077; REP-091):** fill your crate from a shelf drawn like the market (only crate fruit sells, rules version 12); pricing from the crates with a demand board and "The Bell" pop-up; crate drop, lid and board animations.
- **Checks:** `npm run verify` PASS (404 tests); balance as rules 11 (shopkeepers within about 6 points). Browser tests PASS (E2E OK, 0 leaks).
- **Next:** owner plays 1.13.0; art for Pak Din, Farah, 7 events and 2 guests still missing.

## Earlier (2026-11-09): 1.12.1 live (compact rules + seat tiles)
- **1.12.1** (commit `4b8f754`, tag `v1.12.1`, Deploy LIVE game run 28, live smoke test PASS): rival stalls on the New game screen are seat tiles (option C, DEC-075, PLAN-058). No rules change.
- **Built on branch `ccr-ff85604f-thv5m2`, not on main:** PLAN-057 / DEC-074, the owner's Compact Rules build spec (rules version 11): 2-6 stalls, halved orders and limits, 20 unique lorries, 20 events, Pak Din and Farah, halved upgrade costs. Report REP-090.
- **Checks:** `npm run verify` PASS; browser tests PASS (solo, performance budget, online 0 leaks, quick match, 6-stall room, reconnect). Balance: cash and pieces sold match the spec; shopkeeper target (within 4 points) FAIL for Big Basket, Nest Egg (both about +6), Haggler (about −5.5) and Shade Cloth at 4 stalls (−5.8). Fruit profit and upgrade-ban tests NOT RUN.
- **Gaps:** no owner art for the 2 new shopkeepers, 7 events and 2 guests; achievement money thresholds unchanged.
- **Owner's choice:** option A (playtest the balance as built), merge and publish live ("a and merge, then publish live"). **Live:** 1.12.0 (commit `6bc9552`, tag `v1.12.0`, Deploy LIVE game run 27, live smoke test PASS). Next: playtest the shopkeeper balance (REP-090 §3); owner art for Pak Din, Farah, 7 events and 2 guests.

## Earlier: 2026-11-08
- **Live:** 1.11.0 (commit `f60fe78`, tag `v1.11.0`, published 2026-11-09, Deploy LIVE game run 26, smoke test PASS). Rules version 10 (poorest first, then clockwise; no balance run, owner's choice); computer-player version 2. Print kit still shows the rules 9 buying-order wording.
- **Built and verified on branch `ccr-d9f10c6d-75280w` (commit 598de1e), not on main:** PLAN-050 owner tweaks (uniform cards, smooth opening, no 'Great Fruit Exchange' wording, Phone A in-game layout with no scrolling) and PLAN-051 playtest fixes (DEC-067, REP-089: honest Closing Day, price read, no-sale reasons, tie advice, Juice Bar forecast and tip, Scout label, green-fruit text; computer players count the jam maker and the real tie order). Checks: `npm run verify` PASS (341 tests), browser tests PASS (0 leaks), layout check PASS at 360x740, 390x844, 1280x800.
- **Package B note:** daily scores now carry a computer-player version (AI_VERSION 2); RULES_VERSION stays 9. On release day an unfinished daily can't be resumed and the daily board starts fresh. Balance target (3 points) still missed: Local Favourite +4.4 at Normal, Haggler +10 at Hard (pre-existing).
- **Known small gaps:** a very full pricing screen and the day-9 morning card scroll inside the panel at 360x740; final review round skipped at the owner's request.
- **Next:** owner checks 1.9.0 on a phone; open items: shopkeeper balance (Favourite, Haggler), small in-panel scroll on the smallest phone.

## Earlier: 2026-11-07
- **Live:** 1.8.0, The Great Fruit Exchange (commit `df61983`, tag `v1.8.0`, published 2026-11-07 by Deploy LIVE game run 23; live smoke test PASS). Rules version 9, unchanged.
- **Built and verified (PLAN-049, DEC-066):** the owner's deck art (events Art 1, shopkeepers Art 2, customers Art 3) across the app and a new print kit (`print/kit/`); approved names (DEC-064, DEC-065); fonts and colours from the art. Checks: `npm run verify` PASS (233 tests), `npm run test:e2e` PASS (solo, performance budget, online with 0 leaks, quick match, four players, rejoin), 45 names checked.
- **Art gaps (no owner art yet):** special guests use their event scene; favour, delivery and upgrade cards are type-only; worn looks show as pixel pins; the lorry, coin, favour and perk icons stay pixel art. The customer card back is a new design the owner has not seen on its own.
- **Follow-ups:** print kit: the Gym Club and Hotel Chef guest flags still cover part of their borrowed pictures; RULES.md worked example uses $6 for Professor Pebble but his card says $5; online names "Uncle Benny", "Ah Chen" and "Kiki" are not reserved (anti-abuse change needs a plan); desktop chips are 32-36 px tall with a mouse.
- **Found earlier, not fixed (REP-087 §11):** card-order backs make 9 customers unique; online leak check does not test name, type or generous flag on face-down walk-ins; likely bug: a rival's favour is announced as "Priority!" online.
- **Checkpoint:** branch `ccr-d9f10c6d-75280w` merged to `main`; PLAN-049 released; print-kit layout fixes done (print only). Next: the owner checks 1.8.0 on a phone; follow-ups above need the owner's choices.

## Earlier: 2026-10-29 (history, superseded by the section above)
- **1.2.0 was live then** (main `f5f9390`, tag v1.2.0, smoke test passed). The live game and the preview are the same build until the next change. Rules version 6.
- **On the preview (main `9424f21`, CI and preview green):** look D on every screen (PLAN-033, DEC-045), market opening on launch, about 2.5 seconds (DEC-047, DEC-048), readability fixes from the QA sweep (136 contrast findings down to 3), concept slides in How to play and a "big idea" section and worked example in RULES.md (DEC-049, REP-079). 1500-game soak clean. No rule or balance change.
- **Waiting for the owner:** phone check of the preview; read the new How to play wording; Card_Backs.pdf (draft, in the Drive Print_Kit folder); Good Riddance fate; shopkeeper perk balance (Big Basket strong, Haggler weak, REP-076); printed board size and token settings after a print test; taller tap targets (chips and market cells are 32 to 36 px); PLAN-003 spend cap and Cloudflare plan; releasing 1.2.0 (owner runs Deploy LIVE game, types PUBLISH).
- **Tooling:** `scripts/qa-sweep.cjs` and `scripts/soak.ts` run on GitHub through the QA sweep workflow (push a branch named `qa/...`, or run it by hand). The owner's laptop was out of memory this session, so local type checks and browsers were unreliable; CI is the evidence.

## Where we were (2026-10-28)
- **Stage:** complete game. Rules version 5, the tabletop procedures and character cards are on `main` and on the preview (CI and preview smoke test green, 2026-10-28). The live game is unchanged (1.1.1). No unfamiliar-player playtest has happened (PLAN-019 ended early, REP-046), so the first-playtest gate is still CONCERNS.
- **Direction:** one game, two editions with identical mechanics; the tabletop rules (`RULES.md`) are the master (DEC-027). The rules freeze is lifted (DEC-028).
- **Built since 1.1.1, unreleased:** UI and table (PLAN-009 to 013), rules 3 (PLAN-012), rules 4 (PLAN-014/015), rules 5 = lorry every day and no second-half walk-in (PLAN-020, DEC-029; computer-player simulation: empty-market turns 0.0% to 1.0%, REP-049/050), tie-break by buying order and a "Playing on a table" section in the rules (PLAN-024, DEC-030, REP-051), character cards: six characters with fixed perks picked on entering a room or on set-up (PLAN-025, DEC-031, REP-052). On local branch `workflow/plan-026` only (not pushed): 36 customer cards (PLAN-026, DEC-032, REP-053).
- **Approved, not built:** PLAN-021 session length (needs the owner's time target), PLAN-023 online undo and rename (design note awaiting the owner's choice).
- **Art direction decided (DEC-033, REP-054):** Look C, calm flat scenery with pixel fruit, people and icons; one Farmers Market board shared by the screen and the printed table mat. Nothing built. Proposed for approval: PLAN-027 style guide and one palette, PLAN-028 shared board (Village Square skin), PLAN-029 animated market opening. Still open: the lorry style and the printed board size (A3 assumed, needs a print).
- **Not approved:** PLAN-022 (icons and blank name; icons are now covered by characters, the blank name is not), PLAN-018 data counters, PLAN-003 online and capacity evidence, DEC-020 UI polish.
- **Ideas discussed, no decision yet:** a Market Day tension mechanic (Rush Hour was simulated: it moves the slack to the day after and cuts cash about 9%; Blight Day, last-fruit-costs-more and Glut Day were not simulated), a Scout favour card replacing the dead Good Riddance, animation polish (audit done, the owner has not chosen the motion feel or a time target).
- **Not done or not verified:** new character screens not seen on a phone; no hand-played tabletop test (day chips are the least proven part); hand-played ageing untested; PDF export blocked (pandoc missing); `scripts/records.mjs` fails on Windows paths (run a patched copy).
- **Reports:** REP-038 to REP-052 record the decisions since the lifecycle trial. Analysis files (turn flow, tabletop fixes, characters, favour cards, animation audit, simulation scripts and results) are in the owner's Google Drive folder `GameDev/Guides_v2`, outside this repo.

## Builds
| Copy | Address | Build |
|---|---|---|
| Live | https://fruit-market.murshidi-hashim.workers.dev | 1.7.0, `0d653b2` (published 2026-11-07, tag `v1.7.0`, per `releases.json`) |
| Preview | https://fruit-market-staging.murshidi-hashim.workers.dev | `main`; updated by CI after each green push |

The live game changes only through GitHub Actions → *Deploy LIVE game* → `PUBLISH` (DEC-003).

## Checks
- `npm run verify`: records check, lint, types, unit tests (196 at PLAN-047, 2026-11-07), build (about 20 s locally; the records check needs a patched copy on Windows).
- `npm run records`: regenerate the register, changelog, this file's pending block and the PDFs.
- `npm run verify:full`: plus browser tests (about 15 min). CI runs this on every push and pull request.
- Readiness: build-ready PASS; play-ready needs the owner's preview playtest; online-ready mostly
  PASS (crash recovery NOT RUN); release-ready not claimed (real devices, backups NOT RUN).

## Open items and known issues
- Owner to-dos: look at the preview on a phone (character pick, set-up screen, a 4-player room); decide the pending items in the generated block below; say whether to run the live deploy of the next release (Deploy LIVE game, type PUBLISH).
- Branch protection: instructions in `OWNER-BRIEF.md` §5. Not yet confirmed active.
- Owner questions not yet answered: which real phones are available; Cloudflare plan (Free or Paid) and any other paid accounts. DEC-005 stays an assumption until then.
- The Tally feedback form (https://tally.so/r/rDDdWX) is still published with no submissions; delete or unpublish it when no longer needed.
- Pre-existing: game-screen open time is noisy (217 to 489 ms locally; CI limit 600 ms with one retry).
- Store screenshot of the home screen is outdated; retake before the next Play listing update.
- Telemetry and leaderboard data on the live server have no backup (Package C).

## Approvals
- PLAN-001, 002, 004, 005 and 006 approved by the owner on 2026-10-26 (exact words in `records/`).
  Publication of 1.1.1: approved (DEC-013) and performed 2026-10-27. PLAN-009 to 013 approved and verified. Publishing the next release needs a new approval.

## Resume instruction
"Read the project instructions and current state. Inspect the current Git state. Tell me where we
stopped and recommend the next small task. Wait for my approval before implementation."

<!-- records:pending:start (generated by npm run records) -->
## Pending approvals (generated)

- PLAN-003: Package C, paid part: capacity and cost evidence (proposed)
- PLAN-018: Data insights: balance, retention and online health from anonymous counters (proposed)
<!-- records:pending:end -->
