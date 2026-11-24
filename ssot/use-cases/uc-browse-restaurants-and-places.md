# UC - Browse Restaurants And Places

## Status

**Level:** L1

Supported today. A Bite leads to a verified restaurant page or an unverified place page;
both render the ratings, tags and context derived from Bites, and the verified page
resolves to a menu when the restaurant carries one. The page is either loading or loaded
and offers no action until it is loaded - the contract below says why and what that costs
if it is broken.

## Goal

Users can understand the place or restaurant context around a Bite.

This page owns what the restaurant and place pages show and in what order they are allowed
to show it. What a menu itself contains belongs to [UC - View Restaurant Menus](uc-view-restaurant-menus.md), and the
selector that attaches a place to a Bite in the first place to
[UC - Create And Maintain Personal Bites](uc-create-and-maintain-personal-bites.md).

## Actors

- **Bite Creator** - acts: opens a restaurant or place page from a Bite, reads its context,
  and follows it on to the menu or to the Bites recorded there. Nothing on these pages
  behaves differently for any other role - the consumer app reads no ownership or role
  claim here.

## Flow

- User navigates from a Bite to a verified Restaurant or unverified place page.
- During Bite creation, user selects a nearby verified restaurant, unverified restaurant, Google Place, or explicit custom place through the selector before saving.
- User can inspect restaurant-related Bites by following the rating count on either page.
- Restaurant pages can show ratings derived from Bites, tags, menu entry points, and verification distinctions.

## Restaurant Page State Contract

