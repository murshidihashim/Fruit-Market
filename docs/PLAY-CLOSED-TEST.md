# Google Play closed test · tester kit

What you need to get Fruit Market from a closed test to production on Google Play. Added by PLAN-037.
It builds on `PUBLISHING.md` (signing key, GitHub secrets, Play Console sign-up, the `.aab` file) and
`store/listing.md` (listing text and data safety answers); those are not repeated here.
Every step below is yours in Play Console; nothing in the repo uploads to Play.

## 1 · The rule (checked 2026-10-29)

Google's page *App testing requirements for new personal developer accounts*
(<https://support.google.com/googleplay/android-developer/answer/14151465>) says:

- It applies to **personal** developer accounts created **after 13 November 2023**. (Organisation accounts
  don't have it.) If your Play Console Dashboard shows a "Test your app with a closed test" task before
  "Apply for production", it applies to you.
- You need a **closed test** with **at least 12 testers who have been opted in continuously for at least
  14 days**. Testers who leave before day 14 don't count; someone who leaves and rejoins starts a new
  14 days.
- Production (and pre-registration) stay switched off until you meet this. Then you **apply for production
  access on the Dashboard**. The form asks about the closed test (how easy recruiting was, whether testers
  used all features, how their use compared with what you expect in production, a summary of the feedback
  and how you collected it), about the game (audience, what makes it worth installing, expected installs
  in the first year), and about readiness (what you changed after the test, how you decided it was ready).
- Review usually takes **7 days or less**. Google can ask for more testing if engagement was low.

Practical target: invite **15 to 20 people** so that 12 are still opted in on day 14, and ask everyone to
open the game on at least 3 different days.

## 2 · Before you start

- [ ] A signed `.aab` (PUBLISHING.md §2–3: **fruit-market-release-aab** from the Android build run).
      Use the build you want testers to judge. The Android workflow builds `main` on each push and every
      `v*` tag; a run of a release tag (for example `v1.1.1`) is the safest choice.
- [ ] Online play in the app needs the GitHub variable `FM_SERVER_URL` (PUBLISHING.md, ONLINE.md). Without
      it testers can still play solo and pass-and-play.
- [ ] Play Console → **App content** done: privacy policy URL, ads = No, content rating, target audience,
      data safety. Use the data safety answers in the *Data safety form* section of `store/listing.md`
      (note: its summary line "No data collected" is older than that section; the section is the one to use).
- [ ] Store listing filled from `store/listing.md` with images from `store/` (see REP-078 for which
      screenshots are current).
- [ ] A way to collect feedback: your email or a WhatsApp number. Put it in the test's
      **Feedback URL or email address** field (Testers tab) so it shows on the opt-in page.

## 3 · Set up the closed test in Play Console (about 30 minutes)

1. Play Console → **Fruit Market** → **Test and release** → **Testing** → **Closed testing**.
2. Open the default closed track (often called *Closed testing - Alpha*) → **Manage track**.
3. **Testers** tab → **Create email list** → name it `Fruit Market testers` → add each tester's **Google
   account email** (the one signed in on their Android phone's Play Store) → **Save**. Tick the list.
   (A Google Group works too: add the group's email address instead.)
4. Same tab: set **Feedback URL or email address**. **Save**.
5. **Countries / regions** tab: add Malaysia and any country where a tester lives.
6. **Releases** → **Create new release** → upload the `.aab` → release name (for example `1.1.1 (closed test)`)
   → release notes ("First closed test. Please play 3 times in 14 days and send feedback.") → **Next** →
   **Save** → **Go to overview** → **Send for review** (Publishing overview). Google reviews it, usually
   within a few days.
7. After approval: **Testers** tab → **How testers join your test** → copy the **Join on Android** link (the
   opt-in link). Send it with the message in §4.
8. Note today's date in the tracking table (§6). Day 14 is counted from when the 12th tester opted in.

## 4 · Recruitment message (WhatsApp-friendly)

**English**

> Hi! I made a fruit-stall strategy game for Android called *Fruit Market* and I need testers on Google
> Play for 2 weeks. It's free, no ads, no purchases, ~10 minutes a game.
> If you can help:
> 1. Send me the Gmail address you use on your Android phone's Play Store.
> 2. I'll add you and send a link. Tap it, tap *Become a tester*, then install from Play.
> 3. Play at least 3 times over 14 days and keep it installed until <date>. Don't leave the test early: Google
>    only counts testers who stay 14 days.
> 4. Tell me anything confusing or broken (a screenshot helps).
> Android only for now. Thank you! 🍎

**Bahasa Malaysia**

> Hai! Saya buat satu game strategi gerai buah untuk Android, nama dia *Fruit Market*, dan saya perlukan
> penguji di Google Play selama 2 minggu. Percuma, tiada iklan, tiada pembelian, lebih kurang 10 minit satu
> permainan.
> Kalau boleh tolong:
> 1. Hantar alamat Gmail yang awak guna untuk Play Store di telefon Android.
> 2. Saya akan tambah nama awak dan hantar satu pautan. Tekan pautan itu, tekan *Become a tester*
>    (Jadi penguji), kemudian pasang dari Play Store.
> 3. Main sekurang-kurangnya 3 kali dalam 14 hari dan jangan buang app sehingga <tarikh>. Jangan keluar
>    dari ujian awal-awal: Google hanya kira penguji yang kekal 14 hari.
> 4. Beritahu saya apa-apa yang mengelirukan atau rosak (tangkap layar sangat membantu).
> Buat masa ini untuk Android sahaja. Terima kasih! 🍎

## 5 · Instructions for testers (send after they join)

**English**

> Thanks for testing Fruit Market!
> - Install: open the link, tap *Become a tester*, then *download it on Google Play*. Use the same Google
>   account as your Play Store.
> - Play 3 sessions on different days. Ideas: (1) New game, Quick, 1 computer shop, play to the results;
>   (2) a Standard game with 2 or 3 computer shops; (3) pass-and-play with someone, or the Daily market.
> - Keep the app installed and don't press *Leave the program* until <date>.
> - Send feedback by WhatsApp or email, like this:
>   Build or URL: (Play closed test, version shown in Settings)
>   Device and browser: (phone model, Android version)
>   Steps I followed:
>   Expected result:
>   Actual result:
>   How often, and a screenshot if possible:

**Bahasa Malaysia**

> Terima kasih kerana menguji Fruit Market!
> - Pasang: buka pautan, tekan *Become a tester*, kemudian *download it on Google Play*. Guna akaun Google
>   yang sama dengan Play Store awak.
> - Main 3 kali pada hari yang berbeza. Cadangan: (1) New game, Quick, 1 kedai komputer, main sampai
>   keputusan; (2) permainan Standard dengan 2 atau 3 kedai komputer; (3) main bergilir dengan kawan di satu
>   telefon, atau Daily market.
> - Jangan buang app dan jangan tekan *Leave the program* sehingga <tarikh>.
> - Hantar maklum balas melalui WhatsApp atau emel, macam ini:
>   Build or URL: (ujian tertutup Play, versi dalam Settings)
>   Device and browser: (model telefon, versi Android)
>   Steps I followed: (langkah yang saya buat)
>   Expected result: (apa yang saya jangka)
>   Actual result: (apa yang berlaku)
>   How often, and a screenshot if possible: (berapa kerap, dan tangkap layar jika boleh)

The feedback template is the bug format from `docs/workflow/OWNER-BRIEF.md` §2, so you can forward
reports to Claude unchanged.

## 6 · Tracking table

Copy into a note or spreadsheet. "Days active" = days they opened the game (ask them, or use Play Console
→ **Statistics** for totals; Play doesn't show per-tester activity).

| # | Tester | Google email added | Opted in (date) | Installed | Days active | Feedback sent | Still opted in on day 14 |
|---|---|---|---|---|---|---|---|
| 1 | | | | ☐ | | ☐ | ☐ |
| 2 | | | | ☐ | | ☐ | ☐ |
| 3 | | | | ☐ | | ☐ | ☐ |
| 4 | | | | ☐ | | ☐ | ☐ |
| 5 | | | | ☐ | | ☐ | ☐ |
| 6 | | | | ☐ | | ☐ | ☐ |
| 7 | | | | ☐ | | ☐ | ☐ |
| 8 | | | | ☐ | | ☐ | ☐ |
| 9 | | | | ☐ | | ☐ | ☐ |
| 10 | | | | ☐ | | ☐ | ☐ |
| 11 | | | | ☐ | | ☐ | ☐ |
| 12 | | | | ☐ | | ☐ | ☐ |
| 13 | | | | ☐ | | ☐ | ☐ |
| 14 | | | | ☐ | | ☐ | ☐ |
| 15 | | | | ☐ | | ☐ | ☐ |

Day 14 = the date the 12th tester opted in + 14 days. Count only rows with "Still opted in" ticked.

## 7 · After 14 days

1. Check the table: at least 12 testers still opted in for 14 days in a row.
2. Ask Claude to summarise the feedback into a report (what testers did, what broke, what you changed).
   That summary is the answer to the form's "feedback" and "changes" questions.
3. Play Console → **Dashboard** → **Apply for production** → answer the three sections:
   - *Closed test*: how you recruited (friends and family by WhatsApp), how many testers and how active,
     which features they used (solo, pass-and-play, daily market, online if set up), the feedback summary
     and how you collected it (WhatsApp/email with a fixed template).
   - *The game*: audience (casual strategy players and families; see `docs/workflow/GAME-BRIEF.md`), why it's
     worth installing (short secret-price rounds, offline solo, no ads or purchases), a modest estimate of
     first-year installs.
   - *Readiness*: the fixes made after the test and the checks that passed (CI `verify:full`, phone checklist
     in `docs/DEVICE-CHECKLIST.md`).
4. Wait for Google (usually 7 days or less). If they ask for more testing, keep the test running.
5. **Production release is publishing**: it needs your separate approval in a new plan before anything is
   rolled out (CLAUDE.md, PUBLISHING.md §5 step 7).
