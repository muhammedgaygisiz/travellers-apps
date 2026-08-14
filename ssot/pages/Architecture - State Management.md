# Architecture - State Management

## Purpose

State management coordinates app-wide data, derived state, routing params, filters, sorting, and side effects.

## Main Pattern

```text
Actions
|
Effects
|
API or data-access calls
|
Reducers
|
Selectors
|
Signals or containers
```

## Store Responsibilities

- Auth-linked app state.
- Bites.
- Bucket lists.
- Likes.
- Menus.
- Reviews.
- Filtering and sorting.
- Router params.
- Derived selectors for feature views.

## Route-Driven Effects

An effect that reacts to `routerNavigatedAction` decides which route it is on from the parsed route parameters in `libs/bite-tribe/store/src/lib/router/selectors.ts`, never by searching the URL text.

A substring test cannot tell a route segment from a value that happens to contain it. `loadRestaurantById$` skipped every URL containing "menu", so a Restaurant whose document id or place name carried that word was never loaded on its own page: the page fell back to Bite-derived data, and its menu button then went to the dynamic `menu/default` route instead of that Restaurant's menu. Reading the parameters cannot be fooled by a value, and it hands the loader a defined id.

The same substring style is still used elsewhere in the store, listed under Current Limitations.

## The Signed-In User's Profile Document Is Not Live

`loadPublicProfile$` reads `api.publicProfile$` with `take(1)` after `loadedUser`, so the `app` slice holds a snapshot of the signed-in user's document taken at login and nothing refreshes it for the rest of the session. `ProfileApiService.startListener` does register a real Firestore snapshot listener, but its later emissions have no subscriber and are discarded.

Every server-maintained aggregate on that document is therefore stale in the client as soon as a trigger writes it: `biteCount` from `incrementBiteCountOnBiteCreate` and `decrementBiteCountOnBiteDelete`, and the follower counters. The server value itself is not late — the trigger commits within seconds — which is why only an app restart used to repair the count.

Aggregates the user moves themselves are corrected optimistically in the reducer, because the delta is exact and the next login reconciles it: followers on `followedUser`/`unfollowedUser`, and `biteCount` on `createdBite`/`deletedBite`. A profile with no aggregate at all is left alone so the view keeps counting what it loaded. See [issue \#1310](https://github.com/muhammedgaygisiz/travellers-apps/issues/1310).

Anything reading such an aggregate should treat it as a lower bound rather than as truth when it has a fully loaded list to compare against.

## Code Anchors

```text
libs/bite-tribe/store/src/lib/provide-bite-tribe-store.ts
libs/bite-tribe/store/src/lib/bites
libs/bite-tribe/store/src/lib/bucketlists
libs/bite-tribe/store/src/lib/filtering-and-sorting
libs/bite-tribe/store/src/lib/router
libs/bite-tribe/store/src/lib/app
```

## Current Limitations

- Some newer feature data uses Angular resources directly, while older/shared flows use NgRx.
- Store and resource boundaries should remain explicit so features do not duplicate remote state ownership.
- `bites/effects.ts`, `bites/reducer.ts`, `reviews/effects.ts`, `app/effects.ts`, `app/utils/is-profile-page.ts`, and `bucketlists/utils/should-load-bucketlists.ts` still decide on `url.includes(...)`. Each one can be fooled by an id or a name that contains the word it looks for, in the way described under Route-Driven Effects; the restaurant and menu effects have been moved to route parameters, the rest have not.
- Shared selectors must not assume both apps fill the same slices. The bites slice is only populated in the consumer app, so `restaurantToCreate` resolves Bite evidence from the store first and falls back to the Bites carried on the selection itself, which is how the business app passes restaurant-candidate evidence. See [[issue-1117]].
