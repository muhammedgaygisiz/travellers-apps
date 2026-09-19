# UC - Search In BiteTribe

## Status

**Level:** L1
Supported today. Search across accounts, Bites and restaurants ships, with category separation,
city and country search, the list/map switch, and infinite-scroll paging. What is specified and
not built is the Pro gating of backend search; the broader fuzzy, typo-tolerant search is a
separate page, [UC - Complete Universal Search](uc-complete-universal-search.md).

## Goal

Anyone can find a person, a Bite or a restaurant by name, and can narrow to a city or a country
without knowing where they are standing. This page owns what search matches, how results are
categorised and paged, and the two views they can be read in.

## Actors

- **Bite Creator** - searches, switches category, picks a country from the list, and reads the
  results as a list or on a map.
- **BiteTribe Operator** - does not search here, but is named because the admin app's Bite
  lookup calls the same `searchBites` callable. Neither its ranking nor its matching may be
  changed for an operator's benefit.

## Flow

- User opens search.
- User enters search text.
- Search returns users, Bites, and restaurants.
- Search categories help separate result types.
- User can search Bites by city when enriched location data exists.
- User can search Bites by country. Country is picked from a searchable list of every ISO 3166-1 alpha-2 country instead of typed, so the category swaps the free-text searchbar for a picker. Names are localized through `Intl.DisplayNames`, never through Transloco. The query is an exact match on the Bite's persisted `countryCode`.
- The result list pages in through infinite scroll, the same window the home feed and profile use. A country returns every one of its Bites in a single response, so rendering the whole set at once would request every result image at once. The map view still plots the complete result set.
- Bite, restaurant, city, and country search results can switch between list and map views.
- The map view runs the page full width, so on desktop the map is not held to the 720px reading column the result list uses. The controls above it keep that column.
- Bite markers carry their rating, the same marker the Bite gets on every other map. An unrated Bite keeps the plain pin, and restaurants have no rating of their own.
- `searchUsers` and `searchBites` have a second caller. The admin app's Bite lookup calls `searchBites` directly, and its account search deliberately does **not** call `searchUsers` — it filters the admin-only `listUsersWithRoles` instead, so an operator sees private profiles without the consumer-facing public-flag filter being relaxed for anyone. Neither the ranking nor the matching of these callables may be changed for an operator's benefit; see [UC - Operate BiteTribe In The Admin App](uc-operate-bitetribe-in-the-admin-app.md) (issue [#1476]).
- Backend search becomes a Pro capability through [epic-1122][#1122]. A free user keeps client-side search and filtering inside the 15 km result set they already loaded. See [Monetization](../product/monetization.md).

## MVP Classification

**[MVP]** - search across accounts, Bites and restaurants, the category separation, city and
country search, and the list/map switch. Finding a Bite is half of the discovery loop.

**[Secondary]** - the Pro gating of backend search, specified under [epic-1122][#1122] and not built.
A free user would keep client-side search inside the result set already loaded. See
[Monetization](../product/monetization.md).

## App Store Review Area

Not relevant, because search exercises no permission and introduces no declared data type. The
location permission that decides which Bites are loaded in the first place belongs to
[UC - Discover Bites](uc-discover-bites.md), and the map rendering to the Google Maps Platform boundary in
[Architecture - Firebase](../architecture/firebase.md).

## Supported Evidence

- `search`
- `searchUsers`
- `searchBites`
- `searchBitesByCity`
- `searchBitesByCountry`
- `searchRestaurants`
- Playwright Bite and Restaurant search E2E smoke coverage.

## Related GitHub Scope

- Part of [#790], the open search epic.
- Issue [#843] - the closed epic that delivered the search this page describes.
- Issue [#903] adds a list/map switch for location-aware search results.
- Issue [#973] adds city search, delivered by pull request [#974].
- Issue [#722] adds country search.
- Issue [#1476] reuses `searchBites` for the admin app's operator lookup without changing it.

## Related Domains

- [Bite](../domain/bite.md)
- [User](../domain/user.md)
- [Restaurant](../domain/restaurant.md)

## Related Pages

- [Personas](../product/personas.md) - the audiences the `Actors` mapping displaced: the food lover, the traveler and
  the Bite creator
- [UC - Complete Universal Search](uc-complete-universal-search.md) - the unbuilt search this one would become or sit beside;
  which of the two it is has not been decided
- [UC - Operate BiteTribe In The Admin App](uc-operate-bitetribe-in-the-admin-app.md) - the second caller of `searchBites`, and why the
  account search deliberately does not reuse `searchUsers`
- [UC - Discover Bites](uc-discover-bites.md) - the loaded result set a free user searches inside
- [Monetization](../product/monetization.md)
- [epic-1122][#1122]

[#722]: https://github.com/muhammedgaygisiz/travellers-apps/issues/722
[#790]: https://github.com/muhammedgaygisiz/travellers-apps/issues/790
[#843]: https://github.com/muhammedgaygisiz/travellers-apps/issues/843
[#903]: https://github.com/muhammedgaygisiz/travellers-apps/issues/903
[#973]: https://github.com/muhammedgaygisiz/travellers-apps/issues/973
[#974]: https://github.com/muhammedgaygisiz/travellers-apps/issues/974
[#1122]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1122
[#1476]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1476
