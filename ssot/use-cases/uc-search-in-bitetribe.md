# UC - Search In BiteTribe

## Status

**Level:** L1
Supported today. Search ships in three categories - Users, Bites and Country - with the list/map
switch and infinite-scroll paging. Bites search matches a Bite's name, restaurant, city, tags and
description ([#2026]). What is specified and
not built is the Pro gating of backend search; the broader fuzzy, typo-tolerant search is a
separate page, [UC - Complete Universal Search](uc-complete-universal-search.md).

## Goal

Anyone can find a person by name, a Bite by any of the words that describe it - including its
restaurant and its city - and every Bite of a country, without knowing where they are standing. This page owns what search matches, how results are
categorised and paged, and the two views they can be read in.

## Actors

- **Bite Creator** - searches, switches category, picks a country from the list, and reads the
  results as a list or on a map.
- **BiteTribe Operator** - does not search here, but is named because the admin app's Bite
  lookup calls the same `searchBites` callable. Neither its ranking nor its matching may be
  changed for an operator's benefit.

## Flow

- User opens search.
- User enters search text. Free-text search starts at two characters, in every language: a kanji name is often two characters long, and a higher minimum made those names unsearchable ([#1882]). `searchPlaces` follows the same minimum.
- Matching folds spellings a person treats as the same word, on the query and the stored value alike: hiragana, katakana and half-width kana, and full-width and half-width Latin. `らーめん`, `ラーメン` and `ﾗｰﾒﾝ` find each other. Kanji spellings do not, so `拉麺` does not match `ラーメン`, because that takes a dictionary rather than a character mapping. This is `foldSearchText` in `shared/utils/fold-search-text.ts`, used by `searchUsers` and `searchBites`.
- Search has three categories: Users, Bites and Country. Each returns one result type, and none of them returns restaurants.
- Bites search matches the search text against the Bite's `name`, `place` (the restaurant as written on the Bite), `city`, each of its `tags`, and its `description`. It does not match `country` text: the Country category is that search. Visibility and blocked accounts are part of the match, before the 20-result cap ([#2026]).
- A Bite matches by city only once its address is enriched. `city` is the reverse geocode's name in Google's default language, so `Köln` does not find a Bite stored as `Cologne`.
- A restaurant is reached through one of its Bites: searching its name returns its Bites, and the Bite page links to the restaurant. Search no longer opens a restaurant page directly ([#2026]).
- User can search Bites by country. Country is picked from a searchable list of every ISO 3166-1 alpha-2 country instead of typed, so the category swaps the free-text searchbar for a picker. Names are localized through `Intl.DisplayNames`, never through Transloco. The query is an exact match on the Bite's persisted `countryCode`.
- The result list pages in through infinite scroll, the same window the home feed and profile use. A country returns every one of its Bites in a single response, so rendering the whole set at once would request every result image at once. The map view still plots the complete result set.
- Bites and Country results can switch between list and map views.
- The map view runs the page full width, so on desktop the map is not held to the 720px reading column the result list uses. The controls above it keep that column.
- Bite markers carry their rating, the same marker the Bite gets on every other map. An unrated Bite keeps the plain pin.
- `searchUsers` and `searchBites` have a second caller. The admin app's Bite lookup calls `searchBites` directly, and its account search deliberately does **not** call `searchUsers` — it filters the admin-only `listUsersWithRoles` instead, so an operator sees private profiles without the consumer-facing public-flag filter being relaxed for anyone. Neither the ranking nor the matching of these callables may be changed for an operator's benefit; see [UC - Operate BiteTribe In The Admin App](uc-operate-bitetribe-in-the-admin-app.md) (issue [#1476]).
- Backend search becomes a Pro capability through [epic-1122][#1122]. A free user keeps client-side search and filtering inside the 15 km result set they already loaded. See [Monetization](../product/monetization.md).

## MVP Classification

**[MVP]** - search across accounts and Bites, the three categories, Bites search over name,
restaurant, city, tags and description, country search, and the list/map switch. Finding a Bite is half of the discovery loop.

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
- `searchBitesByCountry`
- Playwright Bite search E2E smoke coverage, including a match on the restaurant name.
- `searchBitesByCity` and `searchRestaurants` stay deployed for app builds released before [#2026], which still call them. No current client does.

## Related GitHub Scope

- Part of epic [#790], the open search epic.
- Epic [#843] - the closed epic that delivered the search this page describes.
- Issue [#903] adds a list/map switch for location-aware search results.
- Issue [#973] adds city search, delivered by pull request [#974].
- Issue [#722] adds country search.
- Issue [#1476] reuses `searchBites` for the admin app's operator lookup without changing it.
- Issue [#1882] lowers the minimum to two characters and folds kana and width.
- Issue [#2026] folds the Restaurant and City categories into Bites search.

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
[#1882]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1882
[#2026]: https://github.com/muhammedgaygisiz/travellers-apps/issues/2026