Issue [#1381]
gave the verified restaurant page the loading treatment issue [#1382] gave the
menu page; issue [#2124] later added the terminal state it had left out. Before it,
the page rendered its final layout immediately and filled in as the reads
landed, so a restaurant that had not loaded yet was indistinguishable
from one whose optional fields are genuinely empty, and its actions were on
screen before the state backing them existed.

- The page is loading, loaded, or not found. While the restaurant document or
  the route's Bites have not arrived it renders skeletons tracing its own
  shape (the header photo, the name and distance, the rating line, the
  description and links, the tags, the opening-hours rows, the address and the
  map), and the header runs the loading bar with them, per [Implementation - Feature Patterns](../implementation/feature-patterns.md).
  It waits for the Bites too because the rating, the Bite count and the tags
  are derived from them; waiting for the document alone let those parts appear
  after the skeleton had gone (issue [#2124]). Only a first load of the Bites
  counts: a reload from the Bites list keeps the page as it is.
- A restaurant id that resolves to no document, or whose read fails, ends in a
  not-found state with a "Back to the Bite" button, instead of a skeleton that
  never resolves (issue [#2124]). The store records that id
  (`notFoundRestaurantId`), so another restaurant's answer never ends this
  page's wait, and the page reads only the route's own restaurant, so B's page
  never shows A's data.
- The empty states ("no description available", "no social media links", "no
  ratings yet") belong to a restaurant that loaded and really has those fields
  empty. They can no longer be reached while the read is in flight.
- No action is offered while loading. Every button on this page acts on the
  restaurant, and the menu button in particular dead-ends without it: the tap
  either did nothing, or fell through to `gotoDynamicMenu`, which routes by
  place name and lands on the empty-menu page for a restaurant that does have a
  menu.
- The menu button is rendered only for a loaded restaurant that carries a menu
  id, so the menu entry point always resolves to the id-based menu route. A
  restaurant with no menu offers no button rather than one that reports the
  menu as absent.
- The rating count is the entry point to the Bites recorded at the place, on
  the restaurant page and the place page alike. It links whenever the place has
  Bites, rated or not, so "no ratings yet" still leads to Bites that carry no
  rating. It is plain text only when there are no Bites.
- The menu button sits under the description and links, above the tags, so it
  is reachable without scrolling past the opening hours and the map.
- The kind of venue the restaurant has stated shows under its name, in a muted
  line such as "Restaurant · Street food" (issue [#2131]). A restaurant that
  has not said shows nothing, and an unknown value is dropped.
- What the restaurant states about its whole kitchen shows under the category
  line (issue [#2194]): its dietary statements, such as "Fully halal", its
  cross-contamination note, and "Declared by the restaurant". A restaurant
  that has said neither shows nothing.
- A facility the restaurant has stated shows as one line with an icon, under
  the opening hours (issue [#1830]): "Gender-neutral restroom" for yes, "No
  gender-neutral restroom" for no. A restaurant that has not said shows
  nothing, because an absent value is never read as no. The line belongs to
  the loaded page, so it cannot appear before the restaurant has.
- A signed-in guest can follow the restaurant from the right end of the
  rating line (issue [#2132]): an outline "Follow" button that turns into a
  filled "Following" and back. The button shows the new state at once; a
  write that is refused puts the old state back with a toast. It appears only
  once it is known whether the guest already follows, so it never says
  "Follow" to somebody who does. A place known only from its Bites, the place
  page, has no button: only a stored restaurant can be followed. What a
  follower receives is [#2318].

## Place Page State Contract

Issue [#2125] gave the unverified place page the same three states. Before
it, the "not verified" banner rendered at once beside an empty name, rating
and Bite count, and a place whose Bite was gone kept that empty page for good.

- The page is loading, loaded, or not found. While the route's Bites have not
  arrived, or no Bite names the place yet, it renders a skeleton of the
  banner, the name, the rating line, the distance and the map.
- Under the banner, one line says what "not verified" means for the guest:
  the name and location come from the Bites shared there, and BiteTribe has
  not checked them. A place is never supplied by a restaurant; it becomes one
  only when a BiteTribe operator verifies a candidate (see the
  [Glossary](../product/glossary.md)).
- When the Bites have loaded and neither they nor the store hold the Bite the
  page was opened from, the place has no name, position or rating to show. It
  ends in a not-found state with "Back to your feed", not "Back to the Bite",
  because that Bite is what could not be found.

## MVP Classification

**[MVP]** - the whole page. A Bite that cannot be followed to the place it was eaten is a
photo with a price on it, so the restaurant and place pages are part of what a Bite means
rather than an addition to it.

## App Store Review Area

Not relevant, because nothing here requests a permission or changes a store declaration.
The distance these pages show is computed in the store, `haversineDistance` against the
app-level GPS position that [UC - Discover Bites](uc-discover-bites.md) and onboarding obtain; this page reads
that position and never asks for one. It would become relevant if a restaurant page began
requesting a live position of its own, or if the place data it renders started coming from
a source [Implementation - Store Declarations](../implementation/store-declarations.md) does not cover.

## Supported Evidence

- Restaurant/place routes.
- Restaurant API.
- Restaurant page components.
- Shared restaurant selector.
- `searchNearbyPlaces`
- Restaurant Bites route.
- Playwright coverage for Restaurant search, verified and unverified place
  context, aggregate ratings and tags, associated Bites, and empty results.

## Related GitHub Scope

- Epic [#734], the `User wants to see a menu of a restaurant` epic, covered richer restaurant
  menu and restaurant page behaviour. Closed as completed - it is delivered, not planned.
- Issue [#1381] owns the state contract above. Closed as completed.
- Issue [#1696] made the Menu label readable in light mode, where it had been drawn in fixed white on a transparent button, moved the menu button above the tags, and replaced the Bites button on both pages with the rating count as a link.

- Issue [#1830] added the facility line to the restaurant page. Part of epic [#1823].
- Issue [#2131] added the category line under the restaurant's name. Part of epic [#2123].
- Issue [#2194] added the restaurant's dietary statements under it. Part of epic [#2193].
- Issue [#2132] added following a restaurant, without notifications, which are
  [#2318]. Part of [#2123].
- Issue [#2124] made the page wait for its Bites as well as its document, and
  gave it the not-found state. Part of [#2123].
- Issue [#2125] gave the unverified place page its loading and not-found
  states and the one-line explainer. Part of [#2123].

## Related Domains

- [Restaurant](../domain/restaurant.md)
- [Bite](../domain/bite.md)

## Related Pages

- [Personas](../product/personas.md) - the audiences the `Actors` mapping displaced: the food lover, the traveler,
  and the restaurant owner or business maintainer
- [UC - View Restaurant Menus](uc-view-restaurant-menus.md) - the menu this page's button resolves to, and its own
  loading and failed states
- [UC - Create And Maintain Personal Bites](uc-create-and-maintain-personal-bites.md) - the restaurant and place selector named in
  `Flow`, and the Bites these pages aggregate
- [UC - Inspect Bite Details](uc-inspect-bite-details.md) - the Bite a visit to these pages starts from
- [Implementation - Feature Patterns](../implementation/feature-patterns.md) - the loading-bar pattern the header follows

[#734]: https://github.com/muhammedgaygisiz/travellers-apps/issues/734
[#1381]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1381
[#1382]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1382
[#1696]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1696
[#1823]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1823
[#2123]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2123
[#2124]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2124
[#2125]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2125
[#1830]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1830
[#2131]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2131
[#2193]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2193
[#2194]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2194
[#2132]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2132
[#2318]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2318
