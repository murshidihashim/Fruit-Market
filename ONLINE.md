# Online multiplayer

Play Fruit Market in a browser and challenge a friend anywhere: create a private room, send the link, play the same match on two devices.

## How it works

- **One Cloudflare Worker** serves the web game and runs the room server (`server/worker.ts`).
- **Each room is a Durable Object** (`server/room.ts`): one small server that owns that room's game, handles messages one at a time (so actions can't race or apply twice), and saves the match after every change. A refresh or a dropped phone connection doesn't lose anything.
- **The rules are the same code as solo play.** The server applies every action with `applyAction()` from `src/engine/game.ts`. Clients only send intentions.
- **Secret prices stay secret.** Prices are held on the server until every human has submitted, then resolved together. Each browser gets its own filtered view: no opponent prices, no hidden favour cards, no deck order and no random seed.
- **Reconnecting** uses a secret seat token stored on the device, not just the room code. Rooms expire after 24 hours with no activity.

## Deploy (about 10 minutes, free plan)

1. Create a free Cloudflare account at <https://dash.cloudflare.com/sign-up>.
2. Copy your **Account ID**: dashboard → Workers & Pages (shown in the sidebar).
3. Create an **API token**: My Profile → API Tokens → Create Token → template **"Edit Cloudflare Workers"** → Create.
4. In GitHub: repo → Settings → Secrets and variables → Actions → **New repository secret**:
   - `CLOUDFLARE_API_TOKEN` = the token
   - `CLOUDFLARE_ACCOUNT_ID` = the account ID
5. GitHub → Actions → **Deploy web + online server** → Run workflow (it also runs on every push to `main`).
6. The log ends with your URL, e.g. `https://fruit-market.<your-subdomain>.workers.dev`. Open it, tap **Play online with a friend**, create a room and share the link.

Or deploy from your computer: `npx wrangler login`, then `npm run deploy:web`.

### Android app online play

The Android app isn't a website, so it needs the server address: GitHub → Settings → Secrets and variables → Actions → **Variables** tab → New variable `FM_SERVER_URL` = your workers.dev URL. The next Android build can then play online.

## Run it locally

```bash
npm run dev:online                                            # game + server at http://127.0.0.1:8787
node scripts/e2e-online.cjs http://127.0.0.1:8787 /tmp/shots  # two browsers play a full match
```

## Tests

- `tests/room.test.ts`: full matches with and without computer rivals; secret prices never leaving the server; duplicate and stale actions rejected; reconnect by token, with a stranger holding only the code refused; full rooms; leaving the lobby; expiry; host-only start; rematch.
- `scripts/e2e-online.cjs`: two independent browser profiles create a room, join by link, play a full match, refresh mid-game, check every network message for leaks, compare final results, and rematch.

## More online features

- **Quick match:** `POST /api/quick` pairs two strangers. The first player waits in a fresh room for up to 90 seconds; the next player to search joins it and the match starts straight away (one `MatchDO` object holds the queue).
- **Daily leaderboard:** finishing a daily challenge sends your name and moves to `POST /api/daily`. The server **replays the whole game** from the shared seed (computer turns included), so a made-up score is impossible. One `BoardDO` object per date keeps the top 100. `GET /api/daily?date=YYYY-MM-DD` reads it.
- **Version check:** every client sends `RULES_VERSION` (src/net/protocol.ts). Bump it whenever the rules change; older apps get a polite "please update" instead of a broken game.
- **Anonymous stats and crash lines:** the app sends event counts like `day_reached:5` to `POST /api/t` (players can switch this off). A `StatsDO` object adds them into daily totals in SQLite and deletes them after 90 days. To read them, set a secret once: `npx wrangler secret put STATS_KEY`, then:

  ```bash
  curl -H "x-stats-key: YOUR_KEY" https://fruit-market.<you>.workers.dev/api/stats?days=14
  ```

  Useful funnel: `game_start` → `day_reached:1…10` → `game_end:*`, plus `tutorial:*`, `quit_day:*` and the error list.

## Limits

- Up to 4 seats per room (humans plus optional computer rivals).
- A disconnected player is waited for; nobody is auto-forfeited.
- No accounts or chat. Quick match pairs whoever is searching at the same moment, with no skill rating yet.
- Stats and leaderboards each run in a single Durable Object, which is plenty for launch (hundreds of requests a second). Shard them by key if the game gets very big.
