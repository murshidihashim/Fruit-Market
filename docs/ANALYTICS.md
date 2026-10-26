# Analytics: event dictionary and how to read it

Anonymous, aggregate counters only (no user, device or advertising IDs). Players can switch it off in Settings. Events are batched by `src/net/telemetry.ts`, cleaned by `server/meta.ts` (`cleanIngest`), and summed per UTC day in `StatsDO` (kept 90 days).

Read them with: `curl -H "x-stats-key: $STATS_KEY" https://<your-worker>/api/stats?days=30`

## Events

| Event | Detail | Sent when |
|---|---|---|
| `app_open` | `android` / `web` | Each app start |
| `install_week` | `YYYY-wWW` | Once, on the first start of a new install |
| `active` | `d0`…`d7`, `d14`, `d30`, `d30plus`, `legacy` | Once per calendar day: days since this device installed (`legacy` = installed before v1.2) |
| `game_start` | `solo` / `pass_and_play` / `daily` / `online` | A new game starts (online: once per match) |
| `players` | 2–4 | With `game_start` (local games) |
| `day_reached` | 1–14 | Once per game per day (resuming doesn't count again) |
| `game_end` | `win` / `lose` | Once per game |
| `final_cash` | bucket of $25 (0–300) | Once per game |
| `first_game_complete` | — | Once per device |
| `quit_day` | 1–14 | Leaving a local game before it ends |
| `tutorial` | step id | Each first-game tip dismissed |
| `online` | `create` / `quick` | Creating a room or searching for a quick match |
| `daily_share` | — | Sharing the daily result |

Error lines: the message and first stack frame, deduplicated, at most 5 per batch.

## Key metrics

- **Return on day N (retention)** ≈ `active:dN` ÷ `active:d0`, both summed over the install days you're studying. Example: day-1 return for installs of 1–7 March = (`active:d1` counts dated 2–8 March) ÷ (`active:d0` counts dated 1–7 March). Directional: anonymous counts can't link people, and players who opt out are missing.
- **Tutorial completion** = `tutorial:day2` ÷ `tutorial:trait`.
- **First game completion** = `first_game_complete` ÷ `install_week` (same period).
- **Game funnel** = `game_start` → `day_reached:1…10` → `game_end:*`; drop-offs show where games are abandoned (`quit_day:*`).
