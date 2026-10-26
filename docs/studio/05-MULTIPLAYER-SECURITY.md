# 05 · Multiplayer and Security

Departments: **Multiplayer Engineer** and **Security Engineer**.

---

## Multiplayer Engineer: synchronisation, reconnection, matchmaking, anti-cheat

### 1. Current implementation and evidence (`server/room.ts`, `src/net/client.ts`)
- **The server holds the authoritative game.**
  - Clients send actions with an `id` (duplicate protection, last 100 kept) and the `v` version they saw (stale-action protection).
  - Secret prices are held in `pending[]` until every human has submitted, then resolved together.
- **Each client gets a redacted view** (`redact`):
  - no pending bids
  - rivals' favour cards masked
  - decks emptied and `rng = 0`
- **[Measured] Online end-to-end test:** 0 leaks across 40 pricing-phase frames, and identical final cash on both clients.
- **Reconnection:**
  - a per-seat token in `localStorage`
  - exponential backoff, a 25 s ping, and reconnect when the app becomes visible again
  - "opened on another device" replaces the older connection
- **Rules version gate:** `hello` must carry `rv === RULES_VERSION` (`src/net/protocol.ts`). There's a test for it.
- **Quick match:** a `MatchDO` slot (90 s) pairs two players into a `quick` room, which auto-starts at 2 seats (`room.ts:157`).
- **[Defect, reproduced] Players who leave stall the match.** A temporary probe test (A joins a quick room and disconnects; B joins) showed:
  - the match auto-started with A offline
  - B's morning "continue" stayed at `votes [1]` indefinitely, still stuck after an hour of simulated time
  - Code causes:
    - `room.ts:157`: auto-start doesn't check connection
    - `room.ts:219`: `votes.length >= seats.length` counts offline seats
    - `room.ts:321`: waits for every human's prices
  - Private rooms have the same problem whenever anyone leaves mid-match. Documented in `ONLINE.md` as "a disconnected player is waited for", but unacceptable for stranger matches.

### 2. Strengths to preserve
- Server authority with redacted views.
- Action ids and versions.
- Token reconnects.
- The rules version gate.
- The same engine on both ends.

### 3. Weaknesses and risks
- **[Defect]** Abandonment, as above.
- **[Hypothesis] No visibility of the opponent's state** beyond "offline". There's no countdown, so players don't know whether to wait.
- **[Hypothesis] Quick-match fill rate:** with low concurrency, most searches will time out after 90 s and sit in an empty room. There's no "play the computer instead" fallback.
- **[Measured] The online computer rivals always play at `normal` level** (`room.ts:238`).

### 4. Root causes
The MVP assumed friends who wait for each other.

