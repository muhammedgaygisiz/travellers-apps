# UC - Use Gamification Signals

## Status

**Level:** L0.
Supported today. The leaderboard and its persisted `/meta/leaderboard` document, the bite counts
behind it, the daily ranking notification and the country badges all ship. What is still ahead
is BiteTrail gamification, which is [[UC - Add BiteTrail Gamification]]'s rather than this
page's.

## Goal

Someone who contributes sees that it counted - a rank, a count on their profile, a badge for a
country they are the first to record. This page owns which signals exist and what each is
computed from; what a notification about one of them says, and to whom, belongs to
[[UC - Receive App Notifications And Engagement Updates]].

## Actors

- **Bite Creator** - opens the leaderboard, earns the badges, and is ranked by the count of
  Bites it created.

## Flow

- User opens the leaderboard.
- Backend functions maintain Bite counts.
- Leaderboard displays users by contribution signals.
- Leaderboard rank and profile contribution display are persisted.
- Profile badges show lightweight contribution recognition.
- Ranking-change notifications can nudge users when their position changes.
- A first Bite in a new country earns a country badge, which congratulates the
  user and, for a public profile, is announced to their followers.

## MVP Classification

**[Secondary]** - the whole page. Every signal here is motivation rather than function: the app
records and discovers food without a leaderboard, a rank or a badge, and nothing else depends on
them.

## App Store Review Area

Not relevant, because nothing here is a permission, a store declaration or a review
surface. The notifications these signals trigger are
[[UC - Receive App Notifications And Engagement Updates]]'s, and the permission behind
them is collected in onboarding.

## Supported Evidence

- `leaderboard`
- `loadLeaderboard`
- `incrementBiteCountOnBiteCreate`
- `resyncBiteCounts`
- `sendDailyLeaderboardNotification`
- Profile country badges
- `notifyOnNewCountryBadge`

## Related GitHub Scope

- Issue \#966 resyncs the per-user bite count and the aggregate weekly.
- Issue \#968 persisted the leaderboard as the `/meta/leaderboard` document. That document
  caches an entry per ranked account; \#1611 removes the email address from it, which any
  signed-in account can read today.
- Issue \#954 added the ranking notifications, delivered by pull request \#971.
- Issue \#975 added the country badges; \#1212 turned a new badge into a notification for the
  user and their followers, and that contract lives in
  [[UC - Receive App Notifications And Engagement Updates]].
- Issue \#770 is the **BiteTrail** gamification epic and is owned by
  [[UC - Add BiteTrail Gamification]], not by this page.

## Related Domains

- [[User]]
- [[Bite]]
- [[Bite Trail]]

## Related Pages

- [[Personas]] - the audiences the `Actors` mapping displaced: the Bite creator and the food
  lover
- [[UC - Receive App Notifications And Engagement Updates]] - the daily ranking notification and
  the country-badge notification
- [[UC - Add BiteTrail Gamification]] - the unbuilt BiteTrail half, which owns \#770
- [[UC - Manage Profile And Social Graph]] - the profile the badges and the contribution count
  are rendered on
- [[UC - Use Account And Legal Flows]] - the deletion cascade that prunes a deleted account from
  both leaderboard documents
