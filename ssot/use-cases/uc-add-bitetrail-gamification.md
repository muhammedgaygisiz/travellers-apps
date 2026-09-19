# UC - Add BiteTrail Gamification

## Status

**Level:** L1

Next to implement, and not built for BiteTrails specifically: no badge, no contest, and
nothing that reads a BiteTrail's completion rather than a generic Bucket List's. What this
would build on already ships - the Bucket List's tried-out tracking, and the Bite-level
leaderboard, badge and notification pattern in
[UC - Use Gamification Signals](uc-use-gamification-signals.md). Issue [#770] owns the work.

## Goal

Completing BiteTrails should create visible progress and reward moments.

## Actors

- **Bite Creator** — acts: takes a BiteTrail as a Bucket List, completes its Bites, and sees the resulting progress and reward signals.

## Flow

- User takes a BiteTrail as a Bucket List and ticks off its Bites as tried out - the
  mechanism [UC - Save And Rate BiteTrails Through Bucket Lists](uc-save-and-rate-bitetrails-through-bucket-lists.md) already owns, and the
  progress signal this page would read.
- The app shows how much of the trail is done, drawn from the Bucket List's tried-out count
  against the BiteTrail's Bite count - the same fraction `ProgressPipe` already computes for
  any Bucket List, but not yet scoped to one that came from a BiteTrail.
- Finishing every Bite in a trail earns a completion badge - the BiteTrail analogue of the
  country badge [UC - Use Gamification Signals](uc-use-gamification-signals.md) already ships for a first Bite in a new
  country.
- A recurring contest ranks completions over a period - the BiteTrail analogue of the
  leaderboard that already ranks Bite counts.

## MVP Classification

**[Secondary]**

## App Store Review Area

Not relevant, because nothing here is a permission, a store declaration or a review
surface. A completion notification, if the contest sends one, is
[UC - Receive App Notifications And Engagement Updates](uc-receive-app-notifications-and-engagement-updates.md)'s, the same way the
country-badge notification is [UC - Use Gamification Signals](uc-use-gamification-signals.md)'s own.

## Supported Evidence

Not implemented for BiteTrails specifically - no badge, no contest, and nothing that reads a
BiteTrail's completion rather than a generic Bucket List's. What exists to build on:

- `libs/bite-tribe/bucketlist/page/src/lib/pipes/progress.pipe.ts`, the `ProgressPipe`
  rendered on `bucketlists.page.html`, computes `triedOutBites.length / biteIds.length` for
  any Bucket List - the fraction a BiteTrail's completion would read, but not scoped to a
  Bucket List's optional `biteTrailId` and carrying no badge or reward of its own
- The Bite-level pattern this page would extend: `/meta/leaderboard`,
  `incrementBiteCountOnBiteCreate` and `notifyOnNewCountryBadge`, all built for
  [UC - Use Gamification Signals](uc-use-gamification-signals.md) and named there as the closest existing count-driven badge
  and notification

## Related GitHub Scope

- Issue [#770]

## Related Domains

- [Bite Trail](../domain/bite-trail.md)
- [Bucket List](../domain/bucket-list.md)
- [User](../domain/user.md)

## Related Pages

- [UC - Save And Rate BiteTrails Through Bucket Lists](uc-save-and-rate-bitetrails-through-bucket-lists.md) - the Bucket List and
  tried-out mechanism this page's progress and completion badge read
- [UC - Use Gamification Signals](uc-use-gamification-signals.md) - the Bite-level leaderboard, badge and notification
  pattern this page extends to BiteTrails
- [UC - Receive App Notifications And Engagement Updates](uc-receive-app-notifications-and-engagement-updates.md) - where a completion or contest
  notification would be classified

[#770]: https://github.com/muhammedgaygisiz/travellers-apps/issues/770
