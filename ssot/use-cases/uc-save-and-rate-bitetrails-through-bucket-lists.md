# UC - Save And Rate BiteTrails Through Bucket Lists

## Status

**Level:** L1

Supported today. A free BiteTrail can be taken as a Bucket List, which is created holding
that BiteTrail's Bites; the list is then the shared home component in bucket-list mode,
where a Bite is swiped to mark it tried out and swiped again to undo. The gesture's coach
mark waits until the list actually holds a Bite to anchor on, and never returns once it has
been dismissed.

## Goal

Users can turn curated BiteTrail discovery into a personal Bucket List and rate the experience.

This page owns what a Bucket List is once it exists and what can be done to it - filling it
from a **free** BiteTrail, ticking its Bites off, and rating the BiteTrail it came from.
Finding the BiteTrail beforehand belongs to
[UC - Discover BiteTrails In The Marketplace](uc-discover-bitetrails-in-the-marketplace.md), and the
coach mark that teaches the swipe to
[UC - Guide New Users After Registration](uc-guide-new-users-after-registration.md).

## Actors

- **Bite Creator** - acts: takes a BiteTrail as a Bucket List, ticks its Bites off as they
  are tried, and rates the BiteTrail. No other role behaves differently here.

## Flow

- User opens a BiteTrail.
- User saves the BiteTrail as a Bucket List.
- The app creates a Bucket List with the BiteTrail's Bites.
- User opens the Bucket List and swipes a Bite to tick it off as tried out, or swipes an already ticked Bite to undo it. A first-visit coach mark teaches the gesture.
- User can rate the BiteTrail through Bucket List-related flows.

## MVP Classification

**[MVP]** - taking a BiteTrail as a Bucket List, ticking its Bites off, and rating it. A
BiteTrail that cannot be kept is a page the user reads once, and the Bucket List is the only
thing that turns one into something they carry around.

Not on this page: **paid BiteTrails**. Only a free BiteTrail can be taken as a Bucket
List - `isFree` is `price === 0`, and the footer carrying the button is rendered only when
it holds - so a priced BiteTrail has no route into a Bucket List at all. Whether buying one
should open the same route is an open product question, and it belongs to
[UC - Buy A Paid BiteTrail](uc-buy-a-paid-bitetrail.md) rather than here.

Also not on this page: the coach mark named in `Flow` is one of ten in the first-visit
sequence that [UC - Guide New Users After Registration](uc-guide-new-users-after-registration.md) owns and classifies
`[Secondary]`.

## App Store Review Area

Relevant, because this page can raise the OS location prompt. It renders the shared home
component, whose GPS-error banner offers `enableLocation`: on `prompt` that asks the system
for the location permission, and on `denied` it opens the app's own page in the system
settings instead (`home.service.ts:252`). The purpose strings behind that prompt are
declared once and belong to [UC - Guide New Users After Registration](uc-guide-new-users-after-registration.md), and **Precise
Location** under App Functionality is already declared in
[Implementation - Store Declarations](../implementation/store-declarations.md).

## Supported Evidence

- `my-bucketlists`
- Bucket List detail, edit, rate, and map routes.
- Bucketlist API.
- BiteTrail API.

## Related GitHub Scope

- Issue [#685] added the `Get for free` button on a free BiteTrail detail page, which is the
  entry point `Flow` opens with. Closed as completed.
- Issue [#812] asked for the swipe that checks a Bite off in a Bucket List. Closed as
  completed, delivered by pull request [#1162].
- Issue [#1016] added the first-visit coach marks, the bucket-list swipe among them. Closed
  as completed.
- Pull request [#766] added the `tried out` flow with its bucketlist-scoped metadata, and
  pull request [#757] the one-time BiteTrail rating flow reached from My Bucket Lists.
  Neither names an issue, so the rating flow has no issue behind it in the repository.

## Related Domains

- [Bucket List](../domain/bucket-list.md)
- [Bite Trail](../domain/bite-trail.md)
- [Bite](../domain/bite.md)

## Related Pages

- [Personas](../product/personas.md) - the audiences the `Actors` mapping displaced: the food lover and the
  traveler
- [UC - Discover BiteTrails In The Marketplace](uc-discover-bitetrails-in-the-marketplace.md) - where a BiteTrail is found before it is
  taken
- [UC - Guide New Users After Registration](uc-guide-new-users-after-registration.md) - the coach-mark sequence this page's swipe
  mark belongs to, and the location purpose strings behind the banner's prompt
- [UC - Discover Bites](uc-discover-bites.md) - the shared home component this page renders, and the GPS-error
  banner it carries
- [UC - Inspect Bite Details](uc-inspect-bite-details.md) - a Bite opened from a Bucket List

[#685]: https://github.com/muhammedgaygisiz/travellers-apps/issues/685
[#757]: https://github.com/muhammedgaygisiz/travellers-apps/issues/757
[#766]: https://github.com/muhammedgaygisiz/travellers-apps/issues/766
[#812]: https://github.com/muhammedgaygisiz/travellers-apps/issues/812
[#1016]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1016
[#1162]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1162
