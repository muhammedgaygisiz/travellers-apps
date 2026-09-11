# UC - Discover Bites

## Status

**Level:** L0.
Supported today. The feed, its map view, search and filter, and the location-bounded
loading with its timeouts and error separation all ship. The Pro widening of the radius is
specified but not built, [[epic-1122]].

## Goal

Any account can discover real dishes nearby or in a broader feed before deciding what to
eat. This page owns the home feed, its map view, and the location-based loading behind
them.

## Actors

- **Bite Creator** — browses the feed and the map, searches and filters, and is the
  account whose position bounds what the feed loads.

## Flow

- User opens the home feed.
- User browses Bites.
- User can switch to map view.
- Map zoom controls and zoom gestures are available to every user regardless of subscription tier.
- User can filter or search within the feed.
- An empty feed and an empty search result are two different states and never share their copy. `No bites found. Be the first one.` invites a first Bite and is only correct when there is nothing to show; a search that excluded everything names the term instead and offers to clear it, because the Bites are still there and the next action is to change the search, not to create. See issue \#1331.
- Nearby Bites can be loaded through backend-assisted location loading.
- `loadBitesByLocation` loads a fixed 15 km radius around the reported position. This radius is the free tier. Loading a position other than the current one, or a radius beyond 15 km, becomes a Pro capability through [[epic-1122]]. See [[Monetization]].
- When live Bite updates add markers, the map should preserve the user's current pan and zoom after the initial marker fit.
- Every step of a feed load is bounded in time, and the loading state always resolves into either bites or a named failure. The position read gives up after fifteen seconds and the `loadBitesByLocation` call after twenty, because both sit in front of the Home skeleton: iOS hands the position request to CoreLocation without a timeout of its own, so a device that produced no fix — the state a phone can sit in right after regaining connectivity — kept the feed hidden until the app was force-quit, the case in GitHub issue #1230.
- A position read that lands under the movement threshold ends the initial load itself, because it deliberately skips the refetch and no later event would clear the loading state.
- The skeleton stands in only for a feed that is not there yet. Once bites are on screen, a resynchronization reports itself through the header progress bar and leaves them readable and navigable.
- A feed synchronization that fails or runs out of time raises its own error, separate from the location error, and offers a retry. The two are kept apart so a stalled feed is never reported as a location problem, and a location error never outlives the read that produced it.
- Regaining connectivity while the app is in the foreground resynchronizes the feed once. Nothing else covers that transition: the app-state hooks only run on a background round trip, so a user who saved a Bite offline and switched the radio back on stayed on what the offline session had produced.

## MVP Classification

**[MVP]** — the home feed and its map view, search and filter, the distinct empty-feed and
empty-search states, nearby loading at the fixed 15 km radius, the bounded load with its
separated location and synchronization errors, and the resynchronization on regaining
connectivity. All of it ships today.

**[Secondary]** — loading a position other than the current one, and any radius beyond
15 km. Specified as a Pro capability under [[epic-1122]] and not built. See
[[Monetization]].

## App Store Review Area

Relevant. Nearby loading reads the device position, so the location permission and its
purpose string are exercised here, although the permission itself is requested during
onboarding rather than from this flow — see [[UC - Guide New Users After Registration]].
**Precise Location** under App Functionality is already declared in
[[Implementation - Store Declarations]].

## Supported Evidence

- `home`
- `home/map-view`
- `loadBitesByLocation`
- Bite API loading by location.
- Shared `bt-map` marker update behavior.

## Related Domains

- [[Bite]]
- [[User]]
- [[Restaurant]]

## Related Pages

- [[Personas]] — the audiences this feed serves: Food lover, Traveler, Bite creator
- [[Monetization]]
- [[epic-1122]]
- [[Implementation - Store Declarations]]
- [[UC - Guide New Users After Registration]]
