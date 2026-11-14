# UC - Use Gamification Signals

## Status

**Level:** L1
Supported today. The leaderboard - a weekly ranking that resets every Monday 00:00 UTC, last
week's frozen final standings, and the all-time ranking - with its persisted `/meta` documents,
the bite counts behind it, the daily ranking notification and the country badges all ship. What is still ahead
is BiteTrail gamification, which is [UC - Add BiteTrail Gamification](uc-add-bitetrail-gamification.md)'s rather than this
page's.

## Goal

Someone who contributes sees that it counted - a rank, a count on their profile, a badge for a
country they are the first to record. This page owns which signals exist and what each is
computed from; what a notification about one of them says, and to whom, belongs to
[UC - Receive App Notifications And Engagement Updates](uc-receive-app-notifications-and-engagement-updates.md).

## Actors

- **Bite Creator** - opens the leaderboard, earns the badges, and is ranked by the count of
  Bites it created.

## Flow

- User opens the leaderboard. It opens on **This week**: the public users ranked by the Bites
  they created since Monday 00:00 UTC, the same moment for everyone, so a new user can reach
  the top in their first week. A countdown names when the week ends. The week tab has a
  **This week / Last week** switch; **Last week** shows the previous week's final standings,
  frozen at the reset and dated. **All time** keeps the ranking by every Bite a user created.
  See GitHub issue [#2027].
- The **Most liked** tab ranks Bites, not users, by the likes they received this week - any
  Bite, however old - and has the same week switch, countdown and frozen last week. A row shows
  the photo, the dish, its creator and the like count, and opens the Bite. One creator may hold
  several places. A like counts for the week the backend saw it in (the like trigger), never
  the `createdAt` the client wrote; removing it takes it off that week only while the week is
  still running. A deleted Bite, one whose photo is not uploaded, and one whose creator is
  private or gone are left out. There is no all-time most-liked ranking. See GitHub issue
  [#2028].
- Backend functions maintain Bite counts. The weekly board is built from the Bites whose
  `createdAtTimestamp` falls in the week, so it needs no per-user weekly counter and a deleted
  Bite drops out of its week by itself. A tie is decided by who reached the count first.
- `resetWeeklyLeaderboard` runs every Monday 00:00 UTC: it freezes the week that ended into
  `/meta/leaderboardLastWeek`, which nothing rebuilds afterwards, and starts the new week empty.
  A read of a week that has not been reset or frozen yet does it on the spot, so the board never
  shows last week as this week.
- Leaderboard displays users by contribution signals.
- Leaderboard rank and profile contribution display are persisted.
- Profile badges show lightweight contribution recognition.
- Ranking-change notifications can nudge users when their position changes. They follow the
  weekly ranking, and a creator is also told when one of their Bites enters, climbs, falls on
  or drops out of the Most liked top 10 - one notification per Bite, opening the **Most liked**
  tab. The first daily run of a week only takes a new baseline: the reset would
  otherwise read as every ranked user dropping out.
- A first Bite in a new country earns a country badge, which congratulates the
  user and, for a public profile, is announced to their followers.
- The badge is also celebrated in the app while it runs: a short confetti burst
  and `First Bite in a new country: {{country}}!`, with the country named in the
  user's language. The phone does not know the country when the post succeeds -
  `enrichBiteAddressOnWrite` derives it a few seconds later - so the store's
  `celebrateFirstCountry$` keeps the user's own document listened to for the
  session and celebrates when a snapshot adds a code to `countryCodes`. The first
  snapshot after sign-in only sets the baseline, a snapshot that adds several
  codes celebrates once, and a move into a new country counts like a post. Going
  from no codes to one celebrates nothing: that Bite is the user's first, and the
  first-Bite celebration already played (epic [#1741]). The user's own push for
  the badge is not shown on top while the app is in the foreground, because
  neither app configures `presentationOptions` for `PushNotifications`, so the
  plugin presents nothing there. See GitHub issue [#1797] and the Celebration
  Rule in [Implementation - Ionic Patterns](../implementation/ionic-patterns.md).

## MVP Classification

**[Secondary]** - the whole page. Every signal here is motivation rather than function: the app
records and discovers food without a leaderboard, a rank or a badge, and nothing else depends on
them.

## App Store Review Area

Not relevant, because nothing here is a permission, a store declaration or a review
surface. The notifications these signals trigger are
[UC - Receive App Notifications And Engagement Updates](uc-receive-app-notifications-and-engagement-updates.md)'s, and the permission behind
them is collected in onboarding.

## Supported Evidence

- `leaderboard`
- `loadLeaderboard`
- `incrementBiteCountOnBiteCreate`
- `resyncBiteCounts`
- `sendDailyLeaderboardNotification`
- `resetWeeklyLeaderboard`, `rebuildWeeklyLeaderboard`, `freezeLastWeek`
- `recordLike`, `removeLike`, `rebuildMostLiked`, `freezeMostLikedLastWeek`
- Profile country badges
- `notifyOnNewCountryBadge`
- `celebrateFirstCountry$` in the bite-tribe store's `AppEffect`

## Related GitHub Scope

- Issue [#966] resyncs the per-user bite count and the aggregate weekly.
- Issue [#968] persisted the leaderboard as the `/meta/leaderboard` document. That document
  caches an entry per ranked account, and any member can read it through the client SDK. Issue
  [#1611] removed the email address from those entries: an entry holds the user id, display
  name, photo, city, public flag and Bite count, and a snapshot written by an older build is
  rebuilt the first time it is read.
- Issue [#2027] made the leaderboard weekly: `/meta/leaderboardWeekly` (the running week, rebuilt
  on every Bite create or delete in that week) and `/meta/leaderboardLastWeek` (frozen at the
  Monday reset), with `loadLeaderboard` taking a `board` of `thisWeek`, `lastWeek` or `allTime`.
  A call without one still gets the all-time ranking as a bare array, so builds from before the
  change keep working.
- Issue [#2028] added the Most liked board: `/weeklyBiteLikes/{week}_{biteId}` counts each
  Bite's likes per week and `/likeWeeks/{biteId}_{likerUid}` remembers the week each like was
  counted in, both server-only; `/meta/leaderboardMostLiked` and
  `/meta/leaderboardMostLikedLastWeek` hold the two boards, and
  `/meta/leaderboardMostLikedDaily` the daily notification baseline. `loadLeaderboard` takes
  `mostLiked` and `mostLikedLastWeek`. The board query needs the `weeklyBiteLikes` (`week`,
  `likes` descending) composite index.
- Issue [#954] added the ranking notifications, delivered by pull request [#971].
- Issue [#975] added the country badges; [#1212] turned a new badge into a notification for the
  user and their followers, and that contract lives in
  [UC - Receive App Notifications And Engagement Updates](uc-receive-app-notifications-and-engagement-updates.md).
- Issue [#1797] celebrates a new country badge in the app, part of epic [#1741].
- Issue [#1837] lets the sharer name a first Bite or a first country on that Bite's share
  image, part of epic [#1741]; the contract is `R-34` of
  [UC - Share A Bite To Social Media](uc-share-a-bite-to-social-media.md).
- Issue [#770] is the **BiteTrail** gamification epic and is owned by
  [UC - Add BiteTrail Gamification](uc-add-bitetrail-gamification.md), not by this page.

## Related Domains

- [User](../domain/user.md)
- [Bite](../domain/bite.md)
- [Bite Trail](../domain/bite-trail.md)

## Related Pages

- [Personas](../product/personas.md) - the audiences the `Actors` mapping displaced: the Bite creator and the food
  lover
- [UC - Receive App Notifications And Engagement Updates](uc-receive-app-notifications-and-engagement-updates.md) - the daily ranking notification and
  the country-badge notification
- [UC - Add BiteTrail Gamification](uc-add-bitetrail-gamification.md) - the unbuilt BiteTrail half, which owns [#770]
- [UC - Manage Profile And Social Graph](uc-manage-profile-and-social-graph.md) - the profile the badges and the contribution count
  are rendered on
- [UC - Use Account And Legal Flows](uc-use-account-and-legal-flows.md) - the deletion cascade that prunes a deleted account from
  both leaderboard documents

[#770]: https://github.com/muhammedgaygisiz/travellers-apps/issues/770
[#954]: https://github.com/muhammedgaygisiz/travellers-apps/issues/954
[#966]: https://github.com/muhammedgaygisiz/travellers-apps/issues/966
[#968]: https://github.com/muhammedgaygisiz/travellers-apps/issues/968
[#971]: https://github.com/muhammedgaygisiz/travellers-apps/issues/971
[#975]: https://github.com/muhammedgaygisiz/travellers-apps/issues/975
[#1212]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1212
[#1611]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1611
[#1741]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1741
[#1837]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1837
[#1797]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1797
[#2027]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2027
[#2028]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2028
