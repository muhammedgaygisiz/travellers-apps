# Trip

## Purpose

A Trip is a named date range in a user's own travel, such as "Southeast Asia 2026/2027".

It groups the Bites the user created during that range, so they can be read together, in order, and on a map.

## Why It Exists

The goal of a Trip is to help a user answer:

> What did I eat on that trip, and where?

Bites are created one at a time, wherever the user is. A Trip is the user's own frame around a stretch of them, and the base that a vlog and a BiteTrail from a trip build on later. See epic [#2351].

## Business Rules

- A Trip belongs to one user, its owner.
- A Trip is private to its owner. No other user can read it, it is not shown on any profile, and it has no share link.
- A Trip has a title, a start date and an optional end date. Dates are calendar days.
- The end date, when present, is not before the start date.
- **A Trip's Bites are computed, never stored.** They are the owner's Bites whose `createdAt` falls between the start of the start date and the end of the end date, in the device's time zone. A Trip keeps no list of Bite ids.
- Editing a Trip's dates changes its Bites. A Bite created later inside the range joins the Trip on its own.
- A single Bite cannot be left out of a Trip.
- **A Trip without an end date, or with an end date later than today, is ongoing.** It has no upper bound until an end date is set.
- Trips may overlap. A Bite inside two ranges belongs to both Trips.
- Only the owner's own Bites belong to a Trip. A Bite whose photo is not uploaded still belongs to it, because its creator sees it on every surface (see [Bite](bite.md)).
- `createdAt` is when a Bite was posted, not when the dish was eaten. A Bite posted after the trip, for example from the gallery, falls outside the range. Issue [#2356] would add the photo's capture date to close that gap.
- Deleting a Trip deletes the Trip, never its Bites.
- Deleting an account deletes its Trips.

## Required Data

Model fields:

| Field      | Name in code | Description                             |
| ---------- | ------------ | --------------------------------------- |
| Trip id    | `id`         | Unique Trip identifier.                 |
| Owner      | `userId`     | User who owns the Trip.                 |
| Title      | `title`      | User-visible name, at most 100 chars.   |
| Start date | `startDate`  | First day of the Trip, as `YYYY-MM-DD`. |

## Optional Data

- `endDate`, as `YYYY-MM-DD`. Absent while the Trip is ongoing.
- `createdAt`
- `createdAtTimestamp`
- `updatedAt`
- `updatedAtTimestamp`

## Relationships

- **User** — the owner.
- **Bites** — the owner's Bites created in the date range, computed by query.

## Lifecycle

- Created with a title, a start date and an optional end date.
- Bites in the range appear on it as the owner creates them.
- Renamed or re-dated, which changes its Bites.
- Deleted, leaving its Bites in place.

## Permissions

- Guest
  - None.
- Registered user
  - Create, rename, re-date and delete own Trips.
  - Read own Trips and their Bites.
  - No access to anyone else's Trips.
- Admin
  - No specific Trip admin permissions are modeled.

## Use Cases

- [UC - Plan A Trip And See Its Route](../use-cases/uc-plan-a-trip-and-see-its-route.md)

## Related Epics

- Epic [#2351] — trips, their Bites and their route. Planned.
- Epic [#2357] — a vlog built on a trip. Not specified yet.
- Epic [#2358] — a BiteTrail packaged from a trip. Not specified yet.

## Technical Implementation

The data layer is built (issue [#2352]); the pages are not yet ([#2353], [#2354], [#2355]).

- **Model**: `Trip` and `TripDraft` in `libs/bite-tribe-common/model/src/lib/trip.ts`. `tripBiteRange` turns the dates into the `createdAtTimestamp` range, from the first millisecond of the start date to the last of the end date in the device's time zone, with no upper bound while the end date is empty.
- **Firestore**: `/trips/{tripId}`. `firestore.rules` admits a member to read, update and delete only a trip whose `userId` is their own, and to create one only with their own `userId`. No other account reads a trip, operators included, unlike `/bucketlists`, which any member can read. A write must keep to the trip's fields, carry a title of 1 to 100 characters and `YYYY-MM-DD` dates, and an end date not before the start date.
- **A trip's Bites** are read from `/bites` on the trip's `userId` and the `createdAtTimestamp` range, newest first, served by the existing `bites` index on `userId` ascending and `createdAtTimestamp` descending.
- **API**: `TripApiService` in `libs/bite-tribe/api`. An edit replaces the whole document, so an end date that was cleared is removed. Failures reach the caller rather than being swallowed.
- **Store**: the `trips` slice in `libs/bite-tribe/store`, with each trip's Bites kept beside the trips rather than on them, exposed through `BiteTribeStoreService`. Every write reports success or failure as its own action.
- **Account deletion**: `deleteOwnAccount` deletes the account's trips (`deletedTrips` on the deletion job).

## Current Limitations

- A Trip uses the posting date, not the eaten date ([#2356]).
- A single Bite cannot be excluded.
- Trips cannot be shared.

## Future Ideas

- Leaving a single Bite out of a Trip.
- A timeline or day-by-day view.
- Trip statistics, such as countries, dishes or distance.

## Sources Used

- Product interview of 2026-11-28, recorded on epic [#2351].
- [Bite](bite.md)
- [Bucket List](bucket-list.md)

[#2351]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2351
[#2352]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2352
[#2353]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2353
[#2354]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2354
[#2355]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2355
[#2356]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2356
[#2357]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2357
[#2358]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2358
