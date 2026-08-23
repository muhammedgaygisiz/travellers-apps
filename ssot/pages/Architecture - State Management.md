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

`loadPublicProfile$` reads `api.publicProfile$` with `take(1)` after `loadedUser`, so the `app` slice holds a snapshot of the signed-in user's document taken at login and nothing refreshes it for the rest of the session. This is deliberate, and it is a cost decision rather than an oversight.

`ProfileApiService.publicProfile$` is backed by a real Firestore snapshot listener, and a listener bills a document read for its first snapshot **and for every change after it**. The user document is written far more often than it is read: the `biteCount` triggers, the follower-count trigger, `updateLastSeen`, `updateUserMetadata`, and the email-verification sync all touch it. A session-long listener would bill every one of those to deliver updates the store has no consumer for.

**A snapshot listener must be owned by the subscription that wants it.** The native listener registered through `addCollectionSnapshotListener` outlives any RxJS teardown by itself — removing it takes an explicit `removeSnapshotListener` with the callback id — so `publicProfile$` registers it per subscription and removes it in the teardown, including when the subscription ends before the registration promise resolves. A single-snapshot consumer therefore pays for exactly one read. A consumer that wants a live profile only has to stay subscribed.

The consequence is that every server-maintained aggregate on that document is stale in the client the moment a trigger writes it: `biteCount` from `incrementBiteCountOnBiteCreate` and `decrementBiteCountOnBiteDelete`, and the follower counters. The server value itself is not late — the trigger commits within seconds — which is why only an app restart used to repair the count.

Aggregates the user moves themselves are therefore corrected optimistically in the reducer, because the delta is exact and the next login reconciles it: followers on `followedUser`/`unfollowedUser`, and `biteCount` on `createdBite`/`deletedBite`. A profile with no aggregate at all is left alone so the view keeps counting what it loaded. See [issue \#1310](https://github.com/muhammedgaygisiz/travellers-apps/issues/1310).

Anything reading such an aggregate should treat it as a lower bound rather than as truth when it has a fully loaded list to compare against. Drift from a source that is not the user's own action — the weekly `resyncBiteCounts` job, a write from another device — is only reconciled at the next login, which is the accepted trade for not holding the listener.

## A Reducer That Changes Nothing Must Return The Same State

An NgRx entity adapter does not compare values. `updateManyMutably` treats every id it is handed as a mutation — `didMutateEntities` is `updates.length > 0` — and `takeNewKey` writes a freshly built `Object.assign({}, original, changes)` for each one. So `upsertMany` called with data the store already holds still produces a new state object, a new entities object, and new entity objects inside it.

That is invisible until a selector chain hangs off the slice. `bitesWithMetadata` joins the likes onto every Bite and returns rebuilt Bites, so a new `likes` array gives every Bite in the feed a new identity, and every card bound to one re-renders. Loading the same likes twice therefore re-rendered the entire feed.

The cost was not theoretical. Opening a Bite runs `seedUserLikes`, which re-loads likes the store usually already had, and on-device profiling of the feed that followed put **87% of all busy JS main-thread time** inside that single dispatch, with **470 minor garbage collections inside one 1971 ms animation frame** — roughly three seconds during which the app did not respond to touch. See [issue \#1357](https://github.com/muhammedgaygisiz/travellers-apps/issues/1357).

**A reducer handling a load-style action must return `state` itself when the payload changes nothing.** The likes reducer compares each incoming like against the entity already stored and only calls `upsertMany` when at least one differs.

This contract is invisible to value-based tests: every assertion about _what_ the state contains passes either way. It has to be tested on the reference, with `toBe`, or the next `upsertMany` added somewhere else reintroduces the freeze silently.

## Derived Read Models Belong On The Server

The likes slice exists because the client used to answer "which of these Bites did I like" for itself. It received a feed, then fanned out a read per Bite to find its own reactions, then assembled the answer in a selector.

Every version of that on the client was wrong in a different way. A read per Bite cost one Firestore read and one Capacitor bridge round trip per Bite — 1288 bridge calls on a single cold start. Replacing it with one collection-group query cut the bridge calls to 12 but billed the user's **entire like history** on every feed load, 2141 documents where 500 were wanted, growing forever. Both also arrived after the feed had painted, so for seconds the user saw their own liked Bites rendered as unliked.

The backend had the list already. `loadBitesByLocation` knows who is asking and which Bites it is about to return, so it attaches the caller's like to each one and the client seeds its state from that payload. No read, no round trip, and the feed cannot render a stale answer because the answer travels with it.

**When the client fans out reads to answer a question about a list it has just been given, the question belongs to whoever produced the list.** The client should be seeding state from a payload, not assembling a read model.

The trade is that the producer pays a read per item it returns, so this only holds where the result set is bounded. `loadBitesByLocation` returns every Bite within its radius, which is 440 for a single position, and that is the open problem in [issue \#1294](https://github.com/muhammedgaygisiz/travellers-apps/issues/1294).

**The likes slice is legacy.** It survives for the feeds that do not carry likes — latest Bites, restaurant Bites, weekly Bites — and to hold optimistic writes while a like is being saved. Work that would extend it should move the logic to the backend instead, following the pattern above, rather than adding another client-side read model.

## Code Anchors

```text
libs/bite-tribe/store/src/lib/provide-bite-tribe-store.ts
libs/bite-tribe/store/src/lib/bites
libs/bite-tribe/store/src/lib/bucketlists
libs/bite-tribe/store/src/lib/likes
libs/bite-tribe/store/src/lib/filtering-and-sorting
libs/bite-tribe/store/src/lib/router
libs/bite-tribe/store/src/lib/app
apps/bite-tribe-firebase/functions/src/functions/bites/load-bites-by-location.ts
```

## Current Limitations

- Some newer feature data uses Angular resources directly, while older/shared flows use NgRx.
- Store and resource boundaries should remain explicit so features do not duplicate remote state ownership.
- `bites/effects.ts`, `bites/reducer.ts`, `reviews/effects.ts`, `app/effects.ts`, `app/utils/is-profile-page.ts`, and `bucketlists/utils/should-load-bucketlists.ts` still decide on `url.includes(...)`. Each one can be fooled by an id or a name that contains the word it looks for, in the way described under Route-Driven Effects; the restaurant and menu effects have been moved to route parameters, the rest have not.
- The likes slice is legacy, as described under Derived Read Models Belong On The Server. It is still the source for feeds that do not carry likes and for optimistic like writes, but new work should move the read model to the backend rather than extend it.
- `bitesWithMetadata` rebuilds every Bite it returns, so any slice it depends on — bites, latest bites, likes, GPS position — re-renders the whole feed when its identity changes. Reducers feeding it are bound by the contract under A Reducer That Changes Nothing Must Return The Same State.
- Shared selectors must not assume both apps fill the same slices. The bites slice is only populated in the consumer app, so `restaurantToCreate` resolves Bite evidence from the store first and falls back to the Bites carried on the selection itself, which is how the business app passes restaurant-candidate evidence. See [[issue-1117]].

## Related Pages

- [[Implementation - Performance Guidelines]]
