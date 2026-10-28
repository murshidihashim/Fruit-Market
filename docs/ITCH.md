# Fruit Market on itch.io (HTML5)

How to make the itch.io upload, set up the page and push new builds. Added by PLAN-037.
**Uploading to itch.io is publishing**: do it only when you decide to (CLAUDE.md: publishing needs your
separate approval). Nothing in this repo uploads by itself.

## What the itch.io copy is

- One zip, `release/itch/fruit-market-web.zip`, with `index.html` at the root (everything inlined: code,
  styles, fonts) and the icon. About 220 KB.
- **Offline only.** Solo against computer shops, pass-and-play on one device, Market League, trophies and the
  daily market (its leaderboard says it needs an internet connection). Saves stay in the player's browser.
- **No online rooms, no Quick match, no leaderboard and no anonymous counters.** The build clears
  `VITE_SERVER_URL` on purpose, so the page never contacts a server. The *Play a Friend* and *Quick match*
  screens open and show "Online play needs the web version or a configured server". Turning online on for
  itch.io needs its own plan: invite links would point at itch.io's game frame, the room server would
  receive calls from another site, and the privacy note and the counters would need a check.
- No ads, no purchases, no accounts (GAME-BRIEF exclusions). Set the itch.io price to free with no
  "suggested donation" unless you decide otherwise.

## Make the zip

On your computer (Windows, macOS or Linux) from the repo folder:

```
npm ci
npm run build:itch
```

It prints `ITCH BUILD OK: release/itch/fruit-market-web.zip … version 1.1.1+<commit>`. It also writes
`release/itch/version.txt` (the game version and commit) for butler. `release/` is not committed.

To check it the way itch.io shows it (the game inside a frame on another address, one solo game to the
first evening; add `--full` to play to the results):

```
node scripts/itch-smoke.cjs release/itch/fruit-market-web.zip e2e-output/itch
```

Or without your computer: GitHub → **Actions** → **itch.io web build** → **Run workflow**. When it is green,
open the run and download the **fruit-market-itch-web** artifact (it contains the zip and `version.txt`).
The workflow only builds and checks; it does not upload anything and uses no secrets. GitHub shows the
*Run workflow* button only once the workflow file is on `main`, so this works after the PLAN-037 branch is merged.

## Set up the itch.io page (once)

1. itch.io → **Upload new project**.
2. **Title** Fruit Market; **Kind of project: HTML** (not Downloadable).
3. **Uploads**: upload `fruit-market-web.zip` and tick **This file will be played in the browser**.
4. **Embed options**:
   - **Embed in page**, viewport **450 × 800** (portrait; the game is laid out for a phone).
   - **Mobile friendly**: on, orientation **Portrait**. On phones itch.io then opens the game full screen.
   - **Fullscreen button**: on.
   - **Automatically start on page load**: off (keep *Click to play*; browsers only allow sound after a tap).
   - **Enable scrollbars**: off. **SharedArrayBuffer support**: off (not needed).
5. **Details**: short description and screenshots can come from `store/listing.md` and `store/screenshots/`
   (see the screenshot note in REP-078). Remove the lines about online play, the daily leaderboard and
   anonymous stats from the description: they don't apply to this copy.
6. **Pricing**: No payments. **Visibility**: start with **Draft** or **Restricted** and open the page on your
   phone and computer; switch to **Public** only when you are happy.

Reference: <https://itch.io/docs/creators/html5> (limits: 1,000 files, 500 MB unzipped, relative paths only,
HTTPS for anything outside the zip; this zip is 2 files and uses no outside address).

## Push new builds with butler (optional)

butler uploads only what changed and keeps a version number on the page.

1. Install butler: <https://itch.io/docs/butler/installing>, then `butler login` once.
2. After `npm run build:itch`:

```
butler push release/itch/fruit-market-web.zip <your-itch-user>/fruit-market:html5 --userversion-file release/itch/version.txt
```

butler accepts a `.zip` directly. The first time, open the page's **Edit game** screen and tick
*This file will be played in the browser* on the new `html5` upload (butler can't set that tag).
Reference: <https://itch.io/docs/butler/pushing>.

The GitHub workflow has a butler step that is switched off (commented out). Switching it on means an
automatic upload from GitHub; the comments in `.github/workflows/itch-build.yml` say how, and it needs your
approval first.

## What to check after an upload

- The page opens on a phone and a computer; *Click to play* starts the game.
- New game → Start game → play one day. Close the tab, open the page again: **Continue** is offered.
- The fullscreen button works. Sound plays after the first tap (if sound is on in Settings).
- *Play a Friend* shows the "needs the web version" message and nothing hangs.

Known limits: browsers that block storage inside frames (some private modes) lose the save when the tab
closes; the game keeps running. The online screens' message mentions ONLINE.md, which players can't read;
hiding those buttons on offline copies is a small UI change for a later plan.
