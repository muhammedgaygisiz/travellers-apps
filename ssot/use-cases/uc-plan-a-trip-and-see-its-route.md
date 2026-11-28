# UC - Plan A Trip And See Its Route

## Status

**Level:** L1

Partly built. "My Trips", with create, edit and delete (issue [#2353]), and the trip page
with its Bites (issue [#2354]) are built; the map is not yet. Specified in the product interview of 2026-11-28 as epic [#2351].
A user creates a trip from the home menu, and the trip's page lists the Bites they created
in its date range and shows them on a map as a route.

## Goal

A traveller sees the Bites of one trip together: newest first as a list, and in date order
as a route on a map.

This page owns creating, editing and deleting a trip, and reading its Bites and its route.
What a trip is and which Bites belong to it are rules of the [Trip](../domain/trip.md)
domain. A vlog built on a trip and a BiteTrail packaged from one are later epics, [#2357]
and [#2358].

## Actors

- **Bite Creator** - acts: creates, edits and deletes their own trips, and reads them. No
  other role behaves differently here, and no one else can see a trip.

## Guarantees

Once a trip is saved:

| #   | Guarantee                                                                         |
| --- | --------------------------------------------------------------------------------- |
| G1  | The trip is readable and writable by its owner only.                              |
| G2  | Its page lists exactly the owner's Bites created in its range, newest first.      |
| G3  | Its map numbers those Bites in date order and joins them with one straight route. |
| G4  | Deleting it leaves every Bite in place.                                           |

## Flow

- User opens the home menu and picks "My Trips", next to "My Bucket Lists".
- The list shows the user's trips by start date, newest first, each with its date range, and
  "ongoing" on a trip that has started and not yet ended. With no trips, an empty state
  explains what a trip is and offers to create one.
- User creates a trip with a title, a start date and an optional end date. An empty title,
  or an end date before the start date, is refused with the reason.
- User opens a trip. Its page lists the Bites they created in the range, newest first, with
  an empty state where there are none.
- The trip's map shows one numbered marker per Bite with a position, from 1 for the oldest,
  and a straight line through them in date order. Bites without a position stay in the list
  only. Tapping a marker opens its Bite.
- User renames or re-dates the trip; its Bites follow the new range.
- User deletes the trip after confirming. Its Bites stay.

## Rules And Invariants

| ID      | Normative statement                                                                               |
| ------- | ------------------------------------------------------------------------------------------------- |
| **R-1** | A trip's Bites are computed from its range and never stored, per [Trip](../domain/trip.md).       |
| **R-2** | The list is ordered by start date, newest first; the trip's Bites by `createdAt`, newest first.   |
| **R-3** | The route is drawn in date order, oldest first, as straight lines. No road routing, no animation. |
| **R-4** | Opening another user's trip id shows a not-found state, never that trip.                          |

## Authorization

**Enforced.** The Firestore rules on `/trips/{tripId}` allow read, update and delete by the
owner only, operators included in the refusal, and create only with the caller as owner
(issue [#2352]). The Bites are read under the existing `/bites` rules, filtered to the owner.

**Not enforced.** Nothing in the rules stops the owner reading their own Bites outside a
trip's range; the range is a query, not a permission.

## MVP Classification

**[Secondary]** - the launched app works without trips. Epic [#2351] carries board priority
`P0` because it is the next feature selected for execution, not because launch depended on
it.

## App Store Review Area

Not relevant, because a trip is private to its owner, holds only a title and two dates, and
reads Bites the owner already created. The map shows positions those Bites already store and
asks for no location permission.

## Supported Evidence

- None yet. Nothing is built.

## Related GitHub Scope

- Part of epic [#2351].
- Issue [#2352] - the trip model, rules and the query for its Bites.
- Issue [#2353] - "My Trips" in the home menu, with create, edit and delete.
- Issue [#2354] - the trip page and its Bites.
- Issue [#2355] - the trip map and its route.
- Issue [#2350] - the end-to-end test of the journey.
- Issue [#2356] - the photo's capture date, so a late-posted Bite still lands in its trip.

## Related Domains

- [Trip](../domain/trip.md)
- [Bite](../domain/bite.md)
- [User](../domain/user.md)

## Related Pages

- [UC - Save And Rate BiteTrails Through Bucket Lists](uc-save-and-rate-bitetrails-through-bucket-lists.md), whose pages the trip pages follow.

[#2350]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2350
[#2351]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2351
[#2352]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2352
[#2353]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2353
[#2354]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2354
[#2355]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2355
[#2356]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2356
[#2357]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2357
[#2358]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2358
