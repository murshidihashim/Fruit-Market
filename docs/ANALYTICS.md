# Analytics: counts, match records and how to read them

Two kinds of data, both under the Settings switch "Share game data" (on by default): anonymous daily **counts** (this page's first part) and nameless **match records** (below, PLAN-133). A third, the **player number**, exists only for a player who said yes when asked (PLAN-134). No name, account, device ID, advertising ID, room code or IP address is stored in any of them.

## Counts

Aggregate counters only. Events are batched by `src/net/telemetry.ts`, cleaned by `server/meta.ts` (`cleanIngest`), and summed per UTC day in `StatsDO` (kept 90 days).

Read them with: `curl -H "x-stats-key: $STATS_KEY" https://<your-worker>/api/stats?days=30`

## Events

| Event | Detail | Sent when |
|---|---|---|
| `app_open` | `android` / `web` | Each app start |
| `install_week` | `YYYY-wWW` | Once, on the first start of a new install |
| `active` | `d0`…`d7`, `d14`, `d30`, `d30plus`, `legacy` | Once per calendar day: days since this device installed (`legacy` = installed before v1.2) |
| `game_start` | `solo` / `pass_and_play` / `daily` / `sprint` / `online` | A new game starts (online: once per match). `sprint`: the day's Market Sprint (PLAN-114), each try included |
| `players` | 2–4 | With `game_start` (local games) |
| `day_reached` | 1–14 | Once per game per day (resuming doesn't count again) |
| `game_end` | `win` / `lose` | Once per game |
| `final_cash` | bucket of $25 (0–300) | Once per game |
| `fruit_spoiled` | pieces that spoiled in the game (0–10; 10 means 10 or more) | Once per game |
| `fruit_unsold` | ripe pieces left on the shelf at the end (0–12; 12 means 12 or more). Rules 20 (PLAN-108): counted from the shelf; before, it counted the jam maker's dollars, which were 0 with Market Days off | Once per game |
| `first_game_complete` | — | Once per device |
| `quit_day` | 1–14 | Leaving a local game before it ends |
| `tutorial` | step id | Each first-game tip dismissed |
| `online` | `create` / `public` / `quick` / `list_join` / `computers` | Creating a private room (`create`) or a public one (`public`, PLAN-112); searching for a quick match; joining a room from the Public rooms list (`list_join`); the host starting with computers in the empty seats after the wait (`computers`) |
| `reaction` | — | A preset reaction sent in an online room (PLAN-112). A count only: never which reaction, by whom or in which room |
| `daily_share` | — | Sharing the daily result |
| `sprint_retry` | — | Try again on the Market Sprint's results (PLAN-114). The day and end counters count a Sprint once per day, however often it is retried |
| `sprint_from_league` | — | "Try today's Sprint" tapped on a cleared Market League stage's results (PLAN-119). A count only |
| `first_buy`, `first_sale`, `day1_done` | — | Once per device: the first piece bought, the first sale made, Day 1 finished (PLAN-133) |
| `mode_view` | `daily` / `sprint` / `league` / `computer` / `pass_and_play` / `quick` / `private` / `public` | A mode's page opened (compare with `game_start` to see which modes are looked at but not played) |
| `quit_step` | the step (`buy`, `stall`, `bid`, `reveal`, `evening`…) | With `quit_day`, leaving a local game before it ends |

Error lines: the message and first stack frame, deduplicated, at most 5 per batch.

## Key metrics

- **Return on day N (retention)** ≈ `active:dN` ÷ `active:d0`, both summed over the install days you're studying. Example: day-1 return for installs of 1–7 March = (`active:d1` counts dated 2–8 March) ÷ (`active:d0` counts dated 1–7 March). Directional: anonymous counts can't link people, and players who opt out are missing.
- **Tutorial completion** = `tutorial:day2` ÷ `tutorial:trait`.
- **First game completion** = `first_game_complete` ÷ `install_week` (same period).
- **Game funnel** = `game_start` → `day_reached:1…10` → `game_end:*`; drop-offs show where games are abandoned (`quit_day:*`).


## Match records (PLAN-133)

One record per game, sent when the game ends or is left (and at the end of each day, so a closed app loses at most a day). Format and the server's gate: `src/net/matchRecord.ts`. The gate (`cleanRecord`) rebuilds every record field by field: numbers are range-checked and every string must be one of the game's own words (fruit, events, customers, perks, upgrades) or random hex, so a typed name cannot be stored.

| Part | Holds |
|---|---|
| Set-up | mode (`solo`, `pass`, `daily`, `sprint`, `league`, `online`), days, seed, options, and for each seat: person or computer, the computer's level, the perk |
| A sheet per day | each stall's purchases, crate and prices; every sale line (customer, fruit, wanted, top price, each stall's pieces, price and pieces sold); income, cash, fruit spoiled, upgrades, favours earned; standing-order bids and delivery |
| Trail (games on one phone) | each person's moves in order, the time each took (capped at 10 minutes) and the take-backs before it |
| Opens | the name of each rule page or card opened mid-game, with the day |
| End | finished or left, the day and step, each stall's cash and pieces sold, the leaver's rank |
| Device | phone, tablet or desktop; operating system family; rounded screen size; app version; a 0 to 3 bucket of long pauses |

- **Who sends it:** the app for games on one phone; the room server for online matches, and only when every person in the match has "Share game data" on.
- **Where it is kept:** `RecordsDO`, one object per calendar month, deleted 12 months later. Live and preview are separate.
- **Not in an online record yet:** move timings and opened cards (the room does not see them).

## The player number (PLAN-134)

Asked once on Home after a first game ("Help improve the game?"). Until a yes, no number exists. After a yes: 16 random hex digits kept on the phone, sent with each record as `who` (`pid`, the session's own random `sid`, games started this session, install day, test bucket `a` or `b`, stall level, league stage, looks unlocked) and as one line per app start (`POST /api/s`). Settings has "Link my games" (off deletes the number on the phone) and "Forget my data" (`POST /api/forget`: deletes every record and session line of that number on the server).

## Reading the records

`STATS_KEY=… npm run matches -- https://<your-worker> [YYYY-MM] [--save file.ndjson]` downloads a month and prints: games by mode, where games are left, the price contest (orders with two sellers, pieces sold near the top price), wins by people, computer level and perk, time per move, take-backs, cards opened, devices, and for players with a number: games per player, return on a later day by first mode, levels and test buckets. `npm run matches -- file.ndjson` reads a saved file.
