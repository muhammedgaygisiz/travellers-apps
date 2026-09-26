# UC - Manage A Bite's Restaurant Assignment

## Status

**Level:** L1

This page is what `UC-VRC` names as the owner of
`bite.restaurantId`'s writers outside its own verification transaction (`R-8`), tracked,
alongside dismissal and duplicate resolution, under epic [#1495]. `R-8` names four
writers in total: `V23` inside candidate verification, owned by `UC-VRC`; the Bite form,
persisted unconditionally on create and on edit, which sets `bite.restaurantId` when the
Bite Creator picks a verified nearby Restaurant and clears it otherwise - the same write
is `UC-DRC`'s detach mechanism (`E6`); and the Admin App's Candidate-free
`saveNewRestaurant` path, which links the unassigned Bites behind a place name when an
Operator creates a Restaurant from it. The last two are owned by this page. The
Candidate-free writer was dormant until [#1631], because `bitePlacesLoader` discarded the
Bite ids before the write ever saw them.

## Goal

A Bite's `restaurantId` stays exactly what its own Bite Creator currently attributes it
to, without needing an Operator, for every Bite outside an active `UC-VRC` verification;
and a Restaurant an Operator creates from a bare place name owns the unassigned Bites
that carried that name, without the Operator re-saving each one.

## Actors

- **Bite Creator** - the Bite form's `restaurantId` control.
- **Operator** - the Admin App's Bite-places list and the new-restaurant form it opens.

## Flow

- The Bite Creator opens the Bite form to create or edit a Bite of their own.
- Picking a verified nearby Restaurant sets `bite.restaurantId`; picking anything else,
  or clearing the field, clears it instead - detaching the Bite (`UC-DRC` `E6`) and
  returning it to the unverified pool.
- The whole form value is persisted unconditionally, overwriting whatever the field held
  before, including a value verification or an Operator set.

### Operator: create a Restaurant from a bare place name

- The Operator opens **Bite places**. It reads up to `BITE_PLACES_LIMIT` (ten) Bites with
  an empty `restaurantId` and lists each distinct `place` among them, with the ids of the
  Bites that carry it.
- Picking a place opens the new-restaurant form seeded with its name and those Bite ids,
  and no `restaurantCandidateId`.
- Saving creates the Restaurant and its Menu, then links each listed Bite by writing its
  `restaurantId`.
- A listed Bite that already carries a non-empty `restaurantId` (of any shape, bare id or
  document path) by the time the write runs is left untouched, the rule `UC-VRC` `R-20`
  holds for `V23`. A listed Bite deleted in the meantime is skipped too. Each Bite is read
  and then written, not in one transaction, so the window is the gap between those two
  calls rather than the time the list was open.
- Only the Bites the list read are linked. A place carried by more unassigned Bites than
  that read reached keeps the rest unassigned; they reappear in the list after the save.

## MVP Classification

**[MVP]** - this writer is what makes `bite.restaurantId` mean anything for any Bite
that has never gone through candidate verification, and it already ships in
production.

## App Store Review Area

Not relevant, because nothing here requests a permission or changes a store declaration.
Picking a restaurant reads the nearby-restaurant list the Bite form already loaded; the
location permission behind that list belongs to [UC - Create And Maintain Personal Bites](uc-create-and-maintain-personal-bites.md).

## Supported Evidence

- `onRestaurantSelected` and `onGooglePlaceSelected` in `libs/bite-tribe/bite/page/src/lib/components/page/bite.page.ts` - the Bite form's writer of `bite.restaurantId`, setting it for a verified nearby Restaurant and clearing it for anything else.
- `bitePlacesLoader` in `libs/bite-tribe-admin/restaurants/data-access/src/lib/restaurants-data-access.service.ts` - the place names with the Bite ids behind each; `placeClicked` in `libs/bite-tribe-admin/restaurants/page/src/lib/integration/restaurants.service.ts` carries them into the draft.
- `saveNewRestaurant` and `linkBite` in `libs/bite-tribe/api/src/lib/restaurant-api/restaurant-api.service.ts` - the Candidate-free writer and its skip-if-already-assigned guard, covered by `restaurant-api.service.spec.ts`.

## Related GitHub Scope

- Part of epic [#1495]
- [#1631] - reactivated the Admin App's Candidate-free writer, with the `R-20` guard.

## Related Domains

- [Bite](../domain/bite.md)
- [Restaurant](../domain/restaurant.md)

[#1495]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1495
[#1631]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1631
