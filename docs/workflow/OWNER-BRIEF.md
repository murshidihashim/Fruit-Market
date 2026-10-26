# Owner brief · try, check and publish Fruit Market

Updated 2026-10-26 (Asia/Kuala_Lumpur). Everything here works from a phone browser.

## The two copies of the game

| Copy | Address | Who changes it |
|---|---|---|
| **Preview** | https://fruit-market-staging.murshidi-hashim.workers.dev | Updated automatically after every change passes all checks |
| **Live** (players) | https://fruit-market.murshidi-hashim.workers.dev | Only you, with the *Deploy LIVE game* button |

The preview has its own rooms, leaderboard and stats, so playing it never touches real players' data.
Anyone with the preview link can open it; it just isn't advertised. Don't share it publicly.

## 1 · Try a change (preview)
1. Claude tells you a change is ready and that CI is green.
2. Open the **preview** address in Chrome on your phone. If the page looks old, pull down to refresh.
3. Run the playtest checklist below.

Fallback if the preview is down: GitHub → **Actions** → latest **Android build** run → **Artifacts** →
download the debug APK and install it (Android asks you to allow installing from your browser).

## 2 · Playtest checklist (about 10 minutes)
Write down what you **saw**, not just "it's fine". For example: "On day 3 the price panel covered the Done button."

- [ ] Home screen loads. Sound and the settings toggles work.
- [ ] Tap **New game**, choose **Quick** (8 days) with one computer shop, then **Open the shops**.
      Play the whole game to the results screen.
- [ ] During sales, can you tell why you won or lost each customer?
- [ ] Press the phone's Home button mid-game, come back: the game continues where you left off.
- [ ] Turn the phone sideways and back: nothing is cut off.
- [ ] Optional, online: open the preview on a second phone (or a friend's). Tap **Quick match** →
      **Find an opponent** on both. You should land in the same game within about 10 seconds.
- [ ] Anything that felt confusing, slow or ugly: note the screen and the day.

Send Claude a bug like this:
```
Build or URL:
Device and browser:
Steps I followed:
Expected result:
Actual result:
How often, and a screenshot if possible:
```

## 3 · What the checks mean
- **CI green** means `verify:full` passed on a clean machine. That covers code rules, 63 rules tests, a
  build, a computer-played solo game, a speed budget, a full online match where one player leaves,
  and quick match.
- **CI does not prove** fun, clarity, real-phone behaviour or capacity. Only your playtests and the
  later Package C checks cover those.
- Results are always reported as PASS, FAIL, NOT RUN or NOT APPLICABLE.

## 4 · Publish to players (only when you decide)
1. Make sure the preview passed your checklist.
2. GitHub → **Actions** → **Deploy LIVE game** → **Run workflow**.
3. In the box, type `PUBLISH` (capitals) → **Run workflow**.
4. It checks the code again, publishes, then confirms the live site answers ("SMOKE OK").
   A red X means it stopped; the previous live version keeps running. Tell Claude.

To undo a bad release, ask Claude to revert it. Claude prepares the old version; you press Deploy again.

## 5 · Turn on branch protection (one time, about 3 minutes)
This makes GitHub refuse changes to `main` that haven't passed CI.
1. GitHub → the **Fruit-Market** repo → **Settings** → **Rules** → **Rulesets**.
2. **New ruleset** → **New branch ruleset**. Name: `protect main`. Enforcement: **Active**.
3. **Target branches** → **Add target** → **Include default branch**.
4. Tick **Restrict deletions**, **Block force pushes** and **Require status checks to pass** →
   **Add checks** → type `checks` → select it.
5. **Create**. Tell Claude it's done so it can confirm the protection is active.

After this, Claude's changes arrive as pull requests: you press **Merge** when CI is green.
As the owner you can still override in an emergency; avoid it.

## 6 · Useful sentences
- "STATUS": where we are and the next step.
- "PLAN an outcome: …": Claude proposes a small package and waits.
- "Approve PLAN-00X only, including its listed tests and documentation."
- "PREPARE RELEASE": Claude gathers the evidence for publishing; you still press Deploy.
