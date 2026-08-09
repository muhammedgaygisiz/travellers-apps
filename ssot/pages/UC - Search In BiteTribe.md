# UC - Search In BiteTribe

## Status

Supported today and still expanding.

## Goal

Users can find people, Bites, and restaurants quickly.

## Actors

- Food lover
- Traveler
- Bite creator

## Current Flow

- User opens search.
- User enters search text.
- Search returns users, Bites, and restaurants.
- Search categories help separate result types.
- User can search Bites by city when enriched location data exists.
- User can search Bites by country. Country is picked from a searchable list of every ISO 3166-1 alpha-2 country instead of typed, so the category swaps the free-text searchbar for a picker. Names are localized through `Intl.DisplayNames`, never through Transloco. The query is an exact match on the Bite's persisted `countryCode`.
- Bite, restaurant, city, and country search results can switch between list and map views.
- Backend search becomes a Pro capability through [[epic-1122]]. A free user keeps client-side search and filtering inside the 15 km result set they already loaded. See [[Monetization]].

## Supported Evidence

- `search`
- `searchUsers`
- `searchBites`
- `searchBitesByCity`
- `searchBitesByCountry`
- `searchRestaurants`
- Playwright Bite and Restaurant search E2E smoke coverage.

## Related GitHub Scope

- Issue \#843 covers broader universal search, fuzzy matching, and topic-specific search.
- Issue \#903 adds a list/map switch for location-aware search results.
- Issue 974 adds city search.
- Issue \#722 adds country search.

## Related Domains

- [[Bite]]
- [[User]]
- [[Restaurant]]