### 5. Proposed improvements
| ID | Change | Files | Priority |
|---|---|---|---|
| MP1 | **Grace period and computer takeover:** each seat records `lastSeen`. While a human is offline for at least G seconds (default 75 s, alarm-driven), mark the seat as computer-controlled (`kind: 'ai'`, level normal) and let `advance()` play it. On reconnect within the match, hand the seat back. Votes and price waits count only connected humans. | `server/room.ts` (`closed`, `alarm`, `advance`, `dispatch` continue), `RoomData` | P0 |
| MP2 | **Quick-match start guard:** auto-start only when both seats are connected. If the host has gone, re-seat or reset: the newcomer becomes host, and the dead seat is removed while still in the lobby. | `server/room.ts:157`, `hello`, `closed` | P0 |
| MP3 | **Quick-match fallback:** after 45 s, offer "Play a computer rival now" (it converts the room to 1 human plus a Normal computer). | `src/ui/Online.tsx` (quick lobby), `server/room.ts` | P1 |
| MP4 | **Visible countdown** ("Pinky disconnected: a computer takes over in 0:52") | `src/net/protocol.ts` (`RoomView.seats[].offlineSince`), `src/ui/Game.tsx` net strip | P1 |
| MP5 | **Abandonment telemetry** (`online_takeover`, `online_abandon:dayN`) | `server/worker.ts`, sent to `StatsDO` | P1 |
| MP6 | Bump `RULES_VERSION` if MP1 changes the player `kind` shape that clients render (it shouldn't; view-only flag preferred) | `src/net/protocol.ts` | P0 (check) |

### 6. Priority, effort, dependencies
- MP1: effort M.
- MP2: effort S.
- MP3: effort S–M.
- MP4: effort S.
- MP5: effort S.
- MP1 and MP2 come first; MP4 depends on MP1.

### 7. Acceptance criteria (tests in `tests/room.test.ts`)
- A quick room never enters `playing` with a disconnected seat.
- After the grace period, a disconnected human's turns are played and the match reaches `over`.
- Reconnecting returns control.
- Votes and price waits ignore disconnected seats.
- The end-to-end script gets an abandonment scenario: close context B mid-day, and A finishes the match.
- The redaction leak test still reports 0 leaks.

---

## Security Engineer: validation, abuse, rate limiting, privacy

### 1. Current implementation and evidence
**Validation**
- Room messages are capped at `MAX_MSG` and JSON-parsed with type checks.
- Names are cleaned (control characters and `<>` stripped, `NAME_MAX = 14`).
- Avatars are checked against an allow-list.
- Bids are validated by `validateBids`.
- Telemetry events are whitelisted by regex and capped (60 events, 5 errors of at most 200 characters).
- Daily submissions are capped at 400 moves and a 32 KB body.

**Anti-cheat**
- Daily scores are recomputed by replaying all moves with the server's own AI.
- Redaction stops reading rivals' prices out of network traffic.

**Secrets**
- `STATS_KEY` gates `/api/stats`; `.dev.vars` is git-ignored.
- Deploy tokens live in GitHub secrets.

**Privacy**
- No IDs.
- Telemetry is anonymous and aggregate, but **on by default**, with opt-out in Settings.
- `docs/privacy.html` is updated.

### 2. Strengths to preserve
- Replay verification.
- Redaction.
- Strict input checks.
- Minimal data collection.

### 3. Weaknesses and risks
- **[Defect] Leaderboard impersonation:** `addEntry` (`server/meta.ts:82`) keys entries by name only. Any client can submit under any name, and its entry replaces yours if it scores higher.
- **[Defect] No moderation:** free-text names appear publicly on the leaderboard (`/api/daily`) and to strangers in quick match.
- **[Defect] No rate limiting** (`server/worker.ts`):
  - **Daily replay (CPU about 0.1 s):** a denial-of-service and cost vector.
  - **Room creation:** creates new Durable Objects.
  - **Telemetry:** can inflate counts.
- **[Hypothesis] Telemetry poisoning:** anyone can post valid-looking events and skew dashboards. That's acceptable for anonymous counts if rate-limited and treated as directional.
- **[Hypothesis] Privacy and consent:** EU users may expect opt-in for analytics even when it's anonymous. This needs a legal judgement; the safe default is a first-run prompt.
- **[Hypothesis] CORS `*` on the API.** It's fine for public read endpoints, and acceptable for writes given rate limits.

### 4. Root causes
MVP scope; social features were added before trust and safety.

### 5. Proposed improvements
| ID | Change | Files | Priority |
|---|---|---|---|
| S1 | **Name claim token:**<br>• the client generates a random 128-bit secret once (`localStorage`, `fm.claim`) and sends it with daily submissions<br>• `BoardDO` stores `sha256(secret)` per name for that date<br>• a mismatch means "name taken today"<br>No account needed. | `src/net/daily.ts`, `server/meta.ts` (`DailyEntry.owner`), `server/worker.ts` (`BoardDO`) | P0 |
| S2 | **Name policy:**<br>• normalise (NFKC, case-fold, strip look-alike characters)<br>• a blocklist (a small embedded list, no dependency) and reserved names (rival names, "admin")<br>• applied to room and leaderboard names<br>• a fallback name if rejected | `server/meta.ts` (`cleanName`), `server/room.ts` (`clean`), new `server/names.ts` | P0 |
| S3 | **Rate limits:** Workers rate-limiting binding, per IP per route:<br>• `rooms`: 10/min<br>• `quick`: 10/min<br>• `daily`: 5/min<br>• `t`: 30/min | `wrangler.jsonc`, `server/worker.ts` | P0 |
| S4 | **Removal path:** `DELETE /api/daily` (requires `STATS_KEY`) to remove a name, documented in `ONLINE.md` | `server/worker.ts` | P1 |
| S5 | **Consent prompt** on first launch (opt-in or out, as decided), stored in settings; the telemetry client respects it | `src/ui/App.tsx`, `src/ui/store.ts`, `src/net/telemetry.ts` | P1 (decision P0) |
| S6 | **`rulesVersion` in daily submissions** (also in 03, T2) to prevent mismatched replays | `src/net/daily.ts`, `server/meta.ts` | P1 |

### 6. Priority, effort, dependencies
- S1: effort S–M.
- S2: effort S.
- S3: effort S.
- S4: effort S.
- S5: effort S plus a legal decision.
- S6: effort S.

### 7. Acceptance criteria (`tests/meta.test.ts`)
- A submission with the same name and a different claim secret is rejected.
- Blocklisted and reserved names are rejected or replaced; Unicode look-alikes are normalised.
- Requests over the limit get 429 (verified locally with wrangler, plus a unit test of the limiter wrapper).
- The removal endpoint requires the key.
- With consent off, no network request is made to `/api/t` (Playwright request interception).
