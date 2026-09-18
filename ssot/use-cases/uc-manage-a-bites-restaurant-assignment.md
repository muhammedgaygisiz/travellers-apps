# UC - Manage A Bite's Restaurant Assignment

## Status

**Level:** L1

No page exists yet; `UC-VRC` names this page (renamed from `UC-ARB`) as the owner of
`bite.restaurantId`'s writers outside its own verification transaction (`R-8`), tracked,
alongside dismissal and duplicate resolution, under epic [#1495]. `R-8` names four
writers in total: `V23` inside candidate verification, owned by `UC-VRC`; the Bite form,
persisted unconditionally on create and on edit, which sets `bite.restaurantId` when the
Bite Creator picks a verified nearby Restaurant and clears it otherwise - the same write
is `UC-DRC`'s detach mechanism (`E6`) - and is this page's only implemented writer; and
the Admin App's Candidate-free `saveNewRestaurant` path, also owned by this page,
dormant because its data source (`bitePlacesLoader`) discards Bite ids before the write
ever sees them.

## Goal

A Bite's `restaurantId` stays exactly what its own Bite Creator currently attributes it
to, without needing an Operator, for every Bite outside an active `UC-VRC` verification.

## Actors

- **Bite Creator** - the only actor; the Bite form's `restaurantId` control is the one
  implemented writer this page owns (see Status).

## Flow

- The Bite Creator opens the Bite form to create or edit a Bite of their own.
- Picking a verified nearby Restaurant sets `bite.restaurantId`; picking anything else,
  or clearing the field, clears it instead - detaching the Bite (`UC-DRC` `E6`) and
  returning it to the unverified pool.
- The whole form value is persisted unconditionally, overwriting whatever the field held
  before, including a value verification or an Operator set.

## MVP Classification

**[MVP]** - this writer is what makes `bite.restaurantId` mean anything for any Bite
that has never gone through candidate verification, and it already ships in
production.

## App Store Review Area

Not relevant, because nothing here requests a permission or changes a store declaration.
Picking a restaurant reads the nearby-restaurant list the Bite form already loaded; the
location permission behind that list belongs to [UC - Create And Maintain Personal Bites](uc-create-and-maintain-personal-bites.md).

## Supported Evidence

- `onRestaurantSelected` and `onGooglePlaceSelected` in `libs/bite-tribe/bite/page/src/lib/components/page/bite.page.ts` - the Bite form's only implemented writer of `bite.restaurantId`, setting it for a verified nearby Restaurant and clearing it for anything else.

## Related GitHub Scope

- Part of epic [#1495]
- [#1631] - reactivating the Admin App's dormant Candidate-free writer - see Status.

## Related Domains

- [Bite](../domain/bite.md)
- [Restaurant](../domain/restaurant.md)

[#1495]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1495
[#1631]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1631
