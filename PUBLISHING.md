# Publishing Fruit Market on Google Play

You can't build the Android app on the cloud machine where it was written, so **GitHub Actions builds it for you** on every push. The steps below take about an hour the first time.

## 1. Try it on your phone (free)

1. Open the repo on GitHub → **Actions** → the latest **Android build** run.
2. Download **fruit-market-debug-apk**, unzip it, and open the `.apk` on your Android phone (allow "install unknown apps" when asked).

## 2. Create your upload key (once, on your computer)

You need Java installed (`keytool` comes with it).

```bash
keytool -genkeypair -v -keystore fruit-market-upload.jks -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

Pick a strong password and **back the file up somewhere safe**. Never commit it to git.

Then turn it into text for GitHub:

```bash
base64 -w0 fruit-market-upload.jks > keystore.txt     # macOS: base64 -i fruit-market-upload.jks > keystore.txt
```

## 3. Add GitHub secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Value |
|---|---|
| `FM_KEYSTORE_BASE64` | contents of `keystore.txt` |
| `FM_KEYSTORE_PASSWORD` | the keystore password |
| `FM_KEY_ALIAS` | `upload` |
| `FM_KEY_PASSWORD` | the key password (same as the keystore password if you pressed Enter) |

Re-run the workflow (Actions → Android build → **Run workflow**). It now also produces **fruit-market-release-aab**, a signed `.aab` file.

## 4. Turn on the privacy policy page

Repo → **Settings → Pages** → Source: *Deploy from a branch* → Branch `main`, folder `/docs`. Your policy will be at `https://<username>.github.io/fruit-market/privacy.html`. (Pages on a private repo needs a paid GitHub plan. If yours is free, make the repo public or host `docs/privacy.html` anywhere else.)

## 5. Google Play Console

1. Sign up at <https://play.google.com/console> (one-time US$25 fee, plus identity check).
2. **Create app** → name *Fruit Market*, type *Game*, *Free*.
3. Fill in **App content**: privacy policy URL, ads = No, content rating questionnaire, target audience, data safety (no data collected).
4. **Main store listing**: copy the text from `store/listing.md` and upload the images in `store/`.
5. **Testing → Internal testing** → create a release → upload the `.aab` → add your own email as a tester → install from the Play link.
6. New personal developer accounts must run a **closed test with at least 12 testers for 14 days** before going to production. Invite friends and family via **Closed testing**.
7. Then **Production → Create release** → upload the latest `.aab` → submit for review (usually a few days).

## Updating the game

Every push to `main` builds a new `.aab` with a higher version code automatically. Bump `versionName` in `android/app/build.gradle` and `version` in `package.json` for player-facing version numbers.

## App ID

The package name is `com.murshidi.fruitmarket` (in `capacitor.config.ts` and `android/app/build.gradle`). **It can't be changed after the first upload to Play**, so change it now if you want a different one.
