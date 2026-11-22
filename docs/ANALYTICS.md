# Analytics: event dictionary and how to read it

Anonymous, aggregate counters only (no user, device or advertising IDs). Players can switch it off in Settings. Events are batched by `src/net/telemetry.ts`, cleaned by `server/meta.ts` (`cleanIngest`), and summed per UTC day in `StatsDO` (kept 90 days).

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

Error lines: the message and first stack frame, deduplicated, at most 5 per batch.

## Key metrics

- **Return on day N (retention)** ≈ `active:dN` ÷ `active:d0`, both summed over the install days you're studying. Example: day-1 return for installs of 1–7 March = (`active:d1` counts dated 2–8 March) ÷ (`active:d0` counts dated 1–7 March). Directional: anonymous counts can't link people, and players who opt out are missing.
- **Tutorial completion** = `tutorial:day2` ÷ `tutorial:trait`.
- **First game completion** = `first_game_complete` ÷ `install_week` (same period).
- **Game funnel** = `game_start` → `day_reached:1…10` → `game_end:*`; drop-offs show where games are abandoned (`quit_day:*`).
